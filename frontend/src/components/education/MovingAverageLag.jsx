import { useMemo } from 'react';
import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { getMovingAverageLag } from '@/lib/tradingEducationContent';
import {
  PERIODOS_MA, retardoSMA, alfaEMA, centroMasaEMA, absorbidoTrasN, desfaseEnPrecio,
} from '@/lib/maMath';

/**
 * El retardo de las medias móviles, que el módulo nombraba sin medir.
 *
 * 713 palabras diciendo dos veces que «van por detrás del precio» y ninguna
 * cifra, cuando es de lo poco del análisis técnico que se calcula exacto y sin
 * datos de mercado. Las dos columnas del medio son el argumento: con el alfa
 * estándar, SMA y EMA tienen el MISMO centro de masa, así que «la EMA es más
 * rápida» es falso en media y cierto sólo en el reparto del peso.
 */

/** Pendiente del ejemplo, por barra. Redonda para que la cuenta se rehaga a mano. */
const PENDIENTE_EJEMPLO = 0.5;

export function MovingAverageLag() {
  const { t, locale } = useTranslation();
  const c = getMovingAverageLag(t);

  const filas = useMemo(() => PERIODOS_MA.map((n) => ({
    n,
    retardo: retardoSMA(n),
    alfa: alfaEMA(n),
    centro: centroMasaEMA(alfaEMA(n)),
    absorbido: absorbidoTrasN(n),
  })), []);

  // El periodo del que todo el mundo habla, traducido a precio.
  const largo = PERIODOS_MA[PERIODOS_MA.length - 1];
  const desfase = desfaseEnPrecio({ pendiente: PENDIENTE_EJEMPLO, n: largo });

  const num = (v, d = 1) => (v == null ? '—'
    : v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const pct = (v) => (v == null ? '—'
    : `${(v * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);

  const th = 'py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-muted-foreground';
  const td = 'py-2 px-3 font-mono text-sm';

  return (
    <Card className="bg-card border-border" data-testid="ma-lag">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
          <Timer className="w-5 h-5 text-primary" />
          {c.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{c.intro}</p>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem]">
            <thead className="bg-muted/50">
              <tr>
                <th className={`${th} text-left`}>{c.colPeriod}</th>
                <th className={`${th} text-right`}>{c.colLagSma}</th>
                <th className={`${th} text-right`}>{c.colAlpha}</th>
                <th className={`${th} text-right`}>{c.colComEma}</th>
                <th className={`${th} text-right`}>{c.colAbsorbed}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.n} className="border-t border-border/60" data-testid={`ma-lag-${f.n}`}>
                  <td className={`${td} font-semibold`}>{f.n}</td>
                  {/* Estas dos columnas son la misma cifra, y ése es el punto:
                      se pintan destacadas para que se vea sin leer la nota. */}
                  <td className={`${td} text-right text-primary`}>{num(f.retardo)}</td>
                  <td className={`${td} text-right text-muted-foreground`}>{num(f.alfa, 4)}</td>
                  <td className={`${td} text-right text-primary`}>{num(f.centro)}</td>
                  <td className={`${td} text-right`}>{pct(f.absorbido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{c.note}</p>

        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20" data-testid="ma-precio">
          <p className="text-sm leading-relaxed">
            {c.priceLabel({
              m: num(PENDIENTE_EJEMPLO, 2),
              n: String(largo),
              d: num(desfase, 2),
            })}
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{c.priceNote}</p>
      </CardContent>
    </Card>
  );
}

export default MovingAverageLag;
