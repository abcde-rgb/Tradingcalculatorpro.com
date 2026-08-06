"""Trading plan: the user's own rules, versioned server-side.

Until now the plan lived in three places that never spoke to each other — a
`localStorage` blob in `SetupBuilder`, a printable form with blank lines, and a
set of circuit-breaker limits in `PreTradeProtocol` that were computed and then
thrown away. Meanwhile `performance.detect_errors` judged every trade against
three module-level constants, which means the "rule compliance" figure in the
analytics panel measured adherence to *the app's opinion*, not to the user's
plan. A scalper who deliberately runs 1:1 at a 65% hit rate got a `low_rr` error
on every single trade; someone who caps risk at 0.5% got no warning at 1.8%.

This module makes the plan the single source of truth for those thresholds:

  · One document per version, never overwritten. `plan_version` is stamped onto
    each trade when it is created and is immutable afterwards, so a rule change
    never retroactively rewrites the history it is meant to be judged against.
  · Exactly one `active` version per user; activating a new one archives the old.
  · From v2 onward a `change_reason` is required. Plans do not usually get
    abandoned, they get eroded one exception at a time, and a required sentence
    is the cheapest brake on that.
  · Changing the plan before the sample it declared is complete returns a
    WARNING, never a block (`cooldown_notice`). The user is an adult; the point
    is that the decision is recorded, not that it is forbidden.

Everything that computes is a pure function over dicts, so the rules are
testable without a database. The DB helpers at the bottom are the only async
part, and they use the Mongo-style shim API like the rest of the backend.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid

# ─── Vocabulary ───────────────────────────────────────────────────

STYLES = ("scalping", "day", "swing", "position")
CADENCES = ("weekly", "biweekly", "monthly")
STATUSES = ("draft", "active", "archived")

CADENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}

# Field limits. Free-text goes into a printed document and into the analytics
# payload, so it is bounded here rather than trusting the client.
MAX_REASON_LEN = 500
MAX_RULE_LEN = 300
MAX_RULES = 10
MAX_NAME_LEN = 120
MAX_MARKETS = 40
MAX_SESSIONS = 12

# Default sample a plan must accumulate before it is worth re-judging. 30 closed
# trades is the floor the education modules already teach; below it you are
# reading noise.
DEFAULT_MIN_SAMPLE = 30

# ─── Risk defaults ────────────────────────────────────────────────
# These reproduce the legacy module-level constants in `performance.py` EXACTLY.
# A user without a plan must get byte-identical errors to before this module
# existed, so these numbers are a compatibility contract, not a recommendation —
# `performance.DEFAULT_MIN_RR` and friends are the same values.
DEFAULT_RISK: Dict[str, Any] = {
    "max_risk_pct_per_trade": 2.0,
    "min_rr": 1.5,
    # Everything below has no legacy equivalent: the corresponding rule simply
    # did not exist. None means "the user did not declare this limit", and the
    # rule stays silent — never treat a missing limit as a limit of zero.
    "max_daily_loss_r": None,
    "max_weekly_loss_r": None,
    "max_consecutive_losses": None,
    "max_trades_per_day": None,
    "max_open_risk_r": None,
    "max_correlated_positions": None,
    "require_stop_loss": True,
    # Exposición máxima: cuántas veces el saldo de la cuenta puede llegar a
    # valer el nocional de una posición. Tiene default (10×) y no None, porque a
    # diferencia de los límites de arriba éste NO es opcional: sin él, un
    # apalancamiento alto sobre un tamaño grande no dispara ninguna regla. El
    # trader puede subirlo o bajarlo, no quitarlo.
    "max_exposure_multiple": 10.0,
}


# ─── Small helpers ────────────────────────────────────────────────

def _clean_str(value: Any, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _str_list(value: Any, *, limit: int, item_limit: int) -> List[str]:
    if not isinstance(value, (list, tuple)):
        return []
    out = []
    for item in value:
        s = _clean_str(item, item_limit)
        if s:
            out.append(s)
        if len(out) >= limit:
            break
    return out


def _pos_float(value: Any) -> Optional[float]:
    """A positive number, or None. Zero and negatives are not limits."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if f > 0 else None


def _pos_int(value: Any) -> Optional[int]:
    f = _pos_float(value)
    return int(f) if f is not None else None


def _parse_hhmm(value: Any) -> Optional[Tuple[int, int]]:
    """"09:30" → (9, 30). None when unparseable."""
    parts = str(value or "").split(":")
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    return h, m


def parse_dt(value: Any) -> Optional[datetime]:
    """ISO 8601 → aware UTC datetime. None when unparseable."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ─── Normalization ────────────────────────────────────────────────

def _normalize_sessions(raw: Any) -> List[Dict[str, Any]]:
    """Allowed trading windows, dropping anything unusable.

    A malformed window is dropped rather than defaulted: silently turning a
    broken "09:00-" into "all day" would make `outside_session` fire on trades
    that are perfectly within plan, and an error the user cannot explain is
    worse than a missing rule.
    """
    if not isinstance(raw, (list, tuple)):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw[:MAX_SESSIONS]:
        if not isinstance(item, dict):
            continue
        start, end = _parse_hhmm(item.get("start")), _parse_hhmm(item.get("end"))
        if not start or not end:
            continue
        days = [int(d) for d in (item.get("days") or []) if str(d).isdigit() and 1 <= int(d) <= 7]
        if not days:
            days = [1, 2, 3, 4, 5]
        out.append({
            "days": sorted(set(days)),
            "start": f"{start[0]:02d}:{start[1]:02d}",
            "end": f"{end[0]:02d}:{end[1]:02d}",
            "tz": _clean_str(item.get("tz"), 64) or "UTC",
        })
    return out


def _normalize_risk(raw: Any) -> Dict[str, Any]:
    """The block the rule engine consumes. Unset limits stay None."""
    src = raw if isinstance(raw, dict) else {}
    risk = dict(DEFAULT_RISK)

    # The two with legacy defaults keep them when omitted, so behaviour is
    # unchanged for a plan that says nothing about them.
    for key in ("max_risk_pct_per_trade", "min_rr", "max_exposure_multiple"):
        if key in src:
            got = _pos_float(src.get(key))
            if got is not None:
                risk[key] = got

    for key in ("max_daily_loss_r", "max_weekly_loss_r", "max_open_risk_r"):
        risk[key] = _pos_float(src.get(key))
    for key in ("max_consecutive_losses", "max_trades_per_day",
                "max_correlated_positions"):
        risk[key] = _pos_int(src.get(key))

    require_sl = src.get("require_stop_loss")
    risk["require_stop_loss"] = True if require_sl is None else bool(require_sl)
    return risk


def _normalize_management(raw: Any) -> Dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    partials = []
    for leg in (src.get("partials") or [])[:6]:
        if not isinstance(leg, dict):
            continue
        at_r, pct = _pos_float(leg.get("at_r")), _pos_float(leg.get("pct"))
        if at_r is not None and pct is not None:
            partials.append({"at_r": at_r, "pct": min(pct, 100.0)})
    return {
        "breakeven_at_r": _pos_float(src.get("breakeven_at_r")),
        "partials": partials,
        "trailing": _clean_str(src.get("trailing"), MAX_RULE_LEN) or None,
        "time_stop_bars": _pos_int(src.get("time_stop_bars")),
        "close_before_events": bool(src.get("close_before_events")),
    }


def _normalize_review(raw: Any) -> Dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    cadence = str(src.get("cadence") or "").lower()
    return {
        "cadence": cadence if cadence in CADENCES else "monthly",
        "min_sample_before_change": _pos_int(src.get("min_sample_before_change")) or DEFAULT_MIN_SAMPLE,
        "kill_criteria": _clean_str(src.get("kill_criteria"), MAX_RULE_LEN),
    }


def normalize_plan_payload(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clamp client input into the five stored sections.

    Never raises on bad input: unusable values fall back to a default or to
    None. The one thing the caller must still enforce is `change_reason` from
    v2 onward, which is a business rule rather than a shape problem.
    """
    src = raw if isinstance(raw, dict) else {}
    style = str(src.get("style") or "").lower()
    tf = src.get("timeframes") if isinstance(src.get("timeframes"), dict) else {}
    return {
        # 1. Identity
        "name": _clean_str(src.get("name"), MAX_NAME_LEN) or "Mi plan",
        "style": style if style in STYLES else "day",
        "markets": [m.upper() for m in _str_list(src.get("markets"), limit=MAX_MARKETS, item_limit=32)],
        "sessions": _normalize_sessions(src.get("sessions")),
        # 2. Setup
        "timeframes": {
            "context": _clean_str(tf.get("context"), 16),
            "entry": _clean_str(tf.get("entry"), 16),
        },
        "approaches": _str_list(src.get("approaches"), limit=20, item_limit=64),
        "tools": _str_list(src.get("tools"), limit=20, item_limit=64),
        "entry_rules": _str_list(src.get("entry_rules"), limit=MAX_RULES, item_limit=MAX_RULE_LEN),
        "invalidation": _clean_str(src.get("invalidation"), MAX_RULE_LEN),
        "no_trade_conditions": _str_list(src.get("no_trade_conditions"),
                                        limit=MAX_RULES, item_limit=MAX_RULE_LEN),
        # 3-5
        "risk": _normalize_risk(src.get("risk")),
        "management": _normalize_management(src.get("management")),
        "review": _normalize_review(src.get("review")),
    }


def plan_risk(plan: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """The effective risk block: the plan's values over the legacy defaults.

    Central so that `detect_errors` never has to reason about a partially filled
    plan, and so a plan stored before a new limit existed keeps working.
    """
    risk = dict(DEFAULT_RISK)
    if isinstance(plan, dict) and isinstance(plan.get("risk"), dict):
        for key, value in plan["risk"].items():
            if key in risk:
                risk[key] = value
    return risk


# ─── Session membership ───────────────────────────────────────────

def is_within_sessions(entry_dt: Optional[datetime],
                       sessions: Optional[List[Dict[str, Any]]]) -> Optional[bool]:
    """Is this entry inside one of the plan's windows?

    Returns None — not False — when the question cannot be answered: no windows
    declared, or an unparseable timestamp. The caller must not report an
    out-of-session violation it could not actually verify.

    Windows are evaluated in their own declared timezone, because that is how a
    trader thinks about a session ("the London open"), and a plan written in
    Europe/Zurich must not drift by an hour when the clocks change.
    """
    if not sessions or entry_dt is None:
        return None
    for window in sessions:
        start, end = _parse_hhmm(window.get("start")), _parse_hhmm(window.get("end"))
        if not start or not end:
            continue
        local = entry_dt
        tz_name = window.get("tz") or "UTC"
        try:
            from zoneinfo import ZoneInfo
            local = entry_dt.astimezone(ZoneInfo(tz_name))
        except Exception:  # noqa: BLE001 — unknown tz: fall back to UTC comparison
            local = entry_dt.astimezone(timezone.utc)
        if local.isoweekday() not in (window.get("days") or []):
            continue
        minutes = local.hour * 60 + local.minute
        s, e = start[0] * 60 + start[1], end[0] * 60 + end[1]
        # An end before the start means the window crosses midnight (a Sydney or
        # a crypto session), which is legal and must not silently never match.
        inside = s <= minutes <= e if s <= e else (minutes >= s or minutes <= e)
        if inside:
            return True
    return False


# ─── Versioning ───────────────────────────────────────────────────

def build_plan_doc(payload: Dict[str, Any], *, user_id: str, version: int,
                   status: str = "active", change_reason: str = "") -> Dict[str, Any]:
    """Assemble a storable plan document. `payload` must already be normalized."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "version": version,
        "status": status if status in STATUSES else "active",
        "created_at": now,
        "activated_at": now if status == "active" else None,
        "archived_at": None,
        "change_reason": _clean_str(change_reason, MAX_REASON_LEN),
        **payload,
    }


def cooldown_notice(active: Optional[Dict[str, Any]],
                    trades_under_active: int) -> Optional[Dict[str, Any]]:
    """Warn when the plan is being changed before its own sample is complete.

    Deliberately a notice and not a refusal. The plan declared how much evidence
    it wanted before being re-judged; changing it earlier is the user's call, and
    what matters is that the call is visible and recorded.
    """
    if not active:
        return None
    required = ((active.get("review") or {}).get("min_sample_before_change")
                or DEFAULT_MIN_SAMPLE)
    if trades_under_active >= required:
        return None
    return {
        "code": "cooldown",
        "message_key": "planCooldownWarning",
        "trades_under_plan": trades_under_active,
        "required": required,
        "missing": required - trades_under_active,
        "from_version": active.get("version"),
    }


def next_review_due(plan: Optional[Dict[str, Any]]) -> Optional[str]:
    """ISO date of the next scheduled review, from the plan's own cadence."""
    if not plan:
        return None
    anchor = parse_dt(plan.get("activated_at")) or parse_dt(plan.get("created_at"))
    if anchor is None:
        return None
    cadence = (plan.get("review") or {}).get("cadence") or "monthly"
    return (anchor + timedelta(days=CADENCE_DAYS.get(cadence, 30))).date().isoformat()


# ─── Compliance report ────────────────────────────────────────────

def _is_closed(trade: Dict[str, Any]) -> bool:
    return (trade.get("status") in ("closed", "sl_hit", "tp_hit")
            and trade.get("exit_price") is not None)


def compliance_report(trades: List[Dict[str, Any]],
                      plan: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Adherence to the ACTIVE plan version, costed.

    Pure over already-enriched trades (they carry `errors` and `pnl`), so the
    whole report is testable without a database.

    Two things make this a tool rather than a scoreboard:

    · `by_rule` is ordered by money, not by frequency. "You broke this 6 times"
      invites a shrug; "this cost you 412 €" does not, and the rule you break
      most is rarely the rule that costs most.
    · `adherence_vs_result` splits process from outcome. The dangerous cell is
      broke-the-plan-and-won: the market just paid for the indiscipline, and
      that is the one that gets repeated. It is reported even on a thin sample,
      because its shape is the lesson — but `sample_warning` says so plainly.
    """
    version = plan.get("version") if plan else None
    under_plan = [t for t in trades
                  if _is_closed(t) and (version is None or t.get("plan_version") == version)]
    n = len(under_plan)

    by_rule: Dict[str, Dict[str, Any]] = {}
    matrix = {
        "followed_won": {"n": 0, "pnl": 0.0},
        "followed_lost": {"n": 0, "pnl": 0.0},
        "broke_won": {"n": 0, "pnl": 0.0},
        "broke_lost": {"n": 0, "pnl": 0.0},
    }
    clean = 0

    for trade in under_plan:
        errors = trade.get("errors") or []
        pnl = float(trade.get("pnl") or 0)
        if not errors:
            clean += 1
        cell = ("followed" if not errors else "broke") + ("_won" if pnl > 0 else "_lost")
        matrix[cell]["n"] += 1
        matrix[cell]["pnl"] += pnl

        for err in errors:
            code = err.get("code")
            if not code:
                continue
            row = by_rule.setdefault(code, {
                "code": code,
                "count": 0,
                "pnl_impact": 0.0,
                "threshold": err.get("threshold"),
            })
            row["count"] += 1
            row["pnl_impact"] += pnl
            if row["threshold"] is None:
                row["threshold"] = err.get("threshold")

    for cell in matrix.values():
        cell["pnl"] = round(cell["pnl"], 2)
    rules = sorted(by_rule.values(), key=lambda r: r["pnl_impact"])
    for row in rules:
        row["pnl_impact"] = round(row["pnl_impact"], 2)

    required = ((plan.get("review") or {}).get("min_sample_before_change")
                if plan else DEFAULT_MIN_SAMPLE) or DEFAULT_MIN_SAMPLE

    return {
        "plan_version": version,
        "trades_under_plan": n,
        # Undefined with no trades, not "100% compliant" — an empty journal is
        # not a clean record.
        "compliance_rate": round(clean / n * 100, 1) if n else None,
        "by_rule": rules,
        "adherence_vs_result": matrix,
        "ready_for_review": n >= required,
        "min_sample_before_change": required,
        "next_review_due": next_review_due(plan),
        "sample_warning": n < required,
    }


# ─── Persistence (Mongo-style shim) ───────────────────────────────

async def get_active_plan(db, user_id: str) -> Optional[Dict[str, Any]]:
    """The user's active plan, or None. Called on hot paths — keep it one query."""
    plan = await db.trading_plans.find_one({"user_id": user_id, "status": "active"})
    if plan:
        plan.pop("_id", None)
    return plan


async def get_draft_plan(db, user_id: str) -> Optional[Dict[str, Any]]:
    plan = await db.trading_plans.find_one({"user_id": user_id, "status": "draft"})
    if plan:
        plan.pop("_id", None)
    return plan


async def list_plan_versions(db, user_id: str) -> List[Dict[str, Any]]:
    cursor = db.trading_plans.find({"user_id": user_id}).sort("version", -1)
    rows = await cursor.to_list()
    for row in rows:
        row.pop("_id", None)
    return rows


def next_version_number(versions: List[Dict[str, Any]]) -> int:
    """The number the next ACTIVATED version will take.

    Drafts are excluded on purpose. A draft is a work in progress, not a version
    of the plan: letting one occupy a number meant that saving a draft and then
    activating a first plan looked like a v2, which demanded a `change_reason`
    for a plan that had never governed a single trade.
    """
    real = [v.get("version") or 0 for v in versions if v.get("status") != "draft"]
    return max(real) + 1 if real else 1


async def count_trades_under_version(db, user_id: str, version: Optional[int]) -> int:
    """Closed trades stamped with a given plan version."""
    if version is None:
        return 0
    return await db.trades.count_documents({"user_id": user_id, "plan_version": version})


async def activate_plan(db, user_id: str, raw_payload: Dict[str, Any],
                        *, change_reason: str = "") -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    """Store a new version and make it the active one.

    Returns `(plan, warning)`. The warning is the cooldown notice when the
    previous version had not yet accumulated the sample it asked for; it never
    prevents the change.

    Raises ValueError when a change_reason is missing from v2 onward — the only
    hard requirement here, and the brake on a plan being eroded by silent edits.
    """
    active = await get_active_plan(db, user_id)
    versions = await list_plan_versions(db, user_id)
    next_version = next_version_number(versions)

    reason = _clean_str(change_reason, MAX_REASON_LEN)
    if next_version > 1 and not reason:
        raise ValueError("change_reason_required")

    warning = None
    if active:
        warning = cooldown_notice(
            active, await count_trades_under_version(db, user_id, active.get("version")))

    payload = normalize_plan_payload(raw_payload)
    doc = build_plan_doc(payload, user_id=user_id, version=next_version,
                        status="active", change_reason=reason)
    await db.trading_plans.insert_one(dict(doc))

    # Archive the previous active version AFTER the new one lands, so a failure
    # in between leaves the user with two active plans (recoverable) rather than
    # none (which would silently fall back to the app's global thresholds).
    if active:
        await db.trading_plans.update_one(
            {"id": active["id"]},
            {"$set": {"status": "archived",
                      "archived_at": datetime.now(timezone.utc).isoformat()}},
        )
    # A draft that has been activated is no longer a draft.
    draft = await get_draft_plan(db, user_id)
    if draft:
        await db.trading_plans.delete_one({"id": draft["id"]})

    doc.pop("_id", None)
    return doc, warning


async def save_draft(db, user_id: str, raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert the user's single draft. Never touches the active version."""
    payload = normalize_plan_payload(raw_payload)
    existing = await get_draft_plan(db, user_id)
    if existing:
        await db.trading_plans.update_one(
            {"id": existing["id"]},
            {"$set": {**payload,
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {**existing, **payload}
    active = await get_active_plan(db, user_id)
    versions = await list_plan_versions(db, user_id)
    # The number this draft WOULD take if activated — informative for the UI,
    # and it does not advance the counter because drafts are filtered out above.
    next_version = next_version_number(versions)
    doc = build_plan_doc(payload, user_id=user_id, version=next_version, status="draft")
    doc["based_on_version"] = active.get("version") if active else None
    await db.trading_plans.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc
