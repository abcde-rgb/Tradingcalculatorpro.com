# Dónde faltan ilustraciones en la academia, y qué poner en cada una

> Auditoría del 2026-08-19 · rama `claude/ci-verde-y-aprendizaje`
> **86 módulos · 59 con ilustración · 27 sin ninguna · 79 componentes visuales**

Medido sobre el código, no a ojo: se trocea `EducationPage.jsx` por `<TabsContent>` y se
mira qué componente de `components/education/` —o qué `<svg>` escrito a mano— cae dentro
de cada bloque.

⚠️ **Mis dos primeras mediciones dieron falsos negativos y las tiré.** La primera contaba
`desc:` pero no `description:`, y dejaba el módulo de velas —que es enorme— marcado con 0
apartados. Ninguna de las dos veía el bucle genérico que renderiza nueve módulos, así que
los daba por huérfanos de render cuando sí se pintan. Las cifras de aquí son las de la
tercera, contrastada contra casos conocidos.

Reproducir la medición:

```bash
python3 - <<'PY'
import re, pathlib
pag = pathlib.Path("frontend/src/pages/EducationPage.jsx").read_text()
comps = set(re.findall(r"import\s+(\w+)\s+from\s+'@/components/education/", pag))
ap = [(m.start(), m.group(1)) for m in
      re.finditer(r"<TabsContent\s+value=[\"']([a-z0-9-]+)[\"']", pag)]
bl = {t: pag[p:(ap[i+1][0] if i+1 < len(ap) else len(pag))] for i,(p,t) in enumerate(ap)}
for t, cuerpo in sorted(bl.items()):
    usados = sorted(c for c in comps if re.search(rf"<{c}[\s/>]", cuerpo))
    if not usados and not re.search(r"<svg[\s>]", cuerpo):
        print(" sin ilustración:", t)
PY
```

---

## 1. Tres cosas que la medición destapó y que no son «falta un dibujo»

### 1.1 Nueve módulos comparten una plantilla que sólo sabe pintar texto

Viven en un bucle de `EducationPage.jsx` (≈ línea 5299) con una forma compartida: tarjeta
de título, rejilla de nombre + descripción, nota opcional. **No hay ningún punto de
extensión donde colgar una figura.**

`news-trading` · `sentiment` · `intermarket` · `breadth-cycles` · `broker-safety` ·
`margin-liq` · `option-greeks` · `inst-desk` · `pro-discipline`

Un tercio del problema es esta plantilla, no nueve olvidos: añadirle un `Visual` opcional
los desbloquea todos de una vez.

### 1.2 La asignación está al revés en el pilar de opciones

| Módulo | Qué es | Ilustración |
|---|---|---|
| `option-greeks` | Los cimientos: delta, gamma, theta, vega, rho, IV | **ninguna** |
| `gamma-exposure` | Construido encima | `GammaExposureVisual` |
| `options-vol` | Construido encima | `OptionsVolVisual` |
| `options-income` | Construido encima | `OptionsIncomeVisual` |

Las griegas **son curvas**. Explicar «gamma es la tasa de cambio de delta» en prosa es el
peor medio disponible para eso, y es justo el módulo del que dependen los otros tres.

### 1.3 La guía de stops está archivada en el módulo equivocado

`StopLossGuide` se renderiza dentro de **`capital`** (`EducationPage.jsx:4276`). El módulo
`stops-targets`, que trata exactamente de eso y tiene nueve apartados sobre invalidación,
tipos de stop y R:B, **no tiene ninguna figura**. No cuesta construir nada: es moverlo, o
referenciarlo desde los dos.

---

## 2. Prioridad 1 — donde la figura *es* la explicación

Aquí el texto no es «mejorable con un dibujo»: es insuficiente sin él. Son formas, curvas y
disposiciones espaciales, y describirlas en palabras es pedirle al lector que haga el render
mentalmente. **Si sólo se hace una tanda, es ésta.**

### `option-greeks` — 6 apartados

Una curva por griega, todas contra precio del subyacente, con el strike marcado:

- **delta** — sigmoide.
- **gamma** — campana con el pico en el strike.
- **theta** — decaimiento contra tiempo, con la curva de 30 días y la de 7 superpuestas,
  para que se vea que **no es lineal**.
- **vega** — campana que se aplana al acercarse el vencimiento.
- **rho** — plano y pequeño. Dibujar lo irrelevante también enseña.
- **iv** — la sonrisa.

**Reutiliza el motor que ya tienes:** `options_math.py` calcula estas curvas de verdad, así
que no hay que inventar los puntos. Una figura generada con Black-Scholes real es además
coherente con el resto del producto.

### `options-strat` — 7 apartados

**El diagrama de pago de cada estrategia, que es su definición.** Covered call, cash-secured
put, spread alcista, spread bajista, iron condor, straddle y put protectora: siete payoffs
con los puntos de equilibrio marcados y las zonas de beneficio y pérdida sombreadas.

Un iron condor descrito sólo con palabras no se distingue de un butterfly. Es el caso más
claro de toda la academia: la figura no ilustra el texto, **lo sustituye**.

### `alt-charts` — 5 apartados

**La MISMA serie de precio dibujada de las cinco formas, una al lado de otra**, más la vela
japonesa como referencia: Renko, Heikin-Ashi, punto y figura, Kagi y three-line break.

Lo que enseña no es cada tipo por separado sino **qué tira cada uno a la basura**: Renko
ignora el tiempo, P&F ignora el ruido menor, Heikin-Ashi promedia. Eso sólo se ve
comparando, y comparar es imposible en prosa.

### `margin-liq` — 8 apartados

Un gráfico de precio con la línea de liquidación y **la mecha que la toca sin que el cierre
llegue**. Encima, aislado contra cruzado como dos cajas: en aislado la pérdida está acotada
al margen de esa posición, en cruzado el borde se traga toda la cuenta. Precio marca contra
último precio como dos líneas que divergen justo en el pico.

Es el apartado donde una mala intuición cuesta la cuenta entera, y hoy son ocho párrafos.

### `stops-targets` — 9 apartados

Un gráfico con entrada, stop, objetivo y —lo importante— **el punto de invalidación marcado
aparte del stop**. Las dos cajas de riesgo y beneficio a escala real, para que un 1:2 se vea
como 1:2. Los tipos de stop como variantes del mismo dibujo: fijo, por ATR, por estructura,
por tiempo.

Mueve aquí `StopLossGuide` (§ 1.3): la mitad del trabajo ya está hecha y archivada donde
nadie la busca.

### `trade-mgmt` — 9 apartados

**La dispersión MAE/MFE, que es la forma canónica de este análisis y no existe en el sitio.**
Cada operación un punto: excursión adversa máxima en un eje, favorable en el otro, ganadoras
y perdedoras en colores distintos. La nube dice dónde poner el stop mejor que cualquier regla.

Y como el diario ya guarda las operaciones, esta figura puede dibujarse con **los datos del
usuario** en vez de con un ejemplo. Ahí deja de ser una ilustración y pasa a ser una
herramienta.

---

## 3. Prioridad 2 — donde la figura ahorra tres párrafos

El texto se sostiene, pero la figura lo comprime mucho y evita el malentendido típico de
cada tema.

| Módulo | Aptdos. | Qué dibujar |
|---|---:|---|
| `start-here` | 9 | La **anatomía de la vela** (cuerpo, mechas, apertura, cierre) y la horquilla compra/venta como dos escaleras enfrentadas. **`CandleAnatomy` ya existe**, usado en `candlesticks`: aquí es reutilizarlo. Es el primer módulo que abre un principiante y hoy no tiene ni un dibujo. |
| `advanced-ta` | 7 | Zona de oferta y demanda como banda sombreada; perfil de volumen como histograma horizontal con el punto de control; VWAP con bandas; divergencia con precio e indicador enfrentados; estrechamiento de Bollinger antes de la expansión. |
| `partial-exits` | 7 | Tres curvas de capital sobre **la misma** secuencia de operaciones: salida completa, por mitades, por tercios. El punto entero del módulo es que la elección cambia la **forma** de la curva, no la media — y eso es un gráfico o no es nada. |
| `sentiment` | 5 | VIX como serie con las zonas de pánico y complacencia sombreadas; ratio put/call con su media; miedo y codicia como esfera. La lectura contraria se explica marcando los extremos históricos y qué pasó después. |
| `breadth-cycles` | 7 | Línea de avance-descenso **divergiendo del índice** —el caso que enseña—, nuevos máximos contra nuevos mínimos, TICK y TRIN como osciladores, estacionalidad como mapa de calor por mes. |
| `intermarket` | 6 | Una **matriz de correlación** entre dólar, bonos, acciones, oro y cripto, y el riesgo-on/riesgo-off como dos columnas de qué sube y qué baja en cada régimen. |
| `news-trading` | 5 | Línea temporal del dato: antes (la horquilla se abre), el instante (mecha en los dos sentidos) y después (dónde se asienta). Con la horquilla **a escala**, que es lo que nadie se espera. |
| `inst-positions` | 8 | El troceado de una orden grande: la madre arriba, las hijas repartidas en el tiempo debajo, y el impacto en precio comparado con ejecutarla de golpe. El iceberg como parte visible y sumergida. |
| `craft` | 26 | **El módulo más grande de la academia sin una sola figura.** Con dos bastaría: la fórmula de la esperanza como barra de acierto × ganancia contra fallo × pérdida, y la R como regla graduada sobre un gráfico. |
| `fund-analysis` | 11 | Rejilla de indicadores macro por impacto esperado y una serie de precio con las publicaciones marcadas. Para PER, BPA y dividendo, la cascada de la cuenta de resultados. |
| `broker-safety` | 6 | **Diagrama de flujo de comprobación**: ¿regulado? ¿fondos segregados? ¿quién es el depositario? Con las salidas rojas. Y el esquema Ponzi dibujado como lo que es: dinero de los nuevos pagando a los viejos. |

---

## 4. Prioridad 3 — donde una figura sería decoración

Merece decirse en voz alta: **no todo apartado necesita un dibujo.** Llenar estos por
simetría añadiría ruido y trabajo de mantenimiento sin enseñar nada.

| Grupo | Módulos | Por qué NO |
|---|---|---|
| Biografías y máximas | `masters`, `futures-masters`, `rules` | Un retrato es decoración pura (y arrastra derechos de imagen); una regla escrita **es** la regla. Lo único defendible sería una línea temporal de quién operó cuándo y en qué régimen — un «estaría bien», no un hueco. |
| Conceptual y de proceso | `mindset`, `pro-discipline`, `inst-desk`, `inst-methods`, `business` | Son mentalidad, rutinas y descripciones de oficio. **Dos excepciones:** en `business` el interés compuesto es una curva y pide gráfico; en `inst-methods` la ejecución por VWAP se entiende con el mismo dibujo de troceado que `inst-positions` — o sea, un componente para los dos. |
| Ya interactivo | `quiz`, `strategies` | El cuestionario es su propia interfaz. Las nueve estrategias ganarían con un esquema de montaje por ficha, pero después de la prioridad 1: su problema no era el dibujo sino la tasa de acierto en verde, **y eso ya está corregido** (commit `c56c621d`). |

---

## 5. Antes de dibujar nada: hay una deuda que conviene pagar

**38 de los 79 componentes visuales repiten los mismos ayudantes `Frame` y `Line` copiados
y pegados**; al menos seis son idénticos byte a byte. Si se añaden 17 componentes más sin
tocar eso, la copia pasa de 38 a 55, y cualquier cambio de estilo —el grosor de una línea,
un color que no funciona en modo oscuro— hay que hacerlo 55 veces.

```bash
cd frontend/src/components/education && grep -l "^const Frame = " *.jsx | wc -l   # → 38
```

### Orden recomendado

| # | Qué | Por qué antes que lo siguiente |
|---:|---|---|
| 1 | `components/education/figuras.jsx` con `Frame`, `Line`, ejes, sombreado y etiquetas, en tokens de tema. | Los 17 componentes nuevos nacen encima. Migrar los 38 viejos puede ir después, o nunca. |
| 2 | Punto de extensión en el bucle genérico de los 9 módulos. | Un cambio de cinco líneas desbloquea nueve módulos, incluido `option-greeks`. |
| 3 | Mover `StopLossGuide` a `stops-targets`. | Coste cero, y arregla el módulo peor servido en relación a lo que ya existe. |
| 4 | Prioridad 1, empezando por `option-greeks` y `options-strat`. | Los dos pueden generar sus curvas con `options_math.py` en vez de con puntos inventados. |
| 5 | Sonda de navegador por tanda, como `tests/e2e/navegador/ludopatia.js`. | Contar `<rect>` y medir la caja. **Un SVG que no pinta nada pasa cualquier test que no mire el resultado, y en este repositorio ya ha pasado.** |

---

## 6. Qué NO he comprobado

- He medido qué módulos **no tienen ningún** componente visual ni SVG. **No** he comprobado
  que los 59 que sí tienen uno lo tengan *en cada apartado*: un módulo de doce apartados con
  una sola figura cuenta aquí como «con ilustración».
- **No** he mirado si las figuras existentes son correctas, ni si se ven bien en móvil y en
  oscuro. Eso sólo lo verifiqué en el módulo de ludopatía, que es el que escribí.
- Las propuestas son mías y **no están validadas con usuarios**. Las de prioridad 1 las
  defiendo con argumento fuerte —una curva no se describe en prosa—; las de prioridad 2 son
  juicio razonado, y ahí se puede discrepar sin que nadie esté equivocado.
