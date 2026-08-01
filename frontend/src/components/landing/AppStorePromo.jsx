import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, Bell } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// Simple, theme-friendly monochrome store glyphs (inline SVG → no external assets,
// CSP-safe). These are teaser buttons: the native apps are not published yet, so each
// badge is clearly marked "coming soon" and is non-clickable. When the apps ship,
// swap these for the official store badges linking to the real listings.
const GooglePlayGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M3.6 2.3a1 1 0 0 0-.6.9v17.6a1 1 0 0 0 .6.9l9.9-9.7L3.6 2.3Zm11.3 7.9 2.9-1.7-3.4-2-2.3 2.3 2.8 1.4Zm0 3.6-2.8 1.4 2.3 2.3 3.4-2-2.9-1.7Zm4.3-2.5-2 1.2 2 1.2c.8-.5.8-1.9 0-2.4Z" />
  </svg>
);
const AppleGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.8-2.2-3.1ZM14.6 6.3c.6-.7 1-1.7.9-2.7-.8 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6.9.1 1.8-.5 2.5-1.2Z" />
  </svg>
);
const MicrosoftGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M3 3h8.5v8.5H3V3Zm9.5 0H21v8.5h-8.5V3ZM3 12.5h8.5V21H3v-8.5Zm9.5 0H21V21h-8.5v-8.5Z" />
  </svg>
);

const STORES = [
  { id: 'googleplay', Glyph: GooglePlayGlyph, store: 'Google Play', line1Key: 'appPromoAvailableOn' },
  { id: 'appstore', Glyph: AppleGlyph, store: 'App Store', line1Key: 'appPromoAvailableOn' },
  { id: 'microsoft', Glyph: MicrosoftGlyph, store: 'Microsoft Store', line1Key: 'appPromoAvailableOn' },
];

/**
 * "Coming soon to all your devices" — app/desktop teaser with store badges.
 * Native apps (Capacitor for mobile, Tauri for desktop) are on the roadmap; this
 * section captures interest and signals multiplatform intent. See
 * docs/AUDITORIA_INTEGRAL_2026-08-01.md §4.F.
 */
export default function AppStorePromo() {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-4" data-testid="app-store-promo">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-8 md:p-12 overflow-hidden">
          {/* subtle glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/30">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <Monitor className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {t('comingSoonBadge')}
              </span>
            </div>

            <h2 className="font-unbounded text-3xl md:text-4xl font-bold mb-4">
              {t('appPromoTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-2 leading-relaxed">
              {t('appPromoDesc')}
            </p>
            <p className="text-xs font-mono text-muted-foreground/70 mb-8 tracking-wide">
              {t('appPromoPlatforms')}
            </p>

            {/* Store badges (teaser, non-clickable until apps ship) */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {STORES.map(({ id, Glyph, store, line1Key }) => (
                <div
                  key={id}
                  role="img"
                  aria-label={`${store} — ${t('comingSoonBadge')}`}
                  data-testid={`store-badge-${id}`}
                  className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-background/80 opacity-80 select-none cursor-default"
                  title={t('comingSoonBadge')}
                >
                  <Glyph className="w-7 h-7 text-foreground shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t(line1Key)}
                    </div>
                    <div className="text-sm font-bold text-foreground">{store}</div>
                  </div>
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded bg-primary text-black text-[8px] font-bold uppercase tracking-wider shadow">
                    {t('comingSoonBadgeShort')}
                  </span>
                </div>
              ))}
            </div>

            <Link to="/contact">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold cursor-pointer"
                data-testid="app-notify-btn"
              >
                <Bell className="w-4 h-4" />
                {t('appPromoNotify')}
              </motion.span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
