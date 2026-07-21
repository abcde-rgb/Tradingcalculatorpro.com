"""
Tests offline de la RETENCIÓN de datos tras impago (server.py).

Corren siempre (sufijo _unit.py). No tocan red ni BD real: usan un doble de la
capa `db` en memoria que imita lo justo del shim (find/delete_many/update_one).
Verifican la política de purga: quién se purga y quién se conserva.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

# Modo dev antes de importar server (genera JWT_SECRET automáticamente; sin red/BD).
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server


# ── Doble de BD mínimo en memoria ──────────────────────────────────────
class _Coll:
    def __init__(self, rows=None):
        self.rows = rows or []

    def find(self, flt, proj=None):
        field, cond = next(iter(flt.items()))
        lt = cond["$lt"] if isinstance(cond, dict) and "$lt" in cond else None
        out = [r for r in self.rows
               if r.get(field) is not None and (lt is None or str(r[field]) < lt)]
        class _Cur:
            def __init__(self, data): self._d = data
            async def to_list(self, length=None): return list(self._d)
        return _Cur(out)

    async def delete_many(self, flt):
        uid = flt.get("user_id")
        before = len(self.rows)
        self.rows = [r for r in self.rows if r.get("user_id") != uid]
        return type("R", (), {"deleted_count": before - len(self.rows)})()

    async def update_one(self, flt, update):
        for r in self.rows:
            if all(r.get(k) == v for k, v in flt.items()):
                r.update(update.get("$set", {}))
                return
        self.rows.append({**flt, **update.get("$set", {})})


class _DB:
    def __init__(self, users, **colls):
        self.users = _Coll(users)
        self._colls = {name: _Coll(rows) for name, rows in colls.items()}

    def __getitem__(self, name):
        return self._colls.setdefault(name, _Coll())


NOW = datetime(2026, 6, 1, tzinfo=timezone.utc)     # "now" de la purga (cutoff = NOW-90d)
OLD = (NOW - timedelta(days=100)).isoformat()       # > 90d respecto a NOW
RECENT = (NOW - timedelta(days=30)).isoformat()     # < 90d respecto a NOW
# check_premium() usa el reloj REAL (no acepta `now`), así que la vigencia debe
# ser futura respecto a hoy de verdad, no respecto a NOW.
FUT = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()


def _run(db):
    return asyncio.run(server.purge_lapsed_user_data(db, now=NOW))


def test_lapsed_over_90d_is_purged():
    db = _DB(
        users=[{"id": "u1", "premium_lapsed_at": OLD, "is_premium": False}],
        trades=[{"id": "t1", "user_id": "u1"}, {"id": "t2", "user_id": "u1"}],
        calculations=[{"id": "c1", "user_id": "u1"}],
    )
    n = _run(db)
    assert n == 1
    assert db["trades"].rows == []
    assert db["calculations"].rows == []
    assert db.users.rows[0].get("data_purged_at")  # marcado


def test_lapsed_under_90d_is_kept():
    db = _DB(
        users=[{"id": "u1", "premium_lapsed_at": RECENT, "is_premium": False}],
        trades=[{"id": "t1", "user_id": "u1"}],
    )
    assert _run(db) == 0
    assert len(db["trades"].rows) == 1


def test_renewed_user_is_kept_even_with_old_lapse():
    # relapse viejo pero suscripción vigente → check_premium True → conservar
    db = _DB(
        users=[{"id": "u1", "premium_lapsed_at": OLD, "is_premium": True,
                "subscription_plan": "monthly", "subscription_end": FUT}],
        trades=[{"id": "t1", "user_id": "u1"}],
    )
    assert _run(db) == 0
    assert len(db["trades"].rows) == 1


def test_lifetime_is_never_purged():
    db = _DB(
        users=[{"id": "u1", "premium_lapsed_at": OLD, "subscription_plan": "lifetime",
                "is_premium": True}],
        trades=[{"id": "t1", "user_id": "u1"}],
    )
    assert _run(db) == 0
    assert len(db["trades"].rows) == 1


def test_silent_expiry_via_subscription_end_is_purged():
    # sin premium_lapsed_at pero subscription_end venció hace >90d → fallback
    db = _DB(
        users=[{"id": "u1", "subscription_end": OLD, "is_premium": False}],
        trades=[{"id": "t1", "user_id": "u1"}],
    )
    assert _run(db) == 1
    assert db["trades"].rows == []


def test_purge_is_idempotent():
    db = _DB(
        users=[{"id": "u1", "premium_lapsed_at": OLD, "is_premium": False}],
        trades=[{"id": "t1", "user_id": "u1"}],
    )
    assert _run(db) == 1
    assert _run(db) == 0  # ya marcado data_purged_at


def test_lapse_stamp_preserves_existing_clock():
    # no reinicia el reloj si ya había lapso
    assert server._lapse_stamp({"premium_lapsed_at": OLD}) == OLD
    fresh = server._lapse_stamp({})
    assert fresh and fresh != OLD
