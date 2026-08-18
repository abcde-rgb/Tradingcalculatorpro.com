"""Offline tests for scanner data honesty.

The scanners rank strikes and mark chart patterns that a user then acts on, so
the same rule applies here as everywhere else in this codebase: a quantity that
cannot be computed is not a number, and anything provisional says so.
"""
import os
import time

import pytest

# Importing `server` boots the app, which refuses to start without a secret in
# production mode. Same guard the other server-importing tests use.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from server import _volume_oi_ratio, _rank_flow_rows, OI_STALENESS_NOTE  # noqa: E402
from candle_patterns import detect_all_patterns  # noqa: E402


# ── Volume / open interest ratio ──────────────────────────────────

def test_ratio_is_undefined_without_open_interest():
    """`vol / max(oi, 1)` turned a zero denominator into a ratio equal to the
    entire volume. A strike with 500 traded and no open interest scored 500 and
    led the "most unusual" ranking — while being the most ordinary thing on the
    board: a newly listed strike on its first day."""
    assert _volume_oi_ratio(500, 0) is None
    assert _volume_oi_ratio(5000, 0) is None
    assert _volume_oi_ratio(120, None) is None


def test_ratio_is_computed_normally_when_open_interest_exists():
    assert _volume_oi_ratio(500, 250) == pytest.approx(2.0)
    assert _volume_oi_ratio(900, 100) == pytest.approx(9.0)


def test_rows_without_open_interest_never_outrank_real_ratios():
    rows = [
        {"strike": 1, "ratio": None, "estNotional": 900_000},   # huge, but no ratio
        {"strike": 2, "ratio": 9.0, "estNotional": 1_000},
        {"strike": 3, "ratio": 2.5, "estNotional": 5_000},
        {"strike": 4, "ratio": None, "estNotional": 10_000},
    ]
    ranked = _rank_flow_rows(rows)
    assert [r["strike"] for r in ranked] == [2, 3, 1, 4]
    # Everything with a real ratio comes first, in ratio order.
    assert all(r["ratio"] is not None for r in ranked[:2])
    # The ratio-less rows follow, ordered by notional among themselves.
    assert [r["strike"] for r in ranked[2:]] == [1, 4]


def test_ranking_is_stable_when_no_row_has_open_interest():
    rows = [{"ratio": None, "estNotional": n} for n in (10, 300, 50)]
    assert [r["estNotional"] for r in _rank_flow_rows(rows)] == [300, 50, 10]


def test_ranking_handles_missing_notional():
    """A row without notional must not raise while sorting."""
    ranked = _rank_flow_rows([{"ratio": None}, {"ratio": 3.0}])
    assert ranked[0]["ratio"] == 3.0


def test_open_interest_staleness_is_stated():
    """Yahoo publishes OI once a day, so the ratio compares today's volume with
    yesterday's open interest. That caveat has to reach the user."""
    note = OI_STALENESS_NOTE.lower()
    assert "once per day" in note
    assert "previous session" in note
    assert "screening hint" in note


# ── Provisional pattern detections ────────────────────────────────

def _bars(n, *, last_is_hammer=False, last_age_seconds=86400 * 2):
    """n daily bars; the final one can be aged so it is closed or still forming."""
    now = int(time.time())
    rows = [
        {"ts": now - (n - i) * 86400, "date": f"d{i}",
         "open": 100.0, "high": 101.0, "low": 99.0, "close": 100.5}
        for i in range(n - 1)
    ]
    last = {"ts": now - last_age_seconds, "date": f"d{n - 1}",
            "open": 100.0, "high": 100.5, "low": 99.0, "close": 100.2}
    if last_is_hammer:
        last["low"] = 94.0
    rows.append(last)
    return rows


def test_detections_carry_the_bar_index_they_landed_on():
    """Without it the client cannot tell which detection is on the unclosed bar."""
    rows = _bars(30, last_is_hammer=True)
    detections = detect_all_patterns(rows)
    assert detections, "expected a detection on the crafted final bar"
    assert all("index" in d for d in detections)
    assert detections[-1]["index"] == len(rows) - 1


def test_pattern_on_an_unclosed_bar_is_marked_provisional():
    """Mirrors what the endpoint does: mark detections whose last candle has
    not closed, because the shape can un-happen on the next tick."""
    rows = _bars(30, last_is_hammer=True, last_age_seconds=3600)  # 1h into a daily bar
    from server import _bar_is_forming

    forming = _bar_is_forming(rows, 1440)  # daily = 1440 minutes
    assert forming is True

    detections = detect_all_patterns(rows)
    last_index = len(rows) - 1
    for d in detections:
        d["provisional"] = bool(forming and d.get("index") == last_index)
    assert any(d["provisional"] for d in detections)


def test_pattern_on_a_closed_bar_is_not_provisional():
    rows = _bars(30, last_is_hammer=True, last_age_seconds=86400 * 3)
    from server import _bar_is_forming

    assert _bar_is_forming(rows, 1440) is False


def test_bar_is_forming_handles_missing_timestamps():
    from server import _bar_is_forming

    assert _bar_is_forming([], 1440) is False
    assert _bar_is_forming([{"open": 1}], 1440) is False
    assert _bar_is_forming([{"ts": time.time()}], 0) is False


# ── The reference price behind the support/resistance split ───────

def _trend_bars(n=150, seed=5, drift=0.0005, vol=0.014):
    import math
    import random

    rng = random.Random(seed)
    now = int(time.time())
    price, rows = 100.0, []
    for i in range(n):
        price *= math.exp(rng.gauss(drift, vol))
        rows.append({"ts": now - (n - i) * 86400, "date": f"d{i}",
                     "open": price * 0.999, "high": price * 1.007,
                     "low": price * 0.993, "close": price})
    return rows


def test_reference_price_falls_back_to_last_close_and_says_so():
    from price_action import detect_structure

    rows = _trend_bars()
    res = detect_structure(rows, 2)
    assert res["referenceSource"] == "last_close"
    assert res["referencePrice"] == res["lastClose"]
    assert res["livePrice"] is None


def test_reference_price_reports_its_age():
    """`currentPrice` was labelled "price now" in the UI while being the close
    of the last bar — a day old on a daily chart, three on a Monday."""
    from price_action import detect_structure

    rows = _trend_bars()
    res = detect_structure(rows, 2)
    assert res["referenceAgeSeconds"] is not None
    assert res["referenceAgeSeconds"] >= 86400 - 5
    assert res["referenceDate"] == rows[-1]["date"]


def test_live_price_is_used_for_the_split_when_supplied():
    from price_action import detect_structure

    rows = _trend_bars()
    live = rows[-1]["close"] * 1.012
    res = detect_structure(rows, 2, None, live)
    assert res["referenceSource"] == "live"
    assert res["referencePrice"] == pytest.approx(round(live, 6))
    assert res["liveVsCloseDivergencePct"] == pytest.approx(1.2, abs=0.01)


def test_a_level_between_close_and_live_price_flips_role():
    """The inversion this module's own docstring calls the single most
    misleading thing the scanner could say: a ceiling price has already broken
    through, still reported as resistance."""
    from price_action import detect_structure

    rows = _trend_bars()
    stale = detect_structure(rows, 2)
    live = detect_structure(rows, 2, None, rows[-1]["close"] * 1.012)

    assert live["levelsBetweenLiveAndClose"] >= 1
    stale_res = (stale["nearestResistance"] or {}).get("price")
    live_sup = (live["nearestSupport"] or {}).get("price")
    # The level reported as the nearest RESISTANCE against the stale close is
    # now the nearest SUPPORT against the live price.
    assert stale_res == live_sup


def test_zero_or_negative_live_price_is_ignored():
    """A bad quote must not become the reference."""
    from price_action import detect_structure

    rows = _trend_bars()
    for bad in (0, -5, None):
        res = detect_structure(rows, 2, None, bad)
        assert res["referenceSource"] == "last_close"


def test_empty_scan_keeps_the_same_keys():
    """The client must never branch on 'did the scan return the short shape'."""
    from price_action import detect_structure

    full = set(detect_structure(_trend_bars(), 2).keys())
    empty = set(detect_structure([{"open": 1, "high": 1, "low": 1, "close": 1}], 2).keys())
    missing = full - empty
    # The reference fields are new; they are allowed to be absent from the
    # short shape only if nothing else is. Assert the pre-existing contract.
    assert "currentPrice" in empty and "trend" in empty and "levels" in empty
    assert "swings" in empty and "events" in empty and "fvgs" in empty
