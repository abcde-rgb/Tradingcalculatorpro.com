# Escáner de Estructura de Precio — qué hace bien, qué no, y cómo confirma

**Última revisión:** 2026-07-27
**Código:** `backend/price_action.py`, `backend/timeframes.py`,
`backend/server.py` (`/api/education/structure-scan/{symbol}`,
`/api/education/pattern-scan/{symbol}`, `/api/education/scan-timeframes`),
`frontend/src/components/charts/StructureScanner.jsx`
**Tests:** `backend/tests/test_price_action_unit.py` (38),
`backend/tests/test_timeframes_unit.py` (21)

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
| BOS / CHoCH | Rupturas de estructura a favor / en contra de la tendencia previa |
| Soportes y resistencias | Niveles horizontales por agrupación de swings **+ el lado del precio actual** |
| Fair Value Gaps | Desequilibrios de 3 velas, marcados como abiertos o rellenados |
| Breakouts / fakeouts | Ruptura confirmada de un nivel vs. barrido de liquidez |

Lo que **no** es: no es una señal de compra/venta, no calcula probabilidad de
éxito, no tiene en cuenta fundamentales, noticias ni contexto macro, y no sabe
en qué sesión (Londres/Nueva York) está el mercado.

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
| **1d** | 1mo · 3mo · 6mo · 1y · 2y · 5y · ytd · max | 6mo | 2 |
| **1wk** | 6mo · 1y · 2y · 5y · max | 2y | 2 |
| **1mo** | 1y · 2y · 5y · max | 5y | 2 |

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

---

## 7. Qué NO hace bien — limitaciones reales

Esta sección es la importante. Ninguna de estas cosas es un bug pendiente
disimulado: son límites conocidos del enfoque.

1. **Huecos de sesión en intradía.** En acciones, entre el cierre y la apertura
   siguiente hay un salto que el escáner ve como una vela normal. Eso genera
   **FVG falsos** (el hueco nocturno no es un desequilibrio intradía) y puede
   crear swings artificiales en la primera vela del día. En cripto y forex 24/7
   el problema casi desaparece. *Mitigación disponible: filtrar gaps de más de N
   veces el ATR en el primer bar de sesión. No implementado.*

2. **Los swings de las últimas velas no están confirmados.** Un pivote necesita
   `strength` velas a cada lado. Las últimas 2–3 velas nunca pueden ser swing
   todavía. Es correcto, pero significa que **el giro más reciente siempre llega
   con retraso** — precisamente cuando más se quiere.

3. **Ruido en velas rápidas.** Aun con fuerza 3, en 5 minutos aparecen decenas
   de swings y muchos BOS repetidos sobre el mismo nivel. La confirmación
   anotada filtra los peores, pero el escalón de 5m sigue siendo el más ruidoso
   de la escalera. Para lectura estructural seria, 15m/1h dan mucha mejor señal.

4. **No hay confluencia multi-temporal.** Cada escaneo mira **una** temporalidad.
   El escáner no sabe que la resistencia que está viendo en 15m es un soporte
   diario. Es la mejora individual con más valor pendiente.

5. **BOS repetidos sobre el mismo nivel.** Si el precio cruza tres veces el mismo
   swing high, se emiten tres eventos. Son reales, pero saturan el registro. No
   hay agrupación por nivel.

6. **La tendencia sale de las dos últimas etiquetas.** `label_structure` mira el
   último máximo y el último mínimo etiquetados. Es simple y transparente, pero
   en rangos amplios oscila entre `uptrend` y `range` con facilidad.

7. **Sin volumen real en forex, índices y CFD.** El "volumen" de Yahoo en esos
   activos es de contratos o directamente 0. La puntuación lo trata como dato
   ausente (ver §5.2), pero significa que la evidencia de volumen solo funciona
   de verdad en acciones y cripto.

8. **Los datos vienen de un proveedor no contratado.** Yahoo es scraping con
   `curl_cffi`. Hay failover multi-proveedor para *precios*
   (`backend/market_data.py`), pero **el histórico OHLC de este escáner sigue
   siendo Yahoo únicamente**. Si Yahoo endurece su antibot, el escáner se queda
   sin datos aunque los precios en vivo sigan funcionando.

9. **`max` en velas diarias sigue siendo el escalón más caro.** Para un índice
   con 40 años de histórico son ~10 000 velas: ~289 ms de cálculo y más de 100
   niveles detectados, de los que **solo se analizan en profundidad los 30 más
   cercanos** (`levelsAnalysed` lo indica; `counts.levels` sigue dando el total).
   Las listas se recortan además antes de enviarse (`truncated` marca el tamaño
   real). Es un compromiso consciente: los niveles a un 40 % del precio no
   necesitan evidencia por vela.

10. **No conoce el calendario.** Un nivel roto en el minuto de un dato del IPC no
    se distingue de uno roto en una tarde muerta de agosto. Los datos macro están
    en el dashboard, pero **no se cruzan** con el escáner.

11. **Sin backtest.** El escáner no reporta cuántas veces un nivel "confirmado"
    ha aguantado históricamente en ese activo. Las puntuaciones miden la
    evidencia **en la ventana escaneada**, no la fiabilidad estadística. No se
    debe presentar como tasa de acierto.

---

## 8. Contrato de la API

```
GET /api/education/scan-timeframes
    → { timeframes: [{interval, minutes, intraday, ranges[], defaultRange,
                      defaultStrength, maxDays}], defaultInterval }

GET /api/education/structure-scan/{symbol}?interval=15m&period=5d&strength=3
    → symbol, period, interval, intraday, strength, adjustments[],
      lastBarForming, rowsScanned,
      currentPrice, atr, atrPct, tolerancePct, levelsAnalysed,
      trend, nearestResistance, nearestSupport,
      swings[], events[], levels[], fvgs[], breakouts[],
      counts{swings,bos,choch,levels,resistances,supports,flipped,
             confirmedLevels,confirmedEvents,fvgOpen,breakouts,fakeouts},
      truncated{...}          // solo si se recortó alguna lista

GET /api/education/pattern-scan/{symbol}?interval=15m&period=5d&limit=20
    → symbol, period, interval, intraday, adjustments[], lastBarForming,
      rowsScanned, totalDetections, detections[]
```

Ambos escaneos están limitados a **30 peticiones/minuto** por cliente.
Una respuesta vacía conserva **exactamente las mismas claves** que una completa:
el cliente nunca tiene que ramificar por forma de respuesta.

Cada nivel:

```json
{ "price": 120.6, "type": "resistance", "origin": "highs", "flipped": false,
  "distancePct": 7.68, "touches": 6, "strength": 5,
  "confirmation": { "visits": 6, "held": 5, "broken": 1, "holdRatePct": 83.3,
                    "barsSince": 4, "lastVisit": "2026-07-24 14:30",
                    "score": 85, "confirmed": true,
                    "reasons": ["multiTest", "held", "recent"] } }
```

---

## 9. Cómo verificarlo sin red

Yahoo y CoinGecko están **bloqueados** en el sandbox remoto de Claude Code. Lo
que sí corre siempre:

```bash
cd backend
python -m py_compile server.py price_action.py timeframes.py stock_data.py
pytest tests/test_price_action_unit.py tests/test_timeframes_unit.py -v
pytest tests/ -q                                  # suite completa

cd ../frontend
node scripts/i18n-check.js                        # paridad de los 8 idiomas
node scripts/check-fetch-credentials.js
npm run build
```

Para un end-to-end real de las rutas hay que **mockear** el lector de OHLC
(sustituir `server.get_ohlc_history` por una serie sintética) y usar
`fastapi.testclient.TestClient`. Cualquier prueba que llame a la red real desde
el sandbox es una prueba que no se puede creer.

---

## 10. Siguientes mejoras, por valor

1. **Confluencia multi-temporal** — marcar los niveles del escalón superior que
   coinciden con los del actual. Es la mejora más valiosa que falta.
2. **Filtro de hueco de sesión** en intradía de acciones (elimina los FVG falsos
   de la apertura y los swings artificiales).
3. **Agrupar BOS repetidos** por nivel, con contador, en vez de N eventos.
4. **Zonas en lugar de líneas**: el nivel ya tiene banda (`tolerancePct`);
   dibujarla como zona sería más honesto visualmente que una línea única.
5. **Proveedor de histórico con contrato** (Finnhub tiene velas gratuitas) como
   failover de Yahoo para OHLC, igual que ya existe para precios.
6. **Estadística por activo**: cuántas de las últimas N rupturas confirmadas en
   ESTE activo tuvieron continuación. Convertiría la puntuación de "evidencia
   presente" en "fiabilidad medida" — pero requiere almacenamiento histórico y
   hay que presentarlo con mucho cuidado para no parecer una promesa.
