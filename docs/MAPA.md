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
| Líneas de Python (backend) | 26,891 |
| Rutas declaradas | 199 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 59 · 1001 |
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
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8688` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3586` |
| `POST` | `/api/calculate/american` | `backend/server.py:5823` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5707` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7510` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:804` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6821` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3668` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3157` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5605` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:741` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7468` |
| `GET` | `/api/plans` | `backend/server.py:3726` |
| `GET` | `/api/portfolio` | `backend/server.py:3344` |
| `POST` | `/api/portfolio` | `backend/server.py:3352` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3392` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3385` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3374` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9198` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:133` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:333` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:4968` |

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
| `server.py` | 9,577 | 141 | — |
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
| `GET` | `/` | 4983 | ✅ |
| `GET` | `/admin/audit-log` | 8621 | ✅ |
| `GET` | `/admin/coupons` | 9335 | ✅ |
| `POST` | `/admin/coupons` | 9341 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9364 | ✅ |
| `GET` | `/admin/feature-flags` | 9384 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9393 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8658 | ✅ |
| `GET` | `/admin/market-data-health` | 9178 | ✅ |
| `GET` | `/admin/metrics` | 7900 | ✅ |
| `POST` | `/admin/payments/manual` | 8996 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8840 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9132 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8928 | ✅ |
| `POST` | `/admin/promote` | 7948 | ✅ |
| `GET` | `/admin/revenue` | 8721 | ✅ |
| `GET` | `/admin/settings` | 8371 | ✅ |
| `PUT` | `/admin/settings` | 8394 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8688 | ❌ |
| `GET` | `/admin/usage` | 9214 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9281 | ✅ |
| `GET` | `/admin/users` | 7800 | ✅ |
| `POST` | `/admin/users` | 8020 | ✅ |
| `GET` | `/admin/users.csv` | 7870 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8130 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8063 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8165 | ✅ |
| `GET` | `/admin/webhooks` | 9408 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9414 | ✅ |
| `GET` | `/alerts` | 3460 | ✅ |
| `POST` | `/alerts` | 3446 | ✅ |
| `POST` | `/alerts/send-email` | 3586 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3468 | ✅ |
| `POST` | `/analytics/track` | 9254 | ✅ |
| `POST` | `/auth/2fa/disable` | 2526 | ✅ |
| `POST` | `/auth/2fa/enable` | 2507 | ✅ |
| `POST` | `/auth/2fa/setup` | 2491 | ✅ |
| `POST` | `/auth/2fa/verify` | 2544 | ✅ |
| `DELETE` | `/auth/account` | 2799 | ✅ |
| `POST` | `/auth/change-password` | 2442 | ✅ |
| `POST` | `/auth/forgot-password` | 2381 | ✅ |
| `POST` | `/auth/google` | 2916 | ✅ |
| `POST` | `/auth/login` | 1999 | ✅ |
| `POST` | `/auth/logout` | 2113 | ✅ |
| `POST` | `/auth/magic-link` | 2215 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2262 | ✅ |
| `GET` | `/auth/me` | 2081 | ✅ |
| `GET` | `/auth/my-data` | 2825 | ✅ |
| `GET` | `/auth/passkey/available` | 2630 | ✅ |
| `GET` | `/auth/passkey/list` | 2764 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2690 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2701 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2637 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2655 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2770 | ✅ |
| `POST` | `/auth/profile` | 3039 | ✅ |
| `POST` | `/auth/refresh` | 2136 | ✅ |
| `POST` | `/auth/register` | 1952 | ✅ |
| `POST` | `/auth/reset-password` | 2408 | ✅ |
| `GET` | `/backtest/strategies` | 7446 | ✅ |
| `POST` | `/backtest/validate` | 7375 | ✅ |
| `POST` | `/billing/create-portal-session` | 4780 | ✅ |
| `GET` | `/billing/history` | 4815 | ✅ |
| `GET` | `/brokers` | 8484 | ✅ |
| `POST` | `/calculate/american` | 5823 | ❌ |
| `POST` | `/calculate/assignment` | 5767 | ✅ |
| `POST` | `/calculate/greeks` | 5736 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5463 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5707 | ❌ |
| `POST` | `/calculate/payoff` | 5653 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5746 | ✅ |
| `POST` | `/calculate/volatility-size` | 7510 | ❌ |
| `GET` | `/calculations` | 3709 | ✅ |
| `POST` | `/calculations` | 3696 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3717 | ✅ |
| `POST` | `/checkout/create` | 3938 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4104 | ✅ |
| `POST` | `/education/assistant` | 6549 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 6948 | ✅ |
| `GET` | `/education/pattern-catalog` | 6821 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6828 | ✅ |
| `GET` | `/education/scan-timeframes` | 6814 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6881 | ✅ |
| `GET` | `/health` | 4987 | ❌ |
| `GET` | `/journal/stats` | 3326 | ✅ |
| `GET` | `/market/risk-free` | 5687 | ✅ |
| `POST` | `/monte-carlo` | 3668 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3157 | ❌ |
| `POST` | `/optimize` | 5881 | ✅ |
| `POST` | `/options/ai-analyze` | 6446 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5391 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 5934 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5287 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6108 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5481 | ✅ |
| `GET` | `/options/market-flow` | 6690 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5539 | ✅ |
| `GET` | `/options/positions` | 6002 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6021 | ✅ |
| `POST` | `/options/positions/save` | 5984 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6011 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5605 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6241 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4126 | ✅ |
| `GET` | `/performance/analytics` | 7528 | ✅ |
| `GET` | `/performance/instruments` | 7188 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7468 | ❌ |
| `GET` | `/performance/trades` | 7259 | ✅ |
| `POST` | `/performance/trades` | 7201 | ✅ |
| `POST` | `/performance/trades/bulk` | 7224 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7347 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7284 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7297 | ✅ |
| `GET` | `/plan` | 7679 | ✅ |
| `POST` | `/plan` | 7707 | ✅ |
| `GET` | `/plan/compliance` | 7742 | ✅ |
| `PATCH` | `/plan/draft` | 7731 | ✅ |
| `GET` | `/plan/history` | 7688 | ✅ |
| `GET` | `/plans` | 3726 | ❌ |
| `GET` | `/portfolio` | 3344 | ❌ |
| `POST` | `/portfolio` | 3352 | ❌ |
| `GET` | `/portfolio/rebalance` | 3392 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3385 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3374 | ❌ |
| `GET` | `/prices` | 3068 | ✅ |
| `GET` | `/public/settings` | 8464 | ✅ |
| `GET` | `/quote/{symbol}` | 9198 | ❌ |
| `GET` | `/stock/{symbol}` | 5150 | ✅ |
| `POST` | `/subscriptions/cancel` | 4675 | ✅ |
| `GET` | `/subscriptions/current` | 4627 | ✅ |
| `POST` | `/subscriptions/resume` | 4734 | ✅ |
| `GET` | `/tickers/search` | 5257 | ✅ |
| `GET` | `/tickers/universal-search` | 5270 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 4944 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 4927 | ✅ |
| `GET` | `/user-states/list` | 4968 | ❌ |
| `DELETE` | `/user-states/reset-all` | 4957 | ✅ |
| `POST` | `/user-states/save` | 4860 | ✅ |
| `POST` | `/webhook/nowpayments` | 4545 | ✅ |
| `POST` | `/webhook/revolut` | 4451 | ✅ |
| `POST` | `/webhook/stripe` | 4286 | ❌ |

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
| `pages/` | 23 | 16,816 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,577 |
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

