import React from 'react';
import { Calculator, ChevronDown, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';
import { FOREX_LOT_TYPES, sizingLabelKey } from '@/lib/instruments';
import { PRODUCT_META, fmtMoney, fmtNum } from '@/components/performance/form/productMeta';
import LevelInput from '@/components/performance/form/LevelInput';
import { MARGIN_MODE_META } from './deskMeta';

/**
 * El formulario. Siete campos a la vista y un botón.
 *
 * La versión anterior enseñaba dieciocho campos repartidos en tres bloques
 * numerados, con una etiqueta y una nota bajo cada uno. Era el formulario del
 * diario —que está bien, porque allí se REGISTRA una operación que ya ocurrió y
 * cada dato importa— trasplantado a un sitio donde sólo se hace una pregunta.
 *
 * Aquí lo visible es lo que hace falta para contestarla:
 *
 *     capital · riesgo    →  cuánto me puedo jugar
 *     producto · activo   →  qué es una unidad de esto
 *     entrada · stop · objetivo
 *
 * Y un botón de **Calcular**. La versión anterior recalculaba mientras
 * escribías, que es lo correcto en un terminal donde el precio se mueve solo, y
 * aquí era desconcertante: los números cambiaban sin que nadie los pidiera y
 * nunca quedaba claro cuándo el resultado era «el bueno». Un botón marca el
 * final de la pregunta, y es lo que hacen las otras catorce calculadoras de
 * esta web y todas las del sector.
 *
 * Lo que decide el producto y casi nadie cambia —tamaño de contrato,
 * apalancamiento, modo de margen, tipo de lote— vive en «Ajustes del
 * instrumento», plegado, con lo que el catálogo ha puesto ya resumido en la
 * cabecera para que no haga falta abrirlo para saber qué va a usar.
 */
export default function DeskForm({
  form, setForm, account, patchAccount,
  spec, contractSize, leverage, marginInfo, marginMode, products,
  budget, levels, onProduct, onSymbol, onCalcular, puedeCalcular, avanzado, setAvanzado,
}) {
  const { t } = useTranslation();
  const esOpcion = form.product === 'option';
  const riskMode = account?.riskMode === 'money' ? 'money' : 'pct';

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [k]: v }));
  };

  return (
    <form
      className="rounded-lg border border-rule bg-card"
      onSubmit={(e) => { e.preventDefault(); onCalcular(); }}
      data-testid="desk-form"
    >
      {/* ── Capital y riesgo ─────────────────────────────────────── */}
      <div className="p-4 md:p-5 border-b border-rule">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <Campo etiqueta={t('deskCapitalLabel')} icono={<Wallet className="w-3.5 h-3.5" />}>
            <Input
              type="number" step="any" min="0"
              value={account?.capital ?? ''}
              onChange={(e) => patchAccount('capital', e.target.value)}
              placeholder={t('deskCapitalPlaceholder')}
              className="font-mono tabular-nums text-xl h-12"
              data-testid="desk-capital"
            />
          </Campo>

          <Campo
            etiqueta={t('deskRiskLabel')}
            derecha={(
              <div className="flex rounded-sharp border border-rule overflow-hidden">
                {['pct', 'money'].map((mo) => (
                  <button
                    key={mo} type="button"
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
            )}
          >
            <Input
              type="number" step={riskMode === 'pct' ? '0.1' : 'any'} min="0"
              value={(riskMode === 'pct' ? account?.riskPct : account?.riskMoney) ?? ''}
              onChange={(e) => patchAccount(riskMode === 'pct' ? 'riskPct' : 'riskMoney', e.target.value)}
              placeholder={riskMode === 'pct' ? '1' : '100'}
              className="font-mono tabular-nums text-xl h-12"
              data-testid={riskMode === 'pct' ? 'desk-risk-pct' : 'desk-risk-money'}
            />
          </Campo>

          {/* Lo que el riesgo significa en dinero, al lado y sin pedirlo. */}
          <div className="pb-1 min-w-[7rem]" data-testid="desk-risk-amount">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {t('deskRiskAmount')}
            </p>
            <p className={`font-mono text-2xl font-bold tabular-nums ${budget?.blocked ? 'text-muted-foreground' : 'text-short'}`}>
              {fmtMoney(budget?.amount)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Producto y activo ────────────────────────────────────── */}
      <div className="p-4 md:p-5 border-b border-rule space-y-4">
        <div>
          <Etiqueta>{t('tfProduct')}</Etiqueta>
          <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="desk-product-picker">
            {products.map((id) => {
              const meta = PRODUCT_META[id];
              const Ic = meta.icon;
              const activo = form.product === id;
              return (
                <button
                  type="button" key={id}
                  onClick={() => onProduct(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-sharp text-xs font-bold uppercase tracking-wider border transition-colors ${
                    activo
                      ? 'bg-primary/15 text-primary border-primary/50'
                      : 'border-rule text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`desk-product-${id}`}
                >
                  <Ic className="w-3.5 h-3.5" />
                  {t(meta.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Etiqueta>{t('tradeSymbol')}</Etiqueta>
            <div className="mt-1.5">
              <UniversalAssetSearch
                value={form.symbol}
                onChange={(a) => onSymbol(a?.symbol || a?.id || '')}
                placeholder={t('tradeSymbolSearch')}
                testId="desk-symbol-search"
              />
            </div>
            <Input
              value={form.symbol}
              onChange={(e) => onSymbol(e.target.value)}
              placeholder={form.product === 'forex' ? 'EURUSD' : 'AAPL'}
              className="mt-1.5 uppercase text-xs h-8 font-mono"
              data-testid="desk-symbol"
            />
          </div>

          <div>
            <Etiqueta>{esOpcion ? t('tradeOptionSideLabel') : t('tradeSide')}</Etiqueta>
            <div className="mt-1.5 flex gap-1.5">
              {[
                { id: 'long', k: esOpcion ? 'deskOptBuy' : 'tradeFormSideLong', on: 'bg-long/15 text-long border-long/50' },
                { id: 'short', k: esOpcion ? 'deskOptSell' : 'tradeFormSideShort', on: 'bg-short/15 text-short border-short/50' },
              ].map((s) => (
                <button
                  type="button" key={s.id}
                  onClick={() => set('side')(s.id)}
                  className={`flex-1 px-3 py-2 rounded-sharp text-xs font-bold uppercase tracking-wider border transition-colors ${
                    form.side === s.id ? s.on : 'border-rule text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`desk-side-${s.id}`}
                >
                  {t(s.k)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Entrada, stop, objetivo ──────────────────────────────── */}
      <div className="p-4 md:p-5 border-b border-rule">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Etiqueta>{esOpcion ? t('tradePremiumEntry') : t('tradeEntry')}</Etiqueta>
            <Input
              type="number" step="any" value={form.entry_price}
              onChange={set('entry_price')}
              className="mt-1.5 font-mono tabular-nums" data-testid="desk-entry"
            />
          </div>
          <LevelInput
            kind="sl" label={t('tradeSL')} spec={spec}
            unit={form.sl_unit} value={form.sl_unit === 'price' ? form.sl : form.sl_input}
            onUnitChange={(u) => setForm((p) => ({ ...p, sl_unit: u }))}
            onValueChange={(v) => setForm((p) => (p.sl_unit === 'price' ? { ...p, sl: v } : { ...p, sl_input: v }))}
            resolvedPrice={levels?.sl}
            testid="desk-sl"
          />
          <LevelInput
            kind="tp" label={t('tradeTP')} spec={spec}
            unit={form.tp_unit} value={form.tp_unit === 'price' ? form.tp : form.tp_input}
            onUnitChange={(u) => setForm((p) => ({ ...p, tp_unit: u }))}
            onValueChange={(v) => setForm((p) => (p.tp_unit === 'price' ? { ...p, tp: v } : { ...p, tp_input: v }))}
            resolvedPrice={levels?.tp}
            testid="desk-tp"
          />
        </div>
      </div>

      {/* ── Lo que decide el producto, plegado ───────────────────── */}
      <div className="border-b border-rule">
        <button
          type="button"
          onClick={() => setAvanzado((v) => !v)}
          aria-expanded={avanzado}
          className="w-full flex items-center gap-2 px-4 md:px-5 py-2.5 text-left hover:bg-muted/40 transition-colors"
          data-testid="desk-advanced-toggle"
        >
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${avanzado ? 'rotate-180' : ''}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('deskInstrumentSettings')}
          </span>
          {/* El resumen de lo que el catálogo ya ha puesto: se ve sin abrir. */}
          <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted-foreground tabular-nums">
            {[
              contractSize != null ? `${t('tfSpecContract')} ${fmtNum(contractSize, contractSize < 10 ? 2 : 0)}` : t('tfContractSizeUnknown'),
              spec?.usesLeverage ? `${fmtNum(leverage, leverage < 10 ? 1 : 0)}×` : null,
              marginMode ? t(MARGIN_MODE_META[marginMode].labelKey) : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </button>

        {avanzado && (
          <div className="px-4 md:px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="desk-advanced">
            <div>
              <Etiqueta>{t('tfContractSize')}</Etiqueta>
              <Input
                type="number" step="any" value={form.multiplier ?? ''}
                onChange={set('multiplier')}
                placeholder={contractSize != null ? String(contractSize) : t('tfContractSizeUnknown')}
                className="mt-1.5 font-mono tabular-nums" data-testid="desk-multiplier"
              />
            </div>

            <div>
              <Etiqueta>{t('tfLeverage')}</Etiqueta>
              {spec?.usesLeverage ? (
                <Input
                  type="number" step="any" min="1" value={form.leverage ?? ''}
                  onChange={set('leverage')}
                  placeholder={fmtNum(leverage, leverage < 10 ? 1 : 0)}
                  className="mt-1.5 font-mono tabular-nums" data-testid="desk-leverage"
                />
              ) : (
                <p className="mt-1.5 h-10 flex items-center px-3 rounded-sharp bg-muted/50 border border-rule text-xs text-muted-foreground"
                  data-testid="desk-leverage-na">
                  {t('tfLeverageNA')}
                </p>
              )}
            </div>

            <div>
              <Etiqueta>{t('deskMarginMode')}</Etiqueta>
              {marginInfo?.modes.length > 1 ? (
                <div className="mt-1.5 flex gap-1.5" data-testid="desk-margin-picker">
                  {marginInfo.modes.map((mo) => (
                    <button
                      type="button" key={mo}
                      onClick={() => set('margin_mode')(mo)}
                      className={`flex-1 px-2 py-2 rounded-sharp text-[11px] font-bold uppercase border transition-colors ${
                        marginMode === mo
                          ? 'bg-primary/15 text-primary border-primary/50'
                          : 'border-rule text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`desk-margin-${mo}`}
                    >
                      {t(MARGIN_MODE_META[mo].labelKey)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 h-10 flex items-center px-3 rounded-sharp bg-muted/50 border border-rule text-xs text-muted-foreground"
                  data-testid="desk-margin-fixed">
                  {marginMode ? t(MARGIN_MODE_META[marginMode].labelKey) : t('deskMarginNA')}
                </p>
              )}
            </div>

            <div>
              <Etiqueta>{form.product === 'forex' ? t('deskLotType') : t(sizingLabelKey(spec))}</Etiqueta>
              {form.product === 'forex' ? (
                <select
                  value={form.lot_type || 'standard'}
                  onChange={(e) => set('lot_type')(e.target.value)}
                  className="mt-1.5 w-full h-10 bg-muted border border-rule rounded-sharp px-2 text-xs"
                  data-testid="desk-lot-type"
                >
                  {Object.values(FOREX_LOT_TYPES).map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {t(`lot_${lt.id}`)} · {lt.units.toLocaleString('en-US')}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1.5 h-10 flex items-center px-3 rounded-sharp bg-muted/50 border border-rule text-xs text-muted-foreground">
                  {t('deskSizeFromRiskHint')}
                </p>
              )}
            </div>

            <p className="col-span-2 md:col-span-4 text-[11px] text-muted-foreground leading-relaxed">
              {t(marginInfo?.reasonKey || 'deskMarginWhyCash')}
            </p>
          </div>
        )}
      </div>

      {/* ── El botón ─────────────────────────────────────────────── */}
      <div className="p-4 md:p-5">
        <Button
          type="submit"
          size="lg"
          disabled={!puedeCalcular}
          className="w-full h-12 gap-2 text-base font-bold"
          data-testid="desk-calcular"
        >
          <Calculator className="w-5 h-5" />
          {t('deskCalculate')}
        </Button>
      </div>
    </form>
  );
}

function Etiqueta({ children }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

function Campo({ etiqueta, icono, derecha, children }) {
  return (
    <div className="min-w-0">
      <Label className="flex items-center gap-1.5 mb-1.5">
        {icono}
        <Etiqueta>{etiqueta}</Etiqueta>
        {derecha ? <span className="ml-auto">{derecha}</span> : null}
      </Label>
      {children}
    </div>
  );
}
