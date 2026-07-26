import { useEffect, useMemo, useState } from 'react';
import { Timer, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { FlagIcon } from '@/components/common/FlagIcon';
import { getUpcomingEvents } from '@/lib/macroCalendar';

/**
 * NextDataCountdown — "how long until the next release that can move me?"
 *
 * The economic-calendar widget answers "what is scheduled"; this answers the
 * question a trader actually asks before sizing a position. Flag, live
 * countdown, what the print usually moves, and a link to the source for the
 * figure itself (we never publish a number we did not measure).
 */

const pad = (n) => String(n).padStart(2, '0');

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const ms = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    done: ms === 0,
  };
}

export const NextDataCountdown = () => {
  const { locale, t } = useTranslation();
  const lang = locale === 'es' ? 'es' : 'en';

  // Recompute the schedule every minute so the list rolls over on its own.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const events = useMemo(() => getUpcomingEvents(new Date(), 6), [tick]);

  const next = events[0];
  const cd = useCountdown(next?.at);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }),
    [locale]
  );

  if (!next) return null;

  return (
    <Card className="bg-card border-border" data-testid="next-data-countdown">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" /> {t('macroNextTitle')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline event */}
        <a
          href={next.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-primary/40 bg-primary/5 p-4 hover:border-primary transition-colors group"
          data-testid="macro-next-event"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FlagIcon code={next.country} className="w-6 h-4" title={next.country} />
              <span className="font-semibold text-sm truncate">{next.name[lang]}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant={next.impact === 'high' ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {next.impact === 'high' ? t('macroHigh') : t('macroMedium')}
              </Badge>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          {cd && (
            <div className="flex items-baseline gap-1.5 mt-3 font-mono font-bold tabular-nums">
              {cd.days > 0 && (
                <>
                  <span className="text-2xl text-primary">{cd.days}</span>
                  <span className="text-xs text-muted-foreground mr-1">d</span>
                </>
              )}
              <span className="text-2xl text-primary">{pad(cd.hours)}</span>
              <span className="text-xs text-muted-foreground">h</span>
              <span className="text-2xl text-primary">{pad(cd.minutes)}</span>
              <span className="text-xs text-muted-foreground">m</span>
              <span className="text-2xl text-primary">{pad(cd.seconds)}</span>
              <span className="text-xs text-muted-foreground">s</span>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            {next.approx && '≈ '}{dateFmt.format(next.at)}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mt-2.5 pt-2.5 border-t border-border/60">
            {next.moves[lang]}
          </p>
        </a>

        {/* The queue behind it */}
        <ul className="space-y-1.5">
          {events.slice(1).map((ev) => (
            <li key={ev.id}>
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-xs"
              >
                <FlagIcon code={ev.country} className="w-4 h-[11px]" />
                <span className="truncate flex-1">{ev.name[lang]}</span>
                {ev.impact === 'high' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title={t('macroHigh')} />
                )}
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  {ev.approx && '≈'}{dateFmt.format(ev.at)}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="text-[10px] text-muted-foreground leading-relaxed flex gap-1.5 pt-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{t('macroDisclaimer')}</span>
        </p>
      </CardContent>
    </Card>
  );
};

export default NextDataCountdown;
