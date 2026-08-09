/**
 * Quién gana cuando el mismo ajuste existe en dos sitios: este navegador y la
 * cuenta.
 *
 * Vive aparte de `cloudPrefs.js` y sin una sola importación a propósito. Es la
 * única parte de la sincronización con reglas que merecen prueba, y así se
 * comprueba sin React, sin navegador y sin red (`scripts/engine-check.js`).
 *
 * Las reglas, en orden:
 *
 *   1. Gana el más reciente, ajuste por ajuste. Con una única fecha por
 *      documento, cambiar el tema en el ordenador borraría los setups escritos
 *      en el móvil diez minutos antes.
 *   2. Un ajuste sin fecha local nunca es una preferencia: es el valor por
 *      defecto. No se sube — subirlo lo convertiría en una elección que el
 *      usuario no ha hecho, y a partir de ahí ganaría a lo que sí eligió en
 *      otro sitio.
 *   3. Si el `localStorage` es de OTRA cuenta, no compite. Dos cuentas en el
 *      mismo navegador es lo que ya rompió el diario legado; aquí, además de
 *      perder, lo que la cuenta nueva no tenga vuelve a su valor por defecto,
 *      porque quedarse enseñando los setups del anterior es peor que empezar
 *      vacío.
 */

/** Ni una fecha: el ajuste está en su valor por defecto. */
const NO_STAMP = 0;
/** Lo que no puede ganar a nada, ni siquiera a la ausencia de dato. */
const CANNOT_WIN = -1;

/**
 * @param {string[]} names            ajustes a considerar
 * @param {Object} localAt            { ajuste: fecha } de este navegador
 * @param {Object} localValues        { ajuste: valor } de este navegador
 * @param {Object} remoteSlices       { ajuste: { at, value } } tal cual vino del servidor
 * @param {Object} [options]
 * @param {boolean} [options.foreign]    el localStorage es de otra cuenta
 * @param {Object}  [options.resettable] { ajuste: bool } cuáles vuelven al valor por defecto
 * @returns {{apply: Object, reset: string[], stamps: Object, push: Object}}
 */
export function planMerge(names, localAt, localValues, remoteSlices, options) {
  const foreign = Boolean(options && options.foreign);
  const resettable = (options && options.resettable) || {};
  const at = localAt || {};
  const values = localValues || {};
  const remote = remoteSlices || {};

  const apply = {};    // ajustes que hay que escribir en este navegador
  const reset = [];    // ajustes que hay que devolver a su valor por defecto
  const stamps = {};   // las fechas que quedan registradas aquí
  const push = {};     // el documento que hay que dejar en la cuenta

  for (const name of names || []) {
    const r = remote[name];
    const hasRemote = Boolean(r) && typeof r === 'object' && 'value' in r;
    const remoteAt = hasRemote && Number.isFinite(r.at) ? r.at : CANNOT_WIN;
    const localAtName = foreign
      ? CANNOT_WIN
      : (Number.isFinite(at[name]) ? at[name] : NO_STAMP);

    if (hasRemote && remoteAt >= localAtName) {
      // Empate → gana la cuenta. Da igual cuál se elija mientras sea siempre la
      // misma: así conciliar dos veces seguidas no cambia nada.
      apply[name] = r.value;
      stamps[name] = remoteAt;
      push[name] = { at: remoteAt, value: r.value };
    } else if (!hasRemote && foreign) {
      if (resettable[name]) reset.push(name);
    } else if (localAtName > NO_STAMP) {
      stamps[name] = localAtName;
      push[name] = { at: localAtName, value: values[name] };
    }
  }

  return { apply, reset, stamps, push };
}
