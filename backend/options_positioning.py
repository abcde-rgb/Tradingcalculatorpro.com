"""Positioning metrics derived from open interest: max pain, GEX, OI profile,
contract liquidity and the IV term structure.

Everything here reads OPEN INTEREST and QUOTES — observations, not model
output. That distinction is the whole point of the module and it is enforced
rather than documented: a modelled chain has `open_interest` and `volume` set
to None (see `generate_options_chain`), so every function below returns None
for the metric instead of a number built on invented positioning. A max pain
computed from made-up open interest is not an approximation, it is a fiction
that looks exactly like the real thing.

The functions are pure and take plain dicts in the shape the chain endpoint
already returns, so they are testable without a database or a network.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

CONTRACT_MULTIPLIER = 100

# Below this many strikes carrying real open interest, the shape of the OI
# profile is noise: max pain lands on whichever strike happens to have a lone
# block trade. Reporting it would give a precise-looking answer to a question
# the data cannot yet support.
MIN_STRIKES_WITH_OI = 5

# A contract whose bid/ask straddle is wider than this fraction of its mid is
# not really tradeable at the mid — the "price" the calculator shows is not a
# price anyone will fill.
WIDE_SPREAD_PCT = 0.10
VERY_WIDE_SPREAD_PCT = 0.25
# Open interest under this is a contract you can enter and then not leave.
THIN_OI = 100


def _leg_oi(leg: Optional[Dict[str, Any]]) -> Optional[int]:
    """Open interest of one side, or None when it was never observed."""
    if not isinstance(leg, dict):
        return None
    oi = leg.get("openInterest", leg.get("open_interest"))
    if oi is None:
        return None
    try:
        value = int(oi)
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


def has_real_open_interest(chain: List[Dict[str, Any]]) -> bool:
    """True when enough strikes carry observed open interest to say anything."""
    strikes_with_oi = 0
    for item in chain or []:
        call_oi = _leg_oi(item.get("call"))
        put_oi = _leg_oi(item.get("put"))
        if (call_oi or 0) > 0 or (put_oi or 0) > 0:
            strikes_with_oi += 1
    return strikes_with_oi >= MIN_STRIKES_WITH_OI


def max_pain(chain: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Strike at which the total intrinsic value of all open contracts is least.

    The classic "max pain" reading: the settlement price that would make the
    largest amount of open option premium expire worthless. It is a
    description of where open interest sits, not a forecast, and it is only
    meaningful against real open interest.
    """
    if not chain or not has_real_open_interest(chain):
        return None

    strikes = sorted({float(item["strike"]) for item in chain if item.get("strike") is not None})
    if len(strikes) < 2:
        return None

    totals: List[Dict[str, float]] = []
    for candidate in strikes:
        pain = 0.0
        for item in chain:
            strike = float(item.get("strike") or 0)
            call_oi = _leg_oi(item.get("call")) or 0
            put_oi = _leg_oi(item.get("put")) or 0
            # Value paid out by writers if the underlying settles at `candidate`
            pain += max(0.0, candidate - strike) * call_oi * CONTRACT_MULTIPLIER
            pain += max(0.0, strike - candidate) * put_oi * CONTRACT_MULTIPLIER
        totals.append({"strike": candidate, "pain": round(pain, 2)})

    best = min(totals, key=lambda row: row["pain"])
    return {
        "strike": best["strike"],
        "curve": totals,
        "totalOpenInterest": total_open_interest(chain),
    }


def total_open_interest(chain: List[Dict[str, Any]]) -> Optional[int]:
    """Sum of observed open interest across both sides, or None if unobserved."""
    if not chain:
        return None
    seen = False
    total = 0
    for item in chain:
        for side in ("call", "put"):
            oi = _leg_oi(item.get(side))
            if oi is not None:
                seen = True
                total += oi
    return total if seen else None


def open_interest_profile(chain: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
    """Per-strike call/put open interest — the raw shape behind max pain and GEX."""
    if not chain or not has_real_open_interest(chain):
        return None
    rows: List[Dict[str, Any]] = []
    for item in chain:
        strike = item.get("strike")
        if strike is None:
            continue
        call_oi = _leg_oi(item.get("call"))
        put_oi = _leg_oi(item.get("put"))
        rows.append(
            {
                "strike": float(strike),
                "callOI": call_oi,
                "putOI": put_oi,
                # None, not 0: a strike whose OI was never reported is unknown,
                # and a zero here would draw a bar saying "nobody holds this".
                "totalOI": None if call_oi is None and put_oi is None else (call_oi or 0) + (put_oi or 0),
            }
        )
    return rows


def put_call_ratio(chain: List[Dict[str, Any]]) -> Optional[Dict[str, Optional[float]]]:
    """Put/call ratios by open interest and by volume, when both are observed."""
    if not chain:
        return None

    def _ratio(field: str) -> Optional[float]:
        calls = 0
        puts = 0
        seen = False
        for item in chain:
            c = item.get("call") or {}
            p = item.get("put") or {}
            cv = c.get(field)
            pv = p.get(field)
            if cv is None and pv is None:
                continue
            seen = True
            calls += int(cv or 0)
            puts += int(pv or 0)
        if not seen or calls == 0:
            # No calls open means the ratio is undefined, not infinite and
            # certainly not zero.
            return None
        return round(puts / calls, 4)

    oi_ratio = _ratio("openInterest")
    vol_ratio = _ratio("volume")
    if oi_ratio is None and vol_ratio is None:
        return None
    return {"byOpenInterest": oi_ratio, "byVolume": vol_ratio}


def gamma_exposure(
    chain: List[Dict[str, Any]],
    spot: float,
    *,
    dealer_long_calls: bool = True,
) -> Optional[Dict[str, Any]]:
    """Aggregate dealer gamma exposure per strike, in dollars per 1% move.

    GEX = Σ γ · OI · multiplier · S² · 0.01, signed by an ASSUMPTION about who
    holds which side. The market convention — and the default here — is that
    dealers are long calls and short puts against retail flow. That assumption
    is not observable from a chain, so it travels with the result in
    `convention` instead of being silently baked in: flipping it flips the sign
    of the whole profile, and a reader who does not know which one was used
    cannot interpret the number.
    """
    if not chain or not has_real_open_interest(chain):
        return None
    if not spot or spot <= 0:
        return None

    rows: List[Dict[str, Any]] = []
    total = 0.0
    for item in chain:
        strike = item.get("strike")
        if strike is None:
            continue
        call = item.get("call") or {}
        put = item.get("put") or {}
        call_oi = _leg_oi(call) or 0
        put_oi = _leg_oi(put) or 0
        call_gamma = call.get("gamma")
        put_gamma = put.get("gamma")
        if call_gamma is None and put_gamma is None:
            continue

        unit = CONTRACT_MULTIPLIER * spot * spot * 0.01
        call_gex = (call_gamma or 0.0) * call_oi * unit
        put_gex = (put_gamma or 0.0) * put_oi * unit
        signed = (call_gex - put_gex) if dealer_long_calls else (put_gex - call_gex)
        total += signed
        rows.append({"strike": float(strike), "gex": round(signed, 2)})

    if not rows:
        return None

    # The strike where the profile crosses zero is where dealer hedging flips
    # from damping moves to amplifying them.
    flip = _gamma_flip_strike(rows)
    return {
        "total": round(total, 2),
        "byStrike": rows,
        "flipStrike": flip,
        "convention": "dealer_long_calls" if dealer_long_calls else "dealer_short_calls",
    }


def _gamma_flip_strike(rows: List[Dict[str, Any]]) -> Optional[float]:
    """Strike where cumulative GEX changes sign, interpolated. None if it never does."""
    cumulative = 0.0
    prev_strike = None
    prev_cum = None
    for row in sorted(rows, key=lambda r: r["strike"]):
        cumulative += row["gex"]
        if prev_cum is not None and prev_cum != cumulative:
            if (prev_cum < 0 <= cumulative) or (prev_cum > 0 >= cumulative):
                span = cumulative - prev_cum
                ratio = (0 - prev_cum) / span if span else 0
                return round(prev_strike + ratio * (row["strike"] - prev_strike), 2)
        prev_strike = row["strike"]
        prev_cum = cumulative
    return None


def contract_liquidity(leg: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Traffic-light read on whether one contract can actually be traded.

    `level` is None when bid/ask are missing: an unquoted contract is not
    liquid, illiquid or anything else — it is unknown, and a green light there
    would be worse than no light.
    """
    if not isinstance(leg, dict):
        return {"level": None, "spreadPct": None, "openInterest": None, "reasons": []}

    bid = leg.get("bid")
    ask = leg.get("ask")
    oi = _leg_oi(leg)
    spread_pct: Optional[float] = None
    if bid is not None and ask is not None and ask >= bid:
        mid = (float(bid) + float(ask)) / 2
        if mid > 0:
            spread_pct = round((float(ask) - float(bid)) / mid, 4)

    reasons: List[str] = []
    if spread_pct is None:
        return {"level": None, "spreadPct": None, "openInterest": oi, "reasons": ["no_quote"]}

    level = "good"
    if spread_pct >= VERY_WIDE_SPREAD_PCT:
        level = "poor"
        reasons.append("very_wide_spread")
    elif spread_pct >= WIDE_SPREAD_PCT:
        level = "fair"
        reasons.append("wide_spread")
    if oi is not None and oi < THIN_OI:
        reasons.append("thin_open_interest")
        level = "poor" if level == "fair" else ("fair" if level == "good" else level)

    return {"level": level, "spreadPct": spread_pct, "openInterest": oi, "reasons": reasons}


def chain_liquidity(chain: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
    """Per-strike liquidity for both sides of a chain."""
    if not chain:
        return None
    out: List[Dict[str, Any]] = []
    for item in chain:
        strike = item.get("strike")
        if strike is None:
            continue
        out.append(
            {
                "strike": float(strike),
                "call": contract_liquidity(item.get("call")),
                "put": contract_liquidity(item.get("put")),
            }
        )
    return out


def atm_iv(chain: List[Dict[str, Any]], spot: float) -> Optional[float]:
    """Average call/put IV at the strike nearest the spot."""
    if not chain or not spot or spot <= 0:
        return None
    nearest = min(
        (item for item in chain if item.get("strike") is not None),
        key=lambda item: abs(float(item["strike"]) - spot),
        default=None,
    )
    if nearest is None:
        return None
    ivs = [
        float(side.get("iv"))
        for side in (nearest.get("call") or {}, nearest.get("put") or {})
        if isinstance(side, dict) and side.get("iv") not in (None, 0)
    ]
    if not ivs:
        return None
    return round(sum(ivs) / len(ivs), 6)


def term_structure(points: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """ATM IV by expiration, plus whether the curve is in contango or backwardation.

    `points` is `[{"date", "daysToExpiry", "iv"}, ...]`. Expiries whose ATM IV
    could not be determined are dropped rather than interpolated: a term
    structure with an invented node is a term structure that says something the
    market did not.
    """
    usable = [
        p for p in (points or [])
        if p.get("iv") is not None and p.get("daysToExpiry") is not None
    ]
    if len(usable) < 2:
        return None
    usable.sort(key=lambda p: p["daysToExpiry"])
    front, back = usable[0], usable[-1]
    slope = back["iv"] - front["iv"]
    if abs(slope) < 0.005:
        shape = "flat"
    elif slope > 0:
        shape = "contango"
    else:
        shape = "backwardation"
    return {
        "points": usable,
        "shape": shape,
        "slope": round(slope, 6),
        "frontIV": front["iv"],
        "backIV": back["iv"],
    }


def expected_move(spot: float, iv: Optional[float], days: Optional[float]) -> Optional[Dict[str, Any]]:
    """One standard deviation of the lognormal diffusion over `days`.

    Returns None rather than 0 when IV or the horizon is missing: an expected
    move nobody can compute is not "the price will not move".
    """
    if not spot or spot <= 0:
        return None
    if iv is None or iv <= 0:
        return None
    if days is None or days <= 0:
        return None
    move = spot * iv * math.sqrt(days / 365.0)
    return {
        "absolute": round(move, 4),
        "pct": round(move / spot, 6),
        "upper": round(spot + move, 4),
        "lower": round(spot - move, 4),
        "days": days,
    }
