/**
 * Simulation engine for the SimulatorPro calculator.
 *
 * Separated from the React component so it can be unit-tested and reused.
 * Runs trade sequences in either COMPOUND (multi-phase) or FIXED-risk mode.
 *
 * Two entry points:
 *   - `runSimulation(config)`   → ONE detailed path, with per-trade rows for
 *                                 the table and the equity chart.
 *   - `runMonteCarlo(config)`   → many paths, returning the DISTRIBUTION of
 *                                 outcomes. This is the one that answers
 *                                 "does my system have an edge", because a
 *                                 single path cannot.
 */

/** Default number of trajectories. Enough for stable P5/P95 at this cost. */
export const DEFAULT_MC_ITERATIONS = 5000;

/**
 * Seedable PRNG (mulberry32).
 *
 * `Math.random` cannot be replayed, so a sweep could report a distribution but
 * not hand back any single trajectory from inside it. That is what left the KPI
 * cards showing an arbitrary extra draw, unrelated to the percentiles printed
 * below them: press recalculate and the headline moved even though the
 * distribution barely did. With a seed per iteration, the median run can be
 * re-executed on demand and the detail the user inspects belongs to the sweep.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
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
    roi: (netResult / capitalInOp) * 100,
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
 * `rnd` is injectable for deterministic tests.
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

/**
 * Running peak-to-trough drawdown tracker.
 *
 * Max drawdown is the deepest fall FROM A RUNNING PEAK, measured in sequence.
 * `(globalPeak - globalMin) / globalPeak` is a different quantity that happens
 * to coincide sometimes: on the path 100 → 50 → 200 → 150 it reports 75%, a
 * fall that never happened, because the minimum precedes the peak. The real
 * answer there is 50%.
 */
function makeDrawdownTracker(startBalance) {
  let peak = startBalance;
  let maxDdPct = 0;
  let maxDdAbs = 0;
  return {
    push(balance) {
      if (balance > peak) peak = balance;
      const ddAbs = peak - balance;
      if (ddAbs > maxDdAbs) maxDdAbs = ddAbs;
      const ddPct = peak > 0 ? (ddAbs / peak) * 100 : 0;
      if (ddPct > maxDdPct) maxDdPct = ddPct;
    },
    get maxDrawdown() { return maxDdPct; },
    get maxDrawdownAbs() { return maxDdAbs; },
  };
}

function simulateFixed(cfg, rnd, collectOps) {
  const {
    initialBalance, fixedCapitalPerOp, fixedTotalOps, fixedWinRate,
    fixedTakeProfit, fixedStopLoss, partialTps, partialLegs, partialCont, totalCommRate,
  } = cfg;
  const ops = [];
  let accountBalance = initialBalance;
  let totalWins = 0, totalOps = 0;
  let ruinedAt = null;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;
  const dd = makeDrawdownTracker(accountBalance);

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
    const commission = Math.abs(pnl) * totalCommRate;
    const netResult = pnl - commission;
    if (isWin) { grossGain += pnl; totalWins += 1; }
    else       { grossLoss += Math.abs(pnl); }

    totalCommission += commission;
    const balanceBefore = accountBalance;
    accountBalance += netResult;
    totalOps += 1;

    // La cuenta se acaba en cero. Con tamaño fijo, cada pérdida vale lo mismo
    // pase lo que pase con el saldo, así que una racha larga lo empujaba por
    // DEBAJO de cero y la simulación seguía operando en negativo: salían
    // saldos finales de −6.509 € y drawdowns del 137 %, dos cifras que no
    // pueden pasarle a nadie. En la realidad ahí se acabó la cuenta.
    if (accountBalance <= 0) {
      accountBalance = 0;
      ruinedAt = totalOps;
    }
    dd.push(accountBalance);

    if (collectOps) {
      ops.push(makeOp(totalOps, 1, fixedTotalOps, balanceBefore, fixedCapital, netResult, commission, accountBalance, isWin));
    }
    if (ruinedAt) break;
  }
  return {
    ops, finalBalance: accountBalance, totalWins, totalOps, ruinedAt,
    maxDrawdown: dd.maxDrawdown, maxDrawdownAbs: dd.maxDrawdownAbs,
    grossGain, grossLoss, totalCommission,
  };
}

function simulateCompound(cfg, rnd, collectOps) {
  const { initialBalance, phases, compoundInterest, totalCommRate } = cfg;
  const ops = [];
  let capital = initialBalance;
  let totalWins = 0, totalOps = 0;
  let ruinedAt = null;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;
  const dd = makeDrawdownTracker(capital);

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx += 1) {
    const phase = phases[phaseIdx];
    const numOps  = phase.numOps   || 30;
    const posSize = (phase.posSize || 5) / 100;
    const tp      = (phase.tp      || 2) / 100;
    const sl      = (phase.sl      || 1) / 100;
    const winRate = (phase.winRate || 50) / 100;
    const usePartial = phase.partialTps && Array.isArray(phase.legs) && phase.legs.length > 0;
    const cont    = Math.max(0, Math.min(1, (phase.cont ?? 60) / 100));

    for (let op = 0; op < numOps; op += 1) {
      // Compounding OFF means the POSITION SIZE stops growing — it stays a
      // percentage of the starting capital — not that the account stops
      // moving. Sizing off the live balance while never updating it made the
      // whole simulation a no-op: final balance = initial, ROI 0%, drawdown 0%,
      // and 180 table rows all showing the same figure.
      const sizingBase = compoundInterest ? capital : initialBalance;
      const capitalInOp = sizingBase * posSize;
      const isWin = rnd() < winRate;
      const pnl = isWin
        ? (usePartial ? winPnlPartial(capitalInOp, phase.legs, cont, rnd) : capitalInOp * tp)
        : -(capitalInOp * sl);
      const commission = Math.abs(pnl) * totalCommRate;
      const netResult = pnl - commission;
      if (isWin) { grossGain += pnl; totalWins += 1; }
      else       { grossLoss += Math.abs(pnl); }

      totalCommission += commission;
      const capitalBefore = capital;
      capital += netResult;
      totalOps += 1;

      // Ver la nota de `simulateFixed`: la cuenta se acaba en cero. Con el
      // interés compuesto apagado el tamaño sale del saldo INICIAL, así que
      // una racha de pérdidas puede llevar el capital por debajo de cero.
      if (capital <= 0) {
        capital = 0;
        ruinedAt = totalOps;
      }
      dd.push(capital);

      if (collectOps) {
        ops.push(makeOp(totalOps, phaseIdx + 1, numOps, capitalBefore, capitalInOp, netResult, commission, capital, isWin));
      }
      if (ruinedAt) break;
    }
    if (ruinedAt) break;
  }
  return {
    ops, finalBalance: capital, totalWins, totalOps, ruinedAt,
    maxDrawdown: dd.maxDrawdown, maxDrawdownAbs: dd.maxDrawdownAbs,
    grossGain, grossLoss, totalCommission,
  };
}

function normalizeConfig(config) {
  const {
    initialBalance, capitalMode, phases, compoundInterest,
    tradingComm, platformComm,
    fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
    fixedPartialTps, fixedPartialLegs, fixedPartialCont,
  } = config;
  return {
    capitalMode,
    initialBalance,
    phases,
    compoundInterest,
    totalCommRate: (tradingComm + platformComm) / 100,
    fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
    partialTps: fixedPartialTps, partialLegs: fixedPartialLegs, partialCont: fixedPartialCont,
  };
}

function runOnePath(cfg, rnd, collectOps) {
  return cfg.capitalMode === 'fixed'
    ? simulateFixed(cfg, rnd, collectOps)
    : simulateCompound(cfg, rnd, collectOps);
}

function aggregate(inner, initialBalance) {
  const {
    finalBalance, totalWins, totalOps, maxDrawdown, maxDrawdownAbs,
    grossGain, grossLoss, totalCommission, ruinedAt,
  } = inner;
  const netGain    = finalBalance - initialBalance;
  const losers     = totalOps - totalWins;
  const avgWin     = totalWins > 0 ? grossGain / totalWins : 0;
  const avgLoss    = losers > 0 ? grossLoss / losers : 0;
  return {
    finalBalance,
    // En qué operación se quedó sin cuenta, o `null` si aguantó. No es un
    // detalle: es EL resultado de esa simulación, y sin él un saldo final de 0
    // se lee igual que "no gané nada".
    ruinedAt: ruinedAt ?? null,
    netGain,
    roi: (netGain / initialBalance) * 100,
    winRate: totalOps > 0 ? (totalWins / totalOps) * 100 : 0,
    maxDrawdown,
    maxDrawdownAbs,
    // Sin una sola pérdida, el factor de beneficio es INDEFINIDO, no infinito
    // ni cero: es una división por cero. Se devuelve `null`, que es lo que ya
    // hacía el backend (`performance.py` convierte el `inf` a `None` antes de
    // publicarlo) y lo que espera `JournalStats`. El motor era el único de los
    // tres caminos que devolvía `Infinity`, y un `Infinity` suelto envenena en
    // silencio cualquier media, percentil u ordenación que lo toque después.
    profitFactor: grossLoss > 0 ? grossGain / grossLoss : null,
    grossGain, grossLoss, totalCommission,
    expectancy: totalOps > 0
      ? (avgWin * (totalWins / totalOps)) - (avgLoss * (losers / totalOps))
      : 0,
    totalOps, totalWins, totalLosses: losers,
  };
}

/**
 * Run ONE trajectory, with the per-trade detail the table and chart need.
 *
 * Treat the numbers it returns as a single sample, not a forecast — press
 * recalculate and they change. `runMonteCarlo` is what makes them meaningful.
 */
export function runSimulation(config, rnd = Math.random) {
  const cfg = normalizeConfig(config);
  const inner = runOnePath(cfg, rnd, true);
  return { operations: inner.ops, results: aggregate(inner, cfg.initialBalance) };
}

function percentile(sortedVals, p) {
  if (!sortedVals.length) return 0;
  const idx = (sortedVals.length - 1) * (p / 100);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedVals[lo];
  return sortedVals[lo] + (sortedVals[hi] - sortedVals[lo]) * (idx - lo);
}

function summarize(sorted) {
  return {
    p5: percentile(sorted, 5),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
  };
}

/**
 * Monte Carlo: run the same system many times and report the DISTRIBUTION.
 *
 * One trajectory tells you what happened to one imaginary trader. What decides
 * whether a system is survivable is the spread: the 5th percentile outcome, how
 * deep the drawdown gets in the bad runs, how often the account is wiped out,
 * and — for anyone sizing up a funded-account challenge — how often the run
 * breaches a maximum-drawdown limit.
 *
 * @param {object}  config
 * @param {object} [opts]
 * @param {number} [opts.iterations]   trajectories to run
 * @param {number} [opts.ruinThreshold] fraction of initial capital that counts
 *                                      as ruin (0.5 = account halved)
 * @param {number} [opts.maxDrawdownLimit] % drawdown that fails a funded challenge
 * @param {function} [opts.rnd]        injectable RNG for deterministic tests
 */
export function runMonteCarlo(config, opts = {}) {
  const {
    iterations = DEFAULT_MC_ITERATIONS,
    ruinThreshold = 0.5,
    maxDrawdownLimit = 10,
    rnd = Math.random,
    baseSeed = 0x5eed,
  } = opts;

  const cfg = normalizeConfig(config);
  const n = Math.max(1, Math.min(50000, Math.floor(iterations)));
  const ruinBalance = cfg.initialBalance * ruinThreshold;

  const finals = new Array(n);
  const rois = new Array(n);
  const drawdowns = new Array(n);
  // Per-iteration seeds, so any single trajectory can be replayed later — that
  // is what lets `medianPath` be a real member of this sweep instead of a
  // separate throw of the dice. An explicit `opts.rnd` still wins, because the
  // deterministic checks in scripts/engine-check.js inject their own.
  const seeded = rnd === Math.random;
  const seeds = seeded ? new Uint32Array(n) : null;
  let ruinCount = 0;
  let profitableCount = 0;
  let breachCount = 0;

  for (let i = 0; i < n; i += 1) {
    let iterRnd = rnd;
    if (seeded) {
      const seed = (baseSeed + i * 2654435761) >>> 0;
      seeds[i] = seed;
      iterRnd = makeRng(seed);
    }
    const path = runOnePath(cfg, iterRnd, false);
    finals[i] = path.finalBalance;
    rois[i] = ((path.finalBalance - cfg.initialBalance) / cfg.initialBalance) * 100;
    drawdowns[i] = path.maxDrawdown;
    // "Ruin" = the equity floor was breached at some point, not just at the
    // end: a run that dips below the threshold and recovers still blew the
    // account, and a run that only touches it via drawdown is caught here too.
    const troughReached = cfg.initialBalance - path.maxDrawdownAbs;
    if (path.finalBalance <= ruinBalance || troughReached <= ruinBalance) ruinCount += 1;
    if (path.finalBalance > cfg.initialBalance) profitableCount += 1;
    if (path.maxDrawdown >= maxDrawdownLimit) breachCount += 1;
  }

  const sortedFinals = [...finals].sort((a, b) => a - b);
  const sortedRois = [...rois].sort((a, b) => a - b);
  const sortedDds = [...drawdowns].sort((a, b) => a - b);

  // Replay the trajectory whose final balance sits closest to the median. One
  // extra pass, versus keeping every path in memory.
  let medianPath = null;
  if (seeded && n > 0) {
    const target = percentile(sortedFinals, 50);
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(finals[i] - target);
      if (d < bestDelta) { bestDelta = d; bestIdx = i; }
    }
    medianPath = runSimulation(config, makeRng(seeds[bestIdx]));
  }

  return {
    iterations: n,
    medianPath,
    initialBalance: cfg.initialBalance,
    finalBalance: summarize(sortedFinals),
    roi: summarize(sortedRois),
    maxDrawdown: summarize(sortedDds),
    probabilityOfRuin: (ruinCount / n) * 100,
    probabilityOfProfit: (profitableCount / n) * 100,
    probabilityOfDrawdownBreach: (breachCount / n) * 100,
    ruinThresholdPct: ruinThreshold * 100,
    maxDrawdownLimit,
    // Coarse histogram of final balances for the distribution chart.
    histogram: buildHistogram(sortedFinals, 24),
  };
}

function buildHistogram(sortedVals, buckets) {
  if (!sortedVals.length) return [];
  const min = sortedVals[0];
  const max = sortedVals[sortedVals.length - 1];
  if (max === min) return [{ from: min, to: max, count: sortedVals.length }];
  const width = (max - min) / buckets;
  const bins = Array.from({ length: buckets }, (_, i) => ({
    from: min + i * width, to: min + (i + 1) * width, count: 0,
  }));
  for (const v of sortedVals) {
    const idx = Math.min(buckets - 1, Math.floor((v - min) / width));
    bins[idx].count += 1;
  }
  return bins;
}
