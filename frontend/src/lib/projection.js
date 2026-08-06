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
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

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
    maxDrawdown: maxDD,
    roi: capitalIn > 0 ? ((netWorth - capitalIn) / capitalIn) * 100 : 0,
    ruined: balance <= capitalIn * (1 - RUIN_THRESHOLD),
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
    probabilityOfProfit: round2((paths.filter((p) => p.profitable).length / n) * 100),
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
