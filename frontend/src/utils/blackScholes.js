// Black-Scholes Option Pricing and Greeks Calculations
// Extensión explícita: `engine-check.js` importa este módulo con el ESM de
// Node, que no resuelve rutas sin extensión. Webpack la acepta igual.
import { DAYS_PER_YEAR, DEFAULT_RISK_FREE_RATE, DEFAULT_PRICE_RANGE } from './constants.js';

/**
 * Stop-gap risk-free rate.
 *
 * The real rate comes from `GET /api/market/risk-free` (^IRX, with provenance).
 * This constant exists ONLY to keep the pure functions callable before that
 * request resolves, and it is deliberately named so that a `grep` for a
 * hardcoded rate finds one definition instead of a scattering of `0.05`
 * literals. Never pass it on purpose: pass the live rate.
 */
export const FALLBACK_RISK_FREE_RATE = DEFAULT_RISK_FREE_RATE;

// Standard normal cumulative distribution function
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Calculate d1 and d2 — supports continuous dividend yield q (default 0)
function d1d2(S, K, T, r, sigma, q = 0) {
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return { d1, d2 };
}

// Black-Scholes-Merton Call Price (with dividend yield q)
export function callPrice(S, K, T, r, sigma, q = 0) {
  if (T <= 0) return Math.max(0, S - K);
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  return S * Math.exp(-q * T) * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

// Black-Scholes-Merton Put Price (with dividend yield q)
export function putPrice(S, K, T, r, sigma, q = 0) {
  if (T <= 0) return Math.max(0, K - S);
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * Math.exp(-q * T) * normalCDF(-d1);
}

// Greeks
export function delta(S, K, T, r, sigma, optionType, q = 0) {
  if (T <= 0) {
    if (optionType === 'call') return S > K ? 1 : 0;
    return S < K ? -1 : 0;
  }
  const { d1 } = d1d2(S, K, T, r, sigma, q);
  if (optionType === 'call') return Math.exp(-q * T) * normalCDF(d1);
  return Math.exp(-q * T) * (normalCDF(d1) - 1);
}

export function gamma(S, K, T, r, sigma, q = 0) {
  if (T <= 0) return 0;
  const { d1 } = d1d2(S, K, T, r, sigma, q);
  return (Math.exp(-q * T) * normalPDF(d1)) / (S * sigma * Math.sqrt(T));
}

export function theta(S, K, T, r, sigma, optionType, q = 0) {
  if (T <= 0) return 0;
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  const term1 = -(S * Math.exp(-q * T) * normalPDF(d1) * sigma) / (2 * Math.sqrt(T));
  if (optionType === 'call') {
    return (term1 - r * K * Math.exp(-r * T) * normalCDF(d2) + q * S * Math.exp(-q * T) * normalCDF(d1)) / 365;
  }
  return (term1 + r * K * Math.exp(-r * T) * normalCDF(-d2) - q * S * Math.exp(-q * T) * normalCDF(-d1)) / 365;
}

export function vega(S, K, T, r, sigma, q = 0) {
  if (T <= 0) return 0;
  const { d1 } = d1d2(S, K, T, r, sigma, q);
  return (S * Math.exp(-q * T) * Math.sqrt(T) * normalPDF(d1)) / 100;
}

export function rho(S, K, T, r, sigma, optionType, q = 0) {
  if (T <= 0) return 0;
  const { d2 } = d1d2(S, K, T, r, sigma, q);
  if (optionType === 'call') {
    return (K * T * Math.exp(-r * T) * normalCDF(d2)) / 100;
  }
  return -(K * T * Math.exp(-r * T) * normalCDF(-d2)) / 100;
}

// ─── Second-order Greeks ───────────────────────────────────────────────────
// Vanna, charm and vomma existed only as educational prose. They are what
// actually explains why a delta-hedged book bleeds when IV moves (vanna) or
// when the weekend passes (charm), so they belong next to the first-order
// Greeks, not in a glossary.

/** ∂Δ/∂σ — also ∂ν/∂S. Reported per 1 percentage point of IV. */
export function vanna(S, K, T, r, sigma, q = 0) {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  return (-Math.exp(-q * T) * normalPDF(d1) * d2) / sigma / 100;
}

/** ∂Δ/∂t — delta decay. Reported per calendar day, like theta. */
export function charm(S, K, T, r, sigma, optionType, q = 0) {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  const common =
    Math.exp(-q * T) *
    (normalPDF(d1) * ((r - q) / (sigma * Math.sqrt(T)) - d2 / (2 * T)));
  if (optionType === 'call') {
    return (q * Math.exp(-q * T) * normalCDF(d1) - common) / DAYS_PER_YEAR;
  }
  return (-q * Math.exp(-q * T) * normalCDF(-d1) - common) / DAYS_PER_YEAR;
}

/** ∂ν/∂σ — volatility convexity. Reported per 1 percentage point of IV. */
export function vomma(S, K, T, r, sigma, q = 0) {
  if (T <= 0 || sigma <= 0 || S <= 0) return 0;
  const { d1, d2 } = d1d2(S, K, T, r, sigma, q);
  return (S * Math.exp(-q * T) * Math.sqrt(T) * normalPDF(d1) * ((d1 * d2) / sigma)) / 10000;
}

// Calculate option price at a given stock price and time
export function optionPrice(S, K, T, r, sigma, optionType, q = 0) {
  if (optionType === 'call') return callPrice(S, K, T, r, sigma, q);
  return putPrice(S, K, T, r, sigma, q);
}

// Calculate payoff at expiration
export function payoffAtExpiry(S, K, optionType, action, premium, quantity = 1) {
  let intrinsic;
  if (optionType === 'call') {
    intrinsic = Math.max(0, S - K);
  } else {
    intrinsic = Math.max(0, K - S);
  }

  const multiplier = action === 'buy' ? 1 : -1;
  return (intrinsic * multiplier - premium * multiplier * (action === 'buy' ? 1 : -1)) * quantity * 100;
}

// Calculate P&L for a leg (with optional dividend yield q)
export function legPnL(stockPrice, leg, currentTime, r = FALLBACK_RISK_FREE_RATE, q = 0) {
  const { strike, type, action, premium, iv, quantity = 1 } = leg;
  const T = Math.max(0, currentTime / DAYS_PER_YEAR);
  const multiplier = action === 'buy' ? 1 : -1;

  const currentValue = optionPrice(stockPrice, strike, T, r, iv, type, q);
  const pnl = (currentValue - premium) * multiplier * quantity * 100;
  return pnl;
}

/**
 * Days to expiry of the nearest-dated option leg — the "front" expiry.
 *
 * It anchors the whole diagram: the payoff-at-expiry line of a multi-expiry
 * structure is drawn at the FRONT expiry, because that is the date the
 * position changes character (the short leg disappears and what is left is a
 * naked long). Stock legs never expire, so they don't participate.
 */
export function frontDaysToExpiry(legs) {
  const dtes = (legs || [])
    .filter((l) => l && l.type !== 'stock' && Number.isFinite(l.daysToExpiry))
    .map((l) => Math.max(0, l.daysToExpiry));
  return dtes.length > 0 ? Math.min(...dtes) : 0;
}

/**
 * Calculate total strategy P&L across a price range.
 *
 * `daysRemaining` is the time left on the FRONT leg — for a single-expiry
 * strategy that is simply "days to expiry", which is what this argument has
 * always meant. From it we derive the calendar time elapsed and apply that
 * elapsed time to every leg separately, so a leg dated further out keeps its
 * own remaining life instead of being valued as if it expired with the front
 * one. Without this, a calendar or a diagonal is priced as a vertical and
 * shows a payoff that cannot happen.
 */
export function calculateStrategyPayoff(
  legs,
  stockPrice,
  priceRange,
  daysRemaining,
  r = FALLBACK_RISK_FREE_RATE,
  q = 0
) {
  const points = [];
  const minPrice = stockPrice * (1 - priceRange);
  const maxPrice = stockPrice * (1 + priceRange);
  const step = (maxPrice - minPrice) / 200;

  const frontDTE = frontDaysToExpiry(legs);
  // How far we have travelled from today towards the front expiry.
  const daysElapsed = Math.max(0, frontDTE - Math.max(0, daysRemaining));
  // Time left on each leg now, and at the moment the front leg expires.
  const remainingNow = (leg) => Math.max(0, (leg.daysToExpiry ?? frontDTE) - daysElapsed);
  const remainingAtFrontExpiry = (leg) => Math.max(0, (leg.daysToExpiry ?? frontDTE) - frontDTE);

  for (let price = minPrice; price <= maxPrice; price += step) {
    let totalPnL = 0;
    let totalPnLAtExpiry = 0;

    legs.forEach((leg) => {
      if (leg.type === 'stock') {
        const multiplier = leg.action === 'buy' ? 1 : -1;
        totalPnL += (price - stockPrice) * multiplier * (leg.quantity || 100);
        totalPnLAtExpiry += (price - stockPrice) * multiplier * (leg.quantity || 100);
      } else {
        totalPnL += legPnL(price, leg, remainingNow(leg), r, q);
        totalPnLAtExpiry += legPnL(price, leg, remainingAtFrontExpiry(leg), r, q);
      }
    });

    points.push({
      price: +price.toFixed(2),
      pnl: +totalPnL.toFixed(2),
      pnlAtExpiry: +totalPnLAtExpiry.toFixed(2),
    });
  }

  return points;
}

/**
 * P&L of the whole position at one underlying price, ON THE FRONT EXPIRY DATE.
 *
 * Same rule as the `pnlAtExpiry` series of `calculateStrategyPayoff`: a leg
 * dated further out is still alive that day and keeps its remaining life.
 */
export function expiryPnLAtPrice(price, legs, stockPrice, r = FALLBACK_RISK_FREE_RATE, q = 0) {
  const frontDTE = frontDaysToExpiry(legs);
  return (legs || []).reduce((total, leg) => {
    if (!leg) return total;
    if (leg.type === 'stock') {
      const multiplier = leg.action === 'buy' ? 1 : -1;
      return total + (price - stockPrice) * multiplier * (leg.quantity || 100);
    }
    const remaining = Math.max(0, (leg.daysToExpiry ?? frontDTE) - frontDTE);
    return total + legPnL(price, leg, remaining, r, q);
  }, 0);
}

/**
 * Slope of the payoff (€ per €1 of underlying) in the limit S → ∞.
 *
 * Structural, not sampled: far above every strike a call behaves like the
 * stock itself (delta → 1) and a put is worthless (delta → 0). The sign of
 * this number IS the answer to "is this position unbounded?", and it stays
 * valid for a leg that still has time value at the front expiry, because it
 * describes the limit rather than any particular price.
 */
export function farUpsideSlope(legs) {
  return (legs || []).reduce((slope, leg) => {
    if (!leg) return slope;
    const sign = leg.action === 'buy' ? 1 : -1;
    if (leg.type === 'call') return slope + sign * (leg.quantity || 1) * 100;
    if (leg.type === 'stock') return slope + sign * (leg.quantity || 100);
    return slope; // a put is worth nothing far above its strike
  }, 0);
}

/**
 * Best and worst case of the payoff. `null` means unbounded.
 *
 * Taking max()/min() over `calculateStrategyPayoff` cannot answer this: that
 * grid spans ±`priceRange` around spot, so a long call's "max profit" came out
 * as whatever P&L happened to sit at the right edge of the chart, and a naked
 * short call's "max loss" the same. Both are unbounded — and a number printed
 * where the answer is "unbounded" is the figure a trader sizes a position
 * with, so it is reported as `null` plus its flag, never as a capped number.
 *
 * The bounded side is exact for a single-expiry structure: the payoff is
 * piecewise linear with kinks only at the strikes, so its extreme sits at a
 * strike or at S=0 and both are sampled. A calendar keeps a curve at the front
 * expiry, hence the dense sampling in between; the unbounded verdict above is
 * exact either way.
 */
export function payoffBounds(legs, stockPrice, r = FALLBACK_RISK_FREE_RATE, q = 0) {
  const EMPTY = {
    maxProfit: null, maxLoss: null,
    isMaxProfitUnlimited: false, isMaxLossUnlimited: false,
  };
  if (!legs || legs.length === 0) return EMPTY;

  const slope = farUpsideSlope(legs);
  const strikes = legs
    .filter((l) => l && l.type !== 'stock' && Number.isFinite(l.strike))
    .map((l) => l.strike);

  const ceiling = Math.max(stockPrice || 0, ...strikes, 1) * 3;
  const prices = new Set([0, ...strikes]);
  const STEPS = 400;
  for (let i = 0; i <= STEPS; i += 1) prices.add((ceiling * i) / STEPS);

  let hi = -Infinity;
  let lo = Infinity;
  prices.forEach((price) => {
    const v = expiryPnLAtPrice(price, legs, stockPrice, r, q);
    if (!Number.isFinite(v)) return;
    if (v > hi) hi = v;
    if (v < lo) lo = v;
  });
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return EMPTY;

  return {
    maxProfit: slope > 0 ? null : hi,
    maxLoss: slope < 0 ? null : lo,
    isMaxProfitUnlimited: slope > 0,
    isMaxLossUnlimited: slope < 0,
  };
}

/**
 * Expected move over `days`, in price terms: S · σ · √(T/365).
 *
 * One standard deviation of the lognormal diffusion, which is what the market
 * is pricing through IV. Returns null when it cannot be determined — an
 * expected move without a volatility is not zero, it is unknown.
 */
export function expectedMove(stockPrice, sigma, days) {
  if (!Number.isFinite(stockPrice) || stockPrice <= 0) return null;
  if (!Number.isFinite(sigma) || sigma <= 0) return null;
  if (!Number.isFinite(days) || days <= 0) return null;
  return stockPrice * sigma * Math.sqrt(days / DAYS_PER_YEAR);
}

/** Widest IV among the option legs — the one that sets how far the chart must reach. */
function dominantIV(legs) {
  const ivs = (legs || [])
    .filter((l) => l && l.type !== 'stock' && Number.isFinite(l.iv) && l.iv > 0)
    .map((l) => l.iv);
  return ivs.length > 0 ? Math.max(...ivs) : null;
}

/**
 * Price range for the payoff chart, derived from the expected move.
 *
 * A fixed ±35% is wrong at both ends: on a 0DTE it is so wide that the whole
 * payoff collapses into a flat line in the middle of the plot, and on a
 * long-dated LEAPS of a volatile name it cuts off the part of the curve the
 * position actually lives in. 2.5σ covers ~99% of the terminal distribution.
 * The 10% floor keeps a very short expiry from producing a range so narrow
 * that the chart is useless.
 */
export function priceRangeFromExpectedMove(legs, stockPrice, opts = {}) {
  const { sigmas = 2.5, floor = 0.10, cap = 1.5 } = opts;
  const sigma = dominantIV(legs);
  const days = frontDaysToExpiry(legs);
  const move = expectedMove(stockPrice, sigma, days);
  if (move === null) return DEFAULT_PRICE_RANGE;
  return Math.min(cap, Math.max(floor, (sigmas * move) / stockPrice));
}

// Find break-even points
export function findBreakEvenPoints(payoffData) {
  const breakEvens = [];
  for (let i = 1; i < payoffData.length; i++) {
    const prev = payoffData[i - 1].pnlAtExpiry;
    const curr = payoffData[i].pnlAtExpiry;
    if ((prev <= 0 && curr >= 0) || (prev >= 0 && curr <= 0)) {
      // Linear interpolation
      const ratio = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      const breakEvenPrice = payoffData[i - 1].price + ratio * (payoffData[i].price - payoffData[i - 1].price);
      breakEvens.push(+breakEvenPrice.toFixed(2));
    }
  }
  return breakEvens;
}

// Calculate all Greeks for a strategy (with optional dividend yield q)
export function calculateStrategyGreeks(legs, stockPrice, r = FALLBACK_RISK_FREE_RATE, q = 0) {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let totalRho = 0;
  let totalVanna = 0;
  let totalCharm = 0;
  let totalVomma = 0;

  legs.forEach((leg) => {
    if (leg.type === 'stock') {
      const multiplier = leg.action === 'buy' ? 1 : -1;
      totalDelta += multiplier * (leg.quantity || 100) / 100;
      return;
    }

    const T = leg.daysToExpiry / DAYS_PER_YEAR;
    const multiplier = leg.action === 'buy' ? 1 : -1;
    const qty = leg.quantity || 1;

    totalDelta += delta(stockPrice, leg.strike, T, r, leg.iv, leg.type, q) * multiplier * qty;
    totalGamma += gamma(stockPrice, leg.strike, T, r, leg.iv, q) * multiplier * qty;
    totalTheta += theta(stockPrice, leg.strike, T, r, leg.iv, leg.type, q) * multiplier * qty;
    totalVega += vega(stockPrice, leg.strike, T, r, leg.iv, q) * multiplier * qty;
    totalRho += rho(stockPrice, leg.strike, T, r, leg.iv, leg.type, q) * multiplier * qty;
    totalVanna += vanna(stockPrice, leg.strike, T, r, leg.iv, q) * multiplier * qty;
    totalCharm += charm(stockPrice, leg.strike, T, r, leg.iv, leg.type, q) * multiplier * qty;
    totalVomma += vomma(stockPrice, leg.strike, T, r, leg.iv, q) * multiplier * qty;
  });

  return {
    delta: +totalDelta.toFixed(4),
    gamma: +totalGamma.toFixed(4),
    theta: +totalTheta.toFixed(4),
    vega: +totalVega.toFixed(4),
    rho: +totalRho.toFixed(4),
    vanna: +totalVanna.toFixed(4),
    charm: +totalCharm.toFixed(4),
    vomma: +totalVomma.toFixed(4),
  };
}

/**
 * Probability of Profit — integrates the lognormal terminal density over the
 * region where the position makes money at the FRONT expiry.
 *
 * Two things matter for multi-expiry structures. The horizon is the nearest
 * expiry (that is the date being asked about), and a leg dated beyond it still
 * has extrinsic value there, so it is priced with its remaining life instead of
 * being settled at intrinsic. Valuing a calendar's back leg at intrinsic made
 * the POP of every calendar read close to zero.
 */
export function probabilityOfProfit(legs, stockPrice, r = FALLBACK_RISK_FREE_RATE, q = 0) {
  const frontDTE = frontDaysToExpiry(legs);
  const T = frontDTE / DAYS_PER_YEAR;
  const frontLeg =
    (legs || []).find((l) => l.type !== 'stock' && l.daysToExpiry === frontDTE) || legs?.[0];
  const iv = frontLeg?.iv || 0.3;
  const minPrice = stockPrice * 0.5;
  const maxPrice = stockPrice * 2.0;
  const steps = 500;
  const step = (maxPrice - minPrice) / steps;
  let profitProb = 0;

  for (let i = 0; i < steps; i++) {
    const price = minPrice + i * step;
    let pnl = 0;

    legs.forEach((leg) => {
      const multiplier = leg.action === 'buy' ? 1 : -1;
      const qty = leg.quantity || 1;
      if (leg.type === 'stock') {
        pnl += (price - stockPrice) * multiplier * qty;
      } else {
        const leftAtFront = Math.max(0, (leg.daysToExpiry ?? frontDTE) - frontDTE);
        const value =
          leftAtFront > 0
            ? optionPrice(price, leg.strike, leftAtFront / DAYS_PER_YEAR, r, leg.iv, leg.type, q)
            : leg.type === 'call'
            ? Math.max(0, price - leg.strike)
            : Math.max(0, leg.strike - price);
        pnl += (value - leg.premium) * multiplier * qty * 100;
      }
    });

    if (pnl > 0 && T > 0) {
      // Log-normal probability density
      const d = (Math.log(price / stockPrice) - (r - 0.5 * iv * iv) * T) / (iv * Math.sqrt(T));
      const pdfVal = Math.exp(-0.5 * d * d) / (price * iv * Math.sqrt(2 * Math.PI * T));
      profitProb += pdfVal * step;
    }
  }

  return Math.min(100, Math.max(0, profitProb * 100));
}

/**
 * ±1σ (and ±2σ) cone around the spot, sampled from today to the front expiry.
 *
 * Drawn over the payoff chart it answers the question the payoff alone cannot:
 * not "what do I make at $X" but "is $X somewhere the price plausibly gets to".
 * Returns null when there is no volatility to build it from.
 */
export function probabilityCone(stockPrice, sigma, days, steps = 24) {
  if (!Number.isFinite(stockPrice) || stockPrice <= 0) return null;
  if (!Number.isFinite(sigma) || sigma <= 0) return null;
  if (!Number.isFinite(days) || days <= 0) return null;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const d = (days * i) / steps;
    const move = stockPrice * sigma * Math.sqrt(d / DAYS_PER_YEAR);
    out.push({
      day: +d.toFixed(2),
      upper1: +(stockPrice + move).toFixed(2),
      lower1: +(stockPrice - move).toFixed(2),
      upper2: +(stockPrice + 2 * move).toFixed(2),
      lower2: +(stockPrice - 2 * move).toFixed(2),
    });
  }
  return out;
}

// Risk/Reward ratio
export function riskRewardRatio(maxProfit, maxLoss) {
  if (maxLoss === 0) return Infinity;
  return Math.abs(maxProfit / maxLoss);
}

// Implied Volatility calculation using Newton-Raphson method
export function impliedVolatility(marketPrice, S, K, T, r, optionType, maxIterations = 100) {
  let sigma = 0.3; // Initial guess
  for (let i = 0; i < maxIterations; i++) {
    const price = optionPrice(S, K, T, r, sigma, optionType);
    const v = vega(S, K, T, r, sigma) * 100;
    if (Math.abs(v) < 1e-10) break;
    const diff = price - marketPrice;
    if (Math.abs(diff) < 1e-6) break;
    sigma -= diff / v;
    if (sigma <= 0) sigma = 0.01;
  }
  return sigma;
}
