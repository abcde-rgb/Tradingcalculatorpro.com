"""Offline tests for the professional-grade additions.

American option pricing (§3.4), account-level risk (§5.2) and the backtest
validation layer (§5.1) from ANALISIS_TRADER_20260728.
"""
import math
import random
from datetime import datetime, timezone

import pytest

from options_math import call_price, put_price
from american_options import (
    binomial_american, baw_american, early_exercise_premium,
    american_greeks, early_assignment_risk,
)
from portfolio_risk import (
    compute_open_heat, compute_loss_limits, volatility_adjusted_size,
    _effective_risk, _asset_class, _correlation_group,
)
from backtest import (
    BacktestConfig, run_backtest, run_validated_backtest, walk_forward,
    deflated_sharpe, sma, rsi, atr, STRATEGIES,
)


# ── American options (§3.4) ───────────────────────────────────────

def test_american_call_without_dividend_equals_european():
    """The identity that validates the whole tree: with no dividend there is
    never a reason to exercise a call early, so the American price is the
    European one."""
    eu = call_price(100, 100, 1.0, 0.05, 0.3)
    assert binomial_american(100, 100, 1.0, 0.05, 0.3, "call", 0.0, 800) == pytest.approx(eu, abs=0.02)
    assert baw_american(100, 100, 1.0, 0.05, 0.3, "call", 0.0) == pytest.approx(eu, abs=1e-9)


def test_american_put_is_worth_more_than_european():
    """Early exercise has real value on an in-the-money put: BSM prices that at
    exactly zero."""
    eu = put_price(100, 110, 1.0, 0.08, 0.3)
    am = binomial_american(100, 110, 1.0, 0.08, 0.3, "put", 0.0, 800)
    assert am > eu
    assert am - eu > 0.5


def test_american_call_on_a_dividend_payer_is_worth_more():
    """The case that assigns short calls in real life."""
    eu = call_price(100, 95, 1.0, 0.05, 0.3, 0.06)
    am = binomial_american(100, 95, 1.0, 0.05, 0.3, "call", 0.06, 800)
    assert am > eu


def test_baw_and_binomial_broadly_agree():
    """Two independent methods; if they diverge, at least one is wrong."""
    for S, K, T, sigma, q, kind in [
        (100, 110, 1.0, 0.30, 0.0, "put"),
        (100, 90, 0.5, 0.25, 0.0, "put"),
        (100, 95, 1.0, 0.30, 0.06, "call"),
    ]:
        b = binomial_american(S, K, T, 0.05, sigma, kind, q, 800)
        w = baw_american(S, K, T, 0.05, sigma, kind, q)
        assert w == pytest.approx(b, rel=0.05), f"{kind} {S}/{K}: baw={w} binom={b}"


def test_early_exercise_premium_is_never_negative():
    assert early_exercise_premium(100, 100, 1.0, 0.05, 0.3, "call", 0.0) >= 0
    assert early_exercise_premium(100, 120, 0.5, 0.05, 0.3, "put", 0.0) > 0


def test_american_greeks_have_the_right_signs():
    g = american_greeks(100, 100, 0.5, 0.05, 0.3, "put", 0.0, steps=200)
    assert -1.0 <= g["delta"] <= 0.0     # long put delta is negative
    assert g["gamma"] > 0
    assert g["vega"] > 0


def test_binomial_handles_expiry_and_degenerate_input():
    assert binomial_american(110, 100, 0.0, 0.05, 0.3, "call") == pytest.approx(10.0)
    assert binomial_american(90, 100, 0.0, 0.05, 0.3, "put") == pytest.approx(10.0)
    assert binomial_american(0, 100, 1.0, 0.05, 0.3, "call") == 0.0


def test_short_call_assignment_risk_when_dividend_beats_time_value():
    """A short ITM call whose remaining time value is worth less than an
    imminent dividend should expect assignment. The at-expiry simulation and
    Black-Scholes both treat this as impossible."""
    risk = early_assignment_risk(S=110, K=100, T=2 / 365, r=0.05, sigma=0.25,
                                 dividend=1.50, days_to_ex_dividend=1)
    assert risk["at_risk"] is True
    assert risk["reason"] == "dividend_exceeds_time_value"
    assert "assignment" in risk["detail"].lower()


def test_no_assignment_risk_when_time_value_dominates():
    risk = early_assignment_risk(S=110, K=100, T=180 / 365, r=0.05, sigma=0.25,
                                 dividend=0.20, days_to_ex_dividend=60)
    assert risk["at_risk"] is False
    assert risk["reason"] == "time_value_exceeds_dividend"


def test_no_assignment_risk_without_a_dividend():
    risk = early_assignment_risk(110, 100, 0.1, 0.05, 0.25, dividend=0, days_to_ex_dividend=None)
    assert risk["at_risk"] is False
    assert risk["reason"] == "no_dividend"


# ── Portfolio risk (§5.2) ─────────────────────────────────────────

def _pos(symbol, risk_per_unit=1.0, qty=100):
    return {"symbol": symbol, "status": "open", "side": "long",
            "entry_price": 100.0, "sl": 100.0 - risk_per_unit, "quantity": qty}


def test_correlated_positions_are_not_independent_risks():
    """Four 1% positions in NQ, ES, SPY and AAPL are not 4% of risk — they are
    one equity bet held four times."""
    heat = compute_open_heat([_pos(s) for s in ("NQ", "ES", "SPY", "AAPL")], 10000)
    assert heat["heat_pct"] == pytest.approx(4.0, abs=0.01)
    assert heat["effective_heat_pct"] < heat["heat_pct"]
    assert heat["effective_heat_pct"] > 3.0        # far above the 2% of true independence
    assert len(heat["by_correlation_group"]) == 1  # all one factor


def test_a_single_stock_shares_a_risk_factor_with_the_index():
    """A large-cap is mostly index beta; treating it as an unrelated class
    would understate the account's real exposure."""
    assert _correlation_group(_asset_class("AAPL")) == _correlation_group(_asset_class("SPY"))
    assert _correlation_group(_asset_class("BTC-USD")) != _correlation_group(_asset_class("SPY"))


def test_genuinely_diversified_book_shows_lower_effective_heat():
    correlated = compute_open_heat([_pos(s) for s in ("NQ", "ES", "SPY", "AAPL")], 10000)
    diversified = compute_open_heat([_pos(s) for s in ("SPY", "BTC-USD", "EURUSD", "GC")], 10000)
    assert diversified["effective_heat_pct"] < correlated["effective_heat_pct"]


def test_effective_risk_bounds():
    """ρ=0 → quadrature (independent); ρ=1 → plain sum (one bet, four times)."""
    risks = [100.0] * 4
    assert _effective_risk(risks, 0.0) == pytest.approx(200.0, abs=0.01)
    assert _effective_risk(risks, 1.0) == pytest.approx(400.0, abs=0.01)


def test_position_without_a_stop_is_counted_separately_not_as_zero_risk():
    """Its risk is unquantifiable, which is not the same as risk-free."""
    heat = compute_open_heat([{"symbol": "X", "status": "open",
                               "entry_price": 100, "quantity": 100}], 10000)
    assert heat["positions_without_stop"] == 1
    assert heat["positions"][0]["has_stop"] is False


@pytest.mark.parametrize("product,symbol,entry,sl,qty,expected", [
    # El tamaño de contrato sale del catálogo, NO del campo `multiplier`, que
    # es opcional al crear la operación y por tanto llega a None.
    ("forex",  "EURUSD", 1.0850, 1.0800, 1.0,   500.0),   # ×100 000
    ("option", "AAPL",   5.00,   2.50,   2.0,   500.0),   # ×100
    ("cfd",    "XAUUSD", 2000.0, 1990.0, 0.2,   200.0),   # ×100
    ("stock",  "AAPL",   150.0,  148.0,  100.0, 200.0),   # ×1
])
def test_open_heat_sizes_risk_with_the_instrument_catalogue(
        product, symbol, entry, sl, qty, expected):
    """BUG-045, segunda aparición: `_position_risk` leía `multiplier` en crudo
    con un `or 1` de respaldo y nunca consultaba el catálogo.

    Como `multiplier` es opcional al crear la operación, en un forex normal
    llegaba a None y el riesgo salía ×100 000 más pequeño: 1 lote de EURUSD con
    50 pips de stop se leía como 0,005 $ en vez de 500 $, y `/performance/
    portfolio-risk` devolvía un heat del 0 % con la cuenta al 5 %.
    """
    pos = {"symbol": symbol, "instrument_type": product, "status": "open",
           "side": "long", "entry_price": entry, "sl": sl, "quantity": qty}
    heat = compute_open_heat([pos], 10000)
    assert heat["total_risk"] == pytest.approx(expected, abs=0.01)
    assert heat["heat_pct"] == pytest.approx(expected / 100.0, abs=0.01)
    assert heat["positions_risk_unquantifiable"] == 0


def test_unknown_contract_size_is_unquantifiable_not_zero_risk():
    """Con stop pero sin tamaño de contrato resoluble, el riesgo no se sabe.

    Antes caía en el `or 1` y entraba en la suma con un número mil veces menor
    que el real; además, al ser > 0 pasaba el filtro `has_stop` y ni siquiera
    aparecía en un contador. Ahora no suma y se cuenta aparte del "sin stop",
    porque el usuario arregla cada caso de una forma distinta.
    """
    pos = {"symbol": "ZZZZ", "instrument_type": "futures", "status": "open",
           "side": "long", "entry_price": 100.0, "sl": 98.0, "quantity": 1.0}
    heat = compute_open_heat([pos], 10000)
    assert heat["positions_risk_unquantifiable"] == 1
    assert heat["positions_without_stop"] == 0      # stop sí tiene
    assert heat["positions"][0]["has_stop"] is True
    assert heat["positions"][0]["risk"] is None     # None, nunca 0
    assert heat["positions"][0]["risk_quantifiable"] is False
    assert heat["total_risk"] == 0.0                # no suma como si fuera 0
    assert heat["heat_pct"] == 0.0


def test_heat_escalates_through_warning_to_critical():
    small = compute_open_heat([_pos("SPY", qty=100)], 100000)
    big = compute_open_heat([_pos("SPY", qty=1000) for _ in range(1)], 10000)
    assert small["level"] == "ok"
    assert big["level"] == "critical"


def test_daily_loss_limit_blocks():
    """A loss limit that only warns is not a limit."""
    now = datetime(2026, 7, 29, 18, 0, tzinfo=timezone.utc)
    res = compute_loss_limits([{"exit_date": "2026-07-29T10:00:00Z", "pnl": -350.0}],
                              10000, max_daily_loss_pct=3, max_weekly_loss_pct=10, now=now)
    assert res["day"]["pnl_pct"] == pytest.approx(-3.5, abs=0.01)
    assert res["blocked"] is True
    assert res["blocked_reason"] == "daily_loss_limit"


def test_loss_limits_do_not_block_within_budget():
    now = datetime(2026, 7, 29, 18, 0, tzinfo=timezone.utc)
    res = compute_loss_limits([{"exit_date": "2026-07-29T10:00:00Z", "pnl": -100.0}],
                              10000, max_daily_loss_pct=3, now=now)
    assert res["blocked"] is False
    assert res["day"]["remaining_pct"] == pytest.approx(2.0, abs=0.01)


def test_no_limits_configured_never_blocks():
    now = datetime(2026, 7, 29, 18, 0, tzinfo=timezone.utc)
    res = compute_loss_limits([{"exit_date": "2026-07-29T10:00:00Z", "pnl": -5000.0}],
                              10000, now=now)
    assert res["blocked"] is False


def test_volatility_sizing_makes_1R_comparable_across_instruments():
    """Same money risk, very different unit counts — which is the point."""
    calm = volatility_adjusted_size(50000, 1, atr=2.0, atr_multiple=2, price=100)
    wild = volatility_adjusted_size(50000, 1, atr=20.0, atr_multiple=2, price=100)
    assert calm["risk_amount"] == wild["risk_amount"] == 500.0
    assert calm["units"] > wild["units"] * 9


def test_volatility_sizing_rejects_degenerate_input():
    assert volatility_adjusted_size(50000, 1, atr=0)["units"] == 0
    assert "error" in volatility_adjusted_size(50000, 1, atr=0)


# ── Backtest engine (§5.1) ────────────────────────────────────────

def _bars(n, seed, drift=0.0, vol=0.012):
    rng = random.Random(seed)
    price, out = 100.0, []
    for i in range(n):
        price *= math.exp(rng.gauss(drift, vol))
        hi = price * (1 + abs(rng.gauss(0, vol / 2)))
        lo = price * (1 - abs(rng.gauss(0, vol / 2)))
        out.append({"date": f"d{i}", "open": price, "high": max(hi, price),
                    "low": min(lo, price), "close": price})
    return out


def test_indicators_warm_up_before_producing_values():
    closes = [float(i) for i in range(100)]
    assert sma(closes, 20)[18] is None and sma(closes, 20)[19] is not None
    assert rsi(closes, 14)[13] is None and rsi(closes, 14)[14] is not None
    assert atr(_bars(60, 1), 14)[13] is None and atr(_bars(60, 1), 14)[14] is not None


def test_costs_are_mandatory_and_reduce_the_result():
    """A strategy that only works at zero cost does not work."""
    bars = _bars(1000, 42, drift=0.0004)
    with_costs = run_backtest(bars, "sma_cross", {"fast": 20, "slow": 50})
    free = run_backtest(bars, "sma_cross", {"fast": 20, "slow": 50},
                        BacktestConfig(commission_pct=0, slippage_pct=0))
    assert with_costs["total_costs"] > 0
    assert with_costs["total_return_pct"] < free["total_return_pct"]


def test_backtest_reports_the_expected_shape():
    result = run_backtest(_bars(1000, 7, drift=0.0004), "sma_cross", {"fast": 20, "slow": 50})
    for key in ("trades", "win_rate", "sharpe", "max_drawdown_pct", "equity_curve",
                "profit_factor", "avg_r", "total_costs"):
        assert key in result
    assert len(result["equity_curve"]) > 1


def test_backtest_refuses_short_series_and_unknown_strategies():
    assert run_backtest(_bars(10, 1), "sma_cross", {})["reason"] == "not_enough_data"
    assert run_backtest(_bars(500, 1), "nope", {})["reason"] == "unknown_strategy"


def test_validated_backtest_holds_out_of_sample_data_back():
    result = run_validated_backtest(_bars(1200, 42, drift=0.0003), "sma_cross")
    assert "in_sample" in result and "out_of_sample" in result
    assert result["in_sample_bars"] + result["out_of_sample_bars"] == 1200
    # The out-of-sample slice must never have been part of the search.
    assert result["out_of_sample_bars"] == pytest.approx(1200 * 0.3, abs=1)
    assert result["data_snooping"]["n_trials"] > 1


def test_validated_backtest_needs_enough_history():
    assert "error" in run_validated_backtest(_bars(150, 1), "sma_cross")


def test_data_snooping_correction_scales_with_the_number_of_trials():
    """Testing more combinations raises the bar a result has to clear."""
    sharpes = [0.1 * i for i in range(10)]
    few = deflated_sharpe(0.9, sharpes[:3], 500)
    many = deflated_sharpe(0.9, sharpes, 500)
    assert many["expected_max_sharpe_if_no_edge"] > few["expected_max_sharpe_if_no_edge"]


def test_data_snooping_flags_low_power_on_few_trials():
    """The correction is itself imprecise with a handful of trials, and says so
    rather than letting a 'significant' badge read as proof."""
    res = deflated_sharpe(1.5, [0.1 * i for i in range(8)], 500)
    assert res["low_power"] is True
    assert "weak evidence" in res["verdict"]


def test_data_snooping_mostly_refuses_to_declare_an_edge_on_pure_noise():
    """The headline claim of this module: search a random walk hard enough and
    you WILL find a good-looking parameter set. The correction should catch most
    of them — it is not infallible, which is why `low_power` exists."""
    declared_significant = 0
    for seed in range(6):
        result = run_validated_backtest(_bars(1200, 900 + seed), "rsi_reversion")
        if result.get("data_snooping", {}).get("significant"):
            declared_significant += 1
    assert declared_significant <= 2, (
        f"declared an edge on {declared_significant}/6 pure random walks"
    )


def test_walk_forward_reports_consistency_and_efficiency():
    result = walk_forward(_bars(1500, 42, drift=0.0003), "sma_cross", windows=5)
    assert result["windows"] >= 2
    assert 0 <= result["consistency_pct"] <= 100
    assert result["walk_forward_efficiency"] is not None
    assert all("params" in s for s in result["segments"])


def test_walk_forward_refuses_when_windows_would_be_too_small():
    assert "error" in walk_forward(_bars(300, 1), "sma_cross", windows=12)


def test_every_declared_strategy_runs():
    bars = _bars(1000, 3, drift=0.0003)
    for sid, spec in STRATEGIES.items():
        result = run_backtest(bars, sid, spec["defaults"])
        assert "reason" not in result or result["reason"] == "no_trades", sid
