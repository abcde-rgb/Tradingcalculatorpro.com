import { useState } from 'react';
import { Gauge, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuthStore, useCalculatorStore, usePriceStore } from '@/lib/store';
import { formatNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { liquidationPrice } from '@/lib/instruments';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

export const LeverageCalculator = () => {
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();
  const { prices } = usePriceStore();
  const { t } = useTranslation();
  
  const [state, setState, clearState] = usePersistedState('leverage_calculator', {
    capital: 1000,
    entryPrice: 95000,
    exitPrice: 96000,
    leverage: 10,
    isLong: true,
    asset: 'bitcoin',
  });

  const { capital, entryPrice, exitPrice, leverage, isLong, asset = 'bitcoin' } = state;
  const [result, setResult] = useState(null);

  const setCapital = (v) => setState(prev => ({ ...prev, capital: v }));
  const setEntryPrice = (v) => setState(prev => ({ ...prev, entryPrice: v }));
  const setExitPrice = (v) => setState(prev => ({ ...prev, exitPrice: v }));
  const setLeverage = (v) => setState(prev => ({ ...prev, leverage: Array.isArray(v) ? v[0] : v }));
  const setIsLong = (v) => setState(prev => ({ ...prev, isLong: v }));
  const setAsset = (v) => setState(prev => ({ ...prev, asset: v }));

  const handleAssetChange = (a) => {
    setAsset(a.id);
    const p = prices?.[a.id]?.usd;
    if (p) setEntryPrice(p);
  };

  const calculate = () => {
    const cap = parseFloat(capital);
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const lev = leverage;
    if (!cap || cap <= 0 || !entry || entry <= 0 || !exit || exit <= 0 || !lev || lev <= 0) return;

    // Calcular movimiento del precio
    const priceMovement = ((exit - entry) / entry) * 100;

    // Calcular P&L
    // En LONG: ganas si precio sube (exit > entry)
    // En SHORT: ganas si precio baja (exit < entry)
    let pnl;
    if (isLong) {
      pnl = cap * (priceMovement / 100) * lev;
    } else {
      pnl = cap * (-priceMovement / 100) * lev;
    }
    
    const roi = (pnl / cap) * 100;
    const finalCapital = cap + pnl;
    const buyingPower = cap * lev;
    
    // Precio de liquidación, del catálogo.
    //
    // Era `entry × (1 ∓ 1/lev)`: ignoraba el margen de mantenimiento, así que
    // se pasaba de largo un 0,50 % del precio SIEMPRE en la misma dirección —
    // te decía que aguantabas más de lo que aguantas. Y como el deslizador
    // llega hasta 1×, a esa altura daba `entry × 0` = **0,00 $**: al contado no
    // hay liquidación, y un cero ahí no es un precio, es una respuesta falsa.
    const liq = liquidationPrice(entry, isLong ? 'long' : 'short', lev);
    const liquidationPercent = liq === null ? null : Math.abs((liq - entry) / entry) * 100;
    
    const res = {
      buyingPower,
      pnl,
      roi,
      finalCapital,
      priceMovement,
      liquidationPrice: liq,
      liquidationPercent,
      leverage: lev,
      isProfit: pnl >= 0
    };
    
    setResult(res);
  };

  const handleSave = async () => {
    if (result && isAuthenticated) {
      await saveCalculation('leverage', { capital, entryPrice, exitPrice, leverage, isLong }, result);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-caution" />
          {t('leverage')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescLeverage')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('asset')}</Label>
          <UniversalAssetSearch
            value={asset}
            onChange={handleAssetChange}
            testId="leverage-asset-select"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('capital')} ($)</Label>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="leverage-capital"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('entryPrice')} ($)</Label>
                <Input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="font-mono bg-muted border-border"
                  data-testid="leverage-entry"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('exitPrice')} ($)</Label>
                <Input
                  type="number"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="font-mono bg-muted border-border"
                  data-testid="leverage-exit"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('leverage')}</Label>
                <span className="font-mono text-lg font-bold text-caution">{leverage}x</span>
              </div>
              <Slider
                value={[leverage]}
                onValueChange={setLeverage}
                min={1}
                max={125}
                step={1}
                className="py-4"
                data-testid="leverage-slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
                <span>125x</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={isLong ? 'default' : 'outline'}
                onClick={() => setIsLong(true)}
                className={`flex-1 ${isLong ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {t('long')}
              </Button>
              <Button
                variant={!isLong ? 'default' : 'outline'}
                onClick={() => setIsLong(false)}
                className={`flex-1 ${!isLong ? 'bg-destructive text-white' : ''}`}
              >
                SHORT
              </Button>
            </div>
            
            <Button onClick={calculate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="leverage-calculate-btn">
              {t('simular_lev001')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('positionLabel_lev002')}: {isLong ? 'LONG' : 'SHORT'}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('movPriceLabel_lev003')}: <span className={result.priceMovement >= 0 ? 'text-primary' : 'text-destructive'}>
                      {formatPercentage(result.priceMovement)}
                    </span>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('poderDeCompra_b329b3')}</p>
                    <p className="font-mono text-xl font-bold">{formatCurrency(result.buyingPower)}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${result.isProfit ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">P&L</p>
                    <p className={`font-mono text-xl font-bold ${result.isProfit ? 'text-primary' : 'text-destructive'}`}>
                      {result.pnl >= 0 ? '+' : ''}{formatCurrency(result.pnl)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${result.isProfit ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">ROE</p>
                    <p className={`font-mono text-xl font-bold ${result.isProfit ? 'text-primary' : 'text-destructive'}`}>
                      {formatPercentage(result.roi)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('finalCapital_lev004')}</p>
                    <p className="font-mono text-xl font-bold">{formatCurrency(result.finalCapital)}</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs uppercase tracking-wider text-destructive mb-1">{t('precioDeLiquidacion_df5984')}</p>
                  {/* Sin apalancamiento no hay liquidación: raya, no cero. */}
                  <p className="font-mono text-lg text-destructive" data-testid="lev-liquidation">
                    {result.liquidationPrice === null ? '—' : `$${formatNumber(result.liquidationPrice)}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.liquidationPrice === null
                      ? t('levNoLiquidation')
                      : t('atPercentOfEntry_lev005').replace('{pct}', formatNumber(result.liquidationPercent))}
                  </p>
                  {/* Es una estimación y se dice, como en la mesa: no lleva
                      comisiones, ni funding acumulado, ni aportes. */}
                  {result.liquidationPrice !== null && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug" data-testid="lev-liq-disclaimer">
                      {t('levLiquidationEstimate')}
                    </p>
                  )}
                </div>
                
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs">
                  <p className="text-accent font-semibold">{t('explicacion_b7856e')}</p>
                  <p className="text-muted-foreground mt-1">
                    {(isLong ? t('longExplanation_lev006') : t('shortExplanation_lev007'))
                      .replace(/\{lev\}/g, leverage)
                      .replace('{dir}', result.priceMovement >= 0 ? t('goesUp_p011') : t('goesDown_p012'))
                      .replace('{pct}', formatNumber(Math.abs(result.priceMovement)))
                      .replace('{res}', result.isProfit ? t('ganancia_c67565') : t('perdida_f5eb7c'))
                      .replace('{roi}', formatNumber(Math.abs(result.roi)))}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={clearState} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearShort_p006')}
                  </Button>
                  
                  {isAuthenticated && (
                    <Button onClick={handleSave} variant="outline" className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> {t('save_lev008')}
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
