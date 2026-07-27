"""The timeframe ladder for the price-action scanners (structure + patterns).

WHY THIS MODULE EXISTS
----------------------
`/education/structure-scan` and `/education/pattern-scan` accepted `interval`
as a free-form string and passed it straight to Yahoo. Two things went wrong:

  1. **No validation.** `interval=banana` reached the upstream API. Yahoo
     answers an invalid pair with an error body that our reader turns into an
     empty row list, so the UI said "no structure detected" — indistinguishable
     from a genuinely flat chart. A wrong parameter must never look like a
     valid negative result on a finance site.
  2. **Illegal (interval, range) pairs.** Yahoo enforces retention caps per
     interval. `interval=15m&range=1y` is not "a lot of data", it is a 422.
     Only the DAILY rung ever worked because the frontend hardcoded `1d`.

Yahoo's documented caps (re-verified against the chart API, 2026-07):

    1m                        ≤    7 days
    2m, 5m, 15m, 30m, 90m     ≤   60 days
    60m / 1h                  ≤  730 days  (2 years)
    1d, 5d, 1wk, 1mo, 3mo     unlimited

Those caps are the reason the ladder is not a free cross-product: you cannot
ask for two years of 15-minute candles anywhere, from any free provider, and a
UI that offers it is lying to the user. What the ladder does instead is give
every horizon a rung that CAN serve it: 5m/15m for the intraday read, 1h to
stretch the intraday read out to two years, 1d/1wk/1mo above that.

Everything here is pure data + pure functions: no I/O, no imports from the
rest of the backend, so it is trivially unit-testable (tests/test_timeframes_unit.py).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Length of each Yahoo range string in days. Yahoo resolves range strings with
# 365-day years, not calendar ones — which is precisely why the hourly cap is
# 730 and not 731: the cap exists so that `range=2y&interval=1h` fits exactly.
# Using calendar years here (731 for 2y) would make the table look illegal
# against a limit it actually meets. `ytd` is bounded by its worst case, a
# request on 31 December.
RANGE_DAYS: Dict[str, int] = {
    "1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180,
    "1y": 365, "2y": 730, "5y": 1825, "ytd": 365, "max": 100_000,
}

# Yahoo's hard retention cap per interval, in days. 0 = no cap.
INTERVAL_MAX_DAYS: Dict[str, int] = {
    "1m": 7, "2m": 60, "5m": 60, "15m": 60, "30m": 60, "90m": 60,
    "1h": 730, "60m": 730,
    "1d": 0, "5d": 0, "1wk": 0, "1mo": 0, "3mo": 0,
}


@dataclass(frozen=True)
class Timeframe:
    """One rung of the ladder.

    `strength` is the default fractal half-window for swing detection at this
    resolution. It is not cosmetic: a 2-bar fractal on 5-minute candles marks
    every micro-wiggle as a swing high, which then produces dozens of phantom
    BOS events. Faster candles need a wider window to mean the same thing.

    `source_interval` is what we actually ASK the provider for, and
    `bucket_minutes` how many minutes of it get merged into one bar. They differ
    only for rungs the provider does not serve: Yahoo has no 4-hour candle, so
    4h is built by merging four 1-hour candles. Everywhere else they are None
    and the bar comes down as-is.
    """
    interval: str
    minutes: int                    # nominal bar length, for ordering/labels
    ranges: Tuple[str, ...]         # legal lookback windows, shortest first
    default_range: str
    strength: int
    intraday: bool
    source_interval: Optional[str] = None   # None = same as `interval`
    bucket_minutes: int = 0                 # 0 = no aggregation needed

    @property
    def fetch_interval(self) -> str:
        """The interval to request upstream."""
        return self.source_interval or self.interval


# Ordered fastest → slowest. This IS the public ladder: 5-minute candles at the
# short end, monthly at the long end, and a 2-year window reachable from 1h up.
TIMEFRAMES: Tuple[Timeframe, ...] = (
    Timeframe("5m",   5,     ("1d", "5d", "1mo"),                                    "5d",  3, True),
    Timeframe("15m",  15,    ("1d", "5d", "1mo"),                                    "5d",  3, True),
    Timeframe("30m",  30,    ("5d", "1mo"),                                          "1mo", 2, True),
    Timeframe("1h",   60,    ("1mo", "3mo", "6mo", "1y", "2y"),                       "3mo", 2, True),
    # 4H no existe en el proveedor: se construye juntando cuatro velas de 1h.
    # Es de las temporalidades más usadas en swing, así que merece la pena
    # fabricarla en vez de fingir que no se puede. Hereda el tope de 730 días
    # del intervalo horario del que sale, de ahí que llegue justo a 2 años.
    Timeframe("4h",   240,   ("3mo", "6mo", "1y", "2y"),                              "6mo", 2, True,
              source_interval="1h", bucket_minutes=240),
    Timeframe("1d",   1440,  ("1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"),   "6mo", 2, False),
    Timeframe("1wk",  10080, ("6mo", "1y", "2y", "5y", "max"),                        "2y",  2, False),
    Timeframe("1mo",  43200, ("1y", "2y", "5y", "max"),                               "5y",  2, False),
)

BY_INTERVAL: Dict[str, Timeframe] = {tf.interval: tf for tf in TIMEFRAMES}

DEFAULT_INTERVAL = "1d"

# Two kinds of alias, and the difference matters for what we tell the user.
#
# SPELLINGS name the SAME timeframe another way: `H4` and `4h` are the same
# candle, `60m` is Yahoo's own name for the hourly bar. Canonicalising these is
# not a change to the request, so it must NOT raise the "we served you
# something else" warning — doing so put an amber alert on screen for someone
# who merely typed `H4`.
SPELLINGS: Dict[str, str] = {
    "60m": "1h", "1hour": "1h", "h1": "1h",
    "h4": "4h", "4hour": "4h", "240": "4h", "240m": "4h",
    "5min": "5m", "15min": "15m", "30min": "30m",
    "m5": "5m", "m15": "15m", "m30": "30m",
    "d": "1d", "1day": "1d", "daily": "1d", "d1": "1d",
    "w": "1wk", "1w": "1wk", "weekly": "1wk", "w1": "1wk",
    "monthly": "1mo", "mn": "1mo",
}

# APPROXIMATIONS resolve to a DIFFERENT timeframe than the one asked for,
# because the requested one exists nowhere on the ladder. Answering beats
# returning nothing, but the caller has to be told.
APPROXIMATIONS: Dict[str, str] = {
    "2h": "1h",    # no existe upstream ni en la escalera
    "1m": "1mo",   # ambiguo: ¿un minuto o un mes? Se asume mes (las velas de
    "m": "1mo",    # 1 minuto ni siquiera están en la escalera), pero se avisa.
}

ALIASES: Dict[str, str] = {**SPELLINGS, **APPROXIMATIONS}


def normalize_interval(interval: Optional[str]) -> Optional[str]:
    """Canonical rung name, or None when it is not on the ladder."""
    if not interval:
        return None
    key = str(interval).strip().lower()
    key = ALIASES.get(key, key)
    return key if key in BY_INTERVAL else None


def get(interval: Optional[str]) -> Optional[Timeframe]:
    name = normalize_interval(interval)
    return BY_INTERVAL.get(name) if name else None


def is_intraday(interval: Optional[str]) -> bool:
    tf = get(interval)
    return bool(tf and tf.intraday)


def resolve(interval: Optional[str] = None,
            period: Optional[str] = None) -> Tuple[Timeframe, str, List[str]]:
    """Pick a legal (timeframe, range) pair, reporting every adjustment made.

    Never raises and never returns an illegal pair: a scanner that 500s because
    someone typed a bad querystring is worse than one that falls back. But the
    fallback is NOT silent — the third element lists what changed, and the
    endpoint passes it to the client so the UI can say "showing 1mo, 15-minute
    candles only go back 60 days" instead of quietly showing something else.

    Returns ``(timeframe, range, adjustments)``.
    """
    adjustments: List[str] = []

    raw_interval = (interval or "").strip()
    tf = get(raw_interval)
    if tf is None:
        if raw_interval and raw_interval.lower() != DEFAULT_INTERVAL:
            adjustments.append(f"interval:{raw_interval}->{DEFAULT_INTERVAL}")
        tf = BY_INTERVAL[DEFAULT_INTERVAL]
    elif raw_interval.lower() in APPROXIMATIONS:
        # Solo se avisa cuando la vela servida NO es la pedida. Una grafía
        # distinta de la misma temporalidad (H4 → 4h) no es un ajuste.
        adjustments.append(f"interval:{raw_interval}->{tf.interval}")

    raw_range = (period or "").strip().lower()
    if not raw_range:
        return tf, tf.default_range, adjustments

    if raw_range in tf.ranges:
        return tf, raw_range, adjustments

    if raw_range not in RANGE_DAYS:
        adjustments.append(f"period:{period}->{tf.default_range}")
        return tf, tf.default_range, adjustments

    # A known range that this rung cannot serve: clamp to the longest window
    # the rung supports (asking for more history should give you all of it,
    # not the default). Asking for less than the shortest gives the shortest.
    wanted = RANGE_DAYS[raw_range]
    legal = sorted(tf.ranges, key=lambda r: RANGE_DAYS[r])
    chosen = legal[-1] if wanted > RANGE_DAYS[legal[-1]] else legal[0]
    adjustments.append(f"period:{raw_range}->{chosen}")
    return tf, chosen, adjustments


def resample(rows: List[Dict[str, Any]], bucket_minutes: int) -> List[Dict[str, Any]]:
    """Merge bars into fixed UTC buckets of `bucket_minutes` (OHLC semantics).

    Used to build the 4-hour rung out of hourly candles, because no free
    provider serves a 4h bar and 4H is one of the timeframes people actually
    trade. Open = first bar's open, high = max, low = min, close = last bar's
    close, volume = sum.

    Buckets are anchored to UTC midnight (00:00, 04:00, 08:00 …). For anything
    that trades round the clock — crypto and forex — that matches what a chart
    platform shows exactly. For a STOCK with a 6.5-hour session it does not:
    the session opens at 13:30 UTC, so its bars land inside UTC buckets rather
    than starting at the open, and the first and last bucket of each day hold
    fewer hours than the rest. The alternative is to anchor on each venue's
    session, which needs calendar data the price feed does not give us. The
    approximation is documented rather than hidden — it shifts where a 4h bar
    begins, it does not invent prices.

    Bars without a usable ``ts`` cannot be bucketed and are skipped: guessing
    a timestamp would put a bar in the wrong candle.
    """
    if bucket_minutes <= 0 or not rows:
        return rows
    span = bucket_minutes * 60
    out: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None
    cur_start = None

    for row in rows:
        ts = row.get("ts")
        if not ts:
            continue
        start = int(ts) - (int(ts) % span)
        if cur is None or start != cur_start:
            if cur is not None:
                out.append(cur)
            cur_start = start
            cur = {
                "date": datetime.fromtimestamp(start, tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
                "ts": start,
                "open": row["open"], "high": row["high"],
                "low": row["low"], "close": row["close"],
                "volume": row.get("volume") or 0.0,
            }
        else:
            cur["high"] = max(cur["high"], row["high"])
            cur["low"] = min(cur["low"], row["low"])
            cur["close"] = row["close"]
            cur["volume"] += row.get("volume") or 0.0
    if cur is not None:
        out.append(cur)
    return out


def ladder() -> List[Dict[str, Any]]:
    """JSON-serialisable ladder for the frontend selector."""
    return [
        {
            "interval": tf.interval,
            "minutes": tf.minutes,
            "intraday": tf.intraday,
            "ranges": list(tf.ranges),
            "defaultRange": tf.default_range,
            "defaultStrength": tf.strength,
            "maxDays": INTERVAL_MAX_DAYS.get(tf.fetch_interval, 0) or None,
            # El cliente puede avisar de que esta vela se compone, no se sirve.
            "aggregatedFrom": tf.source_interval,
        }
        for tf in TIMEFRAMES
    ]
