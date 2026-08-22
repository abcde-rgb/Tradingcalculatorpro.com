"""Tipos de cambio del Banco Central Europeo.

Sustituye a ExchangeRate-API y a Yahoo para el forex. El motivo es de licencia:
el BCE publica sus tipos de referencia **para que se reutilicen**, sin contrato
ni cuota y sin importar que quien los muestre cobre por su servicio. Yahoo no
tiene licencia y ExchangeRate-API exige una atribución que la web no daba.

Qué cambia respecto a lo anterior, y hay que saberlo:

  * El BCE publica **una vez por día hábil**, sobre las 16:00 CET. Estos tipos
    no se mueven intradía. Para dimensionar una posición o convertir divisa
    sobran; para un gráfico de 5 minutos de EURUSD, no.
  * A cambio, la variación diaria pasa a ser REAL. La ruta anterior mandaba
    `change: 0.0` en todos los pares siempre — un cero que no era un cero, sino
    un "no lo sé" disfrazado.

El BCE cotiza todo contra el euro (1 EUR = N divisas), así que cualquier par se
arma cruzando por el euro. Lo que el BCE no publica NO se sustituye por un
primo cercano: se omite. Un USD/CNH servido con el yuan onshore se lee en
pantalla igual que el bueno.
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Tuple
from log_seguro import log_safe

logger = logging.getLogger(__name__)

# 90 días de historia en una sola petición: da el tipo de hoy Y el de ayer, que
# es lo que hace falta para la variación. El feed `-daily` sólo trae hoy.
ECB_HIST_90D = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml"

FETCH_TIMEOUT_SECONDS: int = 8

# Banda de cordura por par: un tipo fuera de esto es un error de parseo o de
# unidades, no un movimiento de mercado.
MIN_PLAUSIBLE_RATE: float = 1e-9
MAX_PLAUSIBLE_RATE: float = 1e9


def _local(tag: str) -> str:
    """Etiqueta sin su namespace. El feed del BCE usa gesmes + eurofxref."""
    return tag.rsplit("}", 1)[-1]


def parse_ecb_history(xml_text: str) -> List[Tuple[str, Dict[str, float]]]:
    """`[(fecha, {DIVISA: tipo_por_euro}), ...]` de más reciente a más antigua.

    Separado del fetch para poder probarlo contra una muestra sin salir a la
    red. Devuelve lista vacía si el feed no es utilizable — nunca lanza.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.info("El feed del BCE no es XML parseable: %s", log_safe(exc))
        return []

    dias: List[Tuple[str, Dict[str, float]]] = []
    for cube in root.iter():
        if _local(cube.tag) != "Cube" or "time" not in cube.attrib:
            continue
        fecha = cube.attrib["time"]
        tipos: Dict[str, float] = {"EUR": 1.0}   # el euro es la base, por definición
        for hijo in cube:
            divisa, tipo = hijo.attrib.get("currency"), hijo.attrib.get("rate")
            if not divisa or not tipo:
                continue
            try:
                valor = float(tipo)
            except ValueError:
                continue
            if MIN_PLAUSIBLE_RATE <= valor <= MAX_PLAUSIBLE_RATE:
                tipos[divisa] = valor
        if len(tipos) > 1:
            dias.append((fecha, tipos))

    # Las fechas ISO ordenan lexicográficamente; no hace falta parsearlas.
    dias.sort(key=lambda d: d[0], reverse=True)
    return dias


def cross_rate(par: str, tipos: Dict[str, float]) -> Optional[float]:
    """Precio de `par` (p. ej. "GBPJPY") cruzando por el euro.

    El BCE da 1 EUR = N divisas, así que ABC/XYZ = tipo_XYZ / tipo_ABC.
    `None` si el BCE no publica alguna de las dos patas: preferimos que falte
    un par a servirlo con una divisa parecida.
    """
    if len(par) != 6:
        return None
    base, cotizada = par[:3].upper(), par[3:].upper()
    r_base, r_cotizada = tipos.get(base), tipos.get(cotizada)
    if not r_base or not r_cotizada:
        return None
    return r_cotizada / r_base


def build_pairs(pares: List[str], dias: List[Tuple[str, Dict[str, float]]]) -> Dict[str, Any]:
    """Precio y variación diaria de cada par que el BCE pueda sostener.

    La variación es `None` cuando sólo hay un día de historia: es un dato que
    no se puede calcular, y un 0,0 ahí se lee como "el par no se ha movido".
    """
    if not dias:
        return {}

    fecha_hoy, tipos_hoy = dias[0]
    tipos_ayer = dias[1][1] if len(dias) > 1 else None

    salida: Dict[str, Any] = {}
    for par in pares:
        precio = cross_rate(par, tipos_hoy)
        if precio is None:
            continue
        cambio = None
        if tipos_ayer is not None:
            previo = cross_rate(par, tipos_ayer)
            if previo:
                cambio = round((precio - previo) / previo * 100, 4)
        salida[par] = {
            "price": round(precio, 5),
            "change": cambio,
            "source": "ecb",
            "as_of": fecha_hoy,
        }
    return salida


async def fetch_rates(pares: List[str]) -> Dict[str, Any]:
    """Tipos del BCE para `pares`. Diccionario vacío si el feed no responde."""
    try:
        import httpx  # import local: mantiene el módulo importable sin red

        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            r = await client.get(ECB_HIST_90D)
        if r.status_code != 200:
            logger.warning("El feed del BCE respondió %s", log_safe(r.status_code))
            return {}
        return build_pairs(pares, parse_ecb_history(r.text))
    except Exception as exc:  # noqa: BLE001 — el forex nunca debe tumbar la petición
        logger.warning("Fallo al leer los tipos del BCE: %s", log_safe(exc))
        return {}
