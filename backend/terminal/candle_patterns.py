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


# Un "soldado" o un "cuervo" tiene que ser una vela CON CUERPO que cierra cerca
# de su extremo. Sin estos dos umbrales el patrón se disparaba con tres velas
# diminutas de mecha enorme —cuerpos del 4% del rango y mechas del 94%— que
# nadie llamaría tres soldados: justo lo que hacía que el escáner pareciera
# desproporcionado frente al gráfico.
_SOLDIER_MIN_BODY_PCT = 0.55   # el cuerpo domina la vela
_SOLDIER_MAX_WICK_PCT = 0.25   # poca mecha en el sentido de la marcha


def _is_long_body_close_near_high(m: Dict[str, float]) -> bool:
    """Vela alcista con cuerpo dominante y poca mecha superior."""
    return m["body_pct"] >= _SOLDIER_MIN_BODY_PCT and m["upper"] <= _SOLDIER_MAX_WICK_PCT * m["range"]


def _is_long_body_close_near_low(m: Dict[str, float]) -> bool:
    """Vela bajista con cuerpo dominante y poca mecha inferior."""
    return m["body_pct"] >= _SOLDIER_MIN_BODY_PCT and m["lower"] <= _SOLDIER_MAX_WICK_PCT * m["range"]


def _is_three_white_soldiers(c1: Dict, c2: Dict, c3: Dict) -> bool:
    if not (c1["close"] > c1["open"] and c2["close"] > c2["open"] and c3["close"] > c3["open"]):
        return False
    if not (c2["close"] > c1["close"] and c3["close"] > c2["close"]):
        return False
    # Cada apertura, dentro del cuerpo de la anterior (avance ordenado, sin hueco).
    if not (c1["open"] < c2["open"] < c1["close"] and c2["open"] < c3["open"] < c2["close"]):
        return False
    return all(_is_long_body_close_near_high(_candle_metrics(c)) for c in (c1, c2, c3))


def _is_three_black_crows(c1: Dict, c2: Dict, c3: Dict) -> bool:
    if not (c1["close"] < c1["open"] and c2["close"] < c2["open"] and c3["close"] < c3["open"]):
        return False
    if not (c2["close"] < c1["close"] and c3["close"] < c2["close"]):
        return False
    if not (c1["close"] < c2["open"] < c1["open"] and c2["close"] < c3["open"] < c2["open"]):
        return False
    return all(_is_long_body_close_near_low(_candle_metrics(c)) for c in (c1, c2, c3))


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

    The threshold is measured in AVERAGE CANDLE RANGES, not in a fixed percent.
    It used to be a flat 1%: on 5-minute candles almost every window clears 1%,
    so nearly everything looked like a trend and hammers were relabelled hanging
    men at random; on monthly candles almost nothing clears it, so the context
    was always "flat". The same shape has to mean the same thing on every rung
    of the ladder, and only a scale-free threshold does that.
    """
    j = i - 1
    k = max(0, i - lookback)
    if j <= k:
        return "flat"
    window = rows[k:i]
    avg_range = sum(max(r["high"] - r["low"], 0.0) for r in window) / max(len(window), 1)
    if avg_range <= 0:
        return "flat"
    move = rows[j]["close"] - rows[k]["close"]
    # Un recorrido neto de al menos un rango medio de vela ya es dirección; por
    # debajo de eso es ruido dentro del propio tamaño de las velas.
    if move >= avg_range:
        return "up"
    if move <= -avg_range:
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


# ---------- More patterns from the same corpus (Bulkowski / Nison) ----------
# Investigado y descartado para esta tanda: On Neck, Meeting Lines/Counterattack
# y Stick Sandwich/Homing Pigeon. Los cinco de aquí abajo se añaden porque su
# comportamiento REAL (Bulkowski, thepatternsite.com) coincide con lo que su
# nombre promete; esos cuatro NO — Bulkowski mide que actúan "casi al azar" o
# directamente AL REVÉS de su clasificación de libro (p. ej. Stick Sandwich se
# vende como reversión alcista y en la muestra actúa como continuación bajista
# el 62% de las veces). Meterlos con esta tabla (type/behavior alineados con
# rate) sería mentir con la estadística que se enseña junto al patrón — la
# regla de honestidad numérica del proyecto no permite esa clase de atajo.

def _is_bullish_belt_hold(m: Dict[str, float]) -> bool:
    """Abre prácticamente en el mínimo (mecha inferior ~nula) y cierra fuerte
    arriba. Un marubozu es un caso más extremo (sin mecha en ningún lado) y
    tiene su propia entrada — no se duplica aquí."""
    return (
        m["is_bull"]
        and m["lower"] <= 0.05 * m["range"]
        and m["body_pct"] >= 0.65
        and not _is_marubozu(m)
    )


def _is_bearish_belt_hold(m: Dict[str, float]) -> bool:
    return (
        m["is_bear"]
        and m["upper"] <= 0.05 * m["range"]
        and m["body_pct"] >= 0.65
        and not _is_marubozu(m)
    )


def _is_in_neck(prev: Dict, curr: Dict) -> bool:
    """Vela bajista larga, y la siguiente abre con hueco POR DEBAJO de su
    mínimo pero cierra apenas un pelo por encima de ese cierre — se queda "en
    el cuello", sin penetrar el cuerpo como sí hace la línea penetrante."""
    prev_body = abs(prev["close"] - prev["open"])
    if not (prev["close"] < prev["open"] and prev_body > 0):
        return False
    if not curr["open"] < prev["low"]:
        return False
    return prev["close"] <= curr["close"] <= prev["close"] + 0.10 * prev_body


def _is_bullish_abandoned_baby(c1: Dict, c2: Dict, c3: Dict) -> bool:
    """Versión ESTRICTA de la estrella de la mañana con doji: aquí hace falta
    un hueco de verdad a cada lado (ni una mecha se toca), no sólo que el
    cuerpo del doji quede por debajo del cierre de la primera vela."""
    if not _is_doji(_candle_metrics(c2)):
        return False
    return (
        c1["close"] < c1["open"]
        and c2["high"] < c1["low"]
        and c3["close"] > c3["open"]
        and c3["low"] > c2["high"]
    )


def _is_bearish_abandoned_baby(c1: Dict, c2: Dict, c3: Dict) -> bool:
    if not _is_doji(_candle_metrics(c2)):
        return False
    return (
        c1["close"] > c1["open"]
        and c2["low"] > c1["high"]
        and c3["close"] < c3["open"]
        and c3["high"] < c2["low"]
    )


# ---------- Pattern catalogue ----------
# type: visual/directional bias · candles: how many bars · behavior: what it
# tends to do (reversal/continuation/indecision) · rate: how often it resolves
# that way · rank: Bulkowski-style overall performance rank (lower = stronger).
# Rates/ranks are APPROXIMATE historical figures (Bulkowski, "Encyclopedia of
# Candlestick Charts"), shown for education — not a guarantee of future results.
# `basis` responde a la pregunta "¿en qué se fija el detector?", que es lo
# primero que quiere saber quien compara el aviso con su gráfico:
#   "body"  → manda el CUERPO (apertura vs cierre). Las mechas no se miran o
#             apenas influyen: envolventes, harami, estrellas, penetrante.
#   "wicks" → mandan las MECHAS (sombras). El cuerpo solo sirve de referencia
#             de tamaño: martillo, estrella fugaz, pinzas.
#   "both"  → hacen falta las dos condiciones a la vez: marubozu, doji de
#             libélula/lápida, tres soldados, tres cuervos.
PATTERN_META: Dict[str, Dict[str, Any]] = {
    # ----- Single candle -----
    "hammer":               {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 60, "rank": 26, "basis": "wicks"},
    "hanging-man":          {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 59, "rank": 51, "basis": "wicks"},
    "inverted-hammer":      {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 65, "rank": 14, "basis": "wicks"},
    "shooting-star":        {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 59, "rank": 31, "basis": "wicks"},
    "doji":                 {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 75, "basis": "body"},
    "dragonfly-doji":       {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 50, "rank": 72, "basis": "both"},
    "gravestone-doji":      {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 51, "rank": 77, "basis": "both"},
    "long-legged-doji":     {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 51, "rank": 80, "basis": "both"},
    "high-wave":            {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 82, "basis": "both"},
    "bullish-marubozu":     {"type": "bullish", "candles": 1, "behavior": "continuation", "rate": 56, "rank": 58, "basis": "both"},
    "bearish-marubozu":     {"type": "bearish", "candles": 1, "behavior": "continuation", "rate": 55, "rank": 60, "basis": "both"},
    "spinning-top":         {"type": "neutral", "candles": 1, "behavior": "indecision",  "rate": 50, "rank": 78, "basis": "both"},
    # ----- Two candle -----
    "bullish-engulfing":    {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 63, "rank": 22, "basis": "body"},
    "bearish-engulfing":    {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 79, "rank": 9, "basis": "body"},
    "bullish-harami":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 53, "rank": 68, "basis": "body"},
    "bearish-harami":       {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 53, "rank": 65, "basis": "body"},
    "piercing-line":        {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 64, "rank": 19, "basis": "body"},
    "dark-cloud-cover":     {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 60, "rank": 30, "basis": "body"},
    "tweezer-bottom":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 56, "rank": 56, "basis": "wicks"},
    "tweezer-top":          {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 55, "rank": 57, "basis": "wicks"},
    "bullish-kicker":       {"type": "bullish", "candles": 2, "behavior": "reversal",    "rate": 68, "rank": 7, "basis": "both"},
    "bearish-kicker":       {"type": "bearish", "candles": 2, "behavior": "reversal",    "rate": 67, "rank": 8, "basis": "both"},
    # ----- Three candle -----
    "morning-star":         {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 78, "rank": 6, "basis": "body"},
    "evening-star":         {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 72, "rank": 11, "basis": "body"},
    "morning-doji-star":    {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 76, "rank": 10, "basis": "both"},
    "evening-doji-star":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 71, "rank": 13, "basis": "both"},
    "three-white-soldiers": {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 82, "rank": 3, "basis": "both"},
    "three-black-crows":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 78, "rank": 5, "basis": "both"},
    "three-inside-up":      {"type": "bullish", "candles": 3, "behavior": "reversal",    "rate": 65, "rank": 16, "basis": "body"},
    "three-inside-down":    {"type": "bearish", "candles": 3, "behavior": "reversal",    "rate": 60, "rank": 28, "basis": "body"},
    # ----- Extra (Bulkowski corpus, verificadas 2026-08-31 — ver nota arriba) -----
    "bullish-belt-hold":    {"type": "bullish", "candles": 1, "behavior": "reversal",    "rate": 71, "rank": 62, "basis": "both"},
    "bearish-belt-hold":    {"type": "bearish", "candles": 1, "behavior": "reversal",    "rate": 68, "rank": 63, "basis": "both"},
    "in-neck":              {"type": "bearish", "candles": 2, "behavior": "continuation", "rate": 53, "rank": 17, "basis": "body"},
    "bullish-abandoned-baby": {"type": "bullish", "candles": 3, "behavior": "reversal",  "rate": 70, "rank": 13, "basis": "both"},
    "bearish-abandoned-baby": {"type": "bearish", "candles": 3, "behavior": "reversal",  "rate": 69, "rank": 14, "basis": "both"},
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
    if _is_bullish_belt_hold(m):
        hits.append("bullish-belt-hold")
    elif _is_bearish_belt_hold(m):
        hits.append("bearish-belt-hold")

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
        if _is_in_neck(prev, cur):
            hits.append("in-neck")

    # Three-candle (doji-star variants take priority over their plain forms).
    if i >= 2:
        c1, c2, c3 = rows[i - 2], rows[i - 1], rows[i]
        if _is_bullish_abandoned_baby(c1, c2, c3):
            hits.append("bullish-abandoned-baby")
        elif _is_morning_doji_star(c1, c2, c3):
            hits.append("morning-doji-star")
        elif _is_morning_star(c1, c2, c3):
            hits.append("morning-star")
        elif _is_bearish_abandoned_baby(c1, c2, c3):
            hits.append("bearish-abandoned-baby")
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
    """Walk OHLC rows once and return detections enriched with reliability stats.

    Cada detección dice **cuándo empieza y cuándo se confirma**. Un patrón de
    tres velas ocupa tres barras: antes solo se publicaba la fecha de la última
    y era imposible localizarlo en el gráfico sin contar velas hacia atrás.

      start_date / start_index → primera vela del patrón (donde se "abre")
      date / index             → vela que lo CONFIRMA (la última)

    `metrics` trae las medidas reales de la vela que confirma —cuerpo y mechas
    como porcentaje del rango— para poder contrastar el aviso con el gráfico en
    vez de creérselo. `basis` dice si el patrón se decide por el cuerpo, por las
    mechas, o por ambos.
    """
    detections: List[Dict[str, Any]] = []
    for i, row in enumerate(rows):
        for pid in _detect_at_index(rows, i):
            meta = PATTERN_META[pid]
            start_i = max(0, i - (meta["candles"] - 1))
            m = _candle_metrics(row)
            detections.append({
                "index": i,
                "start_index": start_i,
                "start_date": rows[start_i]["date"],
                "confirm_date": row["date"],
                "basis": meta["basis"],
                "metrics": {
                    "bodyPct": round(m["body_pct"] * 100, 1),
                    "upperWickPct": round(m["upper"] / m["range"] * 100, 1),
                    "lowerWickPct": round(m["lower"] / m["range"] * 100, 1),
                },
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
            "basis": meta["basis"],
        }
        for pid, meta in sorted(PATTERN_META.items(), key=lambda kv: kv[1]["rank"])
    ]
