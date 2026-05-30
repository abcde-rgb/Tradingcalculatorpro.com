import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crosshair, Activity, Ruler, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Stop-Loss philosophy + break-even R:R reference for the Capital tab.
 *
 * Core teaching point (the nuance the simple "always use 1:2" rule misses):
 *   The MINIMUM viable reward:risk is NOT universal — it is fully determined
 *   by the system's win rate. Break-even R = (1 − W) / W.
 *   A high-win-rate system is profitable at R < 1; a low-win-rate trend
 *   system needs a high R. So a fixed arbitrary stop that ignores market
 *   structure quietly degrades expectancy over a large sample.
 */

// Break-even reward:risk for a given win rate W: R* = (1 − W) / W.
const WIN_RATES = [30, 40, 50, 60, 70, 80];

const breakeven = (wr) => {
  const w = wr / 100;
  return (1 - w) / w;
};

const StopLossGuide = () => {
  const { t } = useTranslation();

  const stopTypes = [
    {
      id: 'structure',
      icon: Crosshair,
      color: 'text-green-500',
      ring: 'border-green-500/30 bg-green-500/5',
      name: t('slStructureName'),
      desc: t('slStructureDesc'),
      good: true,
    },
    {
      id: 'atr',
      icon: Activity,
      color: 'text-blue-500',
      ring: 'border-blue-500/30 bg-blue-500/5',
      name: t('slAtrName'),
      desc: t('slAtrDesc'),
      good: true,
    },
    {
      id: 'fixed',
      icon: Ruler,
      color: 'text-amber-500',
      ring: 'border-amber-500/30 bg-amber-500/5',
      name: t('slFixedName'),
      desc: t('slFixedDesc'),
      good: false,
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/10 border-red-500/30" data-testid="stop-loss-guide">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Crosshair className="w-5 h-5 text-red-500" />
          {t('slGuideTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('slGuideIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fixed vs Variable stop types */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t('slTypesTitle')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stopTypes.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={`rounded-xl border p-4 ${s.ring}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${s.color}`} />
                    <span className="font-semibold text-sm">{s.name}</span>
                    {s.good
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Break-even R:R by win rate */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t('slBreakevenTitle')}
          </h4>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t('slBreakevenIntro')}</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-background/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-500/10 border-b border-red-500/30">
                  <th className="px-3 py-2 text-left text-red-400 font-bold text-xs uppercase tracking-wider">{t('slColWinRate')}</th>
                  <th className="px-3 py-2 text-left text-red-400 font-bold text-xs uppercase tracking-wider">{t('slColBreakeven')}</th>
                  <th className="px-3 py-2 text-left text-red-400 font-bold text-xs uppercase tracking-wider">{t('slColProfitable')}</th>
                </tr>
              </thead>
              <tbody>
                {WIN_RATES.map((wr) => {
                  const be = breakeven(wr);
                  return (
                    <tr key={wr} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-mono font-semibold">{wr}%</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">1 : {be.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-green-500">&gt; 1 : {be.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono">{t('slBreakevenFormula')}</p>
        </div>

        {/* Key insight */}
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{t('slKeyInsight')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default StopLossGuide;
