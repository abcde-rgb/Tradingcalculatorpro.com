# BRIEF — Suite de 6 escáneres de mercado
### TradingCalculator.Pro · Documento de especificación para Claude Code
**Versión 1.0 — 4 de septiembre de 2026**

---

## 0. Cómo usar este documento

Guárdalo en el repo como `docs/BRIEF-ESCANERES.md` y en Claude Code arranca con:

> Lee `docs/BRIEF-ESCANERES.md` completo antes de escribir una sola línea. Implementa la **Fase 1** de la sección 10. No inventes detectores que no estén en la sección 4. No inventes fuentes de datos que no estén en la sección 5.

Las secciones 1, 4, 5 y 9 son **restricciones**, no sugerencias. El resto es diseño.

---

## 1. Reglas no negociables

Estas cinco reglas existen porque el proyecto es pre-lanzamiento, el público es profesional y tú eres residente fiscal suizo operando bajo marco europeo. Romper cualquiera de ellas convierte un producto defendible en un problema.

### R1 — Ningún dato fabricado, nunca

Ya hay un precedente en el repo: el *fallback* de cadena sintética en `options_math.py` genera `Volume` y `OI` con `random.randint()` y el frontend los pinta igual que los reales. **Eso no se replica en los escáneres.** Todo valor mostrado lleva procedencia:

```ts
type Provenance = 'live' | 'delayed' | 'derived' | 'estimated' | 'unavailable'
```

Si un detector no tiene el dato que necesita, muestra `unavailable` y explica qué falta. Nunca rellena.

### R2 — "Volumen oculto" significa cosas distintas según el mercado

Esta es la corrección más importante de tu petición original. No existe un botón que muestre "las compras ocultas". Existen tres cosas distintas:

| Lo que se pide | Lo que realmente hay | Dónde es posible |
|---|---|---|
| Órdenes iceberg | **Inferencia** por *refill* repetido en un nivel del libro | Cripto (L2 gratis), acciones solo con feed MBO de pago |
| Dark pools | **Dato real, agregado y con retardo** (FINRA ATS, semanal) | Acciones US, gratis |
| "Compras institucionales" | 13F trimestral, Form 4 de insiders, COT semanal | US, gratis, con retardo estructural |

El escáner puede decir *"este nivel se ha repuesto 14 veces absorbiendo 6,3× el tamaño visible"*. No puede decir *"un institucional está comprando"*. La primera frase es un hecho medible; la segunda es una interpretación que además te expone regulatoriamente (§9).

### R3 — Separar detección de interpretación

Cada detector emite un **hecho medido** (`percentil 98 de desequilibrio de flujo`) y, aparte y opcional, una **lectura** (`sesgo comprador`). El usuario filtra hechos. La interpretación va etiquetada como tal y con su veredicto de evidencia. Esto encaja con la escala de cuatro veredictos que ya tienes en `lib/reference/`.

### R4 — Multiplicidad estadística

Seis escáneres × ~35 detectores × 200 activos × 5 marcos temporales = **210.000 pruebas simultáneas**. Con α=0,05, ~10.500 alertas serán ruido puro *por construcción*. Sin control de tasa de falsos descubrimientos (Benjamini-Hochberg) el escáner es un generador de casualidades con buena tipografía. Ver §8. Esto es obligatorio, no opcional.

### R5 — No es una recomendación de inversión

Detalle en §9. Resumen: *"OFI en percentil 98"* es un dato. *"Señal de compra"*, *"objetivo 45.200"*, *"probabilidad de subida 73%"* son recomendaciones de inversión bajo el Reglamento (UE) 596/2014 y activan obligaciones que hoy no puedes cumplir.

---

## 2. Arquitectura

### 2.1 Qué construir exactamente

Tu petición decía "6 ejemplares en HTML". Se hace en dos pasos, porque prefieres soluciones integradas y el repo ya es React 19 + CRACO:

**Paso 1 — 6 prototipos HTML autocontenidos.** Un `.html` por escáner, sin build, sin tocar el repo, cada uno con datos reales en vivo de Binance (que no necesita clave). Sirven para validar visualmente y para medir rendimiento antes de comprometer arquitectura. Se tiran a la basura sin coste.

**Paso 2 — Integración.** Los detectores que sobrevivan pasan a `lib/scanners/` como módulos puros y las vistas a rutas React. Nada de seis micro-aplicaciones conviviendo.

### 2.2 Diagrama de flujo

```
┌─────────────── FUENTES ───────────────┐
│ WS Binance (L2 + trades + liq + OI)   │  tiempo real, sin clave
│ Twelve Data (acciones/FX/futuros)     │  plan con display rights
│ FINRA / CFTC / SEC EDGAR              │  institucional, gratis, con retardo
└───────────────────┬───────────────────┘
                    ▼
        ┌───────────────────────┐
        │  NORMALIZADOR         │  Tick | Book | Bar | Positioning
        │  (contratos §3.1)     │  + Provenance obligatorio
        └───────────┬───────────┘
                    ▼
   ┌────────────────────────────────────┐
   │  WEB WORKERS — 1 por escáner       │
   │  ring buffers Float64Array         │
   │  sin objetos por tick              │
   └────────────────┬───────────────────┘
                    ▼
        ┌───────────────────────┐
        │  MOTOR DE DETECTORES  │  fn pura: (estado, ventana) → Signal[]
        │  registro declarativo │  + normalización a score 0-100
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │  CAPA ESTADÍSTICA     │  percentiles rolling, BH-FDR, deflación
        └───────────┬───────────┘
                    ▼
   ┌────────────────────────────────────┐
   │  UI  ·  6 vistas + panel confluencia│
   │  filtros del usuario, no del sistema│
   └────────────────────────────────────┘
```

### 2.3 Regla de rendimiento

El libro de órdenes de Binance emite hasta 100 actualizaciones/segundo por símbolo. Con 20 símbolos son 2.000 eventos/s. **React no puede re-renderizar a ese ritmo.**

- Todo el cálculo vive en Web Workers, nunca en el hilo principal.
- El worker envía **agregados** cada 100–250 ms, no ticks.
- Los gráficos se actualizan por API imperativa (`series.update()`), fuera del ciclo de render de React.
- Buffers circulares con `Float64Array`. Cero asignación de objetos en el camino caliente.
- Objetivo medible: **< 16 ms por frame con 20 símbolos activos**. Si no se cumple, se reduce el número de símbolos, no la calidad del cálculo.

---

## 3. Contratos de datos

Definir estos cuatro tipos **antes** que cualquier detector. Todo detector consume solo estos.

```ts
// 3.1 — Contratos canónicos

interface Tick {
  ts: number            // epoch ms
  price: number
  size: number
  side: 'buy' | 'sell' | 'unknown'   // 'unknown' si no hay flag de agresor
  sideMethod: 'exchange' | 'lee-ready' | 'tick-rule' | 'bvc'
  isBlock: boolean      // size > percentil 99 rolling
}

interface BookSnapshot {
  ts: number
  bids: Float64Array    // [precio0, size0, precio1, size1, ...]
  asks: Float64Array
  seq: number           // para detectar huecos de secuencia
}

interface Bar {
  ts: number; open: number; high: number; low: number; close: number
  volume: number
  buyVolume: number; sellVolume: number   // NaN si no se puede clasificar
  trades: number
  vwap: number
}

interface Positioning {         // derivados, con retardo variable
  openInterest?: number
  fundingRate?: number
  liquidations?: { long: number; short: number }
  cotNetPct?: number            // CFTC, semanal
  darkPoolRatio?: number        // FINRA ATS, semanal
  asOf: number                  // OBLIGATORIO: momento real del dato
}

interface Signal {
  id: string
  scanner: 1|2|3|4|5|6
  symbol: string
  timeframe: string
  ts: number
  score: number                 // 0-100, normalizado por percentil rolling
  direction: 'up' | 'down' | 'neutral'
  measurement: { name: string; value: number; unit: string; percentile: number }
  evidence: {
    verdict: 'Sólido' | 'Mixto' | 'Sin base' | 'Refutado'
    refs: string[]              // claves de la bibliografía §12
  }
  provenance: Provenance
  pValue?: number
  qValue?: number               // tras corrección BH-FDR
  explain: string               // una frase, en español, sin jerga
}
```

**El campo `evidence.verdict` no es decorativo.** Es lo que diferencia esta suite de las 40.000 herramientas de "smart money" que hay en internet, y es coherente con la capa de referencia que ya construiste.

---

## 4. Los 6 escáneres y su catálogo de detectores

Leyenda de veredicto: **S** = Sólido (literatura revisada por pares, replicado) · **M** = Mixto (evidencia parcial o disputada) · **SB** = Sin base (usado en la industria, sin validación publicada) · **R** = Refutado.

---

### E1 · ORDER FLOW — Microestructura ejecutada

*Qué mide: la agresividad y el desequilibrio del flujo que realmente se ejecuta.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 1.1 | **OFI** (Order Flow Imbalance) | `e_n` por evento de libro; regresión `Δmid = β·OFI + ε`. Es el detector con mejor relación evidencia/coste de toda la suite | Book L2 | **S** | [CKS2014] |
| 1.2 | **Queue Imbalance** | `I = (V_bid − V_ask)/(V_bid + V_ask)`, relación no lineal con el siguiente movimiento; ajuste probit | Book L1 | **S** | [GB2016] |
| 1.3 | **CVD** (delta acumulado) | `Σ(vol_buy − vol_sell)` con agresor del exchange | Ticks | **M** | [CPS2015] |
| 1.4 | **Divergencia CVD/precio** | precio hace máximo, CVD no. Correlación rolling < 0 sobre N barras | Ticks + Bars | **SB** | — |
| 1.5 | **VPIN** | Buckets de volumen fijo, clasificación BVC con t-Student, `VPIN = Σ\|V_b − V_s\| / (n·V)` | Ticks | **M** | [ELO2012], [AB2014] |
| 1.6 | **Kyle's λ** | Regresión de `ΔP` sobre volumen neto firmado. Mide impacto por unidad de flujo | Ticks | **S** | [Kyle1985] |
| 1.7 | **Iliquidez de Amihud** | `\|r\| / volumen_en_divisa` promediado | Bars | **S** | [Amihud2002] |
| 1.8 | **Absorción** | Volumen agresor en percentil >95 con rango de precio en percentil <20. Alguien está absorbiendo | Ticks + Bars | **M** | [FS2009] |
| 1.9 | **Barrido (sweep)** | ≥3 niveles consumidos en <50 ms por el mismo agresor | Ticks + Book | **M** | — |
| 1.10 | **Prints en bloque** | Tamaño > percentil 99 rolling de 30 días | Ticks | **S** | — |
| 1.11 | **Intensidad de Hawkes** | Proceso autoexcitado sobre llegadas de trades; detecta racimos de actividad antes de que aparezcan en el precio | Ticks | **S** | [BMM2015] |
| 1.12 | **Ratio taker buy/sell** | Volumen taker comprador / total, con percentil | Ticks | **M** | — |

> **Aviso sobre VPIN.** Es el detector más citado y también el más disputado de la lista. Andersen y Bondarenko demostraron que no anticipó el *flash crash* de 2010 y que su poder predictivo desaparece controlando por volatilidad; Easley, López de Prado y O'Hara respondieron. **La disputa sigue abierta.** Inclúyelo, márcalo Mixto, y enlaza las dos posturas en la ficha. Un producto que muestra las dos caras vale más que uno que vende certeza.

---

### E2 · LIQUIDEZ OCULTA — Icebergs, dark pools, absorción persistente

*El escáner que pediste como "ventas ocultas". Aquí está lo que realmente se puede medir.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 2.1 | **Refill de iceberg** | Nivel consumido que reaparece con tamaño similar en <500 ms. Cuenta de refills y ratio `ejecutado/mostrado` | Book L2 con `seq` | **S** | [FS2009], [PP2004] |
| 2.2 | **Ejecutado > visible** | Trade con volumen mayor que el tamaño publicado en ese nivel ⇒ había liquidez no mostrada | Ticks + Book | **S** | [Hautsch2012] |
| 2.3 | **Nivel persistente** | Precio que absorbe ≥N× su tamaño visible acumulado sin ceder | Book L2 | **M** | [FS2009] |
| 2.4 | **Ratio cancelación/ejecución** | Órdenes grandes que aparecen y se cancelan sin ejecutar. Alto = capas artificiales | Book L2 | **M** | — |
| 2.5 | **Ratio dark pool** | Volumen ATS / volumen consolidado, percentil de 52 semanas | FINRA OTC Transparency | **S** | [FINRA] |
| 2.6 | **Volumen en corto diario** | Short volume / total volume por valor | FINRA daily short files | **S** | [FINRA] |
| 2.7 | **Desviación de posicionamiento institucional** | Δ13F trimestral vs. media histórica del valor | SEC EDGAR | **M** | [SEC] |
| 2.8 | **Compras de insiders** | Form 4, agrupación de compras de directivos en ventana de 30 días | SEC EDGAR | **S** | [Lakonishok2001] |

> **Límite honesto que debe aparecer en la UI.** En cripto los exchanges no publican un flag de iceberg: 2.1–2.3 son **inferencias**, y hay falsos positivos legítimos (varios participantes reponiendo en el mismo nivel, algoritmos de market making). En acciones US, detectar icebergs de verdad exige feed MBO (Databento ~cientos de €/mes). El escáner debe decirlo en la ficha del detector, no en un pie de página gris.

---

### E3 · ESTRUCTURA DE VOLUMEN — Teoría de subasta

*Dónde se ha construido el valor. Es el escáner con mejor pedigrí institucional: el Market Profile es documentación oficial de CME.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 3.1 | **Volume Profile** | Histograma de volumen por precio. POC, VAH, VAL (70% del volumen) | Ticks o Bars | **S** | [CME-MP] |
| 3.2 | **TPO / Market Profile** | Time Price Opportunity por periodo de 30 min | Bars | **S** | [CME-MP] |
| 3.3 | **HVN / LVN** | Nodos de alto y bajo volumen por detección de picos en el perfil | Perfil | **S** | [CME-MP] |
| 3.4 | **POC virgen** | POC de sesión previa nunca revisitado | Perfil histórico | **M** | — |
| 3.5 | **Single prints / colas** | Precios con TPO único ⇒ rechazo | TPO | **M** | [CME-MP] |
| 3.6 | **Huecos de volumen** | Zonas de volumen ≈0 en el perfil compuesto | Perfil | **M** | — |
| 3.7 | **VWAP + bandas σ** | VWAP de sesión con ±1σ y ±2σ ponderadas por volumen | Ticks | **S** | — |
| 3.8 | **VWAP anclado** | VWAP desde evento (máximo, mínimo, publicación de resultados) | Ticks | **M** | — |
| 3.9 | **Perfil compuesto** | Agregación de N sesiones para estructura de rango amplio | Perfiles | **S** | [CME-MP] |
| 3.10 | **Desequilibrio de footprint** | Bid×Ask por nivel, ratio diagonal >300% | Ticks con agresor | **M** | — |

---

### E4 · VOLATILIDAD Y RÉGIMEN

*El escáner que decide si los demás sirven ahora mismo. Un detector de reversión en régimen tendencial es un generador de pérdidas.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 4.1 | **Exponente de Hurst (DFA)** | H>0,5 persistente · H≈0,5 aleatorio · H<0,5 reversión. Ventana rolling | Bars | **M** | [DFA] |
| 4.2 | **Volatilidad realizada multiescala** | RV a 5m/1h/1d, ratios entre escalas | Bars | **S** | — |
| 4.3 | **GARCH(1,1)** | Volatilidad condicional y su pronóstico a 1 paso | Bars | **S** | [Bollerslev1986] |
| 4.4 | **Compresión de rango** | Percentil del ATR(14) y del ancho de Bollinger sobre 252 periodos | Bars | **M** | — |
| 4.5 | **Punto de cambio (CUSUM / PELT)** | Detección de ruptura estructural en media o varianza | Bars | **S** | [Killick2012] |
| 4.6 | **HMM de 3 estados** | Alcista / rango / bajista, con probabilidad de estado | Bars | **M** | [Hamilton1989] |
| 4.7 | **Entropía de permutación** | Grado de aleatoriedad de la serie; baja = estructura explotable | Bars | **M** | [BP2002] |
| 4.8 | **Estructura temporal de vol** | Cripto: base perp vs. trimestral. Acciones: VIX/VIX3M | Positioning | **S** | — |
| 4.9 | **Autocorrelación de \|r\|** | Agrupamiento de volatilidad, hecho estilizado universal | Bars | **S** | [Cont2001] |

---

### E5 · POSICIONAMIENTO EN DERIVADOS

*Lo más cercano a "ver a los institucionales" que existe con datos públicos.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 5.1 | **OI × precio (4 cuadrantes)** | ↑P↑OI nuevas largas · ↑P↓OI cierre de cortos · ↓P↑OI nuevas cortas · ↓P↓OI liquidación de largas | Positioning | **S** | — |
| 5.2 | **Extremos de funding** | Percentil del funding sobre 90 días; funding acumulado | Binance/Bybit | **M** | — |
| 5.3 | **Base spot–perp** | `(perp − spot)/spot`, contango/backwardation | Binance | **S** | — |
| 5.4 | **Racimos de liquidación** | Stream `!forceOrder@arr`, agregación por precio y ventana | Binance WS | **M** | — |
| 5.5 | **Ratio cuentas largas/cortas** | Endpoint público de datos de futuros de Binance | Binance | **M** | — |
| 5.6 | **Índice COT** | Neto de comerciales normalizado a percentil de 3 años | CFTC Socrata API | **M** | [CFTC] |
| 5.7 | **GEX / exposición gamma** | `Σ(OI × gamma × 100 × S² × 0,01)` con convención de signo por tipo | Cadena de opciones | **M** | [SqueezeMetrics] |
| 5.8 | **Gamma flip / muros** | Strike donde GEX cambia de signo; call wall y put wall | Cadena | **M** | [SqueezeMetrics] |
| 5.9 | **Put/Call ratio** | Volumen y OI, con percentil histórico | Cadena | **M** | — |
| 5.10 | **Skew 25-delta** | IV(put 25Δ) − IV(call 25Δ) | Cadena | **S** | — |
| 5.11 | **Max pain** | Strike que minimiza el pago total a los tenedores | Cadena | **SB** | — |

> **Aviso sobre GEX.** El signo del dealer no es observable. Toda la industria (SqueezeMetrics, SpotGamma) usa la convención heurística *"dealers largos en calls, cortos en puts"*. Es una suposición, no un dato. Márcala como `estimated` en `Provenance` y explica la convención en la ficha. Un profesional que vea que lo declaras te creerá el resto.

---

### E6 · PATRONES ESTADÍSTICOS

*Patrones sí, pero con N, intervalo de confianza y valor p. Es donde tu producto se separa del resto.*

| # | Detector | Cálculo | Datos | Ver. | Ref. |
|---|---|---|---|---|---|
| 6.1 | **Matrix Profile (motifs)** | Distancia euclídea z-normalizada entre subsecuencias. Encuentra repeticiones sin decirle qué buscar | Bars | **S** | [MP-UCR] |
| 6.2 | **Matrix Profile (discords)** | La subsecuencia más distinta de todas = anomalía objetiva | Bars | **S** | [MP-UCR] |
| 6.3 | **Análogos históricos k-NN/DTW** | Los k tramos más parecidos del histórico → **distribución** de resultados posteriores, nunca un número | Bars | **M** | — |
| 6.4 | **Velas con estadística** | Por patrón, activo y marco: N, retorno medio a k velas, IC bootstrap 95%, p | Bars | **M** | — |
| 6.5 | **Niveles por clustering** | KDE sobre extremos locales en vez de líneas a ojo | Bars | **M** | — |
| 6.6 | **Agrupamiento en números redondos** | Concentración de órdenes y stops en niveles psicológicos — con respaldo empírico real | Book/Bars | **S** | [Osler2003] |
| 6.7 | **Anomalía z robusta** | z basado en MAD sobre volumen, rango y hueco | Bars | **S** | — |
| 6.8 | **Ruptura de correlación** | Correlación rolling con el índice de referencia y su ruptura | Bars | **S** | — |
| 6.9 | **Cointegración** | Engle-Granger / Johansen para pares; z-score del spread | Bars | **S** | — |
| 6.10 | **Divergencia validada** | Divergencia precio/momento con test de significación, no visual | Bars | **M** | — |

> **Sobre "order blocks" y Smart Money Concepts.** Los busqué específicamente en literatura revisada por pares. **No existe.** Todo lo que hay son blogs, cursos y scripts de TradingView. Eso no significa que la idea subyacente sea falsa: significa que nadie la ha validado públicamente con método. Lo que **sí** tiene respaldo académico es el fenómeno del que los order blocks son una versión folclórica: **agrupamiento de stops en niveles redondos** (Osler, Federal Reserve Bank of New York, Staff Report 150) y **cascadas de precio por ejecución en cadena de stops**. Mi recomendación: implementa 6.6 con el nombre correcto y su cita, e incluye una ficha de referencia que explique la relación con los "order blocks" marcada como **Sin base**. Es más honesto, más útil y te diferencia de la competencia en vez de imitarla.

---

## 5. Fuentes de datos

### 5.1 Cripto — tiempo real, gratis, sin clave (el cimiento)

Binance publica endpoints exclusivos de datos de mercado **sin autenticación**:

| Recurso | Endpoint |
|---|---|
| REST | `https://data-api.binance.vision` |
| WebSocket | `wss://data-stream.binance.vision` |
| Streams útiles | `@aggTrade` · `@depth@100ms` · `@kline_1m` · `@bookTicker` · `!forceOrder@arr` (liquidaciones) |
| Open interest | `/futures/data/openInterestHist` |
| Long/short ratio | `/futures/data/globalLongShortAccountRatio` |

Sin clave, sin coste, con flag de agresor real en `aggTrade` (`m: true/false`). **Esto es lo que hace viable el nivel gratuito.** Los seis escáneres funcionan al 100% en cripto sin pagar nada.

⚠️ Verifica los Términos de Uso de la API de Binance antes de lanzar: el uso comercial de sus datos de mercado está permitido en general, pero la redistribución masiva puede requerir acuerdo. Para un escáner de visualización estás dentro; guarda una copia fechada de los términos.

Alternativas equivalentes para redundancia: **Bybit**, **OKX**, **Coinbase Exchange**, **Kraken**. Todas con WebSocket público. Implementa la capa de fuentes como adaptadores intercambiables desde el día 1.

### 5.2 Acciones, forex y futuros

| Proveedor | Qué aporta | Coste | Derechos |
|---|---|---|---|
| **Twelve Data** (plan Venture) | Acciones, FX, futuros, WebSocket | €€ | **Con display rights** — ya lo identificaste como la opción viable |
| **Databento** | MBO real (único camino a icebergs de verdad en acciones) | €€€ | Por feed |
| **Alpha Vantage** | Reducido a 25 llamadas/día | Gratis | Inservible para escáner |
| **Massive** (ex-Polygon.io) | Buen histórico | €€ | Verificar display |
| **EODHD** | Fin de día + intradía barato | € | Verificar display |

### 5.3 Institucional gratuito — el diferenciador barato

Esto es lo que casi nadie integra y **cuesta cero**:

| Fuente | Contenido | Frecuencia | Acceso |
|---|---|---|---|
| **FINRA OTC Transparency** | Volumen ATS (dark pool) por valor y por operador | Semanal | Descarga + API, gratis |
| **FINRA Short Sale Volume** | Volumen en corto diario por valor | Diaria | Ficheros gratis |
| **CFTC Commitments of Traders** | Posiciones de comerciales / no comerciales | Semanal (viernes) | API Socrata en `publicreporting.cftc.gov`, gratis |
| **SEC EDGAR** | 13F (posiciones institucionales), Form 4 (insiders) | Trimestral / continua | `data.sec.gov`, gratis — exige cabecera `User-Agent` con contacto |
| **CME Group** | Volumen y open interest oficiales, guías de Market Profile | Diaria | Gratis |

Regla de oro: cada uno de estos lleva su `asOf` visible. Un dato de dark pool de hace 6 días mostrado sin fecha es engañoso; mostrado con fecha es información institucional que casi ningún competidor ofrece.

---

## 6. Librerías

### 6.1 Gráficos — todas verificadas para uso comercial

| Librería | Licencia | Uso recomendado | Nota |
|---|---|---|---|
| **Lightweight Charts** (TradingView) | Apache-2.0 | Velas, líneas, el chart principal | ⚠️ **Exige atribución**: aviso del fichero NOTICE + enlace a tradingview.com. Trae la opción `attributionLogo`. Actívala y olvídate. |
| **KLineChart** | Apache-2.0 | Footprint, overlays exóticos | Cero dependencias, ~40 KB gzip, muy personalizable |
| **uPlot** | MIT | Series enormes, mapas de calor de libro | ~45 KB, el más rápido para millones de puntos |
| **Apache ECharts** | Apache-2.0 | Mapas de calor, treemaps, perfiles | Pesa más; carga diferida |
| **Plotly.js** | MIT | Superficie 3D de volatilidad implícita | Ya está en tu stack; mantener `gl3d` diferido |
| **D3** | ISC | Perfil de volumen, TPO a medida | Solo si lo estándar no llega |

**Evitar:** Highcharts y AnyChart (licencia comercial de pago). **Prohibido:** cualquier librería GPL/AGPL — obligaría a abrir tu código.

### 6.2 Cálculo

| Librería | Licencia | Para qué |
|---|---|---|
| `simple-statistics` | ISC | Regresión, percentiles, correlación |
| `arquero` | BSD-3 | Transformación tabular en memoria |
| `DuckDB-WASM` | MIT | SQL analítico sobre perfiles grandes en el navegador |
| `Comlink` | Apache-2.0 | Interfaz limpia con Web Workers |
| `apache-arrow` | Apache-2.0 | Cero-copia entre worker y UI |

**En servidor (FastAPI, ya lo tienes):** `numpy`, `scipy`, `statsmodels` (GARCH, cointegración, Johansen), `stumpy` (Matrix Profile), `ruptures` (puntos de cambio), `hmmlearn`, `arch`. Todo BSD/MIT.

**Reparto:** lo que es O(n) por tick va en el navegador. Lo que es O(n²) o requiere ajuste de modelos va en FastAPI y se cachea. Matrix Profile y GARCH no se calculan en el navegador; se calculan cada N minutos en servidor y se sirven.

---

## 7. La capa de IA — qué sí y qué no

Pediste "un modelo de IA con todas las herramientas disponibles". Aquí está la respuesta útil, que no es la que esperas.

### Lo que NO va a funcionar

Un modelo que prediga el precio. No porque falte potencia de cálculo, sino porque el problema tiene una **relación señal/ruido de ~0,01–0,05** en horizontes cortos. Todos los fondos cuantitativos del mundo compiten por esa señal con datos que tú no puedes comprar. Prometer predicción de precio en la web es la forma más rápida de perder credibilidad ante el público profesional que has elegido — y, además, entra de lleno en la definición de recomendación de inversión (§9).

Los modelos fundacionales de series temporales que existen hoy (**TimesFM** de Google, **Chronos** de Amazon, **Moirai**, **Lag-Llama**) están entrenados sobre series con estructura estable: demanda eléctrica, tráfico, ventas. En retornos financieros su ventaja sobre una caminata aleatoria es marginal y no persistente fuera de muestra. Puedes probarlos, pero no los pongas en el escáner como predictores.

### Lo que SÍ funciona y sí es defendible

| Tarea | Modelo | Dónde | Por qué es defendible |
|---|---|---|---|
| **Clasificación de régimen** | HMM 3 estados / gradient boosting | Servidor | Describe el estado actual, no el futuro |
| **Detección de anomalías** | Matrix Profile + Isolation Forest | Servidor | "Esto es raro" es verificable a posteriori |
| **Ranking de similitud** | k-NN sobre DTW | Servidor | Devuelve **distribución** histórica, no punto |
| **Puntuación de confluencia** | Regresión logística **calibrada** (Platt/isotónica) | Servidor | Con calibración, "65%" significa que acierta 65 de cada 100 veces. Sin calibrar, es un número inventado |
| **Explicación en lenguaje natural** | LLM sobre los hechos ya medidos | Servidor | Traduce números a español. Nunca genera los números |
| **Búsqueda semántica en fichas** | `transformers.js` + embeddings pequeños | Navegador | Uso real y ligero de IA en cliente |

**Regla de oro para el LLM:** recibe el objeto `Signal[]` ya calculado y solo lo redacta. Si el LLM puede inventarse un número, el diseño está mal.

Para inferencia en navegador (solo modelos pequeños): **ONNX Runtime Web** con backend WebGPU, o **transformers.js**. Todo modelo grande vive en FastAPI.

---

## 8. Validación estadística — obligatoria

Sin esta sección, la suite es un generador de casualidades.

1. **Corrección BH-FDR.** Sobre todas las alertas emitidas en la misma ventana. Mostrar `q-value`, no solo `p-value`. Un `q < 0,10` es publicable; un `p < 0,05` entre 200.000 pruebas no significa nada.
2. **Ratio de Sharpe deflactado.** Cualquier detector que se presente como accionable pasa por el DSR de Bailey y López de Prado, que corrige por sesgo de selección, número de pruebas y no normalidad. Si no supera, se marca informativo y no accionable.
3. **Validación cruzada purgada con embargo.** Nunca *k-fold* aleatorio en series temporales: filtra información del futuro. Purga + embargo entre pliegues.
4. **Ficha de rendimiento por detector.** Cada detector muestra: N de disparos históricos, tasa de acierto, retorno medio posterior con IC bootstrap, y **fecha desde la que se mide**. Un detector sin ficha no entra en producción.
5. **Registro de decisiones.** Toda alerta emitida se guarda con su resultado a 1/5/20 barras. A los tres meses tendrás el dato real de cada detector, y podrás retirar los que no funcionan. Esto es lo que ninguna herramienta comercial hace y es tu foso defensivo.

---

## 9. Cumplimiento — MAR, CNMV, MiFID II

Ya tienes MiFID II como restricción activa en el proyecto. Los escáneres la tensan más que ninguna otra sección de la web.

La **guía de la CNMV para finfluencers** define recomendación de inversión como *"toda información destinada a canales de distribución o al público en la que se sugiera una estrategia de inversión"* respecto a instrumentos financieros. Incluye explícitamente opiniones sobre precios presentes **o futuros**, incluso en lenguaje no técnico. Quien emite una recomendación queda obligado a: identificar autor y cargo, fecha y hora, separar hechos de opiniones, declarar conflictos de interés de forma clara y visible, indicar horizonte temporal y advertencias de riesgo, y —si es profesional— publicar metodología y frecuencia de actualización.

Con tus programas de afiliados de brokers activos, **el conflicto de interés existe y debe declararse.** Eso ya lo tenías identificado; los escáneres lo hacen más visible.

### Traducción a reglas de código

| ❌ Prohibido en la UI | ✅ Equivalente permitido |
|---|---|
| "Señal de COMPRA" | "Desequilibrio de flujo comprador, percentil 98" |
| "Objetivo 45.200" | "POC de la sesión anterior: 45.200" |
| "73% de probabilidad de subida" | "En 412 casos análogos desde 2019, 301 cerraron al alza a 5 barras (IC 95%: 68–78%)" |
| "Entrada / SL / TP" | "Zonas de alto volumen histórico" |
| "El institucional está comprando" | "Nivel repuesto 14 veces absorbiendo 6,3× el tamaño visible" |

**Implementación concreta:** un test automatizado que falle el build si aparecen en componentes de UI las cadenas `comprar`, `vender`, `señal de`, `objetivo`, `entrada`, `stop loss`, `take profit`, `garantiza`, `seguro`, `probabilidad de subida`. Barato de escribir, imposible de olvidar.

Añade además:
- Marca de tiempo visible en cada alerta y en cada dato con retardo.
- Divulgación de conflicto de interés visible desde el propio escáner, no solo en el pie.
- Descargo permanente: herramienta de análisis, no asesoramiento; rendimientos pasados no garantizan futuros.
- Registro de versión de cada detector para poder reconstruir qué se mostró y cuándo.

---

## 10. Plan de ejecución

### Fase 1 — Cimientos (empieza aquí)
1. `lib/scanners/types.ts` con los cuatro contratos de §3.
2. Adaptador de Binance WS con reconexión, resincronización de libro por `seq` y detección de huecos.
3. Ring buffers `Float64Array` y el arnés de Web Worker.
4. **Prototipo HTML #1 (E1 · Order Flow)** con solo 4 detectores: OFI, Queue Imbalance, CVD, Absorción. Lightweight Charts + `attributionLogo` activado.
5. Medir: latencia de tick a pintado, y frame time con 20 símbolos. **Si no baja de 16 ms, se para y se optimiza antes de seguir.**

### Fase 2 — Los seis prototipos
Un HTML por escáner, mismo arnés, catálogo completo de §4. Cada detector con su ficha de evidencia y su veredicto.

### Fase 3 — Capa estadística
BH-FDR, percentiles rolling, registro de decisiones, ficha de rendimiento por detector.

### Fase 4 — Servidor
Endpoints FastAPI para Matrix Profile, GARCH, HMM, cointegración. Caché con Redis o en memoria. Fuentes institucionales (FINRA, CFTC, SEC) con trabajos programados.

### Fase 5 — Integración
Migración a `lib/scanners/` + rutas React. Panel de confluencia. Sistema de temas ya existente (acento ámbar; verde/rojo solo para P&L). Puertas de cumplimiento en CI.

### Fase 6 — Reparto gratis/de pago
Tú ya lo tienes decidido y pediste no tocarlo. Solo una observación: los escáneres de cripto funcionan sin coste de datos, así que la línea que dibujes ahí es libre; los de acciones/opciones arrastran coste de licencia real por usuario.

---

## 11. Prompt listo para pegar en Claude Code

```
Lee docs/BRIEF-ESCANERES.md completo antes de escribir código.

Contexto: TradingCalculator.Pro, React 19 + CRACO + Tailwind + shadcn/ui
en GitHub Pages, backend FastAPI + PostgreSQL en Cloud Run. Pre-lanzamiento,
público profesional, cumplimiento MiFID II activo.

Objetivo: suite de 6 escáneres de mercado. Ejecuta SOLO la Fase 1 de la
sección 10 y para.

Restricciones no negociables:
- Ningún dato sintético o aleatorio. Todo valor lleva Provenance.
- Todo cálculo en Web Workers. Objetivo < 16 ms/frame con 20 símbolos.
- Solo detectores de la sección 4 y fuentes de la sección 5.
- Ninguna cadena de recomendación de inversión en la UI (tabla de la §9).
- Lightweight Charts con attributionLogo activado (lo exige Apache-2.0 + NOTICE).
- Cada detector expone su veredicto de evidencia (Sólido/Mixto/Sin base/Refutado)
  y sus referencias.

Entrega:
1. lib/scanners/types.ts — los cuatro contratos de la sección 3
2. lib/scanners/sources/binance.ts — WS con reconexión y resync de libro por seq
3. lib/scanners/engine/ — ring buffers Float64Array + arnés de worker
4. lib/scanners/detectors/e1/ — ofi.ts, queueImbalance.ts, cvd.ts, absorption.ts
   (funciones puras, cada una con su test unitario)
5. prototypes/e1-orderflow.html — autocontenido, datos en vivo de
   data-stream.binance.vision, sin build
6. Medición real de latencia y frame time en el README del prototipo

Formato de entrega: un único parche .patch aplicable con git apply.
No modifiques options_math.py ni el reparto gratis/de pago.
```

---

## 12. Bibliografía y enlaces

### Microestructura — núcleo teórico
- **[CKS2014]** Cont, Kukanov, Stoikov — *The Price Impact of Order Book Events*, Journal of Financial Econometrics 12(1). https://arxiv.org/pdf/1011.6402 · https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1712822
- **[GB2016]** Gould, Bonart — *Queue Imbalance as a One-Tick-Ahead Price Predictor in a Limit Order Book*. https://arxiv.org/abs/1512.03492
- **[Kyle1985]** Kyle — *Continuous Auctions and Insider Trading*, Econometrica 53(6)
- **[Amihud2002]** Amihud — *Illiquidity and Stock Returns*, Journal of Financial Markets 5(1)
- **[BMM2015]** Bacry, Mastromatteo, Muzy — *Hawkes Processes in Finance*. https://arxiv.org/pdf/1502.04592
- **[Cont2001]** Cont — *Empirical properties of asset returns: stylized facts and statistical issues*

### Toxicidad del flujo — y su disputa
- **[ELO2012]** Easley, López de Prado, O'Hara — *Flow Toxicity and Liquidity in a High Frequency World*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1748633 · PDF: https://www.quantresearch.org/VPIN.pdf
- **[AB2014]** Andersen, Bondarenko — *VPIN and the Flash Crash*, Journal of Financial Markets. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1881731
- Réplica: Easley et al. — *VPIN and the Flash Crash: A Comment*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2062450
- Contrarréplica: *Reflecting on the VPIN Dispute*. https://repec.econ.au.dk/repec/creates/rp/13/rp13_42.pdf
- **[CPS2015]** Chakrabarty, Pascual, Shkilko — *Evaluating Trade Classification Algorithms: BVC vs. Tick Rule vs. Lee-Ready*, Journal of Financial Markets 25. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2182819

### Liquidez oculta
- **[FS2009]** Frey, Sandås — *The Impact of Iceberg Orders in Limit Order Books*, Quarterly Journal of Finance. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1108485
- Frey, Sandås — *The Impact of Hidden Liquidity in Limit Order Books* (NBER). https://conference.nber.org/confer/2008/mms08/sandas.pdf
- **[PP2004]** Pardo, Pascual — *On the Hidden Side of Liquidity* (premio FESE). https://www.fese.eu/app/uploads/2025/01/dlv-winner-2004.pdf
- **[Hautsch2012]** Hautsch, Huang — *On the Dark Side of the Market: Identifying and Analyzing Hidden Order Placements*

### Estructura de subasta
- **[CME-MP]** CME Group — *FX Market Profile User Guide*. https://www.cmegroup.com/education/articles-and-reports/fx-market-profile-user-guide.html
- CME Group — *Metal Market Profile User Guide*. https://www.cmegroup.com/education/articles-and-reports/metal-market-profile-user-guide.html
- CME Group — Volumen y open interest oficiales. https://www.cmegroup.com/market-data/browse-data/exchange-volume.html

### El sustrato real de los "order blocks"
- **[Osler2003]** Osler — *Stop-Loss Orders and Price Cascades in Currency Markets*, Federal Reserve Bank of New York Staff Report 150. https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr150.html
- Osler — *Currency Orders and Exchange-Rate Dynamics*, NY Fed Staff Report 125. https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr125.html

### Régimen, volatilidad, patrones
- **[Hamilton1989]** Hamilton — *A New Approach to the Economic Analysis of Nonstationary Time Series*, Econometrica 57(2)
- **[Bollerslev1986]** Bollerslev — *Generalized Autoregressive Conditional Heteroskedasticity*
- **[Killick2012]** Killick, Fearnhead, Eckley — *Optimal Detection of Changepoints* (algoritmo PELT, base de `ruptures`)
- **[DFA]** Detrended Fluctuation Analysis. https://en.wikipedia.org/wiki/Detrended_fluctuation_analysis · *Time and scale Hurst exponent analysis for financial markets*, Physica A
- **[BP2002]** Bandt, Pompe — *Permutation Entropy: A Natural Complexity Measure for Time Series*
- **[MP-UCR]** UCR Matrix Profile — página oficial con las ~30 publicaciones de la serie. https://www.cs.ucr.edu/~eamonn/MatrixProfile.html · `stumpy`: https://github.com/TDAmeritrade/stumpy

### Validación (leer antes de publicar cualquier tasa de acierto)
- **[DSR]** Bailey, López de Prado — *The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality*. https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf
- López de Prado — *A Data Science Solution to the Multiple-Testing Crisis in Financial Research*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3177057
- López de Prado — *Advances in Financial Machine Learning* (validación cruzada purgada, embargo, barreras triples)

### Datos institucionales gratuitos
- **[FINRA]** OTC (ATS & Non-ATS) Transparency. https://www.finra.org/filing-reporting/otc-transparency · API: https://www.finra.org/sites/default/files/OTC-Transparency-Data-File-Download-API-v04.pdf
- **[CFTC]** Commitments of Traders. https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm · API Socrata: https://publicreporting.cftc.gov/Commitments-of-Traders/Disaggregated-Futures-Only/72hh-3qpy
- **[SEC]** Accessing EDGAR Data. https://www.sec.gov/edgar/searchedgar/accessing-edgar-data.htm

### Documentación técnica
- Binance — endpoints de solo datos de mercado (sin clave). https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only
- Binance — WebSocket Market Streams. https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
- Binance — Liquidation Order Streams. https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Liquidation-Order-Streams
- Lightweight Charts (Apache-2.0, atribución obligatoria). https://github.com/tradingview/lightweight-charts
- KLineChart (Apache-2.0). https://github.com/klinecharts/KLineChart
- DuckDB-WASM. https://duckdb.org/2021/10/29/duckdb-wasm

### Cumplimiento
- **[CNMV]** *Guía para finfluencers: cómo actuar con responsabilidad*. https://www.cnmv.es/DocPortal/Publicaciones/Guias/GuiaparaFinfluencers.pdf
- Reglamento (UE) 596/2014 sobre abuso de mercado (MAR), arts. 20-21
- Reglamento Delegado (UE) 2016/958 — requisitos técnicos de presentación objetiva de recomendaciones

### GEX
- SpotGamma — *Gamma Exposure (GEX)*. https://spotgamma.com/gamma-exposure-gex/ — la convención de signo del dealer es heurística sectorial, no dato observable

---

## Cierre — las tres cosas que cambian el resultado

1. **La honestidad es la característica.** El mercado de escáneres está saturado de herramientas que prometen ver a los institucionales. Ninguna declara sus supuestos. Un escáner que dice *"esto es una inferencia con esta tasa de falsos positivos, aquí está el paper, aquí está la disputa"* es un producto distinto, y es exactamente el que compra un profesional.

2. **El registro de decisiones es el foso.** A los tres meses de guardar cada alerta con su resultado real, tendrás algo que no se puede copiar: el rendimiento medido de tus propios detectores. Constrúyelo en la Fase 3, no "más adelante".

3. **Cripto financia el resto.** Los seis escáneres funcionan completos y en tiempo real sobre datos de Binance que cuestan cero. Eso te permite lanzar la suite entera sin licencias de datos, validar qué detectores usa la gente, y solo entonces decidir dónde merece la pena pagar por acciones y opciones.
