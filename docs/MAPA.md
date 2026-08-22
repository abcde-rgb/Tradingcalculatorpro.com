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
| Módulos del backend | 32 |
| Líneas de Python (backend) | 25,174 |
| Rutas declaradas | 197 |
| **Rutas sin consumidor en el frontend** | **34** |
| Ficheros de test · funciones de test | 54 · 879 |
| Rutas del frontend (`App.js`) | 28 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,644 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (29)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8346` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3587` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7265` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7194` |
| `POST` | `/api/calculate/american` | `backend/server.py:5642` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5526` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7329` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:796` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6640` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3669` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3158` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5424` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:733` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7287` |
| `GET` | `/api/plans` | `backend/server.py:3727` |
| `GET` | `/api/portfolio` | `backend/server.py:3345` |
| `POST` | `/api/portfolio` | `backend/server.py:3353` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3393` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3386` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3375` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:8705` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:132` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:332` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:490` |
| `GET` | `/api/user-states/list` | `backend/server.py:4853` |

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
| `server.py` | 9,084 | 139 | — |
| `performance.py` | 1,819 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,205 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 927 | 9 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 866 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `options_math.py` | 736 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `stock_data.py` | 703 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 608 |  | Options Strategy Optimizer. |
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `referrals.py` | 413 | 3 | referrals.py — Referral / Affiliate program API. |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
| `realtime_alerts.py` | 384 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `options_positioning.py` | 371 |  | Positioning metrics derived from open interest: max pain, GEX, OI profile, |
| `market_data.py` | 329 |  | Multi-provider market data layer with failover, caching and circuit breakers. |
| `portfolio_risk.py` | 327 |  | Account-level risk — heat, correlation, loss limits, volatility sizing. |
| `level_features.py` | 323 |  | Los rasgos del montaje, tal y como se veían EN esa barra y no después. |
| `timeframes.py` | 303 |  | The timeframe ladder for the price-action scanners (structure + patterns). |
| `american_options.py` | 283 |  | American option pricing — early exercise, which Black-Scholes cannot see. |
| `crypto_data.py` | 256 |  | Precios de criptomonedas desde las propias bolsas. |
| `passkeys.py` | 243 |  | Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña. |
| `revolut.py` | 216 |  | Revolut — Revolut Pay / Merchant API integration (order + webhook helpers). |
| `market_rates.py` | 213 |  | Live risk-free rate. |
| `notifications.py` | 212 |  | notifications.py — un aviso, tres canales, y la verdad sobre cuáles funcionan. |
| `performance_metrics.py` | 196 |  | Advanced performance & risk metrics — the professional-grade gap. |
| `nowpayments.py` | 182 |  | NOWPayments — crypto payment gateway integration (invoice + IPN helpers). |
| `migrate_trades_schema.py` | 169 |  | Migra los documentos del diario legado (camelCase) al esquema canónico. |
| `ecb_rates.py` | 144 |  | Tipos de cambio del Banco Central Europeo. |

## Rutas de la API

Todas cuelgan de `/api` (`api_router = APIRouter(prefix="/api")`).
La columna **Front** dice si algún fichero del frontend la menciona.

### `backend/admin_routes.py` — 25 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/campaigns` | 606 | ✅ |
| `POST` | `/admin/campaigns` | 612 | ✅ |
| `POST` | `/admin/campaigns/{campaign_id}/send` | 647 | ✅ |
| `GET` | `/admin/churn-surveys` | 784 | ✅ |
| `POST` | `/admin/churn-surveys/{survey_id}/follow-up` | 800 | ✅ |
| `GET` | `/admin/cohorts` | 822 | ✅ |
| `GET` | `/admin/connectors/status` | 495 | ❌ |
| `GET` | `/admin/errors` | 1023 | ✅ |
| `POST` | `/admin/errors/{error_id}/resolve` | 1049 | ✅ |
| `GET` | `/admin/gdpr-exports` | 1100 | ✅ |
| `POST` | `/admin/gdpr-exports/{export_id}/deliver` | 1110 | ✅ |
| `GET` | `/admin/i18n` | 716 | ✅ |
| `POST` | `/admin/i18n` | 745 | ✅ |
| `GET` | `/admin/maintenance` | 994 | ✅ |
| `POST` | `/admin/maintenance` | 1007 | ✅ |
| `GET` | `/admin/plans` | 918 | ✅ |
| `POST` | `/admin/plans/{plan_id}` | 943 | ✅ |
| `GET` | `/admin/public/settings` | 1190 | ✅ |
| `GET` | `/admin/rate-limits` | 1075 | ✅ |
| `GET` | `/admin/referrals` | 865 | ✅ |
| `GET` | `/admin/referrals/leaderboard` | 887 | ✅ |
| `POST` | `/admin/set-plan` | 375 | ❌ |
| `POST` | `/admin/settings` | 451 | ✅ |
| `POST` | `/admin/users/{user_id}` | 403 | ✅ |
| `GET` | `/admin/users/{user_id}/payments` | 763 | ✅ |

### `backend/affiliate_program.py` — 18 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/admin/affiliates` | 456 | ✅ |
| `POST` | `/admin/affiliates/payout-lines/{lid}/mark-paid` | 739 | ✅ |
| `GET` | `/admin/affiliates/payout-requests` | 761 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/mark-paid` | 772 | ✅ |
| `POST` | `/admin/affiliates/payout-requests/{rid}/reject` | 786 | ✅ |
| `POST` | `/admin/affiliates/payout-run` | 612 | ✅ |
| `POST` | `/admin/affiliates/payout-run/{rid}/finalize` | 697 | ✅ |
| `GET` | `/admin/affiliates/payout-runs` | 721 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}` | 728 | ✅ |
| `GET` | `/admin/affiliates/payout-runs/{rid}/export.csv` | 796 | ✅ |
| `PATCH` | `/admin/affiliates/{aid}` | 595 | ✅ |
| `POST` | `/admin/affiliates/{aid}/approve` | 580 | ✅ |
| `POST` | `/admin/affiliates/{aid}/reject` | 585 | ✅ |
| `POST` | `/admin/affiliates/{aid}/suspend` | 590 | ✅ |
| `POST` | `/affiliate/apply` | 275 | ✅ |
| `GET` | `/affiliate/me` | 317 | ✅ |
| `PUT` | `/affiliate/payout-details` | 393 | ✅ |
| `POST` | `/affiliate/request-payout` | 412 | ✅ |

### `backend/missing_apis.py` — 9 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `POST` | `/auth/send-verification-email` | 425 | ✅ |
| `POST` | `/auth/verify-email` | 456 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 796 | ❌ |
| `GET` | `/commodities-prices` | 277 | ❌ |
| `GET` | `/forex-prices` | 184 | ❌ |
| `GET` | `/indices-prices` | 221 | ❌ |
| `GET` | `/performance/export` | 733 | ❌ |
| `POST` | `/subscriptions/change-plan` | 490 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 591 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 367 | ✅ |
| `GET` | `/alerts/realtime/status` | 351 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 282 | ✅ |

### `backend/referrals.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/me` | 132 | ❌ |
| `POST` | `/referrals/redeem-credit` | 332 | ❌ |
| `POST` | `/referrals/track` | 179 | ✅ |

### `backend/server.py` — 139 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 4868 | ✅ |
| `GET` | `/admin/audit-log` | 8279 | ✅ |
| `GET` | `/admin/coupons` | 8842 | ✅ |
| `POST` | `/admin/coupons` | 8848 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 8871 | ✅ |
| `GET` | `/admin/feature-flags` | 8891 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 8900 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8316 | ✅ |
| `GET` | `/admin/market-data-health` | 8685 | ✅ |
| `GET` | `/admin/metrics` | 7715 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8498 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8639 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8586 | ✅ |
| `POST` | `/admin/promote` | 7763 | ✅ |
| `GET` | `/admin/revenue` | 8379 | ✅ |
| `GET` | `/admin/settings` | 8177 | ✅ |
| `PUT` | `/admin/settings` | 8200 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8346 | ❌ |
| `GET` | `/admin/usage` | 8721 | ✅ |
| `GET` | `/admin/usage-heatmap` | 8788 | ✅ |
| `GET` | `/admin/users` | 7619 | ✅ |
| `POST` | `/admin/users` | 7835 | ✅ |
| `GET` | `/admin/users.csv` | 7685 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 7945 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 7878 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 7980 | ✅ |
| `GET` | `/admin/webhooks` | 8915 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 8921 | ✅ |
| `GET` | `/alerts` | 3461 | ✅ |
| `POST` | `/alerts` | 3447 | ✅ |
| `POST` | `/alerts/send-email` | 3587 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3469 | ✅ |
| `POST` | `/analytics/track` | 8761 | ✅ |
| `POST` | `/auth/2fa/disable` | 2527 | ✅ |
| `POST` | `/auth/2fa/enable` | 2508 | ✅ |
| `POST` | `/auth/2fa/setup` | 2492 | ✅ |
| `POST` | `/auth/2fa/verify` | 2545 | ✅ |
| `DELETE` | `/auth/account` | 2800 | ✅ |
| `POST` | `/auth/change-password` | 2443 | ✅ |
| `POST` | `/auth/forgot-password` | 2382 | ✅ |
| `POST` | `/auth/google` | 2917 | ✅ |
| `POST` | `/auth/login` | 2000 | ✅ |
| `POST` | `/auth/logout` | 2114 | ✅ |
| `POST` | `/auth/magic-link` | 2216 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2263 | ✅ |
| `GET` | `/auth/me` | 2082 | ✅ |
| `GET` | `/auth/my-data` | 2826 | ✅ |
| `GET` | `/auth/passkey/available` | 2631 | ✅ |
| `GET` | `/auth/passkey/list` | 2765 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2691 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2702 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2638 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2656 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2771 | ✅ |
| `POST` | `/auth/profile` | 3040 | ✅ |
| `POST` | `/auth/refresh` | 2137 | ✅ |
| `POST` | `/auth/register` | 1953 | ✅ |
| `POST` | `/auth/reset-password` | 2409 | ✅ |
| `GET` | `/backtest/strategies` | 7265 | ❌ |
| `POST` | `/backtest/validate` | 7194 | ❌ |
| `POST` | `/billing/create-portal-session` | 4665 | ✅ |
| `GET` | `/billing/history` | 4700 | ✅ |
| `POST` | `/calculate/american` | 5642 | ❌ |
| `POST` | `/calculate/assignment` | 5586 | ✅ |
| `POST` | `/calculate/greeks` | 5555 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5282 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5526 | ❌ |
| `POST` | `/calculate/payoff` | 5472 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5565 | ✅ |
| `POST` | `/calculate/volatility-size` | 7329 | ❌ |
| `GET` | `/calculations` | 3710 | ✅ |
| `POST` | `/calculations` | 3697 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3718 | ✅ |
| `POST` | `/checkout/create` | 3866 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4009 | ✅ |
| `POST` | `/education/assistant` | 6368 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 6767 | ✅ |
| `GET` | `/education/pattern-catalog` | 6640 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6647 | ✅ |
| `GET` | `/education/scan-timeframes` | 6633 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6700 | ✅ |
| `GET` | `/health` | 4872 | ❌ |
| `GET` | `/journal/stats` | 3327 | ✅ |
| `GET` | `/market/risk-free` | 5506 | ✅ |
| `POST` | `/monte-carlo` | 3669 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3158 | ❌ |
| `POST` | `/optimize` | 5700 | ✅ |
| `POST` | `/options/ai-analyze` | 6265 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5210 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 5753 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5106 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 5927 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5300 | ✅ |
| `GET` | `/options/market-flow` | 6509 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5358 | ✅ |
| `GET` | `/options/positions` | 5821 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 5840 | ✅ |
| `POST` | `/options/positions/save` | 5803 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 5830 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5424 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6060 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4031 | ✅ |
| `GET` | `/performance/analytics` | 7347 | ✅ |
| `GET` | `/performance/instruments` | 7007 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7287 | ❌ |
| `GET` | `/performance/trades` | 7078 | ✅ |
| `POST` | `/performance/trades` | 7020 | ✅ |
| `POST` | `/performance/trades/bulk` | 7043 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7166 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7103 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7116 | ✅ |
| `GET` | `/plan` | 7498 | ✅ |
| `POST` | `/plan` | 7526 | ✅ |
| `GET` | `/plan/compliance` | 7561 | ✅ |
| `PATCH` | `/plan/draft` | 7550 | ✅ |
| `GET` | `/plan/history` | 7507 | ✅ |
| `GET` | `/plans` | 3727 | ❌ |
| `GET` | `/portfolio` | 3345 | ❌ |
| `POST` | `/portfolio` | 3353 | ❌ |
| `GET` | `/portfolio/rebalance` | 3393 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3386 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3375 | ❌ |
| `GET` | `/prices` | 3069 | ✅ |
| `GET` | `/public/settings` | 8270 | ✅ |
| `GET` | `/quote/{symbol}` | 8705 | ❌ |
| `GET` | `/stock/{symbol}` | 4999 | ✅ |
| `POST` | `/subscriptions/cancel` | 4560 | ✅ |
| `GET` | `/subscriptions/current` | 4512 | ✅ |
| `POST` | `/subscriptions/resume` | 4619 | ✅ |
| `GET` | `/tickers/search` | 5076 | ✅ |
| `GET` | `/tickers/universal-search` | 5089 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 4829 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 4812 | ✅ |
| `GET` | `/user-states/list` | 4853 | ❌ |
| `DELETE` | `/user-states/reset-all` | 4842 | ✅ |
| `POST` | `/user-states/save` | 4745 | ✅ |
| `POST` | `/webhook/nowpayments` | 4430 | ✅ |
| `POST` | `/webhook/revolut` | 4336 | ✅ |
| `POST` | `/webhook/stripe` | 4171 | ❌ |

## Frontend

### Rutas declaradas en `App.js` (28)

| Ruta | Componente |
|---|---|
| `*` | `NotFoundPage` |
| `/` | `LandingPage` |
| `/about` | `AboutPage` |
| `/admin` | `ProtectedRoute` |
| `/affiliate` | `ProtectedRoute` |
| `/backtesting` | `BacktestingPage` |
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
| `components/calculators/` | 14 | 3,979 |
| `components/calculators/simulator/` | 6 | 1,436 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,705 |
| `components/common/` | 11 | 1,831 |
| `components/dashboard/` | 8 | 989 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 82 | 13,654 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 586 |
| `components/options/` | 37 | 8,115 |
| `components/performance/` | 7 | 3,469 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 46 | 2,946 |
| `pages/` | 22 | 16,111 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,084 |
| `frontend/src/pages/EducationPage.jsx` | 5,567 |
| `frontend/src/lib/i18n/ar.js` | 4,509 |
| `frontend/src/lib/i18n/de.js` | 4,509 |
| `frontend/src/lib/i18n/en.js` | 4,509 |
| `frontend/src/lib/i18n/es.js` | 4,509 |
| `frontend/src/lib/i18n/fr.js` | 4,509 |
| `frontend/src/lib/i18n/it.js` | 4,509 |
| `frontend/src/lib/i18n/ja.js` | 4,509 |
| `frontend/src/lib/i18n/pt.js` | 4,509 |
| `frontend/src/lib/i18n/ru.js` | 4,509 |
| `frontend/src/lib/i18n/zh.js` | 4,509 |

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

