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
| Líneas de Python (backend) | 26,892 |
| Rutas declaradas | 198 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 61 · 975 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,965 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (29)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8699` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3655` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7479` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7408` |
| `POST` | `/api/calculate/american` | `backend/server.py:5824` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5708` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7543` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:837` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:279` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6854` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:186` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:223` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3764` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3226` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5606` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:774` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7501` |
| `GET` | `/api/plans` | `backend/server.py:3827` |
| `GET` | `/api/portfolio` | `backend/server.py:3413` |
| `POST` | `/api/portfolio` | `backend/server.py:3421` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3461` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3454` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3443` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9058` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:160` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:389` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:492` |
| `GET` | `/api/user-states/list` | `backend/server.py:4969` |

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
| `server.py` | 9,441 | 140 | — |
| `performance.py` | 1,835 |  | Performance analytics — trade journal, metrics, error detection. |
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
| `GET` | `/` | 4984 | ✅ |
| `GET` | `/admin/audit-log` | 8632 | ✅ |
| `GET` | `/admin/coupons` | 9195 | ✅ |
| `POST` | `/admin/coupons` | 9201 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9224 | ✅ |
| `GET` | `/admin/feature-flags` | 9244 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9253 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8669 | ✅ |
| `GET` | `/admin/market-data-health` | 9038 | ✅ |
| `GET` | `/admin/metrics` | 7933 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8851 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8992 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8939 | ✅ |
| `POST` | `/admin/promote` | 7981 | ✅ |
| `GET` | `/admin/revenue` | 8732 | ✅ |
| `GET` | `/admin/settings` | 8395 | ✅ |
| `PUT` | `/admin/settings` | 8418 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8699 | ❌ |
| `GET` | `/admin/usage` | 9074 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9141 | ✅ |
| `GET` | `/admin/users` | 7833 | ✅ |
| `POST` | `/admin/users` | 8053 | ✅ |
| `GET` | `/admin/users.csv` | 7903 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8163 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8096 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8198 | ✅ |
| `GET` | `/admin/webhooks` | 9268 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9274 | ✅ |
| `GET` | `/alerts` | 3529 | ✅ |
| `POST` | `/alerts` | 3515 | ✅ |
| `POST` | `/alerts/send-email` | 3655 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3537 | ✅ |
| `POST` | `/analytics/track` | 9114 | ✅ |
| `POST` | `/auth/2fa/disable` | 2583 | ✅ |
| `POST` | `/auth/2fa/enable` | 2564 | ✅ |
| `POST` | `/auth/2fa/setup` | 2548 | ✅ |
| `POST` | `/auth/2fa/verify` | 2601 | ✅ |
| `DELETE` | `/auth/account` | 2856 | ✅ |
| `POST` | `/auth/change-password` | 2496 | ✅ |
| `POST` | `/auth/forgot-password` | 2435 | ✅ |
| `POST` | `/auth/google` | 2973 | ✅ |
| `POST` | `/auth/login` | 2044 | ✅ |
| `POST` | `/auth/logout` | 2158 | ✅ |
| `POST` | `/auth/magic-link` | 2260 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2307 | ✅ |
| `GET` | `/auth/me` | 2126 | ✅ |
| `GET` | `/auth/my-data` | 2882 | ✅ |
| `GET` | `/auth/passkey/available` | 2687 | ✅ |
| `GET` | `/auth/passkey/list` | 2821 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2747 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2758 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2694 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2712 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2827 | ✅ |
| `POST` | `/auth/profile` | 3108 | ✅ |
| `POST` | `/auth/refresh` | 2181 | ✅ |
| `POST` | `/auth/register` | 1993 | ✅ |
| `POST` | `/auth/reset-password` | 2462 | ✅ |
| `GET` | `/backtest/strategies` | 7479 | ❌ |
| `POST` | `/backtest/validate` | 7408 | ❌ |
| `POST` | `/billing/create-portal-session` | 4781 | ✅ |
| `GET` | `/billing/history` | 4816 | ✅ |
| `GET` | `/brokers` | 8495 | ✅ |
| `POST` | `/calculate/american` | 5824 | ❌ |
| `POST` | `/calculate/assignment` | 5768 | ✅ |
| `POST` | `/calculate/greeks` | 5737 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5464 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5708 | ❌ |
| `POST` | `/calculate/payoff` | 5654 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5747 | ✅ |
| `POST` | `/calculate/volatility-size` | 7543 | ❌ |
| `GET` | `/calculations` | 3810 | ✅ |
| `POST` | `/calculations` | 3797 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3818 | ✅ |
| `POST` | `/checkout/create` | 3966 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4109 | ✅ |
| `POST` | `/education/assistant` | 6575 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 6981 | ✅ |
| `GET` | `/education/pattern-catalog` | 6854 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6861 | ✅ |
| `GET` | `/education/scan-timeframes` | 6847 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6914 | ✅ |
| `GET` | `/health` | 4988 | ❌ |
| `GET` | `/journal/stats` | 3395 | ✅ |
| `GET` | `/market/risk-free` | 5688 | ✅ |
| `POST` | `/monte-carlo` | 3764 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3226 | ❌ |
| `POST` | `/optimize` | 5882 | ✅ |
| `POST` | `/options/ai-analyze` | 6463 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5392 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 5935 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5288 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6109 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5482 | ✅ |
| `GET` | `/options/market-flow` | 6723 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5540 | ✅ |
| `GET` | `/options/positions` | 6003 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6022 | ✅ |
| `POST` | `/options/positions/save` | 5985 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6012 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5606 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6242 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4131 | ✅ |
| `GET` | `/performance/analytics` | 7561 | ✅ |
| `GET` | `/performance/instruments` | 7221 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7501 | ❌ |
| `GET` | `/performance/trades` | 7292 | ✅ |
| `POST` | `/performance/trades` | 7234 | ✅ |
| `POST` | `/performance/trades/bulk` | 7257 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7380 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7317 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7330 | ✅ |
| `GET` | `/plan` | 7712 | ✅ |
| `POST` | `/plan` | 7740 | ✅ |
| `GET` | `/plan/compliance` | 7775 | ✅ |
| `PATCH` | `/plan/draft` | 7764 | ✅ |
| `GET` | `/plan/history` | 7721 | ✅ |
| `GET` | `/plans` | 3827 | ❌ |
| `GET` | `/portfolio` | 3413 | ❌ |
| `POST` | `/portfolio` | 3421 | ❌ |
| `GET` | `/portfolio/rebalance` | 3461 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3454 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3443 | ❌ |
| `GET` | `/prices` | 3137 | ✅ |
| `GET` | `/public/settings` | 8488 | ✅ |
| `GET` | `/quote/{symbol}` | 9058 | ❌ |
| `GET` | `/stock/{symbol}` | 5151 | ✅ |
| `POST` | `/subscriptions/cancel` | 4676 | ✅ |
| `GET` | `/subscriptions/current` | 4628 | ✅ |
| `POST` | `/subscriptions/resume` | 4735 | ✅ |
| `GET` | `/tickers/search` | 5258 | ✅ |
| `GET` | `/tickers/universal-search` | 5271 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 4945 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 4928 | ✅ |
| `GET` | `/user-states/list` | 4969 | ❌ |
| `DELETE` | `/user-states/reset-all` | 4958 | ✅ |
| `POST` | `/user-states/save` | 4861 | ✅ |
| `POST` | `/webhook/nowpayments` | 4546 | ✅ |
| `POST` | `/webhook/revolut` | 4452 | ✅ |
| `POST` | `/webhook/stripe` | 4287 | ❌ |

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
| `components/calculators/` | 15 | 4,644 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,248 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 81 | 13,122 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 36 | 7,995 |
| `components/performance/` | 7 | 3,469 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 30 | 1,612 |
| `pages/` | 23 | 16,344 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,441 |
| `frontend/src/pages/EducationPage.jsx` | 5,575 |
| `frontend/src/lib/i18n/ar.js` | 4,661 |
| `frontend/src/lib/i18n/de.js` | 4,661 |
| `frontend/src/lib/i18n/en.js` | 4,661 |
| `frontend/src/lib/i18n/es.js` | 4,661 |
| `frontend/src/lib/i18n/fr.js` | 4,661 |
| `frontend/src/lib/i18n/it.js` | 4,661 |
| `frontend/src/lib/i18n/ja.js` | 4,661 |
| `frontend/src/lib/i18n/pt.js` | 4,661 |
| `frontend/src/lib/i18n/ru.js` | 4,661 |
| `frontend/src/lib/i18n/zh.js` | 4,661 |

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

