import React from 'react';

// Language-neutral schematic SVGs for the "Evidence-based trading" module,
// keyed by item id. green = winners/positive edge, red = losers/negative,
// blue = neutral/benchmark, amber = the key insight, muted = context.
// The numbers drawn here mirror the published studies cited in the copy
// (ESMA 74-89%, Brazil 97%, SPIVA 89.5%, AQR 1880-2016, B&O 11.4 vs 17.9).

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
  // The base rates: % of retail accounts losing money (ESMA band + Brazil study)
  numbers: (
    <Frame label="retail loss statistics">
      {[['CFD (ESMA)', 82, BAD], ['Day trading (Brasil)', 97, BAD], ['Ganan', 15, GOOD]].map(([lbl, v, c], i) => (
        <g key={i}>
          <T x="16" y={30 + i * 28} fill={MUT}>{lbl}</T>
          <rect x="16" y={34 + i * 28} width={(v / 100) * 190} height="11" rx="1.5" fill={c} opacity="0.8" />
          <T x={22 + (v / 100) * 190} y={43 + i * 28} fill={c}>{v}%</T>
        </g>
      ))}
    </Frame>
  ),
  // Law of large numbers — noisy results converging to the edge as N grows
  lln: (
    <Frame label="law of large numbers convergence">
      <line x1="20" y1="52" x2="226" y2="52" stroke={HOT} strokeWidth="1" strokeDasharray="4 3" />
      <T x="196" y="46" fill={HOT} fontSize="7">tu edge</T>
      <Line pts="20,20 34,88 48,30 62,74 76,38 92,66 108,44 128,60 148,48 168,57 188,50 210,53 226,52" c={NEUT} w={1.6} />
      <line x1="20" y1="100" x2="226" y2="100" stroke={MUT} strokeWidth="0.75" />
      {[['10', 34], ['100', 108], ['1000', 200]].map(([l, x], i) => (
        <T key={i} x={x} y="112" textAnchor="middle" fill={MUT} fontSize="7">{l}</T>
      ))}
      <T x="20" y="14" fill={MUT} fontSize="7">resultado medio por operación</T>
    </Frame>
  ),
  // Expectancy — the equation as blocks on a scale
  expectancy: (
    <Frame label="expectancy formula">
      <rect x="18" y="30" width="88" height="24" rx="3" fill={GOOD} opacity="0.25" stroke={GOOD} />
      <T x="62" y="41" textAnchor="middle" fill={GOOD}>% acierto ×</T>
      <T x="62" y="50" textAnchor="middle" fill={GOOD}>ganancia media</T>
      <T x="120" y="46" textAnchor="middle" fill={MUT} fontSize="12">−</T>
      <rect x="134" y="30" width="88" height="24" rx="3" fill={BAD} opacity="0.25" stroke={BAD} />
      <T x="178" y="41" textAnchor="middle" fill={BAD}>% fallo ×</T>
      <T x="178" y="50" textAnchor="middle" fill={BAD}>pérdida media</T>
      <path d="M120 62 l0 14" stroke={MUT} strokeWidth="1" />
      <rect x="70" y="80" width="100" height="22" rx="3" fill={HOT} opacity="0.2" stroke={HOT} />
      <T x="120" y="94" textAnchor="middle" fill={HOT}>esperanza &gt; 0</T>
    </Frame>
  ),
  // SPIVA — funds that beat the index over 15y
  indexing: (
    <Frame label="SPIVA active vs index">
      <T x="20" y="22" fill={MUT}>fondos activos vs índice · 15 años</T>
      <rect x="20" y="36" width="170" height="16" rx="2" fill={BAD} opacity="0.8" />
      <rect x="190" y="36" width="20" height="16" rx="2" fill={GOOD} opacity="0.9" />
      <T x="26" y="47" fill="#0a0a0a">89,5% pierden vs índice</T>
      <T x="214" y="47" fill={GOOD}>10,5%</T>
      <T x="20" y="76" fill={MUT} fontSize="7">0 de 22 categorías con mayoría ganadora</T>
      <rect x="20" y="84" width="200" height="9" rx="1.5" fill={MUT} opacity="0.2" />
      <rect x="20" y="84" width="0" height="9" fill={GOOD} />
    </Frame>
  ),
  // Factor premia — four documented factors
  factors: (
    <Frame label="factor premia">
      {[['Valor', 58, NEUT], ['Momentum', 84, GOOD], ['Calidad', 66, NEUT], ['Baja vol.', 52, NEUT]].map(([lbl, h, c], i) => (
        <g key={i}>
          <rect x={30 + i * 50} y={96 - h} width="30" height={h} rx="2" fill={c} opacity="0.8" />
          <T x={45 + i * 50} y="108" textAnchor="middle" fill={MUT} fontSize="7">{lbl}</T>
        </g>
      ))}
      <line x1="20" y1="96" x2="226" y2="96" stroke={MUT} strokeWidth="0.75" />
      <T x="20" y="16" fill={MUT} fontSize="7">prima histórica documentada (décadas, muchos países)</T>
    </Frame>
  ),
  // Momentum — winners keep winning vs losers
  momentum: (
    <Frame label="momentum winners vs losers">
      <line x1="86" y1="14" x2="86" y2="104" stroke={MUT} strokeWidth="0.75" strokeDasharray="3 3" />
      <T x="50" y="112" textAnchor="middle" fill={MUT} fontSize="7">últimos 12m</T>
      <T x="160" y="112" textAnchor="middle" fill={MUT} fontSize="7">siguientes meses</T>
      <Line pts="20,80 50,60 86,44" c={GOOD} />
      <Line pts="86,44 130,34 180,28 224,20" c={GOOD} />
      <Line pts="20,50 50,66 86,78" c={BAD} />
      <Line pts="86,78 130,84 180,90 224,96" c={BAD} />
      <T x="196" y="14" fill={GOOD} fontSize="7">ganadores</T>
      <T x="192" y="106" fill={BAD} fontSize="7">perdedores</T>
    </Frame>
  ),
  // Trend following — a century of positive decades
  trend: (
    <Frame label="century of trend following">
      <line x1="18" y1="70" x2="226" y2="70" stroke={MUT} strokeWidth="0.75" />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={22 + i * 14.5} y={70 - (26 + (i * 37) % 22)} width="9" height={26 + (i * 37) % 22} rx="1" fill={GOOD} opacity="0.75" />
      ))}
      <T x="22" y="84" fill={MUT} fontSize="7">1880</T>
      <T x="206" y="84" fill={MUT} fontSize="7">2016</T>
      <T x="22" y="16" fill={GOOD} fontSize="7">rentabilidad positiva en TODAS las décadas</T>
      <T x="22" y="102" fill={MUT} fontSize="7">67 mercados · 4 clases de activo (AQR)</T>
    </Frame>
  ),
  // Position sizing — bet size decides survival (3 equity curves)
  sizing: (
    <Frame label="position sizing and survival">
      <Line pts="18,60 50,34 78,74 106,50 134,96 160,110" c={BAD} w={1.8} />
      <Line pts="18,70 60,62 100,52 140,46 180,34 224,24" c={GOOD} />
      <Line pts="18,76 60,74 100,72 140,70 180,68 224,66" c={MUT} w={1.4} />
      <T x="128" y="108" fill={BAD} fontSize="7">apuesta excesiva → ruina</T>
      <T x="180" y="18" fill={GOOD} fontSize="7">riesgo fijo ~1%</T>
      <T x="188" y="60" fill={MUT} fontSize="7">demasiado tímido</T>
    </Frame>
  ),
  // Institutional desks — hard risk limits
  desks: (
    <Frame label="institutional risk limits">
      <Line pts="18,40 48,32 78,48 108,38 138,56 168,50 198,64 224,60" c={NEUT} w={1.6} />
      <line x1="18" y1="84" x2="224" y2="84" stroke={BAD} strokeWidth="1.5" strokeDasharray="5 3" />
      <T x="22" y="96" fill={BAD} fontSize="7">límite diario de pérdida — se corta la operativa</T>
      <T x="22" y="18" fill={MUT} fontSize="7">PnL de la mesa</T>
      <rect x="150" y="24" width="74" height="20" rx="3" fill={HOT} opacity="0.15" stroke={HOT} strokeWidth="0.75" />
      <T x="187" y="33" textAnchor="middle" fill={HOT} fontSize="6.5">límites por posición</T>
      <T x="187" y="41" textAnchor="middle" fill={HOT} fontSize="6.5">y por estrategia</T>
    </Frame>
  ),
  // Disposition effect — selling winners too early, riding losers too long
  behavior: (
    <Frame label="disposition effect">
      <line x1="20" y1="60" x2="226" y2="60" stroke={MUT} strokeWidth="0.75" strokeDasharray="3 3" />
      <Line pts="20,60 50,48 76,40" c={GOOD} />
      <circle cx="76" cy="40" r="3" fill={HOT} />
      <T x="84" y="34" fill={HOT} fontSize="7">vende pronto</T>
      <Line pts="76,40 110,30 150,22" c={MUT} w={1.4} dash="3 3" />
      <Line pts="120,60 150,74 186,90" c={BAD} />
      <circle cx="186" cy="90" r="3" fill={BAD} />
      <T x="140" y="106" fill={BAD} fontSize="7">aguanta la pérdida</T>
      <T x="156" y="16" fill={MUT} fontSize="7">lo que se dejó de ganar</T>
    </Frame>
  ),
};

export function hasEvidenceVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function EvidenceVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
