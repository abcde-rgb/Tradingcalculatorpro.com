"""Regression tests for /journal/stats — Fase 0 de la auditoría del diario.

Los tres defectos que fijan estos tests son de la misma familia que las reglas
de honestidad numérica del proyecto: una cifra que no se puede calcular no vale
0, y lo sensible al orden se ordena explícitamente.

1. `_aggregate_journal_trades` construía la curva de equity en el orden en que
   la consulta devolviera las filas. El drawdown NO es simétrico bajo inversión,
   así que las mismas operaciones daban un máximo distinto según el orden de
   inserción. El endpoint ya ordena con `sort_trades_chronologically`.
2. El breakeven contaba como perdedora (`if pnl > 0 ... else`), hundiendo el win
   rate e inflando la racha de pérdidas.
3. `profit_factor` valía 0 sin pérdidas — la PEOR lectura posible — cuando lo
   correcto es indefinido (la UI pinta ∞).
"""
import itertools
import os

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from ayuda_rutas import caminar_rutas  # noqa: E402
from performance import sort_trades_chronologically  # noqa: E402

agg = server._aggregate_journal_trades
stats_of = server._journal_stats_from_aggregate


def _t(pnl, exit_date):
    return {"pnl": pnl, "exit_date": exit_date, "status": "closed"}


# Un ganador seguido de dos perdedores y otro ganador. En orden cronológico la
# caída desde el pico (100) hasta el valle (20) es 80.
TRADES = [
    _t(100, "2026-01-01"),
    _t(-50, "2026-01-02"),
    _t(-30, "2026-01-03"),
    _t(80, "2026-01-04"),
]


class TestOrderIndependence:
    def test_drawdown_is_the_same_whatever_order_the_query_returns(self):
        """El drawdown no puede depender del orden de llegada de las filas."""
        seen = {
            stats_of(agg(sort_trades_chronologically(list(perm))), 4)["maxDrawdown"]
            for perm in itertools.permutations(TRADES)
        }
        assert seen == {80.0}, f"drawdown inestable entre órdenes: {seen}"

    def test_unsorted_input_really_does_change_the_drawdown(self):
        """Sin ordenar el bug es real, no teórico — si esto deja de fallar,
        el orden ha dejado de importar y el test de arriba ya no prueba nada."""
        seen = {
            stats_of(agg(list(perm)), 4)["maxDrawdown"]
            for perm in itertools.permutations(TRADES)
        }
        assert len(seen) > 1

    def test_streak_is_the_same_whatever_order_the_query_returns(self):
        seen = {
            stats_of(agg(sort_trades_chronologically(list(perm))), 4)["consecutiveLosses"]
            for perm in itertools.permutations(TRADES)
        }
        assert seen == {2}, f"racha inestable entre órdenes: {seen}"


class TestBreakeven:
    def test_scratch_is_not_a_loser(self):
        rows = sort_trades_chronologically([
            _t(100, "2026-01-01"), _t(0, "2026-01-02"), _t(-50, "2026-01-03"),
        ])
        s = stats_of(agg(rows), 3)
        assert (s["wins"], s["losses"], s["breakeven"]) == (1, 1, 1)

    def test_scratch_does_not_inflate_the_losing_streak(self):
        """Antes, tres operaciones a 0 € daban una racha de 3 perdedoras."""
        rows = sort_trades_chronologically([
            _t(0, "2026-01-01"), _t(0, "2026-01-02"), _t(0, "2026-01-03"),
        ])
        s = stats_of(agg(rows), 3)
        assert s["consecutiveLosses"] == 0
        assert s["losses"] == 0
        assert s["breakeven"] == 3

    def test_counts_add_up_to_the_total(self):
        rows = sort_trades_chronologically([
            _t(10, "2026-01-01"), _t(0, "2026-01-02"),
            _t(-5, "2026-01-03"), _t(0, "2026-01-04"),
        ])
        s = stats_of(agg(rows), 4)
        assert s["wins"] + s["losses"] + s["breakeven"] == s["totalTrades"] == 4


class TestProfitFactor:
    def test_undefined_without_losses_not_zero(self):
        rows = sort_trades_chronologically([_t(100, "2026-01-01"), _t(50, "2026-01-02")])
        assert stats_of(agg(rows), 2)["profitFactor"] is None

    def test_a_scratch_alone_does_not_create_a_divisor(self):
        """Un breakeven no aporta pérdida bruta, así que el factor sigue
        indefinido — no debe colarse un 0 en el denominador."""
        rows = sort_trades_chronologically([_t(100, "2026-01-01"), _t(0, "2026-01-02")])
        assert stats_of(agg(rows), 2)["profitFactor"] is None

    def test_computed_normally_when_there_are_losses(self):
        rows = sort_trades_chronologically([_t(100, "2026-01-01"), _t(-50, "2026-01-02")])
        assert stats_of(agg(rows), 2)["profitFactor"] == 2.0


class TestExpectancy:
    def test_is_mean_pnl_per_trade(self):
        rows = sort_trades_chronologically([
            _t(100, "2026-01-01"), _t(-40, "2026-01-02"), _t(60, "2026-01-03"),
        ])
        s = stats_of(agg(rows), 3)
        assert s["expectancy"] == pytest.approx(s["totalPnl"] / 3)

    def test_scratches_are_not_charged_at_the_average_loss(self):
        """La fórmula vieja repartía (100-winRate) entre las perdedoras, así que
        cada breakeven se cobraba como una pérdida media. Aquí la esperanza real
        es 0: se ganó 50 y se perdió 50."""
        rows = sort_trades_chronologically([
            _t(50, "2026-01-01"), _t(-50, "2026-01-02"),
            _t(0, "2026-01-03"), _t(0, "2026-01-04"),
        ])
        assert stats_of(agg(rows), 4)["expectancy"] == 0.0


class TestEmptyJournalContract:
    def test_zero_trades_still_reports_zeros(self):
        """Contrato publicado que consume el frontend: con el diario vacío todas
        las claves valen 0, incluido profitFactor (no hay nada indefinido que
        comunicar porque no hay operaciones)."""
        empty = server._empty_journal_stats()
        assert set(empty) >= {
            "totalTrades", "wins", "losses", "breakeven", "winRate", "totalPnl",
            "avgWin", "avgLoss", "profitFactor", "expectancy", "maxDrawdown",
            "consecutiveLosses",
        }
        assert all(v == 0 for v in empty.values())


class TestLimitsAreCapped:
    """`limit` es entrada de usuario: sin tope, un ?limit=1000000 convierte una
    petición en una lectura de tabla completa."""

    # Era una parametrización sobre las DOS rutas del diario. `/journal/trades`
    # se retiró el 2026-08-22 —era un duplicado que escribía en la misma
    # colección con otro esquema, el BUG-039—, así que sólo queda la viva.
    @pytest.mark.parametrize("path", ["/api/performance/trades"])
    def test_limit_has_a_declared_ceiling(self, path):
        # Igual que en `test_route_uniqueness_unit`: desde FastAPI 0.141 los
        # routers incluidos no se aplanan en `app.routes`, así que buscar ahí
        # deja de encontrar nada y el `next()` revienta con StopIteration.
        route = next(
            r for camino, r in caminar_rutas(server.app)
            if camino == path and "GET" in (getattr(r, "methods", None) or set())
        )
        limit = next(p for p in route.dependant.query_params if p.name == "limit")
        # Pydantic v2 guarda las restricciones como annotated-types en
        # `metadata` ([Ge(ge=1), Le(le=500)]), no como atributos del FieldInfo.
        bounds = {type(c).__name__: c for c in limit.field_info.metadata}
        assert "Le" in bounds, f"{path} sirve `limit` sin techo"
        assert bounds["Le"].le == server.TRADES_LIMIT_MAX
        assert bounds["Ge"].ge == 1


# ---------------------------------------------------------------------------
# G-22 · Las dos rutas de estadísticas dicen lo MISMO
# ---------------------------------------------------------------------------

class TestExpectancyEsLaMismaEnLasDosRutas:
    """`/journal/stats` y `/performance/analytics` leen la misma colección.

    Y devolvían números distintos. `/journal/stats` calcula la esperanza como
    P&L medio por operación —y lleva escrito por qué—; `/performance/analytics`
    usaba `winRate·avgWin + (1 − winRate)·avgLoss`, identidad que **sólo se
    cumple si no hay breakevens**: con un 0 en la muestra, ese `(1 − winRate)`
    se lleva la operación neutra y la cobra a precio de pérdida media.

    Con +100, −50 y 0 la fórmula daba 0,00 contra los 16,67 reales. El usuario
    veía dos esperanzas distintas según por qué pantalla entrara.
    """

    @staticmethod
    def _analytics(pnls):
        from performance import compute_analytics
        trades = [
            {"pnl": p, "status": "closed", "exit_date": f"2026-01-{i + 1:02d}",
             "entry_price": 100, "exit_price": 100 + p, "quantity": 1}
            for i, p in enumerate(pnls)
        ]
        return compute_analytics(trades)

    @staticmethod
    def _journal(pnls):
        trades = [{"pnl": p, "exit_date": f"2026-01-{i + 1:02d}", "status": "closed"}
                  for i, p in enumerate(pnls)]
        return stats_of(agg(trades), len(trades))

    def test_con_un_breakeven_las_dos_coinciden(self):
        pnls = [100.0, -50.0, 0.0]
        a = self._analytics(pnls)["expectancy"]
        j = self._journal(pnls)["expectancy"]
        assert a == pytest.approx(j, abs=0.01), (
            f"/performance/analytics dice {a} y /journal/stats {j} sobre los mismos datos"
        )
        assert a == pytest.approx(16.67, abs=0.01), "la esperanza es el P&L medio"

    def test_sin_breakevens_el_resultado_no_cambia(self):
        """El arreglo no puede mover el número en el caso que ya estaba bien."""
        pnls = [100.0, -50.0, 200.0, -30.0]
        a = self._analytics(pnls)["expectancy"]
        assert a == pytest.approx(sum(pnls) / len(pnls), abs=0.01)
        assert a == pytest.approx(self._journal(pnls)["expectancy"], abs=0.01)

    def test_varios_breakevens_seguidos(self):
        pnls = [90.0, 0.0, 0.0, 0.0, -30.0]
        a = self._analytics(pnls)["expectancy"]
        assert a == pytest.approx(12.0, abs=0.01)
        assert a == pytest.approx(self._journal(pnls)["expectancy"], abs=0.01)
