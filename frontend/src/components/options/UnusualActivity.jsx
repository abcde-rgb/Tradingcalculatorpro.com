import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Zap, RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Unusual Options Activity Scanner — detects strikes where volume >> open interest.
 * Classic institutional flow indicator.
 */
const UnusualActivity = ({ symbol }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minRatio, setMinRatio] = useState(2);
  const [filter, setFilter] = useState('all'); // all, calls, puts

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/options/unusual/${symbol}?min_ratio=${minRatio}&min_volume=100`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('unusual fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, minRatio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const results = (data?.results || []).filter((r) =>
    filter === 'all' ? true : filter === 'calls' ? r.type === 'call' : r.type === 'put'
  );

  const callCount = (data?.results || []).filter((r) => r.type === 'call').length;
  const putCount = (data?.results || []).filter((r) => r.type === 'put').length;
  const putCallRatio = callCount > 0 ? (putCount / callCount).toFixed(2) : '∞';

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="unusual-activity">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#fbbf24]" />
            <h3 className="text-lg font-bold text-foreground">Unusual Options Activity</h3>
            <span className="text-xs text-muted-foreground ml-1">· {symbol}</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
            data-testid="refresh-unusual"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t('refresh_ua003')}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          {t('unusualActivityDesc_ua004')}
        </p>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('ratioMin_e7f44a')}</span>
            {[1.5, 2, 3, 5, 10].map((r) => (
              <button
                key={r}
                onClick={() => setMinRatio(r)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                  minRatio === r ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[
              { id: 'all', labelKey: 'filterAll_ua005' },
              { id: 'calls', labelKey: 'filterCalls_ua006' },
              { id: 'puts', labelKey: 'filterPuts_ua007' },
            ].map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${
                  filter === id ? 'bg-muted border-foreground/30 text-foreground' : 'bg-background border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-muted-foreground">Calls/Puts: </span>
                <span className="font-bold text-[#4ade80]">{callCount}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="font-bold text-[#f87171]">{putCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">P/C Ratio: </span>
                <span className={`font-bold font-mono ${Number(putCallRatio) > 1 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>{putCallRatio}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Escaneando chain...
        </div>
      ) : results.length === 0 ? (
        <div className="bg-muted/40 border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No se detectó actividad inusual con ratio ≥ {minRatio}x en las próximas 5 expiraciones.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{t('pruebaBajarElRatioMinimo_5339a2')}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2 text-left">{t('tipo_ua001')}</th>
                <th className="px-3 py-2 text-right">Strike</th>
                <th className="px-3 py-2 text-left">{t('vencimiento_91e0e1')}</th>
                <th className="px-3 py-2 text-right">{t('volumen_186110')}</th>
                <th className="px-3 py-2 text-right">OI</th>
                <th className="px-3 py-2 text-right">Vol/OI</th>
                <th className="px-3 py-2 text-right">IV</th>
                <th className="px-3 py-2 text-right">{t('prima_ua002')}</th>
                <th className="px-3 py-2 text-right">Notional</th>
                <th className="px-3 py-2 text-right">Moneyness</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={`${r.type}-${r.expiration}-${r.strike}-${i}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      r.type === 'call' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#ef4444]/15 text-[#f87171]'
                    }`}>
                      {r.type === 'call' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {r.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-foreground">${r.strike}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.expiration} <span className="text-[9px] opacity-70">·{r.daysToExpiry}d</span></td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{r.volume.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.openInterest.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`font-mono font-bold ${r.ratio > 10 ? 'text-[#fbbf24]' : r.ratio > 5 ? 'text-[#f59e0b]' : 'text-foreground'}`}>
                      {r.ratio}x
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{(r.iv * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">${r.premium?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#a78bfa]">${(r.estNotional / 1000).toFixed(0)}k</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`font-mono text-[10px] ${r.isITM ? 'text-[#4ade80]' : 'text-muted-foreground'}`}>
                      {r.moneynessPct >= 0 ? '+' : ''}{r.moneynessPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UnusualActivity;
