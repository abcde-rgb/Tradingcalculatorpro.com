import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

// Build 14 pyramid rows: rows 1-4 = winners (1-10), rows 5-14 = losers (11-100)
function buildRows() {
  const rows = [];
  let n = 1;
  for (let r = 1; r <= 4; r++) {
    const items = [];
    for (let i = 0; i < r; i++) items.push({ num: n++, winner: true });
    rows.push(items);
  }
  let rowSize = 5;
  while (n <= 100) {
    const items = [];
    for (let i = 0; i < rowSize && n <= 100; i++) items.push({ num: n++, winner: false });
    rows.push(items);
    rowSize++;
  }
  return rows;
}

const ROWS = buildRows();

function TraderCircle({ person, hovered, setHovered, t }) {
  const active = hovered === person.num;
  const winColor = '#22c55e';
  const loseColor = '#ef4444';
  const color = person.winner ? winColor : loseColor;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(person.num)}
      onMouseLeave={() => setHovered(null)}
    >
      <div
        style={{
          width: 26, height: 26,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: person.num >= 100 ? 6 : person.num >= 10 ? 7 : 8,
          fontWeight: 700,
          color: '#fff',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          transform: active ? 'scale(1.7)' : 'scale(1)',
          position: 'relative',
          zIndex: active ? 30 : 1,
          backgroundColor: color,
          boxShadow: active ? `0 0 14px 4px ${color}70` : '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {person.num}
      </div>

      {active && (
        <div style={{ position: 'absolute', bottom: '140%', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <div
            className="bg-popover border border-border rounded-lg shadow-2xl px-3 py-2 text-xs"
            style={{ whiteSpace: 'nowrap' }}
          >
            <p className="font-bold mb-0.5">{t('pyramidTrader')} #{person.num}</p>
            <p style={{ color }}>{person.winner ? t('pyramidWinnerLabel') : t('pyramidLoserLabel')}</p>
            <p className="text-muted-foreground text-[10px] mt-0.5">
              {person.winner ? `Top ${person.num}%` : `${t('pyramidRank')} ${person.num}/100`}
            </p>
          </div>
          <div style={{
            width: 0, height: 0, margin: '0 auto',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid hsl(var(--border))',
          }} />
        </div>
      )}
    </div>
  );
}

export default function TradingPyramid() {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold font-unbounded">{t('pyramidTitle')}</h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t('pyramidSubtitle')}</p>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
          <span className="text-sm font-semibold text-long">10% — {t('pyramidWinners')}</span>
          <span className="text-xs text-muted-foreground">(#1–10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          <span className="text-sm font-semibold text-short">90% — {t('pyramidLosers')}</span>
          <span className="text-xs text-muted-foreground">(#11–100)</span>
        </div>
      </div>

      {/* Pyramid */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          {ROWS.map((row, ri) => (
            <div key={ri}>
              {/* Divider between winners and losers */}
              {ri === 4 && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 border-t-2 border-dashed border-green-500/40" />
                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold text-long block">↑ 10% {t('pyramidWinners')}</span>
                    <span className="text-[10px] font-bold text-short block">↓ 90% {t('pyramidLosers')}</span>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-red-500/40" />
                </div>
              )}
              <div className="flex" style={{ gap: 3, justifyContent: 'center' }}>
                {row.map(p => (
                  <TraderCircle
                    key={p.num}
                    person={p}
                    hovered={hovered}
                    setHovered={setHovered}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground italic">{t('pyramidHoverHint')}</p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center space-y-1">
          <p className="text-4xl font-bold text-long">10</p>
          <p className="text-sm font-semibold text-long">{t('pyramidWinners')}</p>
          <p className="text-xs text-muted-foreground leading-snug">{t('pyramidStatWinners')}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center space-y-1">
          <p className="text-4xl font-bold text-short">90</p>
          <p className="text-sm font-semibold text-short">{t('pyramidLosers')}</p>
          <p className="text-xs text-muted-foreground leading-snug">{t('pyramidStatLosers')}</p>
        </div>
      </div>

      {/* Key message */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 text-center">
        <p className="text-sm font-semibold">{t('pyramidKeyMessage')}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('pyramidKeyDetail')}</p>
      </div>
    </div>
  );
}
