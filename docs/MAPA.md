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
| Líneas de Python (backend) | 27,011 |
| Rutas declaradas | 199 |
| **Rutas sin consumidor en el frontend** | **33** |
| Ficheros de test · funciones de test | 59 · 1015 |
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
| `POST` | `/api/admin/subscriptions/{user_id}/refund` | `backend/server.py:8812` |
| `GET` | `/api/alerts/realtime/status` | `backend/realtime_alerts.py:352` |
| `POST` | `/api/alerts/send-email` | `backend/server.py:3704` |
| `POST` | `/api/calculate/american` | `backend/server.py:5941` |
| `POST` | `/api/calculate/implied-volatility` | `backend/server.py:5825` |
| `POST` | `/api/calculate/volatility-size` | `backend/server.py:7628` |
| `POST` | `/api/calculations/{calc_id}/save-to-journal` | `backend/missing_apis.py:804` |
| `GET` | `/api/commodities-prices` | `backend/missing_apis.py:281` |
| `GET` | `/api/education/pattern-catalog` | `backend/server.py:6939` |
| `GET` | `/api/forex-prices` | `backend/missing_apis.py:188` |
| `GET` | `/api/indices-prices` | `backend/missing_apis.py:225` |
| `POST` | `/api/monte-carlo` | `backend/server.py:3786` |
| `GET` | `/api/ohlc/{symbol}` | `backend/server.py:3275` |
| `GET` | `/api/options/term-structure/{symbol}` | `backend/server.py:5723` |
| `GET` | `/api/performance/export` | `backend/missing_apis.py:741` |
| `POST` | `/api/performance/portfolio-risk` | `backend/server.py:7586` |
| `GET` | `/api/plans` | `backend/server.py:3844` |
| `GET` | `/api/portfolio` | `backend/server.py:3462` |
| `POST` | `/api/portfolio` | `backend/server.py:3470` |
| `GET` | `/api/portfolio/rebalance` | `backend/server.py:3510` |
| `DELETE` | `/api/portfolio/{asset_id}` | `backend/server.py:3503` |
| `PUT` | `/api/portfolio/{asset_id}` | `backend/server.py:3492` |
| `GET` | `/api/quote/{symbol}` | `backend/server.py:9326` |
| `GET` | `/api/referrals/me` | `backend/referrals.py:133` |
| `POST` | `/api/referrals/redeem-credit` | `backend/referrals.py:333` |
| `POST` | `/api/subscriptions/change-plan` | `backend/missing_apis.py:494` |
| `GET` | `/api/user-states/list` | `backend/server.py:5086` |

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
| `server.py` | 9,705 | 141 | — |
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
| `passkeys.py` | 243 |  | Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña. |
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
| `GET` | `/` | 5101 | ✅ |
| `GET` | `/admin/audit-log` | 8745 | ✅ |
| `GET` | `/admin/coupons` | 9463 | ✅ |
| `POST` | `/admin/coupons` | 9469 | ✅ |
| `POST` | `/admin/coupons/{coupon_id}/toggle` | 9492 | ✅ |
| `GET` | `/admin/feature-flags` | 9512 | ✅ |
| `PATCH` | `/admin/feature-flags/{flag_id}` | 9521 | ✅ |
| `POST` | `/admin/impersonate/{user_id}` | 8782 | ✅ |
| `GET` | `/admin/market-data-health` | 9306 | ✅ |
| `GET` | `/admin/metrics` | 8018 | ✅ |
| `POST` | `/admin/payments/manual` | 9120 | ✅ |
| `GET` | `/admin/payments/reconciliation` | 8964 | ✅ |
| `GET` | `/admin/payments/webhook-health` | 9260 | ✅ |
| `POST` | `/admin/payments/{transaction_id}/grant` | 9052 | ✅ |
| `POST` | `/admin/promote` | 8066 | ✅ |
| `GET` | `/admin/revenue` | 8845 | ✅ |
| `GET` | `/admin/settings` | 8495 | ✅ |
| `PUT` | `/admin/settings` | 8518 | ✅ |
| `POST` | `/admin/subscriptions/{user_id}/refund` | 8812 | ❌ |
| `GET` | `/admin/usage` | 9342 | ✅ |
| `GET` | `/admin/usage-heatmap` | 9409 | ✅ |
| `GET` | `/admin/users` | 7918 | ✅ |
| `POST` | `/admin/users` | 8140 | ✅ |
| `GET` | `/admin/users.csv` | 7988 | ✅ |
| `DELETE` | `/admin/users/{user_id}` | 8254 | ✅ |
| `PATCH` | `/admin/users/{user_id}` | 8185 | ✅ |
| `POST` | `/admin/users/{user_id}/reset-password` | 8289 | ✅ |
| `GET` | `/admin/webhooks` | 9536 | ✅ |
| `POST` | `/admin/webhooks/{event_id}/retry` | 9542 | ✅ |
| `GET` | `/alerts` | 3578 | ✅ |
| `POST` | `/alerts` | 3564 | ✅ |
| `POST` | `/alerts/send-email` | 3704 | ❌ |
| `DELETE` | `/alerts/{alert_id}` | 3586 | ✅ |
| `POST` | `/analytics/track` | 9382 | ✅ |
| `POST` | `/auth/2fa/disable` | 2632 | ✅ |
| `POST` | `/auth/2fa/enable` | 2613 | ✅ |
| `POST` | `/auth/2fa/setup` | 2597 | ✅ |
| `POST` | `/auth/2fa/verify` | 2650 | ✅ |
| `DELETE` | `/auth/account` | 2905 | ✅ |
| `POST` | `/auth/change-password` | 2548 | ✅ |
| `POST` | `/auth/forgot-password` | 2485 | ✅ |
| `POST` | `/auth/google` | 3022 | ✅ |
| `POST` | `/auth/login` | 2039 | ✅ |
| `POST` | `/auth/logout` | 2201 | ✅ |
| `POST` | `/auth/magic-link` | 2310 | ✅ |
| `POST` | `/auth/magic-link/verify` | 2359 | ✅ |
| `GET` | `/auth/me` | 2169 | ✅ |
| `GET` | `/auth/my-data` | 2931 | ✅ |
| `GET` | `/auth/passkey/available` | 2736 | ✅ |
| `GET` | `/auth/passkey/list` | 2870 | ✅ |
| `POST` | `/auth/passkey/login/begin` | 2796 | ✅ |
| `POST` | `/auth/passkey/login/complete` | 2807 | ✅ |
| `POST` | `/auth/passkey/register/begin` | 2743 | ✅ |
| `POST` | `/auth/passkey/register/complete` | 2761 | ✅ |
| `DELETE` | `/auth/passkey/{passkey_id}` | 2876 | ✅ |
| `POST` | `/auth/profile` | 3157 | ✅ |
| `POST` | `/auth/refresh` | 2224 | ✅ |
| `POST` | `/auth/register` | 1979 | ✅ |
| `POST` | `/auth/reset-password` | 2514 | ✅ |
| `GET` | `/backtest/strategies` | 7564 | ✅ |
| `POST` | `/backtest/validate` | 7493 | ✅ |
| `POST` | `/billing/create-portal-session` | 4898 | ✅ |
| `GET` | `/billing/history` | 4933 | ✅ |
| `GET` | `/brokers` | 8608 | ✅ |
| `POST` | `/calculate/american` | 5941 | ❌ |
| `POST` | `/calculate/assignment` | 5885 | ✅ |
| `POST` | `/calculate/greeks` | 5854 | ✅ |
| `POST` | `/calculate/greeks-advanced` | 5581 | ✅ |
| `POST` | `/calculate/implied-volatility` | 5825 | ❌ |
| `POST` | `/calculate/payoff` | 5771 | ✅ |
| `POST` | `/calculate/pnl-attribution` | 5864 | ✅ |
| `POST` | `/calculate/volatility-size` | 7628 | ❌ |
| `GET` | `/calculations` | 3827 | ✅ |
| `POST` | `/calculations` | 3814 | ✅ |
| `DELETE` | `/calculations/{calc_id}` | 3835 | ✅ |
| `POST` | `/checkout/create` | 4056 | ✅ |
| `GET` | `/checkout/status/{session_id}` | 4222 | ✅ |
| `POST` | `/education/assistant` | 6667 | ✅ |
| `GET` | `/education/level-odds/{symbol}` | 7066 | ✅ |
| `GET` | `/education/pattern-catalog` | 6939 | ❌ |
| `GET` | `/education/pattern-scan/{symbol}` | 6946 | ✅ |
| `GET` | `/education/scan-timeframes` | 6932 | ✅ |
| `GET` | `/education/structure-scan/{symbol}` | 6999 | ✅ |
| `GET` | `/health` | 5105 | ❌ |
| `GET` | `/journal/stats` | 3444 | ✅ |
| `GET` | `/market/risk-free` | 5805 | ✅ |
| `POST` | `/monte-carlo` | 3786 | ❌ |
| `GET` | `/ohlc/{symbol}` | 3275 | ❌ |
| `POST` | `/optimize` | 5999 | ✅ |
| `POST` | `/options/ai-analyze` | 6564 | ✅ |
| `GET` | `/options/chain/{symbol}` | 5509 | ✅ |
| `GET` | `/options/earnings/{symbol}` | 6052 | ✅ |
| `GET` | `/options/expirations/{symbol}` | 5405 | ✅ |
| `GET` | `/options/iv-rank/{symbol}` | 6226 | ✅ |
| `GET` | `/options/iv-surface/{symbol}` | 5599 | ✅ |
| `GET` | `/options/market-flow` | 6808 | ✅ |
| `GET` | `/options/positioning/{symbol}` | 5657 | ✅ |
| `GET` | `/options/positions` | 6120 | ✅ |
| `GET` | `/options/positions/portfolio-greeks` | 6139 | ✅ |
| `POST` | `/options/positions/save` | 6102 | ✅ |
| `DELETE` | `/options/positions/{position_id}` | 6129 | ✅ |
| `GET` | `/options/term-structure/{symbol}` | 5723 | ❌ |
| `GET` | `/options/unusual/{symbol}` | 6359 | ✅ |
| `POST` | `/paypal/capture/{order_id}` | 4244 | ✅ |
| `GET` | `/performance/analytics` | 7646 | ✅ |
| `GET` | `/performance/instruments` | 7306 | ✅ |
| `POST` | `/performance/portfolio-risk` | 7586 | ❌ |
| `GET` | `/performance/trades` | 7377 | ✅ |
| `POST` | `/performance/trades` | 7319 | ✅ |
| `POST` | `/performance/trades/bulk` | 7342 | ✅ |
| `DELETE` | `/performance/trades/{trade_id}` | 7465 | ✅ |
| `GET` | `/performance/trades/{trade_id}` | 7402 | ✅ |
| `PUT` | `/performance/trades/{trade_id}` | 7415 | ✅ |
| `GET` | `/plan` | 7797 | ✅ |
| `POST` | `/plan` | 7825 | ✅ |
| `GET` | `/plan/compliance` | 7860 | ✅ |
| `PATCH` | `/plan/draft` | 7849 | ✅ |
| `GET` | `/plan/history` | 7806 | ✅ |
| `GET` | `/plans` | 3844 | ❌ |
| `GET` | `/portfolio` | 3462 | ❌ |
| `POST` | `/portfolio` | 3470 | ❌ |
| `GET` | `/portfolio/rebalance` | 3510 | ❌ |
| `DELETE` | `/portfolio/{asset_id}` | 3503 | ❌ |
| `PUT` | `/portfolio/{asset_id}` | 3492 | ❌ |
| `GET` | `/prices` | 3186 | ✅ |
| `GET` | `/public/settings` | 8588 | ✅ |
| `GET` | `/quote/{symbol}` | 9326 | ❌ |
| `GET` | `/stock/{symbol}` | 5268 | ✅ |
| `POST` | `/subscriptions/cancel` | 4793 | ✅ |
| `GET` | `/subscriptions/current` | 4745 | ✅ |
| `POST` | `/subscriptions/resume` | 4852 | ✅ |
| `GET` | `/tickers/search` | 5375 | ✅ |
| `GET` | `/tickers/universal-search` | 5388 | ✅ |
| `DELETE` | `/user-states/delete/{state_id}` | 5062 | ✅ |
| `GET` | `/user-states/get/{state_id}` | 5045 | ✅ |
| `GET` | `/user-states/list` | 5086 | ❌ |
| `DELETE` | `/user-states/reset-all` | 5075 | ✅ |
| `POST` | `/user-states/save` | 4978 | ✅ |
| `POST` | `/webhook/nowpayments` | 4663 | ✅ |
| `POST` | `/webhook/revolut` | 4569 | ✅ |
| `POST` | `/webhook/stripe` | 4404 | ❌ |

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
| `components/common/` | 12 | 2,258 |
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
| `pages/` | 23 | 16,838 |

## Los ficheros que más cuesta abrir

Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la
dan) en vez de abrirlos de arriba abajo.

| Fichero | Líneas |
|---|---:|
| `backend/server.py` | 9,705 |
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

