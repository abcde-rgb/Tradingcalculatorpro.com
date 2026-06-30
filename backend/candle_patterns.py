"""
Pure-math candle pattern detection. No ML, no AI — just the canonical
conditions from the standard Japanese candlestick literature.

Each detector receives normalised OHLC rows (list of dicts ordered by
date ascending) and returns the indices/metadata where the pattern fires.

Threshold tuning: kept slightly relaxed for educational visibility while
still avoiding obvious false positives.
"""
from __future__ import annotations

from typing import Any, Dict, List


def _candle_metrics(row: Dict[str, float]) -> Dict[str, float]:
    o, h, lo, c = row["open"], row["high"], row["low"], row["close"]
    body = abs(c - o)
    rng = max(h - lo, 1e-9)             # avoid div by zero
    upper = h - max(o, c)
    lower = min(o, c) - lo
    return {
        "body": body, "range": rng,
        "upper": upper, "lower": lower,
        "is_bull": c > o, "is_bear": c < o,
        "body_pct": body / rng,
    }


# ---------- Single-candle ----------
def _is_doji(m: Dict[str, float]) -> bool:
    return m["body_pct"] <= 0.07


def _is_dragonfly_doji(m: Dict[str, float]) -> bool:
    return m["body_pct"] <= 0.07 and m["upper"] <= 0.05 * m["range"] and m["lower"] >= 0.6 * m["range"]


def _is_gravestone_doji(m: Dict[str, float]) -> bool:
    return m["body_pct"] <= 0.07 and m["lower"] <= 0.05 * m["range"] and m["upper"] >= 0.6 * m["range"]


def _is_hammer(m: Dict[str, float]) -> bool:
    return (
        m["body"] > 0
        and m["lower"] >= 1.8 * m["body"]
        and m["upper"] <= 0.4 * m["body"]
        and m["body_pct"] >= 0.05  # avoid mis-classifying dojis
    )


def _is_shooting_star(m: Dict[str, float]) -> bool:
    return (
        m["body"] > 0
        and m["upper"] >= 1.8 * m["body"]
        and m["lower"] <= 0.4 * m["body"]
        and m["body_pct"] >= 0.05
    )


def _is_marubozu(m: Dict[str, float]) -> bool:
    return (
        m["body_pct"] >= 0.85
        and m["upper"] <= 0.05 * m["range"]
        and m["lower"] <= 0.05 * m["range"]
    )


def _is_spinning_top(m: Dict[str, float]) -> bool:
    return (
        0.10 < m["body_pct"] < 0.35
        and m["upper"] > m["body"]
        and m["lower"] > m["body"]
    )


# ---------- Two-candle ----------
def _is_bullish_engulfing(prev: Dict[str, float], curr: Dict[str, float]) -> bool:
    return (
        prev["close"] < prev["open"]                  # prev bearish
        and curr["close"] > curr["open"]              # curr bullish
        and curr["open"] <= prev["close"]
        and curr["close"] >= prev["open"]
        and abs(curr["close"] - curr["open"]) > abs(prev["close"] - prev["open"])
    )


def _is_bearish_engulfing(prev: Dict[str, float], curr: Dict[str, float]) -> bool:
    return (
        prev["close"] > prev["open"]                  # prev bullish
        and curr["close"] < curr["open"]              # curr bearish
        and curr["open"] >= prev["close"]
        and curr["close"] <= prev["open"]
        and abs(curr["close"] - curr["open"]) > abs(prev["close"] - prev["open"])
    )


# ---------- Three-candle ----------
def _is_morning_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    body1 = abs(c1["close"] - c1["open"])
    body2 = abs(c2["close"] - c2["open"])
    midpoint_1 = (c1["open"] + c1["close"]) / 2
    return (
        c1["close"] < c1["open"]                       # 1st bearish
        and body2 < 0.5 * body1                        # 2nd small
        and max(c2["open"], c2["close"]) < c1["close"] # 2nd below 1st body
        and c3["close"] > c3["open"]                   # 3rd bullish
        and c3["close"] > midpoint_1                   # closes above 1st midpoint
    )


def _is_evening_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    body1 = abs(c1["close"] - c1["open"])
    body2 = abs(c2["close"] - c2["open"])
    midpoint_1 = (c1["open"] + c1["close"]) / 2
    return (
        c1["close"] > c1["open"]
        and body2 < 0.5 * body1
        and min(c2["open"], c2["close"]) > c1["close"]
        and c3["close"] < c3["open"]
        and c3["close"] < midpoint_1
    )


def _is_three_white_soldiers(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (
        c1["close"] > c1["open"]
        and c2["close"] > c2["open"]
        and c3["close"] > c3["open"]
        and c2["close"] > c1["close"]
        and c3["close"] > c2["close"]
        and c2["open"] > c1["open"] and c2["open"] < c1["close"]
        and c3["open"] > c2["open"] and c3["open"] < c2["close"]
    )


def _is_three_black_crows(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (
        c1["close"] < c1["open"]
        and c2["close"] < c2["open"]
        and c3["close"] < c3["open"]
        and c2["close"] < c1["close"]
        and c3["close"] < c2["close"]
        and c2["open"] < c1["open"] and c2["open"] > c1["close"]
        and c3["open"] < c2["open"] and c3["open"] > c2["close"]
    )


# ---------- Extra single-candle shapes ----------
def _is_long_legged_doji(m: Dict[str, float]) -> bool:
    return _is_doji(m) and m["upper"] >= 0.35 * m["range"] and m["lower"] >= 0.35 * m["range"]


def _is_high_wave(m: Dict[str, float]) -> bool:
    # Small (but non-doji) body with very long wicks on BOTH sides → extreme indecision.
    return (
        0.07 < m["body_pct"] <= 0.25
        and m["upper"] >= 0.30 * m["range"]
        and m["lower"] >= 0.30 * m["range"]
    )


def _trend_before(rows: List[Dict[str, float]], i: int, lookback: int = 5) -> str:
    """Coarse trend over the candles preceding i: 'up' | 'down' | 'flat'.

    Used to disambiguate same-shaped candles (hammer vs hanging-man,
    shooting-star vs inverted-hammer) by the context they appear in.
    """
    j = i - 1
    k = max(0, i - lookback)
    if j <= k:
        return "flat"
    then = rows[k]["close"]
    if then <= 0:
        return "flat"
    chg = (rows[j]["close"] - then) / then
    if chg >= 0.01:
        return "up"
    if chg <= -0.01:
        return "down"
    return "flat"


# ---------- Extra two-candle ----------
def _is_bullish_harami(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] < prev["open"]                                 # prev bearish (top=open)
        and curr["close"] > curr["open"]                             # curr bullish
        and max(curr["open"], curr["close"]) <= prev["open"]
        and min(curr["open"], curr["close"]) >= prev["close"]
        and abs(curr["close"] - curr["open"]) < abs(prev["close"] - prev["open"])
    )


def _is_bearish_harami(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] > prev["open"]                                 # prev bullish (top=close)
        and curr["close"] < curr["open"]                             # curr bearish
        and max(curr["open"], curr["close"]) <= prev["close"]
        and min(curr["open"], curr["close"]) >= prev["open"]
        and abs(curr["close"] - curr["open"]) < abs(prev["close"] - prev["open"])
    )


def _is_piercing_line(prev: Dict, curr: Dict) -> bool:
    if not (prev["close"] < prev["open"] and curr["close"] > curr["open"]):
        return False
    mid = (prev["open"] + prev["close"]) / 2
    return curr["open"] < prev["close"] and mid < curr["close"] < prev["open"]


def _is_dark_cloud_cover(prev: Dict, curr: Dict) -> bool:
    if not (prev["close"] > prev["open"] and curr["close"] < curr["open"]):
        return False
    mid = (prev["open"] + prev["close"]) / 2
    return curr["open"] > prev["close"] and prev["open"] < curr["close"] < mid


def _approx_equal(a: float, b: float, ref: float) -> bool:
    return abs(a - b) <= 0.0015 * max(abs(ref), 1e-9)


def _is_tweezer_bottom(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] < prev["open"]                                 # 1st bearish
        and curr["close"] > curr["open"]                             # 2nd bullish
        and _approx_equal(prev["low"], curr["low"], prev["low"])
    )


def _is_tweezer_top(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] > prev["open"]                                 # 1st bullish
        and curr["close"] < curr["open"]                             # 2nd bearish
        and _approx_equal(prev["high"], curr["high"], prev["high"])
    )


def _is_bullish_kicker(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] < prev["open"]                                 # prev bearish
        and curr["close"] > curr["open"]                             # curr bullish
        and curr["open"] > prev["open"]                              # gaps up over prev open
    )


def _is_bearish_kicker(prev: Dict, curr: Dict) -> bool:
    return (
        prev["close"] > prev["open"]                                 # prev bullish
        and curr["close"] < curr["open"]                             # curr bearish
        and curr["open"] < prev["open"]                              # gaps down under prev open
    )


# ---------- Extra three-candle ----------
def _is_morning_doji_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    mid1 = (c1["open"] + c1["close"]) / 2
    return (
        c1["close"] < c1["open"]
        and _is_doji(_candle_metrics(c2))
        and max(c2["open"], c2["close"]) < c1["close"]
        and c3["close"] > c3["open"]
        and c3["close"] > mid1
    )


def _is_evening_doji_star(c1: Dict, c2: Dict, c3: Dict) -> bool:
    mid1 = (c1["open"] + c1["close"]) / 2
    return (
        c1["close"] > c1["open"]
        and _is_doji(_candle_metrics(c2))
        and min(c2["open"], c2["close"]) > c1["close"]
        and c3["close"] < c3["open"]
        and c3["close"] < mid1
    )


def _is_three_inside_up(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (
        _is_bullish_harami(c1, c2)
        and c3["close"] > c3["open"]
        and c3["close"] > c1["open"]                                 # confirmation above c1 body top
    )


def _is_three_inside_down(c1: Dict, c2: Dict, c3: Dict) -> bool:
    return (
        _is_bearish_harami(c1, c2)
        and c3["close"] < c3["open"]
        and c3["close"] < c1["open"]
    )


# ---------- Pattern catalogue ----------
# type: visual/directional bias · candles: how many bars · behavior: what it
# tends to do (reversal/continuation/indecision) · rate: how often it resolves
# that way · rank: Bulkowski-style overall performance rank (lower = stronger).
# Rates/ranks are APPROXIMATE historical figures (Bulkowski, "Encyclopedia of
# Candlestick Charts"), shown for education — not a guarantee of future results.
PATTERN_META: Dict[str, Dict[str, Any]] = {
    # ----- Single candle -----
    "hammer":               {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 60, "rank": 26},
    "hanging-man":          {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 59, "rank": 51},
    "inverted-hammer":      {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 65, "rank": 14},
    "shooting-star":        {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 59, "rank": 31},
    "doji":                 {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 75},
    "dragonfly-doji":       {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 50, "rank": 72},
    "gravestone-doji":      {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 51, "rank": 77},
    "long-legged-doji":     {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 51, "rank": 80},
    "high-wave":            {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 82},
    "bullish-marubozu":     {"type": "bullish", "candles": 1, "behavior": "continuation", "rate": 56, "rank": 58},
    "bearish-marubozu":     {"type": "bearish", "candles": 1, "behavior": "continuation", "rate": 55, "rank": 60},
    "spinning-top":         {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 78},
    # ----- Two candle -----
    "bullish-engulfing":    {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 63, "rank": 22},
    "bearish-engulfing":    {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 79, "rank": 9},
    "bullish-harami":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 53, "rank": 68},
    "bearish-harami":       {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 53, "rank": 65},
    "piercing-line":        {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 64, "rank": 19},
    "dark-cloud-cover":     {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 60, "rank": 30},
    "tweezer-bottom":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 56, "rank": 56},
    "tweezer-top":          {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 55, "rank": 57},
    "bullish-kicker":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 68, "rank": 7},
    "bearish-kicker":       {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 67, "rank": 8},
    # ----- Three candle -----
    "morning-star":         {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 78, "rank": 6},
    "evening-star":         {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 72, "rank": 11},
    "morning-doji-star":    {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 76, "rank": 10},
    "evening-doji-star":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 71, "rank": 13},
    "three-white-soldiers": {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 82, "rank": 3},
    "three-black-crows":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 78, "rank": 5},
    "three-inside-up":      {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 65, "rank": 16},
    "three-inside-down":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 60, "rank": 28},
}


def _detect_at_index(rows: List[Dict[str, float]], i: int) -> List[str]:
    """Return list of pattern_ids that fire at index i (the most recent candle)."""
    hits: List[str] = []
    m = _candle_metrics(rows[i])
    trend = _trend_before(rows, i)

    # Single-candle: doji family first (most specific → least specific).
    if _is_dragonfly_doji(m):
        hits.append("dragonfly-doji")
    elif _is_gravestone_doji(m):
        hits.append("gravestone-doji")
    elif _is_long_legged_doji(m):
        hits.append("long-legged-doji")
    elif _is_doji(m):
        hits.append("doji")

    # Hammer shape (long lower wick): bullish in a downtrend, bearish (hanging
    # man) when it caps an uptrend.
    if _is_hammer(m):
        hits.append("hanging-man" if trend == "up" else "hammer")
    # Star shape (long upper wick): bullish (inverted hammer) bottoming a
    # downtrend, bearish (shooting star) topping a rally.
    if _is_shooting_star(m):
        hits.append("inverted-hammer" if trend == "down" else "shooting-star")
    if _is_marubozu(m):
        hits.append("bullish-marubozu" if m["is_bull"] else "bearish-marubozu")
    if _is_high_wave(m) and not hits:
        hits.append("high-wave")
    if _is_spinning_top(m) and "doji" not in hits and "high-wave" not in hits:
        hits.append("spinning-top")

    # Two-candle.
    if i >= 1:
        prev = rows[i - 1]
        cur = rows[i]
        if _is_bullish_kicker(prev, cur) and _is_marubozu(m):
            hits.append("bullish-kicker")
        elif _is_bullish_engulfing(prev, cur):
            hits.append("bullish-engulfing")
        elif _is_bearish_kicker(prev, cur) and _is_marubozu(m):
            hits.append("bearish-kicker")
        elif _is_bearish_engulfing(prev, cur):
            hits.append("bearish-engulfing")
        if _is_bullish_harami(prev, cur):
            hits.append("bullish-harami")
        elif _is_bearish_harami(prev, cur):
            hits.append("bearish-harami")
        if _is_piercing_line(prev, cur):
            hits.append("piercing-line")
        elif _is_dark_cloud_cover(prev, cur):
            hits.append("dark-cloud-cover")
        if _is_tweezer_bottom(prev, cur):
            hits.append("tweezer-bottom")
        elif _is_tweezer_top(prev, cur):
            hits.append("tweezer-top")

    # Three-candle (doji-star variants take priority over their plain forms).
    if i >= 2:
        c1, c2, c3 = rows[i - 2], rows[i - 1], rows[i]
        if _is_morning_doji_star(c1, c2, c3):
            hits.append("morning-doji-star")
        elif _is_morning_star(c1, c2, c3):
            hits.append("morning-star")
        elif _is_evening_doji_star(c1, c2, c3):
            hits.append("evening-doji-star")
        elif _is_evening_star(c1, c2, c3):
            hits.append("evening-star")
        if _is_three_white_soldiers(c1, c2, c3):
            hits.append("three-white-soldiers")
        elif _is_three_black_crows(c1, c2, c3):
            hits.append("three-black-crows")
        if _is_three_inside_up(c1, c2, c3):
            hits.append("three-inside-up")
        elif _is_three_inside_down(c1, c2, c3):
            hits.append("three-inside-down")

    # De-dup while preserving order.
    seen = set()
    out = []
    for h in hits:
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def detect_all_patterns(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Walk OHLC rows once and return detections enriched with reliability stats:
    [{date, pattern_id, type, behavior, rate, rank, ohlc, candle_count}]."""
    detections: List[Dict[str, Any]] = []
    for i, row in enumerate(rows):
        for pid in _detect_at_index(rows, i):
            meta = PATTERN_META[pid]
            detections.append({
                "date": row["date"],
                "pattern_id": pid,
                "type": meta["type"],
                "behavior": meta["behavior"],
                "rate": meta["rate"],
                "rank": meta["rank"],
                "ohlc": {k: round(float(row[k]), 4) for k in ("open", "high", "low", "close")},
                "candle_count": meta["candles"],
            })
    return detections


def get_pattern_catalog() -> List[Dict[str, Any]]:
    """Full encyclopedia view: every catalogued pattern with its stats.

    Sorted strongest-first (by overall rank). Names/descriptions are localized
    on the frontend from pattern_id; here we expose only language-neutral data.
    """
    return [
        {
            "pattern_id": pid,
            "type": meta["type"],
            "behavior": meta["behavior"],
            "rate": meta["rate"],
            "rank": meta["rank"],
            "candle_count": meta["candles"],
        }
        for pid, meta in sorted(PATTERN_META.items(), key=lambda kv: kv[1]["rank"])
    ]
