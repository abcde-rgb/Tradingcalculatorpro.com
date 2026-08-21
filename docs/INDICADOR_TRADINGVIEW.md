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
| Contexto | Recorrido a cada lado y posición dentro del rango | Panel |

Lo que **no** es: no es una señal de compra o venta, no calcula probabilidad de
éxito, no mira fundamentales ni noticias y no sabe en qué sesión está el mercado.
Igual que la web.

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

Con los valores por defecto (300 velas, 30 niveles analizados) el escaneo son
unas 40 000 iteraciones, una vez. Subir `Velas a escanear` a 1 500 lo multiplica
por cinco y acerca el límite de tiempo de ejecución de Pine; por eso 1 500 es el
tope del control.

---

## 4. Los controles

| Grupo | Control | Por defecto | Qué hace |
|---|---|---|---|
| 1 Escaneo | Velas a escanear | 300 | La ventana sobre la que se calcula todo |
| | Fuerza del fractal | 2 | Velas a cada lado de un pivote. **En 5m y 15m usa 3**, como la web: con 2, el ruido genera pivotes que no lo son |
| | Tolerancia | Automática | Medio ATR en % del precio, acotado a [0,15 %, 2,5 %] |
| | Toques mínimos | 2 | Un nivel de un solo toque es el swing que lo creó, no un nivel |
| 2 Superior | Confluencia | activada | Marca los niveles que el escalón superior también tiene |
| | Temporalidad superior | Auto | 5m/15m→1h · 30m/1h→4h · 4h→1D · 1D→1W · 1W→1M · 1M→(nada) |
| 3 Niveles | Cuántos dibujar | 8 | Los más cercanos al precio |
| | Dibujar la zona | sí | Un nivel es una banda, no una línea |
| | Sólo confirmados | no | Filtra por `visitas ≥ 2 y puntuación ≥ 55` |
| 4 Estructura | Etiquetar swings · Marcar BOS/CHoCH | sí | |
| 5 FVG | Abiertos · rellenados · huecos de sesión | sí · no · no | |
| 6 Rupturas | Breakouts · fakeouts | no · no | Ruidosos en intradía; se activan a mano |
| 7 Panel | Posición y tamaño | Arriba dcha., pequeño | |
| 8 Avisos | BOS · CHoCH · zona | sí · sí · no | Sólo al **cerrar** la vela |

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
| Contexto y los 14 recuentos | exacto |

Seis series sintéticas y deterministas: diaria tendencial, diaria volátil, sin
volumen (forex/índices), intradía con cortes de sesión, cripto de precio alto y
una serie muy corta.

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

### Lo que estas tres capas NO cubren

Que TradingView **compile** el fichero. La gramática de `pynescript` es de Pine,
pero no es el compilador de TradingView: podría aceptar algo que el compilador
rechace por reglas de tipos o de cualificadores (`const` / `simple` / `series`).
La prueba final es pegarlo en el Pine Editor. Lo que sí está descartado es que
el algoritmo diga algo distinto de lo que dice la web.

---

## 7. Límites conocidos (heredados del backend, a propósito)

- **Las rupturas usan un swing antes de que fuera confirmable.** `detectEvents`
  consume un swing en cuanto su índice es menor que la vela mirada, no cuando el
  fractal quedó confirmado (`strength` velas después). Es un escaneo histórico,
  no una simulación en vivo: una ruptura antigua puede aparecer unas velas antes
  de que fuera observable en tiempo real. Se mantiene así para que el indicador y
  la web digan lo mismo. **Para medir un sistema con esto, aplica el retardo de
  `strength` velas.**
- **Los últimos `strength` velas no tienen pivotes**, por definición del fractal.
- **La confluencia depende del histórico del gráfico.** Los niveles del escalón
  superior se acumulan a medida que se cierran sus velas; en un gráfico recién
  abierto con poco histórico habrá menos que en la web, que pide su propia serie.
- **Sin volumen** (forex, muchos índices) la expansión de volumen no penaliza:
  suma 8 puntos fijos en vez de 0 o 15, igual que en el backend.
- **La tolerancia manual es un porcentaje fijo** y sólo tiene sentido si sabes
  por qué la cambias. La automática se adapta a la volatilidad de la serie.

---

## 8. Si tocas el escáner del backend

`backend/price_action.py` es **la referencia**. Si cambias un umbral, una
puntuación o una regla ahí:

1. Haz el mismo cambio en `tradingview/tcp_structure_scanner.pine`.
2. `python scripts/gen-pine-twin.py`
3. `python -m pytest backend/tests/test_pine_parity_unit.py -q`
4. `python scripts/verificar-pine.py`

Si te lo saltas, el test de paridad falla y dice exactamente qué cifra se
separó. Ese es su trabajo.
