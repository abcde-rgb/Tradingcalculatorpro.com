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
const fs = require('fs');
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

  // A single path is a sample: runs of the same config should differ.
  //
  // ⚠️ This compared exactly TWO runs and failed ~1 in 220 times — it went red
  // on CI with nothing wrong in the product. The reason is arithmetic, not
  // luck: compounding by a PERCENTAGE makes the final balance
  // 10000 × ∏(1 ± r), and multiplication commutes, so the result depends only
  // on HOW MANY winners there were, not their order. 120 trades ⇒ ~121 possible
  // balances, concentrated in the middle. Measured: 0.455% collisions over
  // 20,000 pairs, 636 distinct values in 20,000 draws.
  //
  // A verifier that fails without a defect is as corrosive as one that passes
  // without testing: both teach people to re-run until green. So the claim is
  // asserted the way it is actually meant — over a handful of draws, not two.
  // With 12, all-identical has probability ~0.0045^11, which is never.
  const balances = new Set(
    Array.from({ length: 12 }, () => runSimulation(base).results.finalBalance));
  ok('single path is stochastic (why the distribution matters)',
    balances.size > 1, `12 runs produced ${balances.size} distinct balance(s)`);
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

  // ── Ventana de despliegue: el frontend por delante del backend ──
  // El frontend se publica solo al mergear y el backend se sube a mano, así que
  // este desfase es el estado normal durante un rato, no una rareza.
  ok('contra un backend anterior sólo se ofrece lo que sabe guardar',
    JSON.stringify(I.selectableProducts(false)) === JSON.stringify(['spot', 'option']));
  ok('con el backend al día se ofrece todo',
    I.selectableProducts(true).length === I.SELECTABLE_PRODUCTS.length);
  ok('sin saberlo todavía NO se recorta la aplicación',
    I.selectableProducts(null).length === I.SELECTABLE_PRODUCTS.length);
  ok('el producto por defecto cae a spot contra un backend anterior',
    I.defaultProductFor(false) === 'spot' && I.defaultProductFor(true) === 'stock');
  ok('spot sigue existiendo y sigue valiendo x1 sin apalancamiento',
    I.resolveSpec('spot', 'AAPL').contractSize === 1);
}

async function checkScannerMeta() {
  console.log('\nscannerMeta.js  (ritmo de refresco del escáner)');
  const M = await imp('components/charts/structure/scannerMeta.js');

  // El escalón del escáner NO publica los minutos de la vela, así que leerlos
  // de ahí caía siempre al valor por defecto y un gráfico de 5 minutos se
  // refrescaba al ritmo de uno diario. Se derivan de la etiqueta.
  ok('5m son 5 minutos', M.intervalMinutes('5m') === 5);
  ok('1h son 60', M.intervalMinutes('1h') === 60);
  ok('4h son 240', M.intervalMinutes('4h') === 240);
  ok('1d son 1440', M.intervalMinutes('1d') === 1440);
  ok('1wk son 10080', M.intervalMinutes('1wk') === 10080);
  ok('1mo son 43200', M.intervalMinutes('1mo') === 43200);
  ok('lo que no se reconoce vale null, no un numero inventado',
    M.intervalMinutes('zzz') === null && M.intervalMinutes('') === null
    && M.intervalMinutes(undefined) === null);

  // El ritmo que sale de ahi: un tercio de la vela, con suelo de 1 min y techo
  // de 15. Es la formula de useStructureScan, comprobada aqui porque es la que
  // decide cuanta cuota se gasta contra el proveedor.
  const rate = (iv) => Math.min(15 * 60 * 1000,
    Math.max(60 * 1000, ((M.intervalMinutes(iv) || 1440) * 60 * 1000) / 3));
  ok('en 5m se refresca cada 100 s (un tercio de la vela)', rate('5m') === 100 * 1000);
  ok('el suelo de 1 min protege a la vela mas corta', rate('1m') === 60 * 1000);
  ok('en 1h se refresca a los 20 min -> topado a 15', rate('1h') === 15 * 60 * 1000);
  ok('en diario tambien topa en 15 min', rate('1d') === 15 * 60 * 1000);
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

// ── Ajustes: este navegador contra la cuenta ────────────────────────────────
// La sincronización decide qué copia de cada ajuste sobrevive. Equivocarse aquí
// no da un número raro: borra los setups que el usuario escribió a mano. Por eso
// las reglas viven en un módulo sin importaciones y se comprueban aquí.
async function checkPrefsMerge() {
  console.log('\nprefsMerge.js');
  const { planMerge } = await imp('lib/prefsMerge.js');

  const names = ['theme', 'tradingSystem'];
  const resettable = { theme: false, tradingSystem: true };

  // Lo más reciente gana, ajuste por ajuste. El tema es más nuevo aquí y el
  // sistema es más nuevo en la cuenta: tienen que ganar uno cada uno, que es
  // justo lo que una sola fecha por documento haría imposible.
  const mixed = planMerge(
    names,
    { theme: 2000, tradingSystem: 1000 },
    { theme: 'gold', tradingSystem: { setups: ['local'] } },
    { theme: { at: 1500, value: 'crypto' }, tradingSystem: { at: 3000, value: { setups: ['remoto'] } } },
    { resettable },
  );
  ok('el ajuste más reciente de cada lado gana por separado',
    mixed.apply.tradingSystem?.setups[0] === 'remoto' && mixed.apply.theme === undefined);
  ok('lo local más nuevo se sube con SU fecha, no con la de ahora',
    mixed.push.theme?.at === 2000 && mixed.push.theme?.value === 'gold');

  // Un ajuste que nadie ha tocado no es una preferencia y no debe subirse: si
  // subiera, el valor por defecto de este equipo ganaría a la elección hecha en
  // otro la próxima vez.
  const untouched = planMerge(names, {}, { theme: 'dark', tradingSystem: {} }, {}, { resettable });
  ok('un ajuste sin fecha local no se sube', Object.keys(untouched.push).length === 0);
  ok('un ajuste sin fecha local tampoco marca fecha', Object.keys(untouched.stamps).length === 0);

  // La cuenta gana el empate, y por eso conciliar dos veces no cambia nada.
  const tie = planMerge(['theme'], { theme: 500 }, { theme: 'gold' },
    { theme: { at: 500, value: 'forex' } }, { resettable });
  ok('el empate lo gana la cuenta (conciliar es idempotente)', tie.apply.theme === 'forex');

  // Dos cuentas en el mismo navegador: lo local es de otro y no compite.
  const other = planMerge(
    names,
    { theme: 9_999_999, tradingSystem: 9_999_999 },
    { theme: 'gold', tradingSystem: { setups: ['de otro'] } },
    { theme: { at: 1, value: 'nasdaq' } },
    { foreign: true, resettable },
  );
  ok('con el localStorage de otra cuenta manda la cuenta, por vieja que sea',
    other.apply.theme === 'nasdaq');
  ok('lo que la cuenta nueva no tiene se vacía, no se hereda',
    other.reset.includes('tradingSystem'));
  ok('los setups de otra cuenta NUNCA se suben a esta',
    other.push.tradingSystem === undefined);
  ok('lo que es pura apariencia no se resetea al entrar otra cuenta',
    !other.reset.includes('theme'));

  // Una fecha corrupta no puede ganar: valdría cualquier cosa menos un dato.
  const corrupt = planMerge(['theme'], { theme: 100 }, { theme: 'gold' },
    { theme: { at: 'ayer', value: 'crypto' } }, { resettable });
  ok('una fecha ilegible en la cuenta pierde contra la local',
    corrupt.push.theme?.value === 'gold');
}

/**
 * Ninguna pantalla puede llevar su propio catálogo de instrumentos.
 *
 * La calculadora de futuros tenía una tabla de 24 contratos escrita a mano y se
 * había desincronizado en seis: publicaba nocionales y apalancamientos reales
 * cien veces mayores en bonos y granos. `gen-instruments-js.py --check` mantiene
 * el catálogo en paridad con el backend, pero no puede ver una tabla escondida
 * dentro de un `.jsx`. Esto sí.
 */
async function checkSinCatalogosParalelos() {
  console.log('\ncatálogo único  (ninguna pantalla con su propia tabla)');
  const fs = await import('fs');
  const path = await import('path');
  const dirs = ['components/calculators', 'components/tools', 'components/desk', 'components/options'];
  const sospechosas = [];
  for (const d of dirs) {
    const abs = path.join(SRC, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((n) => n.endsWith('.jsx'))) {
      const txt = fs.readFileSync(path.join(abs, f), 'utf8');
      // Una tabla de instrumentos se reconoce por llevar tick y contrato juntos.
      if (/tickSize\s*:\s*[\d.]/.test(txt) && /contractSize\s*:\s*\d/.test(txt)) {
        sospechosas.push(`${d}/${f}`);
      }
    }
  }
  ok('ninguna pantalla define tick y tamaño de contrato a mano',
    sospechosas.length === 0, sospechosas.join(', '));
}

async function checkDeskMath() {
  console.log('\ndeskMath.js  (la mesa: del riesgo al tamaño)');
  const {
    RISK_HARD_CAP_PCT, riskBudget, marginModesFor, liquidationFromBuffer,
    liquidationView, maxSizes, minTicket, averageEntry, partialExits,
    breakEven, commissionTotal, stepValues, requiredLeverage, snapDown,
    leverageFromMargin, effectiveLeverage, quantityFromMargin, riskForQuantity,
    quoteCurrency, quoteToAccount, quoteStep, pipValue, lotSizing,
  } = await imp('lib/deskMath.js');
  const { resolveSpec, liquidationPrice, FUTURES_SPECS } = await imp('lib/instruments.js');

  // ── El tope duro ────────────────────────────────────────────────
  const okRisk = riskBudget({ capital: 10000, riskPct: 1 });
  ok('1 % de 10 000 son 100 y no bloquea', near(okRisk.amount, 100) && !okRisk.blocked);

  const over = riskBudget({ capital: 10000, riskPct: 10.5 });
  ok('por encima del 10 % NO hay tamaño, hay motivo',
    over.blocked && over.reason === 'over_cap', JSON.stringify(over));

  const edge = riskBudget({ capital: 10000, riskPct: RISK_HARD_CAP_PCT });
  ok('el 10 % exacto todavía pasa (el tope es "superior a")', !edge.blocked);

  // El tope se mide en PORCENTAJE aunque se escriba en dinero: si no, teclear
  // el importe sería la puerta trasera para saltárselo.
  const money = riskBudget({ capital: 1000, riskMoney: 200, mode: 'money' });
  ok('200 € sobre 1000 € es 20 % y se bloquea igual',
    money.blocked && money.reason === 'over_cap' && near(money.pct, 20));

  const moneyOk = riskBudget({ capital: 10000, riskMoney: 150, mode: 'money' });
  ok('el importe fijo también sale en % de la cuenta', near(moneyOk.pct, 1.5));

  ok('sin capital no se calcula nada', riskBudget({ capital: null, riskPct: 1 }).blocked);

  // ── Modo de margen según el producto ────────────────────────────
  ok('el perpetuo deja elegir, y por defecto aisla',
    marginModesFor(resolveSpec('crypto_perp', 'BTCUSDT')).modes.length === 2
    && marginModesFor(resolveSpec('crypto_perp', 'BTCUSDT')).default === 'isolated');
  // Se ofrecen los dos, pero cruzado manda: es lo que hace la cuenta de
  // verdad. Aislado está para dimensionar con un límite propio, no para
  // fingir que el bróker aislará la posición.
  ok('futuros, forex y CFD ofrecen los dos, con cruzado por defecto',
    ['futures', 'forex', 'cfd'].every((p) => {
      const m = marginModesFor(resolveSpec(p, ''));
      return !m.fixed && m.modes.length === 2
        && m.modes.includes('cross') && m.modes.includes('isolated')
        && m.default === 'cross';
    }));
  ok('el contado no tiene modo de margen',
    marginModesFor(resolveSpec('stock', 'AAPL')).modes.length === 0
    && marginModesFor(resolveSpec('crypto_spot', 'BTC')).modes.length === 0);
  ok('las opciones tampoco: el riesgo lo define la estructura',
    marginModesFor(resolveSpec('option', 'AAPL')).modes.length === 0);

  // ── Liquidación: aislado tiene UNA sola fuente de verdad ─────────
  // El colchón del modo aislado es el margen de la posición, así que la
  // fórmula genérica tiene que dar exactamente lo que ya da instruments.js.
  const entry = 100;
  const notional = 10000;   // 100 unidades a 100
  const lev = 10;
  const mine = liquidationFromBuffer({ entry, side: 'long', buffer: notional / lev, notional });
  const theirs = liquidationPrice(entry, 'long', lev);
  ok('aislado da el MISMO número que instruments.js (largo)', near(mine, theirs, 1e-9),
    `${mine} vs ${theirs}`);
  const mineS = liquidationFromBuffer({ entry, side: 'short', buffer: notional / lev, notional });
  ok('aislado coincide también en corto', near(mineS, liquidationPrice(entry, 'short', lev), 1e-9));

  // Y el cruzado tiene que aguantar MÁS, que es justo lo que lo hace peligroso.
  const cross = liquidationFromBuffer({ entry, side: 'long', buffer: 5000, notional });
  ok('el cruzado liquida más lejos que el aislado', cross < mine, `${cross} vs ${mine}`);

  ok('con todo el capital detrás del nocional no hay liquidación en largo',
    liquidationFromBuffer({ entry, side: 'long', buffer: notional, notional }) === null);
  ok('colchón por debajo del mantenimiento es null, no un precio inventado',
    liquidationFromBuffer({ entry, side: 'long', buffer: 1, notional }) === null);

  // Con 10× la liquidación cae en 90,5. Un stop en 97 se toca antes: protege.
  // Uno en 85 no llega a existir — te cierra el bróker por el camino.
  const view = liquidationView({
    entry: 100, side: 'long', mode: 'isolated', notional,
    marginUsed: notional / lev, capital: 20000, sl: 97,
  });
  ok('un stop dentro de la liquidación sí protege',
    view.stopBeforeLiquidation === true, `liq=${view.price}`);
  const view2 = liquidationView({
    entry: 100, side: 'long', mode: 'isolated', notional,
    marginUsed: notional / lev, capital: 20000, sl: 85,
  });
  ok('un stop MÁS ALLÁ de la liquidación se señala: ese stop no existe',
    view2.stopBeforeLiquidation === false, `liq=${view2.price}`);
  ok('el cruzado usa el capital como colchón, y lo dice',
    liquidationView({ entry: 100, side: 'long', mode: 'cross', notional, capital: 5000 })
      .bufferSource === 'capital');

  // ── Del riesgo al tamaño ────────────────────────────────────────
  // Acción a 100 $ con stop a 98 y 100 $ de presupuesto → 50 acciones.
  const stock = resolveSpec('stock', 'AAPL');
  const s1 = maxSizes({
    entry: 100, stopDistance: 2, contractSize: 1, riskAmount: 100,
    capital: 100000, leverage: 1, spec: stock,
  });
  ok('50 acciones es el tamaño que arriesga exactamente el presupuesto',
    near(s1.byRisk, 50) && near(s1.quantity, 50) && s1.binding === 'risk');

  // El margen manda cuando el stop es muy fino: 1000 $ de cuenta al contado no
  // compran 50 acciones de 100 $ por muy poco que se arriesgue.
  const s2 = maxSizes({
    entry: 100, stopDistance: 2, contractSize: 1, riskAmount: 100,
    capital: 1000, leverage: 1, spec: stock,
  });
  ok('con la cuenta pequeña manda el margen, no el riesgo',
    s2.binding === 'margin' && near(s2.quantity, 10), JSON.stringify(s2));

  // Y la exposición manda cuando hay palanca de sobra y stop microscópico.
  const perp = resolveSpec('crypto_perp', 'BTCUSDT');
  const s3 = maxSizes({
    entry: 100, stopDistance: 0.01, contractSize: 1, riskAmount: 1000,
    capital: 10000, leverage: 100, spec: perp,
  });
  ok('un stop de dos pips con toda la palanca lo frena la exposición',
    s3.binding === 'exposure', JSON.stringify(s3));

  // El escalón redondea SIEMPRE hacia abajo.
  ok('3,9 contratos son 3, nunca 4', near(snapDown(3.9, 1), 3));
  const fut = resolveSpec('futures', 'ES');
  const s4 = maxSizes({
    entry: 5000, stopDistance: 20, contractSize: 50, riskAmount: 1500,
    capital: 100000, leverage: 20, spec: fut,
  });
  ok('1,5 contratos de E-mini se quedan en 1', near(s4.quantity, 1) && near(s4.byRisk, 1.5));

  ok('sin distancia de stop no hay tope por riesgo (null, no cero)',
    maxSizes({ entry: 100, contractSize: 1, capital: 10000, leverage: 1, spec: stock }).byRisk === null);

  // ── Del margen al tamaño (el camino inverso) ────────────────────
  // El usuario que dice "quiero comprometer 1320 $" está diciendo el margen, no
  // el riesgo. La cadena es: contrato → lo que vale esa unidad (precio × tamaño
  // de contrato) → entre el apalancamiento → margen. Aquí se recorre al revés.
  const mesSpec = resolveSpec('futures', 'MES');
  // La palanca no se inventa: sale del margen que el bróker pide por contrato.
  const palancaMes = leverageFromMargin(mesSpec, 5000, 5);
  const q1 = quantityFromMargin({
    margin: 1320, leverage: palancaMes, entry: 5000, contractSize: 5, spec: mesSpec,
  });
  ok('el margen de un contrato compra exactamente un contrato',
    near(q1.quantity, 1), JSON.stringify(q1));
  ok('y el capital que mueve es precio × tamaño de contrato',
    near(q1.notional, 25000), `notional=${q1.notional}`);
  ok('el margen realmente usado es el nocional entre la palanca',
    near(q1.marginUsed, 1320), `usado=${q1.marginUsed}`);

  // Redondear hacia arriba sería pedirle al usuario más dinero del que dijo.
  const q2 = quantityFromMargin({
    margin: 3000, leverage: palancaMes, entry: 5000, contractSize: 5, spec: mesSpec,
  });
  ok('2,27 contratos se quedan en 2: nunca se pide más margen del ofrecido',
    near(q2.quantity, 2) && q2.marginUsed <= 3000, JSON.stringify(q2));

  // Monotonía: más dinero jamás puede dar menos contratos.
  let previo = 0;
  let monotono = true;
  for (let m = 500; m <= 20000; m += 250) {
    const q = quantityFromMargin({
      margin: m, leverage: palancaMes, entry: 5000, contractSize: 5, spec: mesSpec,
    });
    const actual = q.quantity ?? 0;
    if (actual < previo) monotono = false;
    previo = actual;
  }
  ok('más margen nunca da menos contratos', monotono);

  ok('por debajo del escalón no hay medio contrato: es null, no cero',
    quantityFromMargin({ margin: 100, leverage: palancaMes, entry: 5000, contractSize: 5, spec: mesSpec })
      .quantity === null);

  // Al contado no hay palanca que dividir: el margen ES el capital.
  const spot = resolveSpec('crypto_spot', 'BTC');
  const q3 = quantityFromMargin({
    margin: 5000, leverage: 20, entry: 50000, contractSize: 1, spec: spot,
  });
  ok('al contado la palanca se ignora: 5000 $ compran 0,1 BTC',
    near(q3.quantity, 0.1) && near(q3.marginUsed, 5000), JSON.stringify(q3));

  ok('sin margen no se inventa un tamaño',
    quantityFromMargin({ leverage: 10, entry: 5000, contractSize: 5, spec: mesSpec })
      .quantity === null);

  // El riesgo del tamaño que salió del margen: sigue siendo distancia × unidades.
  ok('el riesgo de un tamaño dado es distancia × cantidad × tamaño de contrato',
    near(riskForQuantity({ quantity: 2, stopDistance: 20, contractSize: 5 }), 200));
  ok('sin stop el riesgo de ese tamaño es indefinido, no cero',
    riskForQuantity({ quantity: 2, contractSize: 5 }) === null);

  // ── El pip vale lo que dice el catálogo, no diez dólares ────────
  // La vieja calculadora de lotaje llevaba `pipValuePerStandardLot = 10` y se
  // lo aplicaba a todo: en oro daba diez veces menos tamaño del debido y
  // anunciaba una pérdida máxima diez veces mayor que la real.
  const eurusd = resolveSpec('forex', 'EURUSD');
  const usdjpy = resolveSpec('forex', 'USDJPY');
  const eurgbp = resolveSpec('forex', 'EURGBP');
  const oro = resolveSpec('cfd', 'XAUUSD');

  ok('la cotizada de EURUSD son dólares y la de USDJPY yenes',
    quoteCurrency(eurusd) === 'USD' && quoteCurrency(usdjpy) === 'JPY');
  ok('fuera de forex el catálogo habla en dólares', quoteCurrency(oro) === 'USD');

  ok('cotizar en la divisa de la cuenta no convierte nada',
    quoteToAccount({ spec: eurusd, price: 1.0854 }) === 1);
  ok('si la cuenta es la divisa BASE, el factor sale del propio precio',
    near(quoteToAccount({ spec: usdjpy, price: 157 }), 1 / 157));
  ok('un cruce sin tercer cambio es null, no 1',
    quoteToAccount({ spec: eurgbp, price: 0.842 }) === null);

  // El pip de forex y el tick de un CFD son el mismo concepto con dos nombres.
  ok('el paso de EURUSD es su pip', near(quoteStep(eurusd), 0.0001));
  ok('el paso del oro es su tick, aunque no se llame pip', near(quoteStep(oro), 0.01));

  ok('un lote estándar de EURUSD mueve 10 $ por pip',
    near(pipValue({ quantity: 1, contractSize: 100000, spec: eurusd, price: 1.0854 }).account, 10));
  ok('el mismo lote de USDJPY mueve 1000 ¥, que a 157 son 6,37 $',
    near(pipValue({ quantity: 1, contractSize: 100000, spec: usdjpy, price: 157 }).account, 1000 / 157));
  ok('un lote de oro son 100 onzas y su pip vale 1 $, no 10',
    near(pipValue({ quantity: 1, contractSize: 100, spec: oro, price: 2400 }).account, 1));
  ok('el pip de un cruce no se inventa: null',
    pipValue({ quantity: 1, contractSize: 100000, spec: eurgbp, price: 0.842 }).account === null);

  // Contra el catálogo de futuros, que publica su propio valor de tick: dos
  // caminos independientes tienen que dar el mismo número.
  for (const sym of ['MES', 'ES', 'CL', 'GC']) {
    const f = FUTURES_SPECS[sym];
    const sp = resolveSpec('futures', sym);
    ok(`el valor del tick de ${sym} sale igual del catálogo que de la fórmula`,
      near(pipValue({ quantity: 1, contractSize: f.contract_size, spec: sp, price: 5000 }).account,
        f.tick_value),
      `${sym}: ${f.tick_value}`);
  }

  // ── Dimensionar en lotes con dos divisas por medio ──────────────
  // Cuenta de 10 000 $, 1 % de riesgo (100 $), stop de 50 pips.
  const lotesEur = lotSizing({
    entry: 1.0854, stopDistance: 50 * 0.0001, contractSize: 100000, spec: eurusd,
    capital: 10000, riskAmount: 100, leverage: 30,
  });
  ok('0,20 lotes de EURUSD arriesgan exactamente los 100 $ pedidos',
    near(lotesEur.lots, 0.2) && near(lotesEur.riskAccount, 100), JSON.stringify(lotesEur));

  const lotesJpy = lotSizing({
    entry: 157, stopDistance: 50 * 0.01, contractSize: 100000, spec: usdjpy,
    capital: 10000, riskAmount: 100, leverage: 30,
  });
  ok('en USDJPY salen 0,31 lotes, no 0,20: el pip no vale 10 $',
    near(lotesJpy.lots, 0.31), JSON.stringify(lotesJpy));
  ok('y el riesgo real se queda por debajo del presupuesto, nunca encima',
    lotesJpy.riskAccount <= 100 + 1e-9, `${lotesJpy.riskAccount}`);

  ok('un cruce no se dimensiona a medias: convertible false y todo null',
    lotSizing({
      entry: 0.842, stopDistance: 50 * 0.0001, contractSize: 100000, spec: eurgbp,
      capital: 10000, riskAmount: 100, leverage: 30,
    }).lots === null);

  // El pip por lote es la cifra que la vieja calculadora daba siempre como 10.
  ok('el pip por lote se publica aunque el tamaño lo frene otro tope',
    near(lotSizing({
      entry: 2400, stopDistance: 50 * 0.01, contractSize: 100, spec: oro,
      capital: 10000, riskAmount: 100, leverage: 20,
    }).pipPerLot, 1));

  // ⚠️ El oro es el caso donde el riesgo NO es lo que manda, y conviene que
  // quede clavado con las dos cifras. Por riesgo puro salen 2,00 lotes; pero
  // 2 lotes son 200 onzas × 2.400 = 480.000 $ de exposición, 48 veces una
  // cuenta de 10.000, así que el tope de exposición del catálogo (10×) frena
  // antes y deja 0,41. Las dos cosas son correctas y dependen del tamaño de la
  // cuenta: decir «lo correcto son 2,00» sin decir con qué cuenta es falso en
  // la cuenta con la que se probaron EURUSD y USDJPY aquí arriba.
  const oroChico = lotSizing({
    entry: 2400, stopDistance: 50 * 0.01, contractSize: 100, spec: oro,
    capital: 10000, riskAmount: 100, leverage: 20,
  });
  ok('oro en cuenta de 10.000: frena la EXPOSICIÓN, 0,41 lotes y 20,50 $ de riesgo real',
    near(oroChico.lots, 0.41) && oroChico.binding === 'exposure' && near(oroChico.riskAccount, 20.5),
    JSON.stringify(oroChico));

  const oroGrande = lotSizing({
    entry: 2400, stopDistance: 50 * 0.01, contractSize: 100, spec: oro,
    capital: 50000, riskAmount: 100, leverage: 20,
  });
  ok('oro en cuenta de 50.000: ya manda el RIESGO, 2,00 lotes y los 100 $ pedidos',
    near(oroGrande.lots, 2) && oroGrande.binding === 'risk' && near(oroGrande.riskAccount, 100),
    JSON.stringify(oroGrande));

  // ── El escalón no deja basura binaria ───────────────────────────
  // `0,41000000000000003` acaba copiado en la casilla del bróker.
  ok('0,41 lotes son 0,41 y no 0,41000000000000003',
    String(snapDown(0.4123, 0.01)) === '0.41');
  ok('el escalón de un contrato sigue dando enteros limpios',
    String(snapDown(7.99, 1)) === '7');

  // ── La liquidación con margen de mantenimiento ──────────────────
  // La calculadora de apalancamiento usaba `entry × (1 ∓ 1/lev)`, que ignora el
  // mantenimiento y se pasa SIEMPRE en la misma dirección: te dice que aguantas
  // más de lo que aguantas. Y a 1× daba `entry × 0` = 0, que no es un precio.
  ok('sin apalancamiento no hay liquidación: null, no cero',
    liquidationPrice(95000, 'long', 1) === null);
  ok('la liquidación del largo queda por DEBAJO de la entrada',
    liquidationPrice(95000, 'long', 10) < 95000);
  ok('y la del corto por encima',
    liquidationPrice(95000, 'short', 10) > 95000);
  // El modelo ingenuo siempre está más lejos: esa distancia es el mantenimiento.
  for (const lev of [2, 10, 25, 100]) {
    const ingenua = 95000 * (1 - 1 / lev);
    const real = liquidationPrice(95000, 'long', lev);
    ok(`a ${lev}× el modelo sin mantenimiento liquida más tarde de lo real`,
      ingenua < real, `${ingenua} vs ${real}`);
  }

  // ── El billete mínimo ───────────────────────────────────────────
  // Un E-mini con stop de 20 puntos son 1000 $. En una cuenta de 3000 $, el
  // tamaño más pequeño que existe ya se pasa del tope.
  const mt = minTicket({
    entry: 5000, stopDistance: 20, contractSize: 50, capital: 3000, leverage: 20, spec: fut,
  });
  ok('el contrato más pequeño arriesga 1000 $', near(mt.risk, 1000));
  ok('y en una cuenta de 3000 eso es pasarse del tope',
    mt.tooRisky === true && near(mt.riskPct, 1000 / 3000 * 100));
  // 250 000 de nocional a 20× son 12 500 de margen: con 3000 en la cuenta, el
  // contrato más pequeño ni siquiera se puede financiar.
  ok('el margen del mínimo se compara con el capital, y aquí no llega',
    mt.affordable === false && near(mt.margin, 12500), `margin=${mt.margin}`);
  ok('cripto no tiene escalón: no hay billete mínimo que declarar',
    minTicket({ entry: 100, stopDistance: 1, contractSize: 1, capital: 1000,
      spec: resolveSpec('crypto_spot', 'BTC') }).quantity === null);

  // ── Entradas y salidas por tramos ───────────────────────────────
  const avg = averageEntry([{ price: 100, qty: 1 }, { price: 90, qty: 3 }]);
  ok('la media de entrada es ponderada por tamaño, no de los precios',
    near(avg.price, 92.5) && near(avg.quantity, 4), `avg=${avg.price}`);

  const pe = partialExits({
    entry: 100, side: 'long', quantity: 3, contractSize: 1,
    exits: [{ price: 110, qty: 1 }, { price: 120, qty: 1 }],
  });
  ok('dos tramos cerrados realizan 10 + 20', near(pe.realized, 30));
  ok('queda una unidad viva', near(pe.remainingQty, 1));
  ok('el resto puede caer hasta 70 sin que la operación pierda',
    near(pe.breakEvenRemaining, 70), `be=${pe.breakEvenRemaining}`);

  const peShort = partialExits({
    entry: 100, side: 'short', quantity: 2, contractSize: 1,
    exits: [{ price: 90, qty: 1 }],
  });
  ok('en corto el tramo cerrado más abajo GANA', near(peShort.realized, 10));
  ok('y el break-even del resto sube, no baja', near(peShort.breakEvenRemaining, 110));

  const peOver = partialExits({
    entry: 100, side: 'long', quantity: 2, contractSize: 1,
    exits: [{ price: 110, qty: 5 }],
  });
  ok('no se puede cerrar más de lo que hay abierto',
    near(peOver.closedQty, 2) && near(peOver.remainingQty, 0));

  // ── Comisiones y break-even ─────────────────────────────────────
  ok('la comisión por contrato es de ida y vuelta',
    near(commissionTotal({ quantity: 2, perUnit: 2.5 }), 10));
  ok('el porcentaje del nocional también',
    near(commissionTotal({ notional: 10000, pctNotional: 0.1 }), 20));
  ok('sin comisiones no se inventa ninguna', commissionTotal({ notional: 10000 }) === 0);

  ok('el break-even se aparta de la entrada lo que cuestan las comisiones',
    near(breakEven({ entry: 100, quantity: 10, contractSize: 1, feesTotal: 20 }), 102));
  ok('en corto el break-even está por debajo de la entrada',
    near(breakEven({ entry: 100, side: 'short', quantity: 10, contractSize: 1, feesTotal: 20 }), 98));

  // ── Valor del movimiento ────────────────────────────────────────
  // El pip de un lote estándar de EURUSD son 10 $. Aquí sale de la ficha del
  // instrumento, no de una constante: es el bug que tenía la vieja calculadora
  // de lotaje, que daba 10 $ también en USDJPY y en el oro.
  const fx = resolveSpec('forex', 'EURUSD');
  ok('un lote estándar de EURUSD mueve 10 $ por pip',
    near(stepValues({ quantity: 1, contractSize: 100000, spec: fx }).perPip, 10));
  const jpy = resolveSpec('forex', 'USDJPY');
  ok('y en el yen el pip es 0,01, así que un lote mueve 1000 (en yenes)',
    near(stepValues({ quantity: 1, contractSize: 100000, spec: jpy }).perPip, 1000));
  ok('el tick del E-mini son 12,50 $',
    near(stepValues({ quantity: 1, contractSize: 50, spec: fut }).perTick, 12.5));

  // ── La palanca que sale del catálogo ────────────────────────────
  // Esto lo encontró una CAPTURA, no una revisión: la mesa pedía 25 000 $ de
  // margen por un micro E-mini y decía «no te llega el capital ni para el
  // contrato más pequeño» con una cuenta de 10 000. El margen inicial del MES
  // son 1320 $, o sea ~19×, y caben diecinueve contratos.
  const mes = resolveSpec('futures', 'MES');
  ok('el micro E-mini apalanca ~19× por su margen inicial, no 1×',
    near(leverageFromMargin(mes, 5000, 5), 25000 / 1320, 1e-9),
    String(leverageFromMargin(mes, 5000, 5)));
  ok('y con eso el contrato mínimo SÍ cabe en una cuenta de 10 000',
    minTicket({ entry: 5000, stopDistance: 20, contractSize: 5, capital: 10000,
      leverage: leverageFromMargin(mes, 5000, 5), spec: mes }).affordable === true);

  // El orden de autoridad: lo escrito gana al catálogo, y el catálogo a 1×.
  ok('lo que escribe el trader manda sobre el catálogo',
    near(effectiveLeverage({ declared: 3, spec: mes, entry: 5000, contractSize: 5 }), 3));
  ok('sin nada escrito manda el margen del mercado',
    near(effectiveLeverage({ declared: '', spec: mes, entry: 5000, contractSize: 5 }), 25000 / 1320, 1e-9));
  const cfd = resolveSpec('cfd', 'XAUUSD');
  ok('un CFD sin margen declarado cae a su palanca típica',
    near(effectiveLeverage({ declared: '', spec: cfd, entry: 2000, contractSize: 100 }),
      cfd.defaultLeverage));
  // El contado de cripto no admite margen; la ACCIÓN sí (cuenta de margen), y
  // por eso el que fuerza el 1× aquí es `crypto_spot` y no `stock`.
  ok('un producto sin apalancamiento es 1× y no se discute',
    effectiveLeverage({ declared: 50, spec: resolveSpec('crypto_spot', 'BTC'),
      entry: 100, contractSize: 1 }) === 1);
  ok('sin datos para deducirla, no se inventa una palanca',
    leverageFromMargin(resolveSpec('futures', 'NOEXISTE'), 100, 1) === null);

  ok('la palanca necesaria nunca baja de 1', near(requiredLeverage(5000, 10000), 1));
  ok('20 000 de nocional con 10 000 de cuenta son 2×', near(requiredLeverage(20000, 10000), 2));
}

async function checkEduIndex() {
  console.log('\neduIndex.js  (preguntarle a la Academia)');
  const { EDU_MODULES, buildEduIndex, searchEdu, terms, fold, clearEduIndex } =
    await imp('lib/eduIndex.js');
  const C = await imp('lib/tradingEducationContent.js');

  // `t` de mentira: parte la clave por sus mayúsculas, así que `wyckoffTab` se
  // indexa como "wyckoff tab". Basta para comprobar la MECÁNICA —que los
  // getters existen, que el árbol se recorre, que el orden de los pesos es el
  // correcto— sin cargar los diez diccionarios.
  const t = (k) => String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  // Todo getter nombrado en el índice tiene que existir. Es lo que se rompe en
  // silencio al renombrar uno: el módulo se quedaría sin contenido indexado y
  // seguiría apareciendo en la lista, sólo que sin encontrarse nunca.
  const missing = EDU_MODULES
    .flatMap((m) => m.getters)
    .filter((name) => typeof C[name] !== 'function');
  ok('todos los getters del índice existen', missing.length === 0, missing.join(', '));

  // Y al revés: un getter escrito y no indexado es contenido invisible.
  const used = new Set(EDU_MODULES.flatMap((m) => m.getters));
  const orphan = Object.keys(C).filter((k) => /^get[A-Z]/.test(k) && !used.has(k));
  ok('ningún getter se queda fuera del índice', orphan.length === 0, orphan.join(', '));

  const dupes = EDU_MODULES.map((m) => m.id).filter((id, i, a) => a.indexOf(id) !== i);
  ok('no hay módulos repetidos', dupes.length === 0, dupes.join(', '));

  // Tildes y palabras vacías.
  ok('quita las tildes para poder comparar', fold('Gestión') === 'gestion');
  ok('las palabras que están en cualquier pregunta no cuentan',
    !terms('¿cómo se calcula el riesgo?').includes('como'));
  ok('y las que sí distinguen, sí', terms('¿cómo se calcula el riesgo?').includes('riesgo'));
  ok('una pregunta sin términos útiles no devuelve nada',
    searchEdu([], '¿que? ¿como?').results.length === 0);

  clearEduIndex();
  const index = buildEduIndex(t, 'test');
  ok('el índice cubre los módulos declarados', index.length === EDU_MODULES.length);

  // Con `t` devolviendo la clave, el cuerpo indexado son las claves i18n, que
  // llevan el tema dentro. Sirve para comprobar el ORDEN sin diccionarios.
  const withBody = index.filter((m) => m.bodyTerms.size > 0).length;
  ok('los módulos con getter tienen cuerpo indexado',
    withBody >= EDU_MODULES.filter((m) => m.getters.length).length - 2,
    `${withBody} con cuerpo`);

  // El título pesa más que el cuerpo: preguntar por «wyckoff» tiene que sacar
  // el módulo de Wyckoff primero aunque la palabra aparezca en otros.
  const wyckoff = searchEdu(index, 'wyckoff');
  ok('lo que se LLAMA como lo buscado va primero',
    wyckoff.results[0]?.id === 'wyckoff', wyckoff.results[0]?.id);

  // Y responder a la pregunta ENTERA gana a acertar sólo la palabra frecuente.
  const two = searchEdu(index, 'ichimoku');
  ok('un módulo que acierta todo va antes que uno que acierta parte',
    two.results.length === 0 || two.results[0].matchedAll === true);

  // El resultado dice POR QUÉ ha salido. Sin esto es un oráculo.
  ok('cada resultado declara qué términos ha acertado',
    wyckoff.results.every((r) => Array.isArray(r.matched) && r.matched.length > 0));
  ok('y los ids que devuelve son módulos reales',
    wyckoff.results.every((r) => EDU_MODULES.some((m) => m.id === r.id)));

  // Los tres módulos con veredicto sobre su base empírica lo conservan: es lo
  // que permite que el buscador avise al mandarte a ellos.
  const disputed = index.filter((m) => m.evidence === 'disputed').map((m) => m.id).sort();
  ok('los módulos de base discutida siguen marcados',
    disputed.join(',') === 'gann-box,time-cycles,wolfe-waves', disputed.join(','));

  // Un getter que reviente no puede tumbar el buscador entero.
  clearEduIndex();
  const broken = buildEduIndex((k) => { if (k === 'wyckoffTab') throw new Error('boom'); return String(k); }, 'boom');
  ok('un getter roto no tumba el índice', broken.length === EDU_MODULES.length);
  clearEduIndex();
}

/**
 * Las cifras que la portada dice de sí misma, contra su fuente real.
 *
 * La portada anunciaba «50+ activos» con 186 en el catálogo y «99,9 % de tiempo
 * activo» sin que nadie midiera nada. Se cambiaron por cifras verdaderas, y
 * esto es lo que impide que vuelvan a envejecer: quien añada una calculadora,
 * un activo o una estrategia y no actualice `lib/siteFacts.js` rompe el PR.
 *
 * Se cuentan leyendo el fichero, no importándolo: `DashboardPage.jsx` es JSX y
 * `mockData.js` arrastraría medio bundle para contar 66 elementos.
 */
async function checkSiteFacts() {
  console.log('\nsiteFacts.js  (las cifras de la portada son verdad)');
  const { SITE_FACTS } = await imp('lib/siteFacts.js');
  const lee = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  // Herramientas del banco de calculadoras: `{ value: '...' }` dentro de CALC_NAV.
  const dash = lee('pages/DashboardPage.jsx');
  const navIni = dash.indexOf('const CALC_NAV');
  const navFin = dash.indexOf('\n  ];', navIni);
  const calculadoras = (dash.slice(navIni, navFin).match(/\{ value:/g) || []).length;
  ok(`las ${SITE_FACTS.calculators} calculadoras de la portada existen en el dashboard`,
    calculadoras === SITE_FACTS.calculators,
    `siteFacts dice ${SITE_FACTS.calculators}, CALC_NAV tiene ${calculadoras}`);

  // ── Las páginas estáticas apuntan a algo que existe ──────────────────
  //
  // Las ~1.600 páginas de captación son anzuelo: su única llamada a la acción
  // es un enlace profundo `?tab=` o `?topic=`. Si alguien renombra una
  // pestaña, la página sigue publicándose, sigue posicionando y deja al
  // visitante en la calculadora por defecto sin decir nada. No lo ve el lint,
  // ni el build, ni el sitemap —que las cuenta igual—, así que se comprueba
  // aquí: cada destino que la máquina de SEO promete tiene que existir en la
  // aplicación, y `?tab=` además tiene que estar en la lista que el panel
  // acepta, porque un valor fuera de ella se ignora en silencio.
  const seoSrc = fs.readFileSync(path.join(SRC, '..', 'scripts', 'gen-seo-pages.js'), 'utf8');

  const navTabs = new Set([...dash.slice(navIni, navFin).matchAll(/value: '([a-z0-9-]+)'/g)].map((m) => m[1]));
  const calcsIni = seoSrc.indexOf('const CALCS = [');
  const seoTabs = [...seoSrc.slice(calcsIni, seoSrc.indexOf('\n];', calcsIni)).matchAll(/tab: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  ok('la máquina de SEO enlaza a calculadoras que existen',
    seoTabs.length > 0 && seoTabs.every((t) => navTabs.has(t)),
    `sin destino: ${seoTabs.filter((t) => !navTabs.has(t)).join(', ')}`);

  // La lista que el panel acepta por `?tab=` era una COPIA a mano de CALC_NAV
  // y se quedó atrás: al añadir dos calculadoras el 2026-08-26,
  // `/dashboard?tab=breakeven` aterrizaba en la pestaña por defecto sin que
  // fallara nada. Ahora se deriva de CALC_NAV, así que comprobar "los destinos
  // del SEO están permitidos" contra ella sería preguntarle dos veces a la
  // misma lista: verde garantizado, información cero. Lo que se comprueba es
  // que la derivación siga en pie — si alguien vuelve a escribir la lista a
  // mano, esta rama deja de valer y la de arriba vuelve a ser necesaria.
  const permIni = dash.indexOf('const allowed = [');
  if (permIni !== -1) {
    const permitidas = new Set([...dash.slice(permIni, dash.indexOf('];', permIni)).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]));
    ok('y a pestañas que el panel acepta por la URL (lista literal)',
      seoTabs.every((t) => permitidas.has(t)),
      `no permitidas: ${seoTabs.filter((t) => !permitidas.has(t)).join(', ')}`);
  } else {
    const derivaDeNav = /const ALL_CALC_TOOLS = CALC_NAV\.flatMap\(/.test(dash);
    const derivaLoPermitido = /const allowed = ALL_CALC_TOOLS\.map\(/.test(dash);
    ok('y a pestañas que el panel acepta por la URL (derivadas de CALC_NAV)',
      derivaDeNav && derivaLoPermitido,
      derivaDeNav
        ? 'ALL_CALC_TOOLS existe, pero `allowed` ya no sale de él: vuelve a haber dos listas'
        : 'ALL_CALC_TOOLS ya no sale de CALC_NAV: la cadena de derivación está rota');
  }

  const edu = fs.readFileSync(path.join(SRC, 'pages', 'EducationPage.jsx'), 'utf8');
  const eduIni = edu.indexOf('const EDUCATION_NAV');
  const eduTemas = new Set([...edu.slice(eduIni, edu.indexOf('const totalTopics'))
    .matchAll(/value: '([a-z0-9-]+)'/g)].map((m) => m[1]));
  const topIni = seoSrc.indexOf('const TOPICS = [');
  const seoTemas = [...seoSrc.slice(topIni, seoSrc.indexOf('\n];', topIni)).matchAll(/v:'([a-z0-9-]+)'/g)].map((m) => m[1]);
  ok('la máquina de SEO enlaza a temas de la Academia que existen',
    seoTemas.length > 0 && seoTemas.every((t) => eduTemas.has(t)),
    `sin destino: ${seoTemas.filter((t) => !eduTemas.has(t)).join(', ')}`);

  // Activos: claves de primer nivel de ALL_ASSETS.
  const activosSrc = lee('lib/assets.js');
  const aIni = activosSrc.indexOf('export const ALL_ASSETS');
  const aFin = activosSrc.indexOf('\n};', aIni);
  const activos = (activosSrc.slice(aIni, aFin).match(/^ {2}[A-Z0-9_.=^-]+: \{/gm) || []).length;
  ok(`los ${SITE_FACTS.assets} activos de la portada existen en el catálogo`,
    activos === SITE_FACTS.assets,
    `siteFacts dice ${SITE_FACTS.assets}, ALL_ASSETS tiene ${activos}`);

  // Estrategias de opciones.
  // Las mismas cifras aparecen en el texto que Google enseña en sus resultados,
  // donde llegaron a decir «9 calculadoras» y «250+ activos». No se pueden
  // interpolar —`useSEO` traduce sin parámetros— así que van escritas, y este
  // candado obliga a repasarlas si SITE_FACTS cambia. Se mira el diccionario de
  // referencia; `i18n-check` mantiene el resto en paridad.
  const es = fs.readFileSync(path.join(SRC, 'lib/i18n/es.js'), 'utf8');
  const seo = (es.match(/"seoDashboardDesc":\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
  ok('la descripción del dashboard para buscadores dice las cifras reales',
    seo.includes(String(SITE_FACTS.calculators)) && seo.includes(String(SITE_FACTS.assets)),
    `seoDashboardDesc debería nombrar ${SITE_FACTS.calculators} y ${SITE_FACTS.assets}: «${seo}»`);

  const mock = lee('data/mockData.js');
  const eIni = mock.indexOf('export const STRATEGIES');
  const eFin = mock.indexOf('\n];', eIni);
  const estrategias = (mock.slice(eIni, eFin).match(/^ {2}\{/gm) || []).length;
  ok(`las ${SITE_FACTS.strategies} estrategias de la portada existen en el catálogo`,
    estrategias === SITE_FACTS.strategies,
    `siteFacts dice ${SITE_FACTS.strategies}, STRATEGIES tiene ${estrategias}`);

  // ── Las cifras de la Academia ───────────────────────────────────
  // Vivían sueltas en el texto de venta y nadie las contaba. Decían «50+
  // Reglas» sobre 42, y dos cadenas distintas daban 30 y 27 velas para el
  // mismo catálogo. Un número sobre el producto o sale del código o es un
  // eslogan, y aquí ya hay tres cifras que aprendieron esa lección.
  const contenido = lee('lib/tradingEducationContent.js');
  const cuenta = (fn) => {
    const i = contenido.indexOf(fn);
    if (i < 0) return -1;
    const bloque = contenido.slice(i, contenido.indexOf('\n};', i));
    return new Set([...bloque.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])).size;
  };

  const chartistas = cuenta('getChartPatterns');
  ok(`los ${SITE_FACTS.chartPatterns} patrones chartistas existen`,
    chartistas === SITE_FACTS.chartPatterns,
    `siteFacts dice ${SITE_FACTS.chartPatterns}, getChartPatterns tiene ${chartistas}`);

  const reglas = cuenta('getTradingRules');
  ok(`las ${SITE_FACTS.tradingRules} reglas de trading existen`,
    reglas === SITE_FACTS.tradingRules,
    `siteFacts dice ${SITE_FACTS.tradingRules}, getTradingRules tiene ${reglas}`);

  // Las velas viven en el backend (`candle_patterns.py`), que este script no
  // puede importar. Lo que sí se puede comprobar sin salir del frontend es que
  // las dos cadenas que las citan digan LA MISMA cifra: el 30 contra 27 de
  // `educationCenterDesc` y `seoEducationDesc` estuvo publicado en 10 idiomas.
  const citaVelas = (clave) => {
    const txt = (es.match(new RegExp(`"${clave}":\\s*"((?:[^"\\\\]|\\\\.)*)"`)) || [])[1] || '';
    return txt.includes(String(SITE_FACTS.candlePatterns));
  };
  for (const clave of ['educationCenterDesc', 'seoEducationDesc']) {
    ok(`${clave} dice las ${SITE_FACTS.candlePatterns} velas reales`, citaVelas(clave),
      `debería nombrar ${SITE_FACTS.candlePatterns}`);
  }
  // ── El precio que se le dice a Google, en los DIEZ idiomas ──────
  // `seoPricingDesc` anunciaba «9,99 $/mes» en alemán, francés, ruso, japonés,
  // chino y árabe. El precio real son 17 €: ni la cifra ni la divisa. Es la
  // única cadena traducida donde una cifra distinta por idioma no es un matiz
  // de estilo sino un precio falso publicado en un buscador, así que se
  // comprueban las diez y no sólo la de referencia.
  const IDIOMAS_SEO = ['es', 'en', 'de', 'fr', 'it', 'pt', 'ru', 'ja', 'zh', 'ar'];
  const PRECIO_MENSUAL = '17';
  for (const idi of IDIOMAS_SEO) {
    const dicc = fs.readFileSync(path.join(SRC, `lib/i18n/${idi}.js`), 'utf8');
    const txt = (dicc.match(/"seoPricingDesc":\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
    const otroPrecio = /\d+[.,]\d{2}\s*\$|\$\s*\d+[.,]\d{2}/.test(txt);
    ok(`${idi}: el precio que ve Google es el real y no otro`,
      txt.includes(PRECIO_MENSUAL) && !otroPrecio, `«${txt.slice(0, 70)}»`);
  }

  // Y que ninguna siga inflando las reglas ni las calculadoras.
  for (const [clave, real] of [['eduFeatureRules', SITE_FACTS.tradingRules],
    ['featureCalculators', SITE_FACTS.calculators]]) {
    const txt = (es.match(new RegExp(`"${clave}":\\s*"((?:[^"\\\\]|\\\\.)*)"`)) || [])[1] || '';
    ok(`${clave} no inventa una cifra`, txt.includes(String(real)),
      `dice «${txt}» y son ${real}`);
  }
}

/**
 * El Monte Carlo, que hasta ahora no comprobaba nadie.
 *
 * Su motor vivía dentro del `.jsx` y por eso conservó durante meses el fallo
 * que ya se había arreglado en el Simulador Pro: el saldo bajaba de cero y el
 * camino seguía operando. Estas comprobaciones existen para que no vuelva.
 */
async function checkMonteCarlo() {
  console.log('\nmonteCarlo.js  (la distribución de resultados)');
  const { runMonteCarlo, runPath, magnitud, normalizeConfig } = await imp('lib/monteCarlo.js');
  const { makeRng } = await imp('components/calculators/simulator/simulatorEngine.js');

  // El caso que destapó el fallo: 45 % de acierto y ±500 sobre 10.000.
  const duro = {
    capital: 10000, trades: 100, iterations: 1500, seed: 7,
    winRate: 45, sizing: 'fixed', avgWin: 500, avgLoss: -500,
  };
  const r = runMonteCarlo(duro);

  ok('ningún camino termina con saldo negativo',
    r.statistics.p5 >= 0 && r.statistics.avgFinalBalance >= 0,
    `p5=${r.statistics.p5}`);

  // El invariante de verdad: NINGÚN punto de NINGUNA curva puede ser negativo.
  const minimoGlobal = Math.min(...r.paths.map((c) => Math.min(...c)));
  ok('ningún punto de ninguna curva baja de cero', minimoGlobal >= 0, `mínimo=${minimoGlobal}`);

  ok('el drawdown nunca pasa del 100 %',
    r.statistics.worstMaxDrawdown <= 100,
    `peor=${r.statistics.worstMaxDrawdown}`);

  // Con estos parámetros la ruina existe; y medida sobre el CAMINO tiene que
  // ser mayor o igual que contando sólo los que acaban a cero.
  const acabanEnCero = r.paths.filter((c) => c[c.length - 1] === 0).length / r.paths.length * 100;
  ok('la ruina se mide sobre el camino y no sólo sobre el final',
    r.statistics.riskOfRuin >= acabanEnCero - 1e-9,
    `camino=${r.statistics.riskOfRuin} final=${acabanEnCero}`);

  ok('una cuenta arruinada deja de operar',
    r.paths.every((c) => {
      const i = c.indexOf(0);
      return i === -1 || i === c.length - 1;
    }));

  ok('si nadie se arruina, la operación de ruina es indefinida y no cero',
    runMonteCarlo({ capital: 10000, trades: 30, iterations: 200, seed: 3,
      winRate: 100, sizing: 'fixed', avgWin: 100, avgLoss: -50 })
      .statistics.medianRuinTrade === null);

  // Reproducibilidad: sin ella un resultado no se puede compartir ni auditar.
  const a = runMonteCarlo({ ...duro, seed: 42 });
  const b = runMonteCarlo({ ...duro, seed: 42 });
  const c = runMonteCarlo({ ...duro, seed: 43 });
  ok('la misma semilla da exactamente el mismo resultado',
    JSON.stringify(a.statistics) === JSON.stringify(b.statistics));
  ok('una semilla distinta da un resultado distinto',
    JSON.stringify(a.statistics) !== JSON.stringify(c.statistics));

  // Dispersión: con cero, dos únicos resultados posibles; con dispersión, más
  // cola por abajo. Es la razón de ser del cambio.
  const sinDisp = runMonteCarlo({ ...duro, dispersion: 0, iterations: 3000 });
  const conDisp = runMonteCarlo({ ...duro, dispersion: 0.6, iterations: 3000 });
  ok('sin dispersión todos los resultados son múltiplos del tamaño fijo',
    sinDisp.paths.every((c) => c.every((v) => Math.abs(v % 500) < 1e-6)));
  ok('la dispersión ensancha la distribución',
    (conDisp.statistics.p95 - conDisp.statistics.p5) > (sinDisp.statistics.p95 - sinDisp.statistics.p5),
    `con=${conDisp.statistics.p95 - conDisp.statistics.p5} sin=${sinDisp.statistics.p95 - sinDisp.statistics.p5}`);

  // La media de la lognormal es la que se pide: si no, la dispersión movería
  // la esperanza y estaría cambiando la estrategia, no su varianza.
  const rnd = makeRng(11);
  let suma = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) suma += magnitud(500, 0.5, rnd);
  ok('añadir dispersión no cambia la media del resultado',
    Math.abs(suma / N - 500) / 500 < 0.01, `media=${(suma / N).toFixed(1)}`);

  // Porcentaje y capitalización.
  const pct = runMonteCarlo({ capital: 10000, trades: 60, iterations: 800, seed: 5,
    winRate: 50, sizing: 'percent', riskPct: 1, payoff: 2 });
  ok('el modo porcentaje produce una distribución válida',
    pct.error === null && pct.statistics.p50 > 0);
  const comp = runMonteCarlo({ capital: 10000, trades: 60, iterations: 800, seed: 5,
    winRate: 50, sizing: 'percent', riskPct: 1, payoff: 2, compound: true });
  ok('capitalizar cambia el resultado respecto a no capitalizar',
    comp.statistics.p50 !== pct.statistics.p50);

  // Remuestreo del diario.
  const soloGanancias = runMonteCarlo({ capital: 1000, trades: 50, iterations: 300, seed: 9,
    sample: [10, 20, 30] });
  ok('remuestreando operaciones ganadoras nadie se arruina',
    soloGanancias.statistics.riskOfRuin === 0 && soloGanancias.statistics.profitProbability === 100);
  const soloPerdidas = runMonteCarlo({ capital: 100, trades: 50, iterations: 300, seed: 9,
    sample: [-10, -20] });
  ok('remuestreando sólo pérdidas se arruinan todos',
    soloPerdidas.statistics.riskOfRuin === 100);

  // Los percentiles están ordenados. Suena obvio y es lo que se rompe al
  // cambiar un índice.
  const st = r.statistics;
  ok('los percentiles salen ordenados',
    st.p5 <= st.p25 && st.p25 <= st.p50 && st.p50 <= st.p75 && st.p75 <= st.p95);

  // Entradas imposibles: se dice el motivo, no se devuelve una distribución
  // construida sobre ceros.
  ok('sin capital no se simula', runMonteCarlo({ ...duro, capital: 0 }).error === 'capital');
  ok('sin operaciones no se simula', runMonteCarlo({ ...duro, trades: 0 }).error === 'trades');
  ok('un acierto imposible no se simula', runMonteCarlo({ ...duro, winRate: 140 }).error === 'win_rate');
  ok('un diario vacío no se simula', runMonteCarlo({ capital: 100, trades: 10, sample: [] }).error === 'sample_empty');
  ok('normalizeConfig no inventa una configuración a partir de nada',
    normalizeConfig({}).cfg === null);

  // El "riesgo de ruina 0 %" que hacía pensar que la herramienta estaba rota.
  // Con los valores por defecto no se puede llegar a cero ni perdiéndolas
  // todas, y la pantalla tiene que poder decirlo con un número.
  const porDefecto = runMonteCarlo({ capital: 10000, trades: 100, iterations: 1000, seed: 4,
    winRate: 55, sizing: 'fixed', avgWin: 100, avgLoss: -50, dispersion: 0.4 });
  ok('con los valores por defecto la ruina es imposible, y se puede demostrar',
    porDefecto.statistics.riskOfRuin === 0 && porDefecto.statistics.worstCaseBalance === 5000,
    `ruina=${porDefecto.statistics.riskOfRuin} peorCaso=${porDefecto.statistics.worstCaseBalance}`);
  ok('cuando el peor caso es negativo, la ruina sí puede aparecer',
    r.statistics.worstCaseBalance < 0 && r.statistics.riskOfRuin > 0,
    `peorCaso=${r.statistics.worstCaseBalance} ruina=${r.statistics.riskOfRuin}`);
  // Capitalizando, cada pérdida es un porcentaje de lo que queda: nunca llega
  // a cero, y el peor caso tiene que reflejarlo en vez de salir negativo.
  ok('capitalizando, el peor caso decae pero no se hace negativo',
    runMonteCarlo({ capital: 10000, trades: 200, iterations: 100, seed: 8, winRate: 30,
      sizing: 'percent', riskPct: 5, payoff: 1, compound: true, dispersion: 0 })
      .statistics.worstCaseBalance > 0);
  ok('remuestreando sólo ganancias el peor caso es el capital intacto',
    soloGanancias.statistics.worstCaseBalance === 1000);

  // ── Rachas ──
  // La fórmula cerrada tiene que coincidir con lo que sale del sorteo; si no,
  // estaríamos pintando en vivo un número que la simulación desmiente.
  const { streakProbability, streakAtProbability, killingStreak, lossProbability } =
    await imp('lib/monteCarlo.js');

  ok('una racha imposible tiene probabilidad cero',
    streakProbability(10, 20, 0.5) === 0 && streakProbability(0, 1, 0.5) === 0);
  ok('sin pérdidas no hay rachas', streakProbability(100, 3, 0) === 0);
  ok('perdiendo siempre, la racha es segura', streakProbability(100, 3, 1) === 1);
  ok('la probabilidad decrece al pedir rachas más largas',
    streakProbability(100, 5, 0.55) > streakProbability(100, 6, 0.55));
  ok('y crece con más operaciones',
    streakProbability(500, 8, 0.55) > streakProbability(100, 8, 0.55));

  // Contraste con la simulación: mismo experimento, dos caminos distintos.
  const simulaRacha = (n, k, q, sims, semilla) => {
    const rr = makeRng(semilla);
    let veces = 0;
    for (let s = 0; s < sims; s++) {
      let racha = 0, tocado = false;
      for (let i = 0; i < n; i++) {
        if (rr() < q) { racha++; if (racha >= k) tocado = true; } else racha = 0;
      }
      if (tocado) veces++;
    }
    return veces / sims;
  };
  for (const [n, k, q] of [[100, 10, 0.55], [100, 5, 0.55], [100, 8, 0.45]]) {
    const teorica = streakProbability(n, k, q);
    const medida = simulaRacha(n, k, q, 40000, 2024 + k);
    ok(`la fórmula de rachas coincide con el sorteo (n=${n} k=${k})`,
      Math.abs(teorica - medida) < 0.012,
      `teórica=${(teorica * 100).toFixed(2)}% medida=${(medida * 100).toFixed(2)}%`);
  }

  // La racha que mata, según el modo.
  ok('en importes fijos, la racha que mata es capital entre pérdida media',
    killingStreak({ capital: 10000, trades: 100, sizing: 'fixed', avgLoss: -500 }) === 20);
  ok('en porcentaje sin capitalizar, es 100 entre el riesgo',
    killingStreak({ capital: 10000, trades: 100, sizing: 'percent', riskPct: 5, compound: false }) === 20);
  ok('capitalizando no hay racha que mate, y se dice con null',
    killingStreak({ capital: 10000, trades: 100, sizing: 'percent', riskPct: 5, compound: true }) === null);
  ok('remuestreando sólo ganancias tampoco hay racha que mate',
    killingStreak({ capital: 1000, trades: 50, sample: [10, 20] }) === null);
  ok('la probabilidad de perder sale de la muestra en modo diario',
    Math.abs(lossProbability({ sample: [-1, -1, 2, 2] }) - 0.5) < 1e-12);

  // Lo teórico y lo observado tienen que ir de la mano.
  const conRacha = runMonteCarlo({ capital: 10000, trades: 100, iterations: 3000, seed: 6,
    winRate: 55, sizing: 'fixed', avgWin: 100, avgLoss: -50, dispersion: 0 }).statistics;
  ok('la racha típica calculada coincide con la mediana observada',
    Math.abs(conRacha.typicalStreak - conRacha.observedStreakP50) <= 1,
    `teórica=${conRacha.typicalStreak} observada=${conRacha.observedStreakP50}`);
  ok('la racha de 1 de cada 20 coincide con el percentil 95 observado',
    Math.abs(conRacha.streakOneInTwenty - conRacha.observedStreakP95) <= 1,
    `teórica=${conRacha.streakOneInTwenty} observada=${conRacha.observedStreakP95}`);
  ok('la racha típica nunca supera a la de 1 de cada 20',
    conRacha.typicalStreak <= conRacha.streakOneInTwenty);
  ok('la racha observada no puede pasar del número de operaciones',
    conRacha.observedStreakMax <= 100);
  ok('el aviso de streakAtProbability es monótono',
    streakAtProbability(100, 0.55, 0.5) <= streakAtProbability(100, 0.55, 0.05));

  // Un solo camino se puede repetir por separado: es lo que permite enseñar
  // "esta trayectoria" sin que sea otra tirada distinta.
  const { cfg } = normalizeConfig(duro);
  const c1 = runPath(cfg, makeRng(123));
  const c2 = runPath(cfg, makeRng(123));
  ok('un camino concreto se puede volver a ejecutar igual',
    JSON.stringify(c1) === JSON.stringify(c2));
}

async function checkCrossMargin() {
  console.log('\ncrossMargin.js');
  const {
    accountState, marginLevelPrice, cushion, canOpen, simulateLadder, buildLadder,
    sizeForCushion, absoluteMaxLots, survivalProbability, isolatedStopDistance,
  } = await imp('lib/crossMargin.js');

  // Caso de referencia del curso de la Academia (?topic=cross-margin): cinco
  // lotes de oro a 4.328,15 con 5.000 $ y 1:500. Cada cifra de aquí abajo está
  // ESCRITA en el texto de los módulos, así que si el motor cambia, el
  // contenido deja de ser cierto y este check lo caza antes que un lector.
  const base = { balance: 5000, leverage: 500, contractSize: 100, marginModel: 'net' };
  const pos = [{ lots: 5, entry: 4328.15, side: 'long' }];
  const st = accountState({ ...base, positions: pos, price: 4328.15 });

  ok('margen usado = lotes·contrato·precio/apalancamiento', near(st.marginUsed, 4328.15, 1e-9),
    `${st.marginUsed}`);
  ok('margen libre = 671,85 (módulo xm-05)', near(st.freeMargin, 671.85, 1e-9), `${st.freeMargin}`);
  ok('margin level = 115,5 % (quiz xm-02)', near(st.marginLevel, 115.5, 0.05), `${st.marginLevel}`);

  const so = marginLevelPrice({ ...base, positions: pos, thresholdPct: 50 });
  ok('stop-out al 50 % en 4.322,47 (módulo xm-04)', near(so, 4322.47, 0.01), `${so}`);
  ok('colchón cruzado = 5,68 $ (módulos xm-04 y xm-08)',
    near(cushion({ ...base, positions: pos, price: 4328.15 }), 5.68, 0.005));
  ok('colchón a 1:1000 = 7,84 $ (módulo xm-08)',
    near(cushion({ ...base, leverage: 1000, positions: pos, price: 4328.15 }), 7.84, 0.005));
  ok('distancia en aislado = 8,66 $ = precio/apalancamiento (módulo xm-04)',
    near(isolatedStopDistance({ price: 4328.15, leverage: 500 }), 8.66, 0.005));
  // Y la comparación que da sentido al módulo: el cruzado liquida ANTES.
  ok('el cruzado al 50 % liquida antes que el aislado',
    cushion({ ...base, positions: pos, price: 4328.15 })
      < isolatedStopDistance({ price: 4328.15, leverage: 500 }));

  // El tramo que no entra (módulo xm-05).
  const add = canOpen({ ...base, positions: pos, price: 4328.20, addLots: 5, side: 'long' });
  ok('el segundo tramo de 5 lotes se rechaza', add.ok === false);
  ok('pide 4.328,20 y hay 696,80', near(add.required, 4328.20, 1e-6) && near(add.available, 696.80, 1e-6),
    `req=${add.required} disp=${add.available}`);
  ok('sólo caben 0,80 lotes', near(add.maxLots, 0.805, 0.005), `${add.maxLots}`);

  // El precio que lo desbloquea: 4.335,49, no el 4.337,35 que decía el borrador
  // del que salió este contenido. La cifra del texto sale de aquí.
  let lo = 4328.2;
  let hi = 4400;
  for (let i = 0; i < 80; i += 1) {
    const m = (lo + hi) / 2;
    if (canOpen({ ...base, positions: pos, price: m, addLots: 5, side: 'long' }).ok) hi = m;
    else lo = m;
  }
  ok('el segundo tramo se desbloquea en 4.335,49 (módulo xm-05)', near(hi, 4335.49, 0.01), `${hi}`);

  // La cota de la bisección no puede salir del margen libre: al cubrir en
  // modelo neto caben lotes que no cuestan margen ninguno, y una cota derivada
  // del dinero disponible los cortaba en silencio (daba ~3,1 en vez de 10,78).
  const hedge = canOpen({ ...base, positions: pos, price: 4328.15, addLots: 5, side: 'short' });
  ok('cubrir en modelo neto no consume margen', hedge.ok === true && hedge.required <= 0);
  ok('el máximo al cubrir no lo limita el margen libre', hedge.maxLots > 5, `${hedge.maxLots}`);

  // El candado bajo los tres modelos (módulo xm-07).
  const locked = [...pos, { lots: 5, entry: 4328.15, side: 'short' }];
  const lockNet = accountState({ ...base, positions: locked, price: 4328.15 });
  const lockMax = accountState({ ...base, marginModel: 'max', positions: locked, price: 4328.15 });
  const lockSum = accountState({ ...base, marginModel: 'sum', positions: locked, price: 4328.15 });
  ok('candado en modelo neto: margen cero', near(lockNet.marginUsed, 0, 1e-9));
  ok('margin level sin margen usado es INDEFINIDO, no cero', lockNet.marginLevel === null);
  ok('candado en modelo de mayor pata: margen sin cambio', near(lockMax.marginUsed, st.marginUsed, 1e-9));
  ok('candado en modelo de ambas patas: margen al doble', near(lockSum.marginUsed, st.marginUsed * 2, 1e-9));
  ok('y el margin level cae al 58 % (módulo xm-07)', near(lockSum.marginLevel, 58, 0.5),
    `${lockSum.marginLevel}`);
  ok('una cuenta bloqueada no tiene precio de liquidación',
    marginLevelPrice({ ...base, positions: locked, thresholdPct: 50 }) === null);

  // Tamaño defendible frente a tamaño abrible (módulo xm-08).
  const defensible = (lev) => sizeForCushion({
    balance: 5000, price: 4328.15, leverage: lev, contractSize: 100, cushionPrice: 70,
  });
  const esperado = { 200: 0.620, 500: 0.673, 1000: 0.693, 2000: 0.704 };
  for (const [lev, v] of Object.entries(esperado)) {
    ok(`tamaño defendible a 1:${lev} = ${v}`, near(defensible(Number(lev)), v, 0.0005),
      `${defensible(Number(lev))}`);
  }
  const techo = absoluteMaxLots({ balance: 5000, contractSize: 100, cushionPrice: 70 });
  ok('techo de la cuenta = 0,714 lotes (quiz xm-08)', near(techo, 0.7143, 0.0005), `${techo}`);
  ok('ningún apalancamiento supera el techo',
    [200, 500, 1000, 2000, 1e6].every((l) => defensible(l) <= techo + 1e-9));
  ok('el tamaño defendible converge al techo', near(defensible(1e9), techo, 1e-4));
  // Y el punto entero del módulo: casi todo el recorrido está en el primer salto.
  ok('de 1:500 a 1:1000 el tamaño defendible sube ~3 %',
    Math.abs((defensible(1000) / defensible(500) - 1) * 100 - 3) < 0.5);

  // El margen se evalúa en el precio del STOP-OUT, no en el de entrada: es la
  // tesis del módulo xm-04 y estaba contradicha en la propia fórmula.
  ok('sizeForCushion usa el precio del stop-out, no el de entrada',
    !near(defensible(200), 5000 / (100 * (70 + (0.5 * 4328.15) / 200)), 1e-9));

  // Ruina del jugador (módulo xm-10).
  ok('supervivencia sin deriva = b/(a+b)',
    near(survivalProbability({ targetMove: 260, cushionMove: 7.66 }), 7.66 / 267.66, 1e-12));
  ok('supervivencia 2,9 % con 7,66 de colchón y 260 de objetivo',
    near(survivalProbability({ targetMove: 260, cushionMove: 7.66 }) * 100, 2.9, 0.05));
  ok('con deriva de 20 $/día y sigma 60 $ sube al 8,6 %',
    near(survivalProbability({
      targetMove: 260, cushionMove: 7.66, driftPerDay: 20, sigmaPerDay: 60,
    }) * 100, 8.6, 0.05));
  ok('la deriva a favor sólo puede mejorar la probabilidad',
    survivalProbability({ targetMove: 260, cushionMove: 7.66, driftPerDay: 20, sigmaPerDay: 60 })
      > survivalProbability({ targetMove: 260, cushionMove: 7.66 }));
  ok('5 de colchón y 100 de objetivo dan 4,8 % (quiz xm-10)',
    near(survivalProbability({ targetMove: 100, cushionMove: 5 }) * 100, 4.8, 0.05));

  // La escalera: piramidar ensancha el colchón, amontonar lo mata.
  const piramide = simulateLadder({
    ...base,
    side: 'long',
    entries: buildLadder({ entry: 4328.15, lots: 5, spacing: 10, rungs: 5, side: 'long', direction: 'with' }),
    target: 4588.15,
  });
  ok('la escalera con 10 $ de separación entra entera', piramide.completed === true);
  ok('y el colchón CRECE hasta 17,65 $ (módulo xm-06)', near(piramide.finalCushion, 17.65, 0.01),
    `${piramide.finalCushion}`);
  ok('el colchón final supera al del primer tramo',
    piramide.finalCushion > piramide.rungs[0].cushion);

  const apretada = simulateLadder({
    ...base,
    side: 'long',
    entries: buildLadder({ entry: 4328.15, lots: 5, spacing: 0.05, rungs: 5, side: 'long', direction: 'with' }),
    target: 4588.15,
  });
  ok('con 5 céntimos de separación muere en el tramo 2', apretada.blockedAt === 2);
  ok('y sólo deja abiertos los 5 lotes del primero', near(apretada.lotsOpened, 5, 1e-9));

  const promediando = simulateLadder({
    ...base,
    side: 'long',
    entries: buildLadder({ entry: 4328.15, lots: 5, spacing: 10, rungs: 5, side: 'long', direction: 'against' }),
    target: 4588.15,
  });
  ok('promediar a la baja muere en el tramo 2', promediando.blockedAt === 2);

  // `minCushionAt` señalaba al tramo equivocado en cuanto un peldaño tenía
  // colchón indefinido: se buscaba la posición en una lista ya filtrada.
  const aceptados = piramide.rungs.filter((r) => r.accepted && r.cushion !== null);
  const minReal = Math.min(...aceptados.map((r) => r.cushion));
  ok('el colchón mínimo es el menor de los peldaños', near(piramide.minCushion, minReal, 1e-12));
  ok('y minCushionAt señala al peldaño que de verdad lo tiene',
    near(piramide.rungs[piramide.minCushionAt - 1].cushion, minReal, 1e-12),
    `at=${piramide.minCushionAt}`);

  // Un objetivo del lado perdedor no es una distancia a recorrer a favor, y no
  // puede convertirse en una probabilidad de éxito.
  const alReves = simulateLadder({
    ...base,
    side: 'long',
    entries: buildLadder({ entry: 4328.15, lots: 1, spacing: 10, rungs: 2, side: 'long', direction: 'with' }),
    target: 4000,
  });
  ok('un objetivo del lado perdedor da recorrido negativo', alReves.atTarget.move < 0);
  ok('y no produce probabilidad de supervivencia', alReves.survival === null);

  // Sentido de la escalera: es del que llama, y tiene que ser el correcto.
  const conLargo = buildLadder({ entry: 100, lots: 1, spacing: 10, rungs: 3, side: 'long', direction: 'with' });
  const contraLargo = buildLadder({ entry: 100, lots: 1, spacing: 10, rungs: 3, side: 'long', direction: 'against' });
  const conCorto = buildLadder({ entry: 100, lots: 1, spacing: 10, rungs: 3, side: 'short', direction: 'with' });
  ok('un largo escala A FAVOR subiendo de precio', conLargo[2].price === 120);
  ok('un largo escala EN CONTRA bajando de precio', contraLargo[2].price === 80);
  ok('un corto escala a favor a la inversa', conCorto[2].price === 80);
  ok('el decrecimiento reduce cada tramo',
    near(buildLadder({ entry: 100, lots: 1, spacing: 10, rungs: 3, taper: 0.5 })[2].lots, 0.25, 1e-12));

  // La dirección adversa la marca la PENDIENTE, no la exposición neta.
  //
  // Tres largos y dos cortos con el modelo que cobra las dos patas y
  // apalancamiento 2: la cuenta está neta LARGA y al 400 % de margin level, y
  // la mata una SUBIDA, porque el margen crece con el precio más deprisa que el
  // equity. Tomando la dirección del signo de la exposición neta salía −5.000:
  // la magnitud correcta con el signo cambiado, que en pantalla se lee como
  // «ya te han liquidado» sobre una cuenta sana. Lo encontró la simulación
  // masiva, no una comprobación elegida a mano.
  {
    const raro = { balance: 10000, contractSize: 1, leverage: 2, marginModel: 'sum' };
    const mixto = [{ lots: 3, entry: 1000, side: 'long' }, { lots: 2, entry: 1000, side: 'short' }];
    const est = accountState({ ...raro, positions: mixto, price: 1000 });
    ok('la cuenta cubierta con margen de dos patas está al 400 %', near(est.marginLevel, 400, 1e-9));
    ok('y a esa cuenta NETA LARGA la liquida una subida',
      near(marginLevelPrice({ ...raro, positions: mixto, thresholdPct: 100 }), 6000, 1e-9));
    const c = cushion({ ...raro, positions: mixto, price: 1000, thresholdPct: 100 });
    ok('su colchón sale POSITIVO: 5.000 hacia arriba, no −5.000',
      near(c, 5000, 1e-9), `${c}`);
    // La regla general, que es lo que de verdad hay que conservar.
    ok('colchón positivo si y sólo si el margin level supera el umbral',
      (c > 0) === (est.marginLevel > 100));
  }

  // Honestidad numérica: lo que no se puede calcular es null, nunca 0.
  ok('sin posiciones no hay precio de liquidación',
    marginLevelPrice({ ...base, positions: [] }) === null);
  ok('un colchón exigido de cero no da un tamaño infinito',
    sizeForCushion({ balance: 5000, price: 4328.15, leverage: 500, contractSize: 100, cushionPrice: 0 }) === null);
  ok('un precio de cero no produce estado de cuenta',
    accountState({ ...base, positions: pos, price: 0 }).equity === null);
  ok('canOpen con precio inválido no inventa un máximo',
    canOpen({ ...base, positions: pos, price: 0, addLots: 1 }).maxLots === null);
}

async function checkEdgeMath() {
  console.log('\nedgeMath.js');
  const E = await imp('lib/edgeMath.js');
  const { breakevenWinRate } = await imp('lib/projection.js');

  // 1. La comprobación que ata este módulo al que ya existía: sin costes, el
  //    equilibrio nuevo TIENE que ser el de projection.js. Si alguien toca una
  //    de las dos fórmulas, esto salta.
  for (const rr of [0.25, 0.5, 1, 2, 3, 10]) {
    ok(`equilibrio sin costes == breakevenWinRate (R:R ${rr})`,
      near(E.equilibrioNeto(rr, 0), breakevenWinRate(rr), 1e-9));
  }

  // 2. La tabla de referencia del sector, a mano.
  ok('R:R 0,25 exige 80 % de acierto', near(E.equilibrioNeto(0.25, 0), 80, 0.01));
  ok('R:R 2 exige 33,33 %',            near(E.equilibrioNeto(2, 0), 33.33, 0.01));
  ok('R:R 3 exige 25 %',               near(E.equilibrioNeto(3, 0), 25, 0.01));

  // 3. Esperanza. 35 % de acierto con 3:1 es el caso canónico: +0,40R.
  ok('35 % @ 3:1 = +0,40R', near(E.esperanzaNetaR(35, 3, 0), 0.40, 1e-9));
  // El coste resta k EXACTOS a la esperanza, sea cual sea el acierto. Es la
  // propiedad que hace que el modelo de costes sea legible.
  for (const w of [20, 35, 50, 80]) {
    ok(`un coste de 0,05R resta 0,05R con acierto ${w} %`,
      near(E.esperanzaNetaR(w, 3, 0.05), E.esperanzaNetaR(w, 3, 0) - 0.05, 1e-9));
  }

  // 4. Coherencia interna: en el equilibrio neto la esperanza neta es cero.
  //    Tolerancia 1e-4 porque el equilibrio se devuelve redondeado a dos
  //    decimales de porcentaje, igual que `breakevenWinRate`; medio milésimo de
  //    punto de acierto son 5e-5 R. Con 1e-9 el test mediría el redondeo.
  for (const [rr, k] of [[1, 0.07], [2, 0.08], [0.5, 0.03], [3, 0.12]]) {
    const w = E.equilibrioNeto(rr, k);
    ok(`esperanza nula en el equilibrio (R:R ${rr}, k ${k})`,
      near(E.esperanzaNetaR(w, rr, k), 0, 1e-4));
  }

  // 5. Rachas en un punto dado. El segundo número es el que circula mal por ahí
  //    (se lee «~0,5 %» en más de un sitio): 0,4^5 es 1,024 %, no 0,5 %.
  ok('4 pérdidas seguidas con 60 % de acierto = 2,56 %',
    near(E.probRachaEnUnPunto(60, 4), 0.0256, 1e-9));
  ok('5 pérdidas seguidas con 60 % de acierto = 1,024 %',
    near(E.probRachaEnUnPunto(60, 5), 0.01024, 1e-9));

  // 6. `probAlgunaRacha` contra Monte Carlo: la recursión es exacta, así que
  //    una simulación independiente tiene que caer encima. Es la segunda ruta —
  //    comprobar la recursión contra sí misma no comprobaría nada.
  const mc = (N, winPct, k, tandas, semilla) => {
    let s = semilla >>> 0;
    const rnd = () => {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    const q = 1 - winPct / 100;
    let exitos = 0;
    for (let t = 0; t < tandas; t++) {
      let run = 0;
      for (let i = 0; i < N; i++) {
        if (rnd() < q) { if (++run >= k) { exitos++; break; } } else run = 0;
      }
    }
    return exitos / tandas;
  };
  for (const [N, w, k] of [[100, 60, 5], [200, 60, 5], [100, 35, 7], [500, 50, 8], [50, 70, 3]]) {
    const exacto = E.probAlgunaRacha(N, w, k);
    const sim = mc(N, w, k, 120000, 9973 + N * 31 + w * 7 + k);
    ok(`racha de ${k} en ${N} ops al ${w} %: recursión ${(exacto * 100).toFixed(2)} % ≈ MC ${(sim * 100).toFixed(2)} %`,
      Math.abs(exacto - sim) < 0.006, `dif ${(Math.abs(exacto - sim) * 100).toFixed(3)} pp`);
  }

  // 7. Lo que separa las dos preguntas que todo el mundo confunde: perder 5
  //    seguidas AQUÍ es raro; que pase ALGUNA VEZ en 200 operaciones no lo es.
  ok('perder 5 seguidas alguna vez en 200 ops al 60 % supera el 70 %',
    E.probAlgunaRacha(200, 60, 5) > 0.70);
  ok('…y en un punto dado no llega al 2 %',
    E.probRachaEnUnPunto(60, 5) < 0.02);

  // 8. El arrastre por frecuencia, que es el argumento entero.
  ok('mismo coste, 8 ops/mes = 0,4 % del capital', near(E.arrastreMensual(0.05, 1, 8), 0.4, 1e-9));
  ok('mismo coste, 200 ops/mes = 10 % del capital', near(E.arrastreMensual(0.05, 1, 200), 10, 1e-9));

  // 9. Honestidad numérica: lo incalculable es null, nunca 0.
  ok('un riesgo de cero no define el coste en R', E.costeEnR({ coste: 10, riesgo: 0 }) === null);
  ok('R:R cero no tiene equilibrio', E.equilibrioNeto(0, 0) === null);
  ok('un 100 % de acierto no define racha máxima', E.rachaMaximaEsperada(100, 100) === null);
  ok('un acierto del 120 % no da esperanza', E.esperanzaNetaR(120, 2, 0) === null);
  // Cero SÍ es la respuesta correcta aquí: no es indefinido, es imposible.
  ok('una racha más larga que la serie es imposible, no indefinida',
    E.probAlgunaRacha(10, 60, 20) === 0);
}

/**
 * Las cifras del riesgo de cola.
 *
 * El módulo `tail-risk` tenía 1.096 palabras y ninguna cifra. Ahora las tiene,
 * y una cifra en pantalla es una afirmación: «un movimiento de 20 sigma pasa
 * una vez cada 7 × 10⁸⁵ años» o es verdad o es propaganda con decimales.
 *
 * La ruta independiente es doble:
 *  · Las teóricas, contra los valores que devuelve `erfc` en doble precisión
 *    (Python `math.erfc(s/√2)`, transcritos aquí con doce dígitos). El código
 *    usa la fracción continua de Mills, que no comparte nada con erfc salvo
 *    el resultado.
 *  · Las reales, contra la aritmética que las relaciona: si el Nasdaq cayó un
 *    77,9 %, volver EXIGE un +352 %, y eso lo dice la fórmula, no el texto.
 */
async function checkTailRisk() {
  console.log('\ntailRiskData.js  (las cifras del riesgo de cola)');
  const T = await imp('lib/tailRiskData.js');

  // math.erfc(s/sqrt(2)) — probabilidad de |Z| > s, dos colas.
  const ERFC = {
    3: 2.699796063260e-03,
    4: 6.334248366624e-05,
    5: 5.733031437584e-07,
    6: 1.973175290075e-09,
    7: 2.559625087772e-12,
    10: 1.523970604832e-23,
    20: 5.507248237213e-89,
  };
  for (const [s, ref] of Object.entries(ERFC)) {
    const got = T.colaNormal(Number(s));
    const err = Math.abs(got - ref) / ref;
    ok(`cola de ${s} σ = ${ref.toExponential(3)} (erfc)`, err < 1e-9,
      `fracción continua ${got.toExponential(6)}, error relativo ${err.toExponential(2)}`);
  }

  // Y la razón por la que no se usa la CDF de blackScholes.js: su error
  // ABSOLUTO (~1,5e-7) es cien mil veces mayor que la respuesta a 7 σ. Si
  // alguien «unifica» las dos funciones, esto lo caza.
  const { calculateD1D2 } = await imp('utils/blackScholes.js').catch(() => ({}));
  void calculateD1D2; // sólo para dejar constancia de que se miró el módulo
  ok('la cola de 7 σ es más pequeña que el error de una CDF de opciones',
    T.colaNormal(7) < 1.5e-7 / 1000,
    `cola ${T.colaNormal(7).toExponential(2)} vs error típico 1,5e-7`);

  // Anualización: 252 sesiones. Cambiarlo mueve TODAS las frecuencias.
  ok('3 σ, una vez cada ~1,5 años', near(T.frecuenciaNormal(3), 1 / ERFC[3] / 252, 1e-9));
  ok('la frecuencia usa 252 sesiones y no 365',
    Math.abs(T.frecuenciaNormal(3) - 1.4696) < 0.001,
    `da ${T.frecuenciaNormal(3).toFixed(4)}`);
  ok('20 σ supera los 10⁷⁵ universos',
    T.frecuenciaNormal(20) / T.EDAD_UNIVERSO_ANIOS > 1e75);

  // Recuperación: la asimetría es el argumento entero del módulo de ruina.
  ok('recuperar el 50 % exige el 100 %', near(T.subidaParaRecuperar(0.50), 1, 1e-12));
  ok('recuperar el 80 % exige el 400 %', near(T.subidaParaRecuperar(0.80), 4, 1e-12));
  ok('recuperar el 90 % exige el 900 %', near(T.subidaParaRecuperar(0.90), 9, 1e-12));
  ok('una caída del 100 % no se recupera: es null (no Infinity, no 0)',
    T.subidaParaRecuperar(1) === null);
  ok('la recuperación siempre supera a la caída (nunca es simétrica)',
    T.CAIDAS.every((d) => T.subidaParaRecuperar(d) > d));

  // Las cifras de recuperación que el TEXTO de los eventos afirma, derivadas
  // de los niveles reales y no de la caída ya redondeada. Escribir «+352 %»
  // (que era 353) fue exactamente este fallo, y sólo lo cazó pedirle la cifra
  // a los dos precios en vez de a la memoria.
  const evento = (id) => T.EVENTOS_COLA.find((e) => e.id === id);
  const recuperar = (id) => T.subidaParaRecuperar(T.caidaDesde(evento(id).ref)) * 100;
  ok('el Nasdaq (5.048,62 → 1.114,11) exige un +353 % para volver',
    Math.round(recuperar('puntocom')) === 353, `da ${recuperar('puntocom').toFixed(1)} %`);
  ok('el Nikkei (38.915,87 → 7.603,76) exige un +412 %',
    Math.round(recuperar('nikkei')) === 412, `da ${recuperar('nikkei').toFixed(1)} %`);
  // `pctDe` devuelve la variación CON signo; `caidaDesde`, la magnitud sin él.
  ok('y sus caídas se pintan con signo: −77,9 % y −80,5 %',
    Math.abs(T.pctDe(evento('puntocom')) + 77.9) < 0.05
    && Math.abs(T.pctDe(evento('nikkei')) + 80.5) < 0.05,
    `da ${T.pctDe(evento('puntocom')).toFixed(2)} y ${T.pctDe(evento('nikkei')).toFixed(2)}`);

  // Cada evento, completo. Una fila a medias se pinta a medias y nadie lo ve.
  const campos = ['id', 'activo', 'cuando'];
  const incompletos = T.EVENTOS_COLA.filter((e) => campos.some((c) => !e[c]));
  ok(`los ${T.EVENTOS_COLA.length} eventos traen fecha y activo`,
    incompletos.length === 0, `incompletos: ${incompletos.map((e) => e.id || '?').join(', ')}`);
  ok('cada evento resuelve a una magnitud numérica (escrita o derivada)',
    T.EVENTOS_COLA.every((e) => Number.isFinite(T.pctDe(e))),
    `sin magnitud: ${T.EVENTOS_COLA.filter((e) => !Number.isFinite(T.pctDe(e))).map((e) => e.id).join(', ')}`);
  // La magnitud es número y no cadena a propósito: una cifra escrita a mano
  // enseñaría «−77,9 %» a un lector inglés, que lee la coma como millar.
  ok('ninguna magnitud viene preformateada como texto',
    T.EVENTOS_COLA.every((e) => typeof e.pct !== 'string'));
  // Un evento con `ref` no puede además escribir su `pct`: serían dos fuentes
  // para la misma cifra, y una de las dos envejecería en silencio.
  ok('ningún evento declara a la vez los niveles y el porcentaje',
    T.EVENTOS_COLA.every((e) => !(e.ref && Number.isFinite(e.pct))),
    `duplicados: ${T.EVENTOS_COLA.filter((e) => e.ref && Number.isFinite(e.pct)).map((e) => e.id).join(', ')}`);

  // El emparejamiento dato ↔ texto se hace por `id`, y un id que el getter no
  // conoce no da error: la celda sale VACÍA. Esto se comprueba resolviendo el
  // getter contra los diez diccionarios de verdad, que es lo que se pinta —no
  // la existencia de una clave, que es sólo la mitad del camino.
  const { getTailRiskFigures } = await imp('lib/tradingEducationContent.js');
  const IDIOMAS = ['es', 'en', 'de', 'fr', 'ru', 'zh', 'ja', 'ar', 'pt', 'it'];
  const huecos = [];
  for (const l of IDIOMAS) {
    const dic = { ...(await imp(`lib/i18n/${l}.js`)).default, ...(await imp(`lib/i18n/${l}.edu.js`)).default };
    const c = getTailRiskFigures((k) => dic[k] ?? '');
    for (const e of T.EVENTOS_COLA) if (!c.events.lines[e.id]) huecos.push(`${e.id}/${l}`);
    for (const [seccion, campos2] of Object.entries({
      sigma: ['title', 'intro', 'move', 'prob', 'freq', 'years', 'universes'],
      events: ['title', 'when', 'asset', 'size', 'what', 'note'],
      recovery: ['title', 'intro', 'fall', 'need', 'note'],
    })) {
      for (const campo of campos2) if (!c[seccion][campo]) huecos.push(`${seccion}.${campo}/${l}`);
    }
    if (!c.title) huecos.push(`title/${l}`);
  }
  ok('cada evento y cada rótulo tienen texto en los diez idiomas',
    huecos.length === 0, `vacíos: ${huecos.slice(0, 5).join(', ')} (${huecos.length} en total)`);

  // Y al revés: una línea que el getter tiene y ningún evento usa es texto
  // escrito, traducido diez veces y que no se pinta en ninguna parte.
  const sobran = Object.keys(getTailRiskFigures((k) => k).events.lines)
    .filter((id) => !T.EVENTOS_COLA.some((e) => e.id === id));
  ok('ninguna línea del getter se queda sin evento que la pinte',
    sobran.length === 0, `sobran: ${sobran.join(', ')}`);

  // ── Las cifras que el texto de «por qué importa» promete ────────────────
  //
  // Ese bloque existe porque un consejo sin consecuencia cuantificada se
  // olvida: «gestiona el riesgo» no enseña nada, «ocho pérdidas al 10 % te
  // dejan al 43 %» sí. Pero entonces la prosa es una afirmación numérica más,
  // y aquí se ata a la función que la produce: si `edgeMath` o
  // `subidaParaRecuperar` cambian, el texto deja de cuadrar y esto salta.
  const { getWhyItMattersBlocks } = await imp('lib/tradingEducationContent.js');
  const E2 = await imp('lib/edgeMath.js');
  const es = (await imp('lib/i18n/es.edu.js')).default;
  const W = getWhyItMattersBlocks((k) => es[k] ?? '');

  const tras8 = (riesgo) => (1 - riesgo) ** 8;
  const cifras = [
    ['85,1', tras8(0.02) * 100, 0.05],
    ['17,5', T.subidaParaRecuperar(1 - tras8(0.02)) * 100, 0.05],
    ['43,0', tras8(0.10) * 100, 0.05],
    ['132', T.subidaParaRecuperar(1 - tras8(0.10)) * 100, 0.5],
  ];
  for (const [texto, valor, tol] of cifras) {
    const calc = Number(texto.replace(',', '.'));
    ok(`el bloque de tamaño dice ${texto} y la aritmética da ${valor.toFixed(1)}`,
      Math.abs(calc - valor) <= tol && W.size.cost.includes(texto),
      W.size.cost.includes(texto) ? 'la cifra no cuadra' : `«${texto}» ya no aparece en el texto`);
  }

  // El equilibrio con y sin costes, que es la cifra del segundo bloque.
  ok('el bloque de esperanza dice 50 % sin costes, y eso es lo que calcula',
    Math.abs(E2.equilibrioNeto(1, 0) - 50) < 1e-9 && W.edge.cost.includes('50 %'));
  ok('…y 55 % con costes de 0,1 R, que es el salto que denuncia',
    Math.abs(E2.equilibrioNeto(1, 0.1) - 55) < 1e-9 && W.edge.cost.includes('55 %'));

  // ── La tabla de equilibrio del módulo de riesgo ─────────────────────────
  //
  // El coste de referencia está escrito DOS veces: en la constante que pinta
  // la columna y en el texto que la explica («costes de 0,1 R»). Dos fuentes
  // para la misma cifra es exactamente lo que envejece en silencio, así que
  // aquí se exige que coincidan.
  const { COSTE_REFERENCIA } = await imp('components/education/BreakevenTable.jsx')
    .catch(() => ({ COSTE_REFERENCIA: null }));
  const { getBreakevenTable } = await imp('lib/tradingEducationContent.js');
  const B = getBreakevenTable((k) => es[k] ?? '');
  ok('la tabla del curso y la del panel salen de la misma función',
    E2.RR_REFERENCIA.length === 10 && E2.tablaEquilibrio(0.1).length === 10);
  ok('la columna con costes usa el 0,1 R que su propio texto anuncia',
    B.colNet.includes('0,1 R') && B.intro.includes('0,1 R'),
    `colNet: «${B.colNet}»`);
  // La afirmación concreta de la nota: a 0,5 : 1 hay que acertar dos de cada
  // tres para empatar. Si `breakevenWinRate` cambiara, la frase mentiría.
  const dosDeTres = E2.equilibrioNeto(0.5, 0);
  ok('a 0,5 : 1 el equilibrio son dos de cada tres (66,7 %)',
    Math.abs(dosDeTres - (100 / 1.5)) < 0.01 && B.note.includes('0,5 : 1'),
    `da ${dosDeTres.toFixed(2)} %`);
  // Y con costes se acerca a tres de cada cuatro, que es la otra mitad.
  const conCostes = E2.equilibrioNeto(0.5, 0.1);
  ok('…y con costes sube hacia tres de cada cuatro (73,3 %)',
    conCostes > 70 && conCostes < 75, `da ${conCostes.toFixed(2)} %`);
  void COSTE_REFERENCIA; // el JSX no se importa; la constante se lee del fuente
  const fuenteTabla = fs.readFileSync(path.join(SRC, 'components', 'education', 'BreakevenTable.jsx'), 'utf8');
  ok('la constante del componente es el 0,1 R del texto',
    /COSTE_REFERENCIA = 0\.1;/.test(fuenteTabla),
    'si cambia el coste, cambia la columna y el texto deja de describirla');
}

(async () => {
  console.log('engine-check — offline checks for the client-side engines');
  await checkSimulatorEngine();
  await checkTradingSystemModel();
  await checkPrefsMerge();
  await checkProjection();
  await checkInstruments();
  await checkSinCatalogosParalelos();
  await checkDeskMath();
  await checkCrossMargin();
  await checkEduIndex();
  await checkScannerMeta();
  await checkOptionsEngine();
  await checkSiteFacts();
  await checkMonteCarlo();
  await checkEdgeMath();
  await checkTailRisk();
  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
})().catch((err) => {
  console.error('engine-check crashed:', err);
  process.exit(1);
});
