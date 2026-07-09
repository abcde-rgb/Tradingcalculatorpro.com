import React from 'react';
import { Clock, Target, Quote, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

/**
 * "Time vs Impact" — the trader's paradox: most hours go to analysis, but most
 * of the RESULT comes from psychology and risk management.
 *
 * Grouped horizontal bars per pillar (time% vs impact%), each directly labelled,
 * with a legend and a "return per hour" ratio (impact ÷ time) that quantifies
 * where each hour of study actually pays off. Impact weights follow Van Tharp's
 * classic 60/30/10 (psychology/risk/strategy); time figures are illustrative.
 *
 * Colours validated (dataviz skill) on the dark surface:
 *   time  #3b82f6 (blue-500) · impact #d97706 (amber-600)
 *   lightness band PASS · CVD ΔE 121 (protan)/94 (tritan) PASS · contrast PASS
 */

const TIME = '#3b82f6';
const IMPACT = '#d97706';

const ROWS = [
  { id: 'analysis', nameKey: 'tviCat1Name', noteKey: 'tviCat1Note', time: 65, impact: 10 },
  { id: 'risk',     nameKey: 'tviCat2Name', noteKey: 'tviCat2Note', time: 20, impact: 30 },
  { id: 'psych',    nameKey: 'tviCat3Name', noteKey: 'tviCat3Note', time: 15, impact: 60 },
];

const Bar = ({ pct, color, label }) => (
  <div className="flex items-center gap-2.5">
    <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground text-right">{label}</span>
    <div className="flex-1 h-3.5 rounded-full bg-muted/40 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
    <span className="w-9 shrink-0 text-xs font-mono font-bold tabular-nums text-right" style={{ color }}>{pct}%</span>
  </div>
);

const TimeVsImpact = () => {
  const { t } = useTranslation();

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 via-card to-amber-500/5 border-foreground/10"
          data-testid="time-vs-impact">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Gauge className="w-5 h-5 text-amber-500" />
          {t('tviTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('tviIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Legend */}
        <div className="flex items-center gap-5 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: TIME }} />
            <span className="text-muted-foreground">{t('tviTimeLabel')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: IMPACT }} />
            <span className="text-muted-foreground">{t('tviImpactLabel')}</span>
          </span>
        </div>

        {/* Grouped bars per pillar + return-per-hour ratio */}
        <div className="space-y-4">
          {ROWS.map((r) => {
            const roi = r.impact / r.time; // impact delivered per unit of time
            const strong = roi >= 1;
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card/50 p-3.5" data-testid={`tvi-row-${r.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t(r.nameKey)}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t(r.noteKey)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold font-mono leading-none"
                         style={{ color: strong ? IMPACT : TIME }}>×{roi.toFixed(1)}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t('tviRoiLabel')}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Bar pct={r.time} color={TIME} label={t('tviTimeShort')} />
                  <Bar pct={r.impact} color={IMPACT} label={t('tviImpactShort')} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Key takeaway */}
        <div className="bg-amber-500/5 border-l-4 border-amber-500/60 rounded-r-lg px-4 py-3 flex items-start gap-2">
          <Quote className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm italic text-muted-foreground leading-relaxed">{t('tviTakeaway')}</p>
        </div>

        {/* Actionable note */}
        <div className="flex items-start gap-2 rounded-lg bg-card/60 border border-border p-3">
          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{t('tviAction')}</p>
        </div>

        {/* Source + disclaimer */}
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed flex items-start gap-1.5">
          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {t('tviDisclaimer')}
        </p>
      </CardContent>
    </Card>
  );
};

export default TimeVsImpact;
