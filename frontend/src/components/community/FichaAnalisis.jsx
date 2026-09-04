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
 * En el detalle del hilo es el objeto protagonista de la pantalla: el R:R va a
 * tamaño de titular, porque es el número que la gente ha venido a discutir. En
 * el listado (`compacta`) baja a una tira de una línea para no competir con el
 * título del hilo.
 */
export default function FichaAnalisis({ analysis, locale = 'es', compacta = false }) {
  const { t } = useTranslation();
  if (!analysis?.symbol) return null;

  const { symbol, side, entry, stop, target, rr, rrUndefinedReason, timeframe, note } = analysis;
  const esLargo = side !== 'short';
  const motivo = t(`comunidadRrMotivo_${rrUndefinedReason || 'desconocido'}`);
  const num = (v, dec = 5) => (Number.isFinite(v)
    ? Number(v).toLocaleString(locale, { maximumFractionDigits: dec })
    : '—');

  const Nivel = ({ etiqueta, valor, tono = '' }) => (
    <div className="min-w-0">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{etiqueta}</dt>
      <dd className={`mt-1.5 font-mono tabular-nums ${compacta ? 'text-[13px]' : 'text-lg'} ${tono}`}>
        {num(valor)}
      </dd>
    </div>
  );

  /* ── Tira compacta: una línea dentro de la fila del listado ───────────── */
  if (compacta) {
    return (
      <figure className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sharp border border-rule bg-card/70 px-3.5 py-2.5">
        <span className="font-mono text-[13px] font-semibold tracking-tight">{symbol}</span>
        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${esLargo ? 'text-long' : 'text-short'}`}>
          {esLargo ? t('comunidadLargo') : t('comunidadCorto')}
        </span>
        <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12.5px] tabular-nums text-muted-foreground">
          <span><span className="text-foreground">{num(entry)}</span></span>
          <span className="text-short">{num(stop)}</span>
          <span className="text-long">{num(target)}</span>
        </dl>
        <span className="ml-auto font-mono text-[13px] tabular-nums">
          {rr == null ? (
            <span className="text-muted-foreground" title={motivo}>{t('comunidadRr')} —</span>
          ) : (
            <>{t('comunidadRr')} <span className="text-foreground">{num(rr, 2)}</span></>
          )}
        </span>
      </figure>
    );
  }

  /* ── Ficha completa: el objeto protagonista del detalle ───────────────── */
  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-card">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-rule px-5 py-4">
        <span className="font-mono text-lg font-semibold tracking-tight">{symbol}</span>
        <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${esLargo ? 'text-long' : 'text-short'}`}>
          {esLargo ? t('comunidadLargo') : t('comunidadCorto')}
        </span>
        {timeframe ? (
          <span className="rounded-sharp border border-rule px-1.5 font-mono text-[11px] text-muted-foreground">
            {timeframe}
          </span>
        ) : null}

        <div className="ml-auto text-right">
          {rr == null ? (
            <>
              {/* «—» a tamaño de titular, con el motivo debajo. Nunca 0. */}
              <p className="font-mono text-[32px] leading-none text-muted-foreground">—</p>
              <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('comunidadRr')}
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-[32px] leading-none tabular-nums tracking-tight">{num(rr, 2)}</p>
              <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('comunidadRr')}
              </p>
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-px bg-rule">
        <div className="bg-card px-5 py-4"><Nivel etiqueta={t('comunidadEntrada')} valor={entry} /></div>
        <div className="bg-card px-5 py-4"><Nivel etiqueta={t('comunidadStop')} valor={stop} tono="text-short" /></div>
        <div className="bg-card px-5 py-4"><Nivel etiqueta={t('comunidadObjetivo')} valor={target} tono="text-long" /></div>
      </dl>

      {rr == null ? (
        <p className="border-t border-rule px-5 py-3 text-[12.5px] text-muted-foreground">{motivo}</p>
      ) : null}

      {Number.isFinite(entry) && Number.isFinite(stop) && entry !== stop ? (
        <div className="border-t border-rule px-5 pb-4 pt-3">
          <Regleta entry={entry} stop={stop} locale={locale} />
        </div>
      ) : null}

      {note ? (
        <figcaption className="border-t border-rule px-5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          {note}
        </figcaption>
      ) : null}
    </figure>
  );
}
