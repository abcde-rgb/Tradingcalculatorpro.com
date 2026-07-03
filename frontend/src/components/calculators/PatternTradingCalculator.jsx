import { useState } from 'react';
import { Hexagon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';

export const PatternTradingCalculator = () => {
  const { t } = useTranslation();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('pattern_trading_calculator', {
    accountBalance: 1000,
    leverage: 10,
    direction: 'long',
    activationPrice: 95000,
    breakoutPrice: 95500,
    targetPercent: 5,
    slMode: 'maxLoss',
    maxLoss: 50,
    slPriceFixed: 94000,
    riskPercent: 2
  });

  const {
    accountBalance, leverage, direction, activationPrice, breakoutPrice,
    targetPercent, slMode, maxLoss, slPriceFixed, riskPercent,
  } = persistedData;
  const [result, setResult] = useState(null);

  const setAccountBalance  = (v) => setPersistedData(prev => ({ ...prev, accountBalance: v }));
  const setLeverage        = (v) => setPersistedData(prev => ({ ...prev, leverage: v }));
  const setDirection       = (v) => setPersistedData(prev => ({ ...prev, direction: v }));
  const setActivationPrice = (v) => setPersistedData(prev => ({ ...prev, activationPrice: v }));
  const setBreakoutPrice   = (v) => setPersistedData(prev => ({ ...prev, breakoutPrice: v }));
  const setTargetPercent   = (v) => setPersistedData(prev => ({ ...prev, targetPercent: v }));
  const setSlMode          = (v) => setPersistedData(prev => ({ ...prev, slMode: v }));
  const setMaxLoss         = (v) => setPersistedData(prev => ({ ...prev, maxLoss: v }));
  const setSlPriceFixed    = (v) => setPersistedData(prev => ({ ...prev, slPriceFixed: v }));
  const setRiskPercent     = (v) => setPersistedData(prev => ({ ...prev, riskPercent: v }));

  const calculate = () => {
    const balance = parseFloat(accountBalance);
    const lev = parseFloat(leverage);
    const entry = parseFloat(activationPrice);
    const breakout = parseFloat(breakoutPrice);
    const targetPct = parseFloat(targetPercent);
    
    let slPrice;
    let positionSize;
    
    // Calcular precio objetivo
    const targetPrice = direction === 'long' 
      ? entry * (1 + targetPct / 100)
      : entry * (1 - targetPct / 100);
    
    // Calcular precio de liquidación
    const liquidationPrice = direction === 'long'
      ? entry * (1 - (1 / lev) * 0.9) // 90% del margen antes de liquidación
      : entry * (1 + (1 / lev) * 0.9);
    
    // Calcular SL y tamaño de posición según modo
    if (slMode === 'maxLoss') {
      const maxLossUSD = parseFloat(maxLoss);
      
      // Estimar SL basado en pérdida máxima
      // Para LONG: SL debe estar por debajo del precio de entrada
      // Para SHORT: SL debe estar por encima del precio de entrada
      const slDistance = (maxLossUSD / balance) * 100;
      
      slPrice = direction === 'long'
        ? entry * (1 - slDistance / 100)
        : entry * (1 + slDistance / 100);
      
      // Calcular position size que respeta el maxLoss
      const priceDiffPercent = Math.abs((slPrice - entry) / entry) * 100;
      positionSize = (maxLossUSD / priceDiffPercent) * lev;
      
    } else if (slMode === 'fixed') {
      slPrice = parseFloat(slPriceFixed);
      
      // Calcular position size basado en SL fijo
      const priceDiffPercent = Math.abs((slPrice - entry) / entry) * 100;
      const maxLossFromSL = (priceDiffPercent / lev) * balance;
      positionSize = balance * lev;
      
    } else { // riskPercent mode
      const riskPct = parseFloat(riskPercent);
      const riskAmount = balance * (riskPct / 100);
      
      // SL automático basado en % de riesgo
      const slDistance = (riskAmount / balance) * 100;
      slPrice = direction === 'long'
        ? entry * (1 - slDistance / 100)
        : entry * (1 + slDistance / 100);
      
      const priceDiffPercent = Math.abs((slPrice - entry) / entry) * 100;
      positionSize = (riskAmount / priceDiffPercent) * lev;
    }
    
    // Calcular valor de posición
    const positionValue = balance * lev;
    
    // Calcular ganancia objetivo
    const targetProfit = direction === 'long'
      ? (targetPrice - entry) * (positionValue / entry)
      : (entry - targetPrice) * (positionValue / entry);
    
    // Calcular pérdida máxima en SL
    const maxLossAtSL = direction === 'long'
      ? (entry - slPrice) * (positionValue / entry)
      : (slPrice - entry) * (positionValue / entry);
    
    // Calcular ratio R/R
    const rrRatio = Math.abs(targetProfit / maxLossAtSL);
    
    // Warnings
    const warnings = [];
    
    // Check if SL is beyond liquidation
    const slBeyondLiquidation = direction === 'long' 
      ? slPrice < liquidationPrice
      : slPrice > liquidationPrice;
    
    if (slBeyondLiquidation) {
      warnings.push({
        type: 'danger',
        message: t('dangerSlLiquidation')
      });
    } else {
      warnings.push({
        type: 'success',
        message: t('safeSlAlert')
      });
    }
    
    // Check if target is reachable
    const targetBeyondLiquidation = direction === 'long'
      ? targetPrice > liquidationPrice
      : targetPrice < liquidationPrice;
    
    if (targetBeyondLiquidation) {
      warnings.push({
        type: 'success',
        message: t('targetReachable')
      });
    } else {
      warnings.push({
        type: 'danger',
        message: t('targetUnreachable')
      });
    }
    
    // Check R/R ratio
    if (rrRatio < 1) {
      warnings.push({
        type: 'warning',
        message: t('unfavorableRr')
      });
    } else if (rrRatio >= 2) {
      warnings.push({
        type: 'success',
        message: t('excellentRr')
      });
    }
    
    setResult({
      positionValue,
      positionSize: positionValue / entry,
      liquidationPrice,
      targetPrice,
      targetProfit,
      maxLossAtSL,
      slPrice,
      breakoutPrice,
      rrRatio,
      warnings
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-emerald-500" />
          {t('patternTrading')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Position Configuration */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-4">{t('positionConfig')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('accountBalance')} (USD)
              </Label>
              <Input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                className="font-mono bg-muted border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('leverageLabel')}x
              </Label>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="font-mono bg-muted border-border"
                min="1"
                max="100"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button
              variant={direction === 'long' ? 'default' : 'outline'}
              onClick={() => setDirection('long')}
              className={`flex-1 ${direction === 'long' ? 'bg-primary text-black' : ''}`}
            >
              <TrendingUp className="w-4 h-4 mr-2" /> {t('long')}
            </Button>
            <Button
              variant={direction === 'short' ? 'default' : 'outline'}
              onClick={() => setDirection('short')}
              className={`flex-1 ${direction === 'short' ? 'bg-destructive text-white' : ''}`}
            >
              <TrendingDown className="w-4 h-4 mr-2" /> {t('short')}
            </Button>
          </div>
        </div>

        {/* Pattern & Target */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-4">{t('patternTarget')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('activationPrice')} (USD)
              </Label>
              <Input
                type="number"
                value={activationPrice}
                onChange={(e) => setActivationPrice(e.target.value)}
                className="font-mono bg-muted border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('breakoutPrice')} (USD)
              </Label>
              <Input
                type="number"
                value={breakoutPrice}
                onChange={(e) => setBreakoutPrice(e.target.value)}
                className="font-mono bg-muted border-border"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('targetPercent')}
              </Label>
              <Input
                type="number"
                value={targetPercent}
                onChange={(e) => setTargetPercent(e.target.value)}
                className="font-mono bg-muted border-border"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-4">{t('riskManagement')}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('slMode')}
              </Label>
              <Select value={slMode} onValueChange={setSlMode}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maxLoss">{t('maxLossMode')}</SelectItem>
                  <SelectItem value="fixed">{t('fixedSlMode')}</SelectItem>
                  <SelectItem value="riskPercent">{t('riskPercentMode')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {slMode === 'maxLoss' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('maxLossAccept')} (USD)
                </Label>
                <Input
                  type="number"
                  value={maxLoss}
                  onChange={(e) => setMaxLoss(e.target.value)}
                  className="font-mono bg-muted border-border"
                />
              </div>
            )}
            
            {slMode === 'fixed' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('slPriceFixed')} (USD)
                </Label>
                <Input
                  type="number"
                  value={slPriceFixed}
                  onChange={(e) => setSlPriceFixed(e.target.value)}
                  className="font-mono bg-muted border-border"
                />
              </div>
            )}
            
            {slMode === 'riskPercent' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('riskPercentAccount')}
                </Label>
                <Input
                  type="number"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="font-mono bg-muted border-border"
                  step="0.1"
                />
              </div>
            )}
          </div>
        </div>

        <Button onClick={calculate} className="w-full bg-primary text-black hover:bg-primary/90">
          {t('calculate')}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Warnings */}
            {result.warnings.map((warning, index) => (
              <div
                key={`alert-${index}`}
                className={`p-4 rounded-lg border flex items-start gap-3 ${
                  warning.type === 'danger'
                    ? 'bg-destructive/10 border-destructive/50 text-destructive'
                    : warning.type === 'success'
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'
                }`}
              >
                {warning.type === 'danger' && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {warning.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {warning.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-medium">{warning.message}</p>
              </div>
            ))}
            
            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-xl bg-muted/50 border border-border">
              <div>
                <p className="text-xs text-muted-foreground">{t('positionValue')}</p>
                <p className="font-mono text-lg text-primary">${formatNumber(result.positionValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('positionSizeUnits')}</p>
                <p className="font-mono text-lg">{formatNumber(result.positionSize, 4)} {t('units')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('liquidationPrice')}</p>
                <p className="font-mono text-lg text-destructive">${formatNumber(result.liquidationPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('targetPriceResult')}</p>
                <p className="font-mono text-lg text-accent">${formatNumber(result.targetPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('targetProfit')}</p>
                <p className="font-mono text-lg text-primary">+${formatNumber(result.targetProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('maxLossSl')}</p>
                <p className="font-mono text-lg text-destructive">-${formatNumber(result.maxLossAtSL)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('stopLossPrice')}</p>
                <p className="font-mono text-lg text-yellow-500">${formatNumber(result.slPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('rrRatio')}</p>
                <p className={`font-mono text-lg ${result.rrRatio >= 2 ? 'text-primary' : result.rrRatio >= 1 ? 'text-accent' : 'text-destructive'}`}>
                  {formatNumber(result.rrRatio, 2)}:1
                </p>
              </div>
            </div>
          </div>
        )}

        <Button onClick={clearPersistedData} variant="outline" className="w-full mt-4">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearData')}
        </Button>
      </CardContent>
    </Card>
  );
};
