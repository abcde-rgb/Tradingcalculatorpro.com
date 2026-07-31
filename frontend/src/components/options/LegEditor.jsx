import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const LegEditor = ({
  legs,
  chain,
  chains = {},
  expirations = [],
  defaultExpIdx = 0,
  stockPrice,
  onLegsChange,
}) => {
  const { t } = useTranslation();
  const [dragIdx, setDragIdx] = useState(null);

  // La cadena que corresponde a una pata. Cada pata puede vivir en un
  // vencimiento distinto — es lo que separa un vertical de un calendar — así
  // que su strike y su prima tienen que salir de SU cadena, no de la que esté
  // seleccionada arriba.
  const chainFor = useCallback(
    (expIdx) => chains[String(expIdx)]?.chain || chain || [],
    [chains, chain]
  );

  const addLeg = useCallback((type = 'call', action = 'buy') => {
    // Find ATM strike
    const atmIdx = chain.reduce((best, s, idx) =>
      Math.abs(s.strike - stockPrice) < Math.abs(chain[best].strike - stockPrice) ? idx : best, 0);
    const atmStrike = chain[atmIdx];
    const opt = atmStrike?.[type];

    const newLeg = {
      id: Date.now() + Math.random(),
      type,
      action,
      quantity: 1,
      strikeIdx: atmIdx,
      strike: atmStrike?.strike || stockPrice,
      premium: opt?.mid || 0,
      iv: opt?.iv || 0.3,
      expIdx: defaultExpIdx,
      enabled: true,
    };
    onLegsChange([...legs, newLeg]);
  }, [chain, stockPrice, legs, onLegsChange, defaultExpIdx]);

  const removeLeg = useCallback((idx) => {
    onLegsChange(legs.filter((_, i) => i !== idx));
  }, [legs, onLegsChange]);

  const updateLeg = useCallback((idx, updates) => {
    const newLegs = [...legs];
    const leg = { ...newLegs[idx], ...updates };

    // Cambiar de vencimiento no conserva el índice de strike: dos vencimientos
    // no tienen por qué listar los mismos strikes ni en el mismo orden. Se
    // reancla por strike más cercano, y la prima y la IV se releen de la
    // cadena nueva — que es justo el punto de mover la pata de fecha.
    if (updates.expIdx !== undefined) {
      const nextChain = chainFor(updates.expIdx);
      if (nextChain.length > 0) {
        const target = leg.strike ?? stockPrice;
        const nearest = nextChain.reduce(
          (best, s, i) =>
            Math.abs(s.strike - target) < Math.abs(nextChain[best].strike - target) ? i : best,
          0
        );
        const strikeData = nextChain[nearest];
        leg.strikeIdx = nearest;
        leg.strike = strikeData.strike;
        leg.premium = strikeData[leg.type]?.mid || 0;
        leg.iv = strikeData[leg.type]?.iv || 0.3;
      }
      newLegs[idx] = leg;
      onLegsChange(newLegs);
      return;
    }

    // If strike changed, update premium from chain
    if (updates.strikeIdx !== undefined || updates.type !== undefined) {
      const sIdx = updates.strikeIdx !== undefined ? updates.strikeIdx : leg.strikeIdx;
      const type = updates.type !== undefined ? updates.type : leg.type;
      const strikeData = chainFor(leg.expIdx ?? defaultExpIdx)[sIdx];
      if (strikeData) {
        leg.strike = strikeData.strike;
        leg.premium = strikeData[type]?.mid || 0;
        leg.iv = strikeData[type]?.iv || 0.3;
        leg.strikeIdx = sIdx;
      }
    }

    newLegs[idx] = leg;
    onLegsChange(newLegs);
  }, [legs, chainFor, onLegsChange, defaultExpIdx, stockPrice]);

  // ¿Hay patas en más de un vencimiento? Entonces esto ya no es un vertical y
  // conviene decirlo: el gráfico se dibuja al vencimiento de la más cercana.
  const distinctExpiries = new Set(
    legs.filter((l) => l.enabled).map((l) => l.expIdx ?? defaultExpIdx)
  );
  const isMultiExpiry = distinctExpiries.size > 1;

  const duplicateLeg = useCallback((idx) => {
    const clone = { ...legs[idx], id: Date.now() + Math.random() };
    const newLegs = [...legs];
    newLegs.splice(idx + 1, 0, clone);
    onLegsChange(newLegs);
  }, [legs, onLegsChange]);

  const toggleAction = useCallback((idx) => {
    updateLeg(idx, { action: legs[idx].action === 'buy' ? 'sell' : 'buy' });
  }, [legs, updateLeg]);

  const toggleType = useCallback((idx) => {
    updateLeg(idx, { type: legs[idx].type === 'call' ? 'put' : 'call' });
  }, [legs, updateLeg]);

  const toggleEnabled = useCallback((idx) => {
    updateLeg(idx, { enabled: !legs[idx].enabled });
  }, [legs, updateLeg]);

  const clearAll = useCallback(() => {
    onLegsChange([]);
  }, [onLegsChange]);

  // Calculate net premium
  const netPremium = legs.reduce((acc, leg) => {
    if (!leg.enabled) return acc;
    const mult = leg.action === 'buy' ? -1 : 1;
    return acc + leg.premium * mult * leg.quantity * 100;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{t('optLegsBuilder')}</h3>
          {/* Etiqueta de recuento en vez de "{n} patas activas": con n=1 salía
              "1 patas activas", y la concordancia singular/plural no se resuelve
              igual en los 8 idiomas. Así funciona en todos. */}
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {t('optLegsActive')}: {legs.filter(l => l.enabled).length}
          </p>
          {isMultiExpiry && (
            <p className="text-[9px] text-[#f59e0b] mt-0.5" data-testid="multi-expiry-notice">
              {t('optMultiExpiryNotice')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearAll}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
            title="Borrar todo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legs List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar pb-2">
        {legs.map((leg, idx) => (
          <div
            key={leg.id}
            className={`rounded-xl border transition-all ${
              !leg.enabled
                ? 'border-border/50 opacity-40'
                : leg.action === 'buy'
                ? 'border-[#22c55e]/20 bg-[#22c55e]/[0.03]'
                : 'border-[#ef4444]/20 bg-[#ef4444]/[0.03]'
            }`}
          >
            {/* Leg Header */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
              <GripVertical className="w-3 h-3 text-[#2a3446] cursor-grab flex-shrink-0" />

              {/* Buy/Sell Toggle */}
              <button
                onClick={() => toggleAction(idx)}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  leg.action === 'buy'
                    ? 'bg-[#22c55e]/15 text-[#4ade80] hover:bg-[#22c55e]/25'
                    : 'bg-[#ef4444]/15 text-[#f87171] hover:bg-[#ef4444]/25'
                }`}
              >
                {leg.action === 'buy' ? 'BUY' : 'SELL'}
              </button>

              {/* Call/Put Toggle */}
              <button
                onClick={() => toggleType(idx)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  leg.type === 'call'
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : 'bg-[#a78bfa]/15 text-[#c4b5fd] hover:bg-[#a78bfa]/25'
                }`}
              >
                {leg.type === 'call' ? 'CALL' : 'PUT'}
              </button>

              <div className="flex-1" />

              {/* Actions */}
              <button onClick={() => toggleEnabled(idx)} className="p-1 rounded hover:bg-muted transition-colors" title={leg.enabled ? 'Desactivar' : 'Activar'}>
                {leg.enabled
                  ? <ToggleRight className="w-4 h-4 text-[#22c55e]" />
                  : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                }
              </button>
              <button onClick={() => duplicateLeg(idx)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Duplicar">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={() => removeLeg(idx)} className="p-1 rounded hover:bg-[#ef4444]/10 transition-colors text-muted-foreground hover:text-[#ef4444]" title="Eliminar">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Vencimiento de ESTA pata. Sin este selector, un calendar, una
                diagonal o un PMCC no se pueden ni escribir: todas las patas
                heredaban el vencimiento global. */}
            {expirations.length > 0 && (
              <div className="px-3 pb-1.5">
                <label className="text-[8px] text-[#3a4f6e] font-semibold uppercase mb-0.5 block">
                  {t('optLegExpiry')}
                </label>
                <select
                  value={leg.expIdx ?? defaultExpIdx}
                  onChange={(e) => updateLeg(idx, { expIdx: parseInt(e.target.value, 10) })}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  data-testid={`leg-${idx}-expiry`}
                >
                  {expirations.map((exp, ei) => (
                    <option key={exp.date || ei} value={ei}>
                      {exp.label || exp.date} · {exp.daysToExpiry}d
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Leg Config */}
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-2.5">
              {/* Strike */}
              <div>
                <label className="text-[8px] text-[#3a4f6e] font-semibold uppercase mb-0.5 block">Strike</label>
                <select
                  value={leg.strikeIdx}
                  onChange={(e) => updateLeg(idx, { strikeIdx: parseInt(e.target.value) })}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  {chainFor(leg.expIdx ?? defaultExpIdx).map((s, si) => (
                    <option key={s.strike} value={si}>${s.strike}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[8px] text-[#3a4f6e] font-semibold uppercase mb-0.5 block">{t('cantidad_91e0e6')}</label>
                <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateLeg(idx, { quantity: Math.max(1, leg.quantity - 1) })}
                    className="px-1.5 py-1.5 hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <span className="text-xs">-</span>
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={leg.quantity}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      const parsed = parseInt(raw, 10);
                      if (!raw || Number.isNaN(parsed) || parsed < 1) {
                        updateLeg(idx, { quantity: 1 });
                      } else {
                        updateLeg(idx, { quantity: Math.min(10000, parsed) });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                    }}
                    className="w-full bg-transparent text-center text-xs font-mono text-foreground focus:outline-none py-1.5"
                    min={1}
                    data-testid={`leg-${idx}-quantity`}
                  />
                  <button
                    onClick={() => updateLeg(idx, { quantity: leg.quantity + 1 })}
                    className="px-1.5 py-1.5 hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <span className="text-xs">+</span>
                  </button>
                </div>
              </div>

              {/* Premium */}
              <div>
                <label className="text-[8px] text-[#3a4f6e] font-semibold uppercase mb-0.5 block">{t('prima_ua002')}</label>
                <div className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-muted-foreground text-center">
                  ${leg.premium?.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Leg details */}
            <div className="flex items-center justify-between px-3 pb-2 text-[9px] text-[#3a4f6e]">
              <span>IV: {(leg.iv * 100).toFixed(1)}%</span>
              <span>
                {leg.action === 'buy' ? t('debito_33f877') : t('credito_93e87a')}: ${(leg.premium * leg.quantity * 100).toFixed(0)}
              </span>
            </div>
          </div>
        ))}

        {legs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-1">{t('optLegsEmpty')}</p>
            <p className="text-[10px] text-[#3a4f6e]">{t('anadeCallsOPutsPara_423bc0')}</p>
          </div>
        )}
      </div>

      {/* Add Buttons */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => addLeg('call', 'buy')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#4ade80] text-[11px] font-semibold hover:bg-[#22c55e]/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Buy Call
          </button>
          <button
            onClick={() => addLeg('put', 'buy')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd] text-[11px] font-semibold hover:bg-[#a78bfa]/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Buy Put
          </button>
          <button
            onClick={() => addLeg('call', 'sell')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171] text-[11px] font-semibold hover:bg-[#ef4444]/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Sell Call
          </button>
          <button
            onClick={() => addLeg('put', 'sell')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#fbbf24] text-[11px] font-semibold hover:bg-[#f59e0b]/20 transition-all"
          >
            <Plus className="w-3 h-3" /> Sell Put
          </button>
        </div>

        {/* Net Summary */}
        {legs.length > 0 && (
          <div className="bg-background rounded-lg border border-border p-2.5 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {netPremium >= 0 ? t('creditoNeto_a96b7e') : t('debitoNeto_39b7f9')}
            </span>
            <span className={`text-sm font-bold font-mono ${netPremium >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {netPremium >= 0 ? '+' : ''}${netPremium.toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegEditor;
