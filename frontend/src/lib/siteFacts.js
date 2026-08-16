/**
 * Las cifras que la web dice de sí misma.
 *
 * Existe porque la portada llegó a anunciar «50+ activos» con 186 en el
 * catálogo y «99,9 % de tiempo activo» sin que nadie midiera nada — una por
 * defecto y otra inventada. Un número sobre el producto es una promesa: o sale
 * del código, o alguien tiene que responder por él.
 *
 * No se derivan en tiempo de ejecución a propósito. La portada se carga en el
 * primer pintado y no puede arrastrar el catálogo de estrategias entero para
 * escribir «66». Así que se escriben aquí y **`scripts/engine-check.js` las
 * comprueba contra su fuente real en CI**: el día que alguien añada una
 * calculadora, un activo o una estrategia y no toque este fichero, el PR falla.
 *
 * Si añades una cifra aquí, añade su comprobación allí. Sin comprobación no es
 * un dato, es un eslogan.
 */
export const SITE_FACTS = {
  /** Herramientas del banco de calculadoras · fuente: `CALC_NAV` en `pages/DashboardPage.jsx` */
  calculators: 14,
  /** Activos con precio y ficha · fuente: `ALL_ASSETS` en `lib/assets.js` */
  assets: 186,
  /** Estrategias de opciones · fuente: `STRATEGIES` en `data/mockData.js` */
  strategies: 66,
};

export default SITE_FACTS;
