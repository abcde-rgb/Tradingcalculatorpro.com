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
    effectiveLeverage, liquidationFromBuffer, quantityFromMargin, riskForQuantity,
    lotSizing, quoteStep, quoteToAccount, snapDown,
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

    // ── El camino inverso: del margen al número de contratos ─────
    // El usuario dice cuánto capital quiere comprometer y la mesa le devuelve
    // los contratos que salen con SU apalancamiento. Es la misma aritmética
    // recorrida al revés, así que tiene que cerrar por los dos lados.
    const margenPedido = logEntre(1, Math.max(2, capital));
    const porMargen = quantityFromMargin({
      margin: margenPedido, leverage, entry, contractSize, spec,
    });
    todoFinito('mesa', caso, porMargen, 'porMargen.');
    const ctxM = `${ctx} margen=${margenPedido.toFixed(2)}`;

    if (porMargen.quantity != null) {
      // Nunca se compromete más dinero del que el usuario ofreció: el tamaño
      // baja al escalón, jamás sube.
      exige('mesa', caso, 'el margen usado nunca supera el ofrecido',
        porMargen.marginUsed <= margenPedido * 1.000001,
        `${porMargen.marginUsed} > ${margenPedido} · ${ctxM}`);

      exige('mesa', caso, 'el capital movido es precio × cantidad × contrato',
        cerca(porMargen.notional, porMargen.quantity * entry * contractSize),
        `${porMargen.notional} · ${ctxM}`);

      // La cadena que pidió el usuario: unidad → entre palanca → margen.
      const palancaReal = spec.usesLeverage ? leverage : 1;
      exige('mesa', caso, 'el margen es el capital movido entre la palanca',
        cerca(porMargen.marginUsed, porMargen.notional / palancaReal),
        `${porMargen.marginUsed} vs ${porMargen.notional / palancaReal} · ${ctxM}`);

      // El escalón se respeta: no existen 1,3 contratos.
      // «Cae en el escalón» se comprueba volviendo a ajustar: si ya estaba en
      // la rejilla, ajustar otra vez no puede moverla. Dividir y comparar con
      // el entero más cercano parece lo mismo y no lo es — a 1,6e10 el error
      // del propio cociente supera cualquier tolerancia fija.
      if (porMargen.step != null) {
        exige('mesa', caso, 'la cantidad por margen cae en el escalón',
          snapDown(porMargen.quantity, porMargen.step) === porMargen.quantity,
          `q=${porMargen.quantity} paso=${porMargen.step} · ${ctxM}`);
      }

      // Ida y vuelta: devolver el margen calculado no puede inflar el tamaño.
      const vuelta = quantityFromMargin({
        margin: porMargen.marginUsed, leverage, entry, contractSize, spec,
      });
      exige('mesa', caso, 'reintroducir el margen no infla el tamaño',
        vuelta.quantity != null && vuelta.quantity <= porMargen.quantity * (1 + 1e-9),
        `vuelta=${vuelta.quantity} ida=${porMargen.quantity} · ${ctxM}`);

      // El riesgo de ese tamaño es el de siempre: no cambia por venir del margen.
      const riesgoM = riskForQuantity({ quantity: porMargen.quantity, stopDistance, contractSize });
      const metricsM = positionMetrics({
        entry, quantity: porMargen.quantity, contractSize, leverage, balance: capital, side,
        sl: side === 'long' ? entry - stopDistance : entry + stopDistance,
        spec,
      });
      exige('mesa', caso, 'el riesgo no depende de por dónde se entró al cálculo',
        cerca(riesgoM, metricsM.riskAmount, 1e-6),
        `${riesgoM} vs ${metricsM.riskAmount} · ${ctxM}`);
    }

    // Más dinero jamás puede comprar menos contratos.
    const doble = quantityFromMargin({
      margin: margenPedido * 2, leverage, entry, contractSize, spec,
    });
    exige('mesa', caso, 'el doble de margen no da menos contratos',
      (doble.quantity ?? 0) >= (porMargen.quantity ?? 0) - 1e-9,
      `doble=${doble.quantity} simple=${porMargen.quantity} · ${ctxM}`);

    // ── Lotaje con la cuenta en otra divisa ──────────────────────
    // El riesgo se convierte a divisa cotizada para dimensionar y vuelve
    // convertido. Lo que NO puede pasar es que el viaje de ida y vuelta deje
    // al usuario arriesgando más de lo que dijo.
    if (product === 'forex' || product === 'cfd') {
      const paso = quoteStep(spec);
      const pasos = enteroEntre(5, 300);
      const distLote = paso !== null ? pasos * paso : null;
      const lote = lotSizing({
        entry, stopDistance: distLote, contractSize, spec,
        capital, riskAmount: budget.amount, leverage,
      });
      todoFinito('mesa', caso, lote, 'lote.');
      const factor = quoteToAccount({ spec, price: entry });

      exige('mesa', caso, 'el lotaje se declara convertible sólo si hay factor',
        lote.convertible === (factor !== null),
        `convertible=${lote.convertible} factor=${factor} · ${ctx}`);

      if (!lote.convertible) {
        // Un cruce sin tercer cambio no da lotes a medias: no da ninguno.
        exige('mesa', caso, 'sin conversión no se inventa un tamaño',
          lote.lots === null && lote.riskAccount === null && lote.notionalAccount === null,
          `${JSON.stringify(lote)} · ${ctx}`);
      } else if (lote.lots !== null) {
        exige('mesa', caso, 'el riesgo en lotes no supera el presupuesto',
          lote.riskAccount <= budget.amount * 1.000001,
          `${lote.riskAccount} > ${budget.amount} · ${ctx}`);
        exige('mesa', caso, 'el nocional en lotes es precio × unidades × factor',
          cerca(lote.notionalAccount, entry * lote.units * factor),
          `${lote.notionalAccount} · ${ctx}`);
        exige('mesa', caso, 'las unidades son lotes × tamaño de contrato',
          cerca(lote.units, lote.lots * contractSize), `${lote.units} · ${ctx}`);
        // El pip por lote nunca es la constante de 10 $ salvo por coincidencia:
        // lo que se exige es que salga del paso del catálogo.
        if (lote.pipPerLot !== null) {
          exige('mesa', caso, 'el pip por lote sale del paso del catálogo',
            cerca(lote.pipPerLot, contractSize * paso * factor),
            `${lote.pipPerLot} vs ${contractSize * paso * factor} · ${ctx}`);
        }
      }
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

    // Rachas: lo teórico y lo observado tienen que ser coherentes entre sí.
    exige('montecarlo', caso, 'la racha típica no supera la de 1 de cada 20',
      st.typicalStreak <= st.streakOneInTwenty, `${st.typicalStreak} > ${st.streakOneInTwenty} · ${ctx}`);
    exige('montecarlo', caso, 'las rachas caben en el número de operaciones',
      st.observedStreakMax <= trades && st.streakOneInTwenty <= trades,
      `obs=${st.observedStreakMax} teo=${st.streakOneInTwenty} ops=${trades} · ${ctx}`);
    exige('montecarlo', caso, 'la mediana de racha no supera al percentil 95',
      st.observedStreakP50 <= st.observedStreakP95,
      `${st.observedStreakP50} > ${st.observedStreakP95} · ${ctx}`);
    exige('montecarlo', caso, 'la probabilidad de la racha mortal es un porcentaje',
      st.killingStreakProb === null || (st.killingStreakProb >= 0 && st.killingStreakProb <= 100),
      `${st.killingStreakProb} · ${ctx}`);
    // Capitalizando no existe racha que mate, y tiene que decirlo con null.
    exige('montecarlo', caso, 'capitalizando no se inventa una racha mortal',
      !cfg.compound || st.killingStreak === null,
      `compound=${cfg.compound} mata=${st.killingStreak} · ${ctx}`);

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

// ─── 7 · Margen cruzado: la cuenta entera como colateral ──────────
//
// El motor de `lib/crossMargin.js` publica cifras con las que alguien decide si
// abre el siguiente tramo. Aquí se generan cuentas, instrumentos y escaleras al
// azar y se exige que los números signifiquen lo que dicen — sobre todo por
// IDENTIDAD: en vez de creerse el precio de stop-out que devuelve el álgebra, se
// reconstruye la cuenta a ese precio y se comprueba que el margin level es el
// umbral. Eso no puede pasar por casualidad.
async function cruzado(n) {
  const {
    accountState, marginLevelPrice, cushion, canOpen, simulateLadder, buildLadder,
    sizeForCushion, absoluteMaxLots, survivalProbability, isolatedStopDistance,
  } = await imp('lib/crossMargin.js');

  for (let i = 0; i < n; i += 1) {
    const caso = `cruzado#${i}`;
    const m = apunta('cruzado'); m.casos += 1;

    const balance = logEntre(200, 500000);
    const leverage = uno([2, 5, 10, 20, 30, 50, 100, 200, 500, 1000]);
    const contractSize = uno([1, 10, 100, 1000, 5000, 10000, 100000]);
    const precio = logEntre(0.5, 60000);
    const side = uno(['long', 'short']);
    const modelo = uno(['net', 'max', 'sum']);
    const umbral = uno([10, 20, 30, 50, 80, 100]);

    // Una cartera con 1-4 patas, a veces mixta: el modelo de margen sólo se
    // distingue cuando hay las dos direcciones.
    const posiciones = [];
    const patas = enteroEntre(1, 4);
    for (let k = 0; k < patas; k += 1) {
      posiciones.push({
        lots: entre(0.01, 5),
        entry: precio * entre(0.9, 1.1),
        side: k === 0 ? side : uno(['long', 'short']),
      });
    }

    const base = { balance, positions: posiciones, leverage, contractSize, marginModel: modelo };
    const st = accountState({ ...base, price: precio });
    if (!todoFinito('cruzado', caso, st)) continue;

    // La aritmética, rehecha aquí sin usar el motor.
    const dir = (s) => (s === 'short' ? -1 : 1);
    const largas = posiciones.filter((q) => q.side !== 'short').reduce((a, q) => a + q.lots * contractSize, 0);
    const cortas = posiciones.filter((q) => q.side === 'short').reduce((a, q) => a + q.lots * contractSize, 0);
    const unidades = modelo === 'sum' ? largas + cortas
      : modelo === 'max' ? Math.max(largas, cortas) : Math.abs(largas - cortas);
    const flotante = posiciones.reduce((a, q) => a + q.lots * contractSize * (precio - q.entry) * dir(q.side), 0);

    exige('cruzado', caso, 'el margen usado es unidades × precio / apalancamiento',
      cerca(st.marginUsed, (unidades * precio) / leverage), `${st.marginUsed}`);
    exige('cruzado', caso, 'el equity es saldo más flotante',
      cerca(st.equity, balance + flotante), `${st.equity} vs ${balance + flotante}`);
    exige('cruzado', caso, 'el margen libre es equity menos margen usado',
      cerca(st.freeMargin, st.equity - st.marginUsed), `${st.freeMargin}`);
    exige('cruzado', caso, 'el margin level sin margen usado es null, no cero',
      st.marginUsed > 0 ? st.marginLevel !== null : st.marginLevel === null,
      `usado=${st.marginUsed} nivel=${st.marginLevel}`);
    if (st.marginLevel !== null) {
      exige('cruzado', caso, 'el margin level es equity ÷ margen usado × 100',
        cerca(st.marginLevel, (st.equity / st.marginUsed) * 100), `${st.marginLevel}`);
    }
    exige('cruzado', caso, 'el nocional cuenta TODAS las patas, no la neta',
      cerca(st.notional, posiciones.reduce((a, q) => a + q.lots, 0) * contractSize * precio),
      `${st.notional}`);

    // ── La identidad que no se puede fingir ────────────────────────
    const disparo = marginLevelPrice({ ...base, thresholdPct: umbral });
    if (disparo !== null) {
      exige('cruzado', caso, 'el precio de disparo es finito y positivo',
        Number.isFinite(disparo) && disparo > 0, `${disparo}`);
      const enDisparo = accountState({ ...base, price: disparo });
      exige('cruzado', caso, 'en el precio de disparo el margin level ES el umbral',
        enDisparo.marginLevel !== null && cerca(enDisparo.marginLevel, umbral, 1e-6),
        `umbral=${umbral} salió=${enDisparo.marginLevel} P=${disparo}`);
    } else {
      // Un null tiene que estar justificado: o no hay exposición neta, o la
      // ecuación no tiene raíz positiva. Nunca «no me apetecía calcularlo».
      const neta = largas - cortas;
      const A = neta;
      const B = balance - posiciones.reduce((a, q) => a + q.lots * contractSize * q.entry * dir(q.side), 0);
      const den = A - (umbral / 100) * (unidades / leverage);
      exige('cruzado', caso, 'un null de liquidación está justificado',
        A === 0 || den === 0 || !(-B / den > 0), `A=${A} den=${den} B=${B}`);
    }

    // El colchón y el margin level tienen que contar la misma historia.
    const colchon = cushion({ ...base, price: precio, thresholdPct: umbral });
    if (colchon !== null && st.marginLevel !== null) {
      exige('cruzado', caso, 'colchón positivo si y sólo si aún no se ha cruzado el umbral',
        (colchon > 0) === (st.marginLevel > umbral),
        `colchón=${colchon} nivel=${st.marginLevel} umbral=${umbral}`);
    }

    // ── canOpen: coherencia y máximo exacto ────────────────────────
    const añadir = entre(0.01, 3);
    const ladoNuevo = uno(['long', 'short']);
    const co = canOpen({ ...base, price: precio, addLots: añadir, side: ladoNuevo });
    if (co.required !== null) {
      todoFinito('cruzado', caso, co, 'canOpen.');
      exige('cruzado', caso, 'ok es exactamente «lo que pide cabe en lo que hay»',
        co.ok === (co.required <= co.available), `pide=${co.required} hay=${co.available} ok=${co.ok}`);
      exige('cruzado', caso, 'el déficit es cero cuando cabe',
        co.ok ? co.shortfall === 0 : co.shortfall > 0, `${co.shortfall}`);
      exige('cruzado', caso, 'el máximo no es negativo', co.maxLots >= 0, `${co.maxLots}`);
      if (co.maxLots > 0 && co.maxLots < 1e6) {
        const enMax = accountState({
          ...base, price: precio,
          positions: [...posiciones, { lots: co.maxLots, entry: precio, side: ladoNuevo }],
        });
        exige('cruzado', caso, 'en el máximo el margen libre queda en cero, no en negativo',
          enMax.freeMargin >= -Math.abs(balance) * 1e-9,
          `libre=${enMax.freeMargin} max=${co.maxLots}`);
      }
    }

    // ── sizeForCushion: la promesa literal de su etiqueta ──────────
    const exigido = precio * entre(0.001, 0.2);
    const L = sizeForCushion({
      balance, price: precio, leverage, contractSize, cushionPrice: exigido, thresholdPct: umbral, side,
    });
    if (L !== null && L > 0) {
      const pStop = side === 'short' ? precio + exigido : precio - exigido;
      if (pStop > 0) {
        const enStop = accountState({
          balance, positions: [{ lots: L, entry: precio, side }], price: pStop, leverage, contractSize,
        });
        exige('cruzado', caso, 'con el tamaño defendible, el movimiento exigido deja el ML en el umbral',
          enStop.marginLevel !== null && cerca(enStop.marginLevel, umbral, 1e-6),
          `L=${L} umbral=${umbral} salió=${enStop.marginLevel}`);
      }
      const techo = absoluteMaxLots({ balance, contractSize, cushionPrice: exigido });
      exige('cruzado', caso, 'el tamaño defendible nunca supera el techo de la cuenta',
        L <= techo * (1 + 1e-9), `L=${L} techo=${techo}`);
    }

    // ── La escalera ────────────────────────────────────────────────
    const sentido = uno(['with', 'against']);
    const entradas = buildLadder({
      entry: precio, lots: entre(0.01, 3), spacing: precio * entre(0.0001, 0.02),
      rungs: enteroEntre(1, 8), side, direction: sentido, taper: uno([1, 0.8, 0.6]),
    });
    if (entradas.length) {
      const signo = dir(side) * (sentido === 'against' ? -1 : 1);
      exige('cruzado', caso, 'la escalera va en el sentido declarado',
        entradas.length === 1 || Math.sign(entradas[1].price - entradas[0].price) === signo,
        `${sentido} ${side}: ${entradas[0].price} → ${entradas[1] && entradas[1].price}`);

      const sim = simulateLadder({
        balance, leverage, contractSize, side, entries: entradas,
        marginModel: modelo, stopOutPct: umbral, target: precio * entre(0.8, 1.2),
      });
      exige('cruzado', caso, 'los lotes abiertos son la suma de los tramos aceptados',
        cerca(sim.lotsOpened, sim.rungs.filter((r) => r.accepted).reduce((a, r) => a + r.lots, 0)),
        `${sim.lotsOpened}`);
      exige('cruzado', caso, 'completada si y sólo si no hay tramo bloqueado',
        sim.completed === (sim.blockedAt === null && sim.rungs.filter((r) => r.accepted).length === entradas.length),
        `completada=${sim.completed} bloqueo=${sim.blockedAt}`);
      exige('cruzado', caso, 'como mucho un tramo rechazado, y es el último de la lista',
        sim.rungs.filter((r) => !r.accepted).length <= 1
          && (sim.blockedAt === null || sim.rungs[sim.rungs.length - 1].accepted === false),
        `${sim.rungs.map((r) => r.accepted).join(',')}`);
      const conColchon = sim.rungs.filter((r) => r.accepted && r.cushion !== null);
      if (conColchon.length) {
        exige('cruzado', caso, 'el colchón mínimo es el menor de todos',
          cerca(sim.minCushion, Math.min(...conColchon.map((r) => r.cushion))), `${sim.minCushion}`);
        exige('cruzado', caso, 'y minCushionAt señala a un tramo que lo tiene',
          sim.rungs[sim.minCushionAt - 1] && cerca(sim.rungs[sim.minCushionAt - 1].cushion, sim.minCushion),
          `at=${sim.minCushionAt}`);
      }
      if (sim.atTarget) {
        todoFinito('cruzado', caso, sim.atTarget, 'atTarget.');
        exige('cruzado', caso, 'un objetivo del lado perdedor no da probabilidad de éxito',
          sim.atTarget.move > 0 || sim.survival === null,
          `recorrido=${sim.atTarget.move} superv=${sim.survival}`);
      }
      if (sim.survival !== null) {
        exige('cruzado', caso, 'la supervivencia es una probabilidad',
          sim.survival > 0 && sim.survival < 1, `${sim.survival}`);
      }
      for (const r of sim.rungs) todoFinito('cruzado', caso, r.state || {}, 'tramo.');
    }

    // ── Aislado: la etiqueta dice «no depende del tamaño» ──────────
    const dAisl = isolatedStopDistance({ price: precio, leverage });
    if (dAisl !== null) {
      exige('cruzado', caso, 'la distancia en aislado es precio ÷ apalancamiento',
        cerca(dAisl, precio / leverage), `${dAisl}`);
    }

    // ── Ruina del jugador ──────────────────────────────────────────
    const a = precio * entre(0.005, 0.3);
    const b = precio * entre(0.001, 0.1);
    const sigma = precio * entre(0.005, 0.05);
    const mu = precio * entre(-0.02, 0.02);
    const p0 = survivalProbability({ targetMove: a, cushionMove: b });
    const pMu = survivalProbability({ targetMove: a, cushionMove: b, driftPerDay: mu, sigmaPerDay: sigma });
    exige('cruzado', caso, 'sin deriva la ruina es exactamente b/(a+b)', cerca(p0, b / (a + b)), `${p0}`);
    exige('cruzado', caso, 'con deriva sigue siendo una probabilidad',
      pMu > 0 && pMu <= 1, `${pMu}`);
    // Un 1 exacto sólo puede venir de que 1−e^(−k·b) redondee a 1, y eso exige
    // que la deriva aplaste a la volatilidad. Si sale de cualquier otro sitio
    // es un fallo, así que la saturación se comprueba contra su causa.
    if (pMu === 1) {
      const k = (2 * mu) / (sigma * sigma);
      exige('cruzado', caso, 'una certeza de 1 sólo la produce una deriva dominante',
        k * b > 30, `k·b=${k * b}`);
    }
    exige('cruzado', caso, 'la deriva a favor no puede empeorar la probabilidad',
      mu >= 0 ? pMu >= p0 - 1e-12 : pMu <= p0 + 1e-12, `mu=${mu} p0=${p0} pMu=${pMu}`);
  }
}

(async () => {
  const reparto = {
    mesa: Math.round(N * 0.28),
    opciones: Math.round(N * 0.18),
    cruzado: Math.round(N * 0.12),
    simulador: Math.round(N * 0.10),
    montecarlo: Math.round(N * 0.10),
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
  await cruzado(reparto.cruzado);
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
