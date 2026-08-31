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
| Líneas de Python (backend) | 28,053 |
| Rutas declaradas | 199 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 67 · 1121 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,379 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9275` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4070` |
| `POST` | `/api/calculate/american` | `backend/server.py:6354` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:6238` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8073` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:839` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7384` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4179` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3641` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6136` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:776` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:8031` |
| `GET` | `/api/plans` | `backend/server.py:4242` |
| `GET` | `/api/portfolio` | `backend/server.py:3828` |
| `POST` | `/api/portfolio` | `backend/server.py:3836` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3876` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3869` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3858` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9789` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:160` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:389` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5500` |

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
| `server.py` | 10,232 | 141 | — |
| `performance.py` | 1,844 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,248 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 970 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 875 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `brokers_referidos.py` | 814 |  | Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar. |
| `stock_data.py` | 745 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_math.py` | 744 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 633 |  | Options Strategy Optimizer. |
| `candle_patterns.py` | 604 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `referrals.py` | 471 | 3 | referrals.py — Referral / Affiliate program API. |
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
| `GET` | `/admin/referrals` | 908 | ❌ |
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

### `backend/referrals.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/me` | 160 | ❌ |
| `POST` | `/referrals/redeem-credit` | 389 | ❌ |
| `POST` | `/referrals/track` | 207 | ✅ |

### `backend/server.py` — 141 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5515 | ✅ |
| `GET` | `/admin/audit-log` | 9208 | ✅ |
| `GET` | `/admin/coupons` | 9926 | ✅ |
| `POST` | `/admin/coupons` | 9932 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9955 | ✅ |
| `GET` | `/admin/feature-flags` | 9975 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9984 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9245 | ✅ |
| `GET` | `/admin/market-data-health` | 9769 | ✅ |
| `GET` | `/admin/metrics` | 8463 | ✅ |
| `POST` | `/admin/payments/manual` | 9583 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9427 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9723 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9515 | ✅ |
| `POST` | `/admin/promote` | 8511 | ✅ |
| `GET` | `/admin/revenue` | 9308 | ✅ |
| `GET` | `/admin/settings` | 8957 | ✅ |
| `PUT` | `/admin/settings` | 8981 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9275 | ❌ |
| `GET` | `/admin/usage` | 9805 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9872 | ✅ |
| `GET` | `/admin/users` | 8363 | ✅ |
| `POST` | `/admin/users` | 8585 | ✅ |
| `GET` | `/admin/users.csv` | 8433 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8699 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8630 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8734 | ✅ |
| `GET` | `/admin/webhooks` | 9999 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10005 | ✅ |
| `GET` | `/alerts` | 3944 | ✅ |
| `POST` | `/alerts` | 3930 | ✅ |
| `POST` | `/alerts/send-email` | 4070 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3952 | ✅ |
| `POST` | `/analytics/track` | 9845 | ✅ |
| `POST` | `/auth/2fa/disable` | 2986 | ✅ |
| `POST` | `/auth/2fa/enable` | 2967 | ✅ |
| `POST` | `/auth/2fa/setup` | 2951 | ✅ |
| `POST` | `/auth/2fa/verify` | 3004 | ✅ |
| `DELETE` | `/auth/account` | 3259 | ✅ |
| `POST` | `/auth/change-password` | 2899 | ✅ |
| `POST` | `/auth/forgot-password` | 2836 | ✅ |
| `POST` | `/auth/google` | 3376 | ✅ |
| `POST` | `/auth/login` | 2336 | ✅ |
| `POST` | `/auth/logout` | 2498 | ✅ |
| `POST` | `/auth/magic-link` | 2634 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2683 | ✅ |
| `GET` | `/auth/me` | 2466 | ✅ |
| `GET` | `/auth/my-data` | 3285 | ✅ |
| `GET` | `/auth/passkey/available` | 3090 | ✅ |
| `GET` | `/auth/passkey/list` | 3224 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3150 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3161 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3097 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3115 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3230 | ✅ |
| `POST` | `/auth/profile` | 3523 | ✅ |
| `POST` | `/auth/refresh` | 2544 | ✅ |
| `POST` | `/auth/register` | 2270 | ✅ |
| `POST` | `/auth/reset-password` | 2865 | ✅ |
| `GET` | `/backtest/strategies` | 8009 | ✅ |
| `POST` | `/backtest/validate` | 7938 | ✅ |
| `POST` | `/billing/create-portal-session` | 5312 | ✅ |
| `GET` | `/billing/history` | 5347 | ✅ |
| `GET` | `/brokers` | 9071 | ✅ |
| `POST` | `/calculate/american` | 6354 | ❌ |
| `POST` | `/calculate/assignment` | 6298 | ✅ |
| `POST` | `/calculate/greeks` | 6267 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5994 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6238 | ❌ |
| `POST` | `/calculate/payoff` | 6184 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6277 | ✅ |
| `POST` | `/calculate/volatility-size` | 8073 | ❌ |
| `GET` | `/calculations` | 4225 | ✅ |
| `POST` | `/calculations` | 4212 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4233 | ✅ |
| `POST` | `/checkout/create` | 4454 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4620 | ✅ |
| `POST` | `/education/assistant` | 7105 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7511 | ✅ |
| `GET` | `/education/pattern-catalog` | 7384 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7391 | ✅ |
| `GET` | `/education/scan-timeframes` | 7377 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7444 | ✅ |
| `GET` | `/health` | 5519 | ❌ |
| `GET` | `/journal/stats` | 3810 | ✅ |
| `GET` | `/market/risk-free` | 6218 | ✅ |
| `POST` | `/monte-carlo` | 4179 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3641 | ❌ |
| `POST` | `/optimize` | 6412 | ✅ |
| `POST` | `/options/ai-analyze` | 6993 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5922 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6465 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5818 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6639 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6012 | ✅ |
| `GET` | `/options/market-flow` | 7253 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6070 | ✅ |
| `GET` | `/options/positions` | 6533 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6552 | ✅ |
| `POST` | `/options/positions/save` | 6515 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6542 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6136 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6772 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4642 | ✅ |
| `GET` | `/performance/analytics` | 8091 | ✅ |
| `GET` | `/performance/instruments` | 7751 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8031 | ❌ |
| `GET` | `/performance/trades` | 7822 | ✅ |
| `POST` | `/performance/trades` | 7764 | ✅ |
| `POST` | `/performance/trades/bulk` | 7787 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7910 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7847 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7860 | ✅ |
| `GET` | `/plan` | 8242 | ✅ |
| `POST` | `/plan` | 8270 | ✅ |
| `GET` | `/plan/compliance` | 8305 | ✅ |
| `PATCH` | `/plan/draft` | 8294 | ✅ |
| `GET` | `/plan/history` | 8251 | ✅ |
| `GET` | `/plans` | 4242 | ❌ |
| `GET` | `/portfolio` | 3828 | ❌ |
| `POST` | `/portfolio` | 3836 | ❌ |
| `GET` | `/portfolio/rebalance` | 3876 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3869 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3858 | ❌ |
| `GET` | `/prices` | 3552 | ✅ |
| `GET` | `/public/settings` | 9051 | ✅ |
| `GET` | `/quote/{symbol}` | 9789 | ❌ |
| `GET` | `/stock/{symbol}` | 5681 | ✅ |
| `POST` | `/subscriptions/cancel` | 5207 | ✅ |
| `GET` | `/subscriptions/current` | 5159 | ✅ |
| `POST` | `/subscriptions/resume` | 5266 | ✅ |
| `GET` | `/tickers/search` | 5788 | ✅ |
| `GET` | `/tickers/universal-search` | 5801 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5476 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5459 | ✅ |
| `GET` | `/user-states/list` | 5500 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5489 | ✅ |
| `POST` | `/user-states/save` | 5392 | ✅ |
| `POST` | `/webhook/nowpayments` | 5077 | ✅ |
| `POST` | `/webhook/revolut` | 4983 | ✅ |
| `POST` | `/webhook/stripe` | 4818 | ❌ |

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
| `components/calculators/` | 17 | 5,023 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,265 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 88 | 14,667 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 600 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 36 | 7,995 |
| `components/performance/` | 8 | 3,891 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 315 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 31 | 1,763 |
| `pages/` | 23 | 17,055 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,232 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,886 |
| `frontend/src/lib/i18n/de.js` | 4,886 |
| `frontend/src/lib/i18n/en.js` | 4,886 |
| `frontend/src/lib/i18n/es.js` | 4,886 |
| `frontend/src/lib/i18n/fr.js` | 4,886 |
| `frontend/src/lib/i18n/it.js` | 4,886 |
| `frontend/src/lib/i18n/ja.js` | 4,886 |
| `frontend/src/lib/i18n/pt.js` | 4,886 |
| `frontend/src/lib/i18n/ru.js` | 4,886 |
| `frontend/src/lib/i18n/zh.js` | 4,886 |

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

