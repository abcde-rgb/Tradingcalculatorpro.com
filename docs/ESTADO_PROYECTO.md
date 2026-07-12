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
| G-09 | ~~**i18n incompleto**: 6 idiomas con ~290 claves sin traducir → caían a español~~ | 🟢 | ✅ **Cerrado (2026-07-11)**: backfill completo (candlestick, armónicos, opciones Black-Scholes/futuros/volatilidad/griegas, estrategias 6-9, auth, sesgos). Los 8 locales con sets idénticos (4401 c/u), 0 huecos. Eliminadas 9 claves muertas de de/fr/ru |

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
- ⚠️ **Requiere backend vivo** (billing GCP reactivado) para correr sobre datos reales.
- ⚠️ Recordatorio nº1 sigue en pie: migrar Cloud SQL→Neon para frenar el gasto (~CHF 300/mes).

### 2026-07-07 (2) — UI del escáner de estructura debajo del gráfico (Dashboard)
- ✅ **Nuevo componente `frontend/src/components/charts/StructureScanner.jsx`** montado en
  `DashboardPage` **justo debajo del `TradingViewChart`**. Consume
  `GET /api/education/structure-scan/{symbol}`.
- ✅ **Auto-sincronizado con el gráfico**: lee `selectedAsset` del store `useAssetsStore` (el
  mismo que usa el chart), así que escanea el activo que el usuario tiene puesto arriba.
  Resuelve el símbolo a formato Yahoo en el frontend (crypto→`-USD`, forex→`=X`,
  índices/materias/futuros por mapa) para no tocar el backend.
- ✅ **Muestra**: banner de tendencia (alcista/bajista/rango + explicación), línea de stats
  (velas/swings/BOS/CHoCH), lista de rupturas BOS/CHoCH con color y dirección, soportes/
  resistencias con nº de toques y fuerza (puntos), y Fair Value Gaps (abierto/rellenado).
  Auto-escanea al cambiar de activo o período; con guardia anti-carrera (`reqId`).
- ✅ **i18n: 28 claves nuevas × 8 idiomas** (prefijo `struct*`), inyectadas tras el ancla
  `positionSizingDesc`. Los 8 archivos parsean OK; 0 claves crudas.
- Verificación: `npm run build` exit 0 (+ SEO postbuild 258 págs); smoke headless con la API
  mockeada → las 5 secciones renderizan, tendencia/BOS/CHoCH correctos, 0 raw keys, 0
  pageerrors propios (los 2 `SecurityError` son de los iframes TradingView, preexistentes).
  Screenshot validado (card en español, "LEYENDO BTC" sincronizado con el chart).
- ⚠️ En producción solo se verá con **datos reales** cuando el backend esté vivo (billing/Neon).

### 2026-07-07 (3) — 2 módulos de educación: Métodos institucionales + Construcción de posiciones
- ✅ **`inst-methods` "Métodos institucionales"** (getter `getInstitutionalMethods`): VWAP/TWAP,
  Gamma Exposure (GEX), Volume/Market Profile, arbitraje estadístico, paridad de riesgo, order
  flow/DOM + una tarjeta honesta "qué es institucional de verdad vs. envoltorio retail (ICT/SMC)".
- ✅ **`inst-positions` "Construcción de posiciones institucionales"** (getter `getPositionBuilding`):
  por qué no entran de golpe (impacto de mercado), troceo madre/hijas, algoritmos VWAP/TWAP/POV,
  órdenes iceberg, anti-detección (jitter ±10-20%), campaña de acumulación/distribución (Wyckoff),
  y unwinding. Nota honesta: "no tienes sus algos pero SÍ la lógica".
- Ambos en la categoría **Trading Profesional** de `EducationPage`; total **36 → 38 módulos**.
  Render clonado del patrón `{title, intro, items[], note}` (como SmartMoney); iconos `Landmark`/`Layers`.
- ✅ **i18n: 34 claves nuevas × 8 idiomas** (prefijos `imeth*`/`ipos*`), tras el ancla
  `positionSizingDesc`. Los 8 archivos parsean; 34/34 por idioma.
- Investigación con fuentes (SpotGamma, HFR, Quantt, Wyden execution algos, forexclub VWAP/TWAP/IS).
- Verificación: `npm run build` OK; smoke headless deep-link `?topic=inst-methods` y
  `?topic=inst-positions` → ambos renderizan, 0 claves crudas, 0 pageerrors; screenshots validados.

### 2026-07-07 (4) — Módulo Mark Douglas + guías replicables (docs)
- ✅ **`mindset` "Mentalidad probabilística (Mark Douglas)"** (getter `getTradingMindset`) en la
  categoría Psicología: pensar en probabilidades, las 5 verdades fundamentales, los 7 principios de
  la consistencia, los 4 miedos, aceptar el riesgo de verdad, la ventaja/casino y operar "en la zona".
  Total **38 → 39 módulos**. i18n: **17 claves × 8 idiomas** (prefijo `mdz*`). Verificado: build OK,
  smoke `?topic=mindset` 0 crudas/0 errores, screenshot validado.
- 📚 **Dos guías técnicas replicables** en `docs/` (fórmula + pasos + ejemplo + pseudocódigo):
  `METODOS_INSTITUCIONALES_REPLICABLE.md` (VWAP, GEX, Volume Profile, stat-arb, risk parity,
  construcción de posiciones) y `DETECCION_ACCION_PRECIO_REPLICABLE.md` (order blocks, liquidez,
  Wyckoff, DeMark TD Sequential, fractales/Alligator, Ichimoku). Math de ejemplos verificada.

### 2026-07-07 (5) — Detector de confirmación de rupturas (liquidez alcista/bajista)
- ✅ **`backend/price_action.py::detect_breakouts()`**: confirma rupturas de S/R y clasifica **qué
  liquidez entra** (alcista=compradores / bajista=vendedores). Puntúa 0-100 con: cierre atraviesa el
  nivel (no solo mecha), vela a favor, cierre en el extremo, expansión de rango (vs ATR) y de volumen.
  Detecta **fakeouts** (mecha pincha, cierra del otro lado → liquidez contraria = barrido).
- ✅ Integrado en `detect_structure()` (campo `breakouts` + `counts.breakouts/fakeouts`), así que el
  endpoint `/education/structure-scan/{symbol}` ya lo devuelve. **Sin cambios de endpoint.**
- ✅ **`get_ohlc_history` ahora incluye `volume`** (retrocompatible; habilita confirmación por volumen
  y, a futuro, VWAP/Volume Profile).
- ✅ **4 tests unitarios nuevos** → `pytest tests/test_price_action_unit.py` = **15 passed**;
  `py_compile` de price_action/stock_data/server OK. Demo: resistencia 100 + vela +2% con vol 4×
  → score 95, confirmado, liquidez alcista.
- 📚 Documentado en `DETECCION_ACCION_PRECIO_REPLICABLE.md` (§7).
- ⚠️ Corre con datos reales cuando el backend esté vivo (billing/Neon). El merge dispara deploy de
  Cloud Run que fallará por BILLING_DISABLED (esperado; el código queda en main listo).

### 2026-07-07 (6) — Módulo "Maestros del trading" (referencias + enseñanzas)
- ✅ **`masters` "Maestros del trading (sus enseñanzas)"** (getter `getTradingMasters`) en Psicología:
  8 leyendas con sus lecciones destiladas — **Jesse Livermore, Paul Tudor Jones, George Soros,
  Ed Seykota, Richard Dennis (Turtles), Van Tharp, Alexander Elder, Stan Weinstein** (muchos del
  clásico 'Market Wizards'). Hilo común: gestión de riesgo + disciplina sobre el método de entrada.
- Total **39 → 40 módulos**. i18n: **19 claves × 8 idiomas** (prefijo `mstr*`; nombres propios
  neutrales, enseñanzas traducidas). Icono `Star` (dorado).
- Verificado: build OK; smoke `?topic=masters` 0 crudas/0 errores; screenshot validado (40 módulos).

### 2026-07-07 (7) — Módulo "Maestros de los futuros"
- ✅ **`futures-masters` "Maestros de los futuros"** (getter `getFuturesMasters`) en Psicología: 6
  referentes de futuros con operativa comprobada — **Richard Donchian** (padre del trend following,
  canales/regla 4 semanas), **Larry Williams** (récord World Cup: 10.000 $ → 1.137.600 $ en 1987,
  auditado), **Bruce Kovner** ("undertrade ×3"), **Michael Marcus** (30.000 $ → ~80 M$),
  **Monroe Trout** (consistencia/drawdowns mínimos), **William Eckhardt** (mitad cuant de los Turtles).
- Total **40 → 41 módulos**. i18n: **15 claves × 8 idiomas** (prefijo `fmst*`). Icono `Target` (teal).
- Verificado: build OK; smoke `?topic=futures-masters` 0 crudas/0 errores; screenshot validado (41).

### 2026-07-07 (8) — Módulo "Cierres parciales (scaling out)"
- ✅ **`partial-exits` "Cierres parciales (salidas escalonadas)"** (getter `getPartialExits`) en la
  categoría Riesgo y capital: qué es, a favor (psicología/riesgo), **el contra-argumento honesto**
  (escalar out suele bajar la esperanza — Van Tharp), estrategia mitad+runner, en tercios,
  **la matemática en R** (0.5×1 + 0.5×3 = 2R vs 3R manteniendo) y errores comunes.
- Total **41 → 42 módulos**. i18n: **17 claves × 8 idiomas** (prefijo `pex*`). Icono `Gauge` (azul).
  Antes solo había menciones sueltas (`mgmtPartials`, `positionScaling`); ahora hay módulo dedicado.
- Verificado: build OK; smoke `?topic=partial-exits` 0 crudas/0 errores; screenshot validado (42).

### 2026-07-07 (9) — Módulo "Apertura y cierre: SL, TP y órdenes"
- ✅ **`stops-targets` "Apertura y cierre: SL, TP y órdenes"** (getter `getStopsAndTargets`) en
  Riesgo y capital: el stop en el punto de invalidación (no % cómodo), primero el stop→luego el
  tamaño, tipos de stop (fijo/ATR/estructural/trailing/temporal), stop real vs mental, dónde poner
  el TP (estructura), R:B vs % de acierto (con la fórmula de esperanza), no poner el stop en el sitio
  obvio (liquidez), tipos de orden y costes reales (market/limit/stop/OCO, slippage, gaps), y errores
  clásicos. Nota: define SL y TP por escrito ANTES de entrar.
- Total **42 → 43 módulos**. i18n: **21 claves × 8 idiomas** (prefijo `sltp*`). Icono `Target` (rosa).
- Verificado: build OK; smoke `?topic=stops-targets` 0 crudas/0 errores; screenshot validado (43).

### 2026-07-07 (10) — Módulo "Gestión de la operación en marcha"
- ✅ **`trade-mgmt` "Gestión de la operación en marcha"** (getter `getTradeManagement`) en Riesgo y
  capital: break-even, trailing stop (métodos), añadir a ganadoras/pirámide, reducir exposición,
  gestión por tiempo, ajustar ante eventos, no microgestionar y cuándo no tocar nada. Nota: la mejor
  gestión es la que ya está en tu plan.
- Total **43 → 44 módulos**. i18n: **19 claves × 8 idiomas** (prefijo `tmg*`). Icono `Activity` (sky).
- Verificado: build OK; smoke `?topic=trade-mgmt` 0 crudas/0 errores.

### 2026-07-07 (11) — Calculadora de salida parcial (R:B) en el Dashboard
- ✅ **Nueva calculadora `PartialExitCalculator.jsx`** en el Dashboard (grupo Riesgo, pestaña
  `partial-exit`, deep-link `?tab=partial-exit`). Entrada/stop/tamaño + dirección Long/Short + 3
  objetivos con % a cerrar → calcula en vivo: riesgo 1R, R y beneficio por tramo, **R de la posición**,
  % cerrado / runner abierto, y la comparativa **salida escalonada vs mantener todo** (+ "si el runner
  llega arriba"). Cálculo puro con `useMemo`, sin backend.
- i18n: **22 claves × 8 idiomas** (prefijo `pxc*`). Añadido `partial-exit` a la allowlist de `?tab=`.
- Verificado: build OK; smoke headless en `/dashboard?tab=partial-exit` → render OK, 0 claves crudas,
  0 pageerrors, y **math correcta** (defaults 100/95/100 + 105/50 110/25 120/25 → 1R/2R/4R, posición
  2.00R vs mantener 4.00R, riesgo 500). Screenshot validado.

### 2026-07-07 (12) — Simulador Pro: TP parciales (scale-out) en modo Fixed
- ✅ El **Simulador Pro** ahora soporta **TP parciales** en modo Fixed Risk: toggle + 3 tramos
  (TP% + % a cerrar) + slider "prob. de alcanzar el siguiente TP" (continuación).
- ✅ Motor (`simulatorEngine.js`): nuevo helper puro **`winPnlPartial(capital, legs, cont, rnd)`**.
  En una ganadora, el TP1 siempre se alcanza; cada TP siguiente se alcanza con prob. `cont`
  (secuencial); si no se alcanza, el resto cierra en **break-even** (modela el stop a BE tras TP1).
  Las perdedoras siguen a −SL completo. `rnd` inyectable para tests deterministas.
- Verificado: math determinista (legs 1/50,2/30,3/20; cap 100 → todo=1.70, solo TP1=0.50,
  TP1+TP2=1.10 vs TP único 2%=2.00 → parciales dan menos ganancia media, más realista). Build OK;
  smoke headless E2E (modo Fixed → toggle → config visible → ejecutar → resultados, 0 crudas,
  0 pageerrors); screenshot validado.
- i18n: **4 claves × 8 idiomas** (`simPartialTps/Hint/Note`, `simContinuation`); reutiliza
  `takeProfit`/`pxcClosePct`. Scope: modo Fixed (compound mantiene TP por fase).

### 2026-07-07 (13) — Simulador Pro: TP parciales también en modo compuesto (por fase)
- ✅ El modo **capital compuesto** ahora soporta **TP parciales por fase**: cada tarjeta de fase tiene
  su toggle + 3 tramos (TP % + % a cerrar) + prob. de continuación. El TP de cada tramo se mide en %,
  igual que el TP de la fase.
- ✅ Motor: `simulateCompound` reutiliza `winPnlPartial` cuando `phase.partialTps`; cada fase lleva
  `partialTps/legs/cont` (sembrados al activar; preservados al cambiar el nº de fases).
- Verificado: wiring determinista (fase winRate 100% + cont 100% + legs 1/50 2/30 3/20 → avgWin 17
  vs 20 sin parciales). Build OK; smoke headless E2E (compound → toggle fase 1 → config visible →
  ejecutar → resultados, 0 crudas, 0 pageerrors); screenshot validado. Sin i18n nueva (reutiliza).

### 2026-07-07 (14) — Modo demo en la landing (calculadora sin registro) [ROADMAP 8.5]
- ✅ **`LandingDemoCalculator.jsx`** (nuevo, `components/landing/`): calculadora de **tamaño de
  posición** funcional en la landing, **sin registro** — cálculo 100% cliente (useMemo, sin backend
  ni store). Saldo/riesgo%/entrada/stop → arriesgas, unidades y valor de la posición. CTA a
  `/register` ("Crea cuenta gratis, guarda cálculos y desbloquea 12 calculadoras…").
- Montada tras el hero de `LandingPage`. i18n: **13 claves × 8 idiomas** (prefijo `dcalc*`).
- Verificado: build OK; smoke headless en `/` → render, math correcta (1000/1%/100/95 → riesgo 10,
  2 unidades, valor 200), CTA a registro, 0 claves crudas, 0 pageerrors; screenshot validado.
- Cierra el ítem 8.5 del ROADMAP (probar antes de registrar) — sube conversión, **cero backend**.
- Análisis del cliente (billing off): lo construible+usable YA es frontend (demo/onboarding/i18n);
  AI-Coach+journal, preferencias cross-device e import CSV necesitan el backend vivo (billing/Neon).

### 2026-07-07 (15) — Fixes de suscripciones Stripe (fecha de fin + sync renovación)
- 🔎 **Auditoría previa** de los "3 fixes críticos" propuestos: 2 reales, 1 falsa alarma.
  - ❌ "Falta endpoint de cancelación" → **YA EXISTE**: `server.py:/subscriptions/cancel`
    (inmediata + fin de periodo) + `/subscriptions/resume`. NO se duplicó (habría chocado de ruta).
  - ✅ **change_plan_real** (`missing_apis.py`): `subscription_end` se calculaba con
    `now + días del plan` (drift). Ahora lee el **`current_period_end` real de Stripe** (con fallback).
  - ✅ **webhook `customer.subscription.updated`**: ahora sincroniza también **`subscription_end`**
    (evita que la fecha quede obsoleta tras cada renovación) + `subscription_cancel_at_period_end`.
- ➕ Mejora relacionada: los endpoints cancel/resume ahora **persisten** `subscription_cancel_at_period_end`
  en la BD (la UI puede avisar "se cancela el día X" sin llamar a Stripe).
- Nota: el webhook de suscripciones (`/webhook/stripe/subscription`) **sí** está registrado
  (`register_missing_apis` en startup). Pendiente ops: apuntar el webhook en el panel de Stripe a esa
  ruta. Email de aviso en impagos (intentos 1-2): pendiente/ofrecido (necesita SendGrid + backend vivo).
- Verificado: `py_compile missing_apis.py server.py` OK; conversión de timestamp validada; 15 tests
  de price_action pasan. Requiere backend vivo (billing) para probar el flujo real de Stripe.

### 2026-07-07 (16) — Prueba gratis de 7 días (tarjeta por adelantado)
- ✅ **Backend** (`server.py`): constante `TRIAL_PERIOD_DAYS = 7`; `_create_stripe_session` acepta
  `trial_days` y añade `subscription_data={"trial_period_days": 7}` al Checkout **solo en modo
  suscripción** (no lifetime). Checkout recoge la tarjeta por adelantado (no se pone
  `payment_method_collection='if_required'`) → cobra automático al día 8.
- ✅ **Elegibilidad** (solo clientes NUEVOS): en `create_checkout` el trial se concede si el usuario
  no es premium, no tiene `stripe_subscription_id` y no tiene `trial_used`. `_activate_paid_subscription`
  marca `trial_used=True` al activar (evita re-trial tras cancelar). `subscription_end` se autocorrige
  vía el webhook `customer.subscription.updated` (fix de la sesión 15).
- ✅ **Frontend**: `PricingPage` — badge "7 días gratis" en los planes de suscripción (no lifetime),
  botón "Empezar 7 días gratis" y línea "Sin cargo hoy. Cancela cuando quieras antes de que termine".
  `LandingPage` — nota bajo el hero. i18n: **4 claves × 8 idiomas** (`trialBadge/CtaButton/Reassure/HeroNote`).
- Verificado: `py_compile server.py` OK; build OK; smoke headless (landing hero + pricing: 3 badges en
  subs, 0 en lifetime, botón "Start 7-day free trial", reassurance, 0 crudas, 0 pageerrors); screenshot.
- ⚠️ El flujo real de Stripe (trial → cobro día 8) solo se prueba con el backend vivo (billing).

### 2026-07-09 (17) — Margex: cashback de comisiones en la tarjeta de afiliado
- ✅ **Contenido afiliado** (`RecommendedTools.jsx` → clave `partnerMargexDesc`): la tarjeta de Margex
  en la landing ahora menciona, además del bono de bienvenida de $100, el **cashback de comisiones
  hasta $10.000**. Traducido en los **8 idiomas** (es/en/de/fr/ru/zh/ja/ar). El enlace mantiene el ID
  de afiliado (`rid=44932212`) y el `rel="sponsored"`.
- Verificado: build OK; screenshot headless de la sección "Herramientas que recomendamos" con el texto
  nuevo renderizado en español.
- ⚠️ Nota: la cifra "$10.000" de Margex es una promo de cashback sobre comisiones (no dinero libre
  retirable) y puede cambiar con el tiempo; si Margex la retira o modifica, actualizar/quitar esta línea.

### 2026-07-09 (18) — Estudio del Centro de Aprendizaje + enriquecimiento para principiantes
- ✅ **Estudio** (`docs/ESTUDIO_APRENDIZAJE.md`): auditoría de los 44 módulos/6 pilares. Hallazgo
  clave: dos capas de profundidad — los módulos avanzados (añadidos tarde) son ricos, pero los
  **fundacionales que un principiante ve primero** (análisis técnico básico, tipos de orden, tipos de
  mercado) eran stubs de una línea. Roadmap + gaps (falta ruta guiada "Empieza aquí" desde 0).
- ✅ **Enriquecimiento 46 claves × 8 idiomas = 368 textos** (script line-replace, respeta paridad i18n):
  - **Batch A** — Análisis técnico: S/R, tendencias, indicadores (SMA/EMA/RSI/MACD/BB/Fib), MTF (16).
  - **Batch B** — Mecánica: órdenes market/limit/stop/stop-limit/trailing, criterios de bróker, diario (11).
  - **Batch C** — Fundamentos: tipos de mercado (forex/acciones/cripto/futuros/índices/materias/ETFs) + estilos (11).
  - **Batch D** — Coherencia del tab Fundamentos: participantes + sesiones (8).
  - Cada `desc` pasó de 1 línea a: qué es → cómo se lee/usa → umbral o ejemplo → error típico del novato.
- Verificado: los 8 ficheros i18n parsean como ESM; build de producción OK; capturas headless de
  Análisis Técnico (indicadores), Mecánica y Fundamentos (participantes) renderizando el texto nuevo,
  0 pageerrors.
- ✅ **Batch E** — Análisis fundamental (PIB, IPC, tipos, NFP, paro, calendario económico, ratios
  P/E, BPA, ingresos, dividendo): 11 claves × 8 idiomas.
- ✅ **Módulo nuevo "Empieza aquí"** (`getStartHere` + bloque en `EducationPage.jsx`): primera
  operación en 9 pasos para 0-conocimiento (largo/corto, leer una vela, bid/ask/spread, pip/tick/lote,
  apalancamiento con ejemplo, regla del 1%, tamaño de posición, colocar la orden con SL/TP y R:R 1:2,
  cerrar y anotar) + CTA a la Calculadora de Tamaño (`/dashboard?tab=position`). 24 claves nuevas × 8
  idiomas. Es la **pestaña por defecto** y el primer tema del pilar Empezar. Total academia: **45 módulos**.
- Verificado: build de producción OK; captura headless del módulo renderizando (sidebar + hero + pasos
  + CTA), 0 pageerrors. **Total sesión educativa: 57 claves enriquecidas + 24 nuevas × 8 idiomas = 648 textos.**
- ✅ **Glosario ampliado 20→60 términos** (`gl21..gl60`, 40 nuevos × 8 idiomas = 640 textos): bid, ask,
  vela, OHLC, mecha, cuerpo, temporalidad, soporte, resistencia, tendencia, rango, ruptura, pullback,
  media móvil, RSI, MACD, volumen, order book, market maker, órdenes (market/límite/stop), trailing,
  hedge, funding, liquidación, mark price, posición, nocional, equity, margen libre, swap, divergencia,
  fibonacci, ATH, FOMO, whale, backtesting, comisión, sesgo.
- ✅ **Ejemplos visuales** (`GlossaryVisual.jsx`): 20 diagramas SVG inline, sin texto localizado,
  mapeados por índice de glosario (spread, SL/TP, break-even, R:R, gap, largo, corto, vela, mecha,
  cuerpo, soporte, resistencia, tendencia, rango, ruptura, pullback, media móvil, divergencia,
  fibonacci). Se renderizan dentro de cada tarjeta cuando el término tiene diagrama.
- Verificado: build OK; captura headless del glosario (60 tarjetas, 20 SVGs, búsqueda 'vela' filtra la
  familia de velas con sus diagramas), 0 pageerrors.
- ✅ **Módulo nuevo "La paradoja: tiempo vs impacto"** (`TimeVsImpact.jsx`, pilar Psicología): compara
  en barras el **% de tiempo dedicado vs % de impacto en el resultado** por pilar (análisis 65/10,
  riesgo 20/30, psicología 15/60) + ratio "rinde por hora" (impacto÷tiempo: análisis ×0.2, riesgo ×1.5,
  psicología ×4.0). Impacto = ponderación clásica de Van K. Tharp (60/30/10, citada); tiempo ilustrativo
  (con disclaimer honesto). 16 claves i18n × 8 idiomas. **Paleta validada con la skill dataviz**
  (Tiempo #3b82f6 / Impacto #d97706: banda de luminosidad PASS, CVD ΔE 121 protan/94 tritan PASS,
  contraste PASS). Verificado: build OK, captura del módulo, 0 pageerrors. Academia: **46 módulos**.
- ✅ **Módulo nuevo "Protocolo antes de operar"** (`PreTradeProtocol.jsx`, pilar Psicología): 3
  herramientas interactivas en una:
  1. **Reglas de parada (cortacircuitos)** — capital + riesgo% + sliders (parada diaria/semanal en R,
     pérdidas seguidas, máx operaciones/día) → genera "tu reglamento" con las cifras en divisa (1R,
     diaria, semanal) calculadas en vivo (placeholders {r}/{v}/{n} vía `t()`).
  2. **Checklist pre-operación** — 8 condiciones marcables → puntuación + semáforo go/no-go
     (≥7 verde / 5-6 ámbar / ≤4 rojo).
  3. **¿Estás para operar hoy?** — 7 preguntas Sí/No → índice de estado + veredicto
     (≥6 en forma / 4-5 media máquina / ≤3 hoy no).
  Status colors (verde/ámbar/rojo) siempre con icono+etiqueta (no solo color). 54 claves i18n × 8
  idiomas. Nuevo tema en el pilar Psicología. Verificado: i18n parsea, build OK, captura + interacción
  headless (capital 5000→1R=50; checklist 6/8→ámbar; readiness 7/7→verde), 0 pageerrors.
  Academia: **47 módulos**.

### 2026-07-09 (19) — Efecto interactivo en la landing: gráfico de velas animado
- **Análisis**: la landing ya usa framer-motion (fade/slide/scale al hacer scroll) y hover en tarjetas,
  pero el **hero tenía un fondo estático** (blobs difuminados) — raro para una web de trading. Ese era
  el punto de mayor impacto para un efecto interactivo "como la página de inicio".
- ✅ **Nuevo `AnimatedHeroChart.jsx`** (`components/landing/`): capa `<canvas>` detrás del hero que
  emite un **tape de velas japonesas** en movimiento (random-walk con tendencia y mean-reversion),
  scroll continuo derecha→izquierda, relleno de área bajo los cierres, y un **crosshair que sigue el
  ratón** y resalta la vela debajo. Decorativo (`aria-hidden`, `pointer-events-none` → no bloquea los
  CTA), respeta `prefers-reduced-motion` (frame estático), theme-aware (alpha reducido en claro), con
  devicePixelRatio y ResizeObserver. Fade superior (`from-background`) para que el titular siga legible.
- Montado como primera capa del `<section>` del hero en `LandingPage.jsx`.
- Verificado: build OK; captura del hero con el gráfico animado + crosshair, titular y CTA perfectamente
  legibles, 0 pageerrors.
- ✅ **Extendido a otras zonas** (mismo lenguaje "vivo"):
  - `AnimatedHeroChart` ahora acepta props `fade` ('top'|'both') y `dim` (multiplicador de opacidad)
    para reutilizarse en distintos contextos.
  - **Pricing**: banda de velas animada detrás del encabezado "Elige tu Plan" (`fade="both"`, `dim=0.55`)
    — contenida (fade arriba y abajo) para fundirse con la rejilla de planes.
  - **Landing**: micro-interacción de *hover* en las tarjetas de activos y de funciones
    (`hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 duration-300`) — elevación + brillo.
  - Decisión de análisis: **NO** se añadió al Dashboard porque ya tiene el widget de TradingView
    (sería redundante).
  - Verificado: build OK; capturas de la banda de Pricing (con crosshair) y del hover en tarjetas, 0 pageerrors.

### 2026-07-09 (20) — Revisión de código (skill code-review) de lo añadido + fixes
- Lancé la skill **code-review** sobre el código nuevo de la sesión. Veredicto: **sin bugs graves**
  (el canvas protege la división por cero con `|| 1`, clampa `dt`, y limpia listeners/rAF; la lógica
  de las herramientas y sus veredictos es correcta). Comprobado además que **las inserciones i18n no
  crearon claves duplicadas** (las duplicadas existentes —`cmpTitle`, `ror*`, `advancedMetrics`,
  `educationCenter`— son **previas**, no de esta sesión).
- ✅ **3 defectos de calidad corregidos en `AnimatedHeroChart`**:
  1. `mouseout` (que burbujea) → **`mouseleave`** en `documentElement`: evitaba el parpadeo del crosshair
     al cruzar fronteras de elementos.
  2. `getBoundingClientRect()` en **cada frame** → `canvasLeft` cacheado en `resize()` (sin reflow por frame).
  3. Tema **`system`** se trataba como oscuro para el alpha → ahora se resuelve con `prefers-color-scheme`.
- ✅ **SEO**: los 3 módulos nuevos (start-here, time-impact, pre-trade-protocol) **no** estaban en la
  lista `TOPICS` de `gen-seo-pages.js` → añadidos. Ahora se generan **258 páginas (33 temas × 8 idiomas)**
  y el sitemap pasa a **290 URLs** (antes 266). Slugs SEO: `como-hacer-tu-primera-operacion`,
  `tiempo-vs-impacto-en-el-trading`, `protocolo-antes-de-operar`.
- Verificado: build OK; smoke del hero tras los fixes (canvas dibuja, crosshair sigue al ratón, titular
  legible, 0 pageerrors); páginas SEO nuevas presentes en los 8 idiomas.
- ⏳ Deuda previa (fuera de esta sesión): claves i18n duplicadas `cmpTitle`/`ror*`/`advancedMetrics`/
  `educationCenter` (JS se queda con la última; conviene deduplicar algún día).

### 2026-07-09 (21) — Auditoría SEO (skill mejorar-seo) + 2 fixes
- Auditoría contra el checklist. **Dominio consistente** en todo (github.io; el dominio propio sigue
  pendiente del usuario). **Sitemap servido correcto**: `gen-seo-pages.js` escribe `build/sitemap.xml`
  con 290 URLs (incl. /learn/ y /tools/); el `public/sitemap.xml` de 8 URLs es una fuente vieja que el
  build sobreescribe (no afecta a producción).
- ✅ **Fix hreflang (el de más impacto)**: `useSEO` emitía alternates `?lang=xx`, pero **la app no leía
  `?lang=`** → Google veía alternates que no servían ese idioma (hreflang roto). Añadido `LangSync` en
  `App.js`: al cargar cualquier ruta con `?lang=xx`, cambia el idioma (y marca `autoDetected` para no
  pisarlo). Ahora `/pricing?lang=de` renderiza en alemán con `<html lang=de>`. Verificado headless
  (de/fr OK, 0 pageerrors). Bonus: enlaces por idioma compartibles.
- ✅ **Fix robots.txt**: rutas con muro (`ProtectedRoute`) mal configuradas — `/performance` estaba en
  `Allow` (¡y está gateada!) y faltaban `/dashboard` y `/subscription`. Reescrito: `Disallow` a
  `/dashboard`, `/settings`, `/subscription`, `/performance`, `/admin`, y páginas de token de un solo
  uso (`/reset-password`, `/verify-email`, `/magic`) + `/api/` y pagos. Solo quedan indexables las
  públicas reales.
- Verificado: build OK (290 URLs sitemap), smoke de `?lang=`.
- ⏳ Sigue pendiente del usuario (mayor palanca SEO): comprar/conectar el dominio propio y enviar el
  sitemap a Search Console/Bing (ver `SEO_GUIDE.md`).

### 2026-07-09 (22) — Revisión de seguridad del backend (pre-lanzamiento)
- Revisión manual (la skill `security-review` no arrancó por `origin/HEAD` ambiguo; hecha a mano).
  **Veredicto: sin vulnerabilidades.** Controles verificados:
  1. **Inyección SQL**: el shim valida las claves de filtro con `_SAFE_FIELD_RE` (`^[a-zA-Z_]\w*$`) y
     parametriza TODOS los valores (`$N`); `$regex/$in/$ne` con operandos parametrizados; sort field
     validado. Nombres de tabla = colecciones internas, no input.
  2. **Webhooks de pago**: Stripe `construct_event` + OxaPay HMAC-SHA512 en tiempo constante; ambos
     rechazan firma/secreto ausente. No hay forma de conceder premium con un webhook falso.
  3. **Premium solo por pago/admin**: todos los `is_premium=True` van tras webhook verificado,
     confirmación real con Stripe (`Subscription.list status=active`), suscripción propia del usuario en
     `change_plan` (sin IDOR: `subscription_id` sale del `user_doc`, no del payload), admin (`require_admin`)
     o la cuenta demo (forzada no-admin). Sin ruta de auto-premium.
  4. **Authz admin**: `require_admin` (flag BD o `ADMIN_EMAILS`) en las 23 rutas admin de server.py y en
     todas las de `admin_routes.py` (dependencia inyectada `require_admin_dep`).
  5. **CORS**: allowlist específica (no `*`) con `allow_credentials`. **JWT**: `RuntimeError` si falta el
     secreto en prod. **Cookies**: httponly+secure+samesite=none, paths acotados. **bcrypt** rounds=12.
     **Rate limits**: registro 3/h, login 10/min, refresh 30/min. **Sin secretos hardcodeados**.
     **Sin sinks peligrosos** (eval/exec/pickle/subprocess).
- ⚠️ **Nota operativa (no es vuln, pero bloquea el lanzamiento en el dominio actual)**: `_CORS_ORIGINS`
  permite `tradingcalculatorpro.com`, pero el front sirve hoy desde `abcde-rgb.github.io`. Hasta conectar
  el dominio propio, hay que añadir el origen github.io vía la variable de entorno `CORS_ORIGINS` (o a la
  lista) o el front no podrá llamar al backend (falla en cerrado = seguro).
- ⚠️ Bajo/teórico: `$regex` de usuario llega al `~` de Postgres (POSIX, sin backtracking exponencial
  como PCRE) → riesgo ReDoS muy bajo; conviene no exponer `$regex` a input crudo en endpoints públicos.

### 2026-07-09 (23) — Cierre de sesión (skill estado-proyecto): verificación + readiness
- **Verificación obligatoria OK**: `py_compile` de los 9 módulos backend ✅; `npm run build` ✅
  (sitemap 290 URLs). Esta sesión **no tocó backend `.py`** (solo frontend, i18n, robots, App.js,
  gen-seo-pages y docs).
- **Foto de lanzamiento**: el **código está listo**. Todo lo que falta para publicar es **operativo**
  (consolas externas), no de código — ver `DEPLOY_CHECKLIST.md`: secretos de GitHub Actions
  (`REACT_APP_BACKEND_URL`, `REACT_APP_GOOGLE_CLIENT_ID`, WIF), Secret Manager (`JWT_SECRET`,
  `DATABASE_URL`, `STRIPE_API_KEY` sk_live, `STRIPE_WEBHOOK_SECRET`), infra Cloud Run + Cloud SQL,
  webhook de Stripe apuntado a `/api/webhook/stripe`, y **`CORS_ORIGINS`** con el origen actual
  (github.io) hasta conectar el dominio propio + DNS + Search Console.
- Resumen de la sesión (educación + landing + skills): estudio de Aprendizaje + 57 conceptos
  reescritos para principiantes + módulos nuevos ("Empieza aquí", "Tiempo vs impacto", "Protocolo antes
  de operar") + glosario 20→60 con 20 diagramas SVG + hero de la landing con velas animadas + banda en
  Pricing + code-review (3 fixes) + SEO (hreflang `?lang=` + robots + 3 páginas SEO nuevas) +
  security-review (sin vulnerabilidades). Todo fusionado a `main` (PRs #82–#91).

### 2026-07-09 (24) — Módulo nuevo "Order flow / lectura de cinta" (hueco nº1 del análisis v2)
- ✅ **`getOrderFlow` + `OrderFlowVisual.jsx`** (pilar Técnico avanzado, tras Smart Money): 8 apartados
  con **7 diagramas SVG** neutros de idioma — qué es el order flow, libro de órdenes (DOM), la cinta
  (time & sales) y agresores, delta de volumen (+ divergencia y delta acumulado), footprint/clústeres,
  absorción, órdenes iceberg, y punto de control (POC) + área de valor. 19 claves i18n × 8 idiomas = 152.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `order-flow-lectura-de-cinta`) → **266 páginas SEO (34
  temas × 8), sitemap 290→298 URLs**.
- Verificado: build OK; captura headless del módulo (7 SVGs renderizando, nav en su sitio, 0 pageerrors).
  Academia: **48 módulos**.
- ⏳ Del ranking de huecos v2 quedan: valorar una empresa a fondo, curva de tipos + rotación sectorial,
  opciones a fondo (vol + mecánica), MAE/MFE + correlación (rápidos, dentro de módulos existentes).

### 2026-07-09 (25) — Módulo nuevo "Valorar una empresa a fondo" (hueco nº2 del análisis v2)
- ✅ **`getCompanyValuation` + `CompanyValuationVisual.jsx`** (pilar Empezar, tras Análisis fundamental):
  10 apartados con **7 diagramas SVG** neutros de idioma — precio vs valor, cuenta de resultados
  (cascada), márgenes (embudo), flujo de caja libre (FCF vs beneficio), deuda y solidez del balance,
  ROE/ROIC, el foso (moat, castillo+foso), valoración por múltiplos (vs sector) y por DCF (flujos
  descontados), y cómo leer un informe de resultados (sorpresa + guía). 23 claves i18n × 8 idiomas = 184.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `como-valorar-una-empresa`) → **274 páginas SEO (35
  temas × 8), sitemap 298→306 URLs**.
- Verificado: build OK; captura headless del módulo (7 SVGs renderizando incl. foso y múltiplos, nav en
  el pilar Empezar, 0 pageerrors). Academia: **49 módulos**.
- ⏳ Del ranking de huecos v2 quedan: curva de tipos + rotación sectorial, opciones a fondo (vol +
  mecánica), MAE/MFE + correlación (rápidos, dentro de módulos existentes).

### 2026-07-09 (26) — Módulo nuevo "Macro: ciclo, tipos y rotación" (hueco nº3 del análisis v2)
- ✅ **`getMacro` + `MacroVisual.jsx`** (pilar Técnico avanzado, tras Análisis intermercado):
  8 apartados con **6 diagramas SVG** neutros de idioma — qué es la macro, el ciclo económico (onda
  4 fases), los tipos de interés, la curva de tipos (normal vs invertida), la inversión de la curva
  = señal de recesión (spread 10a−2a cruzando cero + banda de recesión), sectores cíclicos vs
  defensivos, la rotación sectorial (reloj) e indicadores adelantados vs retrasados. 19 claves i18n × 8 = 152.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `macro-ciclo-tipos-y-rotacion-sectorial`) → **282 páginas
  SEO (36 temas × 8), sitemap 306→314 URLs**.
- Verificado: build OK; capturas headless (6 SVGs OK incl. reloj de rotación y curva; nav en Técnico
  avanzado 0/10→0/11; 0 pageerrors). Academia: **50 módulos**.
- ⏳ Del ranking de huecos v2 quedan: opciones a fondo (vol + mecánica), MAE/MFE + correlación
  (rápidos, dentro de módulos existentes).
- ⚠️ Deploy backend (Cloud Run) sigue en rojo por **billing de GCP desactivado** (proyecto
  `tradingcalculator-495806`); el frontend (GitHub Pages) despliega OK. Bloqueo operativo del dueño.

### 2026-07-10 (27) — Fondo "Aurora" animado en páginas internas
- Revisión de fondos a 4:3/16:9/16:10/21:9: Principal y Precios ya usan el gráfico de velas animado
  (responsivo); las internas se veían planas. El dueño eligió un estilo distinto tipo **Aurora**.
- ✅ **`AuroraBackground.jsx`** (canvas de manchas de color que derivan despacio; sutil, responsivo con
  ResizeObserver, respeta `prefers-reduced-motion`, aware de tema claro/oscuro) + **`AuroraHeader.jsx`**
  (banda superior reutilizable, `pointer-events-none`, se funde con el contenido).
- ✅ Aplicado como banda-cabecera en **Aprendizaje, Sobre nosotros y Contacto** (hero con brillo suave;
  texto perfectamente legible). Descartado en Opciones/Dashboard/Performance (contenido denso tapa el
  brillo → inútil) y Legal (estructura multi-sección). Principal/Precios se quedan con el gráfico.
- Verificado: build OK; capturas headless de Aprendizaje/About/Contact a varias proporciones, 0 errores.

### 2026-07-10 (28) — Módulo nuevo "Estructura de mercado" (BOS/CHOCH/HH-HL)
- ✅ **`getMarketStructure` + `MarketStructureVisual.jsx`** (pilar Análisis técnico, tras Teoría de Dow):
  10 apartados con **10 diagramas SVG** de zigzag de precio — tendencia alcista (HH/HL), bajista (LH/LL),
  rango, BOS (ruptura de estructura), CHOCH (cambio de carácter), acumulación, distribución, retroceso
  (pullback), ruptura y retesteo, y cambio de tendencia confirmado. Patrones de comportamiento del precio
  (no chartistas). Complementa el módulo SMC (que solo tenía 1 tarjeta de estructura). 23 claves i18n × 8 = 184.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `estructura-de-mercado-bos-choch`) → **sitemap 314→322 URLs**.
- Verificado: build OK; capturas headless de los 10 SVGs (nav en Técnico 0/6→0/7; 0 pageerrors). Academia: **51 módulos**.

### 2026-07-10 (29) — Módulo nuevo "Horarios y estacionalidad" (patrones de comportamiento por hora/calendario)
- ✅ **`getSessionTiming` + `SessionTimingVisual.jsx`** (pilar Técnico avanzado, tras Order flow):
  10 apartados con **7 diagramas SVG** — las 3 sesiones (timeline 24 h), rango asiático, apertura de
  Londres, apertura de NY / Judas swing (15:30), solape Londres-NY, hora de datos US (14:30), el oro y
  sus horas (14:20/14:30/16:00), power hour (cierre 22:00), fin de semana (gap CME/lunes) y fin de
  mes/vencimientos (triple hora bruja + estacionalidad). **Todas las horas en hora de España**, enmarcado
  como *tendencias, no reglas* (aviso ±1 h por horario de verano; no es asesoramiento). 23 claves i18n × 8 = 184.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `horarios-sesiones-y-estacionalidad`) → **sitemap 322→330 URLs**.
- Verificado: build OK; capturas headless de los 7 SVGs (nav en Técnico avanzado 0/11→0/12; 0 pageerrors). Academia: **52 módulos**.

### 2026-07-11 (30) — Módulo nuevo "Trading basado en evidencia" (investigación verificada con WebSearch)
- Investigación previa con búsquedas verificadas: ESMA (74-89% de cuentas CFD pierden), estudio de day
  trading de Brasil (Chague/De-Losso/Giovannetti: 97% pierde, 0,4% gana más que un empleado de banca),
  SPIVA (89,5% de fondos pierde vs S&P 500 a 15 años; 0/22 categorías), Jegadeesh & Titman (momentum
  ~1%/mes 1965-89, 30 años out-of-sample, ~40 países), AQR 'A Century of Evidence on Trend-Following'
  (positivo TODAS las décadas 1880-2016, 67 mercados, 8/10 crisis), Barber & Odean (los más activos
  11,4% vs 17,9% del mercado; sesgo de disposición), Kelly/Thorp.
- ✅ **`getEvidenceBased` + `EvidenceVisual.jsx`** (pilar Fundamentos, tras Brokers): 10 apartados con
  **10 diagramas SVG** — números base, ley de los grandes números (convergencia al edge), esperanza
  matemática, SPIVA, factores (valor/momentum/calidad/baja vol), momentum, siglo de tendencia, tamaño
  (Kelly/riesgo fijo, 3 curvas de supervivencia), límites de riesgo de mesas, sesgo de disposición.
  Con fuentes citadas en la nota + disclaimers. 23 claves i18n × 8 = 184.
- ✅ Añadido a `gen-seo-pages.js TOPICS` (slug `trading-basado-en-evidencia`) → **sitemap 330→338 URLs**.
- Verificado: build OK; capturas headless de los 10 SVGs (nav Fundamentos 0/8→0/9; 0 pageerrors). Academia: **53 módulos**.

### 2026-07-11 (31) — Paridad i18n total: 8 idiomas a la par (cierra hueco de traducciones)
- **Petición**: "analiza la web en busca de fallos en traducciones… hazlos todos de una". Auditoría previa
  (comparación de sets de claves entre los 8 ficheros) detectó **claves sin traducir** en de/fr/ru/zh/ja/ar,
  que en runtime caían al fallback español o mostraban la clave cruda.
- **Backfill completo** con inserter genérico presence-checked (ancla `positionSizingDesc:`), por tandas
  verificables: **auth hero + sesgos de conducta + candlestick** (Harami, Marubozu, Kicker, Doji Star,
  Inverted Hammer, Hanging Man, Three Inside Up/Down, Long-Legged Doji, High Wave, Tweezers) ·
  **97 claves de patrones armónicos** (Gartley/Butterfly/Bat/Crab/Shark/Cypher alcista+bajista, ratios de
  Fibonacci, labels de filtro) · **131 de opciones** (calculadora Black-Scholes completa, futuros —
  tick/margen/valor teórico/contango-backwardation, IVR/IV percentile/skew/VIX, delta-hedging/gamma/theta/vega,
  Iron Condor/Butterfly/Calendar/Diagonal) · **28 de estrategias de day trading** (6-9: Opening Range,
  VWAP+Momentum, Mean Reversion, Multi-Timeframe).
- **Limpieza**: eliminadas 9 claves huérfanas muertas (sin `t()` en el código) que solo existían en de/fr/ru
  (`sharpeRatio`, `winLossRatio`, `winningTrades`… `horChannelName/Desc`).
- **Resultado**: los 8 ficheros con **sets de claves idénticos (4401 c/u)**; auditoría de paridad = **0 huecos**.
- Verificado: los 8 locales parsean como módulos JS; `npm run build` OK (312 páginas edu, sitemap 344 URLs);
  capturas headless en alemán de Opciones y Bildung → **0 claves crudas visibles, 0 pageerrors** (contenido
  profundo tras el gate premium, pero el mecanismo `t()` queda probado: toda clave existe en todo locale).

### 2026-07-12 (32) — Academia 53→63 módulos: se cierran TODOS los huecos de aprendizaje
- Auditoría de contenido (medición real en `tradingEducationContent.js` + `i18n/es.js`) → petición "añade
  todo lo mencionado". Ejecución completa por tandas verificables, cada una con build + paridad i18n + commit.
- ✅ **10 módulos nuevos** (getter + SVG dedicado + i18n×8 + wiring + `gen-seo-pages`): `options-income`
  (Wheel/covered call/CSP/asignación/0DTE), `options-vol` (IV/IVR/skew/term/vol crush/vega), `long-invest`
  (compuesto/DCA/indexados/dividendos), `taxes` (realizado vs latente/España IRPF/compensación + aviso
  no-asesoría), `algo-trading` (backtesting/overfitting/APIs/kill switch), `copy-trading` (due diligence/
  incentivos/realidad vs índice), `forex-deep` (sesiones/carry/DXY/drivers), `commodities` (grupos/
  estacionalidad/oro/petróleo/curva-roll), `crypto-deep` (halving/funding/liquidaciones/dominancia/on-chain/
  corr. Nasdaq — prefijo `cy` porque `cr` ya era de "Rutina diaria"), `indices` (ponderación/ES-NQ/VIX/
  triple witching/earnings).
- ✅ **2 conceptos dentro de módulos existentes:** MAE/MFE en Gestión de la operación; correlación entre
  posiciones + riesgo de secuencia de retornos en Gestión de capital.
- ✅ **Retención:** barra guiada "anterior/siguiente módulo" que recorre los 6 pilares 1→2→3; y **quizzes por
  pilar** (selector + 6 quizzes de 3 preguntas, 18 nuevas) que reemplaza el quiz único de 8 (claves viejas
  `qz1..8` eliminadas).
- Los 8 locales con **sets de claves idénticos (4585 c/u)**, paridad = 0. Build OK (sitemap 424 URLs).
  Verificado con capturas headless en **alemán sembrando usuario premium**: `options-income` con sus 6 SVGs,
  el selector de quiz por pilar (6 chips) y el botón "siguiente módulo" → **0 claves crudas, 0 pageerrors**.
  Cabecera de la Academia: **63 Module · 6 Pfade**. Detalle en [`docs/ESTUDIO_APRENDIZAJE.md`](./ESTUDIO_APRENDIZAJE.md) (cierre v3).

### 2026-07-12 (33) — Auditoría de cuenta/suscripción + 5 correcciones (auth, pagos, admin)
- Análisis completo del ciclo de vida de cuenta (registro, login, multicuenta/sesiones, borrado,
  cambio/cancelación de plan, impagos) y del panel admin. Sistema sólido; se detectaron 6 huecos y se
  corrigieron 5 (OxaPay/UI cripto aplazado a petición del usuario).
- 🔴 **Borrar cuenta ahora cancela la suscripción de Stripe** antes de eliminar (`_cancel_stripe_subscriptions_for_user`,
  best-effort, no bloquea el borrado RGPD) → deja de cobrarse a quien se da de baja. Limpieza RGPD ampliada
  a todas las colecciones con `user_id`. Aviso en el diálogo de borrado (i18n×8).
- ✅ **Verificación de email en registro**: `register` marca `email_verified=False` y envía email de
  verificación (los endpoints verify/resend ya existían). `email_verified` expuesto en /auth/me·login·
  register·refresh. Banner + botón "reenviar" en Ajustes (soft, no bloquea login).
- ✅ **2FA (TOTP) opcional** (pyotp): setup/enable/disable/verify; `/auth/login` devuelve
  `{totp_required, pending_token}` si está activo; reto de código en LoginPage; `TwoFactorCard` en Ajustes
  (activar con secreto/QR-manual, desactivar con código). 22 claves i18n×8.
- ✅ **SubscriptionPage** con `credentials:'include'` en los 5 fetch (no falla en recarga con token null).
- ✅ **Route shadowing admin resuelto**: eliminados los ~20 handlers duplicados y sombreados (código muerto)
  de `admin_routes.py` — server.py gana por orden de registro. Conservadas las rutas exclusivas + modelos.
  `admin_routes.py` 1714→1136 líneas. Verificado por inventario de rutas/modelos + py_compile.
- Verificado: `py_compile` server/admin/missing_apis OK; `npm run build` OK; paridad i18n 4609 (8 idénticos);
  TOTP probado offline (acepta código válido, rechaza incorrecto). Nota: el backend no se pudo desplegar/
  probar en vivo (facturación GCP). Todo en la PR #99. Ver `DIARIO_BUGS.md`.

### 2026-07-12 (34) — Módulos de realidad: "Verdad sobre cuentas de fondeo" + "El camino del trader"
- ✅ **Módulo nuevo `funded-truth` — "La verdad sobre las cuentas de fondeo"** (registrado ahora; se
  construyó sin entrada de sesión): getter `getFundedTruth` + `FundedTruthVisual` (14 SVGs) + i18n×8. Explica
  con detalle matemático por qué el modelo prop/"fondeo" es en su mayoría demo sin mercado regulado, las
  reglas imposibles, quién vive de la comisión (afiliados/promos), pagos denegados, la crisis de 2024, y el
  contrapunto: elegir un bróker regulado de verdad con apalancamiento y retirada reales. Pilar Fundamentos.
- ✅ **Módulo nuevo `trader-journey` — "El camino del trader: cuánto se tarda de verdad en ser rentable"**:
  getter `getTraderJourney` + `TraderJourneyVisual` (8 SVGs esquemáticos) + **19 claves i18n×8** (prefijo
  `tj`, sin colisiones) + wiring en `EducationPage` (pilar Fundamentos, tras `evidence-based`/`funded-truth`)
  + `gen-seo-pages` (slug `cuanto-se-tarda-en-ser-trader-rentable`, 8 idiomas). 8 tarjetas: las 4 etapas de
  competencia (Broadwell), el valle de la desesperación (Dunning-Kruger), la línea temporal realista
  (1-3 años, media ~2), la curva de abandono (ESMA 74-89%, Taiwán <1% Barber&Odean, Brasil 97% Chague&
  De-Losso — sin evidencia de aprendizaje), práctica deliberada vs horas de pantalla (Ericsson / mito de las
  10.000 h), los dos colchones (capital + vida), medir el proceso (adherencia/esperanza/R) no el dinero, y el
  espejismo del atajo (prop firms: pasan ~5-14%, cobran ~7%, gasto medio +4.000$). Datos contrastados en
  varias fuentes (estudios académicos, reguladores ESMA, investigación sobre adquisición de habilidades).
- Verificado: `npm run build` OK (Educación **51 temas × 8 = 408 páginas**, sitemap **440 URLs**); paridad
  i18n **4659 claves, 8 locales idénticos** (19 `tj` c/u, 0 huecos); **render headless con usuario premium
  sembrado en es y ar** → 8 tarjetas / 8 SVGs / **0 claves crudas / 0 pageerrors**; páginas SEO con títulos
  reales traducidos (es/ja/ar, incl. RTL). Trabajo en la rama `claude/stoic-mayer-04dpp2`.
