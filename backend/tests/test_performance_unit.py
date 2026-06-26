"""
Offline unit tests for performance analytics aggregation (performance.py).

Focus: the `daily_pnl` series that powers the monthly PnL calendar. Pure function,
no network/DB — runs in every CI job (filename ends in `_unit.py`).
"""
from performance import compute_analytics, detect_behavioral_biases


def _ct(entry, exit_, pnl, sl=95.0, errors=None):
    """Closed trade with explicit entry/exit timestamps for bias tests."""
    return {
        "status": "closed", "entry_price": 100.0, "exit_price": 101.0,
        "entry_date": entry, "exit_date": exit_, "pnl": pnl, "sl": sl,
        "errors": errors or [],
    }


def test_bias_no_stop_discipline_flagged():
    trades = [_ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", 10, sl=None) for _ in range(4)]
    codes = {b["code"] for b in detect_behavioral_biases(trades)}
    assert "no_stop_discipline" in codes


def test_bias_disposition_effect_flagged():
    # winners held ~10 min, losers held ~2 h → holding losers far longer
    trades = [
        _ct("2026-01-01T09:00:00Z", "2026-01-01T09:10:00Z", 50),
        _ct("2026-01-02T09:00:00Z", "2026-01-02T09:10:00Z", 40),
        _ct("2026-01-03T09:00:00Z", "2026-01-03T11:00:00Z", -30),
        _ct("2026-01-04T09:00:00Z", "2026-01-04T11:00:00Z", -20),
    ]
    codes = {b["code"] for b in detect_behavioral_biases(trades)}
    assert "disposition_effect" in codes


def test_bias_revenge_trade_from_flags():
    trades = [
        _ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", -10),
        _ct("2026-01-01T10:05:00Z", "2026-01-01T11:00:00Z", -20,
            errors=[{"code": "revenge_trade", "severity": "high"}]),
        _ct("2026-01-02T09:00:00Z", "2026-01-02T10:00:00Z", 15),
    ]
    biases = {b["code"]: b for b in detect_behavioral_biases(trades)}
    assert "revenge_trade" in biases
    assert biases["revenge_trade"]["count"] == 1


def test_bias_insufficient_data_returns_empty():
    assert detect_behavioral_biases([_ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", 10)]) == []


def _closed(exit_date, pnl):
    """Minimal closed trade with a precomputed pnl."""
    return {
        "status": "closed",
        "entry_price": 100.0,
        "exit_price": 101.0,
        "entry_date": exit_date,
        "exit_date": exit_date,
        "pnl": pnl,
        "account_balance": 10000,
    }


def test_daily_pnl_groups_and_sorts_by_exit_date():
    trades = [
        _closed("2026-01-02T10:00:00Z", 100),
        _closed("2026-01-02T15:30:00Z", -40),
        _closed("2026-01-03", 50),
    ]
    a = compute_analytics(trades)
    by_date = {d["date"]: d for d in a["daily_pnl"]}

    assert by_date["2026-01-02"]["pnl"] == 100.0 - 40.0   # netted same day
    assert by_date["2026-01-02"]["n"] == 2
    assert by_date["2026-01-03"]["pnl"] == 50.0
    # chronological order
    assert [d["date"] for d in a["daily_pnl"]] == ["2026-01-02", "2026-01-03"]


def test_daily_pnl_empty_without_closed_trades():
    a = compute_analytics([{"status": "open", "exit_price": None}])
    assert a["daily_pnl"] == []


def test_total_pnl_matches_daily_sum():
    trades = [_closed("2026-02-01", 30), _closed("2026-02-02", -10), _closed("2026-02-02", 5)]
    a = compute_analytics(trades)
    assert round(sum(d["pnl"] for d in a["daily_pnl"]), 2) == a["total_pnl"]
