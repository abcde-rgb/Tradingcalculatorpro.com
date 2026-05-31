import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Gauge } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Visual primer for the COT (Commitments of Traders) tab.
 *   1. Diverging net-position bars for the three reporting groups at a market TOP
 *      — Commercials (smart money) heavily net SHORT while Large Specs (funds,
 *      trend followers) crowd net LONG and Small Specs (retail) follow.
 *   2. A COT Index gauge (0–100) showing how stretched current positioning is.
 */

// net positioning at a typical market top (positive = net long, negative = net short)
const GROUPS = [
  { id: 'commercial', net: -78, color: '#ef4444' },   // smart money — fading the move
  { id: 'large', net: 64, color: '#22c55e' },          // funds — crowded long
  { id: 'small', net: 22, color: '#f59e0b' },          // retail — following
];

const BW = 360;      // bar area width
const CENTER = BW / 2;
const ROW_H = 46;

function NetBars({ t }) {
  return (
    <svg viewBox={`0 0 ${BW} ${GROUPS.length * ROW_H + 24}`} width="100%" className="max-w-[460px]" role="img" aria-label={t('cotNetTitle')}>
      {/* zero axis */}
      <line x1={CENTER} y1="6" x2={CENTER} y2={GROUPS.length * ROW_H + 6} stroke="currentColor" className="text-muted-foreground" opacity="0.4" strokeDasharray="3 3" />
      {GROUPS.map((g, i) => {
        const y = i * ROW_H + 12;
        const len = (Math.abs(g.net) / 100) * (CENTER - 8);
        const x = g.net >= 0 ? CENTER : CENTER - len;
        return (
          <g key={g.id}>
            <rect x={x} y={y} width={len} height={ROW_H - 22} rx="2" fill={g.color} opacity="0.85" />
            <text x={g.net >= 0 ? CENTER + len + 4 : CENTER - len - 4} y={y + (ROW_H - 22) / 2 + 4} textAnchor={g.net >= 0 ? 'start' : 'end'} fontSize="10" fontFamily="monospace" fill={g.color}>
              {g.net > 0 ? '+' : ''}{g.net}%
            </text>
            <text x={CENTER} y={y + ROW_H - 6} textAnchor="middle" fontSize="9.5" className="fill-muted-foreground">{t(`cotGroup_${g.id}`)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CotIndexGauge({ t }) {
  const value = 92; // stretched bullish positioning by large specs → contrarian warning
  const W = 360, H = 54, pad = 8;
  const x = pad + (value / 100) * (W - 2 * pad);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[460px]" role="img" aria-label={t('cotIndexTitle')}>
      <defs>
        <linearGradient id="cotgrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <rect x={pad} y="14" width={W - 2 * pad} height="12" rx="6" fill="url(#cotgrad)" opacity="0.85" />
      {/* marker */}
      <polygon points={`${x},10 ${x - 5},2 ${x + 5},2`} fill="currentColor" className="text-foreground" />
      <line x1={x} y1="10" x2={x} y2="28" stroke="currentColor" className="text-foreground" strokeWidth="2" />
      <text x={x} y="44" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-foreground" fontFamily="monospace">{value}</text>
      <text x={pad} y="44" textAnchor="start" fontSize="9" className="fill-muted-foreground">0 · {t('cotIndexLow')}</text>
      <text x={W - pad} y="44" textAnchor="end" fontSize="9" className="fill-muted-foreground">{t('cotIndexHigh')} · 100</text>
    </svg>
  );
}

const CotGuide = () => {
  const { t } = useTranslation();
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/10" data-testid="cot-guide">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Scale className="w-5 h-5 text-teal-500" />
          {t('cotVisualTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('cotVisualIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('cotNetTitle')}</p>
            <NetBars t={t} />
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t('cotNetCaption')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" /> {t('cotIndexTitle')}
            </p>
            <CotIndexGauge t={t} />
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t('cotIndexCaption')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CotGuide;
