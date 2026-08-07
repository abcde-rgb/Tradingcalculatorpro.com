import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Plus, AlertCircle, Gauge, Target, NotebookPen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SectionCard, { SectionHeading } from '@/components/options/SectionCard';
import { useTranslation } from '@/lib/i18n';
import { createTrade, updateTrade, backendSupportsProducts } from '@/services/performanceApi';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';
import {
  loadSystem, tradeSetups, addSetup, setupRulesFor,
  SETUP_SEPARATOR, MAX_SETUPS_PER_TRADE,
} from '@/lib/tradingSystem';
import {
  FOREX_LOT_TYPES, MIN_RR_FLOOR, selectableProducts, defaultProductFor,
  resolveSpec, contractSizeFor, unitToDistance, levelFromDistance,
  positionMetrics, fundingCost, swapCost, suggestedLeverage, sizingLabelKey,
} from '@/lib/instruments';
import { PRODUCT_META, fmtNum } from './form/productMeta';
import LivePosition from './form/LivePosition';
import LevelInput from './form/LevelInput';
import CostsSection from './form/CostsSection';
import OptionsSection from './form/OptionsSection';
import AlertSection from './form/AlertSection';
import { toast } from 'sonner';

const SIDES = [
  { id: 'long',  labelKey: 'tradeFormSideLong',  color: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40' },
  { id: 'short', labelKey: 'tradeFormSideShort', color: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40' },
];

// Compra/venta de la opción (long = comprada, short = vendida/emitida)
const OPTION_SIDES = [
  { id: 'long',  labelKey: 'tradeOptionBuy',  color: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40' },
  { id: 'short', labelKey: 'tradeOptionSell', color: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40' },
];

const STATUS_OPTIONS = [
  { id: 'open',    labelKey: 'tradeStatusOpen' },
  { id: 'closed',  labelKey: 'tradeStatusClosed' },
  { id: 'sl_hit',  labelKey: 'tradeStatusSLHit' },
  { id: 'tp_hit',  labelKey: 'tradeStatusTPHit' },
];

const nz = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * TradeFormModal — dar de alta una operación de cualquier producto financiero.
 *
 * El orden de la pantalla ES la funcionalidad, y es el orden en el que se piensa
 * una operación:
 *
 *   1. **Producto** — porque decide todo lo demás. Un lote de forex son 100 000
 *      unidades, un contrato de oro son 100 onzas, un perpetuo paga funding: sin
 *      saber qué se opera, "cantidad 1" no significa nada.
 *   2. **Activo, entrada, tamaño, apalancamiento, saldo** — los cinco datos que
 *      definen la posición, en una sola fila y sin nada en medio.
 *   3. **La posición, en vivo** — nocional, margen, exposición, liquidación. Es
 *      lo que contesta "¿es esto grande?" antes de mandar la orden.
 *   4. **Stop y objetivo**, en la unidad que use el trader (pips, ticks, dinero,
 *      % de la cuenta, R…), con el riesgo y el R:B medidos sobre la posición.
 *
 * Y lo accesorio —costes, contexto de opciones, aviso, excursión, notas— en
 * secciones plegadas, siguiendo la misma regla que el panel de opciones: lo que
 * no se necesita para dar de alta la operación no ocupa pantalla.
 *
 * **Lo que se guarda sigue siendo lo de siempre**: un nivel de precio en `sl` y
 * en `tp`, una cantidad y un multiplicador. Las unidades son una capa de entrada
 * y viajan al lado sólo para poder repintar el formulario; ninguna métrica las
 * mira. Es lo que permite que las operaciones nuevas y las de hace un año se
 * midan con la misma regla.
 */
const TradeFormModal = ({ open, onClose, onSaved, initialTrade = null }) => {
  const { t } = useTranslation();
  const isEdit = Boolean(initialTrade?.id);
  const [saving, setSaving] = useState(false);

  // Los setups de la operación son una LISTA: una entrada por confluencia de
  // dos condiciones responde a las dos, y obligar a elegir una hacía que la
  // otra no existiera para la analítica.
  const [setups, setSetups] = useState(() => tradeSetups(initialTrade || {}));
  const [setupDraft, setSetupDraft] = useState('');

  const [form, setForm] = useState(() => initialTrade || {
    symbol: '',
    side: 'long',
    instrument_type: 'stock',
    entry_price: '',
    exit_price: '',
    sl: '', sl_unit: 'price', sl_input: '',
    tp: '', tp_unit: 'price', tp_input: '',
    mae_price: '',
    mfe_price: '',
    quantity: '',
    lot_type: 'standard',
    multiplier: '',
    leverage: '',
    account_balance: 10000,
    fees: 0,
    status: 'open',
    emotion: 3,
    notes: '',
    option_type: 'call',
    strike: '',
    expiry: '',
    notify: null,
  });

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [k]: v }));
  };

  // ── Qué productos sabe guardar el backend que hay delante ─────────
  // El frontend se publica solo al mergear y el backend se sube a mano, así que
  // hay una ventana en la que el navegador va por delante del servidor. Ofrecer
  // ahí un CFD no degrada: el servidor responde 422 y no se guarda nada. Se
  // pregunta una vez y, si el backend es anterior, el selector se queda con lo
  // que sí sabe registrar y se dice por qué.
  const [backendProducts, setBackendProducts] = useState(null);
  useEffect(() => {
    let alive = true;
    backendSupportsProducts().then((ok) => { if (alive) setBackendProducts(ok); });
    return () => { alive = false; };
  }, []);

  const products = selectableProducts(backendProducts);
  const restricted = backendProducts === false;

  // Si el producto elegido no lo acepta este backend, se cae al equivalente que
  // sí: `spot` se comporta exactamente igual que antes (×1, sin apalancamiento).
  // Al editar una operación vieja no se toca nada — ya está guardada.
  useEffect(() => {
    if (!restricted || isEdit) return;
    setForm((p) => (products.includes(p.instrument_type)
      ? p
      : { ...p, instrument_type: defaultProductFor(false), leverage: '' }));
  }, [restricted, isEdit]);   // eslint-disable-line react-hooks/exhaustive-deps

  const mySetups = useMemo(
    () => loadSystem().setups.map((s) => s.name).filter(Boolean),
    [],
  );
  const isPicked = (name) => setups.some((s) => s.toLowerCase() === name.toLowerCase());
  const toggleSetup = (name) => setSetups((prev) => (
    prev.some((s) => s.toLowerCase() === name.toLowerCase())
      ? prev.filter((s) => s.toLowerCase() !== name.toLowerCase())
      : addSetup(prev, name)
  ));
  const addDraft = () => {
    setSetups((prev) => addSetup(prev, setupDraft));
    setSetupDraft('');
  };
  const setupsFull = setups.length >= MAX_SETUPS_PER_TRADE;

  // ── El instrumento y su ficha ─────────────────────────────────────
  const product = form.instrument_type || 'stock';
  const isOption = product === 'option';
  const spec = useMemo(
    () => resolveSpec(product, form.symbol),
    [product, form.symbol],
  );
  const contractSize = useMemo(
    () => contractSizeFor(product, form.symbol,
      { override: form.multiplier, lotType: form.lot_type }),
    [product, form.symbol, form.multiplier, form.lot_type],
  );

  const entry = nz(form.entry_price);
  const qty = nz(form.quantity);
  const balance = nz(form.account_balance);
  const leverage = nz(form.leverage);

  // Cambiar de producto rehace lo que el producto decide y NO toca lo que el
  // usuario escribió. Si arrastrara el tamaño de contrato del producto anterior,
  // un CFD de oro pasado a acciones seguiría contando 100 onzas por unidad.
  const changeProduct = (id) => {
    const next = resolveSpec(id, form.symbol);
    setForm((p) => ({
      ...p,
      instrument_type: id,
      multiplier: '',
      lot_type: id === 'forex' ? (p.lot_type || 'standard') : p.lot_type,
      leverage: next.usesLeverage ? (next.defaultLeverage ?? p.leverage ?? '') : '',
      // Las unidades del producto anterior pueden no existir en el nuevo
      // (pips en futuros, ticks en forex): se vuelve a precio, que siempre vale.
      sl_unit: (next.quoteUnits || []).includes(p.sl_unit) ? p.sl_unit : 'price',
      tp_unit: p.tp_unit === 'r' || (next.quoteUnits || []).includes(p.tp_unit) ? p.tp_unit : 'price',
    }));
  };

  // Elegir activo rellena el apalancamiento típico de ESE activo — el CFD del
  // oro a 20×, el par mayor a 30× — y se puede cambiar a mano acto seguido.
  const changeSymbol = (raw) => {
    const symbol = String(raw || '').toUpperCase();
    const next = resolveSpec(product, symbol);
    setForm((p) => {
      const notional = (nz(p.entry_price) || 0)
        * (nz(p.quantity) || 0)
        * (contractSizeFor(product, symbol, { lotType: p.lot_type }) || 0);
      const suggested = suggestedLeverage(next, notional);
      return {
        ...p,
        symbol,
        leverage: (!p.leverage && suggested) ? suggested : p.leverage,
      };
    });
  };

  // ── Stop y objetivo: de la unidad elegida al nivel de precio ──────
  const levels = useMemo(() => {
    const out = { sl: nz(form.sl), tp: nz(form.tp), riskDistance: null };
    if (!entry) return out;
    const ctx = { entry, quantity: qty, contractSize, spec, balance };

    if (form.sl_unit !== 'price') {
      const d = unitToDistance(form.sl_input, form.sl_unit, ctx);
      out.sl = d ? levelFromDistance(entry, d, form.side, 'sl') : null;
      out.riskDistance = d;
    } else if (out.sl != null) {
      out.riskDistance = Math.abs(entry - out.sl);
    }

    if (form.tp_unit !== 'price') {
      const d = unitToDistance(form.tp_input, form.tp_unit,
        { ...ctx, riskDistance: out.riskDistance });
      out.tp = d ? levelFromDistance(entry, d, form.side, 'tp') : null;
    }
    return out;
  }, [entry, qty, contractSize, spec, balance, form.sl, form.tp,
    form.sl_unit, form.sl_input, form.tp_unit, form.tp_input, form.side]);

  // ── La posición, calculada en vivo ────────────────────────────────
  const metrics = useMemo(() => positionMetrics({
    entry, quantity: qty, contractSize, leverage, balance, side: form.side,
    sl: levels.sl, tp: levels.tp, maxLoss: form.max_loss, spec,
    maintenanceMarginRate: form.maintenance_margin_rate,
  }), [entry, qty, contractSize, leverage, balance, form.side, levels.sl,
    levels.tp, form.max_loss, form.maintenance_margin_rate, spec]);

  // ── Coste de mantener la posición abierta ─────────────────────────
  const carry = useMemo(() => {
    const declared = nz(form.funding_fees) ?? nz(form.swap_fees);
    if (declared != null) return { total: declared, source: 'declared' };
    if (spec.carry === 'funding') {
      const c = fundingCost(metrics.notional, form.funding_rate_pct, nz(form.funding_periods));
      return c == null ? {} : { total: c, source: 'estimated' };
    }
    if (spec.carry === 'swap') {
      const c = swapCost(metrics.notional, form.swap_rate_pct, nz(form.nights_held));
      return c == null ? {} : { total: c, source: 'estimated' };
    }
    return {};
  }, [spec.carry, metrics.notional, form.funding_fees, form.swap_fees,
    form.funding_rate_pct, form.funding_periods, form.swap_rate_pct, form.nights_held]);

  const costsTotal = (nz(form.fees) || 0) + (carry.total || 0);

  // Las reglas del setup elegido: si tienes escrito "R:B mínimo 2, riesgo 1 %",
  // es contra eso contra lo que hay que avisarte.
  const rules = useMemo(() => setupRulesFor(loadSystem(), setups), [setups]);
  const riskPct = metrics.riskPctBalance;
  const riskWarn = riskPct != null && riskPct > rules.maxRiskPct;
  const rrWarn = metrics.rr != null && metrics.rr < rules.minRR && !metrics.rrBelowFloor;
  const ruleTip = (source) => (source === 'setup'
    ? t('tradeRuleFromSetup').replace('{setups}', rules.from.join(', '))
    : t('tradeRuleDefault'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.entry_price || !form.quantity) {
      toast.error(t('tradeFormMissingRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        symbol: form.symbol,
        side: form.side,
        setups,
        setup: setups.join(SETUP_SEPARATOR),
        instrument_type: product,
        entry_price: Number(form.entry_price),
        exit_price: nz(form.exit_price),
        // Se mandan LAS DOS cosas: el nivel ya resuelto y la unidad con su
        // número. El backend recalcula (no se fía del cliente, y hace bien) y
        // la unidad sobrevive para repintar el formulario tal cual se dejó.
        sl: levels.sl,
        tp: levels.tp,
        sl_unit: form.sl_unit || 'price',
        sl_input: nz(form.sl_input),
        tp_unit: form.tp_unit || 'price',
        tp_input: nz(form.tp_input),
        mae_price: nz(form.mae_price),
        mfe_price: nz(form.mfe_price),
        quantity: Number(form.quantity),
        multiplier: contractSize,
        leverage: spec.usesLeverage ? leverage : null,
        lot_type: product === 'forex' ? (form.lot_type || 'standard') : null,
        maintenance_margin_rate: nz(form.maintenance_margin_rate),
        account_balance: Number(form.account_balance) || 0,
        fees: Number(form.fees) || 0,
        funding_fees: nz(form.funding_fees),
        funding_rate_pct: nz(form.funding_rate_pct),
        funding_periods: nz(form.funding_periods),
        swap_fees: nz(form.swap_fees),
        swap_rate_pct: nz(form.swap_rate_pct),
        nights_held: nz(form.nights_held),
        max_loss: nz(form.max_loss),
        max_profit: nz(form.max_profit),
        status: form.status,
        emotion: form.emotion ? Number(form.emotion) : null,
        notes: form.notes || '',
        option_type: isOption ? (form.option_type || 'call') : null,
        strike: isOption ? nz(form.strike) : null,
        expiry: isOption ? (form.expiry || null) : null,
        option_strategy: isOption ? (form.option_strategy || null) : null,
        iv_entry: isOption ? nz(form.iv_entry) : null,
        iv_exit: isOption ? nz(form.iv_exit) : null,
        delta_entry: isOption ? nz(form.delta_entry) : null,
        underlying_entry: isOption ? nz(form.underlying_entry) : null,
        underlying_exit: isOption ? nz(form.underlying_exit) : null,
        option_outcome: isOption ? (form.option_outcome || null) : null,
        notify: form.notify?.enabled ? form.notify : null,
      };
      const saved = isEdit
        ? await updateTrade(initialTrade.id, payload)
        : await createTrade(payload);
      toast.success(isEdit ? t('tradeUpdated') : t('tradeCreated'));
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      // Un 422 sobre `instrument_type` sólo puede significar una cosa: el
      // backend desplegado es anterior a los productos. El detalle de Pydantic
      // ("string does not match regex") no le dice nada a nadie; esto sí.
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const isProductRejection = status === 422
        && JSON.stringify(detail || '').includes('instrument_type');
      if (isProductRejection) {
        setBackendProducts(false);
        toast.error(t('tfProductsRestricted'));
      } else {
        toast.error(typeof detail === 'string' ? detail : t('tradeSaveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const sides = isOption ? OPTION_SIDES : SIDES;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 overflow-y-auto" data-testid="trade-form-modal">
      <div className="w-full max-w-4xl my-8 bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-unbounded text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {isEdit ? t('editTrade') : t('newTrade')}
          </h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted" aria-label={t('cancel')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* ── 1 · Producto ─────────────────────────────────────────── */}
          <div>
            <SectionHeading step={1} title={t('tfProduct')} hint={t('tfProductHint')} />
            <div className="flex flex-wrap gap-1.5" data-testid="trade-product-picker">
              {products.map((id) => {
                const meta = PRODUCT_META[id];
                const Ic = meta.icon;
                const active = product === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => changeProduct(id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                      active
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`trade-product-${id}`}
                  >
                    <Ic className="w-3.5 h-3.5" />
                    {t(meta.labelKey)}
                  </button>
                );
              })}
            </div>
            <InstrumentCard spec={spec} contractSize={contractSize} t={t} />
            {/* Decirlo es la mitad del arreglo: sin este aviso, el usuario ve
                menos productos de los que la web anuncia y no sabe por qué. */}
            {restricted && (
              <p
                className="mt-2 flex items-start gap-1.5 text-[11px] text-[#f59e0b] leading-relaxed"
                data-testid="trade-products-restricted"
              >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {t('tfProductsRestricted')}
              </p>
            )}
          </div>

          {/* ── 2 · La posición ──────────────────────────────────────── */}
          <div>
            <SectionHeading step={2} title={t('tfPositionBlock')} hint={t('tfPositionBlockHint')} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tradeSymbol')} *
                </Label>
                <div className="mt-1">
                  <UniversalAssetSearch
                    value={form.symbol}
                    onChange={(asset) => changeSymbol(asset?.symbol || asset?.id || '')}
                    placeholder={t('tradeSymbolSearch')}
                    testId="trade-symbol-search"
                  />
                </div>
                {/* Escritura directa: hay más símbolos en el mundo que en
                    cualquier buscador, y un diario que no deja apuntar el tuyo
                    no es tu diario. */}
                <Input
                  value={form.symbol}
                  onChange={(e) => changeSymbol(e.target.value)}
                  placeholder={product === 'forex' ? 'EURUSD' : 'AAPL'}
                  className="mt-1.5 uppercase text-xs h-8"
                  data-testid="trade-symbol"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {isOption ? t('tradeOptionSideLabel') : t('tradeSide')} *
                </Label>
                <div className="mt-1 flex gap-1.5">
                  {sides.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => set('side')(s.id)}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                        form.side === s.id ? s.color : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`trade-side-${s.id}`}
                    >
                      {t(s.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {isOption ? t('tradePremiumEntry') : t('tradeEntry')} *
                </Label>
                <Input type="number" step="any" value={form.entry_price}
                  onChange={set('entry_price')} className="mt-1" data-testid="trade-entry" />
              </div>
            </div>

            {/* Tamaño · apalancamiento · saldo — la fila que decide si la
                operación es grande. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t(sizingLabelKey(spec))} *
                </Label>
                <Input type="number" step="any" value={form.quantity}
                  onChange={set('quantity')} className="mt-1" data-testid="trade-quantity" />
                {product === 'forex' && (
                  <select
                    value={form.lot_type || 'standard'}
                    onChange={(e) => set('lot_type')(e.target.value)}
                    className="mt-1 w-full bg-muted border border-border rounded-md px-2 py-1 text-[11px]"
                    data-testid="trade-lot-type"
                  >
                    {Object.values(FOREX_LOT_TYPES).map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {t(`lot_${lt.id}`)} · {lt.units.toLocaleString('en-US')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tfContractSize')}
                </Label>
                <Input
                  type="number" step="any"
                  value={form.multiplier ?? ''}
                  onChange={set('multiplier')}
                  placeholder={contractSize != null ? String(contractSize) : t('tfContractSizeUnknown')}
                  className="mt-1"
                  data-testid="trade-multiplier"
                />
                <div className={`text-[10px] mt-0.5 ${contractSize == null ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>
                  {contractSize == null ? t('tfContractSizeMissing') : t('tfContractSizeHint')}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tfLeverage')}
                </Label>
                {spec.usesLeverage ? (
                  <>
                    <Input
                      type="number" step="any" min="1" value={form.leverage ?? ''}
                      onChange={set('leverage')} className="mt-1"
                      placeholder={spec.defaultLeverage ? String(spec.defaultLeverage) : '1'}
                      data-testid="trade-leverage"
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {spec.maxLeverage
                        ? t('tfLeverageTypical').replace('{max}', fmtNum(spec.maxLeverage, 0))
                        : t('tfLeverageHint')}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 h-10 flex items-center px-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground"
                    data-testid="trade-leverage-na"
                  >
                    {t('tfLeverageNA')}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tradeBalance')}
                </Label>
                <Input type="number" step="any" value={form.account_balance}
                  onChange={set('account_balance')} className="mt-1" data-testid="trade-balance" />
                <div className="text-[10px] text-muted-foreground mt-0.5">{t('tfBalanceHint')}</div>
              </div>
            </div>
          </div>

          {/* ── 3 · La posición, en vivo ─────────────────────────────── */}
          <div>
            <SectionHeading step={3} title={t('tfLiveBlock')} hint={t('tfLiveBlockHint')} />
            <LivePosition
              metrics={metrics}
              spec={spec}
              costsTotal={costsTotal || null}
              rrFloor={MIN_RR_FLOOR}
            />
          </div>

          {/* ── 4 · Stop, objetivo y estado ──────────────────────────── */}
          <div>
            <SectionHeading step={4} title={t('tfLevelsBlock')} hint={t('tfLevelsBlockHint')} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <LevelInput
                kind="sl" label={t('tradeSL')} spec={spec}
                unit={form.sl_unit} value={form.sl_unit === 'price' ? form.sl : form.sl_input}
                onUnitChange={(u) => setForm((p) => ({ ...p, sl_unit: u }))}
                onValueChange={(v) => setForm((p) => (
                  p.sl_unit === 'price' ? { ...p, sl: v } : { ...p, sl_input: v }))}
                resolvedPrice={levels.sl}
                testid="trade-sl"
              />
              <LevelInput
                kind="tp" label={t('tradeTP')} spec={spec}
                unit={form.tp_unit} value={form.tp_unit === 'price' ? form.tp : form.tp_input}
                onUnitChange={(u) => setForm((p) => ({ ...p, tp_unit: u }))}
                onValueChange={(v) => setForm((p) => (
                  p.tp_unit === 'price' ? { ...p, tp: v } : { ...p, tp_input: v }))}
                resolvedPrice={levels.tp}
                testid="trade-tp"
              />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {isOption ? t('tradePremiumExit') : t('tradeExit')}
                </Label>
                <Input type="number" step="any" value={form.exit_price}
                  onChange={set('exit_price')} className="mt-1" data-testid="trade-exit" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tradeStatus')}
                </Label>
                <select
                  value={form.status}
                  onChange={(e) => set('status')(e.target.value)}
                  className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
                  data-testid="trade-status"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{t(s.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Los avisos que salen de las reglas del propio trader. El suelo
                1:1 lo pinta el panel de arriba; esto es lo que él escribió. */}
            {(rrWarn || riskWarn) && (
              <div className="mt-3 flex flex-wrap gap-3" data-testid="trade-rule-warnings">
                {rrWarn && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#f59e0b]" title={ruleTip(rules.rrSource)}>
                    <AlertCircle className="w-3 h-3" />
                    {t('tradeWarnLowRR')} · {t('tradeRuleMinRR').replace('{v}', String(rules.minRR))}
                  </span>
                )}
                {riskWarn && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#ef4444]" title={ruleTip(rules.riskSource)}>
                    <AlertCircle className="w-3 h-3" />
                    {t('tradeWarnOversize')} · {t('tradeRuleMaxRisk').replace('{v}', String(rules.maxRiskPct))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Opciones: mismo formulario, campos propios ───────────── */}
          {isOption && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-primary/[0.04] border border-primary/20" data-testid="trade-option-fields">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeOptionType')}</Label>
                <div className="mt-1 flex gap-1.5">
                  {[{ id: 'call', k: 'tradeOptionCall' }, { id: 'put', k: 'tradeOptionPut' }].map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => set('option_type')(o.id)}
                      className={`flex-1 px-2 py-2 rounded-md text-xs font-bold uppercase border transition-all ${
                        form.option_type === o.id
                          ? (o.id === 'call' ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40' : 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/40')
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`trade-option-${o.id}`}
                    >
                      {t(o.k)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeStrike')}</Label>
                <Input type="number" step="any" value={form.strike} onChange={set('strike')} className="mt-1" data-testid="trade-strike" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeExpiry')}</Label>
                <Input type="date" value={form.expiry || ''} onChange={set('expiry')} className="mt-1" data-testid="trade-expiry" />
              </div>
              <p className="col-span-2 md:col-span-1 text-[11px] text-muted-foreground self-center">{t('tradeOptionHint')}</p>
            </div>
          )}

          <OptionsSection form={form} set={set} isOption={isOption} />

          <CostsSection form={form} set={set} spec={spec} carry={carry} />

          <AlertSection
            notify={form.notify}
            onChange={(v) => setForm((p) => ({ ...p, notify: v }))}
            status={form.status}
            hasLevels={levels.sl != null || levels.tp != null}
          />

          {/* ── Revisión: excursión, setups, emoción y notas ─────────── */}
          <SectionCard
            icon={<Target className="w-4 h-4" />}
            title={t('tfExcursionBlock')}
            subtitle={t('tfExcursionBlockHint')}
            accent="blue"
            testid="trade-excursion-section"
          >
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground" title={t('tradeMAEHint')}>
                  {t('tradeMAE')}
                </Label>
                <Input type="number" step="any" value={form.mae_price} onChange={set('mae_price')} className="mt-1" data-testid="trade-mae" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground" title={t('tradeMFEHint')}>
                  {t('tradeMFE')}
                </Label>
                <Input type="number" step="any" value={form.mfe_price} onChange={set('mfe_price')} className="mt-1" data-testid="trade-mfe" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<NotebookPen className="w-4 h-4" />}
            title={t('tfContextBlock')}
            subtitle={t('tfContextBlockHint')}
            accent="primary"
            defaultOpen={setups.length > 0}
            badge={setups.length ? (
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
                {setups.length}
              </span>
            ) : null}
            testid="trade-context-section"
          >
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeSetup')}
                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/70">
                  {t('tradeSetupMultiHint')}
                </span>
              </Label>

              {setups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1" data-testid="trade-setup-selected">
                  {setups.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-primary/15 text-primary border border-primary/40 font-semibold"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => toggleSetup(name)}
                        aria-label={`${t('tradeSetupRemove')} ${name}`}
                        className="hover:text-[#ef4444] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {mySetups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5" data-testid="trade-setup-chips">
                  {mySetups.map((name) => {
                    const picked = isPicked(name);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleSetup(name)}
                        disabled={!picked && setupsFull}
                        className={`px-2 py-0.5 text-[11px] rounded-md border transition-colors ${
                          picked
                            ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                            : 'border-border text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {picked ? '✓ ' : '+ '}{name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-1.5 mt-1.5 max-w-md">
                <Input
                  value={setupDraft}
                  onChange={(e) => setSetupDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addDraft(); }
                  }}
                  disabled={setupsFull}
                  placeholder={mySetups.length ? t('tradeSetupAddOther') : t('tradeSetupExample')}
                  list="my-setups"
                  data-testid="trade-setup"
                />
                <Button
                  type="button" size="sm" variant="outline" onClick={addDraft}
                  disabled={!setupDraft.trim() || setupsFull}
                  data-testid="trade-setup-add"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {mySetups.length > 0 && (
                <datalist id="my-setups">
                  {mySetups.map((name) => <option key={name} value={name} />)}
                </datalist>
              )}
              {setupsFull && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('tradeSetupMax').replace('{n}', String(MAX_SETUPS_PER_TRADE))}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tradeEmotion')}
                </Label>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => set('emotion')(n)}
                      className={`flex-1 h-9 rounded-md text-xs font-bold border transition-all ${
                        Number(form.emotion) === n
                          ? 'bg-primary/15 text-primary border-primary/40'
                          : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`trade-emotion-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{t('tradeEmotionHint')}</div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('tradeNotes')}
                </Label>
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  rows={3}
                  className="mt-1 w-full bg-muted border border-border rounded-md px-3 py-2 text-sm resize-none"
                  placeholder={t('tradeNotesPlaceholder')}
                  data-testid="trade-notes"
                />
              </div>
            </div>
          </SectionCard>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="gap-2" data-testid="trade-save">
              <Save className="w-4 h-4" />
              {saving ? t('saving') : (isEdit ? t('saveChanges') : t('createTrade'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * La ficha del instrumento: qué mide una unidad de esto.
 *
 * Es una línea, no una tabla, y sólo enseña lo que el producto tiene. Está aquí
 * porque el error más caro del diario multiproducto es teclear "1" creyendo que
 * es una acción cuando son 100 onzas de oro.
 */
function InstrumentCard({ spec, contractSize, t }) {
  const bits = [];
  if (contractSize != null) {
    bits.push(`${t('tfSpecContract')}: ${fmtNum(contractSize, contractSize < 10 ? 2 : 0)}`);
  }
  if (spec.tickValue) bits.push(`${t('tfSpecTickValue')}: $${fmtNum(spec.tickValue)}`);
  else if (spec.tickSize) bits.push(`${t('tfSpecTick')}: ${spec.tickSize}`);
  if (spec.pipSize) bits.push(`${t('tfSpecPip')}: ${spec.pipSize}`);
  if (spec.initialMargin) bits.push(`${t('tfSpecMargin')}: $${fmtNum(spec.initialMargin, 0)}`);
  if (spec.carry === 'funding') bits.push(t('tfSpecFunding'));
  if (spec.carry === 'swap') bits.push(t('tfSpecSwap'));

  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground" data-testid="trade-instrument-card">
      <Gauge className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        {spec.name ? <span className="text-foreground font-semibold">{spec.name} · </span> : null}
        {bits.length ? bits.join(' · ') : t('tfSpecUnknown')}
      </span>
    </div>
  );
}

export default TradeFormModal;
