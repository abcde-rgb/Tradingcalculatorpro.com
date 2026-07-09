import React from 'react';

// Small, language-neutral inline SVG diagrams for the most visual glossary
// terms. Keyed by the 1-based glossary index (stable across languages), so the
// same concept gets the same drawing in every locale. Terms without a diagram
// simply render nothing. Colours are explicit (readable on the dark card bg).

const BULL = '#22c55e';   // green – up / buy
const BEAR = '#ef4444';   // red – down / sell
const NEUT = '#60a5fa';   // blue – neutral / price
const LINE = '#64748b';   // slate – guide lines
const DASH = '#94a3b8';   // light slate – dashed / labels

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 200 92" className="w-full h-16" role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">
    {children}
  </svg>
);

const T = (props) => <text fontSize="9" fontFamily="monospace" {...props} />;

// One candlestick. y grows downward: pass pixel y's directly.
const Candle = ({ x, bodyTop, bodyBot, high, low, color, w = 11 }) => (
  <g stroke={color} strokeWidth="2" fill={color}>
    <line x1={x} y1={high} x2={x} y2={low} />
    <rect x={x - w / 2} y={bodyTop} width={w} height={Math.max(bodyBot - bodyTop, 2)} rx="1" />
  </g>
);

const VISUALS = {
  // 1 · Spread — the gap between ask (buy) and bid (sell)
  1: (
    <Frame label="spread">
      <line x1="18" y1="30" x2="120" y2="30" stroke={BEAR} strokeWidth="2.5" />
      <line x1="18" y1="62" x2="120" y2="62" stroke={BULL} strokeWidth="2.5" />
      <T x="122" y="33" fill={BEAR}>ASK</T>
      <T x="122" y="65" fill={BULL}>BID</T>
      <line x1="150" y1="30" x2="150" y2="62" stroke={DASH} strokeWidth="1.5" markerEnd="" />
      <path d="M147 34 L150 30 L153 34" fill="none" stroke={DASH} strokeWidth="1.5" />
      <path d="M147 58 L150 62 L153 58" fill="none" stroke={DASH} strokeWidth="1.5" />
      <T x="158" y="49" fill={DASH}>spread</T>
    </Frame>
  ),
  // 8 · Stop-loss (trade anatomy: entry / SL / TP)
  8: (
    <Frame label="stop-loss">
      <line x1="15" y1="18" x2="140" y2="18" stroke={BULL} strokeWidth="2" strokeDasharray="4 3" />
      <line x1="15" y1="46" x2="140" y2="46" stroke={DASH} strokeWidth="2" strokeDasharray="4 3" />
      <line x1="15" y1="76" x2="140" y2="76" stroke={BEAR} strokeWidth="2" strokeDasharray="4 3" />
      <T x="145" y="21" fill={BULL}>TP</T>
      <T x="145" y="49" fill={DASH}>IN</T>
      <T x="145" y="79" fill={BEAR}>SL</T>
      <polyline points="20,46 45,40 65,52 90,30 120,20" fill="none" stroke={NEUT} strokeWidth="2" />
    </Frame>
  ),
  // 9 · Take-profit — reuse trade anatomy
  9: null, // set below (alias)
  // 10 · Break-even — SL moved up to entry
  10: (
    <Frame label="break-even">
      <line x1="15" y1="30" x2="150" y2="30" stroke={DASH} strokeWidth="2" strokeDasharray="4 3" />
      <T x="153" y="33" fill={DASH}>IN=SL</T>
      <polyline points="20,30 50,26 75,30 100,18 130,14" fill="none" stroke={BULL} strokeWidth="2" />
      <path d="M150 30 L170 30" stroke={BULL} strokeWidth="0" />
    </Frame>
  ),
  // 13 · R:R — risk vs reward bars
  13: (
    <Frame label="risk-reward">
      <rect x="45" y="52" width="34" height="26" fill={BEAR} opacity="0.85" rx="1" />
      <rect x="110" y="14" width="34" height="64" fill={BULL} opacity="0.85" rx="1" />
      <T x="49" y="90" fill={BEAR}>1R</T>
      <T x="112" y="90" fill={BULL}>2R+</T>
    </Frame>
  ),
  // 17 · Gap — jump between two sessions
  17: (
    <Frame label="gap">
      <Candle x="45" bodyTop="52" bodyBot="70" high="44" low="78" color={BEAR} />
      <rect x="62" y="30" width="60" height="18" fill={DASH} opacity="0.18" />
      <line x1="62" y1="48" x2="122" y2="48" stroke={DASH} strokeWidth="1" strokeDasharray="3 2" />
      <line x1="62" y1="30" x2="122" y2="30" stroke={DASH} strokeWidth="1" strokeDasharray="3 2" />
      <T x="126" y="42" fill={DASH}>gap</T>
      <Candle x="150" bodyTop="14" bodyBot="28" high="8" low="34" color={BULL} />
    </Frame>
  ),
  // 18 · Long — bet on price going up
  18: (
    <Frame label="long">
      <polyline points="20,74 55,60 90,64 125,34 165,16" fill="none" stroke={BULL} strokeWidth="2.5" />
      <path d="M150 16 L165 16 L165 31" fill="none" stroke={BULL} strokeWidth="2.5" />
      <path d="M150 14 L166 14 L166 30 Z" fill={BULL} opacity="0.15" />
    </Frame>
  ),
  // 19 · Short — bet on price going down
  19: (
    <Frame label="short">
      <polyline points="20,18 55,32 90,28 125,58 165,76" fill="none" stroke={BEAR} strokeWidth="2.5" />
      <path d="M150 76 L165 76 L165 61" fill="none" stroke={BEAR} strokeWidth="2.5" />
    </Frame>
  ),
  // 23 · Candlestick — bull vs bear body
  23: (
    <Frame label="candlestick">
      <Candle x="70" bodyTop="30" bodyBot="62" high="16" low="78" color={BULL} w="16" />
      <Candle x="130" bodyTop="28" bodyBot="60" high="14" low="76" color={BEAR} w="16" />
      <T x="52" y="90" fill={BULL}>up</T>
      <T x="118" y="90" fill={BEAR}>down</T>
    </Frame>
  ),
  // 25 · Wick — the high/low shadows
  25: (
    <Frame label="wick">
      <rect x="88" y="38" width="22" height="20" fill={NEUT} opacity="0.25" rx="1" />
      <line x1="99" y1="10" x2="99" y2="38" stroke={NEUT} strokeWidth="3" />
      <line x1="99" y1="58" x2="99" y2="84" stroke={NEUT} strokeWidth="3" />
      <T x="120" y="22" fill={NEUT}>wick</T>
      <T x="120" y="78" fill={NEUT}>wick</T>
    </Frame>
  ),
  // 26 · Body — open-to-close range
  26: (
    <Frame label="body">
      <line x1="99" y1="12" x2="99" y2="34" stroke={DASH} strokeWidth="2" opacity="0.5" />
      <line x1="99" y1="60" x2="99" y2="82" stroke={DASH} strokeWidth="2" opacity="0.5" />
      <rect x="86" y="34" width="26" height="26" fill={BULL} rx="1" />
      <T x="120" y="50" fill={BULL}>body</T>
    </Frame>
  ),
  // 28 · Support — floor where buyers step in
  28: (
    <Frame label="support">
      <line x1="14" y1="66" x2="186" y2="66" stroke={BULL} strokeWidth="2.5" />
      <polyline points="20,30 46,64 72,40 104,64 130,36 160,62 182,34"
                fill="none" stroke={NEUT} strokeWidth="1.8" />
    </Frame>
  ),
  // 29 · Resistance — ceiling where sellers step in
  29: (
    <Frame label="resistance">
      <line x1="14" y1="26" x2="186" y2="26" stroke={BEAR} strokeWidth="2.5" />
      <polyline points="20,62 46,28 72,52 104,28 130,56 160,30 182,58"
                fill="none" stroke={NEUT} strokeWidth="1.8" />
    </Frame>
  ),
  // 30 · Trend — higher highs & higher lows + trendline
  30: (
    <Frame label="trend">
      <polyline points="18,78 44,54 66,66 96,36 120,48 152,20 182,30"
                fill="none" stroke={BULL} strokeWidth="2" />
      <line x1="18" y1="82" x2="182" y2="34" stroke={DASH} strokeWidth="1.5" strokeDasharray="4 3" />
    </Frame>
  ),
  // 31 · Range — price boxed between two levels
  31: (
    <Frame label="range">
      <line x1="14" y1="24" x2="186" y2="24" stroke={BEAR} strokeWidth="2" />
      <line x1="14" y1="70" x2="186" y2="70" stroke={BULL} strokeWidth="2" />
      <polyline points="20,68 48,28 78,66 108,28 138,68 168,28 184,50"
                fill="none" stroke={NEUT} strokeWidth="1.8" />
    </Frame>
  ),
  // 32 · Breakout — price escapes the range
  32: (
    <Frame label="breakout">
      <line x1="14" y1="34" x2="120" y2="34" stroke={BEAR} strokeWidth="2" strokeDasharray="4 3" />
      <polyline points="20,60 44,40 66,58 92,38 116,42 150,20 180,10"
                fill="none" stroke={BULL} strokeWidth="2.2" />
      <path d="M168 12 L180 10 L178 22" fill="none" stroke={BULL} strokeWidth="2.2" />
    </Frame>
  ),
  // 33 · Pullback — a pause against the trend before it resumes
  33: (
    <Frame label="pullback">
      <polyline points="18,76 52,34 78,56 150,14" fill="none" stroke={BULL} strokeWidth="2.2" />
      <line x1="52" y1="34" x2="78" y2="56" stroke={BEAR} strokeWidth="2.5" />
      <circle cx="78" cy="56" r="3.5" fill={BEAR} />
      <T x="84" y="60" fill={BEAR}>pullback</T>
    </Frame>
  ),
  // 34 · Moving average — smooth line over jagged price
  34: (
    <Frame label="moving-average">
      <polyline points="16,60 34,40 50,66 70,34 90,58 112,30 134,54 158,26 184,40"
                fill="none" stroke={LINE} strokeWidth="1.5" opacity="0.8" />
      <path d="M16,58 C60,52 90,44 130,40 C155,37 172,36 184,36"
            fill="none" stroke={NEUT} strokeWidth="2.5" />
    </Frame>
  ),
  // 52 · Divergence — price up, momentum down
  52: (
    <Frame label="divergence">
      <polyline points="16,44 60,30 110,40 168,20" fill="none" stroke={NEUT} strokeWidth="2" />
      <line x1="60" y1="30" x2="168" y2="20" stroke={BULL} strokeWidth="1.3" strokeDasharray="3 2" />
      <polyline points="16,72 60,60 110,66 168,78" fill="none" stroke={DASH} strokeWidth="2" />
      <line x1="60" y1="60" x2="168" y2="78" stroke={BEAR} strokeWidth="1.3" strokeDasharray="3 2" />
      <T x="172" y="23" fill={BULL}>HH</T>
      <T x="172" y="81" fill={BEAR}>LH</T>
    </Frame>
  ),
  // 53 · Fibonacci — retracement levels of a move
  53: (
    <Frame label="fibonacci">
      {[['0', 18, DASH], ['.382', 34, LINE], ['.5', 48, NEUT], ['.618', 62, LINE], ['1', 78, DASH]].map(([lab, y, c]) => (
        <g key={lab}>
          <line x1="14" y1={y} x2="150" y2={y} stroke={c} strokeWidth="1.4" />
          <T x="154" y={y + 3} fill={c}>{lab}</T>
        </g>
      ))}
      <polyline points="20,78 40,18 70,62 96,40" fill="none" stroke={BULL} strokeWidth="2" />
    </Frame>
  ),
};
// Take-profit shares the trade-anatomy drawing with stop-loss.
VISUALS[9] = VISUALS[8];

export function hasGlossaryVisual(n) {
  return Boolean(VISUALS[n]);
}

export default function GlossaryVisual({ n, className = '' }) {
  const svg = VISUALS[n];
  if (!svg) return null;
  return (
    <div className={`mt-2 rounded-md bg-background/60 border border-border/60 px-2 py-1.5 ${className}`}>
      {svg}
    </div>
  );
}
