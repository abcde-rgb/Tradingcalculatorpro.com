import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useThemeStore } from '@/lib/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

// Same locale mapping the TradingView chart uses.
const TV_LOCALE_MAP = {
  es: 'es', en: 'en', de: 'de_DE', fr: 'fr', ru: 'ru', zh: 'zh_CN', ja: 'ja', ar: 'ar_AE',
};

/**
 * Live economic calendar via TradingView's free events widget (iframe embed,
 * no API key). Shows medium/high-impact releases; theme & locale follow the app.
 */
export const EconomicCalendar = () => {
  const { locale, t } = useTranslation();
  const { theme } = useThemeStore();

  const src = useMemo(() => {
    const isDark = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : theme === 'dark';
    const cfg = {
      colorTheme: isDark ? 'dark' : 'light',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: TV_LOCALE_MAP[locale] || 'en',
      importanceFilter: '0,1', // medium + high impact only
    };
    return `https://s.tradingview.com/embed-widget/events/?locale=${cfg.locale}#${encodeURIComponent(JSON.stringify(cfg))}`;
  }, [locale, theme]);

  return (
    <Card className="bg-card border-border" data-testid="economic-calendar">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" /> {t('econCalTitle')}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">TradingView</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-border/60" style={{ height: 420 }}>
          <iframe
            key={src}
            src={src}
            title="Economic calendar"
            style={{ width: '100%', height: '100%', border: 0 }}
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  );
};
