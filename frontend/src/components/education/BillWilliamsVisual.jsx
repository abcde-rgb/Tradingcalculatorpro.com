import React from 'react';

// Language-neutral schematic SVGs for the "Bill Williams / Trading Chaos" module.
// green = lips/up/valid, red = teeth/down, blue = jaw, amber = fractal/highlight,
// muted = context/price. The Alligator = 3 displaced smoothed MAs.

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
const Bar = ({ x, y0, y1, c, w = 5 }) => <rect x={x - w / 2} y={Math.min(y0, y1)} width={w} height={Math.max(2, Math.abs(y1 - y0))} rx="1" fill={c} />;

const VISUALS = {
  what: (
    <Frame label="chaos theory five dimensions">
      <polyline points="16,80 40,66 64,74 90,52 116,60 142,40 168,50 196,32 216,40" fill="none" stroke={MUT} strokeWidth="1.2" />
      <polyline points="16,84 40,74 64,70 90,60 116,56 142,46 168,44 196,36 216,34" fill="none" stroke={NEUT} strokeWidth="1.3" />
      <polyline points="16,82 40,70 64,68 90,54 116,54 142,42 168,44 196,32 216,32" fill="none" stroke={GOOD} strokeWidth="1.3" />
      <T x="16" y="14" fill={MUT} fontSize="6.2">el mercado como sistema no lineal (5 dimensiones)</T>
    </Frame>
  ),
  alligator: (
    <Frame label="alligator sleeping then eating">
      {/* sleeping: intertwined */}
      <polyline points="16,60 40,58 64,61 88,59" fill="none" stroke={NEUT} strokeWidth="1.3" />
      <polyline points="16,61 40,60 64,59 88,61" fill="none" stroke={BAD} strokeWidth="1.3" />
      <polyline points="16,59 40,61 64,60 88,59" fill="none" stroke={GOOD} strokeWidth="1.3" />
      <T x="20" y="80" fill={MUT} fontSize="6">dormido (rango)</T>
      {/* eating: fanned out */}
      <polyline points="120,60 152,54 184,46 216,40" fill="none" stroke={NEUT} strokeWidth="1.4" />
      <polyline points="120,62 152,50 184,40 216,32" fill="none" stroke={BAD} strokeWidth="1.4" />
      <polyline points="120,64 152,46 184,34 216,24" fill="none" stroke={GOOD} strokeWidth="1.4" />
      <T x="120" y="84" fill={GOOD} fontSize="6">comiendo (tendencia): 13·8·5</T>
    </Frame>
  ),
  fractals: (
    <Frame label="five bar fractal">
      {[[40,72,96],[72,58,90],[104,34,86],[136,54,88],[168,68,94]].map(([x,hi,lo],i)=><Bar key={i} x={x} y0={hi} y1={lo} c={i===2?HOT:MUT} />)}
      <polygon points="104,26 100,32 108,32" fill={HOT} />
      <T x="112" y="30" fill={HOT} fontSize="7">↑ fractal</T>
      <T x="16" y="112" fill={MUT} fontSize="6.2">5 barras: el centro es el más alto/bajo</T>
    </Frame>
  ),
  ao: (
    <Frame label="awesome oscillator histogram">
      <line x1="16" y1="64" x2="224" y2="64" stroke={MUT} strokeWidth="0.6" />
      {[[30,58],[48,50],[66,40],[84,46],[102,56]].map(([x,y],i)=><Bar key={"g"+i} x={x} y0={64} y1={y} c={GOOD} w={9}/>)}
      {[[120,72],[138,80],[156,74],[174,82],[192,76],[210,70]].map(([x,y],i)=><Bar key={"r"+i} x={x} y0={64} y1={y} c={BAD} w={9}/>)}
      <T x="16" y="16" fill={MUT} fontSize="6.2">AO: momentum (medias del punto medio)</T>
    </Frame>
  ),
  gatormfi: (
    <Frame label="gator and market facilitation index">
      {[[26,GOOD],[42,GOOD],[58,HOT],[74,BAD],[90,BAD]].map(([x,c],i)=><Bar key={"a"+i} x={x} y0={58} y1={58-[16,12,6,10,14][i]} c={c} w={9}/>)}
      {[[26],[42],[58],[74],[90]].map(([x],i)=><Bar key={"b"+i} x={x} y0={60} y1={60+[14,10,6,12,16][i]} c={MUT} w={9}/>)}
      <T x="20" y="16" fill={MUT} fontSize="6">Gator: fases del cocodrilo</T>
      {[[140,GOOD],[160,BAD],[180,NEUT],[200,MUT]].map(([x,c],i)=><rect key={"m"+i} x={x} y={40} width={14} height={40} fill={c} opacity="0.5"/>)}
      <T x="130" y="94" fill={MUT} fontSize="6">MFI: rango ÷ volumen</T>
    </Frame>
  ),
  use: (
    <Frame label="mouth open plus fractal breakout">
      <polyline points="16,64 60,50 110,38 170,26 216,18" fill="none" stroke={GOOD} strokeWidth="1.3" />
      <polyline points="16,68 60,58 110,48 170,38 216,30" fill="none" stroke={BAD} strokeWidth="1.2" />
      <polyline points="16,72 60,66 110,58 170,50 216,42" fill="none" stroke={NEUT} strokeWidth="1.2" />
      <polygon points="90,30 86,36 94,36" fill={HOT} />
      <T x="96" y="34" fill={HOT} fontSize="6">fractal roto</T>
      <T x="16" y="112" fill={GOOD} fontSize="6">boca abierta + fractal + AO = a favor</T>
    </Frame>
  ),
  limits: (
    <Frame label="too many pieces">
      <polyline points="16,60 44,52 72,58 100,44 128,54 156,40 184,50 216,36" fill="none" stroke={MUT} strokeWidth="1" />
      <polyline points="16,64 216,40" fill="none" stroke={NEUT} strokeWidth="0.9"/>
      <polyline points="16,68 216,46" fill="none" stroke={BAD} strokeWidth="0.9"/>
      <polyline points="16,72 216,52" fill="none" stroke={GOOD} strokeWidth="0.9"/>
      {[[40,90],[80,94],[120,90],[160,94]].map(([x,y],i)=><Bar key={i} x={x} y0={86} y1={y} c={i%2?BAD:GOOD} w={7}/>)}
      <T x="16" y="14" fill={BAD} fontSize="6.2">muchas piezas → riesgo de sobreajuste</T>
    </Frame>
  ),
};

export function hasBillWilliamsVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function BillWilliamsVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
