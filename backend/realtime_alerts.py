"""realtime_alerts.py — WebSocket-based real-time price alerts.

Architecture:
- Background asyncio task polls market prices (Binance/Kraken + yfinance) every 30s.
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

import crypto_data
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from notifications import channel_status, dispatch_alert
from log_seguro import log_safe

router = APIRouter()

# Injected at register() time
db = None  # type: ignore[assignment]
decode_token = None  # type: ignore[assignment]
# Envío de correo del servidor principal. Se inyecta porque SendGrid y su
# remitente viven allí; si no llega, el canal de correo simplemente no sale.
_send_email = None  # type: ignore[assignment]

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
    logging.info(f"[ws-alerts] connected user_id={log_safe(user_id)} (total={log_safe(len(_connections[user_id]))})")


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

# Qué símbolos son cripto. Antes era un mapa símbolo → id de CoinGecko; los ids
# ya no hacen falta (Binance y Kraken usan el símbolo), así que queda lo único
# que se consultaba de verdad: si un símbolo va por la ruta de cripto o por la
# de yfinance.
_CRYPTO_SYMBOLS: Set[str] = {
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX",
    "DOT", "LINK", "LTC", "MATIC", "TRX", "ATOM", "NEAR", "APT",
    "ARB", "OP", "INJ", "SUI", "TIA",
}

# Ampliado con el catálogo compartido, que es el que manda el frontend.
try:
    from stock_data import COINGECKO_SYMBOL_TO_ID as _SHARED_CG_MAP
    _CRYPTO_SYMBOLS |= set(_SHARED_CG_MAP)
except Exception:  # pragma: no cover — el poller sigue con la lista local
    pass


async def _fetch_crypto_prices(symbols: Set[str]) -> Dict[str, float]:
    """Precios de cripto desde las bolsas (Binance + Kraken).

    Antes salía de CoinGecko sin clave, cuyo plan gratuito no trae licencia
    comercial y que además devolvía 429 con frecuencia en este bucle: el poller
    corre cada 30 s y su límite gratuito no está pensado para eso. Binance
    acepta las 76 monedas en una sola petición por lotes.
    """
    if not symbols:
        return {}
    try:
        cotizaciones = await crypto_data.fetch_usd_prices(sorted(symbols))
    except Exception as e:  # noqa: BLE001 — una alerta no debe tumbar el poller
        logging.warning("[ws-alerts] fallo al leer precios de cripto: %s", log_safe(e))
        return {}
    # Sólo lo que se ha podido leer. Un símbolo ausente no dispara alertas, que
    # es justo lo que debe pasar: no se sabe su precio.
    return {sym: float(d["usd"]) for sym, d in cotizaciones.items() if d.get("usd")}


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
        logging.warning("[ws-alerts] yfinance fetch failed: %s", log_safe(e))
        return {}


async def _refresh_price_cache(needed: Set[str]) -> None:
    """Populate _price_cache for the symbols we care about."""
    global _cache_ts
    if not needed:
        return
    now = datetime.now(timezone.utc)
    if _cache_ts and (now - _cache_ts).total_seconds() < CACHE_TTL_SECONDS:
        return
    crypto = {s for s in needed if s in _CRYPTO_SYMBOLS}
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
        # Reparto por los canales que pidió el usuario. El WebSocket sigue
        # siendo uno de ellos, pero ya no es el único: una alerta que sólo llega
        # a la pestaña abierta avisa justo cuando no hace falta avisar.
        msg = {
            "type": "alert.triggered",
            "alert_id": alert["id"],
            "symbol": sym,
            "target_price": target,
            "current_price": current,
            "condition": condition,
            "trade_id": alert.get("trade_id"),
            "kind": alert.get("kind"),
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }
        deliveries = await dispatch_alert(
            alert, current, db=db,
            push_inapp=lambda: _push_to_user(alert["user_id"], msg),
            send_email=_send_email,
        )
        # El resultado por canal se guarda en la propia alerta: cuando el usuario
        # pregunte por qué no le llegó el SMS, la respuesta ya está escrita.
        await db.alerts.update_one(
            {"id": alert["id"]}, {"$set": {"deliveries": deliveries}},
        )
        triggered += 1
        logging.info(f"[ws-alerts] FIRED alert {log_safe(alert['id'])} for user {log_safe(alert['user_id'])} sym={log_safe(sym)}")
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
                    logging.info(f"[ws-alerts] {log_safe(fired)} alerts triggered this cycle")
            except Exception as e:
                logging.error(f"[ws-alerts] poller iteration error: {log_safe(e)}")
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
            logging.warning("[ws-alerts] token validation failed: %s", log_safe(exc))
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
        logging.error(f"[ws-alerts] websocket error: {log_safe(e)}")
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

@router.get("/alerts/channels")
async def alert_channels():
    """Qué canales de aviso están operativos ahora mismo.

    Público a propósito: el formulario del diario lo consulta para poder decir
    "SMS no disponible todavía" **antes** de que el usuario cuente con él, en vez
    de ofrecer una casilla que no hace nada.
    """
    return channel_status()


def register(app_router, database, helpers: Dict[str, Any]) -> None:
    global db, decode_token, _send_email
    db = database
    decode_token = helpers["decode_token"]
    _send_email = helpers.get("send_email")
    app_router.include_router(router)
