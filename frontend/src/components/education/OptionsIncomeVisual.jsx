import React from 'react';

// Language-neutral schematic SVGs for the "Options: income & assignment" module,
// keyed by item id. green = up/profit, red = down/loss, blue = neutral, amber = key
// level/event, muted = context/axes.

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
  // Covered call: long stock diagonal, capped at strike
  covered: (
    <Frame label="covered call payoff">
      <Axis />
      <line x1="128" y1="16" x2="128" y2="90" stroke={MUT} strokeDasharray="3 2" />
      <T x="128" y="102" textAnchor="middle" fill={MUT} fontSize="7">strike</T>
      <Line pts="24,84 128,44 224,44" c={UP} />
      <line x1="24" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" strokeDasharray="2 2" />
      <T x="150" y="40" fill={UP} fontSize="7">techo ↑</T>
      <T x="30" y="80" fill={HOT} fontSize="7">+prima</T>
    </Frame>
  ),
  // Cash-secured put: flat premium above strike, losses below
  csp: (
    <Frame label="cash-secured put payoff">
      <Axis />
      <line x1="120" y1="16" x2="120" y2="90" stroke={MUT} strokeDasharray="3 2" />
      <T x="120" y="102" textAnchor="middle" fill={MUT} fontSize="7">strike</T>
      <Line pts="120,52 224,52" c={UP} />
      <Line pts="24,88 120,52" c={DOWN} />
      <T x="150" y="46" fill={UP} fontSize="7">+prima</T>
      <T x="34" y="80" fill={DOWN} fontSize="7">te asignan</T>
    </Frame>
  ),
  // The wheel: circular flow CSP -> shares -> CC -> sold -> repeat
  wheel: (
    <Frame label="the wheel cycle">
      <circle cx="120" cy="56" r="34" fill="none" stroke={MUT} strokeWidth="1" strokeDasharray="3 3" />
      <path d="M120 22 a34 34 0 0 1 29 51" fill="none" stroke={UP} strokeWidth="2" />
      <path d="M149 73 a34 34 0 0 1 -58 0" fill="none" stroke={HOT} strokeWidth="2" />
      <path d="M91 73 a34 34 0 0 1 29 -51" fill="none" stroke={NEUT} strokeWidth="2" />
      <polygon points="149,73 145,66 153,67" fill={UP} />
      <T x="120" y="16" textAnchor="middle" fill={UP} fontSize="7">CSP</T>
      <T x="176" y="60" textAnchor="middle" fill={HOT} fontSize="7">acciones</T>
      <T x="120" y="112" textAnchor="middle" fill={HOT} fontSize="7">covered call</T>
      <T x="58" y="60" textAnchor="middle" fill={NEUT} fontSize="7">venta</T>
    </Frame>
  ),
  // Assignment: buyer exercises -> seller obligated
  assign: (
    <Frame label="assignment flow">
      <rect x="24" y="40" width="70" height="30" rx="4" fill={NEUT} opacity="0.5" />
      <T x="59" y="52" textAnchor="middle" fill="#0a0a0a" fontSize="7">comprador</T>
      <T x="59" y="63" textAnchor="middle" fill="#0a0a0a" fontSize="7">ejerce</T>
      <rect x="146" y="40" width="70" height="30" rx="4" fill={HOT} opacity="0.5" />
      <T x="181" y="52" textAnchor="middle" fill="#0a0a0a" fontSize="7">vendedor</T>
      <T x="181" y="63" textAnchor="middle" fill="#0a0a0a" fontSize="7">obligado</T>
      <line x1="96" y1="55" x2="144" y2="55" stroke={DOWN} strokeWidth="2" />
      <polygon points="144,55 137,51 137,59" fill={DOWN} />
      <T x="120" y="30" textAnchor="middle" fill={MUT} fontSize="7">strike</T>
    </Frame>
  ),
  // Expiration / pin risk: price pinned at strike
  expire: (
    <Frame label="pin risk at strike">
      <Axis />
      <line x1="124" y1="16" x2="124" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <T x="124" y="102" textAnchor="middle" fill={HOT} fontSize="7">strike</T>
      <Line pts="24,70 60,50 92,66 124,58 156,64 190,56 224,60" c={NEUT} w={1.6} />
      <circle cx="224" cy="60" r="3" fill={HOT} />
      <T x="150" y="30" fill={HOT} fontSize="7">¿ITM u OTM?</T>
      <T x="30" y="30" fill={MUT} fontSize="7">cierre viernes</T>
    </Frame>
  ),
  // 0DTE: exploding gamma + collapsing theta near expiry
  zero: (
    <Frame label="0DTE gamma and theta">
      <Axis />
      <Line pts="24,86 120,80 176,66 210,36 224,20" c={HOT} />
      <Line pts="24,40 96,46 150,58 200,78 224,88" c={DOWN} dash="3 2" />
      <T x="150" y="30" fill={HOT} fontSize="7">gamma ↑↑</T>
      <T x="34" y="36" fill={DOWN} fontSize="7">theta ↓↓</T>
      <T x="205" y="102" textAnchor="middle" fill={MUT} fontSize="7">vencim.</T>
    </Frame>
  ),
};

export function hasOptionsIncomeVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function OptionsIncomeVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
