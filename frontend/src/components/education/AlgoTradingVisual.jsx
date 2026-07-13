import React from 'react';

// Language-neutral schematic SVGs for the "Algorithmic trading" module, keyed by
// item id. green = good, red = bad/loss, blue = neutral/flow, amber = key, muted = context.

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
  // Rules -> machine -> execution
  what: (
    <Frame label="rules feed a machine that executes">
      <rect x="20" y="44" width="52" height="30" rx="4" fill={NEUT} opacity="0.5" />
      <T x="46" y="56" textAnchor="middle" fill="#0a0a0a" fontSize="7">reglas</T>
      <T x="46" y="66" textAnchor="middle" fill="#0a0a0a" fontSize="7">if/then</T>
      <rect x="94" y="44" width="52" height="30" rx="4" fill={HOT} opacity="0.5" />
      <T x="120" y="60" textAnchor="middle" fill="#0a0a0a" fontSize="7">algoritmo</T>
      <rect x="168" y="44" width="52" height="30" rx="4" fill={UP} opacity="0.5" />
      <T x="194" y="60" textAnchor="middle" fill="#0a0a0a" fontSize="7">órdenes</T>
      <line x1="72" y1="59" x2="92" y2="59" stroke={MUT} strokeWidth="1.6" /><polygon points="92,59 86,56 86,62" fill={MUT} />
      <line x1="146" y1="59" x2="166" y2="59" stroke={MUT} strokeWidth="1.6" /><polygon points="166,59 160,56 160,62" fill={MUT} />
    </Frame>
  ),
  // Backtest: in-sample fit vs out-of-sample divergence
  backtest: (
    <Frame label="in-sample vs out-of-sample">
      <Axis />
      <line x1="140" y1="16" x2="140" y2="90" stroke={MUT} strokeDasharray="3 2" />
      <T x="140" y="102" textAnchor="middle" fill={MUT} fontSize="7">out-of-sample</T>
      <Line pts="22,80 60,58 100,44 140,32" c={UP} />
      <Line pts="140,32 170,40 200,60 224,78" c={DOWN} />
      <T x="40" y="52" fill={UP} fontSize="7">backtest</T>
      <T x="176" y="56" fill={DOWN} fontSize="7">en vivo</T>
    </Frame>
  ),
  // Execution: bot <-> broker API
  exec: (
    <Frame label="bot talks to broker via API">
      <rect x="24" y="44" width="60" height="30" rx="4" fill={NEUT} opacity="0.5" />
      <T x="54" y="62" textAnchor="middle" fill="#0a0a0a" fontSize="7">bot</T>
      <rect x="156" y="44" width="60" height="30" rx="4" fill={HOT} opacity="0.5" />
      <T x="186" y="62" textAnchor="middle" fill="#0a0a0a" fontSize="7">broker</T>
      <line x1="86" y1="53" x2="154" y2="53" stroke={UP} strokeWidth="1.6" /><polygon points="154,53 148,50 148,56" fill={UP} />
      <line x1="154" y1="65" x2="86" y2="65" stroke={NEUT} strokeWidth="1.6" /><polygon points="86,65 92,62 92,68" fill={NEUT} />
      <T x="120" y="48" textAnchor="middle" fill={UP} fontSize="7">órdenes</T>
      <T x="120" y="78" textAnchor="middle" fill={NEUT} fontSize="7">precios (API)</T>
    </Frame>
  ),
  // Pitfall: overfit curve hugging every noise point
  pitfall: (
    <Frame label="overfitting hugs the noise">
      <Axis />
      {[[40,68],[70,52],[100,72],[130,48],[160,66],[190,54],[220,64]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2.4" fill={MUT} />
      ))}
      <path d="M40 68 C 55 40, 62 80, 70 52 S 92 92, 100 72 S 122 34, 130 48 S 152 84, 160 66 S 200 40, 220 64"
            fill="none" stroke={DOWN} strokeWidth="1.6" />
      <Line pts="40,66 220,58" c={UP} w={1.4} dash="3 2" />
      <T x="36" y="30" fill={DOWN} fontSize="7">sobreajuste</T>
      <T x="150" y="86" fill={UP} fontSize="7">señal real</T>
    </Frame>
  ),
  // Risk: runaway loss until kill switch
  risk: (
    <Frame label="a bug drains the account fast">
      <Axis />
      <Line pts="22,40 70,44 110,52 150,74 180,86" c={DOWN} />
      <line x1="180" y1="20" x2="180" y2="90" stroke={HOT} strokeDasharray="3 2" />
      <circle cx="180" cy="86" r="3.4" fill={HOT} />
      <T x="180" y="102" textAnchor="middle" fill={HOT} fontSize="7">kill switch</T>
      <T x="34" y="32" fill={DOWN} fontSize="7">bug → caída veloz</T>
    </Frame>
  ),
};

export function hasAlgoTradingVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function AlgoTradingVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
