"""Cambiar de plan no puede convertir un pago único en una cuota mensual.

El fallo que esto fija
----------------------
`change_plan_real` (`missing_apis.py`) cambia la suscripción de Stripe al plan
nuevo. Si no hay un `Price` guardado para ese plan, lo crea al vuelo:

    recurring={"interval": plan.get("stripe_interval", "month")}

El plan **De Por Vida** es un pago único: en `SUBSCRIPTION_PLANS` tiene
`interval: "lifetime"` y no tiene `stripe_interval`. Ese `.get` caía por tanto
en el valor por defecto —`"month"`— y habría creado **un precio recurrente de
500 € AL MES**, cobrándoselo cada treinta días a alguien que creía estar pagando
una sola vez.

Nunca llegó a pasar porque ninguna pantalla llamaba a la ruta: estaba en
`docs/RUTAS_MUERTAS.md` como CONSTRUIR. El día que se le puso un botón delante
—2026-09-02— dejó de ser teórico.

Lo que se fija aquí no es «el vitalicio está en una lista negra», que se
quedaría corto en cuanto entre otro plan de pago único. Se fija el invariante:
**todo plan que la ruta acepte cambiar tiene que tener un intervalo de cobro
explícito**. Si mañana se añade «pago único de 3 años», este test falla hasta
que alguien decida qué hacer con él.
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))


def _planes():
    """`SUBSCRIPTION_PLANS` leído del fuente, sin arrancar el servidor.

    Importar `server` arrastra la base de datos y las claves de Stripe; para
    comprobar una tabla de constantes no hace falta nada de eso.
    """
    txt = (RAIZ / "server.py").read_text(encoding="utf-8")
    i = txt.index("SUBSCRIPTION_PLANS = {")
    bloque = txt[i:txt.index("\n}", i)]
    planes = {}
    for m in re.finditer(r'"(?P<id>[a-z]+)":\s*\{(?P<cuerpo>[^}]*)\}', bloque):
        cuerpo = m.group("cuerpo")
        campos = dict(re.findall(r'"([a-z_]+)":\s*"?([^",]+)"?', cuerpo))
        planes[m.group("id")] = campos
    return planes


def test_la_tabla_de_planes_se_puede_leer():
    """Si esto falla, los demás asertos de este fichero no comprueban nada."""
    planes = _planes()
    assert set(planes) == {"monthly", "quarterly", "annual", "lifetime"}, planes


def test_todo_plan_recurrente_sabe_traducirse_a_un_periodo_de_stripe():
    """El fallo de cobro que encontró este test la primera vez que se ejecutó.

    `change_plan_real` creaba el precio con
    `recurring={"interval": plan.get("stripe_interval", "month")}` y
    **`stripe_interval` no existe en ningún plan**, así que el `.get` caía
    siempre en «month»: el trimestral se habría cobrado a 45 € AL MES en vez de
    al trimestre, y el anual a 200 € AL MES en vez de al año — doce veces lo
    anunciado.

    Stripe no tiene intervalo «quarter»; un trimestre son tres meses dichos con
    `interval_count`. Aquí se fija que cada plan recurrente tenga traducción,
    y que la traducción esté en el código.
    """
    planes = _planes()
    src = (RAIZ / "missing_apis.py").read_text(encoding="utf-8")
    i = src.index("PERIODOS = {")
    mapa = src[i:src.index("}", i)]

    for pid, p in planes.items():
        intervalo = p.get("interval")
        if intervalo == "lifetime":
            continue                      # pago único: lo rechaza la guarda
        assert f'"{intervalo}"' in mapa, (
            f"el plan «{pid}» se cobra cada «{intervalo}» y PERIODOS no sabe "
            f"traducirlo a un periodo de Stripe"
        )

    # Y que el trimestre no se cuele como un mes.
    assert '"quarter": ("month", 3)' in mapa, (
        "un trimestre son TRES meses; si se traduce a uno, se cobra el triple"
    )


def test_el_precio_de_la_tabla_se_usa_antes_de_inventar_uno():
    """Los cuatro planes ya traen su `stripe_price_id` y no se miraba."""
    src = (RAIZ / "missing_apis.py").read_text(encoding="utf-8")
    i = src.index("async def change_plan_real")
    cuerpo = src[i:i + 9000]
    usa_tabla = cuerpo.find('new_plan.get("stripe_price_id")')
    crea = cuerpo.find("stripe.Price.create")
    assert usa_tabla != -1, "no se usa el Price que la tabla de planes ya trae"
    assert usa_tabla < crea, "se crea un precio nuevo antes de mirar el que hay"


def test_change_plan_rechaza_los_planes_de_pago_unico():
    """La guarda existe y va ANTES de tocar Stripe."""
    src = (RAIZ / "missing_apis.py").read_text(encoding="utf-8")
    i = src.index("async def change_plan_real")
    cuerpo = src[i:src.index("\n@router", i + 10)] if "\n@router" in src[i:] else src[i:]

    guarda = cuerpo.find('== "lifetime"')
    modifica = cuerpo.find("stripe.Subscription.modify")
    crea_precio = cuerpo.find("stripe.Price.create")

    assert guarda != -1, (
        "no hay guarda para los planes de pago único: un vitalicio pasaría a "
        "cobrarse como cuota mensual"
    )
    assert modifica != -1 and crea_precio != -1, "cambió la implementación; revisa este test"
    assert guarda < crea_precio < 10**9 and guarda < modifica, (
        "la guarda tiene que ir antes de crear el precio y de modificar la "
        "suscripción; si va después, el cobro ya se ha configurado mal"
    )


def test_la_guarda_devuelve_al_checkout_en_vez_de_fallar():
    """Un pago único no es un error del usuario: es otra forma de comprar."""
    src = (RAIZ / "missing_apis.py").read_text(encoding="utf-8")
    i = src.index('== "lifetime"')
    tramo = src[i:i + 500]
    assert "redirect_to_checkout" in tramo, (
        "rechazar sin decir a dónde ir deja al cliente sin forma de comprarlo"
    )
