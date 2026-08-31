import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, GitCompare, Layers, Minus, Plus, CalendarDays } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import StrategyBar from './StrategyBar';

const CONTRACT_PRESETS = [1, 5, 10, 25, 100];

/**
 * Paso 1 del panel: las TRES decisiones que definen la posición.
 *
 * Antes estaban repartidas por toda la pantalla y en orden arbitrario: la
 * estrategia ocupaba una barra propia con 33 tarjetas arriba del todo, el
 * vencimiento vivía en la barra lateral derecha (bajo el plegado en móvil) y el
 * número de contratos estaba enterrado en medio de la fila de métricas, entre
 * el break-even y las comisiones. Elegir una posición obligaba a saltar por
 * tres zonas distintas de la página.
 *
 * Aquí van juntas, en el orden en que se deciden, y el selector de estrategia
 * (que es lo voluminoso) se despliega bajo demanda en lugar de ocupar sitio
 * permanentemente.
 */
export default function PositionSetupBar({
  strategies,
  categories,
  selectedStrategy,
  onSelectStrategy,
  expirations,
  selectedExpIdx,
  onExpChange,
  contracts,
  onContractsChange,
  compareMode,
  onToggleCompare,
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const expRowRef = useRef(null);

  // Al cambiar de vencimiento con el teclado o desde otra pestaña, mantén el
  // chip activo a la vista dentro de la fila con scroll.
  useEffect(() => {
    const el = expRowRef.current?.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedExpIdx]);

  const stepContracts = (delta) => {
    const next = Math.max(1, Math.min(1000, (parseInt(contracts, 10) || 1) + delta));
    onContractsChange(next);
  };

  const onContractsKey = (e) => {
    // Los inputs numéricos ya hacen ±1 con las flechas; Shift da saltos de 10.
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey) {
      e.preventDefault();
      stepContracts(e.key === 'ArrowUp' ? 10 : -10);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl" data-testid="position-setup">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] divide-y lg:divide-y-0 lg:divide-x divide-border">

        {/* ── Estrategia ───────────────────────────────────────── */}
        <div className="p-3 min-w-0">
          <Label>{t('optSetupStrategy')}</Label>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            data-testid="strategy-picker-toggle"
            className="w-full flex items-center gap-2 px-3 h-10 rounded-lg bg-muted border border-border hover:border-primary/40 transition-colors text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground truncate">
                {t(selectedStrategy.name)}
              </span>
              <span className="block text-[10px] text-muted-foreground truncate">
                {t('riskLabel')}: {t(selectedStrategy.risk)} · {t('rewardLabel')}: {t(selectedStrategy.reward)}
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* ── Vencimiento ──────────────────────────────────────── */}
        <div className="p-3 min-w-0">
          <Label>
            <CalendarDays className="w-3 h-3 inline mr-1 -mt-px" />
            {t('optExpirationDate')}
          </Label>
          {expirations.length === 0 ? (
            <p className="text-xs text-muted-foreground h-10 flex items-center">{t('optNoExpirations')}</p>
          ) : (
            <div
              ref={expRowRef}
              className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
              data-testid="expiration-chips"
            >
              {expirations.slice(0, 12).map((exp, idx) => {
                const active = selectedExpIdx === idx;
                return (
                  <button
                    key={exp.date}
                    type="button"
                    data-active={active}
                    onClick={() => onExpChange(idx)}
                    aria-pressed={active}
                    className={`flex-shrink-0 px-2.5 h-10 rounded-lg border text-center transition-colors ${
                      active
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/25'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold leading-tight whitespace-nowrap">{exp.label}</span>
                    <span className="block text-[9px] opacity-70 tabular-nums">{exp.daysToExpiry}d</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Contratos + comparar ─────────────────────────────── */}
        <div className="p-3">
          <Label>
            <Layers className="w-3 h-3 inline mr-1 -mt-px" />
            {t('optContracts')}
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center h-10 rounded-lg bg-muted border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => stepContracts(-1)}
                disabled={contracts <= 1}
                aria-label={t('optContractsDecrease')}
                data-testid="contracts-decrement"
                className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={1}
                max={1000}
                step={1}
                value={contracts}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  onContractsChange(Number.isNaN(n) ? 1 : Math.max(1, Math.min(1000, n)));
                }}
                onKeyDown={onContractsKey}
                title={t('optContractsKbdHint')}
                data-testid="contracts-input"
                className="w-12 h-full bg-transparent text-center text-sm font-mono font-bold text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => stepContracts(1)}
                disabled={contracts >= 1000}
                aria-label={t('optContractsIncrease')}
                data-testid="contracts-increment"
                className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5" data-testid="contracts-presets">
              {CONTRACT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onContractsChange(n)}
                  aria-pressed={contracts === n}
                  data-testid={`contracts-preset-${n}`}
                  className={`min-w-[26px] h-6 px-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                    contracts === n
                      ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/50 text-[#38bdf8]'
                      : 'bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-[#38bdf8]/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={compareMode}
              data-testid="compare-toggle"
              className={`flex items-center gap-1.5 px-2.5 h-10 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                compareMode
                  ? 'bg-compare/20 border-compare/50 text-compare'
                  : 'bg-muted border-border text-muted-foreground hover:text-compare hover:border-compare/40'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              {compareMode ? t('optComparing') : t('optCompareToggle')}
            </button>
          </div>
        </div>
      </div>

      {/* Selector de estrategia — 33 tarjetas, sólo cuando se piden */}
      {pickerOpen && (
        <div className="border-t border-border">
          <StrategyBar
            strategies={strategies}
            categories={categories}
            selected={selectedStrategy}
            onSelect={(s) => {
              onSelectStrategy(s);
              setPickerOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

const Label = ({ children }) => (
  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
    {children}
  </span>
);
