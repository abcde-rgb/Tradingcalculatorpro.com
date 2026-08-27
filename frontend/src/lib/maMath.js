/**
 * Cuánto van por detrás las medias móviles. En barras y en precio.
 *
 * El módulo dice dos veces que «van por detrás del precio» y no dice nunca
 * cuánto, que es la única parte que se puede calcular exactamente. Estas son
 * las tres cuentas, y ninguna necesita datos de mercado: salen de la
 * definición del indicador.
 *
 * Las dos creencias que la aritmética desmonta:
 *
 *  1. «La EMA reacciona antes que la SMA». Con el alfa estándar 2/(N+1) las
 *     dos tienen el MISMO centro de masa, (N−1)/2 — de hecho ese alfa se
 *     eligió justamente para que coincidieran. Lo que cambia es el reparto
 *     del peso y que la EMA nunca olvida del todo, no el retardo medio.
 *  2. «El cruce dorado avisa del cambio de tendencia». Una SMA de 200 va, en
 *     media, 99,5 barras por detrás. En un gráfico diario son cinco meses.
 */

/** Periodos de manual, los que aparecen en cualquier plataforma. */
export const PERIODOS_MA = [9, 20, 50, 200];

/**
 * Retardo medio de una SMA de N periodos, en barras.
 *
 * Es el centro de masa de sus pesos: N pesos iguales repartidos entre 0 y
 * N−1 barras de antigüedad promedian (N−1)/2.
 */
export function retardoSMA(n) {
  const N = Number(n);
  if (!Number.isFinite(N) || N < 1) return null;
  return (N - 1) / 2;
}

/** El alfa estándar de una EMA de N periodos. */
export function alfaEMA(n) {
  const N = Number(n);
  if (!Number.isFinite(N) || N < 1) return null;
  return 2 / (N + 1);
}

/** Centro de masa de una EMA con ese alfa, en barras: (1−α)/α. */
export function centroMasaEMA(alfa) {
  const a = Number(alfa);
  if (!Number.isFinite(a) || a <= 0 || a > 1) return null;
  return (1 - a) / a;
}

/**
 * Qué fracción de un salto del precio ha absorbido una EMA tras N barras.
 *
 * Tiende a 1 − e⁻² ≈ 86,5 % para cualquier periodo, y NUNCA llega a 1: una
 * EMA no olvida, sólo pesa menos. La SMA es lo contrario — a las N barras ha
 * absorbido el salto entero y del anterior no queda nada.
 */
export function absorbidoTrasN(n) {
  const N = Number(n);
  const a = alfaEMA(N);
  if (a == null) return null;
  return 1 - (1 - a) ** N;
}

/**
 * El retardo traducido a precio, sobre una tendencia de pendiente constante.
 *
 * En una recta de pendiente `m` por barra, la SMA de N va exactamente
 * m·(N−1)/2 por debajo del precio. No es una aproximación: es la media de una
 * progresión aritmética.
 */
export function desfaseEnPrecio({ pendiente, n }) {
  const m = Number(pendiente);
  const r = retardoSMA(n);
  if (!Number.isFinite(m) || r == null) return null;
  return m * r;
}
