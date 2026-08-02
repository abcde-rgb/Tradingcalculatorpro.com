# Archivo — tests obsoletos

Estos dos ficheros estaban en la **raíz del repositorio** y eran trampas para
cualquiera que retomara el proyecto:

| Fichero | Por qué no sirve |
|---|---|
| `backend_test_security.py` | Hace `sys.exit(1)` nada más arrancar. Usaba **MongoDB (motor)** y un puerto que ya no existe. |
| `backend_test.py` | Misma época: apunta a la arquitectura anterior (Mongo) y a URLs muertas de Emergent. |

La base de datos del proyecto es **PostgreSQL** desde hace tiempo, accedida por
el shim compatible con Mongo de `backend/server.py`.

**Los tests reales viven en [`backend/tests/`](../backend/tests/)** y se ejecutan
con `pytest tests/ -q` desde `backend/`. Los `*_unit.py` corren siempre offline;
los de integración se saltan solos si no hay `BACKEND_URL` apuntando a un backend vivo.

Se conservan aquí, y no se borran, solo por si alguna aserción suelta resultara
útil como referencia histórica. **No los ejecutes.**
