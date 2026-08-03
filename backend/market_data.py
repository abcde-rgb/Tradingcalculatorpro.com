"""Multi-provider market data layer with failover, caching and circuit breakers.

WHY THIS EXISTS
---------------
Every live price in the product came from ONE source: Yahoo Finance, scraped via
curl_cffi impersonating Chrome (`stock_data.py` documents this in its own header:
plain datacenter requests get bot-blocked, which is why yfinance fails on Cloud
Run). It works, but it is a single point of failure with no contract and no SLA:
the day Yahoo tightens its anti-bot, prices, watchlist, alerts, option chains, IV
rank, unusual activity and every calculator fed by live price all go dark at once.

DESIGN
------
    get_quote(symbol)
      1. cache hit (TTL) ......................... return
      2. primary   provider (sin clave) ............ return on success
      3. secondary provider (Finnhub, free key) .. only if primary failed
      4. tertiary  provider (Twelve Data) ........ last resort
      5. last known good value + stale=True + as_of

Rules that must not be broken:
  * API keys come from the environment / Secret Manager. NEVER from the database
    (that is finding C-08 in the audit and this module must not reintroduce it).
  * A price we could not refresh is returned with ``stale=True`` and ``as_of``.
    A finance site that shows an old price as if it were live is a legal problem,
    not just a UX one — the caller MUST surface it.
  * We never invent a price. If every provider fails and there is no cached
    value, ``price`` is None and ``error`` explains why.
  * Every provider is wrapped in a circuit breaker: N consecutive failures take
    it out of rotation for a cooldown, so a dead provider costs one timeout per
    cooldown window instead of one per request.

This module is pure and synchronous by design (like `stock_data.py`); callers
wrap it in ``asyncio.to_thread`` so it never blocks the event loop.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Tunables (env-overridable, sane defaults) ────────────────────────
QUOTE_TTL_SECONDS = int(os.environ.get("MARKET_DATA_TTL", "15"))
STALE_MAX_SECONDS = int(os.environ.get("MARKET_DATA_STALE_MAX", "3600"))
BREAKER_THRESHOLD = int(os.environ.get("MARKET_DATA_BREAKER_FAILS", "5"))
BREAKER_COOLDOWN = int(os.environ.get("MARKET_DATA_BREAKER_COOLDOWN", "300"))
HTTP_TIMEOUT = int(os.environ.get("MARKET_DATA_TIMEOUT", "10"))

FINNHUB_API_KEY = (os.environ.get("FINNHUB_API_KEY") or "").strip()
TWELVEDATA_API_KEY = (os.environ.get("TWELVEDATA_API_KEY") or "").strip()


# ── Circuit breaker ──────────────────────────────────────────────────
@dataclass
class _Breaker:
    """Trips after `threshold` consecutive failures, resets after `cooldown`."""
    threshold: int = BREAKER_THRESHOLD
    cooldown: int = BREAKER_COOLDOWN
    fails: int = 0
    opened_at: float = 0.0

    def is_open(self, now: Optional[float] = None) -> bool:
        if self.opened_at == 0.0:
            return False
        now = now if now is not None else time.time()
        if now - self.opened_at >= self.cooldown:
            # Cooldown elapsed: half-open — let the next call try again.
            self.opened_at = 0.0
            self.fails = 0
            return False
        return True

    def record_success(self) -> None:
        self.fails = 0
        self.opened_at = 0.0

    def record_failure(self, now: Optional[float] = None) -> None:
        self.fails += 1
        if self.fails >= self.threshold:
            self.opened_at = now if now is not None else time.time()


# ── Provider registry ────────────────────────────────────────────────
@dataclass
class Provider:
    name: str
    fetch: Callable[[str], Optional[dict]]
    enabled: Callable[[], bool]
    breaker: _Breaker = field(default_factory=_Breaker)
    calls: int = 0
    failures: int = 0
    served: int = 0
    # Daily quota, so the admin panel can warn BEFORE the tap runs dry. Free
    # tiers are small (Twelve Data: 800/day) and hitting the cap looks exactly
    # like the provider being down. 0 = no documented daily cap.
    daily_quota: int = 0
    _day: str = ""
    _day_calls: int = 0

    def note_call(self, today: str) -> None:
        if self._day != today:
            self._day, self._day_calls = today, 0
        self._day_calls += 1

    def usage(self, today: str) -> Dict[str, Any]:
        used = self._day_calls if self._day == today else 0
        pct = round(used / self.daily_quota * 100, 1) if self.daily_quota else None
        return {
            "used_today": used,
            "daily_quota": self.daily_quota or None,
            "pct_used": pct,
            # 80% is early enough to react before users see missing prices.
            "near_limit": bool(pct is not None and pct >= 80),
        }


_lock = threading.Lock()
_cache: Dict[str, tuple] = {}  # symbol -> (quote_dict, fetched_at_epoch)


def _http_get_json(url: str, params: dict) -> dict:
    """GET returning JSON. Uses curl_cffi when present (same stack as Yahoo)."""
    try:
        from curl_cffi import requests as _cffi
        r = _cffi.get(url, params=params, impersonate="chrome", timeout=HTTP_TIMEOUT)
        if r.status_code != 200:
            raise RuntimeError(f"HTTP {r.status_code}")
        return r.json()
    except ImportError:
        import urllib.parse
        import urllib.request
        import json as _json
        qs = urllib.parse.urlencode(params)
        with urllib.request.urlopen(f"{url}?{qs}", timeout=HTTP_TIMEOUT) as resp:  # noqa: S310
            return _json.loads(resp.read().decode())


def _norm(symbol: str, name: str, price, prev_close, *, source: str,
          volume=None, currency: str = "USD") -> Optional[dict]:
    """Shape every provider into one contract. Rejects non-positive prices."""
    try:
        p = float(price)
    except (TypeError, ValueError):
        return None
    if not (p > 0):
        return None
    try:
        prev = float(prev_close)
    except (TypeError, ValueError):
        prev = p
    change = p - prev
    return {
        "symbol": symbol,
        "name": name or symbol,
        "price": round(p, 6),
        "previous_close": round(prev, 6),
        "change": round(change, 6),
        "change_percent": round((change / prev * 100) if prev else 0.0, 4),
        "volume": volume,
        "currency": currency,
        "source": source,
        "stale": False,
        "as_of": time.time(),
    }


# ── Provider 1: Yahoo (no key, current primary) ──────────────────────
def _fetch_yahoo(symbol: str) -> Optional[dict]:
    from stock_data import _yahoo_get  # reuse the Chrome-impersonating client
    data = _yahoo_get(f"/v8/finance/chart/{symbol}?range=1d&interval=1d")
    res = (data.get("chart", {}).get("result") or [None])[0]
    meta = (res or {}).get("meta") or {}
    return _norm(
        symbol,
        meta.get("longName") or meta.get("shortName") or symbol,
        meta.get("regularMarketPrice"),
        meta.get("chartPreviousClose") or meta.get("previousClose"),
        source="market",
        volume=meta.get("regularMarketVolume"),
        currency=meta.get("currency") or "USD",
    )


# ── Provider 2: Finnhub (free tier: 60 calls/min) ────────────────────
def _fetch_finnhub(symbol: str) -> Optional[dict]:
    data = _http_get_json(
        "https://finnhub.io/api/v1/quote",
        {"symbol": symbol, "token": FINNHUB_API_KEY},
    )
    # Finnhub answers 200 with c=0 for unknown symbols; _norm rejects that.
    return _norm(symbol, symbol, data.get("c"), data.get("pc"), source="finnhub")


# ── Provider 3: Twelve Data (free tier: 8/min, 800/day) ──────────────
def _fetch_twelvedata(symbol: str) -> Optional[dict]:
    data = _http_get_json(
        "https://api.twelvedata.com/quote",
        {"symbol": symbol, "apikey": TWELVEDATA_API_KEY},
    )
    if data.get("status") == "error" or "code" in data:
        raise RuntimeError(data.get("message", "twelvedata error"))
    return _norm(
        symbol,
        data.get("name") or symbol,
        data.get("close"),
        data.get("previous_close"),
        source="twelvedata",
        volume=data.get("volume"),
        currency=data.get("currency") or "USD",
    )


PROVIDERS: List[Provider] = [
    # daily_quota = documented free-tier cap. Yahoo has no published quota (it
    # is scraped, not licensed) so it stays 0 = unknown.
    Provider("yahoo", _fetch_yahoo, lambda: True, daily_quota=0),
    Provider("finnhub", _fetch_finnhub, lambda: bool(FINNHUB_API_KEY),
             daily_quota=int(os.environ.get("FINNHUB_DAILY_QUOTA", "86400"))),  # 60/min
    Provider("twelvedata", _fetch_twelvedata, lambda: bool(TWELVEDATA_API_KEY),
             daily_quota=int(os.environ.get("TWELVEDATA_DAILY_QUOTA", "800"))),
]


# ── Public API ───────────────────────────────────────────────────────
def get_quote(symbol: str, *, ttl: Optional[int] = None) -> dict:
    """Best available quote for `symbol`, trying providers in order.

    Always returns a dict. Check ``price is None`` for total failure and
    ``stale is True`` for a value served from cache after every provider failed.
    """
    symbol = (symbol or "").upper().strip()
    if not symbol:
        return {"symbol": symbol, "price": None, "stale": False, "error": "empty symbol"}

    ttl = QUOTE_TTL_SECONDS if ttl is None else ttl
    now = time.time()

    with _lock:
        hit = _cache.get(symbol)
    if hit and (now - hit[1]) < ttl:
        return dict(hit[0])

    errors = []
    for provider in PROVIDERS:
        if not provider.enabled():
            continue
        if provider.breaker.is_open(now):
            errors.append(f"{provider.name}: circuit open")
            continue
        provider.calls += 1
        provider.note_call(time.strftime("%Y-%m-%d", time.gmtime(now)))
        try:
            quote = provider.fetch(symbol)
            if quote is None:
                raise ValueError("no usable price in response")
            provider.breaker.record_success()
            provider.served += 1
            with _lock:
                _cache[symbol] = (quote, time.time())
            return dict(quote)
        except Exception as exc:  # noqa: BLE001
            provider.failures += 1
            provider.breaker.record_failure(now)
            errors.append(f"{provider.name}: {type(exc).__name__}: {exc}")
            logger.warning("[market_data] %s failed for %s: %s", provider.name, symbol, exc)

    # Every provider failed — serve the last known good value, clearly marked.
    if hit:
        age = now - hit[1]
        if age <= STALE_MAX_SECONDS:
            stale = dict(hit[0])
            stale["stale"] = True
            stale["stale_seconds"] = int(age)
            stale["error"] = f"{len(errors)} proveedor(es) sin respuesta"
            logger.warning("[market_data] serving STALE %s (%ss old)", symbol, int(age))
            return stale

    # Never invent a price: an explicit failure beats a made-up number.
    # El detalle nombra al proveedor y esta respuesta es pública, así que el
    # nombre se queda en el log. `provider_status()` sí los da enteros, pero
    # cuelga de /admin/market-data-health.
    logger.warning("[market_data] %s sin cotización: %s", symbol, "; ".join(errors))
    return {
        "symbol": symbol,
        "price": None,
        "stale": False,
        "error": (f"{len(errors)} proveedor(es) sin respuesta" if errors
                  else "no hay proveedores disponibles"),
    }


def provider_status() -> List[Dict[str, Any]]:
    """Per-provider health, for the admin panel."""
    now = time.time()
    today = time.strftime("%Y-%m-%d", time.gmtime(now))
    return [
        {
            "name": p.name,
            "configured": p.enabled(),
            "calls": p.calls,
            "failures": p.failures,
            "served": p.served,
            "circuit_open": p.breaker.is_open(now),
            "consecutive_failures": p.breaker.fails,
            **p.usage(today),
        }
        for p in PROVIDERS
    ]


def cache_stats() -> Dict[str, Any]:
    with _lock:
        return {"symbols_cached": len(_cache), "ttl_seconds": QUOTE_TTL_SECONDS}


def reset_state() -> None:
    """Clear cache and breakers. For tests only."""
    with _lock:
        _cache.clear()
    for p in PROVIDERS:
        p.breaker = _Breaker()
        p.calls = p.failures = p.served = 0
        p._day, p._day_calls = "", 0
