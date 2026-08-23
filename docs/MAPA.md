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
| Módulos del backend | 34 |
| Líneas de Python (backend) | 25,972 |
| Rutas declaradas | 198 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 57 · 941 |
| Rutas del frontend (`App.js`) | 29 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,927 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (29)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8473` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3577` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7321` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7250` |
| `POST` | `/api/calculate/american` | `backend/server.py:5698` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5582` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7385` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:797` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:278` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6696` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:185` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:222` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3659` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3148` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5480` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:734` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7343` |
| `GET` | `/api/plans` | `backend/server.py:3717` |
| `GET` | `/api/portfolio` | `backend/server.py:3335` |
| `POST` | `/api/portfolio` | `backend/server.py:3343` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3383` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3376` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3365` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:8832` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:133` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:333` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:491` |
| `GET` | `/api/user-states/list` | `backend/server.py:4843` |

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
| `server.py` | 9,211 | 140 | — |
| `performance.py` | 1,819 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,206 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 928 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 867 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `stock_data.py` | 745 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `options_math.py` | 736 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 608 |  | Options Strategy Optimizer. |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `brokers_referidos.py` | 564 |  | Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
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
| `performance_metrics.py` | 196 |  | Advanced performance & risk metrics — the professional-grade gap. |
| `nowpayments.py` | 182 |  | NOWPayments — crypto payment gateway integration (invoice + IPN helpers). |
| `migrate_trades_schema.py` | 169 |  | Migra los documentos del diario legado (camelCase) al esquema canónico. |
| `ecb_rates.py` | 145 |  | Tipos de cambio del Banco Central Europeo. |
| `log_seguro.py` | 55 |  | Un valor de fuera, apto para meter en una línea de log. |

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
| `GET` | `/admin/referrals` | 866 | ✅ |
| `GET` | `/admin/referrals/leaderboard` | 888 | ✅ |
| `POST` | `/admin/set-plan` | 376 | ❌ |
| `POST` | `/admin/settings` | 452 | ✅ |
| `POST` | `/admin/users/{user_id}` | 404 | ✅ |
| `GET` | `/admin/users/{user_id}/payments` | 764 | ✅ |

### `backend/affiliate_program.py` — 18 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/affiliates` | 457 | ✅ |
| `POST` | `/admin/affiliates/payout-lines/{lid}/mark-paid` | 740 | ✅ |
| `GET` | `/admin/affiliates/payout-requests` | 762 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/mark-paid` | 773 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/reject` | 787 | ✅ |
| `POST` | `/admin/affiliates/payout-run` | 613 | ✅ |
| `POST` | `/admin/affiliates/payout-run/{rid}/finalize` | 698 | ✅ |
| `GET` | `/admin/affiliates/payout-runs` | 722 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}` | 729 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}/export.csv` | 797 | ✅ |
| `PATCH` | `/admin/affiliates/{aid}` | 596 | ✅ |
| `POST` | `/admin/affiliates/{aid}/approve` | 581 | ✅ |
| `POST` | `/admin/affiliates/{aid}/reject` | 586 | ✅ |
| `POST` | `/admin/affiliates/{aid}/suspend` | 591 | ✅ |
| `POST` | `/affiliate/apply` | 276 | ✅ |
| `GET` | `/affiliate/me` | 318 | ✅ |
| `PUT` | `/affiliate/payout-details` | 394 | ✅ |
| `POST` | `/affiliate/request-payout` | 413 | ✅ |

### `backend/missing_apis.py` — 9 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `POST` | `/auth/send-verification-email` | 426 | ✅ |
| `POST` | `/auth/verify-email` | 457 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 797 | ❌ |
| `GET` | `/commodities-prices` | 278 | ❌ |
| `GET` | `/forex-prices` | 185 | ❌ |
| `GET` | `/indices-prices` | 222 | ❌ |
| `GET` | `/performance/export` | 734 | ❌ |
| `POST` | `/subscriptions/change-plan` | 491 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 592 | ❌ |

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

### `backend/server.py` — 140 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 4858 | ✅ |
| `GET` | `/admin/audit-log` | 8406 | ✅ |
| `GET` | `/admin/coupons` | 8969 | ✅ |
| `POST` | `/admin/coupons` | 8975 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 8998 | ✅ |
| `GET` | `/admin/feature-flags` | 9018 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9027 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8443 | ✅ |
| `GET` | `/admin/market-data-health` | 8812 | ✅ |
| `GET` | `/admin/metrics` | 7771 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8625 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8766 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8713 | ✅ |
| `POST` | `/admin/promote` | 7819 | ✅ |
| `GET` | `/admin/revenue` | 8506 | ✅ |
| `GET` | `/admin/settings` | 8233 | ✅ |
| `PUT` | `/admin/settings` | 8256 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8473 | ❌ |
| `GET` | `/admin/usage` | 8848 | ✅ |
| `GET` | `/admin/usage-heatmap` | 8915 | ✅ |
| `GET` | `/admin/users` | 7675 | ✅ |
| `POST` | `/admin/users` | 7891 | ✅ |
| `GET` | `/admin/users.csv` | 7741 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8001 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 7934 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8036 | ✅ |
| `GET` | `/admin/webhooks` | 9042 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9048 | ✅ |
| `GET` | `/alerts` | 3451 | ✅ |
| `POST` | `/alerts` | 3437 | ✅ |
| `POST` | `/alerts/send-email` | 3577 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3459 | ✅ |
| `POST` | `/analytics/track` | 8888 | ✅ |
| `POST` | `/auth/2fa/disable` | 2517 | ✅ |
| `POST` | `/auth/2fa/enable` | 2498 | ✅ |
| `POST` | `/auth/2fa/setup` | 2482 | ✅ |
| `POST` | `/auth/2fa/verify` | 2535 | ✅ |
| `DELETE` | `/auth/account` | 2790 | ✅ |
| `POST` | `/auth/change-password` | 2433 | ✅ |
| `POST` | `/auth/forgot-password` | 2372 | ✅ |
| `POST` | `/auth/google` | 2907 | ✅ |
| `POST` | `/auth/login` | 1990 | ✅ |
| `POST` | `/auth/logout` | 2104 | ✅ |
| `POST` | `/auth/magic-link` | 2206 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2253 | ✅ |
| `GET` | `/auth/me` | 2072 | ✅ |
| `GET` | `/auth/my-data` | 2816 | ✅ |
| `GET` | `/auth/passkey/available` | 2621 | ✅ |
| `GET` | `/auth/passkey/list` | 2755 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2681 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2692 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2628 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2646 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2761 | ✅ |
| `POST` | `/auth/profile` | 3030 | ✅ |
| `POST` | `/auth/refresh` | 2127 | ✅ |
| `POST` | `/auth/register` | 1943 | ✅ |
| `POST` | `/auth/reset-password` | 2399 | ✅ |
| `GET` | `/backtest/strategies` | 7321 | ❌ |
| `POST` | `/backtest/validate` | 7250 | ❌ |
| `POST` | `/billing/create-portal-session` | 4655 | ✅ |
| `GET` | `/billing/history` | 4690 | ✅ |
| `GET` | `/brokers` | 8333 | ✅ |
| `POST` | `/calculate/american` | 5698 | ❌ |
| `POST` | `/calculate/assignment` | 5642 | ✅ |
| `POST` | `/calculate/greeks` | 5611 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5338 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5582 | ❌ |
| `POST` | `/calculate/payoff` | 5528 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5621 | ✅ |
| `POST` | `/calculate/volatility-size` | 7385 | ❌ |
| `GET` | `/calculations` | 3700 | ✅ |
| `POST` | `/calculations` | 3687 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3708 | ✅ |
| `POST` | `/checkout/create` | 3856 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 3999 | ✅ |
| `POST` | `/education/assistant` | 6424 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 6823 | ✅ |
| `GET` | `/education/pattern-catalog` | 6696 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6703 | ✅ |
| `GET` | `/education/scan-timeframes` | 6689 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6756 | ✅ |
| `GET` | `/health` | 4862 | ❌ |
| `GET` | `/journal/stats` | 3317 | ✅ |
| `GET` | `/market/risk-free` | 5562 | ✅ |
| `POST` | `/monte-carlo` | 3659 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3148 | ❌ |
| `POST` | `/optimize` | 5756 | ✅ |
| `POST` | `/options/ai-analyze` | 6321 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5266 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 5809 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5162 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 5983 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5356 | ✅ |
| `GET` | `/options/market-flow` | 6565 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5414 | ✅ |
| `GET` | `/options/positions` | 5877 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 5896 | ✅ |
| `POST` | `/options/positions/save` | 5859 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 5886 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5480 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6116 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4021 | ✅ |
| `GET` | `/performance/analytics` | 7403 | ✅ |
| `GET` | `/performance/instruments` | 7063 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7343 | ❌ |
| `GET` | `/performance/trades` | 7134 | ✅ |
| `POST` | `/performance/trades` | 7076 | ✅ |
| `POST` | `/performance/trades/bulk` | 7099 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7222 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7159 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7172 | ✅ |
| `GET` | `/plan` | 7554 | ✅ |
| `POST` | `/plan` | 7582 | ✅ |
| `GET` | `/plan/compliance` | 7617 | ✅ |
| `PATCH` | `/plan/draft` | 7606 | ✅ |
| `GET` | `/plan/history` | 7563 | ✅ |
| `GET` | `/plans` | 3717 | ❌ |
| `GET` | `/portfolio` | 3335 | ❌ |
| `POST` | `/portfolio` | 3343 | ❌ |
| `GET` | `/portfolio/rebalance` | 3383 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3376 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3365 | ❌ |
| `GET` | `/prices` | 3059 | ✅ |
| `GET` | `/public/settings` | 8326 | ✅ |
| `GET` | `/quote/{symbol}` | 8832 | ❌ |
| `GET` | `/stock/{symbol}` | 5025 | ✅ |
| `POST` | `/subscriptions/cancel` | 4550 | ✅ |
| `GET` | `/subscriptions/current` | 4502 | ✅ |
| `POST` | `/subscriptions/resume` | 4609 | ✅ |
| `GET` | `/tickers/search` | 5132 | ✅ |
| `GET` | `/tickers/universal-search` | 5145 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 4819 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 4802 | ✅ |
| `GET` | `/user-states/list` | 4843 | ❌ |
| `DELETE` | `/user-states/reset-all` | 4832 | ✅ |
| `POST` | `/user-states/save` | 4735 | ✅ |
| `POST` | `/webhook/nowpayments` | 4420 | ✅ |
| `POST` | `/webhook/revolut` | 4326 | ✅ |
| `POST` | `/webhook/stripe` | 4161 | ❌ |

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
| `components/calculators/` | 15 | 4,644 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 12 | 2,184 |
| `components/dashboard/` | 8 | 1,005 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 83 | 13,853 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 590 |
| `components/options/` | 37 | 8,122 |
| `components/performance/` | 7 | 3,469 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 46 | 2,946 |
| `pages/` | 23 | 16,298 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,211 |
| `frontend/src/pages/EducationPage.jsx` | 5,575 |
| `frontend/src/lib/i18n/ar.js` | 4,623 |
| `frontend/src/lib/i18n/de.js` | 4,623 |
| `frontend/src/lib/i18n/en.js` | 4,623 |
| `frontend/src/lib/i18n/es.js` | 4,623 |
| `frontend/src/lib/i18n/fr.js` | 4,623 |
| `frontend/src/lib/i18n/it.js` | 4,623 |
| `frontend/src/lib/i18n/ja.js` | 4,623 |
| `frontend/src/lib/i18n/pt.js` | 4,623 |
| `frontend/src/lib/i18n/ru.js` | 4,623 |
| `frontend/src/lib/i18n/zh.js` | 4,623 |

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

