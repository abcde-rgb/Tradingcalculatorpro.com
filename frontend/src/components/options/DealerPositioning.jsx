import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Info, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { fetchPositioning, calculateAdvancedGreeks } from '../../services/optionsApi';

// Compact money formatter for GEX magnitudes (they run into millions/billions).
const compact = (v) => {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const Tile = ({ label, value, hint, color = 'text-foreground', testId }) => (
  <div className="bg-background border border-border rounded-lg p-3" data-testid={testId}>
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{label}</div>
    <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    {hint && <div className="text-[9px] text-muted-foreground mt-0.5">{hint}</div>}
  </div>
);

/**
 * DealerPositioning — gamma exposure (GEX) by strike plus second-order Greeks
 * (vanna/charm) for the active strategy.
 *
 * Reads `/options/positioning`, the single endpoint that publishes every
 * observed-positioning metric. There is deliberately no GEX-only route: the
 * engine lives in `options_positioning.gamma_exposure`, which also reports the
 * flip strike and the dealer-side convention the sign depends on.
 *
 * Honesty contract (mirrors the backend): GEX is shown ONLY when the chain has
 * real open interest. On a modelled chain the backend returns gex=null with
 * synthetic=true and we render an explicit warning instead of inventing levels.
 */
export default function DealerPositioning({ ticker, stock, legs, expirationIdx = 3 }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [adv, setAdv] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ticker) return undefined;
    setLoading(true);
    fetchPositioning(ticker, expirationIdx).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [ticker, expirationIdx]);

  useEffect(() => {
    let cancelled = false;
    const price = stock?.price;
    if (!legs?.length || !price) { setAdv(null); return undefined; }
    calculateAdvancedGreeks(legs, price).then((res) => {
      if (!cancelled) setAdv(res);
    });
    return () => { cancelled = true; };
  }, [legs, stock?.price]);

  const gex = data?.gex;
  const spot = data?.stock?.price ?? stock?.price ?? null;

  // Scale bars to the largest absolute exposure on the chain.
  const maxAbs = useMemo(() => {
    if (!gex?.byStrike?.length) return 0;
    return Math.max(...gex.byStrike.map((r) => Math.abs(r.gex)));
  }, [gex]);

  // Show the strikes nearest the spot — the ones that actually matter.
  const visible = useMemo(() => {
    if (!gex?.byStrike?.length) return [];
    if (spot == null) return gex.byStrike.slice(0, 24);
    return [...gex.byStrike]
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
      .slice(0, 24)
      .sort((a, b) => b.strike - a.strike);
  }, [gex, spot]);

  return (
    <div className="space-y-4" data-testid="dealer-positioning">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" /> {t('gexPanelTitle')}
          </h3>
          {data?.expiration?.date && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {data.expiration.date} · {data.expiration.daysToExpiry}d
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">{t('gexPanelIntro')}</p>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('loading')}
          </div>
        )}

        {/* Modelled chain → no real open interest → we refuse to invent GEX. */}
        {!loading && data?.synthetic && (
          <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/5 p-3"
            data-testid="gex-synthetic-warning">
            <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {data.syntheticWarning || t('gexSyntheticWarn')}
            </p>
          </div>
        )}

        {!loading && !data?.synthetic && !gex && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3"
            data-testid="gex-unavailable">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{t('gexUnavailable')}</p>
          </div>
        )}

        {!loading && gex && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Tile label={t('gexTotal')} value={compact(gex.total)}
                hint={gex.total >= 0 ? t('gexPositiveHint') : t('gexNegativeHint')}
                color={gex.total >= 0 ? 'text-long' : 'text-short'}
                testId="gex-total" />
              <Tile label={t('gexFlip')}
                value={gex.flipStrike != null ? gex.flipStrike : '—'}
                hint={t('gexFlipHint')} testId="gex-flip" />
              <Tile label={t('gexConvention')}
                value={gex.convention === 'dealer_long_calls' ? '+C / −P' : '−C / +P'}
                hint={t('gexConventionHint')} testId="gex-convention" />
              <Tile label={t('gexSpot')} value={spot != null ? spot.toFixed(2) : '—'}
                hint={t('gexSpotHint')} testId="gex-spot" />
            </div>

            {/* Per-strike exposure: right of centre = positive gamma, left = negative */}
            <div className="space-y-1" data-testid="gex-by-strike">
              {visible.map((row) => {
                const pct = maxAbs > 0 ? (Math.abs(row.gex) / maxAbs) * 50 : 0;
                const positive = row.gex >= 0;
                const isSpotRow = spot != null && Math.abs(row.strike - spot) < 1e-9;
                return (
                  <div key={row.strike} className="flex items-center gap-2 text-[10px]">
                    <span className={`w-14 text-right font-mono shrink-0 ${isSpotRow ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {row.strike}
                    </span>
                    <div className="relative flex-1 h-3.5 bg-muted/30 rounded-sm overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                      <div
                        className={positive ? 'absolute inset-y-0 bg-long/70' : 'absolute inset-y-0 bg-short/70'}
                        style={positive
                          ? { left: '50%', width: `${pct}%` }
                          : { right: '50%', width: `${pct}%` }}
                      />
                    </div>
                    <span className={`w-20 font-mono shrink-0 ${positive ? 'text-long' : 'text-short'}`}>
                      {compact(row.gex)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Second-order Greeks for the active strategy */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4" /> {t('soGreeksTitle')}
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">{t('soGreeksIntro')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Tile label={t('soVanna')}
            value={adv?.vanna != null ? adv.vanna.toFixed(4) : '—'}
            hint={t('soVannaHint')}
            color={adv?.vanna == null ? 'text-muted-foreground' : adv.vanna >= 0 ? 'text-long' : 'text-short'}
            testId="so-vanna" />
          <Tile label={t('soCharm')}
            value={adv?.charm != null ? adv.charm.toFixed(4) : '—'}
            hint={t('soCharmHint')}
            color={adv?.charm == null ? 'text-muted-foreground' : adv.charm >= 0 ? 'text-long' : 'text-short'}
            testId="so-charm" />
        </div>
        <div className="flex items-start gap-2 mt-3 text-[10px] text-muted-foreground">
          <ArrowDownRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{t('soGreeksUnits')}</span>
        </div>
      </div>
    </div>
  );
}
