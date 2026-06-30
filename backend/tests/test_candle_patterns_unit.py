"""Unit tests for the expanded candlestick pattern detector + reliability stats.

Covers: catalogue completeness, trend-aware single-candle disambiguation,
multi-candle patterns, stats enrichment, and the Yahoo OHLC history parser.
Runs under pytest or directly (`python tests/test_candle_patterns_unit.py`).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from candle_patterns import (  # noqa: E402
    detect_all_patterns,
    get_pattern_catalog,
    PATTERN_META,
)


def _row(d, o, h, lo, c):
    return {"date": d, "open": o, "high": h, "low": lo, "close": c}


def _ids(rows):
    return [d["pattern_id"] for d in detect_all_patterns(rows)]


def test_catalogue_complete_and_well_formed():
    assert len(PATTERN_META) == 30
    for pid, meta in PATTERN_META.items():
        assert meta["type"] in ("bullish", "bearish", "neutral"), pid
        assert meta["behavior"] in ("reversal", "continuation", "indecision"), pid
        assert 0 < meta["rate"] <= 100, pid
        assert 1 <= meta["rank"] <= 103, pid
        assert meta["candles"] in (1, 2, 3), pid


def test_catalog_sorted_by_rank():
    cat = get_pattern_catalog()
    ranks = [c["rank"] for c in cat]
    assert ranks == sorted(ranks)
    assert cat[0]["pattern_id"] == "three-white-soldiers"  # rank 3, strongest


def test_hammer_in_downtrend_not_hanging_man():
    rows = [_row(f"d{i}", 100 - i, 101 - i, 99 - i, 100 - i - 0.5) for i in range(6)]
    rows.append(_row("h", 94, 95, 90, 94.8))  # long lower wick, small body up top
    ids = _ids(rows)
    assert "hammer" in ids
    assert "hanging-man" not in ids


def test_hanging_man_in_uptrend_not_hammer():
    rows = [_row(f"u{i}", 100 + i, 101 + i, 99 + i, 100 + i + 0.5) for i in range(6)]
    rows.append(_row("hm", 106, 107, 102, 106.8))  # same shape, but caps a rally
    ids = _ids(rows)
    assert "hanging-man" in ids
    assert "hammer" not in ids


def test_bullish_engulfing():
    rows = [_row("a", 50, 51, 48, 48.5), _row("b", 48, 53, 47.5, 52.5)]
    assert "bullish-engulfing" in _ids(rows)


def test_bullish_harami():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 53, 55, 52, 54)]
    assert "bullish-harami" in _ids(rows)


def test_piercing_line():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 48, 57, 47, 56)]
    assert "piercing-line" in _ids(rows)


def test_morning_star():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 47, 48, 45, 46.5), _row("c", 48, 58, 47, 57)]
    assert "morning-star" in _ids(rows)


def test_three_white_soldiers():
    rows = [
        _row("a", 30, 50, 28, 48),
        _row("b", 47, 68, 45, 65),
        _row("c", 64, 88, 62, 86),
    ]
    assert "three-white-soldiers" in _ids(rows)


def test_detections_carry_stats():
    rows = [_row("a", 50, 51, 48, 48.5), _row("b", 48, 53, 47.5, 52.5)]
    det = detect_all_patterns(rows)
    eng = next(d for d in det if d["pattern_id"] == "bullish-engulfing")
    assert eng["behavior"] == "reversal"
    assert isinstance(eng["rate"], int) and eng["rate"] > 0
    assert isinstance(eng["rank"], int)


def test_ohlc_history_parsing_skips_null_bars():
    import stock_data as sd

    def fake_get(path):
        assert "/v8/finance/chart" in path
        return {"chart": {"result": [{
            "timestamp": [1700000000, 1700086400, 1700172800],
            "indicators": {"quote": [{
                "open": [10, 11, None], "high": [12, 13, 14],
                "low": [9, 10, 11], "close": [11, 12, 13],
            }]},
        }]}}

    original = sd._yahoo_get
    sd._yahoo_get = fake_get
    try:
        rows = sd.get_ohlc_history("AAPL", "3mo", "1d")
    finally:
        sd._yahoo_get = original
    assert len(rows) == 2                       # the null bar is dropped
    assert rows[0]["close"] == 11.0
    assert set(rows[0].keys()) == {"date", "open", "high", "low", "close"}


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in fns:
        fn()
        print(f"PASS {fn.__name__}")
    print(f"\nAll {len(fns)} tests passed.")
