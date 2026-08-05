import React, { useMemo, useState } from 'react';
import { X, Save, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { createTrade, updateTrade } from '@/services/performanceApi';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';
import {
  loadSystem, tradeSetups, addSetup, SETUP_SEPARATOR, MAX_SETUPS_PER_TRADE,
} from '@/lib/tradingSystem';
import { toast } from 'sonner';

const OPTION_MULTIPLIER = 100; // tamaño estándar de contrato de opciones sobre acciones

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

/**
 * TradeFormModal — create or edit a trade.
 *
 * Shows live R:R + risk-% as the user types, so they self-check before saving.
 * The backend re-validates and returns auto-detected errors.
 */
const TradeFormModal = ({ open, onClose, onSaved, initialTrade = null }) => {
  const { t } = useTranslation();
  const isEdit = Boolean(initialTrade?.id);
  const [saving, setSaving] = useState(false);

  // Los setups de la operación son una LISTA: una entrada por confluencia de
  // dos condiciones responde a las dos, y obligar a elegir una hacía que la
  // otra no existiera para la analítica. Al editar, se leen igual de bien las
  // operaciones antiguas (que sólo guardaban la cadena).
  const [setups, setSetups] = useState(() => tradeSetups(initialTrade || {}));
  const [setupDraft, setSetupDraft] = useState('');

  const [form, setForm] = useState(() => initialTrade || {
    symbol: '',
    side: 'long',
    entry_price: '',
    exit_price: '',
    sl: '',
    tp: '',
    mae_price: '',
    mfe_price: '',
    quantity: '',
    account_balance: 10000,
    fees: 0,
    status: 'open',
    emotion: 3,
    notes: '',
    instrument_type: 'spot',
    option_type: 'call',
    strike: '',
    expiry: '',
    multiplier: OPTION_MULTIPLIER,
  });

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [k]: v }));
  };

  // Los setups que el usuario ya definió en su sistema. Se pueden añadir otros
  // a mano —una operación vieja o un setup que aún no está en el sistema tienen
  // que poder guardarse—, pero teclearlos cada vez es lo que fragmenta la
  // analítica: "Ruptura NY", "ruptura ny" y "Rupt NY" son tres grupos distintos
  // en el desglose por setup y ninguno tiene muestra.
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

  const isOption = form.instrument_type === 'option';
  // Multiplicador efectivo: 100 (u otro) en opciones; 1 en spot.
  const mult = isOption ? (parseFloat(form.multiplier) || OPTION_MULTIPLIER) : 1;

  // Live derived metrics — instant feedback
  const entry = parseFloat(form.entry_price) || 0;
  const sl = parseFloat(form.sl) || 0;
  const tp = parseFloat(form.tp) || 0;
  const qty = parseFloat(form.quantity) || 0;
  const balance = parseFloat(form.account_balance) || 0;

  const liveRisk = entry && sl ? Math.abs(entry - sl) * qty * mult : 0;
  const liveReward = entry && tp ? Math.abs(tp - entry) * qty * mult : 0;
  const liveRR = liveRisk > 0 ? (liveReward / liveRisk).toFixed(2) : '—';
  const liveRiskPct = balance > 0 ? ((liveRisk / balance) * 100).toFixed(2) : '—';

  const rrWarn = liveRR !== '—' && parseFloat(liveRR) < 1.5;
  const riskWarn = liveRiskPct !== '—' && parseFloat(liveRiskPct) > 2;

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
        // La lista es la fuente de verdad; la cadena unida viaja igualmente
        // para que un backend anterior a `setups` (que ignora el campo que no
        // conoce) siga guardando algo correcto en vez de vaciar el setup.
        setups,
        setup: setups.join(SETUP_SEPARATOR),
        entry_price: Number(form.entry_price),
        exit_price: form.exit_price !== '' ? Number(form.exit_price) : null,
        sl: form.sl !== '' ? Number(form.sl) : null,
        tp: form.tp !== '' ? Number(form.tp) : null,
        mae_price: form.mae_price !== '' ? Number(form.mae_price) : null,
        mfe_price: form.mfe_price !== '' ? Number(form.mfe_price) : null,
        quantity: Number(form.quantity),
        account_balance: Number(form.account_balance) || 0,
        fees: Number(form.fees) || 0,
        status: form.status,
        emotion: form.emotion ? Number(form.emotion) : null,
        notes: form.notes || '',
        instrument_type: form.instrument_type || 'spot',
        option_type: isOption ? (form.option_type || 'call') : null,
        strike: isOption && form.strike !== '' ? Number(form.strike) : null,
        expiry: isOption ? (form.expiry || null) : null,
        multiplier: mult,
      };
      const saved = isEdit
        ? await updateTrade(initialTrade.id, payload)
        : await createTrade(payload);
      toast.success(isEdit ? t('tradeUpdated') : t('tradeCreated'));
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('tradeSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // El fondo se oscurece, pero no se difumina: el desenfoque no separaba mejor
  // el modal y emborronaba la página entera detrás.
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 overflow-y-auto" data-testid="trade-form-modal">
      <div className="w-full max-w-3xl my-8 bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-unbounded text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {isEdit ? t('editTrade') : t('newTrade')}
          </h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Instrument toggle: Spot vs Opción */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('tradeInstrument')}
            </Label>
            <div className="mt-1 flex gap-1.5 max-w-xs">
              {[
                { id: 'spot', labelKey: 'tradeInstrumentSpot' },
                { id: 'option', labelKey: 'tradeInstrumentOption' },
              ].map((it) => (
                <button
                  type="button"
                  key={it.id}
                  onClick={() => set('instrument_type')(it.id)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                    form.instrument_type === it.id
                      ? 'bg-primary/15 text-primary border-primary/40'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`trade-instrument-${it.id}`}
                >
                  {t(it.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1: Symbol (all assets) + Side + Setup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeSymbol')} *
              </Label>
              <div className="mt-1">
                <UniversalAssetSearch
                  value={form.symbol}
                  onChange={(asset) => set('symbol')((asset?.symbol || asset?.id || '').toUpperCase())}
                  placeholder={t('tradeSymbolSearch')}
                  testId="trade-symbol-search"
                />
              </div>
              {/* Fallback/override manual para símbolos no listados (permite escribir cualquiera) */}
              <Input
                value={form.symbol}
                onChange={(e) => set('symbol')(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="mt-1.5 uppercase text-xs h-8"
                data-testid="trade-symbol"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradeOptionSideLabel') : t('tradeSide')} *
              </Label>
              <div className="mt-1 flex gap-1.5">
                {(isOption ? OPTION_SIDES : SIDES).map((s) => (
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
                {t('tradeSetup')}
                <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/70">
                  {t('tradeSetupMultiHint')}
                </span>
              </Label>

              {/* Lo elegido, siempre a la vista y quitable de un clic. */}
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

              {/* Un clic escribe el nombre EXACTO del sistema: es lo que hace
                  que el desglose por setup mida algo. */}
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

              <div className="flex gap-1.5 mt-1.5">
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
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addDraft}
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
          </div>

          {/* Option-specific row: Call/Put, Strike, Vencimiento, Multiplicador */}
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
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('tradeMultiplier')}</Label>
                <Input type="number" step="any" value={form.multiplier} onChange={set('multiplier')} className="mt-1" data-testid="trade-multiplier" />
              </div>
              <p className="col-span-2 md:col-span-4 text-[11px] text-muted-foreground">{t('tradeOptionHint')}</p>
            </div>
          )}

          {/* Row 2: Entry / SL / TP / Exit */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradePremiumEntry') : t('tradeEntry')} *
              </Label>
              <Input type="number" step="any" value={form.entry_price} onChange={set('entry_price')} className="mt-1" data-testid="trade-entry" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeSL')}
              </Label>
              <Input type="number" step="any" value={form.sl} onChange={set('sl')} className="mt-1" data-testid="trade-sl" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeTP')}
              </Label>
              <Input type="number" step="any" value={form.tp} onChange={set('tp')} className="mt-1" data-testid="trade-tp" />
            </div>
            {/* MAE/MFE: the worst and best price the trade reached while open.
                Two numbers per trade, and the only ones that objectively answer
                whether your stops are too wide and your targets too close. */}
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
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradePremiumExit') : t('tradeExit')}
              </Label>
              <Input type="number" step="any" value={form.exit_price} onChange={set('exit_price')} className="mt-1" data-testid="trade-exit" />
            </div>
          </div>

          {/* Row 3: Quantity / Balance / Fees / Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {isOption ? t('tradeContracts') : t('tradeQuantity')} *
              </Label>
              <Input type="number" step="any" value={form.quantity} onChange={set('quantity')} className="mt-1" data-testid="trade-quantity" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeBalance')}
              </Label>
              <Input type="number" step="any" value={form.account_balance} onChange={set('account_balance')} className="mt-1" data-testid="trade-balance" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('tradeFees')}
              </Label>
              <Input type="number" step="any" value={form.fees} onChange={set('fees')} className="mt-1" data-testid="trade-fees" />
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

          {/* Live derived metrics — visible self-check */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border" data-testid="trade-live-metrics">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{t('tradeRiskUSD')}</div>
              <div className="text-base font-bold font-mono">${liveRisk.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{t('tradeRewardUSD')}</div>
              <div className="text-base font-bold font-mono">${liveReward.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{t('tradeRR')}</div>
              <div className={`text-base font-bold font-mono ${rrWarn ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                {liveRR !== '—' ? `1:${liveRR}` : '—'}
              </div>
              {rrWarn && (
                <div className="text-[9px] text-[#ef4444] flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3" />{t('tradeWarnLowRR')}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase">{t('tradeRiskPct')}</div>
              <div className={`text-base font-bold font-mono ${riskWarn ? 'text-[#ef4444]' : 'text-foreground'}`}>
                {liveRiskPct === '—' ? '—' : `${liveRiskPct}%`}
              </div>
              {riskWarn && (
                <div className="text-[9px] text-[#ef4444] flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3" />{t('tradeWarnOversize')}
                </div>
              )}
            </div>
          </div>

          {/* Emotion & notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

export default TradeFormModal;
