"""
chart_patterns.py — geometric classical chart-pattern detection over swing
pivots. Complements candle_patterns.py (single/multi-candle shapes) and
price_action.py (market structure, BOS/CHoCH, S/R, FVG): this file recognises
the CLASSICAL CHARTIST patterns — head & shoulders, double/triple tops and
bottoms, and the triangle/wedge/rectangle/broadening family — the ones the
Academia has illustrated as static SVGs (42 of them) but that nothing, until
now, has looked for on a real chart. Design: docs/DETALLE_TECNICAS_IMPLEMENTACION.md
Lote 5 §5. Gap tracked as G-40 in docs/ESTADO_PROYECTO.md.

Pure, deterministic, no I/O — same contract as price_action.py. Reuses
`detect_swings` from that module instead of re-deriving pivots: this file
detects SHAPES over swings someone else already found.

Two families need two different detection strategies, so they get two
different code paths instead of forcing one algorithm on both:

  · PEAK patterns (H&S, double/triple top/bottom) are a fixed SEQUENCE of
    3 or 5 alternating swings with specific relative heights. They are
    discrete, completed events, so the whole swing history is walked once
    and every match is returned — like candle_patterns.detect_all_patterns.
  · TRENDLINE patterns (rectangle, triangle family, wedges, broadening) are
    a fitted shape over the MOST RECENT swings — an ongoing structure, not a
    one-bar event. Only the current shape is reported, the same way
    price_action.label_structure reports the current trend rather than a
    log of every past one.

What this file deliberately does NOT do, and why that's not an oversight:
  · Bulkowski's published failure-rate / average-move / throwback stats
    (Lote 5 §5.4) are NOT hard-coded here. `candle_patterns.py` ships
    approximate figures for candlesticks with a citation to Bulkowski's own
    book; reproducing that from memory for 13 chart patterns without the
    actual tables in front of us would be exactly the "invented number
    without a label" the project's numeric-honesty rule forbids — a
    half-remembered textbook figure is still an invented one once it is
    printed as fact next to a price. `bulkowski` comes back `None` on every
    detection until someone transcribes the real tables against a citation.
  · Cup & Handle, Rounding Bottom, flags/pennants, High Tight Flag, Diamond,
    Bump-and-Run, V-spike, Scallop and Darvas Box are NOT implemented yet.
    Their geometry is not a swing-trendline fit (parabolic curves, %-move
    flagpoles, volume-confirmed breakouts), and forcing them through this
    file's two shapes would produce a confident-looking WRONG number, which
    is worse than not detecting them at all. Same G-40 follow-up as above.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from terminal.price_action import detect_swings

Swing = Dict[str, Any]

# "≈ equal" for shoulders / tops / bottoms / valleys. Relative to price, like
# every other tolerance in this codebase (detect_sr_levels uses 0.008 for
# level clustering); peaks need a bit more slack because two rally highs are
# never pixel-identical even when a chartist would call them "a double top".
# The worked example in the design doc itself uses shoulders of 110 and 111
# (~0.9% apart), which is the real-world scale this has to tolerate.
_EQUAL_TOL_PCT = 0.02

# A fitted trendline counts as "flat" below this relative change over its own
# span; above it, the sign of the change decides rising/falling. Relative to
# price, not a fixed number of ticks — for the same reason `_trend_before` in
# candle_patterns.py is scale-free: the same shape has to mean the same thing
# on gold at $2,600 and on a $0.02 microcap.
_FLAT_PCT = 0.03

# The head (or trough, for the inverse) must clear the shoulders by at least
# this much, or "shoulders" is just noise around one level.
_MIN_HEAD_PROMINENCE_PCT = 0.005

# How many of the most recent swings feed the trendline family. Wide enough
# to fit a line through 3+ points of each type, narrow enough to describe the
# structure a trader would point at today — not a shape half of which rolled
# off the left edge of the chart.
_TRENDLINE_LOOKBACK_SWINGS = 10


def _ref(*vals: float) -> float:
    return max((abs(v) for v in vals), default=0.0) or 1e-9


def _approx_equal(a: float, b: float) -> bool:
    return abs(a - b) <= _EQUAL_TOL_PCT * _ref(a, b)


def _fit_score(*vals: float) -> float:
    """0-1 geometric goodness-of-fit (how close these should-be-equal prices
    actually are) — NOT a statistical confidence that the pattern will play
    out. Keeping the two ideas apart matters: one is measured from the chart
    in front of us, the other would have to come from a historical sample."""
    if len(vals) < 2:
        return 1.0
    deviation = (max(vals) - min(vals)) / _ref(*vals)
    return round(max(0.0, 1.0 - deviation / _EQUAL_TOL_PCT), 3)


def _point(sw: Swing, role: str) -> Dict[str, Any]:
    return {"index": sw["index"], "date": sw.get("date"), "price": sw["price"], "role": role}


def _linreg(pts: List[Swing]) -> Tuple[float, float]:
    """Least-squares line through (index, price)."""
    n = len(pts)
    xs = [float(p["index"]) for p in pts]
    ys = [float(p["price"]) for p in pts]
    mx, my = sum(xs) / n, sum(ys) / n
    den = sum((x - mx) ** 2 for x in xs)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0
    return slope, my - slope * mx


def _line_at(line: Tuple[float, float], x: float) -> float:
    slope, intercept = line
    return slope * x + intercept


def _slope_kind(line: Tuple[float, float], x0: int, x1: int) -> str:
    if x1 <= x0:
        return "flat"
    y0, y1 = _line_at(line, x0), _line_at(line, x1)
    pct = (y1 - y0) / _ref(y0, y1)
    if abs(pct) < _FLAT_PCT:
        return "flat"
    return "rising" if pct > 0 else "falling"


# ---------------------------------------------------------------------------
# Peak family — head & shoulders, double top/bottom, triple top/bottom
# ---------------------------------------------------------------------------
def _window_types(window: List[Swing]) -> str:
    return "".join("H" if s["type"] == "high" else "L" for s in window)


def _head_and_shoulders(swings: List[Swing]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for i in range(len(swings) - 4):
        w = swings[i:i + 5]
        types = _window_types(w)
        if types == "HLHLH":
            invert = False
        elif types == "LHLHL":
            invert = True
        else:
            continue
        ls, v1, head, v2, rs = (s["price"] for s in w)
        higher = (head > ls and head > rs) if not invert else (head < ls and head < rs)
        if not higher:
            continue
        prominence = abs(head - (max(ls, rs) if not invert else min(ls, rs))) / _ref(head)
        if prominence < _MIN_HEAD_PROMINENCE_PCT:
            continue
        if not (_approx_equal(ls, rs) and _approx_equal(v1, v2)):
            continue
        neckline = (v1 + v2) / 2
        if not invert:
            target, pattern_id, bias = neckline - (head - neckline), "head-shoulders-top", "bearish"
            mid_role = "valley"
        else:
            target, pattern_id, bias = neckline + (neckline - head), "head-shoulders-bottom", "bullish"
            mid_role = "peak"
        out.append({
            "pattern_id": pattern_id, "bias": bias,
            "points": [
                _point(w[0], "left-shoulder"), _point(w[1], f"{mid_role}-1"),
                _point(w[2], "head"), _point(w[3], f"{mid_role}-2"),
                _point(w[4], "right-shoulder"),
            ],
            "lines": {"neckline": {"a": _point(w[1], "neckline"), "b": _point(w[3], "neckline"),
                                    "level": round(neckline, 6)}},
            "target": round(target, 6), "breakoutLevel": round(neckline, 6),
            "fit": round((_fit_score(ls, rs) + _fit_score(v1, v2)) / 2, 3),
            "startIndex": w[0]["index"], "endIndex": w[4]["index"],
            "startDate": w[0].get("date"), "endDate": w[4].get("date"),
            "bulkowski": None,
        })
    return out


def _double(swings: List[Swing]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for i in range(len(swings) - 2):
        w = swings[i:i + 3]
        types = _window_types(w)
        if types not in ("HLH", "LHL"):
            continue
        e1, mid, e2 = (s["price"] for s in w)
        if not _approx_equal(e1, e2):
            continue
        if types == "HLH":
            height = (e1 + e2) / 2 - mid
            if height <= 0:
                continue
            pattern_id, bias, target, mid_role = "double-top", "bearish", mid - height, "valley"
        else:
            height = mid - (e1 + e2) / 2
            if height <= 0:
                continue
            pattern_id, bias, target, mid_role = "double-bottom", "bullish", mid + height, "peak"
        out.append({
            "pattern_id": pattern_id, "bias": bias,
            "points": [_point(w[0], "extreme-1"), _point(w[1], mid_role), _point(w[2], "extreme-2")],
            "lines": {"breakout": {"level": round(mid, 6)}},
            "target": round(target, 6), "breakoutLevel": round(mid, 6),
            "fit": _fit_score(e1, e2),
            "startIndex": w[0]["index"], "endIndex": w[2]["index"],
            "startDate": w[0].get("date"), "endDate": w[2].get("date"),
            "bulkowski": None,
        })
    return out


def _triple(swings: List[Swing]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for i in range(len(swings) - 4):
        w = swings[i:i + 5]
        types = _window_types(w)
        if types == "HLHLH":
            extremes = [w[0]["price"], w[2]["price"], w[4]["price"]]
            others = [w[1]["price"], w[3]["price"]]
            if not (_approx_equal(extremes[0], extremes[1]) and _approx_equal(extremes[1], extremes[2])):
                continue
            level = min(others)
            height = sum(extremes) / 3 - level
            if height <= 0:
                continue
            pattern_id, bias, target = "triple-top", "bearish", level - height
        elif types == "LHLHL":
            extremes = [w[0]["price"], w[2]["price"], w[4]["price"]]
            others = [w[1]["price"], w[3]["price"]]
            if not (_approx_equal(extremes[0], extremes[1]) and _approx_equal(extremes[1], extremes[2])):
                continue
            level = max(others)
            height = level - sum(extremes) / 3
            if height <= 0:
                continue
            pattern_id, bias, target = "triple-bottom", "bullish", level + height
        else:
            continue
        out.append({
            "pattern_id": pattern_id, "bias": bias,
            "points": [_point(s, f"p{j}") for j, s in enumerate(w)],
            "lines": {"breakout": {"level": round(level, 6)}},
            "target": round(target, 6), "breakoutLevel": round(level, 6),
            "fit": _fit_score(*extremes),
            "startIndex": w[0]["index"], "endIndex": w[4]["index"],
            "startDate": w[0].get("date"), "endDate": w[4].get("date"),
            "bulkowski": None,
        })
    return out


# ---------------------------------------------------------------------------
# Trendline family — rectangle, triangle x3, wedge x2, broadening
# ---------------------------------------------------------------------------
def _trendline_pattern(swings: List[Swing], rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    recent = swings[-_TRENDLINE_LOOKBACK_SWINGS:]
    highs = [s for s in recent if s["type"] == "high"]
    lows = [s for s in recent if s["type"] == "low"]
    if len(highs) < 3 or len(lows) < 3:
        return None

    line_hi, line_lo = _linreg(highs), _linreg(lows)
    x0 = min(highs[0]["index"], lows[0]["index"])
    x1 = max(highs[-1]["index"], lows[-1]["index"])
    kind_hi, kind_lo = _slope_kind(line_hi, x0, x1), _slope_kind(line_lo, x0, x1)

    gap_start = _line_at(line_hi, x0) - _line_at(line_lo, x0)
    gap_end = _line_at(line_hi, x1) - _line_at(line_lo, x1)
    if gap_start <= 0 or gap_end <= 0:
        return None  # the two lines already cross inside the window — not a clean channel

    converging = gap_end < gap_start
    if kind_hi == "flat" and kind_lo == "flat":
        pattern_id, bias = "rectangle", "ambiguous"
    elif kind_hi == "flat" and kind_lo == "rising":
        pattern_id, bias = "ascending-triangle", "bullish"
    elif kind_hi == "falling" and kind_lo == "flat":
        pattern_id, bias = "descending-triangle", "bearish"
    elif kind_hi == "falling" and kind_lo == "rising":
        pattern_id, bias = "symmetric-triangle", "ambiguous"
    elif kind_hi == "rising" and kind_lo == "falling":
        pattern_id, bias = "broadening", "ambiguous"
    elif kind_hi == "rising" and kind_lo == "rising" and converging:
        pattern_id, bias = "rising-wedge", "bearish"
    elif kind_hi == "falling" and kind_lo == "falling" and converging:
        pattern_id, bias = "falling-wedge", "bullish"
    else:
        return None  # e.g. a plain parallel channel — not in the classical catalogue

    last_i = len(rows) - 1
    last_close = rows[-1]["close"]
    res_at_last, sup_at_last = _line_at(line_hi, last_i), _line_at(line_lo, last_i)
    broke_up, broke_down = last_close > res_at_last, last_close < sup_at_last
    breakout = {"confirmed": bool(broke_up or broke_down),
                "direction": "bullish" if broke_up else ("bearish" if broke_down else None),
                "index": last_i, "date": rows[-1].get("date")}

    result: Dict[str, Any] = {
        "pattern_id": pattern_id, "bias": bias,
        "points": [_point(s, "high") for s in highs] + [_point(s, "low") for s in lows],
        "lines": {
            "upper": {"slope": line_hi[0], "intercept": line_hi[1], "kind": kind_hi},
            "lower": {"slope": line_lo[0], "intercept": line_lo[1], "kind": kind_lo},
        },
        "breakout": breakout,
        "fit": None,  # a line fit through 3+ points has no independent second measure here
        "startIndex": x0, "endIndex": x1,
        "startDate": swings[0].get("date"), "endDate": rows[-1].get("date"),
        "bulkowski": None,
    }

    height_start = gap_start  # widest part of the shape — every directional formula below uses it
    if pattern_id == "ascending-triangle":
        result["target"] = round(res_at_last + height_start, 6)
        result["breakoutLevel"] = round(res_at_last, 6)
    elif pattern_id == "descending-triangle":
        result["target"] = round(sup_at_last - height_start, 6)
        result["breakoutLevel"] = round(sup_at_last, 6)
    elif pattern_id == "rising-wedge":
        # "Retorno al inicio de la cuña" (§5.2): the level the lower line was
        # at when the wedge began.
        result["target"] = round(_line_at(line_lo, x0), 6)
        result["breakoutLevel"] = round(sup_at_last, 6)
    elif pattern_id == "falling-wedge":
        result["target"] = round(_line_at(line_hi, x0), 6)
        result["breakoutLevel"] = round(res_at_last, 6)
    else:  # rectangle, symmetric-triangle, broadening — direction unknown until it breaks
        height_at_break = gap_end
        result["targetUp"] = round(res_at_last + height_at_break, 6)
        result["targetDown"] = round(sup_at_last - height_at_break, 6)
        result["breakoutLevelUp"] = round(res_at_last, 6)
        result["breakoutLevelDown"] = round(sup_at_last, 6)

    return result


def detect_chart_patterns(rows: List[Dict[str, Any]], strength: int = 2) -> List[Dict[str, Any]]:
    """Classical chart patterns over real OHLC rows (ascending by date). See
    the module docstring for the 13 implemented and the ones left for later."""
    swings = detect_swings(rows, strength=strength)
    if len(swings) < 3:
        return []
    out: List[Dict[str, Any]] = []
    out.extend(_head_and_shoulders(swings))
    out.extend(_double(swings))
    out.extend(_triple(swings))
    trendline = _trendline_pattern(swings, rows)
    if trendline:
        out.append(trendline)
    out.sort(key=lambda d: d["startIndex"])
    return out


# type/family only — no rate/rank here, see module docstring on Bulkowski stats.
CHART_PATTERN_META: Dict[str, Dict[str, Any]] = {
    "head-shoulders-top":    {"bias": "bearish",   "family": "peak"},
    "head-shoulders-bottom": {"bias": "bullish",   "family": "peak"},
    "double-top":            {"bias": "bearish",   "family": "peak"},
    "double-bottom":         {"bias": "bullish",   "family": "peak"},
    "triple-top":            {"bias": "bearish",   "family": "peak"},
    "triple-bottom":         {"bias": "bullish",   "family": "peak"},
    "rectangle":             {"bias": "ambiguous", "family": "trendline"},
    "ascending-triangle":    {"bias": "bullish",   "family": "trendline"},
    "descending-triangle":   {"bias": "bearish",   "family": "trendline"},
    "symmetric-triangle":    {"bias": "ambiguous", "family": "trendline"},
    "rising-wedge":          {"bias": "bearish",   "family": "trendline"},
    "falling-wedge":         {"bias": "bullish",   "family": "trendline"},
    "broadening":            {"bias": "ambiguous", "family": "trendline"},
}


def get_chart_pattern_catalog() -> List[Dict[str, Any]]:
    """The 13 patterns this file can detect today, of the ~19-20 in the
    Academia's illustrations (see module docstring for what's missing and
    why). Names are localized on the frontend from pattern_id."""
    return [{"pattern_id": pid, **meta} for pid, meta in CHART_PATTERN_META.items()]
