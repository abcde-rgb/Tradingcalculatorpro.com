import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Calculator, Trash2 } from 'lucide-react';
import { useCalculatorStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';

const FIBO_RETRACEMENT = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIBO_EXTENSION = [0, 0.382, 0.618, 1, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236];

export function FibonacciCalculator() {
  const { saveCalculation } = useCalculatorStore();
  const { t } = useTranslation();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('fibonacci_calculator', {
    trend: 'uptrend',
    highPrice: '',
    lowPrice: ''
  });

  const { trend, highPrice, lowPrice } = persistedData;
  const [retracementLevels, setRetracementLevels] = useState(null);
  const [extensionLevels, setExtensionLevels] = useState(null);

  const setTrend     = (v) => setPersistedData(prev => ({ ...prev, trend: v }));
  const setHighPrice = (v) => setPersistedData(prev => ({ ...prev, highPrice: v }));
  const setLowPrice  = (v) => setPersistedData(prev => ({ ...prev, lowPrice: v }));

  const calculateRetracement = () => {
    const high = parseFloat(highPrice);
    const low = parseFloat(lowPrice);
    
    if (!high || !low || high <= low) return;

    const diff = high - low;
    
    let levels;
    if (trend === 'uptrend') {
      // En uptrend, retroceso desde el máximo hacia el mínimo
      levels = FIBO_RETRACEMENT.map(level => ({
        level: (level * 100).toFixed(1) + '%',
        price: (high - (diff * level)).toFixed(2)
      }));
    } else {
      // En downtrend, retroceso desde el mínimo hacia el máximo
      levels = FIBO_RETRACEMENT.map(level => ({
        level: (level * 100).toFixed(1) + '%',
        price: (low + (diff * level)).toFixed(2)
      }));
    }

    setRetracementLevels(levels);
    saveCalculation('fibonacci_retracement', { high, low, trend }, { levels });
  };

  const calculateExtension = () => {
    const high = parseFloat(highPrice);
    const low = parseFloat(lowPrice);
    
    if (!high || !low || high <= low) return;

    const diff = high - low;
    
    let levels;
    if (trend === 'uptrend') {
      // Extensiones hacia arriba desde el mínimo
      levels = FIBO_EXTENSION.map(level => ({
        level: (level * 100).toFixed(1) + '%',
        price: (low + (diff * level)).toFixed(2)
      }));
    } else {
      // Extensiones hacia abajo desde el máximo
      levels = FIBO_EXTENSION.map(level => ({
        level: (level * 100).toFixed(1) + '%',
        price: (high - (diff * level)).toFixed(2)
      }));
    }

    setExtensionLevels(levels);
    saveCalculation('fibonacci_extension', { high, low, trend }, { levels });
  };

  const getLevelColor = (levelStr) => {
    const level = parseFloat(levelStr);
    if (level === 0 || level === 100) return 'text-muted-foreground';
    if (level === 23.6) return 'text-blue-400';
    if (level === 38.2) return 'text-cyan-400';
    if (level === 50) return 'text-yellow-500';
    if (level === 61.8) return 'text-orange-500';
    if (level === 78.6) return 'text-red-400';
    if (level > 100) return 'text-purple-400';
    return 'text-primary';
  };

  return (
    <Card className="bg-card border-border" data-testid="fibonacci-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <span className="text-yellow-500 font-bold text-sm">φ</span>
          </div>
          {t('fibonacci')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend Selection */}
        <div className="flex gap-2">
          <Button
            variant={trend === 'uptrend' ? 'default' : 'outline'}
            onClick={() => setTrend('uptrend')}
            className="flex-1 gap-2"
            data-testid="uptrend-btn"
          >
            <TrendingUp className="w-4 h-4" /> {t('uptrend')}
          </Button>
          <Button
            variant={trend === 'downtrend' ? 'default' : 'outline'}
            onClick={() => setTrend('downtrend')}
            className="flex-1 gap-2"
            data-testid="downtrend-btn"
          >
            <TrendingDown className="w-4 h-4" /> {t('downtrend')}
          </Button>
        </div>

        {/* Price Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">{t('swingHigh')}</Label>
            <Input
              type="number"
              value={highPrice}
              onChange={(e) => setHighPrice(e.target.value)}
              placeholder="100000"
              step="any"
              data-testid="high-price-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t('swingLow')}</Label>
            <Input
              type="number"
              value={lowPrice}
              onChange={(e) => setLowPrice(e.target.value)}
              placeholder="90000"
              step="any"
              data-testid="low-price-input"
            />
          </div>
        </div>

        {/* Calculate Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={calculateRetracement} className="gap-2" data-testid="calc-retracement-btn">
            <Calculator className="w-4 h-4" /> {t('calcRetracements')}
          </Button>
          <Button onClick={calculateExtension} variant="secondary" className="gap-2" data-testid="calc-extension-btn">
            <Calculator className="w-4 h-4" /> {t('calcExtensions')}
          </Button>
        </div>

        {/* Results */}
        <Tabs defaultValue="retracement" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="retracement">{t('retracements')}</TabsTrigger>
            <TabsTrigger value="extension">{t('extensions')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="retracement" className="mt-4">
            {retracementLevels ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {trend === 'uptrend' 
                    ? t('supportLevels')
                    : t('resistanceLevels')}
                </p>
                {retracementLevels.map((item, idx) => (
                  <div 
                    key={`retracement-${item.level}`}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className={`font-medium ${getLevelColor(item.level)}`}>
                      {item.level}
                    </span>
                    <span className="font-mono font-semibold" data-testid={`ret-level-${idx}`}>
                      ${parseFloat(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('enterPricesRetracement')}
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="extension" className="mt-4">
            {extensionLevels ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  {trend === 'uptrend' 
                    ? t('targetsUp')
                    : t('targetsDown')}
                </p>
                {extensionLevels.map((item, idx) => (
                  <div 
                    key={`extension-${item.level}`}
                    className={`flex items-center justify-between p-2 rounded transition-colors ${
                      parseFloat(item.level) === 161.8 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <span className={`font-medium ${getLevelColor(item.level)}`}>
                      {item.level}
                      {parseFloat(item.level) === 161.8 && (
                        <span className="ml-2 text-xs text-primary">(Golden)</span>
                      )}
                    </span>
                    <span className="font-mono font-semibold" data-testid={`ext-level-${idx}`}>
                      ${parseFloat(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('enterPricesExtension')}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <Button onClick={clearPersistedData} variant="outline" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearData')}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <p className="font-medium mb-1">{t('keyLevels')}:</p>
          <ul className="space-y-1">
            <li><span className="text-yellow-500">50%</span> - {t('midLevelDesc')}</li>
            <li><span className="text-orange-500">61.8%</span> - {t('goldenRatio')}</li>
            <li><span className="text-purple-400">161.8%</span> - {t('goldenExtensionDesc')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
