"""Tests offline del Programa de Afiliados (lógica pura, sin BD ni red).

Cubre: cálculo por bloques de 1000 con suelo en 1000, exclusión de trials y
lifetime del recuento de bloques, bonus lifetime único (idempotente) y el
enmascarado de email para el panel del afiliado.
"""
from datetime import datetime, timedelta, timezone

import affiliate_program as ap

CFG = {"block_size": 1000, "block_reward_eur": 1000.0, "lifetime_bonus_eur": 50.0}


def _future():
    return (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()


def _past():
    return (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()


def _active(n):
    return [{"is_premium": True, "subscription_plan": "monthly",
             "subscription_status": "active", "subscription_end": _future()} for _ in range(n)]


def test_blocks_floor_and_step():
    # Suelo en 1000 y paso de 1000: 999->0, 1000->1000, 1999->1000, 2000->2000, 5000->5000
    for n, expected in [(0, 0), (999, 0), (1000, 1000), (1999, 1000), (2000, 2000), (5000, 5000)]:
        s = ap._summarize(_active(n), CFG)
        assert s["block_eur"] == expected, (n, s["block_eur"])
        assert s["blocks"] == n // 1000


def test_trials_do_not_count():
    trials = [{"is_premium": True, "subscription_plan": "monthly",
               "subscription_status": "trialing", "subscription_end": _future()} for _ in range(1500)]
    s = ap._summarize(trials, CFG)
    assert s["active_paying"] == 0
    assert s["block_eur"] == 0


def test_expired_subscription_does_not_count():
    expired = [{"is_premium": True, "subscription_plan": "monthly",
                "subscription_status": "active", "subscription_end": _past()} for _ in range(1000)]
    s = ap._summarize(expired, CFG)
    assert s["active_paying"] == 0


def test_lifetime_excluded_from_blocks_and_gets_bonus():
    life = [{"is_premium": True, "subscription_plan": "lifetime"} for _ in range(3)]
    s = ap._summarize(_active(1000) + life, CFG)
    assert s["active_paying"] == 1000          # lifetime NO entra en bloques
    assert s["blocks"] == 1
    assert s["lifetime_unbonused_count"] == 3
    assert s["estimated_month_eur"] == 1000 + 3 * 50   # 1 bloque + 3 bonus


def test_lifetime_bonus_is_idempotent():
    life = [{"is_premium": True, "subscription_plan": "lifetime",
             "affiliate_lifetime_bonus_paid_at": "2026-01-01T00:00:00Z"}]
    s = ap._summarize(life, CFG)
    assert s["lifetime_unbonused_count"] == 0   # ya bonificado → no vuelve a pagar
    assert s["estimated_month_eur"] == 0


def test_reward_override_per_affiliate():
    s = ap._summarize(_active(2000), CFG, reward_override=1500.0)
    assert s["block_eur"] == 2 * 1500.0


def test_free_registered_do_not_count():
    free = [{"is_premium": False} for _ in range(1000)]
    s = ap._summarize(free, CFG)
    assert s["registered"] == 1000
    assert s["active_paying"] == 0
    assert s["estimated_month_eur"] == 0


def test_is_paying_member_requires_paid_not_trial():
    # de pago activo o lifetime → sí; gratis o en prueba → no
    assert ap._is_paying_member({"is_premium": True, "subscription_plan": "monthly",
                                 "subscription_status": "active", "subscription_end": _future()}) is True
    assert ap._is_paying_member({"is_premium": True, "subscription_plan": "lifetime"}) is True
    assert ap._is_paying_member({"is_premium": True, "subscription_plan": "monthly",
                                 "subscription_status": "trialing", "subscription_end": _future()}) is False
    assert ap._is_paying_member({"is_premium": False}) is False
    assert ap._is_paying_member({"is_premium": True, "subscription_plan": "monthly",
                                 "subscription_status": "active", "subscription_end": _past()}) is False


def test_mask_email_hides_pii():
    m = ap._mask_email("juanperez@gmail.com")
    assert m.startswith("j") and m.endswith("@gmail.com") and "***" in m
    assert "juanperez" not in m
    assert ap._mask_email("") == "—"
    assert ap._mask_email(None) == "—"
