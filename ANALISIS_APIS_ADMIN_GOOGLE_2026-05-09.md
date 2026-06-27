# Análisis técnico: APIs faltantes, herramientas Google y perfil Admin

> **Última actualización:** 2026-05-10  
> **Repositorio:** Tradingcalculatorpro  
> **Estado general:** ⚠️ Múltiples endpoints críticos incompletos o con datos simulados

---

## 1) APIs Admin — estado y riesgos

### Poderes actuales del admin (confirmados)
- Ver métricas globales (`/admin/metrics`).
- Listar usuarios con filtros y paginación (`/admin/users`).
- Exportar usuarios a CSV (`/admin/users.csv`).
- Promover/degradar admins (`/admin/promote`).
- Ajustar plan de suscripción de usuarios (`/admin/set-plan` en router modular).

### Controles existentes
- `require_admin` valida `is_admin=True` en backend.
- Protección para evitar auto-democión en `admin_routes.py` (router modular).

### Riesgos detectados en permisos Admin
1. No hay RBAC granular (solo `is_admin` booleano).
2. No hay auditoría fuerte de acciones admin persistida en colección dedicada.
3. No hay 2FA obligatorio para admin.
4. Potencial inconsistencia: existen endpoints admin duplicados entre `server.py` y `admin_routes.py`.
5. Export CSV de usuarios puede ser sensible sin rate limit ni watermarking.

### APIs Admin faltantes (prioridad alta)
| Endpoint | Motivo | Urgencia |
|---|---|---|
| `GET /api/admin/audit-log` | Sin trazabilidad de acciones admin (forense/cumplimiento) | 🔴 Alta |
| `POST /api/admin/revoke-sessions` | No hay revocación explícita de JWT por usuario comprometido | 🔴 Alta |
| `GET /api/admin/user/{id}/activity` | Sin vista de actividad por usuario (IP, último login, cambios de rol) | 🟡 Media |
| `POST /api/admin/set-premium-expiry` | Sin ajuste explícito de vencimiento/auditoría comercial | 🟡 Media |
| `POST /api/admin/feature-flags` | Sin activación controlada de features por segmento | 🟡 Media |
| `POST /api/auth/2fa/enroll` + `verify` | Sin 2FA para cuentas admin | 🔴 Alta |

---

## 2) APIs de Datos de Mercado — datos reales vs. simulados

Estos endpoints devuelven datos **hardcodeados o sintéticos** en lugar de conectar con fuentes reales:

| Endpoint | Problema actual | API real recomendada | Prioridad |
|---|---|---|---|
| `GET /api/forex-prices` | Devuelve datos hardcodeados | Finnhub / Alpha Vantage / ExchangeRate-API | 🔴 Alta |
| `GET /api/indices-prices` | Índices bursátiles simulados (S&P, DAX, etc.) | Finnhub / Polygon.io | 🔴 Alta |
| `GET /prices` (commodities) | Oro (GC=F) y plata (SI=F) con valores fijos | yfinance (GC=F, CL=F, SI=F) | 🔴 Alta |
| `GET /api/ohlc/{symbol}` | Solo funciona para 11 coins del mapa CoinGecko; error silencioso para otros | CoinGecko Pro v3 autenticado | 🟡 Media |
| `GET /api/backtest` | Genera trades aleatorios sintéticos, no historial real | yfinance / Polygon.io histórico | 🟡 Media |

### Plan de implementación — Datos de Mercado
```
1. Forex real:
   - Integrar ExchangeRate-API (gratuito hasta 1500 req/mes) o Alpha Vantage (FOREX_INTRADAY).
   - Endpoint: GET /api/forex-prices?base=USD&symbols=EUR,GBP,JPY
   - Caché Redis 60 segundos para evitar rate limit.

2. Índices bursátiles:
   - Finnhub: GET /quote?symbol=^GSPC para S&P500, ^GDAXI para DAX.
   - Alternativa: Polygon.io /v2/aggs/ticker/{ticker}/prev para cierre anterior.

3. Commodities:
   - yfinance: yf.Ticker("GC=F").info para gold, "CL=F" para crude oil.
   - Schedule diario a las 06:00 UTC para actualizar precios de apertura.

4. OHLC ampliado:
   - CoinGecko Pro /coins/{id}/ohlc?vs_currency=usd&days=30
   - Mapa de símbolos ampliado (top 200 coins) con fallback a CoinGecko search.

5. Backtest histórico:
   - yfinance: yf.download(symbol, start=start_date, end=end_date, interval="1d")
   - Reemplazar trades aleatorios por señales basadas en SMA/EMA sobre datos reales.
```

---

## 3) APIs de Autenticación — endpoints faltantes

| Endpoint | Estado actual | Impacto | Prioridad |
|---|---|---|---|
| `POST /auth/forgot-password` | No existe | Sin self-service reset; solo admin puede hacerlo | 🔴 Crítica |
| `POST /auth/reset-password` | No existe | Flujo de reset incompleto sin este endpoint | 🔴 Crítica |
| `POST /auth/verify-email` | No existe | Sin verificación de email en registro normal (solo Google verifica) | 🔴 Alta |

### Flujo completo de reset de contraseña a implementar
```
POST /auth/forgot-password
  Body: { "email": "user@example.com" }
  Acción:
    1. Buscar usuario en MongoDB por email.
    2. Generar token seguro (secrets.token_urlsafe(32)).
    3. Guardar hash del token + expiry (15 min) en colección password_reset_tokens.
    4. Enviar email con enlace: https://app.tradingcalculatorpro.com/reset-password?token=TOKEN
  Response: { "message": "Si el email existe, recibirás un enlace en breve." }

POST /auth/reset-password
  Body: { "token": "...", "new_password": "..." }
  Acción:
    1. Buscar token en colección, verificar hash y expiración.
    2. Validar nueva contraseña (mínimo 8 chars, 1 número, 1 mayúscula).
    3. Hash con bcrypt y actualizar users.password_hash.
    4. Invalidar token (marcar como usado).
    5. Opcional: revocar todas las sesiones activas del usuario.

POST /auth/verify-email
  Acción:
    1. Al registrar, generar token de verificación (24h expiración).
    2. Enviar email con enlace de verificación.
    3. Al hacer clic: marcar users.email_verified = True.
    4. Bloquear features premium hasta verificar email.
```

---

## 4) APIs de Suscripción y Billing — gaps críticos

| Endpoint / Evento | Estado actual | Problema | Prioridad |
|---|---|---|---|
| `POST /subscriptions/change-plan` | Solo devuelve mensaje de texto | No ejecuta el cambio real en Stripe + MongoDB | 🔴 Alta |
| Webhook `customer.subscription.deleted` | No manejado | Suscripciones canceladas por impago no se desactivan automáticamente | 🔴 Crítica |
| Webhook `invoice.payment_failed` | No manejado | Usuario mantiene acceso premium aunque falle el cobro | 🔴 Crítica |

### Implementación webhooks Stripe faltantes
```python
# En stripe_webhooks.py — añadir casos:

elif event_type == "customer.subscription.deleted":
    subscription = event["data"]["object"]
    customer_id = subscription["customer"]
    # Buscar usuario por stripe_customer_id
    await db.users.update_one(
        {"stripe_customer_id": customer_id},
        {"$set": {
            "subscription_plan": "free",
            "subscription_status": "canceled",
            "subscription_end_date": datetime.utcnow()
        }}
    )

elif event_type == "invoice.payment_failed":
    invoice = event["data"]["object"]
    customer_id = invoice["customer"]
    attempt_count = invoice.get("attempt_count", 1)
    if attempt_count >= 3:
        # Degradar a free tras 3 intentos fallidos
        await db.users.update_one(
            {"stripe_customer_id": customer_id},
            {"$set": {"subscription_plan": "free", "subscription_status": "past_due"}}
        )
    # Enviar email de aviso en cada intento
```

---

## 5) APIs de Producto — funcionalidades faltantes

| Endpoint | Estado actual | Impacto en UX | Prioridad |
|---|---|---|---|
| `GET /api/performance/export` | No existe | Sin export a CSV/Excel de trades | 🟡 Media |
| `POST /api/calculations/{id}/save-to-journal` | No existe | Usuario debe copiar resultados de calculadora al diario manualmente | 🟡 Media |
| WebSocket `/ws/alerts` o Push Notifications | Las alertas se guardan en MongoDB pero no disparan en tiempo real | Sin notificaciones instantáneas | 🟡 Media |
| `POST /api/referrals/create` + `GET /api/referrals/stats` | No existe sistema de referidos | Sin programa de afiliados/referidos | 🟢 Baja |

---

## 6) CoinGecko Pro — plan de migración

**Situación actual:** API pública gratuita con rate limit de ~30 req/min → fallback a precios simulados cuando se agota.

**Solución:**
```
1. Obtener API key CoinGecko Pro (Demo gratuita: 10k req/mes).
2. Añadir header en todas las llamadas: x-cg-pro-api-key: ${COINGECKO_API_KEY}
3. Rate limit Pro: 500 req/min — elimina los fallbacks sintéticos.
4. Cache layer:
   - Redis con TTL 30s para precios spot.
   - TTL 5min para datos de mercado (market_cap, volume).
5. Ampliar mapa de símbolos de 11 a top-200 coins por market cap.
```

---

## 7) Gap de Seguridad — Índice único en MongoDB

> ⚠️ **Crítico:** Sin índice único en `users.email`, pueden crearse cuentas duplicadas por condición de carrera (race condition en registro simultáneo).

**Solución inmediata:**
```javascript
// En MongoDB shell o script de migración:
db.users.createIndex({ "email": 1 }, { unique: true, sparse: false })

// En Python con Motor/PyMongo (al inicializar app):
await db.users.create_index([("email", 1)], unique=True)
```

**Por qué la validación a nivel aplicación no es suficiente:**
- Dos requests simultáneos de `POST /auth/register` con el mismo email pueden pasar la validación de unicidad al mismo tiempo antes de que se ejecute el `insert`.
- Solo un índice único en la BD garantiza atomicidad.

---

## 8) Google Cloud — integraciones faltantes

### Ya presentes
- Google OAuth login (`/api/auth/google`).
- GA4, GTM, Search Console verification, AdSense (por variables de entorno).

### Faltantes recomendadas
| Integración | Beneficio | Urgencia |
|---|---|---|
| Google reCAPTCHA Enterprise v3 | Protección en login, register y forgot-password | 🔴 Alta |
| Google Cloud Secret Manager | Gestión segura de JWT/Stripe/OAuth secrets en producción | 🟡 Media |
| Google Cloud Logging + Error Reporting | Observabilidad centralizada de errores y trazas | 🟡 Media |
| BigQuery export de eventos | Analytics de producto, detección de fraude | 🟢 Baja |
| Gmail API / Workspace SMTP OAuth | Emails transaccionales auditables (reset password, verificación) | 🔴 Alta |

---

## 9) Roadmap de implementación (orden recomendado)

### Fase 1 — Crítico (semana 1-2)
- [ ] Índice único MongoDB `users.email`
- [ ] `POST /auth/forgot-password` + `POST /auth/reset-password`
- [ ] Webhooks Stripe: `customer.subscription.deleted` + `invoice.payment_failed`
- [ ] `POST /subscriptions/change-plan` real (llamada a Stripe API)

### Fase 2 — Datos reales (semana 2-3)
- [ ] Forex real (ExchangeRate-API o Alpha Vantage)
- [ ] Índices reales (Finnhub)
- [ ] Commodities reales (yfinance)
- [ ] Migrar a CoinGecko Pro API key

### Fase 3 — Auth completa (semana 3-4)
- [ ] `POST /auth/verify-email`
- [ ] reCAPTCHA v3 en formularios de auth
- [ ] 2FA para cuentas admin

### Fase 4 — Producto (semana 4-6)
- [ ] `GET /api/performance/export` (CSV/Excel)
- [ ] `POST /api/calculations/{id}/save-to-journal`
- [ ] OHLC ampliado para todos los símbolos crypto
- [ ] Backtest con datos históricos reales (yfinance)
- [ ] WebSocket/Push notifications para alertas en tiempo real

### Fase 5 — Growth (semana 6+)
- [ ] Sistema de referidos/afiliados
- [ ] BigQuery export
- [ ] RBAC granular para admin (scopes: `admin:read`, `admin:write`, `admin:billing`)
- [ ] Audit log persistente para acciones admin
