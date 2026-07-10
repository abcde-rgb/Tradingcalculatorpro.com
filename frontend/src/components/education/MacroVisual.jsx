import React from 'react';

// Language-neutral schematic SVGs for the "Macro: cycle, rates & sector
// rotation" module, keyed by item id (same pattern as CompanyValuationVisual).
// green = growth/expansion, red = recession/contraction, blue = neutral/rates,
// amber = peak/warning, muted = labels.

const GROW = '#22c55e';
const REC = '#ef4444';
const NEUT = '#60a5fa';
const HOT = '#f59e0b';
const MUT = '#94a3b8';

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 240 118" className="w-full h-28" role="img" aria-label={label}
       preserveAspectRatio="xMidYMid meet">{children}</svg>
);
const T = (p) => <text fontSize="8" fontFamily="monospace" {...p} />;

const VISUALS = {
  // Economic cycle as a wave: expansion → peak → recession → recovery
  cycle: (
    <Frame label="economic cycle">
      <line x1="12" y1="62" x2="228" y2="62" stroke={MUT} strokeWidth="0.5" strokeDasharray="2 2" />
      <path d="M14 78 C40 30 66 30 92 62 C118 94 144 94 170 62 C190 38 210 40 226 50"
            fill="none" stroke={NEUT} strokeWidth="2" />
      <circle cx="53" cy="37" r="2.5" fill={HOT} />
      <circle cx="131" cy="87" r="2.5" fill={REC} />
      <T x="40" y="24" fill={GROW}>expansión</T>
      <T x="52" y="49" fill={HOT} textAnchor="middle">pico</T>
      <T x="124" y="104" fill={REC} textAnchor="middle">recesión</T>
      <T x="196" y="34" fill={GROW} textAnchor="middle">recup.</T>
    </Frame>
  ),
  // Yield curve: normal (upward) vs inverted (downward)
  yieldcurve: (
    <Frame label="yield curve">
      <line x1="26" y1="14" x2="26" y2="100" stroke={MUT} strokeWidth="0.75" />
      <line x1="26" y1="100" x2="228" y2="100" stroke={MUT} strokeWidth="0.75" />
      <T x="8" y="20" fill={MUT}>tipo</T>
      <polyline points="40,86 90,74 140,63 190,52 214,48" fill="none" stroke={GROW} strokeWidth="2" />
      <polyline points="40,50 90,58 140,70 190,82 214,88" fill="none" stroke={REC} strokeWidth="2" strokeDasharray="4 2" />
      <T x="150" y="44" fill={GROW}>normal</T>
      <T x="150" y="98" fill={REC}>invertida</T>
      {['3m', '2a', '10a', '30a'].map((m, i) => (
        <T key={i} x={44 + i * 52} y="110" fill={MUT} textAnchor="middle">{m}</T>
      ))}
    </Frame>
  ),
  // Curve inversion (10y-2y spread) crossing below zero → recession band
  inversion: (
    <Frame label="curve inversion spread">
      <line x1="14" y1="52" x2="226" y2="52" stroke={MUT} strokeWidth="0.75" />
      <T x="16" y="48" fill={MUT}>0</T>
      <rect x="150" y="16" width="60" height="80" fill={REC} opacity="0.12" />
      <T x="180" y="26" fill={REC} textAnchor="middle" fontSize="7">recesión</T>
      <polyline points="18,34 55,40 92,48 125,58 150,66" fill="none" stroke={GROW} strokeWidth="2" />
      <polyline points="150,66 178,70 205,60 224,48" fill="none" stroke={REC} strokeWidth="2" />
      <circle cx="139" cy="52" r="2.5" fill={HOT} />
      <T x="118" y="80" fill={HOT} fontSize="7">inversión</T>
      <T x="20" y="26" fill={GROW} fontSize="7">10a − 2a</T>
    </Frame>
  ),
  // Cyclical vs defensive sectors
  sectors: (
    <Frame label="cyclical vs defensive sectors">
      <T x="66" y="20" fill={HOT} textAnchor="middle">Cíclicos</T>
      <T x="176" y="20" fill={GROW} textAnchor="middle">Defensivos</T>
      <line x1="120" y1="14" x2="120" y2="104" stroke={MUT} strokeWidth="0.5" strokeDasharray="3 3" />
      {['Tech', 'Industria', 'Consumo', 'Banca'].map((s, i) => (
        <g key={i}>
          <rect x="24" y={28 + i * 18} width="84" height="14" fill={HOT} opacity="0.75" rx="2" />
          <T x="66" y={38 + i * 18} fill="#0a0a0a" textAnchor="middle">{s}</T>
        </g>
      ))}
      {['Utilities', 'Salud', 'Básico'].map((s, i) => (
        <g key={i}>
          <rect x="134" y={28 + i * 18} width="84" height="14" fill={GROW} opacity="0.75" rx="2" />
          <T x="176" y={38 + i * 18} fill="#0a0a0a" textAnchor="middle">{s}</T>
        </g>
      ))}
    </Frame>
  ),
  // Sector rotation clock — which sectors lead in each phase (clockwise)
  rotation: (
    <Frame label="sector rotation clock">
      <circle cx="120" cy="60" r="47" fill="none" stroke={MUT} strokeWidth="0.75" />
      <line x1="73" y1="60" x2="167" y2="60" stroke={MUT} strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1="120" y1="13" x2="120" y2="107" stroke={MUT} strokeWidth="0.5" strokeDasharray="2 2" />
      <path d="M150 27 a40 40 0 0 1 15 21" fill="none" stroke={NEUT} strokeWidth="1.5" markerEnd="url(#mcRot)" />
      <defs><marker id="mcRot" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0 0 L6 3 L0 6 z" fill={NEUT} /></marker></defs>
      <T x="143" y="42" textAnchor="middle" fill={GROW} fontSize="7">recup.</T>
      <T x="143" y="52" textAnchor="middle" fill={MUT} fontSize="7">Banca</T>
      <T x="143" y="72" textAnchor="middle" fill={GROW} fontSize="7">expans.</T>
      <T x="143" y="82" textAnchor="middle" fill={MUT} fontSize="7">Industria</T>
      <T x="97" y="72" textAnchor="middle" fill={HOT} fontSize="7">pico</T>
      <T x="97" y="82" textAnchor="middle" fill={MUT} fontSize="7">Energía</T>
      <T x="97" y="42" textAnchor="middle" fill={REC} fontSize="7">reces.</T>
      <T x="97" y="52" textAnchor="middle" fill={MUT} fontSize="7">Defens.</T>
    </Frame>
  ),
  // Leading vs lagging indicators around a turning point
  leading: (
    <Frame label="leading vs lagging indicators">
      <line x1="14" y1="62" x2="222" y2="62" stroke={MUT} strokeWidth="1" markerEnd="url(#mcTime)" />
      <defs><marker id="mcTime" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto">
        <path d="M0 0 L7 3 L0 6 z" fill={MUT} /></marker></defs>
      <line x1="120" y1="22" x2="120" y2="100" stroke={HOT} strokeWidth="1.5" strokeDasharray="3 2" />
      <T x="120" y="17" textAnchor="middle" fill={HOT} fontSize="7">giro</T>
      <T x="66" y="40" textAnchor="middle" fill={NEUT} fontSize="7.5">adelantados</T>
      {[44, 66, 88].map((x, i) => (<circle key={i} cx={x} cy="62" r="2.5" fill={NEUT} />))}
      <T x="66" y="80" textAnchor="middle" fill={MUT} fontSize="6.5">PMI · curva · obra</T>
      <T x="172" y="40" textAnchor="middle" fill={MUT} fontSize="7.5">retrasados</T>
      {[158, 188].map((x, i) => (<circle key={i} cx={x} cy="62" r="2.5" fill={MUT} />))}
      <T x="172" y="80" textAnchor="middle" fill={MUT} fontSize="6.5">paro · PIB</T>
    </Frame>
  ),
};

export function hasMacroVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function MacroVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
