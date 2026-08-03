"""
Offline tests for the multi-provider market data layer (market_data.py).

Everything here runs without network: providers are swapped for fakes. What we
assert is the behaviour that protects the product:

  * failover order (a dead primary must not take the site down)
  * the circuit breaker (a dead provider costs one timeout per cooldown)
  * stale marking (never present an old price as if it were live)
  * never inventing a price when everything fails
"""
import time

import pytest

import market_data as md


@pytest.fixture(autouse=True)
def _clean():
    md.reset_state()
    original = list(md.PROVIDERS)
    yield
    md.PROVIDERS[:] = original
    md.reset_state()


def _provider(name, fn, enabled=True):
    return md.Provider(name, fn, (lambda: enabled))


def _ok(source, price=100.0, prev=99.0):
    def fetch(symbol):
        return md._norm(symbol, symbol, price, prev, source=source)
    return fetch


def _boom(exc=RuntimeError("provider down")):
    def fetch(symbol):
        raise exc
    return fetch


# ── Normalisation contract ───────────────────────────────────────────
def test_norm_computes_change_and_percent():
    q = md._norm("AAPL", "Apple", 110.0, 100.0, source="test")
    assert q["price"] == 110.0
    assert q["change"] == 10.0
    assert q["change_percent"] == 10.0
    assert q["stale"] is False


def test_norm_rejects_zero_and_negative_prices():
    # Finnhub answers 200 with c=0 for unknown symbols — that is not a price.
    assert md._norm("X", "X", 0, 0, source="t") is None
    assert md._norm("X", "X", -5, 1, source="t") is None
    assert md._norm("X", "X", None, 1, source="t") is None
    assert md._norm("X", "X", "not-a-number", 1, source="t") is None


def test_norm_falls_back_to_price_when_prev_close_missing():
    q = md._norm("X", "X", 50.0, None, source="t")
    assert q["previous_close"] == 50.0
    assert q["change"] == 0.0


# ── Failover ─────────────────────────────────────────────────────────
def test_primary_is_used_when_healthy():
    md.PROVIDERS[:] = [_provider("primary", _ok("primary")), _provider("backup", _ok("backup"))]
    assert md.get_quote("AAPL")["source"] == "primary"


def test_falls_through_to_the_backup_when_primary_raises():
    md.PROVIDERS[:] = [_provider("primary", _boom()), _provider("backup", _ok("backup"))]
    q = md.get_quote("AAPL")
    assert q["source"] == "backup"
    assert q["price"] == 100.0


def test_falls_through_when_primary_returns_an_unusable_price():
    """A 200 response with price 0 must be treated as a failure, not a quote."""
    md.PROVIDERS[:] = [
        _provider("primary", lambda s: None),
        _provider("backup", _ok("backup")),
    ]
    assert md.get_quote("AAPL")["source"] == "backup"


def test_unconfigured_providers_are_skipped():
    md.PROVIDERS[:] = [
        _provider("nokey", _ok("nokey"), enabled=False),
        _provider("backup", _ok("backup")),
    ]
    assert md.get_quote("AAPL")["source"] == "backup"


# ── Cache ────────────────────────────────────────────────────────────
def test_cache_hit_does_not_call_the_provider_again():
    calls = {"n": 0}

    def counting(symbol):
        calls["n"] += 1
        return md._norm(symbol, symbol, 100.0, 99.0, source="p")

    md.PROVIDERS[:] = [_provider("p", counting)]
    md.get_quote("AAPL")
    md.get_quote("AAPL")
    assert calls["n"] == 1


def test_ttl_zero_always_refetches():
    calls = {"n": 0}

    def counting(symbol):
        calls["n"] += 1
        return md._norm(symbol, symbol, 100.0, 99.0, source="p")

    md.PROVIDERS[:] = [_provider("p", counting)]
    md.get_quote("AAPL", ttl=0)
    md.get_quote("AAPL", ttl=0)
    assert calls["n"] == 2


# ── Stale serving ────────────────────────────────────────────────────
def test_stale_value_is_served_and_flagged_when_everything_fails():
    state = {"up": True}

    def flaky(symbol):
        if not state["up"]:
            raise RuntimeError("down")
        return md._norm(symbol, symbol, 100.0, 99.0, source="p")

    md.PROVIDERS[:] = [_provider("p", flaky)]
    fresh = md.get_quote("AAPL")
    assert fresh["stale"] is False

    state["up"] = False
    stale = md.get_quote("AAPL", ttl=0)
    assert stale["price"] == 100.0
    assert stale["stale"] is True          # the caller MUST be able to tell
    assert "stale_seconds" in stale
    # Hay error y se dice, pero SIN nombrar al proveedor: esta respuesta viaja
    # al navegador por /quote/{symbol}, que es público. El detalle va al log.
    assert stale["error"]
    assert "down" not in stale["error"]


def test_never_invents_a_price_when_there_is_nothing_cached():
    md.PROVIDERS[:] = [_provider("p", _boom())]
    q = md.get_quote("NOPE")
    assert q["price"] is None
    assert q["stale"] is False
    assert q["error"]                       # falla, y se dice que falla


def test_the_public_error_never_names_the_provider(caplog):
    """`/quote/{symbol}` es público: su campo `error` lo lee cualquiera.

    El nombre del proveedor y el detalle de la excepción se quedan en el log,
    donde sirven para depurar. `provider_status()` sí los da enteros, pero
    cuelga de /admin/market-data-health.
    """
    import logging

    md.PROVIDERS[:] = [_provider("proveedor-secreto", _boom())]
    with caplog.at_level(logging.WARNING):
        q = md.get_quote("NOPE")

    assert "proveedor-secreto" not in q["error"]
    assert "provider down" not in q["error"]
    assert "RuntimeError" not in q["error"]
    # Pero sigue siendo depurable.
    assert "proveedor-secreto" in caplog.text


def test_empty_symbol_is_rejected_without_calling_providers():
    calls = {"n": 0}

    def counting(symbol):
        calls["n"] += 1
        return None

    md.PROVIDERS[:] = [_provider("p", counting)]
    assert md.get_quote("  ")["price"] is None
    assert calls["n"] == 0


# ── Circuit breaker ──────────────────────────────────────────────────
def test_breaker_opens_after_the_threshold_and_stops_calling():
    calls = {"n": 0}

    def failing(symbol):
        calls["n"] += 1
        raise RuntimeError("down")

    md.PROVIDERS[:] = [_provider("dead", failing), _provider("backup", _ok("backup"))]
    for _ in range(md.BREAKER_THRESHOLD):
        md.get_quote("AAPL", ttl=0)
    calls_when_tripped = calls["n"]

    # Further requests must be served by the backup without touching the dead one.
    md.get_quote("AAPL", ttl=0)
    md.get_quote("AAPL", ttl=0)
    assert calls["n"] == calls_when_tripped


def test_breaker_half_opens_after_the_cooldown():
    b = md._Breaker(threshold=2, cooldown=60)
    b.record_failure(now=1000.0)
    b.record_failure(now=1000.0)
    assert b.is_open(now=1000.0) is True
    assert b.is_open(now=1030.0) is True     # still cooling down
    assert b.is_open(now=1061.0) is False    # cooldown elapsed → retry allowed


def test_breaker_resets_on_success():
    b = md._Breaker(threshold=3)
    b.record_failure()
    b.record_failure()
    b.record_success()
    assert b.fails == 0
    assert b.is_open() is False


# ── Observability ────────────────────────────────────────────────────
def test_provider_status_reports_counters():
    md.PROVIDERS[:] = [_provider("primary", _boom()), _provider("backup", _ok("backup"))]
    md.get_quote("AAPL")
    status = {p["name"]: p for p in md.provider_status()}
    assert status["primary"]["failures"] == 1
    assert status["backup"]["served"] == 1


def test_api_keys_are_read_from_the_environment_not_the_database():
    """Regression guard for audit finding C-08: keys must never come from the DB."""
    import pathlib
    src = pathlib.Path(md.__file__).read_text(encoding="utf-8")
    assert "get_setting" not in src
    assert "app_settings" not in src
    assert "os.environ.get" in src


# ── Daily budget (M-03) ──────────────────────────────────────────────
def test_quota_usage_is_counted_per_day():
    p = md.Provider("t", lambda s: None, lambda: True, daily_quota=100)
    for _ in range(3):
        p.note_call("2026-07-26")
    assert p.usage("2026-07-26")["used_today"] == 3


def test_counter_resets_on_a_new_day():
    """A free tier resets at midnight UTC; the counter must too, or the panel
    would show a permanent false alarm."""
    p = md.Provider("t", lambda s: None, lambda: True, daily_quota=100)
    p.note_call("2026-07-26")
    p.note_call("2026-07-26")
    assert p.usage("2026-07-26")["used_today"] == 2
    p.note_call("2026-07-27")
    assert p.usage("2026-07-27")["used_today"] == 1


def test_near_limit_trips_at_80_percent():
    p = md.Provider("t", lambda s: None, lambda: True, daily_quota=10)
    for _ in range(7):
        p.note_call("2026-07-26")
    assert p.usage("2026-07-26")["near_limit"] is False   # 70%
    p.note_call("2026-07-26")
    assert p.usage("2026-07-26")["near_limit"] is True    # 80%


def test_provider_without_a_documented_quota_never_alarms():
    """Yahoo is scraped, not licensed: there is no published cap to compare to."""
    p = md.Provider("yahoo", lambda s: None, lambda: True, daily_quota=0)
    for _ in range(10_000):
        p.note_call("2026-07-26")
    u = p.usage("2026-07-26")
    assert u["daily_quota"] is None
    assert u["pct_used"] is None
    assert u["near_limit"] is False


def test_get_quote_counts_against_the_budget():
    md.PROVIDERS[:] = [_provider("p", _ok("p"))]
    md.PROVIDERS[0].daily_quota = 50
    md.get_quote("AAPL", ttl=0)
    md.get_quote("MSFT", ttl=0)
    assert sum(p["used_today"] for p in md.provider_status() if p["name"] == "p") == 2


def test_provider_status_exposes_the_budget_fields():
    md.PROVIDERS[:] = [_provider("p", _ok("p"))]
    row = md.provider_status()[0]
    for key in ("used_today", "daily_quota", "pct_used", "near_limit"):
        assert key in row
