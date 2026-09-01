import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp, TrendingDown, Info, Trash2 } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTranslation } from '@/lib/i18n';

const DEFAULTS = {
  dir: 'long', entry: '100', stop: '95', size: '100', mult: '1',
  t1p: '105', t1pct: '50', t2p: '110', t2pct: '25', t3p: '120', t3pct: '25',
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function PartialExitCalculator() {
  const { t } = useTranslation();
  const [data, setData, clearData] = usePersistedState('partial_exit_calculator', DEFAULTS);
  const set = (k) => (v) => setData((prev) => ({ ...prev, [k]: v }));

  const r = useMemo(() => {
    const entry = num(data.entry), stop = num(data.stop), size = num(data.size);
    // El multiplicador es el TAMAÑO DE CONTRATO, no la palanca: 5 en un MES,
    // 100 en un contrato de opciones, 100 000 en un lote de forex. Sin él, el
    // dinero de esta pantalla sólo era cierto cuando una unidad valía uno —o
    // sea, en acciones y contado— y en un MES salía dividido por cinco.
    const mult = num(data.mult) || 1;
    const riskPerUnit = Math.abs(entry - stop);
    if (!entry || !size || riskPerUnit <= 0) return { valid: false };
    const dir = data.dir === 'short' ? -1 : 1;
    const riskMoney = riskPerUnit * size * mult;
    const rOf = (price) => (dir * (price - entry)) / riskPerUnit;

    const legs = [
      { price: num(data.t1p), pct: num(data.t1pct) },
      { price: num(data.t2p), pct: num(data.t2pct) },
      { price: num(data.t3p), pct: num(data.t3pct) },
    ].filter((l) => l.price > 0 && l.pct > 0);

    let closedPct = 0, realized = 0, positionR = 0, topPrice = entry, topR = 0;
    const rows = legs.map((l) => {
      const rMult = rOf(l.price);
      const units = size * (l.pct / 100);
      const profit = dir * (l.price - entry) * units * mult;
      closedPct += l.pct;
      realized += profit;
      positionR += (l.pct / 100) * rMult;
      if (rMult > topR) { topR = rMult; topPrice = l.price; }
      return { ...l, rMult, profit };
    });

    const runnerPct = Math.max(0, 100 - closedPct);
    // If the open runner reaches the highest target too:
    const ifRunnerTopR = positionR + (runnerPct / 100) * topR;
    // Full hold: close 100% at the highest target.
    const holdAllR = topR;
    // Sin ningún tramo cerrado la R media no es cero: no existe. Un 0,00R
    // ahí dice «has salido plano» cuando lo que pasa es que no has salido.
    const weightedR = closedPct > 0 ? positionR / (closedPct / 100) : null;

    return {
      valid: true, riskPerUnit, riskMoney, rows, closedPct, runnerPct, mult,
      realized, positionR, ifRunnerTopR, holdAllR, weightedR, topPrice,
      over: closedPct > 100,
    };
  }, [data]);

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  const isLong = data.dir !== 'short';

  const Field = ({ label, k, placeholder }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" inputMode="decimal" value={data[k]} onChange={(e) => set(k)(e.target.value)}
             placeholder={placeholder} className="font-mono" />
    </div>
  );

  return (
    <Card className="bg-card border-border" data-testid="partial-exit-calculator">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
              <Scale className="w-5 h-5 text-primary" />
              {t('pxcTitle')}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed max-w-2xl">
              {t('calcDescPartialExit')}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1.5">{t('pxcSubtitle')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearData} title={t('reset') || 'Reset'}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Direction */}
        <div className="flex gap-2">
          <button
            onClick={() => set('dir')('long')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-sm font-semibold transition-colors ${
              isLong ? 'border-long/40 bg-long/10 text-long' : 'border-border text-muted-foreground'
            }`}
            data-testid="pxc-long"
          >
            <TrendingUp className="w-4 h-4" /> {t('pxcLong')}
          </button>
          <button
            onClick={() => set('dir')('short')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-sm font-semibold transition-colors ${
              !isLong ? 'border-short/40 bg-short/10 text-short' : 'border-border text-muted-foreground'
            }`}
            data-testid="pxc-short"
          >
            <TrendingDown className="w-4 h-4" /> {t('pxcShort')}
          </button>
        </div>

        {/* Trade inputs */}
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('pxcEntry')} k="entry" />
          <Field label={t('pxcStop')} k="stop" />
          <Field label={t('pxcSize')} k="size" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('pxcMultiplier')} k="mult" placeholder="1" />
          <p className="col-span-2 self-end text-[11px] text-muted-foreground leading-snug pb-1">
            {t('pxcMultiplierHint')}
          </p>
        </div>

        {/* Partial targets */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr] gap-3 items-end">
              <Field label={`${t('pxcTarget')} ${i}`} k={`t${i}p`} />
              <Field label={t('pxcClosePct')} k={`t${i}pct`} />
            </div>
          ))}
          {r.valid && r.over && (
            <p className="text-[11px] text-warn">{t('pxcPctWarn')}</p>
          )}
        </div>

        {/* Results */}
        {!r.valid ? (
          <p className="text-sm text-muted-foreground text-center py-3">{t('pxcInvalid')}</p>
        ) : (
          <div className="space-y-4" data-testid="pxc-results">
            {/* Risk */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm text-muted-foreground">{t('pxcRisk1R')}</span>
              <span className="font-mono font-semibold">
                {fmt(r.riskMoney)} <span className="text-muted-foreground font-normal">({fmt(r.riskPerUnit)} {t('pxcPerUnit')})</span>
              </span>
            </div>

            {/* Per-leg table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 font-semibold">
                <span>{t('pxcTarget')}</span><span className="text-right">%</span>
                <span className="text-right">R</span><span className="text-right">{t('pxcColProfit')}</span>
              </div>
              {r.rows.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 px-3 py-1.5 text-sm font-mono border-t border-border">
                  <span>{fmt(row.price)}</span>
                  <span className="text-right">{fmt(row.pct, 0)}%</span>
                  <span className={`text-right ${row.rMult >= 0 ? 'text-long' : 'text-short'}`}>{fmt(row.rMult)}R</span>
                  <span className={`text-right ${row.profit >= 0 ? 'text-long' : 'text-short'}`}>{fmt(row.profit)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('pxcPositionR')}</div>
                <div className="font-mono text-lg font-bold text-primary">{fmt(r.positionR)}R</div>
                <div className="text-[11px] text-muted-foreground">{t('pxcRealized')}: {fmt(r.realized)}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('pxcClosedPct')}</div>
                <div className="font-mono text-lg font-bold">{fmt(r.closedPct, 0)}%</div>
                <div className="text-[11px] text-muted-foreground">{t('pxcRunnerOpen')}: {fmt(r.runnerPct, 0)}%</div>
              </div>
            </div>

            {/* Comparison: scaled vs hold-all */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('pxcScaled')}</span>
                <span className="font-mono font-semibold">{fmt(r.positionR)}R</span>
              </div>
              {r.runnerPct > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('pxcIfRunnerTop')}</span>
                  <span className="font-mono font-semibold text-long">{fmt(r.ifRunnerTopR)}R</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('pxcHoldAll')}</span>
                <span className="font-mono font-semibold">{fmt(r.holdAllR)}R</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {t('pxcNote')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PartialExitCalculator;
