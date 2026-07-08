# Detección de la acción del precio — guía replicable (reglas, pasos, ejemplos)

> Segunda parte de la serie replicable (ver también
> [`METODOS_INSTITUCIONALES_REPLICABLE.md`](./METODOS_INSTITUCIONALES_REPLICABLE.md)).
> Aquí, los métodos de **lectura de la estructura del precio** que **se pueden programar**.
> Formato por método: **qué es → regla/fórmula → pasos → ejemplo con números → pseudocódigo →
> dónde encaja en este backend**.
>
> Base ya existente: `backend/price_action.py` ya te da **swings** (`detect_swings`), **estructura**
> HH/HL/LH/LL (`label_structure`), **BOS/CHoCH** (`detect_structure_events`), **S/R** (`detect_sr_levels`)
> y **FVG** (`detect_fvgs`). Casi todo lo de abajo se apoya en esas piezas.

Notación: `O,H,L,C` = apertura, máximo, mínimo, cierre. Serie ascendente por fecha.

---

## 1. Order Blocks (ICT / Smart Money)

**Qué es.** La **última vela contraria** antes de un movimiento impulsivo que **rompe estructura**.
Es la "huella" de dónde cargó el dinero antes de mover el precio. *Order block alcista* = la última
vela bajista antes de un impulso al alza que rompe un máximo previo.

**Regla de detección.**
```
OB alcista:
  1) hay un BOS alcista (un cierre rompe el último swing high)   ← ya lo tienes
  2) retrocede desde el arranque del impulso y toma la ÚLTIMA vela bajista (C < O)
  3) zona OB = [low, high] de esa vela   (versión estricta: [open, low] = "cuerpo")
OB bajista: espejo (última vela alcista antes de un impulso bajista que rompe un swing low)
Calidad: si el impulso deja un FVG, el OB es "de calidad".
Mitigado: se marca cuando una vela POSTERIOR vuelve a entrar en la zona [low, high].
```

**Pasos replicables.**
1. Detecta los eventos BOS (ya está en `detect_structure_events`).
2. Para cada BOS alcista en la vela `i`, mira hacia atrás y encuentra la última vela con `C < O`
   antes de que arrancara el impulso.
3. Guarda su rango `[low, high]` + fecha. Marca `mitigado=True` si alguna vela posterior toca el rango.

**Ejemplo con números.** Cierres: `…, 100(roja 101/100), 103, 105, 108`. El último swing high era 105.
La vela que cierra 108 rompe 105 → **BOS alcista**. La última vela bajista antes del impulso es la de
`[100, 101]` → **OB alcista en [100, 101]**. Si semanas después el precio baja a 101, entra en el OB →
zona de compra vigilada.

**Pseudocódigo.**
```python
def order_blocks(rows, events):
    obs = []
    for e in events:
        if e["kind"] not in ("BOS", "CHoCH"):
            continue
        i = e["index"]
        want_down = (e["direction"] == "bullish")   # OB alcista = última vela bajista
        j = i - 1
        while j >= 0:
            down = rows[j]["close"] < rows[j]["open"]
            if down == want_down:
                ob = {"index": j, "date": rows[j]["date"],
                      "low": rows[j]["low"], "high": rows[j]["high"],
                      "direction": e["direction"]}
                ob["mitigated"] = any(rows[k]["low"] <= ob["high"] and rows[k]["high"] >= ob["low"]
                                      for k in range(i + 1, len(rows)))
                obs.append(ob); break
            j -= 1
    return obs
```
**Dónde encaja.** `price_action.detect_structure_events` (BOS) + las velas. Un ~30-líneas más.

---

## 2. Barridos de liquidez (equal highs / lows + sweep)

**Qué es.** Los stops se apilan justo **encima de máximos iguales** y **debajo de mínimos iguales**.
Un **barrido** (*liquidity grab*) = el precio pincha ese nivel (se lleva los stops) y **vuelve rápido**
→ trampa antes del movimiento real.

**Regla de detección.**
```
Equal highs: 2+ swing highs dentro de una tolerancia (p. ej. 0.1%)   → liquidez "buy-side"
Barrido bajista (sweep de máximos): una vela cuyo HIGH supera el nivel
     pero cuyo CLOSE queda por DEBAJO del nivel   → pinchó y rechazó
Mínimos iguales / barrido alcista: espejo
```

**Pasos replicables.**
1. Agrupa swings por precio con tolerancia (reutiliza la lógica de `detect_sr_levels`).
2. Un cluster de ≥2 highs ≈ mismo precio = *equal highs*.
3. Marca un *sweep* cuando una vela rompe el nivel con la **mecha** pero cierra del lado contrario.

**Ejemplo con números.** Dos máximos en `200.0` y `200.1` (dentro del 0.1%) → equal highs ≈ 200.05.
Llega una vela con `high 200.5` pero `close 199.6` → **barrido bajista**: tomó la liquidez de arriba y
rechazó. Señal de posible giro a la baja.

**Pseudocódigo.**
```python
def liquidity_sweeps(rows, swings, tol=0.001):
    highs = sorted(s["price"] for s in swings if s["type"] == "high")
    levels = []                                   # clusters de máximos iguales
    for p in highs:
        if levels and abs(p - levels[-1]["ref"]) / levels[-1]["ref"] <= tol:
            levels[-1]["pts"].append(p); levels[-1]["ref"] = sum(levels[-1]["pts"])/len(levels[-1]["pts"])
        else:
            levels.append({"ref": p, "pts": [p]})
    eq = [l["ref"] for l in levels if len(l["pts"]) >= 2]
    sweeps = []
    for lvl in eq:
        for i, r in enumerate(rows):
            if r["high"] > lvl and r["close"] < lvl:
                sweeps.append({"index": i, "date": r["date"], "level": round(lvl, 6), "side": "high"})
    return sweeps
```
**Dónde encaja.** `detect_swings` + la lógica de clustering de `detect_sr_levels`.

---

## 3. Wyckoff (rango + Spring / Upthrust)

**Qué es.** Tras una tendencia, un **rango** lateral donde el dinero fuerte **acumula** (o distribuye).
Los eventos detectables clave son el **Spring** (falso rompimiento del suelo que revierte → alcista) y
el **Upthrust** (falso rompimiento del techo → bajista).

**Regla de detección.**
```
Rango: en una ventana de N velas, soporte = mínimo del rango, resistencia = máximo,
       y la tendencia es "range" (usa label_structure).
Spring:   una vela cuyo LOW < soporte  pero cuyo CLOSE > soporte   (sacudida bajista fallida)
Upthrust: una vela cuyo HIGH > resistencia pero cuyo CLOSE < resistencia
Fases (contexto): A parada de la tendencia previa · B construcción del rango ·
                  C test/Spring · D fuerza dentro del rango · E salida
```

**Ejemplo con números.** Rango `[100, 110]` durante 30 velas. Aparece una vela con `low 98`
(perfora 100) pero `close 101` (cierra dentro) → **Spring**. Es una señal clásica de acumulación:
barrieron a los que tenían stops bajo 100 y el precio recupró.

**Pseudocódigo.**
```python
def wyckoff_events(rows, window=30, tol=0.02):
    out = []
    for i in range(window, len(rows)):
        seg = rows[i-window:i]
        sup = min(b["low"] for b in seg); res = max(b["high"] for b in seg)
        r = rows[i]
        if r["low"] < sup and r["close"] > sup:
            out.append({"index": i, "date": r["date"], "event": "spring", "level": round(sup, 6)})
        elif r["high"] > res and r["close"] < res:
            out.append({"index": i, "date": r["date"], "event": "upthrust", "level": round(res, 6)})
    return out
```
**Dónde encaja.** `label_structure` (para confirmar 'range') + esta ventana móvil.

---

## 4. DeMark TD Sequential (agotamiento 9 y 13)

**Qué es.** Un contador de **agotamiento** en dos fases, **puramente algorítmico** (sin ambigüedad).
Un **9** (Setup) o un **13** (Countdown) avisa de posible giro.

**Reglas exactas.**
```
TD Buy Setup:  9 cierres CONSECUTIVOS, cada uno  <  el cierre de 4 velas antes.
TD Sell Setup: 9 cierres CONSECUTIVOS, cada uno  >  el cierre de 4 velas antes.
  Perfección (buy): el mínimo de la vela 8 ó 9  ≤  los mínimos de las velas 6 y 7.

TD Buy Countdown: tras un Buy Setup completo, cuenta velas (NO tienen que ser
  consecutivas) donde  close ≤ mínimo de 2 velas antes,  hasta llegar a 13.
  Regla 13-vs-8 (buy): el mínimo de la vela 13 debe ser  ≤  el cierre de la vela 8.
(Sell = espejo: close ≥ máximo de 2 velas antes; high[13] ≥ close[8].)
```

**Ejemplo con números** (Buy Setup). Cierres consecutivos, comparando cada uno con `close[i-4]`:
```
i:      1   2   3   4   5   6   7   8   9
close: 50  49  48  47  46  45  44  43  42
close[i-4] para i=5..13 va cayendo detrás → cada cierre < el de 4 antes → cuenta 1..9 → Setup 9.
```

**Pseudocódigo** (Setup; el Countdown es análogo con `low[i-2]`).
```python
def td_buy_setup(rows):
    out, count = [], 0
    for i in range(len(rows)):
        if i >= 4 and rows[i]["close"] < rows[i-4]["close"]:
            count += 1
            if count == 9:
                perf = (min(rows[i]["low"], rows[i-1]["low"])
                        <= min(rows[i-2]["low"], rows[i-3]["low"]))   # 8/9 vs 6/7
                out.append({"index": i, "date": rows[i]["date"], "type": "buy-setup-9", "perfected": perf})
                count = 0
        else:
            count = 0
    return out
```
**Dónde encaja.** Función pura sobre las velas. Ideal para tests unitarios (reglas deterministas).

---

## 5. Fractales de Bill Williams + Alligator

**Fractal (5 velas).** Fractal *up* en `i` = `high[i]` es el mayor de `{high[i-2 … i+2]}`; fractal
*down* = `low[i]` el menor. (Es exactamente un swing con `strength=2` → **ya lo tienes** en `detect_swings`.)

**Alligator** = 3 medias **suavizadas** (SMMA) sobre el **precio mediano** `M = (H+L)/2`, desplazadas
hacia adelante:
```
SMMA suavizada:   SMMA_t = ( SMMA_{t-1} · (n−1) + M_t ) / n     (la 1ª = media simple de n)
Jaw (mandíbula) = SMMA(13), desplazada 8 velas adelante
Teeth (dientes) = SMMA(8),  desplazada 5 velas adelante
Lips  (labios)  = SMMA(5),  desplazada 3 velas adelante
```
**Lectura.** Líneas entrelazadas = "el caimán duerme" (rango, no operar). Líneas abiertas y ordenadas
(Lips > Teeth > Jaw en alcista) = "come" (tendencia).

**Ejemplo (SMMA de 5, primeros pasos).** M = [10, 11, 12, 11, 13, 14].
```
SMMA_1 (primeros 5) = media(10,11,12,11,13) = 11.4
SMMA_2 = (11.4·4 + 14) / 5 = (45.6 + 14)/5 = 11.92
```

**Pseudocódigo.**
```python
def smma(vals, n):
    out = [None]*(n-1)
    s = sum(vals[:n]) / n; out.append(s)
    for v in vals[n:]:
        s = (s*(n-1) + v) / n
        out.append(s)
    return out

def alligator(rows):
    M = [(r["high"] + r["low"]) / 2 for r in rows]
    return {"jaw": smma(M, 13), "teeth": smma(M, 8), "lips": smma(M, 5)}
    # (aplicar el desplazamiento 8/5/3 al pintar, no al calcular)
```
**Dónde encaja.** `detect_swings` (fractales) + una función `smma()` nueva.

---

## 6. Ichimoku Kinko Hyo

**Qué es.** Un sistema completo "de un vistazo": tendencia, soporte/resistencia y señales en un solo
gráfico. Todo son **medias del punto medio** `(máx + mín)/2` de una ventana.

**Fórmulas.**
```
Tenkan-sen (conversión) = (máx de 9  + mín de 9 ) / 2
Kijun-sen  (base)       = (máx de 26 + mín de 26) / 2
Senkou Span A (líder A) = (Tenkan + Kijun) / 2        → desplazada +26 adelante
Senkou Span B (líder B) = (máx de 52 + mín de 52) / 2 → desplazada +26 adelante
Chikou (retrasada)      = cierre                       → desplazada −26 atrás
Nube (Kumo) = área entre Span A y Span B
```
**Lectura.** Precio **sobre** la nube = alcista; **bajo** = bajista; **dentro** = indecisión. Cruce
Tenkan/Kijun = señal. Nube gruesa = soporte/resistencia fuerte.

**Ejemplo (Tenkan).** Últimas 9 velas con máx = 120 y mín = 108 → `Tenkan = (120+108)/2 = 114`.

**Pseudocódigo.**
```python
def _mid(rows, i, n):
    seg = rows[i-n+1:i+1]
    return (max(b["high"] for b in seg) + min(b["low"] for b in seg)) / 2

def ichimoku(rows):
    out = []
    for i in range(len(rows)):
        tenkan = _mid(rows, i, 9)  if i >= 8  else None
        kijun  = _mid(rows, i, 26) if i >= 25 else None
        spanB  = _mid(rows, i, 52) if i >= 51 else None
        spanA  = (tenkan + kijun) / 2 if (tenkan and kijun) else None
        out.append({"tenkan": tenkan, "kijun": kijun, "spanA": spanA, "spanB": spanB})
    return out   # Span A/B se pintan +26 adelante; Chikou = close pintado −26 atrás
```
**Dónde encaja.** Función pura sobre las velas; se dibuja como overlay del gráfico.

---

## 7. Confirmación de rupturas — ¿entra liquidez alcista o bajista? ✅ YA IMPLEMENTADO

**Qué es.** Saber si la rotura de un nivel es **real** (entra dinero de verdad) o una **trampa**
(*fakeout* / barrido), y **de qué lado entra la liquidez**: compradora (alcista) o vendedora (bajista).

**Señales de confirmación** (combinadas en una puntuación 0-100):
```
+30  el CIERRE atraviesa el nivel (no solo la mecha), con margen ≥ 0.1%
+20  vela a favor (cierre > apertura en alcista; < en bajista)
+20  cierre cerca del extremo de la vela (compradores/vendedores dominan la vela)
+15  expansión de rango: la vela es ≥ 1.2× el ATR medio (participación)
+15  expansión de volumen: volumen ≥ 1.5× la media (dinero real detrás)   [+8 si no hay volumen]
     Confirmado si la puntuación ≥ 50.
```
**Fakeout / barrido de liquidez.** Si la **mecha** pincha el nivel pero la vela **cierra del otro
lado** → trampa. La liquidez que entra es la **CONTRARIA**: pincha máximos y cierra debajo = entró
liquidez **bajista** (barrieron a los compradores). Pincha mínimos y cierra encima = **alcista**.

**Ejemplo con números** (resistencia en 100):
```
Base bajo 100 … luego una vela cierra en 102 (margen +2%), vela verde,
cierre cerca del máximo, rango 4× ATR, volumen 4× la media
→ puntuación 95 → ruptura CONFIRMADA · liquidez ALCISTA.
```

**Pseudocódigo** (resumen — el completo está en `price_action.py::detect_breakouts`).
```python
up_cross   = prev_close <= level < close       # el cierre cruza hacia arriba
if up_cross:
    score  = 30 if (close-level)/level >= 0.001 else 10
    score += 20 if close > open else 0
    score += int(20 * (close-low)/(high-low))                 # cierre en el extremo
    score += 15 if (high-low) >= 1.2*atr else 0               # rango
    score += 15 if volume >= 1.5*avg_volume else 0            # volumen
    confirmed = score >= 50;  liquidity = "bullish"
elif high > level and close < level:            # mecha arriba, cierra debajo
    kind = "fakeout";  liquidity = "bearish"    # barrido: entra liquidez contraria
```

**Dónde encaja. → Ya está construido en este repo (con tests):**
- `backend/price_action.py::detect_breakouts()` — devuelve por cada ruptura: nivel, dirección,
  `confirmed`, `kind` (breakout/fakeout), **`liquidity`** (bullish/bearish), `score`, `%` de cierre,
  expansión de rango y de volumen.
- Incluido en `detect_structure()` (campo `breakouts` + `counts.breakouts/fakeouts`), así que el
  endpoint **`/education/structure-scan/{symbol}`** ya lo devuelve.
- `get_ohlc_history` ahora incluye **`volume`** (necesario para la confirmación por volumen).
- 4 tests unitarios offline en `tests/test_price_action_unit.py` (ruptura alcista/bajista confirmada,
  fakeout de resistencia = liquidez bajista, y que `detect_structure` incluye `breakouts`).

---

## Resumen: qué se puede detectar y sobre qué se apoya

| Método | Regla clave (en 1 línea) | Se apoya en |
|---|---|---|
| Order Blocks | Última vela contraria antes de un BOS | `detect_structure_events` |
| Barridos de liquidez | Mecha rompe equal-highs/lows y cierra dentro | `detect_swings` + clustering |
| Wyckoff Spring/Upthrust | Mecha perfora el rango y cierra dentro | `label_structure` (range) |
| DeMark TD Sequential | 9 cierres < close[−4]; countdown 13 vs low[−2] | velas (puro) |
| Fractales + Alligator | Fractal = swing(2); Alligator = 3 SMMA | `detect_swings` + `smma()` |
| Ichimoku | Medias de (máx+mín)/2 en 9/26/52 | velas (puro) |
| **Confirmación de rupturas** ✅ | **Cierre atraviesa + rango/volumen; fakeout = liquidez contraria** | **`detect_breakouts` (hecho)** |

Todos se implementarían igual que `price_action.py`: **funciones puras + tests unitarios offline +
(opcional) un endpoint** que las exponga al escáner del dashboard. Ninguno necesita datos de pago:
les basta el OHLC que ya da `get_ohlc_history`.

---

*Documento de referencia interna. Datos informativos; no es asesoramiento de inversión.*
