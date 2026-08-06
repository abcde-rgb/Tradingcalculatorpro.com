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

    @pytest.mark.parametrize("path", ["/api/journal/trades", "/api/performance/trades"])
    def test_limit_has_a_declared_ceiling(self, path):
        route = next(
            r for r in server.app.routes
            if getattr(r, "path", None) == path and "GET" in getattr(r, "methods", set())
        )
        limit = next(p for p in route.dependant.query_params if p.name == "limit")
        # Pydantic v2 guarda las restricciones como annotated-types en
        # `metadata` ([Ge(ge=1), Le(le=500)]), no como atributos del FieldInfo.
        bounds = {type(c).__name__: c for c in limit.field_info.metadata}
        assert "Le" in bounds, f"{path} sirve `limit` sin techo"
        assert bounds["Le"].le == server.TRADES_LIMIT_MAX
        assert bounds["Ge"].ge == 1
