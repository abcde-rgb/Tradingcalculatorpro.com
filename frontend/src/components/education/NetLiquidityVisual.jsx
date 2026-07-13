import React from 'react';

// Language-neutral schematic SVGs for "Macro net liquidity", keyed by item id.
// green = injects/up, red = drains/down, blue = neutral/net, amber = the key
// piece, muted = context.

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
const Line = ({ pts, c, w = 2, dash }) => (
  <polyline points={pts} fill="none" stroke={c} strokeWidth={w} strokeLinejoin="round"
            strokeLinecap="round" strokeDasharray={dash} />
);

const VISUALS = {
  // Net liquidity = WALCL − TGA − RRP
  what: (
    <Frame label="net liquidity formula">
      <rect x="16" y="34" width="30" height="60" fill={NEUT} opacity="0.8" />
      <T x="31" y="104" textAnchor="middle" fill={NEUT} fontSize="6.5">Fed</T>
      <T x="58" y="70" textAnchor="middle" fill={MUT} fontSize="12">−</T>
      <rect x="70" y="66" width="24" height="28" fill={HOT} opacity="0.8" />
      <T x="82" y="104" textAnchor="middle" fill={HOT} fontSize="6.5">TGA</T>
      <T x="104" y="70" textAnchor="middle" fill={MUT} fontSize="12">−</T>
      <rect x="116" y="70" width="22" height="24" fill={BAD} opacity="0.8" />
      <T x="127" y="104" textAnchor="middle" fill={BAD} fontSize="6.5">RRP</T>
      <T x="150" y="70" textAnchor="middle" fill={MUT} fontSize="12">=</T>
      <rect x="164" y="56" width="60" height="38" fill={GOOD} opacity="0.8" />
      <T x="194" y="104" textAnchor="middle" fill={GOOD} fontSize="6.5">liquidez neta</T>
    </Frame>
  ),
  // Fed balance sheet — QE up, QT down
  balance: (
    <Frame label="fed balance sheet QE QT">
      <line x1="16" y1="98" x2="224" y2="98" stroke={MUT} strokeWidth="0.6" />
      <Line pts="16,88 60,50 104,34 128,34" c={GOOD} w={2} />
      <Line pts="128,34 172,48 224,72" c={BAD} w={2} />
      <T x="40" y="30" fill={GOOD} fontSize="6.5">QE: inyecta</T>
      <T x="176" y="42" fill={BAD} fontSize="6.5">QT: drena</T>
      <T x="16" y="16" fill={MUT} fontSize="6.5">balance de la Fed (WALCL)</T>
    </Frame>
  ),
  // TGA — fills (drains) or empties (injects)
  tga: (
    <Frame label="treasury general account">
      <rect x="90" y="30" width="60" height="64" rx="3" fill="none" stroke={HOT} strokeWidth="1.4" />
      <rect x="92" y="60" width="56" height="32" fill={HOT} opacity="0.35" />
      <T x="120" y="24" textAnchor="middle" fill={HOT} fontSize="6.5">TGA (Tesoro)</T>
      <path d="M60 46 h22" stroke={BAD} strokeWidth="1.4" /><path d="M76 42 l6 4 -6 4" fill={BAD} />
      <T x="20" y="44" fill={BAD} fontSize="6">acumula</T><T x="26" y="56" fill={BAD} fontSize="6">→ drena</T>
      <path d="M158 78 h22" stroke={GOOD} strokeWidth="1.4" /><path d="M174 74 l6 4 -6 4" fill={GOOD} />
      <T x="184" y="76" fill={GOOD} fontSize="6">gasta</T><T x="184" y="88" fill={GOOD} fontSize="6">→ inyecta</T>
    </Frame>
  ),
  // RRP — parked money that can flow out to markets
  rrp: (
    <Frame label="reverse repo parked money">
      <rect x="24" y="24" width="34" height="70" fill={NEUT} opacity="0.5" />
      <rect x="24" y="60" width="34" height="34" fill={NEUT} opacity="0.85" />
      <T x="41" y="104" textAnchor="middle" fill={NEUT} fontSize="6.5">RRP baja</T>
      <path d="M62 66 C110 66 120 60 168 60" stroke={GOOD} strokeWidth="1.6" fill="none" />
      <path d="M162 56 l8 4 -8 4" fill={GOOD} />
      <rect x="172" y="48" width="52" height="22" rx="3" fill={GOOD} opacity="0.15" stroke={GOOD} strokeWidth="0.8" />
      <T x="198" y="62" textAnchor="middle" fill={GOOD} fontSize="6.5">a los mercados</T>
      <T x="24" y="16" fill={MUT} fontSize="6.5">liquidez congelada que sale</T>
    </Frame>
  ),
  // Net liquidity vs S&P — move together with a lag
  market: (
    <Frame label="net liquidity versus S&P">
      <Line pts="16,80 48,68 80,72 112,52 144,58 176,38 208,44 224,34" c={NEUT} w={1.8} />
      <Line pts="16,86 52,76 84,80 116,60 148,64 180,46 212,50 224,42" c={GOOD} w={1.6} dash="4 3" />
      <T x="18" y="20" fill={NEUT} fontSize="6.5">liquidez neta</T>
      <T x="150" y="90" fill={GOOD} fontSize="6.5">S&amp;P (desfase ~2 sem.)</T>
      <T x="176" y="20" fill={HOT} fontSize="7">corr ≈ 0,95</T>
    </Frame>
  ),
  // Caveat — correlation can break
  caveat: (
    <Frame label="correlation is not causation">
      <Line pts="16,70 56,58 96,62 130,48" c={NEUT} w={1.6} />
      <Line pts="16,74 56,62 96,66 130,52" c={GOOD} w={1.6} dash="4 3" />
      <Line pts="130,48 168,40 200,54 224,30" c={NEUT} w={1.6} />
      <Line pts="130,52 168,66 200,84 224,96" c={GOOD} w={1.6} dash="4 3" />
      <line x1="130" y1="20" x2="130" y2="104" stroke={BAD} strokeWidth="0.7" strokeDasharray="3 3" />
      <path d="M150 26 l10 -16 10 16 z" fill="none" stroke={HOT} strokeWidth="1.2" />
      <T x="160" y="24" textAnchor="middle" fill={HOT} fontSize="8">!</T>
      <T x="20" y="112" fill={MUT} fontSize="6.5">correlación ≠ causalidad; no es timing</T>
    </Frame>
  ),
};

export function hasNetLiquidityVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function NetLiquidityVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
