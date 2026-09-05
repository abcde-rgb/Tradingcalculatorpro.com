import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { GUIDE_ITEMS } from '../../data/mockData';
import { X, Lightbulb } from 'lucide-react';

const GuideModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-caution" />
            <h2 className="text-base font-bold text-foreground">{t('guiaRapida_c32b2a')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-3">
          {GUIDE_ITEMS.map((item) => (
            <div
              key={item.t}
              className="bg-muted rounded-lg border border-border p-4 hover:border-border transition-colors"
            >
              <h4 className="text-sm font-bold text-primary mb-1.5">{t(item.t)}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(item.d)}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary/15 border border-primary/40 text-primary rounded-lg text-sm font-semibold hover:bg-primary/25 transition-colors"
          >
            {t('entendido_c32b2b')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
