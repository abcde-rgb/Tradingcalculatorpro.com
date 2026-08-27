import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Layers3, BarChart2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Dow Theory visual primer for the Dow Theory tab.
 *
 * 1. A market-cycle SVG showing the THREE PHASES of a primary bull trend
 *    (Accumulation → Public Participation → Distribution) drawn as a price
 *    curve with secondary reactions (the zig-zag) inside the primary trend.
 * 2. A legend mapping the three TREND DEGREES (primary / secondary / minor).
 * 3. A "volume confirms the trend" mini bar strip.
 */

const DowTheoryDiagram = () => {
  const { t } = useTranslation();

  // Price path: flat base (accumulation) → rising zig-zag (participation)
  // → rounded top (distribution) → early markdown.
  const pricePath =
    'M0,150 L40,148 L70,152 L100,146 ' +            // accumulation base
    'L120,120 L140,135 L165,95 L185,112 L210,70 L230,86 L255,48 ' + // markup w/ secondary reactions
    'L285,52 L305,46 L325,58 L345,50 ' +            // distribution top
    'L370,80 L400,120';                             // early markdown

  const degrees = [
    { id: 'primary', icon: LineChart, color: 'text-long', dot: 'bg-green-500', name: t('dowDegreePrimaryName'), desc: t('dowDegreePrimaryDesc') },
    { id: 'secondary', icon: Layers3, color: 'text-warn', dot: 'bg-amber-500', name: t('dowDegreeSecondaryName'), desc: t('dowDegreeSecondaryDesc') },
    { id: 'minor', icon: BarChart2, color: 'text-muted-foreground', dot: 'bg-muted-foreground', name: t('dowDegreeMinorName'), desc: t('dowDegreeMinorDesc') },
  ];

  const phases = [
    { id: 'accumulation', x: 0, w: 110, color: '#3b82f6', label: t('dowPhaseAccumulation') },
    { id: 'participation', x: 110, w: 145, color: '#22c55e', label: t('dowPhaseParticipation') },
    { id: 'distribution', x: 255, w: 95, color: '#ef4444', label: t('dowPhaseDistribution') },
  ];

  return (
    <Card className="bg-gradient-to-br from-indigo-500/5 to-blue-500/10 border-indigo-500/30" data-testid="dow-theory-diagram">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <LineChart className="w-5 h-5 text-compare" />
          {t('dowDiagramTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('dowDiagramIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Market cycle SVG */}
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <svg viewBox="0 0 400 200" width="100%" role="img" aria-label={t('dowDiagramTitle')}>
            {/* phase background bands */}
            {phases.map((p) => (
              <g key={p.id}>
                <rect x={p.x} y="0" width={p.w} height="170" fill={p.color} opacity="0.07" />
                <line x1={p.x} y1="0" x2={p.x} y2="170" stroke={p.color} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />
              </g>
            ))}
            {/* price line */}
            <path d={pricePath} fill="none" stroke="currentColor" className="text-foreground" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* phase labels */}
            {phases.map((p) => (
              <text key={`l-${p.id}`} x={p.x + p.w / 2} y="186" textAnchor="middle" fontSize="9" fontWeight="600" fill={p.color}>
                {p.label}
              </text>
            ))}
          </svg>
        </div>

        {/* Three trend degrees */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('dowDegreesTitle')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {degrees.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${d.color}`} />
                    <span className="font-semibold text-sm">{d.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volume confirms the trend */}
        <div className="flex items-start gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-3 text-xs">
          <BarChart2 className="w-4 h-4 text-compare shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{t('dowVolumeConfirm')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DowTheoryDiagram;
