# Rediseño, paridad funcional y reestructuración — 2026-08-02

> **Encargo.** Estudiar `options-strategies.com/es` a fondo, rediseñar
> TradingCalculator.Pro para que **no se parezca a esa web** pero tenga **las
> mismas calculadoras y funciones**, detectar **lo que falta, lo que no se
> entiende y lo que no está en `main` o está sin mergear**, y estudiar la
> **reestructuración del repositorio**.
>
> Documento fechado: es una foto del 2026-08-02, no se actualiza (ver
> convenciones de [`README.md`](./README.md)). El estado vivo sigue en
> [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md).

---

## 0. Resumen en una página

**El motor ya está por encima de la referencia.** Lo he comprobado endpoint a
endpoint y fichero a fichero: 66 estrategias con patas multi-vencimiento,
griegas de segundo orden, POP, IV rank, superficie de IV, max pain / GEX /
term structure, opciones americanas, riesgo de asignación, atribución de PnL,
backtest con walk-forward, plan de trading versionado, journal, academia y 10
idiomas. La referencia, por lo que se puede establecer, tiene un calculador
de payoff, un finder y artículos.

**Lo que falta no son matemáticas: es superficie, puerta de entrada y
comprensión.**

| # | Diagnóstico | Severidad |
|---|---|:--:|
| 1 | **Un fix verificado del beneficio/pérdida máxima está sin mergear.** `main` sigue diciendo que una call vendida desnuda tiene pérdida máxima finita | 🔴 |
| 2 | **Superficie pública = 0.** Las 1.589 URLs son anzuelo y sus enlaces profundos apuntan a rutas premium. La referencia es gratis y sin registro | 🔴 estratégico |
| 3 | **No hay puerta de entrada por intención.** El optimizador existe (`/optimize`) pero está enterrado en el workspace; la referencia lo pone de portada | 🟠 |
| 4 | **Las 14 calculadoras no tienen URL propia.** Viven en pestañas de `/dashboard` | 🟠 |
| 5 | **5 PRs de producto abiertos + 7 ramas con trabajo sin PR** | 🟠 |
| 6 | **El diseño actual es el estándar del sector** (oscuro + verde neón + orbes difuminados): parecerse o no a la referencia no se resuelve cambiando colores, sino cambiando de categoría visual | 🟡 |

**Las dos decisiones que gobiernan todo lo demás** están en la [§10](#10-las-dos-decisiones-que-tienes-que-tomar). Ninguna es técnica.

---

## 1. Método, y su límite (léelo antes de fiarte de la §2)

**No he podido abrir `options-strategies.com`.** La política de salida de red de
este entorno la bloquea:

```
"recentRelayFailures": [{
  "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "options-strategies.com:443"
}]
```

Falló igual por `WebFetch` y por `curl`. La política dice explícitamente que no
se debe rodear un bloqueo, así que **no lo he rodeado**: lo reporto.

**Lo que sí he podido establecer** viene del índice de búsqueda: URLs reales,
títulos, meta-descripciones y fragmentos de texto de la propia web. Eso da la
arquitectura de información, el modelo de negocio y las capacidades que la web
declara de sí misma. Es bastante — pero es texto, no píxeles.

**Consecuencia honesta:** *"que no se parezca"* no lo puedo verificar
visualmente. No he visto ni un color ni una tipografía suya. Por eso la §7 **no
es "aléjate de su diseño"** (no sabría de qué alejarme), sino **"ten un diseño
propio y defendible"**, construido sobre tu marca y sobre una idea que la
categoría entera no está usando. Si quieres verificación visual real, hay dos
caminos:

1. Pedir que `options-strategies.com` entre en la lista de dominios permitidos
   del entorno remoto, y repito el análisis con capturas.
2. Pegarme 4-5 capturas (portada, una ficha de estrategia, el finder, el móvil)
   y hago el contraste visual pieza a pieza.

---

## 2. La referencia, según lo que sí se puede establecer

**Marca:** el sitio se presenta como **OptionProfit** en `options-strategies.com`
(el `<title>` de todas las páginas indexadas termina en `| OptionProfit`).
Multi-idioma con prefijo (`/es`). Hay además un sitio antiguo colgando
(`www.options-strategies.com/optionspreadstrategies`), lo que sugiere un dominio
reutilizado sobre uno viejo de SEO.

**Arquitectura de información (URLs confirmadas):**

| Patrón | Ejemplo confirmado | Qué es |
|---|---|---|
| `/option-finder` | `/option-finder` | Buscador de estrategia por intención |
| `/strategies/:slug` | `/strategies/double-calendar` | Calculadora + ficha por estrategia |
| `/learn/:slug` | `/learn/call-vs-put`, `/learn/what-is-a-turbo` | Artículo educativo por concepto |
| `/es`, … | `/es` | Traducción con prefijo de idioma |

**Modelo de negocio, en sus palabras:** «el option finder, la calculadora, el
scanner y todas las páginas de estrategia son gratis e ilimitados, sin registro
ni cuenta». Eso es lo más importante de todo este documento: **su producto entero
es la superficie pública.**

**Capacidades que declara:**

- Motor Black-Scholes que valora cada candidata.
- Gráfico de payoff, griegas y **simulación Monte Carlo** por estrategia.
- **POP estimada desde la IV**, beneficio y pérdida máximos, break-evens,
  ratio riesgo/recompensa y **capital requerido**.
- El *finder* toma una visión (dirección, precio objetivo o rango), **genera
  candidatas sobre la cadena viva** (calls/puts, verticales, iron condors,
  covered calls, cash-secured puts…), las valora y **las puntúa y ordena
  favoreciendo las de riesgo definido**.
- Un *scanner* (mencionado, sin URL indexada que haya podido ver).

**Señal de público:** un artículo de `/learn` sobre **turbos** (nivel de
financiación, knock-out, apalancamiento) apunta a retail europeo, no
estadounidense. Coincide con tu mercado.

**Lo que NO puedo afirmar** y por tanto no aparece en las comparaciones: su
diseño, su paleta, si tiene planes de pago o publicidad, cuántas estrategias
soporta realmente, cuántas URLs tiene, ni si el *scanner* funciona con datos
vivos o modelados.

---

## 3. Paridad funcional: la matriz

Verificado contra el código, no contra la documentación.

| Capacidad | Referencia | TradingCalculator.Pro | Dónde está |
|---|:--:|:--:|---|
| Payoff multi-pata | ✅ | ✅ **66 estrategias** | `mockData.js:232` (66 ids), `blackScholes.js` |
| Patas con vencimientos distintos | ❓ | ✅ | `expIdx` por pata; `/options/chain/{s}?expiration_idxs=` |
| Griegas primarias | ✅ | ✅ | `GreeksStrip.jsx`, `options_math.py` |
| Vanna / charm / vomma | ❌ | ✅ | `GreeksPanel.jsx` (GEX por strike: **PR #163, sin mergear**) |
| POP desde IV | ✅ | ✅ | `blackScholes.js:348 probabilityOfProfit()` |
| Max profit / max loss / break-evens | ✅ | ⚠️ **roto en `main`** | `strategyStats.js:116` — ver §6.1 |
| R/R y capital requerido | ✅ | ✅ | `computeStrategyStats()` |
| Monte Carlo | ✅ (sobre la estrategia) | ⚠️ (sobre el **sistema**) | `MonteCarloSimulator.jsx`, `POST /monte-carlo` |
| Buscador de estrategia por intención | ✅ (portada) | ⚠️ (enterrado) | `POST /optimize`, `OptimizeView.jsx` |
| Cadena de opciones viva | ✅ | ✅ + marcado de datos modelados | `GET /options/chain/{symbol}`, `SyntheticDataBanner` |
| IV rank / percentil | ❓ | ✅ | `GET /options/iv-rank/{symbol}` |
| Superficie de IV | ❓ | ✅ | `GET /options/iv-surface/{symbol}`, `IVSurfaceView.jsx` |
| Max pain / GEX / perfil OI / put-call | ❓ | ✅ | `options_positioning.py`, `/options/positioning/{s}` |
| Term structure de IV + expected move | ❓ | ✅ | `/options/term-structure/{symbol}` |
| Actividad inusual / flujo | ❓ | ✅ | `/options/unusual/{s}`, `/options/market-flow` |
| Earnings | ❓ | ✅ | `/options/earnings/{symbol}`, `EarningsBanner.jsx` |
| Opciones americanas (CRR + BAW) | ❌ | ✅ | `american_options.py`, `/calculate/american` |
| Riesgo de asignación temprana | ❌ | ✅ | `/calculate/assignment` |
| Atribución de PnL (delta/vega/theta) | ❌ | ✅ | `/calculate/pnl-attribution` |
| Roll de posición | ❌ | ✅ | `RollCalculator.jsx` |
| Kelly | ❌ | ✅ | `KellyPanel.jsx` |
| Coach con IA | ❌ | ✅ | `/options/ai-analyze` (Anthropic) |
| Posiciones guardadas + griegas de cartera | ❌ | ✅ | `/options/positions*` |
| Tipo libre de riesgo en vivo | ❓ | ✅ con procedencia | `market_rates.py`, `/market/risk-free` |
| **14 calculadoras no-opciones** | ❌ | ✅ | `components/calculators/` |
| Journal + analítica + sesgos | ❌ | ✅ | `performance.py`, `/performance/*` |
| Plan de trading versionado | ❌ | ✅ | `trading_plan.py` |
| Riesgo de cartera (heat, correlación) | ❌ | ✅ | `portfolio_risk.py` |
| Backtest con walk-forward y data snooping | ❌ | ✅ | `backtest.py` |
| Escáner de estructura y de velas | ❌ | ✅ | `price_action.py`, `candle_patterns.py` |
| Gráfico TradingView | ❌ | ✅ | `TradingViewChart.jsx` |
| Academia | parcial (`/learn`) | ✅ 63+ módulos | `tradingEducationContent.js` |
| Idiomas | varios | ✅ **10, 5.650 claves, 0 huecos** | `lib/i18n/` |
| **Gratis y sin registro** | ✅ | ❌ **todo tras el muro** | `App.js` — todas `premiumOnly` |

**Lectura:** hay **tres** casillas donde la referencia gana, y sólo una es
técnica (Monte Carlo sobre la posición de opciones). Las otras dos son de
producto: **el finder como puerta** y **el acceso libre**.

---

## 4. Los cinco huecos reales

### G-A · La superficie pública es cero (🔴 estratégico)

El 2026-08-02 se cerró todo tras el muro y las 1.589 páginas estáticas se
recortaron a «título + primer párrafo + llamada a la prueba». Consecuencias
medibles:

- **Los enlaces profundos de las páginas estáticas mueren en el muro.** Las 12
  fichas de calculadora enlazan a `/dashboard?tab=<tab>`
  (`gen-seo-pages.js:70-105`) y `/dashboard` es `premiumOnly` (`App.js:126`).
  Quien llega desde Google a «calculadora de tamaño de posición» hace clic en
  la calculadora y aterriza en el registro.
- **El catálogo de estrategias, que estaba pensado para ser público, ya no lo
  es.** Las rutas `/options`, `/options/strategies` y `/options/strategies/:slug`
  eran la superficie indexable de la fase 1-3 del 2026-07-31; hoy son
  `premiumOnly` (`App.js:135-138`). `CLAUDE.md` todavía documenta lo contrario:
  «`/options` es público; el workspace es `/options/calculator`». **La trampa
  documentada ya no describe el código.**
- **Google indexa 1.589 URLs cuyo contenido visible es un párrafo.** Eso no es
  neutro: es un perfil de «thin content» a escala de sitio.

No estoy pidiendo revertir la decisión — es tuya y es legítima (ver §10.1). Estoy
poniendo el precio encima de la mesa: **con superficie cero no se compite en el
mismo terreno que una web gratis y sin registro, por bueno que sea el motor.**

### G-B · No hay puerta de entrada por intención (🟠)

Tienes `POST /optimize` y `OptimizeView.jsx`: dada una visión, genera y puntúa
estrategias. Es exactamente lo que la referencia pone de portada como
`/option-finder`. En tu web es una vista dentro del workspace premium, sin URL
propia, sin nombre reconocible y sin explicación de qué hace.

**Un motor mejor con peor puerta pierde.** El usuario no llega diciendo «quiero
un iron condor»: llega diciendo «creo que Apple va a lateralizar».

### G-C · Las 14 calculadoras no existen como páginas (🟠)

Viven en pestañas de `/dashboard` (`DashboardPage.jsx:372-411`). Eso significa:

- **No se pueden enlazar** (ni desde fuera, ni entre ellas, ni desde la academia).
- **No se pueden compartir** («mira mi cálculo»).
- **No se pueden indexar**: las 12 páginas estáticas son un sustituto que no
  calcula nada.
- **No se pueden abrir dos a la vez** en pestañas del navegador.
- Y 14 pestañas en una fila no caben en un móvil: el usuario descubre las
  calculadoras deslizando una barra.

### G-D · No hay ficha pública por concepto (🟠)

La referencia tiene `/learn/call-vs-put` y `/learn/what-is-a-turbo`: una URL por
concepto, autocontenida, enlazable. Tú tienes 63 módulos de academia de mucha más
profundidad **dentro de una sola página** (`EducationPage.jsx`, 5.369 líneas) y
tras el muro. El postbuild genera 700 páginas de educación, pero recortadas al
primer párrafo desde el 2026-08-02.

Ya está identificado en `ESTADO_PROYECTO.md` como lo que «NO entra»:
`/options/glossary/:slug` y `/options/learn/:slug` necesitan «un índice con slug
del contenido de `tradingEducationContent.js`». Sigue pendiente.

### G-E · Monte Carlo no se aplica a la posición de opciones (🟡)

`MonteCarloSimulator.jsx` y `POST /monte-carlo` simulan **tu sistema de trading**
(secuencia de operaciones, riesgo de ruina). La referencia simula **la
estrategia de opciones** (distribución del precio a vencimiento → distribución
del PnL de la posición). Son cosas distintas y las dos son útiles; te falta la
segunda. Tienes todas las piezas: `probabilityOfProfit`, la superficie de IV y el
expected move.

---

## 5. Lo que no se entiende (auditoría de comprensión)

Todo lo de aquí es comprobable en el código, con fichero y línea.

| # | Qué no se entiende | Dónde | Por qué confunde |
|---|---|---|---|
| 1 | **La navegación miente.** `/options`, `/performance`, `/news` y `/education` están en el menú con `requireAuth: false`, pero sus rutas son `premiumOnly` | `Header.jsx:33-38` vs `App.js:126-140` | El menú invita a 4 secciones y las 4 son callejones sin salida. Es el peor patrón de conversión posible: promete y frustra en el mismo clic |
| 2 | **14 pestañas en una fila** para las calculadoras | `DashboardPage.jsx:372-411` | Sin agrupación ni jerarquía: «Porcentaje», «Fibonacci», «Monte Carlo» y «Futuros» pesan lo mismo. En móvil hay que deslizar para descubrirlas |
| 3 | **Cuatro cosas que suenan igual**: «Simulador Pro», «Simulador de trading», «Monte Carlo» e «Interés compuesto» | `components/calculators/` | Ya hubo que corregir que el simulador de interés compuesto se llamara «Estilos comparados de un vistazo» (rama `trading-web-analysis`, sin mergear). El problema de fondo —cuatro simuladores sin taxonomía— sigue |
| 4 | **La web dice de sí misma cosas que ya no son verdad** | `CLAUDE.md` («`/options` es público»), `Footer.jsx:112` (enlaza «Academia de opciones» a `/options`) | Quien lee la doc para trabajar, trabaja sobre un mapa viejo |
| 5 | **El workspace de opciones tiene 3 niveles de anidamiento** y el acordeón `SecondaryPanels` guarda cosas de importancia muy distinta | `CalculatorPage.jsx`, `SecondaryPanels.jsx` | La jerarquía de 2026-07-30 es correcta, pero «accesorio» se ha convertido en el cajón de todo: Kelly, comparador, salidas, posiciones guardadas y avanzado comparten cajón |
| 6 | **Los números no llevan procedencia**, salvo el tipo libre de riesgo | Toda la UI de opciones | El backend distingue con rigor entre observado, modelado e indefinido (`synthetic`, `None`), y la UI lo colapsa casi todo a «un número en una tarjeta». La honestidad está en el backend y se pierde en la pantalla |
| 7 | **`/news` es una maqueta con filas de relleno** y está tras el muro | `NewsPage.jsx`, documentado en `ESTADO_PROYECTO.md` | Antes no se anunciaba encima por honestidad. Ahora se cobra por ello. Es la peor combinación de las dos |
| 8 | **10 combinaciones de tema** (claro/oscuro × 4 temas premium) con un fallo de contraste conocido | `Header.jsx:136-139`, `index.css` | El fix está en el PR #161, sin mergear |
| 9 | **`/affiliate` es visible sin plan y el backend lo rechaza** | `App.js:142`, `_is_paying_member` | Ya está anotado como «pendiente de decidir». Sigue pendiente |
| 10 | **Dos definiciones de `.font-unbounded`** (gana `App.css` por orden de import) y **`Inter` se descarga y no se usa en ningún sitio** | `App.css:21`, `index.css:24`, `index.html:141` | 4 familias tipográficas pedidas a Google Fonts para usar 3. La identidad tipográfica depende del orden de los imports |

---

## 6. Lo que no está en `main` o está sin mergear

### 6.1 🔴 El fix que hay que integrar hoy

**Commit `ba8b09ed`, huérfano en `claude/google-ads-monetization-nd9l81`.**
El PR #167 se mergeó **sin él**. Verificado: `payoffBounds` y `payoff_bounds` no
existen en `main`, y `main` sigue con el umbral de la rejilla:

```js
// origin/main:frontend/src/utils/strategyStats.js
const MAX_UNLIMITED = 5_000_000;             // línea 9
isMaxProfitUnlimited: maxProfitNet > MAX_UNLIMITED,   // línea 116
```

Lo reportaste tú mismo: «beneficio máximo ponía un número fijo donde en algunos
casos es ilimitado». Los tres sitios que calculaban los extremos hacían
`max()`/`min()` sobre una rejilla de ±30-35% alrededor del spot y comparaban con
5.000.000. **Con spot 100, el máximo de esa rejilla es ~3.300: el umbral no se
cruzaba nunca.** Es decir, la bandera de riesgo ilimitado que ya existe en la
interfaz **no se ha activado jamás**.

Tres consecuencias, y la segunda es la grave:

1. Una call comprada o un straddle comprado enseñan beneficio máximo finito.
2. **Una call vendida desnuda o un ratio 1×2 enseñan pérdida máxima finita.**
   Invita a dimensionar la posición contra algo que no es el peor caso.
3. Lo acotado pero fuera de la ventana sale **mal**, no recortado: una put
   comprada K=100 vale como mucho 9.800 y la rejilla devuelve 3.300.

El fix ya está escrito y verificado (11 tests nuevos, 452 pasando, paridad
exacta JS↔Python sobre 8 estructuras, ESLint 0, i18n 10/10, engine 60/60):
decide lo acotado por la **estructura de las patas** (pendiente del payoff cuando
S→∞) y evalúa el extremo finito en S=0 y en cada strike, que son los únicos
vértices de una función lineal a trozos. Lo no acotado viaja como `null`, y ROI,
R/R y Kelly quedan indefinidos en vez de convertirse en `0` — antes
`SecondaryPanels` hacía `parseFloat(stats.maxProfit) || 0` y concluía «sin edge
estadístico, evita el trade» **justo en las estrategias de beneficio ilimitado**.

**Esto encaja exactamente con la regla nº 2 de honestidad numérica de
`CLAUDE.md`** («lo que no se puede calcular es `None`, no `0`») y hoy `main` la
incumple. Es el primer commit que hay que rescatar, antes que cualquier rediseño.

### 6.2 PRs de producto abiertos (5)

| PR | Rama | Qué trae | Valor | Riesgo |
|:--:|---|---|:--:|---|
| **#163** | `opciones-vanna-charm-metricas` | Pestaña **Dealers** (GEX por strike + vanna/charm), métricas profesionales del journal (SQN, Calmar, Ulcer, Z-score, VaR/CVaR), tipos de mercado interactivos, sección «Próximamente App» | 🟢 alto | 34 ficheros, +2.233 líneas. Base en `c9b928c`: rebase obligatorio |
| **#162** | `escaneres-datos-honestos` | Ratio put/call sin OI y detecciones provisionales — **honestidad de datos** | 🟢 alto | 16 ficheros. Duplica `scanner-data-review` |
| **#161** | `temas-contraste-wcag` | Atmósfera por tema, **contraste WCAG verificado en CI**, escáner que se viste del activo | 🟢 alto | 14 ficheros. Duplica `trading-web-analysis-ktsvkd`. Choca con el rediseño de la §7: **mergéalo antes de rediseñar, no después** |
| **#165** | `acceso-comp` | Correos con acceso libre (comp) premium sin pasar por Stripe | 🟡 útil | 4 ficheros, 43 líneas. Trivial |
| **#164** | `lucide-v1-linkedin` | `lucide-react` 0.507 → 1.27 con el icono de LinkedIn a mano | 🟡 | Salto de major en la librería de iconos de toda la UI. **Verificar visualmente antes** |

### 6.3 Trabajo sin PR, en ramas vivas

| Rama | Commits fuera de `main` | Contenido | Qué hacer |
|---|:--:|---|---|
| `trading-web-full-audit-xmcxz9` | 10 | **Superconjunto de #163** (+ auditoría integral, red de skills/subagentes) | Elegir uno de los dos; no mergear ambos |
| `competitive-feature-analysis-8mzm3p` | 10 | País e idioma en el registro (también con Google) y visibles en Admin · Simulador Pro: Monte Carlo a largo plazo, **fix de max drawdown (running peak)**, config flexible · `purchase` de GA4 con dedupe · estudio de costes | 🟢 **Rescatar.** El fix de drawdown es un bug de correctitud del mismo tipo que §6.1 |
| `affiliate-payment-system-nda23v` | 4 | Parametriza CI/CD para migrar de cuenta GCP y **borra 996 líneas de configuración de Google Cloud** | ⚠️ **No mergear sin decidir la migración.** Es destructivo si te quedas donde estás |
| `scanner-data-review` | 2 | Idéntico a #162 | Cerrar como duplicado |
| `trading-web-analysis-ktsvkd` | 3 | Idéntico a #161 | Cerrar como duplicado |
| `hyperliquid-referido-main` | 1 | Hyperliquid junto a Margex (logo placeholder, URL provisional) | Mergear cuando haya logo y URL definitivos |
| `google-ads-monetization-nd9l81` | 1 | **§6.1** | 🔴 Rescatar ya |

### 6.4 Ruido

- **13 PRs de Dependabot** abiertos (#100-104 de CI, #143-152 de deps). Los de
  `actions/*` y `google-github-actions/*` son de bajo riesgo y llevan 3 semanas.
- **11 ramas con 226-330 commits fuera de `main`** (`sleepy-gates-aLl49`,
  `cool-lamport-84maf2`, `bold-cerf-TgsG3`, `peaceful-hypatia-cVKsd`,
  `charming-planck-7qQ7g`, `magical-wozniak-LfxzM`, `festive-heisenberg-Y5P92`,
  `peaceful-newton-0pfNz`, `sleepy-gauss-IIG5X`, `web-analysis`,
  `v0/tradingcalculatorpro-2419-3578e468`). Son de mayo-junio: su contenido llegó
  a `main` por otros caminos y lo que queda son forks divergentes. **Borrar.**
- 3 ramas de academia (`academia-fase2/3/4`) y varias más sin actividad reciente.

**Total: 48 ramas remotas para un repo de un solo desarrollador.**

### 6.5 El diario y el plan de trading: qué está hecho de verdad

Verificado fichero a fichero en `main` y en las ramas, porque la pregunta
«¿el journal está hecho?» tiene tres respuestas distintas según de qué pieza se
hable.

**✅ Hecho y en `main` — el diario bueno.** `PerformancePage` monta
`TradeJournal.jsx` sobre `POST/GET/PUT/DELETE /performance/trades` (colección
`db.trades`, `server.py:6376`):

- CRUD completo, alta masiva (`/performance/trades/bulk`), import/export CSV
  (`TradeImportExport.jsx`) e importador guiado (`TradeImportWizard.jsx`).
- **Operaciones de opciones**: `instrument_type: 'option'` con `option_type`,
  `strike` y `expiry` (`TradeFormModal.jsx:59-116`).
- `AnalyticsDashboard.jsx` (540 líneas) pinta curva de equity, **calendario de
  PnL**, distribución de R, **MAE/MFE** con sugerencia de stop, **sesgos de
  comportamiento**, insights automáticos y KPIs: expectancy, profit factor,
  Sharpe por operación, max drawdown, rachas, errores detectados y tasa de
  cumplimiento.
- El backend enriquece cada operación al crearla y **ya pasa el plan** a
  `detect_errors` (`server.py:6358, 6373, 6405, 6439`).

**⚠️ Hecho dos veces — y una de las dos no lleva a ninguna parte.** El
dashboard monta **otro** diario distinto:

| | Diario del **dashboard** | Diario de **rendimiento** |
|---|---|---|
| Componente | `components/tools/TradingJournal.jsx` (`DashboardPage.jsx:445`) | `components/performance/TradeJournal.jsx` |
| Dónde guarda | `localStorage['trading-journal-storage']` (Zustand `persist`) | `db.trades`, en el servidor |
| Toca la red | **No.** Cero `fetch`/`axios` en el fichero | Sí, `performanceApi.js` |
| Alimenta la analítica | **No** | Sí |
| Sobrevive a cambiar de dispositivo | **No** | Sí |

Y en la **misma página**, `DashboardPage.jsx:276` monta `<JournalStats />`, que
lee `GET /api/journal/stats` → `db.trades`. Es decir: **la tarjeta de
estadísticas del dashboard enseña las cifras del diario de rendimiento, mientras
el diario que hay justo debajo escribe en el navegador.** Quien apunte una
operación ahí verá que las estadísticas de arriba no se mueven, y perderá lo
apuntado al cambiar de equipo o limpiar el navegador.

Detalle relacionado: los cuatro endpoints `POST/GET/PUT/DELETE /journal/trades`
existen en el backend y **ningún fichero del frontend los llama** en ninguna
rama. De la familia `/journal/*` sólo se usa `/journal/stats`
(`JournalStats.jsx:20`, `ExpectancyCalculator.jsx:67`).

**🌿 Hecho, pero sólo en una rama — las métricas de mesa.** `main` **no** tiene
SQN, Calmar, Ulcer, Z-score de rachas ni VaR/CVaR (`grep` en `performance.py`:
0 apariciones). Están en `claude/opciones-vanna-charm-metricas` (**PR #163**) y
en su superconjunto `trading-web-full-audit-xmcxz9`:

- `backend/performance_metrics.py`, módulo nuevo de 195 líneas con
  `sqn`, `calmar`, `ulcer_index`, `streak_zscore`,
  `value_at_risk_parametric`, `value_at_risk_historical`, `conditional_var`
  y `mae_mfe_stats`.
- `backend/tests/test_advanced_metrics_unit.py`.
- Se cuelga de `compute_analytics` como bloque `"advanced"` y son 24 líneas en
  `performance.py` + 41 en `AnalyticsDashboard.jsx`. **65 líneas de integración
  para 195 de motor ya escrito y probado.**
- Respeta la regla de honestidad: Calmar se queda en `None` porque no hay
  retornos fechados fiables, y los R se toman sólo de operaciones con R
  definido — nunca se fabrica un 0-R para una operación sin stop.

**❌ No está hecho en ninguna rama — la interfaz del plan de trading.** Esto es
lo más importante de esta sección:

- El backend está **completo**: `trading_plan.py`, tabla `trading_plans`,
  versionado con `change_reason` obligatorio desde la v2, sellado de
  `plan_version` por operación, 5 reglas nuevas en `detect_errors` y las cinco
  rutas `GET/POST /plan`, `/plan/history`, `PATCH /plan/draft`,
  `GET /plan/compliance`.
- **Ningún fichero de `frontend/src` llama a ninguna de esas cinco rutas.**
  Comprobado en `main` y en las cinco ramas vivas: 0 coincidencias.
- Lo que el usuario sí rellena hoy es otra cosa: el modelo de sistema de la
  academia (`components/education/tradingSystemModel.js`, clave heredada
  `tcp-trading-setup`), que vive **en localStorage** y no habla con el backend.
  `printTradingPlan()` (`EducationPage.jsx:690`) imprime desde ahí.

**La consecuencia, que es un bug de producto en toda regla:** como
`get_active_plan()` no puede devolver nada (nadie puede crear un plan desde la
web), `detect_errors` cae **siempre** en `DEFAULT_MIN_RR` y
`DEFAULT_MAX_RISK_PCT`. Es decir, la tarjeta «tasa de cumplimiento» del
dashboard de analítica **sigue midiendo la opinión de la app, no el plan del
usuario** — exactamente el bug que el trabajo del 2026-07-30 se escribió para
arreglar. El arreglo está hecho al 100% en el backend y no llega al usuario por
falta de un formulario.

### 6.6 Orden de integración recomendado

```
1. ba8b09ed              (§6.1 — corrección numérica, sola, con sus tests)
2. #162 escáneres        (honestidad de datos; cerrar scanner-data-review)
3. #161 temas/WCAG       (ANTES del rediseño; cerrar trading-web-analysis)
4. #163 ó full-audit     (elegir uno; rebase sobre main)
5. rescate del drawdown  (de competitive-feature-analysis)
6. #165 acceso comp      (trivial)
7. #164 lucide           (verificación visual: cambia todos los iconos)
8. Dependabot de CI      (#100-104)
9. Borrado de ramas muertas
```

---

## 7. Rediseño visual: una identidad propia

### 7.1 El problema real

Tu diseño actual es **fondo casi negro (`0 0% 3%`), verde neón primario
(`145 80% 45%`), acento azul, tarjetas shadcn de radio 0.75rem, gradientes
aurora y orbes difuminados**. Es un buen ejemplo de su categoría — y ése es el
problema: **es la estética por defecto de todas las herramientas de trading y
cripto de los últimos cuatro años.** Parecerse o no a una web concreta no se
arregla cambiando el verde por otro verde. Se arregla cambiando de categoría
visual.

Además, la vía por la que ya has empezado (4 temas premium con nombre) multiplica
el coste de cada cambio por 10 combinaciones y ya ha producido un fallo de
contraste. **Menos temas, mejor sistema.**

### 7.2 La idea que te puede pertenecer: *cada número lleva su procedencia*

Tu producto tiene una regla que casi nadie del sector cumple y que tú ya has
pagado con bugs: **nada inventado sin etiquetar, lo indefinido es `None` y no
`0`, y lo sensible al orden se ordena.** Eso hoy vive en el backend y se pierde
en la pantalla.

**Conviértelo en la firma visual.** Un componente `<Metric>` canónico que muestre
siempre cuatro cosas:

```
  BENEFICIO MÁXIMO          ← etiqueta, mayúsculas, tracking amplio
  1 240,00 €                ← cifra tabular monoespaciada, la pieza más grande
  por contrato · neto       ← unidad y base de cálculo, sin ambigüedad
  ● en vivo  ^IRX · 14:32   ← procedencia: en vivo / modelado / indefinido
```

Con cuatro estados visuales, y sólo cuatro:

| Estado | Marca | Cuándo |
|---|---|---|
| **En vivo** | punto lleno + fuente y hora | Dato observado del proveedor |
| **Modelado** | punto hueco + borde discontinuo | Sale del modelo (cadena sintética) |
| **Indefinido** | `—` en el hueco de la cifra + motivo al pasar el ratón | `None`: no se puede calcular |
| **Sin acotar** | `∞` con el signo y el motivo | Beneficio/pérdida no acotados (§6.1) |

Esto es diferenciación real, no decorativa: **ninguna herramienta gratuita del
sector puede copiarlo**, porque para pintar la procedencia hay que tenerla, y
para tenerla hay que haber construido el backend con esa disciplina. Tú ya la
tienes.

### 7.3 Sistema de dos superficies

En vez de un tema oscuro para todo, **dos superficies con papeles distintos**:

| | **Documento** | **Instrumento** |
|---|---|---|
| Dónde | Landing, precios, academia, fichas de estrategia, legales, `/learn` | Workspace de opciones, dashboard, journal, escáneres, admin |
| Fondo | Claro, papel cálido (`42 15% 97%`) | Grafito profundo (`220 14% 8%`), no negro puro |
| Densidad | Amplia: medida 68-72 caracteres, interlineado 1.7 | Compacta: filas de 32 px, `tabular-nums` |
| Tipografía | Display grande + texto de lectura | Mono para toda cifra, sans sólo para etiquetas |
| Color | Casi nada: tinta y un acento | Sólo donde codifica significado |
| Movimiento | Sutil, de entrada | Ninguno que no sea un dato cambiando |

**Por qué esto funciona como identidad:** el contraste entre las dos superficies
*es* la marca. La categoría entera es monocorde (todo oscuro, o todo claro). Un
sitio que pasa de «revista» a «terminal» cuando entras a trabajar se reconoce a
los dos segundos, se explica en una frase y **resuelve de paso el problema de
legibilidad de la academia**, que hoy son 5.369 líneas de prosa sobre fondo
negro.

### 7.4 Tokens concretos

```css
/* --- Superficie DOCUMENTO --- */
--doc-bg:        42 15% 97%;   /* papel cálido, no blanco clínico */
--doc-surface:   40 20% 99%;
--doc-ink:       220 20% 12%;  /* tinta, no negro */
--doc-ink-soft:  220 10% 42%;
--doc-rule:      40 10% 88%;   /* filetes, no sombras */

/* --- Superficie INSTRUMENTO --- */
--ins-bg:        220 14% 8%;   /* grafito: el negro puro apaga el resto */
--ins-surface:   220 13% 11%;
--ins-raised:    220 12% 15%;
--ins-ink:       220 14% 92%;
--ins-ink-soft:  220 10% 60%;
--ins-rule:      220 12% 20%;

/* --- Semántica (idéntica en las dos superficies) --- */
--pos:           152 62% 38%;  /* beneficio. Verde SOBRIO, no neón */
--neg:           358 62% 48%;  /* pérdida */
--warn:          32 88% 48%;   /* aviso / modelado */
--info:          214 60% 48%;
--brand:         152 72% 42%;  /* #17CF63 desaturado: pasa de fondo a firma */

/* --- Forma --- */
--radius:        4px;          /* de 12px a 4px: instrumento, no burbuja */
--radius-doc:    8px;
--rule:          1px;          /* el filete sustituye a la sombra */
--density:       32px;         /* alto de fila base del instrumento */
```

**Las tres reglas que hacen el sistema:**

1. **El color codifica significado, nunca decora.** Verde = beneficio. Rojo =
   pérdida. Ámbar = modelado o aviso. Todo lo demás es tinta sobre superficie.
   Un botón no es verde porque sea importante: es verde si su resultado es
   beneficio. Esto sólo por sí solo aleja tu web de todas las de la categoría.
2. **El filete sustituye a la sombra.** Nada de `shadow-lg` ni cristal. Un
   `1px` y un cambio de superficie bastan. Es más rápido, se ve mejor en móvil y
   envejece infinitamente mejor.
3. **Toda cifra es tabular y monoespaciada.** `JetBrains Mono` con
   `font-variant-numeric: tabular-nums`. Las columnas de números alinean, y una
   cifra que cambia no desplaza a la de al lado.

### 7.5 Tipografía: de 4 familias a 2

Hoy pides 4 familias a Google Fonts y usas 3, con `.font-unbounded` definida dos
veces (`App.css:21` gana a `index.css:24` por orden de import) e `Inter`
descargada sin un solo uso.

```
Display  →  Unbounded 600      Sólo H1, logo y cifra-héroe. Nada más.
Texto    →  Space Grotesk      Ya está, ya funciona, ya la conocen tus usuarios.
Cifras   →  JetBrains Mono     TODA cifra, en las dos superficies.
Fuera    →  Inter              Se descarga y no se usa. Borrar del <link>.
```

Escala tipográfica de 6 pasos (hoy hay valores sueltos por toda la UI):
`12 / 14 / 16 / 20 / 28 / 44`.

### 7.6 Los temas premium

Los 4 temas con nombre (oro, cripto, forex, nasdaq) son un buen gancho comercial
y un mal sistema de diseño: 10 combinaciones que mantener, y ya han producido un
fallo de contraste. **Redúcelos a un acento sobre la superficie instrumento**:
el tema cambia `--brand` y como mucho el tono del fondo, nunca los colores
semánticos ni los de superficie. Beneficio sigue siendo verde en el tema oro.

El check de contraste WCAG en CI del **PR #161 es la pieza que hace esto seguro**:
mergéalo primero y el rediseño nace con red de seguridad.

---

## 8. Arquitectura de información: el rediseño pantalla a pantalla

### 8.1 Navegación: de 6 planos a 4 con sentido

```
HOY                              PROPUESTA
─────────────────────────        ────────────────────────────────────
Dashboard    (premium)           Calculadoras   → índice + 14 fichas
Opciones     (premium)           Opciones       → Finder · Estrategias · Workspace
Rendimiento  (premium)           Mi trading     → Journal · Analítica · Plan
Noticias     (maqueta)           Aprender       → academia + fichas por concepto
Precios                          ─────────────────────────
Educación    (premium)           Precios · Entrar
```

`/news` sale del menú hasta que tenga contenido real. Cada entrada dice **qué
es**, no cómo se llama por dentro: «Mi trading» se entiende; «Rendimiento», en
una web con calculadoras de rentabilidad, no.

Y lo más importante: **el menú deja de mentir**. Un candado visible en lo que
requiere plan, o nada de candado porque es público (§10.1). Lo que no puede
seguir es invitar a cuatro secciones que devuelven un muro.

### 8.2 Calculadoras: `/tools` y `/tools/:slug`

De 14 pestañas a un índice con **4 familias** y una ficha por calculadora:

```
/tools                        Índice: 4 familias, buscador, «usadas
                              recientemente»
/tools/tamano-posicion        Ficha completa con URL propia
/tools/lotes-forex
/tools/apalancamiento         Familia · TAMAÑO Y RIESGO
/tools/futuros
─────────────────────────
/tools/precio-objetivo
/tools/fibonacci              Familia · NIVELES Y OBJETIVOS
/tools/patrones
/tools/salida-parcial
/tools/medicion
─────────────────────────
/tools/porcentaje             Familia · CUENTAS RÁPIDAS
/tools/precio-medio
─────────────────────────
/tools/monte-carlo            Familia · SIMULACIÓN
/tools/simulador
/tools/interes-compuesto
```

Cada ficha, siempre con la misma estructura: **entrada → resultado con
procedencia → qué significa → qué hacer con esto → calculadoras relacionadas**.
Los slugs ya existen en `gen-seo-pages.js:70-105`: **reutilízalos** y la página
estática deja de ser un anzuelo para pasar a ser la misma página, prerenderizada.

Esto cierra G-C, arregla el punto 2 y el 3 de la §5, y convierte 12 páginas
estáticas en 14 páginas reales.

### 8.3 Opciones: el Finder como portada

```
/options                      Hub. Portada = FINDER (hoy es un catálogo)
/options/finder               «¿Qué esperas que haga el precio?»
/options/strategies           Catálogo de las 66
/options/strategies/:slug     Ficha + calculadora con la estrategia cargada
/options/calculator           Workspace completo (el de hoy)
```

**El Finder, en tres campos**: activo · visión (sube / baja / lateral / mucho
movimiento) · horizonte. Devuelve las candidatas ordenadas con la tarjeta
`<Metric>` de la §7.2: POP, máximo, mínimo, capital, R/R — cada una con su
procedencia. Un clic abre esa estrategia en el workspace, cargada.

El motor ya existe (`POST /optimize`, `options_optimize.py`, `OptimizeView.jsx`).
**Esto es empaquetado, no capacidad nueva** — lo que lo hace, con diferencia, el
mejor retorno por hora de trabajo de todo este documento.

Y la ficha de estrategia deja de ser un folleto: **carga la estrategia en una
calculadora reducida sobre datos reales**. Es lo que hace `/strategies/double-calendar`
de la referencia y lo que tu ficha, hoy, no hace.

### 8.4 El workspace: menos cajón

La jerarquía del 2026-07-30 (configurar → resultado → gráfico → griegas →
acordeón) es correcta. Lo que falla es que el acordeón se ha vuelto el cajón de
todo. Divídelo en tres pestañas dentro del propio acordeón:

- **Riesgo** — Kelly, salidas, avanzado, roll
- **Contexto** — posicionamiento, IV, term structure, earnings, Dealers (#163)
- **Mis posiciones** — guardadas, comparador, griegas de cartera

### 8.5 Aprender: una URL por concepto

Extraer de `tradingEducationContent.js` un índice con slug (el trabajo de datos
que `ESTADO_PROYECTO.md` ya identifica como el bloqueo) y publicar
`/learn/:slug`. Cada ficha: definición, por qué importa, ejemplo con cifras, y
**el enlace a la calculadora que lo calcula**. Ese enlace es la conversión: la
referencia no lo tiene porque no tiene 14 calculadoras detrás.

---

## 9. Reestructuración del repositorio

### 9.1 Lo que ya está bien

La reorganización del 2026-07-30 hizo lo importante: raíz limpia (`README` +
`CLAUDE` + `SECURITY`), `docs/` indexado por intención, `docs/historico/` para
lo caducado, `check-doc-links.py` en verde. **No lo toques.**

### 9.2 `backend/server.py`: 7.377 líneas

Es la deuda técnica reconocida (G-04, BUG-008) y el bloqueo de todo lo demás.
Contiene el shim de BD, todas las rutas, auth, Stripe y el arranque. El corte
natural, en este orden y **un módulo por PR con sus tests**:

```
backend/
  app/
    db/          shim Collection + init_pool  (~750 líneas, sin dependencias)
    auth/        JWT, cookies, Google, 2FA
    routers/     market.py · options.py · journal.py · performance.py
                 billing.py · admin.py · plan.py
    core/        config, middleware de seguridad, rate limiting
  server.py      sólo el ensamblado de la app
```

Empieza por `db/`: no depende de nada y hace testeable todo lo que viene detrás.
**Y resuelve de paso G-04**, el route shadowing que deja ~21 endpoints de
`admin_routes.py` como código muerto porque los de `server.py` ganan por orden de
registro.

### 9.3 `frontend/src/pages/`: dos monolitos

`EducationPage.jsx` (5.369 líneas) y `AdminPage.jsx` (3.342) son el 60% del
código de páginas. El primero **hay que partirlo igualmente** para publicar
`/learn/:slug` (§8.5): el trabajo se paga dos veces.

```
pages/education/   index.jsx + module/[slug].jsx + data/toc.js
pages/admin/       users.jsx · payments.jsx · flags.jsx · metrics.jsx · audit.jsx
```

### 9.4 Ramas: de 48 a ~6

```
main
claude/<trabajo-en-curso>      (1-3 vivas)
dependabot/*                   (efímeras)
gh-pages                       (artefacto)
```

Borra las 11 ramas de mayo-junio con 226-330 commits divergentes y las duplicadas
(`scanner-data-review`, `trading-web-analysis-ktsvkd`) **después** de cerrar sus
PRs. Y activa **borrado automático de rama al mergear** en los ajustes del repo:
es la causa raíz de que haya 48.

### 9.5 CI

Lo que ya corre (`py_compile`, pytest, ESLint, i18n, engine, ads-check retirado,
doc-links) está bien. Añadir, por este orden:

1. **Contraste WCAG** — viene en el PR #161. Sin él, el rediseño de la §7 se
   verifica a ojo.
2. **Presupuesto de bundle** — 28 MB de JS en `build/` con las páginas
   estáticas. Un umbral que falle al crecer.
3. **Contrato de rutas** — un test que compruebe que todo enlace interno de
   `gen-seo-pages.js` apunta a una ruta declarada en `App.js` **y con el mismo
   nivel de acceso**. Es exactamente el fallo de G-A: 12 páginas públicas
   enlazando a `/dashboard?tab=` premium. Hoy nada lo detecta.

---

## 10. Las dos decisiones que tienes que tomar

### 10.1 El muro de pago (🔴 gobierna todo el documento)

El 2026-08-02 decidiste cerrar todo tras el muro y retirar la publicidad. Es una
decisión legítima y no la voy a discutir dos veces. Lo que sí tengo que decirte
es **qué cuesta**, porque el encargo era «estar al nivel de esa web»:

> La referencia es **gratis, ilimitada y sin registro**. Su producto entero es la
> superficie pública. Con superficie cero no compites en su terreno: compites en
> otro, el de convertir tráfico que llega por otras vías.

Tres caminos, y los tres son coherentes:

| | **A · Muro total** (hoy) | **B · Freemium con tope** | **C · Herramienta gratis, dato de pago** |
|---|---|---|---|
| Qué es público | Nada | Las 14 calculadoras y el catálogo de 66, con cálculos ilimitados sobre **datos de ejemplo** | Todo el cálculo; se paga el dato vivo, guardar, journal, IA y escáneres |
| SEO | 1.589 URLs de un párrafo | 1.589 URLs que **hacen** lo que prometen | Igual que B |
| Conversión | Registro o nada | El muro aparece donde aporta valor: dato vivo, guardar, comparar | Igual |
| Riesgo | Google no premia lo que no ve | Menos urgencia por pagar | Coste de datos si hay abuso |
| Esfuerzo | 0 | Medio: un flag de acceso por ruta, ya existe `ProtectedRoute` | Medio |

**Mi recomendación es B.** El muro se pone donde tu producto es
insustituible — cadena real, posicionamiento, IA, journal, plan — y no delante
de una calculadora de tamaño de posición, que se encuentra gratis en veinte
sitios y que **es tu principal captador de tráfico**. Es reversible en una tarde:
la maquinaria (`ProtectedRoute premiumOnly`) ya está.

Si eliges A, todo lo demás de este documento sigue en pie **menos** la §8.5 y la
parte de SEO de la §8.2: con muro total, el trabajo debe ir a conversión y
retención, no a superficie.

### 10.2 Verificación visual de la referencia

Sin acceso a `options-strategies.com` no puedo garantizar «que no se parezca».
Elige: pedir el dominio en la lista de egress del entorno, o pasarme capturas.
Con cualquiera de las dos, cierro la §7 con un contraste real.

---

## 11. Plan por fases

| Fase | Trabajo | Semana | Cierra |
|---|---|:--:|---|
| **0** | Rescatar `ba8b09ed` · mergear #162 y #161 · elegir entre #163 y `full-audit` · rescatar el fix de drawdown · borrar ramas muertas | 1 | §6 |
| **1** | Contrato de rutas en CI · el menú deja de mentir · `/news` fuera del menú · decisión §10.1 aplicada | 1 | §5.1, §5.7, §9.5 |
| **2** | Componente `<Metric>` con procedencia · tokens de las dos superficies · tipografía de 4→2 familias · temas premium reducidos a acento | 2 | §7 |
| **3** | `/tools` + `/tools/:slug` (14 fichas) · las páginas estáticas pasan a ser las reales | 2 | G-C, §5.2, §5.3 |
| **4** | `/options/finder` como portada de opciones · ficha de estrategia que calcula | 2 | G-B, §8.3 |
| **5** | Partir `EducationPage.jsx` · `/learn/:slug` | 2 | G-D, §9.3 |
| **6** | Monte Carlo sobre la posición de opciones | 1 | G-E |
| **7** | `server.py` → `app/` (un módulo por PR, empezando por `db/`) | continuo | §9.2, G-04 |

La fase 0 es la única que no admite reordenación: **hoy `main` enseña una
pérdida máxima finita en estrategias de riesgo ilimitado**, y ese número es con
el que alguien dimensiona una posición real.

---

## Apéndice · Fuentes

Sobre la web de referencia (índice de búsqueda; el acceso directo está bloqueado
por política de red, ver §1):

- [Option Finder — Find the Best Options Strategy (Free) | OptionProfit](https://options-strategies.com/option-finder)
- [Double Calendar Spread Calculator — Profit & Loss | OptionProfit](https://options-strategies.com/strategies/double-calendar)
- [Call vs Put Options: The Difference, Explained Simply | OptionProfit](https://options-strategies.com/learn/call-vs-put)
- [What Is a Turbo? Financing Level, Knock-Out & Leverage (2026) | OptionProfit](https://options-strategies.com/learn/what-is-a-turbo)
- [Options-strategies (sitio antiguo)](http://www.options-strategies.com/optionspreadstrategies)

Sobre el propio repositorio: `git` (ramas, commits y diffs verificados el
2026-08-02), la API de GitHub (PRs abiertos) y lectura directa del código citado.
