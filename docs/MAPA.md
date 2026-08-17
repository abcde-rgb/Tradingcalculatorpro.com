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
| Líneas de Python (backend) | 23,525 |
| Rutas declaradas | 202 |
| **Rutas sin consumidor en el frontend** | **43** |
| Ficheros de test · funciones de test | 45 · 761 |
| Rutas del frontend (`App.js`) | 28 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,485 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (38)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `GET` | `/api/admin/market-data-health` | `backend/server.py:8818` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8479` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3617` |
| `POST` | `/api/backtest` | `backend/server.py:3906` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7398` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7328` |
| `POST` | `/api/calculate/american` | `backend/server.py:5915` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5799` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7462` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6843` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3193` |
| `POST` | `/api/journal/trades` | `backend/server.py:3171` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3258` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3223` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3699` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3078` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5697` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7420` |
| `GET` | `/api/plans` | `backend/server.py:3998` |
| `GET` | `/api/portfolio` | `backend/server.py:3375` |
| `POST` | `/api/portfolio` | `backend/server.py:3383` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3423` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3416` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3405` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:8838` |
| `GET` | `/api/referrals/leaderboard` | `backend/referrals.py:276` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:4936` |
| `GET` | `/api/user-states/list` | `backend/server.py:5141` |

### Huérfanas por diseño (5)

| Método | Ruta | Por qué |
|---|---|---|
| `GET` | `/api/admin/connectors/status` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/admin/set-plan` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/health` | infra — sonda de salud |
| `POST` | `/api/webhook/stripe` | externo — lo llama la pasarela de pago |
| `POST` | `/api/webhook/stripe/subscription` | externo — lo llama la pasarela de pago |

## Módulos del backend

| Módulo | Líneas | Rutas | Responsabilidad |
|---|---:|---:|---|
| `server.py` | 9,216 | 142 | — |
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
| `GET` | `/admin/campaigns` | 579 | ✅ |
| `POST` | `/admin/campaigns` | 585 | ✅ |
| `POST` | `/admin/campaigns/{campaign_id}/send` | 620 | ✅ |
| `GET` | `/admin/churn-surveys` | 753 | ✅ |
| `POST` | `/admin/churn-surveys/{survey_id}/follow-up` | 769 | ✅ |
| `GET` | `/admin/cohorts` | 791 | ✅ |
| `GET` | `/admin/connectors/status` | 468 | ❌ |
| `GET` | `/admin/errors` | 971 | ✅ |
| `POST` | `/admin/errors/{error_id}/resolve` | 997 | ✅ |
| `GET` | `/admin/gdpr-exports` | 1048 | ✅ |
| `POST` | `/admin/gdpr-exports/{export_id}/deliver` | 1058 | ✅ |
| `GET` | `/admin/i18n` | 689 | ✅ |
| `POST` | `/admin/i18n` | 714 | ✅ |
| `GET` | `/admin/maintenance` | 942 | ✅ |
| `POST` | `/admin/maintenance` | 955 | ✅ |
| `GET` | `/admin/plans` | 887 | ✅ |
| `POST` | `/admin/plans/{plan_id}` | 910 | ✅ |
| `GET` | `/admin/public/settings` | 1138 | ✅ |
| `GET` | `/admin/rate-limits` | 1023 | ✅ |
| `GET` | `/admin/referrals` | 834 | ✅ |
| `GET` | `/admin/referrals/leaderboard` | 856 | ✅ |
| `POST` | `/admin/set-plan` | 348 | ❌ |
| `POST` | `/admin/settings` | 424 | ✅ |
| `POST` | `/admin/users/{user_id}` | 376 | ✅ |
| `GET` | `/admin/users/{user_id}/payments` | 732 | ✅ |

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
| `GET` | `/referrals/leaderboard` | 276 | ❌ |
| `GET` | `/referrals/me` | 113 | ❌ |
| `POST` | `/referrals/redeem-credit` | 300 | ❌ |
| `POST` | `/referrals/track` | 156 | ✅ |

### `backend/server.py` — 142 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5156 | ✅ |
| `GET` | `/admin/audit-log` | 8412 | ✅ |
| `GET` | `/admin/coupons` | 8975 | ✅ |
| `POST` | `/admin/coupons` | 8981 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9004 | ✅ |
| `GET` | `/admin/feature-flags` | 9024 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9033 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8449 | ✅ |
| `GET` | `/admin/market-data-health` | 8818 | ❌ |
| `GET` | `/admin/metrics` | 7848 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8631 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8772 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8719 | ✅ |
| `POST` | `/admin/promote` | 7896 | ✅ |
| `GET` | `/admin/revenue` | 8512 | ✅ |
| `GET` | `/admin/settings` | 8310 | ✅ |
| `PUT` | `/admin/settings` | 8333 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8479 | ❌ |
| `GET` | `/admin/usage` | 8854 | ✅ |
| `GET` | `/admin/usage-heatmap` | 8921 | ✅ |
| `GET` | `/admin/users` | 7752 | ✅ |
| `POST` | `/admin/users` | 7968 | ✅ |
| `GET` | `/admin/users.csv` | 7818 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8078 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8011 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8113 | ✅ |
| `GET` | `/admin/webhooks` | 9048 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9054 | ✅ |
| `GET` | `/alerts` | 3491 | ✅ |
| `POST` | `/alerts` | 3477 | ✅ |
| `POST` | `/alerts/send-email` | 3617 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3499 | ✅ |
| `POST` | `/analytics/track` | 8894 | ✅ |
| `POST` | `/auth/2fa/disable` | 2480 | ✅ |
| `POST` | `/auth/2fa/enable` | 2461 | ✅ |
| `POST` | `/auth/2fa/setup` | 2445 | ✅ |
| `POST` | `/auth/2fa/verify` | 2498 | ✅ |
| `DELETE` | `/auth/account` | 2753 | ✅ |
| `POST` | `/auth/change-password` | 2396 | ✅ |
| `POST` | `/auth/forgot-password` | 2335 | ✅ |
| `POST` | `/auth/google` | 2869 | ✅ |
| `POST` | `/auth/login` | 1953 | ✅ |
| `POST` | `/auth/logout` | 2067 | ✅ |
| `POST` | `/auth/magic-link` | 2169 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2216 | ✅ |
| `GET` | `/auth/me` | 2035 | ✅ |
| `GET` | `/auth/my-data` | 2779 | ✅ |
| `GET` | `/auth/passkey/available` | 2584 | ✅ |
| `GET` | `/auth/passkey/list` | 2718 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2644 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2655 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2591 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2609 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2724 | ✅ |
| `POST` | `/auth/refresh` | 2090 | ✅ |
| `POST` | `/auth/register` | 1906 | ✅ |
| `POST` | `/auth/reset-password` | 2362 | ✅ |
| `POST` | `/backtest` | 3906 | ❌ |
| `GET` | `/backtest/strategies` | 7398 | ❌ |
| `POST` | `/backtest/validate` | 7328 | ❌ |
| `POST` | `/billing/create-portal-session` | 4953 | ✅ |
| `GET` | `/billing/history` | 4988 | ✅ |
| `POST` | `/calculate/american` | 5915 | ❌ |
| `POST` | `/calculate/assignment` | 5859 | ✅ |
| `POST` | `/calculate/greeks` | 5828 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5799 | ❌ |
| `POST` | `/calculate/payoff` | 5745 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5838 | ✅ |
| `POST` | `/calculate/volatility-size` | 7462 | ❌ |
| `GET` | `/calculations` | 3981 | ✅ |
| `POST` | `/calculations` | 3968 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3989 | ✅ |
| `POST` | `/checkout/create` | 4137 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4280 | ✅ |
| `POST` | `/education/assistant` | 6590 | ✅ |
| `GET` | `/education/pattern-catalog` | 6843 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6850 | ✅ |
| `GET` | `/education/scan-timeframes` | 6836 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6893 | ✅ |
| `GET` | `/health` | 5160 | ❌ |
| `GET` | `/journal/stats` | 3357 | ✅ |
| `GET` | `/journal/trades` | 3193 | ❌ |
| `POST` | `/journal/trades` | 3171 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3258 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3223 | ❌ |
| `GET` | `/market/risk-free` | 5779 | ✅ |
| `POST` | `/monte-carlo` | 3699 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3078 | ❌ |
| `POST` | `/optimize` | 5973 | ✅ |
| `POST` | `/options/ai-analyze` | 6487 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5498 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6026 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5394 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6200 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5573 | ✅ |
| `GET` | `/options/market-flow` | 6729 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5631 | ✅ |
| `GET` | `/options/positions` | 6094 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6113 | ✅ |
| `POST` | `/options/positions/save` | 6076 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6103 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5697 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6284 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4302 | ✅ |
| `GET` | `/performance/analytics` | 7480 | ✅ |
| `GET` | `/performance/instruments` | 7141 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7420 | ❌ |
| `GET` | `/performance/trades` | 7212 | ✅ |
| `POST` | `/performance/trades` | 7154 | ✅ |
| `POST` | `/performance/trades/bulk` | 7177 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7300 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7237 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7250 | ✅ |
| `GET` | `/plan` | 7631 | ✅ |
| `POST` | `/plan` | 7659 | ✅ |
| `GET` | `/plan/compliance` | 7694 | ✅ |
| `PATCH` | `/plan/draft` | 7683 | ✅ |
| `GET` | `/plan/history` | 7640 | ✅ |
| `GET` | `/plans` | 3998 | ❌ |
| `GET` | `/portfolio` | 3375 | ❌ |
| `POST` | `/portfolio` | 3383 | ❌ |
| `GET` | `/portfolio/rebalance` | 3423 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3416 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3405 | ❌ |
| `GET` | `/prices` | 2989 | ✅ |
| `GET` | `/public/settings` | 8403 | ✅ |
| `GET` | `/quote/{symbol}` | 8838 | ❌ |
| `GET` | `/stock/{symbol}` | 5287 | ✅ |
| `POST` | `/subscriptions/cancel` | 4831 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 4936 | ❌ |
| `GET` | `/subscriptions/current` | 4783 | ✅ |
| `POST` | `/subscriptions/resume` | 4890 | ✅ |
| `GET` | `/tickers/search` | 5364 | ✅ |
| `GET` | `/tickers/universal-search` | 5377 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5117 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5100 | ✅ |
| `GET` | `/user-states/list` | 5141 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5130 | ✅ |
| `POST` | `/user-states/save` | 5033 | ✅ |
| `POST` | `/webhook/nowpayments` | 4701 | ✅ |
| `POST` | `/webhook/revolut` | 4607 | ✅ |
| `POST` | `/webhook/stripe` | 4442 | ❌ |

## Frontend

### Rutas declaradas en `App.js` (28)

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
| `components/auth/` | 2 | 172 |
| `components/backtesting/` | 1 | 175 |
| `components/calculators/` | 14 | 3,975 |
| `components/calculators/simulator/` | 6 | 1,375 |
| `components/charts/` | 3 | 779 |
| `components/charts/structure/` | 11 | 1,459 |
| `components/common/` | 11 | 1,831 |
| `components/dashboard/` | 8 | 989 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 78 | 13,023 |
| `components/integrations/` | 2 | 188 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 586 |
| `components/options/` | 36 | 7,871 |
| `components/performance/` | 7 | 3,428 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 46 | 2,946 |
| `pages/` | 22 | 15,720 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,216 |
| `frontend/src/pages/EducationPage.jsx` | 5,505 |
| `frontend/src/lib/i18n/ar.js` | 4,399 |
| `frontend/src/lib/i18n/de.js` | 4,399 |
| `frontend/src/lib/i18n/en.js` | 4,399 |
| `frontend/src/lib/i18n/es.js` | 4,399 |
| `frontend/src/lib/i18n/fr.js` | 4,399 |
| `frontend/src/lib/i18n/it.js` | 4,399 |
| `frontend/src/lib/i18n/ja.js` | 4,399 |
| `frontend/src/lib/i18n/pt.js` | 4,399 |
| `frontend/src/lib/i18n/ru.js` | 4,399 |
| `frontend/src/lib/i18n/zh.js` | 4,399 |

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

