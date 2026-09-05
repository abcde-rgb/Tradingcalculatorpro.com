import React from 'react';
import { GitCompare, Trophy } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Returns 'A', 'B', or 'tie' based on which side wins given the preference.
const compareNumeric = (a, b, prefer, aUnlim = false, bUnlim = false) => {
  if (aUnlim && !bUnlim) return prefer === 'higher' ? 'A' : 'B';
  if (!aUnlim && bUnlim) return prefer === 'higher' ? 'B' : 'A';
  const na = parseFloat(String(a).replace(/[^\d.-]/g, ''));
  const nb = parseFloat(String(b).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return 'tie';
  if (Math.abs(na - nb) < 0.005) return 'tie';
  if (prefer === 'higher') return na > nb ? 'A' : 'B';
  return na < nb ? 'A' : 'B';
};

const CompareCell = ({ label, a, b, winner, headers }) => {
  const { t } = useTranslation();
  if (headers) {
    return (
      <div className="col-span-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold pt-1">
        {t('metric_c8a9b1')}
      </div>
    );
  }
  return (
    <div className="col-span-1 bg-muted/40 rounded-md border border-border/50 p-1.5 min-w-0">
      <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5 truncate">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className={`flex items-center justify-between gap-1 ${winner === 'A' ? 'text-long' : 'text-muted-foreground'}`}>
          <span className="text-[9px] font-bold">A</span>
          <span className="font-mono text-[10px] truncate">{a}</span>
          {winner === 'A' && <Trophy className="w-2.5 h-2.5 flex-shrink-0" />}
        </div>
        <div className={`flex items-center justify-between gap-1 ${winner === 'B' ? 'text-compare' : 'text-muted-foreground'}`}>
          <span className="text-[9px] font-bold">B</span>
          <span className="font-mono text-[10px] truncate">{b}</span>
          {winner === 'B' && <Trophy className="w-2.5 h-2.5 flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
};

const CompareBar = ({
  strategies,
  categories,
  selectedStrategy,
  selectedStrategyB,
  onSelectStrategyB,
  stats,
  statsB,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="bg-gradient-to-r from-compare/5 to-transparent border border-compare/30 rounded-xl p-3"
      data-testid="compare-panel"
    >
      <div className="flex items-center gap-3 mb-2">
        <GitCompare className="w-4 h-4 text-compare" />
        <span className="text-xs font-bold text-compare uppercase tracking-wider">
          {t('comparing_1f0e14')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          <span className="text-long font-bold">A:</span> {t(selectedStrategy.name)}
          <span className="mx-2 text-muted-foreground">vs</span>
          <span className="text-compare font-bold">B:</span>
        </span>
        <Select
          value={selectedStrategyB.id}
          onValueChange={(v) => {
            const s = strategies.find((x) => x.id === v);
            if (s) onSelectStrategyB(s);
          }}
        >
          <SelectTrigger
            data-testid="strategy-b-select"
            className="w-auto min-w-[9rem] h-7 bg-muted border-compare/40 rounded-md px-2 text-xs text-foreground shadow-none focus:border-compare"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {categories.map((cat) => (
              <SelectGroup key={cat}>
                <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                  {cat}
                </SelectLabel>
                {strategies.filter((s) => s.category === cat).map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    disabled={s.id === selectedStrategy.id}
                    className="text-xs focus:bg-compare/15 focus:text-compare data-[state=checked]:text-compare"
                  >
                    {t(s.name)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mt-2 text-[11px] font-mono">
        <CompareCell label={t('metric_c8a9b1')} headers />
        <CompareCell
          label={t('maxBeneficio_c8a9b2')}
          a={stats.isMaxProfitUnlimited ? '∞' : `$${stats.maxProfit}`}
          b={statsB.isMaxProfitUnlimited ? '∞' : `$${statsB.maxProfit}`}
          winner={compareNumeric(stats.maxProfit, statsB.maxProfit, 'higher', stats.isMaxProfitUnlimited, statsB.isMaxProfitUnlimited)}
        />
        <CompareCell
          label={t('maxPerdida_c8a9b3')}
          a={stats.isMaxLossUnlimited ? '−∞' : `$${stats.maxLoss}`}
          b={statsB.isMaxLossUnlimited ? '−∞' : `$${statsB.maxLoss}`}
          winner={compareNumeric(stats.maxLoss, statsB.maxLoss, 'higher', stats.isMaxLossUnlimited, statsB.isMaxLossUnlimited)}
        />
        <CompareCell
          label={t('capitalReq_c8a9b4')}
          a={`$${stats.capitalRequired}`}
          b={`$${statsB.capitalRequired}`}
          winner={compareNumeric(stats.capitalRequired, statsB.capitalRequired, 'lower')}
        />
        <CompareCell
          label="POP %"
          a={`${stats.pop}%`}
          b={`${statsB.pop}%`}
          winner={compareNumeric(stats.pop, statsB.pop, 'higher')}
        />
        <CompareCell
          label="R/R"
          a={stats.rr}
          b={statsB.rr}
          winner={compareNumeric(stats.rr, statsB.rr, 'higher')}
        />
        {/* ROI es null cuando el beneficio máximo no está acotado. */}
        <CompareCell
          label="ROI %"
          a={stats.roi == null ? '—' : `${stats.roi}%`}
          b={statsB.roi == null ? '—' : `${statsB.roi}%`}
          winner={compareNumeric(stats.roi, statsB.roi, 'higher')}
        />
      </div>
    </div>
  );
};

export default CompareBar;
