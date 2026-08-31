import React, { useState } from 'react';
import { Brain, Shield, BarChart3, Quote, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTranslation } from '@/lib/i18n';

/**
 * "The 3 pillars of trading" — pedagogical primer for the Psychology tab.
 *
 * Renders an interactive donut chart (50% psychology / 30% risk / 20% analysis),
 * 3 expandable cards with bullet points, a "study time split" mini calculator
 * (interactive: slider for hours/week → exact hours per pillar) and a key quote.
 */

const PILLARS = [
  {
    id: 'psychology',
    pct: 50,
    nameKey: 'pillarPsychologyName',
    shortKey: 'pillarPsychologyShort',
    bulletKeys: ['pillarPsychologyP1', 'pillarPsychologyP2', 'pillarPsychologyP3'],
    Icon: Brain,
    color: '#3b82f6',
    bg: 'bg-info/8',
    border: 'border-info/30',
    text: 'text-info',
  },
  {
    id: 'risk',
    pct: 30,
    nameKey: 'pillarRiskName',
    shortKey: 'pillarRiskShort',
    bulletKeys: ['pillarRiskP1', 'pillarRiskP2', 'pillarRiskP3'],
    Icon: Shield,
    color: '#f97316',
    bg: 'bg-[#f97316]/8',
    border: 'border-[#f97316]/30',
    text: 'text-[#fb923c]',
  },
  {
    id: 'analysis',
    pct: 20,
    nameKey: 'pillarAnalysisName',
    shortKey: 'pillarAnalysisShort',
    bulletKeys: ['pillarAnalysisP1', 'pillarAnalysisP2', 'pillarAnalysisP3'],
    Icon: BarChart3,
    color: '#22c55e',
    bg: 'bg-long/8',
    border: 'border-long/30',
    text: 'text-long',
  },
];

const TradingPillarsGuide = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState('psychology');
  const [weeklyHours, setWeeklyHours] = useState(6);

  const chartData = PILLARS.map((p) => ({ name: t(p.nameKey), value: p.pct, color: p.color }));

  return (
    <Card
      className="bg-gradient-to-br from-blue-500/5 via-orange-500/5 to-green-500/5 border-foreground/10"
      data-testid="trading-pillars-guide"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Brain className="w-5 h-5 text-info" />
          {t('pillarsTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {t('pillarsIntro')}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Donut + legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative h-[220px]" data-testid="pillars-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={92}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`pillar-${entry.name}-${idx}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                100%
              </span>
              <span className="text-2xl font-unbounded font-bold">Trading</span>
            </div>
          </div>

          {/* Legend list */}
          <div className="space-y-2">
            {PILLARS.map((p) => (
              <button
                key={p.id}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                className={`w-full flex items-center gap-3 rounded-lg border ${p.border} ${p.bg} px-3 py-2.5 text-left transition-all hover:scale-[1.01]`}
                data-testid={`pillar-toggle-${p.id}`}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center font-mono font-bold text-sm"
                  style={{ background: p.color, color: '#000' }}
                >
                  {p.pct}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p.Icon className={`w-3.5 h-3.5 ${p.text}`} />
                    <span className={`text-sm font-bold ${p.text}`}>{t(p.nameKey)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                    {t(p.shortKey)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Expanded pillar bullets */}
        {expanded && (() => {
          const p = PILLARS.find((x) => x.id === expanded);
          if (!p) return null;
          return (
            <div
              className={`rounded-lg border ${p.border} ${p.bg} p-4`}
              data-testid={`pillar-detail-${p.id}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <p.Icon className={`w-4 h-4 ${p.text}`} />
                <span className={`text-sm font-bold ${p.text}`}>
                  {t(p.nameKey)} · {p.pct}%
                </span>
              </div>
              <ul className="space-y-2">
                {p.bulletKeys.map((k) => (
                  <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${p.text} flex-shrink-0 mt-0.5`} />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Study time splitter */}
        <div
          className="bg-card/60 border border-border rounded-xl p-4 space-y-3"
          data-testid="pillars-time-splitter"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold uppercase tracking-wider">
              {t('pillarsTimeTitle')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('pillarsTimeIntro').replace('{hours}', String(weeklyHours))}
          </p>

          {/* Hours slider */}
          <div className="flex items-center gap-3 bg-background/40 border border-border rounded-md px-3 py-2">
            <input
              type="range" min={1} max={40} step={1}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
              className="flex-1 accent-primary"
              data-testid="pillars-hours-slider"
            />
            <input
              type="number" min={1} max={40} step={1}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
              className="w-16 bg-muted border border-border rounded px-2 py-1 text-sm font-mono text-right focus:outline-none focus:border-primary"
              data-testid="pillars-hours-input"
            />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {t('pillarsTimeWeekly')}
            </span>
          </div>

          {/* Per-pillar hour breakdown */}
          <div className="grid grid-cols-3 gap-2">
            {PILLARS.map((p) => {
              const hours = (weeklyHours * p.pct) / 100;
              return (
                <div
                  key={`time-${p.id}`}
                  className={`rounded-md border ${p.border} ${p.bg} px-3 py-2.5 text-center`}
                  data-testid={`pillars-time-${p.id}`}
                >
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${p.text}`}>
                    {t(p.nameKey)}
                  </div>
                  <div className={`text-2xl font-bold font-mono ${p.text} mt-0.5`}>
                    {hours.toFixed(hours === Math.floor(hours) ? 0 : 1)}h
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">
                    {p.pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key quote */}
        <div className="bg-blue-500/5 border-l-4 border-blue-500/60 rounded-r-lg px-4 py-3 flex items-start gap-2">
          <Quote className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
          <p className="text-sm italic text-muted-foreground leading-relaxed">
            {t('pillarsKeyQuote')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingPillarsGuide;
