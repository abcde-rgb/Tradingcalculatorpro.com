import React from 'react';

// Language-neutral schematic SVGs for the "Moving averages deep-dive" module,
// keyed by item id. green = up/buy, red = down/sell, blue = neutral/price,
// amber = the key line/insight, muted = context.

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

const PRICE = '24,84 44,70 64,78 84,54 104,62 124,40 144,50 164,30 184,40 204,22 220,30';

const VISUALS = {
  // SMA vs EMA — same price, EMA hugs price, SMA lags smoother
  smaema: (
    <Frame label="sma versus ema lag">
      <Line pts={PRICE} c={MUT} w={1.2} />
      <Line pts="24,80 44,74 64,74 84,66 104,64 124,54 144,52 164,44 184,42 204,34 220,32" c={HOT} w={1.8} />
      <Line pts="24,78 44,76 64,76 84,72 104,70 124,64 144,62 164,56 184,54 204,48 220,46" c={NEUT} w={1.8} />
      <T x="26" y="16" fill={MUT} fontSize="7">precio</T>
      <T x="150" y="40" fill={HOT} fontSize="7">EMA (rápida)</T>
      <T x="150" y="70" fill={NEUT} fontSize="7">SMA (suave)</T>
    </Frame>
  ),
  // Choosing the period — fast/medium/slow MAs
  periods: (
    <Frame label="short medium long periods">
      <Line pts={PRICE} c={MUT} w={1} />
      <Line pts="24,82 64,74 104,60 144,48 184,36 220,30" c={GOOD} w={1.6} />
      <Line pts="24,80 64,76 104,66 144,58 184,50 220,44" c={NEUT} w={1.6} />
      <Line pts="24,78 64,76 104,72 144,68 184,64 220,60" c={BAD} w={1.6} />
      <T x="196" y="26" fill={GOOD} fontSize="6.5">corta</T>
      <T x="196" y="40" fill={NEUT} fontSize="6.5">media</T>
      <T x="196" y="72" fill={BAD} fontSize="6.5">200</T>
    </Frame>
  ),
  // Price / MA cross — buy above, sell below
  crossprice: (
    <Frame label="price crossing one moving average">
      <Line pts={PRICE} c={NEUT} w={1.6} />
      <Line pts="24,74 60,70 100,64 140,56 180,48 220,42" c={HOT} w={1.8} />
      <circle cx="84" cy="54" r="3.2" fill={GOOD} />
      <T x="66" y="46" fill={GOOD} fontSize="7">compra</T>
      <T x="150" y="70" fill={HOT} fontSize="7">SMA</T>
    </Frame>
  ),
  // Two MA cross — fast over slow
  cross2: (
    <Frame label="two moving averages cross">
      <Line pts="24,80 70,66 110,58 150,44 190,36 220,28" c={GOOD} w={1.8} />
      <Line pts="24,64 70,62 110,58 150,54 190,50 220,46" c={NEUT} w={1.8} />
      <circle cx="110" cy="58" r="3.4" fill={HOT} />
      <T x="120" y="52" fill={HOT} fontSize="7">cruce</T>
      <T x="30" y="90" fill={GOOD} fontSize="6.5">rápida (30)</T>
      <T x="150" y="66" fill={NEUT} fontSize="6.5">lenta (100)</T>
    </Frame>
  ),
  // Triple cross with a trend filter
  triple: (
    <Frame label="triple cross with trend filter">
      <Line pts="24,78 70,60 110,50 150,38 190,30 220,24" c={GOOD} w={1.6} />
      <Line pts="24,74 70,64 110,56 150,48 190,42 220,38" c={NEUT} w={1.6} />
      <line x1="24" y1="86" x2="220" y2="70" stroke={BAD} strokeWidth="1.8" strokeDasharray="5 3" />
      <T x="150" y="84" fill={BAD} fontSize="6.5">filtro 200</T>
      <T x="30" y="70" fill={GOOD} fontSize="6.5">solo si ambas encima ▲</T>
    </Frame>
  ),
  // Golden cross & death cross (50 x 200)
  goldendeath: (
    <Frame label="golden cross and death cross">
      <Line pts="24,70 70,50 110,60 150,80 190,70 220,58" c={NEUT} w={1.8} />
      <Line pts="24,66 70,62 110,60 150,60 190,60 220,58" c={MUT} w={1.6} />
      <circle cx="70" cy="55" r="3.2" fill={GOOD} />
      <T x="40" y="44" fill={GOOD} fontSize="6.5">dorado</T>
      <circle cx="150" cy="72" r="3.2" fill={BAD} />
      <T x="150" y="92" fill={BAD} fontSize="6.5">de la muerte</T>
      <T x="188" y="52" fill={MUT} fontSize="6.5">200</T>
    </Frame>
  ),
  // MA as dynamic support — bounces, then a break
  dynamic: (
    <Frame label="moving average as dynamic support">
      <Line pts="24,90 70,72 120,54 170,40 220,28" c={HOT} w={1.8} />
      <Line pts="24,80 48,66 60,74 90,50 104,64 140,40 156,52 188,66 210,80" c={NEUT} w={1.4} />
      <circle cx="60" cy="74" r="2.6" fill={GOOD} />
      <circle cx="104" cy="64" r="2.6" fill={GOOD} />
      <circle cx="188" cy="66" r="2.6" fill={BAD} />
      <T x="120" y="30" fill={HOT} fontSize="6.5">MA sube</T>
      <T x="150" y="92" fill={BAD} fontSize="6.5">rompe → giro</T>
    </Frame>
  ),
  // Indicator families
  families: (
    <Frame label="indicator families">
      {[['Tendencia', GOOD], ['Osciladores', NEUT], ['Volatilidad', HOT], ['Volumen', MUT]].map(([lbl, c], i) => (
        <g key={i}>
          <rect x="18" y={16 + i * 24} width="10" height="10" rx="2" fill={c} opacity="0.85" />
          <T x="34" y={24 + i * 24} fill={MUT} fontSize="7.5">{lbl}</T>
        </g>
      ))}
      <T x="18" y="112" fill={MUT} fontSize="6.5">combina familias que se compensen</T>
    </Frame>
  ),
};

export function hasMovingAveragesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function MovingAveragesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
