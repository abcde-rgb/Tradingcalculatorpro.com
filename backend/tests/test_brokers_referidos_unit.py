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
        perdida_pct_fuente="fuente de prueba",
        # Un porcentaje necesita las TRES: cifra, de dónde salió y de qué
        # entidad es. La tercera se añadió al mirar el registro con público
        # internacional delante — ver la sección del final.
        perdida_pct_entidad="Entidad UE SA (CySEC, UE)",
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
def test_los_seis_se_publican_pero_ninguno_pasa_el_liston_europeo(monkeypatch):
    """El contrato cambió el 2026-08-22, y las dos mitades importan.

    El propietario opera bajo regulación suiza en régimen de sola promoción y
    para público internacional, y decidió publicar los seis. `publicables()` lo
    respeta. Pero la información de si cada uno cumpliría el listón de la UE NO
    se ha borrado: sigue ahí, y hoy no lo pasa ninguno. Borrar el dato en vez de
    decidir sobre él es lo que no se puede hacer.
    """
    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    assert len(br.publicables(HOY)) == 6
    assert [b.id for b in br.BROKERS if b.puede_mostrarse(HOY)] == []


def test_sin_enlace_de_referido_no_se_llama_enlace_de_afiliado(monkeypatch):
    """Llamar afiliado a lo que no lo es también es una declaración falsa."""
    monkeypatch.delenv("BROKER_REF_AXI", raising=False)
    assert br.por_id("axi").es_referido is False
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=X")
    assert br.por_id("axi").es_referido is True


def test_el_enlace_de_referido_gana_a_la_web_publica(monkeypatch):
    axi = br.por_id("axi")
    monkeypatch.delenv("BROKER_REF_AXI", raising=False)
    assert axi.url() == axi.url_publica
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=X")
    assert axi.url() == "https://ejemplo.test/?ref=X"


def test_todos_llevan_aviso_de_riesgo():
    """Ninguna tarjeta de un producto apalancado sale sin avisar."""
    for b in br.BROKERS:
        if b.ofrece_cfd_minorista:
            assert b.advertencia_corta(), f"{b.id} sin aviso corto"


def test_un_porcentaje_sin_fuente_no_se_publica():
    """Lo único que un test PUEDE exigir aquí.

    Ningún test puede saber si 55,05 % es el dato real de Swissquote. Lo que sí
    puede es exigir que toda cifra publicada venga con su fecha y su
    procedencia: así, inventarse un porcentaje obliga a inventarse también de
    dónde salió, y quien venga detrás puede comprobarlo.

    Lo descubrí saboteando: puse un 55,05 % a Swissquote y la suite pasó en
    verde. Mi test anterior comprobaba que la cifra APARECIERA, no que fuera
    defendible.
    """
    sin_fuente = _broker(perdida_pct=55.05, perdida_pct_leido_el=HOY,
                         perdida_pct_fuente=None)
    assert sin_fuente.advertencia() is None
    assert "55" not in sin_fuente.advertencia_corta()
    assert sin_fuente.esta_al_dia(HOY) is False

    con_fuente = _broker(perdida_pct=55.05, perdida_pct_leido_el=HOY,
                         perdida_pct_fuente="swissquote.com/en-eu, leído el 2026-08-22")
    assert "55.05" in con_fuente.advertencia_corta()


def test_toda_cifra_del_registro_declara_de_donde_sale():
    for b in br.BROKERS:
        if b.perdida_pct is not None:
            assert b.perdida_pct_fuente, f"{b.id}: porcentaje sin procedencia"
            assert b.perdida_pct_leido_el, f"{b.id}: porcentaje sin fecha"


def test_no_se_inventa_un_porcentaje_donde_no_lo_hay():
    """La regresión que más caro saldría.

    Los porcentajes varían por jurisdicción —Swissquote publica 55,05 % en la UE
    y 78,23 % en Reino Unido—, así que elegir uno «que suene bien» sería
    inventarse una estadística sobre pérdidas ajenas. Sin cifra confirmada, el
    aviso va SIN número.
    """
    import re
    for b in br.BROKERS:
        if b.perdida_pct is None:
            assert not re.search(r"\d+([.,]\d+)?\s*%", b.advertencia_corta()), \
                f"{b.id} enseña un porcentaje que no tiene"
        else:
            assert f"{b.perdida_pct:.2f}".rstrip("0").rstrip(".") in b.advertencia_corta()


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


# ══════════════════════════════════════════════════════════════════════════
# La ficha legal tiene que describir A DÓNDE LLEVA NUESTRO ENLACE
#
# El fallo que esto impide es concreto y estaba a un `BROKER_REF_AXI` de
# distancia. El Partner Agreement PÚBLICO de Axi (efectivo 2025-12-18, leído
# del PDF oficial) lo firma **AxiTrader LLC, de San Vicente y las Granadinas**,
# y define «Client Agreement» como el acuerdo entre el cliente y *Axi* — esa
# misma entidad. Nuestra tarjeta anuncia «Solaris EMEA Ltd · CySEC · 433/23».
#
# Sin enlace de referido no hay problema: el visitante aterriza en la web
# pública y lo enruta el propio bróker por geografía. En cuanto se configura el
# enlace de ese programa, la ficha chipriota al lado del botón le está diciendo
# al usuario que va a contratar con alguien con quien no va a contratar.
# ══════════════════════════════════════════════════════════════════════════
def test_sin_enlace_de_referido_la_ficha_es_la_entidad_europea(monkeypatch):
    monkeypatch.delenv("BROKER_REF_AXI", raising=False)
    f = br.por_id("axi").contrato_del_cliente()
    assert "Solaris EMEA" in f.entidad
    assert (f.regulador, f.licencia) == ("CySEC", "433/23")


def test_con_enlace_de_referido_la_ficha_es_la_del_PROGRAMA(monkeypatch):
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=abc")
    f = br.por_id("axi").contrato_del_cliente()
    assert "AxiTrader LLC" in f.entidad, "la ficha sigue anunciando la entidad chipriota"
    assert "Vicente" in f.entidad
    # Y sin supervisor ni licencia: los de Solaris EMEA no amparan a la de SVG.
    assert f.regulador is None and f.licencia is None


def test_un_enlace_de_referido_de_destino_desconocido_no_se_publica(monkeypatch):
    """Saxo no tiene leído con qué entidad contrata su programa.

    Publicar su enlace sería enseñar una ficha legal que puede no corresponder
    al sitio al que lleva el botón. Se cae de la lista hasta que se lea.
    """
    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    monkeypatch.setenv("BROKER_REF_SAXO", "https://ejemplo.test/?ref=abc")
    ids = [b.id for b in br.publicables()]
    assert "saxo" not in ids, "se publicó un enlace sin saber a qué entidad lleva"
    # Y no se lleva por delante a los demás, que siguen con su web pública.
    assert "dukascopy" in ids and "swissquote" in ids


def test_axi_si_se_publica_con_enlace_porque_su_destino_SI_se_leyo(monkeypatch):
    """La otra mitad: la puerta no puede estar cerrada para todos.

    Un `enlace_con_destino_conocido` que devolviera siempre False dejaría los
    tres tests de arriba en verde sin proteger nada.
    """
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=abc")
    assert "axi" in [b.id for b in br.publicables()]


def test_la_entidad_del_programa_tambien_declara_su_fuente():
    """Misma regla que los porcentajes: un dato sobre terceros sin procedencia
    no es un dato, es una afirmación."""
    for b in br.BROKERS:
        if b.programa_entidad:
            assert b.programa_fuente, f"{b.id}: entidad de programa sin fuente"


# ══════════════════════════════════════════════════════════════════════════
# Público INTERNACIONAL: cada dato con la jurisdicción a la que pertenece
#
# El modelo nació contestando una pregunta europea y eso producía una
# afirmación falsa para la mayoría de los lectores: «el 67,24 % de las cuentas
# pierden dinero **con este proveedor**» es la cifra de Solaris EMEA bajo
# CySEC, no la de la entidad que le tocaría a alguien de Chile o Singapur.
# Misma familia que BUG-059 y BUG-063: un número presentado como más general
# de lo que es.
# ══════════════════════════════════════════════════════════════════════════
def test_el_porcentaje_dice_de_que_entidad_es():
    corta = br.por_id("axi").advertencia_corta()
    larga = br.por_id("axi").advertencia()
    assert "Solaris EMEA" in corta, "la cifra sale sin decir de quién es"
    assert "Solaris EMEA" in larga
    assert "este proveedor" not in larga, "atribuye la cifra al bróker entero"


def test_la_advertencia_larga_dice_que_la_entidad_depende_del_pais():
    larga = br.por_id("axi").advertencia()
    assert "depende" in larga and "residencia" in larga


def test_un_porcentaje_sin_saber_de_que_entidad_es_no_se_publica():
    """Tercera condición del porcentaje, junto a la cifra y la fuente."""
    b = _broker(perdida_pct=70.0, perdida_pct_fuente="una fuente",
                perdida_pct_entidad=None)
    assert b.advertencia() is None
    assert "70" not in b.advertencia_corta()
    assert b.esta_al_dia(HOY) is False


def test_toda_entidad_de_porcentaje_del_registro_esta_puesta():
    for b in br.BROKERS:
        if b.perdida_pct is not None:
            assert b.perdida_pct_entidad, f"{b.id}: cifra sin entidad"


def test_la_ficha_legal_dice_a_que_publico_sirve_esa_entidad(monkeypatch):
    monkeypatch.delenv("BROKER_REF_AXI", raising=False)
    f = br.por_id("axi").contrato_del_cliente()
    assert f.jurisdiccion == "Unión Europea", (
        "la ficha afirma en silencio que esa entidad es la del lector")


def test_sin_entidad_no_se_inventa_una_jurisdiccion():
    """Swissquote no tiene entidad de la UE confirmada: tampoco jurisdicción."""
    f = br.por_id("swissquote").contrato_del_cliente()
    assert f.entidad is None and f.jurisdiccion is None


def test_la_jurisdiccion_del_programa_viaja_con_su_entidad(monkeypatch):
    monkeypatch.setenv("BROKER_REF_AXI", "https://ejemplo.test/?ref=abc")
    f = br.por_id("axi").contrato_del_cliente()
    assert "AxiTrader" in f.entidad
    assert f.jurisdiccion and "Vicente" in f.jurisdiccion


def test_a_quien_no_admite_se_sabe_antes_de_pulsar():
    """Con público internacional, mandar a alguien a un alta que va a
    rechazarle es hacerle perder el tiempo y sus datos."""
    ibkr = br.por_id("ibkr")
    assert "España" in ibkr.no_admite_residentes
    assert ibkr.no_admite_fuente, "una lista de países sin fuente no es un dato"


def test_ninguna_lista_de_vetados_va_sin_fuente():
    for b in br.BROKERS:
        if b.no_admite_residentes:
            assert b.no_admite_fuente, f"{b.id}: lista de vetados sin fuente"


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
async def test_la_ruta_dice_de_cada_uno_si_cumple_y_si_paga(monkeypatch):
    """La pantalla pinta lo que recibe, así que la respuesta tiene que ser exacta.

    Se publican los seis por decisión del propietario, pero cada fila declara si
    cumple el listón europeo y si el enlace nos paga. Sin esos dos campos, la
    tarjeta no puede decidir si etiquetarse «enlace de afiliado» ni la doc puede
    saber qué falta.
    """
    os.environ.setdefault("ENVIRONMENT", "development")
    os.environ.setdefault("JWT_SECRET", "test-only-secret")
    import server

    for b in br.BROKERS:
        monkeypatch.delenv(f"BROKER_REF_{b.id.upper()}", raising=False)
    r = await server.listar_brokers()
    assert r["afiliacion"] is True, "la relación comercial se declara siempre"
    assert len(r["brokers"]) == 6
    for fila in r["brokers"]:
        # Ninguno cumple el listón europeo hoy, y la respuesta lo dice.
        assert fila["cumpleUe"] is False, fila["id"]
        # Ninguno es enlace de referido todavía, y la respuesta lo dice.
        assert fila["esReferido"] is False, fila["id"]
        # Y ninguno sale sin aviso.
        assert fila["advertenciaCorta"], fila["id"]
        assert fila["url"], fila["id"]


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


# ══════════════════════════════════════════════════════════════════════════
# La tabla comparativa
# ══════════════════════════════════════════════════════════════════════════

def test_los_ocho_recomendados_tienen_fila():
    """La comparativa cubre los OCHO, no sólo los seis brókers del catálogo.

    Margex e Hyperliquid son socios y viven en el frontend, pero sus hechos
    comparables salen de aquí. Si alguien añade un socio y se olvida de la
    tabla, la fila sale vacía en la web y aquí no.
    """
    esperados = {"axi", "dukascopy", "swissquote", "saxo", "ibkr",
                 "vtmarkets", "margex", "hyperliquid"}
    assert set(br.TIPO) == esperados
    assert set(br.QUE_SE_CONTRATA) == esperados
    assert set(br.SUPERVISOR) == esperados
    for bid in esperados:
        assert br.regimen_de(bid) is not None, bid


# Nombres de país en castellano. Si uno de estos aparece DENTRO de un campo
# que llega a la interfaz, ese texto se quedará en castellano en los otros
# nueve idiomas.
_PAISES_ES = (
    "Chipre", "Letonia", "Suiza", "Dinamarca", "Alemania", "Irlanda",
    "Malta", "Luxemburgo", "Australia", "Mauricio", "Sudáfrica",
    "Estados Unidos", "EE. UU.", "EE.UU.", "Reino Unido", "España",
)


def test_ningun_pais_en_castellano_dentro_de_un_dato():
    """Un país traducible metido en una cadena ya compuesta no hay `t()` que lo alcance.

    Este fallo se cometió DOS VECES el mismo día: primero en
    `perdida_pct_entidad` («Solaris EMEA Ltd (CySEC, UE)») y en `entidad_ue`
    («… (HE376148, Chipre)»), y otra vez tres horas después al escribir
    `SUPERVISOR` como «CySEC (Chipre)». Las dos veces se vio en una captura en
    inglés con el país en español, no leyendo el código.

    El país va SIEMPRE por código ISO en un campo aparte, y lo traduce
    `Intl.DisplayNames` en el frontend. La regla mira los campos que de verdad
    llegan a la pantalla, no todo el módulo: `aviso`, `*_fuente` y
    `programa_jurisdiccion` son prosa interna para quien lea el código, y ahí
    el castellano es correcto.
    """
    fallos = []
    for b in br.BROKERS:
        for campo in ("entidad_ue", "regulador_ue", "perdida_pct_entidad",
                      "programa_entidad"):
            valor = getattr(b, campo, None)
            for pais in _PAISES_ES:
                if valor and pais in valor:
                    fallos.append(f"{b.id}.{campo} contiene «{pais}»: {valor}")
    for bid, supervisores in br.SUPERVISOR.items():
        for nombre, _codigo in supervisores:
            for pais in _PAISES_ES:
                if pais in nombre:
                    fallos.append(f"SUPERVISOR[{bid}] contiene «{pais}»: {nombre}")
    assert not fallos, (
        "país en castellano dentro de un dato que llega a la interfaz; "
        "sácalo a un código ISO aparte:\n  " + "\n  ".join(fallos))


def test_el_apalancamiento_del_regimen_no_se_confunde_con_el_de_la_casa():
    """Son dos cosas distintas y no pueden vivir en el mismo sitio.

    `apalancamiento` del régimen es el máximo que la NORMA permite a un
    minorista; `APALANCAMIENTO_DECLARADO` es lo que anuncia la casa. Un bróker
    con las dos cosas dejaría a la interfaz eligiendo cuál enseña, y la tabla
    pasaría a decir «30:1» o «100:1» según el orden del código.
    """
    for bid, declarado in br.APALANCAMIENTO_DECLARADO.items():
        r = br.regimen_de(bid)
        assert r is not None, bid
        assert r.apalancamiento is None, (
            f"{bid} tiene tope de régimen ({r.apalancamiento}) y además un "
            f"apalancamiento declarado ({declarado}): decide cuál manda")


def test_sin_regimen_no_se_inventan_protecciones():
    """Lo que no impone ninguna norma va como `None`, no como `False` alegre.

    `None` es «no lo sé / no aplica» y la tabla lo pinta como tal. `False`
    afirmaría que el bróker NO cubre el saldo negativo, que es una declaración
    sobre un tercero que no podemos sostener.
    """
    for codigo in ("svg", "ninguno", "ch", "us"):
        r = br.REGIMENES[codigo]
        assert r.saldo_negativo_cubierto is not False, (
            f"régimen {codigo}: `False` afirma que no está cubierto; usa None")
        assert r.apalancamiento is None or isinstance(r.apalancamiento, dict)
        assert r.fuente, f"régimen {codigo} sin fuente"


def test_cada_regimen_dice_de_donde_sale():
    """Sin procedencia, un tope de apalancamiento es un número que alguien recordaba."""
    for codigo, r in br.REGIMENES.items():
        assert r.fuente and len(r.fuente) > 30, codigo
