# Detalle e implementación de las técnicas (spec para la web)

> Documento **vivo**. Detalla, una a una, las 313 técnicas de
> [`ANALISIS_TECNICO_AVANZADO.md`](./ANALISIS_TECNICO_AVANZADO.md) en formato
> **especificación implementable**, para convertirlas en herramientas/lecciones.
> Se avanza **por lotes**, priorizando las 🔨 (construibles ya sobre el OHLCV
> que sirve `stock_data.get_ohlc_history`). Ichimoku profundo y escuela rusa ya
> tienen su didáctica en [`APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md`](./APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md).

**Plantilla por técnica:** Qué/para qué · Algoritmo (fórmulas) · Reglas de señal ·
Datos · Implementación web (endpoint + UI) · Ejemplo · Estadística viva · Honestidad.

**Stack recordatorio:** backend FastAPI + `Collection` (shim Mongo→PostgreSQL,
nunca SQL directo); `get_ohlc_history(symbol, range, interval)` → filas
`{date, open, high, low, close, volume}`; ya existen `price_action.detect_structure`
(swings/BOS/CHoCH/FVG) y `candle_patterns.detect_all_patterns`. Frontend React;
el escáner es `components/charts/StructureScanner.jsx`; i18n ×8 con paridad.

---

# LOTE 1 — Fase 1 (construibles ya) ✅ detallado

## 1.1 · Volume Profile (POC · Value Area · naked POC) — catálogo #13-15,24
**Qué/para qué.** Histograma de volumen **por nivel de precio** (no por tiempo).
Revela el precio más negociado (**POC**), la zona de aceptación (**Value Area**,
~70% del volumen) y los **POC vírgenes** (sin retestear → imán).

**Algoritmo (aproximación con velas diarias; con intradía es exacto):**
1. Rango = [min(low), max(high)] del periodo; divídelo en **N buckets**
   (N≈50–100), `size = (max−min)/N`.
2. Por cada vela, **reparte su `volume`** entre los buckets que cruza
   `[low, high]` (uniforme). Si no hay volumen fiable (algún forex), usa el nº de
   toques.
3. **POC** = bucket de mayor volumen acumulado.
4. **Value Area (70%)**: parte del POC; en cada paso compara el bucket
   inmediatamente **encima** vs **debajo** y añade el de más volumen; repite
   hasta cubrir el 70% del volumen total. Los extremos son **VAH** (arriba) y
   **VAL** (abajo).
5. **Naked/virgin POC**: POC de un periodo anterior que el precio **no ha vuelto
   a tocar**.

**Datos.** OHLCV. Diario = aproximado (🔨); intradía = exacto (🔧).

**Implementación web.**
- Backend: nuevo `@api_router.get("/education/volume-profile/{symbol}")`
  → `{poc, vah, val, buckets:[{price,volume}], nakedPocs:[...]}`. Reusar
  `get_ohlc_history` + función pura `compute_volume_profile(rows, n_buckets)`.
- Frontend: tarjeta en `StructureScanner.jsx` con **histograma horizontal SVG**
  (barras por bucket) y líneas POC/VAH/VAL; badges de naked POC.
- i18n: `vpTitle, vpPoc, vpValueArea, vpNakedPoc, vpNote` ×8.

**Ejemplo.** Buckets (precio:volumen) 100:5, 101:8, **102:20 (POC)**, 103:12,
104:6 → total 51, 70%≈35,7. POC=102 (20) → +103 (12)=32 → +101 (8)=40 ≥35,7.
**VAL=101 · POC=102 · VAH=103.**

**Estadística viva.** % de veces que el precio **vuelve al POC** tras alejarse;
distancia actual precio→POC en %.

**Honestidad.** Con velas diarias es una **aproximación**; el profile "de libro"
es intradía. Útil como zona de valor, no como señal de entrada por sí solo.

## 1.2 · Detector de falso rompimiento / 2B / Spring — catálogo #60-62,306
**Qué/para qué.** El **setup de reversión de mayor tasa de acierto**: el precio
rompe un extremo previo (máximo/mínimo swing), **no logra sostenerlo** y cierra
de vuelta dentro → giro. Extiende directamente el escáner actual.

**Algoritmo (reusa `detect_swings`):**
1. Toma swings confirmados (ya los calcula `price_action`).
2. Para un **swing high** `H`: busca una vela posterior con `high > H`
   (rompe) pero `close < H` (rechazo), y que en **1–3 velas** el precio
   **cierre de nuevo bajo `H`** → **2B bajista / upthrust**.
3. Simétrico para **swing low** `L` (barrido bajo `L` + cierre de vuelta arriba
   → **2B alcista / spring**).
4. Opcional: exigir **volumen alto** en la barra de barrido (convicción del
   fallo) y medir la profundidad del barrido (%).

**Datos.** OHLCV diario 🔨.

**Implementación web.**
- Backend: añadir `detect_false_breaks(rows, swings)` en `price_action.py`;
  incluir `false_breaks:[{date, kind:'spring'|'upthrust', level, depthPct}]` en
  la respuesta de `/education/structure-scan`.
- Frontend: nueva sección en `StructureScanner.jsx` (icono de trampa) + entrada
  en el **registro persistente** que ya construí.
- i18n: `fbTitle, fbSpring, fbUpthrust, fbNote` ×8.

**Ejemplo.** Swing high en 120. Vela hace 121,5 (rompe) pero cierra 119,8; a la
siguiente cierra 118 → **upthrust bajista** en 120, profundidad +1,25%.

**Estadística viva.** Tasa de giro tras el patrón (p. ej. "% que volvió a X% del
nivel en N velas"), muestra, peor racha.

**Honestidad.** Necesita swings confirmados → la última señal puede tardar 1–2
velas en validarse (no repinta si esperas el cierre).

## 1.3 · Anchored VWAP (+ bandas) — catálogo #25-27
**Qué/para qué.** El **precio medio ponderado por volumen desde un evento clave**
(máximo, mínimo, gap, earnings). Es el *benchmark institucional*: sobre el
AVWAP = compradores en control desde ese evento; debajo = vendedores.

**Algoritmo.**
- `typical = (H+L+C)/3`.
- Desde la barra ancla `a`:
  `AVWAP_t = Σ_{i=a..t}(typical_i · vol_i) / Σ_{i=a..t}(vol_i)`.
- **Bandas** = `AVWAP ± k·σ`, con σ = desviación **ponderada por volumen** de
  `typical` respecto al AVWAP (k=1,2).

**Datos.** OHLCV 🔨.

**Implementación web.**
- Backend: `compute_anchored_vwap(rows, anchor_index, k)` puro; endpoint o
  cálculo en cliente. Anclas automáticas = swings/gaps detectados.
- Frontend: **overlay** de línea AVWAP + bandas sobre el gráfico; selector de
  ancla; card "precio vs AVWAP (%)".
- i18n: `avwapTitle, avwapAnchor, avwapAbove, avwapBelow` ×8.

**Ejemplo.** Ancla en un mínimo. 3 barras: typical/vol = (10/100),(11/300),
(12/200). AVWAP = (10·100+11·300+12·200)/(600) = (1000+3300+2400)/600 = **11,17**.

**Estadística viva.** % de rechazos al tocar el AVWAP; nº de veces que actuó
como soporte/resistencia.

**Honestidad.** El AVWAP depende del **ancla elegida**: distintas anclas →
distintas lecturas. Es referencia dinámica, no señal automática.

## 1.4 · TD Sequential (Setup 9 + Countdown 13) — catálogo #38-39
**Qué/para qué.** Conteo **mecánico de agotamiento** de tendencia. Ampliamente
usado por mesas institucionales, casi desconocido para el retail.

**Algoritmo.**
- **Buy Setup:** 9 cierres consecutivos, cada uno `< close[i−4]`. La barra **9**
  completa el setup (agotamiento bajista). *Perfección*: low de la barra 8 ó 9
  ≤ lows de las barras 6 y 7.
- **Sell Setup:** espejo (9 cierres cada uno `> close[i−4]`).
- **Countdown (buy):** tras el setup, cuenta barras (no consecutivas) donde
  `close ≤ low[i−2]`, hasta **13** → señal de agotamiento reforzada.
- **TDST**: el extremo del setup = soporte/resistencia de referencia.

**Datos.** OHLCV 🔨, puramente numérico.

**Implementación web.**
- Backend: `compute_td_sequential(rows)` → `{setup:{dir,count,perfected},
  countdown:{dir,count}}`; endpoint `/education/td-sequential/{symbol}`.
- Frontend: badges "Setup 7/9", "Countdown 11/13" en el escáner; marca la barra.
- i18n: `tdSetup, tdCountdown, tdPerfected, tdNote` ×8.

**Ejemplo.** Tras un tramo bajista, 9 cierres seguidos cada uno por debajo del
cierre de 4 velas antes → **Buy Setup 9**: posible suelo, vigilar reacción.

**Estadística viva.** % de giro tras un 9 / tras un 13; recorrido medio posterior.

**Honestidad.** Un "9" **no** es orden de compra: es *aviso de agotamiento*.
Necesita confirmación (vela de giro, nivel).

## 1.5 · VSA — no demand / no supply / stopping volume — catálogo #87-90
**Qué/para qué.** Lee la relación **rango–volumen–cierre** para detectar
debilidad oculta (subidas sin compradores) o fuerza oculta (caídas sin
vendedores).

**Algoritmo (spread = H−L; comparar con volumen de las 2 barras previas):**
- **No Demand:** barra **alcista** (`close>close_prev`), **spread estrecho** y
  **volumen < 2 barras previas** → subida sin interés comprador → bajista.
- **No Supply:** barra **bajista**, spread estrecho y volumen bajo → caída sin
  vendedores → alcista.
- **Stopping Volume:** barra bajista de **volumen altísimo** que **cierra lejos
  del mínimo** (mecha inferior larga) → absorción compradora → alcista.

**Datos.** OHLCV con **volumen** 🔨 (diario sirve; en forex spot el volumen es
parcial → menos fiable).

**Implementación web.**
- Backend: `detect_vsa(rows)` → `[{date, signal, dir}]`; integrar en el
  `pattern-scan` o en el structure-scan.
- Frontend: sección "Señales VSA" en el escáner + al registro.
- i18n: `vsaNoDemand, vsaNoSupply, vsaStopping, vsaNote` ×8.

**Ejemplo.** Precio sube pero la vela verde tiene rango pequeño y **la mitad del
volumen** que las 2 anteriores → **No Demand**: la subida no tiene respaldo.

**Estadística viva.** Tasa de giro tras cada tipo de señal por activo.

**Honestidad.** VSA es potente pero **algo interpretativo**; en mercados sin
volumen central (forex spot) baja su fiabilidad. Mostrar siempre la muestra.

---

# LOTE 2 — Sección 31: Barridos de liquidez y reversión por sesión ✅ detallado

## 2.1 · Marco: Power of 3 (AMD) y pools de liquidez — #302
**Idea.** Cada sesión se descompone en **A**cumulación (se forma un rango, a
menudo la sesión previa/asiática) → **M**anipulación (un empujón **falso** fuera
del rango que **barre los stops obvios** = el *Judas swing*) → **D**istribución
(el movimiento **real** hacia la liquidez contraria).

**Pools de liquidez** = cúmulos de stops justo **más allá de niveles obvios**:
máximo/mínimo del día previo (**PDH/PDL**), de la semana (**PWH/PWL**), del rango
asiático o pre-market, **máximos/mínimos iguales** (dobles techos/suelos) y
**números redondos**. Los algos los "cazan" antes del movimiento real porque ahí
están las órdenes en reposo (el "combustible").

**Base honesta.** Mecanismo documentado: *predatory trading*
(Brunnermeier-Pedersen 2005), sobre-reacción y reversión de la apertura
(Amihud-Mendelson; Stoll-Whaley) y reversión de corto plazo intradía.

## 2.2 · Detector genérico "sweep + reversal" (el núcleo construible) — #301,305,311
**Algoritmo (velas intradía con marca de tiempo por zona horaria):**
1. **Niveles de referencia** de la sesión: PDH, PDL, PWH, PWL, extremos del
   **rango asiático/pre-market**, números redondos.
2. **Barrido (sweep):** una vela cuya **mecha** perfora el nivel (p. ej.
   `high > PDH`) pero cuyo **cuerpo cierra de vuelta dentro** (`close < PDH`)
   → caza de liquidez sobre ese pool.
3. **Desplazamiento/reversión:** en **K velas**, un impulso fuerte en sentido
   contrario que idealmente deja un **FVG** (imbalance) — **reusa el detector de
   FVG que ya tiene `price_action`**.
4. **Señal** = `{hora, nivel_barrido, dirección(=contraria al barrido),
   zona_fvg, extremo_barrido}`.
5. **Modelo para estadística:** entrada en el retroceso al FVG; stop más allá del
   `extremo_barrido`; objetivo = pool de liquidez opuesto.
6. **Filtro horario (opcional):** exigir que el barrido caiga en una *killzone*.

**Datos.** Intradía (1m/5m/15m) con zona horaria 🔧.

## 2.3 · Judas Swing (especialización en la apertura) — #301
**Config.** Nivel = extremo del pre-market/overnight o PDH/PDL. Ventana = primeros
**5–30 min** tras la apertura (**NY 09:30 ET**, **Londres 03:00 ET**,
*midnight* **00:00 ET**).

**Ejemplo minuto a minuto (NY open).** Pre-market high (PMH) = 5010.
- 09:30 → la vela de 1 min pincha a **5012** (barre el PMH, caza stops) y cierra
  **5008**.
- 09:31 → vela bajista fuerte rompe **5005** y deja un **FVG 5005–5007**.
- **Judas confirmado bajista.** Entrada en retroceso a **5006** (FVG), stop
  **5013** (sobre el barrido), objetivo = PDL / liquidez inferior.

## 2.4 · Killzones y Silver Bullet (capa de ventana horaria) — #303,304
**Tabla de ventanas (zona del instrumento):** Londres **02:00–05:00 ET**,
NY AM **07:00–10:00 ET**, **Silver Bullet 10:00–11:00 ET** (entrada en FVG tras
el barrido), London Close **10:00–12:00 ET**, Asia **20:00–00:00 ET**.
El detector **eleva** las señales dentro de estas ventanas.

**Honestidad (clave).** Estas ventanas exactas son **folklore de ICT**: la
herramienta debe **medir y mostrar la tasa de acierto real por ventana y activo**
para que el usuario vea cuáles funcionan de verdad, en vez de creer el reloj.

## 2.5 · Spike & fade en eventos y fixes — #307,308,309
**Config.** Nivel = precio justo **antes** de un evento programado: datos
**08:30 / 10:00 ET**, **London 4pm fix (16:00)**, **fix de Tokio 09:55 JST** en
días Gotobi.
**Regla.** Marca el precio pre-evento; mide el primer latigazo; **señala si el
precio revierte** cruzando el precio pre-evento en **N minutos** ("fade").
**Datos.** Intradía + calendario económico / horario de fixes 🔧.

## 2.6 · Stop-run en números redondos — #311
Nivel = redondos (…00, …50). Barrido = mecha más allá + cierre de vuelta;
reversión como en 2.2. Detectable **aprox. con mechas en diario (🔨)** o exacto
en intradía (🔧).

## 2.7 · Implementación web unificada
- **Backend:** módulo `liquidity_sweeps.py` con `detect_sweeps(bars, levels,
  window)` puro; endpoint `/education/liquidity-scan/{symbol}?interval=5m&session=NY`.
  Reusa el detector de FVG de `price_action`.
- **Frontend:** panel "Barridos & reversiones" con la lista de barridos (hora,
  nivel, dirección) + **tabla de tasa de acierto por killzone** (la estadística
  honesta) + overlay opcional marcando barrido + FVG.
- **i18n ×8:** `sweepTitle, sweepJudas, sweepKillzone, sweepFade, sweepNote`.
- **Realidad del dato:** requiere intradía; Yahoo tiene histórico intradía
  **limitado** y el sandbox lo **bloquea** → construir con capa de datos
  **mockeable** y verificar con *fixtures* grabadas.
- **Estadística viva:** por tipo de nivel y por killzone: % de barridos que
  revirtieron X, MFE/MAE medio, muestra, peor racha.

**Honestidad global.** El mecanismo es real; las **horas exactas hay que
validarlas vivas**. Nunca operar el reloj a ciegas; mostrar siempre la muestra.

---

# LOTE 3 — Sección 1: Método Wyckoff ✅ detallado

## 3.1 · Esquema de acumulación/distribución (fases A–E) + eventos — #3-9
**Acumulación (suelo):**
- **Fase A** (frena la bajada): **PS** (soporte preliminar), **SC** (*selling
  climax*: vela bajista de **rango amplio + volumen clímax** que cierra en el
  tercio superior), **AR** (*automatic rally*), **ST** (test secundario del SC
  con **menos volumen**).
- **Fase B** (construye causa): oscilación en el **rango (TR)**; lecturas de
  esfuerzo/resultado.
- **Fase C:** el **Spring** (barrido falso bajo el mínimo del TR — **reusa el
  detector de falso rompimiento 1.2**) y su **Test**.
- **Fase D:** **SOS** (*sign of strength*: velas alcistas de rango amplio y
  volumen creciente que rompen la resistencia del TR), **LPS** (último punto de
  soporte, retroceso más alto).
- **Fase E:** markup fuera del rango.

**Distribución (techo)** = espejo: **PSY, BC** (*buying climax*), AR, ST,
**UT/UTAD** (upthrust — reusa detector), **SOW, LPSY**.

**Eventos detectables (spec):**
- **SC/BC:** `spread ≥ x·ATR` y `volumen ≥ y·media`, cierre en el tercio
  opuesto al impulso.
- **AR:** contra-movimiento fuerte tras SC/BC.
- **Spring/UT:** `detect_false_breaks` contra el extremo del TR.
- **SOS/SOW:** vela de ruptura del TR con rango amplio y volumen sobre la media.
- **TR (rango):** precio oscilando entre dos niveles ≥ M velas (reusa el
  *clustering* de S/R que ya existe).

## 3.2 · Ley Esfuerzo vs Resultado — #10
Compara **esfuerzo** (volumen) vs **resultado** (progreso del precio). Divergencia
(**mucho volumen, poco avance**) = absorción → posible giro.
**Algoritmo:** `esfuerzo = z-score(volumen)`; `resultado = |close−open|/ATR`.
Marca barras de **esfuerzo alto / resultado bajo**.

## 3.3 · Ley Causa–Efecto (conteo P&F) — #11
La **anchura** del TR (nº de columnas en Point & Figure) proyecta el objetivo:
`objetivo = base ± (nº columnas × box × reversal)`. Da el recorrido "merecido"
por la causa acumulada.

## 3.4 · Composite Operator — #12
Lente interpretativa (leer el rango como si lo dirigiera un gran operador). ⚠️
Subjetiva: se enseña, no se automatiza como señal dura.

## 3.5 · Implementación web
- **Backend:** `wyckoff.py` → detecta TR, clímax (SC/BC), AR, spring/UT
  (reusa 1.2), SOS/SOW; devuelve **fase probable + eventos**.
- **Frontend:** anota en el escáner la **"posible fase Wyckoff"** y los eventos.
- **i18n ×8:** `wyPhase, wySpring, wyUpthrust, wySOS, wyNote`.
- **Honestidad:** el etiquetado de fase es **probabilístico**; mostrar siempre
  "posible fase X", nunca como certeza.

---

# TRACKER — estado del detalle (313 técnicas / 31 secciones)

| Sección | Técnicas | Estado |
|---|---|---|
| 1. Wyckoff | 1–12 | ✅ Lote 3 |
| 2. Volume/Market Profile | 13–28 | 🟡 parcial *(POC/VA/naked en 1.1; AVWAP en 1.3)* |
| 3. Order flow | 29–37 | ⏳ pendiente |
| 4. DeMark | 38–43 | 🟡 parcial *(TD Sequential en 1.4)* |
| 5. Amplitud/internals | 44–53 | ⏳ pendiente |
| 6. Intermercado/RS | 54–59 | ⏳ pendiente |
| 7. Price action avanzado | 60–80 | 🟡 parcial *(falso rompimiento en 1.2)* |
| 8. Smart Money/ICT | 81–86 | ⏳ pendiente |
| 9. Volumen | 87–97 | 🟡 parcial *(VSA en 1.5)* |
| 10. Volatilidad/canales | 98–104 | ⏳ pendiente |
| 11. Gráficos anti-ruido | 105–110 | ⏳ pendiente |
| 12. Medias/tendencia | 111–117 | ⏳ pendiente *(Ichimoku en doc aparte)* |
| 13. Ehlers/DSP | 118–122 | ⏳ pendiente |
| 14. Osciladores | 123–135 | ⏳ pendiente |
| 15. Ciclos/tiempo | 136–138 | ⏳ pendiente |
| 16. Chartismo clásico | 139–156 | ⏳ pendiente |
| 17. Líneas/canales/regresión | 157–169 | ⏳ pendiente |
| 18. Fibonacci | 170–175 | ⏳ pendiente |
| 19. Medias avanzadas | 176–186 | ⏳ pendiente |
| 20. Momentum/régimen | 187–199 | ⏳ pendiente |
| 21. Estadística cuant | 200–210 | ⏳ pendiente |
| 22. Niveles por sesión | 211–217 | ⏳ pendiente |
| 23. P&F avanzado | 218–220 | ⏳ pendiente |
| 24. Sentimiento | 221–225 | ⏳ pendiente |
| 25. Ehlers adicional | 226–230 | ⏳ pendiente |
| 26. Escuela japonesa | 231–236 | ✅ doc aparte (Ichimoku) |
| 27. Escuela rusa | 237–240 | ✅ doc aparte |
| 28. Por nacionalidad | 241–262 | ⏳ pendiente |
| 29. Cuant/algoritmos | 263–284 | ⏳ pendiente |
| 30. Intradía hora/minuto | 285–300 | ⏳ pendiente |
| 31. Barridos/Judas swing | 301–313 | ✅ Lote 2 |

## Orden propuesto de los siguientes lotes
- ~~Lote 2: Sección 31 (Judas swing / barridos)~~ ✅ hecho.
- ~~Lote 3: Wyckoff (1–12)~~ ✅ hecho.
- **Lote 4 (siguiente):** Order flow (29–37) — delta/CVD, absorción, imbalance.
- **Lote 5:** Chartismo clásico (139–156) con objetivos medidos.
- **Lote 6:** Amplitud/internals (44–53) e intermercado/RS (54–59).
- **Lote 7+:** el resto por prioridad de construcción.

*Cada técnica detallada aquí queda lista para pasar a código + i18n ×8 + tarjeta
con estadística viva en el escáner.*
