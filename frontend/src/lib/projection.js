/**
 * Proyección a futuro a partir de la operativa REAL del usuario.
 *
 * Todo lo que entra aquí es variable —el usuario puede mover cualquier número—
 * pero cada variable arranca en lo que **su propio diario mide**, y el resultado
 * dice siempre de dónde sale cada cosa. Esa es la diferencia entre una
 * proyección y un simulador de fantasías: un simulador con acierto del 60 % y
 * R:R 3 tecleados a mano describe a un trader que no existe.
 *
 * QUÉ SE MIDE Y QUÉ SE SUPONE
 * ---------------------------
 * Cada campo viaja con su `source`:
 *   'measured' → sale del diario (y trae el tamaño de muestra que lo respalda)
 *   'assumed'  → lo ha cambiado el usuario, o no había muestra para medirlo
 * La interfaz lo pinta distinto, porque una proyección hecha sobre supuestos es
 * una hipótesis, no una previsión, y confundirlas es lo que hace que alguien
 * dimensione una cuenta real contra un número inventado.
 *
 * CÓMO SE PROYECTA
 * ----------------
 * No se extrapola una línea: se remuestrea. Con el acierto y el payoff medidos
 * se lanzan miles de secuencias de N operaciones (Monte Carlo, motor compartido
 * con el simulador) y se reporta la DISTRIBUCIÓN — mediana, percentil 5 y 95,
 * drawdown y probabilidad de ruina—, nunca un número único. La media de un
 * proceso con racha no es lo que le pasa a nadie en particular.
 *
 * El motor razona en porcentajes sobre el capital de cada operación; aquí se
 * usa en R: la pérdida es el 100 % del riesgo (1R) y la ganancia es el payoff
 * medido en R. Las comisiones van a cero **a propósito**: las comisiones reales
 * ya están descontadas dentro del PnL de cada operación del diario, así que
 * volver a aplicarlas las cobraría dos veces.
 */
// Ruta relativa y con extensión a propósito: `engine-check.js` importa este
// módulo con el Node de serie, donde el alias `@/` no existe.
import { makeRng, DEFAULT_MC_ITERATIONS } from '../components/calculators/simulator/simulatorEngine.js';

/** Por debajo de esto, la muestra no sostiene una proyección: se avisa fuerte. */
export const MIN_SAMPLE_FOR_PROJECTION = 30;
/** Y por debajo de esto no se proyecta en absoluto. */
export const MIN_SAMPLE_TO_PROJECT_AT_ALL = 10;
/** Semilla fija: los mismos números tienen que dar el mismo dibujo. */
export const PROJECTION_SEED = 20260805;
/** Fracción del capital cuya pérdida se cuenta como ruina. */
export const RUIN_THRESHOLD = 0.5;

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const field = (value, source, sample = null) => ({ value, source, sample });

/**
 * Lo que el diario mide para una muestra (global o de un setup).
 *
 * `group` es una fila de `analytics.by_setup`; sin ella se usan los totales.
 * Lo que la muestra no sostiene sale como `null` con `source: 'unavailable'`,
 * nunca como 0: un payoff sin operaciones perdedoras es desconocido, y un 0
 * diría que el setup devuelve todo lo que gana.
 */
export function measuredInputs(analytics, group = null) {
  const a = analytics || {};
  const src = group || a;
  const n = group ? (group.n || 0) : (a.closed_trades || 0);

  const winRate = num(src.win_rate);
  const avgWin = num(group ? group.avg_win : a.avg_win);
  const avgLoss = num(group ? group.avg_loss : a.avg_loss);
  const payoff = (avgWin != null && avgLoss) ? avgWin / Math.abs(avgLoss) : null;

  return {
    sample: n,
    winRate: winRate != null
      ? field(round2(winRate), 'measured', n)
      : field(null, 'unavailable', n),
    payoff: payoff != null
      ? field(round2(payoff), 'measured', n)
      : field(null, 'unavailable', n),
    avgWin: avgWin,
    avgLoss: avgLoss != null ? Math.abs(avgLoss) : null,
    avgR: num(group ? group.avg_r : a.avg_r),
    rSample: group ? (group.r_sample || 0) : (a.r_sample_size || 0),
    // Ritmo real de operativa; null cuando el histórico no cubre tiempo
    // suficiente para medirlo (el backend ya se planta ahí).
    tradesPerMonth: num(a.trades_per_month),
  };
}

const round2 = (v) => Math.round(v * 100) / 100;

// ── El motor: secuencias de operaciones agrupadas en MESES ──────────────────
// El simulador general no sirve aquí porque no sabe de meses, y las tres reglas
// de caja que el usuario define en su sistema —aportación fija, tope de
// rentabilidad y retirada del exceso— son mensuales por naturaleza. Así que
// esta proyección lleva su propio recorrido, que se reduce exactamente al caso
// de siempre cuando no hay ninguna regla puesta.
//
// Decisiones que cambian el resultado y por tanto se explican:
//
//  · El DRAWDOWN se mide ajustando el máximo histórico en cada movimiento de
//    caja. Meter 500 € no borra una caída y sacar 500 € no es una pérdida de
//    500 €; sin el ajuste, aportar mensualmente disimularía el drawdown entero.
//  · La RUINA se compara contra el dinero realmente puesto hasta ese momento
//    (inicial + aportado), no contra el saldo del primer día: quien lleva
//    aportando dos años ha arriesgado mucho más que su saldo inicial.
//  · El ROI es sobre el capital aportado, y se reporta también el PATRIMONIO
//    (saldo + retirado). Sin eso, retirar el exceso cada mes parece empeorar el
//    resultado cuando lo que hace es ponerlo a salvo.

function runOnePath(cfg, rnd) {
  const {
    initialBalance, winRate, payoff, riskPct, trades, tradesPerMonth,
    compound, contribution, capPct, withdrawAbove,
  } = cfg;

  let balance = initialBalance;
  let peak = initialBalance;
  let maxDD = 0;
  let contributed = 0;
  let withdrawn = 0;
  let monthsCapped = 0;
  let months = 0;
  let minBalance = initialBalance;
  // Rentabilidad de cada mes, sobre el saldo con el que empezó ese mes. Es la
  // unidad sobre la que actúan las reglas de caja, así que es la que hay que
  // publicar: un tope mensual no se decide mirando la media por operación.
  const monthlyReturns = [];
  const fixedRisk = initialBalance * (riskPct / 100);

  let done = 0;
  while (done < trades) {
    months += 1;
    // 1) Entra la aportación del mes. Sube el saldo y sube el listón del
    //    máximo histórico: dinero nuevo no es una recuperación.
    if (contribution) {
      balance += contribution;
      peak += contribution;
      contributed += contribution;
    }

    const monthStart = balance;
    const capMoney = capPct ? monthStart * (capPct / 100) : null;
    const thisMonth = Math.min(tradesPerMonth, trades - done);

    for (let i = 0; i < thisMonth; i += 1) {
      done += 1;
      // 2) Tope de rentabilidad: alcanzado, no se opera más ESTE mes. Las
      //    operaciones que quedaban no se hacen — cortar la racha es justo lo
      //    que la regla pide, también cuando la racha era buena.
      if (capMoney != null && balance - monthStart >= capMoney) {
        monthsCapped += 1;
        break;
      }
      const risk = compound ? Math.max(0, balance) * (riskPct / 100) : fixedRisk;
      balance += rnd() < winRate / 100 ? risk * payoff : -risk;
      if (balance > peak) peak = balance;
      if (balance < minBalance) minBalance = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    // Lo que ha rendido el mes, antes de tocar la caja.
    if (monthStart > 0) monthlyReturns.push(((balance - monthStart) / monthStart) * 100);

    // 3) Fin de mes: se retira lo que pase del techo. El máximo histórico baja
    //    con el dinero retirado, o el mes siguiente arrancaría "en drawdown".
    if (withdrawAbove != null && balance > withdrawAbove) {
      const out = balance - withdrawAbove;
      balance -= out;
      withdrawn += out;
      peak = Math.max(balance, peak - out);
    }
  }

  const capitalIn = initialBalance + contributed;
  const netWorth = balance + withdrawn;
  return {
    finalBalance: balance,
    netWorth,
    contributed,
    withdrawn,
    monthsCapped,
    months,
    monthlyReturns,
    maxDrawdown: maxDD,
    roi: capitalIn > 0 ? ((netWorth - capitalIn) / capitalIn) * 100 : 0,
    // RUINA = haber perdido la mitad del dinero PUESTO, contando lo que ya
    // sacaste. Medirla sobre el saldo de la cuenta daba "ruina" a quien retira
    // el exceso todos los meses —su saldo se queda a propósito en el suelo—
    // aunque tenga el triple fuera. Eso decía justo lo contrario de la verdad.
    ruined: netWorth <= capitalIn * (1 - RUIN_THRESHOLD),
    // Y aparte: quedarse sin cuenta con la que operar. Es otro suceso, no una
    // pérdida de patrimonio, y al trader le importan los dos.
    wiped: minBalance <= initialBalance * 0.05,
    profitable: netWorth > capitalIn,
  };
}

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const summarize = (values) => {
  const s = [...values].sort((a, b) => a - b);
  return {
    p5: round2(percentile(s, 5)),
    p25: round2(percentile(s, 25)),
    p50: round2(percentile(s, 50)),
    p75: round2(percentile(s, 75)),
    p95: round2(percentile(s, 95)),
    min: round2(s[0]),
    max: round2(s[s.length - 1]),
    mean: round2(s.reduce((a, b) => a + b, 0) / s.length),
  };
};

/**
 * Agrupa las rentabilidades mensuales de un camino en periodos y las compone.
 *
 * Componer y no sumar no es un detalle: un +10 % seguido de un −10 % no es 0,
 * es −1 %. Sumar meses haría que el panel prometiera trimestres que no existen.
 */
function compoundPeriods(monthly, size) {
  const out = [];
  for (let i = 0; i + size <= monthly.length; i += size) {
    let factor = 1;
    for (let k = 0; k < size; k += 1) factor *= 1 + monthly[i + k] / 100;
    out.push((factor - 1) * 100);
  }
  return out;
}

/** Muchas secuencias de la misma configuración → la distribución. */
export function runPaths(cfg, iterations = DEFAULT_MC_ITERATIONS) {
  const n = Math.max(1, Math.min(20000, Math.floor(iterations)));
  const paths = [];
  for (let i = 0; i < n; i += 1) {
    // Semilla por iteración: reproducible, y sin que dos secuencias compartan
    // el mismo hilo de números.
    paths.push(runOnePath(cfg, makeRng((PROJECTION_SEED + i * 2654435761) >>> 0)));
  }
  return {
    iterations: n,
    finalBalance: summarize(paths.map((p) => p.finalBalance)),
    netWorth: summarize(paths.map((p) => p.netWorth)),
    roi: summarize(paths.map((p) => p.roi)),
    maxDrawdown: summarize(paths.map((p) => p.maxDrawdown)),
    withdrawn: summarize(paths.map((p) => p.withdrawn)),
    // Aportado y meses TAMBIÉN son distribuciones en cuanto hay tope: un mes
    // que se corta al llegar al límite deja operaciones sin hacer, así que
    // completar el mismo número de operaciones lleva más meses —y más
    // aportaciones—. Publicarlos como una cifra fija sería mentir sobre el
    // dinero que hay que poner.
    contributed: summarize(paths.map((p) => p.contributed)),
    months: summarize(paths.map((p) => p.months)),
    monthsCapped: summarize(paths.map((p) => p.monthsCapped)),
    probabilityOfRuin: round2((paths.filter((p) => p.ruined).length / n) * 100),
    probabilityOfAccountWiped: round2((paths.filter((p) => p.wiped).length / n) * 100),
    probabilityOfProfit: round2((paths.filter((p) => p.profitable).length / n) * 100),
    // El rendimiento POR PERIODO, que es lo que se puede comparar con "quiero
    // un 10 % al mes". El total de una proyección no dice si ese 10 % se toca
    // alguna vez: la media puede salir de dos meses excelentes y diez planos.
    periods: periodStats(paths),
  };
}

/**
 * Distribución del rendimiento por mes, trimestre y año.
 *
 * Un objetivo mensual sólo se puede juzgar mirando LA DISTRIBUCIÓN DE MESES, no
 * el resultado final: con la misma ventaja, la mitad de los meses puede quedar
 * por debajo del objetivo y aun así el año sale redondo. `hitRate` responde
 * exactamente a "¿cada cuánto llego de verdad?" y `negativeRate` a "¿cada
 * cuánto me toca un periodo en rojo?", que es lo que de verdad hay que
 * aguantar.
 */
function periodStats(paths) {
  const build = (size) => {
    const all = [];
    for (const p of paths) all.push(...compoundPeriods(p.monthlyReturns, size));
    if (!all.length) return null;
    const sorted = Float64Array.from(all).sort();
    return {
      ...summarize(all),
      count: all.length,
      // Periodos en rojo: lo que de verdad hay que aguantar para llegar al
      // resultado de arriba.
      negativeRate: round2((all.filter((v) => v < 0).length / all.length) * 100),
      samples: sorted,
    };
  };
  return { month: build(1), quarter: build(3), year: build(12) };
}

/** Proporción de periodos que llegan al objetivo (sobre la muestra ordenada). */
function rateAtLeast(sorted, target) {
  if (!sorted || !sorted.length) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return round2(((sorted.length - lo) / sorted.length) * 100);
}

/**
 * ¿Cada cuánto se llega de verdad a un objetivo mensual?
 *
 * Se expone aparte porque el objetivo es una pregunta del usuario ("quiero un
 * 10 % al mes"), no una propiedad de la simulación. Y se traduce a trimestre y
 * año COMPUESTOS, que es donde se ve lo que se está pidiendo: un 10 % mensual
 * es un 33 % trimestral y un 214 % anual. Ver esas tres cifras juntas es la
 * mitad de la lección.
 */
export function hitRates(distribution, monthlyTargetPct) {
  const t = num(monthlyTargetPct);
  const p = distribution?.periods;
  if (t == null || !p?.month) return null;
  const q = ((1 + t / 100) ** 3 - 1) * 100;
  const y = ((1 + t / 100) ** 12 - 1) * 100;
  return {
    month: { target: round2(t), rate: rateAtLeast(p.month.samples, t) },
    quarter: { target: round2(q), rate: rateAtLeast(p.quarter?.samples, q) },
    year: { target: round2(y), rate: rateAtLeast(p.year?.samples, y) },
  };
}

/**
 * Esperanza por operación, en R. Es la cuenta que decide si el resto importa:
 * sin esperanza positiva, proyectar más operaciones sólo acerca la ruina.
 */
export function expectancyR(winRatePct, payoff) {
  const p = (num(winRatePct) ?? 0) / 100;
  const b = num(payoff);
  if (b == null) return null;
  return round2(p * b - (1 - p));
}

/**
 * Resuelve los valores finales: lo medido, salvo donde el usuario haya puesto
 * lo suyo. Devuelve también qué se ha tocado, para poder decirlo en pantalla.
 */
export function resolveInputs(measured, overrides = {}) {
  const pick = (key, fallback) => {
    const o = num(overrides[key]);
    if (o != null) {
      const same = measured[key]?.value != null && Math.abs(o - measured[key].value) < 1e-9;
      return field(o, same ? measured[key].source : 'assumed', measured[key]?.sample ?? null);
    }
    if (measured[key]?.value != null) return measured[key];
    return field(fallback, 'assumed', measured[key]?.sample ?? null);
  };

  return {
    winRate: pick('winRate', 50),
    payoff: pick('payoff', 1.5),
    riskPct: num(overrides.riskPct) != null
      ? field(num(overrides.riskPct), overrides.riskSource || 'assumed')
      : field(1, 'assumed'),
    trades: field(Math.max(1, Math.round(num(overrides.trades) ?? 100)), 'assumed'),
    balance: field(Math.max(1, num(overrides.balance) ?? 10000), overrides.balanceSource || 'assumed'),
    compound: Boolean(overrides.compound),
    // Ritmo mensual: medido sobre el histórico cuando lo hay. Es lo que decide
    // cuántas operaciones caben entre dos aportaciones.
    tradesPerMonth: num(overrides.tradesPerMonth) != null
      ? field(Math.max(1, Math.round(num(overrides.tradesPerMonth))), overrides.tradesPerMonthSource || 'assumed')
      : field(Math.max(1, Math.round(measured.tradesPerMonth || 20)),
        measured.tradesPerMonth ? 'measured' : 'assumed'),
    // Reglas de caja. `null` = no aplica, que no es 0: un tope del 0 % pararía
    // la cuenta el primer día y un techo de retirada de 0 la vaciaría entera.
    contribution: field(num(overrides.contribution), overrides.contributionSource || 'assumed'),
    capPct: field(num(overrides.capPct), overrides.capSource || 'assumed'),
    withdrawAbove: field(num(overrides.withdrawAbove), overrides.withdrawSource || 'assumed'),
  };
}

/**
 * La proyección completa.
 *
 * Devuelve `{ ok, reason }` en vez de números cuando la muestra no da: una
 * previsión sobre cuatro operaciones no es una previsión con mucho error, es
 * ruido con formato de gráfico.
 */
export function project(analytics, { group = null, overrides = {}, iterations } = {}) {
  const measured = measuredInputs(analytics, group);
  const inputs = resolveInputs(measured, overrides);
  const expectancy = expectancyR(inputs.winRate.value, inputs.payoff.value);

  const base = {
    inputs,
    measured,
    expectancyR: expectancy,
    // Esperanza en dinero por operación, con el riesgo elegido.
    expectancyMoney: expectancy != null
      ? round2(expectancy * inputs.balance.value * (inputs.riskPct.value / 100))
      : null,
    sample: measured.sample,
    sampleWarning: measured.sample < MIN_SAMPLE_FOR_PROJECTION,
  };

  if (measured.sample < MIN_SAMPLE_TO_PROJECT_AT_ALL) {
    return { ...base, ok: false, reason: 'sample', distribution: null };
  }
  if (expectancy == null) {
    // Sin payoff medido ni supuesto no hay nada que proyectar.
    return { ...base, ok: false, reason: 'noPayoff', distribution: null };
  }

  const mc = runPaths({
    initialBalance: inputs.balance.value,
    winRate: inputs.winRate.value,
    payoff: inputs.payoff.value,
    riskPct: inputs.riskPct.value,
    trades: inputs.trades.value,
    tradesPerMonth: inputs.tradesPerMonth.value,
    compound: inputs.compound,
    // Las comisiones no se aplican: ya están dentro del PnL medido de cada
    // operación del diario, así que volver a cobrarlas las descontaría dos veces.
    contribution: inputs.contribution.value,
    capPct: inputs.capPct.value,
    withdrawAbove: inputs.withdrawAbove.value,
  }, iterations || DEFAULT_MC_ITERATIONS);

  return { ...base, ok: true, reason: null, distribution: mc };
}

// ── El puente entre las tres pantallas ──────────────────────────────────────
//
//   rentabilidad mensual ≈ esperanza (R/op) × operaciones al mes × riesgo (%)
//
// Es la única ecuación que une el Setup (la ventaja, en R), el Diario (la
// frecuencia, medida) y la Analítica (la rentabilidad, en %). Leída al derecho
// dice cuánto renta un sistema; leída al revés dice qué hace falta para llegar
// a un objetivo — y esa segunda lectura es la que convierte "quiero un 10 % al
// mes" en tres decisiones concretas con su precio cada una.

/** Rentabilidad mensual que produce una ventaja dada, a esa frecuencia y riesgo. */
export function monthlyFromEdge(expectancy, tradesPerMonth, riskPct) {
  const e = num(expectancy);
  const n = num(tradesPerMonth);
  const r = num(riskPct);
  if (e == null || n == null || r == null) return null;
  return round2(e * n * r);
}

/**
 * Los tres caminos hacia un objetivo mensual, y lo que cuesta cada uno.
 *
 * Subir la ventaja, operar más o arriesgar más. La ecuación es simétrica pero
 * las consecuencias NO lo son, y ese es justo el punto: el riesgo es la palanca
 * fácil —multiplica la rentabilidad de forma exactamente proporcional— y es la
 * única de las tres que multiplica también el drawdown y la probabilidad de
 * ruina. Por eso cada camino se devuelve con su proyección hecha, no sólo con
 * el número que haría falta.
 *
 * `feasible: false` marca lo aritméticamente imposible (un acierto por encima
 * del 100 %) en vez de devolver un número que no significa nada.
 */
export function routesToTarget(analytics, {
  group = null, overrides = {}, targetMonthlyPct, iterations = 1500,
} = {}) {
  const target = num(targetMonthlyPct);
  const base = project(analytics, { group, overrides, iterations: 1 });
  if (target == null || !base.ok) return null;

  const { winRate, payoff, riskPct, tradesPerMonth } = base.inputs;
  const edge = base.expectancyR;
  if (edge == null) return null;

  const current = monthlyFromEdge(edge, tradesPerMonth.value, riskPct.value);
  const run = (over) => {
    // Riesgo proporcional a propósito: la ecuación del puente da un % MENSUAL,
    // y ese porcentaje sólo se mantiene si el tamaño acompaña a la cuenta. Con
    // riesgo fijo en dinero, el mismo sistema rinde cada mes un poco menos en
    // % según crece el saldo, y la comparación entre los tres caminos dejaría
    // de ser entre iguales.
    const p = project(analytics, {
      group,
      overrides: { ...overrides, compound: true, ...over },
      iterations,
    });
    if (!p.ok) return null;
    const d = p.distribution;
    return {
      monthlyMedian: d.periods?.month?.p50 ?? null,
      hitRate: rateAtLeast(d.periods?.month?.samples, target),
      drawdownP95: d.maxDrawdown.p95,
      ruin: d.probabilityOfRuin,
      redMonths: d.periods?.month?.negativeRate ?? null,
    };
  };

  // 1) Misma frecuencia y mismo riesgo: hace falta MÁS VENTAJA.
  const neededEdge = round2(target / (tradesPerMonth.value * riskPct.value));
  // Con el payoff actual, ¿qué acierto haría falta? E = p(b+1) − 1.
  const neededWinRate = round2(((neededEdge + 1) / (payoff.value + 1)) * 100);
  const edgeFeasible = neededWinRate <= 100;

  // 2) Misma ventaja y mismo riesgo: hacen falta MÁS OPERACIONES.
  const neededTrades = edge > 0 ? Math.ceil(target / (edge * riskPct.value)) : null;

  // 3) Misma ventaja y misma frecuencia: hace falta MÁS RIESGO.
  const neededRisk = edge > 0 ? round2(target / (edge * tradesPerMonth.value)) : null;

  return {
    target: round2(target),
    current,
    alreadyThere: current != null && current >= target,
    edge: {
      needed: neededEdge,
      neededWinRate,
      currentWinRate: winRate.value,
      currentEdge: edge,
      feasible: edgeFeasible,
      outcome: edgeFeasible ? run({ winRate: neededWinRate }) : null,
    },
    frequency: {
      needed: neededTrades,
      current: tradesPerMonth.value,
      feasible: neededTrades != null,
      outcome: neededTrades != null
        ? run({ tradesPerMonth: neededTrades, trades: Math.max(neededTrades * 12, 60) })
        : null,
    },
    risk: {
      needed: neededRisk,
      current: riskPct.value,
      feasible: neededRisk != null,
      outcome: neededRisk != null ? run({ riskPct: neededRisk }) : null,
    },
  };
}

/**
 * El precio de las reglas de caja, con los MISMOS números del usuario.
 *
 * Es la comparación que decide una vida de trading y que casi nadie hace:
 * dejar correr el interés compuesto frente a cobrar el exceso cada mes. Las dos
 * son decisiones legítimas —el dinero retirado no lo puede perder una racha
 * mala— pero cuestan lo que cuestan, y sin verlas juntas la diferencia se
 * subestima siempre, porque una crece de forma exponencial y la intuición
 * humana es lineal.
 *
 * Devuelve el patrimonio mediano de cada variante y su cociente.
 */
export function cashflowCost(analytics, { group = null, overrides = {}, iterations = 2000 } = {}) {
  const withRules = project(analytics, { group, overrides, iterations });
  if (!withRules.ok) return null;
  const compounded = project(analytics, {
    group,
    overrides: {
      ...overrides,
      compound: true,
      contribution: null,
      capPct: null,
      withdrawAbove: null,
    },
    iterations,
  });
  if (!compounded.ok) return null;

  const a = withRules.distribution.netWorth.p50;
  const b = compounded.distribution.netWorth.p50;
  return {
    withRules: round2(a),
    compounded: round2(b),
    ratio: a > 0 ? round2(b / a) : null,
    months: withRules.distribution.months.p50,
    // Sin ninguna regla puesta las dos ramas sólo se diferencian en el
    // compuesto, que ya es la mitad de la lección.
    hasRules: Boolean(overrides.contribution || overrides.capPct || overrides.withdrawAbove),
  };
}

/**
 * Sensibilidad: qué le pasa a la esperanza si la decisión cambia.
 *
 * Es la parte que conecta las métricas con lo que uno HACE: cerrar antes sube
 * el acierto y baja el payoff; aguantar al objetivo hace lo contrario. Se
 * calcula sobre los valores vigentes, no sobre los medidos, para que responda a
 * lo que el usuario está probando en ese momento.
 */
export function sensitivity(winRatePct, payoff, deltas = [-10, -5, 0, 5, 10]) {
  const b = num(payoff);
  if (b == null) return [];
  return deltas.map((d) => {
    const wr = Math.max(0, Math.min(100, (num(winRatePct) ?? 0) + d));
    return { deltaWinRate: d, winRate: round2(wr), expectancyR: expectancyR(wr, b) };
  });
}

/**
 * El acierto que haría falta para que ESTE payoff no pierda dinero.
 *
 * Es el número más útil de todo el panel: convierte "mi R:R es 1,8" en "por
 * debajo del 36 % de acierto, este setup pierde", que es una frase accionable.
 */
export function breakevenWinRate(payoff) {
  const b = num(payoff);
  if (b == null || b <= 0) return null;
  return round2((1 / (1 + b)) * 100);
}
