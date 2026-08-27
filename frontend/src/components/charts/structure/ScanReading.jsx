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

  // Cuánto hace que se tomó la cotización viva. Una «cotización en vivo» de
  // hace veinte minutos sigue siendo mejor que el cierre de anteayer, pero
  // llamarla «ahora» sin decir la edad es lo mismo que no etiquetarla.
  const edadLabel = (() => {
    const s = data.referenceAgeSeconds;
    if (s == null) return null;
    if (s < 90) return t('structRefFresh');
    const min = Math.round(s / 60);
    if (min < 90) return t('structRefAgeMin').replace('{n}', String(min));
    return t('structRefAgeHours').replace('{n}', String(Math.round(min / 60)));
  })();

  // La fecha de la vela de la que sale el precio. Intradía se enseña con hora;
  // en diario o superior, la hora no aporta nada y estorba en la tarjeta.
  const barLabel = (() => {
    if (!data.lastBarDate) return null;
    // `new Date()` no sirve con ninguno de los dos formatos que manda el backend:
    //  · diario `"2026-08-07"` → ISO sin hora, que la norma manda interpretar
    //    como UTC medianoche; al pintarlo en local, quien esté al oeste de UTC
    //    ve el día ANTERIOR — la vela de hoy rotulada como la de ayer;
    //  · intradía `"2026-08-07 14:30"` (UTC) → se interpreta como hora local,
    //    así que la hora se desplaza el desfase del que mira.
    // Como lo que se enseña es *la etiqueta de la vela*, se formatea el texto
    // tal cual en vez de convertirlo a una zona que no es la del dato.
    const cruda = String(data.lastBarDate);
    const m = cruda.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (m) {
      const [, a, mes, dia, hh, mm] = m;
      // Se construye en hora LOCAL con esos mismos números: el formateador
      // pinta el día y la hora que trae el dato, sin moverlos.
      const local = new Date(Number(a), Number(mes) - 1, Number(dia),
                             Number(hh || 0), Number(mm || 0));
      return data.intraday && hh
        ? `${local.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`
        : local.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const d = new Date(cruda);
    if (Number.isNaN(d.getTime())) return cruda.slice(0, 16);
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

      {/* Los niveles que caen ENTRE la cotización viva y el último cierre son
          los únicos cuyo bando depende de cuál se use como referencia: con uno
          son soporte y con el otro resistencia. Cuando los hay, el reparto de
          la escalera no es una verdad sino una elección, y se dice. */}
      {data.levelsBetweenLiveAndClose > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2"
             data-testid="struct-ref-disputed">
          <span className="text-[11px] leading-snug">
            {t('structRefDisputed')
              .replace('{n}', String(data.levelsBetweenLiveAndClose))
              .replace('{live}', fmtPrice(data.livePrice))
              .replace('{close}', fmtPrice(data.lastClose))}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Metric
          label={t('structRoomAbove')}
          value={ctx.roomAbovePct == null ? null : signed(ctx.roomAbovePct)}
          sub={atrLabel(ctx.roomAboveAtr)}
          tone="text-short"
          testid="struct-room-above"
        />
        {/* El precio contra el que se reparte soporte/resistencia. Puede ser
            la cotización VIVA o el cierre de la última vela, y no es lo mismo:
            con el mercado cerrado el cierre tiene horas o días, y un nivel que
            queda entre los dos cambia de bando según cuál se use.

            El backend publica `referenceSource` y `referenceAgeSeconds` desde
            el 2026-08-17 y la pantalla los ignoraba: enseñaba el número con la
            etiqueta «último cierre» clavada aunque la fuente fuera la viva. Es
            justo lo que hacía que el precio pareciera mal calculado. */}
        <Metric
          label={
            data.referenceSource === 'live' ? t('structPriceLive')
              : data.lastBarForming ? t('structPriceForming')
                : t('structPriceLastClose')
          }
          value={data.currentPrice == null ? null : fmtPrice(data.currentPrice)}
          sub={data.referenceSource === 'live' ? edadLabel : barLabel}
          tone="text-primary"
          testid="struct-price-now"
        />
        <Metric
          label={t('structRoomBelow')}
          value={ctx.roomBelowPct == null ? null : signed(-ctx.roomBelowPct)}
          sub={atrLabel(ctx.roomBelowAtr)}
          tone="text-long"
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
          <div className="relative h-2 rounded-full bg-gradient-to-r from-long/40 to-short/40">
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
