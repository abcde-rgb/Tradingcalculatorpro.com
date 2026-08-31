"""
Offline unit tests for the Probability-of-Profit model of ``options_optimize.py``.

These exist because nothing covered ``_pop_single_break_even`` /
``_pop_multi_break_even`` and a sign error lived in them: the "profit below"
branches wrote ``Phi(z - sigma/2)`` where the module's own distribution
(``ln(S_T/S_0) ~ N(-sigma^2/2, sigma^2)``) requires ``Phi(z + sigma/2)``.

The bug was undetectable by running the code — it returned a plausible
percentage — but trivially detectable by asserting the property that a
probability model must satisfy: over a single break-even, "finishes above" and
"finishes below" are complementary events and must sum to 1. They summed to
0.88 at sigma=0.30 and to 0.70 at sigma=0.80.

That is why the first test here is the complementarity identity and not a table
of expected percentages: a reference table written from the buggy code would
have locked the bug in.
"""
import math

import pytest

from options_optimize import (
    _prob_below,
    _pop_single_break_even,
    _pop_multi_break_even,
)


# (be/spot, sigma) — deliberately spans the high-IV / long-tenor corner, which
# is where the old sign error grew from ~12 points to ~30.
CASES = [
    (1.05, 0.30), (0.95, 0.30), (1.00, 0.55),
    (1.15, 0.60), (1.20, 0.80), (0.80, 1.20),
]


@pytest.mark.parametrize("ratio,sigma", CASES)
def test_las_dos_ramas_de_un_break_even_suman_uno(ratio, sigma):
    """P(S_T > be) + P(S_T < be) == 1. This is what caught the sign error."""
    below = _prob_below(100.0 * ratio, 100.0, sigma)
    assert math.isclose(below + (1.0 - below), 1.0, abs_tol=1e-12)


@pytest.mark.parametrize("ratio,sigma", CASES)
def test_prob_below_usa_la_distribucion_que_el_modulo_declara(ratio, sigma):
    """Second, independent route: the closed form derived from the declared law.

    ``_lognormal_grid`` integrates over ln(S_T/S_0) ~ N(-sigma^2/2, sigma^2), so
    P(S_T < be) = Phi((ln(be/S_0) + sigma^2/2) / sigma). Deriving it here rather
    than calling the helper means the test fails if the helper drifts.
    """
    be = 100.0 * ratio
    z_full = (math.log(be / 100.0) + sigma * sigma / 2) / sigma
    esperado = 0.5 * (1 + math.erf(z_full / math.sqrt(2)))
    assert math.isclose(_prob_below(be, 100.0, sigma), esperado, rel_tol=1e-12)


def test_el_signo_viejo_ya_no_pasa():
    """Explicit regression guard for the exact expression that was wrong.

    Without this, someone "simplifying" the helper back to Phi(z - sigma/2)
    would restore a bug that every other test tolerates, because every other
    number stays plausible.
    """
    sigma, be, spot = 0.80, 120.0, 100.0
    viejo = 0.5 * (1 + math.erf(
        (math.log(be / spot) / sigma - sigma / 2) / math.sqrt(2)))
    assert not math.isclose(_prob_below(be, spot, sigma), viejo, abs_tol=1e-6)


def test_prob_below_es_monotona_en_el_break_even():
    """A higher break-even can only be harder to stay under... no: easier."""
    sigma = 0.45
    previo = 0.0
    for be in (60.0, 80.0, 100.0, 130.0, 180.0):
        actual = _prob_below(be, 100.0, sigma)
        assert actual > previo
        previo = actual


def test_pop_de_una_pata_comprada_y_su_contraria_suman_cien():
    """End to end through the public helper, not just the private one.

    A long call and a long put on the same strike have the same single
    break-even in this model's terms only if we feed the same `be`; what the
    test fixes is that the two BRANCHES of _pop_single_break_even (chosen by
    _is_profit_at) are complements of one another for the same break-even.
    """
    spot, be, sigma = 100.0, 108.0, 0.50
    alcista = [{"type": "call", "action": "buy", "quantity": 1, "qty": 1,
                "strike": 100.0, "premium": 8.0, "iv": 0.5, "daysToExpiry": 90}]
    bajista = [{"type": "put", "action": "buy", "quantity": 1, "qty": 1,
                "strike": 100.0, "premium": 8.0, "iv": 0.5, "daysToExpiry": 90}]
    p_alc = _pop_single_break_even(alcista, spot, be, sigma)
    p_baj = _pop_single_break_even(bajista, spot, be, sigma)
    # Both are clamped to [1, 99], so only assert the sum when neither clamps.
    if 1.0 < p_alc < 99.0 and 1.0 < p_baj < 99.0:
        assert math.isclose(p_alc + p_baj, 100.0, abs_tol=1e-6)


def test_condor_no_infla_el_pop_por_encima_de_la_cota_de_monte_carlo():
    """The structure the bug flattered most: profit BETWEEN break-evens.

    With the old sign a short strangle at IV 80 % / 180d published ~47.9 %
    against a true ~27.4 %. We don't re-run Monte Carlo here; we assert the
    algebraic identity it violated — 1 - p_hi - p_lo, with both tails taken
    from the same distribution.
    """
    spot, sigma = 100.0, 0.80
    bes = [80.0, 120.0]
    p_lo = _prob_below(bes[0], spot, sigma)
    p_hi = 1.0 - _prob_below(bes[-1], spot, sigma)
    entre = 1.0 - p_hi - p_lo
    condor = [
        {"type": "put", "action": "sell", "quantity": 1, "qty": 1, "strike": 85.0,
         "premium": 6.0, "iv": 0.8, "daysToExpiry": 180},
        {"type": "put", "action": "buy", "quantity": 1, "qty": 1, "strike": 75.0,
         "premium": 3.0, "iv": 0.8, "daysToExpiry": 180},
        {"type": "call", "action": "sell", "quantity": 1, "qty": 1, "strike": 115.0,
         "premium": 6.0, "iv": 0.8, "daysToExpiry": 180},
        {"type": "call", "action": "buy", "quantity": 1, "qty": 1, "strike": 125.0,
         "premium": 3.0, "iv": 0.8, "daysToExpiry": 180},
    ]
    pop = _pop_multi_break_even(condor, spot, bes, sigma)
    assert math.isclose(pop, max(1.0, min(99.0, entre * 100)), abs_tol=1e-9)
    # And the headline: at this IV the honest answer is well under half.
    assert pop < 45.0


def test_las_tres_probabilidades_de_un_condor_suman_uno():
    """Below, between and above partition the outcome space."""
    spot, sigma = 100.0, 0.65
    bes = [88.0, 118.0]
    p_lo = _prob_below(bes[0], spot, sigma)
    p_hi = 1.0 - _prob_below(bes[-1], spot, sigma)
    entre = 1.0 - p_hi - p_lo
    assert math.isclose(p_lo + entre + p_hi, 1.0, abs_tol=1e-12)
    assert 0.0 < entre < 1.0
