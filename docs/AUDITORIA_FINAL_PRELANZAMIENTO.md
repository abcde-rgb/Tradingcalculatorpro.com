# 🚦 Auditoría final pre-lanzamiento — huecos y checklist

> Destila la auditoría pre-lanzamiento (inventario página a página, análisis competitivo, huecos
> financieros, arquitectura de información y estudio free/paid). El **reparto gratis/pago NO se
> toca** (la Sección 7 del informe original es solo estudio). Aquí se recogen los **huecos
> implementables** y el **checklist de lanzamiento**, con el estado en esta rama.

## Huecos financieros que un profesional nota primero (Sección 5)

| # | Hueco | Fórmula / nota | Estado |
|---|---|---|:--:|
| A | **GEX (Gamma Exposure) + niveles** | `GEX_i = Γ_i·OI_i·100·S²·0.01·signo` (+call,−put); call/put wall; gamma-flip | ✅ **completo**: `gamma_exposure()` + `GET /options/gex/{symbol}` + pestaña **Dealers** en el workspace. 🟡 falta ficha `/learn/gex/` |
| B | **Superficie de vol accionable** | skew `IV_put25Δ−IV_call25Δ`, term structure, expected move `S·IV·√(T/365)` | 🟡 hay IV surface; falta explotarla |
| C | **VaR / CVaR cartera** | paramétrico `z_α·σ`, histórico (percentil), CVaR = media de la cola | ✅ `performance_metrics.py` + UI (a nivel journal) |
| D | **Vanna / charm** | `vanna=−e^(−qT)·φ(d1)·d2/σ`; `charm=∂Δ/∂t` | ✅ **completo**: `options_math.py` (verificado por dif. finitas) + `POST /calculate/greeks-advanced` + visibles en la pestaña Dealers |
| E | **Cripto: funding / basis / roll** | `funding_pnl=Σ rate·notional`; `basis=(F−S)/S` | 🔴 pendiente (calculadora) |
| F | **Futuros: roll yield / contango** | `roll_yield≈(F_cercano−F_lejano)/F_lejano` anualizado; SPAN aprox. | 🔴 pendiente |
| G | **Constructor visual de estrategias** (drag de patas, estilo OptionStrat) | evolución de `LegEditor` | 🔴 pendiente (alto esfuerzo) |

## Otros hallazgos (Sección 1)
- **[Alto] Route shadowing (G-04):** ~21 endpoints de `admin_routes.py` son código muerto (los de
  `server.py` ganan). Unificar router admin. 🔴
- **[Alto] Sin CSP en GitHub Pages (G-10):** añadir meta `http-equiv="Content-Security-Policy"` en
  `public/index.html` (TradingView, GA4/GTM, Google OAuth, Stripe, PayPal) y **verificar en navegador**
  (un CSP mal puesto rompe la web). 🔴
- **[Medio] TradingView embed sin persistencia (G-05):** migrar a Advanced Charts + `save_load_adapter`. 🔴
- **[Medio] Datos de opciones vía yfinance** (no OPRA): banner de origen/latencia. 🟡
- **[Alto — ENCONTRADO Y CORREGIDO 2026-08-01] Cadena sintética sin marcar.** El informe daba por
  hecho un `SyntheticDataBanner`/`_synthetic_marker` que **no existía en el código**: cuando no hay
  cadena real, `generate_options_chain()` fabrica `openInterest`/`volume` **aleatorios** y el
  endpoint los devolvía **sin avisar**. Corregido: la respuesta de `/options/chain/{symbol}` ahora
  lleva `synthetic: true`, y el GEX **se niega a calcular** sobre datos modelados (devuelve `null`
  + aviso en la UI). 🟢 Pendiente menor: marcar también OI/volumen como `None` en la propia cadena
  y mostrar el banner en la vista de cadena.
- **[Bajo] Preferencias solo en localStorage (BUG-007):** `PATCH /api/user/preferences`. 🔴
- **[Bajo] Export PDF/imagen no homogéneo** en todas las calculadoras. 🟡

## Plantilla canónica (Sección 6) — ya vigilada por la skill `consistencia-diseno`
Calculadora: **config → KPI destacado → gráfico → detalle en acordeón cerrado → "Registrar en el
diario"/Guardar/Export → enlaces cruzados → FAQ (FAQPage JSON-LD) → disclaimer a `/legal?tab=risk`**.
Tokens: dark `#0f172a`, texto `#e5e7eb`, un acento verde `#22c55e`, `tabular-nums`, elevación por
superficie. Estados vacíos honestos (`None`/"—", nunca 0). Command bar tipo Koyfin/Bloomberg.

## Checklist de lanzamiento (Sección 8) — orquestado por `/pre-deploy`

### 🔴 Bloqueantes operativos (consolas externas — los cierra el dueño, NO el repo)
- Stripe producción: productos + price IDs = `SUBSCRIPTION_PLANS`; webhook `…/api/webhook/stripe`
  (`checkout.session.completed`, `customer.subscription.deleted/updated`, `invoice.payment_failed`);
  probar un pago de cada plan → premium.
- Secretos backend (Secret Manager): `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` (sin `\n`),
  `STRIPE_API_KEY` sk_live, `STRIPE_WEBHOOK_SECRET` whsec.
- Secretos frontend (GitHub Actions): `REACT_APP_BACKEND_URL` (sin `/api`), `REACT_APP_GOOGLE_CLIENT_ID`.
- Google OAuth: origen autorizado. Dominio: decisión + DNS **antes de mergear**.
- Infra: Cloud SQL + Cloud Run (europe-west1); `GET /api/health` → 200.

### 🟠 Importante (arranque)
- **CSP** meta en `public/index.html` + verificar en navegador (G-10).
- NOWPayments/Revolut (operación): key + IPN secret + callbacks; probar en sandbox.
- SendGrid: dominio remitente verificado; probar email/reset/alerta.
- Disclaimer de datos de opciones (yfinance) destacado.
- Branch protection en `main` + CI requerido. Activar Dependabot + CodeQL + secret scanning.

### 🟢 Post-lanzamiento
- Unificar router admin (G-04). Preferencias cross-device (BUG-007). Import CSV por broker.
- Layouts TradingView guardables. Refactor `server.py` monolítico. Accesibilidad (axe/pa11y) + CWV.

## Estudio free/paid (Sección 7 — SOLO ANÁLISIS, NO IMPLEMENTAR)
El reparto actual (17 €/mes · 45 €/trim · 200 €/año · 500 € lifetime, prueba 7 días en suscripción)
**no se toca**. El estudio sugiere, cuando haya datos de conversión, evaluar **Free/Pro/Elite**
(muro en tiempo real/IA/GEX/VaR, no en calculadoras ni academia) y **Paddle como Merchant of Record**
(residencia fiscal Suiza) — decisión futura del dueño, con dato de conversión primero.

> Fuente: auditoría del dueño (1-ago-2026). Cifras de rutas/tests son las declaradas en la doc del
> repo; los precios de competidores fluctúan (verificar antes de citar).
