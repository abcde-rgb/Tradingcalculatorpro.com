"""Backtest engine with validation — does this system have an edge, or am I fooling myself?

The point of this module is not to produce a pretty equity curve. Any retail
tool can do that, and a pretty equity curve found by trying enough parameter
combinations is exactly how people convince themselves they have an edge they
do not have.

What it does that the retail segment generally does not:

* **In-sample / out-of-sample split.** Parameters are chosen on the first
  portion of the data and then evaluated, once, on a portion the search never
  touched. A result that only exists in-sample is a description of the past.
* **Walk-forward.** Rolling re-optimisation, so the system is judged the way it
  would actually have been traded rather than with one set of parameters fitted
  to the whole history with hindsight.
* **A trial counter and a data-snooping correction.** Every parameter
  combination tested is a coin flip; test 47 of them and the best one looks good
  by luck alone. `deflated_sharpe` discounts the best result by how hard you
  looked for it. This is the single thing that separates an amateur backtest
  from a professional one.
* **Costs are mandatory.** Commission and slippage are parameters with non-zero
  defaults, not optional extras. A strategy that only works at zero cost does
  not work.

Pure functions over OHLC bars: no network, no DB, fully unit-testable offline.
"""
from __future__ import annotations

import itertools
import math
import statistics
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

TRADING_DAYS_PER_YEAR = 252

# Realistic retail defaults. Deliberately non-zero: a backtest run at zero cost
# is a different (and much friendlier) universe than the one orders execute in.
DEFAULT_COMMISSION_PCT = 0.05     # % of notional, per side
DEFAULT_SLIPPAGE_PCT = 0.05       # % of price, per side


# ---------------------------------------------------------------------------
# Indicators — small, dependency-free, computed over plain lists
# ---------------------------------------------------------------------------


def sma(values: Sequence[float], period: int) -> List[Optional[float]]:
    """Simple moving average. None until there are `period` observations."""
    out: List[Optional[float]] = []
    total = 0.0
    for i, v in enumerate(values):
        total += v
        if i >= period:
            total -= values[i - period]
        out.append(total / period if i >= period - 1 else None)
    return out


def rsi(values: Sequence[float], period: int = 14) -> List[Optional[float]]:
    """Wilder's RSI."""
    out: List[Optional[float]] = [None] * len(values)
    if len(values) <= period:
        return out
    gains = losses = 0.0
    for i in range(1, period + 1):
        change = values[i] - values[i - 1]
        gains += max(change, 0.0)
        losses += max(-change, 0.0)
    avg_gain, avg_loss = gains / period, losses / period
    out[period] = 100.0 if avg_loss == 0 else 100 - 100 / (1 + avg_gain / avg_loss)
    for i in range(period + 1, len(values)):
        change = values[i] - values[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(change, 0.0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-change, 0.0)) / period
        out[i] = 100.0 if avg_loss == 0 else 100 - 100 / (1 + avg_gain / avg_loss)
    return out


def atr(bars: Sequence[dict], period: int = 14) -> List[Optional[float]]:
    """Average true range over OHLC bars."""
    out: List[Optional[float]] = [None] * len(bars)
    if len(bars) < period + 1:
        return out
    trs: List[float] = [0.0]
    for i in range(1, len(bars)):
        h, l, pc = bars[i]["high"], bars[i]["low"], bars[i - 1]["close"]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    current = sum(trs[1:period + 1]) / period
    out[period] = current
    for i in range(period + 1, len(bars)):
        current = (current * (period - 1) + trs[i]) / period
        out[i] = current
    return out


# ---------------------------------------------------------------------------
# Strategy definitions
# ---------------------------------------------------------------------------


@dataclass
class BacktestConfig:
    """Everything that defines one run. Costs are part of the definition."""
    initial_capital: float = 10_000.0
    risk_pct: float = 1.0                 # % of equity risked per trade
    commission_pct: float = DEFAULT_COMMISSION_PCT
    slippage_pct: float = DEFAULT_SLIPPAGE_PCT
    stop_atr_multiple: float = 2.0
    target_atr_multiple: float = 4.0
    allow_short: bool = False


@dataclass
class Trade:
    entry_index: int
    entry_date: str
    entry_price: float
    exit_index: Optional[int] = None
    exit_date: Optional[str] = None
    exit_price: Optional[float] = None
    side: str = "long"
    quantity: float = 0.0
    stop: float = 0.0
    target: float = 0.0
    pnl: float = 0.0
    r_multiple: Optional[float] = None
    costs: float = 0.0
    exit_reason: str = ""


# A signal function maps (bars, params) → list of +1 / -1 / 0 per bar.
SignalFn = Callable[[List[dict], Dict[str, Any]], List[int]]


def signal_sma_cross(bars: List[dict], params: Dict[str, Any]) -> List[int]:
    """Long when the fast SMA is above the slow SMA. The canonical toy system."""
    fast_p = int(params.get("fast", 20))
    slow_p = int(params.get("slow", 50))
    closes = [b["close"] for b in bars]
    fast, slow = sma(closes, fast_p), sma(closes, slow_p)
    out = []
    for f, s in zip(fast, slow):
        if f is None or s is None:
            out.append(0)
        else:
            out.append(1 if f > s else -1)
    return out


def signal_rsi_reversion(bars: List[dict], params: Dict[str, Any]) -> List[int]:
    """Long when RSI leaves oversold, flat/short when it leaves overbought."""
    period = int(params.get("period", 14))
    low = float(params.get("oversold", 30))
    high = float(params.get("overbought", 70))
    values = rsi([b["close"] for b in bars], period)
    out = []
    for v in values:
        if v is None:
            out.append(0)
        elif v < low:
            out.append(1)
        elif v > high:
            out.append(-1)
        else:
            out.append(0)
    return out


def signal_breakout(bars: List[dict], params: Dict[str, Any]) -> List[int]:
    """Donchian-style breakout of the N-bar high/low."""
    lookback = int(params.get("lookback", 20))
    out = [0] * len(bars)
    for i in range(lookback, len(bars)):
        window = bars[i - lookback:i]
        hh = max(b["high"] for b in window)
        ll = min(b["low"] for b in window)
        if bars[i]["close"] > hh:
            out[i] = 1
        elif bars[i]["close"] < ll:
            out[i] = -1
    return out


STRATEGIES: Dict[str, Dict[str, Any]] = {
    "sma_cross": {
        "fn": signal_sma_cross,
        "grid": {"fast": [5, 10, 20, 30], "slow": [50, 100, 200]},
        "defaults": {"fast": 20, "slow": 50},
    },
    "rsi_reversion": {
        "fn": signal_rsi_reversion,
        "grid": {"period": [7, 14, 21], "oversold": [20, 25, 30], "overbought": [70, 75, 80]},
        "defaults": {"period": 14, "oversold": 30, "overbought": 70},
    },
    "breakout": {
        "fn": signal_breakout,
        "grid": {"lookback": [10, 20, 40, 55]},
        "defaults": {"lookback": 20},
    },
}


# ---------------------------------------------------------------------------
# The simulation itself
# ---------------------------------------------------------------------------


def run_backtest(bars: List[dict], strategy: str, params: Dict[str, Any],
                 config: Optional[BacktestConfig] = None) -> Dict[str, Any]:
    """Run one parameter set over one series of bars.

    Signals are acted on at the NEXT bar's open, never at the close of the bar
    that produced them — entering on the same bar's close uses information that
    did not exist when the decision was made, and is the most common way a
    backtest silently reports a return that was never available.
    """
    cfg = config or BacktestConfig()
    spec = STRATEGIES.get(strategy)
    if not spec or len(bars) < 30:
        return _empty_result(cfg, reason="not_enough_data" if spec else "unknown_strategy")

    signals = spec["fn"](bars, params)
    atr_values = atr(bars, 14)

    equity = cfg.initial_capital
    curve: List[float] = [equity]
    trades: List[Trade] = []
    position: Optional[Trade] = None

    for i in range(1, len(bars)):
        bar = bars[i]
        prev_signal = signals[i - 1]

        # ── manage an open position on this bar
        if position is not None:
            exit_price = exit_reason = None
            if position.side == "long":
                if bar["low"] <= position.stop:
                    exit_price, exit_reason = position.stop, "stop"
                elif bar["high"] >= position.target:
                    exit_price, exit_reason = position.target, "target"
                elif prev_signal <= 0:
                    exit_price, exit_reason = bar["open"], "signal"
            else:
                if bar["high"] >= position.stop:
                    exit_price, exit_reason = position.stop, "stop"
                elif bar["low"] <= position.target:
                    exit_price, exit_reason = position.target, "target"
                elif prev_signal >= 0:
                    exit_price, exit_reason = bar["open"], "signal"

            if exit_price is not None:
                equity = _close_position(position, i, bar, exit_price, exit_reason, cfg, equity)
                trades.append(position)
                position = None

        # ── open a new one
        if position is None and prev_signal != 0:
            if prev_signal < 0 and not cfg.allow_short:
                curve.append(equity)
                continue
            a = atr_values[i - 1]
            if a and a > 0:
                position = _open_position(i, bar, prev_signal, a, cfg, equity)

        curve.append(equity)

    # Close anything still open at the last bar, so the result is complete.
    if position is not None:
        last = bars[-1]
        equity = _close_position(position, len(bars) - 1, last, last["close"],
                                 "end_of_data", cfg, equity)
        trades.append(position)
        curve.append(equity)

    return _summarize(trades, curve, cfg, bars, strategy, params)


def _open_position(i: int, bar: dict, signal: int, atr_value: float,
                   cfg: BacktestConfig, equity: float) -> Trade:
    side = "long" if signal > 0 else "short"
    slip = bar["open"] * cfg.slippage_pct / 100
    entry = bar["open"] + slip if side == "long" else bar["open"] - slip

    stop_distance = atr_value * cfg.stop_atr_multiple
    target_distance = atr_value * cfg.target_atr_multiple
    risk_amount = equity * cfg.risk_pct / 100
    qty = risk_amount / stop_distance if stop_distance > 0 else 0

    return Trade(
        entry_index=i, entry_date=bar.get("date", str(i)), entry_price=entry,
        side=side, quantity=qty,
        stop=entry - stop_distance if side == "long" else entry + stop_distance,
        target=entry + target_distance if side == "long" else entry - target_distance,
    )


def _close_position(pos: Trade, i: int, bar: dict, raw_exit: float, reason: str,
                    cfg: BacktestConfig, equity: float) -> float:
    slip = raw_exit * cfg.slippage_pct / 100
    exit_price = raw_exit - slip if pos.side == "long" else raw_exit + slip

    gross = ((exit_price - pos.entry_price) if pos.side == "long"
             else (pos.entry_price - exit_price)) * pos.quantity
    notional = (pos.entry_price + exit_price) * pos.quantity
    costs = notional * cfg.commission_pct / 100
    net = gross - costs

    risk = abs(pos.entry_price - pos.stop) * pos.quantity
    pos.exit_index, pos.exit_date = i, bar.get("date", str(i))
    pos.exit_price, pos.exit_reason = exit_price, reason
    pos.pnl, pos.costs = net, costs
    pos.r_multiple = round(net / risk, 3) if risk > 0 else None
    return equity + net


def _max_drawdown(curve: Sequence[float]) -> Tuple[float, float]:
    peak = curve[0] if curve else 0
    dd_abs = dd_pct = 0.0
    for v in curve:
        peak = max(peak, v)
        dd_abs = max(dd_abs, peak - v)
        if peak > 0:
            dd_pct = max(dd_pct, (peak - v) / peak * 100)
    return round(dd_abs, 2), round(dd_pct, 2)


def _summarize(trades: List[Trade], curve: List[float], cfg: BacktestConfig,
               bars: List[dict], strategy: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if not trades:
        return _empty_result(cfg, reason="no_trades", strategy=strategy, params=params)

    pnls = [t.pnl for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    final = curve[-1]
    dd_abs, dd_pct = _max_drawdown(curve)

    # Sharpe on bar-to-bar equity returns, annualized off the bar count. Same
    # convention as the journal's analytics, so the two numbers are comparable.
    returns = [curve[i] / curve[i - 1] - 1 for i in range(1, len(curve)) if curve[i - 1] > 0]
    sharpe = 0.0
    if len(returns) > 2:
        sd = statistics.stdev(returns)
        if sd > 0:
            sharpe = statistics.mean(returns) / sd * math.sqrt(TRADING_DAYS_PER_YEAR)

    rs = [t.r_multiple for t in trades if t.r_multiple is not None]
    gross_win, gross_loss = sum(wins), abs(sum(losses))

    return {
        "strategy": strategy,
        "params": params,
        "trades": len(trades),
        "win_rate": round(len(wins) / len(trades) * 100, 2),
        "total_return_pct": round((final / cfg.initial_capital - 1) * 100, 2),
        "final_equity": round(final, 2),
        "profit_factor": round(gross_win / gross_loss, 3) if gross_loss > 0 else None,
        "expectancy": round(sum(pnls) / len(pnls), 2),
        "avg_r": round(sum(rs) / len(rs), 3) if rs else None,
        "sharpe": round(sharpe, 3),
        "max_drawdown_pct": dd_pct,
        "max_drawdown_abs": dd_abs,
        "total_costs": round(sum(t.costs for t in trades), 2),
        "bars": len(bars),
        "equity_curve": [round(v, 2) for v in curve],
        "trade_list": [
            {
                "entry_date": t.entry_date, "exit_date": t.exit_date,
                "side": t.side, "entry": round(t.entry_price, 4),
                "exit": round(t.exit_price, 4) if t.exit_price else None,
                "pnl": round(t.pnl, 2), "r": t.r_multiple, "reason": t.exit_reason,
            }
            for t in trades[:200]
        ],
    }


def _empty_result(cfg: BacktestConfig, *, reason: str, strategy: str = "",
                  params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "strategy": strategy, "params": params or {}, "trades": 0, "win_rate": 0,
        "total_return_pct": 0, "final_equity": cfg.initial_capital,
        "profit_factor": None, "expectancy": 0, "avg_r": None, "sharpe": 0,
        "max_drawdown_pct": 0, "max_drawdown_abs": 0, "total_costs": 0,
        "bars": 0, "equity_curve": [], "trade_list": [], "reason": reason,
    }


# ---------------------------------------------------------------------------
# Validation — the part that decides whether the result means anything
# ---------------------------------------------------------------------------


def _param_combinations(grid: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
    keys = list(grid.keys())
    return [dict(zip(keys, combo)) for combo in itertools.product(*(grid[k] for k in keys))]


def _expected_max_sharpe(n_trials: int, variance: float) -> float:
    """Expected best Sharpe from `n_trials` strategies that all have ZERO edge.

    The benchmark a real result has to clear. Standard approximation from the
    expected value of the maximum of n normal draws.
    """
    if n_trials <= 1 or variance <= 0:
        return 0.0
    euler = 0.5772156649
    z1 = _inv_norm(1 - 1.0 / n_trials)
    z2 = _inv_norm(1 - 1.0 / (n_trials * math.e))
    return math.sqrt(variance) * ((1 - euler) * z1 + euler * z2)


def _inv_norm(p: float) -> float:
    """Inverse standard normal CDF (Acklam's rational approximation)."""
    if p <= 0 or p >= 1:
        return 0.0
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p > phigh:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    q = p - 0.5
    r = q * q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)


def deflated_sharpe(best_sharpe: float, all_sharpes: List[float],
                    n_observations: int) -> Dict[str, Any]:
    """Discount a Sharpe ratio by how many attempts it took to find it.

    Test 47 parameter combinations on random data and the best one will look
    good — that is arithmetic, not skill. This reports the Sharpe a zero-edge
    search would have produced with the same number of trials, and whether the
    observed best actually clears it.

    Nothing in the retail segment does this, and it is the difference between
    "my backtest made 40%" and "my backtest made 40% and that is more than
    luck would have given me".
    """
    n_trials = len(all_sharpes)
    if n_trials < 2 or n_observations < 10:
        return {
            "n_trials": n_trials, "best_sharpe": round(best_sharpe, 3),
            "expected_max_sharpe_if_no_edge": None, "deflated_sharpe": None,
            "significant": None,
            "verdict": "Too few trials or observations to judge significance.",
        }

    variance = statistics.variance(all_sharpes) if n_trials > 1 else 0.0
    expected_max = _expected_max_sharpe(n_trials, variance)
    excess = best_sharpe - expected_max
    # Standard error of a Sharpe estimate over n observations.
    se = math.sqrt((1 + 0.5 * best_sharpe ** 2) / max(n_observations - 1, 1))
    z = excess / se if se > 0 else 0.0
    significant = z > 1.645  # one-sided 95%

    # The correction estimates the no-edge benchmark from the SPREAD of the
    # trial Sharpes, and that spread is itself badly estimated from a handful of
    # trials. Measured on pure random walks this screens out most false
    # positives but not all of them, and the misses cluster at low trial counts.
    # Say so, rather than let a "significant" badge read as proof.
    low_power = n_trials < 20

    return {
        "n_trials": n_trials,
        "best_sharpe": round(best_sharpe, 3),
        "expected_max_sharpe_if_no_edge": round(expected_max, 3),
        "deflated_sharpe": round(excess, 3),
        "z_score": round(z, 3),
        "significant": bool(significant),
        "low_power": low_power,
        "verdict": (
            f"Tested {n_trials} parameter combinations. A completely edgeless system "
            f"searched that many times would be expected to produce a best Sharpe of "
            f"{expected_max:.2f} by luck alone. The best observed Sharpe is "
            f"{best_sharpe:.2f}, so "
            + ("it does clear that bar — the result survives the correction for how "
               "hard you looked." if significant else
               "it does NOT clear that bar. This result is consistent with having "
               "tried enough combinations to find a good-looking one; treat it as "
               "unproven, not as an edge.")
            + (" Caveat: with fewer than 20 trials this correction is itself "
               "imprecise — clearing the bar here is weak evidence, not proof. "
               "Confirm with the walk-forward result before trusting it."
               if low_power else "")
        ),
    }


def run_validated_backtest(bars: List[dict], strategy: str,
                           config: Optional[BacktestConfig] = None,
                           *, oos_fraction: float = 0.3,
                           param_grid: Optional[Dict[str, List[Any]]] = None) -> Dict[str, Any]:
    """Optimise in-sample, then evaluate ONCE out-of-sample.

    The out-of-sample window is held back from the search entirely. If the
    in-sample result is strong and the out-of-sample one collapses, the
    parameters were fitted to noise — and that is the single most useful thing a
    backtest can tell somebody.
    """
    cfg = config or BacktestConfig()
    spec = STRATEGIES.get(strategy)
    if not spec:
        return {"error": f"Unknown strategy '{strategy}'."}
    if len(bars) < 200:
        return {"error": "Need at least 200 bars to split in-sample / out-of-sample."}

    split = int(len(bars) * (1 - oos_fraction))
    in_sample, out_sample = bars[:split], bars[split:]

    grid = param_grid or spec["grid"]
    combos = _param_combinations(grid)

    is_results = [run_backtest(in_sample, strategy, p, cfg) for p in combos]
    scored = [r for r in is_results if r["trades"] >= 5]
    if not scored:
        return {"error": "No parameter set produced enough trades in-sample."}

    best = max(scored, key=lambda r: r["sharpe"])
    oos = run_backtest(out_sample, strategy, best["params"], cfg)

    sharpes = [r["sharpe"] for r in scored]
    snooping = deflated_sharpe(best["sharpe"], sharpes, len(in_sample))

    degradation = None
    if best["sharpe"] != 0:
        degradation = round((oos["sharpe"] - best["sharpe"]) / abs(best["sharpe"]) * 100, 1)

    return {
        "strategy": strategy,
        "best_params": best["params"],
        "in_sample": {k: v for k, v in best.items() if k not in ("equity_curve", "trade_list")},
        "out_of_sample": {k: v for k, v in oos.items() if k != "trade_list"},
        "in_sample_bars": len(in_sample),
        "out_of_sample_bars": len(out_sample),
        "sharpe_degradation_pct": degradation,
        "data_snooping": snooping,
        "all_trials": [
            {"params": r["params"], "sharpe": r["sharpe"], "trades": r["trades"],
             "return_pct": r["total_return_pct"]}
            for r in sorted(scored, key=lambda r: r["sharpe"], reverse=True)
        ],
        "costs": {"commission_pct": cfg.commission_pct, "slippage_pct": cfg.slippage_pct},
        "warning": (
            "Out-of-sample performance collapsed relative to in-sample. The "
            "parameters are fitted to noise in the training window."
            if degradation is not None and degradation < -50 else None
        ),
    }


def walk_forward(bars: List[dict], strategy: str,
                 config: Optional[BacktestConfig] = None,
                 *, windows: int = 5, train_fraction: float = 0.7,
                 param_grid: Optional[Dict[str, List[Any]]] = None) -> Dict[str, Any]:
    """Rolling re-optimisation: the honest version of "it worked historically".

    Each window optimises on its own training slice and trades the slice that
    follows with those parameters, then rolls forward. The concatenated
    out-of-sample results are what the system would plausibly have returned if
    it had actually been traded, re-tuned periodically — not what it returns
    with one parameter set chosen with full hindsight.
    """
    cfg = config or BacktestConfig()
    spec = STRATEGIES.get(strategy)
    if not spec:
        return {"error": f"Unknown strategy '{strategy}'."}

    n_windows = max(2, min(12, int(windows)))
    window_size = len(bars) // n_windows
    if window_size < 100:
        return {"error": "Not enough bars for the requested number of walk-forward windows."}

    grid = param_grid or spec["grid"]
    combos = _param_combinations(grid)

    segments: List[Dict[str, Any]] = []
    equity = cfg.initial_capital
    for w in range(n_windows - 1):
        train = bars[w * window_size:(w + 1) * window_size]
        test = bars[(w + 1) * window_size:(w + 2) * window_size]
        if len(test) < 30:
            break

        train_cfg = BacktestConfig(**{**cfg.__dict__, "initial_capital": equity})
        trials = [run_backtest(train, strategy, p, train_cfg) for p in combos]
        usable = [r for r in trials if r["trades"] >= 3]
        if not usable:
            continue
        best = max(usable, key=lambda r: r["sharpe"])
        test_result = run_backtest(test, strategy, best["params"], train_cfg)
        equity = test_result["final_equity"]

        segments.append({
            "window": w + 1,
            "params": best["params"],
            "train_sharpe": best["sharpe"],
            "test_sharpe": test_result["sharpe"],
            "test_return_pct": test_result["total_return_pct"],
            "test_trades": test_result["trades"],
            "equity_after": round(equity, 2),
        })

    if not segments:
        return {"error": "Walk-forward produced no usable windows."}

    test_sharpes = [s["test_sharpe"] for s in segments]
    profitable = sum(1 for s in segments if s["test_return_pct"] > 0)
    # How much of the in-sample edge survives being applied forward. Below ~0.5
    # is the classic signature of curve fitting.
    train_avg = statistics.mean([s["train_sharpe"] for s in segments])
    efficiency = round(statistics.mean(test_sharpes) / train_avg, 3) if train_avg > 0 else None

    return {
        "strategy": strategy,
        "windows": len(segments),
        "segments": segments,
        "final_equity": round(equity, 2),
        "total_return_pct": round((equity / cfg.initial_capital - 1) * 100, 2),
        "avg_test_sharpe": round(statistics.mean(test_sharpes), 3),
        "profitable_windows": profitable,
        "consistency_pct": round(profitable / len(segments) * 100, 1),
        "walk_forward_efficiency": efficiency,
        "verdict": (
            "Parameters hold up when applied forward."
            if efficiency is not None and efficiency >= 0.5 else
            "The edge largely disappears when the parameters are applied forward — "
            "the classic signature of curve fitting."
        ),
    }
