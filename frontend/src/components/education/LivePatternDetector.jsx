import React, { useCallback, useState } from 'react';
import { Search, ScanLine, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import CandlePatternFigure from './CandlePatternFigure';
import { PATTERN_NAME_KEY, TYPE_BADGE, BEHAVIOR_KEY, rateColor } from '@/lib/candlePatternMeta';

const API = process.env.REACT_APP_BACKEND_URL;

const PERIODS = ['1mo', '3mo', '6mo', '1y'];

const LivePatternDetector = () => {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('3mo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const scan = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/education/pattern-scan/${encodeURIComponent(symbol.toUpperCase())}?period=${period}&interval=1d&limit=20`
      , { credentials: 'include' });
      const json = await res.json();
      if (json.error) {
        toast.error(t('livePatternErrorFetch'));
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('[LivePatternDetector]', e);
      toast.error(t('livePatternErrorFetch'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, period, t]);

  const onKey = (e) => {
    if (e.key === 'Enter') scan();
  };

  const patternName = (id) => (PATTERN_NAME_KEY[id] ? t(PATTERN_NAME_KEY[id]) : id);
  const behaviorLabel = (b) => (BEHAVIOR_KEY[b] ? t(BEHAVIOR_KEY[b]) : b);

  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/30"
      data-testid="live-pattern-detector"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-lg">
          <ScanLine className="w-5 h-5 text-primary" />
          {t('livePatternTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {t('livePatternIntro')}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
              Ticker
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={onKey}
                placeholder="AAPL, TSLA, SPY..."
                className="w-full bg-muted border border-border rounded-md pl-8 pr-2 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:border-primary"
                data-testid="live-pattern-ticker-input"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
              {t('livePatternPeriod')}
            </label>
            <div className="flex gap-1 bg-muted rounded-md border border-border p-0.5" role="group">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                    period === p
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`live-pattern-period-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={scan}
            disabled={loading || !symbol}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="live-pattern-scan-btn"
          >
            <ScanLine className="w-3.5 h-3.5 mr-1.5" />
            {loading ? t('livePatternScanning') : t('livePatternScanBtn')}
          </Button>
        </div>

        {/* Stats line */}
        {data && (
          <div className="text-xs text-muted-foreground font-mono" data-testid="live-pattern-stats">
            {t('livePatternStatsLine')
              .replace('{rows}', String(data.rowsScanned))
              .replace('{hits}', String(data.totalDetections))}
          </div>
        )}

        {/* Results */}
        {data && data.detections && data.detections.length > 0 && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {data.detections.map((d, i) => {
              const badge = TYPE_BADGE[d.type] || TYPE_BADGE.neutral;
              return (
                <div
                  key={`${d.date}-${d.pattern_id}-${i}`}
                  className={`flex items-center gap-3 rounded-lg border ${badge.border} ${badge.bg} px-3 py-2`}
                  data-testid={`live-pattern-row-${i}`}
                >
                  {/* Compact mini-illustration of the pattern */}
                  <div className="flex-shrink-0 transform scale-[0.6] origin-left -mr-6">
                    <CandlePatternFigure patternId={d.pattern_id} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{patternName(d.pattern_id)}</span>
                      <span className={`text-[10px] font-mono uppercase ${badge.color}`}>
                        {badge.icon} {d.type}
                      </span>
                      {/* The pattern's last candle has not closed. Its body is
                          still moving, so the shape that matched may not be
                          there in a minute — it must not look like a confirmed
                          detection. */}
                      {d.provisional && (
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/50 text-warn"
                          title={t('patProvisionalHint')}
                          data-testid={`live-pattern-provisional-${i}`}
                        >
                          {t('patProvisionalTag')}
                        </span>
                      )}
                    </div>
                    {/* Reliability stats (Bulkowski) — behavior · success rate · rank */}
                    {d.behavior && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border"
                          title={t('patBehaviorHint')}
                        >
                          {behaviorLabel(d.behavior)}
                        </span>
                        {typeof d.rate === 'number' && (
                          <span
                            className={`text-[11px] font-mono font-bold ${rateColor(d.rate)}`}
                            title={t('patRateHint')}
                          >
                            {d.rate}%
                          </span>
                        )}
                        {typeof d.rank === 'number' && (
                          <span
                            className="text-[10px] text-muted-foreground font-mono"
                            title={t('patRankHint')}
                          >
                            · #{d.rank}/103
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{d.date}</span>
                      <span className="opacity-60">·</span>
                      <span>O {d.ohlc.open.toFixed(2)}</span>
                      <span>H {d.ohlc.high.toFixed(2)}</span>
                      <span>L {d.ohlc.low.toFixed(2)}</span>
                      <span>C {d.ohlc.close.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.detections && data.detections.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {t('livePatternNoResults')}
          </div>
        )}

        {/* Reliability figures are approximate historical stats — not a promise. */}
        {data && data.detections && data.detections.length > 0 && (
          <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
            {t('patStatsNote')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default LivePatternDetector;
