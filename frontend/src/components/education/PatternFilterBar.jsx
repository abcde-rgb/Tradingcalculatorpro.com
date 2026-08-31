import React from 'react';
import { Search, X, Filter, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * PatternFilterBar — search input + type filter chips for pattern grids.
 *
 * @param {string}   query             - controlled search query value
 * @param {function} onQueryChange     - setter for the query value
 * @param {string}   typeFilter        - one of 'all' | 'bullish' | 'bearish' | 'neutral'
 * @param {function} onTypeFilterChange - setter for the type filter
 * @param {number}   totalShown        - visible items after filtering
 * @param {number}   totalAll          - total items in the dataset
 * @param {string}   testIdPrefix      - prefix for data-testid attributes (e.g. 'patterns', 'candles')
 * @param {boolean}  [neutralIcon]     - whether to show the AlertTriangle icon on the Neutral chip (default false)
 */
const PatternFilterBar = ({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  totalShown,
  totalAll,
  testIdPrefix,
  neutralIcon = false,
}) => {
  const { t } = useTranslation();

  const FILTER_OPTIONS = [
    { id: 'all',     label: t('patternFilterAll'),     color: 'text-foreground' },
    { id: 'bullish', label: t('patternFilterBullish'), color: 'text-long', icon: TrendingUp },
    { id: 'bearish', label: t('patternFilterBearish'), color: 'text-short', icon: TrendingDown },
    {
      id: 'neutral',
      label: t('patternFilterNeutral'),
      color: 'text-caution',
      icon: neutralIcon ? AlertTriangle : undefined,
    },
  ];

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-testid={`${testIdPrefix}-search-bar`}
    >
      {/* Search input */}
      <div className="relative flex items-center bg-muted border border-border rounded-md px-3 py-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('patternsSearchPlaceholder')}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
          spellCheck={false}
          data-testid={`${testIdPrefix}-search-input`}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="p-0.5 rounded hover:bg-border transition-colors"
            aria-label="Clear"
            data-testid={`${testIdPrefix}-search-clear`}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="flex items-center flex-wrap gap-1.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
        {FILTER_OPTIONS.map((opt) => {
          const Ic = opt.icon;
          const active = typeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onTypeFilterChange(opt.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                active
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
              }`}
              data-testid={`${testIdPrefix}-filter-${opt.id}`}
            >
              {Ic && <Ic className={`w-3 h-3 ${active ? 'text-primary' : opt.color}`} />}
              {opt.label}
            </button>
          );
        })}
        <span
          className="ml-auto text-[11px] text-muted-foreground"
          data-testid={`${testIdPrefix}-results-count`}
        >
          {totalShown} / {totalAll}{' '}
          {totalShown === 1 ? t('patternsResultSingular') : t('patternsResultPlural')}
        </span>
      </div>
    </div>
  );
};

export default PatternFilterBar;
