"""¿Cuál de todos estos rasgos aporta algo, y cuál sólo lo parece?

`level_features.py` produce nueve etiquetas por barra. La pregunta de este
módulo es la única que importa antes de meter ninguna en el veredicto: **¿separa
los resultados por encima de lo que separaría el azar?**

Por qué no basta con «este grupo sale 68 %»
-------------------------------------------
Tres razones, y cada una ha hundido a alguien:

1. **La geometría ya explica casi todo.** Pegado al soporte se toca el soporte
   antes porque está más cerca. Cualquier rasgo que correlacione con la posición
   heredará esa ventaja sin aportar nada. Por eso todo se mide contra el
   `nullSupport` de la serie barajada, no contra el 50 %.

2. **Probar quince rasgos son quince monedas al aire.** Con 15 pruebas al 5 %,
   la probabilidad de que AL MENOS UNA salga «significativa» por pura suerte es
   del 54 %. Publicar la mejor sin corregir es garantizar un hallazgo falso.
   Aquí se aplica Holm–Bonferroni, que es la corrección estándar y no supone
   independencia entre las pruebas — que no la hay: `trend` y `swing_pair` miran
   lo mismo.

3. **Buscar la mejor configuración es buscarse un espejismo.** Probar 40
   combinaciones de horizonte, tolerancia y fuerza y quedarse con la que mejor
   sale es exactamente cómo se fabrica un sistema que no funciona. Por eso
   `buscar_configuracion` parte la serie: elige DENTRO de la primera mitad y
   mide UNA sola vez en la segunda, que no ha visto. El número que se publica
   es el de fuera de muestra, y viene con cuántas combinaciones se probaron.

Módulo PURO. Se le dan las barras; no toca red ni BD.
"""
from __future__ import annotations

import math
import random
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

from level_features import extraer
from level_odds import (
    _first_touch,
    _levels_as_of,
    _nulo_por_barajado,
    _vecinos,
    _zona,
    bootstrap_proportion,
)

Row = Dict[str, Any]

# Un grupo con menos de esto no se juzga. No es un umbral estético: por debajo
# el intervalo es tan ancho que la prueba no puede distinguir nada, y contarla
# como «probada y no significativa» ensucia la corrección por multiplicidad.
MINIMO_GRUPO = 25


# ══════════════════════════════════════════════════════════════════════════
# Observaciones con TODOS los rasgos
# ══════════════════════════════════════════════════════════════════════════
def observar(rows: Sequence[Row], *, horizonte: int = 10, strength: int = 2,
             tolerance: float = 0.008, min_touches: int = 2,
             calentamiento: int = 60) -> List[Dict[str, Any]]:
    """Una fila por barra medible: los nueve rasgos más el resultado.

    Igual que `level_odds._observaciones` pero con el juego completo de rasgos.
    Las mismas dos guardas: niveles sólo con `rows[:i+1]`, y el resultado medido
    desde `i+1` con horizonte completo por delante.
    """
    fuera: List[Dict[str, Any]] = []
    ultima = len(rows) - horizonte - 1
    for i in range(calentamiento, max(calentamiento, ultima + 1)):
        precio = rows[i].get("close")
        if precio is None:
            continue
        niveles = _levels_as_of(rows, i, strength, tolerance, min_touches)
        if not niveles:
            continue
        arriba, abajo = _vecinos(niveles, float(precio))
        if arriba is None or abajo is None:
            continue
        rasgos = extraer(rows, i, resistencia=arriba, soporte=abajo,
                         strength=strength)
        fuera.append({
            "index": i, "close": float(precio),
            "resistance": arriba, "support": abajo,
            "zone": _zona(float(precio), arriba, abajo),
            **rasgos,
            "outcome": _first_touch(rows, i, arriba, abajo, horizonte),
        })
    return fuera


# ══════════════════════════════════════════════════════════════════════════
# ¿Separa este rasgo?
# ══════════════════════════════════════════════════════════════════════════
def nulo_por_rasgo(rows: Sequence[Row], rasgos: Sequence[str], *,
                   horizonte: int, strength: int, tolerance: float,
                   min_touches: int, vueltas: int, semilla: int,
                   resultado: str = "support") -> Dict[str, Dict[Any, float]]:
    """La frecuencia de `resultado` por valor de rasgo en series SIN estructura.

    ⚠️ Esta función existe porque me equivoqué. La primera versión de
    `evaluar_rasgo` comparaba cada grupo contra EL RESTO DE LA MUESTRA, y sobre
    un paseo aleatorio puro daba a `zone` un p de 9,3e-08 — una «ventaja»
    aplastante en una serie que por construcción no tiene ninguna, y que además
    aguantaba fuera de muestra.

    No era un fallo del cálculo: los grupos SÍ difieren. Pegado al soporte se
    toca el soporte antes porque está más cerca, y eso es cierto también en el
    ruido. Comparar un grupo con el resto mide esa geometría, no el mercado.

    Lo único que la quita es medir el MISMO rasgo sobre la misma tubería con el
    orden de los retornos barajado: la geometría sobrevive al barajado, la
    estructura no. Es la misma lección que `level_odds._nulo_por_barajado`, una
    capa más arriba, y la volví a aprender aquí.
    """
    if vueltas <= 0:
        return {}
    from level_odds import _barajar_retornos  # noqa: PLC0415 — evita ciclo
    rng = random.Random(semilla)
    acum: Dict[str, Dict[Any, List[float]]] = {r: {} for r in rasgos}
    for _ in range(vueltas):
        obs = observar(_barajar_retornos(rows, rng), horizonte=horizonte,
                       strength=strength, tolerance=tolerance,
                       min_touches=min_touches)
        if not obs:
            continue
        for r in rasgos:
            grupos: Dict[Any, List[Dict[str, Any]]] = {}
            for o in obs:
                grupos.setdefault(o.get(r), []).append(o)
            for valor, grupo in grupos.items():
                if len(grupo) < MINIMO_GRUPO:
                    continue
                tasa = sum(1 for g in grupo if g["outcome"] == resultado) / len(grupo)
                acum[r].setdefault(valor, []).append(tasa * 100)
    return {r: {v: round(sum(xs) / len(xs), 2) for v, xs in vals.items() if xs}
            for r, vals in acum.items()}


def _p_dos_proporciones(x1: int, n1: int, x2: int, n2: int) -> Optional[float]:
    """p-valor de que dos proporciones sean la misma (z de dos colas).

    Sin scipy: la aproximación normal basta con los tamaños de aquí, y
    `MINIMO_GRUPO` garantiza que se cumplen sus condiciones. Se usa `erfc`, que
    está en la biblioteca estándar y no arrastra dependencias.
    """
    if n1 < 5 or n2 < 5:
        return None
    p1, p2 = x1 / n1, x2 / n2
    p = (x1 + x2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    if se <= 0:
        return None
    z = abs(p1 - p2) / se
    return math.erfc(z / math.sqrt(2))


def evaluar_rasgo(obs: Sequence[Dict[str, Any]], rasgo: str, *,
                  resultado: str = "support",
                  iteraciones: int = 400,
                  nulo: Optional[Dict[Any, float]] = None,
                  semilla: int = 20260818) -> Dict[str, Any]:
    """Mide si los valores de `rasgo` reparten `resultado` de forma distinta.

    Devuelve, por cada valor del rasgo: n, la frecuencia del resultado con su
    intervalo, y el p-valor de esa frecuencia CONTRA EL RESTO de la muestra —no
    contra el 50 %, que sería comparar con una moneda y no con el mercado.

    `best` es el valor con más separación, y `p` su p-valor SIN corregir. La
    corrección por haber mirado muchos rasgos se aplica fuera, en `investigar`.

    ⚠️ `nulo` es OBLIGATORIO para que el resultado signifique algo. Sin él se
    compara cada grupo contra el resto de la muestra, y eso mide geometría: en
    un paseo aleatorio puro `zone` sale con p = 9e-08 porque estar cerca del
    soporte hace tocarlo antes. Sin `nulo` se devuelve `p=None` y `blind=True`
    en vez de un número que parecería un hallazgo.
    """
    grupos: Dict[Any, List[Dict[str, Any]]] = {}
    for o in obs:
        grupos.setdefault(o.get(rasgo), []).append(o)

    total_n = len(obs)
    total_x = sum(1 for o in obs if o["outcome"] == resultado)

    filas = []
    for valor, grupo in grupos.items():
        n = len(grupo)
        if n < MINIMO_GRUPO:
            continue
        x = sum(1 for g in grupo if g["outcome"] == resultado)
        base = (nulo or {}).get(valor)
        # El p-valor sale de comparar con el MISMO grupo en la serie barajada.
        # Se le da a la referencia el mismo n: no se conoce su tamaño efectivo
        # y suponerlo enorme regalaría significación.
        pv = (None if base is None
              else _p_dos_proporciones(x, n, int(round(base / 100 * n)), n))
        filas.append({
            "value": valor,
            "n": n,
            "freq": bootstrap_proportion(x, n, iteraciones, semilla),
            "rest_freq": round((total_x - x) / (total_n - n) * 100, 1) if total_n > n else None,
            "null_freq": base,
            "edge": None if base is None else round(x / n * 100 - base, 1),
            "p": pv,
        })

    filas.sort(key=lambda f: (f["p"] if f["p"] is not None else 1.0))
    mejor = filas[0] if filas else None
    return {
        "feature": rasgo,
        "groups": filas,
        "tested_groups": len(filas),
        "best": mejor,
        "p": mejor["p"] if mejor else None,
        # Sin línea base no hay juicio posible, y hay que decirlo en vez de
        # devolver un p-valor que mediría geometría.
        "blind": nulo is None,
    }


def holm_bonferroni(pvalores: Sequence[Tuple[str, Optional[float]]],
                    alfa: float = 0.05) -> Dict[str, Dict[str, Any]]:
    """Corrección por haber mirado muchos rasgos a la vez.

    Con 15 pruebas al 5 %, la probabilidad de que al menos una salga
    «significativa» por suerte es del 54 %. Holm ordena los p-valores y exige al
    más pequeño un listón de `alfa/m`, al siguiente `alfa/(m-1)`, y así. Es
    uniformemente más potente que Bonferroni a secas y no supone independencia,
    que aquí no se cumple: `trend` y `swing_pair` miran lo mismo.
    """
    validos = [(k, p) for k, p in pvalores if p is not None]
    m = len(validos)
    fuera: Dict[str, Dict[str, Any]] = {k: {"p": p, "threshold": None,
                                            "survives": False}
                                        for k, p in pvalores}
    if not m:
        return fuera
    ordenados = sorted(validos, key=lambda kp: kp[1])
    rechazando = True
    for idx, (k, p) in enumerate(ordenados):
        umbral = alfa / (m - idx)
        sobrevive = rechazando and p <= umbral
        if not sobrevive:
            rechazando = False
        fuera[k] = {"p": p, "threshold": round(umbral, 5), "survives": sobrevive}
    return fuera


# ══════════════════════════════════════════════════════════════════════════
# La investigación completa
# ══════════════════════════════════════════════════════════════════════════
RASGOS = ("zone", "trend", "swing_pair", "event", "support_action",
          "resistance_action", "three_candle", "body_trend", "fvg", "volume")


def investigar(rows: Sequence[Row], *, horizonte: int = 10, strength: int = 2,
               tolerance: float = 0.008, min_touches: int = 2,
               iteraciones: int = 400, barajados: int = 10,
               semilla: int = 20260818) -> Dict[str, Any]:
    """Qué rasgos separan de verdad, corregido por haberlos mirado todos.

    El orden de lectura de la respuesta:

      · `survivors` — los rasgos cuya separación aguanta Holm–Bonferroni. Si
        está vacía, la respuesta honesta es «con este histórico, ninguno de los
        nueve aporta nada demostrable», y eso es un resultado, no un fallo.
      · `features`  — todos, con sus grupos y p-valores crudos, para poder
        discutirlos.
      · `null`      — la línea base de la serie barajada, que es contra lo que
        se juzga cualquier ventaja.
    """
    obs = observar(rows, horizonte=horizonte, strength=strength,
                   tolerance=tolerance, min_touches=min_touches)
    meta = {
        "bars": len(rows), "observations": len(obs), "horizon": horizonte,
        "strength": strength, "tolerance": tolerance,
        "features_tested": len(RASGOS), "min_group": MINIMO_GRUPO,
        "correction": "holm-bonferroni", "alpha": 0.05,
    }
    if len(obs) < MINIMO_GRUPO * 2:
        return {**meta, "error": "insufficient_observations",
                "features": [], "survivors": [], "null": None}

    nulos = nulo_por_rasgo(rows, RASGOS, horizonte=horizonte, strength=strength,
                           tolerance=tolerance, min_touches=min_touches,
                           vueltas=barajados, semilla=semilla)
    evaluados = [evaluar_rasgo(obs, r, iteraciones=iteraciones,
                               nulo=nulos.get(r), semilla=semilla)
                 for r in RASGOS]
    correccion = holm_bonferroni([(e["feature"], e["p"]) for e in evaluados])
    for e in evaluados:
        e["holm"] = correccion.get(e["feature"], {})

    nulo = _nulo_por_barajado(rows, horizonte=horizonte, strength=strength,
                              tolerance=tolerance, min_touches=min_touches,
                              vueltas=barajados, semilla=semilla)

    supervivientes = [e["feature"] for e in evaluados if e["holm"].get("survives")]
    evaluados.sort(key=lambda e: (e["p"] if e["p"] is not None else 1.0))
    return {**meta, "features": evaluados, "survivors": supervivientes,
            "null": nulo}


def buscar_configuracion(rows: Sequence[Row], *,
                         horizontes: Sequence[int] = (5, 10, 20),
                         fuerzas: Sequence[int] = (2, 3),
                         tolerancias: Sequence[float] = (0.005, 0.008, 0.012),
                         semilla: int = 20260818) -> Dict[str, Any]:
    """La mejor configuración, elegida DENTRO y medida FUERA.

    Probar dieciocho combinaciones y quedarse con la que mejor sale es la forma
    canónica de fabricarse un sistema que no funciona: con suficientes intentos,
    alguna sale bien por suerte. Aquí:

      1. La serie se parte por la mitad. La primera mitad es donde se busca.
      2. Se prueban todas las combinaciones SÓLO ahí y se elige una.
      3. Esa única combinación se mide UNA VEZ en la segunda mitad, que no ha
         participado en la elección.

    Lo que se publica como resultado es el de fuera de muestra, con `trials`
    delante: sin saber cuántas veces se tiró la moneda, el mejor resultado no
    significa nada.

    El criterio para elegir NO es «la mayor frecuencia» —esa la gana siempre el
    grupo más pequeño y más afortunado— sino la mayor separación estadística
    del mejor rasgo, que ya penaliza las muestras cortas.
    """
    corte = len(rows) // 2
    dentro, fuera = list(rows[:corte]), list(rows[corte:])
    if len(dentro) < 150 or len(fuera) < 150:
        return {"error": "insufficient_bars_for_split",
                "required_per_half": 150, "in_sample": len(dentro),
                "out_of_sample": len(fuera)}

    intentos = []
    for h in horizontes:
        for f in fuerzas:
            for tol in tolerancias:
                # Barajados también aquí: sin nulo,  es ciego y
                # la búsqueda elegiría por geometría, que es constante entre
                # configuraciones y por tanto no elige nada útil.
                r = investigar(dentro, horizonte=h, strength=f, tolerance=tol,
                               iteraciones=120, barajados=5, semilla=semilla)
                mejor_p = r.get("features") and r["features"][0].get("p")
                intentos.append({
                    "horizon": h, "strength": f, "tolerance": tol,
                    "observations": r.get("observations", 0),
                    "best_feature": (r["features"][0]["feature"]
                                     if r.get("features") else None),
                    "p": mejor_p,
                    "survivors": r.get("survivors", []),
                })

    validos = [t for t in intentos if t["p"] is not None and t["observations"] >= 60]
    if not validos:
        return {"error": "no_valid_configs", "trials": len(intentos),
                "attempts": intentos}
    elegida = min(validos, key=lambda t: t["p"])

    # ── La única medición fuera de muestra ───────────────────────────────
    validacion = investigar(fuera, horizonte=elegida["horizon"],
                            strength=elegida["strength"],
                            tolerance=elegida["tolerance"],
                            iteraciones=400, barajados=8, semilla=semilla + 1)

    aguanta = elegida["best_feature"] in validacion.get("survivors", [])
    return {
        "trials": len(intentos),
        "chosen": elegida,
        "in_sample_bars": len(dentro),
        "out_of_sample_bars": len(fuera),
        "out_of_sample": {
            "observations": validacion.get("observations"),
            "survivors": validacion.get("survivors", []),
            "best_feature": (validacion["features"][0]["feature"]
                             if validacion.get("features") else None),
            "p": (validacion["features"][0]["p"]
                  if validacion.get("features") else None),
        },
        # La pregunta que decide si esto vale para algo: lo que se eligió
        # dentro, ¿sigue en pie fuera? Si no, era ruido.
        "holds_out_of_sample": aguanta,
        "attempts": intentos,
    }
