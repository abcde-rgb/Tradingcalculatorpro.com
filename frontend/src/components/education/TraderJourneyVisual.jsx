import React from 'react';

// Language-neutral schematic SVGs for "The trader's journey" module, keyed by
// item id. green = progress/edge, red = failure/attrition, blue = neutral/time,
// amber = the key insight, muted = context. Figures drawn here mirror the
// studies cited in the copy (ESMA 74-89%, Taiwan <1% B&O, Brazil 97%,
// prop-firm ~5-14% pass / ~7% payout).

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
  // The 4 stages of competence — a rising staircase, red (unaware) → green (mastery)
  stages: (
    <Frame label="four stages of competence">
      <Line pts="16,92 58,92 58,74 100,74 100,56 142,56 142,38 200,38" c={MUT} w={1.4} />
      {[['1', 37, 92, BAD], ['2', 79, 74, HOT], ['3', 121, 56, NEUT], ['4', 171, 38, GOOD]].map(([n, x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y - 8} r="6" fill={c} opacity="0.85" />
          <T x={x} y={y - 5} textAnchor="middle" fill="#0a0a0a" fontSize="8">{n}</T>
        </g>
      ))}
      <T x="16" y="106" fill={BAD} fontSize="6.5">no sabe que no sabe</T>
      <T x="150" y="30" fill={GOOD} fontSize="6.5">automático</T>
    </Frame>
  ),
  // Dunning-Kruger confidence curve — the valley of despair
  valley: (
    <Frame label="valley of despair">
      <line x1="18" y1="104" x2="226" y2="104" stroke={MUT} strokeWidth="0.75" />
      <Line pts="18,74 40,26 70,30 96,92 130,84 170,66 210,44" c={NEUT} w={2} />
      <circle cx="40" cy="26" r="2.6" fill={HOT} />
      <T x="20" y="20" fill={HOT} fontSize="6.5">"lo tengo"</T>
      <circle cx="96" cy="92" r="2.6" fill={BAD} />
      <T x="82" y="110" fill={BAD} fontSize="6.5">valle: aquí abandona la mayoría</T>
      <T x="176" y="38" fill={GOOD} fontSize="6.5">competencia</T>
      <T x="20" y="112" fill={MUT} fontSize="6.5">confianza</T>
    </Frame>
  ),
  // Realistic timeline — % consistent rising slowly across 0-3 years
  timeline: (
    <Frame label="time to consistency">
      <rect x="128" y="18" width="60" height="86" fill={GOOD} opacity="0.08" />
      <line x1="18" y1="98" x2="226" y2="98" stroke={MUT} strokeWidth="0.75" />
      <Line pts="18,96 60,94 100,88 140,72 190,54 224,48" c={GOOD} w={1.8} />
      {[['0', 18], ['6m', 60], ['1a', 100], ['2a', 158], ['3a', 216]].map(([l, x], i) => (
        <T key={i} x={x} y="110" textAnchor="middle" fill={MUT} fontSize="6.5">{l}</T>
      ))}
      <T x="158" y="14" textAnchor="middle" fill={GOOD} fontSize="6.5">consistencia ~1-3 años</T>
      <T x="20" y="30" fill={MUT} fontSize="6.5">% que es consistente</T>
    </Frame>
  ),
  // Attrition — the room empties: 100% start → few survive net of fees
  attrition: (
    <Frame label="attrition and base rates">
      {[['empiezan', 100, MUT], ['+1 año', 15, HOT], ['pierden CFD', 82, BAD], ['ganan fiable', 3, GOOD]].map(([lbl, v, c], i) => (
        <g key={i}>
          <T x="16" y={26 + i * 24} fill={MUT} fontSize="6.5">{lbl}</T>
          <rect x="16" y={29 + i * 24} width={(v / 100) * 176} height="10" rx="1.5" fill={c} opacity="0.8" />
          <T x={20 + (v / 100) * 176} y={37 + i * 24} fill={c} fontSize="7">{v}%</T>
        </g>
      ))}
    </Frame>
  ),
  // Deliberate practice — a feedback loop vs flat mechanical screen time
  practice: (
    <Frame label="deliberate practice loop">
      <line x1="16" y1="30" x2="150" y2="30" stroke={MUT} strokeWidth="2" strokeDasharray="3 3" />
      <T x="16" y="22" fill={MUT} fontSize="6.5">horas de pantalla (mecánico)</T>
      {[['operar', 60], ['registrar', 108], ['revisar', 60], ['corregir', 12]].map(([lbl, x], i) => {
        const y = i < 2 ? 58 : 88;
        const cx = i % 2 === 0 ? 56 : 150;
        return (
          <g key={i}>
            <rect x={cx - 34} y={y - 9} width="68" height="16" rx="3" fill={GOOD} opacity="0.18" stroke={GOOD} strokeWidth="0.75" />
            <T x={cx} y={y + 1} textAnchor="middle" fill={GOOD} fontSize="7">{lbl}</T>
          </g>
        );
      })}
      <path d="M90 58 h26 v30 h-26" fill="none" stroke={GOOD} strokeWidth="1.2" />
      <path d="M22 88 v-30 h20" fill="none" stroke={GOOD} strokeWidth="1.2" />
      <polygon points="42,55 42,61 48,58" fill={GOOD} />
      <T x="120" y="110" fill={HOT} fontSize="6.5">el diario cierra el bucle</T>
    </Frame>
  ),
  // Two runways — capital and life/emotional buffer before going full-time
  runway: (
    <Frame label="capital and life runway">
      {[['colchón de capital', 150, NEUT, 34], ['colchón de vida (gastos)', 120, HOT, 66]].map(([lbl, w, c, y], i) => (
        <g key={i}>
          <T x="16" y={y - 6} fill={MUT} fontSize="6.5">{lbl}</T>
          <rect x="16" y={y} width="200" height="12" rx="2" fill={MUT} opacity="0.15" />
          <rect x="16" y={y} width={w} height="12" rx="2" fill={c} opacity="0.75" />
          <polygon points={`${16 + w},${y} ${16 + w + 8},${y + 6} ${16 + w},${y + 12}`} fill={c} />
        </g>
      ))}
      <T x="16" y="100" fill={GOOD} fontSize="6.5">despegas solo con los dos</T>
      <T x="16" y="112" fill={MUT} fontSize="6.5">operas pequeño mientras aprendes</T>
    </Frame>
  ),
  // Measure the process, not the money — steady adherence vs noisy PnL
  measure: (
    <Frame label="measure process not money">
      <Line pts="18,60 34,30 50,80 66,44 82,88 100,40 120,70 140,36 164,74 190,42 224,58" c={MUT} w={1.3} />
      <T x="150" y="26" fill={MUT} fontSize="6.5">dinero (ruido)</T>
      <Line pts="18,86 60,80 100,72 150,64 200,56 224,52" c={GOOD} w={2} />
      <T x="20" y="104" fill={GOOD} fontSize="6.5">adherencia al plan · esperanza · R</T>
      <T x="20" y="114" fill={HOT} fontSize="6.5">el dinero es la consecuencia, no el marcador</T>
    </Frame>
  ),
  // The shortcut mirage — long real path vs a shortcut into a trap
  shortcut: (
    <Frame label="the shortcut mirage">
      <Line pts="18,96 44,92 60,64 92,58 108,32 150,26 190,22 220,18" c={GOOD} w={1.8} />
      <T x="150" y="14" fill={GOOD} fontSize="6.5">camino real (años)</T>
      <Line pts="18,96 70,96 120,96 168,96" c={BAD} w={1.8} dash="5 3" />
      <path d="M168 96 l14 -6 M168 96 l14 6" stroke={BAD} strokeWidth="1.8" fill="none" />
      <circle cx="186" cy="96" r="8" fill="none" stroke={BAD} strokeWidth="1.5" />
      <line x1="181" y1="91" x2="191" y2="101" stroke={BAD} strokeWidth="1.5" />
      <T x="30" y="110" fill={BAD} fontSize="6.5">"atajo": prop firms · señales · cursos</T>
      <T x="120" y="86" fill={BAD} fontSize="6.5">pasan ~5-14% · cobran ~7%</T>
    </Frame>
  ),
};

export function hasTraderJourneyVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function TraderJourneyVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
