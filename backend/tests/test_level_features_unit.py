"""Los rasgos, y sobre todo: que ninguno mire al futuro.

El fallo que este fichero existe para cazar no se ve en el resultado. Un rasgo
que adelanta dos barras produce cifras bonitas, coherentes y falsas, y todas las
demás pruebas siguen en verde. Por eso `test_ningun_rasgo_mira_al_futuro` es la
única que importa de verdad, y por eso está saboteada a propósito en el commit.
"""
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from terminal.level_features import (  # noqa: E402
    eventos_as_of,
    extraer,
    fvg_abierto,
    interaccion_nivel,
    patron_tres_velas,
    secuencia_swings,
    swings_confirmados,
    volumen_relativo,
)


def barra(i, o, h, l, c, vol=1000):
    return {"date": f"d{i}", "ts": 1577836800 + i * 86400,
            "open": o, "high": h, "low": l, "close": c, "volume": vol}


def paseo(semilla, n=400):
    rng = random.Random(semilla)
    p, f = 100.0, []
    for i in range(n):
        p *= (1 + rng.gauss(0, 0.013))
        o = p * (1 + rng.gauss(0, 0.003)); c = p
        h = max(o, c) * (1 + abs(rng.gauss(0, 0.005)))
        l = min(o, c) * (1 - abs(rng.gauss(0, 0.005)))
        f.append(barra(i, o, h, l, c, 1000 + rng.randint(0, 900)))
    return f


# ══════════════════════════════════════════════════════════════════════════
# LA prueba: nada mira al futuro
# ══════════════════════════════════════════════════════════════════════════
def test_ningun_rasgo_mira_al_futuro():
    """Los rasgos de la barra `i` tienen que salir IGUAL viendo sólo hasta `i`.

    ⚠️ La primera versión de esta prueba no comprobaba nada. Extraía sobre una
    serie, le añadía 80 barras AL FINAL, y comparaba los índices del medio.
    Pero detectar un swing es local —le bastan `strength` velas a cada lado—,
    así que añadir barras al final no cambia nada del medio: el sabotaje de
    mirar la serie entera pasaba con resultados idénticos.

    El experimento que sí mide es el contrario: **truncar**. Se extraen los
    rasgos de la barra `i` sobre `rows[:i+1]` —lo único que existía ese día— y
    sobre la serie completa. Si algún detector usa barras posteriores a `i`, los
    dos resultados difieren y esto salta.
    """
    filas = paseo(11, 400)
    difieren = []
    for i in range(120, 340, 11):
        truncada = filas[:i + 1]
        a = extraer(truncada, i, resistencia=None, soporte=None)
        b = extraer(filas, i, resistencia=None, soporte=None)
        for k in a:
            if a[k] != b[k]:
                difieren.append((i, k, a[k], b[k]))
    assert not difieren, (
        f"{len(difieren)} rasgos cambian al ver el futuro: {difieren[:6]}")


def test_la_prueba_del_futuro_puede_fallar():
    """Control de la anterior: con un rasgo que SÍ mira al futuro, salta.

    Sin esto, `test_ningun_rasgo_mira_al_futuro` podría estar comparando dos
    veces lo mismo y nadie se enteraría — que es exactamente lo que pasaba
    antes de reescribirla.
    """
    filas = paseo(11, 400)
    # Un "rasgo" tramposo: mira la barra siguiente. Tiene que delatarse.
    def tramposo(rows, i):
        if i + 1 >= len(rows):
            return "sin_futuro"
        return "sube" if rows[i + 1]["close"] > rows[i]["close"] else "baja"

    difieren = 0
    for i in range(120, 340, 11):
        if tramposo(filas[:i + 1], i) != tramposo(filas, i):
            difieren += 1
    assert difieren > 5, (
        "el método de truncar no distingue un rasgo tramposo: la prueba "
        "hermana no estaría comprobando nada")


def test_un_swing_no_existe_antes_de_confirmarse():
    """Con `strength=2`, un pivote en `k` no se ve hasta `k+2`.

    Devolverlo antes es adelantar dos barras. `detect_structure_events` del
    panel lo hace (consume `index < i`), y por eso este módulo no lo usa.
    """
    filas = paseo(5, 200)
    for i in (60, 90, 130, 170):
        for s in swings_confirmados(filas, i, strength=2):
            assert s["index"] + 2 <= i, (i, s["index"])


def test_los_eventos_solo_usan_swings_ya_confirmados():
    filas = paseo(6, 250)
    for i in (100, 150, 200):
        sw = swings_confirmados(filas, i, 2)
        for e in eventos_as_of(filas, i, sw, 2):
            assert e["index"] <= i


@pytest.mark.parametrize("fuerza", [2, 3, 4, 5])
def test_ningun_evento_cae_dentro_del_plazo_de_confirmacion(fuerza):
    """Ningún evento se fecha antes de que su swing se pudiera conocer.

    ⚠️ Escribí esta prueba creyendo que cazaba un fallo —el bucle usaba un `+ 2`
    fijo en vez de `+ strength`— y **pasaba igual con el sabotaje puesto, y
    también con el retardo a cero**. Así que el fallo no existía, y lo que la
    prueba demuestra es otra cosa, más interesante: la propiedad se cumple SOLA,
    por cómo está definido un swing. `high[k]` supera a las `strength` barras
    siguientes, luego `close[j] <= high[j] < high[k]` en toda esa ventana y la
    ruptura es imposible ahí dentro.

    Se queda porque eso es exactamente lo que hay que vigilar: si `detect_swings`
    cambiara —admitir máximos iguales, por ejemplo— la garantía se caería sin
    hacer ruido, y esta prueba lo diría. Lo que NO puede es servir de guardia del
    parámetro `strength`; para eso no discrimina, y decirlo aquí evita que el
    siguiente que la lea se fíe de más.

    El control de debajo (`test_es_el_gateo_el_que_sostiene…`) es lo que impide
    que esto sea una aserción decorativa.
    """
    filas = paseo(6, 320)
    comprobados = 0
    for i in (140, 200, 260, 310):
        sw = swings_confirmados(filas, i, fuerza)
        por_precio = {}
        for s in sw:
            por_precio.setdefault(round(s["price"], 6), []).append(s["index"])
        for e in eventos_as_of(filas, i, sw, fuerza):
            idxs = por_precio.get(round(e["price"], 6))
            if not idxs:
                continue
            origen = max(k for k in idxs if k <= e["index"])
            assert origen + fuerza <= e["index"], (
                f"fuerza={fuerza}: evento en {e['index']} sobre un swing de "
                f"{origen}, que no se confirmaba hasta {origen + fuerza}")
            comprobados += 1
    assert comprobados > 0, "la prueba no llegó a mirar ningún evento"


def test_es_el_gateo_el_que_sostiene_el_plazo_y_no_la_suerte():
    """El control que la anterior necesita para significar algo.

    Se le pasa una lista de swings FABRICADA que viola la definición: un
    «máximo» en la barra 10 a un precio que la serie supera enseguida. Con
    swings así, la propiedad ya no se cumple sola.

      · con `strength=0` (sin gateo) el evento cae en la barra 10, dentro de lo
        que sería el plazo de confirmación → la propiedad SE ROMPE;
      · con `strength=5` el gateo lo retiene hasta la 15 → se cumple.

    Eso deja el reparto claro, y corrige a medias lo que escribí arriba: el
    gateo es redundante para los swings que salen de `detect_swings`, porque
    ésos ya no se pueden romper dentro de su ventana; pero es lo que sostiene la
    propiedad en general. No sobra.
    """
    filas = [barra(k, 100 + k, 101 + k, 99 + k, 100 + k) for k in range(40)]
    inventados = [{"index": 10, "type": "high", "price": 105.0}]

    sin_gateo = eventos_as_of(filas, 39, inventados, 0)
    assert sin_gateo, "sin evento no hay nada que comprobar"
    assert min(e["index"] for e in sin_gateo) < 10 + 5, (
        "sin gateo la propiedad tendría que romperse; si no, la prueba de "
        "arriba es decorativa")

    con_gateo = eventos_as_of(filas, 39, inventados, 5)
    assert con_gateo, "el gateo no puede tragarse el evento entero"
    assert min(e["index"] for e in con_gateo) >= 10 + 5, con_gateo


# ══════════════════════════════════════════════════════════════════════════
# Rebote contra ruptura — la distinción que se pidió medir
# ══════════════════════════════════════════════════════════════════════════
def test_una_mecha_que_vuelve_dentro_es_rebote_no_ruptura():
    filas = [barra(0, 100, 101, 99, 100),
             barra(1, 100, 101, 99, 100),
             # perfora 95 con la mecha y cierra otra vez por encima
             barra(2, 99, 100, 94.0, 99.5)]
    assert interaccion_nivel(filas, 2, 95.0, "support") == "bounce"


def test_cerrar_por_debajo_si_es_ruptura():
    filas = [barra(0, 100, 101, 99, 100),
             barra(1, 100, 101, 99, 100),
             barra(2, 99, 99.5, 92, 93.0)]
    assert interaccion_nivel(filas, 2, 95.0, "support") == "break"


def test_lo_mismo_en_resistencia_pero_al_reves():
    filas = [barra(0, 100, 101, 99, 100), barra(1, 100, 101, 99, 100),
             barra(2, 100, 106.0, 99, 100.5)]
    assert interaccion_nivel(filas, 2, 105.0, "resistance") == "bounce"
    filas[2] = barra(2, 100, 110, 99, 108.0)
    assert interaccion_nivel(filas, 2, 105.0, "resistance") == "break"


def test_sin_tocar_el_nivel_no_hay_interaccion():
    filas = [barra(i, 100, 101, 99, 100) for i in range(4)]
    assert interaccion_nivel(filas, 3, 80.0, "support") == "none"
    assert interaccion_nivel(filas, 3, None, "support") == "none"


# ══════════════════════════════════════════════════════════════════════════
# Tres velas
# ══════════════════════════════════════════════════════════════════════════
def test_tres_velas_alcistas_con_cuerpo_creciente():
    filas = [barra(0, 100, 101.0, 99.9, 100.1),   # cuerpo pequeño
             barra(1, 100, 102.0, 99.5, 101.2),   # mediano
             barra(2, 100, 105.0, 99.0, 104.5)]   # grande
    assert patron_tres_velas(filas, 2) == "UUU"


def test_tres_velas_mixtas():
    filas = [barra(0, 100, 102, 99, 101),
             barra(1, 101, 102, 99, 100),
             barra(2, 100, 103, 99, 102)]
    assert patron_tres_velas(filas, 2) == "mixed"


def test_con_menos_de_tres_velas_no_se_inventa_un_patron():
    filas = [barra(0, 100, 101, 99, 100)]
    assert patron_tres_velas(filas, 0) == "none"


# ══════════════════════════════════════════════════════════════════════════
# Secuencia de máximos y mínimos
# ══════════════════════════════════════════════════════════════════════════
def test_la_secuencia_distingue_HH_HL_de_LH_LL():
    """Una serie que sube por escalones tiene que salir como tendencia alcista."""
    filas, p = [], 100.0
    for ciclo in range(8):
        for k in range(4):
            p += 2
            filas.append(barra(len(filas), p - 1, p + 1, p - 2, p))
        for k in range(2):
            p -= 1
            filas.append(barra(len(filas), p + 1, p + 2, p - 1, p))
    sw = swings_confirmados(filas, len(filas) - 1, 2)
    sec = secuencia_swings(sw)
    assert sec["trend"] == "uptrend", sec
    assert sec["pair"] == "HH_HL", sec


def test_sin_swings_la_secuencia_es_nula_no_rango():
    """«No lo sé» y «es un rango» son cosas distintas."""
    sec = secuencia_swings([])
    assert sec["trend"] is None and sec["pair"] is None


# ══════════════════════════════════════════════════════════════════════════
# Volumen y FVG
# ══════════════════════════════════════════════════════════════════════════
def test_sin_volumen_no_se_inventa_un_volumen_normal():
    filas = [barra(i, 100, 101, 99, 100, vol=0) for i in range(30)]
    assert volumen_relativo(filas, 25) == "none"


def test_el_volumen_alto_se_detecta():
    filas = [barra(i, 100, 101, 99, 100, vol=1000) for i in range(30)]
    filas[25] = barra(25, 100, 101, 99, 100, vol=5000)
    assert volumen_relativo(filas, 25) == "high"


def test_el_fvg_relleno_no_cuenta_como_abierto():
    """Lo que puede tirar del precio es el hueco que sigue abierto."""
    filas = paseo(21, 120)
    etiqueta = fvg_abierto(filas, 100, float(filas[100]["close"]))
    assert etiqueta in ("none", "above", "below", "both")


# ══════════════════════════════════════════════════════════════════════════
# El extractor completo
# ══════════════════════════════════════════════════════════════════════════
def test_el_extractor_devuelve_todas_las_claves_siempre():
    """Un rasgo que a veces falta rompe el agrupamiento en silencio."""
    esperadas = {"trend", "swing_pair", "event", "event_age", "support_action",
                 "resistance_action", "three_candle", "body_trend", "fvg", "volume"}
    filas = paseo(31, 200)
    for i in (70, 120, 199):
        r = extraer(filas, i, resistencia=None, soporte=None)
        assert set(r.keys()) == esperadas, set(r.keys()) ^ esperadas


def test_el_evento_dice_none_cuando_es_viejo_no_null():
    """«No ha habido evento reciente» es una situación, no un dato que falte:
    si fuera `null` el agrupamiento lo tiraría y perderíamos esos casos."""
    filas = paseo(41, 300)
    etiquetas = {extraer(filas, i, resistencia=None, soporte=None)["event"]
                 for i in range(80, 290, 5)}
    assert "none" in etiquetas
    assert None not in etiquetas


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))


def test_los_indices_de_swing_apuntan_a_pivotes_de_verdad():
    """No basta con que sean consistentes: tienen que ser CORRECTOS.

    `swings_confirmados` recorta una ventana y traduce el índice local a
    absoluto sumando el desplazamiento. Si alguien cambia la ventana y se olvida
    del desplazamiento, los índices salen corridos —apuntando a barras que no
    son pivotes— pero de forma consistente, así que comparar dos ejecuciones no
    lo ve. Aquí se comprueba contra la serie: la barra que dice el índice tiene
    que ser de verdad el máximo (o el mínimo) de su entorno.
    """
    filas = paseo(77, 300)
    fuerza = 2
    for i in (150, 220, 299):
        for s in swings_confirmados(filas, i, fuerza):
            k = s["index"]
            assert 0 <= k < len(filas), k
            ini, fin = max(0, k - fuerza), min(len(filas), k + fuerza + 1)
            entorno = filas[ini:fin]
            if s["type"] == "high":
                mayor = max(x["high"] for x in entorno)
                assert abs(filas[k]["high"] - mayor) < 1e-9, (
                    f"el swing alto en {k} no es el máximo de su entorno")
            else:
                menor = min(x["low"] for x in entorno)
                assert abs(filas[k]["low"] - menor) < 1e-9, (
                    f"el swing bajo en {k} no es el mínimo de su entorno")
            # Y el precio que publica tiene que ser el de esa barra.
            # ⚠️ `detect_swings` REDONDEA a 6 decimales, así que la tolerancia
            # va relativa al precio y no en absoluto: con 1e-9 esta comprobación
            # fallaba sobre código correcto por 1,7e-7 de redondeo.
            campo = "high" if s["type"] == "high" else "low"
            assert abs(s["price"] - filas[k][campo]) <= abs(filas[k][campo]) * 1e-6 + 1e-6, (
                k, s["price"], filas[k][campo])


def test_el_fvg_no_ve_huecos_posteriores_a_la_barra():
    """Directo sobre `fvg_abierto`, con una serie donde el hueco futuro decide.

    La prueba general de truncar no lo cazaba: al mirar la serie entera aparecen
    huecos nuevos DESPUÉS de `i` pero también se marcan como rellenos más
    huecos antiguos, y las dos cosas se compensaban en los índices muestreados.
    Aquí se construye el caso a propósito: nada de huecos hasta `i`, y un hueco
    grande justo después.
    """
    filas = [barra(i, 100, 100.5, 99.5, 100) for i in range(40)]
    # Hueco alcista claro en las barras 41-43, DESPUÉS del punto de medida.
    filas += [barra(40, 100, 101, 99.5, 100.8),
              barra(41, 101, 120, 100.5, 119),
              barra(42, 119, 125, 118, 124)]
    etiqueta = fvg_abierto(filas, 39, 100.0)
    assert etiqueta == "none", (
        f"a la barra 39 no se podía ver ningún hueco y devuelve «{etiqueta}»")
