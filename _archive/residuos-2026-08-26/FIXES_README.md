# Parches Críticos — TradingCalculator PRO

Este archivo documenta los 6 problemas críticos identificados en la auditoría
de mayo 2026 y cómo aplicar los parches del módulo `fixes.py`.

---

## Cómo integrar `fixes.py` en `server.py`

Añade al inicio de `server.py`, junto al resto de imports:

```python
from fixes import (
    check_jwt_secret,
    get_forex_prices_real,
    get_indices_prices_real,
    get_commodity_prices,
    ai_coach_guard,
    change_plan_real,
)
```

---

## Parche 1 — JWT_SECRET persistente

**Problema:** Si `JWT_SECRET` no está en las variables de entorno, se genera
uno nuevo en cada reinicio → todas las sesiones activas se invalidan.

**Solución:** Reemplaza la inicialización actual de `JWT_SECRET` por:

```python
# ANTES (línea ~60 de server.py):
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    import secrets as sec
    JWT_SECRET = sec.token_urlsafe(32)
    print("⚠️  WARNING: ...")

# DESPUÉS:
JWT_SECRET = check_jwt_secret()
```

**Acción obligatoria en producción:** configura `JWT_SECRET` en tu `.env`.

---

## Parche 2 — Forex en tiempo real (Finnhub)

**Problema:** `/api/forex-prices` devuelve siempre datos simulados hardcodeados.

**Solución:** Reemplaza el endpoint completo:

```python
@api_router.get("/forex-prices")
async def get_forex_prices():
    return await get_forex_prices_real()
```

Cada par incluirá `"is_simulated": false` cuando Finnhub responda correctamente.
Configurar `FINNHUB_API_KEY` en `.env` (plan gratuito en https://finnhub.io).

---

## Parche 3 — Índices en tiempo real (Finnhub)

**Problema:** `/api/indices-prices` devuelve siempre datos simulados.

**Solución:**

```python
@api_router.get("/indices-prices")
async def get_indices_prices():
    return await get_indices_prices_real()
```

---

## Parche 4 — Oro y Plata en tiempo real (Metals API)

**Problema:** En `/api/prices`, oro y plata tienen valores fijos (`2680`, `31.50`).

**Solución:** En el endpoint `/prices`, reemplaza las líneas de commodities:

```python
# ANTES:
data["gold"]   = {"usd": 2680, "eur": 2450, "usd_24h_change": 0.5}
data["silver"] = {"usd": 31.50, "eur": 28.80, "usd_24h_change": 0.8}

# DESPUÉS:
commodities = await get_commodity_prices()
data["gold"]   = commodities["gold"]
data["silver"] = commodities["silver"]
```

Configurar `METALS_API_KEY` en `.env` (plan gratuito en https://metals-api.com).

---

## Parche 5 — AI Trade Coach (503 descriptivo)

**Problema:** Si `EMERGENT_LLM_KEY` no está configurado, el endpoint
`/options/ai-analyze` lanza un error 500 genérico.

**Solución:** Añade `ai_coach_guard()` al inicio del endpoint:

```python
@api_router.post("/options/ai-analyze")
async def ai_analyze(request: dict, user: dict = Depends(require_user)):
    ai_coach_guard()   # ← añadir esta línea
    # ... resto del código
```

Ahora el cliente recibirá un 503 claro: "El AI Trade Coach no está disponible..."

---

## Parche 6 — Cambio de plan Stripe real

**Problema:** `/subscriptions/change-plan` simplemente dice
"cancela y compra de nuevo" — no modifica nada en Stripe.

**Solución:** Reemplaza el endpoint:

```python
@api_router.post("/subscriptions/change-plan")
async def change_plan_endpoint(
    request: ChangePlanRequest,
    user: dict = Depends(require_user)
):
    return await change_plan_real(
        user=user,
        new_plan_id=request.new_plan_id,
        subscription_plans=SUBSCRIPTION_PLANS,
        db=db,
        # Opcional: mapa de plan_id -> Stripe Price ID
        # stripe_price_ids={
        #     "monthly":   "price_xxx",
        #     "quarterly": "price_yyy",
        #     "annual":    "price_zzz",
        # }
    )
```

**Requisito:** Cada plan en `SUBSCRIPTION_PLANS` debe tener un campo
`stripe_price_id` con el ID real del precio en Stripe Dashboard,
o pasar el dict `stripe_price_ids` directamente.

---

## Resumen de variables de entorno necesarias

| Variable | Obligatoria | Servicio | Plan gratuito |
|---|---|---|---|
| `JWT_SECRET` | ✅ Sí | Seguridad sesiones | — |
| `GOOGLE_CLIENT_ID` | ⚠️ Para OAuth Google | Google Cloud | Sí |
| `STRIPE_API_KEY` | ⚠️ Para pagos | Stripe | Test mode |
| `SENDGRID_API_KEY` | ⚠️ Para emails | SendGrid | 100/día gratis |
| `EMERGENT_LLM_KEY` | ⚠️ Para AI Coach | Emergent LLM | — |
| `FINNHUB_API_KEY` | ⚠️ Para forex real | Finnhub | 60 req/min |
| `METALS_API_KEY` | ⚠️ Para metales real | Metals API | 100/mes |
