import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Briefcase, RefreshCw, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const API = process.env.REACT_APP_BACKEND_URL;

const GREEK_ROWS = [
  { key: 'delta', label: 'Delta Δ', subKey: 'greekDeltaSub_bc3a40', good: (v) => Math.abs(v) < 100, color: (v) => v >= 0 ? 'text-long' : 'text-short' },
  { key: 'gamma', label: 'Gamma Γ', subKey: 'greekGammaSub_bc3a41', good: () => true, color: () => 'text-warn' },
  { key: 'theta', label: 'Theta Θ', subKey: 'porCadaDia_ca6f47', good: (v) => v >= 0, color: (v) => v >= 0 ? 'text-long' : 'text-short' },
  { key: 'vega', label: 'Vega ν', subKey: 'greekVegaSub_bc3a42', good: () => true, color: (v) => v >= 0 ? 'text-long' : 'text-short' },
  { key: 'rho', label: 'Rho ρ', subKey: 'greekRhoSub_bc3a43', good: () => true, color: (v) => v >= 0 ? 'text-long' : 'text-short' },
];

/**
 * Portfolio Greeks — aggregates Greeks across ALL saved positions using live spot prices.
 * Shows net exposure per Greek. Helps traders see total portfolio risk at a glance.
 */
const PortfolioGreeks = () => {
  const { t } = useTranslation();
  const { token, isAuthenticated } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGreeks = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/options/positions/portfolio-greeks`, { credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('portfolio-greeks error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => { fetchGreeks(); }, [fetchGreeks]);

  if (!isAuthenticated) {
    return (
      <div className="bg-card/60 border border-border/60 rounded-xl p-3.5 text-center text-xs text-muted-foreground">
        Inicia sesión para ver la agregación de Greeks de todas tus posiciones.
      </div>
    );
  }

  const agg = data?.aggregated || { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  const positions = data?.positions || [];

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="portfolio-greeks">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground">{t('greeksAggregatedTitle_bc3a50')}</h4>
          <span className="text-[10px] text-muted-foreground">
            {data?.positionCount || 0} {data?.positionCount === 1 ? t('posicion_5aef61') : t('posiciones_bc3a51')}
          </span>
        </div>
        <button
          onClick={fetchGreeks}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          data-testid="refresh-portfolio-greeks"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Actualizar
        </button>
      </div>

      {positions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aún no tienes posiciones guardadas. Usa "Guardar actual" en Mis Posiciones para empezar a trackear tu exposición.
        </p>
      ) : (
        <>
          {/* Aggregated row */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {GREEK_ROWS.map(({ key, label, subKey, color }) => {
              const val = agg[key] || 0;
              const colorCls = color(val);
              return (
                <div key={key} className="bg-muted/50 rounded-lg border border-border/60 p-2.5" data-testid={`agg-greek-${key}`}>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${colorCls}`}>
                    {val >= 0 ? '+' : ''}{val.toFixed(key === 'gamma' ? 4 : 2)}
                  </div>
                  <div className="text-[8px] text-muted-foreground mt-0.5">{t(subKey)}</div>
                </div>
              );
            })}
          </div>

          {/* Per-position breakdown */}
          <details className="group">
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5 mb-2">
              <span className="inline-block transition-transform group-open:rotate-90">▶</span>
              Ver desglose por posición ({positions.length})
            </summary>
            <div className="space-y-1.5 mt-2">
              {positions.map((p) => (
                <div key={p.id} className="bg-muted/30 rounded-md border border-border/40 p-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.symbol} @ ${p.currentPrice?.toFixed(2)} · {p.legsCount} legs
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                    <div><span className="text-muted-foreground">Δ</span> <span className="text-foreground">{(p.greeks?.delta ?? 0).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Γ</span> <span className="text-foreground">{(p.greeks?.gamma ?? 0).toFixed(4)}</span></div>
                    <div><span className="text-muted-foreground">Θ</span> <span className={(p.greeks?.theta ?? 0) >= 0 ? 'text-long' : 'text-short'}>{(p.greeks?.theta ?? 0).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">ν</span> <span className="text-foreground">{(p.greeks?.vega ?? 0).toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <p className="text-[9px] text-muted-foreground mt-3 leading-snug">
            Calculadas con los precios spot actuales. Δ positivo = exposición larga net; Θ positivo = cobras theta neta; ν alto = sensibilidad a cambios en IV.
          </p>
        </>
      )}
    </div>
  );
};

export default PortfolioGreeks;
