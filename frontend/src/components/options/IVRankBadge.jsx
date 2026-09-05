import React, { useEffect, useState } from 'react';
import { Flame, Snowflake, Minus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Compact IV Rank badge — shows current IV vs 52w range.
 * Color-coded: green (high → sell premium), red (low → buy premium), yellow (neutral).
 */
const IVRankBadge = ({ symbol }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/api/options/iv-rank/${symbol}`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) setData(d);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('IV rank fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  if (!data || !data.available) return null;

  // Map backend recommendation key to i18n keys
  const REC_MAP = {
    sell_premium: { label: 'ivRecSellPremium_ir001', reason: 'ivRecSellPremiumReason_ir002' },
    buy_premium: { label: 'ivRecBuyPremium_ir003', reason: 'ivRecBuyPremiumReason_ir004' },
    neutral: { label: 'ivRecNeutral_ir005', reason: 'ivRecNeutralReason_ir006' },
  };
  const rec = REC_MAP[data.recommendation] || REC_MAP.neutral;
  const recLabel = t(rec.label);
  const recReason = t(rec.reason);

  const rank = data.ivRank;
  const isHigh = rank >= 60;
  const isLow = rank <= 30;
  const Icon = isHigh ? Flame : isLow ? Snowflake : Minus;
  const palette = isHigh
    ? 'bg-long/15 border-long/40 text-long'
    : isLow
      ? 'bg-short/15 border-short/40 text-short'
      : 'bg-caution/15 border-caution/40 text-warn';

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${palette}`}
      title={`${recLabel} · ${recReason}\n${t('ivCurrent_iv004')}: ${(data.ivCurrent * 100).toFixed(1)}%\n${t('range52w_iv005')}: ${(data.ivLow52w * 100).toFixed(1)}% → ${(data.ivHigh52w * 100).toFixed(1)}%\n${t('percentile_iv006')}: ${data.ivPercentile}%`}
      data-testid="iv-rank-badge"
    >
      <Icon className="w-3 h-3" />
      <span>IV Rank</span>
      <span className="font-mono text-xs">{rank.toFixed(0)}%</span>
      <span className="hidden sm:inline text-[9px] opacity-80 uppercase">· {recLabel}</span>
    </div>
  );
};

export default IVRankBadge;
