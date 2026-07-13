import React from 'react';

// Language-neutral schematic SVGs for the "Trading taxes" module, keyed by item id.
// green = gain/kept, red = tax/loss, blue = neutral, amber = key/warning, muted = context.

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

const VISUALS = {
  // Realized vs unrealized: tax only triggers on the sell
  basics: (
    <Frame label="tax triggers on realized gain">
      <polyline points="20,70 60,60 100,66 140,44 180,50" fill="none" stroke={NEUT} strokeWidth="1.8" />
      <circle cx="180" cy="50" r="4" fill={HOT} />
      <line x1="180" y1="20" x2="180" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="180" y="102" textAnchor="middle" fill={HOT} fontSize="7">vendes</T>
      <T x="60" y="86" fill={MUT} fontSize="7">latente = sin impuesto</T>
      <T x="150" y="34" fill={HOT} fontSize="7">realizado →</T>
    </Frame>
  ),
  // Spain: progressive brackets bar
  spain: (
    <Frame label="progressive savings-base brackets">
      {[['19%',30,60,UP],['21%',72,58,UP],['23%',114,54,HOT],['27%',156,50,HOT],['28%',198,46,DOWN]].map(
        ([lbl,x,h,c],i)=>(
          <g key={i}>
            <rect x={x} y={90-h} width="30" height={h} fill={c} opacity="0.55" />
            <T x={x+15} y={90-h-3} textAnchor="middle" fill={c} fontSize="7">{lbl}</T>
          </g>
        )
      )}
      <line x1="24" y1="90" x2="234" y2="90" stroke={MUT} strokeWidth="0.75" />
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">base del ahorro (IRPF) →</T>
    </Frame>
  ),
  // Holding period: 1-year line splits ordinary vs long-term
  holding: (
    <Frame label="holding period splits tax rate">
      <line x1="120" y1="18" x2="120" y2="92" stroke={MUT} strokeDasharray="3 2" />
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">1 año</T>
      <rect x="26" y="40" width="90" height="20" fill={DOWN} opacity="0.5" />
      <T x="71" y="54" textAnchor="middle" fill="#0a0a0a" fontSize="7">ordinaria ↑</T>
      <rect x="124" y="40" width="100" height="20" fill={UP} opacity="0.5" />
      <T x="174" y="54" textAnchor="middle" fill="#0a0a0a" fontSize="7">largo plazo ↓</T>
    </Frame>
  ),
  // Loss offsetting: gains minus losses = net taxable
  loss: (
    <Frame label="losses offset gains">
      <rect x="30" y="34" width="40" height="50" fill={UP} opacity="0.55" />
      <T x="50" y="98" textAnchor="middle" fill={UP} fontSize="7">ganancias</T>
      <T x="86" y="62" textAnchor="middle" fill={MUT} fontSize="12">−</T>
      <rect x="100" y="58" width="40" height="26" fill={DOWN} opacity="0.55" />
      <T x="120" y="98" textAnchor="middle" fill={DOWN} fontSize="7">pérdidas</T>
      <T x="156" y="62" textAnchor="middle" fill={MUT} fontSize="12">=</T>
      <rect x="172" y="60" width="40" height="24" fill={HOT} opacity="0.55" />
      <T x="192" y="98" textAnchor="middle" fill={HOT} fontSize="7">base neta</T>
    </Frame>
  ),
  // Disclaimer: warning
  disclaimer: (
    <Frame label="not tax advice">
      <path d="M120 26 L150 82 L90 82 Z" fill="none" stroke={HOT} strokeWidth="2" strokeLinejoin="round" />
      <line x1="120" y1="46" x2="120" y2="66" stroke={HOT} strokeWidth="2.4" />
      <circle cx="120" cy="74" r="1.8" fill={HOT} />
      <T x="120" y="100" textAnchor="middle" fill={MUT} fontSize="7">educación, no asesoría</T>
    </Frame>
  ),
};

export function hasTaxesVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function TaxesVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
