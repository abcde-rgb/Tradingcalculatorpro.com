# Integrar admin_routes.py en server.py

## Pasos (edición mínima en server.py)

### 1. Añadir el import al inicio de server.py

```python
from admin_routes import build_admin_router
```

### 2. Registrar el router ANTES de `app.include_router(api_router)`

Busca en server.py la línea:
```python
app.include_router(api_router)
```

Y justo ANTES añade:
```python
# Registrar rutas de admin
api_router.include_router(
    build_admin_router(db, require_admin, SUBSCRIPTION_PLANS),
    prefix="/admin",
    tags=["admin"],
)
```

---

## Endpoints disponibles tras integrar

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/metrics` | Métricas globales (users, MRR, new 30d...) |
| GET | `/api/admin/users` | Lista filtrable (q, plan, provider, is_admin) |
| GET | `/api/admin/users.csv` | Export CSV sin passwords |
| POST | `/api/admin/promote` | `{email, is_admin: true/false}` — dar/quitar admin |
| POST | `/api/admin/set-plan` | `{email, plan_id, days?}` — asignar plan manual |

---

## Por qué faltaba `/admin/promote`

El `AdminPage.jsx` del frontend llamaba a `POST /api/admin/promote` con:
```json
{ "email": "user@example.com", "is_admin": true }
```

Pero ese endpoint no existía en `server.py`. El botón Shield/ShieldOff
nunca hacía efecto porque la petición fallaba con 404 silencioso.

Ahora `admin_routes.py` implementa el endpoint completo con:
- Protección: admin no puede quitarse el rol a sí mismo
- Refresco inmediato del estado en MongoDB
- Logging de acción para auditoría

---

## Problema de datos que no se actualizan

El `AdminPage.jsx` llama a `loadAll()` después de cada acción (promote,
refresh button), pero los datos no se refrescaban porque:

1. Los endpoints `/admin/metrics` y `/admin/users` tienen lógica incompleta
   en server.py (no filtran correctamente por `q`, `plan`, `provider`).
2. `/admin/promote` no existía, la promesa fallaba y el `.catch` era genérico.

Con `admin_routes.py` todos los filtros están implementados y el refresco
funcionará correctamente tras cada acción.

---

## Seguridad

- Todos los endpoints usan `require_admin` — solo usuarios con `is_admin=True` tienen acceso.
- El CSV **nunca devuelve el hash de password** (campo excluido en la proyección MongoDB).
- El promote tiene protección anti-self-demotion.
- Los filtros usan `$regex` case-insensitive, nunca interpolación directa.
