import React, { useState, useMemo, useCallback } from 'react';
import { Skull, Flame, TrendingDown, AlertTriangle, Info, Plus, Minus, ShieldCheck, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import JournalEdgeButton from './JournalEdgeButton';

/**
 * Advanced capital-management analytics for the Education → Capital tab:
 *   1. Risk of Ruin       — Monte Carlo probability of blowing a drawdown threshold.
 *   2. Portfolio Heat     — total open risk across positions + correlation caveat.
 *   3. Losing-streak odds — probability of a run of N consecutive losers (exact DP).
 *
 * Pure client-side math, no backend. All copy via t().
 */

const fmtPct = (n, d = 1) => (isFinite(n) ? `${n.toFixed(d)}%` : '—');

/* Compact money: $1.2k / $50k / $1.3M — keeps stress-test tables readable. */
const fmtMoneyShort = (n) => {
  if (!isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}k`;
  return `${sign}$${a.toFixed(0)}`;
};

/* Module-level field keeps a stable identity across renders (defining it inside a
 * calculator would remount the input on each keystroke → lost focus). */
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
          data-testid={`risk-${id}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Output({ label, value, sub, accent = 'text-foreground', highlight = false }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-red-500/10 border border-red-500/30' : 'bg-muted/40'}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono font-bold text-sm ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ---------------------------- Risk of Ruin ------------------------------- */
/* Monte Carlo with fixed-fractional sizing. Each trade risks `riskPct` of the
 * CURRENT equity; a win returns risk × payoff, a loss returns −risk. "Ruin" =
 * equity drops to (1 − drawdown) of the starting balance at any point. */
function simulateRuin({ p, riskPct, payoff, drawdown, trades = 500, sims = 5000 }) {
  const f = riskPct / 100;
  const floor = 1 - drawdown / 100; // equity level (relative to start) that counts as ruin
  let ruined = 0;
  for (let s = 0; s < sims; s++) {
    let eq = 1;
    for (let i = 0; i < trades; i++) {
      const risk = eq * f;
      eq += Math.random() < p ? risk * payoff : -risk;
      if (eq <= floor) { ruined++; break; }
    }
  }
  return (ruined / sims) * 100;
}

function RiskOfRuinCalculator() {
  const { t } = useTranslation();
  const [winRate, setWinRate] = useState(45);
  const [riskPct, setRiskPct] = useState(2);
  const [payoff, setPayoff] = useState(2);
  const [drawdown, setDrawdown] = useState(50);
  const [result, setResult] = useState(null);

  const p = Math.min(1, Math.max(0, (Number(winRate) || 0) / 100));
  const b = Math.max(0.01, Number(payoff) || 0);
  const expectancyR = p * b - (1 - p);

  const run = () => {
    const ror = simulateRuin({
      p,
      riskPct: Math.max(0.01, Number(riskPct) || 0),
      payoff: b,
      drawdown: Math.min(99, Math.max(1, Number(drawdown) || 0)),
    });
    setResult(ror);
  };

  // Pull real win rate & R:R from the user's journal so the simulation runs on
  // their actual edge instead of typed guesses.
  const applyJournal = useCallback((a) => {
    if (a.win_rate != null) setWinRate(Math.round(a.win_rate * 10) / 10);
    const po = a.avg_loss ? Math.abs(a.avg_win / a.avg_loss) : null;
    if (po && isFinite(po) && po > 0) setPayoff(Math.round(po * 100) / 100);
  }, []);

  const rorAccent = result == null ? 'text-foreground' : result < 1 ? 'text-green-500' : result < 10 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="bg-gradient-to-br from-red-500/5 to-rose-500/10 border-red-500/30" data-testid="risk-of-ruin-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Skull className="w-5 h-5 text-red-500" />
          {t('rorTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('rorIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumField id="ror-wr" label={t('rorWinRate')} value={winRate} onChange={setWinRate} suffix="%" />
          <NumField id="ror-risk" label={t('rorRiskPct')} value={riskPct} onChange={setRiskPct} suffix="%" />
          <NumField id="ror-payoff" label={t('rorPayoff')} value={payoff} onChange={setPayoff} suffix="R" />
          <NumField id="ror-dd" label={t('rorDrawdown')} value={drawdown} onChange={setDrawdown} suffix="%" />
        </div>

        <JournalEdgeButton onLoad={applyJournal} testId="ror-journal" />

        <div className="flex items-center gap-3">
          <Button onClick={run} size="sm" className="bg-red-500 hover:bg-red-600 text-white" data-testid="ror-run">
            {t('rorRun')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('cmtExpectancy')}: <span className={`font-mono font-semibold ${expectancyR >= 0 ? 'text-green-500' : 'text-red-500'}`}>{expectancyR >= 0 ? '+' : ''}{expectancyR.toFixed(2)}R</span>
          </span>
        </div>

        {result != null && (
          <div className="grid grid-cols-1 gap-3">
            <Output label={t('rorResultLabel')} value={fmtPct(result)} sub={t('rorResultSub')} accent={rorAccent} highlight />
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{t('rorNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Portfolio Heat ---------------------------- */
function PortfolioHeatCalculator() {
  const { t } = useTranslation();
  const [risks, setRisks] = useState([1, 1, 1]);
  const [corr, setCorr] = useState(60);

  const total = useMemo(() => risks.reduce((a, v) => a + (Number(v) || 0), 0), [risks]);
  /* Correlation-adjusted combined risk: sqrt(Σri² + 2ρ·Σ_{i<j} ri·rj).
   * ρ=1 collapses to the plain sum; ρ=0 to full diversification (√Σri²). */
  const effective = useMemo(() => {
    const r = risks.map((v) => Math.max(0, Number(v) || 0));
    const rho = Math.min(1, Math.max(0, (Number(corr) || 0) / 100));
    let sumSq = 0, cross = 0;
    for (let i = 0; i < r.length; i++) {
      sumSq += r[i] * r[i];
      for (let j = i + 1; j < r.length; j++) cross += r[i] * r[j];
    }
    return Math.sqrt(sumSq + 2 * rho * cross);
  }, [risks, corr]);
  const level = total <= 4 ? 'ok' : total <= 6 ? 'warn' : 'danger';
  const heatColor = level === 'ok' ? 'text-green-500' : level === 'warn' ? 'text-amber-500' : 'text-red-500';
  const barColor = level === 'ok' ? '#22c55e' : level === 'warn' ? '#f59e0b' : '#ef4444';

  const setRisk = (i, v) => setRisks((r) => r.map((x, idx) => (idx === i ? v : x)));
  const addRow = () => setRisks((r) => (r.length < 10 ? [...r, 1] : r));
  const removeRow = (i) => setRisks((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  return (
    <Card className="bg-gradient-to-br from-orange-500/5 to-amber-500/10 border-orange-500/30" data-testid="portfolio-heat-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Flame className="w-5 h-5 text-orange-500" />
          {t('heatTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('heatIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {risks.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{t('heatPosition')} {i + 1}</span>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={v}
                  onChange={(e) => setRisk(i, e.target.value)}
                  className="font-mono h-9"
                  data-testid={`heat-pos-${i}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-red-500 p-1" aria-label="remove">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 mt-1">
            <Plus className="w-3.5 h-3.5" /> {t('heatAddPosition')}
          </button>
        </div>

        {/* Heat bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{t('heatTotal')}</span>
            <span className={`font-mono font-bold text-lg ${heatColor}`}>{fmtPct(total)}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, total * 8)}%`, background: barColor }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>0%</span><span className="text-green-500">4%</span><span className="text-amber-500">6%</span><span>12%+</span>
          </div>
        </div>

        <div className={`flex items-start gap-2 rounded-lg p-3 text-xs ${level === 'danger' ? 'bg-red-500/10 border border-red-500/30' : level === 'warn' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
          {level === 'danger' ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${heatColor}`} />}
          <span className="text-muted-foreground">{t(level === 'danger' ? 'heatDanger' : level === 'warn' ? 'heatWarn' : 'heatOk')}</span>
        </div>

        {/* Correlation-adjusted effective risk */}
        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="heat-corr" className="text-xs text-muted-foreground">{t('heatCorrLabel')}</Label>
            <span className="font-mono text-xs font-semibold">{Math.round(Number(corr) || 0)}%</span>
          </div>
          <input
            id="heat-corr"
            type="range"
            min="0"
            max="100"
            step="5"
            value={corr}
            onChange={(e) => setCorr(e.target.value)}
            className="w-full accent-orange-500"
            data-testid="heat-corr"
          />
          <Output
            label={t('heatEffective')}
            value={fmtPct(effective)}
            sub={t('heatEffectiveSub')}
            accent={effective <= 4 ? 'text-green-500' : effective <= 6 ? 'text-amber-500' : 'text-red-500'}
          />
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
          <span>{t('heatCorrelationNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- Losing-streak odds -------------------------- */
/* Exact probability of seeing a run of >= L consecutive losses within N trades,
 * via a DP over the current trailing-loss-streak length. */
function pRunOfLosses(N, q, L) {
  if (L <= 0) return 1;
  if (L > N) {
    // can still be impossible only if L>N; quick exact via same DP works, but short-circuit:
  }
  // states 0..L-1 = no run yet, trailing streak = state; absorbing "hasRun".
  let states = new Array(L).fill(0);
  states[0] = 1; // before any trade, streak = 0, prob 1
  let hasRun = 0;
  const p = 1 - q;
  for (let i = 0; i < N; i++) {
    const next = new Array(L).fill(0);
    for (let j = 0; j < L; j++) {
      const pr = states[j];
      if (pr === 0) continue;
      next[0] += pr * p;            // win → streak resets
      const nj = j + 1;             // loss → streak grows
      if (nj >= L) hasRun += pr * q;
      else next[nj] += pr * q;
    }
    states = next;
  }
  return hasRun;
}

function LosingStreakCalculator() {
  const { t } = useTranslation();
  const [winRate, setWinRate] = useState(50);
  const [trades, setTrades] = useState(100);

  const rows = useMemo(() => {
    const p = Math.min(0.999, Math.max(0.001, (Number(winRate) || 0) / 100));
    const q = 1 - p;
    const N = Math.min(5000, Math.max(1, Math.round(Number(trades) || 0)));
    return [3, 4, 5, 6, 7, 8, 10].map((L) => ({ L, prob: pRunOfLosses(N, q, L) * 100 }));
  }, [winRate, trades]);

  // expected longest losing run ≈ log_(1/q)(N·p)
  const expLongest = useMemo(() => {
    const p = Math.min(0.999, Math.max(0.001, (Number(winRate) || 0) / 100));
    const q = 1 - p;
    const N = Math.max(1, Math.round(Number(trades) || 0));
    const val = Math.log(N * p) / Math.log(1 / q);
    return Math.max(1, Math.round(val));
  }, [winRate, trades]);

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 to-fuchsia-500/10 border-purple-500/30" data-testid="losing-streak-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <TrendingDown className="w-5 h-5 text-purple-500" />
          {t('streakTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('streakIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumField id="streak-wr" label={t('cmtWinRate')} value={winRate} onChange={setWinRate} suffix="%" />
          <NumField id="streak-n" label={t('streakTrades')} value={trades} onChange={setTrades} step="1" />
        </div>

        <Output label={t('streakExpLongest')} value={`${expLongest} ${t('streakLosses')}`} sub={t('streakExpLongestSub')} accent="text-purple-500" highlight />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('streakTableTitle')}</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('streakColLength')}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('streakColProb')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.L} className="border-t border-border/40">
                    <td className="px-3 py-1.5 font-mono">{r.L}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${r.prob > 50 ? 'text-red-500' : r.prob > 20 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {fmtPct(r.prob)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <span>{t('streakNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------ Drawdown → recovery math ----------------------- */
/* required gain = dd/(1-dd); expected trades via compounding:
 * ln(1/(1-dd)) / ln(1 + f·E) with f = risk fraction and E = expectancy in R. */
function DrawdownRecoveryCalculator() {
  const { t } = useTranslation();
  const [drawdown, setDrawdown] = useState(30);
  const [riskPct, setRiskPct] = useState(1);
  const [expectancy, setExpectancy] = useState(0.3);

  const dd = Math.min(0.99, Math.max(0.001, (Number(drawdown) || 0) / 100));
  const required = (dd / (1 - dd)) * 100;

  const trades = useMemo(() => {
    const f = Math.max(0, (Number(riskPct) || 0) / 100);
    const e = Number(expectancy) || 0;
    const gainPerTrade = f * e;
    if (gainPerTrade <= 0) return null; // no edge → never recovers
    return Math.ceil(Math.log(1 / (1 - dd)) / Math.log(1 + gainPerTrade));
  }, [dd, riskPct, expectancy]);

  const tableRows = [10, 20, 30, 40, 50, 70, 90].map((d) => ({ d, req: (d / (100 - d)) * 100 }));
  const reqAccent = required <= 25 ? 'text-green-500' : required <= 100 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="bg-gradient-to-br from-sky-500/5 to-blue-500/10 border-sky-500/30" data-testid="drawdown-recovery-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <TrendingDown className="w-5 h-5 text-sky-500" />
          {t('ddrTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('ddrIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <NumField id="ddr-dd" label={t('ddrDrawdown')} value={drawdown} onChange={setDrawdown} suffix="%" />
          <NumField id="ddr-risk" label={t('rorRiskPct')} value={riskPct} onChange={setRiskPct} suffix="%" />
          <NumField id="ddr-exp" label={t('ddrExpectancy')} value={expectancy} onChange={setExpectancy} suffix="R" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Output label={t('ddrRequired')} value={`+${fmtPct(required)}`} sub={t('ddrRequiredSub')} accent={reqAccent} highlight />
          <Output
            label={t('ddrTrades')}
            value={trades == null ? '∞' : trades}
            sub={t('ddrTradesSub')}
            accent={trades == null ? 'text-red-500' : 'text-sky-500'}
            highlight={trades == null}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('ddrTableTitle')}</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('ddrColDd')}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('ddrColReq')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.d} className={`border-t border-border/40 ${Math.abs(r.d - Number(drawdown)) < 5 ? 'bg-sky-500/10' : ''}`}>
                    <td className="px-3 py-1.5 font-mono">-{r.d}%</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${r.req > 100 ? 'text-red-500' : r.req > 40 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      +{fmtPct(r.req, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <span>{t('ddrNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------- Margin stress test (leverage) ------------------- */
/* For a book of leveraged positions, apply market-move scenarios and flag when
 * the account breaches maintenance margin (call) or goes to zero (liquidated).
 * Model: P&L = Σ notionalᵢ · dirᵢ · move ; equity_after = balance + P&L ;
 * maintenance requirement = Σ notionalᵢ · mmr. Liquidation move for the net-
 * directional book solves balance + move·net = maintReq. Simplified vs a real
 * broker (which nets by product and varies mmr), but pedagogically exact. */
function MarginStressTest() {
  const { t } = useTranslation();
  const [account, setAccount] = useState(10000);
  const [mmr, setMmr] = useState(0.5); // maintenance margin rate, %
  const [positions, setPositions] = useState([{ notional: 50000, dir: 'long' }]);
  const [customMove, setCustomMove] = useState(-10);

  const setPos = (i, patch) => setPositions((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPos = () => setPositions((ps) => (ps.length < 8 ? [...ps, { notional: 10000, dir: 'long' }] : ps));
  const removePos = (i) => setPositions((ps) => (ps.length > 1 ? ps.filter((_, idx) => idx !== i) : ps));

  const calc = useMemo(() => {
    const E = Math.max(0, Number(account) || 0);
    const m = Math.max(0, (Number(mmr) || 0) / 100);
    let gross = 0, net = 0;
    positions.forEach((p) => {
      const n = Math.max(0, Number(p.notional) || 0);
      const s = p.dir === 'short' ? -1 : 1;
      gross += n;
      net += n * s;
    });
    const maintReq = gross * m;
    const grossLev = E > 0 ? gross / E : 0;
    // Adverse move (fraction) that drops equity to the maintenance requirement.
    const liqMove = net !== 0 ? (maintReq - E) / net : null;
    const row = (movePct) => {
      const move = movePct / 100;
      const pnl = net * move;
      const eq = E + pnl;
      const status = eq <= 0 ? 'liq' : eq <= maintReq ? 'call' : 'ok';
      return { movePct, pnl, eq, status };
    };
    return {
      E, gross, net, maintReq, grossLev, liqMove,
      scenarios: [-5, -10, -15, -20, -30].map(row),
      custom: row(Number(customMove) || 0),
    };
  }, [account, mmr, positions, customMove]);

  const STATUS = {
    ok: { txt: t('mstOk'), cls: 'text-green-500' },
    call: { txt: t('mstCall'), cls: 'text-amber-500' },
    liq: { txt: t('mstLiq'), cls: 'text-red-500' },
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/5 to-red-500/10 border-amber-500/30" data-testid="margin-stress-test">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <Gauge className="w-5 h-5 text-amber-500" />
          {t('mstTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('mstIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumField id="mst-account" label={t('mstAccount')} value={account} onChange={setAccount} suffix="$" />
          <NumField id="mst-mmr" label={t('mstMaintRate')} value={mmr} onChange={setMmr} suffix="%" />
        </div>

        {/* Positions */}
        <div className="space-y-2">
          {positions.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{t('mstPosition')} {i + 1}</span>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={p.notional}
                  onChange={(e) => setPos(i, { notional: e.target.value })}
                  className="font-mono h-9"
                  data-testid={`mst-notional-${i}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              </div>
              <div className="flex rounded-md overflow-hidden border border-border shrink-0">
                {['long', 'short'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPos(i, { dir: d })}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      p.dir === d
                        ? d === 'long' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`mst-dir-${i}-${d}`}
                  >
                    {t(d === 'long' ? 'mstLong' : 'mstShort')}
                  </button>
                ))}
              </div>
              <button onClick={() => removePos(i)} className="text-muted-foreground hover:text-red-500 p-1 shrink-0" aria-label="remove">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={addPos} className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 mt-1">
            <Plus className="w-3.5 h-3.5" /> {t('mstAddPosition')}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Output label={t('mstGross')} value={fmtMoneyShort(calc.gross)} />
          <Output label={t('mstNet')} value={fmtMoneyShort(calc.net)} />
          <Output label={t('mstLeverage')} value={`${calc.grossLev.toFixed(1)}x`} accent={calc.grossLev > 5 ? 'text-red-500' : calc.grossLev > 2 ? 'text-amber-500' : 'text-foreground'} />
        </div>

        {/* Liquidation headline */}
        {calc.liqMove == null ? (
          <div className="rounded-lg p-3 bg-muted/40 text-xs text-muted-foreground">{t('mstNeutral')}</div>
        ) : (
          <Output
            label={t('mstLiqLabel')}
            value={`${(calc.liqMove * 100).toFixed(1)}%`}
            sub={t('mstLiqSub')}
            accent={Math.abs(calc.liqMove) < 0.1 ? 'text-red-500' : Math.abs(calc.liqMove) < 0.2 ? 'text-amber-500' : 'text-green-500'}
            highlight
          />
        )}

        {/* Scenario table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('mstScenariosTitle')}</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('mstColMove')}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('mstColPnl')}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('mstColEquity')}</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('mstColStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {calc.scenarios.map((r) => (
                  <tr key={r.movePct} className="border-t border-border/40">
                    <td className="px-3 py-1.5 font-mono">{r.movePct}%</td>
                    <td className={`px-3 py-1.5 text-right font-mono ${r.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {r.pnl >= 0 ? '+' : ''}{fmtMoneyShort(r.pnl)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtMoneyShort(r.eq)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].txt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom scenario */}
        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mst-custom" className="text-xs text-muted-foreground">{t('mstCustom')}</Label>
            <span className={`font-mono text-xs font-semibold ${calc.custom.status === 'liq' ? 'text-red-500' : calc.custom.status === 'call' ? 'text-amber-500' : 'text-green-500'}`}>
              {Number(customMove) || 0}% → {STATUS[calc.custom.status].txt}
            </span>
          </div>
          <input
            id="mst-custom"
            type="range"
            min="-40"
            max="40"
            step="1"
            value={customMove}
            onChange={(e) => setCustomMove(e.target.value)}
            className="w-full accent-amber-500"
            data-testid="mst-custom"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{t('mstColPnl')}: <span className={`font-mono ${calc.custom.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{calc.custom.pnl >= 0 ? '+' : ''}{fmtMoneyShort(calc.custom.pnl)}</span></span>
            <span>{t('mstColEquity')}: <span className="font-mono">{fmtMoneyShort(calc.custom.eq)}</span></span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{t('mstNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const RiskAnalysisTools = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RiskOfRuinCalculator />
      <PortfolioHeatCalculator />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LosingStreakCalculator />
      <DrawdownRecoveryCalculator />
    </div>
    <MarginStressTest />
  </div>
);

export default RiskAnalysisTools;
