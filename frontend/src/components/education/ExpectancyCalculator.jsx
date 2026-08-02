import React, { useState, useCallback } from 'react';
import { Calculator, Sparkles, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, MinusCircle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const verdictMeta = (ev) => {
  if (ev > 0.05) {
    return {
      key: 'expectancyCalcVerdictPositive',
      Icon: CheckCircle2,
      color: 'text-[#22c55e]',
      bg: 'bg-[#22c55e]/10',
      border: 'border-[#22c55e]/40',
    };
  }
  if (ev < -0.05) {
    return {
      key: 'expectancyCalcVerdictNegative',
      Icon: AlertCircle,
      color: 'text-[#ef4444]',
      bg: 'bg-[#ef4444]/10',
      border: 'border-[#ef4444]/40',
    };
  }
  return {
    key: 'expectancyCalcVerdictNeutral',
    Icon: MinusCircle,
    color: 'text-[#eab308]',
    bg: 'bg-[#eab308]/10',
    border: 'border-[#eab308]/40',
  };
};

const fmtR = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;

const ExpectancyCalculator = () => {
  const { t } = useTranslation();
  const { token } = useAuthStore();

  const [winRate, setWinRate] = useState(50);  // %
  const [rRatio, setRRatio] = useState(1.5);   // R
  const [loading, setLoading] = useState(false);

  const lossRate = 100 - winRate;
  const ev = (winRate / 100) * rRatio - (lossRate / 100) * 1;
  const verdict = verdictMeta(ev);
  const VerdictIcon = verdict.Icon;

  const projections = [
    { trades: 100,   label: '100' },
    { trades: 500,   label: '500' },
    { trades: 1000,  label: '1.000' },
  ].map((p) => ({ ...p, total: ev * p.trades }));

  const loadFromJournal = useCallback(async () => {
    if (!token) {
      toast.error(t('expectancyCalcNoJournal'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/journal/stats`, { credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('journal fetch failed');
      const data = await res.json();
      if (!data.totalTrades || data.totalTrades === 0) {
        toast.warning(t('expectancyCalcNoJournal'));
        return;
      }
      // R = avgWin / |avgLoss|
      const r = data.avgLoss && data.avgLoss !== 0
        ? Math.abs(data.avgWin / data.avgLoss)
        : 0;
      setWinRate(Math.max(1, Math.min(99, Math.round(data.winRate))));
      setRRatio(Math.max(0.1, Math.min(10, Number(r.toFixed(2)) || 1)));
      toast.success(`Loaded: ${data.totalTrades} trades — WR ${data.winRate.toFixed(1)}% — R ${r.toFixed(2)}`);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[ExpectancyCalc] journal load failed:', e);
      }
      toast.error(t('expectancyCalcNoJournal'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  return (
    <Card
      className="bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-orange-500/5 border-orange-500/30"
      data-testid="expectancy-calculator"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
            <Sparkles className="w-5 h-5 text-orange-500" />
            {t('expectancyCalcTitle')}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t('expectancyCalcIntro')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFromJournal}
          disabled={loading}
          className="flex-shrink-0 border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 text-xs"
          data-testid="load-from-journal-btn"
        >
          <Target className="w-3.5 h-3.5 mr-1.5" />
          {loading ? t('expectancyCalcLoadingJournal') : t('expectancyCalcLoadFromJournal')}
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Win Rate */}
          <div className="bg-card/50 border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('expectancyCalcWinRate')}
              </label>
              <input
                type="number" min={1} max={99} step={1}
                value={winRate}
                onChange={(e) => setWinRate(Math.max(1, Math.min(99, parseInt(e.target.value) || 0)))}
                className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm text-foreground font-mono text-right focus:outline-none focus:border-primary"
                data-testid="winrate-input"
              />
            </div>
            <input
              type="range" min={1} max={99} step={1}
              value={winRate}
              onChange={(e) => setWinRate(parseInt(e.target.value))}
              className="w-full accent-orange-500"
              data-testid="winrate-slider"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span className="text-[#ef4444]">% {winRate}% W</span>
              <span className="text-[#ef4444]">% {lossRate}% L</span>
            </div>
          </div>

          {/* R Ratio */}
          <div className="bg-card/50 border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('expectancyCalcRRatio')}
              </label>
              <input
                type="number" min={0.1} max={10} step={0.1}
                value={rRatio}
                onChange={(e) => setRRatio(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 0.1)))}
                className="w-20 bg-muted border border-border rounded px-2 py-1 text-sm text-foreground font-mono text-right focus:outline-none focus:border-primary"
                data-testid="rratio-input"
              />
            </div>
            <input
              type="range" min={0.1} max={10} step={0.1}
              value={rRatio}
              onChange={(e) => setRRatio(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
              data-testid="rratio-slider"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0.1</span>
              <span>1:1</span>
              <span>10</span>
            </div>
          </div>
        </div>

        {/* EV result + verdict */}
        <div className={`rounded-xl border-2 ${verdict.border} ${verdict.bg} p-4 flex items-center gap-4`}>
          <VerdictIcon className={`w-10 h-10 ${verdict.color} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {t('expectancyCalcEvPerTrade')}
            </div>
            <div
              className={`text-3xl font-bold font-mono ${verdict.color}`}
              data-testid="ev-result"
            >
              {fmtR(ev)}
            </div>
            <div className={`text-sm font-semibold ${verdict.color} mt-0.5`}>
              {t(verdict.key)}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end font-mono text-xs text-muted-foreground">
            <span>{winRate}% × {rRatio.toFixed(2)}</span>
            <span>− {lossRate}% × 1</span>
            <span className={`text-base font-bold ${verdict.color}`}>= {ev.toFixed(2)}</span>
          </div>
        </div>

        {/* Projections at 100 / 500 / 1000 trades */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            {ev >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#ef4444]" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('expectancyCalcProjection')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {projections.map((p) => (
              <div
                key={p.trades}
                className={`rounded-lg border p-3 text-center ${
                  p.total >= 0
                    ? 'bg-[#22c55e]/5 border-[#22c55e]/20'
                    : 'bg-[#ef4444]/5 border-[#ef4444]/20'
                }`}
                data-testid={`projection-${p.trades}`}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {p.label} <span className="opacity-60">trades</span>
                </div>
                <div
                  className={`text-xl font-bold font-mono mt-1 ${
                    p.total >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  }`}
                >
                  {fmtR(p.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpectancyCalculator;
