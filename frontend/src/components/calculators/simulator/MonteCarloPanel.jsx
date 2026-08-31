import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dices, AlertTriangle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';
import { runMonteCarlo, DEFAULT_MC_ITERATIONS } from './simulatorEngine';

const fmt = (n, d = 0) => Number(n).toLocaleString(undefined, {
  minimumFractionDigits: d, maximumFractionDigits: d,
});

/**
 * Monte Carlo distribution panel.
 *
 * The single-path result above this panel is one sample: press recalculate and
 * the ROI, drawdown and profit factor all change. This is the part that turns
 * that into information — run the same system thousands of times and look at
 * the SPREAD, not at one lucky or unlucky run.
 */
export default function MonteCarloPanel({ config, onResult }) {
  const { t } = useTranslation();
  const [mc, setMc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [iterations, setIterations] = useState(DEFAULT_MC_ITERATIONS);
  const [ddLimit, setDdLimit] = useState(10);

  const run = () => {
    setBusy(true);
    // Yield a frame so the spinner paints before the (synchronous) run.
    setTimeout(() => {
      try {
        const result = runMonteCarlo(config, {
          iterations: Number(iterations) || DEFAULT_MC_ITERATIONS,
          maxDrawdownLimit: Number(ddLimit) || 10,
        });
        setMc(result);
        // Hand the sweep up so the headline above can switch from an arbitrary
        // extra draw to the median trajectory of THIS distribution.
        if (onResult) onResult(result);
      } finally {
        setBusy(false);
      }
    }, 20);
  };

  const Stat = ({ label, value, tone = '' }) => (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );

  return (
    <Card className="bg-card border-border" data-testid="monte-carlo-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Dices className="w-4 h-4 text-compare" />
          </div>
          {t('mcsimTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{t('mcsimIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            {t('mcsimIterations')}
            <Input type="number" min="100" max="50000" step="1000" className="w-28"
              value={iterations} onChange={(e) => setIterations(e.target.value)}
              data-testid="mc-iterations" />
          </label>
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            {t('mcsimDdLimit')}
            <Input type="number" min="1" max="100" step="1" className="w-20"
              value={ddLimit} onChange={(e) => setDdLimit(e.target.value)} />
          </label>
          <Button onClick={run} disabled={busy} data-testid="mc-run">
            {busy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {t('mcsimRunning')}</> : t('mcsimRun')}
          </Button>
        </div>

        {mc && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="mc-results">
              <Stat label={t('mcsimP5')} value={fmt(mc.finalBalance.p5)} tone="text-short" />
              <Stat label={t('mcsimP50')} value={fmt(mc.finalBalance.p50)} />
              <Stat label={t('mcsimP95')} value={fmt(mc.finalBalance.p95)} tone="text-long" />
              <Stat label={t('mcsimProbProfit')} value={`${fmt(mc.probabilityOfProfit, 1)}%`} />
              <Stat label={t('mcsimRoiP5')} value={`${fmt(mc.roi.p5, 1)}%`} tone="text-short" />
              <Stat label={t('mcsimRoiP50')} value={`${fmt(mc.roi.p50, 1)}%`} />
              <Stat label={t('mcsimDdP50')} value={`${fmt(mc.maxDrawdown.p50, 1)}%`} />
              <Stat label={t('mcsimDdP95')} value={`${fmt(mc.maxDrawdown.p95, 1)}%`} tone="text-short" />
            </div>

            {/* The two numbers that actually decide whether the system is
                survivable, kept visually apart from the rosy percentiles. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`rounded-lg border p-4 ${mc.probabilityOfRuin > 1
                ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-card'}`}>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  {mc.probabilityOfRuin > 1 && <AlertTriangle className="w-3.5 h-3.5 text-short" />}
                  {t('mcsimRuin', { pct: mc.ruinThresholdPct })}
                </p>
                <p className="text-2xl font-bold">{fmt(mc.probabilityOfRuin, 2)}%</p>
              </div>
              <div className={`rounded-lg border p-4 ${mc.probabilityOfDrawdownBreach > 20
                ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-card'}`}>
                <p className="text-xs text-muted-foreground mb-1">
                  {t('mcsimBreach', { pct: mc.maxDrawdownLimit })}
                </p>
                <p className="text-2xl font-bold">{fmt(mc.probabilityOfDrawdownBreach, 1)}%</p>
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mc.histogram.map((b) => ({
                  bucket: Math.round((b.from + b.to) / 2), count: b.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}`, t('mcsimPaths')]}
                    labelFormatter={(v) => `${t('mcsimFinalBalance')}: ${fmt(v)}`} />
                  <ReferenceLine x={mc.initialBalance} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-muted-foreground">
              {t('mcsimFootnote', { n: mc.iterations })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
