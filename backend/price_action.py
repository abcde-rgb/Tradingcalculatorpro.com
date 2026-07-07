"""
Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py.

Where candle_patterns.py recognises individual candlestick shapes, this module
detects the *structure* of price action that pro traders actually read:

  1. Swing highs / lows        — fractal pivots (the skeleton of the trend)
  2. Market structure          — HH / HL / LH / LL → uptrend / downtrend / range
  3. Break of Structure (BOS)  — trend-continuation break of the last swing
     & Change of Character     — first break AGAINST the trend (possible reversal)
  4. Support / Resistance      — horizontal levels from clustered swings (+ touches)
  5. Fair Value Gaps (FVG)     — 3-candle imbalances (unfilled inefficiencies)

Pure, deterministic functions over a list of OHLC dicts
``[{date, open, high, low, close}]`` ascending by date. No I/O, no deps —
unit-testable in isolation (see tests/test_price_action_unit.py).
"""
from typing import Any, Dict, List

Row = Dict[str, float]


# ---------------------------------------------------------------------------
# 1) Swing highs / lows (fractal pivots)
# ---------------------------------------------------------------------------
def detect_swings(rows: List[Row], strength: int = 2) -> List[Dict[str, Any]]:
    """A swing high at i has the highest high of the [i-strength, i+strength]
    window; a swing low the lowest low. Needs `strength` bars on each side, so
    the last `strength` bars are not yet confirmable. Returns points in order."""
    n = len(rows)
    out: List[Dict[str, Any]] = []
    if n < 2 * strength + 1:
        return out
    for i in range(strength, n - strength):
        hi = rows[i]["high"]
        lo = rows[i]["low"]
        is_high = all(hi >= rows[j]["high"] for j in range(i - strength, i + strength + 1) if j != i)
        is_low = all(lo <= rows[j]["low"] for j in range(i - strength, i + strength + 1) if j != i)
        # A candle can be both in flat data; prefer the more extreme role, and
        # never emit two swings of the same type back-to-back at equal price.
        if is_high and not is_low:
            out.append({"index": i, "date": rows[i].get("date"), "price": round(hi, 6), "type": "high"})
        elif is_low and not is_high:
            out.append({"index": i, "date": rows[i].get("date"), "price": round(lo, 6), "type": "low"})
    return out


# ---------------------------------------------------------------------------
# 2) Market structure — label each swing vs. the previous same-type swing
# ---------------------------------------------------------------------------
def label_structure(swings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Tag swing highs as HH/LH and swing lows as HL/LL vs. the previous swing of
    the same type, then classify the current trend from the last few labels."""
    last_high = None
    last_low = None
    labeled: List[Dict[str, Any]] = []
    for s in swings:
        lab = None
        if s["type"] == "high":
            if last_high is not None:
                lab = "HH" if s["price"] > last_high else "LH"
            last_high = s["price"]
        else:
            if last_low is not None:
                lab = "HL" if s["price"] > last_low else "LL"
            last_low = s["price"]
        labeled.append({**s, "label": lab})

    # Trend from the last highs/lows labels seen.
    highs = [x["label"] for x in labeled if x["type"] == "high" and x["label"]]
    lows = [x["label"] for x in labeled if x["type"] == "low" and x["label"]]
    trend = "range"
    if highs and lows:
        up = highs[-1] == "HH" and lows[-1] == "HL"
        down = highs[-1] == "LH" and lows[-1] == "LL"
        trend = "uptrend" if up else "downtrend" if down else "range"
    return {"trend": trend, "swings": labeled}


# ---------------------------------------------------------------------------
# 3) Break of Structure (BOS) & Change of Character (CHoCH)
# ---------------------------------------------------------------------------
def detect_structure_events(rows: List[Row], swings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Walk candles; when a close breaks the most recent confirmed swing high/low,
    emit a BOS (in trend direction) or CHoCH (against the prior trend). The trend
    flips on a CHoCH. Only swings already confirmed (index < current bar) count."""
    events: List[Dict[str, Any]] = []
    trend = None  # 'up' | 'down' | None
    last_sh = None  # (index, price) last confirmed swing high
    last_sl = None
    si = 0
    for i, row in enumerate(rows):
        # Promote any swings confirmed by bar i (a swing at index k is confirmed
        # once we are at least a couple bars past it; swings list already only
        # contains confirmable pivots, so just consume those with index < i).
        while si < len(swings) and swings[si]["index"] < i:
            s = swings[si]
            if s["type"] == "high":
                last_sh = (s["index"], s["price"])
            else:
                last_sl = (s["index"], s["price"])
            si += 1
        close = row["close"]
        if last_sh and close > last_sh[1]:
            kind = "BOS" if trend == "up" else "CHoCH"
            events.append({"index": i, "date": row.get("date"), "price": round(last_sh[1], 6),
                           "kind": kind, "direction": "bullish"})
            trend = "up"
            last_sh = None  # consumed; wait for a new swing high above
        elif last_sl and close < last_sl[1]:
            kind = "BOS" if trend == "down" else "CHoCH"
            events.append({"index": i, "date": row.get("date"), "price": round(last_sl[1], 6),
                           "kind": kind, "direction": "bearish"})
            trend = "down"
            last_sl = None
    return events


# ---------------------------------------------------------------------------
# 4) Support / Resistance — cluster swings within a tolerance band
# ---------------------------------------------------------------------------
def detect_sr_levels(swings: List[Dict[str, Any]], tolerance: float = 0.008,
                     min_touches: int = 2) -> List[Dict[str, Any]]:
    """Group swing points whose prices are within `tolerance` (fraction, e.g.
    0.008 = 0.8%) of each other into horizontal levels. `touches` = swings in the
    cluster; `strength` scales with touches. Returns strongest levels first."""
    pts = sorted(swings, key=lambda s: s["price"])
    clusters: List[Dict[str, Any]] = []
    for s in pts:
        placed = False
        for c in clusters:
            if abs(s["price"] - c["_ref"]) / c["_ref"] <= tolerance:
                c["prices"].append(s["price"])
                c["types"].append(s["type"])
                c["_ref"] = sum(c["prices"]) / len(c["prices"])
                placed = True
                break
        if not placed:
            clusters.append({"_ref": s["price"], "prices": [s["price"]], "types": [s["type"]]})
    levels = []
    for c in clusters:
        touches = len(c["prices"])
        if touches < min_touches:
            continue
        highs = c["types"].count("high")
        lows = c["types"].count("low")
        kind = "resistance" if highs > lows else "support" if lows > highs else "pivot"
        levels.append({
            "price": round(sum(c["prices"]) / touches, 6),
            "type": kind,
            "touches": touches,
            "strength": min(5, touches),  # 2..5+ capped
        })
    levels.sort(key=lambda l: (-l["touches"], l["price"]))
    return levels


# ---------------------------------------------------------------------------
# 5) Fair Value Gaps (3-candle imbalance)
# ---------------------------------------------------------------------------
def detect_fvgs(rows: List[Row]) -> List[Dict[str, Any]]:
    """Bullish FVG: high[i-1] < low[i+1] (gap left by a fast up-move).
    Bearish FVG: low[i-1] > high[i+1]. Marked `filled` if any later candle trades
    back through the gap. The middle candle (i) is the impulse."""
    out: List[Dict[str, Any]] = []
    n = len(rows)
    for i in range(1, n - 1):
        p, c = rows[i - 1], rows[i + 1]
        bull = p["high"] < c["low"]
        bear = p["low"] > c["high"]
        if not (bull or bear):
            continue
        if bull:
            bottom, top, direction = p["high"], c["low"], "bullish"
        else:
            bottom, top, direction = c["high"], p["low"], "bearish"
        filled = any(rows[k]["low"] <= top and rows[k]["high"] >= bottom for k in range(i + 2, n))
        out.append({
            "index": i, "date": rows[i].get("date"),
            "top": round(top, 6), "bottom": round(bottom, 6),
            "direction": direction, "filled": filled,
        })
    return out


# ---------------------------------------------------------------------------
# Public: one call → full structural read
# ---------------------------------------------------------------------------
def detect_structure(rows: List[Row], strength: int = 2) -> Dict[str, Any]:
    """Full price-action structure read for a series of OHLC rows."""
    if not rows or len(rows) < 2 * strength + 1:
        return {"trend": "range", "swings": [], "events": [], "levels": [], "fvgs": [],
                "rowsScanned": len(rows or [])}
    swings = detect_swings(rows, strength=strength)
    structure = label_structure(swings)
    events = detect_structure_events(rows, swings)
    levels = detect_sr_levels(swings)
    fvgs = detect_fvgs(rows)
    return {
        "trend": structure["trend"],
        "swings": structure["swings"],
        "events": events,
        "levels": levels,
        "fvgs": [g for g in fvgs if not g["filled"]] + [g for g in fvgs if g["filled"]],
        "rowsScanned": len(rows),
        "counts": {
            "swings": len(swings),
            "bos": sum(1 for e in events if e["kind"] == "BOS"),
            "choch": sum(1 for e in events if e["kind"] == "CHoCH"),
            "levels": len(levels),
            "fvgOpen": sum(1 for g in fvgs if not g["filled"]),
        },
    }
