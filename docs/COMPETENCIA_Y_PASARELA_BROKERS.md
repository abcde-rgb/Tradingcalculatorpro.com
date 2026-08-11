# 📊 Diario, setups y analítica frente a la competencia · Pasarela de lectura a brokers

> Estudio pedido el 2026-08-11. Tres preguntas: **(1)** dónde está el diario por encima y
> por debajo de la competencia, **(2)** cómo montar una pasarela **de solo lectura** a
> brokers y exchanges, **(3)** qué brokers dan datos en tiempo real a cambio de algo.
>
> Lo que dice de **nuestro** código está verificado leyéndolo. Lo que dice de terceros
> lleva fuente; donde no he podido confirmar un dato, lo digo en vez de rellenarlo.

---

## 1. Comparativa honesta

### 1.1 Lo que tenemos hoy (verificado en `performance.py`, 1795 líneas)

`compute_analytics` publica 45 claves. Las que importan para comparar:

`equity_curve` · `max_drawdown_pct/dollars` · `expectancy` · `profit_factor` ·
`win_rate` · `avg_r` · `r_distribution` · `r_sample_size` · `trades_without_r` ·
`by_setup` · `by_symbol` · `by_day` · `by_product` · `daily_pnl` ·
`returns_by_period` · `excursion` (MAE/MFE) · `costs` · `leverage_usage` ·
`behavioral_biases` · `errors_breakdown` · `rule_compliance_rate` ·
`max_consecutive_wins/losses` · `mixed_accounts` · `setups_multi_tagged` ·
Sharpe y Sortino (en `_risk_adjusted_metrics`).

El documento de operación (`make_trade_doc`) guarda 45 campos, incluidos
`iv_entry`/`iv_exit`/`delta_entry`/`underlying_entry`/`underlying_exit`/`option_strategy`,
`funding_fees`/`swap_fees`/`nights_held`, `leverage` + `multiplier` separados,
`mae_price`/`mfe_price`, `emotion`, `screenshot_urls`, `setups` (lista) y `plan_version`.

### 1.2 Dónde estamos POR ENCIMA

| Ventaja | Por qué la competencia no la tiene |
|---|---|
| **Multiproducto con la matemática correcta** | `instruments.py` conoce el tamaño de contrato por símbolo, pip/tick, margen, exposición, liquidación estimada, funding y swap. TradeZella/Tradervue nacen en acciones y futuros de EE. UU.; forex y perpetuos son ciudadanos de segunda |
| **Opciones y futuros medidos con la MISMA regla de R** | En riesgo definido el R sale de `max_loss` (prima, o anchura − crédito), no del stop. Eso permite que una vertical y un E-mini entren en la misma distribución de R. Es poco común |
| **Contexto de opciones en el diario** | IV de entrada y de salida, delta de entrada, subyacente en ambos extremos. Sin eso no se puede revisar si la volatilidad se pagó o se cobró |
| **Los umbrales salen del plan del usuario** | `detect_errors` lee `plan["risk"]` de `trading_plan.py`, y `plan_version` se **sella al crear la operación**: cambiar el plan no re-juzga la historia. La competencia usa reglas fijas |
| **Honestidad numérica fijada por tests** | Lo indeterminado es `None`, no 0. Un Sortino sin pérdidas, un R sin stop, una IV que el precio no determina. Un 0 falso arrastra la media, y esto está en el suite |
| **Sesgos de comportamiento cuantificados** | Efecto disposición, revenge trading, sobreoperar, falta de stop, con consejo numérico |
| **MAE/MFE en R** | `compute_excursion_stats` con percentiles. Tradervue lo tiene; TradeZella lo trata de pasada |
| **Multi-setup con doble conteo declarado** | Una operación con dos setups cuenta en los dos grupos, y la respuesta publica `setups_multi_tagged` para poder decirlo. Nadie más lo confiesa |
| **10 idiomas** | La competencia es prácticamente sólo inglés |
| **Precio** | 17 €/mes contra 35–99 $ de TradeZella y 29,95–49,95 $ de Tradervue |

### 1.3 Dónde estamos POR DEBAJO — y una de ellas decide la partida

| # | Hueco | Competencia | Gravedad |
|:-:|---|---|:--:|
| 1 | **Sin sincronización automática con broker.** Tenemos importación CSV con **4 presets** (`BROKER_PRESETS`: MetaTrader, IBKR, Binance, Bybit) | TradeZella **500+** integraciones, TraderSync ~50, ambas con auto-sync | 🔴 |
| 2 | **Sin ejecuciones parciales** (G-23). Una operación = un precio de salida. Un scale-out de tres tramos son tres operaciones, cada una con su saldo | Modelo `Execution → Trade` estándar en las tres | 🔴 |
| 3 | **Sin patas de opciones en el diario** (G-21). No hay griegas agregadas de la estructura ni cierre de una pata suelta | TradeZella y TraderSync agrupan por estructura | 🟠 |
| 4 | **Sin replay de la operación** sobre el gráfico, barra a barra | Es **la** función estrella de TradeZella | 🟠 |
| 5 | **Sin integración con prop firms** (FTMO, Topstep…) | TradeZella auto-sincroniza cuentas de fondeo. Es el segmento que más paga | 🟠 |
| 6 | **Sin conversión de divisa de cuenta** (G-24). El P&L de cada operación es correcto en su divisa; el total no | Resuelto en las tres | 🟠 |
| 7 | **Backtest escrito y sin interfaz** (G-14, `backtest.py`, 642 líneas) | TradeZella lo vende como función principal | 🟠 |
| 8 | **Dos expectancies distintas según la pantalla** (G-22): `/journal/stats` y `/performance/analytics` calculan distinto sobre la misma colección | — | 🟠 |
| 9 | **Sin app móvil nativa** | TraderSync sí; TradeZella y Tradervue tampoco | 🟡 |
| 10 | **Sin comunidad ni compartir operaciones** | Es el nicho de Tradervue | 🟡 |

### 1.4 Veredicto

**En profundidad analítica estamos por encima. En fontanería de datos estamos muy por
debajo, y eso es lo que se compra.**

El hueco nº 1 no es una función más: en esta categoría **la sincronización con el broker
es el primer criterio de compra**. Un trader no teclea 300 operaciones a mano para
descubrir si tu Sortino está bien calculado. Toda la ventaja analítica de §1.2 sólo se
puede *ver* si los datos entran solos.

Y hay un orden obligado: **los huecos 1 y 2 son el mismo proyecto**. Un broker devuelve
*ejecuciones* (fills), no operaciones cerradas. Montar la pasarela sobre el modelo actual
—una operación, un precio de entrada, un precio de salida— obliga a promediar los fills al
importarlos, que es tirar justo el dato que hace falta para el hueco 2. Se hacen juntos o
se hace dos veces.

---

## 2. La pasarela de solo lectura

### 2.1 Los cuatro niveles, por coste creciente

| Nivel | Qué | Credencial | Coste | Cubre |
|:--:|---|---|---|---|
| **0** | **Hyperliquid** | **Ninguna.** El estado de cada cartera es público: se consulta por dirección | **0 €** | Perpetuos on-chain |
| **1** | **Exchanges cripto directos**: Binance, Bybit, OKX, Kraken | Clave API del usuario con **solo lectura** | 0 € (APIs públicas) | Cripto spot y perpetuo |
| **2** | **Agregador de acciones**: SnapTrade | OAuth del usuario, **read-only por defecto** | De pago, por conexión | 40+ brokers de acciones (incluido Webull) |
| **3** | **MT4/MT5 y cTrader**: MetaApi (de pago) o cTrader Open API (OAuth, gratis) | Según proveedor | Variable | El mundo forex/CFD |

**Empezar por el nivel 0.** Hyperliquid no necesita credencial ninguna: `clearinghouseState`
devuelve posiciones y margen de una dirección, y `userFills` hasta 2 000 fills recientes
(`userFillsByTime` pagina hasta 10 000, 500 por página). Cero claves que custodiar, cero
riesgo, cero coste, y valida el modelo de ejecuciones antes de gastar un euro.

⚠️ Un detalle que rompe integraciones: hay que pasar **siempre la dirección de la cuenta
principal**, nunca la de una *agent wallet*, o la consulta devuelve vacío o incorrecto.

### 2.2 Reglas de seguridad, no negociables

1. **Rechazar activamente cualquier clave que no sea de solo lectura.** No basta con pedir
   al usuario que marque «solo lectura»: al dar de alta la conexión hay que **sondear los
   permisos** contra el exchange y **rechazar con error explicativo** si la clave puede
   operar o retirar. Guardar una clave con permiso de retirada es aceptar una custodia que
   nadie ha pedido.
2. **Cifrado en reposo con Fernet** — ya existe el mecanismo (`_encrypt_setting` /
   `_decrypt_setting` en `server.py`). Con una clave distinta de la de `app_settings`.
3. **Nunca registrar la clave**, ni entera ni truncada, en logs ni en el log de auditoría.
4. **Instrucción de lista blanca de IP** en la interfaz, con la IP de salida de Cloud Run.
5. **Revocación en un clic**, y borrado de la clave al desconectar.

### 2.3 Dónde encaja en nuestra arquitectura (y las trampas del repo)

La colección nueva —`broker_connections`— tiene que darse de alta en **dos sitios**, y
CLAUDE.md ya avisa de los dos:

- **`create_all_tables`** (`server.py:958`, lista `known`). El shim **no autocrea tablas**:
  una colección que no esté ahí falla en cuanto se consulta.
- **`_SECURITY_ARTEFACT_COLLECTIONS`**, no `_USER_DATA_COLLECTIONS`. Es exactamente el
  patrón de `passkey_credentials`: **se borra con la cuenta y NO se exporta jamás**.
  Mandarle al usuario sus claves de API en el JSON de portabilidad del RGPD no es
  portabilidad, es una filtración con acuse de recibo.

Los *fills* sí son datos del usuario y van en `_USER_DATA_COLLECTIONS`.

El *poller* de sincronización puede copiar el patrón de `realtime_alerts.py`, que ya
existe. La idempotencia sale gratis: cada fill trae su identificador del exchange, así que
la clave del documento es `(connection_id, exchange_fill_id)` y reimportar no duplica.

### 2.4 El modelo de ejecuciones (cierra G-21, G-23 y G-24 de paso)

```
BrokerConnection ──< Execution >── Position
                     (fill real)   (agrupación)
```

- `Execution`: lo que devuelve el broker. Inmutable. `{fill_id, symbol, side, qty, price,
  fee, timestamp, order_id}`.
- `Position`: agrupa ejecuciones por símbolo y ventana. De aquí salen entrada media,
  salida media, scale-in/scale-out y, en opciones, las patas.
- La operación del diario pasa a ser una **vista** sobre `Position`, no el dato primario.

Esto es una migración de calado, y por eso el orden importa: hoy `normalize_trade_schema`
ya es el punto único por el que pasa todo el P&L (se hizo al cerrar G-20), así que hay por
dónde entrar sin romper el histórico.

---

## 3. Datos en tiempo real «a cambio de publicidad»: la respuesta corta es que no existe

### 3.1 Lo que sí existe

| Mercado | Realidad |
|---|---|
| **Cripto** | Los datos **ya son gratis y públicos** (Binance, Bybit, OKX, Kraken, Hyperliquid). No hay nada que negociar. Ya usamos Binance y Kraken |
| **Acciones EE. UU.** | El dato consolidado en tiempo real tiene tasas de mercado (SIP/CTA/UTP). **Nadie lo regala por publicidad.** Lo más cerca: **Alpaca**, que da tiempo real de **IEX** gratis con cuenta — pero IEX es un solo centro de negociación, una fracción del volumen; el SIP completo es de pago |
| **IBKR / Tradier** | Tiempo real **atado a tener cuenta** y a suscripciones de datos. La API de IBKR (TWS) es gratis; los datos, no |
| **Forex/CFD** | El dato viene del bróker con el que el usuario ya opera. No hay feed público |

### 3.2 El modelo que sí paga: reparto de ingresos, no datos gratis

Lo que la industria ofrece de verdad no es dato barato, es **comisión por cliente
referido**:

- **Margex**: **40 % de todas las comisiones** que paguen los referidos, a perpetuidad,
  pagado en BTC y con liquidación diaria. Es de los repartos más altos del sector.
- **Hyperliquid — *builder codes***: esto es lo más interesante de las tres. No es
  afiliación, es **una comisión de protocolo**. Una interfaz puede añadir un recargo de
  hasta **10 puntos básicos en perpetuos** y **100 en spot** sobre las órdenes que
  encamina, cobrado on-chain automáticamente. El usuario aprueba un máximo por adelantado
  y puede revocarlo; se necesitan **100 USDC** en la cuenta de perpetuos para activarlo.
  Ya ha generado **más de 40 M$** para desarrolladores, y **cerca del 40 % de los usuarios
  activos diarios** operan por interfaces de terceros, no por la oficial.
- **Brokers CFD**: programas de IB/afiliados con reparto de spread. Es el modelo clásico.

> **Margex**: no he podido confirmar en fuentes públicas si su API ofrece claves de
> **solo lectura** ni el detalle de permisos. Hay que verificarlo contra su documentación
> antes de contar con ellos para el nivel 1.

---

## 4. ⚠️ El problema regulatorio de convertirse en bróker/afiliado

Esto hay que decirlo antes de escribir una línea, porque acabamos de invertir una sesión
entera en poner los textos legales en orden y esto los toca de lleno.

1. **ESMA ha dicho que los futuros perpetuos entran en las reglas de CFD de la UE.** Eso
   alcanza **directamente a Hyperliquid y a Margex**: promocionarlos a minoristas de la UE
   es promocionar CFDs a efectos regulatorios, con todo lo que eso arrastra.
2. **Promoción financiera.** MiFID II art. 24 exige que la comunicación sea *imparcial,
   clara y no engañosa*. La intervención de producto de ESMA obliga a la **advertencia
   normalizada con el porcentaje real de cuentas minoristas que pierden dinero** del bróker
   concreto, prohíbe los bonos e incentivos, y **el contenido del afiliado es
   responsabilidad del bróker** — lo que significa que un bróker serio nos va a auditar el
   contenido, y uno que no lo haga es la señal de alarma.
3. **Ni Hyperliquid ni Margex están autorizados en la UE** para derivados a minoristas.
   Promocionar a un no autorizado ante minoristas de la UE es terreno en el que las
   autoridades nacionales (la CNMV en España) publican advertencias.
4. **MiCA** añade su propia capa para la promoción de servicios de criptoactivos en la UE.

**Lo que esto NO impide:** la pasarela de **solo lectura** es otra cosa. Leer las
operaciones del usuario con sus propias credenciales para pintarle su diario **no es
intermediación ni promoción**. Ese trabajo es seguro y es el que da valor al producto.

**Lo que sí obliga:** si se quiere el reparto de ingresos, la salida practicable es
**segmentar por territorio** — la referencia a brókeres fuera de la UE/EEE, y en la UE
sólo entidades autorizadas y con la advertencia normalizada. Es lo que hace todo el sector
serio, y es una decisión de negocio con coste, no un detalle de implementación.

---

## 5. Orden recomendado

1. **Hyperliquid, nivel 0** — sin credenciales, sin coste. Valida el modelo `Execution` con
   fills reales y da una integración que la competencia no tiene.
2. **El modelo de ejecuciones** (G-21 + G-23), que la propia integración hace inevitable.
3. **Binance/Bybit/OKX con clave de solo lectura**, con el sondeo de permisos del §2.2.
4. **Decidir el reparto de ingresos** con el mapa regulatorio del §4 delante. Los *builder
   codes* de Hyperliquid son la opción más limpia técnicamente (on-chain, revocable por el
   usuario, sin custodia) y la que más exige resolver antes la segmentación territorial.
5. **SnapTrade o cTrader/MetaApi** sólo cuando 1–3 estén pagando su coste.

---

## Fuentes

- [TradeZella vs Tradervue (2026)](https://www.tradezella.com/blog/tradezella-vs-tradervue) ·
  [TradeZella vs TraderSync](https://www.tradezella.com/vs/tradersync) ·
  [SuperTrader: comparativa de las tres](https://www.supertrader.me/compare/tradezella-vs-tradervue-vs-tradersync/)
- [Hyperliquid Builder Codes (wiki oficial)](https://hyperliquid-co.gitbook.io/wiki/guide/builder-guide/hypercore/builder-codes) ·
  [Dwellir: construir con builder codes](https://www.dwellir.com/blog/build-hyperliquid-trading-app-builder-codes) ·
  [Blockworks: la guerra de las interfaces](https://blockworks.com/news/hyperliquid-the-frontend-wars)
- [Hyperliquid `clearinghouseState` (Chainstack)](https://docs.chainstack.com/reference/hyperliquid-info-clearinghousestate) ·
  [Guía de la API de Hyperliquid](https://hyprswarm.com/blog/hyperliquid-api-guide/)
- [SnapTrade](https://snaptrade.com/) · [Documentación SnapTrade](https://docs.snaptrade.com/) ·
  [Journali: auto-sync con 40+ brokers vía SnapTrade](https://journali.io/features/broker-sync)
- [cTrader Open API — autenticación OAuth](https://help.ctrader.com/open-api/account-authentication/)
- [Alpaca — API de datos de mercado](https://alpaca.markets/data) ·
  [Alpaca — sobre la API de datos](https://docs.alpaca.markets/us/docs/about-market-data-api)
- [Margex: programa de afiliados 40 %](https://99bitcoins.com/cryptocurrency/margex-review/) ·
  [Coinspeaker: mejores programas de afiliados](https://www.coinspeaker.com/guides/best-crypto-affiliate-programs/)
- [ESMA: los perpetuos entran en las reglas de CFD de la UE](https://www.financemagnates.com/forex/regulation/esma-tells-firms-perpetual-futures-fall-under-eu-cfd-rules/) ·
  [ESMA: medidas de intervención sobre CFDs](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options) ·
  [ESMA: aplicación de los requisitos de marketing de MiFID II](https://www.esma.europa.eu/press-news/esma-news/esma-reports-application-mifid-ii-marketing-requirements) ·
  [Cumplimiento publicitario para afiliados de forex](https://track360.io/blog/forex-affiliate-advertising-compliance-esma-fca-cysec-operator-guide)
- [CoinLedger: guía de acceso por API a exchanges](https://coinledger.io/blog/the-ultimate-guide-to-api-access-for-your-crypto-exchange-accounts)

---

## 6. «Un bróker regulado que me deje redistribuir sus datos gratis»

Respuesta corta: **no existe, y no puede existir — porque el bróker no es el dueño del
derecho que habría que conceder.**

### 6.1 Por qué ningún bróker puede darte eso

Los datos de mercado de acciones, futuros y opciones son propiedad de **los mercados**
(NYSE, Nasdaq, Cboe, CME…), no del bróker. IBKR o Saxo tienen licencia para **mostrar** ese
dato **a sus propios titulares de cuenta**. Esa licencia les prohíbe expresamente pasarlo a
terceros. Pedirle a un bróker permiso para redistribuir es como pedirle al inquilino que te
venda el piso.

Está escrito en sus propias condiciones:

- **IBKR** — *«El uso de la TWS API como medio de difundir información, incluidos datos de
  mercado o cualquier otra información licenciada o con copyright, a terceros o a clientes
  no registrados de IB está estrictamente prohibido sin aprobación previa por escrito.»* Y
  además la licencia de la API se concede *«únicamente para fines no comerciales»*. Un
  producto de 17 €/mes no cabe ahí ni de lejos.
- **Saxo** — las herramientas de terceros están disponibles **sólo para clientes directos
  de Saxo**. Los datos de mercado vienen desactivados por defecto fuera de sus plataformas;
  hay que solicitarlos y aceptar condiciones aparte, y los de BATS Europe/US exigen un
  **acuerdo de licencia separado con sus tasas**. Lo único gratis y de serie es el
  *streaming* de divisas y unos 5 000 bonos — **para el titular de la cuenta**.

### 6.2 La distinción que resuelve el 90 % del problema

Hay dos cosas que se llaman «datos del bróker» y no tienen nada que ver:

| | Qué es | ¿Licencia? | Coste |
|---|---|---|---|
| **Redistribución** | Coges un feed y se lo enseñas a **tus** usuarios | Sí, del **mercado** | 💰 |
| **Paso a través por usuario** | Cada usuario conecta **su** cuenta y ve **sus** datos | **No** | **0 €** |

**El diario no necesita redistribución.** Necesita las posiciones y las ejecuciones **del
propio usuario**, que el bróker le entrega a él porque son suyas. Eso es exactamente lo que
hacen TradeZella y TraderSync con sus 500 y 50 integraciones: no redistribuyen nada, cada
usuario autoriza su cuenta. Es gratis, es limpio y es todo lo que hace falta para el §2.

La frontera es nítida: **datos de cuenta del usuario, autenticados, sólo para él** → libre.
**Cotizaciones para cualquier visitante** → licencia.

### 6.3 Lo que SÍ puedes redistribuir gratis (y ya lo haces)

| Fuente | Estado | Ya en uso |
|---|---|:--:|
| **Cripto** (Binance, Kraken, OKX, Bybit, Hyperliquid) | Público y gratis, sin licencia | ✅ |
| **Divisas — tipos de referencia del BCE** | Dominio público | ✅ |
| **Tipo libre de riesgo — Tesoro de EE. UU.** | Dominio público | ✅ |
| **Gráficos en tiempo real — widget de TradingView** | **Gratis**: TradingView paga las licencias | ✅ |

> 💡 **El widget de TradingView ya es tu solución legal y gratuita para el gráfico en
> tiempo real.** Lo que no puedes es sacar los números de ahí para tus propios cálculos:
> el permiso cubre mostrar su gráfico, no alimentar tu motor.

### 6.4 Lo que cuesta, y cuánto

- **Retardado 15 minutos.** Es la vía barata. **MiFIR art. 13 obliga a los centros de
  negociación europeos a publicar los datos con 15 minutos de retardo gratuitamente**, y
  Nasdaq los publica libremente para productos regulados. En EE. UU. hay que firmar igual:
  Cboe cobra **250 $/año de administración + 250 $/mes** como redistribuidor de datos
  retardados. Para calculadoras y para un diario, **15 minutos de retardo no cambian
  absolutamente nada**.
- **Tiempo real de acciones de EE. UU.** No hay atajo. **IEX Cloud, que era la opción
  gratuita, cerró el 31 de agosto de 2024.** Hoy toca pagar: Databento, Polygon,
  Finnhub, Twelve Data, EODHD. Alpaca da tiempo real de IEX gratis con cuenta, pero IEX es
  un solo centro de negociación (una fracción del volumen) y **sus condiciones de
  redistribución hay que verificarlas antes de contar con ellas**.

### 6.5 Y esto además arregla el mayor riesgo del proyecto

El §4 de la auditoría del 2026-08-10: acciones, índices, materias primas y **toda la cadena
de opciones** salen hoy de **Yahoo, evadiendo su detección de bots** (`curl_cffi`,
`impersonate="chrome"`), en un producto de pago. La salida no es negociar con un bróker —
es exactamente esto:

1. **Retardado 15 min con acuerdo de redistribuidor** para acciones e índices. Coste de
   tres cifras al año, y legal.
2. **TradingView** para el gráfico en vivo, que ya está.
3. **Un proveedor de pago** (Databento/Polygon) sólo si de verdad hace falta tiempo real en
   el motor.
4. **Cripto, BCE y Tesoro** se quedan como están: son irreprochables.

### 6.6 Lo que sí puedes conseguir «a cambio de algo»

No datos gratis, sino **acceso y distribución**: IBKR tiene su *Investors' Marketplace*
para proveedores externos y Saxo su programa de soluciones avanzadas / marca blanca. En
esos programas el bróker te da acceso a la API y a la relación con el cliente **a cambio de
llevarle cuentas** — pero las **tasas de datos del mercado se le siguen cobrando al usuario
final**, porque el bróker tampoco puede regalar lo que no es suyo.

---

## Fuentes de la sección 6

- [IBKR — suscripciones de datos de mercado y API](https://www.interactivebrokers.com/campus/ibkr-api-page/market-data-subscriptions/) ·
  [IBKR TWS API](https://interactivebrokers.github.io/index.html)
- [Saxo — herramientas de terceros (sólo clientes directos)](https://www.home.saxo/platforms/third-party-tools) ·
  [Saxo — cómo habilitar datos de mercado](https://openapi.help.saxo/hc/en-us/articles/4418427366289-How-do-I-enable-market-data) ·
  [Saxo — uso de OpenAPI](https://openapi.help.saxo/hc/en-us/sections/4416632602385-Use-of-OpenAPI)
- [Cboe — políticas de datos de mercado 2026 (PDF)](https://cdn.cboe.com/resources/membership/Market_Data_Policies.pdf) ·
  [Cboe — tasas SIP](https://datashop.cboe.com/sip-fees)
- [Nasdaq — políticas europeas de datos, enero 2026](https://www.nasdaq.com/docs/Nasdaq_European_Data_Policies_January_2026_New)
- [NYSE — tarifas de datos propietarios 2026 (PDF)](https://www.nyse.com/publicdocs/nyse/data/NYSE_Market_Data_Pricing.pdf)
- [Cierre de IEX Cloud y alternativas](https://iexcloud.org/) ·
  [Guía de migración desde IEX Cloud (Databento)](https://databento.com/blog/migrating-from-iex-cloud-to-databento)
- [Alpaca — API de datos de mercado](https://alpaca.markets/data)

---

## 7. Cómo se hace legal: los cuatro modelos y cuál es el tuyo

> No soy abogado, y los contratos de datos de mercado son un mundo con vocabulario propio.
> Lo de aquí es el mapa del sector y una lista de qué exigir antes de firmar; **la revisión
> del contrato concreto la tiene que hacer alguien especializado en licencias de market
> data**. Es de las pocas áreas donde eso está justificado de verdad.

### 7.1 Los cuatro modelos

| | Modelo | Quién lo usa | Coste | Complejidad |
|:--:|---|---|---|---|
| **A** | **BYO — el usuario trae sus datos.** Conecta su cuenta de bróker y la app le pinta **lo suyo** | Los diarios (TradeZella, TraderSync) | **0 €** | Baja |
| **B** | **Proveedor con redistribución incluida.** Pagas a un vendor que ya tiene los acuerdos con los mercados y te **sublicencia** mostrárselo a tus usuarios | **La inmensa mayoría de productos indie y pymes** | Cuota fija | **Baja** |
| **C** | **Acuerdo directo con cada mercado + cobrar aparte** | IBKR, TradingView, Sierra Chart | Por usuario | **Muy alta** |
| **D** | **Retardado 15 min / fin de día** | Muchas calculadoras y screeners | Muy bajo | Baja |

### 7.2 Lo que hace la mayoría: el modelo B

**Firmas con un proveedor cuyo contrato ya dice que puedes redistribuir a tus usuarios
finales.** El proveedor mantiene los acuerdos con NYSE, Nasdaq, Cboe, OPRA, etc., hace el
reporte mensual y aguanta las auditorías. Tú pagas **una factura** y te olvidas.

De los que hay, **Twelve Data es el que tiene el lenguaje público más maduro sobre uso en
pantalla, uso *non-display*, derechos de redistribución y marca blanca**, que es
exactamente el vocabulario que hay que poder leer antes de firmar. EODHD publica precios
personales y comerciales por separado. Databento está orientado a quants e infraestructura
(libro completo, OPRA de los 17 centros de opciones de EE. UU.); es más de lo que necesitas
y se paga por uso. Polygon va a tiempo real de EE. UU. de alta frecuencia.

> La frase que resume el asunto: **acceder al dato no es lo mismo que tener derecho a
> mostrarlo, redistribuirlo o empaquetarlo dentro de un producto.** Una API barata con
> términos ambiguos sale cara el día que el producto sale del laboratorio.

### 7.3 «Cobrar por separado»: qué es de verdad, y por qué todavía no

Sí, es un modelo real y legal — es el **modelo C**, y es literalmente lo que hace IBKR:
plataforma por un lado, suscripciones de datos como complemento aparte. Pero lo que hay
detrás de esa línea en la factura es esto:

1. **Vendor/Redistributor Agreement con cada mercado**, uno por uno.
2. **Sistema de titularidades** (*entitlements*): saber en todo momento qué usuario tiene
   derecho a qué dato, y cortarlo cuando deja de pagar.
3. **Autocertificación Profesional / No Profesional de cada usuario.** Aquí está el dinero:
   un **no profesional** cuesta del orden de **1–3 $/mes**, y un **profesional entre 30 y
   85 $/mes**. La definición de no profesional es persona física, uso personal y no
   empresarial, y que no sea asesor de inversiones registrado.
4. **Reporte mensual de uso** a cada mercado.
5. **Auditorías.** Los mercados auditan a los distribuidores.

⚠️ **Y la trampa que arruina a quien entra sin saberlo:** si clasificas a un profesional
como no profesional, **el distribuidor —tú— responde retroactivamente por la diferencia a
tarifa profesional**. Con un puñado de usuarios mal clasificados durante un año, eso es una
factura de cinco cifras por un producto de 17 €/mes.

**Recomendación:** el modelo C **no** a tu escala. El coste administrativo se come el
margen antes de que el primer euro llegue. **Métete en el modelo B y mete el coste dentro
del precio del plan.** Cuando tengas miles de usuarios de pago y los datos sean una partida
gorda, entonces sí tiene sentido separarlos y pasar al C.

### 7.4 Tres trampas que te tocan a ti en concreto

1. 🔴 **«Si no lo enseño, sólo lo calculo, no necesito licencia» — es falso, y al revés.**
   Usar el dato sólo para cálculos es ***non-display use***, tiene su propia licencia y a
   menudo es **más cara** que mostrarlo. **Tus calculadoras y el motor de opciones son
   exactamente eso.** Cualquier contrato que firmes tiene que decir *non-display* por
   escrito, o estarás fuera de cobertura justo en tu función principal.
2. 🟠 **La caché tiene plazo contractual.** `stock_data.py` cachea 5 minutos
   (`_cache_duration = 300`) y la colección `stock_cache` guarda más. Casi todas las
   licencias limitan cuánto tiempo se puede almacenar el dato y si se puede servir desde
   almacén. Hay que contrastar el número con el contrato, no con lo que va bien de latencia.
3. 🟢 **Las 1589 páginas estáticas están limpias** — verificado: no publican cotizaciones.
   Mantenerlo así. Un dato con licencia en una página pública e indexable es
   redistribución a personas que no son suscriptores tuyos, y es el error más fácil de
   cometer y el más fácil de detectar desde fuera.

   Vigila también el **AI Trade Coach**: si el prompt que va a Anthropic llevara
   cotizaciones licenciadas, eso es enviar el dato a un tercero.

### 7.5 Qué hacer, en orden

1. **Cripto, divisas y tipos se quedan como están.** Binance/Kraken/Hyperliquid, BCE y
   Tesoro son libres. Es tu terreno fuerte y no cuesta nada.
2. **Sustituir Yahoo por un proveedor del modelo B** para acciones, índices, materias
   primas y cadena de opciones. Es la salida al riesgo del §6.5 y, de paso, deja de
   depender de que no cambien su detector de bots.
3. **Pedir por escrito, antes de firmar**, y no dar nada por supuesto:
   - redistribución a usuarios finales, **display**;
   - **non-display** (los cálculos);
   - si las tasas de los mercados van **incluidas** o se repercuten;
   - **quién clasifica** Profesional / No Profesional y quién reporta;
   - **tramos por número de aplicaciones** (los mercados tarifican por aplicación: 1,
     2–3, 4 o más);
   - **límites de caché y de almacenamiento histórico**;
   - **auditoría e indemnización**: quién responde si audita el mercado;
   - **qué pasa con el dato almacenado al terminar el contrato**.
4. **Si el tiempo real no sale a cuenta, empezar en retardado 15 min** (modelo D). Para un
   diario y unas calculadoras no cambia nada, y compra tiempo para crecer.
5. **El precio, dentro del plan.** Separar la línea de datos cuando el modelo C compense,
   no antes.

### Fuentes de la sección 7

- [Comparativa de proveedores de datos 2026 (EODHD Academy)](https://eodhd.com/financial-academy/financial-faq/the-2026-market-data-api-scorecard-comparing-6-leading-providers) ·
  [Comparativa para quants: Databento, Polygon, EODHD, Barchart](https://waylandz.com/quant-book-en/Data-Provider-Comparison/)
- [NYSE — política de suscriptores no profesionales (PDF)](https://www.nyse.com/publicdocs/nyse/data/Policy-Non-ProfessionalSubscribers_PDP.pdf) ·
  [NYSE — paquete completo de políticas de datos (PDF)](https://www.nyse.com/publicdocs/nyse/data/NYSE_Market_Data_Complete_Policy_Package.pdf)
- [CME — lista de tarifas de datos, enero 2026 (PDF)](https://www.cmegroup.com/market-data/files/january-2026-market-data-fee-list.pdf) ·
  [CME — autocertificación de no profesional (PDF)](https://assets.tastyworks.com/production/documents/cme_market_data_subscriber_agreement.pdf)
- [OPRA — políticas de reporte y tarifas por uso (PDF)](https://cdn.opraplan.com/documents/OPRA_Usage_Based_Fee_Policy.pdf)
- [Estatus profesional explicado](https://www.marketdata.app/education/stocks/professional-status-explained/) ·
  [Tarifas de mercado y suscripciones de datos](https://godeldiscount.com/blog/exchange-fees-market-data-subscriptions)
