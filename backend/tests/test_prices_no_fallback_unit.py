"""`GET /api/prices` no inventa materias primas cuando el proveedor se cae.

Había un respaldo fijo —oro a 2 680 $, plata a 31,50 $ y una variación diaria
de +0,5 % / +0,8 %— que salía con HTTP 200 y sin marca de ningún tipo. Con
yfinance caído el ticker enseñaba XAU a un precio de hace meses con flecha
verde, indistinguible de uno real, y la variación era directamente una
observación fabricada.

El criterio del proyecto ya estaba escrito veinte líneas más arriba en el mismo
endpoint, para las monedas: lo que no se ha podido leer se OMITE. Esto lo fija
también para las materias primas.
"""
import re
from pathlib import Path

SERVER = Path(__file__).resolve().parents[1] / "server.py"


def _prices_endpoint_source() -> str:
    """El cuerpo de `get_prices`, de su decorador al siguiente decorador."""
    src = SERVER.read_text(encoding="utf-8")
    start = src.index('@api_router.get("/prices")')
    end = src.index("@api_router", start + 10)
    return src[start:end]


class TestPricesNeverInventsACommodity:
    def test_the_old_hardcoded_gold_and_silver_are_gone(self):
        body = _prices_endpoint_source()
        # Los números exactos del respaldo retirado. Se buscan como literales
        # porque es así como volverían: alguien "arreglando" un hueco en la UI.
        for numero in ("2680", "31.50", "2450", "28.80"):
            assert numero not in body, (
                f"vuelve a haber un precio fijo ({numero}) en /prices: un precio "
                "inventado es indistinguible en pantalla de uno real")

    def test_no_setdefault_refills_a_missing_commodity(self):
        body = _prices_endpoint_source()
        assert not re.search(r'data\.setdefault\(\s*["\'](gold|silver|oil)', body), (
            "un `setdefault` sobre una materia prima la rellena cuando falta, "
            "que es exactamente lo que no debe pasar")

    def test_an_unreadable_commodity_is_skipped_like_an_unreadable_coin(self):
        """La rama de cripto y la de materias primas siguen el mismo criterio."""
        body = _prices_endpoint_source()
        # La moneda ilegible salta con `continue` dentro de su bucle.
        assert "continue" in body
        # Y la materia prima ilegible sólo registra el fallo: no rellena nada.
        assert "Commodity" in body and "logging.warning" in body

    def test_a_fabricated_daily_change_is_not_reintroduced(self):
        """La variación de 24 h es una observación, no una salida de modelo."""
        body = _prices_endpoint_source()
        assert not re.search(r'"usd_24h_change":\s*0\.[0-9]', body), (
            "hay una variación diaria escrita a mano en /prices")
