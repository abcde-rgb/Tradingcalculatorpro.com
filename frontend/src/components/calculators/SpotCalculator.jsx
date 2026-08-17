import { useState } from 'react';
import { Wallet, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore, useCalculatorStore, usePriceStore } from '@/lib/store';
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

export const SpotCalculator = () => {
  const { prices } = usePriceStore();
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();
  const { t } = useTranslation();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('spot_calculator', {
    investment: 1000,
    buyPrice: 95000,
    sellPrice: '',
    asset: 'bitcoin',
  });

  const { investment, buyPrice, sellPrice, asset = 'bitcoin' } = persistedData;
  const [result, setResult] = useState(null);

  const setInvestment = (v) => setPersistedData(prev => ({ ...prev, investment: v }));
  const setBuyPrice   = (v) => setPersistedData(prev => ({ ...prev, buyPrice: v }));
  const setSellPrice  = (v) => setPersistedData(prev => ({ ...prev, sellPrice: v }));
  const setAsset      = (v) => setPersistedData(prev => ({ ...prev, asset: v }));

  // La etiqueta decía «BTC» aunque el desplegable estuviera en Ethereum: el
  // activo se elige y luego se ignoraba al pintarlo.
  const simbolo = String(asset || '').toUpperCase().slice(0, 8) || 'BTC';

  const handleAssetChange = (a) => {
    setAsset(a.id);
    const p = prices?.[a.id]?.usd;
    if (p) setBuyPrice(p);
  };

  const calculate = () => {
    if (!investment || !buyPrice || !sellPrice) return;
    
    const inv = parseFloat(investment);
    const buy = parseFloat(buyPrice);
    const sell = parseFloat(sellPrice);
    if (!buy || buy <= 0 || !inv || inv <= 0) return; // guard: avoid div-by-zero / negative
    
    const btcBought = inv / buy;
    const currentValue = btcBought * sell;
    const grossGain = currentValue - inv;
    const roi = (grossGain / inv) * 100;
    
    const res = {
      btcBought,
      currentValue,
      grossGain,
      roi
    };
    
    setResult(res);
  };

  const handleSave = async () => {
    if (result && isAuthenticated) {
      await saveCalculation('spot', { investment, buyPrice, sellPrice }, result);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-500" />
          {t('spot')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescSpot')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('asset')}</Label>
          <UniversalAssetSearch
            value={asset}
            onChange={handleAssetChange}
            testId="spot-asset-select"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('capital')} ($)</Label>
              <Input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="spot-investment"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('buy')} ($)</Label>
              <Input
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="spot-buy-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('sell')} ($)</Label>
              <Input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="font-mono bg-muted border-border"
                placeholder={t('targetPrice')}
                data-testid="spot-sell-price"
              />
            </div>
            
            <Button onClick={calculate} className="w-full bg-primary text-black hover:bg-primary/90" data-testid="spot-calculate-btn">
              {t('calculate')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{simbolo}</p>
                  <p className="font-mono text-2xl font-bold">{formatNumber(result.btcBought, 8)} {simbolo}</p>
                </div>
                
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('totalValue')}</p>
                  <p className="font-mono text-2xl font-bold">{formatCurrency(result.currentValue)}</p>
                </div>
                
                <div className={`p-4 rounded-xl border ${result.grossGain >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('profit')}</p>
                  <p className={`font-mono text-2xl font-bold ${result.grossGain >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(result.grossGain)}
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl border ${result.roi >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('roi')}</p>
                  <p className={`font-mono text-2xl font-bold ${result.roi >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentage(result.roi)}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={clearPersistedData} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearShort_p006')}
                  </Button>
                  
                  {isAuthenticated && (
                    <Button onClick={handleSave} variant="outline" className="flex-1">
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
