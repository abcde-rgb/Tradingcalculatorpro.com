import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LabelWithHelp } from '@/components/common/FieldHelp';
import { Calculator, Save, AlertTriangle, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { createTrade } from '@/services/performanceApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuthStore, useCalculatorStore, usePriceStore } from '@/lib/store';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { usePersistedState } from '@/hooks/usePersistedState';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

export const PositionSizeCalculator = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { saveCalculation } = useCalculatorStore();
  const { prices } = usePriceStore();
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('position_size_calculator', {
    accountBalance: 10000,
    riskPercent: 2,
    entryPrice: 95000,
    stopLoss: 94000,
    asset: 'bitcoin',
  });

  const { accountBalance, riskPercent, entryPrice, stopLoss, asset = 'bitcoin' } = persistedData;
  const [result, setResult] = useState(null);

  const setAccountBalance = (v) => setPersistedData(prev => ({ ...prev, accountBalance: v }));
  const setRiskPercent    = (v) => setPersistedData(prev => ({ ...prev, riskPercent: Array.isArray(v) ? v[0] : v }));
  const setEntryPrice     = (v) => setPersistedData(prev => ({ ...prev, entryPrice: v }));
  const setStopLoss       = (v) => setPersistedData(prev => ({ ...prev, stopLoss: v }));
  const setAsset          = (v) => setPersistedData(prev => ({ ...prev, asset: v }));

  const handleAssetChange = (a) => {
    // Keep the ticker too so "send to journal" can record a proper symbol.
    setPersistedData(prev => ({ ...prev, asset: a.id, assetSymbol: a.symbol || a.id }));
    const p = prices?.[a.id]?.usd;
    if (p) {
      setEntryPrice(p);
      // Default SL at 1% below entry (a sensible starting point)
      setStopLoss(p * 0.99);
    }
  };

  const [sendingJournal, setSendingJournal] = useState(false);
  const journalSymbol = persistedData.assetSymbol
    || (asset === 'bitcoin' ? 'BTC' : String(asset).toUpperCase().slice(0, 12));

  // One click from sizing to a logged trade: creates an OPEN trade in the
  // Performance journal with the calculated entry/SL/size.
  const handleSendToJournal = async () => {
    if (!result || sendingJournal) return;
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    setSendingJournal(true);
    try {
      await createTrade({
        symbol: journalSymbol,
        side: entry >= sl ? 'long' : 'short',
        entry_price: entry,
        sl,
        quantity: result.positionInCoins,
        status: 'open',
        account_balance: parseFloat(accountBalance) || 0,
        notes: t('journalFromCalcNote'),
      });
      toast.success(t('sentToJournal'));
    } catch (e) {
      toast.error(t('sendToJournalError'));
    } finally {
      setSendingJournal(false);
    }
  };

  const calculate = () => {
    const balance = parseFloat(accountBalance);
    const risk = riskPercent;
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    
    // Edge case guards: avoid NaN/Infinity from div-by-zero or invalid inputs
    if (!balance || balance <= 0 || !entry || entry <= 0 || !sl || sl <= 0) return;
    if (entry === sl) return; // No SL distance → infinite position size
    
    const riskAmount = balance * (risk / 100);
    const slDistance = Math.abs(entry - sl);
    const slPercent = (slDistance / entry) * 100;
    const positionSize = riskAmount / (slPercent / 100);
    const positionInCoins = positionSize / entry;
    const leverageNeeded = positionSize / balance;
    
    const res = {
      riskAmount,
      slDistance,
      slPercent,
      positionSize,
      positionInCoins,
      leverageNeeded: Math.max(1, leverageNeeded)
    };
    
    setResult(res);
  };

  const handleSave = async () => {
    if (result && isAuthenticated) {
      await saveCalculation('position_size', { accountBalance, riskPercent, entryPrice, stopLoss }, result);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          {t('positionSizeCalcTitle_p002')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescPosition')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('asset')}</Label>
          <UniversalAssetSearch
            value={asset}
            onChange={handleAssetChange}
            testId="position-asset-select"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground"><LabelWithHelp bodyKey="helpAccountBalance">{t('balanceDeCuenta_89aff2')}</LabelWithHelp></Label>
              <Input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                className="font-mono bg-muted border-border"
                data-testid="position-balance"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground"><LabelWithHelp bodyKey="helpRiskPerTrade">{t('riesgoPorOperacion_3d966d')}</LabelWithHelp></Label>
                <span className="font-mono text-lg font-bold text-blue-500">{riskPercent}%</span>
              </div>
              <Slider
                value={[riskPercent]}
                onValueChange={setRiskPercent}
                min={0.5}
                max={10}
                step={0.5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5%</span>
                <span>{t('___2Recomendado_867927')}</span>
                <span>10%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('precioEntrada_caf850')}</Label>
                <Input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="font-mono bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss ($)</Label>
                <Input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="font-mono bg-muted border-border"
                />
              </div>
            </div>
            
            <Button onClick={calculate} className="w-full bg-primary text-black hover:bg-primary/90" data-testid="position-calculate-btn">
              {t('calcPosition_pos001')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs uppercase tracking-wider text-blue-500 mb-1">{t('tamanoDePosicionRecomendado_7d9b61')}</p>
                  <p className="font-mono text-3xl font-bold text-blue-500">{formatCurrency(result.positionSize)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatNumber(result.positionInCoins, 6)} BTC
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('riesgoEn_24ce17')}</p>
                    <p className="font-mono text-xl font-bold text-destructive">{formatCurrency(result.riskAmount)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('slDistanceLabel_pos002')}</p>
                    <p className="font-mono text-xl font-bold">{formatNumber(result.slPercent)}%</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs uppercase tracking-wider text-yellow-500 mb-1"><LabelWithHelp bodyKey="helpRequiredLeverage">{t('apalancamientoNecesario_f6ca45')}</LabelWithHelp></p>
                  <p className="font-mono text-xl font-bold text-yellow-500">{formatNumber(result.leverageNeeded, 1)}x</p>
                  {result.leverageNeeded > 20 && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-yellow-500">
                      <AlertTriangle className="w-4 h-4" />
                      {t('highLeverageWarning_pos003')}
                    </div>
                  )}
                </div>
                
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs">
                  <p className="text-accent font-semibold">{t('gestionDeRiesgo_bee33b')}</p>
                  <p className="text-muted-foreground mt-1">
                    {t('positionSizeExplanation_pos004')
                      .replace('{risk}', riskPercent)
                      .replace('{sl}', formatNumber(parseFloat(stopLoss) || 0))
                      .replace('{amount}', formatNumber(result.riskAmount))
                      .replace('{pct}', riskPercent)}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={clearPersistedData} variant="outline" className="flex-1">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('clearShort_p006')}
                  </Button>
                  
                  {isAuthenticated && (
                    <Button onClick={handleSave} variant="outline" className="flex-1">
                      <Save className="w-4 h-4 mr-2" /> {t('save_lev008')}
                    </Button>
                  )}
                </div>

                {isAuthenticated && (
                  <Button
                    onClick={handleSendToJournal}
                    disabled={sendingJournal}
                    className="w-full bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25"
                    data-testid="position-send-journal"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {sendingJournal ? '…' : t('sendToJournal')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
