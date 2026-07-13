import React from 'react';

// Language-neutral schematic SVGs for "Dealer positioning & gamma", keyed by
// item id. green = up/positive, red = down/amplified, blue = neutral, amber =
// the key insight, muted = context.

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
const Node = ({ x, y, w, c, label }) => (
  <g>
    <rect x={x} y={y} width={w} height="20" rx="3" fill={c} opacity="0.15" stroke={c} strokeWidth="0.9" />
    <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={c}>{label}</text>
  </g>
);

const VISUALS = {
  // The dealer sits between flow and hedges delta in the underlying
  mm: (
    <Frame label="dealer hedges delta neutral">
      <Node x={8} y={48} w={62} c={MUT} label="retail/inst" />
      <Node x={90} y={48} w={60} c={NEUT} label="dealer" />
      <Node x={170} y={48} w={62} c={HOT} label="subyacente" />
      <line x1="70" y1="58" x2="90" y2="58" stroke={MUT} strokeWidth="1.2" markerEnd="url(#a)" />
      <line x1="150" y1="58" x2="170" y2="58" stroke={HOT} strokeWidth="1.2" />
      <path d="M164 54 l6 4 -6 4" fill="none" stroke={HOT} strokeWidth="1.2" />
      <path d="M84 54 l6 4 -6 4" fill="none" stroke={MUT} strokeWidth="1.2" />
      <T x="120" y="40" textAnchor="middle" fill={NEUT} fontSize="6.5">cubre su delta → neutral</T>
      <T x="120" y="84" textAnchor="middle" fill={MUT} fontSize="6.5">su cobertura deja huella en el precio</T>
    </Frame>
  ),
  // Positive vs negative gamma regimes
  gamma: (
    <Frame label="positive versus negative gamma">
      <line x1="120" y1="14" x2="120" y2="104" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 3" />
      <line x1="14" y1="58" x2="112" y2="58" stroke={MUT} strokeWidth="0.6" />
      <Line pts="16,58 32,50 48,64 64,52 80,62 96,54 110,58" c={GOOD} w={1.6} />
      <T x="18" y="24" fill={GOOD} fontSize="6.5">+gamma: amortigua</T>
      <Line pts="128,58 146,44 164,74 182,32 200,86 220,20" c={BAD} w={1.6} />
      <T x="132" y="24" fill={BAD} fontSize="6.5">−gamma: amplifica</T>
    </Frame>
  ),
  // Pinning to a high-OI strike near expiry
  pin: (
    <Frame label="pinning to a strike at expiry">
      <line x1="16" y1="60" x2="224" y2="60" stroke={HOT} strokeWidth="1.4" strokeDasharray="5 3" />
      <T x="18" y="54" fill={HOT} fontSize="6.5">strike (mucho interés abierto)</T>
      <Line pts="16,36 44,78 74,44 104,72 134,50 164,66 196,58 224,60" c={NEUT} w={1.6} />
      <circle cx="224" cy="60" r="3" fill={HOT} />
      <T x="150" y="80" fill={MUT} fontSize="6.5">imán / max pain</T>
    </Frame>
  ),
  // Gamma squeeze — self-reinforcing upward loop
  squeeze: (
    <Frame label="gamma squeeze feedback loop">
      <Line pts="18,96 52,90 70,66 104,60 122,38 156,32 174,18 210,10" c={GOOD} w={2} />
      {[[70, 66], [122, 38], [174, 18]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={GOOD} />)}
      <T x="20" y="110" fill={MUT} fontSize="6.5">sube → dealers compran → sube más</T>
      <T x="120" y="14" fill={GOOD} fontSize="6.5">bucle</T>
    </Frame>
  ),
  // Vanna — falling IV pushes dealers to buy
  vanna: (
    <Frame label="vanna falling IV lifts price">
      <Line pts="16,30 60,42 104,56 150,68 196,80 224,86" c={NEUT} w={1.6} />
      <T x="18" y="24" fill={NEUT} fontSize="6.5">IV baja ↓</T>
      <Line pts="16,90 60,80 104,66 150,52 196,36 224,28" c={GOOD} w={1.8} />
      <T x="150" y="24" fill={GOOD} fontSize="6.5">precio sube ↑</T>
      <path d="M120 60 l0 -8" stroke={HOT} strokeWidth="1" />
      <path d="M117 55 l3 -5 3 5" fill={HOT} />
    </Frame>
  ),
  // Charm — OPEX drift as delta decays toward expiry
  charm: (
    <Frame label="charm OPEX drift into expiry">
      <line x1="196" y1="14" x2="196" y2="104" stroke={BAD} strokeWidth="1" strokeDasharray="4 3" />
      <T x="176" y="112" fill={BAD} fontSize="6.5">OPEX</T>
      <line x1="16" y1="98" x2="224" y2="98" stroke={MUT} strokeWidth="0.6" />
      <Line pts="16,78 60,74 104,66 150,54 196,36" c={GOOD} w={1.8} />
      <T x="20" y="26" fill={MUT} fontSize="6.5">delta → 1: dealers compran</T>
      <T x="60" y="90" fill={GOOD} fontSize="6.5">drift alcista</T>
    </Frame>
  ),
  // 0DTE / OPEX — pinned then a violent break
  zerodte: (
    <Frame label="0DTE pin then violent break">
      <Line pts="16,60 44,58 72,62 100,58 128,60 150,58" c={NEUT} w={1.6} />
      <T x="20" y="50" fill={NEUT} fontSize="6.5">fijado (gamma alta)</T>
      <Line pts="150,58 168,54 182,30 196,86 214,20" c={BAD} w={1.8} />
      <T x="150" y="108" fill={BAD} fontSize="6.5">si rompe el nivel → violento</T>
    </Frame>
  ),
};

export function hasGammaExposureVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function GammaExposureVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
