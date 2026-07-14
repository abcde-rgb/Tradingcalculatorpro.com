import React from 'react';

// Language-neutral schematic SVGs for the "Wolfe Waves" module. green = target/
// valid, blue = wave points, amber = entry (wave 5), red = subjective/failure,
// muted = price/context. A Wolfe wave = 5 points projecting a target line.

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
const ZIG = "34,36 64,82 102,52 140,84 168,102";
const Pt = ({ x, y, n, c = NEUT }) => (<g><circle cx={x} cy={y} r="3" fill={c} /><T x={x - 2} y={y - 5} fill={c} fontSize="7">{n}</T></g>);

const VISUALS = {
  what: (
    <Frame label="five wave wolfe pattern with target">
      <polyline points={ZIG} fill="none" stroke={MUT} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="34" y1="40" x2="216" y2="88" stroke={GOOD} strokeWidth="1.4" strokeDasharray="5 3" />
      <path d="M168,102 Q188,96 208,90" fill="none" stroke={GOOD} strokeWidth="1.6" />
      <polygon points="208,90 201,90 204,96" fill={GOOD} />
      <T x="16" y="14" fill={MUT} fontSize="6.2">5 ondas que proyectan una línea objetivo</T>
    </Frame>
  ),
  structure: (
    <Frame label="labelled waves 1 to 5">
      <polyline points={ZIG} fill="none" stroke={MUT} strokeWidth="1.4" strokeLinejoin="round" />
      <Pt x={34} y={36} n="1" /><Pt x={64} y={82} n="2" /><Pt x={102} y={52} n="3" />
      <Pt x={140} y={84} n="4" /><Pt x={168} y={102} n="5" c={HOT} />
      <T x="16" y="112" fill={MUT} fontSize="6">la onda 5 sobrepasa la línea 1-3</T>
    </Frame>
  ),
  line: (
    <Frame label="target line 1-4 and entry line 1-3">
      <polyline points={ZIG} fill="none" stroke={MUT} strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="34" y1="36" x2="200" y2="74" stroke={NEUT} strokeWidth="1.2" strokeDasharray="4 2" />
      <T x="150" y="66" fill={NEUT} fontSize="6">línea 1-3 (dispara en 5)</T>
      <line x1="34" y1="40" x2="216" y2="88" stroke={GOOD} strokeWidth="1.5" />
      <T x="150" y="98" fill={GOOD} fontSize="6">línea 1-4 = objetivo (precio y tiempo)</T>
    </Frame>
  ),
  rules: (
    <Frame label="channel and wave 5 overshoot">
      <line x1="34" y1="36" x2="180" y2="94" stroke={MUT} strokeWidth="0.9" strokeDasharray="3 2" />
      <line x1="64" y1="82" x2="200" y2="60" stroke={MUT} strokeWidth="0.9" strokeDasharray="3 2" />
      <polyline points={ZIG} fill="none" stroke={NEUT} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="168" cy="102" r="3.4" fill={HOT} />
      <T x="16" y="14" fill={MUT} fontSize="6">3-4 dentro del canal · 5 hace el barrido</T>
    </Frame>
  ),
  use: (
    <Frame label="buy wave 5 target 1-4 line">
      <polyline points={ZIG} fill="none" stroke={MUT} strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="34" y1="40" x2="216" y2="88" stroke={GOOD} strokeWidth="1.3" strokeDasharray="5 3" />
      <circle cx="168" cy="102" r="3.4" fill={HOT} />
      <T x="150" y="112" fill={HOT} fontSize="6">entra en 5</T>
      <path d="M168,102 Q192,92 210,84" fill="none" stroke={GOOD} strokeWidth="1.8" />
      <polygon points="210,84 203,85 205,91" fill={GOOD} />
      <T x="120" y="20" fill={GOOD} fontSize="6">objetivo = línea 1-4</T>
    </Frame>
  ),
  limits: (
    <Frame label="subjective interpretation">
      <polyline points="34,40 66,80 100,54 138,86 168,100" fill="none" stroke={GOOD} strokeWidth="1.3" strokeLinejoin="round" />
      <polyline points="30,52 70,72 110,46 150,80 182,96" fill="none" stroke={BAD} strokeWidth="1.3" strokeDasharray="4 2" strokeLinejoin="round" />
      <T x="16" y="14" fill={GOOD} fontSize="6">un trazado…</T>
      <T x="60" y="112" fill={BAD} fontSize="6">…otro ve ondas distintas (subjetivo)</T>
    </Frame>
  ),
};

export function hasWolfeWavesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function WolfeWavesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
