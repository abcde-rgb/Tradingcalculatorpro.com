import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Generic "expand / close" modal for learning topics.
 * Mirrors the behavior of PatternDetailModal (candlestick patterns):
 *  - dark backdrop, click outside to close
 *  - scale-in animation, large scrollable panel
 *  - clear close (X) button
 * Wrap the render in <AnimatePresence> in the caller to get the exit animation.
 *
 * Props:
 *  - title:    string (required) — big heading
 *  - subtitle: string (optional) — muted line under the title
 *  - onClose:  () => void
 *  - children: modal body (diagram + explanation)
 */
export default function TopicDetailModal({ title, subtitle, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="bg-card border border-border rounded-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="topic-detail-modal"
      >
        <div className="p-6 lg:p-8">
          <div className="flex items-start justify-between mb-5 sticky top-0 bg-card/95 backdrop-blur-sm pb-3 -mt-2 -mx-2 px-2 z-10">
            <div className="min-w-0">
              <h2 className="text-2xl lg:text-3xl font-bold">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="topic-modal-close" aria-label={t('close')}
              aria-label="Close"
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
