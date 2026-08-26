"""Advanced performance & risk metrics — the professional-grade gap.

Pure standard-library (math/statistics) so it imports without DB or network and
its unit tests run fully offline. Complements `performance.py` (which already has
Sharpe/Sortino/expectancy/profit_factor/max_drawdown) with the metrics a trading
desk expects: SQN, Calmar, Ulcer Index, streak Z-score, VaR and CVaR, plus
MAE/MFE aggregation.

HONESTY RULES (fixed by tests, same as the rest of the codebase):
- Anything that cannot be computed returns **None**, never 0 (an SQN with <2 trades,
  a Calmar with zero drawdown, a Z-score with a degenerate run count).
- No fabricated numbers. Callers show "—"/None in the UI, not a misleading 0.

Reference values are cited in each docstring so the metrics stay auditable.
"""
from __future__ import annotations

import math
import statistics
from typing import Any, Dict, List, Optional

# Standard normal quantiles for common confidence levels (one-tailed).
_Z = {0.90: 1.2816, 0.95: 1.6449, 0.975: 1.9600, 0.99: 2.3263}


def _clean(nums: List[float]) -> List[float]:
    """Drop None/NaN so a single bad value can't poison a metric."""
    out = []
    for x in nums or []:
        if x is None:
            continue
        try:
            f = float(x)
        except (TypeError, ValueError):
            continue
        if f == f:  # not NaN
            out.append(f)
    return out


def sqn(r_multiples: List[float]) -> Optional[float]:
    """System Quality Number (Van Tharp) = mean(R)/std(R) * sqrt(N), N=min(len,100).

    Van Tharp caps N at 100 so a system can't inflate its score by taking more
    trades. Scale: <1.5 hard to trade, 1.6-1.9 average, 2.0-2.9 good, 3.0-5.0
    excellent, 5.0-6.9 superb, >7 "holy grail".
    Reference: R = [1,-1,2,-1,3,-1,1,-1,2,-1] → mean 0.4, pop-stdev ≈ 1.4967,
    N=10 → SQN ≈ 0.4/1.4967*sqrt(10) ≈ 0.8452.
    Returns None with <2 trades or zero dispersion (incalculable, not 0).
    """
    rs = _clean(r_multiples)
    n = len(rs)
    if n < 2:
        return None
    sd = statistics.pstdev(rs)
    if sd == 0:
        return None
    capped_n = min(n, 100)
    return statistics.mean(rs) / sd * math.sqrt(capped_n)


def calmar(cagr: Optional[float], max_drawdown: Optional[float]) -> Optional[float]:
    """Calmar = annualized return / |max drawdown|. max_drawdown as a fraction
    (0.25 = 25%) or return-unit magnitude; must be non-zero. None if DD is 0/None.
    Reference: cagr=0.30, maxDD=0.15 → 2.0."""
    if cagr is None or max_drawdown in (None, 0):
        return None
    return cagr / abs(max_drawdown)


def ulcer_index(equity_curve: List[float]) -> Optional[float]:
    """Ulcer Index = sqrt(mean(Dd_i^2)) where Dd_i is the % drawdown from the
    running peak. Penalizes depth AND duration of drawdowns (unlike max DD).
    Reference: [100,90,100] → drawdowns [0,-10%,0] → sqrt((0+100+0)/3) ≈ 5.7735.
    Returns None for <2 points."""
    eq = _clean(equity_curve)
    if len(eq) < 2:
        return None
    peak = eq[0]
    sq = []
    for v in eq:
        if v > peak:
            peak = v
        dd = 0.0 if peak == 0 else (v - peak) / peak * 100.0
        sq.append(dd * dd)
    return math.sqrt(sum(sq) / len(sq))


def streak_zscore(wins: int, losses: int, runs: int) -> Optional[float]:
    """Z-score of the runs test (Ralph Vince): measures dependency between
    consecutive trades. |Z|>1.96 → >95% chance results are not independent
    (Z<0 → streaks/trends; Z>0 → choppy/mean-reverting).
    Z = (N*(R-0.5) - 2*W*L) / sqrt( 2*W*L*(2*W*L - N) / (N-1) ).
    Returns None on degenerate inputs (N<2, no wins or no losses, div by 0)."""
    n = wins + losses
    if n < 2 or wins == 0 or losses == 0:
        return None
    x = 2 * wins * losses
    denom = x * (x - n) / (n - 1)
    if denom <= 0:
        return None
    return (n * (runs - 0.5) - x) / math.sqrt(denom)


def _percentile(sorted_vals: List[float], p: float) -> float:
    """Linear-interpolation percentile, p in [0,1]. Assumes sorted input."""
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    idx = p * (len(sorted_vals) - 1)
    lo = int(math.floor(idx))
    hi = int(math.ceil(idx))
    if lo == hi:
        return sorted_vals[lo]
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def value_at_risk_parametric(returns: List[float], confidence: float = 0.95) -> Optional[float]:
    """Parametric (Gaussian) VaR as a POSITIVE loss magnitude at `confidence`.
    VaR = z_alpha * sigma - mean. Positive = expected loss threshold.
    Reference: returns with mean 0 and stdev 100 at 95% → ~164.49.
    Returns None with <2 returns."""
    rs = _clean(returns)
    if len(rs) < 2:
        return None
    z = _Z.get(round(confidence, 3), _Z[0.95])
    return z * statistics.pstdev(rs) - statistics.mean(rs)


def value_at_risk_historical(returns: List[float], confidence: float = 0.95) -> Optional[float]:
    """Historical VaR as a POSITIVE loss magnitude = -(quantile at 1-confidence).
    Returns None with <2 returns."""
    rs = _clean(returns)
    if len(rs) < 2:
        return None
    q = _percentile(sorted(rs), 1 - confidence)
    return -q


def conditional_var(returns: List[float], confidence: float = 0.95) -> Optional[float]:
    """CVaR / Expected Shortfall = average loss in the tail beyond VaR, as a
    POSITIVE loss magnitude. Returns None if <2 returns or the tail is empty."""
    rs = _clean(returns)
    if len(rs) < 2:
        return None
    threshold = _percentile(sorted(rs), 1 - confidence)
    tail = [x for x in rs if x <= threshold]
    if not tail:
        return None
    return -statistics.mean(tail)


def mae_mfe_stats(trades: List[Dict[str, Any]]) -> Optional[Dict[str, Optional[float]]]:
    """Aggregate MAE/MFE and exit efficiency across trades.
    Each trade may carry `mae` (max adverse excursion, >=0), `mfe` (max favorable
    excursion, >=0) and realized `pnl`. Exit efficiency = captured PnL / MFE.
    Returns averages, or None fields where the input is absent (never 0)."""
    if not trades:
        return None
    maes = _clean([t.get("mae") for t in trades])
    mfes = _clean([t.get("mfe") for t in trades])
    effs = []
    for t in trades:
        mfe = t.get("mfe")
        pnl = t.get("pnl")
        if mfe not in (None, 0) and pnl is not None:
            try:
                effs.append(max(0.0, min(1.0, float(pnl) / float(mfe))))
            except (TypeError, ValueError, ZeroDivisionError):
                continue
    return {
        "avg_mae": round(statistics.mean(maes), 4) if maes else None,
        "avg_mfe": round(statistics.mean(mfes), 4) if mfes else None,
        "avg_exit_efficiency": round(statistics.mean(effs), 4) if effs else None,
    }


def _momentos(vals: List[float]) -> Optional[tuple]:
    """(media, m2, m3, m4) centrados y poblacionales, o None si no hay dispersión.

    Poblacionales, no muestrales, por coherencia con el resto del módulo: `sqn`
    y `value_at_risk_parametric` ya usan `pstdev`. Mezclar las dos convenciones
    en el mismo panel daría dos desviaciones distintas para la misma serie.
    """
    n = len(vals)
    if n < 2:
        return None
    mu = statistics.mean(vals)
    m2 = sum((x - mu) ** 2 for x in vals) / n
    if m2 <= 0:
        return None  # todos iguales: la forma de la distribución es indefinida
    m3 = sum((x - mu) ** 3 for x in vals) / n
    m4 = sum((x - mu) ** 4 for x in vals) / n
    return mu, m2, m3, m4


def skewness(r_multiples: List[float]) -> Optional[float]:
    """Asimetría de la distribución de R-múltiplos (momento poblacional g1).

    g1 = m3 / m2^1.5. Negativa = cola izquierda: muchos aciertos pequeños y
    pérdidas ocasionales grandes, que es el perfil de toda estrategia de ratio
    menor que 1. Es el número que separa «cobro una prima de riesgo real» de
    «todavía no ha llegado la cola».

    Referencias: [1,2,3,4,5] simétrico → 0.0 · [1,1,1,10] → +1.1547.
    None con menos de 3 valores o sin dispersión.
    """
    rs = _clean(r_multiples)
    if len(rs) < 3:
        return None
    m = _momentos(rs)
    if m is None:
        return None
    _, m2, m3, _ = m
    return m3 / (m2 ** 1.5)


def kurtosis(r_multiples: List[float]) -> Optional[float]:
    """Curtosis EN EXCESO de los R-múltiplos (g2 = m4/m2² − 3).

    Cero es la normal. Positiva = colas más gruesas de lo normal: los extremos
    pasan más a menudo de lo que sugiere la desviación típica, y por tanto un
    Sharpe alto puede estar escondiendo un riesgo que el Sharpe no penaliza.

    Referencias: [1,2,3,4,5] → −1.3 · una normal → ~0.
    None con menos de 4 valores o sin dispersión.
    """
    rs = _clean(r_multiples)
    if len(rs) < 4:
        return None
    m = _momentos(rs)
    if m is None:
        return None
    _, m2, _, m4 = m
    return m4 / (m2 ** 2) - 3.0


# Por debajo de esto, el «percentil 95» de una muestra es sencillamente su
# máximo: con 20 valores el índice 0.95×19 = 18.05 ya cae entre los dos últimos.
# Devolver un cociente de extremos llamándolo percentil sería inventar precisión.
_MIN_COLA = 20


def tail_ratio(r_multiples: List[float]) -> Optional[float]:
    """Percentil 95 / |percentil 5| de los R-múltiplos.

    Por debajo de 1 la cola izquierda pesa más que la derecha: las pérdidas
    extremas son mayores que las ganancias extremas. Es la comprobación directa
    de si un win rate alto está pagando una prima real o aplazando el golpe.

    None con menos de 20 operaciones (con menos, el percentil 95 es el máximo y
    el cociente no significa lo que dice) o si el percentil 5 es cero.
    """
    rs = _clean(r_multiples)
    if len(rs) < _MIN_COLA:
        return None
    ordenados = sorted(rs)
    p95 = _percentile(ordenados, 0.95)
    p05 = _percentile(ordenados, 0.05)
    if p05 == 0:
        return None
    return p95 / abs(p05)


def compute_advanced_metrics(pnls: List[float], equity_curve: List[float],
                             r_multiples: Optional[List[float]] = None,
                             wins: int = 0, losses: int = 0, runs: int = 0,
                             cagr: Optional[float] = None,
                             max_drawdown: Optional[float] = None) -> Dict[str, Optional[float]]:
    """Bundle the advanced metrics into one dict for the analytics payload.
    Every value is None when incalculable — the UI must render None as '—'."""
    return {
        "sqn": sqn(r_multiples if r_multiples is not None else []),
        "calmar_ratio": calmar(cagr, max_drawdown),
        "ulcer_index": ulcer_index(equity_curve),
        "streak_zscore": streak_zscore(wins, losses, runs),
        "var_95": value_at_risk_historical(pnls, 0.95),
        "var_95_parametric": value_at_risk_parametric(pnls, 0.95),
        "cvar_95": conditional_var(pnls, 0.95),
        # Forma de la distribución de R. Van sobre R-múltiplos y no sobre P&L a
        # propósito: normalizan el tamaño de posición, así que describen la
        # ESTRATEGIA y no el tamaño con que se operó. Las tres son invariantes
        # de escala, de modo que sólo difieren de la versión en dinero cuando el
        # riesgo por operación cambia — que es justo cuando importa.
        "skewness": skewness(r_multiples if r_multiples is not None else []),
        "kurtosis": kurtosis(r_multiples if r_multiples is not None else []),
        "tail_ratio": tail_ratio(r_multiples if r_multiples is not None else []),
    }
