"""missing_apis.py

All the missing/incomplete APIs from TradingCalculator PRO:

1. Forex real prices (BCE — tipos de referencia, reutilización libre)
2. Indices real prices (yfinance)
3. Commodities real prices (yfinance GC=F, CL=F, SI=F, etc.)
4. Crypto OHLC for any symbol via yfinance (not only CoinGecko 11)
5. /auth/forgot-password  — sends reset token via email
6. /auth/reset-password   — validates token and sets new password
7. /auth/verify-email     — send + confirm email verification token
8. /subscriptions/change-plan — real Stripe proration upgrade/downgrade
9. Stripe webhook events: customer.subscription.deleted +
                          invoice.payment_failed
10. /api/performance/export  — CSV / Excel export of trades
11. /api/calculations/{id}/save-to-journal  — prefill journal from calculator
12. MongoDB unique sparse index on users.email (startup)
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import crypto_data
import ecb_rates

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from csv_seguro import csv_safe
from fastapi.responses import Response, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr
from log_seguro import log_safe


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _trusted_link_base(request: Optional[Request] = None) -> str:
    """Return a trusted base URL for links we EMAIL to users (password reset,
    email verification).

    Security: never build these links from the raw Host/Origin/Referer of the
    request. An attacker can POST /auth/forgot-password for a victim's address
    with ``Origin: https://evil.com`` (or a spoofed Host header); the victim
    then receives a reset link pointing at the attacker's site, and since the
    token travels in the URL the attacker's page can read it → account takeover
    (host-header injection, the same class as CVE PYSEC-2026-161 in Starlette).

    We only echo the request Origin back if it is explicitly allow-listed
    (matches the CORS allow-list); otherwise we fall back to the canonical
    ``FRONTEND_URL``. Never falls back to ``request.base_url``.
    """
    # El defecto tiene que ser DONDE SE SIRVE la web (hoy GitHub Pages), no el
    # dominio propio, que todavía no está en uso: si `FRONTEND_URL` se pierde en
    # un despliegue manual, un enlace de reset apuntando a un dominio muerto deja
    # al usuario igual de fuera que un login roto. Mismo valor que server.py.
    canonical = os.environ.get(
        "FRONTEND_URL", "https://abcde-rgb.github.io/Tradingcalculatorpro.com"
    ).strip().rstrip("/")
    # Lista fija, nunca derivada de la petición (ver la nota de seguridad arriba).
    allowed = {
        canonical,
        "https://abcde-rgb.github.io",
        "https://abcde-rgb.github.io/Tradingcalculatorpro.com",
        "https://tradingcalculatorpro.com",
        "https://www.tradingcalculatorpro.com",
    }
    for extra in os.environ.get("CORS_ORIGINS", "").split(","):
        extra = extra.strip().rstrip("/")
        if extra:
            allowed.add(extra)
    if os.environ.get("ENVIRONMENT", "production").strip().lower() == "development":
        allowed.update({"http://localhost:3000", "http://localhost:5173"})
    if request is not None:
        origin = (request.headers.get("origin") or "").strip().rstrip("/")
        if origin and origin in allowed:
            return origin
    return canonical


# ── These helpers are imported from the main server module at registration time
# (injected via register(router, db, helpers)).  We define placeholders here
# that get replaced by register().
db = None  # type: ignore[assignment]
require_user = None  # type: ignore[assignment]
check_premium = None  # type: ignore[assignment]
SUBSCRIPTION_PLANS: Dict[str, Any] = {}
hash_password = None  # type: ignore[assignment]
SENDGRID_API_KEY = ""
SENDER_EMAIL = ""
STRIPE_API_KEY = ""
get_setting = None  # type: ignore[assignment]
JWT_SECRET = ""
JWT_ALGORITHM = "HS256"

router = APIRouter()
security = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────────────────────────────
# Proxy dependencies — at decoration time `require_user` is None, so we
# use a proxy callable that defers resolution until request time.
# ─────────────────────────────────────────────────────────────────────
async def _require_user_proxy(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    if require_user is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    # require_user's signature is (request, credentials) — pass both.
    return await require_user(request, credentials)

# ---------------------------------------------------------------------------
# 0.  STARTUP — MongoDB unique index on users.email
# ---------------------------------------------------------------------------

async def ensure_email_unique_index(database) -> None:
    """Create a unique sparse index on users.email to prevent race-condition
    duplicate registrations at the DB level.
    This is idempotent: safe to call on every startup.
    """
    try:
        await database.users.create_index(
            "email",
            unique=True,
            sparse=True,
            name="users_email_unique",
        )
        logging.info("✅ unique index on users.email ensured")
    except Exception as e:
        logging.error(f"Could not create unique index on users.email: {log_safe(e)}")


# ---------------------------------------------------------------------------
# 1.  FOREX REAL PRICES
# ---------------------------------------------------------------------------

FOREX_PAIRS = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
    "AUDUSD", "USDCAD", "NZDUSD", "EURGBP",
    "EURJPY", "GBPJPY",
]

_FOREX_STATIC_FALLBACK: Dict[str, Dict[str, float]] = {
    "EURUSD": {"price": 1.0856, "change": 0.12, "source": "fallback"},
    "GBPUSD": {"price": 1.2734, "change": -0.08, "source": "fallback"},
    "USDJPY": {"price": 149.85, "change": 0.25, "source": "fallback"},
    "USDCHF": {"price": 0.8812, "change": -0.05, "source": "fallback"},
    "AUDUSD": {"price": 0.6542, "change": 0.18, "source": "fallback"},
    "USDCAD": {"price": 1.3564, "change": 0.03, "source": "fallback"},
    "NZDUSD": {"price": 0.5987, "change": 0.22, "source": "fallback"},
    "EURGBP": {"price": 0.8525, "change": 0.15, "source": "fallback"},
    "EURJPY": {"price": 162.68, "change": 0.38, "source": "fallback"},
    "GBPJPY": {"price": 190.78, "change": 0.17, "source": "fallback"},
}


async def _fetch_forex_ecb() -> Optional[Dict[str, Any]]:
    """Tipos del BCE. Sustituye a ExchangeRate-API y a yfinance.

    El motivo es de licencia: el BCE publica sus tipos de referencia para que
    se reutilicen, sin contrato ni cuota y sin que importe que quien los
    muestre cobre por su servicio. Yahoo no tiene licencia para esto y
    ExchangeRate-API exige una atribución que la web no estaba dando.

    Contrapartida honesta: el BCE publica UNA VEZ por día hábil, sobre las
    16:00 CET, así que estos tipos no se mueven intradía. A cambio la variación
    diaria pasa a ser real — la ruta anterior mandaba `change: 0.0` en todos
    los pares siempre, que no era un cero sino un "no lo sé" disfrazado.
    """
    result = await ecb_rates.fetch_rates(FOREX_PAIRS)
    return result or None


@router.get("/forex-prices")
async def get_forex_prices_real():
    """Precios de forex reales, del BCE."""
    result = await _fetch_forex_ecb()
    if result:
        return result
    return _FOREX_STATIC_FALLBACK


# ---------------------------------------------------------------------------
# 2.  INDICES REAL PRICES
# ---------------------------------------------------------------------------

_INDICES_MAP: Dict[str, str] = {
    "SPX":  "^GSPC",
    "NDX":  "^NDX",
    "DJI":  "^DJI",
    "DAX":  "^GDAXI",
    "FTSE": "^FTSE",
    "N225": "^N225",
    "HSI":  "^HSI",
    "CAC":  "^FCHI",
    "VIX":  "^VIX",
    "RUT":  "^RUT",
}

_INDICES_STATIC_FALLBACK: Dict[str, Any] = {
    "SPX":  {"price": 5998.50, "change": 0.45, "source": "fallback"},
    "NDX":  {"price": 21245.80, "change": 0.68, "source": "fallback"},
    "DJI":  {"price": 44235.20, "change": 0.32, "source": "fallback"},
    "DAX":  {"price": 19785.60, "change": 0.28, "source": "fallback"},
    "FTSE": {"price": 8265.40, "change": 0.15, "source": "fallback"},
    "N225": {"price": 38542.80, "change": 0.52, "source": "fallback"},
    "HSI":  {"price": 19876.30, "change": -0.25, "source": "fallback"},
}


@router.get("/indices-prices")
async def get_indices_prices_real():
    """Real index prices from yfinance."""
    try:
        import yfinance as yf
        symbols = list(_INDICES_MAP.values())
        tickers = yf.download(" ".join(symbols), period="2d", interval="1d", progress=False, auto_adjust=True)
        close = tickers.get("Close", {})
        result: Dict[str, Any] = {}
        for label, sym in _INDICES_MAP.items():
            try:
                series = close[sym].dropna()
                if len(series) >= 2:
                    price = float(series.iloc[-1])
                    prev = float(series.iloc[-2])
                    change = round((price - prev) / prev * 100, 4) if prev else 0.0
                    result[label] = {"price": round(price, 2), "change": change, "source": "market"}
                elif len(series) == 1:
                    result[label] = {"price": round(float(series.iloc[-1]), 2), "change": 0.0, "source": "market"}
            except Exception:
                if label in _INDICES_STATIC_FALLBACK:
                    result[label] = _INDICES_STATIC_FALLBACK[label]
        if result:
            return result
    except Exception as e:
        logging.error(f"Indices yfinance error: {log_safe(e)}")
    return _INDICES_STATIC_FALLBACK


# ---------------------------------------------------------------------------
# 3.  COMMODITIES REAL PRICES
# ---------------------------------------------------------------------------

_COMMODITY_MAP: Dict[str, str] = {
    "gold":        "GC=F",
    "silver":      "SI=F",
    "crude_oil":   "CL=F",
    "brent":       "BZ=F",
    "natural_gas": "NG=F",
    "copper":      "HG=F",
    "platinum":    "PL=F",
    "wheat":       "ZW=F",
    "corn":        "ZC=F",
    "soybeans":    "ZS=F",
}

_COMMODITY_STATIC: Dict[str, Any] = {
    "gold":        {"usd": 2680, "eur": 2450, "usd_24h_change": 0.5, "source": "fallback"},
    "silver":      {"usd": 31.50, "eur": 28.80, "usd_24h_change": 0.8, "source": "fallback"},
    "crude_oil":   {"usd": 78.0, "eur": 71.5, "usd_24h_change": 0.3, "source": "fallback"},
    "brent":       {"usd": 82.0, "eur": 75.0, "usd_24h_change": 0.2, "source": "fallback"},
    "natural_gas": {"usd": 2.5, "eur": 2.3, "usd_24h_change": -0.5, "source": "fallback"},
    "copper":      {"usd": 4.2, "eur": 3.85, "usd_24h_change": 0.6, "source": "fallback"},
}


@router.get("/commodities-prices")
async def get_commodities_prices_real():
    """Real commodity prices from yfinance futures contracts."""
    try:
        import yfinance as yf
        # Fetch EUR/USD for conversion
        eur_usd = 0.917
        try:
            fx = yf.Ticker("EURUSD=X")
            hist = fx.history(period="2d")
            if not hist.empty:
                eur_usd = 1 / float(hist["Close"].iloc[-1])
        except Exception:
            pass

        result: Dict[str, Any] = {}
        for label, sym in _COMMODITY_MAP.items():
            try:
                t = yf.Ticker(sym)
                hist = t.history(period="2d")
                if hist.empty:
                    continue
                price = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else price
                change = round((price - prev) / prev * 100, 4) if prev else 0.0
                result[label] = {
                    "usd": round(price, 4),
                    "eur": round(price * eur_usd, 4),
                    "usd_24h_change": change,
                    "symbol": sym,
                    "source": "market",
                }
            except Exception as e:
                logging.warning(f"Commodity {log_safe(sym)} fetch error: {log_safe(e)}")
                if label in _COMMODITY_STATIC:
                    result[label] = _COMMODITY_STATIC[label]
        return result if result else _COMMODITY_STATIC
    except Exception as e:
        logging.error(f"Commodities error: {log_safe(e)}")
        return _COMMODITY_STATIC


# ---------------------------------------------------------------------------
# 5 + 6.  FORGOT PASSWORD / RESET PASSWORD
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


async def _send_reset_email(to_email: str, reset_url: str) -> bool:
    """Send password reset email via SendGrid."""
    if not SENDGRID_API_KEY:
        logging.warning("SendGrid not configured — reset email not sent")
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        msg = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject="🔐 Restablecer contraseña — Trading Calculator PRO",
            html_content=f"""
            <html><body style="font-family:Arial,sans-serif;background:#1a1a1a;color:#fff;padding:20px">
            <div style="max-width:600px;margin:0 auto;background:#2a2a2a;padding:30px;border-radius:10px">
                <h1 style="color:#00E676">Trading Calculator PRO</h1>
                <h2>Restablecer tu contraseña</h2>
                <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                <p style="margin:30px 0">
                    <a href="{reset_url}" style="background:#00E676;color:#000;padding:14px 28px;
                       border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
                        Restablecer contraseña
                    </a>
                </p>
                <p style="color:#888">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este email.</p>
            </div>
            </body></html>
            """,
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(msg)
        return True
    except Exception as e:
        logging.error(f"Reset email error: {log_safe(e)}")
        return False


# ── RUTAS RETIRADAS: /auth/forgot-password y /auth/reset-password ──────────
#
# Estaban declaradas aquí Y en server.py. server.py se registra primero, así que
# FastAPI servía SIEMPRE la suya y estas dos nunca se ejecutaron: eran código
# muerto que además usaba OTRA colección (`password_reset_tokens` en vez de
# `password_resets`), con el riesgo evidente de que alguien arreglara un bug
# aquí y creyera que estaba resuelto.
#
# Las de server.py son además las mejores: llevan `@limiter.limit("3/hour")`,
# que estas no tenían.
#
# Los índices de `password_reset_tokens` (más abajo, en la creación de índices)
# se dejan: la colección puede contener filas de antes de este cambio.

# ---------------------------------------------------------------------------
# 7.  EMAIL VERIFICATION
# ---------------------------------------------------------------------------

class VerifyEmailRequest(BaseModel):
    token: str


async def _send_verification_email(to_email: str, verify_url: str) -> bool:
    if not SENDGRID_API_KEY:
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        msg = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject="✅ Verifica tu email — Trading Calculator PRO",
            html_content=f"""
            <html><body style="font-family:Arial,sans-serif;background:#1a1a1a;color:#fff;padding:20px">
            <div style="max-width:600px;margin:0 auto;background:#2a2a2a;padding:30px;border-radius:10px">
                <h1 style="color:#00E676">Trading Calculator PRO</h1>
                <h2>Verifica tu dirección de email</h2>
                <p style="margin:30px 0">
                    <a href="{verify_url}" style="background:#00E676;color:#000;padding:14px 28px;
                       border-radius:8px;text-decoration:none;font-weight:bold">
                        Verificar email
                    </a>
                </p>
                <p style="color:#888">Este enlace expira en 24 horas.</p>
            </div>
            </body></html>
            """,
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(msg)
        return True
    except Exception as e:
        logging.error(f"Verification email error: {log_safe(e)}")
        return False


@router.post("/auth/send-verification-email")
async def send_verification_email(request: Request, user: dict = Depends(_require_user_proxy)):
    """Send (or resend) an email-verification link for the logged-in user."""
    if user.get("email_verified"):
        return {"ok": True, "message": "Email ya verificado"}

    token = uuid.uuid4().hex + uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.email_verification_tokens.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "email": user["email"],
            "token": token,
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
            "used": False,
        }},
        upsert=True,
    )
    # Trusted, allow-listed origin only (never raw Host/Origin → token leak).
    origin = _trusted_link_base(request)
    verify_url = f"{origin}/verify-email?token={token}"
    sent = await _send_verification_email(user["email"], verify_url)
    resp: Dict[str, Any] = {"ok": True, "message": "Email de verificación enviado"}
    if not sent:
        resp["dev_token"] = token
        resp["dev_verify_url"] = verify_url
    return resp


@router.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    """Confirm email ownership using the token from the verification email."""
    rec = await db.email_verification_tokens.find_one({"token": payload.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="El token ha expirado. Solicita uno nuevo.")

    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"email_verified": True, "email_verified_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.email_verification_tokens.update_one(
        {"token": payload.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True, "message": "Email verificado correctamente"}


# ---------------------------------------------------------------------------
# 8.  SUBSCRIPTIONS — REAL change-plan (Stripe proration)
# ---------------------------------------------------------------------------

class ChangePlanRequest(BaseModel):
    new_plan_id: str
    proration_behavior: str = "create_prorations"  # or "none"


@router.post("/subscriptions/change-plan")
async def change_plan_real(payload: ChangePlanRequest, user: dict = Depends(_require_user_proxy)):
    """
    Upgrade or downgrade an active Stripe subscription via proration.
    Requires the user to have a Stripe customer + subscription.
    If neither exists, redirects to checkout.
    """
    if payload.new_plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plan inválido")

    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Runtime Stripe key
    runtime_key = (await get_setting("stripe_secret_key")) or STRIPE_API_KEY
    stripe.api_key = runtime_key

    customer_id = user_doc.get("stripe_customer_id")
    subscription_id = user_doc.get("stripe_subscription_id")

    if not customer_id or not subscription_id:
        return {
            "ok": False,
            "redirect_to_checkout": True,
            "message": "No hay suscripción activa en Stripe. Realiza una nueva compra.",
            "new_plan_id": payload.new_plan_id,
        }

    try:
        sub = await asyncio.to_thread(stripe.Subscription.retrieve, subscription_id)
        if sub.status not in ("active", "trialing"):
            return {
                "ok": False,
                "redirect_to_checkout": True,
                "message": f"La suscripción actual no está activa (estado: {sub.status}). Realiza una nueva compra.",
            }

        # Get current subscription item id
        item_id = sub["items"]["data"][0]["id"]
        new_plan = SUBSCRIPTION_PLANS[payload.new_plan_id]

        # We need a Stripe Price ID for the new plan.
        # Look it up from our app_settings or create a one-off price.
        price_key = f"stripe_price_{payload.new_plan_id}"
        stripe_price_id = await get_setting(price_key)

        if not stripe_price_id:
            # Create an ad-hoc price for this plan
            price_obj = await asyncio.to_thread(
                stripe.Price.create,
                currency=new_plan["currency"].lower(),
                unit_amount=int(new_plan["price"] * 100),
                recurring={"interval": new_plan.get("stripe_interval", "month")},
                product_data={"name": f"Trading Calculator PRO — {new_plan['name']}"},
            )
            stripe_price_id = price_obj.id

        updated_sub = await asyncio.to_thread(
            stripe.Subscription.modify,
            subscription_id,
            items=[{"id": item_id, "price": stripe_price_id}],
            proration_behavior=payload.proration_behavior,
        )

        # Update our DB — use Stripe's REAL period end (not now + plan days, which
        # ignored the proration/renewal date and drifted from the source of truth).
        period_end = getattr(updated_sub, "current_period_end", None)
        new_end = (
            datetime.fromtimestamp(int(period_end), tz=timezone.utc)
            if period_end
            else datetime.now(timezone.utc) + timedelta(days=new_plan["days"])
        )
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "subscription_plan": payload.new_plan_id,
                "subscription_end": new_end.isoformat(),
                "is_premium": True,
            }},
        )
        return {
            "ok": True,
            "message": f"Plan cambiado a {new_plan['name']} correctamente.",
            "new_plan_id": payload.new_plan_id,
            "subscription_status": updated_sub.status,
            "proration_behavior": payload.proration_behavior,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Error de Stripe: {e.user_message or str(e)}")
    except Exception as e:
        logging.error(f"change_plan_real error: {log_safe(e)}")
        raise HTTPException(status_code=500, detail="Error cambiando plan")


# ---------------------------------------------------------------------------
# ⚠️ ESTE MANEJADOR DUPLICA LOS TRES EVENTOS DEL WEBHOOK PRINCIPAL.
#
# `POST /webhook/stripe` en `server.py` atiende ya `customer.subscription.deleted`,
# `invoice.payment_failed` y `customer.subscription.updated`. Este vive en otra
# ruta, así que el guardián de rutas duplicadas (G-04) no lo ve: para él son dos
# `(método, path)` distintos.
#
# La divergencia costaba datos: el de `server.py` marca `premium_lapsed_at`, que
# es lo que arranca el reloj de purga a DATA_RETENTION_DAYS. Éste no lo hacía,
# así que si Stripe apuntaba aquí el reloj no empezaba NUNCA y los datos de un
# usuario que dejó de pagar se quedaban indefinidamente — justo lo que la
# política de retención existe para evitar.
#
# No se retira la ruta porque puede haber un endpoint de Stripe configurado
# contra ella y perder eventos es peor que duplicarlos (los dos manejadores son
# idempotentes). Lo que se cierra es la divergencia. Si algún día se unifica,
# hay que repuntar el endpoint en el panel de Stripe ANTES de borrarla.
#
# 9.  STRIPE WEBHOOK — subscription.deleted + invoice.payment_failed
#     (This is an ADDITIONAL handler; the main checkout.session.completed is
#      still handled by the existing /webhook/stripe in server.py)
# ---------------------------------------------------------------------------

@router.post("/webhook/stripe/subscription")
async def stripe_subscription_webhook(request: Request) -> Dict[str, str]:
    """
    Handle Stripe subscription lifecycle events:
    - customer.subscription.deleted  → deactivate user premium
    - invoice.payment_failed         → mark subscription past_due
    - customer.subscription.updated  → sync status changes
    """
    payload_bytes = await request.body()
    sig = request.headers.get("Stripe-Signature", "")

    runtime_key = (await get_setting("stripe_secret_key")) or STRIPE_API_KEY
    webhook_secret = (await get_setting("stripe_webhook_secret")) or os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    stripe.api_key = runtime_key

    if not webhook_secret:
        logging.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured — rejecting")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload_bytes, sig, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as e:
        logging.error(f"Stripe webhook parse error: {log_safe(e)}")
        raise HTTPException(status_code=400, detail="Bad webhook payload")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    if event_type == "customer.subscription.deleted":
        customer_id = data_obj.get("customer")
        if customer_id:
            user = await db.users.find_one({"stripe_customer_id": customer_id}, {"_id": 0})
            if user:
                await db.users.update_one(
                    {"stripe_customer_id": customer_id},
                    {"$set": {
                        "is_premium": False,
                        "subscription_plan": None,
                        "subscription_end": None,
                        "subscription_status": "canceled",
                        "stripe_subscription_id": None,
                        "subscription_canceled_at": datetime.now(timezone.utc).isoformat(),
                        # Arranca (o conserva) el reloj de retención. Sin esto
                        # los datos del usuario no se purgan jamás.
                        "premium_lapsed_at": user.get("premium_lapsed_at")
                        or datetime.now(timezone.utc).isoformat(),
                    }},
                )
                logging.info(f"Subscription deleted for customer {log_safe(customer_id)} ({log_safe(user.get('email'))})")

    elif event_type == "invoice.payment_failed":
        customer_id = data_obj.get("customer")
        attempt = data_obj.get("attempt_count", 1)
        if customer_id:
            update: Dict[str, Any] = {"subscription_status": "past_due"}
            # After 3 failed attempts, revoke premium access
            if attempt and int(attempt) >= 3:
                update["is_premium"] = False
                update["subscription_plan"] = None
                update["subscription_status"] = "unpaid"
                _prev = await db.users.find_one(
                    {"stripe_customer_id": customer_id}, {"_id": 0, "premium_lapsed_at": 1}
                ) or {}
                update["premium_lapsed_at"] = (
                    _prev.get("premium_lapsed_at") or datetime.now(timezone.utc).isoformat()
                )
                logging.warning(f"Payment failed {log_safe(attempt)}x for {log_safe(customer_id)} — premium revoked")
            await db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": update},
            )

    elif event_type == "customer.subscription.updated":
        customer_id = data_obj.get("customer")
        status = data_obj.get("status")
        if customer_id and status:
            is_active = status in ("active", "trialing")
            update: Dict[str, Any] = {"subscription_status": status, "is_premium": is_active}
            if not is_active:
                _prev = await db.users.find_one(
                    {"stripe_customer_id": customer_id}, {"_id": 0, "premium_lapsed_at": 1}
                ) or {}
                update["premium_lapsed_at"] = (
                    _prev.get("premium_lapsed_at") or datetime.now(timezone.utc).isoformat()
                )
            # Keep the local period end in sync on auto-renewal / plan change,
            # otherwise subscription_end drifts stale after every renewal.
            period_end = data_obj.get("current_period_end")
            if period_end:
                update["subscription_end"] = datetime.fromtimestamp(
                    int(period_end), tz=timezone.utc
                ).isoformat()
            # Reflect a pending "cancel at period end" so the UI can warn the user.
            if "cancel_at_period_end" in data_obj:
                update["subscription_cancel_at_period_end"] = bool(
                    data_obj.get("cancel_at_period_end")
                )
            await db.users.update_one(
                {"stripe_customer_id": customer_id},
                {"$set": update},
            )

    return {"status": "received", "event": event_type}


# ---------------------------------------------------------------------------
# 10.  PERFORMANCE EXPORT (CSV / Excel)
# ---------------------------------------------------------------------------

_TRADE_EXPORT_FIELDS = [
    "id", "symbol", "side", "setup", "entry_price", "exit_price",
    "sl", "tp", "quantity", "pnl", "pnl_pct", "roe", "fees",
    "entry_date", "exit_date", "status", "notes", "tags", "emotion",
]


def _trades_to_csv_bytes(trades: List[Dict[str, Any]]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_TRADE_EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for t in trades:
        row = {k: t.get(k, "") for k in _TRADE_EXPORT_FIELDS}
        if isinstance(row.get("tags"), list):
            row["tags"] = ",".join(row["tags"])
        # Aquí el que exporta y el que abre suelen ser la misma persona, así que
        # parece que no hace falta. Se sanea igual: en cuanto alguien manda su
        # diario a un mentor o a su gestor —que es lo normal— deja de serlo, y
        # el símbolo y las notas los teclea el usuario.
        writer.writerow({k: csv_safe(v) for k, v in row.items()})
    return buf.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility


def _trades_to_excel_bytes(trades: List[Dict[str, Any]]) -> bytes:
    """Generate an Excel file. Uses openpyxl if available, falls back to CSV."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Trades"
        # Header row with styling
        header_fill = PatternFill("solid", fgColor="004C97")
        for col_idx, field in enumerate(_TRADE_EXPORT_FIELDS, start=1):
            cell = ws.cell(row=1, column=col_idx, value=field.upper())
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = header_fill
        # Data rows
        for row_idx, trade in enumerate(trades, start=2):
            for col_idx, field in enumerate(_TRADE_EXPORT_FIELDS, start=1):
                val = trade.get(field, "")
                if isinstance(val, list):
                    val = ",".join(str(v) for v in val)
                ws.cell(row=row_idx, column=col_idx, value=val)
        buf_bytes = io.BytesIO()
        wb.save(buf_bytes)
        return buf_bytes.getvalue()
    except ImportError:
        # openpyxl not installed, return CSV
        return _trades_to_csv_bytes(trades)


@router.get("/performance/export")
async def export_trades(
    user: dict = Depends(_require_user_proxy),
    format: str = "csv",   # "csv" or "excel"
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    since: Optional[str] = None,
    until: Optional[str] = None,
):
    """
    Export all trades to CSV or Excel.
    Query params: format=csv|excel, status=open|closed, symbol=AAPL, since=2024-01-01, until=2024-12-31
    """
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Función premium requerida")
    query: Dict[str, Any] = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if symbol:
        query["symbol"] = symbol.upper()
    if since or until:
        date_filter: Dict[str, Any] = {}
        if since:
            date_filter["$gte"] = since
        if until:
            date_filter["$lte"] = until
        query["entry_date"] = date_filter

    cursor = db.trades.find(query, {"_id": 0}).sort("entry_date", -1)
    trades = await cursor.to_list(length=10000)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    if format.lower() == "excel":
        content = _trades_to_excel_bytes(trades)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"trades_{ts}.xlsx"
    else:
        content = _trades_to_csv_bytes(trades)
        media_type = "text/csv; charset=utf-8"
        filename = f"trades_{ts}.csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# 11.  SAVE CALCULATION TO JOURNAL
# ---------------------------------------------------------------------------

class SaveToJournalRequest(BaseModel):
    symbol: str = ""
    direction: str = "long"       # long | short
    entry_price: Optional[float] = None
    quantity: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/calculations/{calc_id}/save-to-journal")
async def save_calculation_to_journal(calc_id: str, payload: SaveToJournalRequest, user: dict = Depends(_require_user_proxy)):
    """
    Pre-fill a new journal trade entry from a saved calculation.
    The calculation inputs/results are merged with any overrides in the payload.
    """
    if not check_premium(user):
        raise HTTPException(status_code=403, detail="Función premium requerida")
    calc = await db.calculations.find_one({"id": calc_id, "user_id": user["id"]}, {"_id": 0})
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")

    inputs = calc.get("inputs", {})
    results = calc.get("results", {})

    # Merge: explicit payload fields override inferred from calculation
    symbol = payload.symbol or inputs.get("symbol", "UNKNOWN")
    direction = payload.direction or inputs.get("direction", "long")
    entry_price = payload.entry_price or inputs.get("entry_price") or inputs.get("entryPrice") or 0.0
    quantity = payload.quantity or inputs.get("quantity") or inputs.get("positionSize") or 1.0
    stop_loss = payload.stop_loss or inputs.get("stop_loss") or inputs.get("stopLoss")
    take_profit = payload.take_profit or inputs.get("take_profit") or inputs.get("takeProfit")
    notes_base = payload.notes or ""
    auto_note = (
        f"[Auto] Creado desde cálculo: {calc.get('calculator_type', 'calculadora')} — "
        f"Resultado: {results}"
    )
    notes = f"{notes_base}\n{auto_note}".strip() if notes_base else auto_note

    trade_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "symbol": symbol.upper(),
        "side": direction,
        # Journal v2 fields (performance module)
        "entry_price": float(entry_price),
        "exit_price": None,
        "sl": float(stop_loss) if stop_loss else None,
        "tp": float(take_profit) if take_profit else None,
        "quantity": float(quantity),
        "status": "open",
        "notes": notes,
        "tags": payload.tags or [f"calc:{calc.get('calculator_type', 'calc')}"],
        "entry_date": datetime.now(timezone.utc).isoformat(),
        "exit_date": None,
        "fees": 0.0,
        "emotion": None,
        "account_balance": 0.0,
        "source_calculation_id": calc_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.trades.insert_one(trade_doc)
    trade_doc.pop("_id", None)
    return {
        "ok": True,
        "trade_id": trade_doc["id"],
        "message": f"Trade pre-rellenado desde cálculo y añadido al diario.",
        "trade": trade_doc,
    }


# ---------------------------------------------------------------------------
# TTL indexes for new collections added in this module
# ---------------------------------------------------------------------------

async def ensure_missing_api_indexes(database) -> None:
    """Create TTL and query indexes for new collections."""
    try:
        # password_reset_tokens: auto-expire 2h after expiry
        await database.password_reset_tokens.create_index(
            "expires_at", expireAfterSeconds=7200, name="prt_ttl",
        )
        await database.password_reset_tokens.create_index("token", unique=True, sparse=True)
        await database.password_reset_tokens.create_index("user_id")

        # email_verification_tokens
        await database.email_verification_tokens.create_index(
            "expires_at", expireAfterSeconds=86400, name="evt_ttl",
        )
        await database.email_verification_tokens.create_index("token", unique=True, sparse=True)
        await database.email_verification_tokens.create_index("user_id")

        # Unique email index
        await ensure_email_unique_index(database)

        logging.info("✅ missing_apis indexes ensured")
    except Exception as e:
        logging.error(f"missing_apis index error: {log_safe(e)}")


# ---------------------------------------------------------------------------
# REGISTRATION HELPER — called from server.py startup
# ---------------------------------------------------------------------------

def register(
    app_router: APIRouter,
    database,
    helpers: Dict[str, Any],
) -> None:
    """
    Bind this module's router to the main app router and inject shared
    dependencies (db, auth helpers, config) so we avoid circular imports.

    Call from server.py after creating `api_router`:

        from missing_apis import router as missing_router, register as register_missing
        register_missing(api_router, db, {
            "require_user": require_user,
            "check_premium": check_premium,
            "SUBSCRIPTION_PLANS": SUBSCRIPTION_PLANS,
            "hash_password": hash_password,
            "SENDGRID_API_KEY": SENDGRID_API_KEY,
            "SENDER_EMAIL": SENDER_EMAIL,
            "STRIPE_API_KEY": STRIPE_API_KEY,
            "get_setting": get_setting,
        })
    """
    global db, require_user, check_premium, SUBSCRIPTION_PLANS
    global hash_password, SENDGRID_API_KEY, SENDER_EMAIL, STRIPE_API_KEY, get_setting

    db = database
    require_user = helpers["require_user"]
    check_premium = helpers["check_premium"]
    SUBSCRIPTION_PLANS = helpers["SUBSCRIPTION_PLANS"]
    hash_password = helpers["hash_password"]
    SENDGRID_API_KEY = helpers["SENDGRID_API_KEY"]
    SENDER_EMAIL = helpers["SENDER_EMAIL"]
    STRIPE_API_KEY = helpers["STRIPE_API_KEY"]
    get_setting = helpers["get_setting"]

    app_router.include_router(router)
