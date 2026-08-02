import { Link } from 'react-router-dom';
import { TrendingUp, Sun, Moon, Globe, Mail, CandlestickChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation, languages } from '@/lib/i18n';
import { FlagIcon, LOCALE_FLAG } from '@/components/common/FlagIcon';
import { useThemeStore } from '@/lib/theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Official X (formerly Twitter) logo — lucide-react still ships the old bird icon
const XLogo = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Official YouTube "play" logo
const YoutubeLogo = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// LinkedIn "in" mark. Hand-rolled for the same reason as X and YouTube above:
// lucide dropped every brand icon in v1, so `Linkedin` no longer exists.
const LinkedinLogo = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  </svg>
);

// TradingView logo mark (stylized candlestick chart)
const TradingViewLogo = (props) => <CandlestickChart {...props} />;

/**
 * Global footer used across all authenticated/public pages.
 * Uses i18n strings from LandingPage for consistency.
 */
export function Footer() {
  const { t, locale, setLocale } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 py-12 px-4 border-t border-border bg-card/30 backdrop-blur-sm" data-testid="site-footer">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">{t('appName') || 'Trading Calculator PRO'}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
            <div className="flex items-center gap-2 mt-5">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="X (formerly Twitter)" data-testid="footer-x" asChild>
                <a href="https://x.com" target="_blank" rel="noreferrer">
                  <XLogo className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="YouTube" data-testid="footer-youtube" asChild>
                <a href="https://youtube.com" target="_blank" rel="noreferrer">
                  <YoutubeLogo className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="TradingView" data-testid="footer-tradingview" asChild>
                <a href="https://tradingview.com" target="_blank" rel="noreferrer">
                  <TradingViewLogo className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="LinkedIn" data-testid="footer-linkedin" asChild>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                  <LinkedinLogo className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Email" data-testid="footer-email" asChild>
                <a href="mailto:contact@tradingcalculatorpro.com">
                  <Mail className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/90">{t('product')}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/dashboard" className="hover:text-primary transition-colors" data-testid="footer-dashboard">{t('dashboard') || 'Dashboard'}</Link></li>
              <li><Link to="/options" className="hover:text-primary transition-colors" data-testid="footer-options">{t('options')}</Link></li>
              <li><Link to="/pricing" className="hover:text-primary transition-colors" data-testid="footer-pricing">{t('pricing') || 'Precios'}</Link></li>
              <li><Link to="/subscription" className="hover:text-primary transition-colors" data-testid="footer-subscription">{t('subscription')}</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/90">{t('resources')}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/education" className="hover:text-primary transition-colors" data-testid="footer-education">{t('educationCenter')}</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">{t('about') || 'Sobre nosotros'}</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">{t('support') || 'Contacto'}</Link></li>
              <li><Link to="/options" className="hover:text-primary transition-colors">{t('optionsAcademy')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/90">{t('legal')}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/legal" className="hover:text-primary transition-colors">{t('terms') || 'Términos de uso'}</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">{t('privacyPolicy') || 'Privacidad'}</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">{t('cookies') || 'Cookies'}</Link></li>
              <li><Link to="/legal?tab=risk" className="hover:text-primary transition-colors">{t('riskWarning') || 'Advertencia de riesgo'}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
            <p className="text-muted-foreground text-xs">
              © {year} {t('appName')}. {t('allRightsReserved')}.
            </p>
            <span className="hidden md:inline text-muted-foreground/40">·</span>
            <p className="text-muted-foreground/70 text-[11px] max-w-xl leading-snug">
              {t('disclaimer')} {t('dataAttribution')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9" aria-label={t('themeAriaLabel')}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('languageAriaLabel')} data-testid="footer-language-toggle">
                  <Globe className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLocale(lang.code)}
                    className={locale === lang.code ? 'bg-primary/10' : ''}
                  >
                    <FlagIcon code={LOCALE_FLAG[lang.code]} title={lang.name} className="w-5 h-[13px] mr-2" /> {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
