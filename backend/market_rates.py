"""Live risk-free rate.

Every option price, Greek and risk-adjusted ratio in this codebase used to lean
on a hardcoded `0.0525` — a 2023-24 level. On long-dated expiries rho is not
negligible, so a stale rate leaks straight into the Greeks and the pricing; on
the performance side it silently changes what counts as "excess" return.

This module reads the short end of the live curve (^IRX, the 13-week T-bill
discount rate, quoted in percent) and caches it. Every path is defensive: if
the network is unavailable — which it always is in the sandbox, and can be on a
cold Cloud Run instance — the caller gets `FALLBACK_RISK_FREE` and a
`stale`/`source` marker rather than an exception.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Used when the live curve can't be reached. Deliberately a plausible
# short-rate level, not zero: pricing with r=0 is a bigger error than pricing
# with a slightly stale r.
FALLBACK_RISK_FREE: float = 0.04

# T-bill yields move slowly; refreshing more than a few times a day buys
# nothing and costs an external request per call.
CACHE_TTL_SECONDS: int = 6 * 3600

# Sanity band. A parse error or a units mix-up (percent vs fraction) shows up
# as a value outside this range, and we'd rather use the fallback than price
# the whole book off a 1500% risk-free rate.
MIN_PLAUSIBLE_RATE: float = -0.01
MAX_PLAUSIBLE_RATE: float = 0.25

_RATE_SYMBOL = "^IRX"  # 13-week US Treasury bill, quoted as a percentage

_lock = threading.Lock()
_cache: Dict[str, Any] = {"rate": None, "fetched_at": None, "source": "fallback"}


def _fetch_live_rate() -> Optional[float]:
    """Read ^IRX from Yahoo. Returns a decimal fraction, or None on any failure."""
    try:
        from stock_data import _yahoo_get  # local import: keeps this module import-safe

        data = _yahoo_get(f"/v8/finance/chart/{_RATE_SYMBOL}?range=5d&interval=1d")
        meta = (data.get("chart", {}).get("result") or [{}])[0].get("meta", {})
        raw = meta.get("regularMarketPrice")
        if raw is None:
            return None
        rate = float(raw) / 100.0  # ^IRX is quoted in percent
        if not (MIN_PLAUSIBLE_RATE <= rate <= MAX_PLAUSIBLE_RATE):
            logger.warning("Discarding implausible risk-free rate %.4f from %s", rate, _RATE_SYMBOL)
            return None
        return rate
    except Exception as exc:  # noqa: BLE001 — never let a rate lookup break pricing
        logger.info("Risk-free rate lookup failed, using fallback: %s", exc)
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
        fresh = (
            _cache["rate"] is not None
            and fetched_at is not None
            and (now - fetched_at).total_seconds() < CACHE_TTL_SECONDS
        )
        if fresh and not force_refresh:
            return float(_cache["rate"])

    rate = _fetch_live_rate()
    with _lock:
        if rate is not None:
            _cache.update({"rate": rate, "fetched_at": now, "source": _RATE_SYMBOL})
            return rate
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
