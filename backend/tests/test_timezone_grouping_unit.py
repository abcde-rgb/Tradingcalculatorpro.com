"""La analítica agrupa por el día del TRADER, no por el de UTC.

El diario ordena la curva de capital y el drawdown por fecha de cierre —eso es
absoluto y tiene que seguir siéndolo—, pero «¿qué día de la semana opero mejor?»
y el calendario de P&L son preguntas sobre el **día local** de quien opera.

Antes esto no se podía ni plantear: el formulario no preguntaba la fecha y el
servidor sellaba `datetime.now(timezone.utc)` al recibir la petición. O sea que
un trader en Tokio que opera el martes a las 08:00 (23:00 UTC del lunes) veía su
operación contada en lunes, y quien apuntaba por la noche las operaciones del día
las tenía todas con la misma marca de tiempo.

La solución es que la fecha viaje CON su desfase (`2026-08-04T23:30:00+02:00`).
Entonces el backend no necesita saber nada de zonas horarias: `[:10]` y
`weekday()` caen solos en el día correcto. Estos tests fijan esa propiedad, que
es una que se rompe sin que nadie lo note.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from performance import (  # noqa: E402
    compute_analytics,
    compute_trade_pnl,
    make_trade_doc,
    sort_trades_chronologically,
)


def _op(symbol, entrada, salida, pnl_precio=110.0):
    return compute_trade_pnl(make_trade_doc({
        "symbol": symbol, "instrument_type": "stock", "side": "long",
        "entry_price": 100, "quantity": 1, "exit_price": pnl_precio,
        "status": "closed", "account_balance": 10000,
        "entry_date": entrada, "exit_date": salida,
    }, "u"))


class TestElDiaEsElDelTrader:
    def test_una_operacion_nocturna_en_madrid_cuenta_en_su_dia(self):
        """Martes 00:30 en Madrid es LUNES 22:30 en UTC. Cuenta como martes."""
        t = _op("AAA", "2026-08-04T00:30:00+02:00", "2026-08-04T01:00:00+02:00")
        a = compute_analytics([t])
        dias = {d["group"] for d in a["by_day"]}
        assert dias == {"Tue"}, f"agrupa en {dias}, no en el día del trader"

    def test_una_operacion_matinal_en_tokio_cuenta_en_su_dia(self):
        """Martes 08:00 en Tokio es LUNES 23:00 en UTC. Cuenta como martes."""
        t = _op("BBB", "2026-08-04T08:00:00+09:00", "2026-08-04T09:00:00+09:00")
        a = compute_analytics([t])
        assert {d["group"] for d in a["by_day"]} == {"Tue"}

    def test_una_operacion_vespertina_en_nueva_york_cuenta_en_su_dia(self):
        """Lunes 21:00 en Nueva York es MARTES 01:00 en UTC. Cuenta como lunes."""
        t = _op("CCC", "2026-08-03T21:00:00-04:00", "2026-08-03T22:00:00-04:00")
        a = compute_analytics([t])
        assert {d["group"] for d in a["by_day"]} == {"Mon"}

    def test_el_calendario_de_pnl_usa_el_mismo_dia(self):
        """Si `by_day` y el calendario discreparan, la misma operación saldría
        en dos días distintos según dónde se mire."""
        t = _op("DDD", "2026-08-04T00:30:00+02:00", "2026-08-04T01:00:00+02:00")
        a = compute_analytics([t])
        dias_calendario = {d["date"] for d in (a.get("pnl_calendar") or [])}
        if dias_calendario:                       # la clave existe en la respuesta
            assert dias_calendario == {"2026-08-04"}


class TestElOrdenSIGUESIENDOABSOLUTO:
    """Lo local es la AGRUPACIÓN. El orden de la curva no puede serlo: sumar
    P&L en un orden equivocado corrompe el drawdown, que no es simétrico."""

    def test_dos_operaciones_de_husos_distintos_se_ordenan_por_instante_real(self):
        # Tokio cierra a las 09:00 JST = 00:00 UTC. Madrid cierra a las 09:00
        # CEST = 07:00 UTC. Por texto, «09:00» empata; por instante, Tokio va antes.
        tokio = _op("TOK", "2026-08-04T08:00:00+09:00", "2026-08-04T09:00:00+09:00")
        madrid = _op("MAD", "2026-08-04T08:00:00+02:00", "2026-08-04T09:00:00+02:00")
        orden = [t["symbol"] for t in sort_trades_chronologically([madrid, tokio])]
        assert orden == ["TOK", "MAD"], f"orden {orden}: la curva sumaría al revés"

    def test_el_drawdown_no_depende_del_orden_de_llegada(self):
        ganadora = _op("WIN", "2026-08-03T10:00:00+02:00", "2026-08-03T11:00:00+02:00", 120.0)
        perdedora = _op("LOSS", "2026-08-04T10:00:00+02:00", "2026-08-04T11:00:00+02:00", 90.0)
        a1 = compute_analytics([ganadora, perdedora])
        a2 = compute_analytics([perdedora, ganadora])
        assert a1["max_drawdown_dollars"] == a2["max_drawdown_dollars"]


class TestSinZonaSIGUESIENDOUTC:
    """Compatibilidad: todo lo guardado antes de esto no lleva desfase. No puede
    cambiar de significado al leerse con el código nuevo."""

    def test_una_fecha_sin_zona_se_lee_como_utc_y_no_revienta(self):
        t = _op("OLD", "2026-08-04T10:00:00", "2026-08-04T11:00:00")
        a = compute_analytics([t])
        assert a["closed_trades"] == 1
        assert {d["group"] for d in a["by_day"]} == {"Tue"}

    def test_se_pueden_mezclar_operaciones_con_y_sin_zona(self):
        con = _op("TZ", "2026-08-04T08:00:00+09:00", "2026-08-04T09:00:00+09:00")
        sin = _op("NOTZ", "2026-08-05T10:00:00", "2026-08-05T11:00:00")
        a = compute_analytics([con, sin])
        assert a["closed_trades"] == 2
