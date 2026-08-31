import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompareArrows, Clock, Timer, Brain } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Side-by-side comparison of the four trading styles for the Styles tab.
 * Encodes the practical trade-offs that the per-style cards don't surface:
 * hold time, trades/day, screen-time commitment and psychological load —
 * the factors that actually decide which style fits a person's life.
 *
 * `load` 1..5 renders as filled dots so the reader can compare at a glance.
 */

const Dots = ({ n, color }) => (
  <span className="inline-flex gap-0.5" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= n ? color : 'bg-muted-foreground/25'}`} />
    ))}
  </span>
);

const TradingStylesCompare = () => {
  const { t } = useTranslation();

  const rows = [
    {
      id: 'scalping', icon: '⚡', name: t('styleScalpingName'),
      hold: t('cmpHoldSeconds'), trades: t('cmpTradesVeryHigh'),
      screen: 5, stress: 5, screenColor: 'bg-red-500', stressColor: 'bg-red-500',
    },
    {
      id: 'daytrading', icon: '🌅', name: t('styleDayTradingName'),
      hold: t('cmpHoldHours'), trades: t('cmpTradesHigh'),
      screen: 4, stress: 4, screenColor: 'bg-orange-500', stressColor: 'bg-orange-500',
    },
    {
      id: 'swing', icon: '🌊', name: t('styleSwingName'),
      hold: t('cmpHoldDays'), trades: t('cmpTradesMedium'),
      screen: 2, stress: 2, screenColor: 'bg-green-500', stressColor: 'bg-green-500',
    },
    {
      id: 'position', icon: '🏔️', name: t('stylePositionName'),
      hold: t('cmpHoldMonths'), trades: t('cmpTradesLow'),
      screen: 1, stress: 1, screenColor: 'bg-blue-500', stressColor: 'bg-blue-500',
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/10 border-purple-500/30" data-testid="trading-styles-compare">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <GitCompareArrows className="w-5 h-5 text-compare" />
          {t('cmpTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('cmpIntro')}</p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border bg-background/40">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-purple-500/10 border-b border-purple-500/30 text-compare text-xs uppercase tracking-wider">
                <th className="px-3 py-2 text-left font-bold">{t('cmpColStyle')}</th>
                <th className="px-3 py-2 text-left font-bold"><span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t('cmpColHold')}</span></th>
                <th className="px-3 py-2 text-left font-bold"><span className="inline-flex items-center gap-1"><Timer className="w-3 h-3" />{t('cmpColTrades')}</span></th>
                <th className="px-3 py-2 text-left font-bold">{t('cmpColScreen')}</th>
                <th className="px-3 py-2 text-left font-bold"><span className="inline-flex items-center gap-1"><Brain className="w-3 h-3" />{t('cmpColStress')}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{r.icon} {r.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.hold}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.trades}</td>
                  <td className="px-3 py-2.5"><Dots n={r.screen} color={r.screenColor} /></td>
                  <td className="px-3 py-2.5"><Dots n={r.stress} color={r.stressColor} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
          <span>💡</span><span>{t('cmpFooter')}</span>
        </p>
      </CardContent>
    </Card>
  );
};

export default TradingStylesCompare;
