"""instruments.py — qué es cada producto financiero, como dato y no como suposición.

El diario nació sobre una idea implícita: "una operación es comprar N unidades a
un precio". Eso describe una acción al contado y **ninguna otra cosa**. Un lote
de forex son 100 000 unidades de la divisa base; un contrato de oro en COMEX son
100 onzas; un micro E-mini vale 5 $ por punto; un perpetuo de cripto paga
funding cada ocho horas; un CFD de oro a 20× no mueve 20 veces el P&L, mueve 20
veces el **margen**. Sin esos datos, dos operaciones con los mismos números en
pantalla significan cosas distintas y la analítica las suma como si no.

Este módulo publica tres cosas y ninguna más:

1. **El catálogo** — qué mide cada producto y cada símbolo conocido (tamaño de
   contrato, tick/pip, apalancamiento típico, cómo se paga el mantener la
   posición abierta).
2. **Las conversiones** — el trader escribe el stop en pips, en ticks, en
   dólares, en % de la cuenta o en R; todo eso aterriza en **un nivel de precio**,
   que es lo único que se almacena. Por eso el resto de la analítica no se entera
   de que existen unidades: sigue leyendo `sl` y `tp` como siempre.
3. **La matemática de la posición** — nocional, margen, apalancamiento efectivo,
   liquidación estimada, riesgo y recompensa medidos sobre el monto total, y el
   coste de mantenerla abierta.

⚠️ **El catálogo PREFIJA, no decide.** Cada operación almacena su propio
`multiplier` (tamaño de contrato) y su propio `leverage`; el catálogo sólo sirve
para rellenarlos por ti la primera vez. Los apalancamientos, los márgenes
iniciales y los topes que aparecen aquí son **valores típicos de referencia** —
cada bróker y cada jurisdicción tienen los suyos, y cambian. Por eso todo campo
que salga de aquí es editable en el formulario, y `known` dice si el símbolo
estaba en el catálogo o si el número lo puso el usuario.

Regla de honestidad heredada del resto del proyecto: **lo que no se puede
calcular es `None`, nunca 0**. Un margen sin apalancamiento declarado, una
liquidación en un producto sin apalancamiento o un R:R sin stop son indefinidos,
y devolver un cero los convierte en la peor lectura posible de una cosa que
simplemente no se sabe.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# ─── Topes y convenciones ─────────────────────────────────────────

# Exposición máxima por defecto: el nocional de la posición no debería superar
# 10 veces el saldo de la cuenta. Es un techo de SENTIDO COMÚN sobre el tamaño,
# no sobre el apalancamiento nominal: 100× sobre 100 $ en una cuenta de 10 000 $
# son 10 000 $ de nocional (1× la cuenta) y no tiene nada de malo; 20× sobre
# 20 000 $ en esa misma cuenta son 400 000 $ y una vela normal te la lleva.
# Lo que mata no es el número de la X, es cuánto mercado tienes delante.
DEFAULT_MAX_EXPOSURE_MULTIPLE = 10.0

# Suelo duro del R:B: la recompensa no debería ser menor que el riesgo. Es
# independiente del `min_rr` del plan (que es la ambición del trader, 1.5 por
# defecto): esto es el mínimo por debajo del cual la operación necesita una tasa
# de acierto superior al 50 % sólo para empatar.
MIN_RR_FLOOR = 1.0

# Tasa de mantenimiento por defecto para la liquidación estimada, cuando el
# símbolo no declara la suya. 0,5 % es el orden de magnitud habitual en cripto
# apalancado y en CFD para tamaños pequeños; con tamaños grandes sube por
# tramos, y por eso la liquidación que sale de aquí se publica SIEMPRE como
# estimación con sus supuestos al lado.
DEFAULT_MAINTENANCE_MARGIN_RATE = 0.005

# Horas entre pagos de funding en un perpetuo. Ocho es la convención de Binance,
# Bybit y OKX; hay mercados que lo pagan cada hora y el usuario puede cambiarlo.
DEFAULT_FUNDING_INTERVAL_HOURS = 8


# ─── Productos ────────────────────────────────────────────────────
# `carry` = cómo se paga tener la posición abierta de un día para otro:
#   None      → no se paga nada (contado, futuros, opciones)
#   "funding" → perpetuos de cripto: cada 8 h, un lado paga al otro
#   "swap"    → CFD y forex: interés nocturno (la "comisión nocturna")
# `sizing` = en qué unidad se mide el tamaño, que es lo que la UI debe preguntar.

PRODUCTS: Dict[str, Dict[str, Any]] = {
    "stock": {
        "id": "stock",
        "label": "Acciones",
        "sizing": "shares",
        "default_contract_size": 1.0,
        "uses_leverage": True,          # cuenta de margen; 1× es lo normal
        "default_leverage": 1.0,
        "typical_max_leverage": 5.0,
        "carry": None,
        "quote_units": ["price", "pct", "money", "pct_balance"],
        "defined_risk": False,
    },
    "crypto_spot": {
        "id": "crypto_spot",
        "label": "Cripto spot",
        "sizing": "coins",
        "default_contract_size": 1.0,
        "uses_leverage": False,         # al contado no hay apalancamiento
        "default_leverage": 1.0,
        "typical_max_leverage": 1.0,
        "carry": None,
        "quote_units": ["price", "pct", "money", "pct_balance"],
        "defined_risk": False,
    },
    "crypto_perp": {
        "id": "crypto_perp",
        "label": "Cripto perpetuo",
        "sizing": "coins",
        "default_contract_size": 1.0,
        "uses_leverage": True,
        "default_leverage": 5.0,
        "typical_max_leverage": 125.0,
        "carry": "funding",
        "quote_units": ["price", "pct", "money", "pct_balance"],
        "defined_risk": False,
    },
    "futures": {
        "id": "futures",
        "label": "Futuros",
        "sizing": "contracts",
        "default_contract_size": None,  # sin símbolo conocido NO se inventa
        "uses_leverage": True,          # implícito vía margen del mercado
        "default_leverage": None,
        "typical_max_leverage": None,
        "carry": None,                  # el coste va en el rollover, no diario
        "quote_units": ["price", "ticks", "points", "money", "pct_balance"],
        "defined_risk": False,
    },
    "cfd": {
        "id": "cfd",
        "label": "CFD",
        "sizing": "lots",
        "default_contract_size": 1.0,
        "uses_leverage": True,
        "default_leverage": 10.0,
        "typical_max_leverage": 30.0,
        "carry": "swap",
        "quote_units": ["price", "points", "pct", "money", "pct_balance"],
        "defined_risk": False,
    },
    "forex": {
        "id": "forex",
        "label": "Forex",
        "sizing": "lots",
        "default_contract_size": 100000.0,   # 1 lote estándar
        "uses_leverage": True,
        "default_leverage": 30.0,
        "typical_max_leverage": 500.0,
        "carry": "swap",
        "quote_units": ["price", "pips", "money", "pct_balance"],
        "defined_risk": False,
    },
    "option": {
        "id": "option",
        "label": "Opciones",
        "sizing": "contracts",
        "default_contract_size": 100.0,      # opción sobre acciones
        # El apalancamiento de una opción es implícito (lo da la delta y la
        # prima), no un número que el bróker te deje elegir. Declararlo aquí
        # como 1 no es una simplificación: es que no existe esa palanca.
        "uses_leverage": False,
        "default_leverage": 1.0,
        "typical_max_leverage": 1.0,
        "carry": None,
        "quote_units": ["price", "pct", "money", "pct_balance"],
        # Riesgo DEFINIDO: en una compra de opción o en un spread, la pérdida
        # máxima no sale de |entrada − stop|, sale de la estructura. Es lo que
        # permite que una operación de opciones tenga R sin tener stop de precio.
        "defined_risk": True,
    },
    # Compatibilidad: todo lo guardado antes de que existieran los productos
    # lleva `instrument_type: "spot"`. Se comporta exactamente como antes
    # (tamaño de contrato 1, sin apalancamiento, sin coste de mantenimiento),
    # así que ninguna operación vieja cambia de valor al leerse.
    "spot": {
        "id": "spot",
        "label": "Spot",
        "sizing": "units",
        "default_contract_size": 1.0,
        "uses_leverage": True,
        "default_leverage": 1.0,
        "typical_max_leverage": 1.0,
        "carry": None,
        "quote_units": ["price", "pct", "money", "pct_balance"],
        "defined_risk": False,
    },
}

PRODUCT_IDS = tuple(PRODUCTS)

# El producto por defecto de una operación que no lo declara. `spot` y no
# `stock` a propósito: es lo que ya tienen guardado las operaciones existentes.
DEFAULT_PRODUCT = "spot"


# ─── Catálogo por símbolo ─────────────────────────────────────────
# Cada entrada rellena el formulario; nada de esto se impone. `initial_margin`
# de los futuros es el margen intradía/overnight TÍPICO publicado por el
# mercado: cambia con la volatilidad y lo ajusta cada bróker, así que sirve para
# proponer un apalancamiento efectivo, no para decirle al usuario cuánto le van
# a pedir mañana.

FUTURES_SPECS: Dict[str, Dict[str, Any]] = {
    # símbolo: nombre, tamaño de contrato (unidades del subyacente por contrato),
    #          tick mínimo, valor del tick en $, margen inicial típico
    "ES":  {"name": "E-mini S&P 500",       "category": "index",  "contract_size": 50,       "tick_size": 0.25,      "tick_value": 12.50,  "initial_margin": 13200},
    "MES": {"name": "Micro E-mini S&P 500", "category": "index",  "contract_size": 5,        "tick_size": 0.25,      "tick_value": 1.25,   "initial_margin": 1320},
    "NQ":  {"name": "E-mini Nasdaq 100",    "category": "index",  "contract_size": 20,       "tick_size": 0.25,      "tick_value": 5.00,   "initial_margin": 17600},
    "MNQ": {"name": "Micro E-mini Nasdaq",  "category": "index",  "contract_size": 2,        "tick_size": 0.25,      "tick_value": 0.50,   "initial_margin": 1760},
    "YM":  {"name": "E-mini Dow",           "category": "index",  "contract_size": 5,        "tick_size": 1,         "tick_value": 5.00,   "initial_margin": 10500},
    "MYM": {"name": "Micro E-mini Dow",     "category": "index",  "contract_size": 0.5,      "tick_size": 1,         "tick_value": 0.50,   "initial_margin": 1050},
    "RTY": {"name": "E-mini Russell 2000",  "category": "index",  "contract_size": 50,       "tick_size": 0.10,      "tick_value": 5.00,   "initial_margin": 7000},
    "M2K": {"name": "Micro Russell 2000",   "category": "index",  "contract_size": 5,        "tick_size": 0.10,      "tick_value": 0.50,   "initial_margin": 700},
    "CL":  {"name": "Crude Oil WTI",        "category": "energy", "contract_size": 1000,     "tick_size": 0.01,      "tick_value": 10.00,  "initial_margin": 6500},
    "MCL": {"name": "Micro Crude Oil",      "category": "energy", "contract_size": 100,      "tick_size": 0.01,      "tick_value": 1.00,   "initial_margin": 650},
    "NG":  {"name": "Natural Gas",          "category": "energy", "contract_size": 10000,    "tick_size": 0.001,     "tick_value": 10.00,  "initial_margin": 3300},
    "RB":  {"name": "RBOB Gasoline",        "category": "energy", "contract_size": 42000,    "tick_size": 0.0001,    "tick_value": 4.20,   "initial_margin": 7700},
    "GC":  {"name": "Gold",                 "category": "metals", "contract_size": 100,      "tick_size": 0.10,      "tick_value": 10.00,  "initial_margin": 10000},
    "MGC": {"name": "Micro Gold",           "category": "metals", "contract_size": 10,       "tick_size": 0.10,      "tick_value": 1.00,   "initial_margin": 1000},
    "SI":  {"name": "Silver",               "category": "metals", "contract_size": 5000,     "tick_size": 0.005,     "tick_value": 25.00,  "initial_margin": 15500},
    "SIL": {"name": "Micro Silver",         "category": "metals", "contract_size": 1000,     "tick_size": 0.005,     "tick_value": 5.00,   "initial_margin": 3100},
    "HG":  {"name": "Copper",               "category": "metals", "contract_size": 25000,    "tick_size": 0.0005,    "tick_value": 12.50,  "initial_margin": 6500},
    "PL":  {"name": "Platinum",             "category": "metals", "contract_size": 50,       "tick_size": 0.10,      "tick_value": 5.00,   "initial_margin": 4400},
    "6E":  {"name": "Euro FX",              "category": "fx",     "contract_size": 125000,   "tick_size": 0.00005,   "tick_value": 6.25,   "initial_margin": 2800},
    "6B":  {"name": "British Pound",        "category": "fx",     "contract_size": 62500,    "tick_size": 0.0001,    "tick_value": 6.25,   "initial_margin": 2700},
    "6J":  {"name": "Japanese Yen",         "category": "fx",     "contract_size": 12500000, "tick_size": 0.0000005, "tick_value": 6.25,   "initial_margin": 3000},
    "6A":  {"name": "Australian Dollar",    "category": "fx",     "contract_size": 100000,   "tick_size": 0.0001,    "tick_value": 10.00,  "initial_margin": 2200},
    "6C":  {"name": "Canadian Dollar",      "category": "fx",     "contract_size": 100000,   "tick_size": 0.00005,   "tick_value": 5.00,   "initial_margin": 1900},
    # Bonos: el tamaño de contrato (100 000 de nominal) y el valor del punto
    # (1 000 $) NO coinciden, porque cotizan en porcentaje del nominal. Se
    # guardan los dos: `contract_size` es lo que multiplica al precio.
    "ZB":  {"name": "30-Year T-Bond",       "category": "bonds",  "contract_size": 1000,     "tick_size": 0.03125,   "tick_value": 31.25,  "initial_margin": 5000},
    "ZN":  {"name": "10-Year T-Note",       "category": "bonds",  "contract_size": 1000,     "tick_size": 0.015625,  "tick_value": 15.625, "initial_margin": 2400},
    "ZF":  {"name": "5-Year T-Note",        "category": "bonds",  "contract_size": 1000,     "tick_size": 0.0078125, "tick_value": 7.8125, "initial_margin": 1800},
    "ZS":  {"name": "Soybeans",             "category": "grains", "contract_size": 50,       "tick_size": 0.25,      "tick_value": 12.50,  "initial_margin": 4000},
    "ZC":  {"name": "Corn",                 "category": "grains", "contract_size": 50,       "tick_size": 0.25,      "tick_value": 12.50,  "initial_margin": 2200},
    "ZW":  {"name": "Wheat",                "category": "grains", "contract_size": 50,       "tick_size": 0.25,      "tick_value": 12.50,  "initial_margin": 2900},
}

# Forex. `pip_size` es el escalón que el sector llama pip: 0,0001 en casi todo y
# 0,01 en los pares contra el yen. El tamaño de lote NO va aquí porque no es del
# par, es del tipo de lote (estándar / mini / micro / nano), que es lo que el
# usuario elige.
FOREX_PIP_JPY = 0.01
FOREX_PIP_DEFAULT = 0.0001

FOREX_PAIRS: List[str] = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "EURCHF", "EURAUD", "EURCAD", "AUDJPY",
    "CADJPY", "CHFJPY", "NZDJPY", "GBPAUD", "GBPCAD", "GBPCHF", "AUDCAD",
    "AUDCHF", "AUDNZD", "NZDCAD", "NZDCHF", "USDMXN", "USDZAR", "USDTRY",
    "USDSEK", "USDNOK", "USDPLN", "USDHUF", "USDSGD", "USDHKD", "USDCNH",
]

# Tipos de lote de forex. Es la respuesta a "micro, mini o lote": el tamaño de
# contrato de la operación sale de aquí, y por eso una misma cantidad ("1")
# significa 100 000 o 1 000 unidades según lo que el trader opere de verdad.
FOREX_LOT_TYPES: Dict[str, Dict[str, Any]] = {
    "standard": {"id": "standard", "label": "Lote estándar", "units": 100000.0},
    "mini":     {"id": "mini",     "label": "Mini lote",     "units": 10000.0},
    "micro":    {"id": "micro",    "label": "Micro lote",    "units": 1000.0},
    "nano":     {"id": "nano",     "label": "Nano lote",     "units": 100.0},
    "units":    {"id": "units",    "label": "Unidades",      "units": 1.0},
}

# CFD. El tamaño de contrato de un lote y el apalancamiento típico dependen del
# SUBYACENTE, y ahí es donde vive el "CFD del oro a 20×" del que se habla en la
# calle. Los topes son los del marco europeo (ESMA) para minoristas: 30× en
# divisas mayores, 20× en oro e índices principales, 10× en el resto de materias
# primas e índices secundarios, 5× en acciones, 2× en cripto. Fuera de la UE
# suelen ser más altos — de ahí que sea editable.
CFD_SPECS: Dict[str, Dict[str, Any]] = {
    "XAUUSD":  {"name": "Oro / USD",        "category": "metals",   "contract_size": 100,    "tick_size": 0.01,   "default_leverage": 20,  "max_leverage": 20},
    "XAGUSD":  {"name": "Plata / USD",      "category": "metals",   "contract_size": 5000,   "tick_size": 0.001,  "default_leverage": 10,  "max_leverage": 10},
    "XPTUSD":  {"name": "Platino / USD",    "category": "metals",   "contract_size": 100,    "tick_size": 0.01,   "default_leverage": 10,  "max_leverage": 10},
    "USOIL":   {"name": "Petróleo WTI",     "category": "energy",   "contract_size": 1000,   "tick_size": 0.01,   "default_leverage": 10,  "max_leverage": 10},
    "UKOIL":   {"name": "Petróleo Brent",   "category": "energy",   "contract_size": 1000,   "tick_size": 0.01,   "default_leverage": 10,  "max_leverage": 10},
    "NATGAS":  {"name": "Gas natural",      "category": "energy",   "contract_size": 10000,  "tick_size": 0.001,  "default_leverage": 10,  "max_leverage": 10},
    "US30":    {"name": "Dow Jones 30",     "category": "index",    "contract_size": 1,      "tick_size": 1,      "default_leverage": 20,  "max_leverage": 20},
    "US500":   {"name": "S&P 500",          "category": "index",    "contract_size": 1,      "tick_size": 0.1,    "default_leverage": 20,  "max_leverage": 20},
    "NAS100":  {"name": "Nasdaq 100",       "category": "index",    "contract_size": 1,      "tick_size": 0.25,   "default_leverage": 20,  "max_leverage": 20},
    "GER40":   {"name": "DAX 40",           "category": "index",    "contract_size": 1,      "tick_size": 0.5,    "default_leverage": 20,  "max_leverage": 20},
    "UK100":   {"name": "FTSE 100",         "category": "index",    "contract_size": 1,      "tick_size": 0.5,    "default_leverage": 20,  "max_leverage": 20},
    "FRA40":   {"name": "CAC 40",           "category": "index",    "contract_size": 1,      "tick_size": 0.5,    "default_leverage": 20,  "max_leverage": 20},
    "ESP35":   {"name": "IBEX 35",          "category": "index",    "contract_size": 1,      "tick_size": 1,      "default_leverage": 10,  "max_leverage": 10},
    "JPN225":  {"name": "Nikkei 225",       "category": "index",    "contract_size": 1,      "tick_size": 1,      "default_leverage": 10,  "max_leverage": 10},
    "HK50":    {"name": "Hang Seng",        "category": "index",    "contract_size": 1,      "tick_size": 1,      "default_leverage": 10,  "max_leverage": 10},
    "AUS200":  {"name": "ASX 200",          "category": "index",    "contract_size": 1,      "tick_size": 1,      "default_leverage": 10,  "max_leverage": 10},
}

# Categoría → apalancamiento por defecto para un CFD cuyo símbolo no está en el
# catálogo. Un CFD sobre una acción suelta no puede tener ficha propia (son
# miles), pero su tramo sí se conoce.
CFD_CATEGORY_LEVERAGE: Dict[str, float] = {
    "fx": 30.0, "index": 20.0, "metals": 20.0, "energy": 10.0,
    "commodity": 10.0, "stock": 5.0, "crypto": 2.0,
}

# Cripto perpetuo. El tamaño de contrato es 1 moneda en los perpetuos lineales
# (los que cotizan contra USDT), que son la inmensa mayoría de lo que opera un
# minorista. Los topes de apalancamiento son los del primer tramo de Binance
# Futures: bajan a medida que crece la posición, así que un 125× real sólo
# existe en tamaños pequeños.
CRYPTO_PERP_SPECS: Dict[str, Dict[str, Any]] = {
    "BTCUSDT": {"name": "Bitcoin perpetuo",  "contract_size": 1, "max_leverage": 125, "maintenance_margin_rate": 0.004},
    "ETHUSDT": {"name": "Ethereum perpetuo", "contract_size": 1, "max_leverage": 100, "maintenance_margin_rate": 0.005},
    "SOLUSDT": {"name": "Solana perpetuo",   "contract_size": 1, "max_leverage": 75,  "maintenance_margin_rate": 0.0065},
    "XRPUSDT": {"name": "XRP perpetuo",      "contract_size": 1, "max_leverage": 75,  "maintenance_margin_rate": 0.0065},
    "BNBUSDT": {"name": "BNB perpetuo",      "contract_size": 1, "max_leverage": 75,  "maintenance_margin_rate": 0.0065},
    "ADAUSDT": {"name": "Cardano perpetuo",  "contract_size": 1, "max_leverage": 75,  "maintenance_margin_rate": 0.0065},
    "DOGEUSDT": {"name": "Dogecoin perpetuo", "contract_size": 1, "max_leverage": 75, "maintenance_margin_rate": 0.0065},
    "AVAXUSDT": {"name": "Avalanche perpetuo", "contract_size": 1, "max_leverage": 50, "maintenance_margin_rate": 0.01},
    "LINKUSDT": {"name": "Chainlink perpetuo", "contract_size": 1, "max_leverage": 50, "maintenance_margin_rate": 0.01},
    "MATICUSDT": {"name": "Polygon perpetuo", "contract_size": 1, "max_leverage": 50, "maintenance_margin_rate": 0.01},
}


def _forex_pip_size(symbol: str) -> float:
    """El escalón que el sector llama pip para este par."""
    sym = (symbol or "").upper().replace("/", "")
    # El yen cotiza con dos decimales: su pip es 0,01, no 0,0001. Confundirlos
    # multiplica o divide por cien el riesgo declarado en pips.
    return FOREX_PIP_JPY if "JPY" in sym else FOREX_PIP_DEFAULT


def _norm(symbol: Optional[str]) -> str:
    return (symbol or "").upper().replace("/", "").replace("-", "").strip()


def resolve_spec(product: Optional[str], symbol: Optional[str] = None) -> Dict[str, Any]:
    """Qué se sabe de este producto y este símbolo. Nunca inventa un número.

    Devuelve siempre las mismas claves para que la UI no tenga que ramificar:
    `known` dice si el símbolo estaba en el catálogo, y los campos que no se
    conocen valen `None` — que es distinto de valer 1.
    """
    pid = product if product in PRODUCTS else DEFAULT_PRODUCT
    meta = PRODUCTS[pid]
    sym = _norm(symbol)

    spec: Dict[str, Any] = {
        "product": pid,
        "symbol": sym or None,
        "known": False,
        "name": None,
        "category": None,
        "sizing": meta["sizing"],
        "contract_size": meta["default_contract_size"],
        "tick_size": None,
        "tick_value": None,
        "pip_size": None,
        "initial_margin": None,
        "default_leverage": meta["default_leverage"],
        "max_leverage": meta["typical_max_leverage"],
        "maintenance_margin_rate": None,
        "carry": meta["carry"],
        "quote_units": list(meta["quote_units"]),
        "uses_leverage": meta["uses_leverage"],
        "defined_risk": meta["defined_risk"],
    }

    if pid == "futures" and sym in FUTURES_SPECS:
        f = FUTURES_SPECS[sym]
        spec.update({
            "known": True, "name": f["name"], "category": f["category"],
            "contract_size": float(f["contract_size"]),
            "tick_size": float(f["tick_size"]),
            "tick_value": float(f["tick_value"]),
            "initial_margin": float(f["initial_margin"]),
        })
    elif pid == "forex":
        pip = _forex_pip_size(sym)
        spec.update({
            "known": sym in FOREX_PAIRS,
            "name": f"{sym[:3]}/{sym[3:]}" if len(sym) == 6 else None,
            "category": "fx",
            "pip_size": pip,
            "tick_size": pip,
        })
    elif pid == "cfd" and sym in CFD_SPECS:
        c = CFD_SPECS[sym]
        spec.update({
            "known": True, "name": c["name"], "category": c["category"],
            "contract_size": float(c["contract_size"]),
            "tick_size": float(c["tick_size"]),
            "default_leverage": float(c["default_leverage"]),
            "max_leverage": float(c["max_leverage"]),
        })
    elif pid == "crypto_perp" and sym in CRYPTO_PERP_SPECS:
        c = CRYPTO_PERP_SPECS[sym]
        spec.update({
            "known": True, "name": c["name"], "category": "crypto",
            "contract_size": float(c["contract_size"]),
            "max_leverage": float(c["max_leverage"]),
            "maintenance_margin_rate": float(c["maintenance_margin_rate"]),
        })

    return spec


def contract_size_for(product: Optional[str], symbol: Optional[str] = None,
                      *, override: Any = None, lot_type: Optional[str] = None) -> Optional[float]:
    """El tamaño de contrato a usar: el del usuario si lo dio, si no el del catálogo.

    En forex sale del TIPO DE LOTE, que es la respuesta directa a "micro, mini o
    lote": el mismo "1" son 100 000 unidades o 1 000 según lo que se opere de
    verdad, y es la diferencia entre arriesgar 100 $ y arriesgar 1 $.

    `None` cuando no se sabe — el caso real es un futuro que no está en el
    catálogo: ahí no hay default sensato, y usar 1 haría que el P&L de un
    contrato de crudo saliera mil veces más pequeño de lo que fue.
    """
    if override not in (None, ""):
        try:
            value = float(override)
            if value > 0:
                return value
        except (TypeError, ValueError):
            pass
    if product == "forex" and lot_type in FOREX_LOT_TYPES:
        return float(FOREX_LOT_TYPES[lot_type]["units"])
    return resolve_spec(product, symbol)["contract_size"]


# ─── Unidades: el trader escribe en lo suyo, se guarda un precio ──

# `price`       → el valor ES un nivel de precio (comportamiento de siempre)
# `pips`        → distancia en pips (forex)
# `ticks`       → distancia en ticks (futuros)
# `points`      → distancia en puntos enteros de precio (índices, CFD)
# `pct`         → % de movimiento DEL PRECIO
# `money`       → importe en divisa de la cuenta que se quiere arriesgar/ganar
# `pct_balance` → % del saldo de la cuenta
# `r`           → múltiplos del riesgo (sólo tiene sentido para el objetivo)
UNITS = ("price", "pips", "ticks", "points", "pct", "money", "pct_balance", "r")

# Unidades cuyo valor es una DISTANCIA y no un nivel: al convertir hay que
# sumarlas o restarlas a la entrada según el lado.
DISTANCE_UNITS = tuple(u for u in UNITS if u != "price")


def unit_to_distance(
    value: Any,
    unit: str,
    *,
    entry: float,
    quantity: float,
    contract_size: Optional[float],
    spec: Optional[Dict[str, Any]] = None,
    balance: Optional[float] = None,
    risk_distance: Optional[float] = None,
) -> Optional[float]:
    """Convierte lo que escribió el usuario en una distancia de precio positiva.

    `None` cuando la conversión no se puede hacer con lo que hay: pedir el stop
    en dinero sin saber el tamaño de la posición, o el objetivo en R sin stop.
    Devolver 0 ahí colocaría el stop encima de la entrada, que es una operación
    distinta de la que el usuario quiso describir.
    """
    try:
        v = abs(float(value))
    except (TypeError, ValueError):
        return None
    if v == 0 or unit not in UNITS:
        return None

    size = (float(quantity or 0) * float(contract_size or 0)) or 0.0

    if unit == "points":
        return v
    if unit == "pct":
        return abs(entry) * v / 100 if entry else None
    if unit == "pips":
        pip = (spec or {}).get("pip_size") or _forex_pip_size((spec or {}).get("symbol") or "")
        return v * pip if pip else None
    if unit == "ticks":
        tick = (spec or {}).get("tick_size")
        return v * float(tick) if tick else None
    if unit == "money":
        return v / size if size > 0 else None
    if unit == "pct_balance":
        if not balance or size <= 0:
            return None
        return (float(balance) * v / 100) / size
    if unit == "r":
        return v * risk_distance if risk_distance else None
    return None


def distance_to_unit(
    distance: Optional[float],
    unit: str,
    *,
    entry: float,
    quantity: float,
    contract_size: Optional[float],
    spec: Optional[Dict[str, Any]] = None,
    balance: Optional[float] = None,
    risk_distance: Optional[float] = None,
) -> Optional[float]:
    """La inversa de `unit_to_distance`, para volver a pintar lo que se guardó."""
    if distance in (None, ""):
        return None
    try:
        d = abs(float(distance))
    except (TypeError, ValueError):
        return None
    size = (float(quantity or 0) * float(contract_size or 0)) or 0.0

    if unit == "points":
        return d
    if unit == "pct":
        return d / abs(entry) * 100 if entry else None
    if unit == "pips":
        pip = (spec or {}).get("pip_size") or _forex_pip_size((spec or {}).get("symbol") or "")
        return d / pip if pip else None
    if unit == "ticks":
        tick = (spec or {}).get("tick_size")
        return d / float(tick) if tick else None
    if unit == "money":
        return d * size if size > 0 else None
    if unit == "pct_balance":
        if not balance or size <= 0:
            return None
        return (d * size) / float(balance) * 100
    if unit == "r":
        return d / risk_distance if risk_distance else None
    return None


def level_from_distance(entry: float, distance: float, side: str, kind: str) -> float:
    """El nivel de precio de un stop o un objetivo, dada la distancia y el lado.

    En largo el stop va debajo y el objetivo arriba; en corto, al revés. Es la
    única regla de la que dependen todas las unidades, y por eso vive en un solo
    sitio.
    """
    long_side = (side or "long") == "long"
    below = (kind == "sl") == long_side     # SL de largo y TP de corto van abajo
    return entry - distance if below else entry + distance


def resolve_levels(trade: Dict[str, Any], spec: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Rellena `sl` y `tp` (niveles de precio) a partir de la unidad elegida.

    **El nivel de precio es lo único canónico.** La unidad y el número que el
    usuario tecleó se conservan (`sl_input`/`sl_unit`) sólo para poder volver a
    pintar el formulario tal y como lo dejó; ninguna métrica los mira. Así el
    resto de la analítica —R, drawdown, distribución, MAE/MFE— sigue leyendo
    exactamente los mismos campos que leía antes de que existieran las unidades.

    Devuelve un dict con las claves a fusionar; no muta la operación.
    """
    out: Dict[str, Any] = {}
    entry = _f(trade.get("entry_price"))
    if not entry:
        return out
    side = trade.get("side") or "long"
    product = trade.get("instrument_type") or DEFAULT_PRODUCT
    spec = spec or resolve_spec(product, trade.get("symbol"))
    qty = _f(trade.get("quantity")) or 0.0
    csize = contract_size_for(product, trade.get("symbol"),
                              override=trade.get("multiplier"),
                              lot_type=trade.get("lot_type"))
    balance = _f(trade.get("account_balance"))

    # El stop primero: el objetivo en R lo necesita ya resuelto.
    risk_distance: Optional[float] = None
    sl_unit = trade.get("sl_unit") or "price"
    if sl_unit != "price" and trade.get("sl_input") not in (None, ""):
        d = unit_to_distance(trade["sl_input"], sl_unit, entry=entry, quantity=qty,
                             contract_size=csize, spec=spec, balance=balance)
        if d:
            out["sl"] = round(level_from_distance(entry, d, side, "sl"), 10)
            risk_distance = d
    elif trade.get("sl") not in (None, ""):
        risk_distance = abs(entry - _f(trade["sl"]))

    tp_unit = trade.get("tp_unit") or "price"
    if tp_unit != "price" and trade.get("tp_input") not in (None, ""):
        d = unit_to_distance(trade["tp_input"], tp_unit, entry=entry, quantity=qty,
                             contract_size=csize, spec=spec, balance=balance,
                             risk_distance=risk_distance)
        if d:
            out["tp"] = round(level_from_distance(entry, d, side, "tp"), 10)
    return out


# ─── Matemática de la posición ────────────────────────────────────

def _f(value: Any) -> Optional[float]:
    """float o None. Nunca 0 por error de tipo — eso es un dato inventado."""
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def liquidation_price(
    entry: float, side: str, leverage: Optional[float],
    maintenance_margin_rate: float = DEFAULT_MAINTENANCE_MARGIN_RATE,
) -> Optional[float]:
    """Precio de liquidación ESTIMADO, en margen aislado.

    `entry × (1 − 1/apalancamiento + mantenimiento)` en largo, simétrico en
    corto. Es la fórmula del margen aislado sin añadir garantía: el precio al
    que el margen aportado se ha consumido salvo la tasa de mantenimiento.

    Lo que esta cifra NO sabe: comisiones, funding acumulado, margen cruzado
    (donde responde toda la cuenta y no sólo esta posición), tramos de
    mantenimiento por tamaño, y cualquier aporte posterior. Por eso se publica
    siempre etiquetada como estimación con sus supuestos al lado — un precio de
    liquidación exacto sólo lo sabe el bróker.

    `None` sin apalancamiento (1× no se liquida: la posición está pagada).
    """
    lev = _f(leverage)
    if not entry or not lev or lev <= 1:
        return None
    move = 1.0 / lev - maintenance_margin_rate
    if move <= 0:                      # mantenimiento ≥ margen: ya liquidada
        return None
    price = entry * (1 - move) if (side or "long") == "long" else entry * (1 + move)
    return round(price, 8) if price > 0 else None


def position_metrics(
    trade: Dict[str, Any],
    *,
    spec: Optional[Dict[str, Any]] = None,
    max_exposure_multiple: float = DEFAULT_MAX_EXPOSURE_MULTIPLE,
) -> Dict[str, Any]:
    """Todo lo que describe el TAMAÑO de una posición, no su resultado.

    Nocional (el monto total que se mueve), margen inmovilizado, apalancamiento
    efectivo, exposición contra el saldo, riesgo y recompensa en dinero, R:B, y
    liquidación estimada. Cada cifra es `None` si le falta un dato: es la
    diferencia entre "esta posición no arriesga nada" y "no me has dicho dónde
    está el stop".

    El riesgo se publica en TRES denominadores porque responden a preguntas
    distintas y confundirlas es el error clásico del apalancamiento:
      · `risk_pct_notional` — cuánto se mueve el mercado en tu contra (el monto
        total). Es lo que compara un CFD de oro con una acción.
      · `risk_pct_balance`  — cuánto de tu cuenta te juegas. Es la regla del 1 %.
      · `risk_pct_margin`   — cuánto del margen aportado te juegas. En 100× un
        0,5 % de riesgo sobre la cuenta puede ser el 50 % del margen.
    """
    entry = _f(trade.get("entry_price"))
    qty = _f(trade.get("quantity")) or 0.0
    side = trade.get("side") or "long"
    product = trade.get("instrument_type") or DEFAULT_PRODUCT
    spec = spec or resolve_spec(product, trade.get("symbol"))
    csize = contract_size_for(product, trade.get("symbol"),
                              override=trade.get("multiplier"),
                              lot_type=trade.get("lot_type"))
    balance = _f(trade.get("account_balance"))
    leverage = _f(trade.get("leverage"))
    if leverage is not None and leverage <= 0:
        leverage = None

    out: Dict[str, Any] = {
        "product": product,
        "contract_size": csize,
        "leverage": leverage,
        "notional": None,
        "position_units": None,
        "margin_used": None,
        "exposure_multiple": None,
        "exposure_exceeded": None,
        "max_exposure_multiple": max_exposure_multiple,
        "risk_amount": None,
        "reward_amount": None,
        "rr": None,
        "rr_below_floor": None,
        "risk_pct_notional": None,
        "risk_pct_balance": None,
        "risk_pct_margin": None,
        "max_loss": None,
        "max_loss_source": None,
        "liquidation_price": None,
        "liquidation_distance_pct": None,
        "liquidation_before_stop": None,
    }
    if entry is None or csize is None or qty <= 0:
        return out

    units = qty * csize
    notional = abs(entry) * units
    out["position_units"] = round(units, 8)
    out["notional"] = round(notional, 2)

    # Margen: sólo donde el producto tiene esa palanca. En cripto al contado o
    # en una opción comprada no hay margen que calcular — pagas lo que vale.
    uses_lev = spec.get("uses_leverage", True)
    if uses_lev and leverage:
        out["margin_used"] = round(notional / leverage, 2)
    elif not uses_lev:
        out["margin_used"] = round(notional, 2)

    # Exposición: el nocional contra el saldo. Es el número que de verdad
    # controla el tamaño, y el que compara peras con peras entre productos.
    if balance and balance > 0:
        exposure = notional / balance
        out["exposure_multiple"] = round(exposure, 2)
        out["exposure_exceeded"] = exposure > max_exposure_multiple

    # Riesgo y recompensa, medidos sobre la posición abierta.
    sl, tp = _f(trade.get("sl")), _f(trade.get("tp"))
    risk_amount: Optional[float] = None
    if sl is not None:
        risk_amount = abs(entry - sl) * units
        out["risk_amount"] = round(risk_amount, 2)
    if tp is not None:
        out["reward_amount"] = round(abs(tp - entry) * units, 2)
    if risk_amount and out["reward_amount"] is not None:
        rr = out["reward_amount"] / risk_amount
        out["rr"] = round(rr, 2)
        out["rr_below_floor"] = rr < MIN_RR_FLOOR

    # Pérdida máxima. En riesgo definido (opciones, spreads) la declara la
    # estructura y NO se deduce de un stop de precio que no existe; ahí está la
    # clave para que una operación de opciones tenga R como cualquier otra.
    declared_max_loss = _f(trade.get("max_loss"))
    if declared_max_loss is not None and declared_max_loss > 0:
        out["max_loss"] = round(declared_max_loss, 2)
        out["max_loss_source"] = "declared"
    elif risk_amount is not None:
        out["max_loss"] = round(risk_amount, 2)
        out["max_loss_source"] = "stop"
    elif spec.get("defined_risk") and side == "long":
        # Una opción COMPRADA no puede perder más que la prima pagada. Es un
        # hecho de la estructura, no una estimación.
        out["max_loss"] = round(notional, 2)
        out["max_loss_source"] = "premium"

    if risk_amount is not None:
        if notional > 0:
            out["risk_pct_notional"] = round(risk_amount / notional * 100, 2)
        if balance and balance > 0:
            out["risk_pct_balance"] = round(risk_amount / balance * 100, 2)
        if out["margin_used"]:
            out["risk_pct_margin"] = round(risk_amount / out["margin_used"] * 100, 2)

    # Liquidación estimada.
    if uses_lev and leverage and leverage > 1:
        mmr = _f(trade.get("maintenance_margin_rate"))
        if mmr is None:
            mmr = spec.get("maintenance_margin_rate") or DEFAULT_MAINTENANCE_MARGIN_RATE
        liq = liquidation_price(entry, side, leverage, mmr)
        if liq is not None:
            out["liquidation_price"] = liq
            out["liquidation_distance_pct"] = round(abs(liq - entry) / entry * 100, 2)
            if sl is not None:
                # El stop detrás de la liquidación es un stop que nunca se
                # ejecuta: el bróker cierra antes. Merece decirse en voz alta.
                out["liquidation_before_stop"] = (
                    liq > sl if side == "long" else liq < sl
                )
    return out


# ─── Coste de mantener la posición abierta ────────────────────────

def funding_periods(entry_date: Any, exit_date: Any,
                    interval_hours: float = DEFAULT_FUNDING_INTERVAL_HOURS) -> Optional[int]:
    """Cuántos pagos de funding cubre la operación. `None` sin las dos fechas."""
    start, end = _parse_dt(entry_date), _parse_dt(exit_date)
    if not start or not end or end <= start:
        return None
    hours = (end - start).total_seconds() / 3600
    return int(hours // max(interval_hours, 0.0001))


def funding_cost(notional: Optional[float], rate_pct: Any,
                 periods: Optional[int]) -> Optional[float]:
    """Coste de funding de un perpetuo: nocional × tasa × nº de pagos.

    `rate_pct` es la tasa POR PERIODO en % (0,01 = 0,01 %, la típica de 8 h).
    Positiva = la pagas tú (largo en mercado alcista); negativa = la cobras.
    Un perpetuo mantenido un mes a 0,01 % cada 8 h son ~0,9 % del nocional: con
    apalancamiento 20× eso es el 18 % del margen, y es la razón número uno de
    que una posición "en break-even" acabe en pérdidas.
    """
    rate = _f(rate_pct)
    if notional is None or rate is None or periods is None:
        return None
    return round(notional * rate / 100 * periods, 2)


def swap_cost(notional: Optional[float], annual_rate_pct: Any,
              nights: Optional[int]) -> Optional[float]:
    """Comisión nocturna (swap) de un CFD o de forex: interés anual prorrateado.

    `annual_rate_pct` positiva = coste. El año se divide entre 365 porque es la
    convención de los brókers minoristas para el cargo diario; el miércoles suele
    cobrarse triple (fin de semana), y eso lo declara el usuario en el número de
    noches, que es un dato suyo y no una regla que podamos suponer.
    """
    rate = _f(annual_rate_pct)
    if notional is None or rate is None or nights is None:
        return None
    return round(notional * rate / 100 * nights / 365, 2)


def nights_between(entry_date: Any, exit_date: Any) -> Optional[int]:
    """Noches que la posición pasó abierta. `None` sin las dos fechas."""
    start, end = _parse_dt(entry_date), _parse_dt(exit_date)
    if not start or not end or end <= start:
        return None
    return max(0, (end.date() - start.date()).days)


def carry_cost(trade: Dict[str, Any], notional: Optional[float],
               spec: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """El coste de mantener la posición abierta, según cómo lo cobre el producto.

    Prioridad al importe que el usuario declare (`funding_fees` / `swap_fees`):
    es lo que le cobraron de verdad, y ninguna estimación nuestra puede mejorar
    un extracto. Sólo si no lo declara y sí da la tasa, se estima — y la
    respuesta dice cuál de las dos cosas es (`source`).
    """
    product = trade.get("instrument_type") or DEFAULT_PRODUCT
    spec = spec or resolve_spec(product, trade.get("symbol"))
    model = spec.get("carry")
    out: Dict[str, Any] = {"carry_model": model, "funding_fees": None,
                           "swap_fees": None, "carry_total": None,
                           "carry_source": None}

    declared_funding = _f(trade.get("funding_fees"))
    declared_swap = _f(trade.get("swap_fees"))

    if declared_funding is not None:
        out["funding_fees"] = round(declared_funding, 2)
        out["carry_source"] = "declared"
    elif model == "funding":
        periods = _f(trade.get("funding_periods"))
        periods = int(periods) if periods is not None else funding_periods(
            trade.get("entry_date"), trade.get("exit_date"),
            _f(trade.get("funding_interval_hours")) or DEFAULT_FUNDING_INTERVAL_HOURS,
        )
        estimated = funding_cost(notional, trade.get("funding_rate_pct"), periods)
        if estimated is not None:
            out["funding_fees"] = estimated
            out["carry_source"] = "estimated"

    if declared_swap is not None:
        out["swap_fees"] = round(declared_swap, 2)
        out["carry_source"] = "declared" if out["carry_source"] in (None, "declared") else "mixed"
    elif model == "swap":
        nights = _f(trade.get("nights_held"))
        nights = int(nights) if nights is not None else nights_between(
            trade.get("entry_date"), trade.get("exit_date"))
        estimated = swap_cost(notional, trade.get("swap_rate_pct"), nights)
        if estimated is not None:
            out["swap_fees"] = estimated
            out["carry_source"] = "estimated" if out["carry_source"] is None else "mixed"

    parts = [v for v in (out["funding_fees"], out["swap_fees"]) if v is not None]
    out["carry_total"] = round(sum(parts), 2) if parts else None
    return out


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ─── Catálogo publicable ──────────────────────────────────────────

def catalog() -> Dict[str, Any]:
    """El catálogo entero, en la forma en que lo consume el frontend.

    Es la fuente ÚNICA: `scripts/gen-instruments-js.py` escribe con esto el
    espejo de JavaScript, de modo que el formulario y el backend no puedan
    discrepar sobre cuánto vale un contrato. Si algún día divergen, el
    verificador de paridad falla antes que el usuario se entere.
    """
    return {
        "products": PRODUCTS,
        "futures": FUTURES_SPECS,
        "forexPairs": FOREX_PAIRS,
        "forexLotTypes": FOREX_LOT_TYPES,
        "forexPip": {"jpy": FOREX_PIP_JPY, "default": FOREX_PIP_DEFAULT},
        "cfd": CFD_SPECS,
        "cfdCategoryLeverage": CFD_CATEGORY_LEVERAGE,
        "cryptoPerp": CRYPTO_PERP_SPECS,
        "units": list(UNITS),
        "constants": {
            "maxExposureMultiple": DEFAULT_MAX_EXPOSURE_MULTIPLE,
            "minRRFloor": MIN_RR_FLOOR,
            "maintenanceMarginRate": DEFAULT_MAINTENANCE_MARGIN_RATE,
            "fundingIntervalHours": DEFAULT_FUNDING_INTERVAL_HOURS,
        },
    }
