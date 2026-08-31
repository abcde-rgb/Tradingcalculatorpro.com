import React from 'react';
import {
  ArrowUpRight, DollarSign, Percent, Scale, Target,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Paso 2 del panel: el RESULTADO de la posición configurada arriba.
 *
 * Antes este componente mezclaba tres cosas distintas en el mismo bloque: las
 * métricas (lo que se lee), el input de comisión y el selector de contratos (lo
 * que se toca) y la lista de patas (lo que se edita en otro sitio), todo en una
 * fila que se envolvía en cuatro líneas y donde no se distinguía qué era dato y
 * qué era control.
 *
 * Ahora sólo muestra números. Los contratos se eligen en `PositionSetupBar`, la
 * comisión en la sección de costes, y las patas se ven y se editan en el editor
 * de patas. Un bloque, un propósito.
 */

const StatCard = ({ icon: Icon, label, value, color, title, testid }) => (
  <div
    className="bg-card rounded-xl border border-border px-3.5 py-3 hover:border-primary/30 transition-colors"
    title={title}
    data-testid={testid}
  >
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
        {label}
      </span>
    </div>
    <span className={`text-lg font-bold font-mono tabular-nums ${color} block truncate`}>{value}</span>
  </div>
);

const Fact = ({ icon: Icon, label, value, color = 'text-foreground', testid }) => (
  <div className="flex items-center gap-1.5 min-w-0" data-testid={testid}>
    <Icon className={`w-3 h-3 flex-shrink-0 ${color}`} />
    <span className="text-muted-foreground whitespace-nowrap">{label}</span>
    <span className={`font-mono font-bold tabular-nums truncate ${color}`}>{value}</span>
  </div>
);

const StatsKPIBar = ({ stats, breakEvens, currentExp }) => {
  const { t } = useTranslation();
  const premium = parseFloat(stats.premium);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard
          icon={TrendingUp}
          label={t('optMaxProfit')}
          value={stats.isMaxProfitUnlimited ? '∞' : `$${stats.maxProfit}`}
          color="text-long"
          testid="kpi-max-profit"
        />
        <StatCard
          icon={TrendingDown}
          label={t('optMaxLoss')}
          value={stats.isMaxLossUnlimited ? '−∞' : `$${stats.maxLoss}`}
          color="text-short"
          testid="kpi-max-loss"
        />
        <StatCard
          icon={Wallet}
          label={t('optCapitalReq')}
          value={stats.isMaxLossUnlimited ? `~$${stats.capitalRequired}` : `$${stats.capitalRequired}`}
          color="text-warn"
          title={t('optCapitalReqHint')}
          testid="kpi-capital"
        />
        <StatCard
          icon={Percent}
          label={t('optProbProfit')}
          value={`${stats.pop || 0}%`}
          color="text-primary"
          testid="kpi-pop"
        />
        {/* Sin beneficio máximo acotado no hay ROI: es indefinido, no un número. */}
        <StatCard
          icon={ArrowUpRight}
          label="ROI"
          value={stats.roi === null || stats.roi === undefined ? '—' : `${stats.roi}%`}
          color="text-primary"
          testid="kpi-roi"
        />
      </div>

      {/* Datos derivados. Una sola línea, sin controles, sin envolverse. */}
      <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap bg-card/50 border border-border/60 rounded-lg px-3 py-2 text-[11px]">
        <Fact icon={Scale} label={t('optRiskReward')} value={stats.rr || '—'} color="text-caution" testid="fact-rr" />
        <Fact
          icon={Target}
          label={t('optBreakEven')}
          value={breakEvens.length > 0 ? breakEvens.map((b) => `$${b}`).join(' · ') : '—'}
          color="text-compare"
          testid="fact-be"
        />
        <Fact
          icon={DollarSign}
          label={t('optPremium')}
          value={`$${stats.premium}`}
          color={premium >= 0 ? 'text-long' : 'text-short'}
          testid="fact-premium"
        />
        <Fact
          icon={DollarSign}
          label={t('optCommissions')}
          value={`−$${stats.commissions || '0.00'}`}
          color="text-muted-foreground"
          testid="fact-commissions"
        />
        {currentExp?.fullLabel && (
          <span className="text-muted-foreground ml-auto whitespace-nowrap tabular-nums">
            {currentExp.fullLabel} · {currentExp.daysToExpiry}d
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsKPIBar;
