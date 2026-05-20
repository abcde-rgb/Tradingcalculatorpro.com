import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const CONSENT_KEY = 'tcp-cookie-consent'; // 'all' | 'essential' | null

export function getCookieConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function applyConsent(level) {
  try {
    localStorage.setItem(CONSENT_KEY, level);
  } catch {}

  const granted = level === 'all' ? 'granted' : 'denied';

  // Google Consent Mode v2
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: granted,
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  // PostHog — opt in/out
  if (window.posthog) {
    if (level === 'all') {
      window.posthog.opt_in_capturing();
    } else {
      window.posthog.opt_out_capturing();
    }
  }
}

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getCookieConsent();
    if (!stored) {
      // Slight delay so it doesn't flash before hydration
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    // Re-apply stored consent on every load (e.g. for PostHog opt-out persistence)
    applyConsent(stored);
  }, []);

  function handleAcceptAll() {
    applyConsent('all');
    setVisible(false);
  }

  function handleEssentialOnly() {
    applyConsent('essential');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('cookieBannerTitle')}
      className="fixed bottom-0 left-0 right-0 z-[9998] p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5 sm:mt-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-1">
            {t('cookieBannerTitle')}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('cookieBannerDesc')}{' '}
            <Link
              to="/legal?tab=cookies"
              className="text-primary hover:underline whitespace-nowrap"
            >
              {t('cookiePolicyLink')}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleEssentialOnly}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {t('cookieEssentialOnly')}
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('cookieAcceptAll')}
          </button>
          <button
            onClick={handleEssentialOnly}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
