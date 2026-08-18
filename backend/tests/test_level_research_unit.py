"""El arnés de investigación, contra dos series de respuesta conocida.

Un buscador de patrones se juzga por dos cosas opuestas, y hacen falta las dos:

  · **Sobre ruido puro no puede encontrar nada.** Si encuentra, lo que publique
    sobre un activo real será ese mismo artefacto más ruido. Es la prueba que
    casi nadie hace y la que de verdad separa una herramienta de un horóscopo.
  · **Con una ventaja plantada tiene que encontrarla.** Si no, es ciego, y el
    «no hay nada» de la prueba anterior no significaría nada — un detector
    apagado también pasa el primer examen.

Las dos juntas acotan al arnés por arriba y por abajo. Por separado, cualquiera
de las dos se pasa haciendo trampa.
"""
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from level_research import (  # noqa: E402
    MINIMO_GRUPO,
    _p_dos_proporciones,
    buscar_configuracion,
    evaluar_rasgo,
    holm_bonferroni,
    investigar,
    observar,
)


def barra(i, o, h, l, c, vol=1000):
    return {"date": f"d{i}", "ts": 1577836800 + i * 86400,
            "open": o, "high": h, "low": l, "close": c, "volume": vol}


def ruido(semilla, n=700, vol=0.013):
    """Paseo aleatorio: sin estructura, sin memoria, sin nada que encontrar."""
    rng = random.Random(semilla)
    p, f = 100.0, []
    for i in range(n):
        p *= (1 + rng.gauss(0, vol))
        o = p * (1 + rng.gauss(0, 0.003)); c = p
        h = max(o, c) * (1 + abs(rng.gauss(0, 0.005)))
        l = min(o, c) * (1 - abs(rng.gauss(0, 0.005)))
        f.append(barra(i, o, h, l, c, 1000 + rng.randint(0, 900)))
    return f


def con_ventaja_plantada(semilla, n=2600):
    """Ruido, pero con una regla real y SIMÉTRICA metida dentro.

    La regla: tres velas bajistas seguidas anticipan diez barras de caída, y
    tres alcistas seguidas anticipan diez de subida. Es decir, `three_candle`
    tiene que separar, y hacia lados opuestos: `DDD` → más soporte, `UUU` → más
    resistencia. Cualquier arnés que no lo vea está ciego.

    ⚠️ La simetría no es cosmética. La primera versión sólo empujaba hacia
    abajo, y eso le daba a la serie ENTERA una deriva bajista. Barajar el orden
    conserva la distribución de retornos, así que la serie barajada también caía
    y el nulo subía al 84-89 %: se comía casi toda la ventaja plantada, y los
    diez rasgos «sobrevivían» porque todos correlacionan con esa deriva. El
    arnés no se equivocaba — la serie de prueba tenía un confundidor.

    ⚠️ Y hacen falta muchas barras. Con 700 salían 96 observaciones y el grupo
    `DDD` se quedaba en 15 casos, por debajo del mínimo de 25: el arnés se
    negaba a juzgarlo, y se negaba BIEN.
    """
    rng = random.Random(semilla)
    p, f = 100.0, []
    empuje = 0
    signo = 0
    for i in range(n):
        deriva = signo * 0.010 if empuje > 0 else 0.0
        if empuje > 0:
            empuje -= 1
        p *= (1 + deriva + rng.gauss(0, 0.011))
        o = p * (1 + rng.gauss(0, 0.003)); c = p
        h = max(o, c) * (1 + abs(rng.gauss(0, 0.004)))
        l = min(o, c) * (1 - abs(rng.gauss(0, 0.004)))
        f.append(barra(i, o, h, l, c, 1000 + rng.randint(0, 900)))
        if len(f) >= 4 and empuje == 0:
            tres = f[-3:]
            if all(x["close"] < x["open"] for x in tres):
                empuje, signo = 10, -1
            elif all(x["close"] > x["open"] for x in tres):
                empuje, signo = 10, +1
    return f


# ══════════════════════════════════════════════════════════════════════════
# Estadística de base
# ══════════════════════════════════════════════════════════════════════════
def test_dos_proporciones_iguales_dan_p_alto():
    assert _p_dos_proporciones(50, 100, 50, 100) > 0.9


def test_dos_proporciones_muy_distintas_dan_p_bajo():
    p = _p_dos_proporciones(80, 100, 20, 100)
    assert p is not None and p < 1e-9, p


def test_con_muestra_minuscula_no_se_calcula_p():
    assert _p_dos_proporciones(2, 3, 1, 2) is None


def test_holm_endurece_el_liston_segun_cuantas_pruebas_hubo():
    """Un p de 0,02 pasa solo, y NO pasa habiendo mirado diez rasgos."""
    solo = holm_bonferroni([("a", 0.02)])
    assert solo["a"]["survives"] is True

    diez = holm_bonferroni([("a", 0.02)] + [(f"x{i}", 0.6) for i in range(9)])
    assert diez["a"]["survives"] is False, diez["a"]
    assert diez["a"]["threshold"] == round(0.05 / 10, 5)


def test_holm_deja_pasar_lo_que_de_verdad_es_fuerte():
    r = holm_bonferroni([("fuerte", 1e-6)] + [(f"x{i}", 0.4) for i in range(9)])
    assert r["fuerte"]["survives"] is True


def test_holm_ordena_por_p_no_por_orden_de_entrada():
    """Holm ORDENA antes de aplicar los umbrales.

    Me equivoqué escribiendo esta prueba: esperaba que «c» cayera por venir
    detrás de «b» en la lista. No funciona así — se ordena por p-valor, así que
    la secuencia es a(0,001) → c(0,02) → b(0,9), y «c» pasa con umbral 0,025.
    """
    r = holm_bonferroni([("a", 0.001), ("b", 0.9), ("c", 0.02)])
    assert r["a"]["survives"] is True, r["a"]
    assert r["c"]["survives"] is True, r["c"]
    assert r["b"]["survives"] is False, r["b"]


def test_holm_corta_la_cadena_cuando_uno_falla_de_verdad():
    """Y la propiedad que sí tiene: en cuanto uno no pasa su umbral, los
    siguientes tampoco, aunque el suyo propio lo permitiría."""
    r = holm_bonferroni([("a", 0.001), ("b", 0.03), ("c", 0.04)])
    assert r["a"]["survives"] is True
    # b: umbral 0,05/2 = 0,025 → 0,03 no pasa. Y c queda cortado aunque su
    # umbral suelto (0,05) lo dejaría entrar.
    assert r["b"]["survives"] is False, r["b"]
    assert r["c"]["survives"] is False, r["c"]


# ══════════════════════════════════════════════════════════════════════════
# Las dos series que acotan al arnés
# ══════════════════════════════════════════════════════════════════════════
def test_sobre_ruido_puro_no_sobrevive_ningun_rasgo():
    """LA prueba de que esto no es un buscador de espejismos.

    Nueve rasgos sobre un paseo aleatorio. Alguno saldrá con p bajo por pura
    suerte —es lo esperable mirando nueve— y por eso existe la corrección. Lo
    que NO puede pasar es que sobreviva a Holm.
    """
    r = investigar(ruido(3), iteraciones=120, barajados=8)
    assert r.get("error") is None, r.get("error")
    assert r["observations"] > 100, r["observations"]
    assert r["survivors"] == [], (
        f"encontró ventaja donde no la hay: {r['survivors']} · "
        f"p crudos: {[(e['feature'], e['p']) for e in r['features'][:3]]}")


def test_sobre_ruido_con_otras_semillas_tampoco():
    """Una semilla podría tener suerte. Tres ya no."""
    encontrados = []
    for s in (11, 23, 47):
        r = investigar(ruido(s), iteraciones=100, barajados=6)
        if r.get("survivors"):
            encontrados.append((s, r["survivors"]))
    assert not encontrados, encontrados


def test_con_una_ventaja_plantada_la_encuentra():
    """Y la otra mitad: el arnés no está simplemente apagado.

    La serie lleva dentro una regla real —tres velas bajistas seguidas
    anticipan diez barras de caída— así que `three_candle` tiene que aparecer
    entre los supervivientes. Si no, todo el «no hay nada» de la prueba
    anterior no significaría nada.
    """
    r = investigar(con_ventaja_plantada(5), iteraciones=200, barajados=8)
    assert r.get("error") is None
    assert r["survivors"], (
        "no encontró la ventaja plantada: el arnés está ciego · "
        f"{[(e['feature'], e['p']) for e in r['features'][:4]]}")
    assert "three_candle" in r["survivors"], (
        f"encontró algo pero no el rasgo plantado: {r['survivors']}")


def test_la_ventaja_plantada_apunta_al_valor_correcto():
    """No basta con que el RASGO salga: el valor que separa tiene que ser el
    de tres velas bajistas, no otro cualquiera del mismo rasgo."""
    r = investigar(con_ventaja_plantada(5), iteraciones=200, barajados=8)
    tres = next(e for e in r["features"] if e["feature"] == "three_candle")
    por_valor = {g["value"]: g for g in tres["groups"]}
    assert "DDD" in por_valor and "UUU" in por_valor, list(por_valor)
    # La regla es simétrica, así que las ventajas tienen que ir a lados
    # OPUESTOS: tres bajistas → más soporte, tres alcistas → menos.
    # Exigir sólo que «alguna separe» dejaría pasar un arnés que confunde el
    # signo, que es peor que uno que no encuentra nada.
    assert por_valor["DDD"]["edge"] > 0, por_valor["DDD"]
    assert por_valor["UUU"]["edge"] < 0, por_valor["UUU"]
    assert por_valor["DDD"]["edge"] - por_valor["UUU"]["edge"] > 20, (
        por_valor["DDD"], por_valor["UUU"])


# ══════════════════════════════════════════════════════════════════════════
# Los grupos pequeños no se juzgan
# ══════════════════════════════════════════════════════════════════════════
def test_los_grupos_por_debajo_del_minimo_no_entran():
    obs = observar(ruido(9, 400), horizonte=10)
    ev = evaluar_rasgo(obs, "three_candle", iteraciones=50)
    for g in ev["groups"]:
        assert g["n"] >= MINIMO_GRUPO, g


def test_cada_grupo_publica_su_muestra_y_su_intervalo():
    obs = observar(ruido(9, 400), horizonte=10)
    ev = evaluar_rasgo(obs, "zone", iteraciones=80)
    for g in ev["groups"]:
        f = g["freq"]
        assert f["n"] == g["n"]
        assert f["lo"] <= f["p"] <= f["hi"]


# ══════════════════════════════════════════════════════════════════════════
# La búsqueda de configuración no se engaña a sí misma
# ══════════════════════════════════════════════════════════════════════════
def test_la_busqueda_dice_cuantas_veces_tiro_la_moneda():
    r = buscar_configuracion(ruido(13, 800), horizontes=(5, 10),
                             fuerzas=(2,), tolerancias=(0.008, 0.012))
    assert r.get("error") is None, r.get("error")
    assert r["trials"] == 4, r["trials"]
    assert r["out_of_sample_bars"] > 100


def test_sobre_ruido_lo_elegido_dentro_NO_aguanta_fuera():
    """El resultado que importa de toda la búsqueda.

    Sobre ruido, alguna de las combinaciones saldrá bien dentro de muestra —con
    suficientes intentos siempre sale alguna—. Lo que no puede es aguantar en
    la mitad que no participó en elegirla. Si aguantara, la partición no estaría
    protegiendo de nada.
    """
    r = buscar_configuracion(ruido(29, 900), horizontes=(5, 10, 20),
                             fuerzas=(2,), tolerancias=(0.008,))
    assert r.get("error") is None
    assert r["holds_out_of_sample"] is False, (
        f"un ruido «aguanta» fuera de muestra: {r['chosen']} → "
        f"{r['out_of_sample']}")


def test_con_pocas_barras_la_busqueda_se_niega_en_vez_de_inventar():
    r = buscar_configuracion(ruido(31, 200))
    assert r.get("error") == "insufficient_bars_for_split"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
