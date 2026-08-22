"""Que un precio en vivo no cuelgue de un solo proveedor, y que diga si es viejo.

`market_data.py` se escribió para quitar el punto único de fallo de Yahoo —tres
proveedores en cascada, cortacircuitos y último valor bueno conocido— y estuvo
entero y desconectado: se alcanzaba sólo por dos rutas que ninguna pantalla
llamaba (hueco G-14). Todos los precios de producción seguían saliendo del
camino que ese módulo existía para sustituir.

Aquí se fija lo que cambia al enchufarlo a `/api/stock/{symbol}`:

  · cuando Yahoo responde, manda Yahoo (es el único con la ficha completa);
  · cuando Yahoo NO devuelve precio, entra la cadena;
  · y lo que la cadena no sabe se dice que no se sabe, en vez de rellenarse con
    el precio de hoy — que es lo que hacía el máximo de 52 semanas.

⚠️ Todo va con dobles. Una prueba de precios que llame a la red de verdad no
prueba nada aquí: en el sandbox Yahoo está bloqueado, así que pasaría por el
motivo equivocado, y en CI dependería de que el mercado esté abierto.
"""
import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
import stock_data  # noqa: E402


# ══════════════════════════════════════════════════════════════════════════
# Lo que no se sabe se dice que no se sabe
# ══════════════════════════════════════════════════════════════════════════
class TestRedondeaONada:
    def test_un_numero_pasa_redondeado(self):
        assert stock_data._redondea_o_nada(123.4567) == 123.46
        assert stock_data._redondea_o_nada("99.999") == 100.0

    @pytest.mark.parametrize("nada", [None, "", "N/A", {}, []])
    def test_lo_que_no_es_un_numero_es_None(self, nada):
        assert stock_data._redondea_o_nada(nada) is None

    def test_el_cero_es_un_cero_de_verdad(self):
        """Un 0 legítimo no puede convertirse en None: sólo lo indeterminado."""
        assert stock_data._redondea_o_nada(0) == 0.0


def test_el_maximo_de_52_semanas_ya_no_cae_al_precio_de_hoy(monkeypatch):
    """La regresión concreta.

    Era `float(meta.get("fiftyTwoWeekHigh") or price)`. Con Yahoo sin publicar el
    rango —índices, muchos futuros, cripto— el máximo anual salía valiendo el
    precio de hoy, que no es «desconocido»: afirma que el valor no ha estado más
    alto en un año. El usuario dimensiona posiciones con eso.
    """
    stock_data._ticker_cache.clear()
    monkeypatch.setattr(stock_data, "_yahoo_get", lambda _ruta: {
        "chart": {"result": [{"meta": {
            "regularMarketPrice": 187.42,
            "chartPreviousClose": 185.00,
            # Sin fiftyTwoWeekHigh ni fiftyTwoWeekLow, que es el caso real.
        }}]}
    })
    d = stock_data.get_stock_data("^GSPC")
    assert d["price"] == 187.42
    assert d["high52w"] is None, "un máximo anual inventado con el precio de hoy"
    assert d["low52w"] is None


def test_cuando_yahoo_sí_publica_el_rango_se_respeta(monkeypatch):
    """La otra mitad: no vale devolver None siempre y dar el test por bueno."""
    stock_data._ticker_cache.clear()
    monkeypatch.setattr(stock_data, "_yahoo_get", lambda _ruta: {
        "chart": {"result": [{"meta": {
            "regularMarketPrice": 187.42, "chartPreviousClose": 185.00,
            "fiftyTwoWeekHigh": 199.62, "fiftyTwoWeekLow": 124.17,
        }}]}
    })
    d = stock_data.get_stock_data("AAPL")
    assert d["high52w"] == 199.62
    assert d["low52w"] == 124.17


# ══════════════════════════════════════════════════════════════════════════
# La traducción al contrato que consume el frontend
# ══════════════════════════════════════════════════════════════════════════
def _quote(**extra):
    base = {
        "symbol": "AAPL", "name": "Apple Inc.", "price": 187.421,
        "previous_close": 185.0, "change": 2.421, "change_percent": 1.3086,
        "volume": 51_300_000, "currency": "USD", "source": "finnhub",
        "stale": False, "as_of": 1_770_000_000.0,
    }
    base.update(extra)
    return base


class TestQuoteAContratoStock:
    def test_los_nombres_son_los_que_espera_el_frontend(self):
        """`OptionsSubHeader` pinta `changePercent`; un `change_percent` sale
        como «undefined%» en pantalla sin que falle nada."""
        d = server.quote_a_contrato_stock(_quote(), "AAPL")
        assert d["changePercent"] == 1.31
        assert "change_percent" not in d
        assert d["price"] == 187.42 and d["change"] == 2.42

    def test_lo_que_la_reserva_no_sabe_va_en_None(self):
        d = server.quote_a_contrato_stock(_quote(), "AAPL")
        assert d["high52w"] is None and d["low52w"] is None
        assert d["dividendYield"] is None

    def test_el_volumen_se_formatea_como_el_de_yahoo(self):
        assert server.quote_a_contrato_stock(_quote(), "AAPL")["volume"] == "51.3M"

    @pytest.mark.parametrize("vol", [None, 0, "", "n/a"])
    def test_sin_volumen_publicado_es_N_A_y_no_un_cero(self, vol):
        """Finnhub no publica volumen. «0.0M» diría que no se negoció nada."""
        assert server.quote_a_contrato_stock(_quote(volume=vol), "AAPL")["volume"] == "N/A"

    def test_arrastra_de_dónde_vino_y_si_es_viejo(self):
        d = server.quote_a_contrato_stock(_quote(stale=True, source="twelvedata"), "AAPL")
        assert d["stale"] is True
        assert d["source"] == "twelvedata"
        assert d["as_of"] == 1_770_000_000.0

    def test_un_porcentaje_indeterminado_no_se_vuelve_cero(self):
        d = server.quote_a_contrato_stock(_quote(change_percent=None), "AAPL")
        assert d["changePercent"] is None


# ══════════════════════════════════════════════════════════════════════════
# La ruta: quién manda y cuándo entra la reserva
# ══════════════════════════════════════════════════════════════════════════
def _llama(symbol="AAPL"):
    return asyncio.get_event_loop().run_until_complete(server.opt_get_stock(symbol))


@pytest.fixture
def sin_cache(monkeypatch):
    """La escritura en `db.stock_cache` no es lo que se prueba aquí."""
    class _Coleccion:
        async def update_one(self, *a, **k):
            return None
    monkeypatch.setattr(server.db, "stock_cache", _Coleccion(), raising=False)


@pytest.mark.asyncio
async def test_con_yahoo_respondiendo_no_se_toca_la_reserva(monkeypatch, sin_cache):
    """Yahoo sigue siendo el primario: es el único con la ficha completa."""
    llamadas = []
    monkeypatch.setattr(server, "get_stock_data",
                        lambda s: {"symbol": s, "price": 187.42, "high52w": 199.62})
    import market_data
    monkeypatch.setattr(market_data, "get_quote",
                        lambda *a, **k: llamadas.append(a) or {"price": 1})

    d = await server.opt_get_stock("AAPL")
    assert d["price"] == 187.42
    assert d["high52w"] == 199.62, "se ha perdido la ficha rica de Yahoo"
    assert llamadas == [], "se llamó a la cadena sin hacer falta"
    assert d["stale"] is False


@pytest.mark.asyncio
async def test_si_yahoo_no_da_precio_entra_la_cadena(monkeypatch, sin_cache):
    """El caso que antes acababa en un error y ahora tiene relevo."""
    monkeypatch.setattr(server, "get_stock_data",
                        lambda s: {"symbol": s, "price": None, "error": "sin datos"})
    import market_data
    monkeypatch.setattr(market_data, "get_quote", lambda *a, **k: _quote())

    d = await server.opt_get_stock("AAPL")
    assert d["price"] == 187.42
    assert d["source"] == "finnhub"
    assert "error" not in d


@pytest.mark.asyncio
async def test_un_precio_viejo_llega_marcado(monkeypatch, sin_cache):
    """Lo único que la interfaz NO puede dejar de saber.

    Enseñar un precio de ayer como si fuera de ahora, en un sitio donde se
    dimensionan posiciones, es un problema legal y no estético.
    """
    monkeypatch.setattr(server, "get_stock_data", lambda s: {"symbol": s, "price": None})
    import market_data
    monkeypatch.setattr(market_data, "get_quote",
                        lambda *a, **k: _quote(stale=True, source="cache"))

    d = await server.opt_get_stock("AAPL")
    assert d["stale"] is True
    assert d["as_of"] is not None, "sin `as_of` la interfaz no puede decir de cuándo es"


@pytest.mark.asyncio
async def test_si_la_cadena_también_falla_se_devuelve_el_error_honesto(monkeypatch, sin_cache):
    """Sin precio no se inventa un precio: se dice que no hay."""
    fallo = {"symbol": "ZZZZ", "price": None, "error": "No market data available"}
    monkeypatch.setattr(server, "get_stock_data", lambda s: dict(fallo))
    import market_data
    monkeypatch.setattr(market_data, "get_quote",
                        lambda *a, **k: {"price": None, "error": "todos caídos"})

    d = await server.opt_get_stock("ZZZZ")
    assert d["price"] is None
    assert d["error"]
    assert d["stale"] is False


@pytest.mark.asyncio
async def test_si_la_cadena_revienta_la_ruta_no_revienta(monkeypatch, sin_cache):
    """La reserva es una mejora, no un requisito.

    Si `market_data` no importa o lanza, el usuario tiene que seguir viendo el
    estado de error de siempre — no un 500.
    """
    monkeypatch.setattr(server, "get_stock_data",
                        lambda s: {"symbol": s, "price": None, "error": "sin datos"})
    import market_data
    def _explota(*a, **k):
        raise RuntimeError("proveedor mal configurado")
    monkeypatch.setattr(market_data, "get_quote", _explota)

    d = await server.opt_get_stock("AAPL")
    assert d["price"] is None and d["error"]


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
