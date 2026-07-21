# Aprender a fondo: Ichimoku profundo (Hosoda) + escuela rusa

> Guía didáctica para convertir en contenido de la web. Para cada técnica:
> **qué es · por qué/origen · para qué sirve · cómo se hace (con fórmulas) ·
> cuándo usarla · ejemplo numérico · errores comunes / honestidad.**
> Referenciada desde `ANALISIS_TECNICO_AVANZADO.md` (entradas 231–240).
>
> **Marco honesto:** ninguna de estas predice el futuro. Ichimoku ordena
> **estructura, tiempo y objetivos** en un solo marco; el order-flow ruso lee
> **intención** en tiempo real. Son mapas de probabilidad, no bolas de cristal.

---

# PARTE A — Las 3 teorías profundas de Ichimoku (一目均衡表)

**Contexto imprescindible.** Ichimoku Kinko Hyo ("gráfico del equilibrio de un
vistazo") lo creó **Goichi Hosoda** (seudónimo *Ichimoku Sanjin*), periodista
japonés, tras ~20 años de estudio con un equipo de ayudantes; lo publicó en
**1969**. En Occidente solo se popularizó desde ~2000, y **casi siempre a
medias**: la gente usa las 5 líneas y la nube (*Kumo*) e ignora que Hosoda
consideraba esas líneas **lo secundario**. El sistema real se apoya en **tres
teorías** (三大理論, *sandai riron*), y su orden de importancia para Hosoda era:

1. **時間論 — Teoría del Tiempo** (la más importante para él).
2. **波動論 — Teoría de la Onda** (qué estructura se está formando).
3. **値幅観測論 — Teoría de objetivos de precio** (hasta dónde).

La idea central de Hosoda: **el tiempo manda, el precio obedece.** Primero
*cuándo* puede girar el mercado, luego *qué* patrón, y por último *dónde*
(qué precio). Vamos una a una.

---

## 1. Teoría del Tiempo — 時間論 (Jikan-ron)

**Qué es.** Un método para estimar **cuándo** es probable un cambio de mercado
(un *henka-bi*, 変化日 = "día de cambio"), contando **días hábiles** entre
puntos importantes (máximos y mínimos). No mira el precio: mira el calendario
del mercado.

**Por qué / origen.** Hosoda observó que los giros tendían a repetirse en
ciertos **números de barras**. A esos números los llamó **kihon suchi**
(基本数値, "números básicos").

**Para qué sirve.** Para tener **fechas candidatas** de giro o aceleración con
antelación, y para no entrar tarde: si estás en tendencia y se acerca un número
clave, subes la guardia.

**Cómo se hace.**
- **Números básicos (kihon suchi):** `9 · 17 · 26` y sus derivados
  `33 · 42 · 51 · 65 · 76 · 129 · 172 · 200–257`.
  - **9** (*ikkan*): ciclo mínimo (de ahí el Tenkan-sen de 9).
  - **17** = dos tramos de 9 solapados → ciclo corto.
  - **26** = 17 + 9 → ciclo medio (de ahí el Kijun-sen de 26 y el desplazamiento
    de la nube).
- **Cómo contar:** eliges un máximo o mínimo **significativo** = día 1, y cuentas
  barras hacia delante. Al llegar a un kihon suchi (9, 17, 26…), marcas un día
  candidato a cambio.
- **Números de simetría (taito suchi, 対等数値):** además de los fijos, proyectas
  la **duración de un tramo pasado** hacia el futuro. Si el tramo anterior duró
  *N* barras, esperas que el siguiente dure ~*N* (simetría temporal).
- **Confluencia (sakizumari):** cuando **varios** conteos (un kihon suchi + una
  simetría) caen en la **misma fecha**, esa fecha pesa más.

**Cuándo usarla.** Como **filtro de timing** encima de tu análisis: te dice
*qué días vigilar*, no en qué dirección operar. Combínala con la onda (qué
estructura) y el precio (qué nivel).

**Ejemplo.**
- Mínimo importante el **1 de marzo** (día 1).
- Cuentas: día **9** (≈13 mar) → posible micro-giro; día **17** (≈25 mar) →
  turno más relevante; día **26** (≈7 abr) → ciclo medio.
- Además, el tramo bajista previo duró **17 barras**. Proyectas 17 desde el
  mínimo → cae **también** cerca del 25 de marzo. Dos conteos coinciden
  (*sakizumari*) → el **25 de marzo** es tu fecha candidata fuerte de giro.
- Uso: si ese día aparece además una vela de reversión en un nivel (Parte B),
  tienes tiempo + estructura + precio alineados.

**Errores comunes / honestidad.** No es una fecha exacta garantizada: es una
**ventana de mayor probabilidad** (±1–2 barras). Sirve para *estar atento*, no
para operar a ciegas "porque toca el día 26". Sin confirmación de precio, no
hay trade.

---

## 2. Teoría de la Onda — 波動論 (Hado-ron)

**Qué es.** Una clasificación de **cómo se mueve el precio** en tramos (ondas),
para saber qué estructura estás viendo y qué suele venir después.

**Por qué / origen.** Hosoda simplificó todo movimiento a unas pocas formas
básicas; sostuvo que, en el fondo, **todo se reduce a ondas N**.

**Para qué sirve.** Para **identificar la estructura** actual y, sobre todo,
para alimentar los **objetivos de precio** (Parte 3), que se calculan sobre la
onda N.

**Cómo se hace — las ondas:**
- **Onda I** (I波動): un **único tramo** direccional (una pierna: solo sube, o
  solo baja).
- **Onda V** (V波動): **dos tramos** = movimiento + reversión (una V o una V
  invertida).
- **Onda N** (N波動): **tres tramos** = impulso → retroceso → impulso (o su
  espejo bajista). Es la **onda fundamental**; toda tendencia es una sucesión
  de ondas N. Equivale a un 1-2-3 de Wyckoff/Sperandeo.
- **Onda P** (P波動): estructura que **se estrecha** (máximos decrecientes y
  mínimos crecientes → triángulo/cuña contractiva).
- **Onda Y** (Y波動): estructura que **se ensancha** (megáfono; opuesta a la P).

**Cuándo usarla.** Para etiquetar dónde estás: si ves I → V → y se confirma el
tercer tramo, tienes una **N** y ya puedes proyectar objetivos. Una **P**
(contracción) avisa de ruptura inminente; una **Y** (expansión) avisa de caos y
mejor no operar dentro.

**Ejemplo.** Precio sube de 100 a 120 (**onda I**). Retrocede a 112 (ya llevas
dos tramos → **V** en formación). Rompe de nuevo sobre 120 y sigue subiendo:
has completado la primera pata de una **onda N** (100→120→112→…). Ese es el
momento de calcular hasta dónde (Parte 3).

**Errores comunes / honestidad.** Etiquetar ondas tiene algo de subjetivo (como
Elliott, pero mucho más simple). La regla práctica: **espera a que el tercer
tramo confirme** antes de llamarlo N; no adivines la onda a mitad.

---

## 3. Teoría de objetivos de precio — 値幅観測論 (Nehaba Kansoku-ron)

**Qué es.** Cuatro fórmulas que, a partir de los tres puntos de una onda N,
calculan **hasta dónde** puede llegar el siguiente tramo. **Esto es lo más
"olvidado y de valor"** de Ichimoku.

**Por qué / origen.** Hosoda formalizó objetivos como **movimientos medidos**
(simetría de tramos), no como niveles arbitrarios.

**Para qué sirve.** Para fijar **objetivos de toma de beneficios** y para juzgar
si un movimiento tiene recorrido. Se combinan con la nube y con los niveles.

**Cómo se hace.** Tomamos una onda N alcista con tres puntos:
`A` = inicio (mínimo), `B` = máximo del primer impulso, `C` = mínimo del
retroceso. Las cuatro medidas (計算値):

| Objetivo | Fórmula (alcista) | Lógica |
|---|---|---|
| **N** | `N = C + (B − A)` | El segundo impulso **iguala** al primero (movimiento medido). |
| **V** | `V = B + (B − C)` | Rebote en **V**: proyecta el retroceso al alza desde B. |
| **E** | `E = B + (B − A)` | **Extensión**: suma el primer impulso completo desde B (el más ambicioso). |
| **NT** | `NT = C + (C − A)` | *"Ambos precios"*: proyecta el tramo A→C desde C (el más conservador). |

(En bajista se invierten los signos: A = máximo, B = mínimo del primer impulso,
C = máximo del rebote.)

**Ejemplo numérico (usa el mismo caso).** `A = 100`, `B = 120`, `C = 112`:
- **NT** = 112 + (112 − 100) = **124**
- **V** = 120 + (120 − 112) = **128**
- **N** = 112 + (120 − 100) = **132**
- **E** = 120 + (120 − 100) = **140**

→ Objetivos escalonados: **124 · 128 · 132 · 140**. Se usan como **niveles de
salida parcial**: primer objetivo NT (124), luego V/N, y E (140) como objetivo
máximo si la tendencia es fuerte.

**La combinación que casi nadie hace (el verdadero edge):**
- **Onda** dice *qué* (una N alcista).
- **Precio** dice *dónde* (124/128/132/140).
- **Tiempo** dice *cuándo* (¿el día candidato del kihon suchi coincide con tocar
  el objetivo N?).
- **Nube** dice *contexto* (¿el precio está sobre el Kumo = tendencia sana?).
Cuando **las cuatro** apuntan a lo mismo, tienes una confluencia real.

**Errores comunes / honestidad.** Son **objetivos probables**, no imanes
garantizados. El precio puede quedarse en NT o pasarse de E. Úsalos para
**gestionar salidas**, no como certezas.

---

# PARTE B — Otras japonesas

## 4. Heikin-Ashi suavizado (Smoothed Heikin-Ashi)

**Qué es.** Una versión "doblemente suavizada" de las velas Heikin-Ashi, que
son a su vez velas promediadas para ver la tendencia limpia.

**Heikin-Ashi normal (recordatorio de fórmulas):**
- `HA_Close = (Open + High + Low + Close) / 4`
- `HA_Open  = (HA_Open_previo + HA_Close_previo) / 2`
- `HA_High  = max(High, HA_Open, HA_Close)`
- `HA_Low   = min(Low,  HA_Open, HA_Close)`
Resultado: velas verdes seguidas sin mecha inferior = tendencia alcista fuerte;
el cambio de color avisa de posible giro.

**Suavizado:** se aplica una media (p. ej. EMA de N1) al **OHLC crudo antes** de
calcular la HA, y muchas veces otra EMA (N2) **a la salida**. Efecto: casi
elimina los cambios de color falsos → tendencia clarísima, **pero con más
retardo**.

**Para qué / cuándo.** Como **filtro de tendencia** en marcos altos o para
*trailing* de posiciones, no para el timing de entrada. Ideal combinado con un
oscilador que dé el momento fino.

**Ejemplo.** En un swing largo, con HA suavizada la vela solo cambia a rojo
cuando la tendencia realmente se agota, evitando las 4–5 sacudidas que te
sacarían con velas normales.

**Honestidad (importante).** Las velas HA **no son precios reales**: el
`HA_Close` es un promedio. **Nunca** pongas stops/objetivos usando el cuerpo HA
como si fuera el precio; úsalo solo como lectura de tendencia. Y "se ve muy
suave" es en parte ilusión: el retardo es real.

## 5. Candle-volume (velas con anchura = volumen)

**Qué es.** Velas japonesas cuyo **ancho** es proporcional al **volumen** de esa
sesión. De *Beyond Candlesticks* (Steve Nison), fusiona la idea del *Equivolume*
de Richard Arms con las velas.

**Para qué sirve.** Ver **de un vistazo** si el movimiento tiene respaldo:
- Vela **ancha** = mucho volumen = convicción.
- Vela **estrecha y alta** = poco volumen = movimiento débil/sospechoso.

**Cuándo usarla.** En rupturas: un breakout en vela **ancha** confirma; una
subida a máximos en velas **finas** avisa de falta de participación (posible
trampa). Encaja de lleno con tu escáner (volumen + estructura).

**Ejemplo.** Precio rompe resistencia. Si la vela de ruptura es **el doble de
ancha** que las anteriores → compradores de verdad. Si es fina → probable falso
rompimiento (véase 2B en el catálogo).

**Honestidad.** Es una **ayuda visual** del volumen, no un indicador con señal
propia; su valor está en combinarlo con niveles y estructura.

---

# PARTE C — Escuela rusa / soviética

## 6. Sistema Triple Pantalla (Alexander Elder)

**Qué es.** Un método de **decisión en tres filtros** (pantallas) sobre
**tres marcos temporales**, para no operar nunca contra la corriente mayor.
De *Trading for a Living* (Elder, ruso emigrado de la URSS).

**Por qué / origen.** Elder vio que la mayoría pierde por operar contra la
tendencia superior o por usar un solo indicador (los seguidores de tendencia y
los osciladores se contradicen). La solución: **usar cada tipo en su marco**.

**Cómo se hace (regla del "factor 5": cada pantalla ~5× la anterior):**
1. **Pantalla 1 — Marea (tendencia, marco alto):** un marco **superior** al que
   operas. Herramienta **seguidora de tendencia** (Elder usa la pendiente del
   **MACD-Histograma semanal** o una EMA de 13). **Define la única dirección
   permitida.** Marea arriba → **solo** buscas compras.
2. **Pantalla 2 — Ola (marco de trabajo):** un **oscilador** (Force Index,
   Estocástico, Elder-Ray, Williams %R) para localizar el **retroceso contra la
   marea**. Marea arriba + oscilador **sobrevendido** → oportunidad de compra.
3. **Pantalla 3 — Rizo (entrada, marco bajo):** técnica de **ruptura/entrada
   con stop**. En compras: **buy-stop** por encima del máximo de la barra
   anterior (entras cuando el precio reanuda), stop bajo el mínimo reciente.

**Cuándo usarla.** Es un **marco de operativa completo**, no un indicador
suelto. Para swing y position trading funciona muy bien.

**Ejemplo.** Semanal (marea) alcista. En el diario (ola), el Force Index cae a
territorio negativo (retroceso). Colocas un **buy-stop** 1 tick sobre el máximo
de ayer (rizo). Si el precio reanuda al alza, entras; si no, no se ejecuta y no
arriesgas nada. *"Cuando la tendencia semanal sube y la diaria baja, es una
oportunidad de compra."*

**Honestidad.** No es magia: su fuerza es la **disciplina multi-marco** que
evita el error nº1 del retail (pelearse con la tendencia mayor).

## 7. SafeZone stop (Elder)

**Qué es.** Un stop **adaptativo por volatilidad direccional**: se coloca justo
**fuera del ruido normal** del mercado, no a un % fijo.

**Cómo se calcula (para una posición larga):**
1. Mira las barras donde `Low_hoy < Low_ayer` (penetraciones a la baja = ruido
   bajista). La penetración = `Low_ayer − Low_hoy`.
2. Promedia esas penetraciones sobre un lookback (p. ej. 10–20 barras) →
   **ruido bajista medio**.
3. `SafeZone = Low_hoy − (coeficiente × ruido bajista medio)`, con
   **coeficiente ≈ 2–3**.
En cortos, la lógica es simétrica con las penetraciones al alza.

**Para qué / cuándo.** Para no ser barrido por sacudidas aleatorias pero salir
si hay reversión **real**. Se sube (en largos) conforme avanza el precio, nunca
se baja (trailing).

**Ejemplo.** Ruido bajista medio de 10 barras = **0,40 $**. Coeficiente 2,5.
Mínimo de hoy = 118,00. → `SafeZone = 118,00 − (2,5 × 0,40) = 117,00`. Pones el
stop en 117, fuera del vaivén típico de 0,40.

**Honestidad.** Con coeficiente alto das mucho margen (pérdidas mayores si
falla); con bajo, te barre el ruido. Hay que calibrarlo por activo.

## 8. Análisis de clúster / footprint (escuela rusa de order-flow)

**Qué es.** Gráfico donde **cada vela se desglosa por niveles de precio**
(clústeres) mostrando el **volumen negociado en cada precio**, separado en
**compras (al ask)** y **ventas (al bid)**. La comunidad rusa (ecosistema
**ATAS**) desarrolló y divulgó este análisis (объём/дельта/кластер) años antes
que el retail occidental.

**Conceptos clave:**
- **Delta** = volumen comprador − vendedor en la barra. Delta **positivo** =
  agresión compradora (levantan la oferta); negativo = agresión vendedora.
- **Delta acumulado (CVD):** suma corrida. Si **el precio sube pero el CVD
  baja** → divergencia = movimiento sin respaldo (posible agotamiento).
- **POC de la vela:** el precio con más volumen dentro de la barra.
- **Imbalance:** en un nivel, si el volumen de un lado supera al del lado
  contrario en diagonal por un ratio (p. ej. **≥300%**) → agresión fuerte.
  Varios **imbalances apilados** marcan un nivel institucional.
- **Absorción:** llega **mucho volumen** a un nivel y el precio **no avanza** →
  alguien grande absorbe con órdenes pasivas; suele preceder giro.

**Para qué / cuándo.** Para **intradía y scalping**: confirmar rupturas
(¿hay delta e imbalances a favor?), detectar trampas (ruptura con delta en
contra = falsa) y pillar agotamientos por divergencia de CVD.

**Ejemplo.** El precio hace un nuevo máximo, pero el **CVD hace máximo más
bajo** y aparece **absorción** (barra de gran volumen que no avanza) en la
resistencia → señal de que los compradores se agotan: posible reversión.

**Honestidad + requisito.** Necesita **datos de tick con bid/ask** (order flow),
que **no** salen del OHLCV diario (🔧). Es potentísimo intradía pero inútil sin
ese dato; y en mercados descentralizados (forex spot) el volumen es parcial.

## 9. Trading por niveles + estadística (metodología Gerchik)

**Qué es.** Una **metodología de operativa** (más que un indicador) centrada en
**niveles horizontales "duros"** y en una **disciplina estadística** férrea.
De Alexander Gerchik, trader profesional de parqué.

**Ideas clave:**
- **Niveles fuertes vs débiles:** un nivel vale por **cómo el precio lo tocó y
  reaccionó**. Toque **preciso** y rechazo **vertical** = nivel fuerte; toques
  "sucios" y lentos = débil. El **nivel espejo** (soporte que pasa a
  resistencia) es de los más fiables.
- **Densidad (плотность):** una orden límite grande que **defiende** un nivel;
  su **retirada** avisa de que el nivel cederá.
- **Estadística personal:** llevar diario y operar **solo setups con esperanza
  matemática positiva demostrada**; controlar *profit factor*, % de aciertos,
  R:R y riesgo fijo por operación. Lema: *"tu trabajo no es predecir, es seguir
  reglas con estadística positiva"*.

**Para qué / cuándo.** Operativa intradía/short-swing disciplinada; encaja con
tu marca de **honestidad y gestión de riesgo**.

**Ejemplo.** Nivel espejo en 250. El precio se acerca **rápido y limpio**,
hay **densidad** (orden límite grande) defendiéndolo; entras en el rechazo con
stop ajustado y R:R ≥ 2. Solo lo tomas porque tu diario dice que ese setup tiene
esperanza positiva en 100 operaciones anteriores.

**Honestidad.** No hay "indicador Gerchik" mágico: el valor es el **proceso**
(niveles bien filtrados + estadística + psicología). Es de lo más sano que salió
de la escuela rusa, precisamente porque **no** promete predicción.

---

## Cómo llevarlo a la web (propuesta de contenido)
Cada bloque de arriba = una **lección** con: teoría breve, animación/figura, y
—donde aplique— una **herramienta viva** sobre tu OHLCV:
- **Ichimoku objetivos N/V/E/NT**: calculadora que, dados A/B/C (o auto-detectados
  por tus swings), dibuja los 4 objetivos. 🔨 *(construible ya)*
- **Kihon suchi**: contador de barras desde el último swing que resalta 9/17/26. 🔨
- **Heikin-Ashi suavizado / candle-volume**: modos de vela en el gráfico. 🔨
- **Triple Pantalla / SafeZone**: plantilla multi-marco + stop calculado. 🔨
- **Clúster/footprint y Gerchik**: lecciones + (footprint requiere order-flow 🔧).

*Fuentes: Hosoda (Ichimoku Kinko Hyo, 1969); S. Nison (Beyond Candlesticks);
A. Elder (Trading for a Living); comunidad ATAS (cluster analysis); A. Gerchik.*
