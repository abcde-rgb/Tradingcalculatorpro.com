# 📓 Roadmap Journal & Analytics de opciones — de la investigación al backlog

> Destila la investigación de journals/performance analytics (teardown de tradingjournal.io,
> disciplined.me, TradeZella, TraderSync, TradesViz, Edgewonk…) en un backlog accionable para
> TradingCalculator.Pro. **Tesis:** no ser "otro journal generalista" (mercado saturado y caro),
> sino **el mejor journal de OPCIONES en español**, apoyado en el motor Black-Scholes/griegas/IV
> que la web ya tiene — un foso que casi nadie cubre (todos los journals nacieron para acciones/forex).

## Estado de implementación (esta rama)

| Métrica / función | Prioridad | Estado |
|---|:--:|:--:|
| SQN (Van Tharp, N=min(n,100)) | Avanzada | ✅ `performance_metrics.py` + UI |
| Calmar, Ulcer Index | Avanzada | ✅ backend + UI |
| Z-score de rachas (dependencia) | Avanzada | ✅ backend + UI |
| VaR / CVaR (histórico + paramétrico) | Avanzada | ✅ backend + UI |
| MAE / MFE + exit efficiency | Recomendable | ✅ backend (`mae_mfe_stats`), falta captura por trade en el alta |
| Sharpe / Sortino / expectancy / profit factor / R / drawdown | Imprescindible | ✅ ya existían |
| Calendario de PnL, curva de equity, sesgos | Imprescindible | ✅ ya existían |
| Vanna / charm (2º orden) + GEX | Diferenciador opciones | ✅ `options_math.py` (falta panel UI en workspace) |
| **R-múltiplos por trade** en el alta | Imprescindible | 🟡 el journal ya guarda `r_multiple`; revisar captura |
| **Import CSV por broker** (IBKR Flex, Tastytrade, Thinkorswim) | Imprescindible | 🔴 pendiente |
| **Journal de opciones multi-pata** (agrupación, P&L por pata, % riesgo máx, DTE) | Foso | 🔴 pendiente |
| **Griegas/IV de entrada autocalculadas** con el motor propio al registrar | Foso | 🔴 pendiente |
| **Theta capturada vs P&L real · P&L por DTE · P&L por IV rank** | Foso | 🔴 pendiente |
| **Rolls encadenados + asignaciones (wheel, base coste ajustada)** | Foso | 🔴 pendiente |
| **Playbook + rule-compliance score** ("win when followed vs broken") | Diferenciador | 🟡 hay compliance básico; falta playbook con checklist |
| **Integración calculadora → trade planificado → trade real** | Diferenciador | 🔴 pendiente |

## Lista de métricas de referencia (para `auditar-formulas`)
- **Imprescindibles:** Net/gross P&L, win rate, profit factor (>1 rentable, >2 fuerte), expectancy
  = (W%·avgWin) − (L%·avgLoss), avg win/loss, R:R, R-múltiplo, max drawdown ($ y %), rachas, nº
  trades, hold medio, comisiones.
- **Recomendables:** MAE/MFE, exit efficiency = P&L capturado / MFE, análisis por hora/día/sesión/
  símbolo/setup/emoción, distribución de R, Kelly = W − (1−W)/R, curva de equity, calendario PnL.
- **Avanzadas:** **SQN** = √N·media(R)/desv(R) (N=min(n,100)); z-score de rachas (|Z|>2 ⇒ >95%
  dependencia); Sharpe/Sortino/Calmar; **Ulcer** = √(media(DD²)); VaR/CVaR.
- **Específicas de opciones (el hueco):** win rate y P&L por estrategia (vertical, condor, straddle,
  strangle, calendar, butterfly, wheel); theta capturada vs P&L; P&L por rango de DTE (0-7/8-21/
  22-45/45+); P&L por IV rank de entrada; frecuencia de max loss (>25% ⇒ mala selección de strikes);
  frecuencia y P&L de rolls; tasa de asignación; IV entrada vs salida (IV crush).

## Arquitectura del módulo (flujo del trader)
**Planificar → Ejecutar/Registrar → Revisar → Mejorar.** El alta de opciones debe ser **multi-pata
desde el diseño del modelo de datos** (colección `trades` con `legs[]`), aunque las primeras
versiones sean de una pata: es barato hacerlo ahora y carísimo migrar después.

## Fases sugeridas
- **Fase 1 (paridad):** modelo `legs[]`, dashboard core (✅ mayormente), import CSV (IBKR/Tastytrade/
  Thinkorswim), tags/notas/screenshots, reportes por dimensión.
- **Fase 2 (foso opciones):** journal multi-pata + griegas/IV autocalculadas + analítica de opciones
  (theta capturada, DTE, IV rank) + rolls/asignaciones + integración calculadora↔trade.
- **Fase 3 (avanzado):** métricas avanzadas (✅ SQN/Calmar/Ulcer/VaR/CVaR ya hechas), playbook con
  rule-scoring, coach IA (resúmenes/leaks/what-if), auto-sync de broker (SnapTrade) — solo con >500
  usuarios activos.

## Contenido SEO (imán, en español)
"Cómo llevar un diario de opciones (2026)", calculadoras-imán (Expectancy, Profit Factor, R-múltiplo,
Kelly, **SQN**, Risk of Ruin, Sharpe/Sortino), "Theta capturada vs P&L real", "IV crush explicado",
"Cómo journalizar una iron condor / la rueda", "MAE y MFE", "Las 15 métricas de todo trader de opciones".

> Fuente: investigación del dueño (1-ago-2026). Precios de competidores fluctúan; verificar antes de citar.
