"""Versioning of the trading plan: activation, archiving and the cooldown notice.

Offline (`_unit.py` suffix): uses an in-memory double of the `db` shim, following
the same pattern as `test_retention_unit.py`. Only the handful of Collection
methods `trading_plan` actually calls are implemented.

Covers §3.7.4 and §3.7.5 of the spec: activating a new version archives the
previous one, old trades keep the version that governed them, and changing the
plan before its declared sample is complete warns without blocking.
"""
import asyncio
import uuid

import pytest

from trading_plan import (
    activate_plan,
    get_active_plan,
    get_draft_plan,
    list_plan_versions,
    save_draft,
)


# ── Doble de BD mínimo en memoria ──────────────────────────────────────
class _Coll:
    """The subset of the shim's Collection that trading_plan uses."""

    def __init__(self, rows=None):
        self.rows = list(rows or [])

    @staticmethod
    def _match(row, flt):
        return all(row.get(k) == v for k, v in flt.items())

    async def find_one(self, flt, projection=None):
        for row in self.rows:
            if self._match(row, flt):
                return dict(row)
        return None

    def find(self, flt=None, projection=None):
        out = [dict(r) for r in self.rows if self._match(r, flt or {})]

        class _Cur:
            def __init__(self, data):
                self._d = data

            def sort(self, key, direction=1):
                self._d.sort(key=lambda r: r.get(key) or 0, reverse=direction < 0)
                return self

            async def to_list(self, length=None):
                return list(self._d)

        return _Cur(out)

    async def insert_one(self, document):
        self.rows.append(dict(document))
        return type("R", (), {"inserted_id": document.get("id")})()

    async def update_one(self, flt, update, upsert=False):
        for row in self.rows:
            if self._match(row, flt):
                row.update(update.get("$set", {}))
                return type("R", (), {"modified_count": 1})()
        return type("R", (), {"modified_count": 0})()

    async def delete_one(self, flt):
        for i, row in enumerate(self.rows):
            if self._match(row, flt):
                del self.rows[i]
                return type("R", (), {"deleted_count": 1})()
        return type("R", (), {"deleted_count": 0})()

    async def count_documents(self, flt):
        return sum(1 for r in self.rows if self._match(r, flt))


class _DB:
    def __init__(self, trades=None):
        self.trading_plans = _Coll()
        self.trades = _Coll(trades)


UID = "user-1"


def _payload(**over):
    base = {
        "name": "Plan base",
        "style": "day",
        "markets": ["EURUSD"],
        "risk": {"min_rr": 1.5, "max_risk_pct_per_trade": 1.0},
        "review": {"cadence": "monthly", "min_sample_before_change": 30},
    }
    base.update(over)
    return base


def _closed_trade(version):
    return {"id": str(uuid.uuid4()), "user_id": UID, "plan_version": version,
            "status": "closed", "exit_price": 1.0, "pnl": 10.0}


# ─── v1 ───────────────────────────────────────────────────────────

def test_first_plan_is_v1_and_active_without_a_reason():
    db = _DB()
    plan, warning = asyncio.run(activate_plan(db, UID, _payload()))
    assert plan["version"] == 1
    assert plan["status"] == "active"
    assert plan["activated_at"] is not None
    assert warning is None, "there is no previous version to cool down from"


def test_a_second_version_requires_a_reason():
    """From v2 a reason is mandatory — the brake on silent erosion."""
    db = _DB()
    asyncio.run(activate_plan(db, UID, _payload()))
    with pytest.raises(ValueError, match="change_reason_required"):
        asyncio.run(activate_plan(db, UID, _payload(name="Plan v2")))


def test_a_blank_reason_does_not_count():
    db = _DB()
    asyncio.run(activate_plan(db, UID, _payload()))
    with pytest.raises(ValueError, match="change_reason_required"):
        asyncio.run(activate_plan(db, UID, _payload(), change_reason="   "))


# ─── §3.7.4 — activation archives, history is preserved ───────────

def test_activating_v2_archives_v1():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    v2, _ = asyncio.run(activate_plan(
        db, UID, _payload(name="Plan v2", risk={"min_rr": 1.0}),
        change_reason="El 1.5 no encajaba con el scalping"))

    assert v2["version"] == 2
    active = asyncio.run(get_active_plan(db, UID))
    assert active["version"] == 2
    assert active["risk"]["min_rr"] == 1.0

    versions = asyncio.run(list_plan_versions(db, UID))
    assert [v["version"] for v in versions] == [2, 1]
    archived = next(v for v in versions if v["version"] == 1)
    assert archived["status"] == "archived"
    assert archived["archived_at"] is not None


def test_only_one_version_is_ever_active():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    asyncio.run(activate_plan(db, UID, _payload(), change_reason="segunda"))
    asyncio.run(activate_plan(db, UID, _payload(), change_reason="tercera"))
    versions = asyncio.run(list_plan_versions(db, UID))
    assert sum(1 for v in versions if v["status"] == "active") == 1
    assert len(versions) == 3


def test_old_trades_keep_their_own_version():
    """A rule change must not retroactively re-judge closed history."""
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    asyncio.run(activate_plan(db, UID, _payload(), change_reason="cambio"))
    assert all(t["plan_version"] == 1 for t in db.trades.rows)
    assert await_count(db, 1) == 30
    assert await_count(db, 2) == 0


def await_count(db, version):
    return asyncio.run(db.trades.count_documents(
        {"user_id": UID, "plan_version": version}))


def test_the_reason_is_stored_on_the_version_it_explains():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    reason = "Subo el stop tras 40 operaciones: la MAE del p80 era 0,8R"
    v2, _ = asyncio.run(activate_plan(db, UID, _payload(), change_reason=reason))
    assert v2["change_reason"] == reason
    assert asyncio.run(get_active_plan(db, UID))["change_reason"] == reason


def test_the_reason_is_clamped():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    v2, _ = asyncio.run(activate_plan(db, UID, _payload(), change_reason="x" * 900))
    assert len(v2["change_reason"]) == 500


# ─── §3.7.5 — the cooldown warns, never blocks ────────────────────

def test_changing_early_warns_but_still_activates():
    db = _DB(trades=[_closed_trade(1) for _ in range(11)])   # 11 of the 30 asked for
    asyncio.run(activate_plan(db, UID, _payload()))
    v2, warning = asyncio.run(activate_plan(
        db, UID, _payload(), change_reason="me impaciento"))

    assert warning is not None
    assert warning["code"] == "cooldown"
    assert warning["trades_under_plan"] == 11
    assert warning["missing"] == 19
    # ...and the change went through anyway. The user is an adult.
    assert v2["version"] == 2
    assert asyncio.run(get_active_plan(db, UID))["version"] == 2


def test_no_warning_once_the_declared_sample_is_complete():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload()))
    _, warning = asyncio.run(activate_plan(db, UID, _payload(),
                                           change_reason="con muestra suficiente"))
    assert warning is None


def test_cooldown_respects_a_custom_sample_size():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload(
        review={"cadence": "monthly", "min_sample_before_change": 50})))
    _, warning = asyncio.run(activate_plan(db, UID, _payload(),
                                           change_reason="cambio"))
    assert warning is not None and warning["required"] == 50 and warning["missing"] == 20


# ─── Drafts ───────────────────────────────────────────────────────

def test_a_draft_does_not_govern_anything():
    db = _DB()
    asyncio.run(save_draft(db, UID, _payload(name="Borrador")))
    assert asyncio.run(get_active_plan(db, UID)) is None
    assert asyncio.run(get_draft_plan(db, UID))["name"] == "Borrador"


def test_saving_a_draft_twice_updates_the_same_document():
    db = _DB()
    asyncio.run(save_draft(db, UID, _payload(name="Primero")))
    asyncio.run(save_draft(db, UID, _payload(name="Segundo")))
    drafts = [r for r in db.trading_plans.rows if r["status"] == "draft"]
    assert len(drafts) == 1
    assert drafts[0]["name"] == "Segundo"


def test_a_draft_does_not_disturb_the_active_version():
    db = _DB(trades=[_closed_trade(1) for _ in range(30)])
    asyncio.run(activate_plan(db, UID, _payload(name="Activo")))
    asyncio.run(save_draft(db, UID, _payload(name="Borrador")))
    active = asyncio.run(get_active_plan(db, UID))
    assert active["name"] == "Activo" and active["version"] == 1


def test_activating_consumes_the_draft():
    """Otherwise a stale draft reopens the wizard forever."""
    db = _DB()
    asyncio.run(save_draft(db, UID, _payload(name="Borrador")))
    asyncio.run(activate_plan(db, UID, _payload(name="Definitivo")))
    assert asyncio.run(get_draft_plan(db, UID)) is None
    assert asyncio.run(get_active_plan(db, UID))["name"] == "Definitivo"


# ─── Isolation between users ──────────────────────────────────────

def test_plans_are_per_user():
    db = _DB()
    asyncio.run(activate_plan(db, UID, _payload(name="De user-1")))
    asyncio.run(activate_plan(db, "user-2", _payload(name="De user-2")))
    assert asyncio.run(get_active_plan(db, UID))["name"] == "De user-1"
    assert asyncio.run(get_active_plan(db, "user-2"))["name"] == "De user-2"
    # Each starts its own numbering at 1.
    assert asyncio.run(get_active_plan(db, "user-2"))["version"] == 1
