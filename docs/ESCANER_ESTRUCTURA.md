# Escáner de Estructura de Precio — qué hace bien, qué no, y cómo confirma

**Última revisión:** 2026-08-05
**Código:** `backend/terminal/price_action.py`, `backend/timeframes.py`,
`backend/terminal/candle_patterns.py`, `backend/terminal/chart_patterns.py`
(2026-09-06, ver G-40), `backend/server.py` (`/api/education/structure-scan/{symbol}`,
`/api/education/pattern-scan/{symbol}`, `/api/education/chart-pattern-scan/{symbol}`,
`/api/education/scan-timeframes`),
`frontend/src/components/charts/StructureScanner.jsx` + `frontend/src/components/charts/structure/`,
`frontend/src/lib/structureLog.js`
**Tests:** `backend/tests/test_price_action_unit.py` (60),
`backend/tests/test_timeframes_unit.py` (40),
`backend/tests/test_candle_patterns_unit.py` (23),
`backend/tests/test_structure_scan_routes_unit.py` (6, ruta con el lector OHLC mockeado)

Este documento es el manual honesto del escáner: lo que detecta de forma fiable,
lo que **no** detecta, dónde se equivoca y por qué, y qué significa exactamente
cada etiqueta de "confirmado" que ve el usuario. Está escrito para que nadie
—ni tú, ni yo en la siguiente sesión, ni un usuario— asuma capacidades que la
herramienta no tiene.

---

## 1. Qué es (y qué no es)

El escáner lee **velas OHLC reales** y aplica **reglas deterministas**. No hay
IA, no hay modelo estadístico entrenado, no hay predicción. Dos ejecuciones con
los mismos datos dan exactamente el mismo resultado.

Lo que produce:

| Bloque | Qué es |
|---|---|
| Swings (pivotes fractales) | Máximos/mínimos locales: el esqueleto de la tendencia |
| Estructura HH/HL/LH/LL | Etiqueta cada swing contra el anterior del mismo tipo → tendencia |
| BOS / CHoCH | Rupturas de estructura a favor / en contra de la tendencia previa, **numeradas** cuando caen sobre el mismo nivel |
| Soportes y resistencias | Niveles horizontales por agrupación de swings **+ el lado del precio actual**, con su **zona** y su distancia en % y en ATR |
| Confluencia | Niveles que **también** existen en el escalón superior de la escalera |
| Contexto | Recorrido hasta el nivel más cercano por lado y posición dentro de ese rango |
| Fair Value Gaps | Desequilibrios de 3 velas, marcados como abiertos, rellenados o **hueco de sesión** |
| Breakouts / fakeouts | Ruptura confirmada de un nivel vs. barrido de liquidez |

Lo que **no** es: no es una señal de compra/venta, no calcula probabilidad de
éxito, no tiene en cuenta fundamentales, noticias ni contexto macro, y no sabe
en qué sesión (Londres/Nueva York) está el mercado.

---

## 1b. Cómo está organizado el código (revisión 2026-08-05)

Los dos archivos habían crecido por acumulación: los ayudantes quedaban por
debajo de quien los llamaba y el orden de lectura ya no coincidía con el orden
del cálculo.

**`backend/price_action.py`** está apilado en el orden en que fluyen los datos,
lo barato primero, con el índice en el docstring del módulo:

```
§0  Ayudantes         ATR, volumen medio, lado de la banda, espaciado de velas
§1  Swings            §2 Estructura      §3 Rupturas (+ agrupación de repetidas)
§4  Niveles           §5 Evidencia       §6 Desequilibrios   §7 Breakouts
§8  Confluencia       §9 Contexto        §10 Entrada pública (detect_structure)
```

De §1 a §7 se responde *qué hay en este gráfico*; §8 y §9 responden *qué
significa para el precio de ahora*. La frontera importa: la confluencia con
otra temporalidad **no** entra en la puntuación de confirmación, porque esa
puntuación mide sólo las velas escaneadas. Un número que significara dos cosas
a la vez no significaría ninguna.

**La interfaz** era un archivo de 730 líneas donde la tabla de tickers, la
lógica de reintento y el marcado de cada nivel compartían sitio. Ahora
`StructureScanner.jsx` **sólo compone** (~200 líneas) y el resto vive en
`frontend/src/components/charts/structure/`:

| Archivo | Qué es |
|---|---|
| `scannerMeta.js` | Constantes: tickers del proveedor, escalera de respaldo, mapas de color, códigos→claves i18n, formato de precio |
| `useStructureScan.js` | Lo que *hace*: escalera, los dos escaneos, supersesión de peticiones, registro persistente |
| `ScanControls.jsx` | Paso 1: vela + histórico, y los avisos honestos (ajuste, vela compuesta, vela sin cerrar) |
| `ScanReading.jsx` | Paso 2: tendencia, recorrido por lado (% y ATR) y posición en el rango |
| `LevelLadder.jsx` | Paso 3: la escalera de precio, con zona, polaridad y confluencia |
| `StructureEvents.jsx` · `CandleSignals.jsx` · `FvgList.jsx` · `ScanLog.jsx` · `ScanStats.jsx` | Los bloques accesorios |

**El orden de la pantalla es la funcionalidad**, igual que en el panel de
opciones: 1 configurar → 2 lectura → 3 niveles → lo accesorio dentro de
`SectionCard` plegado. Antes los ocho bloques se apilaban siempre abiertos y
con el mismo peso visual, así que la respuesta —¿estoy comprando contra una
resistencia?— había que buscarla. Nada se ha escondido: cada sección plegada
lleva su contador en la cabecera.

---

## 2. El cambio grande de esta revisión: el rol lo decide el precio

### Cómo estaba (y por qué era un error grave)

`detect_sr_levels` etiquetaba un nivel como **resistencia** cuando lo habían
formado más máximos que mínimos, y como **soporte** en el caso contrario. El
precio actual no entraba en la ecuación.

Consecuencia real: un techo que el precio ya había roto y sobre el que ahora se
apoyaba seguía apareciendo como *resistencia*. Es el error más caro que podía
cometer esta herramienta, porque **invierte la operativa**: el usuario ve
"resistencia" donde en realidad tiene un soporte bajo los pies.

### Cómo está ahora

```
nivel POR ENCIMA del precio actual  →  resistencia
nivel POR DEBAJO del precio actual  →  soporte
nivel exactamente en el precio      →  pivote (está en juego ahora)
```

Sin excepciones y sin depender de cómo se formó. El origen se conserva aparte:

- `origin`: `highs` (se formó con máximos), `lows` (con mínimos) o `mixed`.
- `flipped`: `true` cuando el origen y el rol actual no coinciden. **No es un
  error**: es *cambio de polaridad*, uno de los comportamientos más fiables de
  la acción del precio (resistencia rota → soporte, y viceversa). Se muestra con
  una etiqueta ámbar en vez de esconderse.
- `distancePct`: distancia con signo respecto al precio (`+` arriba, `−` abajo).

Además el backend devuelve `nearestResistance` y `nearestSupport` ya calculados,
y los niveles vienen **ordenados por cercanía al precio**, no por número de
toques: el nivel al que el precio va a llegar en la próxima hora importa más que
uno de hace seis meses con un toque más.

La interfaz lo pinta como una **escalera de precio**: resistencias arriba
(la más lejana primero), la banda del precio actual en el medio, soportes
debajo. Se lee igual que un gráfico.

> Verificado en `test_a_level_above_price_is_resistance_even_if_formed_by_lows`,
> `test_a_level_below_price_is_support_even_if_formed_by_highs`,
> `test_distance_sign_matches_the_side`, `test_levels_come_back_nearest_first`.

---

## 3. Temporalidades: la escalera (`backend/timeframes.py`)

### El problema que había

`interval` era un parámetro libre que se pasaba tal cual al proveedor. Dos
fallos:

1. **Sin validación.** `interval=banana` llegaba a Yahoo. Yahoo responde con un
   error que nuestro lector convierte en "lista vacía", y la interfaz mostraba
   *"sin estructura relevante"* — indistinguible de un gráfico realmente plano.
2. **Combinaciones imposibles.** El proveedor limita el histórico por
   resolución. `interval=15m&range=1y` no es "muchos datos": es un error. En la
   práctica solo funcionaba el escalón diario, porque el frontend tenía
   `interval=1d` escrito a fuego.

### La escalera actual

| Vela | Histórico disponible | Por defecto | Fuerza fractal |
|---|---|---|---|
| **5m** | 1d · 5d · 1mo | 5d | 3 |
| **15m** | 1d · 5d · 1mo | 5d | 3 |
| **30m** | 5d · 1mo | 1mo | 2 |
| **1h** | 1mo · 3mo · 6mo · 1y · **2y** | 3mo | 2 |
| **4h** ⚙️ | 3mo · 6mo · 1y · **2y** | 6mo | 2 |
| **1d** | 1mo · 3mo · 6mo · 1y · 2y · 5y · ytd · max | 6mo | 2 |
| **1wk** | 6mo · 1y · 2y · 5y · max | 2y | 2 |
| **1mo** | 1y · 2y · 5y · max | 5y | 2 |

⚙️ **4H no la sirve ningún proveedor gratuito** (los intervalos de Yahoo son
1m, 2m, 5m, 15m, 30m, 1h y 90m: no hay 4h). Como es de las temporalidades más
operadas en swing, se **compone**: se piden velas de 1h y se juntan de cuatro en
cuatro. Apertura de la primera, máximo y mínimo de las cuatro, cierre de la
última, volumen sumado. La respuesta incluye `aggregatedFrom: "1h"` para que el
cliente pueda decir que esa vela se fabrica, no se sirve. Hereda el tope de 730
días del intervalo horario, de ahí que llegue justo a 2 años.

⚠️ **Límite de la composición**: los grupos se anclan a medianoche UTC (00:00,
04:00, 08:00…). En cripto y forex, que cotizan 24/7, eso coincide exactamente
con lo que muestra cualquier plataforma. En **acciones**, cuya sesión dura 6,5 h
y abre a las 13:30 UTC, no coincide: las velas caen dentro de los tramos UTC en
vez de empezar en la apertura, y la primera y la última del día agrupan menos
horas. Anclar a la sesión de cada mercado exigiría un calendario de sesiones que
el proveedor de precios no da. Se documenta en vez de disimularlo: cambia dónde
empieza una vela de 4h, no inventa precios.

Esto cubre lo pedido: **desde 5 minutos hasta velas mensuales**, y **hasta 2
años de histórico ya desde una vela intradía** (la de 1 hora).

**Límite real que hay que conocer:** ninguna fuente gratuita sirve dos años de
velas de 15 minutos. El tope del proveedor es de **60 días para cualquier vela
por debajo de la hora** y **730 días para la hora**. Por eso 15m llega a 1 mes y
no más: para mirar dos años atrás se usa el escalón de 1h o el diario. Una
interfaz que ofreciera "15m / 2 años" estaría mintiendo, así que no se ofrece.

**Fuerza fractal por escalón.** No es cosmético: un fractal de 2 velas en 5
minutos marca cada micro-oscilación como swing, y eso genera decenas de BOS
fantasma. Los escalones rápidos usan ventana 3 por defecto. El parámetro
`strength` sigue aceptándose (1–5) para quien quiera afinarlo.

**Ajustes transparentes.** Si se pide una combinación imposible, el backend la
corrige y **lo dice**: la respuesta trae `adjustments: ["period:1y->1mo"]` y la
interfaz muestra un aviso ámbar. Nunca responde en silencio a una pregunta
distinta de la que se le hizo.

**Vela sin cerrar.** En intradía, `lastBarForming: true` avisa de que la última
vela sigue viva. Todo lo que dependa de ella (una ruptura, un swing nuevo) puede
deshacerse. Se sigue usando —ahí está el precio en vivo— pero el usuario lo ve.

> Verificado en `test_every_pair_respects_the_upstream_retention_cap` (falla en
> CI si alguien añade un par ilegal), `test_resolve_never_returns_an_illegal_pair`,
> `test_too_much_history_for_the_rung_is_clamped_to_its_maximum`.

---

## 4. Tolerancia adaptativa

Antes, agrupar swings en un nivel usaba un **0,8 % fijo**. Solo tenía sentido en
velas diarias: en 5 minutos la sesión entera puede moverse un 1 %, así que 0,8 %
fundía todos los niveles en un único bloque inútil; en un mensual de una cripto
volátil, en cambio, era tan estrecho que dos toques del mismo techo evidente
caían en grupos distintos.

Ahora la tolerancia es **medio ATR expresado en % del precio**, acotada a
`[0,15 % – 2,5 %]`. Se ensancha sola en series volátiles y se estrecha en las
tranquilas, sin tabla que mantener. La respuesta incluye `tolerancePct`, `atr` y
`atrPct` para que se vea con qué criterio se agrupó.

---

## 5. Confirmación anotada — qué significa exactamente cada etiqueta

Antes el escáner decía *"Resistencia 182,40 · 3 toques"* y ahí se acababa. Eso
no dice nada sobre si esos toques **aguantaron**: tres visitas que cerraron
todas al otro lado describen un nivel que ya no existe.

Ahora cada nivel y cada ruptura llevan un bloque `confirmation` con la evidencia
en crudo, una puntuación 0–100 y una lista de **códigos de motivo** (traducidos
en el cliente; el backend nunca envía prosa que luego habría que traducir 8
veces).

### 5.1 Niveles

Una **visita** es una racha de velas consecutivas cuyo rango toca la banda del
nivel, contada como **un solo evento**. Si diez velas se pelean dentro de la
banda, eso es el precio *comiéndose* el nivel, no diez confirmaciones.

- **Aguantada** (`held`): el precio sale de la banda por el lado por el que entró.
- **Rota** (`broken`): sale por el lado contrario.
- **En juego** (`inPlay`): la visita sigue abierta en la última vela; todavía no
  hay veredicto.

| Componente | Puntos |
|---|---|
| Número de visitas | 15 por visita, máximo 45 |
| Tasa de aguante (`held / (held + broken)`) | hasta 30 |
| Sin veredicto todavía (`untested`) | 10 neutrales |
| Visitado hace poco (≤ 10 % de la serie) | 15 (`recent`) · 8 si ≤ 35 % · 0 y `stale` si más |
| Cambio de polaridad con rotura real | 10 (`flip`) |

**`confirmed = visitas ≥ 2 y puntuación ≥ 55.`** El mínimo de dos visitas es
deliberado: la primera visita es el nacimiento del nivel. Un nivel al que nadie
ha vuelto es un dibujo, no un nivel.

Códigos: `multiTest` (3+ pruebas), `held` (aguantó ≥ 66 %), `weak` (cedió
> 60 %), `recent`, `stale`, `flip`, `inPlay`, `untested`, `noData`.

### 5.2 Rupturas (BOS / CHoCH)

| Componente | Puntos | Código |
|---|---|---|
| Cierre ≥ 0,25 ATR más allá del nivel | 25 (10 si no) | `closedThrough` |
| La vela siguiente cierra también al otro lado | 25 | `followThrough` |
| Vela de expansión (rango ≥ 1,2 ATR) | 15 | `expansion` |
| Volumen ≥ 1,3× la media de 20 | 15 | `volume` |
| Retest respetado más adelante | 20 | `retest` |

**`confirmed = puntuación ≥ 50`**, que es exactamente *"cerró claramente al otro
lado **y** la vela siguiente se quedó ahí"* — el estándar mínimo clásico para
llamar real a una ruptura. Con solo una de las dos patas se queda en 35 o menos
y se reporta como **sin confirmar**.

Medir el cierre en **ATR** y no en porcentaje es lo que hace que el mismo umbral
signifique lo mismo en velas de 5 minutos y en mensuales.

**Sin datos de volumen** (forex, índices, muchos CFD) la ruptura recibe 8 puntos
neutros en vez de 0. Ausencia de evidencia no es evidencia de ausencia; penalizar
por no tener el dato castigaría a clases de activo enteras.

> Verificado en `test_a_break_with_follow_through_and_retest_is_confirmed`,
> `test_close_through_plus_follow_through_is_the_minimum_standard`,
> `test_only_one_leg_of_evidence_is_not_enough`,
> `test_no_volume_feed_does_not_penalise_the_break`,
> `test_consecutive_bars_inside_the_band_count_as_one_visit`,
> `test_a_level_nobody_has_revisited_is_never_confirmed`.

---

## 5b. Patrones de vela: temporalidad, fechas y en qué se basa cada uno

### El problema que había

Se reportó ver "tres soldados blancos" en el registro, ir al gráfico y no
encontrarlos. **La causa era doble y las dos partes eran fallos reales.**

**(a) El registro mezclaba temporalidades.** Se guardaba por activo y nada más
(`store[symbol]`), sin anotar en qué vela se había detectado cada cosa. Una
detección de 15 minutos y una diaria caían en la misma lista, indistinguibles.
El escáner respondía a una pregunta distinta de la que el usuario miraba.

Ahora el registro se guarda por **activo + temporalidad**, cada entrada lleva su
etiqueta (`15m`, `4h`, `1d`…), el identificador incluye la temporalidad —antes
el mismo patrón en dos velas distintas compartía id y uno pisaba al otro— y cada
detección viaja desde el backend con su campo `interval`. El almacén anterior se
descarta en vez de migrarse: sus entradas no guardaron temporalidad, así que no
hay forma honesta de asignarles una.

**(b) "Tres soldados" se disparaba con velas que no lo eran.** La definición
canónica exige tres velas alcistas **de cuerpo largo** que cierran **cerca de su
máximo**. El detector solo comprobaba dirección, cierres crecientes y aperturas
dentro del cuerpo anterior. Tres velas con cuerpos del **4 % del rango** y mechas
superiores del **94 %** pasaban el filtro: exactamente la desproporción que se
veía al comparar con el gráfico.

Añadidos los dos umbrales que faltaban, para soldados y para cuervos:

| Condición | Umbral |
|---|---|
| El cuerpo domina la vela | `cuerpo ≥ 55 %` del rango |
| Poca mecha en el sentido de la marcha | `mecha ≤ 25 %` del rango |

### En qué se basa cada patrón

Cada patrón declara su `basis`, visible en la interfaz junto a la detección:

| Valor | Qué mira | Ejemplos |
|---|---|---|
| **`body`** — por el cuerpo | Apertura contra cierre. Las mechas no se miran o casi | envolvente, harami, estrella de la mañana/tarde, penetrante, nube oscura, tres interiores |
| **`wicks`** — por las mechas | Mandan las sombras; el cuerpo solo da la escala | martillo, hombre colgado, estrella fugaz, martillo invertido, pinzas |
| **`both`** — cuerpo + mechas | Hacen falta las dos a la vez | marubozu, doji de libélula/lápida, **tres soldados**, **tres cuervos**, kicker |

Reparto actual: **11 por cuerpo · 6 por mechas · 13 por ambos**.

Además cada detección trae las **medidas reales de la vela que confirma** —cuerpo,
mecha superior y mecha inferior como % del rango— para poder contrastar el aviso
con el gráfico en vez de creérselo. Las tres suman 100 % por construcción, y hay
un test que lo comprueba.

### Cuándo abre y cuándo confirma

Un patrón de tres velas ocupa tres barras. Antes solo se publicaba la fecha de la
última, así que localizarlo exigía contar velas hacia atrás a mano. Cada
detección lleva ahora:

- `start_date` / `start_index` → **primera** vela del patrón (donde se abre)
- `confirm_date` / `index` → vela que lo **confirma** (la última)
- `date` se mantiene igual que `confirm_date` por compatibilidad

En patrones de una sola vela ambas fechas coinciden, como debe ser.

### Un tercer fallo de escala, corregido de paso

`_trend_before` —lo que distingue un martillo de un hombre colgado, o una
estrella fugaz de un martillo invertido— usaba un **1 % fijo** para decidir si
venía tendencia. En velas de 5 minutos casi cualquier ventana supera el 1 %, así
que casi todo parecía tendencia y las etiquetas se intercambiaban a capricho; en
mensuales casi nada lo supera y el contexto era siempre "lateral". Ahora el
umbral se mide en **rangos medios de vela**, que es adimensional: la misma forma
significa lo mismo en cualquier escalón de la escalera y en cualquier activo,
valga 100 o 100 000.

> Verificado en `test_three_tiny_candles_with_huge_wicks_are_NOT_three_soldiers`,
> `test_a_long_upper_wick_disqualifies_a_soldier`,
> `test_trend_context_is_scale_free`,
> `test_every_detection_says_when_it_opens_and_when_it_confirms`,
> `test_metrics_add_up_to_the_whole_candle`.

---

## 5c. Lo añadido en la revisión 2026-08-05

Cuatro de las cinco cosas de esta sección estaban en la lista de "siguientes
mejoras" del propio documento. La quinta —el contexto— no estaba, y era la que
más se echaba en falta al usarlo.

### 5c.1 Confluencia multi-temporal (era la mejora #1 pendiente)

Es lo único que un escaneo de una sola temporalidad **no puede saber**: que la
resistencia que está leyendo en 15 minutos es también un nivel diario, y que por
tanto la miran traders que jamás abrirán un gráfico de 15 minutos.

Cada escaneo pide en paralelo una segunda serie —el escalón superior— y marca
los niveles que coinciden dentro de la misma tolerancia con la que se agrupan.
El mapa de escalones vive en `timeframes.py` y **no es "el siguiente de la
lista"**: subir de 5m a 15m casi no cambia la respuesta, así que salta lo
suficiente para que sea otra pregunta.

| Escalón | Se compara con | | Escalón | Se compara con |
|---|---|---|---|---|
| 5m | 1h | | 4h | 1d |
| 15m | 1h | | 1d | 1wk |
| 30m | 4h | | 1wk | 1mo |
| 1h | 4h | | 1mo | — (nada por encima) |

Tres decisiones deliberadas:

1. **No suma a la puntuación de confirmación.** Esa puntuación responde "cómo se
   comportó este nivel en las velas que escaneé"; una coincidencia en otro
   gráfico no es una observación sobre esas velas. Va como etiqueta propia.
2. **Si la segunda petición falla, el escaneo principal no cae.** La respuesta
   dice `confluence.checked = false` y `counts.confluent = null`. *Sin comprobar*
   y *comprobado sin coincidencias* son afirmaciones distintas y sólo una es
   cierta; publicar `0` para las dos sería mentir en el caso caro.
3. **Cuesta una llamada más al proveedor**, lanzada a la vez que la principal
   (`asyncio.gather`), no después. Con `?htf=0` no se pide.

> Verificado en `test_a_level_the_higher_timeframe_also_has_is_marked`,
> `test_unchecked_confluence_is_unknown_not_zero`,
> `test_confluence_does_not_touch_the_confirmation_score`,
> `test_a_failed_second_fetch_does_not_take_the_scan_down`.

### 5c.2 Huecos de sesión: el FVG que no era un FVG (limitación #1)

En intradía de acciones, el salto entre el cierre de una sesión y la apertura
siguiente **pasa el test de tres velas todas las noches**. No es un
desequilibrio que alguien haya dejado atrás: es el mercado cerrado.

Se detectan por los **timestamps**, nunca por los precios: si el hueco temporal
entre velas del grupo supera el doble del espaciado mediano de la serie, es un
cambio de sesión. Se marcan con `sessionGap: true`, bajan al final de la lista y
**no cuentan** en `fvgOpen` (van en `fvgSessionGap`). No se borran: el hueco de
precio es real y hay quien lo opera.

Sólo se aplica a series intradía. En velas diarias un salto de viernes a lunes
**sí** es un hueco, y filtrarlo borraría gaps reales. Sin `ts` en las velas la
marca es `false`: desconocido, no adivinado.

> Verificado en `test_an_overnight_reopen_is_flagged_as_a_session_gap`,
> `test_a_weekend_on_daily_bars_is_not_a_session_gap`,
> `test_without_timestamps_nothing_is_claimed_about_sessions`.

### 5c.3 Rupturas repetidas, numeradas (limitación #6)

Si el precio cruza tres veces el mismo swing high se emiten tres BOS, y los tres
son reales. Pero listados uno debajo de otro se leen como tres pruebas
independientes de fuerza, que es justo lo contrario de lo que son: un nivel que
ya no frena a nadie.

Cada evento lleva `repeat` (1 = primera vez que se rompe ese nivel en ese
sentido) y `repeatOf` (índice de la primera). La interfaz pinta **una fila por
nivel** con un contador `×N`, y `counts.repeatedBreaks` dice cuántas fueron
repeticiones. No se descarta nada en el backend: agrupar es decisión del cliente.

### 5c.4 El nivel es una zona, y la distancia también se mide en ATR

`detect_sr_levels` publica ahora la banda con la que agrupó (`zone.low`,
`zone.high`) — la misma contra la que la evidencia cuenta visitas. Dibujar una
línea única sugería una precisión que el método no tiene.

Y cada nivel trae `distanceAtr` además de `distancePct`: un 1 % no significa lo
mismo en un índice que en una small cap, y el porcentaje solo no viaja entre
activos.

### 5c.5 Contexto: recorrido y posición en el rango

Aritmética sobre números que ya estaban en la respuesta, pero que había que
hacer a ojo. En `context`:

| Campo | Qué es |
|---|---|
| `roomAbovePct` / `roomAboveAtr` | Recorrido hasta la resistencia más cercana, en % y en ATR |
| `roomBelowPct` / `roomBelowAtr` | Ídem hasta el soporte más cercano |
| `rangeWidthPct` | Anchura entre ambos, en % del precio |
| `rangePositionPct` | 0 % = pegado al soporte · 100 % = pegado a la resistencia |

Lo que no se puede calcular es `None`, nunca `0`: sin nivel por encima, el
recorrido hacia arriba es **indefinido**, y un `0 %` en pantalla se leería como
"resistencia justo aquí", que es lo contrario de la verdad.

> Verificado en `test_range_position_says_where_between_the_levels_price_is`,
> `test_missing_room_is_none_not_zero`.

### 5c.6 Una respuesta vacía ya tiene de verdad la misma forma

Este documento prometía que "una respuesta vacía conserva exactamente las mismas
claves que una completa". El motor (`detect_structure`) lo cumplía; **el
endpoint no**: cuando el proveedor no devolvía velas, o fallaba, la ruta
construía a mano un diccionario de cinco claves. Ahora los dos caminos devuelven
la lectura vacía completa, y hay un test de ruta que lo fija.

---

## 6. Qué hace BIEN

1. **Roles de S/R correctos por definición.** Arriba resistencia, abajo soporte,
   siempre, con el cambio de polaridad etiquetado en lugar de escondido.
2. **Reglas deterministas y auditables.** Cada número de la pantalla se puede
   reproducir leyendo las velas. Sin caja negra.
3. **Se adapta a la temporalidad sin configuración.** Tolerancia por ATR y
   fuerza fractal por escalón: la misma llamada es sensata en 5 minutos y en
   mensual.
4. **Evidencia, no adjetivos.** "Confirmado" siempre viene con el porqué:
   visitas, aguantes, roturas, continuación, volumen y retest.
5. **Nunca inventa datos.** Si el proveedor falla, la respuesta lo dice; no hay
   precios sintéticos en ninguna ruta de este módulo.
6. **Combinaciones imposibles son imposibles.** La escalera se valida en CI
   contra los límites reales del proveedor.
7. **Coste acotado y medido.** Detección de FVG en una pasada (antes O(n²),
   inservible con 1 500 velas intradía) y análisis profundo limitado a los 30
   niveles más cercanos al precio (ambas pasadas caras son O(niveles × velas)).
   Medido: **46 ms** con 1 600 velas (un mes de 5m), **73 ms** con 2 400, y
   **289 ms** en el peor caso de 10 000 velas —antes de la limitación eran
   946 ms—. Se ejecuta en un hilo aparte para no bloquear el bucle de eventos.
8. **Registro persistente por activo** con deduplicación correcta también en
   intradía (las velas intradía ya llevan hora en `date`; antes las 78 velas de
   una sesión compartían la cadena `2026-07-27` y el registro las fundía en una).
9. **Cada número mide una sola cosa.** La confluencia con otra temporalidad se
   publica aparte y no se suma a la puntuación de confirmación; lo que no se ha
   podido comprobar viaja como `null` y no como `0`. Es lo que permite leer un
   85/100 sabiendo exactamente de dónde sale.

---

## 7. Qué NO hace bien — limitaciones reales

Esta sección es la importante. Ninguna de estas cosas es un bug pendiente
disimulado: son límites conocidos del enfoque.

1. **Huecos de sesión en intradía: resuelto a medias.** Los **FVG** que nacen del
   salto nocturno ya se detectan y se etiquetan (§5c.2), así que no se cuentan
   como desequilibrios abiertos. Lo que sigue en pie es la otra mitad: ese mismo
   salto puede crear **swings artificiales** en la primera vela del día, y de ahí
   niveles y rupturas que no vienen de negociación real. En cripto y forex 24/7
   el problema no existe.

2. **Los swings de las últimas velas no están confirmados.** Un pivote necesita
   `strength` velas a cada lado. Las últimas 2–3 velas nunca pueden ser swing
   todavía. Es correcto, pero significa que **el giro más reciente siempre llega
   con retraso** — precisamente cuando más se quiere.

3. **Ruido en velas rápidas.** Aun con fuerza 3, en 5 minutos aparecen decenas
   de swings y muchos BOS repetidos sobre el mismo nivel. La confirmación
   anotada filtra los peores, pero el escalón de 5m sigue siendo el más ruidoso
   de la escalera. Para lectura estructural seria, 15m/1h dan mucha mejor señal.

4. **Las velas de 4h en acciones no empiezan en la apertura** (ver §3): se
   agrupan por tramos UTC porque no tenemos calendario de sesiones. En cripto y
   forex el problema no existe.

5. **La confluencia mira UN escalón, no toda la escalera.** Desde 2026-08-05 el
   escaneo compara con el escalón superior (§5c.1), pero sólo con ése: en 15m se
   compara con 1h, no con el diario ni el semanal. Un nivel que coincide en tres
   temporalidades se ve igual que uno que coincide en una. Y el escalón superior
   se lee con **su ventana por defecto**, no con la equivalente a la que estás
   mirando.

6. **BOS repetidos: agrupados, no filtrados.** Cada cruce sigue emitiendo su
   evento; lo que hay es numeración (`repeat`) y una fila por nivel en pantalla
   (§5c.3). El registro persistente sigue guardando las repeticiones por
   separado.

7. **La tendencia sale de las dos últimas etiquetas.** `label_structure` mira el
   último máximo y el último mínimo etiquetados. Es simple y transparente, pero
   en rangos amplios oscila entre `uptrend` y `range` con facilidad.

8. **Sin volumen real en forex, índices y CFD.** El "volumen" de Yahoo en esos
   activos es de contratos o directamente 0. La puntuación lo trata como dato
   ausente (ver §5.2), pero significa que la evidencia de volumen solo funciona
   de verdad en acciones y cripto.

9. **Los datos vienen de un proveedor no contratado.** Yahoo es scraping con
   `curl_cffi`. Hay failover multi-proveedor para *precios*
   (`backend/market_data.py`), pero **el histórico OHLC de este escáner sigue
   siendo Yahoo únicamente**. Si Yahoo endurece su antibot, el escáner se queda
   sin datos aunque los precios en vivo sigan funcionando.

10. **`max` en velas diarias sigue siendo el escalón más caro.** Para un índice
   con 40 años de histórico son ~10 000 velas: ~289 ms de cálculo y más de 100
   niveles detectados, de los que **solo se analizan en profundidad los 30 más
   cercanos** (`levelsAnalysed` lo indica; `counts.levels` sigue dando el total).
   Las listas se recortan además antes de enviarse (`truncated` marca el tamaño
   real). Es un compromiso consciente: los niveles a un 40 % del precio no
   necesitan evidencia por vela.

11. **No conoce el calendario.** Un nivel roto en el minuto de un dato del IPC no
    se distingue de uno roto en una tarde muerta de agosto. Los datos macro están
    en el dashboard, pero **no se cruzan** con el escáner.

12. **Las pinzas usan una tolerancia fija (0,15 %)** para decidir si dos máximos
    o mínimos son "iguales". Es el mismo defecto que tenían los niveles de S/R
    antes de pasar a ATR: demasiado estrecha en activos volátiles, demasiado
    ancha en los tranquilos. Pendiente de convertir a ATR.

13. **Sin backtest.** El escáner no reporta cuántas veces un nivel "confirmado"
    ha aguantado históricamente en ese activo. Las puntuaciones miden la
    evidencia **en la ventana escaneada**, no la fiabilidad estadística. No se
    debe presentar como tasa de acierto.

---

## 8. Contrato de la API

```
GET /api/education/scan-timeframes
    → { timeframes: [{interval, minutes, intraday, ranges[], defaultRange,
                      defaultStrength, maxDays, aggregatedFrom,
                      higherInterval}], defaultInterval }

GET /api/education/structure-scan/{symbol}?interval=15m&period=5d&strength=3&htf=1
    → symbol, period, interval, intraday, strength, aggregatedFrom,
      adjustments[], lastBarForming, rowsScanned,
      currentPrice, atr, atrPct, tolerancePct, levelsAnalysed,
      trend, nearestResistance, nearestSupport,
      context{roomAbovePct,roomBelowPct,roomAboveAtr,roomBelowAtr,
              rangeWidthPct,rangePositionPct},
      confluence{checked,interval,htfLevels,matched},
      swings[], events[], levels[], fvgs[], breakouts[],
      counts{swings,bos,choch,levels,resistances,supports,flipped,
             confirmedLevels,confirmedEvents,repeatedBreaks,confluent,
             fvgOpen,fvgSessionGap,breakouts,fakeouts},
      truncated{...}          // solo si se recortó alguna lista

GET /api/education/pattern-scan/{symbol}?interval=15m&period=5d&limit=20
    → symbol, period, interval, intraday, adjustments[], lastBarForming,
      rowsScanned, totalDetections, detections[]
```

`htf` (por defecto `1`) lee además el escalón superior y marca la confluencia;
cuesta una petición más al proveedor, lanzada en paralelo. Ambos escaneos están
limitados a **30 peticiones/minuto** por cliente. Una respuesta vacía conserva
**exactamente las mismas claves** que una completa —también cuando el proveedor
no devuelve velas o falla—: el cliente nunca tiene que ramificar por forma de
respuesta.

Cada nivel:

```json
{ "price": 120.6, "type": "resistance", "origin": "highs", "flipped": false,
  "distancePct": 7.68, "distanceAtr": 2.4, "touches": 6, "strength": 5,
  "zone": { "low": 119.9, "high": 121.3 },
  "confluence": { "interval": "1d", "price": 120.55, "gapPct": -0.04,
                  "touches": 4, "type": "resistance" },
  "confirmation": { "visits": 6, "held": 5, "broken": 1, "holdRatePct": 83.3,
                    "barsSince": 4, "lastVisit": "2026-07-24 14:30",
                    "score": 85, "confirmed": true,
                    "reasons": ["multiTest", "held", "recent"] } }
```

`confluence` es `null` mientras no se haya comprobado o no haya coincidencia; el
bloque de nivel superior distingue las dos cosas con `checked`.

Cada evento (BOS/CHoCH) añade `repeat` y `repeatOf`; cada FVG añade
`sessionGap`.

---

## 9. Cómo verificarlo sin red

Yahoo y CoinGecko están **bloqueados** en el sandbox remoto de Claude Code. Lo
que sí corre siempre:

```bash
cd backend
python -m py_compile *.py
pytest tests/test_price_action_unit.py tests/test_timeframes_unit.py -v
pytest tests/test_scanner_math_unit.py -v            # la ARITMÉTICA, a mano
pytest tests/test_structure_scan_routes_unit.py -v   # la ruta, con OHLC mockeado
pytest tests/ -q                                     # suite completa

cd ../frontend
node scripts/i18n-check.js                        # paridad de los 10 idiomas
node scripts/check-fetch-credentials.js
npm run build
```

El end-to-end de las rutas ya está escrito:
`tests/test_structure_scan_routes_unit.py` sustituye `server.get_ohlc_history`
por una serie sintética y usa `fastapi.testclient.TestClient` **sin** el gestor
de contexto, para que no arranque el pool de base de datos. Fija qué intervalo
se pide arriba, que una respuesta vacía tenga la forma completa y que un fallo
del escalón superior no tumbe el escaneo. Cualquier prueba que llame a la red
real desde el sandbox es una prueba que no se puede creer.

---

## 10. Siguientes mejoras, por valor

Hechas en la revisión 2026-08-05: confluencia multi-temporal (§5c.1), filtro de
hueco de sesión en los FVG (§5c.2), agrupación de BOS repetidos (§5c.3) y zonas
en vez de líneas (§5c.4). Lo que queda, por valor:

1. **Confluencia con más de un escalón**, y con la ventana equivalente a la que
   se está mirando en vez de la ventana por defecto del escalón superior. Un
   nivel que coincide en tres temporalidades debería distinguirse de uno que
   coincide en una.
2. **Swings artificiales en la apertura** — la mitad del hueco de sesión que
   sigue pendiente: la primera vela del día puede crear pivotes que no vienen de
   negociación real (limitación #1).
3. **Tolerancia de las pinzas por ATR** en `candle_patterns.py`. Es el mismo
   defecto que tenían los niveles de S/R antes de pasar a ATR: un 0,15 % fijo es
   demasiado estrecho en activos volátiles y demasiado ancho en los tranquilos
   (limitación #12).
4. **Proveedor de histórico con contrato** (Finnhub tiene velas gratuitas) como
   failover de Yahoo para OHLC, igual que ya existe para precios.
5. **Estadística por activo**: cuántas de las últimas N rupturas confirmadas en
   ESTE activo tuvieron continuación. Convertiría la puntuación de "evidencia
   presente" en "fiabilidad medida" — pero requiere almacenamiento histórico y
   hay que presentarlo con mucho cuidado para no parecer una promesa.
6. **Cruzar el calendario macro** con las rupturas: una rotura en el minuto del
   IPC no es la misma que una en una tarde muerta de agosto, y los datos macro
   ya están en el dashboard (limitación #11).

---

## 11. Correspondencia con el gráfico (revisión 2026-08-12)

Las dos piezas se montan en `DashboardPage` con cinco líneas entre ellas y no
compartían nada más que el activo. El escáner podía estar acertando y aun así
ser inútil, porque describía **otro gráfico** distinto del que el usuario tenía
delante.

### 11.1 La temporalidad la manda el gráfico

`chartInterval` vive ahora en `useAssetsStore` (vocabulario de TradingView) y el
escáner lo sigue. La correspondencia es una tabla explícita, `TV_TO_RUNG` en
`scannerMeta.js`, porque los dos vocabularios **no se solapan**: el gráfico
ofrece 1m y ninguna fuente gratuita sirve esa vela con histórico utilizable.

Lo que no se puede mapear **no se resuelve escaneando otra cosa en silencio**,
que era el fallo de fondo:

| Situación | Qué hace |
|---|---|
| Gráfico en 5m/15m/30m/1H/4H/1D/1S/1M | El escáner cambia de escalón solo |
| Gráfico en 1m | No cambia y avisa: esa vela no se puede escanear |
| Desvío manual a otro escalón | Se permite, con aviso y botón para volver |

El aviso nombra la vela como la ve el usuario en la barra del gráfico («1m»), no
con el código interno de TradingView («1»).

### 11.2 La tira de prueba

`ProofStrip.jsx` dibuja **las velas que se han escaneado de verdad** con encima
lo que el escáner afirma: niveles con su zona, pivotes, FVG abiertos y el precio
actual. La respuesta trae `bars` (últimas 90, claves de una letra) y
`barsOffset`, que es imprescindible: los swings vienen indexados sobre la serie
**completa** y sin el desplazamiento se pintarían corridos.

No es un gráfico para operar —para eso está el de arriba— sino la afirmación
dibujada sobre su propia evidencia. Antes no había una sola imagen en toda la
herramienta: el escáner decía «resistencia en 4.512,30 con tres toques» y para
comprobarlo había que ir al gráfico y trazar la línea a mano; si no la veías, no
podías distinguir «no está» de «no la he encontrado».

### 11.3 Lo que sigue SIN resolver

**Las dos piezas leen fuentes distintas.** El escáner pide OHLC a Yahoo para los
186 activos; el gráfico incrusta TradingView, que apunta a un mercado concreto
por activo. Sincronizar la temporalidad no lo arregla:

| Categoría | Gráfico | Escáner | Correspondencia |
|---|---|---|---|
| Cripto (61) | `BINANCE:BTCUSDT` | `BTC-USD` | Otro mercado: un exchange contra USDT vs. compuesto contra dólar |
| Materias primas (8) | `TVC:GOLD` (contado) | `GC=F` (futuro COMEX) | Otro instrumento |
| Forex (29) | `FX:EURUSD` | `EURUSD=X` | Otro agregador |
| Acciones (64) | Sin ajustar | Ajustado por splits/dividendos | Los niveles antiguos se desplazan |

`backend/crypto_data.py` **ya tiene** `fetch_ohlc()` leyendo klines de Binance
(`BINANCE_KLINES`, `parse_binance_klines`), y el escáner no lo usa. Enrutar
cripto por ahí en `_fetch_bars` —que es el punto único por el que entran las
velas, y por tanto arregla también la confluencia del escalón superior— pondría
al escáner a leer el mismo mercado que muestra el gráfico en 61 de 186 activos.
Ojo al hacerlo: Binance sirve como máximo 1000 velas por petición, así que una
ventana más larga tiene que declararse en `adjustments`, no recortarse en
silencio.

**El anclaje de la 4H compuesta en acciones** sigue como está (§3): se avisa de
que la vela se compone, pero el aviso no dice que en acciones el anclaje UTC no
coincide con el de la plataforma del usuario.


---

## 12. Auditoría de los cálculos (2026-08-13)

Repaso de **todas** las cifras que el escáner publica, para responder a una
pregunta concreta: ¿sale cada número de las velas de entrada, o hay algo
inventado?

### Resultado

**No hay nada aleatorio ni fabricado en la ruta del escáner.** Ni un
`random`, ni un valor por defecto que simule dato. Los `rng` del código son
*range* (máximo − mínimo), no generadores. Y `stock_data.get_ohlc_history`
**nunca** sintetiza: si el proveedor falla devuelve `[]`, y una lectura vacía
conserva las mismas claves que una completa, con las cifras a `None`.

### El hueco que había: la aritmética no estaba clavada

Los 60 tests de `test_price_action_unit.py` comprueban el COMPORTAMIENTO —que
un nivel se detecte, que una ruptura se confirme—. Lo que no había era un test
que fijara el VALOR de los cálculos base. Cinco alimentaban la pantalla sin
red de seguridad:

| Cálculo | De dónde sale | Qué mueve si cambia |
|---|---|---|
| `_avg_true_range` | media de los 14 rangos verdaderos | tolerancia de agrupación, distancias en ATR, expansión |
| `_avg_vol` | media del volumen previo, ceros fuera | si una ruptura cuenta como acompañada |
| `_bar_spacing_seconds` | **mediana** de los saltos entre velas | si un hueco es cambio de sesión |
| `strip_bars` | cola de las velas escaneadas | lo que dibuja la tira de prueba |
| puntuación de nivel | visitas, aguantes, recencia, giro | la etiqueta «confirmado» |

`tests/test_scanner_math_unit.py` (19 tests) los fija contra valores
calculados a mano. El más importante: **el rango verdadero cuenta el hueco**
—una vela de 1 de alto que abre 4 por encima del cierre previo tiene TR 4, no
1—, porque medir sólo máximo−mínimo subestima la volatilidad justo en las
sesiones que más se mueven.

### Invariantes que ahora fallan si alguien los rompe

- El precio publicado es el cierre de la última vela, redondeado a 6 decimales.
- Todo nivel cae dentro del recorrido real de la serie y dentro de su zona.
- Todo pivote tiene el precio del máximo o el mínimo de **su** vela.
- La puntuación de confirmación va de 0 a 100, y `held + broken ≤ visits`.
- `distancePct` y `distanceAtr` se reconstruyen desde el precio publicado.
- Una serie plana no inventa estructura: niveles vacíos y contexto a `None`.
- `bars[i]` es exactamente `rows[barsOffset + i]`, y un pivote dibujado cae
  sobre su propia vela.

### Una convención que quedó documentada, no corregida

`distancePct` lleva **signo** y `distanceAtr` es una **magnitud**. Parecía una
incoherencia y no lo es: el porcentaje dice el lado, la escalera además separa
resistencias de soportes, y el ATR se publica como «cuánto hay que andar» —
igual que `roomAboveAtr` y `roomBelowAtr`, positivos por construcción. Firmar
el ATR rompería el paralelismo con esos dos sin añadir información. Hay un test
que fija la convención para que nadie la «arregle».

### Dónde `strip_bars` vive ahora

Estaba en `server.py`, donde no se podía probar sin levantar la aplicación web
entera. Es una función pura sobre las velas, así que se ha movido a
`price_action.py` §9b, junto a los detectores.
