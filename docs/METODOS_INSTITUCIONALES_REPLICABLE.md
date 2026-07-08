# Métodos institucionales — guía replicable (fórmulas, pasos, ejemplos)

> Objetivo: que **tú o cualquier desarrollador** podáis **replicar** cada método, no solo
> entenderlo por encima. Cada apartado trae: **qué es → fórmula → pasos → ejemplo con números
> → pseudocódigo → dónde encaja en este backend**.
>
> En este repo ya tienes las piezas: `backend/stock_data.py::get_ohlc_history` (OHLC **con volumen**),
> `backend/options_math.py` (Black-Scholes + **gamma**), `backend/server.py::/options/chain/{symbol}`
> (cadena de opciones con **open interest** por strike) y `backend/price_action.py` (estructura).
> Todo lo de abajo se implementaría como funciones puras nuevas + un endpoint, igual que
> `price_action.py` + `/education/structure-scan`.

Notación: `O,H,L,C,V` = apertura, máximo, mínimo, cierre, volumen de una vela.

---

## 1. VWAP y VWAP anclado (precio medio ponderado por volumen)

**Qué es.** El precio medio al que *realmente* se ha negociado, dando más peso a las velas con más
volumen. Es el listón contra el que se mide a las mesas de ejecución.

**Fórmula.**
```
Precio típico de una vela:   TP = (H + L + C) / 3
VWAP (acumulado desde el ancla):
        Σ (TP_i × V_i)
VWAP = ─────────────────      para i = ancla … vela actual
          Σ (V_i)
```
Bandas de desviación (para ver "caro/barato" respecto al VWAP):
```
Varianza ponderada:  σ² = Σ[ V_i × (TP_i − VWAP)² ] / Σ V_i
Banda k:             VWAP ± k·σ      (k = 1, 2, 3)
```

**Pasos replicables.**
1. Elige el **ancla**: inicio de sesión (VWAP diario clásico) **o** una vela concreta (un mínimo
   importante, una noticia) → eso es el *Anchored VWAP*.
2. Recorre las velas desde el ancla. En cada una calcula `TP`.
3. Acumula `PV += TP×V` y `VV += V`. El VWAP en esa vela es `PV/VV`.
4. Para las bandas, acumula también `Σ V·(TP−VWAP)²` y saca `σ`.

**Ejemplo con números** (3 velas):

| Vela | H | L | C | TP=(H+L+C)/3 | V | TP×V |
|---|---|---|---|---|---|---|
| 1 | 101 | 99 | 100 | 100.00 | 1 000 | 100 000 |
| 2 | 103 | 100 | 102 | 101.67 | 3 000 | 305 010 |
| 3 | 102 | 100 | 101 | 101.00 | 2 000 | 202 000 |

`Σ(TP×V) = 607 010` · `ΣV = 6 000` → **VWAP = 607 010 / 6 000 = 101.17**.
El cierre (101) está **por debajo** del VWAP → intradía mandan (ligeramente) los vendedores.

**Pseudocódigo.**
```python
def vwap(bars, anchor=0):
    pv = vv = 0.0
    out = []
    for b in bars[anchor:]:
        tp = (b["high"] + b["low"] + b["close"]) / 3
        pv += tp * b["volume"]
        vv += b["volume"]
        out.append(pv / vv if vv else None)
    return out            # una serie VWAP, punto a punto
```

**Cómo leerlo.** Precio > VWAP = fuerza compradora intradía (y al revés). Actúa como imán y como
zona de "valor justo" del día. Forex spot **no** sirve (no hay volumen real); acciones/cripto/futuros sí.

---

## 2. GEX — Gamma Exposure (posicionamiento de los dealers de opciones)

**Qué es.** Cuánto tienen que comprar/vender del subyacente los *market makers* de opciones para
seguir cubiertos (delta-neutral) por cada 1 % que se mueva el precio. Estima si amortiguan (GEX+) o
amplifican (GEX−) el movimiento.

**Necesitas** (ya lo tienes en `/options/chain/{symbol}`): por cada strike y vencimiento →
tipo (call/put), **open interest (OI)** y **gamma** (Γ). Si el feed no da Γ, se calcula con
Black-Scholes (ya está en `options_math.py`):
```
d1 = [ ln(S/K) + (r + σ²/2)·T ] / (σ·√T)
Γ  = φ(d1) / (S · σ · √T)         φ(x) = (1/√(2π))·e^(−x²/2)   (densidad normal)
```
donde `S` = precio spot, `K` = strike, `T` = años hasta vencimiento, `σ` = volatilidad implícita,
`r` = tipo sin riesgo.

**Fórmula GEX** (convención estándar tipo SqueezeMetrics):
```
GEX_strike = Γ · OI · 100 · S² · 0.01 · signo
   signo = +1 para CALLS,  −1 para PUTS      (⚠️ es una SUPOSICIÓN, ver nota)
   100   = acciones por contrato
   S²·0.01 = convierte "gamma por acción" a "$ de delta por cada 1 % de movimiento"

GEX_total = Σ GEX_strike   (todos los strikes y vencimientos)
```

**Pasos replicables.**
1. Trae la cadena y el spot `S`.
2. Para cada strike: consigue Γ (o calcúlala con la fórmula de arriba) y `OI`.
3. `GEX_strike = Γ·OI·100·S²·0.01`, con signo + si call, − si put.
4. Suma todo → **GEX total** (en "$ por 1 %").
5. Para el **perfil**, repite variando `S` en un rango (p. ej. ±10 %) y dibuja GEX(S). El precio
   donde GEX cruza de + a − es el **nivel de gamma cero (flip)**.
6. El strike con más gamma acumulada = el **"muro"** (imán / soporte-resistencia).

**Ejemplo con números** (un solo strike, para ver la mecánica):
`S=500, K=500, T=7/365=0.0192, σ=0.15, r=0.05, OI=10 000 calls`.
```
d1 = [ ln(1) + (0.05 + 0.15²/2)·0.0192 ] / (0.15·√0.0192)
   = (0.06125·0.0192) / (0.15·0.1386) = 0.001176 / 0.02079 = 0.0566
φ(d1) = 0.3989 · e^(−0.0566²/2) ≈ 0.3983
Γ = 0.3983 / (500·0.15·0.1386) = 0.3983 / 10.395 = 0.03831   (por acción)

GEX_strike = 0.03831 · 10 000 · 100 · 500² · 0.01
           = 0.03831 · 10 000 · 100 · 2 500  = +95.8 millones $ por 1%
```
Interpretación: los dealers, para cubrirse, moverían ~**$95.8 M** de SPY por cada 1 % → gamma
positiva grande = tienden a **frenar** el movimiento en torno a ese strike.

**Pseudocódigo.**
```python
def gex(chain, S):
    total = 0.0
    for opt in chain:                      # opt: {type, strike, oi, gamma}
        g = opt["gamma"]                   # o bs_gamma(S, opt.strike, T, r, iv)
        sign = 1.0 if opt["type"] == "call" else -1.0
        total += g * opt["oi"] * 100 * S*S * 0.01 * sign
    return total                           # $ de delta por 1% de movimiento
```

**Cómo leerlo.** GEX+ → mercado "pegajoso" (rango, vol baja). GEX− → movimientos amplificados
(vol alta, tendencia). ⚠️ **Nota honesta:** el *signo del dealer* es una convención — no sabes con
certeza cómo está posicionado; por eso GEX es una **estimación**, no una verdad. Viable solo en
acciones/ETF/índices con opciones líquidas (SPY, QQQ, AAPL…).

---

## 3. Volume Profile — POC y Value Area (la subasta)

**Qué es.** En vez de volumen por *tiempo*, volumen por **precio**: dónde se ha negociado más.
`POC` = precio de máximo volumen; `Value Area` (VA) = banda que contiene el 70 % del volumen.

**Pasos replicables.**
1. Elige el rango (p. ej. últimas 20 sesiones) y el nº de **filas** `N` (bins), p. ej. 50.
2. `min = mínimo de todos los L`, `max = máximo de todos los H`. Tamaño de bin `w = (max−min)/N`.
3. Reparte el volumen de cada vela en los bins que cubre su rango `[L, H]` (aprox. sencilla:
   repartir `V` **uniformemente** entre los bins tocados por `[L,H]`; aprox. mínima: todo el `V` al
   bin del `TP`).
4. **POC** = bin con más volumen.
5. **Value Area 70 %**: parte del POC; mira los dos bins vecinos (arriba/abajo) y añade el de más
   volumen; repite sumando volumen hasta llegar al **70 %** del total. Los extremos = `VAH` (alto) y
   `VAL` (bajo).

**Ejemplo con números** (5 bins, volumen ya repartido):
```
Precio   Volumen
 104      10
 103      25
 102      40   ← POC (máximo)
 101      20
 100       5
Total = 100.  Objetivo VA = 70.
Empiezo en POC(102)=40. Vecinos: 103(25) vs 101(20) → añado 103 → 65.
Vecinos: 104(10) vs 101(20) → añado 101 → 85 ≥ 70. Paro.
Value Area = [101 … 103];  VAL=101, VAH=103, POC=102.
```

**Pseudocódigo** (esqueleto).
```python
def volume_profile(bars, bins=50):
    lo = min(b["low"] for b in bars); hi = max(b["high"] for b in bars)
    w = (hi - lo) / bins
    vol = [0.0]*bins
    for b in bars:                         # reparto uniforme entre L y H
        i0 = int((b["low"]  - lo) / w); i1 = int((b["high"] - lo) / w)
        i0 = max(0, i0); i1 = min(bins-1, i1)
        share = b["volume"] / (i1 - i0 + 1)
        for i in range(i0, i1+1): vol[i] += share
    poc = max(range(bins), key=lambda i: vol[i])
    # expandir alrededor del POC hasta el 70%
    lo_i = hi_i = poc; acc = vol[poc]; target = 0.7*sum(vol)
    while acc < target:
        up   = vol[hi_i+1] if hi_i+1 < bins else -1
        down = vol[lo_i-1] if lo_i-1 >= 0   else -1
        if up >= down and hi_i+1 < bins: hi_i += 1; acc += up
        elif lo_i-1 >= 0:                lo_i -= 1; acc += down
        else: break
    return {"poc": lo + (poc+0.5)*w, "val": lo + lo_i*w, "vah": lo + (hi_i+1)*w}
```

**Cómo leerlo.** El **POC** es un imán (el mercado vuelve a él). Fuera de la Value Area el precio
suele o volver (reversión) o acelerar (ruptura). Necesita volumen → acciones/cripto/futuros.

---

## 4. Arbitraje estadístico / pares (cointegración + z-score)

**Qué es.** Dos activos que históricamente se mueven juntos. Cuando el hueco entre ellos se estira
demasiado, apuestas a que **vuelve a cerrarse**.

**Pasos replicables.**
1. Elige dos activos relacionados (KO/PEP, oro/plata, BP/Shell…).
2. **Ratio de cobertura β** por regresión por mínimos cuadrados: `PrecioA = α + β·PrecioB`.
   ```
   β = Cov(A, B) / Var(B)
   ```
3. **Spread** `= PrecioA − β·PrecioB` (lo que "sobra/falta" de A respecto a B).
4. Normaliza a **z-score** con media y desviación móviles (ventana p. ej. 20–60):
   ```
   z = (spread − media_móvil) / desviación_móvil
   ```
5. **Reglas:** entra corto A / largo B si `z > +2`; largo A / corto B si `z < −2`; **cierra** al
   volver a `z ≈ 0`. (Tamaño de B = β× el de A → posición *market-neutral*).
6. **Rigor (recomendado):** test de cointegración (ADF) sobre el spread; solo operas si el spread
   es "estacionario" (revierte). Si dejan de estar cointegrados → **stop** (ruptura estructural).

**Ejemplo con números.** `β=0.8`. Hoy `A=52`, `B=60` → spread `= 52 − 0.8·60 = 4`. Media móvil del
spread `= 2`, desviación `= 1` → `z = (4−2)/1 = +2` → señal: **corto A, largo B** esperando que el
spread baje hacia 2.

**Pseudocódigo** (z-score con serie ya alineada).
```python
def pair_zscore(A, B, win=40):
    beta = cov(A, B) / var(B)
    spread = [a - beta*b for a, b in zip(A, B)]
    m = mean(spread[-win:]); s = std(spread[-win:])
    return (spread[-1] - m) / s          # >+2 corto A/largo B ; <−2 al revés
```

**Riesgo.** Toda la estrategia depende de que la relación **siga viva**. Si una empresa cambia de
fundamentales, el spread puede no volver nunca → siempre con stop.

---

## 5. Paridad de riesgo (risk parity)

**Qué es.** Repartir la cartera para que **cada activo aporte el mismo riesgo**, no el mismo dinero.
Así un activo muy volátil no domina el resultado.

**Versión simple (inverse-vol) — replicable en 2 pasos.**
1. Volatilidad de cada activo `σ_i` (desviación típica de sus retornos; anualiza con `×√252` si son diarios).
2. Peso:
   ```
   w_i = (1/σ_i) / Σ_j (1/σ_j)
   ```

**Ejemplo con números.** Acción `σ=20 %`, bono `σ=5 %`.
```
1/0.20 = 5 ;  1/0.05 = 20 ;  suma = 25
w_acción = 5/25 = 20 % ;  w_bono = 20/25 = 80 %
```
La cartera pone 4× más dinero en el bono para que **ambos aporten riesgo parecido**.

**Versión completa (ERC, igual contribución al riesgo).** Usa la matriz de covarianzas y se resuelve
iterativamente hasta que la contribución de cada activo `RC_i = w_i·(Σw)_i / σ_cartera` sea igual
para todos. La versión inverse-vol de arriba es su aproximación cuando ignoras las correlaciones.

**Pseudocódigo (inverse-vol).**
```python
def risk_parity(returns_by_asset):        # dict activo -> lista de retornos
    inv = {a: 1/std(r) for a, r in returns_by_asset.items()}
    tot = sum(inv.values())
    return {a: v/tot for a, v in inv.items()}     # pesos que suman 1
```

---

## 6. Construcción de posiciones (cómo se ejecuta sin mover el precio)

Aquí no hay "señal": es **ejecución**. Cómo repartir una orden enorme. Todo esto es replicable.

### 6.1 Algoritmo VWAP (seguir el perfil de volumen)
1. Consigue el **perfil de volumen histórico** por franja (p. ej. % del volumen diario en cada
   tramo de 30 min — típicamente forma de "U": mucho en apertura y cierre).
2. Reparte tu orden total según ese perfil: `hija_tramo = orden_total × %volumen_tramo`.
3. En cada tramo, ejecuta esa cantidad.
```
Ej.: orden 100 000 acciones. Si el tramo 09:30–10:00 mueve el 12% del volumen del día
     → orden hija ≈ 12 000 acciones en ese tramo.
```

### 6.2 Algoritmo POV (Percentage of Volume)
En cada intervalo, tu orden hija = **participación × volumen observado** en ese intervalo.
```
hija = POV% × volumen_del_intervalo         (p. ej. POV=10%)
```
Si el mercado se mueve mucho (mucho volumen), compras más; si está parado, menos → te "escondes"
en el flujo.

### 6.3 Iceberg (mostrar solo la punta)
```
mostrar en el libro:  display_size  (p. ej. 500)
oculto:               resto
cuando se ejecuta la punta → repón otra punta del oculto hasta agotarlo
```
Nadie ve el tamaño real → no te pueden hacer *front-running*.

### 6.4 Anti-detección (jitter)
No repartas en cantidades y tiempos regulares (eso se detecta). Aleatoriza:
```
hija_real   = hija_teórica × (1 + rand(−0.15, +0.15))     # tamaño ±15%
espera       = intervalo_base × (1 + rand(−0.20, +0.20))   # tiempo ±20%
```

### 6.5 Campaña (acumulación/distribución multi-día)
Cuando la posición no cabe ni en un día, se construye en un **rango** durante días/semanas
(lógica Wyckoff): comprar en la parte baja del rango sin romperlo al alza (para no delatar la
demanda). La salida es la misma idea al revés (distribución).

### 6.6 Tu precio medio de ejecución
Para saber si lo hiciste bien, compara tu VWAP propio con el VWAP del mercado del periodo:
```
mi_precio_medio = Σ(precio_fill × cantidad_fill) / Σ(cantidad_fill)
¿mi_precio_medio ≤ VWAP_mercado?  → buena ejecución (si comprabas)
```

**La lógica que SÍ puedes aplicar tú** (aunque no tengas sus algoritmos):
entra **por tramos**, usa **órdenes límite** en vez de a mercado, evita mover activos **ilíquidos**,
y ten el **plan de salida antes de entrar**.

---

## Dónde encajaría en este proyecto (si se implementa la detección)

| Método | Datos (ya disponibles) | Nuevo código |
|---|---|---|
| VWAP / anclado | `get_ohlc_history` (con V) | `vwap()` puro + capa en el escáner |
| GEX | `/options/chain` (OI) + `options_math` (Γ) | `gex()` + endpoint `/education/gex/{symbol}` |
| Volume Profile | `get_ohlc_history` (con V) | `volume_profile()` + overlay |
| Stat-arb / pares | 2× `get_ohlc_history` | `pair_zscore()` + calculadora |
| Risk parity | retornos de una cesta | `risk_parity()` + calculadora |

Todo se haría igual que `backend/price_action.py`: **funciones puras + tests unitarios offline +
un endpoint**, sin tocar el resto. Requiere el backend vivo (billing/Neon) para correr con datos reales.

---

*Documento de referencia interna. Datos informativos; no es asesoramiento de inversión.*
