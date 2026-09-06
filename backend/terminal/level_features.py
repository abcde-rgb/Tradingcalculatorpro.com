"""Los rasgos del montaje, tal y como se veían EN esa barra y no después.

`level_odds.py` sólo miraba dos cosas: la zona del pasillo y el patrón de vela.
Aquí están el resto de las que pide el escáner —secuencia de máximos y mínimos,
BOS/CHoCH, rebote o ruptura del nivel, patrones de tres velas, FVG abierto,
posición respecto a la media, volumen relativo— cada una reducida a una etiqueta
corta, que es lo que permite agrupar y contar.

⚠️ EL PELIGRO DE ESTE FICHERO ES UNO SOLO: el desfase de confirmación.

Un swing en la barra `k` con `strength=2` **no se sabe que es un swing hasta la
barra k+2**: hacen falta dos velas a cada lado para confirmarlo. Un extractor
que use la lista completa de swings para etiquetar la barra `k+1` está usando
información que aquel día no existía, y todo lo que se mida encima sale inflado.

`detect_structure_events` de `price_action` consume swings con `index < i`, que
para el panel está bien —trabaja sobre la serie ya cerrada— pero aquí NO vale:
adelanta `strength` barras. Por eso todo lo de este módulo pasa por
`swings_confirmados`, que sólo devuelve los que ya se podían ver.

Es el mismo fallo que `level_odds` cierra con `rows[:i+1]`, una capa más abajo, y
tiene la misma propiedad desagradable: **no se ve en el resultado**. Las cifras
salen bonitas y son mentira. Por eso hay una prueba dedicada a ello.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from terminal.price_action import detect_fvgs, detect_swings, label_structure

Row = Dict[str, Any]

# Barras hacia atrás que se miran para los rasgos. Igual que en `level_odds`:
# lo de hace un año no está en la pantalla de nadie.
VENTANA = 250


def swings_confirmados(rows: Sequence[Row], i: int, strength: int
                       ) -> List[Dict[str, Any]]:
    """Los swings que en la barra `i` YA se podían ver.

    Un pivote en `k` necesita `strength` velas a cada lado, así que no es
    visible hasta `k + strength`. Devolver los de índice `< i` a secas —que es
    lo que hace el detector del panel— adelanta esas barras.
    """
    desde = max(0, i + 1 - VENTANA)
    ventana = list(rows[desde:i + 1])
    if len(ventana) < 10:
        return []
    fuera = []
    for s in detect_swings(ventana, strength):
        # Índice absoluto, y confirmación: el pivote local `s["index"]` cae en
        # `desde + s["index"]`, y se confirma `strength` barras después.
        abs_i = desde + s["index"]
        if abs_i + strength <= i:
            fuera.append({**s, "index": abs_i})
    return fuera


def secuencia_swings(swings: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """La secuencia de máximos y mínimos, reducida a etiqueta.

    Devuelve el carácter (`uptrend`/`downtrend`/`range`) y la pareja de las dos
    últimas etiquetas —`HH_HL`, `LH_LL`, `HH_LL`…—, que es más fina que el
    carácter: `HH_LL` (máximo más alto pero mínimo más bajo) es expansión de
    rango y no es lo mismo que un rango tranquilo, y el carácter los mezcla.
    """
    if not swings:
        return {"trend": None, "pair": None, "last_high": None, "last_low": None}
    et = label_structure(list(swings))
    marcados = et["swings"]
    altos = [x["label"] for x in marcados if x["type"] == "high" and x["label"]]
    bajos = [x["label"] for x in marcados if x["type"] == "low" and x["label"]]
    ua, ub = (altos[-1] if altos else None), (bajos[-1] if bajos else None)
    return {
        "trend": et["trend"],
        "pair": f"{ua}_{ub}" if (ua and ub) else None,
        "last_high": ua,
        "last_low": ub,
    }


def eventos_as_of(rows: Sequence[Row], i: int, swings: Sequence[Dict[str, Any]],
                  strength: int = 2) -> List[Dict[str, Any]]:
    """BOS y CHoCH ocurridos hasta la barra `i`, con swings ya confirmados.

    Reimplementa el recorrido de `detect_structure_events` en vez de llamarlo,
    porque aquel consume swings por `index < i` sin esperar a la confirmación.
    La lógica de qué es BOS y qué es CHoCH es la misma: romper por CIERRE el
    último swing contrario; si va a favor de la tendencia vigente es BOS, si va
    en contra es CHoCH y la tendencia se da la vuelta.

    Sobre el `+ strength` del bucle, que estuvo cableado a `+ 2`
    -----------------------------------------------------------
    Lo di por fallo —con `strength=5` parecía soltar cada swing tres barras
    antes de que existiera— y **no lo era**: la prueba que escribí para cazarlo
    pasaba también con el sabotaje puesto, y hasta con el retardo a cero.

    El motivo es que, para los swings que salen de `detect_swings`, el retardo
    es redundante. Un máximo en `k` lo es porque `high[k]` supera a las
    `strength` barras siguientes; un BOS alcista necesita `close[j] > high[k]`,
    y en toda esa ventana `close[j] <= high[j] < high[k]`. La ruptura es
    imposible ahí dentro por construcción, así que gatear o no gatear daba los
    mismos eventos. Igual por abajo.

    Ahora bien, el gateo no sobra: es lo que sostiene la propiedad si los swings
    NO cumplen esa definición, y con una lista fabricada la diferencia se ve
    (evento en la barra 10 sin gateo, en la 15 con él). Se deja `strength` en
    vez de un 2 para no depender de una propiedad sutil de `detect_swings` que
    un cambio ahí rompería en silencio. Pero no cuenta como arreglo de un fallo,
    porque no lo hubo.
    """
    eventos: List[Dict[str, Any]] = []
    tendencia = None
    ult_alto = None
    ult_bajo = None
    si = 0
    orden = sorted(swings, key=lambda s: s["index"])
    for j in range(max(0, i + 1 - VENTANA), i + 1):
        # Un swing entra en juego cuando ya está confirmado en la barra `j`.
        while si < len(orden) and orden[si]["index"] + strength <= j:
            s = orden[si]
            if s["type"] == "high":
                ult_alto = s["price"]
            else:
                ult_bajo = s["price"]
            si += 1
        cierre = rows[j].get("close")
        if cierre is None:
            continue
        if ult_alto is not None and cierre > ult_alto:
            eventos.append({"index": j, "kind": "BOS" if tendencia == "up" else "CHoCH",
                            "direction": "bullish", "price": ult_alto})
            tendencia, ult_alto = "up", None
        elif ult_bajo is not None and cierre < ult_bajo:
            eventos.append({"index": j, "kind": "BOS" if tendencia == "down" else "CHoCH",
                            "direction": "bearish", "price": ult_bajo})
            tendencia, ult_bajo = "down", None
    return eventos


def evento_reciente(eventos: Sequence[Dict[str, Any]], i: int,
                    frescura: int = 5) -> Dict[str, Any]:
    """El último BOS/CHoCH y si es RECIENTE.

    Un BOS de hace treinta barras no dice nada del movimiento de mañana; uno de
    hace dos, quizá. `frescura` es cuántas barras se considera que sigue vivo.
    Si no lo está, la etiqueta es `none` y no `null`: «no ha habido evento
    reciente» es una situación, no un dato que falte.
    """
    if not eventos:
        return {"label": "none", "age": None, "kind": None, "direction": None}
    ult = eventos[-1]
    edad = i - ult["index"]
    if edad > frescura:
        return {"label": "none", "age": edad, "kind": ult["kind"],
                "direction": ult["direction"]}
    return {
        "label": f"{ult['kind']}_{ult['direction']}",
        "age": edad, "kind": ult["kind"], "direction": ult["direction"],
    }


def interaccion_nivel(rows: Sequence[Row], i: int, nivel: Optional[float],
                      lado: str, tolerancia: float = 0.004,
                      ventana: int = 3) -> str:
    """Qué acaba de hacer el precio con el nivel que tiene a ese lado.

    Tres respuestas, y la diferencia entre las dos primeras es justo lo que se
    pidió medir:

      · `break`  — CERRÓ al otro lado. Cerrar, no rozar: una mecha que vuelve
                   dentro no es una ruptura, y contarla como tal es la forma
                   más rápida de inflar la estadística de rupturas.
      · `bounce` — lo TOCÓ (mecha dentro de la banda) y cerró de vuelta en su
                   lado. Es el rechazo.
      · `none`   — ni una cosa ni otra en las últimas `ventana` barras.
    """
    if nivel is None or nivel <= 0:
        return "none"
    banda = nivel * tolerancia
    for j in range(max(0, i - ventana + 1), i + 1):
        alto, bajo, cierre = rows[j].get("high"), rows[j].get("low"), rows[j].get("close")
        if alto is None or bajo is None or cierre is None:
            continue
        if lado == "support":
            if cierre < nivel - banda:
                return "break"
            if bajo <= nivel + banda and cierre > nivel:
                return "bounce"
        else:
            if cierre > nivel + banda:
                return "break"
            if alto >= nivel - banda and cierre < nivel:
                return "bounce"
    return "none"


def patron_tres_velas(rows: Sequence[Row], i: int) -> str:
    """Las tres velas que acaban de cerrar, reducidas a forma.

    No son los patrones del catálogo (que ya los trae `candle_patterns`): esto
    es la SECUENCIA de direcciones más el tamaño relativo, que es lo que un
    operador lee de un vistazo. `UUU` con cuerpos crecientes no es lo mismo que
    `UUU` con cuerpos que se encogen, y el catálogo no distingue eso.
    """
    if i < 2:
        return "none"
    velas = rows[i - 2:i + 1]
    dirs, cuerpos = [], []
    for v in velas:
        o, c = v.get("open"), v.get("close")
        h, l = v.get("high"), v.get("low")
        if None in (o, c, h, l):
            return "none"
        dirs.append("U" if c > o else "D" if c < o else "-")
        rango = max(1e-12, h - l)
        cuerpos.append(abs(c - o) / rango)
    forma = "".join(dirs)
    # ⚠️ La forma va SOLA, sin el tamaño pegado. La primera versión devolvía
    # «UUU_growing», «DDD_shrinking»… — 27 formas × 3 tamaños = demasiados
    # valores para 500 observaciones: ningún grupo llegaba al mínimo de 25 y el
    # rasgo era inmedible. Se comprobó plantando una ventaja real de tres velas
    # bajistas: el arnés NO la encontraba, no porque no estuviera, sino porque
    # la muestra quedaba pulverizada.
    #
    # Sólo las dos secuencias que un operador nombra —tres seguidas arriba o
    # abajo— se quedan con nombre propio; el resto es «mixto». El tamaño del
    # cuerpo sale como rasgo aparte (`body_trend`), medible por su cuenta.
    if forma in ("UUU", "DDD"):
        return forma
    return "mixed"


def tendencia_cuerpos(rows: Sequence[Row], i: int) -> str:
    """Si los cuerpos de las tres últimas velas crecen, encogen o van igual.

    Sale del mismo sitio que `patron_tres_velas` pero como rasgo independiente:
    juntos multiplicaban los valores y dejaban los grupos sin muestra.
    """
    if i < 2:
        return "none"
    cuerpos = []
    for v in rows[i - 2:i + 1]:
        o, c, h, l = v.get("open"), v.get("close"), v.get("high"), v.get("low")
        if None in (o, c, h, l):
            return "none"
        cuerpos.append(abs(c - o) / max(1e-12, h - l))
    if cuerpos[2] > cuerpos[1] * 1.3 and cuerpos[1] > cuerpos[0] * 1.3:
        return "growing"
    if cuerpos[2] < cuerpos[1] * 0.7 and cuerpos[1] < cuerpos[0] * 0.7:
        return "shrinking"
    return "flat"


def fvg_abierto(rows: Sequence[Row], i: int, precio: float) -> str:
    """Si queda un hueco de valor justo sin rellenar por encima o por debajo.

    `detect_fvgs` recorre la serie que se le dé; se le pasa sólo hasta `i`, que
    es lo único que se podía ver. Un hueco ya rellenado no cuenta: lo que puede
    tirar del precio es el que sigue abierto.
    """
    desde = max(0, i + 1 - VENTANA)
    try:
        huecos = detect_fvgs(list(rows[desde:i + 1]))
    except Exception:  # noqa: BLE001
        return "none"
    arriba = any(h for h in huecos
                 if not h.get("filled") and (h.get("bottom") or 0) > precio)
    abajo = any(h for h in huecos
                if not h.get("filled") and (h.get("top") or 0) < precio)
    if arriba and abajo:
        return "both"
    if arriba:
        return "above"
    if abajo:
        return "below"
    return "none"


def volumen_relativo(rows: Sequence[Row], i: int, ventana: int = 20) -> str:
    """Volumen de la barra frente a su media reciente, en tres tramos.

    Devuelve `none` cuando el proveedor no manda volumen —forex y muchos CFD no
    lo tienen— en vez de inventar un 1,0 que se leería como «volumen normal».
    """
    vols = [rows[j].get("volume") for j in range(max(0, i - ventana), i + 1)]
    vols = [v for v in vols if v]
    if len(vols) < 5 or not rows[i].get("volume"):
        return "none"
    media = sum(vols[:-1]) / max(1, len(vols) - 1)
    if media <= 0:
        return "none"
    r = rows[i]["volume"] / media
    return "high" if r >= 1.5 else "low" if r <= 0.6 else "normal"


def extraer(rows: Sequence[Row], i: int, *, resistencia: Optional[float],
            soporte: Optional[float], strength: int = 2) -> Dict[str, Any]:
    """Todos los rasgos de la barra `i`, cada uno como etiqueta corta.

    Es lo que `level_odds` agrupa. Cada clave de aquí es un candidato a mover la
    probabilidad — y ninguno entra en el veredicto hasta que se demuestre que
    separa los resultados por encima de su propio intervalo. Ese juicio lo hace
    `level_research.py`, no este fichero.
    """
    precio = rows[i].get("close")
    sw = swings_confirmados(rows, i, strength)
    sec = secuencia_swings(sw)
    ev = evento_reciente(eventos_as_of(rows, i, sw, strength), i)
    return {
        "trend": sec["trend"],
        "swing_pair": sec["pair"],
        "event": ev["label"],
        "event_age": ev["age"],
        "support_action": interaccion_nivel(rows, i, soporte, "support"),
        "resistance_action": interaccion_nivel(rows, i, resistencia, "resistance"),
        "three_candle": patron_tres_velas(rows, i),
        "body_trend": tendencia_cuerpos(rows, i),
        "fvg": fvg_abierto(rows, i, float(precio)) if precio else "none",
        "volume": volumen_relativo(rows, i),
    }
