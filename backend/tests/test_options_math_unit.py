"""
Offline unit tests for the pure-math options engine (``options_math.py``).

No network, no database, no live backend. These run in every CI job and in any
local ``pytest tests/`` invocation (the filename ends in ``_unit.py``, so the
live-backend skip in conftest.py does not apply to them).

Black-Scholes reference values (S=K=100, T=1y, r=5%, sigma=20%, q=0):
    call = 10.4506,  put = 5.5735,  call delta = 0.6368
"""
import math

import pytest

from options_math import (
    call_price,
    put_price,
    calculate_greeks,
    calculate_payoff,
    find_break_evens,
)

R = 0.05
SIGMA = 0.20


# ── Black-Scholes pricing ────────────────────────────────────────────────
def test_call_atm_matches_reference():
    assert call_price(S=100, K=100, T=1.0, r=R, sigma=SIGMA) == pytest.approx(10.4506, abs=1e-3)


def test_put_atm_matches_reference():
    assert put_price(S=100, K=100, T=1.0, r=R, sigma=SIGMA) == pytest.approx(5.5735, abs=1e-3)


def test_put_call_parity():
    """C - P must equal S - K·e^(-rT) exactly."""
    S, K, T = 100.0, 100.0, 1.0
    c = call_price(S=S, K=K, T=T, r=R, sigma=SIGMA)
    p = put_price(S=S, K=K, T=T, r=R, sigma=SIGMA)
    assert (c - p) == pytest.approx(S - K * math.exp(-R * T), abs=1e-6)


def test_call_increases_with_spot():
    base = call_price(S=100, K=100, T=1.0, r=R, sigma=SIGMA)
    higher = call_price(S=110, K=100, T=1.0, r=R, sigma=SIGMA)
    assert higher > base


def test_call_increases_with_volatility():
    low = call_price(S=100, K=100, T=1.0, r=R, sigma=0.10)
    high = call_price(S=100, K=100, T=1.0, r=R, sigma=0.40)
    assert high > low


def test_deep_itm_call_has_intrinsic_floor():
    """A deep ITM call is worth at least its discounted intrinsic value."""
    price = call_price(S=200, K=100, T=1.0, r=R, sigma=SIGMA)
    intrinsic = 200 - 100 * math.exp(-R * 1.0)
    assert price >= intrinsic - 1e-6


# ── Greeks ───────────────────────────────────────────────────────────────
def test_long_call_greeks_signs():
    leg = {"type": "call", "action": "buy", "strike": 100, "premium": 5,
           "qty": 1, "daysToExpiry": 365, "iv": SIGMA}
    g = calculate_greeks([leg], stock_price=100, r=R)
    for key in ("delta", "gamma", "theta", "vega", "rho"):
        assert key in g, f"missing greek: {key}"
    assert 0 < g["delta"] < 1
    assert g["gamma"] > 0
    assert g["vega"] > 0
    assert g["delta"] == pytest.approx(0.6368, abs=1e-2)


def test_long_put_delta_is_negative():
    leg = {"type": "put", "action": "buy", "strike": 100, "premium": 5,
           "qty": 1, "daysToExpiry": 365, "iv": SIGMA}
    g = calculate_greeks([leg], stock_price=100, r=R)
    assert -1 < g["delta"] < 0


# ── Payoff diagram + break-evens ─────────────────────────────────────────
def test_payoff_returns_curve():
    leg = {"type": "call", "action": "buy", "strike": 100, "premium": 5,
           "qty": 1, "daysToExpiry": 30, "iv": SIGMA}
    pay = calculate_payoff([leg], stock_price=100)
    assert isinstance(pay, list) and len(pay) > 10
    assert all("price" in p and "pnl" in p for p in pay)


def test_long_call_breakeven_near_strike_plus_premium():
    """Buy 1 call K=100 premium 5 → expiry break-even ≈ 105."""
    leg = {"type": "call", "action": "buy", "strike": 100, "premium": 5,
           "qty": 1, "daysToExpiry": 30, "iv": SIGMA}
    pay = calculate_payoff([leg], stock_price=100, price_range=0.5)
    break_evens = find_break_evens(pay)
    assert any(abs(be - 105) < 5 for be in break_evens), f"break-evens={break_evens}"
