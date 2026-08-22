"""Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar.

Por qué esto no es una lista de enlaces
---------------------------------------
Un enlace de referido a un bróker de CFDs dirigido a minoristas de la UE **es una
promoción financiera**, no un banner. `docs/COMPETENCIA_Y_PASARELA_BROKERS.md` §4
ya lo dejó escrito y lo que sigue no lo repite, lo ejecuta:

  · MiFID II art. 24 — la comunicación tiene que ser imparcial, clara y no
    engañosa.
  · Intervención de producto de ESMA — toda promoción de CFDs lleva la
    **advertencia normalizada con el porcentaje REAL de cuentas minoristas que
    pierden dinero de ESE bróker**, recalculado por el bróker **cada trimestre**
    sobre los 12 meses anteriores. Prohibidos los bonos y los incentivos.
  · **El contenido del afiliado es responsabilidad del bróker.** Uno serio nos
    auditará el contenido; uno que no lo haga es la señal de alarma. Dukascopy lo
    dice en sus propias condiciones: se reserva revisar los programas de
    marketing y exigir cambios a su entera discreción.
  · Promocionar ante minoristas de la UE una entidad **sin autorización** en la
    UE es el terreno donde la CNMV publica advertencias.

De ahí la forma de este módulo: un enlace no es un dato suelto, es un dato que
sólo es publicable **junto a** su entidad legal, su regulador y su porcentaje de
pérdidas con fecha. Si falta cualquiera de los tres, `puede_mostrarse()` dice que
no y no hay forma de saltárselo desde la plantilla.

Dónde viven los enlaces
-----------------------
En el entorno, no aquí: `BROKER_REF_<ID>` (por ejemplo `BROKER_REF_AXI`). Un
enlace de referido no es un secreto, pero sí cambia sin avisar y es específico de
la cuenta de afiliado — meterlo en el repositorio es garantizar que un día apunte
a la cuenta de otro. Un bróker sin su variable puesta simplemente no se muestra.

⚠️ Los porcentajes de abajo son los que había al escribir esto y **caducan**. La
fecha va al lado a propósito: `esta_al_dia()` deja de mostrarlos pasada la
ventana trimestral en vez de enseñar una cifra vieja como si fuera de ahora — el
mismo criterio que `stale` en los precios.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

# ESMA obliga al bróker a recalcular el porcentaje CADA TRIMESTRE sobre los 12
# meses anteriores. 100 días da margen para el retraso de publicación sin llegar
# a enseñar una cifra de dos trimestres atrás.
DIAS_VALIDEZ_PORCENTAJE = 100


@dataclass(frozen=True)
class Broker:
    """Un bróker y lo que hace falta para poder enlazarlo legalmente."""

    id: str
    nombre: str
    # Quién firma el contrato con el cliente. NO es la marca: «Axi» es un nombre
    # comercial y quien responde ante un minorista de la UE es Solaris EMEA Ltd.
    entidad_ue: Optional[str]
    regulador_ue: Optional[str]
    licencia_ue: Optional[str]
    # ¿Ofrece CFDs a minoristas? Es lo que dispara la advertencia normalizada.
    ofrece_cfd_minorista: bool
    # El porcentaje de cuentas minoristas que pierden dinero, y CUÁNDO se leyó.
    perdida_pct: Optional[float]
    perdida_pct_leido_el: Optional[date]
    # Notas que hay que tener delante antes de firmar nada.
    aviso: str = ""

    @property
    def autorizado_ue(self) -> bool:
        """Sin entidad, regulador y licencia de la UE, no hay autorización."""
        return bool(self.entidad_ue and self.regulador_ue and self.licencia_ue)

    def url_referido(self) -> Optional[str]:
        """El enlace, del entorno. Vacío o ausente cuentan igual: no hay enlace."""
        return (os.environ.get(f"BROKER_REF_{self.id.upper()}") or "").strip() or None

    def esta_al_dia(self, hoy: Optional[date] = None) -> bool:
        """¿El porcentaje sigue dentro de la ventana trimestral?

        Un bróker que no ofrece CFDs a minoristas no necesita el porcentaje: la
        advertencia normalizada es de la intervención de producto sobre CFDs.
        """
        if not self.ofrece_cfd_minorista:
            return True
        if self.perdida_pct is None or self.perdida_pct_leido_el is None:
            return False
        hoy = hoy or date.today()
        return hoy - self.perdida_pct_leido_el <= timedelta(days=DIAS_VALIDEZ_PORCENTAJE)

    def puede_mostrarse(self, hoy: Optional[date] = None) -> bool:
        """Las cuatro condiciones a la vez. Si falta una, no se enlaza.

        No hay parámetro para saltárselo: un `forzar=True` acabaría puesto un
        viernes por la tarde y nadie lo quitaría.
        """
        return bool(
            self.autorizado_ue
            and self.esta_al_dia(hoy)
            and self.url_referido()
        )

    def advertencia(self) -> Optional[str]:
        """La advertencia normalizada de ESMA, con el porcentaje de ESTE bróker.

        Devuelve `None` —y no un texto genérico— cuando no hay porcentaje: una
        advertencia sin cifra no cumple, y una cifra inventada es peor que no
        enlazar. El texto es el de la intervención de producto; la versión
        reducida («X % de las cuentas de CFD minoristas pierden dinero») sólo
        vale donde hay límite de caracteres, que no es nuestro caso.
        """
        if not self.ofrece_cfd_minorista:
            return None
        if self.perdida_pct is None:
            return None
        pct = f"{self.perdida_pct:.2f}".rstrip("0").rstrip(".")
        return (
            f"Los CFD son instrumentos complejos y conllevan un alto riesgo de "
            f"perder dinero rápidamente debido al apalancamiento. "
            f"El {pct} % de las cuentas de inversores minoristas pierden dinero "
            f"al operar CFD con este proveedor. Debe considerar si comprende "
            f"cómo funcionan los CFD y si puede permitirse asumir un riesgo "
            f"elevado de perder su dinero."
        )


# ── El registro ──────────────────────────────────────────────────────
#
# Los seis pedidos el 2026-08-22. Lo que está SIN confirmar va como None y no
# como un valor optimista: el detalle, las fuentes y lo que falta pedir a cada
# uno están en `docs/BROKERS_REFERIDOS.md`.
BROKERS: tuple[Broker, ...] = (
    Broker(
        id="axi",
        nombre="Axi",
        entidad_ue="Solaris EMEA Ltd (HE376148, Chipre)",
        regulador_ue="CySEC",
        licencia_ue="433/23",
        ofrece_cfd_minorista=True,
        perdida_pct=67.24,
        perdida_pct_leido_el=date(2026, 8, 22),
        aviso="Programa de afiliados por región: el de la UE no es el mismo que "
              "el internacional. Confirmar que el contrato es con la entidad "
              "CySEC y no con la australiana.",
    ),
    Broker(
        id="dukascopy",
        nombre="Dukascopy Europe",
        entidad_ue="Dukascopy Europe IBS AS (Letonia)",
        regulador_ue="Latvijas Banka",
        licencia_ue=None,          # falta el número: pedirlo antes de publicar
        ofrece_cfd_minorista=True,
        perdida_pct=68.82,
        perdida_pct_leido_el=date(2026, 8, 22),
        aviso="«Business Introducer», aprobación en ~7 días. Sus condiciones se "
              "reservan revisar el marketing y exigir cambios a su discreción: "
              "eso es lo normal y lo correcto, pero implica que cada texto "
              "nuestro pasa por ellos. Prohibido usar dominios con «dukascopy».",
    ),
    Broker(
        id="swissquote",
        nombre="Swissquote",
        entidad_ue=None,           # confirmar la entidad de la UE (Luxemburgo)
        regulador_ue=None,
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        aviso="Banco suizo (FINMA) con entidad europea aparte. Las cifras de "
              "comisiones que circulan salen de webs de afiliados, no de "
              "Swissquote: no las tomes por buenas. Su web está bloqueada por "
              "el proxy de este entorno, así que no he podido leer la fuente.",
    ),
    Broker(
        id="saxo",
        nombre="Saxo",
        entidad_ue="Saxo Bank A/S (Dinamarca)",
        regulador_ue=None,         # confirmar; el programa es institucional
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        aviso="⚠️ Su programa NO es un enlace de afiliado: es «introducing "
              "broker» institucional, para intermediarios financieros, bancos y "
              "brókers, con reporting MiFID II y EMIR. Eso es intermediación "
              "regulada, no marketing. Antes de pedirlo, decidir si se quiere "
              "estar en ese negocio.",
    ),
    Broker(
        id="ibkr",
        nombre="Interactive Brokers",
        entidad_ue=None,           # IBKR Ireland; confirmar cuál aplica
        regulador_ue=None,
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        aviso="⚠️ Su «Refer a Friend» EXCLUYE a residentes en España, entre "
              "otros, y exige ser cliente con 2.000 $ en activos. El programa de "
              "afiliados es otra cosa y no he podido leer sus condiciones: "
              "interactivebrokers.com está bloqueado por el proxy de este "
              "entorno. Verificar antes de contar con él.",
    ),
    Broker(
        id="vtmarkets",
        nombre="VT Markets",
        entidad_ue=None,
        regulador_ue=None,
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        aviso="🔴 NO tiene autorización en la UE. Su propia entidad chipriota "
              "declara que «no ofrece productos financieros regulados ni "
              "servicios de negociación»; opera bajo ASIC, FSCA y FSC Mauricio. "
              "Hay además informaciones de prensa sectorial sobre una lista "
              "negra de CySEC y una advertencia del regulador español que NO he "
              "podido verificar en la fuente (cnmv.es está bloqueado aquí). "
              "Enlazarlo desde un sitio español dirigido a minoristas de la UE "
              "es exactamente el caso que la CNMV persigue.",
    ),
)


def por_id(broker_id: str) -> Optional[Broker]:
    return next((b for b in BROKERS if b.id == broker_id), None)


def publicables(hoy: Optional[date] = None) -> list[Broker]:
    """Los que hoy se pueden enlazar. Puede ser una lista vacía, y está bien."""
    return [b for b in BROKERS if b.puede_mostrarse(hoy)]


def pendientes() -> list[tuple[str, str]]:
    """Qué le falta a cada uno para poder publicarse. Informe, no puerta.

    No es un test que falle con el paso del tiempo: eso rompería CI un martes
    cualquiera sin que nadie hubiera tocado nada. Es una lista que se mira.
    """
    fuera = []
    for b in BROKERS:
        faltan = []
        if not b.entidad_ue:
            faltan.append("entidad de la UE")
        if not b.regulador_ue:
            faltan.append("regulador")
        if not b.licencia_ue:
            faltan.append("número de licencia")
        if b.ofrece_cfd_minorista and b.perdida_pct is None:
            faltan.append("porcentaje de pérdidas")
        elif not b.esta_al_dia():
            faltan.append("porcentaje de pérdidas CADUCADO")
        if not b.url_referido():
            faltan.append(f"enlace (BROKER_REF_{b.id.upper()})")
        if faltan:
            fuera.append((b.id, ", ".join(faltan)))
    return fuera


if __name__ == "__main__":  # pragma: no cover
    print(f"Publicables ahora mismo: {len(publicables())} de {len(BROKERS)}\n")
    for bid, falta in pendientes():
        print(f"  {bid:12} falta: {falta}")
