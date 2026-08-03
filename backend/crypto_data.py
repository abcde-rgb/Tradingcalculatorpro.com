"""Precios de criptomonedas desde las propias bolsas.

Sustituye a CoinGecko. El motivo es de licencia: todas las llamadas a CoinGecko
salían sin clave contra su endpoint público, cuyo plan gratuito no incluye
licencia comercial, y el ajuste `coingecko_api_key` del panel de admin se
guardaba pero no lo leía ninguna petición. Las bolsas de cripto publican sus
propios datos de mercado en endpoints públicos y no arrastran el problema
estructural del mundo bursátil: no hay SIP, no hay OPRA, no hay dueño del
índice cobrando aparte.

Dos cosas que hay que saber y que van etiquetadas en `source`:

  * **Binance cotiza contra USDT, no contra dólares.** Tether se mueve en torno
    a 1,000 ± 0,002 USD, así que la diferencia es de centésimas de punto
    porcentual — irrelevante para dimensionar una posición, pero es una
    sustitución y por eso el origen lo dice. Kraken sí cotiza contra USD de
    verdad, y por eso es el que manda en los pares que cubre.
  * **El precio en euros es derivado**, no cotizado: se convierte desde el
    dólar con el tipo del BCE. CoinGecko hacía exactamente lo mismo por dentro.

Lo que ninguna de las dos cubra NO se rellena. Una moneda ausente es una moneda
ausente, no un cero.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

BINANCE_TICKER = "https://api.binance.com/api/v3/ticker/24hr"
BINANCE_KLINES = "https://api.binance.com/api/v3/klines"
KRAKEN_TICKER = "https://api.kraken.com/0/public/Ticker"

FETCH_TIMEOUT_SECONDS: int = 12

# Binance nombra el par SÍMBOLO+USDT salvo excepciones. Se listan sólo las que
# no siguen la regla, para que añadir una moneda no obligue a tocar nada.
_BINANCE_OVERRIDES: Dict[str, str] = {
    "IOTA": "IOTAUSDT",
    "MIOTA": "IOTAUSDT",
    "LUNA": "LUNAUSDT",
    "RENDER": "RENDERUSDT",
}
# Monedas que Binance no lista y no tiene sentido pedirle.
_BINANCE_UNSUPPORTED = {"USDT"}

# Kraken usa su propia nomenclatura (XBT por BTC) y devuelve la respuesta con
# nombres canónicos aún distintos (XXBTZUSD). Sólo se mapean los pares con
# dólar REAL de las monedas principales: es un respaldo acotado y declarado,
# no una segunda cobertura completa.
_KRAKEN_PAIRS: Dict[str, str] = {
    "BTC": "XBTUSD", "ETH": "ETHUSD", "SOL": "SOLUSD", "XRP": "XRPUSD",
    "ADA": "ADAUSD", "DOGE": "DOGEUSD", "AVAX": "AVAXUSD", "DOT": "DOTUSD",
    "LINK": "LINKUSD", "LTC": "LTCUSD", "MATIC": "MATICUSD", "ATOM": "ATOMUSD",
    "UNI": "UNIUSD", "XLM": "XLMUSD", "ALGO": "ALGOUSD", "FIL": "FILUSD",
    "AAVE": "AAVEUSD", "TRX": "TRXUSD", "NEAR": "NEARUSD", "BCH": "BCHUSD",
}


def binance_symbol(sym: str) -> Optional[str]:
    """Par de Binance para un símbolo, o None si no procede pedirlo."""
    s = sym.upper()
    if s in _BINANCE_UNSUPPORTED:
        return None
    return _BINANCE_OVERRIDES.get(s, f"{s}USDT")


def parse_binance_tickers(payload: Any, symbols: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    """Respuesta de `/ticker/24hr` → `{SÍMBOLO: {...}}`.

    Separado del fetch para poder probarlo sin red. Descarta silenciosamente
    las filas sin precio utilizable: un par retirado devuelve 0, y un 0 aquí se
    convierte en «esta moneda vale cero» tres capas más arriba.
    """
    if not isinstance(payload, list):
        payload = [payload] if isinstance(payload, dict) else []
    por_par = {row.get("symbol"): row for row in payload if isinstance(row, dict)}

    salida: Dict[str, Dict[str, Any]] = {}
    for sym in symbols:
        par = binance_symbol(sym)
        fila = por_par.get(par) if par else None
        if not fila:
            continue
        try:
            precio = float(fila.get("lastPrice") or 0)
        except (TypeError, ValueError):
            continue
        if precio <= 0:
            continue

        def _opt(clave: str) -> Optional[float]:
            bruto = fila.get(clave)
            if bruto is None or bruto == "":
                return None
            try:
                return float(bruto)
            except (TypeError, ValueError):
                return None

        salida[sym.upper()] = {
            "usd": precio,
            "usd_24h_change": _opt("priceChangePercent"),
            "usd_24h_vol": _opt("quoteVolume"),
            "source": "binance:USDT",
        }
    return salida


def parse_kraken_tickers(payload: Any, symbols: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    """Respuesta de Kraken `/0/public/Ticker` → `{SÍMBOLO: {...}}`.

    Kraken renombra los pares en la respuesta (XBTUSD → XXBTZUSD), así que se
    empareja por contenido en vez de por igualdad exacta.
    """
    if not isinstance(payload, dict):
        return {}
    resultado = payload.get("result")
    if not isinstance(resultado, dict):
        return {}

    salida: Dict[str, Dict[str, Any]] = {}
    for sym in symbols:
        par = _KRAKEN_PAIRS.get(sym.upper())
        if not par:
            continue
        base, cotizada = par[:-3], par[-3:]
        fila = None
        for clave, valor in resultado.items():
            # XXBTZUSD contiene XBT y acaba en USD; ZUSD también acaba en USD.
            if base in clave and clave.endswith(cotizada):
                fila = valor
                break
        if not isinstance(fila, dict):
            continue
        try:
            precio = float((fila.get("c") or [0])[0])
            apertura = float(fila.get("o") or 0)
        except (TypeError, ValueError, IndexError):
            continue
        if precio <= 0:
            continue
        salida[sym.upper()] = {
            "usd": precio,
            # Kraken da la apertura del día, no un cambio ya calculado.
            "usd_24h_change": round((precio - apertura) / apertura * 100, 4) if apertura else None,
            "usd_24h_vol": None,
            "source": "kraken:USD",
        }
    return salida


async def _get_json(url: str, params: Optional[dict] = None) -> Any:
    import httpx  # import local: mantiene el módulo importable sin red

    async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
        r = await client.get(url, params=params)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}")
    return r.json()


async def fetch_usd_prices(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """Precio en dólares de cada símbolo. Las que no se puedan, faltan.

    Kraken manda sobre Binance en los pares que cubre, porque cotiza contra
    dólar de verdad y no contra Tether.
    """
    simbolos = [s.upper() for s in symbols]
    salida: Dict[str, Dict[str, Any]] = {}

    pares = [p for p in (binance_symbol(s) for s in simbolos) if p]
    if pares:
        try:
            payload = await _get_json(
                BINANCE_TICKER,
                {"symbols": json.dumps(pares, separators=(",", ":"))},
            )
            salida.update(parse_binance_tickers(payload, simbolos))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallo al leer los tickers de Binance: %s", exc)

    kraken_symbols = [s for s in simbolos if s in _KRAKEN_PAIRS]
    if kraken_symbols:
        try:
            payload = await _get_json(
                KRAKEN_TICKER,
                {"pair": ",".join(_KRAKEN_PAIRS[s] for s in kraken_symbols)},
            )
            # Pisa a Binance: dólar real por encima de Tether.
            salida.update(parse_kraken_tickers(payload, kraken_symbols))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Fallo al leer los tickers de Kraken: %s", exc)

    return salida


def parse_binance_klines(payload: Any) -> List[Dict[str, Any]]:
    """Velas de Binance → `[{time, open, high, low, close, volume}]`.

    Binance da OHLC de verdad. La ruta anterior agrupaba la serie de precios de
    CoinGecko en cubos y llamaba a eso «velas»: los máximos y mínimos de una
    vela así son los de las muestras que cayeron dentro, no los del periodo.
    """
    if not isinstance(payload, list):
        return []
    velas: List[Dict[str, Any]] = []
    for fila in payload:
        if not isinstance(fila, (list, tuple)) or len(fila) < 6:
            continue
        try:
            velas.append({
                "time": int(fila[0]) // 1000,
                "open": float(fila[1]),
                "high": float(fila[2]),
                "low": float(fila[3]),
                "close": float(fila[4]),
                "volume": float(fila[5]),
            })
        except (TypeError, ValueError):
            continue
    return velas


def interval_for_days(days: int) -> tuple:
    """(intervalo de Binance, nº de velas) para una ventana en días.

    Se pide lo justo para cubrir la ventana. Pedir 1000 velas de 1h para 90
    días devuelve 41 días y un gráfico truncado sin avisar de que lo está.
    """
    if days <= 2:
        return "5m", min(max(days, 1) * 288, 1000)
    if days <= 7:
        return "1h", min(days * 24, 1000)
    if days <= 90:
        return "4h", min(days * 6, 1000)
    return "1d", min(days, 1000)


async def fetch_ohlc(symbol: str, interval: str = "1d", limit: int = 200) -> List[Dict[str, Any]]:
    """Velas OHLC reales de Binance. Lista vacía si el par no existe."""
    par = binance_symbol(symbol)
    if not par:
        return []
    try:
        payload = await _get_json(
            BINANCE_KLINES,
            {"symbol": par, "interval": interval, "limit": min(int(limit), 1000)},
        )
        return parse_binance_klines(payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo al leer las velas de %s en Binance: %s", par, exc)
        return []
