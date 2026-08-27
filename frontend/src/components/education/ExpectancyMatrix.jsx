import React, { useMemo, useState } from 'react';
import { Calculator, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

/**
 * Esperanza Matemática (Expectancy) Matrix
 * Pure-derivation table — no hardcoded cell values.
 * Formula: EV = (winRate × R) − (lossRate × 1)
 */
const WIN_RATES = [10, 20, 30, 40, 50, 60, 70, 80, 90]; // %A
const R_RATIOS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4];

const fmt = (n) => (n >= 0 ? n.toFixed(2) : n.toFixed(2));

const cellColor = (ev) => {
  if (Math.abs(ev) < 0.005) return 'text-foreground';
  if (ev < 0) return 'text-short';
  return 'text-long';
};

const ExpectancyMatrix = () => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null); // { row, col }

  const rows = useMemo(
    () =>
      WIN_RATES.map((wr) => {
        const lossRate = 100 - wr;
        return {
          winRate: wr,
          lossRate,
          values: R_RATIOS.map((r) => (wr / 100) * r - (lossRate / 100) * 1),
        };
      }),
    []
  );

  const hoveredEV =
    hovered != null
      ? rows[hovered.row].values[hovered.col]
      : null;
  const hoveredR = hovered != null ? R_RATIOS[hovered.col] : null;
  const hoveredWR = hovered != null ? rows[hovered.row].winRate : null;

  return (
    <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
          <Calculator className="w-5 h-5 text-short" />
          {t('expectancyMatrixTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('expectancyMatrixIntro')}
        </p>

        {/* Formula */}
        <div className="bg-card/60 border border-border rounded-lg px-4 py-3 font-mono text-sm flex items-center gap-3 flex-wrap">
          <Target className="w-4 h-4 text-warn flex-shrink-0" />
          <span className="text-muted-foreground">EV =</span>
          <span className="text-long">(%A × R)</span>
          <span className="text-muted-foreground">−</span>
          <span className="text-short">(%F × 1)</span>
          {hoveredEV !== null && (
            <span className="ml-auto text-foreground font-semibold whitespace-nowrap">
              {hoveredWR}% × {hoveredR} − {100 - hoveredWR}% × 1 ={' '}
              <span className={cellColor(hoveredEV)}>{fmt(hoveredEV)} R</span>
            </span>
          )}
        </div>

        {/* Matrix table */}
        <div
          className="overflow-x-auto rounded-xl border border-border bg-background/40"
          data-testid="expectancy-matrix-scroll"
        >
          <table className="w-full text-sm font-mono" data-testid="expectancy-matrix-table">
            <thead>
              <tr className="bg-red-500/10 border-b border-red-500/30">
                <th className="px-3 py-2 text-left text-short font-bold tracking-wider text-xs whitespace-nowrap">
                  %A
                </th>
                <th className="px-3 py-2 text-left text-short font-bold tracking-wider text-xs whitespace-nowrap">
                  %F
                </th>
                <th
                  colSpan={R_RATIOS.length}
                  className="px-3 py-2 text-center text-short font-bold tracking-wider text-xs"
                >
                  {t('expectancyMatrixRiskRewardCol')}
                </th>
              </tr>
              <tr className="bg-red-500/5 border-b-2 border-red-500/30">
                <th className="px-3 py-2 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t('expectancyMatrixWinRateCol')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t('expectancyMatrixLossRateCol')}
                </th>
                {R_RATIOS.map((r) => (
                  <th
                    key={r}
                    className="px-2 py-2 text-center font-bold text-foreground"
                  >
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={row.winRate}
                  className={`border-b border-red-500/10 transition-colors ${
                    rIdx % 2 === 0 ? 'bg-card/30' : 'bg-transparent'
                  }`}
                >
                  <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                    {row.winRate}%
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                    {row.lossRate}%
                  </td>
                  {row.values.map((ev, cIdx) => (
                    <td
                      key={`${row.winRate}-${R_RATIOS[cIdx]}`}
                      onMouseEnter={() => setHovered({ row: rIdx, col: cIdx })}
                      onMouseLeave={() => setHovered(null)}
                      className={`px-2 py-2.5 text-center font-bold cursor-pointer transition-all ${cellColor(
                        ev
                      )} ${
                        hovered?.row === rIdx && hovered?.col === cIdx
                          ? 'bg-primary/10 ring-1 ring-primary/40'
                          : ''
                      }`}
                      data-testid={`ev-cell-${row.winRate}-${R_RATIOS[cIdx]}`}
                    >
                      {fmt(ev)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-short/80"></span>
            <span className="text-muted-foreground">{t('expectancyMatrixLegendLoss')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-long/80"></span>
            <span className="text-muted-foreground">{t('expectancyMatrixLegendProfit')}</span>
          </div>
        </div>

        {/* Interpretation */}
        <div className="bg-orange-500/5 border-l-4 border-orange-500/60 rounded-r-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-warn mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('expectancyMatrixInterpretation')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpectancyMatrix;
