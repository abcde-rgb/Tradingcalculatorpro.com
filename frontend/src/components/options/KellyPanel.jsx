import React, { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Calculator, AlertTriangle, TrendingUp, Shield, Zap } from 'lucide-react';

/**
 * Kelly Criterion Sizing Panel
 * Formula: f* = p − (1 − p) / R
 *   p = probability of profit (0-1)
 *   R = |maxProfit / maxLoss| (risk-reward ratio)
 * Fractional Kelly (½, ¼) recommended due to estimation error.
 */
const KellyPanel = ({ pop, maxProfit, maxLoss, capitalPerContract, isMaxProfitUnlimited, isMaxLossUnlimited, accountBalance, onBalanceChange }) => {
  const { t } = useTranslation();
  const kelly = useMemo(() => {
    const p = Math.max(0, Math.min(1, (pop || 0) / 100));
    const mp = Number(maxProfit);
    const ml = Number(maxLoss);

    // Kelly asume dos resultados con importe conocido. Si alguno de los dos no
    // está acotado, la fórmula no describe esta posición: no hay número que
    // dar, y dar uno sería peor que no darlo.
    if (isMaxLossUnlimited || isMaxProfitUnlimited || maxLoss === null || maxProfit === null) {
      return {
        status: 'invalid',
        reason: isMaxProfitUnlimited && !isMaxLossUnlimited
          ? t('kellyUnboundedProfit')
          : t('kellyUnboundedRisk'),
        fullPct: 0,
      };
    }
    if (!Number.isFinite(mp) || !Number.isFinite(ml) || ml >= 0) {
      return { status: 'invalid', reason: t('sinPerdidaDefinida_89d5d7'), fullPct: 0 };
    }
    if (p <= 0 || p >= 1) {
      return { status: 'invalid', reason: 'POP no disponible', fullPct: 0 };
    }

    const R = Math.abs(mp / ml);
    const fullF = p - (1 - p) / R;

    if (fullF <= 0) {
      return { status: 'negative', reason: t('sinEdgeEstadisticoEvitarTrade_c81cb1'), fullPct: fullF * 100 };
    }

    return {
      status: 'ok',
      fullPct: fullF * 100,
      halfPct: fullF * 50,
      quarterPct: fullF * 25,
      R,
      p,
    };
  }, [pop, maxProfit, maxLoss, isMaxProfitUnlimited, isMaxLossUnlimited]);

  const suggestedContracts = (pct) => {
    if (!accountBalance || accountBalance <= 0 || !capitalPerContract || capitalPerContract <= 0) return 0;
    const capitalToRisk = accountBalance * (pct / 100);
    return Math.max(0, Math.floor(capitalToRisk / capitalPerContract));
  };

  return (
    <div className="p-4 border-b border-border" data-testid="kelly-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Kelly Criterion</label>
        </div>
        <a
          href="https://en.wikipedia.org/wiki/Kelly_criterion"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted-foreground hover:text-primary transition-colors"
          title={t('queEsKellyCriterion_47552a')}
        >
          ¿qué es?
        </a>
      </div>

      {/* Account Balance Input */}
      <div className="mb-3">
        <label className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 block">{t('saldoDeCuenta_5c8520')}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-mono">$</span>
          <input
            type="number"
            inputMode="decimal"
            step={100}
            min={0}
            value={accountBalance || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onBalanceChange(Number.isNaN(val) ? 0 : Math.max(0, val));
            }}
            placeholder="10000"
            className="w-full bg-muted border border-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:border-primary transition-colors"
            data-testid="kelly-balance-input"
          />
        </div>
      </div>

      {/* Kelly Status / Warning */}
      {kelly.status !== 'ok' ? (
        <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
          kelly.status === 'negative'
            ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#f87171]'
            : 'bg-muted border-border text-muted-foreground'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] leading-tight">
            <div className="font-semibold">
              {kelly.status === 'negative' ? 'Kelly negativo' : 'Kelly no aplicable'}
            </div>
            <div className="opacity-80 mt-0.5">{kelly.reason}</div>
          </div>
        </div>
      ) : (
        <>
          {/* Kelly Fractions */}
          <div className="space-y-1.5 mb-3">
            <KellyRow
              icon={Zap}
              label="Kelly Completo"
              pct={kelly.fullPct}
              contracts={suggestedContracts(kelly.fullPct)}
              color="text-[#f59e0b]"
              subtitle="Agresivo"
              tid="kelly-full"
            />
            <KellyRow
              icon={TrendingUp}
              label="½ Kelly"
              pct={kelly.halfPct}
              contracts={suggestedContracts(kelly.halfPct)}
              color="text-primary"
              subtitle={t('recomendado_32ab69')}
              tid="kelly-half"
              highlighted
            />
            <KellyRow
              icon={Shield}
              label="¼ Kelly"
              pct={kelly.quarterPct}
              contracts={suggestedContracts(kelly.quarterPct)}
              color="text-[#22c55e]"
              subtitle="Conservador"
              tid="kelly-quarter"
            />
          </div>

          {/* Edge info */}
          <div className="bg-background/60 rounded-md border border-border/50 p-2 space-y-1">
            <InfoRow label="POP" value={`${(kelly.p * 100).toFixed(1)}%`} />
            <InfoRow label="R/R Ratio" value={kelly.R.toFixed(2)} />
            <InfoRow label="Capital / contrato" value={`$${capitalPerContract.toFixed(0)}`} />
          </div>
        </>
      )}

      <p className="text-[9px] text-muted-foreground mt-2 leading-snug">
        ½ Kelly reduce riesgo de ruina vs Kelly completo por errores de estimación del POP.
      </p>
    </div>
  );
};

const KellyRow = ({ icon: Icon, label, pct, contracts, color, subtitle, highlighted, tid }) => (
  <div className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-colors ${
    highlighted ? 'bg-primary/5 border-primary/30' : 'bg-muted border-border'
  }`} data-testid={tid}>
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={`w-3 h-3 flex-shrink-0 ${color}`} />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-foreground truncate">{label}</div>
        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{subtitle}</div>
      </div>
    </div>
    <div className="text-right">
      <div className={`text-xs font-bold font-mono ${color}`}>{pct.toFixed(1)}%</div>
      <div className="text-[9px] text-muted-foreground font-mono">{contracts} ctr.</div>
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between text-[10px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-foreground">{value}</span>
  </div>
);

export default KellyPanel;
