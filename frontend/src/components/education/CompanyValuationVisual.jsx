import React from 'react';

// Language-neutral schematic SVGs for the "Value a company" module, keyed by
// item id (same pattern as OrderFlowVisual). green = good/growth/equity,
// red = cost/debt, blue = neutral, amber = highlight.

const GOOD = '#22c55e';
const COST = '#ef4444';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 240 118" className="w-full h-28" role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">{children}</svg>
);
const T = (p) => <text fontSize="8" fontFamily="monospace" {...p} />;

const VISUALS = {
  // Income statement as a waterfall: revenue → gross → operating → net
  income: (
    <Frame label="income statement">
      {/* floating waterfall bars, top=100 revenue down to net */}
      {[['Ing.', 18, 100, 8, NEUT], ['Bruto', 74, 56, 44, GOOD], ['Oper.', 130, 24, 76, GOOD], ['Neto', 186, 15, 85, GOOD]].map(
        ([lbl, x, h, top, c], i) => (
          <g key={i}>
            <rect x={x} y={top} width="34" height={h} fill={c} opacity="0.8" rx="1" />
            <T x={x + 17} y="112" textAnchor="middle" fill={MUT}>{lbl}</T>
          </g>
        )
      )}
      {/* red "minus cost" connectors */}
      {[[52, 8, 44], [108, 44, 76], [164, 76, 85]].map(([x, y1, y2], i) => (
        <rect key={i} x={x} y={y1} width="22" height={y2 - y1} fill={COST} opacity="0.35" rx="1" />
      ))}
      <T x="8" y="14" fill={NEUT}>100</T>
    </Frame>
  ),
  // Margins funnel — gross > operating > net
  margins: (
    <Frame label="margins">
      {[['Margen bruto', 20, 168, GOOD, '55%'], ['Margen operativo', 52, 66, GOOD, '22%'], ['Margen neto', 84, 39, GOOD, '13%']].map(
        ([lbl, y, w, c, pct], i) => (
          <g key={i}>
            <T x="20" y={y - 7} fill={MUT}>{lbl}</T>
            <rect x="20" y={y - 4} width={w} height="12" fill={c} opacity={0.85 - i * 0.2} rx="1" />
            <T x={w + 26} y={y + 5} fill={c}>{pct}</T>
          </g>
        )
      )}
    </Frame>
  ),
  // Free cash flow vs reported net income (FCF ≥ profit = healthy, harder to fake)
  fcf: (
    <Frame label="free cash flow">
      <line x1="14" y1="98" x2="226" y2="98" stroke={MUT} strokeWidth="0.75" />
      <rect x="54" y="52" width="42" height="46" fill={NEUT} opacity="0.8" rx="1" />
      <T x="75" y="112" textAnchor="middle" fill={MUT}>B. neto</T>
      <rect x="140" y="34" width="42" height="64" fill={GOOD} opacity="0.85" rx="1" />
      <T x="161" y="112" textAnchor="middle" fill={MUT}>FCF</T>
      <path d="M158 26 l4 8 l-8 0 z" fill={GOOD} />
      <T x="172" y="24" fill={GOOD}>caja real</T>
    </Frame>
  ),
  // Debt vs equity split + fragility gauge
  debt: (
    <Frame label="debt to equity">
      <rect x="20" y="34" width="130" height="18" fill={GOOD} opacity="0.85" rx="2" />
      <rect x="150" y="34" width="70" height="18" fill={COST} opacity="0.85" rx="2" />
      <T x="24" y="46" fill="#0a0a0a">fondos propios</T>
      <T x="154" y="46" fill="#0a0a0a">deuda</T>
      <T x="20" y="78" fill={MUT}>Deuda / Fondos propios</T>
      {[['bajo', GOOD], ['medio', HOT], ['alto', COST]].map(([lbl, c], i) => (
        <g key={i}>
          <rect x={20 + i * 66} y="86" width="60" height="9" fill={c} opacity={i === 0 ? 0.9 : 0.3} rx="1" />
          <T x={20 + i * 66 + 30} y="93" textAnchor="middle" fill="#0a0a0a">{lbl}</T>
        </g>
      ))}
    </Frame>
  ),
  // Economic moat — a castle behind a moat
  moat: (
    <Frame label="economic moat">
      <ellipse cx="120" cy="92" rx="96" ry="16" fill={NEUT} opacity="0.25" />
      <ellipse cx="120" cy="92" rx="58" ry="9" fill={NEUT} opacity="0.2" />
      {/* castle */}
      <g fill={MUT} opacity="0.9">
        <rect x="96" y="46" width="48" height="34" />
        <rect x="94" y="40" width="8" height="8" /><rect x="108" y="40" width="8" height="8" />
        <rect x="124" y="40" width="8" height="8" /><rect x="138" y="40" width="8" height="8" />
        <rect x="114" y="60" width="12" height="20" fill="#0a0a0a" />
      </g>
      <T x="120" y="34" textAnchor="middle" fill={GOOD}>ventaja durable</T>
      <T x="120" y="112" textAnchor="middle" fill={NEUT}>foso: marca · red · escala · patentes</T>
    </Frame>
  ),
  // Valuation multiples vs the sector (cheap/expensive is relative)
  multiples: (
    <Frame label="valuation multiples">
      <line x1="70" y1="14" x2="70" y2="104" stroke={MUT} strokeWidth="0.75" strokeDasharray="3 3" />
      <T x="70" y="112" textAnchor="middle" fill={MUT}>media sector</T>
      <rect x="70" y="26" width="92" height="14" fill={HOT} opacity="0.8" rx="1" />
      <T x="14" y="36" fill={MUT}>Empresa</T><T x="166" y="36" fill={HOT}>caro</T>
      <rect x="34" y="56" width="36" height="14" fill={GOOD} opacity="0.8" rx="1" />
      <T x="14" y="66" fill={MUT}>Rival</T><T x="4" y="82" fill={GOOD} fontSize="7">barato ↔ caro vs su historia y su sector</T>
    </Frame>
  ),
  // DCF — future cash flows discounted back to a value today
  dcf: (
    <Frame label="discounted cash flow">
      {[0, 1, 2, 3, 4].map((i) => {
        const h = 54 - i * 8;
        const x = 96 + i * 26;
        return (
          <g key={i}>
            <rect x={x} y={90 - h} width="18" height={h} fill={GOOD} opacity={0.8 - i * 0.12} rx="1" />
            <T x={x + 9} y="102" textAnchor="middle" fill={MUT}>A{i + 1}</T>
          </g>
        );
      })}
      <path d="M92 60 L64 60" stroke={HOT} strokeWidth="1.5" />
      <path d="M70 56 L64 60 L70 64" fill="none" stroke={HOT} strokeWidth="1.5" />
      <rect x="14" y="42" width="46" height="36" fill={HOT} opacity="0.2" stroke={HOT} strokeWidth="1" rx="2" />
      <T x="37" y="58" textAnchor="middle" fill={HOT}>valor</T>
      <T x="37" y="68" textAnchor="middle" fill={HOT}>hoy</T>
      <T x="150" y="20" textAnchor="middle" fill={MUT}>flujos futuros →</T>
    </Frame>
  ),
};

export function hasCompanyValuationVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function CompanyValuationVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
