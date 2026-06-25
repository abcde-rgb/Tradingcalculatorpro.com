# TradingCalculator.Pro

SaaS de **calculadoras de trading, analítica de opciones, journal y educación**, con panel de
administración, pagos (Stripe/PayPal), autenticación (Google OAuth + JWT) y un **AI Trade
Coach** basado en Claude.

- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui → **GitHub Pages**
- **Backend**: Python 3.11 + FastAPI + asyncpg → **Google Cloud Run**
- **BD**: PostgreSQL (Cloud SQL) mediante un shim con API estilo Mongo sobre JSONB
- **Live**: `https://abcde-rgb.github.io/Tradingcalculatorpro.com`

> Arquitectura detallada y "trampas conocidas": ver [`CLAUDE.md`](./CLAUDE.md).

## 📚 Documentación

| Documento | Para qué |
|---|---|
| [`docs/ESTADO_PROYECTO.md`](./docs/ESTADO_PROYECTO.md) | **Estado vivo**: qué hay, qué falta, qué probar, backlog. Empieza aquí. |
| [`docs/ANALISIS_2026-06-25.md`](./docs/ANALISIS_2026-06-25.md) | Análisis apartado por apartado + comparación con competidores + seguridad |
| [`docs/GUIA_EXTENSION.md`](./docs/GUIA_EXTENSION.md) | Cómo añadir calculadoras, páginas, endpoints, idiomas, secciones admin |
| [`docs/TRADINGVIEW_PERSONALIZACION.md`](./docs/TRADINGVIEW_PERSONALIZACION.md) | Personalización del gráfico por usuario (activo, indicadores, layouts) |
| [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md) | Checklist para publicar y lanzar |
| [`DIARIO_BUGS.md`](./DIARIO_BUGS.md) | Historial de bugs y correcciones |

## 🛠️ Desarrollo

### Backend (desde `backend/`)
```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt   # venv aislado (evita conflicto PyJWT del sistema)
ENVIRONMENT=development JWT_SECRET=devonly \
  DATABASE_URL=postgresql://user:pass@localhost:5432/trading_dev \
  .venv/bin/uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

### Tests (desde `backend/`)
```bash
pytest tests/ -q     # tests unitarios offline (matemáticas de opciones) + integración (se salta sin BACKEND_URL)
```

### Frontend (desde `frontend/`)
```bash
npm ci --legacy-peer-deps
REACT_APP_BACKEND_URL=http://localhost:8080 npm start
npm run build
```

## ✅ CI/CD

- **PRs** → `.github/workflows/ci.yml`: compila el backend, corre tests unitarios y construye el frontend.
- **Push a `main` con `frontend/**`** → `deploy-gh-pages.yml` (GitHub Pages).
- **Push a `main` con `backend/**`** → `deploy-cloud-run.yml` (Cloud Run, `europe-west1`).

## 🔒 Seguridad

JWT con cookies httpOnly, revocación de tokens, CORS allowlist, webhooks Stripe con firma
verificada, Docker no-root, sin secretos en el repositorio. Detalle en
[`docs/ANALISIS_2026-06-25.md`](./docs/ANALISIS_2026-06-25.md) (§12).
