import { useState } from 'react';
import { CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Fill-in-the-blank example for a glossary term.
 * The example sentence lives in i18n as `gl{n}fill` and must contain the token `___`
 * where the term goes. The answer is the term itself (`gl{n}t`), so no extra
 * translated answer string is needed.
 *
 * Only the term numbers listed in FILL_TERMS render an example; the rest return null
 * (same graceful-skip pattern as GlossaryVisual).
 */
export const FILL_TERMS = new Set([
  1, 2, 7, 28, 29, 30,          // core existing: spread, slippage, leverage, support, resistance, trend
  61, 62, 63, 64, 65, 66, 67, 68, // new: accumulation, distribution, swing, scalping, market structure, order block, FVG, top-down
]);

export function hasFillExample(n) {
  return FILL_TERMS.has(n);
}

// Accent/case-insensitive comparison so "acumulacion" matches "Acumulación".
const norm = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export default function FillBlanksExample({ n }) {
  const { t } = useTranslation();
  const [val, setVal] = useState('');
  const [revealed, setRevealed] = useState(false);

  if (!hasFillExample(n)) return null;

  const sentence = t(`gl${n}fill`);
  const answer = t(`gl${n}t`);
  // If the sentence key isn't translated (falls back to the key) or lacks a blank, skip.
  if (!sentence || sentence === `gl${n}fill` || !sentence.includes('___')) return null;

  const [before, after] = sentence.split('___');
  const correct = norm(val).length > 0 &&
    (norm(answer).includes(norm(val)) || norm(val).includes(norm(answer)));

  return (
    <div
      className="mt-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5 text-xs"
      data-testid={`fill-blank-${n}`}
    >
      <p className="text-muted-foreground leading-relaxed mb-2">
        {before}
        {revealed ? (
          <b className="text-primary">{answer}</b>
        ) : (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="mx-1 w-28 rounded border border-border bg-background px-1.5 py-0.5 text-foreground align-middle"
            placeholder="…"
            aria-label={t('fillPrompt')}
            data-testid={`fill-input-${n}`}
          />
        )}
        {after}
      </p>
      <div className="flex items-center gap-3 min-h-[1.25rem]">
        {!revealed && correct && (
          <span className="inline-flex items-center gap-1 text-long dark:text-long font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t('fillCorrect')}
          </span>
        )}
        {!revealed && !correct && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            data-testid={`fill-reveal-${n}`}
          >
            <Eye className="w-3.5 h-3.5" /> {t('fillReveal')}
          </button>
        )}
        {revealed && (
          <button
            type="button"
            onClick={() => { setRevealed(false); setVal(''); }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('fillRetry')}
          </button>
        )}
      </div>
    </div>
  );
}
