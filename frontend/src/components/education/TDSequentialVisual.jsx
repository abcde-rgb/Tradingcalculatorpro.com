import React from 'react';

// Language-neutral schematic SVGs for the "DeMark TD Sequential" module, keyed
// by item id. green = valid signal/up, red = failed/down, blue = neutral/count,
// amber = the highlighted 9/13 or level, muted = context.

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
const Bar = ({ x, hi, lo, c, w = 6 }) => <rect x={x - w / 2} y={hi} width={w} height={Math.max(2, lo - hi)} rx="1" fill={c} />;

const VISUALS = {
  // What — trend up into a "9" then "13", then reversal
  what: (
    <Frame label="exhaustion 9 and 13 then reversal">
      <polyline points="16,96 44,84 72,70 100,54 128,40 156,30 184,44 212,60" fill="none" stroke={MUT} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="156" cy="30" r="8" fill="none" stroke={HOT} strokeWidth="1.4" />
      <T x="151" y="33" fill={HOT} fontSize="8">9</T>
      <T x="170" y="26" fill={BAD} fontSize="8">13 ↓</T>
      <T x="16" y="14" fill={MUT} fontSize="6.5">cuenta el agotamiento de la tendencia</T>
    </Frame>
  ),
  // Price flip — close crosses the close 4 bars ago
  flip: (
    <Frame label="TD price flip">
      {[[36,70,92],[60,66,88],[84,64,86]].map(([x,hi,lo],i)=><Bar key={i} x={x} hi={hi} lo={lo} c={BAD} />)}
      {[[112,58,80],[136,48,72],[160,40,64],[184,32,58]].map(([x,hi,lo],i)=><Bar key={i} x={x} hi={hi} lo={lo} c={GOOD} />)}
      <line x1="98" y1="24" x2="98" y2="100" stroke={HOT} strokeWidth="1" strokeDasharray="3 2" />
      <T x="100" y="20" fill={HOT} fontSize="6.5">flip</T>
      <T x="16" y="112" fill={MUT} fontSize="6.5">cambia la polaridad → arranca el conteo</T>
    </Frame>
  ),
  // Setup — 9 descending bars counted 1..9
  setup: (
    <Frame label="buy setup 9 count">
      {[1,2,3,4,5,6,7,8,9].map((n,i)=>{const x=24+i*22;const hi=30+i*6;return(<g key={n}><Bar x={x} hi={hi} lo={hi+16} c={n===9?HOT:NEUT} /><T x={x-2} y={hi+28} fill={n===9?HOT:MUT} fontSize="7">{n}</T></g>);})}
      <T x="16" y="14" fill={MUT} fontSize="6.5">9 cierres seguidos vs 4 barras atrás</T>
    </Frame>
  ),
  // Perfected — bars 8/9 exceed low of 6/7
  perfected: (
    <Frame label="perfected setup">
      {[6,7,8,9].map((n,i)=>{const x=70+i*34;const hi=n>=8?70:52;return(<g key={n}><Bar x={x} hi={hi} lo={hi+ (n>=8?30:20)} c={n>=8?GOOD:MUT} w={9} /><T x={x-3} y={hi-4} fill={n>=8?GOOD:MUT} fontSize="7">{n}</T></g>);})}
      <line x1="60" y1="72" x2="200" y2="72" stroke={HOT} strokeWidth="0.8" strokeDasharray="3 2" />
      <T x="16" y="112" fill={GOOD} fontSize="6.5">8 y 9 superan el mínimo de 6 y 7 = perfeccionado</T>
    </Frame>
  ),
  // Countdown — 13 non-consecutive marks
  countdown: (
    <Frame label="countdown to 13">
      <polyline points="14,40 40,52 66,44 92,60 118,50 144,66 170,56 198,74 220,66" fill="none" stroke={MUT} strokeWidth="1.3" />
      {[[40,52],[92,60],[144,66],[198,74]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="6" fill="none" stroke={NEUT} strokeWidth="1"/><T x={x-3} y={y+3} fill={NEUT} fontSize="6.5">{[1,7,11,13][i]}</T></g>)}
      <T x="16" y="14" fill={MUT} fontSize="6.5">cierre vs high/low de 2 barras atrás → 13</T>
    </Frame>
  ),
  // Use — a 9 at resistance -> reversal down
  use: (
    <Frame label="9 at resistance confluence">
      <line x1="16" y1="34" x2="224" y2="34" stroke={HOT} strokeWidth="1.2" strokeDasharray="5 3" />
      <T x="18" y="30" fill={HOT} fontSize="6.5">resistencia</T>
      <polyline points="20,92 56,74 92,58 128,42 150,36 172,54 208,74" fill="none" stroke={GOOD} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="150" cy="36" r="7" fill="none" stroke={BAD} strokeWidth="1.4" />
      <T x="146" y="39" fill={BAD} fontSize="7">9</T>
      <T x="16" y="112" fill={MUT} fontSize="6.5">9/13 + nivel = giro de alta probabilidad</T>
    </Frame>
  ),
  // Limits — a 9 that fails, price keeps going
  limits: (
    <Frame label="a 9 can fail">
      <polyline points="16,96 52,80 88,66 124,50 150,42 186,32 216,22" fill="none" stroke={GOOD} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="150" cy="42" r="7" fill="none" stroke={HOT} strokeWidth="1.3" />
      <T x="146" y="45" fill={HOT} fontSize="7">9</T>
      <T x="150" y="16" fill={BAD} fontSize="6.5">…y el precio sigue</T>
      <T x="16" y="112" fill={MUT} fontSize="6.5">es agotamiento probable, no garantía</T>
    </Frame>
  ),
};

export function hasTDSequentialVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function TDSequentialVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
