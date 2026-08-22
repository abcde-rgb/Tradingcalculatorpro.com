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
| Líneas de Python (backend) | 25,584 |
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
| `GET` | `/api/admin/market-data-health` | `backend/server.py:9061` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8722` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3706` |
| `POST` | `/api/backtest` | `backend/server.py:3995` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7641` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7571` |
| `POST` | `/api/calculate/american` | `backend/server.py:6019` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5903` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7705` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7017` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3282` |
| `POST` | `/api/journal/trades` | `backend/server.py:3260` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3347` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3312` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3788` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3167` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5801` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7663` |
| `GET` | `/api/plans` | `backend/server.py:4087` |
| `GET` | `/api/portfolio` | `backend/server.py:3464` |
| `POST` | `/api/portfolio` | `backend/server.py:3472` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3512` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3505` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3494` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9081` |
| `GET` | `/api/referrals/leaderboard` | `backend/referrals.py:276` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:5025` |
| `GET` | `/api/user-states/list` | `backend/server.py:5230` |

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
| `server.py` | 9,460 | 145 | — |
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
| `GET` | `/` | 5245 | ✅ |
| `GET` | `/admin/audit-log` | 8655 | ✅ |
| `GET` | `/admin/coupons` | 9218 | ✅ |
| `POST` | `/admin/coupons` | 9224 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9247 | ✅ |
| `GET` | `/admin/feature-flags` | 9267 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9276 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8692 | ✅ |
| `GET` | `/admin/market-data-health` | 9061 | ❌ |
| `GET` | `/admin/metrics` | 8091 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8874 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9015 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8962 | ✅ |
| `POST` | `/admin/promote` | 8139 | ✅ |
| `GET` | `/admin/revenue` | 8755 | ✅ |
| `GET` | `/admin/settings` | 8553 | ✅ |
| `PUT` | `/admin/settings` | 8576 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8722 | ❌ |
| `GET` | `/admin/usage` | 9097 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9164 | ✅ |
| `GET` | `/admin/users` | 7995 | ✅ |
| `POST` | `/admin/users` | 8211 | ✅ |
| `GET` | `/admin/users.csv` | 8061 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8321 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8254 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8356 | ✅ |
| `GET` | `/admin/webhooks` | 9291 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9297 | ✅ |
| `GET` | `/alerts` | 3580 | ✅ |
| `POST` | `/alerts` | 3566 | ✅ |
| `POST` | `/alerts/send-email` | 3706 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3588 | ✅ |
| `POST` | `/analytics/track` | 9137 | ✅ |
| `POST` | `/auth/2fa/disable` | 2537 | ✅ |
| `POST` | `/auth/2fa/enable` | 2518 | ✅ |
| `POST` | `/auth/2fa/setup` | 2502 | ✅ |
| `POST` | `/auth/2fa/verify` | 2555 | ✅ |
| `DELETE` | `/auth/account` | 2810 | ✅ |
| `POST` | `/auth/change-password` | 2453 | ✅ |
| `POST` | `/auth/forgot-password` | 2392 | ✅ |
| `POST` | `/auth/google` | 2926 | ✅ |
| `POST` | `/auth/login` | 2010 | ✅ |
| `POST` | `/auth/logout` | 2124 | ✅ |
| `POST` | `/auth/magic-link` | 2226 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2273 | ✅ |
| `GET` | `/auth/me` | 2092 | ✅ |
| `GET` | `/auth/my-data` | 2836 | ✅ |
| `GET` | `/auth/passkey/available` | 2641 | ✅ |
| `GET` | `/auth/passkey/list` | 2775 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2701 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2712 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2648 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2666 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2781 | ✅ |
| `POST` | `/auth/profile` | 3049 | ✅ |
| `POST` | `/auth/refresh` | 2147 | ✅ |
| `POST` | `/auth/register` | 1963 | ✅ |
| `POST` | `/auth/reset-password` | 2419 | ✅ |
| `POST` | `/backtest` | 3995 | ❌ |
| `GET` | `/backtest/strategies` | 7641 | ❌ |
| `POST` | `/backtest/validate` | 7571 | ❌ |
| `POST` | `/billing/create-portal-session` | 5042 | ✅ |
| `GET` | `/billing/history` | 5077 | ✅ |
| `POST` | `/calculate/american` | 6019 | ❌ |
| `POST` | `/calculate/assignment` | 5963 | ✅ |
| `POST` | `/calculate/greeks` | 5932 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5659 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5903 | ❌ |
| `POST` | `/calculate/payoff` | 5849 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5942 | ✅ |
| `POST` | `/calculate/volatility-size` | 7705 | ❌ |
| `GET` | `/calculations` | 4070 | ✅ |
| `POST` | `/calculations` | 4057 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4078 | ✅ |
| `POST` | `/checkout/create` | 4226 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4369 | ✅ |
| `POST` | `/education/assistant` | 6745 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7144 | ✅ |
| `GET` | `/education/pattern-catalog` | 7017 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7024 | ✅ |
| `GET` | `/education/scan-timeframes` | 7010 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7077 | ✅ |
| `GET` | `/health` | 5249 | ❌ |
| `GET` | `/journal/stats` | 3446 | ✅ |
| `GET` | `/journal/trades` | 3282 | ❌ |
| `POST` | `/journal/trades` | 3260 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3347 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3312 | ❌ |
| `GET` | `/market/risk-free` | 5883 | ✅ |
| `POST` | `/monte-carlo` | 3788 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3167 | ❌ |
| `POST` | `/optimize` | 6077 | ✅ |
| `POST` | `/options/ai-analyze` | 6642 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5587 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6130 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5483 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6304 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5677 | ✅ |
| `GET` | `/options/market-flow` | 6886 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5735 | ✅ |
| `GET` | `/options/positions` | 6198 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6217 | ✅ |
| `POST` | `/options/positions/save` | 6180 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6207 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5801 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6437 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4391 | ✅ |
| `GET` | `/performance/analytics` | 7723 | ✅ |
| `GET` | `/performance/instruments` | 7384 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7663 | ❌ |
| `GET` | `/performance/trades` | 7455 | ✅ |
| `POST` | `/performance/trades` | 7397 | ✅ |
| `POST` | `/performance/trades/bulk` | 7420 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7543 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7480 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7493 | ✅ |
| `GET` | `/plan` | 7874 | ✅ |
| `POST` | `/plan` | 7902 | ✅ |
| `GET` | `/plan/compliance` | 7937 | ✅ |
| `PATCH` | `/plan/draft` | 7926 | ✅ |
| `GET` | `/plan/history` | 7883 | ✅ |
| `GET` | `/plans` | 4087 | ❌ |
| `GET` | `/portfolio` | 3464 | ❌ |
| `POST` | `/portfolio` | 3472 | ❌ |
| `GET` | `/portfolio/rebalance` | 3512 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3505 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3494 | ❌ |
| `GET` | `/prices` | 3078 | ✅ |
| `GET` | `/public/settings` | 8646 | ✅ |
| `GET` | `/quote/{symbol}` | 9081 | ❌ |
| `GET` | `/stock/{symbol}` | 5376 | ✅ |
| `POST` | `/subscriptions/cancel` | 4920 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 5025 | ❌ |
| `GET` | `/subscriptions/current` | 4872 | ✅ |
| `POST` | `/subscriptions/resume` | 4979 | ✅ |
| `GET` | `/tickers/search` | 5453 | ✅ |
| `GET` | `/tickers/universal-search` | 5466 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5206 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5189 | ✅ |
| `GET` | `/user-states/list` | 5230 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5219 | ✅ |
| `POST` | `/user-states/save` | 5122 | ✅ |
| `POST` | `/webhook/nowpayments` | 4790 | ✅ |
| `POST` | `/webhook/revolut` | 4696 | ✅ |
| `POST` | `/webhook/stripe` | 4531 | ❌ |

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
| `backend/server.py` | 9,460 |
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

