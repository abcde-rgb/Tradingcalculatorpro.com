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
- **Pagos**: Stripe SDK
- **Email**: SendGrid
- **IA**: Anthropic SDK (`ANTHROPIC_API_KEY`) — AI Trade Coach

## Comandos de desarrollo

### Backend (ejecutar desde `backend/`)
```bash
pip install -r requirements.txt
ENVIRONMENT=development DATABASE_URL=postgresql://user:pass@localhost:5432/trading_dev JWT_SECRET=devonly uvicorn server:app --host 0.0.0.0 --port 8080 --reload
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

### Verificar sintaxis Python antes de commit
```bash
python -m py_compile backend/server.py backend/admin_routes.py backend/options_math.py
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

## Módulos del backend

| Archivo | Responsabilidad |
|---|---|
| `server.py` | Monolito principal: shim de BD, todas las rutas API, auth, Stripe, startup |
| `admin_routes.py` | Panel admin (`/api/admin/*`) — se registra dinámicamente en startup |
| `options_math.py` | Black-Scholes, griegas, payoff diagrams, cadenas de opciones |
| `stock_data.py` | Precios en tiempo real (yfinance, CoinGecko) y búsqueda de tickers |
| `candle_patterns.py` | Detección de patrones de velas japonesas |
| `price_action.py` | Estructura de precio: swings, BOS/CHoCH, S/R, FVG, rupturas ([manual](./docs/ESCANER_ESTRUCTURA.md)) |
| `timeframes.py` | Escalera de temporalidades (5m–1mes) y pares (vela, histórico) legales del proveedor |
| `performance.py` | Cálculo de PnL, analytics del diario de trading |
| `missing_apis.py` | Forex real, índices, commodities, password reset, magic links |
| `realtime_alerts.py` | Poller de alertas de precio (WebSocket) |
| `referrals.py` | Sistema de referidos |

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
| Push a `main` con cambios en `backend/**` | `deploy-cloud-run.yml` | Tests → Docker build → Cloud Run (`tradingcalculator-api`, `europe-west1`) |
| Manual desde GCP | `cloudbuild.yaml` | Equivalente al workflow de backend |

Auth GCP en GitHub Actions: **Workload Identity Federation** (sin JSON keys).

## Trampas conocidas

- **`backend_test_security.py` en la raíz está OBSOLETO** — hace `sys.exit(1)` inmediatamente. Usaba MongoDB (motor) y el puerto incorrecto. Usar siempre `backend/tests/`.
- **`_requests_stdlib_shim.py` en la raíz** no es la librería `requests`. Es un shim stdlib que existía para evitar instalar el paquete. No importar directamente.
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
  `node frontend/scripts/i18n-check.js` (paridad de 8 idiomas) y `npm run build`.
  Atajo: comando `/verify`.
- Order flow real (delta/CVD/footprint) necesita datos de tick → viable **solo
  en cripto** (Binance/Bybit) y con una capa de datos mockeable en el sandbox.
