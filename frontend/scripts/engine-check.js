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

async function checkDeskMath() {
  console.log('\ndeskMath.js  (la mesa: del riesgo al tamaño)');
  const {
    RISK_HARD_CAP_PCT, riskBudget, marginModesFor, liquidationFromBuffer,
    liquidationView, maxSizes, minTicket, averageEntry, partialExits,
    breakEven, commissionTotal, stepValues, requiredLeverage, snapDown,
  } = await imp('lib/deskMath.js');
  const { resolveSpec, liquidationPrice } = await imp('lib/instruments.js');

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
  ok('sólo el perpetuo deja elegir aislado o cruzado',
    marginModesFor(resolveSpec('crypto_perp', 'BTCUSDT')).modes.length === 2);
  ok('futuros, forex y CFD son cruzado y no se pregunta',
    ['futures', 'forex', 'cfd'].every((p) => {
      const m = marginModesFor(resolveSpec(p, ''));
      return m.fixed && m.modes.length === 1 && m.modes[0] === 'cross';
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

  ok('la palanca necesaria nunca baja de 1', near(requiredLeverage(5000, 10000), 1));
  ok('20 000 de nocional con 10 000 de cuenta son 2×', near(requiredLeverage(20000, 10000), 2));
}

(async () => {
  console.log('engine-check — offline checks for the client-side engines');
  await checkSimulatorEngine();
  await checkTradingSystemModel();
  await checkPrefsMerge();
  await checkProjection();
  await checkInstruments();
  await checkDeskMath();
  await checkScannerMeta();
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
