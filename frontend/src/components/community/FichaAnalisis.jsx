import { useTranslation } from '@/lib/i18n';
import { Regleta } from '@/components/ui/regleta';

/**
 * El análisis adjunto a un mensaje del foro.
 *
 * Lo que hace distinta a esta ficha de una captura de pantalla es que los
 * números están estructurados: el R:R lo calculó el servidor sobre entrada,
 * stop y objetivo, y **cuando no se puede calcular sale «—» y el porqué**, no
 * un cero. Un R indefinido pintado como 0 arrastraría la media de la comunidad
 * y falsearía la distribución — es el invariante de honestidad del producto
 * (CLAUDE.md § 2) aplicado aquí.
 *
 * La regleta sólo aparece si hay entrada y stop, que es cuando mide algo.
 */
export default function FichaAnalisis({ analysis, locale = 'es', compacta = false }) {
  const { t } = useTranslation();
  if (!analysis?.symbol) return null;

  const { symbol, side, entry, stop, target, rr, rrUndefinedReason, timeframe, note } = analysis;
  const esLargo = side !== 'short';
  const num = (v, dec = 5) => (Number.isFinite(v)
    ? Number(v).toLocaleString(locale, { maximumFractionDigits: dec })
    : '—');

  return (
    <figure className="mt-3 rounded-sharp border border-rule bg-muted/40">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-3 py-2">
        <span className="font-mono text-sm font-semibold tracking-tight">{symbol}</span>
        <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${esLargo ? 'text-long' : 'text-short'}`}>
          {esLargo ? t('comunidadLargo') : t('comunidadCorto')}
        </span>
        {timeframe ? (
          <span className="font-mono text-[11px] text-muted-foreground">{timeframe}</span>
        ) : null}
        <span className="ml-auto font-mono text-sm">
          {rr == null ? (
            /* «—» con su motivo, nunca 0. Ver la cabecera de este fichero. */
            <span
              className="text-muted-foreground"
              title={t(`comunidadRrMotivo_${rrUndefinedReason || 'desconocido'}`)}
            >
              {t('comunidadRr')} —
            </span>
          ) : (
            <span>{t('comunidadRr')} {num(rr, 2)}</span>
          )}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-px bg-rule">
        <div className="bg-card px-3 py-2">
          <dt className="text-[9.5px] uppercase tracking-[0.07em] text-muted-foreground">{t('comunidadEntrada')}</dt>
          <dd className="mt-0.5 font-mono text-sm">{num(entry)}</dd>
        </div>
        <div className="bg-card px-3 py-2">
          <dt className="text-[9.5px] uppercase tracking-[0.07em] text-muted-foreground">{t('comunidadStop')}</dt>
          <dd className="mt-0.5 font-mono text-sm text-short">{num(stop)}</dd>
        </div>
        <div className="bg-card px-3 py-2">
          <dt className="text-[9.5px] uppercase tracking-[0.07em] text-muted-foreground">{t('comunidadObjetivo')}</dt>
          <dd className="mt-0.5 font-mono text-sm text-long">{num(target)}</dd>
        </div>
      </dl>

      {rr == null ? (
        <p className="border-t border-rule px-3 py-2 text-[11.5px] text-muted-foreground">
          {t(`comunidadRrMotivo_${rrUndefinedReason || 'desconocido'}`)}
        </p>
      ) : null}

      {!compacta && Number.isFinite(entry) && Number.isFinite(stop) && entry !== stop ? (
        <div className="px-3 pb-2 pt-1">
          <Regleta entry={entry} stop={stop} locale={locale} />
        </div>
      ) : null}

      {note ? (
        <figcaption className="border-t border-rule px-3 py-2 text-[12.5px] text-muted-foreground">
          {note}
        </figcaption>
      ) : null}
    </figure>
  );
}
