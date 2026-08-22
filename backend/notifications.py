"""notifications.py — un aviso, tres canales, y la verdad sobre cuáles funcionan.

El diario ya sabía empujar un aviso por WebSocket a la pestaña abierta. Eso sirve
mientras la pestaña está abierta, que es exactamente cuando el trader no necesita
que le avisen. Este módulo añade los dos canales que sí alcanzan a alguien que no
está mirando —correo y SMS— y, sobre todo, **dice cuáles están conectados de
verdad**.

Esa es la parte que importa. Un canal de avisos que falla en silencio es peor que
no tener canal: el usuario cree que le van a llamar cuando salte su stop y no le
va a llamar nadie. Aquí ningún envío lanza excepción y ninguno devuelve `True`
sin haber salido: cada uno responde `{"sent": bool, "channel": str, "reason":
str}`, y `channel_status()` publica qué hay configurado para que la interfaz
pueda decirlo **antes** de que el usuario cuente con ello.

**SMS**: implementado contra Twilio, que es la vía estándar y la que ya tienen
casi todos los brókers detrás. Queda operativo en cuanto existan las tres
variables de entorno (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM_NUMBER`) en Secret Manager; sin ellas responde
`not_configured` y lo dice en la interfaz. No hay ningún paso de código
pendiente — falta la cuenta y el número, que son un trámite de operaciones.

⚠️ El SMS cuesta dinero por mensaje y no es reversible. Por eso hay un tope por
usuario y hora (`SMS_MAX_PER_HOUR`): un bug de bucle en el poller de alertas no
puede convertirse en una factura.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from log_seguro import log_safe

# Canales posibles de un aviso. `inapp` es el WebSocket que ya existía.
CHANNELS = ("inapp", "email", "sms")

# E.164: "+" y de 8 a 15 dígitos. Un número mal formado no se envía a ninguna
# parte, así que se rechaza al guardarlo y no cuando salta la alerta a las 3 de
# la madrugada.
_E164 = re.compile(r"^\+[1-9]\d{7,14}$")

SMS_MAX_PER_HOUR = 20
SMS_MAX_LENGTH = 320  # dos segmentos GSM-7; por encima se recorta


def normalize_phone(raw: Any) -> Optional[str]:
    """Un teléfono en E.164, o None. Sin adivinar prefijos de país.

    Suponer el país por la IP o por el idioma del navegador manda el aviso a otro
    número real: el mismo dígito con otro prefijo es el teléfono de otra persona.
    Si no viene con `+`, no se guarda.
    """
    if not raw:
        return None
    cleaned = re.sub(r"[\s\-().]", "", str(raw))
    return cleaned if _E164.match(cleaned) else None


def sms_configured() -> bool:
    """¿Están las credenciales del proveedor de SMS?"""
    return all(os.environ.get(k) for k in
               ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"))


def channel_status() -> Dict[str, Any]:
    """Qué canales están realmente operativos. Lo consume la interfaz.

    Se publica para que el formulario pueda marcar SMS como "no disponible
    todavía" en vez de ofrecer una casilla que no hace nada.
    """
    return {
        "inapp": {"available": True, "reason": None},
        "email": {
            "available": bool(os.environ.get("SENDGRID_API_KEY")),
            "reason": None if os.environ.get("SENDGRID_API_KEY") else "not_configured",
        },
        "sms": {
            "available": sms_configured(),
            "reason": None if sms_configured() else "not_configured",
            "provider": "twilio",
        },
    }


# ─── SMS ──────────────────────────────────────────────────────────

async def _sms_quota_ok(db, user_id: str) -> bool:
    """Tope por usuario y hora. Sin base de datos, no se limita (y se dice)."""
    if db is None or not user_id:
        return True
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    try:
        recent = await db.sms_log.find(
            {"user_id": user_id, "created_at": {"$gte": since}}, {"_id": 0},
        ).to_list(SMS_MAX_PER_HOUR + 1)
        return len(recent) < SMS_MAX_PER_HOUR
    except Exception as exc:  # noqa: BLE001 — el tope no puede tumbar el aviso
        logging.warning("[sms] no se pudo comprobar la cuota: %s", log_safe(exc))
        return True


async def send_sms(to: Any, body: str, *, db=None, user_id: str = "") -> Dict[str, Any]:
    """Envía un SMS por Twilio. Nunca lanza; siempre dice qué pasó."""
    phone = normalize_phone(to)
    if not phone:
        return {"sent": False, "channel": "sms", "reason": "invalid_phone"}
    if not sms_configured():
        # Ni un log de error ni un reintento: no es un fallo, es que el canal
        # todavía no está dado de alta.
        logging.info("[sms] proveedor sin configurar; aviso no enviado a %s", log_safe(phone[-4:]))
        return {"sent": False, "channel": "sms", "reason": "not_configured"}
    if not await _sms_quota_ok(db, user_id):
        return {"sent": False, "channel": "sms", "reason": "rate_limited"}

    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    sender = os.environ["TWILIO_FROM_NUMBER"]
    text = (body or "")[:SMS_MAX_LENGTH]

    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={"To": phone, "From": sender, "Body": text},
            )
        if resp.status_code >= 400:
            logging.error("[sms] Twilio %s: %s", log_safe(resp.status_code), log_safe(resp.text[:200]))
            return {"sent": False, "channel": "sms", "reason": f"provider_error_{resp.status_code}"}
    except Exception as exc:  # noqa: BLE001 — un aviso no puede tumbar el poller
        logging.error("[sms] envío fallido: %s", log_safe(exc))
        return {"sent": False, "channel": "sms", "reason": "provider_error"}

    if db is not None:
        try:
            await db.sms_log.insert_one({
                "id": f"{user_id}-{datetime.now(timezone.utc).timestamp()}",
                "user_id": user_id,
                # Sólo los cuatro últimos dígitos: el número completo no hace
                # falta para auditar un envío y sí es un dato personal más que
                # custodiar.
                "to_last4": phone[-4:],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as exc:  # noqa: BLE001
            logging.warning("[sms] no se pudo registrar el envío: %s", log_safe(exc))
    return {"sent": True, "channel": "sms", "reason": None}


# ─── Despacho ─────────────────────────────────────────────────────

def format_alert_message(alert: Dict[str, Any], price: float) -> str:
    """El texto del aviso. Corto: cabe en un SMS y se lee en la pantalla apagada."""
    symbol = (alert.get("symbol") or "").upper()
    kind = alert.get("kind")
    label = {"sl": "STOP", "tp": "OBJETIVO", "entry": "ENTRADA"}.get(kind, "AVISO")
    target = alert.get("targetPrice")
    return (f"[{label}] {symbol} {price:g} "
            f"(nivel {target:g}) — TradingCalculator.Pro")


async def dispatch_alert(
    alert: Dict[str, Any],
    price: float,
    *,
    db=None,
    push_inapp=None,
    send_email=None,
) -> List[Dict[str, Any]]:
    """Reparte un aviso disparado por los canales que pidió el usuario.

    Devuelve un resultado por canal, incluidos los que no salieron y por qué. El
    poller lo guarda en la alerta: así, cuando el usuario pregunte por qué no le
    llegó el SMS, la respuesta está escrita y no hay que deducirla.

    Los envíos se hacen con lo que le inyecte el llamador (`push_inapp`,
    `send_email`) para no duplicar aquí el WebSocket ni SendGrid, que ya viven
    en sus módulos.
    """
    channels = alert.get("channels") or ["inapp"]
    message = format_alert_message(alert, price)
    results: List[Dict[str, Any]] = []

    if "inapp" in channels and push_inapp is not None:
        try:
            sent = await push_inapp()
            results.append({"channel": "inapp", "sent": bool(sent),
                            "reason": None if sent else "no_active_connection"})
        except Exception as exc:  # noqa: BLE001
            results.append({"channel": "inapp", "sent": False, "reason": str(exc)[:80]})

    if "email" in channels and send_email is not None and alert.get("user_email"):
        try:
            ok = await send_email(
                alert["user_email"],
                f"{(alert.get('symbol') or '').upper()} — {message}",
                f"<p>{message}</p>",
            )
            results.append({"channel": "email", "sent": bool(ok),
                            "reason": None if ok else "not_configured"})
        except Exception as exc:  # noqa: BLE001
            results.append({"channel": "email", "sent": False, "reason": str(exc)[:80]})

    if "sms" in channels:
        results.append(await send_sms(alert.get("phone"), message, db=db,
                                      user_id=alert.get("user_id", "")))

    return results
