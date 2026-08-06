# 📋 DIARIO DE BUGS & FIXES — TradingCalculator.Pro

> **Instrucciones:** Cada entrada tiene fecha, descripción, causa raíz, solución y estado **verificado contra el código real** (no suposiciones).
>
> ⚠️ **Aviso importante (2026-06-02):** la versión anterior de este diario estaba
> desactualizada: marcaba como "SIN RESOLVER" varios bugs que el código **ya
> tenía corregidos**, y estimaba "~30% funcional" cuando la realidad es mucho
> mayor. Fue creada sin contrastar con el código. Esta versión corrige esas
> inexactitudes verificando archivo por archivo.

---

### BUG-021 — Host-header injection en enlaces de email (reset de contraseña / verificación)
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/missing_apis.py` (`forgot_password`, `send_verification_email`) · **Estado:** ✅ RESUELTO (2026-07-14)

Los endpoints `POST /auth/forgot-password` y `POST /auth/send-verification-email`
construían el enlace que se envía por email a partir de cabeceras controlables por
el atacante: `Origin` → `Referer` → `str(request.base_url)` (que deriva del header
`Host`). Un atacante podía pedir el reset del email de **otra persona** enviando
`Origin: https://evil.com`; la víctima recibía un correo legítimo con un enlace
`https://evil.com/reset-password#<token>`. Como el token viaja en la URL, la página
del atacante (JS leyendo `location.hash`) lo captura → **robo de cuenta**. En
verificación el token va en query-string, así que se filtra directamente a los logs
del atacante. Es la misma clase que el CVE `PYSEC-2026-161` de Starlette.
**Causa raíz:** confianza en `Host`/`Origin`/`Referer` para construir enlaces de
seguridad enviados por email.
**Solución:** nuevo helper `_trusted_link_base(request)` que solo devuelve el
`Origin` si está en la allow-list (misma que CORS: dominio canónico + `CORS_ORIGINS`
+ localhost en dev); en cualquier otro caso cae a `FRONTEND_URL` canónico. **Nunca**
usa `base_url`/`Referer`. El magic-link (login sin contraseña, el más peligroso) ya
era seguro porque usaba `FRONTEND_URL`.
**Verificado:** `py_compile` OK; **9 tests nuevos** en `tests/test_security_unit.py`
(origins maliciosos con trucos de sufijo/prefijo/userinfo → siempre canónico; allow-list
CORS respetada). Pendiente prueba en vivo (deploy bloqueado por facturación GCP).

### Endurecimiento asociado (2026-07-14)
- **Suite de seguridad en CI** (`tests/test_security_unit.py`, 41 tests): fuzz de inyección SQL contra el shim
  (claves whitelisted, valores parametrizados), bcrypt no reversible, host-header. Corre siempre (sufijo `_unit.py`).
- **CVEs de dependencias**: `PyJWT 2.9→2.13`, `aiohttp 3.11.10→3.14.1`, `python-multipart 0.0.12→0.0.32`,
  `python-dotenv 1.0.1→1.2.2` (50/58 CVEs que reportó `pip-audit`). `starlette` pendiente (atado a FastAPI; upgrade coordinado).

### BUG-020 — Borrar cuenta NO cancelaba la suscripción de Stripe (cobro tras baja)
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/server.py` (`delete_account`) · **Estado:** ✅ RESUELTO (2026-07-12)

`DELETE /auth/account` borraba el usuario y sus datos pero **no cancelaba la
suscripción activa en Stripe**. Consecuencia real: quien se daba de baja seguía
siendo cobrado cada periodo porque la suscripción seguía viva en Stripe (riesgo
económico y de reclamaciones/chargebacks).
**Causa raíz:** el borrado RGPD no tocaba Stripe.
**Solución:** nuevo `_cancel_stripe_subscriptions_for_user()` que lista y cancela
las suscripciones activas del `stripe_customer_id` antes de borrar (best-effort,
nunca bloquea el borrado). Limpieza RGPD ampliada a todas las colecciones con
`user_id`. Aviso en el diálogo de borrado del front.
**Verificado:** `py_compile` OK; reutiliza el patrón `stripe.Subscription.list/delete`
ya usado en `cancel_subscription`. Pendiente prueba en vivo (deploy bloqueado por
facturación GCP).

### Mejoras de seguridad asociadas (2026-07-12)
- **Verificación de email en registro** (antes no se enviaba ni marcaba). Soft, no bloquea login.
- **2FA (TOTP) opcional** con pyotp: `/auth/2fa/*` + reto en login + gestión en Ajustes.
- **Route shadowing admin** resuelto: −20 handlers duplicados muertos en `admin_routes.py`.
- **SubscriptionPage**: `credentials:'include'` en los fetch (cookies en recarga).

---

## ✅ BUGS YA RESUELTOS EN EL CÓDIGO (el diario anterior los daba por rotos)

### BUG-001 — Demo bypass admin en store.js
**Severidad:** 🔴 CRÍTICA · **Archivo:** `frontend/src/lib/store.js` · **Estado:** ✅ RESUELTO

El bypass hardcodeado (`DEMO_USER` con `is_admin:true` inyectado si el email era
`demo@btccalc.pro`) **ya no existe**. `login()` solo autentica contra el backend.
El único resto es `DEMO_TOKEN`, que se usa para *omitir* llamadas API cuando el
backend emite un token demo — no concede privilegios en el cliente.
**Verificado:** `store.js` no contiene ningún objeto `DEMO_USER` ni bloque
`if (email === 'demo@btccalc.pro')`.

### BUG-002 — REACT_APP_BACKEND_URL en el build
**Severidad:** 🔴 CRÍTICA · **Archivos:** `store.js`, workflows · **Estado:** ✅ RESUELTO

El código ya **no genera `undefined` silencioso**: `const API = BACKEND_URL ? ... : null`
y cada acción devuelve `backendNotConfigured` si `!API`. El build de producción
inyecta `REACT_APP_BACKEND_URL` vía `deploy-gh-pages.yml`.
**Nota operativa:** que el secreto esté configurado en GitHub es responsabilidad de
despliegue, pero el código ya lo maneja con elegancia.

### BUG-003 — Stripe checkout/webhooks
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/server.py` · **Estado:** ✅ IMPLEMENTADO EN CÓDIGO

Contrario a lo que decía el diario anterior, **los Price IDs SÍ están en el código**:
`monthly/quarterly/annual/lifetime` con `stripe_price_id: price_1TXM8...`. Existe
`POST /api/checkout/create`, `stripe.checkout.Session.create(...)` y manejo de webhook.
**Pendiente (ops, no código):** confirmar que las claves `STRIPE_API_KEY` /
`STRIPE_WEBHOOK_SECRET` y los productos están activos en el dashboard de Stripe.

### BUG-004 — Panel admin con datos "hardcodeados"
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/admin_routes.py` · **Estado:** ✅ RESUELTO

No hay ningún `return {"total_users": 1250}`. `GET /admin/metrics` calcula valores
**reales**: `total_users = len(all_users)`, premium/admin counts, `new_users_30d`,
MRR, breakdown por plan/proveedor/locale.
**Nota (corregida):** el backend usa **PostgreSQL (asyncpg)** con un **adaptador
hecho a mano compatible con la API de Motor/MongoDB** (`server.py:352`, "Motor-compatible
Collection wrapper over asyncpg + JSONB"). Por eso el código usa `db.users.find(...)`
estilo Mongo aunque por debajo sea SQL. (El diario anterior decía PostgreSQL a secas;
una versión intermedia de este diario dijo MongoDB — ambas imprecisas. Esta es la real.)

---

## 🟠 BUGS REALES CORREGIDOS EN ESTA SESIÓN (2026-06-02)

### BUG-009 — Dos workflows desplegando el frontend (condición de carrera) 🆕
**Severidad:** 🔴 CRÍTICA · **Archivos:** `.github/workflows/deploy-cloud-run.yml`,
`.github/workflows/deploy-gh-pages.yml` · **Estado:** ✅ RESUELTO

**Causa raíz (la "cagada" entre los dos asistentes):** dos asistentes distintos
crearon, sin coordinarse, **dos jobs que despliegan el frontend a la rama `gh-pages`**
ante el mismo evento (`push` a `main` con cambios en `frontend/**`):

- `deploy-gh-pages.yml` (correcto y completo): `REACT_APP_GOOGLE_CLIENT_ID` + analytics
  (GA4/GTM/GSC/Bing) + `PUBLIC_URL` + copia `index.html → 404.html` para rutas SPA +
  `npm ci --legacy-peer-deps`.
- `deploy-cloud-run.yml → job deploy-frontend` (añadido después, **degradado**): solo
  `REACT_APP_BACKEND_URL`, **sin** Google OAuth, **sin** analytics, **sin** `404.html`,
  `npm ci` sin `--legacy-peer-deps` y `force_orphan: true`.

Ambos corrían en paralelo y **el último en terminar sobrescribía al otro**. Si ganaba
el degradado: se rompía el login con Google, se perdían las analíticas y los enlaces
directos (`/dashboard`, etc.) devolvían 404.

**Solución aplicada:**
1. Eliminado el job `deploy-frontend` de `deploy-cloud-run.yml`.
2. `deploy-cloud-run.yml` ya **solo** se dispara con `backend/**` (responsabilidad: backend).
3. `deploy-gh-pages.yml` queda como **única** vía de despliegue del frontend.

### BUG-006 — "Olvidé mi contraseña" mentía al usuario
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `frontend/src/pages/AuthPages.jsx` · **Estado:** ✅ RESUELTO

`ForgotPasswordPage` tenía un fallback que, si `!API`, hacía `setTimeout(600ms)` y
mostraba "email enviado" **sin enviar nada**. Sustituido por un error honesto
(`toast.error('Backend no configurado')`), coherente con el patrón ya usado en
`MagicPage`/`RegisterPage` del mismo archivo.

---

### BUG-010 — yfinance bloqueaba el event loop (HTTP síncrono en endpoints async) 🆕
**Severidad:** 🔴 CRÍTICA (rendimiento/escalabilidad) · **Archivo:** `backend/server.py` · **Estado:** ✅ RESUELTO (COMPLETO)

**Causa raíz:** `yfinance` hace peticiones HTTP **síncronas**. Llamarlo directamente
dentro de un `async def` **bloquea todo el event loop** mientras dura la red. En Cloud
Run con `concurrency: 80`, una sola llamada lenta congela las 80 peticiones de esa
instancia. El código ya usaba `run_in_executor` para bcrypt/Stripe/email, pero **se
olvidó de yfinance**.

**Solución aplicada:** nuevo helper `_yf_history_async()` (mismo patrón que
`hash_password_async`) + offload a thread en los **8 endpoints públicos / de más
tráfico**:
- `GET /prices` (el peor: 4 llamadas yfinance secuenciales, endpoint público del ticker)
- `GET /ohlc/{symbol}`, `POST /backtest`, `GET /iv-rank`, earnings (`.calendar`),
  `education/pattern-scan`, `market-wide-flow`.

**2ª fase (completada):** el módulo de opciones (`opt_get_stock`, `opt_search_tickers`,
`opt_get_expirations`, `opt_get_options_chain`, `opt_get_iv_surface`, `optimize_options_strategy`,
`portfolio_greeks`, `get_unusual_options`, `universal_search_tickers`, `get_iv_rank`) llamaba
funciones síncronas de `stock_data.py` directamente. Ahora **todas** las llamadas en contexto
`async` van por `await asyncio.to_thread(...)` (incluidas las que están dentro de bucles `for`
sobre expiraciones). Los helpers síncronos (`_scan_ticker_flow`, `_fetch_atm_iv_proxy`,
`_yfinance_to_ohlc_rows`) se ejecutan en thread desde su llamador async. **Cero llamadas
bloqueantes de red quedan en el event loop.**

### BUG-011 — Código muerto engañoso (módulos huérfanos) 🆕
**Severidad:** 🟡 MENOR (limpieza/confusión) · **Estado:** ✅ RESUELTO

Dos módulos que **nunca se importaban ni registraban** en `server.py` (solo se
referenciaban a sí mismos en sus docstrings) — **eliminados**:
- `backend/fixes.py` — "parches críticos" de mayo 2026 cuyo docstring decía "Uso en
  server.py: from fixes import (...)" pero **nunca se conectó**. Estaba **superado**:
  `server.py` ya sirve datos reales vía yfinance/CoinGecko.
- `backend/admin_diary_endpoint.py` — router admin para exponer este `DIARIO_BUGS.md` vía
  API, **nunca incluido**. Además habría fallado en producción: el `Dockerfile` solo copia
  `./backend`, y `DIARIO_BUGS.md` vive en la raíz del repo (no estaría en la imagen).

### BUG-012 — Adaptador SQL: LIMIT/OFFSET por interpolación (hardening) 🆕
**Severidad:** 🟢 BAJA · **Archivo:** `server.py` (`_build_query`) · **Estado:** ✅ RESUELTO

El `WHERE` ya parametrizaba valores con `$1,$2` y validaba nombres de campo con regex (✅ sin
inyección). Ahora `LIMIT`/`OFFSET` se castean explícitamente con `int(self._limit_val)` /
`int(self._skip_val)` como defensa en profundidad (antes se interpolaban directamente; el
riesgo real era nulo porque reciben ints tipados de FastAPI, pero ahora es a prueba de fallos).

---

## 🟡 PENDIENTES REALES (no son "cagadas", son mejoras de fondo)

### BUG-005 — Google OAuth: dependía del workflow degradado
**Severidad:** 🟠 IMPORTANTE · **Estado:** ✅ MITIGADO (vía BUG-009)

El código (`GoogleSignInButton.jsx`, `App.js`) ya lee `REACT_APP_GOOGLE_CLIENT_ID`
correctamente y oculta el botón si falta. El riesgo real era que el build degradado
de BUG-009 generase el bundle sin ese ID. Resuelto al eliminar ese job.
**Pendiente (ops):** tener `REACT_APP_GOOGLE_CLIENT_ID` en GitHub Secrets y la URL
autorizada en Google Console.

### BUG-007 — Preferencias de usuario solo en localStorage
**Severidad:** 🟡 MENOR · **Archivo:** `frontend/src/pages/SettingsPage.jsx` · **Estado:** ❌ PENDIENTE

`tcp-preferences` se guarda en localStorage; no se sincroniza entre dispositivos.
Requiere endpoint `PATCH /api/user/preferences` + carga en el perfil. Prioridad baja.

### BUG-008 — server.py monolítico (~5.500 líneas)
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py` · **Estado:** ❌ PENDIENTE

Sigue siendo un único archivo grande. Refactor a `app/` + `routers/` recomendado.
Trabajo estimado: 4-6 h. No es una regresión; es deuda técnica pre-existente.

---

## 🔴 AUDITORÍA TÉCNICA COMPLETA — SESIÓN 2026-06-13

Auditoría de 8 fases (57 hallazgos) + implementación de correcciones.

### C-04 — app_settings Scheme A/B incompatibility (tiempo de bomba) ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA · **Archivos:** `backend/admin_routes.py`, `backend/server.py`

`admin_routes.py` almacenaba settings con Scheme B `{key:"k", value:"v"}` (una fila por clave)
mientras `server.py` usaba Scheme A `{_id:"global", k1:"v1", ...}` (un doc único). Al coexistir
ambos, `_get_all_settings` hacía `d["key"]` sobre un doc Scheme A → **KeyError determinístico**
en `connectors_status`, `send_campaign`, `get_maintenance` y `gdpr_export_deliver`.

**Solución:** `_get_all_settings` → `find_one({_id:"global"})`. `_upsert_setting` → `$set` en
doc global. `_delete_setting` → `$unset` en doc global. Añadido soporte `$unset` al adaptador
JSONB (`_apply_update_operators`).

### C-06 — Cloud Run en us-central1 vs Cloud SQL en europe-west1 ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA (latencia) · **Archivos:** `deploy-cloud-run.yml`, `cloudbuild.yaml`

~100-150ms de latencia por query entre regiones. Movido Cloud Run y Artifact Registry a
`europe-west1` (misma región que Cloud SQL `trading-db`) → latencia <5ms.

### C-07 — Admin puede impersonar a otro admin ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA (seguridad) · **Archivo:** `backend/server.py`

`POST /admin/impersonate/{user_id}` no verificaba si el objetivo era admin. Un admin
comprometido podía escalar privilegios o cubrir rastros impersonando al superadmin.
**Solución:** comprobación `target.get("is_admin") or email in _ADMIN_EMAILS` → HTTP 403.

### A-02 — MRR con precios obsoletos (€9.99/€19.99/€79.99) ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`plan_mrr = {"monthly": 9.99, ...}` estaba hardcodeado con precios de una versión
anterior mientras `SUBSCRIPTION_PLANS` tiene €17/€45/€200/€500. Dashboard mostraba MRR
~6× menor al real. **Solución:** `plan_mrr` calculado dinámicamente desde `SUBSCRIPTION_PLANS`.

### A-03 — Campos /admin/revenue: backend ≠ frontend ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivos:** `backend/server.py`, `frontend/src/pages/AdminPage.jsx`

Backend devolvía `mrr_history`/`churn_rate`/`conversion_rate`; frontend leía
`history`/`churn`/`conversion` → gráficos vacíos siempre. **Solución:** renombrar en backend.

### A-04 — Stripe SDK bloquea el event loop ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivos:** `backend/server.py`, `backend/missing_apis.py`

9 llamadas síncronas Stripe (`Subscription.list/delete/modify`, `billing_portal.Session.create`,
`Invoice.list`, `Subscription.retrieve`, `Price.create`) dentro de `async def` → congelaban el
event loop 3-5s cada vez. Todas envueltas en `asyncio.to_thread`.

### A-05 — SendGrid sg.send() bloquea el event loop ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`sg.send(message)` → `await asyncio.to_thread(sg.send, message)`.

### A-06 — Sin validación de longitud de contraseña ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`UserCreate.password: str` sin restricciones → contraseñas de 1 carácter aceptadas.
**Solución:** `Field(..., min_length=8, max_length=128)`.

### A-07 — DoS en /monte-carlo vía numSimulations enorme ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`numSimulations=9999999` consumía CPU/RAM hasta matar el worker. **Solución:** caps
`numTrades ≤ 1000`, `numSimulations ≤ 5000`.

### A-09 — revoked_tokens crece sin límite ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/server.py`

Tokens revocados nunca se purgaban. **Solución:** `delete_many({expires_at: {$lt: now}})`
en `startup_event` — los tokens con JWT expirado no pueden usarse igualmente.

### A-10 — Dockerfile ejecuta uvicorn como root ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/Dockerfile`

Breach de proceso → acceso root al sistema de archivos del contenedor.
**Solución:** `RUN adduser appuser` + `USER appuser` antes de `EXPOSE`.

### M-13 — /api/health devuelve 200 cuando la DB está caída ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

Cloud Run probes usaban HTTP status; `{"status":"degraded"}` con HTTP 200 nunca
activaba el circuit breaker. **Solución:** `raise HTTPException(503)` cuando DB no responde.

### M-14 — ADMIN_EMAILS hardcodeado en cloudbuild.yaml ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `cloudbuild.yaml`

Email de admin (`tradingcalculatorpro@gmail.com`) expuesto en el repositorio.
**Solución:** eliminado del `--set-env-vars`; debe configurarse en el servicio Cloud Run.

### M-19 — POST /referrals/track sin rate limit ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/referrals.py`

Endpoint público sin autenticación ni límite → enumeración de emails (404 vs 200).
**Solución:** `limiter.limit("5/minute")` inyectado vía `helpers["limiter"]` en `register()`.

### LTV — Fórmula algebraicamente nula ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/server.py`

`price * max(count,1) / max(count,1)` ≡ `price` (el count se cancelaba). Simplificado
a `round(plan["price"], 2)` con comentario explicativo.

---

## 🟡 PENDIENTES CONOCIDOS (no bloquean operación)

- **BUG-007** — Preferencias de usuario solo en localStorage (baja prioridad)
- **BUG-008** — `server.py` monolítico ~5.500 líneas (deuda técnica, requiere tests)
- **C-08** — API keys (Stripe/SendGrid) pueden almacenarse en `app_settings` DB en plaintext.
  Arquitectónicamente: las claves deberían ir solo como Cloud Run secrets. El panel admin
  no debería tener un campo para sobreescribirlas vía DB. Requiere decisión de producto.
- **Sombra de rutas** — ~21 endpoints de `admin_routes.py` son código muerto porque
  `server.py` registra las mismas rutas primero (FastAPI first-match). Requiere refactor
  mayor para unificar en un solo router.

---

## 📊 RESUMEN DE ESTADO (verificado 2026-06-13)

| Bug | Descripción | Severidad | Estado real |
|-----|-------------|-----------|-------------|
| BUG-001 | Demo bypass admin | 🔴 | ✅ Resuelto (en código) |
| BUG-002 | REACT_APP_BACKEND_URL | 🔴 | ✅ Resuelto (en código) |
| BUG-003 | Stripe checkout/webhooks | 🔴 | ✅ Implementado (falta verificar dashboard) |
| BUG-004 | Admin con datos falsos | 🟠 | ✅ Resuelto (queries reales) |
| BUG-005 | Google OAuth | 🟠 | ✅ Mitigado (vía BUG-009) |
| BUG-006 | Forgot password mentía | 🟠 | ✅ Resuelto (sesión anterior) |
| BUG-007 | Preferencias en localStorage | 🟡 | ❌ Pendiente (baja prioridad) |
| BUG-008 | server.py monolítico | 🟠 | ❌ Pendiente (deuda técnica) |
| BUG-009 | Workflows de deploy en carrera | 🔴 | ✅ Resuelto (sesión anterior) |
| BUG-010 | yfinance bloqueaba el event loop | 🔴 | ✅ Resuelto (COMPLETO) |
| BUG-011 | Código muerto (fixes.py, admin_diary_endpoint.py) | 🟡 | ✅ Resuelto (eliminados) |
| BUG-012 | LIMIT/OFFSET por interpolación | 🟢 | ✅ Resuelto (cast a int) |
| C-04 | app_settings Scheme A/B → KeyError | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| C-06 | Cloud Run us-central1 ↔ Cloud SQL europe-west1 | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| C-07 | Admin impersona otro admin | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| A-02 | MRR con precios obsoletos | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-03 | Campos revenue backend ≠ frontend | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-04 | Stripe SDK bloqueaba event loop | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-05 | SendGrid bloqueaba event loop | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-06 | Sin validación longitud contraseña | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-07 | DoS en /monte-carlo | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-09 | revoked_tokens sin purga | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| A-10 | Dockerfile ejecuta como root | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| C-08 | API keys en app_settings DB | 🟠 | ❌ Pendiente (decisión de producto) |
| LTV | Fórmula algebraicamente nula | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| M-13 | /health devuelve 200 con DB caída | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| M-14 | ADMIN_EMAILS hardcodeado | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| M-19 | /referrals/track sin rate limit | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| BUG-013 | Route shadowing en afiliados: `GET /admin/affiliates/{aid}` (declarada antes) capturaba las estáticas `/payout-runs` y `/payout-requests` → el panel admin recibía 404 "Afiliado no encontrado" (notificación de solicitudes de pago y listado de liquidaciones muertos). Detectado con E2E real (Postgres 16 + backend vivo). Fix: la ruta dinámica se registra al final del módulo + test de regresión de orden de rutas. | 🔴 | ✅ Resuelto (2026-07-19) |

---

| BUG-014 | AdminPage crasheaba ENTERO (React #31, pantalla "Algo salió mal") en cuanto `/admin/metrics` devolvía usuarios con plan: `PlanDistributionCard` trataba `by_plan` (LISTA `[{plan,count}]` del backend) como dict con `Object.entries` → renderizaba objetos como hijos de React. Nunca visto porque la UI admin no se había probado contra datos reales. Detectado al capturar el panel con backend vivo. Fix: normalización que acepta lista (y dict por compatibilidad). | 🔴 | ✅ Resuelto (2026-07-21) |

---

| BUG-015 | **Rate limiting con la IP equivocada detrás de Cloud Run.** `Limiter(key_func=get_remote_address)` devuelve `request.client.host`, que en Cloud Run es la IP del frontend de Google (uvicorn arranca sin `--forwarded-allow-ips` y su valor por defecto `127.0.0.1` no casa con el peer real, así que descarta `X-Forwarded-For`). Resultado: **todos los usuarios del mundo compartían un solo cubo** → `POST /auth/register` (3/hora) significaba 3 registros por hora en TODA la web, y `/auth/login` (10/min) bloqueaba a clientes legítimos. Pérdida directa de altas, invisible en los logs. Fix: `_real_client_ip()` lee XFF **contando desde la derecha** con `TRUSTED_PROXY_HOPS` (1 por defecto = Cloud Run directo), lo que además lo hace **no falsificable** (anteponer IPs falsas no funciona, al contrario que el clásico `parts[0]`). `_client_ip` del audit log admin —que sí usaba `parts[0]`, es decir era falsificable— pasa a delegar en el mismo helper. 9 tests de regresión (`test_rate_limit_key_unit.py`). | 🔴 | ✅ Resuelto (2026-07-26) |

---

*Actualización previa: 2026-07-26 — rate limiting por IP real detrás del proxy (BUG-015).*
---

| BUG-023 | **La pestaña Cadena era inusable al abrirla.** `OptionsChainView` montaba la tabla en un `flex-1 … overflow-hidden` cuyo hijo `overflow-auto` **no tenía altura acotada**: el contenedor que scrolleaba de verdad era la página, así que el `thead sticky top-0` se pegaba al contenedor equivocado y acababa **oculto detrás de las dos barras fijas** de la cabecera. Al entrar en la pestaña no se veía ni la fila CALLS/Strike/PUTS ni el selector de vencimiento — sólo un mar de números sin encabezado. Agravado porque el navegador conservaba la posición de scroll de la pestaña anterior y se aterrizaba a media tabla. Fix: la tabla scrollea DENTRO de su propia tarjeta (`max-h` acotada), la cabecera se pega a esa tarjeta, y `handleTabChange` vuelve al principio al cambiar de pestaña. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-024 | **La UI afirmaba un tipo libre de riesgo distinto del que usaba el backend.** `market_rates.py` (PR #153) sacó el `0.0525` del pricing, pero `GreeksDisplay.jsx` seguía pintando `Risk-Free Rate 5.25%` como literal en su ficha de datos de mercado. Además `market_rates` calculaba la procedencia (`get_risk_free_info`) y **nada la publicaba**, así que el frontend no tenía de dónde leerla. Fix: nuevo `GET /api/market/risk-free` que expone el tipo y su origen (`^IRX` / `stale` / `fallback`), y `GreeksDisplay` lo consume con la procedencia en el tooltip. | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-026 | **El aviso de datos modelados sólo se pintaba en el optimizador.** `_synthetic_marker` marca las tres respuestas que pueden venir de una cadena modelada — `/options/chain`, `/options/iv-surface` y `/optimize` — pero en el frontend únicamente `OptimizeView` leía la bandera. En la calculadora y en la superficie de IV el usuario veía primas, griegas y skew fabricados **sin ningún aviso**, que es justo lo que §3.1 de la auditoría señalaba como indefendible en un producto de pago. Fix: componente `SyntheticDataBanner` (traducido a los 8 idiomas) montado en la calculadora y en la superficie; y el coach recibe la bandera, con instrucción de declararlo en su primera línea. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-027 | **El coach de IA respondía siempre en español.** El PR #153 añadió `locale` al `AITradeAnalysisRequest` y la tabla `_AI_COACH_LANGUAGES`, pero **el frontend nunca enviaba el campo**, así que el valor por defecto (`"es"`) ganaba siempre en una web de 8 idiomas. Fix: `AITradeCoach` envía el locale activo de `useTranslation()`. | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-025 | **Concordancia y mezcla de idiomas en el editor de patas.** Mostraba `1 patas activas` (la concordancia singular/plural no se resuelve igual en los 8 idiomas, así que interpolar el número dentro de la frase estaba roto por diseño) y titulaba `Constructor de Legs`, mezclando castellano e inglés en una UI en castellano. En la barra de estrategia, `{riesgo} {etiqueta}` producía "Limitado riesgo · Ilimitado recompensa": orden adjetivo-sustantivo que sólo funciona en inglés. Fix: etiqueta de recuento (`patas activas: 1`), `optLegsBuilder` traducido en es/fr/de, y `etiqueta: valor` en el resumen de riesgo/recompensa. | 🟢 | ✅ Resuelto (2026-07-30) |

---

*Actualización previa: 2026-07-30 — rediseño del panel de opciones: cadena con scroll roto (BUG-023), tipo libre de riesgo desincronizado entre UI y backend (BUG-024), aviso de datos modelados que sólo salía en el optimizador (BUG-026), coach siempre en español (BUG-027) y concordancia/idioma en el editor de patas (BUG-025).*

---

| BUG-028 | **Un fallo del proveedor del tipo libre de riesgo se reintentaba en CADA llamada.** `market_rates.get_risk_free_rate` cacheaba los aciertos pero no los fallos: la comprobación `fresh` exige `rate is not None`, así que con el proveedor inalcanzable nunca había caché y todo llamante volvía a salir a la red. Medido: **25 llamadas → 25 intentos**, y lo mismo teniendo ya un valor previo caducado (que sí se servía, pero pagando el viaje igual, porque `fetched_at` no se actualizaba en la rama *stale*). La función está en la ruta de `/options/chain`, `/options/iv-surface`, `/optimize`, `/calculate/*` y `/performance/analytics`, así que ese peaje se cobraba en cada petición que el usuario estaba esperando; y el fetch heredaba el `timeout=15` × 2 hosts de `stock_data._yahoo_get`, hasta 30 s por petición si el fallo es por timeout en vez de por rechazo. Fix: ventana de reintento tras fallo (`FAILURE_BACKOFF_SECONDS = 15 min`, `force_refresh` la salta), y `timeout` parametrizable en `_yahoo_get` con 4 s para la tasa. Verificado: 25 llamadas → 1 intento. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-029 | **La sugerencia de stop se pintaba sin muestra suficiente.** `generate_insights` exigía ≥10 ganadoras antes de hablar de estrechar el stop, pero `AnalyticsDashboard` lee `excursion.suggested_stop_r` directamente del payload y no comprobaba nada: con 2 operaciones ganadoras de MAE pequeña, el panel recomendaba una anchura de stop — y por tanto un tamaño de posición — a partir de dos observaciones. Fix: la guarda se mueve al origen (`MIN_WINNERS_FOR_STOP_ADVICE` en `_excursion_stats`), así que el campo sólo existe cuando está respaldado, y el insight deja de duplicar el umbral (no pueden divergir). | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-030 | **El factor de anualización de Sharpe/Sortino no tenía techo.** `_periods_per_year` exige mínimo de operaciones y de ventana, pero no acota el resultado: una muestra densa en poco tiempo —una semana de scalping, o un CSV importado de operaciones de tick— lleva las operaciones/año a cinco cifras y con ellas el factor √ppy. Medido: 400 operaciones en 10 días daban ≈14.610 ops/año y √≈121, convirtiendo un Sharpe por operación de 0,05 en un 6,0 presentado como dato. Fix: `MAX_TRADES_PER_YEAR = 2520` (~10 por sesión × 252 sesiones). | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-031 | **Las tarjetas de cabecera del simulador seguían siendo una tirada suelta.** El PR #153 añadió la distribución de Monte Carlo en un panel aparte, pero `SimulatorPro` seguía llamando a `runSimulation` para los KPI, así que el usuario leía un ROI, un drawdown y un profit factor de **una trayectoria aleatoria** justo encima de un rango P5–P95 que no la contenía; al recalcular, la cabecera cambiaba entera aunque la distribución apenas se moviese. Era la mitad no resuelta del bug original. Fix: PRNG con semilla (`makeRng`) y semilla por iteración en `runMonteCarlo`, que ahora devuelve `medianPath` reproducible; cuando el usuario lanza el barrido, la cabecera pasa a esa mediana y se etiqueta como tal. `opts.rnd` explícito sigue ganando, así que las comprobaciones deterministas de `engine-check.js` no cambian. | 🟠 | ✅ Resuelto (2026-07-30) |

---

*Última actualización: 2026-07-30 — reconciliación de las dos auditorías: reintentos sin caché del tipo libre de riesgo (BUG-028), sugerencia de stop sin muestra (BUG-029), anualización sin techo (BUG-030) y cabecera del simulador aún aleatoria (BUG-031).*

---

| BUG-032 | **Los calendars, las diagonales y el PMCC eran imposibles por arquitectura, no por falta de preset.** Tanto `presetLegs` como `customBuiltLegs` asignaban `daysToExpiry: currentExp.daysToExpiry` a **todas** las patas, y `LegEditor` trabajaba sobre una única `chain`: no existía forma de expresar una pata con vencimiento distinto. Ocho estructuras —calendar de call y de put, diagonal de call y de put, doble calendar, doble diagonal, jelly roll y PMCC, dos de ellas de las más usadas del retail— no estaban "sin implementar": el modelo de datos no las admitía. Y si se forzaba, el motor las valoraba como verticales, porque `calculateStrategyPayoff` aplicaba un único `daysToExpiry` global a cada pata. Fix: `expIdx` por pata en el editor, un mapa `{expIdx: chain}` en `CalculatorPage`, un endpoint de cadena multi-expiración (`?expiration_idxs=1,3,6`) para no disparar N peticiones, y tiempo restante POR PATA en el motor — el diagrama al vencimiento se dibuja al de la pata más cercana y la pata larga conserva su valor extrínseco. Fijado por `engine-check` con un control de mismo vencimiento que sí liquida al débito neto. | 🔴 | ✅ Resuelto (2026-07-31) |

---

| BUG-033 | **El frontend valoraba con un tipo libre de riesgo del 5% inventado mientras el backend usaba el real.** `CalculatorPage` pasaba `0.05` literal a `calculateStrategyPayoff`, `calculateStrategyGreeks` y `probabilityOfProfit`, y `blackScholes.js` lo repetía como valor por defecto de firma, teniendo `market_rates` en producción desde hacía dos PRs y el endpoint `/api/market/risk-free` ya publicado. Consecuencias: Rho era decorativo, las americanas se valoraban con un tipo falso y las tres estructuras cuyo P&L **es** el tipo de interés (box spread, jelly roll, conversion) habrían dado números sin sentido en cuanto se añadieran. Fix: hook `useRiskFreeRate` con caché a nivel de módulo (la tasa se mueve en puntos básicos, no una petición por panel), el tipo real se pasa a las cuatro llamadas del motor, y `GreeksStrip` publica el valor y su procedencia (`r = 4,28% · letra a 3 meses en vivo`) para que Rho tenga referencia. El literal superviviente es una única constante `FALLBACK_RISK_FREE_RATE`, nombrada para que un grep la encuentre. | 🔴 | ✅ Resuelto (2026-07-31) |

---

| BUG-034 | **El rango del gráfico de payoff estaba fijo en ±35% del spot.** El mismo ancho para un 0DTE de SPY —donde toda la acción ocurre en un ±1% y el payoff se veía como una línea plana en mitad del lienzo— que para un LEAPS de una small cap con IV del 80%, donde ±35% recorta justo la zona en la que la posición vive. Fix: `priceRangeFromExpectedMove` deriva el ancho de 2,5σ del expected move (`S·σ·√(T/365)`), con suelo del 10% y techo del 150%; sin volatilidad utilizable cae al 35% de siempre en vez de a un rango degenerado. | 🟡 | ✅ Resuelto (2026-07-31) |

---

| BUG-035 | **Cargar una posición guardada dejaba la calculadora a cero.** No estaba en la auditoría; apareció al tocar el mismo código. `handleLoadPosition` y `handleOpenInCalculator` construían las patas sin el campo `enabled`, y `customBuiltLegs` filtra por `l.enabled`: las patas llegaban al editor —donde se pintaban en gris al 40% de opacidad, el estilo de "pata desactivada"— pero salían del cálculo, así que el payoff quedaba vacío, las griegas a cero y los KPI en blanco. Afectaba a las dos rutas de entrada que no son teclear la posición a mano: recuperar una posición guardada y el botón "abrir en la calculadora" del optimizador. Fix: `enabled: true` explícito en ambos mapeos, más `expIdx` para que una posición guardada multi-expiración no se aplane en un vertical al recargarla. | 🟠 | ✅ Resuelto (2026-07-31) |

---

*Última actualización: 2026-07-31 — auditoría del apartado de opciones: multi-expiración imposible por arquitectura (BUG-032), tipo libre de riesgo inventado en el frontend (BUG-033), rango del gráfico fijo (BUG-034) y posiciones guardadas que se cargaban desactivadas (BUG-035).*

---

| BUG-036 | **El beneficio y la pérdida máximos salían del ancho del gráfico, no de la posición.** Reportado por el propietario: una call comprada mostraba un beneficio máximo concreto donde no lo hay. Los tres sitios que calculaban los extremos —`strategyStats.js`, `_payoff_summary` en `server.py` y `_score_strategy` en `options_optimize.py`— hacían `max()/min()` sobre los puntos de `calculate_payoff`, una rejilla de ±30–35% alrededor del spot, y decidían "ilimitado" comparando ese resultado con 5.000.000. Con spot 100 el máximo de la rejilla es ~3.300: el umbral no se cruzaba **nunca**, así que `isMaxProfitUnlimited` e `isMaxLossUnlimited` eran falsos siempre y la bandera de riesgo ilimitado que ya existía en la interfaz no llegaba a activarse. Tres consecuencias distintas: (1) una call comprada o un straddle comprado enseñaban un beneficio máximo finito —el P&L del borde derecho del gráfico— donde la respuesta es "sin acotar"; (2) una call vendida desnuda o un ratio 1x2 enseñaban una pérdida máxima finita, que es el error peligroso: invita a dimensionar contra una cifra que no es el peor caso; (3) lo acotado pero fuera de la ventana salía **mal**, no sólo recortado — una put comprada K=100 vale como mucho 9.800 € y la rejilla devolvía 3.300, un factor de tres. Además `SecondaryPanels` hacía `parseFloat(stats.maxProfit) \|\| 0`, que convertía "ilimitado" en 0 y hacía que Kelly concluyera «sin edge estadístico, evita el trade» justo en las estrategias de beneficio ilimitado. Fix: `payoffBounds`/`payoff_bounds` decide lo acotado por la **estructura** de las patas —la pendiente del payoff en el límite S→∞, donde una call se comporta como la acción y una put vale cero— y evalúa el extremo finito en S=0 y en cada strike, que son los únicos vértices de una función lineal a trozos. Sin acotar viaja como `null`, nunca como número; ROI y R/R sobre un extremo sin acotar pasan a indefinidos en vez de a `Infinity%`. 11 tests lo fijan. | 🔴 | ✅ Resuelto (2026-08-02) |

---

*Última actualización: 2026-08-02 — extremos del payoff medidos sobre el ancho del gráfico en vez de sobre la posición (BUG-036).*

---

| BUG-037 | **No se podía iniciar sesión: el origen donde se sirve la web no estaba en la lista de CORS del código.** La web se publica en `https://abcde-rgb.github.io/Tradingcalculatorpro.com` —no hay `CNAME` en `frontend/public/` y el `homepage` de `package.json` apunta ahí— pero `_CORS_ORIGINS` en `server.py` sólo traía `tradingcalculatorpro.com` y `www.`, que es el dominio que **todavía no está en uso**. Lo único que hacía funcionar el login era la variable `CORS_ORIGINS` que inyectaba el despliegue. El fallo es especialmente difícil de ver por tres razones: (1) **no aparece en los logs** — sin la cabecera `Access-Control-Allow-Origin` el backend responde **200, con las dos cookies puestas**, y es el navegador quien descarta la respuesta, así que en Cloud Run el login se ve perfecto; (2) **`curl` no lo reproduce**, porque curl ignora CORS — verificado: mismo `POST /api/auth/login` con `Origin: https://abcde-rgb.github.io` devuelve 200 y la respuesta no lleva `allow-origin`; (3) en el frontend el `catch` lo convierte en «No se puede conectar al servidor», que apunta a la red y no a la configuración. El detonante: desde el 2026-08-03 el backend **se despliega a mano** (`cloudbuild.yaml`, tras retirarse el workflow), y un `gcloud run deploy` sin `--set-env-vars` borra las variables del servicio — con ellas se va `CORS_ORIGINS` y el login del sitio entero cae. Mismo defecto en `FRONTEND_URL`, que caía a `https://tradingcalculatorpro.com` en cuatro sitios de `server.py` y en `_trusted_link_base` de `missing_apis.py`: si se pierde esa variable, los enlaces de verificación, reset y magic link llevan a un dominio que no se sirve, que deja al usuario igual de fuera. Fix: el origen real entra **por código**, no por despliegue; `FRONTEND_URL` se unifica en una sola constante `DEFAULT_FRONTEND_URL` cuyo valor coincide con el que ya ponía el despliegue, para que el código no pueda contradecirlo; y `_trusted_link_base` incluye el origen servido en su lista fija. El dominio propio se mantiene en la lista para que el cutover de DNS no rompa nada. 3 tests nuevos lo fijan, incluido que un origen no autorizado (`evil.com`) siga sin recibir cabecera. | 🔴 | ✅ Resuelto (2026-08-05) |

---

*Última actualización: 2026-08-05 — el origen donde se sirve la web no estaba permitido por el código, así que el login dependía de una variable de entorno del despliegue (BUG-037).*

---

| BUG-038 | **La respuesta vacía del escáner de estructura no tenía la forma que la documentación prometía.** `docs/ESCANER_ESTRUCTURA.md` §8 afirmaba —y el motor cumplía— que *"una respuesta vacía conserva exactamente las mismas claves que una completa: el cliente nunca tiene que ramificar por forma de respuesta"*. `detect_structure([])` devolvía en efecto la lectura completa con todo a cero, pero **la ruta no la usaba**: cuando el proveedor no devolvía velas, `education_structure_scan` construía a mano `{rowsScanned, trend, swings, events, levels, fvgs}` —seis claves de veinte— y el camino de error, cinco. Faltaban `counts`, `currentPrice`, `atr`, `tolerancePct`, `nearestResistance`, `nearestSupport`, `levelsAnalysed` y `lastBarForming`. No llegó a romper la interfaz porque el frontend leía todo con `\|\| {}` y `\|\| []` de forma defensiva, que es precisamente lo que enmascara este tipo de fallo: cualquier consumidor que se creyera el contrato documentado (o cualquier `data.counts.levels` escrito sin la guarda) habría reventado justo en el caso en que el proveedor se cae, que es el peor momento para descubrirlo. Fix: los dos caminos devuelven `detect_structure([], strength)`, y `test_structure_scan_routes_unit.py` compara el conjunto de claves de una respuesta vacía con el de una completa, incluidas las de `counts`. | 🟡 | ✅ Resuelto (2026-08-05) |

---

*Última actualización: 2026-08-05 (2) — la respuesta vacía del escáner de estructura no respetaba el contrato documentado (BUG-038).*

---

| BUG-039 | **Dos esquemas incompatibles en `db.trades`: el P&L de una operación del diario legado se reescribía a 0 al leerla desde analítica.** `POST /journal/trades` y `POST /performance/trades` **escriben en la misma colección** con esquemas distintos: el primero en camelCase (`entryPrice`, `exitPrice`, `quantity`, `leverage`) y el segundo en snake_case (`entry_price`, `exit_price`, `quantity`, `multiplier`). Ninguno de los dos filtra por esquema al leer, así que `perf_list_trades` consultaba `{"user_id": ...}` a secas y arrastraba también los documentos del diario legado. `compute_trade_pnl` busca `entry_price`, encuentra `entryPrice`, y con `entry == 0` toma la salida temprana del docstring: `pnl = 0.0`, `r_multiple = None`. Reproducido ejecutando el código del repo: un trade guardado con `pnl 10.0` se lee como `0.0`. Lo grave no es la lectura sino la escritura: `perf_update_trade` hace `{"$set": enriched}`, así que **en cuanto el usuario edita ese trade, el cero se persiste** y el P&L original se pierde para siempre. Contamina win rate, profit factor, expectancy y curva de equity de todo el panel. **No resuelto en Fase 0**: el arreglo es el modelo unificado multi-pata (Fase 1) más una migración que normalice el camelCase antes de convertir (Fase 2); parchear el filtro de lectura dejaría los documentos ya corrompidos sin recuperar. Ver `docs/AUDITORIA_DIARIO.md`. | 🔴 | ⏳ Pendiente (Fase 1+2) — verificado 2026-08-06 |

| BUG-040 | **`/journal/stats` calculaba drawdown y racha de pérdidas sin ordenar las operaciones.** `get_journal_stats` consultaba con `.to_list(1000)` **sin `.sort()`** y pasaba el resultado a `_aggregate_journal_trades`, que construye la curva de equity acumulando P&L en el orden en que llegaran las filas. El drawdown no es simétrico bajo inversión, así que las mismas operaciones daban un máximo distinto según el orden de inserción: verificado sobre las 24 permutaciones de un caso de 4 operaciones, salían dos drawdowns distintos (50 y 80). La función correcta —`sort_trades_chronologically`, que ordena por fecha de cierre— **ya existía en el repo, ya estaba importada en `server.py` y ya la usaba `/performance/analytics`**; sólo este endpoint no la llamaba. Es la tercera regla de honestidad numérica del proyecto («lo sensible al orden se ordena explícitamente») incumplida en el único sitio donde nadie la había mirado. Fix: ordenar antes de agregar, y docstring en `_aggregate_journal_trades` avisando de que la entrada tiene que venir ordenada. 3 tests fijan que el drawdown y la racha son iguales en las 24 permutaciones, y uno **comprueba que sin ordenar el bug es real**, para que el test no se quede probando nada si algún día deja de importar el orden. | 🔴 | ✅ Resuelto (2026-08-06) |

| BUG-041 | **El breakeven contaba como operación perdedora y el profit factor sin pérdidas valía 0.** Dos defectos de la misma familia en el mismo bloque. (1) `_aggregate_journal_trades` repartía con `if pnl > 0: wins else: losses`, así que una operación cerrada a 0 € entraba como perdedora: hundía el win rate e **incrementaba la racha de pérdidas** — tres scratches seguidos se leían como una racha de 3. (2) `profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0` mostraba **0,00 —la peor cifra posible— a quien no ha perdido nunca**, que es justo el caso contrario. Es la segunda regla de honestidad numérica: lo que no se puede calcular es `None`, no `0`. Fix: el breakeven es categoría propia (`breakeven`), no extiende la racha ni la reinicia; `profitFactor` es `None` sin pérdidas y la UI pinta `∞` (misma convención que el simulador, que ya lo hacía). De paso, `expectancy` pasa a ser la media de P&L por operación en vez de `winRate·avgWin + lossRate·avgLoss`: esa identidad sólo se cumple si toda operación es ganadora o perdedora, y con scratches en la muestra el segundo término **cobraba cada breakeven al precio de una pérdida media**. Idéntica cuando no hay scratches, correcta cuando los hay. `JournalStats.jsx` hacía `stats.profitFactor.toFixed(2)`, que habría reventado con `null` — corregido a la vez. 8 tests. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-042 | **El diario de `localStorage` compartía operaciones entre cuentas del mismo navegador.** `useTradingJournalStore` (`store.js`) persistía bajo la clave global `trading-journal-storage`, **sin `user_id`**: dos cuentas en el mismo equipo veían y editaban el mismo diario, y limpiar el navegador lo borraba todo. El usuario creía tener un diario y no lo tenía. Además calculaba el P&L sobre el nocional (`size × ((exit−entry)/entry) × leverage`), una **tercera** fórmula que para los mismos datos nunca coincide con la del backend (`(exit−entry) × qty × mult`), y `getStats()` era una **tercera** implementación de las estadísticas, con el breakeven como pérdida (`pnl <= 0`). Fix (Fase 0, congelar sin borrar): el store ya no acepta escrituras —`addTrade` y `updateTrade` retirados a propósito— y `getStats` se elimina; el componente pasa a archivo de solo lectura que avisa de que esas operaciones nunca se guardaron en la cuenta y ofrece **exportar a CSV y JSON** antes de borrarlas. Quien no tenga datos en `localStorage` no ve nada. No se borró de golpe precisamente porque había datos que rescatar. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-043 | **`limit` sin techo en los dos listados de operaciones, y analítica truncada en silencio.** `GET /journal/trades` y `GET /performance/trades` aceptaban `limit` de la query string sin validar: un `?limit=1000000` convertía una petición en una lectura de tabla completa más una pasada de re-enriquecimiento (que además es cuadrática por el bucle `prev_trades`). Fix: `Query(100, ge=1, le=500)`, que FastAPI rechaza con 422 en validación. Aparte, `/performance/analytics` leía `limit=1000` y **no decía nada**: un trader activo con más historial veía métricas de un subconjunto —las 1.000 más recientes, porque `trades_for_user` ordena por `entry_date` descendente— creyendo que eran de todo su registro. Es la primera regla de honestidad numérica (nada sin etiquetar) aplicada a una ventana temporal. Fix: se piden `MAX+1` filas para distinguir «justo en el límite» de «hay más», y la respuesta publica `truncated`, `trades_analyzed` y `truncation_notice`. **Nota:** `Query` no estaba importado en `server.py` — de no haberlo detectado, el arranque habría fallado con `NameError`. | 🟠 | ✅ Resuelto (2026-08-06) |

---

*Última actualización: 2026-08-06 — Fase 0 de la auditoría del diario: orden cronológico en `/journal/stats`, breakeven y profit factor honestos, topes de `limit`, aviso de truncado y congelación del diario de `localStorage` (BUG-040 a BUG-043). El choque de esquemas en `db.trades` (BUG-039) queda documentado y pendiente del modelo unificado.*
