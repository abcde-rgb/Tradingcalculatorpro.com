# 🧭 ESTADO DEL PROYECTO — TradingCalculator.Pro

> **Este es el documento vivo del proyecto.** Es la fuente de verdad sobre *qué hay*,
> *qué falta*, *qué hay que probar* y *qué hay que hacer*. Cualquier asistente (Claude)
> o persona que retome el proyecto debe **leer este archivo primero** y **actualizarlo
> al terminar** su sesión (ver § _Cómo mantener este documento_ al final).
>
> - 📅 **Última verificación real contra el código:** 2026-08-26 (examen integral:
>   fórmulas, seguridad, SEO, i18n, rendimiento y diseño. Se corrigió el signo del POP,
>   tres bypass de autorización y tres verificadores que no miraban lo que decían
>   mirar. Suite en 1086 passed / 72 skipped)
> - 🌿 **Rama de trabajo actual:** `claude/hola-s0mxlz`
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
| **Frontend build** (`npm run build`) | 🟢 | Verificado 2026-08-22: exit 0, **40 MB** en `build/`, **1609 URLs** en el sitemap (+20 al dar página al simulador de margen cruzado y a su curso), code-splitting OK |
| **Backend import + sintaxis** | 🟢 | `import server` OK y todos los módulos compilan. **Los conteos (módulos, rutas, líneas) están en [`MAPA.md`](./MAPA.md)** — generado, así que no se desvía |
| **Tests offline** | 🟢 | `pytest tests/` → **1086 passed, 72 skipped** (2026-08-26). Necesita `requirements-dev.txt` (pytest-asyncio): sin él fallan 19. Incluye `test_route_uniqueness_unit.py`, que **sí pasa** — ojo: falla si el contenedor tiene una FastAPI distinta de la fijada en `requirements.txt` (con 0.141 `app.routes` ya no expone las rutas del router) |
| **Tests de integración** | 🟡 | Existen pero requieren `BACKEND_URL` vivo; se saltan si no |
| **Lint del frontend (ESLint)** | 🟢 | **0 errores, 123 avisos** (2026-08-08). Los avisos son símbolos muertos: deuda de limpieza, no bloquean |
| **Paridad i18n / motor** | 🟢 | `i18n-check` 0 huecos en los 10 idiomas · `engine-check` **264/264** · `simulacion-masiva` **1.000 escenarios generados / ~20.000 invariantes** (60.000 probados en 6 semillas) · `check-edu-index` 85 = 85. Cifra de claves al día en [`MAPA.md`](./MAPA.md) |
| **Banco de pruebas E2E (`qa`)** | 🟢 | Arranca en frío desde el 2026-08-14 (G-35). Nuevo `tests/e2e/mirar.js`: una pantalla, una captura, los errores de JS, el desbordamiento y el texto de los `data-testid` que pidas — para mirar mientras diseñas sin correr el examen entero |
| **Dashboard: mesa de cálculo** | 🟢 | Nueva el 2026-08-14 (`components/desk/`). Capital arriba del todo y con la cuenta, producto, modo de margen según el producto, **tope duro del 10 % de riesgo por operación**, tamaño derivado del riesgo con los tres techos, liquidación en aislado **y cruzado**, parciales y comisiones. Las 14 calculadoras siguen ahí como **modo básico** |
| **Ajustes del usuario entre dispositivos** | 🟢 | Tema, idioma, preferencias, favoritos, progreso de la Academia y **setups** viajan con la cuenta desde el 2026-08-08 (`lib/cloudPrefs.js`). Ver G-25 |
| **Seguridad (auth, pagos, admin)** | 🟢 | Auditoría sólida; sin secretos en el repo; cabeceras + CSP en las respuestas de API |
| **CSP del sitio (GitHub Pages)** | 🟠 | Ya la lleva (meta, medido con navegador y verificado en CI). Falta el anti-clickjacking, que un meta no puede dar. Ver G-10 |
| **CI de PR (`ci.yml`)** | 🟢 | Backend: `py_compile *.py` + pytest. Frontend: i18n + credentials + engine + lint + build. **Doc: `gen-mapa --check` + `check-doc-links` + paridad del catálogo** (añadido 2026-08-13, cierra G-18) |
| **Despliegue del backend** | 🟢 | **Automático**: Cloud Run source deploy en cada push a `main`, a `us-east1`. La fila decía lo contrario hasta el 2026-08-25 y era falso desde el 2026-07-19 — ver `DECISIONES.md` |
| **CI frontend (GitHub Pages)** | 🟢 | Workflow correcto (OAuth + analytics + 404.html) + i18n + credentials + **lint** |
| **Backend con interfaz de usuario** | 🟠 | **29 rutas que ningún fichero del frontend menciona**, y **cada una con una decisión escrita** desde el 2026-08-22: [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md) (borrar 7, construir 20, arreglar 2). Eran 38: se retiraron 8 cuyo sucesor estaba escrito en el propio código, y `/api/quote` dejó de estar muerta al enchufarse su cascada de failover a `/api/stock`. `check-rutas-muertas.py` corre en CI **en las dos direcciones**: una ruta nueva sin consumidor y sin fila hace fallar, y una fila cuya ruta ya tiene pantalla también. Siguen ahí los 4 módulos completos de G-14 —plan, backtest, riesgo de cartera, americanas— |
| **Stripe (código)** | 🟢 | Checkout + webhooks implementados |
| **Stripe (operación)** | 🔴 | Falta verificar productos/claves en dashboard real |
| **NOWPayments / crypto (código)** | 🟢 | Invoice + IPN con HMAC-SHA512 verificado (`backend/nowpayments.py`) |
| **NOWPayments / crypto (operación)** | 🔴 | Falta API Key + IPN secret en el panel admin y registrar el callback. **OxaPay y MaxelPay ya NO existen en el código** |
| **Revolut Pay (código)** | 🟢 | `backend/revolut.py`, registrado en el checkout |
| **Kunfupay (código)** | 🟢 | Cuarto raíl, **camino B**: enlace de cobro por plan (`kunfupay_links`) + alta manual auditada e idempotente (`POST /admin/payments/manual`, con formulario en el panel). Los raíles activos se encienden y apagan con el ajuste `payment_methods_enabled` —apagar Stripe ya no exige desplegar—. Ver [`PASARELA_KUNFUPAY.md`](./PASARELA_KUNFUPAY.md) § 16 |
| **Kunfupay (operación)** | 🔴 | Falta la cuenta, los enlaces de cobro y **el primer cobro real**: su dominio está bloqueado desde el entorno remoto y nada se ha probado contra un pago de verdad. El conector con webhook (camino A) no se puede escribir hasta que publiquen API — § 5, preguntas 1-3 |
| **DNS / dominio `tradingcalculator.pro`** | 🟠 | **Cutover hecho el 2026-08-28**: `CNAME` en `public/`, `PUBLIC_URL: /`, y el DNS resuelve a los cuatro registros A de GitHub Pages (verificado). El repo entero apunta ya al dominio propio. **Falta desplegar el backend**: hasta entonces el CORS sigue con el dominio viejo y la web carga sin hablar con la API (BUG-067) |
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
  success/cancel, Legal, Contact, About, **Brokers** y 404.
- **`/brokers`** (2026-08-22): los brókers a los que referimos, con la advertencia
  normalizada de ESMA en la misma tarjeta que el enlace, la relación de afiliación
  declarada antes del primer enlace (Directiva Omnibus) y `rel="sponsored"`. Enlazada
  desde el pie, `noindex`. Lo que se puede publicar de cada uno **lo decide el
  servidor**, no la plantilla → [`BROKERS_REFERIDOS.md`](./BROKERS_REFERIDOS.md).
- **Calculadoras** en `components/calculators/` — hoy son el **modo básico** del
  dashboard, con conmutador.
- **Simulador de escalera en margen cruzado** (2026-08-22): la decimoquinta herramienta
  del banco (`?tab=cross-margin`), y la única escrita desde cero sobre el catálogo. No
  contesta «¿dónde me liquidan?» sino **«¿me deja el bróker abrir el siguiente tramo?»**,
  que es donde muere la mayoría de los planes de piramidación. Aritmética pura en
  `lib/crossMargin.js` —margin level de la cuenta, coste real de un tramo como diferencia
  de margen usado, colchón hasta el stop-out, curva de margen libre por precio, tamaño
  defendible frente al techo de la cuenta y ruina del jugador con deriva— con **52 cifras
  de referencia fijadas en `engine-check`**, cada una atada a una frase del curso que lo
  acompaña. Cuatro escenarios de un clic reproducen los casos trabajados de ese curso.
- **Mesa de cálculo** en `components/desk/` (2026-08-14): un terminal de bróker que en
  vez de mandar la orden dice qué orden mandarías. Capital total arriba del todo (va con
  la cuenta, `cloudPrefs.deskAccount`, y arranca **vacío**), producto, modo de margen
  **según el producto**, riesgo máximo por operación con **tope duro del 10 %**, tamaño
  derivado del riesgo con los tres techos (riesgo/margen/exposición), billete mínimo,
  liquidación en aislado y cruzado, parciales, comisiones y «Registrar en el diario».
  Aritmética en `lib/deskMath.js`, la **inversa** de `lib/instruments.js`.
- **66 estructuras de opciones** en `data/mockData.js`, accesibles desde la mesa con los
  **cuatro contratos sueltos** (long/short call y put, que son cuatro *de* las 66) en su
  propio grupo. Qué significa comprar y vender según el tipo vive en `lib/optionSides.js`
  y lo comparten la mesa y el constructor de patas.
- **Componentes de opciones** en `components/options/`: cadena, payoff, griegas
  (display/panel/time-chart), IV surface, IV rank, unusual activity, market flow,
  optimizador, Kelly, AI Trade Coach, comparador, posiciones guardadas, etc.
- **Gráfico TradingView** (`components/charts/TradingViewChart.jsx`): embed iframe con
  selector de categoría/activo, favoritos, 9 temporalidades, tema y locale.
  → Detalle y límites en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).
- **~186 activos** en 6 categorías (crypto, forex, stocks, indices, commodities, futures)
  en `lib/assets.js` (los "47" de la primera versión se ampliaron el 2026-07-04).
- **Academia → Riesgo → «Margen cruzado»** (2026-08-22, `?topic=cross-margin`): once
  módulos con carcasa propia (`components/education/CrossMarginCourse.jsx`) porque aquí el
  orden es una secuencia, no un catálogo. Cada módulo declara **el error concreto que
  corrige** y lleva una comprobación de una pregunta, con la correcta rotando de posición.
  Todas sus cifras se reproducen en el simulador y están fijadas en `engine-check`: si el
  motor cambia, el texto se cae con él en vez de quedarse mintiendo.
- **i18n: 10 idiomas** (`lib/i18n/`): es, en, de, fr, ru, zh, ja, ar, **pt** (Portugal) e **it**.
  Mismo juego de claves en los diez, **0 huecos** (`node scripts/i18n-check.js`, en CI).
  Los textos legales (`lib/legalContent/`) también están en los 10; la versión
  vinculante sigue siendo la española.
- **Pagos**: Stripe + PayPal (`@paypal/react-paypal-js`) + **Revolut Pay** +
  **NOWPayments** (crypto, botón "Criptomonedas") + **Kunfupay** (enlace + alta manual,
  apagado hasta que haya enlaces configurados). Qué raíles se ven y se pueden cobrar lo
  decide `payment_methods_enabled`, y el backend lo comprueba en el checkout, no sólo la
  página. *No* OxaPay ni MaxelPay: ambas se probaron y se retiraron; no queda código de
  ninguna.
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
- **Las 1609 páginas estáticas son anzuelo, no contenido**: título, primer
  párrafo y llamada a la prueba de 7 días. La receta de cada estrategia, las
  tablas de mercado y las FAQ ya no se publican.
- **Journal de trading**, alertas de precio (WebSocket), historial de cálculos.
- **Buscador de la Academia por pregunta** (2026-08-14): `lib/eduIndex.js` indexa el
  contenido real de los 85 módulos llamando a los mismos 82 getters que pinta la página,
  y contesta con el módulo **y el apartado**. Funciona sin red. La IA
  (`POST /api/education/assistant`) es una segunda capa que **sólo redacta** sobre los
  candidatos que ya encontró el navegador; si cita un `id` inexistente, se descarta.

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
  >
  > `market_data.py` **ya no está en esa lista**: desde el 2026-08-22 su cascada de
  > failover entra por `/api/stock/{symbol}` cuando Yahoo no devuelve precio, y la
  > respuesta arrastra `stale`, `as_of` y `source` hasta la interfaz.
  - Dos módulos nuevos del 2026-08-22, ninguno con rutas propias:
    **`log_seguro.py`** (`log_safe`, extraído de `server.py` para que lo importen los
    12 módulos que registran datos del usuario) y **`brokers_referidos.py`** (el
    registro de brókers y las condiciones bajo las que un enlace es publicable;
    sirve `GET /api/brokers`).
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
| G-10 | ~~**El sitio servido por GitHub Pages no tiene CSP.**~~ Las cabeceras de `SecurityHeadersMiddleware` sólo viajan en las respuestas de la API (Cloud Run); Pages no deja definir cabeceras, así que el HTML de la web va sin `Content-Security-Policy`, `X-Frame-Options` ni `Referrer-Policy` | 🟠 | **Medio cerrado el 2026-08-27.** Hay CSP: en `public/index.html` para la SPA y una mucho más dura (`default-src 'none'`) en las 1.600 páginas estáticas, que son autocontenidas. Los orígenes NO se adivinaron: se midieron con Playwright sobre el build. Verificado con `tests/e2e/navegador/csp.js` —15 pantallas, cero violaciones— que corre en CI y **falla si la página no carga**, porque una página en blanco tampoco produce violaciones y ése era el falso verde fácil. Sigue 🟠 y no 🟢 porque `frame-ancestors` y `X-Frame-Options` **no funcionan en un meta**: el anti-clickjacking necesita cabeceras de verdad, o sea un CDN delante o salir de Pages |
| G-11 | ~~**La orden de desarrollo local documentada no puede conectar.**~~ `init_pool` exige SSL verificado en toda conexión TCP (rama Neon), pero el `DATABASE_URL` de dev que documentan CLAUDE.md y el README apunta a un Postgres local sin SSL → `CERTIFICATE_VERIFY_FAILED` | 🟢 | ✅ **Cerrado el 2026-08-27**: `init_pool` respeta `sslmode` como libpq. Y al arreglarlo apareció algo peor: **cifraba sin autenticar**. Pasarle un `SSLContext` a asyncpg sin decir `sslmode` deja el modo en `prefer`, y asyncpg fuerza entonces `CERT_NONE`: aceptaba cualquier certificado pese a que el comentario decía «SSL verificado». Ahora el modo va explícito (`verify-full` por defecto) y `disable` se rechaza en producción |
| G-12 | **ESLint no analizaba nada** (283/283 ficheros con error de parseo) y no corría en CI. Dejó pasar a producción un `idx` no definido que reventaba la calculadora de Fibonacci | 🟠 | ✅ **Cerrado (2026-07-27)**: config arreglada, lint en CI, 0 errores. Quedan **128 avisos** de símbolos muertos como deuda de limpieza |
| G-13 | **11 tarjetas del panel admin se quedaban vacías tras recargar** (efecto con deps `[]` que disparaba `Bearer null` y nunca reintentaba) | 🟠 | ✅ **Cerrado (2026-07-27)**: hook `useAuthedLoad` compartido, que espera al token real y relanza la carga cuando llega |
| G-09 | ~~**i18n incompleto**: 6 idiomas con ~290 claves sin traducir → caían a español~~ | 🟢 | ✅ **Cerrado (2026-07-11)**: backfill completo (candlestick, armónicos, opciones Black-Scholes/futuros/volatilidad/griegas, estrategias 6-9, auth, sesgos). Los 8 locales con sets idénticos (4401 c/u), 0 huecos. Eliminadas 9 claves muertas de de/fr/ru |
| G-14 | **Backend terminado que ningún usuario puede alcanzar.** Medido el 2026-08-17 con `gen-mapa.py`, ya con el detector arreglado: **38 rutas sospechosas** + 5 huérfanas por diseño = 43. Eran 43 + 5 = 48 hasta que el
asistente del plan de trading estrenó pantalla y consumió sus cinco rutas. Las cifras anteriores (35, 41, 51) salían de un detector que se equivocaba en las DOS direcciones: casaba por prefijo (`/backtest` daba por consumida al existir la página `/backtesting`), se quedaba con los dos primeros segmentos fijos y descartaba el resto (`/campaigns/{id}/send` se buscaba como «campaigns/send», que no existe porque el frontend escribe `campaigns/${id}/send`), y desconocía el `prefix="/admin"` con el que se monta `admin_routes.py`. Resultado: cinco rutas del panel que `AdminPage` llama a diario figuraban como muertas, y dos que nadie llama figuraban como «huérfanas por diseño» detrás de una hipótesis —«comprueba si AdminPage la construye dinámicamente»— que nadie comprobó nunca. Incluye los cuatro módulos completos —`trading_plan.py` (`/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance`), `backtest.py`, `portfolio_risk.py`, `american_options.py`— más el CRUD entero de `/portfolio`, `/performance/export`, `/education/pattern-catalog`, `/calculate/implied-volatility`, `/calculate/volatility-size`, `/options/term-structure` y el diario legado `/journal/trades`. | 🟠 | **Bajado a 29 el 2026-08-22, y cada una con una decisión escrita**: [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md) — borrar 7, construir 20, arreglar 2. Se retiraron 8 (~500 líneas) cuyo sucesor estaba escrito en el propio código, incluido el diario legado `/journal/trades` (segunda puerta autenticada a `db.trades`, el BUG-039) y `POST /backtest`, que metía el apalancamiento en el P&L. `/api/quote` dejó de ser la única puerta a `market_data.py` al enchufarse el failover a `/api/stock`. `check-rutas-muertas.py` corre en CI en las dos direcciones, así que la lista **ni crece ni se pudre** en silencio. Sigue 🟠 y no 🟢 porque quedan 20 pantallas por construir. Lo más barato y lo más pedido: `GET /performance/export` (CSV/Excel del diario) |
| G-15 | ~~**`trading_plans` no entra en las tres rutas del RGPD.**~~ La colección guardaba `user_id` pero no aparecía en `delete_account`, ni en `_USER_DATA_COLLECTIONS`, ni en el export de `/auth/my-data` | 🟢 | ✅ **Cerrado (2026-08-06)**: arreglada la CAUSA, no el síntoma — había **cuatro listas escritas a mano** y ahora derivan de una sola tupla (`_USER_DATA_COLLECTIONS` → `_ALL_USER_COLLECTIONS` → `_EXPORTABLE_COLLECTIONS`). El borrado de cuenta también se había quedado sin `journal_entries`. `test_user_data_collections_unit.py` fija que lo que se purga se borra y lo que se borra se puede exportar (salvo artefactos de seguridad) |
| G-16 | **Grupo B del saneamiento de licencias, sin hacer.** Acciones y ETFs de EE. UU., los 23 índices, los 15 futuros de materias primas y la cadena de opciones siguen saliendo de **Yahoo**, cuya licencia no permite redistribuir el dato en un producto de pago. El 2026-08-02 se retiró la *mención* pública, no la dependencia | 🟠 | Decisión de negocio con coste: IEX para acciones, ETF equivalentes para índices y materias primas, cadena sintética para opciones. **Cambia lo que ve el usuario**, por eso está parado |
| G-17 | ~~**El shim `Collection` sigue sin tests.**~~ Es la capa casera (~750 líneas) que traduce Mongo→SQL y de la que depende **todo** el backend. Bloquea el refactor de `server.py` (BUG-008): partir 8232 líneas sin red es cambiar deuda por riesgo | 🟢 | ✅ **Cerrado el 2026-08-27**: `tests/test_shim_collection_unit.py`, **44 pruebas contra PostgreSQL real** (operadores de consulta y escritura, reclamo atómico, agregación, `distinct`, TLS). Corren en CI con un servicio `postgres:16` — sin él serían 44 pruebas que no ejecuta nadie. **Encontraron dos fallos al escribirlas**: un `$regex` con un paréntesis suelto tumbaba la consulta (500), e `init_pool` cifraba sin autenticar. Con esto, BUG-008 (partir `server.py`) deja de ser cambiar deuda por riesgo |
| G-18 | ~~**`check-doc-links.py` no corre en CI.**~~ Existía, funcionaba y sólo se ejecutaba si alguien se acordaba; `PENDIENTES.md` acumuló dos referencias a documentos inexistentes sin que nada avisara | 🟢 | ✅ **Cerrado (2026-08-13)**: nuevo job `documentacion` en `ci.yml` con `check-doc-links`, `gen-mapa --check` y la paridad del catálogo. Y las dos referencias «rotas» no eran erratas: apuntaban a documentos reales que viven en una rama sin fusionar (ver auditoría del 13-08 §2.2) |
| G-20 | ~~**Dos esquemas incompatibles escribiendo en `db.trades`, y el P&L se pierde.**~~ `POST /journal/trades` guardaba camelCase (`entryPrice`) y `POST /performance/trades` snake_case (`entry_price`), **en la misma colección**, y ninguno filtraba al leer: `compute_trade_pnl` no encontraba `entry_price`, salía por la rama de `entry == 0` y devolvía `pnl = 0.0`, que `perf_update_trade` **persistía** al primer edit | 🟢 | ✅ **Cerrado (2026-08-06)**: `normalize_trade_schema` traduce en `compute_trade_pnl` (punto único por el que pasa todo el P&L), el endpoint legado **escribe ya en el esquema canónico**, los dos `PUT` hacen `$unset` de las claves viejas, y `migrate_trades_schema.py` limpia lo almacenado con backup y rollback. El mapeo `leverage`→`multiplier` recupera el importe **exacto**: misma posición en la fórmula. Verificado contra Postgres real |
| G-21 | **El diario no guarda las patas de una operación de opciones.** Cero apariciones de `legs`: no hay griegas agregadas de la estructura, ni cierre de una pata suelta, ni rolar media posición | 🟠 | **Media parte cerrada (2026-08-06)**: el R-múltiplo ya no se cae. El riesgo de una estructura sale de `max_loss` —la prima en una opción comprada, anchura − crédito en un spread— y no de `\|entry − sl\|`, así que una operación de opciones entra en la distribución de R y compara con el resto del diario. Lo que queda es el detalle por pata: reconstrucción `Position` → `Leg` → `Execution` |
| G-23 | **Una operación tiene un único precio de salida: no hay cierres parciales.** Afecta a todos los productos, no sólo a opciones — un scale-out de tres tramos hay que apuntarlo como tres operaciones, y entonces cada una lleva su propio saldo de cuenta y la analítica cuenta tres entradas donde hubo una | 🟠 | Misma reconstrucción que G-21: es `Execution` quien la resuelve. Mientras tanto, apuntarlo como una operación con el precio medio de salida es lo más fiel |
| G-24 | **La divisa de la cuenta no se convierte.** Todo se mide en la divisa en la que estén los precios. Un cruce sin USD (EURGBP) o un futuro europeo en una cuenta en dólares suman importes de divisas distintas como si fueran la misma | 🟡 | Necesita tipo de cambio a fecha de cierre; `ecb_rates.py` ya sirve el feed diario del BCE. El P&L de cada operación es correcto en su divisa: lo que no lo es, es el total |
| G-25 | ~~**Los ajustes del usuario no salían del navegador.**~~ Cuenta, suscripción, diario, alertas y estado de las calculadoras sí persistían; el tema, el idioma, las preferencias, los favoritos, el progreso de la Academia y **los setups del sistema de trading** vivían sólo en `localStorage`. Entrar desde el móvil era empezar de cero y vaciar la caché era perder los setups escritos a mano | 🟢 | ✅ **Cerrado (2026-08-08)**: `lib/cloudPrefs.js` respalda `localStorage` contra un único documento de `user_states` (`preferences_v1`), con **una fecha por ajuste** (para que cambiar el tema en un equipo no borre los setups de otro) y **dueño registrado** (para que dos cuentas en el mismo navegador no se hereden nada). Las reglas de fusión están en `lib/prefsMerge.js`, sin importaciones, probadas en `engine-check`. Verificado end-to-end en Chromium contra Postgres real |
| G-26 | **No se puede editar el perfil.** No existe `PUT /auth/profile` ni pantalla: el nombre y la foto son los del registro para siempre. En Ajustes sólo se puede cambiar contraseña, gestionar 2FA, exportar los datos y borrar la cuenta | 🟡 | Descubierto al cerrar G-25. Es un hueco distinto: no es que el dato no se guarde, es que no hay forma de cambiarlo |
| G-22 | ~~**Dos fuentes de verdad para las mismas estadísticas.**~~ `dashboard/JournalStats.jsx` y `education/ExpectancyCalculator.jsx` leen `/journal/stats`; `services/performanceApi.js` y `education/JournalEdgeButton.jsx` leen `/performance/analytics`. Fórmulas distintas sobre la misma colección → el usuario ve **dos expectancies distintas** según la pantalla | 🟢 | ✅ **Cerrado el 2026-08-27**, y no era sólo «dos formas de contar»: una estaba MAL. `/performance/analytics` usaba `winRate·avgWin + (1 − winRate)·avgLoss`, identidad que sólo se cumple si no hay breakevens — con un 0 en la muestra, ese `(1 − winRate)` se lleva la operación neutra y la cobra a precio de pérdida media. Con +100, −50 y 0 daba **0,00** contra los **16,67** reales. `/journal/stats` ya lo hacía bien y llevaba escrito el porqué; ahora las dos calculan el P&L medio por operación. Tres pruebas nuevas comparan las dos rutas sobre los mismos datos |
| G-37 | ~~**La región de despliegue se contradice dentro del propio checklist.**~~ | 🟢 | ✅ **Cerrado el 2026-08-27**, y no hacía falta la consola: `.claude/rules/infra.md` ya llevaba la comprobación del 2026-08-25 (`us-east1`, **sin Cloud SQL**, base externa por `DATABASE_URL`), hecha al retirar `cloudbuild.yaml` justo por describir esa misma ficción. El bloque de `europe-west1` del checklist —Cloud SQL, Artifact Registry, secretos— describía un montaje que no existe: seguirlo habría creado un SEGUNDO servicio en Europa con el frontend apuntando a EE. UU. |
| G-38 | **El shim `Collection` sigue sin tests (era G-17) y ahora bloquea también el reparto de `server.py`, que va por 9.4k líneas.** Sin red debajo, partirlo cambia deuda por riesgo | 🟠 | Duplicado de G-17; se mantiene por visibilidad. `$set/$inc/$push/$unset/$or/$in/$regex`, agregación y `find_one_and_update` contra PostgreSQL real |
| G-19 | ~~**Deprecaciones que romperán en la siguiente mayor**~~: `@app.on_event("startup"/"shutdown")` (FastAPI pide `lifespan`) y una `class Config` de Pydantic v1 (pide `ConfigDict`). `pytest` ya las escupe como warnings | 🟢 | ✅ **Cerrado el 2026-08-27**: `lifespan` en vez de `@app.on_event` y `ConfigDict` en vez de `class Config`. Como las dos funciones se definen mucho después de crear `app`, se enganchan por `lifespan_context` en vez de reordenar el arranque. **Verificado conduciendo un ciclo ASGI real**: `lifespan.startup.complete`, el pool creado por el arranque, y cierre limpio — no basta con que el decorador desaparezca |
| G-27 | ~~**Las passkeys no están documentadas en ninguna parte.**~~ `backend/passkeys.py` (242 líneas, 10-08) añadió un método de autenticación completo: no está en la tabla de módulos de `CLAUDE.md`, no está en el inventario §2, y la sección «Autenticación» de `CLAUDE.md` sigue describiendo sólo JWT + Google OAuth. `migrate_trades_schema.py` tampoco está en la tabla | 🟢 | ✅ **Cerrado**: `CLAUDE.md` § Autenticación pt. 5 las describe con el aviso del *origin* sin ruta, y `MAPA.md` lista `passkeys.py` y `migrate_trades_schema.py` (generado, así que no puede volver a desfasarse). Verificado el 2026-08-26: seguía marcado 🔴 estando hecho |
| G-28 | ~~**Se anuncia precio 0 a Google con muro de pago duro.**~~ `gen-seo-pages.js:421` emite `offers: {price:'0', priceCurrency:'EUR'}` en las páginas de calculadora, con títulos «Gratis»/«Free», mientras `public/index.html` declara ofertas de 17/45/200 €. El CTA lleva a `/dashboard`, que exige suscripción activa | 🟢 | ✅ **Cerrado**: `gen-seo-pages.js:435` ya no emite bloque `offers`, y el porqué está escrito ahí mismo. Verificado sobre el build el 2026-08-26 |
| G-29 | **`PENDIENTES.md` da por abierto lo que está cerrado.** Afirma que `trading_plans` no se borra ni se exporta (G-15, cerrado y verificado contra Postgres el 07-08) y que `FRONTEND_URL` cae a `tradingcalculatorpro.com` (hoy cae a `github.io`, `server.py:1167`). También cita 5652 claves (son 6110) y dice que no hay selector de instrumento (el multiproducto entró el 06-08) | 🟠 | Repasar `PENDIENTES.md` contra el código. Un documento de pendientes con datos falsos cuesta una sesión entera |
| G-30 | ~~**Código muerto en el frontend.**~~ 20 componentes `.jsx` que ningún fichero importa: 17 de `components/ui/` (1318 líneas) y 3 propios (`options/GreeksPanel.jsx`, `education/TradingBasicsGuide.jsx`, `education/WhyItMatters.jsx`, `dashboard/PriceTicker.jsx`, 933 líneas). **10 de los 27 paquetes `@radix-ui` del `package.json` sólo los usan esos muertos** | 🟢 | ✅ **Cerrado (2026-08-26)**: los 17 de `components/ui/` se retiraron con el andamiaje de shadcn y los 4 propios (937 líneas) se borraron ahora. `auditar.py` ya no encuentra ningún componente huérfano. Quedan los paquetes `@radix-ui` por desinstalar |
| G-31 | ~~**Residuos que dan instrucciones falsas.**~~ `backend/patches/server_fixes.patch` (parche manual de mayo, con `MONGO_URL` — la BD descartada), `backend/FIXES_README.md` (manda integrar un `fixes.py` que no existe), `backend/ADMIN_INTEGRATION.md` (ya integrado en `startup_event`), `memory/PRD.md`, `monitoring/`, `packaging/twa-manifest.json` y `check.sh` | 🟢 | ✅ **Cerrado (2026-08-26)**: los siete están en `_archive/residuos-2026-08-26/`, con un `LEEME.md` que explica qué instrucción falsa daba cada uno |
| G-32 | **Trabajo terminado que no está en `main`.** Las 16 ramas se clasificaron y se ejecutó la clasificación el 2026-08-18: **6 fusionadas**, **1 rehecha** sobre `main`, **4 cerradas sin fusionar** (sus `refs` siguen en `origin`, con el SHA anotado) y **5 pendientes de una decisión que no es técnica** — la migración de cuenta GCP, el salto mayor de `lucide-react`, y tres de diseño, producto y arquitectura | 🟠 | Quedan las 5 de la §5 de [`CIERRE_RAMAS_2026-08-18.md`](./CIERRE_RAMAS_2026-08-18.md), que es donde está el porqué de cada una. Los 14 PRs de Dependabot siguen sin tocar |
| G-33 | ~~**Las catorce calculadoras sueltas siguen sin rehacer, ni por dentro ni por fuera.**~~ `LotSizeCalculator` da **10 $/pip por lote estándar siempre** (falso en USDJPY, en el oro y en cualquier cruce sin dólar) con su propia tabla de once pares escrita a mano, y `PositionSizeCalculator` pinta `BTC` fijo en el resultado sea cual sea el activo. La mesa (2026-08-14) hace lo correcto sacando el pip de la ficha del instrumento, pero las catorce sueltas no se tocaron | 🟢 | ✅ **Cerrado y verificado el 2026-08-27.** La acusación concreta ya no se sostiene: `LotSizeCalculator` saca el pip de la ficha (`pipValue` + `quoteStep`) y su propio comentario documenta que el `10` a mano se retiró; `PositionSizeCalculator` y `SpotCalculator` derivan el símbolo del activo elegido y «BTC» es sólo el respaldo. Comprobado por ruta independiente contra el contrato: EURUSD 10 $/pip, **USDJPY 1.000 ¥ = 6,36 $** (no 10), XAUUSD 1 $ por 0,01, y **EURGBP devuelve `null`** en divisa de cuenta en vez de inventar un cambio. `engine-check` fija esos mismos casos contra el `tick_value` publicado (MES, ES, CL, GC, USDJPY, XAUUSD, EURGBP) |
| G-34 | **La mesa dimensiona UNA pata, no la estructura de opciones.** Con producto `option` calcula sobre la prima y el número de contratos, que es correcto para los cuatro sueltos y para cualquier compra; pero la pérdida máxima real de un spread es *anchura − crédito* y la de un iron condor depende de las cuatro patas, y eso la mesa no lo sabe: el selector de estructura elige la etiqueta y el enlace a `/options/calculator`, no el cálculo | 🟠 | Es el mismo modelo `Position → Leg` que piden G-21 y G-23 para el diario. Mientras tanto, la mesa no miente —no publica una pérdida máxima de estructura— pero tampoco la calcula, y el usuario tiene que ir a `/options/calculator` para eso |
| G-35 | ~~**El banco de pruebas E2E no arrancaba en un contenedor nuevo.**~~ `stack/sembrar.py` hacía `POST /auth/login` a secas con `qa@example.com`, una cuenta que **nadie creaba**: en una base recién creada devolvía 401, `arriba.sh` seguía adelante con un aviso en amarillo, y las ocho sondas de navegador fallaban porque afirman sobre 13 filas y +$3.471,86. O sea: en TODA sesión remota, que empieza con un clon fresco | 🟢 | ✅ **Cerrado (2026-08-14)**: usa `cuenta()` y `da_premium()` de `entorno.py`, los mismos helpers que ya usaban las sondas de API — registraban si el login no valía y saltaban el muro de pago. Sólo que este script no los usaba. Verificado en frío: 10 operaciones sembradas |
| G-36 | ~~**`/verify` decía «todo verde» sobre PRs que CI iba a tumbar.**~~ Comprobaba 4 de las 10 verificaciones de `ci.yml` —faltaban `engine-check`, `check-edu-index`, `check-fetch-credentials`, `gen-mapa --check`, `check-doc-links` y la paridad del catálogo—, hablaba de **8 idiomas** cuando hay 10, compilaba **3 módulos** de Python de 26, y corría `pytest -k unit` en vez del suite | 🟢 | ✅ **Cerrado (2026-08-14)**: reescrito para ejecutar exactamente lo de CI, con los tiempos reales de cada paso, qué hacer cuando el contenedor está crudo, y una regla escrita: si se añade una comprobación a CI, se añade ahí |

---

## 4. Qué hay que PROBAR (plan de test)

**Automático (verificado el 2026-08-26, corriendo TODO lo que corre `ci.yml`):**
> ⚠️ Estas cifras se quedaban desfasadas cada pocas semanas porque se escriben a
> mano. Las que se pueden generar viven en [`MAPA.md`](./MAPA.md); las de aquí
> son el resultado de una ejecución concreta, así que llevan su fecha y hay que
> volver a correrlas antes de creérselas.

- `pip install -r requirements.txt -r requirements-dev.txt` **primero**: sin
  `pytest-asyncio` fallan 19 tests en un contenedor recién clonado. ✔
- `cd backend && pytest tests/ -q` → **1086 passed, 72 skipped**. ✔
- `cd backend && python -m py_compile *.py` → los **35** módulos. ✔
- `cd frontend && npx eslint src scripts` → 0 errores, **116** avisos. ✔
- `node scripts/i18n-check.js` → **6965 × 10**, 0 huecos · `engine-check` → **429/429** ·
  `simulacion-masiva` → **35.673** comprobaciones · `check-edu-index` → 87 = 87. ✔
- `cd frontend && npm run build` → exit 0, **1608** URLs (sin `/performance`). ✔
- `python scripts/check-doc-links.py` → **101** documentos, 0 roturas. ✔
- `bash scripts/probar-verificadores.sh` → todos detectan su sabotaje. ✔

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
- [ ] 🔴 **Desplegar el backend** tras el cutover de dominio: el arreglo del CORS está en
      `server.py` y Cloud Run corre el código anterior. Sin esto la web no llama a la API.
- [ ] Verificar **Custom domain** = `tradingcalculator.pro` y **Enforce HTTPS** en GitHub Pages.
- [ ] Confirmar **Google OAuth**: origen `https://tradingcalculator.pro` autorizado.

### P1 — Robustez antes de escalar
- [ ] **Dar interfaz a lo que ya está escrito** (G-14) — 20 rutas, todas decididas en
      [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md). La más barata y la más pedida:
      `GET /performance/export` (CSV/Excel del diario).
- [x] ~~**`trading_plans` en las tres listas del RGPD** (G-15)~~ — cerrado en BUG-044 y
      **verificado contra Postgres** el 2026-08-07: el plan viaja en el export y el
      borrado de cuenta lo elimina (0 filas en 6 tablas).
- [ ] Cerrar **C-08** (API keys solo en Secret Manager).
- [ ] `FRONTEND_URL` obligatoria en producción (T-02 del backlog de auditoría).
- [ ] **CSP** en el HTML de Pages, verificada en navegador (T-01 / G-10).
- [ ] Confirmar **Dependabot + CodeQL + secret scanning** activos *(los ficheros `.github/dependabot.yml` y `.github/workflows/codeql.yml` ya existen; falta comprobar el interruptor en Settings)*.
- [ ] Tests del shim `Collection` (G-17).
- [x] ~~`check-doc-links.py` en CI (G-18)~~ — cerrado el 2026-08-13 con el job
      `documentacion` de `ci.yml`.
- [ ] **Las 7 rutas marcadas `BORRAR` que quedan** — no son duplicados como las 8 ya
      retiradas: cada una exige una decisión de producto (¿el Monte Carlo del backend
      compite con el del cliente? ¿los precios de divisas/índices/materias primas
      pasan por `market_data` o se van?). Ver [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md).

### P2 — Producto
- [ ] **G-33**: las catorce calculadoras del modo básico, con la aritmética de la mesa
      (hoy `LotSizeCalculator` da 10 $/pip en el yen y en el oro).
- [ ] **G-34**: dimensionar la ESTRUCTURA de opciones, no una pata suelta. Mismo modelo
      `Position → Leg` que piden G-21 y G-23.
- [ ] **BUG-007**: sincronizar preferencias de usuario al backend.
- [ ] **TradingView**: guardar layouts/indicadores por usuario (ver doc dedicado).
- [ ] Decidir el **Grupo B** de proveedores de datos (G-16).
- [ ] Revisión **nativa** de las traducciones `pt` e `it` antes de anunciarlas.
- [ ] Decidir si `/affiliate` cae tras el muro de pago (hoy es sólo-auth y el backend ya rechaza a quien no paga).
- [ ] **Que `PricingPage` lea el precio de `GET /api/plans`.** Hoy el importe está
      en doce sitios y el que manda al cobrar es el único que la página no
      consulta. `check-precios.py` lo vigila en CI, pero es una tirita: la cura
      es leer el precio de donde se cobra. Skill `conversion-y-precio`.
- [ ] **Instrumentar el embudo.** Hoy no se sabe cuántos pasan de la landing a
      `/pricing`, cuántos abandonan el checkout ni —lo que más importa— **cuántas
      pruebas de 7 días acaban en cobro**. Sin ese último número, discutir sobre
      el trial es opinión.
- [ ] **Brókers referidos**: dar de alta los programas (Axi por la entidad CySEC,
      Dukascopy Europe), confirmar y fechar los dos porcentajes de pérdidas en la web
      del propio bróker, y dejar los logos en `assets/partners/`. Hoy los seis salen
      con la web pública y `esReferido: false`, que es lo honesto mientras no pague
      ninguno. Ver [`BROKERS_REFERIDOS.md`](./BROKERS_REFERIDOS.md).
- [ ] **La tarjeta de Margex anuncia bono e incentivos sin aviso de riesgo** («sin KYC,
      bono de 100 $, cashback hasta 10.000 $»). Es justo lo que la intervención de
      producto de ESMA prohíbe promocionar a minoristas de la UE. Con criterio suizo de
      sola promoción puede sostenerse, pero es una decisión que conviene tomar a la
      vista y no por omisión.

### P3 — Deuda técnica
- [ ] `on_event` → `lifespan` y `class Config` → `ConfigDict` (G-19).
- [ ] Bajar los 126 avisos de ESLint a 0 y subir el linter a `error`.
- [ ] **Bajar el peso de las pantallas públicas.** Medido el 2026-08-23: la portada
      descarga **1 281 KB de JS** sin comprimir y las cinco páginas públicas pesan
      casi lo mismo — el síntoma exacto de que no hay code-splitting por ruta.
      Herramienta: `node tests/e2e/navegador/peso.js` (presupuesto en CI). Cómo
      arreglarlo: skill `reorganizar-frontend` § 2.3.
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
  autorizar es **`https://tradingcalculator.pro`**, que es donde se sirve el frontend
  desde el 2026-08-28.
- **SendGrid**: API key + dominio remitente verificado (`alerts@tradingcalculator.pro`).
- **GitHub**: Secrets de Actions (ver DEPLOY_CHECKLIST) + branch protection.
- **DNS**: hecho. `tradingcalculator.pro` y su `www` resuelven a GitHub Pages y el build
  se publica en la raíz del dominio propio. Lo que queda fuera del repo está en
  [`MIGRACION_DOMINIO.md`](./MIGRACION_DOMINIO.md) § «Lo que falta».

---

---

## 7. Registro de sesiones

**Las entradas viven en [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md)** — desde el
2026-06-25 (`grep -c "^#\{2,3\} 2026-" docs/REGISTRO_SESIONES.md` las cuenta: **155**).
Se separaron el 2026-08-13: eran el 93 % de este documento y hacían que consultar el
semáforo costase leer 320 KB.

Las cinco últimas:

| Fecha | Sesión |
|---|---|
| 2026-08-31 (cont. 5) | Panel admin: navegación por secciones + limpieza de colores |
| 2026-08-31 (cont. 4) | BUG-074: el cifrado de secretos fallaba en silencio |
| 2026-08-31 | SEO para buscadores de IA: robots por grupos, llms.txt y la contradicción del sitemap |
| 2026-08-29 (2) | Entra el Master Plan de la Academia, reverificado |
| 2026-08-28 | Lo que el banco de pruebas no miraba: un tema entero, un esquema y un `null` |

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
   Verifica antes de afirmar (compila, ejecuta, lee el archivo).
