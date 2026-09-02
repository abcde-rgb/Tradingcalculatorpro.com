# CLAUDE.md

Guía para Claude Code (claude.ai/code) en este repositorio.

> **Este fichero se carga en TODAS las sesiones**, así que sólo contiene lo que aplica
> siempre. El detalle por zona vive en `.claude/rules/` y **se carga solo** cuando tocas
> los ficheros de esa zona — ver [§ Dónde vive cada cosa](#dónde-vive-cada-cosa).

📌 **Antes de trabajar:** [`docs/ESTADO_PROYECTO.md`](./docs/ESTADO_PROYECTO.md) (estado
vivo: semáforo, inventario, huecos, backlog) · [`docs/MAPA.md`](./docs/MAPA.md) (mapa
generado: módulos, rutas, páginas — nunca escrito a mano) ·
[`docs/DECISIONES.md`](./docs/DECISIONES.md) (por qué es así, y qué se descartó) ·
[`docs/GUIA_EXTENSION.md`](./docs/GUIA_EXTENSION.md) (cómo añadir algo) ·
[`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md) (lanzar).
El skill `estado-proyecto` orquesta todo esto y obliga a dejar la doc al día.

## Stack real (no confundir con el origen)

El proyecto nació en Emergent con una imagen `fastapi_react_mongo_shadcn`. **MongoDB fue
descartado**; la BD es **PostgreSQL** (Cloud SQL) vía `asyncpg`. `.emergent/emergent.yml`
es un residuo inofensivo.

- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui → **GitHub Pages**
- **Backend**: Python 3.11 + **FastAPI** (no Flask) + asyncpg → **Google Cloud Run**
- **BD**: PostgreSQL (socket Unix en producción, TCP en local)
- **Auth**: JWT en cookies httpOnly + Google OAuth + **passkeys (WebAuthn)** + 2FA
- **Pagos**: Stripe + PayPal + Revolut Pay + **NOWPayments** (cripto, IPN HMAC-SHA512).
  *OxaPay y MaxelPay se retiraron: no queda código de ninguna.*
- **Email**: SendGrid · **SMS**: Twilio · **IA**: Anthropic SDK (AI Trade Coach)

```
backend/     FastAPI + shim Mongo→PostgreSQL   frontend/   React 19 + CRACO
docs/        toda la doc → docs/README.md      scripts/    verificadores del repo
tests/       smoke E2E manual (backend vivo)   _archive/   código retirado, NO se importa
```

Cualquier `.md` nuevo va a `docs/`; si es una foto fechada que no se mantendrá, a
`docs/historico/`. La raíz sólo lleva `README.md`, `CLAUDE.md` y `SECURITY.md`.

## Comandos

```bash
# Backend (desde backend/) — por socket Unix; con TCP sin SSL falla, ver rules/infra.md
# Los dos ficheros: sin `requirements-dev.txt` no entra `pytest-asyncio`, y sin él
# pytest NO salta las pruebas `async def` — las da por FALLIDAS. Son 22, y como
# toda sesión remota empieza con un clon fresco, fallan siempre.
pip install -r requirements.txt -r requirements-dev.txt
ENVIRONMENT=development JWT_SECRET=devonly \
DATABASE_URL='postgresql://user:pass@/trading_dev?host=/var/run/postgresql' \
uvicorn server:app --host 0.0.0.0 --port 8080 --reload

pytest tests/ -v                  # todos · -k "test_greeks" para uno

# Frontend (desde frontend/)
npm ci --legacy-peer-deps
REACT_APP_BACKEND_URL=http://localhost:8080 npm start
npm run build
```

### Verificar antes de commit — atajo: `/verify`

```bash
cd backend && python -m py_compile *.py     # TODOS los módulos (la lista a mano omitía 6)
cd backend && pytest tests/ -q
cd frontend && npx eslint src scripts       # 0 errores; los avisos de símbolos muertos no bloquean
cd frontend && node scripts/i18n-check.js && node scripts/engine-check.js
python scripts/gen-instruments-js.py --check   # catálogo backend ↔ frontend
python scripts/gen-mapa.py --check             # el mapa refleja el código
python scripts/gen-asistente.py --check        # skills/reglas/agentes bien cableados
python scripts/check-rutas-muertas.py          # cada ruta sin pantalla tiene decisión
python scripts/check-doc-links.py              # los enlaces de la doc resuelven
bash scripts/probar-verificadores.sh           # ¿y esos verificadores verifican?
```

**La última línea no es opcional cuando tocas un verificador.** Sabotea cada comprobación
a propósito y exige que falle. Han aparecido ya varias que no comprobaban nada —una guarda
de determinismo tautológica, una regla que nunca disparaba, un smoke visual que imprimía ✅
generando imágenes en blanco— y ninguna se habría cazado ejecutándola y mirando si pasaba:
pasaban. Si añades un verificador, añade aquí su sabotaje.

Dos herramientas más, que no son puertas sino informes:

```bash
python scripts/auditar.py    # ramas sin fusionar, código muerto, restos de lo retirado,
                             # provisionales y contradicciones doc↔código
node scripts/capturas.js     # smoke visual de las pantallas públicas (escritorio + móvil,
                             # claro + oscuro) con los errores de consola de cada una
```

## Reglas de honestidad numérica (NO ROMPER)

El producto muestra cifras con las que el usuario dimensiona posiciones reales. Estas tres
ya costaron bugs y están fijadas por tests:

1. **Nada de datos inventados sin etiquetar.** Toda respuesta construida sobre
   `generate_options_chain` lleva `synthetic: true` (`_synthetic_marker`) y la UI pinta la
   banda de aviso. El volumen y el interés abierto de una cadena modelada van a `None`:
   son observaciones, no salida de un modelo.
2. **Lo que no se puede calcular es `None`, no `0`.** Un R sin stop es indefinido, no cero
   (como cero arrastra `avg_r` y falsea la distribución). Un Sortino sin pérdidas es
   indefinido. Una IV que el precio no puede determinar es `None`.
3. **Lo sensible al orden se ordena explícitamente.** Curva de equity, drawdown y rachas
   se construyen sobre `sort_trades_chronologically()` (por `exit_date`), nunca sobre el
   orden en que llegó la consulta: el drawdown no es simétrico bajo inversión.

## Invariantes que no se rompen en ninguna zona

- **La BD sólo por el shim** (`db.coleccion.metodo(...)`). **Nunca SQL directo.**
- **El apalancamiento NO entra en el P&L.** `(salida − entrada) × cantidad × multiplicador`,
  y `multiplier` es el **tamaño de contrato**, no la palanca. Meterlo multiplica el
  resultado por veinte.
- **Nunca hardcodear `REACT_APP_BACKEND_URL`** ni añadir fallbacks o redirects de auth.
- **Todo fetch al backend con `credentials: 'include'` / `withCredentials: true`.**
- **I/O síncrono** (red, CPU, Stripe, yfinance, SendGrid) → `await asyncio.to_thread(...)`.
- **Nada de literales para el tipo libre de riesgo**: `useRiskFreeRate()` en el frontend,
  `get_risk_free_rate()` en el backend. Un `0.05` suelto es un bug.
- **Lo generado no se edita a mano**: `instrumentSpecs.generated.js` y `docs/MAPA.md`
  salen de un script, y CI falla si divergen.
- **Secretos nunca en el repo**: `.env.example` + Secret Manager / GitHub Secrets.
- **Antes de escribir un módulo nuevo, comprueba si ya existe.** Decenas de rutas que
  ninguna pantalla llama tienen una decisión escrita en
  [`docs/RUTAS_MUERTAS.md`](./docs/RUTAS_MUERTAS.md) —la mayoría son backends
  terminados esperando interfaz: `backtest.py`, `portfolio_risk.py`,
  `american_options.py`, `market_data.py`… Es el hueco G-14, y
  `check-rutas-muertas.py` impide que la lista crezca (o se pudra) en silencio.

## Arquitectura en cinco líneas

`server.py` (9.097 líneas) es el monolito: shim de BD, todas las rutas, auth, Stripe y
startup. `admin_routes.py` se importa tarde en `startup_event`. El resto de módulos son
puros y se listan, con su responsabilidad y su tamaño, en [`docs/MAPA.md`](./docs/MAPA.md)
— generado, así que no puede quedarse desfasado. Detalle del shim en
`.claude/rules/backend.md`, que se carga solo al abrir un `.py` del backend.

## Autenticación

1. El backend emite `access_token` (1 h) y `refresh_token` (7 d) como cookies httpOnly
   (`samesite=none; secure`, paths `/api` y `/api/auth/refresh`) **y** en el body JSON.
2. El frontend guarda `token` en Zustand (memoria, no persiste).
3. Al recargar: `token` es null → `refreshUser` ve `isAuthenticated=true` → `silentRefresh`
   → `POST /api/auth/refresh` con body `{}` → el backend lee la cookie y reemite.
4. `DEMO_TOKEN = 'demo-token'` es el sentinel del modo demo offline; los guards
   `token === DEMO_TOKEN` evitan llamadas al backend.
5. **Passkeys (WebAuthn)** en `backend/passkeys.py`: acceso sin contraseña y resistente al
   phishing, gestionable desde Ajustes. El *origin* que registra sale de `FRONTEND_URL`
   **sin la ruta del repositorio** — WebAuthn no la lleva. No lo «arregles».
6. Hay **2FA** (TOTP) y enlace de cuentas con Google, endurecidos el 2026-08-10.

## Variables de entorno

**Backend** (producción vía Secret Manager, `--update-secrets` en Cloud Run):

| Variable | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | ✅ | En Cloud SQL: `postgresql://user:pass@/db?host=/cloudsql/proj:region:inst` |
| `JWT_SECRET` | ✅ | RuntimeError si falta en producción; en dev se genera solo |
| `GOOGLE_CLIENT_ID` | Auth Google | Con `.strip()` — un `\n` final rompe todos los logins |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagos | `sk_live_…` / `whsec_…` |
| `SENDGRID_API_KEY` · `ANTHROPIC_API_KEY` | Email · IA | |
| `TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN` / `_FROM_NUMBER` | SMS | **Las tres o ninguna** |
| `ENVIRONMENT` | No | `development` en local: habilita CORS localhost y JWT auto |
| `CORS_ORIGINS` · `ADMIN_EMAILS` | No | Listas separadas por coma |

**Frontend** (GitHub Secrets → Actions): `REACT_APP_BACKEND_URL` (sin `/api`; si falta,
`API = null` y todo falla en silencio), `REACT_APP_GOOGLE_CLIENT_ID`,
`REACT_APP_GA4_MEASUREMENT_ID`, `REACT_APP_GTM_ID`.

## Dónde vive cada cosa

Estas reglas **no están cargadas ahora**: entran solas cuando abres un fichero de su zona.

| Regla | Se carga al tocar | Contiene |
|---|---|---|
| `rules/backend.md` | `backend/**/*.py` | Shim, colecciones de usuario, `$unset`, `user_states`, CORS, rate limiting |
| `rules/opciones.md` | `options_*.py`, `components/options/**` | `expIdx` por pata, cadena sintética, orden del panel, tipo libre de riesgo |
| `rules/diario-riesgo.md` | `performance.py`, `instruments.py`, `components/performance/**` | P&L, apalancamiento, R, setups, unidades, catálogo |
| `rules/escaner.md` | `price_action.py`, `components/charts/**` | Orden del escáner, `counts.confluent`, precio de referencia |
| `rules/preferencias.md` | `cloudPrefs.js`, `prefsMerge.js`, `store.js` | Ajustes en la cuenta, fusión, credenciales |
| `rules/i18n-seo.md` | `lib/i18n/**`, `scripts/gen-*.js` | 10 idiomas, páginas generadas, dominio, ruido en búsquedas |
| `rules/infra.md` | `.github/workflows/**`, `backend/Dockerfile` | Despliegue, `min-instances`, `DB_PROVIDER`, secretos |

⚠️ Tras un `/compact` **estas reglas no se reinyectan**: vuelven a entrar la próxima vez
que Claude lea un fichero de esa zona. Por eso los invariantes de arriba están aquí y no
allí.

## Sandbox remoto (Claude Code on the web)

Entorno efímero y **red de salida restringida** (normalmente sólo registros de paquetes y
Anthropic):

- **Yahoo Finance y los proveedores de precio están BLOQUEADOS** → `get_ohlc_history` y
  los precios en vivo fallan. Todo smoke de escáner o datos de mercado tiene que
  **mockear** o usar fixtures. Una prueba que llame a la red real aquí no prueba nada.
- **Sí corre siempre, offline**: `py_compile`, `i18n-check`, `engine-check`,
  `gen-instruments-js --check`, `gen-mapa --check`, `check-doc-links`, `npm run build`.
- Para E2E con backend vivo (Postgres por socket + uvicorn + Playwright), usa el skill
  `qa`: arranca el stack y conoce las trampas (CORS del puerto, cookies `secure` sobre
  `http://localhost`, el banner de cookies que intercepta clics).
