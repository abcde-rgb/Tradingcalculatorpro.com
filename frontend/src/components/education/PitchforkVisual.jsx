import React from 'react';

// Language-neutral schematic SVGs for the "Andrews' Pitchfork" module. green =
// valid/median, blue = pivots, amber = highlighted line, red = failure/subjective,
// muted = context. The pitchfork = 3 parallels from 3 pivots.

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
const Pivot = ({ x, y, n }) => (<g><circle cx={x} cy={y} r="3" fill={NEUT} /><T x={x - 3} y={y - 5} fill={NEUT} fontSize="7">{n}</T></g>);

// P1 (anchor) at (28,86); P2 high (78,26); P3 low (78,86). Midpoint of P2P3 = (78,56).
// median from P1 through (78,56) extended; parallels offset by ±30 (the P2/P3 spread).
const MEDIAN = "28,86 210,41";     // through (78,56) direction
const UPPER = "78,26 210,11";
const LOWER = "78,86 210,71";

const VISUALS = {
  what: (
    <Frame label="pitchfork three parallel lines">
      <polyline points={UPPER} fill="none" stroke={MUT} strokeWidth="1.2" />
      <polyline points={MEDIAN} fill="none" stroke={GOOD} strokeWidth="1.6" />
      <polyline points={LOWER} fill="none" stroke={MUT} strokeWidth="1.2" />
      <line x1="78" y1="26" x2="78" y2="86" stroke={MUT} strokeWidth="0.7" strokeDasharray="2 2" />
      <T x="150" y="30" fill={MUT} fontSize="6.5">3 líneas paralelas</T>
      <T x="150" y="44" fill={GOOD} fontSize="6.5">mediana</T>
    </Frame>
  ),
  build: (
    <Frame label="drawn from 3 pivots">
      <polyline points={UPPER} fill="none" stroke={MUT} strokeWidth="1" />
      <polyline points={MEDIAN} fill="none" stroke={GOOD} strokeWidth="1.5" />
      <polyline points={LOWER} fill="none" stroke={MUT} strokeWidth="1" />
      <Pivot x={28} y={86} n="1" />
      <Pivot x={78} y={26} n="2" />
      <Pivot x={78} y={86} n="3" />
      <circle cx="78" cy="56" r="2" fill={HOT} />
      <T x="150" y="112" fill={MUT} fontSize="6">1 = ancla · mediana → punto medio de 2-3</T>
    </Frame>
  ),
  median: (
    <Frame label="price returns to the median line">
      <polyline points={MEDIAN} fill="none" stroke={GOOD} strokeWidth="1.8" />
      <polyline points="28,84 60,58 84,72 112,50 138,64 168,46 196,52" fill="none" stroke={MUT} strokeWidth="1.3" strokeLinejoin="round" />
      <T x="120" y="34" fill={GOOD} fontSize="6.5">imán: el precio vuelve a la mediana</T>
    </Frame>
  ),
  lines: (
    <Frame label="upper and lower parallels as channel">
      <polyline points={UPPER} fill="none" stroke={HOT} strokeWidth="1.3" />
      <polyline points={MEDIAN} fill="none" stroke={GOOD} strokeWidth="1.2" strokeDasharray="4 2" />
      <polyline points={LOWER} fill="none" stroke={HOT} strokeWidth="1.3" />
      <polyline points="80,80 104,64 120,78 150,52 168,64 196,40" fill="none" stroke={MUT} strokeWidth="1.2" />
      <circle cx="104" cy="64" r="2.4" fill={GOOD} />
      <T x="150" y="30" fill={HOT} fontSize="6.2">paralelas = soporte/resistencia</T>
    </Frame>
  ),
  schiff: (
    <Frame label="Schiff modified variant">
      <polyline points="28,86 78,26 78,86" fill="none" stroke={MUT} strokeWidth="0.8" strokeDasharray="2 2" />
      <polyline points="53,56 210,44" fill="none" stroke={NEUT} strokeWidth="1.6" />
      <polyline points="28,86 210,41" fill="none" stroke={MUT} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="53" cy="56" r="2.6" fill={NEUT} />
      <T x="60" y="52" fill={NEUT} fontSize="6.2">ancla movida (Schiff)</T>
      <T x="30" y="112" fill={MUT} fontSize="6">canales más realistas</T>
    </Frame>
  ),
  use: (
    <Frame label="bounce off a parallel toward median">
      <polyline points={UPPER} fill="none" stroke={MUT} strokeWidth="0.9" />
      <polyline points={MEDIAN} fill="none" stroke={GOOD} strokeWidth="1.5" />
      <polyline points={LOWER} fill="none" stroke={HOT} strokeWidth="1.3" />
      <polyline points="80,84 100,80 118,74 128,72 150,58 172,50" fill="none" stroke={GOOD} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="118" cy="74" r="2.6" fill={GOOD} />
      <T x="86" y="100" fill={GOOD} fontSize="6">rebota en la paralela → busca la mediana</T>
    </Frame>
  ),
  limits: (
    <Frame label="subjective pivot choice">
      <polyline points="28,86 210,41" fill="none" stroke={GOOD} strokeWidth="1.4" />
      <polyline points="40,92 210,58" fill="none" stroke={BAD} strokeWidth="1.4" strokeDasharray="4 2" />
      <Pivot x={28} y={86} n="1" />
      <circle cx="40" cy="92" r="2.6" fill={BAD} />
      <T x="120" y="34" fill={GOOD} fontSize="6.2">una horquilla…</T>
      <T x="70" y="112" fill={BAD} fontSize="6">…otro pivote, otra horquilla (subjetivo)</T>
    </Frame>
  ),
};

export function hasPitchforkVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function PitchforkVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
