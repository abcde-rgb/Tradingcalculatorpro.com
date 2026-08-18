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
| Módulos del backend | 29 |
| Líneas de Python (backend) | 24,204 |
| Rutas declaradas | 204 |
| **Rutas sin consumidor en el frontend** | **43** |
| Ficheros de test · funciones de test | 49 · 798 |
| Rutas del frontend (`App.js`) | 28 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,569 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (38)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `GET` | `/api/admin/market-data-health` | `backend/server.py:8992` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8653` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3683` |
| `POST` | `/api/backtest` | `backend/server.py:3972` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7572` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7502` |
| `POST` | `/api/calculate/american` | `backend/server.py:5996` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5880` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7636` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6994` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3259` |
| `POST` | `/api/journal/trades` | `backend/server.py:3237` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3324` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3289` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3765` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3144` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5778` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7594` |
| `GET` | `/api/plans` | `backend/server.py:4064` |
| `GET` | `/api/portfolio` | `backend/server.py:3441` |
| `POST` | `/api/portfolio` | `backend/server.py:3449` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3489` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3482` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3471` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9012` |
| `GET` | `/api/referrals/leaderboard` | `backend/referrals.py:276` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:5002` |
| `GET` | `/api/user-states/list` | `backend/server.py:5207` |

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
| `server.py` | 9,391 | 144 | — |
| `performance.py` | 1,819 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,205 | 25 | admin_routes.py — Endpoints del panel de administración |
| `price_action.py` | 1,045 |  | Price-action STRUCTURE detection over real OHLC — complements candle_patterns.py. |
| `missing_apis.py` | 1,000 | 10 | missing_apis.py |
| `instruments.py` | 902 |  | instruments.py — qué es cada producto financiero, como dato y no como suposición. |
| `affiliate_program.py` | 866 | 18 | affiliate_program.py — Programa de Afiliados (pagos mensuales por volumen). |
| `options_math.py` | 736 |  | Black-Scholes-Merton Option Pricing and Greeks. |
| `stock_data.py` | 703 |  | Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi |
| `backtest.py` | 643 |  | Backtest engine with validation — does this system have an edge, or am I fooling myself? |
| `options_optimize.py` | 608 |  | Options Strategy Optimizer. |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `realtime_alerts.py` | 384 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `referrals.py` | 374 | 4 | referrals.py — Referral / Affiliate program API. |
| `options_positioning.py` | 371 |  | Positioning metrics derived from open interest: max pain, GEX, OI profile, |
| `market_data.py` | 329 |  | Multi-provider market data layer with failover, caching and circuit breakers. |
| `portfolio_risk.py` | 327 |  | Account-level risk — heat, correlation, loss limits, volatility sizing. |
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

### `backend/missing_apis.py` — 10 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `POST` | `/auth/send-verification-email` | 498 | ✅ |
| `POST` | `/auth/verify-email` | 529 | ✅ |
| `POST` | `/calculations/{calc_id}/save-to-journal` | 869 | ❌ |
| `GET` | `/commodities-prices` | 277 | ❌ |
| `GET` | `/forex-prices` | 184 | ❌ |
| `GET` | `/indices-prices` | 221 | ❌ |
| `GET` | `/ohlc-universal/{symbol}` | 354 | ❌ |
| `GET` | `/performance/export` | 806 | ❌ |
| `POST` | `/subscriptions/change-plan` | 563 | ❌ |
| `POST` | `/webhook/stripe/subscription` | 664 | ❌ |

### `backend/realtime_alerts.py` — 3 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/alerts/channels` | 367 | ✅ |
| `GET` | `/alerts/realtime/status` | 351 | ❌ |
| `WEBSOCKET` | `/ws/alerts` | 282 | ✅ |

### `backend/referrals.py` — 4 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/referrals/leaderboard` | 276 | ❌ |
| `GET` | `/referrals/me` | 113 | ❌ |
| `POST` | `/referrals/redeem-credit` | 300 | ❌ |
| `POST` | `/referrals/track` | 156 | ✅ |

### `backend/server.py` — 144 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5222 | ✅ |
| `GET` | `/admin/audit-log` | 8586 | ✅ |
| `GET` | `/admin/coupons` | 9149 | ✅ |
| `POST` | `/admin/coupons` | 9155 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9178 | ✅ |
| `GET` | `/admin/feature-flags` | 9198 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9207 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8623 | ✅ |
| `GET` | `/admin/market-data-health` | 8992 | ❌ |
| `GET` | `/admin/metrics` | 8022 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8805 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8946 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8893 | ✅ |
| `POST` | `/admin/promote` | 8070 | ✅ |
| `GET` | `/admin/revenue` | 8686 | ✅ |
| `GET` | `/admin/settings` | 8484 | ✅ |
| `PUT` | `/admin/settings` | 8507 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8653 | ❌ |
| `GET` | `/admin/usage` | 9028 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9095 | ✅ |
| `GET` | `/admin/users` | 7926 | ✅ |
| `POST` | `/admin/users` | 8142 | ✅ |
| `GET` | `/admin/users.csv` | 7992 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8252 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8185 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8287 | ✅ |
| `GET` | `/admin/webhooks` | 9222 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9228 | ✅ |
| `GET` | `/alerts` | 3557 | ✅ |
| `POST` | `/alerts` | 3543 | ✅ |
| `POST` | `/alerts/send-email` | 3683 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3565 | ✅ |
| `POST` | `/analytics/track` | 9068 | ✅ |
| `POST` | `/auth/2fa/disable` | 2514 | ✅ |
| `POST` | `/auth/2fa/enable` | 2495 | ✅ |
| `POST` | `/auth/2fa/setup` | 2479 | ✅ |
| `POST` | `/auth/2fa/verify` | 2532 | ✅ |
| `DELETE` | `/auth/account` | 2787 | ✅ |
| `POST` | `/auth/change-password` | 2430 | ✅ |
| `POST` | `/auth/forgot-password` | 2369 | ✅ |
| `POST` | `/auth/google` | 2903 | ✅ |
| `POST` | `/auth/login` | 1987 | ✅ |
| `POST` | `/auth/logout` | 2101 | ✅ |
| `POST` | `/auth/magic-link` | 2203 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2250 | ✅ |
| `GET` | `/auth/me` | 2069 | ✅ |
| `GET` | `/auth/my-data` | 2813 | ✅ |
| `GET` | `/auth/passkey/available` | 2618 | ✅ |
| `GET` | `/auth/passkey/list` | 2752 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2678 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2689 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2625 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2643 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2758 | ✅ |
| `POST` | `/auth/profile` | 3026 | ✅ |
| `POST` | `/auth/refresh` | 2124 | ✅ |
| `POST` | `/auth/register` | 1940 | ✅ |
| `POST` | `/auth/reset-password` | 2396 | ✅ |
| `POST` | `/backtest` | 3972 | ❌ |
| `GET` | `/backtest/strategies` | 7572 | ❌ |
| `POST` | `/backtest/validate` | 7502 | ❌ |
| `POST` | `/billing/create-portal-session` | 5019 | ✅ |
| `GET` | `/billing/history` | 5054 | ✅ |
| `POST` | `/calculate/american` | 5996 | ❌ |
| `POST` | `/calculate/assignment` | 5940 | ✅ |
| `POST` | `/calculate/greeks` | 5909 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5636 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5880 | ❌ |
| `POST` | `/calculate/payoff` | 5826 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5919 | ✅ |
| `POST` | `/calculate/volatility-size` | 7636 | ❌ |
| `GET` | `/calculations` | 4047 | ✅ |
| `POST` | `/calculations` | 4034 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4055 | ✅ |
| `POST` | `/checkout/create` | 4203 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4346 | ✅ |
| `POST` | `/education/assistant` | 6722 | ✅ |
| `GET` | `/education/pattern-catalog` | 6994 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7001 | ✅ |
| `GET` | `/education/scan-timeframes` | 6987 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7054 | ✅ |
| `GET` | `/health` | 5226 | ❌ |
| `GET` | `/journal/stats` | 3423 | ✅ |
| `GET` | `/journal/trades` | 3259 | ❌ |
| `POST` | `/journal/trades` | 3237 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3324 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3289 | ❌ |
| `GET` | `/market/risk-free` | 5860 | ✅ |
| `POST` | `/monte-carlo` | 3765 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3144 | ❌ |
| `POST` | `/optimize` | 6054 | ✅ |
| `POST` | `/options/ai-analyze` | 6619 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5564 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6107 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5460 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6281 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5654 | ✅ |
| `GET` | `/options/market-flow` | 6863 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5712 | ✅ |
| `GET` | `/options/positions` | 6175 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6194 | ✅ |
| `POST` | `/options/positions/save` | 6157 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6184 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5778 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6414 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4368 | ✅ |
| `GET` | `/performance/analytics` | 7654 | ✅ |
| `GET` | `/performance/instruments` | 7315 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7594 | ❌ |
| `GET` | `/performance/trades` | 7386 | ✅ |
| `POST` | `/performance/trades` | 7328 | ✅ |
| `POST` | `/performance/trades/bulk` | 7351 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7474 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7411 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7424 | ✅ |
| `GET` | `/plan` | 7805 | ✅ |
| `POST` | `/plan` | 7833 | ✅ |
| `GET` | `/plan/compliance` | 7868 | ✅ |
| `PATCH` | `/plan/draft` | 7857 | ✅ |
| `GET` | `/plan/history` | 7814 | ✅ |
| `GET` | `/plans` | 4064 | ❌ |
| `GET` | `/portfolio` | 3441 | ❌ |
| `POST` | `/portfolio` | 3449 | ❌ |
| `GET` | `/portfolio/rebalance` | 3489 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3482 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3471 | ❌ |
| `GET` | `/prices` | 3055 | ✅ |
| `GET` | `/public/settings` | 8577 | ✅ |
| `GET` | `/quote/{symbol}` | 9012 | ❌ |
| `GET` | `/stock/{symbol}` | 5353 | ✅ |
| `POST` | `/subscriptions/cancel` | 4897 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 5002 | ❌ |
| `GET` | `/subscriptions/current` | 4849 | ✅ |
| `POST` | `/subscriptions/resume` | 4956 | ✅ |
| `GET` | `/tickers/search` | 5430 | ✅ |
| `GET` | `/tickers/universal-search` | 5443 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5183 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5166 | ✅ |
| `GET` | `/user-states/list` | 5207 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5196 | ✅ |
| `POST` | `/user-states/save` | 5099 | ✅ |
| `POST` | `/webhook/nowpayments` | 4767 | ✅ |
| `POST` | `/webhook/revolut` | 4673 | ✅ |
| `POST` | `/webhook/stripe` | 4508 | ❌ |

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
| `components/charts/` | 3 | 779 |
| `components/charts/structure/` | 11 | 1,459 |
| `components/common/` | 11 | 1,831 |
| `components/dashboard/` | 8 | 989 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 78 | 13,036 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 576 |
| `components/layout/` | 2 | 586 |
| `components/options/` | 37 | 8,115 |
| `components/performance/` | 7 | 3,469 |
| `components/performance/form/` | 6 | 724 |
| `components/settings/` | 2 | 308 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 46 | 2,946 |
| `pages/` | 22 | 15,892 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,391 |
| `frontend/src/pages/EducationPage.jsx` | 5,505 |
| `frontend/src/lib/i18n/ar.js` | 4,483 |
| `frontend/src/lib/i18n/de.js` | 4,483 |
| `frontend/src/lib/i18n/en.js` | 4,483 |
| `frontend/src/lib/i18n/es.js` | 4,483 |
| `frontend/src/lib/i18n/fr.js` | 4,483 |
| `frontend/src/lib/i18n/it.js` | 4,483 |
| `frontend/src/lib/i18n/ja.js` | 4,483 |
| `frontend/src/lib/i18n/pt.js` | 4,483 |
| `frontend/src/lib/i18n/ru.js` | 4,483 |
| `frontend/src/lib/i18n/zh.js` | 4,483 |

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

