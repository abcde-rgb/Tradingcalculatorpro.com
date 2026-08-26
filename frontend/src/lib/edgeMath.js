/**
 * Ventaja, costes y rachas — la aritmética que decide si un sistema gana.
 *
 * Qué añade sobre lo que ya había
 * -------------------------------
 * `lib/projection.js` ya calcula la esperanza y el punto de equilibrio **de tu
 * diario**: necesita operaciones registradas. Esto es lo mismo antes de tener
 * diario, con tres números escritos a mano, y con dos cosas que allí no están:
 *
 *   · el efecto de los COSTES sobre el punto de equilibrio, y
 *   · la distribución de RACHAS de pérdidas que hay que esperar.
 *
 * `breakevenWinRate` NO se reescribe aquí: se importa. Dos copias de la misma
 * fórmula se separan el día que alguien corrige una.
 *
 * El modelo de costes
 * -------------------
 * El coste de ida y vuelta (spread + comisión + slippage) se expresa en
 * unidades de riesgo: `k = coste / riesgo_por_operación`. Si arriesgas 200 € por
 * operación y te cuesta 10 € entrar y salir, k = 0,05.
 *
 * Con eso, el ganador neto vale (R − k) y el perdedor neto (1 + k), y la
 * esperanza sale limpia:
 *
 *     E = W(R − k) − (1−W)(1 + k) = W·R − (1−W) − k
 *
 * El coste resta k a la esperanza **sea cual sea el acierto**. Y el equilibrio
 * se desplaza a:
 *
 *     W_equilibrio = (1 + k) / (1 + R)
 *
 * que con k = 0 vuelve a ser 1/(1+R), la de siempre. Es la comprobación que
 * ata este módulo al que ya existía.
 *
 * Por qué importa la FRECUENCIA
 * -----------------------------
 * El desplazamiento del equilibrio por operación no depende de cuántas hagas.
 * Lo que sí depende es cuánto capital se come el coste al mes:
 *
 *     arrastre = k × riesgo_% × operaciones_al_mes
 *
 * Un k de 0,05 con 1 % de riesgo son 0,05 % por operación: nada. Con 200
 * operaciones al mes son 10 puntos de capital al año en costes. Ésa es la razón
 * aritmética de que el scalping sea el estilo más frágil a los costes, y no
 * hace falta creerse a nadie para verla.
 */
// Con extensión a propósito: `engine-check.js` importa estos módulos con el
// resolutor de Node, que no completa la extensión como hace webpack.
import { breakevenWinRate } from './projection.js';

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Coste de ida y vuelta expresado en unidades de riesgo (R). */
export function costeEnR({ coste, riesgo }) {
  const c = num(coste);
  const r = num(riesgo);
  // Un riesgo de cero no define un múltiplo: es indefinido, no cero.
  if (c == null || r == null || r <= 0 || c < 0) return null;
  return c / r;
}

/**
 * Acierto mínimo para no perder dinero, contando costes.
 * Con k = 0 devuelve exactamente lo mismo que `breakevenWinRate`.
 */
export function equilibrioNeto(rr, k = 0) {
  const b = num(rr);
  const c = num(k) ?? 0;
  if (b == null || b <= 0 || c < 0) return null;
  const w = ((1 + c) / (1 + b)) * 100;
  // Por encima del 100 % no hay acierto posible: el coste se ha comido el
  // objetivo entero. Se devuelve el número real, no un tope maquillado — que
  // sea imposible es justo lo que hay que enseñar.
  return Math.round(w * 100) / 100;
}

/** Esperanza por operación en unidades de riesgo, ya con costes descontados. */
export function esperanzaNetaR(winPct, rr, k = 0) {
  const w = num(winPct);
  const b = num(rr);
  const c = num(k) ?? 0;
  if (w == null || b == null || b <= 0 || w < 0 || w > 100 || c < 0) return null;
  const p = w / 100;
  return p * b - (1 - p) - c;
}

/**
 * Cuánto capital se lleva el coste al mes, en puntos porcentuales.
 * Es el número que separa un estilo de baja frecuencia de uno de alta.
 */
export function arrastreMensual(k, riesgoPct, operacionesMes) {
  const c = num(k);
  const r = num(riesgoPct);
  const n = num(operacionesMes);
  if (c == null || r == null || n == null || c < 0 || r < 0 || n < 0) return null;
  return c * r * n;
}

/** Los R:R de referencia del sector, con su equilibrio bruto y neto. */
export const RR_REFERENCIA = [0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];

export function tablaEquilibrio(k = 0) {
  return RR_REFERENCIA.map((rr) => ({
    rr,
    bruto: breakevenWinRate(rr),
    neto: equilibrioNeto(rr, k),
  }));
}

// ─── Rachas ────────────────────────────────────────────────────────────────
//
// Tres preguntas distintas que se confunden constantemente:
//
//   1. ¿Qué probabilidad hay de perder k veces seguidas AQUÍ Y AHORA?  → q^k
//   2. ¿Cuál es la racha más larga que puedo esperar en N operaciones?
//   3. ¿Qué probabilidad hay de que en N operaciones ocurra ALGUNA racha de k?
//
// La 1 y la 3 se parecen y no se parecen: con 60 % de acierto, perder 5
// seguidas en un punto dado es el 1,02 % — pero que ocurra alguna vez en 200
// operaciones es más del 80 %. Confundirlas es lo que hace que un trader crea
// que su sistema se ha roto cuando lo que ha pasado es lo normal.

/** Probabilidad de una racha de `k` pérdidas empezando en un punto dado. */
export function probRachaEnUnPunto(winPct, k) {
  const w = num(winPct);
  const n = num(k);
  if (w == null || n == null || w < 0 || w > 100 || n < 1) return null;
  return Math.pow(1 - w / 100, Math.floor(n));
}

/**
 * Racha de pérdidas más larga que cabe esperar en N operaciones.
 * Aproximación clásica: log(N) / log(1/q).
 */
export function rachaMaximaEsperada(operaciones, winPct) {
  const N = num(operaciones);
  const w = num(winPct);
  if (N == null || w == null || N < 1 || w <= 0 || w >= 100) return null;
  const q = 1 - w / 100;
  return Math.log(N) / Math.log(1 / q);
}

/**
 * Probabilidad de que en `N` operaciones ocurra AL MENOS una racha de `k`
 * pérdidas seguidas.
 *
 * Recursión exacta sobre la probabilidad de que NO haya ninguna:
 *   A(n) = 1                                    para n < k
 *   A(k) = 1 − q^k
 *   A(n) = A(n−1) − (1−q)·q^k·A(n−k−1)          para n > k
 *
 * Exacta, no aproximada: con N grande la aproximación de Poisson se desvía
 * justo en la zona que interesa (probabilidades altas), y aquí el número se usa
 * para decidir si abandonar un sistema.
 */
export function probAlgunaRacha(operaciones, winPct, k) {
  const N = num(operaciones);
  const w = num(winPct);
  const K = num(k);
  if (N == null || w == null || K == null) return null;
  if (N < 1 || w < 0 || w > 100 || K < 1) return null;
  const n = Math.floor(N);
  const kk = Math.floor(K);
  if (kk > n) return 0;

  const q = 1 - w / 100;
  if (q === 0) return 0;
  if (q === 1) return 1;

  const A = new Array(n + 1).fill(1);
  const qk = Math.pow(q, kk);
  A[kk] = 1 - qk;
  for (let i = kk + 1; i <= n; i++) {
    A[i] = A[i - 1] - (1 - q) * qk * A[i - kk - 1];
  }
  const p = 1 - A[n];
  return Math.min(1, Math.max(0, p));
}

/** Tabla de rachas: para k = 2…10, la probabilidad de que ocurra en N operaciones. */
export function tablaRachas(operaciones, winPct, hasta = 10) {
  const filas = [];
  for (let k = 2; k <= hasta; k++) {
    filas.push({
      k,
      enUnPunto: probRachaEnUnPunto(winPct, k),
      enLaSerie: probAlgunaRacha(operaciones, winPct, k),
    });
  }
  return filas;
}
