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
| Líneas de Python (backend) | 28,377 |
| Rutas declaradas | 205 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 68 · 1138 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,406 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (28)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9443` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4238` |
| `GET` | `/api/auth/admin-status` | `backend/server.py:3621` |
| `POST` | `/api/auth/logout` | `backend/server.py:2596` |
| `POST` | `/api/calculate/american` | `backend/server.py:6522` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:6406` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8241` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:839` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7552` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4347` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3809` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6304` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:776` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:8199` |
| `GET` | `/api/plans` | `backend/server.py:4410` |
| `GET` | `/api/portfolio` | `backend/server.py:3996` |
| `POST` | `/api/portfolio` | `backend/server.py:4004` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:4044` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:4037` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:4026` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9957` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:468` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5668` |

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
| `server.py` | 10,401 | 143 | — |
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

### `backend/server.py` — 143 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5683 | ✅ |
| `GET` | `/admin/audit-log` | 9376 | ✅ |
| `GET` | `/admin/coupons` | 10094 | ✅ |
| `POST` | `/admin/coupons` | 10100 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 10123 | ✅ |
| `GET` | `/admin/feature-flags` | 10143 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 10152 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9413 | ✅ |
| `GET` | `/admin/market-data-health` | 9937 | ✅ |
| `GET` | `/admin/metrics` | 8631 | ✅ |
| `POST` | `/admin/payments/manual` | 9751 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9595 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9891 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9683 | ✅ |
| `POST` | `/admin/promote` | 8679 | ✅ |
| `GET` | `/admin/revenue` | 9476 | ✅ |
| `GET` | `/admin/settings` | 9125 | ✅ |
| `PUT` | `/admin/settings` | 9149 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9443 | ❌ |
| `GET` | `/admin/usage` | 9973 | ✅ |
| `GET` | `/admin/usage-heatmap` | 10040 | ✅ |
| `GET` | `/admin/users` | 8531 | ✅ |
| `POST` | `/admin/users` | 8753 | ✅ |
| `GET` | `/admin/users.csv` | 8601 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8867 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8798 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8902 | ✅ |
| `GET` | `/admin/webhooks` | 10167 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10173 | ✅ |
| `GET` | `/alerts` | 4112 | ✅ |
| `POST` | `/alerts` | 4098 | ✅ |
| `POST` | `/alerts/send-email` | 4238 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 4120 | ✅ |
| `POST` | `/analytics/track` | 10013 | ✅ |
| `POST` | `/auth/2fa/disable` | 3084 | ✅ |
| `POST` | `/auth/2fa/enable` | 3065 | ✅ |
| `POST` | `/auth/2fa/setup` | 3049 | ✅ |
| `POST` | `/auth/2fa/verify` | 3102 | ✅ |
| `DELETE` | `/auth/account` | 3357 | ✅ |
| `GET` | `/auth/admin-status` | 3621 | ❌ |
| `POST` | `/auth/change-password` | 2997 | ✅ |
| `POST` | `/auth/forgot-password` | 2934 | ✅ |
| `POST` | `/auth/google` | 3474 | ✅ |
| `POST` | `/auth/login` | 2415 | ✅ |
| `POST` | `/auth/logout` | 2596 | ❌ |
| `POST` | `/auth/magic-link` | 2732 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2781 | ✅ |
| `GET` | `/auth/me` | 2545 | ✅ |
| `GET` | `/auth/my-data` | 3383 | ✅ |
| `GET` | `/auth/passkey/available` | 3188 | ✅ |
| `GET` | `/auth/passkey/list` | 3322 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3248 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3259 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3195 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3213 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3328 | ✅ |
| `POST` | `/auth/profile` | 3691 | ✅ |
| `POST` | `/auth/refresh` | 2642 | ✅ |
| `POST` | `/auth/refresh/logout` | 2595 | ✅ |
| `POST` | `/auth/register` | 2350 | ✅ |
| `POST` | `/auth/reset-password` | 2963 | ✅ |
| `GET` | `/backtest/strategies` | 8177 | ✅ |
| `POST` | `/backtest/validate` | 8106 | ✅ |
| `POST` | `/billing/create-portal-session` | 5480 | ✅ |
| `GET` | `/billing/history` | 5515 | ✅ |
| `GET` | `/brokers` | 9239 | ✅ |
| `POST` | `/calculate/american` | 6522 | ❌ |
| `POST` | `/calculate/assignment` | 6466 | ✅ |
| `POST` | `/calculate/greeks` | 6435 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 6162 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6406 | ❌ |
| `POST` | `/calculate/payoff` | 6352 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6445 | ✅ |
| `POST` | `/calculate/volatility-size` | 8241 | ❌ |
| `GET` | `/calculations` | 4393 | ✅ |
| `POST` | `/calculations` | 4380 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4401 | ✅ |
| `POST` | `/checkout/create` | 4622 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4788 | ✅ |
| `POST` | `/education/assistant` | 7273 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7679 | ✅ |
| `GET` | `/education/pattern-catalog` | 7552 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7559 | ✅ |
| `GET` | `/education/scan-timeframes` | 7545 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7612 | ✅ |
| `GET` | `/health` | 5687 | ❌ |
| `GET` | `/journal/stats` | 3978 | ✅ |
| `GET` | `/market/risk-free` | 6386 | ✅ |
| `POST` | `/monte-carlo` | 4347 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3809 | ❌ |
| `POST` | `/optimize` | 6580 | ✅ |
| `POST` | `/options/ai-analyze` | 7161 | ✅ |
| `GET` | `/options/chain/{symbol}` | 6090 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6633 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5986 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6807 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6180 | ✅ |
| `GET` | `/options/market-flow` | 7421 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6238 | ✅ |
| `GET` | `/options/positions` | 6701 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6720 | ✅ |
| `POST` | `/options/positions/save` | 6683 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6710 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6304 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6940 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4810 | ✅ |
| `GET` | `/performance/analytics` | 8259 | ✅ |
| `GET` | `/performance/instruments` | 7919 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8199 | ❌ |
| `GET` | `/performance/trades` | 7990 | ✅ |
| `POST` | `/performance/trades` | 7932 | ✅ |
| `POST` | `/performance/trades/bulk` | 7955 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 8078 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 8015 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 8028 | ✅ |
| `GET` | `/plan` | 8410 | ✅ |
| `POST` | `/plan` | 8438 | ✅ |
| `GET` | `/plan/compliance` | 8473 | ✅ |
| `PATCH` | `/plan/draft` | 8462 | ✅ |
| `GET` | `/plan/history` | 8419 | ✅ |
| `GET` | `/plans` | 4410 | ❌ |
| `GET` | `/portfolio` | 3996 | ❌ |
| `POST` | `/portfolio` | 4004 | ❌ |
| `GET` | `/portfolio/rebalance` | 4044 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 4037 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 4026 | ❌ |
| `GET` | `/prices` | 3720 | ✅ |
| `GET` | `/public/settings` | 9219 | ✅ |
| `GET` | `/quote/{symbol}` | 9957 | ❌ |
| `GET` | `/stock/{symbol}` | 5849 | ✅ |
| `POST` | `/subscriptions/cancel` | 5375 | ✅ |
| `GET` | `/subscriptions/current` | 5327 | ✅ |
| `POST` | `/subscriptions/resume` | 5434 | ✅ |
| `GET` | `/tickers/search` | 5956 | ✅ |
| `GET` | `/tickers/universal-search` | 5969 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5644 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5627 | ✅ |
| `GET` | `/user-states/list` | 5668 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5657 | ✅ |
| `POST` | `/user-states/save` | 5560 | ✅ |
| `POST` | `/webhook/nowpayments` | 5245 | ✅ |
| `POST` | `/webhook/revolut` | 5151 | ✅ |
| `POST` | `/webhook/stripe` | 4986 | ❌ |

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
| `components/auth/` | 4 | 474 |
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
| `pages/` | 23 | 17,147 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,401 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 4,913 |
| `frontend/src/lib/i18n/de.js` | 4,913 |
| `frontend/src/lib/i18n/en.js` | 4,913 |
| `frontend/src/lib/i18n/es.js` | 4,913 |
| `frontend/src/lib/i18n/fr.js` | 4,913 |
| `frontend/src/lib/i18n/it.js` | 4,913 |
| `frontend/src/lib/i18n/ja.js` | 4,913 |
| `frontend/src/lib/i18n/pt.js` | 4,913 |
| `frontend/src/lib/i18n/ru.js` | 4,913 |
| `frontend/src/lib/i18n/zh.js` | 4,913 |

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

