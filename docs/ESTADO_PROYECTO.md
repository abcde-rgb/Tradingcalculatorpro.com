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
- **Pagos**: Stripe + PayPal (`@paypal/react-paypal-js`).
- **Auth**: Google OAuth + JWT con httpOnly cookies (store Zustand en memoria).
- **Analítica/SEO**: GA4 + GTM + GSC/Bing, `sitemap.xml`, `robots.txt`, `og-image`,
  `manifest.json` (PWA), hook `useSEO`.
- **Journal de trading**, alertas de precio (WebSocket), historial de cálculos.

### Backend — FastAPI + asyncpg (shim Mongo→PostgreSQL)
- **160 rutas declaradas** (`server.py` 103 · `admin_routes.py` 45 · `missing_apis.py` 12),
  **169 registradas** en la app (incluye `referrals`, `realtime_alerts`).
- **Módulos**: `server.py` (monolito, 6107 líneas), `admin_routes.py`, `missing_apis.py`,
  `options_math.py`, `options_optimize.py`, `stock_data.py`, `candle_patterns.py`,
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
