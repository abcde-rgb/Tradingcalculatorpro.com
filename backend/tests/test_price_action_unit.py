"""Unit tests for the price-action STRUCTURE detector (price_action.py).

Covers swing pivots, HH/HL/LH/LL labelling + trend, BOS/CHoCH events,
support/resistance clustering and Fair Value Gaps — all on synthetic OHLC.
Runs under pytest or directly (`python tests/test_price_action_unit.py`).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from terminal.price_action import (  # noqa: E402
    detect_swings, label_structure, detect_structure_events,
    detect_sr_levels, detect_fvgs, detect_structure, detect_breakouts,
    auto_tolerance, annotate_levels, annotate_events,
    cluster_repeated_events, scan_levels, apply_confluence, summarise_context,
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
# The rule under test, and the whole point of these cases:
#   a level ABOVE the current price is RESISTANCE
#   a level BELOW the current price is SUPPORT
# How the level was formed (swing highs vs lows) is its ORIGIN, not its role.

def test_sr_clusters_touches():
    swings = [
        {"index": 1, "price": 100.0, "type": "high"},
        {"index": 2, "price": 100.4, "type": "high"},   # within 0.8% → same level
        {"index": 3, "price": 100.2, "type": "high"},
        {"index": 4, "price": 80.0, "type": "low"},
    ]
    # Price below the cluster → it is overhead → resistance.
    levels = detect_sr_levels(swings, tolerance=0.008, min_touches=2, current_price=90.0)
    assert len(levels) == 1
    lv = levels[0]
    assert lv["type"] == "resistance" and lv["touches"] == 3
    assert abs(lv["price"] - 100.2) < 0.3
    assert lv["origin"] == "highs"
    assert lv["flipped"] is False


def test_a_level_above_price_is_resistance_even_if_formed_by_lows():
    """Formed by swing LOWS, but price is now underneath it → it is a ceiling."""
    swings = [
        {"index": 1, "price": 50.0, "type": "low"},
        {"index": 2, "price": 50.2, "type": "low"},
    ]
    lv = detect_sr_levels(swings, min_touches=2, current_price=45.0)[0]
    assert lv["type"] == "resistance"
    assert lv["origin"] == "lows"
    assert lv["flipped"] is True          # support that price fell through


def test_a_level_below_price_is_support_even_if_formed_by_highs():
    """The case the old code got backwards: broken resistance now holding price."""
    swings = [
        {"index": 1, "price": 50.0, "type": "high"},
        {"index": 2, "price": 50.2, "type": "high"},
    ]
    lv = detect_sr_levels(swings, min_touches=2, current_price=60.0)[0]
    assert lv["type"] == "support"
    assert lv["origin"] == "highs"
    assert lv["flipped"] is True          # polarity reversal


def test_distance_sign_matches_the_side():
    swings = [
        {"index": 1, "price": 110.0, "type": "high"},
        {"index": 2, "price": 110.1, "type": "high"},
        {"index": 3, "price": 90.0, "type": "low"},
        {"index": 4, "price": 90.1, "type": "low"},
    ]
    levels = detect_sr_levels(swings, min_touches=2, current_price=100.0)
    by_type = {l["type"]: l for l in levels}
    assert by_type["resistance"]["distancePct"] > 0   # above → positive
    assert by_type["support"]["distancePct"] < 0      # below → negative


def test_levels_come_back_nearest_first():
    """The level you are about to trade into matters more than a far one."""
    swings = [
        {"index": 1, "price": 200.0, "type": "high"}, {"index": 2, "price": 200.1, "type": "high"},
        {"index": 3, "price": 105.0, "type": "high"}, {"index": 4, "price": 105.1, "type": "high"},
        {"index": 5, "price": 95.0, "type": "low"},   {"index": 6, "price": 95.1, "type": "low"},
    ]
    levels = detect_sr_levels(swings, min_touches=2, current_price=100.0)
    distances = [abs(l["distancePct"]) for l in levels]
    assert distances == sorted(distances)


def test_without_a_price_nothing_is_called_support_or_resistance():
    """No price = no role. Guessing would be worse than saying 'pivot'."""
    swings = [
        {"index": 1, "price": 100.0, "type": "high"},
        {"index": 2, "price": 100.2, "type": "high"},
    ]
    lv = detect_sr_levels(swings, min_touches=2)[0]
    assert lv["type"] == "pivot"
    assert lv["distancePct"] is None
    assert lv["flipped"] is False


def test_structure_reports_nearest_level_on_each_side():
    rows = []
    # Oscillate so swings form on both sides, then settle in the middle.
    for lo, hi in [(90, 100), (92, 105), (88, 98), (93, 106), (89, 99), (94, 104), (95, 101)]:
        rows.append(_row(lo + 1, hi, lo, (lo + hi) / 2))
    res = detect_structure(rows, strength=1)
    price = res["currentPrice"]
    assert price is not None
    if res["nearestResistance"]:
        assert res["nearestResistance"]["price"] > price
    if res["nearestSupport"]:
        assert res["nearestSupport"]["price"] < price
    # Every level must agree with the rule, with no exceptions.
    for lv in res["levels"]:
        if lv["type"] == "resistance":
            assert lv["price"] > price
        elif lv["type"] == "support":
            assert lv["price"] < price


# ---- Adaptive tolerance ----------------------------------------------------
def test_auto_tolerance_widens_with_volatility():
    """A fixed 0.8% made no sense across timeframes: on 5m bars it merged every
    level into one blob. Tolerance now follows the series' own ATR."""
    calm = [_row(100, 100.2, 99.8, 100) for _ in range(30)]
    wild = [_row(100, 110, 90, 100) for _ in range(30)]
    assert auto_tolerance(wild) > auto_tolerance(calm)


def test_auto_tolerance_is_clamped():
    """A single absurd bar must not produce a nonsensical band."""
    insane = [_row(100, 10_000, 1, 100) for _ in range(30)]
    assert 0.0015 <= auto_tolerance(insane) <= 0.025
    flat = [_row(100, 100, 100, 100) for _ in range(30)]
    assert 0.0015 <= auto_tolerance(flat) <= 0.025


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


# ---- Annotated confirmation: LEVELS ----------------------------------------
# Band for a level at 100 with tolerance 1% is [99, 101]. All fixtures below
# are built around that so the expected visits are readable by eye.
def _visit_from_below(reject=True):
    """One approach into the band from underneath, then away again."""
    if reject:
        return [_row(98, 100.5, 97.8, 98.5), _row(98.5, 98.8, 98, 98.2)]
    return [_row(98, 102, 97.8, 102), _row(102, 102.5, 101.5, 102)]


def test_a_level_that_holds_every_visit_is_confirmed():
    rows = [_row(95, 96, 94, 95)]
    for _ in range(3):
        rows += _visit_from_below(reject=True)
    levels = [{"price": 100.0, "type": "resistance", "touches": 3, "flipped": False}]
    conf = annotate_levels(rows, levels, tolerance=0.01)[0]["confirmation"]
    assert conf["visits"] == 3
    assert conf["held"] == 3 and conf["broken"] == 0
    assert conf["holdRatePct"] == 100.0
    assert conf["confirmed"] is True
    assert "held" in conf["reasons"] and "multiTest" in conf["reasons"]


def test_a_level_price_walks_straight_through_is_not_confirmed():
    rows = [_row(95, 96, 94, 95)] + _visit_from_below(reject=False)
    levels = [{"price": 100.0, "type": "support", "touches": 2, "flipped": False}]
    conf = annotate_levels(rows, levels, tolerance=0.01)[0]["confirmation"]
    assert conf["broken"] == 1 and conf["held"] == 0
    assert conf["holdRatePct"] == 0.0
    assert conf["confirmed"] is False
    assert "weak" in conf["reasons"]


def test_consecutive_bars_inside_the_band_count_as_one_visit():
    """Ten bars chopping on the level is price EATING it, not ten confirmations."""
    rows = [_row(95, 96, 94, 95)]
    rows += [_row(100, 100.4, 99.6, 100) for _ in range(10)]   # chop inside
    rows += [_row(98, 98.5, 97.5, 98)]                          # leaves below
    conf = annotate_levels(rows, [{"price": 100.0, "type": "support", "touches": 4,
                                   "flipped": False}], tolerance=0.01)[0]["confirmation"]
    assert conf["visits"] == 1


def test_a_level_nobody_has_revisited_is_never_confirmed():
    rows = [_row(95, 96, 94, 95)] + _visit_from_below(reject=True) + \
           [_row(95, 96, 94, 95) for _ in range(5)]
    conf = annotate_levels(rows, [{"price": 100.0, "type": "resistance", "touches": 2,
                                   "flipped": False}], tolerance=0.01)[0]["confirmation"]
    assert conf["visits"] == 1
    assert conf["confirmed"] is False, "a single visit is the level's birth, not a test"


def test_an_old_untouched_level_is_flagged_stale():
    rows = [_row(95, 96, 94, 95)] + _visit_from_below(reject=True)
    rows += [_row(90, 91, 89, 90) for _ in range(40)]   # price left and never came back
    conf = annotate_levels(rows, [{"price": 100.0, "type": "resistance", "touches": 2,
                                   "flipped": False}], tolerance=0.01)[0]["confirmation"]
    assert "stale" in conf["reasons"]
    assert conf["barsSince"] > 30


def test_a_visit_still_open_on_the_last_bar_is_marked_in_play():
    rows = [_row(95, 96, 94, 95), _row(98, 100.2, 97.9, 100.0)]
    conf = annotate_levels(rows, [{"price": 100.0, "type": "pivot", "touches": 2,
                                   "flipped": False}], tolerance=0.01)[0]["confirmation"]
    assert "inPlay" in conf["reasons"]


def test_confirmation_survives_a_level_with_no_bars():
    conf = annotate_levels([], [{"price": 100.0, "type": "pivot"}], 0.01)[0]["confirmation"]
    assert conf["confirmed"] is False and conf["score"] == 0


# ---- Annotated confirmation: EVENTS ----------------------------------------
def test_a_break_with_follow_through_and_retest_is_confirmed():
    #                              break bar ↓          retest ↓
    rows = [_rowv(98, 99, 97, 98), _rowv(98, 103, 97.5, 102, 5000),
            _rowv(102, 103, 101, 102.5), _rowv(102, 103, 99.5, 101)]
    ev = [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    conf = annotate_events(rows, ev, atr=2.0)[0]["confirmation"]
    assert conf["followThrough"] is True
    assert conf["retested"] is True
    assert conf["confirmed"] is True
    assert {"closedThrough", "followThrough", "retest"} <= set(conf["reasons"])


def test_a_one_tick_cross_that_gives_it_all_back_is_not_confirmed():
    rows = [_rowv(99, 99.5, 98.5, 99), _rowv(99, 100.2, 98.9, 100.01, 900),
            _rowv(100, 100.1, 98, 98.5), _rowv(98.5, 99, 98, 98.5)]
    ev = [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    conf = annotate_events(rows, ev, atr=2.0)[0]["confirmation"]
    assert conf["followThrough"] is False
    assert conf["confirmed"] is False
    assert "closedThrough" not in conf["reasons"]


def test_close_through_plus_follow_through_is_the_minimum_standard():
    """A clear close beyond the level AND the next bar staying there is enough
    to call the break real, even with flat volume and no retest yet — that is
    the threshold, and it is deliberate."""
    # Deliberately an ordinary-sized bar on flat volume: only the two legs.
    rows = [_rowv(98, 99, 97, 98), _rowv(99.5, 101.1, 99.4, 101, 1000),
            _rowv(101, 101.4, 100.6, 101.2, 1000)]
    ev = [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    conf = annotate_events(rows, ev, atr=2.0)[0]["confirmation"]
    assert conf["reasons"] == ["closedThrough", "followThrough"]
    assert conf["score"] == 50
    assert conf["confirmed"] is True


def test_only_one_leg_of_evidence_is_not_enough():
    """Closed through but gave it straight back → not a break of structure."""
    rows = [_rowv(98, 99, 97, 98), _rowv(98, 101.2, 97.8, 101, 1000),
            _rowv(101, 101.2, 97, 97.5, 1000)]
    ev = [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    conf = annotate_events(rows, ev, atr=2.0)[0]["confirmation"]
    assert conf["followThrough"] is False
    assert conf["confirmed"] is False


def test_no_volume_feed_does_not_penalise_the_break():
    """Forex and indices come with volume 0. Absence of evidence is not
    evidence of absence — the score must not be dragged down by it."""
    with_vol = [_rowv(98, 99, 97, 98), _rowv(98, 103, 97.5, 102, 3000),
                _rowv(102, 103, 101, 102.5)]
    no_vol = [_rowv(98, 99, 97, 98, 0), _rowv(98, 103, 97.5, 102, 0),
              _rowv(102, 103, 101, 102.5, 0)]
    ev = lambda: [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    a = annotate_events(with_vol, ev(), atr=2.0)[0]["confirmation"]
    b = annotate_events(no_vol, ev(), atr=2.0)[0]["confirmation"]
    assert b["volExpansion"] is None
    assert b["score"] >= a["score"] - 10


def test_event_confirmation_is_bounded():
    rows = [_rowv(98, 99, 97, 98), _rowv(98, 130, 97.5, 129, 99999),
            _rowv(129, 130, 99, 128)]
    ev = [{"index": 1, "price": 100.0, "kind": "BOS", "direction": "bullish"}]
    conf = annotate_events(rows, ev, atr=1.0)[0]["confirmation"]
    assert 0 <= conf["score"] <= 100


# ---- The full read carries the evidence ------------------------------------
def test_detect_structure_annotates_levels_and_events():
    highs = [10, 11, 12, 15, 12, 11, 9, 7, 9, 11, 13, 10, 8, 6, 9, 12, 14, 11, 9, 12]
    rows = [_row(h, h + 0.4, h - 0.4, h) for h in highs]
    res = detect_structure(rows, strength=2)
    assert all("confirmation" in lv for lv in res["levels"])
    assert all("confirmation" in ev for ev in res["events"])
    assert "confirmedLevels" in res["counts"] and "confirmedEvents" in res["counts"]
    assert res["atr"] is not None and res["atrPct"] is not None


def test_empty_read_has_the_same_keys_as_a_full_one():
    """The client must never branch on 'did it return the short shape'."""
    full = detect_structure([_row(h, h + 0.4, h - 0.4, h) for h in range(10, 30)], strength=2)
    empty = detect_structure([], strength=2)
    assert set(empty.keys()) == set(full.keys())
    assert set(empty["counts"].keys()) == set(full["counts"].keys())


# ---- FVG fill detection (rewritten to one pass) ----------------------------
def test_a_bar_that_traverses_the_gap_entirely_counts_as_filled():
    """The old rescan required the bar's RANGE to overlap the gap, so a candle
    that blew straight past it left the imbalance marked 'open' forever."""
    rows = [
        _row(9, 10, 9, 10),        # 0
        _row(10, 13, 10, 13),      # 1 impulse
        _row(13, 14, 12, 13),      # 2 → bullish gap [10, 12]
        _row(12, 12.2, 5, 5.5),    # 3 collapses through and below the gap
    ]
    fvg = detect_fvgs(rows)[0]
    assert fvg["direction"] == "bullish"
    assert fvg["filled"] is True


def test_only_the_nearest_levels_get_the_expensive_analysis():
    """`max` on daily bars is 10 000+ candles and can produce 100+ levels. The
    evidence pass and the breakout scan are both O(levels × bars), so they run
    on the nearest handful only — but `counts.levels` still reports the total."""
    import random
    from terminal.price_action import MAX_ANALYSED_LEVELS
    random.seed(11)
    price, rows = 100.0, []
    for i in range(4000):
        price = max(1.0, price * (1 + random.gauss(0, 0.012)))
        rows.append({"date": f"b{i}", "open": price, "high": price * 1.004,
                     "low": price * 0.996, "close": price, "volume": 1000.0})
    res = detect_structure(rows, strength=2)
    assert res["levelsAnalysed"] <= MAX_ANALYSED_LEVELS
    assert len(res["levels"]) == res["levelsAnalysed"]
    assert res["counts"]["levels"] >= len(res["levels"])
    assert all("confirmation" in lv for lv in res["levels"])


def test_a_long_daily_series_stays_under_a_second():
    """Guard against reintroducing an O(levels × bars) blow-up: this exact
    series took 946 ms before the cap and 289 ms after."""
    import random
    import time as _t
    random.seed(11)
    price, rows = 100.0, []
    for i in range(10_000):
        price = max(1.0, price * (1 + random.gauss(0, 0.012)))
        rows.append({"date": f"b{i}", "open": price, "high": price * 1.004,
                     "low": price * 0.996, "close": price, "volume": 1000.0})
    t0 = _t.perf_counter()
    detect_structure(rows, strength=2)
    assert _t.perf_counter() - t0 < 1.0


def test_fvg_detection_is_linear_enough_for_intraday_series():
    """1 500 bars is a normal 5-minute month; the O(n²) rescan took seconds."""
    import time as _t
    rows = [_row(100 + i % 7, 101 + i % 7, 99 + i % 7, 100 + i % 7) for i in range(1500)]
    t0 = _t.perf_counter()
    detect_fvgs(rows)
    assert _t.perf_counter() - t0 < 1.0


# ---- Session gaps: an overnight jump is not an intraday imbalance ----------
def _bar(o, h, lo, c, ts):
    return {"date": f"t{ts}", "ts": ts, "open": o, "high": h, "low": lo, "close": c}


def _intraday_series_with_overnight_gap():
    """Five-minute bars: a flat morning, then the market closes and reopens
    17 hours later far above. The reopen satisfies the 3-candle FVG test."""
    t = 1_700_000_000
    rows = [_bar(100, 100.2, 99.8, 100, t + i * 300) for i in range(6)]
    night = t + 5 * 300 + 17 * 3600
    rows.append(_bar(110, 110.5, 109.8, 110, night))            # reopen, way above
    rows.append(_bar(110, 110.6, 109.9, 110.2, night + 300))
    rows.append(_bar(110.2, 110.8, 110, 110.5, night + 600))
    return rows


def test_an_overnight_reopen_is_flagged_as_a_session_gap():
    """In stocks the close→open jump passes the FVG test every single night.
    It is the market being shut, not an imbalance somebody left behind."""
    fvgs = detect_fvgs(_intraday_series_with_overnight_gap())
    gapped = [g for g in fvgs if g["sessionGap"]]
    assert gapped, "the overnight gap should have been detected and flagged"
    assert all(g["direction"] == "bullish" for g in gapped)


def test_session_gaps_do_not_inflate_the_open_imbalance_count():
    res = detect_structure(_intraday_series_with_overnight_gap(), strength=1)
    counts = res["counts"]
    assert counts["fvgSessionGap"] >= 1
    # Every gap in this series is the overnight one, so nothing counts as open.
    assert counts["fvgOpen"] == 0
    # Flagged, not deleted: the price gap is real and still listed.
    assert any(g["sessionGap"] for g in res["fvgs"])


def test_without_timestamps_nothing_is_claimed_about_sessions():
    """No `ts` = no way to know. The flag is False (unknown), never a guess."""
    rows = [
        _row(9, 10, 9, 10),
        _row(10, 13, 10, 13),
        _row(13, 14, 12, 13),
    ]
    assert detect_fvgs(rows)[0]["sessionGap"] is False


def test_a_weekend_on_daily_bars_is_not_a_session_gap():
    """On daily candles a Friday→Monday jump IS a gap traders trade. The
    session filter is intraday-only, or it would erase real daily gaps."""
    day = 86400
    t = 1_700_000_000
    rows = [
        _bar(9, 10, 9, 10, t),                 # Friday
        _bar(10, 13, 10, 13, t + 3 * day),     # Monday (weekend in between)
        _bar(13, 14, 12, 13, t + 4 * day),
    ]
    assert detect_fvgs(rows)[0]["sessionGap"] is False


# ---- Repeated breaks over the same level -----------------------------------
def test_three_breaks_of_the_same_level_are_numbered_not_multiplied():
    """Three crossings of one swing high are three real events, but they are
    not three independent pieces of evidence — they are one level not holding."""
    events = [
        {"index": 5, "price": 100.0, "kind": "BOS", "direction": "bullish"},
        {"index": 20, "price": 100.3, "kind": "BOS", "direction": "bullish"},
        {"index": 40, "price": 99.8, "kind": "BOS", "direction": "bullish"},
    ]
    cluster_repeated_events(events, tolerance=0.01)
    assert [e["repeat"] for e in events] == [1, 2, 3]
    assert {e["repeatOf"] for e in events} == {5}


def test_the_other_direction_is_a_different_group():
    events = [
        {"index": 5, "price": 100.0, "kind": "BOS", "direction": "bullish"},
        {"index": 9, "price": 100.0, "kind": "BOS", "direction": "bearish"},
    ]
    cluster_repeated_events(events, tolerance=0.01)
    assert [e["repeat"] for e in events] == [1, 1]


def test_a_far_away_level_is_not_the_same_level():
    events = [
        {"index": 5, "price": 100.0, "kind": "BOS", "direction": "bullish"},
        {"index": 9, "price": 140.0, "kind": "BOS", "direction": "bullish"},
    ]
    cluster_repeated_events(events, tolerance=0.01)
    assert [e["repeat"] for e in events] == [1, 1]


# ---- Levels are zones, and distance is also measured in ATR ----------------
def _series_with_a_level_at(price, n=40):
    """A series that keeps turning around `price` so a level forms there."""
    rows = []
    for i in range(n):
        if i % 4 == 0:
            rows.append(_row(price - 1, price, price - 2, price - 1))   # touches it
        else:
            rows.append(_row(price - 3, price - 2, price - 4, price - 3))
    return rows


def test_a_level_publishes_the_band_it_was_clustered_with():
    """A level is a band, not a line. Publishing it is what lets the chart draw
    a zone instead of implying a precision the method does not have."""
    swings = [
        {"index": 1, "price": 100.0, "type": "high"},
        {"index": 2, "price": 100.4, "type": "high"},
    ]
    lv = detect_sr_levels(swings, tolerance=0.01, current_price=90.0)[0]
    assert lv["zone"]["low"] < lv["price"] < lv["zone"]["high"]
    assert round(lv["zone"]["high"] / lv["price"], 4) == 1.01


def test_distance_is_also_reported_in_atr():
    """Percentages alone do not travel between instruments: 1% is nothing on
    one chart and three days of range on another."""
    res = detect_structure(_series_with_a_level_at(100.0), strength=1)
    assert res["levels"], "expected some levels on this series"
    assert all(isinstance(lv["distanceAtr"], float) for lv in res["levels"])


# ---- Context: where price sits between the two levels that matter ----------
def test_range_position_says_where_between_the_levels_price_is():
    ctx = summarise_context(110.0, {"price": 120.0}, {"price": 100.0}, atr=5.0)
    assert ctx["rangePositionPct"] == 50.0
    assert ctx["roomAbovePct"] == round(10 / 110 * 100, 2)
    assert ctx["roomAboveAtr"] == 2.0 and ctx["roomBelowAtr"] == 2.0


def test_missing_room_is_none_not_zero():
    """With no level above, the room above is undefined. Printing 0% would read
    as 'resistance right here' — the opposite of the truth."""
    ctx = summarise_context(110.0, None, {"price": 100.0}, atr=5.0)
    assert ctx["roomAbovePct"] is None and ctx["roomAboveAtr"] is None
    assert ctx["rangePositionPct"] is None
    assert ctx["roomBelowPct"] is not None


def test_context_travels_in_the_full_read():
    highs = [10, 11, 12, 15, 12, 11, 9, 7, 9, 11, 13, 10, 8, 6, 9, 12, 14, 11, 9, 12]
    rows = [_row(h, h + 0.4, h - 0.4, h) for h in highs]
    res = detect_structure(rows, strength=2)
    assert set(res["context"]) == {
        "roomAbovePct", "roomBelowPct", "roomAboveAtr", "roomBelowAtr",
        "rangeWidthPct", "rangePositionPct",
    }


# ---- Multi-timeframe confluence --------------------------------------------
def test_a_level_the_higher_timeframe_also_has_is_marked():
    rows = _series_with_a_level_at(100.0)
    res = detect_structure(rows, strength=1)
    htf_levels = [{"price": res["levels"][0]["price"], "touches": 7, "type": "resistance"}]
    apply_confluence(res, htf_levels, "1d")
    assert res["levels"][0]["confluence"]["interval"] == "1d"
    assert res["confluence"]["checked"] is True
    assert res["counts"]["confluent"] == 1


def test_a_higher_timeframe_level_somewhere_else_marks_nothing():
    rows = _series_with_a_level_at(100.0)
    res = detect_structure(rows, strength=1)
    apply_confluence(res, [{"price": 500.0, "touches": 9, "type": "resistance"}], "1d")
    assert all(lv["confluence"] is None for lv in res["levels"])
    assert res["confluence"]["checked"] is True
    assert res["counts"]["confluent"] == 0


def test_unchecked_confluence_is_unknown_not_zero():
    """No higher-timeframe read is NOT 'checked and found nothing'. Zero would
    say the bigger chart disagrees; the truth is that nobody asked it."""
    rows = _series_with_a_level_at(100.0)
    res = detect_structure(rows, strength=1)
    assert res["confluence"]["checked"] is False
    assert res["counts"]["confluent"] is None


def test_confluence_does_not_touch_the_confirmation_score():
    """The score measures how the level behaved in the bars scanned. A match on
    another chart is a different fact and gets its own flag."""
    rows = _series_with_a_level_at(100.0)
    res = detect_structure(rows, strength=1)
    before = [lv["confirmation"]["score"] for lv in res["levels"]]
    apply_confluence(res, [{"price": lv["price"], "touches": 5, "type": lv["type"]}
                           for lv in res["levels"]], "1d")
    assert [lv["confirmation"]["score"] for lv in res["levels"]] == before


def test_the_nearest_levels_carry_the_confluence_mark_too():
    """`nearestResistance` / `nearestSupport` are the same objects as in
    `levels`; if they were copies the badge would vanish from the headline."""
    rows = _series_with_a_level_at(100.0)
    res = detect_structure(rows, strength=1)
    target = res["nearestResistance"] or res["nearestSupport"]
    if target is None:
        return
    apply_confluence(res, [{"price": target["price"], "touches": 4, "type": target["type"]}], "1wk")
    assert target["confluence"] is not None


def test_scan_levels_is_the_cheap_read_without_evidence():
    """The higher-timeframe pass only needs WHERE the levels are; the per-bar
    evidence is the expensive half and is not computed for it."""
    rows = _series_with_a_level_at(100.0)
    levels = scan_levels(rows, strength=1)
    assert levels, "expected levels on this series"
    assert all("confirmation" not in lv for lv in levels)
    assert scan_levels([], strength=1) == []


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    passed = 0
    for fn in fns:
        fn()
        passed += 1
        print(f"  ✓ {fn.__name__}")
    print(f"\n{passed}/{len(fns)} price-action structure tests passed")
