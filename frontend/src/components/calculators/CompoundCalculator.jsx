import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersistedState } from '@/hooks/usePersistedState';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Crecimiento compuesto, agnóstico del periodo:
//   equity[p] = (equity[p-1] + aportación) × (1 + pct/100)
// El periodo es el mes o el año según el modo; la matemática es la misma, sólo
// cambia qué representa cada paso. Por eso NO hay dos motores.
function buildSeries(initial, pctPerPeriod, periods, addPerPeriod) {
  const out = [{ m: 0, equity: initial }];
  let eq = initial;
  for (let m = 1; m <= periods; m++) {
    eq = (eq + addPerPeriod) * (1 + pctPerPeriod / 100);
    out.push({ m, equity: Math.round(eq * 100) / 100 });
  }
  return out;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const CompoundCalculator = () => {
  const { t } = useTranslation();
  const [data, setData] = usePersistedState('compound_calculator', {
    initial: 10000, monthlyPct: 3, months: 48, monthlyAdd: 0,
    mode: 'monthly', annualPct: 20, years: 10, annualAdd: 0,
  });

  // `usePersistedState` REEMPLAZA el estado guardado, no lo fusiona con los
  // valores por defecto: quien ya tenía guardada una simulación mensual no
  // tiene las claves nuevas. De ahí que todo se lea con respaldo y que el modo
  // caiga a 'monthly' si falta — así el guardado antiguo sigue abriéndose tal
  // y como lo dejó su dueño.
  const isAnnual = data.mode === 'annual';
  const initial = Math.max(0, parseFloat(data.initial) || 0);

  // Cada modo conserva SUS cifras. No se convierte una en otra al cambiar de
  // pestaña: la mensual es una medida real de la operativa y la anual una
  // expectativa a largo plazo; pisar una con la otra borraría un dato que el
  // usuario metió a mano.
  const pct = isAnnual
    ? clamp(parseFloat(data.annualPct) ?? 0, -99, 1000) || 0
    : clamp(parseFloat(data.monthlyPct) || 0, -50, 50);
  const periods = isAnnual
    ? clamp(parseInt(data.years, 10) || 1, 1, 100)
    : clamp(parseInt(data.months, 10) || 1, 1, 600);
  const add = Math.max(0, parseFloat(isAnnual ? data.annualAdd : data.monthlyAdd) || 0);

  const series = useMemo(
    () => buildSeries(initial, pct, periods, add),
    [initial, pct, periods, add]
  );
  const final = series[series.length - 1].equity;
  const invested = initial + add * periods;
  const profit = final - invested;
  const multiple = invested > 0 ? final / invested : 0;
  const milestones = (isAnnual ? [5, 10, 20, 30] : [12, 24, 36, 60]).filter(m => m <= periods);

  // Puente entre los dos modos. Un 8 % mensual NO es un 96 % anual: compuesto
  // son 151,8 %. Sin esta línea, quien traiga una cifra anual y la escriba en
  // el campo mensual (o al revés) se equivoca en un orden de magnitud, y la
  // proyección no da ninguna señal de que algo va mal.
  const equivalent = isAnnual
    ? (Math.pow(1 + pct / 100, 1 / 12) - 1) * 100
    : (Math.pow(1 + pct / 100, 12) - 1) * 100;
  const equivalentOk = Number.isFinite(equivalent) && (isAnnual ? pct > -100 : true);

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
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('cmpCalcTitle')}
        </CardTitle>
        {/* Mensual o anual. No es una preferencia de formato: cambia qué
            significa cada paso de la serie, así que va junto al título y no
            escondido entre los campos. */}
        <div className="flex gap-1.5" role="group" data-testid="compound-mode">
          {[['monthly', t('cmpModeMonthly')], ['annual', t('cmpModeAnnual')]].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setData(prev => ({ ...prev, mode: m }))}
              data-testid={`compound-mode-${m}`}
              aria-pressed={(data.mode === 'annual' ? 'annual' : 'monthly') === m}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                (data.mode === 'annual' ? 'annual' : 'monthly') === m
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {field(t('cmpInitial'), 'initial')}
          {isAnnual
            ? field(t('cmpAnnualPct'), 'annualPct', '0.1')
            : field(t('cmpMonthlyPct'), 'monthlyPct', '0.1')}
          {isAnnual
            ? field(t('cmpYears'), 'years', '1')
            : field(t('cmpMonths'), 'months', '1')}
          {isAnnual
            ? field(t('cmpAnnualAdd'), 'annualAdd')
            : field(t('cmpMonthlyAdd'), 'monthlyAdd')}
        </div>

        {equivalentOk && (
          <p className="-mt-3 text-[11px] text-muted-foreground font-mono tabular-nums"
             data-testid="compound-equivalent">
            {/* Por `formatNumber`, no `toFixed`: el resto de la tarjeta imprime
                402.105,73 y un «1.53» al lado delata dos formateadores
                distintos en el mismo bloque. */}
            {t(isAnnual ? 'cmpEquivMonthly' : 'cmpEquivAnnual',
               { pct: formatNumber(equivalent, equivalent >= 100 ? 0 : 2) })}
          </p>
        )}

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
                labelFormatter={(m) => `${t(isAnnual ? 'cmpYears' : 'cmpMonths')}: ${m}`}
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
                {m}{t(isAnnual ? 'cmpUnitYearShort' : 'cmpUnitMonthShort')} → <span className="font-bold text-foreground">{formatCurrency(series[m].equity)}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-yellow-500" />
          {t('cmpNote')}
        </p>
      </CardContent>
    </Card>
  );
};
