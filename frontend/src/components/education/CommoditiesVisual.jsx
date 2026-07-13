import React from 'react';

// Language-neutral schematic SVGs for the "Commodities" module, keyed by item id.
// green = up, red = down, blue = neutral, amber = key/energy, muted = context, gold accent.

const UP = '#22c55e';
const DOWN = '#ef4444';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';
const GOLD = '#eab308';

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
  // Three groups: energy / metals / agriculture
  types: (
    <Frame label="energy, metals, agriculture">
      {[['energía',48,HOT],['metales',120,GOLD],['agrícolas',192,UP]].map(([lbl,x,c],i)=>(
        <g key={i}>
          <circle cx={x} cy="50" r="20" fill={c} opacity="0.45" />
          <T x={x} y="53" textAnchor="middle" fill={c} fontSize="7">{lbl}</T>
        </g>
      ))}
      <T x="48" y="86" textAnchor="middle" fill={MUT} fontSize="6.5">WTI · gas</T>
      <T x="120" y="86" textAnchor="middle" fill={MUT} fontSize="6.5">oro · cobre</T>
      <T x="192" y="86" textAnchor="middle" fill={MUT} fontSize="6.5">trigo · café</T>
    </Frame>
  ),
  // Seasonality: recurring yearly wave
  season: (
    <Frame label="seasonal recurring pattern">
      <Axis />
      <path d="M22 60 Q 50 30 78 60 T 134 60 T 190 60 T 224 56" fill="none" stroke={HOT} strokeWidth="1.8" />
      <T x="40" y="34" fill={HOT} fontSize="7">invierno ↑</T>
      <T x="150" y="82" fill={MUT} fontSize="7">se repite cada año</T>
    </Frame>
  ),
  // Gold vs real rates (inverse)
  gold: (
    <Frame label="gold inverse to real rates">
      <Axis />
      <Line pts="22,40 70,46 120,40 170,52 224,44" c={GOLD} w={2.2} />
      <Line pts="22,74 70,68 120,74 170,60 224,70" c={NEUT} dash="3 2" />
      <T x="150" y="34" fill={GOLD} fontSize="7">oro</T>
      <T x="120" y="86" fill={NEUT} fontSize="7">tipos reales (inverso)</T>
    </Frame>
  ),
  // Oil: weekly inventory bars + OPEC event
  oil: (
    <Frame label="oil inventories and OPEC">
      <Axis />
      {[[50,20],[86,-14],[122,24],[158,-10]].map(([x,h],i)=>(
        <rect key={i} x={x-6} y={h>0?60:60+h} width="12" height={Math.abs(h)}
          fill={h>0?DOWN:UP} opacity="0.6" />
      ))}
      <line x1="60" y1="60" x2="200" y2="60" stroke={MUT} strokeWidth="0.6" />
      <line x1="196" y1="18" x2="196" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="196" y="102" textAnchor="middle" fill={HOT} fontSize="7">OPEP</T>
      <T x="30" y="30" fill={MUT} fontSize="7">inventarios EIA</T>
    </Frame>
  ),
  // Futures curve: contango vs backwardation + roll
  curve: (
    <Frame label="futures curve contango vs backwardation">
      <Axis />
      <Line pts="24,66 80,58 140,50 224,44" c={DOWN} />
      <Line pts="24,44 80,52 140,60 224,66" c={UP} dash="3 2" />
      <T x="150" y="42" fill={DOWN} fontSize="7">contango (roll −)</T>
      <T x="30" y="38" fill={UP} fontSize="7">backwardation (roll +)</T>
      <T x="205" y="102" textAnchor="middle" fill={MUT} fontSize="7">vencim. →</T>
    </Frame>
  ),
};

export function hasCommoditiesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function CommoditiesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
