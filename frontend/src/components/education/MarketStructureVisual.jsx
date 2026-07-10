import React from 'react';

// Language-neutral schematic SVGs for the "Market structure" module, keyed by
// item id. green = bullish/up structure, red = bearish/down, blue = neutral/
// range, amber = the pivotal event (BOS/CHOCH/turn), muted = context.

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

const VISUALS = {
  // Uptrend — higher highs + higher lows
  uptrend: (
    <Frame label="uptrend structure">
      <Line pts="16,102 52,58 82,76 122,44 152,62 208,26" c={UP} />
      {[[52, 58], [122, 44], [208, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={UP} />)}
      <T x="122" y="34" textAnchor="middle" fill={UP}>máx. ↑</T>
      <T x="82" y="90" textAnchor="middle" fill={MUT}>mín. ↑</T>
      <T x="16" y="16" fill={UP} fontSize="7">tendencia alcista</T>
    </Frame>
  ),
  // Downtrend — lower highs + lower lows
  downtrend: (
    <Frame label="downtrend structure">
      <Line pts="16,26 52,62 82,44 122,76 152,58 208,102" c={DOWN} />
      {[[52, 62], [122, 76], [208, 102]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={DOWN} />)}
      <T x="122" y="90" textAnchor="middle" fill={DOWN}>mín. ↓</T>
      <T x="82" y="36" textAnchor="middle" fill={MUT}>máx. ↓</T>
      <T x="16" y="16" fill={DOWN} fontSize="7">tendencia bajista</T>
    </Frame>
  ),
  // Range — sideways between support/resistance
  range: (
    <Frame label="range structure">
      <Line pts="20,44 220,44" c={MUT} w={1} dash="4 3" />
      <Line pts="20,84 220,84" c={MUT} w={1} dash="4 3" />
      <Line pts="20,84 48,46 82,82 116,46 150,82 184,46 218,80" c={NEUT} />
      <T x="24" y="38" fill={MUT}>resistencia</T>
      <T x="24" y="98" fill={MUT}>soporte</T>
      <T x="150" y="34" fill={NEUT}>rango / lateral</T>
    </Frame>
  ),
  // BOS — break of structure (continuation)
  bos: (
    <Frame label="break of structure">
      <Line pts="16,92 46,58 78,74 120,50 152,66 200,30" c={UP} />
      <Line pts="120,50 214,50" c={HOT} w={1} dash="4 3" />
      <T x="126" y="46" fill={MUT} fontSize="7">máx. previo</T>
      <path d="M182 46 l6 -10 l6 10 z" fill={HOT} />
      <T x="188" y="26" textAnchor="middle" fill={HOT}>BOS</T>
      <T x="16" y="106" fill={UP} fontSize="7">rompe y continúa</T>
    </Frame>
  ),
  // CHOCH — change of character (first reversal sign)
  choch: (
    <Frame label="change of character">
      <Line pts="16,88 50,54 82,70 120,40 155,68 198,94" c={UP} />
      <Line pts="196,94 210,94" c={DOWN} w={2} />
      <Line pts="82,70 214,70" c={HOT} w={1} dash="4 3" />
      <T x="86" y="66" fill={MUT} fontSize="7">último mín.</T>
      <path d="M176 74 l-6 -9 l-6 9 z" fill={DOWN} transform="rotate(180 170 70)" />
      <path d="M170 66 l6 10 l-12 0 z" fill={DOWN} />
      <T x="178" y="90" textAnchor="middle" fill={HOT}>CHOCH</T>
      <T x="16" y="16" fill={HOT} fontSize="7">primer giro</T>
    </Frame>
  ),
  // Accumulation — low base then breakout up
  accumulation: (
    <Frame label="accumulation">
      <rect x="24" y="62" width="120" height="34" fill={MUT} opacity="0.12" stroke={MUT} strokeWidth="0.75" rx="2" />
      <Line pts="30,80 52,68 74,84 96,70 118,82 140,72" c={MUT} w={1.4} />
      <Line pts="140,72 172,52 208,30" c={UP} />
      <path d="M198 40 l4 -10 l6 8 z" fill={UP} />
      <T x="84" y="108" textAnchor="middle" fill={MUT}>acumulación</T>
      <T x="196" y="22" fill={UP} fontSize="7">salida ↑</T>
    </Frame>
  ),
  // Distribution — high range then breakdown
  distribution: (
    <Frame label="distribution">
      <rect x="24" y="24" width="120" height="34" fill={MUT} opacity="0.12" stroke={MUT} strokeWidth="0.75" rx="2" />
      <Line pts="30,40 52,30 74,46 96,32 118,44 140,34" c={MUT} w={1.4} />
      <Line pts="140,34 172,64 208,90" c={DOWN} />
      <path d="M198 80 l4 10 l6 -8 z" fill={DOWN} />
      <T x="84" y="18" textAnchor="middle" fill={MUT}>distribución</T>
      <T x="196" y="104" fill={DOWN} fontSize="7">caída ↓</T>
    </Frame>
  ),
  // Pullback — retracement that respects structure
  pullback: (
    <Frame label="pullback in trend">
      <Line pts="16,96 60,50 96,72 140,38 176,58 212,26" c={UP} />
      <Line pts="60,50 96,72" c={HOT} w={2.4} />
      <circle cx="96" cy="72" r="2.5" fill={HOT} />
      <Line pts="30,84 214,84" c={MUT} w={0.75} dash="3 3" />
      <T x="104" y="82" fill={HOT} fontSize="7">pullback</T>
      <T x="16" y="16" fill={UP} fontSize="7">respeta la estructura</T>
    </Frame>
  ),
  // Break & retest — break a level, return to test, continue
  retest: (
    <Frame label="break and retest">
      <Line pts="16,72 218,72" c={HOT} w={1} dash="4 3" />
      <Line pts="16,92 70,80 104,58 138,40" c={UP} />
      <Line pts="138,40 170,66 190,72" c={UP} w={1.6} />
      <Line pts="190,72 212,44" c={UP} />
      <circle cx="190" cy="72" r="2.5" fill={HOT} />
      <T x="88" y="52" fill={UP} fontSize="7">ruptura</T>
      <T x="196" y="86" fill={HOT} fontSize="7">retest</T>
      <T x="20" y="66" fill={MUT} fontSize="7">nivel</T>
    </Frame>
  ),
  // Confirmed trend change — HH/HL flips to LH/LL
  trendchange: (
    <Frame label="trend change">
      <Line pts="16,100 50,60 80,76 116,42" c={UP} />
      <Line pts="116,42 150,66 180,54 212,90" c={DOWN} />
      <circle cx="116" cy="42" r="3" fill={HOT} />
      <T x="116" y="32" textAnchor="middle" fill={HOT} fontSize="7">giro</T>
      <T x="18" y="112" fill={UP} fontSize="7">HH · HL</T>
      <T x="176" y="112" fill={DOWN} fontSize="7">LH · LL</T>
    </Frame>
  ),
};

export function hasMarketStructureVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function MarketStructureVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
