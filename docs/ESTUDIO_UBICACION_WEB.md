# Estudio de ubicación: dónde vive el Análisis Técnico Avanzado en la web

> Cómo integrar el catálogo (313 técnicas de `ANALISIS_TECNICO_AVANZADO.md`, con
> spec en `DETALLE_TECNICAS_IMPLEMENTACION.md`) en la web **real**, sin duplicar
> lo que ya existe. Conclusión: **sí, "Técnico avanzado" es el sitio** — pero
> repartido en **dos hogares** unidos por un hub.

## 1. Qué hay HOY (inventario real)
- **Rutas:** `/dashboard`, `/education`, `/options`, `/performance` (diario),
  `/pricing`, `/settings`, `/admin`…
- **Escáner** (`StructureScanner.jsx`): ya vive en **`pages/DashboardPage.jsx`**
  (línea ~420). Hace estructura (tendencia, BOS/CHoCH, S/R, FVG) + velas
  reversión/continuación + registro persistente (lo que construimos).
- **Educación:** **760 entradas** de contenido y **~38 componentes visuales**
  avanzados ya construidos. Ejemplos que **cubren** secciones del catálogo:
  `MarketProfileVisual`, `OrderFlowVisual`, `TDSequentialVisual`,
  `MarketStructureVisual`, `PriceActionVisual`, `MovingAveragesVisual`,
  `EhlersVisual`, `ObscureOscillatorsVisual`, `ElderVisual`, `BillWilliamsVisual`,
  `RRGVisual`, `SessionTimingVisual`, `TimeCyclesVisual`, `WolfeWavesVisual`,
  `PitchforkVisual`, `GammaExposureVisual`, `AlgoTradingVisual`, `GannBoxVisual`…
- **`components/tools/`:** `TargetMeasurementTool`, `TradingJournal`.

**Implicación clave:** la **teoría/lección ya está en gran parte**. El hueco real
—y el diferenciador— es la **herramienta VIVA** (detectar sobre datos reales +
estadística de acierto), no volver a explicar los conceptos.

## 2. Tesis: dos hogares + un hub
| Hogar | Qué aloja | Estado |
|---|---|---|
| **Educación** (`/education`) | La **lección** (teoría + visual) de cada técnica | ~38 ya existen → **reusar/extender** |
| **Escáner** (`/dashboard`) | La **herramienta viva** (detección sobre OHLCV + estadística) | Semilla puesta → **construir capa** |
| **Hub "Análisis Técnico Avanzado"** | Índice que **une** lección ↔ herramienta por sección | **nuevo** (ligero) |

El **hub** no re-explica nada: es una rejilla de tarjetas por técnica; cada tarjeta
enlaza a su **lección** (Educación) y, si aplica, abre su **herramienta viva** en
el escáner. Puede ser una **pestaña dentro de `/education`** ("Técnico avanzado")
o una ruta `/education/avanzado`, para no fragmentar la navegación.

## 3. Mapa por TIPO de técnica → hogar
Recordando los 5 tipos (no todo es "evento direccional"):
1. **Eventos/setups direccionales** (falso barrido, Wyckoff spring, 2B, chartismo,
   TD, velas) → **Escáner** (detector vivo + estadística). *El corazón.*
2. **Contexto/régimen** (amplitud, intermercado, ADX/Choppiness, Hurst) → **panel
   de régimen** en el escáner + lección.
3. **Medición/niveles** (Volume Profile, VWAP, Fibonacci, regresión, pivotes) →
   **overlays** en el gráfico + escáner.
4. **Order flow** (delta/CVD/footprint) → **panel cripto en vivo** (Binance) +
   `OrderFlowVisual`.
5. **Infra/método** (cuant, Ehlers, ciclos) → **solo lección** (Educación).

## 4. Mapa por sección (31) → hogar · ¿lección ya existe? · herramienta a construir
| Secc. | Hogar | Lección existente | Herramienta viva (build) | Datos |
|---|---|---|---|---|
| 1 Wyckoff | Escáner | `MarketStructureVisual` | fases + spring/upthrust | 🔨 |
| 2 Volume Profile | Escáner (overlay) | `MarketProfileVisual` | POC/VA/naked | 🔨/🔧 |
| 3 Order flow | Escáner cripto | `OrderFlowVisual` | delta/CVD/footprint | 🔧 |
| 4 DeMark | Escáner | `TDSequentialVisual` | TD Seq/Combo/Lines | 🔨 |
| 5 Amplitud | Hub/Dashboard | — | dashboard de mercado | 🔧 |
| 6 Intermercado/RS | Hub | `RRGVisual` | RS line/RRG/ratios | 🔧 |
| 7 Price action | Escáner | `PriceActionVisual`,`WolfeWavesVisual`,`PitchforkVisual` | 2B/Ross/Hikkake/NR7 | 🔨 |
| 8 SMC/ICT | Escáner | (parte en PriceAction) | OB/breaker/QM | 🔨 |
| 9 Volumen | Escáner | (parte) | OBV/AD/CMF/MFI | 🔨 |
| 10 Volatilidad/canales | Escáner (overlay) | `BillWilliamsVisual` (parte) | BB/Keltner/squeeze | 🔨 |
| 11 Gráficos anti-ruido | Chart (modo) | — | Renko/Kagi/P&F modes | 🔨 |
| 12 Medias | Chart (overlay) | `MovingAveragesVisual` | GMMA/HMA/KAMA | 🔨 |
| 13 Ehlers | Educación | `EhlersVisual` | (paneles opcional) | 🔨 |
| 14 Osciladores | Escáner (panel) | `ObscureOscillatorsVisual` | RSI/CCI/ADX… | 🔨 |
| 15 Ciclos | Educación | `TimeCyclesVisual` | — | ⚠️ |
| 16 Chartismo | Escáner | `ChartPatternFigure` (42) | detección + objetivo | 🔨 |
| 17 Líneas/regresión | Chart (overlay) | `PitchforkVisual` | trendline/regresión | 🔨 |
| 18 Fibonacci | Chart (overlay) | (parte) | retro/ext/objetivos | 🔨 |
| 19 Medias avanzadas | Chart (overlay) | `MovingAveragesVisual` | MACD/DEMA/T3… | 🔨 |
| 20 Momentum/régimen | Escáner (panel) | — | ROC/KST/Choppiness | 🔨 |
| 21 Estadística cuant | Hub/tools | — | z-score/Hurst/pairs | 🔨 |
| 22 Niveles sesión | Escáner | `SessionTimingVisual` | PDH/PDL/redondos | 🔨/🔧 |
| 23 P&F | Chart (modo) | — | P&F + BPI | 🔨/🔧 |
| 24 Sentimiento | Hub/Options | `GammaExposureVisual` | put/call/VIX | 🔧 |
| 25 Ehlers+ | Educación | `EhlersVisual` | — | 🔨 |
| 26 Japonesa (Ichimoku) | Escáner+Chart | (Ichimoku parte) | objetivos N/V/E/NT + kihon suchi | 🔨 |
| 27 Rusa | Escáner/tools | `ElderVisual` | Triple Pantalla/SafeZone | 🔨 |
| 28 Por nacionalidad | Chart/Educación | (varias) | SAR/Chaikin/Markttechnik | 🔨 |
| 29 Cuant/algoritmos | Educación | `AlgoTradingVisual` | (backtest opcional) | ⚠️ |
| 30 Intradía hora/min | Hub | `SessionTimingVisual` | motor de franjas | 🔧 |
| 31 Barridos/Judas | Escáner | (parte SessionTiming) | detector sweep+reversal | 🔧 |

**Lectura:** casi todas tienen **lección** (reusar el `*Visual`); lo que falta es
la **columna de herramienta viva**, que es donde está el valor y donde tu escáner
es el hogar natural.

## 5. Estructura propuesta del hub "Análisis Técnico Avanzado"
Dentro de `/education` (pestaña) o `/education/avanzado`:
- **Rejilla por las 8 familias útiles:** Estructura/Wyckoff · Barridos & falso
  rompimiento · Chartismo · Volumen & Profile · Order flow (cripto) · Osciladores
  & régimen · Medias & canales · Escuelas (Ichimoku/rusa).
- Cada **tarjeta** = nombre + etiqueta de **TIPO** (evento/contexto/medición/
  filtro/infra) + calidad (✅/⚠️) + botones **"Aprender"** (lección) y **"Analizar
  en vivo"** (abre el escáner con esa herramienta activa).
- Filtro **"solo alta probabilidad direccional"** → muestra el subconjunto de
  eventos (secc. 31, 1, 7, 8, 16, 4, velas) — justo lo que te interesa.

## 6. Fases de implementación (reusando lo que hay)
- **Fase 1 (escáner, 🔨 sin intradía):** Volume Profile · detector de falso
  rompimiento (2B/spring) · objetivos Ichimoku N/V/E/NT · TD Sequential. Cada uno
  = tarjeta con estadística viva. *Máximo valor, dato ya disponible.*
- **Fase 2 (hub + enlaces):** crear el hub "Técnico avanzado" enlazando las ~38
  lecciones existentes con las herramientas de Fase 1 + filtro "alta probabilidad".
- **Fase 3 (chart overlays):** Fibonacci/regresión/medias/pivotes como capas del
  gráfico; modos Renko/Kagi/P&F.
- **Fase 4 (🔧 datos extra):** order flow cripto (Binance), barridos intradía,
  amplitud/internals, intradía por franjas.

## 7. Honestidad
- El hub **no** debe vender "313 señales ganadoras": la mayoría son **contexto y
  medición**; solo un subconjunto son **eventos direccionales** (y probabilísticos,
  ~55–70%, con decaimiento). El filtro "alta probabilidad" debe dejarlo claro.
- Reusar las lecciones evita **duplicar** y mantiene la paridad i18n ×8.
- Todo lo 🔧 (order flow, intradía, amplitud) hay que **mockearlo en el sandbox**
  y verificar con fixtures (ver CLAUDE.md).

*Siguiente paso natural: Fase 1 en el escáner. Todo especificado en
`DETALLE_TECNICAS_IMPLEMENTACION.md`.*
