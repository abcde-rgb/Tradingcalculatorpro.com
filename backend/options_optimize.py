"""
Options Strategy Optimizer.

Given a market thesis (sentiment + target price + budget + target date),
ranks all compatible strategies by ROI at target or Probability of Profit.

Refactored: filter / score / rank pipeline; per-strategy helpers;
type hints throughout.
"""
from __future__ import annotations
import math
from dataclasses import dataclass
from typing import Optional
from options_math import option_price, calculate_payoff, find_break_evens

DEFAULT_R: float = 0.0525
SHARES_PER_CONTRACT: int = 100

# Strategies compatible with each sentiment
SENTIMENT_STRATEGIES: dict[str, list[str]] = {
    "very_bullish": ["long_call_atm", "long_call_otm", "bull_call_spread", "short_put_otm"],
    "bullish": ["long_call_atm", "bull_call_spread", "bull_put_spread_cred", "short_put_atm", "covered_call"],
    "neutral": ["iron_condor", "short_straddle", "short_strangle", "butterfly_call"],
    "bearish": ["long_put_atm", "bear_put_spread", "bear_call_spread_cred", "short_call_otm"],
    "very_bearish": ["long_put_atm", "long_put_otm", "bear_put_spread"],
}

FRIENDLY_NAMES: dict[str, str] = {
    "long_call_atm": "Long Call (ATM)",
    "long_call_otm": "Long Call (OTM)",
    "long_put_atm": "Long Put (ATM)",
    "long_put_otm": "Long Put (OTM)",
    "bull_call_spread": "Bull Call Spread",
    "bear_put_spread": "Bear Put Spread",
    "bull_put_spread_cred": "Bull Put Spread (credit)",
    "bear_call_spread_cred": "Bear Call Spread (credit)",
    "short_put_atm": "Short Put (ATM)",
    "short_put_otm": "Short Put (OTM / CSP)",
    "short_call_otm": "Short Call (OTM)",
    "short_straddle": "Short Straddle",
    "short_strangle": "Short Strangle",
    "iron_condor": "Iron Condor",
    "butterfly_call": "Butterfly (Call)",
    "covered_call": "Covered Call",
}


@dataclass
class OptimizerContext:
    """Bundle of optimizer inputs to keep function signatures small."""
    chain: list[dict]
    spot: float
    days_to_expiry: int
    expiration_label: str
    target_price: float
    budget: float
    days_until_target: int
    risk_free: float = DEFAULT_R


# ---------------------------------------------------------------------------
# Strike / leg helpers
# ---------------------------------------------------------------------------


def _get_strike_at_offset(chain: list[dict], atm_idx: int, offset: int) -> Optional[dict]:
    idx = atm_idx + offset
    if 0 <= idx < len(chain):
        return chain[idx]
    return None


def _find_atm_index(chain: list[dict], spot: float) -> int:
    if not chain:
        return 0
    return min(range(len(chain)), key=lambda i: abs(chain[i]["strike"] - spot))


_BUILDERS: dict[str, list[tuple[str, str, int, Optional[str]]]] = {
    "long_call_atm": [("call", "buy", 0, "call")],
    "long_call_otm": [("call", "buy", 2, "call")],
    "long_put_atm": [("put", "buy", 0, "put")],
    "long_put_otm": [("put", "buy", -2, "put")],
    "bull_call_spread": [("call", "buy", 0, "call"), ("call", "sell", 2, "call")],
    "bear_put_spread": [("put", "buy", 0, "put"), ("put", "sell", -2, "put")],
    "bull_put_spread_cred": [("put", "sell", -1, "put"), ("put", "buy", -3, "put")],
    "bear_call_spread_cred": [("call", "sell", 1, "call"), ("call", "buy", 3, "call")],
    "short_put_atm": [("put", "sell", 0, "put")],
    "short_put_otm": [("put", "sell", -2, "put")],
    "short_call_otm": [("call", "sell", 2, "call")],
    "short_straddle": [("call", "sell", 0, "call"), ("put", "sell", 0, "put")],
    "short_strangle": [("call", "sell", 2, "call"), ("put", "sell", -2, "put")],
    "iron_condor": [
        ("put", "sell", -2, "put"), ("put", "buy", -4, "put"),
        ("call", "sell", 2, "call"), ("call", "buy", 4, "call"),
    ],
    "butterfly_call": [
        ("call", "buy", -2, "call"),
        ("call", "sell", 0, "call"), ("call", "sell", 0, "call"),
        ("call", "buy", 2, "call"),
    ],
    "covered_call": [("stock", "buy", 0, None), ("call", "sell", 2, "call")],
}


def _build_legs_for_strategy(strategy_id: str, chain: list[dict], atm_idx: int,
                             days_to_expiry: int) -> Optional[list[dict]]:
    """Build leg definitions for a given strategy id. Returns None if strikes unavailable."""
    spec = _BUILDERS.get(strategy_id)
    if not spec:
        return None

    legs: list[dict] = []
    for opt_type, action, offset, side in spec:
        if opt_type == "stock":
            legs.append({
                "type": "stock", "action": action, "quantity": SHARES_PER_CONTRACT,
                "qty": SHARES_PER_CONTRACT, "strike": chain[atm_idx]["strike"],
                "premium": 0, "iv": 0.3, "daysToExpiry": days_to_expiry,
            })
            continue
        strike_entry = _get_strike_at_offset(chain, atm_idx, offset)
        if not strike_entry or side not in strike_entry:
            return None
        opt_data = strike_entry[side]
        if not opt_data or opt_data.get("mid", 0) <= 0:
            return None
        legs.append({
            "type": opt_type,
            "action": action,
            "quantity": 1,
            "qty": 1,
            "strike": strike_entry["strike"],
            "premium": opt_data["mid"],
            "iv": opt_data.get("iv", 0.3) or 0.3,
            "daysToExpiry": days_to_expiry,
        })
    return legs


# ---------------------------------------------------------------------------
# Pricing helpers
# ---------------------------------------------------------------------------


def _compute_pnl_at_price_and_time(legs: list[dict], target_price: float,
                                   days_until: int,
                                   risk_free: float = DEFAULT_R) -> float:
    """PnL (in $) if spot = target_price after days_until days have passed."""
    T_remaining = max(days_until / 365, 0.001)
    total_entry = 0.0
    total_current = 0.0
    for leg in legs:
        qty = leg.get("quantity", leg.get("qty", 1))
        mult = 1 if leg["action"] == "buy" else -1
        if leg["type"] == "stock":
            total_entry += leg["strike"] * qty * mult
            total_current += target_price * qty * mult
        else:
            prem = leg.get("premium", 0)
            iv = leg.get("iv", 0.3) or 0.3
            total_entry += prem * mult * qty * SHARES_PER_CONTRACT
            cur = option_price(target_price, leg["strike"], T_remaining, risk_free, iv, leg["type"])
            total_current += cur * mult * qty * SHARES_PER_CONTRACT
    return total_current - total_entry


def _normal_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


# ---------------------------------------------------------------------------
# Probability of Profit (refactored into clear branches)
# ---------------------------------------------------------------------------


def _avg_iv(legs: list[dict]) -> float:
    ivs = [leg.get("iv", 0.3) for leg in legs if leg["type"] != "stock"]
    return sum(ivs) / len(ivs) if ivs else 0.3


def _terminal_sigma(legs: list[dict]) -> float:
    iv = _avg_iv(legs)
    days = max(leg.get("daysToExpiry", 30) for leg in legs)
    T = max(days / 365, 0.003)
    return iv * math.sqrt(T)


def _is_profit_at(legs: list[dict], price: float) -> bool:
    return _compute_pnl_at_price_and_time(legs, price, 0) > 0


def _pop_single_break_even(legs: list[dict], spot: float, be: float, sigma: float) -> float:
    """POP for strategies with a single break-even (long calls/puts, simple spreads)."""
    z = math.log(be / spot) / sigma
    if _is_profit_at(legs, spot * 1.5):
        p = 1 - _normal_cdf(z + sigma / 2)
    else:
        p = _normal_cdf(z - sigma / 2)
    return max(1.0, min(99.0, p * 100))


def _pop_multi_break_even(legs: list[dict], spot: float, bes: list[float],
                          sigma: float) -> float:
    """POP for strategies with 2+ break-evens (iron condors, straddles, butterflies)."""
    mid = (bes[0] + bes[-1]) / 2
    p_hi = 1 - _normal_cdf(math.log(bes[-1] / spot) / sigma + sigma / 2)
    p_lo = _normal_cdf(math.log(bes[0] / spot) / sigma - sigma / 2)
    if _is_profit_at(legs, mid):
        # Profit BETWEEN break-evens
        p = 1 - p_hi - p_lo
    else:
        # Profit OUTSIDE break-evens
        p = p_hi + p_lo
    return max(1.0, min(99.0, p * 100))


def _probability_of_profit(legs: list[dict], spot: float,
                          break_evens: list[float],
                          expected_profit_at_target: float,
                          target_price: float) -> float:
    """Approximate POP using log-normal terminal distribution."""
    if not legs:
        return 0.0
    if not break_evens:
        return 50.0
    sigma = _terminal_sigma(legs)
    sorted_bes = sorted(break_evens)
    if len(sorted_bes) == 1:
        return _pop_single_break_even(legs, spot, sorted_bes[0], sigma)
    return _pop_multi_break_even(legs, spot, sorted_bes, sigma)


# ---------------------------------------------------------------------------
# Expected value, tail risk and probability of touch
#
# POP and ROI-at-target are both selection biases wearing a metric's clothes:
# ranking by ROI puts the furthest OTM lottery tickets on top, ranking by POP
# puts premium-selling strategies on top — an iron condor that wins 88% of the
# time and hands back two years of credit in the 12%. Neither says anything
# about EDGE. Expected value (P&L weighted across the whole terminal
# distribution) and CVaR (the average outcome in the worst 5%) do, and together
# they show a high-POP negative-EV trade for what it is.
# ---------------------------------------------------------------------------

_EV_GRID_POINTS: int = 401
_EV_SIGMA_SPAN: float = 5.0   # integrate ±5σ in log space — covers the tails
CVAR_ALPHA: float = 0.05      # worst 5%


def _lognormal_grid(spot: float, sigma: float) -> list[tuple[float, float]]:
    """(price, probability_weight) pairs over a driftless log-normal terminal.

    Driftless (risk-neutral-ish, median at spot) matches the POP model already
    in use, so EV and POP describe the same distribution rather than two
    different ones. Weights are normalized, so the truncation at ±5σ doesn't
    leak probability mass.
    """
    if sigma <= 0:
        return [(spot, 1.0)]
    lo, hi = -_EV_SIGMA_SPAN * sigma, _EV_SIGMA_SPAN * sigma
    step = (hi - lo) / (_EV_GRID_POINTS - 1)
    grid: list[tuple[float, float]] = []
    total = 0.0
    for i in range(_EV_GRID_POINTS):
        x = lo + i * step                       # log-return
        # Median-at-spot lognormal: ln(S_T/S_0) ~ N(-sigma²/2, sigma²)
        z = (x + sigma * sigma / 2) / sigma
        w = math.exp(-0.5 * z * z)
        price = spot * math.exp(x)
        grid.append((price, w))
        total += w
    if total <= 0:
        return [(spot, 1.0)]
    return [(p, w / total) for p, w in grid]


def _expected_value_and_cvar(legs: list[dict], spot: float, sigma: float,
                             risk_free: float = DEFAULT_R) -> tuple[float, float, float]:
    """(expected_value, cvar_worst_5pct, prob_of_large_loss) at expiry, in $."""
    grid = _lognormal_grid(spot, sigma)
    outcomes = [(_compute_pnl_at_price_and_time(legs, price, 0, risk_free), w) for price, w in grid]

    ev = sum(pnl * w for pnl, w in outcomes)

    # CVaR: probability-weighted mean of the worst CVAR_ALPHA of the distribution.
    outcomes.sort(key=lambda o: o[0])
    acc_w = 0.0
    acc_pnl = 0.0
    for pnl, w in outcomes:
        take = min(w, CVAR_ALPHA - acc_w)
        if take <= 0:
            break
        acc_pnl += pnl * take
        acc_w += take
    cvar = acc_pnl / acc_w if acc_w > 0 else 0.0

    # How often the outcome is worse than losing twice the expected gain —
    # a plain-language read on the fat left tail of short-premium structures.
    threshold = -2 * abs(ev) if ev else 0.0
    p_large_loss = sum(w for pnl, w in outcomes if pnl < threshold) * 100
    return ev, cvar, p_large_loss


def _probability_of_touch(spot: float, break_evens: list[float], sigma: float) -> Optional[float]:
    """Chance of the underlying TOUCHING the nearest break-even before expiry.

    Roughly twice the probability of finishing beyond it (the reflection
    principle for driftless Brownian motion). It matters because a position is
    rarely held to expiry: what takes a trader out early is price touching the
    level, not closing past it — so POP at expiry systematically overstates how
    comfortable the trade will feel.
    """
    if not break_evens or sigma <= 0 or spot <= 0:
        return None
    nearest = min(break_evens, key=lambda b: abs(math.log(b / spot)) if b > 0 else float("inf"))
    if nearest <= 0:
        return None
    z = abs(math.log(nearest / spot)) / sigma
    p_finish_beyond = 1 - _normal_cdf(z)
    return round(min(99.0, 2 * p_finish_beyond * 100), 1)


# ---------------------------------------------------------------------------
# Risk classification
# ---------------------------------------------------------------------------

# Structures whose loss is not bounded by construction. The calculator lets a
# user build every one of these; the Academy teaches the LONG version of
# straddle/strangle and nothing about the short one, so someone who knows the
# word "straddle" can assemble its photographic negative believing it is "the
# same thing but sold". Flagging it here is what closes that gap.
UNDEFINED_RISK_STRATEGIES: set[str] = {
    "short_call_otm", "short_straddle", "short_strangle",
}


def _naked_short_legs(legs: list[dict]) -> list[dict]:
    """Short option legs with no long leg of the same type capping them."""
    longs_by_type: dict[str, int] = {}
    for leg in legs:
        if leg["type"] in ("call", "put") and leg["action"] == "buy":
            longs_by_type[leg["type"]] = longs_by_type.get(leg["type"], 0) + leg.get("quantity", 1)
    naked = []
    for leg in legs:
        if leg["type"] not in ("call", "put") or leg["action"] != "sell":
            continue
        available = longs_by_type.get(leg["type"], 0)
        if available >= leg.get("quantity", 1):
            longs_by_type[leg["type"]] = available - leg.get("quantity", 1)
        else:
            naked.append(leg)
    return naked


def _risk_profile(strat_id: str, legs: list[dict], max_loss: float) -> dict:
    """Classify a candidate's downside so the UI can warn before, not after."""
    naked = _naked_short_legs(legs)
    has_stock = any(leg["type"] == "stock" for leg in legs)
    # A short call covered by long stock is a covered call: capped, not naked.
    naked_calls = [leg for leg in naked if leg["type"] == "call" and not has_stock]
    naked_puts = [leg for leg in naked if leg["type"] == "put"]

    unlimited = bool(naked_calls) or strat_id in UNDEFINED_RISK_STRATEGIES
    # A naked put's loss is bounded (the stock can only go to zero) but that
    # bound is the entire notional, which is not what "defined risk" means.
    substantial = bool(naked_puts) and not unlimited

    if unlimited:
        level, key = "undefined", "riskUndefinedLoss"
    elif substantial:
        level, key = "substantial", "riskSubstantialLoss"
    elif max_loss <= -5_000_000:
        level, key = "undefined", "riskUndefinedLoss"
    else:
        level, key = "defined", "riskDefinedLoss"

    return {
        "riskLevel": level,
        "riskWarningKey": key,
        "nakedShortLegs": len(naked_calls) + len(naked_puts),
        "isUndefinedRisk": level == "undefined",
    }


# ---------------------------------------------------------------------------
# Capital requirement (refactored into per-strategy-type helpers)
# ---------------------------------------------------------------------------


def _net_premium(legs: list[dict]) -> float:
    """Net premium (negative = debit paid; positive = credit received)."""
    total = 0.0
    for leg in legs:
        if leg["type"] != "stock":
            sign = -1 if leg["action"] == "buy" else 1
            total += leg.get("premium", 0) * sign * leg.get("quantity", 1) * SHARES_PER_CONTRACT
    return total


def _reg_t_naked_short(leg: dict, spot: float) -> float:
    """Reg-T margin requirement for a single naked short option leg."""
    K = leg.get("strike", spot)
    qty = leg.get("quantity", 1)
    prem_recv = leg.get("premium", 0) * SHARES_PER_CONTRACT
    if leg["type"] == "call":
        otm = max(0, K - spot)
        return (max(0.2 * spot - otm, 0.1 * spot) * SHARES_PER_CONTRACT + prem_recv) * qty
    otm = max(0, spot - K)
    return (max(0.2 * spot - otm, 0.1 * K) * SHARES_PER_CONTRACT + prem_recv) * qty


def _capital_for_unlimited_risk(legs: list[dict], spot: float) -> float:
    """Sum Reg-T per naked short leg when strategy has unlimited risk."""
    total = 0.0
    for leg in legs:
        if leg["type"] == "stock" or leg["action"] != "sell":
            continue
        total += _reg_t_naked_short(leg, spot)
    return total


def _capital_for_stock_position(legs: list[dict]) -> Optional[float]:
    """Capital tied up by stock leg (covered call uses share value)."""
    for leg in legs:
        if leg["type"] == "stock":
            return leg["strike"] * leg.get("quantity", SHARES_PER_CONTRACT)
    return None


def _compute_capital_required(legs: list[dict], max_loss: float, spot: float) -> float:
    """Reg-T approximation for capital/margin required."""
    if max_loss < -5_000_000:  # unlimited risk
        cap = _capital_for_unlimited_risk(legs, spot)
        if cap > 0:
            return cap

    stock_cap = _capital_for_stock_position(legs)
    if stock_cap is not None:
        return stock_cap

    net_prem = _net_premium(legs)
    return max(abs(max_loss), abs(net_prem) if net_prem < 0 else 0)


def _friendly_name(strat_id: str, legs: list[dict]) -> str:
    base = FRIENDLY_NAMES.get(strat_id, strat_id)
    if len(legs) == 1 and legs[0]["type"] != "stock":
        return f"{base} ${int(legs[0]['strike'])}"
    if len(legs) == 2 and all(leg["type"] != "stock" for leg in legs):
        strikes = sorted([int(leg["strike"]) for leg in legs])
        return f"{base} ${strikes[0]}/${strikes[1]}"
    return base


# ---------------------------------------------------------------------------
# Optimizer pipeline: filter → score → rank
# ---------------------------------------------------------------------------


def _score_strategy(strat_id: str, legs: list[dict],
                    ctx: OptimizerContext) -> Optional[dict]:
    """Compute one candidate's metrics. Returns None if disqualified by budget."""
    payoff_points = calculate_payoff(legs, ctx.spot, 0.35, ctx.days_until_target, r=ctx.risk_free)
    if not payoff_points:
        return None

    break_evens = find_break_evens(payoff_points)
    expiry_pnls = [p["pnlAtExpiry"] for p in payoff_points]
    max_profit = max(expiry_pnls)
    max_loss = min(expiry_pnls)

    capital_required = _compute_capital_required(legs, max_loss, ctx.spot)
    if capital_required > ctx.budget and ctx.budget > 0:
        return None

    pnl_at_target = _compute_pnl_at_price_and_time(
        legs, ctx.target_price, ctx.days_until_target, ctx.risk_free)
    pnl_at_target_expiry = _compute_pnl_at_price_and_time(legs, ctx.target_price, 0, ctx.risk_free)

    risk = max(abs(max_loss), 0.01)
    roi_target = (pnl_at_target_expiry / risk) * 100 if risk > 0 else 0
    pop = _probability_of_profit(legs, ctx.spot, break_evens, pnl_at_target_expiry, ctx.target_price)

    sigma = _terminal_sigma(legs)
    ev, cvar, p_large_loss = _expected_value_and_cvar(legs, ctx.spot, sigma, ctx.risk_free)
    prob_touch = _probability_of_touch(ctx.spot, break_evens, sigma)
    risk_profile = _risk_profile(strat_id, legs, max_loss)

    atm_idx = _find_atm_index(ctx.chain, ctx.spot)
    return {
        # Edge, not just outcome-at-a-point. `evOnCapital` is the comparable
        # figure across strategies with different capital requirements.
        "expectedValue": round(ev, 2),
        "evOnCapital": round(ev / capital_required * 100, 2) if capital_required > 0 else None,
        "cvar5": round(cvar, 2),
        "probLargeLoss": round(p_large_loss, 1),
        "probTouchBreakEven": prob_touch,
        **risk_profile,
        "id": f"{strat_id}_{int(ctx.chain[atm_idx]['strike'])}",
        "strategyId": strat_id,
        "name": _friendly_name(strat_id, legs),
        "legs": [{
            "type": leg["type"], "action": leg["action"],
            "quantity": leg.get("quantity", 1), "strike": leg["strike"],
            "premium": leg.get("premium", 0),
        } for leg in legs],
        "roi": round(roi_target, 1),
        "pop": round(pop, 1),
        "profitAtTarget": round(pnl_at_target, 2),
        "profitAtTargetExpiry": round(pnl_at_target_expiry, 2),
        "maxProfit": round(max_profit, 2) if max_profit < 5_000_000 else None,
        "maxProfitUnlimited": max_profit >= 5_000_000,
        "maxLoss": round(max_loss, 2) if max_loss > -5_000_000 else None,
        "maxLossUnlimited": max_loss <= -5_000_000,
        "capitalRequired": round(capital_required, 2),
        "breakEvens": [round(b, 2) for b in break_evens],
        "payoffPoints": payoff_points,
        "expiration": ctx.expiration_label,
        "daysToExpiry": ctx.days_to_expiry,
    }


def _filter_candidates(ctx: OptimizerContext, sentiment: str) -> list[tuple[str, list[dict]]]:
    """Return (strategy_id, legs) pairs for strategies that match sentiment & strikes."""
    atm_idx = _find_atm_index(ctx.chain, ctx.spot)
    ids = SENTIMENT_STRATEGIES.get(sentiment, SENTIMENT_STRATEGIES["bullish"])
    pairs: list[tuple[str, list[dict]]] = []
    for sid in ids:
        legs = _build_legs_for_strategy(sid, ctx.chain, atm_idx, ctx.days_to_expiry)
        if legs:
            pairs.append((sid, legs))
    return pairs


def _rank_results(results: list[dict], mode: str) -> list[dict]:
    """Rank candidates. Default is expected value — the only edge measure here.

    `max_return` (ROI-at-target) and `max_chance` (POP) are kept because the UI
    exposes them, but both are known to select adversely: ROI picks the furthest
    OTM lottery tickets, POP picks whatever sells the most premium. Expected
    value on capital is the default so the top of the list is the trade with
    edge, not the trade with the prettiest single number.
    """
    if mode == "max_chance":
        key = "pop"
    elif mode == "max_return":
        key = "roi"
    else:  # 'best_edge' and anything unrecognised
        key = "evOnCapital"
    return sorted(results, key=lambda r: (r.get(key) if r.get(key) is not None else -math.inf),
                  reverse=True)


def optimize_strategies(symbol: str, sentiment: str, target_price: float,
                       budget: float, chain: list[dict], spot: float,
                       days_to_expiry: int, expiration_label: str,
                       mode: str = "max_return", max_results: int = 8,
                       days_until_target: Optional[int] = None,
                       risk_free: Optional[float] = None) -> list[dict]:
    """Rank strategies matching the thesis by expected value, ROI-at-target or POP.

    Pipeline: filter (sentiment + strikes available) → score (metrics + budget) → rank.
    """
    if not chain or spot <= 0 or budget <= 0 or days_to_expiry < 1:
        return []

    ctx = OptimizerContext(
        chain=chain, spot=spot, days_to_expiry=days_to_expiry,
        expiration_label=expiration_label, target_price=target_price, budget=budget,
        days_until_target=days_until_target if days_until_target is not None else days_to_expiry,
        risk_free=DEFAULT_R if risk_free is None else risk_free,
    )

    candidates = _filter_candidates(ctx, sentiment)
    scored = [r for r in (_score_strategy(sid, legs, ctx) for sid, legs in candidates) if r]
    ranked = _rank_results(scored, mode)
    return ranked[:max_results]
