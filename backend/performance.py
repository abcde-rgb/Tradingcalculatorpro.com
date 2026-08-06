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
# These are DEFAULTS, not thresholds. They apply only to a user who has not
# written a trading plan; anyone with one is judged against `plan["risk"]`
# instead (see `detect_errors`). Judging every trader against the same numbers
# is what made `rule_compliance_rate` measure adherence to the app's opinion
# rather than to the user's own rules: a scalper deliberately running 1:1 at a
# 65% hit rate collected a `low_rr` error on every trade, and someone who caps
# risk at 0.5% got no warning at 1.8% because the global ceiling was 2%.
DEFAULT_MIN_RR = 1.5               # min recommended R:R (per Education Center)
DEFAULT_MAX_RISK_PCT = 2.0         # max risk per trade (% of account)
EARLY_CLOSE_THRESHOLD = 0.5        # closed before reaching 50% of TP
REVENGE_TRADE_WINDOW_MIN = 30      # min between losing trade and next entry

# Old names kept as aliases: they are imported by name elsewhere and read by
# tests, and silently changing what they mean is worse than carrying two lines.
MIN_RR_THRESHOLD = DEFAULT_MIN_RR
MAX_RISK_PCT_THRESHOLD = DEFAULT_MAX_RISK_PCT

# Risk-adjusted metrics. The Sharpe/Sortino reported to the user are
# ANNUALIZED, which is the only convention whose thresholds ("above 1 is good")
# mean anything. Annualizing needs a real observation window, so we refuse to do
# it on a sample too small or too short to support it and fall back to the raw
# per-trade figure with `annualized: false`.
DEFAULT_RISK_FREE_RATE = 0.04      # annual; overridden with the live curve when available
MIN_DAYS_TO_ANNUALIZE = 7
MIN_TRADES_TO_ANNUALIZE = 10
DAYS_PER_YEAR = 365.25
# Ceiling on the observed frequency used to annualize. ~10 trades per session ×
# 252 sessions. Without it a dense sample over a short span — a scalping week,
# or a bulk CSV import of tick trades — drives trades/year into five figures and
# the √ppy scale factor with it, turning a per-trade Sharpe of 0.05 into a
# reported 5.5. The cap keeps the number wrong-but-bounded instead of absurd.
MAX_TRADES_PER_YEAR = 2520.0
# Minimum winning trades before the excursion panel is allowed to suggest a stop
# width. A p80 estimate off fewer than this is two observations wide.
MIN_WINNERS_FOR_STOP_ADVICE = 10


# ─── Math helpers ─────────────────────────────────────────────────

def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b else default


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Make a datetime comparable: naive values are assumed to be UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _trade_close_dt(trade: dict) -> Optional[datetime]:
    """When this trade hit the account. Exit date, entry date as a fallback."""
    return _to_utc(_parse_dt(trade.get("exit_date"))) or _to_utc(_parse_dt(trade.get("entry_date")))


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def sort_trades_chronologically(trades: List[dict]) -> List[dict]:
    """Oldest → newest by **exit** date.

    The equity curve is a realized-P&L series, so what orders it is when each
    trade closed, not when it was opened: a swing entered in January and closed
    in April moves the account in April. Feeding the curve in any other order
    silently corrupts max drawdown (drawdown is not symmetric under reversal —
    reverse the series and the falls become rises) and the streak counters.
    """
    return sorted(trades, key=lambda t: _trade_close_dt(t) or _EPOCH)


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


def _period_returns(equity: List[float]) -> List[float]:
    """Per-trade percentage returns off the equity curve.

    Percentage returns (not raw dollars) are what a risk-free rate can be
    subtracted from, which is what makes the Sharpe below an actual Sharpe.
    Stops at the point the account would have been wiped out — returns past a
    non-positive balance are not meaningful.
    """
    out: List[float] = []
    for i in range(1, len(equity)):
        prev = equity[i - 1]
        if prev <= 0:
            break
        out.append(equity[i] / prev - 1)
    return out


def _periods_per_year(closed: List[dict]) -> Optional[float]:
    """Observed trading frequency, or None when the sample can't support one.

    Annualizing off two trades a day apart produces a number with no
    information in it, so we require both a minimum count and a minimum span.
    """
    if len(closed) < MIN_TRADES_TO_ANNUALIZE:
        return None
    dts = [d for d in (_trade_close_dt(t) for t in closed) if d]
    if len(dts) < 2:
        return None
    span_days = (max(dts) - min(dts)).total_seconds() / 86400
    if span_days < MIN_DAYS_TO_ANNUALIZE:
        return None
    return min(len(closed) / (span_days / DAYS_PER_YEAR), MAX_TRADES_PER_YEAR)


# Días mínimos de historial antes de estimar un ritmo mensual. Por debajo, la
# cifra habla del calendario (una semana intensa, un puente) y no del trader.
MIN_DAYS_FOR_MONTHLY_RATE = 21


def _trades_per_month(closed: List[dict]) -> Optional[float]:
    """Operaciones cerradas al mes, medidas sobre el histórico real.

    None cuando el histórico es demasiado corto para que la cifra signifique
    algo: es la diferencia entre "no lo sé" y "cero al mes", y quien la consuma
    tiene que poder distinguirlas.
    """
    dts = [d for d in (_trade_close_dt(t) for t in closed) if d]
    if len(dts) < 2:
        return None
    span_days = (max(dts) - min(dts)).total_seconds() / 86400
    if span_days < MIN_DAYS_FOR_MONTHLY_RATE:
        return None
    return round(len(dts) / (span_days / 30.44), 1)


def returns_by_period(closed: List[dict], starting_balance: float) -> Dict[str, List[dict]]:
    """Rentabilidad REAL por mes, trimestre y año.

    Es la unidad en la que se cobra y en la que se piensan los objetivos ("un
    10 % al mes"), y hasta ahora la analítica sólo publicaba el total y el PnL
    diario: no había forma de responder "¿qué renta mi cuenta al mes?".

    Se compone, NO se suma: un +10 % seguido de un −10 % no es 0, es −1 %. Los
    trimestres y los años se construyen encadenando los factores mensuales, que
    es lo mismo que hace la cuenta real.

    El porcentaje de cada mes se mide sobre el saldo con el que **empezó ese
    mes**, no sobre el saldo inicial de todo el histórico: ganar 500 € sobre
    10 000 no es lo mismo que ganarlos sobre 50 000, y sumarlos como si lo fuera
    es lo que hace que una racha vieja infle la rentabilidad de hoy.
    """
    rows = sort_trades_chronologically([t for t in closed if _trade_close_dt(t)])
    if not rows:
        return {"month": [], "quarter": [], "year": []}

    equity = starting_balance
    months: Dict[str, Dict[str, Any]] = {}
    for t in rows:
        dt = _trade_close_dt(t)
        key = f"{dt.year:04d}-{dt.month:02d}"
        slot = months.get(key)
        if slot is None:
            slot = months[key] = {"period": key, "start": equity, "pnl": 0.0, "n": 0, "wins": 0}
        pnl = float(t.get("pnl") or 0)
        slot["pnl"] += pnl
        slot["n"] += 1
        if pnl > 0:
            slot["wins"] += 1
        equity += pnl

    monthly = []
    for key in sorted(months):
        s = months[key]
        pct = _safe_div(s["pnl"], s["start"], 0) * 100 if s["start"] > 0 else 0.0
        monthly.append({
            "period": key, "pnl": round(s["pnl"], 2), "pct": round(pct, 2),
            "n": s["n"], "wins": s["wins"],
        })

    def _roll(size: int, label) -> List[dict]:
        out: Dict[str, Dict[str, Any]] = {}
        for row in monthly:
            year, month = row["period"].split("-")
            key = label(int(year), int(month))
            slot = out.setdefault(key, {"period": key, "factor": 1.0, "pnl": 0.0, "n": 0, "months": 0})
            slot["factor"] *= 1 + row["pct"] / 100
            slot["pnl"] += row["pnl"]
            slot["n"] += row["n"]
            slot["months"] += 1
        return [
            {"period": k, "pct": round((v["factor"] - 1) * 100, 2),
             "pnl": round(v["pnl"], 2), "n": v["n"], "months": v["months"]}
            for k, v in sorted(out.items())
        ]

    return {
        "month": monthly,
        "quarter": _roll(3, lambda y, m: f"{y:04d}-Q{(m - 1) // 3 + 1}"),
        "year": _roll(12, lambda y, m: f"{y:04d}"),
    }


def _compute_sharpe(returns: List[float], rf_period: float = 0.0) -> float:
    """Sharpe over the given return series, net of the per-period risk-free rate.

    Uses the *sample* standard deviation (n-1), the convention every published
    Sharpe uses. Not annualized here — see `_risk_adjusted_metrics`.
    """
    if len(returns) < 2:
        return 0.0
    excess = [r - rf_period for r in returns]
    sd = statistics.stdev(excess)
    if sd == 0:
        return 0.0
    return statistics.mean(excess) / sd


def _compute_sortino(returns: List[float], mar: float = 0.0) -> Optional[float]:
    """Sortino over the given return series against a minimum acceptable return.

    Downside deviation divides by the TOTAL number of observations, per the
    Sortino/Price definition — dividing by the count of negatives (as an earlier
    version did) inflates the denominator and systematically understates the
    ratio. Returns None when there is no downside deviation at all: a system
    with no losses has an undefined Sortino, and reporting 0.0 there reads as
    "terrible" when it means the opposite.
    """
    if len(returns) < 2:
        return None
    excess = [r - mar for r in returns]
    downside = math.sqrt(sum(min(0.0, e) ** 2 for e in excess) / len(excess))
    if downside == 0:
        return None
    return statistics.mean(excess) / downside


def _risk_adjusted_metrics(
    equity: List[float],
    closed: List[dict],
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
) -> Dict[str, Any]:
    """Sharpe & Sortino, annualized when the sample allows it.

    Returns both the annualized figures (`sharpe_ratio`, `sortino_ratio` — what
    the UI shows and what the "above 1 is good" thresholds are calibrated
    against) and the raw per-trade ones, plus the observed trades/year used for
    the conversion so the number is auditable.
    """
    returns = _period_returns(equity)
    ppy = _periods_per_year(closed)
    rf_period = risk_free_rate / ppy if ppy else 0.0

    sharpe_pt = _compute_sharpe(returns, rf_period)
    sortino_pt = _compute_sortino(returns, rf_period)

    scale = math.sqrt(ppy) if ppy else 1.0
    return {
        "sharpe_ratio": round(sharpe_pt * scale, 2),
        "sortino_ratio": round(sortino_pt * scale, 2) if sortino_pt is not None else None,
        "sharpe_per_trade": round(sharpe_pt, 3),
        "sortino_per_trade": round(sortino_pt, 3) if sortino_pt is not None else None,
        "annualized": ppy is not None,
        "trades_per_year": round(ppy, 1) if ppy else None,
        "risk_free_rate": round(risk_free_rate, 4),
    }


# ─── Trade computation ────────────────────────────────────────────

def compute_trade_pnl(trade: dict) -> dict:
    """Return a copy of `trade` with computed P&L fields.

    Fills: pnl, pnl_pct, r_multiple, mae_r, mfe_r. Required input fields:
      side ('long'|'short'), entry_price, exit_price, quantity, sl,
      account_balance (optional, for pnl_pct), fees (optional),
      mae_price/mfe_price (optional, for excursion analysis).
    For OPEN trades (no exit_price), pnl is 0 and r_multiple is None.

    `r_multiple` is None — not 0 — whenever it cannot be computed (no stop, or
    trade still open). A trade taken without a stop did not return "zero R", it
    returned an undefined number of R, and averaging it in as a zero drags the
    mean toward the middle and puts a fake spike in the 0R..1R bucket.
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

    risk_per_unit = abs(entry - float(sl)) if sl not in (None, "") and entry else 0.0
    out["mae_r"], out["mfe_r"] = _excursion_r(trade, side, entry, risk_per_unit)

    if exit_p is None or entry == 0 or qty == 0:
        out["pnl"] = 0.0
        out["pnl_pct"] = 0.0
        out["r_multiple"] = None
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
    # Undefined (None) without a stop — see the docstring.
    if risk_per_unit > 0:
        risk_total = risk_per_unit * qty * mult
        out["r_multiple"] = round(_safe_div(pnl, risk_total, 0), 2) if risk_total else None
    else:
        out["r_multiple"] = None
    return out


def _excursion_r(trade: dict, side: str, entry: float,
                 risk_per_unit: float) -> Tuple[Optional[float], Optional[float]]:
    """Maximum adverse / favourable excursion, expressed in R.

    MAE = how far the trade went against you before it resolved; MFE = how far
    it went in your favour. In R they answer the two questions a journal exists
    to answer: is my stop wider than it needs to be (winners with a tiny MAE),
    and am I giving back trades that were already paid (losers with a large
    MFE). Both need a stop to be expressed in R, so both are None without one.
    """
    mae_price, mfe_price = trade.get("mae_price"), trade.get("mfe_price")
    if risk_per_unit <= 0 or not entry:
        return None, None

    def _r(price, adverse: bool) -> Optional[float]:
        if price in (None, ""):
            return None
        try:
            p = float(price)
        except (TypeError, ValueError):
            return None
        if side == "long":
            excursion = (entry - p) if adverse else (p - entry)
        else:
            excursion = (p - entry) if adverse else (entry - p)
        # Never negative: an "adverse" excursion that is favourable is 0 adverse.
        return round(max(0.0, excursion) / risk_per_unit, 2)

    return _r(mae_price, True), _r(mfe_price, False)


# ─── Error detection ──────────────────────────────────────────────

def detect_errors(
    trade: dict,
    *,
    plan: Optional[dict] = None,
    prev_trades: Optional[List[dict]] = None,
) -> List[Dict[str, str]]:
    """Run a set of rules against a trade and return detected mistakes.

    Each error is {code, severity, message_key} so the frontend can localize,
    plus `threshold` and `plan_version` when a plan supplied the limit — that is
    what lets the UI say "your plan says 1%, this trade risked 2.3%" instead of a
    generic scolding.

    `plan` is the user's active trading plan (see `trading_plan.py`). When it is
    None every threshold falls back to the module defaults and the behaviour is
    exactly what it was before plans existed — a user without a plan must not
    see their error list change. When it IS present, the plan wins on every
    threshold it declares, and five extra rules become available that cannot
    even be expressed without one (sessions, daily loss, trade count,
    consecutive losses, traded market).
    """
    from trading_plan import is_within_sessions, plan_risk  # local: avoids a cycle

    errors: List[Dict[str, str]] = []
    risk_cfg = plan_risk(plan)
    plan_version = plan.get("version") if plan else None

    def _fail(code: str, severity: str, message_key: str, *,
              value: Any = None, threshold: Any = None) -> None:
        """Append an error, tagging it with the plan that judged it."""
        err: Dict[str, Any] = {"code": code, "severity": severity,
                               "message_key": message_key}
        if value is not None:
            err["value"] = str(value)
        if threshold is not None:
            err["threshold"] = str(threshold)
        if plan_version is not None:
            err["plan_version"] = plan_version
        errors.append(err)

    side = trade.get("side", "long")
    entry = trade.get("entry_price")
    exit_p = trade.get("exit_price")
    sl = trade.get("sl")
    tp = trade.get("tp")
    qty = trade.get("quantity")
    balance = trade.get("account_balance")
    status = trade.get("status", "closed")

    # Rule 1: NO STOP LOSS — cardinal sin, unless the plan deliberately opts out.
    # Some real systems (options spreads with defined max loss, mean-reversion
    # baskets) carry no per-trade stop. Flagging those forever trained the user
    # to ignore the whole error list, which is worse than the missing rule.
    if (sl is None or sl == 0) and risk_cfg["require_stop_loss"]:
        _fail("no_sl", "critical", "errNoSL")

    # Rule 2: R:R below the minimum THIS trader declared
    min_rr = risk_cfg["min_rr"]
    if entry and sl and tp:
        try:
            risk = abs(float(entry) - float(sl))
            reward = abs(float(tp) - float(entry))
            rr = _safe_div(reward, risk, 0)
            if rr < min_rr and risk > 0:
                _fail("low_rr", "high", "errLowRR",
                      value=round(rr, 2), threshold=min_rr)
        except (TypeError, ValueError):
            pass

    # Rule 3: Position size above the trader's own ceiling
    max_risk_pct = risk_cfg["max_risk_pct_per_trade"]
    if entry and sl and qty and balance:
        try:
            risk_amount = abs(float(entry) - float(sl)) * float(qty)
            risk_pct = _safe_div(risk_amount, float(balance), 0) * 100
            if risk_pct > max_risk_pct:
                _fail("oversize", "high", "errOversize",
                      value=round(risk_pct, 2), threshold=max_risk_pct)
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
                _fail("closed_early", "medium", "errClosedEarly",
                      value=f"{int(ratio * 100)}%")
        except (TypeError, ValueError):
            pass

    # Rule 5: SL violated — exit_price worse than SL on a closed trade
    # (means user moved/removed SL or slipped past it).
    if status not in ("sl_hit",) and entry and sl and exit_p and qty:
        try:
            sl_f, exit_f, entry_f = float(sl), float(exit_p), float(entry)
            if side == "long" and exit_f < sl_f and exit_f < entry_f:
                _fail("sl_violated", "critical", "errSLViolated")
            elif side == "short" and exit_f > sl_f and exit_f > entry_f:
                _fail("sl_violated", "critical", "errSLViolated")
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
                    _fail("revenge_trade", "high", "errRevengeTrade",
                          value=int(gap_min))
                    break
        except (ValueError, TypeError):
            pass

    # ── Rules that only exist with a plan ────────────────────────────────
    # Each is silent unless the plan actually declares the limit: an undeclared
    # limit is not a limit of zero, and inventing one would bury the user in
    # violations of rules they never wrote.
    if plan:
        entry_dt = _parse_dt(trade.get("entry_date"))

        # Rule 7: entered outside the plan's own trading windows
        inside = is_within_sessions(entry_dt, plan.get("sessions"))
        if inside is False:      # None = unanswerable, and stays quiet
            _fail("outside_session", "medium", "errOutsideSession",
                  value=entry_dt.isoformat() if entry_dt else None)

        # Rule 8: symbol is not one of the markets the plan covers
        markets = [m.upper() for m in (plan.get("markets") or [])]
        symbol = str(trade.get("symbol") or "").upper()
        if markets and symbol and symbol not in markets:
            _fail("unlisted_market", "medium", "errUnlistedMarket",
                  value=symbol, threshold=", ".join(markets[:6]))

        # The remaining three need the day's history, in chronological order.
        same_day: List[dict] = []
        if entry_dt and prev_trades:
            for prev in prev_trades:
                prev_dt = _parse_dt(prev.get("entry_date"))
                if prev_dt and prev_dt.date() == entry_dt.date() and prev_dt <= entry_dt:
                    same_day.append(prev)
            same_day.sort(key=lambda t: _parse_dt(t.get("entry_date")) or entry_dt)

        # Rule 9: opened with the plan's daily loss already reached. Measured in
        # R, which is why it can be compared across instruments at all.
        max_daily_r = risk_cfg["max_daily_loss_r"]
        if max_daily_r is not None and same_day:
            realized_r = sum(float(t["r_multiple"]) for t in same_day
                             if t.get("r_multiple") is not None
                             and float(t["r_multiple"]) < 0)
            if realized_r <= -abs(max_daily_r):
                _fail("over_daily_limit", "critical", "errOverDailyLimit",
                      value=round(realized_r, 2), threshold=-abs(max_daily_r))

        # Rule 10: more trades in the day than the plan allows
        max_per_day = risk_cfg["max_trades_per_day"]
        if max_per_day is not None and len(same_day) >= max_per_day:
            _fail("over_trade_count", "high", "errOverTradeCount",
                  value=len(same_day) + 1, threshold=max_per_day)

        # Rule 11: kept trading past the plan's consecutive-loss circuit breaker
        max_streak = risk_cfg["max_consecutive_losses"]
        if max_streak is not None and same_day:
            streak = 0
            for prev in reversed(same_day):
                if float(prev.get("pnl") or 0) < 0:
                    streak += 1
                else:
                    break
            if streak >= max_streak:
                _fail("traded_after_consecutive_losses", "critical",
                      "errAfterConsecutiveLosses",
                      value=streak, threshold=max_streak)

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

def compute_analytics(
    trades: List[dict],
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
) -> Dict[str, Any]:
    """Compute the full performance dashboard for a list of (computed) trades.

    Expects each trade to already have pnl/pnl_pct/r_multiple via compute_trade_pnl.
    Order of `trades` does not matter: closed trades are re-sorted by exit date
    before anything order-sensitive (equity curve, drawdown, streaks) is built.
    """
    closed = [t for t in trades if t.get("status") in ("closed", "sl_hit", "tp_hit")
              and t.get("exit_price") is not None]
    if not closed:
        return _empty_analytics(trades)

    closed = sort_trades_chronologically(closed)

    pnls = [float(t.get("pnl") or 0) for t in closed]
    # Only trades with a defined R contribute to R statistics.
    rs = [float(t["r_multiple"]) for t in closed if t.get("r_multiple") is not None]
    trades_without_r = len(closed) - len(rs)
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

    # Equity curve — built over the chronologically sorted list, so the balance
    # we start from is the one recorded on the OLDEST trade, not the newest.
    starting_balance = float(closed[0].get("account_balance") or 0) or 10000.0
    equity = [starting_balance]
    for p in pnls:
        equity.append(equity[-1] + p)
    max_dd_dollars, max_dd_pct = _compute_max_drawdown(equity)
    risk_adj = _risk_adjusted_metrics(equity, closed, risk_free_rate)

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
    # By-setup breakdown. A trade tagged with two setups counts in BOTH groups:
    # that is the question this breakdown answers ("how does this setup do?"),
    # so the group totals deliberately add up to more than the trade count.
    # `setups_multi_tagged` publishes how much of that overlap there is, so the
    # client can say it instead of the reader assuming the columns are a split.
    by_setup = _group_winrate_by_multi(
        closed, lambda t: trade_setups(t) or [UNTAGGED_SETUP])
    setups_multi_tagged = sum(1 for t in closed if len(trade_setups(t)) > 1)
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

    excursion = compute_excursion_stats(closed)

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
        # El saldo con el que se empezó y el de ahora. Se publican porque una
        # proyección a futuro tiene que arrancar del dinero REAL del usuario: si
        # parte de una cifra redonda inventada, todo lo que salga de ella —el
        # riesgo por operación, el drawdown en dinero, la ruina— es de otra
        # cuenta que no es la suya.
        "starting_balance": round(starting_balance, 2),
        "current_balance": round(starting_balance + total_pnl, 2),
        # Ritmo real de operativa. Lo necesita cualquier proyección con reglas
        # MENSUALES (aportación, tope de rentabilidad, retirada del exceso):
        # sin él habría que inventarse cuántas operaciones caben en un mes.
        # None cuando la muestra no cubre tiempo suficiente: un ritmo estimado
        # sobre cuatro días dice más del calendario que del trader.
        "trades_per_month": _trades_per_month(closed),
        # Rentabilidad medida por periodo: es la unidad en la que se cobra y en
        # la que se piensan los objetivos, y hasta ahora sólo se publicaba el
        # total y el PnL diario.
        "returns_by_period": returns_by_period(closed, starting_balance),
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
        **risk_adj,
        "avg_r": round(sum(rs) / len(rs), 2) if rs else 0,
        "r_sample_size": len(rs),
        "trades_without_r": trades_without_r,
        # Excursion (MAE/MFE) — stop & target calibration
        "excursion": excursion,
        # Streaks
        "max_consecutive_wins": max_w,
        "max_consecutive_losses": max_l,
        # Distributions
        "by_day": by_day,
        "by_setup": by_setup,
        "setups_multi_tagged": setups_multi_tagged,
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


def _percentile(sorted_vals: List[float], pct: float) -> float:
    """Nearest-rank percentile over an already-sorted list."""
    if not sorted_vals:
        return 0.0
    k = max(0, min(len(sorted_vals) - 1, int(math.ceil(pct / 100 * len(sorted_vals))) - 1))
    return sorted_vals[k]


def compute_excursion_stats(closed: List[dict]) -> Dict[str, Any]:
    """MAE/MFE analysis — the highest-yield read in a trade journal.

    Two questions, both answered in R so they are comparable across instruments:

    * **Is my stop wider than it needs to be?** If 80% of winners never went
      more than 0.4R against you, a 1R stop is ~2.5x wider than the evidence
      requires, and the same dollar risk buys a bigger position.
    * **Am I giving back trades I had already won?** Losers that reached +1R or
      more in your favour before turning around are a management problem, not
      an entry problem.

    Everything is None/empty when no trade carries MAE/MFE data, so the UI can
    stay hidden rather than showing confident zeros.
    """
    with_mae = [t for t in closed if t.get("mae_r") is not None]
    with_mfe = [t for t in closed if t.get("mfe_r") is not None]
    if not with_mae and not with_mfe:
        return {"available": False, "sample_size": 0, "scatter": [],
                "capture_ratio": None, "capture_sample": 0}

    winners_mae = sorted(float(t["mae_r"]) for t in with_mae if float(t.get("pnl") or 0) > 0)
    losers_mfe = sorted(float(t["mfe_r"]) for t in with_mfe if float(t.get("pnl") or 0) <= 0)

    # p80 of winners' MAE: the stop distance that would have kept 80% of the
    # winners alive. A small buffer on top keeps it from being knife-edge.
    # The sample floor lives HERE, not only in `generate_insights`: the analytics
    # panel renders `suggested_stop_r` straight from this payload, so guarding it
    # downstream left the UI free to recommend a stop width — and therefore a
    # position size — off two winning trades.
    enough_winners = len(winners_mae) >= MIN_WINNERS_FOR_STOP_ADVICE
    stop_p80 = _percentile(winners_mae, 80) if winners_mae else None
    suggested_stop_r = (
        round(stop_p80 * 1.2, 2) if (stop_p80 and enough_winners) else None
    )

    gave_back = sum(1 for v in losers_mfe if v >= 1.0)

    # Capture: how much of the favourable move actually available you took home.
    # MAE answers "is my stop wider than it needs to be"; nothing here answered
    # the mirror question about the target. A capture well under half says the
    # target sits past where price usually turns, or that the exit is late.
    both = [t for t in closed
            if t.get("mfe_r") not in (None, 0) and t.get("r_multiple") is not None]
    mfe_total = sum(float(t["mfe_r"]) for t in both)
    capture_ratio = (
        round(sum(float(t["r_multiple"]) for t in both) / mfe_total, 2)
        if both and mfe_total > 0 else None
    )

    return {
        "available": True,
        "sample_size": len({id(t) for t in with_mae + with_mfe}),
        "avg_mae_r": round(sum(float(t["mae_r"]) for t in with_mae) / len(with_mae), 2) if with_mae else None,
        "avg_mfe_r": round(sum(float(t["mfe_r"]) for t in with_mfe) / len(with_mfe), 2) if with_mfe else None,
        "winners_mae_p80": round(stop_p80, 2) if stop_p80 is not None else None,
        "winners_sample": len(winners_mae),
        # Only suggest tightening when the evidence says the stop is >25% wider
        # than the worst heat 80% of the winners actually took.
        "suggested_stop_r": suggested_stop_r if (suggested_stop_r and suggested_stop_r < 0.8) else None,
        "losers_gave_back": gave_back,
        "losers_sample": len(losers_mfe),
        "capture_ratio": capture_ratio,
        "capture_sample": len(both),
        "scatter": [
            {
                "mae_r": float(t["mae_r"]) if t.get("mae_r") is not None else None,
                "mfe_r": float(t["mfe_r"]) if t.get("mfe_r") is not None else None,
                "r": float(t["r_multiple"]) if t.get("r_multiple") is not None else None,
                "pnl": round(float(t.get("pnl") or 0), 2),
                "symbol": t.get("symbol") or "—",
            }
            for t in closed if t.get("mae_r") is not None or t.get("mfe_r") is not None
        ][:500],
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
        "starting_balance": 0,
        "current_balance": 0,
        "trades_per_month": None,
        "returns_by_period": {"month": [], "quarter": [], "year": []},
        "profit_factor": 0,
        "expectancy": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "best_trade": 0,
        "worst_trade": 0,
        "max_drawdown_dollars": 0,
        "max_drawdown_pct": 0,
        "sharpe_ratio": 0,
        "sortino_ratio": None,
        "sharpe_per_trade": 0,
        "sortino_per_trade": None,
        "annualized": False,
        "trades_per_year": None,
        "risk_free_rate": DEFAULT_RISK_FREE_RATE,
        "avg_r": 0,
        "r_sample_size": 0,
        "trades_without_r": 0,
        "excursion": {"available": False, "sample_size": 0, "scatter": []},
        "max_consecutive_wins": 0,
        "max_consecutive_losses": 0,
        "by_day": [],
        "by_setup": [],
        "setups_multi_tagged": 0,
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
    """Return list of {group, n, wins, win_rate, pnl} sorted by trade count desc.

    One trade lands in exactly one group — use `_group_winrate_by_multi` when a
    trade can legitimately belong to several.
    """
    return _group_winrate_by_multi(trades, lambda t: [key_fn(t)])


def _group_winrate_by_multi(trades: List[dict], keys_fn) -> List[Dict[str, Any]]:
    """Same shape, but a trade may belong to SEVERAL groups at once.

    Used for setups: a trade taken on the confluence of two setups is evidence
    about both of them. The consequence is that the group counts sum to more
    than the number of trades, which is correct for "how does this setup do?"
    and wrong for "how do my trades split up" — so the caller publishes the
    overlap rather than letting a reader assume it is a partition.

    Each group also carries what a FORWARD PROJECTION needs — average win,
    average loss, payoff and average R with its own sample size — because a
    projection built on the global numbers is not a projection of that setup.
    Everything the sample cannot support is ``None``, never 0: a payoff with no
    losing trade yet is undefined, and a 0 would read as "this setup loses
    everything it makes".
    """
    groups: Dict[str, Dict[str, Any]] = {}
    for t in trades:
        pnl = float(t.get("pnl") or 0)
        r = t.get("r_multiple")
        closed_at = _trade_close_dt(t)
        for k in keys_fn(t):
            g = groups.setdefault(k, {
                "group": k, "n": 0, "wins": 0, "pnl": 0.0,
                "_win_sum": 0.0, "_loss_sum": 0.0, "_losses": 0, "_rs": [],
                "_dates": [],
            })
            if closed_at:
                g["_dates"].append(closed_at)
            g["n"] += 1
            g["pnl"] += pnl
            if pnl > 0:
                g["wins"] += 1
                g["_win_sum"] += pnl
            elif pnl < 0:
                g["_losses"] += 1
                g["_loss_sum"] += abs(pnl)
            if isinstance(r, (int, float)):
                g["_rs"].append(float(r))
    out = []
    for g in groups.values():
        wins, losses = g["wins"], g["_losses"]
        avg_win = (g["_win_sum"] / wins) if wins else None
        avg_loss = (g["_loss_sum"] / losses) if losses else None
        rs = g["_rs"]
        g["win_rate"] = round(_safe_div(g["wins"], g["n"], 0) * 100, 1)
        g["pnl"] = round(g["pnl"], 2)
        g["avg_win"] = round(avg_win, 2) if avg_win is not None else None
        g["avg_loss"] = round(avg_loss, 2) if avg_loss is not None else None
        # Payoff = cuánto gana el ganador medio por cada unidad que pierde el
        # perdedor medio. Sin perdedores todavía no está definido.
        g["payoff"] = (round(avg_win / avg_loss, 2)
                       if (avg_win is not None and avg_loss) else None)
        g["avg_r"] = round(sum(rs) / len(rs), 2) if rs else None
        g["r_sample"] = len(rs)
        # Ritmo propio del grupo. Hace falta para traducir su ventaja en R a
        # cuánto aporta a la rentabilidad MENSUAL: un setup con 0,4 R que se da
        # dos veces al mes aporta menos que uno de 0,15 R que se da quince.
        # None con menos de 21 días de recorrido: es "no lo sé", no "ninguna".
        dates = g.pop("_dates", [])
        rate = None
        if len(dates) >= 2:
            span_days = (max(dates) - min(dates)).total_seconds() / 86400
            if span_days >= MIN_DAYS_FOR_MONTHLY_RATE:
                rate = round(len(dates) / (span_days / 30.44), 1)
        g["trades_per_month"] = rate
        for tmp in ("_win_sum", "_loss_sum", "_losses", "_rs"):
            g.pop(tmp, None)
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

    # Sharpe signal. Thresholds apply to the ANNUALIZED ratio: >1 is a good
    # system, >2 is excellent. They are meaningless against a per-trade Sharpe
    # (an annualized 2.0 at 120 trades/year is only ~0.18 per trade), so when
    # the sample was too small to annualize we stay quiet rather than judge.
    if analytics.get("annualized"):
        if sharpe >= 1.0:
            insights.append({"severity": "good", "key": "insightSharpeOK", "value": str(sharpe)})
        elif sharpe < 0:
            insights.append({"severity": "critical", "key": "insightSharpeBad", "value": str(sharpe)})

    # Avg R below recommended
    if avg_r > 0 and avg_r < 1.0:
        insights.append({"severity": "warning", "key": "insightAvgRLow",
                         "value": str(avg_r)})

    # R statistics computed on a partial sample — say so rather than let the
    # user read avg_r as if it covered every trade.
    without_r = analytics.get("trades_without_r", 0)
    if without_r and closed and without_r / closed >= 0.2:
        insights.append({"severity": "warning", "key": "insightRSampleIncomplete",
                         "count": str(without_r),
                         "pct": f"{without_r / closed * 100:.0f}"})

    # MAE — stop wider than the evidence requires
    exc = analytics.get("excursion") or {}
    # The sample floor now lives in `_excursion_stats` (see
    # MIN_WINNERS_FOR_STOP_ADVICE), so a non-None suggestion is already vouched
    # for — no need to re-check the count and risk the two drifting apart.
    if exc.get("suggested_stop_r"):
        insights.append({"severity": "info", "key": "insightStopTooWide",
                         "value": str(exc["winners_mae_p80"]),
                         "suggested": str(exc["suggested_stop_r"])})
    # MFE — winners handed back
    if exc.get("losers_gave_back") and exc.get("losers_sample", 0) >= 10:
        share = exc["losers_gave_back"] / exc["losers_sample"] * 100
        if share >= 25:
            insights.append({"severity": "warning", "key": "insightGaveBackWinners",
                             "count": str(exc["losers_gave_back"]),
                             "pct": f"{share:.0f}"})

    # MFE — how little of the available move you keep
    if (exc.get("capture_ratio") is not None and exc.get("capture_sample", 0) >= 20
            and 0 < exc["capture_ratio"] < 0.4):
        insights.append({"severity": "warning", "key": "insightLowCapture",
                         "value": f"{exc['capture_ratio'] * 100:.0f}"})

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


# ─── Setups: one trade, possibly several ──────────────────────────
# A trade can answer to MORE THAN ONE setup — a confluence of two conditions is
# as real a reason to enter as a single one, and forcing a choice made the other
# one invisible to the analytics. `setups` (a list) is the source of truth;
# `setup` (a string) is kept in sync so everything that already read one text —
# CSV export, the coach prompt, the journal table — keeps working.
#
# The separator is deliberately padded (" · "): it has to be something a user
# will not type inside a single setup name, because the client splits on it when
# talking to a backend that predates this field.
SETUP_SEPARATOR = " · "
MAX_SETUPS_PER_TRADE = 5
# Group name for a trade logged with no setup at all. Missing data, which is a
# different thing from a trade taken outside the system, and is counted apart.
UNTAGGED_SETUP = "—"


def normalize_setups(payload: dict) -> List[str]:
    """The setup list for a trade, from either the new field or the old string.

    Trims, drops blanks, removes the separator from inside a name (it would
    later be read as two setups) and de-duplicates case-insensitively while
    keeping the spelling the user chose — "Ruptura NY" typed twice is one
    setup, not two, and the analytics must not see it as two.
    """
    raw = payload.get("setups")
    if raw is None:
        text = payload.get("setup")
        raw = [p for p in str(text or "").split(SETUP_SEPARATOR)] if text else []
    if not isinstance(raw, (list, tuple)):
        raw = [raw]

    out: List[str] = []
    seen = set()
    for item in raw:
        name = str(item or "").replace(SETUP_SEPARATOR, " ").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(name)
        if len(out) >= MAX_SETUPS_PER_TRADE:
            break
    return out


def trade_setups(trade: dict) -> List[str]:
    """Read a trade's setups, whatever era it was stored in."""
    return normalize_setups(trade)


# ─── DB helpers ───────────────────────────────────────────────────

async def trades_for_user(db, user_id: str, *, limit: int = 500) -> List[dict]:
    """Fetch user trades sorted by entry_date desc, _id excluded."""
    cursor = db.trades.find({"user_id": user_id}, {"_id": 0}).sort("entry_date", -1).limit(limit)
    return await cursor.to_list(length=limit)


def make_trade_doc(payload: dict, user_id: str) -> dict:
    """Build a fresh trade document from API input payload."""
    now = datetime.now(timezone.utc).isoformat()
    setups = normalize_setups(payload)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "symbol": (payload.get("symbol") or "").upper(),
        "side": payload.get("side") or "long",
        "setups": setups,
        "setup": SETUP_SEPARATOR.join(setups),
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
        # Excursion: worst / best price the trade reached while it was open.
        "mae_price": float(payload["mae_price"]) if payload.get("mae_price") not in (None, "") else None,
        "mfe_price": float(payload["mfe_price"]) if payload.get("mfe_price") not in (None, "") else None,
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
