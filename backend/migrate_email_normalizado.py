#!/usr/bin/env python3
"""Normaliza a minúsculas los emails ya almacenados en `db.users`.

## Por qué existe

La autorización de este backend se apoya en la cadena del email:
`_ADMIN_EMAILS`, `_FREE_ACCESS_EMAILS` y la atribución de referidos comparan
`user["email"].lower()`. El registro, en cambio, guardaba lo que llegase en el
cuerpo de la petición y comprobaba duplicados con igualdad EXACTA.

Con `ADMIN_EMAILS=owner@example.com`, registrar `Owner@Example.com` no colisiona
con la cuenta real, crea una SEGUNDA fila, y esa fila pasa `require_admin` en
cuanto el guardián la baja a minúsculas. Es una escalada a administrador desde
un registro público, y la misma grieta abría el muro de pago vía
`_FREE_ACCESS_EMAILS`.

`normalize_email()` en `server.py` cierra la entrada: todo email que llega por
una petición se canoniza antes de tocar la base, tanto para buscar como para
escribir. Este script cierra la otra mitad — lo que ya está guardado.

**Es obligatorio, no opcional.** Desde que el login busca por el email
normalizado, una fila guardada como `Foo@Bar.com` deja de poder iniciar sesión
hasta que se migre.

## Garantías

- **Idempotente**: pasarlo dos veces no cambia nada la segunda vez.
- **No destructivo por defecto**: sin `--apply` sólo informa (dry-run).
- **Copia de seguridad** de cada documento tocado en `users_email_migration_backup`
  antes de escribir. Restaurable con `--rollback`.
- **Nunca fusiona cuentas.** Si al normalizar dos filas colisionan (el ataque ya
  ocurrido, o dos altas legítimas con distinta caja), NINGUNA de las dos se
  toca: se listan para decisión manual. Fusionar cuentas con datos, pagos y
  suscripciones distintas no es algo que un script deba decidir solo.
- **Señala las colisiones con `_ADMIN_EMAILS`** aparte y en rojo: si aparece
  una, es que la escalada se llegó a explotar y hay que revocar esa cuenta.

## Uso

    python migrate_email_normalizado.py             # dry-run, no escribe
    python migrate_email_normalizado.py --apply     # migra
    python migrate_email_normalizado.py --rollback  # deshace desde el backup

Necesita `DATABASE_URL` en el entorno, igual que el servidor.
"""
import argparse
import asyncio
import os
import sys
from collections import defaultdict
from typing import Any, Dict, List

# El shim de BD vive en server.py; importarlo levanta la app pero no sirve nada.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "migration-only")

BACKUP = "users_email_migration_backup"


def _norm(email: Any) -> str:
    return (email or "").strip().lower()


async def _cargar(db) -> List[Dict[str, Any]]:
    return await db.users.find({}, {"_id": 0, "id": 1, "email": 1}).to_list(100000)


async def analizar(db) -> Dict[str, Any]:
    """Clasifica cada fila: ya canónica, migrable, o en colisión."""
    filas = await _cargar(db)
    por_canonico: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for f in filas:
        por_canonico[_norm(f.get("email"))].append(f)

    migrables: List[Dict[str, Any]] = []
    colisiones: List[List[Dict[str, Any]]] = []
    intactas = 0

    for canonico, grupo in por_canonico.items():
        if not canonico:
            continue
        if len(grupo) > 1:
            colisiones.append(grupo)
            continue
        fila = grupo[0]
        if fila.get("email") == canonico:
            intactas += 1
        else:
            migrables.append({"id": fila["id"], "de": fila["email"], "a": canonico})

    admins = {
        e.strip().lower()
        for e in os.environ.get("ADMIN_EMAILS", "").split(",")
        if e.strip()
    }
    colisiones_admin = [g for g in colisiones if _norm(g[0].get("email")) in admins]

    return {
        "total": len(filas),
        "intactas": intactas,
        "migrables": migrables,
        "colisiones": colisiones,
        "colisiones_admin": colisiones_admin,
    }


async def aplicar(db, migrables: List[Dict[str, Any]]) -> int:
    tocados = 0
    for m in migrables:
        original = await db.users.find_one({"id": m["id"]}, {"_id": 0})
        if not original:
            continue
        await db[BACKUP].insert_one({
            "id": m["id"],
            "email_original": original.get("email"),
            "documento": original,
        })
        await db.users.update_one({"id": m["id"]}, {"$set": {"email": m["a"]}})
        tocados += 1
    return tocados


async def revertir(db) -> int:
    copias = await db[BACKUP].find({}, {"_id": 0}).to_list(100000)
    devueltos = 0
    for c in copias:
        await db.users.update_one(
            {"id": c["id"]}, {"$set": {"email": c["email_original"]}}
        )
        devueltos += 1
    return devueltos


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true", help="escribe los cambios")
    ap.add_argument("--rollback", action="store_true", help="deshace desde el backup")
    args = ap.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("✗ falta DATABASE_URL", file=sys.stderr)
        return 2

    import server  # noqa: E402  (levanta el shim, no sirve nada)

    await server.db.init_pool(url)
    try:
        if args.rollback:
            n = await revertir(server.db)
            print(f"↩️  {n} emails devueltos a su valor original")
            return 0

        info = await analizar(server.db)
        print(f"usuarios: {info['total']} · ya canónicos: {info['intactas']} · "
              f"a migrar: {len(info['migrables'])} · en colisión: {len(info['colisiones'])}")

        for m in info["migrables"][:20]:
            print(f"   · {m['de']}  →  {m['a']}")
        if len(info["migrables"]) > 20:
            print(f"   … y {len(info['migrables']) - 20} más")

        if info["colisiones"]:
            print("\n⚠️  COLISIONES — no se toca ninguna de estas filas:")
            for grupo in info["colisiones"]:
                caras = ", ".join(repr(f.get("email")) for f in grupo)
                print(f"   · {_norm(grupo[0].get('email'))}: {caras}")
            print("   Decide a mano cuál conservar. Fusionar cuentas con pagos y")
            print("   suscripciones distintas no lo puede decidir un script.")

        if info["colisiones_admin"]:
            print("\n🔴 UNA COLISIÓN CAE SOBRE UN EMAIL DE ADMIN_EMAILS.")
            print("   Eso significa que la escalada se llegó a explotar: hay una")
            print("   cuenta que no es la tuya pasando require_admin. Revócala y")
            print("   revisa el audit log antes de seguir.")

        if not args.apply:
            print("\n(dry-run: no se ha escrito nada; usa --apply)")
            return 0

        n = await aplicar(server.db, info["migrables"])
        print(f"\n✅ {n} emails normalizados (copia en {BACKUP})")
        return 1 if info["colisiones"] else 0
    finally:
        if server.db._pool:
            await server.db._pool.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
