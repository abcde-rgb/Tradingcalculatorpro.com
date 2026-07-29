"""Offline regression tests for the analytics corrections (ANALISIS_TRADER §2).

Each test pins a specific defect that was reaching the user as a number they
would size positions with. Pure functions, no network/DB.
"""
from datetime import datetime, timedelta

import pytest

from performance import (
    compute_analytics,
    compute_trade_pnl,
    compute_excursion_stats,
    generate_insights,
    sort_trades_chronologically,
    _compute_sortino,
    _compute_sharpe,
)

BASE = datetime(2026, 1, 1)


def _trade(day, pnl, *, sl=95.0, balance=10000.0, mae=None, mfe=None):
    """Closed long: entry 100, qty 10, so exit price encodes the P&L."""
    exit_dt = BASE + timedelta(days=day)
    return compute_trade_pnl({
        "status": "closed", "side": "long",
        "entry_price": 100.0, "exit_price": 100.0 + pnl / 10, "quantity": 10.0,
        "sl": sl, "account_balance": balance,
        "mae_price": mae, "mfe_price": mfe,
        "entry_date": exit_dt.isoformat() + "Z",
        "exit_date": exit_dt.isoformat() + "Z",
    })


# ── §2.1 equity curve ordering ────────────────────────────────────

def test_analytics_are_order_independent():
    """Feeding the same trades newest-first must not change the drawdown.

    The API used to hand `compute_analytics` a newest-to-oldest list, and
    drawdown is not symmetric under reversal — reversing the series turns falls
    into rises, so the reported max drawdown came out lower than the real one.
    """
    trades = [_trade(i, p) for i, p in enumerate([500, -200, -300, -400, 900, -100])]
    chrono = compute_analytics(trades)
    reversed_ = compute_analytics(list(reversed(trades)))
    assert chrono["max_drawdown_pct"] == reversed_["max_drawdown_pct"]
    assert chrono["equity_curve"] == reversed_["equity_curve"]
    assert chrono["max_consecutive_losses"] == reversed_["max_consecutive_losses"]


def test_drawdown_is_not_understated_by_reversal():
    """A losing run early then a recovery: reversal would hide the real depth."""
    trades = [_trade(i, p) for i, p in enumerate([-2000, -2000, -1000, 3000, 3000])]
    a = compute_analytics(trades)
    # 10000 → 8000 → 6000 → 5000 → 8000 → 11000. Peak 10000, trough 5000 = 50%.
    assert a["max_drawdown_pct"] == pytest.approx(50.0, abs=0.01)


def test_starting_balance_comes_from_the_oldest_trade():
    """`closed[0]` used to be the NEWEST trade, so every % hung off the wrong base."""
    trades = [
        _trade(0, 100, balance=10000.0),
        _trade(1, 100, balance=10100.0),
        _trade(2, 100, balance=10200.0),
    ]
    a = compute_analytics(list(reversed(trades)))
    assert a["equity_curve"][0] == 10000.0


def test_sort_uses_exit_date_not_entry_date():
    """A swing opened first but closed last hits the account last."""
    early_entry_late_exit = {
        "entry_date": "2026-01-01T00:00:00Z", "exit_date": "2026-04-01T00:00:00Z",
    }
    late_entry_early_exit = {
        "entry_date": "2026-03-01T00:00:00Z", "exit_date": "2026-03-02T00:00:00Z",
    }
    ordered = sort_trades_chronologically([early_entry_late_exit, late_entry_early_exit])
    assert ordered[0] is late_entry_early_exit


# ── §2.4 Sharpe / Sortino ─────────────────────────────────────────

def test_sortino_divides_downside_by_total_observations():
    """Dividing by the count of negatives inflates the denominator.

    Standard (Sortino/Price) downside deviation divides the sum of squared
    shortfalls by N TOTAL. With 1 loss in 4, dividing by 1 instead of 4 doubles
    the deviation and halves the ratio.
    """
    returns = [0.02, 0.02, 0.02, -0.02]
    got = _compute_sortino(returns)
    # downside deviation = sqrt(0.02^2 / 4) = 0.01 ; mean = 0.01
    assert got == pytest.approx(0.01 / 0.01, abs=1e-6)


def test_sortino_without_losses_is_undefined_not_zero():
    """A system with no losing trades has no downside deviation.

    Returning 0.0 there reads on the dashboard as "terrible", which is the
    opposite of what it means.
    """
    assert _compute_sortino([0.01, 0.02, 0.015]) is None


def test_sharpe_uses_sample_stdev_and_subtracts_risk_free():
    returns = [0.01, 0.02, -0.01, 0.03]
    assert _compute_sharpe(returns, 0.0) > _compute_sharpe(returns, 0.005)


def test_sharpe_is_annualized_when_the_sample_supports_it():
    trades = [_trade(i * 3, 100 if i % 3 else -150) for i in range(30)]
    a = compute_analytics(trades)
    assert a["annualized"] is True
    assert a["trades_per_year"] > 0
    # The annualized figure is the per-trade one scaled by sqrt(trades/year).
    assert abs(a["sharpe_ratio"]) > abs(a["sharpe_per_trade"])


def test_short_sample_is_not_annualized():
    """Annualizing off three trades a day apart produces a meaningless number."""
    trades = [_trade(i, 100) for i in range(3)]
    a = compute_analytics(trades)
    assert a["annualized"] is False
    assert a["trades_per_year"] is None


def test_sharpe_insight_stays_quiet_on_an_unannualizable_sample():
    """The 'good Sharpe' badge is calibrated for the annualized ratio only."""
    a = compute_analytics([_trade(i, 100) for i in range(3)])
    keys = {i["key"] for i in generate_insights(a)}
    assert "insightSharpeOK" not in keys
    assert "insightSharpeBad" not in keys


# ── §2.5 R-multiple sample ────────────────────────────────────────

def test_trade_without_stop_has_undefined_r_not_zero():
    assert _trade(0, 100, sl=None)["r_multiple"] is None
    assert _trade(0, 100)["r_multiple"] == 2.0


def test_no_stop_trades_are_excluded_from_avg_r():
    """Averaging them in as 0R drags the mean toward the middle."""
    with_stops = [_trade(i, 500) for i in range(5)]           # +10R each
    mixed = with_stops + [_trade(i + 5, 500, sl=None) for i in range(5)]
    assert compute_analytics(with_stops)["avg_r"] == compute_analytics(mixed)["avg_r"]
    a = compute_analytics(mixed)
    assert a["r_sample_size"] == 5
    assert a["trades_without_r"] == 5


def test_no_stop_trades_do_not_spike_the_zero_bucket():
    mixed = [_trade(i, 500) for i in range(3)] + [_trade(i + 3, 500, sl=None) for i in range(7)]
    dist = compute_analytics(mixed)["r_distribution"]
    assert dist["0R..1R"] == 0
    assert sum(dist.values()) == 3


def test_partial_r_sample_is_reported_as_an_insight():
    mixed = [_trade(i, 500) for i in range(5)] + [_trade(i + 5, 500, sl=None) for i in range(5)]
    keys = {i["key"] for i in generate_insights(compute_analytics(mixed))}
    assert "insightRSampleIncomplete" in keys


# ── §2.6 MAE / MFE ────────────────────────────────────────────────

def test_mae_mfe_in_r_for_a_long():
    # entry 100, stop 95 → risk 5. Dipped to 99 (=0.2R), ran to 115 (=3R).
    t = _trade(0, 150, mae=99.0, mfe=115.0)
    assert t["mae_r"] == 0.2
    assert t["mfe_r"] == 3.0


def test_mae_mfe_in_r_for_a_short():
    t = compute_trade_pnl({
        "status": "closed", "side": "short",
        "entry_price": 100.0, "exit_price": 90.0, "quantity": 10.0, "sl": 105.0,
        "account_balance": 10000.0, "mae_price": 102.0, "mfe_price": 85.0,
        "entry_date": "2026-01-01T00:00:00Z", "exit_date": "2026-01-02T00:00:00Z",
    })
    # risk 5. Went up to 102 (adverse 2 = 0.4R), down to 85 (favourable 15 = 3R).
    assert t["mae_r"] == 0.4
    assert t["mfe_r"] == 3.0


def test_excursion_is_unavailable_without_the_data():
    stats = compute_excursion_stats([_trade(i, 100) for i in range(5)])
    assert stats["available"] is False
    assert stats["scatter"] == []


def test_excursion_suggests_a_tighter_stop_when_winners_barely_dipped():
    """The headline MAE read: winners that never went far against you mean the
    stop is wider than the evidence requires."""
    winners = [_trade(i, 500, mae=99.7, mfe=115.0) for i in range(20)]
    stats = compute_excursion_stats(winners)
    assert stats["available"] is True
    assert stats["winners_mae_p80"] == pytest.approx(0.06, abs=0.01)
    assert stats["suggested_stop_r"] is not None and stats["suggested_stop_r"] < 0.8


def test_excursion_counts_losers_that_gave_back_a_won_trade():
    losers = [_trade(i, -500, mae=94.0, mfe=108.0) for i in range(12)]
    stats = compute_excursion_stats(losers)
    assert stats["losers_sample"] == 12
    assert stats["losers_gave_back"] == 12  # all reached +1.6R before turning
    keys = {i["key"] for i in generate_insights(compute_analytics(losers))}
    assert "insightGaveBackWinners" in keys


def test_analytics_exposes_excursion_block_even_when_empty():
    a = compute_analytics([_trade(i, 100) for i in range(3)])
    assert a["excursion"]["available"] is False
