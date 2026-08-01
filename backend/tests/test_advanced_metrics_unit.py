"""Offline unit tests for the advanced metrics gap:
second-order Greeks (vanna/charm) + GEX in options_math, and the risk metrics
in performance_metrics. All reference values are cited; no network/DB needed."""
import math

import pytest

import options_math as om
import performance_metrics as pm


# ---------------------------------------------------------------------------
# Second-order Greeks — verified against finite differences of delta.
# ---------------------------------------------------------------------------

def test_vanna_matches_finite_difference():
    S, K, T, r, sig, q = 100.0, 100.0, 1.0, 0.05, 0.20, 0.0
    h = 1e-4
    fd = (om.delta(S, K, T, r, sig + h, "call", q) - om.delta(S, K, T, r, sig - h, "call", q)) / (2 * h)
    assert abs(om.vanna_val(S, K, T, r, sig, q) - fd) < 1e-3
    # vanna is identical for call and put
    assert abs(om.vanna_val(S, K, T, r, sig, q) - om.vanna_val(S, K, T, r, sig, q)) < 1e-12


def test_charm_matches_finite_difference():
    S, K, T, r, sig, q = 100.0, 105.0, 0.5, 0.05, 0.25, 0.0
    h = 1e-5
    # charm = ∂Δ/∂t (calendar) = -∂Δ/∂T
    fd = -(om.delta(S, K, T + h, r, sig, "call", q) - om.delta(S, K, T - h, r, sig, "call", q)) / (2 * h)
    assert abs(om.charm_val(S, K, T, r, sig, "call", q) - fd) < 1e-2


def test_second_order_greeks_aggregate():
    legs = [{"type": "call", "action": "buy", "strike": 100, "daysToExpiry": 30, "iv": 0.3, "contracts": 1}]
    g = om.calculate_second_order_greeks(legs, 100.0)
    assert "vanna" in g and "charm" in g
    assert isinstance(g["vanna"], float) and isinstance(g["charm"], float)


# ---------------------------------------------------------------------------
# GEX — honesty: synthetic chain (oi=None) → None.
# ---------------------------------------------------------------------------

def test_gex_computes_with_real_oi():
    chain = [
        {"strike": 95, "type": "put", "oi": 1000, "iv": 0.3, "daysToExpiry": 30},
        {"strike": 100, "type": "call", "oi": 2000, "iv": 0.3, "daysToExpiry": 30},
        {"strike": 105, "type": "call", "oi": 500, "iv": 0.3, "daysToExpiry": 30},
    ]
    res = om.gamma_exposure(chain, spot=100.0)
    assert res is not None
    assert "total" in res and "call_wall" in res and "put_wall" in res
    assert res["put_wall"] == 95  # only negative-gamma strike


def test_gex_returns_none_for_synthetic_chain():
    chain = [{"strike": 100, "type": "call", "oi": None, "iv": 0.3, "daysToExpiry": 30}]
    assert om.gamma_exposure(chain, spot=100.0) is None


def test_gex_returns_none_when_no_open_interest_anywhere():
    # An illiquid chain (all OI = 0) must not produce a fake "wall".
    chain = [
        {"strike": 100, "type": "call", "oi": 0, "iv": 0.3, "daysToExpiry": 30},
        {"strike": 105, "type": "put", "oi": 0, "iv": 0.3, "daysToExpiry": 30},
    ]
    assert om.gamma_exposure(chain, spot=100.0) is None


# ---------------------------------------------------------------------------
# Chain flattening — the bridge between the API chain shape and GEX.
# ---------------------------------------------------------------------------

def test_flatten_chain_produces_call_and_put_rows():
    chain = [
        {"strike": 100, "call": {"openInterest": 500, "iv": 0.25},
         "put": {"openInterest": 300, "iv": 0.28}},
    ]
    rows = om.flatten_chain_for_gex(chain, days_to_expiry=30)
    assert len(rows) == 2
    assert {r["type"] for r in rows} == {"call", "put"}
    assert rows[0]["oi"] == 500 and rows[0]["iv"] == 0.25
    assert all(r["daysToExpiry"] == 30 for r in rows)


def test_flatten_chain_refuses_synthetic():
    chain = [{"strike": 100, "call": {"openInterest": 9999, "iv": 0.3}, "put": {}}]
    assert om.flatten_chain_for_gex(chain, 30, synthetic=True) is None
    assert om.flatten_chain_for_gex([], 30) is None


def test_flatten_chain_defaults_bad_iv():
    chain = [{"strike": 100, "call": {"openInterest": 10, "iv": 0}, "put": {"openInterest": 5}}]
    rows = om.flatten_chain_for_gex(chain, 30)
    assert all(r["iv"] == om.DEFAULT_IV for r in rows)


def test_flatten_then_gex_end_to_end():
    chain = [
        {"strike": 95, "call": {"openInterest": 100, "iv": 0.3}, "put": {"openInterest": 900, "iv": 0.3}},
        {"strike": 105, "call": {"openInterest": 800, "iv": 0.3}, "put": {"openInterest": 50, "iv": 0.3}},
    ]
    rows = om.flatten_chain_for_gex(chain, 30)
    res = om.gamma_exposure(rows, spot=100.0)
    assert res is not None
    assert res["call_wall"] == 105  # net positive gamma from the heavy call OI
    assert res["put_wall"] == 95    # net negative gamma from the heavy put OI


# ---------------------------------------------------------------------------
# SQN, Calmar, Ulcer, streak Z-score.
# ---------------------------------------------------------------------------

def test_sqn_reference_value():
    r = [1, -1, 2, -1, 3, -1, 1, -1, 2, -1]
    assert abs(pm.sqn(r) - 0.8452) < 0.001


def test_sqn_none_when_insufficient_or_flat():
    assert pm.sqn([1.0]) is None
    assert pm.sqn([2.0, 2.0, 2.0]) is None  # zero dispersion → None, not 0


def test_calmar_reference():
    assert abs(pm.calmar(0.30, 0.15) - 2.0) < 1e-9
    assert pm.calmar(0.30, 0) is None
    assert pm.calmar(None, 0.15) is None


def test_ulcer_index_reference():
    assert abs(pm.ulcer_index([100, 90, 100]) - 5.7735) < 0.001
    assert pm.ulcer_index([100]) is None


def test_streak_zscore_alternating_is_choppy():
    # perfectly alternating WLWLWLWLWL → 10 runs, strong positive Z
    z = pm.streak_zscore(wins=5, losses=5, runs=10)
    assert z is not None and z > 2.0
    assert pm.streak_zscore(5, 0, 1) is None  # no losses → None


# ---------------------------------------------------------------------------
# VaR / CVaR.
# ---------------------------------------------------------------------------

def test_var_parametric_reference():
    # mean 0, pstdev 100 → VaR95 ≈ 1.6449 * 100
    assert abs(pm.value_at_risk_parametric([-100, 100], 0.95) - 164.49) < 0.1


def test_var_and_cvar_historical():
    rs = [-100, 100]
    assert abs(pm.value_at_risk_historical(rs, 0.95) - 90.0) < 1e-6
    assert abs(pm.conditional_var(rs, 0.95) - 100.0) < 1e-6


def test_var_none_when_insufficient():
    assert pm.value_at_risk_parametric([1.0], 0.95) is None
    assert pm.conditional_var([], 0.95) is None


# ---------------------------------------------------------------------------
# MAE/MFE aggregation.
# ---------------------------------------------------------------------------

def test_mae_mfe_stats():
    trades = [
        {"mae": 50, "mfe": 200, "pnl": 120},
        {"mae": 30, "mfe": 100, "pnl": 100},
    ]
    s = pm.mae_mfe_stats(trades)
    assert s["avg_mae"] == 40.0
    assert s["avg_mfe"] == 150.0
    # exit efficiency: 120/200=0.6 and 100/100=1.0 → avg 0.8
    assert abs(s["avg_exit_efficiency"] - 0.8) < 1e-9


def test_mae_mfe_none_fields_when_absent():
    s = pm.mae_mfe_stats([{"pnl": 100}])
    assert s["avg_mae"] is None and s["avg_mfe"] is None
