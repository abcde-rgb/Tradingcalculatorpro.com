# TradingCalculatorPro Academy — Master Plan Unificado

Documento único que consolida 16 análisis sucesivos sobre el repositorio
`abcde-rgb/Tradingcalculatorpro.com`. Escrito para ser usado como especificación de
trabajo por Claude Code (o cualquier agente de desarrollo) sobre el repo real.

**Regla de oro antes de ejecutar nada de este documento:** este proyecto ya tiene su
propio proceso de verificación de huecos (`docs/ESTADO_PROYECTO.md`, `docs/DIARIO_BUGS.md`,
`docs/MAPA.md`, `.claude/skills/cerrar-hueco/SKILL.md`, `scripts/gen-mapa.py --check`).
Varios documentos de este propio repo (`PENDIENTES.md`) han quedado desactualizados y
afirman huecos ya cerrados (ver Sección 0). **Cualquier gap mencionado en este documento
debe reverificarse contra el código actual antes de actuar sobre él** — no asumir que
sigue abierto solo porque aparece aquí.

> **Estado en este repositorio.** Es la **dirección de producto** de la Academia, no
> una lista de tareas aprobada. Nada de aquí está construido salvo que lo diga
> `ESTADO_PROYECTO.md`, que sigue siendo la fuente de verdad del estado. Cuando este
> documento y el código digan cosas distintas, **manda el código** — y la
> contradicción se anota abajo.
>
> Añadido el 2026-08-29. Origen: 16 análisis sucesivos consolidados fuera del repo.

---

## SECCIÓN 0.bis — Reverificación contra el código (2026-08-29)

El propio documento lo exige en su regla de oro, así que se hizo antes de archivarlo.
Se comprobó la Sección 0 entera contra el código de `main` + la rama de esta sesión.
**Nada de esto invalida el plan**: son las cifras con las que hay que entrar a él.

### Lo que el documento acierta

| Afirmación | Comprobación |
|---|---|
| MAE/MFE por operación implementado | `mae_price`/`mfe_price` en `TradeFormModal.jsx`; `mae_mfe_stats()` en `performance_metrics.py:176` ✅ |
| `rule_compliance_rate` y `behavioral_biases` ya calculados | `performance.py:1032` y `detect_behavioral_biases()` en `:836`, expuestos en `:1137`/`:1141` ✅ |
| 35 módulos backend · 27.019 líneas de Python | `docs/MAPA.md` (generado) ✅ |
| 199 rutas declaradas · 29 rutas de frontend en `App.js` | `docs/MAPA.md` ✅ |
| 59 ficheros de test · 1.015 funciones de test | `docs/MAPA.md` ✅ |
| 33 rutas backend sin consumidor | `docs/MAPA.md` ✅ — matiz: son **33 en total**, de las que `check-rutas-muertas.py` marca **27 como sospechosas**; las otras 6 son huérfanas por diseño (webhooks). Las dos cifras miden cosas distintas y ambas son correctas |
| **G-14 está desactualizado** | ✅ **Y es el hallazgo más importante del documento.** Ver abajo |

### Lo que hay que corregir antes de usarlo

| Dice el documento | Dice el código (2026-08-29) |
|---|---|
| «68 módulos» en la Academia | **91** entradas en `EDU_MODULES` de `lib/eduIndex.js` |
| «8-10 idiomas» | **10**, sin excepción, con paridad forzada en CI (`i18n-check.js`) |
| «7.290 claves i18n» | **7.355** (`es` como referencia) |
| «14 calculadoras confirmadas» en `components/calculators/` | **17** ficheros. El documento omite `Breakeven`, `CrossMarginSimulator` y `LosingStreak` |
| G-30: 4 componentes propios muertos | **2**. `GreeksPanel` y `PriceTicker` siguen sin un solo importador; `TradingBasicsGuide` y `WhyItMatters` **ya se usan** (`EducationPage.jsx:103` y `:104`). El documento heredó la lista vieja |

### G-14: cerrado a medias, no abierto

El documento dice que el hueco «backend terminado sin pantalla» está desactualizado, y
**tiene razón, con matiz**. De los cuatro módulos que `ESTADO_PROYECTO.md` §G-14 nombra:

| Módulo | Estado real |
|---|---|
| Plan de trading | ✅ **Tiene pantalla.** `TradingPlanPage` importada en `App.js:64`, ruteada en `:171` (`/plan`) |
| Backtest | ✅ **Tiene pantalla.** `BacktestingPage` ruteada en `App.js` |
| Riesgo de cartera (`portfolio_risk.py`) | ❌ Sigue huérfano: **cero** menciones en todo `frontend/src` |
| Opciones americanas (`american_options.py`) | ❌ Sigue huérfano: **cero** menciones en todo `frontend/src` |

Consecuencia práctica: el punto 5 de la Sección 14 («conectar los 33 endpoints
huérfanos») sigue siendo válido, pero es **más pequeño de lo que el documento supone**.
`docs/RUTAS_MUERTAS.md` ya tiene la decisión escrita de cada una, y
`check-rutas-muertas.py` impide en CI que la lista crezca en silencio: **ese es el sitio
por donde entrar**, no una auditoría nueva.

### Cómo se comprobó

```bash
python scripts/gen-mapa.py --check        # cifras del resumen
python scripts/check-rutas-muertas.py     # 27 sospechosas, todas decididas
grep -n "TradingPlanPage\|BacktestingPage" frontend/src/App.js
grep -rn "portfolio_risk\|american_options" frontend/src
grep -rn "import .*GreeksPanel\|import .*PriceTicker" frontend/src
node -e "…"                               # recuento real de claves i18n
```

⚠️ **Las cifras de arriba caducan.** No las cites de memoria en una sesión futura:
vuelve a correr los comandos. `docs/MAPA.md` se regenera y `--check` falla en CI si el
código y el mapa divergen, así que el mapa nunca miente; este anexo sí puede envejecer.

---

## SECCIÓN 0 — Hechos verificados contra el código real (no asumir, ya confirmado)

Estos son datos comprobados durante esta conversación, con fuente exacta. Todo lo demás
en este documento es diseño/propuesta, no hecho verificado.

### 0.1 Ya implementado (no reconstruir)

- **MAE/MFE por operación**: `frontend/src/components/performance/TradeFormModal.jsx`
  (campos `mae_price`/`mfe_price`) + `backend/performance_metrics.py` (`mae_mfe_stats`,
  con tests unitarios). Calcula avg MAE, avg MFE, exit efficiency.
- **R-múltiplos, Sharpe, Sortino, Kelly, Risk of Ruin, Monte Carlo, drawdown→recovery,
  Portfolio Heat con correlación, Stress test de margen**: confirmados en
  `docs/ANALISIS_COMPETENCIA_2026-07-19.md`.
- **`rule_compliance_rate` y `behavioral_biases`** (disposición, revenge trading,
  overtrading, falta de stop) ya calculados en `backend/performance.py`.
- **"Edge en vivo"**: botón que alimenta las calculadoras Risk-of-Ruin/Kelly con datos
  reales del diario del usuario — ya conectado.
- **AI Trade Coach (Claude)** ya integrado en la suite de opciones.
- **Academia actual**: no son "77 módulos en inglés" — son **68 módulos × 8-10 idiomas**,
  con 6 pilares, glosario de 60 términos + 20 diagramas SVG, quizzes por pilar, ruta
  guiada "Empieza aquí", i18n con normalización de diacríticos en el buscador educativo.
- **`getPsychSolutions`** (módulo de psicología existente) ya está construido sobre
  implementation intentions ("if-then"), self-monitoring de Steenbarger y el
  "probabilistic mindset" de Mark Douglas — no son frases motivacionales.
- **`eduIndex.js`**: indexa contenido real, normaliza idiomas, devuelve por qué un
  resultado coincide con una búsqueda conceptual (nota interna: 92/100).
- **`TradingPlanPage.jsx`**: existe, está importada con lazy-loading en `App.js`, y
  consume `backend/trading_plan.py` (564 líneas, 5 endpoints: `/plan`, `/plan/history`,
  `/plan/draft`, `/plan/compliance`). **El hueco "sin pantalla" de `docs/PENDIENTES.md`
  (G-14) está desactualizado — verificar estado real antes de asumir que sigue abierto.**
- **Regla de diseño ya vigente**: `.claude/rules/diario-riesgo.md` — "los umbrales de
  riesgo salen del plan del usuario, no de constantes"; `detect_errors` ya usa
  `plan["risk"]` cuando existe un plan, y solo cae a defaults si el usuario no tiene plan.
- **14 calculadoras confirmadas** en `frontend/src/components/calculators/`: BlackScholes,
  Compound, Fibonacci, Futures, Leverage, LotSize, MonteCarlo, PartialExit,
  PatternTrading, Percentage, PositionSize, SimulatorPro, Spot, TargetPrice. Más Risk of
  Ruin, Kelly, Drawdown→Recovery, Portfolio Heat y Stress test en otras carpetas (~19 total).
- **`PerformancePage.jsx`** ya tiene tabs: overview / diario de trading / analytics /
  `plan` / `setups` / `projection` — Setup Builder y Trading Plan ya aparecen ahí como tabs.
- **Backend ya calcula 25+ métricas agregadas**: win rate, expectancy, profit factor,
  Sharpe, Sortino, max drawdown, avg R, streaks, breakdown por setup/día/símbolo,
  R-distribution, error detection, auto-insights.

### 0.2 Gaps reales ya documentados por el propio repo (fuente: `ESTADO_PROYECTO.md`)

- **G-29**: `PENDIENTES.md` da por abierto lo que está cerrado (cita cifras falsas,
  confirmado por el propio proyecto — no solo por esta conversación).
- **G-30**: 20 componentes `.jsx` muertos sin importar en ningún sitio (17 en
  `components/ui/`, 1.318 líneas; 3 propios: `GreeksPanel.jsx`, `TradingBasicsGuide.jsx`,
  `WhyItMatters.jsx`, `PriceTicker.jsx`, 933 líneas). 10 de 27 paquetes `@radix-ui` solo
  los usan esos componentes muertos.
- **G-31**: residuos que dan instrucciones falsas (`backend/patches/server_fixes.patch`
  con `MONGO_URL` de una BD ya descartada, `backend/FIXES_README.md` que manda integrar
  un `fixes.py` inexistente, `backend/ADMIN_INTEGRATION.md` ya integrado, `memory/PRD.md`,
  `monitoring/`, `packaging/twa-manifest.json`, `check.sh`).
- **MAPA.md**: 199 rutas backend declaradas, 29 rutas frontend en `App.js`, **33 rutas
  backend sin consumidor en el frontend** (incluye: guardar cálculos en el Journal,
  Monte Carlo, portfolio risk, performance export, precios de mercados, change-plan,
  entre otras). 27.019 líneas de Python backend, 35 módulos backend, 59 ficheros de test
  con 1.015 funciones de test, 10 idiomas con 7.290 claves i18n (referencia `es`).
- **Bug de seguridad real ya resuelto** (referencia, no acción pendiente): BUG-057,
  account pre-hijacking vía login federado, con PoC verificado y 4 tests — ejemplo del
  nivel de rigor que ya tiene el proyecto.

### 0.3 Proceso de verificación obligatorio antes de tocar código

```bash
python3 scripts/gen-mapa.py --check   # recalcula rutas sin consumidor
git log --oneline -20 -- <archivo en cuestión>
grep -rn "<lo que se afirma>" backend/ frontend/src/
```

---

## SECCIÓN 1 — Filosofía y narrativa de producto

Lema rector: *"Learn to survive. Survive long enough to learn. Learn enough to find
your edge. Master yourself before trying to master the market."*

Jerarquía de objetivos (prioridad en caso de conflicto de producto):
**SURVIVAL > CONSISTENCY > EDGE > SCALE > ADAPT > MASTER YOURSELF > MASTER YOUR CRAFT**

Tres pilares visuales al mismo nivel (no jerárquicos entre sí):
- 🛡️ **SURVIVAL** — Protect your capital
- 🧠 **SELF-MASTERY** — Control your behaviour
- 📊 **EDGE** — Understand and exploit uncertainty

Distinción central a comunicar en toda la plataforma: *"Control emocional ≠ ausencia de
emociones"* — el objetivo es sentir miedo y ejecutar correctamente, no eliminar el miedo.

Promesa de marketing correcta (evitar prometer rentabilidad):
*"We give you the framework, tools and training process to develop into a professional
trader."* No: *"We turn beginners into profitable traders."*

Frase ancla obligatoria para el módulo de probabilidad: *"Large numbers do not create
an edge. They reveal the edge you actually have."*

Marco de expectativas por años (para onboarding/marketing, evitar prometer rapidez):
- Año 1 — Survival: no errores catastróficos, aprender mercado y riesgo, disciplina, journal.
- Año 2 — Discovery: investigar, probar hipótesis, buscar edges, construir sistemas.
- Año 3 — Consistency: ejecución estable, gestión de drawdown, robustez, adaptación.
- Año 4+ — Professionalization: capital, portfolio, especialización, research, scaling.

---

## SECCIÓN 2 — Currículo: 12 niveles / 84 módulos / ~430 submódulos

### 2.1 Tabla de niveles

| Nivel | Nombre | Módulos | Submódulos aprox. | Reutiliza de hoy (verificar contra 0.1) |
|---|---|---|---|---|
| 0 | 🛡️ Survival | 6 | 25 | Broker Safety, Gambling Harm |
| 1 | 🌍 Market Foundations | 8 | 38 | Market Mechanics, Fundamentals |
| 2 | 📊 Risk & Probability | 9 | 50 | Risk, Tail Risk, Breakeven, Position Sizing |
| 3 | 📈 Reading the Market | 8 | 42 | Candlesticks, Price Action, Market Structure |
| 4 | 🔬 Analysis | 10 | 52 | Technical Analysis, Fundamental Analysis, Macro |
| 5 | 🧠 Trading Frameworks | 10 | 55 | Dow, Wyckoff, Elliott, Ichimoku, Harmonics, SMC, Order Flow, Market Profile |
| 6 | ⚙️ Strategy Engineering | 7 | 37 | Setup Builder (protagonista) |
| 7 | 🧪 Research & Validation | 7 | 38 | Evidence-Based, Backtest Validation |
| 8 | 🎯 Execution & Psychology | 6 | 31 | Journal, MAE/MFE, Psych Solutions, System Adherence |
| 9 | 💼 Portfolio & Capital | 5 | 27 | Capital, Cross-Margin |
| 10 | 🏦 Professional Markets | 5 | 25 | Option Greeks, Gamma Exposure, Algo Trading |
| 11 | 🏆 Professional Trader | 3 | 10 | Nuevo — certificación de competencia |
| **TOTAL** | | **84** | **~430** | |

### 2.2 Desglose completo por nivel (módulos numerados)

- **Nivel 0 — Survival (6):** 0.1 Trading Reality · 0.2 Financial Safety · 0.3 Broker
  Safety · 0.4 Trading Errors · 0.5 Gambling Harm · 0.6 Survival Test.
- **Nivel 1 — Market Foundations (8):** 1.1 Financial Markets · 1.2 Market Mechanics ·
  1.3 Orders · 1.4 Execution · 1.5 Leverage & Margin · 1.6 Sessions · 1.7 Trading
  Infrastructure · 1.8 Market Mechanics Test.
- **Nivel 2 — Risk & Probability (9, "el corazón de la Academia"):** 2.1 Risk Management
  · 2.2 Position Sizing · 2.3 R-Multiples · 2.4 Expectancy · 2.5 Probability ·
  2.6 Distributions · 2.6b **Probability of Survival & Law of Large Numbers** (nuevo,
  insertar antes de 2.7 — ver Sección 6) · 2.7 Drawdown & Ruin · 2.8 Monte Carlo ·
  2.9 Risk Mastery Test.
- **Nivel 3 — Reading the Market (8):** 3.1 Candles · 3.2 Price Action · 3.3 Market
  Structure · 3.4 Trends · 3.5 Support & Resistance · 3.6 Volume · 3.7 Volatility ·
  3.8 Market Reading Test.
- **Nivel 4 — Analysis (10):** 4.1 Technical Analysis · 4.2 Moving Averages ·
  4.3 Momentum · 4.4 Trend Following · 4.5 Mean Reversion · 4.6 Fundamental Analysis ·
  4.7 Company Valuation · 4.8 Macro · 4.9 Intermarket · 4.10 Sentiment.
- **Nivel 5 — Trading Frameworks (10):** 5.1 Dow Theory · 5.2 Wyckoff · 5.3 Elliott Wave
  · 5.4 Ichimoku · 5.5 Harmonic Trading · 5.6 SMC/ICT · 5.7 Order Flow · 5.8 Market
  Profile · 5.9 Alternative Methods (Gann, DeMark, Bill Williams, Wolfe, Pitchfork,
  Ehlers, Time Cycles) · 5.10 Framework Comparison (qué explica cada uno, no cuál es mejor).
- **Nivel 6 — Strategy Engineering (7):** 6.1 What Is a Strategy · 6.2 Hypothesis ·
  6.3 Setup Design · 6.4 Entry · 6.5 Exit · 6.6 Risk & Position Sizing ·
  6.7 Strategy Documentation.
- **Nivel 7 — Research & Validation (7):** 7.1 Scientific Thinking · 7.2 Data ·
  7.3 Backtesting · 7.4 Biases (look-ahead, survivorship, selection, data snooping) ·
  7.5 Overfitting · 7.6 Out-of-Sample · 7.7 Robustness (walk-forward, sensitivity,
  Monte Carlo, regime testing).
- **Nivel 8 — Execution & Psychology (6):** 8.1 Execution · 8.2 Trading Journal ·
  8.3 MAE/MFE · 8.4 Psychology · 8.5 System Adherence · 8.6 Performance Review
  (Strategy vs Trader performance — ver Sección 4).
- **Nivel 9 — Portfolio & Capital (5):** 9.1 Portfolio Construction · 9.2 Correlation ·
  9.3 Exposure · 9.4 Capital Allocation · 9.5 Scaling.
- **Nivel 10 — Professional Markets (5):** 10.1 Options (Greeks/IV/skew/term structure)
  · 10.2 Gamma (dealer hedging, vanna, charm, OPEX) · 10.3 Algo Trading ·
  10.4 Institutional Trading · 10.5 Specialized Markets (forex, futures, commodities,
  crypto, indices).
- **Nivel 11 — Professional Trader (3):** 11.1 Trading Plan · 11.2 Research Project ·
  11.3 Professional Certification.

### 2.3 Plantilla obligatoria por submódulo (5 capas / Learning Card)

1. 📚 LEARN — explicación conceptual.
2. 👁️ SEE / VISUALIZE — visualización/componente interactivo/animación.
3. 🧮 CALCULATE — ejercicio numérico, conectado a la calculadora real correspondiente.
4. 🎯 APPLY — caso real (gráfico/dataset), conectado al Setup Builder/Journal.
5. 🧪 PROVE / TEST — evaluación/mastery check.
6. 🔄 REVISIT — repetición espaciada a 7/30/90 días (spaced repetition).

Ejemplo de referencia completamente desarrollado — **2.4 Expectancy** (17 submódulos,
candidato ideal como piloto de implementación porque ya existe la fórmula, el módulo
Risk y el Breakeven Table en el repo):
2.4.1 What is Expectancy · 2.4.2 Win Rate · 2.4.3 Average Win · 2.4.4 Average Loss ·
2.4.5 R-Multiple · 2.4.6 Expectancy Formula · 2.4.7 Break-even Win Rate · 2.4.8 Costs ·
2.4.9 Negative Expectancy Example · 2.4.10 Positive Expectancy Example ·
2.4.11 Distribution · 2.4.12 Sample Size · 2.4.13 Exercise · 2.4.14 Interactive Calculator
· 2.4.15 Quiz · 2.4.16 Real Trading Case · 2.4.17 Mastery Test.

### 2.4 Regla de presentación al usuario (UX)

El alumno nunca ve "84 módulos". Ve: *"Estás en LEVEL 2 — Risk & Probability"* →
*"Para desbloquear LEVEL 3 necesitas demostrar dominio de 2.1–2.9."*

---

## SECCIÓN 3 — Trading Permission Gate (política de acceso a capital real)

No es currículo — es lógica de producto que decide cuándo la app permite operar real.

| Nivel | ¿Puede operar? | Tipo permitido | Restricciones obligatorias |
|---|---|---|---|
| 0 — Survival | ❌ | Solo educación | — |
| 1 — Market Foundations | ❌ | Simulación | — |
| 2 — Risk & Probability | 🟡 Sí, limitado | Paper / microcapital | riesgo mínimo, sin apalancamiento agresivo, sin martingala, sin aumentar tamaño tras pérdidas, nº operaciones limitado, diario obligatorio, stop definido antes de entrar, pérdida máx. diaria/semanal, revisión periódica |
| 3 — Reading the Market | 🟢 Sí | Microcapital | objetivo = aprender ejecución, no ganar dinero |
| 4-5 — Analysis/Frameworks | 🟢 Sí | Microcapital/especialización | — |
| 6 — Strategy Engineering | 🟢 Sí | Sistema definido | puede decir "esta es mi estrategia", NO "esta estrategia tiene edge" |
| 7 — Research & Validation | 🟢 Operativa seria | Estrategia validada | ver Barrera Profesional abajo |
| 8 — Execution & Psychology | 🟢 | Escalado progresivo | — |
| 9+ — Professional | 🏆 | Portfolio/profesional | — |

Lema: *"Opera pronto, pero arriesga tarde."* / *"You don't need to wait until you're an
expert to trade. But you need to know what you're risking before you trade."*

### Barrera profesional antes de escalar capital (Nivel 7) — 10 condiciones

1. Backtest con muestra suficiente. 2. Resultados razonables out-of-sample.
3. Costes incluidos en el cálculo. 4. Robustez (no depende de un parámetro mágico).
5. Distribución conocida vía Monte Carlo. 6. Conoce su drawdown potencial.
7. Ejecución disciplinada demostrada (adherencia a reglas). 8. Journal con datos
suficientes sobre su comportamiento. 9. Sin conductas destructivas (chasing, revenge).
10. Puede sobrevivir al peor escenario razonable (risk of ruin controlado).

**Implicación de producto:** el Nivel 2 (Risk & Probability) debería ser el punto donde
la app empiece a desbloquear funcionalidad real (marcar un setup con capital real,
habilitar alertas de límite de pérdida diaria/semanal) — conecta directamente con
`trading_plan.py` y su lógica de `risk` (ver Sección 0.1).

---

## SECCIÓN 4 — Performance Center (cuarta capa de producto, sobre datos reales)

Distinto del currículo: es funcionalidad de producto sobre el Trading Journal existente.

### 4.1 Las 4 capas de la plataforma

1. 📚 ACADEMY — What do I know? (los 84 módulos)
2. 🧪 LAB — What works? (Backtest Validation, Setup Builder)
3. 🏟️ TRADING ARENA — Can I execute it? (Live/paper trading + Journal)
4. 🩺 PERFORMANCE CENTER — Is my trader/system healthy? (nuevo)

### 4.2 Separación de resultados (feature central, requiere loguear 2 valores por trade)

1. **Market Outcome** — qué hizo el mercado.
2. **Strategy Outcome** — qué habría hecho el sistema (backtest teórico).
3. **Trader Outcome** — qué hizo realmente el trader.

Ejemplo trabajado: Strategy +0.32R vs Trader −0.08R → diagnóstico: *execution deficit*,
no problema de estrategia.

### 4.3 Process Score (fórmula, calculable sobre datos ya existentes en el Journal)

```
ProcessScore = 25% Risk + 25% Rules + 20% Execution + 15% Journal + 15% Review
```

No mide si ganó, mide calidad de ejecución del proceso. Trade ganador con Process Score
42/100 = ganó haciéndolo mal. Trade perdedor con 96/100 = perdió haciéndolo bien.

### 4.4 Trader Performance Dashboard (campos a mostrar, agregación de datos existentes)

Capital, Current equity, Return, Max Drawdown, Expectancy, Profit Factor, Win Rate,
Avg Winner, Avg Loser, Average Risk, Rule Adherence %, Execution Score, Psychological Score.

Dos gráficos simultáneos: **Equity Curve vs Process Curve** — permite el caso "Equity ↓
pero Process ↑" (mejorando ejecución durante varianza negativa).

### 4.5 Psicología cuantificada (requiere 2 campos nuevos pre/post trade en el Journal)

Pre-trade: confidence, stress, fatigue, FOMO, conviction.
Post-trade: regret, frustration, urge to revenge, satisfaction.
Output esperado: "operaciones con FOMO → −0.31R expectancy" (cruce real con expectancy
ya calculado en `performance.py`).

### 4.6 System Lifecycle

IDEA → RESEARCH → BACKTEST → VALIDATION → PAPER → MICRO LIVE → LIVE → MONITOR →
REVIEW → ADAPT → RETIRE/REBUILD.

### 4.7 System Health Score + System DNA (ficha por estrategia, modelo de datos nuevo)

Campos: Market, Timeframe, Regime, Signal, Entry, Stop, Exit, Risk %, Expected edge,
Historical DD, Minimum sample, Validated until (fecha), Failure conditions.

### 4.8 System Check-up (automatización cada 30 operaciones)

Evalúa: Risk, Performance, Execution, Market, Behaviour, Statistics (significancia).
Output: 🟢 Continue / 🟡 Monitor / 🟠 Reduce size / 🔴 Pause / ⚫ Retire.
Regla: no abandonar un sistema por mala racha sin investigar, pero tampoco mantenerlo
por apego — reglas objetivas, no emocionales (evita "strategy hopping").

### 4.9 Prioridad de implementación (de más barato a más caro)

1. Añadir 2 campos al Journal existente: "% reglas seguidas" y "resultado teórico del
   sistema" → permite calcular Trader vs Strategy Outcome y Process Score básico sin
   arquitectura nueva.
2. Dashboard visual (agregación de datos ya existentes).
3. System DNA / Health / Check-up (requiere modelo de datos nuevo por estrategia).

---

## SECCIÓN 5 — Psychology & Self-Mastery (columna vertebral transversal)

No es un módulo aislado en el Nivel 8 — debe aparecer en todos los niveles.

### 5.1 Los 12 módulos (~60-70 submódulos), amplían `getPsychSolutions` existente

1. Psychology Foundations. 2. Cognitive Biases (confirmation, availability, anchoring,
hindsight, outcome, self-attribution, overconfidence, loss aversion, status quo,
recency, representativeness, sunk cost, gambler's fallacy, hot-hand fallacy — cada uno
con ejemplo de cómo aparece EN una operación). 3. Probability Psychology (randomness,
streaks, law of small numbers, regression to the mean). 4. Loss Psychology (fear of
loss, disposition effect, moving stops, averaging losers, revenge). 5. Winning
Psychology (overconfidence tras ganar, size escalation — ejemplo +10R en 2 semanas →
0.5%→3% de riesgo). 6. FOMO (con "No Trade Protocol" evaluable). 7. Revenge Trading
(ciclo Loss→Emotion→Threat→Urge→Oversize→Loss + Revenge Prevention Protocol). 8. Tilt
(soft, hard, winner's, revenge, boredom). 9. Discipline & Habit Formation
(precommitment, environment design, friction, checklists — ej. "si pierdo 2R → cierro
plataforma X tiempo"). 10. Performance Psychology (focus, decision fatigue, sleep,
cognitive load). 11. Identity (de "soy un trader ganador" a "soy alguien que sigue un
proceso probabilístico"). 12. Self-Mastery (modelo Trigger→Thought→Emotion→Behaviour→
Result→Cost).

### 5.2 Psychological Performance Lab (cruza Journal existente con estado emocional)

| Estado emocional | Expectancy (ejemplo) |
|---|---|
| Calm | +0.28R |
| FOMO | −0.41R |
| Revenge | −0.72R |
| Overconfidence | −0.19R |
| Neutral | +0.17R |

### 5.3 Self-Mastery Score (SMS)

```
SMS = 20% Rule Adherence + 20% Risk Discipline + 20% Emotional Control
    + 20% Process Consistency + 20% Review Quality
```

Complementa el Process Score (Sección 4.3): Process Score mide el trade individual,
SMS mide el patrón de comportamiento a lo largo del tiempo.

### 5.4 Psicología transversal por nivel

Nivel 0: ¿por qué quieres hacer trading? · Nivel 2: ¿cómo reaccionas ante pérdidas? ·
Nivel 3: ¿aceptas incertidumbre? · Nivel 6: ¿sigues reglas? · Nivel 7: ¿soportas un
drawdown estadísticamente normal? · Nivel 8: ¿ejecutas sin desviarte? · Nivel 9:
¿escalas capital sin aumentar irracionalmente el riesgo?

---

## SECCIÓN 6 — Módulo Law of Large Numbers (anexo al Nivel 2)

Insertar como 2.6b, antes de 2.7 Drawdown & Ruin.

Submódulos: Randomness · Sample vs Population · Law of Large Numbers (weak/strong,
nivel conceptual) · Expected Value · Variance · Central Limit Theorem · Standard Error
· Sample Size · Confidence Intervals · Streaks · Monte Carlo · Risk of Ruin ·
Practical Trading Experiment · Mastery Test.

Progresión pedagógica completa: Probability → LLN → CLT → Confidence Intervals →
Monte Carlo → Backtesting → Out-of-Sample → Live Trading.

Simulación asociada: slider de trades (10→50→100→1,000→10,000) mostrando cómo la media
realizada converge hacia la expectativa teórica, con expectancy variable (+0.35R→0R→−0.20R).

Conexión con Journal ya existente: "Theoretical expectancy vs Your realized expectancy"
con el sample real del usuario (dato ya disponible en `performance.py`).

---

## SECCIÓN 7 — Retención: Trader Journey + Trader Passport

### 7.1 Principio rector

No retener con más contenido. Retener con progreso visible + práctica + sensación real
de convertirse en trader.

### 7.2 Trader Journey (dashboard de progreso, 6 dimensiones)

Knowledge, Risk Mastery, Market Reading, Strategy, Execution, Psychology — barras de %
que se actualizan con uso real, no solo lectura.

### 7.3 Trader Passport (rangos, NO gamificación infantil — advertencia explícita)

🛡️ Survival Trader → 📊 Market Apprentice → 📈 Market Reader → 🔬 Strategy Builder →
🧪 Strategy Researcher → 🎯 Trader → 🧠 Disciplined Trader → 🏆 Professional Trader.
Cada rango exige pruebas reales. Evitar XP/puntos/badges/streaks estilo Duolingo. Tono:
"Bloomberg terminal + academia + entrenador deportivo", no videojuego.

### 7.4 Learning loop (integra piezas ya existentes)

```
LEARN → PRACTICE → TRADE → JOURNAL → MEASURE → DISCOVER WEAKNESS → LEARN
```

### 7.5 Motor de "próxima prioridad"

Si Risk Mastery=92% pero Execution=54% → recomienda módulo de Execution + Order Types
+ Slippage + "20-trade challenge". Requiere mastery por competencia + regla de mínimo.

### 7.6 Hitos de "pequeñas victorias" (checklist simple, punto de entrada más barato)

Día 3: primer cálculo de position size · Día 7: 20 estructuras de mercado · Día 14:
primer plan de riesgo · Día 21: 30 trades históricos analizados · Día 30: Survival
Certification · Día 60: primer setup construido · Día 90: primer backtest completo.

### 7.7 Reposicionamiento del producto

No vender "Trading Course". Vender "Trader Development Program": ACADEMY (knowledge) +
LAB (research) + ARENA (execution) → PERFORMANCE → REVIEW → ADAPT.

---

## SECCIÓN 8 — Pedagogía multimodal (formato, no contenido)

### 8.1 Los 8 formatos y cuándo usar cada uno

1. 📖 Explainer (definiciones, 90s). 2. 🎥 Micro-video (2-7 min, una idea por vídeo).
3. 📈 Animated Chart (procesos temporales — ej. formación de HH/HL/BOS/CHOCH en vivo).
4. 🧮 Interactive Simulation (probabilidad/riesgo — sliders win rate/RR/nº trades →
expectancy/drawdown/Monte Carlo en vivo). 5. 🎮 Decision Simulator (casos de psicología
A/B/C/D + análisis de sesgo posterior). 6. 🔬 Historical Replay (oculta el futuro,
evalúa el proceso no el resultado — evita outcome bias). 7. 🧪 Experiment Lab (el
alumno elige market/timeframe/threshold, observa sample/win rate/expectancy en vivo).
8. 🏟️ Trading Challenges (retos de proceso, no de rentabilidad — ej. "50 trades sin
romper tu regla de riesgo").

Regla general: usar el medio que hace más fácil entender la naturaleza del concepto.

### 8.2 Learning Card (plantilla, ejemplo ATR)

📖 Understand → 🧮 Calculate → 👁️ Visualize → 🎮 Practice → 🧪 Experiment → 📊 Apply →
📝 Test → 🔄 Revisit (7/30/90 días).

### 8.3 Idea aplicable de inmediato (conecta Monte Carlo existente con psicología)

"Risk = 5% → simulación muestra −8R drawdown. ¿Podrías ejecutar tu estrategia después
de perder 40%?" → si el alumno dice no: *"Your mathematically optimal risk may exceed
your psychologically sustainable risk."* Cálculo simple sobre Kelly/RoR ya implementados.

### 8.4 "Today's Training" (retención sin narrativa adicional)

Lista diaria de 3-4 microtareas con tiempo estimado (ej. "10 min: identifica 10
estructuras / 8 min: escenario de psicología / 15 min: revisa tus últimos trades").

---

## SECCIÓN 9 — Inventario de calculadoras y mapeo curricular

### 9.1 Grupo A — `frontend/src/components/calculators/` (14 confirmadas)

BlackScholes, Compound, Fibonacci, Futures, Leverage, LotSize, MonteCarlo, PartialExit,
PatternTrading, Percentage, PositionSize, SimulatorPro, Spot, TargetPrice.

### 9.2 Grupo B — fuera de `calculators/` (confirmar path exacto)

Risk of Ruin, Kelly (con botón "usar mis datos del diario"), Drawdown→Recuperación,
Portfolio Heat (con correlación), Stress test de margen.

### 9.3 Plantilla de auditoría por calculadora

Qué calcula realmente · qué matemáticas utiliza · si la fórmula es correcta (verificar
contra estándar) · qué debería enseñar · qué le falta (inputs/validaciones/edge cases) ·
qué errores puede cometer un novato · qué visualización añadiría · con qué módulo(s)
del currículo de 84 conectar · su rol en la progresión novato→profesional.

### 9.4 Mapeo preliminar calculadora → módulo del currículo

| Calculadora | Módulo candidato | Nivel |
|---|---|---|
| PositionSize | 2.2 Position Sizing | 2 |
| LotSize | 2.2 Position Sizing | 2 |
| Leverage | 1.5 Leverage & Margin | 1 |
| RiskOfRuin | 2.7 Drawdown & Ruin | 2 |
| Kelly | 2.2 Position Sizing (avanzado) | 2 |
| MonteCarlo | 2.8 Monte Carlo | 2 |
| DrawdownRecovery | 2.7 Drawdown & Ruin | 2 |
| Compound | 2.1 Risk Management | 2 |
| Fibonacci | 3.x Reading the Market | 3 |
| TargetPrice | 6.5 Exit | 6 |
| PartialExit | 6.5 Exit | 6 |
| PatternTrading | 3.x / 5.x Frameworks | 3-5 |
| SimulatorPro | 7.x Research & Validation | 7 |
| Futures / Spot | 1.1 Financial Markets | 1 |
| Percentage | 2.4 Expectancy | 2 |
| BlackScholes | 10.1 Options | 10 |
| PortfolioHeat | 9.2 Correlation | 9 |
| Stress test margen | 1.5 / 9.x | 1/9 |

### 9.5 Reorganización propuesta (labs temáticos en vez de "17 calculadoras")

**Risk Lab**: Position sizing, Risk per trade, Drawdown, Risk of ruin, Portfolio risk.
**Probability Lab**: Expectancy, Probability, Sample size, Monte Carlo, Distribution.
**Strategy Lab**: R:R, Break-even, Backtesting, Performance.
**Options Lab**: Black-Scholes, Greeks, Implied volatility.

Cada calculadora, plantilla de 7 capas: 📚 Aprende (concepto) → 🧮 Calcula → 📈
Visualiza → 🎮 Practica → 🧪 Experimenta (cambia parámetros) → 📝 Demuestra (quiz/caso)
→ 📊 Aplica (a su propio sistema).

---

## SECCIÓN 10 — Evidence System (transversal a todo el currículo)

Sustituye "High Reliability" / etiquetas ambiguas por badge visible con 4 niveles:

🟢 Strong empirical evidence · 🟡 Mixed evidence · 🟠 Limited evidence · 🔴 Disputed.

Cuando exista estadística, mostrar siempre metadata completa:
```
Historical success rate: X%
Sample: N
Market: X
Period: X
Definition of success: X
```

Clasificación por framework (aplicar a Nivel 5 completo):

| Framework | Evidencia |
|---|---|
| Dow | Alta |
| Wyckoff | Mixta |
| Elliott | Interpretativo |
| Gann | Discutido |
| ICT/SMC | Requiere separar observación de narrativa |
| Harmonics | Riesgo de overfitting visual — requiere tolerancias explícitas |

Advertencia obligatoria junto a cualquier win rate: nunca solo, siempre con expectancy +
sample + drawdown + costs. Ejemplo trabajado: Sistema A (60% wins, +0.5R/−1R) →
E=−0.10R (pierde dinero) vs Sistema B (40% wins, +2R/−1R) → E=+0.2R (gana dinero).

**"Saber decir NO SÉ" como competencia evaluable**: ante "¿este patrón va a subir?", la
respuesta correcta no es sí/no, es *"No puedo saberlo. Puedo estimar una distribución
condicional bajo determinadas condiciones."*

---

## SECCIÓN 11 — Trading Residency (certificación por competencia demostrada)

No certificado por consumo de contenido — certificado por demostración:

1. Paper Trading con reglas. 2. 20 operaciones auditadas. 3. 100 operaciones registradas.
4. Expectancy positiva demostrada. 5. Drawdown controlado. 6. Backtest documentado.
7. Presentación de una tesis de trading.

### Matriz de Competencias (sustituye "% módulos completados")

| Competencia | Novato | Intermedio | Profesional |
|---|---|---|---|
| Calcula riesgo | ✓ | ✓ | ✓ |
| Construye setup | ✗ | ✓ | ✓ |
| Valida estrategia | ✗ | ✗ | ✓ |
| Detecta overfitting | ✗ | ✗ | ✓ |
| Interpreta macro | ✗ | ✓ | ✓ |
| Gestiona drawdown | ✗ | ✓ | ✓ |
| Justifica una tesis con datos | ✗ | ✗ | ✓ |

---

## SECCIÓN 12 — Arquitectura de información propuesta (IA/navegación)

### 12.1 Ciclo central (resume toda la plataforma)

```
LEARN → PRACTICE → APPLY → TRADE → JOURNAL → ANALYTICS → REVIEW → IMPROVE → (vuelve a LEARN)
```

### 12.2 Navegación global post-login (reducida, sin competir visualmente)

🏠 Dashboard · 📚 Academy · 🧪 Labs · 📓 Journal · 📊 Analytics · 📋 Trading Plan ·
🎯 Setups · 👤 Profile (Settings dentro del perfil).

### 12.3 Estructura de Academy

ACADEMY → My Path / Curriculum / Levels / Assessments / Certifications-Mastery.
Cada lección: Level → Module → Submodule → Lesson → Practice → Application →
Assessment → Mastery.

### 12.4 Estructura de Journal (unifica lo que hoy son sub-tabs de Performance)

Journal → Trades / Daily Diary / Trading Plans / Setups / Screenshots / Reviews.
**Nota de verificación:** el código actual (`PerformancePage.jsx`) ya tiene sub-tabs
Overview/Diario de Trading/Analytics + tabs plan/setups/projection — confirmar si esta
reestructuración es un rename/reorganización de lo existente o requiere nueva IA real.

### 12.5 Estructura de Analytics

Analytics → Overview / Performance / Risk / Strategy / Execution / Psychology /
Portfolio / Reports. Con sección "Insights" (auto-insights ya existe en backend, según
Sección 0.1) presentando siempre como hipótesis, nunca como causalidad automática:
ej. "Your average loss is increasing." / "Your FOMO trades have negative expectancy."

### 12.6 Estructura de Trading Plan

Goals / Markets / Risk Rules / Trading Hours / Setups / Entry Rules / Exit Rules /
No-Trade Rules / Psychology Rules / Version History. **Ya existe backend
(`trading_plan.py`, versionado) y frontend (`TradingPlanPage.jsx`) — verificar estado
real de completitud antes de proponer rediseño.**

### 12.7 Estructura de Setups

Definition / Market Conditions / Structure / Entry / Stop / Target / Invalidations /
Examples / Historical Examples / Backtest / Statistics / Checklist / Journal
Performance. Acción "Trade this setup" debería crear automáticamente la entrada
correspondiente en el Journal.

### 12.8 Onboarding propuesto (antes de dashboard)

Preguntas: Experience (beginner/intermediate/advanced) · Market (stocks/forex/
crypto/futures/options/multiple) · Objective (learn/build strategy/improve risk/
consistency/professional) · Risk profile (para adaptar educación, no para recomendar
inversiones).

### 12.9 Dashboard propuesto (centro de la aplicación)

Objetivo actual + progreso (barra %) + "continuar aprendiendo" (módulo con tiempo/
mastery%) + "Today's training" (checklist) + "your data" (expectancy/drawdown/rule
adherence reales) + "recommended" (basado en debilidad detectada por Analytics).

### 12.10 Metodología de auditoría de integración recomendada (antes de construir nada)

Clasificar cada funcionalidad existente en:
- **KEEP** — está bien y tiene sitio.
- **MOVE** — funciona, pero está mal ubicada.
- **MERGE** — dos cosas que deberían ser una.
- **CONNECT** — backend existe pero falta UI/conexión (empezar por los 33 endpoints
  huérfanos de `MAPA.md`, verificados con `gen-mapa.py --check`).
- **REDESIGN** — la función existe pero la UX/pedagogía es insuficiente.
- **REMOVE** — no aporta o genera ruido (empezar por G-30/G-31 ya documentados).

---

## SECCIÓN 13 — KPIs de producto (funnel honesto, no promesa de rentabilidad)

### 13.1 Funnel objetivo (diseño de producto, no predicción de mercado)

Registro 100% → Onboarding 80% → Level 2 (Survival) 50% → Level 5 28% →
Strategy/Validation 15% → Trader competente 7% → Professional Readiness ~3-5%.

### 13.2 Professional Readiness = competencia demostrada, no curso completado

9 criterios: Knowledge, Risk, Strategy, Research, Validation, Execution, Psychology,
Performance, Longevity (mantenido en el tiempo).

### 13.3 Métrica más honesta que "conversión a profesional"

**Survival Rate**: % de alumnos activos a 12 meses sin pérdida catastrófica.

### 13.4 KPIs por horizonte

30 días ≥70% activo · 90 días ≥50% progresando · 6 meses ≥30% en formación/práctica ·
12 meses ≥20% desarrollando su proceso · 24 meses ≥10% en fase avanzada ·
Professional Readiness 3-5% de la cohorte inicial.

---

## SECCIÓN 14 — Orden de prioridad recomendado (consolidado de todos los documentos)

Basado en el consenso repetido a lo largo de los 16 análisis (contenido nuevo siempre
en último lugar):

1. 🔴 **Verificar contra código real** — antes de cualquier acción, correr
   `python3 scripts/gen-mapa.py --check`, leer `ESTADO_PROYECTO.md` completo, y
   confirmar qué de las Secciones 0.1/0.2 sigue vigente hoy.
2. 🔴 **Reestructurar el currículo existente** (Secciones 2, 12) — no añadir 84 módulos
   nuevos; reorganizar los ~68 módulos ya existentes en la progresión de 12 niveles.
3. 🔴 **Definir competencias y mastery por módulo** (Secciones 2.3, 11) — motor de
   evaluación real, no solo "% de lectura".
4. 🔴 **Evidence System** (Sección 10) — reemplazar "High Reliability" y similares por
   badges con metadata estadística completa.
5. 🔴 **Conectar calculadoras + Journal + Analytics** (Secciones 4, 9, 12.10) —
   empezar por los "CONNECT" de la auditoría de integración, en particular los 33
   endpoints huérfanos de `MAPA.md`.
6. 🟠 **Proyectos reales y Trading Residency** (Sección 11).
7. 🟠 **Self-Mastery / Process Score** (Secciones 4.3, 5.3) — sobre datos ya existentes
   del Journal, solo requiere 2-3 campos nuevos.
8. 🟠 **Mejorar visuales/pedagogía multimodal** (Sección 8).
9. 🟢 **Contenido nuevo** (huecos reales identificados: Time Series, Market Regimes,
   Machine Learning introductorio, Research semanal) — último, no primero.

**Antes de ejecutar el punto 1 en adelante**: limpiar deuda ya identificada por el
propio proyecto (G-30 componentes muertos, G-31 residuos con instrucciones falsas) para
no construir sobre una base con ruido documental.
