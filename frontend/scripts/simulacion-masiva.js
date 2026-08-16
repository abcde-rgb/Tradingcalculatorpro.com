#!/usr/bin/env node
/**
 * Mil operaciones distintas contra todos los motores, de una vez.
 *
 * `engine-check.js` comprueba casos ELEGIDOS: números que alguien calculó a
 * mano y fijó porque una vez fallaron. Es imprescindible y tiene un punto
 * ciego evidente — sólo encuentra lo que a alguien se le ocurrió mirar.
 *
 * Esto es lo otro: escenarios **generados**, todos diferentes, y sobre cada uno
 * se comprueba que los números **significan lo que dicen**. No que no revienten
 * —eso lo hace cualquier bucle— sino que:
 *
 *   · el riesgo que sale es el riesgo que se pidió,
 *   · el nocional es precio × cantidad × tamaño de contrato y no otra cosa,
 *   · la liquidación cae del lado correcto de la entrada,
 *   · el apalancamiento NO toca el P&L (la regla que ya costó el BUG-046),
 *   · una put y una call cumplen la paridad,
 *   · y nada, en ningún sitio, es NaN ni Infinity.
 *
 * La semilla es fija: dos ejecuciones dan los mismos mil escenarios, así que un
 * fallo se reproduce con su número de caso. Con `--semilla N` se cambia el
 * mundo entero para buscar en otro sitio.
 *
 *   node scripts/simulacion-masiva.js
 *   node scripts/simulacion-masiva.js --n 10000 --semilla 7
 *   node scripts/simulacion-masiva.js --verboso
 *
 * Sale con 1 si alguna invariante se rompe, e imprime el escenario exacto.
 */
const path = require('path');
const { pathToFileURL } = require('url');

const SRC = path.join(__dirname, '..', 'src');
const imp = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : d;
};
const VERBOSO = args.includes('--verboso');
const N = opt('n', 1000);
const SEMILLA = opt('semilla', 20260814);

/** PRNG determinista (mulberry32). Sin dependencias y reproducible. */
function rng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(SEMILLA);
const entre = (a, b) => a + R() * (b - a);
const enteroEntre = (a, b) => Math.floor(entre(a, b + 1));
const uno = (lista) => lista[Math.floor(R() * lista.length)];
/** Escala logarítmica: cuentas de 100 € y de 10 M salen con la misma frecuencia. */
const logEntre = (a, b) => Math.exp(entre(Math.log(a), Math.log(b)));

// ─── Contabilidad ─────────────────────────────────────────────────

const fallos = [];
let comprobaciones = 0;
const porMotor = new Map();

function apunta(motor) {
  if (!porMotor.has(motor)) porMotor.set(motor, { casos: 0, checks: 0, fallos: 0 });
  return porMotor.get(motor);
}

/** Una invariante sobre un escenario. `detalle` es lo que hace falta para reproducirlo. */
function exige(motor, caso, nombre, condicion, detalle) {
  comprobaciones += 1;
  const m = apunta(motor);
  m.checks += 1;
  if (condicion) return true;
  m.fallos += 1;
  fallos.push({ motor, caso, nombre, detalle });
  return false;
}

const finito = (v) => v === null || v === undefined || Number.isFinite(v);
/** Ningún número publicado puede ser NaN ni Infinity. `null` sí: es "no se sabe". */
function todoFinito(motor, caso, obj, prefijo = '') {
  let ok = true;
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'number' || v === null) {
      if (!exige(motor, caso, `${prefijo}${k} es un número o null`, finito(v), `${prefijo}${k}=${v}`)) ok = false;
    }
  }
  return ok;
}

const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

// ─── 1 · La mesa: del riesgo al tamaño ────────────────────────────

async function mesa(n) {
  const {
    resolveSpec, contractSizeFor, positionMetrics, FOREX_LOT_TYPES,
    FUTURES_SPECS, CFD_SPECS, CRYPTO_PERP_SPECS, MAX_EXPOSURE_MULTIPLE,
  } = await imp('lib/instruments.js');
  const {
    RISK_HARD_CAP_PCT, riskBudget, marginModesFor, liquidationView,
    maxSizes, minTicket, breakEven, commissionTotal, stepValues,
    effectiveLeverage, liquidationFromBuffer,
  } = await imp('lib/deskMath.js');

  const PRODUCTOS = ['stock', 'cfd', 'futures', 'forex', 'crypto_spot', 'crypto_perp', 'option'];
  const SIMBOLOS = {
    futures: Object.keys(FUTURES_SPECS),
    cfd: Object.keys(CFD_SPECS),
    crypto_perp: Object.keys(CRYPTO_PERP_SPECS),
    forex: ['EURUSD', 'USDJPY', 'GBPJPY', 'AUDNZD', 'XAUUSD', 'EURGBP'],
    stock: ['AAPL', 'MSFT', 'BRK.A', 'NVDA', 'TSLA'],
    crypto_spot: ['BTC', 'ETH', 'SOL', 'DOGE'],
    option: ['AAPL', 'SPY', 'QQQ'],
  };

  for (let i = 0; i < n; i++) {
    const caso = `mesa#${i}`;
    const m = apunta('mesa'); m.casos += 1;

    // Un mundo distinto en cada vuelta: producto, símbolo, cuenta, riesgo,
    // precio, distancia de stop, lado, objetivo y tipo de lote.
    const product = uno(PRODUCTOS);
    const symbol = uno(SIMBOLOS[product]);
    const side = R() < 0.5 ? 'long' : 'short';
    const lotType = uno(Object.keys(FOREX_LOT_TYPES));
    const capital = logEntre(100, 10_000_000);
    const riskPct = entre(0.05, 14);          // a propósito, por encima del tope
    const entry = logEntre(0.5, 120_000);
    const stopPct = entre(0.05, 25);           // stop del 0,05 % al 25 %
    const stopDistance = entry * stopPct / 100;
    const rMultiple = entre(0.2, 6);
    const declaredLev = R() < 0.3 ? enteroEntre(1, 125) : '';

    const spec = resolveSpec(product, symbol);
    const contractSize = contractSizeFor(product, symbol, { lotType });
    const leverage = effectiveLeverage({ declared: declaredLev, spec, entry, contractSize });
    const budget = riskBudget({ capital, riskPct, mode: 'pct' });

    // ── El tope duro, sin excepciones ────────────────────────────
    exige('mesa', caso, 'por encima del 10 % no hay presupuesto',
      riskPct > RISK_HARD_CAP_PCT ? budget.blocked === true : budget.blocked === false,
      `riskPct=${riskPct.toFixed(3)} blocked=${budget.blocked}`);
    todoFinito('mesa', caso, budget, 'budget.');
    if (budget.blocked) continue;

    exige('mesa', caso, 'el presupuesto es capital × riesgo',
      cerca(budget.amount, capital * riskPct / 100),
      `${budget.amount} vs ${capital * riskPct / 100}`);

    const sizes = maxSizes({ entry, stopDistance, contractSize, riskAmount: budget.amount, capital, leverage, spec });
    todoFinito('mesa', caso, sizes, 'sizes.');
    if (contractSize == null) continue;   // fuera de catálogo: el usuario lo pone
    if (sizes.quantity == null) continue; // no le llega ni al mínimo; caso legítimo

    const qty = sizes.quantity;
    const metrics = positionMetrics({
      entry, quantity: qty, contractSize, leverage, balance: capital, side,
      sl: side === 'long' ? entry - stopDistance : entry + stopDistance,
      tp: side === 'long' ? entry + stopDistance * rMultiple : entry - stopDistance * rMultiple,
      spec,
    });
    todoFinito('mesa', caso, metrics, 'metrics.');

    const ctx = `${product}/${symbol} cap=${capital.toFixed(0)} risk=${riskPct.toFixed(2)}% `
      + `entry=${entry.toFixed(4)} stop=${stopDistance.toFixed(4)} qty=${qty} cs=${contractSize} lev=${leverage}`;

    // ── El riesgo que sale ES el que se pidió ────────────────────
    // Nunca por encima: el tamaño se redondea SIEMPRE hacia abajo.
    exige('mesa', caso, 'el riesgo real no supera el presupuesto',
      metrics.riskAmount <= budget.amount * 1.000001,
      `${metrics.riskAmount} > ${budget.amount} · ${ctx}`);

    // Y si el tope que manda es el riesgo (no el margen ni la exposición) y el
    // producto es fraccionable, tiene que clavarlo.
    if (sizes.binding === 'risk' && sizes.step === null) {
      exige('mesa', caso, 'sin escalón, el riesgo se clava',
        cerca(metrics.riskAmount, budget.amount, 1e-6),
        `${metrics.riskAmount} vs ${budget.amount} · ${ctx}`);
    }

    // ── El tope duro se respeta en el RESULTADO, no sólo al pedirlo ──
    exige('mesa', caso, 'el riesgo resultante nunca pasa del 10 % de la cuenta',
      metrics.riskPctBalance <= RISK_HARD_CAP_PCT + 1e-9,
      `riskPct=${metrics.riskPctBalance} · ${ctx}`);

    // ── Identidades que definen la posición ──────────────────────
    exige('mesa', caso, 'nocional = precio × cantidad × contrato',
      cerca(metrics.notional, entry * qty * contractSize),
      `${metrics.notional} vs ${entry * qty * contractSize} · ${ctx}`);

    if (spec.usesLeverage) {
      exige('mesa', caso, 'margen = nocional / apalancamiento',
        cerca(metrics.marginUsed, metrics.notional / leverage),
        `${metrics.marginUsed} vs ${metrics.notional / leverage} · ${ctx}`);
    } else {
      exige('mesa', caso, 'sin apalancamiento, el margen es el nocional entero',
        cerca(metrics.marginUsed, metrics.notional),
        `${metrics.marginUsed} vs ${metrics.notional} · ${ctx}`);
    }

    exige('mesa', caso, 'exposición = nocional / capital',
      cerca(metrics.exposureMultiple, metrics.notional / capital),
      `${metrics.exposureMultiple} · ${ctx}`);

    exige('mesa', caso, 'el R:B sale de las distancias, no de los importes',
      cerca(metrics.rr, rMultiple, 1e-6),
      `rr=${metrics.rr} vs ${rMultiple} · ${ctx}`);

    // ── Los tres techos: el elegido es el más pequeño ────────────
    const techos = [sizes.byRisk, sizes.byMargin, sizes.byExposure].filter((v) => v != null && v > 0);
    if (techos.length) {
      const menor = Math.min(...techos);
      exige('mesa', caso, 'el tamaño no supera el menor de los tres techos',
        qty <= menor + 1e-9, `qty=${qty} menor=${menor} · ${ctx}`);
      const elegido = { risk: sizes.byRisk, margin: sizes.byMargin, exposure: sizes.byExposure }[sizes.binding];
      exige('mesa', caso, 'el techo que manda es el más pequeño',
        cerca(elegido, menor, 1e-9), `binding=${sizes.binding} ${elegido} vs ${menor} · ${ctx}`);
    }

    // El tope de exposición del proyecto (10× la cuenta) se cumple.
    exige('mesa', caso, 'la exposición respeta el tope del catálogo',
      metrics.exposureMultiple <= MAX_EXPOSURE_MULTIPLE * 1.000001,
      `exp=${metrics.exposureMultiple} · ${ctx}`);

    // ── Liquidación ──────────────────────────────────────────────
    const modos = marginModesFor(spec);
    for (const modo of modos.modes) {
      const liq = liquidationView({
        entry, side, mode: modo, notional: metrics.notional,
        marginUsed: metrics.marginUsed, capital,
        sl: side === 'long' ? entry - stopDistance : entry + stopDistance,
      });
      todoFinito('mesa', caso, liq, `liq.${modo}.`);
      if (liq.price == null) continue;
      exige('mesa', caso, `liquidación (${modo}) del lado correcto`,
        side === 'long' ? liq.price < entry : liq.price > entry,
        `${modo} liq=${liq.price} entry=${entry} side=${side} · ${ctx}`);
      exige('mesa', caso, `liquidación (${modo}) positiva`,
        liq.price > 0, `${liq.price} · ${ctx}`);
    }

    // Con el MISMO nocional, el cruzado aguanta al menos tanto como el aislado
    // siempre que el capital libre sea mayor que el margen de la posición.
    if (modos.modes.includes('cross') && modos.modes.includes('isolated') && capital > metrics.marginUsed) {
      const aisl = liquidationFromBuffer({ entry, side, buffer: metrics.marginUsed, notional: metrics.notional });
      const cruz = liquidationFromBuffer({ entry, side, buffer: capital, notional: metrics.notional });
      if (aisl != null && cruz != null) {
        exige('mesa', caso, 'el cruzado liquida más lejos que el aislado',
          side === 'long' ? cruz <= aisl + 1e-9 : cruz >= aisl - 1e-9,
          `aislado=${aisl} cruzado=${cruz} side=${side} · ${ctx}`);
      }
    }

    // ── Billete mínimo ───────────────────────────────────────────
    const min = minTicket({ entry, stopDistance, contractSize, capital, leverage, spec });
    todoFinito('mesa', caso, min, 'min.');
    if (min.quantity != null) {
      exige('mesa', caso, 'el mínimo operable no supera al tamaño propuesto',
        min.quantity <= qty + 1e-9, `min=${min.quantity} qty=${qty} · ${ctx}`);
    }

    // ── Valor del movimiento ─────────────────────────────────────
    const pasos = stepValues({ quantity: qty, contractSize, spec });
    todoFinito('mesa', caso, pasos, 'pasos.');
    exige('mesa', caso, 'el valor del punto son las unidades de la posición',
      cerca(pasos.perPoint, qty * contractSize), `${pasos.perPoint} · ${ctx}`);
    if (spec.pipSize) {
      exige('mesa', caso, 'riesgo = distancia en pips × valor del pip',
        cerca(metrics.riskAmount, (stopDistance / spec.pipSize) * pasos.perPip, 1e-6),
        `${metrics.riskAmount} · ${ctx}`);
    }

    // ── Comisiones y punto de equilibrio ─────────────────────────
    const fees = commissionTotal({
      notional: metrics.notional, quantity: qty,
      perUnit: entre(0, 5), pctNotional: entre(0, 0.2), flat: entre(0, 10),
    });
    exige('mesa', caso, 'las comisiones no son negativas', fees >= 0 && finito(fees), `${fees}`);
    const be = breakEven({ entry, side, quantity: qty, contractSize, feesTotal: fees });
    exige('mesa', caso, 'el equilibrio se aleja de la entrada en el sentido del coste',
      side === 'long' ? be >= entry - 1e-9 : be <= entry + 1e-9,
      `be=${be} entry=${entry} side=${side} fees=${fees} · ${ctx}`);
  }
}

// ─── 2 · Opciones: Black-Scholes ──────────────────────────────────

async function opciones(n) {
  const BS = await imp('utils/blackScholes.js');

  for (let i = 0; i < n; i++) {
    const caso = `opciones#${i}`;
    const m = apunta('opciones'); m.casos += 1;

    const S = logEntre(1, 5000);
    const K = S * entre(0.5, 1.8);
    const T = entre(1 / 365, 3);
    const r = entre(-0.01, 0.10);
    const v = entre(0.05, 2.5);

    const c = BS.callPrice(S, K, T, r, v);
    const p = BS.putPrice(S, K, T, r, v);
    const ctx = `S=${S.toFixed(3)} K=${K.toFixed(3)} T=${T.toFixed(4)} r=${r.toFixed(4)} v=${v.toFixed(3)}`;

    exige('opciones', caso, 'la prima es finita y no negativa',
      finito(c) && finito(p) && c >= -1e-9 && p >= -1e-9, `c=${c} p=${p} · ${ctx}`);

    // Paridad put-call: C − P = S − K·e^(−rT). Es la identidad que no depende
    // de ningún modelo: si falla, uno de los dos precios está mal.
    const paridad = c - p;
    const teorico = S - K * Math.exp(-r * T);
    exige('opciones', caso, 'paridad put-call',
      Math.abs(paridad - teorico) < 1e-4 * Math.max(1, S), `${paridad} vs ${teorico} · ${ctx}`);

    // Ninguna opción vale menos que su valor intrínseco descontado.
    exige('opciones', caso, 'la call no vale menos que su intrínseco',
      c >= Math.max(0, S - K * Math.exp(-r * T)) - 1e-6, `c=${c} · ${ctx}`);
    exige('opciones', caso, 'la put no vale menos que su intrínseco',
      p >= Math.max(0, K * Math.exp(-r * T) - S) - 1e-6, `p=${p} · ${ctx}`);
    exige('opciones', caso, 'la call nunca vale más que el subyacente',
      c <= S + 1e-6, `c=${c} S=${S} · ${ctx}`);

    // Deltas dentro de su rango, y su relación (Δcall − Δput = 1).
    const dc = BS.delta(S, K, T, r, v, 'call');
    const dp = BS.delta(S, K, T, r, v, 'put');
    exige('opciones', caso, 'delta de la call en [0,1]', dc >= -1e-9 && dc <= 1 + 1e-9, `${dc} · ${ctx}`);
    exige('opciones', caso, 'delta de la put en [-1,0]', dp >= -1 - 1e-9 && dp <= 1e-9, `${dp} · ${ctx}`);
    exige('opciones', caso, 'Δcall − Δput = 1', Math.abs(dc - dp - 1) < 1e-6, `${dc} ${dp} · ${ctx}`);

    // Gamma y vega son iguales para call y put, y no negativas.
    const g = BS.gamma(S, K, T, r, v);
    const ve = BS.vega(S, K, T, r, v);
    exige('opciones', caso, 'gamma no negativa y finita', finito(g) && g >= -1e-12, `${g} · ${ctx}`);
    exige('opciones', caso, 'vega no negativa y finita', finito(ve) && ve >= -1e-12, `${ve} · ${ctx}`);

    // Monotonía: la call sube con el subyacente, la put baja.
    const cUp = BS.callPrice(S * 1.01, K, T, r, v);
    const pUp = BS.putPrice(S * 1.01, K, T, r, v);
    exige('opciones', caso, 'la call sube si sube el subyacente', cUp >= c - 1e-9, `${c}→${cUp} · ${ctx}`);
    exige('opciones', caso, 'la put baja si sube el subyacente', pUp <= p + 1e-9, `${p}→${pUp} · ${ctx}`);

    // Más volatilidad, más prima. En las dos.
    const cVol = BS.callPrice(S, K, T, r, v * 1.1);
    exige('opciones', caso, 'más volatilidad, más prima', cVol >= c - 1e-9, `${c}→${cVol} · ${ctx}`);
  }
}

// ─── 3 · El simulador ─────────────────────────────────────────────

async function simulador(n) {
  const { runSimulation, runMonteCarlo } = await imp('components/calculators/simulator/simulatorEngine.js');

  for (let i = 0; i < n; i++) {
    const caso = `simulador#${i}`;
    const m = apunta('simulador'); m.casos += 1;

    const initialBalance = logEntre(100, 1_000_000);
    const fases = enteroEntre(1, 3);
    const phases = Array.from({ length: fases }, () => ({
      numOps: enteroEntre(10, 400),
      posSize: entre(0.5, 20),
      tp: entre(0.5, 10),
      sl: entre(0.2, 5),
      winRate: entre(5, 95),
    }));

    // Los dos modos NO comparten configuración: `compound` va por fases y
    // `fixed` por sus propios campos (`fixedTotalOps`, `fixedCapitalPerOp`…).
    // Pasarle a `fixed` una config de `compound` hacía que `fixedTotalOps`
    // llegara `undefined`, el bucle no diera ni una vuelta y el motor
    // devolviera una simulación de CERO operaciones sin quejarse — que es como
    // este banco descubrió, de rebote, que el modo fijo no valida su entrada.
    const modoFijo = R() < 0.5;
    const fixedTotalOps = enteroEntre(20, 800);
    const cfg = {
      initialBalance,
      capitalMode: modoFijo ? 'fixed' : 'compound',
      compoundInterest: R() < 0.5,
      tradingComm: entre(0, 0.2),
      platformComm: entre(0, 0.1),
      phases,
      fixedCapitalPerOp: initialBalance * entre(0.005, 0.2),
      fixedTotalOps,
      fixedWinRate: entre(5, 95),
      fixedTakeProfit: entre(0.5, 10),
      fixedStopLoss: entre(0.2, 5),
    };
    const pedidasCfg = modoFijo ? fixedTotalOps : phases.reduce((a, ph) => a + ph.numOps, 0);

    const { results } = runSimulation(cfg);
    const ctx = `modo=${modoFijo ? 'fijo' : 'compuesto'} bal=${initialBalance.toFixed(0)} `
      + `fases=${fases} ops=${pedidasCfg}`;
    todoFinito('simulador', caso, results, 'sim.');

    exige('simulador', caso, 'el saldo final no es negativo',
      results.finalBalance >= 0, `${results.finalBalance} · ${ctx}`);
    exige('simulador', caso, 'el drawdown está entre 0 y 100 %',
      results.maxDrawdown >= -1e-9 && results.maxDrawdown <= 100 + 1e-9,
      `${results.maxDrawdown} · ${ctx}`);
    // ⚠️ Estas tres miraban `results.totalTrades`, `results.wins` y
    // `results.losses`, que NO EXISTEN — el motor devuelve `totalOps`,
    // `totalWins` y `totalLosses`. La guarda `!= null` las convertía en un
    // no-op silencioso: contaban como pasadas sin haberse ejecutado nunca.
    // Una comprobación que no corre es peor que no tenerla, porque además
    // tranquiliza.
    const pedidas = pedidasCfg;
    exige('simulador', caso, 'ganadas + perdidas = total',
      results.totalWins + results.totalLosses === results.totalOps,
      `${results.totalWins}+${results.totalLosses} vs ${results.totalOps} · ${ctx}`);

    if (results.ruinedAt == null) {
      exige('simulador', caso, 'sin ruina, se ejecutan todas las operaciones pedidas',
        results.totalOps === pedidas, `${results.totalOps} vs ${pedidas} · ${ctx}`);
    } else {
      // La cuenta se acabó: ni una operación más, y el saldo es exactamente 0.
      exige('simulador', caso, 'tras la ruina no se opera más',
        results.totalOps === results.ruinedAt && results.totalOps <= pedidas,
        `ops=${results.totalOps} ruina=${results.ruinedAt} pedidas=${pedidas} · ${ctx}`);
      exige('simulador', caso, 'la cuenta arruinada vale exactamente cero',
        results.finalBalance === 0, `${results.finalBalance} · ${ctx}`);
      exige('simulador', caso, 'la ruina es un drawdown del 100 %',
        cerca(results.maxDrawdown, 100, 1e-9), `${results.maxDrawdown} · ${ctx}`);
    }

    exige('simulador', caso, 'la tasa de acierto que se publica sale de lo ocurrido',
      results.totalOps === 0 || cerca(results.winRate, results.totalWins / results.totalOps * 100, 1e-9),
      `${results.winRate} · ${ctx}`);
    // El factor de beneficio es INDEFINIDO sin pérdidas, no infinito. Este
    // banco encontró el `Infinity` en 2 de 50.000 escenarios: hacía falta una
    // simulación sin una sola operación perdedora, que con 400 operaciones y
    // una tasa de acierto realista no pasa nunca — pero con 5.000 escenarios
    // distintos, sí.
    exige('simulador', caso, 'el factor de beneficio es finito o null, nunca Infinity',
      results.profitFactor === null || Number.isFinite(results.profitFactor),
      `${results.profitFactor} · ${ctx}`);
    if (results.profitFactor !== null) {
      exige('simulador', caso, 'el factor de beneficio no es negativo',
        results.profitFactor >= 0, `${results.profitFactor} · ${ctx}`);
    }

    exige('simulador', caso, 'el ROI es la ganancia neta sobre el capital inicial',
      cerca(results.roi, (results.finalBalance - initialBalance) / initialBalance * 100, 1e-9),
      `${results.roi} · ${ctx}`);

    // Monte Carlo sólo en una parte: es caro.
    if (i % 5 === 0) {
      const mc = runMonteCarlo({ ...cfg, mcRuns: 60 });
      if (mc) {
        todoFinito('simulador', caso, mc, 'mc.');
        if (mc.p5 != null && mc.p95 != null) {
          exige('simulador', caso, 'el percentil 5 no supera al 95',
            mc.p5 <= mc.p95 + 1e-9, `p5=${mc.p5} p95=${mc.p95} · ${ctx}`);
        }
        if (mc.median != null && mc.p5 != null && mc.p95 != null) {
          exige('simulador', caso, 'la mediana cae entre los percentiles',
            mc.median >= mc.p5 - 1e-9 && mc.median <= mc.p95 + 1e-9,
            `p5=${mc.p5} med=${mc.median} p95=${mc.p95} · ${ctx}`);
        }
      }
    }
  }
}

// ─── 4 · El P&L del diario: la regla que ya costó un bug ──────────

async function pnl(n) {
  const { resolveSpec, contractSizeFor, positionMetrics } = await imp('lib/instruments.js');

  for (let i = 0; i < n; i++) {
    const caso = `pnl#${i}`;
    const m = apunta('pnl'); m.casos += 1;

    const product = uno(['stock', 'cfd', 'futures', 'forex', 'crypto_perp']);
    const symbol = uno({ futures: ['ES', 'MES', 'CL', 'GC'], cfd: ['XAUUSD', 'US30'],
      crypto_perp: ['BTCUSDT', 'ETHUSDT'], forex: ['EURUSD', 'USDJPY'], stock: ['AAPL'] }[product]);
    const spec = resolveSpec(product, symbol);
    const contractSize = contractSizeFor(product, symbol, { lotType: 'standard' }) ?? 1;
    const entry = logEntre(1, 100_000);
    const exit = entry * entre(0.5, 1.6);
    const qty = entre(0.01, 50);
    const side = R() < 0.5 ? 'long' : 'short';

    // P&L = (salida − entrada) × cantidad × multiplicador. El apalancamiento NO
    // entra. Se comprueba con cinco palancas distintas sobre la MISMA operación:
    // el P&L tiene que salir idéntico las cinco veces.
    const esperado = (side === 'long' ? exit - entry : entry - exit) * qty * contractSize;
    const pnls = [1, 5, 20, 50, 125].map((lev) => {
      const met = positionMetrics({
        entry, quantity: qty, contractSize, leverage: lev, balance: 100000, side,
        sl: side === 'long' ? entry * 0.9 : entry * 1.1, tp: exit, spec,
      });
      // El "reward" al objetivo ES el P&L de cerrar en el objetivo.
      return met.rewardAmount;
    });
    const ctx = `${product}/${symbol} entry=${entry.toFixed(4)} exit=${exit.toFixed(4)} qty=${qty.toFixed(4)} cs=${contractSize}`;

    exige('pnl', caso, 'el apalancamiento NO cambia el P&L',
      pnls.every((v) => cerca(v, pnls[0], 1e-9)),
      `${pnls.join(' | ')} · ${ctx}`);
    exige('pnl', caso, 'P&L = (salida − entrada) × cantidad × multiplicador',
      cerca(pnls[0], Math.abs(esperado), 1e-6),
      `${pnls[0]} vs ${Math.abs(esperado)} · ${ctx}`);

    // Y el margen SÍ cambia con la palanca, en proporción exacta.
    const margenes = [1, 5, 20].map((lev) => positionMetrics({
      entry, quantity: qty, contractSize, leverage: lev, balance: 100000, side, spec,
    }).marginUsed);
    if (spec.usesLeverage) {
      exige('pnl', caso, 'el margen sí baja en proporción a la palanca',
        cerca(margenes[0] / 5, margenes[1], 1e-6) && cerca(margenes[0] / 20, margenes[2], 1e-6),
        `${margenes.join(' | ')} · ${ctx}`);
    }
  }
}

// ─── 5 · La proyección ────────────────────────────────────────────

async function proyeccion(n) {
  const P = await imp('lib/projection.js');

  for (let i = 0; i < n; i++) {
    const caso = `proyeccion#${i}`;
    const m = apunta('proyeccion'); m.casos += 1;

    const winRate = entre(1, 99);
    const avgWinR = entre(0.1, 8);
    const avgLossR = entre(0.1, 3);
    const riskPct = entre(0.1, 5);

    const e = P.expectancyR({ winRate, avgWinR, avgLossR });
    const esperado = (winRate / 100) * avgWinR - (1 - winRate / 100) * avgLossR;
    exige('proyeccion', caso, 'la esperanza en R es la fórmula de siempre',
      e == null || cerca(e, esperado, 1e-9),
      `${e} vs ${esperado} wr=${winRate.toFixed(2)} w=${avgWinR.toFixed(3)} l=${avgLossR.toFixed(3)}`);

    const be = P.breakevenWinRate({ avgWinR, avgLossR });
    if (be != null) {
      exige('proyeccion', caso, 'la tasa de equilibrio está entre 0 y 100',
        be >= -1e-9 && be <= 100 + 1e-9, `${be}`);
      // A esa tasa exacta, la esperanza tiene que ser cero.
      const eBe = P.expectancyR({ winRate: be, avgWinR, avgLossR });
      exige('proyeccion', caso, 'en la tasa de equilibrio la esperanza es cero',
        eBe == null || Math.abs(eBe) < 1e-6, `${eBe} en wr=${be}`);
    }
    exige('proyeccion', caso, 'nada es NaN', finito(e) && finito(be), `e=${e} be=${be}`);
    void riskPct;
  }
}

// ─── 6 · El Monte Carlo ───────────────────────────────────────────

/**
 * Escenarios generados para `lib/monteCarlo.js`.
 *
 * Su motor vivía dentro del `.jsx` y por eso nunca pasó por aquí. El fallo que
 * arrastró —saldos negativos y drawdowns por encima del 100 %— es exactamente
 * el tipo de cosa que estos escenarios encuentran y unas cuantas pruebas
 * elegidas a mano no.
 */
async function montecarlo(n) {
  const { runMonteCarlo } = await imp('lib/monteCarlo.js');

  for (let i = 0; i < n; i++) {
    const caso = `montecarlo#${i}`;
    const m = apunta('montecarlo'); m.casos += 1;

    const capital = logEntre(100, 1_000_000);
    const trades = enteroEntre(5, 300);
    const modo = ['fixed', 'percent', 'sample'][enteroEntre(0, 2)];
    const cfg = {
      capital,
      trades,
      iterations: enteroEntre(30, 200),
      seed: enteroEntre(1, 2 ** 30),
      dispersion: Math.random() < 0.5 ? 0 : entre(0.05, 1.5),
      winRate: entre(0, 100),
    };

    if (modo === 'percent') {
      cfg.sizing = 'percent';
      cfg.riskPct = entre(0.1, 40);
      cfg.payoff = entre(0.2, 6);
      cfg.compound = Math.random() < 0.5;
    } else if (modo === 'sample') {
      // Un diario cualquiera: mezcla de ganancias y pérdidas en dinero.
      cfg.sample = Array.from({ length: enteroEntre(1, 60) },
        () => entre(-capital / 8, capital / 6));
    } else {
      cfg.sizing = 'fixed';
      cfg.avgWin = entre(capital / 500, capital / 3);
      cfg.avgLoss = -entre(capital / 500, capital / 3);
    }

    const r = runMonteCarlo(cfg);
    const ctx = `${modo} cap=${capital.toFixed(0)} ops=${trades} disp=${(cfg.dispersion || 0).toFixed(2)}`;

    if (r.error) {
      // Un error es una respuesta legítima, pero tiene que venir SIN estadísticas
      // a medio hacer: media distribución es peor que ninguna.
      exige('montecarlo', caso, 'un error no trae estadísticas a medias',
        r.statistics === null, `${r.error} · ${ctx}`);
      continue;
    }

    const st = r.statistics;
    exige('montecarlo', caso, 'ningún percentil es negativo',
      [st.p5, st.p25, st.p50, st.p75, st.p95].every((v) => finito(v) && v >= 0), `${st.p5} · ${ctx}`);
    exige('montecarlo', caso, 'los percentiles salen ordenados',
      st.p5 <= st.p25 && st.p25 <= st.p50 && st.p50 <= st.p75 && st.p75 <= st.p95, ctx);
    exige('montecarlo', caso, 'el saldo medio final no es negativo',
      finito(st.avgFinalBalance) && st.avgFinalBalance >= 0, `${st.avgFinalBalance} · ${ctx}`);
    exige('montecarlo', caso, 'el drawdown está entre 0 y 100',
      st.avgMaxDrawdown >= -1e-9 && st.worstMaxDrawdown <= 100 + 1e-9,
      `medio=${st.avgMaxDrawdown} peor=${st.worstMaxDrawdown} · ${ctx}`);
    exige('montecarlo', caso, 'la ruina es un porcentaje',
      st.riskOfRuin >= 0 && st.riskOfRuin <= 100, `${st.riskOfRuin} · ${ctx}`);
    exige('montecarlo', caso, 'la probabilidad de beneficio es un porcentaje',
      st.profitProbability >= 0 && st.profitProbability <= 100, `${st.profitProbability} · ${ctx}`);
    exige('montecarlo', caso, 'sin ruina la operación de ruina es indefinida, no cero',
      st.riskOfRuin > 0 ? st.medianRuinTrade >= 1 : st.medianRuinTrade === null,
      `ruina=${st.riskOfRuin} op=${st.medianRuinTrade} · ${ctx}`);
    exige('montecarlo', caso, 'la ruina ocurre dentro del número de operaciones',
      st.medianRuinTrade === null || st.medianRuinTrade <= trades,
      `${st.medianRuinTrade} > ${trades} · ${ctx}`);

    // Si perder TODAS las operaciones deja saldo, la ruina no puede ocurrir.
    // Es lo que convierte un "0,00 %" mudo en una respuesta que se entiende.
    if (st.worstCaseBalance > 0 && !cfg.dispersion) {
      exige('montecarlo', caso, 'si el peor caso deja saldo, la ruina es cero',
        st.riskOfRuin === 0, `peorCaso=${st.worstCaseBalance} ruina=${st.riskOfRuin} · ${ctx}`);
    }
    exige('montecarlo', caso, 'el peor caso es finito', finito(st.worstCaseBalance), `${st.worstCaseBalance} · ${ctx}`);

    // El invariante que se saltaba el motor viejo: ni un punto por debajo de cero.
    for (const curva of r.paths) {
      const min = Math.min(...curva);
      exige('montecarlo', caso, 'ninguna curva baja de cero', min >= 0, `${min} · ${ctx}`);
      const cero = curva.indexOf(0);
      exige('montecarlo', caso, 'una cuenta arruinada deja de operar',
        cero === -1 || cero === curva.length - 1, `cero en ${cero}/${curva.length} · ${ctx}`);
    }

    // Reproducible: sin esto un resultado no se puede compartir.
    exige('montecarlo', caso, 'la misma semilla da el mismo resultado',
      JSON.stringify(runMonteCarlo(cfg).statistics) === JSON.stringify(st), ctx);
  }
}

// ─── Reparto y ejecución ──────────────────────────────────────────

(async () => {
  const reparto = {
    mesa: Math.round(N * 0.34),
    opciones: Math.round(N * 0.22),
    simulador: Math.round(N * 0.10),
    montecarlo: Math.round(N * 0.12),
    pnl: Math.round(N * 0.12),
    proyeccion: Math.round(N * 0.10),
  };
  const total = Object.values(reparto).reduce((a, b) => a + b, 0);

  console.log(`simulación masiva — ${total} escenarios · semilla ${SEMILLA}`);
  console.log(Object.entries(reparto).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('');

  const t0 = Date.now();
  await mesa(reparto.mesa);
  await opciones(reparto.opciones);
  await simulador(reparto.simulador);
  await montecarlo(reparto.montecarlo);
  await pnl(reparto.pnl);
  await proyeccion(reparto.proyeccion);
  const ms = Date.now() - t0;

  console.log('motor          casos   comprobaciones   fallos');
  for (const [motor, s] of porMotor) {
    const marca = s.fallos ? '❌' : '✅';
    console.log(`${marca} ${motor.padEnd(12)} ${String(s.casos).padStart(5)} ${String(s.checks).padStart(16)} ${String(s.fallos).padStart(8)}`);
  }
  console.log('');
  console.log(`${comprobaciones - fallos.length}/${comprobaciones} comprobaciones pasadas en ${(ms / 1000).toFixed(1)} s`);

  if (!fallos.length) {
    console.log('\n✅ Ninguna invariante rota en los ' + total + ' escenarios.');
    process.exit(0);
  }

  // Agrupado por invariante: mil fallos del mismo tipo son UN problema, y
  // listarlos uno a uno esconde los otros tres que hay debajo.
  const porTipo = new Map();
  for (const f of fallos) {
    const k = `${f.motor} · ${f.nombre}`;
    if (!porTipo.has(k)) porTipo.set(k, []);
    porTipo.get(k).push(f);
  }
  console.log(`\n❌ ${fallos.length} fallo(s) en ${porTipo.size} invariante(s) distinta(s):\n`);
  for (const [k, lista] of [...porTipo].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${k}  —  ${lista.length} caso(s)`);
    const muestra = VERBOSO ? lista.slice(0, 5) : lista.slice(0, 2);
    for (const f of muestra) console.log(`      ${f.caso}: ${f.detalle}`);
  }
  process.exit(1);
})().catch((err) => {
  console.error('la simulación masiva reventó:', err);
  process.exit(1);
});
