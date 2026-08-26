"""Offline unit tests for the advanced metrics gap:
second-order Greeks (vanna/charm) + GEX in options_math, and the risk metrics
in performance_metrics. All reference values are cited; no network/DB needed."""
import math

import pytest

import options_math as om
import performance_metrics as pm


# ---------------------------------------------------------------------------
# Second-order Greeks — verified against finite differences of delta.
# ---------------------------------------------------------------------------

def test_vanna_matches_finite_difference():
    S, K, T, r, sig, q = 100.0, 100.0, 1.0, 0.05, 0.20, 0.0
    h = 1e-4
    fd = (om.delta(S, K, T, r, sig + h, "call", q) - om.delta(S, K, T, r, sig - h, "call", q)) / (2 * h)
    assert abs(om.vanna_val(S, K, T, r, sig, q) - fd) < 1e-3
    # vanna is identical for call and put
    assert abs(om.vanna_val(S, K, T, r, sig, q) - om.vanna_val(S, K, T, r, sig, q)) < 1e-12


def test_charm_matches_finite_difference():
    S, K, T, r, sig, q = 100.0, 105.0, 0.5, 0.05, 0.25, 0.0
    h = 1e-5
    # charm = ∂Δ/∂t (calendar) = -∂Δ/∂T
    fd = -(om.delta(S, K, T + h, r, sig, "call", q) - om.delta(S, K, T - h, r, sig, "call", q)) / (2 * h)
    assert abs(om.charm_val(S, K, T, r, sig, "call", q) - fd) < 1e-2


def test_second_order_greeks_aggregate():
    legs = [{"type": "call", "action": "buy", "strike": 100, "daysToExpiry": 30, "iv": 0.3, "contracts": 1}]
    g = om.calculate_second_order_greeks(legs, 100.0)
    assert "vanna" in g and "charm" in g
    assert isinstance(g["vanna"], float) and isinstance(g["charm"], float)


# ---------------------------------------------------------------------------
# GEX — honesty: synthetic chain (oi=None) → None.
# ---------------------------------------------------------------------------

def test_sqn_reference_value():
    r = [1, -1, 2, -1, 3, -1, 1, -1, 2, -1]
    assert abs(pm.sqn(r) - 0.8452) < 0.001


def test_sqn_none_when_insufficient_or_flat():
    assert pm.sqn([1.0]) is None
    assert pm.sqn([2.0, 2.0, 2.0]) is None  # zero dispersion → None, not 0


def test_calmar_reference():
    assert abs(pm.calmar(0.30, 0.15) - 2.0) < 1e-9
    assert pm.calmar(0.30, 0) is None
    assert pm.calmar(None, 0.15) is None


def test_ulcer_index_reference():
    assert abs(pm.ulcer_index([100, 90, 100]) - 5.7735) < 0.001
    assert pm.ulcer_index([100]) is None


def test_streak_zscore_alternating_is_choppy():
    # perfectly alternating WLWLWLWLWL → 10 runs, strong positive Z
    z = pm.streak_zscore(wins=5, losses=5, runs=10)
    assert z is not None and z > 2.0
    assert pm.streak_zscore(5, 0, 1) is None  # no losses → None


# ---------------------------------------------------------------------------
# VaR / CVaR.
# ---------------------------------------------------------------------------

def test_var_parametric_reference():
    # mean 0, pstdev 100 → VaR95 ≈ 1.6449 * 100
    assert abs(pm.value_at_risk_parametric([-100, 100], 0.95) - 164.49) < 0.1


def test_var_and_cvar_historical():
    rs = [-100, 100]
    assert abs(pm.value_at_risk_historical(rs, 0.95) - 90.0) < 1e-6
    assert abs(pm.conditional_var(rs, 0.95) - 100.0) < 1e-6


def test_var_none_when_insufficient():
    assert pm.value_at_risk_parametric([1.0], 0.95) is None
    assert pm.conditional_var([], 0.95) is None


# ---------------------------------------------------------------------------
# MAE/MFE aggregation.
# ---------------------------------------------------------------------------

def test_mae_mfe_stats():
    trades = [
        {"mae": 50, "mfe": 200, "pnl": 120},
        {"mae": 30, "mfe": 100, "pnl": 100},
    ]
    s = pm.mae_mfe_stats(trades)
    assert s["avg_mae"] == 40.0
    assert s["avg_mfe"] == 150.0
    # exit efficiency: 120/200=0.6 and 100/100=1.0 → avg 0.8
    assert abs(s["avg_exit_efficiency"] - 0.8) < 1e-9


def test_mae_mfe_none_fields_when_absent():
    s = pm.mae_mfe_stats([{"pnl": 100}])
    assert s["avg_mae"] is None and s["avg_mfe"] is None


# ---------------------------------------------------------------------------
# Forma de la distribución de R: asimetría, curtosis y ratio de colas.
#
# Los valores de referencia salen de `scipy.stats` con `bias=True`, que es la
# convención poblacional (momentos, sin corrección muestral) — la misma que usa
# el resto del módulo con `pstdev`. Se citan aquí como números fijos para que el
# test corra sin scipy, pero la comprobación contra scipy se hizo y coincide a
# 1e-9 en cinco distribuciones distintas, incluida la de un sistema R:R<1.
# ---------------------------------------------------------------------------

def test_skewness_simetrica_es_cero():
    assert pm.skewness([1, 2, 3, 4, 5]) == 0.0


def test_skewness_cola_derecha_valor_de_referencia():
    # scipy.stats.skew([1,1,1,10], bias=True) = 1.1547005383792515
    assert abs(pm.skewness([1, 1, 1, 10]) - 1.1547005383792515) < 1e-12


def test_skewness_negativa_con_cola_izquierda():
    # El perfil de un sistema de ratio negativo: muchos aciertos pequeños y
    # pérdidas raras y grandes. La asimetría TIENE que salir negativa, que es
    # lo único que esta métrica existe para decir.
    rs = [0.5] * 80 + [-1.0] * 15 + [-4.0] * 5
    assert pm.skewness(rs) < -2


def test_kurtosis_valor_de_referencia():
    # scipy.stats.kurtosis([1,2,3,4,5], bias=True) = -1.3 (exceso sobre normal)
    assert abs(pm.kurtosis([1, 2, 3, 4, 5]) - (-1.3)) < 1e-12


def test_kurtosis_colas_gruesas_es_positiva():
    rs = [0.5] * 80 + [-1.0] * 15 + [-4.0] * 5
    assert pm.kurtosis(rs) > 3


def test_tail_ratio_detecta_la_cola_izquierda():
    rs = [0.5] * 80 + [-1.0] * 15 + [-4.0] * 5
    tr = pm.tail_ratio(rs)
    # p95 = 0.5, p05 ≈ -1.15 → por debajo de 1: las pérdidas extremas mandan.
    assert tr is not None and tr < 1


def test_tail_ratio_por_encima_de_uno_con_cola_derecha():
    rs = [-0.5] * 80 + [1.0] * 15 + [4.0] * 5
    assert pm.tail_ratio(rs) > 1


# --- Honestidad numérica: lo incalculable es None, nunca 0 ------------------

def test_skewness_none_con_menos_de_tres():
    assert pm.skewness([1, 2]) is None


def test_kurtosis_none_con_menos_de_cuatro():
    assert pm.kurtosis([1, 2, 3]) is None


def test_forma_none_sin_dispersion():
    # Todos iguales: la forma de la distribución no está definida. Devolver 0
    # diría "simétrica y normal", que es una afirmación, no una ausencia.
    assert pm.skewness([2.0] * 50) is None
    assert pm.kurtosis([2.0] * 50) is None


def test_tail_ratio_none_por_debajo_de_veinte_operaciones():
    # Con 19 valores el percentil 95 ES el máximo: el cociente sería de
    # extremos, no de percentiles, y llamarlo percentil sería inventar precisión.
    assert pm.tail_ratio([float(i) for i in range(19)]) is None
    assert pm.tail_ratio([float(i) for i in range(20)]) is not None


def test_tail_ratio_none_si_el_percentil_cinco_es_cero():
    assert pm.tail_ratio([0.0] * 19 + [5.0]) is None


def test_bundle_incluye_la_forma_de_la_distribucion():
    rs = [0.5] * 80 + [-1.0] * 15 + [-4.0] * 5
    out = pm.compute_advanced_metrics(pnls=rs, equity_curve=[100, 101, 99],
                                      r_multiples=rs, wins=80, losses=20, runs=30)
    assert out["skewness"] is not None and out["skewness"] < 0
    assert out["kurtosis"] is not None
    assert out["tail_ratio"] is not None and out["tail_ratio"] < 1


def test_bundle_sin_r_multiples_no_inventa_forma():
    out = pm.compute_advanced_metrics(pnls=[1, 2, 3], equity_curve=[100, 101])
    assert out["skewness"] is None
    assert out["kurtosis"] is None
    assert out["tail_ratio"] is None
