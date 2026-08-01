import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, GraduationCap, ChevronDown, Ruler, HelpCircle, Lightbulb, BarChart3, Target } from 'lucide-react';
import TopicDetailModal from './TopicDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useThemeStore, resolveMode } from '@/lib/theme';
import { MARKET_TYPE_DETAILS } from '@/data/marketTypeDetails';

const TV_LOCALE_MAP = {
  es: 'es', en: 'en', de: 'de_DE', fr: 'fr', ru: 'ru', zh: 'zh_CN', ja: 'ja', ar: 'ar_AE',
};

/**
 * Interactive detail modal for a market type (forex, stocks, crypto, …).
 * Opens when a market-type card in Education → Fundamentals is clicked.
 * Combines: localized summary + how-it's-measured + live TradingView widget +
 * FAQ (English, for SEO) + a worked example + deep-links to the right calculator
 * and to the in-app deep-dive module.
 *
 * Props:
 *  - market:      { id, name, desc, volume, icon }  (already localized)
 *  - onClose:     () => void
 *  - onLearnMore: (topicId) => void   (switches the Education tab)
 */
export default function MarketTypeDetailModal({ market, onClose, onLearnMore }) {
  const { t, locale } = useTranslation();
  const { theme } = useThemeStore();
  const [openFaq, setOpenFaq] = useState(0);

  const detail = MARKET_TYPE_DETAILS[market?.id];

  const tvSrc = useMemo(() => {
    if (!detail?.tv) return null;
    const isDark = resolveMode(theme) === 'dark';
    const cfg = {
      ...detail.tv.config,
      colorTheme: isDark ? 'dark' : 'light',
      locale: TV_LOCALE_MAP[locale] || 'en',
    };
    return `https://s.tradingview.com/embed-widget/${detail.tv.name}/?locale=${cfg.locale}#${encodeURIComponent(JSON.stringify(cfg))}`;
  }, [detail, theme, locale]);

  if (!market || !detail) return null;

  const calcHref = detail.calcTab ? `/dashboard?tab=${detail.calcTab}` : null;

  return (
    <TopicDetailModal
      title={`${market.icon} ${market.name}`}
      subtitle={market.desc}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Volume / size badge */}
        {market.volume && (
          <div>
            <Badge variant="secondary" className="text-xs">{market.volume}</Badge>
          </div>
        )}

        {/* How it's measured + units */}
        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold mb-2">
            <Ruler className="w-4 h-4 text-primary" /> {t('mktModalHowMeasured')}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{detail.howMeasured}</p>
          {detail.units && (
            <p className="text-xs text-foreground/80 mt-3">
              <span className="font-semibold">{t('mktModalUnits')}:</span> {detail.units}
            </p>
          )}
        </section>

        {/* Live data — TradingView widget */}
        {tvSrc && (
          <section>
            <h3 className="flex items-center justify-between text-sm font-bold mb-2">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> {t('mktModalLiveData')}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">TradingView</span>
            </h3>
            <div className="rounded-lg overflow-hidden border border-border/60" style={{ height: 320 }}>
              <iframe
                key={tvSrc}
                src={tvSrc}
                title={`${market.name} live data`}
                style={{ width: '100%', height: '100%', border: 0 }}
                loading="lazy"
              />
            </div>
          </section>
        )}

        {/* FAQ (English — targets Google featured snippets) */}
        {detail.faqs?.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold mb-1">
              <HelpCircle className="w-4 h-4 text-primary" /> {t('mktModalFaq')}
            </h3>
            <p className="text-[10px] text-muted-foreground/70 italic mb-3">{t('mktModalEnNote')}</p>
            <div className="space-y-2">
              {detail.faqs.map((f, i) => (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                    data-testid={`mkt-faq-${market.id}-${i}`}
                  >
                    <span className="text-sm font-semibold">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Worked example */}
        {detail.example && (
          <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold mb-2">
              <Lightbulb className="w-4 h-4 text-primary" /> {t('mktModalExample')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{detail.example}</p>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
          {detail.optionsLink && (
            <Link to="/options" onClick={onClose}>
              <Button className="gap-2" data-testid={`mkt-go-options-${market.id}`}>
                <Target className="w-4 h-4" /> {t('mktModalGoOptions')}
              </Button>
            </Link>
          )}
          {calcHref && (
            <Link to={calcHref} onClick={onClose}>
              <Button className="gap-2" data-testid={`mkt-open-calc-${market.id}`}>
                <Calculator className="w-4 h-4" /> {t('mktModalOpenCalc')}
              </Button>
            </Link>
          )}
          {detail.learnTopic && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onLearnMore?.(detail.learnTopic)}
              data-testid={`mkt-learn-${market.id}`}
            >
              <GraduationCap className="w-4 h-4" /> {t('mktModalLearnMore')}
            </Button>
          )}
        </div>
      </div>
    </TopicDetailModal>
  );
}
