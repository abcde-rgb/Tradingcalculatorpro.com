/**
 * Pure simulation engine for the SimulatorPro calculator.
 *
 * Separated from the React component so it can be unit-tested and reused.
 * The tool's ESSENCE is a LONG-TERM, multi-phase equity progression: capital
 * grows (or shrinks) across several phases, each with its own win rate, size
 * and targets. `runSimulation` returns that single equity journey.
 *
 * `runMonteCarlo` complements it WITHOUT replacing it: it runs the exact same
 * multi-phase config many times to reveal the RANGE of long-term outcomes
 * (pessimistic / median / optimistic, probability of profit, worst drawdown,
 * worst losing streak). The equity curve shown to the user is the MEDIAN run,
 * so it is representative of the long term instead of one lucky/unlucky path.
 */

/**
 * mulberry32 — tiny deterministic PRNG (0..1). A given seed always yields the
 * same sequence, so a Monte-Carlo run can be reproduced from its seed alone.
 * That is how we redraw the median path: we store each run's seed, then replay
 * the one whose final balance is the median.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeOp(num, phase, numOpsInPhase, capitalBefore, capitalInOp, netResult, commission, capitalAfter, isWin) {
  return {
    num,
    phase,
    numOpsInPhase,
    capitalBefore,
    capitalInOp,
    pnl: netResult,
    commission,
    capitalAfter,
    isWin,
    roi: capitalInOp > 0 ? (netResult / capitalInOp) * 100 : 0,
  };
}

/**
 * Winning-trade PnL when scaling out with PARTIAL take-profits.
 *
 * `legs` = [{ r, pct }] with r = target as a % gain and pct = % of the position
 * closed there. TP1 is assumed reached on a win; each further leg is reached
 * only with probability `cont` (sequential). Once a leg is missed, the rest of
 * the position closes at break-even (0) — the professional "move the stop to
 * break-even after TP1" behaviour, so the runner can't turn into a loss.
 * `rnd` is injectable for deterministic tests / seeded Monte-Carlo.
 */
export function winPnlPartial(fixedCapital, legs, cont, rnd = Math.random) {
  let pnl = 0;
  let reached = true;
  for (let i = 0; i < legs.length; i += 1) {
    if (i > 0) reached = reached && rnd() < cont;
    if (!reached) break;                         // remainder closes at break-even (0)
    pnl += fixedCapital * ((legs[i].pct || 0) / 100) * ((legs[i].r || 0) / 100);
  }
  return pnl;
}

/** Running-peak drawdown + win/loss streak tracker, shared by both modes. */
function makeTracker(startBalance) {
  let runningPeak = startBalance;
  let maxDD = 0;
  let curWin = 0, curLoss = 0, maxWinStreak = 0, maxLossStreak = 0;
  return {
    // Called after each trade with the new balance and win flag.
    update(balance, isWin) {
      if (balance > runningPeak) runningPeak = balance;
      const dd = runningPeak > 0 ? (runningPeak - balance) / runningPeak : 0;
      if (dd > maxDD) maxDD = dd;
      if (isWin) { curWin += 1; curLoss = 0; if (curWin > maxWinStreak) maxWinStreak = curWin; }
      else       { curLoss += 1; curWin = 0; if (curLoss > maxLossStreak) maxLossStreak = curLoss; }
    },
    get maxDrawdown() { return maxDD * 100; },
    get maxWinStreak() { return maxWinStreak; },
    get maxLossStreak() { return maxLossStreak; },
  };
}

function simulateFixed({ initialBalance, fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss, partialTps, partialLegs, partialCont, totalCommRate }, rnd, collectOps) {
  const ops = collectOps ? [] : null;
  let accountBalance = initialBalance;
  let totalWins = 0, totalOps = 0;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;
  const tr = makeTracker(accountBalance);

  const fixedCapital = fixedCapitalPerOp;
  const winRate = fixedWinRate / 100;
  const tp = fixedTakeProfit / 100;
  const sl = fixedStopLoss / 100;
  const usePartial = partialTps && Array.isArray(partialLegs) && partialLegs.length > 0;
  const cont = Math.max(0, Math.min(1, (partialCont ?? 60) / 100));

  for (let op = 0; op < fixedTotalOps; op += 1) {
    const isWin = rnd() < winRate;
    const pnl = isWin
      ? (usePartial ? winPnlPartial(fixedCapital, partialLegs, cont, rnd) : fixedCapital * tp)
      : -(fixedCapital * sl);
    // Commission is charged on the traded NOTIONAL (position size), the way
    // brokers/exchanges actually bill it — not on the P&L.
    const commission = fixedCapital * totalCommRate;
    const netResult = pnl - commission;
    if (isWin) { grossGain += pnl; totalWins += 1; }
    else       { grossLoss += Math.abs(pnl); }

    totalCommission += commission;
    const balanceBefore = accountBalance;
    accountBalance += netResult;
    tr.update(accountBalance, isWin);
    totalOps += 1;

    if (collectOps) ops.push(makeOp(totalOps, 1, fixedTotalOps, balanceBefore, fixedCapital, netResult, commission, accountBalance, isWin));
  }
  return {
    ops, finalBalance: accountBalance, totalWins, totalOps,
    maxDrawdown: tr.maxDrawdown, maxWinStreak: tr.maxWinStreak, maxLossStreak: tr.maxLossStreak,
    grossGain, grossLoss, totalCommission,
  };
}

function simulateCompound({ initialBalance, phases, compoundInterest, totalCommRate }, rnd, collectOps) {
  const ops = collectOps ? [] : null;
  let capital = initialBalance;
  let totalWins = 0, totalOps = 0;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;
  const tr = makeTracker(capital);

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx += 1) {
    const phase = phases[phaseIdx];
    // Nullish coalescing (not ||) so a legitimate 0 (e.g. winRate 0) is kept
    // instead of silently falling back to the default.
    const numOps  = phase.numOps   ?? 30;
    const posSize = (phase.posSize ?? 5) / 100;
    const tp      = (phase.tp      ?? 2) / 100;
    const sl      = (phase.sl      ?? 1) / 100;
    const winRate = (phase.winRate ?? 50) / 100;
    const usePartial = phase.partialTps && Array.isArray(phase.legs) && phase.legs.length > 0;
    const cont    = Math.max(0, Math.min(1, (phase.cont ?? 60) / 100));

    for (let op = 0; op < numOps; op += 1) {
      // When compounding is ON the position scales with the growing capital;
      // when OFF it is a fixed fraction of the INITIAL balance (fixed sizing).
      // Either way the P&L always accrues to the running balance.
      const sizingBase = compoundInterest ? capital : initialBalance;
      const capitalInOp = sizingBase * posSize;
      const isWin = rnd() < winRate;
      const pnl = isWin
        ? (usePartial ? winPnlPartial(capitalInOp, phase.legs, cont, rnd) : capitalInOp * tp)
        : -(capitalInOp * sl);
      const commission = capitalInOp * totalCommRate;   // on notional, see simulateFixed
      const netResult = pnl - commission;
      if (isWin) { grossGain += pnl; totalWins += 1; }
      else       { grossLoss += Math.abs(pnl); }

      totalCommission += commission;
      const capitalBefore = capital;
      capital += netResult;
      tr.update(capital, isWin);
      totalOps += 1;

      if (collectOps) ops.push(makeOp(totalOps, phaseIdx + 1, numOps, capitalBefore, capitalInOp, netResult, commission, capital, isWin));
    }
  }
  return {
    ops, finalBalance: capital, totalWins, totalOps,
    maxDrawdown: tr.maxDrawdown, maxWinStreak: tr.maxWinStreak, maxLossStreak: tr.maxLossStreak,
    grossGain, grossLoss, totalCommission,
  };
}

function simulateOnce(config, rnd, collectOps) {
  const {
    initialBalance, capitalMode, phases, compoundInterest,
    tradingComm, platformComm,
    fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
    fixedPartialTps, fixedPartialLegs, fixedPartialCont,
  } = config;

  const totalCommRate = (tradingComm + platformComm) / 100;
  return capitalMode === 'fixed'
    ? simulateFixed({ initialBalance, fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
        partialTps: fixedPartialTps, partialLegs: fixedPartialLegs, partialCont: fixedPartialCont, totalCommRate }, rnd, collectOps)
    : simulateCompound({ initialBalance, phases, compoundInterest, totalCommRate }, rnd, collectOps);
}

/** Turn a raw single-run result into the aggregate KPI object used by the UI. */
function aggregate(inner, initialBalance) {
  const { finalBalance, totalWins, totalOps, grossGain, grossLoss, totalCommission, maxDrawdown, maxWinStreak, maxLossStreak } = inner;
  const netGain       = finalBalance - initialBalance;
  const roi           = initialBalance > 0 ? (netGain / initialBalance) * 100 : 0;
  const winRatePct    = totalOps > 0 ? (totalWins / totalOps) * 100 : 0;
  const losers        = totalOps - totalWins;
  const avgWin        = totalWins > 0 ? grossGain / totalWins : 0;
  const avgLoss       = losers > 0 ? grossLoss / losers : 0;
  const expectancy    = totalOps > 0
    ? (avgWin * (totalWins / totalOps)) - (avgLoss * (losers / totalOps))
    : 0;
  const profitFactor  = grossLoss > 0 ? grossGain / grossLoss : grossGain > 0 ? Infinity : 0;

  return {
    finalBalance, netGain, roi,
    winRate: winRatePct, maxDrawdown, profitFactor,
    grossGain, grossLoss, totalCommission, expectancy,
    totalOps, totalWins, totalLosses: losers,
    maxWinStreak, maxLossStreak,
  };
}

/**
 * Run ONE representative multi-phase journey (the essence: a single equity
 * curve + per-trade detail). Pass `{ seed }` for a reproducible path (used to
 * redraw the median run); omit it for a fresh random path.
 */
export function runSimulation(config, opts = {}) {
  const rnd = opts.seed != null ? mulberry32(opts.seed) : Math.random;
  const inner = simulateOnce(config, rnd, true);
  return {
    operations: inner.ops,
    results: aggregate(inner, config.initialBalance),
  };
}

/**
 * Run the SAME config `iterations` times to map the long-term outcome range.
 * Returns the distribution stats plus `medianSeed`, the seed of the run whose
 * final balance is the median — replay it with `runSimulation(config, { seed })`
 * to display the representative (median) equity curve.
 */
export function runMonteCarlo(config, opts = {}) {
  const iterations = Math.max(1, opts.iterations || 1000);
  const seedBase = opts.seedBase != null ? (opts.seedBase >>> 0) : (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0);

  const runs = new Array(iterations);
  for (let i = 0; i < iterations; i += 1) {
    const seed = (seedBase + i) >>> 0;
    const inner = simulateOnce(config, mulberry32(seed), false);
    runs[i] = { seed, finalBalance: inner.finalBalance, maxDrawdown: inner.maxDrawdown, maxLossStreak: inner.maxLossStreak };
  }

  const sorted = [...runs].sort((a, b) => a.finalBalance - b.finalBalance);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  const p5 = at(0.05), p50 = at(0.50), p95 = at(0.95);

  const initial = config.initialBalance;
  const n = runs.length;
  const mean = runs.reduce((s, r) => s + r.finalBalance, 0) / n;
  const profitProbability = (runs.filter((r) => r.finalBalance > initial).length / n) * 100;
  const avgMaxDrawdown = runs.reduce((s, r) => s + r.maxDrawdown, 0) / n;
  const worstMaxDrawdown = runs.reduce((m, r) => Math.max(m, r.maxDrawdown), 0);
  const worstLosingStreak = runs.reduce((m, r) => Math.max(m, r.maxLossStreak), 0);

  return {
    iterations: n,
    medianSeed: p50.seed,
    distribution: {
      worst: sorted[0].finalBalance,
      p5: p5.finalBalance,
      p50: p50.finalBalance,
      p95: p95.finalBalance,
      best: sorted[n - 1].finalBalance,
      mean,
      profitProbability,
      avgMaxDrawdown,
      worstMaxDrawdown,
      worstLosingStreak,
    },
  };
}
