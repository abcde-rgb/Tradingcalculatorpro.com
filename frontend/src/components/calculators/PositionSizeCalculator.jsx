import { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LabelWithHelp } from '@/components/common/FieldHelp';
import { Calculator, Save, AlertTriangle, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { createTrade } from '@/services/performanceApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuthStore, useCalculatorStore } from '@/lib/store';
import { usePersistedState } from '@/hooks/usePersistedState';
import {
  resolveSpec, contractSizeFor, sizingLabelKey, FOREX_LOT_TYPES,
} from '@/lib/instruments';
import {
  RISK_HARD_CAP_PCT, riskBudget, lotSizing, effectiveLeverage, requiredLeverage,
  quoteCurrency,
} from '@/lib/deskMath';
import { fmtMoney, fmtNum, productLabelKey } from '@/components/performance/form/productMeta';
import { BINDING_META } from '@/components/desk/deskMeta';

const PRODUCTOS = ['stock', 'crypto_spot', 'forex', 'cfd', 'futures', 'crypto_perp'];

/**
 * Productos en los que el tamaño de contrato lo decide el SÍMBOLO.
 *
 * En una acción o en cripto contado, una unidad es una unidad: el 1 no es una
 * suposición, es la definición del producto, y avisar de que «no está en el
 * catálogo» sería alarmar por lo que sí se sabe. En un futuro, un CFD, un
 * perpetuo o un par de forex, en cambio, el número sale de la ficha —50 en un
 * ES, 100 onzas en el oro, 100 000 en un lote— y sin ficha no hay respuesta.
 */
const EL_SIMBOLO_MANDA = new Set(['futures', 'cfd', 'crypto_perp', 'forex']);

/**
 * Cuánto comprar, dado dónde entras y dónde está tu stop.
 *
 * Es la hermana de `LotSizeCalculator` y la diferencia está en la pregunta, no
 * en la aritmética: allí el stop se escribe en pips o ticks, que es como se
 * piensa un stop de forex; aquí se escribe el PRECIO al que está, que es como
 * se piensa cuando lo has puesto sobre un nivel del gráfico. El motor es el
 * mismo, y a propósito: dos dimensionados distintos para la misma posición son
 * dos números distintos en la misma web.
 *
 * Lo que había antes:
 *
 *     positionSize   = riskAmount * entry / |entry - stop|
 *     positionInCoins = riskAmount / |entry - stop|
 *
 * Eso es correcto **sólo** si una unidad del instrumento vale una unidad de
 * precio y la divisa de cotización es la de la cuenta — es decir, en contado y
 * en cripto contado, que es justo donde estaban sus valores por defecto. En
 * cuanto el instrumento tiene tamaño de contrato deja de serlo: el oro cotiza
 * por onza pero se opera en lotes de 100, un ES son 50 × índice, un lote de
 * forex son 100 000 unidades. La pantalla daba un número de "unidades" que
 * nadie puede comprar, y el usuario tenía que dividir de cabeza por un
 * multiplicador que la pantalla no le decía.
 *
 * Y el error salía de la pantalla: el botón «enviar al diario» mandaba esas
 * unidades como `quantity` sin declarar el producto, y el diario calcula el
 * P&L como `(salida − entrada) × cantidad × multiplicador`. En un futuro eso
 * es multiplicar por el tamaño de contrato **dos veces**. Ahora se manda la
 * cantidad en la unidad del instrumento (contratos, lotes, acciones) junto con
 * `instrument_type`, `multiplier` y `lot_type`, exactamente el mismo contrato
 * de datos que usa el formulario del diario.
 *
 * Lo que se hereda de la mesa y aquí no se negocia:
 *   · El riesgo se convierte a la divisa COTIZADA antes de dimensionar.
 *   · Un cruce sin tercer tipo de cambio no se dimensiona. Se dice.
 *   · Por encima del 10 % de la cuenta no hay tamaño, hay motivo.
 *   · No hay botón de calcular: el resultado se deriva de los campos. El botón
 *     dejaba en pantalla un tamaño que ya no correspondía a lo que se leía
 *     arriba, y una cifra obsoleta con aspecto de recién calculada es peor que
 *     no tener cifra.
 */
export const PositionSizeCalculator = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();

  const [datos, setDatos, limpiar] = usePersistedState('position_size_calculator_v2', {
    product: 'crypto_spot',
    symbol: 'BTC',
    lotType: 'standard',
    balance: '10000',
    riskPct: 2,
    entry: '95000',
    stop: '94000',
    leverage: '',
  });

  const set = (k) => (v) => setDatos((p) => ({ ...p, [k]: v }));
  const nz = (v) => {
    const n = Number(v);
    return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n;
  };

  const [enviando, setEnviando] = useState(false);

  const r = useMemo(() => {
    const spec = resolveSpec(datos.product, datos.symbol);
    const contractSize = contractSizeFor(datos.product, datos.symbol, { lotType: datos.lotType });
    const entry = nz(datos.entry);
    const stop = nz(datos.stop);
    const balance = nz(datos.balance);
    const leverage = effectiveLeverage({
      declared: datos.leverage, spec, entry, contractSize,
    });
    const budget = riskBudget({ capital: balance, riskPct: nz(datos.riskPct), mode: 'pct' });

    // La distancia sale de dos PRECIOS. Si son el mismo no hay riesgo por
    // unidad, y dividir por cero daba una posición infinita: antes se salía
    // en silencio y la pantalla se quedaba con el resultado anterior.
    const stopDistance = entry !== null && stop !== null && entry !== stop
      ? Math.abs(entry - stop)
      : null;
    const side = entry !== null && stop !== null && stop > entry ? 'short' : 'long';

    // El tope duro se corta aquí porque `lotSizing` no lo conoce: es una
    // decisión de producto, no de aritmética. Lo de «sin stop no hay tamaño»
    // sí lo resuelve el motor, y ahí es donde tiene que estar — las dos
    // calculadoras cayeron por separado en enseñar el aviso Y una cifra.
    const sizing = budget.blocked ? { convertible: true, lots: null } : lotSizing({
      entry, stopDistance, contractSize, spec,
      capital: balance, riskAmount: budget.amount, leverage,
    });

    return {
      spec, contractSize, entry, stop, balance, leverage, budget, side,
      stopDistance,
      // Cuánto se mueve el precio hasta el stop, en porcentaje. Es la única
      // cifra que no depende del instrumento, y por eso sobrevivía intacta.
      stopPct: stopDistance !== null && entry ? (stopDistance / entry) * 100 : null,
      ...sizing,
      lev: requiredLeverage(sizing.notionalAccount, balance),
      desconocido: contractSize === null
        || (EL_SIMBOLO_MANDA.has(datos.product) && !spec.known),
      sinDistancia: entry !== null && stop !== null && entry === stop,
    };
  }, [datos]);

  const unidad = t(sizingLabelKey(r.spec));

  const enviarAlDiario = async () => {
    if (r.lots === null || enviando) return;
    setEnviando(true);
    try {
      await createTrade({
        symbol: r.spec.symbol,
        // El producto viaja: sin él el backend supone contado y el
        // multiplicador se pierde.
        instrument_type: datos.product,
        side: r.side,
        entry_price: r.entry,
        sl: r.stop,
        sl_unit: 'price',
        // En la unidad del instrumento, con su tamaño de contrato al lado.
        quantity: r.lots,
        multiplier: r.contractSize,
        lot_type: datos.product === 'forex' ? datos.lotType : null,
        leverage: r.spec.usesLeverage ? r.leverage : null,
        status: 'open',
        account_balance: r.balance ?? 0,
        notes: t('journalFromCalcNote'),
      });
      toast.success(t('sentToJournal'));
    } catch (_e) {
      toast.error(t('sendToJournalError'));
    } finally {
      setEnviando(false);
    }
  };

  const guardar = async () => {
    if (r.lots !== null && isAuthenticated) {
      await saveCalculation('position_size', datos, {
        lots: r.lots, units: r.units, notional: r.notionalAccount, risk: r.riskAccount,
      });
    }
  };

  const Campo = ({ etiqueta, k, paso = 'any', ayuda, testid }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {ayuda ? <LabelWithHelp bodyKey={ayuda}>{etiqueta}</LabelWithHelp> : etiqueta}
      </Label>
      <Input
        type="number" step={paso} value={datos[k]}
        onChange={(e) => set(k)(e.target.value)}
        className="font-mono tabular-nums"
        data-testid={testid}
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
    <Card className="bg-card border-border" data-testid="position-size-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          {t('positionSizeCalcTitle_p002')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescPosition')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tfProduct')}</Label>
          <div className="flex flex-wrap gap-1.5" data-testid="position-product-picker">
            {PRODUCTOS.map((p) => (
              <button
                key={p} type="button"
                onClick={() => setDatos((prev) => ({ ...prev, product: p }))}
                className={`px-3 py-2 rounded-sharp text-xs font-bold uppercase tracking-wider border transition-colors ${
                  datos.product === p
                    ? 'bg-primary/15 text-primary border-primary/50'
                    : 'border-rule text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`position-product-${p}`}
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
              data-testid="position-symbol"
            />
          </div>
          {datos.product === 'forex' ? (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('deskLotType')}</Label>
              <select
                value={datos.lotType}
                onChange={(e) => set('lotType')(e.target.value)}
                className="w-full h-10 bg-muted border border-rule rounded-sharp px-2 text-xs"
                data-testid="position-lot-type"
              >
                {Object.values(FOREX_LOT_TYPES).map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {t(`lot_${lt.id}`)} · {lt.units.toLocaleString('en-US')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Campo
              etiqueta={<LabelWithHelp bodyKey="helpAccountBalance">{t('balanceDeCuenta_89aff2')}</LabelWithHelp>}
              k="balance" testid="position-balance"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {datos.product === 'forex' && (
            <Campo
              etiqueta={<LabelWithHelp bodyKey="helpAccountBalance">{t('balanceDeCuenta_89aff2')}</LabelWithHelp>}
              k="balance" testid="position-balance"
            />
          )}
          <Campo etiqueta={t('precioEntrada_caf850')} k="entry" testid="position-entry" />
          <Campo etiqueta={t('posStopPrice')} k="stop" testid="position-stop" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              <LabelWithHelp bodyKey="helpRiskPerTrade">{t('riesgoPorOperacion_3d966d')}</LabelWithHelp>
            </Label>
            <span className="font-mono text-lg font-bold text-primary tabular-nums" data-testid="position-risk-pct">
              {datos.riskPct}%
            </span>
          </div>
          <Slider
            value={[Number(datos.riskPct) || 0]}
            onValueChange={(v) => set('riskPct')(Array.isArray(v) ? v[0] : v)}
            min={0.5} max={10} step={0.5}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5%</span>
            <span>{t('___2Recomendado_867927')}</span>
            <span>10%</span>
          </div>
        </div>

        {/* ── Lo que impide contestar, dicho donde pasa ─────────────── */}
        {r.desconocido && (
          <div className="p-3 rounded-lg bg-muted/50 border border-rule flex gap-2 text-xs" data-testid="position-unknown">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('lotUnknownSymbol').replace('{symbol}', datos.symbol || '—')}</p>
          </div>
        )}

        {r.sinDistancia && (
          <div className="p-3 rounded-lg bg-muted/50 border border-rule flex gap-2 text-xs" data-testid="position-no-distance">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('posNoDistance')}</p>
          </div>
        )}

        {r.budget.reason === 'over_cap' && (
          <div className="p-3 rounded-lg bg-short/10 border border-short/40 text-xs text-short font-semibold"
            data-testid="position-over-cap">
            {t('deskRiskOverCapInline').replace('{cap}', String(RISK_HARD_CAP_PCT))}
          </div>
        )}

        {!r.convertible && !r.desconocido && (
          <div className="p-3 rounded-lg bg-muted/50 border border-rule flex gap-2 text-xs" data-testid="position-not-convertible">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('lotCrossPair').replace('{quote}', quoteCurrency(r.spec))}</p>
          </div>
        )}

        {/* ── La respuesta ─────────────────────────────────────────── */}
        {r.lots !== null && (
          <div className="space-y-3" data-testid="position-results">
            <div className="grid grid-cols-2 gap-3">
              <Cifra
                etiqueta={t('tamanoDePosicionRecomendado_7d9b61')} destacado testid="position-result-size"
                valor={fmtNum(r.lots, r.step && r.step < 1 ? 4 : 0)}
                nota={`${unidad} · ${fmtNum(r.units, 0)} ${t('lotUnits')}`}
              />
              <Cifra
                etiqueta={t('deskAnswerNotionalInline')} testid="position-result-notional"
                valor={fmtMoney(r.notionalAccount)}
                nota={`${t('lotMargin')}: ${fmtMoney(r.marginAccount)} · ${fmtNum(r.leverage, 1)}×`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Cifra
                etiqueta={t('slDistanceLabel_pos002')} testid="position-result-stop"
                valor={r.stopPct === null ? '—' : `${fmtNum(r.stopPct, 2)}%`}
                nota={fmtNum(r.stopDistance, r.stopDistance !== null && r.stopDistance < 0.01 ? 5 : 2)}
              />
              <Cifra
                etiqueta={t('apalancamientoNecesario_f6ca45')} testid="position-result-leverage"
                valor={r.lev === null ? '—' : `${fmtNum(r.lev, 1)}×`}
              />
              <Cifra
                etiqueta={t('lotBinding')} testid="position-result-binding"
                valor={r.binding ? t(BINDING_META[r.binding].labelKey) : '—'}
              />
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 text-center" data-testid="position-result-risk">
              <p className="text-xs text-muted-foreground">{t('perdidaMaximaSiTocaSl_1986d0')}</p>
              <p className="text-xl font-bold text-destructive font-mono tabular-nums">{fmtMoney(r.riskAccount)}</p>
              <p className="text-xs text-muted-foreground">
                {r.riskAccount !== null && r.balance
                  ? `${((r.riskAccount / r.balance) * 100).toFixed(2)}% ${t('lotOfAccount')}`
                  : '—'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={limpiar} variant="outline" className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('clearShort_p006')}
              </Button>
              {isAuthenticated && (
                <Button onClick={guardar} variant="outline" className="flex-1">
                  <Save className="w-4 h-4 mr-2" /> {t('save_lev008')}
                </Button>
              )}
            </div>

            {isAuthenticated && (
              <Button
                onClick={enviarAlDiario}
                disabled={enviando}
                className="w-full bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25"
                data-testid="position-send-journal"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {enviando ? '…' : t('sendToJournal')}
              </Button>
            )}
          </div>
        )}

        {r.lots === null && (
          <Button onClick={limpiar} variant="outline" className="w-full">
            <Trash2 className="w-4 h-4 mr-2" />
            {t('clearData')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
