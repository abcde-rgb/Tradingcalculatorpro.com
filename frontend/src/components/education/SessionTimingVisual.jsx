import React from 'react';

// Language-neutral schematic SVGs for the "Sessions & seasonality" module,
// keyed by item id. All times shown are Spain time (CET/CEST). green = up,
// red = down, blue = neutral/Asia, amber = the key window/event, muted = context.

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
// x for hour h (0..24) on a 20..228 axis
const hx = (h) => 20 + (h / 24) * 208;

const VISUALS = {
  // Three sessions on a 24h timeline (Spain time) with the London–NY overlap
  sessions: (
    <Frame label="trading sessions timeline">
      {[['Asia', 0, 9, NEUT, 30], ['Londres', 8, 17, UP, 48], ['NY', 14.5, 22, HOT, 66]].map(
        ([lbl, a, b, c, y], i) => (
          <g key={i}>
            <rect x={hx(a)} y={y} width={hx(b) - hx(a)} height="12" rx="2" fill={c} opacity="0.55" />
            <T x={hx(a) + 3} y={y + 9} fill="#0a0a0a">{lbl}</T>
          </g>
        )
      )}
      <rect x={hx(14.5)} y="26" width={hx(17) - hx(14.5)} height="54" fill={HOT} opacity="0.16" />
      <T x={hx(15.7)} y="24" textAnchor="middle" fill={HOT} fontSize="7">solape</T>
      <line x1="20" y1="90" x2="228" y2="90" stroke={MUT} strokeWidth="0.75" />
      {[[9, '9h'], [15.5, '15:30'], [22, '22h']].map(([h, l], i) => (
        <g key={i}><line x1={hx(h)} y1="88" x2={hx(h)} y2="92" stroke={MUT} /><T x={hx(h)} y="102" textAnchor="middle" fill={MUT} fontSize="7">{l}</T></g>
      ))}
    </Frame>
  ),
  // NY open reversal — the "Judas swing": a false push then a turn back
  nyopen: (
    <Frame label="NY open reversal">
      <line x1="70" y1="16" x2="70" y2="104" stroke={MUT} strokeWidth="1" strokeDasharray="3 2" />
      <T x="70" y="112" textAnchor="middle" fill={MUT} fontSize="7">15:30 apertura</T>
      <Line pts="18,64 70,60 96,34" c={UP} />
      <Line pts="96,34 130,66 176,90 214,96" c={DOWN} />
      <path d="M96 34 l-3 9 l8 -2 z" fill={UP} />
      <T x="104" y="30" fill={UP} fontSize="7">falso ↑</T>
      <T x="150" y="82" fill={DOWN} fontSize="7">la vuelta ↓</T>
    </Frame>
  ),
  // US data (14:30) — spike + whipsaw
  usdata: (
    <Frame label="US data spike">
      <line x1="120" y1="14" x2="120" y2="104" stroke={HOT} strokeWidth="1" strokeDasharray="3 2" />
      <T x="120" y="112" textAnchor="middle" fill={HOT} fontSize="7">14:30 dato US</T>
      <Line pts="16,60 60,58 100,62 118,60" c={MUT} w={1.6} />
      <line x1="120" y1="60" x2="120" y2="22" stroke={UP} strokeWidth="2.4" />
      <line x1="120" y1="60" x2="120" y2="96" stroke={DOWN} strokeWidth="2.4" />
      <Line pts="122,44 150,50 190,38 224,46" c={NEUT} w={1.6} />
      <T x="150" y="20" fill={DOWN} fontSize="7">latigazo</T>
    </Frame>
  ),
  // Gold key hours (Spain) on a timeline
  gold: (
    <Frame label="gold key hours">
      <line x1="20" y1="70" x2="228" y2="70" stroke={MUT} strokeWidth="0.75" />
      {[[14.33, 'COMEX', HOT, 40], [14.5, '', HOT, 40], [16, 'fixing', NEUT, 84]].map(([h, l, c, ty], i) => (
        <g key={i}>
          <line x1={hx(h)} y1="66" x2={hx(h)} y2="74" stroke={c} strokeWidth="1.5" />
          {l && <T x={hx(h)} y={ty} textAnchor="middle" fill={c} fontSize="7">{l}</T>}
        </g>
      ))}
      <rect x={hx(14.33)} y="52" width={hx(16.2) - hx(14.33)} height="18" fill={HOT} opacity="0.16" />
      <T x={hx(15)} y="30" textAnchor="middle" fill={HOT} fontSize="7">14:20 · 14:30 dato</T>
      <T x={hx(16)} y="96" textAnchor="middle" fill={NEUT} fontSize="7">16:00</T>
      <T x="20" y="16" fill={MUT} fontSize="7">oro — franja caliente (h. España)</T>
    </Frame>
  ),
  // Power hour — volume ramps into the US close
  powerhour: (
    <Frame label="power hour into close">
      <line x1="16" y1="98" x2="226" y2="98" stroke={MUT} strokeWidth="0.75" />
      {Array.from({ length: 12 }, (_, i) => {
        const late = i >= 8;
        const h = 8 + (i >= 8 ? (i - 6) * 12 : i * 2.5);
        return <rect key={i} x={20 + i * 16} y={98 - h} width="10" height={h} rx="1"
          fill={late ? HOT : MUT} opacity={late ? 0.85 : 0.5} />;
      })}
      <T x="150" y="30" fill={HOT} fontSize="7">power hour</T>
      <T x="180" y="112" textAnchor="middle" fill={MUT} fontSize="7">cierre 22:00</T>
      <T x="20" y="18" fill={MUT} fontSize="7">volumen</T>
    </Frame>
  ),
  // Weekend gap — Friday close to Monday open
  weekend: (
    <Frame label="weekend gap">
      <Line pts="16,80 50,66 84,74 108,56" c={UP} />
      <line x1="108" y1="56" x2="140" y2="34" stroke={HOT} strokeWidth="1.4" strokeDasharray="4 3" />
      <Line pts="140,34 168,44 200,30 224,40" c={UP} />
      <circle cx="108" cy="56" r="2.5" fill={UP} /><circle cx="140" cy="34" r="2.5" fill={UP} />
      <T x="60" y="98" fill={MUT} fontSize="7">viernes</T>
      <T x="118" y="28" fill={HOT} fontSize="7">gap</T>
      <T x="180" y="60" fill={MUT} fontSize="7">lunes</T>
    </Frame>
  ),
  // Calendar — month strip with month-end + witching Friday highlighted
  calendar: (
    <Frame label="calendar effects">
      {Array.from({ length: 21 }, (_, i) => {
        const monthEnd = i >= 18;
        const witch = i === 14;
        const c = monthEnd ? HOT : witch ? DOWN : MUT;
        return <rect key={i} x={18 + (i % 7) * 30} y={26 + Math.floor(i / 7) * 24} width="26" height="18" rx="2"
          fill={c} opacity={monthEnd || witch ? 0.7 : 0.14} stroke={MUT} strokeWidth="0.5" />;
      })}
      <T x="18" y="20" fill={HOT} fontSize="7">fin de mes</T>
      <T x="150" y="20" fill={DOWN} fontSize="7">viernes bruja</T>
      <T x="18" y="104" fill={MUT} fontSize="7">rebalanceo · vencimientos</T>
    </Frame>
  ),
};

export function hasSessionTimingVisual(id) {
  return Boolean(VISUALS[id]);
}

export default function SessionTimingVisual({ id, className = '' }) {
  const svg = VISUALS[id];
  if (!svg) return null;
  return (
    <div className={`mt-3 rounded-md bg-background/60 border border-border/60 px-2 py-2 ${className}`}>
      {svg}
    </div>
  );
}
