"""Unit tests for the expanded candlestick pattern detector + reliability stats.

Covers: catalogue completeness, trend-aware single-candle disambiguation,
multi-candle patterns, stats enrichment, and the Yahoo OHLC history parser.
Runs under pytest or directly (`python tests/test_candle_patterns_unit.py`).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from candle_patterns import (  # noqa: E402
    detect_all_patterns,
    get_pattern_catalog,
    PATTERN_META,
)


def _row(d, o, h, lo, c):
    return {"date": d, "open": o, "high": h, "low": lo, "close": c}


def _ids(rows):
    return [d["pattern_id"] for d in detect_all_patterns(rows)]


def test_catalogue_complete_and_well_formed():
    assert len(PATTERN_META) == 30
    for pid, meta in PATTERN_META.items():
        assert meta["type"] in ("bullish", "bearish", "neutral"), pid
        assert meta["behavior"] in ("reversal", "continuation", "indecision"), pid
        assert 0 < meta["rate"] <= 100, pid
        assert 1 <= meta["rank"] <= 103, pid
        assert meta["candles"] in (1, 2, 3), pid


def test_catalog_sorted_by_rank():
    cat = get_pattern_catalog()
    ranks = [c["rank"] for c in cat]
    assert ranks == sorted(ranks)
    assert cat[0]["pattern_id"] == "three-white-soldiers"  # rank 3, strongest


def test_hammer_in_downtrend_not_hanging_man():
    rows = [_row(f"d{i}", 100 - i, 101 - i, 99 - i, 100 - i - 0.5) for i in range(6)]
    rows.append(_row("h", 94, 95, 90, 94.8))  # long lower wick, small body up top
    ids = _ids(rows)
    assert "hammer" in ids
    assert "hanging-man" not in ids


def test_hanging_man_in_uptrend_not_hammer():
    rows = [_row(f"u{i}", 100 + i, 101 + i, 99 + i, 100 + i + 0.5) for i in range(6)]
    rows.append(_row("hm", 106, 107, 102, 106.8))  # same shape, but caps a rally
    ids = _ids(rows)
    assert "hanging-man" in ids
    assert "hammer" not in ids


def test_bullish_engulfing():
    rows = [_row("a", 50, 51, 48, 48.5), _row("b", 48, 53, 47.5, 52.5)]
    assert "bullish-engulfing" in _ids(rows)


def test_bullish_harami():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 53, 55, 52, 54)]
    assert "bullish-harami" in _ids(rows)


def test_piercing_line():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 48, 57, 47, 56)]
    assert "piercing-line" in _ids(rows)


def test_morning_star():
    rows = [_row("a", 60, 61, 49, 50), _row("b", 47, 48, 45, 46.5), _row("c", 48, 58, 47, 57)]
    assert "morning-star" in _ids(rows)


def test_three_white_soldiers():
    rows = [
        _row("a", 30, 50, 28, 48),
        _row("b", 47, 68, 45, 65),
        _row("c", 64, 88, 62, 86),
    ]
    assert "three-white-soldiers" in _ids(rows)


def test_detections_carry_stats():
    rows = [_row("a", 50, 51, 48, 48.5), _row("b", 48, 53, 47.5, 52.5)]
    det = detect_all_patterns(rows)
    eng = next(d for d in det if d["pattern_id"] == "bullish-engulfing")
    assert eng["behavior"] == "reversal"
    assert isinstance(eng["rate"], int) and eng["rate"] > 0
    assert isinstance(eng["rank"], int)


def test_ohlc_history_parsing_skips_null_bars():
    import stock_data as sd

    def fake_get(path):
        assert "/v8/finance/chart" in path
        return {"chart": {"result": [{
            "timestamp": [1700000000, 1700086400, 1700172800],
            "indicators": {"quote": [{
                "open": [10, 11, None], "high": [12, 13, 14],
                "low": [9, 10, 11], "close": [11, 12, 13],
                "volume": [1000, 2000, 3000],
            }]},
        }]}}

    original = sd._yahoo_get
    sd._yahoo_get = fake_get
    try:
        rows = sd.get_ohlc_history("AAPL", "3mo", "1d")
    finally:
        sd._yahoo_get = original
    assert len(rows) == 2                       # the null bar is dropped
    assert rows[0]["close"] == 11.0
    assert rows[0]["volume"] == 1000.0          # volume is parsed alongside OHLC
    assert set(rows[0].keys()) == {"date", "ts", "open", "high", "low", "close", "volume"}
    assert rows[0]["date"] == "2023-11-14"      # daily bars carry no time
    assert rows[0]["ts"] == 1700000000


def test_intraday_bars_carry_the_time_in_the_date():
    """Every 5-minute bar of a session sharing the string '2023-11-14' is not a
    cosmetic problem: the scanner's event log de-duplicates by date, so a whole
    day of distinct intraday events collapsed into one entry."""
    import stock_data as sd

    def fake_get(path):
        return {"chart": {"result": [{
            "timestamp": [1700000000, 1700000300],
            "indicators": {"quote": [{
                "open": [10, 11], "high": [12, 13], "low": [9, 10],
                "close": [11, 12], "volume": [1000, 2000],
            }]},
        }]}}

    original = sd._yahoo_get
    sd._yahoo_get = fake_get
    try:
        rows = sd.get_ohlc_history("AAPL", "5d", "5m")
    finally:
        sd._yahoo_get = original
    assert rows[0]["date"] == "2023-11-14 22:13"
    assert rows[0]["date"] != rows[1]["date"]




# ============================================================================
#  Revisión matemática pedida por el dueño: "tres soldados" que no lo eran,
#  contexto de tendencia dependiente de la temporalidad, y trazabilidad
#  (qué temporalidad, qué día abre, qué día confirma, en qué se basa).
# ============================================================================
from candle_patterns import (  # noqa: E402
    _is_three_white_soldiers, _is_three_black_crows, _trend_before, _candle_metrics,
)


def _c(o, h, l, c, d="2026-07-01"):
    return {"date": d, "open": o, "high": h, "low": l, "close": c, "volume": 1.0}


# ---- Tres soldados / tres cuervos ------------------------------------------
def test_three_tiny_candles_with_huge_wicks_are_NOT_three_soldiers():
    """El fallo reportado: cuerpos del 4% del rango y mechas superiores del 94%
    se anunciaban como tres soldados blancos. Un soldado es una vela con CUERPO
    que cierra cerca de su máximo."""
    c1 = _c(100.0, 105.0, 99.9, 100.2)
    c2 = _c(100.1, 106.0, 100.0, 100.4)
    c3 = _c(100.3, 107.0, 100.2, 100.6)
    assert _is_three_white_soldiers(c1, c2, c3) is False


def test_three_real_soldiers_are_still_detected():
    c1 = _c(100, 106, 99.8, 105.5)
    c2 = _c(102, 110, 101.8, 109.5)
    c3 = _c(106, 114, 105.8, 113.5)
    assert _is_three_white_soldiers(c1, c2, c3) is True
    for c in (c1, c2, c3):
        m = _candle_metrics(c)
        assert m["body_pct"] >= 0.55
        assert m["upper"] <= 0.25 * m["range"]


def test_a_long_upper_wick_disqualifies_a_soldier():
    """Mecha superior larga = los vendedores devolvieron el precio. Aunque el
    cuerpo sea grande, eso no es un soldado."""
    c1 = _c(100, 106, 99.8, 105.5)
    c2 = _c(102, 118, 101.8, 109.5)      # cuerpo grande PERO mecha enorme
    c3 = _c(106, 114, 105.8, 113.5)
    assert _is_three_white_soldiers(c1, c2, c3) is False


def test_three_black_crows_mirror_the_same_rules():
    c1 = _c(114, 114.2, 106, 106.5)
    c2 = _c(110, 110.2, 102, 102.5)
    c3 = _c(106, 106.2, 98, 98.5)
    assert _is_three_black_crows(c1, c2, c3) is True
    tiny = (_c(100.2, 100.3, 95, 100.0), _c(100.0, 100.1, 94, 99.8), _c(99.9, 100.0, 93, 99.6))
    assert _is_three_black_crows(*tiny) is False


# ---- Contexto de tendencia independiente de la escala ----------------------
def test_trend_context_is_scale_free():
    """El mismo movimiento relativo debe leerse igual en un activo de 100 y en
    uno de 100.000. Con el umbral fijo del 1% no era así."""
    def series(base, step):
        return [_c(base + i * step, base + i * step + step, base + i * step - step,
                   base + i * step) for i in range(7)]
    barato = series(100.0, 1.0)
    caro = series(100_000.0, 1_000.0)
    assert _trend_before(barato, 6) == _trend_before(caro, 6) == "up"


def test_a_flat_market_is_not_a_trend():
    flat = [_c(100, 101, 99, 100) for _ in range(7)]
    assert _trend_before(flat, 6) == "flat"


# ---- Trazabilidad: fechas y base de la detección ---------------------------
def test_every_detection_says_when_it_opens_and_when_it_confirms():
    rows = [_c(100, 101, 99, 99.5, "2026-07-01"),
            _c(100, 106, 99.8, 105.5, "2026-07-02"),
            _c(102, 110, 101.8, 109.5, "2026-07-03"),
            _c(106, 114, 105.8, 113.5, "2026-07-04")]
    hits = [d for d in detect_all_patterns(rows) if d["pattern_id"] == "three-white-soldiers"]
    assert hits, "el patrón debería detectarse"
    d = hits[0]
    assert d["start_date"] == "2026-07-02"      # primera vela del patrón
    assert d["confirm_date"] == "2026-07-04"    # vela que lo confirma
    assert d["date"] == d["confirm_date"]       # compatibilidad hacia atrás
    assert d["index"] - d["start_index"] == d["candle_count"] - 1


def test_a_one_candle_pattern_opens_and_confirms_on_the_same_bar():
    rows = [_c(100, 101, 99, 100.5, "2026-07-01"),
            _c(100, 100.2, 94, 99.8, "2026-07-02")]   # martillo
    for d in detect_all_patterns(rows):
        if d["candle_count"] == 1:
            assert d["start_date"] == d["confirm_date"]


def test_every_detection_declares_what_it_looks_at():
    rows = [_c(100 + i, 102 + i, 98 + i, 101 + i, f"2026-07-{i+1:02d}") for i in range(12)]
    for d in detect_all_patterns(rows):
        assert d["basis"] in ("body", "wicks", "both")
        for key in ("bodyPct", "upperWickPct", "lowerWickPct"):
            assert 0 <= d["metrics"][key] <= 100


def test_the_catalogue_declares_a_basis_for_every_pattern():
    for pid, meta in PATTERN_META.items():
        assert meta.get("basis") in ("body", "wicks", "both"), pid
    assert all("basis" in row for row in get_pattern_catalog())


def test_metrics_add_up_to_the_whole_candle():
    """cuerpo + mecha superior + mecha inferior = 100% del rango. Si no cuadra,
    alguna de las tres está mal medida."""
    rows = [_c(100, 110, 90, 105, "2026-07-01")]
    d = detect_all_patterns(rows)
    for det in d:
        m = det["metrics"]
        assert abs(m["bodyPct"] + m["upperWickPct"] + m["lowerWickPct"] - 100.0) < 0.2


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for fn in fns:
        fn()
        print(f"PASS {fn.__name__}")
    print(f"\nAll {len(fns)} tests passed.")
