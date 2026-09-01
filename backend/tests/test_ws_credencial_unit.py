"""
De dónde saca el WebSocket de alertas su credencial, y qué comprueba en cada vía.

## Por qué existe

`useWebSocketAlerts` abría `wss://…/api/ws/alerts?token=<JWT>`. Un JWT en la
cadena de consulta acaba escrito tal cual en los registros de acceso —Cloud Run
guarda la URL completa— y ahí sobrevive a la sesión que lo emitió, durante
mucho más que la hora que dura el token. La cookie `access_token` viaja en una
cabecera que no se registra, así que es la vía preferida.

Pero cambiar a cookie tiene una trampa que hay que cerrar A LA VEZ o se abre un
agujero peor del que se cierra: **el apretón de manos de un WebSocket no pasa
por CORS**. Cualquier página puede hacer `new WebSocket('wss://api…/ws/alerts')`
y el navegador adjuntará las cookies de quien la visite. Con el token en la URL
eso daba igual —una página ajena no puede leerlo— pero con la cookie sería un
secuestro de sesión en toda regla (Cross-Site WebSocket Hijacking). La defensa
es comprobar `Origin`, y sólo sirve si se comprueba SIEMPRE que se acepta la
cookie.

## Por qué unitario y no en el banco E2E

El banco corre sobre `http://localhost` y la cookie es `secure`: el navegador
no la guarda, así que allí sólo se ejercita el respaldo por URL. La vía de la
cookie —y su comprobación de origen— sólo se puede probar aquí.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("JWT_SECRET", "test-only")
os.environ.setdefault("ENVIRONMENT", "development")

import realtime_alerts  # noqa: E402


class WSFalso:
    """Lo mínimo que `_credencial` mira de un WebSocket: cookies y cabeceras."""

    def __init__(self, cookies=None, headers=None):
        self.cookies = cookies or {}
        # Starlette normaliza las cabeceras a minúsculas; se imita.
        self.headers = {k.lower(): v for k, v in (headers or {}).items()}


PERMITIDOS = ["https://abcde-rgb.github.io", "https://tradingcalculatorpro.com"]


@pytest.fixture(autouse=True)
def origenes():
    """Cada test parte de la misma lista, y la deja como estaba."""
    previo = realtime_alerts._origenes_permitidos
    realtime_alerts._origenes_permitidos = list(PERMITIDOS)
    yield
    realtime_alerts._origenes_permitidos = previo


# ── La vía preferida: cookie con origen bueno ────────────────────────────────

def test_la_cookie_con_origen_permitido_vale():
    ws = WSFalso({"access_token": "jwt-de-la-cookie"},
                 {"Origin": "https://tradingcalculatorpro.com"})
    assert realtime_alerts._credencial(ws, "") == ("jwt-de-la-cookie", "cookie")


def test_la_cookie_gana_al_parametro_de_la_url():
    """Si llegan las dos, se usa la cookie: es la que no acaba en los registros."""
    ws = WSFalso({"access_token": "de-la-cookie"},
                 {"Origin": "https://abcde-rgb.github.io"})
    assert realtime_alerts._credencial(ws, "de-la-url") == ("de-la-cookie", "cookie")


# ── La defensa contra el secuestro entre sitios ──────────────────────────────

def test_un_origen_ajeno_NO_puede_usar_la_cookie():
    """El caso que hace falta cerrar: página del atacante, cookie de la víctima."""
    ws = WSFalso({"access_token": "jwt-de-la-victima"},
                 {"Origin": "https://sitio-del-atacante.example"})
    assert realtime_alerts._credencial(ws, "") == ("", "")


def test_sin_cabecera_Origin_tampoco_se_acepta_la_cookie():
    """Un cliente que no declara origen no puede reclamar la sesión de nadie."""
    ws = WSFalso({"access_token": "jwt-de-la-victima"}, {})
    assert realtime_alerts._credencial(ws, "") == ("", "")


def test_un_origen_ajeno_NO_cae_al_respaldo_de_la_url():
    """No basta con ignorar la cookie: caer al `?token=` con un origen ajeno
    volvería a aceptar la conexión si el atacante consiguiera un token por otra
    vía. Rechazada del todo."""
    ws = WSFalso({"access_token": "jwt-de-la-victima"},
                 {"Origin": "https://sitio-del-atacante.example"})
    assert realtime_alerts._credencial(ws, "token-en-la-url") == ("", "")


# ── El respaldo, y por qué sigue existiendo ──────────────────────────────────

def test_sin_cookie_se_usa_el_parametro_de_la_url():
    """`http://localhost` no guarda cookies `secure`: sin este respaldo el
    banco de pruebas E2E no podría abrir el WebSocket."""
    ws = WSFalso({}, {"Origin": "http://127.0.0.1:3100"})
    assert realtime_alerts._credencial(ws, "token-en-la-url") == ("token-en-la-url", "query")


def test_el_respaldo_no_exige_origen_permitido():
    """Un token en la URL no es autoridad ambiental: una página ajena no puede
    leerlo, así que no hay secuestro que impedir. Exigir origen aquí rompería a
    los clientes que no son navegador sin ganar nada."""
    ws = WSFalso({}, {"Origin": "https://cualquier-cosa.example"})
    assert realtime_alerts._credencial(ws, "tok")[1] == "query"


def test_sin_nada_no_hay_credencial():
    assert realtime_alerts._credencial(WSFalso(), "") == ("", "")


# ── Y la guarda de la guarda ─────────────────────────────────────────────────

def test_si_no_hay_lista_de_origenes_la_cookie_pasa():
    """En desarrollo `_CORS_ORIGINS` puede llegar vacía. Con la lista vacía no
    hay nada contra lo que comparar, así que no se bloquea — pero conviene
    saberlo, porque significa que la defensa depende de que el despliegue la
    rellene. En producción `_CORS_ORIGINS` nunca está vacía: lleva el dominio
    del frontend escrito en `server.py`."""
    realtime_alerts._origenes_permitidos = []
    ws = WSFalso({"access_token": "tok"}, {"Origin": "https://donde-sea.example"})
    assert realtime_alerts._credencial(ws, "") == ("tok", "cookie")
