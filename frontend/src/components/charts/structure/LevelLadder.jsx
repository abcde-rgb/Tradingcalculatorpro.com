import React from 'react';
import { Link2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { LEVEL_UI, ORIGIN_KEY, REASON_KEY, fmtPrice, signed } from './scannerMeta';

/**
 * Una fila de la escalera de precio, con su evidencia colgando.
 *
 * Orden de lectura de la fila: qué es → a qué precio → a qué distancia →
 * etiquetas (el más cercano, polaridad, confluencia) → confirmado o no →
 * fuerza. Todo lo que es una afirmación sobre el nivel lleva su porqué en el
 * `title`, nunca un adjetivo suelto.
 */
export function LevelRow({ lv, nearest }) {
  const { t } = useTranslation();
  const ui = LEVEL_UI[lv.type] || LEVEL_UI.pivot;
  const conf = lv.confirmation || {};
  const conflu = lv.confluence;

  const reasonList = (codes) => (codes || [])
    .map((code) => (REASON_KEY[code] ? t(REASON_KEY[code]) : code))
    .join(' · ');

  const zoneTip = lv.zone
    ? t('structZoneTip')
      .replace('{low}', fmtPrice(lv.zone.low))
      .replace('{high}', fmtPrice(lv.zone.high))
    : undefined;

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
        nearest ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
      }`}
      data-testid={`struct-level-${lv.type}`}
    >
      <span className={`font-semibold ${ui.color}`}>{t(ui.key)}</span>
      {/* El nivel es una banda, no una línea: el precio va con su zona detrás. */}
      <span className="font-mono text-foreground" title={zoneTip}>{fmtPrice(lv.price)}</span>
      {typeof lv.distancePct === 'number' && (
        <span className={`font-mono text-[10px] ${ui.color}`}>
          {signed(lv.distancePct)}
          {lv.distanceAtr != null && (
            <span className="text-muted-foreground">
              {' '}· {t('structDistanceAtr').replace('{n}', String(lv.distanceAtr))}
            </span>
          )}
        </span>
      )}
      {nearest && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
          {t('structNearestTag')}
        </span>
      )}
      {lv.flipped && (
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24]"
          title={t('structFlippedTip').replace('{origin}', t(ORIGIN_KEY[lv.origin] || 'structOriginMixed'))}
        >
          {t('structFlippedTag')}
        </span>
      )}
      {/* Confluencia: el escalón superior también tiene un nivel aquí. Es un
          hecho de OTRO gráfico, así que va como etiqueta propia y no toca la
          puntuación de confirmación, que solo mide las velas escaneadas. */}
      {conflu && (
        <span
          className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary"
          title={t('structConfluenceTip')
            .replace('{tf}', conflu.interval || '')
            .replace('{price}', fmtPrice(conflu.price))}
          data-testid="struct-level-confluence"
        >
          <Link2 className="w-2.5 h-2.5" />
          {t('structConfluenceTag').replace('{tf}', conflu.interval || '')}
        </span>
      )}
      <span
        className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
        title={t('structConfTip')
          .replace('{visits}', String(conf.visits ?? 0))
          .replace('{held}', String(conf.held ?? 0))
          .replace('{broken}', String(conf.broken ?? 0))
          .replace('{score}', String(conf.score ?? 0))
          + (conf.reasons?.length ? ` — ${reasonList(conf.reasons)}` : '')}
      >
        <span className={conf.confirmed ? 'text-[#22c55e]' : 'text-muted-foreground'}>
          {conf.confirmed ? `✓ ${t('structConfirmedTag')}` : t('structUnconfirmedTag')}
        </span>
      </span>
      <span className="flex gap-0.5 shrink-0" title={`${lv.strength}/5`}>
        {Array.from({ length: 5 }).map((_, k) => (
          <span
            key={k}
            className={`inline-block w-1.5 h-1.5 rounded-full ${k < lv.strength ? ui.dot : 'bg-border'}`}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * Paso 3: soportes y resistencias como ESCALERA DE PRECIO.
 *
 * Todo lo que está por encima del precio actual es resistencia y todo lo que
 * está por debajo es soporte, sin importar si el nivel se formó con máximos o
 * con mínimos. Un nivel que cambió de manos lleva la etiqueta de polaridad en
 * vez de quedarse mal etiquetado en silencio. Se pinta con la resistencia más
 * lejana arriba para que se lea igual que un gráfico.
 */
export default function LevelLadder({ data }) {
  const { t } = useTranslation();
  const all = data?.levels || [];
  if (!data || all.length === 0) return null;

  const resistances = all.filter((l) => l.type === 'resistance')
    .sort((a, b) => b.price - a.price).slice(-4);
  const supports = all.filter((l) => l.type === 'support')
    .sort((a, b) => b.price - a.price).slice(0, 4);
  const nearestRes = data.nearestResistance?.price;
  const nearestSup = data.nearestSupport?.price;

  return (
    <section data-testid="struct-levels">
      <div className="text-[10px] uppercase tracking-wider text-[#ef4444] font-semibold mb-1">
        {t('structAboveIsResistance')}
      </div>
      <div className="space-y-1.5">
        {resistances.length > 0
          ? resistances.map((lv, i) => (
            <LevelRow key={`r-${lv.price}-${i}`} lv={lv} nearest={lv.price === nearestRes} />
          ))
          : <div className="text-[11px] text-muted-foreground px-1 pb-1">{t('structNoneAbove')}</div>}
      </div>

      <div
        className="flex items-center gap-2 my-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5"
        data-testid="struct-ladder-price"
      >
        <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
          {t('structPriceNow')}
        </span>
        <span className="font-mono font-bold text-primary">{fmtPrice(data.currentPrice)}</span>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-[#22c55e] font-semibold mb-1">
        {t('structBelowIsSupport')}
      </div>
      <div className="space-y-1.5">
        {supports.length > 0
          ? supports.map((lv, i) => (
            <LevelRow key={`s-${lv.price}-${i}`} lv={lv} nearest={lv.price === nearestSup} />
          ))
          : <div className="text-[11px] text-muted-foreground px-1">{t('structNoneBelow')}</div>}
      </div>
    </section>
  );
}
