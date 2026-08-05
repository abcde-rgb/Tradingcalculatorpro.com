# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 📌 **Antes de trabajar, lee el estado vivo del proyecto:** [`docs/ESTADO_PROYECTO.md`](./docs/ESTADO_PROYECTO.md)
> (qué hay, qué falta, qué probar, backlog). Para añadir cosas: [`docs/GUIA_EXTENSION.md`](./docs/GUIA_EXTENSION.md).
> Para lanzar: [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md). Existe un skill
> `estado-proyecto` (`.claude/skills/`) que orquesta todo esto y obliga a actualizar la doc al terminar.

## Stack real (no confundir con el origen)

El proyecto nació en la plataforma Emergent con una imagen `fastapi_react_mongo_shadcn`. **MongoDB fue descartado.** La BD es ahora **Google Cloud SQL (PostgreSQL)** vía `asyncpg`. El archivo `.emergent/emergent.yml` es un residuo inofensivo del origen.

- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui → desplegado en **GitHub Pages**
- **Backend**: Python 3.11 + **FastAPI** (no Flask) + asyncpg → desplegado en **Google Cloud Run**
- **BD**: PostgreSQL en Cloud SQL (socket Unix en producción, TCP en local)
- **Auth**: JWT con httpOnly cookies + Google OAuth (biblioteca `google-auth`)
- **Pagos**: Stripe SDK + PayPal + Revolut Pay (`revolut.py`) + **NOWPayments** para
  criptomonedas (`nowpayments.py`, IPN firmado con HMAC-SHA512). *OxaPay y MaxelPay se
  probaron en su día y se retiraron: no queda código de ninguna de las dos.*
- **Email**: SendGrid
- **IA**: Anthropic SDK (`ANTHROPIC_API_KEY`) — AI Trade Coach

## Estructura del repositorio

```
backend/     FastAPI + shim Mongo→PostgreSQL   frontend/   React 19 + CRACO
docs/        toda la doc → docs/README.md      scripts/    verificadores del repo
tests/       smoke E2E manual (backend vivo)   _archive/   código retirado
```

`docs/README.md` es el índice, agrupado por intención. `docs/ESTADO_PROYECTO.md` es la
fuente de verdad del estado; `docs/DIARIO_BUGS.md`, el historial de bugs con causa raíz.
La raíz sólo tiene `README.md`, `CLAUDE.md` y `SECURITY.md`: cualquier `.md` nuevo va a
`docs/`, y si es una foto fechada que no se va a mantener, a `docs/historico/`.

## Comandos de desarrollo

### Backend (ejecutar desde `backend/`)
```bash
pip install -r requirements.txt
# OJO con la URL: init_pool trata cualquier host TCP como si fuera Neon y exige SSL
# VERIFICADO. Contra un Postgres local sin SSL falla con CERTIFICATE_VERIFY_FAILED.
# Por socket Unix sí conecta (asyncpg no negocia TLS sobre socket):
ENVIRONMENT=development \
DATABASE_URL='postgresql://user:pass@/trading_dev?host=/var/run/postgresql' \
JWT_SECRET=devonly \
uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

### Tests (siempre desde `backend/`)
```bash
pytest tests/ -v                          # todos los tests
pytest tests/test_trading_calculator.py -v  # un archivo
pytest tests/ -k "test_greeks" -v          # un test concreto
```

### Frontend (ejecutar desde `frontend/`)
```bash
npm ci --legacy-peer-deps
REACT_APP_BACKEND_URL=http://localhost:8080 npm start  # dev con proxy implícito
npm run build                              # build de producción
```

### Verificar antes de commit
```bash
# Sintaxis de TODOS los módulos (la lista a mano se quedaba corta: omitía 6)
cd backend && python -m py_compile *.py

# Lint del frontend. Falla sólo ante errores reales (no-undef, rules-of-hooks);
# los avisos de símbolos muertos no bloquean. Corre también en CI.
cd frontend && npx eslint src scripts

# Paridad de los 10 idiomas y motor del simulador (ambos offline)
cd frontend && node scripts/i18n-check.js && node scripts/engine-check.js

# Los enlaces relativos de la doc resuelven. Existe porque ya se colaron
# referencias a archivos inexistentes y nada las detectaba.
python scripts/check-doc-links.py
```

## Arquitectura: el shim MongoDB→PostgreSQL

`backend/server.py` contiene una capa de compatibilidad (~750 líneas) que expone una API estilo Motor/MongoDB sobre asyncpg+PostgreSQL. **Todos los módulos del backend usan esta API**, no SQL directo.

```python
# Así se usa la BD en todo el código (API Motor-compatible):
user = await db.users.find_one({"email": email})
await db.trades.insert_one({"id": str(uuid.uuid4()), "user_id": uid, ...})
await db.users.update_one({"id": uid}, {"$set": {"is_premium": True}})
cursor = db.calculations.find({"user_id": uid}).sort("created_at", -1).limit(50)
docs = await cursor.to_list()
```

Los datos se almacenan como JSONB en PostgreSQL. La clase `Collection` en `server.py` traduce operadores MongoDB (`$set`, `$inc`, `$push`, `$or`, `$in`, `$regex`, etc.) a SQL paramétrico. Las tablas se crean al inicio con `CREATE TABLE IF NOT EXISTS {name} (_key TEXT PRIMARY KEY, data JSONB NOT NULL)`.

**Nunca añadir SQL directo** — usar siempre la API de `Collection`.

## Reglas de honestidad numérica (no romper)

El producto muestra cifras con las que el usuario dimensiona posiciones reales.
Tres reglas que ya costaron bugs y están fijadas por tests:

1. **Nada de datos inventados sin etiquetar.** Toda respuesta construida sobre
   `generate_options_chain` lleva `synthetic: true` (helper `_synthetic_marker`) y la UI
   pinta una banda de aviso. El volumen y el interés abierto de una cadena modelada van a
   `None`: son observaciones, no salida de un modelo (llenarlos con `rng.randint` hacía que
   todo ratio volumen/OI leyera ruido).
2. **Lo que no se puede calcular es `None`, no `0`.** Un R sin stop es indefinido, no cero
   (como cero arrastra `avg_r` y falsea la distribución). Un Sortino sin pérdidas es
   indefinido, no cero. Una IV que el precio no puede determinar es `None`, no una cifra.
3. **Lo sensible al orden se ordena explícitamente.** La curva de equity, el drawdown y las
   rachas se construyen sobre `sort_trades_chronologically()` (por `exit_date`), nunca sobre
   el orden en que llegó la consulta: el drawdown no es simétrico bajo inversión.

## Módulos del backend

| Archivo | Responsabilidad |
|---|---|
| `server.py` | Monolito principal: shim de BD, todas las rutas API, auth, Stripe, startup |
| `admin_routes.py` | Panel admin (`/api/admin/*`) — se registra dinámicamente en startup |
| `options_math.py` | Black-Scholes, griegas, payoff diagrams, cadenas de opciones |
| `options_positioning.py` | Posicionamiento observado: max pain, GEX, perfil de OI, ratio put/call, liquidez por contrato, term structure de IV y expected move. **Todo devuelve `None` sobre cadena modelada** |
| `stock_data.py` | Precios de acciones/índices/materias primas y búsqueda de tickers |
| `crypto_data.py` | Cripto: Binance por lotes + Kraken (que manda en los 20 pares que cotiza contra dólar). Sustituyó a CoinGecko el 2026-08-02 |
| `ecb_rates.py` | Forex desde el feed de 90 días del BCE. Publica **una vez por día hábil**: estos tipos no se mueven intradía |
| `candle_patterns.py` | Detección de patrones de velas japonesas |
| `price_action.py` | Estructura de precio: swings, BOS/CHoCH, S/R, FVG, rupturas ([manual](./docs/ESCANER_ESTRUCTURA.md)) |
| `timeframes.py` | Escalera de temporalidades (5m–1mes) y pares (vela, histórico) legales del proveedor |
| `performance.py` | Cálculo de PnL, analytics del diario de trading |
| `missing_apis.py` | Forex real, índices, commodities, password reset, magic links |
| `realtime_alerts.py` | Poller de alertas de precio (WebSocket) |
| `referrals.py` | Sistema de referidos |
| `affiliate_program.py` | Programa de afiliados: comisiones, tramos y solicitudes de pago |
| `market_data.py` | Capa de datos de mercado multi-proveedor |
| `options_optimize.py` | Optimizador de estrategias de opciones |
| `market_rates.py` | Tipo libre de riesgo en vivo con caché y fallback — **no** hardcodear 0.0525. Desde el 2026-08-02 la fuente es el `BC_3MONTH` de la Daily Treasury Par Yield Curve (dominio público), no `^IRX` |
| `american_options.py` | Opciones americanas: binomial CRR, Barone-Adesi-Whaley, riesgo de asignación temprana por dividendo. ⚠️ **Sin interfaz** |
| `portfolio_risk.py` | Riesgo a nivel de cuenta: heat abierto, correlación, límites de pérdida con bloqueo, sizing por ATR. ⚠️ **Sin interfaz** |
| `backtest.py` | Backtest con validación: in-sample/out-of-sample, walk-forward, corrección por data snooping. ⚠️ **Sin interfaz** |
| `trading_plan.py` | Plan de trading versionado: modelo, activación/archivado e informe de cumplimiento. **Fuente de verdad de los umbrales de riesgo** que consume `detect_errors`. ⚠️ **Sin interfaz** |
| `nowpayments.py` | Cripto: creación de factura + verificación HMAC-SHA512 del IPN |
| `revolut.py` | Revolut Pay: creación de pedido y confirmación |

`admin_routes.py` se importa de forma lazy en `startup_event`. Si falla la importación, el servidor arranca igual (logging de error) pero sin rutas admin.

## Autenticación

**Flujo de login:**
1. El backend emite `access_token` (1h) y `refresh_token` (7d) como httpOnly cookies (`samesite=none; secure; path=/api` y `path=/api/auth/refresh`) Y en el body JSON.
2. El frontend almacena `token` en Zustand (memoria, no persiste en localStorage).
3. En page reload: `token` es null → `refreshUser` detecta `isAuthenticated=true` → llama `silentRefresh` → POST `/api/auth/refresh` con body `{}` → el backend lee el refresh cookie → emite nuevos tokens.
4. `DEMO_TOKEN = 'demo-token'` es un sentinel para modo demo offline; los guards `token === DEMO_TOKEN` evitan llamadas al backend.

**Las cookies requieren `credentials: 'include'`** en todos los fetch del frontend. Los clientes axios de `optionsApi.js` y `performanceApi.js` usan `withCredentials: true`, y `fetchWithTimeout` en `store.js` lo incluye siempre. `performanceApi.js` además reintenta con refresh silencioso en 401 (corregido; antes carecía de `withCredentials`).

## Variables de entorno

**Backend** (en producción vía Google Secret Manager — `--update-secrets` en Cloud Run):

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL. En Cloud SQL: `postgresql://user:pass@/db?host=/cloudsql/project:region:instance` |
| `JWT_SECRET` | ✅ | Lanza RuntimeError si falta en producción. En dev, se genera automáticamente. |
| `GOOGLE_CLIENT_ID` | Auth Google | Con `.strip()` — un `\n` al final rompe todos los logins OAuth |
| `STRIPE_API_KEY` | Pagos | Debe ser `sk_live_...` en producción |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | `whsec_...` |
| `SENDGRID_API_KEY` | Email | |
| `ANTHROPIC_API_KEY` | AI Coach | |
| `ENVIRONMENT` | No | Setear a `development` en local → habilita CORS localhost y JWT_SECRET auto |
| `CORS_ORIGINS` | No | Orígenes extra separados por coma. Hardcodeados: `tradingcalculatorpro.com`, `www.tradingcalculatorpro.com` |
| `ADMIN_EMAILS` | No | Emails admin separados por coma; no requiere cambio en BD |

**Frontend** (GitHub Secrets → GitHub Actions build):

| Variable | Uso |
|---|---|
| `REACT_APP_BACKEND_URL` | URL de Cloud Run (sin `/api`). Si falta, `API = null` y todas las llamadas fallan silenciosamente. |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth en frontend |
| `REACT_APP_GA4_MEASUREMENT_ID` / `REACT_APP_GTM_ID` | Analytics |

## CI/CD

| Trigger | Workflow | Resultado |
|---|---|---|
| Push a `main` con cambios en `frontend/**` | `deploy-gh-pages.yml` | Build React → GitHub Pages en `https://abcde-rgb.github.io/Tradingcalculatorpro.com` |
| Push a `main` con cambios en `backend/**` | — | **Nada automático.** El workflow se retiró; el backend se despliega a mano con `cloudbuild.yaml` |
| Manual desde GCP | `cloudbuild.yaml` | Equivalente al workflow de backend |

Auth GCP en GitHub Actions: **Workload Identity Federation** (sin JSON keys).

## Trampas conocidas

- **Una pata de opciones tiene su PROPIO vencimiento (`expIdx`).** No heredan el
  vencimiento seleccionado arriba: eso es lo que hacía imposibles los calendars,
  las diagonales y el PMCC. `CalculatorPage` mantiene un mapa `{expIdx: chain}` y
  las pide en una sola llamada (`/options/chain/{sym}?expiration_idxs=1,3,6`). En
  el motor, el cuarto argumento de `calculateStrategyPayoff` son los días que le
  quedan a la **pata más cercana**; de ahí se deriva el tiempo transcurrido y se
  aplica a cada pata por separado. Si añades una estrategia con patas en fechas
  distintas, ponle `expOffset` en la definición de la pata — `isMultiExpiryStrategy`
  lo detecta solo, no hay lista que mantener.
- **El tipo libre de riesgo del frontend sale de `useRiskFreeRate()`**, nunca de un
  literal. Hay una única constante de respaldo, `FALLBACK_RISK_FREE_RATE`, y existe
  para que el motor sea llamable antes de que resuelva el fetch — no para pasarla a
  propósito. Un `0.05` suelto en el frontend es un bug (BUG-033).
- **`/options` es público; el workspace es `/options/calculator`.** La referencia
  (catálogo de estrategias, fichas por slug) no lleva muro de pago y tiene URL
  propia e indexable; la calculadora en vivo sí lo lleva y va con `noindex`. Si
  añades una vista de referencia, va fuera del gate y con ruta propia.
- **Las páginas por estrategia se generan solas en el `postbuild`.** `gen-seo-pages.js`
  lee `STRATEGIES` de `mockData.js` y emite una página por estrategia × 10 idiomas con
  JSON-LD `HowTo`. Añadir una estrategia al array añade 10 páginas al sitemap; no hay
  nada que escribir a mano. Los nombres nuevos van en literal (los términos del sector
  no se traducen) y `tr()` resuelve literal o clave i18n indistintamente.
- **`options_positioning` se calla sobre datos modelados.** Max pain, GEX, perfil de
  OI y ratio put/call son lecturas de interés abierto OBSERVADO; con cadena sintética
  el `openInterest` es `None` y todas devuelven `None`. No las "rellenes" con el
  modelo: un max pain inventado es indistinguible en pantalla de uno real. Hay tests
  que lo fijan.
- **El panel de opciones está ordenado por importancia, y ese orden es la feature.**
  `CalculatorPage` va: 1 configurar (`PositionSetupBar`) → 2 resultado (`StatsKPIBar`) →
  3 gráfico + patas → 4 griegas (`GreeksStrip`) → acordeón (`SecondaryPanels`). Lo nuevo
  que sea accesorio va **dentro del acordeón y cerrado**, usando `SectionCard`; no añadas
  paneles siempre abiertos ni botones de toggle sueltos al final de la página.
- **Si un endpoint puede servir una cadena modelada, el frontend tiene que avisar.**
  El backend ya marca con `_synthetic_marker` (`synthetic` + `syntheticWarning`);
  en el frontend se pinta con `<SyntheticDataBanner synthetic={...} />`. Está en la
  calculadora, la cadena, la superficie de IV y el optimizador — si añades una
  vista que consuma esas respuestas, móntalo también.
- **El tipo libre de riesgo de la UI sale de `GET /api/market/risk-free`**, nunca de un
  literal. Ese endpoint publica también la procedencia (`treasury` / `stale` / `fallback`).
- **`market_rates` cachea también los fallos.** Si toqueas esa lógica, no quites la
  ventana `FAILURE_BACKOFF_SECONDS`: sin ella, con el proveedor caído, `get_risk_free_rate`
  vuelve a salir a la red en cada llamada, y está dentro de `/options/chain`, `/optimize`,
  `/calculate/*` y `/performance/analytics`. Hay test que lo fija.
- **Un número que dispare un consejo de tamaño de posición necesita muestra EN EL ORIGEN**,
  no sólo en el sitio que lo pinta. `suggested_stop_r` vale `None` por debajo de
  `MIN_WINNERS_FOR_STOP_ADVICE`; no lo calcules "y que el consumidor decida".
- **Los umbrales de riesgo salen del plan del usuario, no de constantes.**
  `DEFAULT_MIN_RR` y `DEFAULT_MAX_RISK_PCT` en `performance.py` son sólo el
  fallback para quien no tiene plan; con plan manda `plan["risk"]`. Si añades una
  regla a `detect_errors`, su umbral va en el modelo de `trading_plan.py`, y un
  límite sin declarar es `None` (regla callada), nunca 0.
- **`trading_plans` está en la lista `known` de tablas de `server.py`.** El shim
  **no** autocrea tablas: una colección nueva que no esté en esa lista falla en
  cuanto se consulta. ⚠️ Y `known` **no es la única lista** en la que hay que
  darla de alta: una colección con `user_id` va además en `delete_account`, en
  `_USER_DATA_COLLECTIONS` (purga por retención) y en el export de
  `/auth/my-data`. `trading_plans` no está en ninguna de las tres — es el hueco
  G-15, y es la trampa exacta que crea listar tablas a mano.
- **`plan_version` se sella al crear la operación y no se reescribe.** Cambiar el
  plan no debe re-juzgar retroactivamente la historia que se supone que mide.

- **Cuatro módulos del backend están terminados y no tienen interfaz**:
  `trading_plan.py`, `backtest.py`, `portfolio_risk.py` y `american_options.py`
  (~1770 líneas, ocho endpoints, con tests). Antes de escribir un módulo nuevo,
  mira si lo que te piden ya está ahí esperando una pantalla — ver G-14 en
  `docs/ESTADO_PROYECTO.md`.
- **`_archive/` es código retirado, no se importa.** Contiene `backend_test_security.py`
  (obsoleto: hace `sys.exit(1)` inmediatamente, usaba MongoDB y el puerto equivocado) y
  `backend_test.py`. Los tests vivos son los de `backend/tests/`.
  *`_requests_stdlib_shim.py` se eliminó el 2026-07-30: era un envoltorio de urllib que imitaba
  a `requests` y ningún módulo lo importaba.*
- **CORS incluye `PATCH`** — hay dos endpoints PATCH en `server.py` usados por AdminPage: `PATCH /admin/users/{id}` y `PATCH /admin/feature-flags/{id}`. No eliminarlos del `allow_methods`.
- **`min-instances`** en Cloud Run — configurable vía variable de repositorio `MIN_INSTANCES` (por defecto `1`, intencionado para evitar cold starts en app financiera). Ponla a `0` para ahorrar coste a cambio de ~2-4 s de arranque en frío para el primer usuario tras inactividad.
- **Base de datos conmutable Cloud SQL ↔ Neon** — variable de repositorio `DB_PROVIDER`: vacía/`cloudsql` monta el socket de Cloud SQL (por defecto); `neon` conecta por TCP+SSL usando el secreto `DATABASE_URL`. El código de conexión (`init_pool` en `server.py`) ya soporta ambos. Guía de migración: [`docs/MIGRACION_NEON.md`](./docs/MIGRACION_NEON.md).
- **`samesite=none`** en cookies — necesario porque el frontend (GitHub Pages) y el backend (Cloud Run) son dominios diferentes. Requiere HTTPS obligatoriamente.
- El campo `ENVIRONMENT` no se setea en producción — defaults a `"production"`. En local, setear `ENVIRONMENT=development`.

## Rate limiting (slowapi)

- `POST /auth/register`: 3/hora
- `POST /auth/login`: 10/minuto  
- `POST /auth/google`: 10/minuto
- `POST /auth/refresh`: 30/minuto
- Cálculos y datos de mercado: sin límite (considerar si se añaden endpoints públicos)

## Restricciones del sandbox web (sesiones remotas de Claude Code)

En sesiones remotas (Claude Code on the web) el entorno es efímero y la **red de
salida está restringida** por la política del entorno: normalmente solo registros
de paquetes (npm/pip) y Anthropic. Implicaciones al desarrollar/verificar aquí:

- **Yahoo Finance y CoinGecko están BLOQUEADOS** → `get_ohlc_history` y los
  precios en vivo fallan. Cualquier smoke del escáner, `pattern-scan`,
  `structure-scan` o datos de mercado debe **mockear la respuesta de la API** (o
  usar fixtures). No confíes en una prueba que llame a la red real.
- **Loop de verificación local** (E2E con backend vivo):
  - Postgres 16 por socket Unix + `uvicorn` con
    `ENVIRONMENT=development JWT_SECRET=devonly DATABASE_URL=postgresql://...`.
  - Para probar login en Playwright: arranca el backend con
    `CORS_ORIGINS="http://localhost:<puerto>,http://127.0.0.1:<puerto>"` del
    puerto donde sirves el frontend, o el navegador bloqueará el login por CORS.
  - Las cookies `secure` NO persisten sobre `http://localhost` → usa navegación
    client-side en el test, no recargas completas.
  - Descarta el **cookie banner** antes de hacer clic (intercepta los clicks).
- **Verificación offline que SÍ corre siempre:** `python -m py_compile ...`,
  `node frontend/scripts/i18n-check.js` (paridad de 10 idiomas) y `npm run build`.
  Atajo: comando `/verify`.
- Order flow real (delta/CVD/footprint) necesita datos de tick → viable **solo
  en cripto** (Binance/Bybit) y con una capa de datos mockeable en el sandbox.
