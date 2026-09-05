# 🗺️ Mapa del repositorio

> **Fichero generado. No lo edites a mano.**
> Sale de `python scripts/gen-mapa.py`, y `--check` falla en CI si se queda atrás.
>
> Existe porque las cifras escritas a mano se desvían sin que nadie se entere: el
> 2026-08-13 la documentación decía 24 módulos cuando había 28. Aquí no puede pasar:
> si el código cambia y el mapa no, el build rompe.
>
> No lleva fecha de generación a propósito — la llevaría cada día y `--check`
> fallaría solo, hasta que el aviso dejara de significar nada.

## Resumen

| | |
|---|---:|
| Módulos del backend | 36 |
| Líneas de Python (backend) | 28,486 |
| Rutas declaradas | 205 |
| **Rutas sin consumidor en el frontend** | **53** |
| Ficheros de test · funciones de test | 69 · 1147 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,428 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9536` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4293` |
| `GET` | `/api/auth/admin-status` | `backend/server.py:3657` |
| `POST` | `/api/calculate/american` | `backend/server.py:6577` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:6461` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8296` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:839` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7607` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4402` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3864` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6359` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:776` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:8254` |
| `GET` | `/api/plans` | `backend/server.py:4465` |
| `GET` | `/api/portfolio` | `backend/server.py:4051` |
| `POST` | `/api/portfolio` | `backend/server.py:4059` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:4099` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:4092` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:4081` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:10050` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:468` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5723` |

### Huérfanas por diseño (26)

| Método | Ruta | Por qué |
|---|---|---|
| `GET` | `/api/campaigns` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/campaigns` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/campaigns/{campaign_id}/send` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/churn-surveys` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/churn-surveys/{survey_id}/follow-up` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/cohorts` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/connectors/status` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/errors` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/errors/{error_id}/resolve` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/gdpr-exports` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/gdpr-exports/{export_id}/deliver` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/health` | infra — sonda de salud |
| `GET` | `/api/i18n` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/i18n` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/maintenance` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/maintenance` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/plans` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/plans/{plan_id}` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/rate-limits` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/referrals` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/referrals/leaderboard` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/set-plan` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/users/{user_id}` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/users/{user_id}/payments` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/webhook/stripe` | externo — lo llama la pasarela de pago |
| `POST` | `/api/webhook/stripe/subscription` | externo — lo llama la pasarela de pago |

## Módulos del backend

| Módulo | Líneas | Rutas | Responsabilidad |
|---|---:|---:|---|
| `server.py` | 10,493 | 143 | — |
| `performance.py` | 1,844 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,265 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 970 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 875 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `brokers_referidos.py` | 814 |  | Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar. |
| `stock_data.py` | 745 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_math.py` | 744 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 633 |  | Options Strategy Optimizer. |
| `referrals.py` | 626 | 7 | referrals.py — Referral / Affiliate program API. |
| `candle_patterns.py` | 604 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `realtime_alerts.py` | 425 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `performance_metrics.py` | 422 |  | Advanced performance & risk metrics — the professional-grade gap. |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
| `options_positioning.py` | 371 |  | Positioning metrics derived from open interest: max pain, GEX, OI profile, |
| `market_data.py` | 330 |  | Multi-provider market data layer with failover, caching and circuit breakers. |
| `portfolio_risk.py` | 327 |  | Account-level risk — heat, correlation, loss limits, volatility sizing. |
| `level_features.py` | 323 |  | Los rasgos del montaje, tal y como se veían EN esa barra y no después. |
| `timeframes.py` | 303 |  | The timeframe ladder for the price-action scanners (structure + patterns). |
| `american_options.py` | 283 |  | American option pricing — early exercise, which Black-Scholes cannot see. |
| `crypto_data.py` | 257 |  | Precios de criptomonedas desde las propias bolsas. |
| `passkeys.py` | 251 |  | Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña. |
| `revolut.py` | 216 |  | Revolut — Revolut Pay / Merchant API integration (order + webhook helpers). |
| `market_rates.py` | 214 |  | Live risk-free rate. |
| `notifications.py` | 213 |  | notifications.py — un aviso, tres canales, y la verdad sobre cuáles funcionan. |
| `migrate_email_normalizado.py` | 191 |  | Normaliza a minúsculas los emails ya almacenados en `db.users`. |
| `nowpayments.py` | 182 |  | NOWPayments — crypto payment gateway integration (invoice + IPN helpers). |
| `migrate_trades_schema.py` | 169 |  | Migra los documentos del diario legado (camelCase) al esquema canónico. |
| `ecb_rates.py` | 145 |  | Tipos de cambio del Banco Central Europeo. |
| `log_seguro.py` | 55 |  | Un valor de fuera, apto para meter en una línea de log. |
| `csv_seguro.py` | 53 |  | Neutraliza la inyección de fórmulas en cualquier CSV que generemos. |

## Rutas de la API

Todas cuelgan de `/api` (`api_router = APIRouter(prefix="/api")`).
La columna **Front** dice si algún fichero del frontend la menciona.

### `backend/admin_routes.py` — 25 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/campaigns` | 666 | ❌ |
| `POST` | `/campaigns` | 672 | ❌ |
| `POST` | `/campaigns/{campaign_id}/send` | 707 | ❌ |
| `GET` | `/churn-surveys` | 844 | ❌ |
| `POST` | `/churn-surveys/{survey_id}/follow-up` | 860 | ❌ |
| `GET` | `/cohorts` | 882 | ❌ |
| `GET` | `/connectors/status` | 555 | ❌ |
| `GET` | `/errors` | 1083 | ❌ |
| `POST` | `/errors/{error_id}/resolve` | 1109 | ❌ |
| `GET` | `/gdpr-exports` | 1160 | ❌ |
| `POST` | `/gdpr-exports/{export_id}/deliver` | 1170 | ❌ |
| `GET` | `/i18n` | 776 | ❌ |
| `POST` | `/i18n` | 805 | ❌ |
| `GET` | `/maintenance` | 1054 | ❌ |
| `POST` | `/maintenance` | 1067 | ❌ |
| `GET` | `/plans` | 978 | ❌ |
| `POST` | `/plans/{plan_id}` | 1003 | ❌ |
| `GET` | `/public/settings` | 1250 | ✅ |
| `GET` | `/rate-limits` | 1135 | ❌ |
| `GET` | `/referrals` | 925 | ❌ |
| `GET` | `/referrals/leaderboard` | 947 | ❌ |
| `POST` | `/set-plan` | 415 | ❌ |
| `POST` | `/settings` | 491 | ✅ |
| `POST` | `/users/{user_id}` | 443 | ❌ |
| `GET` | `/users/{user_id}/payments` | 823 | ❌ |

### `backend/affiliate_program.py` — 18 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/affiliates` | 459 | ✅ |
| `POST` | `/admin/affiliates/payout-lines/{lid}/mark-paid` | 742 | ✅ |
| `GET` | `/admin/affiliates/payout-requests` | 764 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/mark-paid` | 775 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/reject` | 789 | ✅ |
| `POST` | `/admin/affiliates/payout-run` | 615 | ✅ |
| `POST` | `/admin/affiliates/payout-run/{rid}/finalize` | 700 | ✅ |
| `GET` | `/admin/affiliates/payout-runs` | 724 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}` | 731 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}/export.csv` | 799 | ✅ |
| `PATCH` | `/admin/affiliates/{aid}` | 598 | ✅ |
| `POST` | `/admin/affiliates/{aid}/approve` | 583 | ✅ |
| `POST` | `/admin/affiliates/{aid}/reject` | 588 | ✅ |
| `POST` | `/admin/affiliates/{aid}/suspend` | 593 | ✅ |
| `POST` | `/affiliate/apply` | 278 | ✅ |
| `GET` | `/affiliate/me` | 320 | ✅ |
| `PUT` | `/affiliate/payout-details` | 396 | ✅ |
| `POST` | `/affiliate/request-payout` | 415 | ✅ |

### `backend/missing_apis.py` — 9 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `POST` | `/auth/send-verification-email` | 429 | ✅ |
| `POST` | `/auth/verify-email` | 460 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 839 | ❌ |
| `GET` | `/commodities-prices` | 281 | ❌ |
| `GET` | `/forex-prices` | 188 | ❌ |
| `GET` | `/indices-prices` | 225 | ❌ |
| `GET` | `/performance/export` | 776 | ❌ |
| `POST` | `/subscriptions/change-plan` | 494 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 613 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 402 | ✅ |
| `GET` | `/alerts/realtime/status` | 386 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 314 | ✅ |

### `backend/referrals.py` — 7 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/referrals/payout-requests` | 531 | ✅ |
| `POST` | `/admin/referrals/payout-requests/{rid}/mark-paid` | 551 | ✅ |
| `POST` | `/admin/referrals/payout-requests/{rid}/reject` | 582 | ✅ |
| `GET` | `/referrals/me` | 178 | ✅ |
| `POST` | `/referrals/redeem-credit` | 468 | ❌ |
| `POST` | `/referrals/request-payout` | 420 | ✅ |
| `POST` | `/referrals/track` | 238 | ✅ |

### `backend/server.py` — 143 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5738 | ✅ |
| `GET` | `/admin/audit-log` | 9469 | ✅ |
| `GET` | `/admin/coupons` | 10187 | ✅ |
| `POST` | `/admin/coupons` | 10193 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 10216 | ✅ |
| `GET` | `/admin/feature-flags` | 10236 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 10245 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9506 | ✅ |
| `GET` | `/admin/market-data-health` | 10030 | ✅ |
| `GET` | `/admin/metrics` | 8695 | ✅ |
| `POST` | `/admin/payments/manual` | 9844 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9688 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9984 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9776 | ✅ |
| `POST` | `/admin/promote` | 8743 | ✅ |
| `GET` | `/admin/revenue` | 9569 | ✅ |
| `GET` | `/admin/settings` | 9214 | ✅ |
| `PUT` | `/admin/settings` | 9242 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9536 | ❌ |
| `GET` | `/admin/usage` | 10066 | ✅ |
| `GET` | `/admin/usage-heatmap` | 10133 | ✅ |
| `GET` | `/admin/users` | 8595 | ✅ |
| `POST` | `/admin/users` | 8817 | ✅ |
| `GET` | `/admin/users.csv` | 8665 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8931 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8862 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8966 | ✅ |
| `GET` | `/admin/webhooks` | 10260 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10266 | ✅ |
| `GET` | `/alerts` | 4167 | ✅ |
| `POST` | `/alerts` | 4153 | ✅ |
| `POST` | `/alerts/send-email` | 4293 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 4175 | ✅ |
| `POST` | `/analytics/track` | 10106 | ✅ |
| `POST` | `/auth/2fa/disable` | 3098 | ✅ |
| `POST` | `/auth/2fa/enable` | 3079 | ✅ |
| `POST` | `/auth/2fa/setup` | 3063 | ✅ |
| `POST` | `/auth/2fa/verify` | 3116 | ✅ |
| `DELETE` | `/auth/account` | 3375 | ✅ |
| `GET` | `/auth/admin-status` | 3657 | ❌ |
| `POST` | `/auth/change-password` | 3011 | ✅ |
| `POST` | `/auth/forgot-password` | 2948 | ✅ |
| `POST` | `/auth/google` | 3496 | ✅ |
| `POST` | `/auth/login` | 2440 | ✅ |
| `POST` | `/auth/logout` | 2606 | ✅ |
| `POST` | `/auth/magic-link` | 2744 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2793 | ✅ |
| `GET` | `/auth/me` | 2572 | ✅ |
| `GET` | `/auth/my-data` | 3401 | ✅ |
| `GET` | `/auth/passkey/available` | 3204 | ✅ |
| `GET` | `/auth/passkey/list` | 3340 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3264 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3275 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3211 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3229 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3346 | ✅ |
| `POST` | `/auth/profile` | 3730 | ✅ |
| `PUT` | `/auth/profile` | 3731 | ✅ |
| `POST` | `/auth/refresh` | 2652 | ✅ |
| `POST` | `/auth/register` | 2368 | ✅ |
| `POST` | `/auth/reset-password` | 2977 | ✅ |
| `GET` | `/backtest/strategies` | 8232 | ✅ |
| `POST` | `/backtest/validate` | 8161 | ✅ |
| `POST` | `/billing/create-portal-session` | 5535 | ✅ |
| `GET` | `/billing/history` | 5570 | ✅ |
| `GET` | `/brokers` | 9332 | ✅ |
| `POST` | `/calculate/american` | 6577 | ❌ |
| `POST` | `/calculate/assignment` | 6521 | ✅ |
| `POST` | `/calculate/greeks` | 6490 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 6217 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6461 | ❌ |
| `POST` | `/calculate/payoff` | 6407 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6500 | ✅ |
| `POST` | `/calculate/volatility-size` | 8296 | ❌ |
| `GET` | `/calculations` | 4448 | ✅ |
| `POST` | `/calculations` | 4435 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4456 | ✅ |
| `POST` | `/checkout/create` | 4677 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4843 | ✅ |
| `POST` | `/education/assistant` | 7328 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7734 | ✅ |
| `GET` | `/education/pattern-catalog` | 7607 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7614 | ✅ |
| `GET` | `/education/scan-timeframes` | 7600 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7667 | ✅ |
| `GET` | `/health` | 5742 | ❌ |
| `GET` | `/journal/stats` | 4033 | ✅ |
| `GET` | `/market/risk-free` | 6441 | ✅ |
| `POST` | `/monte-carlo` | 4402 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3864 | ❌ |
| `POST` | `/optimize` | 6635 | ✅ |
| `POST` | `/options/ai-analyze` | 7216 | ✅ |
| `GET` | `/options/chain/{symbol}` | 6145 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6688 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 6041 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6862 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6235 | ✅ |
| `GET` | `/options/market-flow` | 7476 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6293 | ✅ |
| `GET` | `/options/positions` | 6756 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6775 | ✅ |
| `POST` | `/options/positions/save` | 6738 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6765 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6359 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6995 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4865 | ✅ |
| `GET` | `/performance/analytics` | 8314 | ✅ |
| `GET` | `/performance/instruments` | 7974 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8254 | ❌ |
| `GET` | `/performance/trades` | 8045 | ✅ |
| `POST` | `/performance/trades` | 7987 | ✅ |
| `POST` | `/performance/trades/bulk` | 8010 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 8133 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 8070 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 8083 | ✅ |
| `GET` | `/plan` | 8465 | ✅ |
| `POST` | `/plan` | 8493 | ✅ |
| `GET` | `/plan/compliance` | 8528 | ✅ |
| `PATCH` | `/plan/draft` | 8517 | ✅ |
| `GET` | `/plan/history` | 8474 | ✅ |
| `GET` | `/plans` | 4465 | ❌ |
| `GET` | `/portfolio` | 4051 | ❌ |
| `POST` | `/portfolio` | 4059 | ❌ |
| `GET` | `/portfolio/rebalance` | 4099 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 4092 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 4081 | ❌ |
| `GET` | `/prices` | 3775 | ✅ |
| `GET` | `/public/settings` | 9312 | ✅ |
| `GET` | `/quote/{symbol}` | 10050 | ❌ |
| `GET` | `/stock/{symbol}` | 5904 | ✅ |
| `POST` | `/subscriptions/cancel` | 5430 | ✅ |
| `GET` | `/subscriptions/current` | 5382 | ✅ |
| `POST` | `/subscriptions/resume` | 5489 | ✅ |
| `GET` | `/tickers/search` | 6011 | ✅ |
| `GET` | `/tickers/universal-search` | 6024 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5699 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5682 | ✅ |
| `GET` | `/user-states/list` | 5723 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5712 | ✅ |
| `POST` | `/user-states/save` | 5615 | ✅ |
| `POST` | `/webhook/nowpayments` | 5300 | ✅ |
| `POST` | `/webhook/revolut` | 5206 | ✅ |
| `POST` | `/webhook/stripe` | 5041 | ❌ |

## Frontend

### Rutas declaradas en `App.js` (29)

| Ruta | Componente |
|---|---|
| `*` | `NotFoundPage` |
| `/` | `LandingPage` |
| `/about` | `AboutPage` |
| `/admin` | `ProtectedRoute` |
| `/affiliate` | `ProtectedRoute` |
| `/backtesting` | `BacktestingPage` |
| `/brokers` | `BrokersPage` |
| `/contact` | `ContactPage` |
| `/dashboard` | `ProtectedRoute` |
| `/education` | `ProtectedRoute` |
| `/forgot-password` | `ForgotPasswordPage` |
| `/legal` | `LegalPage` |
| `/login` | `LoginPage` |
| `/magic` | `MagicPage` |
| `/news` | `ProtectedRoute` |
| `/options` | `ProtectedRoute` |
| `/options/calculator` | `ProtectedRoute` |
| `/options/strategies` | `ProtectedRoute` |
| `/options/strategies/:slug` | `ProtectedRoute` |
| `/payment/cancel` | `PaymentCancelPage` |
| `/payment/success` | `PaymentSuccessPage` |
| `/performance` | `ProtectedRoute` |
| `/plan` | `ProtectedRoute` |
| `/pricing` | `PricingPage` |
| `/register` | `RegisterPage` |
| `/reset-password` | `ResetPasswordPage` |
| `/settings` | `ProtectedRoute` |
| `/subscription` | `ProtectedRoute` |
| `/verify-email` | `VerifyEmailPage` |

### Carpetas

| Carpeta | Ficheros | Líneas |
|---|---:|---:|
| `components/affiliate/` | 1 | 209 |
| `components/auth/` | 3 | 291 |
| `components/backtesting/` | 1 | 175 |
| `components/brokers/` | 1 | 240 |
| `components/calculators/` | 17 | 5,023 |
| `components/calculators/simulator/` | 6 | 1,437 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,706 |
| `components/common/` | 13 | 2,527 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 88 | 14,669 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 600 |
| `components/layout/` | 2 | 577 |
| `components/options/` | 36 | 8,011 |
| `components/performance/` | 8 | 3,892 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 317 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 31 | 1,763 |
| `pages/` | 23 | 17,572 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,493 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,935 |
| `frontend/src/lib/i18n/de.js` | 4,935 |
| `frontend/src/lib/i18n/en.js` | 4,935 |
| `frontend/src/lib/i18n/es.js` | 4,935 |
| `frontend/src/lib/i18n/fr.js` | 4,935 |
| `frontend/src/lib/i18n/it.js` | 4,935 |
| `frontend/src/lib/i18n/ja.js` | 4,935 |
| `frontend/src/lib/i18n/pt.js` | 4,935 |
| `frontend/src/lib/i18n/ru.js` | 4,935 |
| `frontend/src/lib/i18n/zh.js` | 4,935 |

## Verificadores del repositorio

| Comando | Comprueba |
|---|---|
| `cd backend && python -m py_compile *.py` | Que compilan los módulos |
| `cd backend && pytest tests/ -q` | Los tests (integración se salta sin `BACKEND_URL`) |
| `cd frontend && npx eslint src scripts` | Lint (0 errores) |
| `cd frontend && node scripts/i18n-check.js` | Paridad de los idiomas |
| `cd frontend && node scripts/engine-check.js` | Motor del simulador e instrumentos |
| `cd frontend && node scripts/check-fetch-credentials.js` | Que todo fetch lleva credenciales |
| `python scripts/gen-instruments-js.py --check` | Catálogo backend ↔ frontend |
| `python scripts/gen-mapa.py --check` | Que este mapa refleja el código |
| `python scripts/check-doc-links.py` | Que los enlaces de la doc resuelven |

