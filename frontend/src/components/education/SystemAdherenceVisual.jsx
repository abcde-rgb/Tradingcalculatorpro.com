import React from 'react';

// Language-neutral schematic SVGs for the "system adherence" module. green = the
// fix/compliance, red = the problem/break, amber = rule/barrier, blue = neutral,
// muted = context. Theme: the engineering of following your system every time.

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
const Check = ({ x, y, c = GOOD }) => <polyline points={`${x},${y} ${x + 3},${y + 4} ${x + 9},${y - 4}`} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;

const VISUALS = {
  // Written rules: a document with checkboxes vs a fuzzy cloud
  written: (
    <Frame label="write the rules down">
      <path d="M30,40 q-8,-2 -14,4 q10,-2 14,4 q4,-6 14,-4 q-8,-6 -14,-4z" fill={MUT} opacity="0.5" />
      <T x="22" y="30" fill={MUT} fontSize="6">en la cabeza ✗</T>
      <rect x="120" y="22" width="98" height="80" rx="4" fill="none" stroke={GOOD} strokeWidth="1.2" />
      {[34, 50, 66, 82].map((y, i) => <g key={i}><rect x="130" y={y - 6} width="8" height="8" rx="1" fill="none" stroke={GOOD} strokeWidth="1" /><Check x={131} y={y - 2} /><line x1="144" y1={y - 2} x2="208" y2={y - 2} stroke={MUT} strokeWidth="1.2" /></g>)}
      <T x="120" y="16" fill={GOOD} fontSize="6.2">reglas escritas: entrada · salida · tamaño</T>
    </Frame>
  ),
  // Automate: bracket order (entry + auto SL/TP)
  automate: (
    <Frame label="automate with bracket orders">
      <line x1="16" y1="60" x2="224" y2="60" stroke={NEUT} strokeWidth="1.4" />
      <circle cx="90" cy="60" r="3.5" fill={NEUT} />
      <T x="66" y="54" fill={NEUT} fontSize="6">entrada</T>
      <line x1="40" y1="34" x2="224" y2="34" stroke={GOOD} strokeWidth="1.2" strokeDasharray="4 2" />
      <T x="44" y="30" fill={GOOD} fontSize="6">TP automático</T>
      <line x1="40" y1="88" x2="224" y2="88" stroke={BAD} strokeWidth="1.2" strokeDasharray="4 2" />
      <T x="44" y="100" fill={BAD} fontSize="6">SL automático</T>
      <T x="120" y="72" fill={MUT} fontSize="6">OCO/bracket: quita tu mano</T>
    </Frame>
  ),
  // Pre-commit: daily loss limit lockout
  precommit: (
    <Frame label="daily loss limit lockout">
      <rect x="96" y="52" width="48" height="40" rx="4" fill="none" stroke={HOT} strokeWidth="1.6" />
      <path d="M104,52 v-8 a16,16 0 0 1 32,0 v8" fill="none" stroke={HOT} strokeWidth="1.6" />
      <circle cx="120" cy="70" r="4" fill={HOT} />
      <line x1="120" y1="70" x2="120" y2="80" stroke={HOT} strokeWidth="2" />
      <T x="150" y="66" fill={BAD} fontSize="6">límite diario</T>
      <T x="150" y="78" fill={BAD} fontSize="6">= bloqueo</T>
      <T x="16" y="16" fill={MUT} fontSize="6.2">cambia reglas en FRÍO, nunca en caliente</T>
    </Frame>
  ),
  // Score the process: a grade card on rule adherence
  scoreprocess: (
    <Frame label="grade the process not the pnl">
      <rect x="30" y="24" width="180" height="70" rx="4" fill="none" stroke={MUT} strokeWidth="1" />
      {[['siguió reglas', GOOD], ['gestionó riesgo', GOOD], ['esperó el setup', GOOD]].map(([txt, c], i) => (
        <g key={i}><Check x={42} y={42 + i * 16} c={c} /><T x={56} y={45 + i * 16} fill={MUT} fontSize="6.5">{txt}</T></g>
      ))}
      <T x="150" y="46" fill={GOOD} fontSize="14" fontFamily="sans-serif">9/10</T>
      <T x="150" y="62" fill={MUT} fontSize="6">resultado:</T>
      <T x="150" y="72" fill={BAD} fontSize="6">pérdida (da igual)</T>
      <T x="30" y="106" fill={MUT} fontSize="6">buen trade = siguió el plan, aunque pierda</T>
    </Frame>
  ),
  // Accountability: an eye watching a journal
  accountability: (
    <Frame label="accountability changes behaviour">
      <path d="M60,50 q30,-26 60,0 q-30,26 -60,0z" fill="none" stroke={NEUT} strokeWidth="1.4" />
      <circle cx="90" cy="50" r="8" fill="none" stroke={NEUT} strokeWidth="1.2" />
      <circle cx="90" cy="50" r="3.5" fill={NEUT} />
      <T x="60" y="76" fill={NEUT} fontSize="6">alguien mira…</T>
      <rect x="150" y="34" width="60" height="52" rx="3" fill="none" stroke={GOOD} strokeWidth="1.2" />
      {[46, 58, 70].map((y, i) => <line key={i} x1="158" y1={y} x2="202" y2={y} stroke={MUT} strokeWidth="1.2" />)}
      <T x="150" y="100" fill={GOOD} fontSize="6">diario · mentor · revisión semanal</T>
    </Frame>
  ),
  // Environment: clean desk, phone crossed out
  environment: (
    <Frame label="design the environment">
      <rect x="30" y="40" width="60" height="40" rx="3" fill="none" stroke={GOOD} strokeWidth="1.3" />
      <polyline points="38,70 50,58 60,64 74,48 82,54" fill="none" stroke={GOOD} strokeWidth="1.3" />
      <T x="30" y="94" fill={GOOD} fontSize="6">1 pantalla + plan a la vista</T>
      <rect x="150" y="40" width="26" height="44" rx="3" fill="none" stroke={BAD} strokeWidth="1.3" />
      <line x1="150" y1="40" x2="176" y2="84" stroke={BAD} strokeWidth="1.6" />
      <T x="184" y="60" fill={BAD} fontSize="6">móvil /</T>
      <T x="184" y="70" fill={BAD} fontSize="6">noticias ✗</T>
      <T x="30" y="18" fill={MUT} fontSize="6">quita fricción a lo bueno, añádela a lo malo</T>
    </Frame>
  ),
  // Routine / don't break the chain: streak calendar
  routine: (
    <Frame label="do not break the chain">
      {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 10 }).map((_, c) => {
        const broken = (r === 2 && c === 6);
        const x = 24 + c * 20, y = 30 + r * 15;
        return <g key={`${r}-${c}`}><rect x={x} y={y} width="12" height="11" rx="1.5" fill="none" stroke={MUT} strokeWidth="0.6" />{broken ? <line x1={x + 2} y1={y + 2} x2={x + 10} y2={y + 9} stroke={BAD} strokeWidth="1.4" /> : <Check x={x + 2} y={y + 6} />}</g>;
      }))}
      <T x="24" y="18" fill={GOOD} fontSize="6.2">marca cada día que cumples · no rompas la cadena</T>
    </Frame>
  ),
  // Review loop: magnifier over journal, one fix at a time
  review: (
    <Frame label="weekly review loop">
      <rect x="30" y="30" width="120" height="66" rx="3" fill="none" stroke={MUT} strokeWidth="1" />
      {[[44, BAD], [58, MUT], [72, MUT], [86, MUT]].map(([y, c], i) => <g key={i}><line x1="40" y1={y} x2="120" y2={y} stroke={c} strokeWidth={c === BAD ? 1.6 : 1} /></g>)}
      <circle cx="150" cy="52" r="16" fill="none" stroke={NEUT} strokeWidth="1.6" />
      <line x1="162" y1="64" x2="176" y2="78" stroke={NEUT} strokeWidth="2" />
      <T x="150" y="100" fill={GOOD} fontSize="6">arregla UN error por semana (una regla a la vez)</T>
    </Frame>
  ),
  // Size to comply: big size breaks rules, small size = calm
  sizetocomply: (
    <Frame label="size small enough to comply">
      <rect x="44" y="20" width="34" height="74" rx="2" fill={BAD} />
      <T x="24" y="106" fill={BAD} fontSize="6">grande → rompes reglas</T>
      <polyline points="98,58 130,58" fill="none" stroke={NEUT} strokeWidth="1.4" />
      <polygon points="130,58 124,55 124,61" fill={NEUT} />
      <rect x="158" y="66" width="20" height="28" rx="2" fill={GOOD} />
      <T x="140" y="106" fill={GOOD} fontSize="6">pequeño → cumples con calma</T>
      <T x="24" y="14" fill={MUT} fontSize="6">si el riesgo te hace saltarte el plan, es demasiado</T>
    </Frame>
  ),
};

export function hasSystemAdherenceVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function SystemAdherenceVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
