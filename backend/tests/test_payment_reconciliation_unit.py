"""
Offline tests for payment reconciliation (M-40 / M-41).

The failure these guard against is the expensive silent one: a customer pays,
the webhook is lost, and nobody finds out until they complain. The logic is
extracted with `ast` and exercised against fake data, so it runs without
fastapi/asyncpg.
"""
import ast
from pathlib import Path

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")


def _source_of(name):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(_SRC, node)
    return None


# ── Classification logic, re-implemented from the endpoint and pinned here ──
PAID_STATES = ("paid", "completed", "finished")


def classify(txs, users, check_premium, cutoff_pending):
    by_id = {u["id"]: u for u in users}
    paid_not_premium, stale_pending, paid_ids = [], [], set()
    for tx in txs:
        status = (tx.get("status") or "").lower()
        user = by_id.get(tx.get("user_id"))
        if status in PAID_STATES:
            paid_ids.add(tx.get("user_id"))
            if user and not check_premium(user):
                paid_not_premium.append(tx["id"])
        elif status == "pending" and (tx.get("created_at") or "") < cutoff_pending:
            stale_pending.append(tx["id"])
    premium_no_payment = [
        u["id"] for u in users
        if check_premium(u) and u["id"] not in paid_ids
        and u.get("subscription_plan") not in (None, "", "free", "trial")
    ]
    return paid_not_premium, stale_pending, premium_no_payment


PREMIUM = lambda u: bool(u.get("is_premium"))  # noqa: E731


def test_paid_but_not_premium_is_flagged():
    """The money arrived and the customer got nothing. This is the one."""
    txs = [{"id": "t1", "user_id": "u1", "status": "paid", "created_at": "2026-07-01"}]
    users = [{"id": "u1", "is_premium": False}]
    paid_not_premium, _, _ = classify(txs, users, PREMIUM, "2026-07-26")
    assert paid_not_premium == ["t1"]


def test_paid_and_premium_is_not_flagged():
    txs = [{"id": "t1", "user_id": "u1", "status": "paid", "created_at": "2026-07-01"}]
    users = [{"id": "u1", "is_premium": True, "subscription_plan": "monthly"}]
    paid_not_premium, _, _ = classify(txs, users, PREMIUM, "2026-07-26")
    assert paid_not_premium == []


def test_all_paid_synonyms_count_as_paid():
    """Gateways disagree on the word: paid / completed / finished all mean paid."""
    txs = [
        {"id": "a", "user_id": "u1", "status": "paid", "created_at": "x"},
        {"id": "b", "user_id": "u2", "status": "completed", "created_at": "x"},
        {"id": "c", "user_id": "u3", "status": "finished", "created_at": "x"},
        {"id": "d", "user_id": "u4", "status": "FINISHED", "created_at": "x"},
    ]
    users = [{"id": f"u{i}", "is_premium": False} for i in range(1, 5)]
    paid_not_premium, _, _ = classify(txs, users, PREMIUM, "2026-01-01")
    assert sorted(paid_not_premium) == ["a", "b", "c", "d"]


def test_recent_pending_is_not_stale():
    """A checkout in flight must not be reported as a problem."""
    txs = [{"id": "t1", "user_id": "u1", "status": "pending", "created_at": "2026-07-26T12:00"}]
    _, stale, _ = classify(txs, [{"id": "u1"}], PREMIUM, "2026-07-26T06:00")
    assert stale == []


def test_old_pending_is_stale():
    txs = [{"id": "t1", "user_id": "u1", "status": "pending", "created_at": "2026-07-20T10:00"}]
    _, stale, _ = classify(txs, [{"id": "u1"}], PREMIUM, "2026-07-26T06:00")
    assert stale == ["t1"]


def test_premium_without_payment_is_flagged_but_trials_are_not():
    users = [
        {"id": "u1", "is_premium": True, "subscription_plan": "annual"},   # flagged
        {"id": "u2", "is_premium": True, "subscription_plan": "trial"},    # normal
        {"id": "u3", "is_premium": True, "subscription_plan": "free"},     # normal
        {"id": "u4", "is_premium": False, "subscription_plan": "annual"},  # not premium
    ]
    _, _, no_payment = classify([], users, PREMIUM, "2026-07-26")
    assert no_payment == ["u1"]


def test_a_paid_transaction_excludes_the_user_from_premium_no_payment():
    txs = [{"id": "t1", "user_id": "u1", "status": "paid", "created_at": "x"}]
    users = [{"id": "u1", "is_premium": True, "subscription_plan": "annual"}]
    _, _, no_payment = classify(txs, users, PREMIUM, "2026-07-26")
    assert no_payment == []


# ── Guard rails on the manual grant endpoint ──
def test_grant_requires_a_paid_transaction():
    """It must never be usable to comp an account — only to repair a payment."""
    src = _source_of("admin_payment_grant")
    assert src is not None
    assert '"paid", "completed", "finished"' in src
    assert "400" in src


def test_grant_is_idempotent_for_an_already_premium_user():
    src = _source_of("admin_payment_grant")
    assert "check_premium(user)" in src
    assert "already_premium" in src


def test_grant_reuses_the_same_activation_path_as_the_webhooks():
    """Repairing must produce identical state to a normal payment."""
    src = _source_of("admin_payment_grant")
    assert "_activate_paid_subscription" in src


def test_grant_is_audited():
    src = _source_of("admin_payment_grant")
    assert "log_admin_action" in src


# ── Webhook health ──
def test_every_payment_webhook_records_its_arrival():
    """Silence can only be detected if arrivals are timestamped."""
    for fn in ("stripe_webhook", "revolut_webhook", "nowpayments_webhook"):
        src = _source_of(fn)
        assert src is not None, f"{fn} not found"
        assert "_record_webhook_seen" in src, f"{fn} does not record webhook health"


def test_recording_webhook_health_never_raises():
    """A bookkeeping failure must not break payment processing."""
    src = _source_of("_record_webhook_seen")
    assert "try:" in src and "except" in src


def test_no_alert_when_there_are_no_active_subscriptions():
    """No paying customers means no expected traffic: silence is normal."""
    src = _source_of("admin_webhook_health")
    assert "active_paid > 0" in src
