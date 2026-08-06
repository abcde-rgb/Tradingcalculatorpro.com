/**
 * instruments.js — la misma matemática que `backend/instruments.py`, en el navegador.
 *
 * Existe por una razón concreta: el formulario tiene que decirte que te has
 * pasado del tope de exposición **mientras escribes el tamaño**, no después de
 * guardar. Esperar a la red para eso convierte un aviso en un reproche.
 *
 * Los DATOS no se duplican: salen de `instrumentSpecs.generated.js`, que escribe
 * el backend (`scripts/gen-instruments-js.py`). Lo que sí está escrito dos veces
 * es la fórmula, a propósito y con tests a los dos lados: el backend no puede
 * fiarse de lo que le mande el cliente, así que recalcula todo al guardar. Si
 * las dos discrepan, manda el backend — es lo que se almacena.
 *
 * Reglas que no se rompen (las mismas que arriba):
 *   · El apalancamiento NO multiplica el P&L. Multiplica el margen y la
 *     cercanía de la liquidación, y nada más.
 *   · Lo que no se puede calcular es `null`, nunca 0.
 */
// Con extensión explícita: `engine-check.js` importa este módulo con el ESM de
// Node, que no resuelve extensiones por su cuenta como hace webpack.
import SPECS from './instrumentSpecs.generated.js';

export const PRODUCTS = SPECS.products;
export const PRODUCT_IDS = Object.keys(SPECS.products);
export const UNITS = SPECS.units;
export const FOREX_LOT_TYPES = SPECS.forexLotTypes;
export const FOREX_PAIRS = SPECS.forexPairs;
export const FUTURES_SPECS = SPECS.futures;
export const CFD_SPECS = SPECS.cfd;
export const CRYPTO_PERP_SPECS = SPECS.cryptoPerp;

export const MAX_EXPOSURE_MULTIPLE = SPECS.constants.maxExposureMultiple;
export const MIN_RR_FLOOR = SPECS.constants.minRRFloor;
export const DEFAULT_MAINTENANCE_MARGIN_RATE = SPECS.constants.maintenanceMarginRate;
export const DEFAULT_FUNDING_INTERVAL_HOURS = SPECS.constants.fundingIntervalHours;

export const DEFAULT_PRODUCT = 'spot';

/** Los productos que se ofrecen al crear una operación, en el orden en que se piensan. */
export const SELECTABLE_PRODUCTS = [
  'stock', 'cfd', 'futures', 'forex', 'crypto_spot', 'crypto_perp', 'option',
];

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const normSymbol = (s) => String(s || '').toUpperCase().replace(/[/\-\s]/g, '').trim();

/** El escalón que el sector llama pip. 0,01 contra el yen, 0,0001 en el resto. */
export function forexPipSize(symbol) {
  return normSymbol(symbol).includes('JPY') ? SPECS.forexPip.jpy : SPECS.forexPip.default;
}

/**
 * Qué se sabe de este producto y este símbolo. Nunca inventa un número:
 * `known: false` y `contractSize: null` es una respuesta legítima (un futuro
 * fuera de catálogo), y significa que el número lo tiene que poner el usuario.
 */
export function resolveSpec(product, symbol) {
  const pid = PRODUCTS[product] ? product : DEFAULT_PRODUCT;
  const meta = PRODUCTS[pid];
  const sym = normSymbol(symbol);

  const spec = {
    product: pid,
    symbol: sym || null,
    known: false,
    name: null,
    category: null,
    sizing: meta.sizing,
    contractSize: meta.default_contract_size,
    tickSize: null,
    tickValue: null,
    pipSize: null,
    initialMargin: null,
    defaultLeverage: meta.default_leverage,
    maxLeverage: meta.typical_max_leverage,
    maintenanceMarginRate: null,
    carry: meta.carry,
    quoteUnits: meta.quote_units,
    usesLeverage: meta.uses_leverage,
    definedRisk: meta.defined_risk,
  };

  if (pid === 'futures' && FUTURES_SPECS[sym]) {
    const f = FUTURES_SPECS[sym];
    Object.assign(spec, {
      known: true, name: f.name, category: f.category,
      contractSize: f.contract_size, tickSize: f.tick_size,
      tickValue: f.tick_value, initialMargin: f.initial_margin,
    });
  } else if (pid === 'forex') {
    const pip = forexPipSize(sym);
    Object.assign(spec, {
      known: FOREX_PAIRS.includes(sym),
      name: sym.length === 6 ? `${sym.slice(0, 3)}/${sym.slice(3)}` : null,
      category: 'fx', pipSize: pip, tickSize: pip,
    });
  } else if (pid === 'cfd' && CFD_SPECS[sym]) {
    const c = CFD_SPECS[sym];
    Object.assign(spec, {
      known: true, name: c.name, category: c.category,
      contractSize: c.contract_size, tickSize: c.tick_size,
      defaultLeverage: c.default_leverage, maxLeverage: c.max_leverage,
    });
  } else if (pid === 'crypto_perp' && CRYPTO_PERP_SPECS[sym]) {
    const c = CRYPTO_PERP_SPECS[sym];
    Object.assign(spec, {
      known: true, name: c.name, category: 'crypto',
      contractSize: c.contract_size, maxLeverage: c.max_leverage,
      maintenanceMarginRate: c.maintenance_margin_rate,
    });
  }
  return spec;
}

/**
 * El tamaño de contrato a usar. En forex sale del TIPO DE LOTE elegido (un lote
 * estándar son 100 000 unidades, un micro 1 000), que es la respuesta directa a
 * "micro, mini o lote" y lo que hace que un mismo "1" signifique cosas muy
 * distintas según lo que se opere de verdad.
 */
export function contractSizeFor(product, symbol, { override, lotType } = {}) {
  const given = num(override);
  if (given && given > 0) return given;
  if (product === 'forex' && lotType && FOREX_LOT_TYPES[lotType]) {
    return FOREX_LOT_TYPES[lotType].units;
  }
  return resolveSpec(product, symbol).contractSize;
}

/** Convierte lo que escribió el usuario en una distancia de precio. `null` si no se puede. */
export function unitToDistance(value, unit, { entry, quantity, contractSize, spec, balance, riskDistance }) {
  const v = Math.abs(num(value) ?? 0);
  if (!v || !UNITS.includes(unit)) return null;
  const size = (num(quantity) || 0) * (num(contractSize) || 0);

  switch (unit) {
    case 'points': return v;
    case 'pct': return entry ? Math.abs(entry) * v / 100 : null;
    case 'pips': {
      const pip = spec?.pipSize || forexPipSize(spec?.symbol);
      return pip ? v * pip : null;
    }
    case 'ticks': return spec?.tickSize ? v * spec.tickSize : null;
    case 'money': return size > 0 ? v / size : null;
    case 'pct_balance':
      return (balance && size > 0) ? (balance * v / 100) / size : null;
    case 'r': return riskDistance ? v * riskDistance : null;
    default: return null;
  }
}

/** La inversa, para repintar en la unidad elegida lo que se guardó como precio. */
export function distanceToUnit(distance, unit, { entry, quantity, contractSize, spec, balance, riskDistance }) {
  const d = Math.abs(num(distance) ?? 0);
  if (!d) return null;
  const size = (num(quantity) || 0) * (num(contractSize) || 0);

  switch (unit) {
    case 'points': return d;
    case 'pct': return entry ? d / Math.abs(entry) * 100 : null;
    case 'pips': {
      const pip = spec?.pipSize || forexPipSize(spec?.symbol);
      return pip ? d / pip : null;
    }
    case 'ticks': return spec?.tickSize ? d / spec.tickSize : null;
    case 'money': return size > 0 ? d * size : null;
    case 'pct_balance':
      return (balance && size > 0) ? (d * size) / balance * 100 : null;
    case 'r': return riskDistance ? d / riskDistance : null;
    default: return null;
  }
}

/**
 * El nivel de precio de un stop o un objetivo. En largo el stop va debajo y el
 * objetivo arriba; en corto, al revés. Una sola regla, en un solo sitio.
 */
export function levelFromDistance(entry, distance, side, kind) {
  const below = (kind === 'sl') === ((side || 'long') === 'long');
  return below ? entry - distance : entry + distance;
}

/** Precio de liquidación ESTIMADO, en margen aislado. Ver la nota del backend. */
export function liquidationPrice(entry, side, leverage, mmr = DEFAULT_MAINTENANCE_MARGIN_RATE) {
  const lev = num(leverage);
  if (!entry || !lev || lev <= 1) return null;
  const move = 1 / lev - mmr;
  if (move <= 0) return null;
  const price = (side || 'long') === 'long' ? entry * (1 - move) : entry * (1 + move);
  return price > 0 ? price : null;
}

/**
 * Todo lo que describe el TAMAÑO de la posición. Espejo de `position_metrics`
 * del backend, con los mismos `null` en los mismos sitios.
 */
export function positionMetrics({
  entry, quantity, contractSize, leverage, balance, side = 'long',
  sl, tp, maxLoss, spec, maintenanceMarginRate,
  maxExposureMultiple = MAX_EXPOSURE_MULTIPLE,
}) {
  const e = num(entry);
  const qty = num(quantity) || 0;
  const csize = num(contractSize);
  const lev = num(leverage) > 0 ? num(leverage) : null;
  const bal = num(balance);

  const out = {
    notional: null, positionUnits: null, marginUsed: null,
    exposureMultiple: null, exposureExceeded: null, maxExposureMultiple,
    riskAmount: null, rewardAmount: null, rr: null, rrBelowFloor: null,
    riskPctNotional: null, riskPctBalance: null, riskPctMargin: null,
    maxLoss: null, maxLossSource: null,
    liquidationPrice: null, liquidationDistancePct: null, liquidationBeforeStop: null,
  };
  if (e === null || csize === null || qty <= 0) return out;

  const units = qty * csize;
  const notional = Math.abs(e) * units;
  out.positionUnits = units;
  out.notional = notional;

  const usesLev = spec ? spec.usesLeverage : true;
  if (usesLev && lev) out.marginUsed = notional / lev;
  else if (!usesLev) out.marginUsed = notional;

  if (bal && bal > 0) {
    out.exposureMultiple = notional / bal;
    out.exposureExceeded = out.exposureMultiple > maxExposureMultiple;
  }

  const slN = num(sl);
  const tpN = num(tp);
  if (slN !== null) out.riskAmount = Math.abs(e - slN) * units;
  if (tpN !== null) out.rewardAmount = Math.abs(tpN - e) * units;
  if (out.riskAmount && out.rewardAmount !== null) {
    out.rr = out.rewardAmount / out.riskAmount;
    out.rrBelowFloor = out.rr < MIN_RR_FLOOR;
  }

  const declared = num(maxLoss);
  if (declared && declared > 0) {
    out.maxLoss = declared;
    out.maxLossSource = 'declared';
  } else if (out.riskAmount !== null) {
    out.maxLoss = out.riskAmount;
    out.maxLossSource = 'stop';
  } else if (spec?.definedRisk && side === 'long') {
    // Una opción comprada no puede perder más que la prima. Es la estructura,
    // no una estimación.
    out.maxLoss = notional;
    out.maxLossSource = 'premium';
  }

  if (out.riskAmount !== null) {
    if (notional > 0) out.riskPctNotional = out.riskAmount / notional * 100;
    if (bal && bal > 0) out.riskPctBalance = out.riskAmount / bal * 100;
    if (out.marginUsed) out.riskPctMargin = out.riskAmount / out.marginUsed * 100;
  }

  if (usesLev && lev && lev > 1) {
    const mmr = num(maintenanceMarginRate)
      ?? spec?.maintenanceMarginRate ?? DEFAULT_MAINTENANCE_MARGIN_RATE;
    const liq = liquidationPrice(e, side, lev, mmr);
    if (liq !== null) {
      out.liquidationPrice = liq;
      out.liquidationDistancePct = Math.abs(liq - e) / e * 100;
      if (slN !== null) {
        out.liquidationBeforeStop = side === 'long' ? liq > slN : liq < slN;
      }
    }
  }
  return out;
}

/** Coste de funding de un perpetuo: nocional × tasa por periodo × nº de pagos. */
export function fundingCost(notional, ratePct, periods) {
  const rate = num(ratePct);
  if (notional == null || rate == null || periods == null) return null;
  return notional * rate / 100 * periods;
}

/** Comisión nocturna (swap): interés anual prorrateado por noches. */
export function swapCost(notional, annualRatePct, nights) {
  const rate = num(annualRatePct);
  if (notional == null || rate == null || nights == null) return null;
  return notional * rate / 100 * nights / 365;
}

/**
 * El apalancamiento que se propone al elegir producto y activo. En futuros sale
 * del margen del mercado (nocional / margen inicial), que es el apalancamiento
 * que de verdad estás usando aunque nadie te haya preguntado por una X.
 */
export function suggestedLeverage(spec, notional) {
  if (!spec?.usesLeverage) return null;
  if (spec.defaultLeverage) return spec.defaultLeverage;
  if (spec.initialMargin && notional) {
    return Math.max(1, Math.round(notional / spec.initialMargin));
  }
  return null;
}

/** Etiqueta de la unidad en la que se mide el tamaño de este producto. */
export function sizingLabelKey(spec) {
  return {
    shares: 'sizingShares', coins: 'sizingCoins', contracts: 'sizingContracts',
    lots: 'sizingLots', units: 'sizingUnits',
  }[spec?.sizing] || 'sizingUnits';
}
