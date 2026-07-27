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
    """
    interval: str
    minutes: int                    # nominal bar length, for ordering/labels
    ranges: Tuple[str, ...]         # legal lookback windows, shortest first
    default_range: str
    strength: int
    intraday: bool


# Ordered fastest → slowest. This IS the public ladder: 5-minute candles at the
# short end, monthly at the long end, and a 2-year window reachable from 1h up.
TIMEFRAMES: Tuple[Timeframe, ...] = (
    Timeframe("5m",   5,     ("1d", "5d", "1mo"),                                    "5d",  3, True),
    Timeframe("15m",  15,    ("1d", "5d", "1mo"),                                    "5d",  3, True),
    Timeframe("30m",  30,    ("5d", "1mo"),                                          "1mo", 2, True),
    Timeframe("1h",   60,    ("1mo", "3mo", "6mo", "1y", "2y"),                       "3mo", 2, True),
    Timeframe("1d",   1440,  ("1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"),   "6mo", 2, False),
    Timeframe("1wk",  10080, ("6mo", "1y", "2y", "5y", "max"),                        "2y",  2, False),
    Timeframe("1mo",  43200, ("1y", "2y", "5y", "max"),                               "5y",  2, False),
)

BY_INTERVAL: Dict[str, Timeframe] = {tf.interval: tf for tf in TIMEFRAMES}

DEFAULT_INTERVAL = "1d"

# Aliases we accept from clients so an obvious spelling is not a 400. `60m` is
# Yahoo's own name for the hourly bar; `4h`/`2h` do not exist upstream and are
# mapped to the nearest rung that does, rather than silently returning nothing.
ALIASES: Dict[str, str] = {
    "60m": "1h", "1hour": "1h", "h1": "1h",
    "2h": "1h", "4h": "1h",
    "5min": "5m", "15min": "15m", "30min": "30m",
    "m5": "5m", "m15": "15m", "m30": "30m",
    "d": "1d", "1day": "1d", "daily": "1d", "d1": "1d",
    "w": "1wk", "1w": "1wk", "weekly": "1wk", "w1": "1wk",
    "m": "1mo", "monthly": "1mo", "mn": "1mo",
    "1m": "1mo",  # ambiguous upstream; on a scanner "1M" is far likelier to
                  # mean one month than one minute, and 1-minute bars are not
                  # on the ladder at all (7 days of history is not a scan).
}


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
    elif normalize_interval(raw_interval) != raw_interval.lower():
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
            "maxDays": INTERVAL_MAX_DAYS.get(tf.interval, 0) or None,
        }
        for tf in TIMEFRAMES
    ]
