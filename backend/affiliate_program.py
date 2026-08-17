"""affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen).

Modelo (decidido con el propietario):
  - Cuenta SOLO suscriptores de pago ACTIVOS (no registros gratis, no trials).
  - RECURRENTES → por bloques de 1000 con suelo en 1000:
        pago/mes = ⌊activos / block_size⌋ × block_reward_eur   (1000 → 1000 €)
  - LIFETIME → bonus único de 50 € por referido (una sola vez), excluido de los bloques.
  - Pagos MANUALES (Fase 1): el admin genera la liquidación y marca los pagos.

Atribución: reutiliza `referred_by_id` (lo pone `referrals.py` al registrarse con ?ref=CODE).
El código de afiliado = el `referral_code` del usuario. Todo se deriva EN VIVO de las
suscripciones reales; no se mantiene ninguna lista a mano.

Endpoints:
  Afiliado  (require_user):
    POST /affiliate/apply            — solicitar alta (acepta términos)
    GET  /affiliate/me               — panel self-service (datos, referidos enmascarados, cobros)
    PUT  /affiliate/payout-details   — método + datos de cobro/fiscales (cifrados)
  Admin     (require_admin):
    GET  /admin/affiliates                         — lista SEPARADA de clientes (+ contadores)
    GET  /admin/affiliates/{aid}                   — ficha + SUS referidos + histórico
    POST /admin/affiliates/{aid}/approve|reject|suspend
    PATCH/admin/affiliates/{aid}                   — override de tarifa/notas
    POST /admin/affiliates/payout-run?period=YYYY-MM   — genera/recomputa borrador
    POST /admin/affiliates/payout-run/{rid}/finalize   — congela + sella bonus lifetime
    GET  /admin/affiliates/payout-runs                 — lista de liquidaciones
    GET  /admin/affiliates/payout-runs/{rid}           — detalle + líneas
    POST /admin/affiliates/payout-lines/{lid}/mark-paid
    GET  /admin/affiliates/payout-runs/{rid}/export.csv
"""
from __future__ import annotations

import csv
import io
import logging
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

router = APIRouter()
_security = HTTPBearer(auto_error=False)

# Injected at register()
db = None  # type: ignore[assignment]
require_user = None  # type: ignore[assignment]
require_admin = None  # type: ignore[assignment]
get_setting = None  # type: ignore[assignment]
_encrypt = lambda v: v  # type: ignore[assignment]
_decrypt = lambda v: v  # type: ignore[assignment]
_free_access_emails: set = set()  # correos con acceso libre (comp) — cuentan como de pago

# Defaults (overridable via app settings)
DEFAULT_BLOCK_SIZE = 1000
DEFAULT_BLOCK_REWARD_EUR = 1000.0
DEFAULT_LIFETIME_BONUS_EUR = 50.0

_MAX_LIST = 100000  # generous cap for internal to_list() calls


# ─────────────────────────────────────────────────────────────────────
# Proxy dependencies (resolved at request time — real callables injected
# by register() AFTER decoration).
# ─────────────────────────────────────────────────────────────────────
async def _require_user_proxy(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_user is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await require_user(request, credentials)


async def _require_admin_proxy(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> Dict[str, Any]:
    if require_admin is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await require_admin(request, credentials)


# ---------------------------------------------------------------------------
# Config / helpers
# ---------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso() -> str:
    return _now().isoformat()


async def _config() -> Dict[str, float]:
    """Read live config from app settings, with safe fallbacks."""
    def _num(raw: Any, default: float) -> float:
        try:
            return float(raw)
        except (TypeError, ValueError):
            return default

    bs = br = lb = ""
    if get_setting is not None:
        try:
            bs = await get_setting("affiliate_block_size")
            br = await get_setting("affiliate_block_reward_eur")
            lb = await get_setting("affiliate_lifetime_bonus_eur")
        except Exception:
            pass
    block_size = int(_num(bs, DEFAULT_BLOCK_SIZE))
    if block_size < 1:
        block_size = DEFAULT_BLOCK_SIZE
    return {
        "block_size": block_size,
        "block_reward_eur": _num(br, DEFAULT_BLOCK_REWARD_EUR),
        "lifetime_bonus_eur": _num(lb, DEFAULT_LIFETIME_BONUS_EUR),
    }


def _generate_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


async def _ensure_referral_code(user: dict) -> str:
    """Get or create the user's referral code (= affiliate code)."""
    if user.get("referral_code"):
        return user["referral_code"]
    for _ in range(10):
        code = _generate_code()
        existing = await db.users.find_one({"referral_code": code}, {"_id": 1})
        if not existing:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"referral_code": code, "referral_code_generated_at": _iso()}},
            )
            return code
    fallback = (user["id"][:6].upper() + _generate_code())[:12]
    await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": fallback}})
    return fallback


def _sub_end_future(u: dict) -> bool:
    end = u.get("subscription_end")
    if not end:
        return False
    try:
        return datetime.fromisoformat(str(end).replace("Z", "+00:00")) > _now()
    except Exception:
        return False


def _is_active_paying_recurring(u: dict) -> bool:
    """Suscriptor de pago activo que CUENTA para los bloques (excluye lifetime y trials)."""
    if not u.get("is_premium"):
        return False
    if u.get("subscription_status") == "trialing":  # D3: los trials no cuentan
        return False
    if u.get("subscription_plan") == "lifetime":  # lifetime → bonus aparte, no bloques
        return False
    return _sub_end_future(u)


def _is_active_lifetime(u: dict) -> bool:
    return bool(u.get("is_premium")) and u.get("subscription_plan") == "lifetime"


def _is_paying_member(u: dict) -> bool:
    """El PROPIO usuario es suscriptor de pago (requisito para ser afiliado).
    Excluye la prueba de 7 días (`trialing`). Lifetime y de pago activo sí valen."""
    # Cuentas con acceso libre (comp) cuentan como de pago (mientras no hay facturación).
    if (u.get("email") or "").lower() in _free_access_emails:
        return True
    if not u.get("is_premium"):
        return False
    if u.get("subscription_status") == "trialing":   # durante la prueba NO
        return False
    if u.get("subscription_plan") == "lifetime":
        return True
    return _sub_end_future(u)


def _status_label(u: dict) -> str:
    if _is_active_lifetime(u):
        return "lifetime"
    if _is_active_paying_recurring(u):
        return "active"
    if u.get("subscription_status") == "trialing":
        return "trial"
    if u.get("is_premium"):
        return "premium_other"
    return "registered"


def _mask_email(email: Optional[str]) -> str:
    if not email or "@" not in email:
        return "—"
    name, dom = email.split("@", 1)
    if len(name) <= 2:
        masked = (name[:1] or "*") + "***"
    else:
        masked = name[0] + "***" + name[-1]
    return f"{masked}@{dom}"


_REFEREE_PROJECTION = {
    "_id": 0, "id": 1, "email": 1, "name": 1, "is_premium": 1,
    "subscription_plan": 1, "subscription_status": 1, "subscription_end": 1,
    "created_at": 1, "referred_at": 1, "affiliate_lifetime_bonus_paid_at": 1,
}


async def _fetch_referees(affiliate_user_id: str) -> List[dict]:
    cur = db.users.find({"referred_by_id": affiliate_user_id}, _REFEREE_PROJECTION)
    return await cur.to_list(_MAX_LIST)


def _summarize(referees: List[dict], cfg: Dict[str, float],
               reward_override: Optional[float] = None) -> Dict[str, Any]:
    """Live counts + estimated amount for an affiliate given their referees."""
    active = sum(1 for u in referees if _is_active_paying_recurring(u))
    lifetime_active = [u for u in referees if _is_active_lifetime(u)]
    lifetime_unbonused = [u for u in lifetime_active if not u.get("affiliate_lifetime_bonus_paid_at")]
    reward = reward_override if reward_override else cfg["block_reward_eur"]
    block_size = int(cfg["block_size"])
    blocks = active // block_size if block_size else 0
    block_eur = round(blocks * reward, 2)
    lifetime_bonus_pending_eur = round(len(lifetime_unbonused) * cfg["lifetime_bonus_eur"], 2)
    return {
        "registered": len(referees),
        "active_paying": active,
        "blocks": blocks,
        "block_eur": block_eur,
        "lifetime_active": len(lifetime_active),
        "lifetime_unbonused": lifetime_unbonused,      # list (used by run)
        "lifetime_unbonused_count": len(lifetime_unbonused),
        "estimated_month_eur": round(block_eur + lifetime_bonus_pending_eur, 2),
        "block_tier": blocks,
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class AffiliateApply(BaseModel):
    accept_terms: bool = False
    payout_method: Optional[str] = None       # bank | paypal
    payout_details: Optional[str] = None       # IBAN / email PayPal
    tax_info: Optional[str] = None             # NIF/VAT/país


class PayoutDetails(BaseModel):
    payout_method: Optional[str] = None
    payout_details: Optional[str] = None
    tax_info: Optional[str] = None


class PatchAffiliate(BaseModel):
    block_reward_eur: Optional[float] = None
    notes: Optional[str] = None


class MarkPaid(BaseModel):
    payout_reference: Optional[str] = None


# ---------------------------------------------------------------------------
# Affiliate-facing endpoints
# ---------------------------------------------------------------------------
@router.post("/affiliate/apply")
async def affiliate_apply(payload: AffiliateApply, request: Request,
                          user: dict = Depends(_require_user_proxy)):
    """Solicitar entrar en el programa de afiliados (acepta términos)."""
    if not payload.accept_terms:
        raise HTTPException(status_code=400, detail="Debes aceptar los términos del programa")

    existing = await db.affiliates.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing:
        return {"ok": True, "already": True, "status": existing.get("status")}

    # Requisito: hay que ser suscriptor de PAGO (no durante la prueba de 7 días)
    if not _is_paying_member(user):
        raise HTTPException(
            status_code=403,
            detail="El programa de afiliados es solo para suscriptores de pago (no disponible durante la prueba de 7 días).",
        )

    code = await _ensure_referral_code(user)
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": user.get("email", ""),
        "code": code,
        "status": "pending",
        "block_reward_eur": None,        # override opcional; None → global
        "payout_method": payload.payout_method or "",
        "payout_details_enc": _encrypt(payload.payout_details) if payload.payout_details else "",
        "tax_info_enc": _encrypt(payload.tax_info) if payload.tax_info else "",
        "notes": "",
        "terms_accepted_at": _iso(),
        "terms_accepted_ip": ip,
        "created_at": _iso(),
        "approved_at": None,
    }
    await db.affiliates.insert_one(doc)
    logging.info("[affiliate] solicitud de alta: %s (code=%s)", user.get("email"), code)
    return {"ok": True, "status": "pending"}


@router.get("/affiliate/me")
async def affiliate_me(user: dict = Depends(_require_user_proxy)):
    """Panel self-service del afiliado. Lista de referidos ENMASCARADA (sin PII de terceros)."""
    cfg = await _config()
    aff = await db.affiliates.find_one({"user_id": user["id"]}, {"_id": 0})

    if not aff:
        # No es afiliado todavía → info del programa + su potencial actual.
        referees = await _fetch_referees(user["id"])
        summ = _summarize(referees, cfg)
        return {
            "is_affiliate": False,
            "can_apply": _is_paying_member(user),
            "eligible": _is_paying_member(user),
            "config": {k: cfg[k] for k in ("block_size", "block_reward_eur", "lifetime_bonus_eur")},
            "potential": {
                "registered": summ["registered"],
                "active_paying": summ["active_paying"],
            },
        }

    referees = await _fetch_referees(user["id"])
    summ = _summarize(referees, cfg, reward_override=aff.get("block_reward_eur"))

    # Lista enmascarada (cap para no enviar payloads enormes)
    referral_list = []
    for u in sorted(referees, key=lambda r: r.get("referred_at") or r.get("created_at") or "", reverse=True)[:200]:
        referral_list.append({
            "masked_email": _mask_email(u.get("email")),
            "status": _status_label(u),
            "plan": u.get("subscription_plan"),
            "since": u.get("referred_at") or u.get("created_at"),
        })

    # Histórico de cobros (líneas pagadas a este afiliado)
    paid_cur = db.affiliate_payout_lines.find(
        {"affiliate_id": aff["id"], "status": "paid"},
        {"_id": 0, "period": 1, "net_eur": 1, "paid_at": 1, "payout_reference": 1,
         "active_count": 1, "blocks": 1, "lifetime_new_count": 1},
    )
    payouts = await paid_cur.to_list(200)
    payouts.sort(key=lambda p: p.get("period", ""), reverse=True)
    total_paid = round(sum(float(p.get("net_eur", 0)) for p in payouts), 2)

    # Solicitud de pago pendiente (para reflejar el estado del botón "Solicitar pago")
    open_request = await db.affiliate_payout_requests.find_one(
        {"affiliate_id": aff["id"], "status": "pending"},
        {"_id": 0, "amount_eur": 1, "created_at": 1, "status": 1},
    )

    return {
        "is_affiliate": True,
        "status": aff.get("status"),
        "open_request": open_request,
        "code": aff.get("code"),
        "share_link_path": f"/?ref={aff.get('code')}",
        "payout_method": aff.get("payout_method") or "",
        "has_payout_details": bool(aff.get("payout_details_enc")),
        "config": {k: cfg[k] for k in ("block_size", "block_reward_eur", "lifetime_bonus_eur")},
        "reward_eur": aff.get("block_reward_eur") or cfg["block_reward_eur"],
        "stats": {
            "registered": summ["registered"],
            "active_paying": summ["active_paying"],
            "blocks": summ["blocks"],
            "block_eur": summ["block_eur"],
            "lifetime_active": summ["lifetime_active"],
            "lifetime_pending_bonus": summ["lifetime_unbonused_count"],
            "estimated_month_eur": summ["estimated_month_eur"],
            "total_paid_eur": total_paid,
            "currency": "EUR",
        },
        "referrals": referral_list,
        "payouts": payouts,
    }


@router.put("/affiliate/payout-details")
async def affiliate_payout_details(payload: PayoutDetails,
                                   user: dict = Depends(_require_user_proxy)):
    aff = await db.affiliates.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    if not aff:
        raise HTTPException(status_code=404, detail="No estás dado de alta como afiliado")
    patch: Dict[str, Any] = {}
    if payload.payout_method is not None:
        patch["payout_method"] = payload.payout_method
    if payload.payout_details is not None:
        patch["payout_details_enc"] = _encrypt(payload.payout_details) if payload.payout_details else ""
    if payload.tax_info is not None:
        patch["tax_info_enc"] = _encrypt(payload.tax_info) if payload.tax_info else ""
    if patch:
        patch["payout_details_updated_at"] = _iso()
        await db.affiliates.update_one({"id": aff["id"]}, {"$set": patch})
    return {"ok": True}


@router.post("/affiliate/request-payout")
async def affiliate_request_payout(user: dict = Depends(_require_user_proxy)):
    """El afiliado solicita el pago de su saldo acumulado. Crea una solicitud
    que el admin verá como notificación pendiente de pagar."""
    aff = await db.affiliates.find_one({"user_id": user["id"]}, {"_id": 0})
    if not aff:
        raise HTTPException(status_code=404, detail="No estás dado de alta como afiliado")
    if aff.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Tu cuenta de afiliado no está aprobada")

    # Una sola solicitud abierta a la vez
    existing = await db.affiliate_payout_requests.find_one(
        {"affiliate_id": aff["id"], "status": "pending"}, {"_id": 0, "id": 1})
    if existing:
        return {"ok": True, "already": True}

    cfg = await _config()
    referees = await _fetch_referees(user["id"])
    summ = _summarize(referees, cfg, reward_override=aff.get("block_reward_eur"))
    amount = summ["estimated_month_eur"]
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Todavía no tienes saldo para solicitar")

    req = {
        "id": str(uuid.uuid4()),
        "affiliate_id": aff["id"],
        "user_id": user["id"],
        "email": aff.get("email"),
        "amount_eur": amount,
        "active_count": summ["active_paying"],
        "blocks": summ["blocks"],
        "lifetime_pending": summ["lifetime_unbonused_count"],
        "payout_method": aff.get("payout_method") or "",
        "status": "pending",
        "created_at": _iso(),
    }
    await db.affiliate_payout_requests.insert_one(req)
    logging.info("[affiliate] SOLICITUD DE PAGO de %s: %s €", aff.get("email"), amount)
    return {"ok": True, "amount_eur": amount}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@router.get("/admin/affiliates")
async def admin_list_affiliates(admin: dict = Depends(_require_admin_proxy),
                                segment: str = "all", sort: str = "active_desc",
                                status: Optional[str] = None):
    """Lista de afiliados SEPARADA de la lista general de clientes, con contadores en vivo."""
    cfg = await _config()
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    affs = await db.affiliates.find(query, {"_id": 0}).to_list(_MAX_LIST)

    rows = []
    for a in affs:
        referees = await _fetch_referees(a["user_id"])
        summ = _summarize(referees, cfg, reward_override=a.get("block_reward_eur"))
        rows.append({
            "id": a["id"],
            "user_id": a["user_id"],
            "email": a.get("email"),
            "code": a.get("code"),
            "status": a.get("status"),
            "payout_method": a.get("payout_method") or "",
            "registered": summ["registered"],
            "active_paying": summ["active_paying"],
            "blocks": summ["blocks"],
            "block_tier": summ["block_tier"],
            "lifetime_active": summ["lifetime_active"],
            "lifetime_pending_bonus": summ["lifetime_unbonused_count"],
            "estimated_month_eur": summ["estimated_month_eur"],
            "created_at": a.get("created_at"),
        })

    # Segmentación: con / sin referidos
    if segment == "with_referrals":
        rows = [r for r in rows if r["registered"] > 0]
    elif segment == "without_referrals":
        rows = [r for r in rows if r["registered"] == 0]

    # Orden
    keymap = {
        "active_desc": lambda r: r["active_paying"],
        "blocks_desc": lambda r: r["blocks"],
        "amount_desc": lambda r: r["estimated_month_eur"],
        "registered_desc": lambda r: r["registered"],
    }
    rows.sort(key=keymap.get(sort, keymap["active_desc"]), reverse=True)

    totals = {
        "affiliates": len(rows),
        "with_referrals": sum(1 for r in rows if r["registered"] > 0),
        "active_subscribers": sum(r["active_paying"] for r in rows),
        "total_blocks": sum(r["blocks"] for r in rows),
        "estimated_month_eur": round(sum(r["estimated_month_eur"] for r in rows), 2),
    }
    return {"affiliates": rows, "totals": totals,
            "config": {k: cfg[k] for k in ("block_size", "block_reward_eur", "lifetime_bonus_eur")}}


async def admin_affiliate_detail(aid: str, admin: dict = Depends(_require_admin_proxy)):
    """Ficha del afiliado + lista de SUS referidos (admin ve email completo) + histórico.

    OJO: su ruta GET /admin/affiliates/{aid} se registra AL FINAL del módulo —
    declarada aquí capturaba las rutas estáticas /payout-runs y /payout-requests
    (route shadowing → 404 "Afiliado no encontrado" en el panel admin)."""
    cfg = await _config()
    a = await db.affiliates.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")
    referees = await _fetch_referees(a["user_id"])
    summ = _summarize(referees, cfg, reward_override=a.get("block_reward_eur"))

    referral_rows = []
    for u in sorted(referees, key=lambda r: r.get("referred_at") or r.get("created_at") or "", reverse=True):
        referral_rows.append({
            "email": u.get("email"),
            "status": _status_label(u),
            "plan": u.get("subscription_plan"),
            "since": u.get("referred_at") or u.get("created_at"),
            "bonused": bool(u.get("affiliate_lifetime_bonus_paid_at")),
        })

    payouts = await db.affiliate_payout_lines.find(
        {"affiliate_id": a["id"]},
        {"_id": 0, "period": 1, "status": 1, "net_eur": 1, "gross_eur": 1,
         "active_count": 1, "blocks": 1, "lifetime_new_count": 1, "paid_at": 1, "payout_reference": 1},
    ).to_list(200)
    payouts.sort(key=lambda p: p.get("period", ""), reverse=True)

    return {
        "affiliate": {
            "id": a["id"], "user_id": a["user_id"], "email": a.get("email"),
            "code": a.get("code"), "status": a.get("status"),
            "payout_method": a.get("payout_method") or "",
            "payout_details": _decrypt(a.get("payout_details_enc") or "") or "",
            "tax_info": _decrypt(a.get("tax_info_enc") or "") or "",
            "block_reward_eur": a.get("block_reward_eur"),
            "notes": a.get("notes") or "",
            "terms_accepted_at": a.get("terms_accepted_at"),
            "created_at": a.get("created_at"), "approved_at": a.get("approved_at"),
        },
        "stats": {
            "registered": summ["registered"], "active_paying": summ["active_paying"],
            "blocks": summ["blocks"], "block_eur": summ["block_eur"],
            "lifetime_active": summ["lifetime_active"],
            "lifetime_pending_bonus": summ["lifetime_unbonused_count"],
            "estimated_month_eur": summ["estimated_month_eur"], "currency": "EUR",
        },
        "referrals": referral_rows,
        "payouts": payouts,
        "config": {k: cfg[k] for k in ("block_size", "block_reward_eur", "lifetime_bonus_eur")},
    }


async def _set_status(aid: str, new_status: str) -> dict:
    a = await db.affiliates.find_one({"id": aid}, {"_id": 0, "id": 1})
    if not a:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")
    patch: Dict[str, Any] = {"status": new_status}
    if new_status == "approved":
        patch["approved_at"] = _iso()
    await db.affiliates.update_one({"id": aid}, {"$set": patch})
    return {"ok": True, "status": new_status}


@router.post("/admin/affiliates/{aid}/approve")
async def admin_approve(aid: str, admin: dict = Depends(_require_admin_proxy)):
    return await _set_status(aid, "approved")


@router.post("/admin/affiliates/{aid}/reject")
async def admin_reject(aid: str, admin: dict = Depends(_require_admin_proxy)):
    return await _set_status(aid, "rejected")


@router.post("/admin/affiliates/{aid}/suspend")
async def admin_suspend(aid: str, admin: dict = Depends(_require_admin_proxy)):
    return await _set_status(aid, "suspended")


@router.patch("/admin/affiliates/{aid}")
async def admin_patch_affiliate(aid: str, payload: PatchAffiliate,
                                admin: dict = Depends(_require_admin_proxy)):
    a = await db.affiliates.find_one({"id": aid}, {"_id": 0, "id": 1})
    if not a:
        raise HTTPException(status_code=404, detail="Afiliado no encontrado")
    patch: Dict[str, Any] = {}
    if payload.block_reward_eur is not None:
        patch["block_reward_eur"] = float(payload.block_reward_eur)
    if payload.notes is not None:
        patch["notes"] = payload.notes
    if patch:
        await db.affiliates.update_one({"id": aid}, {"$set": patch})
    return {"ok": True}


# ── Liquidación mensual ────────────────────────────────────────────────────
@router.post("/admin/affiliates/payout-run")
async def admin_payout_run(period: str, admin: dict = Depends(_require_admin_proxy)):
    """Genera (o recomputa) el borrador de liquidación de un periodo YYYY-MM."""
    try:
        datetime.strptime(period, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="Periodo inválido (usa YYYY-MM)")

    cfg = await _config()
    existing = await db.affiliate_payout_runs.find_one({"period": period}, {"_id": 0})
    if existing and existing.get("status") in ("finalized", "paid"):
        raise HTTPException(status_code=409,
                            detail="Ya existe una liquidación finalizada para ese periodo")
    if existing:
        await db.affiliate_payout_lines.delete_many({"run_id": existing["id"]})
        await db.affiliate_payout_runs.delete_one({"id": existing["id"]})

    run_id = str(uuid.uuid4())
    approved = await db.affiliates.find({"status": "approved"}, {"_id": 0}).to_list(_MAX_LIST)

    totals = {"affiliates": len(approved), "affiliates_paid": 0, "active_subscribers": 0,
              "total_blocks": 0, "block_eur": 0.0, "lifetime_bonus_total_eur": 0.0, "payable_eur": 0.0}

    for a in approved:
        referees = await _fetch_referees(a["user_id"])
        summ = _summarize(referees, cfg, reward_override=a.get("block_reward_eur"))
        reward = a.get("block_reward_eur") or cfg["block_reward_eur"]
        block_gross = summ["block_eur"]
        lifetime_new = summ["lifetime_unbonused"]
        lifetime_new_count = len(lifetime_new)
        lifetime_gross = round(lifetime_new_count * cfg["lifetime_bonus_eur"], 2)
        gross = round(block_gross + lifetime_gross, 2)
        line = {
            "id": str(uuid.uuid4()),
            "run_id": run_id,
            "period": period,
            "affiliate_id": a["id"],
            "affiliate_user_id": a["user_id"],
            "affiliate_email": a.get("email"),
            "active_count": summ["active_paying"],
            "blocks": summ["blocks"],
            "block_size": int(cfg["block_size"]),
            "block_reward_eur": reward,
            "block_gross_eur": block_gross,
            "lifetime_new_count": lifetime_new_count,
            "lifetime_bonus_eur": cfg["lifetime_bonus_eur"],
            "lifetime_gross_eur": lifetime_gross,
            "gross_eur": gross,
            "adjustments_eur": 0.0,
            "net_eur": gross,
            "status": "zero" if gross == 0 else "pending",
            "pending_bonus_referee_ids": [u["id"] for u in lifetime_new],
            "payout_method": a.get("payout_method") or "",
            "paid_at": None,
            "payout_reference": None,
            "created_at": _iso(),
        }
        await db.affiliate_payout_lines.insert_one(line)
        totals["active_subscribers"] += summ["active_paying"]
        totals["total_blocks"] += summ["blocks"]
        totals["block_eur"] = round(totals["block_eur"] + block_gross, 2)
        totals["lifetime_bonus_total_eur"] = round(totals["lifetime_bonus_total_eur"] + lifetime_gross, 2)
        totals["payable_eur"] = round(totals["payable_eur"] + gross, 2)
        if gross > 0:
            totals["affiliates_paid"] += 1

    run = {
        "id": run_id,
        "period": period,
        "status": "draft",
        "block_size": int(cfg["block_size"]),
        "block_reward_eur": cfg["block_reward_eur"],
        "lifetime_bonus_eur": cfg["lifetime_bonus_eur"],
        "snapshot_at": _iso(),
        "totals": totals,
        "created_at": _iso(),
        "created_by": admin.get("id"),
        "finalized_at": None,
    }
    await db.affiliate_payout_runs.insert_one(run)
    logging.info("[affiliate] liquidación %s generada: %s € a %d afiliados",
                 period, totals["payable_eur"], totals["affiliates_paid"])
    return {"ok": True, "run": run}


@router.post("/admin/affiliates/payout-run/{rid}/finalize")
async def admin_finalize_run(rid: str, admin: dict = Depends(_require_admin_proxy)):
    """Congela el borrador y SELLA el bonus lifetime (idempotencia: cada lifetime se paga una vez)."""
    run = await db.affiliate_payout_runs.find_one({"id": rid}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    if run.get("status") != "draft":
        raise HTTPException(status_code=409, detail="La liquidación no está en borrador")

    lines = await db.affiliate_payout_lines.find({"run_id": rid}, {"_id": 0}).to_list(_MAX_LIST)
    sealed = 0
    for line in lines:
        for rid_user in line.get("pending_bonus_referee_ids", []) or []:
            await db.users.update_one(
                {"id": rid_user},
                {"$set": {"affiliate_lifetime_bonus_paid_at": _iso()}},
            )
            sealed += 1
    await db.affiliate_payout_runs.update_one(
        {"id": rid}, {"$set": {"status": "finalized", "finalized_at": _iso()}},
    )
    return {"ok": True, "status": "finalized", "lifetime_sealed": sealed}


@router.get("/admin/affiliates/payout-runs")
async def admin_list_runs(admin: dict = Depends(_require_admin_proxy)):
    runs = await db.affiliate_payout_runs.find({}, {"_id": 0, "pending_bonus_referee_ids": 0}).to_list(500)
    runs.sort(key=lambda r: r.get("period", ""), reverse=True)
    return {"runs": runs}


@router.get("/admin/affiliates/payout-runs/{rid}")
async def admin_run_detail(rid: str, admin: dict = Depends(_require_admin_proxy)):
    run = await db.affiliate_payout_runs.find_one({"id": rid}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    lines = await db.affiliate_payout_lines.find(
        {"run_id": rid}, {"_id": 0, "pending_bonus_referee_ids": 0}).to_list(_MAX_LIST)
    lines.sort(key=lambda x: x.get("net_eur", 0), reverse=True)
    return {"run": run, "lines": lines}


@router.post("/admin/affiliates/payout-lines/{lid}/mark-paid")
async def admin_mark_paid(lid: str, payload: MarkPaid,
                          admin: dict = Depends(_require_admin_proxy)):
    line = await db.affiliate_payout_lines.find_one({"id": lid}, {"_id": 0, "id": 1, "run_id": 1})
    if not line:
        raise HTTPException(status_code=404, detail="Línea de liquidación no encontrada")
    await db.affiliate_payout_lines.update_one(
        {"id": lid},
        {"$set": {"status": "paid", "paid_at": _iso(),
                  "payout_reference": payload.payout_reference or "", "paid_by": admin.get("id")}},
    )
    # Si todas las líneas pagables del run están pagadas → marcar el run como paid.
    run_id = line.get("run_id")
    if run_id:
        remaining = await db.affiliate_payout_lines.count_documents(
            {"run_id": run_id, "status": "pending"})
        if remaining == 0:
            await db.affiliate_payout_runs.update_one(
                {"id": run_id}, {"$set": {"status": "paid", "paid_at": _iso()}})
    return {"ok": True, "status": "paid"}


@router.get("/admin/affiliates/payout-requests")
async def admin_list_requests(admin: dict = Depends(_require_admin_proxy), status: str = "pending"):
    """Solicitudes de pago de los afiliados (notificación de que hay que pagar)."""
    q: Dict[str, Any] = {} if status == "all" else {"status": status}
    reqs = await db.affiliate_payout_requests.find(q, {"_id": 0}).to_list(500)
    reqs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    pending = await db.affiliate_payout_requests.count_documents({"status": "pending"})
    total = round(sum(float(r.get("amount_eur", 0)) for r in reqs if r.get("status") == "pending"), 2)
    return {"requests": reqs, "pending_count": pending, "pending_amount_eur": total}


@router.post("/admin/affiliates/payout-requests/{rid}/mark-paid")
async def admin_request_mark_paid(rid: str, payload: MarkPaid,
                                  admin: dict = Depends(_require_admin_proxy)):
    r = await db.affiliate_payout_requests.find_one({"id": rid}, {"_id": 0, "id": 1})
    if not r:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    await db.affiliate_payout_requests.update_one(
        {"id": rid},
        {"$set": {"status": "paid", "paid_at": _iso(),
                  "payout_reference": payload.payout_reference or "", "paid_by": admin.get("id")}},
    )
    return {"ok": True, "status": "paid"}


@router.post("/admin/affiliates/payout-requests/{rid}/reject")
async def admin_request_reject(rid: str, admin: dict = Depends(_require_admin_proxy)):
    r = await db.affiliate_payout_requests.find_one({"id": rid}, {"_id": 0, "id": 1})
    if not r:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    await db.affiliate_payout_requests.update_one(
        {"id": rid}, {"$set": {"status": "rejected", "rejected_at": _iso()}})
    return {"ok": True, "status": "rejected"}


@router.get("/admin/affiliates/payout-runs/{rid}/export.csv")
async def admin_export_csv(rid: str, admin: dict = Depends(_require_admin_proxy)):
    run = await db.affiliate_payout_runs.find_one({"id": rid}, {"_id": 0, "period": 1})
    if not run:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    lines = await db.affiliate_payout_lines.find(
        {"run_id": rid, "status": {"$ne": "zero"}}, {"_id": 0}).to_list(_MAX_LIST)
    lines.sort(key=lambda x: x.get("net_eur", 0), reverse=True)

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["periodo", "email", "metodo_cobro", "datos_cobro", "activos", "bloques",
                "lifetime_nuevos", "importe_eur", "estado", "referencia"])
    for ln in lines:
        aff = await db.affiliates.find_one({"id": ln.get("affiliate_id")},
                                           {"_id": 0, "payout_details_enc": 1})
        details = _decrypt((aff or {}).get("payout_details_enc") or "") or ""
        w.writerow([ln.get("period"), ln.get("affiliate_email"), ln.get("payout_method"),
                    details, ln.get("active_count"), ln.get("blocks"),
                    ln.get("lifetime_new_count"), ln.get("net_eur"), ln.get("status"),
                    ln.get("payout_reference") or ""])
    csv_text = buf.getvalue()
    return Response(
        content=csv_text, media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="afiliados_{run.get("period")}.csv"'},
    )


# La ruta dinámica {aid} va la ÚLTIMA: FastAPI resuelve por orden de registro y,
# si se declara antes, "payout-runs"/"payout-requests" se interpretan como un aid.
router.get("/admin/affiliates/{aid}")(admin_affiliate_detail)


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------
async def ensure_affiliate_indexes(database) -> None:
    try:
        await database.affiliates.create_index("user_id", unique=True, sparse=True)
        await database.affiliates.create_index("status")
        await database.affiliates.create_index("code")
        await database.affiliate_payout_runs.create_index("period", unique=True, sparse=True)
        await database.affiliate_payout_lines.create_index("run_id")
        await database.affiliate_payout_lines.create_index("affiliate_id")
        await database.affiliate_payout_lines.create_index("status")
        await database.affiliate_payout_requests.create_index("status")
        await database.affiliate_payout_requests.create_index("affiliate_id")
        logging.info("✅ affiliate_program indexes ensured")
    except Exception as e:
        logging.error(f"affiliate_program index error: {e}")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def register(app_router, database, helpers: Dict[str, Any]) -> None:
    global db, require_user, require_admin, get_setting, _encrypt, _decrypt, _free_access_emails
    db = database
    require_user = helpers["require_user"]
    require_admin = helpers["require_admin"]
    get_setting = helpers.get("get_setting")
    if helpers.get("free_access_emails"):
        _free_access_emails = {e.lower() for e in helpers["free_access_emails"]}
    if helpers.get("encrypt"):
        _encrypt = helpers["encrypt"]
    if helpers.get("decrypt"):
        _decrypt = helpers["decrypt"]
    if helpers.get("limiter"):
        helpers["limiter"].limit("5/hour")(affiliate_apply)
    app_router.include_router(router)
