// Constants and pure helpers of the price-structure scanner.
//
// They used to live at the top of StructureScanner.jsx, above 600 lines of
// markup, which meant every change to a colour map or a ticker mapping was a
// change to the same file as the layout. Here they are data: no React, no
// state, importable from any of the panels.

// ── Ticker translation ──────────────────────────────────────────────────────
// The chart and the scanner share the SAME asset (Zustand store), but the
// backend reads a provider that needs its own ticker spellings. We know the
// category here, so we translate on the frontend and leave the backend generic.
const INDEX_YF = {
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', DAX: '^GDAXI', FTSE: '^FTSE',
  N225: '^N225', HSI: '^HSI', RUT: '^RUT', VIX: '^VIX', SX5E: '^STOXX50E',
  IBEX: '^IBEX', CAC: '^FCHI', XJO: '^AXJO', NIFTY: '^NSEI', IBOV: '^BVSP',
};
const COMMODITY_YF = {
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTIUSD: 'CL=F', BRENTUSD: 'BZ=F',
  NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F', PALLADIUM: 'PA=F',
};

export const toYahooSymbol = (asset) => {
  if (!asset) return null;
  const s = asset.symbol;
  switch (asset.category) {
    case 'crypto':      return `${s}-USD`;              // BTC → BTC-USD
    case 'forex':       return `${s}=X`;                // EURUSD → EURUSD=X
    case 'commodities': return COMMODITY_YF[s] || s;
    case 'indices':     return INDEX_YF[s] || s;
    case 'futures':     return `${s}=F`;                // ES → ES=F
    default:            return s;                        // stocks as-is
  }
};

// ── Timeframe ladder ────────────────────────────────────────────────────────
// The real ladder comes from the backend (`/education/scan-timeframes`), which
// is the single source of truth for which (candle, history) pairs the data
// provider will actually serve — most combinations are refused upstream, and a
// refused pair used to reach the UI as "no structure detected".
// This copy is only a fallback for when that call fails; it must stay in sync
// with backend/timeframes.py.
export const FALLBACK_LADDER = [
  { interval: '5m',  intraday: true,  ranges: ['1d', '5d', '1mo'], defaultRange: '5d', higherInterval: '1h' },
  { interval: '15m', intraday: true,  ranges: ['1d', '5d', '1mo'], defaultRange: '5d', higherInterval: '1h' },
  { interval: '30m', intraday: true,  ranges: ['5d', '1mo'], defaultRange: '1mo', higherInterval: '4h' },
  { interval: '1h',  intraday: true,  ranges: ['1mo', '3mo', '6mo', '1y', '2y'], defaultRange: '3mo', higherInterval: '4h' },
  // 4h no lo sirve el proveedor: el backend la compone juntando cuatro velas de 1h.
  { interval: '4h',  intraday: true,  ranges: ['3mo', '6mo', '1y', '2y'], defaultRange: '6mo', aggregatedFrom: '1h', higherInterval: '1d' },
  { interval: '1d',  intraday: false, ranges: ['1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd', 'max'], defaultRange: '6mo', higherInterval: '1wk' },
  { interval: '1wk', intraday: false, ranges: ['6mo', '1y', '2y', '5y', 'max'], defaultRange: '2y', higherInterval: '1mo' },
  { interval: '1mo', intraday: false, ranges: ['1y', '2y', '5y', 'max'], defaultRange: '5y', higherInterval: null },
];

/**
 * Cuántos minutos dura una vela de este intervalo.
 *
 * Se deriva de la etiqueta y no del escalón porque el escalón no publica esa
 * cifra: leerla de ahí caería siempre al valor por defecto y un gráfico de 5
 * minutos se refrescaría al ritmo de uno diario. `null` para lo que no se
 * reconozca — quien lo consuma decide, en vez de recibir un número inventado.
 */
export const intervalMinutes = (interval) => {
  const m = /^(\d+)(m|h|d|wk|mo)$/.exec(String(interval || ''));
  if (!m) return null;
  const n = Number(m[1]);
  const unit = { m: 1, h: 60, d: 1440, wk: 10080, mo: 43200 }[m[2]];
  return unit ? n * unit : null;
};

export const PERIOD_KEY = 'tcp_struct_period';        // persisted history window
export const INTERVAL_KEY = 'tcp_struct_interval';    // persisted candle size

// ── Backend codes → translation keys ────────────────────────────────────────
// Stable reason codes from the backend. It never ships prose it would then
// have to translate 10 times.
export const REASON_KEY = {
  multiTest: 'structWhyMultiTest', held: 'structWhyHeld', weak: 'structWhyWeak',
  recent: 'structWhyRecent', stale: 'structWhyStale', flip: 'structWhyFlip',
  inPlay: 'structWhyInPlay', untested: 'structWhyUntested',
  closedThrough: 'structWhyClosedThrough', followThrough: 'structWhyFollowThrough',
  expansion: 'structWhyExpansion', volume: 'structWhyVolume', retest: 'structWhyRetest',
  noData: 'structWhyNoData',
};

export const ORIGIN_KEY = {
  highs: 'structOriginHighs', lows: 'structOriginLows', mixed: 'structOriginMixed',
};

// En qué se fija el detector para cada patrón. Es lo primero que quiere saber
// quien compara el aviso con su gráfico.
export const BASIS_KEY = {
  body: 'structBasisBody', wicks: 'structBasisWicks', both: 'structBasisBoth',
};

// ── Colour maps ─────────────────────────────────────────────────────────────
export const TREND_UI = {
  uptrend:   { color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10', border: 'border-[#22c55e]/30', key: 'structTrendUp' },
  downtrend: { color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', key: 'structTrendDown' },
  range:     { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border',       key: 'structTrendRange' },
};

export const DIR_UI = {
  bullish: { color: 'text-[#22c55e]', icon: '↑' },
  bearish: { color: 'text-[#ef4444]', icon: '↓' },
};

export const LEVEL_UI = {
  resistance: { color: 'text-[#ef4444]', dot: 'bg-[#ef4444]', key: 'structLvlResistance' },
  support:    { color: 'text-[#22c55e]', dot: 'bg-[#22c55e]', key: 'structLvlSupport' },
  pivot:      { color: 'text-[#f59e0b]', dot: 'bg-[#f59e0b]', key: 'structLvlPivot' },
};

// ── Formatting ──────────────────────────────────────────────────────────────
// The backend rounds prices to six decimals because it does not know the
// instrument; 95.877786 on screen is noise. Decimals follow the magnitude, so
// an index, a stock and a satoshi-priced token all read cleanly.
export const fmtPrice = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const abs = Math.abs(Number(n));
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 3 : abs >= 0.01 ? 5 : 8;
  return Number(n).toFixed(decimals);
};

export const signed = (n) => (n > 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`);

// ── localStorage (guarded — private mode / quota safe) ───────────────────────
export const loadStored = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

export const store = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* no-op */ }
};
