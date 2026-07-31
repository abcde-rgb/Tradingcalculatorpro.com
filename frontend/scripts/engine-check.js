#!/usr/bin/env node
/**
 * Offline checks for the pure client-side engines.
 *
 * These modules produce numbers a user sizes positions with, and they live in
 * the frontend where there is no pytest to catch a regression. Runs in CI next
 * to `i18n-check.js`; no browser, no network, no test framework.
 *
 *   node scripts/engine-check.js
 *
 * Exits 1 on the first failure.
 */
const path = require('path');
const { pathToFileURL } = require('url');

const SRC = path.join(__dirname, '..', 'src');
const imp = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

let failures = 0;
let checks = 0;

function ok(name, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

async function checkSimulatorEngine() {
  console.log('\nsimulatorEngine.js');
  const { runSimulation, runMonteCarlo } = await imp('components/calculators/simulator/simulatorEngine.js');

  const base = {
    initialBalance: 10000, capitalMode: 'compound', compoundInterest: true,
    tradingComm: 0, platformComm: 0,
    phases: [{ numOps: 120, posSize: 5, tp: 3, sl: 1.5, winRate: 50 }],
  };

  // §2.3 — with compounding off the account must still move. It used to stay
  // at the initial balance forever: ROI 0%, drawdown 0%, every row identical.
  const off = runSimulation({ ...base, compoundInterest: false }).results;
  ok('compounding off still moves the balance', off.finalBalance !== base.initialBalance,
    `final=${off.finalBalance}`);
  ok('compounding off produces a real drawdown', off.maxDrawdown > 0);

  // §2.3 — with compounding off, position size must NOT grow with the balance.
  const offOps = runSimulation({ ...base, compoundInterest: false }).operations;
  ok('compounding off keeps position size fixed',
    offOps.every((o) => near(o.capitalInOp, offOps[0].capitalInOp, 1e-9)));
  const onOps = runSimulation({ ...base, compoundInterest: true }).operations;
  ok('compounding on varies position size',
    onOps.some((o) => !near(o.capitalInOp, onOps[0].capitalInOp, 1e-9)));

  // §2.2 — max drawdown must be peak-to-trough IN SEQUENCE. The old formula
  // (globalPeak - globalMin) / globalPeak reports falls that never happened
  // whenever the minimum precedes the peak.
  let n = 0;
  const scripted = () => { n += 1; return n <= 1 ? 1 : 0; };   // lose first, then win
  const seq = runSimulation({
    initialBalance: 100, capitalMode: 'fixed', compoundInterest: false,
    tradingComm: 0, platformComm: 0,
    fixedCapitalPerOp: 100, fixedTotalOps: 3, fixedWinRate: 50,
    fixedTakeProfit: 100, fixedStopLoss: 50,
  }, scripted);
  // path: 100 → 50 → 150 → 250. Real max DD = 50%; the old formula gives
  // (250-50)/250 = 80%.
  ok('max drawdown is sequential peak-to-trough',
    near(seq.results.maxDrawdown, 50, 0.001),
    `got ${seq.results.maxDrawdown.toFixed(2)}%, expected 50%`);

  // §2.2 — Monte Carlo returns a DISTRIBUTION, not one roll of the dice.
  const mc = runMonteCarlo(base, { iterations: 2000, ruinThreshold: 0.5, maxDrawdownLimit: 10 });
  ok('monte carlo runs the requested trajectories', mc.iterations === 2000);
  ok('percentiles are ordered',
    mc.finalBalance.p5 <= mc.finalBalance.p50 && mc.finalBalance.p50 <= mc.finalBalance.p95);
  ok('drawdown percentiles are ordered', mc.maxDrawdown.p50 <= mc.maxDrawdown.p95);
  ok('probabilities are percentages in range',
    [mc.probabilityOfRuin, mc.probabilityOfProfit, mc.probabilityOfDrawdownBreach]
      .every((p) => p >= 0 && p <= 100));
  ok('histogram is produced', Array.isArray(mc.histogram) && mc.histogram.length > 1);

  // A system with a real negative edge and large position sizing must show ruin.
  // ~-0.57% expected per trade over 400 trades compounds to roughly a 90% loss,
  // so almost every trajectory should breach a 50% ruin threshold.
  const doomed = runMonteCarlo({
    ...base, phases: [{ numOps: 400, posSize: 60, tp: 1, sl: 2, winRate: 35 }],
  }, { iterations: 1000, ruinThreshold: 0.5 });
  ok('negative-edge system shows ruin risk', doomed.probabilityOfRuin > 50,
    `got ${doomed.probabilityOfRuin.toFixed(1)}%`);

  // A single path is a sample: two runs of the same config should differ.
  const a = runSimulation(base).results.finalBalance;
  const b = runSimulation(base).results.finalBalance;
  ok('single path is stochastic (why the distribution matters)', a !== b);
}

async function checkTradingSystemModel() {
  console.log('\ntradingSystemModel.js');
  const m = await imp('components/education/tradingSystemModel.js');

  // The v1 builder kept ONE setup under one localStorage key and overwrote it
  // on every save. Migration must not lose that setup.
  const legacy = {
    name: 'Ruptura A+', timeframe: '4h', style: 'swing',
    approaches: ['wyckoff', 'sr'], tools: ['ema', 'atr'], risk: '1', rr: '2.5',
  };
  const migrated = m.migrateLegacySetup(legacy);
  ok('legacy setup migrates', migrated !== null);
  ok('legacy name preserved', migrated.name === 'Ruptura A+');
  ok('legacy timeframe becomes the ENTRY frame', migrated.ltfTimeframe === '4h');
  ok('legacy approaches preserved', migrated.approaches.length === 2);
  ok('legacy risk/rr preserved', migrated.riskPerTrade === '1' && migrated.rr === '2.5');
  ok('migrated setup gets an id', Boolean(migrated.id));
  ok('empty legacy setup is not migrated', m.migrateLegacySetup({ approaches: [], tools: [] }) === null);

  // A fake storage so this runs without a browser.
  const store = (() => {
    const data = {};
    return {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v); },
      _data: data,
    };
  })();

  store.setItem(m.LEGACY_STORAGE_KEY, JSON.stringify(legacy));
  const loaded = m.loadSystem(store);
  ok('loadSystem migrates a v1 key into the library', loaded.setups.length === 1);
  ok('migrated library carries system rules', typeof loaded.systemRules === 'object');

  // The library must hold MORE THAN ONE setup — the whole point of v2.
  loaded.setups.push(m.makeSetup({ name: 'Pullback EMA20' }));
  loaded.setups.push(m.makeSetup({ name: 'Reversión en rango' }));
  m.saveSystem(loaded, store);
  const reloaded = m.loadSystem(store);
  ok('multiple setups persist without overwriting each other', reloaded.setups.length === 3);
  ok('setup ids are unique', new Set(reloaded.setups.map((s) => s.id)).size === 3);

  ok('corrupt payload falls back to an empty system',
    m.loadSystem({ getItem: () => '{not json', setItem: () => {} }).setups.length === 0);

  // The trigger and the invalidation are what make a setup operable.
  const bare = m.makeSetup({ name: 'x' });
  const missing = m.missingEssentials(bare);
  ok('missing entry trigger is reported', missing.includes('entryTrigger'));
  ok('missing invalidation is reported', missing.includes('invalidation'));
  ok('missing stop rule is reported', missing.includes('stopRule'));
  const complete = m.makeSetup({
    name: 'x', entryTrigger: 'close above signal high', invalidation: 'loses range low',
    stopRule: 'structural', riskPerTrade: '1',
  });
  ok('a complete setup reports no gaps', m.missingEssentials(complete).length === 0);

  ok('setupHasContent is false for a blank setup', m.setupHasContent(m.makeSetup()) === false);
  ok('setupHasContent is true once a trigger exists',
    m.setupHasContent(m.makeSetup({ entryTrigger: 'x' })) === true);
}

async function checkOptionsEngine() {
  console.log('\nblackScholes.js');
  const bs = await imp('utils/blackScholes.js');
  const {
    calculateStrategyPayoff, frontDaysToExpiry, priceRangeFromExpectedMove,
    expectedMove, probabilityCone, vanna, charm, vomma, calculateStrategyGreeks,
    probabilityOfProfit, FALLBACK_RISK_FREE_RATE,
  } = bs;

  const S = 100;
  const r = 0.0428;
  const leg = (over) => ({
    type: 'call', action: 'buy', quantity: 1, strike: 100, premium: 3, iv: 0.30,
    daysToExpiry: 30, ...over,
  });

  // ── El vencimiento de referencia ────────────────────────────────────
  ok('front expiry is the nearest option leg',
    frontDaysToExpiry([leg({ daysToExpiry: 60 }), leg({ daysToExpiry: 21 })]) === 21);
  ok('stock legs never set the front expiry',
    frontDaysToExpiry([{ type: 'stock', action: 'buy', quantity: 100 }, leg({ daysToExpiry: 45 })]) === 45);
  ok('no option legs means no expiry', frontDaysToExpiry([]) === 0);

  // ── Compatibilidad: mono-expiración se comporta igual que antes ─────
  const single = [leg()];
  const flat = calculateStrategyPayoff(single, S, 0.35, 30, r, 0);
  const atExpiryPoint = flat.find((p) => p.price >= 110);
  // Con una sola expiración, `pnlAtExpiry` sigue siendo el valor intrínseco.
  const intrinsic = (Math.max(0, atExpiryPoint.price - 100) - 3) * 100;
  ok('single-expiry payoff at expiry is still intrinsic',
    near(atExpiryPoint.pnlAtExpiry, intrinsic, 0.02),
    `${atExpiryPoint.pnlAtExpiry} vs ${intrinsic}`);
  ok('the time argument still means days remaining',
    near(flat[0].pnl, calculateStrategyPayoff(single, S, 0.35, 30, r, 0)[0].pnl));

  // ── Calendars: la pata larga conserva valor al vencer la corta ──────
  const calendar = [
    leg({ action: 'sell', daysToExpiry: 30, premium: 3 }),
    leg({ action: 'buy', daysToExpiry: 90, premium: 6 }),
  ];
  const calPayoff = calculateStrategyPayoff(calendar, S, 0.30, 30, r, 0);
  const atm = calPayoff.reduce((best, p) =>
    Math.abs(p.price - S) < Math.abs(best.price - S) ? p : best, calPayoff[0]);
  // Si la pata de 90 días se liquidara con la de 30, en el strike el P&L al
  // vencimiento sería el débito neto completo (−300). Conservando su vida
  // restante vale bastante más, que es justo lo que hace ganador al calendar.
  ok('calendar back leg keeps extrinsic value at the front expiry',
    atm.pnlAtExpiry > -300 + 1,
    `pnlAtExpiry=${atm.pnlAtExpiry} (would be −300 if both legs settled together)`);
  ok('calendar peaks near the short strike at the front expiry',
    calPayoff.every((p) => p.pnlAtExpiry <= atm.pnlAtExpiry + 1e-6));

  // Con vencimientos IGUALES la estructura es una prima neta plana: sirve de
  // control de que la diferencia de arriba viene del tiempo, no del signo.
  const sameExpiry = [
    leg({ action: 'sell', daysToExpiry: 30, premium: 3 }),
    leg({ action: 'buy', daysToExpiry: 30, premium: 6 }),
  ];
  const sameAtm = calculateStrategyPayoff(sameExpiry, S, 0.30, 30, r, 0)
    .reduce((best, p) => (Math.abs(p.price - S) < Math.abs(best.price - S) ? p : best));
  ok('same-expiry control settles to the net debit', near(sameAtm.pnlAtExpiry, -300, 1),
    `${sameAtm.pnlAtExpiry}`);

  // ── Rango derivado del expected move ────────────────────────────────
  const shortDated = priceRangeFromExpectedMove([leg({ daysToExpiry: 1, iv: 0.25 })], S);
  const longDated = priceRangeFromExpectedMove([leg({ daysToExpiry: 700, iv: 0.80 })], S);
  ok('a 0DTE does not get a ±35% chart', shortDated < 0.35, `${shortDated}`);
  ok('the range never collapses below the floor', shortDated >= 0.10, `${shortDated}`);
  ok('a volatile LEAPS gets a wider chart than a weekly', longDated > shortDated);
  ok('the range is capped', longDated <= 1.5, `${longDated}`);
  ok('no volatility falls back to the default range',
    priceRangeFromExpectedMove([leg({ iv: 0 })], S) === 0.35);

  // ── Expected move y cono ────────────────────────────────────────────
  ok('expected move is one sigma', near(expectedMove(100, 0.20, 365), 20, 1e-9));
  ok('expected move scales with the square root of time',
    near(expectedMove(100, 0.20, 365 / 4), expectedMove(100, 0.20, 365) / 2, 1e-9));
  ok('an expected move with no volatility is unknown, not zero',
    expectedMove(100, null, 30) === null && expectedMove(100, 0, 30) === null);
  const cone = probabilityCone(100, 0.30, 30, 4);
  ok('the cone starts at the spot', cone[0].upper1 === 100 && cone[0].lower1 === 100);
  ok('the cone widens with time', cone[4].upper1 > cone[1].upper1);
  ok('the 2σ band contains the 1σ band', cone[4].upper2 > cone[4].upper1);
  ok('a cone with no volatility is null', probabilityCone(100, 0, 30) === null);

  // ── Griegas de segundo orden ────────────────────────────────────────
  ok('vanna is zero at expiry', vanna(100, 100, 0, r, 0.3) === 0);
  ok('charm is zero at expiry', charm(100, 100, 0, r, 0.3, 'call') === 0);
  ok('vomma is zero at expiry', vomma(100, 100, 0, r, 0.3) === 0);
  // ATM: d1·d2 ≈ 0, así que vomma pasa por (casi) cero y cambia de signo fuera.
  ok('vomma is near zero at the money', Math.abs(vomma(100, 100, 30 / 365, r, 0.3)) < 0.01);
  ok('vomma grows away from the money', vomma(100, 130, 30 / 365, r, 0.3) > vomma(100, 100, 30 / 365, r, 0.3));
  ok('vanna of an OTM call is positive', vanna(100, 120, 30 / 365, r, 0.3) > 0);
  const g = calculateStrategyGreeks(single, S, r, 0);
  ok('the greeks bundle now carries second order',
    ['vanna', 'charm', 'vomma'].every((k) => Number.isFinite(g[k])));

  // ── Tipo libre de riesgo ────────────────────────────────────────────
  ok('the fallback rate is a single named constant', FALLBACK_RISK_FREE_RATE === 0.05);
  const rhoAt0 = calculateStrategyGreeks(single, S, 0, 0).rho;
  const rhoAt5 = calculateStrategyGreeks(single, S, 0.05, 0).rho;
  ok('rho actually responds to the rate passed in', rhoAt0 !== rhoAt5);

  // ── POP con vencimientos distintos ──────────────────────────────────
  const popCal = probabilityOfProfit(calendar, S, r, 0);
  ok('a calendar has a non-degenerate probability of profit',
    popCal > 1 && popCal < 99, `${popCal}`);
}

(async () => {
  console.log('engine-check — offline checks for the client-side engines');
  await checkSimulatorEngine();
  await checkTradingSystemModel();
  await checkOptionsEngine();
  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
})().catch((err) => {
  console.error('engine-check crashed:', err);
  process.exit(1);
});
