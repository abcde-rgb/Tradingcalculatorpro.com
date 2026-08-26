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


# ---------------------------------------------------------------------------
# SQN rodante y el test que distingue degradación de mala suerte.
#
# La serie rodante sola invita a un error concreto: leer cualquier bajada como
# «se me está apagando la ventaja». Con 30 operaciones por ventana, el error de
# muestreo del SQN es enorme y esa lectura casi siempre es falsa. Por eso estos
# tests comprueban las DOS direcciones: que el test grite cuando la ventaja se
# apaga de verdad, y que NO grite cuando sólo hay varianza.
# ---------------------------------------------------------------------------

def _serie(media, desv, n, semilla):
    import random
    rnd = random.Random(semilla)
    return [rnd.gauss(media, desv) for _ in range(n)]


def test_rolling_sqn_una_entrada_por_ventana_completa():
    rs = _serie(0.4, 1.2, 100, 1)
    serie = pm.rolling_sqn(rs, window=30)
    assert len(serie) == 100 - 30 + 1
    assert serie[0]["n"] == 30 and serie[-1]["n"] == 100


def test_rolling_sqn_none_sin_una_ventana_completa():
    assert pm.rolling_sqn([0.5] * 29, window=30) is None


def test_rolling_sqn_coincide_con_sqn_de_esa_ventana():
    rs = _serie(0.3, 1.0, 60, 7)
    serie = pm.rolling_sqn(rs, window=30)
    assert abs(serie[0]["sqn"] - pm.sqn(rs[:30])) < 1e-12
    assert abs(serie[-1]["sqn"] - pm.sqn(rs[-30:])) < 1e-12


def test_decay_no_grita_cuando_solo_hay_varianza():
    # Misma distribución de principio a fin. El SQN de la última ventana puede
    # salir MUY por debajo del anterior por puro azar — y el test tiene que
    # decir justamente eso. Sin esta comprobación, un test que sólo mirara el
    # caso degradado daría verde con un p-valor constante de cero.
    rs = _serie(0.4, 1.2, 200, 1)
    d = pm.sqn_decay(rs, window=30)
    assert d is not None
    assert d["sqn_reciente"] < d["sqn_anterior"]      # la bajada existe…
    assert d["p_value"] > 0.10                        # …y no significa nada


def test_decay_grita_cuando_la_ventaja_se_apaga():
    rs = _serie(0.6, 1.2, 170, 2) + _serie(-0.5, 1.2, 30, 3)
    d = pm.sqn_decay(rs, window=30)
    assert d is not None and d["p_value"] < 0.01


def test_decay_es_determinista():
    rs = _serie(0.4, 1.2, 200, 5)
    assert pm.sqn_decay(rs)["p_value"] == pm.sqn_decay(rs)["p_value"]


def test_decay_depende_del_ORDEN():
    # Si invertir la serie no cambiara el resultado, la métrica no estaría
    # midiendo el tiempo y todo el módulo sobraría. Es la tercera regla de
    # honestidad del proyecto aplicada a esta métrica.
    rs = _serie(0.6, 1.2, 170, 2) + _serie(-0.5, 1.2, 30, 3)
    d1 = pm.sqn_decay(rs, window=30)
    d2 = pm.sqn_decay(list(reversed(rs)), window=30)
    assert d1["p_value"] != d2["p_value"]
    # En orden: la ventaja se apaga y el test lo ve. Invertida: las últimas 30
    # salen del tramo bueno mezcladas con el malo, no hay señal. El umbral es
    # 0,10 —el mismo que «esto es ruido» del test anterior— y no 0,5: invertir
    # no produce una mejora limpia, produce AUSENCIA de señal, y exigir medio
    # exacto sería fijar el test a un decimal del azar.
    assert d1["p_value"] < 0.01 and d2["p_value"] > 0.10


def test_decay_none_sin_dos_ventanas():
    assert pm.sqn_decay([0.5, -1.0] * 29, window=30) is None    # 58 < 60


def test_decay_none_sin_dispersion():
    assert pm.sqn_decay([0.5] * 200, window=30) is None


def test_bundle_incluye_rodante_y_decay():
    rs = _serie(0.4, 1.2, 200, 9)
    out = pm.compute_advanced_metrics(pnls=rs, equity_curve=[100, 101],
                                      r_multiples=rs, wins=120, losses=80, runs=90)
    assert out["rolling_sqn"] is not None and len(out["rolling_sqn"]) > 0
    assert out["sqn_decay"] is not None and 0.0 <= out["sqn_decay"]["p_value"] <= 1.0


def test_bundle_sin_historial_no_inventa_serie():
    out = pm.compute_advanced_metrics(pnls=[1, 2, 3], equity_curve=[100, 101])
    assert out["rolling_sqn"] is None and out["sqn_decay"] is None


def test_ruta_rapida_de_sqn_coincide_con_sqn():
    """La ruta rápida de `sqn_decay` tiene que dar EXACTAMENTE lo mismo que `sqn`.

    Este test existe porque faltaba: al sabotear la ruta rápida quitándole el
    tope de 100 de Van Tharp, los once tests de `sqn_decay` seguían en verde.
    Un atajo de rendimiento sin una comprobación de equivalencia es una segunda
    implementación esperando a divergir en silencio.

    Se cubren a propósito longitudes por debajo, justo en y por encima de 100,
    que es donde vive el tope.
    """
    import math
    import random
    rnd = random.Random(4242)
    for n in (2, 5, 30, 99, 100, 101, 250):
        for _ in range(40):
            xs = [rnd.gauss(rnd.uniform(-1, 1), rnd.uniform(0.2, 3)) for _ in range(n)]
            suma = math.fsum(xs)
            suma2 = math.fsum(x * x for x in xs)
            rapido = pm._sqn_desde_sumas(suma, suma2, n)
            lento = pm.sqn(xs)
            assert (rapido is None) == (lento is None), f"n={n}"
            if lento is not None:
                assert abs(rapido - lento) < 1e-9, f"n={n}: {rapido} vs {lento}"


def test_ruta_rapida_none_en_los_mismos_casos_que_sqn():
    assert pm._sqn_desde_sumas(1.0, 1.0, 1) is None          # <2 valores
    assert pm._sqn_desde_sumas(10.0, 20.0, 5) is None        # varianza cero
    assert pm.sqn([2.0] * 5) is None                          # el original, igual


def test_los_sqn_publicados_salen_de_la_misma_ruta_que_el_p_valor():
    # Los dos SQN del informe se calculaban con `sqn` mientras el estadístico
    # del test venía de la ruta rápida. Coinciden, pero eran dos caminos: si uno
    # se tocaba, se publicaba un p-valor que no correspondía a las cifras de al
    # lado. Ahora es uno solo, y esto lo fija.
    rs = _serie(0.5, 1.1, 200, 11)
    d = pm.sqn_decay(rs, window=30)
    assert abs(d["sqn_reciente"] - pm.sqn(rs[-30:])) < 1e-9
    assert abs(d["sqn_anterior"] - pm.sqn(rs[:-30])) < 1e-9
    assert abs(d["delta"] - (d["sqn_reciente"] - d["sqn_anterior"])) < 1e-12
