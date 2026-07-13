import React from 'react';

// Language-neutral schematic SVGs for "Free isn't free / PFOF", keyed by item
// id. green = good/protect, red = hidden cost/conflict, blue = neutral flow,
// amber = the money, muted = context.

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
const Node = ({ x, y, w, c, label }) => (
  <g>
    <rect x={x} y={y} width={w} height="20" rx="3" fill={c} opacity="0.15" stroke={c} strokeWidth="0.9" />
    <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={c}>{label}</text>
  </g>
);
const Arrow = ({ x1, y1, x2, y2, c }) => (
  <g stroke={c} strokeWidth="1.2" fill="none">
    <line x1={x1} y1={y1} x2={x2} y2={y2} />
    <path d={`M${x2 - 6} ${y2 - 4} L${x2} ${y2} L${x2 - 6} ${y2 + 4}`} />
  </g>
);

const VISUALS = {
  // "$0 commission" but money flows out elsewhere
  free: (
    <Frame label="zero commission is not free">
      <rect x="86" y="20" width="68" height="24" rx="4" fill={GOOD} opacity="0.12" stroke={GOOD} />
      <T x="120" y="35" textAnchor="middle" fill={GOOD} fontSize="9">0 comisión</T>
      {[['flujo de órdenes', 30], ['interés del efectivo', 120], ['margen', 190]].map(([lbl, x], i) => (
        <g key={i}>
          <Arrow x1="120" y1="46" x2={x + 22} y2="78" c={HOT} />
          <T x={x + 22} y="92" textAnchor="middle" fill={HOT} fontSize="6">{lbl}</T>
        </g>
      ))}
      <T x="120" y="108" textAnchor="middle" fill={MUT} fontSize="6.5">si no pagas, el producto eres tú</T>
    </Frame>
  ),
  // PFOF flow: your order sold to a wholesaler that pays the broker
  pfof: (
    <Frame label="payment for order flow">
      <Node x={8} y={30} w={44} c={NEUT} label="tú" />
      <Node x={92} y={30} w={56} c={MUT} label="bróker" />
      <Node x={182} y={30} w={50} c={HOT} label="mayorista" />
      <Arrow x1={52} y1={40} x2={92} y2={40} c={NEUT} />
      <Arrow x1={148} y1={36} x2={182} y2={36} c={NEUT} />
      <T x="120" y="26" textAnchor="middle" fill={NEUT} fontSize="6">tu orden</T>
      <Arrow x1={182} y1={50} x2={148} y2={50} c={HOT} />
      <T x="164" y="64" textAnchor="middle" fill={HOT} fontSize="6.5">€ paga por el flujo</T>
      <T x="120" y="98" textAnchor="middle" fill={MUT} fontSize="6.5">tu orden es la mercancía</T>
    </Frame>
  ),
  // Internalisation — wholesaler takes the other side
  internal: (
    <Frame label="wholesaler takes the other side">
      <Node x={88} y={16} w={64} c={HOT} label="mayorista" />
      <line x1="60" y1="70" x2="180" y2="70" stroke={MUT} strokeWidth="0.7" />
      <T x="30" y="60" fill={GOOD} fontSize="6.5">demanda</T>
      <T x="30" y="86" fill={BAD} fontSize="6.5">oferta</T>
      <Arrow x1={120} y1={36} x2={70} y2={58} c={GOOD} />
      <T x="60" y="52" fill={GOOD} fontSize="6">compra en la demanda</T>
      <Arrow x1={120} y1={36} x2={172} y2={82} c={BAD} />
      <T x="132" y="96" fill={BAD} fontSize="6">vende en la oferta</T>
      <T x="120" y="112" textAnchor="middle" fill={MUT} fontSize="6.5">embolsa el spread</T>
    </Frame>
  ),
  // The invisible spread cost
  spread: (
    <Frame label="the invisible spread cost">
      <rect x="30" y="46" width="80" height="16" fill={GOOD} opacity="0.25" stroke={GOOD} strokeWidth="0.8" />
      <T x="70" y="42" textAnchor="middle" fill={GOOD} fontSize="6.5">demanda</T>
      <rect x="130" y="46" width="80" height="16" fill={BAD} opacity="0.25" stroke={BAD} strokeWidth="0.8" />
      <T x="170" y="42" textAnchor="middle" fill={BAD} fontSize="6.5">oferta</T>
      <line x1="110" y1="38" x2="130" y2="38" stroke={HOT} strokeWidth="1" />
      <T x="120" y="80" textAnchor="middle" fill={HOT} fontSize="6.5">el spread</T>
      <T x="120" y="94" textAnchor="middle" fill={MUT} fontSize="6.5">no ves comisión, pagas aquí</T>
    </Frame>
  ),
  // Conflict — routed to the highest payer, not best price
  conflict: (
    <Frame label="conflict of interest routing">
      <Node x={92} y={16} w={56} c={MUT} label="bróker" />
      <Arrow x1={112} y1={36} x2={60} y2={64} c={HOT} />
      <Node x={24} y={64} w={72} c={HOT} label="paga más €" />
      <Arrow x1={128} y1={36} x2={180} y2={64} c={GOOD} />
      <Node x={150} y={64} w={78} c={GOOD} label="mejor precio" />
      <path d="M60 86 l0 8" stroke={HOT} strokeWidth="1.4" />
      <path d="M56 90 l4 6 4 -6" fill={HOT} />
      <T x="120" y="110" textAnchor="middle" fill={MUT} fontSize="6.5">incentivo a enrutar por el pago</T>
    </Frame>
  ),
  // Protect — limit order shield + checklist
  protect: (
    <Frame label="protect yourself limit orders">
      <path d="M40 20 l26 8 v20 c0 18 -13 26 -26 32 c-13 -6 -26 -14 -26 -32 v-20 z" fill={GOOD} opacity="0.12" stroke={GOOD} strokeWidth="1.2" />
      <path d="M28 52 l9 9 16 -20" fill="none" stroke={GOOD} strokeWidth="2" />
      {['orden límite (fijas precio)', 'compara el spread efectivo', 'bróker transparente'].map((lbl, i) => (
        <g key={i}>
          <rect x="96" y={26 + i * 24} width="8" height="8" rx="1.5" fill={GOOD} opacity="0.85" />
          <T x="110" y={33 + i * 24} fill={MUT} fontSize="6.5">{lbl}</T>
        </g>
      ))}
    </Frame>
  ),
};

export function hasPfofVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function PfofVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
