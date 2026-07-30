import React from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Resumen compacto de las griegas, SIEMPRE visible.
 *
 * Antes las griegas estaban escondidas tras un botón de "mostrar/ocultar" junto
 * a Kelly y la cartera, como si fueran un extra. En una posición de opciones no
 * lo son: delta, theta y vega describen de qué vive y de qué muere la posición,
 * igual que el máximo beneficio o el break-even. Lo que sí es un extra —el
 * desglose por pata y la evolución temporal— sigue plegado más abajo.
 */
const GreeksStrip = ({ greeks, dense = false }) => {
  const { t } = useTranslation();

  const items = [
    { key: 'delta', symbol: 'Δ', label: 'Delta', value: greeks.delta, hint: t('optGreekDeltaHint'),
      color: greeks.delta >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
    { key: 'gamma', symbol: 'Γ', label: 'Gamma', value: greeks.gamma, hint: t('optGreekGammaHint'),
      color: 'text-[#f59e0b]' },
    { key: 'theta', symbol: 'Θ', label: 'Theta', value: greeks.theta, hint: t('optGreekThetaHint'),
      color: greeks.theta >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
    { key: 'vega', symbol: 'ν', label: 'Vega', value: greeks.vega, hint: t('optGreekVegaHint'),
      color: 'text-[#3b82f6]' },
    { key: 'rho', symbol: 'ρ', label: 'Rho', value: greeks.rho, hint: t('optGreekRhoHint'),
      color: 'text-[#a78bfa]' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" data-testid="greeks-strip">
      {items.map(({ key, symbol, label, value, hint, color }) => (
        <div
          key={key}
          title={hint}
          data-testid={`greek-${key}`}
          className="bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-baseline gap-1.5">
            <span className={`font-serif italic font-bold text-base leading-none ${color}`}>{symbol}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
          </div>
          <span className={`block text-sm font-bold font-mono tabular-nums mt-1 ${color}`}>
            {value >= 0 ? '+' : ''}{value.toFixed(4)}
          </span>
          {!dense && (
            <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{hint}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default GreeksStrip;
