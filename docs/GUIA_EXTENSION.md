# 🧩 Guía de extensión — cómo añadir contenido, apartados y funciones

> Cómo ampliar TradingCalculator.Pro sin romper nada. Cada receta apunta a archivos y
> patrones **reales** del repo. Lee también las "Reglas de oro" al final (§10) antes de tocar
> nada, y actualiza [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) cuando termines.

Índice:
1. Nueva calculadora · 2. Nueva página/ruta · 3. Nuevo endpoint backend ·
4. Nuevo módulo backend · 5. Nuevo activo · 6. Nuevo idioma · 7. Nueva sección admin ·
8. Función premium · 9. Nuevo indicador/ajuste TradingView · 10. Reglas de oro · 11. Checklist

---

## 1. Añadir una nueva calculadora

1. **Crea el componente** en `frontend/src/components/calculators/MiCalculadora.jsx`.
   Usa los componentes shadcn de `@/components/ui/*` y el hook `useTranslation` para textos.
   ```jsx
   import { useTranslation } from '@/lib/i18n';
   import { Card } from '@/components/ui/card';
   export default function MiCalculadora() {
     const { t } = useTranslation();
     // ...lógica de cálculo en cliente...
     return <Card>{t('miCalcTitulo')}</Card>;
   }
   ```
2. **Móntala** en la página que corresponda (p. ej. `pages/DashboardPage.jsx` o crea pestaña).
3. **Textos i18n**: añade las claves en `frontend/src/lib/i18n/es.js` (mínimo) y en el resto
   de idiomas (§6). El idioma `es` es el bundle por defecto.
4. **Si necesita backend** (p. ej. cálculo pesado): añade endpoint (§3) y consúmelo con un
   cliente axios `withCredentials: true` (ver `services/optionsApi.js` como patrón).
5. **Tests**: si la lógica es pura, añade un test offline en `backend/tests/*_unit.py`
   (o un test JS) — ver `backend/tests/test_options_math_unit.py`.

---

## 2. Añadir una nueva página / ruta

En `frontend/src/App.js`:
1. **Lazy import** (sigue el patrón existente):
   ```js
   const MiPagina = lazy(() => import("@/pages/MiPagina"));
   ```
2. **Ruta** dentro de `<Routes>`. Si requiere login, envuélvela en `ProtectedRoute`
   (y `adminOnly` si es de admin):
   ```jsx
   <Route path="/mi-pagina" element={<ProtectedRoute><MiPagina /></ProtectedRoute>} />
   ```
3. **Navegación**: añade el enlace en el header/footer (`components/layout/`).
4. **SEO**: usa el hook `hooks/useSEO.js` en la página y, si es indexable, añádela a
   `frontend/public/sitemap.xml`.
5. **SPA en GitHub Pages**: las rutas directas funcionan porque el workflow copia
   `index.html → 404.html`. No hace falta nada extra.

---

## 3. Añadir un endpoint en el backend

En `backend/server.py` (o en el módulo que corresponda), usa el `api_router` (prefijo `/api`):
```python
@api_router.post("/mi-recurso")
async def crear_mi_recurso(payload: MiModelo, user: dict = Depends(require_user)):
    # Acceso a BD SIEMPRE por el shim (estilo Mongo), NUNCA SQL directo:
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], **payload.dict()}
    await db.mi_coleccion.insert_one(doc)
    return {"ok": True, "id": doc["id"]}
```
Reglas:
- **Auth**: `Depends(require_user)` para usuarios, `Depends(require_admin)` para admin.
  Para acceso opcional, `Depends(get_current_user)` (puede devolver `None`).
- **Premium**: si la función es de pago, comprueba `check_premium(user)` y lanza 402/403.
- **Validación**: usa modelos Pydantic con `Field(...)` (longitudes, rangos) — evita DoS.
- **Llamadas bloqueantes** (red/CPU/Stripe/yfinance/SendGrid): envuélvelas en
  `await asyncio.to_thread(funcion_sync, ...)`. **Nunca** llames I/O síncrono en `async def`.
- **Rate limit** si es público: `@limiter.limit("5/minute")` (patrón en `referrals.py`).
- La tabla JSONB se crea sola (`CREATE TABLE IF NOT EXISTS ...`) al primer uso de la colección.

---

## 4. Añadir un módulo backend nuevo (grupo de rutas)

Sigue el patrón de `missing_apis.py` / `referrals.py`:
1. Crea `backend/mi_modulo.py` con un `APIRouter()` propio y una función `register(...)`:
   ```python
   from fastapi import APIRouter
   router = APIRouter()

   @router.get("/mi-modulo/ping")
   async def ping(): return {"ok": True}

   def register(api_router, db, helpers):
       """Se llama en startup. `helpers` trae limiter, require_user, etc."""
       api_router.include_router(router)
   ```
2. **Regístralo en `server.py`** dentro del bloque de registro (busca
   `register as register_missing_apis`, ~línea 5978) e invócalo igual que los demás.
3. ⚠️ **Cuidado con el _route shadowing_** (G-04): si declaras una ruta que ya existe en
   `server.py`, FastAPI usa la **primera registrada**. No dupliques paths.

---

## 5. Añadir un activo (para el gráfico TradingView y búsquedas)

En `frontend/src/lib/assets.js` añade una entrada con su `tradingviewSymbol`:
```js
{ symbol: 'XAUUSD', name: 'Oro', category: 'commodities', tradingviewSymbol: 'OANDA:XAUUSD' }
```
- El `tradingviewSymbol` debe existir en TradingView (formato `EXCHANGE:TICKER`).
- Asígnale una de las 6 categorías: `crypto, forex, stocks, indices, commodities, futures`.
- Si quieres precio en vivo en el backend, comprueba que `stock_data.py`/`missing_apis.py`
  resuelven ese símbolo (yfinance/CoinGecko).

---

## 6. Añadir un idioma

En `frontend/src/lib/i18n.js`:
1. Crea `frontend/src/lib/i18n/<código>.js` exportando un objeto con **las mismas claves**
   que `es.js` (cópialo y traduce).
2. Añade el loader a `LOCALE_LOADERS`, el código a `SUPPORTED` y una entrada a `languages`
   (con `flag`). Para RTL (árabe) ya hay manejo en `applyDomLocale` (`dir = 'rtl'`).
3. Mapea el locale de TradingView en `TV_LOCALE_MAP` dentro de `TradingViewChart.jsx`.

> Mantén las claves sincronizadas entre idiomas: una clave que falte cae al texto por defecto.

---

## 7. Añadir una sección al panel admin

- **Backend**: añade el endpoint bajo `/admin/*` con `Depends(require_admin)`. Decide si va en
  `server.py` (gana por shadowing) o en `admin_routes.py`. **Recomendado**: por ahora, en
  `server.py` para evitar el shadowing (G-04), hasta que se unifique el router.
- **Escrituras**: llama a `await log_admin_action(admin=user, action="...", ...)` para que
  quede en el **audit log**.
- **Frontend**: añade la pestaña/sección en `pages/AdminPage.jsx` y consúmela con
  `withCredentials: true` + bearer (patrón ya presente en ese archivo).

---

## 8. Marcar una función como premium

- **Backend**: en el endpoint, `if not check_premium(user): raise HTTPException(402, ...)`.
- **Frontend**: usa `lib/premium.js` para gating de UI (mostrar candado / CTA a `/pricing`).
- El usuario demo (`DEMO_EMAIL`) siempre tiene premium en cliente y servidor.

---

## 9. Añadir un indicador o ajuste al gráfico TradingView

Con el **embed actual** (`TradingViewChart.jsx`) el margen es limitado pero real:
- **Más indicadores por defecto**: el iframe acepta `studies=` (hoy `RSI@tv-basicstudies`).
  Puedes pasar varios separados por coma (URL-encoded). Pero el usuario **no** puede guardar
  los suyos.
- **Temporalidades**: edita el array `intervals` (hoy 1m…1M).
- **Para personalización real por usuario** (N indicadores, dibujos, layouts guardados):
  hay que migrar a la **librería Advanced Charts** + `save_load_adapter` → backend.
  Plan detallado en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).

---

## 10. Reglas de oro (no las rompas)

1. **BD solo por el shim** `db.coleccion.metodo(...)` estilo Mongo. **Nunca SQL directo.**
2. **Nunca hardcodees `REACT_APP_BACKEND_URL`** ni añadas fallbacks/redirects de auth
   (rompe el login — ver aviso en `App.js`).
3. **Todo fetch al backend con `credentials: 'include'` / `withCredentials: true`** (cookies).
4. **I/O síncrono (red/CPU) → `asyncio.to_thread`** dentro de `async def`.
5. **CORS incluye `PATCH`**: no lo quites (hay endpoints PATCH del admin).
6. **`samesite=none` + `secure`** en cookies: requiere HTTPS; no lo cambies.
7. **`min-instances=1`** en Cloud Run: no bajar a 0 (cold starts en app financiera).
8. **Valida sintaxis antes de commit**: `python -m py_compile backend/*.py`.
9. **Añade tests offline** para lógica pura (`backend/tests/*_unit.py` se ejecutan siempre).
10. **Secretos**: nunca en el repo. Solo `.env.example` y Secret Manager / GitHub Secrets.

---

## 11. Checklist antes de commit

```bash
# Backend
cd backend
python -m py_compile server.py admin_routes.py options_math.py missing_apis.py \
  stock_data.py candle_patterns.py performance.py referrals.py realtime_alerts.py
pytest tests/ -q          # 10 unit deben pasar; integración se salta sin BACKEND_URL

# Frontend
cd ../frontend
npm run build             # debe terminar en exit 0
```
- [ ] Sintaxis OK (py_compile) · [ ] Tests unit verdes · [ ] Build frontend OK
- [ ] Claves i18n añadidas en todos los idiomas · [ ] Sin secretos en el diff
- [ ] `ESTADO_PROYECTO.md` actualizado (inventario/backlog/registro de sesiones)
