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
const GreeksStrip = ({ greeks, dense = false, riskFree = null }) => {
  const { t } = useTranslation();

  const items = [
    { key: 'delta', symbol: 'Δ', label: 'Delta', value: greeks.delta, hint: t('optGreekDeltaHint'),
      color: greeks.delta >= 0 ? 'text-long' : 'text-short' },
    { key: 'gamma', symbol: 'Γ', label: 'Gamma', value: greeks.gamma, hint: t('optGreekGammaHint'),
      color: 'text-warn' },
    { key: 'theta', symbol: 'Θ', label: 'Theta', value: greeks.theta, hint: t('optGreekThetaHint'),
      color: greeks.theta >= 0 ? 'text-long' : 'text-short' },
    { key: 'vega', symbol: 'ν', label: 'Vega', value: greeks.vega, hint: t('optGreekVegaHint'),
      color: 'text-info' },
    { key: 'rho', symbol: 'ρ', label: 'Rho', value: greeks.rho, hint: t('optGreekRhoHint'),
      color: 'text-compare' },
  ];

  // Segundo orden. No comparten fila con las primarias a propósito: describen
  // cómo cambian las primarias, no la posición, y mezclarlas sugeriría que se
  // leen igual. Antes sólo existían como texto en el centro educativo.
  const secondOrder = [
    { key: 'vanna', symbol: 'Vanna', value: greeks.vanna, hint: t('optGreekVannaHint') },
    { key: 'charm', symbol: 'Charm', value: greeks.charm, hint: t('optGreekCharmHint') },
    { key: 'vomma', symbol: 'Vomma', value: greeks.vomma, hint: t('optGreekVommaHint') },
  ].filter((g) => Number.isFinite(g.value));

  return (
    <div className="space-y-2">
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

      {secondOrder.length > 0 && (
        <div className="grid grid-cols-3 gap-2" data-testid="greeks-second-order">
          {secondOrder.map(({ key, symbol, value, hint }) => (
            <div
              key={key}
              title={hint}
              data-testid={`greek-${key}`}
              className="bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5 flex items-baseline justify-between gap-2"
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {symbol}
              </span>
              <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                {value >= 0 ? '+' : ''}{value.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* De dónde sale la r con la que se han valorado estas griegas. Rho sin
          esto es un número sin unidad de referencia. */}
      {riskFree && (
        <p className="text-[10px] text-muted-foreground" data-testid="greeks-risk-free">
          r = {riskFree.ratePct.toFixed(2)}%
          {' · '}
          {riskFree.isLive ? t('optRiskFreeLive') : t('optRiskFreeFallback')}
          {riskFree.source ? ` (${riskFree.source})` : ''}
        </p>
      )}
    </div>
  );
};

export default GreeksStrip;
