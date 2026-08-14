import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet, Gauge, BookOpen, Receipt, Ban, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import SectionCard, { SectionHeading } from '@/components/common/SectionCard';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/store';
import { useCloudPref } from '@/lib/cloudPrefs';
import { usePersistedState } from '@/hooks/usePersistedState';
import { createTrade } from '@/services/performanceApi';
import {
  FOREX_LOT_TYPES, MIN_RR_FLOOR, SELECTABLE_PRODUCTS,
  resolveSpec, contractSizeFor, unitToDistance, levelFromDistance,
  positionMetrics, suggestedLeverage, sizingLabelKey,
} from '@/lib/instruments';
import {
  RISK_HARD_CAP_PCT, riskBudget, marginModesFor, liquidationView,
  maxSizes, minTicket, averageEntry, partialExits, breakEven,
  commissionTotal, stepValues, requiredLeverage,
} from '@/lib/deskMath';
import { PRODUCT_META, fmtMoney, fmtNum, fmtPct } from '@/components/performance/form/productMeta';
import LevelInput from '@/components/performance/form/LevelInput';
import { MARGIN_MODE_META } from './deskMeta';
import OptionStrategyPicker from './OptionStrategyPicker';
import SizeVerdict from './SizeVerdict';
import DeskResults from './DeskResults';
import PartialsSection from './PartialsSection';

const nz = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const EMPTY_DESK = {
  product: 'stock',
  symbol: '',
  side: 'long',
  entry_price: '',
  sl: '', sl_unit: 'price', sl_input: '',
  tp: '', tp_unit: 'price', tp_input: '',
  quantity: '',
  size_mode: 'risk',
  lot_type: 'standard',
  multiplier: '',
  leverage: '',
  leverage_touched: false,
  margin_mode: '',
  option_strategy: 'long_call',
  option_type: 'call',
  strike: '',
  expiry: '',
  fee_per_unit: '',
  fee_pct: '',
  fee_flat: '',
  fee_round_turn: true,
  partial_entries: [],
  partial_exits: [],
};

/**
 * La mesa de cálculo — un terminal de bróker que en vez de mandar la orden te
 * dice qué orden mandarías.
 *
 * El orden de arriba abajo ES la funcionalidad, y no es el mismo que el de una
 * calculadora suelta:
 *
 *   0. **El capital total, antes que nada.** Es el único dato del que dependen
 *      todos los demás y el que no puede estar catorce veces repetido: aquí se
 *      escribe una vez, viaja con la cuenta y ya no se vuelve a preguntar. No
 *      hay valor por defecto — un 10 000 de relleno es una cifra inventada con
 *      la que alguien puede acabar dimensionando de verdad.
 *   1. **El producto**, porque decide todo lo que viene detrás: un lote de
 *      forex son 100 000 unidades, un contrato de oro son 100 onzas, y "1" no
 *      significa nada hasta saber de qué.
 *   2. **La posición** — activo, lado, y con ella el modo de margen, que se
 *      ofrece o no SEGÚN EL PRODUCTO en vez de preguntarse siempre.
 *   3. **Lo máximo que estás dispuesto a perder.** Va antes que el tamaño
 *      porque es lo que lo decide, no al revés. Por encima del 10 % la mesa no
 *      calcula: devuelve el motivo.
 *   4. **Entrada, stop y objetivo**, en la unidad que use el trader.
 *   5. **El veredicto de tamaño** y todo lo derivado.
 *
 * Es el mismo modelo de datos que el diario (`lib/instruments.js`, espejo de
 * `backend/instruments.py`), así que lo que se calcula aquí y lo que se guarda
 * allí son la misma operación — de ahí que «Registrar en el diario» sea un
 * botón y no una reescritura.
 */
export default function TradingDesk() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  // El capital y la regla de riesgo van con la CUENTA, no con el navegador.
  const [account, setAccount] = useCloudPref('deskAccount');
  const [form, setForm, clearForm] = usePersistedState('trading_desk', EMPTY_DESK);
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [k]: v }));
  };
  const patchAccount = (k, v) => setAccount((p) => ({ ...(p || {}), [k]: v }));

  // ── El instrumento ──────────────────────────────────────────────
  const product = form.product || 'stock';
  const isOption = product === 'option';
  const spec = useMemo(() => resolveSpec(product, form.symbol), [product, form.symbol]);
  const contractSize = useMemo(
    () => contractSizeFor(product, form.symbol, { override: form.multiplier, lotType: form.lot_type }),
    [product, form.symbol, form.multiplier, form.lot_type],
  );

  const capital = nz(account?.capital);
  const entry = nz(form.entry_price);
  const leverage = nz(form.leverage);

  // ── Modo de margen: lo decide el producto ───────────────────────
  const marginInfo = useMemo(() => marginModesFor(spec), [spec]);
  const marginMode = marginInfo.modes.includes(form.margin_mode)
    ? form.margin_mode
    : marginInfo.default;

  const changeProduct = (id) => {
    const next = resolveSpec(id, form.symbol);
    const nextMargin = marginModesFor(next);
    setForm((p) => ({
      ...p,
      product: id,
      multiplier: '',
      lot_type: id === 'forex' ? (p.lot_type || 'standard') : p.lot_type,
      leverage: next.usesLeverage ? (next.defaultLeverage ?? '') : '',
      leverage_touched: false,
      margin_mode: nextMargin.default || '',
      sl_unit: (next.quoteUnits || []).includes(p.sl_unit) ? p.sl_unit : 'price',
      tp_unit: p.tp_unit === 'r' || (next.quoteUnits || []).includes(p.tp_unit) ? p.tp_unit : 'price',
    }));
  };

  // Misma regla que el diario: mientras el trader no toque la palanca, manda
  // el catálogo del activo (el CFD del oro a 20×, no el 10× genérico del CFD).
  const changeSymbol = (raw) => {
    const symbol = String(raw || '').toUpperCase();
    const next = resolveSpec(product, symbol);
    setForm((p) => {
      const notional = (nz(p.entry_price) || 0) * (nz(p.quantity) || 0)
        * (contractSizeFor(product, symbol, { lotType: p.lot_type }) || 0);
      const suggested = suggestedLeverage(next, notional);
      return { ...p, symbol, leverage: (!p.leverage_touched && suggested) ? suggested : p.leverage };
    });
  };

  // ── El presupuesto de riesgo, y el tope duro ────────────────────
  const budget = useMemo(() => riskBudget({
    capital,
    riskPct: account?.riskPct,
    riskMoney: account?.riskMoney,
    mode: account?.riskMode === 'money' ? 'money' : 'pct',
  }), [capital, account?.riskPct, account?.riskMoney, account?.riskMode]);

  // ── Stop y objetivo → nivel de precio ───────────────────────────
  // Las unidades que dependen del TAMAÑO (importe fijo, % de la cuenta) no se
  // pueden resolver mientras el tamaño sea justo lo que estamos calculando: se
  // caería en una recursión. Se resuelven contra el tamaño que haya, que en
  // modo manual es el escrito y en modo riesgo es el de la pasada anterior.
  const quantityTyped = nz(form.quantity);
  const levels = useMemo(() => {
    const out = { sl: nz(form.sl), tp: nz(form.tp), riskDistance: null };
    if (!entry) return out;
    const ctx = { entry, quantity: quantityTyped, contractSize, spec, balance: capital };

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
  }, [entry, quantityTyped, contractSize, spec, capital, form.sl, form.tp,
    form.sl_unit, form.sl_input, form.tp_unit, form.tp_input, form.side]);

  // ── Del riesgo al tamaño ────────────────────────────────────────
  const sizes = useMemo(() => maxSizes({
    entry, stopDistance: levels.riskDistance, contractSize,
    riskAmount: budget.blocked ? null : budget.amount,
    capital, leverage, spec,
  }), [entry, levels.riskDistance, contractSize, budget.blocked, budget.amount, capital, leverage, spec]);

  const minimum = useMemo(() => minTicket({
    entry, stopDistance: levels.riskDistance, contractSize, capital, leverage, spec,
  }), [entry, levels.riskDistance, contractSize, capital, leverage, spec]);

  // En modo riesgo manda el cálculo; en manual manda lo que escribió el trader.
  const sizeMode = form.size_mode === 'manual' ? 'manual' : 'risk';
  const quantity = sizeMode === 'manual' ? quantityTyped : sizes.quantity;

  // ── La posición resultante ──────────────────────────────────────
  const metrics = useMemo(() => positionMetrics({
    entry, quantity, contractSize, leverage, balance: capital, side: form.side,
    sl: levels.sl, tp: levels.tp, spec,
  }), [entry, quantity, contractSize, leverage, capital, form.side, levels.sl, levels.tp, spec]);

  const riskOfUsed = useMemo(() => ({
    amount: metrics.riskAmount,
    pct: metrics.riskPctBalance,
  }), [metrics.riskAmount, metrics.riskPctBalance]);

  // Cuando el tamaño lo escribe el trader, el tope de riesgo tiene que volver a
  // comprobarse: si no, "manual" sería la puerta de atrás del 10 %.
  const manualOverCap = sizeMode === 'manual'
    && metrics.riskPctBalance != null
    && metrics.riskPctBalance > RISK_HARD_CAP_PCT;

  const fees = useMemo(() => commissionTotal({
    notional: metrics.notional, quantity,
    perUnit: form.fee_per_unit, pctNotional: form.fee_pct, flat: form.fee_flat,
    roundTurn: form.fee_round_turn !== false,
  }), [metrics.notional, quantity, form.fee_per_unit, form.fee_pct, form.fee_flat, form.fee_round_turn]);

  const liquidation = useMemo(() => liquidationView({
    entry, side: form.side, mode: marginMode, notional: metrics.notional,
    marginUsed: metrics.marginUsed, capital, sl: levels.sl,
  }), [entry, form.side, marginMode, metrics.notional, metrics.marginUsed, capital, levels.sl]);

  const steps = useMemo(
    () => stepValues({ quantity, contractSize, spec }),
    [quantity, contractSize, spec],
  );

  const avgEntry = useMemo(
    () => averageEntry(form.partial_entries),
    [form.partial_entries],
  );
  const exitResult = useMemo(() => partialExits({
    entry: avgEntry.price ?? entry, side: form.side, quantity,
    contractSize, exits: form.partial_exits, feesTotal: fees,
  }), [avgEntry.price, entry, form.side, quantity, contractSize, form.partial_exits, fees]);

  const breakEvenPrice = useMemo(() => breakEven({
    entry: avgEntry.price ?? entry, side: form.side, quantity, contractSize, feesTotal: fees,
  }), [avgEntry.price, entry, form.side, quantity, contractSize, fees]);

  const freeCapital = capital != null && metrics.marginUsed != null
    ? capital - metrics.marginUsed
    : null;
  const leverageNeeded = requiredLeverage(metrics.notional, capital);

  // La palanca sugerida deja de servir cuando cambia el nocional, así que se
  // reevalúa al calcular el tamaño — pero sólo si el trader no la ha tocado.
  useEffect(() => {
    if (form.leverage_touched || !spec.usesLeverage) return;
    const suggested = suggestedLeverage(spec, metrics.notional);
    if (suggested && String(suggested) !== String(form.leverage)) {
      setForm((p) => (p.leverage_touched ? p : { ...p, leverage: suggested }));
    }
  }, [spec, metrics.notional, form.leverage_touched]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Al diario ───────────────────────────────────────────────────
  const canJournal = isAuthenticated && quantity != null && entry != null
    && form.symbol && !budget.blocked && !manualOverCap;

  const sendToJournal = async () => {
    if (!canJournal || sending) return;
    setSending(true);
    try {
      await createTrade({
        symbol: form.symbol,
        side: form.side,
        instrument_type: product,
        entry_price: entry,
        sl: levels.sl,
        tp: levels.tp,
        sl_unit: form.sl_unit || 'price',
        sl_input: nz(form.sl_input),
        tp_unit: form.tp_unit || 'price',
        tp_input: nz(form.tp_input),
        quantity,
        multiplier: contractSize,
        leverage: spec.usesLeverage ? leverage : null,
        lot_type: product === 'forex' ? (form.lot_type || 'standard') : null,
        account_balance: capital ?? 0,
        fees,
        status: 'open',
        entry_date: new Date().toISOString(),
        option_type: isOption ? (form.option_type || 'call') : null,
        strike: isOption ? nz(form.strike) : null,
        expiry: isOption ? (form.expiry || null) : null,
        option_strategy: isOption ? (form.option_strategy || null) : null,
        notes: t('deskJournalNote'),
      });
      toast.success(t('sentToJournal'));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('sendToJournalError'));
    } finally {
      setSending(false);
    }
  };

  const riskMode = account?.riskMode === 'money' ? 'money' : 'pct';

  return (
    <div className="space-y-4" data-testid="trading-desk">
      {/* ══ 0 · EL CAPITAL, ANTES QUE NADA ═══════════════════════════ */}
      <div
        className={`rounded-xl border p-4 ${
          capital == null
            ? 'border-primary/50 bg-primary/[0.06]'
            : 'border-border bg-card'
        }`}
        data-testid="desk-capital-bar"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[190px] flex-1">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              {t('deskCapitalLabel')}
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={account?.capital ?? ''}
              onChange={(e) => patchAccount('capital', e.target.value)}
              placeholder={t('deskCapitalPlaceholder')}
              className="mt-1.5 font-mono text-2xl md:text-3xl h-14 font-bold"
              data-testid="desk-capital"
            />
          </div>

          {/* El riesgo por operación vive aquí arriba, pegado al capital, porque
              es la MISMA decisión: cuánto de esto me juego cada vez. */}
          <div className="min-w-[190px] flex-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {t('deskRiskLabel')}
              </Label>
              <div className="flex rounded-md border border-border overflow-hidden">
                {['pct', 'money'].map((mo) => (
                  <button
                    key={mo}
                    type="button"
                    onClick={() => patchAccount('riskMode', mo)}
                    className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                      riskMode === mo ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`desk-risk-mode-${mo}`}
                  >
                    {mo === 'pct' ? '%' : t('deskRiskMoneyShort')}
                  </button>
                ))}
              </div>
            </div>
            {riskMode === 'pct' ? (
              <Input
                type="number" step="0.1" min="0" max="100"
                value={account?.riskPct ?? ''}
                onChange={(e) => patchAccount('riskPct', e.target.value)}
                placeholder="1"
                className="mt-1.5 font-mono text-2xl md:text-3xl h-14 font-bold"
                data-testid="desk-risk-pct"
              />
            ) : (
              <Input
                type="number" step="any" min="0"
                value={account?.riskMoney ?? ''}
                onChange={(e) => patchAccount('riskMoney', e.target.value)}
                placeholder="100"
                className="mt-1.5 font-mono text-2xl md:text-3xl h-14 font-bold"
                data-testid="desk-risk-money"
              />
            )}
          </div>

          <div className="min-w-[160px]">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {t('deskRiskAmount')}
            </p>
            <p
              className={`font-mono text-2xl font-bold mt-1 ${budget.blocked ? 'text-[#f87171]' : 'text-[#f87171]'}`}
              data-testid="desk-risk-amount"
            >
              {fmtMoney(budget.amount)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {budget.pct == null ? t('deskRiskNeedBoth') : `${fmtPct(budget.pct, 2)} ${t('deskOfAccount')}`}
            </p>
          </div>
        </div>

        {/* El tope duro. No es un aviso que se pueda ignorar: mientras esté,
            no hay tamaño en toda la pantalla. */}
        {budget.reason === 'over_cap' && (
          <p
            className="mt-3 flex items-start gap-2 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2 text-xs text-[#f87171] leading-relaxed"
            data-testid="desk-risk-cap"
          >
            <Ban className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {t('deskRiskBlockedBody')
                .replace('{pct}', fmtPct(budget.pct, 1))
                .replace('{cap}', String(budget.capPct))
                .replace('{max}', fmtMoney(budget.maxAmount))}
            </span>
          </p>
        )}
        {budget.warn && (
          <p
            className="mt-3 flex items-start gap-2 text-[11px] text-[#fbbf24] leading-relaxed"
            data-testid="desk-risk-warn"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t('deskRiskWarnBody').replace('{pct}', fmtPct(budget.pct, 1)).replace('{adv}', String(budget.advisedPct))}
          </p>
        )}
        {capital == null && (
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed" data-testid="desk-capital-empty">
            {t('deskCapitalEmpty')}
          </p>
        )}
      </div>

      {/* ══ 1 · PRODUCTO ═════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeading step={1} title={t('tfProduct')} hint={t('deskProductHint')} />
        <div className="flex flex-wrap gap-1.5" data-testid="desk-product-picker">
          {SELECTABLE_PRODUCTS.map((id) => {
            const meta = PRODUCT_META[id];
            const Ic = meta.icon;
            return (
              <button
                type="button"
                key={id}
                onClick={() => changeProduct(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                  product === id
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`desk-product-${id}`}
              >
                <Ic className="w-3.5 h-3.5" />
                {t(meta.labelKey)}
              </button>
            );
          })}
        </div>

        {/* ── 2 · La posición ─────────────────────────────────────── */}
        <div className="mt-5">
          <SectionHeading step={2} title={t('tfPositionBlock')} hint={t('deskPositionHint')} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeSymbol')}
              </Label>
              <div className="mt-1">
                <UniversalAssetSearch
                  value={form.symbol}
                  onChange={(asset) => changeSymbol(asset?.symbol || asset?.id || '')}
                  placeholder={t('tradeSymbolSearch')}
                  testId="desk-symbol-search"
                />
              </div>
              <Input
                value={form.symbol}
                onChange={(e) => changeSymbol(e.target.value)}
                placeholder={product === 'forex' ? 'EURUSD' : 'AAPL'}
                className="mt-1.5 uppercase text-xs h-8"
                data-testid="desk-symbol"
              />
              <InstrumentLine spec={spec} contractSize={contractSize} t={t} />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradeOptionSideLabel') : t('tradeSide')}
              </Label>
              <div className="mt-1 flex gap-1.5">
                {[
                  { id: 'long', k: isOption ? 'tradeOptionBuy' : 'tradeFormSideLong', on: 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/40' },
                  { id: 'short', k: isOption ? 'tradeOptionSell' : 'tradeFormSideShort', on: 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/40' },
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => set('side')(s.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                      form.side === s.id ? s.on : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`desk-side-${s.id}`}
                  >
                    {t(s.k)}
                  </button>
                ))}
              </div>
            </div>

            {/* Modo de margen: aparece SÓLO donde existe la decisión. */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('deskMarginMode')}
              </Label>
              {marginInfo.modes.length > 1 ? (
                <div className="mt-1 flex gap-1.5" data-testid="desk-margin-picker">
                  {marginInfo.modes.map((mo) => {
                    const meta = MARGIN_MODE_META[mo];
                    const Ic = meta.icon;
                    return (
                      <button
                        type="button"
                        key={mo}
                        onClick={() => set('margin_mode')(mo)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                          marginMode === mo
                            ? 'bg-primary/15 text-primary border-primary/40'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                        data-testid={`desk-margin-${mo}`}
                      >
                        <Ic className="w-3.5 h-3.5" />
                        {t(meta.labelKey)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="mt-1 h-10 flex items-center gap-1.5 px-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground"
                  data-testid="desk-margin-fixed"
                >
                  {marginMode
                    ? <>{React.createElement(MARGIN_MODE_META[marginMode].icon, { className: 'w-3.5 h-3.5' })}
                      {t(MARGIN_MODE_META[marginMode].labelKey)}</>
                    : t('deskMarginNA')}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                {t(marginInfo.reasonKey)}
              </p>
            </div>
          </div>

          {/* Opciones: la estructura, con las 66 y los 4 sueltos delante. */}
          {isOption && (
            <div className="mt-4 p-4 rounded-xl bg-primary/[0.04] border border-primary/20" data-testid="desk-option-block">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('deskOptionStructure')}
              </Label>
              <div className="mt-1.5">
                <OptionStrategyPicker
                  value={form.option_strategy}
                  onChange={(id) => set('option_strategy')(id)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
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
                            ? 'bg-primary/15 text-primary border-primary/40'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                        data-testid={`desk-option-${o.id}`}
                      >
                        {t(o.k)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeStrike')}</Label>
                  <Input type="number" step="any" value={form.strike} onChange={set('strike')}
                    className="mt-1" data-testid="desk-strike" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeExpiry')}</Label>
                  <Input type="date" value={form.expiry || ''} onChange={set('expiry')}
                    className="mt-1" data-testid="desk-expiry" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                {t('deskOptionBuySellNote')}
              </p>
            </div>
          )}
        </div>

        {/* ── 3 · Entrada, stop y objetivo ─────────────────────────── */}
        <div className="mt-5">
          <SectionHeading step={3} title={t('deskLevelsBlock')} hint={t('deskLevelsHint')} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradePremiumEntry') : t('tradeEntry')}
              </Label>
              <Input type="number" step="any" value={form.entry_price}
                onChange={set('entry_price')} className="mt-1" data-testid="desk-entry" />
            </div>
            <LevelInput
              kind="sl" label={t('tradeSL')} spec={spec}
              unit={form.sl_unit} value={form.sl_unit === 'price' ? form.sl : form.sl_input}
              onUnitChange={(u) => setForm((p) => ({ ...p, sl_unit: u }))}
              onValueChange={(v) => setForm((p) => (
                p.sl_unit === 'price' ? { ...p, sl: v } : { ...p, sl_input: v }))}
              resolvedPrice={levels.sl}
              testid="desk-sl"
            />
            <LevelInput
              kind="tp" label={t('tradeTP')} spec={spec}
              unit={form.tp_unit} value={form.tp_unit === 'price' ? form.tp : form.tp_input}
              onUnitChange={(u) => setForm((p) => ({ ...p, tp_unit: u }))}
              onValueChange={(v) => setForm((p) => (
                p.tp_unit === 'price' ? { ...p, tp: v } : { ...p, tp_input: v }))}
              resolvedPrice={levels.tp}
              testid="desk-tp"
            />
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tfLeverage')}
              </Label>
              {spec.usesLeverage ? (
                <>
                  <Input
                    type="number" step="any" min="1" value={form.leverage ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, leverage: e.target.value, leverage_touched: true }))}
                    placeholder={spec.defaultLeverage ? String(spec.defaultLeverage) : '1'}
                    className="mt-1" data-testid="desk-leverage"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {spec.maxLeverage
                      ? t('tfLeverageTypical').replace('{max}', fmtNum(spec.maxLeverage, 0))
                      : t('tfLeverageHint')}
                  </p>
                </>
              ) : (
                <div className="mt-1 h-10 flex items-center px-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground"
                  data-testid="desk-leverage-na">
                  {t('tfLeverageNA')}
                </div>
              )}
            </div>
          </div>

          {/* Tamaño de contrato y tipo de lote: lo que hace que "1" signifique
              algo. Se rellena solo desde el catálogo y se puede sobrescribir. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tfContractSize')}
              </Label>
              <Input
                type="number" step="any" value={form.multiplier ?? ''}
                onChange={set('multiplier')}
                placeholder={contractSize != null ? String(contractSize) : t('tfContractSizeUnknown')}
                className="mt-1" data-testid="desk-multiplier"
              />
              <p className={`text-[10px] mt-0.5 ${contractSize == null ? 'text-[#f87171]' : 'text-muted-foreground'}`}>
                {contractSize == null ? t('tfContractSizeMissing') : t('tfContractSizeHint')}
              </p>
            </div>
            {product === 'forex' && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('deskLotType')}
                </Label>
                <select
                  value={form.lot_type || 'standard'}
                  onChange={(e) => set('lot_type')(e.target.value)}
                  className="mt-1 w-full h-10 bg-muted border border-border rounded-md px-2 text-xs"
                  data-testid="desk-lot-type"
                >
                  {Object.values(FOREX_LOT_TYPES).map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {t(`lot_${lt.id}`)} · {lt.units.toLocaleString('en-US')}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('deskLotTypeHint')}</p>
              </div>
            )}

            {/* Tamaño: derivado del riesgo (por defecto) o escrito a mano. */}
            <div className={product === 'forex' ? '' : 'md:col-span-2'}>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t(sizingLabelKey(spec))}
                </Label>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {[
                    { id: 'risk', k: 'deskSizeFromRisk' },
                    { id: 'manual', k: 'deskSizeManual' },
                  ].map((mo) => (
                    <button
                      key={mo.id}
                      type="button"
                      onClick={() => setForm((p) => ({
                        ...p,
                        size_mode: mo.id,
                        // Al pasar a manual se arranca con lo calculado: es el
                        // punto de partida obvio y evita el campo en blanco.
                        quantity: mo.id === 'manual' && sizes.quantity != null && !p.quantity
                          ? String(sizes.quantity)
                          : p.quantity,
                      }))}
                      className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        sizeMode === mo.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`desk-size-mode-${mo.id}`}
                    >
                      {t(mo.k)}
                    </button>
                  ))}
                </div>
              </div>
              {sizeMode === 'manual' ? (
                <Input
                  type="number" step="any" value={form.quantity}
                  onChange={set('quantity')} className="mt-1" data-testid="desk-quantity"
                />
              ) : (
                <div
                  className="mt-1 h-10 flex items-center px-3 rounded-md bg-muted/50 border border-border font-mono text-sm"
                  data-testid="desk-quantity-auto"
                >
                  {sizes.quantity == null ? '—' : fmtNum(sizes.quantity, 4)}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {sizeMode === 'manual' ? t('deskSizeManualHint') : t('deskSizeFromRiskHint')}
              </p>
            </div>
          </div>

          {manualOverCap && (
            <p
              className="mt-3 flex items-start gap-2 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2 text-xs text-[#f87171] leading-relaxed"
              data-testid="desk-manual-over-cap"
            >
              <Ban className="w-4 h-4 shrink-0 mt-0.5" />
              {t('deskManualOverCap')
                .replace('{pct}', fmtPct(metrics.riskPctBalance, 1))
                .replace('{cap}', String(RISK_HARD_CAP_PCT))}
            </p>
          )}
        </div>
      </div>

      {/* ══ 4 · EL VEREDICTO ═════════════════════════════════════════ */}
      <SizeVerdict
        sizes={sizes}
        minimum={minimum}
        spec={spec}
        budget={budget}
        quantityUsed={manualOverCap ? null : quantity}
        sizeMode={sizeMode}
        riskOfUsed={riskOfUsed}
      />

      {/* ══ 5 · TODO LO DEMÁS ════════════════════════════════════════ */}
      <DeskResults
        metrics={metrics}
        spec={spec}
        marginMode={marginMode}
        liquidation={liquidation}
        steps={steps}
        breakEvenPrice={breakEvenPrice}
        feesTotal={fees}
        freeCapital={freeCapital}
        leverageNeeded={leverageNeeded}
        rrFloor={MIN_RR_FLOOR}
      />

      {/* ══ 6 · COMISIONES ═══════════════════════════════════════════ */}
      <SectionCard
        icon={<Receipt className="w-4 h-4" />}
        title={t('deskFeesTitle')}
        subtitle={t('deskFeesHint')}
        accent="amber"
        badge={fees ? (
          <span className="px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24] text-[10px] font-bold font-mono">
            {fmtMoney(fees)}
          </span>
        ) : null}
        testid="desk-fees"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FeeField label={t('deskFeePerUnit')} hint={t('deskFeePerUnitHint')}
            value={form.fee_per_unit} onChange={set('fee_per_unit')} testid="desk-fee-per-unit" />
          <FeeField label={t('deskFeePct')} hint={t('deskFeePctHint')}
            value={form.fee_pct} onChange={set('fee_pct')} testid="desk-fee-pct" />
          <FeeField label={t('deskFeeFlat')} hint={t('deskFeeFlatHint')}
            value={form.fee_flat} onChange={set('fee_flat')} testid="desk-fee-flat" />
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('deskFeeRoundTurn')}
            </Label>
            <button
              type="button"
              onClick={() => set('fee_round_turn')(form.fee_round_turn === false)}
              className={`mt-1 w-full h-10 px-3 rounded-md border text-xs font-semibold transition-colors ${
                form.fee_round_turn !== false
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'border-border text-muted-foreground'
              }`}
              data-testid="desk-fee-round-turn"
            >
              {t(form.fee_round_turn !== false ? 'deskFeeRoundTurnOn' : 'deskFeeRoundTurnOff')}
            </button>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('deskFeeRoundTurnHint')}</p>
          </div>
        </div>
      </SectionCard>

      {/* ══ 7 · PARCIALES ════════════════════════════════════════════ */}
      <PartialsSection
        entries={form.partial_entries}
        exits={form.partial_exits}
        onEntriesChange={(v) => setForm((p) => ({ ...p, partial_entries: v }))}
        onExitsChange={(v) => setForm((p) => ({ ...p, partial_exits: v }))}
        avgEntry={avgEntry}
        exitResult={exitResult}
        spec={spec}
        quantity={quantity}
        entryPrice={avgEntry.price ?? entry}
      />

      {/* ══ 8 · ACCIONES ═════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={clearForm} className="gap-2"
          data-testid="desk-reset">
          <RotateCcw className="w-4 h-4" /> {t('clearData')}
        </Button>
        <div className="flex items-center gap-2">
          {!canJournal && isAuthenticated && (
            <span className="text-[11px] text-muted-foreground" data-testid="desk-journal-blocked">
              {t('deskJournalNeeds')}
            </span>
          )}
          <Button
            type="button"
            onClick={sendToJournal}
            disabled={!canJournal || sending}
            className="gap-2"
            data-testid="desk-to-journal"
          >
            <BookOpen className="w-4 h-4" />
            {sending ? t('saving') : t('sendToJournal')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeeField({ label, hint, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" step="any" min="0" value={value ?? ''} onChange={onChange}
        className="mt-1" data-testid={testid} />
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

/** Qué mide una unidad de esto. La misma línea que el diario, por el mismo motivo. */
function InstrumentLine({ spec, contractSize, t }) {
  const bits = [];
  if (contractSize != null) bits.push(`${t('tfSpecContract')}: ${fmtNum(contractSize, contractSize < 10 ? 2 : 0)}`);
  if (spec.tickValue) bits.push(`${t('tfSpecTickValue')}: $${fmtNum(spec.tickValue)}`);
  else if (spec.tickSize) bits.push(`${t('tfSpecTick')}: ${spec.tickSize}`);
  if (spec.pipSize) bits.push(`${t('tfSpecPip')}: ${spec.pipSize}`);
  if (spec.initialMargin) bits.push(`${t('tfSpecMargin')}: $${fmtNum(spec.initialMargin, 0)}`);

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground" data-testid="desk-instrument-line">
      <Gauge className="w-3 h-3 shrink-0" />
      <span className="truncate">
        {spec.name ? <span className="text-foreground font-semibold">{spec.name} · </span> : null}
        {bits.length ? bits.join(' · ') : t('tfSpecUnknown')}
      </span>
    </p>
  );
}
