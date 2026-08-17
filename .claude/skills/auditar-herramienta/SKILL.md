---
name: auditar-herramienta
description: >-
  Auditar o rehacer lo que CALCULA una herramienta de TradingCalculator.Pro —una
  de las catorce calculadoras sueltas, la mesa, el simulador, el escáner, un panel
  de opciones o del diario— para comprobar que sus cifras significan lo que dicen.
  Úsalo cuando se pregunte si una calculadora está bien, si sus números tienen
  sentido, al reescribir una sobre el catálogo (hueco G-33), al añadir una nueva, o
  cuando el usuario sospeche de un resultado. Cubre la aritmética, el catálogo de
  instrumentos, los invariantes de honestidad, la capa de presentación y la
  verificación en el navegador sobre el build compilado.
---

# Auditar lo que calcula una herramienta

Una calculadora que se equivoca no falla: contesta. Con confianza, con dos
decimales y con un símbolo de dólar delante. Por eso esto no se audita mirando
si revienta, sino comprobando que **cada cifra significa lo que su etiqueta
dice**.

Aplica `no-me-fio` a todo lo que encuentres aquí. Y empieza por lo que ya se
sabe: `docs/ESTADO_PROYECTO.md` § G-33 lleva la cuenta de las que faltan.

## 0 · Antes de tocar nada

La aritmética buena del proyecto ya está escrita y probada. Si vas a calcular
algo que ya existe, **impórtalo**; si escribes una fórmula nueva dentro de un
`.jsx`, la estás poniendo donde ningún test puede alcanzarla — que es
exactamente por qué las catorce sueltas se pudrieron.

| Necesitas | Está en |
|---|---|
| Tamaño de contrato, pip, tick, margen, palanca de un símbolo | `lib/instruments.js` (`resolveSpec`, `contractSizeFor`) |
| Del riesgo al tamaño, topes, escalón, liquidación | `lib/deskMath.js` (`riskBudget`, `maxSizes`, `minTicket`) |
| Del margen al tamaño | `deskMath.quantityFromMargin` |
| Lotes con la cuenta en otra divisa | `deskMath.lotSizing`, `pipValue`, `quoteToAccount` |
| Nocional, exposición, R:B, ROE | `instruments.positionMetrics` |
| Griegas y precio de opción | `utils/blackScholes.js` |
| Tipo libre de riesgo | `useRiskFreeRate()` — **nunca un literal** |
| Decimales de un precio | `productMeta.fmtPrice` / `swingDecimals` |

## 1 · Lee el código, no la etiqueta

Son dos afirmaciones distintas y se contradicen más de lo que parece. La
descripción del lotaje prometía «el valor del pip de cada par y tu divisa de
cuenta» sobre un `pipValuePerStandardLot = 10` escrito a mano.

Busca primero estos cuatro olores, que es donde han estado todos los fallos:

```bash
# Constantes de instrumento escritas a mano donde debería estar el catálogo
grep -nE "= *10;|100000|pipValue *=|contractSize *= *[0-9]" src/components/calculators/*.jsx

# Decimales fijos sobre precios: rompe forex y cripto barata
grep -n "toFixed(2)\|toLocaleString()" src/components/**/*.jsx

# El tipo libre de riesgo a mano
grep -rn "0\.05\|useState(5" src/components/ | grep -i "rate\|_r\b\|risk"

# Apalancamiento multiplicando algo que no es margen ni liquidación
grep -n "\* *lev\|leverage *\*" src/components/**/*.jsx
```

## 2 · Los invariantes que no se negocian

Están en `CLAUDE.md` y en `.claude/rules/diario-riesgo.md`. Cada uno ya costó un
bug con nombre:

- **El apalancamiento NO entra en el P&L.** `(salida − entrada) × cantidad ×
  tamaño de contrato`. La palanca decide el **margen** y la **liquidación**, nada
  más. La calculadora de patrones anunciaba una pérdida ×10 por meterla aquí.
- **Lo que no se puede calcular es `null`, no `0`.** Un R sin stop, un Sortino
  sin pérdidas, una IV que el precio no determina, una liquidación a 1×. Un cero
  arrastra medias y dice «no hay riesgo» donde lo que hay es «falta un dato».
- **Sin tamaño de contrato, el riesgo es falso.** `|entrada − stop| × cantidad`
  no salta nunca en opciones (×100) ni en forex (×100 000). Fuera de catálogo
  vale `None`, no 1.
- **Lo sensible al orden se ordena.** Curva de equity, drawdown y rachas sobre
  `sort_trades_chronologically()`, nunca sobre el orden de llegada.
- **Nada inventado sin etiquetar.** Cadena modelada → `synthetic: true` y banda
  de aviso; su volumen e interés abierto van a `None`.
- **Por encima del 10 % no hay tamaño, hay motivo** (`RISK_HARD_CAP_PCT`). Y
  avisar del tope mientras se enseña un tamaño debajo es peor que no avisar.

## 3 · Cotejo contra una segunda fuente

Coge tres o cuatro símbolos que rompan supuestos distintos y compara el
resultado con un dato que **no venga del mismo código**:

| Símbolo | Qué supuesto rompe | Contra qué se coteja |
|---|---|---|
| EURUSD | el caso fácil, el que siempre sale bien | pip de lote = 10 $ |
| USDJPY | cotiza en yenes, no en la divisa de la cuenta | 1000 ¥ ÷ precio |
| XAUUSD | no es forex, es CFD: lote 100 oz, pip 0,01 | 1 $ por pip y lote |
| EURGBP | cruce: hace falta un tercer cambio | tiene que salir `null` |
| MES / CL | contrato con tick propio | `tick_value` del catálogo |
| Una acción | no tiene lote ni pip | no puede quedarse muda |

Y prueba siempre los bordes que sí ocurren: precio muy bajo (cripto a 0,00001),
apalancamiento 1×, stop pegado a la entrada, cuenta de 100 €, símbolo fuera de
catálogo, campo vacío.

## 4 · La presentación también miente

Que el número sea correcto no significa que se lea. Fibonacci tenía el recorte
de decimales **dos veces**: en el cálculo y otra vez en el render. Comprueba
aparte:

- ¿los decimales dan para distinguir dos niveles contiguos?
- ¿`null` se pinta como raya y no como `0` ni como `$0.00`?
- ¿el número lleva su unidad y, si es tamaño, también **el dinero que mueve**?
- ¿se dice qué tope manda cuando no manda el riesgo?
- ¿un símbolo o un modo desconocido lo dice, o deja la pantalla muda?

## 5 · Fíjalo donde CI lo alcance

Sin esto la auditoría caduca en la siguiente sesión.

```bash
cd frontend
node scripts/engine-check.js            # casos elegidos, con números a mano
node scripts/simulacion-masiva.js --n 8000 --semilla <una nueva>
```

`engine-check` para el número concreto que alguien calculó a mano.
`simulacion-masiva` para la invariante que debe cumplirse en cualquier
escenario. **Cambia la semilla**: repetir la tanda de siempre no añade
información, y así salió el fallo de precisión de `snapDown`.

## 6 · Y en el navegador, sobre el build compilado

Las funciones puras en verde no garantizan que el usuario vea nada. Levanta el
artefacto real y afírmalo con una sonda (patrón en `tests/e2e/entorno.js`;
`rutaChromium`, `descartaCookies`, `descartaModales`). Para stack completo con
backend y Postgres, el skill `qa`.

Reglas de la sonda, todas aprendidas a base de falsos verdes:

- Afirma sobre el **texto** que se pinta, no sobre la URL ni el código HTTP.
- Por cada «aparece X», añade el «y NO aparece Y» que le corresponde.
- Servidor con fallback de SPA, o `/dashboard` devuelve un 404 con código 200.
- Copia el build antes de sondear y comprueba que copiaste el nuevo.
- Si la sonda falla, sospecha primero de la sonda: el locale de la app mezcla
  `es-ES` (coma decimal) y `en-US` según el formateador.

## Al terminar

`/verify` entero, y actualiza `docs/ESTADO_PROYECTO.md`: qué herramienta, qué
estaba mal con su número, y qué comprobación impide que vuelva. Una auditoría
sin test es una opinión con fecha de caducidad.
