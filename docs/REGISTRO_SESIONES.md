# 📓 Registro de sesiones — TradingCalculator.Pro

> **Histórico append-only.** Cada sesión de trabajo deja aquí su entrada, con fecha,
> qué se hizo, qué se verificó y qué se dejó fuera a propósito. **Nunca se reescribe
> una entrada pasada**: si algo resultó estar mal, se dice en la entrada nueva.
>
> ⚠️ **Este fichero NO se lee entero.** Era §7 de
> [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) y suponía el **93 %** de aquel documento:
> quien quería consultar el semáforo o el backlog se tragaba 3.900 líneas de historia.
> Separarlo bajó el coste de orientarse de ~80.000 tokens a ~7.500. Para saber **dónde
> está el proyecto hoy**, lee `ESTADO_PROYECTO.md`. Este fichero se abre cuando hace
> falta saber **por qué** algo acabó como acabó: se busca por fecha o por palabra
> (`grep -n "^## 2026-08" docs/REGISTRO_SESIONES.md`), no se lee de arriba abajo.
>
> Las entradas están en orden de escritura, que **no siempre es orden cronológico**:
> algunas sesiones se registraron a posteriori. La fecha del título manda.

---

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

### 2026-08-05 (9) — El puente: una ecuación que ordena los tres paneles
Petición del propietario tras el estudio: implementar lo propuesto. La respuesta al
«¿R:R o rentabilidad?» no era elegir, sino **medir en R y presentar en rentabilidad**,
con una sola ecuación uniendo las tres pantallas:

```
rentabilidad mensual ≈ esperanza (R/op) × operaciones al mes × riesgo por operación (%)
```

Cada factor tiene dueño: la ventaja es del **Setup**, la frecuencia del **Diario**, el
riesgo de las **reglas del sistema** y el resultado de la **Analítica**.

- ✅ **Modo objetivo en Proyección** (`routesToTarget`): escribes «quiero un 10 % al mes»
  y la ecuación se lee al revés, dando los **tres caminos** con su precio: más ventaja
  (qué acierto haría falta con tu payoff), más operaciones (cuántas al mes) o más riesgo
  (qué %). Cada camino trae su proyección hecha —cada cuánto se llega, drawdown p95 y
  meses en rojo—, y ahí se ve la lección: en el escenario de prueba los tres llegan al
  mismo sitio, pero el drawdown p95 es **11 % por ventaja, 20 % por frecuencia y 31 % por
  riesgo**. El riesgo es la palanca fácil y la única que puede echarte del juego. Lo
  aritméticamente imposible (acierto > 100 %) se marca, no se maquilla.
- ✅ **Contribución de cada setup a la rentabilidad mensual**: `≈ +3,1 % (0,26 R × 12
  ops/mes × 1 % de riesgo)`. Convierte la lista de setups en un orden accionable — un
  setup de 0,4 R que se da dos veces al mes aporta menos que uno de 0,15 R que se da
  quince, y sin esta línea los dos se leían igual. Para eso `by_setup` publica ahora
  **`trades_per_month` por grupo** (None sin 21 días de recorrido).
- ✅ **La Analítica encabeza con rentabilidad por periodo** (mes/trimestre/año), medida
  del diario: `returns_by_period`. Cada mes se mide sobre **el saldo con el que empezó
  ese mes**, los trimestres y años se **componen** (un +10 % y un −10 % son −1 %, no 0),
  y un mes sin operaciones **no se rellena con 0 %** — no operar no es rendir cero.
- ✅ **El Diario dice qué le falta al dato**: columna **% de cuenta** junto a R (un +2R
  puede ser un +0,4 % o un +4 % según el tamaño) y aviso de las operaciones cerradas
  **sin stop** (sin R no cuentan para la ventaja ni para la proyección) y **sin saldo**
  (fuera de la rentabilidad por periodo). El diario es la fuente de todo lo demás:
  callar lo que falta hace que los otros paneles midan sobre menos muestra de la que el
  usuario cree.
- ✅ **Verificado**: `engine-check` **141/141** (+8 del puente, incluido que subir riesgo
  daña el drawdown mucho más que subir la ventaja) · `pytest` **550 passed / 74 skipped**
  (+5) · ESLint 0 errores · `i18n-check` **5817 claves × 10 idiomas** (+24) · build OK.

---

## 2026-08-06 — Auditoría del diario: verificación y Fase 0

Llega una auditoría externa del diario, el plan y la analítica. Antes de tocar nada
se contrastó **hallazgo por hallazgo contra el código**. El registro completo está en
[`AUDITORIA_DIARIO.md`](./AUDITORIA_DIARIO.md); aquí, lo que cambió.

### Lo que resultó cierto (y grave)

- ✅ **El P&L se pierde de verdad.** Dos esquemas incompatibles conviven en
  `db.trades`. Reproducido ejecutando el código del repo: un trade guardado por
  `/journal/trades` con `pnl 10.0` se lee desde analítica como `0.0`, y
  `perf_update_trade` lo **persiste** al primer edit. Nuevo hueco **G-20**, BUG-039.
  No se arregla en Fase 0 a propósito: el parche de lectura no recupera lo ya
  corrompido, hace falta el modelo unificado y la migración.
- ✅ **El diario es de una sola pata** — cero apariciones de `legs`. Hueco **G-21**.
- ✅ **Dos fuentes de verdad** para las mismas estadísticas. Hueco **G-22**.

### Lo que resultó mal diagnosticado

- ❌ **El sitemap.** La auditoría lo vendía como «diez minutos y arregla el SEO del
  sitio entero»: cambiar `DOMAIN` al dominio propio. **Habría roto el SEO en vez de
  arreglarlo.** El workflow compila con `PUBLIC_URL=/Tradingcalculatorpro.com`,
  publica con `keep_files: false` y **sin** paso `cname:`; no hay `public/CNAME`; y
  canonical, hreflang, OG, JSON-LD, `robots.txt` y `homepage` apuntan **todos**
  coherentemente a GitHub Pages. Cambiar solo el sitemap deja las URLs anunciadas
  contradiciendo al canonical, y Google descarta las anunciadas. Además
  `tradingcalculatorpro.com` resuelve a Cloudflare, no a GitHub Pages — y **BUG-037
  ya lo decía**: es «el dominio que todavía no está en uso».
  Hecho en su lugar: el origen sale de `SITE_ORIGIN` (mismo valor por defecto, cambio
  sin efecto funcional), de modo que la mudanza sea **un interruptor** y no ocho
  ediciones descoordinadas. Checklist en [`MIGRACION_DOMINIO.md`](./MIGRACION_DOMINIO.md).

### Fase 0 — hecho

- ✅ **`/journal/stats` ordena** (BUG-040). Era el único sitio que no llamaba a
  `sort_trades_chronologically`, teniéndola ya importada. Verificado sobre las 24
  permutaciones de un caso de 4 operaciones: antes salían dos drawdowns distintos
  (50 y 80), ahora uno. Hay un test que **comprueba que sin ordenar el bug es real**,
  para que el de arriba no acabe probando nada.
- ✅ **El breakeven deja de ser una pérdida y el profit factor deja de ser 0**
  (BUG-041). Categoría propia `breakeven`, que ni extiende ni reinicia la racha;
  `profitFactor` es `None` sin pérdidas y la UI pinta `∞`. De paso, `expectancy` pasa
  a ser la media de P&L por operación: la fórmula anterior **cobraba cada scratch al
  precio de una pérdida media**, y es idéntica cuando no hay scratches.
  `JournalStats.jsx` hacía `.toFixed(2)` sobre lo que ahora puede ser `null` —
  corregido a la vez.
- ✅ **`limit` topado a 500** en los dos listados y **la analítica avisa cuando
  trunca** (BUG-043): se piden `MAX+1` filas para distinguir «justo en el límite» de
  «hay más», y la respuesta publica `truncated`, `trades_analyzed` y
  `truncation_notice`. Primera regla de honestidad numérica aplicada a una ventana.
  ⚠️ `Query` **no estaba importado** en `server.py`: sin detectarlo, el arranque
  habría caído con `NameError`.
- ✅ **Diario de `localStorage` congelado, no borrado** (BUG-042). Guardaba bajo clave
  global sin `user_id` —dos cuentas en el mismo navegador compartían operaciones— con
  una tercera fórmula de P&L y una tercera implementación de estadísticas. Ahora el
  store no acepta escrituras (`addTrade`/`updateTrade` retirados, `getStats`
  eliminado) y el componente es un archivo de solo lectura que **exporta a CSV y
  JSON** antes de que el usuario borre. Quien no tenga datos ahí no ve nada.

### Verificado

`pytest` **564 passed / 74 skipped** (+14 en `tests/test_journal_stats_unit.py`) ·
`py_compile` de todos los módulos · ESLint **0 errores** (122 avisos, −1) ·
`i18n-check` 5817 claves × 10 idiomas · `engine-check` **141/141** ·
`npm run build` OK · `check-doc-links` 48 documentos, 0 roturas.

### Lo siguiente

Por orden de dependencia: **modelo unificado multi-pata** (G-20/G-21) → **migración
con recuperación del P&L a cero** → vocabulario de opciones en el plan → analítica y
gráficos. Antes de escribir módulo nuevo, mirar **G-14**: cuatro módulos ya escritos y
con tests siguen esperando interfaz.

---

## 2026-08-06 (2) — El backend, entero: se deja de perder el P&L

Segunda pasada sobre la auditoría, esta vez arreglando lo que la Fase 0 dejó
documentado a propósito.

### BUG-039 cerrado — el P&L ya no se pierde

Cuatro capas, porque **traducir al leer no basta si se siguen generando
documentos divergentes**:

1. **`normalize_trade_schema`** llamada desde `compute_trade_pnl`, que es el punto
   único por el que pasa todo cálculo de P&L: un documento del diario legado vale
   su importe real en cualquier ruta de lectura desde el despliegue, sin esperar
   a la migración. El mapeo que lo hace posible es `leverage` → `multiplier`:
   ambos ocupan **la misma posición en la fórmula** (`(exit−entry) × qty × X`),
   así que la traducción reproduce el importe **exacto**. Verificado con
   apalancamiento 1, 3, 5 y 10, y en corto.
2. **`POST /journal/trades` persiste ya en snake_case.** Sigue aceptando el
   payload camelCase de siempre (compatibilidad de API), pero deja de crear
   documentos del esquema viejo. Cortar la fuente es lo que impide que esto se
   regenere solo.
3. **Los dos `PUT` hacen `$unset`** de las claves legacy. `$set` no borra: sin
   esto, un documento migrado al vuelo conservaba las camelCase junto a las
   canónicas y el choque se reproducía en el documento recién arreglado.
4. **`backend/migrate_trades_schema.py`**: idempotente, **dry-run por defecto**,
   copia en `trades_migration_backup` y `--rollback`. Un documento cuyo P&L
   recalculado no cuadre con el guardado se marca para revisión y **no se toca**
   — migrarlo escribiría una cifra que el usuario nunca vio.

`roe` deja de almacenarse: era un campo derivado guardado, es decir, condenado a
desfasarse en cuanto se editara la operación. Se recalcula en la respuesta.

### BUG-044 — las cuatro listas del RGPD, unificadas (cierra G-15)

`trading_plans` no estaba en la purga por retención, ni en `delete_account`, ni
en el export. Al arreglarlo apareció que el borrado de cuenta del **usuario**
tenía *otra* lista distinta de la del admin, también incompleta (le faltaba
`journal_entries`).

**La causa no era que la lista estuviera mal: era que había cuatro.** Ahora
derivan de una sola tupla, con las categorías que tienen semántica propia
declaradas como tales: facturación (se borra, no se purga por impago),
referidos (créditos ganados, no datos de trading) y artefactos de seguridad
(se borran y **nunca** se exportan — mandarle sus tokens al usuario es una
regresión de seguridad, no portabilidad).

### Verificado contra Postgres real, no solo unitario

Se tocó persistencia, así que los unitarios no bastaban. Con Postgres 16 por
socket: `$unset` efectivo, tablas nuevas creadas, importes intactos tras migrar
(10,0 / 40,0 / 60,0 exactos), el documento sospechoso sin tocar, y rollback
restaurando. El script de migración se ejecutó de verdad: dry-run → apply →
segunda pasada (0 migrables, idempotente) → rollback.

`pytest` **601 passed / 74 skipped** (+37) · `py_compile` OK · ESLint 0 errores ·
i18n 10 idiomas · `engine-check` 141/141 · `check-doc-links` 49 documentos.

### Lo que queda

**G-21, el diario de una sola pata.** Sigue sin poder registrar un spread, un
condor, un calendar ni un PMCC. Eso ya no es un arreglo: es la reconstrucción del
modelo (`Position` → `Leg` → `Execution`). El trámite que antes la hacía cara
—dar de alta la colección en cuatro listas— ya no existe.

⚠️ **El backend no se despliega solo.** Nada de esto está vivo hasta un
`cloudbuild.yaml` a mano, y la migración es un paso aparte que se lanza contra la
base de producción (`--apply`) **después** de desplegar.

---

## 2026-08-06 (3) — El diario deja de ser un diario de acciones

El diario sabía registrar una cosa: *comprar N unidades a un precio*. Eso describe
una acción al contado y **ninguna otra cosa**. Un lote de forex son 100 000 unidades
de la divisa base; un contrato de oro en COMEX son 100 onzas; un micro E-mini vale
5 $ por punto; un perpetuo paga funding cada ocho horas; un CFD de oro a 20× no
mueve 20 veces el P&L, mueve 20 veces el **margen**. Sin esos datos, dos operaciones
con los mismos números en pantalla significaban cosas distintas y la analítica las
sumaba como si no.

### El catálogo: `backend/instruments.py` (nuevo)

Siete productos —acciones, CFD, futuros, forex, cripto spot, cripto perpetuo y
opciones— más `spot`, que es lo que llevan guardado las operaciones anteriores y
sigue comportándose **exactamente igual** (×1, sin apalancamiento, sin coste de
mantenimiento): ninguna operación existente cambia de valor al leerse.

Con ficha por símbolo: 29 contratos de futuros con su tick y su valor de tick, 35
pares de forex con el pip correcto (0,01 contra el yen, 0,0001 en el resto), 16
subyacentes de CFD con su tamaño de lote y su apalancamiento típico —ahí vive el
«CFD del oro a 20×»— y 10 perpetuos con su tope y su tasa de mantenimiento.

⚠️ **El catálogo PREFIJA, no decide.** Cada operación guarda su propio tamaño de
contrato y su propio apalancamiento; el catálogo sólo los rellena la primera vez.
Un símbolo fuera de catálogo devuelve `contract_size: None` —no 1— y dispara el
error `contract_size_missing`: un contrato de crudo a ×1 en lugar de ×1000 no da un
P&L aproximado, da uno mil veces menor.

### Lo que decidió la forma del módulo

- **El apalancamiento NO multiplica el P&L.** Multiplica el margen, y con él la
  rentabilidad sobre ese margen y la cercanía de la liquidación. 1 000 $ de nocional
  ganan lo mismo a 1× que a 100×. Fijado con un test parametrizado a 1/5/20/100×,
  porque es lo primero que se rompe al refactorizar —el diario legado sí lo metía en
  la fórmula, y el mapeo de compatibilidad sigue vivo.
- **Lo que sí multiplica es el tamaño de contrato**, y de ahí salió BUG-045: la
  regla del 1-2 % de riesgo lo ignoraba, así que **no saltaba jamás** en opciones,
  futuros ni forex. Sobrevivió porque en `spot` multiplicar por 1 no se nota.
- **La exposición, no la X.** El tope que pidió el usuario —que la posición no
  supere 10 veces el saldo— se mide sobre el **nocional contra la cuenta**, no sobre
  el número del apalancamiento: 100× sobre 100 $ en una cuenta de 10 000 son 10 000 $
  de nocional y no tienen nada de malo; 20× sobre 20 000 $ en esa misma cuenta son
  400 000 $ y una vela normal se los lleva. El umbral vive en `plan["risk"]`
  (`max_exposure_multiple`), como manda la regla del proyecto.

### Las unidades: el trader escribe en lo suyo, se guarda un precio

Stop y objetivo se escriben en precio, pips, ticks, puntos, % del precio, importe
fijo, % de la cuenta o múltiplos de R. **Lo que se almacena es siempre un nivel de
precio**, y por eso R, drawdown, MAE/MFE y la distribución siguen leyendo los mismos
campos que leían: la analítica no se entera de que existen unidades. El número
tecleado y su unidad viajan al lado sólo para repintar el formulario tal cual se
dejó. Un objetivo en R sin stop es `None`, no cero — un cero pondría el objetivo en
la entrada.

### Costes: comisión y lo que cuesta NO cerrar

Funding en perpetuos (por periodo de 8 h) y comisión nocturna en CFD y forex
(interés anual prorrateado por noches). Se puede dar el importe o la tasa: **el
importe declarado gana siempre**, porque ninguna fórmula nuestra mejora un extracto,
y la respuesta dice cuál de las dos cosas es (`carry_source`). Un perpetuo al 0,01 %
cada 8 h cuesta ~0,9 % del nocional al mes; con 20× eso es el 18 % del margen, y era
invisible en el diario.

### Opciones: parejas, no aparte

Mismo formulario, mismo modelo, misma analítica. Lo único distinto es de dónde sale
el riesgo: **`max_loss`**, no `|entrada − stop|`. Con eso, una opción comprada tiene
R (la prima ES la pérdida máxima) y un spread de crédito también (anchura − crédito),
así que entran en la distribución de R, en el R medio y en la comparación con el
resto del diario. Antes, casi toda operación de opciones salía con `r_multiple =
None` y se caía sola de la analítica — la mitad del hueco **G-21**. Vender desnudo
sigue sin tener pérdida máxima definida: `None`, no un número tranquilizador.
Se añaden IV de entrada/salida, delta, subyacente y desenlace (asignada, vencida sin
valor, ejercida, roleada): sin eso no se puede saber si la operación salió por
dirección o porque se pagó cara la volatilidad.

### Avisos y SMS

`notifications.py` (nuevo) reparte un aviso por tres canales y **dice cuáles
funcionan de verdad** (`GET /alerts/channels`). Las alertas del diario no montan un
vigilante nuevo: escriben en la misma colección `alerts` con `trade_id`, así que las
recorre el poller que ya existía; editar el stop mueve el aviso y cerrar la operación
lo retira. El SMS está implementado contra Twilio y queda operativo en cuanto existan
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_FROM_NUMBER` en Secret Manager —
**no queda código pendiente, queda el alta de la cuenta**. Sin ellas responde
`not_configured` y la interfaz lo dice antes de que el usuario cuente con ello. Tope
de 20 SMS por usuario y hora: un bucle en el poller no puede convertirse en factura.

### Paridad backend ↔ frontend

El catálogo se genera: `scripts/gen-instruments-js.py` escribe
`frontend/src/lib/instrumentSpecs.generated.js` desde `instruments.py`, y `--check`
falla si divergen. La **matemática** sí está escrita dos veces a propósito (el
navegador no puede esperar a la red para avisarte del tope mientras escribes, y el
backend no puede fiarse del cliente): las dos están cubiertas con los **mismos
números** en `test_instruments_unit.py` y en `engine-check.js`.

### Verificado

`pytest` **679 passed / 74 skipped** (+76) · `py_compile` de todos los módulos ·
ESLint **0 errores** · `i18n-check` **5979 claves × 10 idiomas** (+162) ·
`engine-check` **171/171** (+30) · `gen-instruments-js --check` en paridad ·
`npm run build` OK · `check-doc-links` 49 documentos.

### Lo que NO entra (y por qué)

- **Multi-pata real (G-21 completo).** Un spread se registra hoy como una posición
  con su prima neta y su pérdida máxima declarada —que es lo que hace falta para que
  tenga R y compare con el resto—, pero **no guarda pata por pata**: no hay `legs`, y
  con ello no hay griegas agregadas de la estructura, ni cierre parcial de una pata,
  ni rolar media posición. Sigue siendo la reconstrucción del modelo
  (`Position` → `Leg` → `Execution`) que ya estaba anotada.
- **Cierres parciales** en cualquier producto: una operación sigue teniendo un único
  precio de salida.
- **Conversión de divisa de la cuenta.** Todo se mide en la divisa en la que estén
  los precios; un par cruzado sin USD y una cuenta en euros no llevan tipo de cambio.
- **Márgenes reales del bróker.** Los del catálogo son de referencia y editables; el
  precio de liquidación es una estimación de margen aislado y se publica etiquetada
  como tal, con sus supuestos al lado.

---

## 2026-08-07 — La interfaz aprende que el backend puede ir por detrás

El PR #177 se mergeó a `main` y **no se publicó**: el push no disparó
`deploy-gh-pages.yml` (workflow activo, cero ejecuciones para `61a8fa2`), así que
`gh-pages` se quedó en `deploy: 578a220a` y la web siguió sirviendo el build
anterior. Verificado sobre la rama publicada, no sobre suposiciones: los textos del
PR #176 sí están en el bundle vivo y los del #177 no.

Al ir a publicarlo apareció el problema real, que no era el workflow:

> El frontend se publica **solo** al mergear; el backend se sube **a mano**. Esa
> asimetría no es un accidente: es la forma permanente del proyecto desde que se
> retiró el workflow de backend (2026-08-03). O sea que la ventana en la que el
> navegador va por delante del servidor es **el estado normal durante un rato**.

Y en esa ventana el diario multiproducto no degradaba: **rompía**. El backend
anterior valida `instrument_type` contra `^(spot|option)$`, así que los cinco
productos nuevos —y el valor por defecto del formulario, `stock`— recibían un 422.
Publicar el frontend habría dejado el diario sin poder guardar ni una operación.

### Lo que se ha hecho

La interfaz ahora **pregunta** en vez de suponer. `GET /performance/instruments`
existe sólo en la versión que entiende los productos, así que sirve de sonda: es
pública, no toca la base de datos y se consulta una vez por sesión.

- **404/405** (el servidor contesta pero no conoce la ruta) → backend anterior: el
  selector se queda en spot y opciones, y una línea explica por qué. Decirlo es la
  mitad del arreglo: sin el aviso, el usuario ve menos productos de los que la web
  anuncia y no sabe si es un fallo suyo.
- **Fallo de red o 5xx** → `null`, y se ofrece todo. Recortar la aplicación por un
  corte de red sería peor que el problema que esto evita.
- **Además, la red de seguridad**: si aun así llega un 422 sobre `instrument_type`,
  se traduce al mismo mensaje y el selector se ajusta solo. El detalle de Pydantic
  («string does not match regex») no le dice nada a nadie.

Con esto, **el orden de despliegue deja de importar**: se puede publicar el
frontend antes que el backend y lo peor que pasa es que durante un rato se opera
con menos productos, diciéndolo. El backend sigue teniendo que subirse a mano
(`gcloud builds submit --config=cloudbuild.yaml .`), pero ya no es un requisito
previo para publicar.

### Verificado

`pytest` **679 passed / 74 skipped** · ESLint **0 errores** · `i18n-check` **5980
claves × 10 idiomas** (+1) · `engine-check` **176/176** (+5, incluidos los tres
estados de la sonda) · catálogo backend↔frontend en paridad · build OK.

### Lo que sigue sin resolverse

**Por qué GitHub no disparó el workflow** en ese merge. Los cinco workflows figuran
como `active` y `CI (Pull Request)` sí corrió sobre la rama. Queda anotado en el
`DEPLOY_CHECKLIST.md` §0: después de mergear, **comprobar que hay ejecución**, porque
un merge que no dispara nada no produce error en ninguna pantalla y se confunde con
un despliegue que sí ocurrió.

---

## 2026-08-07 — Las opciones y el resto de productos acababan en el mismo sitio

### El problema

Con el diario ya multiproducto, `/performance` → Analytics seguía siendo **un solo
panel para todo**. Eso deja tres cifras mintiendo a la vez:

- **la curva de capital** arranca del saldo de la operación más antigua y le va
  sumando P&L de productos que pueden estar en **cuentas distintas** — una de
  fondeo de 50 000 para futuros y la personal de 10 000 para CFD dan una curva
  que no es la de ninguna de las dos;
- **el max drawdown** hereda el mismo defecto, y encima no es simétrico: no se
  puede "descontar" después;
- **el % de rentabilidad** divide por un saldo inicial que ya no significa nada.

Y la pregunta que un trader hace de verdad —«¿tengo ventaja en opciones o me la
están dando los futuros?»— no se podía responder: el desglose `by_product` daba
P&L y acierto por producto, pero no una **curva ni un drawdown** por producto.

### Lo que se ha hecho

**1 · El filtro se calcula en el backend, no se recorta en el navegador.**
`GET /performance/analytics?product=<id>` filtra **antes** de calcular y antes del
techo de `ANALYTICS_MAX_TRADES`. La curva, el drawdown y el Sharpe no se pueden
reconstruir desde un resultado ya agregado: hay que volver a construirlos desde las
operaciones de ese producto. Filtrar después del techo, además, dejaría un producto
minoritario calculado sobre las migajas de una ventana llena de otro — y diciendo
que no hay truncado. La respuesta publica `product_filter`: un panel filtrado sin
decirlo es indistinguible de uno completo con muy pocas operaciones.

**2 · El selector no se dibuja con el desglose filtrado.** `products_available` se
calcula sobre el historial completo, con el mismo criterio de «cerrada» que usa la
analítica (`is_closed_trade`, sacado a función porque estaba escrito tres veces como
literal). Construirlo sobre `by_product` —que sí va filtrado— dejaba **un solo botón**
en cuanto elegías un producto: sin forma de volver al conjunto. La barra va también
en el estado vacío, porque se puede llegar a él con un filtro puesto.

**3 · Cuando hay más de una cuenta, se dice.** `detect_mixed_accounts` compara la
**mediana** del `account_balance` por producto (mediana, no media: un saldo mal
tecleado no decide) y marca `suspected` con un cociente ≥ 2. El aviso lista el saldo
por producto y separa lo que sigue siendo válido —R, acierto, desglose— de lo que no.
Es una **sospecha**, no una afirmación: el diario no sabe cuántas cuentas hay, sabe
que los saldos no cuadran.

### Verificado

`pytest` **689 passed / 74 skipped** (+10) · ESLint **0 errores** · `i18n-check`
**5988 claves × 10 idiomas** (+8) · `engine-check` **187/187** · catálogo
backend↔frontend en paridad · enlaces de doc OK · build OK.

E2E con Postgres + backend vivos y el **build de producción real** servido bajo
`/Tradingcalculatorpro.com`: **16/16 en escritorio (1440×900) y 16/16 en móvil
(390×844)**, comprobando que el filtro dispara una llamada nueva con `product=` en
la query, que las cifras cambian (3 471,86 → 1 496,50 en futuros → 544,80 en
opciones), que la suma de los P&L por producto es exactamente el total, que el aviso
desaparece al filtrar y vuelve al quitar el filtro, y que nada desborda.

### Sigue pendiente

Los **cuatro módulos sin interfaz** (G-14): `trading_plan.py`, `backtest.py`,
`portfolio_risk.py` y `american_options.py`. `portfolio_risk.py` es el que más pega
con esto: mide el riesgo abierto a nivel de cuenta, que es justo lo que el aviso de
cuentas mezcladas deja a medias.

---

## 2026-08-07 (cont.) — Examen de autorización: qué pasa cuando dos cuentas se cruzan

### Por qué este examen y no otro

La cobertura real del backend, medida y no supuesta, parte el proyecto en dos:

| Zona | Cobertura |
|---|---|
| La matemática (`price_action` 97 %, `portfolio_risk` 95 %, `backtest` 94 %, `performance` 92 %, `trading_plan` 92 %, `instruments` 88 %) | muy alta |
| Las rutas HTTP (`server.py` **26 %**, `missing_apis` 23 %, `realtime_alerts` 23 %, `stock_data` 22 %, `admin_routes` 25 %) | casi nada |

Los 693 tests comprueban casi todos **funciones puras**. Lo que rodea a esas
funciones —autenticación, autorización, validación, rutas de error— estaba sin
tocar. Y la pregunta que ese hueco deja sin responder es la única cuyo «no» hay
que poder demostrar en un producto donde el usuario guarda su historial.

### Resultado: la autorización aguanta

Dos cuentas reales, la víctima crea un objeto de cada tipo y la atacante intenta
leerlo, editarlo y borrarlo cambiando el id de la URL. **21/21.** Detalles que
importan:

- Responde **404, no 403**: no confirma siquiera que el objeto exista.
- La operación **sigue intacta** después de los tres intentos, comprobado
  releyéndola con el token de su dueña — no basta con que la respuesta sea un error.
- La **ruta legada** (`/journal/trades/{id}`) es otra puerta al mismo dato y
  también cierra.
- Un `user_id` en el cuerpo de un POST **se ignora**: no se puede escribir en el
  diario de otro.
- Escribir `is_premium`, `is_admin`, `subscription_plan`, `role` o `email` en el
  perfil **no mueve nada** (medido por diferencia antes/después, no por valor
  absoluto: las cuentas de prueba ya eran premium y mirar el valor daba un falso
  positivo).

### RGPD: G-15 cerrado, verificado contra Postgres

El export incluye la operación, el plan de trading y el estado guardado; **no**
lleva el hash de la contraseña (lo único que aparece es `"auth_provider":
"password"`, que es el método de acceso); y los artefactos de seguridad no viajan
en el JSON, que es el contrato correcto. El borrado de cuenta deja **0 filas en
las 6 tablas** que tenían datos. Esto no se leyó en el código: se contó en la
base de datos.

De paso quedan confirmados tres límites de tasa, agotándolos: registro 3/hora,
borrado de cuenta 3/hora, export 5/hora.

### Lo que sí estaba roto: BUG-048

Cinco rutas convertían su propio 4xx en un 500 —tres de ellas de facturación—
porque `HTTPException` hereda de `Exception` y el `except Exception` final se lo
tragaba. Ver `DIARIO_BUGS.md`. El test que lo fija recorre el árbol sintáctico,
no las rutas: el fallo es estructural y así cubre también todo lo que no tiene
test de integración.

### Nota de método

Cuatro de los «fallos» de las primeras vueltas eran de la sonda, no del producto:
un PUT incompleto que se quedaba en el 422 de validación sin llegar a comprobar
la propiedad; un premium que había concedido yo por SQL dos minutos antes; una
búsqueda de «password» que casaba con `auth_provider`; y un 429 del limitador
leído como borrado roto. Los cuatro están corregidos **en la sonda**, y las
guardas que lo evitan quedan escritas ahí: una prueba que acusa al producto de lo
que hace el banco de pruebas es peor que no tener prueba.

### Verificado

`pytest` **698 passed / 74 skipped** (+5) · `py_compile` OK · autorización
cruzada **21/21** · export RGPD **8/8** · borrado RGPD **0 filas en 6 tablas** ·
enlaces de doc OK.

---

## 2026-08-08 — Los ajustes dejan de vivir en un navegador

### El agujero

La pregunta era simple: *¿todo lo que configuro se guarda en la base de datos?*
La respuesta era **no**, y la parte que no se guardaba resultó ser justo la que
más trabajo cuesta escribir.

Persistía lo transaccional —cuenta, plan de suscripción, diario, alertas y el
estado de las once calculadoras vía `user_states`—, pero **todo lo que el
usuario ajusta** vivía en `localStorage` y por tanto en UN equipo:

| Qué se perdía | Clave |
|---|---|
| **Los setups del sistema de trading** (escritos a mano, uno por uno) | `tcp-trading-system` |
| Preferencias de la pantalla de Ajustes | `tcp-preferences` |
| Idioma | `trading-i18n-storage` |
| Tema visual | `trading-theme-storage` |
| Activos favoritos | `trading-assets-storage` |
| Favoritos y recientes de calculadoras | `tcp-calc-favs`, `tcp-calc-recents` |
| Progreso de la Academia | `tcp-edu-progress` |
| Recientes del buscador de opciones | `opc_recents` |

Entrar desde el móvil era empezar de cero. Vaciar la caché del navegador era
perder los setups. Y la pantalla de Ajustes llevaba desde siempre enseñando un
«preferencias guardadas» que era falso fuera de ese equipo.

### Lo que se ha hecho

`frontend/src/lib/cloudPrefs.js` — una capa de sincronización que **no sustituye
`localStorage`, lo respalda**. El navegador sigue siendo la copia inmediata
(funciona sin red, sin cuenta y en modo demo) y el servidor la copia que cruza
dispositivos. Todo viaja en UN documento de `user_states` (`preferences_v1`), así
que sincronizar cuesta una lectura y una escritura, no una por ajuste.

Tres decisiones que parecen detalles y no lo son:

1. **Cada ajuste lleva su propia fecha.** Con una sola fecha por documento,
   cambiar el tema en el ordenador borraría los setups escritos en el móvil diez
   minutos antes. Gana el más reciente **de cada ajuste por separado**.
2. **El documento local recuerda de quién es.** Dos cuentas en el mismo
   navegador es exactamente lo que ya rompió el diario legado. Si el dueño del
   `localStorage` no es quien acaba de entrar, lo local **no compite**: manda la
   cuenta, y lo que la cuenta no tenga vuelve a su valor por defecto en vez de
   quedarse enseñando los setups del anterior.
3. **Un ajuste sin fecha local no es una preferencia, es el valor por defecto**, y
   no se sube. Subirlo lo convertiría en una elección que el usuario nunca hizo
   y a partir de ahí ganaría a lo que sí eligió en otro sitio. Por lo mismo, el
   idioma **sólo** marca fecha desde el selector: `detectBrowserLanguage` es una
   suposición del navegador, y un `?lang=` compartido cambia lo que ves, no lo
   que has elegido.

Las reglas de quién gana viven en `lib/prefsMerge.js`, **sin una sola
importación**, para poder probarlas sin React ni navegador.

### En el backend

`POST /user-states/save` guardaba `expires_at` a 90 días bajo el comentario «TTL:
state is auto-deleted 90 days after last update» y **ninguna tarea lo aplicaba
jamás**. La promesa era falsa en los dos sentidos: ni caducaba, ni podía
caducar sin borrarle al usuario cosas suyas. Ahora la tabla no caduca nada
—desde que guarda los ajustes, hacerlo verdad sería perder trabajo del usuario—
y el `$unset` limpia el `expires_at` que dejaron escrito las versiones
anteriores. No crece sin control: es una fila por (usuario, `state_id`) y los
`state_id` son un puñado fijo. El RGPD sigue cubierto, `user_states` ya estaba en
`_USER_DATA_COLLECTIONS`.

De paso, la ruta **dejó de convertir sus propios 4xx en 500**: todo el cuerpo
estaba dentro de un `try` con `except Exception`, así que un `state_id` inválido
se le devolvía al cliente como error de servidor. Y se añadió un tope por
documento (512 KB) ahora que ahí dentro va contenido escrito por el usuario.

### Verificado

- `pytest` **718 passed / 74 skipped** (+12 nuevos en
  `test_user_prefs_persistence_unit.py`, ya sobre `main` con el PR #180 dentro).
- `engine-check` **197/197** (+10 sobre las reglas de fusión).
- ESLint **0 errores** (123 avisos) · `i18n-check` 5995 × 10 · catálogo en
  paridad · `check-doc-links` OK · `npm run build` OK.
- **Contra PostgreSQL real**: que el `$unset` sobre un upsert borre de verdad el
  `expires_at` heredado —traducido a SQL, no contra un doble— y que el documento
  haga ida y vuelta sin perder tipos.
- **End-to-end en Chromium** contra backend + Postgres vivos: que cambiar un
  ajuste suba; que un dispositivo virgen (con el `localStorage` vaciado) reciba
  tema, progreso y **setups completos**; y que una segunda cuenta en el mismo
  navegador no herede los setups del anterior ni se los suba a su propia cuenta,
  mientras la cuenta original los conserva intactos.

### Lo que NO se ha tocado

No hay forma de editar el perfil (nombre, foto): no existe endpoint ni pantalla,
sólo cambiar contraseña, 2FA, exportar datos y borrar la cuenta. Es un hueco
distinto —no es que no se guarde, es que no se puede cambiar— y sigue abierto.

Y los setups **siguen sin pasar por `trading_plan.py`**, que es donde
conceptualmente deberían vivir (G-14). Esto los pone a salvo y los hace viajar
entre dispositivos hoy; migrarlos a `POST /plan` sigue pendiente y ahora es una
migración de datos, no un rescate.

### 2026-08-08 — Dos formatos de datos estructurados que ya no rinden

Al valorar si merecía la pena una herramienta de investigación de preguntas
(AlsoAsked) salió algo que afecta más que la herramienta: **el proyecto emite
marcado para dos formatos que Google ya retiró**.

| Tipo | Dónde | Estado |
|---|---|---|
| `HowTo` | `gen-seo-pages.js` → **660 páginas** (66 estrategias × 10 idiomas) | Retirado: fuera de móvil en ago-2023 y de escritorio en sep-2023. Google borró hasta la documentación. |
| `FAQPage` | portada (`public/index.html`) y fichas de `/markets/<id>/` | Retirado del todo el **7-may-2026**. Antes, restringido a webs gubernamentales/sanitarias desde ago-2023. Sale de Search Console en jun-2026 y de la API en ago-2026. |

**No se ha tocado el código, y es deliberado.** Los dos siguen siendo Schema.org
válido, Google los parsea para entender la página y no penalizan. Borrarlos no
gana nada; lo que había que corregir era la **expectativa**, porque quien leyera
`gen-seo-pages.js` podía pensar que esas 660 páginas salían en Google con pasos
desplegables, y no ocurre desde 2023.

Siguen vigentes y son donde sí conviene invertir: `WebApplication`,
`Organization`, `WebSite` + `SearchAction`, `BreadcrumbList`, `Course` /
`CourseInstance` y `Offer`.

Documentado en [`setup/SEO_GUIDE.md`](./setup/SEO_GUIDE.md) §5, con la tabla
completa y el criterio de qué no hacer. Se corrigió además el skill
`mejorar-seo`, que en su §5 recomendaba *"FAQ con schema `FAQPage`"* como mejora
prioritaria: mantenerlo habría hecho que la próxima sesión repitiera la
inversión en un formato muerto.

### Aviso añadido sobre contenido a escala

El sitio genera ya ~1.589 URLs automáticamente y es **YMYL** (finanzas), la
categoría con el listón de E-E-A-T más alto. Ampliar el corpus generando páginas
nuevas desde listas de preguntas (AlsoAsked, AnswerThePublic, People Also Ask)
es el patrón que persigue la política de *scaled content abuse* desde marzo de
2024. La investigación de preguntas es útil, pero su destino correcto es
**enriquecer las páginas existentes** —empezando por las FAQ, que hoy son las
mismas cinco traducidas a 10 idiomas en vez de las preguntas reales de cada
mercado— y no crear páginas nuevas. Queda escrito en la guía y en el skill.

## 2026-08-12 — El glosario se detenía justo donde empieza el producto

### El agujero

Auditoría terminológica del inventario canónico (99 términos de nivel 1-2)
contra lo que el usuario puede realmente consultar. El glosario tenía **68
entradas** y ni una sola de opciones: buscar «delta», «strike» o «prima» en su
buscador devolvía el estado vacío (`—`). El producto insignia es la calculadora
de opciones, donde «volatilidad implícita» aparece 89 veces en la interfaz,
«prima» 71 y «strike» 43.

No era falta de contenido: la Academia tiene 751 pares nombre+descripción y
cinco módulos de opciones (`option-greeks`, `options-vol`, `options-income`,
`options-strat`, `gamma-exposure`). Lo que faltaba era la **capa de consulta**:
lo explicado no era buscable desde donde surge la duda.

### Lo que se ha hecho

- ✅ **Glosario 68→109 términos** (`gl69..gl109`, 41 nuevos × 10 idiomas = 820
  textos). Dos bloques:
  - **Opciones (29)**: call, put, strike, prima, vencimiento, moneyness
    (ITM/ATM/OTM), valor intrínseco y temporal, multiplicador, open interest,
    IV, IV Rank, skew, superficie de volatilidad, volatility crush, delta,
    gamma, theta, vega, rho, Black-Scholes, paridad put-call, asignación,
    ejercicio temprano, max pain, GEX, stop limitada, ejecución parcial,
    riesgo de cartera.
  - **Riesgo y dimensionamiento (12)**: tamaño de posición, riesgo por
    operación, múltiplo R, drawdown máximo, payoff medio, profit factor,
    Sharpe, Sortino, Kelly, ATR, correlación, volatilidad realizada.
- ✅ **Enlace al módulo canónico** (`GLOSSARY_TOPIC` en `EducationPage.jsx`): 26
  entradas llevan un «Ver el módulo completo →» que salta al módulo de la
  Academia que ya posee el concepto. **Una entrada define en una línea; no
  reexplica.** Es la misma regla que `CanonicalLink` en
  `components/options/EducationTab.jsx`, que existe porque delta, gamma, theta
  e IV llegaron a estar explicados en seis sitios a la vez. El enlace lleva un
  guard: si el destino no está en `EDUCATION_NAV`, no se pinta.
- ✅ **El recuento del glosario se deriva**, ya no es el literal `68`. `t()`
  devuelve la clave cuando falta, así que la lista para en el primer hueco:
  añadir `gl110t/gl110d` a los diez diccionarios basta. Antes había que
  acordarse de tocar esa línea o el término nuevo no salía en pantalla.
- ✅ **`scripts/auditar-glosario.mjs`**: auditor de cobertura terminológica,
  con foto en `docs/historico/cobertura-glosario-2026-08-12.md`.

### La trampa del auditor (por qué la primera medición era mentira)

La primera versión contaba subcadenas sobre todo `frontend/src` y daba **92 %
de cobertura**. Tres fallos: contaba identificadores (`delta` y `gamma` salen
cientos de veces por ser nombres de variable, no porque se expliquen), contaba
clases de Tailwind (`gap` quedaba cubierto por los `gap-3` del layout; `prima`,
por `primary`) y trataba cualquier ruta con `content`/`education` como
contenido, así que una aparición de pasada bastaba.

El auditor ahora mira **sólo texto que ve el usuario** (literales de i18n y de
los módulos de contenido), casa por palabra completa y separa cuatro
superficies, porque son cuatro problemas distintos: entrada de glosario
(buscable), ficha del catálogo de estrategias, prosa de la Academia (explicada
pero no buscable) y sólo interfaz (deuda). Reconocer el catálogo importa: sin
él marcaba «backspread» como hueco teniendo dos fichas publicadas
(`call_ratio_backspread`, `put_ratio_backspread`).

| | Antes | Ahora |
|---|---|---|
| En glosario (buscable) | 30 % | **66 %** |
| Ficha propia del catálogo | — | 10 % |
| En prosa, no buscable | 60 % | 21 % |
| **Sólo UI (sin explicar)** | **4** | **0** |
| Ausente | 6 | 3 |

### Verificado

`i18n-check` 6102 claves × 10 idiomas sin faltantes ni sobrantes; `eslint` 0
errores; `engine-check` 197/197; build de producción OK (1589 URLs). Captura
headless con backend apagado (el glosario es puro i18n): 109 tarjetas, «delta»
→ Delta, «sortino» → Ratio de Sortino, «ejecución parcial» → Ejecución parcial,
y el enlace canónico de Delta lleva al módulo de griegas. 0 errores de consola.

### Lo que NO se ha hecho, a propósito

- **Las estrategias no entran al glosario.** Iron condor, straddle, mariposa y
  compañía tienen ficha de siete campos en `STRATEGIES` y página indexable por
  idioma; una entrada de glosario duplicaría su ficha.
- **Modelo binomial**: `american_options.py` está escrito pero **sin interfaz**
  (hueco G-14). Definir en el glosario algo que el producto no expone sería
  prometer una pantalla que no existe. Entra cuando entre el módulo.
- **PCE subyacente y regla del 16**: nivel 2 macro. Las definiciones macro
  envejecen y tendrían que ir con fecha de revisión visible; sin ese mecanismo,
  mejor fuera.

## 2026-08-12 (2) — Qué método tiene base y cuándo se comprobó

### El agujero

La Academia tiene 85 módulos y un mecanismo para declarar que un método es
discutido (`evidence: 'disputed'` → etiqueta ámbar con explicación). Estaba
aplicado a **1 de 85**: la caja de Gann. Y no había en ninguna parte una fecha
de revisión: el contenido no decía cuándo se había comprobado por última vez.

### Cómo se decidió qué marcar (no por criterio de nadie)

Barrido de las 2.100 claves de `es.edu.js` buscando cautelas declaradas
—«mito», «infalsable», «no hay evidencia», «subjetivo», «sobreajuste»— agrupadas
por módulo. Cinco dieron señal; una era falso positivo:

| Módulo | Lo que dice su propio texto | Marca |
|---|---|---|
| Gann | «no hay evidencia de que los fondos operen con cajas de Gann» | `disputed` (ya estaba) |
| Wolfe Waves | «MUY subjetiva y carece de validación estadística seria» | `disputed` |
| Tiempo y ciclos | «no hay evidencia sólida de que estas fechas tengan poder predictivo» | `disputed` |
| Bill Williams | «el riesgo es el sobreajuste» — cautela de USO, no ausencia de base | `caution` |
| Elliott | «suele ser débil y dudoso» habla de la **onda 1**, no del método | ninguna |

**Elliott, armónicos y SMC se quedan sin marcar a propósito.** Su texto no
afirma nada sobre su base empírica; ponerles un veredicto sería inventarlo. La
raya la pone el contenido, no una opinión.

### Lo que se ha hecho

- ✅ **Segundo nivel `caution`** (azul) además de `disputed` (ámbar): una
  advertencia sobre cómo se aplica un método no es lo mismo que decir que no
  tiene base, y fundirlas borra las dos lecturas.
- ✅ **`EvidenceTag`**, una sola pieza para los tres puntos de uso. Existía
  duplicada y por eso se escapó del móvil.
- ✅ **Sello de revisión** en la miga de pan: «base empírica revisada
  2026-08-12». Sale de `TOPIC_REVIEW`, y **un módulo sin entrada no pinta
  nada** — nunca una fecha de relleno. Es la misma regla que el resto del
  código: lo que no se ha comprobado es `None`, no `0`. Hoy lo llevan los 5
  módulos realmente revisados; los otros 80 se ven sin revisar porque lo están.
  Elliott lo lleva **sin etiqueta**: revisado y limpio, que es información.

### Dos defectos encontrados por el camino

- El aviso se pintaba **sólo en la barra lateral de escritorio**. En móvil la
  fila de temas renderizaba `tp.label` a secas, así que en un teléfono Gann era
  indistinguible de Wyckoff.
- El `truncate` estaba en el **contenedor** de la etiqueta, no en el texto: con
  un título largo (Wolfe Waves, Tiempo y ciclos) el recorte se comía el
  distintivo. Ahora se corta el título y el aviso nunca.

### Verificado

`i18n-check` 6105 claves × 10 idiomas sin faltantes ni sobrantes; `eslint` 0
errores; build OK. Sonda de navegador en 1280×900 y 390×844 sobre los 6 módulos
relevantes: las marcas salen donde deben y **no** donde no (Wyckoff sin marca y
sin sello), el sello aparece en los 5 revisados, 0 errores de consola.

## 2026-08-13 — Auditoría del repositorio: lo obsoleto, lo perdido y lo que se pasó por alto

Encargo: revisar el proyecto y redactar qué está obsoleto, qué se pasó por alto y
**qué no está todavía en GitHub**. Documento completo en
[`AUDITORIA_REPOSITORIO_2026-08-13.md`](./AUDITORIA_REPOSITORIO_2026-08-13.md).

### El hallazgo principal: lo que falta no está en el disco, está en ramas

El árbol de trabajo está limpio. Lo que no ha llegado a `main` vive en **43 ramas
remotas**, y ahí sí hay trabajo terminado:

- **6 pull requests de producto abiertos desde el 2026-08-02** (11 días): #161
  (contraste WCAG en CI), #162 (**honestidad del escáner**: el precio de referencia de
  S/R etiquetado con fuente, fecha y antigüedad), #163 (pestaña Dealers + métricas
  avanzadas del diario), #164 (lucide v1), #165 (acceso de cortesía), #169 (dos
  estudios). Cuatro de ellos son la **segunda ronda** de PRs ya cerrados sin fusionar
  el mismo día (#140, #154, #159, #117): el mismo trabajo lleva dos vidas sin entrar.
- **⚠️ PR #178 abierto es un *revert* del multiproducto**, que **sí está en `main`**
  desde el PR #180 (08-08). Fusionarlo por error deshace `instruments.py`, las unidades
  y el apalancamiento. Cerrarlo.
- **4 ramas con commits y sin ningún PR.** La peor es
  `claude/project-complete-audit-a6qg1c` (10–11 de agosto, 6 commits, +2779 líneas):
  dos auditorías, un estudio de competencia y pasarelas de datos de broker, los datos
  de la entidad legal y **dos tests nuevos**. Nada de eso existe aquí.
- Esto **explica G-18**: `PENDIENTES.md` citaba `CRECIMIENTO_GOOGLE.md` y
  `CHECKLIST_MODO_CASI_GRATIS.md` porque **existen de verdad**, en la rama
  `claude/competitive-feature-analysis-8mzm3p`. No eran erratas, eran huellas.
- 11 PRs de Dependabot abiertos, el más viejo del 14 de julio (`numpy` y `scipy`
  incluidos).

### Huecos nuevos anotados

- **G-32 — Trabajo terminado que no está en `main`** (todo lo anterior, con su
  inventario rama por rama).
- **G-27 — Las passkeys no están documentadas.** `backend/passkeys.py` (242 líneas,
  10-08) no aparece ni en la tabla de módulos de `CLAUDE.md` ni en este inventario, y
  la sección «Autenticación» sigue describiendo sólo JWT + Google OAuth.
  `migrate_trades_schema.py` tampoco está en la tabla.
- **G-28 — Se anuncia precio 0 a Google con muro de pago duro.**
  `gen-seo-pages.js:421` emite `price: '0'` en el JSON-LD de las páginas de
  calculadora, con títulos «Gratis»/«Free», mientras `index.html` declara 17/45/200 €.
  Dos ofertas contradictorias del mismo producto, y un destino que exige suscripción.
- **G-29 — `PENDIENTES.md` da por abierto lo ya cerrado.** Afirma que `trading_plans`
  no se borra ni se exporta (G-15, **cerrado y verificado contra Postgres el 07-08**) y
  que `FRONTEND_URL` cae a `tradingcalculatorpro.com` (hoy cae a `github.io`,
  `server.py:1167`). Un documento de pendientes con datos falsos cuesta una sesión.
- **G-30 — Código muerto en el frontend.** 20 componentes `.jsx` que nadie importa
  (17 de `ui/`, 1318 líneas; 3 propios, 933), y **10 de los 27 paquetes `@radix-ui`
  del `package.json` sólo los usan esos muertos**.
- **G-31 — Residuos que dan instrucciones falsas.** `backend/patches/server_fixes.patch`
  (con `MONGO_URL`), `backend/FIXES_README.md` (manda integrar un `fixes.py` que no
  existe), `backend/ADMIN_INTEGRATION.md` (ya integrado), `memory/PRD.md`, `check.sh`.

### Confirmado sin cambios

**G-14 sigue intacto**: 0 llamadas desde el frontend a `/plan/*`, `/backtest/*`,
`/performance/portfolio-risk`, opciones americanas y `/options/term-structure`.
**Hyperliquid sigue sin enlace de referido** (`RecommendedTools.jsx:22`, anotado desde
el 25 de julio): cada clic es comisión regalada.

### Deriva de cifras (medidas hoy contra `main`)

| Métrica | Decía §1/§2 | Real |
|---|:--:|:--:|
| Módulos backend | 24 | **28** |
| `server.py` | 8232 | **9097** |
| Ficheros de test | 34 | **45** (761 funciones) |
| Claves i18n | 5995 | **6110** |
| Rutas en `App.js` | 26 | **27** |
| Documentos de `check-doc-links` | 47 | **56** |

Y §7 no recoge 8 commits de tres días: el 09-08 (Simulador Pro), **el 10-08 entero
—bypass de 2FA, account pre-hijacking y passkeys—** y el 13-08 (escáner). El 12-08 sí
está bien cubierto. `DIARIO_BUGS.md` sí recoge lo de seguridad.

### Verificado

`py_compile` 28 módulos ✅ · `check-doc-links.py` 56 documentos, 0 roturas ✅ ·
`gen-instruments-js.py --check` paridad ✅ · `i18n-check` 6110 × 10, 0 huecos ✅ ·
`engine-check` 197/197 ✅. **No ejecutados** (sin dependencias en el entorno): `pytest`,
`eslint`, `npm run build` — ninguna afirmación del documento depende de ellos.


## 2026-08-13 (2) — Orientarse costaba 106.000 tokens; ahora cuesta 8.000

Encargo: que Claude tenga el proyecto ya mapeado al arrancar, para tardar menos en
buscar, analizar y cambiar.

### El diagnóstico, medido

El problema no era la búsqueda —`ripgrep` recorre el repo en milisegundos— sino **lo que
había que leer para orientarse**:

| | Antes | Después |
|---|---:|---:|
| `CLAUDE.md` (automático, cada sesión) | 408 líneas · ~7.400 tokens | 173 · ~2.500 |
| `ESTADO_PROYECTO.md` (el skill obligaba a leerlo) | 320 KB · ~80.000 tokens | 32 KB · ~7.500 |
| **Total antes de escribir una línea** | **~106.000 tokens** | **~10.000** |

El dato que lo explicaba todo: **el 93 % de `ESTADO_PROYECTO.md` era el registro de
sesiones**. Se leían 320 KB para consultar 30. Y no había `settings.json`, ni
`.claude/rules/`, ni hooks: todo el mapa estaba en dos ficheros gigantes que se leían
enteros o no se leían.

### Cuatro capas

1. **El registro de sesiones sale a su propio fichero.** `REGISTRO_SESIONES.md`, 126
   entradas, append-only, que **no se lee entero**: se busca con `grep`. `ESTADO_PROYECTO`
   se queda con §1–§6 y una tabla de las cinco últimas sesiones.
2. **`CLAUDE.md` a 173 líneas** (la doc de Claude Code recomienda <200). El 50 % del
   fichero eran «trampas conocidas», ya agrupadas por área: se han repartido en **7
   reglas con `paths:`** que se cargan **solas** al abrir un fichero de su zona —
   `backend`, `opciones`, `diario-riesgo`, `escaner`, `preferencias`, `i18n-seo`, `infra`.
   Los invariantes universales se quedan en `CLAUDE.md` porque **las reglas con `paths:`
   no se reinyectan tras un `/compact`** y las de la raíz sí.
   *(Nota para el futuro: partir `CLAUDE.md` con imports `@fichero` NO ahorra contexto —
   los imports se cargan al arrancar igual. Tiene que ser `rules/` con `paths:`.)*
3. **`.claude/settings.json`**: `permissions.deny` sobre lectura de lo que sólo confunde
   (`_archive/`, `backend/patches/` con su `MONGO_URL`, `FIXES_README.md` que manda
   integrar un `fixes.py` inexistente, `ADMIN_INTEGRATION.md` ya integrado, `memory/PRD.md`,
   `.emergent/`) y sobre **edición** de lo generado. Más 25 permisos de sólo lectura para
   dejar de parar a pedir confirmación.
4. **Hook `SessionStart`** (`.claude/hooks/orientacion.sh`, **95 ms**, sin red): imprime
   rama, árbol, ramas con trabajo sin fusionar, y avisa si la doc o el mapa se han quedado
   atrás. Su salida entra en el contexto **antes del primer mensaje**. Ataca la causa de
   que se acumularan 6 PRs y 4 ramas perdidas: eso era estructural, no un despiste.

### El mapa que no puede mentir

`scripts/gen-mapa.py` → `docs/MAPA.md`, con `--check` en CI (job `documentacion` nuevo,
que además corre `check-doc-links` y **cierra G-18**). Deriva del código: módulos con su
responsabilidad y tamaño, las 201 rutas con `fichero:línea`, carpetas del frontend y los
ficheros que más cuesta abrir. **No lleva fecha de generación a propósito**: la llevaría y
`--check` fallaría solo cada día hasta que el aviso dejara de significar nada.

Y detecta **rutas sin consumidor en el frontend**, clasificadas: 10 huérfanas por diseño
(webhooks, sondas) y **35 sospechosas**. Eso ha corregido G-14 al alza: no son «4 módulos
y ~8 endpoints», son **35 rutas**, e incluye cosas que ninguna auditoría había listado
—`/monte-carlo`, `/performance/export`, `/education/pattern-catalog`,
`/calculate/implied-volatility`, `/calculate/volatility-size`— más el diario legado
`/journal/trades`, que el frontend abandonó al migrar a `/performance/*`.

### La causa raíz de la deriva, atacada

`ESTADO_PROYECTO.md` **ya no escribe a mano ninguna cifra contable**. §1 y §2 apuntan al
mapa. Esa era la causa del aviso de método que la cabecera lleva denunciando desde julio:
no era descuido, era escribir a mano lo que se puede medir. Lo que queda en el documento
es criterio, y el criterio sí hay que actualizarlo a mano.

### Verificado

`py_compile` 28 módulos ✅ · `gen-mapa --check` ✅ · `gen-instruments --check` ✅ ·
`check-doc-links` 66 documentos, 0 roturas ✅ · `i18n-check` 6110 × 10 sin huecos ✅ ·
`engine-check` 197/197 ✅ · `settings.json` parsea ✅ · hook probado en 95 ms ✅.
Las 126 entradas de sesión se conservan íntegras (contadas antes y después).
No ejecutados por falta de dependencias en el entorno: `pytest`, `eslint`, `npm run build`.

### Lo que NO arregla

`server.py` sigue con 9.097 líneas: el mapa te dice a qué línea ir, pero abrirlo entero
cuesta lo que cuesta. Eso es BUG-008, bloqueado por G-17. Y un plugin de *code
intelligence* (`/plugin install python-lsp@claude-plugins-official`) daría salto a
definición en vez de `grep`; hay que instalarlo desde una sesión interactiva.

### 2026-08-14 — La mesa de cálculo: el dashboard deja de ser catorce calculadoras sueltas

**Lo que había.** Catorce calculadoras que no se hablaban entre sí. Cada una pedía otra
vez el saldo de la cuenta; ninguna sabía qué producto se operaba (`PositionSizeCalculator`
pintaba `BTC` fijo en el resultado, fuera cual fuera el activo); `LotSizeCalculator` tenía
su propia tabla de once pares con el pip a mano y daba **10 $/pip por lote estándar
siempre**, que es falso en USDJPY, en el oro y en cualquier cruce sin dólar. No había modo
de margen en ninguna parte —sólo teoría, en el módulo `margin-liq` de la Academia— ni tope
de riesgo: el deslizador de riesgo llegaba al 10 % y no bloqueaba nada.

El diario (`TradeFormModal`) sí tenía el modelo bueno —producto, ficha del instrumento,
nocional, margen, exposición, liquidación, unidades de stop— sólo que **después** de
operar, cuando ya no sirve para decidir.

**Lo que se ha hecho.** `components/desk/` pone ese modelo antes de la operación, en el
orden en que se piensa: capital → producto → posición y modo de margen → riesgo máximo →
entrada/stop/objetivo → tamaño. Las catorce calculadoras no se han tocado: son el **modo
básico**, con conmutador, para quien sólo quiere una cifra suelta.

**`lib/deskMath.js`** es la aritmética nueva y es la **inversa** de `instruments.js`: allí
se pregunta «dada una posición, qué es»; aquí, «dado mi capital y lo que puedo perder,
cuánto compro». Lo que no existía en ninguna parte del proyecto:

- **Margen cruzado.** Una sola fórmula para los dos modos, porque los dos *son* la misma
  con distinto colchón: aislado = margen de la posición, cruzado = capital libre. Con
  colchón = nocional/palanca da **exactamente** lo que ya daba `liquidationPrice()`, y
  `engine-check` lo fija — el aislado sigue teniendo una única fuente de verdad.
- **Los tres techos del tamaño** (riesgo, margen, exposición) con cuál manda. «No puedes
  por margen» y «no puedes por riesgo» se arreglan de forma distinta.
- **El billete mínimo**: cuando el contrato más pequeño ya se pasa del tope, se dice, en
  vez de dimensionar 0,33 contratos que nadie puede mandar.
- Parciales con media ponderada y break-even del resto, valor del punto/pip/tick sacado de
  la **ficha** del instrumento, y comisiones de ida y vuelta.

**El tope duro del 10 %** (`RISK_HARD_CAP_PCT`): por encima, la mesa no calcula y devuelve
el motivo. Escribir el tamaño a mano tampoco lo salta — si no, «manual» sería la puerta de
atrás. El aviso amarillo del 2 % sí se puede ignorar: es criterio, no tope.

**El modo de margen se ofrece según el producto**, que era la duda planteada: sólo el
perpetuo deja elegir de verdad; futuros, forex y CFD son cruzado y no se pregunta (una
sola bolsa de margen respalda la cuenta, lo llame así el bróker o no); contado y opciones
no tienen. Preguntarlo siempre sería inventarse una decisión que no existe.

**Opciones.** Las 66 estructuras ya estaban en `data/mockData.js` desde antes; lo que no
había era forma de llegar a ellas desde el dashboard. El selector nuevo las ofrece con los
**cuatro contratos sueltos arriba y aparte** —que no son cuatro añadidas: son cuatro *de*
las 66, buscadas por su `id` para que no puedan duplicarse—. Y se corrigió un fallo real
en `/options/calculator`: **BUY se pintaba verde y SELL rojo**, la convención de las
acciones, cuando en opciones dos de las cuatro combinaciones salen al revés (comprar una
put es bajista; vender una put, alcista). La regla vive ahora en `lib/optionSides.js`, el
color va por **dirección**, BUY/SELL pasa a neutro con «Pagas (débito)» / «Cobras
(crédito)», y las dos combinaciones sin pérdida máxima llevan «riesgo abierto».

**La Academia.** Su buscador filtraba **títulos**, así que sólo encontraba lo que ya sabes
cómo se llama. `lib/eduIndex.js` indexa el contenido real de los 85 módulos llamando a los
mismos 82 getters que pinta la página, y la caja de preguntas contesta con el módulo **y
el apartado**. La IA (`POST /api/education/assistant`) es una segunda capa que **sólo
redacta**: recibe los candidatos que ya encontró el navegador, no puede elegir destino, y
si cita un `id` que no estaba en la lista la respuesta se descarta entera. Sin clave o con
fallo, `answer: null` y los enlaces siguen ahí.

**Tres fallos los encontraron las pruebas al escribirlas**, no la revisión:
`t()` del título estaba fuera del `try` y una sola clave rota tumbaba el índice de los 85
módulos; las palabras de cantidad (*cuánto*, *how much*, *combien*, *сколько*, 多少) no
estaban filtradas y decidían el orden por sí solas; y sin coincidencia por raíz,
«arriesgo» no encontraba «arriesgas» ni «arriesgar».

**Verificado:** `engine-check` 257/257 (60 comprobaciones nuevas) · `i18n-check` 6.295 × 10,
0 huecos · `check-edu-index` 85 = 85 (nuevo, en CI) · ESLint 0 errores · `npm run build`
exit 0, 1589 URLs · `py_compile` los 26 módulos · `pytest` **782 passed, 74 skipped** ·
`gen-mapa --check`, `check-doc-links` y la paridad del catálogo, en verde.

**Lo que se deja fuera a propósito:** el asistente de la Academia no se ha podido probar
con la IA viva (el sandbox no tiene salida a Anthropic); la ruta local sí, que es la que
decide. Y el «modo básico simple» que se pidió para el final ya existe: son las catorce
calculadoras de siempre, ahora con nombre y conmutador propios en vez de ser lo único que
había.

### 2026-08-14 (2) — Lo que decía estar verde y no lo estaba

Sesión de auditoría de la propia infraestructura, no del producto. Se pidió
comprobar si «el mapa y todas las actualizaciones funcionan al 100 %». No.

**Lo que sí funciona.** Los verificadores offline corren y son rápidos:
`i18n-check` 222 ms, `engine-check` 1,6 s, `check-edu-index` 42 ms,
`check-fetch-credentials` 107 ms, `gen-mapa --check` 563 ms, `check-doc-links`
28 ms, `gen-instruments-js --check` 30 ms. Todo el bloque estático son ~2,6 s.
`pytest` 14 s, ESLint 5 s, `npm run build` 37 s. La velocidad **no** era el
problema.

**Tres cosas estaban rotas o mentían:**

1. **El banco de pruebas E2E no arrancaba en frío** (G-35). `sembrar.py` hacía
   login con una cuenta que nadie creaba: 401 en una base nueva, o sea en TODA
   sesión remota. `arriba.sh` seguía con un aviso amarillo y las ocho sondas de
   navegador fallaban acusando al producto de un fallo que era «aquí no hay
   cuenta». `entorno.py` ya tenía `cuenta()` y `da_premium()`; este script no
   los usaba.

2. **`/verify` decía «todo verde» sobre PRs que CI iba a tumbar** (G-36).
   Comprobaba 4 de las 10 verificaciones de `ci.yml`. Hablaba de 8 idiomas
   (hay 10), compilaba 3 módulos de Python (hay 26) y corría `pytest -k unit`
   en vez del suite. Reescrito para ejecutar exactamente lo de CI, con la regla
   escrita de que las dos listas no pueden separarse.

3. **`entra()` no cerraba el modal de bienvenida.** El overlay se come todos
   los clics y Playwright responde con un timeout de 30 s sobre un botón
   «visible, enabled y stable» — visible sí, alcanzable no. Ahora hay
   `descartaModales()` y lo llama `entra()`, así que le vale a toda sonda nueva.

**Lo que se añade para acelerar: `tests/e2e/mirar.js`.** El examen entero es
correcto antes de mergear y demasiado caro mientras diseñas, que es cuando más
falta hace mirar. Una orden abre una pantalla, la toca con un guion mínimo
(`fill:`, `click:`, `select:`, `tecla:`, `esperar:`), saca la captura y reporta
los errores de JavaScript, el desbordamiento horizontal y el texto real de los
`data-testid` que pidas. Los recursos externos bloqueados por la red del
sandbox se cuentan **aparte**: mezclados, cada ejecución gritaría «9 errores» y
a la tercera nadie los leería.

**Y el hook de arranque avisa del contenedor crudo.** Cada sesión remota empieza
sin `node_modules` ni las dependencias de Python; descubrirlo a mitad de trabajo
cuesta minutos parado, siempre cuando ya has escrito el código y sólo querías
verificarlo. Ahora se dice al arrancar, para poder lanzarlo en segundo plano.

**Dos bugs del producto que encontró la PRIMERA captura**, después de que el
código pasara lint, 264 comprobaciones de motor y 782 tests:

- **La palanca se caía a 1× en futuros.** `suggestedLeverage()` la deduce del
  nocional, que necesita la cantidad, que es justo lo que la mesa está
  calculando. Resultado: pedía **25 000 $ de margen por un micro E-mini** cuyo
  margen inicial son **1320 $**, y respondía «no te llega el capital ni para el
  contrato más pequeño» con una cuenta de 10 000 que da para diecinueve.
  Arreglado con `leverageFromMargin()` / `effectiveLeverage()`, con el orden de
  autoridad explícito: lo escrito > el margen del mercado > la típica del
  producto > 1×. De paso desaparece `leverage_touched` de la mesa: la palanca
  se **resuelve** en cada render en vez de guardarse.
- **El aviso de email tapaba el campo de capital.** Es una barra `fixed top-16`
  y `main` sólo reservaba `pt-20`: 24 px de solape. Daba igual mientras debajo
  hubiera un titular; desde que ahí va el capital, tapaba el dato del que
  depende todo lo demás.

**Verificado:** `engine-check` **264/264** (7 comprobaciones nuevas de palanca) ·
`i18n-check` 10/10 sin huecos · `check-edu-index` 85 = 85 · `check-doc-links` ·
`gen-mapa --check` · paridad del catálogo · ESLint 0 errores · `pytest` **782
passed, 74 skipped** · y la mesa **vista funcionando** en el navegador con
futuros (1 contrato, margen 1320 $, tick 1,25 $, liquidación 3025 en cruzado),
forex (0,33 lotes, 3,30 $/pip), el tope del 10 % bloqueando, los 4 contratos
sueltos y el buscador de la Academia devolviendo «Margen y liquidación en
derivados» con sus tres apartados.

### 2026-08-14 (3) — La mesa, rehecha: una pregunta, un botón, una respuesta

El propietario rechazó la mesa del mismo día. La crítica, literal: «no sé lo que
hace», «los cálculos parece que tengo que descifrarlos», «no tiene ni un botón
para darle a calcular», «el diseño no respeta ni tamaños ni nada», «performance,
diario de trading y setup están mejor». Toda ella acertada, y medible.

**Lo que se midió antes de tocar nada.** El skill `identidad-visual` fija la ley
del proyecto y no se cargó al diseñar. Contra ella, la mesa v1 tenía: **50
colores hex escritos a mano** (la ley dice tokens `--long`/`--short`), **0
`tabular-nums`** (la ley los exige en todo número), **dos acentos** además del
verde (azul y ámbar en las secciones plegables), y ningún botón de calcular
mientras las otras catorce calculadoras sí lo tienen.

**La referencia estaba dentro.** Capturado `/performance`, que es lo que sí
gusta: el color ahí **significa** algo (producto, dirección, error), los avisos
están **escritos en palabras** —«POSICIÓN SOBREDIMENSIONADA», «SIN STOP LOSS»,
«ARRIESGAS MÁS DE LO QUE GANAS»— y cada fila tiene una lectura. La mesa hacía lo
contrario: veinte cifras del mismo cuerpo y ninguna era la respuesta.

**Y fuera.** De lo que se pudo consultar (el proxy bloquea las descargas
directas; sólo pasó la búsqueda): Myfxbook y BabyPips coinciden en pocos campos
—divisa de la cuenta, capital, riesgo en % o en importe fijo, stop en pips—, un
botón explícito y **una** salida principal, el lote, con la equivalencia en
unidades/mini/micro debajo. Ninguna de las dos enseña veinte cifras.

**Lo que se ha rehecho:**

- **`DeskForm`** — siete campos a la vista (capital, riesgo, producto, activo,
  dirección, entrada, stop, objetivo) y un **botón de Calcular**. Lo que decide
  el producto y casi nadie cambia —tamaño de contrato, apalancamiento, modo de
  margen, tipo de lote— se pliega bajo «Ajustes del instrumento», con lo que el
  catálogo ya ha puesto **resumido en la cabecera** para no tener que abrirlo.
- **`DeskAnswer`** — la respuesta es un número grande y **una frase**:
  «Arriesgas 100 $ (1,00 % de tu cuenta) para ganar 300 $». Debajo, tres cifras
  de control: margen, R:B y liquidación. Nada más.
- **`DeskDetail`** — las otras catorce cifras siguen enteras, detrás de un clic,
  porque son verificación y no respuesta. Los avisos que son motivo para no
  mandar la orden (exposición, R:B bajo 1:1, stop detrás de la liquidación) van
  **fuera** del plegado: un aviso que hay que desplegar llega tarde.
- **El resultado es una foto, no un flujo.** Se congela al pulsar; si luego
  cambias un campo, se marca como caducado en vez de mutar por debajo. Un número
  que cambia solo no se puede copiar al bróker con confianza.

Borrados `SizeVerdict.jsx`, `DeskResults.jsx` y `PartialsSection.jsx`.

**Dos bugs más que encontró mirar la pantalla:**

- **Un objetivo de 5060 sobrevivía al saltar del E-mini a EURUSD** y la
  respuesta salía «arriesgas 48 $ para ganar 80 942 640 $». La aritmética era
  correcta; el resultado, absurdo. Un nivel de precio pertenece a un
  instrumento: cambiar de producto o de símbolo los vacía.
- El R:B aparecía **dos veces** —como cifra de control y otra vez dentro del
  bloque de liquidación bajo la etiqueta del suelo—, y las notas del desglose se
  cortaban a media palabra con `truncate`.

**Estado de la ley visual en `components/desk/`:** 0 hex a mano, 14
`tabular-nums`, 25 usos de `--long`/`--short`, un solo acento, `rounded-sharp`
en inputs y chips.

**Verificado:** engine-check 264/264 · i18n 10/10 sin huecos (20 claves nuevas) ·
check-edu-index · gen-mapa · check-doc-links · ESLint 0 errores · pytest 782
passed · y **visto en el navegador**, escritorio y móvil: futuros (1 contrato,
margen 1320 $, R:B 3:1, liquidación 3025), forex (0,16 lotes con 5000 € de
cuenta, riesgo 48 $, objetivo 96 $, margen 578,67 $) y el tope del 10 %
bloqueando con su motivo.

**Lo que queda y se dice claro:** las catorce calculadoras sueltas **siguen sin
rehacerse** (G-33). Es el siguiente trabajo, y ahora hay con qué: la ley visual
medida, la referencia de `/performance`, el patrón de esta pantalla
—pocos campos, un botón, una frase, desglose plegado— y `mirar.js` para no
volver a entregar una pantalla sin verla.

### 2026-08-14 (4) — La captura mentía: la barra de navegación salía tres veces

El propietario avisó de un fallo de maquetación viendo una captura del
dashboard: «encima de la barra de Trading Calculator Pro no debe haber nada, y
en la captura aparece Dashboard: qa».

**Medido antes de tocar nada, y no era un fallo de la web.** Con la página
arriba del todo: la cabecera es `fixed` y ocupa de 0 a 65 px; el titular
«Dashboard: qa» empieza en 128; y la consulta de todo lo que `main` pinta por
encima del borde inferior de la cabecera devuelve **lista vacía**. La captura de
ventana lo confirma: barra arriba, aviso de email debajo, contenido después.

**El fallo era de `mirar.js`.** Playwright cose la página larga por tramos y
**vuelve a pintar los elementos `position: fixed` en cada tramo**, así que la
barra de navegación aparecía tres veces a media página y parecía haber contenido
por encima de ella.

Una herramienta de mirar que enseña algo que no pasa es peor que no tenerla:
hace perder el tiempo persiguiendo fantasmas y enseña a desconfiar de las
capturas buenas. Arreglado: durante la captura larga, lo fijo pasa a `absolute`
en su posición real —elemento a elemento, porque una regla CSS global rompería
los layouts que dependen de `absolute`— y se restaura después.

**Y un fallo real que sí salió de esa misma imagen:** con el riesgo al 15 %, el
formulario ponía «TE JUEGAS $750.00» en el mismo estilo tranquilo de siempre y
se guardaba el «esto está por encima del tope» para cuando pulsaras Calcular.
Dejar que el usuario rellene el formulario entero creyendo que va bien es
justo lo que el tope existe para evitar. Ahora el importe sale tachado y con
«Por encima del tope del 10 %» debajo, en el propio campo.

**Verificado:** engine-check 264/264 · i18n 10/10 · check-edu-index · gen-mapa ·
check-doc-links · paridad del catálogo · ESLint 0 errores · pytest 782 passed ·
y comprobado en pantalla: con 15 % sale el aviso en el campo, con 1 % no.

### 2026-08-14 (5) — Mil escenarios generados, y lo que 264 comprobaciones a mano no veían

Petición: probar todas las herramientas con mil simulaciones distintas y
verificar que lo que sale tiene sentido, no sólo que no revienta.

**Lo que se ha montado.** `frontend/scripts/simulacion-masiva.js`: escenarios
**generados** con semilla fija (reproducibles con `--semilla N`), repartidos
entre los cinco motores importables, y sobre cada uno ~20 invariantes que
comprueban **significado**:

| Motor | Qué se exige |
|---|---|
| Mesa | riesgo real ≤ presupuesto · nunca >10 % de la cuenta · nocional = precio×cantidad×contrato · margen = nocional/palanca · exposición ≤ 10× · el techo elegido es el menor de los tres · liquidación del lado correcto · cruzado más lejos que aislado · riesgo = pips × valor del pip |
| Opciones | **paridad put-call** · prima ≥ intrínseco · call ≤ subyacente · Δcall−Δput = 1 · gamma y vega ≥ 0 · monotonía en precio y en volatilidad |
| Simulador | saldo ≥ 0 · drawdown ∈ [0,100] · ganadas+perdidas = total · ROI y tasa de acierto derivados de lo ocurrido |
| P&L | **el apalancamiento NO cambia el P&L** (probado con 1×, 5×, 20×, 50× y 125× sobre la misma operación) · el margen SÍ, en proporción exacta |
| Proyección | esperanza en R = fórmula · en la tasa de equilibrio la esperanza es cero |

**Resultado: 60.000 escenarios en 6 semillas distintas, ~1,2 millones de
comprobaciones.** Encontró tres cosas que `engine-check` (264 casos elegidos a
mano) no veía:

1. **El simulador daba saldos negativos y drawdowns del 137 %.** Con el interés
   compuesto apagado, el tamaño sale del saldo INICIAL, así que cada pérdida
   vale lo mismo pase lo que pase con la cuenta: una racha larga la empujaba por
   debajo de cero y **seguía operando en negativo**. Ninguna de las dos cifras
   puede pasarle a nadie. Ahora la cuenta se acaba en cero, se registra
   `ruinedAt` (en qué operación se arruinó) y deja de operar — que además es el
   resultado que de verdad importa de esa simulación.
2. **`profitFactor` devolvía `Infinity`** cuando no había ni una pérdida: 2
   casos en 50.000, o sea una simulación sin una sola operación perdedora. El
   backend ya convertía ese `inf` a `None` antes de publicarlo y `JournalStats`
   ya esperaba `null`: el motor del simulador era **el único de los tres
   caminos** que devolvía `Infinity`, y un `Infinity` suelto envenena en
   silencio cualquier media, percentil u ordenación posterior.
3. **El modo fijo del simulador no valida su entrada:** con `fixedTotalOps`
   ausente devuelve una simulación de cero operaciones, saldo = inicial y ROI
   0 %, sin quejarse. Desde la interfaz no se puede llegar (el formulario
   siempre rellena esos campos), así que no se ha tocado el motor; queda dicho.

**Dos fallos eran del propio banco, y se dicen porque enseñan más que los del
producto:** dos comprobaciones miraban `results.totalTrades` y `results.wins`,
campos que **no existen** (el motor devuelve `totalOps` y `totalWins`), y la
guarda `!= null` las convertía en un no-op silencioso — contaban como pasadas
sin ejecutarse nunca. Una comprobación que no corre es peor que no tenerla,
porque además tranquiliza.

**Cruce motor ↔ pantalla.** Se hizo también una sonda de navegador para
comprobar que los números del motor llegan intactos a la pantalla. **La sonda
salió inestable y no se conserva**: leía el margen partiendo el texto por
saltos de línea y cogía una línea en blanco (de ahí un «NaN» que era suyo, no
del producto). Verificado en su lugar un caso concreto de punta a punta —
409.507 € de cuenta, 2,5 % de riesgo, AAPL a 219,70 con stop en 216,50 → 1.863
acciones, riesgo 5.961,60 $, margen 409.301,10 $, **ningún NaN en la pantalla**—
y coincide con el motor.

**Lo que este banco NO cubre, y hay que decirlo:** las catorce calculadoras
sueltas tienen su matemática **dentro** del componente (`const calculate = …`
en el JSX), no exportada, así que no se pueden fuzzear sin navegador. Es
exactamente el motivo por el que G-33 pide extraerlas. Mientras siga así, esas
catorce pantallas son las únicas del producto sin cobertura de este tipo.

Añadido a CI (1.000 escenarios, 1,5 s).

### 2026-08-15 — Lo último que seguía atado a un navegador

Se preguntó si los datos podían guardarse en la base de datos y aparecer en los
demás dispositivos del mismo cliente. **Casi todo ya lo hacía**, y lo primero fue
demostrarlo en vez de suponerlo.

**Prueba de dos dispositivos.** Dos contextos de navegador independientes
—cookies, `localStorage` y sesión separados, como un ordenador y un móvil— con
la misma cuenta. En A se escribió capital 46.649, riesgo 2,5 %, producto
futuros, símbolo ES, entrada 5432 y un favorito de calculadora. B entró después,
sesión limpia, sin tocar nada: **los seis datos estaban ahí**.

Así que lo que ya viaja con la cuenta es: los diez *slices* de `cloudPrefs`
(tema, idioma, favoritos de activos, preferencias, cuenta de la mesa, favoritos
y recientes de calculadora, progreso de la Academia, recientes de opciones,
sistema de trading) y los catorce estados de `usePersistedState` (las trece
calculadoras, la mesa, el gráfico y la watchlist). El diario real vive en
Postgres desde siempre.

**Lo que NO viajaba, y ahora sí: el registro del escáner.** `structureLog`
guarda las rupturas de estructura (BOS/CHoCH) y las señales de vela con la marca
de cuándo se vieron por primera vez —la que alimenta el resaltado de las últimas
24 h—. Escaneabas EURUSD en el ordenador y el móvil no sabía nada.

Dos cosas que `lsSlice` no podía cubrir y por eso el *slice* tiene `read`/`apply`
propios:

- **Se recorta al subir.** Una entrada pesa ~127 bytes, el tope por ámbito son
  60, y quien siga cincuenta pares en varias temporalidades pasa de 350 KB. Ese
  documento lo comparten el tema, los setups y el capital: si engorda sin techo
  los rompe a todos. Se sincronizan los **doce ámbitos tocados más
  recientemente** (`SYNC_SCOPE_CAP`), y se dice que es un recorte, no un olvido.
- **Se funde al bajar**, no se sobrescribe. Comprobado: B conservó su propio
  ámbito `BTC-USD|1d` y recibió el `EURUSD|4h` de A, con los `ts` originales
  intactos.

El aviso de «esto ha cambiado, súbelo» va por suscripción (`onLogChange`), el
mismo patrón que `onSystemChange` de `tradingSystem` y por el mismo motivo:
`cloudPrefs` importa `structureLog` para leerlo, así que importarlo de vuelta
crearía un ciclo. La primera versión usaba `require()` dentro de un módulo ESM
—funciona en webpack y revienta en el Node de `engine-check`— y se cambió.

**Lo que sigue siendo del navegador a propósito:** el diario legado del
dashboard (`components/tools/TradingJournal.jsx`), congelado desde hace tiempo,
de sólo lectura y con exportación. No se sincroniza porque no se puede escribir
en él; el diario de verdad es `/performance`.

**Verificado:** engine-check 264/264 · simulación masiva 20.227 · i18n 10/10 ·
check-edu-index · gen-mapa · check-doc-links · ESLint 0 errores · pytest 782
passed · y las dos pruebas de dos dispositivos, en el navegador real.

---

### 2026-08-22 — Las 38 rutas muertas: una decisión por cada una

`MAPA.md` las contaba desde hacía días. Contarlas no había servido de nada
porque la lista no decía **qué hacer** con ninguna, y una lista sin decisión se
lee una vez y se ignora para siempre. Así que lo primero fue leerlas una a una y
escribir la decisión al lado: `docs/RUTAS_MUERTAS.md`, con tres verbos —`BORRAR`,
`CONSTRUIR`, `ARREGLAR`— y el porqué de cada fila.

Leyéndolas aparecieron tres cosas que el número no enseñaba:

**1. La capa de failover de precios estaba construida y desconectada.**
`market_data.py` —329 líneas con cortacircuitos, cuota por proveedor y
`stale`/`as_of`— existe para que el producto no dependa de Yahoo. Su propia
cabecera lo dice: el día que Yahoo apriete su anti-bot se apagan a la vez los
precios, la watchlist, las alertas, las cadenas de opciones, el IV rank y todas
las calculadoras alimentadas por precio. Y se llegaba a ese módulo **sólo** por
`/api/quote/{symbol}`, que estaba muerta: el punto de fallo seguía ahí con la
solución al lado.

Se resolvió, pero no por donde parecía. Cambiar la URL que llama el frontend
habría movido el problema —`/api/quote` devuelve precio y cierre anterior;
`/api/stock` devuelve además nombre largo, 52 semanas, sector y volumen, con los
nombres en camelCase que la interfaz ya consume—. Lo que faltaba no era otra URL,
era el failover, así que **la cascada se enchufó a la ruta viva**: Yahoo sigue
siendo el primario y la cadena entra cuando Yahoo no devuelve precio, que es
exactamente el caso que antes acababa en error.

Con eso vino la otra mitad, la que el módulo exige en su cabecera: *un precio que
no se pudo refrescar se devuelve con `stale=True` y el llamante DEBE enseñarlo*.
El «LIVE» verde del panel de opciones estaba **escrito a mano** y se pintaba
igual con un precio de hace un segundo que con uno de ayer. Ahora sale de
`stock.stale`: con un precio sin refrescar es ámbar, con la antigüedad al lado y
**sin el punto que palpita** —lo que palpita dice «esto se está actualizando»,
que es justo lo que no pasa—.

**2. El monedero de referidos se llena y no se puede ni ver ni gastar.**
`credit_referrer_for_payment` está enganchado a los tres caminos de cobro y hace
`$inc` sobre `referral_wallet`: es dinero que el sistema debe, acumulándose ahora
mismo. Las dos rutas que lo enseñan y lo gastan están muertas. La de canjear
además mentía dos veces —restaba de un saldo que no bajaba y escribía «aplicado
al próximo checkout» sin que nadie lo leyera—; ahora responde 501 y no escribe
nada mientras el crédito no se aplique de verdad. Sigue abierto dónde vive la
pantalla.

**3. `POST /backtest` metía el apalancamiento en el P&L.** `move_pct = ((price −
entry) / entry) × 100 × side × leverage`, que es el invariante que este
repositorio tiene escrito en mayúsculas. Y el P&L no salía del movimiento del
precio sino de `balance × 2 % × (move_pct / stop_loss_pct)` recortado a una
banda: una curva de equity inventada, etiquetada `data_source: "yfinance"`.

**Las 8 bajas.** De las 14 marcadas `BORRAR` se ejecutaron las 8 cuyo sucesor
estaba escrito en el propio código —no había nada de producto que decidir, sólo
dejar de servir dos veces lo mismo—: el diario legado `/journal/trades` (cuatro
verbos; era la segunda puerta autenticada a `db.trades`, el BUG-039, y su propio
docstring ya ponía «⚠️ OBSOLETO»), `change-plan-legacy`, `POST /backtest`,
`/ohlc-universal` y `/referrals/leaderboard`. Con sus modelos y ayudantes:
**~500 líneas**. Las 6 que quedan exigen decisión de producto y no se tocaron.

Lo que **no** se borró importa: la sonda de autorización cruzada comprobaba que
la puerta legada al diario estuviera cerrada. Ahora comprueba que **no haya
puerta**, leyendo el `openapi.json` del propio servidor — pedirle un 404 a la
ruta no valdría, porque FastAPI devuelve 404 igual para un camino inexistente que
para una operación que no es tuya.

**El trinquete es de dos direcciones.** `check-rutas-muertas.py` falla si aparece
una ruta sin consumidor que no está en la tabla, **y también** si una fila de la
tabla ya tiene pantalla: así la lista ni crece ni se pudre. 38 → 29.

#### La regla de log injection cubría un fichero y una forma

CodeQL marcó un `logging.info(...)` **mío**, recién escrito. La regla que yo mismo
había puesto para eso no lo vio, y al mirarla se entendía por qué: era un regex
por líneas sobre `server.py`. Un f-string partido en dos líneas se le escapaba, y
los otros 11 módulos no los miraba nadie. Medido: **48 f-strings crudos y 88
argumentos `%` sin sanear** en 11 módulos.

La reescritura es con `ast` sobre **todos** los módulos, y busca la propiedad —un
valor no saneado que entra en una llamada de log— en vez de una forma. Con ella,
`log_safe` salió de `server.py` a `log_seguro.py` para que puedan importarlo los
doce. Y se le añadió un `.replace()` explícito de `\r` y `\n` que ya era
redundante con el `isprintable()` de después: **CodeQL modela `str.replace` y no
modela un `isprintable()` dentro de un generador**, así que el código era correcto
y la herramienta no podía verlo. Escribirlo de forma que la herramienta lo vea no
es ceder, es que el análisis sirva para algo.

*La lección, que es la de siempre en este repositorio:* una regla que describe una
**forma** tiene agujeros fuera de esa forma. Hay que describir la **propiedad**.

#### Los seis brókers de referido

Se pidieron los enlaces de Axi, VT Markets, Saxo, Interactive Brokers, Swissquote
y Dukascopy. Un enlace de referido a un bróker de CFDs no es un banner: **es una
promoción financiera**. Así que el módulo no guarda enlaces, guarda **las
condiciones bajo las que un enlace se puede publicar** —entidad legal, regulador,
número de licencia, porcentaje de pérdidas con su fecha— y la advertencia
normalizada de ESMA con la cifra real de ese bróker.

**El porcentaje caduca a los 100 días**, que es la pieza que casi nadie
implementa: ESMA obliga al bróker a recalcularlo cada trimestre, así que una cifra
fija en el código es falsa a los pocos meses. Mismo criterio que `stale` en los
precios. Y los enlaces van en el entorno (`BROKER_REF_AXI`…), nunca en el
repositorio: uno incrustado acaba apuntando a la cuenta de otro el día que alguien
copie el fichero. Hay una prueba que lo impide.

Con el listón europeo aplicado, hoy **no se publicaba ninguno de los seis**. El
propietario decidió publicarlos igual: opera bajo **régimen suizo de sola
promoción** y para público internacional. La decisión se respetó y se ejecutó —
pero **el listón no se borró**: `puede_mostrarse()` sigue entero y cada bróker
publica `cumpleUe` en la API. Borrar el dato en vez de decidir sobre él es lo que
no se puede hacer.

**La prueba que no disparaba.** Para comprobar que no se inventaban porcentajes,
se le metió a Swissquote un 55,05 % fabricado. **La suite siguió en verde**: la
prueba comprobaba que el número apareciera, no que fuera defendible. Se añadió
`perdida_pct_fuente`, obligatorio para que una cifra llegue a pantalla, y se
volvió a sabotear: ahora sí falla. No prueba que la cifra sea correcta —ningún
test puede—, pero obliga a que inventarse una exija inventarse su procedencia.

Los dos porcentajes que hay salen de buscador y están marcados **pendientes de
confirmar**: `axi.com`, `dukascopy.com`, `swissquote.com`,
`interactivebrokers.com`, `cnmv.es` y `cysec.gov.cy` **están bloqueados por el
proxy de este entorno**. Lo que no se pudo leer en la fuente se dice, no se
rellena.

#### Un test que prohibía decir «no lo sé», y por eso obligaba a mentir

Escribiendo la entrada de este diario hubo que abrir `stock_data.py` para
**verificar** lo que se iba a afirmar sobre el arreglo del máximo de 52 semanas.
Dos líneas más abajo estaba `"dividendYield": 0.0`, fijo. El endpoint de chart de
Yahoo **no publica el dividendo**: ese cero no venía del proveedor, lo escribía
nuestro código, y no dice «no lo sé» sino «esta acción no paga dividendo» — falso
de Coca-Cola, de J&J y de media lista del S&P 500. Y `q` entra en el
Black-Scholes de toda la app.

Estaba en cuatro sitios: la ruta en vivo, el helper `raw or 0.0`, el estado de
error —la respuesta que existe justo para decir que no se sabe nada, con todo a
`None` **menos** el dividendo— y `_build_stock_dict`, que además sacaba el máximo
anual de `precio × 1.3` y el mínimo de `precio × 0.7`. Esa última función **no la
llama nadie**; se arregló igual, porque el día que se conecte nadie va a releer
esas dos líneas.

Lo que más enseña es **por qué seguía ahí**: la prueba de integración exigía
`isinstance(d["dividendYield"], (int, float))` y `d["high52w"] > 0`. Un test que
prohíbe responder «no lo sé» **empuja al código a inventarse una respuesta**. Se
cambió por lo único que sí se puede exigir: o un número con sentido, o `None`. Los
cuatro sitios se sabotearon uno a uno para comprobar que las pruebas nuevas fallan
—las dos primeras rondas sólo dispararon dos de las cuatro, así que hubo segunda
ronda—. (BUG-063.)

#### Cuatro errores propios, y cómo se cazaron

- **Un sabotaje viejo dejó pasar el verificador nuevo.** `probar-verificadores.sh`
  tenía escrita a mano una fila (`/api/quote … CONSTRUIR`) que yo había cambiado a
  `BORRAR`: el `replace` no encontraba nada, el fichero no se alteraba y el
  verificador pasaba **con razón**. El arreglo no es cambiar el literal: es
  quitar la primera fila de decisión sea cual sea, y **abortar si el sabotaje no
  cambió nada**.
- **La sonda del tamaño de letra medía el contenedor, no el texto.** Decía «16 px»
  midiendo un `div` sin clase de tamaño que hereda del cuerpo, mientras el `<p>`
  estaba a 14. Comprobado poniendo la advertencia a `text-[10px]`: **la sonda
  seguía verde** con la letra diminuta, que es justo el incumplimiento que existía
  para cazar. (Y con ello se corrigió un mensaje de commit anterior que afirmaba
  «16 px frente a 14» cuando eran 14 y 14.)
- **`justify-center` sobre una fila que desborda** dejaba a Margex e Hyperliquid
  **inalcanzables**: centrar recorta el principio, y eso no se recupera
  desplazando. Se vio en la captura, no leyendo el código.
- **El script de sabotaje sobrevivió a un reinicio del contenedor** y volvió a
  aplicar sus cambios; estuve a punto de commitear fuente saboteada dos veces. La
  comprobación de residuos buscaba dos cadenas concretas y se le escapó una: se
  cambió por una verificación de integridad por propiedad.

**Verificado:** pytest **1006 passed / 72 skipped** (27 nuevos de brókers, 8 de
honestidad numérica en `stock_data`) · engine-check
370/370 · i18n 10/10 · gen-mapa `--check` · gen-instruments `--check` ·
check-rutas-muertas · check-doc-links · ESLint 0 errores · `brokers.js` 22
comprobaciones y `precio-viejo.js` 12, en un navegador real sobre el build.

**Queda abierto:** las 6 rutas `BORRAR` que exigen decisión de producto, las 20
`CONSTRUIR` (la más barata: `/performance/export`), el alta en los programas de
Axi y Dukascopy, los logos de los seis y la tarjeta de Margex, que anuncia bono e
incentivos sin aviso de riesgo.

### 2026-08-22 — Margen cruzado: la pregunta que ninguna calculadora responde

Llegó una herramienta empaquetada aparte —motor, componente y currículo— para
integrar. Lo primero fue no creérsela: **cada cifra que afirmaba se recalculó**,
y de las que sobrevivieron salieron las comprobaciones de `engine-check`. Tres
de ellas eran falsas.

**Lo que decía y lo que sale.** El texto sostenía que la diferencia entre
congelar el margen en la entrada y recalcularlo a mercado eran «5,68 $ frente a
8,66 $ de colchón, un 52 % de error». Las dos cifras existen, pero **no son eso**:
recalcular el margen mueve el colchón de 5,672 $ a 5,678 $ —un 0,1 %, y a
favor—. Los 8,66 $ son otra cosa: la distancia hasta perder el margen en
**aislado**, que es `precio ÷ apalancamiento`. Puestas una al lado de la otra
dicen algo mucho mejor que el error que se les atribuía: *el cruzado, con los
5.000 $ de la cuenta entera detrás, liquida ANTES que el aislado*, porque el
umbral del bróker no es perder el margen sino bajar de la mitad de él. El módulo
se reescribió alrededor de eso y el simulador enseña las dos lecturas juntas.

También decía que el segundo tramo se desbloquea en 4.337,35. Sale **4.335,49**
(la condición es `499·P − 2.159.075 ≥ P`, y se comprueba por bisección en
`engine-check`). Y que completar la escalera exigía «16.641 $ de balance», que
era el *extra*, no el balance. Se sustituyó por la comparación que sí se
reproduce con un clic: con 5 céntimos de separación el plan muere en el tramo 2;
con 10 $, entra entero y el colchón **crece** de 5,68 $ a 17,65 $.

**Cuatro fallos de código, cada uno con su sabotaje.**

- `sizeForCushion` evaluaba el margen en el precio de **entrada**, contradiciendo
  la tesis del módulo que lo acompaña. Ahora lo evalúa en el del stop-out
  (`P ∓ colchón`), lo que corrige 0,619 → 0,620 lotes a 1:200 y 0,703 → 0,704 a
  1:2000. El techo (`saldo ÷ (contrato × colchón)` = 0,714) no se mueve: es el
  límite cuando el apalancamiento tiende a infinito, y ahora la función converge
  a él de verdad.
- La cota superior de la bisección de `canOpen` salía del margen libre. Al
  **cubrir** en modelo neto caben lotes que no cuestan margen ninguno, así que
  esa cota los cortaba en silencio: daba 3,1 donde caben 10,78. Ahora `hi` se
  duplica hasta que el predicado falla.
- `minCushionAt` buscaba la posición del mínimo en una lista ya filtrada de
  nulos y la usaba para indexar otra sin filtrar: en cuanto un peldaño tenía
  colchón indefinido, el aviso señalaba al tramo equivocado.
- La escalera se construía **en contra** de la posición con el comentario «se
  escala a favor»: un largo bajaba de precio. Eso convierte piramidar en
  promediar a la baja, que es exactamente lo que el módulo 06 advierte que no se
  haga. Ahora el sentido es un campo del usuario (*a favor* / *en contra*) y vive
  en `buildLadder`, no escondido en un signo.

Los cuatro están en `scripts/probar-verificadores.sh`: se reintroducen a
propósito y `engine-check` tiene que caerse. Se cae.

**El componente no se podía pintar.** Usaba un vocabulario de tokens que este
repositorio no tiene —`bg-ink`, `text-bone`, `rounded-soft` y **ámbar como color
de acento**, que es justo lo que el dueño rechazó y `identidad-visual` prohíbe
volver a proponer—. Reescrito sobre el sistema real (`bg-card`, `border-rule`,
`text-primary`, `--long`/`--short`). Los colores en línea y los de Recharts iban
como `var(--short)`, que es CSS inválido: las variables guardan el trío HSL
suelto, así que la marca del stop-out salía invisible. Ahora van en
`hsl(var(--short))` y el gráfico cambia con el tema. Y `resolveSpec(símbolo)`
llevaba un argumento de dos: resolvía el producto por defecto —contado— y
devolvía un tamaño de contrato genérico en vez de las 100 onzas del oro.

**Lo que hay ahora.** `lib/crossMargin.js` (funciones puras),
`CrossMarginSimulator` como decimoquinta herramienta del panel
(`?tab=cross-margin`) con cuatro escenarios de un clic —piramidar, el tramo que
no entra, promediar a la baja, tramos decrecientes—, la curva de margen libre
por precio, la regleta a escala, el candado bajo los tres modelos de margen y el
aviso cuando el apalancamiento supera el tope minorista de la UE del catálogo.
Y en la Academia → Riesgo, el curso **«Margen cruzado»** (`?topic=cross-margin`):
once módulos con la creencia que corrige cada uno, su comprobación de una
pregunta —con la correcta rotando de posición— y la tabla de lo que se cree
frente a lo que ocurre. Los escenarios del simulador son los casos trabajados
del curso, para que se puedan reproducir en vez de creer.

**Y dos fallos que sólo aparecieron al MIRAR.** El banco E2E se levantó y se
abrió la pantalla, como manda el skill `qa`, y encontró en la primera captura lo
que ni el lint ni las 422 comprobaciones podían ver:

- el panel de «las dos lecturas» enfrentaba la distancia en aislado medida en la
  **entrada** contra el colchón cruzado al **final de la escalera**. Dos
  posiciones distintas en dos momentos distintos: salía 8,66 frente a 17,65 y el
  cruzado parecía dar más aire, justo lo contrario del módulo. Ahora ambas se
  miden sobre el primer tramo → 8,66 frente a 5,68;
- las etiquetas de los extremos de la regleta se anclan en el 0 % y el 100 %, así
  que sin acolchado lateral el stop-out y el objetivo se comían el borde de la
  tarjeta y perdían un dígito. En un precio, un orden de magnitud.

**Verificado:** `engine-check` **422/422** (52 comprobaciones nuevas, todas
atadas a una frase del curso) · `i18n-check` 6.858 claves × 10 idiomas, 0
huecos, 0 sobrantes · `check-edu-index` 86 = 86 · `check-fetch-credentials` ·
`gen-instruments-js --check` · `gen-mapa --check` · `check-doc-links` · ESLint 0
errores · `npm run build` exit 0 · `probar-verificadores.sh` (los cuatro
sabotajes nuevos detectados) · `pytest` **890 passed / 74 skipped** · y en el
navegador sobre el build de producción, escritorio y móvil, sin errores de
JavaScript ni desbordamiento: con el escenario «El tramo que no entra» la
pantalla reproduce las cifras del curso —rechazo en el tramo 2 pidiendo 4.328,20
con 696,80 disponibles, y el candado en 0 / ∞, 4.328,15 / 116 % y 8.656,30 / 58 %
según el modelo de margen—.

> ⚠️ **Nota para quien ejecute `pytest` en el venv del banco E2E:** sin
> `pytest-asyncio` instalado, los siete tests de `test_app_settings_roundtrip_unit.py`
> salen en rojo. No es el producto: son `@pytest.mark.asyncio` que nunca se
> ejecutan. Con el plugin, 890 pasan. Un ❌ es una hipótesis, no un veredicto.

**Lo que NO cierra:** G-33 sigue abierto. Ésta es una herramienta nueva escrita
ya sobre el catálogo, no una de las catorce viejas rehechas.

### 2026-08-22 (2) — Revisión adversaria de la rama, y lo que encontró

Se pidió revisar la rama antes de implementarla. El método fue el de
`no-me-fio`: dar por FALSA cada afirmación y buscarle una ruta que no comparta
código con ella.

**La aritmética, por segunda ruta.** `engine-check` llama a las mismas funciones
que el componente: comprueba que no han cambiado, no que sean correctas. Se
hicieron 52 comprobaciones por caminos independientes —cuentas a mano con
números redondos; el catálogo por su otra puerta (`positionMetrics` de
`instruments.js`); **identidades**, que en vez de creerse el precio despejado
reconstruyen la cuenta a ese precio y exigen que el margin level sea el umbral;
y la **EDO de la ruina resuelta por diferencias finitas** contra la fórmula
cerrada—. Las 52 coinciden.

Dos de las rutas que fallaron eran de la sonda, no del producto, y merece
anotarse: el primer intento leía `pm.margin` cuando el campo es `marginUsed`, y
el Monte Carlo de la ruina usaba un paso de σ/√40 = 9,5 $ contra una barrera de
7,66 $ — no resolvía el problema, lo cambiaba, y daba 17,6 % donde hay 8,6 %.

**El bug que encontró la simulación masiva.** Al cubrir el motor con escenarios
generados apareció a la primera algo que ninguna comprobación elegida a mano
habría mirado: `cushion()` tomaba la dirección adversa del signo de la
exposición neta, cuando la marca la pendiente del excedente. Detalle y arreglo
en el commit; lo importante del método es que el fallo estaba en un régimen
—cartera cubierta, margen de dos patas, apalancamiento bajo— que nadie habría
elegido a mano, y que el síntoma era un colchón NEGATIVO sobre una cuenta al
400 % de margin level.

**El hueco de integración.** La rama pasaba todas las puertas y la herramienta
seguía siendo invisible para el embudo de captación: `gen-seo-pages.js` genera
las ~1.600 páginas estáticas desde dos listas escritas a mano, y ni la
calculadora ni el curso estaban en ellas. Ahora sí, en los diez idiomas
(sitemap 1589 → **1609 URLs**), y con una guarda nueva en `engine-check` para
que un renombrado no deje esas páginas apuntando al vacío: cada `?tab=` de la
máquina de SEO tiene que existir en `CALC_NAV` **y** estar en la lista que el
panel acepta por URL, y cada `?topic=` tiene que existir en `EDUCATION_NAV`.
Sin ella, una página renombrada se sigue publicando, sigue posicionando y deja
al visitante en la calculadora por defecto sin que nada avise.

**Lo que sólo se vio mirando.** Las dos pantallas nuevas, en los diez idiomas
sobre el build compilado: 20/20 sin claves crudas, sin desbordamiento y sin
errores de JavaScript, con el árabe en RTL. Y en tema claro, que era la mitad
sin comprobar: `hsl(var(--primary))` resuelve a `rgb(27,152,79)` en claro y
`rgb(23,207,99)` en oscuro — es decir, los colores del gráfico y de la regleta
son de verdad sensibles al tema, que es lo que el arreglo de `var(--short)`
perseguía. Ahí se vio también que el conmutador seguía diciendo «las mismas
catorce de siempre» con quince herramientas, en los diez idiomas. Se quitó la
cifra en vez de subirla a quince: la barra lateral ya muestra el recuento vivo
y un número escrito a mano sólo vuelve a envejecer.

**Lo que queda sin comprobar, y se dice:** el contenido del curso se contrastó
contra los límites de ESMA y contra el catálogo, pero las afirmaciones sobre
*cómo se comporta cada bróker concreto* (qué modelo de margen aplica, si cobra
el swap en las dos patas) son de sector, no verificables desde el repositorio, y
el propio curso manda comprobarlas en la ficha del instrumento. Tampoco se probó
la herramienta con un bróker real. Y dos restos ajenos a esta rama: `s.tmp.cjs`
en `frontend/`, un fichero temporal que se coló en el commit 8a0ade5, y
`toolMapIntro`, una clave i18n muerta que aún dice «14 calculadoras» en los diez
idiomas sin que ningún componente la pinte.

---

### 2026-08-26 — ¿Kunfupay en lugar de Stripe? El estudio, y lo que no se pudo verificar

**Lo que se preguntó:** si Kunfupay serviría para sustituir a Stripe «por el
momento». **Lo que se entrega:** [`PASARELA_KUNFUPAY.md`](./PASARELA_KUNFUPAY.md).
**Nada adoptado, ni una línea de código tocada.**

**El hallazgo que cambia la pregunta.** Apagar Stripe no deja la web sin cobrar:
PayPal, Revolut Pay y NOWPayments ya cobran, con webhook firmado y concesión de
premium por el mismo `_activate_paid_subscription`. Lo que Stripe se lleva al
irse es concreto y está inventariado con `fichero:línea`: renovación automática,
prueba de 7 días (`METODOS_CON_PRUEBA` es sólo raíl Stripe), SEPA, Klarna, portal
de cliente, historial de facturas, reembolso de un clic y revocación por impago.
O sea: la urgencia no es «sustituir a Stripe», es decidir si se quiere recurrencia.

**El segundo hallazgo, que es un bug de honestidad y es anterior a Kunfupay.**
Los Términos prometen, en los diez idiomas, que «el IVA aplicable se calcula en el
momento del pago … y se muestra desglosado» (`legalContent/es.js:134`).
`_create_stripe_session` **no pasa `automatic_tax`** y no hay rastro de Stripe Tax
en el backend: hoy se cobran 17 € planos, sin desglose ni determinación de país.
Con un Merchant of Record el problema no se arregla, **deja de ser nuestro** — y
ése, no la comisión, es el mejor argumento a favor de Kunfupay en este caso.

**Lo que NO se pudo verificar, y por eso no hay recomendación de integrar.**
`kunfupay.com` está bloqueado por el proxy de salida de este entorno
(`EGRESS_BLOCKED`), igual que dos de las fuentes secundarias. Todo lo que dice el
documento sobre ellos sale de material indexado por buscador. Y **no existe
documentación técnica suya indexada en ningún sitio**: ni referencia de API, ni
webhooks, ni Zapier. Su control de acceso automático documentado es nativo de
Telegram/Discord, no genérico. Por eso el documento termina en diez preguntas para
su soporte, de las que **las tres primeras deciden si hay integración o enlaces a
mano**: API con referencia propia, webhook firmado, y si el «cobro recurrente» es
cargo automático o recordatorio de pago.

**Coste, para que esté escrito:** 1,5% + 0,25 € (Stripe, tarjeta EEE) frente al
5-10% que ellos publican. Con 100 mensuales: ~612 €/año frente a 1.020-2.040 €/año.
La comparación honesta no es 1,5% contra 5-10%, es 1,5% **más el cumplimiento
fiscal propio** contra 5-10% con el cumplimiento incluido.

**Añadido en la misma sesión — «¿cuál renta más?».** Se responde en el § 11 del
documento. Resumen: **la comisión no es la variable que decide, la renovación
automática sí**. Un mensual de 17 € que hay que volver a pagar a mano rinde entre
cuatro y seis veces menos que el mismo plan con cargo recurrente (supuestos de
sector, no medidos aquí — no hay datos propios todavía), mientras que toda la
diferencia de comisión entre Stripe y Kunfupay en ese cobro es de 0,34 a 1,19 €.
Y una segunda lectura que la horquilla «1,5 % contra 5-10 %» escondía: el 1,5 %
es tarifa de tarjeta del **EEE**; para un comprador de LatAm son 3,15 % + 0,25 €,
y con Stripe Tax activado 5,1 % — es decir, **lo mismo que Kunfupay al 5 %**, pero
sin IVA resuelto y sin métodos locales. Conclusión: Stripe si te acepta; Kunfupay
como cuarto raíl para LatAm, no como sustituto; y si Stripe no te acepta y su
«enlace recurrente» no es cargo automático, lo que renta es empujar Anual y De Por
Vida en vez de integrar nada. El dato que falta para decidirlo con datos y no con
tablas: la geografía de quien compra, que GA4 ya puede dar.

**Segundo añadido — «¿hace falta ser empresa para retirar?» (§ 12).** Buscando
eso apareció una fuente primaria que sí es accesible desde este entorno: sus
*Condiciones de uso*, un PDF de 13 páginas servido desde un bucket de S3 y no
desde su dominio bloqueado. Dice que la titular es **KUNFU GLOBAL INC, sociedad
de Delaware inscrita el 14/07/2025** (registro 10259941, EIN 39-3235422), con
dirección en Hialeah, Florida, e invoca FTC Act, ECPA y DMCA. Ni una mención a
licencia de entidad de pago, ni al Banco de España, ni a supervisor europeo
alguno: **no es «la fintech española» de las notas de prensa, y tiene trece meses
de vida registral**. Sobre el retiro en sí, el documento no sirve: de la lista
*saldo, wallet, cobro, pago, reembolso, KYC, verificación, blanqueo, AML,
licencia, comisión, tarifa, empresa, autónomo*, **ninguna aparece una sola vez**;
las cuatro apariciones de «retirar» son sobre el consentimiento del RGPD. Las
condiciones de la cuenta de pago no son públicas (el resto del bucket da 403).

**Y una corrección de la entrada de esta misma mañana**, que es para lo que sirve
este registro: se escribió que «no existe documentación técnica indexada, ni
`docs.kunfupay.com`». Falso. `docs.kunfupay.com` existe y está indexado, y
`business.kunfupay.com` también. Por su contenido indexado parece documentación
de **usuario**, no referencia de API — que es lo que sigue sin aparecer — pero la
afirmación tal como se escribió era más fuerte que la evidencia. Corregido en el
§ 0 del documento, con la corrección a la vista y no borrando el error.

**Tercer añadido — «¿y su sistema de suscripción y todo lo demás?» (§ 13).** Su
suscripción está construida para **grupos de Telegram/Discord de pago**: el bot mete
al que paga y **echa al que caduca o cancela**. Eso demuestra que internamente
tienen el estado y los eventos del ciclo de vida; lo que no se sabe es si los
publican por webhook o sólo se los pasan a su bot — que es la diferencia entre
integrarlos aquí en un día y no poder. Todo lo que aportan alrededor del cobro
(escaparate, embudos de email, «+100 herramientas», asesor IA, grupos) **ya está
construido en este repositorio o no hace falta**: no se pagaría 5-10 % por sus
herramientas, sino por sus métodos locales y su MoR.

Y un aviso metodológico que casi cuela: buscando «cómo funcionan las suscripciones
de Kunfupay» salen reintentos de cobro fallido, dunning por email y WhatsApp,
cupones, prueba gratis y portal del cliente — **pero eso es de Recaudo y Paytia, no
suyo**. No se les atribuye. De su sistema de suscripción no hay nada público sobre
reintentos, cancelación por el cliente, prorrateo ni portal del suscriptor.

El riesgo que el § 13.4 pone por delante de la comisión: con un MoR **el cliente no
es tuyo**. Con Stripe te llevas los `customer_id` y existe migración PCI de los
métodos de pago; con una Inc. de Delaware de trece meses, el día que cierren la
cuenta no hay forma de seguir cobrando a tus suscriptores. Veredicto: buen
producto, mal encaje — buen método de pago para LatAm, no buen sistema de
suscripción para esta web.

**Cuarto añadido — compatibilidad para los primeros 50 k (§ 14).** La pregunta era
si funciona la suscripción y si con un impago se bloquea. **Se bloquea, y no
depende de la pasarela**: `check_premium` (`server.py:1650`) mira `subscription_end`
—o el plan `lifetime`—, y **todos** los endpoints que devuelven el usuario al
frontend envían `is_premium` **calculado** con esa función, no el campo guardado
(`:2023, :2088, :2179, :2290, :2570, :2746, :3019`). El navegador nunca ve un
premium caducado, así que `ProtectedRoute` cierra a la vez que `require_premium`
devuelve 403. De Kunfupay no hace falta un evento de impago: hace falta uno de
**cobro**. Y el fallo peligroso es el contrario del que se temía — que cobren la
renovación y no nos enteremos, bloqueando a alguien que paga.

De ahí que los dos caminos lleguen a 50 k. Con webhook, `kunfupay.py` calcado de
`revolut.py`, un día. Sin webhook, alta a mano desde admin —el plan calcula la
fecha solo (`_compute_subscription_end`, `:7962`) y queda en auditoría, cero
código nuevo—, pero el coste operativo lo fija el ticket: 2.941 cobros hasta 50 k
en el plan mensual (~245 altas manuales al mes, inviable) frente a 250 en el anual
(~21 al mes) o 100 en el De Por Vida. **En camino B se vende Anual y De Por Vida.**

Peaje de arranque cuantificado: 2.500-5.000 € de comisión sobre 50 k, frente a
1.000-2.500 € por Stripe. Sobrecoste de 1.000 a 3.500 € en todo el trayecto — un
precio acotado si es arranque y no estructura. Y un hueco nuevo detectado por el
camino: **no existe aviso de vencimiento por email**. Hay confirmación (`:3522`),
impago (`:3543`) y cancelación (`:3556`), pero nada que avise «te vence en 7
días», que es justo lo que sustituye al dunning cuando el raíl no renueva solo.

**Quinto añadido — sus «partners tecnológicos» (§ 15).** Crossmint, Bridge, Pomelo,
BlindPay y Fireblocks **existen los cinco y son serios**: Bridge es la API de
stablecoins **comprada por Stripe por 1.100 M$** (cerrada el 04/02/2025), Fireblocks
es custodia institucional de referencia, Pomelo emite tarjetas para Western Union,
BBVA, Santander y Binance —casi con seguridad es quien emite la KunfuCard—, y
BlindPay, respaldada por Y Combinator, enchufa stablecoins a PIX, SPEI y PSE. O sea
que parte del dinero correría sobre infraestructura **propiedad de Stripe**.

Pero la lista no es un sello de confianza: **es el plano de la arquitectura**, y
dice que la facturación no descansa en una cuenta de fondos de clientes de un banco
europeo, sino **en stablecoins hasta que se retira**. De ahí dos cosas concretas: al
menos dos conversiones por el camino (EUR → stablecoin → moneda de retirada), donde
se puede ir otro 1-2 % que la pregunta 7 del § 5 tiene que fijar; y que lo que
Fireblocks custodia son las claves de KUNFU GLOBAL INC, no el saldo de nadie.

Lo que sí prueba, y no es poco: para integrarse con Bridge, Fireblocks y Pomelo hay
que pasar su KYB y su diligencia debida. Es **verificación indirecta** por terceros
con obligaciones de AML — lo más parecido a un aval en todo el expediente, y sube la
nota del § 12.4. Sin ser lo mismo que estar regulado. Se añaden las preguntas 11 y
12 (quién emite la tarjeta y custodia el saldo; si está segregado de los fondos
propios) y una regla que vale desde el día 1: **cobrar ahí, no guardar ahí** —
retirar cada semana y no usar su wallet como cuenta corriente.

---

### 2026-08-26 (2) — El raíl de Kunfupay, el interruptor de raíles, y un «7 días» que se prometía con Klarna

Decidido arrancar con Kunfupay, esto es lo construido. **Nada de esto se ha
probado contra un cobro real**: su dominio sigue bloqueado desde este entorno y
no hay cuenta. El primer cobro de verdad, con un plan barato y mirando.

**El interruptor.** Qué métodos se pueden pagar sale ahora de un ajuste
(`payment_methods_enabled`), no del código: apagar Stripe es escribir
`paypal,revolut,nowpayments,kunfupay` y guardar. Dos decisiones que importan más
que la función en sí:

1. **El ajuste vacío significa «los de siempre», nunca «ninguno».** Una lista
   ilegible vuelve al valor por defecto en vez de dejar la web sin cobrar — es
   exactamente el fallo que ya costó el login entero cuando un `gcloud run
   deploy` sin `--set-env-vars` borró `CORS_ORIGINS`.
2. **La puerta está en el servidor** (`create_checkout`), no en el botón. Apagar
   un método en el frontend no apaga nada para quien llame al endpoint a mano.

Y `/api/public/settings` devuelve los raíles **ya resueltos** —`payment_methods`,
`recurring_payment_methods`, `trial_payment_methods`— para que la página de
precios no deduzca nada por su cuenta. Deducirlo era justo lo que llevó a
prometer 7 días con métodos que no los daban.

**El raíl (camino B, el que no necesita su API).** `POST /checkout/create` con
`payment_method: "kunfupay"` escribe la transacción **antes** de mandar a nadie a
pagar y devuelve el enlace del plan (`kunfupay_links`, JSON validado: sólo
`https` y sólo planes que existen). El alta la confirma un admin en
`POST /admin/payments/manual`, con formulario en el panel: referencia obligatoria
e **idempotente** (reintentar tras un timeout no regala un segundo periodo),
sólo proveedores sin webhook (Stripe/PayPal/Revolut/NOWPayments excluidos a
propósito: un alta a mano ahí taparía un webhook roto), mismo
`_activate_paid_subscription` que los webhooks, y fila en `payment_transactions`
+ auditoría, que es el rastro sin el cual el día de migrar no se sabe a quién se
le debe cuánto.

**`extend_from_current`.** Sin cargo automático, el cliente renueva a mano y casi
siempre unos días antes de vencer. Contando desde hoy, cada renovación
anticipada le robaba esos días; ahora el periodo se apila sobre la fecha vigente.
Sólo lo usan los raíles sin renovación: los webhooks entran como siempre.

**El bug de propina, anterior a todo esto.** `hayPrueba` sólo miraba el método,
así que con **Klarna** —que sólo cobra el De Por Vida, al que `trial_eligible`
nunca da prueba— la página anunciaba «7 días sin cargo» y el checkout cobraba al
instante. Es el mismo fallo que el comentario de `PricingPage.jsx` dice haber
arreglado para cripto, PayPal y Revolut, con Klarna dejado dentro. Ahora la
prueba sale de `_TRIAL_PAYMENT_METHODS`, y el backend la exige además en
`trial_eligible`.

**Verificado.** `py_compile` de todos los módulos · **27 tests nuevos**
(`test_payment_rails_unit.py`), y **saboteados**: quitar el respaldo de la lista
vacía, quitar la puerta del servidor y admitir Stripe en el alta manual dan 7
fallos, los tres sabotajes cazados · suite completa **755 pasan**; los 3 fallos
(`brokers_referidos` ×2, `ecb_rates`) **son anteriores y ajenos**: fallan igual
con el trabajo en `git stash` · `eslint` 0 errores · `i18n-check` con las tres
claves nuevas en los diez idiomas · `engine-check` 429/429 · `check-precios` ·
`gen-instruments-js --check` · `check-rutas-muertas` · `gen-mapa` regenerado ·
`check-doc-links`.

**Lo que sigue sin estar, y por qué:** el conector con webhook (no se puede
escribir contra una API que nadie publica) y el **aviso de vencimiento por
email**, que es el hueco que más duele en un raíl sin renovación: hay correo de
confirmación, de impago y de cancelación, pero ninguno que diga «te vence en 7
días». Necesita un disparador diario de verdad (Cloud Scheduler contra un
endpoint), no un bucle en el proceso.

**Tercer añadido — probado contra la aplicación viva, y el panel visto.** La
pregunta era si esto sirve de algo hoy y si de verdad se puede ocultar cada
pasarela. Respuesta con pruebas:

- **Sonda nueva `tests/e2e/api/pasarelas.py`, 22 comprobaciones, 22 en verde**,
  con Postgres y el backend de verdad: Kunfupay cobra la **suscripción** (17 €) y
  el **pago único** (500 €), cada uno con su enlace y con la transacción escrita
  antes de mandar a pagar (leído de Postgres, no de la respuesta); un plan sin
  enlace da 503; apagar Kunfupay en admin hace que el checkout responda **400**;
  apagar Stripe deja la tarjeta fuera y Kunfupay cobrando; encendida sin enlaces
  no se ofrece; el alta manual **abre el muro** (de no-premium a premium, fin a
  30 días), repetir la referencia no regala periodo, y un segundo cobro **apila**
  a 60 días. Más las cuatro guardas (Stripe no se da de alta a mano, sin
  referencia no hay alta, email de nadie 404, cliente 403).
- **Saboteada**: quitando la puerta del servidor y reiniciando el backend, las
  dos comprobaciones de «apagada en admin» se ponen rojas. Restaurado, verdes.
- **El panel, visto**: entrando con 2FA real en `/admin`, la tarjeta de raíles
  pinta las siete casillas con su estado, y desmarcar PayPal + Guardar deja al
  backend sirviendo `["card","kunfupay"]`. Sin errores de JavaScript. En
  `/pricing`, con tres raíles encendidos, se pintan esos tres y ninguno más.
- Se añadió el **widget de casillas** al panel (antes el ajuste sólo existía como
  texto en la API) y la sonda quedó registrada en `correr.sh` y en el skill `qa`.

**Dos trampas del banco de pruebas que costaron una vuelta cada una**, anotadas
para no repetirlas: `/checkout/create` está limitado a **10/hora por IP**, así que
la sonda rota `X-Forwarded-For` (en producción Cloud Run añade la IP real al
final y `_real_client_ip` toma esa, así que no abre ninguna puerta); y cuando el
limitador de registros obliga a clonar la cuenta sembrada, la clonada **es
premium**, con lo que «pasa a premium tras el alta» habría pasado sin probar
nada — la sonda ahora resetea la suscripción por SQL antes de empezar.

**Estado de la rama**: los 8 commits siguen **sólo aquí**. `main` no tiene nada de
esto y no hay PR abierto.

**Cuarto añadido — el alta manual no era idempotente de verdad (§ 16.7).** Al
abrirse el PR #212 y repasar el checklist del propio repo
(`.claude/skills/seguridad-pagos`, punto 4: «idempotencia de pagos: claim
atómico»), se vio que el endpoint comprobaba la referencia y **luego** insertaba.
Entre esas dos cosas cabe otra petición —doble clic, o el reintento del navegador
tras un timeout— y las dos concedían: **un cobro, sesenta días**. Medido con la
guarda quitada: de ocho peticiones simultáneas, **cinco** concedieron y el periodo
avanzó 60 días.

Arreglado con lo único atómico que da el shim, su `INSERT … ON CONFLICT DO
NOTHING`: el id de la transacción se deriva de la referencia (misma referencia,
misma fila, un solo INSERT sobrevive), cada petición mete su **testigo** y se
relee, y quien no encuentra el suyo no concede. El id se deriva **con el secreto
del servidor** para no romper el invariante de que `payment_transactions.id` es
inadivinable — es la referencia de pedido de los webhooks de Revolut y
NOWPayments.

**Y una lección sobre la sonda, que es la que más vale**: la primera versión de la
comprobación lanzaba **dos hilos en fila** y salía ✅ **también con la guarda
quitada** — la ventana es de milisegundos y la primera petición terminaba antes de
que arrancara la segunda. Un ✅ que no probaba nada, exactamente lo que avisa el
skill `qa`. Ahora son ocho hilos con barrera, y el sabotaje las pone rojas.

También se revirtió el 2FA que se había activado a mano en la cuenta sembrada para
poder ver el panel: con TOTP puesto, `cuenta()` se quedaba sin token y **ninguna**
sonda de API podía arrancar.

---

## 2026-08-26 — Tres páginas públicas hablaban castellano en los diez idiomas

Examen integral pedido de arriba abajo (contenido, idiomas, cálculos,
organización). Lo que salió verde y por qué ruta:

| Vertical | Ruta de comprobación | Resultado |
|---|---|---|
| Base | pytest + eslint + 14 verificadores + build | 1.041 pasan / 72 skip · 0 errores |
| Fórmulas | valores de referencia + diferencias finitas | BS call 10,4506 · put 5,5735 · Δ 0,6368 · paridad OK · IV imposible → `None` |
| SEO | el build REAL, con `postbuild` | 1.601 páginas · 1.609 URLs · hreflang ×10 + `x-default` |
| Seguridad | AST estático, no re-correr los tests | 41 rutas `/admin`, 0 sin guarda · 4 webhooks de pago, 4 verifican firma |
| i18n (paridad) | `i18n-check` | 6.965 claves × 10 idiomas · 0 ausentes · 0 sin traducir |

Y lo que no.

### El fallo

`AboutPage`, `ContactPage` y `NotFoundPage` **no importaban i18n**: cero
llamadas a `t()`, cero `useI18n`. El texto iba en castellano dentro del JSX y
salía en castellano en los diez idiomas, con la cabecera y el pie correctamente
traducidos alrededor. `/about` está en el sitemap con prioridad 0,7.
`AuthPages` —la pantalla de mayor intención de la web— iba a medias: 37 `t()` y
26 literales, incluidos los `aria-label` de la contraseña, que llegaban en
castellano a los lectores de pantalla de los diez idiomas.

Se vio en una captura, no leyendo código: `sobre__escritorio__light.png` con la
navegación en inglés y el cuerpo entero en castellano.

**Por qué los verificadores de i18n estaban en verde, y con razón:**
`i18n-check` compara juegos de claves entre idiomas. `i18n-traducido` compara el
valor contra el inglés. Los dos miran el DICCIONARIO. Ninguno pregunta si la
pantalla lo usa. Es el «check que sólo mira la mitad» del catálogo de
`no-me-fio`, aplicado a una capa entera.

### Lo que se hizo

- 103 claves nuevas × 10 idiomas para las cuatro pantallas. Los CTA de `/about`
  reutilizan `viewPlans` y `getStarted`, que estaban definidas y sin usar.
- **`scripts/i18n-escritura.js`** (nuevo, en CI): que cada idioma esté escrito en
  su alfabeto. En su primera ejecución cazó dos erratas que ya estaban en
  producción — `zh.js futPriceMove` valía «Движение цены», la fila entera en
  ruso, y `zh.edu.js ntStratsDesc` llevaba «первый» incrustado en mitad de una
  frase china. Las dos pasaban los otros dos verificadores sin despeinarse.
- **`tests/e2e/navegador/paginas-traducidas.js`** (nuevo): la ruta independiente
  que faltaba. Mira la PANTALLA, sobre el build compilado, en un navegador. 42
  comprobaciones (7 textos × 3 idiomas), cada una con **su aserción negativa** —
  que el castellano tampoco se cuele—, porque aquí los falsos verdes han sido
  siempre de omisión. Devolver `AboutPage` a su literal la hace fallar 6 veces.
- **`scripts/check-visuales-idioma.js`** (nuevo, en CI): techo por fichero para
  los 179 rótulos castellanos de los diagramas de la academia. Puede bajar, no
  subir; un diagrama nuevo parte de cero. No salda la deuda —son ~1.180 rótulos
  × 10 idiomas y llevan decisión de producto detrás, ver `PENDIENTES.md`—
  impide que crezca en silencio.
- **Precio pegado al periodo** en `/pricing` y en la portada: dos `<span>`
  adyacentes sin separador. Con «/mes» la barra disimula; con el plan lifetime
  salía «€500pago único», «€500Einmalzahlung», «€5001回限りの支払い». Ahora lo
  decide `components/pricing/PlanPeriod.jsx`, no un espacio invisible dentro de
  la traducción.
- **`capturas.js` decía cubrir «pantallas públicas»** y listaba `/options` y
  `/options/strategies`, que son `premiumOnly`: pintaban el login, la misma
  imagen byte a byte que `/login`. Tres de nueve capturas eran la misma y el
  smoke cerraba en verde. Lista corregida (entran `/brokers` y
  `/forgot-password`) y comprobación nueva: dos capturas idénticas son fallo
  duro.

### Dos sondas propias que estaban mal

**El recuento de claves muertas.** Se dijo «573 claves muertas, ~35 KB por
visitante» y luego «≥175, 12,8 KB» como suelo conservador. **Las dos cifras son
malas**: el detector no modelaba las claves construidas por concatenación
(`t(plan.id + 'Price')`), así que daba por muertas `monthlyPrice`,
`lifetimePeriod` y cuatro más que se están pintando ahora mismo en `/pricing`.
Borrarlas habría vaciado la página de precios. No se borró ninguna clave. Cuando
una sonda falla, la primera sospechosa es la sonda.

**Los cuatro sabotajes nuevos.** Llevaban `cd frontend && …` sin subshell dentro
de `probar`, que evalúa en el shell del script: el directorio se quedaba
cambiado y los tests siguientes medían otra cosa. 13 fallos, de los que sólo uno
era real. El aviso estaba escrito en el propio `probar()`, con este mismo fallo
como ejemplo.

Y una tercera lección de fontanería: `probar-verificadores.sh` restaura con
`git checkout -- .`, así que editar ficheros con seguimiento MIENTRAS corre se
los lleva por delante. Pasó con estas mismas notas.

### Lo que NO se comprobó

- **Las pantallas premium no se han visto.** El smoke sólo cubre público y no hay
  sesión de pago en el sandbox. Los 179 rótulos de la academia salen de leer el
  código, no de verlos renderizados.
- **El recuento de literales es un suelo.** El barrido caza castellano por
  tilde/ñ/¿; «Solo Lifetime» o «Listo para empezar» no llevan diacríticos.
- **Brókers y datos de mercado**: el proxy bloquea esos dominios.
- **El disparador de despliegue** vive en la consola de GCP, no en el repo.

---

## 2026-08-26 (2) — Del informe de esperanza matemática, lo que no estaba ya

Un informe sobre estrategias con esperanza positiva. Lo primero fue el
inventario, que es lo que manda `CLAUDE.md`: **la mayor parte ya estaba**.
Expectativa, R-múltiplos, SQN con tope 100, Kelly y ½ Kelly, riesgo de ruina,
Monte Carlo, Sharpe/Sortino/Calmar/Ulcer, VaR/CVaR, no-ergodicidad, martingala
frente a piramidar. No se duplicó nada.

Lo que faltaba de verdad, por orden de valor:

### 1 · Dos calculadoras (15 → 17)

**Punto de equilibrio y costes.** `ProjectionPanel` ya calculaba el equilibrio
pero exige diario y no mira los costes. El modelo nuevo se apoya en una
identidad limpia: con `k = coste / riesgo`, el ganador neto vale `R − k` y el
perdedor `1 + k`, así que `E = W·R − (1−W) − k` y el equilibrio se desplaza a
`(1 + k) / (1 + R)`. Con `k = 0` vuelve a `1/(1+R)`, y esa vuelta es la
comprobación que ata el módulo a `breakevenWinRate` — que se importa, no se
reescribe.

Y el número que faltaba: el **arrastre por frecuencia**. Mismo `k` de 0,05 con
1 % de riesgo son 0,4 % del capital al mes con 8 operaciones y 10 % con 200.

**Rachas de pérdidas.** Separa las dos preguntas que todo el mundo confunde:
perder 5 seguidas EN UN PUNTO al 60 % de acierto es 1,02 %; que ocurra ALGUNA
VEZ en 200 operaciones es 71 %.

Verificación: la recursión exacta de rachas contra **Monte Carlo** con 120.000
tandas, a menos de 0,1 pp en cinco configuraciones. Comprobar la recursión
contra sí misma no habría comprobado nada.

### 2 · Asimetría, curtosis y ratio de colas en el diario

Sharpe, Sortino, Calmar, Ulcer, VaR y CVaR: ninguna dice la FORMA de la
distribución, y un sistema de ratio menor que 1 saca buen Sharpe justo porque el
Sharpe penaliza la varianza y no la asimetría. Sobre R-múltiplos, no sobre P&L:
normalizan el tamaño de posición y describen la estrategia. Verificado contra
`scipy.stats` con `bias=True` en cinco distribuciones, coincidencia a 1e-9.
`tail_ratio` devuelve `None` por debajo de 20 operaciones porque con 19 el
percentil 95 ES el máximo.

### 3 · La pantalla de `backtest.py` (hueco G-14)

643 líneas escritas el 2026-08-22 —hold-out, walk-forward, Deflated Sharpe— con
sus dos rutas marcadas CONSTRUIR y sin puerta. Nueva pestaña «Validación» en
Performance. El veredicto se redacta en el frontend con los campos
estructurados: el `verdict` del backend viene en inglés y la web tiene diez
idiomas. CONSTRUIR baja de 20 a 18.

### 4 · Dos módulos de academia (89 temas, 730 páginas SEO)

Grid y martingala; la prima de riesgo de volatilidad. Emparejados porque el
error que corrigen es confundirlos: mismo perfil de pagos, sustancia opuesta.

### Tres correcciones a cosas que dije yo

**El recuento de claves muertas era falso.** «573» y luego «≥175» salían de un
detector que no modelaba `t(plan.id + 'Price')`. Daba por muertas `monthlyPrice`
y `lifetimePeriod`, que se pintan ahora mismo en `/pricing`. No se borró
ninguna clave.

**Dije que Volmageddon ya estaba en la academia.** No estaba. Mi búsqueda de
«XIV» sin distinguir mayúsculas dio positivo dentro de «refle-xiv-idad».

**Los cuatro sabotajes nuevos** llevaban `cd frontend` sin subshell y tumbaron
13 tests de la batería, de los que sólo uno era real. El aviso estaba escrito
dentro de la propia función `probar()`.

### Un fallo del detector de rutas, destapado por el trabajo

Escribir el cliente de `/backtest/validate` rompió el control negativo
`/backtest` de `gen-mapa.py`: la ruta retirada pasaba por consumida porque el
frontend nombra otra MÁS LARGA con su prefijo. El cierre del patrón excluía
letras y guiones, pero no `/`. Arreglado en el detector, no en el control.
Destapa además un falso negativo viejo: `GET /api/admin/referrals` no la llama
nadie. Rutas sin consumidor 32 → 33.

### Lo que NO se comprobó

- **La pantalla de backtest no se ha ejecutado contra datos reales.** Descarga
  histórico diario y aquí los proveedores de precio están bloqueados. Compila y
  pasa lint, i18n y build; el resultado con datos por ver.
- **Las cifras del CBOE sobre venta sistemática de opciones** no se han podido
  contrastar (proxy). El módulo describe la dirección del hallazgo con sus dos
  reservas —índices brutos, y el Sharpe favorece a las colas izquierdas— y no
  reproduce porcentajes concretos.
- **Nada de esto se ha visto renderizado**: las dos calculadoras y la pestaña de
  validación viven tras el muro premium, y el smoke visual sólo cubre público.

---

> **Entradas recuperadas de `ESTADO_PROYECTO.md` (2026-08-27).** La separación del
> 2026-08-13 movió el registro a este fichero pero **no llegó a borrarlo del origen**:
> allí quedaron 116 entradas, 108 de ellas ya copiadas aquí. Estas ocho eran las únicas
> que no tenían copia, así que se traen antes de vaciar aquel documento. Van al final
> —no en su hueco cronológico— porque este fichero es append-only: **la fecha del
> título manda**, no la posición.

### 2026-07-29 (cont.) — Revisión de los datos de los escáneres

Auditoría de los cuatro escáneres a petición del dueño, aplicando el mismo
criterio que el resto de la sesión: **lo que no se puede calcular no es un
número, y lo provisional lo dice**. Tres defectos reales encontrados.

#### 🔴 El ratio volumen/OI convertía el caso más normal en el más "inusual"

`_scan_chain_for_unusual` calculaba `ratio = vol / max(oi, 1)`. Cuando el interés
abierto es **cero** —el estado ordinario de un strike recién listado en su primer
día— el denominador pasaba a valer 1 y el ratio se volvía **el volumen entero**:
un strike con 500 contratos negociados y 0 de interés abierto puntuaba 500 y
encabezaba el ranking de "actividad más inusual". Es exactamente la misma clase
de fallo que el `r_multiple = 0` sin stop: una cantidad indefinida coaccionada a
un número que además domina una ordenación.

- `server.py → _volume_oi_ratio()`: devuelve `None` cuando no hay OI.
- `server.py → _rank_flow_rows()`: las filas sin ratio van **después** de todas
  las que tienen uno real, ordenadas entre sí por nocional. Antes, ordenar la
  lista mezclada por `ratio` las ponía arriba del todo.
- No se filtran por un `min_ratio` que no tienen: se conservan (volumen real en
  un strike nuevo puede interesar) pero marcadas con `oiUnavailable: true`.
- Frontend: `UnusualActivity.jsx` y `MarketFlow.jsx` renderizaban `{r.ratio}x`,
  que con `null` habría pintado literalmente **"nullx"**. Ahora muestran
  "sin OI" con su explicación.

#### 🟠 El desfase del interés abierto no llegaba al usuario

Yahoo publica el OI **una vez al día, tras el cierre**, así que todo ratio
compara el volumen de hoy contra el interés abierto de la sesión anterior: sale
alto a primera hora y es menos fiable tras un fin de semana. Está señalado en
`ANALISIS_TRADER §3.2` pero no aparecía en ninguna parte del producto. Añadido
`OI_STALENESS_NOTE` a las respuestas de `/options/unusual` y `/options/market-flow`,
y banda de aviso en ambas vistas. **No lo arregla** —eso exige otro proveedor de
datos, que es la decisión de negocio pendiente— pero deja de presentarse como
una medición.

#### 🟠 Patrones detectados sobre una vela sin cerrar se mostraban como confirmados

`_bar_is_forming()` ya existía y su docstring decía que era "para que el cliente
deje de presentar una ruptura provisional como un hecho" — pero la respuesta solo
llevaba **un booleano global**, así que el cliente no podía saber *cuál* de las
detecciones era la provisional. Y `LivePatternDetector.jsx` **ignoraba la bandera
por completo**: un martillo sobre una vela a medio formar se pintaba igual que
uno cerrado, aunque la figura pueda desaparecer en el siguiente tick.

- `/education/pattern-scan`: cada detección lleva ahora `provisional`,
  comparando su `index` con la última barra.
- `/education/structure-scan`: `_mark_provisional()` hace lo mismo con swings,
  eventos, FVGs y rupturas — un BOS "confirmado" por una vela en curso puede
  deshacerse antes del cierre.
- `LivePatternDetector.jsx`: etiqueta ámbar "Provisional" con explicación.
  `StructureScanner.jsx` ya tenía la banda global y se mantiene.

#### ✅ Revisado y correcto (para no repetir el trabajo)

- **La cadena sintética no entra en los escáneres.** `/options/unusual` y
  market-flow hacen `if not chain: continue` sobre `get_options_chain_real`, así
  que solo ven datos reales. Con el cambio de esta sesión (volumen/OI sintéticos
  a `None`), el `or 0` posterior los dejaría fuera igualmente por `min_volume`.
- **`max(x, 1)` restantes**: son guardas numéricas legítimas
  (`american_options.py:90-91`, `backtest.py:465`, `candle_patterns.py:197`).
- **`churn_rate` y `conversion_rate`** (`server.py:7309`, `:7319`) usan el mismo
  patrón `max(n, 1)`, pero ahí el numerador es **cero por construcción** cuando
  el denominador lo sería (es un subconjunto), así que no producen una cifra
  falsa. Comprobado, no tocado.
- `pattern-scan` y `structure-scan` ya traían buena higiene previa:
  `adjustments`, `aggregatedFrom` (4h compuesto desde 1h) e `interval` por
  detección.

#### 🔴 El "Precio ahora" del escáner de estructura no era el precio de ahora

Lo más grave de esta revisión, y afecta directamente a **soportes y resistencias**.
`detect_structure` usaba `current_price = rows[-1]["close"]` —el cierre de la
última vela de la temporalidad pedida— y la UI lo etiquetaba **"Precio ahora"**.
No lo es: en diario tras el cierre es el cierre de hoy, un sábado es el del
viernes, en mensual es el cierre corriente del mes, y el feed de Yahoo va con
retardo en muchos mercados.

Importa más aquí que en ningún otro sitio del escáner porque **todo el rol de
soporte/resistencia se decide comparando contra ese precio**. El propio
docstring de `detect_sr_levels` dice que equivocar ese rol es *"lo más engañoso
que este escáner podría decir, porque invierte la operación"* — y se estaba
alimentando con un precio potencialmente rancio. Reproducido: con el precio
un 1,2 % por encima del cierre, el nivel 115,02 pasa de **resistencia** a
**soporte**.

- `/education/structure-scan` pide ahora la **cotización en vivo**
  (`get_stock_data`, ya cacheada 5 min) y clasifica contra ella. Si falla, cae al
  último cierre y **lo dice** en `referenceSource`.
- Nuevos campos: `referencePrice`, `referenceSource` (`live` | `last_close`),
  `lastClose`, `livePrice`, `liveVsCloseDivergencePct`, `referenceDate`,
  `referenceAgeSeconds` y `levelsBetweenLiveAndClose` — este último cuenta
  exactamente los niveles cuyo rol depende de qué precio se use.
- `StructureScanner.jsx`: la etiqueta pasa de "Precio ahora" a **"Precio en
  vivo"** o **"Último cierre"** según lo que sea de verdad, con la fecha de la
  vela y un aviso ámbar cuando hay niveles en la zona de divergencia.
- ⚠️ Un test que ya existía (`test_empty_read_has_the_same_keys_as_a_full_one`)
  detectó que había añadido las claves nuevas solo a la respuesta completa y no
  a la vacía. El contrato es correcto —el cliente no debe ramificar según la
  forma que le llegue— y se corrigió.

**Verificación**: `pytest` **361 passed / 74 skipped** (+16 en
`tests/test_scanner_data_unit.py`), 188 rutas, i18n **5490 × 8 sin huecos**,
ESLint 0 errores, build exit 0.

---

### 2026-08-03 — Las herramientas se explican solas
Auditoría pedida por el propietario («¿mis herramientas son profesionales?»). El
motor lo era; la explicación no. Lo que se encontró, medido:

- **14 de 14 calculadoras no decían qué hacían.** Ni una tenía `CardDescription`.
- **`components/ui/tooltip.jsx` estaba instalado y muerto**: cero importaciones.
  La ayuda existente usaba el atributo `title` del navegador, que **en móvil no
  existe** — no hay hover — así que era invisible para quien entra del teléfono.
- **No había vista de conjunto.** Con 14 herramientas en pestañas, saber cuál
  sirve exigía abrirlas una a una.

Lo hecho:

- ✅ **`FieldHelp.jsx`**: interrogante que abre al **pulsar**, no al pasar por
  encima, sobre el `popover` que ya estaba instalado. `onOpenAutoFocus`
  prevenido: sin eso, abrir la ayuda robaba el foco al campo y en móvil cerraba
  el teclado. Exporta también `LabelWithHelp` para no repetir el `flex` en cada
  campo y que acabe desalineado en la mitad.
- ✅ **Una descripción por calculadora**, las 14, en los 10 idiomas. Regla al
  escribirlas: **qué** calcula y **cuándo** se usa. Si la frase no dice algo que
  no estuviera ya en el título, sobra.
- ✅ **Ayuda en 6 campos** de las calculadoras de riesgo, con la misma regla. Un
  interrogante que sólo reformula la etiqueta enseña a no pulsar ninguno, así
  que sólo se pone donde hay un rango sensato, un error frecuente o una
  consecuencia que no se deduce. Ej.: riesgo por operación explica que con un 2%
  hacen falta ~35 pérdidas seguidas para dejar la cuenta a la mitad, y con un
  10% bastan 7.
- ⛔ **El mapa de herramientas se retiró al integrar main.** Se había hecho un
  `ToolMap.jsx` (las 14 en una pantalla, tras un botón), pero main había
  reconstruido entretanto la estación como **barra lateral fija con buscador**,
  que resuelve lo mismo de forma permanente y sin abrir nada. Dos maneras de
  hacer lo mismo es peor que una: se queda la de main. De aquel trabajo
  sobrevive el `descKey` por herramienta en `CALC_NAV`.
- 🐛 **Fallo previo detectado por duplicado**: `CompoundCalculator` se titulaba
  «Estilos Comparados de un Vistazo» y calcula interés compuesto. Se arregló a la
  vez en main y en esta rama, con la misma solución (`cmpCalcTitle`); al integrar
  se conservó la de main, que llegó primero.
- ✅ **Verificado en navegador real** (Playwright, modo demo): descripción
  visible bajo el título, el popover abre con su texto, el mapa pinta las 14
  tarjetas y al pulsar una abre esa herramienta. ESLint 0 errores · i18n 10/10
  (5681 claves, +32) · engine 60/60 · build con 1589 URLs.
- ⏭️ **Pendiente**: ampliar la ayuda de campo a opciones, futuros y los
  simuladores. La infraestructura ya está; es sólo escribir los textos.
   Verifica antes de afirmar (compila, ejecuta, lee el archivo). Las cifras de §1 y §2
   son las que más se desvían: el 2026-08-13 decían 24 módulos cuando había 28.

---

### 2026-07-17 (47) — Acceso libre (comp) para cuentas de cortesía
- ✅ **`_FREE_ACCESS_EMAILS`** en `server.py`: correos con **acceso premium completo sin pagar**
  (útil mientras no está la facturación/Stripe activa). Por defecto incluye
  `tradingcalculatorpro@gmail.com`; ampliable por env `FREE_ACCESS_EMAILS` (coma-separado).
  `check_premium` los trata como premium; `affiliate_program._is_paying_member` los acepta como
  suscriptores de pago (pueden unirse al programa de afiliados). Sin cambios en el frontend: `/auth/me`
  ya devuelve `is_premium=True` para ellos → desbloquea funciones y muestra la opción de afiliados.
- ⚠️ **Revertir cuando haya pagos**: quitar el correo del set (o de la env var). No es admin por sí solo
  (para admin, usar `ADMIN_EMAILS`).
- ✅ Verificado: 10 tests afiliados; import 178 rutas; `check_premium`/`_is_paying_member` True para el
  correo comp y False para un usuario gratis normal.

---

### 2026-08-10 — Auditoría integral (contenido, cálculos, APIs, datos, normativa, admin)

Examen completo pedido de punta a punta. Informe entero en
[`AUDITORIA_2026-08-10.md`](./AUDITORIA_2026-08-10.md). Resumen de lo **nuevo**
(lo ya conocido —G-14, G-16, C-08, G-26— sólo se reevaluó):

**Base medida hoy:** `pytest` **761 passed / 74 skipped** (Postgres 16 real) ·
`npm run build` exit 0, 39 MB, 1589 URLs · ESLint 0 errores / 123 avisos ·
i18n **6019 × 10, 0 huecos** · engine-check **197/197** · instrumentos en
paridad · 55 documentos sin enlaces rotos.

**Hallazgos nuevos, por gravedad:**

- 🔴 **Testimonios fabricados en portada** (`i18n/es.js:2454-2465` × 10 idiomas):
  tres personas inventadas con antigüedad y «5 estrellas», más «Cientos de
  traders». La Directiva Ómnibus (UE) 2019/2161 los metió en el **Anexo I** de la
  2005/29/CE: desleales *en toda circunstancia*, hasta 4 % de facturación o 2 M€.
  Uno de ellos es además una promesa implícita de rentabilidad, que contradice la
  propia página de Advertencia de Riesgo.
- 🔴 **El panel admin pierde el 100 % de tres tipos de escritura** — PROBADO
  contra Postgres real. `app_settings` tiene dos esquemas incompatibles: se
  escribe con el documento único `{_id:"global"}` y se lee buscando documentos
  por `key`. Afecta al editor de planes (`admin_routes.py:892` vs `:934`, dentro
  del mismo par de funciones), al gestor i18n (`:692` vs `:724`) y a
  `/public/settings` (`:1144`). El admin recibe `{"success": true}` y no pasa
  nada; GA4/GTM/Clarity/Trustpilot **no se pueden activar desde el panel**.
- 🔴 **`days_to_expiry` pierde hasta un día entero** (`stock_data.py:601`):
  `.days` trunca la fracción y mezcla naive-UTC con naive-local. Un contrato a 7
  días se reporta como 6 → **−7,3 % en una call ATM semanal**, medido. Máximo
  error justo en semanales y 0DTE. Irónico: `year_fraction()` se escribió para
  contar las horas de sesión y recibe un entero al que ya se las han quitado.
- 🔴 **Normativa, cuatro bloqueantes**: responsable sin identificar («una LLC
  registrada en EE. UU.»), **sin representante en la UE** (RGPD art. 27), **sin
  derecho de desistimiento** (0 apariciones; la política de reembolsos lo
  condiciona a «no uso significativo», que es ilegal) y **PostHog con grabación
  de sesión sin declarar** — con la Política de Cookies afirmando en negrita lo
  contrario. Añadido: 🟠 sin IVA en el checkout (ni `automatic_tax` ni OSS), 🟠
  rectificación anunciada y sin endpoint, 🟠 teléfono/Twilio SMS sin declarar,
  🟡 cookies desfasadas por G-25.
- 🟠 **La cadena REAL fabrica cifras sin marcarlas** (`stock_data.py:552`, `:564`):
  `iv: 0.3`, `openInterest: 0`, `mid: 0` para el lado que no cotiza, y `or 0.3`
  cuando Yahoo publica IV 0. Viola la regla nº 2 del proyecto y **anula el
  cuidado de `_leg_oi()`**, que devuelve `None` «cuando nunca se observó» y al
  que nunca le llega un `None`, sino un `0` indistinguible de una observación.
- 🟠 **hreflang autodestructivo**: canonical a la URL desnuda y alternativas a
  `?lang=xx` de la *misma* URL, sirviendo el mismo HTML. Google canonicaliza y
  descarta las alternativas → 9 de 10 idiomas no se indexan. La inversión en
  6019 claves × 10 idiomas no se está cobrando.
- 🟠 **1589 páginas con 76 % de plantilla compartida** — PROBADO: 38 de 50 líneas
  de texto idénticas entre dos estrategias distintas; lo único propio es una
  frase. Patrón *doorway* + *thin content* en un sitio YMYL.
- 🟠 **G-16 es peor de lo anotado**: no es «Yahoo sin licencia», es **evasión
  deliberada de su detección de bots** (`curl_cffi impersonate="chrome"`,
  `stock_data.py:34`, con el motivo escrito en el comentario) monetizada a
  17-500 €. Cambia la naturaleza del riesgo y añade el derecho *sui generis* de
  base de datos. Un cambio de fingerprint apaga el producto estrella.
- 🟠 **`99.9 %` de uptime** en portada sin SLA y desmentido por los propios
  Términos. 🟡 «50+ activos» cuando hay ~186.
- 🔴 **Dominio**: sigue todo en `abcde-rgb.github.io/…`. Con un plan de 500 €, es
  el mayor freno a la conversión y regala la autoridad SEO a github.io. Es el
  arreglo con mejor relación impacto/esfuerzo del repositorio.

**Lectura de conjunto:** el problema es de **frontera**, no de fondo. Cada módulo
por dentro está por encima de la media; lo que falla es el contrato *entre*
piezas (shim ↔ admin, adaptador de Yahoo ↔ honestidad numérica, código ↔
políticas legales, producto ↔ portada). Ninguna de las siete comprobaciones
automáticas del proyecto puede ver un fallo de esa clase — de ahí que G-17
(tests del shim) suba de prioridad.

**No se ha tocado código:** el encargo era el examen. El plan priorizado en 15
pasos está en el §9 del informe.

---

---

### 2026-08-10 (cont.) — Se corrigen los hallazgos de la auditoría

Segunda mitad de la sesión: se pidió corregirlo todo y quitar los testimonios.
Detalle completo en el §11 de [`AUDITORIA_2026-08-10.md`](./AUDITORIA_2026-08-10.md).

**Estado final medido:** `pytest` **775 passed / 74 skipped** (eran 761; +14 de
regresión) · `npm run build` exit 0, 39 MB, 1589 URLs · ESLint **0 errores** ·
i18n **6021 × 10, 0 huecos** · engine-check **197/197** · instrumentos en
paridad · 56 documentos sin enlaces rotos.

- 🔴→🟢 **Testimonios fabricados eliminados** de los 10 idiomas y de
  `LandingPage`. Los sustituye «Cómo tratamos tus números»: tres compromisos que
  el repositorio cumple y los tests fijan. También fuera el **`99.9 %`** de
  uptime (sin SLA y desmentido por los Términos) y el **«50+» activos** (hay
  186): las cuatro cifras de portada se **cuentan ahora desde la fuente**.
- 🔴→🟢 **`app_settings` unificado.** Los tres lectores rotos leen por donde se
  escribe; verificado con la misma sonda que probó el fallo. Apareció una
  **segunda capa**: el frontend pedía `gtm_id`/`gsc_verification`/
  `bing_verification` y el backend publica `gtm_container_id`/
  `gsc_verification_code`/`bing_verification_code` — tres de cuatro
  integraciones no habrían funcionado ni con `/public/settings` arreglado.
  Nuevo `test_app_settings_roundtrip_unit.py` (7 tests) — cubre parte de G-17.
- 🔴→🟢 **El editor de precios deja de ser decorativo.** `get_effective_plans()`
  es el punto único de `/plans`, checkout, los tres webhooks y las métricas.
  Cambiar el importe **exige** mandar el `stripe_price_id` nuevo a la vez, o 400:
  mover uno sin el otro haría que la web anunciara 17 € y Stripe cobrara 29.
- 🔴→🟢 **`days_to_expiry`** con `ceil` sobre segundos y ambos lados en UTC. Se
  acabó el −7,3 % en la call ATM semanal. Nuevo `test_chain_honesty_unit.py`
  (7 tests) que fija tanto el día como la honestidad de la cadena.
- 🟠→🟢 **La cadena real deja de fabricar cifras.** `iv`/`openInterest`/`mid` son
  `None` sin observación. El `iv or 0.3` de `_build_chain_for_expiration` pasa a
  → IV publicada → **despejada del precio** (que es una medida) → griegas `None`,
  publicando `ivSource`. El ratio volumen/OI ya no calcula sobre un denominador
  inventado, y el optimizador rechaza patas sin precio o sin IV reales.
- 🔴→🟢 **Normativa**: desistimiento de 14 días + formulario del Anexo I(B) en
  los 10 idiomas · `automatic_tax` + `tax_id_collection` +
  `billing_address_collection` + `consent_collection` en el checkout (requisitos
  de operación en DEPLOY_CHECKLIST §E-bis) · **PostHog declarado** y corregida la
  frase falsa sobre seguimiento comportamental · teléfono y Twilio SMS
  declarados · cookies al día tras G-25 · retención de `usage_events` y del
  registro de SMS.
- 🟡→🟢 **G-26 cerrado**: `PUT /auth/profile` + formulario en Ajustes. El derecho
  de rectificación que la política prometía ya se puede ejercer.
- 🟠 **N1/N2 preparados, no cerrados**: la identidad legal y el representante del
  art. 27 pasan a **fuente única** (`lib/legalContent/entity.js`) con los tokens
  `{entity}` y `{euRepresentative}`. Rellenarla es ahora **una edición** en vez
  de diez ficheros. La sección del representante **se oculta sola** mientras no
  haya uno designado. Faltan los datos reales, que no están en el código.
- 🟠→🟢 **hreflang contradictorio retirado** del shell del SPA y de
  `gen-sitemap.js`. Las páginas estáticas ya lo hacían bien y no se tocaron.
  Queda pendiente la home estática por idioma para que la portada tenga hreflang
  de verdad.
- 🟡→🟢 **`user_state_ttl_days`** fuera del panel, con un comentario que explica
  por qué no debe volver.

**Sigue abierto y es decisión de negocio, no de código:** el dominio propio
(§7), los datos reales del titular y del representante en la UE (§3), el Grupo B
de proveedores de datos (§4, G-16 — evasión de la detección de bots de Yahoo,
el mayor riesgo estructural), las 1589 páginas anzuelo (§6) y G-14.

---

### 2026-08-01 — Auditoría integral 100% (documento, sin cambios de código todavía)
- 📄 **Nuevo doc [`AUDITORIA_INTEGRAL_2026-08-01.md`](./AUDITORIA_INTEGRAL_2026-08-01.md)**:
  auditoría a petición del dueño de **todo** el proyecto (frontend 19 páginas/~200 componentes,
  backend 169 rutas, 20+ docs), verificada contra el código real. Incluye: inventario, **matriz de
  trazabilidad de las 26 peticiones** (cada una → estado → acción), hallazgos por bloque
  (datos/APIs, TradingView, dashboard inteligente, educación, opciones, app móvil/desktop, SEO,
  journal, seguridad, i18n, performance) y roadmap P0-P3.
- 🔎 Hallazgos clave: (1) el gráfico usa el **embed iframe** → **no puede guardar dibujos** (necesita
  migrar a **Advanced Charts**, hueco G-05); (2) los **tipos de mercado** en Educación son tarjetas
  **estáticas** → falta la pestaña interactiva pedida (preguntas/ejemplos/calculadora/widget);
  (3) el **calendario** no tiene cuenta atrás ni banderas, y no hay panel de **ponentes** ni de
  **noticias**; (4) sin **badges de tiendas** ni apps nativas (PWA sí existe); (5) **Twelve Data**
  solo está en PENDIENTES, no integrado (backend usa Yahoo curl_cffi + CoinGecko); (6) **seguridad
  y ciclo de cuenta muy sólidos** (2FA, borrado RGPD, IP con x-forwarded-for) con endurecimiento
  menor pendiente (10× `detail=str(e)`, Dependabot/CodeQL, C-08).
- ✅ Confirmado ya implementado (no re-hacer): buscador universal con autocompletado, 8 idiomas a la
  par con banderas, lotes/pips/valor-pip, borrado de cuenta RGPD, 3+ pasarelas de pago.
- 🎯 Próximos pasos P1 recomendados: schema FAQ/HowTo en páginas prerenderizadas para featured
  snippets, Twelve Data conmutable + caché, buscador del gráfico con backend, presets de indicadores,
  Advanced Charts (dibujos guardables), calendario con cuenta atrás + banderas.
- ✅ **Implementado y verificado en esta sesión** (build exit 0 + i18n-check 5185×8):
  1. **Sección "Próximamente App"** en la landing (`components/landing/AppStorePromo.jsx`): badges
     teaser de Google Play / App Store / Microsoft Store (SVG inline) + CTA "Avísame" + nota
     multiplataforma Android/iOS/Windows/macOS/Linux. i18n ×8. (P-19)
  2. **Tipos de mercado interactivos** en Educación → Fundamentos
     (`components/education/MarketTypeDetailModal.jsx` + `data/marketTypeDetails.js`): las tarjetas
     ahora abren un modal con cómo-se-mide + unidades, widget TradingView en vivo por mercado, FAQ
     (inglés, para snippets), ejemplo y accesos a calculadora + módulo profundo. 10 mercados. i18n ×8.
     (P-07/P-08/P-09; parte SEO de P-10 pendiente = JSON-LD en el generador de páginas SEO).

---

### 2026-08-01 (cont.) — Aplicar la investigación del dueño + red estructural de asistente
- 🧠 **Red estructural de Claude Code** (`.claude/`): 5 skills (`auditar-formulas`,
  `revisar-contenido-trading`, `auditar-seo-spa`, `seguridad-pagos`, `consistencia-diseno`),
  4 subagentes (`auditor-formulas`, `crawler-visual`, `revisor-seguridad`, `revisor-i18n-contenido`),
  2 comandos (`/examen-web`, `/pre-deploy`) y `ARQUITECTURA_ASISTENTE.md` (índice que interconecta
  skills/subagentes/comandos/docs/código). Adaptado al stack REAL (shim PostgreSQL, no MongoDB).
- 🧮 **Huecos financieros deterministas implementados y verificados offline:**
  - `options_math.py`: **vanna, charm** (griegas 2º orden, verificadas por diferencias finitas) +
    `calculate_second_order_greeks()` + **`gamma_exposure()` (GEX)** con honestidad (OI sintético→None).
  - `performance_metrics.py` (nuevo, stdlib): **SQN, Calmar, Ulcer, z-score de rachas, VaR
    (paramétrico+histórico), CVaR, MAE/MFE** — todo con regla None-no-0. 15 tests nuevos con valores
    de referencia; cableado aditivo en `compute_analytics` → clave `advanced`; 0 regresiones.
  - **UI:** panel "Métricas de mesa (avanzadas)" en `AnalyticsDashboard.jsx` (SQN/Calmar/Ulcer/
    Z/VaR/CVaR) con "—" honesto. i18n ×8 (5198 claves).
- 📄 **Investigación preservada en el repo:** `docs/ROADMAP_JOURNAL_OPCIONES.md` (journal/opciones:
  métricas + fases + estado) y `docs/AUDITORIA_FINAL_PRELANZAMIENTO.md` (huecos GEX/vol/VaR/vanna/
  funding/roll + checklist de deploy). El reparto free/paid NO se toca (solo estudio).
- 🔴 **Pendiente grande de estos docs** (mapeado, no hecho): panel UI de GEX + vanna/charm en el
  workspace; skew/term-structure/expected-move; funding/basis cripto y roll yield futuros;
  constructor visual de estrategias; journal de opciones multi-pata + import CSV por broker; CSP meta.
- ✅ Verificado: `pytest` 15 nuevos + 38/7-skip sin regresiones; `i18n-check` 5198×8; `npm run build` exit 0.

---

### 2026-08-01 (cont. 2) — Pestaña "Dealers": GEX + vanna/charm en el workspace de opciones
- 🎯 **Los huecos A y D de la auditoría pasan de "motor listo" a producto usable.**
- **Backend:** `_load_options_chain()` (helper compartido; elimina el cuerpo duplicado del endpoint
  de cadena) · `GET /options/gex/{symbol}` (GEX por strike, total, call/put wall) ·
  `POST /calculate/greeks-advanced` (vanna/charm de las patas) · `flatten_chain_for_gex()`.
- **Frontend:** `components/options/DealerPositioning.jsx` + pestaña **Dealers** en `OptionsSubHeader`:
  tiles de GEX total/muros/spot, barras de exposición por strike centradas en el spot, y vanna/charm
  de la estrategia activa. i18n ×8 (21 claves nuevas → 5217 c/u).
- 🐛 **BUG DE HONESTIDAD ENCONTRADO Y CORREGIDO:** la cadena **sintética fabricaba `openInterest` y
  `volume` aleatorios** y el endpoint los devolvía **sin marcar**. (El informe del dueño daba por
  existente un `SyntheticDataBanner` que **no estaba en el código**.) Ahora la respuesta lleva
  `synthetic: true` y **el GEX se niega a calcularse** sobre datos modelados o sin interés abierto
  real → `gex: null` + aviso explícito en la UI, en vez de inventar muros de gamma.
- ✅ Verificado: **144 passed / 74 skipped** (0 regresiones), 8 tests nuevos de GEX/flatten, la app
  importa con **180 rutas**, `i18n-check` 5217×8, `npm run build` exit 0.
- 🔴 Sigue pendiente de estos docs: skew/term-structure/expected-move; funding/basis cripto y roll
  yield futuros; constructor visual de estrategias; journal de opciones multi-pata + import CSV;
  CSP meta; ficha educativa `/learn/gex/`.

---

### 2026-08-27 — La puerta de entrada estaba atascada, y nadie comprobaba al que comprueba

- 🎯 Petición: «una skill para que Claude trabaje rápido y preciso; hay un desorden
  descomunal y la IA se pierde». El diagnóstico no encontró piezas que faltaran —17
  skills, 6 comandos, 4 subagentes y 7 reglas, todos buenos— sino **34 puertas y
  ningún cartel**, y una de ellas atascada.
- 🔴 **ESTADO_PROYECTO.md pesaba 4.290 líneas (327 KB) diciendo que pesaba 300.** Su
  §7 declaraba que las sesiones se habían separado a `REGISTRO_SESIONES.md` el
  2026-08-13 —«eran el 93 % de este documento»—. La separación **copió pero no
  borró**: 108 de sus 115 entradas seguían dentro, duplicadas byte a byte. Cada
  sesión que seguía el flujo documentado («empieza por ESTADO_PROYECTO») se comía la
  historia repetida antes de empezar a trabajar. Ese era el «desorden descomunal».
- ✅ Rescatadas al registro las **8 entradas que sólo vivían allí** (al final: este
  fichero es append-only y la fecha del título manda), borradas las 108 copias.
  Queda en **412 líneas / 45 KB**. Comprobado entrada por entrada contra la versión
  en git antes de borrar: las 116 están íntegras aquí, 0 con el cuerpo alterado.
- 🐛 **Tres fallos de cableado que ningún test podía cazar** porque no rompen nada,
  sólo hacen que la IA se oriente con un mapa falso:
  `ARQUITECTURA_ASISTENTE.md` —el mapa del asistente— listaba **7 de las 17 skills**;
  `rules/infra.md` y `CLAUDE.md` seguían disparando sobre `cloudbuild.yaml`, retirado
  el 2026-08-25 y documentado en `DECISIONES.md`; y los **tres subagentes** decían
  «sigues la skill X» sin tener la herramienta `Skill` ni citar su ruta, así que
  seguían lo que recordaran.
- ✅ **Nuevo: skill `orientarse`**, el router. Ante cualquier petición obliga a
  responder cinco líneas —zona · regla · skill · qué leo · qué puerta la cierra—
  antes de abrir un fichero, con una tabla de enrutado de 22 entradas, la lista de
  **qué NO leer** (el error caro no es leer poco, es leer 300 KB sin contexto útil) y
  los seis invariantes de «no romper nada». El hook de arranque la anuncia.
- ✅ **Nuevo: `scripts/gen-asistente.py`.** Genera el mapa del asistente —ya no se
  escribe a mano— y comprueba seis invariantes de cableado, entre ellas que el router
  enrute **todas** las skills: una skill nueva sin ruta rompe CI. Es lo que impide
  que el router acabe como la tabla que sustituye. `--check` en CI, como `gen-mapa`.
- ✅ Sus **ocho sabotajes** en `probar-verificadores.sh`, uno por comprobación
  (`gen-asistente` corta en el primer fallo: un sabotaje múltiple sólo probaría el
  primero), más el inverso — que la prosa histórica de `docs/` cite una skill
  retirada **no** es cableado roto, y ampliar el radio para «cubrir más» habría
  convertido cada auditoría vieja en un error.
- ✅ Verificado: los 8 sabotajes detectan lo suyo y el árbol queda sin residuo;
  `check-doc-links`, `gen-mapa --check`, `gen-instruments-js --check`,
  `check-rutas-muertas`, `check-precios` y `gen-asistente --check` en verde;
  `py_compile` de los 35 módulos del backend; `ci.yml` sigue siendo YAML válido.
- ⚠️ **No verificado aquí**: `pytest`, `eslint`, `i18n-check` y `npm run build` — este
  sandbox no tiene `backend/.venv` ni `frontend/node_modules`. Ningún cambio toca
  código de la aplicación (sólo `.claude/`, `scripts/`, `docs/` y `ci.yml`), pero eso
  es un argumento, no una ejecución: quien lo retome con entorno debe correr `/verify`.

---

### 2026-08-27 (2) — Tres agentes más, y el activo SEO que nadie comprobaba

- 🎯 Petición: «¿se puede poner una IA para ahorrar tokens, otra que ayude en el SEO
  cuando esté en línea, y que la que propones haga más cosas?». Dos sí y un no.
- 🔴 **El no, por delante: desde el sandbox de Claude Code no hay salida a internet.**
  Comprobado: ni el sitio publicado, ni Google, ni Search Console responden. Cualquier
  «IA que vigile el SEO en vivo» dentro de una sesión sería inventada. Lo que sí puede
  hacerlo es un runner de Actions, y ahí se ha puesto.
- 🔴 **La web tiene 10 idiomas y tres skills seguían diciendo 8** (`auditar-seo-spa`,
  `mejorar-seo`, `revisar-contenido-trading`, más el agente `revisor-i18n-contenido`;
  9 sitios). Una auditoría que las siguiera habría comprobado ocho y dado por buenos
  `pt` e `it` **sin mirarlos**. Corregido, y `gen-asistente.py` gana una séptima
  comprobación que deriva el número real de `i18n-check.js` y falla si alguna pieza
  afirma otro. Excluye los subconjuntos cualificados («los 6 idiomas incompletos»):
  un verificador que grita de más se apaga.
- 🔴 **La lista «mejoras de mayor impacto» de `mejorar-seo` tenía como prioridad nº3 un
  hueco cerrado el 2026-07-11** (G-09, traducciones incompletas). `i18n-check` confirma
  paridad total: 10 locales × 7.290 claves, 0 faltan. Mandaba a hacer trabajo ya hecho.
- ✅ **Nuevo: `frontend/scripts/check-seo.js`.** El `postbuild` genera **1.630 páginas**
  indexables y un sitemap de 1.639 URLs —el mayor activo de captación— y **nada lo
  comprobaba**: ni CI ni script; `auditar-seo-spa` era una lista para leer a mano.
  Verifica canonical auto-referente, hreflang ×10 + x-default, `<html lang>`/`dir`,
  title/description, JSON-LD que parsee y sitemap ↔ ficheros en las dos direcciones.
  Las rutas de aplicación se **leen** del array `MAIN` de `gen-seo-pages.js` en vez de
  copiarse: una exención escrita a mano se pudre igual que cualquier lista.
- ✅ **Nuevo: `check-seo-en-vivo.js` + `.github/workflows/seo-en-vivo.yml`.** Comprueba
  el sitio PUBLICADO tras cada despliegue y una vez por semana. Separa ORIGEN (con qué
  dominio se anuncia) de BASE (de dónde se descarga): sin esa separación sólo podría
  ejecutarse contra producción, es decir, no podría probarse. Se probó sirviendo el
  build en localhost, y sus 5 sabotajes se detectan.
- ✅ **Nuevos subagentes**: `buscador-doc` (responde sobre 1,6 MB de documentación sin
  traerla al contexto principal — el mayor sumidero que quedaba) y `auditor-seo`.
- ✅ `orientarse` gana la tabla de **cuándo delegar** en cada uno de los seis
  subagentes, con el criterio explícito: mucha salida y poca conclusión.
- 🐛 **Dos fallos propios, cazados y corregidos durante la sesión**: metí el paso de
  CI entre `run: npm run build` y su bloque `env:`, con lo que el `CI: false` habría
  pasado a mi paso y el build habría vuelto a romperse con warnings; y mi primer arnés
  de sabotaje del verificador en vivo buscaba un carácter presente en toda salida, así
  que dio ✅ a los cuatro casos sin comprobar ninguno — el fallo exacto que
  `probar-verificadores.sh` existe para impedir. Y el tercero, el peor: el recuento de
  ficheros por regla de `gen-asistente.py` **no era determinista**. Al crear un `.venv`
  local, `backend/**/*.py` pasó de 130 a 8990 y `--check` empezó a fallar solo, con el
  repositorio intacto. Un fichero generado que sale distinto según lo que tengas
  instalado convierte su propio aviso en ruido. Se excluyen `.venv`, `node_modules`,
  `build`, `__pycache__` y `_archive`, y queda un `probar_inverso` permanente que crea
  esas carpetas y exige que el recuento no se mueva.
- ✅ Verificado con entorno completo (esta vez sí había `node_modules`): `py_compile`
  35 módulos · `check-doc-links` · `gen-mapa --check` · `gen-instruments-js --check` ·
  `check-rutas-muertas` · `check-precios` · `gen-asistente --check` · `i18n-check` ·
  `i18n-traducido` · `i18n-escritura` · `engine-check` · `check-fetch-credentials` ·
  `check-edu-index` · `check-seo` sobre 1.630 páginas reales · **eslint 0 errores** ·
  **`pytest` 1097 passed / 72 skipped** en 3m41s. Los 7 sabotajes de `check-seo` y los
  5 de `check-seo-en-vivo` detectan lo suyo, y el árbol queda sin residuo.
- 📌 Queda así cubierto el «no verificado» que dejó anotado la entrada anterior: aquella
  sesión no tenía `node_modules` ni `.venv` y lo dijo; ésta los montó y ejecutó todo.

---

### 2026-08-28 — La mudanza a `tradingcalculator.pro`, hecha entera menos el DNS

- 🎯 Petición: «tengo el dominio, ¿puedo subir ya la página?». La respuesta corta era
  que **ya estaba subida** —`abcde-rgb.github.io/Tradingcalculatorpro.com`— y que lo
  que bloquea no es el dominio sino **cobrar**: las tres pasarelas están 🟢 de código y
  🔴 de operación. Confirmado el dominio propio (`tradingcalculator.pro`), se hace la
  mudanza del repositorio.
- 🔴 **Hallazgo de seguridad: la lista de CORS incluía `https://tradingcalculatorpro.com`
  y su `www` con `allow_credentials=True`.** Ese dominio **no es de este proyecto**:
  resuelve a Cloudflare y lo sirve un tercero. Una página suya podía lanzar peticiones
  autenticadas a esta API con las cookies de sesión del usuario **y leer la respuesta**.
  Llevaba ahí desde que una sesión de junio «unificó» el dominio al revés. Retirado, y
  fijado por `test_the_lookalike_third_party_domain_is_never_allowed`: los dos nombres
  se parecen demasiado como para confiar en que no vuelva a colarse.
- 🔴 **El correo de contacto público estaba en el dominio ajeno**
  (`contact@tradingcalculatorpro.com`, en el pie, en Contacto y en Legal), igual que
  `SENDER_EMAIL` (`alerts@…`). No se podía recibir nada ahí.
- ✅ **44 referencias corregidas** en fuente: `server.py` (CORS, `SENDER_EMAIL`, los 5
  enlaces de los correos), `missing_apis.py`, `admin_routes.py`, los 10 i18n,
  `Footer.jsx`, `ContactPage.jsx`, `LegalPage.jsx`, `EducationPage.jsx`,
  `gen-og-image.js` y los tests.
- ✅ **Origen del sitio mudado**: `frontend/public/CNAME`, `PUBLIC_URL: /` y
  `SITE_ORIGIN` en el workflow, `homepage`, `useSEO.js`, `public/index.html` (20
  literales: canonical, x-default, OG, Twitter y los cinco bloques JSON-LD),
  `robots.txt`, `gen-seo-pages.js`, `gen-sitemap.js`, `check-seo.js` y
  `check-seo-en-vivo.js`.
- ✅ **Passkeys**: el `rp_id` pasa a derivarse de `tradingcalculator.pro`. Documentado en
  `passkeys.py` que **toda passkey registrada contra el origen anterior deja de
  validar** —WebAuthn ata cada credencial a su dominio y no hay migración posible—, y
  que conviene fijar `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` en el despliegue. Sin usuarios
  reales el coste es cero: es la razón de peso para hacer el cutover ahora.
- ✅ El origen anterior (`abcde-rgb.github.io`) **se mantiene** en CORS mientras propaga
  el DNS, con test propio. Quitarlo el mismo día deja sin sesión a quien tenga la
  pestaña abierta, con el síntoma peor posible: 200 en los logs y un login que no entra.
- ✅ Verificado con build real: **1.639 URLs del sitemap en el dominio nuevo, 0 en el
  viejo**; canonical == `<loc>` comprobado en alemán, árabe e italiano; assets desde la
  raíz; `CNAME` en el build; `check-seo.js` en verde sobre las **1.630 páginas**.
  `pytest` **1099 passed / 72 skipped**, `eslint` 0 errores, y toda la batería offline.
  `gen-mapa` regenerado (los números de línea se desplazaron 19 líneas por el comentario
  del CORS).
- 🚨 **Esta rama NO se fusiona hasta que el DNS resuelva.** Con `PUBLIC_URL: /` y el
  `CNAME` puesto, un despliegue anterior al DNS pide todos los assets desde la raíz de
  `github.io`, donde no están: rompería el sitio que hoy funciona. Orden correcto: DNS
  primero, fusión después.
- ⬜ Queda fuera del repositorio: DNS en GoDaddy (A del apex a las cuatro IP de GitHub
  Pages + CNAME de `www`), orígenes de Google OAuth, Search Console, `FRONTEND_URL` y
  `PASSKEY_*` en Cloud Run, y dar de alta `contact@` y `alerts@` en el dominio nuevo.

---

### 2026-08-28 (2) — Cinco informes de otras IA, calificados contra el código

- 🎯 Petición: calificar cinco análisis de distintas IA, resumir qué hay en `main` hoy
  y comprobar la web en vivo.
- 🔴 **`main` tiene el cutover A MEDIAS.** Tres commits sueltos (`f5c79c5`, `4df5507`,
  `aea8a38`) metieron `PUBLIC_URL: /`, el `CNAME` y el `homepage`, pero **no** el CORS,
  ni `DEFAULT_FRONTEND_URL`, ni `useSEO.js`, ni `robots.txt`, ni el canonical. El
  dominio propio **no está en la lista de CORS de `main`**: si eso está desplegado, el
  login sólo funciona si la variable `CORS_ORIGINS` de Cloud Run lo tapa. Es
  exactamente el fallo que los tests de `test_security_unit.py` describen como el peor
  posible: 200 en los logs y un login que no entra.
- ✅ El PR #214 (esta rama) trae la otra mitad, y ya estaba escrita antes de ver los
  informes.
- ✅ **`CUTOVERQUEHACER.md` es el único informe exacto y vigente**, y encontró cuatro
  cosas que a esta rama le faltaban. Cerradas aquí: `packaging/twa-manifest.json`
  (apuntaba a `github.io` y a rutas bajo `/Tradingcalculatorpro.com/`);
  `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` en `.env.example` —y de paso `SENDER_EMAIL`,
  `FRONTEND_URL` y `CORS_ORIGINS` de ese fichero, que seguían en el dominio viejo y se
  me habían escapado—; `frontend/s.tmp.cjs`, un temporal comiteado con una ruta
  absoluta de otra máquina; y la base `/Tradingcalculatorpro.com` de los e2e.
- ✅ La base de los e2e estaba **escrita a mano en seis ficheros** pese a que
  `entorno.js` la exporta: por eso se quedó desfasada en todos a la vez. Ahora sale de
  `process.env.E2E_BASE_PATH ?? ''` en los seis.
- 📊 **Informe de Grok, contrastado dato a dato**: precios 17/45/200/500 € ✅ exacto ·
  6 raíles de pago ✅ · 179 rótulos castellanos ✅ exacto · `/plan` fuera del header ✅ ·
  cadenas sintéticas ✅ · `OnboardingModal` existe ✅ · `GreeksPanel` y `PriceTicker`
  muertos ✅ (0 importadores). Pero **«77 módulos» es falso: hoy son 90**, y
  **`TradingBasicsGuide.jsx` NO es código muerto**: `EducationPage.jsx:1259` lo importa
  y lo renderiza. `WhyItMatters` tampoco: 3 importadores.
- 🔴 **No se pudo comprobar la web en vivo.** Este sandbox no tiene salida a internet:
  `tradingcalculator.pro`, su sitemap y la URL vieja dan «sin acceso». Cualquier
  afirmación sobre si la web responde hoy sería inventada. Para eso está
  `.github/workflows/seo-en-vivo.yml`, que corre con red.
- ✅ Verificado: `py_compile` 35 módulos · 82 tests de seguridad y passkeys ·
  `node --check` de los seis e2e · eslint 0 errores · `check-doc-links`,
  `gen-mapa --check`, `gen-instruments-js --check`, `check-rutas-muertas`,
  `check-precios`, `gen-asistente --check`, `i18n-check`, `engine-check`,
  `check-edu-index` y `check-visuales-idioma`.

---

### 2026-08-29 (2) — Entra el Master Plan de la Academia, reverificado
El propietario aporta `TRADINGCALCULATORPRO_ACADEMY_MASTERPLAN_UNIFICADO.md` (698 líneas,
consolidado de 16 análisis) como dirección de producto de la Academia. Se archiva en
`docs/ACADEMIA_MASTER_PLAN.md`.

- ✅ **Reverificado antes de archivar**, porque el propio documento lo exige en su regla
  de oro y porque la convención del repo manda anotar la contradicción cuando un
  documento discrepa del código. Resultado en su nueva **§0.bis**.
- ✅ **Acierta** en: MAE/MFE implementado (`performance_metrics.py:176`),
  `rule_compliance_rate` y `detect_behavioral_biases` (`performance.py:1032`, `:836`),
  35 módulos backend, 27.019 líneas de Python, 199 rutas, 29 rutas de frontend,
  59 ficheros × 1.015 funciones de test, y las 33 rutas sin consumidor del MAPA.
- ⚠️ **Corregido en §0.bis**: dice 68 módulos de academia (son **91** en `eduIndex.js`),
  «8-10 idiomas» (son **10**, con paridad forzada en CI), 7.290 claves i18n (son
  **7.355**), 14 calculadoras (hay **17**: omite `Breakeven`, `CrossMarginSimulator` y
  `LosingStreak`), y hereda la lista vieja de G-30 con 4 componentes muertos propios
  (quedan **2**: `GreeksPanel` y `PriceTicker`; `TradingBasicsGuide` y `WhyItMatters` ya
  se importan en `EducationPage.jsx:103` y `:104`). `auditar.py --estricto` lo confirma
  por su cuenta: «2 componentes que nadie importa».
- ✅ **G-14 está cerrado a medias, y el documento tenía razón en señalarlo.** El plan de
  trading **sí tiene pantalla** (`TradingPlanPage`, `App.js:64` y `:171`, ruta `/plan`) y
  el backtest también (`BacktestingPage`). Siguen huérfanos `portfolio_risk.py` y
  `american_options.py`: cero menciones en todo `frontend/src`.
- ✅ **Corregida una ficha falsa en `docs/README.md`**: decía de
  `PLAN_DE_TRADING_spec.md` «Backend terminado; sigue sin una sola pantalla (G-14)».
  Es falso desde que se enrutó `TradingPlanPage`. Es el mismo patrón del hueco G-29
  (documentos que dan por abierto lo ya cerrado), esta vez en el índice de la doc.
- ⬜ **No tocado**: `ESTADO_PROYECTO.md` §G-14 y su línea 62 siguen diciendo que los
  cuatro módulos están sin pantalla, y §62 habla de 29 rutas mientras el MAPA dice 33 y
  `check-rutas-muertas.py` dice 27 (miden cosas distintas, pero conviene que lo diga).
  Es una revisión del semáforo, más grande que esta sesión, y no se improvisa.
- ✅ Verificado: `check-doc-links` (105 documentos) · `gen-mapa --check` ·
  `gen-instruments-js --check` · `gen-asistente --check` · `check-rutas-muertas` ·
  `check-precios` · `auditar.py --breve` (lo que corre CI, exit 0). En el bloque E,
  «las afirmaciones comprobables cuadran»: el documento nuevo no descuadra ninguna.
  ⚠️ `auditar.py --estricto` sale **1**, pero sale 1 igual sobre `origin/main` limpio:
  son los dos bloqueantes preexistentes (rastros de tecnología retirada y rutas sin
  consumidor), no algo que traiga este cambio. CI usa `--breve`, que no bloquea.

### 2026-08-31 — SEO para buscadores de IA: robots por grupos, llms.txt y la contradicción del sitemap
Petición: revisar todo el SEO e indexación con el objetivo de ser la referencia
que citan las IAs.

- 🟠 **Hallazgo mayor, mitigado a medias: las 8 rutas de `MAIN` no están
  prerenderizadas.** Los rastreadores de IA no ejecutan JavaScript y `#root`
  llega vacío, así que `/`, `/pricing`, `/about`, `/education`, `/options` y
  `/options/strategies` sólo enseñan lo que haya escrito a mano en el shell.
  Medido sobre `build/index.html`: `#root` tiene **0 caracteres**, y el
  `<body>` entero tenía **449** — un `<noscript>` que nadie contaba como
  contenido. Las 1.640 páginas de `/learn/`, `/tools/`, `/markets/` y
  `/estrategias/` sí están prerenderizadas, con texto real, JSON-LD y los 11
  `hreflang`; el shell sólo lleva `x-default` (los otros diez los inyecta
  `useSEO` en tiempo de ejecución, que es justo lo que el bot no ve).
  ⚠️ **Corrección de una cifra que escribí mal antes en este mismo registro:**
  las rutas de `MAIN` aparecen en el sitemap **8 veces, sólo en español**, no
  80. No hay variante por idioma de ninguna de ellas — a diferencia de todo lo
  generado, que sí tiene las diez. Añadirlas sin prerenderizar sería peor:
  serían 72 URLs sirviendo el mismo shell.
  Consecuencia que sigue en pie: una IA puede citar un módulo suelto de
  `/learn/`, pero tiene muy poco de donde leer qué es TradingCalculator.Pro.
  Prerenderizar esas 8 rutas es la palanca pendiente más grande.
- ✅ **Reescrito el `<noscript>` del shell, que es esa portada.** Estaba escrito
  como un aviso de «activa JavaScript» y no como contenido, con dos
  consecuencias que sí eran bugs: decía **«27 patrones de velas japonesas»**
  cuando el catálogo tiene **30** —la cifra exacta que `engine-check` ya
  perseguía en `educationCenterDesc` y `seoEducationDesc`, en el único sitio
  donde el candado no miraba— y su **primer enlace era `/dashboard`**, que es
  premium y está en `Disallow`. Ahora lleva las cifras de `siteFacts.js`, el
  aviso de riesgo, y enlaces a páginas estáticas reales para que el bot tenga
  por dónde entrar al resto del sitio.
- ✅ **`engine-check` gana 7 comprobaciones sobre ese bloque** (524 → 531): que
  existe y tiene contenido, que sus cinco cifras son las de `siteFacts.js`, y
  que no enlaza ninguna ruta que `robots.txt` prohíba —leyendo las rutas del
  propio `robots.txt`, para que añadir un `Disallow` mañana quede cubierto sin
  tocar nada—. Los tres sabotajes están registrados en `probar-verificadores.sh`
  y medidos uno a uno: con sabotaje `exit=1`, sin él `exit=0`.
- ✅ **Corregida la contradicción sitemap ↔ robots.** `/performance` es premium y
  `robots.txt` la bloquea, pero el sitemap la anunciaba. El arreglo YA estaba
  escrito, con su comentario, en `gen-sitemap.js`… que el build no ejecuta:
  `postbuild` corre **sólo** `gen-seo-pages.js`, y ahí seguía en `MAIN`. Sitemap
  1.649 → 1.648 URLs.
- ✅ **Verificador nuevo en `check-seo.js`**: ninguna URL del sitemap puede estar
  en `Disallow` del grupo `*`. Saboteado y comprobado (exit 1 con sabotaje, 0
  sin él) y registrado en `probar-verificadores.sh`.
- ✅ **Retirado `frontend/public/sitemap.xml`, que era una escopeta cargada.** Un
  segundo sitemap de **8 URLs** con `lastmod` congelado en 2026-08-11, escrito
  por `gen-sitemap.js` —que ya no ejecuta nadie—. CRA copia `public/` dentro de
  `build/` y el `postbuild` lo pisa con el bueno, así que en el flujo normal no
  se notaba; pero **cualquier build que no llegue al postbuild publica ése**, y
  Search Console vería el sitio encoger de 1.648 URLs a 8. `check-seo` falla
  ahora si reaparece. Queda pendiente decidir qué hacer con `gen-sitemap.js`:
  no lo llama ni CI ni `package.json`, y su única salida era ese fichero.
- 🐛 **Y esa escopeta ya se había disparado, dentro del propio
  `probar-verificadores.sh`.** Tres sabotajes recompilan con `npx craco build`
  a secas —el paso de webpack **sin** `postbuild`—, que vacía `build/` y se
  lleva por delante las 1.640 páginas generadas. El bloque de `check-seo` viene
  después, no encontraba ninguna, y **sus diez casos salían como «no pasa ni
  ANTES de sabotear»**: diez sabotajes degradados a avisos que se leen como
  ruido. Los tres recompilan ahora también las páginas. Nota a favor de
  `check-seo`: se negó a pasar en verde sobre cero páginas, que es justo lo que
  hizo visible el problema.
- ✅ **`robots.txt` reescrito por grupos.** Corrige un fallo real de semántica: un
  bot que casa con su propio grupo **ignora el grupo `*` entero**, `Disallow`
  incluidos. `AhrefsBot`, `SemrushBot` y `MJ12bot` tenían sólo `Crawl-delay`, así
  que tenían vía libre a `/admin`, `/dashboard`, `/settings` y `/api`. Ahora cada
  grupo repite la lista de prohibidas.
- ✅ **Política explícita de IA**, separada en dos bloques por si se quiere
  cambiar sólo uno: los que CITAN (OAI-SearchBot, ChatGPT-User, PerplexityBot,
  ClaudeBot, Google-Extended, Applebot-Extended…) y los de ENTRENAMIENTO (GPTBot,
  CCBot, meta-externalagent). Ambos permitidos a propósito. `Bytespider` fuera.
- ✅ **`frontend/public/llms.txt` nuevo**: mapa del sitio para agentes, con las
  cifras de `SITE_FACTS` (que `engine-check` contrasta con el código), qué se
  puede citar, y las tres advertencias de honestidad del proyecto — datos
  sintéticos marcados, lo indefinido no es cero, y que no es asesoramiento.
- ⬜ **No tocado, y es decisión de producto**: `/education` sigue en el sitemap y
  es `premiumOnly`. No es la contradicción dura de `/performance` (robots sí la
  permite), pero un rastreador que la siga se encuentra un muro.
- ✅ Verificado: `i18n-check` · `engine-check` · `check-seo` ·
  `check-enlaces-academia` · `gen-mapa --check` · `check-doc-links` ·
  `gen-asistente --check` · `check-rutas-muertas` · `eslint` 0 errores · build.
## 2026-08-28 — Lo que el banco de pruebas no miraba: un tema entero, un esquema y un `null`

Sesión larga de «arréglalo todo, incluido lo que encuentres». Lo que se arregló
importa menos que **dónde estaba escondido**: cinco de los seis fallos vivían en
un punto ciego de las propias sondas, no en un rincón oscuro del producto.

### Lo que se rompía de verdad

| Qué | Dónde estaba escondido |
|---|---|
| El CSP bloqueaba `wss://`: las alertas en vivo, mudas en producción | `csp.js` recorría `/dashboard` **sin sesión**, y sin token el hook no abre nada |
| Las cifras de P&L a 2,09:1 sobre papel — ilegibles | `accesibilidad.js` medía **un solo tema**: el oscuro, que es el de arranque |
| Tres botones sin nombre accesible y uno inalcanzable con teclado | La sonda medía **cuatro páginas**; Ajustes no era una de ellas |
| Un botón sin nombre **sólo en móvil** (`hidden sm:inline`) | Existe únicamente por debajo del punto de ruptura |
| «nullR» en la R media | La regla de honestidad se aplicó en el productor, no en el consumidor |
| El JWT del WebSocket, escrito en los registros de Cloud Run | Nadie miraba la URL, sólo si conectaba |

Detalle y causa raíz de cada uno en [`DIARIO_BUGS.md`](./DIARIO_BUGS.md),
BUG-025 a BUG-029.

### La causa común de los colores

`#22c55e` resultó ser **exactamente** `--long` del tema oscuro, y `#ef4444`
exactamente `--short`. Los 1.499 colores escritos a mano no eran una paleta
paralela: eran los tokens del sistema congelados en el valor de un tema. Por eso
sustituirlos fue seguro —en oscuro el cambio es imperceptible, 7,61 → 7,54— y
por eso arreglaba el claro de golpe: 2,19 → 4,65.

### Lo que se aprendió sobre las sondas

- **Interceptar la API envejece en silencio.** La ficción de `brokers.js` se
  quedó sin los campos con los que la página compone la advertencia ESMA, y la
  sonda acusó al producto de saltarse una obligación legal que cumple. Ahora
  compara su conjunto de claves con el de la API real — y al estrenar esa
  guarda destapó tres campos más desfasados.
- **Medir prosa sin fijar el idioma es medir el `Accept-Language` de la
  máquina.** Cuatro sondas comparaban castellano contra pantallas en inglés.
- **«Ninguna respuesta 2xx con datos» pasa igual si no se pidió nada.**
  `muro-cliente.js` afirmaba que el servidor niega los datos sin llegar a
  pedirlos: al mentir, el guardia de cliente echa a `/pricing` y la pantalla
  protegida no monta. Ahora se hace la petición y se exige el 403.
- **`\bnull\b` no casa con «nullR».** La comprobación general daba verde
  mientras la específica gritaba, sobre el mismo fallo.
- **`npm install --no-save` sin `package.json` poda lo que no nombres.** La
  guía de accesibilidad mandaba instalar axe-core aparte, y eso dejaba
  `lib/playwright-core` como enlace roto. Ahora `arriba.sh` instala las dos
  juntas.

### Lo que quedó fuera a propósito

- Los colores de **fondo** de paleta (`bg-red-500/15` y compañía, 543 clases) no
  se tocaron: no son un problema de contraste de texto y cambiarlos sería un
  rediseño, no un arreglo.
- Los hexadecimales dentro de comillas (colores de gráficas de Recharts, 
  ~200) tampoco: no son clases de Tailwind y axe no los evalúa como texto.

### Verificado

`accesibilidad.js` 2 temas × 8 páginas, escritorio y móvil: **0 incumplimientos
graves** (eran 53 al ampliar la cobertura, y 77 sólo en `/performance` con el
tema claro). 1.091 tests de backend + 9 nuevos del WebSocket. 433/433 del motor.
`i18n-check` con 6.972 claves y 0 huecos. Catálogo en paridad, mapa regenerado,
enlaces de doc resueltos, 29 rutas muertas todas decididas.

### 2026-08-31 (cont. 4) — BUG-074: el cifrado de secretos fallaba en silencio

Auditoría del panel de admin a petición del dueño ("qué le falta, buen diseño,
ajustes y todo lo demás"). Dos hallazgos grandes de diseño/IA quedaron sólo
reportados (32 secciones en scroll continuo sin navegación, 57 `fetch()` que
disparan al montar la página, 70 colores Tailwind crudos fuera del sistema de
tokens) — el dueño pidió arreglar primero el de seguridad.

- 🔴 **Verificado contra `main` de hoy, no heredado de las ramas ya revisadas**:
  `_encrypt_setting()` cae a texto plano sin loguear nada si falta
  `SECRET_ENCRYPTION_KEY`, y esa variable no está en ningún workflow ni en
  `DEPLOY_CHECKLIST.md` — sólo en `.env.example`, vacía. El panel no daba
  ninguna señal de si una clave de Stripe/SendGrid/PayPal/Google quedaba
  cifrada o no.
- ✅ El otro half del hallazgo (`POST /admin/settings` de `admin_routes.py`
  saltándose el cifrado y comparando contra la máscara `"***"`) **ya no
  aplica**: comprobado que el `PUT /admin/settings` de `server.py` —el que de
  verdad llama `IntegrationsEditor`— ya cifraba bien y rechazaba un valor con
  el carácter de máscara dentro.
- ✅ **Fix**: `cifrado_activo()` junto a `_get_fernet()`, aviso único al
  arrancar si la clave falta, `GET /admin/settings` expone `encryption_active`,
  panel pinta aviso ámbar (`text-warn`/`bg-warn`, tokens del sistema, no un
  color suelto) sin bloquear el guardado. `DEPLOY_CHECKLIST.md` §C ya lista
  la variable. `docs/DIARIO_BUGS.md` → BUG-074.
- ✅ **7 tests nuevos** (`test_secret_encryption_unit.py`): activo/inactivo
  según la variable, clave con forma inválida no cuenta como activa,
  ida-y-vuelta del cifrado, idempotencia de `_decrypt_setting` sobre un valor
  ya en claro, y que `admin_get_settings` de verdad expone el campo.
- ✅ Verificado: pytest 1179 passed / 1 failed (el mismo de siempre, TLS sin
  Postgres local en este sandbox) / 114 skipped · py_compile · build exit 0 ·
  eslint 0 errores · i18n-check 7.366×10 (sin cambios — el aviso va en
  castellano fijo, como el resto del panel admin, que no es superficie
  multi-idioma) · engine-check · gen-mapa --check · check-doc-links.
- ⚠️ **Pendiente y es operativo, no de código**: generar la clave
  (`Fernet.generate_key()`) y ponerla en Cloud Run. Sin eso el aviso ámbar
  sigue apareciendo, que es la señal correcta de que sigue sin cifrar.

### 2026-08-31 (cont. 5) — Panel admin: navegación por secciones + limpieza de colores

Los otros dos hallazgos de la misma auditoría, que en la sesión anterior quedaron
"sólo reportados": las 32 tarjetas del panel en scroll vertical continuo sin
navegación, y ~70 clases Tailwind con color de paleta crudo (`bg-red-500`,
`text-blue-500`…) fuera de los tokens semánticos del sistema de diseño. El dueño
confirmó las dos a la vez: "el cambio de diseño con más impacto" primero, los
tokens "mecánico, se puede hacer a la vez".

- ✅ **Navegación por secciones**: `AdminPage.jsx` agrupa las 32 tarjetas en 7
  secciones (`Resumen`, `Ingresos y pagos`, `Marketing y uso`, `Afiliados`,
  `Sistema`, `Configuración`, `Legal y RGPD`) detrás de un nuevo componente
  `AdminNav` — pestañas horizontales en móvil, columna fija con borde activo en
  escritorio. Sólo la sección activa se monta, así que sus tarjetas (cada una con
  su propio `useAuthedLoad`) sólo piden datos **al abrirse**, no las 57 peticiones
  en paralelo de antes con cada carga de `/admin`. El resumen (filtros + tabla de
  usuarios + audit log) y las métricas de cabecera se quedan siempre visibles, sin
  sección, porque son el primer vistazo que se quiere ver siempre.
- ✅ **Estado en la URL**: `activeSection` vive en `?section=` vía
  `useSearchParams` (no en un `useState` suelto) — un enlace a
  `/admin?section=sistema` abre directamente esa sección, compartible y
  recargable.
- ✅ **Colores**: sustituidas todas las clases de paleta cruda por los tokens
  semánticos ya registrados en `tailwind.config.js`
  (`long`/`short`/`warn`/`caution`/`info`/`compare`) — `green→long`,
  `red→short`, `blue→info`, `amber`/`yellow`→`warn`/`caution` según el uso,
  `purple`/`indigo`→`compare`. Verificado con grep de las clases de paleta
  Tailwind sobre el fichero final: **cero restantes**. Se dejó fuera a
  propósito `PLAN_COLORS` (hexadecimales de las cinco insignias de plan): son
  categóricos, no de estado, y forzarlos a los seis tokens habría perdido
  distinción entre planes en vez de ganarla.
- ✅ **Verificado en navegador de verdad** (no sólo build): stack de QA
  (`tests/e2e/stack/arriba.sh`), cuenta admin sembrada con 2FA real (secreto
  TOTP generado y verificado con `pyotp`, porque el guard de `ProtectedRoute`
  exige `two_factor_enabled === true` para entrar a `/admin` — el dato de
  prueba se revirtió al terminar). Comprobado en escritorio y móvil: las 7
  pestañas cambian de contenido, cada sección lee sus datos al abrirse, el
  aviso ámbar de cifrado (BUG-074) se pinta en `Configuración`, sin
  desbordamiento horizontal y sin errores de consola.
- ✅ Resto de la batería: `eslint` 0 errores (mismos avisos preexistentes) ·
  `npm run build` + postbuild SEO sin cambios · `i18n-check` 7.366×10 sin huecos
  (el panel admin no es superficie multi-idioma) · `engine-check` 535/535 ·
  `gen-mapa --check` y `gen-asistente --check` regenerados · `check-doc-links`
  130 documentos, todo resuelve. No se tocó ningún fichero de backend, así que
  el pytest suite no aplica a este cambio.

### 2026-08-31 (cont. 6) — Cinco patrones de vela más, investigados contra TrendSpider

El dueño pidió comparar el escáner contra TrendSpider (226 patrones: 172 de velas +
54 chartistas, medido con búsqueda web) y, tras verlo, que se documentara CÓMO detecta
TrendSpider lo suyo antes de copiar nada. Metodología pública: pivotes + relaciones
geométricas + volumen — el mismo esqueleto que ya llevaba diseñado y sin construir el
Lote 5 de `DETALLE_TECNICAS_IMPLEMENTACION.md`. El 172 de velas no son 172 formas
distintas: es la suma de cuatro fuentes con nombre propio (el corpus clásico Nison/
Bulkowski, "The Strat" de Rob Smith, variantes de Bulkowski y "Newsome Candles", un
sistema propietario de un tercero).

- ✅ **5 patrones nuevos en `candle_patterns.py`** (30 → **35**), con cifras reales de
  Bulkowski (thepatternsite.com, verificadas hoy, no inventadas): **Belt Hold**
  alcista/bajista (71%/68%, rank 62/63), **In Neck** (53%, rank 17, fiabilidad baja
  y se etiqueta como tal), **Abandoned Baby** alcista/bajista (70%/69%, rank 13/14 —
  versión ESTRICTA de la estrella con doji, exige hueco real a los dos lados, no sólo
  que el cuerpo del doji quede bajo el cierre de la vela anterior).
- 🔍 **Investigados y descartados a propósito**: On Neck, Meeting Lines/Counterattack
  y Stick Sandwich/Homing Pigeon. Bulkowski mide que actúan "casi al azar" o
  **al revés de su nombre de libro** (Stick Sandwich se vende como reversión alcista
  y en la muestra real actúa como continuación bajista el 62% de las veces). Forzarlos
  en una tabla type/behavior/rate alineados habría sido la misma clase de dato
  inventado que prohíbe la Regla 1 de honestidad numérica.
- ✅ **7 tests nuevos** (`test_candle_patterns_unit.py`, 30 → 37 en el fichero):
  positivos, el belt-hold no se confunde con un marubozu, el in-neck exige el hueco
  de verdad, y el abandoned baby exige mecha sin tocar a los dos lados (no basta con
  que el cuerpo del doji quede bajo el cierre, que es lo que ya exigía la estrella
  con doji — si no, sale mal etiquetado como el patrón menos específico).
- ✅ **Frontend**: `candlePatternMeta.js`, `tradingEducationContent.js` (stats +
  entradas bullish/bearish) y `CandlePatternFigure.jsx` (5 ilustraciones SVG nuevas,
  con huecos reales dibujados en los abandoned baby). **100 claves i18n** (Name+Desc
  × 5 patrones × 10 idiomas) insertadas en los diccionarios principales y repartidas
  con `split-i18n-edu.js` — las Desc son de la Academia y se quedaron ahí solas.
- 📌 **G-40**: el hueco grande (~18-20 patrones chartistas geométricos, diseño
  completo en el Lote 5, endpoint y fichero ya nombrados) queda en cola, a petición
  expresa del dueño — es un proyecto de varias horas separado, no algo para colar en
  la misma tanda que las cinco velas.
- ✅ Verificado: pytest **1186 passed / 1 failed** (el mismo de siempre, TLS sin
  Postgres local TCP en este sandbox) / 114 skipped · py_compile · eslint 0 errores ·
  build + postbuild SEO · i18n-check **7.376×10, 0 huecos** · engine-check 535/535 ·
  check-edu-index 91=91 · check-quiz 140/140 · check-i18n-identidad · gen-mapa/
  gen-asistente/gen-instruments-js --check · check-rutas-muertas · check-doc-links.

### 2026-08-31 (cont. 7) — BUG-075: "el correo no funciona ni magic link" — causa doble

El dueño reportó que ni el envío de correos ni el magic link funcionaban, y pidió
revisarlo entero. Dos causas, una de código (arreglada) y una operativa (sigue
pendiente, y ya estaba escrita sin marcar como bloqueante).

- 🔴 **Código — fallo total y silencioso.** `_send_magic_link_email()` y
  `_send_email_verification()` mandan el correo con `httpx` en crudo contra la API
  de SendGrid y **nunca miraban el código de respuesta**. `httpx` no lanza excepción
  por un 4xx/5xx —sólo por fallos de red—, así que un rechazo de SendGrid (clave
  inválida, dominio remitente sin verificar, límite de tasa) no dejaba ni una línea
  en los logs de Cloud Run: el `except` nunca se disparaba porque no había nada que
  capturar. El tercer camino de envío, `_send_email()` (reset de contraseña,
  bienvenida, confirmación de suscripción), usa el SDK oficial y **sí** loguea sus
  fallos — de ahí que "ni magic link" fuera la pista correcta: es justo el camino
  que no dejaba rastro.
- 🟡 **Operativo, no de código, y ya estaba en la documentación sin marcar como
  bloqueante en la práctica**: `MIGRACION_DOMINIO.md` § «Lo que falta» punto 6 y
  `DEPLOY_CHECKLIST.md` §H llevan sin marcar desde el cutover del dominio
  (2026-08-28) — el dominio remitente `alerts@tradingcalculator.pro` no está
  verificado en SendGrid, así que **cualquiera** de los tres caminos de envío se
  rechaza. El punto 2 del mismo documento (`FRONTEND_URL` en el propio servicio de
  Cloud Run, que sobrevive al despliegue) es la otra mitad: si sigue con el dominio
  viejo, aunque el correo llegara, el enlace de dentro apuntaría a la URL antigua.
- ✅ **Fix de código**: ambas funciones ahora comprueban `resp.status_code` y
  loguean el cuerpo de la respuesta de SendGrid en cualquier `>= 300`. No cambia si
  el correo sale o no —eso es operativo—, sólo hace que el fallo real, sea cual sea,
  quede escrito en los logs en vez de desaparecer. **3 tests nuevos**
  (`test_email_send_status_unit.py`): un 403/401 deja rastro, un 202 de éxito no
  genera ruido.
- ⚠️ **Pendiente y es del dueño, no del repo**: verificar el dominio remitente en
  el panel de SendGrid y confirmar `FRONTEND_URL` en el servicio de Cloud Run —
  comandos exactos en `MIGRACION_DOMINIO.md` puntos 2 y 6, ahora también anotado en
  `DEPLOY_CHECKLIST.md` §H con el porqué.
- ✅ Verificado: pytest **1189 passed / 1 failed** (el mismo de siempre, TLS sin
  Postgres local TCP en este sandbox) / 114 skipped, incluidos los 3 tests nuevos ·
  py_compile · gen-mapa/gen-asistente --check · check-doc-links · check-rutas-muertas.

---

### 2026-08-31 — El administrador estaba encerrado: BUG-076, BUG-077 y BUG-078

Petición del dueño: *«hay que arreglar el admin de inmediato»*, revisando lo que
tocaron los PR **#216 en adelante**, más el registro/inicio de sesión, la sospecha
de que exigir el 2FA en el primer acceso deja al admin fuera, y la sesión que se
cierra sola al recargar la pestaña.

**El fallo principal estaba justo donde el dueño dijo**, y era el eslabón que
faltaba de la cadena que empezó en el PR #216:

- **BUG-076 · El admin no tenía salida.** `SettingsPage.jsx` pintaba
  `<TwoFactorCard />` sólo con `auth_provider === 'password'`. La cuenta del
  dueño entra con **Google**: `/admin` → `ProtectedRoute` ve
  `two_factor_enabled === false` → te manda a `/settings` a activar el 2FA → y en
  `/settings` no hay tarjeta de 2FA. Callejón sin salida, sin mensaje. El backend
  nunca puso esa condición (`/auth/2fa/setup|enable|disable` van por
  `require_user`): la restricción vivía sólo en esa línea del frontend.
  El PR #216 (BUG-072) no lo causó pero lo **destapó**: al hacer que
  `two_factor_enabled` viajara en las ocho respuestas, la guarda pasó a saltar
  siempre, y lo que antes era «el panel se pinta y cada llamada da 428» pasó a ser
  «no llegas al panel y no puedes arreglarlo».
- **BUG-077 · La sesión se cerraba sola al recargar, y cerrar sesión no cerraba.**
  Dos fallos opuestos sobre el mismo par de tokens: la rotación de `/auth/refresh`
  mataba el token en el acto (un segundo canje = 401 = sesión cerrada), y
  `silentRefresh` trataba **cualquier** respuesta no-OK como «sesión caducada»,
  incluido el 502 de un arranque en frío de Cloud Run. Y `/auth/logout` revocaba
  el token de acceso pero **no el de refresco**, que dura siete días.
- **BUG-078 · Ocho sabotajes de `probar-verificadores.sh` no saboteaban nada.**
  Encontrado de paso, al ir a añadir los míos.

**Lo que se hizo**

| Cambio | Dónde |
|---|---|
| La tarjeta de 2FA se pinta para **cualquier** cuenta | `SettingsPage.jsx`, `TwoFactorCard.jsx` |
| **Margen de alta de 10 min**, un solo uso, pedido por el dueño | `require_admin` + `_abrir_o_comprobar_margen_2fa` |
| Banda ámbar con cuenta atrás y enlace a Ajustes (10 idiomas) | `AdminPage.jsx`, `lib/i18n/*` |
| `ProtectedRoute` deja de decidir sobre el 2FA de admin (**cierra G-39**) | `ProtectedRoute.jsx` |
| El registro calcula `is_admin` con `ADMIN_EMAILS`, como las otras siete respuestas | `register` |
| Ventana de 30 s para un refresh **recién rotado**, sólo para rotaciones | `_rotado_hace_nada`, `/auth/refresh` |
| `silentRefresh` reintenta y sólo cierra con **401/403** | `lib/store.js` |
| `logout` revoca también el refresh token | `logout` |
| Los ocho heredocs de sabotaje, dedentados | `probar-verificadores.sh` |

**Cómo se decidió el margen de 10 minutos.** Se abre **al usarlo**, no al crear la
cuenta: un admin dado de alta hace seis meses conserva el suyo, y un atacante con
la contraseña sólo lo encuentra intacto si el dueño nunca ha pisado el panel. La
marca (`admin_2fa_grace_started_at`) **no se reescribe jamás** —ni al vencer, ni
al activar y desactivar el 2FA—, así que son diez minutos en toda la vida de la
cuenta. Abrirlo escribe un aviso en el log y una entrada en `admin_audit_log`.
`ADMIN_2FA_GRACE_MINUTES=0` lo apaga entero.

**Cómo se comprobó** — dos backends del mismo Postgres, uno con el código de
`main` y otro con el arreglado, los dos con `ADMIN_2FA_OPTIONAL=false` (2FA
exigido como en producción), sus dos builds servidos, y **la misma sonda** contra
los dos:

```
CÓDIGO ORIGINAL (main)          CÓDIGO ARREGLADO
❌ /admin se abre                ✅  (margen de alta)
❌ el panel se pinta             ✅
❌ Ajustes ofrece ACTIVAR 2FA    ✅  ← el encierro
✅ margen vencido → Ajustes      ✅
✅ el TOTP real activa           ✅
5 fallos                         0 fallos (16 comprobaciones)
```

Y a nivel de API: `is_admin` en el registro `False → True`; primer `/admin/metrics`
sin 2FA `428 → 200`; con la marca envejecida 11 min, `→ 428` y **no se reabre**;
reuso de un refresh recién rotado `401 → 200`; tras `logout`, el refresh seguía
dando **200 en las dos versiones** — eso era BUG-077(b), y ahora da 401.

**El ✅ que no probaba nada.** La primera versión de la sonda buscaba el texto
«dos pasos» en cualquier parte de `/settings`, y **pasaba con el código roto**: el
aviso ámbar de «activa el 2FA» lleva esa frase, así que casaba justo en la
pantalla donde la tarjeta no estaba. Se cambió por el BOTÓN («Activar 2FA»).
Es el modo de fallo que el propio banco de pruebas advierte, y cayó igual.

**Lo que NO se tocó, y hay que decidir fuera del repo**

- **Las cookies de sesión son de tercera parte.** El frontend vive en
  `tradingcalculator.pro` y el backend en `…run.app`: para el navegador son sitios
  distintos, así que `access_token`/`refresh_token` son cookies de terceros.
  Safari las bloquea por defecto (ITP) y Chrome está en ello. Donde estén
  bloqueadas, **cada recarga cierra la sesión** y ningún arreglo de este commit lo
  evita: el token de acceso no se persiste a propósito y el de refresco viaja sólo
  por cookie. Lo que lo cierra de verdad es dar al backend un dominio del mismo
  sitio (`api.tradingcalculator.pro`), que es un cambio de infraestructura.
**G-41, abierto y cerrado en la misma sesión.** Al ir a añadir mis sabotajes
aparecieron ocho que no saboteaban nada (BUG-078). Dedentarlos arregló siete; el
octavo —el del login— seguía diciendo «SOBREVIVE» porque su ancla era un texto
que BUG-070 había sustituido: el `replace` no encontraba nada, escribía el
fichero igual y salía con 0. Esa segunda forma de morir en silencio **no se
habría cazado dedentando**. La causa común es que `probar()` descartaba el código
de salida del sabotaje, así que «el verificador no verifica» y «el sabotaje no
tocó nada» imprimían lo mismo. Ahora un sabotaje que falla se reporta con su
error y cuenta como fallo **del test**, no del producto.

**La batería de sabotajes, entera.** 105 sabotajes detectados, 11 cebos que no
producen falsos positivos, **0 «SOBREVIVE»**. Los 7 avisos de la primera pasada
eran del banco de pruebas, no del producto, y se comprobaron uno por uno:

- **5 (csp ×3, nulos ×2)**: mi `frontend/build` apuntaba al backend de :8090 —el
  estricto que monté para comparar—, y esas sondas esperan el stack estándar de
  :8080. Con el build correcto pasan las tres.
- **2 (peso.js)**: la ruta `precios` se pasaba del presupuesto. **Compilando el
  punto de partida de esta rama (`f5f79b4`) se pasa igual**: 1039 KB > 1038 KB
  ya sin mis commits. El presupuesto se midió el 2026-08-27 y los PR #218 y #219
  entraron después. Mis dos commits suman **1 KB más** (los tres textos del aviso
  de 2FA × 10 idiomas, ~470 bytes en el idioma que se carga, más la lógica de
  `silentRefresh`). Presupuesto rebasado en total: 2 KB, de los que **la mitad no
  es de esta rama**. Re-medido con `--actualizar`, que es lo que el propio
  verificador pide para un aumento deliberado.

**Y otro ancla obsoleta, de la misma familia que BUG-078.** La guarda que decide
si se prueban peso/CSP/nulos preguntaba por `curl -s` a
`http://localhost:3100/Tradingcalculatorpro.com/` — la base de GitHub Pages de
**antes** del cutover del 2026-08-28. Sin `-f`, curl sale 0 también con un 404,
así que la guarda daba por bueno cualquier proceso escuchando en ese puerto. Va
con `-f` y contra la raíz.

**Verificado**: 1.204 tests (114 skip, 0 fallos), `py_compile` de los 26 módulos,
eslint 0 errores, i18n 7.379 claves × 10 idiomas a la par, engine-check 535/535,
catálogo en paridad, mapa y asistente al día, enlaces de doc OK, build de
producción, y la sonda de navegador contra el backend real en sus dos versiones.

## 2026-09-02 — Los indicadores de espera pasan a llevar la marca

Ejecución del artefacto «Cargando con la marca» **excepto su pieza `CargaArco`**,
excluida expresamente por el usuario. Lo demás entra entero.

**El punto de partida.** 85 `<Loader2 className="animate-spin" />` repartidos por
24 ficheros: el círculo genérico que trae shadcn. Es de lo que más veces se mira
en una sesión —cada consulta a la cadena, cada refresco del escáner— y no llevaba
nada del producto. No se ha dibujado ningún logotipo nuevo: se anima el que ya
existe, con las coordenadas exactas de `public/tcpro-icono-512.svg`.

**Una sola copia de la geometría.** `BrandMark.jsx` pasa a exportar `VELAS`,
`Velas`, `Monograma`, `ARCO` y sus *viewBox*; `BrandLoading.jsx` los importa en
vez de repetirlos. Dos copias de un logotipo divergen a la primera corrección, y
aquí la corrección ya llegó una vez (el cutover de dominio del 2026-08-28).

**Las cinco piezas y dónde han caído:**

| Pieza | Dónde |
|---|---|
| `CargaVelas` | 58 sitios: dentro de botones y junto a etiquetas. Sustituye al `Loader2` |
| `CargaMarca` | `PageLoader` de `App.js`, `PaymentPages`, `AuthPages`, `VerifyEmailPage` |
| `CargaProgreso` | disponible; **sin usar a propósito** — ver abajo |
| `CintaCarga` | borde superior de `OptionsSubHeader`: el refresco de fondo de la cadena |
| `EsqueletoVelas` | vía `FilasEsqueleto`, en las 7 tablas de `AdminPage` que cargaban |

**`CargaProgreso` no se ha cableado en ningún sitio, y es la decisión, no un
olvido.** Sólo vale cuando el avance se mide de verdad; hoy ninguna espera de la
web conoce su porcentaje. Fingirlo sería la versión visual de inventarse un dato,
que es justo lo que las reglas de honestidad numérica prohíben con los números.
Queda lista para la primera subida de fichero o backtest por lotes que sí lo mida.

**Dos cosas que NO se han tocado**, ambas a conciencia:

- `PaymentPages.jsx:104`, el `Loader2` del estado `pending`, **no lleva
  `animate-spin`**: es un icono de estado («tu pago se está procesando», con un
  botón para irse), no una espera viva. Animarlo diría que algo ocurre en esa
  pantalla ahora mismo, y no ocurre. Sigue siendo el único `Loader2` del repo.
- Los `RefreshCw` que giran mientras recargan: ahí el icono que da vueltas *es*
  el botón de refrescar, un gesto distinto del «estoy esperando».

**El indicador que empujaba el precio.** En `OptionsSubHeader` el `Loader2` vivía
en la misma fila que la cotización, así que cada refresco metía 20 px y movía la
cifra que el usuario está mirando para dimensionar. Ahora lo anuncia la cinta de
2 px del borde superior, dentro de un envoltorio `h-0` para que al aparecer no
mueva nada.

**Movimiento reducido.** La regla global del proyecto deja toda animación en
0,01 ms; sobre estas velas eso las congelaría a media impresión —dos casi
transparentes— con pinta de adorno roto. Por eso `index.css` les **quita** la
animación en vez de acelerarla, igual que ya se hacía con `.marquesina`. Quien
pide menos movimiento se entera por `role="status"`, no por el movimiento.

**Verificado**: eslint 0 errores (los avisos bajan de 115 a 108 al desaparecer
los `Loader2` sin usar), build de producción + 1.648 URLs de sitemap, i18n 7.404
claves × 10 idiomas sin claves nuevas (`CargaVelas` recibe el texto por prop, no
llama a `t()`), engine-check 535/535, catálogo en paridad, mapa y asistente al
día, enlaces de doc OK, `capturas.js` con las 36 pantallas públicas renderizando
y sin errores de consola nuevos, y las seis piezas renderizadas de verdad con
React + el CSS compilado y fotografiadas en claro y oscuro. Comprobado además que
`tc-arco`/`tcpro-arco` **no aparecen en el CSS compilado**: la sección excluida
no ha entrado por la puerta de atrás.


## 2026-09-03 — Seis paneles de ajustes para elegir uno

`/settings` son 673 líneas y **ocho tarjetas apiladas** en una columna de 672 px, todas
con el mismo peso: la seguridad está partida en tres tarjetas seguidas que no se leen
como un bloque, y la zona de peligro va detrás de «Acciones» con el mismo aspecto. Antes
de rediseñar a ciegas, seis propuestas completas para que el propietario elija:
[`docs/maquetas/panel-cliente.html`](./maquetas/panel-cliente.html) — consola con rail,
cabecera con pestañas, hoja de datos sin tarjetas, panel con estado de la cuenta, cajón
con buscador y rejilla de módulos. Cada una con lo que gana, lo que pierde y lo que
cuesta escrito en la propia página.

**No toca código de producción.** Es un fichero estático en `docs/maquetas/`, con los
tokens reales de `index.css`, las tres familias del producto y las reglas de
`identidad-visual` (un acento, filete de 1 px, dos radios, cero degradados,
`tabular-nums`).

Tres cosas que se anotaron por el camino:

- **Tema e idioma no están en Ajustes** (viven en la cabecera) y la cuenta de la mesa
  tampoco (vive en el dashboard). En las maquetas van marcados `propuesta`: decidir eso
  es aparte de decidir el diseño.
- **El ancla `#v5` dejaba la página desplazada al final** y las capturas salían en
  blanco sin que nada fallara —el mismo modo de fallo que el smoke visual de agosto—. Se
  cambió a `#/v5`, que no coincide con ningún `id` y no provoca salto.
- **`#v1{display:grid}` ganaba por especificidad a `.screen{display:none}`**, así que
  dos maquetas se pintaban a la vez, una encima de otra. Sólo se vio al mirar la captura;
  el fichero cargaba «bien».

La vista móvil del previsualizador usa **container queries**, no media queries: al
estrechar el escenario a 390 px la maqueta reflow-ea de verdad en vez de encogerse.


## 2026-09-03 (2) — El panel de ajustes pasa a ser una consola

Elegida la maqueta 1 de las seis e implementada en `SettingsPage.jsx`. De ocho
tarjetas apiladas en una columna de 672 px a **rail de seis secciones + panel**.

**Lo que cambia para quien usa la web**

- El rail dice el estado sin entrar: punto ámbar en Seguridad si falta el 2FA, el
  plan en Suscripción, el capital en Mesa y riesgo.
- **Cada sección tiene URL** (`/settings?s=seguridad`). `AdminPage` ya manda ahí al
  administrador sin 2FA, en vez de a la página entera para que la busque.
- **Tema e idioma** entran en Ajustes. Viajaban con la cuenta desde agosto pero sólo
  se podían cambiar desde el menú de la cabecera, que es donde nadie los busca.
- **Mesa y riesgo** entra en Ajustes: capital, riesgo por operación (% o dinero) y
  vista de inicio.

**Lo que NO se ha duplicado, y es lo que importa**

- La sección de riesgo escribe en `deskAccount` —la MISMA preferencia de la mesa— y
  calcula con `riskBudget()` de `deskMath.js` —la MISMA función—. El tope duro del
  10 % no se reimplementa: si algún día cambia, cambia en un sitio.
- `PREMIUM_THEMES` sube de `Header.jsx` a `lib/theme.js`. Ya son tres los que la
  consumen (menú de escritorio, de móvil y Ajustes) y la tercera copia no llegó a
  existir.

**Una trampa que el rediseño podía haber colado.** La prueba
`tests/e2e/navegador/admin-2fa.js` busca el botón «Activar 2FA» nada más abrir
`/settings`, y con secciones eso deja de ser cierto: la tarjeta vive en Seguridad.
Al administrador de Google le habría vuelto a pasar lo de BUG-076 —se le exige el
2FA y no se le enseña dónde activarlo—, esta vez por la puerta del rediseño. Se
arregla en los dos lados: `need2fa` abre Seguridad, y la prueba ahora **pulsa en el
rail** en vez de ir por `?s=`, porque lo que hay que probar es que se puede
ENCONTRAR, no que la URL existe.

**Verificado**: `py_compile` de todo el backend, ESLint **0 errores** (y 0 avisos en
los ficheros tocados), `i18n-check` 0 huecos en los 10 idiomas con las 24 claves
nuevas, `engine-check` 535/535, catálogo en paridad, `gen-mapa --check`,
`check-rutas-muertas`, `check-doc-links`, y `npm run build` en verde. Además la
pantalla se ha **renderizado de verdad** desde el build compilado con la sesión
sembrada y la API simulada: perfil, seguridad, mesa, preferencias y datos, en
oscuro y claro, escritorio y 390 px, sin desbordamiento horizontal y sin errores de
consola de la aplicación.

La suite de backend: **1220 passed, 114 skipped, 1 failed**. El fallo es
`test_shim_collection_unit.py::test_verify_full_rechaza_un_nombre_que_no_casa`, y
**no es de este cambio** —el diff no toca un solo fichero de `backend/`—: pide un
PostgreSQL en `127.0.0.1:5432` y aquí no lo hay, así que devuelve
`ConnectionRefusedError`. Su guarda de *skip* sólo contempla
`InvalidPasswordError`/`InvalidAuthorizationSpecificationError`, no «conexión
rechazada», de modo que en un entorno sin Postgres **falla en vez de saltarse**. Es
un hueco de la prueba, no del código; queda anotado sin tocarlo, porque arreglar
una guarda de test dentro de un rediseño de interfaz es justo cómo se cuelan los
cambios que nadie revisa.

**Lo que NO se ha podido probar aquí**: el banco E2E con backend vivo. Sin
PostgreSQL, `admin-2fa.js` —incluida la comprobación nueva del rail— no se ha
ejecutado. Hay que correrlo con el skill `qa` antes de fiarse de él.
