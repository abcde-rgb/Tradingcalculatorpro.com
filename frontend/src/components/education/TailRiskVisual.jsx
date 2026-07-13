import React from 'react';

// Language-neutral schematic SVGs for "Fat tails & tail risk", keyed by item id.
// red = danger/loss tail, green = the protective/convex side, blue = neutral,
// amber = the key insight, muted = the (misleading) normal model.

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
const Line = ({ pts, c, w = 2, dash }) => (
  <polyline points={pts} fill="none" stroke={c} strokeWidth={w} strokeLinejoin="round"
            strokeLinecap="round" strokeDasharray={dash} />
);

const VISUALS = {
  // Normal bell (thin tails) vs fat-tailed reality
  normal: (
    <Frame label="normal bell versus fat tails">
      <line x1="14" y1="96" x2="226" y2="96" stroke={MUT} strokeWidth="0.6" />
      <Line pts="30,96 60,94 84,80 104,46 120,30 136,46 156,80 180,94 210,96" c={MUT} w={1.4} dash="4 3" />
      <Line pts="16,86 46,82 76,72 102,44 120,30 138,44 164,72 194,82 224,86" c={BAD} w={1.8} />
      <T x="16" y="76" fill={BAD} fontSize="6.5">colas</T>
      <T x="196" y="76" fill={BAD} fontSize="6.5">gordas</T>
      <T x="120" y="112" textAnchor="middle" fill={MUT} fontSize="6.5">campana (- -) subestima los extremos</T>
    </Frame>
  ),
  // Black swan — calm then sudden crash
  blackswan: (
    <Frame label="black swan sudden crash">
      <Line pts="16,46 42,44 68,48 94,45 120,49 144,46 160,50" c={NEUT} w={1.6} />
      <Line pts="160,50 176,58 186,102 202,80" c={BAD} w={2} />
      <circle cx="186" cy="102" r="3" fill="#0a0a0a" stroke={BAD} strokeWidth="1" />
      <T x="20" y="30" fill={MUT} fontSize="6.5">calma…</T>
      <T x="150" y="112" fill={BAD} fontSize="6.5">cisne negro</T>
    </Frame>
  ),
  // Frequency — tails heavier than the normal predicts
  frequency: (
    <Frame label="sigma events happen more often">
      <line x1="14" y1="96" x2="226" y2="96" stroke={MUT} strokeWidth="0.6" />
      {[['20', 8, MUT], ['44', 16, MUT], ['74', 40, NEUT], ['104', 60, NEUT], ['134', 40, NEUT], ['164', 16, MUT], ['196', 10, BAD]].map(([x, h, c], i) => (
        <rect key={i} x={+x} y={96 - h} width="16" height={h} rx="1" fill={c} opacity="0.8" />
      ))}
      <rect x="20" y="86" width="16" height="10" rx="1" fill={BAD} opacity="0.85" />
      <Line pts="24,90 50,80 88,44 112,34 140,44 178,80 210,90" c={MUT} w={1.2} dash="3 3" />
      <T x="14" y="16" fill={BAD} fontSize="6.5">las colas pesan más de lo previsto</T>
    </Frame>
  ),
  // Ruin — equity to zero hits an absorbing barrier
  ruin: (
    <Frame label="risk of ruin absorbing barrier">
      <line x1="16" y1="100" x2="224" y2="100" stroke={BAD} strokeWidth="1.4" strokeDasharray="5 3" />
      <T x="18" y="112" fill={BAD} fontSize="6.5">cuenta a 0 = fin (no hay media que recupere)</T>
      <Line pts="16,40 44,58 66,48 92,74 112,64 140,86 160,92 182,100" c={NEUT} w={1.8} />
      <circle cx="182" cy="100" r="3" fill={BAD} />
      <T x="20" y="26" fill={MUT} fontSize="6.5">equity</T>
    </Frame>
  ),
  // Convexity — small capped losses, large uncapped gains
  convexity: (
    <Frame label="convex payoff">
      <line x1="16" y1="72" x2="224" y2="72" stroke={MUT} strokeWidth="0.6" />
      <Line pts="16,78 60,76 100,72 140,60 180,38 220,12" c={GOOD} w={2} />
      <T x="150" y="30" fill={GOOD} fontSize="6.5">gana mucho (cola buena)</T>
      <T x="20" y="90" fill={MUT} fontSize="6.5">pierde poco y acotado</T>
      <T x="16" y="18" fill={HOT} fontSize="6.5">convexidad = seguro de cola</T>
    </Frame>
  ),
  // Barbell — safe majority + tiny risky, nothing in the middle
  barbell: (
    <Frame label="barbell allocation">
      <rect x="16" y="40" width="60" height="52" rx="3" fill={GOOD} opacity="0.25" stroke={GOOD} />
      <T x="46" y="62" textAnchor="middle" fill={GOOD} fontSize="7">muy seguro</T>
      <T x="46" y="74" textAnchor="middle" fill={GOOD} fontSize="7">~90%</T>
      <rect x="100" y="58" width="40" height="16" fill={MUT} opacity="0.2" />
      <line x1="118" y1="66" x2="122" y2="66" stroke={MUT} strokeWidth="1" />
      <rect x="164" y="48" width="60" height="36" rx="3" fill={BAD} opacity="0.2" stroke={BAD} />
      <T x="194" y="64" textAnchor="middle" fill={BAD} fontSize="7">convexo</T>
      <T x="194" y="76" textAnchor="middle" fill={BAD} fontSize="7">~10%</T>
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="6.5">nada en el centro engañoso</T>
    </Frame>
  ),
};

export function hasTailRiskVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function TailRiskVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
