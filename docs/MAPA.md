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
| Líneas de Python (backend) | 27,111 |
| Rutas declaradas | 198 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 63 · 1031 |
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
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8810` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3767` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7590` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7519` |
| `POST` | `/api/calculate/american` | `backend/server.py:5935` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5819` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7654` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:837` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:279` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6965` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:186` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:223` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3876` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3338` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5717` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:774` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7612` |
| `GET` | `/api/plans` | `backend/server.py:3939` |
| `GET` | `/api/portfolio` | `backend/server.py:3525` |
| `POST` | `/api/portfolio` | `backend/server.py:3533` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3573` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3566` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3555` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9169` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:160` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:389` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:492` |
| `GET` | `/api/user-states/list` | `backend/server.py:5081` |

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
| `server.py` | 9,612 | 140 | — |
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
| `realtime_alerts.py` | 425 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
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
| `GET` | `/alerts/channels` | 402 | ✅ |
| `GET` | `/alerts/realtime/status` | 386 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 314 | ✅ |

### `backend/referrals.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/me` | 160 | ❌ |
| `POST` | `/referrals/redeem-credit` | 389 | ❌ |
| `POST` | `/referrals/track` | 207 | ✅ |

### `backend/server.py` — 140 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5096 | ✅ |
| `GET` | `/admin/audit-log` | 8743 | ✅ |
| `GET` | `/admin/coupons` | 9306 | ✅ |
| `POST` | `/admin/coupons` | 9312 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9335 | ✅ |
| `GET` | `/admin/feature-flags` | 9355 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9364 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8780 | ✅ |
| `GET` | `/admin/market-data-health` | 9149 | ✅ |
| `GET` | `/admin/metrics` | 8044 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8962 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9103 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9050 | ✅ |
| `POST` | `/admin/promote` | 8092 | ✅ |
| `GET` | `/admin/revenue` | 8843 | ✅ |
| `GET` | `/admin/settings` | 8506 | ✅ |
| `PUT` | `/admin/settings` | 8529 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8810 | ❌ |
| `GET` | `/admin/usage` | 9185 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9252 | ✅ |
| `GET` | `/admin/users` | 7944 | ✅ |
| `POST` | `/admin/users` | 8164 | ✅ |
| `GET` | `/admin/users.csv` | 8014 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8274 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8207 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8309 | ✅ |
| `GET` | `/admin/webhooks` | 9379 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9385 | ✅ |
| `GET` | `/alerts` | 3641 | ✅ |
| `POST` | `/alerts` | 3627 | ✅ |
| `POST` | `/alerts/send-email` | 3767 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3649 | ✅ |
| `POST` | `/analytics/track` | 9225 | ✅ |
| `POST` | `/auth/2fa/disable` | 2695 | ✅ |
| `POST` | `/auth/2fa/enable` | 2676 | ✅ |
| `POST` | `/auth/2fa/setup` | 2660 | ✅ |
| `POST` | `/auth/2fa/verify` | 2713 | ✅ |
| `DELETE` | `/auth/account` | 2968 | ✅ |
| `POST` | `/auth/change-password` | 2608 | ✅ |
| `POST` | `/auth/forgot-password` | 2547 | ✅ |
| `POST` | `/auth/google` | 3085 | ✅ |
| `POST` | `/auth/login` | 2156 | ✅ |
| `POST` | `/auth/logout` | 2270 | ✅ |
| `POST` | `/auth/magic-link` | 2372 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2419 | ✅ |
| `GET` | `/auth/me` | 2238 | ✅ |
| `GET` | `/auth/my-data` | 2994 | ✅ |
| `GET` | `/auth/passkey/available` | 2799 | ✅ |
| `GET` | `/auth/passkey/list` | 2933 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2859 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2870 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2806 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2824 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2939 | ✅ |
| `POST` | `/auth/profile` | 3220 | ✅ |
| `POST` | `/auth/refresh` | 2293 | ✅ |
| `POST` | `/auth/register` | 2105 | ✅ |
| `POST` | `/auth/reset-password` | 2574 | ✅ |
| `GET` | `/backtest/strategies` | 7590 | ❌ |
| `POST` | `/backtest/validate` | 7519 | ❌ |
| `POST` | `/billing/create-portal-session` | 4893 | ✅ |
| `GET` | `/billing/history` | 4928 | ✅ |
| `GET` | `/brokers` | 8606 | ✅ |
| `POST` | `/calculate/american` | 5935 | ❌ |
| `POST` | `/calculate/assignment` | 5879 | ✅ |
| `POST` | `/calculate/greeks` | 5848 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5575 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5819 | ❌ |
| `POST` | `/calculate/payoff` | 5765 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5858 | ✅ |
| `POST` | `/calculate/volatility-size` | 7654 | ❌ |
| `GET` | `/calculations` | 3922 | ✅ |
| `POST` | `/calculations` | 3909 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3930 | ✅ |
| `POST` | `/checkout/create` | 4078 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4221 | ✅ |
| `POST` | `/education/assistant` | 6686 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7092 | ✅ |
| `GET` | `/education/pattern-catalog` | 6965 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6972 | ✅ |
| `GET` | `/education/scan-timeframes` | 6958 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7025 | ✅ |
| `GET` | `/health` | 5100 | ❌ |
| `GET` | `/journal/stats` | 3507 | ✅ |
| `GET` | `/market/risk-free` | 5799 | ✅ |
| `POST` | `/monte-carlo` | 3876 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3338 | ❌ |
| `POST` | `/optimize` | 5993 | ✅ |
| `POST` | `/options/ai-analyze` | 6574 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5503 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6046 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5399 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6220 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5593 | ✅ |
| `GET` | `/options/market-flow` | 6834 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5651 | ✅ |
| `GET` | `/options/positions` | 6114 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6133 | ✅ |
| `POST` | `/options/positions/save` | 6096 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6123 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5717 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6353 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4243 | ✅ |
| `GET` | `/performance/analytics` | 7672 | ✅ |
| `GET` | `/performance/instruments` | 7332 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7612 | ❌ |
| `GET` | `/performance/trades` | 7403 | ✅ |
| `POST` | `/performance/trades` | 7345 | ✅ |
| `POST` | `/performance/trades/bulk` | 7368 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7491 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7428 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7441 | ✅ |
| `GET` | `/plan` | 7823 | ✅ |
| `POST` | `/plan` | 7851 | ✅ |
| `GET` | `/plan/compliance` | 7886 | ✅ |
| `PATCH` | `/plan/draft` | 7875 | ✅ |
| `GET` | `/plan/history` | 7832 | ✅ |
| `GET` | `/plans` | 3939 | ❌ |
| `GET` | `/portfolio` | 3525 | ❌ |
| `POST` | `/portfolio` | 3533 | ❌ |
| `GET` | `/portfolio/rebalance` | 3573 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3566 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3555 | ❌ |
| `GET` | `/prices` | 3249 | ✅ |
| `GET` | `/public/settings` | 8599 | ✅ |
| `GET` | `/quote/{symbol}` | 9169 | ❌ |
| `GET` | `/stock/{symbol}` | 5262 | ✅ |
| `POST` | `/subscriptions/cancel` | 4788 | ✅ |
| `GET` | `/subscriptions/current` | 4740 | ✅ |
| `POST` | `/subscriptions/resume` | 4847 | ✅ |
| `GET` | `/tickers/search` | 5369 | ✅ |
| `GET` | `/tickers/universal-search` | 5382 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5057 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5040 | ✅ |
| `GET` | `/user-states/list` | 5081 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5070 | ✅ |
| `POST` | `/user-states/save` | 4973 | ✅ |
| `POST` | `/webhook/nowpayments` | 4658 | ✅ |
| `POST` | `/webhook/revolut` | 4564 | ✅ |
| `POST` | `/webhook/stripe` | 4399 | ❌ |

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
| `backend/server.py` | 9,612 |
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

