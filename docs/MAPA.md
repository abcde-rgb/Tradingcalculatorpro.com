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
| Líneas de Python (backend) | 25,590 |
| Rutas declaradas | 205 |
| **Rutas sin consumidor en el frontend** | **43** |
| Ficheros de test · funciones de test | 53 · 866 |
| Rutas del frontend (`App.js`) | 28 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,644 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (38)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `GET` | `/api/admin/market-data-health` | `backend/server.py:9067` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8728` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3712` |
| `POST` | `/api/backtest` | `backend/server.py:4001` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7647` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7577` |
| `POST` | `/api/calculate/american` | `backend/server.py:6025` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5909` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7711` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7023` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3288` |
| `POST` | `/api/journal/trades` | `backend/server.py:3266` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3353` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3318` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3794` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3173` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5807` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7669` |
| `GET` | `/api/plans` | `backend/server.py:4093` |
| `GET` | `/api/portfolio` | `backend/server.py:3470` |
| `POST` | `/api/portfolio` | `backend/server.py:3478` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3518` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3511` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3500` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9087` |
| `GET` | `/api/referrals/leaderboard` | `backend/referrals.py:276` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:5031` |
| `GET` | `/api/user-states/list` | `backend/server.py:5236` |

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
| `server.py` | 9,466 | 145 | — |
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
| `level_odds.py` | 603 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
| `realtime_alerts.py` | 384 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `referrals.py` | 374 | 4 | referrals.py — Referral / Affiliate program API. |
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

### `backend/server.py` — 145 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/` | 5251 | ✅ |
| `GET` | `/admin/audit-log` | 8661 | ✅ |
| `GET` | `/admin/coupons` | 9224 | ✅ |
| `POST` | `/admin/coupons` | 9230 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9253 | ✅ |
| `GET` | `/admin/feature-flags` | 9273 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9282 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8698 | ✅ |
| `GET` | `/admin/market-data-health` | 9067 | ❌ |
| `GET` | `/admin/metrics` | 8097 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8880 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9021 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8968 | ✅ |
| `POST` | `/admin/promote` | 8145 | ✅ |
| `GET` | `/admin/revenue` | 8761 | ✅ |
| `GET` | `/admin/settings` | 8559 | ✅ |
| `PUT` | `/admin/settings` | 8582 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8728 | ❌ |
| `GET` | `/admin/usage` | 9103 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9170 | ✅ |
| `GET` | `/admin/users` | 8001 | ✅ |
| `POST` | `/admin/users` | 8217 | ✅ |
| `GET` | `/admin/users.csv` | 8067 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8327 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8260 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8362 | ✅ |
| `GET` | `/admin/webhooks` | 9297 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9303 | ✅ |
| `GET` | `/alerts` | 3586 | ✅ |
| `POST` | `/alerts` | 3572 | ✅ |
| `POST` | `/alerts/send-email` | 3712 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3594 | ✅ |
| `POST` | `/analytics/track` | 9143 | ✅ |
| `POST` | `/auth/2fa/disable` | 2543 | ✅ |
| `POST` | `/auth/2fa/enable` | 2524 | ✅ |
| `POST` | `/auth/2fa/setup` | 2508 | ✅ |
| `POST` | `/auth/2fa/verify` | 2561 | ✅ |
| `DELETE` | `/auth/account` | 2816 | ✅ |
| `POST` | `/auth/change-password` | 2459 | ✅ |
| `POST` | `/auth/forgot-password` | 2398 | ✅ |
| `POST` | `/auth/google` | 2932 | ✅ |
| `POST` | `/auth/login` | 2016 | ✅ |
| `POST` | `/auth/logout` | 2130 | ✅ |
| `POST` | `/auth/magic-link` | 2232 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2279 | ✅ |
| `GET` | `/auth/me` | 2098 | ✅ |
| `GET` | `/auth/my-data` | 2842 | ✅ |
| `GET` | `/auth/passkey/available` | 2647 | ✅ |
| `GET` | `/auth/passkey/list` | 2781 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2707 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2718 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2654 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2672 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2787 | ✅ |
| `POST` | `/auth/profile` | 3055 | ✅ |
| `POST` | `/auth/refresh` | 2153 | ✅ |
| `POST` | `/auth/register` | 1969 | ✅ |
| `POST` | `/auth/reset-password` | 2425 | ✅ |
| `POST` | `/backtest` | 4001 | ❌ |
| `GET` | `/backtest/strategies` | 7647 | ❌ |
| `POST` | `/backtest/validate` | 7577 | ❌ |
| `POST` | `/billing/create-portal-session` | 5048 | ✅ |
| `GET` | `/billing/history` | 5083 | ✅ |
| `POST` | `/calculate/american` | 6025 | ❌ |
| `POST` | `/calculate/assignment` | 5969 | ✅ |
| `POST` | `/calculate/greeks` | 5938 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5665 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5909 | ❌ |
| `POST` | `/calculate/payoff` | 5855 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5948 | ✅ |
| `POST` | `/calculate/volatility-size` | 7711 | ❌ |
| `GET` | `/calculations` | 4076 | ✅ |
| `POST` | `/calculations` | 4063 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4084 | ✅ |
| `POST` | `/checkout/create` | 4232 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4375 | ✅ |
| `POST` | `/education/assistant` | 6751 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7150 | ✅ |
| `GET` | `/education/pattern-catalog` | 7023 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7030 | ✅ |
| `GET` | `/education/scan-timeframes` | 7016 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7083 | ✅ |
| `GET` | `/health` | 5255 | ❌ |
| `GET` | `/journal/stats` | 3452 | ✅ |
| `GET` | `/journal/trades` | 3288 | ❌ |
| `POST` | `/journal/trades` | 3266 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3353 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3318 | ❌ |
| `GET` | `/market/risk-free` | 5889 | ✅ |
| `POST` | `/monte-carlo` | 3794 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3173 | ❌ |
| `POST` | `/optimize` | 6083 | ✅ |
| `POST` | `/options/ai-analyze` | 6648 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5593 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6136 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5489 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6310 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5683 | ✅ |
| `GET` | `/options/market-flow` | 6892 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5741 | ✅ |
| `GET` | `/options/positions` | 6204 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6223 | ✅ |
| `POST` | `/options/positions/save` | 6186 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6213 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5807 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6443 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4397 | ✅ |
| `GET` | `/performance/analytics` | 7729 | ✅ |
| `GET` | `/performance/instruments` | 7390 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7669 | ❌ |
| `GET` | `/performance/trades` | 7461 | ✅ |
| `POST` | `/performance/trades` | 7403 | ✅ |
| `POST` | `/performance/trades/bulk` | 7426 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7549 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7486 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7499 | ✅ |
| `GET` | `/plan` | 7880 | ✅ |
| `POST` | `/plan` | 7908 | ✅ |
| `GET` | `/plan/compliance` | 7943 | ✅ |
| `PATCH` | `/plan/draft` | 7932 | ✅ |
| `GET` | `/plan/history` | 7889 | ✅ |
| `GET` | `/plans` | 4093 | ❌ |
| `GET` | `/portfolio` | 3470 | ❌ |
| `POST` | `/portfolio` | 3478 | ❌ |
| `GET` | `/portfolio/rebalance` | 3518 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3511 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3500 | ❌ |
| `GET` | `/prices` | 3084 | ✅ |
| `GET` | `/public/settings` | 8652 | ✅ |
| `GET` | `/quote/{symbol}` | 9087 | ❌ |
| `GET` | `/stock/{symbol}` | 5382 | ✅ |
| `POST` | `/subscriptions/cancel` | 4926 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 5031 | ❌ |
| `GET` | `/subscriptions/current` | 4878 | ✅ |
| `POST` | `/subscriptions/resume` | 4985 | ✅ |
| `GET` | `/tickers/search` | 5459 | ✅ |
| `GET` | `/tickers/universal-search` | 5472 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5212 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5195 | ✅ |
| `GET` | `/user-states/list` | 5236 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5225 | ✅ |
| `POST` | `/user-states/save` | 5128 | ✅ |
| `POST` | `/webhook/nowpayments` | 4796 | ✅ |
| `POST` | `/webhook/revolut` | 4702 | ✅ |
| `POST` | `/webhook/stripe` | 4537 | ❌ |

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
| `pages/` | 22 | 15,954 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,466 |
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

