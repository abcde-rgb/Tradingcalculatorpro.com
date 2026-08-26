import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { getBreakevenTable } from '@/lib/tradingEducationContent';
import { tablaEquilibrio } from '@/lib/edgeMath';

/**
 * La tabla que respalda las cincuenta y cuatro menciones al beneficio/riesgo.
 *
 * La academia nombraba la relación decenas de veces sin decir nunca a cuánto
 * acierto obliga cada una, que es la única parte que se puede calcular. No hay
 * un solo número escrito aquí: las dos columnas salen de `tablaEquilibrio`, la
 * misma función que usa la calculadora del panel, así que la tabla del curso y
 * la herramienta no pueden decir cosas distintas.
 *
 * El coste de referencia son 0,1 R —una comisión y un diferencial corrientes—
 * y va en una constante porque el texto lo cita: si cambia uno sin el otro,
 * `engine-check` lo caza.
 */
export const COSTE_REFERENCIA = 0.1;

export function BreakevenTable() {
  const { t, locale } = useTranslation();
  const c = getBreakevenTable(t);
  const filas = useMemo(() => tablaEquilibrio(COSTE_REFERENCIA), []);

  const pct = (v) => (v == null ? '—'
    : `${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);
  const th = 'py-2 px-3 text-[11px] uppercase tracking-wider font-medium text-muted-foreground';
  const td = 'py-2 px-3 font-mono text-sm';

  return (
    <Card className="bg-card border-border" data-testid="breakeven-table">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
          <Scale className="w-5 h-5 text-primary" />
          {c.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{c.intro}</p>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[22rem]">
            <thead className="bg-muted/50">
              <tr>
                <th className={`${th} text-left`}>{c.colRR}</th>
                <th className={`${th} text-right`}>{c.colGross}</th>
                <th className={`${th} text-right`}>{c.colNet}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                // 1 : 1 es la fila de la que todo el mundo se acuerda, y la que
                // demuestra el argumento: 50 % de cabeza, 55 % de verdad.
                const referencia = f.rr === 1;
                return (
                  <tr key={f.rr}
                      className={`border-t border-border/60 ${referencia ? 'bg-primary/10' : ''}`}
                      data-testid={`bet-row-${String(f.rr).replace('.', '_')}`}>
                    <td className={`${td} ${referencia ? 'font-semibold' : ''}`}>
                      {f.rr.toLocaleString(locale, { maximumFractionDigits: 2 })} : 1
                    </td>
                    <td className={`${td} text-right text-muted-foreground`}>{pct(f.bruto)}</td>
                    <td className={`${td} text-right font-semibold ${f.neto > 100 ? 'text-destructive' : ''}`}>
                      {pct(f.neto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{c.note}</p>
      </CardContent>
    </Card>
  );
}

export default BreakevenTable;
