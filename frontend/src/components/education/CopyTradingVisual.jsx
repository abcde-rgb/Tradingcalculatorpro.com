import React from 'react';

// Language-neutral schematic SVGs for the "Copy & social trading" module, keyed by
// item id. green = gain, red = loss/risk, blue = neutral, amber = key, muted = context.

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
  // Leader mirrored into two follower accounts
  what: (
    <Frame label="leader trades mirrored to followers">
      <rect x="90" y="20" width="60" height="24" rx="4" fill={HOT} opacity="0.55" />
      <T x="120" y="35" textAnchor="middle" fill="#0a0a0a" fontSize="7">líder</T>
      {[[44,84],[120,84],[196,84]].map(([x],i)=>(
        <g key={i}>
          <rect x={x-26} y="72" width="52" height="22" rx="4" fill={NEUT} opacity="0.5" />
          <T x={x} y="86" textAnchor="middle" fill="#0a0a0a" fontSize="7">tú {i+1}</T>
          <line x1="120" y1="44" x2={x} y2="72" stroke={MUT} strokeWidth="1.2" />
        </g>
      ))}
      <T x="120" y="60" textAnchor="middle" fill={MUT} fontSize="7">copia automática</T>
    </Frame>
  ),
  // Due diligence: shiny return but deep drawdown
  due: (
    <Frame label="return high but drawdown deep">
      <Axis />
      <Line pts="22,70 60,40 90,52 120,26 150,78 180,44 224,34" c={NEUT} />
      <rect x="120" y="26" width="60" height="52" fill={DOWN} opacity="0.14" />
      <T x="40" y="34" fill={UP} fontSize="7">+300%</T>
      <T x="150" y="90" fill={DOWN} fontSize="7">DD −70%</T>
    </Frame>
  ),
  // Incentives: leader paid by followers/volume, not your PnL
  incent: (
    <Frame label="leader paid by followers not your pnl">
      <circle cx="60" cy="50" r="18" fill={HOT} opacity="0.5" />
      <T x="60" y="53" textAnchor="middle" fill="#0a0a0a" fontSize="7">líder</T>
      <path d="M78 44 h40" stroke={UP} strokeWidth="1.6" fill="none" /><polygon points="118,44 112,41 112,47" fill={UP} />
      <T x="150" y="42" textAnchor="middle" fill={UP} fontSize="7">€ por seguidores</T>
      <path d="M118 62 h-40" stroke={DOWN} strokeWidth="1.6" fill="none" strokeDasharray="3 2" /><polygon points="78,62 84,59 84,65" fill={DOWN} />
      <T x="150" y="70" textAnchor="middle" fill={DOWN} fontSize="7">tu PnL: aparte</T>
      <T x="60" y="86" textAnchor="middle" fill={MUT} fontSize="7">incentivo desalineado</T>
    </Frame>
  ),
  // Sizing: small % across several leaders
  size: (
    <Frame label="small allocation across several leaders">
      <circle cx="120" cy="54" r="34" fill={MUT} opacity="0.18" />
      <path d="M120 54 L120 20 A34 34 0 0 1 149 71 Z" fill={UP} opacity="0.5" />
      <path d="M120 54 L149 71 A34 34 0 0 1 96 78 Z" fill={NEUT} opacity="0.5" />
      <path d="M120 54 L96 78 A34 34 0 0 1 96 30 Z" fill={HOT} opacity="0.5" />
      <T x="120" y="104" textAnchor="middle" fill={MUT} fontSize="7">varios líderes · % pequeño</T>
    </Frame>
  ),
};

export function hasCopyTradingVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function CopyTradingVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
