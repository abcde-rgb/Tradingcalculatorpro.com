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
| Líneas de Python (backend) | 25,536 |
| Rutas declaradas | 205 |
| **Rutas sin consumidor en el frontend** | **43** |
| Ficheros de test · funciones de test | 52 · 857 |
| Rutas del frontend (`App.js`) | 28 |
| Idiomas · claves i18n (referencia `es`) | 10 · 6,596 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (38)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `GET` | `/api/admin/market-data-health` | `backend/server.py:9039` |
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8700` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:351` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3684` |
| `POST` | `/api/backtest` | `backend/server.py:3973` |
| `GET` | `/api/backtest/strategies` | `backend/server.py:7619` |
| `POST` | `/api/backtest/validate` | `backend/server.py:7549` |
| `POST` | `/api/calculate/american` | `backend/server.py:5997` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5881` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7683` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:869` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:277` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6995` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:184` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:221` |
| `GET` | `/api/journal/trades` | `backend/server.py:3260` |
| `POST` | `/api/journal/trades` | `backend/server.py:3238` |
| `DELETE` | `/api/journal/trades/{trade_id}` | `backend/server.py:3325` |
| `PUT` | `/api/journal/trades/{trade_id}` | `backend/server.py:3290` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3766` |
| `GET` | `/api/ohlc-universal/{symbol}` | `backend/missing_apis.py:354` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3145` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5779` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:806` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7641` |
| `GET` | `/api/plans` | `backend/server.py:4065` |
| `GET` | `/api/portfolio` | `backend/server.py:3442` |
| `POST` | `/api/portfolio` | `backend/server.py:3450` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3490` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3483` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3472` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9059` |
| `GET` | `/api/referrals/leaderboard` | `backend/referrals.py:276` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:113` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:300` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:563` |
| `POST` | `/api/subscriptions/change-plan-legacy` | `backend/server.py:5003` |
| `GET` | `/api/user-states/list` | `backend/server.py:5208` |

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
| `server.py` | 9,438 | 145 | — |
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
| `level_odds.py` | 597 |  | ¿A dónde ha ido el precio DESPUÉS de estar donde está ahora? |
| `trading_plan.py` | 565 |  | Trading plan: the user's own rules, versioned server-side. |
| `candle_patterns.py` | 519 |  | Pure-math candle pattern detection. No ML, no AI — just the canonical |
| `level_research.py` | 385 |  | ¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece? |
| `realtime_alerts.py` | 384 | 3 | realtime_alerts.py — WebSocket-based real-time price alerts. |
| `referrals.py` | 374 | 4 | referrals.py — Referral / Affiliate program API. |
| `options_positioning.py` | 371 |  | Positioning metrics derived from open interest: max pain, GEX, OI profile, |
| `market_data.py` | 329 |  | Multi-provider market data layer with failover, caching and circuit breakers. |
| `portfolio_risk.py` | 327 |  | Account-level risk — heat, correlation, loss limits, volatility sizing. |
| `level_features.py` | 303 |  | Los rasgos del montaje, tal y como se veían EN esa barra y no después. |
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
| `GET` | `/` | 5223 | ✅ |
| `GET` | `/admin/audit-log` | 8633 | ✅ |
| `GET` | `/admin/coupons` | 9196 | ✅ |
| `POST` | `/admin/coupons` | 9202 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9225 | ✅ |
| `GET` | `/admin/feature-flags` | 9245 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9254 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8670 | ✅ |
| `GET` | `/admin/market-data-health` | 9039 | ❌ |
| `GET` | `/admin/metrics` | 8069 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8852 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 8993 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 8940 | ✅ |
| `POST` | `/admin/promote` | 8117 | ✅ |
| `GET` | `/admin/revenue` | 8733 | ✅ |
| `GET` | `/admin/settings` | 8531 | ✅ |
| `PUT` | `/admin/settings` | 8554 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8700 | ❌ |
| `GET` | `/admin/usage` | 9075 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9142 | ✅ |
| `GET` | `/admin/users` | 7973 | ✅ |
| `POST` | `/admin/users` | 8189 | ✅ |
| `GET` | `/admin/users.csv` | 8039 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8299 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8232 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8334 | ✅ |
| `GET` | `/admin/webhooks` | 9269 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9275 | ✅ |
| `GET` | `/alerts` | 3558 | ✅ |
| `POST` | `/alerts` | 3544 | ✅ |
| `POST` | `/alerts/send-email` | 3684 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3566 | ✅ |
| `POST` | `/analytics/track` | 9115 | ✅ |
| `POST` | `/auth/2fa/disable` | 2515 | ✅ |
| `POST` | `/auth/2fa/enable` | 2496 | ✅ |
| `POST` | `/auth/2fa/setup` | 2480 | ✅ |
| `POST` | `/auth/2fa/verify` | 2533 | ✅ |
| `DELETE` | `/auth/account` | 2788 | ✅ |
| `POST` | `/auth/change-password` | 2431 | ✅ |
| `POST` | `/auth/forgot-password` | 2370 | ✅ |
| `POST` | `/auth/google` | 2904 | ✅ |
| `POST` | `/auth/login` | 1988 | ✅ |
| `POST` | `/auth/logout` | 2102 | ✅ |
| `POST` | `/auth/magic-link` | 2204 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2251 | ✅ |
| `GET` | `/auth/me` | 2070 | ✅ |
| `GET` | `/auth/my-data` | 2814 | ✅ |
| `GET` | `/auth/passkey/available` | 2619 | ✅ |
| `GET` | `/auth/passkey/list` | 2753 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2679 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2690 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2626 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2644 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2759 | ✅ |
| `POST` | `/auth/profile` | 3027 | ✅ |
| `POST` | `/auth/refresh` | 2125 | ✅ |
| `POST` | `/auth/register` | 1941 | ✅ |
| `POST` | `/auth/reset-password` | 2397 | ✅ |
| `POST` | `/backtest` | 3973 | ❌ |
| `GET` | `/backtest/strategies` | 7619 | ❌ |
| `POST` | `/backtest/validate` | 7549 | ❌ |
| `POST` | `/billing/create-portal-session` | 5020 | ✅ |
| `GET` | `/billing/history` | 5055 | ✅ |
| `POST` | `/calculate/american` | 5997 | ❌ |
| `POST` | `/calculate/assignment` | 5941 | ✅ |
| `POST` | `/calculate/greeks` | 5910 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5637 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5881 | ❌ |
| `POST` | `/calculate/payoff` | 5827 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5920 | ✅ |
| `POST` | `/calculate/volatility-size` | 7683 | ❌ |
| `GET` | `/calculations` | 4048 | ✅ |
| `POST` | `/calculations` | 4035 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4056 | ✅ |
| `POST` | `/checkout/create` | 4204 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4347 | ✅ |
| `POST` | `/education/assistant` | 6723 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7122 | ✅ |
| `GET` | `/education/pattern-catalog` | 6995 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7002 | ✅ |
| `GET` | `/education/scan-timeframes` | 6988 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7055 | ✅ |
| `GET` | `/health` | 5227 | ❌ |
| `GET` | `/journal/stats` | 3424 | ✅ |
| `GET` | `/journal/trades` | 3260 | ❌ |
| `POST` | `/journal/trades` | 3238 | ❌ |
| `DELETE` | `/journal/trades/{trade_id}` | 3325 | ❌ |
| `PUT` | `/journal/trades/{trade_id}` | 3290 | ❌ |
| `GET` | `/market/risk-free` | 5861 | ✅ |
| `POST` | `/monte-carlo` | 3766 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3145 | ❌ |
| `POST` | `/optimize` | 6055 | ✅ |
| `POST` | `/options/ai-analyze` | 6620 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5565 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6108 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5461 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6282 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5655 | ✅ |
| `GET` | `/options/market-flow` | 6864 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5713 | ✅ |
| `GET` | `/options/positions` | 6176 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6195 | ✅ |
| `POST` | `/options/positions/save` | 6158 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6185 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5779 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6415 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4369 | ✅ |
| `GET` | `/performance/analytics` | 7701 | ✅ |
| `GET` | `/performance/instruments` | 7362 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7641 | ❌ |
| `GET` | `/performance/trades` | 7433 | ✅ |
| `POST` | `/performance/trades` | 7375 | ✅ |
| `POST` | `/performance/trades/bulk` | 7398 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7521 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7458 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7471 | ✅ |
| `GET` | `/plan` | 7852 | ✅ |
| `POST` | `/plan` | 7880 | ✅ |
| `GET` | `/plan/compliance` | 7915 | ✅ |
| `PATCH` | `/plan/draft` | 7904 | ✅ |
| `GET` | `/plan/history` | 7861 | ✅ |
| `GET` | `/plans` | 4065 | ❌ |
| `GET` | `/portfolio` | 3442 | ❌ |
| `POST` | `/portfolio` | 3450 | ❌ |
| `GET` | `/portfolio/rebalance` | 3490 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3483 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3472 | ❌ |
| `GET` | `/prices` | 3056 | ✅ |
| `GET` | `/public/settings` | 8624 | ✅ |
| `GET` | `/quote/{symbol}` | 9059 | ❌ |
| `GET` | `/stock/{symbol}` | 5354 | ✅ |
| `POST` | `/subscriptions/cancel` | 4898 | ✅ |
| `POST` | `/subscriptions/change-plan-legacy` | 5003 | ❌ |
| `GET` | `/subscriptions/current` | 4850 | ✅ |
| `POST` | `/subscriptions/resume` | 4957 | ✅ |
| `GET` | `/tickers/search` | 5431 | ✅ |
| `GET` | `/tickers/universal-search` | 5444 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5184 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5167 | ✅ |
| `GET` | `/user-states/list` | 5208 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5197 | ✅ |
| `POST` | `/user-states/save` | 5100 | ✅ |
| `POST` | `/webhook/nowpayments` | 4768 | ✅ |
| `POST` | `/webhook/revolut` | 4674 | ✅ |
| `POST` | `/webhook/stripe` | 4509 | ❌ |

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
| `backend/server.py` | 9,438 |
| `frontend/src/pages/EducationPage.jsx` | 5,505 |
| `frontend/src/lib/i18n/ar.js` | 4,510 |
| `frontend/src/lib/i18n/de.js` | 4,510 |
| `frontend/src/lib/i18n/en.js` | 4,510 |
| `frontend/src/lib/i18n/es.js` | 4,510 |
| `frontend/src/lib/i18n/fr.js` | 4,510 |
| `frontend/src/lib/i18n/it.js` | 4,510 |
| `frontend/src/lib/i18n/ja.js` | 4,510 |
| `frontend/src/lib/i18n/pt.js` | 4,510 |
| `frontend/src/lib/i18n/ru.js` | 4,510 |
| `frontend/src/lib/i18n/zh.js` | 4,510 |

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

