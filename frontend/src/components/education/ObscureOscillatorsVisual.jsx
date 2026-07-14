import React from 'react';

// Language-neutral schematic SVGs for the "obscure oscillators" module. green =
// buy/up, red = sell/down/overbought, blue = neutral line, amber = signal/level,
// muted = context. Each item shows the oscillator's characteristic shape.

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
  what: (
    <Frame label="a family of momentum oscillators">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      <path d="M16,60 Q52,30 88,60 T160,60 T232,60" fill="none" stroke={NEUT} strokeWidth="1.4" />
      <path d="M16,72 Q40,50 70,72 T130,72 T190,72 T240,72" fill="none" stroke={HOT} strokeWidth="1.1" opacity="0.8" />
      <T x="16" y="16" fill={MUT} fontSize="6.2">osciladores de momentum poco conocidos</T>
    </Frame>
  ),
  coppock: (
    <Frame label="coppock curve long term bottom">
      <line x1="16" y1="52" x2="224" y2="52" stroke={MUT} strokeWidth="0.6" />
      <path d="M16,44 C50,40 70,86 108,90 C140,92 170,60 224,40" fill="none" stroke={GOOD} strokeWidth="1.8" />
      <circle cx="120" cy="86" r="3" fill={GOOD} />
      <T x="90" y="104" fill={GOOD} fontSize="6">gira al alza bajo cero = suelo de largo plazo</T>
      <T x="16" y="14" fill={MUT} fontSize="6">Coppock (mensual)</T>
    </Frame>
  ),
  schaff: (
    <Frame label="schaff trend cycle fast oscillator">
      <line x1="16" y1="30" x2="224" y2="30" stroke={BAD} strokeWidth="0.5" strokeDasharray="3 2" />
      <line x1="16" y1="90" x2="224" y2="90" stroke={GOOD} strokeWidth="0.5" strokeDasharray="3 2" />
      <path d="M16,86 Q40,26 64,30 T104,88 Q128,30 150,32 T196,88 Q214,40 224,34" fill="none" stroke={NEUT} strokeWidth="1.6" />
      <T x="180" y="26" fill={BAD} fontSize="6">75</T>
      <T x="180" y="100" fill={GOOD} fontSize="6">25</T>
      <T x="16" y="14" fill={MUT} fontSize="6">Schaff: ciclo rápido y con menos retraso</T>
    </Frame>
  ),
  connors: (
    <Frame label="connors RSI-2 mean reversion spikes">
      <line x1="16" y1="26" x2="224" y2="26" stroke={BAD} strokeWidth="0.5" strokeDasharray="3 2" />
      <line x1="16" y1="94" x2="224" y2="94" stroke={GOOD} strokeWidth="0.5" strokeDasharray="3 2" />
      <polyline points="16,60 32,24 48,88 64,30 80,92 96,26 112,90 128,40 144,24 160,90 176,28 192,86 208,50 224,60" fill="none" stroke={HOT} strokeWidth="1.4" />
      <T x="180" y="22" fill={BAD} fontSize="6">95</T>
      <T x="180" y="104" fill={GOOD} fontSize="6">5 (sobreventa)</T>
      <T x="16" y="14" fill={MUT} fontSize="6">RSI-2: muy nervioso, reversión</T>
    </Frame>
  ),
  tsi: (
    <Frame label="true strength index smooth momentum">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      <path d="M16,74 C60,80 90,40 130,44 C170,48 200,72 224,66" fill="none" stroke={NEUT} strokeWidth="1.7" />
      <path d="M16,72 C60,74 92,52 132,52 C172,52 200,66 224,64" fill="none" stroke={HOT} strokeWidth="1.1" strokeDasharray="3 2" />
      <circle cx="96" cy="49" r="2.6" fill={GOOD} />
      <T x="16" y="16" fill={MUT} fontSize="6">TSI: momentum doblemente suavizado + señal</T>
    </Frame>
  ),
  limits: (
    <Frame label="oscillators can disagree">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      <path d="M16,50 Q60,30 104,50 T224,50" fill="none" stroke={GOOD} strokeWidth="1.4" />
      <path d="M16,66 Q60,86 104,66 T224,66" fill="none" stroke={BAD} strokeWidth="1.4" />
      <T x="150" y="40" fill={GOOD} fontSize="6">uno dice compra…</T>
      <T x="16" y="108" fill={BAD} fontSize="6">…otro dice venta: sin confluencia, ruido</T>
    </Frame>
  ),
};

export function hasObscureOscillatorsVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function ObscureOscillatorsVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
