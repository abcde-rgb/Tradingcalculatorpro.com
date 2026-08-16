/**
 * monteCarlo.js — el motor del simulador de Monte Carlo.
 *
 * Vivía copiado dentro de `MonteCarloSimulator.jsx`, y ahí no lo comprobaba
 * nadie: ni `engine-check` ni los 1000 escenarios lo tocaban. El resultado fue
 * que el mismo fallo que se arregló en el Simulador Pro —cuentas que siguen
 * operando con saldo negativo— seguía vivo aquí. Con 10.000 € de capital y
 * ±500 € por operación, algún camino llegaba a **−15.000 €** y el drawdown
 * salía del **242 %**.
 *
 * Lo que este módulo arregla, y por qué importa:
 *
 *   · **Nadie opera con saldo negativo.** El saldo tiene suelo en cero y el
 *     camino se detiene: una cuenta arruinada no se recupera.
 *   · **La ruina se mide sobre el camino, no sobre el final.** Antes se
 *     contaban sólo los caminos que TERMINABAN en cero, así que uno que se
 *     arruinaba y "resucitaba" no contaba. Eso subestimaba el riesgo.
 *   · **Las ganancias no son todas iguales.** Con dos únicos resultados
 *     posibles no hay dispersión, y sin dispersión el percentil 5 sale
 *     optimista y el drawdown sale corto — que son justo los dos números por
 *     los que se hace un Monte Carlo.
 *   · **Se puede dimensionar por porcentaje**, con o sin capitalización, para
 *     que hable el mismo idioma que la mesa de cálculo.
 *   · **Se puede remuestrear el diario del usuario.** Sus operaciones reales,
 *     en vez de dos promedios tecleados a mano.
 *   · **Semilla explícita.** Dos ejecuciones con la misma semilla dan lo mismo,
 *     así que un resultado se puede compartir y volver a comprobar.
 *
 * Reglas heredadas: lo que no se puede calcular es `null`, nunca 0 (una mediana
 * de ruina sin ruina es indefinida, no la operación cero); y el apalancamiento
 * no aparece por ningún lado porque aquí no multiplica nada.
 *
 * Comprobado en `scripts/engine-check.js` y en `scripts/simulacion-masiva.js`.
 */
// Ruta relativa y con extensión: `engine-check` y la simulación masiva lo
// cargan como módulo ESM desde Node, donde el alias `@/` no existe.
import { makeRng } from '../components/calculators/simulator/simulatorEngine.js';

export const DEFAULT_ITERATIONS = 2000;
export const MAX_PATHS_KEPT = 50;

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Normal estándar por Box-Muller. `1 - u` evita `log(0)`, que da -Infinity y
 * envenena el resto del camino con NaN.
 */
function normal(rnd) {
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Magnitud positiva con media `media` y desviación típica RELATIVA `disp`.
 *
 * Lognormal y no normal a propósito: una pérdida no puede ser negativa ni una
 * ganancia tampoco, y recortar una normal en cero desplaza la media y falsea
 * justo la cola que se quiere medir. La lognormal es positiva por construcción,
 * tiene la cola larga por la derecha que tienen los resultados reales, y los
 * parámetros están elegidos para que la media salga exactamente `media`.
 */
export function magnitud(media, disp, rnd) {
  if (!(disp > 0)) return media;
  const s2 = Math.log(1 + disp * disp);
  const mu = Math.log(media) - s2 / 2;
  return Math.exp(mu + Math.sqrt(s2) * normal(rnd));
}

/** El resultado en dinero de UNA operación, según el modo configurado. */
function resultadoOperacion(cfg, balance, rnd) {
  if (cfg.sample) {
    // Remuestreo del diario: se coge una operación real al azar, con reemplazo.
    return cfg.sample[Math.floor(rnd() * cfg.sample.length)];
  }
  const gana = rnd() < cfg.winRate / 100;
  if (cfg.sizing === 'percent') {
    // La base es el saldo vivo si se capitaliza, y el capital inicial si no.
    // Sin esto, "arriesgo el 1 %" significaba cosas distintas en cada camino.
    const base = cfg.compound ? balance : cfg.capital;
    const riesgo = base * cfg.riskPct / 100;
    return gana ? magnitud(riesgo * cfg.payoff, cfg.dispersion, rnd) : -magnitud(riesgo, cfg.dispersion, rnd);
  }
  return gana
    ? magnitud(cfg.avgWin, cfg.dispersion, rnd)
    : -magnitud(Math.abs(cfg.avgLoss), cfg.dispersion, rnd);
}

/** Un solo camino. Devuelve la curva, su drawdown y en qué operación se arruinó. */
export function runPath(cfg, rnd) {
  let balance = cfg.capital;
  let peak = balance;
  let maxDD = 0;
  let ruinedAt = null;
  const curve = [balance];

  for (let t = 0; t < cfg.trades; t++) {
    balance += resultadoOperacion(cfg, balance, rnd);

    // Suelo en cero y parada. Una cuenta a cero no vuelve: seguir operándola
    // era lo que producía saldos de −15.000 € y drawdowns del 242 %.
    if (balance <= 0) {
      balance = 0;
      ruinedAt = t + 1;
      curve.push(0);
      maxDD = 1;
      break;
    }

    curve.push(balance);
    if (balance > peak) peak = balance;
    const dd = peak > 0 ? (peak - balance) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  return { curve, finalBalance: balance, maxDrawdown: maxDD * 100, ruinedAt };
}

function percentil(ordenados, q) {
  if (!ordenados.length) return null;
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.round((ordenados.length - 1) * q)));
  return ordenados[i];
}

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Normaliza lo que llega de la interfaz. Devuelve `{ cfg, error }`: si falta un
 * dato o es incoherente, NO se simula y se dice por qué, en vez de devolver una
 * distribución construida sobre ceros.
 */
export function normalizeConfig(input = {}) {
  const capital = num(input.capital);
  if (capital === null || capital <= 0) return { cfg: null, error: 'capital' };

  const trades = Math.trunc(num(input.trades) ?? 0);
  if (trades <= 0) return { cfg: null, error: 'trades' };

  const iterations = Math.trunc(num(input.iterations) ?? DEFAULT_ITERATIONS);
  if (iterations <= 0) return { cfg: null, error: 'iterations' };

  const dispersion = Math.max(0, num(input.dispersion) ?? 0);
  const seed = Math.trunc(num(input.seed) ?? 1) >>> 0;

  // Remuestreo del diario: manda sobre cualquier parámetro tecleado.
  const sample = Array.isArray(input.sample)
    ? input.sample.map(num).filter((v) => v !== null)
    : null;
  if (sample && sample.length) {
    if (sample.every((v) => v === 0)) return { cfg: null, error: 'sample_flat' };
    return { cfg: { capital, trades, iterations, seed, dispersion: 0, sample, sizing: 'sample', compound: false }, error: null };
  }
  if (Array.isArray(input.sample)) return { cfg: null, error: 'sample_empty' };

  const winRate = num(input.winRate);
  if (winRate === null || winRate < 0 || winRate > 100) return { cfg: null, error: 'win_rate' };

  const sizing = input.sizing === 'percent' ? 'percent' : 'fixed';
  const compound = sizing === 'percent' && !!input.compound;

  if (sizing === 'percent') {
    const riskPct = num(input.riskPct);
    const payoff = num(input.payoff);
    if (riskPct === null || riskPct <= 0 || riskPct > 100) return { cfg: null, error: 'risk_pct' };
    if (payoff === null || payoff <= 0) return { cfg: null, error: 'payoff' };
    return { cfg: { capital, trades, iterations, seed, dispersion, winRate, sizing, compound, riskPct, payoff }, error: null };
  }

  const avgWin = num(input.avgWin);
  const avgLoss = num(input.avgLoss);
  if (avgWin === null || avgWin <= 0) return { cfg: null, error: 'avg_win' };
  if (avgLoss === null || avgLoss === 0) return { cfg: null, error: 'avg_loss' };
  return { cfg: { capital, trades, iterations, seed, dispersion, winRate, sizing, compound: false, avgWin, avgLoss }, error: null };
}

/**
 * La distribución completa.
 *
 * Cada camino lleva su propia semilla derivada de la general, así que uno
 * cualquiera se puede volver a ejecutar por separado y sale idéntico.
 */
export function runMonteCarlo(input) {
  const { cfg, error } = normalizeConfig(input);
  if (error) return { error, statistics: null, paths: [] };

  const finales = [];
  const drawdowns = [];
  const ruinas = [];
  const paths = [];

  for (let i = 0; i < cfg.iterations; i++) {
    const semilla = (cfg.seed + i * 2654435761) >>> 0;
    const r = runPath(cfg, makeRng(semilla));
    finales.push(r.finalBalance);
    drawdowns.push(r.maxDrawdown);
    if (r.ruinedAt !== null) ruinas.push(r.ruinedAt);
    if (paths.length < MAX_PATHS_KEPT) paths.push(r.curve);
  }

  const ordenados = [...finales].sort((a, b) => a - b);
  const ruinaOrdenada = [...ruinas].sort((a, b) => a - b);
  const n = cfg.iterations;

  return {
    error: null,
    seed: cfg.seed,
    paths,
    statistics: {
      initialCapital: cfg.capital,
      iterations: n,
      trades: cfg.trades,
      avgFinalBalance: media(finales),
      p5: percentil(ordenados, 0.05),
      p25: percentil(ordenados, 0.25),
      p50: percentil(ordenados, 0.50),
      p75: percentil(ordenados, 0.75),
      p95: percentil(ordenados, 0.95),
      /** Caminos que tocaron cero EN ALGÚN MOMENTO, no sólo al final. */
      riskOfRuin: (ruinas.length / n) * 100,
      /** En qué operación se arruinó la mitad de los que se arruinaron.
       *  `null` si no se arruinó ninguno: no es la operación cero, es que no aplica. */
      medianRuinTrade: ruinas.length ? percentil(ruinaOrdenada, 0.5) : null,
      avgMaxDrawdown: media(drawdowns),
      worstMaxDrawdown: drawdowns.length ? Math.max(...drawdowns) : null,
      profitProbability: (finales.filter((b) => b > cfg.capital).length / n) * 100,
    },
  };
}

export default runMonteCarlo;
