import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Target, Activity, DollarSign, RotateCcw, Layers, Shuffle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';

/**
 * Results section of SimulatorPro: KPI cards + equity/drawdown charts
 * + win/loss distribution + last-20 ops table + "new simulation" reset.
 */
export default function SimulatorResults({ results, operations, onReset }) {
  const { t } = useTranslation();

  // Equity + drawdown precomputed with running peak — O(n) single pass
  const chartData = useMemo(() => {
    const equity = [];
    const drawdown = [];
    let peak = -Infinity;
    for (let i = 0; i < operations.length; i += 1) {
      const op = operations[i];
      const bal = op.capitalAfter;
      if (bal > peak) peak = bal;
      const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
      equity.push({ operacion: i + 1, balance: bal, fase: op.phase });
      drawdown.push({ operacion: i + 1, drawdown: dd, fase: op.phase });
    }
    return { equity, drawdown };
  }, [operations]);

  if (!results) return null;

  const {
    finalBalance, netGain, roi, winRate, maxDrawdown, profitFactor,
    grossGain, grossLoss, totalCommission, expectancy,
    totalOps, totalWins, totalLosses,
    maxWinStreak, maxLossStreak, distribution, iterations,
  } = results;

  const fmt = (v) => `$${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card className="bg-card border-border" data-testid="simulation-results">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-500" />
          </div>
          {t('simulationResults')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Metrics */}
        <section>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> {t('mainMetrics')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Kpi label={t('finalBalance')} testId="final-balance" valueClass="text-primary">
              ${finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Kpi>
            <Kpi label={t('netGain')} valueClass={netGain >= 0 ? 'text-green-500' : 'text-red-500'}>
              {netGain >= 0 ? '+' : ''}${netGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Kpi>
            <Kpi label={t('totalRoi')} valueClass={roi >= 0 ? 'text-green-500' : 'text-red-500'}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
            </Kpi>
            <Kpi label={t('winRate')}>{winRate.toFixed(2)}%</Kpi>
            <Kpi label={t('maxDrawdown')} valueClass="text-red-500">{maxDrawdown.toFixed(2)}%</Kpi>
            <Kpi label={t('profitFactor')}
              valueClass={profitFactor >= 1.5 ? 'text-green-500' : profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}>
              {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}x
            </Kpi>
          </div>
        </section>

        {/* Long-term outcome range (Monte-Carlo over the same config) */}
        {distribution && (
          <section data-testid="longterm-range">
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> {t('longTermRange')}
            </h4>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <Shuffle className="w-3 h-3" />
              {t('longTermRangeDesc').replace('{n}', (iterations || 0).toLocaleString())}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <ScenarioCard
                label={t('scenarioPessimistic')} value={fmt(distribution.p5)}
                tone="bg-red-500/10 border-red-500/30" valueClass="text-red-500"
              />
              <ScenarioCard
                label={t('scenarioMedian')} value={fmt(distribution.p50)}
                tone="bg-primary/10 border-primary/30" valueClass="text-primary" highlight
              />
              <ScenarioCard
                label={t('scenarioOptimistic')} value={fmt(distribution.p95)}
                tone="bg-green-500/10 border-green-500/30" valueClass="text-green-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi label={t('profitProbability')}
                valueClass={distribution.profitProbability >= 55 ? 'text-green-500' : distribution.profitProbability >= 45 ? 'text-yellow-500' : 'text-red-500'}
                size="sm">
                {distribution.profitProbability.toFixed(1)}%
              </Kpi>
              <Kpi label={t('worstCaseDrawdown')} valueClass="text-red-500" size="sm">
                {distribution.worstMaxDrawdown.toFixed(1)}%
              </Kpi>
              <Kpi label={t('worstLosingStreak')} valueClass="text-orange-500" size="sm">
                {distribution.worstLosingStreak}
              </Kpi>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3">
              {t('medianPathNote').replace('{n}', (iterations || 0).toLocaleString())}
            </p>
          </section>
        )}

        {/* Advanced Metrics */}
        <section>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> {t('advancedMetrics')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Kpi label={t('grossGain')} valueClass="text-green-500" size="sm">
              ${grossGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Kpi>
            <Kpi label={t('grossLoss')} valueClass="text-red-500" size="sm">
              ${grossLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Kpi>
            <Kpi label={t('totalCommissions')} size="sm">
              ${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Kpi>
            <Kpi label={t('expectancy')} valueClass={expectancy >= 0 ? 'text-green-500' : 'text-red-500'} size="sm">
              {expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}
            </Kpi>
            <Kpi label={t('totalOperations')} size="sm">{totalOps}</Kpi>
            <Kpi label={t('winnersLosers')} size="sm">
              <span className="text-green-500">{totalWins}</span> / <span className="text-red-500">{totalLosses}</span>
            </Kpi>
            <Kpi label={t('maxWinStreak')} valueClass="text-green-500" size="sm">{maxWinStreak ?? 0}</Kpi>
            <Kpi label={t('maxLossStreak')} valueClass="text-red-500" size="sm">{maxLossStreak ?? 0}</Kpi>
          </div>
        </section>

        {/* Visual Charts */}
        <section>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> {t('visualAnalysis')}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <EquityChart data={chartData.equity} label={t('equityCurve')} xAxisLabel={t('operationNumber')} yAxisLabel={t('balanceLabel')} />
            <DrawdownChart data={chartData.drawdown} label={t('drawdownChart')} xAxisLabel={t('numeroDeOperacion_9c9c72')} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-2">{t('distribucionWinLoss_c5a5a9')}</p>
                <div className="flex items-center justify-center gap-4 h-32">
                  <div className="text-center">
                    <div
                      className="w-16 bg-green-500 rounded mx-auto mb-2"
                      style={{ height: `${(totalWins / Math.max(totalOps, 1)) * 100}px` }}
                    />
                    <p className="text-xs text-muted-foreground">Wins</p>
                    <p className="font-bold text-green-500">{totalWins}</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 bg-red-500 rounded mx-auto mb-2"
                      style={{ height: `${(totalLosses / Math.max(totalOps, 1)) * 100}px` }}
                    />
                    <p className="text-xs text-muted-foreground">Losses</p>
                    <p className="font-bold text-red-500">{totalLosses}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-2">{t('distribucionPL_b6b1ab')}</p>
                <div className="flex items-center justify-center h-32">
                  <div className="relative w-32 h-32">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(#22c55e ${(grossGain / Math.max(grossGain + grossLoss, 1)) * 360}deg, #ef4444 0deg)`,
                      }}
                    />
                    <div className="absolute inset-4 bg-card rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {((grossGain / Math.max(grossGain + grossLoss, 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Last 20 Operations Table */}
        <section>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Últimas 20 Operaciones
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Fase</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Capital</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">P&L</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">{t('comision_7fb096')}</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">Resultado</th>
                  <th className="text-left p-2 font-semibold text-muted-foreground">ROI</th>
                </tr>
              </thead>
              <tbody>
                {operations.slice(-20).map((op) => (
                  <tr key={op.num} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2">{op.num}</td>
                    <td className="p-2">{op.phase}</td>
                    <td className="p-2 font-mono">${op.capitalInOp.toFixed(2)}</td>
                    <td className={`p-2 font-mono ${op.isWin ? 'text-green-500' : 'text-red-500'}`}>
                      {op.pnl >= 0 ? '+' : ''}${op.pnl.toFixed(2)}
                    </td>
                    <td className="p-2 font-mono">${op.commission.toFixed(2)}</td>
                    <td className="p-2">
                      {op.isWin
                        ? <span className="text-green-500">✓ WIN</span>
                        : <span className="text-red-500">✗ LOSS</span>}
                    </td>
                    <td className={`p-2 font-mono ${op.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {op.roi >= 0 ? '+' : ''}{op.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Button onClick={onReset} variant="secondary" className="w-full gap-2" data-testid="new-simulation-btn">
          <RotateCcw className="w-4 h-4" /> {t('newSimulation')}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Small stat card used by the results grid. */
function Kpi({ label, children, valueClass = '', size = 'xl', testId }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${size === 'xl' ? 'text-xl' : 'text-lg'} font-bold ${valueClass}`}>{children}</p>
    </div>
  );
}

/** Scenario card for the long-term outcome range (pessimistic/median/optimistic). */
function ScenarioCard({ label, value, tone, valueClass, highlight = false }) {
  return (
    <div className={`p-4 rounded-lg border text-center ${tone} ${highlight ? 'ring-1 ring-primary/40' : ''}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function EquityChart({ data, label, xAxisLabel, yAxisLabel }) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-4">{label}</p>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="operacion"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.7)' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.7)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px' }}
            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}
            itemStyle={{ color: '#22c55e' }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
            labelFormatter={(l) => `Op #${l}`}
          />
          <Area
            type="monotone" dataKey="balance"
            stroke="#22c55e" strokeWidth={2}
            fill="url(#colorBalance)" dot={false}
            activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DrawdownChart({ data, label, xAxisLabel }) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-4">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="operacion"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            label={{ value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.7)' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            label={{ value: 'Drawdown (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.7)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px' }}
            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}
            itemStyle={{ color: '#ef4444' }}
            formatter={(value) => [`${value.toFixed(2)}%`, 'Drawdown']}
            labelFormatter={(l) => `Op #${l}`}
          />
          <Area
            type="monotone" dataKey="drawdown"
            stroke="#ef4444" strokeWidth={2}
            fill="url(#colorDD)" dot={false}
            activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Reference to ensure Recharts LineChart import is not tree-shaken if future usage:
void LineChart;
