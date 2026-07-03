import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersistedState } from '@/hooks/usePersistedState';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Compound growth: equity[m] = (equity[m-1] + monthlyAdd) * (1 + pct/100)
function buildSeries(initial, monthlyPct, months, monthlyAdd) {
  const out = [{ m: 0, equity: initial }];
  let eq = initial;
  for (let m = 1; m <= months; m++) {
    eq = (eq + monthlyAdd) * (1 + monthlyPct / 100);
    out.push({ m, equity: Math.round(eq * 100) / 100 });
  }
  return out;
}

export const CompoundCalculator = () => {
  const { t } = useTranslation();
  const [data, setData] = usePersistedState('compound_calculator', {
    initial: 10000, monthlyPct: 3, months: 48, monthlyAdd: 0,
  });
  const initial = Math.max(0, parseFloat(data.initial) || 0);
  const monthlyPct = Math.min(50, Math.max(-50, parseFloat(data.monthlyPct) || 0));
  const months = Math.min(600, Math.max(1, parseInt(data.months, 10) || 1));
  const monthlyAdd = Math.max(0, parseFloat(data.monthlyAdd) || 0);

  const series = useMemo(
    () => buildSeries(initial, monthlyPct, months, monthlyAdd),
    [initial, monthlyPct, months, monthlyAdd]
  );
  const final = series[series.length - 1].equity;
  const invested = initial + monthlyAdd * months;
  const profit = final - invested;
  const multiple = invested > 0 ? final / invested : 0;
  const milestones = [12, 24, 36, 60].filter(m => m <= months);

  const field = (label, key, step = 'any') => (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={data[key]}
        onChange={(e) => setData(prev => ({ ...prev, [key]: e.target.value }))}
        className="font-mono bg-muted border-border"
        data-testid={`compound-${key}`}
      />
    </div>
  );

  return (
    <Card className="bg-card border-border" data-testid="compound-calculator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('cmpTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {field(t('cmpInitial'), 'initial')}
          {field(t('cmpMonthlyPct'), 'monthlyPct', '0.1')}
          {field(t('cmpMonths'), 'months', '1')}
          {field(t('cmpMonthlyAdd'), 'monthlyAdd')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs uppercase tracking-wider text-primary mb-1">{t('cmpFinal')}</p>
            <p className="font-mono text-2xl font-bold text-primary" data-testid="compound-final">{formatCurrency(final)}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('cmpProfit')}</p>
            <p className={`font-mono text-2xl font-bold ${profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('cmpMultiple')}</p>
            <p className="font-mono text-2xl font-bold">{multiple.toFixed(2)}x</p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="cmpFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
              <XAxis dataKey="m" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70}
                tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                formatter={(v) => [formatCurrency(v), t('cmpFinal')]}
                labelFormatter={(m) => `${t('cmpMonths')}: ${m}`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} fill="url(#cmpFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {milestones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {milestones.map(m => (
              <span key={m} className="px-2.5 py-1 rounded-md bg-muted/60 border border-border text-xs font-mono">
                {m}m → <span className="font-bold text-foreground">{formatCurrency(series[m].equity)}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-yellow-500" />
          {t('cmpNote')}
        </p>
      </CardContent>
    </Card>
  );
};
