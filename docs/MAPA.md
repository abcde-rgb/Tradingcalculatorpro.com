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
| Líneas de Python (backend) | 28,475 |
| Rutas declaradas | 205 |
| **Rutas sin consumidor en el frontend** | **28** |
| Ficheros de test · funciones de test | 69 · 1142 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,440 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (22)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9488` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4283` |
| `GET` | `/api/auth/admin-status` | `backend/server.py:3647` |
| `POST` | `/api/calculate/american` | `backend/server.py:6567` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8286` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:893` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7597` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4392` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3854` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6349` |
| `GET` | `/api/portfolio` | `backend/server.py:4041` |
| `POST` | `/api/portfolio` | `backend/server.py:4049` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:4089` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:4082` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:4071` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:10002` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:468` |
| `GET` | `/api/user-states/list` | `backend/server.py:5713` |

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
| `server.py` | 10,445 | 143 | — |
| `performance.py` | 1,844 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,248 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 1,024 | 9 | missing_apis.py |
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
| `POST` | `/calculations/{calc_id}/save-to-journal` | 893 | ❌ |
| `GET` | `/commodities-prices` | 281 | ❌ |
| `GET` | `/forex-prices` | 188 | ❌ |
| `GET` | `/indices-prices` | 225 | ❌ |
| `GET` | `/performance/export` | 830 | ✅ |
| `POST` | `/subscriptions/change-plan` | 494 | ✅ |
| `POST` | `/webhook/stripe/subscription` | 667 | ❌ |

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
| `GET` | `/` | 5728 | ✅ |
| `GET` | `/admin/audit-log` | 9421 | ✅ |
| `GET` | `/admin/coupons` | 10139 | ✅ |
| `POST` | `/admin/coupons` | 10145 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 10168 | ✅ |
| `GET` | `/admin/feature-flags` | 10188 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 10197 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9458 | ✅ |
| `GET` | `/admin/market-data-health` | 9982 | ✅ |
| `GET` | `/admin/metrics` | 8676 | ✅ |
| `POST` | `/admin/payments/manual` | 9796 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9640 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9936 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9728 | ✅ |
| `POST` | `/admin/promote` | 8724 | ✅ |
| `GET` | `/admin/revenue` | 9521 | ✅ |
| `GET` | `/admin/settings` | 9170 | ✅ |
| `PUT` | `/admin/settings` | 9194 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9488 | ❌ |
| `GET` | `/admin/usage` | 10018 | ✅ |
| `GET` | `/admin/usage-heatmap` | 10085 | ✅ |
| `GET` | `/admin/users` | 8576 | ✅ |
| `POST` | `/admin/users` | 8798 | ✅ |
| `GET` | `/admin/users.csv` | 8646 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8912 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8843 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8947 | ✅ |
| `GET` | `/admin/webhooks` | 10212 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10218 | ✅ |
| `GET` | `/alerts` | 4157 | ✅ |
| `POST` | `/alerts` | 4143 | ✅ |
| `POST` | `/alerts/send-email` | 4283 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 4165 | ✅ |
| `POST` | `/analytics/track` | 10058 | ✅ |
| `POST` | `/auth/2fa/disable` | 3088 | ✅ |
| `POST` | `/auth/2fa/enable` | 3069 | ✅ |
| `POST` | `/auth/2fa/setup` | 3053 | ✅ |
| `POST` | `/auth/2fa/verify` | 3106 | ✅ |
| `DELETE` | `/auth/account` | 3365 | ✅ |
| `GET` | `/auth/admin-status` | 3647 | ❌ |
| `POST` | `/auth/change-password` | 3001 | ✅ |
| `POST` | `/auth/forgot-password` | 2938 | ✅ |
| `POST` | `/auth/google` | 3486 | ✅ |
| `POST` | `/auth/login` | 2430 | ✅ |
| `POST` | `/auth/logout` | 2596 | ✅ |
| `POST` | `/auth/magic-link` | 2734 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2783 | ✅ |
| `GET` | `/auth/me` | 2562 | ✅ |
| `GET` | `/auth/my-data` | 3391 | ✅ |
| `GET` | `/auth/passkey/available` | 3194 | ✅ |
| `GET` | `/auth/passkey/list` | 3330 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3254 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3265 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3201 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3219 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3336 | ✅ |
| `POST` | `/auth/profile` | 3720 | ✅ |
| `PUT` | `/auth/profile` | 3721 | ✅ |
| `POST` | `/auth/refresh` | 2642 | ✅ |
| `POST` | `/auth/register` | 2358 | ✅ |
| `POST` | `/auth/reset-password` | 2967 | ✅ |
| `GET` | `/backtest/strategies` | 8222 | ✅ |
| `POST` | `/backtest/validate` | 8151 | ✅ |
| `POST` | `/billing/create-portal-session` | 5525 | ✅ |
| `GET` | `/billing/history` | 5560 | ✅ |
| `GET` | `/brokers` | 9284 | ✅ |
| `POST` | `/calculate/american` | 6567 | ❌ |
| `POST` | `/calculate/assignment` | 6511 | ✅ |
| `POST` | `/calculate/greeks` | 6480 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 6207 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6451 | ✅ |
| `POST` | `/calculate/payoff` | 6397 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6490 | ✅ |
| `POST` | `/calculate/volatility-size` | 8286 | ❌ |
| `GET` | `/calculations` | 4438 | ✅ |
| `POST` | `/calculations` | 4425 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4446 | ✅ |
| `POST` | `/checkout/create` | 4667 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4833 | ✅ |
| `POST` | `/education/assistant` | 7318 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7724 | ✅ |
| `GET` | `/education/pattern-catalog` | 7597 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7604 | ✅ |
| `GET` | `/education/scan-timeframes` | 7590 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7657 | ✅ |
| `GET` | `/health` | 5732 | ❌ |
| `GET` | `/journal/stats` | 4023 | ✅ |
| `GET` | `/market/risk-free` | 6431 | ✅ |
| `POST` | `/monte-carlo` | 4392 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3854 | ❌ |
| `POST` | `/optimize` | 6625 | ✅ |
| `POST` | `/options/ai-analyze` | 7206 | ✅ |
| `GET` | `/options/chain/{symbol}` | 6135 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6678 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 6031 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6852 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6225 | ✅ |
| `GET` | `/options/market-flow` | 7466 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6283 | ✅ |
| `GET` | `/options/positions` | 6746 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6765 | ✅ |
| `POST` | `/options/positions/save` | 6728 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6755 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6349 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6985 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4855 | ✅ |
| `GET` | `/performance/analytics` | 8304 | ✅ |
| `GET` | `/performance/instruments` | 7964 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8244 | ✅ |
| `GET` | `/performance/trades` | 8035 | ✅ |
| `POST` | `/performance/trades` | 7977 | ✅ |
| `POST` | `/performance/trades/bulk` | 8000 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 8123 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 8060 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 8073 | ✅ |
| `GET` | `/plan` | 8455 | ✅ |
| `POST` | `/plan` | 8483 | ✅ |
| `GET` | `/plan/compliance` | 8518 | ✅ |
| `PATCH` | `/plan/draft` | 8507 | ✅ |
| `GET` | `/plan/history` | 8464 | ✅ |
| `GET` | `/plans` | 4455 | ✅ |
| `GET` | `/portfolio` | 4041 | ❌ |
| `POST` | `/portfolio` | 4049 | ❌ |
| `GET` | `/portfolio/rebalance` | 4089 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 4082 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 4071 | ❌ |
| `GET` | `/prices` | 3765 | ✅ |
| `GET` | `/public/settings` | 9264 | ✅ |
| `GET` | `/quote/{symbol}` | 10002 | ❌ |
| `GET` | `/stock/{symbol}` | 5894 | ✅ |
| `POST` | `/subscriptions/cancel` | 5420 | ✅ |
| `GET` | `/subscriptions/current` | 5372 | ✅ |
| `POST` | `/subscriptions/resume` | 5479 | ✅ |
| `GET` | `/tickers/search` | 6001 | ✅ |
| `GET` | `/tickers/universal-search` | 6014 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5689 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5672 | ✅ |
| `GET` | `/user-states/list` | 5713 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5702 | ✅ |
| `POST` | `/user-states/save` | 5605 | ✅ |
| `POST` | `/webhook/nowpayments` | 5290 | ✅ |
| `POST` | `/webhook/revolut` | 5196 | ✅ |
| `POST` | `/webhook/stripe` | 5031 | ❌ |

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
| `components/auth/` | 3 | 290 |
| `components/backtesting/` | 1 | 175 |
| `components/brokers/` | 1 | 240 |
| `components/calculators/` | 17 | 5,143 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 13 | 2,511 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 88 | 14,667 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 600 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 36 | 7,995 |
| `components/performance/` | 9 | 4,119 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 315 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 31 | 1,763 |
| `pages/` | 23 | 17,274 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,445 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,947 |
| `frontend/src/lib/i18n/de.js` | 4,947 |
| `frontend/src/lib/i18n/en.js` | 4,947 |
| `frontend/src/lib/i18n/es.js` | 4,947 |
| `frontend/src/lib/i18n/fr.js` | 4,947 |
| `frontend/src/lib/i18n/it.js` | 4,947 |
| `frontend/src/lib/i18n/ja.js` | 4,947 |
| `frontend/src/lib/i18n/pt.js` | 4,947 |
| `frontend/src/lib/i18n/ru.js` | 4,947 |
| `frontend/src/lib/i18n/zh.js` | 4,947 |

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

