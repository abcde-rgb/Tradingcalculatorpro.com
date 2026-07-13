import React from 'react';

// Language-neutral schematic SVGs for the "Price action" module, keyed by item
// id. green = bullish candle/up, red = bearish/down, blue = neutral, amber =
// the highlighted bar/level, muted = context. Drawn as bare candles (no
// indicators), matching the "read the raw price" theme.

const GOOD = '#22c55e';
const BAD = '#ef4444';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 240 118" className="w-full h-28" role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">{children}</svg>
);
const T = (p) => <text fontSize="8" fontFamily="monospace" {...p} />;

// A candle: x centre, hi/lo wick ends, bt/bb body top/bottom, colour, width
const Candle = ({ x, hi, lo, bt, bb, c, w = 10 }) => (
  <g>
    <line x1={x} y1={hi} x2={x} y2={lo} stroke={c} strokeWidth="1.4" />
    <rect x={x - w / 2} y={Math.min(bt, bb)} width={w} height={Math.max(2, Math.abs(bb - bt))} rx="1" fill={c} />
  </g>
);

const VISUALS = {
  // Bare price — a clean candlestick chart, no indicators
  what: (
    <Frame label="raw price no indicators">
      <Candle x={34} hi={70} lo={96} bt={80} bb={92} c={BAD} />
      <Candle x={64} hi={58} lo={90} bt={64} bb={84} c={GOOD} />
      <Candle x={94} hi={50} lo={78} bt={56} bb={72} c={GOOD} />
      <Candle x={124} hi={54} lo={82} bt={70} bb={76} c={BAD} />
      <Candle x={154} hi={38} lo={72} bt={44} bb={66} c={GOOD} />
      <Candle x={184} hi={30} lo={58} bt={36} bb={52} c={GOOD} />
      <T x="16" y="14" fill={MUT} fontSize="7">solo precio — sin indicadores</T>
    </Frame>
  ),
  // Inside bar — a small bar inside the previous bar's range
  inside: (
    <Frame label="inside bar within mother range">
      <Candle x={80} hi={24} lo={104} bt={40} bb={92} c={NEUT} w={16} />
      <line x1="52" y1="24" x2="150" y2="24" stroke={MUT} strokeWidth="0.7" strokeDasharray="3 2" />
      <line x1="52" y1="104" x2="150" y2="104" stroke={MUT} strokeWidth="0.7" strokeDasharray="3 2" />
      <Candle x={140} hi={54} lo={82} bt={60} bb={76} c={HOT} w={12} />
      <T x="150" y="52" fill={HOT} fontSize="6.5">interior</T>
      <T x="40" y="18" fill={MUT} fontSize="6.5">máx y mín dentro de la madre</T>
    </Frame>
  ),
  // Outside bar — engulfs the previous bar (higher high, lower low)
  outside: (
    <Frame label="outside mother bar engulfs previous">
      <Candle x={78} hi={48} lo={74} bt={54} bb={68} c={MUT} w={11} />
      <Candle x={150} hi={30} lo={96} bt={44} bb={86} c={GOOD} w={18} />
      <line x1="120" y1="30" x2="182" y2="30" stroke={GOOD} strokeWidth="0.7" strokeDasharray="3 2" />
      <line x1="120" y1="96" x2="182" y2="96" stroke={GOOD} strokeWidth="0.7" strokeDasharray="3 2" />
      <T x="150" y="24" fill={GOOD} fontSize="6.5">máx mayor · mín menor</T>
      <T x="40" y="108" fill={MUT} fontSize="6.5">cuerpo grande = más fuerza</T>
    </Frame>
  ),
  // Trend — higher highs & higher lows staircase
  trend: (
    <Frame label="higher highs higher lows">
      <polyline points="20,96 50,60 74,78 104,42 128,58 158,26 184,40 214,16" fill="none" stroke={GOOD} strokeWidth="1.8" strokeLinejoin="round" />
      {[[50, 60], [104, 42], [158, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={GOOD} />)}
      {[[74, 78], [128, 58], [184, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={NEUT} />)}
      <T x="150" y="14" fill={GOOD} fontSize="6.5">máximos ↑</T>
      <T x="20" y="112" fill={NEUT} fontSize="6.5">mínimos ↑ → tendencia alcista</T>
    </Frame>
  ),
  // Higher timeframe first — one big candle contains several small ones
  htf: (
    <Frame label="higher timeframe contains lower">
      <Candle x={54} hi={22} lo={104} bt={36} bb={92} c={NEUT} w={26} />
      <T x="30" y="16" fill={NEUT} fontSize="6.5">diario</T>
      {[[120, 78, 88, 82], [142, 62, 84, 70], [164, 54, 74, 60], [186, 40, 66, 48], [208, 34, 58, 40]].map(([x, hi, lo, bt], i) => (
        <Candle key={i} x={x} hi={hi} lo={lo} bt={bt} bb={bt + 6} c={i % 2 ? GOOD : BAD} w={7} />
      ))}
      <T x="150" y="108" fill={MUT} fontSize="6.5">define arriba, afina abajo</T>
    </Frame>
  ),
  // Confluence — a hammer sitting on a horizontal support level
  confluence: (
    <Frame label="pattern at a support level">
      <line x1="18" y1="82" x2="222" y2="82" stroke={HOT} strokeWidth="1.5" strokeDasharray="5 3" />
      <T x="20" y="78" fill={HOT} fontSize="6.5">soporte</T>
      <Candle x={44} hi={40} lo={60} bt={46} bb={56} c={BAD} />
      <Candle x={78} hi={48} lo={66} bt={52} bb={62} c={BAD} />
      <Candle x={120} hi={58} lo={92} bt={64} bb={72} c={GOOD} />
      <T x="130" y="66" fill={GOOD} fontSize="6.5">martillo</T>
      <Candle x={158} hi={44} lo={70} bt={50} bb={64} c={GOOD} />
      <Candle x={192} hi={30} lo={58} bt={36} bb={50} c={GOOD} />
      <T x="20" y="112" fill={MUT} fontSize="6.5">patrón + nivel = alta probabilidad</T>
    </Frame>
  ),
};

export function hasPriceActionVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function PriceActionVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
