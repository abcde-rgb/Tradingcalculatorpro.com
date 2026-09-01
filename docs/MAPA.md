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
| Líneas de Python (backend) | 28,614 |
| Rutas declaradas | 206 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 69 · 1165 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,404 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9521` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4306` |
| `GET` | `/api/auth/admin-status` | `backend/server.py:3670` |
| `POST` | `/api/calculate/american` | `backend/server.py:6590` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:6474` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8309` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:839` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7620` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4415` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3877` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6372` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:776` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:8267` |
| `GET` | `/api/plans` | `backend/server.py:4478` |
| `GET` | `/api/portfolio` | `backend/server.py:4064` |
| `POST` | `/api/portfolio` | `backend/server.py:4072` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:4112` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:4105` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:4094` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:10035` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:468` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5736` |

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
| `server.py` | 10,638 | 144 | — |
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

### `backend/server.py` — 144 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5751 | ✅ |
| `GET` | `/admin/audit-log` | 9454 | ✅ |
| `GET` | `/admin/coupons` | 10332 | ✅ |
| `POST` | `/admin/coupons` | 10338 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 10361 | ✅ |
| `GET` | `/admin/feature-flags` | 10381 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 10390 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9491 | ✅ |
| `GET` | `/admin/market-data-health` | 10015 | ✅ |
| `GET` | `/admin/metrics` | 8699 | ✅ |
| `POST` | `/admin/payments/manual` | 9829 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9673 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9969 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9761 | ✅ |
| `POST` | `/admin/promote` | 8757 | ✅ |
| `GET` | `/admin/revenue` | 9554 | ✅ |
| `GET` | `/admin/settings` | 9203 | ✅ |
| `PUT` | `/admin/settings` | 9227 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9521 | ❌ |
| `GET` | `/admin/usage` | 10051 | ✅ |
| `GET` | `/admin/usage-heatmap` | 10118 | ✅ |
| `GET` | `/admin/users` | 8599 | ✅ |
| `POST` | `/admin/users` | 8831 | ✅ |
| `GET` | `/admin/users.csv` | 8669 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8945 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8876 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8980 | ✅ |
| `GET` | `/admin/webhooks` | 10405 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10411 | ✅ |
| `GET` | `/alerts` | 4180 | ✅ |
| `POST` | `/alerts` | 4166 | ✅ |
| `POST` | `/alerts/send-email` | 4306 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 4188 | ✅ |
| `POST` | `/analytics/track` | 10091 | ✅ |
| `POST` | `/auth/2fa/disable` | 3111 | ✅ |
| `POST` | `/auth/2fa/enable` | 3092 | ✅ |
| `POST` | `/auth/2fa/setup` | 3076 | ✅ |
| `POST` | `/auth/2fa/verify` | 3129 | ✅ |
| `DELETE` | `/auth/account` | 3388 | ✅ |
| `GET` | `/auth/admin-status` | 3670 | ❌ |
| `POST` | `/auth/change-password` | 3024 | ✅ |
| `POST` | `/auth/forgot-password` | 2961 | ✅ |
| `POST` | `/auth/google` | 3509 | ✅ |
| `POST` | `/auth/login` | 2453 | ✅ |
| `POST` | `/auth/logout` | 2619 | ✅ |
| `POST` | `/auth/magic-link` | 2757 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2806 | ✅ |
| `GET` | `/auth/me` | 2585 | ✅ |
| `GET` | `/auth/my-data` | 3414 | ✅ |
| `GET` | `/auth/passkey/available` | 3217 | ✅ |
| `GET` | `/auth/passkey/list` | 3353 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3277 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3288 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3224 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3242 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3359 | ✅ |
| `POST` | `/auth/profile` | 3743 | ✅ |
| `PUT` | `/auth/profile` | 3744 | ✅ |
| `POST` | `/auth/refresh` | 2665 | ✅ |
| `POST` | `/auth/register` | 2381 | ✅ |
| `POST` | `/auth/reset-password` | 2990 | ✅ |
| `GET` | `/backtest/strategies` | 8245 | ✅ |
| `POST` | `/backtest/validate` | 8174 | ✅ |
| `POST` | `/billing/create-portal-session` | 5548 | ✅ |
| `GET` | `/billing/history` | 5583 | ✅ |
| `GET` | `/brokers` | 9317 | ✅ |
| `POST` | `/calculate/american` | 6590 | ❌ |
| `POST` | `/calculate/assignment` | 6534 | ✅ |
| `POST` | `/calculate/greeks` | 6503 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 6230 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6474 | ❌ |
| `POST` | `/calculate/payoff` | 6420 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6513 | ✅ |
| `POST` | `/calculate/volatility-size` | 8309 | ❌ |
| `GET` | `/calculations` | 4461 | ✅ |
| `POST` | `/calculations` | 4448 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4469 | ✅ |
| `POST` | `/checkout/create` | 4690 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4856 | ✅ |
| `POST` | `/education/assistant` | 7341 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7747 | ✅ |
| `GET` | `/education/pattern-catalog` | 7620 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7627 | ✅ |
| `GET` | `/education/scan-timeframes` | 7613 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7680 | ✅ |
| `POST` | `/errors/report` | 10244 | ✅ |
| `GET` | `/health` | 5755 | ❌ |
| `GET` | `/journal/stats` | 4046 | ✅ |
| `GET` | `/market/risk-free` | 6454 | ✅ |
| `POST` | `/monte-carlo` | 4415 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3877 | ❌ |
| `POST` | `/optimize` | 6648 | ✅ |
| `POST` | `/options/ai-analyze` | 7229 | ✅ |
| `GET` | `/options/chain/{symbol}` | 6158 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6701 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 6054 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6875 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6248 | ✅ |
| `GET` | `/options/market-flow` | 7489 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6306 | ✅ |
| `GET` | `/options/positions` | 6769 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6788 | ✅ |
| `POST` | `/options/positions/save` | 6751 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6778 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6372 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 7008 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4878 | ✅ |
| `GET` | `/performance/analytics` | 8327 | ✅ |
| `GET` | `/performance/instruments` | 7987 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8267 | ❌ |
| `GET` | `/performance/trades` | 8058 | ✅ |
| `POST` | `/performance/trades` | 8000 | ✅ |
| `POST` | `/performance/trades/bulk` | 8023 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 8146 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 8083 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 8096 | ✅ |
| `GET` | `/plan` | 8478 | ✅ |
| `POST` | `/plan` | 8506 | ✅ |
| `GET` | `/plan/compliance` | 8541 | ✅ |
| `PATCH` | `/plan/draft` | 8530 | ✅ |
| `GET` | `/plan/history` | 8487 | ✅ |
| `GET` | `/plans` | 4478 | ❌ |
| `GET` | `/portfolio` | 4064 | ❌ |
| `POST` | `/portfolio` | 4072 | ❌ |
| `GET` | `/portfolio/rebalance` | 4112 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 4105 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 4094 | ❌ |
| `GET` | `/prices` | 3788 | ✅ |
| `GET` | `/public/settings` | 9297 | ✅ |
| `GET` | `/quote/{symbol}` | 10035 | ❌ |
| `GET` | `/stock/{symbol}` | 5917 | ✅ |
| `POST` | `/subscriptions/cancel` | 5443 | ✅ |
| `GET` | `/subscriptions/current` | 5395 | ✅ |
| `POST` | `/subscriptions/resume` | 5502 | ✅ |
| `GET` | `/tickers/search` | 6024 | ✅ |
| `GET` | `/tickers/universal-search` | 6037 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5712 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5695 | ✅ |
| `GET` | `/user-states/list` | 5736 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5725 | ✅ |
| `POST` | `/user-states/save` | 5628 | ✅ |
| `POST` | `/webhook/nowpayments` | 5313 | ✅ |
| `POST` | `/webhook/revolut` | 5219 | ✅ |
| `POST` | `/webhook/stripe` | 5054 | ❌ |

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
| `components/calculators/` | 17 | 5,023 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,269 |
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
| `pages/` | 23 | 17,186 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,638 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,911 |
| `frontend/src/lib/i18n/de.js` | 4,911 |
| `frontend/src/lib/i18n/en.js` | 4,911 |
| `frontend/src/lib/i18n/es.js` | 4,911 |
| `frontend/src/lib/i18n/fr.js` | 4,911 |
| `frontend/src/lib/i18n/it.js` | 4,911 |
| `frontend/src/lib/i18n/ja.js` | 4,911 |
| `frontend/src/lib/i18n/pt.js` | 4,911 |
| `frontend/src/lib/i18n/ru.js` | 4,911 |
| `frontend/src/lib/i18n/zh.js` | 4,911 |

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

