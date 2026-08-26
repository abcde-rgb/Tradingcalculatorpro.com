/**
 * Las colas, con fecha y magnitud.
 *
 * `tail-risk` tenía 1.096 palabras y CERO cifras: el módulo donde el número
 * *es* el argumento quedaba como una advertencia genérica. Estos son los
 * eventos que lo sostienen.
 *
 * Reglas de este fichero:
 *  · Cierres, salvo donde diga otra cosa.
 *  · La magnitud es un NÚMERO, no una cadena: la pinta el componente con el
 *    locale del lector. Una tabla de cifras que enseña «−77,9 %» a un lector
 *    inglés está mal escrita aunque el dato sea correcto.
 *  · Donde hay `ref`, el porcentaje NO se escribe: se deriva de los dos
 *    precios. Así la cifra de la tabla y la del texto no pueden divergir, que
 *    es exactamente como se coló un «+352 %» que eran 353.
 *  · `k` es la clave i18n de la línea que explica qué se rompió; fecha, activo
 *    y cifra son universales.
 */

/** Sesiones bursátiles al año. Convención del sector para anualizar. */
export const SESIONES_ANIO = 252;

/** Años que lleva existiendo el universo, para la fila de 1987. */
export const EDAD_UNIVERSO_ANIOS = 13.8e9;

/**
 * Probabilidad de un movimiento de |x| desviaciones típicas o más (DOS colas).
 *
 * La CDF normal de `blackScholes.js` es la aproximación 7.1.26 de
 * Abramowitz-Stegun: error ABSOLUTO ~1,5e-7. Sirve para valorar una opción y
 * no sirve aquí, donde la respuesta a 7 σ es 2,6e-12 — cien mil veces más
 * pequeña que ese error. Esto es la fracción continua de la razón de Mills,
 * cuyo error es relativo: mantiene unos trece dígitos hasta 20 σ.
 */
export function colaNormal(x, terminos = 60) {
  if (!Number.isFinite(x) || x <= 0) return null;
  const phi = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  let f = 0;
  for (let k = terminos; k >= 1; k--) f = k / (x + f);
  return 2 * (phi / (x + f));
}

/** Años entre dos movimientos de |x| σ si el mundo fuera gaussiano. */
export function frecuenciaNormal(x, sesiones = SESIONES_ANIO) {
  const p = colaNormal(x);
  return p == null || p === 0 ? null : 1 / p / sesiones;
}

/**
 * Subida necesaria para recuperar una caída. `d` en tanto por uno.
 *
 * No es simétrica y por eso está aquí: perder el 50 % exige ganar el 100 %.
 * Una caída del 100 % no devuelve Infinity ni 0 — devuelve null, porque no
 * hay subida que la recupere y fingir un número sería mentir.
 */
export function subidaParaRecuperar(d) {
  if (!Number.isFinite(d) || d < 0 || d >= 1) return null;
  return d / (1 - d);
}

/** Caída en tanto por uno entre dos niveles observados. */
export function caidaDesde({ pico, suelo }) {
  if (!Number.isFinite(pico) || !Number.isFinite(suelo) || pico <= 0) return null;
  return (pico - suelo) / pico;
}

/** Filas de la tabla teórica. Sin la de 20, la de 1987 no tiene con qué compararse. */
export const SIGMAS = [3, 4, 5, 6, 7, 10, 20];

/** Caídas de la tabla de recuperación, en tanto por uno. */
export const CAIDAS = [0.10, 0.25, 0.50, 0.75, 0.80, 0.90, 0.95];

/**
 * Los diez eventos.
 *
 * `pct` es la variación en porcentaje (negativa si cae). Donde hay `ref` se
 * calcula de los niveles y `pct` no se escribe: `pctDe()` lo resuelve.
 */
export const EVENTOS_COLA = [
  { id: 'lunesNegro',  activo: 'S&P 500',          cuando: '19-10-1987',         pct: -20.47, dec: 2, k: 'tailEvBlackMonday' },
  { id: 'ltcm',        activo: 'LTCM',             cuando: '1998',               ref: { pico: 4700, suelo: 400 },       k: 'tailEvLtcm' },
  { id: 'puntocom',    activo: 'Nasdaq Composite', cuando: '2000 → 2002',        ref: { pico: 5048.62, suelo: 1114.11 }, k: 'tailEvDotcom' },
  { id: 'gfc',         activo: 'S&P 500',          cuando: '2007 → 2009',        ref: { pico: 1565.15, suelo: 676.53 },  k: 'tailEvGfc' },
  { id: 'franco',      activo: 'EUR/CHF',          cuando: '15-01-2015',         pct: -30,    k: 'tailEvChf' },
  { id: 'volmageddon', activo: 'VIX / XIV',        cuando: '05-02-2018',         pct: 115.6,  k: 'tailEvVolmageddon' },
  { id: 'covid',       activo: 'S&P 500',          cuando: '19-02 → 23-03-2020', ref: { pico: 3386.15, suelo: 2237.40 }, k: 'tailEvCovid' },
  { id: 'niquel',      activo: 'Níquel (LME)',     cuando: '07/08-03-2022',      pct: 250,    k: 'tailEvNickel' },
  { id: 'nikkei',      activo: 'Nikkei 225',       cuando: '1989 → 2003',        ref: { pico: 38915.87, suelo: 7603.76 }, k: 'tailEvNikkei' },
  { id: 'bitcoin',     activo: 'Bitcoin',          cuando: '2017 → 2018',        ref: { pico: 19783, suelo: 3122 },      k: 'tailEvBitcoin' },
];

/** La variación de un evento, venga escrita o derivada de sus dos niveles. */
export function pctDe(evento) {
  if (evento.ref) {
    const d = caidaDesde(evento.ref);
    return d == null ? null : -d * 100;
  }
  return Number.isFinite(evento.pct) ? evento.pct : null;
}
