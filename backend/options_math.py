"""Black-Scholes-Merton Option Pricing and Greeks.

Supports continuous dividend yield q (BSM extension to handle dividend-paying stocks).
When q=0, this reduces to standard Black-Scholes. Default q=0 preserves backwards compat.

Refactored for clarity: complex functions split into helpers; full type hints.
"""
from __future__ import annotations
import math
import secrets
from dataclasses import dataclass
from typing import Optional
from scipy.stats import norm

# ---------------------------------------------------------------------------
# Constants & dataclasses
# ---------------------------------------------------------------------------

DEFAULT_RISK_FREE: float = 0.0525
DEFAULT_IV: float = 0.30
SHARES_PER_CONTRACT: int = 100
SECONDS_PER_YEAR: int = 365  # market days approximation


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
    return (term1 + rest) / SECONDS_PER_YEAR


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
    Returned per-position: vanna in Δ per 1% IV, charm in Δ per day (practical units)."""
    total = {"vanna": 0.0, "charm": 0.0}
    for leg in legs:
        if leg.get("type") == "stock":
            continue
        multiplier = 1 if leg["action"] == "buy" else -1
        qty = _leg_qty(leg)
        T = max(leg.get("daysToExpiry", 30), 1) / SECONDS_PER_YEAR
        iv = leg.get("iv", DEFAULT_IV)
        K = leg["strike"]
        otype = leg["type"]
        total["vanna"] += (vanna_val(stock_price, K, T, r, iv, q) / 100) * multiplier * qty
        total["charm"] += (charm_val(stock_price, K, T, r, iv, otype, q) / SECONDS_PER_YEAR) * multiplier * qty
    return {k: round(v, 4) for k, v in total.items()}


# ---------------------------------------------------------------------------
# Gamma Exposure (GEX) — dealer positioning. Convention: dealers long calls,
# short puts (standard approximation). GEX per 1% move.
# HONESTY: with modelled/synthetic open interest (oi=None) → GEX = None. Never invent.
# ---------------------------------------------------------------------------


def gamma_exposure(chain: list[dict], spot: float,
                   r: float = DEFAULT_RISK_FREE, q: float = 0.0,
                   contract_multiplier: int = 100) -> Optional[dict]:
    """Compute per-strike and total gamma exposure from an options chain.

    Each chain row: {strike, type ('call'|'put'), oi, iv, daysToExpiry}.
    Returns {total, by_strike:[{strike, gex}], call_wall, put_wall, gamma_flip} or
    None if any open interest is missing (synthetic chain) — we do NOT fabricate GEX.
    Formula per option i: GEX_i = Γ_i · OI_i · mult · S² · 0.01 · sign (+call, −put).
    """
    if not chain:
        return None
    by_strike: dict[float, float] = {}
    for row in chain:
        oi = row.get("oi")
        if oi is None:            # modelled chain → cannot compute honestly
            return None
        K = row.get("strike")
        iv = row.get("iv", DEFAULT_IV)
        T = max(row.get("daysToExpiry", 30), 1) / SECONDS_PER_YEAR
        if K is None or iv is None or iv <= 0:
            continue
        g = gamma_val(spot, K, T, r, iv, q)
        sign = 1.0 if row.get("type") == "call" else -1.0
        gex_i = g * oi * contract_multiplier * (spot ** 2) * 0.01 * sign
        by_strike[K] = by_strike.get(K, 0.0) + gex_i

    if not by_strike:
        return None
    # All-zero exposure means there is no real open interest anywhere on the
    # chain: reporting a "wall" from that would be noise dressed as signal.
    if all(v == 0 for v in by_strike.values()):
        return None
    total = sum(by_strike.values())
    call_wall = max(by_strike.items(), key=lambda kv: kv[1])[0]   # most positive gamma
    put_wall = min(by_strike.items(), key=lambda kv: kv[1])[0]    # most negative gamma
    return {
        "total": round(total, 2),
        "by_strike": [{"strike": k, "gex": round(v, 2)} for k, v in sorted(by_strike.items())],
        "call_wall": call_wall,
        "put_wall": put_wall,
    }


def flatten_chain_for_gex(chain: list[dict], days_to_expiry: int,
                          synthetic: bool = False) -> Optional[list[dict]]:
    """Flatten a per-strike chain into the flat rows `gamma_exposure` expects.

    Input rows look like {strike, call: {openInterest, iv, ...}, put: {...}}.
    Returns None for modelled/synthetic chains: their open interest is generated,
    so any GEX derived from it would be fiction presented as dealer positioning.
    """
    if synthetic or not chain:
        return None
    rows: list[dict] = []
    for item in chain:
        strike = item.get("strike")
        if strike is None:
            continue
        for side in ("call", "put"):
            leg = item.get(side) or {}
            iv = leg.get("iv")
            rows.append({
                "strike": float(strike),
                "type": side,
                "oi": leg.get("openInterest"),
                "iv": iv if iv and iv > 0 else DEFAULT_IV,
                "daysToExpiry": days_to_expiry,
            })
    return rows


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
                       q: float, opt_type: str, rng: secrets.SystemRandom) -> dict:
    """Build a single side (call or put) quote dict for a strike."""
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
        "volume": rng.randint(50, 8000),
        "openInterest": rng.randint(200, 30000),
        "iv": round(iv, 4),
        "delta": round(d, 4),
        "gamma": round(g, 6),
        "theta": round(th, 4),
        "vega": round(v, 4),
    }


def generate_options_chain(current_price: float, days_to_expiry: int,
                           q: float = 0.0) -> list[dict]:
    """Generate a synthetic options chain when real data is unavailable."""
    step = _strike_step(current_price)
    base_strike = round(current_price / step) * step
    T = max(days_to_expiry / SECONDS_PER_YEAR, 0.001)
    r = DEFAULT_RISK_FREE
    rng = secrets.SystemRandom()

    chain: list[dict] = []
    for i in range(-15, 16):
        strike = round(base_strike + i * step, 2)
        if strike <= 0:
            continue
        chain.append({
            "strike": strike,
            "call": _build_strike_quote(current_price, strike, T, r, q, "call", rng),
            "put": _build_strike_quote(current_price, strike, T, r, q, "put", rng),
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

    T_current = max(days_to_chart / SECONDS_PER_YEAR, 0.0)
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
        T = max(leg.get("daysToExpiry", 30), 1) / SECONDS_PER_YEAR
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
    dT_days = (T0 - T1) * SECONDS_PER_YEAR
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
