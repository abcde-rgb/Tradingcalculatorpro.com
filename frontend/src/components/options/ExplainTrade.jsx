import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Lightbulb } from 'lucide-react';

/**
 * Auto-generated educational explanation of the current strategy.
 * Rules-based (no LLM) — deterministic bullets based on legs topology.
 */
const ExplainTrade = ({ legs, stock, breakEvens, stats }) => {
  const { t } = useTranslation();
  if (!legs || legs.length === 0 || !stock) return null;

  const fmt = (tpl, params) => Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, v), tpl
  );

  const bullets = [];
  const optionLegs = legs.filter((l) => l.type !== 'stock');
  const calls = optionLegs.filter((l) => l.type === 'call');
  const puts = optionLegs.filter((l) => l.type === 'put');
  const longs = optionLegs.filter((l) => l.action === 'buy');
  const shorts = optionLegs.filter((l) => l.action === 'sell');

  // 1) Direction narrative
  const netDelta = optionLegs.reduce((s, l) => {
    const mult = l.action === 'buy' ? 1 : -1;
    const dirDelta = l.type === 'call' ? 0.5 : -0.5; // rough proxy
    return s + mult * dirDelta * (l.quantity || 1);
  }, 0);
  const be = breakEvens?.[0] ?? stock.price.toFixed(2);
  if (netDelta > 0.3) {
    bullets.push({
      icon: '↑',
      text: fmt(t('bullishBias_91e0ec'), { symbol: stock.symbol, be }),
      color: 'text-long',
    });
  } else if (netDelta < -0.3) {
    bullets.push({
      icon: '↓',
      text: fmt(t('bearishBias_91e0ed'), { symbol: stock.symbol, be }),
      color: 'text-short',
    });
  } else {
    const berange = breakEvens?.length > 1
      ? fmt(t('neutralBreakEvens_91e0ef'), { be1: breakEvens[0], be2: breakEvens[breakEvens.length - 1] })
      : '';
    bullets.push({
      icon: '→',
      text: fmt(t('neutralBias_91e0ee'), { symbol: stock.symbol, berange }),
      color: 'text-caution',
    });
  }

  // 2) Theta / time decay narrative
  const longsVsShorts = longs.length - shorts.length;
  if (longsVsShorts > 0) {
    bullets.push({ icon: '⏰', text: t('thetaNegative_91e0f0'), color: 'text-short' });
  } else if (longsVsShorts < 0) {
    bullets.push({ icon: '⏰', text: t('thetaPositive_91e0f1'), color: 'text-long' });
  } else {
    bullets.push({ icon: '⏰', text: t('thetaNeutral_91e0f2'), color: 'text-caution' });
  }

  // 3) Max Loss / Risk narrative
  if (stats?.isMaxLossUnlimited) {
    const up = calls.some((c) => c.action === 'sell' && !calls.some((cc) => cc.action === 'buy' && cc.strike > c.strike));
    bullets.push({
      icon: '⚠',
      text: up ? t('unlimitedRiskUp_91e0f3') : t('unlimitedRiskDown_91e0f4'),
      color: 'text-short',
    });
  } else if (stats?.maxLoss) {
    const ml = parseFloat(stats.maxLoss);
    bullets.push({
      icon: '🛡',
      text: fmt(t('maxLossDefined_91e0f5'), { amount: Math.abs(ml).toFixed(0) }),
      color: 'text-compare',
    });
  }

  // 4) Assignment risk (short options)
  if (shorts.length > 0) {
    const shortPut = puts.find((p) => p.action === 'sell');
    const shortCall = calls.find((c) => c.action === 'sell');
    if (shortPut) {
      bullets.push({
        icon: '📋',
        text: fmt(t('assignPut_91e0f6'), { symbol: stock.symbol, strike: shortPut.strike }),
        color: 'text-muted-foreground',
      });
    } else if (shortCall) {
      bullets.push({
        icon: '📋',
        text: fmt(t('assignCall_91e0f7'), { symbol: stock.symbol, strike: shortCall.strike }),
        color: 'text-muted-foreground',
      });
    }
  }

  // 5) IV context
  const avgIV = optionLegs.length ? optionLegs.reduce((s, l) => s + (l.iv || 0.3), 0) / optionLegs.length : 0;
  const ivPct = (avgIV * 100).toFixed(0);
  if (longsVsShorts > 0 && avgIV > 0.5) {
    bullets.push({
      icon: '⌬',
      text: fmt(t('ivHighLong_91e0f8'), { iv: ivPct }),
      color: 'text-short',
    });
  } else if (longsVsShorts < 0 && avgIV > 0.5) {
    bullets.push({
      icon: '⌬',
      text: fmt(t('ivHighShort_91e0f9'), { iv: ivPct }),
      color: 'text-long',
    });
  }

  return (
    <div className="bg-card/60 border border-border/60 rounded-xl p-3.5" data-testid="explain-trade">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-warn" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-warn">{t('entiendeEstaOperacion_11df0f')}</span>
      </div>
      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={`${b.icon}-${i}`} className="flex items-start gap-2 text-xs leading-relaxed">
            <span className={`${b.color} font-bold flex-shrink-0 w-4`}>{b.icon}</span>
            <span className="text-foreground">{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExplainTrade;
