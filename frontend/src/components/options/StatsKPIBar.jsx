import React from 'react';
import {
  ArrowUpRight, DollarSign, Layers, Minus, Percent, Plus, Scale, Target,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const StatCard = ({ icon: Icon, label, value, color, title }) => (
  <div
    className="bg-card rounded-xl border border-border px-4 py-3 hover:border-primary/30 transition-colors"
    title={title}
  >
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
        {label}
      </span>
    </div>
    <span className={`text-lg font-bold font-mono ${color} block truncate`}>{value}</span>
  </div>
);

const LegPill = ({ leg, ticker }) => (
  <div
    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
      leg.action === 'buy'
        ? 'bg-[#22c55e]/8 border-[#22c55e]/25 text-[#4ade80]'
        : 'bg-[#ef4444]/8 border-[#ef4444]/25 text-[#f87171]'
    }`}
  >
    <span className="font-bold uppercase">{leg.action === 'buy' ? 'BUY' : 'SELL'}</span>
    <span>{leg.quantity}x</span>
    {leg.type === 'stock' ? (
      <span>{ticker}</span>
    ) : (
      <>
        <span className="font-mono">${leg.strike}</span>
        <span className="uppercase">{leg.type}</span>
        <span className="text-muted-foreground">@${leg.premium?.toFixed(2)}</span>
      </>
    )}
  </div>
);

const StatsKPIBar = ({
  stats,
  breakEvens,
  legs,
  ticker,
  currentExp,
  commission,
  onCommissionChange,
  contracts = 1,
  onContractsChange,
}) => {
  const { t } = useTranslation();
  const premium = parseFloat(stats.premium);

  const handleContractsDelta = (delta) => {
    if (!onContractsChange) return;
    const next = Math.max(1, Math.min(1000, (parseInt(contracts, 10) || 1) + delta));
    onContractsChange(next);
  };

  const handleContractsInput = (raw) => {
    if (!onContractsChange) return;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return onContractsChange(1);
    onContractsChange(Math.max(1, Math.min(1000, n)));
  };

  const handleContractsKey = (e) => {
    // Native number inputs already step by 1 on ArrowUp/Down,
    // but Shift+Arrow gives a faster ±10 jump.
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey) {
      e.preventDefault();
      handleContractsDelta(e.key === 'ArrowUp' ? 10 : -10);
    }
  };

  const PRESETS = [1, 5, 10, 25, 100];

  return (
    <>
      {/* 5 primary KPIs */}
      {/* Responsive: 5 KPI cards were unreadable crammed into one mobile row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatCard
          icon={TrendingUp}
          label={t('optMaxProfit')}
          value={stats.isMaxProfitUnlimited ? '∞' : `$${stats.maxProfit}`}
          color="text-[#22c55e]"
        />
        <StatCard
          icon={TrendingDown}
          label={t('optMaxLoss')}
          value={stats.isMaxLossUnlimited ? '−∞' : `$${stats.maxLoss}`}
          color="text-[#ef4444]"
        />
        <StatCard
          icon={Wallet}
          label={t('optCapitalReq')}
          value={stats.isMaxLossUnlimited ? `~$${stats.capitalRequired}` : `$${stats.capitalRequired}`}
          color="text-[#f59e0b]"
          title="Reg-T estimation of required capital/margin"
        />
        <StatCard
          icon={Percent}
          label={t('optProbProfit')}
          value={`${stats.pop || 0}%`}
          color="text-primary"
        />
        <StatCard
          icon={ArrowUpRight}
          label="ROI"
          value={`${stats.roi}%`}
          color="text-primary"
        />
      </div>

      {/* Secondary info row + legs pills */}
      <div className="flex items-center gap-3 flex-wrap bg-card/50 border border-border/60 rounded-lg px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Scale className="w-3 h-3 text-[#eab308]" />
          <span className="text-muted-foreground">{t('optRiskReward')}</span>
          <span className="font-mono font-bold text-[#eab308]">{stats.rr || '—'}</span>
        </div>
        <span className="text-muted-foreground/40">·</span>
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-[#a78bfa]" />
          <span className="text-muted-foreground">{t('optBreakEven')}</span>
          <span className="font-mono font-bold text-[#a78bfa]">
            {breakEvens.length > 0 ? `$${breakEvens[0]}` : '—'}
          </span>
        </div>
        <span className="text-muted-foreground/40">·</span>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t('optPremium')}</span>
          <span className={`font-mono font-bold ${premium >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            ${stats.premium}
          </span>
        </div>
        <span className="text-muted-foreground/40">·</span>
        <div className="flex items-center gap-1.5" title="Commission per contract (Reg-T standard ~$0.65)">
          <span className="text-muted-foreground text-[10px]">{t('optCommPerCtr')}</span>
          <input
            type="number" step="0.05" min={0} max={10}
            value={commission}
            onChange={(e) => onCommissionChange(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))}
            className="w-14 bg-muted border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary"
            data-testid="commission-input"
          />
          <span className="text-muted-foreground">(−${stats.commissions || '0.00'})</span>
        </div>
        <span className="text-muted-foreground/40">·</span>
        <div
          className="flex items-center gap-1"
          title={t('optContractsTooltip') || 'Number of contracts (1 contract = 100 shares)'}
        >
          <Layers className="w-3 h-3 text-[#38bdf8]" />
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
            {t('optContracts') || 'Contratos'}
          </span>
          <button
            type="button"
            onClick={() => handleContractsDelta(-1)}
            disabled={contracts <= 1}
            className="w-6 h-6 flex items-center justify-center rounded bg-muted border border-border hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="contracts-decrement"
            aria-label="Decrease contracts"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            value={contracts}
            onChange={(e) => handleContractsInput(e.target.value)}
            onKeyDown={handleContractsKey}
            className="w-12 bg-muted border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-center text-foreground focus:outline-none focus:border-primary"
            data-testid="contracts-input"
            title={t('optContractsKbdHint') || '↑/↓ = ±1 · Shift+↑/↓ = ±10'}
          />
          <button
            type="button"
            onClick={() => handleContractsDelta(1)}
            disabled={contracts >= 1000}
            className="w-6 h-6 flex items-center justify-center rounded bg-muted border border-border hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="contracts-increment"
            aria-label="Increase contracts"
          >
            <Plus className="w-3 h-3" />
          </button>
          {/* Quick presets — 1 / 5 / 10 / 25 / 100 */}
          <div className="flex items-center gap-0.5 ml-1" data-testid="contracts-presets">
            {PRESETS.map((n) => (
              <button
                key={`preset-${n}`}
                type="button"
                onClick={() => onContractsChange && onContractsChange(n)}
                className={`min-w-[22px] h-5 px-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                  contracts === n
                    ? 'bg-[#38bdf8]/20 border border-[#38bdf8]/50 text-[#38bdf8]'
                    : 'bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-[#38bdf8]/40'
                }`}
                data-testid={`contracts-preset-${n}`}
                aria-label={`Set contracts to ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <span className="text-muted-foreground/40 hidden md:inline">·</span>
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {legs.map((leg, i) => (
            <LegPill
              key={`leg-${leg.type}-${leg.action}-${leg.strike}-${i}`}
              leg={leg}
              ticker={ticker}
            />
          ))}
        </div>
        <span className="text-muted-foreground/60 ml-auto text-[10px] whitespace-nowrap">
          {currentExp?.fullLabel} · {currentExp?.daysToExpiry}d
        </span>
      </div>
    </>
  );
};

export default StatsKPIBar;
