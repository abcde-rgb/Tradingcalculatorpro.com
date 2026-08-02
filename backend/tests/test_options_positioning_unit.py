"""Unit tests for `options_positioning`.

The property that matters most here is not the arithmetic, it is the refusal:
these metrics describe observed positioning, so a modelled chain (open interest
None) must yield None and not a plausible-looking number. Several tests exist
only to pin that down.
"""
import pytest

from options_positioning import (
    MIN_STRIKES_WITH_OI,
    atm_iv,
    chain_liquidity,
    contract_liquidity,
    expected_move,
    gamma_exposure,
    has_real_open_interest,
    max_pain,
    open_interest_profile,
    put_call_ratio,
    term_structure,
    total_open_interest,
)


def _leg(oi=500, gamma=0.02, iv=0.30, bid=1.00, ask=1.04, volume=100):
    return {
        "bid": bid, "ask": ask, "mid": (bid + ask) / 2,
        "iv": iv, "gamma": gamma, "openInterest": oi, "volume": volume,
    }


def real_chain(strikes=(90, 95, 100, 105, 110), call_oi=None, put_oi=None):
    """A chain with observed open interest on every strike."""
    call_oi = call_oi or {k: 500 for k in strikes}
    put_oi = put_oi or {k: 500 for k in strikes}
    return [
        {
            "strike": float(k),
            "call": _leg(oi=call_oi[k]),
            "put": _leg(oi=put_oi[k]),
        }
        for k in strikes
    ]


def modelled_chain(strikes=(90, 95, 100, 105, 110)):
    """What `generate_options_chain` returns: quotes modelled, OI unobserved."""
    return [
        {
            "strike": float(k),
            "call": _leg(oi=None, volume=None),
            "put": _leg(oi=None, volume=None),
        }
        for k in strikes
    ]


# ── The refusal ────────────────────────────────────────────────────────────

def test_modelled_chain_yields_no_max_pain():
    assert max_pain(modelled_chain()) is None


def test_modelled_chain_yields_no_gex():
    assert gamma_exposure(modelled_chain(), spot=100.0) is None


def test_modelled_chain_yields_no_oi_profile():
    assert open_interest_profile(modelled_chain()) is None


def test_modelled_chain_yields_no_put_call_ratio():
    assert put_call_ratio(modelled_chain()) is None


def test_modelled_chain_yields_no_total_open_interest():
    assert total_open_interest(modelled_chain()) is None


def test_too_few_strikes_with_oi_is_not_enough():
    """A couple of strikes with OI is noise, not a positioning profile."""
    chain = modelled_chain()
    for item in chain[: MIN_STRIKES_WITH_OI - 1]:
        item["call"]["openInterest"] = 400
    assert has_real_open_interest(chain) is False
    assert max_pain(chain) is None


def test_enough_strikes_with_oi_unlocks_the_metric():
    chain = modelled_chain()
    for item in chain[:MIN_STRIKES_WITH_OI]:
        item["call"]["openInterest"] = 400
    assert has_real_open_interest(chain) is True
    assert max_pain(chain) is not None


# ── Max pain ───────────────────────────────────────────────────────────────

def test_max_pain_lands_on_the_heaviest_strike():
    """With all OI piled on one strike, that strike is where least is paid out."""
    strikes = (90, 95, 100, 105, 110)
    heavy = {k: (50 if k != 100 else 10_000) for k in strikes}
    result = max_pain(real_chain(strikes, call_oi=heavy, put_oi=heavy))
    assert result["strike"] == 100.0


def test_max_pain_is_symmetric_for_symmetric_open_interest():
    result = max_pain(real_chain())
    assert result["strike"] == 100.0
    assert len(result["curve"]) == 5


def test_max_pain_curve_is_never_negative():
    result = max_pain(real_chain())
    assert all(row["pain"] >= 0 for row in result["curve"])


def test_max_pain_needs_more_than_one_strike():
    single = [{"strike": 100.0, "call": _leg(), "put": _leg()}]
    assert max_pain(single) is None


# ── GEX ────────────────────────────────────────────────────────────────────

def test_gex_sign_follows_the_dealer_convention():
    """Flipping who is assumed long flips the sign — so the convention travels."""
    chain = real_chain(call_oi={k: 1000 for k in (90, 95, 100, 105, 110)},
                       put_oi={k: 0 for k in (90, 95, 100, 105, 110)})
    long_calls = gamma_exposure(chain, spot=100.0, dealer_long_calls=True)
    short_calls = gamma_exposure(chain, spot=100.0, dealer_long_calls=False)
    assert long_calls["total"] > 0
    assert short_calls["total"] < 0
    assert long_calls["convention"] == "dealer_long_calls"
    assert short_calls["convention"] == "dealer_short_calls"


def test_gex_scales_with_the_square_of_spot():
    chain = real_chain()
    at_100 = gamma_exposure(chain, spot=100.0)["total"]
    at_200 = gamma_exposure(chain, spot=200.0)["total"]
    # Same gammas and OI, four times the spot squared.
    assert at_200 == pytest.approx(at_100 * 4, rel=1e-6)


def test_gex_returns_none_without_a_spot():
    assert gamma_exposure(real_chain(), spot=0) is None


def test_gamma_flip_is_none_when_the_profile_never_crosses():
    """All-call open interest never changes sign, so there is no flip strike."""
    strikes = (90, 95, 100, 105, 110)
    chain = real_chain(strikes, call_oi={k: 1000 for k in strikes}, put_oi={k: 0 for k in strikes})
    assert gamma_exposure(chain, spot=100.0)["flipStrike"] is None


# ── Put/call ratio ─────────────────────────────────────────────────────────

def test_put_call_ratio_by_open_interest():
    strikes = (90, 95, 100, 105, 110)
    chain = real_chain(strikes, call_oi={k: 100 for k in strikes}, put_oi={k: 150 for k in strikes})
    assert put_call_ratio(chain)["byOpenInterest"] == pytest.approx(1.5)


def test_put_call_ratio_undefined_without_calls():
    """Zero calls open makes the ratio undefined — not infinite, not zero."""
    strikes = (90, 95, 100, 105, 110)
    chain = real_chain(strikes, call_oi={k: 0 for k in strikes}, put_oi={k: 150 for k in strikes})
    assert put_call_ratio(chain)["byOpenInterest"] is None


# ── OI profile ─────────────────────────────────────────────────────────────

def test_oi_profile_reports_unknown_strike_as_none_not_zero():
    # Wide enough that blanking one strike still leaves the minimum sample.
    chain = real_chain(strikes=(85, 90, 95, 100, 105, 110, 115))
    chain[3]["call"]["openInterest"] = None
    chain[3]["put"]["openInterest"] = None
    rows = open_interest_profile(chain)
    unknown = next(r for r in rows if r["strike"] == 100.0)
    assert unknown["totalOI"] is None
    assert unknown["callOI"] is None


# ── Liquidity ──────────────────────────────────────────────────────────────

def test_tight_spread_and_deep_book_is_good():
    assert contract_liquidity(_leg(bid=1.00, ask=1.02, oi=5000))["level"] == "good"


def test_wide_spread_is_flagged():
    result = contract_liquidity(_leg(bid=1.00, ask=1.20, oi=5000))
    assert result["level"] == "fair"
    assert "wide_spread" in result["reasons"]


def test_very_wide_spread_is_poor():
    result = contract_liquidity(_leg(bid=1.00, ask=2.00, oi=5000))
    assert result["level"] == "poor"
    assert "very_wide_spread" in result["reasons"]


def test_thin_open_interest_downgrades_a_tight_quote():
    result = contract_liquidity(_leg(bid=1.00, ask=1.02, oi=5))
    assert result["level"] == "fair"
    assert "thin_open_interest" in result["reasons"]


def test_unquoted_contract_has_no_liquidity_level():
    """No quote means unknown. A green light here would be worse than none."""
    result = contract_liquidity({"bid": None, "ask": None, "openInterest": 1000})
    assert result["level"] is None
    assert result["reasons"] == ["no_quote"]


def test_chain_liquidity_covers_both_sides():
    rows = chain_liquidity(real_chain())
    assert len(rows) == 5
    assert set(rows[0]) == {"strike", "call", "put"}


# ── ATM IV and term structure ──────────────────────────────────────────────

def test_atm_iv_picks_the_nearest_strike():
    chain = real_chain()
    chain[2]["call"]["iv"] = 0.5
    chain[2]["put"]["iv"] = 0.5
    assert atm_iv(chain, 101.0) == pytest.approx(0.5)


def test_atm_iv_is_none_when_no_side_quotes_a_volatility():
    chain = real_chain()
    for item in chain:
        item["call"]["iv"] = None
        item["put"]["iv"] = None
    assert atm_iv(chain, 100.0) is None


def test_term_structure_detects_contango():
    points = [
        {"date": "2026-08-21", "daysToExpiry": 21, "iv": 0.20},
        {"date": "2026-09-18", "daysToExpiry": 49, "iv": 0.26},
    ]
    result = term_structure(points)
    assert result["shape"] == "contango"
    assert result["slope"] == pytest.approx(0.06)


def test_term_structure_detects_backwardation():
    points = [
        {"date": "2026-08-21", "daysToExpiry": 21, "iv": 0.40},
        {"date": "2026-09-18", "daysToExpiry": 49, "iv": 0.28},
    ]
    assert term_structure(points)["shape"] == "backwardation"


def test_term_structure_drops_expiries_without_iv():
    """A node that could not be measured is dropped, never interpolated."""
    points = [
        {"date": "a", "daysToExpiry": 21, "iv": 0.20},
        {"date": "b", "daysToExpiry": 35, "iv": None},
        {"date": "c", "daysToExpiry": 49, "iv": 0.24},
    ]
    result = term_structure(points)
    assert [p["date"] for p in result["points"]] == ["a", "c"]


def test_term_structure_needs_two_usable_points():
    assert term_structure([{"date": "a", "daysToExpiry": 21, "iv": 0.2}]) is None


# ── Expected move ──────────────────────────────────────────────────────────

def test_expected_move_is_one_sigma():
    result = expected_move(100.0, 0.20, 365)
    assert result["absolute"] == pytest.approx(20.0, rel=1e-6)
    assert result["upper"] == pytest.approx(120.0, rel=1e-6)
    assert result["lower"] == pytest.approx(80.0, rel=1e-6)


def test_expected_move_scales_with_root_time():
    quarter = expected_move(100.0, 0.20, 365 / 4)["absolute"]
    year = expected_move(100.0, 0.20, 365)["absolute"]
    assert quarter == pytest.approx(year / 2, rel=1e-6)


def test_expected_move_undefined_without_iv():
    """Not zero: a move nobody can compute is unknown, not 'it will not move'."""
    assert expected_move(100.0, None, 30) is None
    assert expected_move(100.0, 0.0, 30) is None


def test_expected_move_undefined_without_horizon():
    assert expected_move(100.0, 0.2, 0) is None
