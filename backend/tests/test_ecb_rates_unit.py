"""
El forex sale del BCE, no de Yahoo ni de ExchangeRate-API.

Offline: se prueba el parser y el cruce contra una muestra del feed, nunca
contra la red. El BCE cotiza todo contra el euro, así que cualquier par se
arma cruzando por él, y ahí es donde se cuelan los errores de inversión — de
ahí que haya un test por sentido.
"""
import pytest

from ecb_rates import build_pairs, cross_rate, parse_ecb_history

# Tipos plausibles: 1 EUR = N divisas, que es como publica el BCE.
HOY = {"USD": 1.0850, "JPY": 162.50, "GBP": 0.8520, "CHF": 0.9560,
       "AUD": 1.6580, "CAD": 1.4720, "NZD": 1.8130}
AYER = {"USD": 1.0800, "JPY": 162.00, "GBP": 0.8500, "CHF": 0.9600,
        "AUD": 1.6600, "CAD": 1.4700, "NZD": 1.8200}


def _feed(dias):
    """Feed como el `eurofxref-hist-90d.xml`. `dias` = [(fecha, {DIV: tipo})]."""
    cubes = []
    for fecha, tipos in dias:
        filas = "".join(
            f'<Cube currency="{d}" rate="{v}"/>' for d, v in tipos.items()
        )
        cubes.append(f'<Cube time="{fecha}">{filas}</Cube>')
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" '
        'xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">'
        f'<Cube>{"".join(cubes)}</Cube>'
        '</gesmes:Envelope>'
    )


# ── Parseo ───────────────────────────────────────────────────────────────
def test_parses_days_newest_first():
    dias = parse_ecb_history(_feed([("2026-07-31", AYER), ("2026-08-01", HOY)]))
    assert [d[0] for d in dias] == ["2026-08-01", "2026-07-31"]


def test_euro_is_in_the_rate_map_as_one():
    """El BCE no publica EUR contra sí mismo; sin ese 1.0 los cruces con euro
    quedan fuera y EURUSD desaparece."""
    _, tipos = parse_ecb_history(_feed([("2026-08-01", HOY)]))[0]
    assert tipos["EUR"] == 1.0


def test_garbage_is_an_empty_list_not_an_exception():
    assert parse_ecb_history("<html>503</html>") == []
    assert parse_ecb_history("esto no es xml") == []
    assert parse_ecb_history(_feed([])) == []


# ── Cruces ───────────────────────────────────────────────────────────────
def test_direct_pair_against_the_euro():
    """EURUSD es el tipo publicado, tal cual."""
    assert cross_rate("EURUSD", {**HOY, "EUR": 1.0}) == pytest.approx(1.0850)


def test_inverted_pair():
    """USDCHF = CHF por euro / USD por euro. Invertirlo da 1.04 en vez de 0.88."""
    got = cross_rate("USDCHF", {**HOY, "EUR": 1.0})
    assert got == pytest.approx(0.9560 / 1.0850)
    assert 0.85 < got < 0.90, "USDCHF fuera de rango: el cruce está invertido"


def test_cross_pair_with_no_euro_leg():
    """GBPJPY no toca el euro en su nombre, pero se arma cruzando por él."""
    got = cross_rate("GBPJPY", {**HOY, "EUR": 1.0})
    assert got == pytest.approx(162.50 / 0.8520)
    assert 185 < got < 195


def test_pair_the_ecb_does_not_publish_is_none_not_a_substitute():
    """No se sirve CNY donde se pidió CNH: un primo cercano se lee igual que
    el bueno en pantalla."""
    assert cross_rate("USDCNH", {**HOY, "EUR": 1.0}) is None


def test_malformed_pair_is_none():
    assert cross_rate("EUR", {**HOY, "EUR": 1.0}) is None
    assert cross_rate("", {}) is None


# ── Construcción de la respuesta ─────────────────────────────────────────
def test_change_is_the_real_day_over_day_move():
    """La ruta anterior mandaba change: 0.0 en todos los pares, siempre."""
    out = build_pairs(["EURUSD"], parse_ecb_history(
        _feed([("2026-07-31", AYER), ("2026-08-01", HOY)])))
    esperado = (1.0850 - 1.0800) / 1.0800 * 100
    assert out["EURUSD"]["change"] == pytest.approx(esperado, abs=1e-4)
    assert out["EURUSD"]["change"] > 0


def test_change_is_none_with_a_single_day_not_zero():
    """Un 0,0 ahí se lee como «el par no se ha movido», que es otra cosa."""
    out = build_pairs(["EURUSD"], parse_ecb_history(_feed([("2026-08-01", HOY)])))
    assert out["EURUSD"]["change"] is None
    assert out["EURUSD"]["price"] == pytest.approx(1.0850)


def test_response_carries_source_and_date():
    """La fecha importa: estos tipos son de cierre, no de ahora mismo."""
    out = build_pairs(["EURUSD"], parse_ecb_history(_feed([("2026-08-01", HOY)])))
    assert out["EURUSD"]["source"] == "ecb"
    assert out["EURUSD"]["as_of"] == "2026-08-01"


def test_unsupported_pairs_are_omitted_not_faked():
    out = build_pairs(["EURUSD", "USDCNH"], parse_ecb_history(_feed([("2026-08-01", HOY)])))
    assert "EURUSD" in out
    assert "USDCNH" not in out


def test_the_ten_pairs_the_endpoint_serves_all_resolve():
    """Los 10 pares de /forex-prices los cubre el BCE entero: migrar no pierde
    ninguno."""
    from missing_apis import FOREX_PAIRS

    out = build_pairs(FOREX_PAIRS, parse_ecb_history(
        _feed([("2026-07-31", AYER), ("2026-08-01", HOY)])))
    assert set(out) == set(FOREX_PAIRS), f"faltan: {set(FOREX_PAIRS) - set(out)}"
    for par, datos in out.items():
        assert datos["price"] > 0, par


def test_no_days_gives_an_empty_dict():
    assert build_pairs(["EURUSD"], []) == {}
