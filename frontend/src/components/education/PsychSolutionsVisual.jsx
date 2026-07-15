import React from 'react';

// Language-neutral schematic SVGs for the "psychology: problem -> solution"
// module. green = the fix/good, red = the problem/loss, amber = trigger/barrier,
// blue = neutral, muted = context. Each item pairs a problem with its fix.

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
const Bar = ({ x, y0, y1, c, w = 10 }) => <rect x={x - w / 2} y={Math.min(y0, y1)} width={w} height={Math.max(2, Math.abs(y1 - y0))} rx="1" fill={c} />;
const Arrow = ({ x1, y1, x2, y2, c }) => (
  <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.5" /><polygon points={`${x2},${y2} ${x2 - 6},${y2 - 3} ${x2 - 6},${y2 + 3}`} fill={c} /></g>
);

const VISUALS = {
  // If-then plan: trigger box -> action box
  ifthen: (
    <Frame label="if-then implementation intention">
      <rect x="16" y="42" width="86" height="34" rx="4" fill={HOT} opacity="0.14" stroke={HOT} strokeWidth="1" />
      <T x="26" y="56" fill={HOT} fontSize="7">SI [disparador]</T>
      <T x="26" y="68" fill={MUT} fontSize="6">p.ej. 2 pérdidas</T>
      <Arrow x1={104} y1={59} x2={134} y2={59} c={GOOD} />
      <rect x="138" y="42" width="88" height="34" rx="4" fill={GOOD} opacity="0.14" stroke={GOOD} strokeWidth="1" />
      <T x="148" y="56" fill={GOOD} fontSize="7">ENTONCES [acción]</T>
      <T x="148" y="68" fill={MUT} fontSize="6">cierro 30 min</T>
      <T x="16" y="16" fill={MUT} fontSize="6.2">automatiza la reacción, no la fuerza de voluntad</T>
    </Frame>
  ),
  // Revenge trading: a loss then an oversized impulsive trade, blocked
  revenge: (
    <Frame label="revenge trade blocked by a stop rule">
      <Bar x={40} y0={40} y1={80} c={BAD} w={14} />
      <T x="22" y="94" fill={BAD} fontSize="6">pérdida</T>
      <Bar x={92} y0={20} y1={92} c={BAD} w={22} />
      <T x="72" y="14" fill={BAD} fontSize="6">trade enorme por rabia</T>
      <line x1="118" y1="16" x2="118" y2="96" stroke={HOT} strokeWidth="2" />
      <T x="124" y="40" fill={HOT} fontSize="7">STOP</T>
      <T x="124" y="52" fill={HOT} fontSize="6">del día</T>
      <T x="124" y="70" fill={GOOD} fontSize="6">cortacircuitos:</T>
      <T x="124" y="80" fill={GOOD} fontSize="6">pausa obligatoria</T>
    </Frame>
  ),
  // Moving the stop: dragging it (bad) vs locked (good)
  movestop: (
    <Frame label="do not move the stop">
      <polyline points="16,40 48,54 80,72 100,84" fill="none" stroke={MUT} strokeWidth="1.4" />
      <line x1="16" y1="70" x2="120" y2="70" stroke={BAD} strokeWidth="1.2" strokeDasharray="4 2" />
      <line x1="90" y1="70" x2="120" y2="90" stroke={BAD} strokeWidth="1" strokeDasharray="2 2" />
      <T x="16" y="66" fill={BAD} fontSize="6">✗ arrastrar el stop</T>
      <line x1="140" y1="52" x2="224" y2="52" stroke={GOOD} strokeWidth="1.6" />
      <rect x="150" y="44" width="10" height="9" rx="1" fill={GOOD} />
      <T x="164" y="51" fill={GOOD} fontSize="6.5">stop mecánico (bloqueado)</T>
      <T x="140" y="86" fill={MUT} fontSize="6">acepta el riesgo ANTES de entrar</T>
    </Frame>
  ),
  // FOMO: chasing a rally, entering at the top
  fomo: (
    <Frame label="chasing the price is late">
      <polyline points="16,96 44,90 72,80 100,58 128,36 156,22" fill="none" stroke={GOOD} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="156" cy="22" r="4" fill={BAD} />
      <T x="132" y="16" fill={BAD} fontSize="6">entras aquí (tarde)</T>
      <T x="150" y="44" fill={MUT} fontSize="6">↓</T>
      <polyline points="156,22 180,44 204,40 224,58" fill="none" stroke={BAD} strokeWidth="1.4" />
      <T x="16" y="112" fill={GOOD} fontSize="6.2">espera TU setup, no el movimiento · habrá otro tren</T>
    </Frame>
  ),
  // Fear to pull the trigger: shrink size until calm
  trigger: (
    <Frame label="shrink size to calm the fear">
      <Bar x={44} y0={22} y1={92} c={BAD} w={30} />
      <T x="22" y="104" fill={BAD} fontSize="6">tamaño grande = miedo</T>
      <Arrow x1={82} y1={58} x2={116} y2={58} c={NEUT} />
      <Bar x={150} y0={62} y1={92} c={GOOD} w={14} />
      <T x="132" y="104" fill={GOOD} fontSize="6">tamaño pequeño = calma</T>
      <T x="176" y="70" fill={MUT} fontSize="6">+ ensayo</T>
      <T x="176" y="80" fill={MUT} fontSize="6">+ órdenes</T>
      <T x="16" y="14" fill={MUT} fontSize="6">baja el riesgo hasta que dé igual</T>
    </Frame>
  ),
  // Overtrading: many messy trades vs a few clean ones
  overtrading: (
    <Frame label="quota and checklist beat overtrading">
      {[24, 36, 48, 60, 72, 84, 96, 108].map((x, i) => <Bar key={i} x={x} y0={44} y1={44 + (i % 2 ? 22 : 34)} c={BAD} w={7} />)}
      <T x="20" y="16" fill={BAD} fontSize="6">✗ operar por operar</T>
      <line x1="120" y1="16" x2="120" y2="100" stroke={MUT} strokeWidth="0.6" strokeDasharray="3 2" />
      {[150, 182].map((x, i) => <Bar key={i} x={x} y0={40} y1={78} c={GOOD} w={12} />)}
      <T x="132" y="16" fill={GOOD} fontSize="6">✓ cupo + checklist</T>
      <T x="132" y="94" fill={MUT} fontSize="6">sin setup, no hay trade</T>
    </Frame>
  ),
  // Disposition effect: cut winner small, let loss run big
  disposition: (
    <Frame label="disposition effect asymmetry">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      <Bar x={64} y0={48} y1={60} c={GOOD} w={26} />
      <T x="34" y="42" fill={GOOD} fontSize="6">ganancia cortada pronto</T>
      <Bar x={168} y0={60} y1={100} c={BAD} w={26} />
      <T x="138" y="112" fill={BAD} fontSize="6">pérdida dejada correr</T>
      <T x="16" y="16" fill={MUT} fontSize="6.2">fija reglas de salida ANTES · separa decisión y resultado</T>
    </Frame>
  ),
  // Tilt: emotion meter into red, pause
  tilt: (
    <Frame label="tilt emotional check and pause">
      <path d="M40,90 A54,54 0 0 1 148,90" fill="none" stroke={MUT} strokeWidth="6" />
      <path d="M40,90 A54,54 0 0 1 94,36" fill="none" stroke={GOOD} strokeWidth="6" />
      <path d="M120,44 A54,54 0 0 1 148,90" fill="none" stroke={BAD} strokeWidth="6" />
      <line x1="94" y1="90" x2="132" y2="52" stroke={HOT} strokeWidth="2" />
      <circle cx="94" cy="90" r="3" fill={HOT} />
      <T x="150" y="60" fill={BAD} fontSize="6">euforia/rabia</T>
      <rect x="172" y="74" width="6" height="16" fill={NEUT} /><rect x="182" y="74" width="6" height="16" fill={NEUT} />
      <T x="168" y="102" fill={NEUT} fontSize="6">pausa</T>
      <T x="16" y="16" fill={MUT} fontSize="6">chequea el estado → pausa → baja tamaño</T>
    </Frame>
  ),
  // Probabilistic mindset: a series of R outcomes, net positive
  probabilistic: (
    <Frame label="think in series not single trades">
      <line x1="16" y1="60" x2="224" y2="60" stroke={MUT} strokeWidth="0.6" />
      {[[30, -1], [50, 2], [70, -1], [90, -1], [110, 3], [130, -1], [150, 2], [170, -1], [190, 2], [210, -1]].map(([x, r], i) => (
        <Bar key={i} x={x} y0={60} y1={60 - r * 11} c={r > 0 ? GOOD : BAD} w={12} />
      ))}
      <T x="16" y="16" fill={MUT} fontSize="6.2">una operación = ruido</T>
      <T x="120" y="112" fill={GOOD} fontSize="6.2">la serie (la ventaja) = señal · "cualquier cosa puede pasar"</T>
    </Frame>
  ),
};

export function hasPsychSolutionsVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function PsychSolutionsVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
