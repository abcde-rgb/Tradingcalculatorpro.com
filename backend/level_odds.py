"""¿A dónde ha ido el precio DESPUÉS de estar donde está ahora?

Este módulo no predice. Cuenta. Recorre el histórico del propio activo, busca
cada vez que se dio el mismo montaje que hay ahora —dónde estaba el precio
respecto a su soporte y su resistencia, qué patrón de vela acababa de cerrar,
qué carácter tenía la estructura— y apunta **qué pasó después**: si tocó antes
la resistencia de arriba, el soporte de abajo, o ninguno de los dos dentro del
horizonte. La probabilidad que se publica es esa frecuencia observada, con su
muestra y su banda de incertidumbre.

Por qué así y no con una simulación
-----------------------------------
Simular mil trayectorias de un modelo ajustado (volatilidad, deriva) da un
número siempre, en cualquier sitio y sin datos. Pero ese número describe **el
modelo**, no el mercado: si el modelo se equivoca, la probabilidad es falsa y
parece igual de firme. Aquí las mil iteraciones son un *bootstrap* sobre las
observaciones REALES —se remuestrean los resultados observados para saber
cuánto podría moverse la frecuencia si el histórico hubiera salido algo
distinto—, no trayectorias inventadas.

Las cuatro trampas que harían mentir a esto
-------------------------------------------
1. **Mirar el futuro.** Si los niveles se detectan sobre TODO el histórico y
   luego se usan para etiquetar un montaje de hace dos años, se está usando
   información que aquel día no existía, y la probabilidad sale inflada. Aquí
   los niveles de la barra `i` se calculan **sólo con `rows[:i+1]`**
   (`_levels_as_of`). Es lo que hace el módulo lento y lo que lo hace cierto.

2. **Tirar los casos en los que no pasó nada.** Si el precio no llega ni a la
   resistencia ni al soporte dentro del horizonte y ese caso se descarta, las
   dos probabilidades que quedan se reparten el 100 % y las dos suben. `neither`
   es un resultado con la misma dignidad que los otros dos y se cuenta.

3. **Contar el toque de la barra de entrada.** El resultado se mide sobre
   `rows[i+1:]`, nunca sobre la propia barra del montaje: su máximo y su mínimo
   ya están puestos cuando se decide entrar.

4. **Publicar una frecuencia sin su muestra.** 4 de 7 es 57 % y no distingue
   40 % de 70 %. Cada cifra sale acompañada de `n` y del intervalo del
   bootstrap; quien lea sólo el 57 % está leyendo mal, y por eso el intervalo
   viaja pegado al número y no en una nota al pie.

Módulo PURO: sin red, sin BD, sin estado. Las barras se las da quien llame.
"""
from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Sequence, Tuple

from candle_patterns import detect_all_patterns
from price_action import _avg_true_range, detect_sr_levels, detect_swings, label_structure

Row = Dict[str, Any]

# Barras hacia atrás con las que se reconstruyen los niveles de cada momento.
# Un nivel de hace cinco años no está en la pantalla de nadie: la ventana acota
# el coste y además se parece más a lo que el operador miraba aquel día.
VENTANA_NIVELES = 250

# Barras mínimas antes de empezar a medir. Sin esto los primeros montajes se
# etiquetan con dos swings mal contados y ensucian la muestra entera.
CALENTAMIENTO = 60

ITERACIONES_BOOTSTRAP = 1000


# ══════════════════════════════════════════════════════════════════════════
# Bootstrap
# ══════════════════════════════════════════════════════════════════════════
def bootstrap_proportion(exitos: int, total: int,
                         iteraciones: int = ITERACIONES_BOOTSTRAP,
                         semilla: int = 20260818,
                         alfa: float = 0.05) -> Dict[str, Optional[float]]:
    """Frecuencia observada y su banda, remuestreando los resultados observados.

    Se remuestrea con reemplazo la muestra real `iteraciones` veces y se toman
    los percentiles. Con `total` pequeño la banda sale ancha **y eso es la
    respuesta**: significa que el histórico no da para afinar más.

    Devuelve `p=None` con `total=0`: sin observaciones no hay frecuencia, y un
    0 % ahí sería una afirmación que nadie ha medido.
    """
    if total <= 0:
        return {"p": None, "lo": None, "hi": None, "n": 0, "hits": 0,
                "iterations": 0}

    p = exitos / total
    rng = random.Random(semilla)
    # La muestra es `total` ceros y unos; remuestrearla equivale a sortear
    # `total` binomiales de probabilidad `p`. Se hace así por coste: con 250
    # montajes y 1000 iteraciones, construir la lista cada vez es tirar 250.000
    # elementos a la basura por nada.
    muestras = []
    for _ in range(iteraciones):
        golpes = sum(1 for _ in range(total) if rng.random() < p)
        muestras.append(golpes / total)
    muestras.sort()

    def pct(q: float) -> float:
        idx = min(len(muestras) - 1, max(0, int(round(q * (len(muestras) - 1)))))
        return muestras[idx]

    return {
        "p": round(p * 100, 1),
        "lo": round(pct(alfa / 2) * 100, 1),
        "hi": round(pct(1 - alfa / 2) * 100, 1),
        "n": total,
        "hits": exitos,
        "iterations": iteraciones,
    }


# ══════════════════════════════════════════════════════════════════════════
# El montaje de cada barra, sin mirar al futuro
# ══════════════════════════════════════════════════════════════════════════
def _levels_as_of(rows: Sequence[Row], i: int, strength: int,
                  tolerance: float, min_touches: int) -> List[Dict[str, Any]]:
    """Soportes y resistencias tal y como se veían AL CIERRE de la barra `i`.

    Sólo `rows[:i+1]`. Es la línea que separa medir de inventar.
    """
    desde = max(0, i + 1 - VENTANA_NIVELES)
    ventana = list(rows[desde:i + 1])
    if len(ventana) < 20:
        return []
    swings = detect_swings(ventana, strength)
    if not swings:
        return []
    precio = ventana[-1].get("close")
    return detect_sr_levels(swings, tolerance, min_touches, precio)


def _vecinos(levels: Sequence[Dict[str, Any]], precio: float
             ) -> Tuple[Optional[float], Optional[float]]:
    """La resistencia inmediatamente por encima y el soporte inmediatamente
    por debajo. `None` cuando de ese lado no hay nada: el montaje entonces no
    tiene las dos puertas y no entra en la medición de «cuál toca antes»."""
    arriba = [l["price"] for l in levels if l.get("price") is not None and l["price"] > precio]
    abajo = [l["price"] for l in levels if l.get("price") is not None and l["price"] < precio]
    return (min(arriba) if arriba else None, max(abajo) if abajo else None)


def _baseline_support(precio: float, arriba: float, abajo: float) -> Optional[float]:
    """Probabilidad de tocar ANTES el soporte por pura distancia, sin ventaja.

    En un paseo sin deriva entre dos barreras, la probabilidad de alcanzar
    primero la de abajo es la distancia relativa a la de ARRIBA — la ruina del
    jugador de toda la vida. Comprobado contra simulación: a 91 entre 90 y 100
    da 0,900 teórico y 0,890 simulado.

    ⚠️ Esto es lo que separa una herramienta de un horóscopo. Sobre un paseo
    aleatorio PURO, sin estructura ninguna, este motor mide «69 % de irse al
    soporte» cuando el precio está pegado al soporte. Suena a ventaja enorme y
    es una tautología: está cerca, lo toca antes. Publicar esa cifra sola
    vendería geometría como información.

    Lo que sí dice algo es la DIFERENCIA entre lo observado y esta línea base.
    Si el activo se va al soporte el 69 % de las veces y la distancia ya
    explicaba un 71 %, no hay ventaja: hay ruido. Y si se va el 85 %, entonces
    sí ha pasado algo que la geometría no explica.
    """
    ancho = arriba - abajo
    if ancho <= 0:
        return None
    return max(0.0, min(1.0, (arriba - precio) / ancho))


def _first_touch(rows: Sequence[Row], i: int, arriba: Optional[float],
                 abajo: Optional[float], horizonte: int) -> str:
    """Qué se tocó ANTES en las `horizonte` barras siguientes a `i`.

    Devuelve 'resistance', 'support' o 'neither'.

    ⚠️ Se empieza en `i+1`. La barra del montaje ya tiene su máximo y su mínimo
    hechos cuando se decide, y contarla regalaría toques que nadie pudo operar.

    Si dentro de la MISMA barra se tocan los dos, no se puede saber cuál fue
    primero sin datos de menor plazo: se devuelve 'neither' en vez de elegir uno
    a cara o cruz. Es el caso menos frecuente y el más fácil de falsear.
    """
    fin = min(len(rows), i + 1 + horizonte)
    for j in range(i + 1, fin):
        alto = rows[j].get("high")
        bajo = rows[j].get("low")
        if alto is None or bajo is None:
            continue
        toca_arriba = arriba is not None and alto >= arriba
        toca_abajo = abajo is not None and bajo <= abajo
        if toca_arriba and toca_abajo:
            return "neither"
        if toca_arriba:
            return "resistance"
        if toca_abajo:
            return "support"
    return "neither"


def _pattern_at(rows: Sequence[Row], i: int,
                cache: Dict[int, List[Dict[str, Any]]]) -> Optional[str]:
    """El patrón de vela que cerró EN la barra `i`, si hubo alguno.

    `detect_all_patterns` recorre toda la serie, así que se le pasa una sola vez
    la serie completa y se indexa: llamarlo por barra multiplicaría el coste por
    el número de barras sin cambiar el resultado. Los patrones de una barra sólo
    miran hacia atrás, así que esto NO filtra futuro.
    """
    return (cache.get(i) or [{}])[0].get("pattern_id") if cache.get(i) else None


def _indexar_patrones(rows: Sequence[Row]) -> Dict[int, List[Dict[str, Any]]]:
    """`{índice de barra: [patrones que cierran ahí]}`."""
    fuera: Dict[int, List[Dict[str, Any]]] = {}
    try:
        for p in detect_all_patterns(list(rows)):
            idx = p.get("index")
            if idx is None:
                continue
            fuera.setdefault(int(idx), []).append(p)
    except Exception:  # noqa: BLE001 — un detector que falle no debe tumbar la medición
        return {}
    return fuera


def _zona(precio: float, arriba: Optional[float], abajo: Optional[float]) -> str:
    """En qué tercio del pasillo está el precio: pegado al techo, al suelo o en medio.

    Es lo que de verdad cambia el reparto: contra la resistencia no se comporta
    igual que en mitad del rango, y promediar los tres estados esconde justo eso.
    """
    if arriba is None or abajo is None or arriba <= abajo:
        return "unknown"
    pos = (precio - abajo) / (arriba - abajo)
    if pos >= 0.70:
        return "near_resistance"
    if pos <= 0.30:
        return "near_support"
    return "mid_range"


# ══════════════════════════════════════════════════════════════════════════
# La medición
# ══════════════════════════════════════════════════════════════════════════
def _observaciones(rows: Sequence[Row], *, horizonte: int, strength: int,
                   tolerance: float, min_touches: int,
                   calentamiento: int = CALENTAMIENTO) -> List[Dict[str, Any]]:
    """Recorre el histórico y devuelve un registro por barra medible.

    Cada registro es «así estaba el montaje» + «esto pasó después». Nada más.
    Agregar es cosa de quien llama: mezclar medir con resumir es lo que hace
    imposible comprobar una cifra después.
    """
    patrones = _indexar_patrones(rows)
    fuera: List[Dict[str, Any]] = []

    # La última barra medible es la que deja horizonte completo por delante: si
    # se midieran también las del final, sus resultados saldrían recortados y
    # 'neither' se llevaría casos que sí habrían tocado con una barra más.
    ultima = len(rows) - horizonte - 1

    for i in range(calentamiento, max(calentamiento, ultima + 1)):
        precio = rows[i].get("close")
        if precio is None:
            continue
        niveles = _levels_as_of(rows, i, strength, tolerance, min_touches)
        if not niveles:
            continue
        arriba, abajo = _vecinos(niveles, float(precio))
        # Sin las dos puertas la pregunta «cuál toca antes» no tiene sentido.
        if arriba is None or abajo is None:
            continue

        swings = detect_swings(list(rows[max(0, i + 1 - VENTANA_NIVELES):i + 1]), strength)
        caracter = label_structure(swings).get("trend") if swings else None

        fuera.append({
            "index": i,
            "date": rows[i].get("date"),
            "close": float(precio),
            "resistance": arriba,
            "support": abajo,
            "zone": _zona(float(precio), arriba, abajo),
            "pattern": _pattern_at(rows, i, patrones),
            "trend": caracter,
            "baseline_support": _baseline_support(float(precio), arriba, abajo),
            "outcome": _first_touch(rows, i, arriba, abajo, horizonte),
        })
    return fuera


def _barajar_retornos(rows: Sequence[Row], rng: random.Random) -> List[Row]:
    """Misma distribución de retornos, orden destruido.

    Conserva la forma de cada vela (mechas relativas al cierre) y baraja sólo el
    ORDEN de los movimientos. Sobrevive la volatilidad y la mecha típica; se
    destruye toda la estructura: tendencia, niveles respetados, memoria. Justo
    lo que este motor dice medir.
    """
    cierres = [r.get("close") for r in rows if r.get("close")]
    if len(cierres) < 3:
        return list(rows)
    retornos = [cierres[i] / cierres[i - 1] for i in range(1, len(cierres))]
    rng.shuffle(retornos)
    formas = []
    for r in rows:
        c = r.get("close") or 1.0
        formas.append(((r.get("open") or c) / c, (r.get("high") or c) / c,
                       (r.get("low") or c) / c))
    fuera, p = [], cierres[0]
    for i, ret in enumerate(retornos):
        p *= ret
        j = min(i + 1, len(rows) - 1)
        fo, fh, fl = formas[j]
        fuera.append({"date": rows[j].get("date"), "ts": rows[j].get("ts"),
                      "open": p * fo, "high": p * fh, "low": p * fl, "close": p,
                      "volume": rows[j].get("volume", 0)})
    return fuera


def _nulo_por_barajado(rows: Sequence[Row], *, horizonte: int, strength: int,
                       tolerance: float, min_touches: int, vueltas: int,
                       semilla: int) -> Optional[Dict[str, Any]]:
    """La linea base MEDIDA, no supuesta.

    Se baraja el orden de los retornos y se vuelve a medir con la MISMA tuberia:
    mismos niveles redetectados, mismo horizonte finito, mismo reparto por zona.
    Todo lo que sea geometria, tamano del horizonte o artefacto del detector
    aparece igual en la serie barajada; lo unico que no sobrevive al barajado es
    la estructura real. La diferencia entre lo observado y esto es lo que de
    verdad aporta el activo.

    Sustituye a una formula analitica que probe antes (ruina del jugador): daba
    -14 puntos de "ventaja" sobre un paseo aleatorio PURO, porque supone
    barreras fijas y horizonte infinito y aqui no se cumple ninguna de las dos.
    """
    if vueltas <= 0:
        return None
    rng = random.Random(semilla)
    acum = {}
    for _ in range(vueltas):
        obs = _observaciones(_barajar_retornos(rows, rng), horizonte=horizonte,
                             strength=strength, tolerance=tolerance,
                             min_touches=min_touches)
        if not obs:
            continue
        for zona in ("near_support", "mid_range", "near_resistance"):
            grupo = [o for o in obs if o["zone"] == zona]
            if not grupo:
                continue
            sop = sum(1 for g in grupo if g["outcome"] == "support") / len(grupo)
            acum.setdefault(zona, []).append(sop * 100)
    if not acum:
        return None
    return {"shuffles": vueltas,
            "by_zone": {z: {"support": round(sum(v) / len(v), 1), "runs": len(v)}
                        for z, v in acum.items()}}


def _ventaja(grupo: Sequence[Dict[str, Any]], cuenta: Dict[str, int],
             n: int) -> Dict[str, Any]:
    """Cuánto se separa lo observado de lo que ya explicaba la distancia.

    `baselineSupport` es la media de las líneas base de ese grupo, y `edge` la
    diferencia en puntos porcentuales. Un `edge` cercano a cero significa que el
    grupo NO aporta nada sobre estar donde está: la cifra grande de al lado es
    geometría, no una lectura del mercado.
    """
    bases = [g["baseline_support"] for g in grupo if g.get("baseline_support") is not None]
    if not bases or n <= 0:
        return {"geometrySupport": None}
    # Sólo informativa: dice cuánto de la cifra explica la pura distancia bajo
    # supuestos ideales. La ventaja de verdad NO se calcula aquí — sale de
    # comparar con la serie barajada, que es el único nulo que comparte
    # horizonte finito y detector de niveles con la medición real.
    return {"geometrySupport": round(sum(bases) / len(bases) * 100, 1)}


def _agrupar(obs: Sequence[Dict[str, Any]], clave, iteraciones: int,
             semilla: int) -> List[Dict[str, Any]]:
    """Agrupa observaciones y calcula las tres frecuencias de cada grupo.

    Las tres —resistencia, soporte, ninguno— salen de la MISMA muestra y suman
    100 %. Publicar sólo dos y dejar que el lector reste es lo que convierte un
    45 % en un «pues casi seguro que sube».
    """
    cubos: Dict[Any, List[Dict[str, Any]]] = {}
    for o in obs:
        cubos.setdefault(clave(o), []).append(o)

    filas = []
    for k, grupo in cubos.items():
        n = len(grupo)
        cuenta = {r: sum(1 for g in grupo if g["outcome"] == r)
                  for r in ("resistance", "support", "neither")}
        filas.append({
            "key": k,
            "n": n,
            **_ventaja(grupo, cuenta, n),
            "resistance": bootstrap_proportion(cuenta["resistance"], n, iteraciones, semilla),
            "support": bootstrap_proportion(cuenta["support"], n, iteraciones, semilla),
            "neither": bootstrap_proportion(cuenta["neither"], n, iteraciones, semilla),
        })
    filas.sort(key=lambda f: -f["n"])
    return filas


def _rupturas(rows: Sequence[Row], obs: Sequence[Dict[str, Any]], *,
              horizonte: int, strength: int, tolerance: float,
              min_touches: int, iteraciones: int, semilla: int) -> Dict[str, Any]:
    """La pregunta de segundo orden: roto el soporte, ¿a dónde va?

    Se localiza cada barra que CIERRA por debajo del soporte que tenía debajo
    —cerrar, no perforar con la mecha: una mecha que vuelve dentro no es una
    ruptura y contarla como tal es la forma más rápida de inflar esto— y desde
    ahí se vuelve a medir qué toca antes: el siguiente soporte de más abajo o la
    resistencia que acaba de dejar arriba.
    """
    despues: List[Dict[str, Any]] = []
    for o in obs:
        i = o["index"]
        if i + 1 >= len(rows):
            continue
        cierre_sig = rows[i + 1].get("close")
        if cierre_sig is None or cierre_sig >= o["support"]:
            continue

        j = i + 1
        niveles = _levels_as_of(rows, j, strength, tolerance, min_touches)
        if not niveles:
            continue
        arriba, abajo = _vecinos(niveles, float(cierre_sig))
        if arriba is None or abajo is None:
            continue
        despues.append({
            "index": j,
            "date": rows[j].get("date"),
            "broken_level": o["support"],
            "next_support": abajo,
            "resistance": arriba,
            "support": abajo,
            "outcome": _first_touch(rows, j, arriba, abajo, horizonte),
        })

    n = len(despues)
    cuenta = {r: sum(1 for d in despues if d["outcome"] == r)
              for r in ("resistance", "support", "neither")}
    return {
        "n": n,
        # «continúa» = se va al SIGUIENTE soporte de abajo; «vuelve» = regresa a
        # la resistencia que dejó arriba, que es el fallo de ruptura clásico.
        "continues_down": bootstrap_proportion(cuenta["support"], n, iteraciones, semilla),
        "back_to_resistance": bootstrap_proportion(cuenta["resistance"], n, iteraciones, semilla),
        "neither": bootstrap_proportion(cuenta["neither"], n, iteraciones, semilla),
        "samples": despues[-5:],
    }


def measure_level_odds(rows: Sequence[Row], *, horizon: int = 10,
                       strength: int = 2, tolerance: float = 0.008,
                       min_touches: int = 2,
                       iterations: int = ITERACIONES_BOOTSTRAP,
                       null_shuffles: int = 0,
                       seed: int = 20260818) -> Dict[str, Any]:
    """Qué ha hecho ESTE activo desde montajes como el de ahora.

    Devuelve, por este orden de utilidad:

      · `current`  — el montaje de la última barra: dónde está el precio, qué
                     tiene encima y debajo, y qué patrón acaba de cerrar.
      · `verdict`  — el resultado con más frecuencia observada **para el montaje
                     actual**, con su muestra y su intervalo. `None` si no hay
                     ni una observación comparable: entonces no hay nada que
                     decir y se dice.
      · `by_zone`  — el reparto según el precio esté pegado al techo, al suelo o
                     en medio. Es donde se ve que promediarlo todo engaña.
      · `by_pattern` — el reparto por patrón de vela, que es lo que permite
                     contrastar el 60 % del libro con lo que hizo aquí.
      · `after_break` — roto el soporte, ¿siguiente soporte o vuelta arriba?
      · `overall`  — todo junto, para tener la línea base contra la que juzgar
                     si un montaje concreto aporta algo o sólo repite la media.

    Todo `p` viene con `n`, `hits`, `lo` y `hi`. Ninguno viene solo.
    """
    rows = list(rows)
    meta = {
        "bars": len(rows),
        "horizon": horizon,
        "iterations": iterations,
        "seed": seed,
        "window": VENTANA_NIVELES,
        "warmup": CALENTAMIENTO,
        "method": "historical_frequency+bootstrap",
        "nullShuffles": null_shuffles,
    }
    minimo = CALENTAMIENTO + horizon + 20
    if len(rows) < minimo:
        return {**meta, "error": "insufficient_bars", "required": minimo,
                "current": None, "verdict": None, "observations": 0,
                "overall": None, "by_zone": [], "by_pattern": [],
                "after_break": None}

    obs = _observaciones(rows, horizonte=horizon, strength=strength,
                         tolerance=tolerance, min_touches=min_touches)

    # ── El montaje de AHORA, con la misma receta que los históricos ──────
    i = len(rows) - 1
    niveles_hoy = _levels_as_of(rows, i, strength, tolerance, min_touches)
    precio_hoy = rows[i].get("close")
    arriba_hoy, abajo_hoy = _vecinos(niveles_hoy, float(precio_hoy)) if precio_hoy else (None, None)
    patrones = _indexar_patrones(rows)
    actual = {
        "close": float(precio_hoy) if precio_hoy is not None else None,
        "resistance": arriba_hoy,
        "support": abajo_hoy,
        "zone": _zona(float(precio_hoy), arriba_hoy, abajo_hoy) if precio_hoy else "unknown",
        "pattern": _pattern_at(rows, i, patrones),
        "date": rows[i].get("date"),
    }

    total = len(obs)
    cuenta = {r: sum(1 for o in obs if o["outcome"] == r)
              for r in ("resistance", "support", "neither")}
    overall = {
        "n": total,
        "resistance": bootstrap_proportion(cuenta["resistance"], total, iterations, seed),
        "support": bootstrap_proportion(cuenta["support"], total, iterations, seed),
        "neither": bootstrap_proportion(cuenta["neither"], total, iterations, seed),
    }

    por_zona = _agrupar(obs, lambda o: o["zone"], iterations, seed)

    # La ventaja sobre el azar, medida con la misma tubería sobre la serie
    # barajada. Sin esto, «69 % de irse al soporte» estando pegado al soporte
    # es geometría vendida como lectura de mercado.
    nulo = _nulo_por_barajado(rows, horizonte=horizon, strength=strength,
                              tolerance=tolerance, min_touches=min_touches,
                              vueltas=null_shuffles, semilla=seed)
    if nulo:
        for fila in por_zona:
            base = nulo["by_zone"].get(fila["key"], {}).get("support")
            fila["nullSupport"] = base
            fila["edgeSupport"] = (None if base is None
                                   else round(fila["support"]["p"] - base, 1))
    por_patron = _agrupar([o for o in obs if o["pattern"]],
                          lambda o: o["pattern"], iterations, seed)

    # ── El veredicto: SÓLO los históricos que se parecen al de ahora ─────
    # Comparables = misma zona del pasillo. Si además hay patrón hoy y ese
    # patrón tiene casos, se afina; si afinar deja la muestra por debajo de 10
    # se vuelve a la zona sola y se DICE que se relajó, en vez de publicar una
    # cifra construida sobre cuatro casos como si fuera la buena.
    comparables = [o for o in obs if o["zone"] == actual["zone"]]
    criterio = "zone"
    if actual["pattern"]:
        afinado = [o for o in comparables if o["pattern"] == actual["pattern"]]
        if len(afinado) >= 10:
            comparables, criterio = afinado, "zone+pattern"

    veredicto = None
    if comparables:
        c = {r: sum(1 for o in comparables if o["outcome"] == r)
             for r in ("resistance", "support", "neither")}
        reparto = {r: bootstrap_proportion(c[r], len(comparables), iterations, seed)
                   for r in c}
        gana = max(reparto, key=lambda r: reparto[r]["p"] or 0)
        # Dos resultados cuyos intervalos se solapan no están separados por los
        # datos: decir «gana X» ahí es leer ruido. Se publica igualmente, pero
        # marcado, porque el usuario pidió ver la cifra siempre.
        segundo = sorted(reparto, key=lambda r: -(reparto[r]["p"] or 0))[1]
        separado = (reparto[gana]["lo"] or 0) > (reparto[segundo]["hi"] or 0)
        veredicto = {
            "outcome": gana,
            "criterion": criterio,
            "n": len(comparables),
            "distribution": reparto,
            "separated": separado,
            "runner_up": segundo,
        }

    return {
        **meta,
        "observations": total,
        "current": actual,
        "verdict": veredicto,
        "overall": overall,
        "by_zone": por_zona,
        "by_pattern": por_patron,
        "null": nulo,
        "after_break": _rupturas(rows, obs, horizonte=horizon, strength=strength,
                                 tolerance=tolerance, min_touches=min_touches,
                                 iteraciones=iterations, semilla=seed),
    }
