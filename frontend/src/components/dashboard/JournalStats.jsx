import { useEffect, useState, useCallback } from 'react';
import { useDataVersion } from '@/lib/dataVersion';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Percent, BarChart3, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

export function JournalStats() {
  const { token } = useAuthStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API}/api/journal/stats`, { credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to fetch journal stats:', error);
      }
      // Silent error - stats component will show loading/empty state
    }
    setIsLoading(false);
  }, [token]);

  // Refresh whenever a trade is written anywhere (journal, import, the
  // "log to journal" button in Position Size...).
  const tradesVersion = useDataVersion('trades');
  useEffect(() => {
    fetchStats();
  }, [fetchStats, tradesVersion]);

  if (isLoading || !stats || stats.totalTrades === 0) {
    return null;
  }

  const statCards = [
    {
      label: t('winRate'),
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Percent,
      color: stats.winRate >= 50 ? 'text-long' : 'text-short',
      bgColor: stats.winRate >= 50 ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      label: t('pnlTotal'),
      value: `$${stats.totalPnl.toLocaleString()}`,
      icon: stats.totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalPnl >= 0 ? 'text-long' : 'text-short',
      bgColor: stats.totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    // profitFactor is null when there are no losses yet — gross profit over a
    // zero divisor is undefined, not zero. Rendered as ∞ (same convention as
    // the simulator) and coloured as the good case, because it IS the good
    // case: a run with no losers used to be shown 0.00, the worst reading.
    {
      label: t('profitFactor'),
      value: stats.profitFactor == null ? '∞' : stats.profitFactor.toFixed(2),
      icon: BarChart3,
      color: stats.profitFactor == null || stats.profitFactor >= 1.5 ? 'text-long' : stats.profitFactor >= 1 ? 'text-caution' : 'text-short',
      bgColor: stats.profitFactor == null || stats.profitFactor >= 1.5 ? 'bg-green-500/10' : stats.profitFactor >= 1 ? 'bg-yellow-500/10' : 'bg-red-500/10'
    },
    {
      label: t('expectancy'),
      value: `$${stats.expectancy.toFixed(2)}`,
      icon: Target,
      color: stats.expectancy > 0 ? 'text-long' : 'text-short',
      bgColor: stats.expectancy > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      label: t('maxDrawdown'),
      value: `$${stats.maxDrawdown.toFixed(0)}`,
      icon: AlertTriangle,
      color: 'text-warn',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: t('totalTrades'),
      value: stats.totalTrades,
      // Scratches are shown only when there are any: a trailing "/ 0BE" on
      // every account would be noise, but hiding them when they exist would
      // make W + L fail to add up to the total.
      sublabel: `${stats.wins}W / ${stats.losses}L`
        + (stats.breakeven ? ` / ${stats.breakeven}BE` : ''),
      icon: BarChart3,
      color: 'text-info',
      bgColor: 'bg-blue-500/10'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="journal-stats">
      {statCards.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`} data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                  {stat.value}
                </p>
                {stat.sublabel && (
                  <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
                )}
              </div>
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
