import React, { useState, useEffect } from 'react';
import { Calculator, Wallet, AlertTriangle, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * TradeAdvancedPanel — collapsible panel exposing 3 pro-grade features:
 *   1. Fees / commission per contract (affects max profit/loss/break-even)
 *   2. P&L attribution (decomposes a hypothetical move into Δ/Γ/Θ/ν contributions)
 *   3. Assignment / exercise simulation at expiry
 *
 * Props:
 *   legs              — current strategy legs
 *   stock             — { symbol, price, dividendYield? }
 *   feePerContract    — current fee state value (parent owns)
 *   onFeeChange       — setter
 *   dividendYield     — current dividend yield decimal value (parent owns; auto from stock)
 *   onDividendChange  — setter
 */
const TradeAdvancedPanel = ({ legs, stock, feePerContract, onFeeChange, dividendYield, onDividendChange }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState({ fees: false, attribution: false, assignment: false });
  const [scenarios, setScenarios] = useState({ priceMove: 5, daysElapsed: 5, ivChange: 0 });
  const [attribution, setAttribution] = useState(null);
  const [assignment, setAssignment] = useState(null);

  // Auto-fetch attribution and assignment when scenarios or legs change
  useEffect(() => {
    if (!expanded.attribution && !expanded.assignment) return;
    if (!legs || legs.filter((l) => l.type !== 'stock').length === 0) return;

    const optionLegs = legs.filter((l) => l.type !== 'stock').map((l) => ({
      type: l.type,
      action: l.action,
      quantity: l.quantity || l.qty || 1,
      strike: l.strike,
      premium: l.premium || 0,
      iv: l.iv || 0.3,
      daysToExpiry: l.daysToExpiry || 30,
    }));

    if (expanded.attribution) {
      fetch(`${API}/api/calculate/pnl-attribution`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: optionLegs,
          stockPriceInitial: stock.price,
          stockPriceFinal: stock.price * (1 + scenarios.priceMove / 100),
          daysElapsed: scenarios.daysElapsed,
          ivChangeAbs: scenarios.ivChange / 100,
          initialDaysToExpiry: optionLegs[0]?.daysToExpiry || 30,
          dividendYield: dividendYield || 0,
        }),
      })
        .then((r) => r.json())
        .then(setAttribution)
        .catch(() => setAttribution(null));
    }

    if (expanded.assignment) {
      const expiryPrice = stock.price * (1 + scenarios.priceMove / 100);
      fetch(`${API}/api/calculate/assignment`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legs: optionLegs, stockPriceAtExpiry: expiryPrice }),
      })
        .then((r) => r.json())
        .then(setAssignment)
        .catch(() => setAssignment(null));
    }
  }, [legs, stock?.price, scenarios, expanded, dividendYield]);

  if (!stock) return null;

  const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2);
  const colorize = (n) => (n >= 0 ? 'text-long' : 'text-short');

  return (
    <div className="space-y-2" data-testid="trade-advanced-panel">
      {/* Section 1: Fees + Dividend yield */}
      <div className="bg-card/60 border border-border/60 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((s) => ({ ...s, fees: !s.fees }))}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
          data-testid="fees-toggle"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-warn" />
            <span className="text-xs font-bold text-foreground">{t('feesAndDividends_adv001')}</span>
            {(feePerContract > 0 || dividendYield > 0) && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-warn/15 text-warn font-bold">{t('active_adv008')}</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.fees ? 'rotate-180' : ''}`} />
        </button>
        {expanded.fees && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t('feesDesc_adv002')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-muted-foreground font-semibold uppercase mb-1 block">
                  {t('feePerContract_adv003')}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={feePerContract}
                    onChange={(e) => onFeeChange(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                    data-testid="fee-input"
                  />
                </div>
                <p className="text-[8px] text-muted-foreground mt-1">{t('feeHint_adv004')}</p>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground font-semibold uppercase mb-1 block">
                  {t('dividendYield_adv005')}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={(dividendYield * 100).toFixed(2)}
                    onChange={(e) => onDividendChange((parseFloat(e.target.value) || 0) / 100)}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                    data-testid="dividend-input"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[8px] text-muted-foreground mt-1">{t('dividendHint_adv006')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: P&L Attribution */}
      <div className="bg-card/60 border border-border/60 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((s) => ({ ...s, attribution: !s.attribution }))}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
          data-testid="attribution-toggle"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-compare" />
            <span className="text-xs font-bold text-foreground">{t('pnlAttribution_adv010')}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.attribution ? 'rotate-180' : ''}`} />
        </button>
        {expanded.attribution && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t('attributionDesc_adv011')}</p>

            {/* Scenario sliders */}
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <label className="font-semibold uppercase text-muted-foreground">{t('priceMove_adv012')}</label>
                <input
                  type="range" min="-20" max="20" step="0.5"
                  value={scenarios.priceMove}
                  onChange={(e) => setScenarios((s) => ({ ...s, priceMove: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center font-mono">{fmt(scenarios.priceMove)}%</div>
              </div>
              <div>
                <label className="font-semibold uppercase text-muted-foreground">{t('daysPassed_adv013')}</label>
                <input
                  type="range" min="0" max="60" step="1"
                  value={scenarios.daysElapsed}
                  onChange={(e) => setScenarios((s) => ({ ...s, daysElapsed: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center font-mono">{scenarios.daysElapsed}d</div>
              </div>
              <div>
                <label className="font-semibold uppercase text-muted-foreground">{t('ivChange_adv014')}</label>
                <input
                  type="range" min="-20" max="20" step="0.5"
                  value={scenarios.ivChange}
                  onChange={(e) => setScenarios((s) => ({ ...s, ivChange: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-center font-mono">{fmt(scenarios.ivChange)}%</div>
              </div>
            </div>

            {/* Attribution result */}
            {attribution && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'delta_pnl', label: 'Δ Delta', icon: TrendingUp },
                  { key: 'gamma_pnl', label: 'Γ Gamma', icon: TrendingUp },
                  { key: 'theta_pnl', label: 'Θ Theta', icon: TrendingDown },
                  { key: 'vega_pnl', label: 'ν Vega', icon: TrendingUp },
                ].map(({ key, label, icon: Ic }) => (
                  <div key={key} className="bg-background/60 border border-border/40 rounded p-2">
                    <div className="text-[9px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                      <Ic className="w-3 h-3" /> {label}
                    </div>
                    <div className={`text-sm font-mono font-bold ${colorize(attribution[key])}`}>
                      ${fmt(attribution[key])}
                    </div>
                  </div>
                ))}
                <div className="col-span-2 bg-primary/10 border border-primary/30 rounded p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase text-primary font-bold">{t('totalActual_adv015')}</div>
                      <div className={`text-base font-mono font-bold ${colorize(attribution.total_actual)}`}>
                        ${fmt(attribution.total_actual)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase text-muted-foreground">{t('residual_adv016')}</div>
                      <div className="text-[10px] font-mono">{fmt(attribution.residual)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Assignment Simulation */}
      <div className="bg-card/60 border border-border/60 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((s) => ({ ...s, assignment: !s.assignment }))}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
          data-testid="assignment-toggle"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-short" />
            <span className="text-xs font-bold text-foreground">{t('assignmentSim_adv020')}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.assignment ? 'rotate-180' : ''}`} />
        </button>
        {expanded.assignment && (
          <div className="px-4 pb-4 pt-1 space-y-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t('assignmentDesc_adv021')}</p>
            <div>
              <label className="text-[9px] text-muted-foreground font-semibold uppercase mb-1 block">
                {t('priceAtExpiry_adv022')}
              </label>
              <input
                type="range"
                min={Math.round(stock.price * 0.7)}
                max={Math.round(stock.price * 1.3)}
                step="0.5"
                value={stock.price * (1 + scenarios.priceMove / 100)}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value);
                  const move = ((newPrice / stock.price) - 1) * 100;
                  setScenarios((s) => ({ ...s, priceMove: move }));
                }}
                className="w-full"
              />
              <div className="text-center font-mono text-xs">${(stock.price * (1 + scenarios.priceMove / 100)).toFixed(2)}</div>
            </div>

            {assignment && (
              <div className="space-y-2">
                {assignment.assignments.map((a) => (
                  <div key={`${a.leg}-${a.strike}`} className={`rounded p-2 border ${a.is_itm ? 'bg-short/10 border-short/30' : 'bg-background/60 border-border/40'}`}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-foreground">{a.leg}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${a.is_itm ? 'bg-short/30 text-short' : 'bg-muted text-muted-foreground'}`}>
                        {a.is_itm ? t('itm_adv023') : t('expiresWorthless_adv024')}
                      </span>
                    </div>
                    {a.is_itm && (
                      <div className="grid grid-cols-2 gap-2 mt-1 text-[10px]">
                        <div>
                          <span className="text-muted-foreground">{t('shares_adv025')}: </span>
                          <span className={`font-mono font-bold ${a.shares_delivered >= 0 ? 'text-long' : 'text-short'}`}>
                            {a.shares_delivered >= 0 ? '+' : ''}{a.shares_delivered}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('cashFlow_adv026')}: </span>
                          <span className={`font-mono font-bold ${a.cash_flow >= 0 ? 'text-long' : 'text-short'}`}>
                            ${a.cash_flow.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-primary/10 border border-primary/30 rounded p-2 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-primary uppercase">{t('netResult_adv027')}</span>
                  <div className="flex gap-3 font-mono">
                    <span className={assignment.net_shares >= 0 ? 'text-long' : 'text-short'}>
                      {assignment.net_shares >= 0 ? '+' : ''}{assignment.net_shares} sh
                    </span>
                    <span className={assignment.net_cash_flow >= 0 ? 'text-long' : 'text-short'}>
                      ${assignment.net_cash_flow.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeAdvancedPanel;
