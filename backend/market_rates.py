"""Live risk-free rate.

Every option price, Greek and risk-adjusted ratio in this codebase used to lean
on a hardcoded `0.0525` — a 2023-24 level. On long-dated expiries rho is not
negligible, so a stale rate leaks straight into the Greeks and the pricing; on
the performance side it silently changes what counts as "excess" return.

The source is the **US Treasury's own Daily Treasury Par Yield Curve**, field
`BC_3MONTH`. Two reasons it is not `^IRX` scraped from Yahoo any more:

  1. Licensing. Treasury data is a US government publication and therefore
     public domain — free to reuse, including inside a paid product. Yahoo's
     endpoints are unlicensed and their terms forbid deriving income from them.
  2. Correctness, marginally. `^IRX` quotes the 13-week bill's *discount rate*;
     the par yield curve quotes a bond-equivalent yield, which is the thing
     Black-Scholes actually wants. The gap is a few basis points, so this is a
     tidying-up, not a fix.

Every path is defensive: if the network is unavailable — which it always is in
the sandbox, and can be on a cold Cloud Run instance — the caller gets
`FALLBACK_RISK_FREE` and a `stale`/`source` marker rather than an exception.
"""
from __future__ import annotations

import logging
import threading
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from log_seguro import log_safe

logger = logging.getLogger(__name__)

# Used when the live curve can't be reached. Deliberately a plausible
# short-rate level, not zero: pricing with r=0 is a bigger error than pricing
# with a slightly stale r.
FALLBACK_RISK_FREE: float = 0.04

# T-bill yields move slowly; refreshing more than a few times a day buys
# nothing and costs an external request per call.
CACHE_TTL_SECONDS: int = 6 * 3600

# How long to wait before retrying after a FAILED lookup. Without this the
# failure path had no cache at all: `fresh` requires a non-None rate, so every
# call re-attempted the network while the provider was unreachable — measured at
# 25 network attempts for 25 calls, and the same when a stale value was already
# in hand. `get_risk_free_rate` sits inside /options/chain, /optimize,
# /calculate/* and /performance/analytics, so that tax was charged to every
# pricing request the user was waiting on.
FAILURE_BACKOFF_SECONDS: int = 15 * 60

# Timeout for the rate lookup. Deliberately short: the rate is a refinement,
# and no user request should stall on it.
FETCH_TIMEOUT_SECONDS: int = 4

# Sanity band. A parse error or a units mix-up (percent vs fraction) shows up
# as a value outside this range, and we'd rather use the fallback than price
# the whole book off a 1500% risk-free rate.
MIN_PLAUSIBLE_RATE: float = -0.01
MAX_PLAUSIBLE_RATE: float = 0.25

_RATE_SYMBOL = "UST 3M"  # 3-month point of the Treasury par yield curve
_TREASURY_FEED = (
    "https://home.treasury.gov/resource-center/data-chart-center/interest-rates"
    "/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={year}"
)
_YIELD_FIELD = "BC_3MONTH"
_DATE_FIELD = "NEW_DATE"

_lock = threading.Lock()
_cache: Dict[str, Any] = {"rate": None, "fetched_at": None, "source": "fallback",
                           "failed_at": None}


def _local(tag: str) -> str:
    """Element tag without its namespace.

    The feed is OData/Atom, so every tag arrives as `{namespace}NAME` and the
    namespaces have changed before (Treasury publishes a developer notice when
    they do). Matching on the local name survives that.
    """
    return tag.rsplit("}", 1)[-1]


def parse_treasury_yield_curve(xml_text: str) -> Optional[float]:
    """Newest 3-month par yield in the feed, as a decimal fraction.

    Separate from the fetch so it can be tested against a fixture without a
    network round trip. Returns None if the feed carries no usable reading —
    which is the normal state of the current-year feed on 1 January, not an
    error.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.info("Treasury feed is not parseable XML: %s", log_safe(exc))
        return None

    best_date, best_rate = "", None
    for entry in root.iter():
        if _local(entry.tag) != "entry":
            continue
        date_str, raw = "", None
        for field in entry.iter():
            name = _local(field.tag)
            if name == _DATE_FIELD and field.text:
                date_str = field.text.strip()
            elif name == _YIELD_FIELD and field.text and field.text.strip():
                raw = field.text.strip()
        # ISO-8601 dates sort lexicographically, so no parsing needed to pick
        # the newest row. Rows with an empty yield (holidays) fall out here.
        if raw is not None and date_str >= best_date:
            best_date, best_rate = date_str, raw

    if best_rate is None:
        return None
    try:
        return float(best_rate) / 100.0  # published in percent
    except ValueError:
        logger.info("Treasury %s is not a number: %r", log_safe(_YIELD_FIELD), log_safe(best_rate))
        return None


def _get_feed(year: int) -> Optional[str]:
    import httpx  # local import: keeps this module import-safe offline

    resp = httpx.get(_TREASURY_FEED.format(year=year), timeout=FETCH_TIMEOUT_SECONDS,
                     follow_redirects=True)
    return resp.text if resp.status_code == 200 else None


def _fetch_live_rate() -> Optional[float]:
    """Read the 3-month par yield from Treasury. Decimal fraction, or None."""
    try:
        year = datetime.now(timezone.utc).year
        # The feed is per calendar year, so in the first days of January the
        # current-year file can be empty or not yet published. One look back
        # covers that without turning this into a crawl.
        for candidate in (year, year - 1):
            xml_text = _get_feed(candidate)
            if not xml_text:
                continue
            rate = parse_treasury_yield_curve(xml_text)
            if rate is None:
                continue
            if not (MIN_PLAUSIBLE_RATE <= rate <= MAX_PLAUSIBLE_RATE):
                logger.warning("Discarding implausible risk-free rate %.4f from %s",
                               log_safe(rate), log_safe(_RATE_SYMBOL))
                return None
            return rate
        return None
    except Exception as exc:  # noqa: BLE001 — never let a rate lookup break pricing
        logger.info("Risk-free rate lookup failed, using fallback: %s", log_safe(exc))
        return None


def get_risk_free_rate(*, force_refresh: bool = False) -> float:
    """Current annual risk-free rate as a decimal fraction (0.0425 = 4.25%).

    Cached for `CACHE_TTL_SECONDS`. Never raises; falls back to
    `FALLBACK_RISK_FREE`, and keeps serving the last good value rather than
    dropping to the fallback if a later refresh fails.
    """
    now = datetime.now(timezone.utc)
    with _lock:
        fetched_at = _cache["fetched_at"]
        failed_at = _cache["failed_at"]
        fresh = (
            _cache["rate"] is not None
            and fetched_at is not None
            and (now - fetched_at).total_seconds() < CACHE_TTL_SECONDS
        )
        if fresh and not force_refresh:
            return float(_cache["rate"])
        # A recent failure is itself cached. Without this the unreachable-provider
        # path had no cache at all — `fresh` needs a non-None rate — so every
        # caller re-tried the network, on a code path that runs inside requests
        # the user is waiting on. An explicit force_refresh still goes out.
        backing_off = (
            failed_at is not None
            and (now - failed_at).total_seconds() < FAILURE_BACKOFF_SECONDS
        )
        if backing_off and not force_refresh:
            return float(_cache["rate"]) if _cache["rate"] is not None else FALLBACK_RISK_FREE

    rate = _fetch_live_rate()
    with _lock:
        if rate is not None:
            _cache.update({"rate": rate, "fetched_at": now,
                           "source": _RATE_SYMBOL, "failed_at": None})
            return rate
        _cache["failed_at"] = now
        if _cache["rate"] is not None:
            # Live lookup failed but we have a previous reading — a slightly old
            # real rate beats a made-up one. Mark it stale, keep serving it.
            _cache["source"] = f"{_RATE_SYMBOL} (stale)"
            return float(_cache["rate"])
        _cache.update({"rate": None, "fetched_at": now, "source": "fallback"})
        return FALLBACK_RISK_FREE


def get_risk_free_info() -> Dict[str, Any]:
    """The rate plus its provenance, for responses that need to show it."""
    rate = get_risk_free_rate()
    with _lock:
        source = _cache["source"]
        fetched_at = _cache["fetched_at"]
    return {
        "rate": round(rate, 5),
        "source": source,
        "is_live": source != "fallback",
        "fetched_at": fetched_at.isoformat() if fetched_at else None,
    }
