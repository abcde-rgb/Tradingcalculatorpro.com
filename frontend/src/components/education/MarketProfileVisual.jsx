import React from 'react';

// Language-neutral schematic SVGs for the "Market Profile / Auction" module.
// amber = POC, green = value area / valid, blue = initial balance, red = out of
// value, muted = TPO blocks / context. The profile is a horizontal TPO histogram.

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
// rows: [y, count]; a horizontal TPO histogram from x0
const Row = ({ x0, y, n, c, u = 9 }) => <rect x={x0} y={y} width={n * u} height="7" rx="1" fill={c} />;
const ROWS = [[22, 2], [32, 4], [42, 7], [52, 10], [62, 13], [72, 11], [82, 7], [92, 4]];

const VISUALS = {
  what: (
    <Frame label="market auctions to find value">
      {ROWS.map(([y, n], i) => <Row key={i} x0={96} y={y} n={n} c={y === 62 ? HOT : MUT} u={7} />)}
      <polyline points="20,96 34,70 48,82 62,54 76,66 90,60" fill="none" stroke={NEUT} strokeWidth="1.3" />
      <T x="16" y="14" fill={MUT} fontSize="6.2">el mercado subasta para hallar el "valor"</T>
      <T x="150" y="112" fill={MUT} fontSize="6">campana = tiempo en cada precio</T>
    </Frame>
  ),
  tpo: (
    <Frame label="TPO letters build the profile">
      {ROWS.map(([y, n], i) => (
        <g key={i}>{Array.from({ length: n }).map((_, k) => <rect key={k} x={70 + k * 11} y={y} width="9" height="7" rx="1" fill={MUT} opacity={0.5 + k * 0.04} />)}</g>
      ))}
      <T x="16" y="14" fill={MUT} fontSize="6.2">cada letra = un periodo de tiempo (TPO)</T>
    </Frame>
  ),
  valuepoc: (
    <Frame label="value area and point of control">
      <rect x="60" y="40" width="150" height="36" fill={GOOD} opacity="0.10" />
      {ROWS.map(([y, n], i) => <Row key={i} x0={60} y={y} n={n} c={y === 62 ? HOT : (y >= 42 && y <= 72 ? GOOD : MUT)} u={9} />)}
      <line x1="55" y1="65.5" x2="220" y2="65.5" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <T x="180" y="63" fill={HOT} fontSize="6.5">POC</T>
      <T x="12" y="58" fill={GOOD} fontSize="6">área valor 70%</T>
    </Frame>
  ),
  ib: (
    <Frame label="initial balance and range extension">
      <rect x="40" y="46" width="26" height="32" fill={NEUT} opacity="0.18" />
      <line x1="40" y1="46" x2="66" y2="46" stroke={NEUT} strokeWidth="1.2" />
      <line x1="40" y1="78" x2="66" y2="78" stroke={NEUT} strokeWidth="1.2" />
      <T x="34" y="42" fill={NEUT} fontSize="6">balance inicial (1ª hora)</T>
      <polyline points="66,62 96,50 128,66 158,34 190,52 214,28" fill="none" stroke={MUT} strokeWidth="1.3" />
      <line x1="150" y1="34" x2="214" y2="34" stroke={GOOD} strokeWidth="0.8" strokeDasharray="3 2" />
      <T x="150" y="108" fill={GOOD} fontSize="6">extensión del rango</T>
    </Frame>
  ),
  use: (
    <Frame label="naked POC acts as a magnet">
      {ROWS.map(([y, n], i) => <Row key={i} x0={150} y={y} n={n} c={y === 62 ? HOT : MUT} u={5} />)}
      <line x1="20" y1="65.5" x2="150" y2="65.5" stroke={HOT} strokeWidth="1" strokeDasharray="4 2" />
      <polyline points="20,30 48,40 76,34 104,50 132,60 150,64" fill="none" stroke={GOOD} strokeWidth="1.5" strokeLinejoin="round" />
      <T x="22" y="26" fill={GOOD} fontSize="6">el precio vuelve al POC "virgen"</T>
    </Frame>
  ),
  limits: (
    <Frame label="context not a signal">
      {ROWS.map(([y, n], i) => <Row key={i} x0={96} y={y} n={n} c={y === 62 ? HOT : MUT} u={7} />)}
      <T x="16" y="16" fill={MUT} fontSize="6.2">da CONTEXTO (dónde está el valor)…</T>
      <T x="16" y="108" fill={BAD} fontSize="6.2">…no una señal de entrada por sí sola</T>
    </Frame>
  ),
};

export function hasMarketProfileVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function MarketProfileVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
