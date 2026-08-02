"""Regressions for the reconciliation pass of 2026-07-30.

Two implementations of the same audit landed independently — one merged in
PR #153, one on a parallel branch — and this file pins the places where the
losing implementation was actually better, so the fix can't be undone by a
future merge that "restores" the simpler version.

  · `_periods_per_year` had no ceiling, so a dense sample over a short span
    drove the annualization scale factor into absurd territory.
  · `suggested_stop_r` was guarded only inside `generate_insights`, while the
    analytics panel reads the field directly — so the UI could recommend a stop
    width off two winning trades.
  · There was no `capture_ratio`: MAE answered "is my stop too wide" and
    nothing answered the mirror question about the target.
  · `market_rates` had no negative cache, so an unreachable provider was
    re-contacted on every single call, inside request paths the user waits on.

Pure: no network, no DB.
"""
from datetime import datetime, timedelta, timezone

import pytest

import market_rates
from performance import (
    MAX_TRADES_PER_YEAR,
    MIN_WINNERS_FOR_STOP_ADVICE,
    _periods_per_year,
    compute_analytics,
    generate_insights,
)

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _trade(close_offset_hours, pnl, *, mae=None, mfe=None, r=None, balance=10000.0):
    """Closed trade whose exit sits `close_offset_hours` after BASE."""
    exit_dt = BASE + timedelta(hours=close_offset_hours)
    return {
        "status": "closed",
        "symbol": "TEST",
        "entry_price": 100.0,
        "exit_price": 101.0,
        "quantity": 1.0,
        "sl": 95.0,
        "account_balance": balance,
        "pnl": pnl,
        "r_multiple": r if r is not None else round(pnl / 100.0, 2),
        "mae_r": mae,
        "mfe_r": mfe,
        "entry_date": exit_dt.isoformat(),
        "exit_date": exit_dt.isoformat(),
    }


# ─── Ceiling on the annualization factor ──────────────────────────


def test_periods_per_year_is_capped():
    """400 trades inside 10 days must not annualize to five figures.

    Uncapped this is 400 / (10/365.25) ≈ 14 610 trades a year, and √14 610 ≈ 121
    multiplies a per-trade Sharpe of 0.05 into a reported 6.0.
    """
    trades = [_trade(i * 0.6, 10) for i in range(400)]   # 400 trades over 10 days
    ppy = _periods_per_year(trades)
    assert ppy == MAX_TRADES_PER_YEAR
    assert ppy < 3000, "the cap has to bite before the scale factor gets silly"


def test_periods_per_year_left_alone_for_a_normal_journal():
    """A realistic pace stays untouched by the cap."""
    trades = [_trade(i * 24 * 3, 10) for i in range(40)]   # ~1 trade every 3 days
    ppy = _periods_per_year(trades)
    assert ppy is not None
    assert 100 < ppy < 150       # ≈ 122/year
    assert ppy < MAX_TRADES_PER_YEAR


def test_sharpe_stays_bounded_on_a_dense_sample():
    """End-to-end: the capped factor keeps the reported Sharpe plausible."""
    trades = [_trade(i * 0.6, 50 if i % 2 else -20) for i in range(400)]
    a = compute_analytics(trades)
    assert a["annualized"] is True
    assert a["trades_per_year"] == MAX_TRADES_PER_YEAR
    assert abs(a["sharpe_ratio"]) < 60, "a bounded factor still bounds the ratio"


# ─── The stop suggestion needs a sample AT THE SOURCE ─────────────


def test_stop_suggestion_withheld_on_a_thin_sample():
    """Two winners must not produce a position-sizing recommendation.

    `generate_insights` already refused to talk about this below 10 winners, but
    `AnalyticsDashboard` renders `excursion.suggested_stop_r` straight from the
    payload, so the guard had to move into the payload itself.
    """
    trades = [_trade(i * 24, 200, r=2.0, mae=0.2, mfe=2.5) for i in range(2)]
    exc = compute_analytics(trades)["excursion"]
    assert exc["winners_sample"] == 2
    assert exc["suggested_stop_r"] is None
    # And the insight stays quiet too, since it now trusts the field.
    keys = {i["key"] for i in generate_insights(compute_analytics(trades))}
    assert "insightStopTooWide" not in keys


def test_stop_suggestion_appears_once_the_sample_is_there():
    n = MIN_WINNERS_FOR_STOP_ADVICE
    trades = [_trade(i * 24, 200, r=2.0, mae=0.2, mfe=2.5) for i in range(n)]
    a = compute_analytics(trades)
    exc = a["excursion"]
    assert exc["winners_sample"] == n
    assert exc["suggested_stop_r"] == pytest.approx(0.24, abs=0.01)   # p80 0.2 × 1.2
    assert "insightStopTooWide" in {i["key"] for i in generate_insights(a)}


# ─── Capture ratio: the target's half of the question ─────────────


def test_capture_ratio_measures_how_much_of_the_move_you_keep():
    """2.0R taken out of 2.5R available is a 0.8 capture."""
    trades = [_trade(i * 24, 200, r=2.0, mae=0.3, mfe=2.5) for i in range(25)]
    exc = compute_analytics(trades)["excursion"]
    assert exc["capture_ratio"] == pytest.approx(0.8)
    assert exc["capture_sample"] == 25


def test_low_capture_raises_an_insight():
    """Keeping under 40% of the available move is worth saying out loud."""
    trades = [_trade(i * 24, 100, r=1.0, mae=0.3, mfe=5.0) for i in range(25)]
    a = compute_analytics(trades)
    assert a["excursion"]["capture_ratio"] == pytest.approx(0.2)
    assert "insightLowCapture" in {i["key"] for i in generate_insights(a)}


def test_capture_insight_silent_on_a_thin_sample():
    trades = [_trade(i * 24, 100, r=1.0, mae=0.3, mfe=5.0) for i in range(5)]
    a = compute_analytics(trades)
    assert "insightLowCapture" not in {i["key"] for i in generate_insights(a)}


def test_capture_ratio_is_none_without_excursion_data():
    trades = [_trade(i * 24, 100) for i in range(5)]
    exc = compute_analytics(trades)["excursion"]
    assert exc["available"] is False
    assert exc["capture_ratio"] is None


# ─── Risk-free rate: a failed lookup has to be cached too ─────────


@pytest.fixture
def clean_rate_cache(monkeypatch):
    monkeypatch.setattr(market_rates, "_cache",
                        {"rate": None, "fetched_at": None,
                         "source": "fallback", "failed_at": None})
    return market_rates._cache


def test_failed_lookup_is_not_retried_on_every_call(clean_rate_cache, monkeypatch):
    """The provider is contacted once, not once per caller.

    `get_risk_free_rate` runs inside /options/chain, /optimize, /calculate/* and
    /performance/analytics. Without a negative cache every one of those requests
    paid a network round trip while the provider was down.
    """
    attempts = {"n": 0}

    def _down():
        attempts["n"] += 1
        return None

    monkeypatch.setattr(market_rates, "_fetch_live_rate", _down)
    rates = [market_rates.get_risk_free_rate() for _ in range(25)]

    assert attempts["n"] == 1
    assert rates == [market_rates.FALLBACK_RISK_FREE] * 25


def test_stale_value_is_served_without_hammering_the_provider(clean_rate_cache, monkeypatch):
    """A previous reading keeps being served — and still only one attempt."""
    clean_rate_cache.update({
        "rate": 0.0431,
        "fetched_at": datetime.now(timezone.utc) - timedelta(hours=7),  # past the TTL
        "source": "^IRX",
        "failed_at": None,
    })
    attempts = {"n": 0}
    monkeypatch.setattr(market_rates, "_fetch_live_rate",
                        lambda: attempts.__setitem__("n", attempts["n"] + 1))

    got = [market_rates.get_risk_free_rate() for _ in range(25)]

    assert attempts["n"] == 1
    assert got == [0.0431] * 25
    assert "stale" in market_rates._cache["source"]


def test_force_refresh_still_bypasses_the_backoff(clean_rate_cache, monkeypatch):
    """An explicit refresh is a deliberate act and must not be swallowed."""
    attempts = {"n": 0}

    def _down():
        attempts["n"] += 1
        return None

    monkeypatch.setattr(market_rates, "_fetch_live_rate", _down)
    market_rates.get_risk_free_rate()               # 1st attempt, now backing off
    market_rates.get_risk_free_rate()               # served from the negative cache
    market_rates.get_risk_free_rate(force_refresh=True)
    assert attempts["n"] == 2


def test_recovery_clears_the_backoff(clean_rate_cache, monkeypatch):
    """Once the provider answers, the failure marker goes away."""
    monkeypatch.setattr(market_rates, "_fetch_live_rate", lambda: None)
    market_rates.get_risk_free_rate()
    assert market_rates._cache["failed_at"] is not None

    monkeypatch.setattr(market_rates, "_fetch_live_rate", lambda: 0.0417)
    assert market_rates.get_risk_free_rate(force_refresh=True) == 0.0417
    assert market_rates._cache["failed_at"] is None
    assert market_rates._cache["source"] == "^IRX"
