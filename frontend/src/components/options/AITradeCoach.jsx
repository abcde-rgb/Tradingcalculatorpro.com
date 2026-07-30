import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * AI Trade Coach — sends current strategy context to Claude Sonnet 4.5
 * and displays natural-language analysis with strengths/risks/improvements/verdict.
 */
const AITradeCoach = ({ symbol, stock, legs, stats, greeks, daysToExpiry, ivRank, balance, synthetic }) => {
  const { t, locale } = useTranslation();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!stock || !legs || legs.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/options/ai-analyze`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          stockPrice: stock.price,
          legs: legs.map((l) => ({
            type: l.type, action: l.action,
            quantity: l.quantity || 1, strike: l.strike,
            premium: l.premium || 0, iv: l.iv || 0.3,
          })),
          stats: {
            maxProfit: stats.maxProfit, maxLoss: stats.maxLoss,
            pop: stats.pop, roi: stats.roi, rr: stats.rr,
            capitalRequired: stats.capitalRequired,
            isMaxLossUnlimited: stats.isMaxLossUnlimited,
            isMaxProfitUnlimited: stats.isMaxProfitUnlimited,
          },
          greeks: greeks || null,
          ivRank: ivRank ?? null,
          daysToExpiry: daysToExpiry || 30,
          userBalance: balance || null,
          // El backend acepta `locale` desde el PR #153, pero nadie se lo
          // enviaba: el coach respondía siempre en español en una web de 8
          // idiomas. Y si la cadena que valoró la operación es modelada, que lo
          // diga en vez de analizarla como si fuera mercado.
          locale: locale || 'es',
          synthetic: Boolean(synthetic),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || t('errorAnalyze'));
      const d = await res.json();
      setAnalysis(d.analysis);
    } catch (e) {
      setError(e.message || t('errorUnknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#a855f7]/5 via-card to-[#6366f1]/5 border border-[#a855f7]/30 rounded-xl p-4" data-testid="ai-trade-coach">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c084fc]" />
          <h4 className="text-sm font-bold text-foreground">AI Trade Coach</h4>
          <span className="text-[9px] bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#c084fc] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Claude Sonnet 4.5</span>
        </div>
        <button
          onClick={analyze}
          disabled={loading || !legs?.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#c084fc] text-xs font-bold hover:bg-[#a855f7]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="ai-analyze-btn"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('aiCoachAnalyzing_91e0e9')}</> : analysis ? <><RefreshCw className="w-3.5 h-3.5" /> {t('aiCoachReanalyze_91e0ea')}</> : <><Sparkles className="w-3.5 h-3.5" /> {t('analizarEstaOperacion_804981')}</>}
        </button>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 text-xs text-[#f87171]">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (() => {
        const parts = t('aiCoachIntro_91e0e7').split('{analyzeBold}');
        return (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {parts[0]}
            <span className="text-[#c084fc] font-semibold">{t('aiCoachAnalyze_91e0e8')}</span>
            {parts[1]}
          </p>
        );
      })()}

      {analysis && (
        <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed text-foreground/90">
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => <p className="mb-2 text-foreground/85" {...props} />,
              strong: ({ node, ...props }) => <strong className="text-foreground font-bold" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc ml-5 space-y-1 mb-3 text-muted-foreground" {...props} />,
              li: ({ node, ...props }) => <li className="text-foreground/80" {...props} />,
              h1: ({ node, ...props }) => <h4 className="text-sm font-bold mt-3 mb-1.5 text-foreground" {...props} />,
              h2: ({ node, ...props }) => <h4 className="text-sm font-bold mt-3 mb-1.5 text-foreground" {...props} />,
              h3: ({ node, ...props }) => <h4 className="text-sm font-bold mt-3 mb-1.5 text-foreground" {...props} />,
            }}
          >
            {analysis}
          </ReactMarkdown>
          <p className="text-[9px] text-muted-foreground/60 mt-3 italic">
            {t('aiCoachDisclaimer_91e0eb')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AITradeCoach;
