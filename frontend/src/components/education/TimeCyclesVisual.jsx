import React from 'react';

// Language-neutral schematic SVGs for the "time & cycles" module. blue = cycle,
// amber = time line / cluster, green = valid/turn, red = drift/failure, muted =
// price/context. The theme is the forgotten TIME axis of technical analysis.

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
const VLine = ({ x, c = HOT, d = "3 2" }) => <line x1={x} y1="16" x2={x} y2="104" stroke={c} strokeWidth="0.8" strokeDasharray={d} />;
const PRICE = "16,80 40,64 64,74 88,50 112,62 136,40 160,54 184,32 210,46";

const VISUALS = {
  what: (
    <Frame label="the forgotten time axis">
      <polyline points={PRICE} fill="none" stroke={MUT} strokeWidth="1.4" strokeLinejoin="round" />
      {[64, 112, 160].map((x, i) => <VLine key={i} x={x} c={MUT} />)}
      <T x="16" y="14" fill={MUT} fontSize="6.2">no solo el PRECIO: también el TIEMPO</T>
      <T x="150" y="112" fill={MUT} fontSize="6">¿cuándo, no solo dónde?</T>
    </Frame>
  ),
  fibtime: (
    <Frame label="fibonacci time zones">
      <polyline points={PRICE} fill="none" stroke={MUT} strokeWidth="1.2" strokeLinejoin="round" />
      {[[28, '1'], [40, '2'], [58, '3'], [88, '5'], [136, '8'], [212, '13']].map(([x, n], i) => (
        <g key={i}><VLine x={x} c={NEUT} /><T x={x - 2} y={112} fill={NEUT} fontSize="6">{n}</T></g>
      ))}
      <T x="16" y="14" fill={MUT} fontSize="6">líneas verticales en 1·2·3·5·8·13 (Fibonacci)</T>
    </Frame>
  ),
  clusters: (
    <Frame label="time clusters converge">
      <polyline points={PRICE} fill="none" stroke={MUT} strokeWidth="1.2" strokeLinejoin="round" />
      {[100, 106, 112].map((x, i) => <VLine key={"a" + i} x={x} c={NEUT} d="2 2" />)}
      <rect x="98" y="16" width="16" height="88" fill={HOT} opacity="0.14" />
      <T x="84" y="14" fill={HOT} fontSize="6">varios ciclos coinciden = zona caliente</T>
      <circle cx="106" cy="60" r="2.6" fill={GOOD} />
    </Frame>
  ),
  hurst: (
    <Frame label="nested cycles Hurst model">
      <path d="M16,60 Q70,20 124,60 T232,60" fill="none" stroke={NEUT} strokeWidth="1.6" />
      <path d="M16,60 Q43,44 70,60 T124,60 T178,60 T232,60" fill="none" stroke={GOOD} strokeWidth="1.1" />
      <path d="M16,60 Q29,52 42,60 T68,60 T94,60 T120,60 T146,60 T172,60 T198,60 T224,60" fill="none" stroke={HOT} strokeWidth="0.8" opacity="0.8" />
      <T x="16" y="16" fill={MUT} fontSize="6.2">ciclos dentro de ciclos (modelo nominal)</T>
    </Frame>
  ),
  fld: (
    <Frame label="future line of demarcation timing">
      <polyline points={PRICE} fill="none" stroke={MUT} strokeWidth="1.4" strokeLinejoin="round" />
      <polyline points="52,80 76,64 100,74 124,50 148,62 172,40 196,54 220,32" fill="none" stroke={NEUT} strokeWidth="1.2" strokeDasharray="4 2" />
      <circle cx="112" cy="60" r="3" fill={GOOD} />
      <T x="150" y="100" fill={NEUT} fontSize="6">FLD = precio desplazado ½ ciclo</T>
      <T x="16" y="14" fill={GOOD} fontSize="6">el cruce marca el timing del giro</T>
    </Frame>
  ),
  limits: (
    <Frame label="cycles drift and change length">
      <path d="M16,60 Q44,38 72,60 T128,60" fill="none" stroke={NEUT} strokeWidth="1.5" />
      <path d="M128,60 Q168,34 208,60 Q222,68 232,58" fill="none" stroke={BAD} strokeWidth="1.5" strokeDasharray="4 2" />
      <T x="20" y="104" fill={NEUT} fontSize="6">ciclo regular…</T>
      <T x="140" y="104" fill={BAD} fontSize="6">…luego cambia (o desaparece)</T>
      <T x="16" y="14" fill={MUT} fontSize="6">subjetivo, no mágico</T>
    </Frame>
  ),
};

export function hasTimeCyclesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function TimeCyclesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
