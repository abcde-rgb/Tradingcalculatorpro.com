import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Percent, TrendingUp, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import JournalEdgeButton from './JournalEdgeButton';

/**
 * Two practical capital-management calculators for the Education → Capital tab:
 *   1. Position Size Calculator — turns a fixed % risk into an exact position size
 *      from entry & stop distance (the single most important risk tool).
 *   2. Kelly Criterion Calculator — optimal fraction from win rate & payoff,
 *      with the half / quarter Kelly that professionals actually use.
 *
 * Pure client-side math, no backend. All copy via t().
 */

// `Number.isFinite`, NO el `isFinite` global: el global convierte antes de
// mirar, así que `isFinite(null)` es `true` —porque `Number(null)` es 0— y un
// «no se puede calcular» se habría pintado como un 0,00 con toda la pinta de
// resultado. Es la misma trampa que la regla de honestidad numérica persigue,
// escondida en el formateador en vez de en el cálculo.
const fmtMoney = (n, ccy = '$') => {
  if (!Number.isFinite(n)) return '—';
  return `${ccy}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};
const fmtNum = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '—');

/* Module-level field so it keeps a stable identity across renders (defining it
 * inside the calculator would remount the input on each keystroke → lost focus). */
function NumField({ id, label, value, onChange, step = 'any', suffix }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
          data-testid={`possize-${id}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

/* ----------------------------- Position Size ----------------------------- */
function PositionSizeCalculator() {
  const { t } = useTranslation();
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(95);

  const r = useMemo(() => {
    const acc = Math.max(0, Number(account) || 0);
    const rp = Math.max(0, Number(riskPct) || 0);
    const en = Number(entry) || 0;
    const sl = Number(stop) || 0;
    const riskAmount = acc * (rp / 100);
    const stopDist = Math.abs(en - sl);
    // Un cero aquí no dice «no se puede calcular», dice «sale cero»: sin
    // distancia de stop el tamaño es INDEFINIDO —dividir por cero da infinito,
    // no nada—, y sin cuenta el apalancamiento tampoco existe. `fmtNum` ya
    // pinta la raya cuando no hay número, que es lo que el usuario tiene que
    // ver en vez de un 0,00 con aspecto de resultado.
    const stopPct = en ? (stopDist / en) * 100 : null;
    const units = stopDist > 0 ? riskAmount / stopDist : null;
    const positionValue = units === null ? null : units * en;
    const impliedLeverage = acc > 0 && positionValue !== null ? positionValue / acc : null;
    return { riskAmount, stopDist, stopPct, units, positionValue, impliedLeverage };
  }, [account, riskPct, entry, stop]);

  const leverageWarn = r.impliedLeverage !== null && r.impliedLeverage > 5;

  return (
    <Card className="bg-card border-border" data-testid="cmt-position-size-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Calculator className="w-5 h-5 text-green-500" />
          {t('cmtPosSizeTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('cmtPosSizeIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumField id="account" label={t('cmtAccount')} value={account} onChange={setAccount} suffix="$" />
          <NumField id="risk" label={t('cmtRiskPct')} value={riskPct} onChange={setRiskPct} suffix="%" />
          <NumField id="entry" label={t('cmtEntry')} value={entry} onChange={setEntry} suffix="$" />
          <NumField id="stop" label={t('cmtStop')} value={stop} onChange={setStop} suffix="$" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Output label={t('cmtRiskAmount')} value={fmtMoney(r.riskAmount)} accent="text-red-500" />
          <Output label={t('cmtStopDistance')} value={`${fmtMoney(r.stopDist)} (${fmtNum(r.stopPct)}%)`} />
          <Output label={t('cmtPositionSize')} value={`${fmtNum(r.units, 4)}`} accent="text-green-500" highlight />
          <Output label={t('cmtPositionValue')} value={fmtMoney(r.positionValue)} />
        </div>

        <div className={`flex items-start gap-2 rounded-lg p-3 text-xs ${leverageWarn ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/40'}`}>
          {leverageWarn ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
          <span className="text-muted-foreground">
            {t('cmtImpliedLeverage')}: <span className="font-mono font-semibold text-foreground">{fmtNum(r.impliedLeverage)}×</span>
            {leverageWarn && <> — {t('cmtLeverageWarn')}</>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Kelly ---------------------------------- */
function KellyCalculator() {
  const { t } = useTranslation();
  const [winRate, setWinRate] = useState(50);
  const [avgWin, setAvgWin] = useState(2);
  const [avgLoss, setAvgLoss] = useState(1);

  const r = useMemo(() => {
    const w = Math.min(1, Math.max(0, (Number(winRate) || 0) / 100));
    const win = Math.max(0.0001, Number(avgWin) || 0);
    const loss = Math.max(0.0001, Number(avgLoss) || 0);
    const payoff = win / loss;                     // R multiple
    const kelly = w - (1 - w) / payoff;            // fraction of capital
    const expectancyR = w * payoff - (1 - w);      // expectancy in R units
    return {
      payoff,
      kelly,
      half: kelly / 2,
      quarter: kelly / 4,
      expectancyR,
      hasEdge: kelly > 0,
    };
  }, [winRate, avgWin, avgLoss]);

  const pct = (f) => `${(f * 100).toFixed(1)}%`;

  // Fill win rate & avg win/loss from the user's real journal (Kelly only uses
  // the win/loss ratio, so dollar averages give the correct payoff).
  const applyJournal = useCallback((a) => {
    if (a.win_rate != null) setWinRate(Math.round(a.win_rate * 10) / 10);
    if (a.avg_win) setAvgWin(Math.round(Math.abs(a.avg_win) * 100) / 100);
    if (a.avg_loss) setAvgLoss(Math.round(Math.abs(a.avg_loss) * 100) / 100);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border-blue-500/30" data-testid="kelly-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Percent className="w-5 h-5 text-blue-500" />
          {t('cmtKellyTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('cmtKellyIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="kelly-wr" className="text-xs text-muted-foreground">{t('cmtWinRate')}</Label>
            <Input id="kelly-wr" type="number" inputMode="decimal" value={winRate} onChange={(e) => setWinRate(e.target.value)} className="font-mono" data-testid="kelly-winrate" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kelly-aw" className="text-xs text-muted-foreground">{t('cmtAvgWin')}</Label>
            <Input id="kelly-aw" type="number" inputMode="decimal" value={avgWin} onChange={(e) => setAvgWin(e.target.value)} className="font-mono" data-testid="kelly-avgwin" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kelly-al" className="text-xs text-muted-foreground">{t('cmtAvgLoss')}</Label>
            <Input id="kelly-al" type="number" inputMode="decimal" value={avgLoss} onChange={(e) => setAvgLoss(e.target.value)} className="font-mono" data-testid="kelly-avgloss" />
          </div>
        </div>

        <JournalEdgeButton onLoad={applyJournal} testId="kelly-journal" />

        {r.hasEdge ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Output label={t('cmtFullKelly')} value={pct(r.kelly)} sub={t('cmtFullKellySub')} accent="text-red-500" />
              <Output label={t('cmtHalfKelly')} value={pct(r.half)} sub={t('cmtHalfKellySub')} accent="text-amber-500" />
              <Output label={t('cmtQuarterKelly')} value={pct(r.quarter)} sub={t('cmtQuarterKellySub')} accent="text-green-500" highlight />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">{t('cmtPayoff')}: <span className="font-mono font-semibold text-foreground">{fmtNum(r.payoff)}R</span></span>
              <span className="text-muted-foreground">{t('cmtExpectancy')}: <span className={`font-mono font-semibold ${r.expectancyR >= 0 ? 'text-green-500' : 'text-red-500'}`}>{r.expectancyR >= 0 ? '+' : ''}{fmtNum(r.expectancyR)}R</span></span>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{t('cmtNoEdge')}</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <span>{t('cmtKellyTip')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Output({ label, value, sub, accent = 'text-foreground', highlight = false }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/40'}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono font-bold text-sm ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const CapitalManagementTools = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <PositionSizeCalculator />
    <KellyCalculator />
  </div>
);

export default CapitalManagementTools;
