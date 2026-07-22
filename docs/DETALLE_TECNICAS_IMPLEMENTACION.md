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

## 2.8 · SMT Divergence (confirmación con par correlacionado)
**Qué/para qué.** La mejor **confirmación** de que un barrido es falso. Dos
activos que **deberían moverse juntos**: si **uno hace un nuevo máximo (barre
liquidez) pero el otro NO** → *non-confirmation* → el barrido es una trampa y el
giro es probable.

**Pares típicos.** Índices **ES / NQ / YM**; **EUR vs GBP** (o vs DXY);
**BTC vs ETH**; **oro vs plata**.

**Algoritmo.**
1. En el nivel barrido del activo A (p. ej. nuevo máximo sobre PDH), toma la
   misma marca temporal en B.
2. Si **A hace nuevo máximo y B NO** (o viceversa en mínimos) → **SMT bajista**
   (alcista en mínimos).
3. Úsalo como filtro sobre la señal 2.2: barrido + SMT + FVG = alta convicción.

**Datos.** Dos series intradía **alineadas en el tiempo** 🔧.

**Honestidad.** Requiere que la correlación sea **real y vigente** (se rompe en
regímenes raros). Mide la correlación rodante antes de confiar en la divergencia.

## 2.9 · Liquidez ingenierizada: EQH/EQL y trendline liquidity — #84
**Qué.** Los **máximos/mínimos iguales** (dobles techos/suelos, *EQH/EQL*) y las
**directrices** son **cebos**: el retail pone stops justo detrás, y ahí apunta el
barrido.

**Algoritmo.**
- **EQH/EQL:** dos+ swings al mismo nivel dentro de tolerancia (p. ej. ≤0,05%)
  → *pool* de liquidez justo por encima/debajo. (Reusa `detect_swings`.)
- **Trendline liquidity:** 3+ toques de una directriz → stops alineados bajo/
  sobre ella; su ruptura falsa + giro = barrido de directriz.

**Uso.** Marca estos pools como **objetivos de barrido**; cuando el precio los
caza y revierte (2.2), la señal es más limpia.

## 2.10 · Cascada de sesiones y alto/bajo semanal por día — #305
**Cascada.** El **rango asiático** (20:00–00:00 ET) se forma; **Londres**
(02:00–05:00) **barre un lado** del rango asiático y revierte; **NY** (07:00–10:00)
puede barrer el extremo de Londres. Estadística útil: **qué % de días el máximo
o mínimo del día se fija en la ventana de Londres/apertura de NY**.

**Alto/bajo semanal por día.** Tendencia documentada: el **máximo o mínimo de la
semana suele formarse lunes–miércoles** (perfil semanal). Herramienta: contar,
por activo, **en qué día de la semana** se fija el extremo semanal y mostrar la
distribución.

**Datos.** Intradía para la cascada 🔧; diario para el día del extremo semanal 🔨.

## 2.11 · Confirmaciones: displacement · FVG · breaker · OTE — #81-83,86
Secuencia que valida el giro tras el barrido:
- **Displacement:** vela(s) de **rango amplio** que rompen estructura en el
  sentido del giro (energía real, no ruido).
- **FVG:** el hueco de 3 velas que deja el displacement = **zona de entrada**
  (reusa el detector de FVG).
- **Breaker block:** el último *order block* contrario **antes** del barrido; al
  romperse, pasa a ser soporte/resistencia.
- **OTE (Optimal Trade Entry):** entrada en el retroceso **0,62–0,79** de la
  pierna de displacement.

## 2.12 · Pseudocódigo del detector (para `liquidity_sweeps.py`)
```
def detect_sweeps(bars, tz, session_windows, tol=0.0005, K=3):
    levels = build_levels(bars)          # PDH/PDL, PWH/PWL, Asian H/L, redondos, EQH/EQL
    out = []
    for i, b in enumerate(bars):
        for lvl in levels:
            swept_up   = b.high > lvl*(1+tol) and b.close < lvl   # mecha arriba, cierra dentro
            swept_down = b.low  < lvl*(1-tol) and b.close > lvl
            if not (swept_up or swept_down):
                continue
            rev = confirm_reversal(bars, i, K, direction=down if swept_up else up)
            if not rev: continue          # exige displacement + FVG en K velas
            out.append(dict(time=b.time, level=lvl, dir=rev.dir,
                            fvg=rev.fvg, sweep_extreme=b.high if swept_up else b.low,
                            killzone=window_of(b.time, tz, session_windows),
                            smt=check_smt(b.time, corr_symbol)))   # opcional
    return out
```
Salidas → tarjeta + **estadística por killzone y por tipo de nivel**.

## 2.13 · Arnés de verificación (por el bloqueo de intradía)
Como el sandbox **bloquea Yahoo** y el intradía es limitado:
- Guardar **fixtures** JSON de sesiones reales (`tests/fixtures/ny_open_*.json`).
- Test unitario que corre `detect_sweeps` sobre la fixture y **asevera** el
  Judas del ejemplo 2.3 (barrido de PMH + FVG + dirección).
- Métrica de backtest: sobre N sesiones, `% barridos que revirtieron ≥ R`,
  MFE/MAE, muestra, peor racha — **lo que se muestra al usuario**.

**Cierre de Lote 2.** Con 2.1–2.13 la sección 31 queda como **spec completa**:
detector genérico + Judas + killzones + SMT + liquidez ingenierizada + cascada +
confirmaciones + pseudocódigo + verificación. Lista para pasar a código.

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

## 3.6 · Ejemplo trabajado de acumulación (con números)
Baja hasta **PS 52** → **SC** (selling climax) pincha **48** con volumen enorme y
**cierra 51** (lejos del mínimo) → **AR** rebota a **56** → **ST** retesta **49**
con **menos volumen**. Se forma el **TR 49–56** durante semanas (**Fase B**).
**Fase C:** **Spring** cae a **47,5** (bajo el mínimo 48) con volumen moderado y
vuelve rápido sobre 49; **Test** en 49,5 con volumen bajo. **Fase D:** **SOS** =
vela amplia de 53 a **57** con gran volumen (*jump across the creek* sobre la
resistencia 56); **LPS/BUEC** = retroceso a **55,5** (por encima de la vieja
resistencia). **Fase E:** markup. El **conteo P&F** del TR proyecta objetivo en
los ~70 (ver 3.10).

## 3.7 · Los 9 tests de compra / venta (Wyckoff-Pruden)
**Compra (acumulación):** ① objetivo bajista P&F cumplido · ② PS/SC/ST visibles ·
③ actividad alcista (volumen sube en rebotes, baja en reacciones) · ④ rota la
línea de oferta bajista · ⑤ mínimos crecientes · ⑥ máximos crecientes · ⑦ **más
fuerte que el mercado** · ⑧ base formada (causa) · ⑨ recorrido potencial ≥ **3×
el riesgo del stop**.
**Venta (distribución):** espejo (objetivo alcista cumplido, PSY/BC/ST, actividad
bajista, rota la línea de demanda, máximos y mínimos decrecientes, más débil que
el mercado, techo formado, potencial bajista ≥ 3× riesgo).
→ **Implementación:** un **checklist de 9** que el escáner marca automáticamente
(los que son objetivos) y deja manuales los interpretativos.

## 3.8 · Ondas de compra/venta y fuerza relativa — enlaza #55
- **Ondas:** compara **volumen y longitud** de las **ondas alcistas vs bajistas**
  dentro del TR. Ondas bajistas cada vez **más cortas y con menos volumen** =
  la oferta se seca (test ③).
- **Fuerza relativa:** compara el activo con su índice; en Fase C/D debe
  **resistir las caídas y liderar los rebotes** frente al índice (test ⑦).
  Reusa la línea RS de #55.

## 3.9 · Creek / JAC / BUEC
El **"creek"** (arroyo) = la resistencia ondulada sobre los máximos del TR.
**JAC** (*jump across the creek*) = la ruptura SOS. **BUEC** (*back up to the edge
of the creek*) = el LPS, retroceso a la resistencia ya rota (ahora soporte). Son
el mismo evento SOS/LPS con la metáfora de Wyckoff.

## 3.10 · Conteo Point & Figure para el objetivo (ley Causa-Efecto) — #11
`objetivo = línea_de_conteo ± (nº columnas × box × reversal)`.
**Ejemplo:** línea de conteo en **42**, **12 columnas** en el TR, box **1**,
reversal **3** → 12×1×3 = **36** → **objetivo 42 + 36 = 78**. Cuanto más ancho el
TR (más causa), mayor el efecto.

## 3.11 · Máquina de estados de fase (pseudocódigo para `wyckoff.py`)
```
def wyckoff_phase(rows):
    tr = detect_range(rows)                 # reusa clustering S/R; TR = [lo, hi]
    if not tr: return {"phase": None}
    sc = find_climax(rows, tr, side="sell") # spread≥x·ATR, vol≥y·media, cierra 1/3 sup
    ar = find_auto_rally(rows, sc)
    st = find_secondary_test(rows, sc)      # retesta con menos volumen
    spring = detect_false_breaks(rows, [tr.lo])   # reusa 1.2
    sos = find_wide_breakout(rows, tr.hi, side="up")
    lps = find_higher_pullback(rows, sos)
    # estado según qué eventos existen y su orden temporal:
    if sos and lps:      phase = "D→E (markup)"
    elif spring:         phase = "C (spring/test)"
    elif st and ar:      phase = "B (construyendo causa)"
    elif sc:             phase = "A (frenando la bajada)"
    else:                phase = "sin estructura clara"
    return {"phase": phase, "events": [...], "tests9": checklist(...)}
```

## 3.12 · Tipos de Spring y terminal shakeout
- **Spring #1 (terminal shakeout):** ruptura **profunda** bajo soporte con
  **volumen alto** y recuperación inmediata → el más dramático.
- **Spring #2:** ruptura y volumen **moderados**.
- **Spring #3:** ruptura **mínima**, **volumen bajo** → el más "seguro" (apenas
  aparece oferta). → clasifícalos por profundidad y volumen en el detector.

**Cierre de Lote 3.** Wyckoff queda como spec: fases con eventos detectables,
9 tests como checklist, ondas/fuerza relativa, creek/JAC/BUEC, conteo P&F,
máquina de estados y tipos de spring. Lista para `wyckoff.py`.

---

# LOTE 4 — Sección 3: Order flow / microestructura ✅ detallado

## 4.0 · Nota crítica de datos (léela primero)
El order flow necesita **operaciones (tick) con lado comprador/vendedor**, que el
OHLCV de Yahoo **NO** tiene. Realidad práctica:
- **Cripto: SÍ es construible y GRATIS.** Binance/Bybit exponen las operaciones
  con `isBuyerMaker` → delta/CVD/footprint **reales**. Es un **diferenciador
  real** del módulo cripto (casi ningún competidor retail lo da bien).
- **Acciones/forex:** requiere **feed de pago** (tick + bid/ask). De momento:
  **lecciones** + "en vivo solo cripto".
- El sandbox bloquea la red → construir con **fixtures** de trades.

## 4.1 · Delta y CVD — #29
Desde cada operación `{price, qty, isBuyerMaker}`:
- `isBuyerMaker = true` → comprador es maker → **taker vendió** → **delta −qty**.
- `isBuyerMaker = false` → **taker compró** → **delta +qty**.
`delta_barra = Σ signo·qty` ; `CVD = suma acumulada`. El CVD **confirma o
desmiente** el precio.

## 4.2 · Footprint e imbalance — #30,33
- **Footprint:** dentro de cada vela, agrupa el volumen por **nivel de precio**,
  separando compra (al ask) y venta (al bid) → rejilla numérica.
- **Imbalance:** en un nivel, si `ask_vol` vs `bid_vol` en diagonal supera un
  **ratio ≥ 300%** → agresión fuerte. **≥3 apilados** = zona institucional.

## 4.3 · Absorción — #31
**Mucho volumen/delta a un nivel y el precio no avanza** → un pasivo grande
absorbe. Regla: `|delta| alto` + `progreso de precio < ε` en ese nivel → marca
**absorción**; suele preceder giro.

## 4.4 · Divergencia de delta / CVD en extremos — #32
Precio hace **nuevo máximo** pero **CVD hace máximo más bajo** → compras
agotándose → posible giro (espejo en mínimos). Es de las señales de order flow
más fiables.

## 4.5 · Iceberg — #34
Reposiciones repetidas **al mismo precio** (muchos prints sin que el precio se
mueva) → orden oculta grande. Detección: cuenta de operaciones a un precio fijo
sobre un umbral **sin desplazamiento**.

## 4.6 · DOM / spoofing — #35
Necesita **libro L2** (*depth stream*). Órdenes grandes que **aparecen y
desaparecen** sin ejecutarse = *spoofing*. ⚠️ Más complejo; como lección +
detector avanzado opcional.

## 4.7 · Lectura de cinta (time & sales) — #37
**Velocidad y tamaño** de los prints: ráfagas de órdenes grandes al ask = compra
agresiva. Métrica: prints/seg y tamaño medio.

## 4.8 · Implementación web
- **Backend `orderflow.py` (cripto):** fetch de aggTrades (Binance) con capa
  mockeable; funciones puras `compute_delta_cvd(trades, interval)`,
  `build_footprint(trades, bucket)`, `detect_imbalances / absorption /
  cvd_divergence`. Endpoint `/education/orderflow/{symbol}?interval=5m` (guard
  categoría=cripto).
- **Frontend:** panel footprint (rejilla), línea **CVD** bajo el precio, badges
  de absorción/divergencia. i18n ×8: `ofCvd, ofFootprint, ofAbsorption,
  ofImbalance, ofNote`.
- **Estadística viva:** tasa de giro tras divergencia de CVD / absorción, muestra.

**Honestidad.** Order flow ≠ predicción: es **lectura de intención en tiempo
real**. Sólido intradía en **cripto**; en forex spot el volumen es parcial.
Mostrar siempre la muestra. **Barrido de liquidez (#36)** ya está en Lote 2.2.

---

# LOTE 5 — Sección 16: Chartismo clásico (con objetivo medido) ✅ detallado

## 5.1 · Enfoque unificado de detección
Todos se detectan sobre **swings** (reusa `detect_swings`) + **ajuste de
directrices** a máximos y mínimos:
1. Extrae swings del periodo.
2. Ajusta una recta a los **swing highs** y otra a los **swing lows** (regresión).
3. **Clasifica por las pendientes:** ambas planas = **rectángulo**; techo plano +
   mínimos subiendo = **triángulo ascendente**; suelo plano + máximos bajando =
   **descendente**; convergentes = **simétrico**; divergentes = **broadening**;
   ambas subiendo/convergiendo = **cuña**.
4. Los de picos (**H&S**, **dobles/triples**) se detectan por el patrón de
   swings (p. ej. 5 swings con el central más alto y valles ~iguales = H&S).
5. **Objetivo medido** por la fórmula de cada patrón (tabla 5.2) y, opcional,
   **confirmación de volumen** en la ruptura.

## 5.2 · Tabla: geometría · sesgo · objetivo medido — #139-156
| Patrón | Geometría (swings) | Sesgo | Objetivo medido | Nota |
|---|---|---|---|---|
| **H-C-H techo** | 3 picos, central mayor, valles ≈ (neckline) | bajista | `neckline − (cabeza − neckline)` | vol baja hacia hombro der.; falla ~4% |
| **H-C-H inverso** | espejo | alcista | `neckline + (neckline − cabeza)` | ídem |
| **Doble techo/suelo** | 2 extremos ≈ iguales | reversión | ruptura del pico/valle central `± altura` | *throwback* frecuente |
| **Triple techo/suelo** | 3 extremos ≈ iguales | reversión | `± altura` | menos común, fiable |
| **Cup & Handle** | U redonda + asa corta en mitad superior | alcista cont. | `ruptura + profundidad de la taza` | O'Neil; asa poco profunda |
| **Rounding bottom** | cuenco redondo | alcista | `borde + profundidad` | volumen en cuenco |
| **Banderas/gallardetes** | asta + consolidación corta contra-tendencia | continuación | `ruptura + altura del asta` | "media asta"; fiable si asta fuerte |
| **High Tight Flag** | subida ≥90% en ~2 meses + bandera estrecha | alcista | `ruptura + altura` | Bulkowski: de las más fiables |
| **Rectángulo** | 2 líneas horizontales | continuación | `ruptura ± altura` | |
| **Triángulo ascendente** | techo plano + mínimos subiendo | alcista | `ruptura + altura` | vol baja hacia el ápice |
| **Triángulo descendente** | suelo plano + máximos bajando | bajista | `ruptura − altura` | |
| **Triángulo simétrico** | convergente | **ambiguo → romper** | `ruptura ± altura (parte ancha)` | dirección incierta |
| **Cuña ascendente** | 2 líneas subiendo, convergen | bajista | retorno al inicio de la cuña | |
| **Cuña descendente** | 2 líneas bajando, convergen | alcista | ídem | |
| **Broadening/megáfono** | 2 líneas divergentes | reversión (difícil) | `altura en la ruptura` | poco fiable |
| **Diamante** | broadening → convergente | reversión | `± altura` | raro |
| **Bump-and-Run** | directriz *lead-in* 1x, *bump* 2-3x pendiente, rotura de la lead-in | reversión | vuelta a la lead-in/base | Bulkowski |
| **V-spike** | giro brusco en V | reversión | — (difícil anticipar) | reactivo |
| **Scallop** | J redondeada | continuación | según tipo | Bulkowski |
| **Darvas Box** | cajas con techo/suelo estables | continuación alcista | ruptura de la caja; stop bajo la caja | Darvas |

## 5.3 · Ejemplos de objetivo medido
- **H-C-H techo:** hombro izq. 110, cabeza 120, hombro der. 111, **neckline 100**
  → objetivo `100 − (120 − 100) = **80**`.
- **Bandera alcista:** asta de 50 → 65 (**altura 15**), bandera 62–64, ruptura en
  64 → objetivo `64 + 15 = **79**`.

## 5.4 · Estadística de Bulkowski (qué mostrar)
Por patrón: **tasa de fallo** (*break-even failure rate*), **movimiento medio**
tras la ruptura, y **% de throwback/pullback**. Se muestran junto al patrón
detectado, con la advertencia de que son **tasas históricas**, no promesas.

## 5.5 · Implementación web
- **Backend `chart_patterns.py`:** detector geométrico sobre swings →
  `[{pattern, points, lines(neckline/trendlines), target, breakout, confidence,
  bulkowski:{failRate, avgMove, throwback}}]`. Endpoint
  `/education/chart-pattern-scan/{symbol}`.
- **Frontend:** overlay de las líneas + objetivo en el gráfico; tarjeta con los
  patrones detectados, objetivo y stat de Bulkowski; **reusa `ChartPatternFigure`**
  (las 42 figuras SVG ya construidas) para la mini-ilustración.
- **i18n ×8:** `cpTitle, cpTarget, cpBreakout, cpFailRate, cpNote`.
- **Estadística viva:** % de veces que el precio **alcanzó el objetivo medido**
  por patrón/activo; muestra.

## 5.6 · Honestidad
La detección de patrones es **ajuste geométrico** → hay **varios encajes
válidos** (subjetividad inevitable). Las tasas de Bulkowski son **base histórica**.
El objetivo medido se alcanza quizá la **mitad** de las veces. El **simétrico**
no da dirección: espera la ruptura. Mostrar confianza + muestra, nunca "esto va a
80 seguro".

---

# LOTE 6 — Secciones 5 y 6: Amplitud/internals + Intermercado/RS ✅ detallado

## 6A · Amplitud de mercado / internals (44–53)

**Nota de datos.** La amplitud **no** sale de un solo símbolo: necesita el
**universo del índice** (avances/descensos, nuevos máx/mín, % sobre MM200 de
todos sus componentes) o símbolos de amplitud ($ADD/$TRIN/$ADVN…). 🔧 Es una
herramienta de **nivel de mercado**, no por activo.

**Fórmulas.**
- **A-D Line (#44):** suma acumulada de `(avances − descensos)` diarios.
- **McClellan Oscillator (#45):** `EMA19(net) − EMA39(net)`, con
  `net = (avances − descensos)` (mejor ratio-ajustado `(a−d)/(a+d)·1000`).
- **McClellan Summation Index (#46):** suma acumulada del McClellan Oscillator.
- **TRIN/Arms (#47):** `(avances/descensos) / (vol_av/vol_desc)`. `>1` presión
  vendedora, `<1` compradora; **extremos = reversión**.
- **Nuevos Máx − Mín (#48):** neto de nuevos máximos de 52 semanas.
- **% sobre MM200 (#49):** amplitud de la tendencia (participación).
- **A-D Volume line (#50):** acumulado de `(vol subida − vol bajada)`.
- **Zweig Breadth Thrust (#51):** EMA10 de `avances/(avances+descensos)` pasa de
  `<40%` a `>61,5%` en **≤10 días** → **rarísimo y muy alcista**.
- **Hindenburg Omen (#52):** **muchos** nuevos máximos **Y** mínimos a la vez
  (>2,2% cada uno) + filtros → aviso de techo. ⚠️ Muchos falsos positivos.
- **Divergencia de amplitud (#53):** índice hace **nuevo máximo** pero la A-D
  Line / % sobre MM200 **no** → internals débiles, techo probable.

**Implementación.** `breadth.py` que calcula sobre el universo (traer
constituyentes + su avance/descenso) o ingiere símbolos de amplitud. Endpoint
`/education/breadth?index=SPX`. Frontend: **dashboard de amplitud** (separado del
escáner por activo) con McClellan, A-D, TRIN, nuevos máx/mín y alertas de
divergencia. i18n `brAdLine, brMcclellan, brTrin, brThrust, brDivergence`.

**Honestidad.** Es para **timing de índices** (grandes techos/suelos), no por
activo; necesita universo. Hindenburg y Zweig son **raros**: mostrar frecuencia
histórica.

## 6B · Intermercado y fuerza relativa (54–59)

**Nota de datos.** Necesita **varios símbolos** (bonos, sectores, dólar) → varias
llamadas a `get_ohlc_history`. Mayormente 🔨/🔧.

**Fórmulas/definiciones.**
- **RS line (#55):** `precio(activo) / precio(benchmark)`. Sube = **bate** al
  benchmark. (No confundir con RSI.)
- **RRG (#56):** dos ejes — **RS-Ratio** (fuerza relativa normalizada) y
  **RS-Momentum** (momentum de esa fuerza) → 4 cuadrantes:
  **Leading / Weakening / Lagging / Improving**. Mapa de **rotación** de sectores.
- **Ratio charts (#57):** `A/B` como termómetro: **cobre/oro** (riesgo),
  **acciones/bonos**, **SPX/oro**.
- **Curva de tipos (#58):** spread **10a−2a**; inversión → régimen de recesión →
  filtro **risk-off** para renta variable.
- **Spreads de crédito (#59):** **HYG/LQD** o el spread high-yield; ensanchándose
  = **risk-off**.
- **Intermercado clásico (#54, Murphy):** dólar↓→materias↑; bonos y acciones
  suben juntos hasta el fin de ciclo; etc.

**Implementación.** `intermarket.py`: ratios/RS desde múltiples OHLCV; RRG con
benchmark + universo. Frontend: **overlay de RS line**, tarjeta de ratio chart,
**gráfico RRG de cuadrantes** y un **badge de "régimen de mercado"** (curva de
tipos + crédito: risk-on/off). i18n `imRs, imRrg, imRatio, imRegime`.

**Honestidad.** Las relaciones intermercado **cambian según el ciclo**; la RS es
**relativa** (puede subir en un mercado que cae). El RRG es **mapa de rotación**,
no señal de timing.

---

# LOTE 7 — Secciones 10 y 11: Volatilidad/canales + Gráficos anti-ruido ✅ detallado

## 7A · Volatilidad y canales (98–104) — todo 🔨 sobre OHLCV

**Fórmulas base.**
- **Bollinger:** `media = SMA(20)`; `sup/inf = media ± 2·stdev(20)`.
- **Keltner:** `media = EMA(20)`; `sup/inf = media ± m·ATR(10)` (m≈1,5–2).
- **Donchian(N):** `sup = max(high, N)`, `inf = min(low, N)`.

**Técnicas.**
- **Bollinger Squeeze (#98):** `bandwidth = (sup − inf)/media`. **Squeeze** =
  bandwidth en **mínimo de N periodos** (p. ej. 6 meses) → contracción de
  volatilidad → **expansión inminente**; operas la **dirección de la ruptura**.
- **%B + divergencia (#99):** `%B = (precio − inf)/(sup − inf)`. `>1` sobre la
  banda, `<0` bajo ella. **M-top/W-bottom** de Bollinger = precio nuevo máximo
  pero **%B máximo más bajo** → divergencia.
- **TTM Squeeze (#100, Carter):** *squeeze ON* cuando **las Bollinger están
  DENTRO de las Keltner** (baja volatilidad); **dispara** al salir las BB fuera
  de las KC. Histograma de momentum (regresión del precio vs su media) = dirección.
- **Donchian breakout (#101, Turtles):** entrada al cerrar fuera del canal de 20;
  salida con canal de 10.
- **Chandelier Exit (#102):** stop largo = `max(high,22) − 3·ATR(22)`; corto =
  `min(low,22) + 3·ATR(22)`. Trailing (en largos solo sube).
- **VCP (#103, Minervini):** serie de **retrocesos cada vez más estrechos**
  (p. ej. 25% → 15% → 8%) con **volumen secándose** → punto pivote de compra en
  el máximo de la zona más ajustada.
- **Keltner Channels (#104):** canal de EMA ± ATR; tendencia = fuera del canal.

**Ejemplos.**
- **Squeeze:** SMA20=100, stdev=2 → sup 104, inf 96, `bandwidth = 8/100 = 0,08`.
  Si es el menor en 6 meses → squeeze; ruptura sobre 104 = largo.
- **%B:** precio 103, inf 96, sup 104 → `%B = 7/8 = 0,875`.
- **Chandelier:** `max(high,22)=130`, `ATR22=3` → stop largo `130 − 9 = 121`.

**Implementación.** Funciones puras en `indicators.py` (rolling); overlay de
bandas/canales en el gráfico + **puntos de squeeze** bajo el precio; VCP como
badge en el escáner. i18n `bbSqueeze, pctB, ttmSqueeze, donchian, chandelier,
vcp` ×8. Estadística viva: % de rupturas de squeeze que siguieron en la dirección.

**Honestidad.** Las bandas son **envolventes de volatilidad**, no señales por sí
solas; el squeeze predice **expansión, no dirección**. VCP es algo interpretativo.

## 7B · Gráficos que filtran ruido (105–110) — 🔨 (transforman OHLCV)

Son **modos de render alternativos** que quitan tiempo/ruido:
- **Point & Figure (#105):** columnas **X** (sube) / **O** (baja), `box` y
  `reversal` (N cajas). Ignora tiempo; da conteos de objetivo (ver Lote 3.10) y
  patrones (double top/bottom breakout, catapulta).
- **Renko (#106):** **ladrillos** de tamaño fijo (o por ATR); ladrillo nuevo solo
  si el precio se mueve ≥ tamaño. Aísla la tendencia.
- **Kagi (#107):** línea que **invierte** con un *reversal amount*; cambia de
  **grosor** (yang/yin) al romper el máximo/mínimo previo.
- **Three-Line Break (#108):** línea nueva solo si el precio supera el extremo de
  las **3** líneas previas; revertir exige romper 3 líneas.
- **Heikin-Ashi (#109):** velas promediadas (fórmulas en
  `APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md` §4).
- **Range bars (#110):** barra nueva cada rango de precio fijo, sin tiempo.

**Implementación.** Funciones `to_pnf / to_renko / to_kagi / to_three_line /
to_heikin_ashi / to_range_bars(rows, params)` que devuelven series listas para
dibujar; **selector de tipo de gráfico** en el componente del chart. i18n
`chartTypePnf, chartTypeRenko, chartTypeKagi, chartType3lb, chartTypeHA,
chartTypeRange`.

**Honestidad.** Filtran ruido **a cambio de ocultar tiempo y volumen** y de
**retardo**; el último ladrillo/línea puede "repintar" hasta confirmarse. Son
lente de tendencia, no máquinas de señales.

---

# LOTE 8 — Secciones 12 y 13: Medias/tendencia + Ehlers/DSP ✅ detallado

## 8A · Medias móviles y sistemas de tendencia (111–117) — 🔨

- **Ichimoku (5 líneas + Kumo) (#111):**
  `Tenkan=(max(H,9)+min(L,9))/2`; `Kijun=(max(H,26)+min(L,26))/2`;
  `SpanA=(Tenkan+Kijun)/2` (desplazado +26); `SpanB=(max(H,52)+min(L,52))/2`
  (+26); `Chikou=close` (−26). **Kumo** (nube) = área entre A y B; precio **sobre
  la nube** = alcista; **giro de la nube futura** = cambio; **Chikou** por encima
  del precio de hace 26 = confirmación. *(Las 3 teorías profundas —tiempo, onda,
  objetivos— en `APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md`.)*
- **GMMA / Guppy (#112):** dos grupos de EMAs — **corto** (3,5,8,10,12,15) y
  **largo** (30,35,40,45,50,60). Separación amplia del grupo corto sobre el largo
  = tendencia fuerte; **compresión** del corto = pausa; **cruce** de grupos =
  cambio. (Corto = traders; largo = inversores.)
- **Hull MA (#113):** `HMA(n) = WMA( 2·WMA(n/2) − WMA(n) , √n )`. Muy poco
  retardo. Tendencia = **pendiente** de la HMA. Ej.: HMA(16) usa WMA(8), WMA(16)
  y WMA(…,4).
- **KAMA (#114, Kaufman):** `ER = |close−close[n]| / Σ|Δclose|`;
  `SC = (ER·(2/3 − 2/31) + 2/31)²`; `KAMA = KAMA_prev + SC·(precio − KAMA_prev)`.
  **Rápida en tendencia, lenta en ruido.** Ej.: avance neto 10 con recorrido 20
  → `ER=0,5`.
- **Coppock Curve (#115):** `WMA10( ROC(14) + ROC(11) )` (mensual). Señal de
  **suelo de largo plazo** cuando gira al alza **desde debajo de cero**.
- **Golden/Death cross + filtro de amplitud (#116):** cruce SMA50×SMA200; añade
  **% de valores sobre la MM200 subiendo** para filtrar sierra.
- **Displaced MA / envelopes (#117):** MA desplazada N barras (DiNapoli 3×3 =
  SMA(3) desplazada 3); **envelopes** = MA ± %.

**Implementación.** Puras en `indicators.py`; overlays (Ichimoku, GMMA, HMA,
KAMA, envelopes) + oscilador Coppock en panel; badge de "cruce dorado/muerte".
i18n `ichimoku, gmma, hma, kama, coppock, goldenCross, displacedMa`.
**Honestidad.** Adaptativas/rápidas **reducen** el retardo, no lo eliminan; los
cruces **dan sierra en rango**; Coppock es de **largo plazo**.

## 8B · Ehlers / DSP (118–122) — 🔨 (procesado de señal)

- **Fisher Transform (#118):** normaliza el precio a [−1,1] en N y aplica
  `Fisher = 0.5·ln((1+x)/(1−x))` → **giros muy marcados** (colas del gaussiano).
- **Roofing Filter (#119):** **paso-alto** (quita tendencia/baja frecuencia) +
  **super-smoother** (quita ruido/alta frecuencia) = paso-banda → oscilador más
  limpio.
- **Sinewave / MESA (#120):** mide el **ciclo dominante** y dibuja seno + seno
  adelantado; sus cruces marcan giros de ciclo; **se aplana en modo tendencia**.
- **Laguerre RSI / filtro (#121):** filtro Laguerre de 4 polos con factor
  `gamma` (amortiguación); RSI sobre la serie filtrada → **muy responsivo con
  poco retardo**.
- **Instantaneous Trendline (#122):** línea de tendencia suavizada usando el
  ciclo dominante para **quitar el retardo**; tendencia = precio sobre/bajo ella.

**Implementación.** `ehlers.py` (funciones puras); paneles de oscilador
(Fisher/Laguerre RSI/Roofing/Sinewave) + overlay de la Instantaneous Trendline.
i18n `fisher, roofing, sinewave, laguerreRsi, instTrend`.
**Honestidad.** Los indicadores de Ehlers **asumen comportamiento cíclico**: en
tendencias fuertes el Sinewave/MESA **se confunde**. Reducen retardo, no predicen.

---

# LOTE 9 — Secciones 14 y 20: Osciladores olvidados + Momentum/régimen ✅ detallado

## 9A · Osciladores (uso original, 123–135) — 🔨

- **RSI failure swings (#123, Wilder original):** la señal **real** de Wilder (no
  el sobrecompra/venta): *bullish failure swing* = RSI cae bajo 30, rebota,
  recae **sin perder 30** y **rompe su pico previo de RSI** → compra (espejo
  bajista sobre 70). Más las **divergencias** y roturas de directriz **en el RSI**.
- **RSI(2) (#124, Connors):** RSI de **2 periodos** para reversión: comprar con
  `RSI2 < 5` **sobre la MM200**; salir con `RSI2 > 70` o `precio > MM5`.
- **Connors RSI (#125):** media de `RSI(3)` del precio + `RSI(2)` de la **racha** +
  **percentil** del ROC(1) a 100 días.
- **CCI (#126, Lambert):** `CCI = (typical − SMA20)/(0,015·desv.media)`. Rupturas
  de **±100** (tendencia) y cruce de **cero**. Ej.: typical 102, SMA 100, desv 1,2
  → `CCI = 2/0,018 ≈ 111`.
- **Elder Ray + Impulse (#127):** `BullPower = high − EMA13`, `BearPower = low −
  EMA13`. **Impulse:** barra **verde** si EMA13 y el histograma MACD suben (compra
  permitida), **roja** si ambos bajan, **azul** si mixto.
- **Stochastic Pop (#128, Bernstein):** uso de **momentum** del estocástico —
  ruptura de 80 con fuerza = **continuación** ("pop"), no reversión.
- **ADX/DMI (#129, Wilder):** `ADX>25` = tendencia (usa herramientas de
  tendencia); `ADX<20` = rango (usa osciladores). **Filtro de régimen.**
- **Vortex (#130):** `VI+ = Σ|high−low_prev|/ΣTR`, `VI− = Σ|low−high_prev|/ΣTR`;
  cruces = señal.
- **Aroon (#131):** `Up = 100·(n − barras desde el máximo)/n`; ídem Down con el
  mínimo. Ej.: máximo hace 5 en n=25 → `Up = 80`.
- **TRIX (#132):** ROC de una **EMA triple**; cruce de cero/señal, filtra ruido.
- **Schaff Trend Cycle (#133):** estocástico aplicado al **MACD** → señal cíclica
  más rápida.
- **Awesome Oscillator (#134, Williams):** `AO = SMA5(mediano) − SMA34(mediano)`;
  "saucer", "twin peaks", cruce de cero.
- **Ultimate Oscillator (#135, Williams):** presión compradora ponderada
  (7/14/28) → reduce divergencias falsas.

## 9B · Momentum, rate-of-change y filtros de régimen (187–199) — 🔨

- **ROC (#187):** `(close − close[n])/close[n]·100`. **Momentum (#188):**
  `close − close[n]`.
- **KST (#189, Pring):** suma **ponderada de 4 ROC suavizados** de distinta
  longitud; cruce de señal. **Special K (#190):** los combina en una sola curva
  para giros de ciclo.
- **PMO (#191):** ROC doblemente suavizado (DecisionPoint).
- **Stochastic RSI (#192):** estocástico **sobre el RSI** → más sensible.
- **RMI (#193):** RSI generalizado con lookback de momentum `m`.
- **CMO (#194, Chande):** `(ΣUp − ΣDown)/(ΣUp + ΣDown)·100`.
- **Balance of Power (#195):** `(close − open)/(high − low)`.
- **Force Index (#196, Elder):** `(close − close_prev)·volumen`, luego EMA →
  dirección **+ volumen**.
- **Choppiness Index (#197):** `100·log10(ΣATR(n)/(maxH−minL))/log10(n)`. **Alto
  (~61,8) = rango; bajo (~38,2) = tendencia.**
- **Efficiency Ratio (#198, Kaufman):** `neto/recorrido` → régimen.
- **VHF (#199):** `(maxC−minC)/Σ|Δclose|` → alto = tendencia.

## 9C · Implementación y honestidad
`oscillators.py` (todas puras); paneles de oscilador + un **medidor único de
régimen "tendencia vs rango"** que combina ADX + Choppiness + ER + VHF. i18n
`rsiFailure, rsi2, connorsRsi, cci, elderRay, adx, aroon, trix, stc, ao,
ultimate, kst, cmo, forceIndex, choppiness` (etc.).
**Honestidad.** Los osciladores **fallan en el régimen contrario**: en tendencia
fuerte el "sobrecompra" aguanta y da ventas malas → por eso el **filtro de
régimen** (ADX/Choppiness) va **primero**. Las divergencias fallan; mostrar muestra.

---

# LOTE 10 — Secciones 17 y 18: Líneas/canales/regresión + Fibonacci ✅ detallado

## 10A · Líneas, canales y regresión (157–169) — 🔨 (sobre swings)

- **Trendline (#157):** une ≥2 swing lows (soporte) o highs (resistencia); el 3er
  toque confirma. **Log vs lineal:** en log unes **%**; una directriz válida en
  lineal puede estar **rota en log** (¡señales opuestas!). Auto = regresión por
  los swings.
- **Canal paralelo (#158):** directriz + paralela en el extremo opuesto.
- **Speed Resistance Lines (#159, Gould):** de un mínimo a un máximo, divide el
  rango vertical en **1/3 y 2/3** y traza líneas desde el mínimo → soporte/
  resistencia dinámicos.
- **Fan principle (#160):** tras una tendencia, sucesivas directrices; **rota la
  3ª** = reversión (tres líneas del abanico).
- **Internal trendlines (#161, Sperandeo):** recta de mejor ajuste por el **cuerpo**
  del precio (deja toques a ambos lados), ignora extremos.
- **Linear Regression Channel (#162):** recta de mínimos cuadrados por N cierres;
  canal = ± desviación máxima (o ±k·stdev) paralela.
- **Raff Regression Channel (#163):** regresión ± la **mayor distancia** de la
  recta a cualquier precio del rango (ancho fijo).
- **Standard Error Bands (#164, Andersen):** regresión ± k·**error estándar**;
  estrechándose = tendencia, ensanchándose = giro.
- **Time Series Forecast (#165):** el **extremo** de la recta de regresión graficado
  barra a barra (regresión móvil).
- **Pendiente / R² (#166):** pendiente = dirección/fuerza; **R²≈1** = tendencia
  limpia; R² bajo = ruido. Úsalo como **"calidad de tendencia"**.
- **ZigZag (#167):** filtra tramos menores a X% (o ATR); une swings
  significativos. **Repinta el último tramo** → estructura/olas/patrones, no señal.
- **Fractales (#168, Williams):** patrón de 5 barras (máximo con 2 máximos
  menores a cada lado = fractal alcista; espejo bajista) → marca swings.
- **Alligator + Gator (#169, Williams):** 3 SMMA (13/8/5) desplazadas (8/5/3):
  **jaw/teeth/lips**. Entrelazadas = "dormido" (rango); boca abierta = tendencia.
  **Gator** = histograma de convergencia/divergencia de las 3.

**Implementación.** `lines.py` puras; overlay de directrices/canales/regresión +
**badge de R² (calidad de tendencia)**. i18n `trendline, channel, speedLines,
regChannel, raff, seBands, tsf, r2, zigzag, fractal, alligator`.
**Honestidad.** Directriz y regresión dependen del **anclaje/ventana**; el ZigZag
**repinta**; log vs lineal cambia el veredicto.

## 10B · Fibonacci (170–175) — 🔨

Dado un tramo A→B (mínimo→máximo alcista, `d = B−A`):
- **Retrocesos (#170):** `nivel = B − d·r`, `r ∈ {0,236; 0,382; 0,5; 0,618; 0,786}`.
  Ej. A=100, B=120 → **38,2%=112,4 · 50%=110 · 61,8%=107,6** (zona de compra).
- **Extensiones (#171):** objetivos más allá de B: `B + d·{0,272; 0,618}` →
  **1,272=125,4 · 1,618=132,4**.
- **Fibonacci fan (#172):** directrices desde el pivote por los niveles de retroceso
  → S/R **angulares**.
- **Fibonacci arcs (#173):** arcos centrados en el pivote a radios = fracciones fib
  → S/R por **tiempo+precio**.
- **Fibonacci time zones (#174):** verticales en conteos fib (1,2,3,5,8,13…) →
  fechas candidatas. ❌ (basado en tiempo, infalsable — marcado como descarte).
- **Fibonacci channels (#175):** canal paralelo con líneas internas a fracciones
  fib del ancho.

**Implementación.** `fibonacci.py` puras; niveles/objetivos calculados de swings
auto-detectados; overlay + tabla de niveles. i18n `fibRetr, fibExt, fibFan,
fibArc, fibChannel`.
**Honestidad.** Fibonacci son **zonas de confluencia**, en parte **autocumplidas**
(mucha gente las mira), no números mágicos. Dependen del tramo elegido. Las
**time zones** no las vendas como fiables.

---

# LOTE 11 — Secciones 9 y 22: Volumen + Niveles por sesión ✅ detallado

## 11A · Volumen (87–97) — 🔨 (VSA #87-90 ya en Lote 1.5)

- **OBV (#91, Granville):** total corrido `+vol` si `close>close_prev`, `−vol` si
  `<`. **Divergencia:** precio sube, OBV baja = débil.
- **A/D Line (#92, Chaikin):** `MFM = ((close−low)−(high−close))/(high−low)`;
  `MFV = MFM·vol`; A/D = suma acumulada. Mide **dónde cierra dentro del rango**.
  Ej.: cierre pegado al máximo → MFM≈+1 → acumulación.
- **Chaikin Money Flow (#93):** `Σ(MFV,20)/Σ(vol,20)`; `>0` acumulación.
- **Money Flow Index (#94):** RSI del **money flow** (typical·vol) → RSI
  ponderado por volumen; sobrecompra/venta + divergencias.
- **Ease of Movement (#95, Arms):** `EMV = (mediano − mediano_prev)/(vol/(high−low))`;
  alto = el precio se mueve **fácil con poco volumen**.
- **NVI / PVI (#96, Fosback):** **NVI** cambia solo en días de **volumen bajo**
  ("dinero listo"); **PVI** en días de volumen alto (multitud). `NVI > su EMA255`
  = alta probabilidad de mercado alcista.
- **Klinger Volume Oscillator (#97):** fuerza de volumen `EMA34 − EMA55` + señal;
  flujo de dinero de largo plazo.

**Implementación.** `volume_indicators.py` (todas puras); paneles + divergencias.
i18n `obv, adLine, cmf, mfi, emv, nvi, klinger`.
**Honestidad.** Necesitan **volumen fiable** (forex spot = parcial → menos válido).

## 11B · Niveles de referencia por sesión (211–217)

- **PDH/PDL (#211):** máximo/mínimo del **día previo** → imanes y niveles de
  ruptura/reversión intradía. 🔨 (del diario).
- **PWH/PWL (#212):** extremos de la **semana previa**. 🔨.
- **Apertura semanal/mensual (#213):** el *open* del periodo como **pivote**;
  por encima = sesgo alcista del periodo. 🔨.
- **Números redondos / 00 (#214):** niveles psicológicos donde se agrupan stops. 🔨.
- **Rango de la 1ª hora (IB) + 50% del rango previo (#215):** el máx/mín de la
  primera hora define el **Initial Balance**; su ruptura y el 50% del rango del
  día previo como pivote. 🔧 (intradía).
- **Aperturas de sesión (#216):** **Londres 08:00 local** y **NY 09:30 ET** =
  estallidos de volatilidad; estrategias de rango de apertura. 🔧.
- **Gap-and-go vs gap-fade (#217):** clasifica el gap matinal: **aguanta y
  continúa** (go) vs **rellena** al cierre previo (fade). Estadística por tamaño
  de gap. 🔨 (diario) / 🔧 (intradía fino).

**Implementación.** `session_levels.py`: PDH/PDL/PWH/PWL/open semanal/redondos y
clasificación de gaps desde diario; IB/aperturas desde intradía. Overlay de
**líneas de referencia** + badge de gap. i18n `pdhPdl, pwhPwl, weekOpen,
roundNumber, initialBalance, gapGo, gapFade`.
**Honestidad.** Son **niveles de referencia**, no señales por sí solos; IB y
aperturas necesitan intradía. Ejemplo gap: +2% de apertura; si a los 30 min sigue
**sobre el cierre previo** → *gap-and-go*; si lo pierde → *fade*.

---

# LOTE 12 — Secciones 19 y 21: Medias avanzadas + Estadística cuantitativa ✅ detallado

## 12A · Medias móviles avanzadas (176–186) — 🔨

- **MACD (#176, Appel):** `MACD = EMA12 − EMA26`; `señal = EMA9(MACD)`;
  `histograma = MACD − señal`. Cruce de señal, cruce de **cero**, **divergencia**
  del histograma.
- **DEMA / TEMA (#177, Mulloy):** `DEMA = 2·EMA − EMA(EMA)`;
  `TEMA = 3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))` → menos retardo.
- **T3 (#178, Tillson):** DEMA generalizada con factor de volumen (0,7): suave +
  responsiva.
- **VIDYA (#179, Chande):** EMA cuyo suavizado escala con la **volatilidad/CMO**
  → rápida en tendencia.
- **ALMA (#180):** media con pesos **gaussianos** (offset + sigma) → suave con
  poco retardo.
- **Zero-Lag EMA (#181):** `EMA(precio + (precio − precio[lag]))` para cancelar
  el retardo.
- **FRAMA (#182, Ehlers):** EMA cuyo `alpha` se adapta a la **dimensión fractal**.
- **Jurik MA (#183):** filtro adaptativo de bajo retardo (aprox.).
- **MA ribbon (#184):** muchas MAs; **abanico abierto** = tendencia, **enredadas**
  = rango.
- **Pendiente/ángulo de MA (#185):** derivada de la MA como filtro de tendencia.
- **Envelopes (#186):** `MA ± %` (p. ej. ±3%).

**Implementación.** `indicators.py` puras; overlays + histograma MACD.
**Honestidad.** Reducen retardo, no lo eliminan; los cruces **dan sierra en rango**.

## 12B · Estadística cuantitativa replicable (200–210) — 🔨

- **Z-score (#200):** `z = (precio − media(n))/stdev(n)`; `|z|>2` = extremo →
  banda de reversión. Ej.: precio 110, media 100, stdev 5 → `z = 2`.
- **Exponente de Hurst (#201):** R/S; `H>0,5` persistente (tendencia), `H<0,5`
  reversión, `H≈0,5` aleatorio. **Filtro de régimen.** Ej.: `H=0,6` = tiende.
- **Autocorrelación (#202):** correlación del retorno con su rezago; `+` momentum,
  `−` reversión.
- **Volatilidad histórica — percentil (#203):** rankea la HV actual (stdev de
  retornos anualizada) vs su historia → régimen de vol alta/baja.
- **IV Rank / IV Percentile (#204):** `(IV − min)/(max − min)` a 1 año; percentil
  = % de días con IV inferior. Para **timing de opciones** (vender prima con IV
  rank alto). 🔧 (tu módulo de opciones). Ej.: IV 30 en rango 15–45 → **rank 50%**.
- **Matriz de correlación (#205):** correlación por pares de retornos → cobertura /
  candidatos a pairs.
- **Beta (#206):** `cov(activo, índice)/var(índice)`.
- **Pairs — z-score del spread (#207):** `spread = A − β·B` (o log-ratio); entra
  con `|z|>2`, sale en `z=0`. Ej.: `z=2,5` → corto A / largo B.
- **Cointegración (#208):** test (ADF sobre residuos / Johansen) de que una combo
  es **estacionaria** → spread operable; + *half-life* OU.
- **Ranking rotacional por RS (#209):** rankea el universo por momentum/RS; mantén
  el top N y rota periódicamente.
- **Desviación respecto a la MM % (#210):** `(precio − MA)/MA·100`; estirón
  extremo = candidato a reversión. Ej.: precio 110, MA200 100 → **+10%**.

**Implementación.** `quant.py` puras; z-score/HV-percentil/desviación como
paneles + badge de régimen (Hurst); **mapa de calor** de correlación; herramienta
de **pairs** (2 símbolos → z-score del spread); IV rank enlazado a opciones. i18n
`zscore, hurst, autocorr, hvPercentile, ivRank, corrMatrix, beta, pairsZ,
cointegration, rsRank, maDeviation`.
**Honestidad.** La reversión a la media funciona en **rango, no en tendencia** (el
z extremo **persiste** en tendencia); Hurst/autocorrelación son estimaciones de
ventana; pairs/cointegración **se rompen** cuando la relación cambia → re-testear.

---

# TRACKER — estado del detalle (313 técnicas / 31 secciones)

| Sección | Técnicas | Estado |
|---|---|---|
| 1. Wyckoff | 1–12 | ✅ Lote 3 (ampliado 3.6–3.12) |
| 2. Volume/Market Profile | 13–28 | 🟡 parcial *(POC/VA/naked en 1.1; AVWAP en 1.3)* |
| 3. Order flow | 29–37 | ✅ Lote 4 (cripto en vivo; resto lección) |
| 4. DeMark | 38–43 | 🟡 parcial *(TD Sequential en 1.4)* |
| 5. Amplitud/internals | 44–53 | ✅ Lote 6 |
| 6. Intermercado/RS | 54–59 | ✅ Lote 6 |
| 7. Price action avanzado | 60–80 | 🟡 parcial *(falso rompimiento en 1.2)* |
| 8. Smart Money/ICT | 81–86 | ⏳ pendiente |
| 9. Volumen | 87–97 | ✅ Lote 11 (VSA en 1.5) |
| 10. Volatilidad/canales | 98–104 | ✅ Lote 7 |
| 11. Gráficos anti-ruido | 105–110 | ✅ Lote 7 |
| 12. Medias/tendencia | 111–117 | ✅ Lote 8 |
| 13. Ehlers/DSP | 118–122 | ✅ Lote 8 |
| 14. Osciladores | 123–135 | ✅ Lote 9 |
| 15. Ciclos/tiempo | 136–138 | ⏳ pendiente |
| 16. Chartismo clásico | 139–156 | ✅ Lote 5 |
| 17. Líneas/canales/regresión | 157–169 | ✅ Lote 10 |
| 18. Fibonacci | 170–175 | ✅ Lote 10 |
| 19. Medias avanzadas | 176–186 | ✅ Lote 12 |
| 20. Momentum/régimen | 187–199 | ✅ Lote 9 |
| 21. Estadística cuant | 200–210 | ✅ Lote 12 |
| 22. Niveles por sesión | 211–217 | ✅ Lote 11 |
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
- ~~Lote 4: Order flow (29–37)~~ ✅ hecho (cripto en vivo).
- ~~Lote 5: Chartismo clásico (139–156)~~ ✅ hecho.
- ~~Lote 6: Amplitud/internals (44–53) e intermercado/RS (54–59)~~ ✅ hecho.
- ~~Lote 7: Volatilidad/canales (98–104) y gráficos anti-ruido (105–110)~~ ✅ hecho.
- ~~Lote 8: Medias/tendencia (111–117) y Ehlers/DSP (118–122)~~ ✅ hecho.
- ~~Lote 9: Osciladores olvidados (123–135) y Momentum/régimen (187–199)~~ ✅ hecho.
- ~~Lote 10: Líneas/canales/regresión (157–169) y Fibonacci (170–175)~~ ✅ hecho.
- ~~Lote 11: Volumen (87–97) y Niveles por sesión (211–217)~~ ✅ hecho.
- ~~Lote 12: Medias avanzadas (176–186) y Estadística cuant (200–210)~~ ✅ hecho.
- **Lote 13 (siguiente):** Cuant/algoritmos (263–284) e Intradía hora/minuto (285–300).
- **Lote 14+:** el resto (nacionalidad 241–262; ciclos, P&F, sentimiento, Ehlers+).

*Cada técnica detallada aquí queda lista para pasar a código + i18n ×8 + tarjeta
con estadística viva en el escáner.*
