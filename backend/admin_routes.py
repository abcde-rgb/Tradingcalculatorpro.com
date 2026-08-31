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
  POST /admin/settings                    — guardar/actualizar conectores y APIs
                                            (el GET y el PUT viven en server.py:8511 y 8534;
                                             el enmascarado real es `_mask_secret` de allí)
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

import ecb_rates

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from log_seguro import log_safe

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
}

# Claves que son secretas: se enmascaran con *** en GET
SECRET_SETTING_KEYS = {
    "stripe_secret_key",
    "stripe_webhook_secret",
    "sendgrid_api_key",
    "google_client_secret",
    "finnhub_api_key",
    "alpha_vantage_api_key",
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
        "label": "Criptomonedas",
        "description": ("Los precios salen de Binance y Kraken, que publican sus propios "
                        "datos de mercado sin clave ni licencia comercial. No hay nada "
                        "que configurar aquí."),
        "keys": [],
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
            # NO añadir aquí un TTL para `user_states`. Existió como
            # "TTL estados (días)" y era un mando desconectado: la tabla ya no
            # caduca, a propósito. Dentro viven las preferencias del usuario,
            # incluidos los setups escritos a mano, así que "arreglarlo"
            # conectándolo significaría borrar trabajo del usuario a los 90
            # días. Es una fila por (usuario, state_id) con un puñado fijo de
            # state_id: no crece sola, y el borrado por RGPD ya lo cubre
            # `_USER_DATA_COLLECTIONS`.
        ],
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_all_settings(db) -> Dict[str, str]:
    """Load all settings from app_settings (single global doc keyed by _id='global')."""
    doc = await db.app_settings.find_one({"_id": "global"}) or {}
    for k in ("_id", "updated_at", "updated_by"):
        doc.pop(k, None)
    return {k: str(v) for k, v in doc.items()}


async def _upsert_setting(db, key: str, value: str) -> None:
    await db.app_settings.update_one(
        {"_id": "global"},
        {"$set": {key: value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def _delete_setting(db, key: str) -> None:
    await db.app_settings.update_one(
        {"_id": "global"},
        {"$unset": {key: ""}},
    )


async def _get_setting_raw(db, key: str) -> Optional[str]:
    """Read one setting back, through the same door it was written.

    Every setting lives as a FIELD of the single `{_id: "global"}` document.
    Three readers used to look for a *document per key* instead
    (`find_one({"key": ...})`, `find({"key": {"$regex": "^i18n_"}})`), a shape
    nothing in the codebase has ever written — the shim turns that filter into
    `data->>'key' = $1` and the global document has no `key` field, so the query
    matched zero rows every time.

    The effect was silent and total: the plan editor, the i18n manager and
    `/public/settings` returned empty forever while the writes landed correctly
    one field over, and the admin got `{"success": true}` for changes that were
    never readable. Verified against PostgreSQL. Anything reading a setting must
    go through here or `_get_all_settings`, never query by a `key` field.
    """
    doc = await db.app_settings.find_one({"_id": "global"}) or {}
    value = doc.get(key)
    return None if value is None else str(value)


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
    encrypt_setting_fn=None,
) -> APIRouter:
    """
    Crea y devuelve el router de admin con las rutas ADICIONALES del panel.
    `log_admin_action_fn` es la función `log_admin_action` de server.py (opcional).

    NOTA (2026-07-12): las rutas CRUD de usuarios, métricas, settings, cupones,
    feature-flags, webhooks, revenue, usage, impersonate, promote y audit-log
    viven en `server.py` (se registran primero, así que ganan). Aquí SOLO quedan
    las rutas exclusivas de este módulo (campañas, i18n, cohortes, referidos,
    planes, mantenimiento, errores, exportaciones RGPD, rate-limits, pagos por
    usuario, churn-surveys, set-plan y los POST de settings/usuario). Se
    eliminaron los ~20 duplicados que estaban sombreados y eran código muerto.
    """
    router = APIRouter()

    async def _audit(admin, action, **kwargs):
        if log_admin_action_fn:
            try:
                await log_admin_action_fn(admin=admin, action=action, **kwargs)
            except Exception as exc:
                logger.warning(f"audit log failed: {log_safe(exc)}")

    # =========================================================================
    # GET /admin/metrics
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
                continue
            valor = str(value).strip() if value else ""
            if not valor:
                continue
            if key in SECRET_SETTING_KEYS:
                # La máscara son BOLITAS, no `***`.
                #
                # Este camino comparaba contra `"***"`, que era lo que devolvía un
                # `_mask()` de este módulo al que no llamaba nadie. La máscara real
                # la pinta `_mask_secret()` de server.py y son `••••1234`, así que
                # la guarda no cubría nada: reenviar el formulario sin tocar un
                # campo guardaba las bolitas COMO credencial. El PUT de server.py
                # ya se defendía de esto; este POST no.
                if "•" in valor or "\u2022" in valor:
                    rejected.append(key)
                    continue
                # Y cifrar, como hace el PUT. Sin esto había dos puertas al mismo
                # armario y sólo una con llave: lo que entrara por aquí quedaba en
                # claro aunque SECRET_ENCRYPTION_KEY estuviera puesta.
                if encrypt_setting_fn is not None:
                    valor = encrypt_setting_fn(valor)
            await _upsert_setting(db, key, valor)
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

        # -- Cripto (Binance) --
        # Se comprueba el proveedor que se usa de verdad. Antes hacía ping a
        # CoinGecko, que ya no interviene en ninguna petición.
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get("https://api.binance.com/api/v3/ping")
            results.append({"connector": "Binance (cripto)",
                            "status": "ok" if r.status_code == 200 else "error",
                            "http_code": r.status_code, "configured": True})
        except Exception as e:
            results.append({"connector": "Binance (cripto)", "status": "error",
                            "error": str(e), "configured": True})

        # -- Tipos de cambio (BCE) --
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(ecb_rates.ECB_HIST_90D)
            results.append({"connector": "BCE (forex)",
                            "status": "ok" if r.status_code == 200 else "error",
                            "http_code": r.status_code, "configured": True})
        except Exception as e:
            results.append({"connector": "BCE (forex)", "status": "error",
                            "error": str(e), "configured": True})

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
        sender_email = settings_raw.get("sendgrid_sender_email", "noreply@tradingcalculator.pro")

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
                logger.error(f"SendGrid error in campaign send: {log_safe(e)}")
        else:
            raise HTTPException(
                status_code=503,
                detail="SendGrid API key no configurada. Configura SENDGRID_API_KEY para enviar campañas.",
            )

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
        import json as _json
        settings = await _get_all_settings(db)
        keys = []
        for setting_key, raw in sorted(settings.items()):
            if not setting_key.startswith("i18n_"):
                continue
            value = raw
            if isinstance(value, str):
                try:
                    value = _json.loads(value)
                except Exception:
                    value = {"es": raw, "en": raw}
            if not isinstance(value, dict):
                value = {"es": str(raw), "en": str(raw)}
            keys.append({
                "key": setting_key[5:],  # strip "i18n_"
                "es": value.get("es", ""),
                "en": value.get("en", ""),
            })
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
        import json as _json
        settings = await _get_all_settings(db)
        plans_out = []
        for plan_id, plan_data in subscription_plans.items():
            raw = settings.get(f"plan_{plan_id}")
            if raw:
                try:
                    override = _json.loads(raw)
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
        stripe_price_id: Optional[str] = None

    @router.post("/plans/{plan_id}")
    async def update_plan(
        plan_id: str,
        body: PlanUpdate,
        request: Request,
        admin: dict = Depends(require_admin_dep),
    ) -> Dict[str, Any]:
        """Update a plan's label, price/days (stored in app_settings as override).

        Cambiar el importe exige mandar **también** el `stripe_price_id` nuevo, y
        al revés. El precio que se cobra lo decide el objeto Price de Stripe, no
        esta tabla: dejar mover uno sin el otro no arregla el editor, lo
        convierte en una forma de que la web anuncie 17 € y la pasarela cobre 29.
        Para cambiar de precio se crea un Price nuevo en Stripe y se mandan los
        dos campos juntos.
        """
        if plan_id not in subscription_plans:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
        if (body.price is None) != (body.stripe_price_id is None):
            raise HTTPException(
                status_code=400,
                detail=(
                    "El importe y el stripe_price_id se cambian juntos o no se cambian. "
                    "Crea un Price nuevo en Stripe con el importe deseado y envía los dos "
                    "campos; si sólo se mueve uno, lo anunciado y lo cobrado dejan de "
                    "coincidir."
                ),
            )
        import json as _json
        raw = await _get_setting_raw(db, f"plan_{plan_id}")
        existing = {}
        if raw:
            try:
                existing = _json.loads(raw)
            except Exception:
                existing = {}
        if body.price is not None:
            existing["price"] = body.price
            existing["stripe_price_id"] = body.stripe_price_id
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
        sender = settings_raw.get("sendgrid_sender_email", "noreply@tradingcalculator.pro")
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
                logger.error(f"GDPR deliver email error: {log_safe(e)}")

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

        Lee del documento global, que es donde `_upsert_setting` escribe. La
        versión anterior buscaba un documento por clave y devolvía `{}` siempre,
        así que GA4, GTM, Clarity y Trustpilot no se podían activar desde el
        panel por mucho que el admin los guardase.
        """
        settings = await _get_all_settings(db)
        return {k: settings[k] for k in PUBLIC_SETTING_KEYS if settings.get(k)}


