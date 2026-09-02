/**
 * La geometría del calibre — la regleta doblada en arco.
 *
 * Vive aparte del componente (`components/ui/calibre.jsx`) por una razón
 * práctica: aquí no hay JSX, así que `scripts/engine-check.js` puede importarlo
 * y comprobar la escala sin navegador ni framework de test. Un dibujo que
 * codifica riesgo es un motor de cifras como cualquier otro; que salga por un
 * `<path>` en vez de por un `<span>` no lo exime.
 *
 * ## La escala es lineal en R, y eso es la promesa
 *
 * El arco NO reparte las marcas «a ojo». La escala útil va de `F_STOP` a
 * `F_ULTIMO` y cubre `nObjetivos + 1` unidades de R, porque el stop *es* −1R:
 * no es un punto suelto que quede bonito antes de la entrada. De ahí sale
 * `paso`, y con él la fracción de cada marca: `F_STOP + (R + 1) · paso`.
 *
 * La entrada, por tanto, NO es una constante: flota según cuántos objetivos se
 * pidan. Fijarla y repartir sólo los objetivos —que fue el primer intento—
 * mandaba el stop fuera de la esfera en cuanto se pedían menos de tres
 * (con uno, a la fracción −0,38).
 *
 * Consecuencia medible: el arco rojo (entrada→stop) y cada tramo verde entre
 * objetivos consecutivos miden EXACTAMENTE lo mismo sobre la esfera. La
 * longitud del trazo es la unidad de riesgo. Si alguien estima mirando el
 * dibujo en vez de leyendo las cifras, el dibujo no le miente — que es el
 * único motivo por el que un gráfico de riesgo merece existir.
 *
 * Con los tres objetivos por defecto sale la esfera del ejemplar
 * `docs/muestras/portadas/` (II · El calibre): stop 0,06 · entrada 0,28 ·
 * 1R 0,50 · 2R 0,72 · 3R 0,94.
 */

import { numeroTecleado } from './escalaTrade.js';

/** Lienzo. El centro va abajo: la esfera es media luna, no un círculo. */
export const VB = { w: 520, h: 250, cx: 260, cy: 214, r: 168 };

export const F_INI = 0.02;       // dónde arranca el filete del arco
export const F_FIN = 0.98;       // dónde termina
export const F_STOP = 0.06;      // el stop, extremo izquierdo de la escala útil
export const F_ULTIMO = 0.94;    // el objetivo más lejano, extremo derecho
export const PASO_TICK = 0.02;   // una marca menor cada 2 % de la media vuelta

/** Objetivos por defecto. Constante de módulo: un literal en los props
 *  cambiaría de identidad en cada render y reventaría el `useMemo`. */
export const OBJETIVOS_POR_DEFECTO = [1, 2, 3];

/** Fracción de media vuelta → ángulo en radianes (0 = izquierda, 1 = derecha). */
export const anguloRad = (f) => ((180 - 180 * f) * Math.PI) / 180;

/** Fracción → punto del lienzo, opcionalmente a otro radio. */
export function punto(f, r = VB.r) {
  const a = anguloRad(f);
  return [VB.cx + r * Math.cos(a), VB.cy - r * Math.sin(a)];
}

/** Camino SVG del arco menor de `a` a `b` (a < b), en fracciones. */
export function arco(a, b) {
  const [x1, y1] = punto(a);
  const [x2, y2] = punto(b);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${VB.r} ${VB.r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** El borde de marcas. Cada quinta —cada 10 % de la vuelta— es alta. */
export function ticksCalibre() {
  const out = [];
  for (let i = 0; F_INI + i * PASO_TICK <= F_FIN + 1e-9; i += 1) {
    const f = F_INI + i * PASO_TICK;
    const alto = Math.abs((f * 100) % 10) < 0.5;
    const [x1, y1] = punto(f);
    const [x2, y2] = punto(f, VB.r - (alto ? 12 : 6));
    out.push({ f, alto, x1, y1, x2, y2 });
  }
  return out;
}

/**
 * Escala completa a partir de lo que el usuario ha tecleado.
 *
 * @returns {null|{e:number,s:number,d:number,dir:1|-1,paso:number,
 *                 fStop:number,fEntrada:number,fUlt:number,
 *                 marcas:{clave:string,r:number,valor:number,f:number}[]}}
 *   `null` cuando no hay distancia entrada–stop: sin R no hay nada que medir, y
 *   más vale no pintar una esfera que sugiera una precisión que no existe.
 */
export function escalaCalibre({ entry, stop, objetivos = OBJETIVOS_POR_DEFECTO } = {}) {
  const e = numeroTecleado(entry);
  const s = numeroTecleado(stop);
  const d = Math.abs(e - s);
  if (!Number.isFinite(d) || d <= 0) return null;

  const ns = [...new Set((objetivos || []).map(numeroTecleado))]
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!ns.length) return null;

  const dir = e > s ? 1 : -1;              // largo si la entrada va sobre el stop
  // La escala cubre del stop (−1R) al último objetivo: nObjetivos + 1 unidades.
  const paso = (F_ULTIMO - F_STOP) / (ns[ns.length - 1] + 1);
  const f = (r) => F_STOP + (r + 1) * paso;

  const marcas = [
    { clave: 'stop', r: -1, valor: s, f: f(-1) },
    { clave: 'entrada', r: 0, valor: e, f: f(0) },
    ...ns.map((n) => ({ clave: `r${n}`, r: n, valor: e + dir * n * d, f: f(n) })),
  ];

  return {
    e, s, d, dir, paso,
    fStop: f(-1), fEntrada: f(0), fUlt: f(ns[ns.length - 1]),
    marcas,
  };
}
