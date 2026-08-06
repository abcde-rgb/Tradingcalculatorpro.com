# 🧭 ESTADO DEL PROYECTO — TradingCalculator.Pro

> **Este es el documento vivo del proyecto.** Es la fuente de verdad sobre *qué hay*,
> *qué falta*, *qué hay que probar* y *qué hay que hacer*. Cualquier asistente (Claude)
> o persona que retome el proyecto debe **leer este archivo primero** y **actualizarlo
> al terminar** su sesión (ver § _Cómo mantener este documento_ al final).
>
> - 📅 **Última verificación real contra el código:** 2026-08-05 (escáner de estructura;
>   antes 2026-08-03, commit `7864406` de `main`)
> - 🌿 **Rama de trabajo actual:** `claude/restructure-org-scanner-f5a8i6`
>
> ⚠️ **Aviso de método (2026-07-27, y volvió a pasar el 2026-08-03).** Las §1, §2 y
> §6 se quedan por detrás del código mientras el registro de sesiones (§7) sí se
> actualiza. El caso peor de julio: §1 y §6 pedían configurar **OxaPay** cuando el
> código ya llamaba a **NOWPayments**. El caso peor de agosto: §6 seguía mandando
> dar de alta **Google AdSense** un día después de borrarlo del repositorio — el
> mismo error, con otro nombre. Al cerrar sesión, actualiza también la cabecera y
> §1–§6, no sólo §7.
> - 📚 Documentos hermanos: [`ANALISIS_2026-06-25.md`](./ANALISIS_2026-06-25.md) ·
>   [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) ·
>   [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md) ·
>   [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`DIARIO_BUGS.md`](./DIARIO_BUGS.md)

---

## 1. Semáforo de lanzamiento

| Área | Estado | Nota |
|---|:--:|---|
| **Frontend build** (`npm run build`) | 🟢 | Verificado 2026-08-03: exit 0, **38 MB** en `build/`, **1589 URLs** en el sitemap, code-splitting OK. Bajó de 40 MB al apagar los source maps |
| **Backend import + sintaxis** | 🟢 | `import server` OK → **195 rutas registradas**; los **24** módulos compilan (2026-08-03) |
| **Tests offline** | 🟢 | `pytest tests/` → **545 passed, 74 skipped** en 16 s (2026-08-05). Incluye `test_route_uniqueness_unit.py`, que **sí pasa** — ojo: falla si el contenedor tiene una FastAPI distinta de la fijada en `requirements.txt` (con 0.141 `app.routes` ya no expone las rutas del router) |
| **Tests de integración** | 🟡 | Existen pero requieren `BACKEND_URL` vivo; se saltan si no |
| **Lint del frontend (ESLint)** | 🟢 | **0 errores, 126 avisos** (2026-08-05). Los avisos son símbolos muertos: deuda de limpieza, no bloquean |
| **Paridad i18n / motor** | 🟢 | `i18n-check` **5793 claves × 10 idiomas, 0 huecos** · `engine-check` **133/133** (2026-08-05) |
| **Seguridad (auth, pagos, admin)** | 🟢 | Auditoría sólida; sin secretos en el repo; cabeceras + CSP en las respuestas de API |
| **CSP del sitio (GitHub Pages)** | 🟠 | El HTML servido por Pages **no lleva CSP** (Pages no permite cabeceras). Ver G-10 |
| **CI de PR (`ci.yml`)** | 🟢 | Backend: `py_compile *.py` + pytest. Frontend: i18n + credentials + engine + lint + build. **No corre `check-doc-links.py`** — por eso la doc se desvía sin que nada avise (ver G-18) |
| **Despliegue del backend** | 🟠 | **No hay nada automático desde el 2026-08-03**: el workflow se retiró (fallaba la federación de identidad). Se despliega a mano con `cloudbuild.yaml` desde GCP |
| **CI frontend (GitHub Pages)** | 🟢 | Workflow correcto (OAuth + analytics + 404.html) + i18n + credentials + **lint** |
| **Backend con interfaz de usuario** | 🔴 | **4 módulos (~1770 líneas) y ~8 endpoints no los llama nadie desde el frontend**: plan de trading, backtest con validación, riesgo de cartera y opciones americanas. Ver G-14 |
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
- **26 rutas** declaradas en `App.js` (Landing, Dashboard, Pricing, Settings, Education,
  Subscription, Options hub + calculator + strategies + strategies/:slug, Performance,
  News, Admin, Affiliate, Login, Register, Forgot/Reset password, Verify-email,
  Magic-link, Payment success/cancel, Legal, Contact, About, 404).
- **14 calculadoras** (`components/calculators/`, contadas por fichero `.jsx`).
- **37 componentes de opciones** (`components/options/`): cadena, payoff, griegas
  (display/panel/time-chart), IV surface, IV rank, unusual activity, market flow,
  optimizador, Kelly, AI Trade Coach, comparador, posiciones guardadas, etc.
- **Gráfico TradingView** (`components/charts/TradingViewChart.jsx`): embed iframe con
  selector de categoría/activo, favoritos, 9 temporalidades, tema y locale.
  → Detalle y límites en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).
- **~186 activos** en 6 categorías (crypto, forex, stocks, indices, commodities, futures)
  en `lib/assets.js` (los "47" de la primera versión se ampliaron el 2026-07-04).
- **i18n: 10 idiomas** (`lib/i18n/`): es, en, de, fr, ru, zh, ja, ar, **pt** (Portugal) e **it**.
  **5652 claves por idioma, 0 huecos** (`node scripts/i18n-check.js`, verificado 2026-08-03).
  Los textos legales (`lib/legalContent/`) también están en los 10; la versión
  vinculante sigue siendo la española.
- **Pagos**: Stripe + PayPal (`@paypal/react-paypal-js`) + **Revolut Pay** +
  **NOWPayments** (crypto, botón "Criptomonedas"). *No* OxaPay ni MaxelPay: ambas
  se probaron y se retiraron; no queda código de ninguna.
- **Auth**: Google OAuth + JWT con httpOnly cookies (store Zustand en memoria).
- **Analítica/SEO**: GA4 + GTM + GSC/Bing, `sitemap.xml`, `robots.txt`, `og-image`,
  `manifest.json` (PWA), hook `useSEO`.
- **Todo el contenido es de pago.** No hay secciones abiertas dentro de la app:
  `/education`, `/options*`, `/news`, `/dashboard` y `/performance` exigen
  suscripción activa (`ProtectedRoute premiumOnly`). Fuera del muro sólo quedan
  la landing, precios, legales, contacto, «sobre» y el flujo de alta/pago, para
  que un registrado sin plan pueda suscribirse. **Sin publicidad**: AdSense se
  retiró por completo el 2026-08-02.
- **Prueba de 7 días con tarjeta por adelantado** (`TRIAL_PERIOD_DAYS = 7`, solo
  para nuevos suscriptores y planes recurrentes). Stripe Checkout cobra solo al
  acabar el periodo si no se cancela antes desde «Mi suscripción».
- **Las 1589 páginas estáticas son anzuelo, no contenido**: título, primer
  párrafo y llamada a la prueba de 7 días. La receta de cada estrategia, las
  tablas de mercado y las FAQ ya no se publican.
- **Journal de trading**, alertas de precio (WebSocket), historial de cálculos.

### Backend — FastAPI + asyncpg (shim Mongo→PostgreSQL)
- **195 rutas registradas** en la app (contadas sobre `server.app.routes`, 2026-08-03).
- **24 módulos** (`backend/*.py`, **19 831 líneas** en total): `server.py` (monolito,
  **8232 líneas**), `admin_routes.py` (1150), `performance.py` (1084),
  `missing_apis.py` (986), `affiliate_program.py` (859), `options_math.py` (679),
  `price_action.py` (646) —swings/BOS-CHoCH/S-R/FVG—, `backtest.py` (642),
  `stock_data.py` (615), `options_optimize.py` (587), `trading_plan.py` (558),
  `candle_patterns.py` (518), `referrals.py` (373), `options_positioning.py` (370),
  `realtime_alerts.py` (353), `market_data.py` (328), `portfolio_risk.py` (290),
  `american_options.py` (282), `timeframes.py` (273), `crypto_data.py` (255),
  `revolut.py` (215), `market_rates.py` (212), `nowpayments.py` (181),
  `ecb_rates.py` (143).
  > ⚠️ **Cuatro de ellos no tienen ninguna interfaz**: `trading_plan.py`,
  > `backtest.py`, `portfolio_risk.py` y `american_options.py`. Están escritos,
  > enrutados y con tests, y **el usuario no puede llegar a ellos**. Ver G-14.
- **Datos de mercado**: Binance + Kraken (cripto), BCE (forex), Tesoro de EE. UU.
  (tipo libre de riesgo) y **Yahoo** para acciones, índices, materias primas y la
  cadena de opciones — este último **sin licencia comercial resuelta** (Grupo B,
  ver G-16). Todas las llamadas de red van por `asyncio.to_thread`/executor → no
  bloquean el event loop (ver BUG-010).
- **IA**: Anthropic SDK (AI Trade Coach) en `POST /api/options/ai-analyze`.
- **Email**: SendGrid. **Rate limiting**: slowapi.
- **Shim de BD**: clase `Collection` que traduce operadores Mongo (`$set/$inc/$push/$or/
  $in/$regex/$unset/...`) a SQL paramétrico sobre JSONB. **Nunca usar SQL directo.**

---

## 3. Qué FALTA / huecos conocidos

| ID | Hueco | Severidad | Acción |
|---|---|:--:|---|
| G-01 | **Stripe en producción sin verificar** (productos, price IDs, webhook secret) | 🔴 | Validar dashboard + webhook endpoint. Ver DEPLOY_CHECKLIST |
| G-02 | ~~**Sin tests unitarios offline**~~ | 🟢 | ✅ **Cerrado (2026-08-03)**: **503 tests** en 34 ficheros cubren opciones, performance, price action, pagos, seguridad, plan de trading y datos de mercado. Lo que sigue sin cubrirse es el **shim `Collection`** (ver G-17) |
| G-03 | `conftest.py` con skip roto → CI podía fallar | 🟠 | ✅ Corregido |
| C-08 | API keys (Stripe/SendGrid) almacenables en `app_settings` (DB) en claro | 🟠 | **Sigue abierto** (verificado 2026-08-03: `sendgrid_api_key` continúa en la lista de ajustes de `server.py` y `admin_routes.py`). Decisión de producto: usar solo Secret Manager; quitar el override por DB |
| BUG-007 | Preferencias de usuario solo en `localStorage` (no cross-device) | 🟡 | **Sigue abierto**: no existe ningún endpoint `/user/preferences` en el backend (verificado 2026-08-03) |
| BUG-008 | `server.py` monolítico (**8232 líneas**, +2100 desde que se anotó) | 🟠 | Refactor a `app/routers/` (requiere G-17 antes). Deuda técnica |
| G-04 | ~~**Route shadowing** en admin~~ | 🟢 | ✅ **Cerrado**: `test_route_uniqueness_unit.py` pasa sobre las 195 rutas registradas — no queda ningún (método, path) duplicado |
| G-05 | TradingView: sin guardar análisis/dibujos/layouts por usuario | 🟡 | Roadmap en TRADINGVIEW_PERSONALIZACION.md |
| G-06 | Sin CI de PR (lint/build/tests antes de merge); solo deploy en push a `main` | 🟡 | ✅ Añadido `ci.yml` esta sesión |
| G-07 | Sin Dependabot/CodeQL/secret-scanning declarados en repo | 🟡 | Activar en ajustes del repo |
| G-08 | Deriva documental (CLAUDE.md/PLAN_100 desactualizados) | 🟢 | ✅ Corregido CLAUDE.md esta sesión |
| G-10 | **El sitio servido por GitHub Pages no tiene CSP.** Las cabeceras de `SecurityHeadersMiddleware` sólo viajan en las respuestas de la API (Cloud Run); Pages no deja definir cabeceras, así que el HTML de la web va sin `Content-Security-Policy`, `X-Frame-Options` ni `Referrer-Policy` | 🟠 | Meta `http-equiv="Content-Security-Policy"` en `public/index.html`. Requiere enumerar todos los orígenes (TradingView, GA4/GTM, Google OAuth, Stripe, PayPal) y **verificar en navegador**: un CSP mal puesto rompe la web y el meta **no admite modo report-only** |
| G-11 | **La orden de desarrollo local documentada no puede conectar.** `init_pool` exige SSL verificado en toda conexión TCP (rama Neon), pero el `DATABASE_URL` de dev que documentan CLAUDE.md y el README apunta a un Postgres local sin SSL → `CERTIFICATE_VERIFY_FAILED` | 🟡 | Aceptar `sslmode=disable`/`?ssl=false` en la URL, o documentar el socket Unix (`?host=/var/run/postgresql`), que sí funciona |
| G-12 | **ESLint no analizaba nada** (283/283 ficheros con error de parseo) y no corría en CI. Dejó pasar a producción un `idx` no definido que reventaba la calculadora de Fibonacci | 🟠 | ✅ **Cerrado (2026-07-27)**: config arreglada, lint en CI, 0 errores. Quedan **128 avisos** de símbolos muertos como deuda de limpieza |
| G-13 | **11 tarjetas del panel admin se quedaban vacías tras recargar** (efecto con deps `[]` que disparaba `Bearer null` y nunca reintentaba) | 🟠 | ✅ **Cerrado (2026-07-27)**: hook `useAuthedLoad` compartido, que espera al token real y relanza la carga cuando llega |
| G-09 | ~~**i18n incompleto**: 6 idiomas con ~290 claves sin traducir → caían a español~~ | 🟢 | ✅ **Cerrado (2026-07-11)**: backfill completo (candlestick, armónicos, opciones Black-Scholes/futuros/volatilidad/griegas, estrategias 6-9, auth, sesgos). Los 8 locales con sets idénticos (4401 c/u), 0 huecos. Eliminadas 9 claves muertas de de/fr/ru |
| G-14 | **Cuatro módulos de backend terminados que ningún usuario puede usar.** `trading_plan.py` (558 líneas, `/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance`), `backtest.py` (642, `/backtest/validate`, `/backtest/strategies`), `portfolio_risk.py` (290, `/performance/portfolio-risk`) y `american_options.py` (282, riesgo de asignación temprana). Grep en `frontend/src`: **cero llamadas** a esos endpoints. Lo mismo con `/options/term-structure` — `PositioningPanel` sólo consume `/options/positioning` | 🔴 | Es el mayor hueco abierto del proyecto: ~1770 líneas escritas, probadas y pagadas que no producen valor. `PLAN_DE_TRADING_spec.md` ya especifica el asistente del plan; empezar por ahí, porque además es la fuente de umbrales de `detect_errors` |
| G-15 | **`trading_plans` no entra en las tres rutas del RGPD.** La colección guarda `user_id` (tiene índice propio) pero no aparece en la lista de `delete_account`, ni en `_USER_DATA_COLLECTIONS` (purga por retención), ni en el export de `/auth/my-data`. Borrar la cuenta deja los planes en la base de datos | 🟠 | Añadir `"trading_plans"` a las tres listas de `server.py` y un test que recorra las colecciones con `user_id` para que no vuelva a pasar con la siguiente |
| G-16 | **Grupo B del saneamiento de licencias, sin hacer.** Acciones y ETFs de EE. UU., los 23 índices, los 15 futuros de materias primas y la cadena de opciones siguen saliendo de **Yahoo**, cuya licencia no permite redistribuir el dato en un producto de pago. El 2026-08-02 se retiró la *mención* pública, no la dependencia | 🟠 | Decisión de negocio con coste: IEX para acciones, ETF equivalentes para índices y materias primas, cadena sintética para opciones. **Cambia lo que ve el usuario**, por eso está parado |
| G-17 | **El shim `Collection` sigue sin tests.** Es la capa casera (~750 líneas) que traduce Mongo→SQL y de la que depende **todo** el backend. Bloquea el refactor de `server.py` (BUG-008): partir 8232 líneas sin red es cambiar deuda por riesgo | 🟠 | T-03 del backlog de auditoría: `$set/$inc/$push/$unset/$or/$in/$regex`, agregación y `find_one_and_update`, contra PostgreSQL real |
| G-18 | **`check-doc-links.py` no corre en CI.** Existe, funciona (47 documentos, 0 roturas) y sólo se ejecuta si alguien se acuerda. `PENDIENTES.md` acumuló dos referencias a documentos inexistentes (`CRECIMIENTO_GOOGLE.md`, `CHECKLIST_MODO_CASI_GRATIS.md`) sin que nada avisara — sobrevivieron porque iban en `código` y no como enlace markdown | 🟡 | Añadir el paso a `ci.yml`. Coste: 3 líneas |
| G-19 | **Deprecaciones que romperán en la siguiente mayor**: `@app.on_event("startup"/"shutdown")` (FastAPI pide `lifespan`) y una `class Config` de Pydantic v1 (pide `ConfigDict`). `pytest` ya las escupe como warnings | 🟡 | T-08 del backlog. Mecánico, pero toca el arranque: hacerlo con el suite en verde delante |

---

## 4. Qué hay que PROBAR (plan de test)

**Automático (ya disponible, todo verificado el 2026-08-03):**
- `cd backend && pytest tests/ -q` → **503 passed, 74 skipped** (integración se salta sin `BACKEND_URL`). ✔
- `cd backend && python -m py_compile *.py` → los 24 módulos. ✔
- `cd frontend && npx eslint src scripts` → 0 errores, 126 avisos. ✔
- `cd frontend && node scripts/i18n-check.js` → 5652 × 10, 0 huecos · `node scripts/engine-check.js` → 60/60. ✔
- `cd frontend && npm run build` → exit 0, 1589 URLs. ✔
- `python scripts/check-doc-links.py` → 47 documentos, 0 roturas. ✔ *(no está en CI — G-18)*

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
- [ ] **Dar interfaz a lo que ya está escrito** (G-14) — plan de trading primero.
- [ ] **`trading_plans` en las tres listas del RGPD** (G-15) — pequeño y con multa detrás.
- [ ] Cerrar **C-08** (API keys solo en Secret Manager).
- [ ] `FRONTEND_URL` obligatoria en producción (T-02 del backlog de auditoría).
- [ ] **CSP** en el HTML de Pages, verificada en navegador (T-01 / G-10).
- [ ] Confirmar **Dependabot + CodeQL + secret scanning** activos *(los ficheros `.github/dependabot.yml` y `.github/workflows/codeql.yml` ya existen; falta comprobar el interruptor en Settings)*.
- [ ] Tests del shim `Collection` (G-17).
- [ ] `check-doc-links.py` en CI (G-18).

### P2 — Producto
- [ ] **BUG-007**: sincronizar preferencias de usuario al backend.
- [ ] **TradingView**: guardar layouts/indicadores por usuario (ver doc dedicado).
- [ ] Decidir el **Grupo B** de proveedores de datos (G-16).
- [ ] Revisión **nativa** de las traducciones `pt` e `it` antes de anunciarlas.
- [ ] Decidir si `/affiliate` cae tras el muro de pago (hoy es sólo-auth y el backend ya rechaza a quien no paga).

### P3 — Deuda técnica
- [ ] `on_event` → `lifespan` y `class Config` → `ConfigDict` (G-19).
- [ ] Bajar los 126 avisos de ESLint a 0 y subir el linter a `error`.
- [ ] Refactor de `server.py` monolítico a `app/routers/` — **después** de G-17.

---

## 6. Gating de operación (lo que NO está en el código)

Estos puntos no se pueden cerrar desde el repo; requieren acceso a consolas externas:
- **GCP**: Cloud Run service, Cloud SQL `trading-db` (europe-west1), Secret Manager,
  Workload Identity Federation, Artifact Registry `trading-repo`.
- **Stripe**: productos/precios, webhook endpoint apuntando a `…/api/webhook/stripe`.
  > ⛔ **Aquí había un punto de Google AdSense. No lo busques: no aplica.** La
  > publicidad se retiró de raíz el 2026-08-02 (borrados `lib/ads.js`,
  > `lib/adsPolicy.js`, `components/ads/*` y las cuatro variables del workflow) y
  > el sitio pasó a ser **de pago íntegro**. Este párrafo se quedó aquí un día
  > entero mandando dar de alta una cuenta que la web no usa — el mismo error que
  > el aviso de la cabecera denuncia con OxaPay.
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
   - Si tocaste seguridad/bugs, refleja también en [`./DIARIO_BUGS.md`](./DIARIO_BUGS.md).
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
  sitemap a Search Console/Bing (ver `docs/setup/SEO_GUIDE.md`).

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
  `setup-gcp.sh` y `docs/setup/GOOGLE_CLOUD_SETUP.md`.
- ✅ **Nada específico del proyecto queda fijado en el YAML.** Ahora sale de variables de
  repositorio con el proyecto actual por defecto: `GCP_PROJECT`, `GCP_REGION`,
  `CLOUDSQL_INSTANCE`, `RUNTIME_SERVICE_ACCOUNT` (además de las que ya había, `DB_PROVIDER`
  y `MIN_INSTANCES`). Mover el backend de proyecto o de región ya no requiere un PR.
- 🐛 **Restos del proyecto viejo que también rompían al cambiar de región**: `configure-docker`
  tenía `europe-west1` a fuego, el nombre de la imagen se componía con el proyecto antiguo, y
  ni el deploy ni el healthcheck pasaban `--project` (dependían del proyecto activo de gcloud).
- 🐛 **`docs/setup/GOOGLE_CLOUD_SETUP.md` decía `us-central1` mientras el deploy real usaba `europe-west1`.**
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
`PROPUESTA_SISTEMA_TRADING_SETUP_20260728`.

> **Cómo leer las citas.** Cada afirmación lleva su `archivo:línea` o
> `archivo → función`, verificados contra el código de este commit. Las líneas
> se mueven; el nombre de la función no. Si una cita no cuadra, busca por nombre.

#### 🔴 Bugs de cálculo corregidos (cifras con las que el usuario dimensiona posiciones)

- **§2.1 La curva de equity y el max drawdown iban al revés en el tiempo.**
  `server.py → performance_analytics` pasaba la lista de la más nueva a la más
  vieja y `compute_analytics` la recorría tal cual. **El drawdown no es simétrico
  bajo inversión**: al invertir la serie las caídas se vuelven subidas, así que el
  DD reportado salía *por debajo* del real. Verificado con la muestra de 120
  operaciones del análisis: **21,42 % invertida frente a 25,36 % cronológica**, y
  el fix devuelve 25,36 %. Además se ordenaba por `entry_date` cuando lo correcto
  para una curva realizada es `exit_date`, y el saldo inicial se tomaba de la
  operación **más reciente**, de la que colgaban todos los porcentajes.
  → `performance.py:61 sort_trades_chronologically()`, aplicado dentro de
  `compute_analytics`; test de independencia del orden en
  `tests/test_analytics_correctness_unit.py::test_analytics_are_order_independent`.
- **§2.2 El "Monte Carlo" ejecutaba UNA trayectoria.** Sin bucle externo: el
  usuario veía un ROI y un drawdown, pulsaba recalcular y salían otros.
  → `simulator/simulatorEngine.js:280 runMonteCarlo()` (P5/P50/P95 de saldo y ROI,
  distribución de drawdown, **probabilidad de ruina** y **probabilidad de superar
  un límite de DD**, que es la métrica que necesita quien va a un challenge de
  fondeo) + panel `simulator/MonteCarloPanel.jsx`.
- **§2.2 (bis) El max drawdown del simulador no era un max drawdown.** Calculaba
  `(picoGlobal − mínimoGlobal) / picoGlobal`; si el mínimo ocurre *antes* del pico
  reporta una caída que jamás pasó (`100→50→200→150` daba 75 %, real 50 %).
  → `simulatorEngine.js:64 makeDrawdownTracker()`, pico corriente. El backend ya lo
  hacía bien (`performance.py:_compute_max_drawdown`): los dos módulos se
  contradecían. Comprobación en `scripts/engine-check.js`.
- **§2.3 Con el interés compuesto apagado la simulación no simulaba.**
  `if (compoundInterest) capital += netResult` → saldo final = inicial, ROI 0 %,
  DD 0 % y las 180 filas con el mismo número. Compuesto OFF significa que **el
  tamaño de posición** deja de crecer, no que la cuenta deje de moverse.
  → `simulatorEngine.js → simulateCompound()`, variable `sizingBase`.
- **§2.4 Sharpe y Sortino.** El Sharpe era por operación pero los umbrales de
  `generate_insights` estaban calibrados como si fuera anualizado (un Sharpe
  anualizado de 2,0 con 120 ops/año son 0,18 por operación: nunca disparaba el
  badge). Ahora hay series de retornos reales sobre la curva de equity, `stdev`
  muestral, resta del tipo libre de riesgo y **anualización con las fechas
  reales**; si la muestra es demasiado corta o breve para anualizar honestamente
  se devuelve `annualized: false` y los insights **callan** en vez de juzgar.
  Sortino dividía el downside entre el nº de negativos en vez de entre N total
  (infravaloraba sistemáticamente) y devolvía `0.0` sin pérdidas, que se lee como
  pésimo: ahora es `None`.
  → `performance.py:160 _risk_adjusted_metrics()`, `performance.py:141 _compute_sortino()`.
- **§2.5 Las operaciones sin stop contaminaban el R medio.** `r_multiple` era
  `0.0` sin stop y entraba en el agregado, arrastrando `avg_r` y metiendo un pico
  artificial en el bucket `0R..1R`. Ahora es `None` (indefinido, que es lo que es),
  se excluye y se reportan `r_sample_size` / `trades_without_r`.
  → `performance.py → compute_trade_pnl()` y `compute_analytics()`; aviso en la UI
  en `AnalyticsDashboard.jsx` (clave `rSamplePartial`).

#### 🟠 Funcionalidad nueva del análisis

- **§2.6 MAE / MFE** — lo que el análisis llama "la métrica más rentable de un
  diario". Campos `mae_price`/`mfe_price`, `mae_r`/`mfe_r` calculados
  (`performance.py:247 _excursion_r()`), agregado en
  `performance.py:676 compute_excursion_stats()` (MAE media, MFE media, **p80 de
  MAE de las ganadoras**, cuántas perdedoras llegaron a +1R), **scatter
  MAE-vs-resultado** en `AnalyticsDashboard.jsx` y dos insights nuevos.
- **§3.1 Bandera `synthetic`.** `/options/chain`, `/options/iv-surface` y
  `/optimize` marcan toda respuesta construida sobre cadena modelada
  (`server.py:4940 _synthetic_marker()`), con banda de aviso en `OptimizeView.jsx`.
  Además **se eliminaron el volumen y el interés abierto inventados**
  (`rng.randint(50, 8000)`): son observaciones de lo que hicieron otros, no salida
  de un modelo — y con ellos dentro todo ratio volumen/OI leía ruido. Ahora van a
  `None` → `options_math.py:281 _build_strike_quote()`.
- **§3.3 Tipo libre de riesgo en vivo.** Nuevo `backend/market_rates.py`: lee
  `^IRX`, cachea 6 h, banda de plausibilidad y **nunca lanza** — sin red sirve el
  último valor bueno o el fallback (`market_rates.py:64 get_risk_free_rate()`).
  Sustituye el `0.0525` de 2023-24 hardcodeado en tres sitios. Además
  `options_math.py:153 year_fraction()` hace **T consciente de la hora**: antes un
  0DTE valía `1/365` plano toda la sesión, cuando theta y gamma cambian por horas
  el último día.
- **§3.4 Solver de volatilidad implícita.** `options_math.py:185
  implied_volatility()`: Newton-Raphson sobre vega con **bisección de respaldo** +
  `POST /calculate/implied-volatility`. Devuelve `None` —no una cifra— cuando la
  respuesta no es recuperable: cotización fuera de las bandas de no-arbitraje, o
  contrato tan dentro de dinero que su precio es plano en sigma (ahí cualquier
  número es un artefacto de la tolerancia, que es justo el problema de los strikes
  ilíquidos). Umbral en `MIN_IDENTIFIABLE_VEGA`.
- **§3.5 Valor esperado, CVaR y probabilidad de tocar.** El optimizador ordenaba
  por ROI-al-objetivo (selecciona billetes de lotería OTM) o por POP (selecciona
  venta de volatilidad): **ninguna mide ventaja**. Añadidos `expectedValue`,
  `evOnCapital`, `cvar5`, `probLargeLoss` y `probTouchBreakEven` integrando el P&L
  sobre la distribución lognormal terminal, y **el modo por defecto ordena por
  valor esperado sobre capital**.
  → `options_optimize.py:278 _expected_value_and_cvar()`, `:305 _probability_of_touch()`,
  `_rank_results()`.
- **§5.4 Prompt del AI Coach reescrito.** Fuera el currículum humano inventado
  ("coach con 15+ años de experiencia en volatility trading"). Se le inyectan **las
  analíticas reales del usuario** (win rate, expectancy, R medio, drawdown, sesgos,
  rendimiento por setup, MAE), barreras de "no recomendaciones personalizadas",
  responde en **el idioma de la UI** (8 idiomas, antes solo español), modelo
  configurable por env y `disclaimer` en la propia respuesta.
  → `server.py:5661 AI_COACH_SYSTEM_PROMPT`, `server.py:5678 _format_user_context()`.

#### 🔴 Auditoría de opciones — P0 #1 (riesgo indefinido)

`short_call` / `short_straddle` / `short_strangle` se podían construir sin aviso,
siendo el **negativo fotográfico** del straddle que la Academia sí enseña: quien
conoce la palabra puede montarlo creyendo que es "lo mismo pero vendido".
→ `options_optimize.py:356 _risk_profile()` con detección de patas cortas sin
cubrir en `:338 _naked_short_legs()`. **Mirar `maxLoss` no bastaba**: con el rango
de payoff de ±35 % una short call desnuda no llega al umbral de "ilimitado" y
salía clasificada como riesgo acotado (test
`test_options_edge_unit.py::test_naked_short_call_is_flagged_undefined`). Aviso
rojo en la tarjeta **antes** de las métricas atractivas (`OptimizeView.jsx`).
Distingue `undefined` de `substantial` (put desnuda: acotado, pero el límite es el
nocional entero) y no marca la covered call, que sí está cubierta.

#### 🟢 Propuesta del sistema de trading — implementada entera

`SetupBuilder.jsx` guardaba **un** setup en una sola clave de `localStorage` y lo
sobrescribía. Reconstruido como **"Mi Sistema de Trading"**:
- **Librería de setups** (crear/editar/duplicar/eliminar, id propio) con migración
  automática del setup v1 → `tradingSystemModel.js:72 migrateLegacySetup()`.
- **Gatillo de entrada e invalidación** (§D de la propuesta), la pieza que faltaba
  por completo: sin ella dos traders con las mismas etiquetas entran en momentos
  distintos. Indicador de qué falta en `tradingSystemModel.js:158 missingEssentials()`.
- HTF + LTF separados (el método Top-Down no se podía representar con un chip
  único), tipo de setup, activos, sesión, método de S/R como campo propio, regla de
  stop, gestión, máx. posiciones simultáneas.
- **Enlazado al contenido que ya existía** en vez de duplicar catálogos: los 42
  patrones de `getChartPatterns` y los 30 de vela con su `successRate` de
  `CANDLE_PATTERN_STATS`.
- **Bloque de reglas del sistema** (§F), que no vivía en ningún sitio: pérdida
  máxima diaria/semanal, condiciones de no-operar, exposición correlacionada,
  checklist.

#### 🥇 Herramientas profesionales (2ª tanda de esta misma sesión)

- **§3.4 Opciones americanas** — nuevo `backend/american_options.py`. Toda la
  valoración era europea (BSM) sobre opciones que son americanas, y
  `simulate_assignment` modelaba la asignación con precios europeos, así que el
  ejercicio temprano antes del ex-dividendo —un evento real y frecuente— era
  literalmente invisible. Añadidos **binomial Cox-Ross-Rubinstein**
  (`american_options.py:40`) y **Barone-Adesi-Whaley** (`:95`), griegas por
  diferencias finitas sobre el árbol (analíticas BSM fallan justo en la frontera de
  ejercicio, que es donde te asignan) y `:232 early_assignment_risk()`, que compara
  el dividendo con el valor temporal restante. Endpoint `POST /calculate/american`;
  `POST /assignment` acepta `dividend`/`daysToExDividend` y devuelve
  `earlyAssignment`. Verificado con la identidad que valida el árbol: **call
  americana sin dividendo = europea** (14,2254 vs 14,2313 con 800 pasos).
- **§5.2 Riesgo de cartera** — nuevo `backend/portfolio_risk.py`. Todo el sistema
  razonaba operación a operación. `portfolio_risk.py:106 compute_open_heat()` da
  heat abierto y **riesgo efectivo por correlación**: cuatro posiciones del 1 % en
  NQ/ES/SPY/AAPL no son 4 % de riesgo sino **3,61 %** (el análisis estimaba ~3,4 %)
  — un solo factor sostenido cuatro veces. ⚠️ Detalle que cambió el resultado: la
  primera versión metía AAPL en "equity" y NQ/ES/SPY en "index" con correlación
  cruzada baja, **infravalorando** la exposición; un valor de gran capitalización
  es en su mayor parte beta del índice, así que ambos comparten grupo de
  correlación (`_CORRELATION_GROUPS`). `:197 compute_loss_limits()` devuelve
  `blocked`, no un aviso blando — un límite que solo avisa no es un límite.
  `:259 volatility_adjusted_size()` dimensiona por ATR para que 1R signifique lo
  mismo en ES que en SOL. Endpoints `POST /performance/portfolio-risk` y
  `POST /calculate/volatility-size`.
- **§5.1 Motor de backtest con validación** — nuevo `backend/backtest.py`.
  ⚠️ **Corrección al documento**: el análisis afirma que "backtest aparece solo
  como tema educativo, no como herramienta". Es **inexacto** — `server.py:3508`
  ya tenía un `POST /backtest` funcional con datos reales. Lo que de verdad
  faltaba, y es lo que se ha añadido, es la **validación**:
  separación in-sample/out-of-sample, **walk-forward** por ventanas rodantes
  (`backtest.py:564`), y sobre todo **contador de ensayos con corrección por data
  snooping** (`backtest.py:439 deflated_sharpe()`), que descuenta el mejor Sharpe
  por cuánto se buscó. Comisiones y slippage son parámetros con defecto **no nulo**:
  una estrategia que solo funciona a coste cero no funciona. Endpoint nuevo
  `POST /backtest/validate` (el viejo `/backtest` se deja intacto).
  ⚠️ **Límite medido, no prometido**: sobre 6 paseos aleatorios puros
  (sin ventaja posible por construcción) la corrección rechazó 5 y dejó pasar 1.
  El fallo se concentra con pocas combinaciones probadas, así que la respuesta
  incluye `low_power: true` por debajo de 20 ensayos y el veredicto lo dice en
  texto. No se vende como infalible porque no lo es.

#### 📚 Auditoría de opciones — resto

- **P0 #2 (griegas/IV/vega duplicadas)**: elegida la Academia como fuente canónica.
  `EducationTab.jsx:28 CanonicalLink` enlaza a `?topic=option-greeks` y
  `?topic=options-vol` desde las rejillas "Griegas a fondo" y "Conceptos de
  volatilidad" en vez de reexplicar. Para la sangría; **no** consolida los 4-6
  sitios (queda pendiente, ver abajo).
- **P2 #6 (pilar Avanzado con 27 temas planos)**: sub-agrupado en *núcleo avanzado /
  sistemas alternativos / macro y por activo* con `group` en `EDUCATION_NAV` y
  sub-cabeceras en el sidebar. **No se borró ni una línea de contenido.**
- **P2 #7 (Gann)**: `docs/ANALISIS_TECNICO_AVANZADO.md` lo clasifica como
  "mayormente infalsable" y aun así estaba al mismo nivel que Wyckoff. Movido al
  final del pilar Técnico y marcado `evidence: 'disputed'` con etiqueta y tooltip.
  No se borra: el contenido está escrito y ya incluye su apartado de mito vs.
  realidad; lo que se corrige es la **paridad estructural**.
- **P3 #9 (calendar/diagonal)**: **confirmado el desajuste**. `LegEditor.jsx` no
  tiene vencimiento por pata y no existen ids `calendar`/`diagonal` entre las
  estrategias de `mockData.js`, así que se explicaban dos estrategias que la
  calculadora no puede construir. Añadido aviso explícito en ambas fichas
  (`strategyNotBuildable`) en lugar de dejar al usuario buscando un botón que no
  existe.

#### ✅ Verificación

- `pytest tests/` → **345 passed / 74 skipped** (eran 264; **+81 tests nuevos** en
  `test_analytics_correctness_unit.py`, `test_options_edge_unit.py` y
  `test_pro_tools_unit.py`, cada uno fijando un defecto concreto de los documentos).
- `python -m py_compile *.py` OK (**20 módulos**: +`market_rates.py`,
  +`american_options.py`, +`portfolio_risk.py`, +`backtest.py`).
- `import server` → **188 rutas** (eran 181).
- `frontend/scripts/engine-check.js` (**30 comprobaciones**, añadido a CI): el
  simulador y el modelo del sistema producen números con los que se dimensionan
  posiciones y viven en el frontend, donde no hay pytest.
- i18n **5480 claves × 8 idiomas, 0 huecos** (+153 nuevas traducidas a los 8).
  ⚠️ Lección repetida: el prefijo `mc*` colisionaba con el módulo de macro
  (`mcTitle` = "Macro: ciclo, tipos y rotación") → renombrado a `mcsim*`. Es el
  mismo fallo que ya pasó con `bs*`/Black-Scholes: **comprobar el prefijo antes de
  escribir** (`node -e` sobre `es.js` + `es.edu.js`).
- ESLint **0 errores**; `npm run build` exit 0.

#### ⏳ Lo que estos documentos piden y sigue SIN hacer

- **Decisión sobre el proveedor de datos de opciones** (§3.2): Yahoo v7 da OI de
  ayer y no distingue at-bid/at-ask. Es una **decisión de negocio** (pagar
  Polygon/ORATS/Tradier o degradar Unusual Activity y Market Flow fuera del tier de
  pago), no de código. No se toca sin el dueño.
- **Precios y tiers** (§6), **matar el plan vitalicio**, **reducir a dos pasarelas**
  (§4), **podar las ~744 páginas SEO**: todas son decisiones de negocio.
- **Sincronización con IBKR/Binance** (§5.3): requiere credenciales y pruebas
  contra APIs reales; la red del sandbox está bloqueada.
- **Consolidar de verdad las griegas duplicadas** (P0 #2): se han puesto los
  enlaces canónicos, pero las 4-6 explicaciones independientes siguen existiendo.
  Borrarlas es trabajo de contenido con revisión humana.
- **P1 #3-#5**: fichas de `collar`, `bull_put_spread`, `bear_call_spread`,
  `jade_lizard`, `short_strangle`; módulo de **margen de opciones** (Reg-T, spread
  vs desnudo) separado de `margin-liq` (cripto); fiscalidad de ejercicio/asignación
  y covered calls cualificadas. Es redacción de contenido en 8 idiomas.
- **Frontend de las herramientas nuevas**: backtest validado, riesgo de cartera y
  precios americanos existen como **endpoints**, sin UI todavía.
- **UI para el bloqueo por límite de pérdida**: `compute_loss_limits` devuelve
  `blocked`, pero nada en el frontend lo hace cumplir aún.


### 2026-07-30 — Rediseño del panel de opciones: jerarquía de arriba abajo

Petición del dueño: *"más ordenado, limpio, fácil, organizado… lo principal
arriba y los extras y cosas de menor importancia y impacto más abajo"*.

**El diagnóstico.** El panel no estaba mal dibujado, estaba mal **ordenado**:

1. **Las tres decisiones que definen una posición vivían en tres zonas distintas
   de la página.** La estrategia ocupaba una barra propia con 33 tarjetas siempre
   desplegadas arriba del todo; el vencimiento estaba en la barra lateral derecha
   (bajo el plegado en móvil); y el número de contratos, enterrado en medio de la
   fila de métricas, entre el break-even y las comisiones.
2. **Un mismo bloque mezclaba datos y controles.** `StatsKPIBar` tenía las cinco
   métricas (que se leen), el input de comisión y el selector de contratos (que
   se tocan) y la lista de patas (que se edita en otro sitio), en una fila que se
   envolvía en cuatro líneas. La comisión aparecía **dos veces**.
3. **Nada indicaba qué era importante.** Lo accesorio se repartía entre tres
   botones sueltos de "▼ mostrar" (`AdvancedToggles`), un `TradeAdvancedPanel`
   siempre montado al final y `ExplainTrade` + `AITradeCoach` siempre visibles.
   Al revés: las **griegas** estaban escondidas tras un toggle, al mismo nivel
   que "mi cartera".

**El orden nuevo**, numerado en la propia interfaz:

| | Bloque | Qué contiene |
|---|---|---|
| **1** | Configura tu posición | Estrategia · vencimiento · contratos · comparar A/B |
| **2** | Resultado | 5 KPI + una línea con R:R, break-even, prima y comisiones |
| **3** | Gráfico y patas | Payoff con el deslizador de tiempo DENTRO de su tarjeta + editor de patas al lado |
| **4** | Griegas de la posición | Δ Γ Θ ν ρ siempre visibles, con qué significa cada una |
| — | Más análisis | Acordeón de 6 secciones, **todas cerradas** |

- ➕ **`SectionCard.jsx`** — sección plegable accesible (`aria-expanded`/`aria-controls`)
  con subtítulo que explica para qué sirve. Más `SectionHeading` para los pasos.
- ➕ **`PositionSetupBar.jsx`** — el paso 1. El selector de 33 estrategias pasa a
  desplegarse **bajo demanda**.
- ➕ **`GreeksStrip.jsx`** — resumen de griegas siempre visible.
- ➕ **`SecondaryPanels.jsx`** — un solo acordeón para lo accesorio, ordenado por
  impacto: entender la operación → contraste con tu histórico → griegas
  detalladas → cuánto arriesgar → tu cartera → costes y escenarios.
- ➖ **`AdvancedToggles.jsx` eliminado.**
- 🔧 `StatsKPIBar` reescrito: **sólo números** (se elimina la comisión duplicada).
- 🔧 `StrategyBar` sin marco ni `rightSlot` propios: se anida.
- 🔧 `OptionsSubHeader`: había **dos** indicadores de "en vivo" diciendo lo mismo.

**Bugs corregidos** (detalle en [`DIARIO_BUGS.md`](./DIARIO_BUGS.md)):
- **BUG-023 · La pestaña Cadena era inusable al abrirla.** La tabla estaba en un
  `flex-1/overflow-hidden` cuyo hijo `overflow-auto` no tenía altura acotada, así
  que scrolleaba la página y el `thead sticky` se pegaba al contenedor
  equivocado, quedando **oculto tras las barras fijas**. Ahora scrollea dentro de
  su tarjeta, y el scroll vuelve arriba al cambiar de pestaña.
- **BUG-026 · El aviso de datos modelados sólo salía en el optimizador.**
  `_synthetic_marker` marca las tres respuestas, pero sólo `OptimizeView` leía la
  bandera: en la calculadora y en la superficie de IV se pintaban primas, griegas
  y skew fabricados sin aviso. Nuevo `SyntheticDataBanner` en ambas, y el coach
  recibe la bandera.
- **BUG-024 · La UI afirmaba un tipo libre de riesgo distinto del backend.**
  `GreeksDisplay` pintaba `5.25%` fijo mientras el pricing usaba `market_rates`.
  Nuevo `GET /api/market/risk-free` que publica el tipo **y su procedencia**
  (`market_rates.get_risk_free_info` ya la calculaba y nada la exponía).
- **BUG-027 · El coach respondía siempre en español.** El backend acepta `locale`
  desde el PR #153 pero el frontend nunca lo enviaba.
- **BUG-025 · "1 patas activas"**, "Constructor de Legs" y "Limitado riesgo ·
  Ilimitado recompensa" (orden que sólo funciona en inglés).

## Reorganización del repositorio (2026-07-30)

La raíz tenía **10 `.md` sueltos** y `docs/` **27 documentos sin índice**, así que
encontrar algo dependía de recordar dónde estaba. Reordenado por intención, no por
tema.

**Movimientos** (todos con `git mv`, la historia se conserva):

| De | A | Por qué |
|---|---|---|
| `DIARIO_BUGS.md` | `docs/` | Doc vivo; era el único que quedaba fuera de `docs/` |
| `GOOGLE_CLOUD_SETUP.md`, `GOOGLE_OAUTH_SETUP.md`, `SEO_GUIDE.md` | `docs/setup/` | Se abren una vez, al dar de alta infraestructura |
| `ANALISIS_APIS_ADMIN_GOOGLE_2026-05-09.md`, `AUDIT_REPORT_2026-05-09.md`, `PLAN_100_FUNCIONAMIENTO_2026-05-09.md` | `docs/historico/` | Fotos de mayo; no describen el sistema actual |
| `test_result.md` (67 KB), `test_summary.txt` | `docs/historico/` | Residuo de Emergent: un protocolo de comunicación entre agentes de una plataforma retirada |

**Eliminado:** `_requests_stdlib_shim.py` — envoltorio de urllib que imitaba a
`requests` y que **ningún módulo importaba**. CLAUDE.md tenía que advertir de él;
quitándolo desaparecen el archivo y la advertencia. Y los 13 `iteration_*.json` de
`test_reports/` que estaban versionados por error (se conserva el `.gitkeep`).

La raíz queda en **`README.md` + `CLAUDE.md` + `SECURITY.md`**, que es lo que por
convención va ahí.

**Nuevo:**

- **[`docs/README.md`](./README.md)** — el índice que no existía. Agrupa los 27
  documentos por *para qué los vas a abrir* (empieza aquí / voy a escribir código /
  voy a desplegar / voy a captar usuarios / contenido / referencia / auditorías),
  con el tamaño de cada uno: un doc de 1.411 líneas y una checklist de 111 no se
  leen en el mismo momento.
- **`scripts/check-doc-links.py`** — verifica que los enlaces relativos resuelven.
  Existe porque este mismo trabajo destapó que `ESTADO_PROYECTO.md` citaba
  `docs/PLAN_DE_TRADING_spec.md`, que no estaba en el repo. Corre offline. Pilló un
  enlace roto en el índice nada más escribirlo.
- **`docs/PLAN_DE_TRADING_spec.md`** — el spec que faltaba, ya referenciado.
- **`README.md`** reescrito con el mapa del repo.

**Incoherencias corregidas** (la doc mentía a quien la leyera):

1. **CLAUDE.md decía que `backend_test_security.py` está en la raíz.** Estaba en
   `_archive/` desde antes. Quien buscara el fichero para evitarlo no lo encontraba.
2. **El `README.md` mandaba un comando roto.** Daba `DATABASE_URL` por TCP a
   `localhost:5432`, y CLAUDE.md documenta que eso falla con
   `CERTIFICATE_VERIFY_FAILED` porque `init_pool` trata cualquier host TCP como Neon
   y exige SSL. Corregido al socket Unix, que es lo que funciona.
3. **El skill `estado-proyecto` llevaba una lista de `py_compile` a mano** que
   CLAUDE.md ya marcaba como incompleta ("omitía 6"). Ahora `*.py`, y añadidos los
   checks de i18n, motor y enlaces que ya existían y no estaban en el skill.
4. **`check.sh` y los dos smoke de `tests/` apuntaban a `us-central1`** mientras el
   despliegue real está en `europe-west1`. Llevaban tiempo midiendo un host que no
   existe: fallaba todo, y no porque la API estuviera mal. Ahora leen `BACKEND_URL`
   del entorno y abortan si falta — no se inventa un hostname de producción.

**Verificado:** `py_compile` de todos los módulos · `pytest` 408 passed / 74 skipped
· i18n 5528 × 8 sin huecos · ESLint 0 errores · `engine-check` 30/30 ·
`check-fetch-credentials` OK · `npm run build` exit 0 (744 URLs) ·
`check-doc-links` 47 documentos, 0 roturas.

## Plan de trading versionado (2026-07-30) — backend completo

Implementación de [`PLAN_DE_TRADING_spec.md`](./PLAN_DE_TRADING_spec.md) §3, pasos 1, 2 y 4. El plan deja
de ser tres piezas desconectadas y efímeras y pasa a ser **la fuente de verdad de
los umbrales de riesgo del usuario**.

**El bug de fondo que esto arregla.** `detect_errors` juzgaba cada operación
contra tres constantes de módulo, así que el `rule_compliance_rate` del panel no
medía el cumplimiento del plan del usuario: medía **el cumplimiento de la opinión
de la app**. Un scalper que declara 1:1 al 65% de acierto —sistema válido— se
comía un `low_rr` en *todas* sus operaciones; quien decide arriesgar 0,5% máximo
no recibía ningún aviso al arriesgar 1,8%, porque el techo global era 2%.

| Pieza | Qué hay |
|---|---|
| `backend/trading_plan.py` | Modelo de 5 secciones, versionado, normalización, pertenencia a sesión, informe de cumplimiento. Todo lo que calcula es función pura sobre dicts |
| `trading_plans` (tabla) | Un documento por versión, nunca se sobrescribe. Registrada en la lista de arranque del shim — **no se autocrean** |
| `detect_errors(trade, *, plan=None, …)` | Cada umbral sale de `plan["risk"]`; con `plan=None` el comportamiento es idéntico al anterior |
| 5 reglas nuevas | `outside_session`, `unlisted_market`, `over_daily_limit`, `over_trade_count`, `traded_after_consecutive_losses` — sólo existen con plan |
| `GET/POST /api/plan`, `/history`, `PATCH /draft`, `GET /compliance` | Las cinco rutas del §3.2 |
| `plan_version` en cada operación | Sellado al crear, inmutable: un cambio de reglas no reescribe la historia que debía juzgar |

**Decisiones que conviene no deshacer:**

- **Un límite sin declarar es `None`, no 0.** Tratarlo como cero enterraría al
  usuario en violaciones de reglas que nunca escribió.
- **`require_stop_loss: false` silencia `no_sl`.** Hay sistemas reales sin stop
  por operación (spreads de opciones con pérdida máxima definida). Marcarlos para
  siempre enseñaba a ignorar la lista de errores entera.
- **La regla de enfriamiento avisa, no bloquea.** El plan declaró cuánta
  evidencia quería; cambiarlo antes es decisión del usuario. Lo que importa es
  que quede registrada.
- **`change_reason` obligatorio desde la v2** (422). Los planes no se abandonan,
  se erosionan excepción a excepción.
- **Un borrador NO es una versión.** Lo destapó un test: al guardar un borrador y
  luego activar el primer plan, el contador lo tomaba por una v2 y exigía motivo
  para un plan que no había gobernado ni una operación. `next_version_number()`
  filtra los borradores.
- **Una ventana horaria mal formada se descarta, no se convierte en "todo el
  día"**, e `is_within_sessions` devuelve `None` (no `False`) cuando no puede
  responder: nunca se reporta una violación que no se ha podido verificar.
- **`by_rule` se ordena por dinero, no por frecuencia.** "Has incumplido 6 veces"
  invita a encogerse de hombros; "esto te ha costado 412 €" no.

**Verificado contra Postgres real** (no sólo unit): las 5 rutas, persistencia del
modelo anidado en JSONB, ciclo v1→v2 con archivado, 422 sin motivo, aviso de
enfriamiento, borrador que no toca la activa, y lo importante — un plan con
`min_rr: 1.0` deja pasar un R:R 1.3, y con `max_risk 0.5%` marca un 1.2% diciendo
`threshold=0.5` y `plan_version=1`.

**Lo que falta** (pasos 3, 5 y 7 del §3.8, todo frontend): `TradingPlanEditor`
(asistente de 5 pasos), migración de `localStorage['tcp-trading-setup']`,
`printTradingPlan()` rellenado, checklist generada desde el plan, bloque de
cumplimiento con la matriz 2×2 en `AnalyticsDashboard`, y los enlaces sesgo →
módulo. El §3.6 (MAE/MFE) **ya estaba hecho** en el PR #153.


### Reconciliación de las dos auditorías (misma sesión)

Descartar el commit duplicado no cerraba la pregunta de **cuál de las dos
implementaciones era mejor en cada punto**. Repasadas una por una; en la mayoría
gana `main` y no se ha tocado nada:

| Punto | Gana | Por qué |
|---|---|---|
| Sortino | `main` | Devuelve `None` también con `len < 2`; la mía devolvía `0.0`, que se lee como "malo" |
| Anualización Sharpe/Sortino | `main` | Separa el cálculo en `_risk_adjusted_metrics` y expone además el valor por operación, el flag `annualized` y `trades_per_year` |
| Solver de IV | `main` | Tiene guarda de **identificabilidad** (`MIN_IDENTIFIABLE_VEGA`): rechaza respuestas donde el precio no es sensible a σ. A la mía le faltaba, y devolvía un 0,72 sin significado en strikes muy fuera de dinero |
| Semilla del solver | `main` | Brenner-Subrahmanyam según moneyness, en vez de un 0,30 fijo |
| MAE/MFE | `main` | `losers_gave_back` (cuántas perdedoras estuvieron ≥1R a favor) es más accionable que mi `losers_avg_mfe_r` |
| Definición de ruina en Monte Carlo | `main` | Usa el valle alcanzado, no sólo el balance final: una racha que baja del umbral y recupera igualmente reventó la cuenta |
| Marcado de datos sintéticos (backend) | `main` | `_synthetic_marker` en las tres rutas, con prosa de respaldo para clientes que no localizan |

Y **cuatro puntos donde la versión descartada era mejor**, aplicados sobre
`main` con test de regresión cada uno (`tests/test_reconciled_metrics_unit.py`,
13 tests):

- **BUG-028 · El tipo libre de riesgo se reintentaba en cada llamada.**
  `market_rates` cacheaba aciertos pero no fallos: `fresh` exige `rate is not
  None`, así que con el proveedor caído no había caché. **Medido: 25 llamadas →
  25 intentos de red**, y lo mismo con un valor previo caducado. Está en la ruta
  de `/options/chain`, `/optimize`, `/calculate/*` y `/performance/analytics`.
  Añadidos `FAILURE_BACKOFF_SECONDS` (15 min) y `timeout` parametrizable en
  `_yahoo_get` (4 s para la tasa, frente a los 15 s × 2 hosts heredados).
  Ahora: **25 → 1**.
- **BUG-029 · La sugerencia de stop se pintaba sin muestra.** El insight exigía
  ≥10 ganadoras; el panel leía el campo directo y no comprobaba nada, así que
  con 2 ganadoras recomendaba una anchura de stop. La guarda pasa al origen.
- **BUG-030 · La anualización no tenía techo.** 400 operaciones en 10 días →
  ≈14.610 ops/año → √≈121, convirtiendo un Sharpe por operación de 0,05 en un
  6,0. Añadido `MAX_TRADES_PER_YEAR = 2520`.
- **BUG-031 · La cabecera del simulador seguía siendo una tirada suelta.** El
  panel de distribución es nuevo, pero los KPI seguían saliendo de un
  `runSimulation` aparte: un ROI aleatorio justo encima de un P5–P95 que no lo
  contenía. Añadido PRNG con semilla y `medianPath` reproducible; al lanzar el
  barrido la cabecera pasa a la mediana y se etiqueta.

Además, `capture_ratio` (+ su insight y su tarjeta): la MAE responde "¿sobra mi
stop?" y no había nada que respondiese la pregunta espejo sobre el objetivo.

**⚠️ Nota de método — trabajo duplicado detectado y descartado.** Esta rama
llevaba un commit previo que aplicaba el mismo `ANALISIS_TRADER_20260728.md` que
el PR #153 ya había mergeado en `main` mientras se trabajaba: mismas correcciones
en `performance.py`, mismo VE/CVaR en el optimizador, un `rates.py` equivalente a
`market_rates.py`, y ficheros de test con nombres idénticos. La versión de `main`
es más amplia (opciones americanas, riesgo de cartera, backtest validado), así que
ese commit se **descartó** en lugar de mezclarlo, y sólo se rescató lo que `main`
no tenía: el endpoint del tipo libre de riesgo, el aviso de datos modelados fuera
del optimizador y el locale del coach. Lección: **comprobar `origin/main` antes de
empezar y no sólo antes de abrir el PR.**

**Verificación** (Chromium + Playwright, API mockeada porque el sandbox bloquea Yahoo):
- Orden vertical comprobado en el DOM: `position-setup` → `kpi-max-profit` →
  `time-slider` → `greeks-strip` → `secondary-panels`, ascendente. ✔
- **0 secciones del acordeón abiertas al cargar.** ✔
- Capturas a 1440×1000 y 390×844: el orden se mantiene apilado en móvil. ✔
- Pestañas Cadena, Optimizar y Flujo verificadas; acordeón abierto sobre los
  componentes de `main` (`ExplainTrade`, `GreeksDisplay`, `GreeksTimeChart`). ✔
- `pytest` **358 passed / 74 skipped** (+13 de la reconciliación) ·
  `node scripts/engine-check.js` **30/30** (contrato intacto) · ESLint **0
  errores** (125 avisos) · i18n **5522 × 8 idiomas, 0 huecos** (+41 claves) ·
  `npm run build` exit 0 · 0 errores de runtime en consola.

---

## 2026-07-31 — Auditoría del apartado de opciones

Ejecución de `AUDITORIA_OPCIONES_20260731`. El diagnóstico del documento era que el
motor de opciones es mejor que el de la competencia y el problema está en otra
parte: arquitectura de información, cobertura de estrategias y superficie pública.
Se ha trabajado en ese orden.

### Fase 0 — Los tres bloqueos

Los tres eran reales y estaban donde decía el documento.

1. **Multi-expiración** (BUG-032). Era un límite del **modelo de datos**, no un
   preset que faltara: todas las patas heredaban `currentExp.daysToExpiry`. Ahora
   cada pata lleva `expIdx`, `CalculatorPage` mantiene `{expIdx: chain}` y el
   backend sirve varias expiraciones en una llamada (`?expiration_idxs=1,3,6`,
   tope 8). En el motor, el argumento de tiempo pasa a ser el de la **pata más
   cercana** y de ahí se deriva el transcurrido por pata — con una sola
   expiración el comportamiento es idéntico al de antes, lo que hace el cambio
   compatible hacia atrás y así está fijado en `engine-check`.
2. **Tipo libre de riesgo** (BUG-033). El frontend pasaba `0.05` literal mientras
   el backend valoraba con `^IRX`. Hook `useRiskFreeRate` con caché de módulo y el
   valor + procedencia visibles bajo las griegas.
3. **Rango del gráfico** (BUG-034). `±35%` fijo → `2,5σ` del expected move, con
   suelo 10% y techo 150%.

De propina, un bug que la auditoría no vio: **cargar una posición guardada dejaba
todo a cero** (BUG-035), porque las patas se construían sin `enabled` y
`customBuiltLegs` filtra por ese campo.

### Estrategias: 33 → 66

Las 33 enumeradas en el documento, incluidas las 8 temporales que la Fase 0
desbloquea. El documento pedía "~35" para llegar a 68; se han añadido exactamente
las que enumera, así que **el total es 66, no 68** — no se ha rellenado para
cuadrar un número.

Las nuevas llevan el nombre en literal (los términos del sector no se traducen) y
las descripciones y el "cuándo usarla" en claves i18n × 8 idiomas. El `whenToUse`
se comparte por familia cuando la razón de uso es genuinamente la misma (las
cuatro escaleras, las tres de arbitraje), en vez de duplicar la misma frase con
otras palabras.

### Fase 2 — Métricas

`options_positioning.py`, nuevo, con **max pain, GEX (con la convención de
dealer explícita en la respuesta), perfil de OI por strike, ratio put/call,
semáforo de liquidez por contrato, term structure de IV y expected move**. Dos
endpoints nuevos: `/api/options/positioning/{symbol}` y
`/api/options/term-structure/{symbol}`.

La regla que gobierna el módulo: **son lecturas de posicionamiento observado**, así
que sobre cadena modelada devuelven `None`, no un número plausible. 34 tests, y
buena parte existen sólo para fijar esa negativa.

En el frontend: **heatmap precio × IV** (lo que el documento señalaba como la copia
más rentable), panel de posicionamiento, y **vanna, charm y vomma** —que existían
sólo como texto educativo— junto a las griegas primarias.

### Fases 1 y 3 — Superficie pública

- `/options` deja de ser el muro de pago y pasa a ser un **hub público** con el
  catálogo completo enlazable. El workspace en vivo se mueve a
  `/options/calculator`, sigue siendo premium y ahora va con `noindex`.
- `/options/strategies` y `/options/strategies/:slug`, públicas.
- El `postbuild` que ya existía (`gen-seo-pages.js`) genera **528 páginas de
  estrategia** (66 × 8 idiomas) con JSON-LD `HowTo`. El sitemap pasa de **744 a
  1273 URLs**. No se ha escrito contenido nuevo: se ha enrutado el que ya estaba.

### Lo que NO entra

- **`/options/glossary/:slug`, `/options/learn/:slug` y `/options/ticker/:symbol`.**
  El documento las pide y son el resto del camino a las ~120 URLs que estima. La
  maquinaria ya está montada (el generador, el sitemap, el patrón de slug), pero
  el glosario necesita antes un índice con slug del contenido de
  `tradingEducationContent.js`, que es trabajo de datos, no de rutas.
- **Prerender completo (react-snap / SSG).** Las páginas estáticas del postbuild
  cubren el caso de indexación sin que corra el JavaScript, que es el problema
  real; migrar la SPA entera a SSG es otra conversación.
- **Fusionar cadena + constructor en un paso 3 único**, subir IV rank/percentil y
  skew a un paso 1 de contexto, y las rutas `/options/chain/:symbol`,
  `/options/iv/:symbol` y `/options/flow/:symbol`. Es reordenación del workspace,
  no capacidad nueva.
- **Fase 4 entera** (paper trading, quizzes, backtest de opciones, calendario de
  earnings propio) y los extras de marketing (embed widget, compartir por URL).

**Verificación:** `pytest` **442 passed / 74 skipped** (+34) · `engine-check`
**60/60** (+30, `blackScholes.js` no estaba cubierto y ahora lo está) · ESLint **0
errores** · i18n **5633 × 8 idiomas, 0 huecos** (+105 claves) · `npm run build`
exit 0 con 1273 URLs · `check-doc-links` 47 documentos, 0 roturas.

---

## 2026-07-31 (2) — Publicidad: Google AdSense en el contenido gratuito

Petición: monetizar el contenido gratuito con Google AdSense, **y que quien paga
no vea anuncios ni cuando consulta ese contenido gratuito**. La segunda mitad es
la que ha gobernado el diseño.

### La regla, en un sitio y comprobada

`frontend/src/lib/adsPolicy.js` — módulo **puro y sin imports** con
`shouldShowAds(...)`. Sin imports a propósito: lo consumen tres runtimes que no
comparten nada (el hook de React, el generador de páginas estáticas del
postbuild y el verificador offline), y así la regla no se puede duplicar mal.

Un suscriptor no ve anuncios en ninguna ruta y, además, **el script de AdSense
ni siquiera se descarga en su navegador**: no basta con ocultar el bloque si el
usuario que paga sigue hablando con la red publicitaria. También se deniega
mientras la sesión no está resuelta (recarga + refresh silencioso), para que no
haya ni un parpadeo.

Las rutas con publicidad son **lista blanca** (`AD_SURFACES`), no decisión de
quien monta el componente: soltar un `<AdSlot>` en el dashboard no pinta nada.

### Dónde se anuncia

- **SPA**: hub público de opciones, índice de estrategias y las 66 fichas.
- **Estáticas del postbuild**: las 1273 URLs (`/tools`, `/learn`, `/markets`,
  `/options/strategies`, ×8 idiomas), 2 huecos por página.
- **Fuera**: dashboard y demás rutas de pago, pricing/login/pago (conversión),
  legales/contacto/about (texto fino), la landing (es página de venta) y
  `/news`, que hoy es una maqueta con filas de relleno — anunciar sobre
  contenido de mentira es motivo de suspensión de cuenta.

### El puente con las páginas estáticas

Esas páginas son HTML plano, sin sesión. Antes de tocar la red comprueban la
marca `tcp-ads` que escribe la SPA (`AdsBootstrap`) **y**, como respaldo, la
sesión persistida de Zustand — lo segundo se añadió tras verlo fallar en el
smoke: un premium recién logueado que aterriza desde Google todavía no tenía la
marca. Queda un límite aceptado y documentado: en un dispositivo donde nunca ha
iniciado sesión, sí vería anuncios hasta entrar en la app.

### Consentimiento y textos legales

- El banner de cookies concede ahora `ad_storage`/`ad_user_data`/
  `ad_personalization` con «Aceptar todo» (antes iban siempre denegados) y emite
  `tcp:consent` para que los huecos aparezcan sin recargar.
- Las páginas estáticas llevan su propio banner mínimo en JS plano, traducido a
  los 8 idiomas, que escribe **la misma clave**.
- **Textos legales corregidos en los 8 idiomas**: el banner y la política de
  cookies decían literalmente «no mostramos anuncios de terceros ni compartimos
  datos con redes publicitarias». Con AdSense eso pasaba a ser falso. Se han
  actualizado banner, política de cookies (sección de publicidad reescrita),
  finalidades, base jurídica del art. 6(1)(a) y la lista de terceros.

### Lo que NO se ha hecho (y por qué)

- **No se enciende nada.** Sin `REACT_APP_ADSENSE_CLIENT` el sitio queda byte a
  byte como estaba. Las variables van al workflow como *variables* de repositorio.
- **Bloqueo real: el dominio propio.** En `abcde-rgb.github.io/Tradingcalculatorpro.com`
  AdSense no es viable — `ads.txt` tiene que estar en la raíz del dominio y hay
  que acreditar la propiedad del sitio, y ninguna de las dos cosas se puede con
  un subdirectorio de un dominio de GitHub. El código ya es correcto para el día
  que se active `tradingcalculatorpro.com` (con `CNAME`, el build es la raíz).
- **La CMP propia no está certificada.** Para el EEE Google exige una CMP de su
  lista. Lo más simple es activar la suya (gratuita) y poner
  `REACT_APP_ADSENSE_CMP=google`. Mientras tanto nuestro banner es *más*
  restrictivo de lo que Google pide, así que no se sirve nada sin consentimiento.

### Nuevo

`lib/adsPolicy.js` · `lib/ads.js` · `components/ads/AdSlot.jsx` ·
`components/ads/AdsBootstrap.jsx` · `scripts/ads-check.js` (en CI) ·

**Verificación:** `ads-check` **26/26** · smoke real en Chromium **24/24**
(premium: 0 huecos y 0 peticiones a `pagead2`; gratuito: huecos y script;
estáticas: banner → aceptar → 2 `<ins>`; «solo esenciales» no carga nada) ·
ESLint **0 errores, 125 avisos** (los mismos de antes) · i18n **5635 × 8
idiomas, 0 huecos** (+2 claves) · `npm run build` exit 0 → 1273 URLs + `ads.txt`
· build sin las variables: **0 rastros** de publicidad y `ads.txt` borrado.

### 2026-08-02 — Portugués e italiano: 10 idiomas de punta a punta
- ✅ **`pt` (Portugal, pt-PT) e `it` completos**: las **5.635 claves** traducidas
  a mano en los dos, `i18n-check` en verde para los 10 idiomas (0 huecos).
  Sin caídas al español: los diccionarios están completos, no rellenados.
  - Se tradujo también toda la academia (`<lang>.edu.js`), que es ~2.100 claves
    de prosa larga; el resto de idiomas ya la tenía.
  - Portugués **europeo**, no brasileño (decisión del usuario): «ecrã», «rutura»,
    «fica»; y los reguladores/ejemplos locales se adaptan (CMVM en pt, CONSOB
    en it, PSI 20 / FTSE MIB en el módulo de índices). El ejemplo fiscal sigue
    siendo España, como en el resto de idiomas.
- ✅ **Andamiaje**, no sólo el diccionario:
  - `lib/i18n.js` (`LOCALE_LOADERS`, `SUPPORTED`, `EDU_LOADERS`, `languages`),
    `hooks/useSEO.js` (`pt_PT` / `it_IT`) y `components/common/FlagIcon.jsx`
    (banderas SVG nuevas).
  - `scripts/gen-seo-pages.js`: `pt`/`it` en `LANGS`, `UI`, `ADS_UI`, `MARKET_UI`,
    `STRAT_UI` y las 12 entradas de `CALC_I18N`. El sitemap pasa de **1273 a
    1589 URLs** (120 calculadoras + 700 educación + 100 mercados + 660
    estrategias). Los contadores del log ya derivan de `LANGS.length`, así que
    no se vuelven a quedar obsoletos al añadir un idioma.
  - `public/index.html`: `hreflang` pt/it, `og:locale:alternate`, `inLanguage`
    y `availableLanguage` del JSON-LD.
  - `lib/legalContent/pt.js` + `it.js` (traducción de cortesía completa:
    privacidad, términos, cookies y aviso de riesgo) registrados en `index.js`.
    Hasta ahora esas dos rutas caían al español.
  - `scripts/i18n-check.js` y `scripts/split-i18n-edu.js` incluyen pt/it.
  - «8 idiomas» → «10» en `index.html` y en las claves `authTrustLangs`,
    `statsLanguages` y `seoLandingDesc` de los 10 diccionarios.
- ✅ **Verificado**: `npm run build` exit 0 · `i18n-check` 10/10 sin huecos ·
  `engine-check` 60/60 · `ads-check` 26/26 · ESLint 0 errores (125 warnings, la
  línea base) · páginas estáticas `build/pt/**` y `build/it/**` generadas con su
  `hreflang` correcto.
- ⚠️ **Pendiente**: nadie nativo ha revisado las dos traducciones. Están hechas
  con cuidado y con la terminología del sector sin traducir (order block, funding
  rate, spread…), pero antes de anunciarlas conviene una pasada de un hablante
  nativo, sobre todo en la academia y en los textos legales.

### 2026-08-02 (2) — Fuera AdSense; todo el contenido tras el muro de pago
Cambio de modelo de negocio pedido por el propietario: se retira la publicidad y
el sitio pasa a ser **de pago íntegro**, con prueba de 7 días como única puerta.

- ✅ **AdSense eliminado de raíz**, no desactivado. Borrados `lib/ads.js`,
  `lib/adsPolicy.js`, `components/ads/*`, `scripts/gen-ads-txt.js`,
  `scripts/ads-check.js` y `docs/MONETIZACION_ADS.md`. Fuera también el paso de
  CI, las 4 variables del workflow de Pages, las de `.env.example`, las reglas
  `Mediapartners-Google`/`AdsBot-Google` de `robots.txt`, las claves i18n
  `adsLabel`/`adsRemove` en los 10 idiomas y los párrafos de publicidad de los
  textos legales (los 8 originales se restauraron desde `aae872f^`; pt/it se
  recortaron a mano).
  - Se retiró además una **segunda** integración que no era del PR de ads: el
    ajuste `adsense_publisher_id` cargaba auto-ads desde `GoogleIntegrations.jsx`.
    Quitado del frontend, de `admin_routes.py` y de `server.py`.
  - `CONSENT_KEY` vivía en `adsPolicy.js`; ahora vive en `CookieBanner.jsx`, que
    es su único consumidor. El banner ya sólo concede `analytics_storage`: las
    señales `ad_*` siguen denegadas desde `index.html` y nadie las concede.
- ✅ **Muro de pago total.** `premiumOnly` en `/education`, `/options`,
  `/options/calculator`, `/options/strategies`, `/options/strategies/:slug` y
  `/news` (ya lo tenían `/dashboard` y `/performance`). Un registrado sin plan
  sólo puede llegar a landing, precios, legales, contacto, «sobre» y al flujo de
  pago —`/settings` y `/subscription` siguen siendo sólo-auth para que pueda
  gestionar la cuenta y suscribirse.
- ✅ **Las páginas estáticas pasan a ser anzuelo.** Mantienen título, primer
  párrafo, enlaces relacionados y una llamada «7 días gratis» que apunta a
  `/pricing`; el deep-link a la app queda como enlace secundario. Se retiran la
  receta de las estrategias (patas, riesgo, máximos, cuándo usarla), y en las
  fichas de mercado las tablas de medición y ejemplo y las FAQ.
  - Con ellas se van los schemas `HowTo` y `FAQPage`: describían contenido que ya
    no está en la página, y un marcado que no casa con lo visible es un problema
    con Google, no una ventaja. Las fichas de estrategia emiten `WebPage`.
  - El sitemap se queda en **1589 URLs**: no se pierde indexación, se pierde
    contenido regalado.
- ℹ️ **El trial ya estaba bien montado y no se ha tocado**: `TRIAL_PERIOD_DAYS = 7`,
  tarjeta por adelantado vía Stripe Checkout (`trial_period_days`), sólo para
  nuevos suscriptores y planes recurrentes, y cobro automático al vencer salvo
  cancelación. Es la opción elegida frente a pedir confirmación explícita.
- ✅ **Verificado**: ESLint 0 errores (125 warnings, la línea base) · i18n 10/10
  sin huecos (5650 claves) · engine 60/60 · `npm run build` exit 0 con 1589 URLs ·
  `py_compile` de todos los módulos del backend · enlaces de doc OK.
  ⚠️ `pytest` **no** se pudo correr en el contenedor (faltan `fastapi`/`scipy`);
  el cambio de backend son 3 líneas borradas de un ajuste y CI lo cubre.
- ⚠️ **Pendiente de decidir**: `/affiliate` sigue siendo sólo-auth. Un registrado
  sin plan ve la página aunque el backend (`_is_paying_member`) no le deje entrar
  al programa. Si debe caer también tras el muro, es una línea.

### 2026-08-02 (3) — Marca nueva y tarjeta social
Llega el pack de marca (monograma TC + velas, fondo `#080808`, primario `#17CF63`)
y se aplica a todo lo que lleva logo.

- ✅ **Iconografía completa** en `public/`: `favicon.svg` (variante simplificada a
  2 velas, que a 16 px las 3 se empastan), `favicon.ico` con 16 y 32 px dentro
  —Google lo pide para el icono de resultados y algún navegador viejo ignora el
  SVG—, `apple-touch-icon.png` (180), `icon-192`, `icon-512` y
  `icon-512-maskable` con la zona de seguridad de Android. `manifest.json`
  apunta a todos y `theme-color` pasa de `#22c55e` a `#080808`.
- ✅ **`BrandMark.jsx`**: el monograma como SVG inline, no `<img>`, para que
  herede el tamaño por clase y no añada una petición a lo primero que pinta la
  web. Sustituye al icono genérico `TrendingUp` en cabecera y pie, y se inyecta
  también en el `.brand` de las páginas estáticas.
- ⛔ **El wordmark NO sale del pack.** Su SVG horizontal lleva el nombre como
  `<text>` con una pila de fuentes del sistema: se vería distinto en cada
  máquina. El propio README del pack pide convertirlo a curvas antes de
  publicar. Hasta entonces la cabecera lo escribe con `font-unbounded`, que es
  la fuente real del sitio.
- ✅ **`og-image` rehecha** (`scripts/gen-og-image.js`, herramienta manual, NO
  entra en el build). Marca nueva, titular real de la landing y la oferta de 7
  días. El texto sale **vectorizado** glifo a glifo desde Unbounded e Inter: un
  `<text>` con fuentes del sistema se renderiza distinto en cada máquina, y esta
  imagen es exactamente lo que ve quien recibe el enlace.
  - `og-image.svg` deja de ser editable a mano a cambio de no depender de
    ninguna fuente instalada. Se edita el script y se regenera.
  - Detalle de implementación: se compone glifo a glifo en vez de con
    `font.getPath()`, que revienta con las tablas `ccmp` de Inter
    (`lookupType: 6 substFormat: 2 is not yet supported` en opentype.js).
- ✅ **Los textos de la tarjeta ya no mienten.** Seguían diciendo «Gratis» y
  «8 Idiomas» después de cerrar el muro: corregidos `<title>`, `description`,
  `og:description`, `twitter:description` y los dos `image:alt` de `index.html`,
  más `seoLandingDesc` en los 10 idiomas.
  - También el JSON-LD: fuera la oferta «Free Plan» a 0 € (quedan mensual 17 €,
    trimestral 45 € y anual 200 €) y fuera el `Course` a precio 0 «Free». Un
    marcado que promete gratis lo que está tras el muro es un problema con
    Google, no una ventaja.
- ℹ️ **El enlace de afiliado comparte la misma tarjeta.** `/?ref=CODE` devuelve
  el `index.html` de la SPA, así que WhatsApp, Telegram y X leen sus `og:*` y
  enseñan `og-image.png`. Verificado sirviendo el build y pidiendo la URL con
  `User-Agent` de WhatsApp: `http=200` y la tarjeta completa. Si algún día se
  quiere una imagen distinta para invitaciones, hace falta una página estática
  propia (`/invite/`) con sus metas; no se puede variar por query string.
- ✅ **Verificado**: ESLint 0 errores · i18n 10/10 (5650 claves) · `npm run build`
  exit 0 con 1589 URLs · monograma comprobado en navegador real (cabecera SPA y
  página estática) · favicons revisados a 16/32/180 px.
- ⚠️ **Pendiente**: `favicon` por tema (el pack trae variantes oro y nasdaq, ya
  copiadas a `public/`) y revisión nativa de las traducciones pt/it.

### 2026-08-02 (4) — Los extremos del payoff se medían sobre el gráfico
Reportado por el propietario: en opciones, «beneficio máximo» ponía un número
fijo donde en algunos casos es ilimitado. Detalle y causa raíz en
[`DIARIO_BUGS.md`](./DIARIO_BUGS.md) (BUG-036); aquí lo que hay que saber para
tocar este código.

- ✅ **`payoffBounds` (JS) / `payoff_bounds` (Py) es ahora la única fuente de los
  extremos.** Los tres sitios que hacían `max()/min()` sobre los puntos del
  gráfico —`strategyStats.js`, `_payoff_summary`, `_score_strategy`— llaman a
  ella. La rejilla del gráfico sigue siendo la rejilla del gráfico: sirve para
  dibujar, no para decidir el peor caso.
- ✅ **Lo acotado se decide por la estructura, no muestreando.** `far_upside_slope`
  suma la pendiente del payoff en el límite S→∞: una call comprada aporta
  +100 por contrato, una vendida −100, una put 0 (vale cero ahí arriba) y la
  acción ±su número de títulos. Pendiente positiva ⇒ beneficio sin acotar;
  negativa ⇒ pérdida sin acotar. Sale gratis y es exacto, también para una pata
  que aún conserva valor temporal (calendars): es una afirmación sobre el
  límite, no sobre un precio.
  - Cae solo: una covered call (100 acciones + 1 call vendida) da pendiente 0 y
    queda acotada por ambos lados, sin lista de excepciones que mantener.
- ✅ **El extremo finito se evalúa en S=0 y en cada strike.** Son los únicos
  vértices de una función lineal a trozos, así que el resultado es exacto. Esto
  arregla un tercer caso que no era «ilimitado» sino directamente **mal**: una
  put comprada K=100 vale como mucho 9.800 € y la rejilla devolvía 3.300.
- ✅ **Sin acotar es `null`, nunca un número.** Y lo que se deriva de ello queda
  indefinido: ROI sobre un beneficio sin acotar y R/R sobre un riesgo sin acotar
  se pintan `—`, no `Infinity%` ni 0. Kelly se declara no aplicable en vez de
  concluir «sin edge» (antes `parseFloat('Unlimited') || 0` lo mandaba a 0).
- ✅ **Verificado**: 11 tests nuevos en `test_options_math_unit.py` (452 pasan en
  total) · paridad exacta entre el motor JS y el de Python sobre 8 estructuras ·
  ESLint 0 errores · i18n 10/10 (5652 claves, 2 nuevas para Kelly) ·
  `engine-check` 60/60 · `npm run build` con 1589 URLs.
  ⚠️ `tests/test_route_uniqueness_unit.py` falla 2 casos en este contenedor,
  **también sin mis cambios** (comprobado revirtiendo): es del entorno, no del
  código, y en la CI pasa.

### 2026-08-02 (5) — Grupo A: fuera Yahoo y CoinGecko de forex, tipos y cripto
Primer tramo del saneamiento de licencias de datos. Sustituye las fuentes **sin
licencia** por otras que sí permiten mostrar el dato en un producto de pago.
Mismo número en pantalla, distinta procedencia: no hay cambio visible salvo el
señalado abajo.

- ✅ **Tipo libre de riesgo: `^IRX` de Yahoo → Tesoro de EE. UU.**
  `market_rates.py` lee el `BC_3MONTH` de la Daily Treasury Par Yield Curve. Es
  publicación del gobierno estadounidense, o sea **dominio público**: se puede
  reutilizar dentro de un producto de pago sin contrato ni cuota. De paso es
  marginalmente más correcto — `^IRX` cotiza el *discount rate* del billete a 13
  semanas y la curva par da un rendimiento equivalente a bono, que es lo que
  quiere Black-Scholes. El feed es por año natural, así que en enero mira
  también el año anterior.
- ✅ **Forex: ExchangeRate-API + Yahoo → BCE** (`ecb_rates.py`).
  El BCE publica sus tipos de referencia para que se reutilicen. Se lee el feed
  de 90 días, no el diario, porque así sale **la variación real**: la ruta
  anterior mandaba `change: 0.0` en todos los pares siempre — un cero que no era
  un cero sino un «no lo sé» disfrazado. ⚠️ Contrapartida honesta: el BCE
  publica **una vez por día hábil**, sobre las 16:00 CET; estos tipos no se
  mueven intradía. Los 10 pares que sirve `/forex-prices` los cubre enteros.
  - El BCE cotiza todo contra el euro, así que cualquier par se arma cruzando
    por él. Lo que no publique **no se sustituye** por un primo cercano: un
    USD/CNH servido con yuan onshore se lee en pantalla igual que el bueno.
- ✅ **Cripto: CoinGecko → Binance + Kraken** (`crypto_data.py`).
  Todas las llamadas a CoinGecko salían **sin clave** contra su endpoint
  público, cuyo plan gratuito no trae licencia comercial. Se han sustituido las
  cuatro rutas: `/prices`, el OHLC universal de `server.py`, el de
  `missing_apis.py` y el poller de `realtime_alerts.py`. Las 76 monedas caben en
  **una sola petición por lotes** a Binance, lo que además quita de encima los
  429 que daba CoinGecko en un bucle de 30 s.
  - **Kraken manda sobre Binance** en los 20 pares que cubre: cotiza contra
    dólar de verdad y Binance contra Tether. La sustitución va etiquetada en
    `source` (`binance:USDT` / `kraken:USD`).
  - Las velas pasan a ser **OHLC de verdad**. Antes se agrupaba la serie de
    precios de CoinGecko en cubos y se llamaba a eso velas: el máximo y el
    mínimo de una vela así son los de las muestras que cayeron dentro, no los
    del periodo.
  - El precio en euros es **derivado** del dólar con el tipo del BCE, que es lo
    que hacía CoinGecko por dentro. Sin tipo de cambio no se inventa: se omite.
- ✅ **Fuera los datos inventados del fallback de `/prices`.** Servía
  `bitcoin: {usd: 97000}` y diez monedas más **sin etiquetar** cuando CoinGecko
  fallaba. Ahora una moneda que no se ha podido leer simplemente falta.
  - 🔸 **Único cambio visible**: `PriceTicker` ya no pinta «$0» para una moneda
    sin dato — la oculta. Y si hay precio pero no variación, pinta `—` en vez de
    una flecha verde al 0,00%.
- ✅ **Fuera el ajuste muerto `coingecko_api_key`.** El panel de admin ofrecía un
  campo «API Key (Pro)» que se guardaba y **no leía ninguna petición**: daba
  sensación de estar licenciado sin estarlo. El chequeo de conectores hacía ping
  a CoinGecko, que ya no interviene; ahora comprueba Binance y el BCE.
- ✅ **Verificado**: 47 tests nuevos (500 pasan en total) · `py_compile` de todos
  los módulos · ESLint 0 errores · i18n 10/10 (5652 claves) · `npm run build` con
  1589 URLs.
  ⚠️ **Nada de esto se ha probado contra la red**: el sandbox sólo deja salir a
  registros de paquetes. Los parsers se prueban contra muestras de las
  respuestas reales; el primer contacto de verdad será en Cloud Run. Hay un
  probador en el historial de la conversación para lanzarlo desde una máquina
  con salida.
  ⚠️ `tests/test_route_uniqueness_unit.py` falla 2 casos en este contenedor,
  **también sin estos cambios** (comprobado revirtiendo): es del entorno.
- ⏭️ **Grupo B, pendiente y con decisión de negocio detrás**: acciones y ETFs de
  EE. UU. (→ IEX, que no cobra cuotas de licencia), los 23 índices (→ ETF
  equivalentes, para esquivar la licencia del dueño del índice), los 15 futuros
  de materias primas (→ ETF) y la cadena de opciones (→ la sintética que ya
  existe). Eso sí cambia lo que ve el usuario.

### 2026-08-02 (6) — Yahoo desaparece de todo lo que se publica
Decisión del propietario: se mantiene Yahoo como fuente de acciones, índices,
materias primas y cadena de opciones —el Grupo B queda pendiente de presupuesto—
pero **deja de aparecer en cualquier superficie pública**.

⚠️ **Esto reduce la prueba, no el problema.** El riesgo de licencia sigue ahí
mientras Yahoo sea la fuente; lo que se retira es haberlo estado anunciando como
argumento de venta, que era lo que lo agravaba. Ver la revisión de proveedores
en el histórico de la sesión.

- ✅ **Cuatro claves i18n reescritas en los 10 idiomas**: `livePatternIntro`,
  `optionsChainRealtime`, `optionsGateDescription` y `faqA3_l061`. De paso caen
  dos afirmaciones que además eran **falsas**: la cadena de opciones no es «en
  tiempo real» (Yahoo la sirve con retardo) y el forex ya no lo es tampoco,
  porque el BCE publica una vez al día. La FAQ ahora dice la verdad: cripto en
  tiempo real, el resto puede ir con retardo.
- ✅ **`dataAttribution` corregida**: decía «CoinGecko y TradingView» y CoinGecko
  ya no interviene. Ahora acredita a TradingView —cuya atribución es requisito
  de licencia, no cortesía— y al BCE.
- ✅ **Tres textos fijos** fuera de i18n: `PortfolioGreeks`, `ContactPage` y
  `AboutPage`.
- ✅ **El campo `source` de las respuestas** pasa de `yfinance`/`yahoo` a
  `market`. Viajaba al navegador y se leía en la pestaña de red.
- ✅ **`/quote/{symbol}` es público y su campo `error` nombraba al proveedor que
  había fallado.** Ahora devuelve el recuento; el detalle va al log, que es
  donde sirve. `provider_status()` sigue dando los nombres enteros pero cuelga
  de `/admin/market-data-health`, que es sólo admin.
- ✅ **Source maps apagados** (`GENERATE_SOURCEMAP=false` en el script de build).
  Eran el último sitio donde quedaba el nombre, porque publican el código fuente
  entero —comentarios incluidos— y ahí sí hay comentarios que citan a Yahoo.
  Se iban **20 MB por despliegue** que no consumía nadie: no hay Sentry ni nada
  que los lea. Se apaga en `package.json` y no en el workflow para que un build
  local produzca exactamente lo que se publica.
- ℹ️ **Lo que NO se ha tocado, a propósito**: los comentarios de código y el
  identificador `toYahooSymbol` de `StructureScanner.jsx`. No son visibles (la
  minificación los borra o los renombra, y ya no hay source maps), y renombrarlos
  haría que el código mintiera sobre lo que hace: ese conversor existe porque el
  backend pide tickers en formato Yahoo. Cuando caiga el Grupo B se van solos.
- ✅ **Verificado**: `grep` sobre `build/` entero → **cero apariciones** de
  «Yahoo» y «yfinance» en todo lo que se publica · 501 tests pasan (3 nuevos,
  2 reescritos para fijar que el error público no nombre al proveedor) ·
  ESLint 0 errores · i18n 10/10 · build con 1589 URLs.

### 2026-08-03 — Retirado el workflow de despliegue del backend
Decisión del propietario: se elimina `.github/workflows/deploy-cloud-run.yml`.

- ✅ **Borrado el workflow.** No tocaba el código del backend: fallaba en el paso
  de autenticación (`google-github-actions/auth`, error `invalid_target` sobre el
  pool de Workload Identity Federation).
- ✅ Referencias actualizadas en `README.md`, `CLAUDE.md`, `DEPLOY_CHECKLIST.md`,
  `MIGRACION_NEON.md` y `setup/GOOGLE_CLOUD_SETUP.md`. Las entradas fechadas del
  histórico se dejan como estaban: describen lo que era cierto entonces.
- ℹ️ **`cloudbuild.yaml` se queda.** Es el camino equivalente lanzado a mano desde
  GCP y no depende de GitHub, así que sigue siendo la vía para desplegar backend.
- ℹ️ **`ci.yml` no se toca**: sigue compilando y pasando los tests del backend en
  cada PR. Lo que desaparece es el despliegue automático, no la validación.

### 2026-08-03 (2) — Revisión de toda la documentación contra el código de `main`
Petición del propietario: revisar y estudiar **todos** los documentos del repositorio,
actualizarlos y redactar qué falta a día de hoy comparado con el código real. Sin
tocar código de producto: esta sesión sólo mide y corrige documentación.

**Cómo se ha medido** (no de memoria: ejecutado sobre `main` @ `7864406`):
`pytest` **503 passed / 74 skipped** · `import server` → **195 rutas** · `py_compile`
de los **24** módulos · ESLint **0 errores / 126 avisos** · `i18n-check` **5652 × 10,
0 huecos** · `engine-check` **60/60** · `npm run build` exit 0 → **1589 URLs**, 38 MB ·
`check-doc-links` 47 documentos, 0 roturas.

- ✅ **§1, §2, §4 y §5 reescritas con cifras medidas.** La deriva era grande y toda
  en la misma dirección —el documento se quedaba corto—: 16 módulos declarados
  contra 24 reales, 15 508 líneas contra 19 831, `server.py` 7377 contra 8232, 181
  rutas contra 195, 345 tests contra 503, 5635 claves i18n contra 5652, 24 rutas de
  frontend contra 26, 28 componentes de opciones contra 37.
- ✅ **§6 ya no manda dar de alta AdSense.** Sobrevivió un día entero al borrado de
  la publicidad. Es literalmente el fallo que el aviso de la cabecera denuncia con
  OxaPay, repetido con otro nombre, así que en su lugar queda una nota que lo
  explica en vez de un hueco silencioso.
- ✅ **G-02 y G-04 cerrados con prueba**, no por antigüedad: 503 tests en 34 ficheros
  y `test_route_uniqueness_unit.py` en verde sobre las 195 rutas. De paso queda
  anotado que las 2 caídas de ese test que registraron las sesiones del 2026-08-02
  eran del contenedor de aquel día: aquí pasa.
- ✅ **Seis huecos nuevos (G-14 … G-19)**, todos verificados en el código:
  - **G-14 es el grande.** `trading_plan.py`, `backtest.py`, `portfolio_risk.py` y
    `american_options.py` —**~1770 líneas**, enrutadas y con tests— no los llama
    **nadie** desde el frontend. Grep de los ocho endpoints en `frontend/src`: cero
    resultados. `perfFeatBacktesting` en `PerformancePage` es una viñeta de
    marketing, no una pantalla; `rule_compliance_rate` sale de `performance.py`, no
    del plan de trading. Es trabajo terminado que no llega al usuario.
  - **G-15**: `trading_plans` guarda `user_id` y tiene índice propio, pero no está
    en `delete_account`, ni en `_USER_DATA_COLLECTIONS`, ni en `/auth/my-data`.
    Borrar la cuenta deja los planes en la base de datos. Es la misma trampa que
    ya obligó a listarla a mano en `known`: la colección se añadió tarde y sólo se
    enchufó donde daba error inmediato.
  - **G-16** (Grupo B: Yahoo sigue sirviendo acciones, índices, materias primas y
    la cadena de opciones), **G-17** (el shim `Collection` sigue sin tests y por eso
    bloquea el refactor), **G-18** (`check-doc-links.py` no corre en CI) y **G-19**
    (`on_event` y `class Config` deprecados).
- ✅ **Documentos hermanos corregidos**: `PENDIENTES.md` (Binance ya estaba hecho y
  seguía en la lista; dos referencias a documentos inexistentes), `docs/README.md`
  (tamaños), `CLAUDE.md` (faltaban `crypto_data.py` y `ecb_rates.py` en la tabla de
  módulos) y `DEPLOY_CHECKLIST.md` (§G afirmaba que `frontend/public/CNAME` ya
  existe y tres párrafos después decía lo contrario; no existe).
- ℹ️ **Los documentos fechados no se han tocado**, por convención: `AUDITORIA_2026-07-27`,
  `BACKLOG_AUDITORIA_2026-07-27` y `EXAMEN_FINAL_2026-07-26` describen lo que era
  cierto entonces. Lo que de ellos sigue abierto se ha traído a §3 y §5, que es
  donde se mira.
- ⚠️ **Nada de esto se ha probado contra la red**: el sandbox sólo deja salir a los
  registros de paquetes. Lo verificado es lo que corre offline.
### 2026-08-05 — El login dependía de una variable de entorno del despliegue
Reportado por el propietario: no se puede iniciar sesión. Causa raíz y detalle en
[`DIARIO_BUGS.md`](./DIARIO_BUGS.md) (BUG-037); aquí lo que hay que saber para no
repetirlo.

- 🔍 **Cómo se encontró.** Leyendo el código no salía: el flujo de login es
  correcto de punta a punta. Se levantó el backend contra un PostgreSQL real y se
  reprodujo el login en Chromium sobre el build de producción, servido bajo la
  misma ruta base que GitHub Pages (`/Tradingcalculatorpro.com`). Registro, login,
  muro de pago, cookies, recarga y refresh silencioso: todo verde. El fallo sólo
  aparece al mandar el `Origin` **real** de producción.
- ⚠️ **Por qué nadie lo vio antes.** Sin cabecera CORS el backend responde **200 y
  con las cookies puestas**; es el navegador quien tira la respuesta. En los logs
  de Cloud Run el login se ve perfecto, y `curl` tampoco lo reproduce porque
  ignora CORS. En pantalla sale «No se puede conectar al servidor», que manda a
  investigar la red en vez de la configuración.
- ✅ **El origen servido entra por código.** `https://abcde-rgb.github.io` estaba
  sólo en la variable `CORS_ORIGINS` del despliegue, y la lista del código
  contenía únicamente el dominio propio, **que no está en uso**. Desde el
  2026-08-03 el backend se despliega a mano: un `gcloud run deploy` sin
  `--set-env-vars` borra las variables y tumba el login del sitio entero.
- ✅ **`FRONTEND_URL` unificada.** Caía a `https://tradingcalculatorpro.com` en
  cuatro puntos de `server.py` y en `_trusted_link_base` de `missing_apis.py` —un
  dominio que no se sirve—, así que la misma variable perdida mandaba los enlaces
  de verificación, reset y magic link a la nada. Ahora hay una sola constante,
  `DEFAULT_FRONTEND_URL`, con el mismo valor que ya ponía el despliegue.
- 🔒 **La seguridad no se relaja.** La lista sigue siendo fija y nunca derivada de
  la petición: `evil.com` sigue sin recibir cabecera (verificado), y los tests de
  host-header injection de `_trusted_link_base` siguen en verde.
- ✅ **Verificado**: `pytest` **506 passed / 74 skipped** (+3) · `py_compile` de los
  24 módulos · preflight `OPTIONS` y `POST` desde el origen real **sin ninguna
  variable de entorno** → `access-control-allow-origin` correcto · login en
  Chromium sobre el build de producción, con recarga y `/performance` · ESLint 0
  errores · i18n 10/10 · enlaces de doc OK.
- ⏭️ **Queda para operación**: al desplegar el backend a mano, `cloudbuild.yaml`
  sigue siendo la vía correcta porque lleva las variables. El arreglo hace que el
  login sobreviva a un despliegue que se las olvide, no sustituye a desplegar bien.

### 2026-08-05 (2) — Escáner de estructura: reorganizado y con confluencia multi-temporal
Petición del propietario: reestructurar el escáner de estructura, dejarlo claro y ver
qué más se le puede añadir. Manual completo en
[`ESCANER_ESTRUCTURA.md`](./ESCANER_ESTRUCTURA.md) (§1b para el código, §5c para lo nuevo).

- 🧱 **`price_action.py` apilado en el orden en que fluyen los datos**, con el índice
  en el docstring: ayudantes → swings → estructura → rupturas → niveles → evidencia →
  desequilibrios → breakouts → **confluencia** → **contexto** → entrada pública. Antes
  los ayudantes (`_avg_true_range`) vivían por debajo de quien los llamaba.
- 🧩 **La interfaz deja de ser un archivo de 730 líneas.** `StructureScanner.jsx` pasa
  a **componer y nada más** (~200 líneas); la tabla de tickers, los mapas de color, el
  hook de escaneo y los ocho paneles viven en `components/charts/structure/`.
  **El orden es la funcionalidad**, como en el panel de opciones: 1 configurar →
  2 lectura → 3 niveles → lo accesorio en `SectionCard` **plegado y con contador**.
  Antes los ocho bloques se apilaban abiertos y con el mismo peso: la respuesta
  («¿estoy comprando contra una resistencia?») había que buscarla.
- ✅ **Confluencia multi-temporal** — era la mejora #1 pendiente del manual. Cada
  escaneo lee **en paralelo** el escalón superior (`timeframes.higher`: 15m→1h,
  4h→1d, 1d→1wk…) y marca los niveles que coinciden. **No suma a la puntuación de
  confirmación** —esa mide sólo las velas escaneadas—, y si la segunda petición falla
  el escaneo principal sigue: `confluence.checked = false` y `counts.confluent = null`,
  porque *sin comprobar* y *comprobado sin coincidencias* no son lo mismo.
- ✅ **Huecos de sesión**: en intradía de acciones, el salto del cierre a la apertura
  siguiente pasaba el test de FVG **todas las noches**. Ahora se detecta por
  `ts` (nunca por precio), se etiqueta y **no cuenta** como desequilibrio abierto.
  En velas diarias no se aplica: ahí un viernes→lunes sí es un hueco de verdad.
- ✅ **Rupturas repetidas numeradas** (`repeat` / `repeatOf`): tres cruces del mismo
  máximo se leían como tres pruebas de fuerza y son lo contrario. Una fila con `×N`.
- ✅ **El nivel es una zona** (`zone.low`/`high`, la misma banda con la que se agrupó)
  y la distancia va también **en ATR**; un 1 % no significa lo mismo en un índice que
  en una small cap.
- ✅ **Bloque `context`**: recorrido hasta el nivel más cercano por lado (% y ATR),
  anchura del rango y posición dentro de él (0 % = sobre el soporte, 100 % = sobre la
  resistencia). Lo que no se puede calcular es `null`, nunca `0`: sin nivel arriba, el
  recorrido es indefinido, y un `0 %` se leería como «resistencia justo aquí».
- 🐛 **La respuesta vacía del endpoint no tenía la forma que el manual prometía.** El
  motor sí, pero la ruta construía a mano un diccionario de cinco claves cuando el
  proveedor no devolvía velas o fallaba. Corregido y fijado por test de ruta.
- ✅ **Verificado**: `pytest` **534 passed / 74 skipped** (+28: 18 de acción del precio,
  4 de la escalera y 6 de ruta con el lector OHLC mockeado) · `py_compile` de los 24
  módulos · ESLint **0 errores** · `i18n-check` **5681 claves × 10 idiomas, 0 huecos**
  (+29) · `npm run build` exit 0 → 1589 URLs.
- ⚠️ **Sin humo de navegador**: el proveedor de OHLC está bloqueado en el sandbox, así
  que la interfaz nueva no se ha visto con datos reales. Lo verificado es lo que corre
  offline; el contrato de la ruta está cubierto por test con el lector mockeado.

### 2026-08-05 (3) — Los setups llegan a Performance
Petición del propietario: *"setup lo quiero en performance"*. Los setups se definían
en la Academia y **morían ahí**: el diario pedía el setup como texto libre, así que el
desglose por setup de la analítica agrupaba lo que cada uno hubiera tecleado esa vez.

- 🧩 **El modelo pasa a `lib/tradingSystem.js`** (estaba en `components/education/`).
  Los setups no son un tema de la Academia: se **definen** allí y se **usan** en el
  diario, así que las dos pantallas importan el mismo modelo en vez de que una meta la
  mano en la carpeta de la otra. `engine-check.js` actualizado.
- ✅ **Nueva pestaña "Setups"** en `/performance`, junto a Diario y Analítica. Arriba el
  marcador —qué ha hecho cada setup en el diario— y debajo el constructor. Es el
  **mismo componente** que monta la Academia, leyendo el mismo almacén: definir un setup
  en cualquiera de los dos sitios lo deja disponible en el otro, sin duplicar 541 líneas.
- ✅ **El campo `setup` del diario deja de ser texto libre a ciegas**: `datalist` +
  botones con los setups definidos, que escriben el nombre EXACTO. Sigue admitiendo
  texto libre —una operación vieja o un setup que aún no está en el sistema tienen que
  poder guardarse—, pero teclearlo a mano cada vez es lo que rompía la medición:
  "Ruptura NY", "ruptura ny" y "Rupt NY" eran tres grupos y ninguno con muestra.
- ✅ **`joinSetupPerformance()`** cruza la librería con `analytics.by_setup` y separa
  tres cosas que no son la misma:
  - **definido y operado** → sus números (nº de ops., acierto, PnL);
  - **definido y sin operar** → **sin muestra**, que NO es un 0 % de acierto y no se
    dibuja como tal;
  - **operado sin estar en el sistema** → aviso ámbar: o es una errata (y entonces esas
    operaciones le faltan al setup de verdad) o es una operación fuera del plan.
  Las operaciones cerradas **sin setup** van a su propio contador: es un dato que falta,
  no indisciplina. El emparejamiento ignora mayúsculas y espacios.
- ✅ **Verificado**: `engine-check` **66/66** (+6, todos del cruce librería×diario) ·
  ESLint 0 errores · `i18n-check` **5698 claves × 10 idiomas, 0 huecos** (+17) ·
  `npm run build` exit 0 → 1589 URLs · `pytest` sin tocar (no hay cambio de backend).
- ⚠️ **Sigue siendo `localStorage`.** Los setups no viajan entre dispositivos, no están
  en el export del RGPD y se pierden al limpiar el navegador. El sitio donde deberían
  vivir ya existe y está escrito: `trading_plan.py` con `POST /plan` y `/plan/compliance`,
  sin interfaz (G-14). Conectar el constructor a ese endpoint es el siguiente paso
  natural, y arrastra G-15 (`trading_plans` no está en las tres listas del RGPD).
- ⚠️ **Sin humo de navegador**: la pestaña exige sesión y la analítica sale del backend;
  lo verificado es lo que corre offline.

### 2026-08-05 (4) — Una operación puede llevar más de un setup
Petición del propietario: *"el setup quiero que pueda seleccionar más de una opción"*.
Entrar por la confluencia de dos condiciones es tan real como entrar por una, y el
diario obligaba a elegir: la otra razón no existía para la analítica.

- ✅ **`setups` (lista) es la fuente de verdad** en el trade; `setup` (cadena) se
  conserva en sincronía para todo lo que ya leía un solo texto: CSV, prompt del AI
  Coach y tabla del diario. **No hay nada que migrar**: una operación antigua que sólo
  guardó la cadena se lee igual de bien (`trade_setups`).
- ✅ **El desglose por setup cuenta la operación en CADA uno de sus setups** — es la
  pregunta que responde ("¿cómo va este setup?"). Eso hace que la suma de los grupos
  sea mayor que el número de operaciones, así que la respuesta publica
  `setups_multi_tagged` y la interfaz lo dice en una línea, en vez de dejar que se lea
  como un reparto. `_group_winrate_by` pasa a ser un caso particular de
  `_group_winrate_by_multi`.
- ✅ **Normalización en un solo sitio** (`normalize_setups`): recorta, ignora vacíos,
  quita el separador de dentro de un nombre —si no, volvería como dos setups— y
  **deduplica sin distinguir mayúsculas**: "Ruptura NY" tecleado dos veces es un setup,
  no dos. Máximo 5 por operación. La ruta de edición recalcula lista y cadena juntas:
  editadas por separado, la analítica agrupa por una y la tabla enseña la otra.
- ✅ **Formulario**: los setups definidos son botones que se marcan y desmarcan, lo
  elegido se ve como etiquetas quitables, y sigue habiendo campo libre para añadir uno
  que no esté en el sistema. La tabla del diario pinta etiquetas (2 + «+N»).
- ✅ **Funciona también contra el backend actual**, que aún no conoce `setups`: el
  cliente manda las dos formas, el backend viejo guarda la cadena unida y
  `joinSetupPerformance` la parte por el separador y acredita a cada setup —con las
  sumas rehechas, no promediadas—. Al desplegar el backend, los grupos ya llegan
  partidos y el reparto del cliente pasa a ser un no-op.
- ✅ **Verificado**: `pytest` **540 passed / 74 skipped** (+6 del multi-setup) ·
  `engine-check` **76/76** (+10) · ESLint 0 errores · `i18n-check` **5703 claves × 10
  idiomas, 0 huecos** (+5) · `npm run build` exit 0.
- ⚠️ **Requiere desplegar el backend a mano** (`cloudbuild.yaml`) para que `setups`
  llegue a la base de datos como lista. Hasta entonces, todo se guarda en la cadena.

### 2026-08-05 (5) — Setup, diario y analítica, cogidos de la mano
Recordatorio del propietario: los tres tienen que ir juntos. Auditado el ciclo
completo (**definir → registrar → medir → volver al setup**) y cerradas las tres
costuras que quedaban abiertas.

- ✅ **El diario juzga con las reglas DEL setup, no con dos constantes.** El
  formulario avisaba con `R:R < 1,5` y `riesgo > 2 %` fijos mientras el usuario tenía
  escrito en su propio setup "R:R mínimo 2, riesgo 1 %": dos reglas distintas para la
  misma operación, la que se puso y la que le juzgaba. Ahora manda la suya
  (`setupRulesFor`), con **varios setups gana la más estricta de cada una** —si la
  operación responde a dos condiciones tiene que cumplir las dos— y el umbral se pinta
  con su procedencia: en azul si es tuya, apagado si es el valor por defecto. Una regla
  propia se respeta; una constante ajena se ignora.
- ✅ **Del número a la muestra.** Pinchar un setup —en el marcador de la pestaña Setups
  o en el desglose de la analítica— abre el diario **filtrado por ese setup**, con su
  etiqueta y una × para quitarlo. Antes el marcador daba un número y dejaba al usuario
  buscando a mano en la tabla qué operaciones había detrás. Filtrar sin coincidencias
  dice «ninguna operación con ese setup», que no es lo mismo que «no tienes operaciones».
- ✅ **La analítica dice lo mismo que el marcador.** El aviso de solape
  (`setups_multi_tagged`) estaba sólo en la pestaña Setups; dicho en un sitio y callado
  en el otro, los dos números se leen como si uno estuviera mal. Y la barra del desglose
  se acota al 100 %: con multi-etiqueta un grupo puede superar el total de operaciones
  y la barra se salía del contenedor (el porcentaje impreso sigue siendo el real).
- ✅ **Verificado**: `engine-check` **83/83** (+7 de las reglas por setup) · `pytest`
  **540 passed / 74 skipped** · ESLint 0 errores · `i18n-check` **5711 claves × 10
  idiomas, 0 huecos** (+8) · `npm run build` exit 0.
- ⏭️ **Lo que sigue sin cerrar del ciclo** (necesita el backend, G-14): las reglas de
  cuenta del sistema —pérdida máxima diaria y semanal, condiciones de no-operar,
  exposición correlacionada— se definen en el constructor y **no** juzgan nada todavía;
  `detect_errors` sigue usando el plan del backend, que no tiene interfaz. Conectar
  `SetupBuilder` con `POST /plan` cierra eso y de paso arregla G-15.

### 2026-08-05 (6) — Proyección a futuro sobre la operativa real
Petición del propietario: que **todo sea variable** pero que **calcule real**, y que
haga previsiones a futuro cruzando setup, diario y analítica (decisiones, TP, SL).

- ✅ **Nueva pestaña "Proyección"** en `/performance`, la última a propósito: proyectar
  antes de tener diario y analítica es justo el error que el panel intenta evitar.
- ✅ **Todo variable, todo con origen.** Acierto, payoff, riesgo por operación, número de
  operaciones, saldo y capitalización son editables, pero **arrancan en lo que mide tu
  diario** y cada campo lleva una etiqueta: `medido` (con el tamaño de muestra detrás) o
  `supuesto` (lo has cambiado tú). Confundir una medición con una hipótesis es lo que
  hace que alguien dimensione una cuenta real contra un número inventado. Un botón
  devuelve cada campo a su valor medido.
- ✅ **Se proyecta una DISTRIBUCIÓN, no una línea.** Monte Carlo (motor compartido con el
  simulador, 5000 secuencias, **semilla fija** para que los mismos números den siempre el
  mismo dibujo): mediana, percentil 5 y 95 del ROI, drawdown máximo mediano y del 5 %
  peor, probabilidad de acabar en verde y **riesgo de ruina** (perder la mitad de la
  cuenta, no llegar a cero: de una cuenta partida por la mitad ya casi nadie vuelve).
- ✅ **La cuenta que decide, aparte**: esperanza por operación en R y en dinero, **acierto
  de equilibrio** para ese payoff —«por debajo del 36 %, este setup pierde», que es una
  frase accionable— y el margen entre tu acierto y ese equilibrio.
- ✅ **Sensibilidad a la decisión**: qué le pasa a la esperanza si el acierto se mueve
  ±5/±10 puntos con el payoff actual. Cerrar antes sube el acierto y baja el payoff;
  aguantar al objetivo hace lo contrario — es el enlace entre las métricas y lo que uno
  **hace** con el TP y el SL.
- ✅ **Se puede proyectar POR SETUP.** Para eso, `by_setup` publica ahora `avg_win`,
  `avg_loss`, `payoff`, `avg_r` y `r_sample` por grupo: una proyección construida sobre
  los números globales no es una proyección de ese setup. Sin operaciones perdedoras el
  payoff es `null` (desconocido), nunca 0. Y el riesgo por operación sale del **setup**
  cuando lo tiene escrito.
- ✅ **La muestra manda.** Por debajo de 30 operaciones cerradas se avisa en ámbar; por
  debajo de 10 **no se proyecta nada**: una previsión sobre cuatro operaciones no es una
  previsión con mucho error, es ruido con formato de gráfico.
- ✅ **`starting_balance` y `current_balance` se publican** en la analítica: la proyección
  arranca del dinero real del usuario, no de una cifra redonda inventada.
- ✅ **Verificado**: `engine-check` **106/106** (+23 del motor de proyección: esperanza,
  equilibrio, muestra mínima, medido vs supuesto, determinismo y ventaja negativa →
  ruina) · `pytest` **543 passed / 74 skipped** (+3) · ESLint 0 errores · `i18n-check`
  **5752 claves × 10 idiomas, 0 huecos** (+41) · `npm run build` exit 0.
- ⚠️ **Límites declarados en pantalla**: se remuestrea la muestra propia suponiendo que el
  futuro se parece al pasado y que las operaciones son independientes —no lo son del
  todo—, y la simulación sigue operando por debajo de cero, así que un ROI bajo −100 % es
  aritmética; ahí lo que vale es la probabilidad de ruina.
- ⏭️ **Pendiente para cerrar del todo el bucle**: usar MAE/MFE (`excursion`) para
  proyectar «¿y si el stop fuera 0,8R?» con datos reales por operación, no sólo variando
  el payoff a mano. El backend ya calcula la excursión; falta llevarla a este panel.

### 2026-08-05 (7) — Reglas de caja: aportar, topar y sacar el exceso
Petición del propietario: que el setup permita **sacar excesos mensuales**, poner
**topes de rentabilidad mensual en %** y meter una **aportación fija mensual**.

- ✅ **Tres reglas nuevas en el sistema** (Setups → Reglas, sección «Caja»):
  aportación fija mensual, tope de rentabilidad mensual en % y retirada de todo lo
  que pase de un saldo. Van al resumen copiable del sistema, como el resto de reglas.
  Vacío = **no aplica** (`null`), que no es 0: un tope del 0 % pararía la cuenta el
  primer día y un techo de retirada de 0 la vaciaría entera.
- ✅ **La proyección las aplica de verdad.** El motor pasa a simular **meses**, no sólo
  operaciones: al principio de cada mes entra la aportación, durante el mes se deja de
  operar si se alcanza el tope, y al cierre se retira lo que pase del techo. El
  simulador general no servía —no sabe de meses—, así que la proyección lleva su propio
  recorrido, que se reduce exactamente al caso de siempre cuando no hay ninguna regla.
- ✅ **Tres decisiones que cambian el número y por eso se explican en el código**:
  - el **drawdown** ajusta el máximo histórico en cada movimiento de caja — meter 500 €
    no borra una caída y sacar 500 € no es una pérdida de 500 €; sin eso, aportar
    mensualmente disimularía el drawdown entero;
  - la **ruina** se mide contra el dinero realmente puesto (inicial + aportado), no
    contra el saldo del primer día: quien lleva dos años aportando ha arriesgado mucho
    más que su saldo inicial;
  - el **ROI** es sobre el capital aportado y se publica además el **patrimonio**
    (saldo + retirado): sin eso, retirar el exceso parece empeorar el resultado cuando
    lo que hace es ponerlo a salvo.
- ✅ **Aportado y meses son distribuciones, no cifras fijas.** Un mes que se corta al
  llegar al tope deja operaciones sin hacer, así que completar las mismas operaciones
  lleva más meses — y más aportaciones. Publicar «aportarás 3.600» cuando en la mitad de
  los casos son 5.700 sería mentir sobre el dinero que hay que poner.
- ✅ **El ritmo mensual se mide, no se inventa**: `trades_per_month` sale del histórico
  real y es `None` si el diario no cubre 21 días — la diferencia entre «no lo sé» y
  «cero al mes».
- ✅ **Verificado**: `engine-check` **120/120** (+14 de las reglas de caja: aportación
  pagada cada mes, tope que corta meses y recorta también el lado bueno, techo de
  retirada que el saldo no supera, patrimonio que cuenta lo retirado, y que retirar no
  inventa dinero) · `pytest` **545 passed / 74 skipped** (+2) · ESLint 0 errores ·
  `i18n-check` **5770 claves × 10 idiomas, 0 huecos** (+18) · `npm run build` exit 0.

### 2026-08-05 (8) — Modelo por mes/trimestre/año y el precio de la caja
Petición del propietario: analizar los resultados que da el panel, estudiar si el R:R se
mide mejor por operación o sobre el conjunto mensual, modelar **trimestre y año**, y que
el trader entienda por qué esto es lo que más le da a largo plazo.

- 🐛 **Bug encontrado ejecutando el análisis, no leyendo el código.** La ruina se medía
  sobre el SALDO de la cuenta: quien retira el exceso todos los meses deja el saldo
  pegado al techo a propósito, así que salía **«ruina 100 %»** teniendo el triple fuera.
  Ahora se mide sobre el **patrimonio** (saldo + retirado) contra el dinero puesto
  (inicial + aportado), y se publica aparte **`probabilityOfAccountWiped`**: quedarse sin
  cuenta con la que operar es otro suceso, y quien retira puede sufrirlo sin arruinarse.
- ✅ **Rendimiento por periodo (mes / trimestre / año)**, compuesto y no sumado —un +10 %
  seguido de un −10 % no es 0, es −1 %—: típico, malo (p5), bueno (p95) y **porcentaje de
  periodos en rojo**, que es lo que hay que aguantar para llegar al resultado final.
- ✅ **«¿Cada cuánto llego al objetivo?»** Un objetivo mensual se traduce a su compuesto
  trimestral y anual (10 % mensual = 33 % trimestral = **214 % anual**) y se dice qué
  porcentaje de periodos lo alcanza. Es la forma de ver que un número «normal» al mes es
  extraordinario al año.
- ✅ **El precio de la caja** (`cashflowCost`): con los MISMOS números, patrimonio mediano
  aplicando las reglas del usuario frente a dejarlo componer. En el escenario de prueba
  (0,5 R por operación, 20 ops/mes, 5 años) sale **$70.000 retirando** frente a
  **$3.477.121 componiendo**: ×50. Las dos son decisiones legítimas —lo retirado ya no lo
  pierde una racha— pero la diferencia se subestima siempre porque la intuición es lineal
  y el compuesto no.
- 📊 **Estudio del R:R por operación vs agregado mensual** (números en la respuesta de la
  sesión): con el MISMO 0,5 R por operación, pasar de 5 a 40 operaciones al mes lleva la
  mediana mensual del 2,5 % al 22 % y los meses en rojo del 18,6 % al 1,9 %. **Miden cosas
  distintas**: el R:R por operación mide la ventaja (converge rápido, ~240 datos al año);
  el agregado mensual mide lo que esa ventaja produce en tu calendario (12 datos al año,
  converge 20 veces más lento — por eso hay que simularlo). Un tope o una retirada
  mensuales se deciden con el segundo, nunca con el primero.
- ✅ **Verificado**: `engine-check` **133/133** (+13: ruina bien medida con retiradas,
  cuenta arrasada, periodos compuestos y no sumados, menos periodos rojos al alargar el
  periodo, la traducción 10 %→33 %→214 % y el coste del compuesto) · `pytest` **545
  passed** · ESLint 0 errores · `i18n-check` **5793 claves × 10 idiomas** (+23) · build OK.
