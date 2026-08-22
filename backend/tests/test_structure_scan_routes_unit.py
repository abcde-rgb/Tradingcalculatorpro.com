"""
Route-level tests for the price-structure scanner endpoint.

The maths is covered in test_price_action_unit.py; what is covered HERE is the
wiring, which is where this endpoint has actually broken before: which interval
is requested upstream, what happens when the provider answers nothing, and —
new — that reading the rung above for confluence can fail without taking the
main scan down with it.

Both upstream calls are mocked — the OHLC reader AND the live quote. Any test
that reached the real network would be a test whose green means nothing.

⚠️ This file used to say the provider "is blocked from CI and from the sandbox".
Half of that was wrong: **CI has network**. Only the sandbox is blocked, and the
difference hid a real failure — the live quote was never mocked, so the sandbox
passed (call fails → endpoint falls back to the last close → matches the
synthetic series) and CI failed (`assert 309.87 == 100.0`, a genuine AAPL
price against a fixture bar). Mock every upstream call, not the one that
happens to be blocked where you are running.
"""
import os

import pytest

# Dev mode before importing server: auto-generates JWT_SECRET, no network/DB.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# No `with`: startup events (and therefore the DB pool) never run.
client = TestClient(server.app)

SCAN = "/api/education/structure-scan/AAPL"


def _series(n=120, ts0=1_700_000_000, step=86_400):
    """A zig-zag that produces swings, levels and breaks on any rung."""
    rows, price = [], 100.0
    for i in range(n):
        price += 1.0 if (i // 10) % 2 == 0 else -1.0
        rows.append({"date": f"d{i}", "ts": ts0 + i * step,
                     "open": price, "high": price + 1.5, "low": price - 1.5,
                     "close": price, "volume": 1000.0})
    return rows


@pytest.fixture
def upstream(monkeypatch):
    """Record every upstream call and answer with a synthetic series.

    Yields the call list; assign to `.fail_on` to make one interval blow up.
    """
    calls = []

    class Reader:
        fail_on = None

        def __call__(self, symbol, rng="3mo", interval="1d"):
            calls.append((symbol, rng, interval))
            if self.fail_on == interval:
                raise RuntimeError("upstream down")
            return _series()

    reader = Reader()
    monkeypatch.setattr(server, "get_ohlc_history", reader)

    # La cotización VIVA también, y no es opcional. El endpoint pide dos cosas
    # al proveedor: la serie (`get_ohlc_history`) y el precio de ahora
    # (`get_stock_data`), porque el reparto soporte/resistencia se decide contra
    # el segundo. Mockeando sólo la primera, la serie es sintética y el precio
    # es REAL, y entonces `currentPrice` no tiene nada que ver con la última
    # vela: `assert 309.87 == 100.0`.
    #
    # En el sandbox no se veía —ahí la red está cerrada, la llamada falla, el
    # endpoint cae al último cierre y la prueba pasa por el motivo equivocado—.
    # En CI hay red, y salió a la primera. Una prueba que depende de que la red
    # esté rota no es una prueba: es una moneda.
    monkeypatch.setattr(server, "get_stock_data",
                        lambda *a, **k: {"price": None})
    reader.calls = calls
    return reader


def test_an_empty_upstream_answers_with_the_full_shape(upstream, monkeypatch):
    """A scan that found nothing must carry the SAME keys as one that found
    everything. The client should never have to branch on response shape — and
    it used to have to: the no-rows path returned five keys out of twenty."""
    full = client.get(f"{SCAN}?interval=1d&period=6mo").json()
    monkeypatch.setattr(server, "get_ohlc_history", lambda *a, **k: [])
    empty = client.get(f"{SCAN}?interval=1d&period=6mo").json()

    assert empty["rowsScanned"] == 0
    assert set(empty) == set(full)
    assert set(empty["counts"]) == set(full["counts"])


def test_the_scan_also_reads_the_rung_above(upstream):
    """Confluence needs a second series. It is requested from the rung the
    ladder names as `higher`, with that rung's own default window."""
    body = client.get(f"{SCAN}?interval=1d&period=6mo").json()

    assert ("AAPL", "6mo", "1d") in upstream.calls
    assert any(interval == "1wk" for _, _, interval in upstream.calls)
    assert body["confluence"]["checked"] is True
    assert body["confluence"]["interval"] == "1wk"
    assert body["counts"]["confluent"] == body["confluence"]["matched"]


def test_htf_off_costs_exactly_one_upstream_call(upstream):
    body = client.get(f"{SCAN}?interval=1d&period=6mo&htf=0").json()

    assert len(upstream.calls) == 1
    assert body["confluence"]["checked"] is False
    assert body["counts"]["confluent"] is None


def test_a_failed_second_fetch_does_not_take_the_scan_down(upstream):
    """The confluence read is a bonus. If it fails, the main scan still lands,
    and the response says 'not checked' — never 'checked, no confluence'."""
    upstream.fail_on = "1wk"
    body = client.get(f"{SCAN}?interval=1d&period=6mo").json()

    assert body["rowsScanned"] == 120
    assert body["levels"], "the main scan must still produce levels"
    assert body["confluence"]["checked"] is False
    assert body["counts"]["confluent"] is None


def test_the_top_of_the_ladder_has_nothing_to_compare_against(upstream):
    body = client.get(f"{SCAN}?interval=1mo&period=5y").json()

    assert len(upstream.calls) == 1
    assert body["confluence"]["checked"] is False


def test_the_four_hour_rung_is_requested_as_hourly_candles(upstream):
    """4h is composed out of 1h upstream — and its confluence partner is the
    daily rung, which IS served directly."""
    body = client.get(f"{SCAN}?interval=4h&period=6mo").json()

    assert ("AAPL", "6mo", "1h") in upstream.calls
    assert body["aggregatedFrom"] == "1h"
    assert body["confluence"]["interval"] in (None, "1d")


def test_the_response_carries_the_bars_the_read_was_computed_on(upstream):
    """La tira de prueba no puede dibujar una serie distinta de la escaneada.

    El endpoint publica `bars` (la cola de lo escaneado) y `barsOffset`. Sin el
    desplazamiento, los pivotes —que vienen indexados sobre la serie COMPLETA—
    se pintarían corridos, y un pivote mal puesto invalida el dibujo entero.
    """
    r = client.get(f"{SCAN}?interval=1d&period=6mo&htf=0").json()

    assert r["bars"], "una lectura con velas tiene que publicar las velas"
    assert set(r["bars"][0]) == {"t", "o", "h", "l", "c"}
    assert r["barsOffset"] + len(r["bars"]) == r["rowsScanned"], (
        "la cola enviada tiene que terminar en la última vela escaneada")

    # El precio publicado es el cierre de la última vela enviada.
    assert r["currentPrice"] == round(r["bars"][-1]["c"], 6)

    # Y cada pivote visible cae sobre su propia vela.
    for s in r["swings"]:
        i = s["index"] - r["barsOffset"]
        if 0 <= i < len(r["bars"]):
            vela = r["bars"][i]
            assert s["price"] == round(vela["h"] if s["type"] == "high" else vela["l"], 6)


def test_a_scan_without_candles_draws_nothing_instead_of_inventing_a_chart(monkeypatch):
    """Proveedor sin datos: `bars` vacío. La tira no se pinta, no se rellena."""
    monkeypatch.setattr(server, "get_ohlc_history", lambda *a, **k: [])
    r = client.get(f"{SCAN}?interval=1d&period=6mo").json()
    assert r["bars"] == [] and r["barsOffset"] == 0
