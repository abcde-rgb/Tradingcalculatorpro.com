"""Unit tests for the geometric chart-pattern detector (G-40, Lote 5 §5).

Builds clean zig-zag OHLC series (flat open=high=low=close per bar, strictly
monotonic ramps between pivots) so `detect_swings` finds exactly the pivots
the test wants, then checks `detect_chart_patterns` against hand-computed
targets — the same discipline as `engine-check`: a number someone worked out
by hand, not just "the code agrees with itself".

Runs under pytest or directly (`python tests/test_chart_patterns_unit.py`).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from terminal.chart_patterns import detect_chart_patterns, get_chart_pattern_catalog, CHART_PATTERN_META  # noqa: E402


def _row(d, price):
    return {"date": d, "open": price, "high": price, "low": price, "close": price}


def _zigzag(pivots, bars_per_leg=5):
    """Ascending-date OHLC rows that ramp monotonically between `pivots`, each
    pivot landing on exactly one bar as a clean local extreme."""
    rows = []
    idx = 0
    for a, b in zip(pivots, pivots[1:]):
        for step in range(bars_per_leg):
            price = a + (b - a) * step / bars_per_leg
            rows.append(_row(f"d{idx}", price))
            idx += 1
    rows.append(_row(f"d{idx}", pivots[-1]))
    return rows


def _by_id(rows, pattern_id):
    return [d for d in detect_chart_patterns(rows) if d["pattern_id"] == pattern_id]


def _approx(value, tol=0.6):
    """Loose equality for a least-squares fit that is not pinned to an exact
    constant (the flat-top regression through 3 points at ~100 will not land
    on precisely 100.0)."""
    class _Approx:
        def __eq__(self, other):
            return abs(other - value) <= tol
    return _Approx()


def test_catalog_well_formed():
    assert len(CHART_PATTERN_META) == 13
    for pid, meta in CHART_PATTERN_META.items():
        assert meta["bias"] in ("bullish", "bearish", "ambiguous"), pid
        assert meta["family"] in ("peak", "trendline"), pid
    cat = get_chart_pattern_catalog()
    assert len(cat) == 13
    assert {c["pattern_id"] for c in cat} == set(CHART_PATTERN_META)


def test_head_and_shoulders_top_matches_worked_example():
    # docs/DETALLE_TECNICAS_IMPLEMENTACION.md §5.3: shoulders 110/111, head 120,
    # neckline 100 -> objetivo 100 - (120-100) = 80.
    rows = _zigzag([95, 110, 100, 120, 100, 111, 90])
    hits = _by_id(rows, "head-shoulders-top")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "bearish"
    assert h["breakoutLevel"] == 100.0
    assert h["target"] == 80.0
    assert h["bulkowski"] is None


def test_head_and_shoulders_bottom_is_the_mirror():
    rows = _zigzag([95, 80, 90, 60, 90, 79, 100])
    hits = _by_id(rows, "head-shoulders-bottom")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "bullish"
    assert h["breakoutLevel"] == 90.0
    assert h["target"] == 120.0  # 90 + (90 - 60)


def test_double_top_height_and_target():
    rows = _zigzag([90, 110, 102, 110, 85])
    hits = _by_id(rows, "double-top")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "bearish"
    assert h["breakoutLevel"] == 102.0
    assert h["target"] == 94.0  # valley 102 - height (110-102=8)


def test_double_bottom_height_and_target():
    rows = _zigzag([110, 90, 98, 90, 115])
    hits = _by_id(rows, "double-bottom")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "bullish"
    assert h["breakoutLevel"] == 98.0
    assert h["target"] == 106.0  # peak 98 + height (98-90=8)


def test_unequal_tops_are_not_a_double_top():
    # 10% apart is well outside the 2% "approximately equal" tolerance.
    rows = _zigzag([90, 110, 102, 121, 85])
    assert _by_id(rows, "double-top") == []


def test_triple_top_uses_the_lower_valley_as_support():
    rows = _zigzag([90, 110, 101, 111, 103, 110, 85])
    hits = _by_id(rows, "triple-top")
    assert len(hits) == 1
    h = hits[0]
    assert h["breakoutLevel"] == 101.0  # min(101, 103)
    height = (110 + 111 + 110) / 3 - 101
    assert h["target"] == round(101 - height, 6)


def test_ascending_triangle_flat_top_rising_lows_with_breakout():
    rows = _zigzag([85, 100, 90, 100, 93, 100, 96, 105])
    hits = _by_id(rows, "ascending-triangle")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "bullish"
    assert h["breakout"]["confirmed"] is True
    assert h["breakout"]["direction"] == "bullish"
    assert h["breakoutLevel"] == _approx(100.0)
    assert h["target"] > h["breakoutLevel"]


def test_rectangle_reports_both_targets_until_it_breaks():
    # Trailing 95 after the 3rd low: `detect_swings` never confirms a pivot
    # inside its last `strength` bars, so the 3rd low needs bars after it too.
    rows = _zigzag([85, 100, 90, 100, 90, 100, 90, 95])
    hits = _by_id(rows, "rectangle")
    assert len(hits) == 1
    h = hits[0]
    assert h["bias"] == "ambiguous"
    assert h["breakout"]["confirmed"] is False
    assert h["targetUp"] > h["breakoutLevelUp"]
    assert h["targetDown"] < h["breakoutLevelDown"]


if __name__ == "__main__":
    import pytest as _pytest
    raise SystemExit(_pytest.main([__file__, "-v"]))
