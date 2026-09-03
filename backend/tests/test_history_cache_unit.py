"""Pruebas de la caché del histórico de velas (`stock_data`).

El escáner pedía a Yahoo la serie ENTERA en cada escaneo, así que N usuarios
sobre el mismo símbolo eran N descargas y el refresco del navegador no podía
bajar del minuto sin castigar al proveedor. Estas pruebas fijan las cuatro
cosas que hacen que compartir la descarga sea seguro.

Sin red: `_yahoo_get` va mockeado y se CUENTAN las llamadas. Una prueba que
llamara a Yahoo de verdad no probaría nada en el sandbox remoto —está
bloqueado— y sería lenta y frágil en cualquier otro sitio.
"""
import stock_data


def _velas(n=3, base=100.0):
    return {"chart": {"result": [{
        "timestamp": [1_700_000_000 + i * 86400 for i in range(n)],
        "indicators": {"quote": [{
            "open":  [base + i for i in range(n)],
            "high":  [base + i + 1 for i in range(n)],
            "low":   [base + i - 1 for i in range(n)],
            "close": [base + i + 0.5 for i in range(n)],
            "volume": [1000 + i for i in range(n)],
        }]},
    }]}}


class _Contador:
    """Sustituye a `_yahoo_get` y lleva la cuenta de las llamadas de verdad."""

    def __init__(self, respuesta=None):
        self.llamadas = 0
        self.respuesta = respuesta if respuesta is not None else _velas()

    def __call__(self, path, **kwargs):
        self.llamadas += 1
        if isinstance(self.respuesta, Exception):
            raise self.respuesta
        return self.respuesta


def _limpia():
    stock_data._history_cache.clear()


def test_la_segunda_lectura_dentro_del_ttl_no_vuelve_a_la_red(monkeypatch):
    _limpia()
    contador = _Contador()
    monkeypatch.setattr(stock_data, "_yahoo_get", contador)

    a = stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    b = stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")

    assert a and a == b, "la caché tiene que devolver las MISMAS velas"
    assert contador.llamadas == 1, (
        f"se bajó {contador.llamadas} veces: la caché no está compartiendo la descarga"
    )


def test_pasado_el_ttl_se_vuelve_a_bajar(monkeypatch):
    _limpia()
    contador = _Contador()
    monkeypatch.setattr(stock_data, "_yahoo_get", contador)

    stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    # Envejecer la entrada más allá del TTL en vez de esperar 300 s de reloj.
    clave = stock_data._history_key("EURUSD=X", "3mo", "1d")
    filas, cuando = stock_data._history_cache[clave]
    stock_data._history_cache[clave] = (filas, cuando - stock_data._history_ttl("1d") - 1)

    stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    assert contador.llamadas == 2, "una entrada caducada tiene que volver a bajarse"


def test_simbolo_rango_e_intervalo_no_comparten_entrada(monkeypatch):
    """El fallo que no da error: servir la serie de 5m como si fuera la diaria.

    No revienta nada — devuelve velas perfectamente válidas — y el escáner
    escanea en silencio el gráfico equivocado. Por eso la clave lleva los tres.
    """
    _limpia()
    contador = _Contador()
    monkeypatch.setattr(stock_data, "_yahoo_get", contador)

    stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    stock_data.get_ohlc_history("EURUSD=X", "3mo", "5m")    # otro intervalo
    stock_data.get_ohlc_history("EURUSD=X", "1mo", "1d")    # otro rango
    stock_data.get_ohlc_history("GBPUSD=X", "3mo", "1d")    # otro símbolo

    assert contador.llamadas == 4, (
        "cuatro series distintas tienen que ser cuatro descargas, no una compartida"
    )


def test_un_fallo_no_se_cachea_ni_pisa_lo_bueno(monkeypatch):
    """Guardar el vacío dejaría el símbolo roto durante todo el TTL."""
    _limpia()
    bueno = _Contador()
    monkeypatch.setattr(stock_data, "_yahoo_get", bueno)
    filas_buenas = stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    assert filas_buenas

    # Caduca la entrada y ahora el proveedor falla.
    clave = stock_data._history_key("EURUSD=X", "3mo", "1d")
    filas, cuando = stock_data._history_cache[clave]
    stock_data._history_cache[clave] = (filas, cuando - stock_data._history_ttl("1d") - 1)
    roto = _Contador(RuntimeError("Yahoo 502"))
    monkeypatch.setattr(stock_data, "_yahoo_get", roto)

    assert stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d") == [], (
        "un fallo se sigue reportando como vacío, no se disfraza"
    )
    guardado = stock_data._history_cache.get(clave)
    assert guardado is not None and guardado[0] == filas_buenas, (
        "el fallo ha borrado la entrada buena: el siguiente intento parte de cero"
    )


def test_history_fetched_at_da_el_momento_del_dato_no_el_de_la_peticion(monkeypatch):
    """Es lo que la pantalla enseña como antigüedad; si mintiera, mentiría ella."""
    _limpia()
    contador = _Contador()
    monkeypatch.setattr(stock_data, "_yahoo_get", contador)

    assert stock_data.history_fetched_at("EURUSD=X", "3mo", "1d") is None, (
        "sin descarga previa no hay fecha que dar, y None no es cero"
    )
    stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    primero = stock_data.history_fetched_at("EURUSD=X", "3mo", "1d")
    assert primero is not None

    # Una lectura servida de caché NO rejuvenece el dato.
    stock_data.get_ohlc_history("EURUSD=X", "3mo", "1d")
    assert stock_data.history_fetched_at("EURUSD=X", "3mo", "1d") == primero, (
        "leer de la caché ha actualizado la marca: la pantalla diría que el dato "
        "es más nuevo de lo que es"
    )
    assert contador.llamadas == 1


def test_el_ttl_sale_de_la_escalera_de_intervalos():
    """Un tercio de la vela, con suelo y techo. Los minutos salen de
    `timeframes`, no de una segunda tabla que se desviaría de ella."""
    assert stock_data._history_ttl("5m") == 100          # 300 s / 3
    assert stock_data._history_ttl("1h") == stock_data._HISTORY_TTL_CEIL
    assert stock_data._history_ttl("1d") == stock_data._HISTORY_TTL_CEIL
    assert stock_data._history_ttl("desconocido") == stock_data._HISTORY_TTL_CEIL
