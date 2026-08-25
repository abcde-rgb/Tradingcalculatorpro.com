"""Los brókers a los que referimos, y las condiciones bajo las que se pueden mostrar.

El público es INTERNACIONAL, y eso cambia el modelo
---------------------------------------------------
Este módulo nació contestando una pregunta europea: cada campo se llamaba
`*_ue`, el listón era `cumple_ue` y la advertencia era la literal de ESMA. Para
un sitio dirigido a **público internacional en régimen de sola promoción** ese
modelo se equivoca en las dos direcciones:

  · **Es demasiado estricto.** VT Markets no tiene autorización en la UE, y
    bajo ASIC, FSCA o FSC de Mauricio es un bróker supervisado. Descartarlo
    para un lector australiano por una regla europea no lo protege de nada.
  · **Y es demasiado laxo, que es lo grave.** Una marca no tiene «una» entidad
    ni «un» porcentaje de pérdidas: tiene uno por región. Decir «el 67,24 % de
    las cuentas pierden dinero **con este proveedor**» a alguien de Chile o
    Singapur —que abriría cuenta con otra entidad, con otra cifra— es
    atribuirle a su bróker una estadística que no es la de su bróker.

La regla que sale de ahí, y que gobierna el resto del fichero: **cada dato va
etiquetado con la jurisdicción y la entidad a la que pertenece**. No se traduce
un régimen a otro ni se generaliza el de nadie. `FichaLegal` lleva su
`jurisdiccion`, el porcentaje lleva su `perdida_pct_entidad`, y lo que no se
sabe sigue yendo como `None`.

Lo que **no** cambia con público internacional
----------------------------------------------
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

⚠️ `puede_mostrarse()` / `cumple_ue` **no es el listón universal, es el de UNA
jurisdicción** — la más exigente que conocemos, y por eso se conserva como
referencia. No decide qué se publica (eso es `publicables()`), y no debe
interpretarse como «este bróker no vale»: significa «este bróker no vale para un
minorista de la UE».

Y «recomendar» no es una palabra neutra
---------------------------------------
La sección se titula «Herramientas que recomendamos». Recomendar una
**plataforma** no es asesoramiento en inversión —eso es recomendar un
instrumento— pero sí es una afirmación nuestra, y el contrato de Axi lo dice sin
rodeos: el Partner debe confirmar al cliente «that any advice provided by the
Partner is provided by the Partner independently, without the consultation,
knowledge or approval of Axi», y que Axi «acts as principal, provides an
execution-only service and does not provide any personal financial advice».

Traducido: **el bróker no respalda nuestra recomendación, y no hay ningún
tercero detrás de ella.** Por eso lo que se publica de cada uno es comprobable
—quién es la entidad, quién la supervisa, con qué número, qué porcentaje publica
y a quién no acepta— y no hay comparativas ni «el mejor».

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
from typing import NamedTuple, Optional


class FichaLegal(NamedTuple):
    """Con quién contrata quien pulsa, y a qué público sirve esa entidad.

    `jurisdiccion` no sobra: sin ella la ficha afirma en silencio que esa
    entidad es la de quien lee, y ante público internacional eso es falso para
    la mayoría.
    """

    entidad: Optional[str]
    regulador: Optional[str]
    licencia: Optional[str]
    # Texto legible, en castellano. Es el respaldo: si la interfaz no conoce
    # el código, enseña esto en vez de un hueco.
    jurisdiccion: Optional[str]
    # Código estable para traducir. El sitio se dirige a diez idiomas: una
    # etiqueta traducida junto a un valor en castellano —«entity for Unión
    # Europea»— es peor que no traducir ninguna de las dos.
    jurisdiccion_codigo: Optional[str]

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
    # De DÓNDE salió la cifra. No prueba que sea correcta —ningún test puede—,
    # pero obliga a que inventarse una exija inventarse también su procedencia,
    # y deja la afirmación auditable por quien venga detrás. Sin fuente, el
    # porcentaje no se publica.
    perdida_pct_fuente: Optional[str] = None
    # ── DE QUÉ ENTIDAD es ese porcentaje ─────────────────────────────────
    #
    # Esto importa más cuanto más internacional es el público, y es la razón
    # de que exista el campo. El porcentaje NO es del bróker: es de **una
    # entidad concreta bajo un régimen concreto**. Swissquote publica 55,05 %
    # en la UE y 78,23 % en Reino Unido — la misma marca, dos cifras, ninguna
    # de las dos «la suya».
    #
    # Decir «el 67,24 % … con este proveedor» a alguien de Chile, México o
    # Singapur —que abriría cuenta con otra entidad y tiene otra cifra— es
    # atribuirle a su bróker una estadística que no es la de su bróker. Misma
    # familia que BUG-059 y BUG-063: un número presentado como más general de
    # lo que es. Sin esto, el porcentaje no se publica.
    perdida_pct_entidad: Optional[str] = None
    # La web pública del bróker. Se usa mientras no haya enlace de referido —
    # es el patrón que ya seguía Hyperliquid en `RecommendedTools`.
    url_publica: str = ""
    # ── Con quién contrata quien llega POR NUESTRO ENLACE ─────────────────
    #
    # No tiene por qué ser `entidad_ue`, y en Axi NO lo es. Su Partner
    # Agreement público lo firma **AxiTrader LLC, de San Vicente y las
    # Granadinas**, y define «Client Agreement» como el acuerdo entre el
    # cliente y *Axi* — es decir, esa misma entidad. Un visitante que entra
    # por la web pública lo enrutan ellos por geografía y en la UE acaba en
    # Solaris EMEA; uno que entra por un enlace de afiliado va a donde lo
    # mande el programa que se haya firmado.
    #
    # Por eso son campos aparte: mostrar la ficha chipriota junto a un enlace
    # que lleva a una entidad de SVG no es un matiz, es decirle al usuario que
    # va a contratar con alguien con quien no va a contratar.
    programa_entidad: Optional[str] = None
    programa_regulador: Optional[str] = None
    programa_jurisdiccion: Optional[str] = None
    programa_jurisdiccion_codigo: Optional[str] = None
    programa_fuente: Optional[str] = None
    # ── A quién NO acepta ─────────────────────────────────────────────────
    #
    # Con público internacional esto deja de ser letra pequeña. El propio
    # contrato de Axi excluye del cómputo al cliente «resident in any country
    # specified by Axi on its website that is banned, embargoed or otherwise
    # prohibited by policy», y el «Refer a Friend» de IBKR excluye países
    # concretos. Mandar a alguien a un alta que va a rechazarle no es sólo no
    # cobrar: es hacerle perder el tiempo y darle nuestros datos a un tercero
    # para nada. Se dice ANTES de que pulse.
    no_admite_residentes: tuple[str, ...] = ()
    # Los mismos países en ISO 3166-1 alfa-2. El frontend los traduce con
    # `Intl.DisplayNames` al idioma que esté leyendo el visitante; la tupla de
    # arriba es castellano y sólo se usa como respaldo y para el informe.
    #
    # ⚠️ No todo lo que excluye un bróker es un país: el contrato de Axi veta
    # «cualquier país de su lista de vetados y embargados», que no tiene código
    # ISO. Para eso va `no_admite_clave`, una clave de i18n. Meterlo a la fuerza
    # como país sería falsear la exclusión para que cupiera en el formato.
    # El país de constitución de `entidad_ue`, en ISO 3166-1 alfa-2.
    #
    # Iba DENTRO del literal —«Solaris EMEA Ltd (HE376148, Chipre)»— y por
    # ahí se colaba en castellano a las tarjetas de los otros nueve idiomas.
    # Misma familia que la advertencia de riesgo: un dato traducible metido
    # en una cadena ya compuesta no hay `t()` que lo alcance.
    entidad_pais_codigo: Optional[str] = None
    no_admite_codigos: tuple[str, ...] = ()
    no_admite_clave: Optional[str] = None
    no_admite_fuente: Optional[str] = None
    # Notas que hay que tener delante antes de firmar nada.
    aviso: str = ""

    @property
    def autorizado_ue(self) -> bool:
        """Sin entidad, regulador y licencia de la UE, no hay autorización."""
        return bool(self.entidad_ue and self.regulador_ue and self.licencia_ue)

    def url_referido(self) -> Optional[str]:
        """El enlace de referido, del entorno. Vacío o ausente: no hay enlace."""
        return (os.environ.get(f"BROKER_REF_{self.id.upper()}") or "").strip() or None

    def url(self) -> Optional[str]:
        """A dónde lleva la tarjeta: el referido si existe, si no la web pública.

        Sin ninguno de los dos no hay tarjeta — un enlace a ninguna parte es
        peor que no enlazar.
        """
        return self.url_referido() or (self.url_publica or None)

    @property
    def es_referido(self) -> bool:
        """¿Nos pagan por este enlace? Decide si se etiqueta como afiliado.

        Llamar «enlace de afiliado» a uno que no lo es también es una
        declaración falsa, sólo que en la dirección que no suele preocupar.
        """
        return self.url_referido() is not None

    def contrato_del_cliente(self) -> "FichaLegal":
        """Entidad, regulador, licencia **y a quién sirve esa entidad**.

        Sin enlace de referido, el visitante aterriza en la web pública y la
        enruta el propio bróker por geografía. Con enlace de referido, el
        destino lo fija el programa, y si ese programa contrata con otra
        entidad hay que decir ESA — y sin regulador ni licencia, porque los de
        la entidad europea no la amparan.

        ⚠️ **La jurisdicción no es adorno.** Una marca no tiene «una» entidad:
        tiene una por región. Enseñar «Solaris EMEA Ltd · CySEC · 433/23» a
        secas ante público internacional afirma, sin decirlo, que ésa es la
        entidad de quien lee — y para un australiano o un chileno no lo es.
        Va etiquetada para que la frase sea verdad para todo el mundo: ésta es
        la entidad para ESE público, la tuya depende de dónde vivas.
        """
        if self.es_referido and self.programa_entidad:
            return FichaLegal(self.programa_entidad, self.programa_regulador,
                              None, self.programa_jurisdiccion,
                              self.programa_jurisdiccion_codigo)
        return FichaLegal(self.entidad_ue, self.regulador_ue, self.licencia_ue,
                          "Unión Europea" if self.entidad_ue else None,
                          "ue" if self.entidad_ue else None)

    def enlace_con_destino_conocido(self) -> bool:
        """¿Sabemos a qué entidad manda nuestro enlace de referido?

        Un enlace de la web pública siempre lo sabe: lo decide el bróker por
        geografía. Uno de afiliado lo fija el programa, así que hace falta
        haber leído CON QUIÉN se firma. Publicar un enlace de referido sin
        saberlo es enseñar una ficha legal que puede no corresponder al sitio
        al que lleva el botón.
        """
        return (not self.es_referido) or bool(self.programa_entidad and self.programa_fuente)

    def esta_al_dia(self, hoy: Optional[date] = None) -> bool:
        """¿El porcentaje sigue dentro de la ventana trimestral?

        Un bróker que no ofrece CFDs a minoristas no necesita el porcentaje: la
        advertencia normalizada es de la intervención de producto sobre CFDs.
        """
        if not self.ofrece_cfd_minorista:
            return True
        if self.perdida_pct_leido_el is None or self._pct_publicable() is None:
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

    def _pct_publicable(self) -> Optional[str]:
        """El porcentaje formateado, o None si no se puede publicar.

        Tres condiciones, no una: la cifra, **de dónde salió** y **de qué
        entidad es**. La tercera se añadió al mirar esto con público
        internacional delante: sin ella la cifra sale atribuida al bróker
        entero, y no es del bróker, es de una entidad suya bajo un régimen.
        """
        if (self.perdida_pct is None or not self.perdida_pct_fuente
                or not self.perdida_pct_entidad):
            return None
        return f"{self.perdida_pct:.2f}".rstrip("0").rstrip(".")

    def advertencia_corta(self) -> str:
        """La línea que cabe en una tarjeta, para acompañar al «leer más».

        Con porcentaje: la **forma abreviada que la propia ESMA admite** donde
        hay límite de espacio, pero **con la entidad delante**. Una tarjeta de
        288 px es ese caso; lo que no cabe es la explicación larga, no la
        atribución.

        Sin porcentaje: aviso genérico y SIN número. Elegir uno «que suene
        bien» sería inventarse una estadística sobre pérdidas ajenas.
        """
        if not self.ofrece_cfd_minorista:
            return ""
        pct = self._pct_publicable()
        if pct is None:
            return ("Producto apalancado: alto riesgo de perder dinero "
                    "rápidamente.")
        return (f"El {pct} % de las cuentas de CFD minoristas pierden dinero "
                f"con {self.perdida_pct_entidad}.")

    def advertencia(self) -> Optional[str]:
        """La advertencia normalizada, con el porcentaje **de esa entidad**.

        Devuelve `None` —y no un texto genérico— cuando no hay porcentaje: una
        advertencia sin cifra no cumple, y una cifra inventada es peor que no
        enlazar.

        ⚠️ Dos diferencias con el texto literal de ESMA, y las dos son para
        que la frase sea verdad ante público internacional:

        1. Donde ESMA dice «con este proveedor», aquí va **el nombre de la
           entidad que publicó la cifra**. La marca no tiene un porcentaje;
           cada entidad suya tiene el suyo, y varían mucho (Swissquote: 55,05 %
           en la UE, 78,23 % en Reino Unido).
        2. Se añade que la entidad que le toque a quien lee depende de su país.
           Sin eso, la frase le está atribuyendo a su futuro bróker una cifra
           que puede no ser la de su futuro bróker.

        El texto de ESMA está pensado para una promoción dirigida a minoristas
        de un solo régimen. Reproducirlo palabra por palabra ante un público de
        muchos países no lo hace más correcto: lo hace preciso en la forma y
        falso en el contenido.
        """
        if not self.ofrece_cfd_minorista:
            return None
        pct = self._pct_publicable()
        if pct is None:
            return None
        return (
            f"Los CFD son instrumentos complejos y conllevan un alto riesgo de "
            f"perder dinero rápidamente debido al apalancamiento. "
            f"El {pct} % de las cuentas de inversores minoristas pierden dinero "
            f"al operar CFD con {self.perdida_pct_entidad}. Debe considerar si "
            f"comprende cómo funcionan los CFD y si puede permitirse asumir un "
            f"riesgo elevado de perder su dinero. La entidad con la que abrirías "
            f"cuenta —y su porcentaje— dependen de tu país de residencia."
        )


# ── El registro ──────────────────────────────────────────────────────
#
# Los seis pedidos el 2026-08-22. Lo que está SIN confirmar va como None y no
# como un valor optimista: el detalle, las fuentes y lo que falta pedir a cada
# uno están en `docs/BROKERS_REFERIDOS.md`.
# ══════════════════════════════════════════════════════════════════════════
# La tabla comparativa: qué se puede comparar con fuente y qué NO
# ══════════════════════════════════════════════════════════════════════════
#
# Una comparativa de brókers suele llevar spread, comisión, depósito mínimo y
# plataformas. **Aquí no van, y no es un descuido.** Esas cifras cambian por
# tipo de cuenta, por par y por semana, y la única forma de tenerlas es leerlas
# en la web del bróker — que desde este entorno está bloqueada por política del
# proxy (403 a los ocho dominios). El `aviso` de Swissquote ya lo dejó escrito
# antes que yo: «las cifras de comisiones que circulan salen de webs de
# afiliados, no de Swissquote: no las tomes por buenas».
#
# Publicar un spread de memoria en una tabla que el lector usa para elegir
# dónde mete su dinero es exactamente la clase de invención que este
# repositorio trata como fallo grave — y aquí, además, el contenido del
# afiliado es responsabilidad legal del bróker.
#
# Lo que SÍ se compara es lo que se deriva del RÉGIMEN bajo el que opera cada
# entidad, que es verificable, cambia poco y es lo que de verdad decide el
# riesgo: cuánto apalancamiento permite la ley, si el saldo negativo está
# cubierto, qué fondo de garantía hay detrás y qué se contrata en realidad.
#
# ⚠️ El apalancamiento de la tabla es el **máximo que la norma permite a un
# minorista**, no el que ofrece el bróker. No es lo mismo: un bróker puede
# ofrecer menos, y la mayoría lo hace en algunos instrumentos. La cabecera de
# la columna lo dice, porque una tabla que ponga «30:1» a secas se lee como una
# promesa del bróker.

class Regimen(NamedTuple):
    """Lo que impone la jurisdicción, no lo que promete la casa.

    Vive aparte del `Broker` a propósito: el tope de apalancamiento es del
    régimen, no de la marca. Tipado por bróker se desviaría —seis entradas que
    hay que acordarse de cambiar el día que ESMA mueva un número— y además
    invitaría a poner el que dice la web de cada uno, que es justo lo que no se
    puede verificar desde aquí.
    """

    codigo: str
    # Tope para minoristas, por instrumento. `None` = la jurisdicción no fija
    # ninguno, que es un dato en sí mismo y no un hueco.
    apalancamiento: Optional[dict]
    # ¿Obliga la norma a que el cliente no pueda perder más de lo depositado?
    saldo_negativo_cubierto: Optional[bool]
    # Fondo de garantía de inversiones: importe y moneda POR SEPARADO.
    #
    # No va como texto ya formateado («20.000 €») porque el separador de miles
    # y la posición del símbolo son del idioma: en la tabla en inglés salía
    # «20.000 €» donde toca «€20,000». Se manda el número y lo formatea
    # `Intl.NumberFormat` en el idioma que se está leyendo.
    fondo_garantia_importe: Optional[int]
    fondo_garantia_moneda: Optional[str]
    # Nombre del esquema, cuando lo tiene (SIPC, esisuisse…). No se traduce.
    fondo_garantia_nombre: Optional[str]
    fuente: str


# Los topes de la UE son la intervención de producto de ESMA de 2018, que los
# reguladores nacionales hicieron permanente. Son los mismos para toda entidad
# autorizada en la UE, y por eso están aquí una vez y no seis.
_ESMA = {
    "fxMayor": "30:1", "fxOtros": "20:1", "oro": "20:1", "indicesMayores": "20:1",
    "materiasPrimas": "10:1", "acciones": "5:1", "cripto": "2:1",
}

REGIMENES: dict[str, Regimen] = {
    "ue": Regimen(
        codigo="ue",
        apalancamiento=_ESMA,
        saldo_negativo_cubierto=True,
        fondo_garantia_importe=20000,
        fondo_garantia_moneda="EUR",
        fondo_garantia_nombre=None,
        fuente="Intervención de producto de ESMA (2018), permanente vía "
               "reguladores nacionales; fondo de garantía de inversiones de la "
               "directiva 97/9/CE.",
    ),
    # ASIC copió los topes de ESMA en 2021, con protección de saldo negativo.
    "au": Regimen(
        codigo="au",
        apalancamiento=_ESMA,
        saldo_negativo_cubierto=True,
        fondo_garantia_importe=None,   # AFCA resuelve quejas; no garantiza fondos
        fondo_garantia_moneda=None,
        fondo_garantia_nombre=None,
        fuente="ASIC Product Intervention Order de 2021, topes equivalentes a "
               "los de ESMA. Sin fondo de garantía de inversiones equivalente.",
    ),
    "ch": Regimen(
        codigo="ch",
        apalancamiento=None,       # FINMA no fija tope al minorista
        saldo_negativo_cubierto=None,
        fondo_garantia_importe=100000,
        fondo_garantia_moneda="CHF",
        fondo_garantia_nombre="esisuisse",
        fuente="FINMA no impone tope de apalancamiento al minorista. La "
               "garantía de depósitos (esisuisse) cubre depósitos BANCARIOS, "
               "no posiciones abiertas.",
    ),
    "us": Regimen(
        codigo="us",
        apalancamiento=None,
        saldo_negativo_cubierto=None,
        fondo_garantia_importe=500000,
        fondo_garantia_moneda="USD",
        fondo_garantia_nombre="SIPC",
        fuente="SIPC cubre valores y efectivo en caso de quiebra del bróker; "
               "no cubre pérdidas de mercado. Los CFD no se ofrecen a "
               "minoristas de EE. UU.",
    ),
    # San Vicente y las Granadinas no regula forex ni CFD. No es un hueco de
    # datos: es el dato.
    "svg": Regimen(
        codigo="svg",
        apalancamiento=None,
        saldo_negativo_cubierto=None,
        fondo_garantia_importe=None,
        fondo_garantia_moneda=None,
        fondo_garantia_nombre=None,
        fuente="SVG no regula forex ni CFD: no hay tope, ni obligación de "
               "cubrir el saldo negativo, ni fondo de garantía.",
    ),
    # Los exchanges de cripto sin licencia de inversión no están bajo ninguno
    # de los anteriores. Lo que ofrecen lo dicen ellos, y se marca como tal.
    "ninguno": Regimen(
        codigo="ninguno",
        apalancamiento=None,
        saldo_negativo_cubierto=None,
        fondo_garantia_importe=None,
        fondo_garantia_moneda=None,
        fondo_garantia_nombre=None,
        fuente="Sin licencia de servicios de inversión: ningún régimen impone "
               "tope, cobertura de saldo negativo ni fondo de garantía.",
    ),
}


def regimen_de(broker_id: str) -> Optional[Regimen]:
    """El régimen bajo el que se contrata, por id de bróker.

    Va por tabla explícita y no derivado del `jurisdiccion_codigo`, porque la
    entidad que firma con el cliente y la que firma el programa de afiliados
    pueden ser de sitios distintos — es justo el caso de Axi.
    """
    return REGIMENES.get(_REGIMEN_POR_BROKER.get(broker_id, ""))


# Qué régimen aplica a QUIEN ABRE CUENTA por nuestro enlace.
_REGIMEN_POR_BROKER = {
    "axi": "ue", "dukascopy": "ue", "saxo": "ue",
    "swissquote": "ch", "ibkr": "us", "vtmarkets": "au",
    "margex": "ninguno", "hyperliquid": "ninguno",
}

# El supervisor que de verdad tiene detrás cada uno, con jurisdicción.
#
# Hace falta porque el modelo nació eurocéntrico (`regulador_ue`) y para
# Swissquote, IBKR y VT Markets ese campo es `None` — no porque no estén
# supervisados, sino porque no tienen entidad EUROPEA registrada aquí. Una
# tabla que leyera `regulador_ue` diría «sin supervisor» de un banco suizo
# cotizado, que es peor que no tener columna.
SUPERVISOR = {
    # (acrónimo del supervisor, país en ISO 3166-1 alfa-2)
    #
    # ⚠️ El país va por CÓDIGO y no dentro del texto. La primera versión de
    # esto ponía «CySEC (Chipre)» y la tabla en inglés salía con los países en
    # castellano — el mismo fallo que se acababa de corregir en las tarjetas de
    # la marquesina, cometido otra vez tres horas después. Un dato traducible
    # metido en una cadena ya compuesta no hay `t()` que lo alcance.
    #
    # VT Markets lleva tres supervisores en tres jurisdicciones y por eso es
    # una lista: aplastarlo a uno para que quepa en la columna sería elegir por
    # el lector cuál le aplica, que depende de dónde abra la cuenta.
    "axi": (("CySEC", "CY"),),
    "dukascopy": (("Latvijas Banka", "LV"),),
    "saxo": (("DFSA", "DK"),),
    "swissquote": (("FINMA", "CH"),),
    "ibkr": (("SEC", "US"), ("FINRA", "US")),
    "vtmarkets": (("ASIC", "AU"), ("FSCA", "ZA"), ("FSC", "MU")),
    "margex": (),
    "hyperliquid": (),
}


# Qué es cada casa. Clave de i18n, no texto: va en la tabla y se traduce.
TIPO = {
    "axi": "brokerTipoCfd",
    "dukascopy": "brokerTipoCasaInversion",
    "saxo": "brokerTipoBanco",
    "swissquote": "brokerTipoBanco",
    "ibkr": "brokerTipoMultimercado",
    "vtmarkets": "brokerTipoCfd",
    "margex": "brokerTipoExchangeCripto",
    "hyperliquid": "brokerTipoDex",
}

# QUÉ se contrata: un derivado sobre el precio, o el valor de verdad. Es la
# diferencia que más gente ignora al comparar, y decide qué pasa si quiebra.
QUE_SE_CONTRATA = {
    "axi": "brokerContrataCfd",
    "dukascopy": "brokerContrataCfd",
    "saxo": "brokerContrataAmbos",
    "swissquote": "brokerContrataAmbos",
    "ibkr": "brokerContrataValores",
    "vtmarkets": "brokerContrataCfd",
    "margex": "brokerContrataPerpetuos",
    "hyperliquid": "brokerContrataPerpetuos",
}

# Apalancamiento que anuncia la propia casa, SÓLO donde ya lo teníamos por
# escrito y con procedencia. `None` es lo normal aquí y no se rellena: el tope
# del régimen ya va en su columna, y mezclar «lo que permite la ley» con «lo
# que anuncia el bróker» en la misma celda es cómo una tabla miente sin decir
# una sola falsedad.
APALANCAMIENTO_DECLARADO = {
    "margex": "100:1",      # lo dice su propia descripción y su portada
}


BROKERS: tuple[Broker, ...] = (
    Broker(
        id="axi",
        url_publica="https://www.axi.com/",
        nombre="Axi",
        entidad_ue="Solaris EMEA Ltd (HE376148)",
        entidad_pais_codigo="CY",
        regulador_ue="CySEC",
        licencia_ue="433/23",
        ofrece_cfd_minorista=True,
        perdida_pct=67.24,
        perdida_pct_leido_el=date(2026, 8, 22),
        perdida_pct_fuente="buscador, 2026-08-22 — PENDIENTE de confirmar en axi.com "
                           "(bloqueado por el proxy de este entorno)",
        # Sin «, UE»: la región ya va en su propia línea de la tarjeta
        # (`jurisdiccion`), traducida por código. Aquí dentro se quedaba en
        # castellano y se colaba en la frase inglesa como «(CySEC, UE)».
        perdida_pct_entidad="Solaris EMEA Ltd (CySEC)",
        programa_entidad="AxiTrader LLC (San Vicente y las Granadinas)",
        programa_regulador=None,   # SVG no regula el forex/CFD: no hay supervisor que poner
        programa_jurisdiccion="San Vicente y las Granadinas — sin supervisión de forex ni CFD",
        programa_jurisdiccion_codigo="svg",
        no_admite_residentes=("los países de su lista de vetados y embargados",),
        # Sin código ISO: no es un país, es una lista que mantiene el bróker.
        no_admite_clave="brokersNoAdmiteListaVetados",
        no_admite_fuente="Axi Partner Agreement: no cuenta como cliente referido quien sea "
                         "«resident in any country specified by Axi on its website that is "
                         "banned, embargoed or otherwise prohibited by policy». La LISTA "
                         "está en su web y no se ha podido leer (proxy).",
        programa_fuente="Axi Partner Agreement, efectivo 2025-12-18, leído del PDF "
                        "oficial (axidocs.s3.ap-southeast-2.amazonaws.com): «between the "
                        "Partner and AxiTrader LLC, a Limited Liability Company "
                        "incorporated under the laws of Saint Vincent and the "
                        "Grenadines», y «Client Agreement: means the agreement between a "
                        "Client and Axi».",
        aviso="🔴 El Partner Agreement PÚBLICO lo firma AxiTrader LLC (San Vicente "
              "y las Granadinas), NO Solaris EMEA Ltd. Es decir: el programa que "
              "se anuncia manda al cliente a la entidad offshore, no a la "
              "chipriota. Antes de poner `BROKER_REF_AXI` hay que exigir por "
              "escrito el programa que contrata con la entidad CySEC — si es que "
              "existe— y actualizar `programa_entidad`. También obliga a "
              "someterles todo material promocional: «submit all marketing or "
              "promotional material to Axi for approval before use and refrain "
              "from altering approved materials».",
    ),
    Broker(
        id="dukascopy",
        url_publica="https://www.dukascopy.com/europe/",
        nombre="Dukascopy Europe",
        entidad_ue="Dukascopy Europe IBS AS",
        entidad_pais_codigo="LV",
        regulador_ue="Latvijas Banka",
        licencia_ue=None,          # falta el número: pedirlo antes de publicar
        ofrece_cfd_minorista=True,
        perdida_pct=68.82,
        perdida_pct_leido_el=date(2026, 8, 22),
        perdida_pct_fuente="buscador, 2026-08-22 — PENDIENTE de confirmar en "
                           "dukascopy.com/europe (bloqueado por el proxy)",
        perdida_pct_entidad="Dukascopy Europe IBS AS (Latvijas Banka)",
        aviso="«Business Introducer», aprobación en ~7 días. Sus condiciones se "
              "reservan revisar el marketing y exigir cambios a su discreción: "
              "eso es lo normal y lo correcto, pero implica que cada texto "
              "nuestro pasa por ellos. Prohibido usar dominios con «dukascopy».",
    ),
    Broker(
        id="swissquote",
        url_publica="https://www.swissquote.com/",
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
        url_publica="https://www.home.saxo/",
        nombre="Saxo",
        entidad_ue="Saxo Bank A/S",
        entidad_pais_codigo="DK",
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
        url_publica="https://www.interactivebrokers.com/",
        nombre="Interactive Brokers",
        entidad_ue=None,           # IBKR Ireland; confirmar cuál aplica
        regulador_ue=None,
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        no_admite_residentes=("España", "Japón", "Dinamarca", "Portugal", "Polonia",
                              "China continental", "Israel"),
        # ⚠️ «China continental» se manda como CN a sabiendas de que no es lo
        # mismo: la exclusión es la China continental y CN incluye lo que cada
        # `Intl.DisplayNames` entienda por China. Es la aproximación más
        # cercana que hay en ISO 3166-1, y queda dicho aquí en vez de
        # aparentar una precisión que el código no tiene.
        no_admite_codigos=("ES", "JP", "DK", "PT", "PL", "CN", "IL"),
        no_admite_fuente="Condiciones del «Refer a Friend» de IBKR, leídas de buscador el "
                         "2026-08-22 — PENDIENTE de confirmar en su web (bloqueada por el "
                         "proxy). Aplica al programa de REFERIDOS; el de afiliados/CPC "
                         "publisher es otro y sus condiciones no se han leído.",
        aviso="⚠️ Su «Refer a Friend» excluye residentes de varios países (ver "
              "`no_admite_residentes`) y exige ser cliente con 2.000 $ en activos. "
              "Con público internacional eso no lo descarta —la mayoría del mundo "
              "sí entra— pero obliga a decir a quién NO sirve antes de que pulse. "
              "Las vías que sí encajan con un sitio de contenido son «CPC Publisher» "
              "e «Influencer Program» (publishers@interactivebrokers.com), y sus "
              "condiciones no se han leído: interactivebrokers.com está bloqueado "
              "por el proxy de este entorno.",
    ),
    Broker(
        id="vtmarkets",
        url_publica="https://www.vtmarkets.com/",
        nombre="VT Markets",
        entidad_ue=None,
        regulador_ue=None,
        licencia_ue=None,
        ofrece_cfd_minorista=True,
        perdida_pct=None,
        perdida_pct_leido_el=None,
        aviso="⚠️ Sus condiciones de afiliado obligan a usar ÚNICAMENTE material "
              "proporcionado o aprobado por ellos, y a pedir aprobación previa por "
              "escrito para cualquier banner o página propia — lo que incluye la "
              "descripción y la ficha de marca de nuestra tarjeta. "
              "🌍 Con público internacional cambia el veredicto, no los hechos: "
              "bajo ASIC (Australia), FSCA (Sudáfrica) o FSC (Mauricio) es un "
              "bróker supervisado y recomendarlo ahí es defendible. Lo que NO "
              "cambia es que a un minorista de la UE no se le puede mandar. "
              "🔴 NO tiene autorización en la UE. Su propia entidad chipriota "
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
    """Los que se muestran: todos los que tienen a dónde enlazar.

    ⚠️ Esto CAMBIÓ el 2026-08-22 por decisión del propietario, y conviene que
    quede escrito cuál era la alternativa.

    Antes esta función sólo devolvía los que pasaban el listón de la UE
    (`puede_mostrarse`): autorización europea, porcentaje de pérdidas dentro de
    la ventana trimestral y enlace configurado. Con ese listón, hoy no se
    publicaba ninguno.

    El propietario opera bajo **regulación suiza, en régimen de sola promoción**
    y para **público internacional**, y decide publicarlos. Esta función respeta
    esa decisión: muestra todos los que tienen enlace.

    Lo que NO se ha quitado, porque sería borrar la información en vez de
    decidir sobre ella: `puede_mostrarse()` sigue existiendo y cada bróker sigue
    diciendo si cumple el listón europeo (`cumple_ue` en la respuesta de la
    API). Y todos llevan aviso de riesgo, con cifra cuando la hay y sin número
    inventado cuando no. Si algún día el público objetivo pasa a ser
    explícitamente la UE, el listón está aquí, entero, para volver a aplicarlo.

    ⚠️ **La única condición que sí bloquea**: un enlace de referido cuyo
    destino no sabemos no se publica (`enlace_con_destino_conocido`). No es
    celo: el Partner Agreement público de Axi lo firma AxiTrader LLC, de San
    Vicente y las Granadinas, no su entidad chipriota. Poner ese enlace debajo
    de la ficha «Solaris EMEA Ltd · CySEC · 433/23» sería decirle al usuario
    que contrata con alguien con quien no contrata.
    """
    return [b for b in BROKERS if b.url() and b.enlace_con_destino_conocido()]


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
        elif b.ofrece_cfd_minorista and not b.perdida_pct_entidad:
            faltan.append("DE QUÉ ENTIDAD es el porcentaje")
        elif not b.esta_al_dia():
            faltan.append("porcentaje de pérdidas CADUCADO")
        if not b.url_referido():
            faltan.append(f"enlace (BROKER_REF_{b.id.upper()})")
        # No es un requisito para publicar, pero sí para no mandar a alguien a
        # un alta que va a rechazarle: con público internacional hay que saber
        # a quién NO admite cada uno.
        if not b.no_admite_fuente:
            faltan.append("a quién NO admite (sin leer)")
        if faltan:
            fuera.append((b.id, ", ".join(faltan)))
    return fuera


if __name__ == "__main__":  # pragma: no cover
    print(f"Publicables ahora mismo: {len(publicables())} de {len(BROKERS)}\n")
    for bid, falta in pendientes():
        print(f"  {bid:12} falta: {falta}")
