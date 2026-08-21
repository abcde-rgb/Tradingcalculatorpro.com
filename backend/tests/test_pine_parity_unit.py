"""El indicador de TradingView tiene que dar LOS MISMOS NÚMEROS que el escáner.

`tradingview/tcp_structure_scanner.pine` afirma ser el escáner de la web dentro
de TradingView. Esa afirmación no se sostiene sola: Pine no se puede ejecutar
aquí, y "lo he repasado" no es una comprobación.

Así que se ejecuta traducido. `scripts/gen-pine-twin.py` parsea el `.pine` con
una gramática de Pine y genera `tradingview/pine_twin_generated.py`, que es el
MISMO flujo de control y la MISMA aritmética en Python. Este test corre las dos
implementaciones sobre las mismas velas y exige que coincidan cifra a cifra:
pivotes, etiquetas de estructura, rupturas con su puntuación y sus códigos,
niveles con su zona y su evidencia, desequilibrios, rupturas de nivel y los
recuentos.

Si esto falla, el que está mal es el indicador — el backend es la referencia.
"""
import math
import os
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, "backend"))
sys.path.insert(0, os.path.join(RAIZ, "tradingview"))

from price_action import detect_structure, detect_swings, label_structure  # noqa: E402
from candle_patterns import detect_all_patterns  # noqa: E402

try:
    import pine_twin_generated as pine
except ImportError:  # pragma: no cover - el gemelo se genera con un script
    pine = None

pytestmark = pytest.mark.skipif(
    pine is None,
    reason="falta tradingview/pine_twin_generated.py (python scripts/gen-pine-twin.py)",
)


# ---------------------------------------------------------------------------
# Fixtures: velas sintéticas y deterministas, con estructura de verdad
# ---------------------------------------------------------------------------
def _serie(semilla, n, base=100.0, paso=1.0, ts0=1_700_000_000, spacing=86400,
           con_volumen=True, saltos_de_sesion=0):
    """Paseo pseudoaleatorio reproducible, sin depender de `random`.

    Un generador congruencial escrito a mano: el mismo en cualquier versión de
    Python, que es lo que hace que un fallo de paridad sea reproducible dentro
    de un año y no "algo que salió una vez".
    """
    filas = []
    estado = semilla
    precio = base
    ts = ts0
    for i in range(n):
        estado = (estado * 1103515245 + 12345) % 2147483648
        r = (estado / 2147483648.0) - 0.5
        estado = (estado * 1103515245 + 12345) % 2147483648
        r2 = estado / 2147483648.0
        # Tramos con deriva: sube, corrige, lateral, baja. Sin tramos, un paseo
        # puro casi nunca deja el mismo techo tocado tres veces, que es
        # justamente lo que hay que comparar.
        deriva = paso * (0.35 if i < n * 0.35 else -0.30 if i < n * 0.55 else
                         0.0 if i < n * 0.75 else 0.25)
        apertura = precio
        cierre = max(1.0, precio + r * paso * 2 + deriva)
        alto = max(apertura, cierre) + r2 * paso * 0.8
        bajo = min(apertura, cierre) - (1 - r2) * paso * 0.8
        if saltos_de_sesion and i % saltos_de_sesion == 0 and i > 0:
            ts += spacing * 12          # noche / fin de semana
        filas.append({
            "date": f"bar-{i:04d}",
            "ts": ts,
            "open": round(apertura, 4),
            "high": round(alto, 4),
            "low": round(bajo, 4),
            "close": round(cierre, 4),
            "volume": (1000 + (estado % 900)) if con_volumen else 0,
        })
        precio = cierre
        ts += spacing
    return filas


def _ventana(filas):
    """Las mismas velas, en la forma que consume el indicador (`Win`).

    `time` en Pine va en MILISEGUNDOS; el backend guarda `ts` en segundos.
    """
    return pine.Win(
        [float(r["open"]) for r in filas],
        [float(r["high"]) for r in filas],
        [float(r["low"]) for r in filas],
        [float(r["close"]) for r in filas],
        [float(r.get("volume") or 0.0) for r in filas],
        [int(r["ts"]) * 1000 for r in filas],
    )


CASOS = {
    "diario_tendencial": _serie(7, 260),
    "diario_volatil": _serie(19, 180, base=40.0, paso=1.6),
    "diario_sin_volumen": _serie(23, 150, con_volumen=False),
    "intradia_con_huecos": _serie(31, 300, spacing=900, saltos_de_sesion=26),
    "cripto_caro": _serie(41, 200, base=68000.0, paso=900.0),
    "muy_corta": _serie(53, 40),
}


def _casi(a, b, tol=1e-9):
    """`na` sólo casa con `na`; los números, hasta el epsilon."""
    a_na = a is None or (isinstance(a, float) and math.isnan(a))
    b_na = b is None or (isinstance(b, float) and math.isnan(b))
    if a_na or b_na:
        return a_na and b_na
    return abs(float(a) - float(b)) <= tol


def _reads(filas, strength=2):
    backend = detect_structure(filas, strength=strength)
    twin = pine.runScan(_ventana(filas), strength, pine.NA, 2, [], False, "", 0)
    return backend, twin


# ---------------------------------------------------------------------------
# Escalares de la lectura
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_tendencia_tolerancia_y_atr_coinciden(nombre):
    backend, twin = _reads(CASOS[nombre])
    assert twin.trend == backend["trend"], nombre
    assert _casi(round(twin.tolerance * 100, 3), backend["tolerancePct"], 1e-6), nombre
    assert _casi(round(twin.atr, 6), backend["atr"], 1e-6), nombre
    assert _casi(round(twin.referencePrice, 6), backend["currentPrice"], 1e-6), nombre
    assert twin.rowsScanned == backend["rowsScanned"], nombre


# ---------------------------------------------------------------------------
# §1–§2 Swings y estructura
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_swings_identicos(nombre):
    backend, twin = _reads(CASOS[nombre])
    esperados = [(s["index"], s["price"], s["type"], s["label"] or "")
                 for s in backend["swings"]]
    obtenidos = [(s.idx, s.price, "high" if s.isHigh else "low", s.label)
                 for s in twin.swings]
    assert obtenidos == esperados, nombre


# ---------------------------------------------------------------------------
# §3 BOS / CHoCH, con su evidencia
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_rupturas_de_estructura_identicas(nombre):
    backend, twin = _reads(CASOS[nombre])
    assert len(twin.events) == len(backend["events"]), nombre
    for esperado, obtenido in zip(backend["events"], twin.events):
        etiqueta = f"{nombre} @ {esperado['index']}"
        assert obtenido.idx == esperado["index"], etiqueta
        assert _casi(obtenido.price, esperado["price"]), etiqueta
        assert obtenido.isBos == (esperado["kind"] == "BOS"), etiqueta
        assert obtenido.bullish == (esperado["direction"] == "bullish"), etiqueta
        assert obtenido.repeat == esperado["repeat"], etiqueta
        assert obtenido.repeatOf == esperado["repeatOf"], etiqueta
        conf = esperado["confirmation"]
        assert int(obtenido.score) == conf["score"], etiqueta
        assert obtenido.confirmed == conf["confirmed"], etiqueta
        assert obtenido.followThrough == conf["followThrough"], etiqueta
        assert obtenido.retested == conf["retested"], etiqueta
        assert _casi(obtenido.closeThroughAtr, conf["closeThroughAtr"], 1e-9), etiqueta
        assert _casi(obtenido.rangeExpansion, conf["rangeExpansion"], 1e-9), etiqueta
        assert _casi(obtenido.volExpansion, conf["volExpansion"], 1e-9), etiqueta
        assert [c for c in obtenido.reasons.split(",") if c] == conf["reasons"], etiqueta


# ---------------------------------------------------------------------------
# §4–§5 Niveles con su zona y su evidencia
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_niveles_identicos(nombre):
    backend, twin = _reads(CASOS[nombre])
    assert len(twin.levels) == len(backend["levels"]), nombre
    for esperado, obtenido in zip(backend["levels"], twin.levels):
        etiqueta = f"{nombre} @ {esperado['price']}"
        assert _casi(obtenido.price, esperado["price"]), etiqueta
        assert obtenido.role == esperado["type"], etiqueta
        assert obtenido.origin == esperado["origin"], etiqueta
        assert obtenido.flipped == esperado["flipped"], etiqueta
        assert _casi(obtenido.distancePct, esperado["distancePct"], 1e-9), etiqueta
        assert _casi(obtenido.distanceAtr, esperado["distanceAtr"], 1e-9), etiqueta
        assert obtenido.touches == esperado["touches"], etiqueta
        assert obtenido.strength == esperado["strength"], etiqueta
        assert _casi(obtenido.zoneLow, esperado["zone"]["low"], 1e-9), etiqueta
        assert _casi(obtenido.zoneHigh, esperado["zone"]["high"], 1e-9), etiqueta
        conf = esperado["confirmation"]
        assert obtenido.visits == conf["visits"], etiqueta
        assert obtenido.held == conf["held"], etiqueta
        assert obtenido.broken == conf["broken"], etiqueta
        assert _casi(obtenido.holdRatePct, conf["holdRatePct"], 1e-9), etiqueta
        assert _casi(obtenido.barsSince, conf["barsSince"], 1e-9), etiqueta
        assert int(obtenido.score) == conf["score"], etiqueta
        assert obtenido.confirmed == conf["confirmed"], etiqueta
        assert [c for c in obtenido.reasons.split(",") if c] == conf["reasons"], etiqueta


# ---------------------------------------------------------------------------
# §6 Desequilibrios
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_fvgs_identicos(nombre):
    backend, twin = _reads(CASOS[nombre])
    esperados = sorted((g["index"], g["top"], g["bottom"], g["direction"],
                        g["filled"], g["sessionGap"]) for g in backend["fvgs"])
    obtenidos = sorted((g.idx, g.top, g.bottom, "bullish" if g.bullish else "bearish",
                        g.filled, g.sessionGap) for g in twin.fvgs)
    assert obtenidos == esperados, nombre


def test_los_huecos_de_sesion_se_detectan_en_intradia():
    """Si esta cifra fuera 0 el test de arriba pasaría igual sin comprobar nada."""
    backend, twin = _reads(CASOS["intradia_con_huecos"])
    assert backend["counts"]["fvgSessionGap"] > 0
    assert twin.counts.fvgSessionGap == backend["counts"]["fvgSessionGap"]


# ---------------------------------------------------------------------------
# §7 Rupturas de nivel
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_breakouts_identicos(nombre):
    backend, twin = _reads(CASOS[nombre])
    esperados = [(b["index"], b["level"], b["direction"], b["kind"],
                  b["confirmed"], b["score"]) for b in backend["breakouts"]]
    obtenidos = [(b.idx, b.level, "bullish" if b.bullish else "bearish",
                  "fakeout" if b.isFakeout else "breakout", b.confirmed,
                  int(b.score)) for b in twin.breakouts]
    assert obtenidos == esperados, nombre


# ---------------------------------------------------------------------------
# §9 Contexto y recuentos
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_contexto_identico(nombre):
    backend, twin = _reads(CASOS[nombre])
    ctx = backend["context"]
    assert _casi(twin.context.roomAbovePct, ctx["roomAbovePct"], 1e-9), nombre
    assert _casi(twin.context.roomBelowPct, ctx["roomBelowPct"], 1e-9), nombre
    assert _casi(twin.context.roomAboveAtr, ctx["roomAboveAtr"], 1e-9), nombre
    assert _casi(twin.context.roomBelowAtr, ctx["roomBelowAtr"], 1e-9), nombre
    assert _casi(twin.context.rangeWidthPct, ctx["rangeWidthPct"], 1e-9), nombre
    assert _casi(twin.context.rangePositionPct, ctx["rangePositionPct"], 1e-9), nombre


@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_recuentos_identicos(nombre):
    backend, twin = _reads(CASOS[nombre])
    c = backend["counts"]
    t = twin.counts
    assert t.swings == c["swings"], nombre
    assert t.bos == c["bos"], nombre
    assert t.choch == c["choch"], nombre
    assert t.confirmedEvents == c["confirmedEvents"], nombre
    assert t.repeatedBreaks == c["repeatedBreaks"], nombre
    assert t.levels == c["levels"], nombre
    assert t.resistances == c["resistances"], nombre
    assert t.supports == c["supports"], nombre
    assert t.flipped == c["flipped"], nombre
    assert t.confirmedLevels == c["confirmedLevels"], nombre
    assert t.fvgOpen == c["fvgOpen"], nombre
    assert t.fvgSessionGap == c["fvgSessionGap"], nombre
    assert t.breakouts == c["breakouts"], nombre
    assert t.fakeouts == c["fakeouts"], nombre


def test_sin_comprobar_no_es_cero():
    """`counts.confluent` a `na` mientras no se lea el escalón superior.

    Es la misma regla que en el backend, y no es cosmética: 0 significa
    "comprobado y sin coincidencias", que es una afirmación distinta.
    """
    _, twin = _reads(CASOS["diario_tendencial"])
    assert math.isnan(twin.counts.confluent)


def test_la_confluencia_marca_niveles_cuando_hay_escalon_superior():
    filas = CASOS["diario_tendencial"]
    twin = pine.runScan(_ventana(filas), 2, pine.NA, 2, [], False, "", 0)
    # El "escalón superior" es la misma serie remuestreada de 5 en 5 velas:
    # basta para que existan niveles cerca de los del gráfico base.
    superior = []
    for i in range(0, len(filas), 5):
        trozo = filas[i:i + 5]
        if not trozo:
            continue
        superior.append({
            "date": trozo[0]["date"], "ts": trozo[0]["ts"],
            "open": trozo[0]["open"],
            "high": max(r["high"] for r in trozo),
            "low": min(r["low"] for r in trozo),
            "close": trozo[-1]["close"], "volume": sum(r["volume"] for r in trozo),
        })
    htf = pine.scanLevels(_ventana(superior), 2, 2)
    con_confluencia = pine.runScan(_ventana(filas), 2, pine.NA, 2, htf, True, "", 0)
    assert len(htf) > 0
    assert not math.isnan(con_confluencia.counts.confluent)
    assert con_confluencia.counts.confluent >= 0
    # Y no toca la puntuación de confirmación: esa mide sólo las velas escaneadas.
    assert [round(l.score) for l in con_confluencia.levels] == [round(l.score) for l in twin.levels]


def test_una_serie_demasiado_corta_no_es_una_lectura():
    """Menos velas que las que pide el fractal: los DOS devuelven vacío.

    Es el caso de un activo recién listado, y es justo donde nadie lo miraría.
    El backend devuelve `_empty_read` —referencia, tolerancia y ATR sin valor—
    porque una tolerancia derivada del ATR de tres velas es una precisión
    inventada. El indicador tiene que decir lo mismo, no un número bonito.
    """
    filas = _serie(97, 4)
    backend = detect_structure(filas, strength=2)
    twin = pine.runScan(_ventana(filas), 2, pine.NA, 2, [], False, "", 0)
    assert backend["currentPrice"] is None and math.isnan(twin.referencePrice)
    assert backend["tolerancePct"] is None and math.isnan(twin.tolerance)
    assert backend["atr"] is None and math.isnan(twin.atr)
    assert twin.trend == backend["trend"] == "range"
    assert twin.rowsScanned == backend["rowsScanned"] == 4
    assert len(twin.swings) == len(twin.levels) == len(twin.fvgs) == len(twin.breakouts) == 0
    assert twin.counts.levels == backend["counts"]["levels"] == 0
    assert twin.counts.fvgOpen == backend["counts"]["fvgOpen"] == 0
    assert math.isnan(twin.context.roomAbovePct) and backend["context"]["roomAbovePct"] is None


def test_la_tolerancia_manual_se_respeta():
    filas = CASOS["diario_tendencial"]
    twin = pine.runScan(_ventana(filas), 2, 0.008, 2, [], False, "", 0)
    assert _casi(twin.tolerance, 0.008)
    backend = detect_structure(filas, strength=2, tolerance=0.008)
    assert [l.price for l in twin.levels] == [l["price"] for l in backend["levels"]]


# ---------------------------------------------------------------------------
# §10c Patrones de vela — el port de candle_patterns.py
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_patrones_de_vela_identicos(nombre):
    """Los treinta detectores, uno a uno, sobre las mismas velas.

    Se compara TODO lo que viaja con cada detección, no sólo el identificador:
    dónde empieza, dónde confirma, en qué se fija el detector y las medidas
    reales de la vela. Un patrón bien identificado en la barra equivocada sigue
    siendo un aviso que no se puede contrastar con el gráfico.
    """
    filas = CASOS[nombre]
    esperados = detect_all_patterns(filas)
    obtenidos = pine.detectPatterns(_ventana(filas))
    assert len(obtenidos) == len(esperados), (
        f"{nombre}: {len(obtenidos)} detecciones frente a {len(esperados)}")
    for esperado, p in zip(esperados, obtenidos):
        etiqueta = f"{nombre} @ {esperado['index']} {esperado['pattern_id']}"
        assert p.id == esperado["pattern_id"], etiqueta
        assert p.idx == esperado["index"], etiqueta
        assert p.startIdx == esperado["start_index"], etiqueta
        assert p.kind == esperado["type"], etiqueta
        assert p.behavior == esperado["behavior"], etiqueta
        assert p.rate == esperado["rate"], etiqueta
        assert p.rank == esperado["rank"], etiqueta
        assert p.candles == esperado["candle_count"], etiqueta
        assert p.basis == esperado["basis"], etiqueta
        assert _casi(p.bodyPct, esperado["metrics"]["bodyPct"], 1e-9), etiqueta
        assert _casi(p.upperWickPct, esperado["metrics"]["upperWickPct"], 1e-9), etiqueta
        assert _casi(p.lowerWickPct, esperado["metrics"]["lowerWickPct"], 1e-9), etiqueta


def test_los_fixtures_disparan_patrones_de_verdad():
    """Sin esto, el test de arriba pasaría comparando dos listas vacías."""
    total = sum(len(detect_all_patterns(f)) for f in CASOS.values())
    assert total > 200, total
    familias = {d["pattern_id"] for f in CASOS.values() for d in detect_all_patterns(f)}
    # Que haya de una, de dos y de tres velas: si sólo saltaran dojis, el port
    # de las dieciocho condiciones multi-vela estaría sin comprobar.
    assert any(pine.patternMeta(pid).candles == 2 for pid in familias), familias
    assert any(pine.patternMeta(pid).candles == 3 for pid in familias), familias


def test_el_catalogo_de_patrones_coincide():
    """Los treinta identificadores traen en Pine los mismos metadatos.

    La tabla está escrita dos veces —un `switch` en Pine y un dict en Python—
    y nada impide que una tasa se teclee mal en una de las dos. Esto lo impide.
    """
    from candle_patterns import PATTERN_META
    for pid, meta in PATTERN_META.items():
        m = pine.patternMeta(pid)
        assert (m.kind, m.behavior, m.rate, m.rank, m.candles, m.basis) == (
            meta["type"], meta["behavior"], meta["rate"], meta["rank"],
            meta["candles"], meta["basis"]), pid
    assert len(PATTERN_META) == 30, len(PATTERN_META)


def test_un_id_desconocido_no_inventa_metadatos():
    m = pine.patternMeta("no-existe")
    assert m.kind == "neutral" and m.rank == 99


# ---------------------------------------------------------------------------
# El cruce patrón ↔ nivel (AÑADIDO: no está en el backend)
# ---------------------------------------------------------------------------
def test_el_cruce_patron_nivel_solo_marca_niveles_confirmados():
    filas = CASOS["diario_tendencial"]
    w = _ventana(filas)
    sc = pine.runScan(w, 2, pine.NA, 2, [], False, "", 0)
    confirmados = [l for l in sc.levels if l.confirmed]
    for p in sc.patterns:
        if math.isnan(p.levelPrice):
            continue
        hi, lo = w.h[p.idx], w.l[p.idx]
        # El nivel marcado existe, está confirmado y la vela lo toca de verdad.
        tocados = [l for l in confirmados
                   if l.zoneLow <= hi and l.zoneHigh >= lo and l.price == p.levelPrice]
        assert tocados, f"patrón {p.id}@{p.idx} marcado en {p.levelPrice} sin nivel que lo respalde"
        assert p.levelRole in ("support", "resistance", "pivot")
    assert sc.counts.patternsAtLevel == sum(
        1 for p in sc.patterns if not math.isnan(p.levelPrice))


def test_los_patrones_no_tocan_la_lectura_portada():
    """Añadir patrones no puede mover un solo número del escáner original."""
    filas = CASOS["diario_volatil"]
    backend = detect_structure(filas, strength=2)
    twin = pine.runScan(_ventana(filas), 2, pine.NA, 2, [], False, "", 0)
    assert twin.counts.levels == backend["counts"]["levels"]
    assert twin.counts.bos == backend["counts"]["bos"]
    assert [round(l.score) for l in twin.levels] == [
        l["confirmation"]["score"] for l in backend["levels"]]


# ---------------------------------------------------------------------------
# Modo tiempo real honesto y tendencia del escalón superior
# ---------------------------------------------------------------------------
# La serie está escrita a mano porque el caso que separa los dos modos NO sale
# en un paseo aleatorio: hace falta un pivote alto con MECHA enorme y cierre bajo
# (barra 12, máximo 110, cierre 95) seguido de un cierre que supera un pivote
# anterior MÁS BAJO (barra 6, máximo 100).
SERIE_PIVOTE_QUE_TAPA = [
    {"date": f"b-{i:02d}", "ts": 1_700_000_000 + i * 86400, "open": o, "high": h,
     "low": lo, "close": c, "volume": 0}
    for i, (o, h, lo, c) in enumerate([
        (90, 92, 89, 91), (91, 93, 90, 92), (92, 94, 91, 93), (93, 95, 92, 94),
        (94, 96, 93, 95), (95, 98, 94, 97), (97, 100, 96, 99), (99, 99.5, 96, 97),
        (97, 98, 95, 96), (96, 97, 94, 95), (95, 96, 93, 94), (94, 96, 93, 95),
        (95, 110, 94, 95), (95, 106, 94, 105), (105, 106, 100, 101),
        (101, 103, 99, 100), (100, 102, 98, 99),
    ])
]


@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_una_ruptura_nunca_cae_dentro_de_las_velas_que_forman_su_pivote(nombre):
    """La propiedad que hace que el «sesgo de anticipación» casi no exista.

    Un swing alto en `k` es, por definición, el máximo de `[k-s, k+s]`. Entonces
    ninguna vela de `(k, k+s]` puede CERRAR por encima de él: su máximo ya está
    acotado por el del pivote. O sea que una ruptura de ese nivel no puede
    ocurrir antes de `k+s+1`, que es justo cuando el pivote ya era observable.

    Esto se comprueba, no se razona: si algún día alguien relaja la detección de
    pivotes a `>` en vez de `>=`, o cambia la ventana, la propiedad se cae y
    este test lo dice.
    """
    filas = CASOS[nombre]
    w = _ventana(filas)
    swings = pine.detectSwings(w, 2)
    for ev in pine.detectEvents(w, pine.detectSwings(w, 2), 0):
        confirmables = [sw for sw in swings
                        if abs(sw.price - ev.price) < 1e-9 and sw.idx + 2 < ev.idx]
        assert confirmables, (
            f"{nombre}: ruptura en {ev.idx} sobre {ev.price} sin ningún pivote "
            f"de ese precio ya confirmado")


@pytest.mark.parametrize("nombre", sorted(CASOS))
def test_el_retardo_de_confirmacion_casi_nunca_cambia_nada(nombre):
    """Y en estas seis series, nada en absoluto. No es casualidad: es el teorema
    de arriba. Documentarlo como «las rupturas aparecen unas velas antes» era
    exagerar el problema."""
    w = _ventana(CASOS[nombre])
    como_la_web = pine.detectEvents(w, pine.detectSwings(w, 2), 0)
    honesto = pine.detectEvents(w, pine.detectSwings(w, 2), 2)
    assert [(e.idx, e.price) for e in honesto] == [(e.idx, e.price) for e in como_la_web]


def test_pero_el_interruptor_no_es_un_adorno():
    """El único caso en el que sí difieren: un pivote nuevo TAPA a uno anterior.

    Sin retardo, la barra 12 (mecha hasta 110, cierre en 95) se convierte en el
    swing alto vigente en cuanto queda atrás, y tapa el de la barra 6 (100). El
    cierre de 105 de la barra 13 no supera 110, así que no rompe nada. Con
    retardo, el pivote de la 12 todavía no existe, el vigente sigue siendo el de
    100 — y 105 sí lo rompe.

    Cuál de los dos es «el correcto» depende de para qué: para reproducir el
    panel de la web, el primero; para medir un sistema en tiempo real, el
    segundo, porque el pivote de la 12 aquel día aún no se podía ver.
    """
    w = _ventana(SERIE_PIVOTE_QUE_TAPA)
    swings = pine.detectSwings(w, 2)
    assert [(s.idx, s.price) for s in swings if s.isHigh] == [(6, 100.0), (12, 110.0)]
    como_la_web = pine.detectEvents(w, pine.detectSwings(w, 2), 0)
    honesto = pine.detectEvents(w, pine.detectSwings(w, 2), 2)
    assert [(e.idx, e.price) for e in como_la_web] == []
    assert [(e.idx, e.price) for e in honesto] == [(13, 100.0)]


def test_por_defecto_el_indicador_sigue_diciendo_lo_que_dice_la_web():
    filas = CASOS["diario_tendencial"]
    backend = detect_structure(filas, strength=2)
    w = _ventana(filas)
    assert len(pine.detectEvents(w, pine.detectSwings(w, 2), 0)) == len(backend["events"])


def test_la_tendencia_de_otra_ventana_usa_las_mismas_reglas():
    filas = CASOS["diario_tendencial"]
    w = _ventana(filas)
    assert pine.trendOf(w, 2) == label_structure(detect_swings(filas, strength=2))["trend"]
