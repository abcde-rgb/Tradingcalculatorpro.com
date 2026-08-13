#!/usr/bin/env python3
"""Migra los documentos del diario legado (camelCase) al esquema canónico.

## Por qué existe

`POST /journal/trades` y `POST /performance/trades` escribían en la MISMA
colección `db.trades` con esquemas distintos, y ninguno filtraba por esquema al
leer. Un documento camelCase llegaba a `compute_trade_pnl`, que busca
`entry_price`, no lo encontraba, y devolvía `pnl = 0.0`. Como `perf_update_trade`
hacía `{"$set": enriched}`, ese cero **se persistía** al primer edit y el importe
original se perdía (BUG-039).

El código ya traduce al vuelo (`normalize_trade_schema` dentro de
`compute_trade_pnl`), así que la lectura es correcta desde el despliegue. Este
script existe para dejar **un solo esquema almacenado**: mientras queden claves
camelCase en la base, cualquier consulta futura escrita sin pasar por el
traductor vuelve a leer 0.

## Garantías

- **Idempotente**: pasarlo dos veces no cambia nada la segunda vez.
- **No destructivo por defecto**: sin `--apply` sólo informa (dry-run).
- **Copia de seguridad** de cada documento tocado en `trades_migration_backup`
  antes de escribir, con `--apply`. Restaurable con `--rollback`.
- **Verifica el P&L**: si el importe recalculado no coincide con el guardado,
  el documento se marca para revisión manual y **no se toca**.

## Uso

    python migrate_trades_schema.py                 # dry-run, no escribe
    python migrate_trades_schema.py --apply         # migra
    python migrate_trades_schema.py --rollback      # deshace desde el backup

Necesita `DATABASE_URL` en el entorno, igual que el servidor.
"""
import argparse
import asyncio
import os
import sys
from typing import Any, Dict, List

# El shim de BD vive en server.py; importarlo levanta la app pero no sirve nada.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "migration-only")

from performance import (  # noqa: E402
    LEGACY_TRADE_KEYS,
    compute_trade_pnl,
    is_legacy_trade,
    normalize_trade_schema,
)

BACKUP_COLLECTION = "trades_migration_backup"
# Tolerancia al comparar importes: los documentos legados guardaban el P&L ya
# redondeado a 2 decimales, así que exigir igualdad exacta marcaría como
# sospechoso un céntimo de redondeo que no lo es.
PNL_TOLERANCE = 0.011


def classify(doc: Dict[str, Any]) -> str:
    """`skip` (ya canónico), `ok` (migrable) o `review` (el P&L no cuadra)."""
    if not is_legacy_trade(doc):
        return "skip"
    stored_pnl = doc.get("pnl")
    if stored_pnl in (None, ""):
        # Operación abierta o sin P&L guardado: nada que contrastar, y la
        # traducción de campos es puramente mecánica.
        return "ok"
    recomputed = compute_trade_pnl(doc).get("pnl")
    if recomputed is None:
        return "review"
    return "ok" if abs(float(recomputed) - float(stored_pnl)) <= PNL_TOLERANCE else "review"


async def run(apply: bool) -> int:
    import server  # noqa: PLC0415 — importar aquí para no pagarlo en --help

    db = server.db
    await db.init_pool(server._DATABASE_URL)
    # La tabla de backup puede no existir todavía: el shim no autocrea.
    await db.create_all_tables()

    docs: List[Dict[str, Any]] = await db.trades.find({}, {"_id": 0}).to_list(100000)
    buckets = {"skip": [], "ok": [], "review": []}
    for d in docs:
        buckets[classify(d)].append(d)

    print(f"Documentos en db.trades      : {len(docs)}")
    print(f"  ya canónicos (sin tocar)   : {len(buckets['skip'])}")
    print(f"  legados, migrables         : {len(buckets['ok'])}")
    print(f"  legados, revisión manual   : {len(buckets['review'])}")

    for d in buckets["review"]:
        stored = d.get("pnl")
        recomputed = compute_trade_pnl(d).get("pnl")
        print(f"    ⚠️  id={d.get('id')} symbol={d.get('symbol')} "
              f"pnl guardado={stored} recalculado={recomputed}")

    if not buckets["ok"]:
        print("\nNada que migrar.")
        return 0

    if not apply:
        print("\n(dry-run — no se ha escrito nada. Repite con --apply)")
        return 0

    migrated = 0
    for d in buckets["ok"]:
        # Copia íntegra antes de tocar nada. `_key` propio para que el backup no
        # colisione con el id del trade si se migra dos veces.
        await db.trades_migration_backup.insert_one(
            {"id": f"bak-{d.get('id')}", "trade_id": d.get("id"), "doc": d}
        )
        canonical = normalize_trade_schema(d)
        await db.trades.update_one(
            {"id": d["id"], "user_id": d["user_id"]},
            {
                "$set": canonical,
                # `$set` no borra: sin esto las claves camelCase sobreviven al
                # lado de las canónicas y el choque de esquemas persiste.
                "$unset": {k: "" for k in LEGACY_TRADE_KEYS if k in d},
            },
        )
        migrated += 1

    print(f"\n✅ {migrated} documentos migrados. Copia en `{BACKUP_COLLECTION}`.")
    if buckets["review"]:
        print(f"⚠️  {len(buckets['review'])} sin tocar — revísalos a mano.")
    return 0


async def rollback() -> int:
    import server  # noqa: PLC0415

    db = server.db
    await db.init_pool(server._DATABASE_URL)
    # La tabla de backup puede no existir todavía: el shim no autocrea.
    await db.create_all_tables()
    backups = await db.trades_migration_backup.find({}, {"_id": 0}).to_list(100000)
    if not backups:
        print("No hay copia de seguridad: nada que deshacer.")
        return 0
    for b in backups:
        original = b["doc"]
        await db.trades.update_one(
            {"id": original["id"], "user_id": original["user_id"]},
            {"$set": original},
        )
    print(f"↩️  {len(backups)} documentos restaurados desde `{BACKUP_COLLECTION}`.")
    print("La colección de backup NO se borra: hazlo tú cuando lo hayas validado.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="escribe (por defecto: dry-run)")
    ap.add_argument("--rollback", action="store_true", help="restaura desde el backup")
    args = ap.parse_args()

    if not os.environ.get("DATABASE_URL"):
        print("ERROR: falta DATABASE_URL en el entorno.", file=sys.stderr)
        return 2
    return asyncio.run(rollback() if args.rollback else run(args.apply))


if __name__ == "__main__":
    raise SystemExit(main())
