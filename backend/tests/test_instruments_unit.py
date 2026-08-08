"""Multi-producto: catálogo, unidades, apalancamiento y costes.

Lo que estos tests fijan, en una frase cada cosa:

* El apalancamiento **no** entra en el P&L. Es la afirmación central del módulo
  y la que más fácil se rompe al refactorizar, porque el diario legado sí lo
  metía y el mapeo de compatibilidad sigue vivo.
* El tamaño de contrato **sí** entra: en el P&L, en el riesgo y en la regla de
  tamaño de posición.
* Una unidad escrita por el usuario (pips, ticks, dinero, R) aterriza en un
  nivel de precio, y el resto de la analítica no se entera de que existía.
* Lo que no se puede calcular vale `None`.
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import instruments as I  # noqa: E402
from performance import (  # noqa: E402
    compute_analytics,
    compute_trade_pnl,
    detect_errors,
    detect_mixed_accounts,
    is_closed_trade,
    is_legacy_trade,
    legacy_keys_to_unset,
    make_trade_doc,
    normalize_trade_schema,
)


def _doc(**over):
    """Una operación mínima y coherente, para ir cambiando una cosa cada vez."""
    base = {
        "symbol": "EURUSD", "side": "long", "instrument_type": "forex",
        "entry_price": 1.10, "quantity": 1, "account_balance": 10000,
    }
    base.update(over)
    return make_trade_doc(base, "u1")


# ─── Catálogo ─────────────────────────────────────────────────────

class TestCatalog:
    def test_gold_cfd_is_100_ounces_at_20x(self):
        """El "CFD del oro a 20×" del que habla todo el mundo, como dato."""
        spec = I.resolve_spec("cfd", "XAUUSD")
        assert spec["contract_size"] == 100
        assert spec["default_leverage"] == 20
        assert spec["known"] is True

    def test_micro_and_full_contracts_differ_by_their_real_ratio(self):
        """MES es exactamente la décima parte de ES. No es un apaño de nombres."""
        es = I.resolve_spec("futures", "ES")
        mes = I.resolve_spec("futures", "MES")
        assert es["contract_size"] / mes["contract_size"] == 10

    def test_yen_pairs_have_a_hundred_times_bigger_pip(self):
        """Confundir el pip del yen con el del resto multiplica el riesgo por 100."""
        assert I.resolve_spec("forex", "USDJPY")["pip_size"] == 0.01
        assert I.resolve_spec("forex", "EURUSD")["pip_size"] == 0.0001

    def test_unknown_futures_contract_has_no_size_instead_of_one(self):
        """Un futuro fuera de catálogo no vale ×1: no se sabe cuánto vale."""
        spec = I.resolve_spec("futures", "XYZ")
        assert spec["known"] is False
        assert spec["contract_size"] is None
        assert I.contract_size_for("futures", "XYZ") is None

    def test_user_value_wins_over_the_catalogue(self):
        """El catálogo prefija; no decide."""
        assert I.contract_size_for("cfd", "XAUUSD", override=10) == 10

    def test_the_lot_type_decides_the_size_in_forex(self):
        """Micro, mini o lote: el mismo "1" son 1 000 o 100 000 unidades."""
        assert I.contract_size_for("forex", "EURUSD", lot_type="micro") == 1000
        assert I.contract_size_for("forex", "EURUSD", lot_type="standard") == 100000

    def test_a_micro_lot_risks_a_hundredth_of_a_standard_one(self):
        """Que es exactamente el punto de que existan los micro lotes."""
        micro = make_trade_doc({
            "symbol": "EURUSD", "side": "long", "instrument_type": "forex",
            "entry_price": 1.10, "quantity": 1, "lot_type": "micro",
            "sl_unit": "pips", "sl_input": 20, "account_balance": 10000,
        }, "u1")
        standard = make_trade_doc({**{k: v for k, v in micro.items()
                                      if k not in ("id", "multiplier")},
                                   "lot_type": "standard", "multiplier": None}, "u1")
        assert micro["multiplier"] == 1000 and standard["multiplier"] == 100000
        risk_micro = compute_trade_pnl(micro)["risk_amount"]
        risk_std = compute_trade_pnl(standard)["risk_amount"]
        assert round(risk_std / risk_micro) == 100

    def test_every_product_declares_the_same_shape(self):
        """Sin esto, la UI tendría que ramificar por producto para leer una ficha."""
        keys = set(I.resolve_spec("spot", "AAPL"))
        for pid in I.PRODUCT_IDS:
            assert set(I.resolve_spec(pid, "TEST")) == keys


# ─── Unidades ─────────────────────────────────────────────────────

class TestUnits:
    def test_pips_land_on_a_price_level(self):
        d = _doc(sl_unit="pips", sl_input=20)
        assert round(d["sl"], 5) == 1.098      # 20 pips × 0,0001 por debajo

    def test_ticks_use_the_contract_tick_not_a_round_number(self):
        d = make_trade_doc({
            "symbol": "MES", "side": "long", "instrument_type": "futures",
            "entry_price": 5000, "quantity": 1, "sl_unit": "ticks", "sl_input": 8,
        }, "u1")
        assert d["sl"] == 4998            # 8 ticks × 0,25 = 2 puntos

    def test_money_converts_through_the_position_size(self):
        """"Quiero arriesgar 100 $" con 1 lote son 10 pips, no 100 de nada."""
        d = _doc(sl_unit="money", sl_input=100)
        risk = abs(d["entry_price"] - d["sl"]) * d["quantity"] * d["multiplier"]
        assert round(risk, 2) == 100.00

    def test_pct_balance_converts_through_size_and_balance(self):
        d = _doc(sl_unit="pct_balance", sl_input=1)      # 1 % de 10 000 = 100 $
        risk = abs(d["entry_price"] - d["sl"]) * d["quantity"] * d["multiplier"]
        assert round(risk, 2) == 100.00

    def test_target_in_r_is_measured_off_the_resolved_stop(self):
        d = _doc(sl_unit="pips", sl_input=20, tp_unit="r", tp_input=3)
        assert round(d["tp"] - d["entry_price"], 5) == round(3 * 0.0020, 5)

    def test_short_side_mirrors_stop_and_target(self):
        d = _doc(side="short", sl_unit="pips", sl_input=20, tp_unit="pips", tp_input=40)
        assert d["sl"] > d["entry_price"] and d["tp"] < d["entry_price"]

    def test_a_unit_that_cannot_be_converted_leaves_the_level_unset(self):
        """Objetivo en R sin stop: indefinido. Un 0 pondría el TP en la entrada."""
        d = _doc(tp_unit="r", tp_input=2)
        assert d["tp"] is None

    def test_round_trip_through_the_unit_gives_back_the_number_typed(self):
        spec = I.resolve_spec("forex", "EURUSD")
        d = _doc(sl_unit="pips", sl_input=35)
        back = I.distance_to_unit(
            abs(d["entry_price"] - d["sl"]), "pips", entry=d["entry_price"],
            quantity=d["quantity"], contract_size=d["multiplier"], spec=spec)
        assert round(back) == 35

    def test_price_unit_keeps_the_level_untouched(self):
        """El comportamiento de siempre: quien escribe un precio, guarda ese precio."""
        d = _doc(sl=1.0950, tp=1.1200)
        assert (d["sl"], d["tp"]) == (1.0950, 1.1200)


# ─── El apalancamiento no multiplica el P&L ───────────────────────

class TestLeverageDoesNotTouchPnl:
    @pytest.mark.parametrize("lev", [1, 5, 20, 100])
    def test_same_pnl_at_every_leverage(self, lev):
        """1 000 $ de nocional ganan lo mismo a 1× que a 100×."""
        d = _doc(instrument_type="crypto_perp", symbol="BTCUSDT",
                 entry_price=100000, quantity=0.01, leverage=lev)
        out = compute_trade_pnl({**d, "exit_price": 101000, "status": "closed"})
        assert out["pnl"] == 10.0

    def test_what_leverage_does_change_is_the_margin_and_the_roe(self):
        low = compute_trade_pnl({**_doc(instrument_type="crypto_perp", symbol="BTCUSDT",
                                        entry_price=100000, quantity=0.01, leverage=1),
                                 "exit_price": 101000, "status": "closed"})
        high = compute_trade_pnl({**_doc(instrument_type="crypto_perp", symbol="BTCUSDT",
                                         entry_price=100000, quantity=0.01, leverage=20),
                                  "exit_price": 101000, "status": "closed"})
        assert low["margin_used"] == 1000.0 and high["margin_used"] == 50.0
        assert low["roe_pct"] == 1.0 and high["roe_pct"] == 20.0
        assert low["pnl"] == high["pnl"]

    def test_contract_size_does_multiply_the_pnl(self):
        """Un lote de oro son 100 onzas: 10 $ de subida son 1 000 $."""
        d = make_trade_doc({"symbol": "XAUUSD", "side": "long", "instrument_type": "cfd",
                            "entry_price": 2000, "quantity": 1, "account_balance": 50000}, "u1")
        out = compute_trade_pnl({**d, "exit_price": 2010, "status": "closed"})
        assert out["pnl"] == 1000.0


# ─── Posición: nocional, exposición, liquidación ──────────────────

class TestPositionMetrics:
    def test_exposure_is_notional_over_balance_not_the_leverage_number(self):
        """100× sobre un tamaño pequeño no es una posición grande."""
        small = I.position_metrics({"entry_price": 100000, "quantity": 0.001,
                                    "instrument_type": "crypto_perp", "symbol": "BTCUSDT",
                                    "leverage": 100, "account_balance": 10000})
        assert small["exposure_multiple"] == 0.01
        assert small["exposure_exceeded"] is False

    def test_a_gold_lot_at_20x_on_a_small_account_is_over_the_cap(self):
        m = I.position_metrics({"entry_price": 2000, "quantity": 1, "multiplier": 100,
                                "instrument_type": "cfd", "symbol": "XAUUSD",
                                "leverage": 20, "account_balance": 10000})
        assert m["notional"] == 200000 and m["exposure_multiple"] == 20.0
        assert m["exposure_exceeded"] is True

    def test_liquidation_is_undefined_without_leverage(self):
        """Una posición pagada al contado no se liquida."""
        assert I.liquidation_price(100, "long", 1) is None
        assert I.liquidation_price(100, "long", None) is None

    def test_liquidation_moves_with_the_leverage(self):
        far = I.liquidation_price(100, "long", 2, 0.005)
        near = I.liquidation_price(100, "long", 50, 0.005)
        assert far < near < 100

    def test_short_liquidation_is_above_the_entry(self):
        assert I.liquidation_price(100, "short", 10, 0.005) > 100

    def test_stop_behind_the_liquidation_is_flagged(self):
        """Un stop que el bróker nunca ejecutará no es un stop."""
        m = I.position_metrics({"entry_price": 100, "quantity": 1, "multiplier": 1,
                                "instrument_type": "crypto_perp", "symbol": "BTCUSDT",
                                "leverage": 20, "account_balance": 10000, "sl": 80})
        assert m["liquidation_before_stop"] is True

    def test_risk_is_published_against_three_denominators(self):
        m = I.position_metrics({"entry_price": 100, "quantity": 10, "multiplier": 1,
                                "instrument_type": "cfd", "symbol": "US500",
                                "leverage": 10, "account_balance": 10000, "sl": 99})
        assert m["risk_amount"] == 10.0
        assert m["risk_pct_notional"] == 1.0     # sobre el monto total
        assert m["risk_pct_balance"] == 0.1      # sobre la cuenta
        assert m["risk_pct_margin"] == 10.0      # sobre el margen inmovilizado

    def test_everything_is_none_without_the_data(self):
        m = I.position_metrics({"side": "long"})
        assert m["notional"] is None and m["risk_amount"] is None and m["rr"] is None


# ─── Riesgo definido: opciones ────────────────────────────────────

class TestDefinedRisk:
    def test_a_long_option_has_r_without_any_stop(self):
        """Cerrado del hueco G-21: la prima ES la pérdida máxima."""
        d = make_trade_doc({"symbol": "AAPL", "side": "long", "instrument_type": "option",
                            "option_type": "call", "entry_price": 3.5, "quantity": 2,
                            "account_balance": 10000}, "u1")
        out = compute_trade_pnl({**d, "exit_price": 7.0, "status": "closed"})
        assert out["max_loss"] == 700.0 and out["max_loss_source"] == "premium"
        assert out["r_multiple"] == 1.0          # ganó exactamente la prima

    def test_a_declared_max_loss_wins_over_everything(self):
        """Un spread de crédito: el riesgo es anchura − crédito, no la prima."""
        d = make_trade_doc({"symbol": "SPY", "side": "short", "instrument_type": "option",
                            "option_type": "put", "entry_price": 1.2, "quantity": 1,
                            "max_loss": 380, "max_profit": 120,
                            "option_strategy": "Bull Put Spread",
                            "account_balance": 10000}, "u1")
        out = compute_trade_pnl({**d, "exit_price": 0.2, "status": "closed"})
        assert out["max_loss"] == 380.0 and out["max_loss_source"] == "declared"
        assert out["r_multiple"] == round(100 / 380, 2)

    def test_a_naked_short_option_has_no_defined_max_loss(self):
        """Vender desnudo no tiene pérdida máxima. None, no un número tranquilizador."""
        d = make_trade_doc({"symbol": "TSLA", "side": "short", "instrument_type": "option",
                            "option_type": "call", "entry_price": 5, "quantity": 1,
                            "account_balance": 10000}, "u1")
        out = compute_trade_pnl({**d, "exit_price": 2, "status": "closed"})
        assert out["max_loss"] is None and out["r_multiple"] is None

    def test_options_and_spot_produce_the_same_shape(self):
        """"Que vayan parejos": misma respuesta, mismas claves, misma analítica."""
        opt = compute_trade_pnl({**make_trade_doc(
            {"symbol": "AAPL", "side": "long", "instrument_type": "option",
             "option_type": "call", "entry_price": 3, "quantity": 1,
             "account_balance": 10000}, "u"), "exit_price": 4, "status": "closed"})
        spot = compute_trade_pnl({**make_trade_doc(
            {"symbol": "AAPL", "side": "long", "instrument_type": "stock",
             "entry_price": 300, "quantity": 1, "sl": 290,
             "account_balance": 10000}, "u"), "exit_price": 310, "status": "closed"})
        for key in ("pnl", "r_multiple", "notional", "max_loss", "costs_total"):
            assert key in opt and key in spot


# ─── Coste de mantener la posición ────────────────────────────────

class TestCarryCosts:
    def test_funding_is_charged_per_period_and_lowers_the_pnl(self):
        d = make_trade_doc({
            "symbol": "BTCUSDT", "side": "long", "instrument_type": "crypto_perp",
            "entry_price": 100000, "quantity": 0.05, "leverage": 20,
            "account_balance": 10000, "funding_rate_pct": 0.01,
            "entry_date": "2026-08-01T00:00:00Z", "exit_date": "2026-08-04T00:00:00Z",
        }, "u1")
        out = compute_trade_pnl({**d, "exit_price": 102000, "status": "closed",
                                 "exit_date": "2026-08-04T00:00:00Z"})
        assert out["funding_fees"] == 4.5       # 9 pagos × 0,01 % × 5 000 $
        assert out["gross_pnl"] == 100.0 and out["pnl"] == 95.5
        assert out["carry_source"] == "estimated"

    def test_a_declared_amount_beats_any_estimate(self):
        """Lo que cobró el bróker no lo mejora ninguna fórmula nuestra."""
        out = compute_trade_pnl(make_trade_doc({
            "symbol": "BTCUSDT", "side": "long", "instrument_type": "crypto_perp",
            "entry_price": 100000, "quantity": 0.05, "funding_fees": 7.25,
            "funding_rate_pct": 0.01, "exit_price": 101000, "status": "closed",
            "entry_date": "2026-08-01T00:00:00Z", "exit_date": "2026-08-04T00:00:00Z",
        }, "u1"))
        assert out["funding_fees"] == 7.25 and out["carry_source"] == "declared"

    def test_overnight_swap_prorates_the_annual_rate(self):
        d = make_trade_doc({
            "symbol": "XAUUSD", "side": "long", "instrument_type": "cfd",
            "entry_price": 2000, "quantity": 0.1, "swap_rate_pct": 7.3,
            "nights_held": 10, "account_balance": 50000,
        }, "u1")
        out = compute_trade_pnl({**d, "exit_price": 2010, "status": "closed"})
        # 20 000 $ de nocional × 7,3 %/año × 10/365 = 40 $
        assert out["swap_fees"] == 40.0
        assert out["pnl"] == 60.0               # 100 de bruto − 40 de swap

    def test_a_product_without_carry_reports_none_not_zero(self):
        out = compute_trade_pnl(make_trade_doc({
            "symbol": "AAPL", "side": "long", "instrument_type": "stock",
            "entry_price": 100, "quantity": 10, "exit_price": 110, "status": "closed",
        }, "u1"))
        assert out["carry_total"] is None and out["carry_model"] is None

    def test_costs_are_summed_into_one_number(self):
        out = compute_trade_pnl(make_trade_doc({
            "symbol": "XAUUSD", "side": "long", "instrument_type": "cfd",
            "entry_price": 2000, "quantity": 0.1, "fees": 5, "swap_fees": 12,
            "exit_price": 2010, "status": "closed",
        }, "u1"))
        assert out["costs_total"] == 17.0 and out["pnl"] == 83.0


# ─── Reglas nuevas ────────────────────────────────────────────────

class TestRules:
    def test_over_exposure_fires_on_notional_not_on_the_x(self):
        trade = compute_trade_pnl(make_trade_doc({
            "symbol": "XAUUSD", "side": "long", "instrument_type": "cfd",
            "entry_price": 2000, "quantity": 1, "leverage": 20,
            "account_balance": 10000, "sl": 1990,
        }, "u1"))
        codes = [e["code"] for e in detect_errors(trade)]
        assert "over_exposure" in codes

    def test_high_leverage_on_a_small_size_does_not_fire(self):
        trade = compute_trade_pnl(make_trade_doc({
            "symbol": "BTCUSDT", "side": "long", "instrument_type": "crypto_perp",
            "entry_price": 100000, "quantity": 0.001, "leverage": 100,
            "account_balance": 10000, "sl": 99000, "tp": 102000,
        }, "u1"))
        assert "over_exposure" not in [e["code"] for e in detect_errors(trade)]

    def test_rr_below_one_is_its_own_critical_error(self):
        """Arriesgar 2 para ganar 1 es una apuesta sobre la tasa de acierto."""
        errors = detect_errors({"entry_price": 100, "sl": 98, "tp": 101,
                                "quantity": 1, "account_balance": 10000})
        codes = [e["code"] for e in errors]
        assert "rr_below_1" in codes
        # Y NO se cuenta dos veces: el umbral del plan queda absorbido.
        assert "low_rr" not in codes

    def test_between_one_and_the_plan_threshold_the_softer_rule_fires(self):
        codes = [e["code"] for e in detect_errors(
            {"entry_price": 100, "sl": 98, "tp": 102.4, "quantity": 1,
             "account_balance": 10000})]
        assert codes.count("low_rr") == 1 and "rr_below_1" not in codes

    def test_oversize_now_counts_the_contract_size(self):
        """Un contrato de opciones son 100 acciones: el riesgo es ×100."""
        trade = {"entry_price": 5, "sl": 2.5, "quantity": 1, "account_balance": 10000,
                 "instrument_type": "option", "multiplier": 100}
        codes = [e["code"] for e in detect_errors(trade)]
        assert "oversize" in codes           # 250 $ = 2,5 % del saldo
        # Sin el tamaño de contrato serían 2,50 $ y no habría saltado nada.
        assert "oversize" not in [
            e["code"] for e in detect_errors({**trade, "multiplier": 1})]

    def test_missing_contract_size_is_said_out_loud(self):
        trade = {"entry_price": 70, "quantity": 1, "instrument_type": "futures",
                 "symbol": "XYZ", "account_balance": 10000}
        assert "contract_size_missing" in [e["code"] for e in detect_errors(trade)]

    def test_a_known_contract_does_not_trigger_it(self):
        trade = {"entry_price": 70, "quantity": 1, "instrument_type": "futures",
                 "symbol": "CL", "account_balance": 100000}
        assert "contract_size_missing" not in [e["code"] for e in detect_errors(trade)]


# ─── Analítica ────────────────────────────────────────────────────

class TestAnalytics:
    def _closed(self, **over):
        return compute_trade_pnl(make_trade_doc(
            {"symbol": "EURUSD", "side": "long", "instrument_type": "forex",
             "entry_price": 1.10, "quantity": 0.1, "sl": 1.09,
             "exit_price": 1.11, "status": "closed", "account_balance": 10000,
             "exit_date": "2026-08-01T00:00:00Z", **over}, "u1"))

    def test_by_product_splits_the_history(self):
        trades = [self._closed(),
                  self._closed(symbol="XAUUSD", instrument_type="cfd",
                               entry_price=2000, sl=1990, exit_price=2010, quantity=0.1)]
        groups = {g["group"]: g for g in compute_analytics(trades)["by_product"]}
        assert set(groups) == {"forex", "cfd"}
        assert all(g["n"] == 1 for g in groups.values())

    def test_costs_are_reported_apart_from_the_result(self):
        trades = [self._closed(fees=3, swap_fees=7)]
        costs = compute_analytics(trades)["costs"]
        assert costs["fees"] == 3 and costs["swap"] == 7 and costs["total"] == 10

    def test_cost_share_is_none_without_gross_profit(self):
        trades = [self._closed(exit_price=1.09, fees=3)]
        assert compute_analytics(trades)["costs"]["pct_of_gross_profit"] is None

    def test_leverage_usage_is_none_when_nobody_declared_any(self):
        stats = compute_analytics([self._closed()])["leverage_usage"]
        assert stats["avg_leverage"] is None and stats["sample"] == 0

    def test_leverage_usage_counts_the_trades_over_the_cap(self):
        trades = [self._closed(instrument_type="cfd", symbol="XAUUSD",
                               entry_price=2000, sl=1990, exit_price=2010,
                               quantity=1, leverage=20)]
        stats = compute_analytics(trades)["leverage_usage"]
        assert stats["max_exposure"] == 20.0 and stats["over_exposure_trades"] == 1


# ─── Compatibilidad con lo ya guardado ────────────────────────────

class TestBackwardCompatibility:
    def test_a_legacy_document_still_reproduces_its_exact_amount(self):
        legacy = {"entryPrice": 100.0, "exitPrice": 110.0, "quantity": 2,
                  "leverage": 5, "direction": "long", "status": "closed"}
        assert compute_trade_pnl(legacy)["pnl"] == 100.0     # (110−100)×2×5

    def test_leverage_alone_no_longer_marks_a_document_as_legacy(self):
        """Si lo hiciera, un apalancamiento de 20 se leería como ×20 en el P&L."""
        canonical = {"entry_price": 100.0, "side": "long", "leverage": 20}
        assert is_legacy_trade(canonical) is False
        assert normalize_trade_schema(canonical) is canonical

    def test_a_canonical_document_keeps_its_leverage_on_update(self):
        """El `$unset` corre después del `$set`: sin este filtro, lo borraría."""
        assert "leverage" not in legacy_keys_to_unset(
            {"entry_price": 1, "leverage": 20})
        assert "leverage" in legacy_keys_to_unset(
            {"entryPrice": 1, "leverage": 20})

    def test_a_spot_trade_computes_exactly_as_before(self):
        """Ninguna operación existente puede cambiar de valor por esta versión."""
        out = compute_trade_pnl({
            "side": "long", "entry_price": 100, "exit_price": 110, "quantity": 10,
            "sl": 95, "fees": 5, "account_balance": 10000, "status": "closed",
        })
        # Riesgo = |100 − 95| × 10 = 50 $; 95 / 50 = 1,9 R.
        assert out["pnl"] == 95.0 and out["r_multiple"] == round(95 / 50, 2)


# ─── Alcance de la analítica: una cuenta o varias ─────────────────

class TestMixedAccounts:
    """La curva, el drawdown y el % de rentabilidad asumen UNA cuenta.

    Cuando no la hay, la respuesta tiene que decirlo: es la diferencia entre un
    drawdown que ocurrió y uno que sale de sumar dos cuentas distintas.
    """

    def _t(self, product, balance, pnl=10.0):
        return {"instrument_type": product, "account_balance": balance, "pnl": pnl,
                "status": "closed", "exit_price": 1.0}

    def test_one_product_is_never_suspicious(self):
        out = detect_mixed_accounts([self._t("cfd", 10000)] * 5)
        assert out["suspected"] is False and out["products"] == 1

    def test_same_account_across_products_is_not_suspicious(self):
        """Operar tres productos en la misma cuenta es lo normal."""
        trades = [self._t("cfd", 10000), self._t("forex", 10200),
                  self._t("option", 10450), self._t("futures", 9800)]
        out = detect_mixed_accounts(trades)
        assert out["suspected"] is False, out

    def test_balances_that_do_not_overlap_are_flagged(self):
        """Opciones en 10 000 y perpetuos en 50 000 son dos cuentas."""
        trades = [self._t("option", 10000), self._t("option", 10300),
                  self._t("crypto_perp", 50000), self._t("crypto_perp", 51000)]
        out = detect_mixed_accounts(trades)
        assert out["suspected"] is True
        assert out["ratio"] >= 2.0
        assert set(out["balance_by_product"]) == {"option", "crypto_perp"}

    def test_a_single_mistyped_balance_does_not_decide_it(self):
        """Por eso es la mediana y no la media."""
        trades = ([self._t("cfd", 10000)] * 6 + [self._t("cfd", 999999)]
                  + [self._t("forex", 10100)] * 6)
        assert detect_mixed_accounts(trades)["suspected"] is False

    def test_trades_without_balance_are_ignored_not_counted_as_zero(self):
        trades = [self._t("cfd", 10000), self._t("forex", None)]
        out = detect_mixed_accounts(trades)
        assert out["products"] == 1 and out["suspected"] is False

    def test_the_flag_travels_in_the_analytics_payload(self):
        trades = [compute_trade_pnl(make_trade_doc({
            "symbol": "AAPL", "side": "long", "instrument_type": "option",
            "option_type": "call", "entry_price": 3, "quantity": 1,
            "exit_price": 4, "status": "closed", "account_balance": 10000,
            "exit_date": "2026-08-01T00:00:00Z"}, "u")),
            compute_trade_pnl(make_trade_doc({
                "symbol": "BTCUSDT", "side": "long", "instrument_type": "crypto_perp",
                "entry_price": 100000, "quantity": 0.01, "exit_price": 101000,
                "status": "closed", "account_balance": 60000,
                "exit_date": "2026-08-02T00:00:00Z"}, "u"))]
        assert compute_analytics(trades)["mixed_accounts"]["suspected"] is True


class TestClosedTradePredicate:
    """El selector de alcance y la analítica tienen que leer «cerrada» igual.

    La barra de productos se dibuja con los que tienen algo cerrado. Si ese
    criterio se separa del que usa `compute_analytics`, aparece un botón de
    filtro que lleva a un panel vacío — y el panel vacío no tiene cifras que
    explicar por qué.
    """

    def test_a_status_alone_is_not_a_closed_trade(self):
        """Sin precio de salida no hay P&L: contarla metería un cero en la curva."""
        assert is_closed_trade({"status": "closed", "exit_price": None}) is False
        assert is_closed_trade({"status": "closed", "exit_price": 101.0}) is True

    def test_the_three_final_states_count(self):
        for st in ("closed", "sl_hit", "tp_hit"):
            assert is_closed_trade({"status": st, "exit_price": 1.0}) is True

    def test_an_open_position_never_counts(self):
        assert is_closed_trade({"status": "open", "exit_price": 1.0}) is False
        assert is_closed_trade({}) is False

    def test_it_is_the_same_criterion_analytics_uses(self):
        """Lo que cuente aquí tiene que ser lo que `closed_trades` cuenta allí."""
        trades = [
            compute_trade_pnl(make_trade_doc({
                "symbol": "MSFT", "side": "long", "instrument_type": "stock",
                "entry_price": 400, "quantity": 1, "exit_price": 410,
                "status": "closed", "account_balance": 10000,
                "exit_date": "2026-08-01T00:00:00Z"}, "u")),
            compute_trade_pnl(make_trade_doc({
                "symbol": "GC", "side": "long", "instrument_type": "futures",
                "entry_price": 2450, "quantity": 1, "status": "open",
                "account_balance": 10000}, "u")),
        ]
        assert sum(1 for t in trades if is_closed_trade(t)) == 1
        assert compute_analytics(trades)["closed_trades"] == 1
