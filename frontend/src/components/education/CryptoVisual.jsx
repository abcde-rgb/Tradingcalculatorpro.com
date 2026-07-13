import React from 'react';

// Language-neutral schematic SVGs for the "Crypto in depth" module, keyed by item id.
// green = up, red = down/liq, blue = neutral, amber = key, muted = context.

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
  // Halving: issuance steps down by half every cycle
  halving: (
    <Frame label="bitcoin issuance halving steps">
      <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
      {[[20,30],[72,54],[124,72],[176,81]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x} y={y} width="44" height={90-y} fill={HOT} opacity={0.6-i*0.1} />
          {i>0 && <T x={x+22} y={y-3} textAnchor="middle" fill={HOT} fontSize="6.5">½</T>}
        </g>
      ))}
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">emisión ÷2 cada ~4 años</T>
    </Frame>
  ),
  // Funding: positive funding = longs pay shorts (euphoria)
  funding: (
    <Frame label="funding rate sentiment">
      <line x1="20" y1="54" x2="228" y2="54" stroke={MUT} strokeWidth="0.75" />
      {[[44,18],[80,28],[116,12],[152,-16],[188,-8]].map(([x,h],i)=>(
        <rect key={i} x={x-8} y={h>0?54-h:54} width="16" height={Math.abs(h)} fill={h>0?UP:DOWN} opacity="0.6" />
      ))}
      <T x="30" y="24" fill={UP} fontSize="7">+ euforia</T>
      <T x="150" y="80" fill={DOWN} fontSize="7">− pesimismo</T>
    </Frame>
  ),
  // Cascading liquidations: long wick sweeping down then recovering
  liq: (
    <Frame label="cascading liquidations wick">
      <Axis />
      <Line pts="22,46 70,50 110,52 128,54" c={NEUT} w={1.6} />
      <line x1="132" y1="54" x2="132" y2="86" stroke={DOWN} strokeWidth="2.6" />
      <Line pts="132,86 150,62 190,50 224,46" c={UP} w={1.6} />
      <T x="138" y="82" fill={DOWN} fontSize="7">mecha de liquidez</T>
      <T x="30" y="34" fill={MUT} fontSize="7">apalancamiento en cadena</T>
    </Frame>
  ),
  // BTC dominance vs alts
  dom: (
    <Frame label="BTC dominance vs alts">
      <Axis />
      <Line pts="22,40 70,44 120,54 170,50 224,58" c={HOT} />
      <Line pts="22,74 70,70 120,60 170,64 224,56" c={NEUT} dash="3 2" />
      <T x="150" y="34" fill={HOT} fontSize="7">dominancia BTC</T>
      <T x="120" y="86" fill={NEUT} fontSize="7">altcoins</T>
    </Frame>
  ),
  // 24/7 clock + on-chain nodes
  chain: (
    <Frame label="24/7 market and on-chain data">
      <circle cx="58" cy="54" r="26" fill="none" stroke={UP} strokeWidth="1.6" />
      <line x1="58" y1="54" x2="58" y2="36" stroke={UP} strokeWidth="1.6" />
      <line x1="58" y1="54" x2="72" y2="60" stroke={UP} strokeWidth="1.6" />
      <T x="58" y="94" textAnchor="middle" fill={MUT} fontSize="7">24/7</T>
      {[[130,40],[170,58],[150,78],[200,44],[210,74]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill={NEUT} opacity="0.7" />
      ))}
      <path d="M130 40 L170 58 L150 78 M170 58 L200 44 M170 58 L210 74" stroke={NEUT} strokeWidth="1" fill="none" opacity="0.6" />
      <T x="170" y="94" textAnchor="middle" fill={MUT} fontSize="7">on-chain</T>
    </Frame>
  ),
  // Correlation with Nasdaq
  corr: (
    <Frame label="BTC correlated with Nasdaq">
      <Axis />
      <Line pts="22,64 60,50 100,58 140,40 180,48 224,34" c={HOT} />
      <Line pts="22,68 60,54 100,60 140,44 180,50 224,38" c={NEUT} dash="3 2" />
      <T x="150" y="30" fill={HOT} fontSize="7">BTC</T>
      <T x="60" y="46" fill={NEUT} fontSize="7">Nasdaq</T>
      <T x="120" y="86" textAnchor="middle" fill={MUT} fontSize="7">risk-on juntos</T>
    </Frame>
  ),
};

export function hasCryptoVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function CryptoVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
