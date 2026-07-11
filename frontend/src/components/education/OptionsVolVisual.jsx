import React from 'react';

// Language-neutral schematic SVGs for the "Options: volatility" module, keyed by
// item id. green = up/cheap-buy, red = down/expensive, blue = neutral, amber =
// key level/event, muted = context/axes.

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
  // IV = time value component stacked on intrinsic value
  iv: (
    <Frame label="option price = intrinsic + IV time value">
      <Axis />
      <rect x="60" y="66" width="34" height="24" fill={MUT} opacity="0.5" />
      <rect x="60" y="34" width="34" height="32" fill={HOT} opacity="0.6" />
      <rect x="150" y="60" width="34" height="30" fill={MUT} opacity="0.5" />
      <rect x="150" y="46" width="34" height="14" fill={HOT} opacity="0.6" />
      <T x="77" y="28" textAnchor="middle" fill={HOT} fontSize="7">IV alta</T>
      <T x="167" y="40" textAnchor="middle" fill={HOT} fontSize="7">IV baja</T>
      <T x="120" y="102" textAnchor="middle" fill={MUT} fontSize="7">prima = intrínseco + tiempo</T>
    </Frame>
  ),
  // IV rank: 52-week range bar with current marker
  rank: (
    <Frame label="IV rank within 52-week range">
      <rect x="30" y="50" width="180" height="14" rx="3" fill={MUT} opacity="0.3" />
      <rect x="30" y="50" width="120" height="14" rx="3" fill={UP} opacity="0.35" />
      <line x1="150" y1="44" x2="150" y2="70" stroke={HOT} strokeWidth="2.5" />
      <T x="150" y="40" textAnchor="middle" fill={HOT} fontSize="7">IV hoy</T>
      <T x="30" y="82" fill={MUT} fontSize="7">mín 52s</T>
      <T x="210" y="82" textAnchor="end" fill={MUT} fontSize="7">máx 52s</T>
      <T x="120" y="102" textAnchor="middle" fill={UP} fontSize="7">IVR ≈ 67 → vender</T>
    </Frame>
  ),
  // Volatility skew: put wing higher than call wing
  skew: (
    <Frame label="volatility skew curve">
      <Axis />
      <Line pts="26,32 60,44 100,58 128,60 160,56 200,50 224,48" c={DOWN} />
      <line x1="128" y1="16" x2="128" y2="90" stroke={MUT} strokeDasharray="3 2" />
      <T x="128" y="102" textAnchor="middle" fill={MUT} fontSize="7">ATM</T>
      <T x="26" y="28" fill={DOWN} fontSize="7">puts caras</T>
      <T x="188" y="44" fill={NEUT} fontSize="7">calls</T>
    </Frame>
  ),
  // Term structure: contango vs backwardation
  term: (
    <Frame label="term structure contango vs backwardation">
      <Axis />
      <Line pts="24,66 80,58 140,50 224,44" c={NEUT} />
      <Line pts="24,30 80,46 140,58 224,64" c={DOWN} dash="3 2" />
      <T x="150" y="42" fill={NEUT} fontSize="7">contango</T>
      <T x="30" y="26" fill={DOWN} fontSize="7">backwardation (evento)</T>
      <T x="205" y="102" textAnchor="middle" fill={MUT} fontSize="7">vencim. →</T>
    </Frame>
  ),
  // Vol crush: IV ramps into earnings then collapses
  crush: (
    <Frame label="IV crush at earnings">
      <Axis />
      <line x1="150" y1="16" x2="150" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="150" y="102" textAnchor="middle" fill={HOT} fontSize="7">resultados</T>
      <Line pts="24,70 70,58 110,42 148,26" c={DOWN} />
      <Line pts="150,26 156,72 200,76 224,78" c={UP} />
      <T x="60" y="40" fill={DOWN} fontSize="7">IV ↑</T>
      <T x="170" y="52" fill={UP} fontSize="7">crush ↓</T>
    </Frame>
  ),
  // Vega: IV vs realized HV, edge in the gap
  vega: (
    <Frame label="implied vs historical volatility">
      <Axis />
      <Line pts="24,44 60,40 100,48 140,38 190,44 224,40" c={DOWN} />
      <Line pts="24,68 60,70 100,64 140,72 190,66 224,70" c={UP} dash="3 2" />
      <T x="150" y="34" fill={DOWN} fontSize="7">IV (implícita)</T>
      <T x="150" y="84" fill={UP} fontSize="7">HV (realizada)</T>
      <rect x="24" y="44" width="200" height="24" fill={HOT} opacity="0.10" />
      <T x="30" y="58" fill={HOT} fontSize="7">edge = IV − HV</T>
    </Frame>
  ),
};

export function hasOptionsVolVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function OptionsVolVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
