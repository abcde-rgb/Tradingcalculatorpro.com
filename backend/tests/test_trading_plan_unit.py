"""Trading plan: versioning, plan-aware rules and the compliance report.

Covers the acceptance criteria in the spec (§3.7 items 1-5 and 8). The whole
computing surface of `trading_plan` is pure over dicts, and `detect_errors` takes
the plan as an argument, so none of this needs a database or a live server.

The criterion that matters most is #3 — a user WITHOUT a plan must get byte-for-
byte the same errors as before plans existed. Everything else here is new
behaviour; that one is a promise not to break the existing product.
"""
from datetime import datetime, timedelta, timezone

import pytest

import performance
from performance import detect_errors
from trading_plan import (
    DEFAULT_MIN_SAMPLE,
    DEFAULT_RISK,
    build_plan_doc,
    compliance_report,
    cooldown_notice,
    is_within_sessions,
    next_review_due,
    normalize_plan_payload,
    plan_risk,
)


def make_plan(**risk_overrides):
    """An active v1 plan with only the given risk limits declared."""
    payload = normalize_plan_payload({
        "name": "Plan de prueba",
        "style": "day",
        "risk": risk_overrides,
        "review": {"cadence": "weekly", "min_sample_before_change": 30},
    })
    return build_plan_doc(payload, user_id="u1", version=1)


def trade(**kw):
    """A clean long trade: 1:2 R:R, 1% risk. Overridable per test."""
    base = {
        "symbol": "EURUSD",
        "side": "long",
        "status": "closed",
        "entry_price": 100.0,
        "sl": 99.0,
        "tp": 102.0,
        "exit_price": 102.0,
        "quantity": 100.0,
        "account_balance": 10000.0,
        "entry_date": "2026-07-15T10:00:00+00:00",
        "exit_date": "2026-07-15T11:00:00+00:00",
        "pnl": 200.0,
        "r_multiple": 2.0,
    }
    base.update(kw)
    return base


def codes(errors):
    return {e["code"] for e in errors}


# ─── §3.7.3 — backward compatibility (the important one) ──────────

def test_no_plan_reproduces_the_legacy_thresholds():
    """Without a plan, the module defaults apply — unchanged behaviour."""
    assert DEFAULT_RISK["min_rr"] == performance.DEFAULT_MIN_RR == 1.5
    assert DEFAULT_RISK["max_risk_pct_per_trade"] == performance.DEFAULT_MAX_RISK_PCT == 2.0
    assert DEFAULT_RISK["require_stop_loss"] is True


def test_no_plan_still_flags_a_thin_rr():
    """R:R 1.2 against the 1.5 default fires, exactly as before."""
    t = trade(tp=101.2, exit_price=101.2)
    assert "low_rr" in codes(detect_errors(t))


def test_no_plan_still_flags_a_missing_stop():
    assert "no_sl" in codes(detect_errors(trade(sl=None)))


def test_no_plan_never_fires_a_plan_only_rule():
    """The five plan-only rules cannot fire without a plan to declare them."""
    t = trade(symbol="NVDA", entry_date="2026-07-15T03:00:00+00:00")
    plan_only = {"outside_session", "unlisted_market", "over_daily_limit",
                 "over_trade_count", "traded_after_consecutive_losses"}
    assert codes(detect_errors(t, prev_trades=[trade(), trade()])) & plan_only == set()


def test_no_plan_errors_carry_no_plan_version():
    """Nothing claims a plan judged the trade when none did."""
    for err in detect_errors(trade(sl=None)):
        assert "plan_version" not in err


# ─── §3.7.1 — the user's own min_rr wins ──────────────────────────

def test_declared_1to1_does_not_produce_low_rr():
    """A scalper who declares 1:1 is running a valid system, not making a mistake.

    This is the headline bug: `MIN_RR_THRESHOLD = 1.5` gave this trader a
    `low_rr` error on every single trade, which is what made the compliance
    figure measure the app's opinion instead of their plan.
    """
    plan = make_plan(min_rr=1.0)
    t = trade(tp=101.2, exit_price=101.2)            # R:R 1.2
    assert "low_rr" not in codes(detect_errors(t, plan=plan))
    # Same trade, no plan: still flagged.
    assert "low_rr" in codes(detect_errors(t))


def test_rr_below_the_declared_minimum_still_fires_with_the_plans_number():
    plan = make_plan(min_rr=3.0)
    errs = [e for e in detect_errors(trade(), plan=plan) if e["code"] == "low_rr"]
    assert errs, "R:R 2.0 is below the declared 3.0"
    assert errs[0]["threshold"] == "3.0"
    assert errs[0]["value"] == "2.0"
    assert errs[0]["plan_version"] == 1


# ─── §3.7.2 — a stricter risk cap is honoured ─────────────────────

def test_stricter_risk_cap_flags_what_the_global_default_allowed():
    """0.5% declared: a 1.2% trade is oversize even though the old ceiling was 2%."""
    plan = make_plan(max_risk_pct_per_trade=0.5)
    t = trade(quantity=120.0)                        # 1.0 × 120 / 10000 = 1.2%
    errs = [e for e in detect_errors(t, plan=plan) if e["code"] == "oversize"]
    assert errs
    assert errs[0]["threshold"] == "0.5"
    assert errs[0]["value"] == "1.2"
    # Without the plan the same trade passes — that was the reported gap.
    assert "oversize" not in codes(detect_errors(t))


def test_require_stop_loss_false_silences_no_sl():
    """Some real systems carry no per-trade stop; the plan may say so.

    Flagging those forever taught the user to ignore the whole error list.
    """
    plan = make_plan(require_stop_loss=False)
    assert "no_sl" not in codes(detect_errors(trade(sl=None), plan=plan))
    assert "no_sl" in codes(detect_errors(trade(sl=None)))


# ─── Plan-only rules ──────────────────────────────────────────────

def test_unlisted_market():
    plan_payload = normalize_plan_payload({"markets": ["EURUSD", "ES35"], "risk": {}})
    plan = build_plan_doc(plan_payload, user_id="u1", version=1)
    assert "unlisted_market" in codes(detect_errors(trade(symbol="NVDA"), plan=plan))
    assert "unlisted_market" not in codes(detect_errors(trade(symbol="EURUSD"), plan=plan))


def test_outside_session():
    payload = normalize_plan_payload({
        "sessions": [{"days": [1, 2, 3, 4, 5], "start": "09:00",
                      "end": "12:00", "tz": "UTC"}],
        "risk": {},
    })
    plan = build_plan_doc(payload, user_id="u1", version=1)
    inside = trade(entry_date="2026-07-15T10:30:00+00:00")     # Wednesday 10:30
    outside = trade(entry_date="2026-07-15T15:30:00+00:00")    # Wednesday 15:30
    assert "outside_session" not in codes(detect_errors(inside, plan=plan))
    assert "outside_session" in codes(detect_errors(outside, plan=plan))


def test_outside_session_respects_the_declared_timezone():
    """13:00 UTC is 15:00 in Zurich — outside a 09:00-12:00 Zurich window."""
    payload = normalize_plan_payload({
        "sessions": [{"days": [1, 2, 3, 4, 5], "start": "09:00",
                      "end": "12:00", "tz": "Europe/Zurich"}],
        "risk": {},
    })
    plan = build_plan_doc(payload, user_id="u1", version=1)
    # 09:00 UTC = 11:00 Zurich → inside. 13:00 UTC = 15:00 Zurich → outside.
    assert "outside_session" not in codes(
        detect_errors(trade(entry_date="2026-07-15T09:00:00+00:00"), plan=plan))
    assert "outside_session" in codes(
        detect_errors(trade(entry_date="2026-07-15T13:00:00+00:00"), plan=plan))


def test_session_rule_is_silent_when_it_cannot_be_verified():
    """No windows declared, or no timestamp: the rule must not guess."""
    plan = make_plan()
    assert is_within_sessions(datetime.now(timezone.utc), []) is None
    assert "outside_session" not in codes(detect_errors(trade(), plan=plan))
    payload = normalize_plan_payload({
        "sessions": [{"days": [1], "start": "09:00", "end": "12:00", "tz": "UTC"}],
        "risk": {},
    })
    with_windows = build_plan_doc(payload, user_id="u1", version=1)
    assert "outside_session" not in codes(
        detect_errors(trade(entry_date=None), plan=with_windows))


def test_session_window_crossing_midnight():
    """A 22:00-04:00 window is legal and must not silently never match."""
    payload = normalize_plan_payload({
        "sessions": [{"days": [1, 2, 3, 4, 5, 6, 7], "start": "22:00",
                      "end": "04:00", "tz": "UTC"}],
        "risk": {},
    })
    plan = build_plan_doc(payload, user_id="u1", version=1)
    assert "outside_session" not in codes(
        detect_errors(trade(entry_date="2026-07-15T23:30:00+00:00"), plan=plan))
    assert "outside_session" not in codes(
        detect_errors(trade(entry_date="2026-07-15T02:30:00+00:00"), plan=plan))
    assert "outside_session" in codes(
        detect_errors(trade(entry_date="2026-07-15T12:00:00+00:00"), plan=plan))


def test_over_trade_count():
    plan = make_plan(max_trades_per_day=3)
    day = "2026-07-15T"
    prev = [trade(entry_date=f"{day}{h:02d}:00:00+00:00") for h in (8, 9, 10)]
    fourth = trade(entry_date=f"{day}11:00:00+00:00")
    errs = [e for e in detect_errors(fourth, plan=plan, prev_trades=prev)
            if e["code"] == "over_trade_count"]
    assert errs and errs[0]["threshold"] == "3" and errs[0]["value"] == "4"
    # The third of the day is still within plan.
    assert "over_trade_count" not in codes(
        detect_errors(prev[2], plan=plan, prev_trades=prev[:2]))


def test_over_trade_count_only_counts_the_same_day():
    plan = make_plan(max_trades_per_day=2)
    prev = [trade(entry_date="2026-07-14T09:00:00+00:00"),
            trade(entry_date="2026-07-13T09:00:00+00:00")]
    assert "over_trade_count" not in codes(
        detect_errors(trade(entry_date="2026-07-15T09:00:00+00:00"),
                      plan=plan, prev_trades=prev))


def test_over_daily_limit():
    """Opening with the day's R loss already at the plan's limit."""
    plan = make_plan(max_daily_loss_r=2.0)
    prev = [trade(entry_date="2026-07-15T08:00:00+00:00", pnl=-100.0, r_multiple=-1.0),
            trade(entry_date="2026-07-15T09:00:00+00:00", pnl=-100.0, r_multiple=-1.0)]
    errs = [e for e in detect_errors(trade(entry_date="2026-07-15T10:00:00+00:00"),
                                     plan=plan, prev_trades=prev)
            if e["code"] == "over_daily_limit"]
    assert errs and errs[0]["value"] == "-2.0"
    # One loss in: still inside the limit.
    assert "over_daily_limit" not in codes(
        detect_errors(trade(entry_date="2026-07-15T10:00:00+00:00"),
                      plan=plan, prev_trades=prev[:1]))


def test_traded_after_consecutive_losses():
    plan = make_plan(max_consecutive_losses=2)
    prev = [trade(entry_date="2026-07-15T08:00:00+00:00", pnl=-100.0, r_multiple=-1.0),
            trade(entry_date="2026-07-15T09:00:00+00:00", pnl=-100.0, r_multiple=-1.0)]
    assert "traded_after_consecutive_losses" in codes(
        detect_errors(trade(entry_date="2026-07-15T10:00:00+00:00"),
                      plan=plan, prev_trades=prev))
    # A win in between resets the streak.
    mixed = prev[:1] + [trade(entry_date="2026-07-15T09:00:00+00:00",
                              pnl=150.0, r_multiple=1.5)]
    assert "traded_after_consecutive_losses" not in codes(
        detect_errors(trade(entry_date="2026-07-15T10:00:00+00:00"),
                      plan=plan, prev_trades=mixed))


def test_undeclared_limits_stay_silent():
    """An unset limit is not a limit of zero."""
    plan = make_plan()          # declares nothing beyond the two defaults
    prev = [trade(entry_date="2026-07-15T08:00:00+00:00", pnl=-500.0, r_multiple=-5.0)
            for _ in range(9)]
    got = codes(detect_errors(trade(entry_date="2026-07-15T10:00:00+00:00"),
                              plan=plan, prev_trades=prev))
    assert {"over_daily_limit", "over_trade_count",
            "traded_after_consecutive_losses"} & got == set()


# ─── Normalization ────────────────────────────────────────────────

def test_zero_and_negative_limits_are_not_limits():
    risk = normalize_plan_payload({"risk": {"max_daily_loss_r": 0,
                                            "max_trades_per_day": -3}})["risk"]
    assert risk["max_daily_loss_r"] is None
    assert risk["max_trades_per_day"] is None


def test_omitted_thresholds_keep_the_legacy_defaults():
    risk = normalize_plan_payload({"risk": {}})["risk"]
    assert risk["min_rr"] == 1.5
    assert risk["max_risk_pct_per_trade"] == 2.0


def test_malformed_session_is_dropped_not_defaulted():
    """A broken window must not silently become "all day"."""
    sessions = normalize_plan_payload({
        "sessions": [{"start": "09:00", "end": "nonsense"},
                     {"start": "10:00", "end": "12:00", "tz": "UTC"}],
    })["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["start"] == "10:00"


def test_unknown_style_falls_back_and_free_text_is_clamped():
    payload = normalize_plan_payload({
        "style": "hodl",
        "entry_rules": [f"regla {i}" for i in range(50)],
        "invalidation": "x" * 999,
    })
    assert payload["style"] == "day"
    assert len(payload["entry_rules"]) == 10
    assert len(payload["invalidation"]) == 300


def test_plan_risk_survives_a_plan_stored_before_a_limit_existed():
    """An old document missing new keys must still produce a full risk block."""
    risk = plan_risk({"version": 1, "risk": {"min_rr": 1.0}})
    assert risk["min_rr"] == 1.0
    assert risk["max_risk_pct_per_trade"] == 2.0      # default filled in
    assert risk["require_stop_loss"] is True
    assert set(risk) == set(DEFAULT_RISK)


# ─── §3.7.5 — the cooldown rule warns, never blocks ───────────────

def test_cooldown_warns_below_the_declared_sample():
    active = make_plan()
    notice = cooldown_notice(active, trades_under_active=12)
    assert notice["code"] == "cooldown"
    assert notice["missing"] == 18
    assert notice["required"] == 30
    assert notice["from_version"] == 1


def test_cooldown_silent_once_the_sample_is_complete():
    assert cooldown_notice(make_plan(), trades_under_active=30) is None


def test_no_cooldown_for_a_first_plan():
    assert cooldown_notice(None, 0) is None


def test_next_review_due_follows_the_declared_cadence():
    plan = make_plan()                     # weekly
    anchor = datetime.fromisoformat(plan["activated_at"])
    assert next_review_due(plan) == (anchor + timedelta(days=7)).date().isoformat()


# ─── §3.4 — the compliance report ─────────────────────────────────

def _closed(pnl, errors, version=1):
    return {"status": "closed", "exit_price": 1.0, "pnl": pnl,
            "plan_version": version, "errors": errors}


def test_by_rule_is_ordered_by_cost_not_by_frequency():
    """The rule you break most is rarely the rule that costs most."""
    low_rr = {"code": "low_rr", "threshold": "1.5"}
    oversize = {"code": "oversize", "threshold": "1.0"}
    trades = (
        [_closed(-10.0, [low_rr]) for _ in range(6)]     # frequent, cheap: -60
        + [_closed(-400.0, [oversize])]                  # rare, expensive: -400
    )
    report = compliance_report(trades, make_plan())
    assert [r["code"] for r in report["by_rule"]] == ["oversize", "low_rr"]
    assert report["by_rule"][0]["pnl_impact"] == -400.0
    assert report["by_rule"][1]["count"] == 6
    assert report["by_rule"][0]["threshold"] == "1.0"


def test_adherence_matrix_separates_process_from_result():
    err = [{"code": "low_rr"}]
    trades = [
        _closed(100.0, []), _closed(200.0, []),        # followed, won
        _closed(-50.0, []),                            # followed, lost
        _closed(80.0, err),                            # broke, won ← dangerous
        _closed(-300.0, err), _closed(-100.0, err),    # broke, lost
    ]
    m = compliance_report(trades, make_plan())["adherence_vs_result"]
    assert m["followed_won"] == {"n": 2, "pnl": 300.0}
    assert m["followed_lost"] == {"n": 1, "pnl": -50.0}
    assert m["broke_won"] == {"n": 1, "pnl": 80.0}
    assert m["broke_lost"] == {"n": 2, "pnl": -400.0}


def test_compliance_counts_only_the_active_version():
    """§3.7.4 — trades keep the version that governed them."""
    trades = [_closed(100.0, [], version=1), _closed(-50.0, [{"code": "low_rr"}], version=1),
              _closed(-999.0, [{"code": "oversize"}], version=2)]
    plan = build_plan_doc(normalize_plan_payload({"risk": {}}), user_id="u1", version=2)
    report = compliance_report(trades, plan)
    assert report["trades_under_plan"] == 1
    assert report["plan_version"] == 2
    assert [r["code"] for r in report["by_rule"]] == ["oversize"]


def test_compliance_rate_is_none_on_an_empty_journal():
    """An empty journal is not a clean record."""
    report = compliance_report([], make_plan())
    assert report["compliance_rate"] is None
    assert report["trades_under_plan"] == 0
    assert report["ready_for_review"] is False


def test_ready_for_review_tracks_the_declared_sample():
    plan = make_plan()
    assert compliance_report([_closed(1.0, [])] * 29, plan)["ready_for_review"] is False
    full = compliance_report([_closed(1.0, [])] * 30, plan)
    assert full["ready_for_review"] is True
    assert full["sample_warning"] is False
    assert full["compliance_rate"] == 100.0


def test_default_min_sample_is_the_documented_one():
    assert DEFAULT_MIN_SAMPLE == 30
    assert normalize_plan_payload({})["review"]["min_sample_before_change"] == 30
