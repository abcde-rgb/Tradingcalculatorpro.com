import { useState } from 'react';
import { Target, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore, useCalculatorStore, usePriceStore } from '@/lib/store';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { CRYPTO_LIST } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

export const TargetPriceCalculator = () => {
  const { prices } = usePriceStore();
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();
  const { t } = useTranslation();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('target_price_calculator', {
    symbol: 'bitcoin',
    currentPrice: 95000,
    percentage: ''
  });

  const { symbol, currentPrice, percentage } = persistedData;
  const [result, setResult] = useState(null);

  const setSymbol       = (v) => setPersistedData(prev => ({ ...prev, symbol: v }));
  const setCurrentPrice = (v) => setPersistedData(prev => ({ ...prev, currentPrice: v }));
  const setPercentage   = (v) => setPersistedData(prev => ({ ...prev, percentage: v }));

  const handleSymbolChange = (newSymbol) => {
    setSymbol(newSymbol);
    const price = prices?.[newSymbol]?.usd || 0;
    if (price > 0) setCurrentPrice(price);
  };

  const handleAssetChange = (asset) => handleSymbolChange(asset.id);

  const calculate = () => {
    if (!currentPrice || !percentage) return;
    
    const current = parseFloat(currentPrice);
    const pct = parseFloat(percentage);
    if (!current || current <= 0 || isNaN(pct)) return;
    const targetUp = current * (1 + pct / 100);
    const targetDown = current * (1 - pct / 100);
    
    const res = {
      targetUp,
      targetDown,
      differenceUp: targetUp - current,
      differenceDown: current - targetDown
    };
    
    setResult(res);
  };

  const handleSave = async () => {
    if (result && isAuthenticated) {
      await saveCalculation('target_price', { symbol, currentPrice, percentage }, result);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          {t('targetPriceCalc')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescTarget')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('asset')}</Label>
              <UniversalAssetSearch
                value={symbol}
                onChange={handleAssetChange}
                testId="target-symbol-select"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentPrice')} ($)</Label>
              <Input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="target-current-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('porcentajeDeMovimiento_a3a404')}</Label>
              <Input
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="font-mono bg-muted border-border"
                placeholder="Ej: 5"
                data-testid="target-percentage"
              />
            </div>
            
            <Button onClick={calculate} className="w-full bg-primary text-black hover:bg-primary/90" data-testid="target-calculate-btn">
              {t('calculate')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-xs uppercase tracking-wider text-primary mb-2">{t('bullish')} (+{percentage}%)</p>
                  <p className="font-mono text-2xl font-bold text-primary">
                    {formatCurrency(result.targetUp)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    +${formatNumber(result.differenceUp)}
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs uppercase tracking-wider text-destructive mb-2">{t('bearish')} (-{percentage}%)</p>
                  <p className="font-mono text-2xl font-bold text-destructive">
                    {formatCurrency(result.targetDown)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    -${formatNumber(result.differenceDown)}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={clearPersistedData} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearShort_p006')}
                  </Button>
                  
                  {isAuthenticated && (
                    <Button onClick={handleSave} variant="outline" className="flex-1" data-testid="save-target-btn">
                      <Save className="w-4 h-4 mr-2" /> {t('save')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
