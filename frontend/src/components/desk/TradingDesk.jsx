import React, { useMemo, useState } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { useCloudPref } from '@/lib/cloudPrefs';
import { usePersistedState } from '@/hooks/usePersistedState';
import { createTrade } from '@/services/performanceApi';
import {
  SELECTABLE_PRODUCTS,
  resolveSpec, contractSizeFor, unitToDistance, levelFromDistance,
  positionMetrics,
} from '@/lib/instruments';
import {
  riskBudget, marginModesFor, liquidationView,
  maxSizes, minTicket, breakEven, commissionTotal, stepValues,
  requiredLeverage, effectiveLeverage,
} from '@/lib/deskMath';
import DeskForm from './DeskForm';
import DeskAnswer from './DeskAnswer';
import DeskDetail from './DeskDetail';
import OptionStrategyPicker from './OptionStrategyPicker';

const nz = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const DESK_VACIA = {
  product: 'stock',
  symbol: '',
  side: 'long',
  entry_price: '',
  sl: '', sl_unit: 'price', sl_input: '',
  tp: '', tp_unit: 'price', tp_input: '',
  lot_type: 'standard',
  multiplier: '',
  leverage: '',
  margin_mode: '',
  option_strategy: 'long_call',
};

/**
 * La calculadora de posición.
 *
 * Contesta a **una** pregunta —*cuánto compro*— y la contesta con un número y
 * una frase. Todo lo demás está subordinado a eso.
 *
 * La primera versión no lo hacía: era un terminal de bróker con dieciocho
 * campos a la vista, veinte cifras de salida del mismo tamaño y recálculo
 * continuo sin botón. Calculaba bien y comunicaba mal, que en una calculadora
 * es lo mismo que calcular mal — si hay que descifrar cuál de las veinte cifras
 * responde a la pregunta, no ha respondido.
 *
 * Lo que cambió y por qué:
 *
 *   · **Un botón de Calcular.** El recálculo en vivo es lo correcto en un
 *     terminal donde el precio se mueve solo; aquí los números cambiaban sin
 *     que nadie los pidiera y nunca quedaba claro cuál era «el bueno». El botón
 *     marca el final de la pregunta, y es lo que hacen las otras catorce
 *     calculadoras de esta web.
 *   · **La respuesta es una frase**, no una rejilla: «compra 1 contrato ·
 *     arriesgas 100 € para ganar 300 €». Debajo, tres cifras de control.
 *   · **El desglose se abre si se quiere.** Las otras catorce cifras siguen
 *     estando —nocional, exposición, break-even, valor del pip, liquidación,
 *     billete mínimo— pero detrás de un clic, porque son verificación y no
 *     respuesta.
 *   · **El resultado es una foto, no un flujo.** Se congela al pulsar. Si
 *     luego cambias un campo, el resultado se marca como caducado en vez de
 *     mutar por debajo: un número que cambia solo no se puede copiar al bróker
 *     con confianza.
 *
 * La aritmética no ha cambiado: sigue en `lib/deskMath.js` con sus 264
 * comprobaciones. Lo que se ha rehecho es cómo se pregunta y cómo se contesta.
 */
export default function TradingDesk() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const [account, setAccount] = useCloudPref('deskAccount');
  const [form, setForm, limpiarForm] = usePersistedState('trading_desk_v2', DESK_VACIA);
  const [resultado, setResultado] = useState(null);
  const [avanzado, setAvanzado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const patchAccount = (k, v) => setAccount((p) => ({ ...(p || {}), [k]: v }));

  // ── Lo que el producto decide ───────────────────────────────────
  const product = form.product || 'stock';
  const esOpcion = product === 'option';
  const spec = useMemo(() => resolveSpec(product, form.symbol), [product, form.symbol]);
  const contractSize = useMemo(
    () => contractSizeFor(product, form.symbol, { override: form.multiplier, lotType: form.lot_type }),
    [product, form.symbol, form.multiplier, form.lot_type],
  );
  const entry = nz(form.entry_price);
  const capital = nz(account?.capital);
  const leverage = useMemo(
    () => effectiveLeverage({ declared: form.leverage, spec, entry, contractSize }),
    [form.leverage, spec, entry, contractSize],
  );
  const marginInfo = useMemo(() => marginModesFor(spec), [spec]);
  const marginMode = marginInfo.modes.includes(form.margin_mode)
    ? form.margin_mode
    : marginInfo.default;

  const budget = useMemo(() => riskBudget({
    capital,
    riskPct: account?.riskPct,
    riskMoney: account?.riskMoney,
    mode: account?.riskMode === 'money' ? 'money' : 'pct',
  }), [capital, account?.riskPct, account?.riskMoney, account?.riskMode]);

  // Los niveles se resuelven en vivo porque el campo enseña «→ 4980.00» debajo
  // mientras escribes: eso es feedback de ENTRADA, no un resultado.
  const levels = useMemo(() => {
    const out = { sl: nz(form.sl), tp: nz(form.tp), riskDistance: null };
    if (!entry) return out;
    const ctx = { entry, quantity: null, contractSize, spec, balance: capital };
    if (form.sl_unit !== 'price') {
      const d = unitToDistance(form.sl_input, form.sl_unit, ctx);
      out.sl = d ? levelFromDistance(entry, d, form.side, 'sl') : null;
      out.riskDistance = d;
    } else if (out.sl != null) {
      out.riskDistance = Math.abs(entry - out.sl);
    }
    if (form.tp_unit !== 'price') {
      const d = unitToDistance(form.tp_input, form.tp_unit, { ...ctx, riskDistance: out.riskDistance });
      out.tp = d ? levelFromDistance(entry, d, form.side, 'tp') : null;
    }
    return out;
  }, [entry, contractSize, spec, capital, form.sl, form.tp,
    form.sl_unit, form.sl_input, form.tp_unit, form.tp_input, form.side]);

  // ── Qué falta para poder contestar ──────────────────────────────
  // Se nombra el hueco concreto en vez de dejar el botón muerto sin decir por
  // qué: un botón deshabilitado y mudo es la peor forma de pedir un dato.
  const falta = useMemo(() => {
    if (capital == null) return 'capital';
    if (budget.reason === 'no_risk') return 'risk';
    if (entry == null) return 'entry';
    if (levels.riskDistance == null) return 'stop';
    if (contractSize == null) return 'contract';
    return null;
  }, [capital, budget.reason, entry, levels.riskDistance, contractSize]);

  const puedeCalcular = !falta || budget.reason === 'over_cap';

  // ── Calcular: la foto ───────────────────────────────────────────
  const calcular = () => {
    if (budget.blocked) {
      setResultado({ blockedReason: budget.reason, budget, sello: Date.now() });
      return;
    }
    if (falta) {
      setResultado({ blockedReason: falta, budget, sello: Date.now() });
      return;
    }

    const sizes = maxSizes({
      entry, stopDistance: levels.riskDistance, contractSize,
      riskAmount: budget.amount, capital, leverage, spec,
    });
    const quantity = sizes.quantity;
    const minimo = minTicket({
      entry, stopDistance: levels.riskDistance, contractSize, capital, leverage, spec,
    });

    if (quantity == null) {
      setResultado({ blockedReason: 'too_small', budget, minimo, sizes, sello: Date.now() });
      return;
    }

    const metrics = positionMetrics({
      entry, quantity, contractSize, leverage, balance: capital, side: form.side,
      sl: levels.sl, tp: levels.tp, spec,
    });
    const fees = commissionTotal({
      notional: metrics.notional, quantity,
      perUnit: form.fee_per_unit, pctNotional: form.fee_pct, flat: form.fee_flat,
    });

    setResultado({
      sello: Date.now(),
      firma: firmaDe(form, account),
      budget, sizes, minimo, metrics, quantity, spec, contractSize, leverage,
      marginMode, levels, symbol: form.symbol, side: form.side, esOpcion,
      liquidation: liquidationView({
        entry, side: form.side, mode: marginMode, notional: metrics.notional,
        marginUsed: metrics.marginUsed, capital, sl: levels.sl,
      }),
      steps: stepValues({ quantity, contractSize, spec }),
      breakEvenPrice: breakEven({ entry, side: form.side, quantity, contractSize, feesTotal: fees }),
      fees,
      freeCapital: capital != null && metrics.marginUsed != null ? capital - metrics.marginUsed : null,
      leverageNeeded: requiredLeverage(metrics.notional, capital),
    });
  };

  // El resultado caduca si cambia algo de lo que lo produjo. No se recalcula
  // solo: se avisa. Recalcular por debajo haría que la cifra que estás copiando
  // al bróker cambie mientras la copias.
  const caducado = resultado?.firma != null && resultado.firma !== firmaDe(form, account);

  /**
   * Un nivel de precio pertenece a un instrumento, así que cambiar de
   * instrumento lo invalida.
   *
   * Sin esto, un objetivo de 5060 escrito para el E-mini sobrevivía al saltar a
   * EURUSD y la respuesta salía «arriesgas 48 $ para ganar 80 942 640 $». La
   * aritmética era correcta —5060 menos 1,085, por 16 000 unidades— y el
   * resultado, absurdo. Un número absurdo con la cara de un número bueno es
   * peor que no dar número.
   */
  const NIVELES_VACIOS = {
    entry_price: '', sl: '', sl_input: '', tp: '', tp_input: '',
  };

  const cambiarProducto = (id) => {
    const siguiente = resolveSpec(id, form.symbol);
    setForm((p) => ({
      ...p,
      ...NIVELES_VACIOS,
      product: id,
      multiplier: '',
      leverage: '',
      margin_mode: marginModesFor(siguiente).default || '',
      lot_type: id === 'forex' ? (p.lot_type || 'standard') : p.lot_type,
      // Las unidades del producto anterior pueden no existir en el nuevo
      // (pips en futuros, ticks en forex): se vuelve a precio, que siempre vale.
      sl_unit: (siguiente.quoteUnits || []).includes(p.sl_unit) ? p.sl_unit : 'price',
      tp_unit: p.tp_unit === 'r' || (siguiente.quoteUnits || []).includes(p.tp_unit) ? p.tp_unit : 'price',
    }));
    setResultado(null);
  };

  /**
   * Cambiar de activo dentro del mismo producto vacía los niveles por el mismo
   * motivo, pero sólo cuando el símbolo cambia DE VERDAD: el campo se escribe
   * letra a letra, y borrar la entrada en cada pulsación haría imposible
   * teclear un símbolo con el precio ya puesto.
   */
  const cambiarSimbolo = (valor) => {
    const simbolo = String(valor || '').toUpperCase();
    setForm((p) => (p.symbol === simbolo
      ? p
      : { ...p, ...(p.symbol ? NIVELES_VACIOS : {}), symbol: simbolo }));
  };

  const alDiario = async () => {
    if (!resultado?.quantity || enviando) return;
    setEnviando(true);
    try {
      await createTrade({
        symbol: form.symbol,
        side: form.side,
        instrument_type: product,
        entry_price: entry,
        sl: levels.sl,
        tp: levels.tp,
        quantity: resultado.quantity,
        multiplier: contractSize,
        leverage: spec.usesLeverage ? leverage : null,
        lot_type: product === 'forex' ? (form.lot_type || 'standard') : null,
        account_balance: capital ?? 0,
        fees: resultado.fees || 0,
        status: 'open',
        entry_date: new Date().toISOString(),
        option_strategy: esOpcion ? (form.option_strategy || null) : null,
        notes: t('deskJournalNote'),
      });
      toast.success(t('sentToJournal'));
    } catch (err) {
      const detalle = err?.response?.data?.detail;
      toast.error(typeof detalle === 'string' ? detalle : t('sendToJournalError'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] gap-5 items-start"
      data-testid="trading-desk">
      {/* ── Preguntar ──────────────────────────────────────────── */}
      <div className="space-y-5">
        <DeskForm
          form={form} setForm={setForm}
          account={account} patchAccount={patchAccount}
          spec={spec} contractSize={contractSize} leverage={leverage}
          marginInfo={marginInfo} marginMode={marginMode}
          products={SELECTABLE_PRODUCTS}
          budget={budget} levels={levels}
          onProduct={cambiarProducto}
          onSymbol={cambiarSimbolo}
          onCalcular={calcular}
          puedeCalcular={puedeCalcular}
          avanzado={avanzado} setAvanzado={setAvanzado}
        />

        {esOpcion && (
          <div className="rounded-lg border border-rule bg-card p-4 md:p-5" data-testid="desk-option-block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              {t('deskOptionStructure')}
            </p>
            <OptionStrategyPicker
              value={form.option_strategy}
              onChange={(id) => setForm((p) => ({ ...p, option_strategy: id }))}
            />
          </div>
        )}
      </div>

      {/* ── Contestar ──────────────────────────────────────────── */}
      <div className="space-y-4 lg:sticky lg:top-24">
        {!resultado ? (
          <EsperandoPregunta t={t} falta={falta} />
        ) : (
          <>
            {caducado && (
              <p className="rounded-sharp border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary"
                data-testid="desk-stale">
                {t('deskStale')}
              </p>
            )}

            <DeskAnswer
              budget={resultado.budget}
              quantity={resultado.quantity}
              spec={resultado.spec || spec}
              metrics={resultado.metrics}
              liquidation={resultado.liquidation}
              marginMode={resultado.marginMode}
              symbol={resultado.symbol}
              side={resultado.side}
              isOption={resultado.esOpcion}
              blockedReason={resultado.blockedReason}
            />

            {resultado.quantity != null && (
              <>
                <DeskDetail resultado={resultado} />

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" className="gap-2"
                    onClick={() => { limpiarForm(); setResultado(null); }}
                    data-testid="desk-reset">
                    <RotateCcw className="w-4 h-4" /> {t('clearData')}
                  </Button>
                  {isAuthenticated && (
                    <Button type="button" onClick={alDiario} disabled={enviando}
                      className="gap-2 ml-auto" data-testid="desk-to-journal">
                      <BookOpen className="w-4 h-4" />
                      {enviando ? t('saving') : t('sendToJournal')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Firma de lo que produjo un resultado. Si cambia, el resultado ya no describe
 * lo que hay en pantalla y se marca como caducado.
 */
function firmaDe(form, account) {
  return JSON.stringify([
    form.product, form.symbol, form.side, form.entry_price,
    form.sl, form.sl_unit, form.sl_input, form.tp, form.tp_unit, form.tp_input,
    form.multiplier, form.leverage, form.margin_mode, form.lot_type,
    account?.capital, account?.riskPct, account?.riskMoney, account?.riskMode,
  ]);
}

/**
 * El estado inicial. No enseña ceros ni una rejilla vacía: dice qué falta para
 * poder contestar, que es lo único útil que se puede decir todavía.
 */
function EsperandoPregunta({ t, falta }) {
  return (
    <section
      className="rounded-lg border border-dashed border-rule bg-card/40 p-6 text-center"
      data-testid="desk-empty"
    >
      <p className="font-mono text-4xl text-muted-foreground/40 tabular-nums">—</p>
      <p className="mt-3 text-sm font-semibold">{t('deskEmptyTitle')}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
        {falta ? t(`deskMissing_${falta}`) : t('deskEmptyReady')}
      </p>
    </section>
  );
}
