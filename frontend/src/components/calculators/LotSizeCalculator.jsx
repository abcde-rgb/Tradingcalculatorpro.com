import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Scale, Trash2, AlertTriangle } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTranslation } from '@/lib/i18n';
import { LabelWithHelp } from '@/components/common/FieldHelp';
import { resolveSpec, contractSizeFor, FOREX_LOT_TYPES } from '@/lib/instruments';
import {
  RISK_HARD_CAP_PCT, riskBudget, lotSizing, quoteStep, pipValue, effectiveLeverage,
} from '@/lib/deskMath';
import { fmtMoney, fmtNum, fmtPrice, productLabelKey } from '@/components/performance/form/productMeta';
import { BINDING_META } from '@/components/desk/deskMeta';

const PRODUCTOS = ['forex', 'cfd', 'futures'];

/**
 * Cuántos lotes comprar.
 *
 * La versión anterior tenía un `pipValuePerStandardLot = 10` escrito a mano y
 * lo aplicaba a todo lo que el buscador dejaba elegir. En oro —cuyo lote son
 * 100 onzas y cuyo pip vale 1 $— daba diez veces menos tamaño del debido, y
 * anunciaba una pérdida máxima de 100 $ cuando la real eran 10 $. En USDJPY se
 * equivocaba un 57 %. Y si elegías una acción o un índice, el botón no hacía
 * nada: el símbolo no estaba en su lista de once pares y la función se salía en
 * silencio. Su propia descripción prometía «el valor del pip de cada par y tu
 * divisa de cuenta»; ninguna de las dos cosas existía en el código.
 *
 * Ahora no hay ninguna cifra de instrumento aquí dentro. El pip, el tamaño de
 * lote, el escalón y el apalancamiento salen de `lib/instruments.js` —el mismo
 * catálogo que usa la mesa y que CI mantiene en paridad con el backend— y el
 * dimensionado sale de `lib/deskMath.js`, con sus tres topes y el tope duro del
 * 10 %. Esta pantalla sólo pregunta y pinta.
 *
 * Lo que se hereda de la mesa y aquí no se negocia:
 *   · El riesgo se convierte a la divisa COTIZADA antes de dimensionar. Sin eso,
 *     dimensionar USDJPY con una cuenta en dólares mezcla yenes con dólares.
 *   · Un cruce sin tercer tipo de cambio no se dimensiona. Se dice.
 *   · Por encima del 10 % de la cuenta no hay tamaño, hay motivo.
 */
export function LotSizeCalculator() {
  const { t } = useTranslation();

  const [datos, setDatos, limpiar] = usePersistedState('lot_size_calculator_v2', {
    product: 'forex',
    symbol: 'EURUSD',
    lotType: 'standard',
    price: '1.0850',
    balance: '10000',
    riskPct: '1',
    stopSteps: '50',
    leverage: '',
  });

  const set = (k) => (v) => setDatos((p) => ({ ...p, [k]: v }));
  const nz = (v) => {
    const n = Number(v);
    return v === '' || v === null || !Number.isFinite(n) ? null : n;
  };

  const r = useMemo(() => {
    const spec = resolveSpec(datos.product, datos.symbol);
    const contractSize = contractSizeFor(datos.product, datos.symbol, { lotType: datos.lotType });
    const paso = quoteStep(spec);
    const price = nz(datos.price);
    const balance = nz(datos.balance);
    const stopSteps = nz(datos.stopSteps);
    const leverage = effectiveLeverage({
      declared: datos.leverage, spec, entry: price, contractSize,
    });
    const budget = riskBudget({ capital: balance, riskPct: nz(datos.riskPct), mode: 'pct' });
    // La distancia del stop se escribe en pips (o en ticks): son las unidades
    // en las que se piensa un stop de forex, y el catálogo sabe cuánto mide
    // cada una en este símbolo.
    const stopDistance = paso !== null && stopSteps !== null ? stopSteps * paso : null;

    const porLote = pipValue({ quantity: 1, contractSize, spec, price });
    // Por encima del tope no se dimensiona con otro techo y ya: no hay tamaño,
    // hay motivo. Pasar `riskAmount: null` dejaba que mandara la exposicion y
    // la pantalla acababa enseñando el aviso del tope Y un tamaño debajo.
    const sizing = budget.blocked ? { convertible: true, lots: null } : lotSizing({
      entry: price, stopDistance, contractSize, spec,
      capital: balance, riskAmount: budget.amount, leverage,
    });

    return {
      spec, contractSize, paso, price, balance, leverage, budget,
      stopDistance, porLote, ...sizing,
      // El catálogo no conoce este símbolo: no es un fallo, es que el número lo
      // tiene que poner alguien. Antes esto era un botón que no respondía.
      desconocido: !spec.known,
    };
  }, [datos]);

  const Campo = ({ etiqueta, k, paso = 'any', ayuda }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {ayuda ? <LabelWithHelp bodyKey={ayuda}>{etiqueta}</LabelWithHelp> : etiqueta}
      </Label>
      <Input
        type="number" step={paso} value={datos[k]}
        onChange={(e) => set(k)(e.target.value)}
        className="font-mono tabular-nums"
        data-testid={`lot-${k}`}
      />
    </div>
  );

  const Cifra = ({ etiqueta, valor, nota, testid, destacado }) => (
    <div className={`p-3 rounded-lg ${destacado ? 'bg-primary/10' : 'bg-muted/50'}`} data-testid={testid}>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{etiqueta}</p>
      <p className={`font-mono text-xl font-bold tabular-nums ${destacado ? 'text-primary' : ''}`}>{valor}</p>
      {nota && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{nota}</p>}
    </div>
  );

  return (
    <Card className="bg-card border-border" data-testid="lot-size-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-info" />
          </div>
          {t('lotSizeCalcTitle_p001')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescLotsize')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tfProduct')}</Label>
          <div className="flex gap-1.5" data-testid="lot-product-picker">
            {PRODUCTOS.map((p) => (
              <button
                key={p} type="button"
                onClick={() => setDatos((prev) => ({ ...prev, product: p }))}
                className={`flex-1 px-3 py-2 rounded-sharp text-xs font-bold uppercase tracking-wider border transition-colors ${
                  datos.product === p
                    ? 'bg-primary/15 text-primary border-primary/50'
                    : 'border-rule text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`lot-product-${p}`}
              >
                {t(productLabelKey(p))}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeSymbol')}</Label>
            <Input
              value={datos.symbol}
              onChange={(e) => set('symbol')(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              data-testid="lot-symbol"
            />
          </div>
          {datos.product === 'forex' ? (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('deskLotType')}</Label>
              <select
                value={datos.lotType}
                onChange={(e) => set('lotType')(e.target.value)}
                className="w-full h-10 bg-muted border border-rule rounded-sharp px-2 text-xs"
                data-testid="lot-type"
              >
                {Object.values(FOREX_LOT_TYPES).map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {t(`lot_${lt.id}`)} · {lt.units.toLocaleString('en-US')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Campo etiqueta={t('futEntryPrice')} k="price" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {datos.product === 'forex' && <Campo etiqueta={t('futEntryPrice')} k="price" />}
          <Campo etiqueta={t('balanceDeCuenta_89aff2')} k="balance" />
          {datos.product !== 'forex' && (
            <Campo etiqueta={t('riesgoPorTrade_c5f760')} k="riskPct" paso="0.1" ayuda="helpRiskPerTrade" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {datos.product === 'forex' && (
            <Campo etiqueta={t('riesgoPorTrade_c5f760')} k="riskPct" paso="0.1" ayuda="helpRiskPerTrade" />
          )}
          <Campo etiqueta={t('lotStopSteps')} k="stopSteps" />
        </div>

        {/* ── Lo que impide contestar, dicho donde pasa ─────────────── */}
        {r.desconocido && (
          <div className="p-3 rounded-lg bg-muted/50 border border-rule flex gap-2 text-xs" data-testid="lot-unknown">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('lotUnknownSymbol').replace('{symbol}', datos.symbol || '—')}</p>
          </div>
        )}

        {r.budget.reason === 'over_cap' && (
          <div className="p-3 rounded-lg bg-short/10 border border-short/40 text-xs text-short font-semibold"
            data-testid="lot-over-cap">
            {t('deskRiskOverCapInline').replace('{cap}', String(RISK_HARD_CAP_PCT))}
          </div>
        )}

        {!r.convertible && !r.desconocido && (
          <div className="p-3 rounded-lg bg-muted/50 border border-rule flex gap-2 text-xs" data-testid="lot-not-convertible">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('lotCrossPair').replace('{quote}', r.porLote.quoteCurrency)}
            </p>
          </div>
        )}

        {/* ── La respuesta ─────────────────────────────────────────── */}
        {r.lots !== null && (
          <div className="space-y-3" data-testid="lot-results">
            <div className="grid grid-cols-2 gap-3">
              <Cifra
                etiqueta={t('tamanoDeLote_6ff2de')} destacado testid="lot-result-lots"
                valor={fmtNum(r.lots, r.step && r.step < 1 ? 2 : 0)}
                nota={`${t('lotesEstandar_a4b8ec')} · ${fmtNum(r.units, 0)} ${t('lotUnits')}`}
              />
              <Cifra
                etiqueta={t('deskAnswerNotionalInline')} testid="lot-result-notional"
                valor={fmtMoney(r.notionalAccount)}
                nota={`${t('lotMargin')}: ${fmtMoney(r.marginAccount)} · ${fmtNum(r.leverage, 1)}×`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Cifra
                etiqueta={t('valorPorPip_61cdca')} testid="lot-result-pip"
                valor={fmtMoney(r.pipAccount)}
                nota={`${fmtMoney(r.pipPerLot)} ${t('lotPerLot')}`}
              />
              <Cifra
                etiqueta={t('lotStepSize')} testid="lot-result-step"
                valor={fmtPrice(r.paso, r.paso)}
                nota={`${fmtNum(r.stopDistance, r.paso && r.paso < 0.01 ? 5 : 2)} ${t('lotStopDistance')}`}
              />
              <Cifra
                etiqueta={t('lotBinding')} testid="lot-result-binding"
                valor={r.binding ? t(BINDING_META[r.binding].labelKey) : '—'}
              />
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 text-center" data-testid="lot-result-risk">
              <p className="text-xs text-muted-foreground">{t('perdidaMaximaSiTocaSl_1986d0')}</p>
              <p className="text-xl font-bold text-destructive font-mono tabular-nums">{fmtMoney(r.riskAccount)}</p>
              <p className="text-xs text-muted-foreground">
                {r.riskAccount !== null && r.balance
                  ? `${((r.riskAccount / r.balance) * 100).toFixed(2)}% ${t('lotOfAccount')}`
                  : '—'}
              </p>
            </div>
          </div>
        )}

        <Button onClick={limpiar} variant="outline" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearData')}
        </Button>

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg leading-relaxed">
          <p className="font-medium mb-1">{t('formula_92c698')}</p>
          <code className="block">{t('lotFormula')}</code>
        </div>
      </CardContent>
    </Card>
  );
}
