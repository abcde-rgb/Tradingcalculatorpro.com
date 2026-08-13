import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Calculator, Info, Trash2 } from 'lucide-react';
import { useCalculatorStore } from '@/lib/store';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTranslation } from '@/lib/i18n';
import { LabelWithHelp } from '@/components/common/FieldHelp';
import UniversalAssetSearch from '@/components/common/UniversalAssetSearch';

const FOREX_PAIRS = [
  { symbol: 'EURUSD', pipValue: 0.0001, name: 'EUR/USD' },
  { symbol: 'GBPUSD', pipValue: 0.0001, name: 'GBP/USD' },
  { symbol: 'USDJPY', pipValue: 0.01, name: 'USD/JPY' },
  { symbol: 'USDCHF', pipValue: 0.0001, name: 'USD/CHF' },
  { symbol: 'AUDUSD', pipValue: 0.0001, name: 'AUD/USD' },
  { symbol: 'USDCAD', pipValue: 0.0001, name: 'USD/CAD' },
  { symbol: 'NZDUSD', pipValue: 0.0001, name: 'NZD/USD' },
  { symbol: 'EURGBP', pipValue: 0.0001, name: 'EUR/GBP' },
  { symbol: 'EURJPY', pipValue: 0.01, name: 'EUR/JPY' },
  { symbol: 'GBPJPY', pipValue: 0.01, name: 'GBP/JPY' },
  { symbol: 'XAUUSD', pipValue: 0.01, name: 'Oro/USD' },
];

export function LotSizeCalculator() {
  const { saveCalculation } = useCalculatorStore();
  const { t } = useTranslation();

  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('lot_size_calculator', {
    accountBalance: '10000',
    riskPercent: '1',
    stopLossPips: '50',
    selectedPair: 'EURUSD'
  });

  const { accountBalance, riskPercent, stopLossPips, selectedPair } = persistedData;
  const [results, setResults] = useState(null);

  const setAccountBalance = (v) => setPersistedData(prev => ({ ...prev, accountBalance: v }));
  const setRiskPercent    = (v) => setPersistedData(prev => ({ ...prev, riskPercent: v }));
  const setStopLossPips   = (v) => setPersistedData(prev => ({ ...prev, stopLossPips: v }));
  const setSelectedPair   = (v) => setPersistedData(prev => ({ ...prev, selectedPair: v }));

  const calculate = () => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const slPips = parseFloat(stopLossPips);
    const pair = FOREX_PAIRS.find(p => p.symbol === selectedPair);
    
    if (!balance || balance <= 0 || !risk || risk <= 0 || !slPips || slPips <= 0 || !pair) return;

    // Cantidad que estamos dispuestos a arriesgar
    const riskAmount = balance * (risk / 100);
    
    // Valor por pip para diferentes tamaños de lote
    // Para pares XXX/USD: 1 lote estándar = $10 por pip
    // Para pares USD/XXX: depende del precio actual
    const pipValuePerStandardLot = 10; // USD por pip para 1 lote estándar
    
    // Calcular tamaño de lote óptimo
    const optimalLotSize = riskAmount / (slPips * pipValuePerStandardLot);
    
    // Calcular en unidades
    const units = optimalLotSize * 100000; // 1 lote = 100,000 unidades
    
    // Calcular en mini lotes y micro lotes
    const miniLots = optimalLotSize * 10;
    const microLots = optimalLotSize * 100;

    const calculatedResults = {
      riskAmount: riskAmount.toFixed(2),
      lotSize: optimalLotSize.toFixed(4),
      miniLots: miniLots.toFixed(2),
      microLots: microLots.toFixed(1),
      units: Math.round(units),
      pipValue: (optimalLotSize * pipValuePerStandardLot).toFixed(2),
      maxLoss: riskAmount.toFixed(2)
    };

    setResults(calculatedResults);

    // Guardar cálculo
    saveCalculation('lot_size', {
      accountBalance: balance,
      riskPercent: risk,
      stopLossPips: slPips,
      pair: selectedPair
    }, calculatedResults);
  };

  return (
    <Card className="bg-card border-border" data-testid="lot-size-calculator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          {t('lotSizeCalcTitle_p001')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescLotsize')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">{t('parDeDivisas_f0f7cd')}</Label>
            <UniversalAssetSearch
              value={selectedPair}
              onChange={(asset) => setSelectedPair(asset.symbol)}
              categories={['forex', 'commodities', 'indices', 'etfs', 'stocks']}
              testId="pair-select"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t('balanceDeCuenta_89aff2')}</Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              placeholder="10000"
              data-testid="account-balance-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm"><LabelWithHelp bodyKey="helpRiskPerTrade">{t('riesgoPorTrade_c5f760')}</LabelWithHelp></Label>
            <Input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              placeholder="1"
              step="0.5"
              data-testid="risk-percent-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Stop Loss (pips)</Label>
            <Input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value)}
              placeholder="50"
              data-testid="stop-loss-pips-input"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full gap-2" data-testid="calculate-lot-btn">
          <Calculator className="w-4 h-4" /> Calcular Lotaje
        </Button>

        {results && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Resultados
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground"><LabelWithHelp bodyKey="helpLotSize">{t('tamanoDeLote_6ff2de')}</LabelWithHelp></p>
                <p className="text-2xl font-bold text-primary" data-testid="result-lot-size">{results.lotSize}</p>
                <p className="text-xs text-muted-foreground">{t('lotesEstandar_a4b8ec')}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <p className="text-xs text-muted-foreground">Unidades</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="result-units">{results.units.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">Mini Lotes</p>
                <p className="font-semibold">{results.miniLots}</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">Micro Lotes</p>
                <p className="font-semibold">{results.microLots}</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground"><LabelWithHelp bodyKey="helpPipValue">{t('valorPorPip_61cdca')}</LabelWithHelp></p>
                <p className="font-semibold">${results.pipValue}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 text-center">
              <p className="text-xs text-muted-foreground">{t('perdidaMaximaSiTocaSl_1986d0')}</p>
              <p className="text-xl font-bold text-destructive">${results.maxLoss}</p>
              <p className="text-xs text-muted-foreground">({riskPercent}% de tu cuenta)</p>
            </div>
          </div>
        )}

        <Button onClick={clearPersistedData} variant="outline" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearData')}
        </Button>

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <p className="font-medium mb-1">{t('formula_92c698')}</p>
          <code>Lotes = (Balance × Riesgo%) / (SL pips × $10)</code>
          <p className="mt-2">Para pares mayores XXX/USD, $10 = valor de 1 pip por lote estándar</p>
        </div>
      </CardContent>
    </Card>
  );
}
