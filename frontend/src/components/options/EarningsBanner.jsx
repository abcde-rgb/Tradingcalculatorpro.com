import React from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Earnings warning banner — shown only when an earnings event falls
 * within the currently-selected expiration window (IV-crush risk).
 */
const EarningsBanner = ({ nextEarnings, daysToExpiry }) => {
  const { t } = useTranslation();
  if (!nextEarnings || !daysToExpiry) return null;

  const daysToEarnings = Math.ceil(
    (new Date(nextEarnings).getTime() - Date.now()) / 86400000
  );
  if (daysToEarnings < 0 || daysToEarnings > daysToExpiry) return null;

  const whenLabel =
    daysToEarnings === 0
      ? t('earningsToday_1f0e11')
      : t('earningsInDays_1f0e12').replace('{n}', daysToEarnings);

  return (
    <div
      className="mx-3 mt-2 bg-warn/10 border border-warn/40 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[11px]"
      data-testid="earnings-warning"
    >
      <span className="text-base leading-none">📊</span>
      <span className="text-warn font-semibold">Earnings {nextEarnings}</span>
      <span className="text-muted-foreground">
        ({whenLabel}) — {t('earningsWithinExpiry_1f0e13').replace('{n}', daysToExpiry)}
      </span>
    </div>
  );
};

export default EarningsBanner;
