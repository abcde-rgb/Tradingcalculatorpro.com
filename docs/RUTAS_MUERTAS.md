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

Tres cosas que sólo se ven leyendo las rutas una a una. La 1 y la 3 ya están
resueltas; la 2 sigue abierta y es dinero.

**1. La capa de failover de precios estaba construida y desconectada.** *(resuelto)*
`market_data.py` (329 líneas, con cortacircuitos, cuota por proveedor y
`stale`/`as_of`) existe para que el producto no dependa de Yahoo. Su propia
cabecera lo dice: *«the day Yahoo tightens its anti-bot, prices, watchlist,
alerts, option chains, IV rank, unusual activity and every calculator fed by live
price all go dark at once»*. Ese módulo se alcanzaba **sólo** por
`/api/quote/{symbol}` y `/api/admin/market-data-health`, y las dos estaban
muertas: el punto de fallo que el módulo se escribió para quitar seguía ahí, con
la solución al lado.

**Resuelto el 2026-08-22, y no por donde parecía.** Cambiar la URL que llama el
frontend habría movido el problema: `/api/quote/{symbol}` devuelve precio y
cierre anterior, y `/api/stock/{symbol}` devuelve además nombre largo, 52
semanas, sector y volumen formateado, con nombres en camelCase que la interfaz
ya consume. Lo que hacía falta no era otra URL, era el failover — así que **la
cadena se enchufó a la ruta viva**: Yahoo sigue siendo el primario (es el único
con la ficha completa) y la cascada entra **cuando Yahoo no devuelve precio**,
que es exactamente el caso que antes acababa en un error. Lo heredan de golpe la
watchlist, las cadenas de opciones, el IV rank, las alertas y todas las
calculadoras alimentadas por precio.

Con ello van las dos mitades que el módulo exige en su cabecera —*«A price we
could not refresh is returned with stale=True and as_of. The caller MUST surface
it»*—: la respuesta arrastra `stale`, `as_of` y `source`, y la interfaz los
pinta. El «LIVE» verde del panel de opciones estaba **escrito a mano** y se
pintaba igual con un precio de hace un segundo que con uno de ayer; ahora sale de
`stock.stale`, y con un precio sin refrescar es ámbar, sin el punto que palpita
—lo que palpita dice «esto se está actualizando», que es justo lo que no pasa— y
con la antigüedad al lado.

Y la mitad de diagnóstico ya estaba: `MarketDataHealthCard` en el panel de admin
dice qué proveedor responde, cuál tiene el cortacircuito abierto y, sobre todo,
**si hay o no cadena de reserva** — con `FINNHUB_API_KEY` y `TWELVEDATA_API_KEY`
sin configurar la cascada tiene un solo eslabón y el failover es teórico. Eso es
ahora una tarea de operaciones, no de código.

**2. El monedero de referidos se llena y no se puede ni ver ni gastar.**
`credit_referrer_for_payment` está enganchado a los tres caminos de cobro
(`server.py:4685`, `:4779`, `:4860`) y hace `$inc` sobre `referral_wallet`: es
dinero que el sistema debe, acumulándose ahora mismo. Las dos únicas rutas que
lo enseñan (`/referrals/me`) y lo gastan (`/referrals/redeem-credit`) están
muertas, y la de canjear además mentía dos veces —ver la fila `ARREGLAR`. En el
panel de admin hay una bandera `referrals` etiquetada «Wallet + leaderboard» y
`enabled: True` (`server.py:9269`).

**3. `POST /backtest` metía el apalancamiento en el P&L.** *(retirada)*
`_run_real_backtest` calculaba `move_pct = ((price − entry) / entry) × 100 × side
× leverage`, que es exactamente el invariante que este repositorio tiene escrito
en mayúsculas. Y el P&L que devolvía no salía del movimiento del precio sino de
`balance × 2% × (move_pct / stop_loss_pct)` recortado a una banda: una curva de
equity inventada, etiquetada `data_source: "yfinance"`. `profit_factor` se
calculaba encima con otra definición distinta —`(wins × TP)/(losses × SL)`, como
si toda ganancia cerrara justo en el objetivo— y valía `0.0` cuando no había
pérdidas, que es indefinido, no cero. Se llevó por delante también
`_simulate_backtest_trades`, que multiplicaba igual por la palanca y **no la
llamaba nadie**. Lo que esa ruta hacía bien ya lo hace `POST /backtest/validate`
sobre `backtest.py`, con hold-out y walk-forward.

## Las 8 bajas del 2026-08-22

De las 14 marcadas `BORRAR`, se ejecutaron las **8 cuyo sucesor estaba escrito en
el propio código** —no hacía falta decidir nada de producto, sólo dejar de servir
dos veces lo mismo:

| Retirada | Quién hace ya su trabajo |
|---|---|
| `POST/GET/PUT/DELETE /api/journal/trades` | `…/performance/trades`, viva y consumida por `performanceApi.js`. Escribían en la **misma** colección `db.trades` con otro esquema: eso era el BUG-039, y su propio docstring ya ponía «⚠️ OBSOLETO». |
| `POST /api/subscriptions/change-plan-legacy` | `POST /api/subscriptions/change-plan`, que sí prorratea en Stripe. La legada sólo devolvía un mensaje diciendo cuál usar. |
| `POST /api/backtest` | `POST /api/backtest/validate` (§3 arriba). |
| `GET /api/ohlc-universal/{symbol}` | `GET /api/ohlc/{symbol}`, copia casi literal en otro fichero. |
| `GET /api/referrals/leaderboard` | `GET /api/admin/referrals/leaderboard`, que es la que llama `AdminPage.jsx:2536`. |

Con ellas se fueron los modelos y ayudantes que sólo ellas usaban (`TradeEntry`,
`TradeUpdate`, `_roe_pct`, `_run_real_backtest`, `_simulate_backtest_trades`,
`_ohlc_from_yfinance`, el proxy de admin de `referrals.py`): **~500 líneas**.

Lo que **no** se borró, y por qué importa la diferencia: la sonda de autorización
cruzada comprobaba que la puerta legada al diario también estuviera cerrada.
Ahora comprueba que **no haya puerta**, leyendo el `openapi.json` que publica el
propio servidor — pedirle un 404 a la ruta no valdría, porque FastAPI devuelve
404 igual para un camino inexistente que para una operación que no es tuya.

## Las decisiones

`BORRAR` — la ruta sobra: hay otra viva que hace lo mismo, o lo que hace está mal.
`CONSTRUIR` — el backend está terminado y lo que falta es la pantalla (G-14).
`ARREGLAR` — hay que tocar el backend antes de poder enseñarla.

### BORRAR — quedan 7 (8 ya retiradas el 2026-08-22)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `POST` | `/api/monte-carlo` | BORRAR | La simulación vive en el cliente (`frontend/src/lib/simulator/engine.js`, verificada por `engine-check.js`) y es la que ve el usuario. Además la del backend la cobra como premium mientras la del cliente es gratis: dos productos distintos para el mismo botón. |
| `GET` | `/api/forex-prices` | BORRAR | Divisas del BCE con una tabla estática de reserva. El frontend pide precios por `/prices` y `/api/stock/{symbol}`; esto no pasa por `market_data`, así que ni cachea ni falla con `stale`. |
| `GET` | `/api/indices-prices` | BORRAR | `yf.download` directo de seis índices. Mismo motivo. |
| `GET` | `/api/commodities-prices` | BORRAR | Ídem, con una conversión EUR/USD escrita a mano (`eur_usd = 0.917`) como reserva. |
| `POST` | `/api/alerts/send-email` | BORRAR | Relé de SendGrid pedido desde el navegador. El aviso de una alerta que salta ya lo manda el poller por `notifications.py`, que es donde tiene que estar. |
| `GET` | `/api/quote/{symbol}` | BORRAR | Era la única puerta a `market_data.py`, y por eso estaba marcada CONSTRUIR. Ya no lo es: desde el 2026-08-22 la cadena de reserva entra por `/api/stock/{symbol}`, que devuelve lo mismo **más** la ficha completa de Yahoo y con los nombres que la interfaz ya consume. Lo que queda aquí es la forma cruda de `_norm()` sin consumidor. |
| `GET` | `/api/user-states/list` | BORRAR | «List all saved states for debugging». |

> ✅ **Construidas el 2026-08-26**: `POST /api/backtest/validate` y
> `GET /api/backtest/strategies` ya tienen pantalla — la pestaña «Validación» de
> Performance (`components/performance/BacktestValidation.jsx`). Eran las dos
> filas más caras de esta lista: 643 líneas de hold-out, walk-forward y Deflated
> Sharpe escritas y sin puerta. `check-rutas-muertas.py` avisó de que habían
> dejado de estar muertas antes de que nadie tocara este fichero.

### CONSTRUIR (19)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `GET` | `/api/auth/admin-status` | CONSTRUIR | **Ya construida, y sin pantalla A PROPÓSITO** — es la excepción de esta tabla. Existe para abrirla con la URL cuando el panel NO te deja entrar: colgarla de una pantalla la haría inútil justo en el escenario para el que se escribió. Dice, sobre la cuenta que pregunta, si es admin, si tiene 2FA, en qué estado está el margen de alta y si hay palanca. Nació el 2026-09-01 tras tres rondas seguidas diagnosticando «el admin no funciona» a base de suposiciones: cuatro causas distintas —403 a la portada, 428 a Ajustes, panel vacío, panel caído— dan pantallas parecidas y desde fuera no se distinguen. **Un 404 aquí ya es un diagnóstico**: el backend no se ha desplegado. `require_user`, no consulta la base y no escribe; dos tests lo fijan. Lo pendiente es la pantalla, si algún día compensa |
| `GET` | `/api/performance/export` | CONSTRUIR | CSV y Excel del diario, con filtros por estado, símbolo y fechas. Un botón. Es lo que más se pide y lo más barato de la lista. |
| `POST` | `/api/performance/portfolio-risk` | CONSTRUIR | Riesgo de cuenta: calor abierto, correlación y estado de los límites de pérdida (`portfolio_risk.py`). Todo lo demás del diario razona operación a operación; esto es la vista que un prop trader mira primero. |
| `POST` | `/api/calculate/volatility-size` | CONSTRUIR | Tamaño de posición por ATR. Sin esto, 1R no significa lo mismo entre instrumentos y las estadísticas por R no son comparables. |
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

### ARREGLAR (1)

| Método | Ruta | Decisión | Por qué |
|---|---|---|---|
| `POST` | `/api/referrals/redeem-credit` | ARREGLAR | **Hecho.** Devolvía un `available_after` restado de un saldo que no bajaba (`referral_wallet_redeemed` no se incrementaba nunca) y escribía `pending_referral_credit` diciendo «aplicado al próximo checkout» cuando no lo lee nadie. Ahora responde 501 mientras `CHECKOUT_APLICA_CREDITO` sea False, no escribe nada al hacerlo, y el `$inc` está puesto para el día que se active. `test_referrals_credito_unit.py` comprueba que la constante concuerde con el código. |

## Las 5 huérfanas por diseño

`GET /api/health` la llama Cloud Run; `POST /api/webhook/stripe` y
`/api/webhook/stripe/subscription` los llama la pasarela; `GET
/api/admin/connectors/status` y `POST /api/admin/set-plan` son del panel de
admin. No están en la tabla y `check-rutas-muertas.py` no las pide: el detector
las separa solo, por su prefijo y por el fichero en que viven.
