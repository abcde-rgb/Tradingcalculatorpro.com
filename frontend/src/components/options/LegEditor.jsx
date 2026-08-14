import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { optionDirection, DIRECTION_CLASSES, flowKey } from '@/lib/optionSides';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
        {legs.map((leg, idx) => {
          // El color de la pata sale de la DIRECCIÓN (alcista/bajista), no de
          // si se compra o se vende: comprar una put es bajista y vender una
          // put es alcista, así que el verde-comprar/rojo-vender de las
          // acciones decía lo contrario de lo que pasa en dos de los cuatro
          // casos. Ver `lib/optionSides.js`.
          const dir = optionDirection(leg.action, leg.type);
          return (
          <div
            key={leg.id}
            className={`rounded-xl border transition-all ${
              !leg.enabled
                ? 'border-border/50 opacity-40'
                : dir
                ? `${DIRECTION_CLASSES[dir.tone].border} ${DIRECTION_CLASSES[dir.tone].bg}`
                : 'border-border'
            }`}
          >
            {/* Leg Header */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
              <GripVertical className="w-3 h-3 text-[#2a3446] cursor-grab flex-shrink-0" />

              {/* Buy/Sell Toggle */}
              <button
                onClick={() => toggleAction(idx)}
                title={t(flowKey(leg.action))}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                  leg.action === 'buy'
                    ? 'bg-muted text-foreground hover:bg-muted/70'
                    : 'bg-foreground/10 text-foreground hover:bg-foreground/20'
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

              {/* Qué hace esta combinación. Sin esto, "SELL PUT" en rojo se
                  lee como bajista cuando es lo contrario. */}
              {dir && (
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${DIRECTION_CLASSES[dir.tone].chip}`}
                  title={t(dir.riskKey)}
                  data-testid={`leg-${idx}-bias`}
                >
                  {t(dir.biasKey)}
                </span>
              )}
              {dir && !dir.defined && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-[#fbbf24]"
                  title={t(dir.riskKey)}
                  data-testid={`leg-${idx}-open-risk`}
                >
                  {t('optLegOpenRisk')}
                </span>
              )}

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
              <button onClick={() => removeLeg(idx)} className="p-1 rounded hover:bg-[#ef4444]/10 transition-colors text-muted-foreground hover:text-[#f87171]" title="Eliminar">
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
                <Select
                  value={String(leg.expIdx ?? defaultExpIdx)}
                  onValueChange={(v) => updateLeg(idx, { expIdx: parseInt(v, 10) })}
                >
                  <SelectTrigger
                    data-testid={`leg-${idx}-expiry`}
                    className="w-full h-8 bg-background border-border rounded-lg px-2 text-xs font-mono text-foreground shadow-none focus:border-primary"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    {expirations.map((exp, ei) => (
                      <SelectItem key={exp.date || ei} value={String(ei)} className="text-xs font-mono focus:bg-primary/15 focus:text-primary data-[state=checked]:text-primary">
                        {exp.label || exp.date} · {exp.daysToExpiry}d
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Leg Config */}
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-2.5">
              {/* Strike */}
              <div>
                <label className="text-[8px] text-[#3a4f6e] font-semibold uppercase mb-0.5 block">Strike</label>
                <Select
                  value={String(leg.strikeIdx)}
                  onValueChange={(v) => updateLeg(idx, { strikeIdx: parseInt(v, 10) })}
                >
                  <SelectTrigger className="w-full h-8 bg-background border-border rounded-lg px-2 text-xs font-mono text-foreground shadow-none focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    {chainFor(leg.expIdx ?? defaultExpIdx).map((s, si) => (
                      <SelectItem key={s.strike} value={String(si)} className="text-xs font-mono focus:bg-primary/15 focus:text-primary data-[state=checked]:text-primary">
                        ${s.strike}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {t(flowKey(leg.action))}: ${(leg.premium * leg.quantity * 100).toFixed(0)}
              </span>
            </div>
          </div>
          );
        })}

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
          {/* Los cuatro botones, coloreados por lo que HACE cada combinación.
              Antes eran cuatro colores decorativos (verde, violeta, rojo,
              ámbar) que no seguían ninguna regla: "Buy Put" salía violeta y
              "Sell Put" ámbar, cuando la primera es bajista y la segunda
              alcista. */}
          {[
            { type: 'call', action: 'buy',  label: 'Buy Call' },
            { type: 'put',  action: 'buy',  label: 'Buy Put' },
            { type: 'call', action: 'sell', label: 'Sell Call' },
            { type: 'put',  action: 'sell', label: 'Sell Put' },
          ].map((b) => {
            const d = optionDirection(b.action, b.type);
            return (
              <button
                key={b.label}
                onClick={() => addLeg(b.type, b.action)}
                title={`${t(d.biasKey)} · ${t(d.riskKey)}`}
                data-testid={`add-leg-${b.action}-${b.type}`}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all hover:brightness-125 ${DIRECTION_CLASSES[d.tone].chip}`}
              >
                <Plus className="w-3 h-3" /> {b.label}
              </button>
            );
          })}
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
