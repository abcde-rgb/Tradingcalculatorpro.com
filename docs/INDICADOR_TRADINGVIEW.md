# Indicador de TradingView — TCP Structure Scanner

**Código:** [`tradingview/tcp_structure_scanner.pine`](../tradingview/tcp_structure_scanner.pine)
(Pine Script **v6**, la versión vigente del lenguaje de TradingView)
**Equivalente en la web:** el escáner de estructura de `/education`
(`backend/price_action.py` + `/api/education/structure-scan/{symbol}`)
**Verificación:** [`backend/tests/test_pine_parity_unit.py`](../backend/tests/test_pine_parity_unit.py)
(52 comprobaciones) · [`scripts/verificar-pine.py`](../scripts/verificar-pine.py) ·
[`scripts/gen-pine-twin.py`](../scripts/gen-pine-twin.py)
**Manual del escáner (qué detecta y qué no):** [`ESCANER_ESTRUCTURA.md`](./ESCANER_ESTRUCTURA.md)

---

## 1. Qué es

El escáner de estructura de TradingCalculator.Pro, portado a Pine Script v6 para
que corra **dentro de TradingView**, sobre cualquier activo y temporalidad que
TradingView sirva, sin pasar por nuestro backend ni por el proveedor de datos.

No es una reinterpretación ni una versión "inspirada en". Es el **mismo
algoritmo**: los mismos pivotes, la misma agrupación de niveles, los mismos
umbrales de confirmación y los mismos códigos de evidencia. Que sea el mismo no
es una promesa: está comprobado ejecutando las dos implementaciones sobre las
mismas velas y exigiendo que coincidan cifra a cifra (§6).

Lo que dibuja:

| Bloque | Qué es | Cómo se ve |
|---|---|---|
| Swings | Pivotes fractales etiquetados **HH / HL / LH / LL** | Etiquetas pequeñas sobre y bajo cada pivote |
| Tendencia | Leída de las dos últimas etiquetas (alta y baja) | Fila del panel |
| BOS / CHoCH | Ruptura a favor / primera ruptura en contra, **numeradas** al repetirse sobre el mismo nivel | Línea del swing al cierre que lo rompe + etiqueta |
| Soportes y resistencias | Agrupación de swings, con **zona**, distancia en % y en ATR, y evidencia | Línea + banda + etiqueta `precio 3T · 72/100 ★⇄◎` |
| Confluencia | Niveles que **también** existen en el escalón superior | Distintivo `◎` en la etiqueta del nivel |
| Fair Value Gaps | Desequilibrios de 3 velas, separando el **hueco de sesión** | Cajas de color |
| Breakouts / fakeouts | Ruptura confirmada de un nivel vs. barrido de liquidez | Triángulos (desactivados por defecto) |
| **Patrones de vela** | Los 30 canónicos, con su tasa, su rango y en qué se fija cada uno | Etiqueta con el nombre; `◆` si cae sobre un nivel confirmado |
| **Tendencia superior** | La misma lectura HH/HL/LH/LL en el escalón de arriba | Fila del panel |
| **Sesión** | Asia / Londres / Nueva York, con su solape | Fila del panel + sombreado opcional |
| **PDH/PDL · PWH/PWL** | Máximo y mínimo del día y la semana anteriores | Líneas discontinuas etiquetadas |
| **Invalidación de estructura** | Hasta dónde vale cada BOS/CHoCH, y si ya dejó de valer | Filas del panel |
| **Rechazos y rupturas de zona** | Cada visita a una banda y cómo acabó | ▲▼ rechazo · ⇧⇩ ruptura, donde ocurrió |
| **Presión de la zona en curso** | La evidencia de la vela que se está formando dentro de una banda | Dos filas del panel |
| Contexto | Recorrido a cada lado y posición dentro del rango | Panel |

Lo que **no** es: no es una señal de compra o venta, no calcula probabilidad de
éxito y no mira fundamentales ni noticias.

**Qué está portado y qué es añadido.** Los siete primeros bloques salen de
`price_action.py` y los patrones de `candle_patterns.py`: portados y verificados
cifra a cifra (§6). Los tres últimos —tendencia superior, sesión y niveles de
calendario— son **añadidos**: el backend recibe velas y ya, no sabe de sesiones
ni de calendario. No tocan un solo número de la lectura portada; se dibujan al
lado. El cruce patrón ↔ nivel (`◆`) también es añadido: en la web los dos
escáneres son endpoints separados y nadie los junta.

---

## 2. Instalarlo

1. Abre TradingView → **Pine Editor** (abajo del gráfico).
2. **Open → New indicator**, borra la plantilla.
3. Pega el contenido de `tradingview/tcp_structure_scanner.pine`.
4. **Save** (pide un nombre) → **Add to chart**.

Es un indicador `overlay`: se dibuja sobre las velas, no en un panel aparte.

> El fichero es **autocontenido**: no importa librerías, no llama a ninguna API
> y no manda datos a ningún sitio. Se puede leer entero antes de pegarlo, que es
> lo que habría que hacer con cualquier indicador de internet.

---

## 3. Cómo funciona (y por qué así)

El escaneo completo corre **una sola vez, sobre la última vela**, sobre la
ventana de `Velas a escanear`. Es una **foto** del gráfico —exactamente lo que
hace el panel de la web cuando pulsas escanear—, no un indicador que va pintando
historia vela a vela.

Consecuencia práctica: los niveles no "repintan" hacia atrás, pero **se
recalculan enteros con cada vela nueva**. Un nivel puede aparecer o desaparecer
al cerrar una vela porque la lectura entera se rehace, igual que en el backend.

La ventana se mantiene de forma incremental (una vela nueva se empuja, la que
está en curso se reescribe), así que el coste por tick es mínimo y no hace falta
tocar `max_bars_back`.

### Presupuesto de cálculo

Con los valores por defecto (500 velas, 30 niveles analizados) son unas 70 000
iteraciones, **una vez**. El control llega a 20 000 velas y hay un interruptor
**«Usar TODAS las velas del gráfico»**, pero el tope real no lo pone el control:
lo pone el **límite de tiempo de ejecución de Pine**.

Las dos pasadas caras son los **patrones** (O(velas)) y las **rupturas**
(O(niveles × velas)). Si TradingView aborta el script por tiempo:

1. Apaga *Marcar patrones de vela* y *Marcar breakouts / fakeouts*. Sus recuentos
   pasan a `—` (**no calculado**, que no es lo mismo que 0) y el resto sigue.
   Medido sobre el gemelo Python: apagar las dos quita entre el **64 %** (2 000
   velas) y el **73 %** (500 velas) del trabajo.
2. Si aún así, baja el número de velas.

El panel dice **siempre** cuántas velas se escanearon de verdad, así que nunca
tienes que suponerlo.

---

## 4. Los controles

| Grupo | Control | Por defecto | Qué hace |
|---|---|---|---|
| 1 Escaneo | Usar TODAS las velas del gráfico | no | Sin tope; el límite lo pone Pine, no el control (§3) |
| | Velas a escanear | 500 | La ventana sobre la que se calcula todo. Hasta 20 000 |
| | Fuerza del fractal | 2 | Velas a cada lado de un pivote. **En 5m y 15m usa 3**, como la web: con 2, el ruido genera pivotes que no lo son |
| | Tolerancia | Automática | Medio ATR en % del precio, acotado a [0,15 %, 2,5 %] |
| | Toques mínimos | 2 | Un nivel de un solo toque es el swing que lo creó, no un nivel |
| 2 Superior | Confluencia | activada | Marca los niveles que el escalón superior también tiene |
| | Temporalidad superior | Auto | 5m/15m→1h · 30m/1h→4h · 4h→1D · 1D→1W · 1W→1M · 1M→(nada) |
| 3 Niveles | Cuántos dibujar | 8 | Los más cercanos al precio |
| | Dibujar la zona | sí | Un nivel es una banda, no una línea |
| | Sólo confirmados | no | Filtra por `visitas ≥ 2 y puntuación ≥ 55` |
| 4 Estructura | Etiquetar swings · Marcar BOS/CHoCH | sí | Los swings van **topados** (30): Pine descarta los dibujos que pasan de 500 sin avisar |
| | Modo tiempo real honesto | no | Retardo de confirmación en las rupturas (§7) |
| 5 Patrones | Marcar patrones · cuántos · tasa mínima | sí · 10 · 0 % | |
| | Tamaño de la etiqueta | Normal | Pequeño / Normal / Grande / Enorme |
| | Separación de la vela (ATR) | 1,2 | La etiqueta se aparta del máximo o del mínimo, con un hilo fino que la ata a su vela |
| | Sólo sobre nivel confirmado | no | El cruce `◆` |
| | Incluir neutros (doji, peonza, onda alta) | no | Son los más frecuentes y los que menos dicen |
| 6 FVG | Abiertos · rellenados · huecos de sesión | sí · no · no | |
| 7 Rupturas | **Rechazos y rupturas de zona** | sí | ▲▼ rechazo · ⇧⇩ ruptura, en la vela donde ocurrió |
| | Sólo en niveles confirmados | sí | |
| | **Presión de la zona en curso** | sí | La evidencia de la vela que se está formando (§5b) |
| | Breakouts · fakeouts | no · no | Ruidosos en intradía; se activan a mano |
| 8 Sesión y referencia | Zona horaria y las tres sesiones | GMT · 00-09 / 08-17 / 13-22 | Ajusta los horarios a tu mercado |
| | Sombrear la sesión · rango de la anterior | no · Ninguna | |
| | PDH/PDL · PWH/PWL | sí · no | Se ocultan solos donde no aportan (PDH en diario es la vela de al lado) |
| 9 Panel | Posición, tamaño, compacto | Arriba dcha., pequeño, no | Compacto = las 15 filas de cabecera, presión y estructura incluidas |
| 10 Avisos | BOS · CHoCH · zona | sí · sí · no | Sólo al **cerrar** la vela |
| | **Invalidación de la estructura** | sí | La que más falta hace: tu idea dejó de estar vigente |
| | Ruptura · barrido · patrón · proximidad | no | La proximidad se mide en **ATR**, no en % |
| | Rechazo/ruptura de zona · veredicto de presión | no | Los dos, **al cerrar** la vela |

### Los distintivos de la etiqueta de un nivel

`182.40  3T · 72/100 ★ ⇄ ◎ ●`

- **3T** — toques que formaron el nivel.
- **72/100** — puntuación de confirmación: visitas, cuántas aguantaron, cuándo
  fue la última. Mide **sólo las velas escaneadas**.
- **★** — confirmado (≥ 2 visitas y ≥ 55 puntos).
- **⇄** — polaridad invertida: se formó como techo y ahora es suelo, o al revés.
- **◎** — confluencia con la temporalidad superior. **No suma a la puntuación**,
  a propósito: esa mide otra cosa.
- **●** — el precio está dentro de la zona ahora mismo.

---

## 5. Las reglas de honestidad, también aquí

Las tres reglas de `CLAUDE.md` no se quedan en el backend:

1. **El papel lo decide dónde está el precio AHORA**, no cómo se formó el nivel.
   Un techo ya perforado sobre el que el precio se apoya es **soporte**, y se
   marca `⇄`. Lo contrario —seguir llamándolo resistencia— invierte la operación.
2. **Lo que no se puede calcular sale «—», nunca 0.** Sin nivel arriba, el
   recorrido hacia arriba es indefinido; un 0 % se leería como "resistencia justo
   aquí", que es lo contrario de la verdad.
3. **Sin comprobar ≠ comprobado sin coincidencias.** En un gráfico mensual no hay
   escalón superior: la fila de confluencia dice *sin comprobar*, y
   `counts.confluent` se queda en `na`. Nunca 0.

Y dos avisos que el panel da sin que se los pidan:

- **Vela en curso**: cuando la última vela no ha cerrado, lo que salga de ella
  puede des-ocurrir. El panel lo dice con todas las letras.
- **Niveles en disputa**: los niveles que quedan entre el precio en vivo y el
  último cierre son **soporte con una referencia y resistencia con la otra**.
  Mientras haya alguno, el reparto de la escalera es una elección, no un hecho.

---

## 6. Cómo se comprueba que funciona, sin TradingView

Pine sólo se ejecuta dentro de TradingView, así que "lo he repasado y coincide"
no vale como comprobación. Hay tres capas, todas ejecutables aquí:

### a) Gramática — el fichero es Pine de verdad

`scripts/gen-pine-twin.py` parsea el `.pine` con una gramática de Pine
(`pynescript`). Un error de sintaxis no llega ni a generar nada.

### b) Números — el indicador dice lo mismo que el backend

El mismo script **traduce** el bloque puro del indicador (§0–§10b: toda la
aritmética, sin una línea de dibujo) a Python ejecutable, a partir del árbol
sintáctico — no a mano. `backend/tests/test_pine_parity_unit.py` corre esa
traducción y `price_action.py` sobre las mismas velas y compara:

| Se compara | Con qué detalle |
|---|---|
| Tendencia, tolerancia, ATR, precio de referencia | exacto |
| Swings | índice, precio y etiqueta HH/HL/LH/LL, uno a uno |
| BOS / CHoCH | índice, nivel, tipo, dirección, repetición, puntuación, confirmado y **los códigos de evidencia** |
| Niveles | precio, papel, origen, polaridad, distancia en % y ATR, toques, zona, visitas, aguantes, roturas, tasa, antigüedad, puntuación y códigos |
| FVG | índice, techo, suelo, dirección, relleno y hueco de sesión |
| Breakouts / fakeouts | índice, nivel, dirección, tipo, confirmado y puntuación |
| **Patrones de vela** | identificador, vela que confirma, vela donde empieza, tipo, comportamiento, tasa, rango, nº de velas, en qué se fija y las tres medidas (cuerpo y mechas) |
| **El catálogo de los 30** | tabla escrita dos veces (un `switch` en Pine, un dict en Python) y comparada entrada a entrada |
| Contexto y los 18 recuentos | exacto |

Seis series sintéticas y deterministas: diaria tendencial, diaria volátil, sin
volumen (forex/índices), intradía con cortes de sesión, cripto de precio alto y
una serie muy corta. Más una **escrita a mano** para el único caso en el que el
retardo de confirmación cambia algo (§7) — ese no sale en un paseo aleatorio.

Y una guarda contra el test vacío: `test_los_fixtures_disparan_patrones_de_verdad`
exige más de 200 detecciones en total y que haya patrones de una, dos **y** tres
velas. Sin ella, comparar dos listas vacías pasaría por verificación.

```bash
python scripts/gen-pine-twin.py            # regenera el gemelo desde el .pine
python scripts/gen-pine-twin.py --check    # falla si el gemelo está desfasado
python -m pytest backend/tests/test_pine_parity_unit.py -q
```

`tradingview/pine_twin_generated.py` es **código generado**: no se edita a mano,
igual que `instrumentSpecs.generated.js` o `docs/MAPA.md`.

### c) Lo específico de la plataforma

`scripts/verificar-pine.py` (sin dependencias, menos de un segundo) comprueba lo
que la gramática no ve y los números tampoco: cabecera `//@version=6`, llamadas a
integrados que no existen, aridad de los constructores de tipos, funciones o
`plot()` declarados dentro de un bloque, y que `indicator()` declare el
presupuesto de dibujos (sin `max_labels_count`, TradingView limita a 50 y el
usuario ve el análisis a medias sin que nada avise).

Los cuatro controles están saboteados en `scripts/probar-verificadores.sh`, y la
paridad numérica también con `PINE_LENTO=1`.

> Y sirvió a la primera: el control del presupuesto de dibujos era
> `"max_labels_count" not in codigo`, y el sabotaje escribe `max_labels_countX`,
> donde el nombre bueno **sigue estando como prefijo**. Pasaba con un parámetro
> que TradingView habría rechazado. Ahora busca el nombre completo seguido de `=`
> y sólo dentro de la llamada a `indicator(...)`. Un control que no puede fallar
> no es un control.

### Lo que estas tres capas NO cubren

Que TradingView **compile** el fichero. La gramática de `pynescript` es de Pine,
pero no es el compilador de TradingView: podría aceptar algo que el compilador
rechace por reglas de tipos o de cualificadores (`const` / `simple` / `series`).
La prueba final es pegarlo en el Pine Editor. Lo que sí está descartado es que
el algoritmo diga algo distinto de lo que dice la web.

---

## 5a. ¿Dónde está el nivel EXACTAMENTE? (y por qué la banda era relleno)

Pregunta directa: *¿deberían ser más estrechas las zonas?* La respuesta, medida
sobre las seis series de prueba, tiene tres partes.

### Lo que se midió

**1. La banda dibujada era 2,5 veces más ancha que los datos.** La zona era
`precio ± tolerancia`, un relleno fijo. La **extensión real de los pivotes** que
forman cada nivel resultó ser el **39 % de esa banda** (mediana; p90 = 71 %).

| Serie | Banda ±tol | Extensión real | Reducción |
|---|---:|---:|---:|
| diario tendencial | 0,959 % | 0,412 % | 57 % |
| diario volátil | 2,625 % | 1,046 % | 60 % |
| intradía con huecos | 0,881 % | 0,387 % | 56 % |
| cripto caro | 1,303 % | 0,494 % | 62 % |
| sin volumen | 1,273 % | 0,384 % | 70 % |

**2. Un solo número hacía cinco trabajos.** La misma tolerancia decidía: si dos
pivotes son el mismo nivel, el ancho de la zona dibujada, si el precio está
tocando el nivel, si dos temporalidades coinciden y si dos rupturas son la misma.
Son cinco preguntas distintas y no hay razón para que se midan igual.

**3. Y la banda no siempre contiene sus propios toques.** Parece imposible y no
lo es: el agrupador compara cada pivote contra la media **corriente** del grupo,
y esa media se mueve según entran más. Un pivote que entró cuando la media estaba
en otro sitio puede acabar **fuera** de la banda final. Le pasa al **4 %** de los
niveles (2 de 56), con una fuga máxima de 1,29 × la tolerancia. El núcleo, por
construcción, sí los contiene siempre.

**4. La mitad de los niveles se apoya en sólo DOS pivotes.** De 56 clusters: 28
con 2 toques, 9 con 3, 7 con 4, 5 con 5 y 7 con 6 o más. Donde hay dos, «el
nivel» es la media de dos números, y la precisión que se puede afirmar es la que
den esos dos.

### Lo que se cambió

Se dibujan **dos cajas** en vez de una, porque son dos cosas distintas:

- **El núcleo** (marcado): del pivote más bajo al más alto que formaron el nivel.
  Es el **dato**: aquí es donde el precio imprimió de verdad. Cuando los pivotes
  cayeron todos al mismo precio, el núcleo tiene ancho cero y **no se dibuja
  caja** — la línea ya es la respuesta, y una caja de ancho inventado sería
  fingir una imprecisión que no existe.
- **El área de reacción** (tenue, punteada): la banda ±tolerancia con la que se
  cuentan visitas, rechazos y rupturas. Se sigue viendo a propósito: si se
  ocultara, un «3 toques» sobre una caja estrecha que el precio nunca pisó sería
  una contradicción.

Y la etiqueta del nivel dice ahora su precisión: `129.166 ±0,25 % 4T · 94/100`,
o `exacto` cuando todos los pivotes cayeron en el mismo precio.

**En pantalla**: la franja que dice *dónde está el nivel* es **2,6 veces más
estrecha** que la caja de antes (mediana; p25 = 21 %, p75 = 53 % de la banda). Un
ejemplo real de las series de prueba — nivel en 117,867 formado por dos pivotes
en 117,826 y 117,908: la caja anterior iba de 117,30 a 118,43 (1,13 de ancho) y
los toques ocupan 0,08. **Catorce veces más estrecho.**

### Lo que NO se cambió, y por qué

**La tolerancia de agrupación sigue en su valor por defecto.** Estrecharla mejora
la pureza de los niveles, pero no es gratis:

| Agrupación | Niveles | Toques/nivel | Confirmados | Tasa de aguante |
|---|---:|---:|---:|---:|
| ×0,25 | 44 | 2,30 | 43 | **63,4 %** |
| ×0,50 | 53 | 2,75 | 50 | 58,2 % |
| **×1,00 (web)** | 56 | 3,38 | 51 | 55,8 % |
| ×2,00 | 52 | 4,25 | 45 | 56,0 % |

*(banda de visitas fija, para aislar el efecto del agrupador)*

Estrechando a ×0,25 la tasa de aguante sube 7,6 puntos… pero los niveles bajan a
**2,30 toques de media**, que es el mínimo: casi todos pasan a estar sostenidos
por dos pivotes y nada más. **Eso es un canje, no una mejora**, y la decisión es
de quien opera. Por eso hay dos controles —*Ajuste de la agrupación* y *Ajuste de
la banda de visitas*— con las cifras en su tooltip, **ambos a 1,00 por defecto**,
que es exactamente lo que dice la web. Cuando los mueves, el panel marca la fila
de la tolerancia en rojo con el factor aplicado: nunca estás fuera de paridad sin
saberlo.

> **Sobre estas cifras.** Salen de seis series sintéticas deterministas, no de
> mercado real (aquí no hay red). Lo que miden es la **coherencia interna del
> algoritmo** —cuánta de la banda es relleno, qué hace cada tolerancia— y eso no
> depende de que las velas sean reales. Lo que sí dependería es afirmar que un
> ajuste «funciona mejor operando»: eso no se afirma en ninguna parte.

---

## 5b. Las tres capas que contestan «¿y ahora qué?»

### Invalidación: hasta dónde vale una ruptura

Un BOS no vale para siempre. Cuando el precio rompe al alza el último máximo,
deja por detrás **el mínimo que lanzó esa pierna**: mientras aguante, la
estructura sigue viva; en cuanto un **cierre** lo pierde, deja de estarlo. El
panel lo dice en dos filas: *Última estructura* (✓ vigente / ✗ invalidada) y
*…se invalida en* (el precio exacto).

Se usa el **cierre**, no la mecha, por lo mismo que en el resto del módulo: una
mecha que perfora y vuelve es un barrido, no una invalidación. Y el nivel
protegido se busca entre los pivotes **anteriores** a la ruptura — usar uno
posterior daría una invalidación que aquel día nadie podía ver.

### Rechazos y rupturas, uno a uno

`annotateLevels` ya contaba cuántas visitas aguantaron y cuántas rompieron, pero
se quedaba con el número. Ahora sale la **lista**: cada visita a la banda, con
cuándo entró, cuándo salió, por qué lado llegó, por cuál se fue y **cuánto se
metió** en la zona. Se pinta donde ocurrió (▲▼ rechazo, ⇧⇩ ruptura) y el tooltip
trae los detalles.

Sale de la **misma pasada** que puntúa el nivel, así que los recuentos cuadran
por construcción — y hay un test que lo exige, porque «por construcción» es una
afirmación y aquí las afirmaciones se comprueban.

### Presión de la zona: qué está pasando AHORA

> **Esto no predice, y no puede.** No es una probabilidad, no está calibrada
> contra nada y no dice qué va a pasar. Dice **qué está pasando, medido**, con
> todos los ingredientes a la vista para que puedas contrastarlo con el gráfico
> en lugar de creértelo.

Cuando el precio está metido en la banda de un nivel, el panel publica:

| Ingrediente | Qué mide |
|---|---|
| Cierre al X % de la banda | 0 % = pegado al borde por el que entró · 100 % = al opuesto |
| Mecha **en contra** | La sombra que va contra el ataque, en % del rango de la vela |
| × ATR | Si la vela es de expansión o de las de andar por casa |
| Volumen | Frente a la media de 20 (`—` si el activo no trae volumen) |
| Velas dentro | Muchas no es fuerza: es picoteo, y el nivel se está comiendo |
| Historial del nivel | Uno que aguanta siempre pesa distinto que uno que no aguanta nunca |

Y los resume en una puntuación acotada de **empuje** (0-100) con su veredicto:
`EMPUJE` (≥ 60), `RECHAZO` (≤ 35) o `sin definir`. Cada ingrediente que suma o
resta deja su código en el tooltip.

**La vela en curso se mueve**, así que el veredicto puede darse la vuelta con el
siguiente tick — y el panel lo dice con esas letras (`⚠ vela en curso`). Por eso
la **alerta** de presión se dispara sólo **al cerrar** la vela: avisar de algo
que puede des-ocurrir en el siguiente tick es avisar de nada.

---

## 6b. Lo que el indicador tiene y la web no

Tres cosas, todas por el mismo motivo: existen dentro de TradingView y el backend
no las puede ver.

- **Sesión.** El manual del escáner dice literalmente que *«no sabe en qué sesión
  está el mercado»*. Aquí sí: Asia / Londres / Nueva York, con el **solape**
  Londres-NY nombrado en vez de escondido detrás de una de las dos, y el rango de
  la sesión anterior de la que elijas.
- **PDH/PDL y PWH/PWL.** Bordes de calendario, no pivotes: la agrupación de
  swings no los produce nunca y todo el mundo los mira.
- **Patrón sobre nivel (`◆`).** En la web `structure-scan` y `pattern-scan` son
  endpoints separados y nadie los cruza. Aquí los niveles y las velas están en la
  misma pasada, así que el cruce sale gratis — y sólo contra niveles
  **confirmados**, porque cruzar un patrón con una línea que nadie ha vuelto a
  visitar es fabricar una coincidencia.

Y una cuarta, propia del medio: **las alertas**. TradingView te avisa en el móvil
sin que tu backend haga nada — BOS, CHoCH, entrada en zona, ruptura confirmada,
barrido, patrón y proximidad a un nivel (medida en ATR, que significa lo mismo en
el yen y en el bitcoin; un 0,5 % no).

---

## 6c. El panel se lee en fondo claro y en fondo oscuro

Iba en negro semitransparente con letra blanca. Sobre un gráfico de fondo claro
eso es gris pálido con texto blanco encima: ilegible. Ahora los colores salen del
**propio tema del gráfico** (`chart.bg_color` / `chart.fg_color`), así que se lee
en los dos sin tocar nada. Los colores con significado —rojo resistencia, verde
soporte— siguen siendo tuyos y se configuran en el grupo 3.

---

## 7. Límites conocidos (heredados del backend, a propósito)

- **El sesgo de anticipación de las rupturas es mucho menor de lo que decía este
  documento.** `detectEvents` consume un swing en cuanto queda por detrás de la
  vela mirada, no cuando el fractal quedó confirmado. Suena a mirar el futuro.
  Al medirlo resulta que casi no lo es, y se puede demostrar: un swing alto en
  `k` es *por definición* el máximo de `[k-s, k+s]`, así que ninguna vela de
  `(k, k+s]` puede **cerrar** por encima de él —su propio máximo ya está acotado
  por el del pivote— y ese nivel no se puede romper antes de `k+s+1`, que es
  cuando el pivote ya era observable. En las seis series de prueba los dos modos
  dan **exactamente** las mismas rupturas.
  Queda un caso, y sólo uno: cuando un pivote nuevo —una vela de mecha enorme y
  cierre bajo— **tapa** a otro anterior más bajo dentro de esas `strength` velas.
  Está reproducido en `test_pero_el_interruptor_no_es_un_adorno`. Para eso está
  el interruptor «modo tiempo real honesto»; por defecto manda la paridad con la
  web.
- **Los últimos `strength` velas no tienen pivotes**, por definición del fractal.
- **Con menos de `2 × strength + 1` velas no hay lectura**: referencia, tolerancia
  y ATR salen vacíos, igual que el `_empty_read` del backend. Una tolerancia
  derivada del ATR de tres barras sería una precisión inventada. Sólo pasa en un
  activo recién listado, que es justo donde nadie lo comprobaría.
- **La confluencia depende del histórico del gráfico.** Los niveles del escalón
  superior se acumulan a medida que se cierran sus velas; en un gráfico recién
  abierto con poco histórico habrá menos que en la web, que pide su propia serie.
- **Sin volumen** (forex, muchos índices) la expansión de volumen no penaliza:
  suma 8 puntos fijos en vez de 0 o 15, igual que en el backend.
- **La tolerancia manual es un porcentaje fijo** y sólo tiene sentido si sabes
  por qué la cambias. La automática se adapta a la volatilidad de la serie.

---

## 8. Si tocas el escáner del backend

`backend/price_action.py` y `backend/candle_patterns.py` son **la referencia**.
Si cambias un umbral, una puntuación, una tasa del catálogo o una regla ahí:

1. Haz el mismo cambio en `tradingview/tcp_structure_scanner.pine`.
2. `python scripts/gen-pine-twin.py`
3. `python -m pytest backend/tests/test_pine_parity_unit.py -q`
4. `python scripts/verificar-pine.py`

Si te lo saltas, el test de paridad falla y dice exactamente qué cifra se
separó. Ese es su trabajo.
