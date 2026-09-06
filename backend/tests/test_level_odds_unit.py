"""El motor de probabilidad, contra series cuya respuesta se sabe de antemano.

Una probabilidad no se puede comprobar mirándola: cualquier número parece
razonable. Así que aquí no se comprueba contra la intuición, se comprueba contra
series construidas para que la respuesta correcta sea **una sola**, y contra la
propiedad que tiene que cumplir aunque no se sepa el número.

La prueba que de verdad importa es `test_sin_mirar_al_futuro`: si el motor
filtrara información futura, todas las demás seguirían en verde y las cifras
serían mentira. Es el único fallo de este módulo que no se ve en el resultado.
"""
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from terminal.level_odds import (  # noqa: E402
    _first_touch,
    _rupturas,
    _observaciones,
    _zona,
    bootstrap_proportion,
    measure_level_odds,
)


def barra(i, o, h, l, c, vol=1000):
    return {"date": f"2020-01-{(i % 28) + 1:02d}", "ts": 1577836800 + i * 86400,
            "open": o, "high": h, "low": l, "close": c, "volume": vol}


def sierra(ciclos=40, suelo=100.0, techo=110.0, pasos=6):
    """Diente de sierra perfecto entre dos precios.

    El precio sube del suelo al techo en `pasos` barras y vuelve a bajar. Los
    swings se repiten en los mismos dos precios, así que el detector encuentra
    exactamente un soporte en `suelo` y una resistencia en `techo`.
    """
    filas, i = [], 0
    for _ in range(ciclos):
        for k in range(pasos):
            c = suelo + (techo - suelo) * (k + 1) / pasos
            filas.append(barra(i, c - 0.4, c + 0.2, c - 0.6, c)); i += 1
        for k in range(pasos):
            c = techo - (techo - suelo) * (k + 1) / pasos
            filas.append(barra(i, c + 0.4, c + 0.6, c - 0.2, c)); i += 1
    return filas


# ── bootstrap ─────────────────────────────────────────────────────────────
def test_bootstrap_sin_muestra_no_inventa_un_cero():
    r = bootstrap_proportion(0, 0)
    assert r["p"] is None and r["lo"] is None and r["hi"] is None
    assert r["n"] == 0


def test_bootstrap_devuelve_la_frecuencia_observada():
    r = bootstrap_proportion(30, 100, iteraciones=500)
    assert r["p"] == 30.0
    assert r["hits"] == 30 and r["n"] == 100
    # La banda contiene la observación y no es de anchura cero.
    assert r["lo"] <= 30.0 <= r["hi"]
    assert r["hi"] > r["lo"]


def test_la_banda_se_estrecha_al_crecer_la_muestra():
    """La propiedad que hace útil el intervalo: más datos, menos duda."""
    poca = bootstrap_proportion(5, 10, iteraciones=800)
    mucha = bootstrap_proportion(500, 1000, iteraciones=800)
    assert (poca["hi"] - poca["lo"]) > (mucha["hi"] - mucha["lo"]) * 3


def test_bootstrap_es_reproducible():
    a = bootstrap_proportion(7, 20, iteraciones=300, semilla=5)
    b = bootstrap_proportion(7, 20, iteraciones=300, semilla=5)
    assert a == b


# ── el primer toque ───────────────────────────────────────────────────────
def test_el_primer_toque_no_cuenta_la_barra_del_montaje():
    """La barra `i` ya tiene su máximo hecho: contarla regala toques."""
    filas = [barra(0, 100, 120, 100, 100),      # esta ya tocó 120
             barra(1, 100, 101, 99, 100),
             barra(2, 100, 101, 99, 100)]
    assert _first_touch(filas, 0, arriba=120, abajo=50, horizonte=2) == "neither"


def test_el_primer_toque_distingue_arriba_de_abajo():
    filas = [barra(0, 100, 101, 99, 100),
             barra(1, 100, 111, 99, 105),       # toca 110
             barra(2, 100, 101, 89, 95)]        # tocaría 90, pero después
    assert _first_touch(filas, 0, arriba=110, abajo=90, horizonte=5) == "resistance"


def test_si_una_barra_toca_los_dos_no_se_elige_a_cara_o_cruz():
    filas = [barra(0, 100, 101, 99, 100),
             barra(1, 100, 111, 89, 100)]       # toca 110 y 90 en la misma vela
    assert _first_touch(filas, 0, arriba=110, abajo=90, horizonte=5) == "neither"


def test_fuera_del_horizonte_no_cuenta():
    filas = [barra(0, 100, 101, 99, 100)] + \
            [barra(i, 100, 101, 99, 100) for i in range(1, 6)] + \
            [barra(6, 100, 115, 99, 112)]
    assert _first_touch(filas, 0, arriba=110, abajo=90, horizonte=3) == "neither"
    assert _first_touch(filas, 0, arriba=110, abajo=90, horizonte=10) == "resistance"


# ── la zona ───────────────────────────────────────────────────────────────
def test_la_zona_reparte_el_pasillo_en_tres():
    assert _zona(109, 110, 100) == "near_resistance"
    assert _zona(101, 110, 100) == "near_support"
    assert _zona(105, 110, 100) == "mid_range"
    assert _zona(105, None, 100) == "unknown"


# ── la medición completa ──────────────────────────────────────────────────
def test_en_un_diente_de_sierra_desde_el_suelo_se_va_al_techo():
    """Serie construida para que la respuesta sea una sola.

    El precio rebota siempre entre los mismos dos precios, así que desde cerca
    del suelo SIEMPRE toca antes la resistencia. Si el motor no lo ve, no está
    midiendo lo que dice medir.
    """
    r = measure_level_odds(sierra(), horizon=12, iterations=200)
    assert r.get("error") is None
    assert r["observations"] > 50, r["observations"]

    zonas = {z["key"]: z for z in r["by_zone"]}
    suelo = zonas.get("near_support")
    assert suelo is not None and suelo["n"] > 10
    # Desde el suelo, la resistencia gana con holgura.
    assert suelo["resistance"]["p"] > suelo["support"]["p"], suelo


def test_las_tres_frecuencias_suman_cien():
    """Si no sumaran 100, algún resultado se estaría cayendo por el camino —
    que es exactamente cómo se infla una probabilidad sin darse cuenta."""
    r = measure_level_odds(sierra(ciclos=30), horizon=6, iterations=200)
    for fila in r["by_zone"]:
        total = fila["resistance"]["p"] + fila["support"]["p"] + fila["neither"]["p"]
        assert abs(total - 100.0) < 0.35, (fila["key"], total)
    g = r["overall"]
    assert abs(g["resistance"]["p"] + g["support"]["p"] + g["neither"]["p"] - 100.0) < 0.35


def test_cada_cifra_viaja_con_su_muestra():
    r = measure_level_odds(sierra(ciclos=25), horizon=8, iterations=150)
    for fila in r["by_zone"]:
        for k in ("resistance", "support", "neither"):
            assert fila[k]["n"] == fila["n"]
            assert fila[k]["lo"] <= fila[k]["p"] <= fila[k]["hi"]


def test_pocas_barras_no_producen_una_probabilidad():
    r = measure_level_odds([barra(i, 100, 101, 99, 100) for i in range(30)])
    assert r["error"] == "insufficient_bars"
    assert r["verdict"] is None and r["overall"] is None


def test_sin_mirar_al_futuro():
    """LA prueba del módulo.

    Se mide sobre las primeras N barras. Luego se añaden barras nuevas que
    crean niveles que antes no existían y se vuelve a medir **sobre el mismo
    tramo** (el horizonte impide que las nuevas entren en el cálculo de las
    viejas). Las observaciones del tramo común tienen que ser IDÉNTICAS.

    Si los niveles se detectaran sobre toda la serie, las barras antiguas
    quedarían etiquetadas con niveles del futuro y esto cambiaría.

    ⚠️ Las barras del futuro tienen que crear niveles DENTRO del pasillo que ya
    existía. La primera versión de esta prueba las ponía en 200, muy por encima
    del rango 100–110, y entonces el vecino más cercano de cada barra antigua
    seguía siendo el mismo: la prueba pasaba igual con la fuga de futuro puesta
    y sin ella. Un nivel nuevo en 103/107 sí cambia quién es el vecino, y es lo
    único que convierte esto en una comprobación.
    """
    base = sierra(ciclos=30)
    extra = base + sierra(ciclos=12, suelo=103.0, techo=107.0)

    obs_a = _observaciones(base, horizonte=8, strength=2, tolerance=0.008, min_touches=2)
    obs_b = _observaciones(extra, horizonte=8, strength=2, tolerance=0.008, min_touches=2)

    # El tramo comparable: montajes cuyo horizonte cabe entero dentro de `base`.
    tope = len(base) - 8 - 1
    a = {o["index"]: (o["resistance"], o["support"], o["zone"], o["outcome"])
         for o in obs_a if o["index"] <= tope}
    b = {o["index"]: (o["resistance"], o["support"], o["zone"], o["outcome"])
         for o in obs_b if o["index"] <= tope}

    assert a, "sin observaciones no se está comprobando nada"
    comunes = set(a) & set(b)
    assert len(comunes) > 20, f"solo {len(comunes)} índices comunes"
    difieren = [i for i in comunes if a[i] != b[i]]
    assert not difieren, f"{len(difieren)} montajes cambian al añadir barras futuras: {difieren[:5]}"


def test_una_mecha_por_debajo_no_es_una_ruptura():
    """Romper es CERRAR por debajo. Contar la mecha que vuelve dentro es la
    forma más rápida de inflar la estadística de rupturas."""
    filas = sierra(ciclos=25)
    obs = _observaciones(filas, horizonte=6, strength=2, tolerance=0.008, min_touches=2)
    rup = _rupturas(filas, obs, horizonte=6, strength=2, tolerance=0.008,
                    min_touches=2, iteraciones=100, semilla=1)
    # En un diente de sierra perfecto el precio nunca cierra bajo el suelo.
    assert rup["n"] == 0
    assert rup["continues_down"]["p"] is None


def escalera_bajista(escalones=6, ciclos=5, alto=120.0, salto=8.0, pasos=5):
    """Rebota en un pasillo, lo pierde por CIERRE, y repite un escalón más abajo.

    Sirve para la pregunta de segundo orden: aquí sí hay rupturas de soporte de
    verdad, y después de cada una el precio se va al siguiente suelo. Sin una
    serie así, `after_break` sale con n=0 y no se comprueba nada de él — que es
    exactamente lo que pasaba antes de que esta función existiera.
    """
    filas, i = [], 0
    for e in range(escalones):
        techo = alto - e * salto
        suelo = techo - salto
        for _ in range(ciclos):
            for k in range(pasos):
                c = suelo + (techo - suelo) * (k + 1) / pasos
                filas.append(barra(i, c - 0.3, c + 0.2, c - 0.5, c)); i += 1
            for k in range(pasos):
                c = techo - (techo - suelo) * (k + 1) / pasos
                filas.append(barra(i, c + 0.3, c + 0.5, c - 0.2, c)); i += 1
        # La ruptura: cierra por DEBAJO del suelo, no lo roza con la mecha.
        roto = suelo - 1.5
        filas.append(barra(i, suelo, suelo + 0.2, roto - 0.5, roto)); i += 1
    return filas


def test_despues_de_romper_el_soporte_hay_muestra_y_suma_cien():
    """La pregunta de segundo orden, medida sobre una serie que sí rompe."""
    filas = escalera_bajista()
    obs = _observaciones(filas, horizonte=8, strength=2, tolerance=0.01, min_touches=2)
    rup = _rupturas(filas, obs, horizonte=8, strength=2, tolerance=0.01,
                    min_touches=2, iteraciones=200, semilla=3)
    assert rup["n"] > 0, "sin rupturas la comprobación no mide nada"
    total = (rup["continues_down"]["p"] + rup["back_to_resistance"]["p"]
             + rup["neither"]["p"])
    assert abs(total - 100.0) < 0.35, (rup["n"], total)
    for k in ("continues_down", "back_to_resistance", "neither"):
        assert rup[k]["n"] == rup["n"]
    # ⚠️ Aserción ESTRUCTURAL, no sobre los porcentajes. Con horizonte 8 esta
    # serie da 10 continuaciones y cero de lo demás, así que anular el cubo de
    # `neither` no cambiaba ni un número y el sabotaje pasaba desapercibido.
    # Que los tres recuentos sumen `n` se rompe en cuanto un cubo se pierde,
    # tenga los casos que tenga.
    assert (rup["continues_down"]["hits"] + rup["back_to_resistance"]["hits"]
            + rup["neither"]["hits"]) == rup["n"]


def test_tras_romper_con_horizonte_corto_el_resultado_es_ninguno():
    """Y con el horizonte corto, `neither` se lleva TODOS los casos.

    Es la otra mitad: si el cubo de «no llegó a ninguno» se cayera, aquí no
    quedaría ningún caso y el reparto no sumaría. Con horizonte 8 esta misma
    serie da 0 en ese cubo, así que sin este caso nadie lo estaba mirando.
    """
    filas = escalera_bajista()
    obs = _observaciones(filas, horizonte=3, strength=2, tolerance=0.01, min_touches=2)
    rup = _rupturas(filas, obs, horizonte=3, strength=2, tolerance=0.01,
                    min_touches=2, iteraciones=200, semilla=3)
    assert rup["n"] > 0
    assert rup["neither"]["hits"] == rup["n"], rup
    assert rup["neither"]["p"] == 100.0
    assert (rup["continues_down"]["hits"] + rup["back_to_resistance"]["hits"]
            + rup["neither"]["hits"]) == rup["n"]


def test_el_veredicto_dice_con_que_criterio_se_eligio():
    r = measure_level_odds(sierra(ciclos=30), horizon=10, iterations=200)
    v = r["verdict"]
    assert v is not None
    assert v["criterion"] in ("zone", "zone+pattern")
    assert v["n"] > 0
    assert v["outcome"] in ("resistance", "support", "neither")
    # `separated` responde a «¿lo dicen los datos o es ruido?»
    assert isinstance(v["separated"], bool)
    suma = sum(v["distribution"][k]["p"] for k in v["distribution"])
    assert abs(suma - 100.0) < 0.35


def test_el_metodo_se_publica():
    """Quien lea la respuesta tiene que poder saber de dónde sale el número."""
    r = measure_level_odds(sierra(ciclos=25), horizon=8, iterations=120)
    assert r["method"] == "historical_frequency+bootstrap"
    assert r["iterations"] == 120
    assert r["horizon"] == 8
    assert r["bars"] > 0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))


def paseo(semilla, n=520, deriva=0.0, vol=0.012):
    rng = random.Random(semilla)
    p, f = 100.0, []
    for i in range(n):
        p *= (1 + deriva + rng.gauss(0, vol))
        o = p * (1 + rng.gauss(0, 0.003)); c = p
        h = max(o, c) * (1 + abs(rng.gauss(0, 0.004)))
        l = min(o, c) * (1 - abs(rng.gauss(0, 0.004)))
        f.append({"date": f"d{i}", "ts": 1577836800 + i * 86400,
                  "open": o, "high": h, "low": l, "close": c, "volume": 1000})
    return f


def test_sobre_un_paseo_aleatorio_la_ventaja_es_pequena():
    """LA validación del nulo.

    Un paseo aleatorio no tiene estructura: no hay niveles que se respeten ni
    memoria. Si el motor le encontrara «ventaja», estaría midiendo un artefacto
    suyo y todo lo que publique sobre un activo real sería ese mismo artefacto
    más ruido.

    Ojo con leer el porcentaje crudo: aquí sale «69 % de irse al soporte» cerca
    del soporte, y es pura geometría. Lo que tiene que salir pequeño es la
    DIFERENCIA contra la serie barajada.
    """
    r = measure_level_odds(paseo(7), horizon=10, iterations=200, null_shuffles=12)
    assert r["null"] is not None, "sin nulo no se está comprobando nada"
    ventajas = [z["edgeSupport"] for z in r["by_zone"] if z.get("edgeSupport") is not None]
    assert ventajas, "ninguna zona trajo ventaja"
    assert max(abs(v) for v in ventajas) < 15, dict(
        (z["key"], (z["support"]["p"], z.get("nullSupport"), z.get("edgeSupport")))
        for z in r["by_zone"])


def test_el_porcentaje_crudo_cerca_del_soporte_es_alto_aunque_no_haya_ventaja():
    """La trampa, escrita como prueba para que no se pierda.

    Si algún día alguien publica `support.p` sin el nulo al lado, esta prueba
    documenta por qué eso sería vender geometría: la cifra cruda es alta en una
    serie que por construcción no tiene nada que ofrecer.
    """
    r = measure_level_odds(paseo(7), horizon=10, iterations=200, null_shuffles=8)
    cerca = next((z for z in r["by_zone"] if z["key"] == "near_support"), None)
    assert cerca is not None
    assert cerca["support"]["p"] > 55, cerca["support"]["p"]
    assert abs(cerca["edgeSupport"]) < 15, cerca


def test_sin_barajados_no_se_publica_una_ventaja_inventada():
    r = measure_level_odds(paseo(9), horizon=10, iterations=150, null_shuffles=0)
    assert r["null"] is None
    for z in r["by_zone"]:
        assert "edgeSupport" not in z, "sin nulo no puede haber ventaja"


def test_con_estructura_real_la_ventaja_es_grande():
    """La otra mitad, y la que impide que el nulo sea un adorno.

    Sin ella, un `_barajar_retornos` que NO barajara —que devolviera la serie
    tal cual— daría ventaja ≈ 0 siempre, y las pruebas del paseo aleatorio
    seguirían en verde porque justo ahí se espera ≈ 0. Aquí la serie rebota
    entre dos precios fijos: es todo estructura, y barajar el orden la destruye
    entera. La ventaja TIENE que ser grande, o el barajado no está barajando.
    """
    r = measure_level_odds(sierra(ciclos=30), horizon=10, iterations=200,
                           null_shuffles=10)
    zonas = {z["key"]: z for z in r["by_zone"]}
    cerca_suelo = zonas.get("near_support")
    assert cerca_suelo is not None and cerca_suelo.get("edgeSupport") is not None
    # Desde el suelo rebota hacia arriba: el soporte se toca MUCHO menos de lo
    # que la serie barajada haría.
    assert cerca_suelo["edgeSupport"] < -15, cerca_suelo
    cerca_techo = zonas.get("near_resistance")
    assert cerca_techo is not None and cerca_techo["edgeSupport"] > 15, cerca_techo
