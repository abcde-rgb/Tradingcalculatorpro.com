import React, { useEffect, useState } from 'react';
import { Activity, Zap, Timer, Wind, Compass } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GreeksDisplay = ({ greeks, legs, stock }) => {
  // El tipo libre de riesgo estaba escrito a mano ("5.25%") en la ficha de
  // datos de mercado, igual que lo estaba en el backend antes de `rates.py`.
  // Ahora se lee del mismo sitio que usa el pricing, con su procedencia.
  const [riskFree, setRiskFree] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/market/risk-free`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setRiskFree(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const items = [
    { key: 'delta', label: 'Delta (Δ)', value: greeks.delta, icon: Activity, color: greeks.delta >= 0 ? '#22c55e' : '#ef4444', desc: 'Price sensitivity per $1 move' },
    { key: 'gamma', label: 'Gamma (Γ)', value: greeks.gamma, icon: Zap, color: '#f59e0b', desc: 'Delta change rate' },
    { key: 'theta', label: 'Theta (Θ)', value: greeks.theta, icon: Timer, color: greeks.theta >= 0 ? '#22c55e' : '#ef4444', desc: 'Daily time decay' },
    { key: 'vega', label: 'Vega (ν)', value: greeks.vega, icon: Wind, color: '#3b82f6', desc: 'IV sensitivity per 1%' },
    { key: 'rho', label: 'Rho (ρ)', value: greeks.rho, icon: Compass, color: '#a78bfa', desc: 'Interest rate sensitivity' },
  ];

  const totalCost = legs.reduce((acc, leg) => {
    if (leg.type === 'stock') return acc + (leg.quantity || 100) * stock?.price;
    return acc + leg.premium * (leg.action === 'buy' ? 1 : -1) * (leg.quantity || 1) * 100;
  }, 0);

  return (
    <div>
      <h3 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-3">Greeks</h3>
      <div className="space-y-1.5">
        {items.map(({ key, label, value, icon: Icon, color, desc }) => (
          <div key={key} className="bg-muted rounded-lg border border-border p-2.5 hover:border-border transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color }}>
                {value >= 0 ? '+' : ''}{value.toFixed(4)}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{desc}</p>
          </div>
        ))}
      </div>

      {/* Position Cost */}
      <div className="mt-4">
        <h3 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Position</h3>
        <div className="bg-muted rounded-lg border border-border p-3 space-y-2">
          {legs.map((leg, i) => (
            <div key={`${leg.type}-${leg.action}-${leg.strike}-${i}`} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-[10px] ${leg.action === 'buy' ? 'text-long' : 'text-short'}`}>
                  {leg.action === 'buy' ? 'BUY' : 'SELL'}
                </span>
                <span className="text-muted-foreground">
                  {leg.quantity}x {leg.type === 'stock' ? `${stock?.symbol}` : `$${leg.strike} ${leg.type.toUpperCase()}`}
                </span>
              </div>
              {leg.type !== 'stock' && (
                <span className="font-mono text-muted-foreground">${leg.premium?.toFixed(2)}</span>
              )}
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-[10px] text-muted-foreground">Net Debit/Credit</span>
            <span className={`text-xs font-bold font-mono ${totalCost > 0 ? 'text-short' : 'text-long'}`}>
              {totalCost > 0 ? '-' : '+'}${Math.abs(totalCost).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Market Data */}
      {legs[0] && legs[0].type !== 'stock' && (
        <div className="mt-4">
          <h3 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2">Market Data</h3>
          <div className="bg-muted rounded-lg border border-border p-3 space-y-1.5">
            <Row label="Implied Vol" value={`${(legs[0].iv * 100).toFixed(1)}%`} />
            <Row label="Days to Exp" value={`${legs[0].daysToExpiry}d`} />
            <Row
              label="Risk-Free Rate"
              value={riskFree ? `${riskFree.ratePct.toFixed(2)}%` : '—'}
              title={riskFree ? riskFree.source : undefined}
            />
            <Row label="Model" value="Black-Scholes" />
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, title }) => (
  <div className="flex justify-between text-[11px]" title={title}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-muted-foreground">{value}</span>
  </div>
);

export default GreeksDisplay;
