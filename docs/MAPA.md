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
| Líneas de Python (backend) | 26,939 |
| Rutas declaradas | 199 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 59 · 1008 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,290 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8742` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3634` |
| `POST` | `/api/calculate/american` | `backend/server.py:5871` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5755` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7558` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:804` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6869` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3716` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3205` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5653` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:741` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7516` |
| `GET` | `/api/plans` | `backend/server.py:3774` |
| `GET` | `/api/portfolio` | `backend/server.py:3392` |
| `POST` | `/api/portfolio` | `backend/server.py:3400` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3440` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3433` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3422` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9254` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:133` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:333` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5016` |

### Huérfanas por diseño (6)

| Método | Ruta | Por qué |
|---|---|---|
| `GET` | `/api/admin/connectors/status` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/admin/referrals` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `POST` | `/api/admin/set-plan` | panel admin — comprueba si `AdminPage` la construye dinámicamente |
| `GET` | `/api/health` | infra — sonda de salud |
| `POST` | `/api/webhook/stripe` | externo — lo llama la pasarela de pago |
| `POST` | `/api/webhook/stripe/subscription` | externo — lo llama la pasarela de pago |

## Módulos del backend

| Módulo | Líneas | Rutas | Responsabilidad |
|---|---:|---:|---|
| `server.py` | 9,633 | 141 | — |
| `performance.py` | 1,820 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,206 | 25 | admin_routes.py — Endpoints del panel de administración |
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
| `passkeys.py` | 243 |  | Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña. |
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
| `GET` | `/admin/campaigns` | 607 | ✅ |
| `POST` | `/admin/campaigns` | 613 | ✅ |
| `POST` | `/admin/campaigns/{campaign_id}/send` | 648 | ✅ |
| `GET` | `/admin/churn-surveys` | 785 | ✅ |
| `POST` | `/admin/churn-surveys/{survey_id}/follow-up` | 801 | ✅ |
| `GET` | `/admin/cohorts` | 823 | ✅ |
| `GET` | `/admin/connectors/status` | 496 | ❌ |
| `GET` | `/admin/errors` | 1024 | ✅ |
| `POST` | `/admin/errors/{error_id}/resolve` | 1050 | ✅ |
| `GET` | `/admin/gdpr-exports` | 1101 | ✅ |
| `POST` | `/admin/gdpr-exports/{export_id}/deliver` | 1111 | ✅ |
| `GET` | `/admin/i18n` | 717 | ✅ |
| `POST` | `/admin/i18n` | 746 | ✅ |
| `GET` | `/admin/maintenance` | 995 | ✅ |
| `POST` | `/admin/maintenance` | 1008 | ✅ |
| `GET` | `/admin/plans` | 919 | ✅ |
| `POST` | `/admin/plans/{plan_id}` | 944 | ✅ |
| `GET` | `/admin/public/settings` | 1191 | ✅ |
| `GET` | `/admin/rate-limits` | 1076 | ✅ |
| `GET` | `/admin/referrals` | 866 | ❌ |
| `GET` | `/admin/referrals/leaderboard` | 888 | ✅ |
| `POST` | `/admin/set-plan` | 376 | ❌ |
| `POST` | `/admin/settings` | 452 | ✅ |
| `POST` | `/admin/users/{user_id}` | 404 | ✅ |
| `GET` | `/admin/users/{user_id}/payments` | 764 | ✅ |

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
| `GET` | `/` | 5031 | ✅ |
| `GET` | `/admin/audit-log` | 8675 | ✅ |
| `GET` | `/admin/coupons` | 9391 | ✅ |
| `POST` | `/admin/coupons` | 9397 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9420 | ✅ |
| `GET` | `/admin/feature-flags` | 9440 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9449 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8712 | ✅ |
| `GET` | `/admin/market-data-health` | 9234 | ✅ |
| `GET` | `/admin/metrics` | 7948 | ✅ |
| `POST` | `/admin/payments/manual` | 9050 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8894 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9188 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8982 | ✅ |
| `POST` | `/admin/promote` | 7996 | ✅ |
| `GET` | `/admin/revenue` | 8775 | ✅ |
| `GET` | `/admin/settings` | 8425 | ✅ |
| `PUT` | `/admin/settings` | 8448 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8742 | ❌ |
| `GET` | `/admin/usage` | 9270 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9337 | ✅ |
| `GET` | `/admin/users` | 7848 | ✅ |
| `POST` | `/admin/users` | 8070 | ✅ |
| `GET` | `/admin/users.csv` | 7918 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8184 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8115 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8219 | ✅ |
| `GET` | `/admin/webhooks` | 9464 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9470 | ✅ |
| `GET` | `/alerts` | 3508 | ✅ |
| `POST` | `/alerts` | 3494 | ✅ |
| `POST` | `/alerts/send-email` | 3634 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3516 | ✅ |
| `POST` | `/analytics/track` | 9310 | ✅ |
| `POST` | `/auth/2fa/disable` | 2571 | ✅ |
| `POST` | `/auth/2fa/enable` | 2552 | ✅ |
| `POST` | `/auth/2fa/setup` | 2536 | ✅ |
| `POST` | `/auth/2fa/verify` | 2589 | ✅ |
| `DELETE` | `/auth/account` | 2844 | ✅ |
| `POST` | `/auth/change-password` | 2487 | ✅ |
| `POST` | `/auth/forgot-password` | 2424 | ✅ |
| `POST` | `/auth/google` | 2961 | ✅ |
| `POST` | `/auth/login` | 2036 | ✅ |
| `POST` | `/auth/logout` | 2154 | ✅ |
| `POST` | `/auth/magic-link` | 2256 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2305 | ✅ |
| `GET` | `/auth/me` | 2122 | ✅ |
| `GET` | `/auth/my-data` | 2870 | ✅ |
| `GET` | `/auth/passkey/available` | 2675 | ✅ |
| `GET` | `/auth/passkey/list` | 2809 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2735 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2746 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2682 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2700 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2815 | ✅ |
| `POST` | `/auth/profile` | 3087 | ✅ |
| `POST` | `/auth/refresh` | 2177 | ✅ |
| `POST` | `/auth/register` | 1979 | ✅ |
| `POST` | `/auth/reset-password` | 2453 | ✅ |
| `GET` | `/backtest/strategies` | 7494 | ✅ |
| `POST` | `/backtest/validate` | 7423 | ✅ |
| `POST` | `/billing/create-portal-session` | 4828 | ✅ |
| `GET` | `/billing/history` | 4863 | ✅ |
| `GET` | `/brokers` | 8538 | ✅ |
| `POST` | `/calculate/american` | 5871 | ❌ |
| `POST` | `/calculate/assignment` | 5815 | ✅ |
| `POST` | `/calculate/greeks` | 5784 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5511 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5755 | ❌ |
| `POST` | `/calculate/payoff` | 5701 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5794 | ✅ |
| `POST` | `/calculate/volatility-size` | 7558 | ❌ |
| `GET` | `/calculations` | 3757 | ✅ |
| `POST` | `/calculations` | 3744 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3765 | ✅ |
| `POST` | `/checkout/create` | 3986 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4152 | ✅ |
| `POST` | `/education/assistant` | 6597 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 6996 | ✅ |
| `GET` | `/education/pattern-catalog` | 6869 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6876 | ✅ |
| `GET` | `/education/scan-timeframes` | 6862 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6929 | ✅ |
| `GET` | `/health` | 5035 | ❌ |
| `GET` | `/journal/stats` | 3374 | ✅ |
| `GET` | `/market/risk-free` | 5735 | ✅ |
| `POST` | `/monte-carlo` | 3716 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3205 | ❌ |
| `POST` | `/optimize` | 5929 | ✅ |
| `POST` | `/options/ai-analyze` | 6494 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5439 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 5982 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5335 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6156 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5529 | ✅ |
| `GET` | `/options/market-flow` | 6738 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5587 | ✅ |
| `GET` | `/options/positions` | 6050 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6069 | ✅ |
| `POST` | `/options/positions/save` | 6032 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6059 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5653 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6289 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4174 | ✅ |
| `GET` | `/performance/analytics` | 7576 | ✅ |
| `GET` | `/performance/instruments` | 7236 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7516 | ❌ |
| `GET` | `/performance/trades` | 7307 | ✅ |
| `POST` | `/performance/trades` | 7249 | ✅ |
| `POST` | `/performance/trades/bulk` | 7272 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7395 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7332 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7345 | ✅ |
| `GET` | `/plan` | 7727 | ✅ |
| `POST` | `/plan` | 7755 | ✅ |
| `GET` | `/plan/compliance` | 7790 | ✅ |
| `PATCH` | `/plan/draft` | 7779 | ✅ |
| `GET` | `/plan/history` | 7736 | ✅ |
| `GET` | `/plans` | 3774 | ❌ |
| `GET` | `/portfolio` | 3392 | ❌ |
| `POST` | `/portfolio` | 3400 | ❌ |
| `GET` | `/portfolio/rebalance` | 3440 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3433 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3422 | ❌ |
| `GET` | `/prices` | 3116 | ✅ |
| `GET` | `/public/settings` | 8518 | ✅ |
| `GET` | `/quote/{symbol}` | 9254 | ❌ |
| `GET` | `/stock/{symbol}` | 5198 | ✅ |
| `POST` | `/subscriptions/cancel` | 4723 | ✅ |
| `GET` | `/subscriptions/current` | 4675 | ✅ |
| `POST` | `/subscriptions/resume` | 4782 | ✅ |
| `GET` | `/tickers/search` | 5305 | ✅ |
| `GET` | `/tickers/universal-search` | 5318 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 4992 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 4975 | ✅ |
| `GET` | `/user-states/list` | 5016 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5005 | ✅ |
| `POST` | `/user-states/save` | 4908 | ✅ |
| `POST` | `/webhook/nowpayments` | 4593 | ✅ |
| `POST` | `/webhook/revolut` | 4499 | ✅ |
| `POST` | `/webhook/stripe` | 4334 | ❌ |

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
| `components/common/` | 12 | 2,248 |
| `components/dashboard/` | 8 | 1,005 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 87 | 14,390 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 37 | 8,122 |
| `components/performance/` | 8 | 3,881 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 30 | 1,612 |
| `pages/` | 23 | 16,838 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,633 |
| `frontend/src/pages/EducationPage.jsx` | 5,805 |
| `frontend/src/lib/i18n/ar.js` | 4,867 |
| `frontend/src/lib/i18n/de.js` | 4,867 |
| `frontend/src/lib/i18n/en.js` | 4,867 |
| `frontend/src/lib/i18n/es.js` | 4,867 |
| `frontend/src/lib/i18n/fr.js` | 4,867 |
| `frontend/src/lib/i18n/it.js` | 4,867 |
| `frontend/src/lib/i18n/ja.js` | 4,867 |
| `frontend/src/lib/i18n/pt.js` | 4,867 |
| `frontend/src/lib/i18n/ru.js` | 4,867 |
| `frontend/src/lib/i18n/zh.js` | 4,867 |

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

