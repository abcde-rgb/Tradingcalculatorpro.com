# 🧭 ESTADO DEL PROYECTO — TradingCalculator.Pro

> **Este es el documento vivo del proyecto.** Es la fuente de verdad sobre *qué hay*,
> *qué falta*, *qué hay que probar* y *qué hay que hacer*. Cualquier asistente (Claude)
> o persona que retome el proyecto debe **leer este archivo primero** y **actualizarlo
> al terminar** su sesión (ver § _Cómo mantener este documento_ al final).
>
> - 📅 **Última verificación real contra el código:** 2026-06-25
> - 🌿 **Rama de trabajo actual:** `claude/stoic-mayer-04dpp2`
> - 📚 Documentos hermanos: [`ANALISIS_2026-06-25.md`](./ANALISIS_2026-06-25.md) ·
>   [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) ·
>   [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md) ·
>   [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`DIARIO_BUGS.md`](../DIARIO_BUGS.md)

---

## 1. Semáforo de lanzamiento

| Área | Estado | Nota |
|---|:--:|---|
| **Frontend build** (`npm run build`) | 🟢 | Verificado 2026-06-25: exit 0, 5.0 MB, code-splitting OK |
| **Backend import + sintaxis** | 🟢 | `import server` OK → **169 rutas**; 10 módulos compilan |
| **Tests offline (matemáticas opciones)** | 🟢 | 10 nuevos tests unitarios → `10 passed` (antes 0) |
| **Tests de integración** | 🟡 | Existen pero requieren `BACKEND_URL` vivo; se saltan si no |
| **Seguridad (auth, pagos, admin)** | 🟢 | Auditoría sólida; sin secretos en el repo |
| **CI backend (Cloud Run)** | 🟡→🟢 | El job `test` corría pytest roto; **fix de `conftest` aplicado** |
| **CI frontend (GitHub Pages)** | 🟢 | Workflow correcto (OAuth + analytics + 404.html) |
| **Stripe (código)** | 🟢 | Checkout + webhooks implementados |
| **Stripe (operación)** | 🔴 | Falta verificar productos/claves en dashboard real |
| **OxaPay / crypto (código)** | 🟢 | Invoice + webhook HMAC implementados y probados (activación + idempotencia + rechazo de firma inválida) |
| **OxaPay / crypto (operación)** | 🔴 | Falta Merchant API Key en panel admin + **test en `sandbox`** (round-trip saliente no verificable offline) |
| **DNS / dominio `tradingcalculatorpro.com`** | ❓ | Verificar apuntado (ver DEPLOY_CHECKLIST) |
| **Secretos en GitHub + GCP** | ❓ | Verificar que están todos configurados |

> Leyenda: 🟢 listo · 🟡 funciona con condiciones · 🔴 bloquea · ❓ requiere verificación externa (ops)

---

## 2. Qué HAY (inventario verificado)

### Frontend — React 19 + CRACO + Tailwind + shadcn/ui
- **19 páginas** (rutas en `App.js`): Landing, Dashboard, Pricing, Settings, Education,
  Subscription, Options, Performance, Admin, Login, Register, Forgot/Reset password,
  Verify-email, Magic-link, Payment success/cancel, Legal, Contact, About, 404.
- **12 calculadoras** (`components/calculators/`): BlackScholes, Fibonacci, Futures,
  Leverage, LotSize, MonteCarlo, PatternTrading, Percentage, PositionSize, SimulatorPro,
  Spot, TargetPrice (+ subcarpeta `simulator`).
- **~28 componentes de opciones** (`components/options/`): cadena, payoff, griegas
  (display/panel/time-chart), IV surface, IV rank, unusual activity, market flow,
  optimizador, Kelly, AI Trade Coach, comparador, posiciones guardadas, etc.
- **Gráfico TradingView** (`components/charts/TradingViewChart.jsx`): embed iframe con
  selector de categoría/activo, favoritos, 9 temporalidades, tema y locale.
  → Detalle y límites en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).
- **47 activos** en 6 categorías (crypto, forex, stocks, indices, commodities, futures)
  en `lib/assets.js`.
- **i18n: 8 idiomas** (`lib/i18n/`): es, en, de, fr, ru, zh, ja, ar.
- **Pagos**: Stripe + PayPal (`@paypal/react-paypal-js`) + **OxaPay** (crypto, botón "Criptomonedas").
- **Auth**: Google OAuth + JWT con httpOnly cookies (store Zustand en memoria).
- **Analítica/SEO**: GA4 + GTM + GSC/Bing, `sitemap.xml`, `robots.txt`, `og-image`,
  `manifest.json` (PWA), hook `useSEO`.
- **Journal de trading**, alertas de precio (WebSocket), historial de cálculos.

### Backend — FastAPI + asyncpg (shim Mongo→PostgreSQL)
- **160 rutas declaradas** (`server.py` 103 · `admin_routes.py` 45 · `missing_apis.py` 12),
  **169 registradas** en la app (incluye `referrals`, `realtime_alerts`).
- **Módulos**: `server.py` (monolito, 6107 líneas), `admin_routes.py`, `missing_apis.py`,
  `options_math.py`, `options_optimize.py`, `stock_data.py`, `candle_patterns.py`,
  `price_action.py` (estructura de mercado: swings/BOS-CHoCH/S-R/FVG),
  `performance.py`, `realtime_alerts.py`, `referrals.py`.
- **Datos de mercado**: yfinance + CoinGecko (todas las llamadas de red ya van por
  `asyncio.to_thread`/executor → no bloquean el event loop; ver BUG-010).
- **IA**: Anthropic SDK (AI Trade Coach) en `POST /api/options/ai-analyze`.
- **Email**: SendGrid. **Rate limiting**: slowapi.
- **Shim de BD**: clase `Collection` que traduce operadores Mongo (`$set/$inc/$push/$or/
  $in/$regex/$unset/...`) a SQL paramétrico sobre JSONB. **Nunca usar SQL directo.**

---

## 3. Qué FALTA / huecos conocidos

| ID | Hueco | Severidad | Acción |
|---|---|:--:|---|
| G-01 | **Stripe en producción sin verificar** (productos, price IDs, webhook secret) | 🔴 | Validar dashboard + webhook endpoint. Ver DEPLOY_CHECKLIST |
| G-02 | **Sin tests unitarios offline** (antes de esta sesión) | 🟠 | ✅ Mitigado: añadidos 10 tests de `options_math`. Faltan para `performance.py`, shim de BD |
| G-03 | `conftest.py` con skip roto → CI podía fallar | 🟠 | ✅ Corregido esta sesión |
| C-08 | API keys (Stripe/SendGrid) almacenables en `app_settings` (DB) en claro | 🟠 | Decisión de producto: usar solo Secret Manager; quitar override por DB |
| BUG-007 | Preferencias de usuario solo en `localStorage` (no cross-device) | 🟡 | Endpoint `PATCH /api/user/preferences` + carga en perfil |
| BUG-008 | `server.py` monolítico (6107 líneas) | 🟠 | Refactor a `app/routers/` (requiere tests antes). Deuda técnica |
| G-04 | **Route shadowing**: ~21 endpoints de `admin_routes.py` son código muerto (los de `server.py` ganan por orden de registro) | 🟡 | Unificar en un solo router admin |
| G-05 | TradingView: sin guardar análisis/dibujos/layouts por usuario | 🟡 | Roadmap en TRADINGVIEW_PERSONALIZACION.md |
| G-06 | Sin CI de PR (lint/build/tests antes de merge); solo deploy en push a `main` | 🟡 | ✅ Añadido `ci.yml` esta sesión |
| G-07 | Sin Dependabot/CodeQL/secret-scanning declarados en repo | 🟡 | Activar en ajustes del repo |
| G-08 | Deriva documental (CLAUDE.md/PLAN_100 desactualizados) | 🟢 | ✅ Corregido CLAUDE.md esta sesión |
| G-09 | **i18n incompleto**: 6 idiomas (de/fr/ru/zh/ja/ar) con ~290 claves sin traducir (patrones de velas, estrategias de educación) → caen a español. en.js: faltan 4. de/fr/ru: 9 claves muertas | 🟡 | Traducir lotes faltantes; herramienta `frontend/scripts/i18n-check.js` para detectar |

---

## 4. Qué hay que PROBAR (plan de test)

**Automático (ya disponible):**
- `cd backend && pytest tests/ -q` → 10 unit offline pasan, 74 integración se saltan. ✔
- `cd backend && python -m py_compile server.py admin_routes.py options_math.py ...` ✔
- `cd frontend && npm run build` ✔

**Manual / E2E pendiente de hacer en un entorno con backend vivo:**
1. **Registro + verificación email** (SendGrid) → recibir y validar enlace.
2. **Login Google OAuth** real (client ID + origen autorizado en Google Console).
3. **Refresh de sesión** tras recarga (cookie httpOnly → `/api/auth/refresh`).
4. **Checkout Stripe** de cada plan (monthly/quarterly/annual/lifetime) + webhook
   `checkout.session.completed` → usuario pasa a premium.
5. **Cancelar/reanudar suscripción** + billing portal.
6. **AI Trade Coach** (`/options/ai-analyze`) con `ANTHROPIC_API_KEY`.
7. **Datos de mercado** en vivo: `/prices`, `/forex-prices`, `/options/chain/{symbol}`.
8. **Panel admin**: métricas, usuarios, impersonación (no debe permitir impersonar admin),
   audit log se rellena.
9. **Alertas de precio** (WebSocket) disparan email.
10. **Multi-idioma**: cambiar locale recarga el widget TV y traduce la UI.

---

## 5. Backlog priorizado

### P0 — Bloquea lanzamiento (ops)
- [ ] Verificar **todos los secretos** en GitHub (frontend) y GCP Secret Manager (backend).
- [ ] Verificar **Stripe** real: productos, price IDs (`price_1TXM8...`), webhook `whsec_...`.
- [ ] Verificar **dominio** `tradingcalculatorpro.com` y CNAME de GitHub Pages.
- [ ] Confirmar **Google OAuth**: origen `https://abcde-rgb.github.io` autorizado.

### P1 — Robustez antes de escalar
- [ ] Cerrar **C-08** (API keys solo en Secret Manager).
- [ ] Activar **Dependabot + CodeQL + secret scanning** en el repo.
- [ ] Ampliar tests offline a `performance.py` y al shim `Collection`.

### P2 — Producto
- [ ] **BUG-007**: sincronizar preferencias de usuario al backend.
- [ ] **TradingView**: guardar layouts/indicadores por usuario (ver doc dedicado).
- [ ] Resolver **route shadowing** admin (G-04).

### P3 — Deuda técnica
- [ ] Refactor de `server.py` monolítico a `app/routers/`.

---

## 6. Gating de operación (lo que NO está en el código)

Estos puntos no se pueden cerrar desde el repo; requieren acceso a consolas externas:
- **GCP**: Cloud Run service, Cloud SQL `trading-db` (europe-west1), Secret Manager,
  Workload Identity Federation, Artifact Registry `trading-repo`.
- **Stripe**: productos/precios, webhook endpoint apuntando a `…/api/webhook/stripe`.
- **OxaPay** (crypto): Merchant API Key en panel admin (o `OXAPAY_API_KEY` en Secret Manager),
  `oxapay_sandbox` = `true`|`false`, y registrar el callback `…/api/webhook/oxapay` en su dashboard
  (la misma API Key firma el webhook con HMAC-SHA512). Probar primero con `sandbox=true`. Opcional:
  `BACKEND_PUBLIC_URL` si `request.base_url` no resuelve al host público.
- **Google Cloud Console**: OAuth client + orígenes autorizados.
- **SendGrid**: API key + dominio remitente verificado (`alerts@tradingcalculatorpro.com`).
- **GitHub**: Secrets de Actions (ver DEPLOY_CHECKLIST) + branch protection.
- **DNS**: `tradingcalculatorpro.com` / `www`.

---

## 7. Registro de sesiones (append-only)

> Añade una entrada **al final** cada vez que trabajes en el proyecto.

### 2026-06-25 — Auditoría integral + arranque de documentación viva
- ✅ Verificado build frontend (exit 0) e import backend (169 rutas); 10 módulos compilan.
- ✅ **Fix**: `backend/tests/conftest.py` — el skip de integración estaba roto
  (`skip_integration(item)` → `item.add_marker(...)`). Sin esto, `pytest tests/`
  fallaba (53 failed/21 errors) y podía romper el deploy de Cloud Run.
- ✅ **Nuevo**: `backend/tests/test_options_math_unit.py` — 10 tests offline de
  Black-Scholes/griegas/payoff/paridad put-call (valores contra referencia: call 10.4506,
  put 5.5735, delta 0.6368). `pytest tests/` → `10 passed, 74 skipped`.
- ✅ **Nuevo**: `.github/workflows/ci.yml` — CI de PR (compile + unit tests + build).
- ✅ **Docs**: creados `docs/ESTADO_PROYECTO.md` (este), `ANALISIS_2026-06-25.md`,
  `GUIA_EXTENSION.md`, `TRADINGVIEW_PERSONALIZACION.md`, `DEPLOY_CHECKLIST.md`.
- ✅ **Skill**: `.claude/skills/estado-proyecto/SKILL.md` para mantener todo esto.
- ✅ **Fix doc**: `CLAUDE.md` decía que `performanceApi.js` no tenía `withCredentials`;
  el código ya lo tiene (+ refresh silencioso). Corregido.
- ✅ Reescrito `README.md` (estaba prácticamente vacío).
- 🔎 Seguridad: revisión de auth/pagos/admin/CORS/shim → sólida; sin secretos en el repo.
  Pendiente arquitectónico: C-08 (API keys en DB).

---

### 2026-06-25 (cont.) — Mapa de calor de uso + UX auth + auditoría i18n
- ✅ **Nueva feature — Mapa de calor de uso en el admin** ("qué miran más los usuarios"):
  - Backend: `POST /api/analytics/track` (ligero, rate-limited 240/min, sin PII, respeta
    consentimiento) + `GET /api/admin/usage-heatmap` (rankings de páginas/secciones +
    matriz 7×24 día/hora + visitantes únicos). Colección `usage_events` con índice y purga
    a 120 días en startup. Backend pasa de 169 a **171 rutas**.
  - Frontend: ping de vistas en `AnalyticsTracker` (solo con consentimiento) + tarjeta
    `UsageHeatmapCard` en `AdminPage` (ranking + heatmap visual).
- ✅ **UX**: botón **Volver** + **X de cerrar** en login/registro (`AuthShell`). Claves
  i18n `back` añadidas (es/en).
- 🔎 **Auditoría i18n** (ver G-09): herramienta nueva `frontend/scripts/i18n-check.js`.
  en.js casi completo (faltan 4); de/fr/ru/zh/ja/ar faltan ~290 claves (caen a español).
- 📚 Nuevo doc [`ROADMAP_IDEAS.md`](./ROADMAP_IDEAS.md): catálogo de mejoras de
  análisis/gestión/psicología/comportamiento/educación implementables.
- ✅ Verificado: `npm run build` exit 0; backend importa (171 rutas); `pytest` 10/74.

### 2026-06-25 (cont. 2) — Rediseño del login + fix de claves i18n crudas
- 🐛 **Bug encontrado y corregido**: el panel de marca del login/registro usaba
  `t('authHeroTitle') || 'fallback'`, pero como `t()` devuelve **la clave** cuando falta y
  esas claves **no existían**, el panel mostraba texto en crudo ("authHeroTitle",
  "authFeatureOptions"…). Solución: helper `tr(key, fallback)` (usa el fallback si `t`
  devuelve la propia clave) + claves añadidas a es.js/en.js.
- 🎨 **Rediseño completo de inicio de sesión/registro** (`AuthShell`): mini-gráfico
  animado de marca (SVG que se dibuja), orbes animados, fila de confianza (cifrado/gratis/
  idiomas), tarjeta "glass" (`backdrop-blur`), entradas escalonadas. Mantiene auth, Google,
  validación e i18n intactos. Build exit 0 (+216 B), sin advertencias nuevas.

### 2026-06-25 (cont. 3) — Consistencia auth + barrido de claves crudas
- ✅ **Reset / Forgot / Magic** ahora usan `AuthShell` → mismo diseño que el login
  rediseñado (panel de marca, Volver/X, tarjeta glass). Antes tenían un layout propio viejo.
- 🐛 **Barrido del patrón `t('x') || 'fallback'`**: solo faltaba la clave `about`
  (el footer mostraba "about" en crudo). Añadida a es/en. El resto de claves existen.
- ✅ Build exit 0. Capturas de verificación generadas (login, registro, forgot, móvil).

### 2026-06-25 (cont. 4) — Calendario de PnL en el journal
- ✅ **Nuevo: calendario de PnL mensual** (estilo TradeZella) en la pestaña Analytics del
  journal (`AnalyticsDashboard`): rejilla día×mes verde/rojo por PnL realizado, navegación de
  mes y total mensual. La **curva de equity ya existía** (por nº de operación).
- Backend: `compute_analytics` ahora devuelve `daily_pnl` (`[{date,pnl,n}]`) agrupado por
  fecha de salida. 3 tests unitarios offline nuevos (`test_performance_unit.py`).
- Claves i18n `pnlCalendar`, `tradingDays` (es/en). Build exit 0.

### 2026-06-25 (cont. 5) — Pulido del dashboard
- ✅ Animaciones de entrada (fade-up escalonado, framer-motion) en los bloques del
  dashboard: bienvenida, stats, gráfico y panel de alertas/historial. Additivo, sin riesgo.

### 2026-06-25 (cont. 6) — Detección de sesgos de comportamiento
- ✅ **Nuevo**: `detect_behavioral_biases` en `performance.py` (efecto disposición,
  revenge trading, overtrading, falta de stop) → expuesto en analytics como
  `behavioral_biases`. Tarjeta nueva en `AnalyticsDashboard` con severidad + consejo
  cuantificado. +4 tests unitarios (total 7 en `test_performance_unit.py`).
- i18n: claves `biasTitle`/`bias*` (es/en) con interpolación de cifras. Build exit 0.
- Nota: los **R-múltiplos ya existían** (`avg_r`, `r_distribution`) — no se duplicó.

### 2026-06-26 — SEO: sitemap limpio + skill + generador
- ✅ `sitemap.xml` regenerado (8 páginas públicas, hreflang completo, sin rutas con muro).
- ✅ **Skill nuevo** `.claude/skills/mejorar-seo/` (auditoría + cómo añadir SEO + gotchas).
- ✅ Generador reutilizable `frontend/scripts/gen-sitemap.js` (`node scripts/gen-sitemap.js`).
- ⚠️ **Pendiente decisión**: dominio inconsistente — frontend usa `tradingcalculatorpro.com`,
  backend CORS usa `tradingcalculatorpro.com`, hoy se sirve en github.io. Unificar antes de lanzar.

### 2026-06-26 (cont.) — Auditoría SEO + fixes
- 🐛 **Fix**: `useSEO` ponía `og-image.svg` como imagen social (las redes NO renderizan SVG)
  → cambiado a `og-image.png` (1200×630). Ahora los compartidos muestran preview.
- ✅ **Nuevo**: opción `noindex` en `useSEO`, aplicada a páginas privadas/utilidad
  (dashboard, settings, admin, subscription, 404) → Google no las indexa.
- 🔎 Auditoría: todas las páginas públicas usan `useSEO`; todas las claves `seo*` existen en
  es.js; JSON-LD muy completo (Organization/WebSite/WebApplication/Course/FAQPage/Breadcrumb).
- ⏳ Mayores palancas pendientes (no bloqueadas por código): **unificar dominio** y
  **prerender** (react-snap/SSG) para que los crawlers vean HTML completo del SPA.

### 2026-06-26 (cont. 2) — Dominio unificado a tradingcalculatorpro.com
- ✅ Decidido el dominio: **`tradingcalculatorpro.com`**. Reemplazadas TODAS las referencias al
  incorrecto `tradingcalculator.pro` (backend CORS/emails/FRONTEND_URL, configs, i18n, contacto,
  docs) → 0 restantes.
- ✅ Dominio personalizado de GitHub Pages: añadido `frontend/public/CNAME`, `homepage` y
  `PUBLIC_URL` a raíz `/` (con dominio propio el sitio se sirve en la raíz). Build raíz
  verificado (assets en `/static/`).
- ⏳ **Pendiente (ops)**: configurar DNS + Custom domain en GitHub Pages antes de mergear
  (pasos exactos en DEPLOY_CHECKLIST §G).

### 2026-06-27 — Fix de 3 crashes críticos (encontrados en code-review + verify runtime)
- 🐛 **PayPal capture 500**: `db.payment_transactions.find_one_and_update(...)` no existía en el
  shim → `AttributeError`. **Fix**: implementado `Collection.find_one_and_update` atómico
  (`SELECT … FOR UPDATE` + operadores). Verificado: el claim funciona (503 PayPal-no-config es
  el camino esperado sin credenciales).
- 🐛 **Todos los endpoints de referidos 500**: `_require_user_proxy`/`_require_admin_proxy`
  (en `referrals.py` Y `missing_apis.py`) llamaban `require_user(credentials)` pero el refactor
  de auth cambió la firma a `(request, credentials)`. **Fix**: los proxies inyectan y pasan
  `request`. (También afectaba verificación de email, cambio de plan, export, save-to-journal.)
- 🐛 **Agregado del shim no agrupaba** (`_id:None` / múltiples acumuladores): `referrals/me` y
  `leaderboard` devolvían docs crudos → `KeyError`. **Fix**: push-down SQL restringido al caso
  `$sum:1` (COUNT); agrupación en Python para el resto ($sum de campo, $first, $max, $min).
- 🐛 **PricingPage pagos rotos tras recarga**: 3 fetch sin `credentials:'include'` y `refreshUser`
  nunca llamado → `Bearer null`. **Fix**: `credentials:'include'` + `refreshUser()` en mount.
- ✅ **Verificado en runtime** (Postgres 16 real + backend): referrals/me 200 (total 15),
  leaderboard 200 (email+totales correctos), PayPal sin AttributeError, track/heatmap 200.
  17 tests unitarios verde; build frontend exit 0.

### 2026-06-27 (cont.) — Fixes medios + correcciones de contenido
- 🐛 **#5** `UsageHeatmapCard` (admin): el efecto dependía solo de `[days]` y capturaba un
  `Bearer null` tras recargar → heatmap vacío. **Fix**: deps `[days, headers]` + guard de bearer
  válido (mismo patrón que IntegrationsEditor).
- 🐛 **#6** `performanceApi`: en 401 con refresh concurrente, `silentRefresh` devolvía `null` y
  se hacía `logout()` de una sesión válida. **Fix**: solo `logout()` si `!isAuthenticated`.
- ✍️ **Contenido (visto al correr la app)**: título/desc SEO de `/pricing` decía **"$9.99/mes"**
  (real **17€**) → corregido en es/en. Stat de la landing **"250+" activos** → **"50+"** (hay 47
  curados) + etiqueta `statsAssets` simplificada.
- ✅ Build exit 0.

### 2026-06-27 (cont. 2) — Pago crypto: Stripe(roto) → MaxelPay
- 🔁 **Motivo**: el botón "Criptomonedas" estaba etiquetado "Stripe (Crypto)" pero `crypto` **no**
  estaba en `_PAYMENT_METHODS_MAP` → `/checkout/create` devolvía `checkout_url: null` y no pasaba
  nada (roto en TODOS los planes). Coinbase solo era una clave de settings muerta. Sustituido por
  **MaxelPay** (pasarela crypto no-KYC).
- ➕ **`backend/maxelpay.py`** (módulo puro, sin DB): AES-256-CBC (key=secret, iv=secret[:16],
  base64) aislado en `_encrypt`/`_decrypt`, `build_payload` (campos camelCase exactos),
  `create_checkout_url` (POST `api.maxelpay.com/v1/{stg|prod}/merchant/order/checkout`, header
  `api-key`, body `{data}`), `parse_webhook`/`webhook_order_id`/`webhook_is_paid` (tolerantes a
  variantes y a envelope cifrado).
- 🔌 **`server.py`**: rama `crypto`→MaxelPay en `/checkout/create`; endpoint **`POST /webhook/maxelpay`**
  (reutiliza `_activate_paid_subscription` + `credit_referrer_for_payment`, claim atómico
  `find_one_and_update` para idempotencia). Claves `maxelpay_api_key`/`maxelpay_secret_key` (secretas,
  cifradas con Fernet) + `maxelpay_mode` (público) en el sistema de settings (admin + env fallback).
- 🖥️ **Frontend**: `PricingPage` muestra "Pago seguro vía **MaxelPay**". `AdminPage`: nuevo grupo
  "MaxelPay (pagos con criptomonedas)" con API Key / Secret / Mode; quitado el campo muerto de Coinbase.
- ✅ **Verificado**: 26 tests unitarios del módulo (round-trip de cifrado incluido) + 43 unit totales.
  **Smoke E2E contra Postgres real** (5/5): webhook orden-desconocida→ignored, pending→sin premium,
  Completed→**premium concedido + tx pagada**, replay→already_processed, checkout sin config→503.
  La llamada saliente a MaxelPay **no** es verificable offline (red bloqueada) → **pendiente test `stg`**.
- ✅ Build frontend exit 0.

### 2026-06-27 (cont. 3) — Pago crypto: MaxelPay → OxaPay (a petición)
- 🔁 **Motivo**: se sustituye MaxelPay por **OxaPay** (otra pasarela crypto no-KYC). Ventaja: API
  JSON plana + verificación **HMAC-SHA512** del webhook (más segura y sin el handshake de cifrado AES
  de MaxelPay que no era verificable offline). Contrato tomado **verbatim del SDK oficial** `oxapay` 0.3.0.
- ➖ Eliminados `backend/maxelpay.py` y su test.
- ➕ **`backend/oxapay.py`** (módulo puro): `create_invoice` (POST `api.oxapay.com/v1/payment/invoice`,
  header `merchant_api_key`, JSON snake_case, `sandbox` bool), `verify_webhook` (HMAC-SHA512 del body
  crudo, `compare_digest`), `parse_webhook`, `webhook_order_id`, `webhook_is_paid` (status==`paid`).
- 🔌 **`server.py`**: rama `crypto`→OxaPay en `/checkout/create`; endpoint **`POST /webhook/oxapay`**
  que **verifica el HMAC antes de actuar** (401 si falla) y reutiliza `_activate_paid_subscription` +
  `credit_referrer_for_payment` con claim atómico (idempotencia). Settings: `oxapay_api_key` (secreto,
  Fernet) + `oxapay_sandbox` (público), con fallback por env var.
- 🖥️ **Frontend/Admin**: botón crypto → "Pago seguro vía **OxaPay**"; grupo admin "OxaPay (pagos con
  criptomonedas)" con Merchant API Key + Sandbox.
- ✅ **Verificado**: tests unitarios (incl. HMAC genuino→OK, body manipulado/clave incorrecta→rechazo).
  **Smoke E2E contra Postgres real**: webhook con **firma inválida→401**, firma válida `paid`→**premium
  concedido + tx pagada**, replay→already_processed, checkout sin config→503. Build frontend exit 0.
  La llamada saliente a OxaPay requiere **test en sandbox** con API Key real (red bloqueada offline).

### 2026-06-27 (cont. 4) — Advertencia de Riesgo con datos reales
- ➕ Nueva pestaña **"Advertencia de Riesgo"** en `/legal` (`LegalPage.jsx`) con estadísticas
  **verificadas y citadas**: 74–89% de cuentas minoristas de CFDs pierden (ESMA), 97% en day trading
  >300 días (estudio Brasil 2020), <1% rentable consistente (Taiwán, Barber & Odean). Con fuentes.
- 🔗 Footer: el enlace "Disclaimer" estaba **muerto** (`href="#"`); ahora apunta a `/legal?tab=risk`
  con clave i18n `riskWarning` añadida a los **8 idiomas**. `LegalPage` soporta deep-link `?tab=`.
- ⚠️ Nota: se rechazó poner el reclamo falso "se pierde 100% seguro" (la probabilidad de perder NO es
  del 100%); se usan las cifras reales, que ya son contundentes y además protegen legalmente.
- ✅ Build frontend exit 0. Verificado visualmente (captura de la pestaña).

## Cómo mantener este documento

1. **Al empezar**: lee §1–§5 para saber dónde está todo.
2. **Mientras trabajas**: si descubres un hueco nuevo, añádelo a §3 con un ID `G-xx`.
3. **Al terminar**:
   - Actualiza el **semáforo** (§1) y el **inventario** (§2) si cambió algo.
   - Marca casillas del **backlog** (§5) que hayas cerrado.
   - Añade una entrada con fecha en el **registro de sesiones** (§7).
   - Si tocaste seguridad/bugs, refleja también en [`../DIARIO_BUGS.md`](../DIARIO_BUGS.md).
4. **Regla de oro**: este documento debe reflejar el **código real**, no intenciones.
   Verifica antes de afirmar (compila, ejecuta, lee el archivo).

### 2026-07-03 — Sesión larga: educación completa, dashboard pro, SEO al dominio real
- ✅ **Educación**: reorganización estilo academia de broker (sidebar 6 pilares, buscador,
  breadcrumb, PRs #45); backlog de contenido completado al 100% (25 módulos, PRs #41-44);
  calculadora de riesgo de ruina Monte Carlo (#48); plantilla de Plan de Trading imprimible.
- ✅ **Dashboard**: "Estación de cálculo" unificada (4 grupos, un acento, breadcrumb, #49);
  favoritos + recientes (localStorage); botón "Registrar en el diario" desde Position Size
  (POST /performance/trades); CTAs unificados al verde primario.
- ✅ **Fixes**: crash premium de Educación (import CheckCircle2, #47); auto-recarga ante
  ChunkLoadError tras deploys (#46); deep-link ?tab=montecarlo (#49); auditoría i18n
  completa → 0 claves crudas en toda la app (#50 + 7 claves).
- ✅ **SEO (skill mejorar-seo)**: TODO el SEO apuntaba a `tradingcalculatorpro.com` (dominio
  AJENO) → migrado canonical/hreflang×9/OG/JSON-LD/sitemap/robots a
  `https://abcde-rgb.github.io/Tradingcalculatorpro.com`; schema corregido (GPT-4→Claude,
  screenshot svg→png); robots sin Allow explícito a rutas con muro. ⚠️ Si algún día se
  compra dominio propio, revertir según §6 del skill.
- Verificación: smokes headless premium (educación 25 módulos, dashboard 12 herramientas,
  plantilla imprimible, head SEO) — 0 errores de runtime.

### 2026-07-04 — Widgets de dashboard, engagement de educación y 5 módulos "gap"
- ✅ **Dashboard (#52)**: Watchlist con precios en vivo (hasta 8 símbolos, buscador con
  sugerencias, refresco 60s); calculadora de interés compuesto (gráfico de área, hitos);
  calendario económico TradingView (idioma/tema sincronizados).
- ✅ **Educación engagement (#52)**: progreso por módulo (contadores por pilar + barra en
  header), glosario con buscador (20 términos), quiz de autoevaluación (8 preguntas).
- ✅ **5 módulos "gap" vs fuentes pro (#53)**: Operar noticias, Sentimiento de mercado,
  Análisis intermercado, Amplitud y ciclos, Brokers/regulación/estafas. 66 claves i18n × 8
  idiomas. ⚠️ Lección: el prefijo `bs*` colisionaba con Black-Scholes (`bsTitle` duplicada)
  → renombrado a `bkr*`. **La academia queda en 32 módulos / 6 pilares.**
- Verificación: build limpio, auditoría i18n 0 claves rotas, smoke premium headless con
  click-through de los 32 módulos (0 regresiones, 0 pageerrors).

### 2026-07-04 (2) — Módulo "Margen y liquidación en derivados"
- ✅ Petición del usuario: aislado/cruzado, modo promedio vs separado y sistemas
  anti-manipulación (tipo MP Shield de Margex). Auditado el centro: no existía nada → añadido
  como módulo nº 33 en el pilar Riesgo y capital (`margin-liq`, prefijo i18n `mlq*`, 19 claves × 8 idiomas).
- Cubre: isolated vs cross, one-way vs hedge, precio de liquidación/margen de mantenimiento,
  mark vs last vs índice, funding rate, cascadas de liquidación y motores anti-manipulación.
- Verificación: build limpio, auditoría i18n 0 rotas, smoke premium (8 tarjetas renderizadas,
  click-through de los 33 módulos sin regresiones).

### 2026-07-04 (3) — Auditoría "prop desk" + laboratorio de riesgo + griegas
- Usuario pegó un roadmap de 9 calculadoras "que faltan": la auditoría demostró que 7 YA existían
  (RoR, Kelly, expectancy, Monte Carlo, Black-Scholes+griegas, griegas de cartera, futuros con
  tick/nocional/margen). Huecos reales cerrados:
- ✅ Drawdown → recuperación (RiskAnalysisTools, testid drawdown-recovery-calculator): +X% para
  recuperar, nº de operaciones estimado con riesgo+expectancy en compuesto, tabla 10-90%, nota VaR.
- ✅ Correlación en Portfolio Heat (slider heat-corr): riesgo efectivo = √(Σr²+2ρΣΣrr).
- ✅ Módulo 34 "Griegas de opciones" (option-greeks, prefijo gk*, pilar Pro): Δ/Γ/Θ/V/ρ/IV con
  ejemplos numéricos y regla IV Rank; enlaza con las calculadoras de Opciones.
- 30 claves i18n × 8 idiomas (ddr*, heatCorr*/heatEffective*, gk*). Smoke: 34 módulos, 0 regresiones.

### 2026-07-04 (4) — Buscadores de activos: "que aparezcan todos"
- ✅ **Backend** (`stock_data.py`): universo curado ampliado (~150 → ~290 símbolos): bolsa española
  (.MC + ^IBEX), majors europeos (.PA/.DE/.MI/.SW/.L), 22 índices mundiales, 41 pares forex,
  73 criptos Yahoo; aliases nuevos (IBEX35, US500, US30, US100, UK100, NIFTY, SHIB, BCH…);
  resultados 30 → 50; Yahoo live search 25 → 40. Mapa canónico `COINGECKO_SYMBOL_TO_ID` (76
  monedas) compartido por `/api/prices` (antes 11 hardcodeadas) y el poller de alertas (antes 21).
- ✅ **Gráfico TradingView**: catálogo `assets.js` 47 → 186 activos (61 cripto Binance, 29 forex,
  64 acciones con BME/XETR/EURONEXT/MIL/SIX/LSE, 15 índices, futuros) + buscador instantáneo
  transversal a todas las categorías (testid `chart-search`).
- ✅ **Calculadoras** (UniversalAssetSearch): CRYPTO_LIST 11 → 76 monedas con precio en vivo,
  +15 pares forex, +20 acciones EU/ES locales, +6 índices; límite remoto 30 → 50.
- ✅ **Alertas de precio**: de 3 símbolos fijos (BTC/ETH/SOL) a cualquier activo (input libre +
  datalist; cripto vía CoinGecko, resto vía yfinance en el poller).
- ✅ **Watchlist**: sugerencias 6 → 10.
- Verificación: py_compile + 11 tests unitarios OK; búsqueda offline resuelve IBEX/SHIB/US500/
  EURAUD/SAN.MC; smoke premium: chart-search encuentra PEPE/Iberdrola/IBEX y carga BME:IBC35,
  alertas aceptan WIF, calculadora encuentra SHIB. 0 claves i18n rotas (+2 claves ×8).

### 2026-07-04 (5) — Reducción de costes: workflow conmutable + guía Neon
- Diagnóstico de la factura GCP: mayores costes = Cloud SQL 24/7 y Cloud Run `min-instances=1`.
  Poller de alertas cada 30 s mantiene todo despierto; imágenes Docker se acumulan sin limpieza.
- ✅ `deploy-cloud-run.yml` parametrizado con variables de repositorio (sin cambiar código):
  - `DB_PROVIDER=neon` → no monta el socket de Cloud SQL (conexión TCP+SSL vía `DATABASE_URL`).
    Por defecto (vacía/`cloudsql`) se comporta igual que siempre.
  - `MIN_INSTANCES` (por defecto 1) → poner a 0 para ahorrar.
- ✅ Guía `docs/MIGRACION_NEON.md`: migración paso a paso Cloud SQL → Neon (gratis) con
  Cloud Shell (proxy + pg_dump/pg_restore), cambio de secreto, verificación y rollback.
- ⚠️ El código de conexión (`init_pool`) YA soportaba Neon (rama TCP+SSL). Migración = cambiar
  secreto + variable, sin tocar código.
- ⚠️ NO fusionar a main hasta reactivar la facturación: el workflow se dispara al cambiar su
  propio archivo y un deploy fallaría con billing desactivado (sin impacto en prod, solo ruido).

### 2026-07-04 (6) — Los 2 huecos "prop desk": stress test de margen + edge en vivo
- ✅ **Stress test de margen** (`RiskAnalysisTools`, testid `margin-stress-test`): dado saldo +
  posiciones (largo/corto, exposición), muestra por escenarios (−5/−10/−15/−20/−30 % + slider
  −40…+40) el P&L, saldo restante y estado (Aguanta / Margin call / Liquidado), más el
  movimiento que dispara la liquidación y el apalancamiento bruto. Modelo direccional correcto
  (los cortos ganan en caídas). Nota de que es simplificado vs bróker real.
- ✅ **Edge en vivo desde el diario** (`JournalEdgeButton`): botón "Usar mis datos del diario"
  en Risk of Ruin y Kelly que llama a `/performance/analytics` y rellena win rate y R:R con las
  operaciones REALES del usuario; avisa si hay <100 operaciones (muestra pequeña) o si no hay
  sesión/datos. Cierra la Fase 3 del roadmap (calculadoras alimentadas por el journal real).
- 29 claves i18n × 8 idiomas (mst*, edge*). Build limpio, i18n 0 rotas, smoke premium:
  stress test interactivo (5x aguanta hasta −15 %, 15x liquida en −10 %), botones presentes en
  RoR y Kelly, click-through de los 34 módulos sin regresiones.
- Auditoría previa: el resto de ideas Saxo/IB/IG (payoff, IV rank/surface, multi-leg, griegas
  de cartera, analítica por instrumento/setup, sesgos) YA existían. Descartadas por no encajar
  en una calculadora/academia: Tax Loss Harvesting, Stock Borrow/Loan, Basket rebalance,
  Probability Lab (requieren cuenta real y ejecución).

### 2026-07-04 (7) — 2 módulos institucionales: la mesa profesional + disciplina
- ✅ **La mesa institucional** (`inst-desk`, pilar Pro, icono Landmark): roles (analista/quant, PM,
  trader de ejecución, gestor de riesgo, jefe de mesa), ejecución algorítmica (VWAP/TWAP/POV/IS),
  impacto de mercado/slippage/liquidez (order book, dark pools, RFQ), VaR y límites de riesgo,
  atribución de P&L (Sharpe/Sortino/Calmar/info ratio), rutina de mesa (brief, morning meeting,
  blotter, post-market review) + nota "qué robar el retail".
- ✅ **Disciplina y rendimiento profesional** (`pro-discipline`, pilar Psicología, icono Focus):
  proceso sobre resultado (scorecard), checklists y pre-compromiso, taxonomía de errores
  (análisis/ejecución/disciplina), protocolo anti-tilt y estrés (amígdala/cortisol, disyuntor),
  fatiga de decisión y rendición de cuentas.
- Auditoría: 0 cobertura previa de todo lo institucional (VWAP/VaR/blotter/roles/microestructura).
  28 claves i18n × 8 idiomas (idesk*, disc*). Academia: 34 → **36 módulos**.
- Verificación: build limpio, i18n 0 rotas, smoke premium (inst-desk 6 tarjetas, pro-discipline 5),
  click-through de los 36 módulos con 0 regresiones.

### 2026-07-04 (8) — 4 temas visuales premium (Oro/Cripto/Forex/Nasdaq)
- ✅ Sistema de temas ampliado de claro/oscuro a **6 aspectos**: se añaden 4 temas premium
  dark-based con paleta completa (18 variables shadcn c/u) en `index.css`:
  - **Oro "Black Gold Stone"** (D1 Milano): carbón cálido + oro disperso + textura sutil de piedra (SVG noise).
  - **Cripto**: violeta-negro + naranja Bitcoin + violeta eléctrico.
  - **Forex**: azul marino institucional + verde billete.
  - **Nasdaq**: casi-negro + cian/azul vívido.
- `theme.js`: soporte de temas con nombre (aplica `.dark` + `.theme-<name>`); nuevo helper
  `resolveMode()` para widgets que solo aceptan light/dark. TradingViewChart y EconomicCalendar
  ahora usan `resolveMode` (los temas con nombre → gráfico oscuro, no blanco).
- Header: selector de tema ampliado con muestras de color por tema; 5 claves i18n × 8 idiomas.
- Verificación: build limpio, i18n 0 rotas, smoke de los 4 temas (clase+variables correctas,
  0 errores) + screenshots (oro y cripto validados visualmente).

### 2026-07-04 (9) — Escala log vs lineal (módulo Technical)
- ✅ Nueva sección "Escala del gráfico: logarítmica vs lineal" en el módulo Análisis Técnico
  (`getTechnicalAnalysis.scale`, prefijo i18n `scale*`, render clonado del patrón de S/R).
  4 tarjetas con explicación profesional Y NÚMEROS: lineal/aritmética (la de "auto"), log/semilog,
  cuándo usar cada una, y por qué CAMBIA el análisis (directrices/patrones/Fibonacci se dibujan
  distinto; ejemplo $100→$200→$400 = recta en log, curva en lineal). 9 claves × 8 idiomas.
- Auditado: 0 cobertura previa. `whitespace-pre-line` para los ejemplos con saltos de línea.
- Verificación: build limpio, i18n 0 rotas, smoke (sección presente, números +100%/$200/$400,
  0 claves crudas, 0 pageerrors).

### 2026-07-04 (10) — SEO a gran escala: 22 páginas indexables + plan de backlinks
- ✅ **Punto 2 (páginas indexables)**: `frontend/scripts/gen-seo-pages.js` (hook `postbuild`)
  genera en cada deploy 22 páginas ESTÁTICAS con HTML completo (Google no necesita ejecutar JS):
  12 calculadoras en `/tools/<slug>/` + 10 temas en `/learn/<slug>/`. Cada una: title/meta/
  canonical/OG/JSON-LD (SoftwareApplication/LearningResource + BreadcrumbList), contenido real,
  CTA a la app (`?tab=`/`?topic=`) y enlaces internos. `sitemap.xml` ampliado a 30 URLs.
  Deep-link `?topic=` añadido a EducationPage (para aterrizar en el módulo exacto).
- ✅ **Punto 3 (backlinks/distribución)**: `docs/CAPTAR_TRAFICO.md` — playbook accionable
  (directorios, Product Hunt, comunidades, vídeos, plantilla de outreach, widget embebible, orden).
- ⚠️ Las páginas se generan en `build/` (no se commitean); se recrean en cada `npm run build`.
- ⚠️ Recordatorio: el mayor multiplicador sigue siendo un DOMINIO PROPIO (github.io = techo bajo).
  Acción del usuario: alta en Search Console + enviar sitemap.
- Verificación: build genera 22 páginas + sitemap 30 URLs; HTML válido y autocontenido (104
  palabras reales en <main>, JSON-LD correcto, CTA → /dashboard?tab=position); screenshot OK.
- Robots.txt revisado: los `Disallow: /` son por-bot (PetalBot/DotBot), correctos; no se toca.

### 2026-07-04 (11) — SEO multi-idioma: ~258 páginas indexables en 8 idiomas
- ✅ `gen-seo-pages.js` reescrito MULTI-IDIOMA (postbuild): carga los 8 archivos i18n.
  - **Educación: 234 páginas** = 30 temas × 8 idiomas, con título+intro REALES ya traducidos
    (se saltan solos los que falten). URLs con prefijo `/en /de /fr /ru /zh /ja /ar`, `/` = es.
  - **Calculadoras: 24 páginas** = 12 × (es + en). El resto de idiomas de calculadoras queda
    como siguiente paso (evita traducciones flojas de copy comercial).
  - hreflang entre todas las versiones de idioma + x-default; `dir="rtl"` en árabe.
  - sitemap.xml: 266 URLs.
- Verificación: build genera 258 páginas; alemán con contenido real de de.js
  ("Ralph Elliott beobachtete…"), árabe RTL correcto (screenshot), hreflang 9 en educación /
  2 en calc; CTAs → /education?topic= y /dashboard?tab=. HTML autocontenido.
- Pendiente/ofrecido: calculadoras en los otros 6 idiomas + widget embebible (Fase 2 restante).

### 2026-07-07 — Motor de detección de ACCIÓN DEL PRECIO (estructura de mercado)
- ✅ **Nuevo módulo `backend/price_action.py`** (puro, determinista, sin I/O): complementa a
  `candle_patterns.py` (que solo reconoce *formas* de vela). Ahora se lee la **ESTRUCTURA**:
  - **Swings** (pivotes fractales alto/bajo, `strength` configurable).
  - **Estructura de mercado**: etiqueta HH/HL/LH/LL y deriva tendencia (alcista/bajista/rango).
  - **BOS / CHoCH**: Break of Structure (continuación) y Change of Character (primer giro
    contra la tendencia → posible reversión); la tendencia se invierte en cada CHoCH.
  - **Soportes/Resistencias** automáticos: clustering de swings por tolerancia (%) + nº de toques
    y fuerza 2..5. Clasifica cada nivel como soporte/resistencia/pivote.
  - **Fair Value Gaps (FVG)**: imbalances de 3 velas (huecos institucionales), marcados `filled`
    si una vela posterior los rellena; los abiertos se listan primero.
- ✅ **Endpoint** `GET /api/education/structure-scan/{symbol}` (rate-limit 30/min; params
  `period`/`interval`/`strength`), en paralelo al de `pattern-scan`; usa `get_ohlc_history`
  (yfinance). Errores devuelven `"scan_failed"` genérico (sin filtrar el detalle de la excepción).
- ✅ **11 tests unitarios offline** `backend/tests/test_price_action_unit.py` (swings, HH/HL/LH/LL,
  BOS/CHoCH incl. flip, clustering S/R, FVG alcista rellenado + bajista sin rellenar, forma
  end-to-end, input vacío). `pytest` → **11 passed**; junto a velas → **22 passed**.
- Verificación: `py_compile server.py price_action.py` OK; import de `detect_structure` en server.
- ⚠️ **Requiere backend vivo** (billing GCP reactivado) para correr sobre datos reales, y una
  **UI de escáner** en el frontend que consuma el endpoint (siguiente paso ofrecido).
- ⚠️ Recordatorio nº1 sigue en pie: migrar Cloud SQL→Neon para frenar el gasto (~CHF 300/mes).
