/**
 * Mecánica de margen cruzado: equity, margen usado, margin level, stop-out y
 * viabilidad de cada tramo de una escalera de entradas.
 *
 * Por qué existe este archivo aparte de `deskMath.js` y de `instruments.js`:
 *
 * `instruments.js` tiene `liquidationPrice(entry, side, leverage, mmr)`, que
 * resuelve `1/lev − mmr` sobre una posición sola. Eso es MARGEN AISLADO: el
 * único colateral de la operación es su propio margen, y el resto de la cuenta
 * no la sostiene ni la hunde. `deskMath.js` dimensiona UNA orden antes de
 * mandarla. Ninguno de los dos contesta las preguntas del cruzado:
 *
 *   · el stop-out no depende del margen de una posición sino de
 *     `equity / margen_usado` de TODA la cuenta;
 *   · el margen de un CFD se RECALCULA con el precio, no se congela en la
 *     entrada, así que el umbral se mueve mientras te acercas a él;
 *   · y la pregunta que ninguna calculadora del mercado responde no es «¿dónde
 *     me liquidan?» sino «¿me deja el bróker abrir el SIGUIENTE tramo?». Casi
 *     siempre la respuesta es no, y el plan muere ahí, no en el stop-out.
 *
 * Todo lo de aquí son funciones puras. Sin React, sin formato, sin i18n.
 * Comprobado con cifras de referencia en `scripts/engine-check.js`.
 *
 * Honestidad numérica (CLAUDE.md § reglas): lo que no se puede calcular sale
 * `null`, nunca `0`. Un margin level sin margen usado es infinito, no cero; un
 * colchón sin precio de disparo es indefinido, no «pegado». Un `0` ahí se lee
 * como una cuenta muerta y es exactamente al revés.
 */

/** Modelos de cálculo de margen cuando hay posiciones en ambas direcciones. */
export const MARGIN_MODELS = ['net', 'max', 'sum'];

/** Umbrales por defecto. Cada bróker pone los suyos; son un punto de partida. */
export const DEFAULT_MARGIN_CALL_PCT = 100;
export const DEFAULT_STOP_OUT_PCT = 50;

/** Tope de la búsqueda de `maxLots`. Un lote es 100 oz de oro: 1e6 lotes es
 *  absurdo por varios órdenes de magnitud y corta cualquier bucle degenerado. */
const MAX_LOTS_CAP = 1e6;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const dirOf = (side) => ((side || 'long') === 'short' ? -1 : 1);

/** Un precio utilizable: finito y estrictamente positivo. */
const price0 = (v) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

/**
 * Exposición firmada en unidades del subyacente.
 * Positiva = neta larga. Negativa = neta corta.
 */
export function signedUnits(positions, contractSize) {
  const cs = num(contractSize) || 0;
  return (positions || []).reduce(
    (acc, p) => acc + (num(p.lots) || 0) * cs * dirOf(p.side),
    0,
  );
}

/**
 * Unidades que el bróker cobra a efectos de margen, según el modelo.
 *
 *   net — sólo la exposición neta. Es lo que exige la norma de cierre de
 *         margen de la UE y lo que hace la mayoría de brókers con cuenta de
 *         hedging. Una posición bloqueada (5 largos + 5 cortos) paga CERO.
 *   max — el mayor de los dos lados. Modelo intermedio, frecuente en MT5.
 *   sum — ambas patas completas. El más caro. Con él, abrir una cobertura
 *         DUPLICA el margen y puede provocar el stop-out que intentabas evitar.
 */
export function marginUnits(positions, contractSize, model = 'net') {
  const cs = num(contractSize) || 0;
  let long = 0;
  let short = 0;
  for (const p of positions || []) {
    const u = (num(p.lots) || 0) * cs;
    if (dirOf(p.side) > 0) long += u;
    else short += u;
  }
  if (model === 'sum') return long + short;
  if (model === 'max') return Math.max(long, short);
  return Math.abs(long - short);
}

/**
 * Fotografía de la cuenta a un precio dado.
 *
 * `marginUsed` se calcula al PRECIO ACTUAL, no al de entrada: es lo que hace
 * el bróker y por eso el umbral se mueve mientras te acercas a él. El efecto
 * sobre el colchón es pequeño (décimas de céntimo en el caso del oro a 1:500)
 * y va A FAVOR del que va largo, porque el margen exigido encoge al caer el
 * precio. No es donde está el peligro; el peligro es el umbral, no la deriva
 * del margen. Se calcula bien de todas formas porque es lo que ocurre.
 */
export function accountState({
  balance, positions, price, leverage, contractSize, marginModel = 'net',
}) {
  const bal = num(balance);
  const p = price0(price);
  const lev = num(leverage);
  const cs = num(contractSize);

  const out = {
    lots: null, notional: null, floating: null, equity: null,
    marginUsed: null, freeMargin: null, marginLevel: null, netUnits: null,
  };
  if (bal === null || p === null || !lev || lev <= 0 || !cs || cs <= 0) return out;

  const lots = (positions || []).reduce((a, q) => a + (num(q.lots) || 0), 0);
  const floating = (positions || []).reduce(
    (a, q) => a + (num(q.lots) || 0) * cs * (p - (num(q.entry) || 0)) * dirOf(q.side),
    0,
  );
  const mUnits = marginUnits(positions, cs, marginModel);
  const marginUsed = (mUnits * p) / lev;
  const equity = bal + floating;

  return {
    lots,
    netUnits: signedUnits(positions, cs),
    notional: lots * cs * p,
    floating,
    equity,
    marginUsed,
    freeMargin: equity - marginUsed,
    // Sin margen usado el margin level es infinito, no cero. `null` para que la
    // UI pinte «—» y no un 0 % que parecería una cuenta muerta.
    marginLevel: marginUsed > 0 ? (equity / marginUsed) * 100 : null,
  };
}

/**
 * Precio al que el margin level toca `thresholdPct`.
 *
 *   equity(P)     = B + A·P        con A = Σ lotes·cs·dir,  B = balance − Σ lotes·cs·entrada·dir
 *   marginUsed(P) = M·P            con M = unidades_de_margen / apalancamiento
 *
 *   B + A·P = (th/100)·M·P   →   P = −B / (A − th/100·M)
 *
 * Vale para largos y para cortos sin ramas separadas: el signo lo lleva A.
 *
 * Devuelve `null` cuando la ecuación no tiene solución con sentido: sin
 * posiciones, con la cuenta bloqueada (A = 0: no hay precio que la liquide) o
 * cuando el precio despejado sale negativo. Lo que NO hace es esconder un
 * disparo que ya está del lado malo: si a un neto largo le sale un precio de
 * stop-out POR ENCIMA del precio actual, es que el umbral ya está superado, y
 * eso se lee en `cushion()`, que devuelve negativo. Un `null` ahí sería
 * decirle a alguien que no tiene problema justo cuando lo tiene.
 */
export function marginLevelPrice({
  balance, positions, leverage, contractSize,
  thresholdPct = DEFAULT_STOP_OUT_PCT, marginModel = 'net',
}) {
  const bal = num(balance);
  const lev = num(leverage);
  const cs = num(contractSize);
  if (bal === null || !lev || lev <= 0 || !cs || cs <= 0) return null;
  if (!positions || positions.length === 0) return null;

  const A = signedUnits(positions, cs);
  if (A === 0) return null; // cuenta bloqueada: no hay precio que la liquide

  const B = bal - positions.reduce(
    (a, q) => a + (num(q.lots) || 0) * cs * (num(q.entry) || 0) * dirOf(q.side),
    0,
  );
  const M = marginUnits(positions, cs, marginModel) / lev;
  const den = A - (thresholdPct / 100) * M;
  if (den === 0) return null;

  const p = -B / den;
  return Number.isFinite(p) && p > 0 ? p : null;
}

/**
 * Colchón: cuánto puede moverse el precio EN CONTRA antes del umbral.
 * Positivo mientras quede margen; NEGATIVO si el umbral ya se pasó.
 *
 * Cuál es «en contra» NO lo decide el signo de la exposición neta. Lo decide la
 * pendiente del excedente
 *
 *     excedente(P) = equity(P) − th/100 · margen(P) = B + (A − th/100·M)·P
 *
 * que es lineal en el precio. Mientras la pendiente sea positiva —el caso
 * normal— la cuenta está a salvo por encima del disparo y la mata una caída.
 * Pero la pendiente se INVIERTE cuando el término de margen pesa más que la
 * exposición neta, y entonces a la cuenta la mata una SUBIDA aunque esté neta
 * larga. Ocurre de verdad: tres largos y dos cortos con el modelo que cobra las
 * dos patas y apalancamiento bajo están al 400 % de margin level y se liquidan
 * subiendo, porque el margen crece con el precio más deprisa que el equity.
 *
 * Tomar la dirección de `signedUnits` daba ahí −5.000 —la magnitud correcta con
 * el signo cambiado—, que en pantalla se lee como «ya te han liquidado» sobre
 * una cuenta sana. La pendiente se mide sobre el propio `accountState` en dos
 * precios: es exacta porque la función es lineal, y no duplica el álgebra que
 * resuelve `marginLevelPrice`.
 */
export function cushion({
  balance, positions, price, leverage, contractSize,
  thresholdPct = DEFAULT_STOP_OUT_PCT, marginModel = 'net',
}) {
  const args = { balance, positions, leverage, contractSize, marginModel };
  const trigger = marginLevelPrice({ ...args, thresholdPct });
  const p = price0(price);
  if (trigger === null || p === null) return null;

  const excedente = (q) => {
    const st = accountState({ ...args, price: q });
    return st.equity === null ? null : st.equity - (thresholdPct / 100) * st.marginUsed;
  };
  const paso = Math.max(p * 1e-3, 1e-9);
  const e1 = excedente(p);
  const e2 = excedente(p + paso);
  if (e1 === null || e2 === null) return null;
  const pendiente = e2 - e1;
  if (pendiente === 0) return null; // el umbral no depende del precio

  return pendiente > 0 ? p - trigger : trigger - p;
}

/**
 * Distancia hasta perder TODO el margen que respalda la posición si estuviera
 * en margen AISLADO, es decir sin el resto de la cuenta detrás.
 *
 *   pérdida = margen  →  L·cs·d = L·cs·P/lev  →  d = P / lev
 *
 * El tamaño se cancela: en aislado la distancia sólo depende del precio y del
 * apalancamiento. Se expone aquí para poder poner las dos lecturas una al lado
 * de la otra, que es la comparación que de verdad sorprende: con oro a 4.328 y
 * 1:500 son 8,66 $ en aislado, frente a 5,68 $ hasta el stop-out al 50 % en
 * cruzado con 5.000 $ de cuenta. El cruzado, con todo el equity detrás,
 * liquida ANTES — porque el umbral del bróker no es perder el margen, es bajar
 * del 50 % de él.
 *
 * `mmr` mueve el punto de corte al margen de MANTENIMIENTO en vez de a cero.
 * Con el 0,5 % del catálogo y 1:500 el margen inicial (0,2 %) ya está por
 * debajo del de mantenimiento: la posición nace liquidada y la función
 * devuelve `null`. No es un fallo, es la respuesta — ese apalancamiento sólo
 * existe donde el bróker baja también el mantenimiento.
 */
export function isolatedStopDistance({ price, leverage, mmr = 0 }) {
  const p = price0(price);
  const lev = num(leverage);
  const m = num(mmr) || 0;
  if (p === null || !lev || lev <= 0) return null;
  const frac = 1 / lev - m;
  return frac > 0 ? p * frac : null;
}

/**
 * ¿Deja el bróker abrir `addLots` más?
 *
 * El coste no es «lotes × margen unitario»: es la DIFERENCIA de margen usado
 * antes y después. Así el cálculo sale bien también cuando el tramo nuevo va
 * en dirección contraria y reduce la exposición neta en vez de aumentarla.
 *
 * `maxLots` sale por bisección sobre el predicado «el incremento de margen
 * cabe en el margen libre». El predicado es monótono en los tres modelos
 * —incluso en `net`, donde el margen primero baja al cubrir y luego sube, la
 * condición sigue siendo cierta en un único intervalo [0, X]— así que la
 * bisección es válida. Lo que NO se puede hacer es fijar la cota superior a
 * partir del margen libre: al añadir en dirección contraria caben lotes que no
 * cuestan margen ninguno, y una cota derivada del dinero disponible los
 * cortaría en silencio. Por eso `hi` se duplica hasta que el predicado falla.
 */
export function canOpen({
  balance, positions, price, leverage, contractSize,
  addLots, side = 'long', marginModel = 'net',
}) {
  const fail = { ok: false, required: null, available: null, shortfall: null, maxLots: null };
  const p = price0(price);
  const lev = num(leverage);
  const cs = num(contractSize);
  if (p === null || !lev || lev <= 0 || !cs || cs <= 0) return fail;

  const base = { balance, price, leverage, contractSize, marginModel };
  const before = accountState({ ...base, positions });
  if (before.freeMargin === null) return fail;

  const withLots = (lots) => accountState({
    ...base,
    positions: [...(positions || []), { lots, entry: p, side }],
  });

  const add = num(addLots);
  const after = withLots(add === null ? 0 : add);
  const required = after.marginUsed - before.marginUsed;
  const available = before.freeMargin;
  const fits = (lots) => withLots(lots).marginUsed - before.marginUsed <= available;

  // Cota superior: duplicar hasta que deje de caber. Si ni al tope cabe, es que
  // el margen no lo limita (cobertura pura en modelo neto) y se devuelve el tope.
  let lo = 0;
  let hi = 1;
  while (hi < MAX_LOTS_CAP && fits(hi)) hi *= 2;
  if (hi >= MAX_LOTS_CAP) {
    lo = MAX_LOTS_CAP;
  } else {
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
  }

  return {
    ok: required <= available,
    required,
    available,
    shortfall: required > available ? required - available : 0,
    maxLots: lo,
  };
}

/**
 * Recorre una escalera de entradas y devuelve el estado en cada peldaño.
 *
 * `entries` llega ya compuesta: esta función no decide si la escalera sube o
 * baja. Es deliberado — piramidar (añadir a favor) y promediar a la baja
 * (añadir en contra) son la misma aritmética y planes opuestos, y quien llama
 * tiene que declarar cuál está simulando en vez de heredarlo de un signo
 * escondido aquí dentro.
 *
 * Se detiene en el primer tramo que el bróker rechazaría y lo marca. Ese es el
 * dato que hace útil al simulador: la mayoría de planes de piramidación no
 * fracasan por el mercado, fracasan porque la orden número dos no entra.
 */
export function simulateLadder({
  balance, leverage, contractSize, side = 'long', entries = [],
  marginModel = 'net', stopOutPct = DEFAULT_STOP_OUT_PCT,
  marginCallPct = DEFAULT_MARGIN_CALL_PCT, target = null,
  driftPerDay = 0, sigmaPerDay = null,
}) {
  const rungs = [];
  const open = [];
  let blockedAt = null;

  for (let i = 0; i < entries.length; i += 1) {
    const price = price0(entries[i].price);
    const lots = num(entries[i].lots);
    if (price === null || lots === null || lots <= 0) continue;

    const check = canOpen({
      balance, positions: open, price, leverage, contractSize,
      addLots: lots, side, marginModel,
    });

    if (!check.ok) {
      rungs.push({
        index: i + 1, price, lots, accepted: false,
        required: check.required, available: check.available,
        shortfall: check.shortfall, maxLots: check.maxLots,
        state: null, stopOutPrice: null, cushion: null, marginCallPrice: null,
        valuePerUnit: null,
      });
      blockedAt = i + 1;
      break;
    }

    open.push({ lots, entry: price, side });
    const args = { balance, positions: [...open], price, leverage, contractSize, marginModel };
    const state = accountState(args);

    rungs.push({
      index: i + 1, price, lots, accepted: true,
      required: check.required, available: check.available, shortfall: 0,
      maxLots: check.maxLots,
      state,
      stopOutPrice: marginLevelPrice({ ...args, thresholdPct: stopOutPct }),
      marginCallPrice: marginLevelPrice({ ...args, thresholdPct: marginCallPct }),
      cushion: cushion({ ...args, thresholdPct: stopOutPct }),
      // Lo que mueve la cuenta cada punto de precio. Con 25 lotes de oro son
      // 2.500 $ por dólar: la cifra que explica por qué el colchón se mide en
      // céntimos y no en figuras.
      valuePerUnit: state.lots * (num(contractSize) || 0),
    });
  }

  const accepted = rungs.filter((r) => r.accepted);

  // El mínimo y DÓNDE ocurre, sin cruzar índices de dos listas distintas:
  // `cushion` puede ser null en un peldaño (cuenta bloqueada) y filtrar los
  // nulos antes de buscar la posición desalinea las dos listas, que es como el
  // aviso acababa señalando al tramo equivocado.
  let minCushion = null;
  let minCushionAt = null;
  for (const r of accepted) {
    if (r.cushion === null) continue;
    if (minCushion === null || r.cushion < minCushion) {
      minCushion = r.cushion;
      minCushionAt = r.index;
    }
  }

  const last = accepted[accepted.length - 1] || null;
  const finalCushion = last ? last.cushion : null;

  let atTarget = null;
  const tgt = price0(target);
  if (tgt !== null && open.length) {
    const st = accountState({ balance, positions: open, price: tgt, leverage, contractSize, marginModel });
    const lotsOpen = open.reduce((a, q) => a + q.lots, 0);
    const avg = lotsOpen > 0 ? open.reduce((a, q) => a + q.lots * q.entry, 0) / lotsOpen : null;
    const bal = num(balance);
    atTarget = {
      ...st,
      price: tgt,
      averageEntry: avg,
      // Con signo: un objetivo puesto del lado perdedor NO es una distancia a
      // recorrer a favor, y llamarlo «distancia» sin más convertía una pérdida
      // planificada en una probabilidad de éxito.
      move: avg === null ? null : (tgt - avg) * dirOf(side),
      returnPct: bal ? ((st.equity - bal) / bal) * 100 : null,
    };
  }

  // Ruina del jugador sobre el colchón VIGENTE al final de la escalera —no
  // sobre el mínimo histórico, que ya pasó— y sólo si el objetivo está a favor.
  const survival = (atTarget && atTarget.move !== null && atTarget.move > 0 && finalCushion !== null)
    ? survivalProbability({
      targetMove: atTarget.move, cushionMove: finalCushion, driftPerDay, sigmaPerDay,
    })
    : null;

  return {
    rungs,
    blockedAt,
    completed: blockedAt === null && accepted.length === entries.length,
    lotsOpened: accepted.reduce((a, r) => a + r.lots, 0),
    minCushion,
    minCushionAt,
    finalCushion,
    finalState: last ? last.state : null,
    atTarget,
    survival,
  };
}

/**
 * Curva de margen libre en función del precio: cuánto margen disponible tienes
 * según el beneficio flotante que lleves en cada momento, con las líneas de
 * margin call y stop-out sobre la misma escala.
 */
export function marginCurve({
  balance, positions, leverage, contractSize, from, to,
  steps = 120, marginModel = 'net',
}) {
  const a = num(from);
  const b = num(to);
  if (a === null || b === null || steps < 2) return [];
  const lo = Math.max(Math.min(a, b), 0);
  const hi = Math.max(a, b);
  if (!(hi > lo)) return [];
  const out = [];
  for (let i = 0; i < steps; i += 1) {
    const price = lo + ((hi - lo) * i) / (steps - 1);
    const st = accountState({ balance, positions, price, leverage, contractSize, marginModel });
    out.push({
      price,
      equity: st.equity,
      floating: st.floating,
      marginUsed: st.marginUsed,
      freeMargin: st.freeMargin,
      marginLevel: st.marginLevel,
    });
  }
  return out;
}

/**
 * Tamaño que sobrevive a un movimiento adverso de `cushionPrice` unidades.
 *
 * El margen se evalúa en el precio del STOP-OUT, no en el de entrada, que es
 * donde de verdad se aplica el umbral:
 *
 *   P' = P − c   (largo)      P' = P + c   (corto)
 *   balance − L·cs·c = (th/100)·L·cs·P'/lev
 *   →  L = balance / (cs · (c + th/100 · P'/lev))
 *
 * El resultado converge a `balance / (cs · c)` cuando el apalancamiento tiende
 * a infinito: ese es el techo físico de la cuenta (`absoluteMaxLots`). Ningún
 * apalancamiento lo supera, y por eso subir de 1:500 a 1:1000 apenas cambia el
 * tamaño DEFENDIBLE mientras que cambia mucho el tamaño ABRIBLE. La distancia
 * entre esas dos cifras es donde se pierden las cuentas.
 */
export function sizeForCushion({
  balance, price, leverage, contractSize,
  cushionPrice, thresholdPct = DEFAULT_STOP_OUT_PCT, side = 'long',
}) {
  const bal = num(balance);
  const p = price0(price);
  const lev = num(leverage);
  const cs = num(contractSize);
  const c = num(cushionPrice);
  if (bal === null || bal <= 0 || p === null || !lev || lev <= 0 || !cs || cs <= 0) return null;
  if (c === null || c <= 0) return null;

  const stopPrice = side === 'short' ? p + c : p - c;
  // Un largo con colchón mayor que el precio se liquidaría por debajo de cero:
  // ahí ya no hay término de margen, sólo el techo de capital.
  if (stopPrice <= 0) return absoluteMaxLots({ balance, contractSize, cushionPrice: c });

  const denom = cs * (c + ((thresholdPct / 100) * stopPrice) / lev);
  return denom > 0 ? bal / denom : null;
}

/** Techo absoluto de la cuenta: el tamaño que ni con apalancamiento infinito se supera. */
export function absoluteMaxLots({ balance, contractSize, cushionPrice }) {
  const bal = num(balance);
  const cs = num(contractSize);
  const c = num(cushionPrice);
  if (bal === null || bal <= 0 || !cs || cs <= 0 || !c || c <= 0) return null;
  return bal / (cs * c);
}

/**
 * Probabilidad de alcanzar `targetMove` a favor antes de perder `cushionMove`.
 *
 * Sin deriva es b/(a+b). Con deriva es la solución del problema de la ruina con
 * difusión, sobre la función de escala s(x) = e^(−kx) con k = 2μ/σ²:
 *
 *   P = (1 − e^(−k·b)) / (1 − e^(−k·(a+b)))
 *
 * Es una COTA DE PARTIDA, no una predicción: camino aleatorio, sin costes de
 * ejecución y sin huecos. Con tendencia real la cifra mejora; con spread, swap
 * y el hueco del domingo, empeora. `sigmaPerDay` va en las mismas unidades de
 * precio que el objetivo y el colchón, igual que `driftPerDay`.
 *
 * Puede devolver exactamente 1 cuando la deriva aplasta a la volatilidad
 * (k·b ≳ 37): ahí `1 − e^(−k·b)` redondea a 1 en doble precisión. Es el límite
 * del tipo de dato, no una certeza — la probabilidad real es 1 menos algo del
 * orden de e^(−k·b). Quien lo pinte no debe leerlo como una garantía. La rama
 * sin deriva, que es la única que usa hoy el simulador, no puede llegar ahí:
 * b/(a+b) es estrictamente menor que 1 para cualquier objetivo positivo.
 */
export function survivalProbability({ targetMove, cushionMove, driftPerDay = 0, sigmaPerDay = null }) {
  const a = num(targetMove);
  const b = num(cushionMove);
  if (a === null || b === null || a <= 0 || b <= 0) return null;
  const mu = num(driftPerDay) || 0;
  const sig = num(sigmaPerDay);
  if (!mu || !sig || sig <= 0) return b / (a + b);
  const k = (2 * mu) / (sig * sig);
  const den = 1 - Math.exp(-k * (a + b));
  if (den === 0) return b / (a + b);
  return (1 - Math.exp(-k * b)) / den;
}

/**
 * Escalera de precios a partir de un plan: precio de partida, separación entre
 * tramos y sentido. Vive aquí y no en el componente porque el signo es
 * justamente lo que distingue un plan de otro:
 *
 *   'with'    — a favor. Piramidar: se añade cuando la operación ya gana.
 *   'against' — en contra. Promediar a la baja: se añade cuando pierde.
 *
 * Un largo escala a favor SUBIENDO de precio y en contra BAJANDO; un corto, al
 * revés. `taper` reduce cada tramo respecto al anterior (0,7 = cada peldaño es
 * el 70 % del previo), que es la tercera regla de la piramidación.
 */
export function buildLadder({
  entry, lots, spacing, rungs, side = 'long', direction = 'with', taper = 1,
}) {
  const e = price0(entry);
  const l = num(lots);
  const s = num(spacing);
  const n = Math.max(1, Math.min(40, Math.round(num(rungs) || 1)));
  const k = num(taper);
  if (e === null || l === null || l <= 0 || s === null) return [];

  const sign = dirOf(side) * (direction === 'against' ? -1 : 1);
  const factor = k !== null && k > 0 ? k : 1;

  const out = [];
  for (let i = 0; i < n; i += 1) {
    const price = e + sign * Math.abs(s) * i;
    if (price <= 0) break;
    out.push({ price, lots: l * factor ** i });
  }
  return out;
}
