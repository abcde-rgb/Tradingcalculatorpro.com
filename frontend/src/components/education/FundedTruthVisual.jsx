import React from 'react';

// Language-neutral schematic SVGs for the "Truth about funded accounts" module,
// keyed by item id. green = good/real, red = bad/loss, blue = neutral, amber = key
// warning, muted = context/axes.

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
  // Real prop pays you; funded challenge takes your fee (opposite money flow)
  real: (
    <Frame label="real prop pays you vs funded takes your fee">
      <rect x="24" y="30" width="80" height="26" rx="4" fill={UP} opacity="0.5" />
      <T x="64" y="46" textAnchor="middle" fill="#0a0a0a">prop real</T>
      <T x="64" y="18" textAnchor="middle" fill={UP} fontSize="7">te paga →</T>
      <path d="M104 43 h32" stroke={UP} strokeWidth="1.6" fill="none" /><polygon points="136,43 130,40 130,46" fill={UP} />
      <rect x="24" y="74" width="80" height="26" rx="4" fill={DOWN} opacity="0.5" />
      <T x="64" y="90" textAnchor="middle" fill="#0a0a0a">fondeo</T>
      <path d="M136 87 h-32" stroke={DOWN} strokeWidth="1.6" fill="none" strokeDasharray="3 2" /><polygon points="104,87 110,84 110,90" fill={DOWN} />
      <T x="150" y="90" fill={DOWN} fontSize="7">← tú pagas</T>
      <T x="150" y="46" fill={MUT} fontSize="7">tú</T>
    </Frame>
  ),
  // Business model: fee pool — most fail, firm keeps fees
  model: (
    <Frame label="fees from failures kept by the firm">
      <rect x="30" y="30" width="180" height="20" rx="3" fill={MUT} opacity="0.25" />
      <rect x="30" y="30" width="162" height="20" rx="3" fill={DOWN} opacity="0.55" />
      <T x="110" y="44" textAnchor="middle" fill="#0a0a0a" fontSize="7">~90% suspende → cuotas</T>
      <rect x="30" y="62" width="18" height="20" rx="3" fill={UP} opacity="0.55" />
      <T x="55" y="76" fill={UP} fontSize="7">payouts</T>
      <T x="30" y="98" fill={HOT} fontSize="7">ventaja de la casa = cuotas − payouts</T>
    </Frame>
  ),
  // Demo: simulated screen disconnected from the market
  demo: (
    <Frame label="funded account is a simulator">
      <rect x="40" y="26" width="86" height="54" rx="4" fill="none" stroke={NEUT} strokeWidth="1.5" />
      <Line pts="48,66 62,54 76,60 90,44 104,50 118,38" c={NEUT} w={1.4} />
      <T x="83" y="20" textAnchor="middle" fill={NEUT} fontSize="7">SIM (demo)</T>
      <line x1="132" y1="53" x2="160" y2="53" stroke={DOWN} strokeWidth="1.6" strokeDasharray="2 3" />
      <path d="M146 47 l0 12 M141 53 l10 0" stroke={DOWN} strokeWidth="1.4" transform="rotate(45 146 53)" />
      <rect x="166" y="40" width="54" height="26" rx="4" fill={MUT} opacity="0.25" />
      <T x="193" y="56" textAnchor="middle" fill={MUT} fontSize="7">mercado real</T>
      <T x="83" y="96" textAnchor="middle" fill={MUT} fontSize="7">sin liquidez real</T>
    </Frame>
  ),
  // Math: negative expected value (fee vs low pass probability)
  math: (
    <Frame label="negative expected value">
      <T x="20" y="40" fill={MUT} fontSize="8">EV ≈ 0,07 × payout − 500€</T>
      <line x1="20" y1="60" x2="220" y2="60" stroke={MUT} strokeWidth="0.75" />
      <T x="20" y="56" fill={UP} fontSize="7">0</T>
      <rect x="70" y="60" width="120" height="14" fill={DOWN} opacity="0.55" />
      <T x="130" y="70" textAnchor="middle" fill="#0a0a0a" fontSize="7">EV negativo</T>
      <path d="M70 74 l-6 -4 l0 8 z" fill={DOWN} />
      <T x="20" y="92" fill={HOT} fontSize="7">como la ruleta: la casa gana a la larga</T>
    </Frame>
  ),
  // Rules trap: a variance losing streak breaches the daily cap
  rules: (
    <Frame label="normal variance breaches the daily loss cap">
      <Axis />
      <line x1="20" y1="46" x2="228" y2="46" stroke={MUT} strokeWidth="0.6" />
      <line x1="20" y1="70" x2="228" y2="70" stroke={DOWN} strokeWidth="1" strokeDasharray="4 2" />
      <T x="150" y="66" fill={DOWN} fontSize="7">tope −5% diario</T>
      <Line pts="24,46 60,52 96,58 132,66 150,78" c={DOWN} />
      <circle cx="150" cy="78" r="3.2" fill={DOWN} />
      <T x="30" y="34" fill={MUT} fontSize="7">3 pérdidas × 2% = −6%</T>
      <T x="150" y="92" textAnchor="middle" fill={DOWN} fontSize="7">cuenta rota</T>
    </Frame>
  ),
  // Leverage/withdrawal: real exposure vs funded's tiny usable size
  leverage: (
    <Frame label="real broker exposure vs funded usable size">
      <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
      <rect x="34" y="24" width="52" height="66" fill={UP} opacity="0.5" />
      <T x="60" y="18" textAnchor="middle" fill={UP} fontSize="7">real 100%</T>
      <T x="60" y="102" textAnchor="middle" fill={MUT} fontSize="6.5">retirable</T>
      <rect x="120" y="70" width="52" height="20" fill={DOWN} opacity="0.5" />
      <rect x="120" y="30" width="52" height="40" fill={MUT} opacity="0.18" />
      <T x="146" y="24" textAnchor="middle" fill={MUT} fontSize="7">"100k€"</T>
      <T x="146" y="84" textAnchor="middle" fill="#0a0a0a" fontSize="6.5">usable ~5-10k</T>
      <T x="146" y="102" textAnchor="middle" fill={MUT} fontSize="6.5">80% · tras pasar</T>
    </Frame>
  ),
  // Case: regulatory action / warning
  case: (
    <Frame label="regulatory action">
      <path d="M120 24 L150 82 L90 82 Z" fill="none" stroke={HOT} strokeWidth="2" strokeLinejoin="round" />
      <line x1="120" y1="44" x2="120" y2="64" stroke={HOT} strokeWidth="2.4" />
      <circle cx="120" cy="72" r="1.8" fill={HOT} />
      <T x="120" y="98" textAnchor="middle" fill={MUT} fontSize="7">CFTC 2023 · ~$310M · "demo"</T>
    </Frame>
  ),
  // Verdict: red-flag checklist
  verdict: (
    <Frame label="red flag checklist">
      {[[30,'"100k€" por una cuota'],[48,'vendido por afiliados'],[66,'demo / reparto'],[84,'reglas asfixiantes']].map(([y,txt],i)=>(
        <g key={i}>
          <rect x="26" y={y-8} width="11" height="11" rx="2" fill="none" stroke={DOWN} strokeWidth="1.4" />
          <path d={`M28 ${y-3} l2.5 3 l4 -6`} fill="none" stroke={DOWN} strokeWidth="1.4" />
          <T x="44" y={y} fill={MUT} fontSize="7.5">{txt}</T>
        </g>
      ))}
    </Frame>
  ),
};

export function hasFundedTruthVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function FundedTruthVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
