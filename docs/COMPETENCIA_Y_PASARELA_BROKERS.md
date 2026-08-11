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
