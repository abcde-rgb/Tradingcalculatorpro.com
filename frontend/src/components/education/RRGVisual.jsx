import React from 'react';

// Language-neutral schematic SVGs for the "Relative Rotation Graphs" module.
// green = Leading, amber = Weakening, red = Lagging, blue = Improving, muted =
// axes/benchmark. The plane is centred on the benchmark (100,100).

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
// axes cross centred at (cx,cy)
const Axes = ({ cx = 120, cy = 59 }) => (
  <g>
    <line x1="34" y1={cy} x2="206" y2={cy} stroke={MUT} strokeWidth="0.8" />
    <line x1={cx} y1="12" x2={cx} y2="106" stroke={MUT} strokeWidth="0.8" />
  </g>
);

const VISUALS = {
  what: (
    <Frame label="RRG four quadrant rotation map">
      <rect x="122" y="14" width="82" height="43" fill={GOOD} opacity="0.10" />
      <rect x="122" y="61" width="82" height="43" fill={HOT} opacity="0.10" />
      <rect x="36" y="61" width="82" height="43" fill={BAD} opacity="0.10" />
      <rect x="36" y="14" width="82" height="43" fill={NEUT} opacity="0.10" />
      <Axes />
      <circle cx="166" cy="34" r="3.4" fill={GOOD} />
      <T x="150" y="24" fill={GOOD} fontSize="6.5">un activo fuerte</T>
      <T x="40" y="112" fill={MUT} fontSize="6.5">mapa de rotación vs el índice</T>
    </Frame>
  ),
  axes: (
    <Frame label="RS-Ratio and RS-Momentum axes">
      <Axes />
      <T x="150" y="70" fill={MUT} fontSize="6.5">RS-Ratio →</T>
      <T x="124" y="20" fill={MUT} fontSize="6.5">↑ RS-Momentum</T>
      <circle cx="120" cy="59" r="3" fill={MUT} />
      <T x="98" y="72" fill={MUT} fontSize="6.5">100</T>
      <T x="36" y="112" fill={MUT} fontSize="6.2">X = fuerza relativa · Y = su ritmo</T>
    </Frame>
  ),
  quadrants: (
    <Frame label="leading weakening lagging improving">
      <rect x="122" y="14" width="82" height="43" fill={GOOD} opacity="0.12" />
      <rect x="122" y="61" width="82" height="43" fill={HOT} opacity="0.12" />
      <rect x="36" y="61" width="82" height="43" fill={BAD} opacity="0.12" />
      <rect x="36" y="14" width="82" height="43" fill={NEUT} opacity="0.12" />
      <Axes />
      <T x="150" y="34" fill={GOOD} fontSize="6.5">LÍDER</T>
      <T x="138" y="86" fill={HOT} fontSize="6.5">DEBILITA</T>
      <T x="46" y="86" fill={BAD} fontSize="6.5">REZAGADO</T>
      <T x="46" y="34" fill={NEUT} fontSize="6.5">MEJORA</T>
    </Frame>
  ),
  rotation: (
    <Frame label="clockwise rotation">
      <Axes />
      <path d="M70,30 A54,47 0 1 1 68,88" fill="none" stroke={NEUT} strokeWidth="1.6" strokeDasharray="5 3" />
      <polygon points="68,88 62,82 74,80" fill={NEUT} />
      <T x="150" y="26" fill={GOOD} fontSize="6.2">Mejora→Líder→Debilita→Rezagado</T>
      <T x="40" y="112" fill={MUT} fontSize="6.5">gira en sentido horario</T>
    </Frame>
  ),
  tails: (
    <Frame label="rotation tail trail">
      <Axes />
      <polyline points="60,86 84,74 108,62 140,46 166,34" fill="none" stroke={GOOD} strokeWidth="1.4" strokeDasharray="3 2" />
      {[[60,86],[84,74],[108,62],[140,46]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.8" fill={MUT}/>)}
      <circle cx="166" cy="34" r="3.6" fill={GOOD} />
      <T x="40" y="112" fill={MUT} fontSize="6.2">la cola = la trayectoria reciente</T>
    </Frame>
  ),
  use: (
    <Frame label="pick leaders avoid laggards">
      <Axes />
      {[[168,30,GOOD],[176,40,GOOD],[150,80,HOT],[62,84,BAD],[74,34,NEUT]].map(([x,y,c],i)=><circle key={i} cx={x} cy={y} r="3" fill={c}/>)}
      <T x="150" y="22" fill={GOOD} fontSize="6.2">compra fuertes</T>
      <T x="40" y="112" fill={BAD} fontSize="6.2">evita rezagados · rotación sectorial</T>
    </Frame>
  ),
  limits: (
    <Frame label="relative not absolute">
      <rect x="122" y="14" width="82" height="43" fill={GOOD} opacity="0.10" />
      <rect x="36" y="61" width="82" height="43" fill={BAD} opacity="0.10" />
      <Axes />
      <circle cx="166" cy="34" r="3.2" fill={GOOD} />
      <T x="150" y="24" fill={GOOD} fontSize="6.2">"líder"…</T>
      <T x="36" y="112" fill={MUT} fontSize="6">…pero relativo al índice, no absoluto</T>
    </Frame>
  ),
};

export function hasRRGVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function RRGVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
