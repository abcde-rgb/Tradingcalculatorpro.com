# Proveedores de datos — candidatos para G-16 y para la cadena de reserva

> Rastreado el **2026-08-23** sobre el índice de
> [`public-apis/public-apis`](https://github.com/public-apis/public-apis)
> (60 entradas en «Finance», 20 en «Currency Exchange», 77 en «Cryptocurrency»).
>
> ⚠️ **Nada de esta lista está probado.** El proxy de salida de este entorno
> responde 403 a todos los dominios de datos de mercado, así que **no se ha
> podido verificar ni una sola respuesta**: ni la forma del JSON, ni la latencia,
> ni los límites reales, ni —lo que más importa— las condiciones de licencia. Lo
> que sí es dato es lo que el índice publica: si pide clave y si va por HTTPS.
> Todo lo demás hay que comprobarlo desde una red normal antes de escribir una
> línea de código.

## Por qué existe este documento

**G-16 lleva parado sin lista de candidatos.** El hueco dice que acciones,
índices, materias primas y la cadena de opciones salen de Yahoo, cuya licencia no
permite redistribuir el dato en un producto de pago, y que la decisión «tiene
coste». Cierto — pero una decisión sin opciones sobre la mesa no se toma nunca.

Y hay un segundo problema, más barato de arreglar: **la cadena de reserva de
`market_data.py` tiene hoy un solo eslabón**. Sus tres proveedores son Yahoo (sin
clave), Finnhub y Twelve Data, y los dos últimos **exigen clave y no está puesta**
(`FINNHUB_API_KEY`, `TWELVEDATA_API_KEY`). Con eso, el failover es teórico: si
Yahoo cae, no hay nada detrás. Lo dice el propio panel de admin
(`MarketDataHealthCard`) y no es una tarea de código, es de operaciones.

De ahí el criterio de esta lista: **se priorizan los que NO piden clave**, porque
son los únicos que pueden entrar en la cadena sin que nadie tenga que registrarse
en nada.

## Lo que ya está resuelto (no tocar)

| Dato | Proveedor | Estado |
|---|---|---|
| Cripto | Binance + Kraken | ✅ dos fuentes, sin clave |
| Divisas | BCE (`ecb_rates.py`) | ✅ oficial, sin clave, **fuente única** |
| Tipo libre de riesgo | Tesoro de EE. UU. (`market_rates.py`) | ✅ oficial, sin clave. El índice lo confirma como `auth=No` |
| Acciones, índices, materias primas, cadena de opciones | **Yahoo** | 🔴 **G-16**: sin licencia comercial |

## Candidatos, por lo que resuelven

### 1. Metales — `goldprice.dev` · **sin clave**

> «Cross-validated gold, silver & copper spot, futures & 30-year history» ·
> `auth=No` · HTTPS.

Es el candidato más directo de toda la lista: **los 15 futuros de materias primas
son parte del Grupo B de G-16**, y esto los cubre sin clave y sin registro. Que
declare *cross-validated* y 30 años de histórico encaja con lo que el escáner y
las calculadoras necesitan.

**Antes de usarlo hay que comprobar** (desde una red sin este proxy): la licencia
—que sea explícita para uso comercial—, la forma de la respuesta, el límite de
peticiones y si publica futuros o sólo spot.

### 2. Divisas, segunda fuente — Frankfurter · **sin clave**

Hoy las divisas salen **sólo del BCE**. Frankfurter (`auth=No`, HTTPS) sirve
también datos del BCE, así que no aporta independencia de fuente —si el BCE calla,
callan los dos— pero sí **independencia de infraestructura**: cubre el caso de que
falle nuestra ruta al BCE, no el de que falle el BCE.

Alternativas del mismo tipo y también sin clave: `exchangerate.dev` (168 pares
desde 1999), `VATComply`, `currency-api` (fawazahmed0), Banco Nacional de Polonia,
Banco Nacional Checo. Para una fuente **de verdad independiente** habría que
cruzar con un banco central distinto.

### 3. Acciones e índices — el problema caro, sin solución gratis

Ninguna de las 60 entradas de «Finance» ofrece **acciones en tiempo real, sin
clave y con licencia comercial**. Las seis que no piden clave son de otra cosa:
SEC EDGAR (informes anuales), Fed Treasury (ya lo usamos), Econdb (macro),
Portfolio Optimizer, Binlist (BIN de tarjetas) y listas de sentimiento.

Los que sí sirven —Alpha Vantage, Finnhub, Twelve Data, Polygon, Financial
Modeling Prep, Marketstack, Intrinio, Tradier, Alpaca— **todos piden clave**, y
la parte que decide (¿el plan gratuito permite redistribuir en un producto de
pago?) **no está en este índice**: está en el contrato de cada uno.

⚠️ **El plan escrito en G-16 nombra «IEX para acciones». Verifícalo antes de
contar con él**: IEX Cloud anunció el cierre de su API pública, y este índice lo
sigue listando porque es comunitario y va con retraso. Que aparezca en la lista no
prueba que siga existiendo.

## Qué hacer con esto, en orden

1. **Lo más barato primero, y no es código**: poner `FINNHUB_API_KEY` y
   `TWELVEDATA_API_KEY` (ambas tienen plan gratuito). Eso convierte la cadena de
   reserva de teórica en real **sin tocar una línea**. Es la tarea de operaciones
   que `MarketDataHealthCard` lleva señalando desde que se conectó el failover.
2. **Verificar `goldprice.dev`** desde una red normal: licencia, forma de la
   respuesta y límites. Si cumple, es un proveedor nuevo en `PROVIDERS` y cierra
   la parte de materias primas de G-16.
3. **Decidir el Grupo B de acciones e índices** con presupuesto delante. Es lo que
   G-16 llama «decisión de negocio con coste», y sigue siéndolo: aquí no hay
   ninguna opción gratuita y comercialmente limpia.

## Cómo se añade un proveedor (para que no se improvise)

`market_data.py` ya tiene la forma: una función `_fetch_<nombre>(symbol) -> Quote`
y una entrada en `PROVIDERS` con su `daily_quota` documentada y su predicado de
disponibilidad. Lo que **no** se puede saltar:

- **La clave sale del entorno**, nunca de la base de datos. Es el hallazgo C-08 de
  la auditoría y este módulo no puede reintroducirlo.
- **Un precio que no se pudo refrescar vuelve con `stale=True` y `as_of`**, y la
  interfaz tiene que pintarlo. Ya lo hace (`EstadoPrecio`).
- **Nunca se inventa un precio.** Si fallan todos y no hay caché, `price` es
  `None` y `error` explica por qué.
- **Cada proveedor va con cortacircuitos**, para que uno muerto cueste un timeout
  por ventana y no uno por petición.
- Y un adaptador **no se escribe contra una API que no se ha visto responder**.
  Desde este entorno no se puede, así que el trabajo empieza en una red normal.
