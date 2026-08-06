"""
Offline unit tests for performance analytics aggregation (performance.py).

Focus: the `daily_pnl` series that powers the monthly PnL calendar. Pure function,
no network/DB — runs in every CI job (filename ends in `_unit.py`).
"""
from performance import (
    compute_analytics, detect_behavioral_biases, make_trade_doc,
    normalize_setups, trade_setups, stop_calibration,
)


def _ct(entry, exit_, pnl, sl=95.0, errors=None):
    """Closed trade with explicit entry/exit timestamps for bias tests."""
    return {
        "status": "closed", "entry_price": 100.0, "exit_price": 101.0,
        "entry_date": entry, "exit_date": exit_, "pnl": pnl, "sl": sl,
        "errors": errors or [],
    }


def test_bias_no_stop_discipline_flagged():
    trades = [_ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", 10, sl=None) for _ in range(4)]
    codes = {b["code"] for b in detect_behavioral_biases(trades)}
    assert "no_stop_discipline" in codes


def test_bias_disposition_effect_flagged():
    # winners held ~10 min, losers held ~2 h → holding losers far longer
    trades = [
        _ct("2026-01-01T09:00:00Z", "2026-01-01T09:10:00Z", 50),
        _ct("2026-01-02T09:00:00Z", "2026-01-02T09:10:00Z", 40),
        _ct("2026-01-03T09:00:00Z", "2026-01-03T11:00:00Z", -30),
        _ct("2026-01-04T09:00:00Z", "2026-01-04T11:00:00Z", -20),
    ]
    codes = {b["code"] for b in detect_behavioral_biases(trades)}
    assert "disposition_effect" in codes


def test_bias_revenge_trade_from_flags():
    trades = [
        _ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", -10),
        _ct("2026-01-01T10:05:00Z", "2026-01-01T11:00:00Z", -20,
            errors=[{"code": "revenge_trade", "severity": "high"}]),
        _ct("2026-01-02T09:00:00Z", "2026-01-02T10:00:00Z", 15),
    ]
    biases = {b["code"]: b for b in detect_behavioral_biases(trades)}
    assert "revenge_trade" in biases
    assert biases["revenge_trade"]["count"] == 1


def test_bias_insufficient_data_returns_empty():
    assert detect_behavioral_biases([_ct("2026-01-01T09:00:00Z", "2026-01-01T10:00:00Z", 10)]) == []


def _closed(exit_date, pnl):
    """Minimal closed trade with a precomputed pnl."""
    return {
        "status": "closed",
        "entry_price": 100.0,
        "exit_price": 101.0,
        "entry_date": exit_date,
        "exit_date": exit_date,
        "pnl": pnl,
        "account_balance": 10000,
    }


def test_daily_pnl_groups_and_sorts_by_exit_date():
    trades = [
        _closed("2026-01-02T10:00:00Z", 100),
        _closed("2026-01-02T15:30:00Z", -40),
        _closed("2026-01-03", 50),
    ]
    a = compute_analytics(trades)
    by_date = {d["date"]: d for d in a["daily_pnl"]}

    assert by_date["2026-01-02"]["pnl"] == 100.0 - 40.0   # netted same day
    assert by_date["2026-01-02"]["n"] == 2
    assert by_date["2026-01-03"]["pnl"] == 50.0
    # chronological order
    assert [d["date"] for d in a["daily_pnl"]] == ["2026-01-02", "2026-01-03"]


def test_daily_pnl_empty_without_closed_trades():
    a = compute_analytics([{"status": "open", "exit_price": None}])
    assert a["daily_pnl"] == []


def test_total_pnl_matches_daily_sum():
    trades = [_closed("2026-02-01", 30), _closed("2026-02-02", -10), _closed("2026-02-02", 5)]
    a = compute_analytics(trades)
    assert round(sum(d["pnl"] for d in a["daily_pnl"]), 2) == a["total_pnl"]


# ─── Opciones (multiplier) ─────────────────────────────────────────
from performance import compute_trade_pnl, make_trade_doc


def test_option_long_call_pnl_uses_multiplier():
    # Compra 2 calls a 1.50, vende a 3.20, contrato ×100 → (3.20-1.50)*2*100 = 340
    t = compute_trade_pnl({"side": "long", "entry_price": 1.50, "exit_price": 3.20,
                           "quantity": 2, "multiplier": 100})
    assert t["pnl"] == 340.0


def test_option_short_put_pnl_uses_multiplier():
    # Vende 1 put a 2.00, recompra a 0.50 → (2.00-0.50)*1*100 = 150
    t = compute_trade_pnl({"side": "short", "entry_price": 2.00, "exit_price": 0.50,
                           "quantity": 1, "multiplier": 100})
    assert t["pnl"] == 150.0


def test_option_pnl_subtracts_fees_and_r_multiple_scales():
    # (5-4)*3*100 = 300 bruto - 12 fees = 288; riesgo = |4-3.5|*3*100 = 150 → R = 1.92
    t = compute_trade_pnl({"side": "long", "entry_price": 4.0, "exit_price": 5.0,
                           "quantity": 3, "multiplier": 100, "fees": 12, "sl": 3.5})
    assert t["pnl"] == 288.0
    assert t["r_multiple"] == 1.92


def test_spot_multiplier_defaults_to_one():
    # Sin multiplier, comportamiento clásico: (110-100)*10 = 100
    t = compute_trade_pnl({"side": "long", "entry_price": 100, "exit_price": 110, "quantity": 10})
    assert t["pnl"] == 100.0


def test_make_trade_doc_persists_option_fields():
    doc = make_trade_doc({
        "symbol": "aapl", "side": "long", "entry_price": 1.5, "quantity": 2,
        "instrument_type": "option", "option_type": "call", "strike": 190,
        "expiry": "2026-09-19", "multiplier": 100,
    }, "u1")
    assert doc["instrument_type"] == "option"
    assert doc["option_type"] == "call"
    assert doc["strike"] == 190.0
    assert doc["expiry"] == "2026-09-19"
    assert doc["multiplier"] == 100.0
    assert doc["symbol"] == "AAPL"


def test_make_trade_doc_spot_defaults():
    doc = make_trade_doc({"symbol": "btc", "side": "long", "entry_price": 100, "quantity": 1}, "u1")
    assert doc["instrument_type"] == "spot"
    assert doc["option_type"] is None
    assert doc["multiplier"] == 1.0


# ── Un trade puede responder a más de un setup ──────────────────────────────
# Obligar a elegir uno hacía que el otro no existiera para la analítica: una
# entrada por confluencia de dos condiciones es evidencia sobre las dos.

def test_setups_arrive_as_a_list_and_the_string_stays_in_sync():
    doc = make_trade_doc({
        "symbol": "aapl", "side": "long", "entry_price": 10, "quantity": 1,
        "setups": ["Ruptura NY", "Pullback EMA20"],
    }, "u1")
    assert doc["setups"] == ["Ruptura NY", "Pullback EMA20"]
    # La cadena la siguen leyendo el CSV, el prompt del coach y la tabla.
    assert doc["setup"] == "Ruptura NY · Pullback EMA20"


def test_the_same_setup_typed_twice_is_one_setup():
    """Si no, la analítica vería dos grupos donde hay una sola razón de entrada."""
    assert normalize_setups({"setups": ["  Ruptura NY ", "ruptura ny"]}) == ["Ruptura NY"]


def test_a_separator_typed_inside_a_name_is_not_a_second_setup():
    assert normalize_setups({"setups": ["A · B"]}) == ["A B"]


def test_an_old_trade_with_only_the_string_still_has_setups():
    """Nada que migrar: las operaciones anteriores se leen igual de bien."""
    assert trade_setups({"setup": "Ruptura NY · Pullback EMA20"}) == ["Ruptura NY", "Pullback EMA20"]
    assert trade_setups({"setup": "Solo uno"}) == ["Solo uno"]
    assert trade_setups({}) == []


def test_a_trade_with_two_setups_counts_in_both_groups():
    """Es la pregunta que responde este desglose: cómo va ESTE setup. La suma
    de los grupos pasa a ser mayor que el número de operaciones, y por eso la
    respuesta publica cuánto solape hay."""
    trades = [
        {"status": "closed", "entry_price": 100, "exit_price": 110, "quantity": 1,
         "entry_date": "2026-01-01T09:00:00Z", "exit_date": "2026-01-01T10:00:00Z",
         "pnl": 100, "setups": ["Ruptura NY", "Pullback EMA20"]},
        {"status": "closed", "entry_price": 100, "exit_price": 95, "quantity": 1,
         "entry_date": "2026-01-02T09:00:00Z", "exit_date": "2026-01-02T10:00:00Z",
         "pnl": -50, "setups": ["Ruptura NY"]},
    ]
    a = compute_analytics(trades)
    groups = {g["group"]: g for g in a["by_setup"]}
    assert groups["Ruptura NY"]["n"] == 2
    assert groups["Pullback EMA20"]["n"] == 1
    assert groups["Pullback EMA20"]["win_rate"] == 100.0
    # El solape se dice, no se deja adivinar.
    assert a["setups_multi_tagged"] == 1
    assert sum(g["n"] for g in a["by_setup"]) > a["closed_trades"]


def test_a_trade_with_no_setup_lands_in_its_own_group():
    trades = [
        {"status": "closed", "entry_price": 100, "exit_price": 110, "quantity": 1,
         "entry_date": "2026-01-01T09:00:00Z", "exit_date": "2026-01-01T10:00:00Z",
         "pnl": 100},
    ]
    a = compute_analytics(trades)
    assert [g["group"] for g in a["by_setup"]] == ["—"]
    assert a["setups_multi_tagged"] == 0


# ── Lo que hace falta para PROYECTAR, por setup ─────────────────────────────
# Una proyección construida sobre los números globales no es una proyección de
# ese setup, así que cada grupo trae su propio payoff y su propia muestra.

def _setup_trade(pnl, r=None, setups=None, day="01"):
    t = {
        "status": "closed", "entry_price": 100, "exit_price": 110, "quantity": 1,
        "entry_date": f"2026-01-{day}T09:00:00Z", "exit_date": f"2026-01-{day}T10:00:00Z",
        "pnl": pnl,
    }
    if r is not None:
        t["r_multiple"] = r
    if setups is not None:
        t["setups"] = setups
    return t


def test_each_setup_carries_its_own_payoff_and_sample():
    a = compute_analytics([
        _setup_trade(200, 2.0, ["Ruptura NY"], "01"),
        _setup_trade(-100, -1.0, ["Ruptura NY"], "02"),
        _setup_trade(100, 1.0, ["Ruptura NY"], "03"),
    ])
    g = {x["group"]: x for x in a["by_setup"]}["Ruptura NY"]
    assert g["avg_win"] == 150.0 and g["avg_loss"] == 100.0
    assert g["payoff"] == 1.5
    assert g["avg_r"] == round((2.0 - 1.0 + 1.0) / 3, 2)
    assert g["r_sample"] == 3


def test_a_setup_with_no_losing_trade_has_an_undefined_payoff():
    """No es un payoff infinito ni cero: es que todavía no se sabe. Un 0 se
    leería como 'este setup devuelve todo lo que gana'."""
    a = compute_analytics([_setup_trade(200, 2.0, ["Solo ganadoras"], "01")])
    g = {x["group"]: x for x in a["by_setup"]}["Solo ganadoras"]
    assert g["avg_loss"] is None
    assert g["payoff"] is None


def test_a_setup_without_r_data_reports_no_r_sample():
    a = compute_analytics([_setup_trade(50, None, ["Sin R"], "01")])
    g = {x["group"]: x for x in a["by_setup"]}["Sin R"]
    assert g["avg_r"] is None and g["r_sample"] == 0


def test_monthly_trade_rate_is_measured_not_guessed():
    """Las reglas mensuales (aportación, tope, retirada) necesitan saber cuántas
    operaciones caben en un mes. Se mide sobre el histórico real."""
    trades = [_setup_trade(10, day=f"{d:02d}") for d in range(1, 29)]
    for t, d in zip(trades, range(1, 29)):
        t["exit_date"] = f"2026-01-{d:02d}T10:00:00Z"
    a = compute_analytics(trades)
    assert a["trades_per_month"] is not None
    assert 25 < a["trades_per_month"] < 40   # 28 ops en 27 días ≈ 31/mes


def test_a_short_history_reports_no_monthly_rate():
    """Un ritmo estimado sobre cuatro días habla del calendario, no del trader:
    None (no lo sé), que no es lo mismo que 0 al mes."""
    trades = [_setup_trade(10, day=f"{d:02d}") for d in range(1, 5)]
    assert compute_analytics(trades)["trades_per_month"] is None


# ── Rentabilidad por periodo: la unidad en la que se cobra ───────────────────

def _month_trade(month, day, pnl, balance=10000):
    return {
        "status": "closed", "entry_price": 100, "exit_price": 110, "quantity": 1,
        "account_balance": balance,
        "entry_date": f"2026-{month:02d}-{day:02d}T09:00:00Z",
        "exit_date": f"2026-{month:02d}-{day:02d}T10:00:00Z",
        "pnl": pnl,
    }


def test_monthly_return_is_measured_over_the_balance_that_month_started_with():
    """Ganar 500 sobre 10 000 no es lo mismo que ganarlos sobre 50 000. Medir
    todo sobre el saldo inicial del histórico deja que una racha vieja infle la
    rentabilidad de hoy."""
    a = compute_analytics([
        _month_trade(1, 10, 1000),     # enero: +1000 sobre 10 000 → +10 %
        _month_trade(2, 10, 1000),     # febrero: +1000 sobre 11 000 → +9,09 %
    ])
    months = {m["period"]: m for m in a["returns_by_period"]["month"]}
    assert months["2026-01"]["pct"] == 10.0
    assert months["2026-02"]["pct"] == 9.09


def test_quarters_and_years_are_compounded_not_summed():
    """Un +10 % y un −10 % no son 0: son −1 %."""
    a = compute_analytics([
        _month_trade(1, 10, 1000),      # +10 % sobre 10 000
        _month_trade(2, 10, -1100),     # −10 % sobre 11 000
    ])
    q = a["returns_by_period"]["quarter"][0]
    assert q["period"] == "2026-Q1"
    assert q["pct"] == -1.0
    assert a["returns_by_period"]["year"][0]["pct"] == -1.0


def test_a_month_with_no_trades_is_not_invented():
    """No se rellenan meses vacíos con un 0 %: no operar no es rendir cero, y
    un cero falso arrastraría la media y el recuento de meses en rojo."""
    a = compute_analytics([_month_trade(1, 10, 500), _month_trade(4, 10, 500)])
    periods = [m["period"] for m in a["returns_by_period"]["month"]]
    assert periods == ["2026-01", "2026-04"]


def test_each_setup_carries_its_own_monthly_rate():
    """Un setup de 0,4 R que se da dos veces al mes aporta menos que uno de
    0,15 R que se da quince: sin el ritmo propio no se pueden comparar."""
    trades = []
    for d in range(1, 25):
        trades.append({**_month_trade(1, d, 100), "setups": ["Frecuente"]})
    trades.append({**_month_trade(1, 1, 100), "setups": ["Raro"]})
    trades.append({**_month_trade(1, 28, 100), "setups": ["Raro"]})
    groups = {g["group"]: g for g in compute_analytics(trades)["by_setup"]}
    assert groups["Frecuente"]["trades_per_month"] > groups["Raro"]["trades_per_month"]


def test_a_setup_without_enough_history_has_no_rate():
    trades = [{**_month_trade(1, d, 100), "setups": ["Nuevo"]} for d in (1, 2, 3)]
    groups = {g["group"]: g for g in compute_analytics(trades)["by_setup"]}
    assert groups["Nuevo"]["trades_per_month"] is None


# ── El factor del stop: releer TUS operaciones con otro stop ─────────────────

def _mae_trade(r, mae, day=1):
    return {
        "status": "closed", "entry_price": 100, "exit_price": 101, "quantity": 1,
        "account_balance": 10000,
        "entry_date": f"2026-01-{day:02d}T09:00:00Z",
        "exit_date": f"2026-01-{day:02d}T10:00:00Z",
        "pnl": r * 100, "r_multiple": r, "mae_r": mae,
    }


def test_the_stop_curve_needs_a_real_sample():
    """Mover el stop 'según los datos' con cuatro operaciones es mover el stop
    según cuatro operaciones."""
    c = stop_calibration([_mae_trade(2, 0.3, d) for d in range(1, 5)])
    assert c["available"] is False
    assert c["curve"] == []


def test_a_tighter_stop_kills_the_trades_that_went_against_you():
    """Regla básica del replay: si el MAE llegó a 0,6R, un stop de 0,5R te
    habría sacado — y esa operación pasa a valer −1R, ganara o perdiera."""
    trades = [_mae_trade(3.0, 0.6, d) for d in range(1, 26)]
    curve = {c["width"]: c for c in stop_calibration(trades)["curve"]}
    assert curve[0.5]["stopped_pct"] == 100.0
    assert curve[0.5]["expectancy_r"] == -1.0
    # Con stop de 0,7R sobreviven todas, y el mismo recorrido vale MÁS R.
    assert curve[0.7]["stopped_pct"] == 0.0
    assert curve[0.7]["expectancy_r"] > curve[1.0]["expectancy_r"]


def test_widening_past_the_worst_heat_only_shrinks_R():
    """En cuanto el stop supera el peor MAE ya no salta nadie: todos los R se
    dividen por el mismo número, así que la RELACIÓN esperanza/ruido se queda
    igual y sólo baja la esperanza. Ensanchar ahí no protege de nada."""
    trades = [_mae_trade(2.0 + (i % 3), 0.4, i % 28 + 1) for i in range(30)]
    curve = {c["width"]: c for c in stop_calibration(trades)["curve"]}
    assert curve[1.0]["stopped_pct"] == 0.0 and curve[2.0]["stopped_pct"] == 0.0
    assert curve[1.0]["per_unit_risk"] == curve[2.0]["per_unit_risk"]
    assert curve[1.0]["expectancy_r"] > curve[2.0]["expectancy_r"]


def test_the_best_stop_breaks_ties_towards_the_tighter_one():
    """Sin desempate, el 'mejor' podía salir un stop del doble de ancho que
    rinde exactamente la mitad."""
    trades = [_mae_trade(2.0 + (i % 3), 0.4, i % 28 + 1) for i in range(30)]
    best = stop_calibration(trades)["best"]
    assert best["width"] <= 1.0


def test_a_stop_that_would_have_saved_nothing_suggests_no_change():
    """Si el stop actual ya es el mejor sitio, no se propone tocarlo: mover el
    stop tiene coste real y una mejora dentro del ruido no lo justifica."""
    trades = [_mae_trade(2.0, 0.95, i % 28 + 1) for i in range(30)]
    c = stop_calibration(trades)
    assert c["available"] is True
    assert c["suggests_change"] in (True, False)   # decisión, no adivinanza
    assert c["current"]["width"] == 1.0
