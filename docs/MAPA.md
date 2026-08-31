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
| Módulos del backend | 35 |
| Líneas de Python (backend) | 27,108 |
| Rutas declaradas | 199 |
| **Rutas sin consumidor en el frontend** | **53** |
| Ficheros de test · funciones de test | 60 · 1025 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,359 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8884` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3738` |
| `POST` | `/api/calculate/american` | `backend/server.py:5975` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5859` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7662` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:804` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6973` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3820` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3309` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5757` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:741` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7620` |
| `GET` | `/api/plans` | `backend/server.py:3878` |
| `GET` | `/api/portfolio` | `backend/server.py:3496` |
| `POST` | `/api/portfolio` | `backend/server.py:3504` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3544` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3537` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3526` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9398` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:133` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:333` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5120` |

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
| `server.py` | 9,777 | 141 | — |
| `performance.py` | 1,820 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,223 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 935 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 875 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `brokers_referidos.py` | 814 |  | Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar. |
| `stock_data.py` | 745 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_math.py` | 736 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 608 |  | Options Strategy Optimizer. |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `performance_metrics.py` | 422 |  | Advanced performance & risk metrics — the professional-grade gap. |
| `referrals.py` | 414 | 3 | referrals.py — Referral / Affiliate program API. |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
| `realtime_alerts.py` | 385 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
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
| `GET` | `/campaigns` | 624 | ❌ |
| `POST` | `/campaigns` | 630 | ❌ |
| `POST` | `/campaigns/{campaign_id}/send` | 665 | ❌ |
| `GET` | `/churn-surveys` | 802 | ❌ |
| `POST` | `/churn-surveys/{survey_id}/follow-up` | 818 | ❌ |
| `GET` | `/cohorts` | 840 | ❌ |
| `GET` | `/connectors/status` | 513 | ❌ |
| `GET` | `/errors` | 1041 | ❌ |
| `POST` | `/errors/{error_id}/resolve` | 1067 | ❌ |
| `GET` | `/gdpr-exports` | 1118 | ❌ |
| `POST` | `/gdpr-exports/{export_id}/deliver` | 1128 | ❌ |
| `GET` | `/i18n` | 734 | ❌ |
| `POST` | `/i18n` | 763 | ❌ |
| `GET` | `/maintenance` | 1012 | ❌ |
| `POST` | `/maintenance` | 1025 | ❌ |
| `GET` | `/plans` | 936 | ❌ |
| `POST` | `/plans/{plan_id}` | 961 | ❌ |
| `GET` | `/public/settings` | 1208 | ✅ |
| `GET` | `/rate-limits` | 1093 | ❌ |
| `GET` | `/referrals` | 883 | ❌ |
| `GET` | `/referrals/leaderboard` | 905 | ❌ |
| `POST` | `/set-plan` | 373 | ❌ |
| `POST` | `/settings` | 449 | ✅ |
| `POST` | `/users/{user_id}` | 401 | ❌ |
| `GET` | `/users/{user_id}/payments` | 781 | ❌ |

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
| `POST` | `/calculations/{calc_id}/save-to-journal` | 804 | ❌ |
| `GET` | `/commodities-prices` | 281 | ❌ |
| `GET` | `/forex-prices` | 188 | ❌ |
| `GET` | `/indices-prices` | 225 | ❌ |
| `GET` | `/performance/export` | 741 | ❌ |
| `POST` | `/subscriptions/change-plan` | 494 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 595 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 368 | ✅ |
| `GET` | `/alerts/realtime/status` | 352 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 283 | ✅ |

### `backend/referrals.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/me` | 133 | ❌ |
| `POST` | `/referrals/redeem-credit` | 333 | ❌ |
| `POST` | `/referrals/track` | 180 | ✅ |

### `backend/server.py` — 141 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5135 | ✅ |
| `GET` | `/admin/audit-log` | 8817 | ✅ |
| `GET` | `/admin/coupons` | 9535 | ✅ |
| `POST` | `/admin/coupons` | 9541 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9564 | ✅ |
| `GET` | `/admin/feature-flags` | 9584 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9593 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8854 | ✅ |
| `GET` | `/admin/market-data-health` | 9378 | ✅ |
| `GET` | `/admin/metrics` | 8061 | ✅ |
| `POST` | `/admin/payments/manual` | 9192 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9036 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9332 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9124 | ✅ |
| `POST` | `/admin/promote` | 8109 | ✅ |
| `GET` | `/admin/revenue` | 8917 | ✅ |
| `GET` | `/admin/settings` | 8562 | ✅ |
| `PUT` | `/admin/settings` | 8590 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8884 | ❌ |
| `GET` | `/admin/usage` | 9414 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9481 | ✅ |
| `GET` | `/admin/users` | 7961 | ✅ |
| `POST` | `/admin/users` | 8183 | ✅ |
| `GET` | `/admin/users.csv` | 8031 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8297 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8228 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8332 | ✅ |
| `GET` | `/admin/webhooks` | 9608 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9614 | ✅ |
| `GET` | `/alerts` | 3612 | ✅ |
| `POST` | `/alerts` | 3598 | ✅ |
| `POST` | `/alerts/send-email` | 3738 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3620 | ✅ |
| `POST` | `/analytics/track` | 9454 | ✅ |
| `POST` | `/auth/2fa/disable` | 2666 | ✅ |
| `POST` | `/auth/2fa/enable` | 2647 | ✅ |
| `POST` | `/auth/2fa/setup` | 2631 | ✅ |
| `POST` | `/auth/2fa/verify` | 2684 | ✅ |
| `DELETE` | `/auth/account` | 2939 | ✅ |
| `POST` | `/auth/change-password` | 2582 | ✅ |
| `POST` | `/auth/forgot-password` | 2519 | ✅ |
| `POST` | `/auth/google` | 3056 | ✅ |
| `POST` | `/auth/login` | 2073 | ✅ |
| `POST` | `/auth/logout` | 2235 | ✅ |
| `POST` | `/auth/magic-link` | 2344 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2393 | ✅ |
| `GET` | `/auth/me` | 2203 | ✅ |
| `GET` | `/auth/my-data` | 2965 | ✅ |
| `GET` | `/auth/passkey/available` | 2770 | ✅ |
| `GET` | `/auth/passkey/list` | 2904 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2830 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2841 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2777 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2795 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2910 | ✅ |
| `POST` | `/auth/profile` | 3191 | ✅ |
| `POST` | `/auth/refresh` | 2258 | ✅ |
| `POST` | `/auth/register` | 2013 | ✅ |
| `POST` | `/auth/reset-password` | 2548 | ✅ |
| `GET` | `/backtest/strategies` | 7598 | ✅ |
| `POST` | `/backtest/validate` | 7527 | ✅ |
| `POST` | `/billing/create-portal-session` | 4932 | ✅ |
| `GET` | `/billing/history` | 4967 | ✅ |
| `GET` | `/brokers` | 8680 | ✅ |
| `POST` | `/calculate/american` | 5975 | ❌ |
| `POST` | `/calculate/assignment` | 5919 | ✅ |
| `POST` | `/calculate/greeks` | 5888 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5615 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5859 | ❌ |
| `POST` | `/calculate/payoff` | 5805 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5898 | ✅ |
| `POST` | `/calculate/volatility-size` | 7662 | ❌ |
| `GET` | `/calculations` | 3861 | ✅ |
| `POST` | `/calculations` | 3848 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3869 | ✅ |
| `POST` | `/checkout/create` | 4090 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4256 | ✅ |
| `POST` | `/education/assistant` | 6701 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7100 | ✅ |
| `GET` | `/education/pattern-catalog` | 6973 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6980 | ✅ |
| `GET` | `/education/scan-timeframes` | 6966 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7033 | ✅ |
| `GET` | `/health` | 5139 | ❌ |
| `GET` | `/journal/stats` | 3478 | ✅ |
| `GET` | `/market/risk-free` | 5839 | ✅ |
| `POST` | `/monte-carlo` | 3820 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3309 | ❌ |
| `POST` | `/optimize` | 6033 | ✅ |
| `POST` | `/options/ai-analyze` | 6598 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5543 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6086 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5439 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6260 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5633 | ✅ |
| `GET` | `/options/market-flow` | 6842 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5691 | ✅ |
| `GET` | `/options/positions` | 6154 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6173 | ✅ |
| `POST` | `/options/positions/save` | 6136 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6163 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5757 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6393 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4278 | ✅ |
| `GET` | `/performance/analytics` | 7680 | ✅ |
| `GET` | `/performance/instruments` | 7340 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7620 | ❌ |
| `GET` | `/performance/trades` | 7411 | ✅ |
| `POST` | `/performance/trades` | 7353 | ✅ |
| `POST` | `/performance/trades/bulk` | 7376 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7499 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7436 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7449 | ✅ |
| `GET` | `/plan` | 7831 | ✅ |
| `POST` | `/plan` | 7859 | ✅ |
| `GET` | `/plan/compliance` | 7894 | ✅ |
| `PATCH` | `/plan/draft` | 7883 | ✅ |
| `GET` | `/plan/history` | 7840 | ✅ |
| `GET` | `/plans` | 3878 | ❌ |
| `GET` | `/portfolio` | 3496 | ❌ |
| `POST` | `/portfolio` | 3504 | ❌ |
| `GET` | `/portfolio/rebalance` | 3544 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3537 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3526 | ❌ |
| `GET` | `/prices` | 3220 | ✅ |
| `GET` | `/public/settings` | 8660 | ✅ |
| `GET` | `/quote/{symbol}` | 9398 | ❌ |
| `GET` | `/stock/{symbol}` | 5302 | ✅ |
| `POST` | `/subscriptions/cancel` | 4827 | ✅ |
| `GET` | `/subscriptions/current` | 4779 | ✅ |
| `POST` | `/subscriptions/resume` | 4886 | ✅ |
| `GET` | `/tickers/search` | 5409 | ✅ |
| `GET` | `/tickers/universal-search` | 5422 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5096 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5079 | ✅ |
| `GET` | `/user-states/list` | 5120 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5109 | ✅ |
| `POST` | `/user-states/save` | 5012 | ✅ |
| `POST` | `/webhook/nowpayments` | 4697 | ✅ |
| `POST` | `/webhook/revolut` | 4603 | ✅ |
| `POST` | `/webhook/stripe` | 4438 | ❌ |

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
| `components/auth/` | 3 | 290 |
| `components/backtesting/` | 1 | 175 |
| `components/brokers/` | 1 | 230 |
| `components/calculators/` | 17 | 5,023 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,258 |
| `components/dashboard/` | 8 | 1,005 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 88 | 14,646 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 600 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 37 | 8,122 |
| `components/performance/` | 8 | 3,881 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 31 | 1,763 |
| `pages/` | 23 | 16,909 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,777 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,874 |
| `frontend/src/lib/i18n/de.js` | 4,874 |
| `frontend/src/lib/i18n/en.js` | 4,874 |
| `frontend/src/lib/i18n/es.js` | 4,874 |
| `frontend/src/lib/i18n/fr.js` | 4,874 |
| `frontend/src/lib/i18n/it.js` | 4,874 |
| `frontend/src/lib/i18n/ja.js` | 4,874 |
| `frontend/src/lib/i18n/pt.js` | 4,874 |
| `frontend/src/lib/i18n/ru.js` | 4,874 |
| `frontend/src/lib/i18n/zh.js` | 4,874 |

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

