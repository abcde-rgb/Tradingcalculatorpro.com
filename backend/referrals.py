"""referrals.py — Referral / Affiliate program API.

Each user gets a unique referral code on first request.
- Referrer earns commission when their referee buys a paid plan.
- 10% of plan value (configurable) credited to referrer's "wallet".

⚠️ El monedero SE LLENA pero todavía NO SE GASTA. `credit_referrer_for_payment`
está enganchado a los tres caminos de cobro de `server.py`, así que el saldo se
acumula de verdad; el canje, en cambio, no llega a ninguna parte porque
`create_checkout` no lee `pending_referral_credit`. Ver `CHECKOUT_APLICA_CREDITO`
más abajo: mientras eso sea False, canjear responde 501 en vez de prometer un
descuento que no va a aplicarse. El saldo no se pierde.

Endpoints:
  GET  /referrals/me               — my code, stats, recent referrals
  POST /referrals/track            — track a referral signup (body: {code, referee_email})
  GET  /referrals/leaderboard      — top 10 referrers (admin)
  POST /referrals/redeem-credit    — apply wallet to next purchase
"""
from __future__ import annotations

import logging
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

router = APIRouter()
_security = HTTPBearer(auto_error=False)

# Injected at register()
db = None  # type: ignore[assignment]
require_user = None  # type: ignore[assignment]
require_admin = None  # type: ignore[assignment]

# Commission % credited to the referrer when referee makes a paid purchase
COMMISSION_PCT = 10.0  # 10% of the plan price

# ¿El cobro descuenta ya el crédito de referidos?
#
# Estaba escrito como si sí. `redeem_credit` marcaba el saldo «aplicado al
# próximo checkout» y devolvía un `available_after` ya descontado, y ninguna de
# las dos cosas era verdad:
#
#   · `pending_referral_credit` no lo lee NADIE. Ni `create_checkout`, ni el
#     webhook de Stripe, ni PayPal, ni NOWPayments. Se escribía en el usuario y
#     ahí se quedaba.
#   · `referral_wallet_redeemed` —de donde sale el saldo disponible— no se
#     tocaba. Así que el número que devolvía la respuesta no era el saldo del
#     usuario después de canjear: era una resta hecha para la ocasión, y en la
#     BD el saldo seguía entero.
#
# Las dos mentiras se cancelaban en la práctica porque ninguna pantalla llama a
# la ruta. En cuanto alguien le pusiera un botón, el usuario habría visto su
# saldo bajar, habría pagado el precio completo, y el dinero habría seguido en
# la cuenta sin que nada explicara el descuadre.
#
# Mientras esto sea False, canjear responde 501 y dice la verdad. El día que el
# cobro lea el crédito, `test_referrals_credito_unit.py` falla y pide ponerlo a
# True: la constante no puede quedarse desfasada en silencio.
CHECKOUT_APLICA_CREDITO = False


# ─────────────────────────────────────────────────────────────────────
# Proxy dependencies (resolved at request time, since the real callables
# are only injected by register() AFTER decoration).
# ─────────────────────────────────────────────────────────────────────
async def _require_user_proxy(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_user is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    # require_user's signature is (request, credentials) — pass both.
    return await require_user(request, credentials)


async def _require_admin_proxy(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_admin is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await require_admin(request, credentials)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_code() -> str:
    """Short, human-friendly referral code: 8 chars uppercase + digits."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _ensure_referral_code(user: dict) -> str:
    """Get or create the user's referral code, persisted on the user doc."""
    if user.get("referral_code"):
        return user["referral_code"]
    # Generate a unique code (retry on collision)
    for _ in range(10):
        code = _generate_code()
        existing = await db.users.find_one({"referral_code": code}, {"_id": 1})
        if not existing:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"referral_code": code, "referral_code_generated_at": datetime.now(timezone.utc).isoformat()}},
            )
            return code
    # Fallback: include user prefix
    fallback = (user["id"][:6].upper() + _generate_code())[:12]
    await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": fallback}})
    return fallback


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TrackReferralRequest(BaseModel):
    code: str
    referee_email: EmailStr


class CreditPaymentRequest(BaseModel):
    referee_user_id: str
    plan_id: str
    plan_amount: float
    plan_currency: str = "EUR"
    transaction_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/referrals/me")
async def my_referrals(user: dict = Depends(_require_user_proxy)):
    """Return my referral code, link, and stats."""
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    code = await _ensure_referral_code(fresh)

    # Aggregate stats
    total_signups = await db.referrals.count_documents({"referrer_id": user["id"]})
    total_paid = await db.referrals.count_documents({
        "referrer_id": user["id"], "status": "paid",
    })
    earnings_doc = await db.referrals.aggregate([
        {"$match": {"referrer_id": user["id"], "status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}},
    ]).to_list(1)
    total_earned = earnings_doc[0]["total"] if earnings_doc else 0.0

    wallet = float(fresh.get("referral_wallet", 0.0) or 0.0)
    redeemed = float(fresh.get("referral_wallet_redeemed", 0.0) or 0.0)

    # Recent referrals (last 50)
    recent = await db.referrals.find(
        {"referrer_id": user["id"]},
        {"_id": 0, "referee_email": 1, "status": 1, "commission_amount": 1, "created_at": 1, "paid_at": 1, "plan_id": 1},
    ).sort("created_at", -1).to_list(50)

    return {
        "code": code,
        "share_link_path": f"/?ref={code}",   # frontend prepends origin
        "commission_pct": COMMISSION_PCT,
        "stats": {
            "total_signups": total_signups,
            "total_paid": total_paid,
            "total_earned": round(total_earned, 2),
            "wallet_balance": saldo_disponible(fresh),
            "wallet_total_earned": round(wallet, 2),
            "wallet_redeemed": round(redeemed, 2),
            "currency": "EUR",
            # Que la pantalla que consuma esto no ofrezca un botón de canjear
            # que va a devolver 501. Es la única forma de que el frontend sepa
            # lo que el backend sabe.
            "redeemable": CHECKOUT_APLICA_CREDITO,
        },
        "recent_referrals": recent,
    }


@router.post("/referrals/track")
async def track_referral(request: Request, payload: TrackReferralRequest):
    """
    Track a new signup that came through a referral code.
    Called by the frontend after register() succeeds with `?ref=` in URL.
    Idempotent: same (referrer, referee) pair only counts once.
    """
    code = payload.code.strip().upper()
    referee_email = payload.referee_email.lower()

    referrer = await db.users.find_one({"referral_code": code}, {"_id": 0, "id": 1, "email": 1})
    if not referrer:
        raise HTTPException(status_code=404, detail="Código de referido no válido")

    # Find referee (must exist by now)
    referee = await db.users.find_one({"email": referee_email}, {"_id": 0, "id": 1})
    if not referee:
        raise HTTPException(status_code=404, detail="Usuario referido no encontrado")

    if referrer["id"] == referee["id"]:
        raise HTTPException(status_code=400, detail="No puedes referirte a ti mismo")

    # Idempotent insert
    existing = await db.referrals.find_one({
        "referrer_id": referrer["id"],
        "referee_id": referee["id"],
    })
    if existing:
        return {"ok": True, "already_tracked": True, "referral_id": existing["id"]}

    ref_doc = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer["id"],
        "referrer_email": referrer["email"],
        "referee_id": referee["id"],
        "referee_email": referee_email,
        "code": code,
        "status": "pending",            # pending → paid (when first payment)
        "commission_amount": 0.0,
        "commission_currency": "EUR",
        "ip": request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else ""),
        "user_agent": request.headers.get("user-agent", "") or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.referrals.insert_one(ref_doc)

    # Mark referee with referrer info on user doc
    await db.users.update_one(
        {"id": referee["id"]},
        {"$set": {
            "referred_by_id": referrer["id"],
            "referred_by_code": code,
            "referred_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    logging.info(f"[referrals] tracked: {referrer['email']} → {referee_email} (code={code})")
    return {"ok": True, "referral_id": ref_doc["id"]}


async def credit_referrer_for_payment(referee_user_id: str, plan_id: str,
                                      plan_amount: float, plan_currency: str = "EUR",
                                      transaction_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Called from the Stripe webhook when a referee makes a paid purchase.
    Returns the referral doc that was credited, or None if no referrer.
    """
    referee = await db.users.find_one(
        {"id": referee_user_id},
        {"_id": 0, "referred_by_id": 1, "id": 1, "email": 1},
    )
    if not referee or not referee.get("referred_by_id"):
        return None

    # If the referrer is an approved affiliate, the affiliate program (recurring
    # monthly payouts by blocks + one-time lifetime bonus) compensates them —
    # skip the one-time 10% wallet commission to avoid double-paying.
    try:
        aff = await db.affiliates.find_one(
            {"user_id": referee["referred_by_id"], "status": "approved"}, {"_id": 0, "id": 1})
        if aff:
            logging.info("[referrals] referrer %s es afiliado → wallet omitido (programa de afiliados)",
                         referee["referred_by_id"])
            return None
    except Exception as _e:
        logging.warning("[referrals] affiliate check failed: %s", _e)

    referral = await db.referrals.find_one({
        "referrer_id": referee["referred_by_id"],
        "referee_id": referee_user_id,
    })
    if not referral:
        return None
    if referral.get("status") == "paid":
        # Already credited (idempotent)
        return referral

    commission = round(plan_amount * (COMMISSION_PCT / 100.0), 2)

    await db.referrals.update_one(
        {"id": referral["id"]},
        {"$set": {
            "status": "paid",
            "commission_amount": commission,
            "commission_currency": plan_currency,
            "plan_id": plan_id,
            "plan_amount": plan_amount,
            "transaction_id": transaction_id,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    # Add commission to referrer wallet
    await db.users.update_one(
        {"id": referee["referred_by_id"]},
        {"$inc": {"referral_wallet": commission}},
    )
    logging.info(f"[referrals] credited {commission} {plan_currency} to {referral['referrer_email']} for {referee['email']}")
    return await db.referrals.find_one({"id": referral["id"]}, {"_id": 0})


@router.get("/referrals/leaderboard")
async def referral_leaderboard(admin: dict = Depends(_require_admin_proxy), limit: int = 20):
    """Top referrers by total earnings."""
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {
            "_id": "$referrer_id",
            "referrer_email": {"$first": "$referrer_email"},
            "total_earned": {"$sum": "$commission_amount"},
            "total_referees": {"$sum": 1},
        }},
        {"$sort": {"total_earned": -1}},
        {"$limit": limit},
    ]
    results = await db.referrals.aggregate(pipeline).to_list(limit)
    cleaned = [{
        "referrer_id": r["_id"],
        "referrer_email": r["referrer_email"],
        "total_earned": round(r["total_earned"], 2),
        "total_referees": r["total_referees"],
    } for r in results]
    return {"leaderboard": cleaned, "limit": limit}


def saldo_disponible(usuario: dict) -> float:
    """Lo que al usuario le queda por canjear: lo ganado menos lo ya canjeado.

    Una sola definición para las dos rutas. `/referrals/me` y el canje hacían
    cada uno la misma resta por su cuenta, que es como acaban divergiendo.
    """
    ganado = float(usuario.get("referral_wallet", 0.0) or 0.0)
    canjeado = float(usuario.get("referral_wallet_redeemed", 0.0) or 0.0)
    return round(ganado - canjeado, 2)


def cuanto_se_canjea(usuario: dict, pedido: Optional[float]) -> float:
    """Cuánto sale de este canje, o `ValueError` con el motivo.

    Sin `pedido` se canjea todo. Va aparte de la ruta porque es la parte que
    tiene que ser exacta, y la única que se puede comprobar sin una BD delante.
    """
    disponible = saldo_disponible(usuario)
    if disponible <= 0:
        raise ValueError("No hay saldo de referidos disponible")
    if pedido is None:
        return disponible
    try:
        cantidad = round(float(pedido), 2)
    except (TypeError, ValueError):
        raise ValueError(f"Monto de crédito inválido: {pedido!r}")
    if cantidad <= 0:
        raise ValueError("El crédito debe ser positivo")
    if cantidad > disponible:
        raise ValueError(f"Saldo insuficiente. Disponible: {disponible} €")
    return cantidad


@router.post("/referrals/redeem-credit")
async def redeem_credit(user: dict = Depends(_require_user_proxy), amount: Optional[float] = None):
    """
    Redeem some/all wallet balance against the next checkout.

    ⚠️ Responde 501 mientras `CHECKOUT_APLICA_CREDITO` sea False, porque el cobro
    no lee `pending_referral_credit` y el descuento no llegaría a aplicarse. Lo
    que había aquí antes afirmaba lo contrario; ver el comentario de la constante.
    """
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    try:
        redeem_amount = cuanto_se_canjea(fresh, amount)
    except ValueError as _e:
        raise HTTPException(status_code=400, detail=str(_e))

    if not CHECKOUT_APLICA_CREDITO:
        # Antes de escribir nada, para que el saldo se quede exactamente como
        # está. Decirle cuánto tiene y que no lo pierde es más útil que un 501
        # pelado, y es la única vía por la que hoy puede enterarse.
        raise HTTPException(status_code=501, detail=(
            f"Tienes {saldo_disponible(fresh)} € de saldo por referidos, pero todavía "
            "no se puede canjear solo: el cobro no aplica el crédito. El saldo sigue "
            "intacto y no caduca — escríbenos y te lo abonamos a mano."
        ))

    redemption_id = str(uuid.uuid4())
    await db.referral_redemptions.insert_one({
        "id": redemption_id,
        "user_id": user["id"],
        "amount": redeem_amount,
        "currency": "EUR",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # `$inc` sobre lo canjeado —no un `$set` con un total calculado aquí—: dos
    # canjes a la vez con `$set` se pisan y uno de los dos sale gratis. Y sin
    # este `$inc` el saldo no bajaba NUNCA, que es lo que hacía falsa la resta
    # de `available_after`.
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"referral_wallet_redeemed": redeem_amount},
         "$set": {"pending_referral_credit": redeem_amount,
                  "pending_referral_redemption_id": redemption_id}},
    )
    return {
        "ok": True,
        "redemption_id": redemption_id,
        "redeemed_amount": redeem_amount,
        "available_after": round(saldo_disponible(fresh) - redeem_amount, 2),
        "message": "Saldo aplicado al próximo checkout",
    }


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------

async def ensure_referral_indexes(database) -> None:
    try:
        await database.users.create_index("referral_code", unique=True, sparse=True)
        await database.referrals.create_index([("referrer_id", 1), ("referee_id", 1)], unique=True, name="ref_pair_unique")
        await database.referrals.create_index("referrer_id")
        await database.referrals.create_index("referee_id")
        await database.referrals.create_index("status")
        logging.info("✅ referrals indexes ensured")
    except Exception as e:
        logging.error(f"referrals index error: {e}")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(app_router, database, helpers: Dict[str, Any]) -> None:
    global db, require_user, require_admin
    db = database
    require_user = helpers["require_user"]
    require_admin = helpers["require_admin"]
    # Apply rate limit to the unauthenticated track endpoint before including router
    if helpers.get("limiter"):
        helpers["limiter"].limit("5/minute")(track_referral)
    app_router.include_router(router)
