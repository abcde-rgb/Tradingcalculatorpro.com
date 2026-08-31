import { useState, useEffect } from 'react';
import { useDataVersion } from '@/lib/dataVersion';
import EmptyState from '@/components/common/EmptyState';
import { History, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCalculatorStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

export const CalculationHistory = () => {
  const { isAuthenticated, token } = useAuthStore();
  const { history, fetchHistory } = useCalculatorStore();
  const { t } = useTranslation();

  const CALC_TYPES = {
    percentage: t('percentageRequired'),
    target_price: t('targetPrice'),
    leverage: t('leverage'),
    spot: t('spot')
  };

  // dataVersion: reload when a calculation is saved from ANY page, instead of
  // showing a stale list until the next full page load.
  const calcVersion = useDataVersion('calculations');
  useEffect(() => {
    if (isAuthenticated) fetchHistory();
  }, [isAuthenticated, fetchHistory, calcVersion]);

  const deleteCalculation = async (calcId) => {
    try {
      const res = await fetch(`${API}/api/calculations/${calcId}`, { credentials: 'include',
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Error deleting calculation');
      }
      fetchHistory();
      toast.success(t('success'));
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const exportToCSV = () => {
    const headers = ['Tipo', 'Fecha', 'Inputs', 'Resultados'];
    const rows = history.map(calc => [
      CALC_TYPES[calc.calculator_type] || calc.calculator_type,
      new Date(calc.created_at).toLocaleString(),
      JSON.stringify(calc.inputs),
      JSON.stringify(calc.results)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial_calculos.csv';
    a.click();
    toast.success(t('success'));
  };

  if (!isAuthenticated) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          {t('login')} para ver tu historial
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-info" />
          {t('calculationHistory')}
        </CardTitle>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportToCSV} data-testid="export-history-btn">
            <Download className="w-4 h-4 mr-2" /> {t('exportCsv')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map(calc => (
            <div key={calc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                    {CALC_TYPES[calc.calculator_type] || calc.calculator_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(calc.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-sm font-mono">
                  {calc.results?.percentage !== undefined && (
                    <span className={calc.results.percentage >= 0 ? 'text-primary' : 'text-destructive'}>
                      {calc.results.percentage >= 0 ? '+' : ''}{formatNumber(calc.results.percentage)}%
                    </span>
                  )}
                  {calc.results?.roi !== undefined && (
                    <span className={calc.results.roi >= 0 ? 'text-primary' : 'text-destructive'}>
                      ROI: {calc.results.roi >= 0 ? '+' : ''}{formatNumber(calc.results.roi)}%
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteCalculation(calc.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
          {history.length === 0 && (
            <EmptyState
              icon={History}
              title={t('noHistory')}
              hint={t('emptyHistoryHint')}
              to="/dashboard?tab=position"
              cta={t('emptyHistoryCta')}
              preview={
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                        {t('positionSize')}
                      </span>
                      <span className="text-xs text-muted-foreground">--/--/----</span>
                    </div>
                    <div className="mt-1 text-sm font-mono text-primary">+2.40%</div>
                  </div>
                </div>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
