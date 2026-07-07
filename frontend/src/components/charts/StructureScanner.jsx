import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Layers, Waves, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAssetsStore, ALL_ASSETS } from '@/lib/assets';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// The chart and the scanner share the SAME asset (Zustand store), but the
// backend reads Yahoo Finance, which needs Yahoo-formatted tickers. We know the
// category here, so we translate on the frontend and leave the backend generic.
const INDEX_YF = {
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', DAX: '^GDAXI', FTSE: '^FTSE',
  N225: '^N225', HSI: '^HSI', RUT: '^RUT', VIX: '^VIX', SX5E: '^STOXX50E',
  IBEX: '^IBEX', CAC: '^FCHI', XJO: '^AXJO', NIFTY: '^NSEI', IBOV: '^BVSP',
};
const COMMODITY_YF = {
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTIUSD: 'CL=F', BRENTUSD: 'BZ=F',
  NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F', PALLADIUM: 'PA=F',
};

const toYahooSymbol = (asset) => {
  if (!asset) return null;
  const s = asset.symbol;
  switch (asset.category) {
    case 'crypto':      return `${s}-USD`;              // BTC → BTC-USD
    case 'forex':       return `${s}=X`;                // EURUSD → EURUSD=X
    case 'commodities': return COMMODITY_YF[s] || s;
    case 'indices':     return INDEX_YF[s] || s;
    case 'futures':     return `${s}=F`;                // ES → ES=F
    default:            return s;                        // stocks as-is
  }
};

const PERIODS = ['3mo', '6mo', '1y', '2y'];

const TREND_UI = {
  uptrend:   { color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10', border: 'border-[#22c55e]/30', Icon: TrendingUp,   key: 'structTrendUp' },
  downtrend: { color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', Icon: TrendingDown, key: 'structTrendDown' },
  range:     { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border',        Icon: Minus,        key: 'structTrendRange' },
};

const DIR_UI = {
  bullish: { color: 'text-[#22c55e]', icon: '↑' },
  bearish: { color: 'text-[#ef4444]', icon: '↓' },
};

const LEVEL_UI = {
  resistance: { color: 'text-[#ef4444]', key: 'structLvlResistance' },
  support:    { color: 'text-[#22c55e]', key: 'structLvlSupport' },
  pivot:      { color: 'text-[#f59e0b]', key: 'structLvlPivot' },
};

const StructureScanner = () => {
  const { t } = useTranslation();
  const { selectedAsset } = useAssetsStore();
  const asset = ALL_ASSETS[selectedAsset];
  const yahoo = toYahooSymbol(asset);

  const [period, setPeriod] = useState('6mo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const reqId = useRef(0);

  const scan = useCallback(async () => {
    if (!API || !yahoo) return;
    const myReq = ++reqId.current;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/education/structure-scan/${encodeURIComponent(yahoo)}?period=${period}&interval=1d&strength=2`
      );
      const json = await res.json();
      if (myReq !== reqId.current) return; // a newer request superseded this one
      if (json.error) {
        setData(null);
        toast.error(t('structScanError'));
      } else {
        setData(json);
      }
    } catch (e) {
      if (myReq !== reqId.current) return;
      if (process.env.NODE_ENV !== 'production') console.error('[StructureScanner]', e);
      setData(null);
      toast.error(t('structScanError'));
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [yahoo, period, t]);

  // Auto-scan whenever the chart's asset or the period changes.
  useEffect(() => { scan(); }, [scan]);

  const trend = (data && TREND_UI[data.trend]) || TREND_UI.range;
  const TrendIcon = trend.Icon;
  const events = data?.events ? [...data.events].reverse().slice(0, 8) : [];
  const levels = data?.levels ? data.levels.slice(0, 6) : [];
  const fvgs = data?.fvgs ? data.fvgs.slice(0, 6) : [];
  const c = data?.counts || {};

  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/30"
      data-testid="structure-scanner"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
              <Activity className="w-5 h-5 text-primary" />
              {t('structScanTitle')}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {t('structScanIntro')}
            </p>
          </div>
          {asset && (
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {t('structScanReading')}
              </div>
              <div className="text-sm font-bold font-mono text-primary">{asset.symbol}</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{asset.name}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls: period + rescan (asset comes from the chart above) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5" role="group">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                  period === p ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`struct-period-${p}`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            onClick={scan}
            disabled={loading || !yahoo}
            size="sm"
            variant="outline"
            className="ml-auto"
            data-testid="struct-rescan-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('livePatternScanning') : t('structScanRescan')}
          </Button>
        </div>

        {/* Trend banner */}
        {data && (
          <div
            className={`flex items-center gap-3 rounded-lg border ${trend.border} ${trend.bg} px-4 py-3`}
            data-testid="struct-trend"
          >
            <TrendIcon className={`w-6 h-6 ${trend.color} shrink-0`} />
            <div className="min-w-0">
              <div className={`text-base font-bold ${trend.color}`}>{t(trend.key)}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{t(`${trend.key}Desc`)}</div>
            </div>
          </div>
        )}

        {/* Stats line */}
        {data && (
          <div className="text-xs text-muted-foreground font-mono" data-testid="struct-stats">
            {t('structScanStats')
              .replace('{rows}', String(data.rowsScanned ?? 0))
              .replace('{swings}', String(c.swings ?? 0))
              .replace('{bos}', String(c.bos ?? 0))
              .replace('{choch}', String(c.choch ?? 0))}
          </div>
        )}

        {/* Structure events: BOS / CHoCH */}
        {events.length > 0 && (
          <section data-testid="struct-events">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              {t('structEventsTitle')}
            </h4>
            <div className="space-y-1.5">
              {events.map((e, i) => {
                const dir = DIR_UI[e.direction] || DIR_UI.bullish;
                const isChoch = e.kind === 'CHoCH';
                return (
                  <div
                    key={`${e.date}-${e.index}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className={`font-semibold ${isChoch ? 'text-[#f59e0b]' : 'text-primary'}`}>
                      {t(isChoch ? 'structChoch' : 'structBos')}
                    </span>
                    <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${e.direction}`)}</span>
                    <span className="font-mono text-muted-foreground ml-auto">{e.price}</span>
                    <span className="font-mono text-muted-foreground/70 text-[10px]">{e.date}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Support / Resistance levels */}
        {levels.length > 0 && (
          <section data-testid="struct-levels">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {t('structLevelsTitle')}
            </h4>
            <div className="space-y-1.5">
              {levels.map((lv, i) => {
                const ui = LEVEL_UI[lv.type] || LEVEL_UI.pivot;
                return (
                  <div
                    key={`${lv.price}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className={`font-semibold ${ui.color}`}>{t(ui.key)}</span>
                    <span className="font-mono text-foreground">{lv.price}</span>
                    <span className="text-muted-foreground ml-auto">
                      {t('structTouches').replace('{n}', String(lv.touches))}
                    </span>
                    <span className="flex gap-0.5" title={`${lv.strength}/5`}>
                      {Array.from({ length: 5 }).map((_, k) => (
                        <span
                          key={k}
                          className={`inline-block w-1.5 h-1.5 rounded-full ${k < lv.strength ? ui.color.replace('text-', 'bg-') : 'bg-border'}`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Fair Value Gaps */}
        {fvgs.length > 0 && (
          <section data-testid="struct-fvgs">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Waves className="w-3.5 h-3.5 text-primary" />
              {t('structFvgTitle')}
            </h4>
            <div className="space-y-1.5">
              {fvgs.map((g, i) => {
                const dir = DIR_UI[g.direction] || DIR_UI.bullish;
                return (
                  <div
                    key={`${g.date}-${g.index}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className={`font-mono ${dir.color}`}>{dir.icon} {t(`structDir_${g.direction}`)}</span>
                    <span className="font-mono text-foreground">{g.bottom} – {g.top}</span>
                    <span
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        g.filled ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {t(g.filled ? 'structFvgFilled' : 'structFvgOpen')}
                    </span>
                    <span className="font-mono text-muted-foreground/70 text-[10px]">{g.date}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {data && data.rowsScanned === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground" data-testid="struct-empty">
            {t('structScanEmpty')}
          </div>
        )}

        {/* Nothing detected but data was scanned */}
        {data && data.rowsScanned > 0 && events.length === 0 && levels.length === 0 && fvgs.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t('structScanNoStructure')}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1">
          {t('structScanNote')}
        </p>
      </CardContent>
    </Card>
  );
};

export default StructureScanner;
