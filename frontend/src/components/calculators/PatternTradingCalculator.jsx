import { useState } from 'react';
import { Hexagon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { usePersistedState } from '@/hooks/usePersistedState';
import { resolveSpec, positionMetrics, liquidationPrice } from '@/lib/instruments';
import { riskBudget, maxSizes, RISK_HARD_CAP_PCT } from '@/lib/deskMath';

// Un perpetuo genérico: apalancamiento sí, tamaño de contrato 1 (los precios
// que se escriben aquí son por unidad) y sin escalón. Sale del catálogo para
// que el modelo de liquidación y el de margen sean los mismos que en la mesa.
const SPEC = resolveSpec('crypto_perp', '');
const CONTRACT_SIZE = 1;

const nz = (v) => {
  const n = Number(v);
  return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n;
};

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

  // Quien tenga guardado el modo `fixed` —«toda la cuenta al maximo
  // apalancamiento», que no era un modo sino la averia— entra por importe.
  const modoRiesgo = slMode === 'riskPercent' ? 'riskPercent' : 'maxLoss';

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
    const balance = nz(accountBalance);
    const lev = nz(leverage);
    const entry = nz(activationPrice);
    const targetPct = nz(targetPercent);
    const sl = nz(slPriceFixed);

    // El presupuesto de riesgo, con el mismo tope duro que la mesa: por encima
    // del 10 % de la cuenta no hay tamaño, hay motivo.
    const budget = riskBudget({
      capital: balance,
      riskPct: nz(riskPercent),
      riskMoney: nz(maxLoss),
      mode: modoRiesgo === 'riskPercent' ? 'pct' : 'money',
    });
    if (budget.blocked) {
      setResult({ blocked: budget.reason, budget });
      return;
    }
    if (entry === null || sl === null || targetPct === null || entry === sl) {
      setResult({ blocked: 'incomplete' });
      return;
    }

    const targetPrice = direction === 'long'
      ? entry * (1 + targetPct / 100)
      : entry * (1 - targetPct / 100);

    // La liquidación sale del catálogo, con su margen de mantenimiento. Antes
    // era `entry × (1 − 1/lev × 0,9)`: un 0,9 sin explicación y sin liquidación
    // declarada como imposible cuando no hay apalancamiento.
    const liquidation = liquidationPrice(entry, direction, lev);

    // El tamaño sale del riesgo y de la distancia al stop, NUNCA del
    // apalancamiento. Ésta era la avería: `positionValue = balance × lev`
    // ignoraba el riesgo que pedías y anunciaba una pérdida máxima multiplicada
    // por la palanca — con 10 000 al 10×, pedir 100 $ de riesgo te decía 1 000.
    // El apalancamiento decide el MARGEN y dónde te liquidan, no cuánto pierdes.
    const stopDistance = Math.abs(entry - sl);
    const sizes = maxSizes({
      entry, stopDistance, contractSize: CONTRACT_SIZE, spec: SPEC,
      riskAmount: budget.amount, capital: balance, leverage: lev,
    });
    const quantity = sizes.quantity;
    if (quantity === null) {
      setResult({ blocked: 'too_small', budget, sizes });
      return;
    }

    const metrics = positionMetrics({
      entry, quantity, contractSize: CONTRACT_SIZE, leverage: lev, balance,
      side: direction, sl, tp: targetPrice, spec: SPEC,
    });

    // Beneficio y pérdida con la MISMA fórmula: distancia × cantidad × contrato.
    const targetProfit = Math.abs(targetPrice - entry) * quantity * CONTRACT_SIZE;
    const maxLossAtSL = stopDistance * quantity * CONTRACT_SIZE;
    const rrRatio = maxLossAtSL > 0 ? targetProfit / maxLossAtSL : null;

    const warnings = [];
    // Un stop más allá de la liquidación no es un stop: nunca llega a saltar.
    const slBeyondLiquidation = liquidation !== null && (direction === 'long'
      ? sl < liquidation
      : sl > liquidation);
    warnings.push(slBeyondLiquidation
      ? { type: 'danger', message: t('dangerSlLiquidation') }
      : { type: 'success', message: t('safeSlAlert') });

    if (rrRatio !== null && rrRatio < 1) {
      warnings.push({ type: 'warning', message: t('unfavorableRr') });
    } else if (rrRatio !== null && rrRatio >= 2) {
      warnings.push({ type: 'success', message: t('excellentRr') });
    }
    // Que el tamaño lo frene el margen o la exposición no es un detalle: es la
    // diferencia entre la posición que querías y la que la cuenta aguanta.
    if (sizes.binding !== 'risk') {
      warnings.push({ type: 'warning', message: t(`patternCapped_${sizes.binding}`) });
    }

    setResult({
      positionValue: metrics.notional,
      positionSize: quantity,
      marginUsed: metrics.marginUsed,
      exposure: metrics.exposureMultiple,
      liquidationPrice: liquidation,
      targetPrice,
      targetProfit,
      maxLossAtSL,
      slPrice: sl,
      breakoutPrice,
      rrRatio,
      binding: sizes.binding,
      budget,
      warnings,
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-long" />
          {t('patternTrading')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescPattern')}
        </CardDescription>
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
              className={`flex-1 ${direction === 'long' ? 'bg-primary text-primary-foreground' : ''}`}
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
            {/* El STOP siempre se pide. Antes, en dos de los tres modos, la
                herramienta se lo inventaba: cogía tu pérdida máxima como % de
                la cuenta y plantaba el stop a esa distancia del precio, que son
                dos cosas sin ninguna relación. El stop lo pone el patrón; lo
                que el riesgo decide es el TAMAÑO. */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('slPriceFixed')} (USD)
              </Label>
              <Input
                type="number"
                value={slPriceFixed}
                onChange={(e) => setSlPriceFixed(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="pattern-sl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('slMode')}
              </Label>
              <Select value={modoRiesgo} onValueChange={setSlMode}>
                <SelectTrigger className="bg-muted border-border" data-testid="pattern-riskmode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maxLoss">{t('maxLossMode')}</SelectItem>
                  <SelectItem value="riskPercent">{t('riskPercentMode')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoRiesgo === 'maxLoss' ? (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('maxLossAccept')} (USD)
                </Label>
                <Input
                  type="number"
                  value={maxLoss}
                  onChange={(e) => setMaxLoss(e.target.value)}
                  className="font-mono bg-muted border-border"
                  data-testid="pattern-maxloss"
                />
              </div>
            ) : (
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
                  max={RISK_HARD_CAP_PCT}
                  data-testid="pattern-riskpct"
                />
              </div>
            )}
          </div>
        </div>

        <Button onClick={calculate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {t('calculate')}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Warnings */}
            {result.blocked && (
              <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/50 text-destructive flex items-start gap-3"
                data-testid="pattern-blocked">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">
                  {result.blocked === 'over_cap'
                    ? t('deskRiskOverCapInline').replace('{cap}', String(RISK_HARD_CAP_PCT))
                    : t(`patternBlocked_${result.blocked}`)}
                </p>
              </div>
            )}

            {!result.blocked && result.warnings.map((warning, index) => (
              <div
                key={`alert-${index}`}
                className={`p-4 rounded-lg border flex items-start gap-3 ${
                  warning.type === 'danger'
                    ? 'bg-destructive/10 border-destructive/50 text-destructive'
                    : warning.type === 'success'
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-yellow-500/10 border-yellow-500/50 text-caution'
                }`}
              >
                {warning.type === 'danger' && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {warning.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                {warning.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-medium">{warning.message}</p>
              </div>
            ))}
            
            {/* Results Grid */}
            {!result.blocked && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-xl bg-muted/50 border border-border"
              data-testid="pattern-results">
              <div>
                <p className="text-xs text-muted-foreground">{t('positionValue')}</p>
                <p className="font-mono text-lg text-primary" data-testid="pattern-notional">${formatNumber(result.positionValue)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t('lotMargin')}: ${formatNumber(result.marginUsed)} · {formatNumber(result.exposure, 2)}× {t('lotOfAccount')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('positionSizeUnits')}</p>
                <p className="font-mono text-lg">{formatNumber(result.positionSize, 4)} {t('units')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('liquidationPrice')}</p>
                {/* Sin apalancamiento no hay liquidacion. Antes pintaba $0,00. */}
                <p className="font-mono text-lg text-destructive">
                  {result.liquidationPrice === null ? '—' : `$${formatNumber(result.liquidationPrice)}`}
                </p>
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
                <p className="font-mono text-lg text-destructive" data-testid="pattern-maxloss-result">-${formatNumber(result.maxLossAtSL)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('stopLossPrice')}</p>
                <p className="font-mono text-lg text-caution">${formatNumber(result.slPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('rrRatio')}</p>
                <p className={`font-mono text-lg ${result.rrRatio >= 2 ? 'text-primary' : result.rrRatio >= 1 ? 'text-accent' : 'text-destructive'}`}>
                  {result.rrRatio === null ? '—' : `${formatNumber(result.rrRatio, 2)}:1`}
                </p>
              </div>
            </div>
            )}
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
