import { useCallback, useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import JournalEdgeButton from '@/components/education/JournalEdgeButton';
import { rachaMaximaEsperada, tablaRachas, probAlgunaRacha } from '@/lib/edgeMath';

/**
 * La racha de pérdidas que hay que esperar ANTES de vivirla.
 *
 * `streak_zscore` del diario mide las rachas ya ocurridas contra lo que daría
 * el azar. Esto es lo contrario y se usa antes de operar: con tu acierto y tu
 * número de operaciones, cuántas pérdidas seguidas son normales.
 *
 * Separa a propósito las dos preguntas que casi todo el mundo confunde:
 * perder cinco seguidas EN UN PUNTO dado es raro; que ocurra ALGUNA VEZ en
 * doscientas operaciones no lo es en absoluto. Creer que la primera responde a
 * la segunda es lo que hace que un trader abandone un sistema sano.
 */
const NUM = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function LosingStreakCalculator() {
  const { t } = useTranslation();

  const [datos, setDatos] = usePersistedState('losing_streak_calculator', {
    acierto: 40,
    operaciones: 200,
  });
  const set = (k) => (e) => setDatos((p) => ({ ...p, [k]: e.target.value }));

  /**
   * El acierto de VERDAD, traído del diario.
   *
   * La pregunta que responde esta pantalla —«¿cuántas pérdidas seguidas son
   * normales?»— es muy sensible al acierto: al 40 % la racha esperada en 200
   * operaciones es de siete; al 50 %, de cinco. Un acierto recordado dos
   * puntos por encima ya cambia la respuesta, y la memoria redondea al alza.
   *
   * También trae el número de operaciones cerradas: la racha esperada depende
   * de cuántas veces se tira la moneda, no sólo de cómo está cargada.
   */
  const desdeDiario = useCallback((a) => {
    setDatos((p) => ({
      ...p,
      ...(a.win_rate != null ? { acierto: Math.round(a.win_rate * 10) / 10 } : {}),
      ...(a.closed_trades ? { operaciones: a.closed_trades } : {}),
    }));
  }, [setDatos]);

  const r = useMemo(() => {
    const acierto = NUM(datos.acierto);
    const operaciones = NUM(datos.operaciones);
    const maxima = rachaMaximaEsperada(operaciones, acierto);
    const tabla = acierto != null && operaciones != null ? tablaRachas(operaciones, acierto, 12) : [];
    // La racha más larga que TODAVÍA es más probable que no: el número que
    // convierte la tabla en una frase.
    let masProbableQueNo = null;
    for (const fila of tabla) {
      if (fila.enLaSerie != null && fila.enLaSerie >= 0.5) masProbableQueNo = fila.k;
    }
    return { acierto, operaciones, maxima, tabla, masProbableQueNo };
  }, [datos]);

  const pct = (v) => (v == null ? '—' : v < 0.001 ? '< 0,1 %' : `${(v * 100).toFixed(1)} %`);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-accent" />
          {t('lsTitle')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('lsDesc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('lsWinRate')} (%)
                </Label>
                <Input type="number" inputMode="decimal" value={datos.acierto} onChange={set('acierto')}
                       className="font-mono bg-muted border-border" data-testid="ls-winrate" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('lsTrades')}
                </Label>
                <Input type="number" inputMode="numeric" value={datos.operaciones} onChange={set('operaciones')}
                       className="font-mono bg-muted border-border" data-testid="ls-trades" />
              </div>
            </div>

            <JournalEdgeButton onLoad={desdeDiario} testId="ls-journal" />

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs uppercase tracking-wider text-primary mb-1">{t('lsMaxExpected')}</p>
              <p className="font-mono text-3xl font-bold" data-testid="ls-max">
                {r.maxima == null ? '—' : r.maxima.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('lsMaxExpectedHint')}</p>
            </div>

            {r.masProbableQueNo != null && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border" data-testid="ls-headline">
                <p className="text-sm leading-relaxed">
                  {t('lsHeadline', {
                    k: r.masProbableQueNo,
                    n: r.operaciones,
                    p: `${(probAlgunaRacha(r.operaciones, r.acierto, r.masProbableQueNo) * 100).toFixed(0)} %`,
                  })}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t('lsTableTitle')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">{t('lsTableK')}</th>
                    <th className="py-2 pr-4 font-medium text-right">{t('lsTableAtPoint')}</th>
                    <th className="py-2 font-medium text-right">{t('lsTableInSeries')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.tabla.map((f) => (
                    <tr key={f.k} className="border-b border-border/50">
                      <td className="py-1.5 pr-4">{f.k}</td>
                      <td className="py-1.5 pr-4 text-right text-muted-foreground">{pct(f.enUnPunto)}</td>
                      <td className={`py-1.5 text-right ${f.enLaSerie >= 0.5 ? 'text-amber-500 font-semibold' : ''}`}>
                        {pct(f.enLaSerie)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('lsNote')}</p>
      </CardContent>
    </Card>
  );
}

export default LosingStreakCalculator;
