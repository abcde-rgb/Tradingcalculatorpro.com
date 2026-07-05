import React, { useState, useCallback } from 'react';
import { Database, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { fetchAnalytics } from '@/services/performanceApi';

/**
 * Pulls the user's REAL trading stats from their journal (/performance/analytics)
 * and feeds them into a risk calculator, so Risk-of-Ruin / Kelly run on the
 * trader's actual win rate & R:R instead of hand-typed guesses.
 *
 * onLoad receives the analytics object:
 *   { win_rate, avg_win, avg_loss (negative), closed_trades, expectancy, ... }
 */
const JournalEdgeButton = ({ onLoad, testId = 'journal-edge-btn' }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok'|'warn', text }

  const pull = useCallback(async () => {
    if (!isAuthenticated) { setStatus({ type: 'warn', text: t('edgeNotLogged') }); return; }
    setLoading(true);
    setStatus(null);
    try {
      const { analytics } = await fetchAnalytics();
      const n = analytics?.closed_trades || 0;
      if (!analytics || n < 1) { setStatus({ type: 'warn', text: t('edgeNoData') }); setLoading(false); return; }
      onLoad(analytics);
      const smallSample = n < 100;
      setStatus({
        type: smallSample ? 'warn' : 'ok',
        text: t('edgeLoaded').replace('{n}', n) + (smallSample ? ' · ' + t('edgeSampleWarn') : ''),
      });
    } catch (e) {
      setStatus({ type: 'warn', text: t('edgeNotLogged') });
    }
    setLoading(false);
  }, [isAuthenticated, onLoad, t]);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={pull}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        data-testid={testId}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
        {t('edgeUseJournal')}
      </button>
      {status && (
        <p className={`flex items-start gap-1 text-[10px] leading-snug ${status.type === 'ok' ? 'text-green-500' : 'text-amber-500'}`} data-testid={`${testId}-status`}>
          {status.type === 'ok'
            ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            : <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
          <span>{status.text}</span>
        </p>
      )}
    </div>
  );
};

export default JournalEdgeButton;
