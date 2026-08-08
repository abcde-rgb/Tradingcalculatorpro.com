import React from 'react';
import { TrendingUp, TrendingDown, Minus, Link2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { TREND_UI, fmtPrice, signed } from './scannerMeta';

const TREND_ICON = { uptrend: TrendingUp, downtrend: TrendingDown, range: Minus };

/**
 * Una cifra del bloque de lectura. Lo que no se puede calcular es «—».
 *
 * El valor lleva `truncate` y su propio `title`: la etiqueta ya lo llevaba, pero
 * la cifra no, y en tres columnas un precio largo —un índice de cinco dígitos,
 * una cripto con ocho decimales— se salía de la tarjeta y pisaba a la de al
 * lado. Recortar y dejar el número completo en el tooltip es lo que hace que la
 * rejilla aguante cualquier activo.
 */
const Metric = ({ label, value, sub, tone = 'text-foreground', testid }) => (
  <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 min-w-0 overflow-hidden" data-testid={testid}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate" title={label}>
      {label}
    </div>
    <div
      className={`font-mono font-bold text-sm truncate ${value == null ? 'text-muted-foreground' : tone}`}
      title={value == null ? undefined : String(value)}
    >
      {value == null ? '—' : value}
    </div>
    {sub && <div className="text-[10px] text-muted-foreground font-mono truncate" title={sub}>{sub}</div>}
  </div>
);

/**
 * Paso 2: la LECTURA. Qué tendencia hay y dónde está el precio respecto a lo
 * que tiene encima y debajo.
 *
 * Antes esto no existía: el escáner entregaba una lista de niveles y dejaba
 * «¿estoy comprando justo contra una resistencia?» —la única pregunta para la
 * que se consultan casi todos esos niveles— a ojo. Las cifras en ATR son la
 * mitad útil: 0,4 ATR de recorrido arriba y 3 ATR abajo es un gráfico muy
 * distinto del contrario, y los porcentajes solos no lo dicen en un activo
 * que no conoces.
 */
export default function ScanReading({ data }) {
  const { t } = useTranslation();
  if (!data) return null;

  const trend = TREND_UI[data.trend] || TREND_UI.range;
  const TrendIcon = TREND_ICON[data.trend] || Minus;
  const ctx = data.context || {};
  const conf = data.confluence || {};
  const pos = ctx.rangePositionPct;

  const atrLabel = (n) => (n == null ? null : t('structDistanceAtr').replace('{n}', String(n)));

  // La fecha de la vela de la que sale el precio. Intradía se enseña con hora;
  // en diario o superior, la hora no aporta nada y estorba en la tarjeta.
  const barLabel = (() => {
    if (!data.lastBarDate) return null;
    const d = new Date(data.lastBarDate);
    if (Number.isNaN(d.getTime())) return String(data.lastBarDate).slice(0, 16);
    return data.intraday
      ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  })();

  return (
    <section className="space-y-2" data-testid="struct-reading">
      <div
        className={`flex items-center gap-3 rounded-lg border ${trend.border} ${trend.bg} px-4 py-3`}
        data-testid="struct-trend"
      >
        <TrendIcon className={`w-6 h-6 ${trend.color} shrink-0`} />
        <div className="min-w-0">
          <div className={`text-base font-bold ${trend.color}`}>{t(trend.key)}</div>
          <div className="text-[11px] text-muted-foreground leading-snug">{t(`${trend.key}Desc`)}</div>
        </div>
        {/* La confluencia se comprueba contra el escalón superior. Si no se ha
            podido comprobar se dice, en vez de callar (que se leería como
            "comprobado y sin coincidencias"). */}
        <div className="ml-auto text-right shrink-0">
          {conf.checked ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary"
              data-testid="struct-confluence-summary"
            >
              <Link2 className="w-3 h-3" />
              {t('structConfluenceSummary')
                .replace('{n}', String(conf.matched ?? 0))
                .replace('{tf}', conf.interval || '')}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">{t('structConfluenceUnchecked')}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Metric
          label={t('structRoomAbove')}
          value={ctx.roomAbovePct == null ? null : signed(ctx.roomAbovePct)}
          sub={atrLabel(ctx.roomAboveAtr)}
          tone="text-[#ef4444]"
          testid="struct-room-above"
        />
        {/* NO es una cotización en vivo: es el cierre de la última vela
            escaneada. En diario puede tener horas o días, así que la etiqueta
            dice cuál de las dos cosas es y debajo va la fecha de esa vela.
            Llamarlo «precio ahora» a secas era prometer algo que el dato no
            cumple — y es exactamente lo que hacía que pareciera «pillado». */}
        <Metric
          label={data.lastBarForming ? t('structPriceForming') : t('structPriceLastClose')}
          value={data.currentPrice == null ? null : fmtPrice(data.currentPrice)}
          sub={barLabel}
          tone="text-primary"
          testid="struct-price-now"
        />
        <Metric
          label={t('structRoomBelow')}
          value={ctx.roomBelowPct == null ? null : signed(-ctx.roomBelowPct)}
          sub={atrLabel(ctx.roomBelowAtr)}
          tone="text-[#22c55e]"
          testid="struct-room-below"
        />
      </div>

      {/* Dónde cae el precio entre el soporte y la resistencia más cercanos.
          Sin uno de los dos no hay rango que medir y no se dibuja nada. */}
      {pos != null && (
        <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2" data-testid="struct-range-position">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold mb-1">
            <span className="text-muted-foreground" title={t('structRangePositionTip')}>
              {t('structRangePosition')}
            </span>
            <span className="font-mono text-foreground">
              {pos}%{ctx.rangeWidthPct != null && ` · ${ctx.rangeWidthPct}%`}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-[#22c55e]/40 to-[#ef4444]/40">
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background"
              style={{ left: `${Math.max(0, Math.min(100, pos))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
            <span>{t('structLvlSupport')}</span>
            <span>{t('structLvlResistance')}</span>
          </div>
        </div>
      )}
    </section>
  );
}
