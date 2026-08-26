import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import {
  costeEnR, equilibrioNeto, esperanzaNetaR, arrastreMensual, tablaEquilibrio,
} from '@/lib/edgeMath';

/**
 * ¿Con MIS costes, este sistema gana?
 *
 * `ProjectionPanel` responde a esto con el diario, cuando ya hay operaciones
 * registradas. Esto lo responde antes, con seis números escritos a mano, y
 * añade lo que allí no está: el desplazamiento del punto de equilibrio por los
 * costes y el arrastre que producen según la FRECUENCIA.
 */
const NUM = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function BreakevenCalculator() {
  const { t } = useTranslation();

  const [datos, setDatos] = usePersistedState('breakeven_calculator', {
    capital: 10000,
    riesgoPct: 1,
    coste: 8,
    rr: 1.5,
    acierto: 45,
    opsMes: 40,
  });
  const set = (k) => (e) => setDatos((p) => ({ ...p, [k]: e.target.value }));

  const r = useMemo(() => {
    const capital = NUM(datos.capital);
    const riesgoPct = NUM(datos.riesgoPct);
    const coste = NUM(datos.coste);
    const rr = NUM(datos.rr);
    const acierto = NUM(datos.acierto);
    const opsMes = NUM(datos.opsMes);

    const riesgo = capital != null && riesgoPct != null ? (capital * riesgoPct) / 100 : null;
    const k = costeEnR({ coste, riesgo });
    const bruto = equilibrioNeto(rr, 0);
    const neto = equilibrioNeto(rr, k ?? 0);
    const margen = neto != null && acierto != null ? acierto - neto : null;
    const espR = esperanzaNetaR(acierto, rr, k ?? 0);
    const espDinero = espR != null && riesgo != null ? espR * riesgo : null;
    const arrMes = arrastreMensual(k, riesgoPct, opsMes);

    return {
      riesgo, k, bruto, neto, margen, espR, espDinero, arrMes,
      arrAnio: arrMes != null ? arrMes * 12 : null,
      tabla: tablaEquilibrio(k ?? 0),
    };
  }, [datos]);

  // El veredicto sigue el umbral que el propio informe de referencia propone:
  // por debajo de 5 puntos de margen no es ventaja, es varianza.
  const veredicto = r.margen == null ? null
    : r.margen >= 10 ? { txt: t('beVerdictEdge'), cls: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
    : r.margen >= 5 ? { txt: t('beVerdictThin'), cls: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' }
    : r.margen > 0 ? { txt: t('beVerdictVariance'), cls: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' }
    : { txt: t('beVerdictLoss'), cls: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };

  const pct = (v, d = 2) => (v == null ? '—' : `${v.toFixed(d)} %`);
  const campo = (clave, etiqueta, sufijo) => (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {etiqueta}{sufijo ? ` (${sufijo})` : ''}
      </Label>
      <Input
        type="number" inputMode="decimal" value={datos[clave]} onChange={set(clave)}
        className="font-mono bg-muted border-border" data-testid={`be-${clave}`}
      />
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-accent" />
          {t('beTitle')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('beDesc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entradas */}
          <div className="grid grid-cols-2 gap-4 content-start">
            {campo('capital', t('beCapital'), '€')}
            {campo('riesgoPct', t('beRiskPct'), '%')}
            {campo('coste', t('beCost'), '€')}
            {campo('rr', t('beRR'))}
            {campo('acierto', t('beWinRate'), '%')}
            {campo('opsMes', t('beTradesMonth'))}
            <p className="col-span-2 text-[11px] text-muted-foreground leading-relaxed">
              {t('beCostHint')}
            </p>
          </div>

          {/* Resultado */}
          <div className="space-y-3">
            {veredicto && (
              <div className={`p-4 rounded-xl border ${veredicto.bg}`} data-testid="be-verdict">
                <p className={`text-xs uppercase tracking-wider mb-1 ${veredicto.cls}`}>{veredicto.txt}</p>
                <p className="font-mono text-2xl font-bold">
                  {r.margen >= 0 ? '+' : ''}{r.margen?.toFixed(2)} pp
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('beMargin')}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('beGross')}</p>
                <p className="font-mono text-lg" data-testid="be-gross">{pct(r.bruto)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('beNet')}</p>
                <p className="font-mono text-lg font-semibold" data-testid="be-net">{pct(r.neto)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('beCostInR')}</p>
                <p className="font-mono text-lg">{r.k == null ? '—' : `${r.k.toFixed(3)} R`}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('beExpectancyR')}</p>
                <p className={`font-mono text-lg ${r.espR != null && r.espR < 0 ? 'text-destructive' : ''}`}
                   data-testid="be-expectancy">
                  {r.espR == null ? '—' : `${r.espR >= 0 ? '+' : ''}${r.espR.toFixed(3)} R`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {r.espDinero == null ? '' : `${r.espDinero >= 0 ? '+' : ''}${r.espDinero.toFixed(2)} €`}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t('beDrag')}</p>
              <p className="font-mono text-lg" data-testid="be-drag">
                {r.arrMes == null ? '—' : `${r.arrMes.toFixed(2)} % / ${t('beDragMonth')}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.arrAnio == null ? '' : `≈ ${r.arrAnio.toFixed(1)} % / ${t('beDragYear')}`}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de referencia, con TU coste aplicado */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('beTableTitle')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t('beTableRR')}</th>
                  <th className="py-2 pr-4 font-medium text-right">{t('beTableGross')}</th>
                  <th className="py-2 font-medium text-right">{t('beTableNet')}</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {r.tabla.map((f) => (
                  <tr key={f.rr} className="border-b border-border/50">
                    <td className="py-1.5 pr-4">{f.rr} : 1</td>
                    <td className="py-1.5 pr-4 text-right text-muted-foreground">{pct(f.bruto, 1)}</td>
                    <td className={`py-1.5 text-right ${f.neto > 100 ? 'text-destructive' : ''}`}>
                      {pct(f.neto, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-3">{t('beNote')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default BreakevenCalculator;
