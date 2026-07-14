import React from 'react';

// Language-neutral schematic SVGs for the "Elder system" module. green = bull/
// buy, red = bear/sell, blue = neutral/trend, amber = highlight, muted = context.

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
const Bar = ({ x, y0, y1, c, w = 7 }) => <rect x={x - w / 2} y={Math.min(y0, y1)} width={w} height={Math.max(2, Math.abs(y1 - y0))} rx="1" fill={c} />;

const VISUALS = {
  what: (
    <Frame label="mind method money">
      <polygon points="120,22 58,92 182,92" fill="none" stroke={MUT} strokeWidth="1.2" />
      <T x="104" y="18" fill={NEUT} fontSize="7">Mente</T>
      <T x="34" y="104" fill={GOOD} fontSize="7">Método</T>
      <T x="158" y="104" fill={HOT} fontSize="7">Dinero</T>
      <T x="16" y="12" fill={MUT} fontSize="6">Elder: los 3 pilares del trader</T>
    </Frame>
  ),
  triplescreen: (
    <Frame label="triple screen three timeframes">
      <rect x="14" y="16" width="212" height="26" fill="none" stroke={MUT} strokeWidth="0.7" />
      <polyline points="20,36 60,28 100,32 140,22 180,26 220,18" fill="none" stroke={NEUT} strokeWidth="1.4" />
      <T x="16" y="26" fill={NEUT} fontSize="6">1· semanal: tendencia</T>
      <rect x="14" y="46" width="212" height="26" fill="none" stroke={MUT} strokeWidth="0.7" />
      <path d="M18,59 Q60,48 100,60 T180,60 T224,58" fill="none" stroke={HOT} strokeWidth="1.3" />
      <T x="16" y="56" fill={HOT} fontSize="6">2· diario: oscilador (corrección)</T>
      <rect x="14" y="76" width="212" height="30" fill="none" stroke={MUT} strokeWidth="0.7" />
      <polygon points="120,84 116,90 124,90" fill={GOOD} />
      <T x="16" y="86" fill={GOOD} fontSize="6">3· entrada a favor del semanal</T>
    </Frame>
  ),
  elderray: (
    <Frame label="elder-ray bull and bear power">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      {[30, 52, 74, 96, 118, 140, 162, 184, 206].map((x, i) => <Bar key={"u" + i} x={x} y0={60} y1={60 - [10, 16, 22, 18, 12, 8, 14, 20, 10][i]} c={GOOD} />)}
      {[41, 63, 85, 107, 129, 151, 173, 195].map((x, i) => <Bar key={"d" + i} x={x} y0={60} y1={60 + [12, 8, 6, 10, 16, 12, 8, 6][i]} c={BAD} />)}
      <T x="16" y="14" fill={GOOD} fontSize="6">Bull Power ↑</T>
      <T x="16" y="110" fill={BAD} fontSize="6">Bear Power ↓ (precio vs EMA)</T>
    </Frame>
  ),
  forceindex: (
    <Frame label="force index price times volume">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      {[[30, 40, GOOD], [52, 34, GOOD], [74, 78, BAD], [96, 50, GOOD], [118, 84, BAD], [140, 44, GOOD], [162, 72, BAD], [184, 36, GOOD], [206, 54, GOOD]].map(([x, y, c], i) => <Bar key={i} x={x} y0={60} y1={y} c={c} w={9} />)}
      <T x="16" y="14" fill={MUT} fontSize="6.2">Force Index = variación × volumen</T>
    </Frame>
  ),
  impulse: (
    <Frame label="impulse system green red blue">
      {[[26, GOOD], [46, GOOD], [66, NEUT], [86, BAD], [106, BAD], [126, NEUT], [146, GOOD], [166, GOOD], [186, NEUT], [206, BAD]].map(([x, c], i) => {
        const h = [22, 28, 18, 20, 26, 16, 24, 30, 18, 22][i]; const y = 64 - (i % 2 ? h : h * 0.7);
        return <Bar key={i} x={x} y0={y} y1={y + h} c={c} w={10} />;
      })}
      <T x="16" y="16" fill={MUT} fontSize="6">verde=compra · rojo=venta · azul=espera</T>
    </Frame>
  ),
  limits: (
    <Frame label="edge is discipline not the indicator">
      <polyline points="16,64 48,54 80,60 112,44 144,52 176,36 208,44" fill="none" stroke={MUT} strokeWidth="1.2" />
      <path d="M18,78 Q60,68 100,80 T180,80 T222,78" fill="none" stroke={NEUT} strokeWidth="1.1" />
      <T x="16" y="16" fill={MUT} fontSize="6.2">clásico y sensato (años 90)…</T>
      <T x="16" y="108" fill={BAD} fontSize="6.2">…su ventaja real es la disciplina, no la fórmula</T>
    </Frame>
  ),
};

export function hasElderVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function ElderVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
