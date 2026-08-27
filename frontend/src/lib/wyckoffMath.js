/**
 * Lo único que en Wyckoff se puede contar.
 *
 * El módulo tenía 1.236 palabras y ninguna cifra, y eso es raro porque su
 * segunda ley —causa y efecto— es explícitamente cuantitativa: el texto ya
 * decía «se mide con recuentos de Punto y Figura» sin enseñar jamás la cuenta.
 * Aquí está, y con ella el otro número que el propio módulo promete y no da:
 * cuánto acierto exige el trade que recomienda.
 *
 * Nada de esto pretende ser una señal. Es la aritmética de un método que se
 * enseña en prosa, puesta donde se puede comprobar.
 */

/** Objetivo por recuento horizontal de Punto y Figura. */
export function objetivoPF({ columnas, caja, reversion, base }) {
  const n = [columnas, caja, reversion, base].map(Number);
  if (n.some((v) => !Number.isFinite(v))) return null;
  const [c, k, r, b] = n;
  if (c <= 0 || k <= 0 || r <= 0) return null;
  return b + c * k * r;
}

/** La «causa»: cuánto recorrido financia un rango, sin sumarle la base. */
export function causaPF({ columnas, caja, reversion }) {
  const o = objetivoPF({ columnas, caja, reversion, base: 0 });
  return o;
}

/**
 * Relación beneficio/riesgo de una operación con sus tres precios.
 *
 * Un stop en el precio de entrada NO da infinito: da `null`. El riesgo cero no
 * existe y devolver Infinity aquí acabaría pintándose como «∞ : 1», que es la
 * clase de cifra que hace que alguien doble el tamaño.
 */
export function relacionRR({ entrada, stop, objetivo }) {
  const e = Number(entrada); const s = Number(stop); const o = Number(objetivo);
  if (![e, s, o].every(Number.isFinite)) return null;
  const riesgo = Math.abs(e - s);
  if (riesgo === 0) return null;
  return Math.abs(o - e) / riesgo;
}

/**
 * Tres rangos de la misma anchura de caja y distinta duración.
 *
 * Es la ley de causa y efecto en una tabla: doblar el tiempo en el rango
 * doblada el recorrido que ese rango financia. Con caja de 1 y reversión de 3
 * —los ajustes de manual— la aritmética se sigue de cabeza.
 */
export const CUENTAS_PF = [
  { columnas: 10, caja: 1, reversion: 3, base: 40 },
  { columnas: 20, caja: 1, reversion: 3, base: 40 },
  { columnas: 40, caja: 1, reversion: 3, base: 40 },
];

/**
 * El trade que el propio módulo describe, con precios.
 *
 * `wyckoffHowToStep5` dice literalmente: entrar en el LPS, stop por debajo del
 * mínimo del Spring, objetivo la amplitud del rango proyectada desde la
 * rotura. Eso son tres precios y una resta, y hasta ahora no estaban.
 *
 * El rango es 40–50; el Spring perfora hasta 38,5; la entrada en el LPS es el
 * retroceso a 46 tras la SOS. Números redondos a propósito: la cuenta tiene
 * que poder rehacerse a mano.
 */
export const EJEMPLO_SPRING = {
  rangoBajo: 40,
  rangoAlto: 50,
  minimoSpring: 38.5,
  entrada: 46,
  stop: 38,
};

/** Objetivo del ejemplo: la amplitud del rango proyectada desde la rotura. */
export function objetivoRango({ rangoBajo, rangoAlto }) {
  const b = Number(rangoBajo); const a = Number(rangoAlto);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= b) return null;
  return a + (a - b);
}
