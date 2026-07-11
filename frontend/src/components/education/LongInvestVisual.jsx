import React from 'react';

// Language-neutral schematic SVGs for the "Long-term investing" module, keyed by
// item id. green = growth, blue = neutral, amber = key, muted = context/axes.

const UP = '#22c55e';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';
const BOND = '#a78bfa';

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
  // Compounding: exponential curve vs linear
  compound: (
    <Frame label="compound growth curve">
      <Axis />
      <Line pts="20,84 228,58" c={MUT} w={1.2} dash="3 2" />
      <path d="M20 86 C 120 84, 180 60, 228 20" fill="none" stroke={UP} strokeWidth="2.2" />
      <T x="150" y="74" fill={MUT} fontSize="7">lineal</T>
      <T x="150" y="34" fill={UP} fontSize="7">compuesto</T>
      <T x="26" y="102" fill={MUT} fontSize="7">años →</T>
    </Frame>
  ),
  // DCA: fixed € buys more units when price is low
  dca: (
    <Frame label="dollar-cost averaging">
      <Axis />
      <Line pts="20,50 60,70 100,44 140,74 180,40 220,58" c={NEUT} w={1.6} />
      {[[60,70],[100,44],[140,74],[180,40]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x-4} y={y} width="8" height={90-y} fill={HOT} opacity="0.5" />
        </g>
      ))}
      <T x="30" y="30" fill={HOT} fontSize="7">€ fijo/mes</T>
      <T x="132" y="86" fill={UP} fontSize="7">+ barato → + unidades</T>
    </Frame>
  ),
  // Index: one basket holds the whole market
  index: (
    <Frame label="index fund holds whole market">
      <rect x="70" y="26" width="100" height="66" rx="8" fill="none" stroke={UP} strokeWidth="1.5" />
      {Array.from({length:18}).map((_,i)=>(
        <circle key={i} cx={82+(i%6)*16} cy={40+Math.floor(i/6)*18} r="4"
          fill={[UP,NEUT,HOT,BOND][i%4]} opacity="0.7" />
      ))}
      <T x="120" y="20" textAnchor="middle" fill={UP} fontSize="7">1 ETF = todo el mercado</T>
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">comisión mínima</T>
    </Frame>
  ),
  // Dividends reinvested: growing snowball
  div: (
    <Frame label="dividend reinvestment snowball">
      <line x1="24" y1="92" x2="216" y2="92" stroke={MUT} strokeWidth="0.75" />
      {[[54,10],[104,16],[160,24],[210,34]].map(([x,r],i)=>(
        <circle key={i} cx={x} cy={92-r} r={r} fill={UP} opacity={0.25+i*0.18} />
      ))}
      <path d="M40 88 Q 120 40 210 30" fill="none" stroke={HOT} strokeWidth="1.4" dash="3 2" />
      <T x="30" y="30" fill={UP} fontSize="7">reinvertir</T>
      <T x="150" y="86" fill={MUT} fontSize="7">bola de nieve →</T>
    </Frame>
  ),
  // Asset allocation pie + rebalance
  alloc: (
    <Frame label="asset allocation and rebalancing">
      <circle cx="70" cy="56" r="34" fill={UP} opacity="0.55" />
      <path d="M70 56 L70 22 A34 34 0 0 1 101 44 Z" fill={BOND} opacity="0.7" />
      <path d="M70 56 L101 44 A34 34 0 0 1 96 74 Z" fill={HOT} opacity="0.7" />
      <T x="70" y="100" textAnchor="middle" fill={MUT} fontSize="7">acciones/bonos/liquidez</T>
      <path d="M120 44 h60 m0 0 l-6 -4 m6 4 l-6 4" fill="none" stroke={UP} strokeWidth="1.4" />
      <path d="M180 68 h-60 m0 0 l6 -4 m-6 4 l6 4" fill="none" stroke={BOND} strokeWidth="1.4" />
      <T x="150" y="38" textAnchor="middle" fill={MUT} fontSize="7">rebalanceo</T>
      <T x="150" y="82" textAnchor="middle" fill={MUT} fontSize="7">1-2×/año</T>
    </Frame>
  ),
};

export function hasLongInvestVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function LongInvestVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
