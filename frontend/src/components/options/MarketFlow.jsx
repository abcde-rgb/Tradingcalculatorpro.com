import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Globe, Loader2, TrendingUp, TrendingDown, ArrowRight, Info } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Market-Wide Flow — scans 20+ popular tickers for unusual activity.
 * Shows top 30 ranked by notional (trade size).
 */
const MarketFlow = ({ onSelectSymbol }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minRatio, setMinRatio] = useState(3);

  const scan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/options/market-flow?min_ratio=${minRatio}&min_volume=300&max_results=30`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('market flow error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="market-flow">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#c084fc]" />
          <h4 className="text-sm font-bold text-foreground">Market-Wide Flow</h4>
          <span className="text-[10px] text-muted-foreground">24 tickers populares</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ratio:</span>
            {[2, 3, 5, 10].map((r) => (
              <button
                key={r}
                onClick={() => setMinRatio(r)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                  minRatio === r ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
          <button
            onClick={scan}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#c084fc] text-xs font-bold hover:bg-[#a855f7]/25 disabled:opacity-40"
            data-testid="market-scan-btn"
          >
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('escaneandoMercado_ba90ca')}</> : <><Globe className="w-3.5 h-3.5" /> {t('escanearMercado_d2e533')}</>}
          </button>
        </div>
      </div>

      {!data && !loading && (() => {
        const parts = t('flowIntroDesc_mf001').split('{scan}');
        return (
          <p className="text-xs text-muted-foreground">
            {parts[0]}
            <span className="text-[#c084fc] font-semibold">{t('escanear_mf002')}</span>
            {parts[1]}
          </p>
        );
      })()}

      {loading && !data && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('scanning24_mf003')}
        </div>
      )}

      {data && data.results && data.results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t('noUnusualActivity_mf004').replace('{ratio}', minRatio)}
        </p>
      )}

      {data && data.results && data.results.length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-2 text-[11px]">
            <span className="text-muted-foreground">Tickers escaneados: <span className="text-foreground font-bold">{data.scannedTickers}</span></span>
            <span className="text-muted-foreground">{t('senalesDetectadas_d07517')} <span className="text-foreground font-bold">{data.totalFound}</span></span>
          </div>
      {/* Open interest is a once-a-day figure: this ratio compares today's
          volume against the previous session's OI. Saying so at the point of
          use is the difference between a screening hint and a claim. */}
      {data?.oiNote && (
        <div className="mb-3 flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
             data-testid="oi-staleness-note">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug text-muted-foreground">{t('flowOiStaleNote')}</p>
        </div>
      )}
          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b border-border sticky top-0 z-10">
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-2 py-1.5 text-left">Ticker</th>
                  <th className="px-2 py-1.5 text-left">Tipo</th>
                  <th className="px-2 py-1.5 text-right">Strike</th>
                  <th className="px-2 py-1.5 text-left">Exp</th>
                  <th className="px-2 py-1.5 text-right">Vol</th>
                  <th className="px-2 py-1.5 text-right">Ratio</th>
                  <th className="px-2 py-1.5 text-right">Notional</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r, i) => (
                  <tr key={`${r.symbol}-${r.type}-${r.strike}-${r.expiration}-${i}`} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                    <td className="px-2 py-1.5 font-bold font-mono text-foreground">{r.symbol}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                        r.type === 'call' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#ef4444]/15 text-[#f87171]'
                      }`}>{r.type === 'call' ? <TrendingUp className="w-2.5 h-2.5 inline" /> : <TrendingDown className="w-2.5 h-2.5 inline" />} {r.type.toUpperCase()}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-foreground">${r.strike}</td>
                    <td className="px-2 py-1.5 text-[10px] text-muted-foreground whitespace-nowrap">{r.expiration}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-foreground">{r.volume.toLocaleString()}</td>
                    <td className={`px-2 py-1.5 text-right font-mono font-bold ${r.ratio == null ? 'text-muted-foreground' : 'text-[#fbbf24]'}`}
                        title={r.ratio == null ? t('flowNoOiHint') : undefined}>
                      {r.ratio == null ? t('flowNoOi') : `${r.ratio}x`}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#a78bfa]">${(r.estNotional / 1000).toFixed(0)}k</td>
                    <td className="px-2 py-1.5">
                      {onSelectSymbol && (
                        <button
                          onClick={() => onSelectSymbol(r.symbol)}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          title={`Abrir ${r.symbol} en Calculator`}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MarketFlow;
