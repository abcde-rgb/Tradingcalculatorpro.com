import React from 'react';

// Language-neutral schematic SVGs for the "Indices & the Nasdaq" module, keyed by id.
// green = up, red = down, blue = neutral, amber = key/event, muted = context.

const UP = '#22c55e';
const DOWN = '#ef4444';
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
const Axis = () => (
  <>
    <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
    <line x1="20" y1="16" x2="20" y2="90" stroke={MUT} strokeWidth="0.75" />
  </>
);

const VISUALS = {
  // Cap weighting: a few huge bars dwarf the rest
  weight: (
    <Frame label="a few megacaps dominate the index">
      <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
      {[[28,58],[52,54],[76,50],[100,44],[124,40],[148,48],[172,54]].map(([x,h],i)=>(
        <rect key={i} x={x} y={90-h} width="18" height={h} fill={i<5?HOT:MUT} opacity={i<5?0.65:0.4} />
      ))}
      {[[196,12],[210,10]].map(([x,h],i)=>(
        <rect key={i} x={x} y={90-h} width="10" height={h} fill={MUT} opacity="0.4" />
      ))}
      <T x="86" y="30" fill={HOT} fontSize="7">7 megacaps</T>
      <T x="204" y="82" fill={MUT} fontSize="7">resto</T>
    </Frame>
  ),
  // ES/NQ futures: regular session vs overnight gap
  fut: (
    <Frame label="futures overnight sets the gap">
      <Axis />
      <Line pts="22,66 60,60 96,64" c={MUT} w={1.4} dash="2 2" />
      <Line pts="96,64 120,48" c={NEUT} />
      <line x1="120" y1="16" x2="120" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="120" y="102" textAnchor="middle" fill={HOT} fontSize="7">apertura</T>
      <Line pts="120,40 160,46 200,34 224,40" c={UP} />
      <T x="30" y="80" fill={MUT} fontSize="7">overnight (Globex)</T>
      <T x="150" y="28" fill={UP} fontSize="7">sesión regular</T>
    </Frame>
  ),
  // VIX inverse to index
  vix: (
    <Frame label="VIX inverse to the index">
      <Axis />
      <Line pts="22,40 60,36 100,48 140,66 180,52 224,44" c={NEUT} />
      <Line pts="22,72 60,76 100,64 140,30 180,50 224,64" c={DOWN} dash="3 2" />
      <T x="40" y="32" fill={NEUT} fontSize="7">índice</T>
      <T x="132" y="24" fill={DOWN} fontSize="7">VIX ↑ (miedo)</T>
    </Frame>
  ),
  // Triple witching: volume spike on the marked day
  witch: (
    <Frame label="triple witching volume spike">
      <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
      {[36,60,84,108,156,180,204].map((x,i)=>(
        <rect key={i} x={x} y={72} width="12" height="18" fill={MUT} opacity="0.4" />
      ))}
      <rect x="128" y="34" width="16" height="56" fill={HOT} opacity="0.7" />
      <T x="136" y="28" textAnchor="middle" fill={HOT} fontSize="7">witching</T>
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">3er viernes · mar/jun/sep/dic</T>
    </Frame>
  ),
  // Megacap earnings gap the whole index
  earn: (
    <Frame label="megacap earnings gap the index">
      <Axis />
      <Line pts="22,60 60,56 96,62 120,58" c={NEUT} w={1.6} />
      <line x1="120" y1="16" x2="120" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="120" y="102" textAnchor="middle" fill={HOT} fontSize="7">resultados</T>
      <Line pts="120,58 122,36 160,32 200,26 224,30" c={UP} w={1.8} />
      <T x="150" y="24" fill={UP} fontSize="7">gap del índice</T>
    </Frame>
  ),
};

export function hasIndicesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function IndicesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
