import React, { useState } from 'react';
import { AlertTriangle, Phone, ShieldCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

/**
 * Ludopatía y trading — el módulo que a la academia le faltaba.
 *
 * El resto de estas páginas usa el casino como metáfora HALAGADORA («sé la
 * banca, ten una ventaja»), que como pedagogía de la esperanza matemática está
 * bien y como descripción de lo que le pasa a alguien que ha dejado de poder
 * parar es exactamente lo contrario de la verdad. Las dos cosas caben aquí, y
 * sólo estaba escrita una.
 *
 * Tres decisiones de diseño que no son estéticas:
 *
 * 1. **El cribado no diagnostica, y se dice donde no se puede no leer.** El
 *    Lie/Bet son DOS preguntas validadas; su valor es señalar a quién conviene
 *    evaluar, no decir quién está enfermo. El aviso va pegado al resultado, no
 *    en una nota al pie, por la misma razón por la que en el resto del producto
 *    el intervalo viaja pegado al número.
 *
 * 2. **Las respuestas no salen del navegador.** Nada de estado en la cuenta,
 *    nada de analítica, nada de `useCloudPref`. Que alguien conteste «sí» a
 *    «¿has mentido sobre cuánto has perdido?» y eso viaje a un servidor sería
 *    indefendible, y además el módulo promete explícitamente que no pasa.
 *
 * 3. **El teléfono de ayuda se pinta SIEMPRE**, no sólo tras un positivo.
 *    Quien más lo necesita es justamente quien no va a hacer el test.
 */
export default function GamblingHarmVisual({ data }) {
  const { t } = useTranslation();
  // Sin persistencia a propósito: ver el punto 2 de la cabecera.
  const [respuestas, setRespuestas] = useState([null, null]);
  const contestadas = respuestas.every((r) => r !== null);
  const positivo = respuestas.some((r) => r === true);

  return (
    <div className="space-y-8">
      {/* ── El aviso, antes que nada ─────────────────────────────────── */}
      <div
        className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"
        data-testid="gmb-disclaimer"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn dark:text-warn" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-foreground/90">{data.disclaimer}</p>
      </div>

      {/* ── Cómo se aprende una conducta que pierde dinero ───────────── */}
      <ReinforcementFigure t={t} />

      {/* ── Los diez apartados ───────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.items.map((item) => (
          <article
            key={item.id}
            data-testid={`gmb-item-${item.id}`}
            className={`rounded-lg border p-4 ${
              item.type === 'bearish'
                ? 'border-destructive/30 bg-destructive/5'
                : item.type === 'bullish'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-border bg-muted/30'
            }`}
          >
            <h4 className="mb-2 text-sm font-semibold text-foreground">{item.name}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
          </article>
        ))}
      </div>

      {/* ── Cribado Lie/Bet ──────────────────────────────────────────── */}
      <section
        className="rounded-lg border border-border bg-card p-5"
        data-testid="gmb-screen"
      >
        <h3 className="mb-1 text-base font-semibold text-foreground">{data.screen.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{data.screen.intro}</p>

        <div className="space-y-3">
          {data.screen.questions.map((q, i) => (
            <div key={i} className="rounded-md border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-sm text-foreground">{q}</p>
              <div className="flex gap-2">
                {[true, false].map((valor) => (
                  <button
                    key={String(valor)}
                    type="button"
                    onClick={() =>
                      setRespuestas((prev) => prev.map((r, j) => (j === i ? valor : r)))
                    }
                    aria-pressed={respuestas[i] === valor}
                    data-testid={`gmb-q${i}-${valor ? 'yes' : 'no'}`}
                    className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                      respuestas[i] === valor
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    {valor ? data.screen.yes : data.screen.no}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {contestadas && (
          <div
            className={`mt-4 rounded-md border p-4 ${
              positivo
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-emerald-500/30 bg-emerald-500/5'
            }`}
            data-testid={positivo ? 'gmb-result-positive' : 'gmb-result-negative'}
          >
            <p className="text-sm leading-relaxed text-foreground">
              {positivo ? data.screen.positive : data.screen.negative}
            </p>
            {/* Pegado al resultado, no al pie: es la parte que no se puede no leer. */}
            <p className="mt-3 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
              {data.screen.caveat}
            </p>
            <button
              type="button"
              onClick={() => setRespuestas([null, null])}
              className="mt-3 text-xs text-primary underline underline-offset-2"
            >
              {data.screen.reset}
            </button>
          </div>
        )}
      </section>

      {/* ── Ayuda: siempre visible, se haya hecho el test o no ───────── */}
      <section
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5"
        data-testid="gmb-help"
      >
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <Phone className="h-4 w-4 text-long dark:text-long" aria-hidden="true" />
          {data.help.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{data.help.intro}</p>
        <div className="space-y-3">
          {[
            { icon: ShieldCheck, texto: data.help.selfExclude },
            { icon: ExternalLink, texto: data.help.broker },
            { icon: Phone, texto: data.help.peer },
          ].map(({ icon: Icon, texto }, i) => (
            <div key={i} className="flex gap-3 rounded-md border border-border/50 bg-background/50 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
        {data.note}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{data.sources}</p>
    </div>
  );
}

/**
 * Por qué perder no apaga la conducta.
 *
 * Dos hileras de operaciones con el MISMO número de ganadoras. Arriba, premio
 * fijo cada tres; abajo, premio impredecible. La de arriba se abandona en
 * cuanto deja de pagar; la de abajo no, y es la que se parece al mercado. Es el
 * hallazgo de Skinner sobre razón variable, dibujado en vez de contado, porque
 * el punto entero es que las dos hileras son iguales en total y distintas en
 * efecto — y eso en un párrafo no se ve.
 */
function ReinforcementFigure({ t }) {
  const fija = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const variable = [0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1];
  const celda = 26;

  const Hilera = ({ datos, y }) =>
    datos.map((gana, i) => (
      <rect
        key={i}
        x={i * celda}
        y={y}
        width={celda - 4}
        height={20}
        rx={3}
        className={gana ? 'fill-emerald-500' : 'fill-muted-foreground/25'}
      />
    ));

  return (
    <figure className="rounded-lg border border-border bg-card p-5" data-testid="gmb-reinforcement">
      <figcaption className="mb-1 text-sm font-semibold text-foreground">
        {t('gmbFigTitle')}
      </figcaption>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t('gmbFigIntro')}</p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${12 * celda} 96`} className="h-24 w-full min-w-[320px]" role="img"
             aria-label={t('gmbFigTitle')}>
          <text x="0" y="10" className="fill-muted-foreground text-[9px]">{t('gmbFigFixed')}</text>
          <Hilera datos={fija} y={16} />
          <text x="0" y="62" className="fill-muted-foreground text-[9px]">{t('gmbFigVariable')}</text>
          <Hilera datos={variable} y={68} />
        </svg>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('gmbFigNote')}</p>
    </figure>
  );
}
