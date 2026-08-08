import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Download, Check, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import {
  onInstallAvailability, promptInstall, isStandalone, isIOS,
} from '@/lib/pwa';

/**
 * AppComingSoon — the app strip on the landing page.
 *
 * Two halves, on purpose:
 *  - LEFT: install the PWA today. This is real and works right now; it is also
 *    the technical prerequisite for all three stores (TWA for Play, PWABuilder
 *    for Microsoft Store, Capacitor for the App Store).
 *  - RIGHT: the store badges marked "coming soon".
 *
 * ⚠️ The badges are our own generic SVG renditions, NOT the official Google /
 * Apple / Microsoft artwork. Both Google and Apple prohibit using their badges
 * for apps that are not published yet. When the apps ship, swap these for the
 * official assets and put the real URLs in STORES[].href.
 */

const StoreBadge = ({ icon, top, bottom, soon }) => (
  <div
    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 min-w-[168px] ${
      soon
        ? 'border-border bg-muted/30'
        : 'border-primary/40 bg-primary/5 hover:border-primary transition-colors'
    }`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="leading-tight text-left">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{top}</span>
      <span className="block text-sm font-semibold">{bottom}</span>
    </span>
  </div>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
    <path d="M3.6 2.3a1 1 0 00-.6.9v17.6a1 1 0 00.6.9l9.5-9.7L3.6 2.3z" fill="#34a853" />
    <path d="M17.2 8.3L13.1 12l4.1 3.7 3.1-1.8c.9-.5.9-1.9 0-2.4l-3.1-1.8z" fill="#fbbc04" />
    <path d="M3.6 2.3l9.5 9.7 4.1-3.7L5.5 1.6c-.7-.4-1.5-.2-1.9.7z" fill="#ea4335" />
    <path d="M13.1 12l-9.5 9.7c.4.9 1.2 1.1 1.9.7l11.7-6.7-4.1-3.7z" fill="#4285f4" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
    <path d="M16.4 12.7c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.5-.1-2.8.8-3.6.8-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3 0 2.1-1.2 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.5-3.8zM14 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.5z" />
  </svg>
);

const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
    <path d="M3 5.6l8-1.1v7.2H3V5.6zM12 4.4l9-1.3v8.6h-9V4.4zM3 12.3h8v7.2l-8-1.1v-6.1zM12 12.3h9v8.6l-9-1.3v-7.3z" fill="#0078d4" />
  </svg>
);

export const AppComingSoon = () => {
  const { t } = useTranslation();
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    return onInstallAvailability(setInstallable);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) { setShowIOSHelp(true); return; }
    const outcome = await promptInstall();
    if (outcome === 'accepted') setInstalled(true);
  };

  const STORES = [
    { key: 'play', icon: <PlayIcon />, top: t('appSoonBadge'), bottom: 'Google Play' },
    { key: 'apple', icon: <AppleIcon />, top: t('appSoonBadge'), bottom: 'App Store' },
    { key: 'ms', icon: <WindowsIcon />, top: t('appSoonBadge'), bottom: 'Microsoft Store' },
  ];

  return (
    <section className="py-16 border-t border-border/60" data-testid="app-coming-soon">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Install now — this actually works today */}
          <div>
            <Badge variant="secondary" className="mb-3 gap-1.5">
              <Smartphone className="w-3 h-3" /> {t('appAvailableNow')}
            </Badge>
            <h2 className="font-unbounded text-2xl md:text-3xl font-bold mb-3">
              {t('appInstallTitle')}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 max-w-lg">
              {t('appInstallDesc')}
            </p>

            {installed ? (
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Check className="w-4 h-4" /> {t('appInstalled')}
              </div>
            ) : (
              <>
                {/* When the browser can't install (no beforeinstallprompt and
                    not iOS) this stays visible but reads as a note, not as a
                    dead primary CTA. */}
                <Button
                  size="lg"
                  onClick={handleInstall}
                  variant={installable || isIOS() ? 'default' : 'outline'}
                  className="gap-2"
                  data-testid="pwa-install-btn"
                  disabled={!installable && !isIOS()}
                >
                  <Download className="w-4 h-4" />
                  {installable || isIOS() ? t('appInstallCta') : t('appInstallUnavailable')}
                </Button>
                {showIOSHelp && (
                  <p className="mt-3 text-sm text-muted-foreground flex items-start gap-2 max-w-md">
                    <Share className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{t('appIOSHelp')}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Stores — coming soon */}
          <div>
            <Badge variant="outline" className="mb-3 gap-1.5">
              <Monitor className="w-3 h-3" /> {t('appSoonBadge')}
            </Badge>
            <h3 className="font-unbounded text-xl font-bold mb-3">{t('appStoresTitle')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-lg">
              {t('appStoresDesc')}
            </p>
            <div className="flex flex-wrap gap-3">
              {STORES.map((s) => (
                <StoreBadge key={s.key} icon={s.icon} top={s.top} bottom={s.bottom} soon />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">{t('appStoresNote')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppComingSoon;
