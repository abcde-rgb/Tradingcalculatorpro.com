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
``[{date, ts, open, high, low, close, volume}]`` ascending by date. No I/O, no
deps — unit-testable in isolation (see tests/test_price_action_unit.py).
``ts`` (epoch seconds) is optional: only the session-gap logic uses it, and its
absence degrades to "cannot tell", never to a guess.

HOW THIS FILE IS LAID OUT
-------------------------
The module grew section by section until helpers lived below their callers and
the reading order no longer matched the calculation order. It is now stacked in
the order the data actually flows, cheapest first:

    §0  Shared helpers        ATR, average volume, band side, bar spacing
    §1  Swings                detect_swings
    §2  Market structure      label_structure
    §3  Breaks                detect_structure_events · cluster_repeated_events
    §4  Levels                detect_sr_levels · scan_levels
    §5  Evidence              annotate_levels · annotate_events
    §6  Imbalances            detect_fvgs
    §7  Breakouts             detect_breakouts
    §8  Cross-timeframe       apply_confluence
    §9  Context               summarise_context
    §10 Public entry point    auto_tolerance · detect_structure

Layers §1–§7 answer "what is on this chart". §8–§9 answer "what does that mean
for the price right now", and never invent evidence: a cross-timeframe match is
reported as its own flag instead of being folded into the confirmation score,
which measures only the bars that were scanned.
"""
import time
from typing import Any, Dict, List, Optional

Row = Dict[str, float]

# How many levels get the expensive per-bar analysis (evidence + breakouts).
# They are sorted nearest-price-first, so this keeps the ones that matter.
MAX_ANALYSED_LEVELS = 30

# A bar-to-bar time jump this many times the series' normal spacing is a
# session break (overnight / weekend), not a move. Only applied to intraday
# series: on daily bars a Friday→Monday gap IS a gap, and traders trade it.
SESSION_GAP_FACTOR = 2.0
_DAY_SECONDS = 24 * 60 * 60


# ---------------------------------------------------------------------------
# §0) Shared helpers
# ---------------------------------------------------------------------------
def _side(value: float, low: float, high: float) -> int:
    """+1 above the band, -1 below it, 0 inside it."""
    if value > high:
        return 1
    if value < low:
        return -1
    return 0


def _avg_true_range(rows: List[Row], window: int = 14) -> float:
    if len(rows) < 2:
        return 0.0
    trs = []
    for i in range(1, len(rows)):
        h, lo, pc = rows[i]["high"], rows[i]["low"], rows[i - 1]["close"]
        trs.append(max(h - lo, abs(h - pc), abs(lo - pc)))
    w = trs[-window:] if len(trs) > window else trs
    return sum(w) / len(w) if w else 0.0


def _avg_vol(rows: List[Row], i: int, window: int) -> float:
    seg = [(r.get("volume") or 0.0) for r in rows[max(0, i - window):i]]
    seg = [v for v in seg if v > 0]
    return sum(seg) / len(seg) if seg else 0.0


def _bar_spacing_seconds(rows: List[Row]) -> float:
    """Median seconds between consecutive bars; 0 when timestamps are missing.

    The MEDIAN, not the mean: an intraday series is mostly regular spacing with
    one big jump per session break, and the mean would be dragged up by exactly
    the jumps we are trying to identify. 0 means "no idea" and every caller
    treats it as such rather than assuming a resolution.
    """
    stamps = [r.get("ts") for r in rows if r.get("ts")]
    if len(stamps) < 3:
        return 0.0
    deltas = sorted(float(b) - float(a) for a, b in zip(stamps, stamps[1:]) if b > a)
    if not deltas:
        return 0.0
    return deltas[len(deltas) // 2]


# ---------------------------------------------------------------------------
# §1) Swing highs / lows (fractal pivots)
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
# §2) Market structure — label each swing vs. the previous same-type swing
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
# §3) Break of Structure (BOS) & Change of Character (CHoCH)
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


def cluster_repeated_events(events: List[Dict[str, Any]],
                            tolerance: float = 0.008) -> List[Dict[str, Any]]:
    """Number the breaks that keep happening over the SAME price, same way.

    If price crosses one swing high three times, three BOS events are emitted,
    and every one of them is real. But listed side by side as three separate
    findings they read as three independent pieces of evidence, which is the
    opposite of what they are: one level being crossed again and again is a
    level that is not holding anybody back.

    Each event gets ``repeat`` (1 = first break of that level in that
    direction) and ``repeatOf`` (bar index of the first one), so the client can
    collapse a group into a single row with a counter instead of a wall of
    near-identical lines. Nothing is dropped here — the caller decides what to
    show, and ``counts.repeatedBreaks`` says how many were follow-ups.
    """
    groups: List[Dict[str, Any]] = []
    for ev in events:
        price = ev.get("price") or 0.0
        direction = ev.get("direction")
        match = None
        if price > 0:
            for g in groups:
                if g["direction"] == direction and abs(price - g["price"]) / g["price"] <= tolerance:
                    match = g
                    break
        if match is None:
            groups.append({"price": price or 1e-9, "direction": direction, "first": ev.get("index"), "n": 1})
            ev["repeat"] = 1
            ev["repeatOf"] = ev.get("index")
        else:
            match["n"] += 1
            ev["repeat"] = match["n"]
            ev["repeatOf"] = match["first"]
    return events


# ---------------------------------------------------------------------------
# §4) Support / Resistance — cluster swings within a tolerance band
# ---------------------------------------------------------------------------
def detect_sr_levels(swings: List[Dict[str, Any]], tolerance: float = 0.008,
                     min_touches: int = 2,
                     current_price: float = None) -> List[Dict[str, Any]]:
    """Group swing points within `tolerance` of each other into horizontal levels.

    ROLE (``type``) IS DECIDED BY WHERE PRICE IS **NOW**, not by how the level
    was formed:

        level above the current price  →  resistance
        level below the current price  →  support

    That is the definition every trader uses, and the previous implementation
    got it wrong: it labelled a level "resistance" whenever more swing HIGHS
    than lows had formed it, regardless of price. So a ceiling that price had
    already broken through and was now standing on kept being reported as
    resistance — the single most misleading thing this scanner could say,
    because it inverts the trade.

    The formation origin is kept in ``origin`` (formed by highs / lows / mixed)
    and, when origin and current role disagree, ``flipped`` is True. That is not
    an error: it is *polarity reversal*, one of the most reliable behaviours in
    price action (broken resistance tends to act as support, and vice versa),
    so it is worth surfacing rather than hiding.

    Every level also carries the ``zone`` it was clustered with — the same band
    the evidence pass counts visits against. A level is a band, not a line, and
    publishing the band is what lets the UI draw it as one instead of implying
    a precision the method does not have.

    When ``current_price`` is None the role cannot be determined; levels come
    back as ``pivot`` with ``flipped=False``, and the caller must not present
    them as support or resistance.
    """
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
        price = round(sum(c["prices"]) / touches, 6)
        highs = c["types"].count("high")
        lows = c["types"].count("low")
        origin = "highs" if highs > lows else "lows" if lows > highs else "mixed"

        if current_price and current_price > 0:
            # Strictly above → resistance; strictly below → support. A level the
            # price is sitting exactly on is neither: it is in play right now.
            if price > current_price:
                kind = "resistance"
            elif price < current_price:
                kind = "support"
            else:
                kind = "pivot"
            distance_pct = round((price - current_price) / current_price * 100, 3)
            # Origin says ceiling but price is above it (or vice versa) → the
            # level changed hands.
            flipped = bool(
                (origin == "highs" and kind == "support")
                or (origin == "lows" and kind == "resistance")
            )
        else:
            kind, distance_pct, flipped = "pivot", None, False

        levels.append({
            "price": price,
            "type": kind,
            "origin": origin,
            "flipped": flipped,
            "distancePct": distance_pct,
            "distanceAtr": None,          # filled by detect_structure, which knows the ATR
            "touches": touches,
            "strength": min(5, touches),  # 2..5+ capped
            # The band the cluster actually covers — a level is a zone.
            "zone": {"low": round(price * (1 - tolerance), 6),
                     "high": round(price * (1 + tolerance), 6)},
            "confluence": None,           # filled by apply_confluence when a HTF read exists
        })

    # Nearest levels first when we know where price is — the one you are about
    # to trade into matters more than the one from six months ago. Without a
    # price, fall back to the old "most touched first".
    if current_price and current_price > 0:
        levels.sort(key=lambda l: (abs(l["distancePct"]), -l["touches"]))
    else:
        levels.sort(key=lambda l: (-l["touches"], l["price"]))
    return levels


def scan_levels(rows: List[Row], strength: int = 2,
                tolerance: float = None, min_touches: int = 2) -> List[Dict[str, Any]]:
    """Levels only — swings, clustering, roles. No per-bar evidence pass.

    This is the cheap read used for the HIGHER timeframe when computing
    confluence: what is needed there is *where* the bigger chart has levels,
    not how each of them has behaved bar by bar, and the evidence pass is the
    expensive half (O(levels × bars)).
    """
    if not rows or len(rows) < 2 * strength + 1:
        return []
    tol = auto_tolerance(rows) if tolerance is None else tolerance
    return detect_sr_levels(detect_swings(rows, strength=strength), tolerance=tol,
                            min_touches=min_touches, current_price=rows[-1].get("close"))


# ---------------------------------------------------------------------------
# §5) Annotated confirmation — the EVIDENCE behind every level and every break
# ---------------------------------------------------------------------------
# The scanner used to print a level and a touch count and stop there. "Support
# at 182.40, 3 touches" says nothing about whether those touches HELD: three
# visits that all closed straight through describe a level that no longer
# exists. Same for a BOS — a close one tick past a swing high on the thinnest
# bar of the week is not a break of structure, it is noise that happens to
# cross a line.
#
# So every level and every event carries a `confirmation` block: the raw
# evidence (visits, holds, breaks, follow-through, volume, recency), a 0-100
# score and a list of stable reason CODES. The codes are translated on the
# client — the backend never ships prose it would then have to translate 10×.

def annotate_levels(rows: List[Row], levels: List[Dict[str, Any]],
                    tolerance: float = 0.008) -> List[Dict[str, Any]]:
    """Add a ``confirmation`` block to each level, from the bars themselves.

    A *visit* is a run of consecutive bars whose range touches the level's
    band, collapsed into ONE event — otherwise ten bars chopping inside the
    band would be reported as ten independent tests, which is exactly backwards
    (chop means the level is being eaten, not confirmed ten times over).

    A visit is *held* when price leaves the band on the side it arrived from,
    and *broken* when it leaves on the far side. Visits still in progress on
    the last bar are neither: they are ``inPlay``.
    """
    n = len(rows)
    for lv in levels:
        price = lv.get("price") or 0.0
        if n == 0 or price <= 0:
            lv["confirmation"] = {"visits": 0, "held": 0, "broken": 0,
                                  "holdRatePct": None, "barsSince": None,
                                  "lastVisit": None, "score": 0,
                                  "confirmed": False, "reasons": ["noData"]}
            continue
        low_band, high_band = price * (1 - tolerance), price * (1 + tolerance)

        visits: List[Dict[str, Any]] = []
        open_visit = None          # {"start": i, "entry": side}
        last_side = 0
        for i, row in enumerate(rows):
            touching = row["high"] >= low_band and row["low"] <= high_band
            close_side = _side(row["close"], low_band, high_band)
            if touching and open_visit is None:
                open_visit = {"start": i, "entry": last_side}
            elif not touching and open_visit is not None:
                open_visit.update(end=i - 1, exit=close_side, date=rows[i - 1].get("date"))
                visits.append(open_visit)
                open_visit = None
            if close_side != 0:
                last_side = close_side
        if open_visit is not None:                      # still inside the band
            open_visit.update(end=n - 1, exit=0, date=rows[-1].get("date"), inPlay=True)
            visits.append(open_visit)

        held = sum(1 for v in visits if v["entry"] != 0 and v["exit"] == v["entry"])
        broken = sum(1 for v in visits if v["entry"] != 0 and v["exit"] == -v["entry"])
        resolved = held + broken
        hold_rate = (held / resolved) if resolved else None
        bars_since = (n - 1 - visits[-1]["end"]) if visits else None
        in_play = bool(visits and visits[-1].get("inPlay"))

        reasons: List[str] = []
        score = min(45, 15 * len(visits))
        if len(visits) >= 3:
            reasons.append("multiTest")
        if hold_rate is None:
            score += 10                                  # no verdict yet
            reasons.append("untested")
        else:
            score += int(30 * hold_rate)
            if hold_rate >= 0.66:
                reasons.append("held")
            elif hold_rate < 0.4:
                reasons.append("weak")
        if bars_since is not None:
            if bars_since <= max(5, n * 0.10):
                score += 15
                reasons.append("recent")
            elif bars_since <= n * 0.35:
                score += 8
            else:
                reasons.append("stale")
        if lv.get("flipped") and broken >= 1:
            score += 10
            reasons.append("flip")                       # polarity change, earned
        if in_play:
            reasons.append("inPlay")

        score = max(0, min(100, score))
        lv["confirmation"] = {
            "visits": len(visits),
            "held": held,
            "broken": broken,
            "holdRatePct": round(hold_rate * 100, 1) if hold_rate is not None else None,
            "barsSince": bars_since,
            "lastVisit": visits[-1]["date"] if visits else None,
            "score": score,
            # Two independent visits minimum: one visit is the swing that
            # created the level, and a level nobody has come back to is a
            # drawing, not a level.
            "confirmed": bool(len(visits) >= 2 and score >= 55),
            "reasons": reasons,
        }
    return levels


def annotate_events(rows: List[Row], events: List[Dict[str, Any]],
                    atr: float = 0.0, vol_window: int = 20) -> List[Dict[str, Any]]:
    """Add a ``confirmation`` block to each BOS / CHoCH.

    What separates a real break from a line-crossing: how far past the level it
    closed (measured in ATR, so it means the same on 5-minute and monthly
    bars), whether the NEXT bar stayed beyond it, whether the breaking bar was
    an expansion bar, whether volume showed up, and whether price came back to
    the level and respected it (the retest — the single strongest of the five).
    """
    n = len(rows)
    has_vol = any((r.get("volume") or 0) > 0 for r in rows)
    for ev in events:
        i = ev.get("index", 0)
        level = ev.get("price") or 0.0
        bullish = ev.get("direction") == "bullish"
        if not (0 <= i < n) or level <= 0:
            ev["confirmation"] = {"score": 0, "confirmed": False, "reasons": ["noData"]}
            continue
        bar = rows[i]
        reasons: List[str] = []
        score = 0

        through = abs(bar["close"] - level)
        through_atr = round(through / atr, 2) if atr else None
        if through_atr is not None and through_atr >= 0.25:
            score += 25
            reasons.append("closedThrough")
        else:
            score += 10

        follow = False
        if i + 1 < n:
            nxt = rows[i + 1]["close"]
            follow = nxt > level if bullish else nxt < level
        if follow:
            score += 25
            reasons.append("followThrough")

        rng = bar["high"] - bar["low"]
        expansion = round(rng / atr, 2) if atr else None
        if expansion is not None and expansion >= 1.2:
            score += 15
            reasons.append("expansion")

        avg_v = _avg_vol(rows, i, vol_window) if has_vol else 0.0
        vol_exp = round((bar.get("volume") or 0.0) / avg_v, 2) if avg_v else None
        if vol_exp is None:
            score += 8                                   # no volume feed (forex, indices)
        elif vol_exp >= 1.3:
            score += 15
            reasons.append("volume")

        retest = False
        for k in range(i + 1, n):
            r = rows[k]
            if bullish and r["low"] <= level and r["close"] > level:
                retest = True
                break
            if (not bullish) and r["high"] >= level and r["close"] < level:
                retest = True
                break
        if retest:
            score += 20
            reasons.append("retest")

        score = max(0, min(100, score))
        ev["confirmation"] = {
            "closeThroughAtr": through_atr,
            "rangeExpansion": expansion,
            "volExpansion": vol_exp,
            "followThrough": follow,
            "retested": retest,
            "score": score,
            # 50 is exactly "closed clearly through it AND the next bar stayed
            # there" — the classic minimum standard for calling a break real.
            # Anything with only one of the two lands at 35 or below and is
            # reported as unconfirmed.
            "confirmed": bool(score >= 50),
            "reasons": reasons,
        }
    return events


# ---------------------------------------------------------------------------
# §6) Fair Value Gaps (3-candle imbalance)
# ---------------------------------------------------------------------------
def detect_fvgs(rows: List[Row]) -> List[Dict[str, Any]]:
    """Bullish FVG: high[i-1] < low[i+1] (gap left by a fast up-move).
    Bearish FVG: low[i-1] > high[i+1]. Marked `filled` if price later trades
    back into the gap. The middle candle (i) is the impulse.

    Fill test: for a BULLISH gap price sits above it, so the gap is revisited
    exactly when some later bar's LOW reaches the top of the gap — the running
    minimum of the lows after the gap answers that in one pass. Symmetrically
    for bearish gaps with the running maximum of the highs. That replaces the
    previous O(n²) rescan (unusable at 1 500+ intraday bars) and is also
    slightly *more* correct: a bar that blows straight through the gap without
    its range overlapping now counts as filled, which is what actually happened
    to the imbalance.

    SESSION BREAKS. On intraday bars of anything that does not trade round the
    clock, the jump from one day's close to the next day's open satisfies the
    three-candle test on every single overnight — and it is not an imbalance,
    it is the market being shut. Those carry ``sessionGap: True`` (detected
    from the bar timestamps, never from the prices) and are excluded from the
    open-imbalance count. They are still returned, because the price gap is
    real and some traders do trade it; what changes is that it is labelled
    instead of being passed off as an intraday inefficiency. With no ``ts`` on
    the rows the flag is simply False: unknown, so nothing is claimed.
    """
    out: List[Dict[str, Any]] = []
    n = len(rows)
    if n < 3:
        return out
    # suffix_min_low[k] = min low over rows[k:]; suffix_max_high[k] = max high.
    suffix_min_low = [0.0] * (n + 1)
    suffix_max_high = [0.0] * (n + 1)
    suffix_min_low[n] = float("inf")
    suffix_max_high[n] = float("-inf")
    for k in range(n - 1, -1, -1):
        suffix_min_low[k] = min(rows[k]["low"], suffix_min_low[k + 1])
        suffix_max_high[k] = max(rows[k]["high"], suffix_max_high[k + 1])

    spacing = _bar_spacing_seconds(rows)
    # Only intraday series can have a session break inside a 3-bar window. On
    # daily and above, a weekend is not a session gap: it is the normal spacing.
    check_gaps = 0 < spacing < _DAY_SECONDS
    gap_threshold = spacing * SESSION_GAP_FACTOR

    for i in range(1, n - 1):
        p, c = rows[i - 1], rows[i + 1]
        bull = p["high"] < c["low"]
        bear = p["low"] > c["high"]
        if not (bull or bear):
            continue
        if bull:
            bottom, top, direction = p["high"], c["low"], "bullish"
            filled = suffix_min_low[i + 2] <= top
        else:
            bottom, top, direction = c["high"], p["low"], "bearish"
            filled = suffix_max_high[i + 2] >= bottom

        session_gap = False
        if check_gaps:
            t0, t1, t2 = rows[i - 1].get("ts"), rows[i].get("ts"), rows[i + 1].get("ts")
            if t0 and t1 and t2:
                session_gap = (float(t1) - float(t0) > gap_threshold
                               or float(t2) - float(t1) > gap_threshold)

        out.append({
            "index": i, "date": rows[i].get("date"),
            "top": round(top, 6), "bottom": round(bottom, 6),
            "direction": direction, "filled": bool(filled),
            "sessionGap": bool(session_gap),
        })
    return out


# ---------------------------------------------------------------------------
# §7) Breakout confirmation — real break of a level + which liquidity enters
# ---------------------------------------------------------------------------
def detect_breakouts(rows: List[Row], levels: List[Dict[str, Any]] = None,
                     strength: int = 2, vol_window: int = 20) -> List[Dict[str, Any]]:
    """Confirmed breakouts of support/resistance + which side of liquidity enters.

    For each level, find the bar whose CLOSE crosses it (previous close on the
    other side). Confirmation combines: close-through margin, bar polarity, close
    position within the bar, range expansion (vs ATR) and — if volume is present —
    volume expansion. A wick that pierces the level but closes back is a
    ``fakeout`` (liquidity grab): the liquidity that enters is the OPPOSITE side.

    ``liquidity`` = 'bullish' (buyers entering) or 'bearish' (sellers entering).
    """
    out: List[Dict[str, Any]] = []
    n = len(rows)
    if n < 2 * strength + 2:
        return out
    if levels is None:
        levels = detect_sr_levels(detect_swings(rows, strength=strength))
    atr = _avg_true_range(rows)
    has_vol = any((r.get("volume") or 0) > 0 for r in rows)
    for lv in levels:
        L = lv["price"]
        if L <= 0:
            continue
        for i in range(1, n):
            prev_c, c = rows[i - 1]["close"], rows[i]["close"]
            h, lo, o = rows[i]["high"], rows[i]["low"], rows[i]["open"]
            rng = max(h - lo, 1e-9)
            up_cross = prev_c <= L < c
            down_cross = prev_c >= L > c
            if up_cross or down_cross:
                direction = "bullish" if up_cross else "bearish"
                margin = abs(c - L) / L
                bar_ok = (c > o) if up_cross else (c < o)
                close_pos = (c - lo) / rng if up_cross else (h - c) / rng
                range_exp = (h - lo) / atr if atr else 1.0
                avg_v = _avg_vol(rows, i, vol_window) if has_vol else 0.0
                vol_exp = ((rows[i].get("volume") or 0.0) / avg_v) if avg_v else None
                score = 30 if margin >= 0.001 else 10
                score += 20 if bar_ok else 0
                score += int(20 * min(1.0, max(0.0, close_pos)))
                score += 15 if range_exp >= 1.2 else 0
                score += (15 if (vol_exp or 0) >= 1.5 else 0) if vol_exp is not None else 8
                out.append({
                    "index": i, "date": rows[i].get("date"), "level": round(L, 6),
                    "levelType": lv["type"], "direction": direction, "kind": "breakout",
                    "confirmed": score >= 50, "liquidity": direction, "score": min(100, score),
                    "closeThroughPct": round(margin * 100, 3),
                    "rangeExpansion": round(range_exp, 2),
                    "volExpansion": round(vol_exp, 2) if vol_exp is not None else None,
                })
            elif h > L and c < L and prev_c < L:      # swept resistance, closed back below
                out.append({"index": i, "date": rows[i].get("date"), "level": round(L, 6),
                            "levelType": lv["type"], "direction": "bearish", "kind": "fakeout",
                            "confirmed": False, "liquidity": "bearish", "score": 0,
                            "closeThroughPct": 0.0, "rangeExpansion": None, "volExpansion": None})
            elif lo < L and c > L and prev_c > L:      # swept support, closed back above
                out.append({"index": i, "date": rows[i].get("date"), "level": round(L, 6),
                            "levelType": lv["type"], "direction": "bullish", "kind": "fakeout",
                            "confirmed": False, "liquidity": "bullish", "score": 0,
                            "closeThroughPct": 0.0, "rangeExpansion": None, "volExpansion": None})
    out.sort(key=lambda e: e["index"])
    return out


# ---------------------------------------------------------------------------
# §8) Cross-timeframe confluence
# ---------------------------------------------------------------------------
def apply_confluence(result: Dict[str, Any], htf_levels: List[Dict[str, Any]],
                     htf_interval: str, tolerance: float = None) -> Dict[str, Any]:
    """Mark the scanned levels that a HIGHER timeframe also has a level on.

    This is the one thing a single-timeframe scan structurally cannot know: that
    the resistance it is reading on 15-minute candles is also a daily level, and
    is therefore being watched by people who have never opened a 15-minute
    chart. It was the most valuable gap in this tool.

    Deliberately NOT folded into the confirmation score. That score answers "how
    did this level behave in the bars I scanned", and a match on another chart
    is not an observation about those bars — mixing them would make a number
    that means two things at once. Confluence is its own flag, and the UI shows
    it as its own badge.

    Matching band: the same tolerance the levels were clustered with, so two
    levels "at the same price" means exactly what it means everywhere else in
    this module. Only the closest match is kept per level.

    Mutates and returns ``result`` (the level dicts are shared with
    ``nearestResistance`` / ``nearestSupport``, so those are marked too).
    """
    levels = result.get("levels") or []
    if tolerance is None:
        tol_pct = result.get("tolerancePct")
        tolerance = (tol_pct / 100) if tol_pct else 0.005

    matched = 0
    for lv in levels:
        price = lv.get("price") or 0.0
        if price <= 0:
            continue
        best = None
        for hl in htf_levels or []:
            hp = hl.get("price") or 0.0
            if hp <= 0:
                continue
            gap = abs(hp - price) / price
            if gap <= tolerance and (best is None or gap < best[0]):
                best = (gap, hl)
        if best is not None:
            _, hl = best
            lv["confluence"] = {
                "interval": htf_interval,
                "price": hl["price"],
                "gapPct": round((hl["price"] - price) / price * 100, 3),
                "touches": hl.get("touches"),
                "type": hl.get("type"),
            }
            matched += 1

    result["confluence"] = {
        "checked": True,
        "interval": htf_interval,
        "htfLevels": len(htf_levels or []),
        "matched": matched,
    }
    result.setdefault("counts", {})["confluent"] = matched
    return result


# ---------------------------------------------------------------------------
# §9) Context — where price sits between the two levels that matter
# ---------------------------------------------------------------------------
def summarise_context(current_price: Optional[float],
                      nearest_resistance: Optional[Dict[str, Any]],
                      nearest_support: Optional[Dict[str, Any]],
                      atr: float = 0.0) -> Dict[str, Any]:
    """Room to the nearest level on each side, and where in between price sits.

    Nothing here is new information: it is arithmetic on numbers already in the
    response. It exists because the scanner used to hand over a wall of levels
    and leave "am I buying straight into resistance?" — the only question most
    of those levels are consulted for — to be eyeballed.

    The ATR figures are the useful half: 0.4 ATR of room above and 3 ATR below
    is a very different chart from the reverse, and the percentages alone do
    not say that on an unfamiliar instrument.

    Anything that cannot be computed is ``None``, never 0. With no level above,
    the room above is undefined; printing 0% would read as "resistance right
    here", which is the opposite of the truth.
    """
    ctx: Dict[str, Any] = {
        "roomAbovePct": None, "roomBelowPct": None,
        "roomAboveAtr": None, "roomBelowAtr": None,
        "rangeWidthPct": None, "rangePositionPct": None,
    }
    if not current_price or current_price <= 0:
        return ctx

    res = (nearest_resistance or {}).get("price")
    sup = (nearest_support or {}).get("price")
    if res and res > current_price:
        ctx["roomAbovePct"] = round((res - current_price) / current_price * 100, 2)
        if atr:
            ctx["roomAboveAtr"] = round((res - current_price) / atr, 2)
    if sup and sup < current_price:
        ctx["roomBelowPct"] = round((current_price - sup) / current_price * 100, 2)
        if atr:
            ctx["roomBelowAtr"] = round((current_price - sup) / atr, 2)
    if res and sup and res > sup:
        ctx["rangeWidthPct"] = round((res - sup) / current_price * 100, 2)
        # 0 % = sitting on support, 100 % = sitting on resistance.
        ctx["rangePositionPct"] = round((current_price - sup) / (res - sup) * 100, 1)
    return ctx


# ---------------------------------------------------------------------------
# §9b) Evidence for the client: the bars the read was actually computed on
# ---------------------------------------------------------------------------
def strip_bars(rows: List[Row], cap: int = 90) -> Dict[str, Any]:
    """The last `cap` bars that were SCANNED, so the client can draw them.

    The scanner used to claim "resistance at 4,512.30 with three touches" with
    no way to check it short of going to the chart and drawing the line by
    hand; when you could not see it, you could not tell "it is not there" from
    "I did not find it". Shipping the bars the read was computed on lets the UI
    draw the claim on top of its own evidence.

    ``barsOffset`` is not optional: swings carry their index into the FULL
    series, so without the offset of the first bar sent they would be drawn
    shifted — and a pivot in the wrong place invalidates the whole picture.
    ``bars[i]`` is exactly ``rows[barsOffset + i]``; the unit test pins that.

    One-letter keys because this travels on every scan.

    Lives here, next to the detectors, because it is the same kind of thing:
    a pure function over the OHLC rows. In `server.py` it could not be unit
    tested without standing up the whole web app.
    """
    if not rows:
        return {"bars": [], "barsOffset": 0}
    corte = max(0, len(rows) - max(1, int(cap)))
    return {
        "barsOffset": corte,
        "bars": [
            {"t": r.get("date"), "o": r["open"], "h": r["high"], "l": r["low"], "c": r["close"]}
            for r in rows[corte:]
        ],
    }


# ---------------------------------------------------------------------------
# §10) Public entry point: one call → full structural read
# ---------------------------------------------------------------------------
def auto_tolerance(rows: List[Row]) -> float:
    """Level-clustering tolerance derived from the series' own volatility.

    A fixed 0.8% was the previous behaviour and it only made sense on daily
    bars. On 5-minute candles the whole session may span 1%, so 0.8% merges
    every level into one useless blob; on a monthly chart of a volatile crypto
    it is so tight that two touches of the same obvious ceiling land in
    different clusters.

    Half the average true range, expressed as a percentage of price, adapts on
    its own: it widens on volatile series and tightens on quiet ones, with no
    per-timeframe table to maintain. Clamped to [0.15%, 2.5%] so a data glitch
    (a single absurd bar) cannot produce a nonsensical band.
    """
    if not rows:
        return 0.008
    atr = _avg_true_range(rows)
    last_close = rows[-1].get("close") or 0.0
    if atr <= 0 or last_close <= 0:
        return 0.008
    return max(0.0015, min(0.025, (atr / last_close) * 0.5))


def _empty_read(rows_scanned: int) -> Dict[str, Any]:
    """The exact shape of a full read, with everything empty.

    Same KEYS as a complete scan so the client never has to branch on "did this
    come back in the short shape or the long one". Counts that are genuinely
    unknown (confluence, which needs a second timeframe) are None, not 0.
    """
    return {
        "trend": "range", "swings": [], "events": [], "levels": [], "fvgs": [],
        "breakouts": [], "rowsScanned": rows_scanned, "currentPrice": None,
        "lastBarDate": None,
        # La referencia contra la que se reparte soporte/resistencia, con su
        # procedencia. Van aquí porque una lectura vacía tiene que traer las
        # MISMAS claves que una completa: si faltan, el cliente acaba
        # ramificando sobre «¿vino la forma corta o la larga?», que es
        # exactamente lo que este helper existe para evitar.
        "referencePrice": None, "referenceSource": None, "lastClose": None,
        "livePrice": None, "liveVsCloseDivergencePct": None,
        "referenceTs": None, "referenceDate": None, "referenceAgeSeconds": None,
        "levelsBetweenLiveAndClose": 0,
        "tolerancePct": None, "atr": None, "atrPct": None,
        "nearestResistance": None, "nearestSupport": None,
        "levelsAnalysed": 0,
        "context": summarise_context(None, None, None, 0.0),
        "confluence": {"checked": False, "interval": None, "htfLevels": 0, "matched": None},
        "counts": {"swings": 0, "bos": 0, "choch": 0, "levels": 0,
                   "resistances": 0, "supports": 0, "flipped": 0,
                   "confirmedLevels": 0, "confirmedEvents": 0,
                   "repeatedBreaks": 0, "confluent": None,
                   "fvgOpen": 0, "fvgSessionGap": 0, "breakouts": 0, "fakeouts": 0},
    }


def detect_structure(rows: List[Row], strength: int = 2,
                     tolerance: float = None,
                     live_price: float = None) -> Dict[str, Any]:
    """Full price-action structure read for a series of OHLC rows.

    `tolerance` defaults to `auto_tolerance(rows)` so the same call behaves
    sensibly on a 5-minute chart and on a monthly one.

    Cross-timeframe confluence is NOT computed here: it needs a second series,
    which means a second fetch, which means I/O — and this module stays pure.
    The caller does that fetch and passes the result to `apply_confluence`;
    until it does, `confluence.checked` is False and `counts.confluent` is
    None (unknown), never 0 (checked and found nothing).
    """
    if not rows or len(rows) < 2 * strength + 1:
        return _empty_read(len(rows or []))

    # The reference price for the support/resistance split. It is the CLOSE OF
    # THE LAST BAR of the requested timeframe, which is not the same thing as
    # "the price now": on a daily chart after the close it is today's close, on
    # a Saturday it is Friday's, on a monthly chart it is this month's running
    # close, and Yahoo's chart feed is itself delayed on many venues.
    #
    # This matters more here than anywhere else in the scanner, because the
    # whole support/resistance role hangs off a comparison with it — see
    # `detect_sr_levels`, where getting that role backwards is called the single
    # most misleading thing this scanner could say. The reference and its age
    # are therefore reported, so the caller can show what the split was actually
    # computed against instead of implying it is live.
    last_close = rows[-1].get("close")
    reference_ts = rows[-1].get("ts")
    reference_date = rows[-1].get("date")

    # Prefer the live quote when the caller supplies one. A trader reading a
    # support/resistance panel is asking "where is price relative to these
    # levels RIGHT NOW", and on a daily chart after the close — or at any point
    # over a weekend — the last bar's close answers a different question. When
    # no live quote is available the last close is used and labelled as such.
    use_live = live_price is not None and live_price > 0
    reference_price = float(live_price) if use_live else last_close
    reference_source = "live" if use_live else "last_close"
    # How far the live quote has moved from the last bar's close. This is the
    # number that decides whether the two would classify levels differently: a
    # level sitting between them flips role depending on which one is used.
    divergence_pct = (
        round((reference_price - last_close) / last_close * 100, 3)
        if (use_live and last_close) else None
    )

    current_price = reference_price
    tol = auto_tolerance(rows) if tolerance is None else tolerance
    atr = _avg_true_range(rows)

    # --- what is on the chart -------------------------------------------------
    swings = detect_swings(rows, strength=strength)
    structure = label_structure(swings)
    events = annotate_events(rows, detect_structure_events(rows, swings), atr=atr)
    cluster_repeated_events(events, tolerance=tol)
    all_levels = detect_sr_levels(swings, tolerance=tol, current_price=current_price)
    if atr:
        for lv in all_levels:
            lv["distanceAtr"] = round(abs(lv["price"] - current_price) / atr, 2)

    # Only the nearest levels get the per-bar evidence pass and the breakout
    # scan. Both are O(levels × bars): on a 10 000-bar `max` daily series with
    # 120+ levels that is a full CPU second spent on levels 40 % away from
    # price that no one will ever look at. `counts` below still describes every
    # level found; `levelsAnalysed` says how many were examined in depth.
    levels = all_levels[:MAX_ANALYSED_LEVELS]
    annotate_levels(rows, levels, tolerance=tol)
    fvgs = detect_fvgs(rows)
    breakouts = detect_breakouts(rows, levels, strength=strength)

    # --- what it means for the price right now --------------------------------
    nearest_res = next((l for l in levels if l["type"] == "resistance"), None)
    nearest_sup = next((l for l in levels if l["type"] == "support"), None)

    # Open imbalances first, then the ones the market has already closed;
    # session breaks sink below both — they are labelled, not silently dropped.
    fvgs.sort(key=lambda g: (g["filled"], g["sessionGap"], -g["index"]))

    return {
        # Kept for backwards compatibility with existing clients, but the name
        # overpromises: see `referencePrice` below for what it actually is.
        "currentPrice": round(current_price, 6) if current_price else None,
        # De CUÁNDO es ese precio. `currentPrice` es el cierre de la última vela
        # escaneada, no una cotización en vivo: en diario puede tener horas o
        # días. Publicarla es lo que permite que la interfaz diga la verdad en
        # vez de llamar "ahora" al cierre de anteayer.
        "lastBarDate": rows[-1].get("date") if rows else None,
        "referencePrice": round(reference_price, 6) if reference_price else None,
        "referenceSource": reference_source,
        "lastClose": round(last_close, 6) if last_close else None,
        "livePrice": round(float(live_price), 6) if use_live else None,
        "liveVsCloseDivergencePct": divergence_pct,
        "referenceTs": reference_ts,
        "referenceDate": reference_date,
        "referenceAgeSeconds": (
            max(0, int(time.time() - float(reference_ts))) if reference_ts else None
        ),
        # Levels sitting between the live quote and the last close are the ones
        # whose support/resistance role depends on which reference is used.
        "levelsBetweenLiveAndClose": (
            sum(1 for l in levels
                if min(reference_price, last_close) <= l["price"] <= max(reference_price, last_close))
            if (use_live and last_close) else 0
        ),
        "tolerancePct": round(tol * 100, 3),
        "atr": round(atr, 6) if atr else None,
        "atrPct": round(atr / current_price * 100, 3) if (atr and current_price) else None,
        # Nearest level on each side — the two prices that actually matter for
        # the next trade, so the UI doesn't have to re-derive them.
        "nearestResistance": nearest_res,
        "nearestSupport": nearest_sup,
        "context": summarise_context(current_price, nearest_res, nearest_sup, atr),
        # Filled in by apply_confluence when the caller supplies a higher
        # timeframe. Unknown until then.
        "confluence": {"checked": False, "interval": None, "htfLevels": 0, "matched": None},
        "trend": structure["trend"],
        "swings": structure["swings"],
        "events": events,
        "levels": levels,
        "fvgs": fvgs,
        "breakouts": breakouts,
        "rowsScanned": len(rows),
        "levelsAnalysed": len(levels),
        "counts": {
            "swings": len(swings),
            "bos": sum(1 for e in events if e["kind"] == "BOS"),
            "choch": sum(1 for e in events if e["kind"] == "CHoCH"),
            "levels": len(all_levels),
            "resistances": sum(1 for l in all_levels if l["type"] == "resistance"),
            "supports": sum(1 for l in all_levels if l["type"] == "support"),
            "flipped": sum(1 for l in all_levels if l.get("flipped")),
            "confirmedLevels": sum(1 for l in levels if l.get("confirmation", {}).get("confirmed")),
            "confirmedEvents": sum(1 for e in events if e.get("confirmation", {}).get("confirmed")),
            # Breaks that hit a level already broken the same way before.
            "repeatedBreaks": sum(1 for e in events if (e.get("repeat") or 1) > 1),
            "confluent": None,               # unknown until a HTF read is applied
            # An overnight jump is not an intraday imbalance: counted apart.
            "fvgOpen": sum(1 for g in fvgs if not g["filled"] and not g["sessionGap"]),
            "fvgSessionGap": sum(1 for g in fvgs if g["sessionGap"]),
            "breakouts": sum(1 for b in breakouts if b["kind"] == "breakout" and b["confirmed"]),
            "fakeouts": sum(1 for b in breakouts if b["kind"] == "fakeout"),
        },
    }
