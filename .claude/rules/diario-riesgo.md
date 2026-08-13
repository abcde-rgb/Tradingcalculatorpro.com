---
paths:
  - "backend/performance.py"
  - "backend/instruments.py"
  - "backend/trading_plan.py"
  - "backend/portfolio_risk.py"
  - "backend/backtest.py"
  - "frontend/src/components/performance/**"
  - "frontend/src/lib/instruments.js"
  - "frontend/src/lib/instrumentSpecs.generated.js"
  - "frontend/src/lib/tradingSystem.js"
  - "frontend/src/services/performanceApi.js"
---

# Diario, P&L y riesgo — las reglas que ya costaron bugs

## El apalancamiento NO entra en el P&L. Nunca.

```
P&L = (salida − entrada) × cantidad × multiplicador
```

`multiplier` es el **tamaño de contrato** (100 onzas por lote de oro, 50 $/punto del
E-mini, 100 acciones por contrato de opciones), **no la palanca**.

El apalancamiento decide el **margen** (`nocional / leverage`), la rentabilidad sobre ese
margen (`roe_pct`) y la liquidación. Meterlo en la fórmula multiplica el resultado por
veinte y hace que el diario no cuadre jamás con el extracto.

Hay un test parametrizado a 1/5/20/100× que lo fija, y existe porque **el diario legado sí
lo metía**: `normalize_trade_schema` mapea `leverage`→`multiplier` sólo dentro de un
documento camelCase, y por eso `is_legacy_trade` mira **únicamente** las claves camelCase.
Si `leverage` a secas marcara un documento como legado, una operación nueva a 20× vería su
P&L multiplicado por veinte (BUG-046).

## Un riesgo sin tamaño de contrato es un riesgo falso

La regla `oversize` medía `|entrada − stop| × cantidad` y no saltaba nunca en opciones
(×100) ni en forex (×100 000) — BUG-045. Cualquier cifra de riesgo nueva se calcula sobre
`_effective_contract_size(trade)`, que es el mismo resolutor que usa el P&L.

## Un símbolo fuera de catálogo vale `None`, no 1

Un contrato de crudo a ×1 en vez de ×1000 no da un P&L aproximado: da uno **mil veces
menor**. El caso se señala con el error `contract_size_missing` y el formulario pide el
número.

## El tope de tamaño se mide en exposición, no en la X

`nocional / saldo`, tope 10× por defecto, declarable en
`plan["risk"]["max_exposure_multiple"]`. 100× sobre un tamaño pequeño no es una posición
grande; 20× sobre medio patrimonio, sí.

## En riesgo definido, el R sale de `max_loss`, no del stop

Una opción comprada arriesga la prima; un spread, anchura − crédito; una vendida desnuda
**no tiene** pérdida máxima (`None`, y por tanto sin R). Es lo que permite que opciones y
futuros se midan con la misma regla en el mismo diario.

## Las unidades del stop y del objetivo son una capa de ENTRADA

El usuario escribe en pips, ticks, dinero, % de la cuenta o R; lo que se **almacena** es
siempre un **nivel de precio** en `sl` y `tp`. `sl_input`/`sl_unit` viajan al lado sólo
para repintar el formulario, y **ninguna métrica los mira** — es lo que permite que R,
drawdown, MAE/MFE y la distribución sigan midiendo lo mismo que antes de que las unidades
existieran.

Si tocas `resolve_levels`: el objetivo en R necesita el stop ya resuelto, y lo no
convertible es `None`, nunca 0.

## Un trade lleva `setups` (LISTA), no `setup`

La cadena `setup` sobrevive como campo **derivado** —unida por `SETUP_SEPARATOR`
(`" · "`, el mismo literal en `backend/performance.py` y en `lib/tradingSystem.js`)— para
el CSV, el prompt del coach y la tabla del diario.

Normaliza siempre con `normalize_setups` (recorta, deduplica sin distinguir mayúsculas,
quita el separador de dentro de un nombre y corta en 5). Si tocas la edición, **recalcula
lista y cadena juntas**.

En la analítica, un trade con dos setups cuenta en **los dos** grupos: por eso la suma de
`by_setup` supera el número de operaciones y la respuesta publica `setups_multi_tagged`
para poder decirlo.

## Los setups del usuario viven en `lib/tradingSystem.js`, no en la Academia

Se definen en `SetupBuilder` —montado en dos sitios, Academia y la pestaña Setups de
`/performance`— y se **usan** en el diario, cuyo campo de setup admite además texto libre
a propósito.

Al cruzarlos con la analítica (`joinSetupPerformance`): un setup definido y sin operar es
**sin muestra**, nunca un 0 % de acierto; y lo operado con un nombre que no está en el
sistema va **aparte** — puede ser una errata o una operación fuera del plan, y fundirlo
con otro grupo borra las dos lecturas.

## Los umbrales de riesgo salen del plan del usuario, no de constantes

`DEFAULT_MIN_RR` y `DEFAULT_MAX_RISK_PCT` en `performance.py` son sólo el fallback para
quien no tiene plan; con plan manda `plan["risk"]`. Si añades una regla a `detect_errors`,
su umbral va en el modelo de `trading_plan.py`, y **un límite sin declarar es `None`
(regla callada), nunca 0**.

## `plan_version` se sella al crear la operación y no se reescribe

Cambiar el plan no debe re-juzgar retroactivamente la historia que se supone que mide.

## Un consejo de tamaño necesita muestra EN EL ORIGEN

No sólo en el sitio que lo pinta. `suggested_stop_r` vale `None` por debajo de
`MIN_WINNERS_FOR_STOP_ADVICE`; no lo calcules "y que el consumidor decida".

## El catálogo de instrumentos se GENERA hacia el frontend

`instruments.py` es la fuente. `python scripts/gen-instruments-js.py` escribe
`frontend/src/lib/instrumentSpecs.generated.js`, y `--check` falla si divergen.
**No edites el `.generated.js` a mano.**

La **matemática** sí está escrita dos veces a propósito (`lib/instruments.js`): el
navegador tiene que avisar del tope mientras escribes y el backend no puede fiarse del
cliente. Las dos copias se comprueban con los mismos números en `test_instruments_unit.py`
y en `engine-check.js`.

## Terminado y sin interfaz (G-14)

`trading_plan.py` (`/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance`),
`backtest.py` (`/backtest/validate`, `/backtest/strategies`) y `portfolio_risk.py`
(`/performance/portfolio-risk`) están escritos, probados y **sin una sola pantalla**.
Especificación del asistente del plan en `docs/PLAN_DE_TRADING_spec.md`.

## Dos fuentes de verdad para las mismas estadísticas (G-22)

`dashboard/JournalStats.jsx` y `education/ExpectancyCalculator.jsx` leen `/journal/stats`;
`services/performanceApi.js` y `education/JournalEdgeButton.jsx` leen
`/performance/analytics`. Fórmulas distintas sobre la misma colección → **el usuario ve
dos expectancies distintas según la pantalla**. Si tocas una, mira la otra.
