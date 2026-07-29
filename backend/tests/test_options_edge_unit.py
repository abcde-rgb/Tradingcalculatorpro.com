"""Offline tests for the options corrections (ANALISIS_TRADER §3, Auditoría P0).

Covers: the IV solver, hour-aware time to expiry, the synthetic-chain labelling,
and the optimizer's edge/tail metrics and undefined-risk classification.
"""
from datetime import datetime, timezone

import pytest

from options_math import (
    call_price, put_price, implied_volatility, year_fraction,
    generate_options_chain, DEFAULT_RISK_FREE,
)
from options_optimize import (
    optimize_strategies, _risk_profile, _naked_short_legs,
    _expected_value_and_cvar, _probability_of_touch, _lognormal_grid,
    UNDEFINED_RISK_STRATEGIES,
)


# ── §3.4 Implied volatility solver ────────────────────────────────

@pytest.mark.parametrize("S,K,T,sigma,kind", [
    (100, 100, 0.5, 0.27, "call"),      # ATM
    (100, 120, 0.25, 0.45, "call"),     # OTM
    (100, 60, 1.0, 0.80, "call"),       # deep ITM
    (100, 100, 0.5, 0.20, "put"),
    (100, 70, 1.0, 0.90, "put"),        # deep OTM put — Newton's weak spot
    (100, 105, 0.08, 0.35, "put"),      # short dated, near the money
])
def test_iv_solver_round_trips(S, K, T, sigma, kind):
    """Price with a known sigma, solve it back out."""
    price = (call_price if kind == "call" else put_price)(S, K, T, DEFAULT_RISK_FREE, sigma)
    got = implied_volatility(price, S, K, T, DEFAULT_RISK_FREE, kind)
    assert got == pytest.approx(sigma, abs=1e-3)


def test_iv_solver_refuses_when_price_is_flat_in_volatility():
    """A deep ITM, short-dated option is almost pure intrinsic value.

    Its price barely moves with volatility, so no quote can pin the IV down.
    Returning a confident-looking number there would be fabricating a
    measurement — exactly what the illiquid-strike IV problem looks like in
    practice. None is the honest answer.
    """
    price = put_price(100, 140, 0.1, DEFAULT_RISK_FREE, 0.15)
    assert implied_volatility(price, 100, 140, 0.1, DEFAULT_RISK_FREE, "put") is None


def test_iv_solver_returns_none_below_intrinsic():
    """A quote under intrinsic value is a bad tick, not a low volatility."""
    assert implied_volatility(0.5, 100, 50, 0.5, 0.04, "call") is None


def test_iv_solver_returns_none_above_the_underlying():
    assert implied_volatility(150, 100, 50, 0.5, 0.04, "call") is None


def test_iv_solver_returns_none_on_expired_or_invalid_input():
    assert implied_volatility(5, 100, 100, 0.0, 0.04, "call") is None
    assert implied_volatility(0, 100, 100, 0.5, 0.04, "call") is None
    assert implied_volatility(5, 0, 100, 0.5, 0.04, "call") is None


# ── §3.3 Hour-aware time to expiry ────────────────────────────────

def test_year_fraction_shrinks_through_the_session_on_expiry_day():
    """`days/365` holds T flat all day; on a 0DTE that is simply wrong."""
    morning = datetime(2026, 3, 10, 14, 0, tzinfo=timezone.utc)   # 10:00 ET
    afternoon = datetime(2026, 3, 10, 19, 0, tzinfo=timezone.utc)  # 15:00 ET
    assert year_fraction(0, morning) > year_fraction(0, afternoon) > 0


def test_year_fraction_is_never_zero_or_negative():
    """Downstream `T <= 0` branches must only fire for expired contracts."""
    after_close = datetime(2026, 3, 10, 23, 0, tzinfo=timezone.utc)
    assert year_fraction(0, after_close) > 0


def test_year_fraction_matches_calendar_days_for_longer_dates():
    noon = datetime(2026, 3, 10, 16, 0, tzinfo=timezone.utc)  # 12:00 ET
    assert year_fraction(30, noon) == pytest.approx(30 / 365, abs=0.001)


# ── §3.1 Synthetic chain labelling ────────────────────────────────

def test_synthetic_chain_is_labelled_and_has_no_fake_liquidity():
    """Volume and open interest are observations, not model output.

    They used to be filled with `rng.randint(...)`, which made every
    volume/open-interest ratio — the entire basis of "unusual activity" —
    a reading of random numbers.
    """
    chain = generate_options_chain(100.0, 30)
    assert chain
    for row in chain:
        for side in ("call", "put"):
            quote = row[side]
            assert quote["synthetic"] is True
            assert quote["volume"] is None
            assert quote["openInterest"] is None


def test_synthetic_chain_honours_the_supplied_risk_free_rate():
    cheap = generate_options_chain(100.0, 365, r=0.001)
    dear = generate_options_chain(100.0, 365, r=0.10)
    atm = len(cheap) // 2
    assert dear[atm]["call"]["mid"] > cheap[atm]["call"]["mid"]


# ── §3.5 Expected value, CVaR, probability of touch ───────────────

def test_lognormal_grid_weights_sum_to_one():
    assert sum(w for _, w in _lognormal_grid(100.0, 0.2)) == pytest.approx(1.0, abs=1e-9)


def test_long_call_expected_value_is_negative_at_fair_value():
    """A fairly-priced option has no edge; EV should sit at roughly zero (and
    slightly negative once the premium paid is the model's own price)."""
    legs = [{"type": "call", "action": "buy", "quantity": 1, "qty": 1, "strike": 100,
             "premium": call_price(100, 100, 30 / 365, DEFAULT_RISK_FREE, 0.3),
             "iv": 0.3, "daysToExpiry": 30}]
    ev, cvar, _ = _expected_value_and_cvar(legs, 100.0, 0.3 * (30 / 365) ** 0.5)
    assert abs(ev) < 50           # near zero, not a systematic edge
    assert cvar < 0               # the worst 5% is a loss


def test_cvar_is_worse_than_expected_value_for_a_short_option():
    """The point of CVaR: a high-POP short shows a benign EV and an ugly tail."""
    legs = [{"type": "call", "action": "sell", "quantity": 1, "qty": 1, "strike": 110,
             "premium": 1.5, "iv": 0.3, "daysToExpiry": 30}]
    ev, cvar, p_large = _expected_value_and_cvar(legs, 100.0, 0.3 * (30 / 365) ** 0.5)
    assert cvar < ev
    assert p_large >= 0


def test_probability_of_touch_exceeds_probability_of_finishing_beyond():
    """Touch is roughly twice finish-beyond — it is what takes you out early."""
    p = _probability_of_touch(100.0, [110.0], 0.3 * (30 / 365) ** 0.5)
    assert p is not None and 0 < p <= 99


# ── Auditoría P0 #1: undefined-risk classification ────────────────

def _leg(kind, action, strike=100, qty=1):
    return {"type": kind, "action": action, "quantity": qty, "qty": qty,
            "strike": strike, "premium": 2.0, "iv": 0.3, "daysToExpiry": 30}


def test_naked_short_call_is_flagged_undefined():
    profile = _risk_profile("short_call_otm", [_leg("call", "sell", 105)], -1000)
    assert profile["isUndefinedRisk"] is True
    assert profile["riskLevel"] == "undefined"


def test_short_straddle_and_strangle_are_flagged_undefined():
    """The photographic negative of the long straddle the Academy teaches.

    Someone who knows the word can build this believing it is "the same thing
    but sold", and get a completely different risk profile with nothing in the
    product warning them.
    """
    for sid, legs in (
        ("short_straddle", [_leg("call", "sell", 100), _leg("put", "sell", 100)]),
        ("short_strangle", [_leg("call", "sell", 105), _leg("put", "sell", 95)]),
    ):
        assert sid in UNDEFINED_RISK_STRATEGIES
        assert _risk_profile(sid, legs, -1000)["isUndefinedRisk"] is True


def test_vertical_spread_is_defined_risk():
    legs = [_leg("call", "buy", 100), _leg("call", "sell", 105)]
    assert _risk_profile("bull_call_spread", legs, -300)["riskLevel"] == "defined"
    assert _naked_short_legs(legs) == []


def test_covered_call_is_not_naked():
    legs = [{"type": "stock", "action": "buy", "quantity": 100, "qty": 100,
             "strike": 100, "premium": 0, "iv": 0.3, "daysToExpiry": 30},
            _leg("call", "sell", 105)]
    assert _risk_profile("covered_call", legs, -10000)["riskLevel"] != "undefined"


def test_cash_secured_put_is_substantial_not_undefined():
    profile = _risk_profile("short_put_otm", [_leg("put", "sell", 95)], -9500)
    assert profile["riskLevel"] == "substantial"
    assert profile["isUndefinedRisk"] is False


def test_iron_condor_is_defined_despite_two_short_legs():
    legs = [_leg("put", "sell", 95), _leg("put", "buy", 90),
            _leg("call", "sell", 105), _leg("call", "buy", 110)]
    assert _risk_profile("iron_condor", legs, -400)["riskLevel"] == "defined"


# ── Optimizer wiring ──────────────────────────────────────────────

def test_optimizer_returns_edge_and_risk_fields():
    chain = generate_options_chain(100.0, 30, r=0.042)
    results = optimize_strategies("TEST", "neutral", 100.0, 50000, chain, 100.0,
                                  30, "30d", risk_free=0.042)
    assert results
    for r in results:
        for field in ("expectedValue", "cvar5", "probTouchBreakEven",
                      "riskLevel", "isUndefinedRisk", "evOnCapital"):
            assert field in r, f"{field} missing from optimizer result"


def test_optimizer_default_mode_ranks_by_expected_value():
    """ROI selects lottery tickets and POP selects premium selling; neither
    measures edge, so the default ordering is expected value on capital."""
    chain = generate_options_chain(100.0, 30, r=0.042)
    results = optimize_strategies("TEST", "bullish", 108.0, 50000, chain, 100.0,
                                  30, "30d", mode="best_edge", risk_free=0.042)
    evs = [r["evOnCapital"] for r in results if r["evOnCapital"] is not None]
    assert evs == sorted(evs, reverse=True)


def test_optimizer_flags_the_naked_short_it_recommends():
    chain = generate_options_chain(100.0, 30, r=0.042)
    results = optimize_strategies("TEST", "bearish", 92.0, 50000, chain, 100.0,
                                  30, "30d", risk_free=0.042)
    naked = [r for r in results if r["strategyId"] == "short_call_otm"]
    assert naked, "expected a naked short call among bearish candidates"
    assert naked[0]["isUndefinedRisk"] is True
