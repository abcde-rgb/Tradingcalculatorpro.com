"""American option pricing — early exercise, which Black-Scholes cannot see.

Every option on a US single stock is **American**: it can be exercised at any
moment up to expiry, not only at expiry. Black-Scholes-Merton prices the
European case, so on its own it systematically misses one very real, very
frequent event — a short call on a dividend-paying stock being assigned the day
before the ex-dividend date, because exercising early captures a dividend worth
more than the option's remaining time value.

Two independent methods, because each is right where the other is weak:

* **Cox-Ross-Rubinstein binomial** — exact in the limit, handles discrete
  dividends and any exercise policy, and gives the early-exercise boundary. Slow
  (O(n²)); used when accuracy matters.
* **Barone-Adesi-Whaley** quadratic approximation — a closed form that adds an
  early-exercise premium on top of BSM. Fast enough for a whole chain; accurate
  to a cent or two away from the boundary.

For a non-dividend-paying stock an American CALL is never worth exercising
early, so its value equals the European one. That identity is a useful check and
is pinned by a test.
"""
from __future__ import annotations

import math
from typing import Optional

from options_math import (
    option_price, call_price, put_price, delta, gamma_val, theta_val, vega_val,
    DEFAULT_RISK_FREE, SECONDS_PER_YEAR,
)
from scipy.stats import norm

# More steps converge closer to the true value at O(n²) cost. 200 puts the
# error well under a cent for ordinary equity options.
DEFAULT_BINOMIAL_STEPS: int = 200
MAX_BINOMIAL_STEPS: int = 2000


def binomial_american(S: float, K: float, T: float, r: float, sigma: float,
                      option_type: str, q: float = 0.0,
                      steps: int = DEFAULT_BINOMIAL_STEPS) -> float:
    """Cox-Ross-Rubinstein binomial price for an American option.

    Backward induction over the tree, taking `max(continuation, intrinsic)` at
    every node — that comparison IS the early-exercise decision, and it is the
    thing BSM has no way to express.
    """
    if T <= 0:
        return max(0.0, S - K) if option_type == "call" else max(0.0, K - S)
    if S <= 0 or K <= 0 or sigma <= 0:
        return 0.0

    n = max(1, min(MAX_BINOMIAL_STEPS, int(steps)))
    dt = T / n
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    # Risk-neutral up-probability with continuous dividend yield q.
    p = (math.exp((r - q) * dt) - d) / (u - d)
    if not (0.0 < p < 1.0):
        # Degenerate tree (huge rate vs tiny vol): the lattice would produce
        # negative probabilities, so fall back to the European closed form
        # rather than return a number built from an invalid measure.
        return option_price(S, K, T, r, sigma, option_type, q)

    is_call = option_type == "call"
    # Terminal payoffs.
    values = []
    for i in range(n + 1):
        price = S * (u ** (n - i)) * (d ** i)
        values.append(max(0.0, price - K) if is_call else max(0.0, K - price))

    # Roll back, checking early exercise at every node.
    for step in range(n - 1, -1, -1):
        for i in range(step + 1):
            continuation = disc * (p * values[i] + (1 - p) * values[i + 1])
            price = S * (u ** (step - i)) * (d ** i)
            intrinsic = max(0.0, price - K) if is_call else max(0.0, K - price)
            values[i] = max(continuation, intrinsic)
    return values[0]


def _bjerksund_free_boundary(S: float, K: float, T: float, r: float, b: float,
                             sigma: float) -> float:
    """Critical stock price above which an American call should be exercised."""
    sigma2 = sigma * sigma
    beta = (0.5 - b / sigma2) + math.sqrt((b / sigma2 - 0.5) ** 2 + 2 * r / sigma2)
    b_inf = beta / (beta - 1) * K
    b_zero = max(K, r / max(r - b, 1e-12) * K) if r > b else K
    h = -(b * T + 2 * sigma * math.sqrt(T)) * (b_zero / max(b_inf - b_zero, 1e-12))
    return b_zero + (b_inf - b_zero) * (1 - math.exp(h))


def baw_american(S: float, K: float, T: float, r: float, sigma: float,
                 option_type: str, q: float = 0.0) -> float:
    """Barone-Adesi-Whaley approximation: European value + early-exercise premium.

    Closed form, so it is cheap enough to run across an entire chain. The premium
    term is what a European model prices at exactly zero.
    """
    if T <= 0:
        return max(0.0, S - K) if option_type == "call" else max(0.0, K - S)
    if S <= 0 or K <= 0 or sigma <= 0:
        return 0.0

    european = option_price(S, K, T, r, sigma, option_type, q)
    b = r - q  # cost of carry

    # A call on a non-dividend payer is never exercised early: no premium.
    if option_type == "call" and q <= 0:
        return european

    sigma2 = sigma * sigma
    M = 2 * r / sigma2
    N = 2 * b / sigma2
    k = 1 - math.exp(-r * T)
    if k <= 0:
        return european

    if option_type == "call":
        q2 = (-(N - 1) + math.sqrt((N - 1) ** 2 + 4 * M / k)) / 2
        s_star = _solve_critical_price(K, T, r, b, sigma, q2, "call")
        if s_star is None or S >= s_star:
            return max(european, S - K)
        d1 = (math.log(s_star / K) + (b + 0.5 * sigma2) * T) / (sigma * math.sqrt(T))
        A2 = (s_star / q2) * (1 - math.exp((b - r) * T) * norm.cdf(d1))
        return european + A2 * (S / s_star) ** q2

    q1 = (-(N - 1) - math.sqrt((N - 1) ** 2 + 4 * M / k)) / 2
    s_star = _solve_critical_price(K, T, r, b, sigma, q1, "put")
    if s_star is None or S <= s_star:
        return max(european, K - S)
    d1 = (math.log(s_star / K) + (b + 0.5 * sigma2) * T) / (sigma * math.sqrt(T))
    A1 = -(s_star / q1) * (1 - math.exp((b - r) * T) * norm.cdf(-d1))
    return european + A1 * (S / s_star) ** q1


def _solve_critical_price(K: float, T: float, r: float, b: float, sigma: float,
                          q_exp: float, option_type: str,
                          max_iter: int = 100) -> Optional[float]:
    """Newton solve for the BAW critical (early-exercise boundary) price."""
    sigma2 = sigma * sigma
    sqrt_t = math.sqrt(T)
    is_call = option_type == "call"

    # Seed near the strike and walk to the boundary.
    s = K * (1.2 if is_call else 0.8)
    for _ in range(max_iter):
        if s <= 0:
            return None
        european = (call_price if is_call else put_price)(s, K, T, r, sigma, r - b)
        d1 = (math.log(s / K) + (b + 0.5 * sigma2) * T) / (sigma * sqrt_t)
        if is_call:
            lhs = s - K
            bit = (1 - math.exp((b - r) * T) * norm.cdf(d1)) * s / q_exp
            rhs = european + bit
            slope = (1 - 1 / q_exp) * (1 - math.exp((b - r) * T) * norm.cdf(d1)) \
                + (math.exp((b - r) * T) * norm.pdf(d1)) / (sigma * sqrt_t) / q_exp
        else:
            lhs = K - s
            bit = -(1 - math.exp((b - r) * T) * norm.cdf(-d1)) * s / q_exp
            rhs = european + bit
            slope = -(1 - 1 / q_exp) * (1 - math.exp((b - r) * T) * norm.cdf(-d1)) \
                - (math.exp((b - r) * T) * norm.pdf(-d1)) / (sigma * sqrt_t) / q_exp
        diff = lhs - rhs
        if abs(diff) < 1e-6:
            return s
        denom = (1 if is_call else -1) - slope
        if abs(denom) < 1e-12:
            return None
        s -= diff / denom
    return s if s > 0 else None


def american_price(S: float, K: float, T: float, r: float, sigma: float,
                   option_type: str, q: float = 0.0, *,
                   method: str = "baw", steps: int = DEFAULT_BINOMIAL_STEPS) -> float:
    """American price via the requested method ('baw' | 'binomial')."""
    if method == "binomial":
        return binomial_american(S, K, T, r, sigma, option_type, q, steps)
    return baw_american(S, K, T, r, sigma, option_type, q)


def early_exercise_premium(S: float, K: float, T: float, r: float, sigma: float,
                           option_type: str, q: float = 0.0,
                           *, method: str = "baw") -> float:
    """How much of the price BSM cannot see. Never negative."""
    american = american_price(S, K, T, r, sigma, option_type, q, method=method)
    european = option_price(S, K, T, r, sigma, option_type, q)
    return max(0.0, american - european)


def american_greeks(S: float, K: float, T: float, r: float, sigma: float,
                    option_type: str, q: float = 0.0,
                    *, steps: int = DEFAULT_BINOMIAL_STEPS) -> dict:
    """Greeks by finite differences on the binomial tree.

    Analytic BSM Greeks are wrong for an American option near the exercise
    boundary, which is exactly where a short position gets assigned. Bumping the
    tree is slower but stays correct on both sides of the boundary.
    """
    h = max(S * 0.01, 0.01)
    p0 = binomial_american(S, K, T, r, sigma, option_type, q, steps)
    p_up = binomial_american(S + h, K, T, r, sigma, option_type, q, steps)
    p_dn = binomial_american(S - h, K, T, r, sigma, option_type, q, steps)

    d = (p_up - p_dn) / (2 * h)
    g = (p_up - 2 * p0 + p_dn) / (h * h)

    dt = min(1.0 / SECONDS_PER_YEAR, T / 2)
    theta = (binomial_american(S, K, T - dt, r, sigma, option_type, q, steps) - p0) / dt \
        / SECONDS_PER_YEAR if T > dt else 0.0

    dv = 0.01
    vega = (binomial_american(S, K, T, r, sigma + dv, option_type, q, steps) - p0) / dv / 100

    return {
        "price": round(p0, 4),
        "delta": round(d, 4),
        "gamma": round(g, 6),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
    }


# ---------------------------------------------------------------------------
# Dividend-driven early assignment — the event that actually costs money
# ---------------------------------------------------------------------------


def early_assignment_risk(S: float, K: float, T: float, r: float, sigma: float,
                          dividend: float, days_to_ex_dividend: Optional[int],
                          q: float = 0.0) -> dict:
    """Assess the risk of a SHORT CALL being assigned before an ex-dividend date.

    The classic rule of thumb: a short in-the-money call is at risk when the
    dividend about to be paid exceeds the call's remaining time value, because
    the holder does better exercising to capture the dividend than selling the
    option. `simulate_assignment` prices with a European model and therefore
    treats this as impossible — the position simply appears one morning as 100
    short shares plus a dividend the trader now owes.

    Returns a structured verdict rather than a bare number so the UI can explain
    *why*, and never claims certainty: assignment is the counterparty's choice,
    and not every holder exercises optimally.
    """
    if days_to_ex_dividend is None or dividend <= 0:
        return {
            "at_risk": False,
            "reason": "no_dividend",
            "detail": "No upcoming dividend, so there is no dividend-capture "
                      "incentive to exercise this call early.",
        }

    itm = S > K
    price = option_price(S, K, T, r, sigma, "call", q)
    intrinsic = max(0.0, S - K)
    time_value = max(0.0, price - intrinsic)

    at_risk = itm and dividend > time_value and 0 <= days_to_ex_dividend <= max(T * SECONDS_PER_YEAR, 0)

    return {
        "at_risk": bool(at_risk),
        "reason": "dividend_exceeds_time_value" if at_risk else (
            "out_of_the_money" if not itm else "time_value_exceeds_dividend"
        ),
        "dividend": round(dividend, 4),
        "time_value": round(time_value, 4),
        "intrinsic": round(intrinsic, 4),
        "days_to_ex_dividend": days_to_ex_dividend,
        "detail": (
            f"The ${dividend:.2f} dividend is larger than the ${time_value:.2f} of time "
            f"value left in this call. A rational holder exercises the day before the "
            f"ex-dividend date to capture it, so a short position here should expect "
            f"assignment — you would owe the dividend on the shares you deliver."
            if at_risk else
            f"${time_value:.2f} of time value still exceeds the ${dividend:.2f} dividend, "
            f"so exercising early would throw that value away. Early assignment is "
            f"unlikely, though it is always the counterparty's choice."
        ),
    }
