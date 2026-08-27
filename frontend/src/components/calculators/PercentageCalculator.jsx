import { useState } from 'react';
import { TrendingUp, TrendingDown, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore, useCalculatorStore, usePriceStore } from '@/lib/store';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { CRYPTO_LIST } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

export const PercentageCalculator = () => {
  const { prices } = usePriceStore();
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();
  const { t } = useTranslation();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('percentage_calculator', {
    symbol: 'bitcoin',
    currentPrice: prices?.bitcoin?.usd || 95000,
    targetPrice: '',
    isLong: true
  });

  const { symbol, currentPrice, targetPrice, isLong } = persistedData;
  const [result, setResult] = useState(null);

  const setSymbol       = (v) => setPersistedData(prev => ({ ...prev, symbol: v }));
  const setCurrentPrice = (v) => setPersistedData(prev => ({ ...prev, currentPrice: v }));
  const setTargetPrice  = (v) => setPersistedData(prev => ({ ...prev, targetPrice: v }));
  const setIsLong       = (v) => setPersistedData(prev => ({ ...prev, isLong: v }));

  // Actualizar precio cuando cambia el símbolo
  const handleSymbolChange = (newSymbol) => {
    setSymbol(newSymbol);
    const price = prices?.[newSymbol]?.usd || 0;
    if (price > 0) setCurrentPrice(price);
  };

  const handleAssetChange = (asset) => {
    handleSymbolChange(asset.id);
  };

  const calculate = () => {
    if (!currentPrice || !targetPrice) return;
    
    const current = parseFloat(currentPrice);
    const target = parseFloat(targetPrice);
    if (!current || current <= 0) return; // guard against div-by-zero
    const priceMovement = ((target - current) / current) * 100;
    
    let isProfit;
    let effectiveMovement;
    
    if (isLong) {
      isProfit = target > current;
      effectiveMovement = priceMovement;
    } else {
      isProfit = target < current;
      effectiveMovement = -priceMovement;
    }
    
    const res = {
      priceMovement: priceMovement,
      effectiveMovement: effectiveMovement,
      direction: target > current ? t('directionBullish_p007') : t('directionBearish_p008'),
      isProfit: isProfit,
      difference: target - current,
      position: isLong ? 'LONG' : 'SHORT'
    };
    
    setResult(res);
  };

  const handleSave = async () => {
    if (result && isAuthenticated) {
      await saveCalculation('percentage', { symbol, currentPrice, targetPrice, isLong }, result);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('percentageRequired')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescPercentage')}
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
                testId="symbol-select"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentPrice')} ($)</Label>
              <Input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="current-price-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('targetPrice')} ($)</Label>
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="target-price-input"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={isLong ? 'default' : 'outline'}
                onClick={() => setIsLong(true)}
                className={`flex-1 ${isLong ? 'bg-primary text-primary-foreground' : ''}`}
                data-testid="long-btn"
              >
                <TrendingUp className="w-4 h-4 mr-2" /> {t('long')}
              </Button>
              <Button
                variant={!isLong ? 'default' : 'outline'}
                onClick={() => setIsLong(false)}
                className={`flex-1 ${!isLong ? 'bg-destructive text-white' : ''}`}
                data-testid="short-btn"
              >
                <TrendingDown className="w-4 h-4 mr-2" /> {t('short')}
              </Button>
            </div>
            
            <Button onClick={calculate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="calculate-btn">
              {t('calculate')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <div className="p-6 rounded-xl bg-muted/50 border border-border space-y-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('position')}: {result.position}</p>
                  <p className="text-xs text-muted-foreground mb-2">{t('priceMovementLabel_p004')}: {result.direction}</p>
                  <p className={`font-mono text-4xl font-bold ${result.isProfit ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentage(result.effectiveMovement)}
                  </p>
                  <p className={`text-sm mt-2 ${result.isProfit ? 'text-primary' : 'text-destructive'}`}>
                    {result.isProfit ? `✓ ${t('profit').toUpperCase()}` : `✗ ${t('loss').toUpperCase()}`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('differenceDollar_p005')}</p>
                    <p className={`font-mono text-lg ${result.difference >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {result.difference >= 0 ? '+' : ''}${formatNumber(result.difference)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('movPrecio_67b809')}</p>
                    <p className={`font-mono text-lg ${result.priceMovement >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatPercentage(result.priceMovement)}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs">
                  <p className="text-accent font-semibold">{t('description')}:</p>
                  <p className="text-muted-foreground mt-1">
                    {(isLong ? t('percLongDesc_p009') : t('percShortDesc_p010'))
                      .replace('{dir}', result.priceMovement >= 0 ? t('goesUp_p011') : t('goesDown_p012'))
                      .replace('{pct}', formatNumber(Math.abs(result.priceMovement)))
                      .replace('{result}', result.isProfit ? t('youWin_p013') : t('youLose_p014'))}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={clearPersistedData} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearShort_p006')}
                  </Button>
                  
                  {isAuthenticated && (
                    <Button onClick={handleSave} variant="outline" className="flex-1" data-testid="save-calc-btn">
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
