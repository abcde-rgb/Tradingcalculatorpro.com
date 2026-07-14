import React from 'react';

// Language-neutral schematic SVGs for the "Ehlers DSP indicators" module, keyed
// by item id. green = clean/filtered signal, red = failure/trend, blue = cycle,
// amber = highlighted turn, muted = raw/noisy price.

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

const VISUALS = {
  // What — noisy raw price vs a smooth filtered signal
  what: (
    <Frame label="price as a signal with noise">
      <polyline points="14,60 26,44 34,72 46,50 56,80 68,52 80,74 92,44 104,70 116,48 128,76 140,50 152,66 164,46 176,70 188,52 200,64 214,50" fill="none" stroke={MUT} strokeWidth="1" />
      <polyline points="14,62 40,58 66,60 92,54 118,58 144,54 170,56 200,54 214,54" fill="none" stroke={GOOD} strokeWidth="1.8" strokeLinejoin="round" />
      <T x="16" y="16" fill={MUT} fontSize="6.5">precio = señal (ciclo) + ruido</T>
      <T x="150" y="104" fill={GOOD} fontSize="6.5">DSP: filtra el ruido</T>
    </Frame>
  ),
  // Fisher Transform — sharp peaky waveform with clear tops/bottoms
  fisher: (
    <Frame label="fisher transform sharp turns">
      <line x1="14" y1="60" x2="226" y2="60" stroke={MUT} strokeWidth="0.5" />
      <polyline points="16,58 44,54 72,26 100,30 128,90 156,86 184,30 212,34" fill="none" stroke={NEUT} strokeWidth="1.8" strokeLinejoin="round" />
      {[[72,26],[128,90],[184,30]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.6" fill={HOT}/>)}
      <T x="16" y="14" fill={MUT} fontSize="6.5">Fisher: giros nítidos y tempranos</T>
    </Frame>
  ),
  // MAMA/MESA — adaptive average hugs price, laggy SMA behind
  mama: (
    <Frame label="adaptive average vs laggy SMA">
      <polyline points="14,80 40,58 66,72 92,44 118,58 144,34 170,50 200,28 216,40" fill="none" stroke={MUT} strokeWidth="1" />
      <polyline points="14,80 40,60 66,70 92,48 118,58 144,38 170,50 200,32 216,42" fill="none" stroke={GOOD} strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points="14,84 40,78 66,74 92,68 118,64 144,58 170,54 200,48 216,46" fill="none" stroke={BAD} strokeWidth="1.4" strokeDasharray="4 2" />
      <T x="16" y="14" fill={GOOD} fontSize="6.5">MAMA se adapta al ciclo</T>
      <T x="150" y="112" fill={BAD} fontSize="6.5">SMA = retrasada</T>
    </Frame>
  ),
  // Cycle — a clean sine wave (dominant cycle) under price
  cycle: (
    <Frame label="dominant cycle sinewave">
      <polyline points="14,40 40,50 66,40 92,52 118,40 144,52 170,40 200,52 216,42" fill="none" stroke={MUT} strokeWidth="1" />
      <path d="M14,86 Q40,60 66,86 T118,86 T170,86 T222,86" fill="none" stroke={NEUT} strokeWidth="1.8" />
      <T x="16" y="16" fill={MUT} fontSize="6.5">mide el periodo del ciclo dominante</T>
      <T x="150" y="108" fill={NEUT} fontSize="6.5">sinewave = fase del ciclo</T>
    </Frame>
  ),
  // Filters — jagged vs SuperSmoother (low lag)
  filters: (
    <Frame label="supersmoother low lag filter">
      <polyline points="14,54 26,40 36,68 48,46 60,72 72,48 84,66 96,42 108,64 120,46 132,70 144,48 156,60 168,44 180,64 192,50 206,58 220,48" fill="none" stroke={MUT} strokeWidth="0.9" />
      <polyline points="14,56 44,54 74,56 104,52 134,56 164,52 200,53 220,52" fill="none" stroke={GOOD} strokeWidth="1.9" strokeLinejoin="round" />
      <T x="16" y="16" fill={MUT} fontSize="6.5">ruido</T>
      <T x="120" y="108" fill={GOOD} fontSize="6.5">SuperSmoother: suave y sin apenas retraso</T>
    </Frame>
  ),
  // Limits — sine flattens into a trend, cycle tools fail
  limits: (
    <Frame label="cycle tools fail in a trend">
      <path d="M14,64 Q34,44 54,64 T94,64" fill="none" stroke={NEUT} strokeWidth="1.6" />
      <polyline points="94,64 124,54 154,42 184,30 214,20" fill="none" stroke={BAD} strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="94" y1="18" x2="94" y2="100" stroke={MUT} strokeWidth="0.7" strokeDasharray="3 2" />
      <T x="20" y="104" fill={NEUT} fontSize="6.5">ciclo</T>
      <T x="150" y="104" fill={BAD} fontSize="6.5">tendencia → el ciclo falla</T>
      <T x="16" y="14" fill={MUT} fontSize="6.5">avanzado, no mágico</T>
    </Frame>
  ),
};

export function hasEhlersVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function EhlersVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
