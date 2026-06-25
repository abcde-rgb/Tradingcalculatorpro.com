"""
Offline unit tests for performance analytics aggregation (performance.py).

Focus: the `daily_pnl` series that powers the monthly PnL calendar. Pure function,
no network/DB — runs in every CI job (filename ends in `_unit.py`).
"""
from performance import compute_analytics


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
