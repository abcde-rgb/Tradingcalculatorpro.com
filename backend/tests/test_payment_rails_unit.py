"""
Tests offline de los raíles de cobro (Kunfupay como cuarto raíl, camino B).

El fallo que esto vigila es el caro y silencioso: un ajuste con una errata que
deja la web **sin ningún método de pago**, o un enlace de cobro mal pegado que
manda al cliente a un sitio cualquiera con la tarjeta en la mano.

La lógica se extrae de `server.py` con `ast` y se ejecuta con datos falsos, así
que corre sin fastapi ni asyncpg — como el resto de `*_unit.py`.
"""
import ast
from pathlib import Path

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")
_TREE = ast.parse(_SRC)


def _source_of(name):
    for node in ast.walk(_TREE):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(_SRC, node)
    raise AssertionError(f"{name} ya no existe en server.py")


def _const(name):
    """Lee una constante de módulo tal y como está escrita en el fichero."""
    for node in _TREE.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == name for t in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"{name} ya no existe en server.py")


# ── Entorno mínimo para ejecutar las funciones puras ──────────────────────
import json as _json_module  # noqa: E402
from typing import Dict, List  # noqa: E402

_NS = {
    "_json_module": _json_module,
    "Dict": Dict,
    "List": List,
    "_ALL_PAYMENT_METHODS": _const("_ALL_PAYMENT_METHODS"),
    "_DEFAULT_PAYMENT_METHODS": _const("_DEFAULT_PAYMENT_METHODS"),
    "SUBSCRIPTION_PLANS": {"monthly": {}, "quarterly": {}, "annual": {}, "lifetime": {}},
}
for _f in ("_normalize_payment_method", "_parse_enabled_methods", "_parse_kunfupay_links"):
    exec(_source_of(_f), _NS)

normalizar = _NS["_normalize_payment_method"]
raíles = _NS["_parse_enabled_methods"]
enlaces = _NS["_parse_kunfupay_links"]


# ── El alias histórico ────────────────────────────────────────────────────
def test_stripe_es_alias_de_tarjeta():
    assert normalizar("stripe") == "card"
    assert normalizar("  STRIPE ") == "card"
    assert normalizar("kunfupay") == "kunfupay"
    assert normalizar(None) == ""


# ── La lista de raíles nunca puede quedarse vacía ─────────────────────────
@pytest.mark.parametrize("ajuste", ["", "   ", None, "no_existe", "foo,bar"])
def test_ajuste_vacio_o_ilegible_deja_los_de_siempre(ajuste):
    """Un despliegue que pierda la variable no puede dejar la web sin cobrar."""
    assert raíles(ajuste) == list(_const("_DEFAULT_PAYMENT_METHODS"))


def test_solo_lo_pedido_y_en_el_orden_del_catalogo():
    assert raíles("kunfupay,paypal") == ["paypal", "kunfupay"]
    assert raíles("revolut") == ["revolut"]


def test_una_errata_no_tumba_el_resto():
    """`carddd` se ignora; `paypal` sigue cobrando."""
    assert raíles("carddd,paypal") == ["paypal"]


def test_stripe_escrito_como_stripe_enciende_la_tarjeta():
    assert raíles("stripe,revolut") == ["card", "revolut"]


def test_apagar_stripe_es_posible_y_deja_los_otros():
    activos = raíles("paypal,revolut,nowpayments,kunfupay")
    assert "card" not in activos and "sepa" not in activos and "klarna" not in activos
    assert activos == ["paypal", "revolut", "nowpayments", "kunfupay"]


# ── Enlaces de Kunfupay: sólo https y sólo planes que existen ─────────────
def test_enlaces_validos():
    assert enlaces('{"annual": "https://kunfupay.com/x", "lifetime": "https://kunfupay.com/y"}') == {
        "annual": "https://kunfupay.com/x",
        "lifetime": "https://kunfupay.com/y",
    }


@pytest.mark.parametrize("crudo", ["", "   ", None, "{", "[]", '"texto"', "null"])
def test_lo_que_no_es_un_objeto_json_no_da_enlaces(crudo):
    assert enlaces(crudo) == {}


def test_http_sin_ese_no_vale():
    """Mandar a pagar por http es mandar la tarjeta en claro."""
    assert enlaces('{"annual": "http://kunfupay.com/x"}') == {}


def test_plan_inventado_no_vale():
    """Cobrar por un plan que la web no anuncia es cobrar un importe no anunciado."""
    assert enlaces('{"vitalicio_pro": "https://kunfupay.com/x"}') == {}


def test_valor_que_no_es_texto_no_rompe():
    assert enlaces('{"annual": 42, "lifetime": "https://kunfupay.com/y"}') == {
        "lifetime": "https://kunfupay.com/y"
    }


# ── Garantías estructurales: lo que no se puede comprobar ejecutando ──────
def test_el_checkout_comprueba_el_rail_en_el_servidor():
    """Esconder el botón en el frontend no apaga nada para quien llame a la API."""
    fuente = _source_of("create_checkout")
    assert "_enabled_payment_methods()" in fuente
    assert "Método de pago no disponible" in fuente


def test_kunfupay_sin_enlace_no_manda_a_nadie_a_pagar():
    fuente = _source_of("create_checkout")
    assert 'payment_method == "kunfupay"' in fuente
    assert "status_code=503" in fuente


def test_el_alta_manual_es_idempotente_por_referencia():
    """Reintentar tras un timeout no puede regalar un segundo periodo."""
    fuente = _source_of("admin_payment_manual")
    assert "provider_reference" in fuente
    assert "already_processed" in fuente


def test_el_alta_manual_no_admite_los_raíles_con_webhook():
    """Un alta a mano en Stripe taparía un webhook roto en vez de arreglarlo."""
    manuales = _const("_MANUAL_PAYMENT_PROVIDERS")
    for automatico in ("stripe", "card", "paypal", "revolut", "nowpayments"):
        assert automatico not in manuales
    assert "kunfupay" in manuales


def test_la_renovacion_anticipada_no_se_come_los_dias_que_quedan():
    fuente = _source_of("_activate_paid_subscription")
    assert "extend_from_current" in fuente
    fuente_manual = _source_of("admin_payment_manual")
    assert "extend_from_current=True" in fuente_manual


def test_la_prueba_solo_la_dan_los_railes_que_pueden_darla():
    """Klarna fuera: sólo cobra De Por Vida, que nunca lleva prueba."""
    con_prueba = _const("_TRIAL_PAYMENT_METHODS")
    assert "klarna" not in con_prueba
    assert set(con_prueba) <= set(_const("_RECURRING_PAYMENT_METHODS"))
    assert "_TRIAL_PAYMENT_METHODS" in _source_of("create_checkout")
