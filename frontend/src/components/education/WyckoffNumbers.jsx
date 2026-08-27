import { useMemo } from 'react';
import { Calculator, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { getWyckoffNumbers } from '@/lib/tradingEducationContent';
import { equilibrioNeto } from '@/lib/edgeMath';
import {
  CUENTAS_PF, EJEMPLO_SPRING, causaPF, objetivoPF, objetivoRango, relacionRR,
} from '@/lib/wyckoffMath';

/**
 * Las dos cifras que el módulo de Wyckoff prometía y no daba.
 *
 * 1.236 palabras y ningún número, en un método cuya segunda ley es
 * explícitamente cuantitativa: el texto ya decía «se mide con recuentos de
 * Punto y Figura» sin enseñar la cuenta, y el último paso describía una
 * operación con entrada, stop y objetivo sin poner un solo precio.
 *
 * Nada aquí es una señal. Es la aritmética de un método que se enseña en
 * prosa, y sale de `wyckoffMath.js` para que se pueda comprobar. El acierto
 * mínimo lo calcula `equilibrioNeto`, la misma función que pinta la tabla del
 * módulo de riesgo: los dos módulos no pueden decir cosas distintas.
 */

/** Coste de referencia, el mismo de la tabla de equilibrio. */
const COSTE_R = 0.1;

export function WyckoffNumbers() {
  const { t, locale } = useTranslation();
  const c = getWyckoffNumbers(t);

  const filas = useMemo(() => CUENTAS_PF.map((f) => ({
    ...f,
    causa: causaPF(f),
    objetivo: objetivoPF(f),
  })), []);

  const trade = useMemo(() => {
    const objetivo = objetivoRango(EJEMPLO_SPRING);
    const rr = relacionRR({ ...EJEMPLO_SPRING, objetivo });
    return {
      objetivo,
      rr,
      riesgo: EJEMPLO_SPRING.entrada - EJEMPLO_SPRING.stop,
      beneficio: objetivo == null ? null : objetivo - EJEMPLO_SPRING.entrada,
      acierto: rr == null ? null : equilibrioNeto(rr, 0),
      aciertoConCostes: rr == null ? null : equilibrioNeto(rr, COSTE_R),
    };
  }, []);

  const n = (v, d = 1) => (v == null ? '—'
    : v.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: d }));
  const pct = (v) => (v == null ? '—'
    : `${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);

  const th = 'py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-muted-foreground';
  const td = 'py-2 px-3 font-mono text-sm';

  return (
    <div className="space-y-6" data-testid="wyckoff-numbers">
      {/* ── El recuento de Punto y Figura ─────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
            <Ruler className="w-5 h-5 text-primary" />
            {c.count.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{c.count.intro}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[26rem]">
              <thead className="bg-muted/50">
                <tr>
                  <th className={`${th} text-left`}>{c.count.colColumns}</th>
                  <th className={`${th} text-right`}>{c.count.colBase}</th>
                  <th className={`${th} text-right`}>{c.count.colCause}</th>
                  <th className={`${th} text-right`}>{c.count.colTarget}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.columnas} className="border-t border-border/60"
                      data-testid={`wyk-pf-${f.columnas}`}>
                    <td className={td}>{n(f.columnas, 0)}</td>
                    <td className={`${td} text-right text-muted-foreground`}>{n(f.base, 0)}</td>
                    <td className={`${td} text-right`}>+{n(f.causa, 0)}</td>
                    <td className={`${td} text-right font-semibold`}>{n(f.objetivo, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{c.count.note}</p>
        </CardContent>
      </Card>

      {/* ── La operación, con precios ─────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
            <Calculator className="w-5 h-5 text-primary" />
            {c.trade.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{c.trade.intro}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <tbody>
                  {[
                    [c.trade.rowRange, `${n(EJEMPLO_SPRING.rangoBajo, 0)} – ${n(EJEMPLO_SPRING.rangoAlto, 0)}`],
                    [c.trade.rowSpring, n(EJEMPLO_SPRING.minimoSpring)],
                    [c.trade.rowEntry, n(EJEMPLO_SPRING.entrada, 0)],
                    [c.trade.rowStop, n(EJEMPLO_SPRING.stop, 0)],
                    [c.trade.rowTarget, n(trade.objetivo, 0)],
                  ].map(([etiqueta, valor]) => (
                    <tr key={etiqueta} className="border-b border-border/60 last:border-0">
                      <td className="py-2 px-3 text-xs text-muted-foreground">{etiqueta}</td>
                      <td className="py-2 px-3 font-mono text-sm text-right">{valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.trade.rowRisk}</p>
                  <p className="font-mono text-lg text-destructive" data-testid="wyk-riesgo">−{n(trade.riesgo, 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.trade.rowReward}</p>
                  <p className="font-mono text-lg text-primary" data-testid="wyk-beneficio">+{n(trade.beneficio, 0)}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[11px] uppercase tracking-wider text-primary mb-1">{c.trade.rowRR}</p>
                <p className="font-mono text-2xl font-bold" data-testid="wyk-rr">
                  {trade.rr == null ? '—' : `${n(trade.rr, 2)} : 1`}
                </p>
                {/* El puente con el módulo de riesgo: la misma función que pinta
                    su tabla dice cuánto hay que acertar con esta relación. */}
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed" data-testid="wyk-acierto">
                  {pct(trade.acierto)} · {pct(trade.aciertoConCostes)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{c.trade.note}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default WyckoffNumbers;
