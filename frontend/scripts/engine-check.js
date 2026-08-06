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
  console.log('\ntradingSystem.js');
  const m = await imp('lib/tradingSystem.js');

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

  // ── The library crossed with the journal's analytics ──────────────────────
  // A setup you cannot measure is a wish. This join is what turns the builder
  // from a form into a scoreboard, so its edge cases are worth fixing here.
  const setups = [
    m.makeSetup({ name: 'Ruptura NY' }),
    m.makeSetup({ name: 'Pullback EMA20' }),
    m.makeSetup({ name: 'Sin operar' }),
  ];
  const analytics = [
    { group: 'ruptura ny ', n: 12, wins: 7, win_rate: 58.3, pnl: 940 },  // same setup, typed loosely
    { group: 'Pullback EMA20', n: 5, wins: 2, win_rate: 40, pnl: -120 },
    { group: 'Impulso a la contra', n: 3, wins: 0, win_rate: 0, pnl: -430 },
    { group: '—', n: 4, wins: 2, win_rate: 50, pnl: 60 },
  ];
  const joined = m.joinSetupPerformance(setups, analytics);
  ok('setup names match case- and space-insensitively',
    joined.defined[0].stats?.n === 12);
  ok('a setup never traded has NO stats (no sample ≠ 0% win rate)',
    joined.defined[2].stats === null);
  ok('a traded setup that is not in the system is flagged apart',
    joined.offSystem.length === 1 && joined.offSystem[0].group === 'Impulso a la contra');
  ok('trades logged without a setup are their own bucket',
    joined.unlabelled?.n === 4);
  ok('counts describe the library, not the analytics',
    joined.counts.defined === 3 && joined.counts.traded === 2
    && joined.counts.untraded === 1 && joined.counts.offSystemTrades === 3);
  const emptyJoin = m.joinSetupPerformance(null, null);
  ok('an empty library and empty analytics do not throw',
    emptyJoin.defined.length === 0 && emptyJoin.offSystem.length === 0);

  // ── Un trade puede llevar VARIOS setups ──────────────────────────────────
  ok('a trade reads its setups from the list',
    m.tradeSetups({ setups: ['A', 'B'] }).join('|') === 'A|B');
  ok('an old trade reads them from the joined string',
    m.tradeSetups({ setup: `Ruptura NY${m.SETUP_SEPARATOR}Pullback EMA20` }).length === 2);
  ok('a trade with no setup has none', m.tradeSetups({}).length === 0);
  ok('the same setup is not added twice',
    m.addSetup(['Ruptura NY'], ' ruptura ny ').length === 1);
  ok('the separator is stripped from a typed name',
    m.addSetup([], `A${m.SETUP_SEPARATOR}B`)[0] === 'A B');
  ok('the cap is respected',
    m.addSetup(['a', 'b', 'c', 'd', 'e'], 'f').length === m.MAX_SETUPS_PER_TRADE);

  // Contra un backend anterior a `setups`, un trade con dos setups llega como
  // UN grupo con la cadena unida. Debe acreditar a los dos, igual que hace ya
  // el backend nuevo — si no, el marcador diría "sin muestra" sobre setups
  // que sí se han operado.
  const legacyJoin = m.joinSetupPerformance(
    [m.makeSetup({ name: 'Ruptura NY' }), m.makeSetup({ name: 'Pullback EMA20' })],
    [
      { group: `Ruptura NY${m.SETUP_SEPARATOR}Pullback EMA20`, n: 3, wins: 2, win_rate: 66.7, pnl: 300 },
      { group: 'Ruptura NY', n: 1, wins: 0, win_rate: 0, pnl: -100 },
    ],
  );
  ok('a joined group credits every setup in it',
    legacyJoin.defined[1].stats?.n === 3);
  ok('a setup present in two rows adds them up',
    legacyJoin.defined[0].stats?.n === 4 && legacyJoin.defined[0].stats?.pnl === 200);
  ok('the win rate is recomputed after merging, not averaged',
    legacyJoin.defined[0].stats?.win_rate === 50);
  ok('nothing is left over as off-system', legacyJoin.offSystem.length === 0);

  // ── El diario juzga con las reglas DEL setup, no con dos constantes ───────
  const sys = m.emptySystem();
  sys.setups = [
    m.makeSetup({ name: 'Ruptura NY', rr: '2', riskPerTrade: '1' }),
    m.makeSetup({ name: 'Pullback EMA20', rr: '3', riskPerTrade: '0.5' }),
    m.makeSetup({ name: 'Sin reglas' }),
  ];
  const own = m.setupRulesFor(sys, ['Ruptura NY']);
  ok('the trade is judged by its own setup rule', own.minRR === 2 && own.maxRiskPct === 1);
  ok('and it says the rule is the user\'s, not a default',
    own.rrSource === 'setup' && own.riskSource === 'setup');

  const both = m.setupRulesFor(sys, ['Ruptura NY', 'Pullback EMA20']);
  ok('with two setups the STRICTEST of each rule wins',
    both.minRR === 3 && both.maxRiskPct === 0.5);

  const none = m.setupRulesFor(sys, ['Sin reglas']);
  ok('a setup without rules falls back to the defaults',
    none.minRR === m.DEFAULT_MIN_RR && none.maxRiskPct === m.DEFAULT_MAX_RISK_PCT);
  ok('and the fallback is labelled as such (an alien constant gets ignored)',
    none.rrSource === 'default' && none.riskSource === 'default');
  ok('no setup at all also falls back',
    m.setupRulesFor(sys, []).minRR === m.DEFAULT_MIN_RR);
  ok('a comma decimal in the rule is read, not dropped',
    m.setupRulesFor(
      { setups: [m.makeSetup({ name: 'x', riskPerTrade: '0,75' })] }, ['x'],
    ).maxRiskPct === 0.75);
}

async function checkInstruments() {
  console.log('\ninstruments.js  (paridad con backend/instruments.py)');
  const I = await imp('lib/instruments.js');

  // Los números de este bloque son EXACTAMENTE los que fija
  // `backend/tests/test_instruments_unit.py`. Que aparezcan dos veces es el
  // punto: son dos implementaciones de la misma matemática, y esto es lo que
  // detecta que una se ha movido sin la otra.

  // ── Catálogo ──
  const gold = I.resolveSpec('cfd', 'XAUUSD');
  ok('el lote de oro son 100 onzas a 20×',
    gold.contractSize === 100 && gold.defaultLeverage === 20);
  ok('MES es la décima parte de ES',
    I.resolveSpec('futures', 'ES').contractSize / I.resolveSpec('futures', 'MES').contractSize === 10);
  ok('el pip del yen es 0,01 y el del resto 0,0001',
    I.resolveSpec('forex', 'USDJPY').pipSize === 0.01
    && I.resolveSpec('forex', 'EURUSD').pipSize === 0.0001);
  ok('un futuro fuera de catálogo no vale ×1: vale null',
    I.resolveSpec('futures', 'XYZ').contractSize === null
    && I.contractSizeFor('futures', 'XYZ') === null);
  ok('el tipo de lote decide el tamaño en forex',
    I.contractSizeFor('forex', 'EURUSD', { lotType: 'micro' }) === 1000
    && I.contractSizeFor('forex', 'EURUSD', { lotType: 'standard' }) === 100000);

  // ── Unidades ──
  const fxSpec = I.resolveSpec('forex', 'EURUSD');
  const pipDist = I.unitToDistance(20, 'pips', {
    entry: 1.10, quantity: 1, contractSize: 100000, spec: fxSpec,
  });
  ok('20 pips son 0,0020 de precio', near(pipDist, 0.0020, 1e-12));
  ok('el stop de un largo queda por debajo de la entrada',
    near(I.levelFromDistance(1.10, pipDist, 'long', 'sl'), 1.098, 1e-12));
  ok('el stop de un corto queda por encima',
    near(I.levelFromDistance(1.10, pipDist, 'short', 'sl'), 1.102, 1e-12));
  ok('8 ticks del MES son 2 puntos',
    near(I.unitToDistance(8, 'ticks', {
      entry: 5000, quantity: 1, contractSize: 5,
      spec: I.resolveSpec('futures', 'MES'),
    }), 2, 1e-12));
  ok('100 $ de riesgo con 1 lote son 10 pips',
    near(I.unitToDistance(100, 'money', {
      entry: 1.10, quantity: 1, contractSize: 100000, spec: fxSpec,
    }), 0.0010, 1e-12));
  ok('el 1 % de una cuenta de 10 000 son los mismos 10 pips',
    near(I.unitToDistance(1, 'pct_balance', {
      entry: 1.10, quantity: 1, contractSize: 100000, spec: fxSpec, balance: 10000,
    }), 0.0010, 1e-12));
  ok('un objetivo en R sin stop es null, no cero',
    I.unitToDistance(2, 'r', { entry: 1.10, quantity: 1, contractSize: 100000 }) === null);
  ok('la conversión va y vuelve sin perder el número tecleado',
    near(I.distanceToUnit(pipDist, 'pips', {
      entry: 1.10, quantity: 1, contractSize: 100000, spec: fxSpec,
    }), 20, 1e-9));

  // ── Posición ──
  const goldLot = I.positionMetrics({
    entry: 2000, quantity: 1, contractSize: 100, leverage: 20, balance: 10000,
    side: 'long', sl: 1990, tp: 2020, spec: gold,
  });
  ok('el nocional de 1 lote de oro a 2 000 son 200 000 $', goldLot.notional === 200000);
  ok('el margen a 20× son 10 000 $', goldLot.marginUsed === 10000);
  ok('20× el saldo pasa del tope de exposición',
    goldLot.exposureMultiple === 20 && goldLot.exposureExceeded === true);
  ok('riesgo, recompensa y R:B sobre la posición abierta',
    goldLot.riskAmount === 1000 && goldLot.rewardAmount === 2000 && near(goldLot.rr, 2));

  const tiny = I.positionMetrics({
    entry: 100000, quantity: 0.001, contractSize: 1, leverage: 100, balance: 10000,
    spec: I.resolveSpec('crypto_perp', 'BTCUSDT'),
  });
  ok('100× sobre un tamaño pequeño NO dispara el tope',
    tiny.exposureExceeded === false && near(tiny.exposureMultiple, 0.01));

  const threeWays = I.positionMetrics({
    entry: 100, quantity: 10, contractSize: 1, leverage: 10, balance: 10000, sl: 99,
    spec: I.resolveSpec('cfd', 'US500'),
  });
  ok('el riesgo se publica contra nocional, cuenta y margen',
    near(threeWays.riskPctNotional, 1) && near(threeWays.riskPctBalance, 0.1)
    && near(threeWays.riskPctMargin, 10));

  ok('sin apalancamiento no hay liquidación', I.liquidationPrice(100, 'long', 1) === null);
  ok('la liquidación de un corto queda por encima de la entrada',
    I.liquidationPrice(100, 'short', 10, 0.005) > 100);
  ok('a más apalancamiento, liquidación más cerca',
    I.liquidationPrice(100, 'long', 2, 0.005) < I.liquidationPrice(100, 'long', 50, 0.005));
  ok('un stop detrás de la liquidación se señala',
    I.positionMetrics({
      entry: 100, quantity: 1, contractSize: 1, leverage: 20, balance: 10000, sl: 80,
      spec: I.resolveSpec('crypto_perp', 'BTCUSDT'),
    }).liquidationBeforeStop === true);

  // ── Riesgo definido ──
  const longCall = I.positionMetrics({
    entry: 3.5, quantity: 2, contractSize: 100, balance: 10000, side: 'long',
    spec: I.resolveSpec('option', 'AAPL'),
  });
  ok('la prima de una opción comprada ES su pérdida máxima',
    longCall.maxLoss === 700 && longCall.maxLossSource === 'premium');
  ok('una pérdida máxima declarada manda sobre todo lo demás',
    I.positionMetrics({
      entry: 1.2, quantity: 1, contractSize: 100, side: 'short', maxLoss: 380,
      spec: I.resolveSpec('option', 'SPY'),
    }).maxLossSource === 'declared');
  ok('vender desnudo no tiene pérdida máxima',
    I.positionMetrics({
      entry: 5, quantity: 1, contractSize: 100, side: 'short',
      spec: I.resolveSpec('option', 'TSLA'),
    }).maxLoss === null);

  // ── Costes ──
  ok('9 pagos de funding al 0,01 % sobre 5 000 $ son 4,50 $',
    near(I.fundingCost(5000, 0.01, 9), 4.5, 1e-9));
  ok('10 noches al 7,3 % anual sobre 20 000 $ son 40 $',
    near(I.swapCost(20000, 7.3, 10), 40, 1e-9));

  // ── Apalancamiento sugerido ──
  ok('en futuros se deduce del margen del mercado',
    I.suggestedLeverage(I.resolveSpec('futures', 'MES'), 25000) === 19);
  ok('al contado no se sugiere ninguno',
    I.suggestedLeverage(I.resolveSpec('crypto_spot', 'BTC'), 1000) === null);
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

async function checkProjection() {
  console.log('\nprojection.js');
  const pj = await imp('lib/projection.js');

  // Las entradas salen del diario, no de la imaginación.
  const analytics = {
    closed_trades: 60, win_rate: 45, avg_win: 300, avg_loss: -150,
    avg_r: 0.3, r_sample_size: 60,
  };
  const measured = pj.measuredInputs(analytics);
  ok('win rate and payoff come from the journal',
    measured.winRate.value === 45 && measured.payoff.value === 2);
  ok('and they say they are measured, with their sample',
    measured.winRate.source === 'measured' && measured.winRate.sample === 60);

  const group = { group: 'Ruptura NY', n: 40, win_rate: 60, avg_win: 100, avg_loss: -100 };
  ok('a setup projects with ITS numbers, not the global ones',
    pj.measuredInputs(analytics, group).payoff.value === 1);

  const noLosers = pj.measuredInputs({ closed_trades: 12, win_rate: 100, avg_win: 100, avg_loss: null });
  ok('no losing trade yet = payoff unknown, not zero',
    noLosers.payoff.value === null && noLosers.payoff.source === 'unavailable');

  // Esperanza: la cuenta que decide si proyectar más operaciones ayuda o mata.
  ok('expectancy in R is win_rate × payoff − losses',
    pj.expectancyR(50, 2) === 0.5);
  ok('a coin flip at 1:1 has zero expectancy', pj.expectancyR(50, 1) === 0);
  ok('expectancy is negative when the edge is not there',
    pj.expectancyR(30, 1) < 0);
  ok('breakeven win rate inverts the payoff',
    pj.breakevenWinRate(1) === 50 && pj.breakevenWinRate(3) === 25);
  ok('breakeven is undefined without a payoff', pj.breakevenWinRate(null) === null);

  // Lo que el usuario toca queda marcado como supuesto: una proyección sobre
  // supuestos es una hipótesis, y confundirla con una medición es lo que hace
  // que alguien dimensione una cuenta real contra un número inventado.
  const assumed = pj.resolveInputs(measured, { winRate: 70 });
  ok('an edited input is flagged as assumed', assumed.winRate.source === 'assumed');
  ok('an untouched input stays measured', assumed.payoff.source === 'measured');
  ok('re-typing the measured value is not an assumption',
    pj.resolveInputs(measured, { winRate: 45 }).winRate.source === 'measured');

  // Muestra: por debajo del suelo no se proyecta.
  const tiny = pj.project({ closed_trades: 4, win_rate: 50, avg_win: 100, avg_loss: -100 });
  ok('four trades are not a forecast', tiny.ok === false && tiny.reason === 'sample');
  ok('and nothing is drawn from it', tiny.distribution === null);

  const thin = pj.project({ closed_trades: 15, win_rate: 50, avg_win: 200, avg_loss: -100 });
  ok('a thin sample still projects but warns', thin.ok === true && thin.sampleWarning === true);

  const solid = pj.project(analytics, { overrides: { balance: 10000, riskPct: 1, trades: 100 } });
  ok('a solid sample projects', solid.ok === true && solid.sampleWarning === false);
  ok('the projection is a DISTRIBUTION, not a number',
    solid.distribution.roi.p5 < solid.distribution.roi.p50
    && solid.distribution.roi.p50 < solid.distribution.roi.p95);
  ok('ruin probability is reported', typeof solid.distribution.probabilityOfRuin === 'number');

  // Mismos números, mismo dibujo: sin semilla fija el panel cambiaría solo.
  const again = pj.project(analytics, { overrides: { balance: 10000, riskPct: 1, trades: 100 } });
  ok('the same inputs give the same projection',
    solid.distribution.roi.p50 === again.distribution.roi.p50);

  // Una ventaja positiva medida tiene que proyectar mediana positiva.
  ok('a positive edge projects a positive median ROI',
    solid.expectancyR > 0 && solid.distribution.roi.p50 > 0);

  const losing = pj.project(
    { closed_trades: 80, win_rate: 30, avg_win: 100, avg_loss: -100 },
    { overrides: { balance: 10000, riskPct: 2, trades: 200 } },
  );
  ok('a negative edge projects a negative median and real ruin risk',
    losing.expectancyR < 0 && losing.distribution.roi.p50 < 0
    && losing.distribution.probabilityOfRuin > 0);

  // ── Reglas de caja mensuales ─────────────────────────────────────────────
  // Aportar, topar el mes y sacar el exceso cambian el resultado tanto como la
  // operativa, así que la proyección tiene que aplicarlas de verdad.
  const cash = (over) => pj.project(analytics, {
    overrides: {
      balance: 10000, riskPct: 1, trades: 240, tradesPerMonth: 20, ...over,
    },
  }).distribution;

  const plain = cash({});
  ok('without cash rules nothing is contributed or withdrawn',
    plain.contributed.p50 === 0 && plain.withdrawn.p50 === 0);
  ok('the horizon is split into months', plain.months.p50 === 12);

  const withDeposits = cash({ contribution: 500 });
  ok('a fixed monthly contribution is paid in every month',
    withDeposits.contributed.p50 === 500 * 12);
  ok('and it raises the final balance', withDeposits.finalBalance.p50 > plain.finalBalance.p50);
  // Y no debe disimular el drawdown: el máximo histórico sube con el dinero
  // nuevo, así que aportar no puede "curar" una caída.
  ok('contributing does not paper over the drawdown',
    withDeposits.maxDrawdown.p50 >= plain.maxDrawdown.p50 * 0.6);

  const withCap = cash({ capPct: 3 });
  ok('a monthly profit cap stops some months early',
    withCap.monthsCapped.p50 > 0);
  ok('capping the month cuts the upside too (that is what the rule asks for)',
    withCap.roi.p95 < plain.roi.p95);

  const withSkim = cash({ withdrawAbove: 10000 });
  ok('the monthly excess is taken out', withSkim.withdrawn.p50 > 0);
  ok('the trading account stops growing past the ceiling',
    withSkim.finalBalance.p95 <= 10000 + 1e-6);
  ok('but the net worth counts the money taken out',
    withSkim.netWorth.p50 > withSkim.finalBalance.p50);
  ok('skimming never invents money',
    withSkim.netWorth.p50 <= plain.netWorth.p50 + 1e-6);

  const all = cash({ contribution: 300, capPct: 4, withdrawAbove: 12000 });
  ok('the three rules coexist',
    all.contributed.p50 > 0 && all.withdrawn.p50 > 0 && all.monthsCapped.p50 > 0);
  // Un mes que se corta al llegar al tope deja operaciones sin hacer, así que
  // completar las mismas 240 lleva MÁS meses — y por tanto más aportaciones.
  // Publicar "aportarás 3600" cuando en la mitad de los casos son 5700 sería
  // mentir sobre el dinero que hay que poner.
  ok('capping stretches the calendar, so contributions grow with it',
    all.months.p50 > plain.months.p50 && all.contributed.p50 > 300 * plain.months.p50);
  ok('the withdrawal ceiling still holds with the other two rules on',
    all.finalBalance.p95 <= 12000 + 1e-6);

  // Retirar el exceso deja el saldo pegado al techo A PROPÓSITO. Medir la
  // ruina sobre ese saldo daba "ruina 100 %" a quien tiene el triple fuera:
  // decía exactamente lo contrario de la verdad. Se mide sobre el patrimonio.
  const skimmed = cash({ withdrawAbove: 10000, contribution: 300, trades: 1200 });
  ok('withdrawing every month is not ruin', skimmed.probabilityOfRuin < 5);
  ok('and the account was never wiped either', skimmed.probabilityOfAccountWiped < 5);
  const doomedCash = pj.project(
    { closed_trades: 80, win_rate: 25, avg_win: 100, avg_loss: -100 },
    { overrides: { balance: 10000, riskPct: 5, trades: 400, tradesPerMonth: 20 } },
  ).distribution;
  ok('a losing system still reports ruin', doomedCash.probabilityOfRuin > 50);
  ok('and reports the account being wiped', doomedCash.probabilityOfAccountWiped > 50);

  // ── Por periodo: mes, trimestre y año ────────────────────────────────────
  // Un objetivo mensual sólo se juzga mirando la distribución de MESES: el
  // total no dice si ese 10 % se toca alguna vez.
  const periods = cash({ trades: 240, tradesPerMonth: 20 }).periods;
  ok('monthly, quarterly and annual returns are reported',
    Boolean(periods.month && periods.quarter && periods.year));
  ok('there are 12 monthly observations per path, 4 quarters and 1 year',
    periods.month.count === periods.quarter.count * 3
    && periods.quarter.count === periods.year.count * 4);
  ok('longer periods are compounded, not summed',
    periods.quarter.p50 > periods.month.p50 * 2.5
    && periods.quarter.p50 < ((1 + periods.month.p95 / 100) ** 3 - 1) * 100);
  ok('the share of losing periods shrinks as the period grows',
    periods.month.negativeRate >= periods.quarter.negativeRate
    && periods.quarter.negativeRate >= periods.year.negativeRate);

  // El objetivo mensual, traducido a lo que de verdad se está pidiendo.
  const hr = pj.hitRates(cash({ trades: 240, tradesPerMonth: 20, compound: true }), 10);
  ok('a 10% monthly target is a 33% quarter and a 214% year',
    Math.round(hr.quarter.target) === 33 && Math.round(hr.year.target) === 214);
  ok('hit rates are percentages',
    hr.month.rate >= 0 && hr.month.rate <= 100 && hr.year.rate >= 0);
  ok('reaching the target every month is rarer than the average suggests',
    hr.month.rate < 100);

  // ── El precio de la caja ─────────────────────────────────────────────────
  const cost = pj.cashflowCost(analytics, {
    overrides: {
      balance: 10000, riskPct: 1, trades: 1200, tradesPerMonth: 20, withdrawAbove: 10000,
    },
    iterations: 500,
  });
  ok('skimming the excess costs compounding, and the panel can say by how much',
    cost.ratio > 2, `ratio ${cost && cost.ratio}`);
  ok('the comparison keeps both figures', cost.withRules > 0 && cost.compounded > cost.withRules);

  // ── El puente entre las tres pantallas ───────────────────────────────────
  //   rentabilidad mensual ≈ esperanza (R/op) × operaciones al mes × riesgo %
  ok('the bridge equation multiplies the three levers',
    pj.monthlyFromEdge(0.26, 20, 1) === 5.2);
  ok('and it is undefined if any lever is missing',
    pj.monthlyFromEdge(null, 20, 1) === null);

  const routes = pj.routesToTarget(analytics, {
    overrides: { balance: 10000, riskPct: 1, trades: 240, tradesPerMonth: 20 },
    targetMonthlyPct: 10,
    iterations: 400,
  });
  ok('the three routes to the target are solved',
    routes.edge.needed > 0 && routes.frequency.needed > 0 && routes.risk.needed > 0);
  const edgeNow = routes.edge.currentEdge;
  ok('each route, applied, actually reaches the target on average',
    Math.abs(pj.monthlyFromEdge(routes.edge.needed, 20, 1) - 10) < 0.05
    && Math.abs(pj.monthlyFromEdge(edgeNow, routes.frequency.needed, 1) - 10) < 0.6
    && Math.abs(pj.monthlyFromEdge(edgeNow, 20, routes.risk.needed) - 10) < 0.05,
    `ventaja actual ${edgeNow}`);
  // La lección entera del panel: los tres caminos llegan igual de lejos y NO
  // cuestan lo mismo. El riesgo es la palanca fácil y la que puede echarte.
  ok('raising risk hurts the drawdown far more than raising the edge',
    routes.risk.outcome.drawdownP95 > routes.edge.outcome.drawdownP95 * 1.5,
    `riesgo ${routes.risk.outcome.drawdownP95}% vs ventaja ${routes.edge.outcome.drawdownP95}%`);
  ok('and it leaves many more months in the red',
    routes.risk.outcome.redMonths > routes.edge.outcome.redMonths);
  ok('a target that needs an impossible win rate is flagged, not faked',
    pj.routesToTarget(analytics, {
      overrides: { balance: 10000, riskPct: 0.1, trades: 240, tradesPerMonth: 5 },
      targetMonthlyPct: 50,
      iterations: 100,
    }).edge.feasible === false);
  ok('a target already reached says so instead of proposing routes',
    pj.routesToTarget(analytics, {
      overrides: { balance: 10000, riskPct: 1, trades: 240, tradesPerMonth: 20 },
      targetMonthlyPct: 1,
      iterations: 100,
    }).alreadyThere === true);

  // Sensibilidad: qué le pasa a la ventaja si cambia la decisión.
  const sens = pj.sensitivity(45, 2);
  ok('sensitivity is monotonic in win rate',
    sens[0].expectancyR < sens[sens.length - 1].expectancyR);
  ok('sensitivity clamps the win rate to a real percentage',
    pj.sensitivity(95, 2, [10])[0].winRate === 100);
}

(async () => {
  console.log('engine-check — offline checks for the client-side engines');
  await checkSimulatorEngine();
  await checkTradingSystemModel();
  await checkProjection();
  await checkInstruments();
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
