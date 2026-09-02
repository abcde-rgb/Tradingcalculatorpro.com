import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Target, TrendingUp, Shield, Zap, Trophy, Percent, DollarSign, Wallet, ArrowRight, AlertTriangle, ShieldAlert, Sigma, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CargaVelas } from '@/components/common/BrandLoading';

const API = process.env.REACT_APP_BACKEND_URL;

const SENTIMENTS = [
  { id: 'very_bearish', labelKey: 'sentVeryBearish_6aa1', icon: '↓↓', color: 'text-short', bg: 'bg-short/15 border-short/40' },
  { id: 'bearish',      labelKey: 'sentBearish_6aa2',     icon: '↓',  color: 'text-short', bg: 'bg-short/15 border-short/40' },
  { id: 'neutral',      labelKey: 'sentNeutral_6aa3',     icon: '→',  color: 'text-caution', bg: 'bg-caution/15 border-caution/40' },
  { id: 'bullish',      labelKey: 'sentBullish_6aa4',     icon: '↑',  color: 'text-long', bg: 'bg-long/15 border-long/40' },
  { id: 'very_bullish', labelKey: 'sentVeryBullish_6aa5', icon: '↑↑', color: 'text-long', bg: 'bg-long/15 border-long/40' },
];

const OptimizeView = ({ symbol, stock, expirations, onOpenInCalculator }) => {
  const { t } = useTranslation();
  const [sentiment, setSentiment] = useState('bullish');
  const [targetPrice, setTargetPrice] = useState('');
  const [budget, setBudget] = useState(1500);
  const [expirationIdx, setExpirationIdx] = useState(3);
  const [mode, setMode] = useState('max_return');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Default target based on spot + direction
  React.useEffect(() => {
    if (stock?.price && !targetPrice) {
      const bullish = sentiment.includes('bullish');
      const neutral = sentiment === 'neutral';
      const mult = neutral ? 1 : (bullish ? 1.05 : 0.95);
      setTargetPrice(Math.round(stock.price * mult));
    }
  }, [stock, sentiment, targetPrice]);

  const targetPct = stock?.price && targetPrice ? ((targetPrice - stock.price) / stock.price) * 100 : 0;

  const runOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/optimize`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          sentiment,
          targetPrice: Number(targetPrice),
          budget: Number(budget),
          expirationIdx,
          mode,
          maxResults: 8,
        }),
      });
      if (!res.ok) throw new Error(t('errorOptimize'));
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setError(e.message || t('errorUnknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="optimize-view">
      {/* Input Panel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t('optimizarEstrategia_830ea3')}</h2>
          <span className="text-xs text-muted-foreground ml-2">{t('describeTuTesisYTe_cc284a')}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sentiment */}
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">{t('sentimiento_op001')}</label>
            <div className="grid grid-cols-5 gap-1.5">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSentiment(s.id)}
                  className={`px-2 py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                    sentiment === s.id ? s.bg + ' ' + s.color : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`sentiment-${s.id}`}
                >
                  <div className="text-base leading-none mb-0.5">{s.icon}</div>
                  <div className="text-[9px] leading-tight">{t(s.labelKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Price + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">{t('precioObjetivo_beefc6')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none font-mono">$</span>
                <input
                  type="number" step="any" value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg pl-7 pr-12 py-2.5 text-sm font-bold text-foreground font-mono focus:outline-none focus:border-primary"
                  data-testid="target-price-input"
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold ${
                  targetPct > 0 ? 'text-long' : targetPct < 0 ? 'text-short' : 'text-muted-foreground'
                }`}>
                  {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">{t('presupuesto_op002')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none font-mono">$</span>
                <input
                  type="number" step={100} min={100} value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm font-bold text-foreground font-mono focus:outline-none focus:border-primary"
                  data-testid="budget-input"
                />
              </div>
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">{t('vencimientoObjetivo_0277d0')}</label>
            <Select
              value={String(expirationIdx)}
              onValueChange={(v) => setExpirationIdx(Number(v))}
            >
              <SelectTrigger
                data-testid="expiration-select"
                className="w-full h-11 bg-muted border-border rounded-lg px-3 text-sm text-foreground shadow-none focus:border-primary"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[60vh]">
                {(expirations || []).map((exp, idx) => (
                  <SelectItem key={exp.date} value={String(idx)} className="focus:bg-primary/15 focus:text-primary data-[state=checked]:text-primary">
                    {exp.fullLabel} · {exp.daysToExpiry}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode */}
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 block">{t('optimizarPor_f196ea')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('max_return')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'max_return' ? 'bg-warn/15 border-warn/40 text-warn' : 'bg-muted border-border text-muted-foreground'
                }`}
                data-testid="mode-max-return"
              >
                <Zap className="w-3.5 h-3.5" />
                {t('maxReturn_op003')}
              </button>
              <button
                onClick={() => setMode('max_chance')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'max_chance' ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                }`}
                data-testid="mode-max-chance"
              >
                <Shield className="w-3.5 h-3.5" />
                {t('maxProbability_op004')}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={runOptimize}
          disabled={loading || !targetPrice || !budget}
          className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-primary to-long text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          data-testid="optimize-run"
        >
          {loading ? <><CargaVelas className="w-4 h-4" /> {t('analizandoMercado_334c80')}</> : <><Target className="w-4 h-4" /> {t('optimizeNow_op005')}</>}
        </button>
      </div>

      {error && (
        <div className="bg-short/10 border border-short/40 rounded-lg p-3 text-sm text-short">{error}</div>
      )}

      {/* A modelled chain is fine to explore with and unacceptable to trade off
          unlabelled. The backend flags it; this is where the user sees it. */}
      {results?.synthetic && (
        <div className="bg-warn/10 border border-warn/50 rounded-lg p-3 flex gap-2.5"
          data-testid="synthetic-warning">
          <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
          <div className="text-xs text-warn leading-relaxed">
            <strong className="block mb-0.5">{t('synthDataTitle')}</strong>
            {t('synthDataBody')}
          </div>
        </div>
      )}

      {/* Results */}
      {results && results.results && results.results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">
              {t('topStrategiesForThesis_op006').replace('{n}', results.results.length)}
            </h3>
            <div className="text-[11px] text-muted-foreground">
              ${results.stock.price} → ${results.target.price} · {results.expiration?.fullLabel}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.results.map((r, idx) => (
              <StrategyCard
                key={r.id}
                rank={idx + 1}
                result={r}
                onOpen={() => onOpenInCalculator && onOpenInCalculator(r)}
              />
            ))}
          </div>
        </div>
      )}

      {results && results.results && results.results.length === 0 && (
        <div className="bg-muted/40 border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          {t('noStrategiesFound_op007')}
        </div>
      )}
    </div>
  );
};

const StrategyCard = ({ rank, result, onOpen }) => {
  const { t } = useTranslation();
  const points = (result.payoffPoints || []).map((p) => ({
    price: p.price,
    pnl: p.pnlAtExpiry,
    profit: p.pnlAtExpiry >= 0 ? p.pnlAtExpiry : 0,
    loss: p.pnlAtExpiry < 0 ? p.pnlAtExpiry : 0,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all" data-testid={`strategy-card-${result.strategyId}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
            rank === 1 ? 'bg-warn/20 text-warn' : rank === 2 ? 'bg-[#c0c0c0]/20 text-[#c0c0c0]' : rank === 3 ? 'bg-[#cd7f32]/20 text-[#cd7f32]' : 'bg-muted text-muted-foreground'
          }`}>
            {rank === 1 ? <Trophy className="w-3.5 h-3.5" /> : `#${rank}`}
          </div>
          <h4 className="text-sm font-bold text-foreground truncate">{t(result.name)}</h4>
        </div>
      </div>

      {/* Legs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {result.legs.map((leg, i) => (
          <span key={`${leg.type}-${leg.action}-${leg.strike}-${i}`} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
            leg.action === 'buy' ? 'bg-long/10 text-long border-long/25' : 'bg-short/10 text-short border-short/25'
          }`}>
            {leg.action === 'buy' ? 'BUY' : 'SELL'} {leg.quantity}x
            {leg.type !== 'stock' ? ` $${leg.strike} ${leg.type.toUpperCase()}` : ` ${leg.quantity} SHARES`}
          </span>
        ))}
      </div>

      {/* Mini Payoff Chart */}
      <div className="h-[90px] mb-3 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`prof-${result.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`loss-${result.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <XAxis dataKey="price" hide />
            <YAxis hide />
            <ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
            <Area type="monotone" dataKey="profit" stroke="none" fill={`url(#prof-${result.id})`} isAnimationActive={false} baseValue={0} />
            <Area type="monotone" dataKey="loss" stroke="none" fill={`url(#loss-${result.id})`} isAnimationActive={false} baseValue={0} />
            <Area type="monotone" dataKey="pnl" stroke="#22c55e" strokeWidth={1.5} fill="none" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Undefined risk, stated BEFORE the attractive metrics.
          A short straddle is the photographic negative of the long straddle the
          Academy teaches — same two strikes, a loss that is bounded by the
          premium if you buy it and effectively unbounded if you sell it. Someone
          who knows the word can assemble it here believing it is "the same thing
          but sold", so the warning belongs on the card, not in a footnote. */}
      {result.isUndefinedRisk && (
        <div className="mb-3 rounded-lg border border-short/50 bg-short/10 px-2.5 py-2 flex gap-2"
          data-testid={`undefined-risk-${result.strategyId}`}>
          <ShieldAlert className="w-3.5 h-3.5 text-short flex-shrink-0 mt-0.5" />
          <p className="text-[10px] leading-snug text-[#fca5a5]">
            <strong>{t('riskUndefinedTitle')}</strong> {t('riskUndefinedBody')}
          </p>
        </div>
      )}
      {result.riskLevel === 'substantial' && (
        <div className="mb-3 rounded-lg border border-warn/50 bg-warn/10 px-2.5 py-2 flex gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-warn flex-shrink-0 mt-0.5" />
          <p className="text-[10px] leading-snug text-warn">
            <strong>{t('riskSubstantialTitle')}</strong> {t('riskSubstantialBody')}
          </p>
        </div>
      )}

      {/* Metrics. Expected value first: ROI-at-target selects the furthest OTM
          lottery tickets and POP selects premium selling — neither measures edge. */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {result.expectedValue !== undefined && (
          <Metric icon={Sigma} label={t('metricEV')}
            value={`$${result.expectedValue}`}
            color={result.expectedValue >= 0 ? 'text-long' : 'text-short'} />
        )}
        {result.cvar5 !== undefined && (
          <Metric icon={ShieldAlert} label={t('metricCVaR')} value={`$${result.cvar5}`} color="text-short" />
        )}
        <Metric icon={Zap} label="ROI" value={result.roi == null ? '—' : `${result.roi}%`} color="text-warn" />
        <Metric icon={Percent} label="POP" value={`${result.pop}%`} color="text-primary" />
        {result.probTouchBreakEven != null && (
          <Metric icon={Activity} label={t('metricTouch')} value={`${result.probTouchBreakEven}%`} color="text-warn" />
        )}
        <Metric icon={TrendingUp} label={t('profitMax_op008')} value={result.maxProfitUnlimited ? '∞' : `$${result.maxProfit}`} color="text-long" />
        <Metric icon={Wallet} label={t('capital_op009')} value={`$${result.capitalRequired}`} color="text-compare" />
      </div>

      <button
        onClick={onOpen}
        className="w-full py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5"
        data-testid={`open-${result.strategyId}`}
      >
        {t('openInCalculator_op010')} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value, color }) => (
  <div className="bg-muted/40 rounded-md border border-border/40 px-1.5 py-1">
    <div className="flex items-center gap-1">
      <Icon className={`w-2.5 h-2.5 ${color}`} />
      <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-xs font-bold font-mono ${color}`}>{value}</div>
  </div>
);

export default OptimizeView;
