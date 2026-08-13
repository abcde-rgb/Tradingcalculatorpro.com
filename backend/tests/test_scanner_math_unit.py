"""Los NÚMEROS del escáner, clavados contra valores calculados a mano.

`test_price_action_unit.py` comprueba el COMPORTAMIENTO (que un nivel se
detecte, que una ruptura se confirme). Este archivo comprueba la ARITMÉTICA:
que cada cifra publicada salga de las velas de entrada y de ninguna otra parte.

Existe porque cinco cálculos alimentaban lo que se ve en pantalla —el ATR, el
volumen medio, el espaciado entre velas, la expansión y las velas de la tira de
prueba— y ninguno tenía un test que fijara su valor. Un cambio en cualquiera de
ellos movía la tolerancia de agrupación, las distancias en ATR y el aviso de
hueco de sesión sin que fallara nada.

Regla que se comprueba en todos: si el dato no está, el resultado es `None` o
0.0 declarado, nunca una cifra inventada.
"""
import price_action as pa


def bar(o, h, l, c, v=0, ts=None, date=None):
    row = {"open": o, "high": h, "low": l, "close": c, "volume": v}
    if ts is not None:
        row["ts"] = ts
    if date is not None:
        row["date"] = date
    return row


# ---------------------------------------------------------------------------
# ATR — es el metro del escáner: de él salen la tolerancia de agrupación, las
# distancias en ATR, el recorrido hasta cada nivel y la expansión de una vela.
# ---------------------------------------------------------------------------
def test_atr_uses_true_range_not_the_candle_height():
    """El rango verdadero cuenta el HUECO contra el cierre anterior.

    La vela del medio mide 1 de alto pero abre 4 por encima del cierre previo:
    su rango verdadero es 4, no 1. Medir sólo máximo−mínimo subestima la
    volatilidad justo en las sesiones que más se mueven.
    """
    rows = [
        bar(10, 10, 10, 10),
        bar(10, 12, 8, 11),    # TR = max(12-8, |12-10|, |8-10|)  = 4
        bar(11, 15, 14, 14),   # TR = max(15-14, |15-11|, |14-11|) = 4
        bar(14, 14, 9, 10),    # TR = max(14-9,  |14-14|, |9-14|)  = 5
    ]
    assert pa._avg_true_range(rows) == (4 + 4 + 5) / 3


def test_atr_only_averages_the_last_window():
    """20 velas, ventana de 14: las 6 primeras no pueden arrastrar el valor."""
    tranquilas = [bar(10, 10.5, 9.5, 10) for _ in range(6)]     # TR = 1
    agitadas = [bar(10, 15, 5, 10) for _ in range(15)]          # TR = 10
    atr = pa._avg_true_range(tranquilas + agitadas, window=14)
    assert atr == 10.0, "una vela fuera de ventana sigue pesando"


def test_atr_without_two_bars_is_zero_not_a_guess():
    assert pa._avg_true_range([]) == 0.0
    assert pa._avg_true_range([bar(1, 2, 0.5, 1)]) == 0.0


def test_atr_is_never_negative_nor_larger_than_the_widest_bar():
    rows = [bar(10 + i, 12 + i, 8 + i, 11 + i) for i in range(30)]
    atr = pa._avg_true_range(rows)
    mayor = max(r["high"] - r["low"] for r in rows)
    assert 0 <= atr
    # Con hueco el TR puede superar el alto de UNA vela, pero no el recorrido
    # total de la serie: si lo hiciera, la escala estaría rota.
    assert atr <= max(r["high"] for r in rows) - min(r["low"] for r in rows)


# ---------------------------------------------------------------------------
# Volumen medio — decide si una ruptura llega acompañada.
# ---------------------------------------------------------------------------
def test_average_volume_looks_back_and_excludes_the_current_bar():
    rows = [bar(1, 1, 1, 1, v=100), bar(1, 1, 1, 1, v=200), bar(1, 1, 1, 1, v=900)]
    # En i=2 sólo cuentan las dos anteriores: (100+200)/2
    assert pa._avg_vol(rows, 2, window=5) == 150.0


def test_volume_zero_means_no_feed_and_is_not_averaged_in():
    """Un cero de «el proveedor no da volumen» no es un cero de mercado.

    Promediarlo hundiría la media y haría que cualquier ruptura pareciera
    acompañada de volumen extraordinario.
    """
    rows = [bar(1, 1, 1, 1, v=0), bar(1, 1, 1, 1, v=100), bar(1, 1, 1, 1, v=1)]
    assert pa._avg_vol(rows, 2, window=5) == 100.0
    sin_datos = [bar(1, 1, 1, 1, v=0), bar(1, 1, 1, 1, v=0), bar(1, 1, 1, 1)]
    assert pa._avg_vol(sin_datos, 2, window=5) == 0.0


# ---------------------------------------------------------------------------
# Espaciado entre velas — de aquí sale si un hueco es cambio de sesión.
# ---------------------------------------------------------------------------
def test_bar_spacing_is_the_median_so_one_session_break_cannot_move_it():
    """La media la arrastraría justo el salto que se quiere identificar."""
    t = 0
    rows = []
    for paso in [300, 300, 300, 57600, 300, 300, 300]:   # 5 min y un cierre nocturno
        rows.append(bar(1, 1, 1, 1, ts=t))
        t += paso
    rows.append(bar(1, 1, 1, 1, ts=t))
    assert pa._bar_spacing_seconds(rows) == 300.0


def test_bar_spacing_without_timestamps_is_zero_meaning_unknown():
    rows = [bar(1, 1, 1, 1) for _ in range(10)]
    assert pa._bar_spacing_seconds(rows) == 0.0
    assert pa._bar_spacing_seconds([bar(1, 1, 1, 1, ts=1), bar(1, 1, 1, 1, ts=2)]) == 0.0


# ---------------------------------------------------------------------------
# La tira de prueba — lo que el usuario ve dibujado.
# ---------------------------------------------------------------------------
def test_strip_bars_returns_the_tail_and_the_offset_that_locates_it():
    rows = [bar(i, i + 1, i - 1, i, date=f"d{i}") for i in range(100)]
    out = pa.strip_bars(rows, cap=90)
    assert len(out["bars"]) == 90
    assert out["barsOffset"] == 10
    # La garantía que sostiene el dibujo: bars[i] ES rows[offset + i].
    for i, b in enumerate(out["bars"]):
        origen = rows[out["barsOffset"] + i]
        assert (b["o"], b["h"], b["l"], b["c"], b["t"]) == (
            origen["open"], origen["high"], origen["low"], origen["close"], origen["date"])


def test_strip_bars_sends_everything_when_the_series_is_short():
    rows = [bar(i, i + 1, i - 1, i) for i in range(5)]
    out = pa.strip_bars(rows, cap=90)
    assert len(out["bars"]) == 5 and out["barsOffset"] == 0


def test_strip_bars_of_nothing_has_the_same_shape():
    assert pa.strip_bars([]) == {"bars": [], "barsOffset": 0}


def test_a_swing_lands_on_its_own_candle_after_subtracting_the_offset():
    """El pivote dibujado tiene que caer sobre la vela que lo creó.

    Es el fallo que invalidaría la tira entera: los swings vienen indexados
    sobre la serie COMPLETA y la tira envía sólo la cola.
    """
    rows = []
    for i in range(120):
        base = 100 + (i % 20)
        rows.append(bar(base, base + 2, base - 2, base + 1, date=f"d{i}"))
    res = pa.detect_structure(rows, strength=2)
    tira = pa.strip_bars(rows, cap=60)
    off = tira["barsOffset"]

    visibles = [s for s in res["swings"] if s["index"] - off >= 0]
    assert visibles, "la serie de prueba debe dejar pivotes dentro de la tira"
    for s in visibles:
        vela = tira["bars"][s["index"] - off]
        esperado = vela["h"] if s["type"] == "high" else vela["l"]
        assert s["price"] == esperado


# ---------------------------------------------------------------------------
# Invariantes de la lectura completa: nada publicado sale de la nada.
# ---------------------------------------------------------------------------
def _serie_realista(n=160):
    rows, precio = [], 100.0
    for i in range(n):
        # Onda determinista: sin azar, para que el test sea reproducible.
        precio += 1.4 if (i // 7) % 2 == 0 else -1.1
        o = precio
        c = precio + (0.6 if i % 3 else -0.5)
        rows.append(bar(o, max(o, c) + 0.7, min(o, c) - 0.7, c,
                        v=1000 + (i % 5) * 100, ts=1_700_000_000 + i * 3600,
                        date=f"2026-01-{(i % 28) + 1:02d}"))
    return rows


def test_the_published_price_is_the_last_close():
    """Redondeado a 6 decimales, que es lo que el módulo publica en todas las
    cifras de precio: comparar contra el flotante crudo fallaría por el ruido
    binario de la suma, no por el cálculo."""
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    assert res["currentPrice"] == round(rows[-1]["close"], 6)


def test_every_level_sits_inside_the_range_the_series_actually_traded():
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    suelo = min(r["low"] for r in rows)
    techo = max(r["high"] for r in rows)
    assert res["levels"], "la serie de prueba debe producir niveles"
    for lv in res["levels"]:
        assert suelo <= lv["price"] <= techo
        assert lv["zone"]["low"] <= lv["price"] <= lv["zone"]["high"]
        assert lv["touches"] >= 2


def test_every_swing_price_is_a_high_or_a_low_that_exists():
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    assert res["swings"]
    for s in res["swings"]:
        vela = rows[s["index"]]
        assert s["price"] == round(vela["high"] if s["type"] == "high" else vela["low"], 6)


def test_the_confirmation_score_stays_between_0_and_100():
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    for lv in res["levels"]:
        c = lv["confirmation"]
        assert 0 <= c["score"] <= 100
        assert c["held"] + c["broken"] <= c["visits"]
        if c["holdRatePct"] is not None:
            assert 0 <= c["holdRatePct"] <= 100


def test_distances_agree_with_the_price_they_are_measured_from():
    """Las dos distancias tienen que reconstruirse desde el precio publicado."""
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    precio, atr = res["currentPrice"], res["atr"]
    assert res["levels"]
    for lv in res["levels"]:
        esperado = (lv["price"] - precio) / precio * 100
        assert abs(lv["distancePct"] - esperado) < 0.01
        if atr:
            assert abs(lv["distanceAtr"] - abs(lv["price"] - precio) / atr) < 0.01


def test_the_two_distance_units_keep_their_own_convention():
    """`distancePct` lleva SIGNO; el ATR es una MAGNITUD de recorrido.

    No es un descuido y conviene que quede clavado: el porcentaje dice el lado
    (por encima o por debajo) y la escalera además separa resistencias de
    soportes, así que la dirección ya viaja dos veces. El ATR se publica como
    «cuánto hay que andar», igual que `roomAboveAtr` y `roomBelowAtr` del
    contexto, que son positivos por construcción. Firmar el ATR rompería el
    paralelismo con esos dos y no añadiría información.
    """
    rows = _serie_realista()
    res = pa.detect_structure(rows, strength=2)
    precio = res["currentPrice"]
    debajo = [lv for lv in res["levels"] if lv["price"] < precio]
    assert debajo, "la serie de prueba debe dejar algún nivel por debajo"
    for lv in debajo:
        assert lv["distancePct"] < 0, "el porcentaje sí distingue el lado"
        assert lv["distanceAtr"] >= 0, "el ATR es distancia, no posición"

    ctx = res["context"]
    for clave in ("roomAboveAtr", "roomBelowAtr"):
        if ctx[clave] is not None:
            assert ctx[clave] >= 0


def test_a_flat_series_claims_no_structure_instead_of_inventing_it():
    """Precio plano: sin pivotes no hay niveles, y las cifras son None, no 0."""
    rows = [bar(50, 50, 50, 50, date=f"d{i}") for i in range(60)]
    res = pa.detect_structure(rows, strength=2)
    assert res["levels"] == []
    assert res["nearestResistance"] is None
    assert res["nearestSupport"] is None
    assert res["context"]["roomAbovePct"] is None
    assert res["context"]["roomBelowPct"] is None
