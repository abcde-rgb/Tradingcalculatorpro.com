# TradingCalculator.Pro

SaaS de **calculadoras de trading, analítica de opciones, diario y formación**, con panel de
administración, pagos (Stripe/PayPal/Revolut/cripto), autenticación (Google OAuth + JWT) y un
**AI Trade Coach** basado en Claude.

- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui → **GitHub Pages**
- **Backend**: Python 3.11 + FastAPI + asyncpg → **Google Cloud Run** (`europe-west1`)
- **BD**: PostgreSQL (Cloud SQL) mediante un shim con API estilo Mongo sobre JSONB
- **Live**: `https://abcde-rgb.github.io/Tradingcalculatorpro.com`

---

## 🗺️ Mapa del repositorio

```
├── backend/              FastAPI. El shim Mongo→PostgreSQL vive en server.py
│   ├── server.py           Monolito: shim de BD, rutas, auth, Stripe, startup
│   ├── trading_plan.py     Plan versionado — fuente de verdad de los umbrales de riesgo
│   ├── performance.py      PnL, analítica del diario, detección de errores
│   ├── options_math.py     Black-Scholes, griegas, cadenas
│   └── tests/              *_unit.py corren siempre; el resto necesita BACKEND_URL
│
├── frontend/             React 19 + CRACO
│   ├── src/components/     Por dominio: options/, performance/, calculators/, education/
│   ├── src/lib/i18n/       8 idiomas con paridad total de claves (obligatoria)
│   └── scripts/            Verificadores: i18n-check, engine-check, fetch-credentials
│
├── docs/                 📖 Toda la documentación → empieza por docs/README.md
│   ├── ESTADO_PROYECTO.md    Fuente de verdad: qué hay, qué falta, qué probar
│   ├── DIARIO_BUGS.md        Historial de bugs con causa raíz
│   ├── setup/                Alta de infraestructura (GCP, OAuth, SEO)
│   └── historico/            Ya no describe el sistema actual. No se mantiene
│
├── scripts/              Verificadores del repo (enlaces de doc)
├── tests/                Smoke E2E manual contra un backend vivo
├── monitoring/           Dashboard de GCP
├── packaging/            Manifiesto TWA (Play Store)
├── _archive/             Código retirado. No se importa
│
├── CLAUDE.md             ⚠️ Arquitectura real y trampas conocidas. Leer antes de tocar código
└── SECURITY.md           Política de divulgación
```

**Dónde mirar según lo que vayas a hacer:** [`docs/README.md`](./docs/README.md) es el índice
completo, agrupado por intención (escribir código, desplegar, captar usuarios, contenido…).

> **Antes de tocar código, lee [`CLAUDE.md`](./CLAUDE.md).** Recoge decisiones que ya costaron
> bugs: por qué la BD sólo se toca por el shim, por qué un valor que no se puede calcular es
> `None` y no `0`, y por qué los umbrales de riesgo salen del plan del usuario y no de constantes.

---

## 🛠️ Desarrollo

### Backend (desde `backend/`)

```bash
pip install -r requirements.txt
```

⚠️ **Ojo con la URL de la BD.** `init_pool` trata cualquier host TCP como si fuera Neon y exige
SSL, así que contra un Postgres local sin SSL falla con `CERTIFICATE_VERIFY_FAILED`. Por socket
Unix sí conecta (asyncpg no negocia TLS sobre socket):

```bash
ENVIRONMENT=development \
DATABASE_URL='postgresql://user:pass@/trading_dev?host=/var/run/postgresql' \
JWT_SECRET=devonly \
uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

### Frontend (desde `frontend/`)

```bash
npm ci --legacy-peer-deps
REACT_APP_BACKEND_URL=http://localhost:8080 npm start
npm run build
```

---

## ✅ Verificación antes de commit

Todo esto corre **sin red**, así que funciona también en un sandbox donde Yahoo Finance y
CoinGecko están bloqueados:

```bash
cd backend   && python -m py_compile *.py          # todos los módulos, no una lista a mano
cd backend   && pytest tests/ -q                   # unitarios offline; integración se salta
cd frontend  && npx eslint src scripts             # falla sólo ante errores reales
cd frontend  && node scripts/i18n-check.js         # paridad de claves en los 8 idiomas
cd frontend  && node scripts/engine-check.js       # motor del simulador
cd frontend  && npm run build                      # exit 0
python scripts/check-doc-links.py                  # los enlaces de la doc resuelven
```

Atajo: el comando `/verify` de Claude Code ejecuta la secuencia entera.

---

## 🚀 CI/CD

| Trigger | Workflow | Resultado |
|---|---|---|
| PR | `ci.yml` | Compila backend, tests unitarios, build del frontend |
| Push a `main` con `frontend/**` | `deploy-gh-pages.yml` | GitHub Pages |
| Push a `main` con `backend/**` | — | **Despliegue manual.** El workflow se retiró; ver `cloudbuild.yaml` |

Auth de GCP mediante **Workload Identity Federation** (sin claves JSON).

---

## 🔒 Seguridad

JWT con cookies httpOnly, revocación de tokens, CORS con allowlist, webhooks de Stripe con firma
verificada, Docker no-root y sin secretos en el repositorio. Detalle en
[`docs/ANALISIS_2026-06-25.md`](./docs/ANALISIS_2026-06-25.md) (§12) y política de divulgación en
[`SECURITY.md`](./SECURITY.md).
