import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Target, AlertTriangle,
  CheckCircle2, Calendar, Layers, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { fetchAnalytics } from '@/services/performanceApi';

const SEVERITY_BG = {
  critical: 'border-[#ef4444]/40 bg-[#ef4444]/5',
  warning:  'border-[#f59e0b]/40 bg-[#f59e0b]/5',
  good:     'border-[#22c55e]/40 bg-[#22c55e]/5',
  info:     'border-[#3b82f6]/40 bg-[#3b82f6]/5',
};
const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning:  AlertTriangle,
  good:     CheckCircle2,
  info:     Activity,
};
const SEVERITY_COLOR = {
  critical: 'text-[#ef4444]',
  warning:  'text-[#f59e0b]',
  good:     'text-[#22c55e]',
  info:     'text-[#3b82f6]',
};

const KpiCard = ({ icon: Ic, label, value, subValue, color = 'text-foreground', testId }) => (
  <div className="bg-card border border-border rounded-xl p-4" data-testid={testId}>
    <div className="flex items-center gap-2 mb-2">
      {Ic && <Ic className={`w-4 h-4 ${color}`} />}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
    </div>
    <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    {subValue && <div className="text-[10px] text-muted-foreground mt-1">{subValue}</div>}
  </div>
);

const Bar = ({ label, n, total, pnl }) => {
  const pct = total > 0 ? (n / total) * 100 : 0;
  const pnlPositive = pnl > 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {n} ({pct.toFixed(0)}%)
          <span className={`ml-2 font-mono ${pnlPositive ? 'text-[#22c55e]' : pnl < 0 ? 'text-[#ef4444]' : ''}`}>
            {pnl > 0 ? '+' : ''}${pnl?.toFixed(0)}
          </span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${pnlPositive ? 'bg-[#22c55e]' : pnl < 0 ? 'bg-[#ef4444]' : 'bg-primary'}`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const EquityCurve = ({ data }) => {
  // Convert to recharts series once (hooks must run unconditionally)
  const series = useMemo(
    () => (data || []).map((v, i) => ({ x: i, balance: Number(v) })),
    [data],
  );
  if (!data || data.length < 2) return null;
  const start = data[0];
  const end = data[data.length - 1];
  const positive = end >= start;
  const color = positive ? '#22c55e' : '#ef4444';
  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
          <XAxis dataKey="x" hide />
          <YAxis
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `$${Math.round(v)}`}
            width={56}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={start} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Balance']}
            labelFormatter={(l) => `#${l}`}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2}
            fill="url(#equityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function AnalyticsDashboard({ refreshKey }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAnalytics()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('loading')}…</div>;
  }
  if (!data || !data.analytics) return null;

  const a = data.analytics;
  const insights = data.insights || [];

  if (a.closed_trades === 0) {
    return (
      <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
        <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t('analyticsNoData')}</p>
      </div>
    );
  }

  const pnlColor = a.total_pnl > 0 ? 'text-[#22c55e]' : a.total_pnl < 0 ? 'text-[#ef4444]' : 'text-foreground';

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* KPI grid — 8 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} label={t('kpiWinRate')}
          value={`${a.win_rate}%`}
          subValue={`${a.winning_trades}W · ${a.losing_trades}L`}
          color="text-foreground"
          testId="kpi-win-rate" />
        <KpiCard icon={Activity} label={t('kpiProfitFactor')}
          value={a.profit_factor != null ? a.profit_factor : '∞'}
          subValue={a.profit_factor >= 1.5 ? t('pfExcellent') : a.profit_factor >= 1.0 ? t('pfOk') : t('pfLosing')}
          color={a.profit_factor >= 1.5 ? 'text-[#22c55e]' : a.profit_factor >= 1.0 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}
          testId="kpi-pf" />
        <KpiCard icon={Target} label={t('kpiExpectancy')}
          value={`$${a.expectancy}`}
          subValue={a.expectancy > 0 ? t('kpiPositiveEdge') : t('kpiNegativeEdge')}
          color={a.expectancy > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
          testId="kpi-exp" />
        <KpiCard icon={Layers} label={t('kpiAvgR')}
          value={`${a.avg_r > 0 ? '+' : ''}${a.avg_r}R`}
          subValue={t('kpiSharpeShort', { val: a.sharpe_ratio }) || `Sharpe ${a.sharpe_ratio}`}
          color={a.avg_r > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}
          testId="kpi-r" />
        <KpiCard icon={TrendingUp} label={t('kpiTotalPnL')}
          value={`${a.total_pnl > 0 ? '+' : ''}$${a.total_pnl}`}
          subValue={`${a.total_pnl_pct > 0 ? '+' : ''}${a.total_pnl_pct}%`}
          color={pnlColor}
          testId="kpi-pnl" />
        <KpiCard icon={TrendingDown} label={t('kpiMaxDD')}
          value={`-$${a.max_drawdown_dollars}`}
          subValue={`${a.max_drawdown_pct}%`}
          color="text-[#ef4444]"
          testId="kpi-dd" />
        <KpiCard icon={CheckCircle2} label={t('kpiCompliance')}
          value={`${a.rule_compliance_rate}%`}
          subValue={`${a.errors_total} ${t('kpiErrorsDetected')}`}
          color={a.rule_compliance_rate >= 90 ? 'text-[#22c55e]' : a.rule_compliance_rate >= 70 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}
          testId="kpi-compliance" />
        <KpiCard icon={Activity} label={t('kpiStreaks')}
          value={`+${a.max_consecutive_wins} / -${a.max_consecutive_losses}`}
          subValue={t('kpiStreaksHint')}
          testId="kpi-streaks" />
      </div>

      {/* Equity curve */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
            {t('equityCurve')}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {a.equity_curve.length} {t('analyticsPoints')}
          </span>
        </div>
        <EquityCurve data={a.equity_curve} />
      </div>

      {/* Two columns: by setup + by day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> {t('breakdownBySetup')}
          </h3>
          <div className="space-y-2.5">
            {a.by_setup.slice(0, 6).map((s) => (
              <Bar key={s.group} label={s.group} n={s.n} total={a.closed_trades} pnl={s.pnl} />
            ))}
            {a.by_setup.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('breakdownEmpty')}</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {t('breakdownByDay')}
          </h3>
          <div className="space-y-2.5">
            {a.by_day.map((d) => (
              <Bar key={d.group} label={d.group} n={d.n} total={a.closed_trades} pnl={d.pnl} />
            ))}
          </div>
        </div>
      </div>

      {/* R distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          {t('rDistribution')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(a.r_distribution).map(([bucket, count]) => {
            const pct = a.closed_trades > 0 ? (count / a.closed_trades) * 100 : 0;
            const bullish = bucket.startsWith('>') || bucket.startsWith('1R');
            return (
              <div key={bucket} className="text-center">
                <div className={`h-20 flex items-end ${bullish ? 'bg-[#22c55e]/5' : bucket.startsWith('0R') ? 'bg-muted/40' : 'bg-[#ef4444]/5'} rounded`}>
                  <div className={`w-full ${bullish ? 'bg-[#22c55e]' : bucket.startsWith('0R') ? 'bg-muted-foreground/40' : 'bg-[#ef4444]'} rounded transition-all`}
                       style={{ height: `${pct}%` }} />
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 font-mono">{bucket}</div>
                <div className="text-[10px] font-bold">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-insights */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> {t('autoInsights')}
          </h3>
          <div className="space-y-2">
            {insights.map((ins, i) => {
              const Ic = SEVERITY_ICON[ins.severity] || Activity;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_BG[ins.severity] || 'border-border'}`}
                  data-testid={`insight-${i}`}
                >
                  <Ic className={`w-4 h-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLOR[ins.severity] || ''}`} />
                  <div className="text-sm flex-1">
                    {t(ins.key, ins) || ins.key}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
