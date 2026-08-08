import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import margexLogo from '@/assets/partners/margex-square.png';
import hyperliquidLogo from '@/assets/partners/hyperliquid-square.svg';

const FADE_UP_VIEW = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } };

// Affiliate / referral partners. Add new entries here — each renders as a
// clickable card that opens the referral link in a new tab.
const PARTNERS = [
  {
    id: 'margex',
    name: 'Margex',
    url: 'https://margex.com/?rid=44932212',
    image: margexLogo,
    descKey: 'partnerMargexDesc',
  },
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    // TODO(pendiente): reemplazar por el enlace de referido real de Hyperliquid
    // cuando el usuario lo facilite. Y sustituir el logo placeholder (SVG) por el
    // oficial (hyperliquid-square.png). Ver docs/PENDIENTES.md.
    url: 'https://app.hyperliquid.xyz/',
    image: hyperliquidLogo,
    descKey: 'partnerHyperliquidDesc',
  },
];

export const RecommendedTools = () => {
  const { t } = useTranslation();

  if (PARTNERS.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-card/50" data-testid="recommended-tools">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">{t('partnersTitle')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('partnersSubtitle')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {PARTNERS.map((partner) => (
            <motion.a
              key={partner.id}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              {...FADE_UP_VIEW}
              className="group block w-full sm:w-72 rounded-xl overflow-hidden border border-border bg-background hover:border-primary/50 transition-colors"
              data-testid={`partner-card-${partner.id}`}
            >
              <img
                src={partner.image}
                alt={partner.name}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold">{partner.name}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">{t(partner.descKey)}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t('sponsoredLabel')}
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedTools;
