---
paths:
  - "backend/options_*.py"
  - "backend/american_options.py"
  - "backend/market_rates.py"
  - "frontend/src/components/options/**"
  - "frontend/src/services/optionsApi.js"
  - "frontend/src/hooks/useRiskFreeRate.js"
  - "frontend/src/pages/Options*.jsx"
---

# Opciones — vencimientos, honestidad de la cadena y orden del panel

## Cada pata tiene su PROPIO vencimiento (`expIdx`)

Las patas **no** heredan el vencimiento seleccionado arriba: eso es lo que hacía
imposibles los calendars, las diagonales y el PMCC. `CalculatorPage` mantiene un mapa
`{expIdx: chain}` y las pide en una sola llamada
(`/options/chain/{sym}?expiration_idxs=1,3,6`).

En el motor, el cuarto argumento de `calculateStrategyPayoff` son los días que le quedan
a la **pata más cercana**; de ahí se deriva el tiempo transcurrido y se aplica a cada pata
por separado.

Si añades una estrategia con patas en fechas distintas, ponle `expOffset` en la definición
de la pata — `isMultiExpiryStrategy` lo detecta solo, **no hay lista que mantener**.

## `options_positioning` se calla sobre datos modelados

Max pain, GEX, perfil de OI y ratio put/call son lecturas de interés abierto
**OBSERVADO**. Con cadena sintética el `openInterest` es `None` y todas devuelven `None`.

**No las "rellenes" con el modelo**: un max pain inventado es indistinguible en pantalla
de uno real. Hay tests que lo fijan.

## Si un endpoint puede servir cadena modelada, el frontend AVISA

El backend marca con `_synthetic_marker` (`synthetic` + `syntheticWarning`); el frontend
lo pinta con `<SyntheticDataBanner synthetic={...} />`. Ya está en la calculadora, la
cadena, la superficie de IV y el optimizador — si añades una vista que consuma esas
respuestas, móntalo también.

## El tipo libre de riesgo nunca es un literal

- **Frontend**: sale de `useRiskFreeRate()`, que consume `GET /api/market/risk-free`.
  Hay una única constante de respaldo, `FALLBACK_RISK_FREE_RATE`, y existe para que el
  motor sea llamable antes de que resuelva el fetch — **no para pasarla a propósito**.
  Un `0.05` suelto en el frontend es un bug (BUG-033).
- El endpoint publica también la procedencia: `treasury` / `stale` / `fallback`.
- **Fuente real**: `BC_3MONTH` de la Daily Treasury Par Yield Curve (dominio público)
  desde el 2026-08-02. No es `^IRX`, y **no se hardcodea 0.0525**.

## `market_rates` cachea también los fallos

No quites la ventana `FAILURE_BACKOFF_SECONDS`: sin ella, con el proveedor caído,
`get_risk_free_rate` vuelve a salir a la red **en cada llamada**, y está dentro de
`/options/chain`, `/optimize`, `/calculate/*` y `/performance/analytics`. Hay test que lo
fija.

## El orden del panel ES la feature

`CalculatorPage` va: **1** configurar (`PositionSetupBar`) → **2** resultado
(`StatsKPIBar`) → **3** gráfico + patas → **4** griegas (`GreeksStrip`) → acordeón
(`SecondaryPanels`).

Lo nuevo que sea accesorio va **dentro del acordeón y cerrado**, usando `SectionCard`. No
añadas paneles siempre abiertos ni botones de toggle sueltos al final de la página.

## `/options` es público; el workspace es `/options/calculator`

La referencia (catálogo de estrategias, fichas por slug) **no lleva muro de pago** y tiene
URL propia e indexable. La calculadora en vivo sí lo lleva y va con `noindex`. Si añades
una vista de referencia, va fuera del gate y con ruta propia.

## `american_options.py` está terminado y sin interfaz

Binomial CRR, Barone-Adesi-Whaley y riesgo de asignación temprana por dividendo. Cero
llamadas desde el frontend (hueco G-14). Lo mismo con `/options/term-structure`:
`PositioningPanel` sólo consume `/options/positioning`. **Antes de escribir algo nuevo,
mira si ya está ahí esperando una pantalla.**
