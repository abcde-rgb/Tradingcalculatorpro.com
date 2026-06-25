---
name: estado-proyecto
description: >-
  Usar al retomar el proyecto TradingCalculator.Pro, antes de añadir funciones, calculadoras,
  páginas, endpoints, idiomas o secciones admin, al preparar el despliegue/lanzamiento, o
  cuando se pregunte "qué falta", "qué hay que probar" o "qué está hecho". Carga el estado vivo
  del proyecto y las guías de extensión, despliegue y personalización de TradingView, y obliga a
  dejar la documentación actualizada al terminar.
---

# Estado y mantenimiento de TradingCalculator.Pro

Este skill mantiene el proyecto coherente entre sesiones. **Léelo entero antes de tocar nada.**

## 1. Orientación (haz esto primero, siempre)

1. Lee **`docs/ESTADO_PROYECTO.md`** — es la fuente de verdad: semáforo, inventario, huecos,
   plan de test, backlog y registro de sesiones.
2. Lee **`CLAUDE.md`** (arquitectura real: FastAPI + asyncpg con shim Mongo→PostgreSQL).
3. Según la tarea, abre el doc específico en `docs/`:
   - Añadir algo nuevo → **`GUIA_EXTENSION.md`**
   - Gráficos / personalización por usuario → **`TRADINGVIEW_PERSONALIZACION.md`**
   - Publicar / lanzar → **`DEPLOY_CHECKLIST.md`**
   - Análisis y comparación de mercado → **`ANALISIS_2026-06-25.md`**
   - Historial de bugs → **`DIARIO_BUGS.md`** (raíz)

## 2. Reglas de oro (no romper)

- **BD solo por el shim** `db.coleccion.metodo(...)`. **Nunca SQL directo.**
- **Nunca hardcodear `REACT_APP_BACKEND_URL`** ni añadir fallbacks/redirects de auth.
- Todo fetch al backend con **`withCredentials: true` / `credentials: 'include'`**.
- I/O síncrono (red/CPU/Stripe/yfinance/SendGrid) → **`await asyncio.to_thread(...)`**.
- No quitar `PATCH` de CORS; no tocar `samesite=none`+`secure`; no bajar `min-instances`.
- Secretos: nunca en el repo (solo `.env.example` + Secret Manager / GitHub Secrets).

## 3. Verificación obligatoria antes de commit

```bash
cd backend && python -m py_compile server.py admin_routes.py options_math.py missing_apis.py \
  stock_data.py candle_patterns.py performance.py referrals.py realtime_alerts.py
cd backend && pytest tests/ -q        # 10 unit offline deben pasar; integración se salta
cd frontend && npm run build          # exit 0
```
Notas de entorno:
- Si `pip install -r requirements.txt` choca con `PyJWT` del sistema (Debian), usa un
  **venv aislado**: `python -m venv .venv && .venv/bin/pip install -r requirements.txt`.
- Los tests de integración requieren `BACKEND_URL` apuntando a un backend vivo; si no, se
  saltan. Los offline (`tests/*_unit.py`) corren siempre.

## 4. Al terminar (cierre de sesión) — OBLIGATORIO

Actualiza **`docs/ESTADO_PROYECTO.md`**:
- Semáforo (§1) e inventario (§2) si cambió algo.
- Marca casillas cerradas en el backlog (§5) y añade huecos nuevos a §3 con ID `G-xx`.
- **Añade una entrada con fecha en el registro de sesiones (§7).**
- Si tocaste seguridad/bugs, refleja también en `DIARIO_BUGS.md`.

**Regla:** la documentación debe reflejar el **código real**, no intenciones. Verifica
(compila/ejecuta/lee) antes de afirmar que algo está hecho.

## 5. Estado conocido (snapshot 2026-06-25)

- Build frontend ✅ · import backend ✅ (169 rutas) · 10 tests unit offline ✅.
- Seguridad sólida; sin secretos en el repo. Pendiente: C-08 (API keys en DB), 2FA admin.
- Bloqueos de lanzamiento son **operativos** (Stripe real, secretos, DNS) — ver DEPLOY_CHECKLIST.
