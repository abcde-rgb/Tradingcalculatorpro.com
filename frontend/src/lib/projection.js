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
import { runMonteCarlo, DEFAULT_MC_ITERATIONS } from '../components/calculators/simulator/simulatorEngine.js';

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
  };
}

const round2 = (v) => Math.round(v * 100) / 100;

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

  const riskMoney = inputs.balance.value * (inputs.riskPct.value / 100);
  const mc = runMonteCarlo({
    capitalMode: inputs.compound ? 'compound' : 'fixed',
    initialBalance: inputs.balance.value,
    compoundInterest: inputs.riskPct.value,
    phases: [],
    // Las comisiones ya están dentro del PnL medido: cobrarlas otra vez sería
    // descontarlas dos veces.
    tradingComm: 0,
    platformComm: 0,
    fixedCapitalPerOp: riskMoney,
    fixedTotalOps: inputs.trades.value,
    fixedWinRate: inputs.winRate.value,
    // El motor trabaja en % sobre el capital de la operación: perder es el
    // 100 % del riesgo (1R) y ganar es el payoff en R.
    fixedStopLoss: 100,
    fixedTakeProfit: 100 * inputs.payoff.value,
    fixedPartialTps: false,
    fixedPartialLegs: [],
    fixedPartialCont: 0,
  }, {
    iterations: iterations || DEFAULT_MC_ITERATIONS,
    baseSeed: PROJECTION_SEED,
    // "Ruina" aquí es perder la mitad de la cuenta, no llegar a cero: de una
    // cuenta partida por la mitad ya casi nadie vuelve, y esperar al cero
    // haría que la probabilidad saliera tranquilizadoramente baja.
    ruinThreshold: RUIN_THRESHOLD,
  });

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
