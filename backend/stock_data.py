"""Stock data provider — hits Yahoo Finance's JSON API directly (via curl_cffi
Chrome impersonation) for real market data. No yfinance/pandas at import time."""
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Cache for ticker info to reduce API calls
_ticker_cache = {}
_cache_duration = 300  # 5 minutes cache


# Yahoo returns empty data to plain datacenter requests (bot detection), which
# is why yfinance fails from Cloud Run ("possibly delisted; no price data").
# We hit Yahoo's JSON API directly via curl_cffi impersonating a real Chrome
# browser (TLS fingerprint + headers), which Yahoo treats as a normal visitor.
_YH_HOSTS = ("https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com")


def _yahoo_get(path: str) -> dict:
    """GET a Yahoo Finance JSON endpoint impersonating Chrome. Raises on failure."""
    from curl_cffi import requests as _cffi
    last = "no hosts tried"
    for host in _YH_HOSTS:
        try:
            r = _cffi.get(host + path, impersonate="chrome", timeout=15)
            if r.status_code == 200:
                return r.json()
            last = f"HTTP {r.status_code}"
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {e}"
    raise RuntimeError(f"Yahoo request failed ({path}): {last}")


def _yf_safe_float(val, default=0.0):
    try:
        f = float(val)
        return default if f != f else f  # NaN guard
    except (TypeError, ValueError):
        return default


def _yf_safe_int(val, default=0):
    try:
        f = float(val)
        return default if f != f else int(f)
    except (TypeError, ValueError):
        return default

# Sector mapping for fallback
SECTOR_MAP = {
    "Technology": ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOG", "GOOGL", "AMD", "INTC"],
    "Finance": ["JPM", "V", "MA", "GS", "MS", "BAC", "WFC", "C", "AXP"],
    "Healthcare": ["JNJ", "UNH", "ABBV", "PFE", "MRK", "LLY"],
    "Consumer": ["PG", "KO", "PEP", "NKE", "SBUX", "MCD"],
    "Energy": ["XOM", "CVX"],
    "ETF": ["SPY", "QQQ", "IWM", "GLD", "SLV", "TLT"],
}


def _get_sector(symbol: str) -> str:
    """Get sector for a given symbol."""
    for sector, tickers in SECTOR_MAP.items():
        if symbol.upper() in tickers:
            return sector
    return "Technology"  # Default fallback


def _get_cached_stock(symbol: str) -> Optional[dict]:
    """Return cached stock dict if still fresh, otherwise None."""
    cache_key = f"stock_{symbol}"
    if cache_key not in _ticker_cache:
        return None
    cached_data, cached_time = _ticker_cache[cache_key]
    if (datetime.now() - cached_time).total_seconds() < _cache_duration:
        logger.info(f"Using cached data for {symbol}")
        return cached_data
    return None


def _normalize_dividend_yield(raw: Optional[float]) -> float:
    """Yahoo sometimes returns dividendYield as decimal (0.005) and sometimes
    as percentage (0.5). Normalize defensively to a decimal in [0, 1)."""
    div = raw or 0.0
    if div > 1:
        div = div / 100.0
    return float(div)


def _build_stock_dict(symbol: str, hist, info: dict) -> dict:
    """Compose the public stock-data response from a yfinance hist DataFrame + info dict."""
    current_price = float(hist["Close"].iloc[-1])
    fallback_prev = hist["Close"].iloc[-2] if len(hist) > 1 else current_price
    previous_close = float(info.get("previousClose", fallback_prev))

    change = current_price - previous_close
    change_percent = (change / previous_close * 100) if previous_close > 0 else 0
    volume = info.get("volume", 0) or 0
    return {
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName") or f"{symbol} Corp.",
        "price": round(current_price, 2),
        "change": round(change, 2),
        "changePercent": round(change_percent, 2),
        "high52w": round(float(info.get("fiftyTwoWeekHigh", current_price * 1.3)), 2),
        "low52w":  round(float(info.get("fiftyTwoWeekLow",  current_price * 0.7)), 2),
        "volume": f"{volume / 1_000_000:.1f}M" if volume > 0 else "N/A",
        "sector": info.get("sector") or _get_sector(symbol),
        "dividendYield": round(_normalize_dividend_yield(info.get("dividendYield")), 6),
    }


def get_stock_data(symbol: str) -> dict:
    """Get real stock data from Yahoo Finance, caching for `_cache_duration` seconds."""
    symbol = symbol.upper().strip()

    cached = _get_cached_stock(symbol)
    if cached is not None:
        return cached

    try:
        logger.info(f"Fetching real data for {symbol} from Yahoo Finance")
        data = _yahoo_get(f"/v8/finance/chart/{symbol}?range=5d&interval=1d")
        res = (data.get("chart", {}).get("result") or [None])[0]
        meta = (res or {}).get("meta") or {}
        price = meta.get("regularMarketPrice")
        if price is None:
            raise ValueError(f"No price data for {symbol}")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price
        change = float(price) - float(prev)
        change_pct = (change / float(prev) * 100) if prev else 0.0
        vol = meta.get("regularMarketVolume") or 0
        result = {
            "symbol": symbol,
            "name": meta.get("longName") or meta.get("shortName") or symbol,
            "price": round(float(price), 2),
            "change": round(change, 2),
            "changePercent": round(change_pct, 2),
            "high52w": round(float(meta.get("fiftyTwoWeekHigh") or price), 2),
            "low52w": round(float(meta.get("fiftyTwoWeekLow") or price), 2),
            "volume": f"{vol / 1_000_000:.1f}M" if vol and vol > 0 else "N/A",
            "sector": _get_sector(symbol),
            "dividendYield": 0.0,
        }
        _ticker_cache[f"stock_{symbol}"] = (result, datetime.now())
        return result
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return _get_fallback_stock_data(symbol)


def get_ohlc_history(symbol: str, range_: str = "3mo", interval: str = "1d") -> list:
    """Historical OHLC rows from Yahoo's chart API (direct, curl_cffi Chrome).

    Returns ``[{date, ts, open, high, low, close, volume}]`` ascending by date.
    Replaces the old yfinance path, which Yahoo blocks from datacenter IPs.
    Returns [] on failure.

    `range_` accepts Yahoo ranges (1mo, 3mo, 6mo, 1y, 2y, 5y, max);
    `interval` accepts 5m, 15m, 30m, 1h, 1d, 1wk, 1mo (see `timeframes.py` for
    which pairs Yahoo actually serves).

    On INTRADAY intervals ``date`` carries the time too (``YYYY-MM-DD HH:MM``
    UTC). Without it every 5-minute bar of a session shared the string
    "2026-07-27", which is not a cosmetic problem: the scanner's event log
    de-duplicates by date, so 78 distinct intraday events collapsed into one.
    ``ts`` is the raw epoch, for callers that need to reason about bar age.
    """
    symbol = symbol.upper().strip()
    intraday = str(interval).lower() in ("1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h")
    fmt = "%Y-%m-%d %H:%M" if intraday else "%Y-%m-%d"
    try:
        data = _yahoo_get(f"/v8/finance/chart/{symbol}?range={range_}&interval={interval}")
        res = (data.get("chart", {}).get("result") or [None])[0]
        if not res:
            return []
        stamps = res.get("timestamp") or []
        quote = ((res.get("indicators") or {}).get("quote") or [{}])[0]
        opens, highs = quote.get("open") or [], quote.get("high") or []
        lows, closes = quote.get("low") or [], quote.get("close") or []
        vols = quote.get("volume") or []
        rows = []
        for idx, ts in enumerate(stamps):
            o, h, lo, c = (
                opens[idx] if idx < len(opens) else None,
                highs[idx] if idx < len(highs) else None,
                lows[idx] if idx < len(lows) else None,
                closes[idx] if idx < len(closes) else None,
            )
            # Yahoo emits null for non-trading slots — skip incomplete bars.
            if None in (o, h, lo, c):
                continue
            v = vols[idx] if idx < len(vols) else None
            rows.append({
                "date": datetime.fromtimestamp(int(ts), tz=timezone.utc).strftime(fmt),
                "ts": int(ts),
                "open": float(o), "high": float(h), "low": float(lo), "close": float(c),
                "volume": float(v) if v is not None else 0.0,
            })
        return rows
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error fetching OHLC history for {symbol}: {e}")
        return []


def _get_fallback_stock_data(symbol: str) -> dict:
    """Return an explicit error state when no real market data is available.

    We deliberately do NOT invent a price here. Returning a random number that
    looks like a real quote would mislead the user into building strikes,
    greeks and P&L on top of fabricated data. Instead we surface a null price
    plus an ``error`` message so the frontend can disable calculations.
    """
    logger.warning(f"No real data available for {symbol} — returning error state")
    return {
        "symbol": symbol,
        "name": symbol,
        "price": None,
        "change": None,
        "changePercent": None,
        "high52w": None,
        "low52w": None,
        "volume": "N/A",
        "sector": _get_sector(symbol),
        "dividendYield": 0.0,
        "error": f"No market data available for {symbol}. "
                 f"The market may be closed or the symbol may be invalid.",
    }


# Symbols discovered through Yahoo's search API carry a human-friendly name
# and an authoritative category. We cache that metadata so the rest of the app
# (e.g. _classify_symbol) can show "Apple Inc." next to AAPL even for tickers
# outside the hand-curated list.
_meta_cache = {}

# Yahoo quoteType → our UI categories.
# Canonical crypto universe: ticker -> CoinGecko id. Shared by /api/prices,
# the realtime alert poller and (mirrored) the frontend CRYPTO_LIST, so every
# surface quotes the same ~65 coins. CoinGecko is the price source of truth
# for crypto; Yahoo "-USD" symbols are only used for charts/quotes fallback.
COINGECKO_SYMBOL_TO_ID = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "AVAX": "avalanche-2",
    "DOT": "polkadot", "LINK": "chainlink", "LTC": "litecoin", "MATIC": "matic-network",
    "TRX": "tron", "ATOM": "cosmos", "NEAR": "near", "APT": "aptos",
    "ARB": "arbitrum", "OP": "optimism", "INJ": "injective-protocol",
    "SUI": "sui", "TIA": "celestia", "SHIB": "shiba-inu", "PEPE": "pepe",
    "TON": "the-open-network", "UNI": "uniswap", "XLM": "stellar",
    "XMR": "monero", "ETC": "ethereum-classic", "BCH": "bitcoin-cash",
    "FIL": "filecoin", "ALGO": "algorand", "VET": "vechain",
    "HBAR": "hedera-hashgraph", "AAVE": "aave", "MKR": "maker",
    "SAND": "the-sandbox", "MANA": "decentraland", "EOS": "eos",
    "XTZ": "tezos", "CRO": "crypto-com-chain", "QNT": "quant-network",
    "EGLD": "elrond-erd-2", "RUNE": "thorchain", "CAKE": "pancakeswap-token",
    "THETA": "theta-token", "AXS": "axie-infinity", "ICP": "internet-computer",
    "GRT": "the-graph", "IMX": "immutable-x", "RENDER": "render-token",
    "FET": "fetch-ai", "KAS": "kaspa", "STX": "blockstack", "TAO": "bittensor",
    "WIF": "dogwifcoin", "BONK": "bonk", "FLOKI": "floki",
    "JUP": "jupiter-exchange-solana", "PYTH": "pyth-network",
    "SEI": "sei-network", "ONDO": "ondo-finance", "ENA": "ethena",
    "WLD": "worldcoin-wld", "LDO": "lido-dao", "CRV": "curve-dao-token",
    "GALA": "gala", "FLOW": "flow", "CHZ": "chiliz", "BAT": "basic-attention-token",
    "1INCH": "1inch", "SUSHI": "sushi", "YFI": "yearn-finance", "AR": "arweave",
    "IOTA": "iota", "ZEC": "zcash", "POL": "polygon-ecosystem-token",
}

_YH_QUOTE_TYPE_TO_CAT = {
    "EQUITY": "stocks", "ETF": "etfs", "INDEX": "indices",
    "CURRENCY": "forex", "CRYPTOCURRENCY": "crypto", "FUTURE": "commodities",
    "MUTUALFUND": "etfs", "OPTION": "stocks",
}

# Short-lived cache of search results keyed by lowercased query, so an
# as-you-type search box doesn't fire a Yahoo request on every keystroke.
_search_cache = {}
_search_cache_ttl = 120  # seconds


def yahoo_search_symbols(query: str, limit: int = 20) -> list:
    """Search Yahoo Finance's full universe by company name or ticker.

    Returns a list of {"symbol", "name", "category"} dicts. Degrades to an
    empty list on any network/parse failure so callers can fall back to the
    curated universe. Also populates the metadata cache for _classify_symbol.
    """
    q = (query or "").strip()
    if not q:
        return []
    key = q.lower()
    cached = _search_cache.get(key)
    if cached and (datetime.now().timestamp() - cached[0]) < _search_cache_ttl:
        return cached[1]
    try:
        from urllib.parse import quote
        data = _yahoo_get(
            f"/v1/finance/search?q={quote(q)}&quotesCount={int(limit)}"
            "&newsCount=0&listsCount=0&enableFuzzyQuery=false"
        )
    except Exception as e:  # noqa: BLE001
        logger.info("Yahoo search failed for %r: %s", q, e)
        return []
    out = []
    for item in (data.get("quotes") or []):
        sym = (item.get("symbol") or "").strip()
        if not sym:
            continue
        qt = (item.get("quoteType") or "").upper()
        name = (item.get("shortname") or item.get("longname")
                or item.get("shortName") or item.get("longName") or sym)
        cat = _YH_QUOTE_TYPE_TO_CAT.get(qt, "stocks")
        _meta_cache[sym.upper()] = {"name": name, "category": cat}
        out.append({"symbol": sym, "name": name, "category": cat})
    _search_cache[key] = (datetime.now().timestamp(), out)
    return out


def get_cached_meta(symbol: str) -> dict:
    """Return {name, category} previously discovered via Yahoo search, or {}."""
    return _meta_cache.get((symbol or "").upper(), {})


def search_tickers(query: str) -> list:
    """Search tickers across stocks, ETFs, indices, commodities and crypto.

    Curated symbols match first (fast, reliable), then Yahoo's full universe
    widens the net so company names ("apple", "tesla") and any uncurated ticker
    also resolve. Returns up to 30 symbols. Empty query returns top 30 popular.
    """
    # Comprehensive ticker universe — stocks + ETFs + indices/CFDs + commodities + crypto
    all_tickers = [
        # Mega/large-cap stocks
        "AAPL", "MSFT", "NVDA", "GOOG", "GOOGL", "AMZN", "META", "TSLA", "BRK.B",
        "AVGO", "LLY", "JPM", "V", "MA", "WMT", "XOM", "JNJ", "UNH", "PG", "HD",
        "ORCL", "COST", "ABBV", "BAC", "KO", "PEP", "ADBE", "CVX", "MRK", "NFLX",
        "CRM", "ACN", "TMO", "MCD", "CSCO", "PFE", "AMD", "DIS", "ABT", "DHR",
        "WFC", "VZ", "INTU", "TXN", "QCOM", "IBM", "T", "NOW", "PM", "RTX",
        "SPGI", "GS", "MS", "BA", "CAT", "DE", "AXP", "BLK", "AMGN", "ELV",
        "ISRG", "PLTR", "UBER", "SHOP", "SNOW", "DDOG", "CRWD", "ZS", "PANW",
        "NET", "MDB", "SQ", "PYPL", "COIN", "MSTR", "RBLX", "ROKU", "SNAP",
        "PINS", "SPOT", "ABNB", "LYFT", "DOCU", "ZM", "TEAM", "OKTA", "TWLO",
        "RIVN", "LCID", "NIO", "BABA", "TSM", "ASML", "SAP", "TM", "SONY",
        "NKE", "SBUX", "CMG", "LULU", "TGT", "LOW", "EL", "MELI", "F", "GM",
        "BIDU", "JD", "PDD", "BX", "KKR", "GE", "LMT", "NOC", "ADP", "INTC",
        "MU", "SMCI", "ARM", "DELL", "HPE", "ANET", "SHEL", "BP", "OXY", "AZN",
        # Spanish stocks (BME, Yahoo ".MC" suffix) + IBEX
        "SAN.MC", "BBVA.MC", "ITX.MC", "IBE.MC", "TEF.MC", "REP.MC", "CABK.MC",
        "ACS.MC", "AMS.MC", "AENA.MC", "MAP.MC", "ELE.MC", "GRF.MC", "SAB.MC",
        # European majors (Paris, Xetra, Milan, Zurich, London)
        "AIR.PA", "MC.PA", "OR.PA", "BNP.PA", "TTE.PA", "SU.PA", "AI.PA",
        "SIE.DE", "BMW.DE", "VOW3.DE", "ALV.DE", "DTE.DE", "ADS.DE", "MBG.DE", "BAS.DE",
        "ENI.MI", "ISP.MI", "UCG.MI", "ENEL.MI", "STLAM.MI",
        "NESN.SW", "NOVN.SW", "ROG.SW",
        "HSBA.L", "ULVR.L", "AZN.L", "RIO.L", "GSK.L",
        "PYPL", "AAL", "DAL", "UAL", "LUV", "FDX", "UPS", "ABNB", "BKNG", "MAR",
        "MGM", "WYNN", "DKNG", "PENN", "F", "GM", "STLA", "TTE", "SIE",
        # ETFs (broad market, sector, leveraged)
        "SPY", "QQQ", "IWM", "DIA", "VOO", "VTI", "VT", "VEA", "VWO", "EFA",
        "EEM", "AGG", "BND", "TLT", "SHY", "IEF", "GLD", "SLV", "GDX", "GDXJ",
        "USO", "UNG", "DBC", "DBA", "URA", "REMX", "ARKK", "ARKG", "ARKF",
        "ARKW", "SOXL", "TQQQ", "SQQQ", "TMF", "TZA", "FAS", "FAZ", "UVXY",
        "VXX", "SVXY", "XLF", "XLK", "XLE", "XLV", "XLY", "XLP", "XLI", "XLB",
        "XLU", "XLRE", "XLC", "XBI", "SMH", "SOXX", "KWEB", "FXI", "EWZ", "EWJ",
        "INDA", "MCHI", "EWG", "EWQ", "EWU", "TAN", "ICLN", "LIT", "JETS",
        "HACK", "BOTZ", "CLOU", "FINX", "PAVE", "ITA", "XAR", "IBB", "IGV",
        "VNQ", "VUG", "VTV", "VIG", "DVY", "SCHD", "MOAT", "QUAL", "MTUM",
        # Indices / CFDs (yfinance accepts ^ prefix; we expose user-friendly aliases)
        "^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "^FTSE", "^GDAXI", "^FCHI",
        "^N225", "^HSI", "^STOXX50E", "^STI", "^IBEX", "^AXJO", "^GSPTSE",
        "^BVSP", "^MXX", "^KS11", "^TWII", "^NSEI", "^BSESN", "^AEX", "^SSMI",
        # Forex (yfinance "=X" syntax)
        "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X", "AUDUSD=X", "USDCAD=X",
        "NZDUSD=X", "EURGBP=X", "EURJPY=X", "GBPJPY=X", "AUDJPY=X", "USDMXN=X",
        "USDZAR=X", "USDTRY=X", "USDCNH=X", "EURAUD=X", "EURCHF=X", "EURCAD=X",
        "EURNZD=X", "GBPCHF=X", "GBPAUD=X", "GBPCAD=X", "GBPNZD=X", "AUDNZD=X",
        "AUDCAD=X", "AUDCHF=X", "NZDJPY=X", "CADJPY=X", "CHFJPY=X", "CADCHF=X",
        "USDSEK=X", "USDNOK=X", "USDDKK=X", "USDSGD=X", "USDHKD=X", "USDPLN=X",
        "USDINR=X", "USDBRL=X", "EURPLN=X", "EURSEK=X", "EURNOK=X", "EURTRY=X",
        # Commodities (futures continuous)
        "GC=F", "SI=F", "CL=F", "BZ=F", "NG=F", "HG=F", "PL=F", "PA=F",
        "ZC=F", "ZW=F", "ZS=F", "KC=F", "CC=F", "SB=F", "CT=F",
        # Crypto (yfinance "-USD" syntax)
        "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD",
        "DOGE-USD", "AVAX-USD", "DOT-USD", "LINK-USD", "LTC-USD", "MATIC-USD",
        "TRX-USD", "ATOM-USD", "NEAR-USD", "APT-USD", "ARB-USD", "OP-USD",
        "INJ-USD", "SUI-USD", "TIA-USD", "SHIB-USD", "XLM-USD", "XMR-USD",
        "ETC-USD", "BCH-USD", "FIL-USD", "ALGO-USD", "VET-USD", "HBAR-USD",
        "AAVE-USD", "MKR-USD", "SAND-USD", "MANA-USD", "EOS-USD", "XTZ-USD",
        "CRO-USD", "QNT-USD", "EGLD-USD", "RUNE-USD", "CAKE-USD", "THETA-USD",
        "AXS-USD", "ICP-USD", "FLOW-USD", "CHZ-USD", "GALA-USD", "ZEC-USD",
        "BAT-USD", "SUSHI-USD", "YFI-USD", "AR-USD", "LDO-USD", "CRV-USD",
    ]
    # de-dup while preserving order
    seen = set()
    universe = []
    for s in all_tickers:
        if s not in seen:
            seen.add(s)
            universe.append(s)

    if not query:
        return universe[:40]

    q = query.upper().strip()

    # Symbol aliases — when the user types a common short form, map it to
    # the canonical Yahoo Finance symbol so the right asset is found.
    ALIASES = {
        # Indices
        "SPX": "^GSPC", "SP500": "^GSPC", "SP": "^GSPC",
        "NDX": "^IXIC", "NASDAQ": "^IXIC", "NAS100": "^IXIC",
        "DOW": "^DJI", "DJIA": "^DJI",
        "RUT": "^RUT", "RUSSELL": "^RUT",
        "VIX": "^VIX",
        "FTSE": "^FTSE", "FTSE100": "^FTSE",
        "DAX": "^GDAXI", "DAX40": "^GDAXI", "GER40": "^GDAXI",
        "CAC": "^FCHI", "CAC40": "^FCHI",
        "NIKKEI": "^N225", "JP225": "^N225",
        "HSI": "^HSI", "HK50": "^HSI",
        "SX5E": "^STOXX50E", "EUSTX50": "^STOXX50E", "EU50": "^STOXX50E",
        "IBEX": "^IBEX", "IBEX35": "^IBEX", "ESP35": "^IBEX",
        "US500": "^GSPC", "SPX500": "^GSPC",
        "US30": "^DJI",
        "US100": "^IXIC", "USTEC": "^IXIC",
        "UK100": "^FTSE",
        "GER30": "^GDAXI",
        "FRA40": "^FCHI",
        "JPN225": "^N225",
        "AUS200": "^AXJO", "ASX200": "^AXJO",
        "NIFTY": "^NSEI", "NIFTY50": "^NSEI",
        "SENSEX": "^BSESN",
        "KOSPI": "^KS11",
        "BOVESPA": "^BVSP",
        # Commodities
        "XAUUSD": "GC=F", "XAU": "GC=F", "GOLD": "GC=F",
        "XAGUSD": "SI=F", "XAG": "SI=F", "SILVER": "SI=F",
        "WTI": "CL=F", "OIL": "CL=F", "USOIL": "CL=F",
        "BRENT": "BZ=F", "UKOIL": "BZ=F",
        "NATGAS": "NG=F", "GAS": "NG=F",
        "COPPER": "HG=F",
        "XPT": "PL=F", "PLATINUM": "PL=F",
        "XPD": "PA=F", "PALLADIUM": "PA=F",
        # Crypto (allow plain symbol → yahoo "-USD")
        "BTC": "BTC-USD", "BTCUSD": "BTC-USD",
        "ETH": "ETH-USD", "ETHUSD": "ETH-USD",
        "SOL": "SOL-USD",
        "BNB": "BNB-USD",
        "XRP": "XRP-USD",
        "ADA": "ADA-USD",
        "DOGE": "DOGE-USD",
        "AVAX": "AVAX-USD",
        "DOT": "DOT-USD",
        "LINK": "LINK-USD",
        "LTC": "LTC-USD",
        "MATIC": "MATIC-USD",
        "SHIB": "SHIB-USD", "XLM": "XLM-USD", "XMR": "XMR-USD", "ETC": "ETC-USD",
        "BCH": "BCH-USD", "FIL": "FIL-USD", "ALGO": "ALGO-USD", "VET": "VET-USD",
        "HBAR": "HBAR-USD", "AAVE": "AAVE-USD", "MKR": "MKR-USD", "SAND": "SAND-USD",
        "MANA": "MANA-USD", "EOS": "EOS-USD", "XTZ": "XTZ-USD", "CRO": "CRO-USD",
        "QNT": "QNT-USD", "EGLD": "EGLD-USD", "RUNE": "RUNE-USD", "CAKE": "CAKE-USD",
        "THETA": "THETA-USD", "AXS": "AXS-USD", "ICP": "ICP-USD", "FLOW": "FLOW-USD",
        "CHZ": "CHZ-USD", "GALA": "GALA-USD", "ZEC": "ZEC-USD", "BAT": "BAT-USD",
        "SUSHI": "SUSHI-USD", "YFI": "YFI-USD", "LDO": "LDO-USD", "CRV": "CRV-USD",
        # Forex (allow "EURUSD" → "EURUSD=X")
        "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDJPY": "USDJPY=X",
        "USDCHF": "USDCHF=X", "AUDUSD": "AUDUSD=X", "USDCAD": "USDCAD=X",
        "NZDUSD": "NZDUSD=X", "EURGBP": "EURGBP=X", "EURJPY": "EURJPY=X",
        "GBPJPY": "GBPJPY=X",
    }

    # Direct alias hit returns the canonical symbol first, then substring
    # matches, then Yahoo's wider universe.
    if q in ALIASES:
        canonical = ALIASES[q]
        matches = [canonical] + [t for t in universe if q in t.upper() and t != canonical]
    else:
        # Substring match on the curated symbols first (fast, reliable).
        matches = [t for t in universe if q in t.upper()]

    # Widen the net with Yahoo's full universe (name- or ticker-based) so
    # "apple", "tesla", "microsoft", company names and any uncurated ticker
    # also resolve. Curated hits keep priority; Yahoo fills the remainder.
    seen_m = {m.upper() for m in matches}
    for hit in yahoo_search_symbols(query, limit=40):
        sym = hit["symbol"]
        if sym.upper() not in seen_m:
            seen_m.add(sym.upper())
            matches.append(sym)

    return matches[:50]


def generate_expirations():
    """Estimate expiration dates as a last-resort fallback only.

    These dates are generated mathematically (the next Friday at increasing
    horizons) and are NOT guaranteed to be tradeable for any given symbol:
    many assets have only monthly options, and some generated dates may fall on
    market holidays. Callers must label any response built from this as
    estimated (see the ``/api/options/expirations`` endpoint) so the user is
    warned rather than misled into thinking the dates are real."""
    today = datetime.now()
    days_options = [3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180, 270, 365, 540, 730]
    expirations = []

    for days in days_options:
        date = today + timedelta(days=days)
        # Find next Friday
        days_until_friday = (4 - date.weekday()) % 7
        if days_until_friday == 0 and days > 7:
            days_until_friday = 7
        date = date + timedelta(days=days_until_friday)
        actual_days = (date - today).days

        expirations.append({
            "date": date.strftime("%Y-%m-%d"),
            "daysToExpiry": actual_days,
            "label": date.strftime("%b %d"),
            "fullLabel": date.strftime("%b %d, %Y"),
            "isWeekly": days < 30,
            "isMonthly": 30 <= days < 100,
            "isLeaps": days >= 180,
        })

    return expirations


def get_options_chain_real(symbol: str, expiration_date: str) -> Optional[dict]:
    """Get real options chain from Yahoo Finance (v7 options JSON API)."""
    try:
        logger.info(f"Fetching options chain for {symbol} expiration {expiration_date}")
        exp_unix = int(datetime.strptime(expiration_date, "%Y-%m-%d")
                       .replace(tzinfo=timezone.utc).timestamp())
        data = _yahoo_get(f"/v7/finance/options/{symbol}?date={exp_unix}")
        res = (data.get("optionChain", {}).get("result") or [None])[0]
        opts = ((res or {}).get("options") or [None])[0]
        if not opts:
            return None
        calls = opts.get("calls") or []
        puts = opts.get("puts") or []
        if not calls and not puts:
            return None

        _empty = {"bid": 0, "ask": 0, "mid": 0, "last": 0, "volume": 0, "openInterest": 0, "iv": 0.3}

        def _leg(o):
            bid = _yf_safe_float(o.get("bid"))
            ask = _yf_safe_float(o.get("ask"))
            return {
                "bid": bid,
                "ask": ask,
                "mid": (bid + ask) / 2,
                "last": _yf_safe_float(o.get("lastPrice")),
                "volume": _yf_safe_int(o.get("volume")),
                "openInterest": _yf_safe_int(o.get("openInterest")),
                "iv": _yf_safe_float(o.get("impliedVolatility"), 0.3) or 0.3,
            }

        by_strike: dict = {}
        for c in calls:
            by_strike.setdefault(_yf_safe_float(c.get("strike")), {})["call"] = _leg(c)
        for p in puts:
            by_strike.setdefault(_yf_safe_float(p.get("strike")), {})["put"] = _leg(p)

        chain = []
        for strike in sorted(by_strike):
            chain.append({
                "strike": float(strike),
                "call": by_strike[strike].get("call", dict(_empty)),
                "put": by_strike[strike].get("put", dict(_empty)),
            })
        return chain

    except Exception as e:
        logger.error(f"Error fetching options chain for {symbol}: {str(e)}")
        return None


def get_available_expirations(symbol: str) -> Optional[list]:
    """Get available expiration dates from Yahoo Finance."""
    try:
        logger.info(f"Fetching available expirations for {symbol}")
        data = _yahoo_get(f"/v7/finance/options/{symbol}")
        res = (data.get("optionChain", {}).get("result") or [None])[0]
        exp_unix = (res or {}).get("expirationDates") or []
        if not exp_unix:
            return None

        today = datetime.now()
        result = []
        for ts in exp_unix[:15]:  # Limit to first 15 expirations
            exp_date = datetime.fromtimestamp(int(ts), tz=timezone.utc).replace(tzinfo=None)
            days_to_expiry = (exp_date - today).days
            result.append({
                "date": exp_date.strftime("%Y-%m-%d"),
                "daysToExpiry": days_to_expiry,
                "label": exp_date.strftime("%b %d"),
                "fullLabel": exp_date.strftime("%b %d, %Y"),
                "isWeekly": days_to_expiry < 30,
                "isMonthly": 30 <= days_to_expiry < 100,
                "isLeaps": days_to_expiry >= 180,
            })
        return result

    except Exception as e:
        logger.error(f"Error fetching expirations for {symbol}: {str(e)}")
        return None
