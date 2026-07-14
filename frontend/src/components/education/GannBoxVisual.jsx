import React from 'react';

// Language-neutral schematic SVGs for the "Gann Box" module, keyed by item id.
// green = up/valid, red = down/invalid, blue = neutral/pivot, amber = the key
// 50% level / highlighted line, muted = grid & context. Everything is drawn as a
// price×time grid anchored on a swing pivot with the 1×1 (45°) diagonal.

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
// Small downward arrowhead
const ArrowDown = ({ x, y, c }) => <polygon points={`${x - 3},${y - 4} ${x + 3},${y - 4} ${x},${y}`} fill={c} />;

const VISUALS = {
  // What it is — box grid + 1×1 diagonal, 50% highlighted
  what: (
    <Frame label="Gann box grid and 1x1 diagonal">
      <rect x="42" y="22" width="164" height="76" fill="none" stroke={MUT} strokeWidth="1" />
      <line x1="42" y1="79" x2="206" y2="79" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      <line x1="42" y1="60" x2="206" y2="60" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <line x1="42" y1="41" x2="206" y2="41" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      <line x1="42" y1="98" x2="206" y2="22" stroke={GOOD} strokeWidth="1.7" />
      <circle cx="42" cy="98" r="2.6" fill={NEUT} />
      <T x="150" y="46" fill={GOOD} fontSize="7">1×1 · 45°</T>
      <T x="44" y="57" fill={HOT} fontSize="6.5">50%</T>
      <T x="18" y="14" fill={MUT} fontSize="6.5">rejilla precio × tiempo</T>
    </Frame>
  ),
  // Anchor — a swing low pivot where the box starts
  anchor: (
    <Frame label="anchor at a swing pivot">
      <polyline points="18,48 44,72 70,56 96,90 128,60 164,40 204,28" fill="none" stroke={MUT} strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="96" y="34" width="108" height="56" fill="none" stroke={GOOD} strokeWidth="1" strokeDasharray="4 2" />
      <circle cx="96" cy="90" r="3.4" fill={HOT} />
      <T x="18" y="14" fill={MUT} fontSize="6.5">ancla en un pivote claro</T>
      <T x="60" y="104" fill={HOT} fontSize="6.5">mínimo (swing low) → caja alcista</T>
    </Frame>
  ),
  // Build — 1 pivot · 2 drag · 3 scale to 45°
  build: (
    <Frame label="build steps anchor drag scale">
      <circle cx="46" cy="92" r="3" fill={HOT} />
      <T x="30" y="104" fill={HOT} fontSize="6">1·pivote</T>
      <line x1="46" y1="92" x2="150" y2="34" stroke={NEUT} strokeWidth="1.4" />
      <polygon points="150,34 143,37 147,42" fill={NEUT} />
      <T x="86" y="54" fill={NEUT} fontSize="6">2·arrastra</T>
      <rect x="46" y="34" width="152" height="58" fill="none" stroke={MUT} strokeWidth="0.8" />
      <line x1="46" y1="63" x2="198" y2="63" stroke={HOT} strokeWidth="0.8" strokeDasharray="4 2" />
      <T x="150" y="104" fill={GOOD} fontSize="6">3·escala 45°</T>
    </Frame>
  ),
  // Proportions — labelled 0/25/50/75/100 + 1×1 and 2×1 diagonals
  proportions: (
    <Frame label="proportions 0 25 50 75 100">
      <rect x="54" y="22" width="152" height="76" fill="none" stroke={MUT} strokeWidth="1" />
      <line x1="54" y1="79" x2="206" y2="79" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      <line x1="54" y1="60" x2="206" y2="60" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <line x1="54" y1="41" x2="206" y2="41" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      <line x1="54" y1="98" x2="206" y2="22" stroke={GOOD} strokeWidth="1.5" />
      <line x1="54" y1="98" x2="130" y2="22" stroke={NEUT} strokeWidth="1.3" />
      {[['100', 24], ['75', 43], ['50', 62], ['25', 81], ['0', 97]].map(([n, y]) => (
        <T key={n} x="34" y={y} fill={n === '50' ? HOT : MUT} fontSize="6.5">{n}</T>
      ))}
      <T x="150" y="52" fill={GOOD} fontSize="6.5">1×1</T>
      <T x="104" y="40" fill={NEUT} fontSize="6.5">2×1</T>
    </Frame>
  ),
  // Levels — price reacts (bounce) at 50% then 25%
  levels: (
    <Frame label="price reacts at gann levels">
      <line x1="20" y1="52" x2="222" y2="52" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <line x1="20" y1="86" x2="222" y2="86" stroke={MUT} strokeWidth="0.7" strokeDasharray="3 2" />
      <T x="20" y="48" fill={HOT} fontSize="6.5">50%</T>
      <T x="20" y="98" fill={MUT} fontSize="6.5">25%</T>
      <Candle x={54} hi={30} lo={50} bt={34} bb={46} c={BAD} />
      <Candle x={84} hi={38} lo={56} bt={44} bb={51} c={BAD} />
      <Candle x={114} hi={40} lo={58} bt={48} bb={52} c={GOOD} />
      <T x="120" y="44" fill={GOOD} fontSize="6.5">rechazo</T>
      <Candle x={150} hi={34} lo={52} bt={40} bb={48} c={GOOD} />
      <Candle x={186} hi={26} lo={46} bt={30} bb={42} c={GOOD} />
    </Frame>
  ),
  // Close — a body close below 50% (bearish) vs a wick fakeout
  close: (
    <Frame label="close below level versus wick fakeout">
      <line x1="18" y1="52" x2="222" y2="52" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <T x="18" y="48" fill={HOT} fontSize="6.5">50%</T>
      {/* fakeout: long lower wick pierces, body stays above */}
      <Candle x={74} hi={34} lo={78} bt={38} bb={48} c={GOOD} />
      <T x="52" y="90" fill={MUT} fontSize="6">mecha = falso</T>
      {/* real: body closes below the line */}
      <Candle x={150} hi={40} lo={74} bt={46} bb={70} c={BAD} />
      <ArrowDown x={150} y={96} c={BAD} />
      <line x1="150" y1="74" x2="150" y2="92" stroke={BAD} strokeWidth="1" strokeDasharray="2 2" />
      <T x="120" y="18" fill={BAD} fontSize="6.5">cierre &lt; 50% → 25%</T>
    </Frame>
  ),
  // Timeframes — HTF box (strong) vs LTF box (noisy)
  timeframes: (
    <Frame label="higher timeframe levels are stronger">
      <rect x="24" y="24" width="88" height="74" fill="none" stroke={GOOD} strokeWidth="1.5" />
      <line x1="24" y1="61" x2="112" y2="61" stroke={GOOD} strokeWidth="1.1" strokeDasharray="4 2" />
      <T x="26" y="18" fill={GOOD} fontSize="6.5">diario · fiable</T>
      <rect x="150" y="52" width="56" height="46" fill="none" stroke={MUT} strokeWidth="0.8" />
      <line x1="150" y1="75" x2="206" y2="75" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      <T x="150" y="46" fill={MUT} fontSize="6.5">5m · ruido</T>
      <T x="24" y="112" fill={MUT} fontSize="6">marco alto = niveles que respeta más gente</T>
    </Frame>
  ),
  // Myth vs reality — institutions/crystal ball (✗) vs self-fulfilling consensus (✓)
  myth: (
    <Frame label="myth versus reality">
      <circle cx="58" cy="50" r="20" fill="none" stroke={BAD} strokeWidth="1.5" />
      <line x1="44" y1="36" x2="72" y2="64" stroke={BAD} strokeWidth="1.5" />
      <T x="28" y="88" fill={BAD} fontSize="6">instituciones /</T>
      <T x="30" y="97" fill={BAD} fontSize="6">bola de cristal</T>
      <polyline points="140,52 150,62 172,38" fill="none" stroke={GOOD} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <T x="126" y="88" fill={GOOD} fontSize="6">50% lo mira todo</T>
      <T x="126" y="97" fill={GOOD} fontSize="6">el mundo → real</T>
    </Frame>
  ),
};

export function hasGannBoxVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function GannBoxVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
