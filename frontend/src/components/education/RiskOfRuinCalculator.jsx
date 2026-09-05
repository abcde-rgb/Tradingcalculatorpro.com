import React, { useMemo, useState } from 'react';
import { Dices, TrendingDown, Activity, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

const SIMULATIONS = 2000;

/**
 * Monte Carlo risk-of-ruin: simulate equity paths compounding a fixed % risk
 * per trade. Returns probabilities of hitting drawdown thresholds within the
 * horizon, distribution of final equity and of the worst losing streak.
 */
function simulate(winRate, rRatio, riskPct, horizon) {
  const p = winRate / 100;
  const risk = riskPct / 100;
  let hit25 = 0;
  let hit50 = 0;
  const finals = new Array(SIMULATIONS);
  const streaks = new Array(SIMULATIONS);

  for (let s = 0; s < SIMULATIONS; s++) {
    let equity = 1;
    let peak = 1;
    let dd25 = false;
    let dd50 = false;
    let streak = 0;
    let maxStreak = 0;
    for (let i = 0; i < horizon; i++) {
      if (Math.random() < p) {
        equity *= 1 + risk * rRatio;
        streak = 0;
      } else {
        equity *= 1 - risk;
        streak += 1;
        if (streak > maxStreak) maxStreak = streak;
      }
      if (equity > peak) peak = equity;
      const dd = 1 - equity / peak;
      if (dd >= 0.25) dd25 = true;
      if (dd >= 0.5) { dd50 = true; break; } // ruined — stop this path
    }
    if (dd25) hit25 += 1;
    if (dd50) hit50 += 1;
    finals[s] = equity;
    streaks[s] = maxStreak;
  }

  finals.sort((a, b) => a - b);
  streaks.sort((a, b) => a - b);
  const q = (arr, k) => arr[Math.min(arr.length - 1, Math.floor(arr.length * k))];
  return {
    probDD25: (hit25 / SIMULATIONS) * 100,
    probDD50: (hit50 / SIMULATIONS) * 100,
    medianFinal: q(finals, 0.5),
    p10Final: q(finals, 0.1),
    p90Final: q(finals, 0.9),
    medianStreak: q(streaks, 0.5),
    p90Streak: q(streaks, 0.9),
  };
}

const RECOVERY_ROWS = [
  { loss: 10, gain: 11.1 },
  { loss: 20, gain: 25 },
  { loss: 30, gain: 42.9 },
  { loss: 50, gain: 100 },
  { loss: 70, gain: 233 },
  { loss: 90, gain: 900 },
];

const pctColor = (v) => (v >= 50 ? 'text-short' : v >= 15 ? 'text-warn' : 'text-long');

const SliderRow = ({ label, value, setValue, min, max, step, unit, testId }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <span className="text-sm font-mono font-bold text-foreground">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => setValue(Number(e.target.value))}
      className="w-full accent-long"
      data-testid={testId}
    />
  </div>
);

const RiskOfRuinCalculator = () => {
  const { t } = useTranslation();
  const [winRate, setWinRate] = useState(50);
  const [rRatio, setRRatio] = useState(1.5);
  const [riskPct, setRiskPct] = useState(2);
  const [horizon, setHorizon] = useState(200);

  const res = useMemo(
    () => simulate(winRate, rRatio, riskPct, horizon),
    [winRate, rRatio, riskPct, horizon]
  );
  const expectancy = (winRate / 100) * rRatio - (1 - winRate / 100);

  const verdict = expectancy <= 0
    ? { key: 'rorVerdictNegative', Icon: AlertCircle, cls: 'border-short/40 bg-short/10 text-short' }
    : res.probDD50 >= 15
      ? { key: 'rorVerdictHigh', Icon: AlertTriangle, cls: 'border-warn/40 bg-warn/10 text-warn' }
      : { key: 'rorVerdictOk', Icon: CheckCircle2, cls: 'border-long/40 bg-long/10 text-long' };
  const VIcon = verdict.Icon;
  const fmtX = (v) => `${v >= 10 ? v.toFixed(0) : v.toFixed(2)}x`;

  return (
    <Card className="bg-gradient-to-br from-short/5 to-primary/5 border-border" data-testid="ror-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Dices className="w-5 h-5 text-primary" />
          {t('rorTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('rorIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <SliderRow label={t('rorWinRate')} value={winRate} setValue={setWinRate} min={20} max={80} step={1} unit="%" testId="ror-winrate" />
          <SliderRow label={t('rorRRatio')} value={rRatio} setValue={setRRatio} min={0.5} max={5} step={0.1} unit="R" testId="ror-rratio" />
          <SliderRow label={t('rorRiskPerTrade')} value={riskPct} setValue={setRiskPct} min={0.25} max={10} step={0.25} unit="%" testId="ror-risk" />
          <SliderRow label={t('rorHorizon')} value={horizon} setValue={setHorizon} min={50} max={1000} step={50} unit="" testId="ror-horizon" />
        </div>

        {/* Verdict */}
        <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${verdict.cls}`} data-testid="ror-verdict">
          <VIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">{t(verdict.key)}</p>
        </div>

        {/* Result tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t('rorProbDD25')}</p>
            <p className={`text-xl font-bold font-mono ${pctColor(res.probDD25)}`} data-testid="ror-dd25">{res.probDD25.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t('rorProbDD50')}</p>
            <p className={`text-xl font-bold font-mono ${pctColor(res.probDD50)}`} data-testid="ror-dd50">{res.probDD50.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t('rorMedianEquity')}</p>
            <p className="text-xl font-bold font-mono text-foreground">{fmtX(res.medianFinal)}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">p10 {fmtX(res.p10Final)} · p90 {fmtX(res.p90Final)}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t('rorMaxStreak')}</p>
            <p className="text-xl font-bold font-mono text-foreground">{res.medianStreak}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{t('rorStreakP90')}: {res.p90Streak}</p>
          </div>
        </div>

        {/* Expectancy line */}
        <p className="text-xs text-muted-foreground font-mono">
          {t('rorExpectancy')}: <span className={expectancy > 0 ? 'text-long font-bold' : 'text-short font-bold'}>
            {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R
          </span>
          <span className="opacity-60"> · {t('rorSimBasis').replace('{n}', String(SIMULATIONS))}</span>
        </p>

        {/* Recovery math table */}
        <div>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-short" /> {t('rorRecoveryTitle')}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RECOVERY_ROWS.map(r => (
              <div key={r.loss} className="rounded-lg bg-card border border-border p-2 text-center">
                <p className="text-sm font-mono font-bold text-short">−{r.loss}%</p>
                <Activity className="w-3 h-3 text-muted-foreground mx-auto my-1 rotate-90" />
                <p className="text-sm font-mono font-bold text-long">+{r.gain}%</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">{t('rorNote')}</p>
      </CardContent>
    </Card>
  );
};

export default RiskOfRuinCalculator;
