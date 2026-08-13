---
paths:
  - "backend/*.py"
  - "backend/**/*.py"
---

# Backend — el shim de BD y las listas que hay que tocar a la vez

## La BD sólo se toca por el shim

`server.py` expone una API estilo Motor/MongoDB sobre asyncpg + PostgreSQL (~750 líneas).
**Todos** los módulos la usan; **nunca escribas SQL directo.**

```python
user = await db.users.find_one({"email": email})
await db.trades.insert_one({"id": str(uuid.uuid4()), "user_id": uid, ...})
await db.users.update_one({"id": uid}, {"$set": {"is_premium": True}})
cursor = db.calculations.find({"user_id": uid}).sort("created_at", -1).limit(50)
docs = await cursor.to_list()
```

Los datos van como JSONB. La clase `Collection` traduce `$set`, `$inc`, `$push`, `$or`,
`$in`, `$regex`… a SQL paramétrico. Las tablas se crean al inicio con
`CREATE TABLE IF NOT EXISTS {name} (_key TEXT PRIMARY KEY, data JSONB NOT NULL)`.

⚠️ **El shim no tiene tests** (hueco G-17). Es la capa de la que depende todo el backend
y lo que bloquea partir `server.py`. Si tocas `Collection`, ve con cuidado extremo.

## El `$unset` corre DESPUÉS del `$set`

Por eso las claves a borrar en los dos `PUT` del diario salen de
`legacy_keys_to_unset(existing)` y no de `LEGACY_TRADE_KEYS` a secas: sobre un documento
canónico con `leverage`, la lista cruda lo habría borrado **en la misma escritura que lo
guardaba**.

## Una colección nueva se da de alta en CUATRO sitios — que hoy son uno

El shim **no autocrea tablas**: una colección que no esté en la lista `known` de
`server.py` falla en cuanto se consulta. Y una colección con `user_id` va además en
`delete_account`, en la purga por retención y en el export de `/auth/my-data`.

Eso fue el hueco G-15 (`trading_plans` no estaba en ninguna de las tres) y **ya está
cerrado en la causa**: las cuatro listas derivan de una sola tupla.

```
_USER_DATA_COLLECTIONS → _ALL_USER_COLLECTIONS → _EXPORTABLE_COLLECTIONS
```

**Añade la colección a `_USER_DATA_COLLECTIONS` y las tres rutas la heredan.**

Los artefactos de seguridad van aparte a propósito: se borran con la cuenta y **no se
exportan nunca** — mandarle sus tokens al usuario en un JSON no es portabilidad.
Verificado contra Postgres el 2026-08-07 (borrado y export).

## `user_states` NO caduca

Llevaba `expires_at` a 90 días y un comentario que prometía un borrado automático que
**nadie ejecutaba nunca**. Desde que ahí dentro viven los ajustes del usuario —incluidos
los setups escritos a mano—, hacer verdad esa promesa sería perder su trabajo. No la
reintroduzcas: es una fila por (usuario, `state_id`) con un puñado fijo de `state_id`, no
crece sola, y el RGPD ya está cubierto porque está en `_USER_DATA_COLLECTIONS`.

## I/O síncrono va en un hilo

Red, CPU, Stripe, yfinance, SendGrid → `await asyncio.to_thread(...)`. Meter HTTP
síncrono en un endpoint async bloquea el event loop entero (BUG-010).

## CORS incluye `PATCH`

Hay dos endpoints PATCH que usa `AdminPage`: `PATCH /admin/users/{id}` y
`PATCH /admin/feature-flags/{id}`. **No los quites de `allow_methods`.**

## Rate limiting (slowapi)

| Ruta | Límite |
|---|---|
| `POST /auth/register` | 3/hora |
| `POST /auth/login` | 10/minuto |
| `POST /auth/google` | 10/minuto |
| `POST /auth/refresh` | 30/minuto |
| Cálculos y datos de mercado | sin límite |

## `admin_routes.py` se importa tarde

Se carga de forma lazy en `startup_event`. Si falla la importación, el servidor arranca
igual (con log de error) pero **sin rutas admin**.
