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
**Severidad:** 🔴 CRÍTICA (rendimiento/escalabilidad) · **Archivo:** `backend/server.py` · **Estado:** ✅ RESUELTO (alto tráfico) · ⏳ PARCIAL (módulo opciones)

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

**Pendiente (mismo patrón, menor tráfico — premium/autenticado):** el módulo de opciones
(`opt_get_stock`, `opt_get_options_chain`, `opt_get_iv_surface`, `optimize_options_strategy`,
`portfolio_greeks`, `get_unusual_options`, `universal_search_tickers`, ~9 endpoints) llama
funciones síncronas de `stock_data.py` directamente. Recomendado: ofrecer wrappers async de
`stock_data` u offload por endpoint, en un pase dedicado con tests.

### BUG-011 — Código muerto engañoso (módulos huérfanos) 🆕
**Severidad:** 🟡 MENOR (limpieza/confusión) · **Estado:** ⏳ REPORTADO (no eliminado sin confirmar)

Dos módulos **nunca se importan ni registran** en `server.py`:
- `backend/fixes.py` — "parches críticos" de mayo 2026 (forex/índices/oro reales vía
  Finnhub, `check_jwt_secret`, `change_plan_real`). Su docstring dice "Uso en server.py:
  from fixes import (...)" pero **nunca se conectó**. Está **superado**: `server.py` ya sirve
  datos reales vía yfinance/CoinGecko. → Candidato a **eliminar**.
- `backend/admin_diary_endpoint.py` — router con 3 endpoints admin para exponer este
  `DIARIO_BUGS.md` vía API. **Nunca se incluye** en la app. → O **eliminar**, o **cablearlo**
  si se quiere la función (decisión del dueño).

### BUG-012 — Adaptador SQL: LIMIT/OFFSET por interpolación (hardening) 🆕
**Severidad:** 🟢 BAJA · **Archivo:** `server.py` (`_build_query`) · **Estado:** ⏳ REPORTADO

El `WHERE` parametriza valores con `$1,$2` y valida nombres de campo con regex (✅ sin
inyección). Pero `LIMIT {self._limit_val}` / `OFFSET {self._skip_val}` se **interpolan**
directamente. Hoy reciben enteros (params tipados `int` de FastAPI), así que no hay riesgo
real, pero conviene castear a `int()` o parametrizar como defensa en profundidad.

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

## 📊 RESUMEN DE ESTADO (verificado 2026-06-02)

| Bug | Descripción | Severidad | Estado real |
|-----|-------------|-----------|-------------|
| BUG-001 | Demo bypass admin | 🔴 | ✅ Resuelto (en código) |
| BUG-002 | REACT_APP_BACKEND_URL | 🔴 | ✅ Resuelto (en código) |
| BUG-003 | Stripe checkout/webhooks | 🔴 | ✅ Implementado (falta verificar dashboard) |
| BUG-004 | Admin con datos falsos | 🟠 | ✅ Resuelto (queries reales) |
| BUG-005 | Google OAuth | 🟠 | ✅ Mitigado (vía BUG-009) |
| BUG-006 | Forgot password mentía | 🟠 | ✅ Resuelto esta sesión |
| BUG-007 | Preferencias en localStorage | 🟡 | ❌ Pendiente (baja prioridad) |
| BUG-008 | server.py monolítico | 🟠 | ❌ Pendiente (deuda técnica) |
| BUG-009 | Workflows de deploy en carrera | 🔴 | ✅ Resuelto esta sesión |
| BUG-010 | yfinance bloqueaba el event loop | 🔴 | ✅ 8 endpoints / ⏳ opciones pendiente |
| BUG-011 | Código muerto (fixes.py, admin_diary_endpoint.py) | 🟡 | ⏳ Reportado (no borrado sin confirmar) |
| BUG-012 | LIMIT/OFFSET por interpolación (hardening) | 🟢 | ⏳ Reportado (riesgo real nulo) |

**Conclusión:** la app está **mucho más cerca del 100%** de lo que el diario anterior
sugería. Los bloqueantes reales eran (1) la condición de carrera entre los dos workflows
de despliegue (BUG-009) y (2) yfinance bloqueando el event loop en los endpoints públicos
(BUG-010) — ambos resueltos. Pendientes: el mismo patrón yfinance en el módulo de opciones
(premium), limpieza de código muerto (BUG-011) y deuda de fondo (BUG-007, BUG-008).
El adaptador SQL es seguro (sin inyección); JWT/CORS están bien configurados.

---

*Última actualización: 2026-06-02 — verificación archivo por archivo contra el código.*
