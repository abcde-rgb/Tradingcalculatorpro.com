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
| Módulos del backend | 28 |
| Líneas de Python (backend) | 23,520 |
| Rutas declaradas | 202 |
| **Rutas sin consumidor en el frontend** | **51** |
| Ficheros de test · funciones de test | 45 · 761 |
| Rutas del frontend (`App.js`) | 27 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,339 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (41)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `GET` | `/api/admin/market-data-health` | `backend/server.py:8813` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8474` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3612` |
| `POST` | `/api/backtest` | `backend/server.py:3901` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7393` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7323` |
| `POST` | `/api/calculate/american` | `backend/server.py:5910` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5794` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7457` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6838` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3188` |
| `POST` | `/api/journal/trades` | `backend/server.py:3166` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3253` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3218` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3694` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3073` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5692` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7415` |
| `GET` | `/api/plan` | `backend/server.py:7626` |
| `POST` | `/api/plan` | `backend/server.py:7654` |
| `GET` | `/api/plan/compliance` | `backend/server.py:7689` |
| `PATCH` | `/api/plan/draft` | `backend/server.py:7678` |
| `GET` | `/api/plan/history` | `backend/server.py:7635` |
| `GET` | `/api/portfolio` | `backend/server.py:3370` |
| `POST` | `/api/portfolio` | `backend/server.py:3378` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3418` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3411` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3400` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:8833` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:4931` |
| `GET` | `/api/user-states/list` | `backend/server.py:5136` |

### Huérfanas por diseño (10)

| Método | Ruta | Por qué |
|---|---|---|
| `POST` | `/api/campaigns/{campaign_id}/send` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/churn-surveys/{survey_id}/follow-up` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/connectors/status` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/errors/{error_id}/resolve` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/gdpr-exports/{export_id}/deliver` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/health` | infra — sonda de salud |
| `POST` | `/api/set-plan` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/users/{user_id}/payments` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/webhook/stripe` | externo — lo llama la pasarela de pago |
| `POST` | `/api/webhook/stripe/subscription` | externo — lo llama la pasarela de pago |

## Módulos del backend

| Módulo | Líneas | Rutas | Responsabilidad |
|---|---:|---:|---|
| `server.py` | 9,211 | 142 | — |
| `performance.py` | 1,796 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,151 | 25 | admin_routes.py — Endpoints del panel de administración |
| `missing_apis.py` | 1,000 | 10 | missing_apis.py |
| `price_action.py` | 983 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 860 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `options_math.py` | 680 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `stock_data.py` | 616 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_optimize.py` | 588 |  | Options Strategy Optimizer. |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `realtime_alerts.py` | 384 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `referrals.py` | 374 | 4 | referrals.py — Referral / Affiliate program API. |
| `options_positioning.py` | 371 |  | Positioning metrics derived from open interest: max pain, GEX, OI profile, |
| `market_data.py` | 329 |  | Multi-provider market data layer with failover, caching and circuit breakers. |
| `portfolio_risk.py` | 327 |  | Account-level risk — heat, correlation, loss limits, volatility sizing. |
| `timeframes.py` | 303 |  | The timeframe ladder for the price-action scanners (structure + patterns). |
| `american_options.py` | 283 |  | American option pricing — early exercise, which Black-Scholes cannot see. |
| `crypto_data.py` | 256 |  | Precios de criptomonedas desde las propias bolsas. |
| `passkeys.py` | 243 |  | Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña. |
| `revolut.py` | 216 |  | Revolut — Revolut Pay / Merchant API integration (order + webhook helpers). |
| `market_rates.py` | 213 |  | Live risk-free rate. |
| `notifications.py` | 212 |  | notifications.py — un aviso, tres canales, y la verdad sobre cuáles funcionan. |
| `nowpayments.py` | 182 |  | NOWPayments — crypto payment gateway integration (invoice + IPN helpers). |
| `migrate_trades_schema.py` | 169 |  | Migra los documentos del diario legado (camelCase) al esquema canónico. |
| `ecb_rates.py` | 144 |  | Tipos de cambio del Banco Central Europeo. |

## Rutas de la API

Todas cuelgan de `/api` (`api_router = APIRouter(prefix="/api")`).
La columna **Front** dice si algún fichero del frontend la menciona.

### `backend/admin_routes.py` — 25 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/campaigns` | 579 | ✅ |
| `POST` | `/campaigns` | 585 | ✅ |
| `POST` | `/campaigns/{campaign_id}/send` | 620 | ❌ |
| `GET` | `/churn-surveys` | 753 | ✅ |
| `POST` | `/churn-surveys/{survey_id}/follow-up` | 769 | ❌ |
| `GET` | `/cohorts` | 791 | ✅ |
| `GET` | `/connectors/status` | 468 | ❌ |
| `GET` | `/errors` | 971 | ✅ |
| `POST` | `/errors/{error_id}/resolve` | 997 | ❌ |
| `GET` | `/gdpr-exports` | 1048 | ✅ |
| `POST` | `/gdpr-exports/{export_id}/deliver` | 1058 | ❌ |
| `GET` | `/i18n` | 689 | ✅ |
| `POST` | `/i18n` | 714 | ✅ |
| `GET` | `/maintenance` | 942 | ✅ |
| `POST` | `/maintenance` | 955 | ✅ |
| `GET` | `/plans` | 887 | ✅ |
| `POST` | `/plans/{plan_id}` | 910 | ✅ |
| `GET` | `/public/settings` | 1138 | ✅ |
| `GET` | `/rate-limits` | 1023 | ✅ |
| `GET` | `/referrals` | 834 | ✅ |
| `GET` | `/referrals/leaderboard` | 856 | ✅ |
| `POST` | `/set-plan` | 348 | ❌ |
| `POST` | `/settings` | 424 | ✅ |
| `POST` | `/users/{user_id}` | 376 | ✅ |
| `GET` | `/users/{user_id}/payments` | 732 | ❌ |

### `backend/affiliate_program.py` — 18 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/affiliates` | 452 | ✅ |
| `POST` | `/admin/affiliates/payout-lines/{lid}/mark-paid` | 735 | ✅ |
| `GET` | `/admin/affiliates/payout-requests` | 757 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/mark-paid` | 768 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/reject` | 782 | ✅ |
| `POST` | `/admin/affiliates/payout-run` | 608 | ✅ |
| `POST` | `/admin/affiliates/payout-run/{rid}/finalize` | 693 | ✅ |
| `GET` | `/admin/affiliates/payout-runs` | 717 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}` | 724 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}/export.csv` | 792 | ✅ |
| `PATCH` | `/admin/affiliates/{aid}` | 591 | ✅ |
| `POST` | `/admin/affiliates/{aid}/approve` | 576 | ✅ |
| `POST` | `/admin/affiliates/{aid}/reject` | 581 | ✅ |
| `POST` | `/admin/affiliates/{aid}/suspend` | 586 | ✅ |
| `POST` | `/affiliate/apply` | 271 | ✅ |
| `GET` | `/affiliate/me` | 313 | ✅ |
| `PUT` | `/affiliate/payout-details` | 389 | ✅ |
| `POST` | `/affiliate/request-payout` | 408 | ✅ |

### `backend/missing_apis.py` — 10 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `POST` | `/auth/send-verification-email` | 498 | ✅ |
| `POST` | `/auth/verify-email` | 529 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 869 | ❌ |
| `GET` | `/commodities-prices` | 277 | ❌ |
| `GET` | `/forex-prices` | 184 | ❌ |
| `GET` | `/indices-prices` | 221 | ❌ |
| `GET` | `/ohlc-universal/{symbol}` | 354 | ❌ |
| `GET` | `/performance/export` | 806 | ❌ |
| `POST` | `/subscriptions/change-plan` | 563 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 664 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 367 | ✅ |
| `GET` | `/alerts/realtime/status` | 351 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 282 | ✅ |

### `backend/referrals.py` — 4 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/leaderboard` | 276 | ✅ |
| `GET` | `/referrals/me` | 113 | ❌ |
| `POST` | `/referrals/redeem-credit` | 300 | ❌ |
| `POST` | `/referrals/track` | 156 | ✅ |

### `backend/server.py` — 142 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5151 | ✅ |
| `GET` | `/admin/audit-log` | 8407 | ✅ |
| `GET` | `/admin/coupons` | 8970 | ✅ |
| `POST` | `/admin/coupons` | 8976 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 8999 | ✅ |
| `GET` | `/admin/feature-flags` | 9019 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9028 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8444 | ✅ |
| `GET` | `/admin/market-data-health` | 8813 | ❌ |
| `GET` | `/admin/metrics` | 7843 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8626 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8767 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8714 | ✅ |
| `POST` | `/admin/promote` | 7891 | ✅ |
| `GET` | `/admin/revenue` | 8507 | ✅ |
| `GET` | `/admin/settings` | 8305 | ✅ |
| `PUT` | `/admin/settings` | 8328 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8474 | ❌ |
| `GET` | `/admin/usage` | 8849 | ✅ |
| `GET` | `/admin/usage-heatmap` | 8916 | ✅ |
| `GET` | `/admin/users` | 7747 | ✅ |
| `POST` | `/admin/users` | 7963 | ✅ |
| `GET` | `/admin/users.csv` | 7813 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8073 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8006 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8108 | ✅ |
| `GET` | `/admin/webhooks` | 9043 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9049 | ✅ |
| `GET` | `/alerts` | 3486 | ✅ |
| `POST` | `/alerts` | 3472 | ✅ |
| `POST` | `/alerts/send-email` | 3612 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3494 | ✅ |
| `POST` | `/analytics/track` | 8889 | ✅ |
| `POST` | `/auth/2fa/disable` | 2475 | ✅ |
| `POST` | `/auth/2fa/enable` | 2456 | ✅ |
| `POST` | `/auth/2fa/setup` | 2440 | ✅ |
| `POST` | `/auth/2fa/verify` | 2493 | ✅ |
| `DELETE` | `/auth/account` | 2748 | ✅ |
| `POST` | `/auth/change-password` | 2391 | ✅ |
| `POST` | `/auth/forgot-password` | 2330 | ✅ |
| `POST` | `/auth/google` | 2864 | ✅ |
| `POST` | `/auth/login` | 1953 | ✅ |
| `POST` | `/auth/logout` | 2062 | ✅ |
| `POST` | `/auth/magic-link` | 2164 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2211 | ✅ |
| `GET` | `/auth/me` | 2035 | ✅ |
| `GET` | `/auth/my-data` | 2774 | ✅ |
| `GET` | `/auth/passkey/available` | 2579 | ✅ |
| `GET` | `/auth/passkey/list` | 2713 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2639 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2650 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2586 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2604 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2719 | ✅ |
| `POST` | `/auth/refresh` | 2085 | ✅ |
| `POST` | `/auth/register` | 1906 | ✅ |
| `POST` | `/auth/reset-password` | 2357 | ✅ |
| `POST` | `/backtest` | 3901 | ❌ |
| `GET` | `/backtest/strategies` | 7393 | ❌ |
| `POST` | `/backtest/validate` | 7323 | ❌ |
| `POST` | `/billing/create-portal-session` | 4948 | ✅ |
| `GET` | `/billing/history` | 4983 | ✅ |
| `POST` | `/calculate/american` | 5910 | ❌ |
| `POST` | `/calculate/assignment` | 5854 | ✅ |
| `POST` | `/calculate/greeks` | 5823 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5794 | ❌ |
| `POST` | `/calculate/payoff` | 5740 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5833 | ✅ |
| `POST` | `/calculate/volatility-size` | 7457 | ❌ |
| `GET` | `/calculations` | 3976 | ✅ |
| `POST` | `/calculations` | 3963 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3984 | ✅ |
| `POST` | `/checkout/create` | 4132 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4275 | ✅ |
| `POST` | `/education/assistant` | 6585 | ✅ |
| `GET` | `/education/pattern-catalog` | 6838 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6845 | ✅ |
| `GET` | `/education/scan-timeframes` | 6831 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6888 | ✅ |
| `GET` | `/health` | 5155 | ❌ |
| `GET` | `/journal/stats` | 3352 | ✅ |
| `GET` | `/journal/trades` | 3188 | ❌ |
| `POST` | `/journal/trades` | 3166 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3253 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3218 | ❌ |
| `GET` | `/market/risk-free` | 5774 | ✅ |
| `POST` | `/monte-carlo` | 3694 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3073 | ❌ |
| `POST` | `/optimize` | 5968 | ✅ |
| `POST` | `/options/ai-analyze` | 6482 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5493 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6021 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5389 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6195 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5568 | ✅ |
| `GET` | `/options/market-flow` | 6724 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5626 | ✅ |
| `GET` | `/options/positions` | 6089 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6108 | ✅ |
| `POST` | `/options/positions/save` | 6071 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6098 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5692 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6279 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4297 | ✅ |
| `GET` | `/performance/analytics` | 7475 | ✅ |
| `GET` | `/performance/instruments` | 7136 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7415 | ❌ |
| `GET` | `/performance/trades` | 7207 | ✅ |
| `POST` | `/performance/trades` | 7149 | ✅ |
| `POST` | `/performance/trades/bulk` | 7172 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7295 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7232 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7245 | ✅ |
| `GET` | `/plan` | 7626 | ❌ |
| `POST` | `/plan` | 7654 | ❌ |
| `GET` | `/plan/compliance` | 7689 | ❌ |
| `PATCH` | `/plan/draft` | 7678 | ❌ |
| `GET` | `/plan/history` | 7635 | ❌ |
| `GET` | `/plans` | 3993 | ✅ |
| `GET` | `/portfolio` | 3370 | ❌ |
| `POST` | `/portfolio` | 3378 | ❌ |
| `GET` | `/portfolio/rebalance` | 3418 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3411 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3400 | ❌ |
| `GET` | `/prices` | 2984 | ✅ |
| `GET` | `/public/settings` | 8398 | ✅ |
| `GET` | `/quote/{symbol}` | 8833 | ❌ |
| `GET` | `/stock/{symbol}` | 5282 | ✅ |
| `POST` | `/subscriptions/cancel` | 4826 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 4931 | ❌ |
| `GET` | `/subscriptions/current` | 4778 | ✅ |
| `POST` | `/subscriptions/resume` | 4885 | ✅ |
| `GET` | `/tickers/search` | 5359 | ✅ |
| `GET` | `/tickers/universal-search` | 5372 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5112 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5095 | ✅ |
| `GET` | `/user-states/list` | 5136 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5125 | ✅ |
| `POST` | `/user-states/save` | 5028 | ✅ |
| `POST` | `/webhook/nowpayments` | 4696 | ✅ |
| `POST` | `/webhook/revolut` | 4602 | ✅ |
| `POST` | `/webhook/stripe` | 4437 | ❌ |

## Frontend

### Rutas declaradas en `App.js` (27)

| Ruta | Componente |
|---|---|
| `*` | `NotFoundPage` |
| `/` | `LandingPage` |
| `/about` | `AboutPage` |
| `/admin` | `ProtectedRoute` |
| `/affiliate` | `ProtectedRoute` |
| `/backtesting` | `BacktestingPage` |
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
| `/pricing` | `PricingPage` |
| `/register` | `RegisterPage` |
| `/reset-password` | `ResetPasswordPage` |
| `/settings` | `ProtectedRoute` |
| `/subscription` | `ProtectedRoute` |
| `/verify-email` | `VerifyEmailPage` |

### Carpetas

| Carpeta | Ficheros | Líneas |
|---|---:|---:|
| `components/auth/` | 2 | 172 |
| `components/calculators/` | 14 | 3,747 |
| `components/calculators/simulator/` | 6 | 1,375 |
| `components/charts/` | 3 | 779 |
| `components/charts/structure/` | 11 | 1,459 |
| `components/common/` | 11 | 1,831 |
| `components/dashboard/` | 8 | 989 |
| `components/desk/` | 6 | 1,431 |
| `components/education/` | 78 | 13,023 |
| `components/integrations/` | 2 | 188 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 579 |
| `components/options/` | 36 | 7,871 |
| `components/performance/` | 7 | 3,428 |
| `components/performance/form/` | 6 | 700 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 382 |
| `components/ui/` | 46 | 2,946 |
| `pages/` | 21 | 15,319 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,211 |
| `frontend/src/pages/EducationPage.jsx` | 5,505 |
| `frontend/src/lib/i18n/ar.js` | 4,246 |
| `frontend/src/lib/i18n/de.js` | 4,246 |
| `frontend/src/lib/i18n/en.js` | 4,246 |
| `frontend/src/lib/i18n/es.js` | 4,246 |
| `frontend/src/lib/i18n/fr.js` | 4,246 |
| `frontend/src/lib/i18n/it.js` | 4,246 |
| `frontend/src/lib/i18n/ja.js` | 4,246 |
| `frontend/src/lib/i18n/pt.js` | 4,246 |
| `frontend/src/lib/i18n/ru.js` | 4,246 |
| `frontend/src/lib/i18n/zh.js` | 4,246 |

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

