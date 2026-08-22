---
paths:
  - "backend/price_action.py"
  - "tradingview/**/*.pine"
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

## El precio de referencia va etiquetado — no lo vuelvas a llamar «ahora»

`detect_structure` publica `referencePrice`, `referenceSource` (`live` | `last_close`),
`referenceTs`, `referenceAgeSeconds`, `livePrice`, `lastClose` y
`levelsBetweenLiveAndClose`. `server.py` pide la cotización viva y se la pasa; si falla,
cae al último cierre **y lo dice en `referenceSource`**.

El backend hacía todo eso desde el 2026-08-17 y **la pantalla lo ignoraba**: enseñaba el
número con la etiqueta «último cierre» clavada aunque la fuente fuera la viva. Eso es lo
que hacía que el precio pareciera mal calculado. `ScanReading` ya lee las tres cosas —
fuente, antigüedad y niveles en disputa.

⚠️ `levelsBetweenLiveAndClose` no es decorativo: esos niveles son **soporte con una
referencia y resistencia con la otra**. Cuando hay alguno, el reparto de la escalera es
una elección, no un hecho, y hay que decirlo.

## La probabilidad se MIDE, y nunca sale sin su muestra

`level_odds.py` cuenta qué pasó en el histórico desde montajes como el actual. Tres cosas
que no se pueden relajar:

- **Los niveles de la barra `i` salen sólo de `rows[:i+1]`.** Detectarlos sobre toda la
  serie mete futuro en el pasado y todas las cifras salen infladas. Es el único fallo del
  módulo que NO se ve en el resultado.
- **`neither` se cuenta.** Descartar los casos en que no pasó nada reparte el 100 % entre
  los otros dos.
- **El porcentaje crudo no se publica solo.** Pegado al soporte, «69 % de irse al
  soporte» es geometría: está más cerca. Lo que dice algo es la ventaja contra la misma
  medición sobre la serie con los retornos barajados (`null_shuffles`). Una fórmula
  analítica no sirve: la de la ruina del jugador daba −14 puntos de «ventaja» sobre un
  paseo aleatorio puro.

## El indicador de TradingView es el MISMO algoritmo, no una versión libre

`tradingview/tcp_structure_scanner.pine` (Pine Script v6) es `price_action.py` **y**
`candle_patterns.py` portados. Si cambias un umbral, una puntuación, una tasa del
catálogo de patrones o una regla aquí, **cámbialo también allí**:

```bash
python scripts/gen-pine-twin.py                            # traduce el .pine a Python
python -m pytest backend/tests/test_pine_parity_unit.py -q  # 52 comprobaciones cifra a cifra
python scripts/verificar-pine.py                            # lo específico de la plataforma
```

`tradingview/pine_twin_generated.py` es **generado**: sale del árbol sintáctico del
`.pine`, no se escribe a mano. Todo lo numérico del indicador vive en `runScan()`; por
debajo de §11 sólo hay dibujo, y ahí no debe quedar aritmética — lo que no se puede
ejecutar fuera de TradingView tampoco se puede verificar.

Seis cosas del indicador **no** están en el backend y van marcadas como añadidas: la
tendencia del escalón superior, la sesión con sus máximos de calendario (PDH/PDL), el
cruce patrón ↔ nivel confirmado (`◆`), la **invalidación de estructura**, la **lista de
rechazos y rupturas de zona** y la **presión de la zona en curso**. Ninguna toca un
número de la lectura portada. Si alguna te parece buena idea para la web, el sitio es el
backend, no el `.pine`.

⚠️ **La presión de la zona no es una probabilidad.** Es la evidencia de la vela en curso,
acotada a 0-100 y con sus códigos. No está calibrada contra nada y no predice. Si algún
día se convierte en un porcentaje, tiene que pasar por lo mismo que `level_odds.py`:
medición contra el histórico **y** contraste contra la serie barajada. Un número que
parece una probabilidad sin serlo es exactamente lo que este proyecto no publica.

## La tolerancia hacía cinco trabajos, y la banda dibujada era relleno

Medido (2026-08-21, seis series de prueba): la extensión REAL de los pivotes que forman
un nivel es el **39 % de la banda ±tolerancia** (mediana). O sea que la zona era dos
veces y media más ancha de lo que los toques justifican, porque `zone` es
`precio ± tol` y punto, sin mirar dónde imprimieron.

El indicador dibuja ahora **dos cajas**: el **núcleo** (`coreLow`/`coreHigh`, la
extensión real de los pivotes — el dato) y el **área de reacción** (±tol, tenue — el
criterio con el que se cuentan visitas). Las dos, porque ocultar la segunda haría que
un «3 toques» sobre una caja estrecha que el precio nunca pisó pareciera un error.

Y separa dos preguntas que la misma tolerancia contestaba: *¿son el mismo nivel?*
(agrupación) y *¿está tocándolo?* (banda de visitas). Los dos controles van a **1,00
por defecto = paridad exacta con la web**, y el panel avisa en rojo cuando se mueven.

⚠️ **La banda ±tol no siempre contiene los pivotes del nivel.** El agrupador compara
contra la media CORRIENTE del grupo, que se mueve: un pivote que entró antes puede
quedar fuera de la banda final (4 % de los niveles, fuga máxima 1,29 × tol). Está
FIJADO con un test, no arreglado: tocar el agrupador rompe la paridad con el backend.

⚠️ **No estreches la agrupación por dentro «porque sale mejor».** A ×0,25 la tasa de
aguante sube del 55,8 % al 63,4 %, pero los niveles caen a 2,30 toques de media —el
mínimo—, o sea casi todos sostenidos por dos pivotes. Es un canje, y quien opera decide.
Las cifras completas están en `docs/INDICADOR_TRADINGVIEW.md` § 5a.

⚠️ **`levelReactions` y `annotateLevels` recorren la MISMA definición de visita.** Si
tocas una, toca la otra: hay un test que exige que los recuentos cuadren nivel a nivel.

Manual: [`docs/INDICADOR_TRADINGVIEW.md`](../../docs/INDICADOR_TRADINGVIEW.md).

## En el sandbox no hay red

Yahoo y los proveedores de precio están **bloqueados** en las sesiones remotas.
Cualquier smoke de `pattern-scan`, `structure-scan` o datos de mercado tiene que
**mockear la respuesta** o usar fixtures. Una prueba que llame a la red real aquí no
prueba nada.
