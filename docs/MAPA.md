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
| Módulos del backend | 37 |
| Líneas de Python (backend) | 29,738 |
| Rutas declaradas | 224 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 70 · 1216 |
| Rutas del frontend (`App.js`) | 31 |
| Idiomas · claves i18n (referencia `es`) | 10 · 7,536 |

## ⚠️ Rutas sin consumidor en el frontend

Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por
diseño (un webhook lo llama la pasarela, no el navegador); el resto es código
escrito, probado y que ningún usuario puede alcanzar.

### Sospechosas (27)

**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**
esperando una pantalla. Esto es el hueco G-14.

| Método | Ruta | Definida en |
|---|---|---|
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:9608` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:386` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:4351` |
| `GET` | `/api/auth/admin-status` | `backend/server.py:3715` |
| `POST` | `/api/calculate/american` | `backend/server.py:6635` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:6519` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:8354` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:839` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:7665` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:4460` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3922` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:6417` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:776` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:8312` |
| `GET` | `/api/plans` | `backend/server.py:4523` |
| `GET` | `/api/portfolio` | `backend/server.py:4109` |
| `POST` | `/api/portfolio` | `backend/server.py:4117` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:4157` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:4150` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:4139` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:10122` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:468` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5781` |

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
| `server.py` | 10,565 | 143 | — |
| `performance.py` | 1,844 |  | Performance analytics — trade journal, metrics, error detection. |
| `admin_routes.py` | 1,248 | 25 | admin_routes.py — Endpoints del panel de administración |
| `forum.py` | 1,197 | 19 | forum.py — Comunidad de TradingCalculator.Pro |
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

### `backend/forum.py` — 19 rutas

| Método | Ruta | Línea | Front |
|---|---|---:|:---:|
| `GET` | `/forum/members/{handle}` | 686 | ✅ |
| `DELETE` | `/forum/members/{handle}/follow` | 720 | ✅ |
| `POST` | `/forum/members/{handle}/follow` | 698 | ✅ |
| `GET` | `/forum/meta` | 596 | ✅ |
| `GET` | `/forum/moderation/reports` | 1081 | ✅ |
| `POST` | `/forum/moderation/{target_type}/{target_id}/{accion}` | 1102 | ✅ |
| `PUT` | `/forum/profile` | 640 | ✅ |
| `GET` | `/forum/profile/me` | 633 | ✅ |
| `DELETE` | `/forum/replies/{reply_id}/like` | 987 | ✅ |
| `POST` | `/forum/replies/{reply_id}/like` | 982 | ✅ |
| `POST` | `/forum/report` | 1059 | ✅ |
| `GET` | `/forum/threads` | 734 | ✅ |
| `POST` | `/forum/threads` | 810 | ✅ |
| `DELETE` | `/forum/threads/{thread_id}` | 930 | ✅ |
| `GET` | `/forum/threads/{thread_id}` | 844 | ✅ |
| `DELETE` | `/forum/threads/{thread_id}/like` | 978 | ✅ |
| `POST` | `/forum/threads/{thread_id}/like` | 973 | ✅ |
| `POST` | `/forum/threads/{thread_id}/replies` | 902 | ✅ |
| `POST` | `/forum/translate` | 993 | ✅ |

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
| `GET` | `/` | 5796 | ✅ |
| `GET` | `/admin/audit-log` | 9541 | ✅ |
| `GET` | `/admin/coupons` | 10259 | ✅ |
| `POST` | `/admin/coupons` | 10265 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 10288 | ✅ |
| `GET` | `/admin/feature-flags` | 10308 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 10317 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 9578 | ✅ |
| `GET` | `/admin/market-data-health` | 10102 | ✅ |
| `GET` | `/admin/metrics` | 8796 | ✅ |
| `POST` | `/admin/payments/manual` | 9916 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 9760 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 10056 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9848 | ✅ |
| `POST` | `/admin/promote` | 8844 | ✅ |
| `GET` | `/admin/revenue` | 9641 | ✅ |
| `GET` | `/admin/settings` | 9290 | ✅ |
| `PUT` | `/admin/settings` | 9314 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 9608 | ❌ |
| `GET` | `/admin/usage` | 10138 | ✅ |
| `GET` | `/admin/usage-heatmap` | 10205 | ✅ |
| `GET` | `/admin/users` | 8696 | ✅ |
| `POST` | `/admin/users` | 8918 | ✅ |
| `GET` | `/admin/users.csv` | 8766 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 9032 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8963 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 9067 | ✅ |
| `GET` | `/admin/webhooks` | 10332 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 10338 | ✅ |
| `GET` | `/alerts` | 4225 | ✅ |
| `POST` | `/alerts` | 4211 | ✅ |
| `POST` | `/alerts/send-email` | 4351 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 4233 | ✅ |
| `POST` | `/analytics/track` | 10178 | ✅ |
| `POST` | `/auth/2fa/disable` | 3147 | ✅ |
| `POST` | `/auth/2fa/enable` | 3128 | ✅ |
| `POST` | `/auth/2fa/setup` | 3112 | ✅ |
| `POST` | `/auth/2fa/verify` | 3165 | ✅ |
| `DELETE` | `/auth/account` | 3424 | ✅ |
| `GET` | `/auth/admin-status` | 3715 | ❌ |
| `POST` | `/auth/change-password` | 3060 | ✅ |
| `POST` | `/auth/forgot-password` | 2997 | ✅ |
| `POST` | `/auth/google` | 3554 | ✅ |
| `POST` | `/auth/login` | 2489 | ✅ |
| `POST` | `/auth/logout` | 2655 | ✅ |
| `POST` | `/auth/magic-link` | 2793 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2842 | ✅ |
| `GET` | `/auth/me` | 2621 | ✅ |
| `GET` | `/auth/my-data` | 3449 | ✅ |
| `GET` | `/auth/passkey/available` | 3253 | ✅ |
| `GET` | `/auth/passkey/list` | 3389 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 3313 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 3324 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 3260 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 3278 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 3395 | ✅ |
| `POST` | `/auth/profile` | 3788 | ✅ |
| `PUT` | `/auth/profile` | 3789 | ✅ |
| `POST` | `/auth/refresh` | 2701 | ✅ |
| `POST` | `/auth/register` | 2417 | ✅ |
| `POST` | `/auth/reset-password` | 3026 | ✅ |
| `GET` | `/backtest/strategies` | 8290 | ✅ |
| `POST` | `/backtest/validate` | 8219 | ✅ |
| `POST` | `/billing/create-portal-session` | 5593 | ✅ |
| `GET` | `/billing/history` | 5628 | ✅ |
| `GET` | `/brokers` | 9404 | ✅ |
| `POST` | `/calculate/american` | 6635 | ❌ |
| `POST` | `/calculate/assignment` | 6579 | ✅ |
| `POST` | `/calculate/greeks` | 6548 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 6275 | ✅ |
| `POST` | `/calculate/implied-volatility` | 6519 | ❌ |
| `POST` | `/calculate/payoff` | 6465 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 6558 | ✅ |
| `POST` | `/calculate/volatility-size` | 8354 | ❌ |
| `GET` | `/calculations` | 4506 | ✅ |
| `POST` | `/calculations` | 4493 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 4514 | ✅ |
| `POST` | `/checkout/create` | 4735 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4901 | ✅ |
| `POST` | `/education/assistant` | 7386 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7792 | ✅ |
| `GET` | `/education/pattern-catalog` | 7665 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 7672 | ✅ |
| `GET` | `/education/scan-timeframes` | 7658 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 7725 | ✅ |
| `GET` | `/health` | 5800 | ❌ |
| `GET` | `/journal/stats` | 4091 | ✅ |
| `GET` | `/market/risk-free` | 6499 | ✅ |
| `POST` | `/monte-carlo` | 4460 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3922 | ❌ |
| `POST` | `/optimize` | 6693 | ✅ |
| `POST` | `/options/ai-analyze` | 7274 | ✅ |
| `GET` | `/options/chain/{symbol}` | 6203 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6746 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 6099 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6920 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 6293 | ✅ |
| `GET` | `/options/market-flow` | 7534 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 6351 | ✅ |
| `GET` | `/options/positions` | 6814 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6833 | ✅ |
| `POST` | `/options/positions/save` | 6796 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6823 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 6417 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 7053 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4923 | ✅ |
| `GET` | `/performance/analytics` | 8372 | ✅ |
| `GET` | `/performance/instruments` | 8032 | ✅ |
| `POST` | `/performance/portfolio-risk` | 8312 | ❌ |
| `GET` | `/performance/trades` | 8103 | ✅ |
| `POST` | `/performance/trades` | 8045 | ✅ |
| `POST` | `/performance/trades/bulk` | 8068 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 8191 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 8128 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 8141 | ✅ |
| `GET` | `/plan` | 8523 | ✅ |
| `POST` | `/plan` | 8551 | ✅ |
| `GET` | `/plan/compliance` | 8586 | ✅ |
| `PATCH` | `/plan/draft` | 8575 | ✅ |
| `GET` | `/plan/history` | 8532 | ✅ |
| `GET` | `/plans` | 4523 | ❌ |
| `GET` | `/portfolio` | 4109 | ❌ |
| `POST` | `/portfolio` | 4117 | ❌ |
| `GET` | `/portfolio/rebalance` | 4157 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 4150 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 4139 | ❌ |
| `GET` | `/prices` | 3833 | ✅ |
| `GET` | `/public/settings` | 9384 | ✅ |
| `GET` | `/quote/{symbol}` | 10122 | ❌ |
| `GET` | `/stock/{symbol}` | 5962 | ✅ |
| `POST` | `/subscriptions/cancel` | 5488 | ✅ |
| `GET` | `/subscriptions/current` | 5440 | ✅ |
| `POST` | `/subscriptions/resume` | 5547 | ✅ |
| `GET` | `/tickers/search` | 6069 | ✅ |
| `GET` | `/tickers/universal-search` | 6082 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5757 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5740 | ✅ |
| `GET` | `/user-states/list` | 5781 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5770 | ✅ |
| `POST` | `/user-states/save` | 5673 | ✅ |
| `POST` | `/webhook/nowpayments` | 5358 | ✅ |
| `POST` | `/webhook/revolut` | 5264 | ✅ |
| `POST` | `/webhook/stripe` | 5099 | ❌ |

## Frontend

### Rutas declaradas en `App.js` (31)

| Ruta | Componente |
|---|---|
| `*` | `NotFoundPage` |
| `/` | `LandingPage` |
| `/about` | `AboutPage` |
| `/admin` | `ProtectedRoute` |
| `/affiliate` | `ProtectedRoute` |
| `/backtesting` | `BacktestingPage` |
| `/brokers` | `BrokersPage` |
| `/community` | `CommunityPage` |
| `/community/:threadId` | `CommunityThreadPage` |
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
| `components/auth/` | 3 | 291 |
| `components/backtesting/` | 1 | 175 |
| `components/brokers/` | 1 | 240 |
| `components/calculators/` | 17 | 5,023 |
| `components/calculators/simulator/` | 6 | 1,437 |
| `components/charts/` | 3 | 797 |
| `components/charts/structure/` | 12 | 1,706 |
| `components/common/` | 13 | 2,527 |
| `components/community/` | 4 | 593 |
| `components/dashboard/` | 7 | 926 |
| `components/desk/` | 6 | 1,553 |
| `components/education/` | 88 | 14,669 |
| `components/integrations/` | 2 | 194 |
| `components/landing/` | 5 | 600 |
| `components/layout/` | 2 | 581 |
| `components/options/` | 36 | 8,011 |
| `components/performance/` | 8 | 3,892 |
| `components/performance/form/` | 6 | 724 |
| `components/pricing/` | 1 | 22 |
| `components/settings/` | 2 | 317 |
| `components/tools/` | 2 | 388 |
| `components/ui/` | 31 | 1,763 |
| `pages/` | 24 | 18,422 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 10,565 |
| `frontend/src/pages/EducationPage.jsx` | 5,813 |
| `frontend/src/lib/i18n/ar.js` | 5,045 |
| `frontend/src/lib/i18n/de.js` | 5,045 |
| `frontend/src/lib/i18n/en.js` | 5,045 |
| `frontend/src/lib/i18n/es.js` | 5,045 |
| `frontend/src/lib/i18n/fr.js` | 5,045 |
| `frontend/src/lib/i18n/it.js` | 5,045 |
| `frontend/src/lib/i18n/ja.js` | 5,045 |
| `frontend/src/lib/i18n/pt.js` | 5,045 |
| `frontend/src/lib/i18n/ru.js` | 5,045 |
| `frontend/src/lib/i18n/zh.js` | 5,045 |

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

