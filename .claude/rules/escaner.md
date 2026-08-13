---
paths:
  - "backend/price_action.py"
  - "backend/candle_patterns.py"
  - "backend/timeframes.py"
  - "frontend/src/components/charts/**"
---

# Escáner de estructura y patrones

Manual completo: [`docs/ESCANER_ESTRUCTURA.md`](../../docs/ESCANER_ESTRUCTURA.md).

## El escáner ordena por importancia, igual que el panel de opciones

`StructureScanner.jsx` **sólo compone**: 1 configurar → 2 lectura → 3 escalera de niveles
→ lo accesorio en `SectionCard` **plegado y con contador**.

Las piezas viven en `frontend/src/components/charts/structure/` (constantes, hook de
escaneo y un panel por bloque). **No vuelvas a meter lógica de fetch ni tablas de tickers
en el archivo que compone.**

## *Sin comprobar* y *comprobado sin coincidencias* son cosas distintas

`counts.confluent` es `null` cuando no se ha leído el escalón superior, **nunca `0`**.

Y la confluencia **no** suma a la puntuación de confirmación: esa mide sólo las velas
escaneadas.

## `price_action.py` es un módulo puro

La confluencia necesita una segunda serie, así que la pide `server.py` y se aplica con
`apply_confluence`. No metas fetch dentro del módulo.

## ⚠️ El precio de referencia de soportes/resistencias no está etiquetado

`detect_sr_levels` reparte soporte/resistencia comparando contra
`current_price = rows[-1].get("close")` — **el cierre de la última vela de la
temporalidad pedida**, que no es «el precio ahora»: en diario después del cierre es el
cierre de hoy, un sábado es el del viernes, y el feed de Yahoo va retrasado en muchos
mercados.

El arreglo (etiquetar fuente, fecha y antigüedad de la referencia, y aceptar cotización
viva) **está escrito y sin fusionar** en el PR #162, rama
`claude/escaneres-datos-honestos`. Si tocas esta zona, mira ese PR antes de reescribirlo.

## En el sandbox no hay red

Yahoo y los proveedores de precio están **bloqueados** en las sesiones remotas.
Cualquier smoke de `pattern-scan`, `structure-scan` o datos de mercado tiene que
**mockear la respuesta** o usar fixtures. Una prueba que llame a la red real aquí no
prueba nada.
