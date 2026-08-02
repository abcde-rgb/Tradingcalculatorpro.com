# El diario de opciones: investigación de mercado contra el código real — 2026-08-02

> Cruce entre la **investigación de journals del 2026-08-01** (teardown de
> tradingjournal.io, disciplined.me, journal-trading.com, tradinjournal.com +
> matriz de TraderSync / TradesViz / TradeZella / Tradervue / Edgewonk) y el
> **estado verificado del código** en `main` y en las ramas vivas.
>
> Documento fechado. Complementa a
> [`REDISENO_PARIDAD_2026-08-02.md`](./REDISENO_PARIDAD_2026-08-02.md) §6.5,
> donde está el detalle de qué pieza del diario vive en qué rama.

---

## 0. La respuesta corta

**El diario está hecho al nivel del estándar de industria genérico. El diario de
opciones —que es la tesis de la investigación y el único foso defendible— no
está empezado, y hay una decisión de modelo de datos que hay que tomar antes de
escribir la primera línea.**

De las 14 recomendaciones de la investigación: **5 hechas, 3 a medias, 1 en una
rama sin mergear, 5 sin empezar.** El detalle está en la §2.

Y lo más caro de todo está en la recomendación nº 1, la que la propia
investigación marca como *«bajo esfuerzo si se hace ahora; carísimo migrar
después»*: **el modelo de trade es de una sola pata.** `make_trade_doc`
(`performance.py:1049`) tiene `option_type`, `strike` y `expiry` en singular y
**cero apariciones de `legs`** en todo el módulo. Una iron condor hoy no se
puede registrar como una posición.

---

## 1. Lo que hay, verificado

**El diario bueno vive en `/performance`** (`TradeJournal.jsx` sobre
`/performance/trades` → colección `db.trades`):

| Pieza | Estado | Dónde |
|---|:--:|---|
| CRUD + alta masiva | ✅ | `/performance/trades`, `/bulk` |
| Importación CSV con detección de bróker | ✅ | `lib/tradeImport.js`, `TradeImportWizard.jsx` |
| Operaciones de opciones (1 pata) | ✅ | `TradeFormModal.jsx:59-116` |
| Curva de equity · calendario de PnL · distribución de R | ✅ | `AnalyticsDashboard.jsx` (540 líneas) |
| Win rate · profit factor · expectancy · avg win/loss · max DD · rachas | ✅ | `compute_analytics()` |
| Sharpe y Sortino (con anualización y flag) | ✅ | `_risk_adjusted_metrics()` |
| **MAE / MFE** con sugerencia de stop | ✅ | `compute_excursion_stats()` |
| Sesgos de comportamiento + insights automáticos | ✅ | `detect_behavioral_biases()`, `generate_insights()` |
| Detección de errores por operación | ✅ | `detect_errors()` |
| Desglose por día de la semana, setup y símbolo | ✅ | `by_day`, `by_setup`, `by_symbol` |
| Tags, emoción, notas, comisiones | ✅ | modelo de `make_trade_doc` |

Eso ya cubre lo que la investigación llama «estándar de industria imprescindible»
salvo dos detalles: **no hay desglose por hora del día** (sólo por día de la
semana) y **`screenshot_urls` existe en el modelo pero no hay interfaz de
subida** — el campo está y nadie lo rellena.

---

## 2. La investigación, recomendación por recomendación

### Fase 1 — paridad con el estándar

| # | Recomendación | Estado real | Nota |
|:--:|---|:--:|---|
| 1 | Modelo de trade robusto **con `legs[]`** | ❌ | **Una sola pata.** Ver §3 |
| 2 | Dashboard core (PnL, WR, PF, expectancy, equity, calendario) | ✅ | Completo |
| 3 | Manual + CSV; plantillas de bróker | ⚠️ | Hay 4: **MetaTrader 4/5, Interactive Brokers, Binance, Bybit** + mapeo manual. **Faltan Tastytrade y Thinkorswim/Schwab**, que son 2 de los 3 que la investigación marca como imprescindibles para opciones |
| 4 | Tags, notas, screenshots | ⚠️ | Tags/emoción/notas ✅. Screenshots: campo sí, interfaz no |
| 5 | Reportes por dimensión | ⚠️ | Día de semana, setup y símbolo ✅. **Por hora, por tag y por emoción, no** |

### Fase 2 — el foso de opciones

| # | Recomendación | Estado real | Nota |
|:--:|---|:--:|---|
| 6 | Diario multi-pata (agrupación, PnL por pata y neto, % del riesgo máximo, DTE) | ❌ | Bloqueado por el modelo de datos |
| 7 | **Griegas e IV de entrada/salida autocalculadas con el motor propio** | ❌ | El motor existe (`options_math.py`, `american_options.py`, solver de IV con guarda de identificabilidad). **No está conectado al diario.** Es, según la investigación, la mayor ventaja competitiva disponible |
| 8 | Analítica de opciones (WR por estrategia, theta capturada vs PnL, PnL por DTE, PnL por IV rank, frecuencia de max loss) | ❌ | Nada. Depende del 6 y el 7 |
| 9 | Rolls y asignaciones; wheel tracker | ⚠️ | `RollCalculator.jsx` y `/calculate/assignment` existen **como herramientas sueltas del workspace**, sin vínculo con el diario |
| 10 | Calculadora → trade planificado → trade real | ⚠️ | `/options/positions` guarda posiciones, pero **no se convierten en operaciones del diario** |

### Fase 3 — avanzado

| # | Recomendación | Estado real | Nota |
|:--:|---|:--:|---|
| 11 | SQN, Z-score, Calmar, VaR/CVaR, Kelly, MAE/MFE, exit efficiency | 🌿 **en rama** | MAE/MFE y Sharpe/Sortino ya en `main`. **SQN, Calmar, Ulcer, Z-score de rachas, VaR y CVaR están en `backend/performance_metrics.py` (195 líneas + tests) sólo en el PR #163.** Exit efficiency: no existe |
| 12 | Playbook con rule-scoring y discipline score | ⚠️ **backend completo, 0 interfaz** | `trading_plan.py`, tabla `trading_plans`, versionado y `GET /plan/compliance` existen. **Ningún fichero del frontend llama a `/plan` en ninguna rama.** Consecuencia: `detect_errors` cae siempre en las constantes por defecto y la «tasa de cumplimiento» mide la opinión de la app, no el plan del usuario |
| 13 | Coach de IA sobre el historial | ⚠️ | Existe para opciones (`/options/ai-analyze`, Anthropic). **No lee el diario** |
| 14 | Auto-sync de bróker | ❌ | Ni empezado (la investigación tampoco lo pide antes de 500 usuarios) |

### Lo que la investigación no vio y ya tienes

- **Riesgo de cartera a nivel de cuenta** (`portfolio_risk.py`): heat abierto,
  correlación, límites de pérdida con bloqueo, sizing por ATR.
- **Backtest con validación** (`backtest.py`): in-sample/out-of-sample,
  walk-forward y corrección por data snooping. Ningún journal de la matriz lo
  tiene.
- **Plan versionado con `plan_version` sellado por operación** — que un cambio de
  reglas no reescriba la historia que se supone que mide. Edgewonk y
  tradingjournal.io no lo hacen.

---

## 3. La decisión que bloquea la fase 2: `legs[]`

Hoy una operación es una fila plana con `option_type`, `strike` y `expiry`. Para
una iron condor hay dos caminos y sólo uno es aceptable:

- **Cuatro operaciones sueltas** — que es exactamente lo que la investigación
  identifica como el fallo que «destruye el win rate y el PnL» en todos los
  journals genéricos.
- **Un documento con cuatro patas.**

La migración es **barata ahora y cara luego**, y aquí lo es especialmente poco
porque **los datos ya se guardan como JSONB**: no hay `ALTER TABLE`, no hay
columnas que añadir. El trabajo es de forma del documento y de código, no de
esquema.

**Forma propuesta**, compatible hacia atrás:

```jsonc
{
  "id": "...", "user_id": "...", "symbol": "SPY",
  "instrument_type": "option",
  "strategy": "iron_condor",        // enlaza con las 66 de mockData.js
  "legs": [                          // NUEVO
    { "option_type": "put",  "side": "sell", "strike": 480, "expiry": "2026-09-19",
      "quantity": 1, "entry_price": 3.20, "exit_price": 0.90,
      "entry_greeks": { "delta": -0.28, "theta": 0.11, "vega": 0.19, "iv": 0.243 },
      "exit_greeks":  { "...": "..." } },
    { "...": "las otras tres" }
  ],
  "entry_price": null,               // se derivan de las patas: prima neta
  "exit_price": null,
  "max_risk": 700,                   // para el PnL en % del riesgo máximo
  "dte_entry": 38,
  "iv_rank_entry": 62.4
}
```

**Reglas que hay que respetar al implementarlo** (las tres de honestidad numérica
de `CLAUDE.md` aplican tal cual):

1. **Las griegas de entrada se calculan con tu motor y se sellan.** Como
   `plan_version`: se congelan al crear la operación y no se recalculan después.
   Una griega recalculada hoy sobre una operación de hace tres meses no es la
   griega con la que se entró.
2. **Lo que no se puede calcular es `None`.** Sin IV de entrada no hay «IV
   crush»: hay `—`. Sin `max_risk` no hay PnL en % del riesgo.
3. **Una operación de una pata sigue siendo válida** con `legs` de longitud 1, y
   las operaciones existentes se leen con un adaptador que las envuelve. Nada de
   migración destructiva.

Compatibilidad: `compute_trade_pnl`, `detect_errors` y `compute_analytics`
trabajan sobre `entry_price`/`exit_price`; el adaptador debe derivarlos de la
prima neta de las patas para que todo lo ya construido siga funcionando sin
tocarse. **Eso es lo que hace la migración de un día en vez de una semana.**

---

## 4. Las dos incoherencias que hay que cerrar antes

**4.1 · Hay dos diarios y uno no lleva a ninguna parte.** El dashboard monta
`components/tools/TradingJournal.jsx` (`DashboardPage.jsx:445`), que guarda en
`localStorage['trading-journal-storage']` y **no hace una sola llamada de red**.
En la misma página, `JournalStats` (`DashboardPage.jsx:276`) enseña las cifras
del diario *de rendimiento*. Quien apunta ahí ve que las estadísticas de arriba
no se mueven, y pierde lo apuntado al cambiar de dispositivo.

Decisión: **borrar el diario del dashboard y dejar en su sitio un acceso al de
rendimiento**, o convertirlo en el formulario rápido del mismo backend. Lo que no
puede seguir es que existan los dos.

Relacionado: los cuatro endpoints `POST/GET/PUT/DELETE /journal/trades` no los
llama nadie desde el frontend. Sólo se usa `/journal/stats`.

**4.2 · El plan de trading no tiene interfaz.** Es la recomendación nº 12 y es la
que más barato sale: el backend está terminado y probado. Falta el asistente de
5 pasos, la migración de `tcp-trading-setup` (hoy en localStorage, en
`components/education/tradingSystemModel.js`) y el bloque de cumplimiento en
`AnalyticsDashboard`. **Sin eso, el rule-scoring que la investigación pone como
diferenciador está construido y apagado.**

---

## 5. Plan de construcción

Ordenado por *lo que desbloquea*, no por dificultad.

| Fase | Trabajo | Esfuerzo | Desbloquea |
|:--:|---|:--:|---|
| **J0** | Mergear el PR #163 → SQN, Calmar, Ulcer, Z-score, VaR/CVaR entran en `main` | 1 h | Recomendación 11, ya escrita |
| **J1** | Resolver los dos diarios (§4.1) y publicar el editor de plan (§4.2) | 3-4 d | Recomendación 12; deja de mentir la tasa de cumplimiento |
| **J2** | **`legs[]` + adaptador de compatibilidad** | 2-3 d | Toda la fase 2 de la investigación |
| **J3** | Formulario multi-pata + agrupación + PnL por pata y neto + % del riesgo máximo + DTE de entrada | 4-5 d | Recomendación 6 |
| **J4** | **Griegas e IV de entrada/salida autocalculadas** al guardar, selladas | 2-3 d | Recomendación 7 — **el foso** |
| **J5** | Analítica de opciones: WR por estrategia, theta capturada vs PnL real, PnL por rango de DTE, PnL por IV rank, frecuencia de max loss | 4-5 d | Recomendación 8 |
| **J6** | Plantillas CSV de **Tastytrade y Thinkorswim/Schwab** + subida de screenshots + desglose por hora | 3-4 d | Cierra la fase 1 |
| **J7** | Rolls encadenados, asignación → posición de acciones, wheel tracker | 5-7 d | Recomendación 9 |
| **J8** | Posición guardada del workspace → operación planificada → operación real | 2-3 d | Recomendación 10, une calculadora y diario |
| **J9** | El coach de IA lee el diario (hoy sólo lee la posición de opciones) | 2-3 d | Recomendación 13 |

**J4 es el que hay que enseñar en la portada.** Ningún competidor de la matriz
calcula las griegas por sí mismo: dependen de que el bróker las exporte. Tú
tienes Black-Scholes, binomial CRR, Barone-Adesi-Whaley y un solver de IV con
guarda de identificabilidad. **Puedes journalizar opciones de un bróker que
exporte un CSV pobre, y ellos no.**

---

## 6. Lo que yo no haría

- **Auto-sync de bróker** (recomendación 14). Alta complejidad, frágil, y la
  propia investigación pone el umbral en >500 usuarios activos.
- **Simulador de cadena histórica.** Necesita histórico de cadenas que no tienes
  y que es caro de comprar.
- **Competir como journal generalista.** El mercado está saturado y los líderes
  cobran 30-99 $/mes con auto-sync de 500 brókers. Tu ángulo es el que dice la
  investigación: **el mejor diario de opciones en español, apoyado en un motor
  que ya está construido y que los demás no tienen.**
