# Auditoría del diario, el plan y la analítica — verificación y estado

**Auditoría recibida:** 2026-08-06 · **Verificada contra el código real:** 2026-08-06
**Alcance:** `backend/performance.py`, `backend/trading_plan.py`, rutas de
journal/performance/plan en `backend/server.py`, `frontend/src/components/performance/*`,
`components/tools/TradingJournal.jsx`, `lib/store.js`, `services/performanceApi.js`,
sitemap y rutas.

Este documento registra **qué se comprobó**, no lo que la auditoría afirmaba. Cada
hallazgo se contrastó contra el código; uno de ellos resultó estar mal diagnosticado.

---

## 1. Los cinco hallazgos principales

| # | Hallazgo | Verificado | Estado |
|---|---|---|---|
| 1 | Dos esquemas incompatibles en `db.trades`; el P&L se reescribe a 0 | ✅ **Reproducido ejecutando el código** | ⏳ BUG-039 — Fase 1+2 |
| 2 | Tres diarios paralelos, uno solo en `localStorage` | ✅ Confirmado | ✅ BUG-042 — congelado |
| 3 | Diario de una sola pata: no admite spreads, condors, calendars ni PMCC | ✅ Confirmado (cero apariciones de `legs`) | ⏳ Fase 1 |
| 4 | `/journal/stats` calcula drawdown y rachas sin ordenar | ✅ Confirmado | ✅ BUG-040 |
| 5 | El sitemap publica el dominio de GitHub Pages | ✅ Cierto — ❌ **pero el diagnóstico es erróneo** | Ver §2 |

### Cómo se reprodujo el hallazgo 1

```python
from performance import compute_trade_pnl
# Un trade tal y como lo guarda POST /journal/trades (camelCase)
t = {'entryPrice': 100.0, 'exitPrice': 110.0, 'quantity': 1.0,
     'leverage': 1.0, 'status': 'closed', 'pnl': 10.0}
compute_trade_pnl(t)['pnl']   # -> 0.0   (el guardado era 10.0)
```

`compute_trade_pnl` busca `entry_price`; encuentra `entryPrice`; con `entry == 0`
toma la salida temprana y devuelve `pnl = 0.0`. Y `perf_update_trade` hace
`{"$set": enriched}`: **el cero se persiste en cuanto el usuario edita el trade.**

---

## 2. El hallazgo del sitemap está mal diagnosticado

La auditoría lo presenta como «el arreglo más barato y de mayor impacto»: cambiar
`DOMAIN` en `gen-sitemap.js` al dominio de producción. **Hacerlo así rompe más de
lo que arregla.**

Lo comprobado en el repo:

- `deploy-gh-pages.yml` compila con `PUBLIC_URL: /Tradingcalculatorpro.com` —
  subcarpeta, no raíz— y publica con `keep_files: false` y **sin** paso `cname:`.
- **No existe** `frontend/public/CNAME`.
- `homepage` de `package.json`, `ORIGIN` de `useSEO.js`, el canonical, los 10
  `hreflang`, Open Graph, Twitter, los bloques JSON-LD de `index.html` y la línea
  `Sitemap:` de `robots.txt` apuntan **todos** al mismo sitio: GitHub Pages.
- `tradingcalculatorpro.com` resuelve a Cloudflare (`2606:4700:…`), no a GitHub
  Pages (`2606:50c0:…`).

Es decir: el sitemap **no está equivocado, está de acuerdo con el resto del
sitio**. Cambiarlo solo a él deja el sitemap anunciando un dominio mientras cada
página declara `rel=canonical` hacia otro — Google se queda con el canonical y
descarta las URLs anunciadas, así que se pierde el sitemap entero.

**BUG-037 de `DIARIO_BUGS.md` ya lo decía** con todas las letras: el dominio
propio es *«el dominio que todavía no está en uso»*.

**Lo hecho en su lugar:** el origen sale ahora de `SITE_ORIGIN` en los dos
generadores, con el valor actual por defecto (cambio sin efecto funcional), de
modo que la mudanza sea **un solo interruptor** en vez de ocho ediciones
descoordinadas. El checklist completo —DNS, CNAME, `PUBLIC_URL`, OAuth, Search
Console— está en [`MIGRACION_DOMINIO.md`](./MIGRACION_DOMINIO.md).

---

## 3. Fase 0 — hecho

| Acción | Estado |
|---|---|
| Ordenar cronológicamente en `/journal/stats` | ✅ BUG-040 |
| Breakeven fuera de perdedoras; `profitFactor` `None` sin pérdidas | ✅ BUG-041 |
| Topar `limit` (máx. 500) en los dos listados | ✅ BUG-043 |
| Avisar cuando la analítica trunca a 1.000 | ✅ BUG-043 |
| Congelar el diario de `localStorage` con exportación previa | ✅ BUG-042 |
| Corregir el dominio del sitemap | ⚠️ Ver §2 — no procede como estaba descrito |

Verificación: 564 tests del backend en verde (14 nuevos en
`tests/test_journal_stats_unit.py`), `py_compile` de todos los módulos, eslint sin
errores, paridad de los 10 idiomas, `engine-check` 141/141 y `npm run build`.

## 4. Lo que sigue pendiente

Por orden de dependencia:

1. **Modelo unificado multi-pata** (`Position` → `Leg` → `Execution`, colección
   nueva `positions`). Bloquea todo lo demás: la analítica de opciones sobre el
   esquema actual es deuda garantizada, y sin P&L neteado entre patas un credit
   spread no tiene número correcto posible. Recordatorio de `CLAUDE.md`: una
   colección nueva se da de alta en **cuatro** listas (`known`, `delete_account`,
   `_USER_DATA_COLLECTIONS` y el export de `/auth/my-data`), no solo en la primera.
2. **Migración con recuperación del P&L a cero** (BUG-039). Cuanto más se tarde,
   más documentos corrompe `perf_update_trade`. Normalizar camelCase → snake_case
   **antes** de convertir es la única forma de recuperar el importe original.
3. **Vocabulario de opciones en el plan** (IV rank, DTE, delta, gestión a X DTE,
   límite de buying power). `require_stop_loss` no debe aplicarse a riesgo
   definido: hoy penaliza como error una operación correctamente construida.
4. **Analítica y gráficos de opciones**, y visibilidad pública.

La arquitectura de `trading_plan.py` (versionado inmutable, `plan_version`
estampado por operación, `change_reason` obligatorio desde v2) es correcta y **no
hay que tocarla**: lo que le falta es vocabulario, no diseño.

> ⚠️ Antes de escribir módulos nuevos para lo anterior, mirar el hueco **G-14** de
> `ESTADO_PROYECTO.md`: `trading_plan.py`, `backtest.py`, `portfolio_risk.py` y
> `american_options.py` ya están escritos y con tests, esperando interfaz.
