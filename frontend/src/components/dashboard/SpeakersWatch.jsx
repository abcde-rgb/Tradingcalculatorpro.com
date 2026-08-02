import { Megaphone, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { FlagIcon } from '@/components/common/FlagIcon';
import { SPEAKERS } from '@/lib/macroCalendar';

/**
 * SpeakersWatch — the people who move price by talking.
 *
 * A data calendar misses half the risk: a Fed press conference or an
 * unscheduled tariff announcement moves more than most scheduled prints.
 * Coverage is deliberately international — someone trading FX needs all four
 * major central banks, not only the US one.
 */
export const SpeakersWatch = () => {
  const { locale, t } = useTranslation();
  const lang = locale === 'es' ? 'es' : 'en';

  return (
    <Card className="bg-card border-border" data-testid="speakers-watch">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="w-4 h-4 text-amber-500" /> {t('speakersTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {SPEAKERS.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border bg-muted/20 p-3 hover:border-amber-500/50 transition-colors group"
                data-testid={`speaker-${s.id}`}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon code={s.country} className="w-5 h-[13px]" />
                  <span className="font-semibold text-sm flex-1 min-w-0 truncate">{s.who[lang]}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors shrink-0" />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.when[lang]}</div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border/50">
                  {s.moves[lang]}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default SpeakersWatch;
