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
| Líneas de Python (backend) | 27,050 |
| Rutas declaradas | 198 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 62 · 1022 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,972 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (29)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8793` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3750` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7573` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7502` |
| `POST` | `/api/calculate/american` | `backend/server.py:5918` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5802` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7637` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:837` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:279` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6948` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:186` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:223` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3859` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3321` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5700` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:774` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7595` |
| `GET` | `/api/plans` | `backend/server.py:3922` |
| `GET` | `/api/portfolio` | `backend/server.py:3508` |
| `POST` | `/api/portfolio` | `backend/server.py:3516` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3556` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3549` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3538` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9152` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:160` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:389` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:492` |
| `GET` | `/api/user-states/list` | `backend/server.py:5064` |

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
| `server.py` | 9,591 | 140 | — |
| `performance.py` | 1,843 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,248 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 968 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 875 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `brokers_referidos.py` | 814 |  | Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar. |
| `stock_data.py` | 745 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_math.py` | 744 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 633 |  | Options Strategy Optimizer. |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `referrals.py` | 471 | 3 | referrals.py — Referral / Affiliate program API. |
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
| `performance_metrics.py` | 196 |  | Advanced performance & risk metrics — the professional-grade gap. |
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
| `GET` | `/admin/campaigns` | 649 | ✅ |
| `POST` | `/admin/campaigns` | 655 | ✅ |
| `POST` | `/admin/campaigns/{campaign_id}/send` | 690 | ✅ |
| `GET` | `/admin/churn-surveys` | 827 | ✅ |
| `POST` | `/admin/churn-surveys/{survey_id}/follow-up` | 843 | ✅ |
| `GET` | `/admin/cohorts` | 865 | ✅ |
| `GET` | `/admin/connectors/status` | 538 | ❌ |
| `GET` | `/admin/errors` | 1066 | ✅ |
| `POST` | `/admin/errors/{error_id}/resolve` | 1092 | ✅ |
| `GET` | `/admin/gdpr-exports` | 1143 | ✅ |
| `POST` | `/admin/gdpr-exports/{export_id}/deliver` | 1153 | ✅ |
| `GET` | `/admin/i18n` | 759 | ✅ |
| `POST` | `/admin/i18n` | 788 | ✅ |
| `GET` | `/admin/maintenance` | 1037 | ✅ |
| `POST` | `/admin/maintenance` | 1050 | ✅ |
| `GET` | `/admin/plans` | 961 | ✅ |
| `POST` | `/admin/plans/{plan_id}` | 986 | ✅ |
| `GET` | `/admin/public/settings` | 1233 | ✅ |
| `GET` | `/admin/rate-limits` | 1118 | ✅ |
| `GET` | `/admin/referrals` | 908 | ✅ |
| `GET` | `/admin/referrals/leaderboard` | 930 | ✅ |
| `POST` | `/admin/set-plan` | 418 | ❌ |
| `POST` | `/admin/settings` | 494 | ✅ |
| `POST` | `/admin/users/{user_id}` | 446 | ✅ |
| `GET` | `/admin/users/{user_id}/payments` | 806 | ✅ |

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
| `POST` | `/auth/send-verification-email` | 427 | ✅ |
| `POST` | `/auth/verify-email` | 458 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 837 | ❌ |
| `GET` | `/commodities-prices` | 279 | ❌ |
| `GET` | `/forex-prices` | 186 | ❌ |
| `GET` | `/indices-prices` | 223 | ❌ |
| `GET` | `/performance/export` | 774 | ❌ |
| `POST` | `/subscriptions/change-plan` | 492 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 611 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 368 | ✅ |
| `GET` | `/alerts/realtime/status` | 352 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 283 | ✅ |

### `backend/referrals.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/me` | 160 | ❌ |
| `POST` | `/referrals/redeem-credit` | 389 | ❌ |
| `POST` | `/referrals/track` | 207 | ✅ |

### `backend/server.py` — 140 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5079 | ✅ |
| `GET` | `/admin/audit-log` | 8726 | ✅ |
| `GET` | `/admin/coupons` | 9289 | ✅ |
| `POST` | `/admin/coupons` | 9295 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9318 | ✅ |
| `GET` | `/admin/feature-flags` | 9338 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9347 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8763 | ✅ |
| `GET` | `/admin/market-data-health` | 9132 | ✅ |
| `GET` | `/admin/metrics` | 8027 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8945 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9086 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9033 | ✅ |
| `POST` | `/admin/promote` | 8075 | ✅ |
| `GET` | `/admin/revenue` | 8826 | ✅ |
| `GET` | `/admin/settings` | 8489 | ✅ |
| `PUT` | `/admin/settings` | 8512 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8793 | ❌ |
| `GET` | `/admin/usage` | 9168 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9235 | ✅ |
| `GET` | `/admin/users` | 7927 | ✅ |
| `POST` | `/admin/users` | 8147 | ✅ |
| `GET` | `/admin/users.csv` | 7997 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8257 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8190 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8292 | ✅ |
| `GET` | `/admin/webhooks` | 9362 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9368 | ✅ |
| `GET` | `/alerts` | 3624 | ✅ |
| `POST` | `/alerts` | 3610 | ✅ |
| `POST` | `/alerts/send-email` | 3750 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3632 | ✅ |
| `POST` | `/analytics/track` | 9208 | ✅ |
| `POST` | `/auth/2fa/disable` | 2678 | ✅ |
| `POST` | `/auth/2fa/enable` | 2659 | ✅ |
| `POST` | `/auth/2fa/setup` | 2643 | ✅ |
| `POST` | `/auth/2fa/verify` | 2696 | ✅ |
| `DELETE` | `/auth/account` | 2951 | ✅ |
| `POST` | `/auth/change-password` | 2591 | ✅ |
| `POST` | `/auth/forgot-password` | 2530 | ✅ |
| `POST` | `/auth/google` | 3068 | ✅ |
| `POST` | `/auth/login` | 2139 | ✅ |
| `POST` | `/auth/logout` | 2253 | ✅ |
| `POST` | `/auth/magic-link` | 2355 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2402 | ✅ |
| `GET` | `/auth/me` | 2221 | ✅ |
| `GET` | `/auth/my-data` | 2977 | ✅ |
| `GET` | `/auth/passkey/available` | 2782 | ✅ |
| `GET` | `/auth/passkey/list` | 2916 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2842 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2853 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2789 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2807 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2922 | ✅ |
| `POST` | `/auth/profile` | 3203 | ✅ |
| `POST` | `/auth/refresh` | 2276 | ✅ |
| `POST` | `/auth/register` | 2088 | ✅ |
| `POST` | `/auth/reset-password` | 2557 | ✅ |
| `GET` | `/backtest/strategies` | 7573 | ❌ |
| `POST` | `/backtest/validate` | 7502 | ❌ |
| `POST` | `/billing/create-portal-session` | 4876 | ✅ |
| `GET` | `/billing/history` | 4911 | ✅ |
| `GET` | `/brokers` | 8589 | ✅ |
| `POST` | `/calculate/american` | 5918 | ❌ |
| `POST` | `/calculate/assignment` | 5862 | ✅ |
| `POST` | `/calculate/greeks` | 5831 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5558 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5802 | ❌ |
| `POST` | `/calculate/payoff` | 5748 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5841 | ✅ |
| `POST` | `/calculate/volatility-size` | 7637 | ❌ |
| `GET` | `/calculations` | 3905 | ✅ |
| `POST` | `/calculations` | 3892 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3913 | ✅ |
| `POST` | `/checkout/create` | 4061 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4204 | ✅ |
| `POST` | `/education/assistant` | 6669 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7075 | ✅ |
| `GET` | `/education/pattern-catalog` | 6948 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6955 | ✅ |
| `GET` | `/education/scan-timeframes` | 6941 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7008 | ✅ |
| `GET` | `/health` | 5083 | ❌ |
| `GET` | `/journal/stats` | 3490 | ✅ |
| `GET` | `/market/risk-free` | 5782 | ✅ |
| `POST` | `/monte-carlo` | 3859 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3321 | ❌ |
| `POST` | `/optimize` | 5976 | ✅ |
| `POST` | `/options/ai-analyze` | 6557 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5486 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6029 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5382 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6203 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5576 | ✅ |
| `GET` | `/options/market-flow` | 6817 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5634 | ✅ |
| `GET` | `/options/positions` | 6097 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6116 | ✅ |
| `POST` | `/options/positions/save` | 6079 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6106 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5700 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6336 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4226 | ✅ |
| `GET` | `/performance/analytics` | 7655 | ✅ |
| `GET` | `/performance/instruments` | 7315 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7595 | ❌ |
| `GET` | `/performance/trades` | 7386 | ✅ |
| `POST` | `/performance/trades` | 7328 | ✅ |
| `POST` | `/performance/trades/bulk` | 7351 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7474 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7411 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7424 | ✅ |
| `GET` | `/plan` | 7806 | ✅ |
| `POST` | `/plan` | 7834 | ✅ |
| `GET` | `/plan/compliance` | 7869 | ✅ |
| `PATCH` | `/plan/draft` | 7858 | ✅ |
| `GET` | `/plan/history` | 7815 | ✅ |
| `GET` | `/plans` | 3922 | ❌ |
| `GET` | `/portfolio` | 3508 | ❌ |
| `POST` | `/portfolio` | 3516 | ❌ |
| `GET` | `/portfolio/rebalance` | 3556 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3549 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3538 | ❌ |
| `GET` | `/prices` | 3232 | ✅ |
| `GET` | `/public/settings` | 8582 | ✅ |
| `GET` | `/quote/{symbol}` | 9152 | ❌ |
| `GET` | `/stock/{symbol}` | 5245 | ✅ |
| `POST` | `/subscriptions/cancel` | 4771 | ✅ |
| `GET` | `/subscriptions/current` | 4723 | ✅ |
| `POST` | `/subscriptions/resume` | 4830 | ✅ |
| `GET` | `/tickers/search` | 5352 | ✅ |
| `GET` | `/tickers/universal-search` | 5365 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5040 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5023 | ✅ |
| `GET` | `/user-states/list` | 5064 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5053 | ✅ |
| `POST` | `/user-states/save` | 4956 | ✅ |
| `POST` | `/webhook/nowpayments` | 4641 | ✅ |
| `POST` | `/webhook/revolut` | 4547 | ✅ |
| `POST` | `/webhook/stripe` | 4382 | ❌ |

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
| `components/brokers/` | 1 | 240 |
| `components/calculators/` | 15 | 4,644 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,248 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 81 | 13,127 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 36 | 7,995 |
| `components/performance/` | 7 | 3,479 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 30 | 1,612 |
| `pages/` | 23 | 16,368 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,591 |
| `frontend/src/pages/EducationPage.jsx` | 5,575 |
| `frontend/src/lib/i18n/ar.js` | 4,668 |
| `frontend/src/lib/i18n/de.js` | 4,668 |
| `frontend/src/lib/i18n/en.js` | 4,668 |
| `frontend/src/lib/i18n/es.js` | 4,668 |
| `frontend/src/lib/i18n/fr.js` | 4,668 |
| `frontend/src/lib/i18n/it.js` | 4,668 |
| `frontend/src/lib/i18n/ja.js` | 4,668 |
| `frontend/src/lib/i18n/pt.js` | 4,668 |
| `frontend/src/lib/i18n/ru.js` | 4,668 |
| `frontend/src/lib/i18n/zh.js` | 4,668 |

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

