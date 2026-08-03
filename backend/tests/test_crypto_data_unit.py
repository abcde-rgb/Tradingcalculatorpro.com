"""
Los precios de cripto salen de las bolsas (Binance + Kraken), no de CoinGecko.

Offline: se prueban los parsers contra muestras de las respuestas reales, nunca
contra la red. Lo que se fija aquí es sobre todo lo que NO debe pasar — que un
par retirado, una respuesta rara o un símbolo que no cotiza acaben convertidos
en un número plausible.
"""
import asyncio

import pytest

import crypto_data
from crypto_data import (
    binance_symbol,
    interval_for_days,
    parse_binance_klines,
    parse_binance_tickers,
    parse_kraken_tickers,
)


def _ticker(par, last, change="1.5", vol="1000000"):
    return {"symbol": par, "lastPrice": last, "priceChangePercent": change,
            "quoteVolume": vol, "openPrice": "1"}


# ── Nombres de par ───────────────────────────────────────────────────────
def test_default_pair_is_symbol_plus_usdt():
    assert binance_symbol("BTC") == "BTCUSDT"
    assert binance_symbol("eth") == "ETHUSDT"


def test_unsupported_symbols_return_none():
    """Pedirle USDT a Binance en USDT no tiene sentido."""
    assert binance_symbol("USDT") is None


# ── Binance: tickers ─────────────────────────────────────────────────────
def test_reads_price_change_and_volume():
    out = parse_binance_tickers([_ticker("BTCUSDT", "64000.5", "2.35", "980000000")], ["BTC"])
    assert out["BTC"]["usd"] == pytest.approx(64000.5)
    assert out["BTC"]["usd_24h_change"] == pytest.approx(2.35)
    assert out["BTC"]["usd_24h_vol"] == pytest.approx(980000000)


def test_source_declares_the_usdt_substitution():
    """Binance cotiza contra Tether, no contra dólares. Va dicho."""
    out = parse_binance_tickers([_ticker("BTCUSDT", "64000")], ["BTC"])
    assert out["BTC"]["source"] == "binance:USDT"


def test_a_delisted_pair_reporting_zero_is_dropped_not_served():
    """Un 0 aquí se convierte tres capas arriba en «esta moneda vale cero»."""
    out = parse_binance_tickers([_ticker("LUNAUSDT", "0")], ["LUNA"])
    assert "LUNA" not in out


def test_missing_symbols_are_absent_not_zero():
    out = parse_binance_tickers([_ticker("BTCUSDT", "64000")], ["BTC", "PEPE"])
    assert set(out) == {"BTC"}


def test_unparseable_optional_fields_are_none_not_zero():
    """Sin variación conocida, `None`. Un 0,0 se lee como «no se ha movido»."""
    fila = {"symbol": "BTCUSDT", "lastPrice": "64000", "priceChangePercent": "",
            "quoteVolume": None}
    out = parse_binance_tickers([fila], ["BTC"])
    assert out["BTC"]["usd"] == pytest.approx(64000)
    assert out["BTC"]["usd_24h_change"] is None
    assert out["BTC"]["usd_24h_vol"] is None


def test_garbage_payloads_give_an_empty_dict():
    assert parse_binance_tickers({"code": -1121, "msg": "Invalid symbol"}, ["BTC"]) == {}
    assert parse_binance_tickers(None, ["BTC"]) == {}
    assert parse_binance_tickers("error", ["BTC"]) == {}


# ── Kraken: tickers ──────────────────────────────────────────────────────
def test_kraken_matches_its_own_renamed_pairs():
    """Se pide XBTUSD y contesta XXBTZUSD. Hay que emparejar por contenido."""
    payload = {"error": [], "result": {"XXBTZUSD": {"c": ["64100.0", "0.5"], "o": "63000.0"}}}
    out = parse_kraken_tickers(payload, ["BTC"])
    assert out["BTC"]["usd"] == pytest.approx(64100.0)
    assert out["BTC"]["source"] == "kraken:USD"


def test_kraken_change_is_computed_from_the_open():
    """Kraken no da un porcentaje ya hecho: da la apertura del día."""
    payload = {"error": [], "result": {"XXBTZUSD": {"c": ["63000.0", "1"], "o": "63000.0"}}}
    assert parse_kraken_tickers(payload, ["BTC"])["BTC"]["usd_24h_change"] == pytest.approx(0.0)

    payload = {"error": [], "result": {"XXBTZUSD": {"c": ["66150.0", "1"], "o": "63000.0"}}}
    assert parse_kraken_tickers(payload, ["BTC"])["BTC"]["usd_24h_change"] == pytest.approx(5.0)


def test_kraken_only_answers_for_the_pairs_it_maps():
    """Es un respaldo acotado y declarado, no una segunda cobertura completa."""
    payload = {"error": [], "result": {"XXBTZUSD": {"c": ["64100.0", "1"], "o": "63000.0"}}}
    assert parse_kraken_tickers(payload, ["PEPE"]) == {}


def test_kraken_error_response_is_empty():
    assert parse_kraken_tickers({"error": ["EQuery:Unknown asset pair"]}, ["BTC"]) == {}
    assert parse_kraken_tickers(None, ["BTC"]) == {}


# ── Velas ────────────────────────────────────────────────────────────────
def test_klines_are_real_ohlc():
    """Máximo y mínimo DEL PERIODO. Agrupar la serie de precios de CoinGecko en
    cubos daba los de las muestras que cayeron dentro, que es otra cosa."""
    payload = [
        [1754006400000, "64000.0", "64500.0", "63800.0", "64200.0", "125.5", 1754010000000],
        [1754010000000, "64200.0", "64900.0", "64100.0", "64850.0", "98.2", 1754013600000],
    ]
    velas = parse_binance_klines(payload)
    assert len(velas) == 2
    assert velas[0] == {"time": 1754006400, "open": 64000.0, "high": 64500.0,
                        "low": 63800.0, "close": 64200.0, "volume": 125.5}
    assert velas[1]["high"] == 64900.0


def test_malformed_rows_are_skipped_not_guessed():
    payload = [
        [1754006400000, "64000.0", "64500.0", "63800.0", "64200.0", "125.5"],
        ["esto", "no", "va"],
        [1754010000000, "x", "64900.0", "64100.0", "64850.0", "98.2"],
    ]
    assert len(parse_binance_klines(payload)) == 1


def test_klines_garbage_is_an_empty_list():
    assert parse_binance_klines({"code": -1121}) == []
    assert parse_binance_klines(None) == []


# ── Selección de intervalo ───────────────────────────────────────────────
@pytest.mark.parametrize("days,esperado", [
    (1, "5m"), (2, "5m"), (5, "1h"), (7, "1h"), (30, "4h"), (90, "4h"), (365, "1d"),
])
def test_interval_matches_the_window(days, esperado):
    assert interval_for_days(days)[0] == esperado


def test_never_asks_for_more_candles_than_binance_returns():
    """El tope de Binance es 1000. Pedir más devuelve 1000 y una ventana
    truncada sin avisar."""
    for days in (1, 7, 30, 90, 365, 3650):
        interval, limit = interval_for_days(days)
        assert 0 < limit <= 1000, f"{days} días → {limit} velas"


def test_the_window_is_actually_covered():
    """Pedir 1000 velas de 1h para 90 días devuelve 41 días de gráfico."""
    for days in (1, 5, 30, 90, 365):
        interval, limit = interval_for_days(days)
        minutos = {"5m": 5, "1h": 60, "4h": 240, "1d": 1440}[interval]
        cubierto = limit * minutos / 1440
        assert cubierto >= days * 0.99, f"{days} días pedidos, {cubierto:.1f} cubiertos"


# ── El catálogo completo ─────────────────────────────────────────────────
def test_every_catalogued_coin_resolves_to_a_pair():
    """Las 76 del catálogo tienen que poder pedirse; si alguna no cotiza en
    Binance, faltará en la respuesta, pero no debe romper la construcción."""
    from stock_data import COINGECKO_SYMBOL_TO_ID

    sin_par = [s for s in COINGECKO_SYMBOL_TO_ID if binance_symbol(s) is None]
    assert sin_par == [], f"sin par: {sin_par}"
    assert len(COINGECKO_SYMBOL_TO_ID) >= 70, "el catálogo se ha encogido sin querer"


def test_network_failure_gives_an_empty_dict(monkeypatch):
    """Una caída de red no debe propagarse: dato ausente, no excepción."""
    async def _boom(url, params=None):
        raise RuntimeError("DNS caído")

    monkeypatch.setattr(crypto_data, "_get_json", _boom)
    assert asyncio.run(crypto_data.fetch_usd_prices(["BTC", "ETH"])) == {}
    assert asyncio.run(crypto_data.fetch_ohlc("BTC")) == []
