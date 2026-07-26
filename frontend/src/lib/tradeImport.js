/**
 * CSV → trade-journal mapping engine.
 *
 * The journal already imported CSVs by guessing column names from an alias
 * list. That works right up until it doesn't: a broker names a column
 * something unexpected, the guess fails silently, and rows are dropped with no
 * explanation. This module makes the mapping explicit and inspectable, so the
 * user can see what was detected, fix it, and preview the result BEFORE
 * anything is written.
 *
 * Pure functions only — no React, no network. Tested in lib/__tests__.
 */

/** Canonical journal fields. `required` rows are dropped if missing/invalid. */
export const CANONICAL_FIELDS = [
  { key: 'symbol', required: true, kind: 'text' },
  { key: 'side', required: false, kind: 'side' },
  { key: 'entry_price', required: true, kind: 'number' },
  { key: 'exit_price', required: false, kind: 'number' },
  { key: 'quantity', required: true, kind: 'number' },
  { key: 'sl', required: false, kind: 'number' },
  { key: 'tp', required: false, kind: 'number' },
  { key: 'fees', required: false, kind: 'number' },
  { key: 'account_balance', required: false, kind: 'number' },
  { key: 'entry_date', required: false, kind: 'date' },
  { key: 'exit_date', required: false, kind: 'date' },
  { key: 'setup', required: false, kind: 'text' },
  { key: 'status', required: false, kind: 'text' },
  { key: 'emotion', required: false, kind: 'number' },
  { key: 'notes', required: false, kind: 'text' },
];

export const REQUIRED_FIELDS = CANONICAL_FIELDS.filter((f) => f.required).map((f) => f.key);

/** Generic aliases, tried when no broker preset matches. */
export const IMPORT_ALIASES = {
  symbol: ['symbol', 'ticker', 'simbolo', 'símbolo', 'instrument', 'item', 'pair', 'market', 'contract'],
  side: ['side', 'direction', 'direccion', 'dirección', 'type', 'buy/sell', 'action', 'position'],
  setup: ['setup', 'strategy', 'estrategia', 'tag', 'tags'],
  entry_price: ['entry_price', 'entry', 'open_price', 'precio_entrada', 'price', 'avg price', 't. price', 'order price'],
  exit_price: ['exit_price', 'exit', 'close_price', 'precio_salida', 'closing price'],
  sl: ['sl', 'stop_loss', 'stoploss', 's/l', 'stop'],
  tp: ['tp', 'take_profit', 'takeprofit', 't/p', 'target'],
  quantity: ['quantity', 'qty', 'size', 'cantidad', 'volume', 'executed', 'filled qty', 'lots', 'amount'],
  account_balance: ['account_balance', 'balance', 'capital', 'equity'],
  fees: ['fees', 'commission', 'comisiones', 'comm/fee', 'fee', 'exec fee', 'commission_fee'],
  entry_date: ['entry_date', 'entry_time', 'date', 'fecha', 'open time', 'date(utc)', 'trade time', 'datetime'],
  exit_date: ['exit_date', 'exit_time', 'close_date', 'close time', 'closing time'],
  status: ['status', 'estado'],
  emotion: ['emotion', 'emocion', 'emoción'],
  notes: ['notes', 'note', 'notas', 'comment', 'comments'],
};

/**
 * Broker presets: the column names each platform actually exports.
 * `signature` = headers whose presence identifies the format.
 */
export const BROKER_PRESETS = {
  auto: { label: 'Auto', signature: [], map: {} },

  mt: {
    label: 'MetaTrader 4 / 5',
    signature: ['ticket', 'item', 's / l'],
    map: {
      symbol: 'item', side: 'type', quantity: 'size',
      entry_price: 'price', entry_date: 'open time',
      exit_date: 'close time', sl: 's / l', tp: 't / p',
      fees: 'commission', notes: 'comment',
    },
  },

  ibkr: {
    label: 'Interactive Brokers',
    signature: ['t. price', 'comm/fee', 'proceeds'],
    map: {
      symbol: 'symbol', quantity: 'quantity', entry_price: 't. price',
      entry_date: 'date/time', fees: 'comm/fee',
    },
  },

  binance: {
    label: 'Binance',
    signature: ['date(utc)', 'pair', 'executed'],
    map: {
      symbol: 'pair', side: 'side', entry_price: 'price',
      quantity: 'executed', entry_date: 'date(utc)', fees: 'fee',
    },
  },

  bybit: {
    label: 'Bybit',
    signature: ['exec fee', 'filled qty'],
    map: {
      symbol: 'symbol', side: 'side', entry_price: 'order price',
      quantity: 'filled qty', entry_date: 'trade time', fees: 'exec fee',
    },
  },
};

const lower = (s) => String(s ?? '').trim().toLowerCase();

/** Which preset best matches these headers, or 'auto' if none does. */
export function detectBroker(headers) {
  const set = new Set(headers.map(lower));
  let best = 'auto';
  let bestScore = 0;
  for (const [id, preset] of Object.entries(BROKER_PRESETS)) {
    if (!preset.signature.length) continue;
    const score = preset.signature.filter((sig) => set.has(lower(sig))).length;
    // Require a majority of the signature so a single shared column
    // (e.g. "symbol") can't misidentify the format.
    if (score > bestScore && score >= Math.ceil(preset.signature.length / 2)) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Build `canonicalField -> csvHeader` (or null) for these headers.
 * A broker preset wins over generic aliases; aliases fill the gaps.
 */
export function autoDetectMapping(headers, brokerId = 'auto') {
  const byLower = new Map(headers.map((h) => [lower(h), h]));
  const preset = BROKER_PRESETS[brokerId] || BROKER_PRESETS.auto;
  const mapping = {};

  for (const { key } of CANONICAL_FIELDS) {
    const presetCol = preset.map[key];
    if (presetCol && byLower.has(lower(presetCol))) {
      mapping[key] = byLower.get(lower(presetCol));
      continue;
    }
    const alias = (IMPORT_ALIASES[key] || []).find((a) => byLower.has(lower(a)));
    mapping[key] = alias ? byLower.get(lower(alias)) : null;
  }
  return mapping;
}

/** Parse a number tolerating thousands separators, currency symbols and commas. */
export function toNumber(value) {
  if (value === '' || value == null) return undefined;
  let s = String(value).trim();
  if (!s) return undefined;
  const negative = /^\(.*\)$/.test(s); // accounting notation: (123.45)
  s = s.replace(/[()]/g, '');
  // "1.234,56" (es) vs "1,234.56" (en): the LAST separator is the decimal one.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    // A lone comma is a decimal separator unless it groups 3 digits.
    s = /,\d{3}\b/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  s = s.replace(/[^0-9.\-]/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return negative ? -Math.abs(n) : n;
}

const SHORT_WORDS = ['short', 's', 'sell', 'bajista', 'venta', 'sel', '-1'];

export function normalizeSide(value) {
  const v = lower(value);
  if (!v) return 'long';
  // IBKR/MT export signed quantities: a negative size means short.
  const asNum = Number(v);
  if (Number.isFinite(asNum) && asNum < 0) return 'short';
  return SHORT_WORDS.some((w) => v === w || v.startsWith(w)) ? 'short' : 'long';
}

/** Apply a mapping to one CSV row → journal payload. */
export function rowToPayload(row, mapping) {
  const get = (key) => {
    const col = mapping[key];
    return col ? row[col] : undefined;
  };

  const qtyRaw = get('quantity');
  const qty = toNumber(qtyRaw);
  // A signed quantity carries the direction when there is no side column.
  const side = mapping.side
    ? normalizeSide(get('side'))
    : normalizeSide(qtyRaw);

  return {
    symbol: String(get('symbol') ?? '').trim().toUpperCase(),
    side,
    setup: String(get('setup') ?? ''),
    entry_price: toNumber(get('entry_price')) ?? 0,
    exit_price: toNumber(get('exit_price')) ?? null,
    sl: toNumber(get('sl')) ?? null,
    tp: toNumber(get('tp')) ?? null,
    quantity: qty === undefined ? 0 : Math.abs(qty),
    account_balance: toNumber(get('account_balance')) ?? 0,
    fees: Math.abs(toNumber(get('fees')) ?? 0),
    status: get('status') || undefined,
    entry_date: get('entry_date') || undefined,
    exit_date: get('exit_date') || undefined,
    emotion: toNumber(get('emotion')) ?? null,
    notes: String(get('notes') ?? ''),
  };
}

/** Why a payload can't be imported, or null if it is fine. */
export function validatePayload(p) {
  if (!p.symbol) return 'symbol';
  if (!(p.entry_price > 0)) return 'entry_price';
  if (!(p.quantity > 0)) return 'quantity';
  return null;
}

/**
 * Run a whole file through a mapping.
 * @returns {{valid: object[], invalid: {row:number, reason:string}[]}}
 */
export function buildImport(rows, mapping) {
  const valid = [];
  const invalid = [];
  rows.forEach((row, i) => {
    const payload = rowToPayload(row, mapping);
    const reason = validatePayload(payload);
    if (reason) invalid.push({ row: i + 2, reason }); // +2: 1-indexed + header
    else valid.push(payload);
  });
  return { valid, invalid };
}
