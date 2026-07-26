import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

/**
 * Wraps a section that is "under construction":
 *  - renders its children blurred, low-opacity and non-interactive (kept, not deleted)
 *  - shows a clickable badge over it
 *  - on click, opens an overlay with a "we're working on it" message
 *
 * The real content stays in the DOM (aria-hidden) so it can be re-enabled later
 * by simply removing this wrapper.
 *
 * Props:
 *  - children: the real (blurred) content
 *  - label:    optional badge text override
 *  - message:  optional overlay copy override (the default talks about legal
 *              content by country, which doesn't fit every section)
 */
export default function WipSection({ children, label, message }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-testid="wip-section">
      {/* Real content — kept but blurred and inert */}
      <div className="blur-[3px] opacity-40 select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>

      {/* Clickable overlay + badge */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group"
        data-testid="wip-overlay"
        aria-label={t('wipTitle')}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 backdrop-blur-sm shadow-sm group-hover:bg-amber-500/20 transition-colors">
          <Wrench className="w-4 h-4" />
          {label || t('wipBadge')}
        </span>
      </button>

      {/* Message overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="bg-card border border-border rounded-xl max-w-md w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
              data-testid="wip-modal"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Wrench className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('wipTitle')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{message || t('wipMessage')}</p>
              <Button onClick={() => setOpen(false)} className="w-full" data-testid="wip-ok">
                {t('wipOk')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
