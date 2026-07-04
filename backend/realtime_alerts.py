"""realtime_alerts.py — WebSocket-based real-time price alerts.

Architecture:
- Background asyncio task polls market prices (CoinGecko + yfinance) every 30s.
- For every active alert, checks if the trigger condition is met.
- When triggered: marks alert.triggered=True in MongoDB, pushes a JSON
  message to the user's WebSocket connections, optionally sends email.

Frontend connects with: wss://host/api/ws/alerts?token=<JWT>
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

router = APIRouter()

# Injected at register() time
db = None  # type: ignore[assignment]
decode_token = None  # type: ignore[assignment]

# user_id → set of active WebSocket connections
_connections: Dict[str, Set[WebSocket]] = {}
_poller_task: Optional[asyncio.Task] = None
_poller_running = False

# In-memory price cache to avoid hammering external APIs
_price_cache: Dict[str, Dict[str, Any]] = {}
_cache_ts: Optional[datetime] = None
CACHE_TTL_SECONDS = 60  # refresh once per minute, well within free API limits


# ---------------------------------------------------------------------------
# WebSocket connection registry
# ---------------------------------------------------------------------------

async def _register(user_id: str, ws: WebSocket) -> None:
    _connections.setdefault(user_id, set()).add(ws)
    logging.info(f"[ws-alerts] connected user_id={user_id} (total={len(_connections[user_id])})")


async def _unregister(user_id: str, ws: WebSocket) -> None:
    if user_id in _connections:
        _connections[user_id].discard(ws)
        if not _connections[user_id]:
            del _connections[user_id]


async def _push_to_user(user_id: str, payload: dict) -> int:
    """Broadcast a JSON message to all WS connections of `user_id`. Returns count."""
    if user_id not in _connections:
        return 0
    sent = 0
    dead: List[WebSocket] = []
    for ws in list(_connections[user_id]):
        try:
            await ws.send_text(json.dumps(payload))
            sent += 1
        except Exception:
            dead.append(ws)
    for d in dead:
        _connections[user_id].discard(d)
    return sent


# ---------------------------------------------------------------------------
# Price fetcher (lightweight, cached)
# ---------------------------------------------------------------------------

_COINGECKO_MAP: Dict[str, str] = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "AVAX": "avalanche-2",
    "DOT": "polkadot", "LINK": "chainlink", "LTC": "litecoin", "MATIC": "matic-network",
    "TRX": "tron", "ATOM": "cosmos", "NEAR": "near", "APT": "aptos",
    "ARB": "arbitrum", "OP": "optimism", "INJ": "injective-protocol",
    "SUI": "sui", "TIA": "celestia",
}

# Widen with the canonical shared map (keeps the local entries as overrides).
try:
    from stock_data import COINGECKO_SYMBOL_TO_ID as _SHARED_CG_MAP
    _COINGECKO_MAP = {**_SHARED_CG_MAP, **_COINGECKO_MAP}
except Exception:  # pragma: no cover — poller still works with the local map
    pass


async def _fetch_crypto_prices(symbols: Set[str]) -> Dict[str, float]:
    """Fetch crypto prices from CoinGecko (free, cached). Retries once on 429."""
    coin_ids = [_COINGECKO_MAP[s] for s in symbols if s in _COINGECKO_MAP]
    if not coin_ids:
        return {}
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                r = await client.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": ",".join(coin_ids), "vs_currencies": "usd"},
                )
            if r.status_code == 429:
                if attempt == 0:
                    logging.warning("[ws-alerts] CoinGecko rate limited (429), retrying in 10s")
                    await asyncio.sleep(10)
                    continue
                logging.warning("[ws-alerts] CoinGecko rate limited (429), skipping cycle")
                return {}
            if r.status_code != 200:
                logging.warning("[ws-alerts] CoinGecko returned HTTP %s", r.status_code)
                return {}
            data = r.json()
            result: Dict[str, float] = {}
            for sym in symbols:
                cid = _COINGECKO_MAP.get(sym)
                if cid and cid in data:
                    result[sym] = float(data[cid].get("usd", 0))
            return result
        except Exception as e:
            logging.warning("[ws-alerts] CoinGecko fetch failed (attempt %d): %s", attempt + 1, e)
            if attempt == 0:
                await asyncio.sleep(5)
    return {}


async def _fetch_yfinance_prices(symbols: Set[str]) -> Dict[str, float]:
    """Fetch any yfinance-compatible symbol (stocks, forex, indices, commodities).
    Runs in a thread executor with a hard 30s timeout to prevent hangs."""
    if not symbols:
        return {}
    try:
        import yfinance as yf
        loop = asyncio.get_event_loop()

        def _sync_fetch():
            tickers = yf.download(
                " ".join(symbols), period="1d", interval="1m",
                progress=False, auto_adjust=True, threads=True,
            )
            close = tickers.get("Close", {})
            out: Dict[str, float] = {}
            for s in symbols:
                try:
                    series = close[s].dropna() if hasattr(close, "__getitem__") else None
                    if series is not None and len(series) > 0:
                        out[s] = float(series.iloc[-1])
                except Exception:
                    pass
            return out

        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_fetch),
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        logging.warning("[ws-alerts] yfinance fetch timed out after 30s — skipping cycle")
        return {}
    except Exception as e:
        logging.warning("[ws-alerts] yfinance fetch failed: %s", e)
        return {}


async def _refresh_price_cache(needed: Set[str]) -> None:
    """Populate _price_cache for the symbols we care about."""
    global _cache_ts
    if not needed:
        return
    now = datetime.now(timezone.utc)
    if _cache_ts and (now - _cache_ts).total_seconds() < CACHE_TTL_SECONDS:
        return
    crypto = {s for s in needed if s in _COINGECKO_MAP}
    other = needed - crypto
    crypto_prices = await _fetch_crypto_prices(crypto) if crypto else {}
    yf_prices = await _fetch_yfinance_prices(other) if other else {}
    for sym, p in {**crypto_prices, **yf_prices}.items():
        _price_cache[sym] = {"price": p, "ts": now.isoformat()}
    _cache_ts = now


# ---------------------------------------------------------------------------
# Background poller
# ---------------------------------------------------------------------------

async def _evaluate_alerts() -> int:
    """Check every active alert, fire if condition is met. Returns # triggered."""
    cursor = db.alerts.find(
        {"is_active": True, "triggered": False},
        {"_id": 0},
    )
    alerts = await cursor.to_list(length=2000)
    if not alerts:
        return 0

    # Collect all symbols we need
    symbols_needed: Set[str] = {a.get("symbol", "").upper() for a in alerts if a.get("symbol")}
    await _refresh_price_cache(symbols_needed)

    triggered = 0
    for alert in alerts:
        sym = (alert.get("symbol") or "").upper()
        target = float(alert.get("targetPrice", 0))
        condition = alert.get("condition", "above")
        cached = _price_cache.get(sym)
        if not cached:
            continue
        current = cached["price"]
        fired = (
            (condition == "above" and current >= target) or
            (condition == "below" and current <= target)
        )
        if not fired:
            continue
        # Mark as triggered
        await db.alerts.update_one(
            {"id": alert["id"]},
            {"$set": {
                "triggered": True,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "trigger_price": current,
            }},
        )
        # Push WebSocket notification
        msg = {
            "type": "alert.triggered",
            "alert_id": alert["id"],
            "symbol": sym,
            "target_price": target,
            "current_price": current,
            "condition": condition,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }
        await _push_to_user(alert["user_id"], msg)
        triggered += 1
        logging.info(f"[ws-alerts] FIRED alert {alert['id']} for user {alert['user_id']} sym={sym}")
    return triggered


async def _poller_loop() -> None:
    """Background coroutine: poll every 30 seconds."""
    global _poller_running
    _poller_running = True
    logging.info("[ws-alerts] poller started")
    try:
        while _poller_running:
            try:
                fired = await _evaluate_alerts()
                if fired:
                    logging.info(f"[ws-alerts] {fired} alerts triggered this cycle")
            except Exception as e:
                logging.error(f"[ws-alerts] poller iteration error: {e}")
            await asyncio.sleep(30)
    finally:
        _poller_running = False
        logging.info("[ws-alerts] poller stopped")


def start_poller() -> None:
    """Kick off the background poller as an asyncio task."""
    global _poller_task
    if _poller_task and not _poller_task.done():
        return
    _poller_task = asyncio.create_task(_poller_loop())


def stop_poller() -> None:
    global _poller_running
    _poller_running = False


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket, token: str = Query("")):
    """WebSocket endpoint for real-time alert pushes.
    Frontend connects: new WebSocket(`${wsUrl}/api/ws/alerts?token=${jwt}`)
    """
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    try:
        if not token:
            await websocket.close(code=4401, reason="missing_token")
            return
        try:
            payload = decode_token(token)
            user_id = payload.get("user_id")
            user_email = payload.get("email")
            if not user_id:
                logging.warning("[ws-alerts] token valid but missing user_id")
                await websocket.close(code=4401, reason="invalid_token")
                return
        except Exception as exc:
            logging.warning("[ws-alerts] token validation failed: %s", exc)
            await websocket.close(code=4401, reason="invalid_token")
            return

        # Optional: check token revocation
        try:
            jti = payload.get("jti")
            if jti and await db.revoked_tokens.find_one({"jti": jti}, {"_id": 1}):
                await websocket.close(code=4401, reason="revoked_token")
                return
        except Exception:
            pass

        await websocket.accept()
        await _register(user_id, websocket)
        await websocket.send_text(json.dumps({
            "type": "connected",
            "user_id": user_id,
            "email": user_email,
            "server_time": datetime.now(timezone.utc).isoformat(),
        }))

        # Keep connection alive: respond to client pings
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=60)
                # Echo ping → pong
                if msg.strip().lower() in ("ping", '{"type":"ping"}'):
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat"}))
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logging.error(f"[ws-alerts] websocket error: {e}")
    finally:
        if user_id:
            await _unregister(user_id, websocket)


# ---------------------------------------------------------------------------
# Status endpoint (for admin/debug)
# ---------------------------------------------------------------------------

@router.get("/alerts/realtime/status")
async def alerts_status():
    """Public status of the realtime alert poller."""
    return {
        "poller_running": _poller_running,
        "connected_users": len(_connections),
        "total_connections": sum(len(s) for s in _connections.values()),
        "cache_size": len(_price_cache),
        "cache_ts": _cache_ts.isoformat() if _cache_ts else None,
    }


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(app_router, database, helpers: Dict[str, Any]) -> None:
    global db, decode_token
    db = database
    decode_token = helpers["decode_token"]
    app_router.include_router(router)
