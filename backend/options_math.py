"""Black-Scholes-Merton Option Pricing and Greeks.

Supports continuous dividend yield q (BSM extension to handle dividend-paying stocks).
When q=0, this reduces to standard Black-Scholes. Default q=0 preserves backwards compat.

Refactored for clarity: complex functions split into helpers; full type hints.
"""
from __future__ import annotations
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from scipy.stats import norm

# ---------------------------------------------------------------------------
# Constants & dataclasses
# ---------------------------------------------------------------------------

# Static fallback only. Callers that price anything a user will act on should
# pass the live short rate (`market_rates.get_risk_free_rate()`); this constant
# exists so the pure-math layer stays importable and offline-testable.
DEFAULT_RISK_FREE: float = 0.04
DEFAULT_IV: float = 0.30
SHARES_PER_CONTRACT: int = 100
DAYS_PER_YEAR: int = 365  # días naturales; NO son días de mercado (serían 252)
# Alias retirado: se llamaba SECONDS_PER_YEAR y valía 365. Ni segundos ni
# días de mercado, como decía su comentario. Se mantiene por compatibilidad
# con cualquier importador externo que aún lo use.
SECONDS_PER_YEAR: int = DAYS_PER_YEAR

# Options expire at the close, 16:00 New York time.
MARKET_CLOSE_HOUR_ET: int = 16
_ET_FALLBACK_OFFSET = timedelta(hours=-4)  # used only if tzdata is unavailable


@dataclass
class AttributionParams:
    """Bundle of params for P&L attribution decomposition."""
    S0: float          # initial spot
    S1: float          # final spot
    T0: float          # initial time to expiry (years)
    T1: float          # final time to expiry (years)
    iv_change: float = 0.0
    r: float = DEFAULT_RISK_FREE
    q: float = 0.0


# ---------------------------------------------------------------------------
# Black-Scholes-Merton primitives
# ---------------------------------------------------------------------------


def _d1_d2(S: float, K: float, T: float, r: float, sigma: float,
           q: float = 0.0) -> tuple[Optional[float], Optional[float]]:
    """Compute d1 and d2 with continuous dividend yield q."""
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return None, None
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return d1, d2


def call_price(S: float, K: float, T: float, r: float, sigma: float,
               q: float = 0.0) -> float:
    """BSM call price."""
    if T <= 0:
        return max(0.0, S - K)
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    return S * math.exp(-q * T) * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)


def put_price(S: float, K: float, T: float, r: float, sigma: float,
              q: float = 0.0) -> float:
    """BSM put price."""
    if T <= 0:
        return max(0.0, K - S)
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    return K * math.exp(-r * T) * norm.cdf(-d2) - S * math.exp(-q * T) * norm.cdf(-d1)


def option_price(S: float, K: float, T: float, r: float, sigma: float,
                 option_type: str, q: float = 0.0) -> float:
    """Dispatch to call/put pricing."""
    if option_type == "call":
        return call_price(S, K, T, r, sigma, q)
    return put_price(S, K, T, r, sigma, q)


def delta(S: float, K: float, T: float, r: float, sigma: float,
          option_type: str, q: float = 0.0) -> float:
    if T <= 0:
        if option_type == "call":
            return 1.0 if S > K else 0.0
        return -1.0 if S < K else 0.0
    d1, _ = _d1_d2(S, K, T, r, sigma, q)
    if option_type == "call":
        return math.exp(-q * T) * norm.cdf(d1)
    return math.exp(-q * T) * (norm.cdf(d1) - 1)


def gamma_val(S: float, K: float, T: float, r: float, sigma: float,
              q: float = 0.0) -> float:
    if T <= 0:
        return 0.0
    d1, _ = _d1_d2(S, K, T, r, sigma, q)
    return math.exp(-q * T) * norm.pdf(d1) / (S * sigma * math.sqrt(T))


def theta_val(S: float, K: float, T: float, r: float, sigma: float,
              option_type: str, q: float = 0.0) -> float:
    if T <= 0:
        return 0.0
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    term1 = -(S * math.exp(-q * T) * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))
    if option_type == "call":
        rest = -r * K * math.exp(-r * T) * norm.cdf(d2) + q * S * math.exp(-q * T) * norm.cdf(d1)
    else:
        rest = r * K * math.exp(-r * T) * norm.cdf(-d2) - q * S * math.exp(-q * T) * norm.cdf(-d1)
    return (term1 + rest) / DAYS_PER_YEAR


def vega_val(S: float, K: float, T: float, r: float, sigma: float,
             q: float = 0.0) -> float:
    if T <= 0:
        return 0.0
    d1, _ = _d1_d2(S, K, T, r, sigma, q)
    return (S * math.exp(-q * T) * math.sqrt(T) * norm.pdf(d1)) / 100


def rho_val(S: float, K: float, T: float, r: float, sigma: float,
            option_type: str, q: float = 0.0) -> float:
    if T <= 0:
        return 0.0
    _, d2 = _d1_d2(S, K, T, r, sigma, q)
    if option_type == "call":
        return (K * T * math.exp(-r * T) * norm.cdf(d2)) / 100
    return -(K * T * math.exp(-r * T) * norm.cdf(-d2)) / 100


# ---------------------------------------------------------------------------
# Time to expiry
# ---------------------------------------------------------------------------


def _now_et(now: Optional[datetime] = None) -> datetime:
    """Current time in the New York session's timezone."""
    base = now or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    try:
        from zoneinfo import ZoneInfo
        return base.astimezone(ZoneInfo("America/New_York"))
    except Exception:  # noqa: BLE001 — no tzdata in the image; approximate
        return base.astimezone(timezone(_ET_FALLBACK_OFFSET))


def year_fraction(days_to_expiry: float, now: Optional[datetime] = None) -> float:
    """Time to expiry in years, aware of the hour of the day.

    `days_to_expiry / 365` holds T flat for the whole session, which is
    harmless at 30 days and wrong at zero: on expiry day theta and gamma change
    by the hour, and a flat 1/365 prices a 0DTE contract at 10:00 exactly like
    the same contract at 15:55. Expiry lands at the 16:00 ET close, so the
    remaining time is `days_to_expiry` plus whatever is left of today's session.

    Floored just above zero so downstream `T <= 0` branches only fire for
    genuinely expired contracts.
    """
    et = _now_et(now)
    fraction_of_day_now = (et.hour + et.minute / 60 + et.second / 3600) / 24
    fraction_at_close = MARKET_CLOSE_HOUR_ET / 24
    remaining_days = float(days_to_expiry) + fraction_at_close - fraction_of_day_now
    return max(remaining_days, 1.0 / 24 / DAYS_PER_YEAR) / DAYS_PER_YEAR


# ---------------------------------------------------------------------------
# Implied volatility solver
# ---------------------------------------------------------------------------

IV_MIN: float = 0.001
IV_MAX: float = 5.0
# Below this, a 1-percentage-point change in IV moves the option price by less
# than half a cent — under the tick size of any real quote. At that point the
# price carries no information about volatility and any "solution" is an
# arbitrary point on a flat plateau.
MIN_IDENTIFIABLE_VEGA: float = 0.005


def implied_volatility(market_price: float, S: float, K: float, T: float, r: float,
                       option_type: str, q: float = 0.0,
                       *, tol: float = 1e-6, max_iter: int = 100) -> Optional[float]:
    """Back out implied volatility from an observed option price.

    Newton-Raphson on vega, falling back to bisection whenever Newton misbehaves
    — which it does for deep ITM/OTM strikes, where vega collapses toward zero
    and the step explodes. Bisection is slower but cannot diverge, so the pair
    covers the whole surface.

    Returns None when the answer is not recoverable rather than inventing one:
    an expired or zero-strike contract; a quote outside the no-arbitrage bounds
    (below intrinsic value, or above the underlying); or a contract so deep
    in-the-money that its price is effectively flat in sigma, where any figure
    the solver lands on is an artefact of the tolerance, not a measurement.
    """
    if T <= 0 or S <= 0 or K <= 0 or market_price is None or market_price <= 0:
        return None

    # No-arbitrage bounds: price must sit between intrinsic and the max value.
    disc_s, disc_k = S * math.exp(-q * T), K * math.exp(-r * T)
    if option_type == "call":
        lower, upper = max(0.0, disc_s - disc_k), disc_s
    else:
        lower, upper = max(0.0, disc_k - disc_s), disc_k
    if market_price < lower - tol or market_price > upper + tol:
        return None

    def price_at(sigma: float) -> float:
        return option_price(S, K, T, r, sigma, option_type, q)

    def identifiable(sigma: float) -> bool:
        """Is the price actually sensitive to volatility at this point?"""
        return vega_val(S, K, T, r, sigma, q) >= MIN_IDENTIFIABLE_VEGA

    def finish(sigma: float) -> Optional[float]:
        return round(sigma, 6) if identifiable(sigma) else None

    # Newton-Raphson from a moneyness-aware seed (Brenner-Subrahmanyam style).
    sigma = max(IV_MIN, min(IV_MAX, math.sqrt(2 * math.pi / T) * market_price / S))
    for _ in range(max_iter):
        diff = price_at(sigma) - market_price
        if abs(diff) < tol:
            return finish(sigma)
        # vega_val is per 1% move; undo the scaling for the raw derivative.
        v = vega_val(S, K, T, r, sigma, q) * 100
        if v < 1e-8:
            break  # flat in sigma — hand over to bisection
        step = diff / v
        sigma -= step
        if not (IV_MIN <= sigma <= IV_MAX) or sigma != sigma:  # out of range / NaN
            break

    # Bisection over the full admissible range. Converges on the WIDTH of the
    # sigma bracket, not on the price difference: on a near-flat plateau the
    # price test is satisfied across a wide band of volatilities, so stopping on
    # it returns whichever point the walk happened to reach.
    lo, hi = IV_MIN, IV_MAX
    if (price_at(lo) - market_price) * (price_at(hi) - market_price) > 0:
        return None  # price not attainable anywhere in [IV_MIN, IV_MAX]
    for _ in range(max_iter):
        mid = (lo + hi) / 2
        if (hi - lo) < tol:
            return finish(mid)
        if price_at(mid) - market_price > 0:
            hi = mid
        else:
            lo = mid
    return finish((lo + hi) / 2)


# Second-order Greeks (vanna, charm) — dealer-positioning analytics.
# Raw analytical derivatives (verified vs. finite differences of delta):
#   vanna_val = ∂Δ/∂σ   (per 1.00 of vol; divide by 100 for "per 1% IV")
#   charm_val = ∂Δ/∂t    (per YEAR of calendar time; divide by 365 for "per day")
# Same for call and put where the constant term drops (vanna is identical).
# ---------------------------------------------------------------------------


def vanna_val(S: float, K: float, T: float, r: float, sigma: float,
              q: float = 0.0) -> float:
    """Vanna = ∂Delta/∂sigma = ∂Vega/∂S. Identical for call and put."""
    if T <= 0 or sigma <= 0:
        return 0.0
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    return -math.exp(-q * T) * norm.pdf(d1) * d2 / sigma


def charm_val(S: float, K: float, T: float, r: float, sigma: float,
              option_type: str, q: float = 0.0) -> float:
    """Charm = ∂Delta/∂t (calendar time, per year). Also called delta decay."""
    if T <= 0 or sigma <= 0:
        return 0.0
    d1, d2 = _d1_d2(S, K, T, r, sigma, q)
    common = math.exp(-q * T) * norm.pdf(d1) * (2 * (r - q) * T - d2 * sigma * math.sqrt(T)) / (2 * T * sigma * math.sqrt(T))
    if option_type == "call":
        return q * math.exp(-q * T) * norm.cdf(d1) - common
    return -q * math.exp(-q * T) * norm.cdf(-d1) - common


def calculate_second_order_greeks(legs: list[dict], stock_price: float,
                                  r: float = DEFAULT_RISK_FREE, q: float = 0.0) -> dict[str, float]:
    """Aggregate vanna and charm for a multi-leg strategy (mirrors calculate_greeks).
    Returned per-position: vanna in Δ per 1% IV, charm in Δ per day (practical units).

    El docstring decía "mirrors calculate_greeks" y no lo hacía: el reloj era
    `max(dias, 1) / 365` mientras las griegas de primer orden usan
    `year_fraction()`, que sabe la hora del día. En 0DTE eso son 0,21 h contra
    24 h —115× de diferencia en T— y el charm salía 10 veces menor justo el día
    en que el charm es la métrica que importa. El suelo `max(..., 1)` valoraba
    además una pata ya vencida como si le quedara un día entero.
    """
    total = {"vanna": 0.0, "charm": 0.0}
    for leg in legs:
        if leg.get("type") == "stock":
            continue
        multiplier = 1 if leg["action"] == "buy" else -1
        qty = _leg_qty(leg)
        T = year_fraction(leg.get("daysToExpiry", 30))
        iv = leg.get("iv", DEFAULT_IV)
        K = leg["strike"]
        otype = leg["type"]
        total["vanna"] += (vanna_val(stock_price, K, T, r, iv, q) / 100) * multiplier * qty
        total["charm"] += (charm_val(stock_price, K, T, r, iv, otype, q) / SECONDS_PER_YEAR) * multiplier * qty
    return {k: round(v, 4) for k, v in total.items()}


# ---------------------------------------------------------------------------
# Synthetic chain generator (split into clear helpers)
# ---------------------------------------------------------------------------


def _strike_step(price: float) -> float:
    """Determine canonical strike step based on current price level."""
    if price < 20:
        return 0.5
    if price < 50:
        return 1.0
    if price < 200:
        return 2.5
    if price < 500:
        return 5.0
    return 10.0


def _smile_iv(spot: float, strike: float, base_iv: float = DEFAULT_IV) -> float:
    """Compute IV at a given strike using a simple parabolic smile."""
    moneyness = math.log(spot / strike) if strike > 0 else 0.0
    iv = base_iv + 0.05 * (moneyness ** 2) * 10
    return max(0.05, min(1.5, iv))


def _build_strike_quote(spot: float, strike: float, T: float, r: float,
                       q: float, opt_type: str) -> dict:
    """Build a single side (call or put) quote dict for a strike.

    Prices and Greeks are model output from an assumed volatility smile — a
    defensible approximation, clearly labelled `synthetic`. Volume and open
    interest are **None**: they are observations of what other participants
    actually did, and there is no model that produces them. An earlier version
    filled them with `rng.randint(...)`, which meant every downstream
    volume/open-interest ratio (the whole basis of "unusual activity") was
    reading random numbers.
    """
    iv = _smile_iv(spot, strike)
    price = option_price(spot, strike, T, r, iv, opt_type, q)
    d = delta(spot, strike, T, r, iv, opt_type, q)
    g = gamma_val(spot, strike, T, r, iv, q)
    th = theta_val(spot, strike, T, r, iv, opt_type, q)
    v = vega_val(spot, strike, T, r, iv, q)
    spread = max(0.01, price * 0.025)
    return {
        "bid": round(max(0.01, price - spread), 2),
        "ask": round(price + spread, 2),
        "mid": round(price, 2),
        "last": round(price, 2),
        "volume": None,
        "openInterest": None,
        "iv": round(iv, 4),
        "delta": round(d, 4),
        "gamma": round(g, 6),
        "theta": round(th, 4),
        "vega": round(v, 4),
        "synthetic": True,
    }


def generate_options_chain(current_price: float, days_to_expiry: int,
                           q: float = 0.0, r: Optional[float] = None) -> list[dict]:
    """Generate a synthetic options chain when real data is unavailable.

    Every quote carries `synthetic: True`. Callers must propagate that to the
    API response so the UI can warn — a modelled chain is fine to explore with
    and unacceptable to trade off unlabelled.
    """
    step = _strike_step(current_price)
    base_strike = round(current_price / step) * step
    T = year_fraction(days_to_expiry)
    rate = DEFAULT_RISK_FREE if r is None else r

    chain: list[dict] = []
    for i in range(-15, 16):
        strike = round(base_strike + i * step, 2)
        if strike <= 0:
            continue
        chain.append({
            "strike": strike,
            "call": _build_strike_quote(current_price, strike, T, rate, q, "call"),
            "put": _build_strike_quote(current_price, strike, T, rate, q, "put"),
        })
    return chain


# ---------------------------------------------------------------------------
# Payoff calculation
# ---------------------------------------------------------------------------


def _leg_qty(leg: dict) -> int:
    """Return contract quantity, supporting legacy 'qty' key."""
    return leg.get("quantity", leg.get("qty", 1))


def _leg_pnl_at_price(leg: dict, price: float, T: float, r: float, q: float) -> tuple[float, float]:
    """Return (current_pnl, expiry_pnl) for one leg at a given underlying price."""
    multiplier = 1 if leg["action"] == "buy" else -1
    qty = _leg_qty(leg)

    if leg["type"] == "stock":
        delta_p = (price - leg.get("entry_price", leg.get("strike", price))) * multiplier * qty
        return delta_p, delta_p

    premium = leg.get("premium", 0)
    iv = leg.get("iv", DEFAULT_IV)
    strike = leg["strike"]
    current = option_price(price, strike, T, r, iv, leg["type"], q)
    expiry = option_price(price, strike, 0, r, iv, leg["type"], q)
    cur_pnl = (current - premium) * multiplier * qty * SHARES_PER_CONTRACT
    exp_pnl = (expiry - premium) * multiplier * qty * SHARES_PER_CONTRACT
    return cur_pnl, exp_pnl


def calculate_payoff(legs: list[dict], stock_price: float, price_range: float = 0.35,
                     days_to_chart: int = 30, r: float = DEFAULT_RISK_FREE,
                     fee_per_contract: float = 0.0, q: float = 0.0) -> list[dict]:
    """Calculate strategy P&L across a price range.

    fee_per_contract: brokerage commission per option contract per side
                     (e.g., $0.65 typical Tastytrade). Applied on entry only.
    q: continuous dividend yield (e.g., 0.005 for AAPL). Default 0.
    """
    min_price = stock_price * (1 - price_range)
    max_price = stock_price * (1 + price_range)
    n_points = 200
    step = (max_price - min_price) / n_points

    total_open_fees = sum(
        _leg_qty(leg) * fee_per_contract for leg in legs if leg.get("type") != "stock"
    )

    T_current = max(days_to_chart / DAYS_PER_YEAR, 0.0)
    points: list[dict] = []
    for i in range(n_points + 1):
        price = min_price + i * step
        cur = exp = 0.0
        for leg in legs:
            cur_pnl, exp_pnl = _leg_pnl_at_price(leg, price, T_current, r, q)
            cur += cur_pnl
            exp += exp_pnl
        points.append({
            "price": round(price, 2),
            "pnl": round(cur - total_open_fees, 2),
            "pnlAtExpiry": round(exp - total_open_fees, 2),
        })
    return points


def far_upside_slope(legs: list[dict]) -> float:
    """Slope of the payoff (€ per €1 of underlying) in the limit S → ∞.

    Structural, not sampled: far above every strike a call behaves like the
    stock itself (delta → 1) and a put is worthless (delta → 0). Sign of this
    number is the whole answer to "is this position unbounded?", and it holds
    for a leg that still has time value at the front expiry — a calendar's back
    month — because it is a statement about the limit, not about a price grid.
    """
    slope = 0.0
    for leg in legs or []:
        sign = 1 if leg.get("action") == "buy" else -1
        qty = _leg_qty(leg)
        if leg.get("type") == "call":
            slope += sign * qty * SHARES_PER_CONTRACT
        elif leg.get("type") == "stock":
            slope += sign * qty
    return slope


def payoff_bounds(legs: list[dict], stock_price: float,
                  r: float = DEFAULT_RISK_FREE,
                  fee_per_contract: float = 0.0, q: float = 0.0) -> dict:
    """Best and worst case of the expiry payoff. `None` means unbounded.

    Taking max()/min() over `calculate_payoff` cannot answer this: that grid
    stops at ±35% of spot, so a long call's "max profit" came out as whatever
    P&L happened to sit at the right edge of the chart, and a naked short
    call's "max loss" the same. Both are unbounded, and printing a finite
    number for them is exactly the kind of figure a trader sizes a position
    with. Unbounded is reported as `None`, never as a number.

    The bounded side is exact here: `_leg_pnl_at_price` prices the expiry leg
    at T=0 whatever its own expiry, so the payoff is piecewise linear with
    kinks only at the strikes and its extreme sits at a strike or at S=0 —
    both sampled. The extra sampling in between costs nothing and keeps the
    function honest if that ever stops being true.
    """
    if not legs:
        return {"maxProfit": None, "maxLoss": None,
                "isMaxProfitUnlimited": False, "isMaxLossUnlimited": False}

    slope = far_upside_slope(legs)
    strikes = [leg["strike"] for leg in legs
               if leg.get("type") != "stock" and leg.get("strike") is not None]

    total_open_fees = sum(
        _leg_qty(leg) * fee_per_contract for leg in legs if leg.get("type") != "stock"
    )

    def pnl_at(price: float) -> float:
        total = 0.0
        for leg in legs:
            total += _leg_pnl_at_price(leg, price, 0.0, r, q)[1]
        return total - total_open_fees

    # S = 0 and every strike are the kinks; the rest is for curved payoffs.
    ceiling = max([stock_price or 0.0] + strikes + [1.0]) * 3.0
    prices = {0.0, *strikes}
    steps = 400
    prices.update(ceiling * i / steps for i in range(steps + 1))

    values = [pnl_at(p) for p in sorted(prices)]
    values = [v for v in values if math.isfinite(v)]
    if not values:
        return {"maxProfit": None, "maxLoss": None,
                "isMaxProfitUnlimited": False, "isMaxLossUnlimited": False}

    return {
        "maxProfit": None if slope > 0 else max(values),
        "maxLoss": None if slope < 0 else min(values),
        "isMaxProfitUnlimited": slope > 0,
        "isMaxLossUnlimited": slope < 0,
    }


def find_break_evens(payoff_data: list[dict]) -> list[float]:
    """Find break-even points where P&L crosses zero."""
    break_evens: list[float] = []
    for i in range(1, len(payoff_data)):
        prev = payoff_data[i - 1]["pnlAtExpiry"]
        curr = payoff_data[i]["pnlAtExpiry"]
        if (prev <= 0 and curr >= 0) or (prev >= 0 and curr <= 0):
            denom = abs(prev) + abs(curr)
            ratio = abs(prev) / denom if denom > 0 else 0.5
            be = (payoff_data[i - 1]["price"]
                  + ratio * (payoff_data[i]["price"] - payoff_data[i - 1]["price"]))
            break_evens.append(round(be, 2))
    return break_evens


# ---------------------------------------------------------------------------
# Aggregate Greeks
# ---------------------------------------------------------------------------


def calculate_greeks(legs: list[dict], stock_price: float,
                     r: float = DEFAULT_RISK_FREE, q: float = 0.0) -> dict[str, float]:
    """Calculate aggregate Greeks for a strategy."""
    total = {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}
    for leg in legs:
        multiplier = 1 if leg["action"] == "buy" else -1
        qty = _leg_qty(leg)
        if leg["type"] == "stock":
            total["delta"] += multiplier * qty / SHARES_PER_CONTRACT
            continue
        # Mismo reloj que el precio. Antes era `días / 365` a secas, así que el
        # panel de griegas y la valoración miraban relojes distintos: en un 0DTE
        # la diferencia es la que va de un día entero a las horas que quedan de
        # sesión, que es justo cuando gamma y theta se mueven de verdad.
        T = year_fraction(max(leg.get("daysToExpiry", 30), 0))
        iv = leg.get("iv", DEFAULT_IV)
        K = leg["strike"]
        otype = leg["type"]
        total["delta"] += delta(stock_price, K, T, r, iv, otype, q) * multiplier * qty
        total["gamma"] += gamma_val(stock_price, K, T, r, iv, q) * multiplier * qty
        total["theta"] += theta_val(stock_price, K, T, r, iv, otype, q) * multiplier * qty
        total["vega"] += vega_val(stock_price, K, T, r, iv, q) * multiplier * qty
        total["rho"] += rho_val(stock_price, K, T, r, iv, otype, q) * multiplier * qty
    return {k: round(v, 4) for k, v in total.items()}


# ---------------------------------------------------------------------------
# P&L Attribution (refactored: small helpers + dataclass)
# ---------------------------------------------------------------------------


def _stock_attribution(leg: dict, dS: float) -> tuple[float, float]:
    """Stock leg contributes only to delta_pnl. Returns (delta_pnl, total_actual)."""
    qty = _leg_qty(leg)
    sign = 1 if leg["action"] == "buy" else -1
    p = sign * qty * dS
    return p, p


def _option_leg_attribution(leg: dict, p: AttributionParams,
                            dT_days: float) -> dict[str, float]:
    """Compute per-leg P&L attribution contributions. Returns 5 figures."""
    K = leg["strike"]
    sigma0 = leg.get("iv", DEFAULT_IV)
    sigma1 = max(0.01, sigma0 + p.iv_change)
    otype = leg["type"]
    sign = 1 if leg["action"] == "buy" else -1
    qty = _leg_qty(leg) * SHARES_PER_CONTRACT

    d_ = delta(p.S0, K, p.T0, p.r, sigma0, otype, p.q)
    g_ = gamma_val(p.S0, K, p.T0, p.r, sigma0, p.q)
    th_ = theta_val(p.S0, K, p.T0, p.r, sigma0, otype, p.q)  # daily already
    v_ = vega_val(p.S0, K, p.T0, p.r, sigma0, p.q)            # per +1% IV

    dS = p.S1 - p.S0
    delta_pnl = sign * qty * d_ * dS
    gamma_pnl = sign * qty * 0.5 * g_ * dS * dS
    theta_pnl = sign * qty * th_ * dT_days
    vega_pnl = sign * qty * v_ * (p.iv_change * 100)

    v0 = option_price(p.S0, K, p.T0, p.r, sigma0, otype, p.q) * qty * sign
    v1 = option_price(p.S1, K, p.T1, p.r, sigma1, otype, p.q) * qty * sign

    return {
        "delta": delta_pnl,
        "gamma": gamma_pnl,
        "theta": theta_pnl,
        "vega": vega_pnl,
        "actual": v1 - v0,
    }


def calculate_pnl_attribution(legs: list[dict], S0: float, S1: float, T0: float, T1: float,
                              IV_change: float = 0.0, r: float = DEFAULT_RISK_FREE,
                              q: float = 0.0) -> dict[str, float]:
    """Decompose total P&L into Greek contributions (Δ/Γ/Θ/ν).

    Returns dict with delta_pnl, gamma_pnl, theta_pnl, vega_pnl, total_explained,
    total_actual (full revaluation), residual, dS, dT_days, dIV_pct.
    """
    p = AttributionParams(S0=S0, S1=S1, T0=T0, T1=T1, iv_change=IV_change, r=r, q=q)
    dT_days = (T0 - T1) * DAYS_PER_YEAR
    dS = S1 - S0

    delta_pnl = gamma_pnl = theta_pnl = vega_pnl = 0.0
    total_actual = 0.0

    for leg in legs:
        if leg.get("type") == "stock":
            d_, t_ = _stock_attribution(leg, dS)
            delta_pnl += d_
            total_actual += t_
            continue
        contrib = _option_leg_attribution(leg, p, dT_days)
        delta_pnl += contrib["delta"]
        gamma_pnl += contrib["gamma"]
        theta_pnl += contrib["theta"]
        vega_pnl += contrib["vega"]
        total_actual += contrib["actual"]

    total_explained = delta_pnl + gamma_pnl + theta_pnl + vega_pnl
    residual = total_actual - total_explained

    return {
        "delta_pnl": round(delta_pnl, 2),
        "gamma_pnl": round(gamma_pnl, 2),
        "theta_pnl": round(theta_pnl, 2),
        "vega_pnl": round(vega_pnl, 2),
        "total_explained": round(total_explained, 2),
        "total_actual": round(total_actual, 2),
        "residual": round(residual, 2),
        "dS": round(dS, 2),
        "dT_days": round(dT_days, 2),
        "dIV_pct": round(IV_change * 100, 2),
    }


# ---------------------------------------------------------------------------
# Assignment / Exercise simulation (refactored into small handlers)
# ---------------------------------------------------------------------------


def _is_itm(option_type: str, strike: float, spot: float) -> bool:
    return spot > strike if option_type == "call" else spot < strike


def _option_assignment(leg: dict, spot_at_expiry: float) -> dict:
    """Compute assignment outcome for a single option leg."""
    K = leg["strike"]
    otype = leg["type"]
    action = leg["action"]
    qty = _leg_qty(leg)
    shares = qty * SHARES_PER_CONTRACT

    is_long = action == "buy"
    is_call = otype == "call"
    is_itm = _is_itm(otype, K, spot_at_expiry)

    base = {"leg": f"{action.upper()} {qty} {otype.upper()} ${K}", "is_itm": is_itm}
    if not is_itm:
        return {**base, "outcome": "expires_worthless", "shares_delivered": 0, "cash_flow": 0}

    # Decide outcome based on (long/short) × (call/put)
    if is_long and is_call:
        cash, share_change, outcome = -K * shares, shares, "exercised_buy_shares"
    elif is_long and not is_call:
        cash, share_change, outcome = K * shares, -shares, "exercised_sell_shares"
    elif (not is_long) and is_call:
        cash, share_change, outcome = K * shares, -shares, "assigned_deliver_shares"
    else:
        cash, share_change, outcome = -K * shares, shares, "assigned_receive_shares"

    return {**base, "outcome": outcome, "shares_delivered": share_change,
            "cash_flow": round(cash, 2), "strike": K, "contracts": qty}


def _stock_position(leg: dict) -> int:
    qty = _leg_qty(leg)
    return qty if leg["action"] == "buy" else -qty


def simulate_assignment(legs: list[dict], stock_price_at_expiry: float) -> dict:
    """Simulate exercise/assignment at expiry given a final stock price."""
    assignments: list[dict] = []
    total_shares = 0
    total_cash = 0.0

    for leg in legs:
        if leg.get("type") == "stock":
            total_shares += _stock_position(leg)
            continue
        outcome = _option_assignment(leg, stock_price_at_expiry)
        assignments.append(outcome)
        total_shares += outcome.get("shares_delivered", 0)
        total_cash += outcome.get("cash_flow", 0)

    return {
        "stock_price_at_expiry": round(stock_price_at_expiry, 2),
        "assignments": assignments,
        "net_shares": total_shares,
        "net_cash_flow": round(total_cash, 2),
    }
