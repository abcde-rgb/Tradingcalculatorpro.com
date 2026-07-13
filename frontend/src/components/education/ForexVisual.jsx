import React from 'react';

// Language-neutral schematic SVGs for the "Forex in depth" module, keyed by item id.
// green = up, red = down, blue = neutral, amber = key window/event, muted = context.

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
const hx = (h) => 20 + (h / 24) * 208;

const VISUALS = {
  // Four sessions on a 24h line with the London-NY overlap highlighted
  sess: (
    <Frame label="forex sessions with london-ny overlap">
      {[['Sídney',22,7,NEUT,28],['Tokio',0,9,NEUT,40],['Londres',8,17,UP,52],['NY',13,22,HOT,64]].map(
        ([lbl,a,b,c,y],i)=>(
          <g key={i}>
            <rect x={hx(a>b?0:a)} y={y} width={hx(a>b?b:b)-hx(a>b?0:a)} height="10" rx="2" fill={c} opacity="0.55" />
            <T x={hx(a>b?0:a)+2} y={y+8} fill="#0a0a0a" fontSize="6.5">{lbl}</T>
          </g>
        )
      )}
      <rect x={hx(13)} y="24" width={hx(17)-hx(13)} height="52" fill={HOT} opacity="0.16" />
      <T x={hx(15)} y="22" textAnchor="middle" fill={HOT} fontSize="7">solape</T>
      <line x1="20" y1="80" x2="228" y2="80" stroke={MUT} strokeWidth="0.6" />
    </Frame>
  ),
  // Carry: slow drip up, sudden unwind
  carry: (
    <Frame label="carry trade slow up sudden unwind">
      <Axis />
      <Line pts="22,80 70,74 120,66 168,58 196,54" c={UP} />
      <Line pts="196,54 206,72 216,84 224,88" c={DOWN} w={2.4} />
      <T x="60" y="66" fill={UP} fontSize="7">+swap diario</T>
      <T x="176" y="80" fill={DOWN} fontSize="7">unwind</T>
    </Frame>
  ),
  // DXY inverse to EUR/USD
  dxy: (
    <Frame label="DXY inverse to EUR/USD">
      <Axis />
      <Line pts="22,40 60,48 100,42 140,56 180,50 224,62" c={HOT} />
      <Line pts="22,66 60,58 100,64 140,50 180,56 224,44" c={NEUT} dash="3 2" />
      <T x="150" y="34" fill={HOT} fontSize="7">DXY</T>
      <T x="150" y="84" fill={NEUT} fontSize="7">EUR/USD (espejo)</T>
    </Frame>
  ),
  // Pairs: spread widens from majors to exotics
  pairs: (
    <Frame label="spread widens majors to exotics">
      {[['mayores',40,4,UP],['menores',120,10,HOT],['exóticos',200,20,DOWN]].map(([lbl,x,w,c],i)=>(
        <g key={i}>
          <line x1={x-w} y1="52" x2={x+w} y2="52" stroke={c} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
          <T x={x} y="40" textAnchor="middle" fill={c} fontSize="7">{lbl}</T>
          <T x={x} y="72" textAnchor="middle" fill={MUT} fontSize="6.5">spread</T>
        </g>
      ))}
      <T x="120" y="92" textAnchor="middle" fill={MUT} fontSize="7">+ líquido → − líquido</T>
    </Frame>
  ),
  // Drivers: central bank rate gap moves the pair
  drivers: (
    <Frame label="rate differential drives the pair">
      <rect x="30" y="46" width="36" height="34" fill={UP} opacity="0.5" />
      <T x="48" y="42" textAnchor="middle" fill={UP} fontSize="7">país A</T>
      <T x="48" y="66" textAnchor="middle" fill="#0a0a0a" fontSize="7">5%</T>
      <rect x="90" y="62" width="36" height="18" fill={DOWN} opacity="0.5" />
      <T x="108" y="58" textAnchor="middle" fill={DOWN} fontSize="7">país B</T>
      <T x="108" y="75" textAnchor="middle" fill="#0a0a0a" fontSize="7">1%</T>
      <path d="M140 60 h40" stroke={MUT} strokeWidth="1.4" fill="none" /><polygon points="180,60 174,57 174,63" fill={MUT} />
      <Line pts="186,74 200,64 214,50 224,44" c={UP} w={1.8} />
      <T x="150" y="50" fill={MUT} fontSize="7">A/B ↑</T>
    </Frame>
  ),
};

export function hasForexVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function ForexVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
