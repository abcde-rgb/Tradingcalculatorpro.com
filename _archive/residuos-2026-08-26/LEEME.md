# Residuos retirados el 2026-08-26 (hueco G-31)

Esto no es limpieza estética. Cada uno de estos ficheros **daba instrucciones
falsas** a quien lo abriera:

| Qué | Por qué estorbaba |
|---|---|
| `patches/server_fixes.patch` | Parche manual de mayo que habla de `MONGO_URL` — la base de datos que se descartó. Aplicarlo sobre el código de hoy no tiene sentido. |
| `FIXES_README.md` | Manda integrar un `fixes.py` que no existe en el repositorio. |
| `ADMIN_INTEGRATION.md` | Describe una integración que ya está hecha (`admin_routes.py` se carga en `startup_event`). Quien lo siga repite pasos aplicados. |
| `memory/PRD.md` | Documento de producto del andamiaje original de Emergent. |
| `monitoring/` · `packaging/twa-manifest.json` | Configuración de un empaquetado y una monitorización que nunca se usaron. |
| `check.sh` | Verificador anterior a `scripts/`, con una lista de comprobaciones que ya no coincide con la de CI. Tener dos «scripts de comprobar» que dicen cosas distintas es peor que tener uno. |

Se conservan en `_archive/` en vez de borrarse porque tienen valor histórico
—explican de dónde viene el proyecto—, pero **`_archive/` no se importa nunca**
y nada de aquí dentro describe el estado actual del código.
