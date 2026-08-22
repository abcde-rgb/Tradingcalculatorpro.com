"""Que un enlace de referido no se pueda publicar sin lo que la ley exige al lado.

Un enlace a un bróker de CFDs dirigido a minoristas de la UE es una promoción
financiera. La intervención de producto de ESMA obliga a la advertencia
normalizada **con el porcentaje real de ese bróker**, recalculado cada trimestre;
MiFID II art. 24 exige que la comunicación no sea engañosa; y promocionar a una
entidad sin autorización en la UE es el caso que la CNMV persigue.

Nada de eso se sostiene con buenas intenciones en una plantilla. Aquí se fija que
la condición viva en el dato: sin entidad, sin regulador, sin licencia, sin
porcentaje fresco o sin enlace, `puede_mostrarse()` dice que no.
"""
import os
import sys
from datetime import date, timedelta

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import brokers_referidos as br  # noqa: E402

HOY = date(2026, 8, 22)


def _broker(**cambios):
    base = dict(
        id="prueba", nombre="Prueba",
        entidad_ue="Entidad UE SA", regulador_ue="CySEC", licencia_ue="000/00",
        ofrece_cfd_minorista=True,
        perdida_pct=70.0, perdida_pct_leido_el=HOY,
    )
    base.update(cambios)
    return br.Broker(**base)


@pytest.fixture
def con_enlace(monkeypatch):
    monkeypatch.setenv("BROKER_REF_PRUEBA", "https://ejemplo.test/?ref=abc")


# ══════════════════════════════════════════════════════════════════════════
# Las cuatro condiciones, una a una
# ══════════════════════════════════════════════════════════════════════════
def test_con_todo_en_regla_se_muestra(con_enlace):
    assert _broker().puede_mostrarse(HOY) is True


@pytest.mark.parametrize("falta", ["entidad_ue", "regulador_ue", "licencia_ue"])
def test_sin_autorizacion_en_la_ue_no_se_muestra(con_enlace, falta):
    """La marca no es la entidad: quien responde ante el minorista es la sociedad
    con licencia, y si no la hay, no hay enlace."""
    b = _broker(**{falta: None})
    assert b.autorizado_ue is False
    assert b.puede_mostrarse(HOY) is False


def test_sin_enlace_configurado_no_se_muestra(monkeypatch):
    monkeypatch.delenv("BROKER_REF_PRUEBA", raising=False)
    assert _broker().puede_mostrarse(HOY) is False


def test_un_enlace_en_blanco_cuenta_como_no_configurado(monkeypatch):
    """`BROKER_REF_X=""` en el entorno no puede pasar por enlace válido."""
    monkeypatch.setenv("BROKER_REF_PRUEBA", "   ")
    assert _broker().url_referido() is None
    assert _broker().puede_mostrarse(HOY) is False


# ══════════════════════════════════════════════════════════════════════════
# El porcentaje caduca — que es lo que casi nadie implementa
# ══════════════════════════════════════════════════════════════════════════
def test_sin_porcentaje_no_se_muestra_un_broker_de_cfd(con_enlace):
    """Una advertencia sin cifra no cumple, y una cifra inventada es peor."""
    b = _broker(perdida_pct=None, perdida_pct_leido_el=None)
    assert b.esta_al_dia(HOY) is False
    assert b.puede_mostrarse(HOY) is False
    assert b.advertencia() is None


def test_el_porcentaje_recien_leido_vale(con_enlace):
    assert _broker(perdida_pct_leido_el=HOY).esta_al_dia(HOY) is True


def test_el_porcentaje_dentro_de_la_ventana_vale(con_enlace):
    leido = HOY - timedelta(days=br.DIAS_VALIDEZ_PORCENTAJE)
    assert _broker(perdida_pct_leido_el=leido).esta_al_dia(HOY) is True


def test_un_porcentaje_de_hace_dos_trimestres_deja_de_valer(con_enlace):
    """ESMA obliga al bróker a recalcularlo CADA TRIMESTRE. Enseñar el de hace
    seis meses como si fuera el de ahora es exactamente lo que la advertencia
    existe para evitar — el mismo criterio que `stale` en los precios."""
    viejo = HOY - timedelta(days=br.DIAS_VALIDEZ_PORCENTAJE + 1)
    b = _broker(perdida_pct_leido_el=viejo)
    assert b.esta_al_dia(HOY) is False
    assert b.puede_mostrarse(HOY) is False


def test_quien_no_ofrece_cfd_a_minoristas_no_necesita_porcentaje(con_enlace):
    """La advertencia normalizada es de la intervención sobre CFDs. Exigírsela a
    un bróker de acciones al contado sería pintar un aviso que no le toca."""
    b = _broker(ofrece_cfd_minorista=False, perdida_pct=None, perdida_pct_leido_el=None)
    assert b.esta_al_dia(HOY) is True
    assert b.puede_mostrarse(HOY) is True
    assert b.advertencia() is None


# ══════════════════════════════════════════════════════════════════════════
# La advertencia
# ══════════════════════════════════════════════════════════════════════════
def test_la_advertencia_lleva_el_porcentaje_de_ESE_broker():
    texto = _broker(perdida_pct=67.24).advertencia()
    assert "67.24 %" in texto
    assert "instrumentos complejos" in texto
    assert "apalancamiento" in texto


def test_el_porcentaje_se_escribe_sin_ceros_de_adorno():
    assert "70 %" in _broker(perdida_pct=70.0).advertencia()
    assert "68.8 %" in _broker(perdida_pct=68.80).advertencia()


def test_no_hay_puerta_trasera_para_saltarse_la_comprobacion():
    """Un `forzar=True` acabaría puesto un viernes y nadie lo quitaría."""
    import inspect
    firma = inspect.signature(br.Broker.puede_mostrarse)
    assert set(firma.parameters) == {"self", "hoy"}, firma


# ══════════════════════════════════════════════════════════════════════════
# El registro real
# ══════════════════════════════════════════════════════════════════════════
def test_ninguno_de_los_seis_se_publica_todavia(monkeypatch):
    """Hoy no hay ni un enlace configurado, así que la lista tiene que ser vacía.

    Si alguna vez esto falla sin que se hayan puesto las variables de entorno, es
    que alguien ha metido un enlace en el repositorio.
    """
    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    assert br.publicables(HOY) == []


def test_los_seis_estan_y_con_su_aviso():
    ids = {b.id for b in br.BROKERS}
    assert ids == {"axi", "dukascopy", "swissquote", "saxo", "ibkr", "vtmarkets"}
    for b in br.BROKERS:
        assert b.aviso, f"{b.id} sin aviso: lo que falta por confirmar se escribe"


def test_vt_markets_no_figura_como_autorizado_en_la_ue():
    """El hallazgo que decide su caso, fijado como prueba.

    Su propia entidad chipriota declara que no ofrece productos regulados ni
    servicios de negociación; opera bajo ASIC, FSCA y FSC Mauricio. Si alguien le
    pone una licencia de la UE sin traer el número y el registro, esto lo dice.
    """
    vt = br.por_id("vtmarkets")
    assert vt is not None
    assert vt.autorizado_ue is False
    assert vt.puede_mostrarse(HOY) is False


def test_ningun_enlace_esta_escrito_en_el_codigo():
    """Los enlaces van en el entorno. Uno en el repositorio acaba apuntando a la
    cuenta de otro el día que se copie el fichero."""
    import pathlib
    fuente = pathlib.Path(br.__file__).read_text()
    for pista in ("?ref=", "&ref=", "aff_id", "affid", "utm_source=trading"):
        assert pista not in fuente, f"parece un enlace de referido incrustado: {pista}"


def test_pendientes_dice_exactamente_que_falta(monkeypatch):
    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    faltas = dict(br.pendientes())
    assert set(faltas) == {b.id for b in br.BROKERS}, "todos deberían tener algo pendiente"
    assert "enlace" in faltas["axi"]
    assert "número de licencia" in faltas["dukascopy"]
    assert "porcentaje de pérdidas" in faltas["ibkr"]



# ══════════════════════════════════════════════════════════════════════════
# La ruta pública que consume la pantalla
# ══════════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_la_ruta_no_publica_brokers_que_no_cumplen(monkeypatch):
    """La pantalla no puede enseñar lo que no recibe: el filtro está aquí.

    Si esto devolviera la lista entera y dejara filtrar a la plantilla, bastaría
    un `.map()` sin condición en un componente nuevo para publicar un bróker sin
    autorización.
    """
    os.environ.setdefault("ENVIRONMENT", "development")
    os.environ.setdefault("JWT_SECRET", "test-only-secret")
    import server

    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    r = await server.listar_brokers()
    assert r["brokers"] == []
    assert r["afiliacion"] is True, "la relación comercial se declara siempre"


@pytest.mark.asyncio
async def test_un_broker_completo_sale_con_su_advertencia(monkeypatch):
    """El control: si nada saliera nunca, el test de arriba pasaría vacío."""
    import server

    completo = _broker(id="axi", nombre="Axi")
    monkeypatch.setattr(br, "publicables", lambda *a, **k: [completo])
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=abc")

    r = await server.listar_brokers()
    assert len(r["brokers"]) == 1
    fila = r["brokers"][0]
    assert fila["url"] == "https://ejemplo.test/?ref=abc"
    assert fila["entidad"] and fila["regulador"] and fila["licencia"]
    assert "70 %" in fila["advertencia"], fila["advertencia"]

if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
