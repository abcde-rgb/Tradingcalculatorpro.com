"""Fija que el adaptador de Yahoo no invente cifras ni pierda días de vencimiento.

Dos familias de bug, la misma causa: **la capa que trae el dato no respetaba las
reglas que el resto del backend sí respeta.**

- El día perdido: `(exp_naive_utc - datetime.now()).days` truncaba la fracción de
  día y mezclaba husos. Un contrato a 7 días se anunciaba como 6, y ese día entra
  en `year_fraction()` y de ahí en el precio.
- Las cifras inventadas: el lado que no cotiza se rellenaba con `openInterest: 0`
  e `iv: 0.3`, en la ruta de datos REALES, que no lleva banda de aviso. Eso anula
  el cuidado de `options_positioning._leg_oi()`, escrito para devolver `None`
  «cuando nunca se observó»: nunca le llegaba un `None`, le llegaba un `0`
  indistinguible de una observación.
"""
import os
from datetime import datetime, timezone

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import options_math  # noqa: E402
from options_positioning import _leg_oi, has_real_open_interest  # noqa: E402
from stock_data import (  # noqa: E402
    _calendar_days_to_expiry,
    _yf_positive_float_or_none,
    _yf_safe_int_or_none,
)


# ---------------------------------------------------------------------------
# El día que se perdía
# ---------------------------------------------------------------------------

def test_no_se_pierde_el_dia_por_truncamiento():
    """7 días naturales son 7, se mire a la hora que se mire."""
    exp = datetime(2026, 8, 17, 0, 0, tzinfo=timezone.utc)  # medianoche UTC, como Yahoo
    for hora in (0, 9, 14, 23):
        ahora = datetime(2026, 8, 10, hora, 30, tzinfo=timezone.utc)
        assert _calendar_days_to_expiry(exp.timestamp(), now=ahora) == 7, (
            f"a las {hora}:30 el contrato dejó de tener 7 días"
        )


def test_el_dia_perdido_valia_un_siete_por_ciento():
    """Por qué importaba: el error de T se convierte en error de precio.

    Es el mismo cálculo con el que se detectó el fallo. Si alguien vuelve a
    truncar, este número dice cuánto cuesta.
    """
    ahora = datetime(2026, 8, 10, 14, 30, tzinfo=timezone.utc)
    correcto = options_math.call_price(
        100, 100, options_math.year_fraction(7, now=ahora), 0.04, 0.30)
    truncado = options_math.call_price(
        100, 100, options_math.year_fraction(6, now=ahora), 0.04, 0.30)
    error = (truncado - correcto) / correcto
    assert error < -0.05, "el día perdido movía la call ATM semanal más de un 5 %"


def test_vencimiento_de_hoy_no_sale_negativo():
    """Un 0DTE en plena sesión sigue teniendo un día por delante, no cero."""
    exp = datetime(2026, 8, 10, 0, 0, tzinfo=timezone.utc)
    ahora = datetime(2026, 8, 9, 22, 0, tzinfo=timezone.utc)
    assert _calendar_days_to_expiry(exp.timestamp(), now=ahora) == 1


# ---------------------------------------------------------------------------
# Las cifras que se inventaban
# ---------------------------------------------------------------------------

def test_interes_abierto_desconocido_es_none_no_cero():
    """`null` del proveedor es DESCONOCIDO. Un 0 inventa una observación."""
    assert _yf_safe_int_or_none(None) is None
    assert _yf_safe_int_or_none(float("nan")) is None
    assert _yf_safe_int_or_none(0) == 0, "un cero publicado sí es un cero observado"
    assert _yf_safe_int_or_none(1234) == 1234


def test_volatilidad_no_publicada_es_none_no_treinta_por_ciento():
    """Yahoo devuelve 0 en contratos ilíquidos; no es una volatilidad del 0 %."""
    assert _yf_positive_float_or_none(None) is None
    assert _yf_positive_float_or_none(0) is None
    assert _yf_positive_float_or_none(0.0) is None
    assert _yf_positive_float_or_none(float("nan")) is None
    assert _yf_positive_float_or_none(0.42) == pytest.approx(0.42)


def test_la_pata_vacia_llega_a_positioning_como_no_observada():
    """El puente entre las dos capas: es donde se rompía la cadena de custodia.

    `_leg_oi` devuelve `None` ante un interés abierto no observado — pero sólo
    puede hacerlo si el adaptador le pasa `None`. Con el `0` de antes, la
    defensa no se disparaba nunca.
    """
    pata_vacia = {"bid": None, "ask": None, "mid": None, "last": None,
                  "volume": None, "openInterest": None, "iv": None}
    assert _leg_oi(pata_vacia) is None

    pata_con_cero_fabricado = {**pata_vacia, "openInterest": 0}
    assert _leg_oi(pata_con_cero_fabricado) == 0, (
        "un 0 es indistinguible de una observación: por eso el adaptador "
        "no puede fabricarlo"
    )


def test_max_pain_se_calla_sobre_una_cadena_sin_interes_observado():
    """La consecuencia de arriba, extremo a extremo."""
    vacia = {"bid": None, "ask": None, "mid": None, "last": None,
             "volume": None, "openInterest": None, "iv": None}
    cadena = [{"strike": s, "call": dict(vacia), "put": dict(vacia)}
              for s in (90, 95, 100, 105, 110)]
    assert has_real_open_interest(cadena) is False

    from options_positioning import max_pain
    assert max_pain(cadena) is None, "max pain sobre nada tiene que ser None"
