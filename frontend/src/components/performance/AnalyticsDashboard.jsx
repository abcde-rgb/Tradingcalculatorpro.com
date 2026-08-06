import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Target, AlertTriangle,
  CheckCircle2, Calendar, Layers, BarChart3, ChevronLeft, ChevronRight, Brain, PlusCircle, CalendarRange,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
  ScatterChart, Scatter,
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
// Behavioral-bias severities (critical / high / medium)
const BIAS_STYLE = {
  critical: { bg: 'border-[#ef4444]/40 bg-[#ef4444]/5', col: 'text-[#ef4444]' },
  high:     { bg: 'border-[#f59e0b]/40 bg-[#f59e0b]/5', col: 'text-[#f59e0b]' },
  medium:   { bg: 'border-[#3b82f6]/40 bg-[#3b82f6]/5', col: 'text-[#3b82f6]' },
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

const Bar = ({ label, n, total, pnl, onClick }) => {
  const pct = total > 0 ? (n / total) * 100 : 0;
  // Una operación con dos setups cuenta en los dos grupos, así que un grupo
  // puede pasar del 100 % del total. El porcentaje que se imprime es el real;
  // lo que se acota es la barra, que si no se saldría del contenedor.
  const barPct = Math.min(100, Math.max(0, pct));
  const pnlPositive = pnl > 0;
  return (
    <div
      className={`space-y-1 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
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
             style={{ width: `${barPct}%` }} />
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

// Monthly PnL calendar (TradeZella-style): one cell per day, green/red by realized PnL.
const PnLCalendar = ({ data }) => {
  const { t, locale } = useTranslation();

  const byDate = useMemo(() => {
    const m = {};
    (data || []).forEach((d) => { m[d.date] = d; });
    return m;
  }, [data]);

  const monthsWithData = useMemo(
    () => Array.from(new Set((data || []).map((d) => d.date.slice(0, 7)))).sort(),
    [data],
  );

  const [month, setMonth] = useState(() => {
    if (monthsWithData.length) return monthsWithData[monthsWithData.length - 1];
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const [year, mon] = month.split('-').map(Number);          // mon: 1-12
  const daysInMonth = new Date(year, mon, 0).getDate();
  const leading = (new Date(year, mon - 1, 1).getDay() + 6) % 7;  // Monday-first offset

  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, info: byDate[ds] });
  }

  const monthRows = (data || []).filter((d) => d.date.startsWith(month));
  const monthPnl = monthRows.reduce((s, d) => s + d.pnl, 0);
  const tradingDays = monthRows.length;
  const monthWins = monthRows.reduce((s, d) => s + (d.wins || 0), 0);
  const monthOps = monthRows.reduce((s, d) => s + (d.n || 0), 0);
  const monthPct = monthRows.reduce((s, d) => s + (d.pct || 0), 0);

  const shift = (delta) => {
    const dt = new Date(year, mon - 1 + delta, 1);
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };

  let monthLabel = month;
  try {
    monthLabel = new Date(year, mon - 1, 1).toLocaleDateString(locale || 'es', { month: 'long', year: 'numeric' });
  } catch (_) { /* fallback to YYYY-MM */ }

  const dows = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const compact = (v) => (Math.abs(v) >= 1000
    ? `${v > 0 ? '+' : ''}${(v / 1000).toFixed(1)}k`
    : `${v > 0 ? '+' : ''}${Math.round(v)}`);

  return (
    <div className="bg-card border border-border rounded-xl p-5" data-testid="pnl-calendar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" /> {t('pnlCalendar')}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} aria-label="Mes anterior"
            className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold capitalize w-28 text-center">{monthLabel}</span>
          <button onClick={() => shift(1)} aria-label="Mes siguiente"
            className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dows.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/70">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`} />;
          const pnl = c.info?.pnl;
          const has = pnl != null;
          const bg = !has ? 'bg-muted/15'
            : pnl > 0 ? 'bg-[#22c55e]/15 border-[#22c55e]/30'
            : pnl < 0 ? 'bg-[#ef4444]/15 border-[#ef4444]/30'
            : 'bg-muted/30';
          const col = pnl > 0 ? 'text-[#22c55e]' : pnl < 0 ? 'text-[#ef4444]' : 'text-muted-foreground';
          const pct = c.info?.pct;
          return (
            <div key={`d${c.day}`}
              title={has
                ? `${c.day} · ${pnl > 0 ? '+' : ''}$${pnl} (${pct > 0 ? '+' : ''}${pct}%) · ${c.info.wins}/${c.info.n} ✓ · ${c.info.n} ops`
                : `${c.day}`}
              className={`min-h-[60px] rounded-md border border-transparent ${bg} px-1 py-0.5 flex flex-col`}>
              <span className="text-[9px] text-muted-foreground leading-none">{c.day}</span>
              {has && (
                <div className="mt-auto leading-tight">
                  <div className={`text-[11px] font-bold font-mono ${col}`}>{compact(pnl)}</div>
                  <div className="text-[8px] text-muted-foreground font-mono">
                    {c.info.wins}/{c.info.n}{pct != null && ` · ${pct > 0 ? '+' : ''}${pct}%`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs flex-wrap gap-1">
        <span className="text-muted-foreground">
          {tradingDays} {t('tradingDays')} · {monthWins}/{monthOps} ✓ ({monthOps ? Math.round((monthWins / monthOps) * 100) : 0}%)
        </span>
        <span className={`font-bold font-mono ${monthPnl > 0 ? 'text-[#22c55e]' : monthPnl < 0 ? 'text-[#ef4444]' : ''}`}>
          {monthPnl > 0 ? '+' : ''}${monthPnl.toFixed(2)} ({monthPct > 0 ? '+' : ''}{monthPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
};

export default function AnalyticsDashboard({ refreshKey, onGoToJournal, onGoToSetups, onPickSetup }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodKey, setPeriodKey] = useState('month');

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
      <div className="text-center py-16 px-4 bg-card border border-dashed border-border rounded-xl"
        data-testid="analytics-empty">
        <BarChart3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">{t('analyticsEmptyTitle')}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{t('analyticsNoData')}</p>
        {onGoToJournal && (
          <button
            type="button"
            onClick={onGoToJournal}
            data-testid="analytics-empty-cta"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-semibold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            {t('addFirstTrade')}
          </button>
        )}
      </div>
    );
  }

  const pnlColor = a.total_pnl > 0 ? 'text-[#22c55e]' : a.total_pnl < 0 ? 'text-[#ef4444]' : 'text-foreground';
  const periodRows = (a.returns_by_period?.[periodKey]) || [];
  // Escala común a todas las barras del bloque, para que se comparen entre sí.
  const periodMax = Math.max(1, ...periodRows.map((r) => Math.abs(r.pct)));

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">

      {/* RENTABILIDAD POR PERIODO — lo primero, porque es la unidad en la que
          se cobra. El win rate solo no significa nada: un 70 % de acierto con
          payoff 0,5 pierde dinero, y encabezar con él invita a optimizar la
          métrica equivocada. */}
      {periodRows.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5" data-testid="analytics-periods">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <CalendarRange className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
              {t('analyticsReturnsTitle')}
            </h3>
            <div className="ml-auto flex gap-1 bg-muted rounded-md border border-border p-0.5">
              {['month', 'quarter', 'year'].map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setPeriodKey(k)}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                    periodKey === k ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`analytics-period-${k}`}
                >
                  {t(`projPeriod_${k}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {periodRows.slice(-12).reverse().map((row) => (
              <div key={row.period} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground w-20 shrink-0">{row.period}</span>
                <span className={`font-mono font-bold w-16 shrink-0 ${
                  row.pct > 0 ? 'text-[#22c55e]' : row.pct < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'
                }`}
                >
                  {row.pct > 0 ? '+' : ''}{row.pct}%
                </span>
                <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <span
                    className={`block h-full ${row.pct >= 0 ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                    style={{ width: `${Math.min(100, (Math.abs(row.pct) / periodMax) * 100)}%` }}
                  />
                </span>
                <span className="font-mono text-muted-foreground/70 w-24 text-right shrink-0">
                  {row.pnl > 0 ? '+' : ''}${row.pnl.toFixed(0)} · {row.n}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-2">
            {t('analyticsReturnsNote')}
          </p>
        </div>
      )}

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
          subValue={a.annualized ? t('kpiSharpeShort', { val: a.sharpe_ratio })
            : t('kpiSharpePerTrade', { val: a.sharpe_per_trade ?? a.sharpe_ratio })}
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

      {/* Monthly PnL calendar */}
      <PnLCalendar data={a.daily_pnl} />

      {/* Two columns: by setup + by day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> {t('breakdownBySetup')}
          </h3>
          <div className="space-y-2.5">
            {a.by_setup.slice(0, 6).map((s) => (
              <Bar
                key={s.group}
                label={s.group}
                n={s.n}
                total={a.closed_trades}
                pnl={s.pnl}
                onClick={onPickSetup ? () => onPickSetup(s.group) : undefined}
              />
            ))}
            {a.by_setup.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('breakdownEmpty')}</p>
            )}
          </div>
          {/* El mismo aviso que en la pestaña Setups: los grupos se solapan.
              Dicho en un sitio y callado en el otro, los dos números se leen
              como si uno de los dos estuviera mal. */}
          {a.setups_multi_tagged > 0 && (
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-3">
              {t('setupPerfMultiNote').replace('{n}', String(a.setups_multi_tagged))}
            </p>
          )}
          {onGoToSetups && (
            <button
              type="button"
              onClick={onGoToSetups}
              className="text-[11px] text-primary hover:underline mt-2"
              data-testid="analytics-go-setups"
            >
              {t('analyticsGoToSetups')}
            </button>
          )}
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

      {/* MAE / MFE — stop and target calibration */}
      {a.excursion?.available && (
        <div className="bg-card border border-border rounded-xl p-5" data-testid="excursion-card">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-1">
            {t('excTitle')}
          </h3>
          <p className="text-xs text-muted-foreground/80 mb-4">{t('excIntro')}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-muted/40 rounded-lg border border-border/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{t('excAvgMae')}</p>
              <p className="text-lg font-bold">{a.excursion.avg_mae_r ?? '—'}R</p>
            </div>
            <div className="bg-muted/40 rounded-lg border border-border/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{t('excAvgMfe')}</p>
              <p className="text-lg font-bold">{a.excursion.avg_mfe_r ?? '—'}R</p>
            </div>
            <div className="bg-muted/40 rounded-lg border border-border/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{t('excWinnersP80')}</p>
              <p className="text-lg font-bold">{a.excursion.winners_mae_p80 ?? '—'}R</p>
            </div>
            <div className="bg-muted/40 rounded-lg border border-border/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{t('excGaveBack')}</p>
              <p className="text-lg font-bold">
                {a.excursion.losers_gave_back}/{a.excursion.losers_sample}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg border border-border/40 p-3"
                 title={t('excCaptureHint')}>
              <p className="text-[11px] text-muted-foreground mb-1">{t('excCapture')}</p>
              <p className={`text-lg font-bold ${
                a.excursion.capture_ratio != null && a.excursion.capture_ratio < 0.4
                  ? 'text-[#f59e0b]' : ''
              }`}>
                {a.excursion.capture_ratio != null
                  ? `${Math.round(a.excursion.capture_ratio * 100)}%`
                  : '—'}
              </p>
            </div>
          </div>
          {a.excursion.suggested_stop_r && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 mb-4">
              <p className="text-xs text-foreground">
                {t('excStopSuggestion', {
                  p80: a.excursion.winners_mae_p80,
                  suggested: a.excursion.suggested_stop_r,
                })}
              </p>
            </div>
          )}
          {/* MAE against outcome: the scatter a professional opens a new journal
              to look at. Points hugging the left axis with positive R mean the
              stop is far wider than the evidence requires. */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" dataKey="mae_r" name="MAE"
                  label={{ value: t('excAxisMae'), position: 'insideBottom', offset: -12, fontSize: 11 }}
                  tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="r" name="R"
                  label={{ value: t('excAxisR'), angle: -90, position: 'insideLeft', fontSize: 11 }}
                  tick={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#6b7280" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                  formatter={(v, n) => [`${v}R`, n]} />
                <Scatter data={(a.excursion.scatter || []).filter((d) => d.mae_r != null && d.r != null)}
                  fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* R distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          {t('rDistribution')}
        </h3>
        {a.trades_without_r > 0 && (
          <p className="text-xs text-amber-500 mb-3" data-testid="r-partial-sample">
            {t('rSamplePartial', { excluded: a.trades_without_r, n: a.r_sample_size })}
          </p>
        )}
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

      {/* Behavioral biases */}
      {a.behavioral_biases?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5" data-testid="behavioral-biases">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" /> {t('biasTitle')}
          </h3>
          <div className="space-y-2">
            {a.behavioral_biases.map((b) => {
              const style = BIAS_STYLE[b.severity] || { bg: 'border-border', col: '' };
              return (
                <div
                  key={b.code}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg}`}
                  data-testid={`bias-${b.code}`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.col}`} />
                  <div className="text-sm flex-1">
                    <span className="font-semibold">{t(b.title_key)}</span>
                    <span className="text-muted-foreground"> — {t(b.detail_key, b)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
