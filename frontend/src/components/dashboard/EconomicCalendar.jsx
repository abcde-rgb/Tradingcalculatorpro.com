import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { TVEvents } from '@/components/charts/TVWidget';

/**
 * Live economic calendar via TradingView's free events widget (no API key).
 * Theme & locale follow the app through the shared TVWidget loader.
 * Shows medium/high-impact releases only.
 */
export const EconomicCalendar = () => {
  const { t } = useTranslation();

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
        <TVEvents height={420} title={t('econCalTitle')} />
      </CardContent>
    </Card>
  );
};
