"""Account-level risk — heat, correlation, loss limits, volatility sizing.

Everything else in this codebase reasons trade by trade: this position risks 1%,
that one risks 1%. A professional reasons at the account level, where those two
1% risks are not necessarily 2% of risk — if both positions are in correlated
instruments they are closer to one 2% bet wearing two names.

Four things live here, all pure functions so the route handlers stay thin:

* **Heat** — how much of the account is at risk RIGHT NOW across open positions.
* **Correlation-adjusted risk** — the number that makes four index positions
  stop looking like diversification.
* **Loss limits** — daily and weekly circuit breakers with a real blocked state,
  not just a warning.
* **Volatility-adjusted sizing** — so that 1R means the same thing whether the
  instrument is an index future or an altcoin.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from instruments import contract_size_for
from performance import _safe_div, _to_utc, _parse_dt

# Common practice on a professional desk: total open risk above ~6% of the
# account is where a normal losing streak starts threatening the business.
HEAT_WARNING_PCT = 4.0
HEAT_CRITICAL_PCT = 6.0

# Correlation assumed between two positions in the same asset class when no
# explicit correlation is supplied. Deliberately high: within-class instruments
# (NQ/ES/SPY/AAPL, or BTC/ETH/SOL) move together far more than traders assume.
DEFAULT_INTRA_CLASS_CORRELATION = 0.75
DEFAULT_CROSS_CLASS_CORRELATION = 0.15


def _position_risk(position: dict) -> Optional[float]:
    """Money at risk on one open position: |entry − stop| × qty × tamaño contrato.

    Devuelve `None` cuando el riesgo **no se puede cuantificar** con los datos
    dados, que son dos casos distintos y `open_heat` los cuenta por separado:
    sin stop, y sin tamaño de contrato resoluble.

    El tamaño de contrato sale de `contract_size_for` —el MISMO resolutor que
    usa el P&L—, no del campo `multiplier` en crudo. Leerlo en crudo con un
    `or 1` de respaldo era BUG-045 otra vez: `multiplier` es opcional al crear
    la operación (para eso está el catálogo), así que en un forex normal llega
    a `None` y el riesgo salía ×100 000 más pequeño — 1 lote de EURUSD con 50
    pips de stop se leía como 0,005 $ en vez de 500 $, y `heat_pct` daba 0 %
    con la cuenta al 5 %. Peor aún: como 0,005 > 0, la posición pasaba el
    filtro `has_stop` y ni siquiera caía en el contador de las no cuantificables.
    """
    try:
        entry = float(position.get("entry_price") or 0)
        sl = position.get("sl")
        qty = float(position.get("quantity") or 0)
        if sl in (None, "") or not entry or not qty:
            return None
        mult = contract_size_for(
            position.get("instrument_type"), position.get("symbol"),
            override=position.get("multiplier"), lot_type=position.get("lot_type"),
        )
        if mult is None:
            # Símbolo fuera de catálogo y sin tamaño declarado. Un contrato de
            # crudo a ×1 en vez de ×1000 no da un riesgo aproximado, da uno mil
            # veces menor: es preferible decir que no se sabe.
            return None
        return abs(entry - float(sl)) * qty * float(mult)
    except (TypeError, ValueError):
        return None


def _asset_class(symbol: str) -> str:
    """Coarse bucket used when no explicit correlation matrix is available."""
    s = (symbol or "").upper()
    if any(k in s for k in ("BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "USDT", "-USD")):
        return "crypto"
    if any(k in s for k in ("ES", "NQ", "SPY", "QQQ", "IWM", "DIA", "^GSPC", "^NDX", "^IBEX")):
        return "index"
    if len(s) == 6 and s.isalpha():
        return "forex"
    if any(k in s for k in ("GC", "CL", "SI", "NG", "GLD", "USO")):
        return "commodity"
    return "equity"


# Buckets that share a risk factor. A single large-cap stock is mostly beta to
# its index, so "long NQ + long ES + long SPY + long AAPL" is one equity bet
# held four times, not four independent ones — treating those two classes as
# uncorrelated would understate the account's real exposure, which is the exact
# mistake this module exists to expose.
_CORRELATION_GROUPS: Dict[str, str] = {
    "index": "equity_beta",
    "equity": "equity_beta",
    "crypto": "crypto",
    "forex": "forex",
    "commodity": "commodity",
}


def _correlation_group(asset_class: str) -> str:
    return _CORRELATION_GROUPS.get(asset_class, asset_class)


def _effective_risk(risks: List[float], correlation: float) -> float:
    """Risk of a correlated basket: sqrt(Σr² + 2ρ·ΣΣrᵢrⱼ).

    With ρ = 0 this collapses to the sum in quadrature (independent bets); with
    ρ = 1 it becomes the plain sum (one bet held four times). Neither extreme is
    realistic, which is exactly why the number is worth showing.
    """
    if not risks:
        return 0.0
    sum_sq = sum(r * r for r in risks)
    cross = 0.0
    for i in range(len(risks)):
        for j in range(i + 1, len(risks)):
            cross += risks[i] * risks[j]
    return math.sqrt(max(0.0, sum_sq + 2 * correlation * cross))


def compute_open_heat(positions: List[dict], account_balance: float,
                      *, correlation: Optional[float] = None) -> Dict[str, Any]:
    """Aggregate open risk across positions, naive and correlation-adjusted.

    `heat_pct` is what most journals show: the sum of every position's risk.
    `effective_heat_pct` is what the account actually carries once you accept
    that correlated positions fail together. The gap between the two is the
    point of this function.
    """
    open_positions = [p for p in positions if (p.get("status") or "open") == "open"]
    balance = float(account_balance or 0)

    per_position: List[Dict[str, Any]] = []
    by_class: Dict[str, List[float]] = {}
    by_group: Dict[str, List[float]] = {}
    no_stop = 0
    unquantifiable = 0
    for p in open_positions:
        risk = _position_risk(p)
        # Dos motivos distintos para no poder medir, y el usuario los arregla
        # de forma distinta: uno poniendo un stop, el otro declarando el tamaño
        # de contrato. Fundirlos en un solo contador escondía el segundo.
        has_stop = p.get("sl") not in (None, "")
        if risk is None:
            if has_stop:
                unquantifiable += 1
            else:
                no_stop += 1
        cls = _asset_class(p.get("symbol", ""))
        # Una posición que no se puede medir NO entra en la suma como 0: eso la
        # trataría como libre de riesgo, que es justo lo que estos contadores
        # existen para impedir.
        if risk is not None:
            by_class.setdefault(cls, []).append(risk)
            by_group.setdefault(_correlation_group(cls), []).append(risk)
        per_position.append({
            "symbol": p.get("symbol"),
            "side": p.get("side"),
            "risk": None if risk is None else round(risk, 2),
            "risk_pct": (None if risk is None
                         else round(_safe_div(risk, balance, 0) * 100, 2)),
            "asset_class": cls,
            "correlation_group": _correlation_group(cls),
            "has_stop": has_stop,
            "risk_quantifiable": risk is not None,
        })

    total_risk = sum(x["risk"] for x in per_position if x["risk"] is not None)

    # Within a correlation group the positions are assumed to move together;
    # across groups, much less so. Combine the per-group effective risks.
    intra = DEFAULT_INTRA_CLASS_CORRELATION if correlation is None else correlation
    group_effective = {
        grp: _effective_risk(risks, intra) for grp, risks in by_group.items()
    }
    effective_risk = _effective_risk(
        list(group_effective.values()),
        DEFAULT_CROSS_CLASS_CORRELATION if correlation is None else correlation,
    )

    heat_pct = _safe_div(total_risk, balance, 0) * 100
    effective_pct = _safe_div(effective_risk, balance, 0) * 100

    if effective_pct >= HEAT_CRITICAL_PCT:
        level = "critical"
    elif effective_pct >= HEAT_WARNING_PCT:
        level = "warning"
    else:
        level = "ok"

    return {
        "open_positions": len(open_positions),
        "positions_without_stop": no_stop,
        # Tienen stop pero falta el tamaño de contrato para traducirlo a dinero.
        # No suman a `heat_pct`: quien lo pinte debe decir que la cifra está
        # incompleta, o el usuario leerá un heat bajo que no es real.
        "positions_risk_unquantifiable": unquantifiable,
        "account_balance": round(balance, 2),
        "total_risk": round(total_risk, 2),
        "heat_pct": round(heat_pct, 2),
        "effective_risk": round(effective_risk, 2),
        "effective_heat_pct": round(effective_pct, 2),
        "correlation_used": round(intra, 2),
        "level": level,
        "by_asset_class": [
            {
                "asset_class": cls,
                "correlation_group": _correlation_group(cls),
                "positions": len(risks),
                "risk": round(sum(risks), 2),
                "risk_pct": round(_safe_div(sum(risks), balance, 0) * 100, 2),
            }
            for cls, risks in sorted(by_class.items(), key=lambda kv: -sum(kv[1]))
        ],
        "by_correlation_group": [
            {
                "group": grp,
                "positions": len(risks),
                "risk": round(sum(risks), 2),
                "effective_risk": round(group_effective[grp], 2),
                "risk_pct": round(_safe_div(sum(risks), balance, 0) * 100, 2),
            }
            for grp, risks in sorted(by_group.items(), key=lambda kv: -sum(kv[1]))
        ],
        "positions": per_position,
        "thresholds": {"warning": HEAT_WARNING_PCT, "critical": HEAT_CRITICAL_PCT},
    }


def compute_loss_limits(closed_trades: List[dict], account_balance: float,
                        *, max_daily_loss_pct: Optional[float] = None,
                        max_weekly_loss_pct: Optional[float] = None,
                        now: Optional[datetime] = None) -> Dict[str, Any]:
    """Daily and weekly realized P&L against the user's own circuit breakers.

    Returns a `blocked` flag rather than a soft warning: the whole value of a
    loss limit is that it stops being a suggestion once it is hit. The limits
    come from the user's system rules — the app never invents one.
    """
    ref = _to_utc(now) or datetime.now(timezone.utc)
    day_start = ref.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = day_start - timedelta(days=day_start.weekday())
    balance = float(account_balance or 0)

    day_pnl = week_pnl = 0.0
    day_n = week_n = 0
    for t in closed_trades:
        dt = _to_utc(_parse_dt(t.get("exit_date")))
        if not dt:
            continue
        pnl = float(t.get("pnl") or 0)
        if dt >= day_start:
            day_pnl += pnl
            day_n += 1
        if dt >= week_start:
            week_pnl += pnl
            week_n += 1

    day_pct = _safe_div(day_pnl, balance, 0) * 100
    week_pct = _safe_div(week_pnl, balance, 0) * 100

    daily_breached = max_daily_loss_pct is not None and day_pct <= -abs(float(max_daily_loss_pct))
    weekly_breached = max_weekly_loss_pct is not None and week_pct <= -abs(float(max_weekly_loss_pct))

    def _remaining(limit, used_pct):
        if limit is None:
            return None
        return round(abs(float(limit)) + used_pct, 2)  # used_pct is negative on a loss

    return {
        "reference_time": ref.isoformat(),
        "day": {
            "pnl": round(day_pnl, 2), "pnl_pct": round(day_pct, 2), "trades": day_n,
            "limit_pct": max_daily_loss_pct,
            "remaining_pct": _remaining(max_daily_loss_pct, day_pct),
            "breached": bool(daily_breached),
        },
        "week": {
            "pnl": round(week_pnl, 2), "pnl_pct": round(week_pct, 2), "trades": week_n,
            "limit_pct": max_weekly_loss_pct,
            "remaining_pct": _remaining(max_weekly_loss_pct, week_pct),
            "breached": bool(weekly_breached),
        },
        "blocked": bool(daily_breached or weekly_breached),
        "blocked_reason": (
            "daily_loss_limit" if daily_breached else
            "weekly_loss_limit" if weekly_breached else None
        ),
    }


def volatility_adjusted_size(account_balance: float, risk_pct: float, atr: float,
                             *, atr_multiple: float = 2.0, price: Optional[float] = None,
                             contract_multiplier: float = 1.0) -> Dict[str, Any]:
    """Position size from the instrument's own volatility, not a fixed distance.

    A 1% stop is a completely different bet on an index future than on an
    altcoin. Sizing off ATR makes 1R mean the same thing across instruments,
    which is the only way per-trade statistics are comparable at all.
    """
    balance = float(account_balance or 0)
    atr_v = float(atr or 0)
    risk_amount = balance * (float(risk_pct or 0) / 100)
    stop_distance = atr_v * float(atr_multiple or 0)

    if stop_distance <= 0 or risk_amount <= 0 or contract_multiplier <= 0:
        return {
            "units": 0, "risk_amount": round(risk_amount, 2),
            "stop_distance": round(stop_distance, 4), "notional": 0,
            "error": "Needs a positive balance, risk %, ATR and ATR multiple.",
        }

    units = risk_amount / (stop_distance * contract_multiplier)
    notional = units * float(price) * contract_multiplier if price else None
    return {
        "units": round(units, 4),
        "risk_amount": round(risk_amount, 2),
        "stop_distance": round(stop_distance, 4),
        "atr": round(atr_v, 4),
        "atr_multiple": atr_multiple,
        "notional": round(notional, 2) if notional is not None else None,
        "leverage": round(notional / balance, 2) if notional and balance else None,
    }
