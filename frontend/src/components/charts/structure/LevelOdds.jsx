import React, { useState } from 'react';
import { Dices, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { CargaVelas } from '@/components/common/BrandLoading';

/**
 * Qué ha hecho ESTE activo desde montajes como el de ahora.
 *
 * Tres reglas de presentación que no se pueden relajar, porque cada una tapa
 * una forma concreta de que el usuario lea de más:
 *
 * 1. **El porcentaje nunca aparece solo.** Va pegado a su muestra (`n de N`) y
 *    a su intervalo. «57 %» sacado de 4 casos de 7 no distingue un 40 de un 70,
 *    y sin el intervalo delante se lee igual que un 57 % sacado de 400.
 *
 * 2. **La ventaja manda sobre el porcentaje.** Estando pegado al soporte, «69 %
 *    de irse al soporte» es geometría: está más cerca. Lo que dice algo es
 *    cuánto se separa de la misma medición sobre la serie barajada. Por eso la
 *    ventaja va en grande y el porcentaje crudo debajo, y no al revés.
 *
 * 3. **Sin intervalos separados no hay ganador.** Cuando el mejor resultado y
 *    el segundo se solapan, los datos no los distinguen: se dice «no hay
 *    diferencia clara» en vez de coronar al que salió medio punto por encima.
 */

const TONO = {
  resistance: 'text-long',
  support: 'text-short',
  neither: 'text-muted-foreground',
};

/** Una frecuencia con todo lo que hace falta para no leerla mal. */
const Frecuencia = ({ etiqueta, dato, resaltado }) => {
  if (!dato || dato.p == null) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{etiqueta}</div>
        <div className="font-mono text-muted-foreground">—</div>
      </div>
    );
  }
  return (
    <div className={`rounded-md border px-3 py-2 ${resaltado ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{etiqueta}</div>
      <div className="font-mono font-bold text-lg">{dato.p.toFixed(1)} %</div>
      {/* La muestra y el intervalo, siempre. Sin esto el número de arriba
          miente por omisión. */}
      <div className="text-[10px] text-muted-foreground font-mono leading-tight">
        {dato.hits}/{dato.n} · {dato.lo.toFixed(0)}–{dato.hi.toFixed(0)} %
      </div>
    </div>
  );
};

export default function LevelOdds({ symbol, interval, period, onFetch }) {
  const { t } = useTranslation();
  const [estado, setEstado] = useState('idle');
  const [datos, setDatos] = useState(null);
  const [fallo, setFallo] = useState(null);

  const medir = async () => {
    setEstado('loading'); setFallo(null);
    try {
      const r = await onFetch({ symbol, interval, period });
      if (r?.error) { setFallo(r.error); setDatos(null); }
      else setDatos(r);
      setEstado('done');
    } catch (e) {
      setFallo(String(e?.message || e)); setEstado('done');
    }
  };

  const v = datos?.verdict;
  const zonas = datos?.by_zone || [];
  const zonaActual = zonas.find((z) => z.key === datos?.current?.zone);
  const ruptura = datos?.after_break;

  return (
    <section className="space-y-3" data-testid="level-odds">
      <div className="flex items-center gap-2 flex-wrap">
        <Dices className="w-4 h-4 text-primary shrink-0" />
        <h4 className="text-sm font-bold">{t('oddsTitle')}</h4>
        <button
          type="button" onClick={medir} disabled={estado === 'loading'}
          className="ml-auto text-xs font-bold px-3 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50"
          data-testid="odds-measure-btn"
        >
          {estado === 'loading'
            ? <span className="flex items-center gap-1"><CargaVelas className="w-3 h-3" />{t('oddsMeasuring')}</span>
            : t('oddsMeasure')}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">{t('oddsIntro')}</p>

      {fallo && (
        <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2" data-testid="odds-error">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <span className="text-[11px]">{t(`odds_${fallo}`) !== `odds_${fallo}` ? t(`odds_${fallo}`) : fallo}</span>
        </div>
      )}

      {datos && !fallo && (
        <>
          {/* ── El veredicto ─────────────────────────────────────────── */}
          {v ? (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3" data-testid="odds-verdict">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  {t('oddsVerdict')}
                </span>
                <span className={`text-lg font-bold ${TONO[v.outcome]}`} data-testid="odds-verdict-outcome">
                  {t(`oddsOutcome_${v.outcome}`)}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                  n={v.n} · {t(`oddsCriterion_${v.criterion.replace('+', '_')}`)}
                </span>
              </div>

              {/* Cuando los intervalos se solapan, no hay ganador: decirlo es
                  más útil que coronar al que salió medio punto por encima. */}
              {!v.separated && (
                <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2"
                     data-testid="odds-not-separated">
                  <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                  <span className="text-[11px]">{t('oddsNotSeparated')}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Frecuencia etiqueta={t('oddsOutcome_resistance')} dato={v.distribution.resistance}
                            resaltado={v.outcome === 'resistance'} />
                <Frecuencia etiqueta={t('oddsOutcome_support')} dato={v.distribution.support}
                            resaltado={v.outcome === 'support'} />
                <Frecuencia etiqueta={t('oddsOutcome_neither')} dato={v.distribution.neither}
                            resaltado={v.outcome === 'neither'} />
              </div>

              {/* ── La ventaja: lo único que no es geometría ──────────── */}
              {zonaActual?.edgeSupport != null ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2" data-testid="odds-edge">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {t('oddsEdge')}
                  </div>
                  <div className="font-mono font-bold text-base">
                    {zonaActual.edgeSupport > 0 ? '+' : ''}{zonaActual.edgeSupport.toFixed(1)} {t('oddsPoints')}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {t('oddsEdgeHint')
                      .replace('{obs}', zonaActual.support.p.toFixed(1))
                      .replace('{null}', String(zonaActual.nullSupport))
                      .replace('{n}', String(datos.nullShuffles))}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground" data-testid="odds-no-edge">
                  {t('oddsNoEdge')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground" data-testid="odds-no-verdict">
              {t('oddsNoComparable')}
            </div>
          )}

          {/* ── Roto el soporte, ¿a dónde? ───────────────────────────── */}
          {ruptura && ruptura.n > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2" data-testid="odds-after-break">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                {t('oddsAfterBreak').replace('{n}', String(ruptura.n))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Frecuencia etiqueta={t('oddsContinuesDown')} dato={ruptura.continues_down} />
                <Frecuencia etiqueta={t('oddsBackToResistance')} dato={ruptura.back_to_resistance} />
                <Frecuencia etiqueta={t('oddsOutcome_neither')} dato={ruptura.neither} />
              </div>
            </div>
          )}

          {/* De dónde sale todo, para que se pueda discutir. */}
          <p className="text-[10px] text-muted-foreground font-mono leading-snug" data-testid="odds-method">
            {t('oddsMethod')
              .replace('{bars}', String(datos.bars))
              .replace('{obs}', String(datos.observations))
              .replace('{horizon}', String(datos.horizon))
              .replace('{iters}', String(datos.iterations))
              .replace('{shuffles}', String(datos.nullShuffles))}
          </p>
        </>
      )}
    </section>
  );
}
