/**
 * deskMath.js — la aritmética de la mesa de cálculo.
 *
 * `lib/instruments.js` contesta a "dada una posición, ¿qué es?": nocional,
 * margen, exposición, liquidación. Es el espejo de `backend/instruments.py` y
 * no se toca desde aquí.
 *
 * Este módulo contesta a la pregunta **inversa**, que es la que se hace de
 * verdad delante de la pantalla: *dado mi capital y lo máximo que estoy
 * dispuesto a perder, ¿cuánto puedo comprar?* Y a las que vienen detrás: cuál
 * es el tamaño máximo que el margen me deja, cuál es el mínimo que el
 * instrumento permite, dónde me liquidan según el modo de margen, y cuánto
 * cambia todo eso al entrar o salir por tramos.
 *
 * Vive en el frontend y sólo en el frontend a propósito: son cálculos de
 * PLANIFICACIÓN, previos a que exista una operación. Nada de lo que sale de
 * aquí se almacena; lo que se guarda sigue saliendo del diario y lo sigue
 * recalculando el backend. Por eso no hay espejo en Python: no habría nada que
 * comprobar contra él.
 *
 * Reglas heredadas, sin excepción:
 *   · Lo que no se puede calcular es `null`, nunca 0. Un tamaño sin distancia
 *     de stop es indefinido; devolver 0 diría "no operes" cuando lo que pasa
 *     es que falta un dato.
 *   · El apalancamiento NO multiplica el P&L. Multiplica el margen y la
 *     cercanía de la liquidación.
 *   · Ningún número sale de aquí sin que se pueda decir de dónde viene: cada
 *     tope lleva su `source`, porque "tu tamaño máximo es 3,2 lotes" sin decir
 *     si lo limita el riesgo, el margen o la exposición no es una respuesta.
 *
 * Comprobado en `scripts/engine-check.js` (offline, en CI).
 */
import {
  DEFAULT_MAINTENANCE_MARGIN_RATE,
  MAX_EXPOSURE_MULTIPLE,
  liquidationPrice,
} from './instruments.js';

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pos = (v) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

// ─── El tope duro de riesgo ────────────────────────────────────────

/**
 * Riesgo máximo por operación, en % del capital. Por encima de esto la mesa
 * **no calcula**: devuelve el motivo y no un tamaño.
 *
 * No es una recomendación (esa es `RISK_ADVISED_PCT`, y es un aviso amarillo
 * que se puede ignorar). Es un tope: con 10 % por operación bastan siete
 * pérdidas seguidas para dejar la cuenta a la mitad, y siete seguidas le pasan
 * a cualquiera con una tasa de acierto del 50 % antes de las 200 operaciones.
 * Una herramienta que dimensiona esa posición sin decir nada está calculando
 * bien y ayudando mal.
 */
export const RISK_HARD_CAP_PCT = 10;

/** Por encima de esto se avisa, pero se calcula. Es el umbral de "esto es mucho". */
export const RISK_ADVISED_PCT = 2;

/**
 * El presupuesto de riesgo de la operación, y si la mesa puede seguir.
 *
 * Acepta las dos formas en que se dice lo mismo —"el 1 % de mi cuenta" y
 * "250 €"— porque quien opera con cuenta pequeña piensa en dinero y quien
 * opera con cuenta grande piensa en porcentaje, y convertir a mano entre las
 * dos es justo donde se cuela un cero de más.
 *
 * `blocked` es la respuesta a la petición de no dejar operar por encima del
 * tope: no hay tamaño, hay un motivo.
 */
export function riskBudget({ capital, riskPct, riskMoney, mode = 'pct' }) {
  const cap = pos(capital);
  const out = {
    amount: null, pct: null, capital: cap,
    blocked: false, reason: null, warn: false,
    capPct: RISK_HARD_CAP_PCT, advisedPct: RISK_ADVISED_PCT,
    maxAmount: cap === null ? null : cap * RISK_HARD_CAP_PCT / 100,
  };
  if (cap === null) {
    out.reason = 'no_capital';
    out.blocked = true;
    return out;
  }

  if (mode === 'money') {
    const money = pos(riskMoney);
    if (money === null) { out.reason = 'no_risk'; out.blocked = true; return out; }
    out.amount = money;
    out.pct = money / cap * 100;
  } else {
    const pct = pos(riskPct);
    if (pct === null) { out.reason = 'no_risk'; out.blocked = true; return out; }
    out.pct = pct;
    out.amount = cap * pct / 100;
  }

  if (out.pct > RISK_HARD_CAP_PCT) {
    out.blocked = true;
    out.reason = 'over_cap';
    return out;
  }
  out.warn = out.pct > RISK_ADVISED_PCT;
  return out;
}

// ─── Modo de margen ────────────────────────────────────────────────

/**
 * Qué modos de margen tiene sentido ofrecer para este producto.
 *
 * No es una preferencia de la interfaz: es cómo funciona la cuenta detrás.
 *   · Contado (acciones, cripto spot): no hay margen, no hay liquidación. Lo
 *     que pones es lo que puedes perder y ya está.
 *   · Opciones: el riesgo lo define la estructura, no un precio de
 *     liquidación. Una comprada arriesga la prima; una vendida desnuda tiene
 *     requisito de margen del emisor, que no es lo mismo que una liquidación
 *     por precio.
 *   · Futuros, forex y CFD: una sola bolsa de margen respalda todas las
 *     posiciones de la cuenta. Eso ES margen cruzado, y por eso es el valor por
 *     defecto. Aislado se ofrece como límite propio: responde a «¿dónde me
 *     quedaría sin margen si sólo respaldara esta posición con el suyo?», que
 *     es una forma legítima de dimensionar aunque el bróker no funcione así.
 *   · Perpetuos de cripto: es el único sitio donde el trader elige de verdad,
 *     y donde elegir cambia el precio de liquidación.
 *
 * De ahí que el selector aparezca o no según el producto: ofrecer "aislado o
 * cruzado" en una acción al contado es inventarse una decisión que no existe.
 */
export function marginModesFor(spec) {
  const product = spec?.product;
  if (product === 'crypto_perp') {
    return { modes: ['isolated', 'cross'], default: 'isolated', fixed: false, reasonKey: 'deskMarginWhyPerp' };
  }
  if (product === 'futures' || product === 'forex' || product === 'cfd') {
    // El bróker respalda todas las posiciones con una sola bolsa: eso es
    // cruzado, y por eso es el valor por defecto. Pero aislado sigue siendo una
    // pregunta legítima —«¿dónde me quedo sin margen si sólo respaldo esta
    // posición con el suyo?»— y bloquearlo dejaba al trader sin poder
    // dimensionar con ese criterio. Se ofrece, con el aviso de qué significa.
    return { modes: ['cross', 'isolated'], default: 'cross', fixed: false, reasonKey: 'deskMarginWhyCross' };
  }
  if (product === 'option') {
    return { modes: [], default: null, fixed: true, reasonKey: 'deskMarginWhyOption' };
  }
  return { modes: [], default: null, fixed: true, reasonKey: 'deskMarginWhyCash' };
}

/**
 * Liquidación a partir del colchón que respalda la posición.
 *
 * Una sola fórmula para los dos modos, porque los dos modos **son** la misma
 * fórmula con distinto colchón:
 *   · aislado  → colchón = el margen de esta posición (nocional / palanca)
 *   · cruzado  → colchón = todo el capital libre de la cuenta
 *
 * Y ahí está la diferencia que hay que entender antes de elegir: en aislado
 * pierdes la posición y conservas la cuenta; en cruzado la posición aguanta
 * mucho más porque se come el resto del capital para no morir — que es
 * exactamente lo que la hace peligrosa.
 *
 * `move` es la fracción adversa que agota el colchón menos lo que el bróker
 * retiene como mantenimiento. Es la misma construcción que
 * `liquidationPrice()` de `instruments.js` (con colchón = nocional/palanca sale
 * el mismo número, y `engine-check` lo fija), así que el aislado sigue teniendo
 * una única fuente de verdad.
 */
export function liquidationFromBuffer({ entry, side = 'long', buffer, notional, mmr = DEFAULT_MAINTENANCE_MARGIN_RATE }) {
  const e = pos(entry);
  const buf = num(buffer);
  const nom = pos(notional);
  if (e === null || buf === null || nom === null) return null;

  // Un largo sin apalancamiento efectivo no se liquida: la pérdida máxima es el
  // precio llegando a cero, y para entonces ya has perdido justo lo que pusiste.
  // El bróker no tiene nada que reclamar, así que no hay precio de liquidación.
  // En corto NO vale la misma guarda: la pérdida no tiene techo.
  if (side === 'long' && buf >= nom) return null;

  const move = buf / nom - (num(mmr) ?? DEFAULT_MAINTENANCE_MARGIN_RATE);
  // Colchón ya por debajo del mantenimiento: no hay "precio al que te liquidan",
  // estás liquidado.
  if (move <= 0) return null;

  const price = side === 'long' ? e * (1 - move) : e * (1 + move);
  return price > 0 ? price : null;
}

/**
 * El cuadro de liquidación completo para el modo elegido.
 *
 * Devuelve además `stopBeforeLiquidation`, que es la única lectura que importa
 * de verdad: si el stop está más lejos que la liquidación, el stop **no
 * existe** — te cierra el bróker antes, y al precio que él decida.
 */
export function liquidationView({
  entry, side = 'long', mode, notional, marginUsed, capital,
  mmr = DEFAULT_MAINTENANCE_MARGIN_RATE, sl,
}) {
  const out = {
    mode: mode || null, price: null, distancePct: null,
    buffer: null, bufferSource: null, stopBeforeLiquidation: null, mmr,
  };
  const e = pos(entry);
  const nom = pos(notional);
  if (e === null || nom === null || !mode) return out;

  if (mode === 'cross') {
    out.buffer = pos(capital);
    out.bufferSource = 'capital';
  } else {
    out.buffer = pos(marginUsed);
    out.bufferSource = 'margin';
  }
  if (out.buffer === null) return out;

  out.price = liquidationFromBuffer({ entry: e, side, buffer: out.buffer, notional: nom, mmr });
  if (out.price === null) return out;

  out.distancePct = Math.abs(out.price - e) / e * 100;
  const stop = num(sl);
  if (stop !== null) {
    out.stopBeforeLiquidation = side === 'long' ? stop > out.price : stop < out.price;
  }
  return out;
}

// ─── Del riesgo al tamaño ──────────────────────────────────────────

/** El escalón mínimo con el que se puede operar este producto. `null` = fraccionable. */
export function sizeStepFor(spec) {
  switch (spec?.sizing) {
    case 'shares': return 1;
    case 'contracts': return 1;
    case 'lots': return 0.01;   // el micro lote, expresado en lotes estándar
    default: return null;       // cripto y unidades sueltas: sin escalón fijo
  }
}

/** Redondea SIEMPRE hacia abajo al escalón: pasarse de tamaño es pasarse de riesgo. */
export function snapDown(quantity, step) {
  const q = num(quantity);
  if (q === null) return null;
  const s = pos(step);
  if (s === null) return q;
  // El epsilon absorbe el ruido de dividir en binario, y ese ruido CRECE con la
  // magnitud: en 3,9/1 sobra 1e-9, pero en 164.778.415,98/0,01 el error del
  // propio cociente ya vale 4e-6 y el redondeo se comía un escalón entero. Un
  // epsilon fijo aquí es un epsilon que sólo vale para números pequeños.
  const cociente = q / s;
  const eps = Math.max(1e-9, Math.abs(cociente) * 1e-15);
  const bruto = Math.floor(cociente + eps) * s;
  // `0,41000000000000003` no es un tamaño distinto de `0,41`: es basura binaria
  // de multiplicar el escalón. Se limpia con los decimales que tiene el propio
  // escalón —ni uno más, para no inventar precisión que el producto no permite—
  // porque esa cifra acaba copiada en la casilla del bróker.
  const dp = Math.max(0, Math.min(12, Math.ceil(-Math.log10(s))));
  return Number(bruto.toFixed(dp));
}

/**
 * El cálculo central: cuánto se puede comprar.
 *
 * Tres topes independientes, y **manda el más pequeño**:
 *
 *   1. **Riesgo** — presupuesto / (distancia al stop × tamaño de contrato).
 *      Es el que casi siempre gana y el que el trader cree que es el único.
 *   2. **Margen** — capital × palanca / (precio × tamaño de contrato). No
 *      puedes abrir lo que no puedes financiar, por muy pequeño que sea el
 *      stop. En contado la palanca es 1 y este tope es el que manda.
 *   3. **Exposición** — nocional / capital ≤ 10×, el mismo techo de sentido
 *      común que ya aplica el diario. Un stop de dos pips con la cuenta entera
 *      detrás pasa el filtro de riesgo y sigue siendo una barbaridad.
 *
 * `binding` dice cuál de los tres ha decidido, y ese dato es la mitad del
 * valor: "no puedes por margen" y "no puedes por riesgo" se arreglan de forma
 * distinta.
 */
export function maxSizes({
  entry, stopDistance, contractSize, riskAmount, capital, leverage,
  spec, maxExposureMultiple = MAX_EXPOSURE_MULTIPLE, step,
}) {
  const e = pos(entry);
  const csize = pos(contractSize);
  const cap = pos(capital);
  const out = {
    byRisk: null, byMargin: null, byExposure: null,
    quantity: null, binding: null, step: step ?? sizeStepFor(spec),
    unitValue: null,
  };
  if (e === null || csize === null) return out;

  // Lo que se mueve el P&L por cada unidad de precio y unidad de tamaño.
  out.unitValue = csize;

  const dist = pos(stopDistance);
  const budget = pos(riskAmount);
  if (dist !== null && budget !== null) out.byRisk = budget / (dist * csize);

  const usesLev = spec ? spec.usesLeverage : true;
  const lev = usesLev ? (pos(leverage) ?? 1) : 1;
  if (cap !== null) {
    out.byMargin = (cap * lev) / (e * csize);
    out.byExposure = (cap * maxExposureMultiple) / (e * csize);
  }

  const candidates = [
    ['risk', out.byRisk],
    ['margin', out.byMargin],
    ['exposure', out.byExposure],
  ].filter(([, v]) => v !== null && v > 0);
  if (!candidates.length) return out;

  const [binding, raw] = candidates.reduce((a, b) => (b[1] < a[1] ? b : a));
  out.binding = binding;
  out.quantity = snapDown(raw, out.step);
  // Redondear hacia abajo por debajo del escalón deja 0, y 0 no es un tamaño:
  // es "no te llega". Se dice así, no con un cero.
  if (out.quantity !== null && out.quantity <= 0) out.quantity = null;
  return out;
}

/**
 * La palanca que sale del margen que exige el mercado, POR CONTRATO.
 *
 * `suggestedLeverage()` de `instruments.js` la deduce del nocional, y eso en el
 * diario funciona —allí la cantidad ya está escrita— pero en la mesa es una
 * pescadilla: el nocional necesita la cantidad, la cantidad necesita la
 * palanca, y la palanca acababa cayendo a 1×.
 *
 * El síntoma no era sutil: con 10 000 € de cuenta, la mesa exigía 25 000 € de
 * margen por un micro E-mini y respondía «no te llega el capital ni para el
 * contrato más pequeño». El margen inicial de ese contrato son **1320 $**, o
 * sea unas 19×, y la operación cabe de sobra.
 *
 * El margen inicial de un futuro es por contrato y está en el catálogo, así que
 * no hace falta saber cuántos vas a comprar para conocerlo. `null` cuando el
 * símbolo no lo declara: ahí la palanca la pone el usuario y no nos la
 * inventamos.
 */
/**
 * Entrar por el otro lado: **del margen a los contratos**.
 *
 * La mesa dimensiona por riesgo —presupuesto entre distancia al stop— porque
 * es lo que protege la cuenta. Pero delante de la pantalla también se piensa
 * al revés: «quiero comprometer 2.000 € de margen, ¿cuántos contratos son?».
 * Y la cadena es la que es:
 *
 *     margen × apalancamiento = nocional
 *     nocional ÷ (precio × tamaño de contrato) = contratos
 *
 * Sin apalancamiento (contado, opciones) la palanca es 1 y el margen ES el
 * nocional, así que la misma fórmula sirve sin caso especial.
 *
 * Devuelve también el nocional y el margen REAL: al ajustar la cantidad al
 * escalón del instrumento (no se compran 1,7 contratos), el margen que acaba
 * comprometido no es exactamente el pedido, y decir el pedido sería mentir.
 */
export function quantityFromMargin({ margin, leverage, entry, contractSize, spec, step }) {
  const m = pos(margin);
  const e = pos(entry);
  const csize = pos(contractSize);
  const paso = step ?? sizeStepFor(spec);
  const out = { quantity: null, raw: null, notional: null, marginUsed: null, step: paso };
  if (m === null || e === null || csize === null) return out;

  const usesLev = spec ? spec.usesLeverage : true;
  const lev = usesLev ? (pos(leverage) ?? 1) : 1;

  out.raw = (m * lev) / (e * csize);
  const q = snapDown(out.raw, paso);
  // Por debajo del escalón no hay media unidad: no es cero, es "no te llega".
  if (q === null || q <= 0) return out;

  out.quantity = q;
  out.notional = q * e * csize;
  out.marginUsed = out.notional / lev;
  return out;
}

/**
 * Lo que ese tamaño arriesga de verdad, para poder contrastarlo con el tope.
 *
 * `null` sin stop, y es lo correcto: sin stop el riesgo no está definido: es
 * todo el capital. Devolver 0 diría "no arriesgas nada", que es la mentira
 * más cara que puede contar esta herramienta.
 */
export function riskForQuantity({ quantity, stopDistance, contractSize }) {
  const q = pos(quantity);
  const d = pos(stopDistance);
  const csize = pos(contractSize);
  if (q === null || d === null || csize === null) return null;
  return q * d * csize;
}

export function leverageFromMargin(spec, entry, contractSize) {
  if (!spec?.usesLeverage) return null;
  const margin = pos(spec.initialMargin);
  const e = pos(entry);
  const csize = pos(contractSize);
  if (margin === null || e === null || csize === null) return null;
  return Math.max(1, (e * csize) / margin);
}

/**
 * La palanca con la que dimensionar, en orden de autoridad: la que escribió el
 * trader, la que exige el mercado por contrato, la típica del producto, y 1×.
 *
 * Ese orden es el que importa: 1× sólo se usa cuando de verdad no se sabe nada,
 * no como valor por defecto que se cuela delante de un dato del catálogo.
 */
export function effectiveLeverage({ declared, spec, entry, contractSize }) {
  if (!spec?.usesLeverage) return 1;
  const typed = pos(declared);
  if (typed !== null) return typed;
  return leverageFromMargin(spec, entry, contractSize)
    ?? pos(spec.defaultLeverage)
    ?? 1;
}

/**
 * El tamaño MÍNIMO operable y lo que cuesta.
 *
 * Existe porque hay una respuesta que ninguna calculadora da y que cambia
 * decisiones: *con esta cuenta, este instrumento no se puede operar*. Un
 * contrato de E-mini con un stop de 20 puntos son 1000 $ de riesgo; en una
 * cuenta de 3000 $ eso es el 33 %, y no hay tamaño más pequeño que comprar.
 * Decirlo es más útil que dimensionar 0,33 contratos que nadie puede mandar.
 */
export function minTicket({ entry, stopDistance, contractSize, capital, leverage, spec, step }) {
  const e = pos(entry);
  const csize = pos(contractSize);
  const s = step ?? sizeStepFor(spec);
  const out = {
    quantity: null, notional: null, margin: null,
    risk: null, riskPct: null, affordable: null, tooRisky: null,
  };
  if (e === null || csize === null || s === null) return out;

  out.quantity = s;
  out.notional = e * csize * s;
  const usesLev = spec ? spec.usesLeverage : true;
  const lev = usesLev ? (pos(leverage) ?? 1) : 1;
  out.margin = out.notional / lev;

  const cap = pos(capital);
  if (cap !== null) out.affordable = out.margin <= cap;

  const dist = pos(stopDistance);
  if (dist !== null) {
    out.risk = dist * csize * s;
    if (cap !== null) {
      out.riskPct = out.risk / cap * 100;
      out.tooRisky = out.riskPct > RISK_HARD_CAP_PCT;
    }
  }
  return out;
}

// ─── Entradas y salidas por tramos ─────────────────────────────────

/**
 * Precio medio de entrada con varios tramos. Ponderado por tamaño, que es la
 * única media que significa algo: promediar los precios a secas da un número
 * que no coincide con ningún extracto.
 */
export function averageEntry(legs) {
  const rows = (legs || [])
    .map((l) => ({ price: num(l?.price), qty: pos(l?.qty) }))
    .filter((l) => l.price !== null && l.qty !== null);
  if (!rows.length) return { price: null, quantity: null, legs: 0 };

  const qty = rows.reduce((a, l) => a + l.qty, 0);
  const price = rows.reduce((a, l) => a + l.price * l.qty, 0) / qty;
  return { price, quantity: qty, legs: rows.length };
}

/**
 * El resultado de salir por tramos: qué se ha realizado, qué queda vivo y
 * dónde está el punto en el que la operación ya no puede perder.
 *
 * `breakEvenRemaining` es lo que se busca al hacer scale-out: tras cerrar el
 * primer tercio, ¿a qué precio puede irse el resto sin que la operación entre
 * en pérdidas? Se calcula sobre lo YA realizado, comisiones incluidas.
 */
export function partialExits({ entry, side = 'long', quantity, contractSize, exits, feesTotal = 0 }) {
  const e = pos(entry);
  const csize = pos(contractSize);
  const total = pos(quantity);
  const dir = side === 'short' ? -1 : 1;
  const out = {
    closedQty: 0, remainingQty: null, realized: null, realizedPct: null,
    avgExit: null, breakEvenRemaining: null, rows: [],
  };
  if (e === null || csize === null || total === null) return out;

  const rows = (exits || [])
    .map((x) => ({ price: num(x?.price), qty: pos(x?.qty) }))
    .filter((x) => x.price !== null && x.qty !== null);

  let closed = 0;
  let realized = 0;
  for (const r of rows) {
    // Nunca se cierra más de lo que hay abierto: un tramo que se pasa se
    // recorta a lo que queda, o el "restante" saldría negativo.
    const qty = Math.min(r.qty, total - closed);
    if (qty <= 0) continue;
    const pnl = (r.price - e) * dir * qty * csize;
    realized += pnl;
    closed += qty;
    out.rows.push({ price: r.price, qty, pnl, pctOfPosition: qty / total * 100 });
  }

  out.closedQty = closed;
  out.remainingQty = total - closed;
  if (closed > 0) {
    out.realized = realized - (num(feesTotal) || 0);
    out.realizedPct = closed / total * 100;
    out.avgExit = out.rows.reduce((a, r) => a + r.price * r.qty, 0) / closed;
  }

  // Con posición viva y algo ya realizado: el precio al que el resto empata.
  if (out.remainingQty > 0 && out.realized !== null) {
    const perUnit = out.realized / (out.remainingQty * csize);
    out.breakEvenRemaining = e - dir * perUnit;
  }
  return out;
}

/**
 * El precio de equilibrio de la posición completa: dónde deja de perder una vez
 * pagadas las comisiones. Sin comisiones es el precio de entrada, y decirlo así
 * evita el error de creer que el break-even está siempre en la entrada.
 */
export function breakEven({ entry, side = 'long', quantity, contractSize, feesTotal = 0 }) {
  const e = pos(entry);
  const csize = pos(contractSize);
  const qty = pos(quantity);
  const fees = num(feesTotal) || 0;
  if (e === null || csize === null || qty === null) return null;
  const perUnit = fees / (qty * csize);
  return side === 'short' ? e - perUnit : e + perUnit;
}

/**
 * Comisiones de ida y vuelta. Los brókeres las cobran de tres formas distintas
 * y mezclarlas es normal (un futuro paga por contrato, una acción paga un % del
 * nocional y casi todos tienen un mínimo).
 */
export function commissionTotal({ notional, quantity, perUnit = 0, pctNotional = 0, flat = 0, roundTurn = true }) {
  const nom = num(notional) || 0;
  const qty = num(quantity) || 0;
  const oneWay = qty * (num(perUnit) || 0)
    + nom * (num(pctNotional) || 0) / 100
    + (num(flat) || 0);
  if (oneWay <= 0) return 0;
  return roundTurn ? oneWay * 2 : oneWay;
}

/**
 * El valor de un movimiento de una unidad de precio: lo que gana o pierde la
 * posición por cada punto, pip o tick.
 *
 * Es el número que traduce "el stop está a 30 pips" a "me juego 300 €", y es
 * exactamente el paso que la calculadora de lotaje anterior daba por supuesto
 * con un 10 $/pip fijo que sólo vale para los pares contra el dólar.
 */
export function stepValues({ quantity, contractSize, spec }) {
  const qty = pos(quantity);
  const csize = pos(contractSize);
  const out = { perPoint: null, perPip: null, perTick: null };
  if (qty === null || csize === null) return out;

  const units = qty * csize;
  out.perPoint = units;
  if (spec?.pipSize) out.perPip = units * spec.pipSize;
  if (spec?.tickSize) out.perTick = units * spec.tickSize;
  return out;
}

/**
 * El apalancamiento que hace falta para sostener este tamaño con este capital.
 *
 * Va al revés que el campo de palanca del formulario: allí el trader declara
 * una X y sale un margen; aquí sale de la posición que el riesgo ha decidido,
 * que es como se descubre que un stop muy fino exige una palanca que la cuenta
 * no tiene. Menos de 1 no es apalancamiento: es no usarlo.
 */
/**
 * La divisa en la que cotiza el instrumento, deducida del símbolo.
 *
 * En forex el par lo dice entero: en `USDJPY` cotizas yenes, en `EURUSD`
 * dólares. Fuera de forex, el catálogo expresa márgenes y valores de tick en
 * dólares (es lo que publican CME, COMEX y los CFD que llevamos), así que la
 * cotizada es USD.
 */
export function quoteCurrency(spec) {
  const sym = String(spec?.symbol || '').toUpperCase();
  if (spec?.product === 'forex' && sym.length === 6) return sym.slice(3);
  return 'USD';
}

/**
 * Cuánto vale UNA unidad de la divisa cotizada en la divisa de la cuenta.
 *
 * Es la pieza que faltaba para que un valor de pip signifique algo. Un pip de
 * un lote estándar de USDJPY son 1.000 **yenes**; llamar a eso «1.000 $» es un
 * error de un orden de magnitud y medio, y es exactamente lo que hacía la vieja
 * calculadora de lotaje al dar 10 $ por pip para todo.
 *
 * Sólo hay tres casos, y el tercero se admite en voz alta:
 *   · Cotizas en la divisa de la cuenta (`EURUSD` con cuenta en dólares) → 1.
 *   · La cuenta es la divisa BASE (`USDJPY` con cuenta en dólares) → `1/precio`,
 *     que sale del propio precio sin pedir nada más.
 *   · Un cruce (`EURGBP`, `GBPJPY` con cuenta en dólares) → hace falta un tercer
 *     tipo de cambio que aquí no existe. Devuelve `null`, y `null` se pinta como
 *     una raya: preferimos no dar la cifra a darla mal.
 */
export function quoteToAccount({ spec, price, account = 'USD' }) {
  const cuenta = String(account || 'USD').toUpperCase();
  const cotizada = quoteCurrency(spec);
  if (cotizada === cuenta) return 1;

  const sym = String(spec?.symbol || '').toUpperCase();
  const base = spec?.product === 'forex' && sym.length === 6 ? sym.slice(0, 3) : null;
  const p = pos(price);
  if (base === cuenta && p !== null) return 1 / p;

  return null;
}

/**
 * El incremento más pequeño con el que cotiza el instrumento.
 *
 * En forex se llama pip y el catálogo lo guarda en `pipSize`; en un CFD de oro
 * o en un futuro se llama tick y lo guarda en `tickSize`. Es el mismo concepto
 * con dos nombres de mesa, y quien pregunta «¿cuánto vale un pip de oro?» está
 * preguntando por su tick de 0,01. Devolver `null` porque el campo se llama de
 * otra forma sería un tecnicismo, no una respuesta.
 */
export function quoteStep(spec) {
  return pos(spec?.pipSize) ?? pos(spec?.tickSize) ?? null;
}

/**
 * Lo que vale un pip (o un tick) de esta posición en la divisa de la cuenta.
 *
 * Devuelve las dos cifras a propósito: enseñar sólo la convertida esconde de
 * dónde sale, y enseñar sólo la cotizada no responde a la pregunta que se hizo.
 */
export function pipValue({ quantity, contractSize, spec, price, account = 'USD' }) {
  const qty = pos(quantity);
  const csize = pos(contractSize);
  const step = quoteStep(spec);
  const factor = quoteToAccount({ spec, price, account });
  const quote = qty !== null && csize !== null && step !== null ? qty * csize * step : null;
  return {
    step,
    quote,
    quoteCurrency: quoteCurrency(spec),
    factor,
    account: quote !== null && factor !== null ? quote * factor : null,
  };
}

/**
 * Dimensionar en lotes cuando la cuenta y el instrumento no cotizan igual.
 *
 * `maxSizes` trabaja entero en divisa COTIZADA: multiplica precios por tamaños
 * de contrato y le sale dinero del país del par. Eso está bien mientras las dos
 * divisas coincidan, y deja de estarlo en cuanto alguien dimensiona USDJPY con
 * una cuenta en dólares — que es la mitad del forex.
 *
 * Aquí la cuenta entra convertida a cotizada, se dimensiona con el motor de
 * siempre, y el resultado vuelve convertido a la cuenta. Un solo sitio con la
 * conversión, y el motor sin enterarse.
 *
 * Si el par es un cruce y no hay tercer tipo de cambio, NO se dimensiona: sale
 * `convertible: false` y todo a `null`. Dar lotes calculados con una divisa
 * equivocada es peor que no dar ninguno, porque parecen buenos.
 */
export function lotSizing({
  entry, stopDistance, contractSize, spec, capital, riskAmount, leverage, account = 'USD',
}) {
  const factor = quoteToAccount({ spec, price: entry, account });
  const out = {
    factor,
    convertible: factor !== null,
    lots: null, units: null, binding: null, step: sizeStepFor(spec),
    riskAccount: null, notionalAccount: null, marginAccount: null,
    pipAccount: null, pipPerLot: null,
  };
  if (factor === null) return out;

  // Sin distancia de stop NO hay dimensionado por riesgo, y devolver aquí el
  // máximo que permiten el margen o la exposición era una trampa: la cifra sale
  // perfectamente calculada, con su `binding` y todo, pero no responde a la
  // pregunta que se hizo —«¿cuánto compro arriesgando el 1 %?»— porque no hay
  // stop del que colgar ese 1 %. Las DOS calculadoras que usan esta función
  // cayeron en ello por separado: enseñaban el aviso de que falta el stop y
  // debajo un tamaño, que es peor que sólo el tamaño, porque el aviso hace
  // creer que la cifra ya lo tiene en cuenta.
  //
  // Quien quiera el máximo por margen o por exposición tiene `maxSizes`, que es
  // justo esa pregunta y se llama así.
  if (pos(stopDistance) === null) {
    out.binding = null;
    return out;
  }

  const cap = pos(capital);
  const riesgo = pos(riskAmount);
  const sizes = maxSizes({
    entry, stopDistance, contractSize, spec, leverage,
    riskAmount: riesgo === null ? null : riesgo / factor,
    capital: cap === null ? null : cap / factor,
  });
  out.binding = sizes.binding;
  out.step = sizes.step;

  // Lo que vale un pip de UN lote: la cifra que la vieja calculadora daba
  // siempre como 10 $, y que en oro son 1 $ y en USDJPY 6,37 $.
  out.pipPerLot = pipValue({ quantity: 1, contractSize, spec, price: entry, account }).account;

  const lots = sizes.quantity;
  if (lots === null) return out;

  const csize = pos(contractSize);
  const dist = pos(stopDistance);
  out.lots = lots;
  out.units = lots * csize;
  out.notionalAccount = pos(entry) * out.units * factor;
  const lev = (spec ? spec.usesLeverage : true) ? (pos(leverage) ?? 1) : 1;
  out.marginAccount = out.notionalAccount / lev;
  out.riskAccount = dist === null ? null : dist * out.units * factor;
  out.pipAccount = pipValue({ quantity: lots, contractSize, spec, price: entry, account }).account;
  return out;
}

export function requiredLeverage(notional, capital) {
  const nom = pos(notional);
  const cap = pos(capital);
  if (nom === null || cap === null) return null;
  return Math.max(1, nom / cap);
}

export { liquidationPrice, MAX_EXPOSURE_MULTIPLE, DEFAULT_MAINTENANCE_MARGIN_RATE };
