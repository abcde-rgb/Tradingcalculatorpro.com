"""El monedero de referidos: que el número que se le enseña al usuario sea el suyo.

`credit_referrer_for_payment` está enganchado a los TRES caminos de cobro de
`server.py` (4685, 4779, 4860), así que el saldo se acumula de verdad: es dinero
que el sistema debe. Canjearlo, en cambio, no llegaba a ninguna parte, y la ruta
lo tapaba con dos afirmaciones falsas a la vez:

  · devolvía `available_after` restando el canje de un saldo que no bajaba
    —`referral_wallet_redeemed` no se incrementaba nunca—, y
  · escribía `pending_referral_credit` diciendo «aplicado al próximo checkout»
    cuando `create_checkout` no lee esa clave, ni él ni el webhook de Stripe ni
    PayPal ni NOWPayments.

Ninguna pantalla llama a la ruta, así que las dos se cancelaban sin hacer daño.
Con un botón delante, el usuario habría visto bajar su saldo, habría pagado el
precio entero, y el dinero habría seguido en la cuenta sin nada que lo explicara.

Aquí se fija que eso no vuelva: la aritmética por un lado, y por otro que la
promesa de la ruta concuerde con el código que tiene que cumplirla.
"""
import inspect
import os
import pathlib
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from fastapi import HTTPException  # noqa: E402

import referrals  # noqa: E402


# ══════════════════════════════════════════════════════════════════════════
# La aritmética
# ══════════════════════════════════════════════════════════════════════════
class TestSaldoDisponible:
    def test_lo_ganado_menos_lo_canjeado(self):
        assert referrals.saldo_disponible(
            {"referral_wallet": 51.7, "referral_wallet_redeemed": 20.0}) == 31.7

    def test_un_usuario_sin_referidos_no_revienta(self):
        assert referrals.saldo_disponible({}) == 0.0

    def test_un_none_en_la_BD_cuenta_como_cero(self):
        """Un documento viejo puede traer la clave a `null`; `float(None)` peta."""
        assert referrals.saldo_disponible(
            {"referral_wallet": None, "referral_wallet_redeemed": None}) == 0.0
        assert referrals.saldo_disponible(
            {"referral_wallet": 10.0, "referral_wallet_redeemed": None}) == 10.0

    def test_todo_canjeado_es_cero_y_no_negativo_por_redondeo(self):
        assert referrals.saldo_disponible(
            {"referral_wallet": 1.70, "referral_wallet_redeemed": 1.70}) == 0.0


class TestCuantoSeCanjea:
    U = {"referral_wallet": 30.0, "referral_wallet_redeemed": 10.0}   # 20 € libres

    def test_sin_cantidad_se_canjea_todo_lo_disponible(self):
        assert referrals.cuanto_se_canjea(self.U, None) == 20.0

    def test_una_parte(self):
        assert referrals.cuanto_se_canjea(self.U, 7.5) == 7.5

    def test_no_se_puede_canjear_mas_de_lo_que_hay(self):
        with pytest.raises(ValueError, match="Saldo insuficiente"):
            referrals.cuanto_se_canjea(self.U, 20.01)

    @pytest.mark.parametrize("malo", [0, -5, -0.01])
    def test_ni_cero_ni_negativo(self, malo):
        """Un negativo sumaría saldo en vez de gastarlo."""
        with pytest.raises(ValueError):
            referrals.cuanto_se_canjea(self.U, malo)

    def test_lo_que_no_es_un_numero(self):
        with pytest.raises(ValueError, match="inválido"):
            referrals.cuanto_se_canjea(self.U, "veinte")

    def test_sin_saldo_no_hay_canje(self):
        with pytest.raises(ValueError, match="No hay saldo"):
            referrals.cuanto_se_canjea({"referral_wallet": 5.0,
                                        "referral_wallet_redeemed": 5.0}, None)


# ══════════════════════════════════════════════════════════════════════════
# La ruta, con una BD de mentira que SÍ aplica lo que se le escribe
# ══════════════════════════════════════════════════════════════════════════
class _Coleccion:
    def __init__(self, docs=None):
        self.docs = list(docs or [])
        self.escrituras = []

    async def find_one(self, filtro, _proj=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in filtro.items()):
                return dict(d)
        return None

    async def insert_one(self, doc):
        self.escrituras.append(("insert", doc))
        self.docs.append(dict(doc))

    async def update_one(self, filtro, cambio):
        self.escrituras.append(("update", cambio))
        for d in self.docs:
            if all(d.get(k) == v for k, v in filtro.items()):
                for k, v in cambio.get("$inc", {}).items():
                    d[k] = round(float(d.get(k) or 0.0) + v, 2)
                d.update(cambio.get("$set", {}))


class _BD:
    def __init__(self, usuario):
        self.users = _Coleccion([usuario])
        self.referral_redemptions = _Coleccion()

    @property
    def escrituras(self):
        return self.users.escrituras + self.referral_redemptions.escrituras


@pytest.fixture
def bd(monkeypatch):
    base = _BD({"id": "u1", "referral_wallet": 30.0, "referral_wallet_redeemed": 10.0})
    monkeypatch.setattr(referrals, "db", base)
    return base


async def _canjear(amount=None):
    return await referrals.redeem_credit(user={"id": "u1"}, amount=amount)


@pytest.mark.asyncio
async def test_mientras_el_cobro_no_lo_aplique_se_responde_501(bd, monkeypatch):
    monkeypatch.setattr(referrals, "CHECKOUT_APLICA_CREDITO", False)
    with pytest.raises(HTTPException) as exc:
        await _canjear()
    assert exc.value.status_code == 501
    assert "20.0" in exc.value.detail, exc.value.detail   # le dice cuánto tiene
    assert "intacto" in exc.value.detail


@pytest.mark.asyncio
async def test_el_501_no_toca_el_saldo(bd, monkeypatch):
    """Lo importante del 501: que no escriba NADA.

    Un 501 después de haber marcado el canje sería la misma pérdida con otro
    código de estado.
    """
    monkeypatch.setattr(referrals, "CHECKOUT_APLICA_CREDITO", False)
    with pytest.raises(HTTPException):
        await _canjear()
    assert bd.escrituras == []
    assert referrals.saldo_disponible(await bd.users.find_one({"id": "u1"})) == 20.0


@pytest.mark.asyncio
async def test_cuando_se_active_el_saldo_baja_de_verdad(bd, monkeypatch):
    """La regresión que habría costado dinero: canjear tiene que RESTAR.

    Sin el `$inc` de `referral_wallet_redeemed`, la respuesta decía 12.5 € y el
    saldo guardado seguía en 20 €. Se canjeaba infinitas veces el mismo dinero.
    """
    monkeypatch.setattr(referrals, "CHECKOUT_APLICA_CREDITO", True)
    r = await _canjear(7.5)
    assert r["redeemed_amount"] == 7.5
    assert r["available_after"] == 12.5
    guardado = referrals.saldo_disponible(await bd.users.find_one({"id": "u1"}))
    assert guardado == 12.5, "la respuesta y la BD tienen que decir lo mismo"


@pytest.mark.asyncio
async def test_el_saldo_se_agota_y_el_siguiente_canje_se_rechaza(bd, monkeypatch):
    monkeypatch.setattr(referrals, "CHECKOUT_APLICA_CREDITO", True)
    await _canjear(10.0)
    await _canjear(10.0)
    with pytest.raises(HTTPException) as exc:
        await _canjear(0.01)
    assert exc.value.status_code == 400
    assert "No hay saldo" in exc.value.detail


@pytest.mark.asyncio
async def test_pedir_de_mas_no_escribe_nada(bd, monkeypatch):
    monkeypatch.setattr(referrals, "CHECKOUT_APLICA_CREDITO", True)
    with pytest.raises(HTTPException) as exc:
        await _canjear(999)
    assert exc.value.status_code == 400
    assert bd.escrituras == []


# ══════════════════════════════════════════════════════════════════════════
# La constante tiene que concordar con el código, no con lo que uno recuerde
# ══════════════════════════════════════════════════════════════════════════
BACKEND = pathlib.Path(__file__).resolve().parent.parent
CLAVE = "pending_referral_credit"


def lectores_del_credito() -> list[str]:
    """Ficheros del backend, fuera de `referrals.py`, que mencionan la clave.

    `referrals.py` la ESCRIBE, así que no cuenta. Cualquier otro sitio que la
    nombre sólo puede ser para leerla, que es justo lo que falta hoy.
    """
    fuera = []
    for py in sorted(BACKEND.glob("*.py")):
        if py.name == "referrals.py":
            continue
        if CLAVE in py.read_text(errors="ignore"):
            fuera.append(py.name)
    return fuera


def test_la_constante_dice_la_verdad():
    """Si alguien enseña el crédito al cobro, esto avisa de poner la constante.

    Sin esto la constante se queda en False para siempre y el canje sigue dando
    501 con el descuento ya implementado — el fallo silencioso simétrico.
    """
    lectores = lectores_del_credito()
    if lectores:
        assert referrals.CHECKOUT_APLICA_CREDITO, (
            f"{', '.join(lectores)} ya leen `{CLAVE}`: pon "
            "CHECKOUT_APLICA_CREDITO = True para que el canje deje de dar 501")
    else:
        assert not referrals.CHECKOUT_APLICA_CREDITO, (
            f"nada en el backend lee `{CLAVE}`, así que canjear no descuenta "
            "nada del precio; la constante no puede estar en True")


def test_el_detector_de_lectores_no_es_una_guarda_vacia(tmp_path, monkeypatch):
    """El control: que la lista sepa encontrar un lector cuando lo hay.

    Una función que devolviera siempre `[]` pasaría el test de arriba en verde
    para siempre. Este repositorio ya ha tenido varias guardas así.
    """
    falso = tmp_path / "checkout_falso.py"
    falso.write_text(f'credito = user.get("{CLAVE}", 0)\n')
    (tmp_path / "referrals.py").write_text("# el que escribe, no cuenta\n")
    monkeypatch.setattr(sys.modules[__name__], "BACKEND", tmp_path)
    assert lectores_del_credito() == ["checkout_falso.py"]


def test_la_ruta_no_promete_lo_que_no_hace():
    """La docstring es lo que lee quien vaya a ponerle pantalla."""
    doc = inspect.getdoc(referrals.redeem_credit) or ""
    assert "501" in doc and "CHECKOUT_APLICA_CREDITO" in doc


def test_referrals_me_avisa_de_si_se_puede_canjear():
    """Sin `redeemable`, la pantalla pintaría un botón que devuelve 501."""
    fuente = inspect.getsource(referrals.my_referrals)
    assert '"redeemable": CHECKOUT_APLICA_CREDITO' in fuente


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
