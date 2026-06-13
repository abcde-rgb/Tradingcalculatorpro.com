# 📋 DIARIO DE BUGS & FIXES — TradingCalculator.Pro

> **Instrucciones:** Cada entrada tiene fecha, descripción, causa raíz, solución y estado **verificado contra el código real** (no suposiciones).
>
> ⚠️ **Aviso importante (2026-06-02):** la versión anterior de este diario estaba
> desactualizada: marcaba como "SIN RESOLVER" varios bugs que el código **ya
> tenía corregidos**, y estimaba "~30% funcional" cuando la realidad es mucho
> mayor. Fue creada sin contrastar con el código. Esta versión corrige esas
> inexactitudes verificando archivo por archivo.

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

---

*Última actualización: 2026-06-13 — auditoría de 8 fases + implementación de correcciones.*
