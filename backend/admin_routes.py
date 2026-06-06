"""
admin_routes.py — Endpoints del panel de administración
=========================================================
Todos los endpoints requieren `require_admin` (is_admin=True en MongoDB).

Endpoints:
  GET  /admin/metrics                     — métricas globales
  GET  /admin/users                       — lista paginada/filtrable de usuarios
  GET  /admin/users.csv                   — exportación CSV
  POST /admin/promote                     — dar/quitar rol admin
  POST /admin/set-plan                    — asignar plan premium
  POST /admin/users/{user_id}             — editar usuario (nombre, email, plan, admin)
  POST /admin/users/{user_id}/reset-password — resetear contraseña
  GET  /admin/settings                    — ver todos los conectores/APIs (secretos enmascarados)
  POST /admin/settings                    — guardar/actualizar conectores y APIs
  GET  /public/settings                   — claves públicas sin autenticación
  GET  /admin/connectors/status           — health check en vivo de cada API
  GET  /admin/audit-log                   — log de acciones admin paginado
"""

import csv
import io
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)


class ResetPasswordRequest(BaseModel):
    new_password: str

# ---------------------------------------------------------------------------
# Definición completa de todos los conectores / APIs del sistema
# ---------------------------------------------------------------------------

# Claves que se muestran tal cual (no son secretos)
PUBLIC_SETTING_KEYS = {
    # Google tracking / SEO
    "ga4_measurement_id",
    "gtm_container_id",
    "gsc_verification_code",
    "adsense_publisher_id",
    "bing_verification_code",
    "clarity_project_id",
    # Google OAuth (client_id es público por diseño)
    "google_client_id",
    # Stripe (publishable key es pública)
    "stripe_publishable_key",
    # Social / reviews
    "trustpilot_business_unit_id",
    # App config
    "site_name",
    "support_email",
    "default_currency",
    "default_locale",
    "maintenance_mode",
    "user_state_ttl_days",
}

# Claves que son secretas: se enmascaran con *** en GET
SECRET_SETTING_KEYS = {
    "stripe_secret_key",
    "stripe_webhook_secret",
    "sendgrid_api_key",
    "google_client_secret",
    "finnhub_api_key",
    "alpha_vantage_api_key",
    "coingecko_api_key",
    "emergent_llm_key",
    "paypal_client_id",
    "paypal_client_secret",
    "coinbase_api_key",
    "coinbase_api_secret",
    "sendgrid_sender_email",
}

# Todos los conectores con metadatos para la UI
ALL_CONNECTORS: List[Dict[str, Any]] = [
    # ---- PAGOS ----
    {
        "group": "payments",
        "label": "Stripe",
        "description": "Pasarela de pagos principal (suscripciones y checkout)",
        "keys": [
            {"key": "stripe_publishable_key", "label": "Publishable Key", "secret": False, "placeholder": "pk_live_..."},
            {"key": "stripe_secret_key",      "label": "Secret Key",      "secret": True,  "placeholder": "sk_live_..."},
            {"key": "stripe_webhook_secret",  "label": "Webhook Secret",  "secret": True,  "placeholder": "whsec_..."},
        ],
    },
    {
        "group": "payments",
        "label": "PayPal",
        "description": "Pagos alternativos vía PayPal (opcional)",
        "keys": [
            {"key": "paypal_client_id",     "label": "Client ID",     "secret": True, "placeholder": "AX..."},
            {"key": "paypal_client_secret", "label": "Client Secret", "secret": True, "placeholder": "..."},
        ],
    },
    {
        "group": "payments",
        "label": "Coinbase Commerce",
        "description": "Pagos en criptomonedas (opcional)",
        "keys": [
            {"key": "coinbase_api_key",    "label": "API Key",    "secret": True, "placeholder": "..."},
            {"key": "coinbase_api_secret", "label": "API Secret", "secret": True, "placeholder": "..."},
        ],
    },
    # ---- AUTH ----
    {
        "group": "auth",
        "label": "Google OAuth",
        "description": "Login con Google (OAuth 2.0 / OpenID Connect)",
        "keys": [
            {"key": "google_client_id",     "label": "Client ID",     "secret": False, "placeholder": "123456789.apps.googleusercontent.com"},
            {"key": "google_client_secret", "label": "Client Secret", "secret": True,  "placeholder": "GOCSPX-..."},
        ],
    },
    # ---- EMAIL ----
    {
        "group": "email",
        "label": "SendGrid",
        "description": "Envío de emails: alertas de precio, reset de contraseña, notificaciones",
        "keys": [
            {"key": "sendgrid_api_key",      "label": "API Key",      "secret": True,  "placeholder": "SG.xxx..."},
            {"key": "sendgrid_sender_email", "label": "Sender Email", "secret": False, "placeholder": "alerts@tudominio.com"},
        ],
    },
    # ---- DATOS DE MERCADO ----
    {
        "group": "market_data",
        "label": "CoinGecko",
        "description": "Precios de criptomonedas en tiempo real (el plan gratuito no necesita clave)",
        "keys": [
            {"key": "coingecko_api_key", "label": "API Key (Pro)", "secret": True, "placeholder": "CG-..."},
        ],
    },
    {
        "group": "market_data",
        "label": "Finnhub",
        "description": "Precios de Forex e índices en tiempo real (reemplaza datos simulados)",
        "keys": [
            {"key": "finnhub_api_key", "label": "API Key", "secret": True, "placeholder": "cu..."},
        ],
    },
    {
        "group": "market_data",
        "label": "Alpha Vantage",
        "description": "Alternativa a Finnhub para Forex, acciones e indicadores económicos",
        "keys": [
            {"key": "alpha_vantage_api_key", "label": "API Key", "secret": True, "placeholder": "XXXXXXXXXXXXXXXX"},
        ],
    },
    # ---- AI ----
    {
        "group": "ai",
        "label": "Emergent LLM (AI Coach)",
        "description": "Clave para el análisis de operaciones con IA (Claude Sonnet)",
        "keys": [
            {"key": "emergent_llm_key", "label": "LLM API Key", "secret": True, "placeholder": "em-..."},
        ],
    },
    # ---- ANALYTICS & SEO ----
    {
        "group": "analytics",
        "label": "Google Analytics 4 (GA4)",
        "description": "Seguimiento de visitas y eventos",
        "keys": [
            {"key": "ga4_measurement_id", "label": "Measurement ID", "secret": False, "placeholder": "G-XXXXXXXXXX"},
        ],
    },
    {
        "group": "analytics",
        "label": "Google Tag Manager (GTM)",
        "description": "Gestión centralizada de tags y scripts",
        "keys": [
            {"key": "gtm_container_id", "label": "Container ID", "secret": False, "placeholder": "GTM-XXXXXXX"},
        ],
    },
    {
        "group": "analytics",
        "label": "Google Search Console (GSC)",
        "description": "Verificación de propiedad para SEO",
        "keys": [
            {"key": "gsc_verification_code", "label": "Verification Code", "secret": False, "placeholder": "google-site-verification=..."},
        ],
    },
    {
        "group": "analytics",
        "label": "Google AdSense",
        "description": "Monetización con anuncios",
        "keys": [
            {"key": "adsense_publisher_id", "label": "Publisher ID", "secret": False, "placeholder": "ca-pub-XXXXXXXXXX"},
        ],
    },
    {
        "group": "analytics",
        "label": "Microsoft Bing Webmaster",
        "description": "Verificación de propiedad para Bing",
        "keys": [
            {"key": "bing_verification_code", "label": "Verification Code", "secret": False, "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"},
        ],
    },
    {
        "group": "analytics",
        "label": "Microsoft Clarity",
        "description": "Heatmaps y grabaciones de sesión",
        "keys": [
            {"key": "clarity_project_id", "label": "Project ID", "secret": False, "placeholder": "xxxxxxxxxx"},
        ],
    },
    # ---- SOCIAL ----
    {
        "group": "social",
        "label": "Trustpilot",
        "description": "Widget de reviews y prueba social",
        "keys": [
            {"key": "trustpilot_business_unit_id", "label": "Business Unit ID", "secret": False, "placeholder": "..."},
        ],
    },
    # ---- APP CONFIG ----
    {
        "group": "app_config",
        "label": "Configuración de la App",
        "description": "Parámetros generales de la aplicación",
        "keys": [
            {"key": "site_name",         "label": "Nombre del sitio",       "secret": False, "placeholder": "Trading Calculator PRO"},
            {"key": "support_email",     "label": "Email de soporte",       "secret": False, "placeholder": "support@tradingcalculator.pro"},
            {"key": "default_currency",  "label": "Moneda por defecto",     "secret": False, "placeholder": "EUR"},
            {"key": "default_locale",    "label": "Idioma por defecto",     "secret": False, "placeholder": "es"},
            {"key": "maintenance_mode",  "label": "Modo mantenimiento",     "secret": False, "placeholder": "false"},
            {"key": "user_state_ttl_days","label": "TTL estados (días)",   "secret": False, "placeholder": "90"},
        ],
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mask(value: Optional[str]) -> str:
    """Return *** if value exists, empty string otherwise."""
    return "***" if value else ""


async def _get_all_settings(db) -> Dict[str, str]:
    """Load all rows from app_settings collection as key->value dict."""
    docs = await db.app_settings.find({}, {"_id": 0, "key": 1, "value": 1}).to_list(1000)
    return {d["key"]: d.get("value", "") for d in docs}


async def _upsert_setting(db, key: str, value: str) -> None:
    await db.app_settings.update_one(
        {"key": key},
        {"$set": {"key": key, "value": value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def _delete_setting(db, key: str) -> None:
    await db.app_settings.delete_one({"key": key})


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class PromoteRequest(BaseModel):
    email: EmailStr
    is_admin: bool


class SetPlanRequest(BaseModel):
    email: EmailStr
    plan_id: str
    days: Optional[int] = None


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    is_premium: Optional[bool] = None
    subscription_plan: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_status: Optional[str] = None


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    plan_id: Optional[str] = "free"
    is_premium: bool = False
    is_admin: bool = False


class CouponRequest(BaseModel):
    id: str
    discount: float
    type: str = "percent"
    max_uses: Optional[int] = None
    expires: Optional[str] = None


class FeatureFlagPatch(BaseModel):
    enabled: bool


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

def build_admin_router(
    db,
    require_admin_dep,
    subscription_plans: dict,
    log_admin_action_fn=None,
) -> APIRouter:
    """
    Crea y devuelve el router de admin con todos los conectores.
    `log_admin_action_fn` es la función `log_admin_action` de server.py (opcional).
    """
    router = APIRouter()

    async def _audit(admin, action, **kwargs):
        if log_admin_action_fn:
            try:
                await log_admin_action_fn(admin=admin, action=action, **kwargs)
            except Exception as exc:
                logger.warning(f"audit log failed: {exc}")

    # =========================================================================
    # GET /admin/metrics
    # =========================================================================

    @router.get("/metrics")
    async def get_metrics(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Métricas globales: totales, premium, nuevos, MRR, locale breakdown."""
        now = datetime.now(timezone.utc)
        cutoff_30d = (now - timedelta(days=30)).isoformat()
        all_users: List[dict] = await db.users.find({}, {"_id": 0}).to_list(10000)
        total_users = len(all_users)
        premium_users = sum(1 for u in all_users if u.get("is_premium"))
        admin_users = sum(1 for u in all_users if u.get("is_admin"))
        new_30d = sum(1 for u in all_users if (u.get("created_at") or "") >= cutoff_30d)
        plan_price_monthly = {
            "monthly":   subscription_plans.get("monthly",   {}).get("price", 17),
            "quarterly": round(subscription_plans.get("quarterly", {}).get("price", 45) / 3, 2),
            "annual":    round(subscription_plans.get("annual",    {}).get("price", 200) / 12, 2),
            "lifetime":  0,
        }
        mrr_usd = sum(
            plan_price_monthly.get(u.get("subscription_plan", ""), 0)
            for u in all_users if u.get("is_premium")
        )
        plan_counts: Dict[str, int] = {}
        provider_counts: Dict[str, int] = {}
        locale_counts: Dict[str, int] = {}
        for u in all_users:
            p = u.get("subscription_plan") or "free"
            plan_counts[p] = plan_counts.get(p, 0) + 1
            pv = u.get("auth_provider") or "password"
            provider_counts[pv] = provider_counts.get(pv, 0) + 1
            locale = u.get("locale") or "unknown"
            locale_counts[locale] = locale_counts.get(locale, 0) + 1
        return {
            "total_users":   total_users,
            "premium_users": premium_users,
            "admin_users":   admin_users,
            "new_users_30d": new_30d,
            "mrr_usd":       round(mrr_usd, 2),
            "by_plan":       plan_counts,
            "by_provider":   provider_counts,
            "by_locale":     [{"locale": k, "count": v} for k, v in locale_counts.items()],
        }

    # =========================================================================
    # GET /admin/users
    # =========================================================================

    @router.get("/users")
    async def list_users(
        q:        Optional[str]  = Query(None),
        plan:     Optional[str]  = Query(None),
        provider: Optional[str]  = Query(None),
        locale:   Optional[str]  = Query(None),
        is_admin: Optional[bool] = Query(None),
        limit:    int            = Query(500, ge=1, le=2000),
        skip:     int            = Query(0, ge=0),
        _admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        filt: Dict[str, Any] = {}
        if q:
            filt["$or"] = [
                {"email": {"$regex": re.escape(q), "$options": "i"}},
                {"name": {"$regex": re.escape(q), "$options": "i"}},
            ]
        if plan and plan != "all":
            filt["subscription_plan"] = None if plan == "none" else plan
        if provider and provider != "all":
            filt["auth_provider"] = provider
        if locale and locale != "all":
            filt["locale"] = locale
        if is_admin is not None:
            filt["is_admin"] = is_admin
        total = await db.users.count_documents(filt)
        users_raw = await db.users.find(
            filt, {"_id": 0, "password": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        now = datetime.now(timezone.utc)
        users_out = []
        for u in users_raw:
            sub_end = u.get("subscription_end")
            if sub_end:
                try:
                    end_dt = datetime.fromisoformat(sub_end.replace("Z", "+00:00"))
                    u["is_premium"] = end_dt > now or u.get("subscription_plan") == "lifetime"
                    u["subscription_status"] = "active" if u["is_premium"] else "expired"
                except Exception:
                    pass
            users_out.append(u)
        return {"users": users_out, "total": total, "skip": skip, "limit": limit}

    # =========================================================================
    # GET /admin/users.csv
    # =========================================================================

    @router.get("/users.csv")
    async def export_users_csv(_admin: dict = Depends(require_admin_dep)) -> StreamingResponse:
        users_raw = await db.users.find(
            {}, {"_id": 0, "password": 0}
        ).sort("created_at", -1).to_list(10000)
        fieldnames = ["id", "email", "name", "auth_provider",
                      "subscription_plan", "subscription_end", "is_premium", "is_admin", "created_at"]
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for u in users_raw:
            writer.writerow({f: u.get(f, "") for f in fieldnames})
        output.seek(0)
        filename = f"tcp-users-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # =========================================================================
    # POST /admin/promote
    # =========================================================================

    @router.post("/promote")
    async def promote_user(
        body: PromoteRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        if body.email.lower() == admin_user["email"].lower() and not body.is_admin:
            raise HTTPException(status_code=400, detail="No puedes quitarte el rol de admin a ti mismo.")
        target = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail=f"Usuario '{body.email}' no encontrado.")
        await db.users.update_one({"email": body.email.lower()}, {"$set": {"is_admin": body.is_admin}})
        action = "promoted_admin" if body.is_admin else "demoted_admin"
        await _audit(admin_user, action, target_email=body.email, request=request)
        return {"success": True, "email": body.email, "is_admin": body.is_admin}

    # =========================================================================
    # POST /admin/set-plan
    # =========================================================================

    @router.post("/set-plan")
    async def admin_set_plan(
        body: SetPlanRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        if body.plan_id not in subscription_plans and body.plan_id != "free":
            raise HTTPException(status_code=400, detail=f"Plan '{body.plan_id}' no válido.")
        target = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail=f"Usuario '{body.email}' no encontrado.")
        if body.plan_id == "free":
            update = {"subscription_plan": None, "subscription_end": None, "is_premium": False}
        else:
            plan = subscription_plans[body.plan_id]
            days = body.days or plan.get("days", 30)
            end = datetime.now(timezone.utc) + timedelta(days=days)
            update = {"subscription_plan": body.plan_id, "subscription_end": end.isoformat(), "is_premium": True}
        await db.users.update_one({"email": body.email.lower()}, {"$set": update})
        await _audit(admin_user, "set_plan", target_email=body.email,
                     details={"plan": body.plan_id}, request=request)
        return {"success": True, "email": body.email, "plan_id": body.plan_id,
                "subscription_end": update.get("subscription_end")}

    # =========================================================================
    # POST /admin/users/{user_id}  — editar usuario
    # =========================================================================

    @router.post("/users/{user_id}")
    async def update_user(
        user_id: str,
        body: UpdateUserRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Editar nombre, email, plan, admin flag de un usuario."""
        target = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        patch: Dict[str, Any] = {}
        if body.name is not None:
            patch["name"] = body.name
        if body.email is not None:
            new_email = body.email.lower()
            # Check uniqueness
            conflict = await db.users.find_one({"email": new_email, "id": {"$ne": user_id}}, {"_id": 1})
            if conflict:
                raise HTTPException(status_code=400, detail="Ese email ya está en uso por otro usuario")
            patch["email"] = new_email
        if body.is_admin is not None:
            # Prevent admin removing their own admin rights
            if user_id == admin_user.get("id") and not body.is_admin:
                raise HTTPException(status_code=400, detail="No puedes quitarte el rol de admin a ti mismo")
            patch["is_admin"] = body.is_admin
        if body.subscription_plan is not None:
            valid_plans = set(subscription_plans.keys()) | {"free"}
            if body.subscription_plan not in valid_plans:
                raise HTTPException(status_code=400, detail=f"Plan inválido: {body.subscription_plan}")
            patch["subscription_plan"] = body.subscription_plan
            patch["is_premium"] = body.subscription_plan in subscription_plans
        if body.subscription_end is not None:
            patch["subscription_end"] = body.subscription_end

        if not patch:
            return {"success": True, "message": "Nada que actualizar"}

        await db.users.update_one({"id": user_id}, {"$set": patch})
        await _audit(admin_user, "update_user", target_id=user_id,
                     target_email=target.get("email", ""), details=patch, request=request)
        return {"success": True, "updated_fields": list(patch.keys())}

    # =========================================================================
    # POST /admin/users/{user_id}/reset-password
    # =========================================================================

    @router.post("/users/{user_id}/reset-password")
    async def admin_reset_password(
        user_id: str,
        body: ResetPasswordRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Reset de contraseña por admin. Revoca todas las sesiones activas del usuario."""
        import bcrypt
        target = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
        hashed = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
        await db.users.update_one({"id": user_id}, {"$set": {"password": hashed}})
        # Revoke all active sessions
        await db.user_revocations.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "revoked_after": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=25),
            }},
            upsert=True,
        )
        await _audit(admin_user, "reset_password", target_id=user_id,
                     target_email=target.get("email", ""), request=request)
        return {"success": True, "message": "Contraseña actualizada y sesiones revocadas"}

    # =========================================================================
    # GET /admin/settings  — todos los conectores (secretos enmascarados)
    # =========================================================================

    @router.get("/settings")
    async def get_settings(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """
        Devuelve todos los conectores con sus valores actuales.
        Los campos marcados como `secret=True` se devuelven como '***' si tienen valor,
        o '' si están vacíos. Nunca devuelve el valor real de un secreto.
        """
        raw = await _get_all_settings(db)
        connectors_out = []
        for connector in ALL_CONNECTORS:
            keys_out = []
            for k in connector["keys"]:
                current_val = raw.get(k["key"], "")
                keys_out.append({
                    **k,
                    "value": _mask(current_val) if k["secret"] else current_val,
                    "is_configured": bool(current_val),
                })
            connectors_out.append({**connector, "keys": keys_out})
        return {
            "connectors": connectors_out,
            "all_keys": list(PUBLIC_SETTING_KEYS | SECRET_SETTING_KEYS),
        }

    # =========================================================================
    # POST /admin/settings  — guardar/actualizar claves de conectores
    # =========================================================================

    @router.post("/settings")
    async def update_settings(
        body: Dict[str, Any],
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """
        Guarda o actualiza claves de conectores.
        Acepta un dict plano { key: value, ... }.
        - Si value == '__CLEAR__' → elimina la clave.
        - Si value == '' → ignora (no sobreescribe con vacío accidentalmente).
        - Solo acepta claves conocidas (PUBLIC_SETTING_KEYS | SECRET_SETTING_KEYS).
        """
        allowed = PUBLIC_SETTING_KEYS | SECRET_SETTING_KEYS
        saved = []
        cleared = []
        rejected = []
        for key, value in body.items():
            if key not in allowed:
                rejected.append(key)
                continue
            if value == "__CLEAR__":
                await _delete_setting(db, key)
                cleared.append(key)
            elif value and str(value).strip() and str(value).strip() != "***":
                await _upsert_setting(db, key, str(value).strip())
                saved.append(key)
        await _audit(
            admin_user, "update_settings",
            details={"saved": saved, "cleared": cleared, "rejected": rejected},
            request=request,
        )
        return {
            "success": True,
            "saved": saved,
            "cleared": cleared,
            "rejected": rejected,
            "message": f"{len(saved)} clave(s) guardada(s), {len(cleared)} eliminada(s)",
        }

    # =========================================================================
    # GET /admin/connectors/status  — health check en vivo
    # =========================================================================

    @router.get("/connectors/status")
    async def connectors_status(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """
        Comprueba en tiempo real si cada conector clave está configurado y responde.
        No hace llamadas costosas; solo verifica que la clave existe y hace un ping
        mínimo donde sea posible.
        """
        import httpx
        raw = await _get_all_settings(db)

        results: List[Dict[str, Any]] = []

        # -- Stripe --
        stripe_key = raw.get("stripe_secret_key", "")
        if stripe_key:
            try:
                async with httpx.AsyncClient(timeout=5) as c:
                    r = await c.get("https://api.stripe.com/v1/balance",
                                    headers={"Authorization": f"Bearer {stripe_key}"})
                results.append({"connector": "Stripe", "status": "ok" if r.status_code == 200 else "error",
                                 "http_code": r.status_code, "configured": True})
            except Exception as e:
                results.append({"connector": "Stripe", "status": "error", "error": str(e), "configured": True})
        else:
            results.append({"connector": "Stripe", "status": "not_configured", "configured": False})

        # -- SendGrid --
        sg_key = raw.get("sendgrid_api_key", "")
        results.append({"connector": "SendGrid", "status": "configured" if sg_key else "not_configured",
                        "configured": bool(sg_key)})

        # -- Google OAuth --
        g_client = raw.get("google_client_id", "")
        results.append({"connector": "Google OAuth", "status": "configured" if g_client else "not_configured",
                        "configured": bool(g_client)})

        # -- CoinGecko --
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get("https://api.coingecko.com/api/v3/ping")
            results.append({"connector": "CoinGecko", "status": "ok" if r.status_code == 200 else "error",
                             "http_code": r.status_code, "configured": True})
        except Exception as e:
            results.append({"connector": "CoinGecko", "status": "error", "error": str(e), "configured": True})

        # -- Finnhub --
        fh_key = raw.get("finnhub_api_key", "")
        if fh_key:
            try:
                async with httpx.AsyncClient(timeout=5) as c:
                    r = await c.get(f"https://finnhub.io/api/v1/quote?symbol=AAPL&token={fh_key}")
                results.append({"connector": "Finnhub", "status": "ok" if r.status_code == 200 else "error",
                                 "http_code": r.status_code, "configured": True})
            except Exception as e:
                results.append({"connector": "Finnhub", "status": "error", "error": str(e), "configured": True})
        else:
            results.append({"connector": "Finnhub", "status": "not_configured", "configured": False})

        # -- Alpha Vantage --
        av_key = raw.get("alpha_vantage_api_key", "")
        results.append({"connector": "Alpha Vantage", "status": "configured" if av_key else "not_configured",
                        "configured": bool(av_key)})

        # -- Emergent LLM --
        llm_key = raw.get("emergent_llm_key", "")
        results.append({"connector": "Emergent LLM", "status": "configured" if llm_key else "not_configured",
                        "configured": bool(llm_key)})

        # -- Database (PostgreSQL via asyncpg) --
        try:
            await db.users.find_one({"_id": "healthcheck"}, {"_id": 0})
            results.append({"connector": "Database", "status": "ok", "configured": True})
        except Exception as e:
            results.append({"connector": "Database", "status": "error", "error": str(e), "configured": True})

        return {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
            "summary": {
                "ok": sum(1 for r in results if r["status"] == "ok"),
                "configured": sum(1 for r in results if r.get("configured")),
                "not_configured": sum(1 for r in results if r["status"] == "not_configured"),
                "errors": sum(1 for r in results if r["status"] == "error"),
            },
        }

    # =========================================================================
    # GET /admin/audit-log
    # =========================================================================

    @router.get("/audit-log")
    async def get_audit_log(
        limit: int = Query(50, ge=1, le=500),
        skip:  int = Query(0, ge=0),
        admin_email: Optional[str] = Query(None),
        action:      Optional[str] = Query(None),
        _admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Log paginado de todas las acciones de administrador."""
        filt: Dict[str, Any] = {}
        if admin_email:
            filt["admin_email"] = {"$regex": re.escape(admin_email), "$options": "i"}
        if action:
            filt["action"] = action
        total = await db.admin_audit_log.count_documents(filt)
        logs = await db.admin_audit_log.find(
            filt, {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        # Convert datetime to isoformat for JSON
        for log in logs:
            if isinstance(log.get("timestamp"), datetime):
                log["timestamp"] = log["timestamp"].isoformat()
        return {"logs": logs, "total": total, "skip": skip, "limit": limit}

    # =========================================================================
    # PATCH /admin/users/{user_id}  — editar usuario (alias de POST para PATCH)
    # DELETE /admin/users/{user_id} — eliminar usuario
    # POST /admin/users             — crear usuario
    # =========================================================================

    @router.patch("/users/{user_id}")
    async def patch_user(
        user_id: str,
        body: UpdateUserRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Editar usuario vía PATCH (mismo comportamiento que POST)."""
        target = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        patch: Dict[str, Any] = {}
        if body.name is not None:
            patch["name"] = body.name
        if body.email is not None:
            new_email = body.email.lower()
            conflict = await db.users.find_one({"email": new_email, "id": {"$ne": user_id}}, {"_id": 1})
            if conflict:
                raise HTTPException(status_code=400, detail="Ese email ya está en uso")
            patch["email"] = new_email
        if body.is_admin is not None:
            if user_id == admin_user.get("id") and not body.is_admin:
                raise HTTPException(status_code=400, detail="No puedes quitarte el rol de admin")
            patch["is_admin"] = body.is_admin
        if body.is_premium is not None:
            patch["is_premium"] = body.is_premium
        if body.subscription_plan is not None:
            patch["subscription_plan"] = body.subscription_plan
            if body.is_premium is None:
                patch["is_premium"] = body.subscription_plan in subscription_plans
        if body.subscription_end is not None:
            patch["subscription_end"] = body.subscription_end
        if body.subscription_status is not None:
            patch["subscription_status"] = body.subscription_status
        if not patch:
            return {"success": True, "message": "Nada que actualizar"}
        await db.users.update_one({"id": user_id}, {"$set": patch})
        await _audit(admin_user, "update_user", target_id=user_id,
                     target_email=target.get("email", ""), details=patch, request=request)
        return {"success": True, "updated_fields": list(patch.keys())}

    @router.delete("/users/{user_id}")
    async def delete_user(
        user_id: str,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        if user_id == admin_user.get("id"):
            raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
        target = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        target_email = target.get("email", "")
        for col in ["trades", "calculations", "alerts", "portfolio",
                    "user_states", "payment_transactions"]:
            try:
                await getattr(db, col).delete_many({"user_id": user_id})
            except Exception:
                pass
        await db.users.delete_one({"id": user_id})
        await _audit(admin_user, "delete_user", target_id=user_id, target_email=target_email, request=request)
        return {"success": True, "deleted_user_id": user_id}

    @router.post("/users")
    async def create_user(
        body: CreateUserRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        import uuid, bcrypt as _bcrypt
        existing = await db.users.find_one({"email": body.email.lower()}, {"_id": 1})
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")
        hashed = _bcrypt.hashpw(body.password.encode(), _bcrypt.gensalt()).decode()
        plan = subscription_plans.get(body.plan_id) if body.plan_id != "free" else None
        sub_end = None
        if plan:
            sub_end = (datetime.now(timezone.utc) + timedelta(days=plan.get("days", 30))).isoformat()
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": body.email.lower(),
            "name": body.name,
            "password": hashed,
            "auth_provider": "password",
            "is_admin": body.is_admin,
            "is_premium": body.is_premium or bool(plan),
            "subscription_plan": body.plan_id if body.plan_id != "free" else None,
            "subscription_end": sub_end,
            "subscription_status": "active" if plan else None,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        await _audit(admin_user, "create_user", target_email=body.email, request=request)
        return {"success": True, "user_id": user_doc["id"], "email": body.email}

    # =========================================================================
    # POST /admin/impersonate/{user_id}
    # =========================================================================

    @router.post("/impersonate/{user_id}")
    async def impersonate_user(
        user_id: str,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Generate a 1-hour JWT for the target user (for debugging/support)."""
        import jwt as _jwt, os as _os
        if user_id == admin_user.get("id"):
            raise HTTPException(status_code=400, detail="No puedes impersonar tu propio usuario")
        target = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "email": 1, "name": 1, "is_admin": 1})
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        jwt_secret = _os.environ.get("JWT_SECRET", "")
        payload = {
            "user_id": target["id"],
            "email": target.get("email"),
            "impersonated_by": admin_user.get("email"),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = _jwt.encode(payload, jwt_secret, algorithm="HS256")
        await _audit(admin_user, "impersonate_user", target_id=user_id,
                     target_email=target.get("email", ""), request=request)
        return {"token": token, "user_email": target.get("email"), "expires_in": 3600}

    # =========================================================================
    # GET /admin/revenue — Revenue analytics (MRR, churn, conversión, LTV)
    # =========================================================================

    @router.get("/revenue")
    async def get_revenue(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """MRR history, churn, conversion rate y LTV calculados desde la DB."""
        all_users: List[dict] = await db.users.find({}, {"_id": 0}).to_list(10000)
        plan_price = {
            "monthly":   subscription_plans.get("monthly",   {}).get("price", 17),
            "quarterly": round(subscription_plans.get("quarterly", {}).get("price", 45) / 3, 2),
            "annual":    round(subscription_plans.get("annual",    {}).get("price", 200) / 12, 2),
            "lifetime":  0,
        }
        plan_ltv = {
            "monthly":   subscription_plans.get("monthly",   {}).get("price", 17) * 12,
            "quarterly": subscription_plans.get("quarterly", {}).get("price", 45) * 4,
            "annual":    subscription_plans.get("annual",    {}).get("price", 200),
            "lifetime":  subscription_plans.get("lifetime",  {}).get("price", 500),
        }
        now = datetime.now(timezone.utc)
        total_users = len(all_users)
        premium_users = [u for u in all_users if u.get("is_premium")]
        mrr_current = round(sum(plan_price.get(u.get("subscription_plan", ""), 0) for u in premium_users), 2)
        # MRR history: last 6 months (simulate from created_at distribution)
        history = []
        for i in range(5, -1, -1):
            cutoff = now - timedelta(days=30 * i)
            month_label = cutoff.strftime("%b %Y")
            active_that_month = [
                u for u in all_users
                if u.get("is_premium") and (u.get("created_at") or "") <= cutoff.isoformat()
            ]
            mrr_month = round(sum(plan_price.get(u.get("subscription_plan", ""), 0) for u in active_that_month), 2)
            history.append({"mes": month_label, "mrr": mrr_month})
        # Churn: users who were premium and are not anymore
        canceled = [u for u in all_users if u.get("subscription_status") in ("canceled", "expired", "unpaid")]
        churn_rate = round(len(canceled) / max(len(premium_users) + len(canceled), 1) * 100, 1)
        # Conversion: free -> premium
        conversion_rate = round(len(premium_users) / max(total_users, 1) * 100, 1)
        # ARR
        arr = round(mrr_current * 12, 2)
        return {
            "mrr_current": mrr_current,
            "arr": arr,
            "churn": churn_rate,
            "conversion": conversion_rate,
            "ltv": plan_ltv,
            "history": history,
            "stats": {
                "premium_users": len(premium_users),
                "canceled_users": len(canceled),
                "total_users": total_users,
            },
        }

    # =========================================================================
    # GET /admin/usage — Usage analytics
    # =========================================================================

    @router.get("/usage")
    async def get_usage(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """DAU/WAU/MAU y uso de calculadoras desde logs de cálculos guardados."""
        now = datetime.now(timezone.utc)
        day_cutoff   = (now - timedelta(days=1)).isoformat()
        week_cutoff  = (now - timedelta(days=7)).isoformat()
        month_cutoff = (now - timedelta(days=30)).isoformat()
        all_users: List[dict] = await db.users.find({}, {"_id": 0, "last_seen": 1}).to_list(10000)
        dau = sum(1 for u in all_users if (u.get("last_seen") or "") >= day_cutoff)
        wau = sum(1 for u in all_users if (u.get("last_seen") or "") >= week_cutoff)
        mau = sum(1 for u in all_users if (u.get("last_seen") or "") >= month_cutoff)
        # Calculators used: from calculations collection
        calc_docs: List[dict] = await db.calculations.find(
            {}, {"_id": 0, "type": 1, "calculator_type": 1, "created_at": 1}
        ).to_list(5000)
        calc_counts: Dict[str, int] = {}
        for c in calc_docs:
            ctype = c.get("type") or c.get("calculator_type") or "unknown"
            calc_counts[ctype] = calc_counts.get(ctype, 0) + 1
        calc_usage = sorted(
            [{"name": k, "usos": v} for k, v in calc_counts.items()],
            key=lambda x: x["usos"], reverse=True
        )[:10]
        # Trades in journal (both /journal/trades and /performance/trades persist
        # into db.trades — there is no separate "performance_trades" collection)
        trade_count = await db.trades.count_documents({})
        alert_count = await db.alerts.count_documents({})
        return {
            "active_users": {"day": dau, "week": wau, "month": mau},
            "calc_usage": calc_usage,
            "total_calculations": len(calc_docs),
            "total_journal_trades": trade_count,
            "total_alerts": alert_count,
        }

    # =========================================================================
    # GET /admin/webhooks  — Stripe webhook logs
    # POST /admin/webhooks/{id}/retry
    # =========================================================================

    @router.get("/webhooks")
    async def get_webhook_logs(
        limit: int = Query(20, ge=1, le=200),
        _admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        logs = await db.stripe_webhook_logs.find(
            {}, {"_id": 0}
        ).sort("created", -1).to_list(limit)
        return {"logs": logs, "total": len(logs)}

    @router.post("/webhooks/{event_id}/retry")
    async def retry_webhook(
        event_id: str,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        log = await db.stripe_webhook_logs.find_one({"id": event_id}, {"_id": 0})
        if not log:
            raise HTTPException(status_code=404, detail="Webhook event not found")
        await db.stripe_webhook_logs.update_one(
            {"id": event_id}, {"$set": {"status": "retry_requested", "retried_at": datetime.now(timezone.utc).isoformat()}}
        )
        await _audit(admin_user, "retry_webhook", details={"event_id": event_id}, request=request)
        return {"success": True, "event_id": event_id, "status": "retry_requested"}

    # =========================================================================
    # GET /admin/coupons  — Listar cupones
    # POST /admin/coupons — Crear cupón
    # POST /admin/coupons/{id}/toggle — Activar/desactivar
    # =========================================================================

    @router.get("/coupons")
    async def list_coupons(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"coupons": coupons}

    @router.post("/coupons")
    async def create_coupon(
        body: CouponRequest,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        existing = await db.coupons.find_one({"id": body.id.upper()}, {"_id": 1})
        if existing:
            raise HTTPException(status_code=400, detail=f"Cupón '{body.id}' ya existe")
        if body.type not in ("percent", "fixed"):
            raise HTTPException(status_code=400, detail="Tipo debe ser 'percent' o 'fixed'")
        if body.type == "percent" and not (0 < body.discount <= 100):
            raise HTTPException(status_code=400, detail="Descuento porcentual debe estar entre 1 y 100")
        coupon = {
            "id": body.id.upper(),
            "discount": body.discount,
            "type": body.type,
            "max_uses": body.max_uses,
            "uses": 0,
            "expires": body.expires,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin_user.get("email", ""),
        }
        await db.coupons.insert_one(coupon)
        await _audit(admin_user, "create_coupon", details={"coupon_id": body.id}, request=request)
        return {"success": True, "coupon": coupon}

    @router.post("/coupons/{coupon_id}/toggle")
    async def toggle_coupon(
        coupon_id: str,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        coupon = await db.coupons.find_one({"id": coupon_id.upper()}, {"_id": 0})
        if not coupon:
            raise HTTPException(status_code=404, detail="Cupón no encontrado")
        new_state = not coupon.get("active", True)
        await db.coupons.update_one({"id": coupon_id.upper()}, {"$set": {"active": new_state}})
        await _audit(admin_user, "toggle_coupon", details={"coupon_id": coupon_id, "active": new_state}, request=request)
        return {"success": True, "coupon_id": coupon_id, "active": new_state}

    # =========================================================================
    # GET /admin/feature-flags
    # PATCH /admin/feature-flags/{id}
    # =========================================================================

    DEFAULT_FEATURE_FLAGS = [
        {"id": "monte_carlo",   "label": "Monte Carlo",          "desc": "Simulación de escenarios",       "plans": "Premium+", "enabled": True},
        {"id": "backtest",      "label": "Backtest histórico",   "desc": "Datos reales yfinance",          "plans": "Premium+", "enabled": True},
        {"id": "ai_coach",      "label": "AI Trade Coach",       "desc": "Análisis IA de opciones",        "plans": "Premium+", "enabled": True},
        {"id": "iv_surface",    "label": "IV Surface 3D",        "desc": "Superficie de volatilidad",      "plans": "Premium+", "enabled": True},
        {"id": "market_flow",   "label": "Market Flow",          "desc": "Flow intraday de opciones",      "plans": "Premium+", "enabled": True},
        {"id": "unusual_activity","label": "Unusual Activity",   "desc": "Opciones inusuales",             "plans": "Premium+", "enabled": True},
        {"id": "portfolio_greeks","label": "Portfolio Greeks",   "desc": "Griegos agregados de cartera",   "plans": "Premium+", "enabled": True},
        {"id": "alert_emails",  "label": "Email Alerts",         "desc": "Alertas de precio por email",    "plans": "Todos",    "enabled": True},
        {"id": "journal",       "label": "Trade Journal",        "desc": "Diario de trading",              "plans": "Todos",    "enabled": True},
        {"id": "education",     "label": "Centro de Educación",  "desc": "Patrones y guías",               "plans": "Todos",    "enabled": True},
    ]

    @router.get("/feature-flags")
    async def get_feature_flags(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        stored = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
        stored_map = {f["id"]: f for f in stored}
        flags = []
        for default in DEFAULT_FEATURE_FLAGS:
            flag = {**default, **stored_map.get(default["id"], {})}
            flags.append(flag)
        return {"flags": flags}

    @router.patch("/feature-flags/{flag_id}")
    async def update_feature_flag(
        flag_id: str,
        body: FeatureFlagPatch,
        request: Request,
        admin_user: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        await db.feature_flags.update_one(
            {"id": flag_id},
            {"$set": {"id": flag_id, "enabled": body.enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        await _audit(admin_user, "toggle_feature_flag",
                     details={"flag_id": flag_id, "enabled": body.enabled}, request=request)
        return {"success": True, "flag_id": flag_id, "enabled": body.enabled}

    # =========================================================================
    # FEATURE 1: EMAIL CAMPAIGNS
    # =========================================================================

    class CampaignCreate(BaseModel):
        name: str
        subject: str
        body_html: str
        segment: str  # free | premium | all | expired

    @router.get("/campaigns")
    async def list_campaigns(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """List all email campaigns."""
        campaigns = await db.email_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"campaigns": campaigns}

    @router.post("/campaigns")
    async def create_campaign(
        body: CampaignCreate,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Create a new email campaign."""
        import uuid as _uuid
        import re as _re_html
        # Strip dangerous tags/attributes to prevent stored XSS in campaign emails
        _DANGEROUS_TAGS = _re_html.compile(
            r'<\s*(script|iframe|object|embed|form|link|meta|base|applet|svg|math)[^>]*>.*?</\s*\1\s*>|'
            r'<\s*(script|iframe|object|embed|form|link|meta|base|applet|svg|math)[^>]*/?>',
            _re_html.IGNORECASE | _re_html.DOTALL,
        )
        _DANGEROUS_ATTRS = _re_html.compile(
            r'\s(on\w+|javascript\s*:)[^>]*', _re_html.IGNORECASE
        )
        safe_html = _DANGEROUS_TAGS.sub('', body.body_html)
        safe_html = _DANGEROUS_ATTRS.sub('', safe_html)
        doc = {
            "id": str(_uuid.uuid4()),
            "name": body.name,
            "subject": body.subject,
            "body_html": safe_html,
            "segment": body.segment,
            "status": "draft",
            "sent_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_at": None,
        }
        await db.email_campaigns.insert_one(doc)
        await _audit(admin, "campaign.create", details={"name": body.name, "segment": body.segment}, request=request)
        return doc

    @router.post("/campaigns/{campaign_id}/send")
    async def send_campaign(
        campaign_id: str,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Send a campaign to its segment."""
        campaign = await db.email_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        segment = campaign.get("segment", "all")
        now = datetime.now(timezone.utc)

        # Build user filter based on segment
        if segment == "premium":
            filt = {"is_premium": True}
        elif segment == "free":
            filt = {"$or": [{"is_premium": False}, {"is_premium": {"$exists": False}}]}
        elif segment == "expired":
            filt = {"subscription_status": "expired"}
        else:
            filt = {}

        users_to_send = await db.users.find(filt, {"_id": 0, "email": 1, "name": 1}).to_list(10000)

        # Get SendGrid API key from settings
        settings_raw = await _get_all_settings(db)
        sg_key = settings_raw.get("sendgrid_api_key", "")
        sender_email = settings_raw.get("sendgrid_sender_email", "noreply@tradingcalculatorpro.com")

        sent_count = 0
        if sg_key:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=30) as client:
                    for u in users_to_send:
                        payload = {
                            "personalizations": [{"to": [{"email": u["email"], "name": u.get("name", "")}]}],
                            "from": {"email": sender_email},
                            "subject": campaign["subject"],
                            "content": [{"type": "text/html", "value": campaign["body_html"]}],
                        }
                        r = await client.post(
                            "https://api.sendgrid.com/v3/mail/send",
                            json=payload,
                            headers={"Authorization": f"Bearer {sg_key}"},
                        )
                        if r.status_code in (200, 202):
                            sent_count += 1
            except Exception as e:
                logger.error(f"SendGrid error in campaign send: {e}")
        else:
            # Simulate send (no API key configured)
            sent_count = len(users_to_send)

        await db.email_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "sent", "sent_count": sent_count, "sent_at": now.isoformat()}},
        )
        await _audit(admin, "campaign.send", details={"campaign_id": campaign_id, "sent_count": sent_count}, request=request)
        return {"success": True, "sent_count": sent_count}

    # =========================================================================
    # FEATURE 2: i18n MANAGER
    # =========================================================================

    @router.get("/i18n")
    async def list_i18n_keys(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """List all i18n overrides stored in app_settings (prefix 'i18n_')."""
        docs = await db.app_settings.find(
            {"key": {"$regex": "^i18n_"}},
            {"_id": 0, "key": 1, "value": 1},
        ).to_list(1000)
        keys = []
        for d in docs:
            raw_key = d["key"][5:]  # strip "i18n_"
            value = d.get("value", {})
            if isinstance(value, str):
                try:
                    import json as _json
                    value = _json.loads(value)
                except Exception:
                    value = {"es": value, "en": value}
            keys.append({"key": raw_key, "es": value.get("es", ""), "en": value.get("en", "")})
        return {"keys": keys, "count": len(keys)}

    class I18nUpsert(BaseModel):
        key: str
        es: str
        en: str

    @router.post("/i18n")
    async def upsert_i18n_key(
        body: I18nUpsert,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Upsert an i18n override key into app_settings."""
        import json as _json
        setting_key = f"i18n_{body.key}"
        value = _json.dumps({"es": body.es, "en": body.en})
        await _upsert_setting(db, setting_key, value)
        await _audit(admin, "i18n.upsert", details={"key": body.key}, request=request)
        return {"success": True, "key": body.key}

    # =========================================================================
    # FEATURE 3: PAYMENT HISTORY PER USER
    # =========================================================================

    @router.get("/users/{user_id}/payments")
    async def get_user_payments(
        user_id: str,
        _admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """List payment transactions for a specific user."""
        txns = await db.payment_transactions.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        # Convert datetime fields
        for t in txns:
            for field in ("created_at", "updated_at"):
                if isinstance(t.get(field), datetime):
                    t[field] = t[field].isoformat()
        total_amount = sum(t.get("amount", 0) for t in txns if t.get("status") == "succeeded")
        return {"transactions": txns, "total_amount": total_amount, "count": len(txns)}

    # =========================================================================
    # FEATURE 4: CHURN SURVEY (admin views)
    # =========================================================================

    @router.get("/churn-surveys")
    async def list_churn_surveys(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """List all churn survey responses with reason breakdown."""
        surveys = await db.churn_surveys.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        reasons: Dict[str, int] = {}
        for s in surveys:
            r = s.get("reason", "other")
            reasons[r] = reasons.get(r, 0) + 1
        for s in surveys:
            if isinstance(s.get("created_at"), datetime):
                s["created_at"] = s["created_at"].isoformat()
        return {"surveys": surveys, "total": len(surveys), "by_reason": reasons}

    class FollowUpNote(BaseModel):
        note: str

    @router.post("/churn-surveys/{survey_id}/follow-up")
    async def churn_follow_up(
        survey_id: str,
        body: FollowUpNote,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Add a follow-up note to a churn survey entry."""
        result = await db.churn_surveys.update_one(
            {"id": survey_id},
            {"$set": {"follow_up_note": body.note, "follow_up_at": datetime.now(timezone.utc).isoformat(),
                      "follow_up_by": admin.get("email")}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Survey not found")
        await _audit(admin, "churn_survey.follow_up", details={"survey_id": survey_id}, request=request)
        return {"success": True}

    # =========================================================================
    # FEATURE 5: COHORT ANALYSIS
    # =========================================================================

    @router.get("/cohorts")
    async def get_cohorts(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Compute cohort analysis: signup month → conversion to premium."""
        all_users = await db.users.find({}, {"_id": 0, "created_at": 1, "is_premium": 1,
                                             "subscription_plan": 1, "subscription_end": 1}).to_list(10000)
        cohort_data: Dict[str, Dict] = {}
        for u in all_users:
            created = u.get("created_at")
            if not created:
                continue
            try:
                if isinstance(created, datetime):
                    month = created.strftime("%Y-%m")
                else:
                    month = str(created)[:7]
            except Exception:
                continue
            if month not in cohort_data:
                cohort_data[month] = {"total": 0, "converted": 0, "days_to_convert": []}
            cohort_data[month]["total"] += 1
            if u.get("is_premium") or u.get("subscription_plan") not in (None, "none", "free", ""):
                cohort_data[month]["converted"] += 1

        cohorts = []
        for month in sorted(cohort_data.keys()):
            d = cohort_data[month]
            total = d["total"]
            converted = d["converted"]
            rate = round((converted / total * 100), 1) if total else 0
            avg_days = round(sum(d["days_to_convert"]) / len(d["days_to_convert"]), 1) if d["days_to_convert"] else None
            cohorts.append({
                "month": month,
                "total_users": total,
                "converted": converted,
                "conversion_rate": rate,
                "avg_days_to_convert": avg_days,
            })
        return {"cohorts": cohorts}

    # =========================================================================
    # FEATURE 6: REFERRAL MANAGER
    # =========================================================================

    @router.get("/referrals")
    async def list_referrals(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """List referral records."""
        try:
            referrals = await db.referrals.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
            for r in referrals:
                if isinstance(r.get("created_at"), datetime):
                    r["created_at"] = r["created_at"].isoformat()
        except Exception:
            referrals = []

        # Also check users with referrer_id
        referred_users = await db.users.find(
            {"referrer_id": {"$exists": True}}, {"_id": 0, "id": 1, "email": 1, "referrer_id": 1, "created_at": 1}
        ).to_list(1000)

        return {
            "referrals": referrals,
            "referred_users_count": len(referred_users),
            "note": "Referral system uses referrer_id field on users collection.",
        }

    @router.get("/referrals/leaderboard")
    async def referrals_leaderboard(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Top 10 referrers by referral count."""
        referred_users = await db.users.find(
            {"referrer_id": {"$exists": True, "$ne": None}},
            {"_id": 0, "referrer_id": 1, "is_premium": 1},
        ).to_list(10000)

        leaderboard_map: Dict[str, Dict] = {}
        for u in referred_users:
            rid = u.get("referrer_id")
            if not rid:
                continue
            if rid not in leaderboard_map:
                leaderboard_map[rid] = {"referrer_id": rid, "referrals": 0, "conversions": 0}
            leaderboard_map[rid]["referrals"] += 1
            if u.get("is_premium"):
                leaderboard_map[rid]["conversions"] += 1

        # Enrich with emails
        top = sorted(leaderboard_map.values(), key=lambda x: x["referrals"], reverse=True)[:10]
        for entry in top:
            ref_user = await db.users.find_one({"id": entry["referrer_id"]}, {"_id": 0, "email": 1})
            entry["email"] = ref_user.get("email", entry["referrer_id"]) if ref_user else entry["referrer_id"]

        return {"leaderboard": top, "total_referrers": len(leaderboard_map)}

    # =========================================================================
    # FEATURE 7: PLANS EDITOR
    # =========================================================================

    @router.get("/plans")
    async def list_plans(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Return current subscription plans (app_settings overrides + hardcoded fallback)."""
        plans_out = []
        for plan_id, plan_data in subscription_plans.items():
            override_doc = await db.app_settings.find_one({"key": f"plan_{plan_id}"}, {"_id": 0, "value": 1})
            if override_doc and override_doc.get("value"):
                import json as _json
                try:
                    override = _json.loads(override_doc["value"])
                    merged = {**plan_data, **override, "id": plan_id, "overridden": True}
                except Exception:
                    merged = {**plan_data, "id": plan_id, "overridden": False}
            else:
                merged = {**plan_data, "id": plan_id, "overridden": False}
            plans_out.append(merged)
        return {"plans": plans_out}

    class PlanUpdate(BaseModel):
        price: Optional[float] = None
        label: Optional[str] = None
        days: Optional[int] = None

    @router.post("/plans/{plan_id}")
    async def update_plan(
        plan_id: str,
        body: PlanUpdate,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Update a plan's price/label/days (stored in app_settings as override)."""
        if plan_id not in subscription_plans:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
        import json as _json
        existing_doc = await db.app_settings.find_one({"key": f"plan_{plan_id}"}, {"_id": 0, "value": 1})
        existing = {}
        if existing_doc and existing_doc.get("value"):
            try:
                existing = _json.loads(existing_doc["value"])
            except Exception:
                existing = {}
        if body.price is not None:
            existing["price"] = body.price
        if body.label is not None:
            existing["name"] = body.label
        if body.days is not None:
            existing["days"] = body.days
        await _upsert_setting(db, f"plan_{plan_id}", _json.dumps(existing))
        await _audit(admin, "plan.update", details={"plan_id": plan_id, "changes": existing}, request=request)
        return {"success": True, "plan_id": plan_id, "override": existing}

    # =========================================================================
    # FEATURE 8: MAINTENANCE MODE
    # =========================================================================

    @router.get("/maintenance")
    async def get_maintenance(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Get current maintenance mode state."""
        settings_raw = await _get_all_settings(db)
        enabled_raw = settings_raw.get("maintenance_mode", "false")
        enabled = str(enabled_raw).lower() in ("true", "1", "yes")
        message = settings_raw.get("maintenance_message", "Estamos realizando tareas de mantenimiento. Volvemos pronto.")
        return {"enabled": enabled, "message": message}

    class MaintenanceUpdate(BaseModel):
        enabled: bool
        message: str = "Estamos realizando tareas de mantenimiento. Volvemos pronto."

    @router.post("/maintenance")
    async def set_maintenance(
        body: MaintenanceUpdate,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Update maintenance mode state."""
        await _upsert_setting(db, "maintenance_mode", "true" if body.enabled else "false")
        await _upsert_setting(db, "maintenance_message", body.message)
        await _audit(admin, "maintenance.update", details={"enabled": body.enabled}, request=request)
        return {"success": True, "enabled": body.enabled, "message": body.message}

    # =========================================================================
    # FEATURE 9: ERROR MONITOR
    # =========================================================================

    @router.get("/errors")
    async def list_errors(
        status: Optional[str] = Query(None),
        resolved: Optional[bool] = Query(None),
        limit: int = Query(100, ge=1, le=500),
        _admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """List recent error logs."""
        filt: Dict[str, Any] = {}
        if status == "unresolved":
            filt["resolved"] = False
        elif status == "resolved":
            filt["resolved"] = True
        elif resolved is not None:
            filt["resolved"] = resolved
        errors = await db.error_logs.find(filt, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for e in errors:
            for field in ("created_at", "resolved_at"):
                if isinstance(e.get(field), datetime):
                    e[field] = e[field].isoformat()
        total = await db.error_logs.count_documents(filt)
        return {"errors": errors, "total": total}

    class ResolveNote(BaseModel):
        note: str = ""

    @router.post("/errors/{error_id}/resolve")
    async def resolve_error(
        error_id: str,
        body: ResolveNote,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Mark an error as resolved."""
        result = await db.error_logs.update_one(
            {"id": error_id},
            {"$set": {
                "resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolve_note": body.note,
                "resolved_by": admin.get("email"),
            }},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Error log not found")
        await _audit(admin, "error.resolve", details={"error_id": error_id, "note": body.note}, request=request)
        return {"success": True}

    # =========================================================================
    # FEATURE 10: RATE LIMITING DASHBOARD
    # =========================================================================

    @router.get("/rate-limits")
    async def get_rate_limits(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """Return configured rate limits and recent violations."""
        limits = [
            {"endpoint": "/api/login", "limit": "10/minute", "window": "1 min"},
            {"endpoint": "/api/register", "limit": "5/minute", "window": "1 min"},
            {"endpoint": "/api/password-reset", "limit": "5/hour", "window": "1 hour"},
            {"endpoint": "/api/admin/*", "limit": "200/minute", "window": "1 min"},
            {"endpoint": "/api/*", "limit": "300/minute", "window": "1 min"},
        ]
        try:
            violations = await db.rate_limit_violations.find(
                {}, {"_id": 0}
            ).sort("created_at", -1).limit(50).to_list(50)
            for v in violations:
                if isinstance(v.get("created_at"), datetime):
                    v["created_at"] = v["created_at"].isoformat()
        except Exception:
            violations = []
        return {"limits": limits, "recent_violations": violations}

    # =========================================================================
    # FEATURE 11: GDPR EXPORTS (admin view)
    # =========================================================================

    @router.get("/gdpr-exports")
    async def list_gdpr_exports(_admin: dict = Depends(require_admin_dep)) -> Dict[str, Any]:
        """List all GDPR export requests."""
        exports = await db.gdpr_exports.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        for e in exports:
            for field in ("created_at", "delivered_at"):
                if isinstance(e.get(field), datetime):
                    e[field] = e[field].isoformat()
        return {"exports": exports, "total": len(exports)}

    @router.post("/gdpr-exports/{export_id}/deliver")
    async def deliver_gdpr_export(
        export_id: str,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Regenerate and deliver a GDPR export to the user."""
        export_doc = await db.gdpr_exports.find_one({"id": export_id}, {"_id": 0})
        if not export_doc:
            raise HTTPException(status_code=404, detail="Export request not found")

        user_id = export_doc.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "password_hash": 0})
        trades = await db.trades.find({"user_id": user_id}, {"_id": 0}).to_list(10000)

        import json as _json
        export_data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "user": user or {},
            "trades": trades,
        }

        # Send via SendGrid if configured
        settings_raw = await _get_all_settings(db)
        sg_key = settings_raw.get("sendgrid_api_key", "")
        sender = settings_raw.get("sendgrid_sender_email", "noreply@tradingcalculatorpro.com")
        email = export_doc.get("email", "")
        sent = False

        if sg_key and email:
            try:
                import httpx
                body_html = (
                    f"<h2>Tu exportación de datos GDPR</h2>"
                    f"<p>Adjuntamos todos tus datos en formato JSON.</p>"
                    f"<pre>{_json.dumps(export_data, indent=2, default=str)[:5000]}</pre>"
                )
                payload = {
                    "personalizations": [{"to": [{"email": email}]}],
                    "from": {"email": sender},
                    "subject": "Tu exportación de datos — Trading Calculator PRO",
                    "content": [{"type": "text/html", "value": body_html}],
                }
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.post(
                        "https://api.sendgrid.com/v3/mail/send",
                        json=payload,
                        headers={"Authorization": f"Bearer {sg_key}"},
                    )
                    sent = r.status_code in (200, 202)
            except Exception as e:
                logger.error(f"GDPR deliver email error: {e}")

        now_iso = datetime.now(timezone.utc).isoformat()
        await db.gdpr_exports.update_one(
            {"id": export_id},
            {"$set": {"status": "delivered", "delivered_at": now_iso, "delivered_by": admin.get("email")}},
        )
        await _audit(admin, "gdpr.deliver", details={"export_id": export_id, "email": email, "sent": sent}, request=request)
        return {"success": True, "sent_email": sent, "export_id": export_id}


    return router


# ---------------------------------------------------------------------------
# Public settings route (no auth required) — register separately in server.py
# ---------------------------------------------------------------------------

def build_public_settings_router(db) -> APIRouter:
    """
    Crea el router público para /public/settings.
    No requiere autenticación. Solo devuelve claves públicas.

    Registrar en server.py:
        from admin_routes import build_public_settings_router
        api_router.include_router(build_public_settings_router(db))
    """
    router = APIRouter()

    @router.get("/public/settings")
    async def public_settings() -> Dict[str, Any]:
        """
        Devuelve solo las claves públicas (no secretas) para que el frontend
        pueda inyectar scripts de analytics, tracking, etc. sin rebuilds.
        """
        docs = await db.app_settings.find(
            {"key": {"$in": list(PUBLIC_SETTING_KEYS)}},
            {"_id": 0, "key": 1, "value": 1},
        ).to_list(200)
        return {d["key"]: d.get("value", "") for d in docs}


