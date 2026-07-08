/**
 * Pure simulation engine for the SimulatorPro calculator.
 *
 * Separated from the React component so it can be unit-tested and reused.
 * Runs Monte-Carlo style trades in either COMPOUND (multi-phase) or
 * FIXED-risk mode.
 *
 * Returns { results, operations }. `operations` is an array with per-trade
 * detail for charts/tables; `results` is the aggregate KPI object.
 */

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

function simulateFixed({ initialBalance, fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss, partialTps, partialLegs, partialCont, totalCommRate }) {
  const ops = [];
  let accountBalance = initialBalance;
  let totalWins = 0, totalOps = 0, peakBalance = accountBalance, minBalance = accountBalance;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;

  const fixedCapital = fixedCapitalPerOp;
  const winRate = fixedWinRate / 100;
  const tp = fixedTakeProfit / 100;
  const sl = fixedStopLoss / 100;
  const usePartial = partialTps && Array.isArray(partialLegs) && partialLegs.length > 0;
  const cont = Math.max(0, Math.min(1, (partialCont ?? 60) / 100));

  for (let op = 0; op < fixedTotalOps; op += 1) {
    const isWin = Math.random() < winRate;
    const pnl = isWin
      ? (usePartial ? winPnlPartial(fixedCapital, partialLegs, cont) : fixedCapital * tp)
      : -(fixedCapital * sl);
    const commission = Math.abs(pnl) * totalCommRate;
    const netResult = pnl - commission;
    if (isWin) { grossGain += pnl; totalWins += 1; }
    else       { grossLoss += Math.abs(pnl); }

    totalCommission += commission;
    const balanceBefore = accountBalance;
    accountBalance += netResult;
    peakBalance = Math.max(peakBalance, accountBalance);
    minBalance = Math.min(minBalance, accountBalance);
    totalOps += 1;

    ops.push(makeOp(totalOps, 1, fixedTotalOps, balanceBefore, fixedCapital, netResult, commission, accountBalance, isWin));
  }
  return { ops, finalBalance: accountBalance, totalWins, totalOps, peakBalance, minBalance, grossGain, grossLoss, totalCommission };
}

function simulateCompound({ initialBalance, phases, compoundInterest, totalCommRate }) {
  const ops = [];
  let capital = initialBalance;
  let totalWins = 0, totalOps = 0, peakBalance = capital, minBalance = capital;
  let grossGain = 0, grossLoss = 0, totalCommission = 0;

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx += 1) {
    const phase = phases[phaseIdx];
    const numOps  = phase.numOps   || 30;
    const posSize = (phase.posSize || 5) / 100;
    const tp      = (phase.tp      || 2) / 100;
    const sl      = (phase.sl      || 1) / 100;
    const winRate = (phase.winRate || 50) / 100;

    for (let op = 0; op < numOps; op += 1) {
      const capitalInOp = capital * posSize;
      const isWin = Math.random() < winRate;
      const pnl = isWin ? capitalInOp * tp : -(capitalInOp * sl);
      const commission = Math.abs(pnl) * totalCommRate;
      const netResult = pnl - commission;
      if (isWin) { grossGain += pnl; totalWins += 1; }
      else       { grossLoss += Math.abs(pnl); }

      totalCommission += commission;
      const capitalBefore = capital;
      if (compoundInterest) capital += netResult;

      peakBalance = Math.max(peakBalance, capital);
      minBalance = Math.min(minBalance, capital);
      totalOps += 1;

      ops.push(makeOp(totalOps, phaseIdx + 1, numOps, capitalBefore, capitalInOp, netResult, commission, capital, isWin));
    }
  }
  return { ops, finalBalance: capital, totalWins, totalOps, peakBalance, minBalance, grossGain, grossLoss, totalCommission };
}

export function runSimulation(config) {
  const {
    initialBalance, capitalMode, phases, compoundInterest,
    tradingComm, platformComm,
    fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
    fixedPartialTps, fixedPartialLegs, fixedPartialCont,
  } = config;

  const totalCommRate = (tradingComm + platformComm) / 100;
  const inner = capitalMode === 'fixed'
    ? simulateFixed({ initialBalance, fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
        partialTps: fixedPartialTps, partialLegs: fixedPartialLegs, partialCont: fixedPartialCont, totalCommRate })
    : simulateCompound({ initialBalance, phases, compoundInterest, totalCommRate });

  const { ops, finalBalance, totalWins, totalOps, peakBalance, minBalance, grossGain, grossLoss, totalCommission } = inner;
  const netGain       = finalBalance - initialBalance;
  const roi           = (netGain / initialBalance) * 100;
  const winRatePct    = totalOps > 0 ? (totalWins / totalOps) * 100 : 0;
  const losers        = totalOps - totalWins;
  const avgWin        = totalWins > 0 ? grossGain / totalWins : 0;
  const avgLoss       = losers > 0 ? grossLoss / losers : 0;
  const expectancy    = totalOps > 0
    ? (avgWin * (totalWins / totalOps)) - (avgLoss * (losers / totalOps))
    : 0;
  const maxDrawdown   = peakBalance > 0 ? ((peakBalance - minBalance) / peakBalance) * 100 : 0;
  const profitFactor  = grossLoss > 0 ? grossGain / grossLoss : grossGain > 0 ? Infinity : 0;

  return {
    operations: ops,
    results: {
      finalBalance, netGain, roi,
      winRate: winRatePct, maxDrawdown, profitFactor,
      grossGain, grossLoss, totalCommission, expectancy,
      totalOps, totalWins, totalLosses: losers,
    },
  };
}
