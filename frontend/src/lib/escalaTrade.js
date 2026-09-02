/**
 * Lo que comparten la regleta y el calibre: leer un campo de precio y decidir
 * cuántos decimales hay que enseñar.
 *
 * Sin dependencias a propósito. `scripts/engine-check.js` lo importa con un
 * `node` pelado, y `lib/calibreGeo.js` también, así que nada de `clsx` ni de
 * nada que arrastre el bundler.
 */

/**
 * Lo que hay en un campo de precio, o NaN.
 *
 * `Number('')` es 0 y `Number(null)` también, así que un campo vacío se
 * convierte en «precio 0» y las escalas se lo creen: la regleta y el calibre
 * pintaban una medida perfectamente verosímil, con objetivos negativos, en
 * cuanto alguien borraba la entrada. `parseFloat` devuelve NaN, que es lo que
 * un campo vacío significa de verdad.
 */
export function numeroTecleado(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Cuántos decimales necesita una escala cuya unidad es `d`.
 *
 * Dos decimales fijos valen para el S&P y mienten en divisas: un EURUSD con la
 * entrada en 1,0845 y el stop en 1,0820 tiene 1R = 0,0025, que redondeado a dos
 * decimales es **0**. La escala enseñaba «1R = 0» y las cinco marcas repetían
 * «1,08» — una medida que dice cero cuando no es cero es peor que no enseñar
 * ninguna.
 *
 * Se piden dos cifras significativas de la unidad, con suelo en 2 (los precios
 * se leen con céntimos) y techo en 8 (más allá es ruido de coma flotante).
 */
export function decimalesUtiles(d) {
  if (!Number.isFinite(d) || d <= 0) return 2;
  return Math.min(8, Math.max(2, 1 - Math.floor(Math.log10(d))));
}

/** Un precio de la escala, con la precisión que la escala pide. */
export function formatearEnEscala(n, locale, decimales) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
