"""Performance analytics — trade journal, metrics, error detection.

Module responsibilities:
1. CRUD on user trades
2. Aggregate analytics: 25+ trader-grade metrics
3. Auto-detection of common trader mistakes (no SL, low R:R, oversize, etc.)
4. Insight generation (best/worst day, setup ranking, etc.)

All public coroutine helpers in this module accept `user` and `db` as args,
so the FastAPI route handlers in `server.py` stay thin.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import math
import statistics
import uuid

# ─── Configuration ────────────────────────────────────────────────
# Education-aligned thresholds. These appear inside auto-error messages
# and reference what the Education Center already teaches.
MIN_RR_THRESHOLD = 1.5            # min recommended R:R (per Education Center)
MAX_RISK_PCT_THRESHOLD = 2.0       # max risk per trade (% of account)
EARLY_CLOSE_THRESHOLD = 0.5        # closed before reaching 50% of TP
REVENGE_TRADE_WINDOW_MIN = 30      # min between losing trade and next entry


# ─── Math helpers ─────────────────────────────────────────────────

def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b else default


def _compute_max_drawdown(equity_curve: List[float]) -> Tuple[float, float]:
    """Return (max_drawdown_dollars, max_drawdown_pct)."""
    if not equity_curve:
        return 0.0, 0.0
    peak = equity_curve[0]
    max_dd_dollars = 0.0
    max_dd_pct = 0.0
    for v in equity_curve:
        if v > peak:
            peak = v
        dd_dollars = peak - v
        dd_pct = _safe_div(dd_dollars, peak, 0) * 100
        if dd_dollars > max_dd_dollars:
            max_dd_dollars = dd_dollars
        if dd_pct > max_dd_pct:
            max_dd_pct = dd_pct
    return round(max_dd_dollars, 2), round(max_dd_pct, 2)


def _compute_sharpe(returns: List[float]) -> float:
    """Sharpe ratio assuming returns are per-trade. Annualization here
    would require timestamps; we provide the raw per-trade Sharpe."""
    if len(returns) < 2:
        return 0.0
    mean = statistics.mean(returns)
    sd = statistics.pstdev(returns)
    return round(_safe_div(mean, sd, 0), 2)


def _compute_sortino(returns: List[float]) -> float:
    if len(returns) < 2:
        return 0.0
    negatives = [r for r in returns if r < 0]
    if not negatives:
        return 0.0
    mean = statistics.mean(returns)
    downside_dev = math.sqrt(sum(r ** 2 for r in negatives) / len(negatives))
    return round(_safe_div(mean, downside_dev, 0), 2)


# ─── Trade computation ────────────────────────────────────────────

def compute_trade_pnl(trade: dict) -> dict:
    """Return a copy of `trade` with computed P&L fields.

    Fills: pnl, pnl_pct, r_multiple. Required input fields:
      side ('long'|'short'), entry_price, exit_price, quantity, sl,
      account_balance (optional, for pnl_pct), fees (optional).
    For OPEN trades (no exit_price), pnl/r_multiple are 0.
    """
    out = {**trade}
    side = trade.get("side", "long")
    entry = float(trade.get("entry_price") or 0)
    exit_p = trade.get("exit_price")
    qty = float(trade.get("quantity") or 0)
    sl = trade.get("sl")
    fees = float(trade.get("fees") or 0)
    balance = float(trade.get("account_balance") or 0)
    # Tamaño de contrato: 1 en spot; 100 en opciones sobre acciones (el frontend
    # lo envía). Multiplica el nominal de precios×cantidad en P&L y en el riesgo.
    mult = float(trade.get("multiplier") or 1)

    if exit_p is None or entry == 0 or qty == 0:
        out["pnl"] = 0.0
        out["pnl_pct"] = 0.0
        out["r_multiple"] = 0.0
        return out

    exit_p = float(exit_p)
    if side == "long":
        gross = (exit_p - entry) * qty * mult
    else:
        gross = (entry - exit_p) * qty * mult
    pnl = gross - fees
    out["pnl"] = round(pnl, 2)
    out["pnl_pct"] = round(_safe_div(pnl, balance, 0) * 100, 2) if balance else 0.0

    # R-multiple: P&L divided by initial risk per share/contract.
    if sl is not None:
        risk_per_unit = abs(entry - float(sl))
        risk_total = risk_per_unit * qty * mult
        out["r_multiple"] = round(_safe_div(pnl, risk_total, 0), 2)
    else:
        out["r_multiple"] = 0.0
    return out


# ─── Error detection ──────────────────────────────────────────────

def detect_errors(
    trade: dict,
    *,
    prev_trades: Optional[List[dict]] = None,
) -> List[Dict[str, str]]:
    """Run a set of rules against a trade and return detected mistakes.

    Each error is {code, severity, message_key} so the frontend can localize.
    """
    errors: List[Dict[str, str]] = []
    side = trade.get("side", "long")
    entry = trade.get("entry_price")
    exit_p = trade.get("exit_price")
    sl = trade.get("sl")
    tp = trade.get("tp")
    qty = trade.get("quantity")
    balance = trade.get("account_balance")
    status = trade.get("status", "closed")

    # Rule 1: NO STOP LOSS — cardinal sin
    if sl is None or sl == 0:
        errors.append({
            "code": "no_sl",
            "severity": "critical",
            "message_key": "errNoSL",
        })

    # Rule 2: R:R below threshold
    if entry and sl and tp:
        try:
            risk = abs(float(entry) - float(sl))
            reward = abs(float(tp) - float(entry))
            rr = _safe_div(reward, risk, 0)
            if rr < MIN_RR_THRESHOLD and risk > 0:
                errors.append({
                    "code": "low_rr",
                    "severity": "high",
                    "message_key": "errLowRR",
                    "value": str(round(rr, 2)),
                })
        except (TypeError, ValueError):
            pass

    # Rule 3: Position size too large (risk > MAX_RISK_PCT of balance)
    if entry and sl and qty and balance:
        try:
            risk_amount = abs(float(entry) - float(sl)) * float(qty)
            risk_pct = _safe_div(risk_amount, float(balance), 0) * 100
            if risk_pct > MAX_RISK_PCT_THRESHOLD:
                errors.append({
                    "code": "oversize",
                    "severity": "high",
                    "message_key": "errOversize",
                    "value": str(round(risk_pct, 2)),
                })
        except (TypeError, ValueError):
            pass

    # Rule 4: Closed early (manual close before reaching ~50% of TP)
    if status == "closed" and entry and tp and exit_p:
        try:
            tp_distance = abs(float(tp) - float(entry))
            actual_distance = abs(float(exit_p) - float(entry))
            same_dir = (
                (side == "long" and float(exit_p) > float(entry)) or
                (side == "short" and float(exit_p) < float(entry))
            )
            ratio = _safe_div(actual_distance, tp_distance, 0)
            if same_dir and 0 < ratio < EARLY_CLOSE_THRESHOLD:
                errors.append({
                    "code": "closed_early",
                    "severity": "medium",
                    "message_key": "errClosedEarly",
                    "value": f"{int(ratio * 100)}%",
                })
        except (TypeError, ValueError):
            pass

    # Rule 5: SL violated — exit_price worse than SL on a closed trade
    # (means user moved/removed SL or slipped past it).
    if status not in ("sl_hit",) and entry and sl and exit_p and qty:
        try:
            sl_f, exit_f, entry_f = float(sl), float(exit_p), float(entry)
            if side == "long" and exit_f < sl_f and exit_f < entry_f:
                errors.append({
                    "code": "sl_violated",
                    "severity": "critical",
                    "message_key": "errSLViolated",
                })
            elif side == "short" and exit_f > sl_f and exit_f > entry_f:
                errors.append({
                    "code": "sl_violated",
                    "severity": "critical",
                    "message_key": "errSLViolated",
                })
        except (TypeError, ValueError):
            pass

    # Rule 6: Revenge trade — entered within REVENGE_TRADE_WINDOW_MIN of a loss
    if prev_trades and trade.get("entry_date"):
        try:
            entry_dt = datetime.fromisoformat(trade["entry_date"].replace("Z", "+00:00"))
            recent_losses = [
                t for t in prev_trades
                if t.get("pnl", 0) < 0 and t.get("exit_date")
            ]
            for prev in recent_losses[-3:]:
                prev_exit = datetime.fromisoformat(prev["exit_date"].replace("Z", "+00:00"))
                gap_min = (entry_dt - prev_exit).total_seconds() / 60
                if 0 < gap_min < REVENGE_TRADE_WINDOW_MIN:
                    errors.append({
                        "code": "revenge_trade",
                        "severity": "high",
                        "message_key": "errRevengeTrade",
                        "value": str(int(gap_min)),
                    })
                    break
        except (ValueError, TypeError):
            pass

    return errors


# ─── Behavioral bias detection (account-level) ────────────────────

def _parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def detect_behavioral_biases(trades: List[dict]) -> List[Dict[str, Any]]:
    """Synthesize account-level behavioral biases from the trade history.

    Higher-level than per-trade `detect_errors`: looks at patterns across many
    trades (disposition effect, revenge trading, overtrading, stop discipline).
    Returns a list of {code, severity, title_key, detail_key, ...numbers} sorted
    by severity. Empty when there isn't enough data or no bias stands out.
    """
    closed = [t for t in trades if t.get("status") in ("closed", "sl_hit", "tp_hit")
              and t.get("exit_price") is not None]
    n = len(closed)
    biases: List[Dict[str, Any]] = []
    if n < 3:
        return biases

    # 1) Disposition effect — holding losers longer than winners
    win_durs, loss_durs = [], []
    for t in closed:
        ed, xd = _parse_dt(t.get("entry_date")), _parse_dt(t.get("exit_date"))
        if ed and xd and xd >= ed:
            (win_durs if float(t.get("pnl") or 0) > 0 else loss_durs).append((xd - ed).total_seconds() / 60)
    if win_durs and loss_durs:
        avg_win = sum(win_durs) / len(win_durs)
        avg_loss = sum(loss_durs) / len(loss_durs)
        if avg_win > 0 and avg_loss > avg_win * 1.5:
            biases.append({
                "code": "disposition_effect", "severity": "high",
                "title_key": "biasDisposition", "detail_key": "biasDispositionDetail",
                "ratio": round(avg_loss / avg_win, 1),
            })

    # 2) Revenge trading — reuse the per-trade flags already attached
    revenge_trades = [t for t in closed
                      if any(e.get("code") == "revenge_trade" for e in (t.get("errors") or []))]
    if revenge_trades:
        biases.append({
            "code": "revenge_trade", "severity": "high",
            "title_key": "biasRevenge", "detail_key": "biasRevengeDetail",
            "count": len(revenge_trades),
            "pnl": round(sum(float(t.get("pnl") or 0) for t in revenge_trades), 2),
        })

    # 3) Overtrading — days with abnormally many trades vs the median
    per_day: Dict[str, int] = {}
    day_pnl: Dict[str, float] = {}
    for t in closed:
        d = str(t.get("exit_date") or t.get("entry_date") or "")[:10]
        if not d:
            continue
        per_day[d] = per_day.get(d, 0) + 1
        day_pnl[d] = day_pnl.get(d, 0.0) + float(t.get("pnl") or 0)
    if per_day:
        counts = sorted(per_day.values())
        median = counts[len(counts) // 2]
        heavy = [d for d, c in per_day.items() if c >= max(median * 2, median + 3) and c >= 4]
        if heavy:
            biases.append({
                "code": "overtrading", "severity": "medium",
                "title_key": "biasOvertrading", "detail_key": "biasOvertradingDetail",
                "days": len(heavy),
                "pnl": round(sum(day_pnl[d] for d in heavy), 2),
            })

    # 4) Stop-loss discipline — share of trades entered without a stop
    no_sl = sum(1 for t in closed if not t.get("sl"))
    if n and no_sl / n > 0.3:
        biases.append({
            "code": "no_stop_discipline", "severity": "critical",
            "title_key": "biasNoStop", "detail_key": "biasNoStopDetail",
            "pct": round(no_sl / n * 100),
        })

    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    biases.sort(key=lambda b: order.get(b["severity"], 9))
    return biases


# ─── Aggregate analytics (25+ metrics) ────────────────────────────

def compute_analytics(trades: List[dict]) -> Dict[str, Any]:
    """Compute the full performance dashboard for a list of (computed) trades.

    Expects each trade to already have pnl/pnl_pct/r_multiple via compute_trade_pnl.
    """
    closed = [t for t in trades if t.get("status") in ("closed", "sl_hit", "tp_hit")
              and t.get("exit_price") is not None]
    if not closed:
        return _empty_analytics(trades)

    pnls = [float(t.get("pnl") or 0) for t in closed]
    rs = [float(t.get("r_multiple") or 0) for t in closed]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]

    total_pnl = sum(pnls)
    win_rate = _safe_div(len(wins), len(closed), 0) * 100
    avg_win = _safe_div(sum(wins), len(wins), 0) if wins else 0
    avg_loss = _safe_div(sum(losses), len(losses), 0) if losses else 0  # negative
    profit_factor = _safe_div(sum(wins), abs(sum(losses)), 0) if losses else (
        float("inf") if wins else 0
    )
    expectancy = (
        win_rate / 100 * avg_win
        + (1 - win_rate / 100) * avg_loss
    )

    # Equity curve
    starting_balance = float(closed[0].get("account_balance") or 10000)
    equity = [starting_balance]
    for p in pnls:
        equity.append(equity[-1] + p)
    max_dd_dollars, max_dd_pct = _compute_max_drawdown(equity)

    # Streaks
    cur_w = cur_l = max_w = max_l = 0
    for p in pnls:
        if p > 0:
            cur_w += 1
            cur_l = 0
            max_w = max(max_w, cur_w)
        elif p < 0:
            cur_l += 1
            cur_w = 0
            max_l = max(max_l, cur_l)
        else:
            cur_w = 0
            cur_l = 0

    # By-day breakdown
    by_day = _group_winrate_by(closed, lambda t: _weekday_name(t.get("entry_date")))
    # By-setup breakdown
    by_setup = _group_winrate_by(closed, lambda t: t.get("setup") or "—")
    # By-symbol breakdown
    by_symbol = _group_winrate_by(closed, lambda t: t.get("symbol") or "—")

    # R-multiple distribution buckets
    r_buckets = {"<-2R": 0, "-2R..-1R": 0, "-1R..0R": 0, "0R..1R": 0, "1R..2R": 0, ">2R": 0}
    for r in rs:
        if r < -2:
            r_buckets["<-2R"] += 1
        elif r < -1:
            r_buckets["-2R..-1R"] += 1
        elif r < 0:
            r_buckets["-1R..0R"] += 1
        elif r < 1:
            r_buckets["0R..1R"] += 1
        elif r < 2:
            r_buckets["1R..2R"] += 1
        else:
            r_buckets[">2R"] += 1

    # Error stats
    error_counts: Dict[str, int] = {}
    for t in closed:
        for e in t.get("errors") or []:
            code = e.get("code")
            if code:
                error_counts[code] = error_counts.get(code, 0) + 1
    total_errors = sum(error_counts.values())
    rule_compliance_rate = (
        100 - _safe_div(total_errors, len(closed), 0) * 100
        if closed else 100
    )

    # Average emotion (1-5 scale)
    emotions = [int(t.get("emotion") or 0) for t in closed if t.get("emotion")]
    avg_emotion = round(sum(emotions) / len(emotions), 1) if emotions else 0

    # Daily realized PnL (for the monthly calendar) — grouped by exit date (YYYY-MM-DD)
    daily_map: Dict[str, Dict[str, float]] = {}
    for t in closed:
        ed = t.get("exit_date") or t.get("entry_date") or t.get("date")
        if not ed:
            continue
        day = str(ed)[:10]
        slot = daily_map.setdefault(day, {"pnl": 0.0, "n": 0, "wins": 0, "losses": 0})
        p = float(t.get("pnl") or 0)
        slot["pnl"] += p
        slot["n"] += 1
        if p > 0:
            slot["wins"] += 1
        elif p < 0:
            slot["losses"] += 1
    daily_pnl = [
        {
            "date": d,
            "pnl": round(v["pnl"], 2),
            "n": int(v["n"]),
            "wins": int(v["wins"]),
            "losses": int(v["losses"]),
            "pct": round(_safe_div(v["pnl"], starting_balance, 0) * 100, 2),
        }
        for d, v in sorted(daily_map.items())
    ]

    return {
        # Core
        "total_trades": len(trades),
        "closed_trades": len(closed),
        "open_trades": len(trades) - len(closed),
        "win_rate": round(win_rate, 2),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "breakeven_trades": len(closed) - len(wins) - len(losses),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_pct": round(_safe_div(total_pnl, starting_balance, 0) * 100, 2),
        # Quality
        "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else None,
        "expectancy": round(expectancy, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "best_trade": round(max(pnls), 2) if pnls else 0,
        "worst_trade": round(min(pnls), 2) if pnls else 0,
        # Risk
        "max_drawdown_dollars": max_dd_dollars,
        "max_drawdown_pct": max_dd_pct,
        "sharpe_ratio": _compute_sharpe(pnls),
        "sortino_ratio": _compute_sortino(pnls),
        "avg_r": round(sum(rs) / len(rs), 2) if rs else 0,
        # Streaks
        "max_consecutive_wins": max_w,
        "max_consecutive_losses": max_l,
        # Distributions
        "by_day": by_day,
        "by_setup": by_setup,
        "by_symbol": by_symbol,
        "r_distribution": r_buckets,
        "equity_curve": [round(e, 2) for e in equity],
        "daily_pnl": daily_pnl,
        "behavioral_biases": detect_behavioral_biases(trades),
        # Discipline
        "errors_total": total_errors,
        "errors_breakdown": error_counts,
        "rule_compliance_rate": round(rule_compliance_rate, 2),
        "avg_emotion": avg_emotion,
    }


def _empty_analytics(trades: List[dict]) -> Dict[str, Any]:
    return {
        "total_trades": len(trades),
        "closed_trades": 0,
        "open_trades": len(trades),
        "win_rate": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "breakeven_trades": 0,
        "total_pnl": 0,
        "total_pnl_pct": 0,
        "profit_factor": 0,
        "expectancy": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "best_trade": 0,
        "worst_trade": 0,
        "max_drawdown_dollars": 0,
        "max_drawdown_pct": 0,
        "sharpe_ratio": 0,
        "sortino_ratio": 0,
        "avg_r": 0,
        "max_consecutive_wins": 0,
        "max_consecutive_losses": 0,
        "by_day": [],
        "by_setup": [],
        "by_symbol": [],
        "r_distribution": {},
        "equity_curve": [],
        "daily_pnl": [],
        "behavioral_biases": [],
        "errors_total": 0,
        "errors_breakdown": {},
        "rule_compliance_rate": 100,
        "avg_emotion": 0,
    }


def _weekday_name(iso_str: Optional[str]) -> str:
    if not iso_str:
        return "—"
    try:
        d = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday()]
    except Exception:
        return "—"


def _group_winrate_by(trades: List[dict], key_fn) -> List[Dict[str, Any]]:
    """Return list of {group, n, wins, win_rate, pnl} sorted by trade count desc."""
    groups: Dict[str, Dict[str, Any]] = {}
    for t in trades:
        k = key_fn(t)
        g = groups.setdefault(k, {"group": k, "n": 0, "wins": 0, "pnl": 0.0})
        g["n"] += 1
        if (t.get("pnl") or 0) > 0:
            g["wins"] += 1
        g["pnl"] += float(t.get("pnl") or 0)
    out = []
    for g in groups.values():
        g["win_rate"] = round(_safe_div(g["wins"], g["n"], 0) * 100, 1)
        g["pnl"] = round(g["pnl"], 2)
        out.append(g)
    out.sort(key=lambda x: x["n"], reverse=True)
    return out


# ─── Insights — turn analytics into human-readable observations ───

def generate_insights(analytics: Dict[str, Any]) -> List[Dict[str, str]]:
    """Produce up to 8 observations + recommendations for the trader."""
    insights: List[Dict[str, str]] = []
    closed = analytics.get("closed_trades", 0)
    if closed == 0:
        return insights

    wr = analytics.get("win_rate", 0)
    pf = analytics.get("profit_factor")
    exp = analytics.get("expectancy", 0)
    sharpe = analytics.get("sharpe_ratio", 0)
    avg_r = analytics.get("avg_r", 0)
    compliance = analytics.get("rule_compliance_rate", 100)
    by_day = analytics.get("by_day") or []
    by_setup = analytics.get("by_setup") or []
    errs = analytics.get("errors_breakdown") or {}

    # Win rate vs profit factor — counterintuitive case
    if wr >= 60 and pf is not None and pf < 1.2:
        insights.append({
            "severity": "warning",
            "key": "insightWRHighPFLow",
            "value_pf": str(pf),
            "value_wr": f"{wr:.0f}",
        })

    # Expectancy negative
    if exp < 0:
        insights.append({"severity": "critical", "key": "insightNegExpectancy",
                         "value": f"{exp:.2f}"})
    elif exp > 0:
        insights.append({"severity": "good", "key": "insightPosExpectancy",
                         "value": f"{exp:.2f}"})

    # Sharpe signal
    if sharpe >= 0.5:
        insights.append({"severity": "good", "key": "insightSharpeOK", "value": str(sharpe)})
    elif sharpe < 0:
        insights.append({"severity": "critical", "key": "insightSharpeBad", "value": str(sharpe)})

    # Avg R below recommended
    if avg_r > 0 and avg_r < 1.0:
        insights.append({"severity": "warning", "key": "insightAvgRLow",
                         "value": str(avg_r)})

    # Rule compliance
    if compliance < 80:
        insights.append({"severity": "warning", "key": "insightLowCompliance",
                         "value": f"{compliance:.0f}"})

    # Best day / worst day
    if len(by_day) >= 2:
        days_sorted = sorted([d for d in by_day if d["n"] >= 2],
                             key=lambda x: x["win_rate"], reverse=True)
        if len(days_sorted) >= 2:
            best, worst = days_sorted[0], days_sorted[-1]
            if best["win_rate"] - worst["win_rate"] >= 20:
                insights.append({
                    "severity": "info",
                    "key": "insightBestWorstDay",
                    "best_day": best["group"], "best_wr": f"{best['win_rate']:.0f}",
                    "worst_day": worst["group"], "worst_wr": f"{worst['win_rate']:.0f}",
                })

    # Top setup
    if by_setup:
        top = max(by_setup, key=lambda x: x["pnl"])
        if top["n"] >= 3 and top["pnl"] > 0:
            insights.append({
                "severity": "good",
                "key": "insightBestSetup",
                "setup": top["group"], "pnl": str(top["pnl"]),
                "wr": f"{top['win_rate']:.0f}",
            })

    # Most common error
    if errs:
        worst_err = max(errs.items(), key=lambda x: x[1])
        insights.append({
            "severity": "warning",
            "key": "insightTopError",
            "error_code": worst_err[0],
            "count": str(worst_err[1]),
        })

    return insights[:8]


# ─── DB helpers ───────────────────────────────────────────────────

async def trades_for_user(db, user_id: str, *, limit: int = 500) -> List[dict]:
    """Fetch user trades sorted by entry_date desc, _id excluded."""
    cursor = db.trades.find({"user_id": user_id}, {"_id": 0}).sort("entry_date", -1).limit(limit)
    return await cursor.to_list(length=limit)


def make_trade_doc(payload: dict, user_id: str) -> dict:
    """Build a fresh trade document from API input payload."""
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "symbol": (payload.get("symbol") or "").upper(),
        "side": payload.get("side") or "long",
        "setup": payload.get("setup") or "",
        # Instrumento: spot (por defecto) u option. Campos de opción opcionales.
        "instrument_type": payload.get("instrument_type") or "spot",
        "option_type": payload.get("option_type") or None,
        "strike": float(payload["strike"]) if payload.get("strike") not in (None, "") else None,
        "expiry": payload.get("expiry") or None,
        "multiplier": float(payload.get("multiplier") or 1),
        "entry_price": float(payload.get("entry_price") or 0),
        "exit_price": float(payload["exit_price"]) if payload.get("exit_price") not in (None, "") else None,
        "sl": float(payload["sl"]) if payload.get("sl") not in (None, "") else None,
        "tp": float(payload["tp"]) if payload.get("tp") not in (None, "") else None,
        "quantity": float(payload.get("quantity") or 0),
        "entry_date": payload.get("entry_date") or now,
        "exit_date": payload.get("exit_date"),
        "status": payload.get("status") or ("closed" if payload.get("exit_price") not in (None, "") else "open"),
        "account_balance": float(payload.get("account_balance") or 0),
        "fees": float(payload.get("fees") or 0),
        "notes": payload.get("notes") or "",
        "tags": payload.get("tags") or [],
        "emotion": int(payload["emotion"]) if payload.get("emotion") else None,
        "screenshot_urls": payload.get("screenshot_urls") or [],
        "created_at": now,
        "updated_at": now,
    }
    return doc
