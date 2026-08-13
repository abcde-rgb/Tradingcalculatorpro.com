# 🧭 ESTADO DEL PROYECTO — TradingCalculator.Pro

> **Este es el documento vivo del proyecto.** Es la fuente de verdad sobre *qué hay*,
> *qué falta*, *qué hay que probar* y *qué hay que hacer*. Cualquier asistente (Claude)
> o persona que retome el proyecto debe **leer este archivo primero** y **actualizarlo
> al terminar** su sesión (ver § _Cómo mantener este documento_ al final).
>
> - 📅 **Última verificación real contra el código:** 2026-08-13 (auditoría del
>   repositorio; antes 2026-08-08, persistencia de los ajustes del usuario)
> - 🗺️ **Los conteos no viven aquí.** Módulos, rutas, líneas, componentes y claves i18n
>   están en [`MAPA.md`](./MAPA.md), **generado desde el código** (`scripts/gen-mapa.py`,
>   con `--check` en CI). Este documento describe *el estado*; el mapa mide *el tamaño*.
> - 🌿 **Hay trabajo terminado que no está en `main`**: 6 PRs de producto abiertos desde
>   el 02-08, 4 ramas con commits y sin PR, y el **PR #178, que es un *revert* del
>   multiproducto que sí está fusionado** — no lo fusiones. Inventario completo en
>   [`AUDITORIA_REPOSITORIO_2026-08-13.md`](./AUDITORIA_REPOSITORIO_2026-08-13.md) §2.
>   El hook de arranque te lo recuerda en cada sesión.
>
> ⚠️ **Aviso de método (2026-07-27, otra vez el 2026-08-03, y atacado de raíz el
> 2026-08-13).** Las §1, §2 y §6 se quedaban por detrás del código mientras el registro
> de sesiones sí se actualizaba. El caso peor de julio: §1 y §6 pedían configurar
> **OxaPay** cuando el código ya llamaba a **NOWPayments**. El de agosto: §6 seguía
> mandando dar de alta **Google AdSense** un día después de borrarlo del repositorio.
> La causa era escribir a mano lo que se puede medir, así que **las cifras se han
> sacado a `MAPA.md`** y CI falla si se desvían. Lo que queda aquí es criterio —y el
> criterio sigue habiendo que actualizarlo a mano al cerrar sesión.
> - 📚 Documentos hermanos: [`MAPA.md`](./MAPA.md) (dónde está cada cosa) ·
>   [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md) (qué se hizo y por qué) ·
>   [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) ·
>   [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`DIARIO_BUGS.md`](./DIARIO_BUGS.md)

---

## 1. Semáforo de lanzamiento

| Área | Estado | Nota |
|---|:--:|---|
| **Frontend build** (`npm run build`) | 🟢 | Verificado 2026-08-03: exit 0, **38 MB** en `build/`, **1589 URLs** en el sitemap, code-splitting OK. Bajó de 40 MB al apagar los source maps |
| **Backend import + sintaxis** | 🟢 | `import server` OK y todos los módulos compilan. **Los conteos (módulos, rutas, líneas) están en [`MAPA.md`](./MAPA.md)** — generado, así que no se desvía |
| **Tests offline** | 🟢 | `pytest tests/` → **718 passed, 74 skipped** en 16 s (2026-08-08). Incluye `test_route_uniqueness_unit.py`, que **sí pasa** — ojo: falla si el contenedor tiene una FastAPI distinta de la fijada en `requirements.txt` (con 0.141 `app.routes` ya no expone las rutas del router) |
| **Tests de integración** | 🟡 | Existen pero requieren `BACKEND_URL` vivo; se saltan si no |
| **Lint del frontend (ESLint)** | 🟢 | **0 errores, 123 avisos** (2026-08-08). Los avisos son símbolos muertos: deuda de limpieza, no bloquean |
| **Paridad i18n / motor** | 🟢 | `i18n-check` 0 huecos en los 10 idiomas · `engine-check` 197/197. Cifra de claves al día en [`MAPA.md`](./MAPA.md) |
| **Ajustes del usuario entre dispositivos** | 🟢 | Tema, idioma, preferencias, favoritos, progreso de la Academia y **setups** viajan con la cuenta desde el 2026-08-08 (`lib/cloudPrefs.js`). Ver G-25 |
| **Seguridad (auth, pagos, admin)** | 🟢 | Auditoría sólida; sin secretos en el repo; cabeceras + CSP en las respuestas de API |
| **CSP del sitio (GitHub Pages)** | 🟠 | El HTML servido por Pages **no lleva CSP** (Pages no permite cabeceras). Ver G-10 |
| **CI de PR (`ci.yml`)** | 🟢 | Backend: `py_compile *.py` + pytest. Frontend: i18n + credentials + engine + lint + build. **Doc: `gen-mapa --check` + `check-doc-links` + paridad del catálogo** (añadido 2026-08-13, cierra G-18) |
| **Despliegue del backend** | 🟠 | **No hay nada automático desde el 2026-08-03**: el workflow se retiró (fallaba la federación de identidad). Se despliega a mano con `cloudbuild.yaml` desde GCP |
| **CI frontend (GitHub Pages)** | 🟢 | Workflow correcto (OAuth + analytics + 404.html) + i18n + credentials + **lint** |
| **Backend con interfaz de usuario** | 🔴 | **35 rutas que ningún fichero del frontend menciona** (medido, no estimado: [`MAPA.md` § Rutas sin consumidor](./MAPA.md)). Incluye los 4 módulos completos de G-14 —plan, backtest, riesgo de cartera, americanas— y bastante más |
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
> 📊 **Los conteos vivos —rutas, módulos, componentes por carpeta, líneas, claves
> i18n— están en [`MAPA.md`](./MAPA.md), generado desde el código.** Aquí se describe
> **qué es** cada cosa, no cuántas hay: un número escrito a mano envejece en silencio y
> es exactamente lo que pasó (esta sección llegó a decir 24 módulos con 28 en el repo).

- **Rutas** en `App.js`: Landing, Dashboard, Pricing, Settings, Education, Subscription,
  Options (hub + calculator + strategies + strategies/:slug), Performance, News, Admin,
  Affiliate, Login, Register, Forgot/Reset password, Verify-email, Magic-link, Payment
  success/cancel, Legal, Contact, About y 404.
- **Calculadoras** en `components/calculators/`.
- **Componentes de opciones** en `components/options/`: cadena, payoff, griegas
  (display/panel/time-chart), IV surface, IV rank, unusual activity, market flow,
  optimizador, Kelly, AI Trade Coach, comparador, posiciones guardadas, etc.
- **Gráfico TradingView** (`components/charts/TradingViewChart.jsx`): embed iframe con
  selector de categoría/activo, favoritos, 9 temporalidades, tema y locale.
  → Detalle y límites en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).
- **~186 activos** en 6 categorías (crypto, forex, stocks, indices, commodities, futures)
  en `lib/assets.js` (los "47" de la primera versión se ampliaron el 2026-07-04).
- **i18n: 10 idiomas** (`lib/i18n/`): es, en, de, fr, ru, zh, ja, ar, **pt** (Portugal) e **it**.
  Mismo juego de claves en los diez, **0 huecos** (`node scripts/i18n-check.js`, en CI).
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
| G-14 | **Backend terminado que ningún usuario puede alcanzar.** Medido el 2026-08-13 con `gen-mapa.py`: **35 rutas que ningún fichero del frontend menciona**, descontadas ya las huérfanas por diseño (webhooks, sondas de salud). Incluye los cuatro módulos completos —`trading_plan.py` (`/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance`), `backtest.py`, `portfolio_risk.py`, `american_options.py`— y además `/monte-carlo`, `/performance/export`, `/education/pattern-catalog`, `/calculate/implied-volatility`, `/calculate/volatility-size`, `/options/term-structure` y el diario legado `/journal/trades` | 🔴 | Sigue siendo el mayor hueco abierto. La lista viva está en [`MAPA.md`](./MAPA.md) § Rutas sin consumidor y **CI la recalcula en cada PR**, así que ya no hace falta una auditoría para saber si crece. Empezar por el asistente del plan: `PLAN_DE_TRADING_spec.md` ya lo especifica |
| G-15 | ~~**`trading_plans` no entra en las tres rutas del RGPD.**~~ La colección guardaba `user_id` pero no aparecía en `delete_account`, ni en `_USER_DATA_COLLECTIONS`, ni en el export de `/auth/my-data` | 🟢 | ✅ **Cerrado (2026-08-06)**: arreglada la CAUSA, no el síntoma — había **cuatro listas escritas a mano** y ahora derivan de una sola tupla (`_USER_DATA_COLLECTIONS` → `_ALL_USER_COLLECTIONS` → `_EXPORTABLE_COLLECTIONS`). El borrado de cuenta también se había quedado sin `journal_entries`. `test_user_data_collections_unit.py` fija que lo que se purga se borra y lo que se borra se puede exportar (salvo artefactos de seguridad) |
| G-16 | **Grupo B del saneamiento de licencias, sin hacer.** Acciones y ETFs de EE. UU., los 23 índices, los 15 futuros de materias primas y la cadena de opciones siguen saliendo de **Yahoo**, cuya licencia no permite redistribuir el dato en un producto de pago. El 2026-08-02 se retiró la *mención* pública, no la dependencia | 🟠 | Decisión de negocio con coste: IEX para acciones, ETF equivalentes para índices y materias primas, cadena sintética para opciones. **Cambia lo que ve el usuario**, por eso está parado |
| G-17 | **El shim `Collection` sigue sin tests.** Es la capa casera (~750 líneas) que traduce Mongo→SQL y de la que depende **todo** el backend. Bloquea el refactor de `server.py` (BUG-008): partir 8232 líneas sin red es cambiar deuda por riesgo | 🟠 | T-03 del backlog de auditoría: `$set/$inc/$push/$unset/$or/$in/$regex`, agregación y `find_one_and_update`, contra PostgreSQL real |
| G-18 | ~~**`check-doc-links.py` no corre en CI.**~~ Existía, funcionaba y sólo se ejecutaba si alguien se acordaba; `PENDIENTES.md` acumuló dos referencias a documentos inexistentes sin que nada avisara | 🟢 | ✅ **Cerrado (2026-08-13)**: nuevo job `documentacion` en `ci.yml` con `check-doc-links`, `gen-mapa --check` y la paridad del catálogo. Y las dos referencias «rotas» no eran erratas: apuntaban a documentos reales que viven en una rama sin fusionar (ver auditoría del 13-08 §2.2) |
| G-20 | ~~**Dos esquemas incompatibles escribiendo en `db.trades`, y el P&L se pierde.**~~ `POST /journal/trades` guardaba camelCase (`entryPrice`) y `POST /performance/trades` snake_case (`entry_price`), **en la misma colección**, y ninguno filtraba al leer: `compute_trade_pnl` no encontraba `entry_price`, salía por la rama de `entry == 0` y devolvía `pnl = 0.0`, que `perf_update_trade` **persistía** al primer edit | 🟢 | ✅ **Cerrado (2026-08-06)**: `normalize_trade_schema` traduce en `compute_trade_pnl` (punto único por el que pasa todo el P&L), el endpoint legado **escribe ya en el esquema canónico**, los dos `PUT` hacen `$unset` de las claves viejas, y `migrate_trades_schema.py` limpia lo almacenado con backup y rollback. El mapeo `leverage`→`multiplier` recupera el importe **exacto**: misma posición en la fórmula. Verificado contra Postgres real |
| G-21 | **El diario no guarda las patas de una operación de opciones.** Cero apariciones de `legs`: no hay griegas agregadas de la estructura, ni cierre de una pata suelta, ni rolar media posición | 🟠 | **Media parte cerrada (2026-08-06)**: el R-múltiplo ya no se cae. El riesgo de una estructura sale de `max_loss` —la prima en una opción comprada, anchura − crédito en un spread— y no de `\|entry − sl\|`, así que una operación de opciones entra en la distribución de R y compara con el resto del diario. Lo que queda es el detalle por pata: reconstrucción `Position` → `Leg` → `Execution` |
| G-23 | **Una operación tiene un único precio de salida: no hay cierres parciales.** Afecta a todos los productos, no sólo a opciones — un scale-out de tres tramos hay que apuntarlo como tres operaciones, y entonces cada una lleva su propio saldo de cuenta y la analítica cuenta tres entradas donde hubo una | 🟠 | Misma reconstrucción que G-21: es `Execution` quien la resuelve. Mientras tanto, apuntarlo como una operación con el precio medio de salida es lo más fiel |
| G-24 | **La divisa de la cuenta no se convierte.** Todo se mide en la divisa en la que estén los precios. Un cruce sin USD (EURGBP) o un futuro europeo en una cuenta en dólares suman importes de divisas distintas como si fueran la misma | 🟡 | Necesita tipo de cambio a fecha de cierre; `ecb_rates.py` ya sirve el feed diario del BCE. El P&L de cada operación es correcto en su divisa: lo que no lo es, es el total |
| G-25 | ~~**Los ajustes del usuario no salían del navegador.**~~ Cuenta, suscripción, diario, alertas y estado de las calculadoras sí persistían; el tema, el idioma, las preferencias, los favoritos, el progreso de la Academia y **los setups del sistema de trading** vivían sólo en `localStorage`. Entrar desde el móvil era empezar de cero y vaciar la caché era perder los setups escritos a mano | 🟢 | ✅ **Cerrado (2026-08-08)**: `lib/cloudPrefs.js` respalda `localStorage` contra un único documento de `user_states` (`preferences_v1`), con **una fecha por ajuste** (para que cambiar el tema en un equipo no borre los setups de otro) y **dueño registrado** (para que dos cuentas en el mismo navegador no se hereden nada). Las reglas de fusión están en `lib/prefsMerge.js`, sin importaciones, probadas en `engine-check`. Verificado end-to-end en Chromium contra Postgres real |
| G-26 | **No se puede editar el perfil.** No existe `PUT /auth/profile` ni pantalla: el nombre y la foto son los del registro para siempre. En Ajustes sólo se puede cambiar contraseña, gestionar 2FA, exportar los datos y borrar la cuenta | 🟡 | Descubierto al cerrar G-25. Es un hueco distinto: no es que el dato no se guarde, es que no hay forma de cambiarlo |
| G-22 | **Dos fuentes de verdad para las mismas estadísticas.** `dashboard/JournalStats.jsx` y `education/ExpectancyCalculator.jsx` leen `/journal/stats`; `services/performanceApi.js` y `education/JournalEdgeButton.jsx` leen `/performance/analytics`. Fórmulas distintas sobre la misma colección → el usuario ve **dos expectancies distintas** según la pantalla | 🟠 | Converge al unificar el modelo (G-20). Mientras tanto, las dos rutas ya ordenan cronológicamente y tratan igual el breakeven |
| G-19 | **Deprecaciones que romperán en la siguiente mayor**: `@app.on_event("startup"/"shutdown")` (FastAPI pide `lifespan`) y una `class Config` de Pydantic v1 (pide `ConfigDict`). `pytest` ya las escupe como warnings | 🟡 | T-08 del backlog. Mecánico, pero toca el arranque: hacerlo con el suite en verde delante |
| G-27 | **Las passkeys no están documentadas en ninguna parte.** `backend/passkeys.py` (242 líneas, 10-08) añadió un método de autenticación completo: no está en la tabla de módulos de `CLAUDE.md`, no está en el inventario §2, y la sección «Autenticación» de `CLAUDE.md` sigue describiendo sólo JWT + Google OAuth. `migrate_trades_schema.py` tampoco está en la tabla | 🔴 | Dar de alta los dos módulos y reescribir la sección de autenticación. Anotar de paso por qué `passkeys.py:63` usa un origen **sin la ruta del repositorio** (WebAuthn no la lleva), para que nadie lo «arregle» y rompa el login |
| G-28 | **Se anuncia precio 0 a Google con muro de pago duro.** `gen-seo-pages.js:421` emite `offers: {price:'0', priceCurrency:'EUR'}` en las páginas de calculadora, con títulos «Gratis»/«Free», mientras `public/index.html` declara ofertas de 17/45/200 €. El CTA lleva a `/dashboard`, que exige suscripción activa | 🟠 | Quitar el `price:'0'` y alinear los títulos con lo que el usuario encuentra al llegar. Son 12 slugs × los idiomas con traducción |
| G-29 | **`PENDIENTES.md` da por abierto lo que está cerrado.** Afirma que `trading_plans` no se borra ni se exporta (G-15, cerrado y verificado contra Postgres el 07-08) y que `FRONTEND_URL` cae a `tradingcalculatorpro.com` (hoy cae a `github.io`, `server.py:1167`). También cita 5652 claves (son 6110) y dice que no hay selector de instrumento (el multiproducto entró el 06-08) | 🟠 | Repasar `PENDIENTES.md` contra el código. Un documento de pendientes con datos falsos cuesta una sesión entera |
| G-30 | **Código muerto en el frontend.** 20 componentes `.jsx` que ningún fichero importa: 17 de `components/ui/` (1318 líneas) y 3 propios (`options/GreeksPanel.jsx`, `education/TradingBasicsGuide.jsx`, `education/WhyItMatters.jsx`, `dashboard/PriceTicker.jsx`, 933 líneas). **10 de los 27 paquetes `@radix-ui` del `package.json` sólo los usan esos muertos** | 🟡 | Borrar los componentes y desinstalar los 10 paquetes. Deja de generar PRs de Dependabot para código que no llega a ninguna pantalla |
| G-31 | **Residuos que dan instrucciones falsas.** `backend/patches/server_fixes.patch` (parche manual de mayo, con `MONGO_URL` — la BD descartada), `backend/FIXES_README.md` (manda integrar un `fixes.py` que no existe), `backend/ADMIN_INTEGRATION.md` (ya integrado en `startup_event`), `memory/PRD.md`, `monitoring/`, `packaging/twa-manifest.json` y `check.sh` | 🟡 | Borrar o mover a `_archive/`. No es limpieza estética: quien los lea intentará aplicar pasos ya aplicados sobre una base de datos que no existe |
| G-32 | **Trabajo terminado que no está en `main`.** 6 PRs de producto abiertos desde el 02-08 (cuatro de ellos en su segunda ronda tras cerrarse sin fusionar), 4 ramas con commits y **sin ningún PR** —la mayor, `claude/project-complete-audit-a6qg1c`, con dos auditorías, el estudio de pasarelas de broker, los datos de la entidad legal y 2 tests—, y 11 PRs de Dependabot | 🔴 | Decidir uno por uno: fusionar o cerrar. Empezar por **#162** (honestidad del escáner) y **cerrar el #178**, que es un revert de algo vivo. Inventario en [`AUDITORIA_REPOSITORIO_2026-08-13.md`](./AUDITORIA_REPOSITORIO_2026-08-13.md) §2 |

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
- [x] ~~**`trading_plans` en las tres listas del RGPD** (G-15)~~ — cerrado en BUG-044 y
      **verificado contra Postgres** el 2026-08-07: el plan viaja en el export y el
      borrado de cuenta lo elimina (0 filas en 6 tablas).
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

---

## 7. Registro de sesiones

**Las entradas viven en [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md)** — 127 entradas
desde el 2026-06-25. Se separaron el 2026-08-13: eran el 93 % de este documento y hacían
que consultar el semáforo costase leer 320 KB.

Las cinco últimas:

| Fecha | Sesión |
|---|---|
| 2026-08-13 (2) | Orientarse costaba 106.000 tokens; ahora cuesta 8.000 |
| 2026-08-13 | Auditoría del repositorio: lo obsoleto, lo perdido y lo que se pasó por alto |
| 2026-08-12 (2) | Qué método tiene base y cuándo se comprobó |
| 2026-08-12 | El glosario se detenía justo donde empieza el producto |
| 2026-08-08 | Dos formatos de datos estructurados que ya no rinden |

```bash
# buscar una sesión por fecha o por tema
grep -n "^#\{2,3\} 2026-08" docs/REGISTRO_SESIONES.md
grep -n -i "passkey\|escáner\|stripe" docs/REGISTRO_SESIONES.md
```

---

## Cómo mantener este documento

1. **Al empezar**: lee §1–§6. Son ~260 líneas y describen el estado, no la historia.
   El hook de arranque (`.claude/hooks/orientacion.sh`) ya te ha dado el estado de git,
   las ramas sin fusionar y la antigüedad de la última verificación.
2. **Mientras trabajas**: si descubres un hueco nuevo, añádelo a §3 con un ID `G-xx`.
3. **Al terminar**:
   - Actualiza el **semáforo** (§1) y el **inventario** (§2) si cambió algo.
   - Marca casillas del **backlog** (§5) que hayas cerrado.
   - Añade una entrada con fecha en [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md)
     **y actualiza la tabla de las cinco últimas de §7**.
   - Si tocaste seguridad o bugs, refleja también en [`./DIARIO_BUGS.md`](./DIARIO_BUGS.md).
   - Si añadiste módulos, rutas o páginas, regenera el mapa:
     `python scripts/gen-mapa.py`. CI falla si te lo saltas.
4. **Regla de oro**: este documento debe reflejar el **código real**, no intenciones.
   Verifica antes de afirmar (compila, ejecuta, lee el archivo). Las cifras de §1 y §2
   son las que más se desvían: el 2026-08-13 decían 24 módulos cuando había 28.
