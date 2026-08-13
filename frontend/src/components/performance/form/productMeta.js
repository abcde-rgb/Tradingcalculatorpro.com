/**
 * Etiquetas y adornos de cada producto y de cada unidad.
 *
 * Vive aparte del catálogo (`lib/instruments.js`) a propósito: allí están los
 * DATOS, que los genera el backend y no se tocan a mano; aquí sólo está cómo se
 * llaman en pantalla y con qué icono, que es cosa del frontend y de los diez
 * idiomas.
 */
import {
  Building2, LineChart, Boxes, Banknote, Bitcoin, Zap, Layers,
} from 'lucide-react';

export const PRODUCT_META = {
  stock:       { labelKey: 'prodStock',       icon: Building2 },
  cfd:         { labelKey: 'prodCfd',         icon: LineChart },
  futures:     { labelKey: 'prodFutures',     icon: Boxes },
  forex:       { labelKey: 'prodForex',       icon: Banknote },
  crypto_spot: { labelKey: 'prodCryptoSpot',  icon: Bitcoin },
  crypto_perp: { labelKey: 'prodCryptoPerp',  icon: Zap },
  option:      { labelKey: 'prodOption',      icon: Layers },
  // No se ofrece en el selector: es lo que llevan guardado las operaciones
  // anteriores a que hubiera productos, y tiene que poder pintarse.
  spot:        { labelKey: 'prodSpot',        icon: LineChart },
};

export const productLabelKey = (id) => (PRODUCT_META[id] || PRODUCT_META.spot).labelKey;

/**
 * Las unidades, con su etiqueta corta. El orden es el de "lo más usado
 * primero": precio y % de cuenta cubren a casi todo el mundo, y pips y ticks
 * sólo aparecen donde significan algo.
 */
export const UNIT_META = {
  price:       { labelKey: 'unitPrice',      short: '$' },
  pct_balance: { labelKey: 'unitPctBalance', short: '% cta' },
  money:       { labelKey: 'unitMoney',      short: '$ fijo' },
  pips:        { labelKey: 'unitPips',       short: 'pips' },
  ticks:       { labelKey: 'unitTicks',      short: 'ticks' },
  points:      { labelKey: 'unitPoints',     short: 'pts' },
  pct:         { labelKey: 'unitPct',        short: '%' },
  r:           { labelKey: 'unitR',          short: 'R' },
};

/**
 * Qué unidades se ofrecen para el stop y para el objetivo de este producto.
 *
 * El objetivo admite además R (múltiplos del riesgo), que sólo tiene sentido
 * medido contra un stop ya puesto; el stop no puede medirse en R porque sería
 * medirse contra sí mismo.
 */
export function unitsFor(spec, kind) {
  const base = spec?.quoteUnits || ['price', 'pct', 'money', 'pct_balance'];
  const ordered = Object.keys(UNIT_META).filter((u) => base.includes(u));
  return kind === 'tp' ? [...ordered, 'r'] : ordered;
}

/** Los desenlaces posibles de una posición de opciones. */
export const OPTION_OUTCOMES = [
  { id: 'closed',            labelKey: 'tfOutcomeClosed' },
  { id: 'expired_worthless', labelKey: 'tfOutcomeExpired' },
  { id: 'assigned',          labelKey: 'tfOutcomeAssigned' },
  { id: 'exercised',         labelKey: 'tfOutcomeExercised' },
  { id: 'rolled',            labelKey: 'tfOutcomeRolled' },
];

/** Formateo compacto para el panel en vivo. `null` se pinta como raya. */
export const fmtMoney = (v, dp = 2) => (
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`
);

export const fmtNum = (v, dp = 2) => (
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
);

export const fmtPct = (v, dp = 2) => (
  v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(dp)}%`
);

/** Precio con los decimales que pide el instrumento (un pip de EURUSD son 5). */
export const fmtPrice = (v, tick) => {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const t = Number(tick) || 0.01;
  const dp = t >= 1 ? 0 : Math.min(8, Math.ceil(-Math.log10(t)) + 1);
  return Number(v).toFixed(dp);
};
