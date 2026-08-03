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
    payoff_bounds,
    far_upside_slope,
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


# ── Extremos del payoff: acotado vs. sin acotar ──────────────────────────
#
# Estos tests existen porque `max()/min()` sobre `calculate_payoff` NO contesta
# la pregunta: esa rejilla llega hasta ±35% del spot, así que el beneficio
# máximo de una call comprada salía como el P&L que hubiera en el borde
# derecho del gráfico (~$3.300 con spot 100), y la pérdida máxima de una call
# vendida desnuda, igual. Ninguno de los dos está acotado. Un número donde la
# respuesta es «sin acotar» es justo la cifra con la que alguien dimensiona
# una posición, así que va `None`.
def _leg(type_, action, strike, premium, qty=1):
    return {"type": type_, "action": action, "strike": strike, "premium": premium,
            "qty": qty, "quantity": qty, "daysToExpiry": 30, "iv": SIGMA}


def test_long_call_profit_is_unbounded():
    b = payoff_bounds([_leg("call", "buy", 100, 2)], stock_price=100)
    assert b["maxProfit"] is None
    assert b["isMaxProfitUnlimited"] is True
    # La pérdida sí está acotada: la prima pagada.
    assert b["maxLoss"] == pytest.approx(-200, abs=1)
    assert b["isMaxLossUnlimited"] is False


def test_naked_short_call_loss_is_unbounded():
    b = payoff_bounds([_leg("call", "sell", 100, 2)], stock_price=100)
    assert b["maxLoss"] is None
    assert b["isMaxLossUnlimited"] is True
    assert b["maxProfit"] == pytest.approx(200, abs=1)


def test_long_put_max_profit_is_at_zero_not_at_the_chart_edge():
    """Una put comprada K=100 vale como mucho (100 − 2) × 100 = $9.800.

    La rejilla del gráfico se queda en 65 y devolvía ~$3.300: no es que
    estuviera «sin acotar», es que estaba mal por un factor de tres.
    """
    b = payoff_bounds([_leg("put", "buy", 100, 2)], stock_price=100)
    assert b["isMaxProfitUnlimited"] is False
    assert b["maxProfit"] == pytest.approx(9800, abs=1)


def test_short_put_max_loss_is_the_whole_notional():
    b = payoff_bounds([_leg("put", "sell", 100, 2)], stock_price=100)
    assert b["isMaxLossUnlimited"] is False
    assert b["maxLoss"] == pytest.approx(-9800, abs=1)


def test_vertical_spread_is_bounded_both_ways():
    legs = [_leg("call", "buy", 100, 5), _leg("call", "sell", 110, 1.5)]
    b = payoff_bounds(legs, stock_price=100)
    assert b["isMaxProfitUnlimited"] is False and b["isMaxLossUnlimited"] is False
    assert b["maxProfit"] == pytest.approx(650, abs=1)   # (10 − 3.5) × 100
    assert b["maxLoss"] == pytest.approx(-350, abs=1)    # prima neta pagada


def test_covered_call_is_bounded_the_short_call_is_not_naked():
    """100 acciones + 1 call vendida: la pendiente en el infinito se anula."""
    legs = [{"type": "stock", "action": "buy", "quantity": 100, "strike": 100},
            _leg("call", "sell", 105, 2)]
    b = payoff_bounds(legs, stock_price=100)
    assert b["isMaxProfitUnlimited"] is False
    assert b["isMaxLossUnlimited"] is False
    assert b["maxProfit"] == pytest.approx(700, abs=1)   # (105−100)×100 + 200
    assert b["maxLoss"] == pytest.approx(-9800, abs=1)   # acción a cero, menos la prima


def test_ratio_spread_1x2_has_unbounded_loss():
    """Comprar 1 call y vender 2: queda corto de una. Pendiente −100."""
    legs = [_leg("call", "buy", 100, 5), _leg("call", "sell", 110, 1.5, qty=2)]
    b = payoff_bounds(legs, stock_price=100)
    assert b["isMaxLossUnlimited"] is True
    assert b["maxLoss"] is None
    # El máximo cae EXACTAMENTE en el strike de las vendidas; la rejilla lo
    # esquivaba y devolvía $785.
    assert b["maxProfit"] == pytest.approx(800, abs=1)


def test_long_straddle_profit_unbounded_loss_capped_at_premium():
    legs = [_leg("call", "buy", 100, 4), _leg("put", "buy", 100, 4)]
    b = payoff_bounds(legs, stock_price=100)
    assert b["isMaxProfitUnlimited"] is True
    assert b["maxLoss"] == pytest.approx(-800, abs=1)


def test_fees_eat_into_a_bounded_extreme_only():
    legs = [_leg("call", "buy", 100, 5), _leg("call", "sell", 110, 1.5)]
    b = payoff_bounds(legs, stock_price=100, fee_per_contract=0.65)
    assert b["maxProfit"] == pytest.approx(650 - 1.30, abs=0.01)
    unbounded = payoff_bounds([_leg("call", "buy", 100, 2)], stock_price=100,
                              fee_per_contract=0.65)
    assert unbounded["maxProfit"] is None


def test_far_upside_slope_signs():
    assert far_upside_slope([_leg("call", "buy", 100, 2)]) == 100
    assert far_upside_slope([_leg("call", "sell", 100, 2)]) == -100
    assert far_upside_slope([_leg("put", "buy", 100, 2)]) == 0      # vale 0 arriba
    assert far_upside_slope([_leg("put", "sell", 100, 2)]) == 0
    assert far_upside_slope([]) == 0


def test_no_legs_reports_nothing_rather_than_zero():
    b = payoff_bounds([], stock_price=100)
    assert b["maxProfit"] is None and b["maxLoss"] is None
    assert b["isMaxProfitUnlimited"] is False and b["isMaxLossUnlimited"] is False
