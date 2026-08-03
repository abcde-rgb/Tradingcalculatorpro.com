"""
El tipo libre de riesgo sale del Tesoro de EE. UU., no de Yahoo.

Offline: se prueba el parser contra una muestra del feed, nunca contra la red.
El feed es Atom/OData, así que cada etiqueta llega como `{namespace}NOMBRE` y
Treasury ya ha cambiado esos namespaces al menos una vez (publican un aviso
para desarrolladores cuando lo hacen). Por eso el parser trabaja sobre el
nombre local y estos tests le meten un namespace distinto a propósito.
"""
import pytest

import market_rates
from market_rates import parse_treasury_yield_curve


def _feed(rows, ns="http://schemas.microsoft.com/ado/2007/08/dataservices"):
    """Construye un feed como el del Tesoro. `rows` = [(fecha, valor_3m)]."""
    entries = []
    for date, three_month in rows:
        yield_tag = (f'<d:BC_3MONTH m:type="Edm.Double">{three_month}</d:BC_3MONTH>'
                     if three_month is not None else '<d:BC_3MONTH m:null="true"/>')
        entries.append(f"""
  <entry>
    <content type="application/xml">
      <m:properties>
        <d:NEW_DATE m:type="Edm.DateTime">{date}</d:NEW_DATE>
        <d:BC_1MONTH m:type="Edm.Double">4.31</d:BC_1MONTH>
        {yield_tag}
        <d:BC_1YEAR m:type="Edm.Double">3.95</d:BC_1YEAR>
      </m:properties>
    </content>
  </entry>""")
    return (f'<?xml version="1.0" encoding="utf-8"?>\n'
            f'<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="{ns}" '
            f'xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">'
            f'{"".join(entries)}\n</feed>')


def test_reads_the_three_month_yield_as_a_fraction():
    """4,28% publicado → 0,0428 devuelto. El feed va en porcentaje."""
    got = parse_treasury_yield_curve(_feed([("2026-08-01T00:00:00", "4.28")]))
    assert got == pytest.approx(0.0428)


def test_takes_the_newest_row_not_the_last_one_in_the_file():
    """El orden del feed no es garantía: se elige por fecha."""
    got = parse_treasury_yield_curve(_feed([
        ("2026-07-30T00:00:00", "4.10"),
        ("2026-08-01T00:00:00", "4.28"),   # la más reciente
        ("2026-07-31T00:00:00", "4.20"),
    ]))
    assert got == pytest.approx(0.0428)


def test_skips_rows_with_no_yield():
    """Días sin publicación (festivos) traen la etiqueta vacía o nula."""
    got = parse_treasury_yield_curve(_feed([
        ("2026-07-31T00:00:00", "4.20"),
        ("2026-08-01T00:00:00", None),     # festivo: sin dato
    ]))
    assert got == pytest.approx(0.0420)


def test_survives_a_namespace_change():
    """Treasury ya cambió los namespaces una vez. Se busca por nombre local."""
    otro = "http://example.invalid/v9/dataservices"
    assert parse_treasury_yield_curve(_feed([("2026-08-01T00:00:00", "4.28")], ns=otro)) == pytest.approx(0.0428)


def test_empty_feed_is_none_not_zero():
    """Enero, feed del año aún sin publicar. Indefinido, no 0%."""
    assert parse_treasury_yield_curve(_feed([])) is None


def test_garbage_is_none_not_an_exception():
    """Nunca romper el pricing por culpa de la búsqueda del tipo."""
    assert parse_treasury_yield_curve("<html>503 Service Unavailable</html>") is None
    assert parse_treasury_yield_curve("no es xml en absoluto") is None
    assert parse_treasury_yield_curve(_feed([("2026-08-01T00:00:00", "n/d")])) is None


def test_implausible_values_fall_back(monkeypatch):
    """Un cambio de unidades (porcentaje vs fracción) no debe valorar el libro.

    428% cae fuera de la banda y se descarta: mejor el fallback que tasar cada
    opción contra un tipo absurdo.
    """
    monkeypatch.setattr(market_rates, "_get_feed",
                        lambda year: _feed([("2026-08-01T00:00:00", "428.0")]))
    assert market_rates._fetch_live_rate() is None


def test_falls_back_to_last_year_in_early_january(monkeypatch):
    """El feed es por año natural: el 1 de enero el del año en curso va vacío."""
    visto = []

    def _feed_por_anio(year):
        visto.append(year)
        return _feed([]) if len(visto) == 1 else _feed([("2025-12-31T00:00:00", "4.05")])

    monkeypatch.setattr(market_rates, "_get_feed", _feed_por_anio)
    assert market_rates._fetch_live_rate() == pytest.approx(0.0405)
    assert len(visto) == 2, "debe mirar el año anterior, y sólo uno"


def test_network_failure_is_none_not_an_exception(monkeypatch):
    def _boom(year):
        raise RuntimeError("DNS caído")

    monkeypatch.setattr(market_rates, "_get_feed", _boom)
    assert market_rates._fetch_live_rate() is None
