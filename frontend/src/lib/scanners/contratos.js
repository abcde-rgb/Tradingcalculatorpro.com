/**
 * Contratos canónicos de los escáneres — docs/BRIEF-ESCANERES.md §3.
 *
 * ¿Por qué `.js` con JSDoc y no `types.ts`, como pedía la entrega 1 de la
 * Fase 1? Porque este frontend **no tiene TypeScript**: ni dependencia, ni
 * `tsconfig.json`, ni un solo fichero `.ts`. Añadirlo por un módulo sería
 * meter una cadena de herramientas entera de rebote, y sobre todo:
 *
 *   **una interfaz de TypeScript desaparece en tiempo de ejecución**, y es
 *   justo ahí donde R1 tiene que morder. Un `Signal` sin `provenance` no
 *   puede colarse en pantalla porque el tipo lo prohibía en el editor; tiene
 *   que reventar cuando alguien lo construya mal.
 *
 * Así que los contratos van como tipos JSDoc —que el editor sí comprueba— y
 * ADEMÁS como validadores que se ejecutan. Se gana lo que TypeScript daba y
 * se gana lo que no daba.
 *
 * Todos los detectores consumen SOLO estos cuatro tipos de dato.
 */

/**
 * Procedencia de todo valor que sale por pantalla. Sin esto no se pinta nada.
 * @typedef {'live'|'delayed'|'derived'|'estimated'|'unavailable'} Procedencia
 */
export const PROCEDENCIA = Object.freeze({
  VIVO: 'live',            // del stream, ahora mismo
  DIFERIDO: 'delayed',     // real, con retardo declarado (FINRA, CFTC, 13F)
  DERIVADO: 'derived',     // calculado a partir de valores medidos
  ESTIMADO: 'estimated',   // descansa sobre una convención declarada (p. ej. el signo del dealer en GEX)
  NO_DISPONIBLE: 'unavailable',
});
const PROCEDENCIAS = Object.freeze(Object.values(PROCEDENCIA));

/** Veredictos de evidencia. El del §3: no es decorativo. */
export const VEREDICTO = Object.freeze({
  SOLIDO: 'Sólido', MIXTO: 'Mixto', SIN_BASE: 'Sin base', REFUTADO: 'Refutado',
});
const VEREDICTOS = Object.freeze(Object.values(VEREDICTO));

/**
 * @typedef {Object} Tick
 * @property {number} ts            epoch ms
 * @property {number} price
 * @property {number} size
 * @property {'buy'|'sell'|'unknown'} side      'unknown' si no hay flag de agresor
 * @property {'exchange'|'lee-ready'|'tick-rule'|'bvc'} sideMethod
 * @property {boolean} isBlock      tamaño > percentil 99 móvil
 */

/**
 * @typedef {Object} BookSnapshot
 * @property {number} ts
 * @property {Float64Array} bids    [precio0, size0, precio1, size1, …]
 * @property {Float64Array} asks
 * @property {number} seq           para detectar huecos de secuencia
 */

/**
 * @typedef {Object} Bar
 * @property {number} ts @property {number} open @property {number} high
 * @property {number} low @property {number} close @property {number} volume
 * @property {number} buyVolume     NaN si no se puede clasificar — NUNCA 0
 * @property {number} sellVolume    NaN si no se puede clasificar — NUNCA 0
 * @property {number} trades @property {number} vwap
 */

/**
 * @typedef {Object} Positioning
 * @property {number} [openInterest] @property {number} [fundingRate]
 * @property {{long:number, short:number}} [liquidations]
 * @property {number} [cotNetPct]        CFTC, semanal
 * @property {number} [darkPoolRatio]    FINRA ATS, semanal
 * @property {number} asOf               OBLIGATORIO: momento REAL del dato, no el de la petición
 */

/**
 * @typedef {Object} Signal
 * @property {string} id @property {1|2|3|4|5|6} scanner @property {string} symbol
 * @property {string} timeframe @property {number} ts
 * @property {number} score                       0-100, por percentil móvil
 * @property {'up'|'down'|'neutral'} direction
 * @property {{name:string, value:number, unit:string, percentile:number}} measurement
 * @property {{verdict:string, refs:string[]}} evidence
 * @property {Procedencia} provenance
 * @property {number} [pValue] @property {number} [qValue]
 * @property {string} explain                     una frase, en español, sin jerga
 */

/**
 * Medición sin valor: NO es cero.
 *
 * Regla 2 de honestidad numérica del repo y R1 del brief. Un R sin stop es
 * indefinido; como cero arrastra la media. Un OFI sin eventos de libro no
 * vale 0: no existe todavía.
 * @param {string} motivo qué falta, en español y para leer
 */
export function sinDato(motivo) {
  if (!motivo) throw new Error('sinDato() exige decir QUÉ falta: un hueco sin motivo no se puede enseñar');
  return { value: null, provenance: PROCEDENCIA.NO_DISPONIBLE, reason: motivo };
}

/**
 * Comprueba un `Signal` antes de que llegue a la interfaz.
 *
 * Devuelve la lista de incumplimientos, vacía si está bien. No lanza: quien
 * llama decide si romper (desarrollo) o descartar la señal y registrarlo
 * (producción). Lo que NO puede pasar es pintarla igualmente.
 * @param {Signal} s
 * @returns {string[]}
 */
export function fallosDeSignal(s) {
  const f = [];
  if (!s || typeof s !== 'object') return ['la señal no es un objeto'];
  if (!s.id) f.push('sin id');
  if (![1, 2, 3, 4, 5, 6].includes(s.scanner)) f.push('scanner fuera de 1-6');
  if (!s.symbol) f.push('sin símbolo');
  if (!Number.isFinite(s.ts)) f.push('ts no es un número');
  if (!PROCEDENCIAS.includes(s.provenance)) f.push(`procedencia inválida: ${String(s.provenance)}`);
  if (!['up', 'down', 'neutral'].includes(s.direction)) f.push('dirección inválida');
  if (!Number.isFinite(s.score) || s.score < 0 || s.score > 100) f.push('score fuera de 0-100');
  if (!s.evidence || !VEREDICTOS.includes(s.evidence.verdict)) f.push('sin veredicto de evidencia válido');
  if (!s.evidence || !Array.isArray(s.evidence.refs)) f.push('las referencias no son una lista');
  if (!s.explain) f.push('sin explicación en una frase');
  if (!s.measurement || typeof s.measurement.name !== 'string') f.push('sin medición con nombre');

  // Lo que separa esto de una interfaz de TypeScript: coherencia, no forma.
  if (s.provenance === PROCEDENCIA.NO_DISPONIBLE
      && s.measurement && s.measurement.value !== null && s.measurement.value !== undefined) {
    f.push('procedencia «no disponible» con un valor dentro: o hay dato o no lo hay');
  }
  if (Number.isFinite(s.pValue) && !Number.isFinite(s.qValue)) {
    // §8.1: un p<0,05 entre miles de pruebas no significa nada sin corregir.
    f.push('publica un valor p sin su q corregido por Benjamini-Hochberg');
  }
  if (Number.isFinite(s.qValue) && (s.qValue < 0 || s.qValue > 1)) f.push('q fuera de 0-1');
  return f;
}

/** ¿Se puede pintar esta señal? */
export function esSignalValida(s) { return fallosDeSignal(s).length === 0; }
