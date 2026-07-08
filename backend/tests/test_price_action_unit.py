"""Unit tests for the price-action STRUCTURE detector (price_action.py).

Covers swing pivots, HH/HL/LH/LL labelling + trend, BOS/CHoCH events,
support/resistance clustering and Fair Value Gaps — all on synthetic OHLC.
Runs under pytest or directly (`python tests/test_price_action_unit.py`).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from price_action import (  # noqa: E402
    detect_swings, label_structure, detect_structure_events,
    detect_sr_levels, detect_fvgs, detect_structure, detect_breakouts,
)


def _row(o, h, lo, c, d="2024-01-01"):
    return {"date": d, "open": o, "high": h, "low": lo, "close": c}


# ---- Swing detection -------------------------------------------------------
def test_swing_high_and_low():
    # A clear peak at index 3 and a clear trough at index 7 (strength=2).
    highs = [10, 11, 12, 15, 12, 11, 9, 7, 9, 11, 12]
    rows = [_row(h, h + 0.5, h - 0.5, h) for h in highs]
    swings = detect_swings(rows, strength=2)
    types = {s["index"]: s["type"] for s in swings}
    assert types.get(3) == "high", swings
    assert types.get(7) == "low", swings


def test_swing_needs_enough_bars():
    rows = [_row(10, 10.5, 9.5, 10) for _ in range(3)]
    assert detect_swings(rows, strength=2) == []


# ---- Market structure ------------------------------------------------------
def test_uptrend_labels_hh_hl():
    swings = [
        {"index": 1, "price": 10, "type": "low"},
        {"index": 2, "price": 14, "type": "high"},
        {"index": 3, "price": 11, "type": "low"},   # HL (11 > 10)
        {"index": 4, "price": 16, "type": "high"},   # HH (16 > 14)
    ]
    res = label_structure(swings)
    labels = {s["index"]: s["label"] for s in res["swings"]}
    assert labels[3] == "HL" and labels[4] == "HH"
    assert res["trend"] == "uptrend"


def test_downtrend_labels_lh_ll():
    swings = [
        {"index": 1, "price": 20, "type": "high"},
        {"index": 2, "price": 16, "type": "low"},
        {"index": 3, "price": 18, "type": "high"},   # LH (18 < 20)
        {"index": 4, "price": 14, "type": "low"},    # LL (14 < 16)
    ]
    res = label_structure(swings)
    assert res["trend"] == "downtrend"


# ---- BOS / CHoCH -----------------------------------------------------------
def test_bos_and_choch():
    # Up structure, break above the swing high = BOS(bullish, since trend starts
    # None → first bullish break is CHoCH; a subsequent one in-trend is BOS).
    rows = [_row(c, c + 1, c - 1, c) for c in [10, 12, 9, 13, 8, 15]]
    swings = [
        {"index": 1, "price": 13, "type": "high"},
        {"index": 2, "price": 9, "type": "low"},
    ]
    events = detect_structure_events(rows, swings)
    assert events, "expected at least one structure event"
    # First break above 13 happens at the bar closing 15.
    assert any(e["kind"] in ("BOS", "CHoCH") and e["direction"] == "bullish" for e in events)


def test_choch_flips_trend_then_bos():
    # Bearish break first (CHoCH down), then another lower low (BOS down).
    rows = [_row(c, c + 0.5, c - 0.5, c) for c in [20, 18, 21, 15, 19, 12]]
    swings = [
        {"index": 1, "price": 18, "type": "low"},
        {"index": 2, "price": 21, "type": "high"},
        {"index": 3, "price": 15, "type": "low"},
    ]
    events = detect_structure_events(rows, swings)
    kinds = [(e["kind"], e["direction"]) for e in events]
    assert ("CHoCH", "bearish") in kinds
    assert ("BOS", "bearish") in kinds


# ---- Support / Resistance --------------------------------------------------
def test_sr_clusters_touches():
    swings = [
        {"index": 1, "price": 100.0, "type": "high"},
        {"index": 2, "price": 100.4, "type": "high"},   # within 0.8% → same level
        {"index": 3, "price": 100.2, "type": "high"},
        {"index": 4, "price": 80.0, "type": "low"},
    ]
    levels = detect_sr_levels(swings, tolerance=0.008, min_touches=2)
    assert len(levels) == 1
    lv = levels[0]
    assert lv["type"] == "resistance" and lv["touches"] == 3
    assert abs(lv["price"] - 100.2) < 0.3


# ---- Fair Value Gaps -------------------------------------------------------
def test_bullish_fvg_detected_and_fill():
    # candle0 high=10, candle2 low=12 → bullish gap [10,12]. A later candle dips
    # back to 11 → filled.
    rows = [
        _row(9, 10, 9, 10),      # 0
        _row(10, 13, 10, 13),    # 1 impulse
        _row(13, 14, 12, 13),    # 2 (low 12 > candle0 high 10 → gap)
        _row(13, 13, 11, 11),    # 3 trades into [10,12] → fills
    ]
    fvgs = detect_fvgs(rows)
    assert len(fvgs) == 1
    assert fvgs[0]["direction"] == "bullish"
    assert fvgs[0]["bottom"] == 10 and fvgs[0]["top"] == 12
    assert fvgs[0]["filled"] is True


def test_bearish_fvg_unfilled():
    rows = [
        _row(20, 20, 18, 18),    # 0 low=18
        _row(18, 18, 14, 14),    # 1 impulse down
        _row(14, 16, 14, 15),    # 2 high=16 < candle0 low 18 → bearish gap [16,18]
        _row(15, 15, 13, 13),    # 3 stays below → unfilled
    ]
    fvgs = detect_fvgs(rows)
    assert len(fvgs) == 1
    assert fvgs[0]["direction"] == "bearish" and fvgs[0]["filled"] is False


# ---- End-to-end ------------------------------------------------------------
def test_detect_structure_shape():
    highs = [10, 11, 12, 15, 12, 11, 9, 7, 9, 11, 13, 10, 8, 6, 9, 12, 14]
    rows = [_row(h, h + 0.4, h - 0.4, h) for h in highs]
    res = detect_structure(rows, strength=2)
    for key in ("trend", "swings", "events", "levels", "fvgs", "rowsScanned", "counts"):
        assert key in res, f"missing {key}"
    assert res["trend"] in ("uptrend", "downtrend", "range")
    assert res["rowsScanned"] == len(rows)


def test_empty_input():
    res = detect_structure([], strength=2)
    assert res["trend"] == "range" and res["swings"] == []


# ---- Breakout confirmation -------------------------------------------------
def _rowv(o, h, lo, c, v=1000.0, d="2024-01-01"):
    return {"date": d, "open": o, "high": h, "low": lo, "close": c, "volume": v}


_RES = [{"price": 100.0, "type": "resistance", "touches": 2, "strength": 2}]
_SUP = [{"price": 100.0, "type": "support", "touches": 2, "strength": 2}]


def test_breakout_bullish_confirmed():
    # Base below 100, then a strong up bar closes through it on high volume.
    rows = [_rowv(98, 98.5, 97.5, 98), _rowv(98, 99, 97.8, 98.5), _rowv(98.5, 99.2, 98.2, 99),
            _rowv(99, 99.3, 98.6, 99), _rowv(99, 103, 98.8, 102, 4000), _rowv(102, 102.5, 101, 102)]
    bks = detect_breakouts(rows, _RES, strength=2)
    hit = [b for b in bks if b["kind"] == "breakout"]
    assert hit and hit[0]["index"] == 4
    assert hit[0]["direction"] == "bullish" and hit[0]["liquidity"] == "bullish"
    assert hit[0]["confirmed"] is True


def test_breakout_bearish_confirmed():
    # Base above 100, then a strong down bar closes through support.
    rows = [_rowv(102, 102.5, 101.5, 102), _rowv(101.5, 102, 101, 101.5), _rowv(101, 101.5, 100.8, 101),
            _rowv(101, 101.2, 100.7, 101), _rowv(101, 101.2, 97, 98, 4000), _rowv(98, 99, 97.5, 98)]
    bks = detect_breakouts(rows, _SUP, strength=2)
    hit = [b for b in bks if b["kind"] == "breakout"]
    assert hit and hit[0]["direction"] == "bearish" and hit[0]["liquidity"] == "bearish"
    assert hit[0]["confirmed"] is True


def test_fakeout_resistance_is_bearish_liquidity():
    # Wick pierces 100 but the bar closes back below → liquidity grab (bearish).
    rows = [_rowv(98, 98.5, 97.5, 98), _rowv(98, 99, 97.8, 98.5), _rowv(98.5, 99.2, 98.2, 99),
            _rowv(99, 99.3, 98.6, 99), _rowv(99, 101, 98.5, 99.5), _rowv(99.5, 99.8, 98.5, 99)]
    bks = detect_breakouts(rows, _RES, strength=2)
    fk = [b for b in bks if b["kind"] == "fakeout"]
    assert fk and fk[0]["index"] == 4
    assert fk[0]["liquidity"] == "bearish" and fk[0]["confirmed"] is False


def test_detect_structure_includes_breakouts():
    highs = [10, 11, 12, 15, 12, 11, 9, 7, 9, 11, 13, 10, 8, 6, 9, 12, 14]
    rows = [{"date": "2024-01-01", "open": h, "high": h + 0.4, "low": h - 0.4, "close": h} for h in highs]
    res = detect_structure(rows, strength=2)
    assert "breakouts" in res and isinstance(res["breakouts"], list)
    assert "breakouts" in res["counts"] and "fakeouts" in res["counts"]


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in fns:
        fn()
        passed += 1
        print(f"  ✓ {fn.__name__}")
    print(f"\n{passed}/{len(fns)} price-action structure tests passed")
