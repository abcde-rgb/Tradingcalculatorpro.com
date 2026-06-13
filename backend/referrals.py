"""referrals.py — Referral / Affiliate program API.

Each user gets a unique referral code on first request.
- Referrer earns commission when their referee buys a paid plan.
- 10% of plan value (configurable) credited to referrer's "wallet".
- Wallet can be redeemed against future Stripe checkouts (handled in checkout flow).

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


# ─────────────────────────────────────────────────────────────────────
# Proxy dependencies (resolved at request time, since the real callables
# are only injected by register() AFTER decoration).
# ─────────────────────────────────────────────────────────────────────
async def _require_user_proxy(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_user is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await require_user(credentials)


async def _require_admin_proxy(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_admin is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await require_admin(credentials)


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

    wallet = float(fresh.get("referral_wallet", 0.0))
    redeemed = float(fresh.get("referral_wallet_redeemed", 0.0))

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
            "wallet_balance": round(wallet - redeemed, 2),
            "wallet_total_earned": round(wallet, 2),
            "wallet_redeemed": round(redeemed, 2),
            "currency": "EUR",
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


@router.post("/referrals/redeem-credit")
async def redeem_credit(user: dict = Depends(_require_user_proxy), amount: Optional[float] = None):
    """
    Redeem some/all wallet balance against the next checkout. Returns the new
    balance and a redemption record id; the checkout creation flow will read
    `pending_referral_credit` on the user doc and apply it as a Stripe coupon
    or amount discount.
    """
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    wallet_total = float(fresh.get("referral_wallet", 0.0))
    redeemed = float(fresh.get("referral_wallet_redeemed", 0.0))
    available = round(wallet_total - redeemed, 2)
    if available <= 0:
        raise HTTPException(status_code=400, detail="No hay saldo de referidos disponible")
    try:
        redeem_amount = float(amount) if amount is not None else available
        if redeem_amount <= 0:
            raise ValueError("El crédito debe ser positivo")
    except (TypeError, ValueError) as _e:
        raise HTTPException(status_code=400, detail=f"Monto de crédito inválido: {_e}")
    if redeem_amount > available:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Disponible: {available} €")

    redemption_id = str(uuid.uuid4())
    await db.referral_redemptions.insert_one({
        "id": redemption_id,
        "user_id": user["id"],
        "amount": redeem_amount,
        "currency": "EUR",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"pending_referral_credit": redeem_amount, "pending_referral_redemption_id": redemption_id}},
    )
    return {
        "ok": True,
        "redemption_id": redemption_id,
        "redeemed_amount": redeem_amount,
        "available_after": round(available - redeem_amount, 2),
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
