import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, AlertTriangle, ExternalLink, Shield, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

/**
 * Leverage Levels reference table (4 zones).
 * Color encodes risk: green = safe, yellow = caution, orange = aggressive, red = extreme.
 */
const LEVERAGE_ROWS = [
  {
    level: '0x – 2x',
    styleKey: 'leverageStyleSwing',
    commentKey: 'leverageCommentLow',
    color: 'text-long', bg: 'bg-long/8', border: 'border-long/30',
  },
  {
    level: '5x – 10x',
    styleKey: 'leverageStyleDayTrading',
    commentKey: 'leverageCommentMedium',
    color: 'text-caution', bg: 'bg-caution/8', border: 'border-caution/30',
  },
  {
    level: '20x – 50x',
    styleKey: 'leverageStyleAggressive',
    commentKey: 'leverageCommentMediumHigh',
    color: 'text-[#f97316]', bg: 'bg-[#f97316]/8', border: 'border-[#f97316]/30',
  },
  {
    level: '75x – 100x',
    styleKey: 'leverageStyleScalping',
    commentKey: 'leverageCommentExtreme',
    color: 'text-short', bg: 'bg-short/8', border: 'border-short/30',
  },
];

/**
 * Risk-tier color for the mini-calculator output based on % move to liquidation.
 */
const tierForLiqPct = (pct) => {
  if (pct >= 25) return { color: 'text-long', bg: 'bg-long/10', border: 'border-long/40' };
  if (pct >= 8)  return { color: 'text-caution', bg: 'bg-caution/10', border: 'border-caution/40' };
  if (pct >= 3)  return { color: 'text-[#f97316]', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]/40' };
  return { color: 'text-short', bg: 'bg-short/10', border: 'border-short/40' };
};

const LeverageGuide = () => {
  const { t } = useTranslation();
  const [leverage, setLeverage] = useState(20);
  const [capital, setCapital] = useState(1000);

  const liqPct = useMemo(() => 100 / Math.max(leverage, 0.5), [leverage]);
  const exposure = useMemo(() => capital * leverage, [capital, leverage]);
  const tier = tierForLiqPct(liqPct);

  return (
    <Card
      className="bg-gradient-to-br from-orange-500/5 via-yellow-500/5 to-red-500/5 border-orange-500/30"
      data-testid="leverage-guide"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Gauge className="w-5 h-5 text-warn" />
          {t('leverageGuideTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {t('leverageGuideIntro')}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 4-tier leverage table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-background/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-500/10 border-b border-orange-500/30">
                <th className="px-3 py-2 text-left text-warn font-bold tracking-wider text-xs uppercase">
                  {t('leverageLevelCol')}
                </th>
                <th className="px-3 py-2 text-left text-warn font-bold tracking-wider text-xs uppercase">
                  {t('leverageStyleCol')}
                </th>
                <th className="px-3 py-2 text-left text-warn font-bold tracking-wider text-xs uppercase">
                  {t('leverageCommentCol')}
                </th>
              </tr>
            </thead>
            <tbody>
              {LEVERAGE_ROWS.map((row) => (
                <tr
                  key={row.level}
                  className={`border-b border-border/40 ${row.bg}`}
                  data-testid={`leverage-row-${row.level.replace(/[^a-zA-Z0-9]/g, '')}`}
                >
                  <td className={`px-3 py-3 font-bold font-mono ${row.color} whitespace-nowrap`}>
                    {row.level}
                  </td>
                  <td className="px-3 py-3 text-foreground font-medium whitespace-nowrap">
                    {t(row.styleKey)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs leading-snug">
                    {t(row.commentKey)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Liquidation formula explanation */}
        <div className="bg-card/50 border border-border rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-caution" />
            <span className="text-sm font-bold uppercase tracking-wider">{t('liquidationFormulaTitle')}</span>
          </div>
          <div className="bg-background/70 rounded-md px-3 py-2 font-mono text-sm text-center">
            <span className="text-muted-foreground">% liq ≈</span>
            <span className="text-foreground mx-2">100</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-warn mx-2">leverage</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('liquidationFormulaExplain')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
            {[2, 10, 20, 50, 100].map((lev) => (
              <div
                key={lev}
                className="bg-muted rounded-md px-2 py-1.5 text-center font-mono text-[11px] border border-border/50"
              >
                <span className="text-warn font-bold">{lev}x</span>
                <span className="text-muted-foreground mx-1">→</span>
                <span className="text-foreground">{(100 / lev).toFixed(lev >= 100 ? 0 : lev >= 10 ? 0 : 1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini calculator */}
        <div
          className="bg-card/60 border border-orange-500/30 rounded-xl p-4 space-y-3"
          data-testid="leverage-mini-calc"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-warn" />
            <span className="text-sm font-bold uppercase tracking-wider text-warn">
              {t('leverageMiniCalcTitle')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Leverage slider */}
            <div className="bg-background/40 border border-border rounded-md p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Leverage
                </label>
                <input
                  type="number" min={1} max={125} step={1}
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, Math.min(125, parseInt(e.target.value) || 1)))}
                  className="w-20 bg-muted border border-border rounded px-2 py-0.5 text-sm font-mono text-right focus:outline-none focus:border-primary"
                  data-testid="leverage-input"
                />
              </div>
              <input
                type="range" min={1} max={125} step={1}
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-orange-500"
                data-testid="leverage-slider"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>1x</span><span>50x</span><span>125x</span>
              </div>
            </div>

            {/* Capital input */}
            <div className="bg-background/40 border border-border rounded-md p-2.5 space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                {t('leverageMiniCalcCapital')} (USDT)
              </label>
              <input
                type="number" min={0} step={100}
                value={capital}
                onChange={(e) => setCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
                data-testid="capital-input"
              />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t('leverageMiniCalcExposure')}
                </span>
                <span className="text-sm font-bold font-mono text-foreground">
                  ${exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Result */}
          <div
            className={`rounded-lg border-2 ${tier.border} ${tier.bg} px-4 py-3 flex items-center justify-between gap-3`}
          >
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {t('leverageMiniCalcResult')}
              </div>
              <div className={`text-3xl font-bold font-mono ${tier.color}`} data-testid="liquidation-pct">
                {liqPct < 1 ? liqPct.toFixed(2) : liqPct.toFixed(1)}%
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground font-mono leading-relaxed">
              <div>100 / {leverage}x</div>
              <div className={`font-bold ${tier.color}`}>= {liqPct.toFixed(2)}%</div>
            </div>
          </div>

          {/* CTA */}
          <Link to="/dashboard?tab=leverage" data-testid="open-full-calc-link">
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1 border-orange-500/50 hover:bg-orange-500/10 hover:text-warn font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {t('leverageMiniCalcOpenFull')}
            </Button>
          </Link>
        </div>

        {/* Risk rules */}
        <div className="bg-red-500/5 border-l-4 border-red-500/60 rounded-r-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-short" />
            <span className="text-xs font-bold uppercase tracking-wider text-short">
              {t('riskManagement')}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-start gap-2">
                <span className="text-short font-bold flex-shrink-0">{n}.</span>
                <span>{t(`leverageRiskRule${n}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeverageGuide;
