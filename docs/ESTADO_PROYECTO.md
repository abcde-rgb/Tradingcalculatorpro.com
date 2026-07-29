# 🧭 ESTADO DEL PROYECTO — TradingCalculator.Pro

> **Este es el documento vivo del proyecto.** Es la fuente de verdad sobre *qué hay*,
> *qué falta*, *qué hay que probar* y *qué hay que hacer*. Cualquier asistente (Claude)
> o persona que retome el proyecto debe **leer este archivo primero** y **actualizarlo
> al terminar** su sesión (ver § _Cómo mantener este documento_ al final).
>
> - 📅 **Última verificación real contra el código:** 2026-07-29
> - 🌿 **Rama de trabajo actual:** `claude/implement-per-docs-0maz7v`
>
> ⚠️ **Aviso de método (2026-07-27).** Las §1, §2 y §6 se habían quedado un mes
> por detrás del código mientras el registro de sesiones (§7) sí se actualizaba.
> El caso peor: §1 y §6 seguían pidiendo configurar **OxaPay** como pasarela
> cripto cuando OxaPay se retiró y hoy el código llama a **NOWPayments** — quien
> siguiera este documento se pondría a dar de alta una cuenta que la web no usa.
> Al cerrar sesión, actualiza también la cabecera y §1–§6, no sólo §7.
> - 📚 Documentos hermanos: [`ANALISIS_2026-06-25.md`](./ANALISIS_2026-06-25.md) ·
>   [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) ·
>   [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md) ·
>   [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`DIARIO_BUGS.md`](../DIARIO_BUGS.md)

---

## 1. Semáforo de lanzamiento

| Área | Estado | Nota |
|---|:--:|---|
| **Frontend build** (`npm run build`) | 🟢 | Verificado 2026-07-27: exit 0, 40 MB en `build/` (28 MB de JS, casi todo las ~744 páginas SEO estáticas), code-splitting OK |
| **Backend import + sintaxis** | 🟢 | `import server` OK → **183 rutas**; los **17** módulos compilan (2026-07-29) |
| **Tests offline** | 🟢 | `pytest tests/` → **312 passed, 74 skipped** (2026-07-29) |
| **Tests de integración** | 🟡 | Existen pero requieren `BACKEND_URL` vivo; se saltan si no |
| **Lint del frontend (ESLint)** | 🟡→🟢 | **Estaba roto**: el parser abortaba en los 283 ficheros, así que lintaba 0. Arreglado 2026-07-27 y añadido a CI → **0 errores**, 128 avisos de limpieza |
| **Seguridad (auth, pagos, admin)** | 🟢 | Auditoría sólida; sin secretos en el repo; cabeceras + CSP en las respuestas de API |
| **CSP del sitio (GitHub Pages)** | 🟠 | El HTML servido por Pages **no lleva CSP** (Pages no permite cabeceras). Ver G-10 |
| **CI backend (Cloud Run)** | 🟢 | `py_compile *.py` (antes la lista iba a mano y omitía 6 módulos) + pytest |
| **CI frontend (GitHub Pages)** | 🟢 | Workflow correcto (OAuth + analytics + 404.html) + i18n + credentials + **lint** |
| **Stripe (código)** | 🟢 | Checkout + webhooks implementados |
| **Stripe (operación)** | 🔴 | Falta verificar productos/claves en dashboard real |
| **NOWPayments / crypto (código)** | 🟢 | Invoice + IPN con HMAC-SHA512 verificado (`backend/nowpayments.py`) |
| **NOWPayments / crypto (operación)** | 🔴 | Falta API Key + IPN secret en el panel admin y registrar el callback. **OxaPay y MaxelPay ya NO existen en el código** |
| **Revolut Pay (código)** | 🟢 | `backend/revolut.py`, registrado en el checkout |
| **DNS / dominio `tradingcalculatorpro.com`** | ❓ | **Hoy se sirve en `abcde-rgb.github.io/Tradingcalculatorpro.com`** (no hay `CNAME` en `public/`). Los despliegues ya apuntan ahí; el dominio propio sigue sin usarse |
| **Secretos en GitHub + GCP** | ❓ | Verificar que están todos configurados |

> Leyenda: 🟢 listo · 🟡 funciona con condiciones · 🔴 bloquea · ❓ requiere verificación externa (ops)

---

## 2. Qué HAY (inventario verificado)

### Frontend — React 19 + CRACO + Tailwind + shadcn/ui
- **24 rutas** declaradas en `App.js` (Landing, Dashboard, Pricing, Settings, Education,
  Subscription, Options, Performance, Admin, Login, Register, Forgot/Reset password,
  Verify-email, Magic-link, Payment success/cancel, Legal, Contact, About, 404…).
- **14 calculadoras** (`components/calculators/`, contadas por fichero `.jsx`).
- **~28 componentes de opciones** (`components/options/`): cadena, payoff, griegas
  (display/panel/time-chart), IV surface, IV rank, unusual activity, market flow,
  optimizador, Kelly, AI Trade Coach, comparador, posiciones guardadas, etc.
- **Gráfico TradingView** (`components/charts/TradingViewChart.jsx`): embed iframe con
  selector de categoría/activo, favoritos, 9 temporalidades, tema y locale.
  → Detalle y límites en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).
- **~186 activos** en 6 categorías (crypto, forex, stocks, indices, commodities, futures)
  en `lib/assets.js` (los "47" de la primera versión se ampliaron el 2026-07-04).
- **i18n: 8 idiomas** (`lib/i18n/`): es, en, de, fr, ru, zh, ja, ar.
  **5327 claves por idioma, 0 huecos** (`node scripts/i18n-check.js`, verificado 2026-07-27).
- **Pagos**: Stripe + PayPal (`@paypal/react-paypal-js`) + **Revolut Pay** +
  **NOWPayments** (crypto, botón "Criptomonedas"). *No* OxaPay ni MaxelPay: ambas
  se probaron y se retiraron; no queda código de ninguna.
- **Auth**: Google OAuth + JWT con httpOnly cookies (store Zustand en memoria).
- **Analítica/SEO**: GA4 + GTM + GSC/Bing, `sitemap.xml`, `robots.txt`, `og-image`,
  `manifest.json` (PWA), hook `useSEO`.
- **Journal de trading**, alertas de precio (WebSocket), historial de cálculos.

### Backend — FastAPI + asyncpg (shim Mongo→PostgreSQL)
- **181 rutas registradas** en la app (contadas sobre `server.app.routes`, 2026-07-27).
- **16 módulos** (`backend/*.py`, 15 508 líneas en total): `server.py` (monolito,
  **7377 líneas**), `admin_routes.py` (1143), `missing_apis.py` (1075),
  `affiliate_program.py` (859), `performance.py` (694), `price_action.py` (646)
  —estructura de mercado: swings/BOS-CHoCH/S-R/FVG—, `stock_data.py` (608),
  `candle_patterns.py` (518), `options_math.py` (462), `options_optimize.py` (395),
  `referrals.py` (373), `realtime_alerts.py` (366), `market_data.py` (323),
  `timeframes.py` (273), `revolut.py` (215), `nowpayments.py` (181).
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
| G-10 | **El sitio servido por GitHub Pages no tiene CSP.** Las cabeceras de `SecurityHeadersMiddleware` sólo viajan en las respuestas de la API (Cloud Run); Pages no deja definir cabeceras, así que el HTML de la web va sin `Content-Security-Policy`, `X-Frame-Options` ni `Referrer-Policy` | 🟠 | Meta `http-equiv="Content-Security-Policy"` en `public/index.html`. Requiere enumerar todos los orígenes (TradingView, GA4/GTM, Google OAuth, Stripe, PayPal) y **verificar en navegador**: un CSP mal puesto rompe la web y el meta **no admite modo report-only** |
| G-11 | **La orden de desarrollo local documentada no puede conectar.** `init_pool` exige SSL verificado en toda conexión TCP (rama Neon), pero el `DATABASE_URL` de dev que documentan CLAUDE.md y el README apunta a un Postgres local sin SSL → `CERTIFICATE_VERIFY_FAILED` | 🟡 | Aceptar `sslmode=disable`/`?ssl=false` en la URL, o documentar el socket Unix (`?host=/var/run/postgresql`), que sí funciona |
| G-12 | **ESLint no analizaba nada** (283/283 ficheros con error de parseo) y no corría en CI. Dejó pasar a producción un `idx` no definido que reventaba la calculadora de Fibonacci | 🟠 | ✅ **Cerrado (2026-07-27)**: config arreglada, lint en CI, 0 errores. Quedan **128 avisos** de símbolos muertos como deuda de limpieza |
| G-13 | **11 tarjetas del panel admin se quedaban vacías tras recargar** (efecto con deps `[]` que disparaba `Bearer null` y nunca reintentaba) | 🟠 | ✅ **Cerrado (2026-07-27)**: hook `useAuthedLoad` compartido, que espera al token real y relanza la carga cuando llega |
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
- **NOWPayments** (crypto): ajustes `nowpayments_api_key` y `nowpayments_ipn_secret`
  en el panel admin (o sus variables de entorno), `nowpayments_sandbox` = `true`|`false`,
  y registrar el callback `…/api/webhook/nowpayments` en su dashboard. El IPN se firma con
  **HMAC-SHA512** sobre el JSON ordenado y viaja en la cabecera `x-nowpayments-sig`; el
  backend rechaza con 401 cualquier IPN sin firma válida. Probar primero en sandbox.
  Opcional: `BACKEND_PUBLIC_URL` si `request.base_url` no resuelve al host público.
  > Ojo: **OxaPay y MaxelPay ya no existen en el código.** Si un documento antiguo te
  > manda configurarlas, ese documento está caducado (ver aviso de la cabecera).
- **Revolut Pay**: credenciales del comercio para `backend/revolut.py`.
- **Google Cloud Console**: OAuth client + orígenes autorizados. El origen que hay que
  autorizar hoy es **`https://abcde-rgb.github.io`**, que es donde se sirve el frontend.
- **SendGrid**: API key + dominio remitente verificado (`alerts@tradingcalculatorpro.com`).
- **GitHub**: Secrets de Actions (ver DEPLOY_CHECKLIST) + branch protection.
- **DNS**: sólo aplica si se decide activar el dominio propio `tradingcalculatorpro.com`
  / `www`. Hoy **no está en uso**: no hay `frontend/public/CNAME` y el build se publica en
  `https://abcde-rgb.github.io/Tradingcalculatorpro.com`.

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
- ✅ **Enlaces internos entre los 3 módulos de realidad** (retención + SEO): botón "seguir leyendo" al pie de
  `funded-truth` y `evidence-based` → `trader-journey`, y de `trader-journey` → `funded-truth` (reutiliza
  `goToTopic` + scroll arriba). 3 claves i18n×8 (`xlJourneyA/B`, `xlFundedA`). Probado en headless: los 3
  botones navegan al módulo correcto, 0 pageerrors.
- Verificado: `npm run build` OK (Educación **51 temas × 8 = 408 páginas**, sitemap **440 URLs**); paridad
  i18n **4659 claves, 8 locales idénticos** (19 `tj` c/u, 0 huecos); **render headless con usuario premium
  sembrado en es y ar** → 8 tarjetas / 8 SVGs / **0 claves crudas / 0 pageerrors**; páginas SEO con títulos
  reales traducidos (es/ja/ar, incl. RTL). Trabajo en la rama `claude/stoic-mayer-04dpp2`.

### 2026-07-13 (35) — 2 módulos desde documentos del usuario (medias móviles + price action)
- El usuario subió 8 documentos propios (Word/Excel/PDF): medias móviles + RoR, gestión de riesgo y plan,
  velas japonesas, price action, teoría de Dow + estructura, simulador de riesgo (Excel), libro de
  backtesting (Excel). Auditados uno a uno vs. la web: **la mayoría ya estaba cubierto** (velas, Dow,
  estructura BOS/CHOCH, gestión de riesgo, plan imprimible, esperanza/rachas/backtesting en Probabilidad,
  RoR en las calculadoras Monte Carlo/Risk of Ruin). Se detectaron **2 huecos reales** y se construyeron:
- ✅ **Módulo `moving-averages` — "Medias móviles a fondo"** (pilar Técnico): getter `getMovingAverages` +
  `MovingAveragesVisual` (8 SVGs) + **19 claves i18n×8** (`mav`). 8 tarjetas: SMA vs EMA, elegir periodo
  (incl. Fibonacci 89/144/233), las 3 estrategias de cruce (precio/media, 2 medias, triple con filtro),
  cruce dorado/muerte (50×200), media como soporte/resistencia dinámico, y familias de indicadores. Antes
  solo había 2 líneas sueltas (indSMA/indEMA) en Análisis Técnico. Alto valor SEO.
- ✅ **Módulo `price-action` — "Price action: leer el precio sin indicadores"** (pilar Técnico): getter
  `getPriceAction` + `PriceActionVisual` (6 SVGs con velas) + **15 claves i18n×8** (`pac`). 6 tarjetas: qué
  es (el precio lo descuenta todo), **barra interior (inside bar)**, **barra exterior/madre (outside bar)**,
  leer tendencia por HH/HL, marcos altos primero (anti-overtrading), y confluencia patrón+nivel.
- Wiring en `EducationPage` (pilar Técnico: MA tras Análisis Técnico, Price action tras Velas) + 2 entradas
  en `gen-seo-pages` (`medias-moviles-sma-ema-cruces`, `price-action-barra-interior-exterior`).
- Verificado: `npm run build` OK (Educación **53 temas × 8 = 424 páginas**, sitemap **456 URLs**); paridad
  i18n **4696 claves, 8 locales idénticos** (19 `mav` + 15 `pac` c/u, 0 huecos); **render headless (premium,
  es y ar)** → MA 8 tarjetas/8 SVGs, Price action 6/6, **0 claves crudas / 0 pageerrors**. Rama
  `claude/stoic-mayer-04dpp2`.

### 2026-07-13 (36) — Contenido poco conocido, tanda A: gamma de dealers + PFOF
- El usuario pidió "contenido poco conocido". Tras investigar (WebSearch: fuentes que confirman que son de
  alto impacto pero casi nunca explicados a retail), se construyen 2 de 4 módulos de nicho:
- ✅ **Módulo `gamma-exposure` — "Posicionamiento de dealers: gamma, vanna y OPEX"** (pilar Pro, junto a
  opciones): getter `getGammaExposure` + `GammaExposureVisual` (7 SVGs) + **17 claves i18n×8** (`gex`).
  7 tarjetas: el dealer delta-neutral, GEX (gamma +/−), pinning/max pain, gamma squeeze (GME 2021), vanna
  (IV empuja el delta), charm (OPEX drift), 0DTE/OPEX. Nota honesta: es contexto probabilístico, no señal.
- ✅ **Módulo `pfof` — "Lo gratis no es gratis: PFOF y el coste real"** (pilar Fundamentos, junto a
  brokers): getter `getOrderFlowPayment` + `PfofVisual` (6 SVGs) + **15 claves i18n×8** (`pfof`). 6 tarjetas:
  "sin comisiones" no es gratis, payment for order flow (~2.500M$ en 2020), internalización (Citadel/Virtu),
  el coste invisible del spread, el conflicto de interés ("kickback", restringido en la UE), cómo protegerte.
- Wiring en `EducationPage` + 2 entradas `gen-seo-pages` (`gamma-dealers-gex-vanna-opex`,
  `pfof-brokers-sin-comisiones-coste-real`).
- Verificado: `npm run build` OK (Educación **55 temas × 8 = 440 páginas**, sitemap **472 URLs**); paridad
  i18n **4728 claves, 8 idénticos** (17 `gex` + 15 `pfof`); **render headless (premium, es y ar)** →
  Gamma 7/7, PFOF 6/6, **0 claves crudas / 0 pageerrors**. Pendiente tanda B: liquidez macro + colas gordas.

### 2026-07-13 (37) — Contenido poco conocido, tanda B: liquidez macro + colas gordas
- ✅ **Módulo `net-liquidity` — "Liquidez macro: la fontanería que mueve el mercado"** (pilar Avanzado, junto
  a Macro): getter `getNetLiquidity` + `NetLiquidityVisual` (6 SVGs) + **15 claves i18n×8** (`liq`). 6 tarjetas:
  qué es la liquidez neta (WALCL − TGA − RRP), balance de la Fed (QE/QT), la TGA del Tesoro, el repo inverso
  (RRP), la correlación ~0,95 con el S&P (desfase ~2 semanas), y el aviso "correlación ≠ causalidad".
- ✅ **Módulo `tail-risk` — "Colas gordas: por qué la campana de Gauss miente"** (pilar Riesgo): getter
  `getTailRisk` + `TailRiskVisual` (6 SVGs) + **15 claves i18n×8** (`tail`). 6 tarjetas: por qué la normal
  miente (curtosis), cisnes negros (Taleb), los "sigmas imposibles" (Lunes Negro 1987), riesgo de ruina y
  no-ergodicidad, convexidad/cobertura de cola, y la estrategia barbell.
- Wiring en `EducationPage` + 2 entradas `gen-seo-pages` (`liquidez-macro-fed-tga-repo-inverso`,
  `colas-gordas-cisnes-negros-riesgo-de-cola`).
- Verificado: `npm run build` OK (Educación **57 temas × 8 = 456 páginas**, sitemap **488 URLs**); paridad
  i18n **4758 claves, 8 idénticos**; **render headless (premium, es y ar)** → Liquidez 6/6, Colas gordas 6/6,
  **0 claves crudas / 0 pageerrors**. Con esto, los 4 módulos de "contenido poco conocido" están cerrados.

### 2026-07-14 (38) — Endurecimiento de seguridad (auditoría OWASP activa)
- ✅ **Suite de regresión de seguridad en CI** — `backend/tests/test_security_unit.py` (**41 tests, corre
  siempre** gracias al sufijo `_unit.py`). Extrae por `ast` los helpers del shim (`_SAFE_FIELD_RE`,
  `_build_where_clause`, `_serialize`) y **fuzz-testea inyección SQL**: claves maliciosas (`' OR '1'='1`,
  `; DROP TABLE`, `UNION SELECT`, …) se rechazan por el whitelist; valores peligrosos acaban **parametrizados**
  (nunca en el texto SQL). Cubre también bcrypt (salteado, no reversible) y el fix host-header (abajo).
- 🔴 **Fix host-header injection en enlaces por email** — `forgot-password` y `send-verification-email`
  construían el enlace desde `Origin`/`Referer`/`base_url` (todos manipulables por el atacante). Un atacante
  podía pedir el reset del email de una víctima con `Origin: https://evil.com`; la víctima recibía un enlace
  con el token apuntando al sitio del atacante → **robo de cuenta**. Nuevo `_trusted_link_base()` en
  `missing_apis.py`: solo devuelve el `Origin` si está en la allow-list (CORS), si no cae al `FRONTEND_URL`
  canónico; **nunca** a `base_url`. El magic-link ya era seguro (usaba `FRONTEND_URL`).
- ✅ **Dependencias con CVE actualizadas** (pip-audit encontró 58 CVEs en 5 paquetes): `PyJWT 2.9→2.13`
  (CVEs de validación `crit`, auth), `aiohttp 3.11.10→3.14.1`, `python-multipart 0.0.12→0.0.32`,
  `python-dotenv 1.0.1→1.2.2` — cierran **50 de 58**. Bumps del mismo major, verificados con resolución
  dry-run del stack completo + round-trip real de `jwt.encode/decode`.
- ⏸️ **Pendiente (requiere upgrade coordinado y testeado en staging):** `starlette 0.41.3` (8 CVEs, clase
  DoS/host-header) está fijado por `fastapi==0.115.5` (`<0.42`); subirlo exige subir FastAPI a la vez y no se
  puede validar a ciegas en sandbox (no hay runtime FastAPI/asyncpg). Riesgo mitigado: Cloud Run tiene timeout
  y `min-instances`; el fix propio de host-header cubre el vector serio. Añadido `G-` para hacerlo con test en vivo.
- Verificado: `py_compile` de los 9 módulos OK; **suite offline 104 passed / 74 skipped, 0 fallos**.
  Deploy backend sigue bloqueado por facturación GCP; los cambios entran en el repo y correrán en el pipeline
  (pytest → Docker) cuando se reactive.

### 2026-07-14 (39) — Módulo nuevo "La caja de Gann" (análisis técnico, honesto)
- ✅ **Módulo `gann-box` — "La caja de Gann: cómo se monta y se opera paso a paso"** (pilar Técnico, junto a
  Price action): getter `getGannBox` + `GannBoxVisual` (8 SVGs) + **19 claves i18n×8** (`gann`). 8 tarjetas
  centradas en la práctica que pidió el usuario: qué es y la diagonal 1×1 (equilibrio 45°), **desde qué
  máximo/mínimo se ancla** (swing low alcista / swing high bajista), **cómo se monta paso a paso** en TradingView
  + escalado a 45°, **proporciones** (0/25/50/75/100, tercios, ratios 1×1/1×2/2×1), cómo se operan los niveles,
  **direccionalidad en cierres bajo un nivel** (cierre vs mecha, fakeout, retest), **temporalidades** (marcos
  altos = niveles más fiables) y una tarjeta honesta **mito vs realidad** (sin evidencia de uso institucional;
  niveles autocumplidos como Fibonacci; el mito de los "50M" de Gann). Mantiene el E-E-A-T de un sitio YMYL.
- Wiring en `EducationPage` (icono Grid3x3) + entrada `gen-seo-pages` (`caja-de-gann-como-se-monta-y-opera`).
- Verificado: `npm run build` OK (Educación **58 temas × 8 = 464 páginas**, sitemap **496 URLs**); paridad
  i18n **4777 claves, 8 idénticos, 0 faltan/sobran**; contenido gann **bundleado en ES/EN/ZH/AR** y **8 páginas
  SEO generadas** con título/descripción localizados (comprobado ES/DE/AR-RTL). La caja de Gann no existía en la
  web antes (verificado: 0 ocurrencias de "gann" en el repo).

### 2026-07-14 (40) — "Todos": 10 módulos de TA poco conocido + ampliación (6 oleadas)
- Tras inventariar los 21 temas de TA existentes, se añaden 10 módulos nuevos de análisis técnico
  **genuinamente obscuro** (pilar Técnico/Avanzado), en tono honesto/evidence-aware y 8 idiomas:
  1. **DeMark TD Sequential** (`demark`): flip, setup 9, perfeccionado, countdown 13, uso, límites.
  2. **Ehlers DSP** (`ehlers`): Fisher Transform, MAMA/MESA, ciclo+sinewave, SuperSmoother/Roofing.
  3. **Rotación Relativa RRG** (`rrg`): ejes RS-Ratio/RS-Momentum, 4 cuadrantes, rotación horaria, colas.
  4. **Andrews' Pitchfork** (`pitchfork`): montaje desde 3 pivotes, mediana-imán, paralelas, Schiff.
  5. **Bill Williams / Chaos** (`bill-williams`): Alligator, fractales, AO, Gator/MFI, uso, límites.
  6. **Wolfe Waves** (`wolfe-waves`): estructura 5 ondas, línea 1-4 (EPA), reglas, barrido onda 5.
  7. **Market Profile / Subastas** (`market-profile`): TPO, área de valor+POC, balance inicial, POC virgen.
  8. **Sistema de Elder** (`elder`): 3 M, Triple Pantalla, Elder-Ray, Force Index, Impulse System.
  9. **Osciladores raros** (`oscillators`): Coppock, Schaff STC, Connors RSI-2, TSI.
  10. **Tiempo y ciclos** (`time-cycles`): zonas de tiempo de Fibonacci, clusters, ciclos de Hurst, FLD.
- **Ampliación**: `breadth-cycles` gana **TICK (NYSE)** y **TRIN (Arms Index)** como items nuevos.
- Cada módulo nuevo: getter + componente SVG esquemático + ~15-17 claves i18n×8 + wiring EducationPage
  (icono, const, nav, TabsContent) + entrada `gen-seo-pages`. Todos con tarjeta honesta de límites.
- Verificado por oleada: `npm run build` OK (Educación **68 temas × 8 = 544 páginas**, sitemap **576 URLs**);
  paridad i18n **4939 claves idénticas en los 8 idiomas, 0 faltan/sobran**; contenido bundleado y páginas
  SEO generadas con títulos localizados. Subido a la rama en 6 commits (oleadas) + fusión final a `main`.

### 2026-07-16 (41) — Pasarelas de pago (Revolut + NOWPayments), legal ×8, responsive, SEO de calculadoras
- **SEO de calculadoras ×8 idiomas**: `gen-seo-pages` gana el mapa `CALC_I18N` (de/fr/ru/zh/ja/ar para 12
  calculadoras) y el loop de calc itera los 8 idiomas → **96 páginas de calc + 560 de educación**, sitemap
  **664 URLs**. Cierra el hueco de que las calculadoras solo tenían SEO en es/en.
- **Revisión responsive integral (tarea #66)**: se compacta la fila de estrategias de Opciones (ya no ocupa
  toda la pantalla), `overflow-x:clip` en html/body, fix de flex RTL (`:not(.flex-col)`), y ajustes en
  `StrategyBar`, `CalculatorPage`, `OptionsSubHeader`, `StatsKPIBar`, `PerformancePage`, `index.css`.
- **Legal en 8 idiomas (tarea #67)**: contenido por locale en `lib/legalContent/{8}.js` (Privacidad,
  Términos, Cookies, Riesgo) + `LegalPage.jsx` data-driven con renderer de texto enriquecido
  (**negrita**, enlaces, {email}, {terms}). Correcciones factuales: entidad **LLC de EE. UU.** (el usuario
  aclaró que la empresa está registrada en EE. UU., no en Suiza), procesadores de pago reales, cookies
  reales, mención a Anthropic, prueba de 7 días.
- **Revolut Pay**: módulo `backend/revolut.py` (Merchant API, webhook HMAC-SHA256 sobre `v1.<ts>.<body>`) +
  wiring en `server.py` (settings ×4, rama de checkout, webhook verificado) + grupo conector en AdminPage +
  método en PricingPage + i18n ×8 + test unitario. Subido a `main`.
- **NOWPayments (cripto)**: módulo `backend/nowpayments.py` (invoice + IPN HMAC-SHA512 sobre JSON ordenado y
  compacto) con el mismo patrón de wiring; concede N días por factura pagada (`_activate_paid_subscription`,
  reclamo atómico idempotente). Test unitario de 8 casos de firma IPN. Subido a `main`.
- **Retirada de OxaPay**: se elimina por completo (`oxapay.py` + test borrados, rama de checkout, webhook y
  settings ×4 en `server.py`, grupo en AdminPage, método en PricingPage, OxaPay→NOWPayments en legal ×8),
  dejando solo **NOWPayments + Revolut** como alternativas a Stripe/PayPal.
- Verificado: paridad i18n **4993 claves idénticas en 8 idiomas, 0 faltan/sobran**; `npm run build` exit 0;
  `pytest` 17 passed / 15 skipped (`test_nowpayments_unit`, `test_revolut_unit`, `test_stripe_payments`);
  py_compile OK. Deploy de GitHub Pages en verde. **Nota operativa**: cripto/pagos no cobrarán hasta que se
  reactive el backend (Cloud Run) y se carguen las claves reales de NOWPayments/Revolut en admin.

### 2026-07-17 (42) — Diseño del Programa de Afiliados (solo documento, sin código)
- 📄 **Nuevo doc [`PROGRAMA_AFILIADOS.md`](./PROGRAMA_AFILIADOS.md)**: diseño técnico para pagar a
  socios/afiliados **dinero real, mensual y recurrente** según cuántos **suscriptores de pago activos**
  traigan. Reglas decididas por el propietario: cuenta **solo de pago activos**, fórmula **por
  bloques de 1000 con suelo en 1000** (el pago empieza en 1000 activos y sube de 1000 en 1000:
  `⌊activos/1000⌋ × 1000 €/mes`; <1000 activos → 0 €). Configurable vía `affiliate_block_size` /
  `affiliate_block_reward_eur`.
- 🔎 **Auditoría del repo**: ~60 % de la fontanería ya existe y se recicla — `referrals.py` (atribución
  `referred_by_id`, código/link `/?ref=`), suscripciones Stripe (`SUBSCRIPTION_PLANS` en `server.py:1054`,
  webhooks de ciclo de vida `server.py:3843`, refund→revoca premium). **NO existe** (confirmado): pagos
  SALIENTES (Stripe Connect/Transfers/Payouts), contabilidad recurrente por activo, ni rol de afiliado.
- 🧱 El diseño define: colecciones `affiliates` / `affiliate_payout_runs` / `affiliate_payout_lines`,
  contabilidad mensual por **snapshot** de activos, endpoints admin+afiliado, antifraude, gating legal/fiscal
  (contrato, IRPF/349, KYC) y un plan en 3 fases (**Fase 1 = MVP semi-manual** recomendada primero).
- ✅ **Lifetime decidido**: bonus **único de 50 €** por cada referido lifetime (excluido del recuento
  por bloques, pagado una sola vez). El umbral mínimo queda resuelto por el propio modelo de bloques.
- ✅ **Organización del panel (§8bis)**: sección "Afiliados" **separada** de la lista general de
  clientes; segmentación con/sin referidos; ficha por afiliado con **sus** referidos; orden/agrupación
  **de 1000 en 1000** (por bloques). Todo derivado en vivo de `referred_by_id` + suscripciones.
- ⚠️ **Estado real del lado afiliado (verificado en código)**: el usuario que refiere **hoy NO puede
  ver sus referidos** — existe el endpoint backend `GET /referrals/me` pero **no está conectado a
  ninguna página** (`App.js` sin ruta de referidos; en UI solo el leaderboard de admin y los
  "Affiliate Partners" salientes de la landing). El diseño añade el **panel self-service del afiliado**
  (`GET /affiliate/me`, Fase 1) con lista **enmascarada** (GDPR): estado/plan/fecha sí, email no.
- ⏳ **Decisiones abiertas** antes de codificar (§7 del doc): si cuentan los *trialing* (rec.: no) y
  método de cobro de Fase 1 (banco/PayPal manual).

### 2026-07-17 (43) — Programa de Afiliados: Fase 1 IMPLEMENTADA (backend + frontend + admin)
- ✅ **Backend `affiliate_program.py`** (14 rutas, registrado en `server.py`): alta/aprobación de
  afiliados, panel self-service (`/affiliate/me`), liquidación mensual por **bloques de 1000 con suelo
  en 1000** (`⌊activos/1000⌋ × 1000 €`) + **bonus lifetime único de 50 €** (sellado al finalizar →
  idempotente), export CSV y marcar pagado. Solo cuentan **suscriptores de pago activos** (excluye
  gratis, trials y lifetime del recuento de bloques). Tablas nuevas: `affiliates`,
  `affiliate_payout_runs`, `affiliate_payout_lines`.
- ✅ **`referrals.py`**: `credit_referrer_for_payment` **omite el wallet del 10 %** si el referente es
  afiliado aprobado (evita doble pago).
- ✅ **Frontend `AffiliatePage.jsx`** (ruta `/affiliate`, **enlace en el menú de usuario** junto a
  Cerrar sesión): formulario de alta + panel con link, registrados, activos, bloques, € del mes,
  lifetime, total cobrado, **lista de referidos ENMASCARADA** (GDPR) e histórico de cobros.
- ✅ **AdminPage**: sección **"Afiliados"** SEPARADA de la lista de clientes (segmentación con/sin
  referidos, orden por activos/bloques/importe, ficha por afiliado con sus referidos) + **"Liquidación
  de afiliados"** (generar mes, finalizar, marcar pagado, CSV).
- ✅ **i18n**: 46 claves `aff*` × 8 idiomas (es real, en/otros en inglés como seed → **pendiente
  localización** de de/fr/ru/zh/ja/ar). `i18n-check`: **5039 claves, 0 faltan/0 sobran**.
- ✅ **Verificado**: `pytest` **109 passed / 74 skipped** (8 tests nuevos de afiliados); `import server`
  OK (**174 rutas**); `npm run build` exit 0 (664 URLs sitemap); **smoke E2E contra PostgreSQL real**:
  1000 activos→1 bloque→1000 € + 2 lifetime×50 = 1100 €; finalize sella 2 bonus; mes siguiente bonus 0
  (idempotente); wallet omitido para afiliado; mark-paid OK.
- ⚠️ **Decisión aplicada por defecto** (a confirmar): los *trials* **no** cuentan (solo tras cobro real).
- ⏳ **Pendiente (ops)**: fusionar a `main`, aprobar afiliados y hacer los pagos manualmente. Fase 2
  (Cloud Scheduler + **Stripe Connect** payouts automáticos) no implementada.

### 2026-07-17 (44) — Afiliados: traducciones ×8 + botón "Solicitar pago" + notificación admin
- ✅ **i18n completa**: las **51 claves `aff*` traducidas de verdad en los 8 idiomas** (es/en/de/fr/ru/
  zh/ja/ar), sin seed en inglés. `i18n-check`: **5044 claves, 0 faltan/0 sobran** en los 8.
- ✅ **Botón "Solicitar pago"** en el panel del afiliado (`AffiliatePage`): el afiliado pide el pago de
  su saldo acumulado → `POST /affiliate/request-payout` (una solicitud abierta a la vez; refleja
  estado "pendiente"). `/affiliate/me` devuelve `open_request`.
- ✅ **Notificación en el admin**: nueva tabla `affiliate_payout_requests` + endpoints
  `GET /admin/affiliates/payout-requests`, `.../{id}/mark-paid`, `.../{id}/reject`. En `AdminPage`,
  tarjeta de aviso **que aparece arriba + toast** al cargar si hay solicitudes pendientes (con importe,
  activos, bloques y botones pagar/rechazar). Backend pasa a **18 rutas de afiliados**.
- ✅ **Verificado**: `import server` OK (**178 rutas** totales); `npm run build` exit 0; `pytest`
  afiliados 8/8; **smoke E2E** ampliado contra PostgreSQL real: solicitar pago → 1000 €, `open_request`
  presente, duplicado bloqueado, notificación admin (pendientes=1), marcar pagada → pendientes=0.

### 2026-07-17 (45) — Requisito: afiliado debe ser suscriptor de PAGO (no en la prueba)
- ✅ **Solo suscriptores de pago pueden ser afiliados** (no durante la prueba de 7 días). Backend:
  helper `_is_paying_member` (excluye `trialing`; lifetime y de pago activo sí); `POST /affiliate/apply`
  devuelve **403** si no paga; `/affiliate/me` expone `eligible`.
- ✅ **Frontend**: la opción "Programa de afiliados" del menú **solo aparece para suscriptores de pago**
  (`is_premium && subscription_status !== 'trialing'`); `AffiliatePage` muestra un aviso con CTA a
  planes si no es elegible. `/auth/me` y las respuestas de login ahora incluyen `subscription_status`.
- ✅ i18n: +3 claves (`affNeedPaidTitle/affNeedPaid/affGoPremium`) ×8 → **5047 claves, 0 huecos**.
- ✅ **Verificado**: 9 tests afiliados; import 178 rutas; build exit 0; smoke E2E: gratis→403,
  trial→403, de pago→alta OK, `eligible=False` para gratis/trial.

### 2026-07-17 (46) — Atribución de referidos (captura ?ref + tracking) + compartir mejorado
- 🐛 **Hueco crítico corregido**: el frontend **nunca capturaba `?ref=` ni llamaba a `/referrals/track`**
  al registrarse → NADIE quedaba atribuido (todo el sistema de afiliados/referidos era inerte).
  - `App.js`: componente **`RefCapture`** guarda el código de `?ref=CODE` en localStorage al aterrizar.
  - `store.js`: helper **`trackReferral(email)`** (POST `/referrals/track`) tras alta por **email**
    (siempre) y por **Google** (solo si `is_new_user`, para no atribuir logins de usuarios existentes).
  - `server.py`: `/auth/google` ahora devuelve **`is_new_user`**.
- ✅ **Compartir mejorado** en `AffiliatePage`: **código visible** + copiar, enlace + copiar, y botones
  de **WhatsApp / Telegram / Email / X / compartir nativo** con mensaje prehecho.
- ✅ i18n: +8 claves de compartir ×8 (`affYourCode`, `affShareNative`, `affShareHelp`, `affShareText`,
  `affShareEmailSubject`, +requisito) → **5052 claves, 0 huecos**.
- ✅ **Verificado**: import 178 rutas; `npm run build` exit 0; **smoke E2E cadena de atribución** contra
  PostgreSQL real: `?ref` → track → referido vinculado (`referred_by_id`) → cuenta para el afiliado
  (registrado + activo), idempotente. `#115` ya estaba en `main`; este trabajo va en **PR nuevo**.

### 2026-07-21 (57) — Retención de datos: guardar 3 meses tras impago y purgar automáticamente
- **Petición**: al dejar de pagar, guardar los datos al menos 3 meses y luego borrarlos solos.
- ✅ **Marca de lapso** `premium_lapsed_at`: se pone al revocar premium (sync de expiración en
  `/auth/me`, webhook `subscription.deleted`, `payment_failed` 3×, `subscription.updated` inactivo).
  Helper `_lapse_stamp` **conserva el reloj** si ya había lapso (no reinicia los 3 meses ante eventos
  repetidos). `_activate_paid_subscription` y `subscription.updated` activo la **limpian** (`None`).
- ✅ **Purga** `purge_lapsed_user_data(db)` en el arranque (junto a las purgas de revoked_tokens/
  usage_events): borra los **datos de trading** (`trades, calculations, alerts, saved_positions,
  portfolio, user_states, journal_entries`) de quienes llevan **> DATA_RETENTION_DAYS (90, configurable
  por env)** sin pago. **Conserva la cuenta** (para que puedan volver a suscribirse). Candidatos por
  `premium_lapsed_at` **o** `subscription_end` antiguos (cubre expiración silenciosa). Excluye
  lifetime y a quien vuelva a ser premium. Idempotente (marca `data_purged_at`).
- ✅ **Verificado**: 7 tests unitarios offline (purga >90d, conserva <90d, renovado, lifetime,
  expiración silenciosa, idempotencia, `_lapse_stamp`) → `pytest` **124 passed**. **E2E contra
  Postgres real 8/8**: caducado>90d y silent>90d borrados; <90d/renovado/lifetime conservados;
  2ª purga idempotente; marca puesta.
- ⚠️ Decisión aplicada: se borran los **datos** (diario, cálculos…), **no la cuenta** — así el
  cliente puede reactivar. Si se quisiera borrar la cuenta entera, es otra decisión. La purga corre
  en cada arranque (mismo patrón que las purgas existentes); con `min-instances=1` conviene un
  Cloud Scheduler para garantizarla a diario (pendiente ops).

### 2026-07-21 (56) — Muro de pago DURO: sin suscripción activa, sin acceso a la app
- **Petición**: que un cliente que no paga no tenga acceso a nada de la web (app).
- ✅ **Backend** (`server.py`): nueva dependencia **`require_premium`** (auth + `check_premium`;
  403 "Suscripción requerida" si no premium). Aplicada a **12 endpoints de producto**: diario
  `/journal/trades` (CRUD+stats) y `/performance/trades` (CRUD, bulk, get, analytics). El trial de
  7 días y la cuenta demo cuentan como premium; caducado/gratis → 403.
- ✅ **Frontend**: `ProtectedRoute` gana `premiumOnly` → redirige a `/pricing` (con `state.gated`)
  a usuarios logueados sin suscripción; **los admin conservan acceso**. Aplicado a `/dashboard` y
  `/performance` (`/options` ya tenía su propio muro). Aviso amarillo en Pricing ("Tu suscripción no
  está activa…", clave `gatedNotice` ×8 idiomas, 5077 claves 0 huecos).
- ⚠️ **Se dejan accesibles a propósito**: `/pricing`, `/subscription`, `/settings` (para poder
  pagar/gestionar), `/login`, `/register`, legales y el **contenido público** (landing, educación —
  activo SEO). Un caducado puede autenticarse para renovar (`/auth/me` sigue 200 con is_premium=False).
- ✅ **E2E backend vivo 6/6**: gratis→403, caducado→403, de pago→200, trial→200, lifetime→200,
  caducado puede /auth/me. **Captura UI**: `gate.expired` intenta Dashboard → redirigido a Precios
  con el aviso. Build OK.

### 2026-07-21 (55) — Diario/Performance: operaciones de OPCIONES + selector de TODOS los activos
- **Petición**: que el diario acepte operaciones de opciones y todos los activos.
- ✅ **Backend** (`server.py` `TradeIn` + `performance.py`): nuevo `instrument_type` (`spot`|`option`),
  `option_type` (`call`|`put`), `strike`, `expiry`, `multiplier`. `compute_trade_pnl` multiplica el
  nominal y el riesgo por `multiplier` (100 en opciones sobre acciones); `spot` mantiene `multiplier=1`
  (retrocompatible con los trades existentes). `make_trade_doc` persiste los campos.
- ✅ **Frontend** (`TradeFormModal`): toggle **Spot/Opción**; el símbolo pasa de input plano al
  **`UniversalAssetSearch`** (cripto/acciones/ETFs/índices/forex/materias — con override manual para
  cualquier símbolo). En modo opción: Call/Put, Strike, Vencimiento, Multiplicador, y las etiquetas
  cambian a Compra/Venta · Prima entrada/salida · Contratos. P&L y R:R en vivo con multiplier.
- ✅ **6 tests unitarios** de PnL de opciones (long call 340, short put 150, R-múltiplo escalado,
  spot=1, persistencia de campos) → `test_performance_unit` 13 passed. **17 claves i18n × 8 idiomas**
  (`trade*`, paridad 5076, 0 huecos).
- ✅ **E2E contra backend vivo**: long call cerrada (3×(3.20−1.50)×100−6 = **504 €**), short put
  (2×(2.00−0.60)×100 = **280 €**), spot retrocompat (**100**), aparece en el diario, analytics suma
  (**total 1424**), editar recalcula (**1044**). Captura UI del formulario en modo opción validada.

### 2026-07-21 (54) — BUG-014: el panel admin crasheaba entero con datos reales (fix + capturas UI)
- Al capturar por primera vez la **UI del admin contra backend vivo** (frontend build apuntando al
  uvicorn local + PostgreSQL sembrado), el AdminPage moría con la pantalla del ErrorBoundary
  ("Algo salió mal"). **React #31**: `PlanDistributionCard` hacía `Object.entries(metrics.by_plan)`
  pero el backend devuelve `by_plan` como **LISTA** `[{plan, count}]` → los objetos acababan como
  hijos de React. Crasheaba en cuanto existía UN usuario con plan (o sea: siempre en producción real).
- ✅ Fix: normalización que acepta lista (shape real) y dict (compatibilidad). `by_locale` revisado:
  usa `.length`, OK con lista.
- ✅ Capturas UI reales verificadas: panel del afiliado (código+link, 1005 registrados / 1000
  activos / 1 bloque / 1000 € / botón Solicitar pago, lista enmascarada) y admin (sección Afiliados
  con la fila del afiliado approved + Liquidación). Login real vía UI (token en memoria, sin reload).
- Lección para el plan de test: el E2E a nivel API (18/18) no cubre el RENDER; añadir smoke de UI
  admin con datos sembrados a la checklist pre-lanzamiento.

### 2026-07-21 (53) — Figuras XABCD para los 11 patrones ARMÓNICOS (cierra hueco de sesión 51)
- ✅ **`HarmonicPatternFigure.jsx`**: zigzag X-A-B-C-D en código para los 11 armónicos
  (Gartley/Butterfly/Bat/Crab/Cypher alcista+bajista + Shark con etiquetas O-X-A-B-C):
  pivotes etiquetados (letras universales, 0 claves i18n), los 2 triángulos clásicos XAB/BCD con
  relleno suave, punto D coloreado + flecha de la reversión esperada. Bajistas por espejo vertical.
  Insertado en cada tarjeta de la pestaña Harmonic Patterns (que no tenía figura ninguna).
- Verificado: build OK; smoke headless premium — 11/11 figuras renderizan, 0 pageerrors; captura
  validada (Gartley alcista en "M" y bajista en "W" de libro).

### 2026-07-21 (52) — Patrones chartistas en VELAS JAPONESAS + tarjeta "simétricos vs distendidos"
- **Petición**: al clicar un patrón, verlo en velas japonesas (las tarjetas se quedan en líneas);
  añadir la explicación de patrones simétricos vs distendidos (ensanchados).
- ✅ **`ChartPatternCandleFigure`** (en `ChartPatternFigure.jsx`): motor que SINTETIZA velas OHLC
  a partir del trazado de línea de cada patrón — muestrea la polilínea (~21 velas), cada vela abre
  en el cierre anterior, mechas pequeñas deterministas (noise sembrado por patternId → sin parpadeo
  entre renders), color verde/rojo por dirección. **Los 42 patrones tienen versión en velas sin
  dibujar un solo plano a mano.** El modal de detalle muestra la versión en velas como protagonista
  + la de línea (estructura) debajo.
- ✅ **`SymVsBroadeningCard`**: tarjeta educativa al inicio de la pestaña Chart Patterns —
  simétricos/convergentes (volatilidad comprimiéndose: triángulos/cuñas/banderines, ruptura limpia,
  stop cercano) vs distendidos/ensanchados (megáfonos: volatilidad creciente, barridas, menos
  fiables, reducir tamaño), con 2 SVG comparativos + regla rápida. **7 claves i18n × 8 idiomas**
  (prefijo `svb`, traducciones reales) → paridad **5059 claves, 0 huecos**.
- Verificado: build OK; smoke headless premium — tarjeta renderiza, modales HCH/taza/bandera con
  velas (21 cuerpos) + línea, 0 pageerrors; capturas validadas (HCH en velas claramente reconocible).

### 2026-07-19 (51) — Patrones chartistas EN CÓDIGO (42 SVG) + verificación admin E2E 18/18
- **Petición**: revisar que todo funciona (admin, afiliados…), detectar huecos, y hacer los
  patrones chartistas (HCH, HCHi…) "en formato gráfico con código".
- ✅ **Nuevo `ChartPatternFigure.jsx`**: diagramas SVG en código para los **42 patrones chartistas**
  de `getChartPatterns` (HCH/HCHi, dobles/triples, cuñas, ensanchamientos, diamantes, V, redondeos,
  triángulos, banderas/banderines, canales, taza con asa). Espacio lógico 100×60, colores del
  proyecto (#22c55e/#ef4444/#94a3b8), directrices/necklines discontinuas, tramo de ruptura
  coloreado + flecha; variantes bajistas derivadas por espejo vertical. **Neutrales de idioma**
  (0 claves i18n nuevas). Integrado en `PatternCard` (mini-figura) y `PatternDetailModal`
  (figura grande **preferida sobre el PNG externo**).
- 🔥 **Se retira de la UI la dependencia de `customer-assets.emergentagent.com`** (residuo
  Emergent): los 28 PNG externos de patrones ya no se muestran (quedan como fallback muerto en
  data). Los diagramas funcionan offline, nítidos a cualquier tamaño y aware del tema.
- ✅ **Verificación admin E2E 18/18** (backend vivo + PostgreSQL): login, guarda no-admin (403),
  métricas (1009 usuarios seed, MRR), buscador `?q=`, PATCH usuario, feature flags GET+toggle,
  usage-heatmap, audit-log, settings, revenue, impersonación (normal OK / admin prohibido 403),
  cupones crear+toggle.
- ✅ Verificación obligatoria: `pytest` offline **111 passed**; build OK; i18n **5052 claves,
  0 huecos**; smoke headless premium: **42/42 figuras** en tarjetas, modales (HCH/taza/bandera)
  con SVG grande, 0 pageerrors; capturas validadas visualmente.
- 🔎 **Huecos detectados** (para backlog): (1) import de operaciones CSV/broker al diario — mayor
  gap vs journals comerciales; (2) los 6 patrones ARMÓNICOS (Gartley/Butterfly/Bat/Crab/Shark/
  Cypher) sin figura propia — extensión natural del nuevo componente (XABCD); (3) velas: solo
  28/≈30+ con blueprint; (4) BUG-007 (prefs cross-device) y G-05 (layouts TV) siguen abiertos.

### 2026-07-19 (50) — Auditoría E2E de afiliados: BUG-013 (route shadowing) encontrado y corregido
- **Petición**: "¿algo sin integrar de PRs antiguos? revisa si los afiliados funcionan bien".
- 🔎 **PRs pendientes**: #117 "Acceso libre (comp) + repo limpio de Google Cloud" (de otra sesión;
  decisión del dueño pendiente — elimina el auto-deploy del backend) + 15 de Dependabot (#100-#114).
- ✅ **Verificación con backend VIVO** (PostgreSQL 16 local + uvicorn, primera vez desde julio):
  suite offline **111 passed**; integración con backend vivo **148 passed** (los ~31 restantes son
  entorno: sin STRIPE_API_KEY, sin salida a internet para yfinance/IA, rate limits por diseño, y
  varios tests leen `REACT_APP_BACKEND_URL` con fallback a la URL muerta de Emergent).
- ✅ **E2E de afiliados 24/24** (script con siembra por el shim real + HTTP): gating trial→403,
  alta→aprobación admin, `/affiliate/me` (1004 registrados / 1000 activos: excluye lifetime, trial
  y caducado), atribución `?ref`→track idempotente, liquidación 2026-07 = **1100 €** (bloque 1000 +
  2 lifetime × 50), finalize sella bonus (mes siguiente 1000 €), solicitar pago (no duplica),
  notificación admin y marcar pagada.
- 🔴 **BUG-013 encontrado y corregido**: `GET /admin/affiliates/{aid}` estaba declarada ANTES que
  las rutas estáticas → FastAPI trataba `payout-requests`/`payout-runs` como un `aid` → **404** en
  la notificación de solicitudes de pago y el listado de liquidaciones del admin. Fix: la ruta
  dinámica se registra al final del módulo (`router.get(...)(fn)`) + **test de regresión** del
  orden de rutas (`test_admin_static_routes_before_dynamic_aid`). Ver DIARIO_BUGS.md.

### 2026-07-19 (49) — Pricing: el gráfico animado igualado de verdad al de la portada
- 🐛 Tras el full-bleed (sesión 48), el dueño reportó que Pricing se veía «desfigurado» vs la
  portada. Dos causas: (1) `fade="both"` + `dim=0.55` velaban casi todo el canvas (fundidos
  solapados 2/3 arriba + 1/2 abajo); (2) `AnimatedHeroChart` ajusta TODO el rango de precios a la
  altura del contenedor → en una banda baja las velas quedaban como rayitas.
- ✅ **Fix 1** (`PricingPage`): mismo tratamiento que la landing — `<AnimatedHeroChart />` a
  intensidad completa con fade solo arriba + overlay `from-primary/5`; banda más alta
  (`py-12 md:py-16`).
- ✅ **Fix 2** (`AnimatedHeroChart`): escala mínima de 8 px por unidad de precio, centrada en el
  rango (lo que sobra se recorta por los bordes, como un gráfico real). En contenedores altos
  (landing) no cambia nada (fitScale > mínimo).
- ✅ Verificado: build OK; screenshots landing vs pricing comparados (velas del mismo tamaño,
  título legible); smoke 11/11 sin regresiones (full-bleed x=0 w=1280, idiomas, demo calc).

### 2026-07-19 (48) — 3 fixes de UI reportados por el dueño (footer idiomas, pricing full-bleed, demo calc)
- 🐛 **Selector de idiomas del Footer estaba MUERTO**: el botón del globo (`Footer.jsx`) no tenía
  menú — no abría nada ni con sesión ni sin ella (el único selector real estaba en el Header).
  **Fix**: DropdownMenu real con las 8 banderas + nombres (`languages` de i18n), `setLocale` al
  clic, resaltado del idioma activo, `side="top"` (abre hacia arriba), testid
  `footer-language-toggle`. Bonus: el selector móvil del Header ahora también resalta el idioma activo.
- 🐛 **Pricing: la banda de velas animada no llenaba el ancho** (estaba contenida en `max-w-6xl`
  + `rounded-2xl`). **Fix**: reestructurado el header de `PricingPage` como `<section>` full-bleed
  (mismo tratamiento borde-a-borde que el hero de la landing); el resto del contenido conserva su
  contenedor `max-w-6xl px-4`. Verificado: canvas x=0, width=1280/1280.
- 🐛 **La calculadora demo de la landing aparecía también con sesión iniciada** (era para probar
  antes de registrarse). **Fix**: `{!isAuthenticated && <LandingDemoCalculator />}`.
- ✅ Verificado: `npm run build` exit 0 (sitemap 664 URLs); smoke headless Playwright (11/11):
  demo visible sin sesión y oculta con sesión; footer abre 8 idiomas en ambos estados y el clic en
  Deutsch cambia `html lang=de` + textos; canvas de Pricing a ancho completo con título legible;
  0 pageerrors. Screenshot de Pricing validado.

### 2026-07-19 (47) — Análisis de competencia (solo documento, sin código)
- 📄 **Nuevo doc [`ANALISIS_COMPETENCIA_2026-07-19.md`](./ANALISIS_COMPETENCIA_2026-07-19.md)**:
  respuesta a «¿alguien de la competencia ofrece todo lo mío mejor que yo?». **Veredicto: nadie
  ofrece el bundle completo** (calculadoras pro + opciones + diario con sesgos + academia 68×8 +
  escáner de estructura + IA) y menos a 17 €/mes; pero **cada vertical suelta tiene un especialista
  superior**: TradeZella ($24-49/mes, auto-import 500+ brokers, replay, backtesting) gana en journal;
  OptionStrat ($40-100/mes, flow en vivo) gana en opciones con datos reales; los gratuitos
  (Myfxbook/BabyPips/CalcuTrader) ganan en fricción cero; BabyPips gana en autoridad SEO.
- 🎯 Acciones derivadas (por impacto): (1) import CSV/auto de operaciones al diario — mayor gap
  objetivo; (2) dominio propio (ya era la palanca nº1); (3) marketing del bundle vs 65-150 $/mes de
  la suma de especialistas; (4) doblar en español/LATAM (frente vacío); (5) NO perseguir flow en vivo.
- Sin cambios de código. Investigación con WebSearch (precios/features julio 2026, fuentes en el doc).

### 2026-07-26 (58) — Examen final 100%: auditoría integral + ola 1 de mejoras
- 📄 **Nuevo doc [`EXAMEN_FINAL_2026-07-26.md`](./EXAMEN_FINAL_2026-07-26.md)**: auditoría punto por punto
  (inventario real verificado contra el código, 10 fallos con severidad, ~45 mejoras con IDs, mapa de
  cobertura de los 4 PDF aportados, plan por olas y acciones que solo puede hacer el propietario).
- 🔴 **BUG-015 (F-01) — rate limiting con la IP del proxy.** `get_remote_address` devolvía la IP del
  frontend de Cloud Run: **todo el planeta compartía un cubo** (registro 3/hora GLOBAL, login 10/min
  GLOBAL). Nuevo `_real_client_ip` que lee `X-Forwarded-For` **desde la derecha** con
  `TRUSTED_PROXY_HOPS` (no falsificable); el audit log admin deja de ser falsificable también.
  9 tests nuevos → `pytest` **133 passed / 74 skipped**. Ver DIARIO_BUGS.
- ✅ **Tipos de mercado interactivos** (`MarketTypeModal` + `lib/marketTypesContent.js`): las 10 tarjetas
  de Fundamentos abren una ficha con 6 bloques —qué es · **cómo se mide** (pips/lotes/tick/contratos/
  duración/FDV…) · ejemplo numérico resuelto · **calculadora en vivo** (7 variantes) · widget de
  TradingView · **Q&A**—. Deep-link `?market=<id>`.
- ✅ **Librería TradingView** (`TVWidget.jsx`): un solo cargador con tema/locale compartidos y lazy mount
  por `IntersectionObserver`; 10 widgets con nombre (screener cripto/acciones, cross rates, market
  overview, heatmaps, symbol overview, technical, ticker tape, events). El calendario económico migrado.
- ✅ **Contenido de los 3 PDF de opciones** (`OptionsMechanics` en la academia de Opciones): formación
  del precio de la prima (order book vs market maker + valor teórico/oferta y demanda/spread),
  apalancamiento **nocional vs efectivo por delta** (con laboratorio interactivo), **BTO/STO/BTC/STC**
  con las 3 formas de cerrar, y **rollover/rolling** completo (roll out/up/down, coste, contango vs
  backwardation, checklist y errores). Cobertura previa: 0.
- ✅ **Tokenomics de cripto del PDF de 100 reglas**: capitalización, oferta circulante vs total, **FDV**
  y **calculadora de dilución** con el caso real ($20 · 200M/1000M → $4, −80%). Cobertura previa: 0
  coincidencias de "oferta circulante"/"dilución"/"market cap" en los 8 idiomas.
- ✅ **Dashboard macro**: `NextDataCountdown` (cuenta atrás en vivo al próximo dato, bandera del país,
  qué suele mover, enlace a la fuente) + `SpeakersWatch` (Fed, BCE, BoJ, BoE, presidencia de EE. UU.,
  OPEP+), con `lib/macroCalendar.js` derivado de las reglas oficiales de publicación (nunca inventa
  cifras ni consenso; los de fecha fija se marcan `≈`).
- ✅ **PWA instalable de verdad** (F-02): `sw.js` (network-first en navegación para no repetir el
  ChunkLoadError post-deploy, cache-first solo en estáticos con hash, API nunca cacheada), página
  offline, `lib/pwa.js` con captura de `beforeinstallprompt` + ayuda de iOS, manifest con
  `id`/`scope`/`display_override`/`launch_handler`.
- ✅ **Landing: bloque de app** (`AppComingSoon`) — instalar ahora + insignias **Próximamente** de Google
  Play / App Store / Microsoft Store (reproducciones propias: Google y Apple prohíben las oficiales
  para apps no publicadas).
- ✅ **80 páginas SEO nuevas** `/markets/<id>/` × 8 idiomas con **FAQPage en el HTML visible** (en inglés
  para los locales sin traducción, que es lo que se pidió para los rich results). Sitemap **664 → 744**.
- ✅ **Opciones: redistribución** (M-15) — 7 pestañas en una fila → 3 grupos (Operar/Analizar/Aprender)
  en escritorio y **un selector** en móvil; ficha del activo en su propia línea con cifras tabulares.
- 🐛 **F-03** banderas de idioma en emoji (invisibles en Windows) → **SVG** (`FlagIcon`, 20 países).
  **F-04/F-05** JSON-LD de la portada mentía: "250+ activos" (real 186) y "$17/mes" (real 17 €).
- ✅ **Verificado**: `pytest` 133/74 · `import server` 178 rutas · `py_compile` 14 módulos ·
  i18n **5196 claves, 0 huecos en los 8 idiomas** (+23 nuevas) · `npm run build` exit 0 ·
  **smoke headless 23/23 con 0 pageerrors** (fichas de mercado, calculadora de dilución, deep-link,
  FAQ inglesa indexable, banderas SVG, bloque de app, móvil sin desbordamiento).
- ⏳ **Ola 2 pendiente** (§6 del examen): M-01 proveedor multi-fuente con failover (requiere alta en
  Finnhub), M-22 noticias (diseño decidido, sin implementar a petición), F-09 exportación RGPD,
  M-25 import CSV al diario, M-35 presupuesto de rendimiento.

### 2026-07-26 (59) — Ola 2 del examen final: datos multi-proveedor, noticias, import guiado, rendimiento
- ✅ **M-01 — `backend/market_data.py` (nuevo)**: capa multi-proveedor con failover
  **Yahoo → Finnhub → Twelve Data → último valor bueno**, caché con TTL, **circuit breaker** por
  proveedor (N fallos seguidos → fuera de rotación durante un cooldown) y marca **`stale`** con
  `as_of` cuando se sirve un precio que no se pudo refrescar. **Nunca inventa un precio**: si todo
  falla y no hay caché, `price` es `None` con el motivo. Claves **solo por entorno/Secret Manager**
  (test de regresión que lo verifica → cierra también el riesgo C-08 para esta capa).
  Nuevos endpoints: `GET /quote/{symbol}` y `GET /admin/market-data-health`. **17 tests offline.**
  ⏳ Pendiente del propietario: dar de alta Finnhub (gratis, 60 llamadas/min) y cargar la clave.
- ✅ **M-22 — Noticias**: ruta `/news` + entrada de menú **entre Performance y Precios** (como se
  pidió). La maqueta completa (filtros por categoría, buscador, tarjetas con titular · medio · hora ·
  enlace externo) va envuelta en **`WipSection`: difuminada con el mensaje «estamos trabajando en
  ello»**. `WipSection` gana una prop `message` para no reutilizar el texto genérico sobre contenido
  legal por país. Las filas son **marcadores de maquetación deliberadamente genéricos** — la página
  no puede mostrar noticias inventadas. La **política editorial sí queda visible** (titular + fuente
  + enlace, nunca el cuerpo, nunca titulares reescritos por IA).
- 🐛 **F-09 — rectificación + 2 fallos reales.** El examen decía que faltaba la exportación RGPD:
  **era falso**, `GET /auth/my-data` existía con su botón en Ajustes. Al leerlo aparecieron dos
  defectos: (1) **exportaba 3 colecciones cuando el borrado elimina 13** — faltaban cartera,
  posiciones guardadas, preferencias, diario, referidos e historial de pagos (poder borrar datos que
  no puedes llevarte es justo el hueco del art. 20); (2) el `fetch` **sin `credentials:'include'`**
  daba 401 tras recargar la página (misma clase de bug ya corregida en PricingPage y UsageHeatmapCard).
  Ambos arreglados.
- ✅ **M-25 — Import CSV con mapeo guiado** (rectificación parcial: el importador ya existía con
  auto-detección por alias; el hueco real era que **descartaba filas en silencio**). Nuevos
  `lib/tradeImport.js` (motor puro) y `TradeImportWizard.jsx`: detección del formato por firma de
  cabeceras (**MetaTrader 4/5, Interactive Brokers, Binance, Bybit** o genérico), **mapeo visible y
  editable** campo a campo, **vista previa** normalizada y recuento de **lo que se omitirá y por qué**
  (fila + campo). Parseo numérico tolerante (`1.234,56` vs `1,234.56`, notación contable) y cantidad
  con signo interpretada como dirección cuando no hay columna de lado. Eliminada la lista de alias
  duplicada: una sola fuente de verdad.
- ✅ **M-35 — Rendimiento: `main.js` 395,55 kB → 278,96 kB gzip (−29%)**. `es.js` (555 KB) viajaba
  dentro del bundle inicial, así que cada visitante de la portada se descargaba los 68 módulos de
  academia. Nuevo `scripts/split-i18n-edu.js`: extrae las **2.100 claves usadas EXCLUSIVAMENTE** por
  `tradingEducationContent.js` a `<locale>.edu.js`, cargado en diferido. **Por qué es seguro**:
  ese fichero tiene **0 llamadas `t()` dinámicas** (el script aborta si aparece alguna), las 204
  claves compartidas con otros ficheros **se quedan** en el diccionario eager, `lib/i18n.js` espera
  el chunk antes de renderizar EducationPage y también al **cambiar de idioma** estando en ella.
  `i18n-check` y `gen-seo-pages` fusionan ambos ficheros.
- ✅ **Verificado**: `pytest` **150 passed / 74 skipped** (17 nuevos de `market_data`);
  `import server` **180 rutas**; i18n **5247 claves, 0 huecos en los 8 idiomas**; `npm run build`
  exit 0 (744 URLs); **smoke ola 1: 23/23** y **smoke ola 2: 14/14**, 0 pageerrors — incluye el
  recorrido de 6 módulos de academia y el cambio de idioma en /education buscando **claves i18n
  crudas: 0** (el riesgo real del split).

### 2026-07-26 (60) — Ola 3: datos vivos, resoluciones, 2FA de admin, roll y tiendas
- ✅ **M-38 — refresco automático al introducir datos** (petición explícita del dueño: «que se
  actualice cada vez que introduces datos»). Nuevo `lib/dataVersion.js`: bus de versiones por tema
  (`trades`, `calculations`, `alerts`…). Los escritores llaman a `bumpData(tema)` y los lectores
  ponen `useDataVersion(tema)` en sus dependencias. Instrumentados los 4 writes de
  `performanceApi` y `saveCalculation`; escuchan `JournalStats` y `CalculationHistory`. Antes, al
  registrar una operación desde la calculadora de posición, las estadísticas del dashboard
  mantenían los números viejos **hasta recargar la página entera** — datos correctos en el
  servidor y obsoletos en pantalla, que se lee como que la web está rota.
- 🐛 **Mismo bug de cookies otra vez**: `saveCalculation` y `fetchHistory` usaban `fetch()` pelado
  (sin `credentials:'include'`), así que tras recargar **no guardaban ni leían nada** en silencio.
  Migrados a `fetchWithTimeout`, que siempre las incluye. Van ya 5 sitios con este mismo fallo.
- ✅ **Estados vacíos con sentido** (`components/common/EmptyState.jsx`): en vez de «sin datos» en
  gris, una vista previa atenuada e inerte de lo que aparecerá + una acción. Aplicado a historial de
  cálculos, alertas y watchlist.
- ✅ **M-36 — resoluciones, medidas antes y después** (no a ojo):
  - **Móvil apaisado (844×390) en Opciones: 167 px de barras fijas = 43% de la pantalla → 65 px
    (17%)**. La barra de opciones deja de fijarse por debajo de 520 px de alto.
  - **Ultrawide (2560×1440): el contenido ocupaba 1280 px (50%) → 1720 px (67%)** en el dashboard.
  - **Desbordamiento horizontal: 0 en las 4 resoluciones** — ya estaba bien.
  - ⚠️ Dos falsos positivos descartados al investigarlos: la barra lateral «sticky» de Educación
    (va al lado, no encima) y un `div` de 499 px que era el modal de onboarding.
- ✅ **2FA OBLIGATORIO para administradores**: `require_admin` exige `totp_enabled` y responde
  **428** (no 403) para que el frontend distinga «no puedes» de «termina de configurarlo».
  `ProtectedRoute` lleva al admin a Ajustes con un aviso explicando por qué. El escape
  `ADMIN_2FA_OPTIONAL` **solo funciona fuera de producción** (test que lo verifica). 6 tests nuevos.
- ✅ **CodeQL** (`.github/workflows/codeql.yml`): Python + JS, `security-extended`, en PR, push y
  semanal. Cierra G-07 junto con el `dependabot.yml` que ya existía.
- ✅ **M-16 — calculadora de roll** (`components/options/RollCalculator.jsx`), justo debajo de la
  teoría de rollover: flujo neto (débito/crédito, con el signo invertido para posiciones vendidas),
  días comprados, **coste por día**, cambio de delta y de theta, y una lectura en texto. No
  re-valora con Black-Scholes a propósito: se introducen las primas que cotiza el bróker, que ya
  llevan dentro el spread y la IV real.
- ✅ **M-32 — andamiaje de tiendas**: `packaging/twa-manifest.json` (Bubblewrap, Android),
  `frontend/public/.well-known/assetlinks.json` y **[`docs/PUBLICAR_EN_TIENDAS.md`](./PUBLICAR_EN_TIENDAS.md)**
  con los pasos, costes reales (25 $ Play · 19 $ Microsoft · 99 $/año Apple) y las trampas: el
  keystore que no se puede perder, el fingerprint de Play App Signing (no el local), el rechazo de
  Apple por «envoltura web» y **la comisión del 15-30% si se vende dentro de la app** (hay que
  diseñarlo como app «reader» desde el principio). `.gitignore` protege los keystores.
- ✅ **Verificado**: `pytest` **156 passed / 74 skipped**; `import server` **180 rutas**;
  `py_compile` 15 módulos; i18n **5254 claves, 0 huecos en los 8 idiomas**; `npm run build` exit 0
  (main 279,57 kB); **smokes: ola 1 23/23 · ola 2 14/14 · ola 3 8/8, todos con 0 pageerrors**.
- ℹ️ **Nota de despliegue**: el workflow de Cloud Run falla desde antes de estas olas porque faltan
  los secretos `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT` en GitHub — falla en el
  paso de autenticación, antes de tocar el código. GitHub Pages sí despliega correctamente.

### 2026-07-26 (61) — Ola 5: conciliación de pagos, el bug de las cookies a escala y limpieza de rutas
- ✅ **M-40/M-41 — Conciliación de pagos.** El fallo más caro que puede pasar desapercibido: el
  cliente paga, el webhook se pierde y nunca recibe premium; nada da error, así que el primer aviso
  es un email enfadado. Nuevos `GET /admin/payments/reconciliation` (cruza dinero cobrado contra
  premium concedido en 3 categorías), `POST /admin/payments/{id}/grant` (repara en un clic, **solo**
  sobre transacciones realmente pagadas, idempotente, por la misma vía que los webhooks y auditado) y
  `GET /admin/payments/webhook-health` (avisa si no llega ningún webhook en 24 h **habiendo**
  suscripciones activas — sin clientes de pago el silencio es normal y no alarma). Tarjeta en
  AdminPage. Tabla `webhook_health` + registro en los 3 webhooks. **14 tests.**
- 🔴 **El bug de `credentials` era sistémico: 84 llamadas, no 5.** Al escribir el chequeo para que no
  volviera a colarse, resultó que había **84 `fetch()` al backend sin `credentials:'include'`** en
  28 ficheros. Con el token solo en memoria, tras recargar la página esas llamadas dan 401 dentro de
  un `catch` que se lo traga: la función simplemente no hace nada, sin error ni log. **Corregidas
  todas** con un codemod (seguro también para endpoints públicos: el backend ya responde con orígenes
  CORS explícitos y `Allow-Credentials`). Nuevo `scripts/check-fetch-credentials.js`.
- ✅ **CI: dos comprobaciones que existían pero NO se ejecutaban.** `ci.yml` solo hacía
  `npm run build`, así que ni la paridad de los 8 idiomas ni el nuevo chequeo de `credentials`
  protegían nada. Ambos añadidos al job de frontend.
- 🐛 **F-07 rectificado y resuelto.** La doc decía «~21 endpoints admin muertos» (G-04). Medido sobre
  las rutas **registradas**: `admin_routes.py` sí se registra (24 rutas) y antes que los stubs, así
  que eso ya estaba resuelto. Las duplicadas reales eran **2** en `missing_apis.py`
  (`/auth/forgot-password`, `/auth/reset-password`), que además escribían en **otra colección** y no
  tenían rate limit. Eliminadas (93 líneas) + test de regresión sobre rutas registradas —
  **0 duplicadas**. Rutas: 183 → **181**.
- ✅ **M-02/M-03 — Presupuesto de llamadas por proveedor** en `market_data.py`: contador diario con
  reinicio a medianoche UTC y aviso al **80%** del cupo (Twelve Data 800/día, Finnhub 60/min).
  Sin cupo documentado (Yahoo, que se scrapea) no alarma nunca. **6 tests.**
- ✅ **F-08** — `backend_test.py` y `backend_test_security.py` (75 KB, MongoDB, `sys.exit(1)` al
  arrancar) movidos a `_archive/` con un README que explica por qué no sirven y dónde están los
  tests reales.
- 🔎 **Hallazgos anotados sin tocar** (requieren decisión o migración de datos):
  - Los emails se guardan **tal y como se escriben** (sin normalizar) en registro, login y
    recuperación de contraseña. Es coherente en todo el sistema, pero significa que quien se
    registró como `User@X.com` no puede entrar escribiendo `user@x.com`. Arreglarlo bien exige
    migrar las filas existentes: **no se toca a ciegas**.
  - `build_public_settings_router` en `admin_routes.py` es una fábrica que **nunca se llama**
    (su propio docstring explica cómo registrarla, y nadie lo hizo). Sin impacto: `server.py` tiene
    su propia `/public/settings`.
- ✅ **Verificado**: `pytest` **181 passed / 74 skipped** (+25); `py_compile` 15 módulos;
  i18n **5254 claves, 0 huecos**; `check-fetch-credentials` limpio; `npm run build` exit 0;
  **smokes 23/23 · 14/14 · 8/8 con 0 pageerrors** tras tocar 84 llamadas.

---

### 2026-07-27 (62) — Escáner de estructura: S/R relativos al precio, escalera 5m–1mes y confirmación anotada
- 🔴 **Bug de fondo: los soportes y resistencias estaban mal etiquetados.** `detect_sr_levels`
  decidía el rol por **cómo se formó** el nivel (más máximos → "resistencia"), sin mirar dónde está
  el precio. Un techo ya roto sobre el que el precio se apoyaba seguía apareciendo como resistencia:
  **invierte la operativa**. Ahora el rol lo decide el lado del precio actual — *encima →
  resistencia, debajo → soporte*, sin excepciones. El origen se conserva en `origin` y, cuando no
  coincide con el rol, el nivel se marca `flipped` (cambio de polaridad, que es información valiosa,
  no un error). Añadidos `distancePct` con signo, `nearestResistance`/`nearestSupport` y orden por
  cercanía al precio. La UI lo pinta como **escalera de precio**: resistencias arriba, banda del
  precio en medio, soportes debajo.
- ✅ **Escalera de temporalidades con validación** (`backend/timeframes.py`, nuevo). Antes `interval`
  era texto libre que se pasaba tal cual a Yahoo: `interval=banana` llegaba al proveedor y su error
  volvía convertido en *"sin estructura relevante"* — indistinguible de un gráfico plano. Y solo
  funcionaba el diario, porque el frontend tenía `interval=1d` a fuego. Ahora hay 7 escalones
  (**5m · 15m · 30m · 1h · 1d · 1wk · 1mo**) con las ventanas que el proveedor **sí** sirve, y
  `1h` llega a **2 años**. Nuevo `GET /api/education/scan-timeframes` para que la UI nunca ofrezca
  un par imposible. Si se pide algo imposible se ajusta y **se dice** (`adjustments`, aviso ámbar).
  ⚠️ Límite real documentado: **ninguna fuente gratuita da 2 años de velas de 15m** (tope de 60 días
  por debajo de la hora); para mirar 2 años atrás se usa el escalón de 1h o el diario.
- ✅ **Confirmación anotada.** Cada nivel y cada ruptura llevan un bloque `confirmation` con la
  evidencia y códigos de motivo traducibles: visitas (rachas de velas dentro de la banda, **una
  racha = una visita**, no diez), cuántas aguantaron, cuántas se rompieron, antigüedad, y para las
  rupturas cierre en **ATR**, continuación en la vela siguiente, expansión, volumen y retest.
  Umbrales explícitos: nivel confirmado con ≥2 visitas y ≥55/100; ruptura con ≥50/100, que es
  exactamente *"cerró claro al otro lado y la siguiente se quedó ahí"*. Sin datos de volumen
  (forex, índices) la ruptura no se penaliza.
- ✅ **Análisis adaptativo**: tolerancia de agrupación = medio ATR en % del precio (antes 0,8 % fijo,
  que fundía todos los niveles en 5m y separaba techos evidentes en mensual), y **fuerza fractal por
  escalón** (3 en 5m/15m: un fractal de 2 velas en intradía marca cada micro-giro como swing).
- 🐛 **Fix de datos intradía**: `get_ohlc_history` daba a las 78 velas de una sesión la misma cadena
  `2026-07-27`; el registro del escáner deduplica por fecha, así que **las fundía en una sola**.
  Ahora las velas intradía llevan hora y un campo `ts`. Añadido `lastBarForming`: en intradía la
  última vela aún no ha cerrado y lo que dependa de ella puede deshacerse.
- ⚡ **Rendimiento**: FVG en una pasada (era O(n²), inservible con 1 500 velas) y análisis profundo
  limitado a los 30 niveles más cercanos (las dos pasadas caras son O(niveles × velas)). Peor caso
  de 10 000 velas: **946 ms → 289 ms**. Listas recortadas antes de enviarse (`truncated`).
- 📚 Nuevo [`docs/ESCANER_ESTRUCTURA.md`](./ESCANER_ESTRUCTURA.md): qué hace bien (8 puntos), **qué
  no hace bien (11 limitaciones reales**: huecos de sesión, swings recientes sin confirmar, ruido en
  5m, sin confluencia multi-temporal, sin volumen real en forex/índices, Yahoo como única fuente de
  OHLC, sin backtest…), el contrato de la API y cómo verificarlo sin red.
- ✅ **Verificado**: `pytest` **230 passed / 74 skipped** (21 tests nuevos de la escalera + 27 de
  acción del precio); `py_compile` OK; i18n **5290 claves × 8 idiomas, 0 huecos** (+36);
  `check-fetch-credentials` limpio; `npm run build` exit 0. **Smoke de navegador 20/20 con
  0 pageerrors** contra backend vivo (Postgres real + lector OHLC mockeado, porque Yahoo está
  bloqueado en el sandbox), confirmando el caso clave: con precio en 122, el techo de 120,6 se
  muestra como **Soporte −1,15 % · polaridad · confirmado**, no como resistencia.

---

### 2026-07-27 (63) — El despliegue apuntaba al proyecto GCP antiguo
- 🔴 **Causa real de un mes sin desplegar backend.** El último deploy con éxito fue el
  **30 de junio** (`47e8491`); los 8 siguientes fallaron todos en el paso *"Autenticar con
  Google Cloud"*. El motivo de fondo: el trabajo se movió al proyecto
  **`tradingcalculatorpro-502817`**, pero el despliegue seguía escrito a fuego contra el
  antiguo (`tradingcalculator-495806`) en **cinco sitios** del workflow, más `cloudbuild.yaml`,
  `setup-gcp.sh` y `GOOGLE_CLOUD_SETUP.md`.
- ✅ **Nada específico del proyecto queda fijado en el YAML.** Ahora sale de variables de
  repositorio con el proyecto actual por defecto: `GCP_PROJECT`, `GCP_REGION`,
  `CLOUDSQL_INSTANCE`, `RUNTIME_SERVICE_ACCOUNT` (además de las que ya había, `DB_PROVIDER`
  y `MIN_INSTANCES`). Mover el backend de proyecto o de región ya no requiere un PR.
- 🐛 **Restos del proyecto viejo que también rompían al cambiar de región**: `configure-docker`
  tenía `europe-west1` a fuego, el nombre de la imagen se componía con el proyecto antiguo, y
  ni el deploy ni el healthcheck pasaban `--project` (dependían del proyecto activo de gcloud).
- 🐛 **`GOOGLE_CLOUD_SETUP.md` decía `us-central1` mientras el deploy real usaba `europe-west1`.**
  No es cosmético: el nombre de conexión de Cloud SQL lleva la región dentro, así que seguir el
  documento al pie de la letra creaba una instancia a la que el servicio no podía conectarse.
  Corregido y avisado en cabecera.
- ✅ `cloudbuild.yaml` usa ahora la sustitución `_GCP_PROJECT` (por defecto, el proyecto donde
  corre el build) y `setup-gcp.sh` acepta `PROJECT_ID`/`REGION` por entorno.
- ✅ **Verificado**: los tres ficheros parsean (`yaml.safe_load`, `bash -n`); sin referencias al
  proyecto antiguo fuera del registro histórico. **El deploy real no se puede probar desde el
  sandbox** (sin acceso a GCP): lo confirma el propio workflow al ejecutarse.
- ⏳ **Pendiente del dueño**: crear en el proyecto nuevo la federación de identidad (los secretos
  `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT`), los 7 secretos de Secret Manager,
  la cuenta de servicio de ejecución y la instancia de Cloud SQL (o `DB_PROVIDER=neon`).

---

### 2026-07-27 (64) — Escáner: falta la temporalidad 4H (reportado por el dueño)
- ✅ **4H añadida a la escalera.** Ningún proveedor gratuito la sirve (los intervalos de
  Yahoo son 1m, 2m, 5m, 15m, 30m, 1h y 90m), pero es de las temporalidades más operadas en
  swing, así que se **compone**: se piden velas de 1h y se juntan de cuatro en cuatro
  (apertura de la primera, máximo y mínimo de las cuatro, cierre de la última, volumen
  sumado). Nuevo `timeframes.resample()`. Hereda el tope de 730 días del intervalo horario,
  así que llega justo a 2 años. La respuesta trae `aggregatedFrom: "1h"` para que el cliente
  pueda distinguir una vela compuesta de una servida de origen.
- ⚠️ **Límite documentado, no disimulado**: los grupos se anclan a medianoche UTC. En cripto
  y forex (24/7) coincide exactamente con cualquier plataforma; en **acciones** no, porque la
  sesión abre a las 13:30 UTC — las velas caen dentro de los tramos UTC en vez de empezar en
  la apertura. Anclar a la sesión exigiría un calendario que el proveedor de precios no da.
- 🐛 **Bug encontrado al probarlo: una grafía distinta disparaba el aviso ámbar.** Escribir
  `H4` (o `60m`, o `daily`) hacía que `resolve()` lo reportara como "ajuste", y la interfaz
  pintaba *"el proveedor no sirve esa combinación"* a alguien que había pedido exactamente lo
  que recibió. Los alias se separan ahora en `SPELLINGS` (misma vela, otra grafía → **sin**
  aviso) y `APPROXIMATIONS` (vela distinta de la pedida → **con** aviso, p. ej. `2h`→`1h`).
- ✅ **Verificado**: `pytest` **245 passed / 74 skipped** (+15); E2E contra las rutas reales
  con datos mockeados → 600 velas de 1h se convierten en **150 de 4h exactas**, el upstream
  recibe `1h` y `H4` ya no genera aviso; i18n 8 idiomas sin huecos; `npm run build` exit 0.

---

### 2026-07-27 (65) — Patrones de vela: la incoherencia de "3 soldados" y revisión matemática
- 🔴 **La incoherencia reportada tenía DOS causas, ambas fallos reales.**
  - **(a) El registro mezclaba temporalidades.** Se guardaba por activo y nada más
    (`store[symbol]`), sin anotar en qué vela se detectó cada cosa: una detección de 15m y una
    diaria caían en la misma lista, indistinguibles. El usuario veía "3 soldados", miraba su
    gráfico y no estaban, porque eran de otra temporalidad. Ahora el registro va por
    **activo + temporalidad**, cada entrada lleva su etiqueta visible, el identificador incluye
    la temporalidad (antes el mismo patrón en dos velas compartía id y uno pisaba al otro) y el
    backend estampa `interval` en cada detección. El almacén v1 se descarta en vez de migrarse:
    sus entradas no guardaron temporalidad y no hay forma honesta de asignarles una.
  - **(b) "Tres soldados" se disparaba con velas que no lo eran.** Solo se comprobaba dirección,
    cierres crecientes y aperturas dentro del cuerpo anterior. **Demostrado con un caso**: tres
    velas con cuerpos del **4 % del rango** y mechas superiores del **94 %** pasaban el filtro.
    Añadidos los umbrales canónicos que faltaban (cuerpo ≥ 55 % del rango, mecha en el sentido
    de la marcha ≤ 25 %), también para los tres cuervos.
- ✅ **Cada patrón declara en qué se fija** (`basis`): **body** (11 patrones), **wicks** (6) o
  **both** (13), visible en la interfaz. Y cada detección trae las **medidas reales de la vela
  que confirma** —cuerpo, mecha superior, mecha inferior en % del rango, que suman 100 % por
  construcción— para contrastar el aviso con el gráfico en vez de creérselo.
- ✅ **Qué día abre y qué día confirma.** Un patrón de 3 velas ocupa 3 barras; antes solo se
  publicaba la fecha de la última y había que contar velas hacia atrás. Ahora `start_date` /
  `confirm_date` (con `date` intacto por compatibilidad). En patrones de 1 vela, coinciden.
- 🐛 **Tercer fallo de escala encontrado al revisar**: `_trend_before` —lo que distingue martillo
  de hombre colgado— usaba un **1 % fijo**. En 5m casi cualquier ventana lo supera (todo parecía
  tendencia y las etiquetas se intercambiaban); en mensual casi nada (contexto siempre lateral).
  Ahora el umbral se mide en **rangos medios de vela**, adimensional.
- 🔎 **Anotado sin tocar**: las pinzas (tweezers) usan tolerancia fija del 0,15 % para decidir si
  dos extremos son "iguales" — mismo defecto que tenían los S/R antes de pasar a ATR.
- ✅ **Verificado**: `pytest` **256 passed / 74 skipped** (+11); E2E contra las rutas reales →
  cada detección lleva su temporalidad (15m→{15m}, 1d→{1d}) y los 42 patrones multi-vela abren
  en fecha distinta de la que confirman; i18n **5297 claves × 8 idiomas, 0 huecos**; build exit 0.

---

### 2026-07-27 (66) — Aprendizaje: temática por mercado, "por qué importa" y laboratorio de velas
- ✅ **Identidad visual por mercado y por activo** (`src/lib/marketTheme.js`, nuevo). Los diez
  paneles de Tipos de Mercado se pintaban todos con el mismo verde: oro, petróleo, bonos y
  cripto compartían cara, así que la pantalla no ayudaba a saber dónde estabas. Ahora cada
  mercado tiene acento, fondo y halo propios, y hay **sub-temas por activo** porque "materias
  primas" mete en el mismo cajón oro, crudo y gas, que no se parecen en nada: el oro con
  degradado metálico dorado, la plata plateada, el cobre cobrizo, el crudo verde petróleo, el
  gas azul llama. Se aplica **desde la tarjeta**, no solo al abrir el panel.
- ⚠️ **Decisión técnica que evita un fallo clásico**: los colores viajan como **variables CSS en
  línea**, no como clases de Tailwind. Tailwind genera su CSS escaneando el código en
  compilación, así que una clase construida en ejecución (`text-${color}-500`) no existe en el
  bundle y se queda sin estilo — habría fallado justo en producción.
- ✅ **`WhyItMatters`** (nuevo): qué es · por qué importa · **qué te cuesta ignorarlo** · cómo se
  usa. El coste va en concreto y destacado a propósito: un consejo sin consecuencia cuantificada
  se olvida antes de bajar a la siguiente sección.
- ✅ **Laboratorio de velas** (`CandleLab`, nuevo): el usuario **construye** la vela con cuatro
  controles y ve en vivo qué reglas se cumplen y cuáles no, **con el número medido al lado**.
  Enseña lo que ninguna galería cuenta: dónde está la frontera exacta y que un patrón "casi" no
  es el patrón. El preset *"casi martillo"* falla por 0,6 puntos de mecha superior (3 frente a
  un límite de 2,4 = 0,4× el cuerpo), y lo dice.
- 🛡️ **Guardián contra la deriva de umbrales.** El laboratorio clasifica en el navegador (una
  llamada al servidor por cada arrastre del ratón sería absurda), así que los 16 umbrales están
  duplicados en `candleRules.js`. Lo peligroso de duplicar no es la copia: es que se separen en
  silencio y la web acabe **enseñando** una regla mientras el escáner aplica otra. Nuevo
  `test_candle_rules_parity_unit.py` lee el JavaScript y compara número a número, y además
  detecta umbrales inventados solo en JS. **3 tests.**
- 🐛 Encontrado al probarlo: el preset "casi martillo" original **sí** era un martillo (mecha
  superior 2 ≤ 2,4). Corregido y verificado numéricamente antes y después.
- ✅ **Verificado**: `pytest` **259 passed / 74 skipped**; i18n **5327 claves × 8 idiomas, 0
  huecos** (+30); `check-fetch-credentials` limpio; `npm run build` exit 0; **smoke de navegador
  9/9 con 0 pageerrors** contra backend vivo — el laboratorio clasifica bien, "casi martillo" NO
  forma martillo, y tarjeta y panel del oro llevan `--mk-accent=#d4a017`.

---

### 2026-07-27 (67) — Auditoría de producto: el linter mudo y lo que dejó pasar
- 🔴 **ESLint no analizaba ni un fichero.** La configuración cargaba
  `@babel/eslint-parser`, pero CRA no deja un `babel.config.js` en el repo (vive dentro de
  `react-scripts`), así que el parser abortaba con *"No Babel config file detected"* en
  **283 de 283** ficheros. El resultado: `jsx-a11y`, `rules-of-hooks` y `exhaustive-deps`
  llevaban tiempo instalados y sin mirar **nada**. Y CI tampoco ejecutaba el linter, así que
  no había forma de enterarse. Se pasa al parser propio de ESLint (espree), que entiende JSX
  sin Babel ni `NODE_ENV`, y se añade el paso `Lint (ESLint)` a `ci.yml`.
- 🐛 **Lo primero que encontró al funcionar: la calculadora de Fibonacci estaba rota.**
  `FibonacciCalculator.jsx` usaba `idx` dentro de dos `.map((item) => …)` que nunca lo
  declaraban. En JavaScript eso es `ReferenceError: idx is not defined` — comprobado — así
  que el componente **reventaba al pintar los niveles**, es decir, en cuanto alguien
  calculaba. Está enlazado desde `DashboardPage`, o sea que era una herramienta principal
  caída. Arreglado añadiendo el índice a ambos callbacks.
- 🐛 **11 tarjetas del panel admin se quedaban vacías tras recargar la página.** Todas
  repetían `useEffect(() => { if (API) load(); else setLoading(false); }, [])`. Tras un F5 el
  token vive sólo en memoria (Zustand) y arranca a `null`: la petición sale con
  `Bearer null`, el backend responde 401, el `catch` se lo traga y —al no depender de
  `headers`— **no se reintenta jamás**. Este proyecto ya había parcheado el mismo fallo dos
  veces por separado (`UsageHeatmapCard`, `IntegrationsEditor`) sin tocar la raíz. En vez de
  un parche número 12, se añade **`useAuthedLoad`**: espera a que el bearer sea real y
  relanza la carga cuando llega. Mientras espera deja el spinner puesto, que es la verdad;
  sólo apaga `loading` cuando no va a llegar nada (sin backend o modo demo).
- 🐛 **La búsqueda de usuarios del admin devolvía 500 con un paréntesis.** `q` iba crudo a
  los operadores `~`/`~*` de PostgreSQL, así que buscar `Rodríguez (padre)` —o teclear `(` a
  medias— abortaba la consulta. Verificado contra PostgreSQL real:
  `InvalidRegularExpressionError: parentheses () not balanced`. Nuevo `_literal_regex()` que
  escapa los metacaracteres: un buscador debe buscar texto, no ejecutar sintaxis.
  **+5 tests** (`test_admin_search_regex_unit.py`).
  - 🔎 Descartado tras medirlo: **no** hay ReDoS. El motor de PostgreSQL resolvió
    `(a+)+$` contra el caso patológico sin despeinarse, así que se documenta como crash de
    entrada inválida y nada más. No se reporta lo que no se ha demostrado.
- 🧹 **`agent-browser` estaba en `dependencies` de producción**: 73 MB, importado en cero
  sitios y sin una sola mención en el repo ni en la documentación. No llegaba al bundle
  (webpack sólo empaqueta lo que se importa), pero sí a cada `npm ci` de CI y de cada
  despliegue. Fuera: `node_modules` pasa de **624 MB a 551 MB**. Si hace falta para smokes
  locales, su sitio es `npm i -D`.
- 🔒 **axios `^1.8.4` → `^1.18.1`**: era la única vulnerabilidad *alta* que de verdad viaja
  al navegador (las otras 45 son cadena de compilación: react-scripts, workbox, svgr,
  postcss — no llegan al usuario). Ahora `npm audit` da axios limpio.
  - 🔎 **`react-router-dom` se deja como está, a propósito.** El aviso es *"RSC Mode CSRF
    Bypass"* y esto es una SPA de CRA: no hay React Server Components por ningún lado. El
    "arreglo" que propone npm es **bajar a 7.11.0**, un salto mayor hacia atrás. Cambiar una
    versión que funciona por un aviso que no aplica es empeorar el proyecto.
- 🐛 **`py_compile` en CI iba con lista escrita a mano** y se había quedado atrás:
  `price_action`, `timeframes`, `market_data`, `nowpayments`, `revolut` y
  `affiliate_program` no se comprobaban. Ahora `python -m py_compile *.py`.
- 📚 **La "fuente de verdad" mentía en lo más caro de equivocarse.** El registro de sesiones
  (§7) sí se actualizaba, pero §1, §2 y §6 —justo las que el documento manda leer primero—
  llevaban un mes congeladas: seguían pidiendo dar de alta **OxaPay**, que se retiró hace
  tiempo y hoy es **NOWPayments**. Quien siguiera el documento se pondría a abrir una cuenta
  que la web no llama. Corregidas §1/§2/§6 con cifras medidas (181 rutas, 16 módulos,
  `server.py` 7377 líneas, 24 rutas de `App.js`, 14 calculadoras, 5327 claves × 8 idiomas) y
  añadido un aviso de método en la cabecera. También `CLAUDE.md` (pasarelas, tabla de
  módulos, comandos de verificación).
- 🐛 **La orden de desarrollo local que documentaba `CLAUDE.md` no podía conectar** (G-11):
  `init_pool` trata cualquier host TCP como Neon y exige SSL verificado, así que contra un
  Postgres local da `CERTIFICATE_VERIFY_FAILED`. Documentada la forma que sí funciona
  (socket Unix). El código no se toca: exigir TLS por defecto es lo correcto.
- 🟠 **Hueco abierto, no cerrado (G-10)**: el HTML que sirve GitHub Pages va **sin CSP**.
  `SecurityHeadersMiddleware` protege las respuestas de la API, pero no la web, y Pages no
  permite cabeceras. La vía es un `<meta http-equiv>`, que **no admite report-only**: hay que
  enumerar TradingView, GA4/GTM, Google OAuth, Stripe y PayPal y verificarlo en navegador
  antes de activarlo. Se deja documentado en vez de activarlo a ciegas: un CSP mal puesto
  tira la web entera.
- ✅ **Verificado**: `pytest` **264 passed / 74 skipped** (+5); ESLint **0 errores** (128
  avisos de limpieza heredados); `py_compile` de los 16 módulos; i18n **5327 × 8, 0 huecos**;
  `npm run build` exit 0 con las 744 URLs del sitemap; fix del buscador probado contra
  **PostgreSQL 16 real** (antes: excepción; después: busca literal y sigue siendo
  insensible a mayúsculas).

### 2026-07-29 — Correcciones de las 3 auditorías externas (trader / opciones / sistema)

Sesión guiada por tres documentos entregados por el dueño:
`ANALISIS_TRADER_20260728`, `AUDITORIA_CONTENIDO_APRENDIZAJE_OPCIONES_20260728` y
`PROPUESTA_SISTEMA_TRADING_SETUP_20260728`. Se implementó el **plan de acción
priorizado del propio análisis** (Semana 1 + Mes 1), el hallazgo P0 de la auditoría
de opciones y la propuesta completa del sistema de trading.

#### 🔴 Bugs de cálculo corregidos (números que el usuario usaba para decidir)

- **§2.1 La curva de equity y el max drawdown iban al revés en el tiempo.**
  `performance_analytics` pasaba la lista de la más nueva a la más vieja y
  `compute_analytics` la recorría tal cual. **El drawdown no es simétrico bajo
  inversión**: al dar la vuelta a la serie las caídas se vuelven subidas, así que el
  DD reportado salía *por debajo* del real (verificado: la muestra de 120 operaciones
  del análisis daba 21,42 % invertida frente a **25,36 %** cronológica — nuestro fix
  devuelve 25,36 %). Además se ordenaba por `entry_date` cuando lo correcto para una
  curva realizada es `exit_date`, y `starting_balance` tomaba el saldo de la operación
  **más reciente**, del que colgaban todos los porcentajes.
  → Nuevo `sort_trades_chronologically()` (por fecha de salida) aplicado dentro de
  `compute_analytics`, que ahora es **independiente del orden de entrada** (test).
- **§2.2 El "Monte Carlo" ejecutaba UNA trayectoria.** `simulatorEngine.js` no tenía
  bucle externo: el usuario veía un ROI y un drawdown, pulsaba recalcular y salían
  números distintos. Añadido `runMonteCarlo()` real (N trayectorias → P5/P50/P95 de
  saldo y ROI, distribución de drawdown, **probabilidad de ruina** y **probabilidad de
  superar un límite de DD**, que es la métrica que necesita quien va a un challenge de
  fondeo) + panel `MonteCarloPanel.jsx` con histograma.
- **§2.2 (bis) El max drawdown del simulador no era un max drawdown.** Calculaba
  `(picoGlobal − mínimoGlobal) / picoGlobal`; si el mínimo ocurre *antes* del pico
  reporta una caída que jamás pasó (con `100→50→200→150` daba 75 %, real 50 %).
  Sustituido por seguimiento de pico corriente. El backend ya lo hacía bien: los dos
  módulos se contradecían.
- **§2.3 Con el interruptor de interés compuesto apagado la simulación no simulaba.**
  `if (compoundInterest) capital += netResult` → saldo final = inicial, ROI 0 %, DD 0 %
  y las 180 filas con el mismo número. Compuesto OFF significa que **el tamaño de
  posición** deja de crecer, no que la cuenta deje de moverse.
- **§2.4 Sharpe y Sortino.** Sharpe era por operación pero los umbrales estaban
  calibrados como si fuera anualizado (un Sharpe anualizado de 2,0 con 120 ops/año son
  0,18 por operación: nunca disparaba el badge). Ahora: series de retornos reales sobre
  la curva de equity, `stdev` muestral, resta del tipo libre de riesgo y **anualización
  con las fechas reales** — y si la muestra es demasiado corta o breve para anualizar
  honestamente, se devuelve `annualized: false` y los insights **callan** en vez de
  juzgar. Sortino dividía el downside entre el nº de negativos en vez de entre N total
  (infravaloraba sistemáticamente) y devolvía `0.0` sin pérdidas, que se lee como
  pésimo: ahora es `None` (indefinido).
- **§2.5 Las operaciones sin stop contaminaban el R medio.** `r_multiple` era `0.0`
  sin stop y entraba en el agregado, arrastrando `avg_r` hacia la media y metiendo un
  pico artificial en el bucket `0R..1R`. Ahora es `None` (indefinido, que es lo que es),
  se excluye del agregado y se reportan `r_sample_size` / `trades_without_r` + aviso en
  la UI y un insight.

#### 🟠 Funcionalidad nueva del análisis (Mes 1)

- **§2.6 MAE / MFE** — el hueco que el análisis llama "la métrica más rentable de un
  diario". Campos `mae_price`/`mfe_price` en el diario, `mae_r`/`mfe_r` calculados,
  agregado `excursion` (MAE media, MFE media, **p80 de MAE de las ganadoras**, cuántas
  perdedoras llegaron a +1R) + **scatter MAE-vs-resultado** en el dashboard y dos
  insights nuevos (stop más ancho de lo que pide la evidencia / ganadoras devueltas).
- **§3.1 Bandera `synthetic`.** `/options/chain`, `/options/iv-surface` y `/optimize`
  marcan toda respuesta construida sobre cadena modelada, con banda de aviso en la UI.
  Además **se han eliminado el volumen y el interés abierto inventados**
  (`rng.randint(50, 8000)`): son observaciones de lo que hicieron otros, no salida de
  un modelo — y con ellos dentro, todo ratio volumen/OI leía números aleatorios. Ahora
  van a `None`.
- **§3.3 Tipo libre de riesgo en vivo.** Nuevo `backend/market_rates.py`: lee `^IRX`
  (letra a 13 semanas), cachea 6 h, banda de plausibilidad, y **nunca lanza** — sin red
  sirve el último valor bueno o el fallback. Sustituye el `0.0525` de 2023-24
  hardcodeado en tres sitios. Además `year_fraction()` hace **T consciente de la hora**:
  antes un 0DTE valía `1/365` plano toda la sesión, cuando theta y gamma cambian por
  horas el último día.
- **§3.4 Solver de volatilidad implícita.** `implied_volatility()`: Newton-Raphson
  sobre vega con **bisección de respaldo** (Newton diverge donde vega colapsa) +
  endpoint `POST /calculate/implied-volatility`. Devuelve `None` —no un número— cuando
  la respuesta no es recuperable: cotización fuera de las bandas de no-arbitraje, o
  contrato tan dentro de dinero que su precio es plano en sigma (ahí cualquier cifra es
  un artefacto de la tolerancia, que es justo el problema de los strikes ilíquidos).
- **§3.5 Valor esperado, CVaR y probabilidad de tocar.** El optimizador ordenaba por
  ROI-al-objetivo (selecciona billetes de lotería OTM) o por POP (selecciona venta de
  volatilidad): **ninguna de las dos mide ventaja**. Añadidos `expectedValue`,
  `evOnCapital`, `cvar5` (media del peor 5 %), `probLargeLoss` y `probTouchBreakEven`
  integrando el P&L sobre la distribución lognormal terminal, y **el modo por defecto
  pasa a ordenar por valor esperado sobre capital**.
- **§5.4 Prompt del AI Coach reescrito.** Fuera el currículum humano inventado
  ("coach con 15+ años de experiencia en volatility trading"): ahora se presenta como
  el asistente de análisis que es. Se le inyectan **las analíticas reales del usuario**
  (win rate, expectancy, R medio, drawdown, sesgos detectados, rendimiento por setup,
  MAE) para que pueda decir lo único que no da ningún chatbot genérico; barreras de
  "no recomendaciones personalizadas"; responde en **el idioma de la UI** (8 idiomas,
  antes solo español); modelo configurable por env; `disclaimer` en la propia respuesta.

#### 🔴 Auditoría de opciones — P0 #1 (riesgo indefinido)

`short_call` / `short_straddle` / `short_strangle` se podían construir en la
calculadora sin que nada avisara. Son el **negativo fotográfico** del straddle que la
Academia sí enseña: quien conoce la palabra puede montarlo creyendo que es "lo mismo
pero vendido" y llevarse un perfil de riesgo completamente distinto. Añadida
clasificación `_risk_profile()` con detección de **patas cortas sin cubrir** (no basta
mirar `maxLoss`: con el rango de payoff de ±35 % una short call desnuda no llegaba al
umbral de "ilimitado" y salía como riesgo acotado) y aviso rojo en la tarjeta del
optimizador, **antes** de las métricas atractivas. Distingue riesgo `undefined` de
`substantial` (put desnuda: acotado, pero el límite es el nocional entero) y no marca
la covered call, que sí está cubierta por las acciones.

#### 🟢 Propuesta del sistema de trading — implementada entera

`SetupBuilder.jsx` guardaba **un** setup en una sola clave de `localStorage` y lo
sobrescribía. Reconstruido como **"Mi Sistema de Trading"**:
- **Librería de setups** (crear / editar / duplicar / eliminar, id propio cada uno) con
  migración automática del setup v1 existente — no se pierde nada.
- **Gatillo de entrada e invalidación** (§D de la propuesta), la pieza que faltaba por
  completo: sin ella dos traders con las mismas etiquetas entran en momentos distintos.
- HTF + LTF separados (el método Top-Down que ya se enseña no se podía representar con
  un único chip), tipo de setup, activos, sesión, método de S/R como campo propio,
  regla de stop, gestión, máx. posiciones simultáneas.
- **Enlazado al contenido que ya existía** en vez de duplicar catálogos: los 42 patrones
  de `getChartPatterns` y los 30 patrones de vela con su `successRate` de
  `CANDLE_PATTERN_STATS`.
- **Bloque de reglas del sistema** (§F), que no vivía en ningún sitio: pérdida máxima
  diaria/semanal, condiciones de no-operar, exposición correlacionada máxima, checklist.
- Modelo puro y testeable en `tradingSystemModel.js`; indicador de qué le falta a cada
  setup para ser operable.

#### ✅ Verificación

- `pytest tests/` → **312 passed / 74 skipped** (eran 264; **+48 tests nuevos** en
  `test_analytics_correctness_unit.py` y `test_options_edge_unit.py`, cada uno fijando
  un defecto concreto de los documentos).
- `python -m py_compile *.py` OK (**17 módulos**, +`market_rates.py`).
- Nuevo `frontend/scripts/engine-check.js` (**30 comprobaciones**, en CI): el simulador
  y el modelo del sistema producen números con los que se dimensionan posiciones y
  viven en el frontend, donde no hay pytest.
- i18n **5470 claves × 8 idiomas, 0 huecos** (+143 claves nuevas traducidas a los 8).
  ⚠️ Lección repetida: el prefijo `mc*` colisionaba con el módulo de macro
  (`mcTitle` = "Macro: ciclo, tipos y rotación") → renombrado a `mcsim*`. Es el mismo
  fallo que ya pasó con `bs*`/Black-Scholes: **comprobar el prefijo antes de escribir**.
- ESLint **0 errores**; `npm run build` exit 0.

#### ⏳ Lo que estos documentos piden y NO se ha hecho en esta sesión

Queda explícito para no dar por cerrado lo que sigue abierto:
- **Motor de backtest con separación in-sample/out-of-sample, walk-forward y contador
  de pruebas** (§5.1). El análisis lo llama "el mayor hueco del producto" y "esto es el
  producto". Es un trimestre de trabajo, no cabía aquí.
- **Riesgo a nivel de cartera** (§5.2): heat agregado, correlación, bloqueo real al
  tocar el límite diario. Las reglas ya se *definen* en el sistema de trading nuevo,
  pero nada las hace cumplir todavía.
- **Decisión sobre el proveedor de datos de opciones** (§3.2): Yahoo v7 da OI de ayer y
  no distingue at-bid/at-ask. Es una decisión de negocio (pagar Polygon/ORATS/Tradier o
  degradar Unusual Activity y Market Flow fuera del tier de pago), no de código.
- **Sincronización con IBKR/Binance** (§5.3), **precios y tiers** (§6), **poda de las
  ~744 páginas SEO** y **reducción de pasarelas** (§4).
- **Auditoría de opciones**: P0 #2 (explicación canónica de Griegas/IV/Vega y enlazar
  en vez de reexplicar en 4-6 sitios) y P1 #3-#5 (fichas de `collar`,
  `bull_put_spread`, `bear_call_spread`, `jade_lizard`, `short_strangle`; módulo de
  margen de opciones separado de `margin-liq`; fiscalidad de ejercicio/asignación).
- **Griegas americanas** (§3.4): la valoración sigue siendo europea (BSM) sobre
  opciones americanas; falta binomial/BAW para asignación temprana con dividendo.
- **Jerarquizar la educación por evidencia** (§1) y sub-agrupar el pilar "Avanzado".
