# Las rutas sin consumidor — una decisión por cada una

`docs/MAPA.md` las **cuenta**; este fichero las **decide**. Son endpoints del
backend que ningún fichero del frontend menciona: código escrito, desplegado y
autenticado que ningún usuario puede alcanzar desde ninguna pantalla.

La lista la genera `scripts/gen-mapa.py` a partir del código, y su detector está
validado contra 19 rutas de destino conocido (`CONTROLES`), así que la cifra no es
una impresión. Lo que faltaba era qué hacer con cada una.

**`scripts/check-rutas-muertas.py` comprueba que esta tabla y el código dicen lo
mismo**, en las dos direcciones: una ruta que se queda sin consumidor y no está
aquí hace fallar CI, y una fila cuya ruta ya tiene pantalla también —para que se
la quite de la tabla quien la conectó, en vez de que la lista se pudra.

> **Antes de escribir un módulo nuevo, míralo aquí.** Es el hueco G-14.

## Lo que hay debajo del número

Tres cosas que sólo se ven leyendo las rutas una a una:

**1. La capa de failover de precios está construida y desconectada.**
`market_data.py` (329 líneas, con cortacircuitos, cuota por proveedor y
`stale`/`as_of`) existe para que el producto no dependa de Yahoo. Su propia
cabecera lo dice: *«the day Yahoo tightens its anti-bot, prices, watchlist,
alerts, option chains, IV rank, unusual activity and every calculator fed by live
price all go dark at once»*. Ese módulo se alcanzaba **sólo** por
`/api/quote/{symbol}` y `/api/admin/market-data-health`, y las dos estaban
muertas: el punto de fallo que el módulo se escribió para quitar seguía ahí, con
la solución al lado.

La mitad de diagnóstico ya está conectada —`MarketDataHealthCard` en el panel de
admin dice qué proveedor responde, cuál tiene el cortacircuito abierto y, sobre
todo, **si hay o no cadena de reserva**: con `FINNHUB_API_KEY` y
`TWELVEDATA_API_KEY` sin configurar, la cadena tiene un solo eslabón y el failover
es teórico. Falta la otra mitad, que es la de verdad: que los precios que ve el
usuario salgan de `/api/quote/{symbol}` en vez de `/api/stock/{symbol}`, con
`stale` y `as_of` pintados en la interfaz.

**2. El monedero de referidos se llena y no se puede ni ver ni gastar.**
`credit_referrer_for_payment` está enganchado a los tres caminos de cobro
(`server.py:4685`, `:4779`, `:4860`) y hace `$inc` sobre `referral_wallet`: es
dinero que el sistema debe, acumulándose ahora mismo. Las dos únicas rutas que
lo enseñan (`/referrals/me`) y lo gastan (`/referrals/redeem-credit`) están
muertas, y la de canjear además mentía dos veces —ver la fila `ARREGLAR`. En el
panel de admin hay una bandera `referrals` etiquetada «Wallet + leaderboard» y
`enabled: True` (`server.py:9269`).

**3. `POST /backtest` mete el apalancamiento en el P&L.**
`_run_real_backtest` calcula `move_pct = ((price − entry) / entry) × 100 × side ×
leverage` (`server.py:3956`), que es exactamente el invariante que este
repositorio tiene escrito en mayúsculas. Y el P&L que devuelve no sale del
movimiento del precio sino de `balance × 2% × (move_pct / stop_loss_pct)`
recortado a una banda: una curva de equity inventada, etiquetada
`data_source: "yfinance"`. `profit_factor` se calcula encima con otra definición
distinta —`(wins × TP)/(losses × SL)`, como si toda ganancia cerrara justo en el
objetivo— y vale `0.0` cuando no hay pérdidas, que es indefinido, no cero. Lo
que hace bien esta ruta ya lo hace `POST /backtest/validate` sobre
`backtest.py`, con hold-out y walk-forward.

## Las decisiones

`BORRAR` — la ruta sobra: hay otra viva que hace lo mismo, o lo que hace está mal.
`CONSTRUIR` — el backend está terminado y lo que falta es la pantalla (G-14).
`ARREGLAR` — hay que tocar el backend antes de poder enseñarla.

### BORRAR (14)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `POST` | `/api/journal/trades` | BORRAR | Duplicado de `POST /api/performance/trades`, que sí usa `performanceApi.js`. Escriben en la **misma** colección `db.trades` (`server.py:2859`) y su propio docstring ya dice «⚠️ OBSOLETO» por el BUG-039. Segunda puerta autenticada al mismo dato. |
| `GET` | `/api/journal/trades` | BORRAR | Duplicado de `GET /api/performance/trades`. |
| `PUT` | `/api/journal/trades/{trade_id}` | BORRAR | Duplicado de `PUT /api/performance/trades/{trade_id}`. `tests/e2e/api/autorizacion.py` la llama «la ruta legada, que es otra puerta al mismo dato» y comprueba que también esté cerrada: quitar la puerta es mejor que comprobar el cerrojo. |
| `DELETE` | `/api/journal/trades/{trade_id}` | BORRAR | Ídem. |
| `POST` | `/api/backtest` | BORRAR | Mete el apalancamiento en el P&L y devuelve una curva de equity inventada con etiqueta de datos reales (ver §3 arriba). Superada por `POST /backtest/validate`. |
| `POST` | `/api/monte-carlo` | BORRAR | La simulación vive en el cliente (`frontend/src/lib/simulator/engine.js`, verificada por `engine-check.js`) y es la que ve el usuario. Además la del backend la cobra como premium mientras la del cliente es gratis: dos productos distintos para el mismo botón. |
| `GET` | `/api/ohlc-universal/{symbol}` | BORRAR | Copia casi literal de `GET /api/ohlc/{symbol}` en otro fichero. Dos implementaciones de la misma cascada Binance→yfinance. |
| `GET` | `/api/forex-prices` | BORRAR | Divisas del BCE con una tabla estática de reserva. El frontend pide precios por `/prices` y `/api/stock/{symbol}`; esto no pasa por `market_data`, así que ni cachea ni falla con `stale`. |
| `GET` | `/api/indices-prices` | BORRAR | `yf.download` directo de seis índices. Mismo motivo. |
| `GET` | `/api/commodities-prices` | BORRAR | Ídem, con una conversión EUR/USD escrita a mano (`eur_usd = 0.917`) como reserva. |
| `POST` | `/api/alerts/send-email` | BORRAR | Relé de SendGrid pedido desde el navegador. El aviso de una alerta que salta ya lo manda el poller por `notifications.py`, que es donde tiene que estar. |
| `GET` | `/api/referrals/leaderboard` | BORRAR | `AdminPage.jsx:2536` usa `GET /api/admin/referrals/leaderboard`, de `admin_routes.py`. Esta es la segunda. |
| `POST` | `/api/subscriptions/change-plan-legacy` | BORRAR | Su docstring: «[Legacy stub] superseded by `/subscriptions/change-plan`». No cambia el plan: devuelve un mensaje diciendo qué ruta usar. |
| `GET` | `/api/user-states/list` | BORRAR | «List all saved states for debugging». |

### CONSTRUIR (21)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `GET` | `/api/quote/{symbol}` | CONSTRUIR | **La más urgente.** Única puerta a `market_data.py` desde el navegador. Devuelve `stale` y `as_of`, y la UI *debe* pintarlos: enseñar un precio viejo como si fuera de ahora es un problema legal en un sitio de finanzas. |
| `GET` | `/api/performance/export` | CONSTRUIR | CSV y Excel del diario, con filtros por estado, símbolo y fechas. Un botón. Es lo que más se pide y lo más barato de la lista. |
| `POST` | `/api/performance/portfolio-risk` | CONSTRUIR | Riesgo de cuenta: calor abierto, correlación y estado de los límites de pérdida (`portfolio_risk.py`). Todo lo demás del diario razona operación a operación; esto es la vista que un prop trader mira primero. |
| `POST` | `/api/calculate/volatility-size` | CONSTRUIR | Tamaño de posición por ATR. Sin esto, 1R no significa lo mismo entre instrumentos y las estadísticas por R no son comparables. |
| `POST` | `/api/backtest/validate` | CONSTRUIR | `backtest.py` (643 líneas): hold-out evaluado una sola vez y walk-forward. Es la parte que responde «¿esto tiene ventaja o la he encontrado de tanto mirar?». |
| `GET` | `/api/backtest/strategies` | CONSTRUIR | Los juegos de reglas y sus rejillas de parámetros. Va con la anterior. |
| `POST` | `/api/calculate/american` | CONSTRUIR | `american_options.py`: precio americano, prima de ejercicio anticipado y griegas de árbol. Toda opción listada sobre acción estadounidense es americana, así que la diferencia con el Black-Scholes del resto de la app no es un redondeo. |
| `POST` | `/api/calculate/implied-volatility` | CONSTRUIR | Despeja la IV desde el precio de mercado. Sin esto la app se traga la IV que le dé el proveedor, que en strikes ilíquidos es basura o un 0.30 por defecto. Devuelve `null` cuando ninguna volatilidad reproduce el precio. |
| `GET` | `/api/options/term-structure/{symbol}` | CONSTRUIR | IV ATM por vencimiento: contango o backwardation. La app enseña el skew entre strikes y nunca la curva en el tiempo, que es la primera pregunta de quien vende prima. |
| `GET` | `/api/education/pattern-catalog` | CONSTRUIR | La enciclopedia completa de velas con fiabilidad y ranking. La academia ya usa `pattern-scan`; el catálogo es la pieza de referencia que le falta. |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | CONSTRUIR | Del cálculo guardado a una operación del diario, con los campos ya rellenos. Une dos partes del producto que hoy no se hablan. |
| `GET` | `/api/portfolio` | CONSTRUIR | La cartera (activos, no operaciones). `PricingPage.jsx:505` lleva un comentario de cuando «Rebalanceo de cartera» estaba anunciado en el plan de pago sin existir: se quitó de la página, y esta es la deuda que dejó. |
| `POST` | `/api/portfolio` | CONSTRUIR | Ídem — alta de activo. |
| `PUT` | `/api/portfolio/{asset_id}` | CONSTRUIR | Ídem — edición. |
| `DELETE` | `/api/portfolio/{asset_id}` | CONSTRUIR | Ídem — baja. |
| `GET` | `/api/portfolio/rebalance` | CONSTRUIR | Sugerencias de rebalanceo cruzando la cartera con el rendimiento por símbolo del diario. Es la función que se anunciaba. |
| `GET` | `/api/ohlc/{symbol}` | CONSTRUIR | OHLC universal (Binance para cripto, yfinance para el resto). Hoy las velas llegan incrustadas en las respuestas del escáner; esta es la puerta para pedirlas sueltas. |
| `GET` | `/api/plans` | CONSTRUIR | `SUBSCRIPTION_PLANS` del backend, que es lo que de verdad se cobra. El mismo precio está escrito a mano en `PLANS_DATA` de `PricingPage.jsx` **y** como clave i18n (`monthlyPrice: "€17"`, `lifetimePrice: "€500"`…) en los **10 idiomas**: doce sitios para un número, y el que manda al cobrar es el único que la página no consulta. Subir un precio hoy es editar doce ficheros y confiar en no olvidar ninguno. |
| `POST` | `/api/subscriptions/change-plan` | CONSTRUIR | Subida o bajada de plan con prorrateo real de Stripe. No hay ninguna pantalla de cambio de plan; hoy sólo se puede cancelar. |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | CONSTRUIR | Reembolso por Stripe desde el panel. La política de reembolso de 14 días está publicada en los términos legales y se ejecuta a mano. |
| `GET` | `/api/alerts/realtime/status` | CONSTRUIR | Estado del poller de alertas en vivo: si corre, cuántos conectados, antigüedad de la caché. Diagnóstico para el panel. |

### ARREGLAR (2)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `POST` | `/api/referrals/redeem-credit` | ARREGLAR | **Hecho.** Devolvía un `available_after` restado de un saldo que no bajaba (`referral_wallet_redeemed` no se incrementaba nunca) y escribía `pending_referral_credit` diciendo «aplicado al próximo checkout» cuando no lo lee nadie. Ahora responde 501 mientras `CHECKOUT_APLICA_CREDITO` sea False, no escribe nada al hacerlo, y el `$inc` está puesto para el día que se active. `test_referrals_credito_unit.py` comprueba que la constante concuerde con el código. |
| `GET` | `/api/referrals/me` | ARREGLAR | Es la única forma de ver un saldo que se está acumulando. Ya devuelve `redeemable` para que ninguna pantalla pinte un botón que da 501. Falta decidir dónde vive: lo natural es una tarjeta en `AffiliatePage`, que ya existe y ya tiene su propio programa al lado. |

## Las 5 huérfanas por diseño

`GET /api/health` la llama Cloud Run; `POST /api/webhook/stripe` y
`/api/webhook/stripe/subscription` los llama la pasarela; `GET
/api/admin/connectors/status` y `POST /api/admin/set-plan` son del panel de
admin. No están en la tabla y `check-rutas-muertas.py` no las pide: el detector
las separa solo, por su prefijo y por el fichero en que viven.
