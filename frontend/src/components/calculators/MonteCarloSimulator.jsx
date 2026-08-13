import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FlaskConical, Play, TrendingUp, TrendingDown, AlertTriangle, Crown, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsPremium } from '@/lib/premium';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { usePersistedState } from '@/hooks/usePersistedState';

const API = process.env.REACT_APP_BACKEND_URL;

export function MonteCarloSimulator() {
  const { user, token } = useAuthStore();
  const isPremium = useIsPremium();
  const { t } = useTranslation();
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [results, setResults] = useState(null);
  
  const [persistedData, setPersistedData, clearPersistedData] = usePersistedState('montecarlo_simulator', {
    winRate: 55,
    avgWin: '100',
    avgLoss: '-50',
    initialCapital: '10000',
    numTrades: 100,
    numSimulations: 1000
  });

  const { winRate, avgWin, avgLoss, initialCapital, numTrades, numSimulations } = persistedData;

  const setWinRate        = (v) => setPersistedData(prev => ({ ...prev, winRate: Array.isArray(v) ? v[0] : v }));
  const setAvgWin         = (v) => setPersistedData(prev => ({ ...prev, avgWin: v }));
  const setAvgLoss        = (v) => setPersistedData(prev => ({ ...prev, avgLoss: v }));
  const setInitialCapital = (v) => setPersistedData(prev => ({ ...prev, initialCapital: v }));
  const setNumTrades      = (v) => setPersistedData(prev => ({ ...prev, numTrades: Array.isArray(v) ? v[0] : v }));
  const setNumSimulations = (v) => setPersistedData(prev => ({ ...prev, numSimulations: Array.isArray(v) ? v[0] : v }));

  const runSimulation = async () => {
    if (!isPremium) return;
    
    setIsLoadingState(true);
    
    // Run Monte Carlo simulation locally for immediate response
    const simulations = [];
    const finalBalances = [];
    const maxDrawdowns = [];
    
    const winRateDecimal = winRate / 100;
    const avgWinValue = parseFloat(avgWin) || 100;
    const avgLossValue = parseFloat(avgLoss) || -50;
    const capital = parseFloat(initialCapital) || 10000;
    const trades = numTrades;
    const sims = numSimulations;
    
    for (let s = 0; s < sims; s++) {
      let balance = capital;
      const equityCurve = [balance];
      let peak = balance;
      let maxDD = 0;
      
      for (let t = 0; t < trades; t++) {
        // Simulate trade outcome
        const isWin = Math.random() < winRateDecimal;
        const pnl = isWin ? avgWinValue : avgLossValue;
        balance += pnl;
        
        equityCurve.push(balance);
        peak = Math.max(peak, balance);
        const dd = peak > 0 ? (peak - balance) / peak : 0;
        maxDD = Math.max(maxDD, dd);
      }
      
      finalBalances.push(balance);
      maxDrawdowns.push(maxDD * 100);
      
      // Keep first 50 simulations for visualization
      if (simulations.length < 50) {
        simulations.push(equityCurve);
      }
    }
    
    // Calculate statistics
    finalBalances.sort((a, b) => a - b);
    const percentile5 = finalBalances[Math.floor(finalBalances.length * 0.05)];
    const percentile50 = finalBalances[Math.floor(finalBalances.length * 0.50)];
    const percentile95 = finalBalances[Math.floor(finalBalances.length * 0.95)];
    
    const avgFinalBalance = finalBalances.reduce((a, b) => a + b, 0) / finalBalances.length;
    const riskOfRuin = (finalBalances.filter(b => b <= 0).length / finalBalances.length) * 100;
    const avgMaxDrawdown = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;
    const profitProbability = (finalBalances.filter(b => b > capital).length / finalBalances.length) * 100;
    
    setResults({
      simulations,
      statistics: {
        initialCapital: capital,
        avgFinalBalance: Math.round(avgFinalBalance * 100) / 100,
        percentile5: Math.round(percentile5 * 100) / 100,
        percentile50: Math.round(percentile50 * 100) / 100,
        percentile95: Math.round(percentile95 * 100) / 100,
        riskOfRuin: Math.round(riskOfRuin * 100) / 100,
        avgMaxDrawdown: Math.round(avgMaxDrawdown * 100) / 100,
        profitProbability: Math.round(profitProbability * 100) / 100
      }
    });
    
    setIsLoadingState(false);
  };

  if (!isPremium) {
    return (
      <Card className="bg-card border-border" data-testid="monte-carlo-locked">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-purple-500" />
            </div>
            {t('monteCarloLockedTitle_p003')}
            <Crown className="w-4 h-4 text-yellow-500" />
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed max-w-2xl">
            {t('calcDescMontecarlo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{t('premiumFeature')}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('monteCarloDescription')}
            </p>
            <Link to="/pricing">
              <Button className="gap-2">
                <Crown className="w-4 h-4" /> {t('unlockPremium')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border" data-testid="monte-carlo-simulator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-purple-500" />
          </div>
          {t('monteCarlo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('winRate')}</Label>
              <span className="text-sm font-semibold text-primary">{winRate}%</span>
            </div>
            <Slider
              value={[winRate]}
              onValueChange={(v) => setWinRate(v[0])}
              min={20}
              max={80}
              step={1}
              data-testid="winrate-slider"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t('avgProfit')} ($)</Label>
              <Input
                type="number"
                value={avgWin}
                onChange={(e) => setAvgWin(e.target.value)}
                data-testid="avg-win-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('avgLoss')} ($)</Label>
              <Input
                type="number"
                value={avgLoss}
                onChange={(e) => setAvgLoss(e.target.value)}
                data-testid="avg-loss-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t('initialBalance')} ($)</Label>
              <Input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                data-testid="capital-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t('numTrades')}</Label>
              <Input
                type="number"
                value={numTrades}
                onChange={(e) => setNumTrades(parseInt(e.target.value))}
                data-testid="num-trades-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('simulations')}</Label>
              <span className="text-sm text-muted-foreground">{numSimulations.toLocaleString()}</span>
            </div>
            <Slider
              value={[numSimulations]}
              onValueChange={(v) => setNumSimulations(v[0])}
              min={100}
              max={5000}
              step={100}
              data-testid="simulations-slider"
            />
          </div>
        </div>

        <Button 
          onClick={runSimulation} 
          className="w-full gap-2" 
          disabled={isLoadingState}
          data-testid="run-simulation-btn"
        >
          {isLoadingState ? (
            <>{t('simulating')}</>
          ) : (
            <>
              <Play className="w-4 h-4" /> {t('runSimulations').replace('{n}', numSimulations.toLocaleString())}
            </>
          )}
        </Button>

        <Button onClick={clearPersistedData} variant="outline" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {t('clearData')}
        </Button>

        {/* Results */}
        {results && (
          <div className="mt-4 space-y-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">{t('avgBalanceResult')}</p>
                <p className="text-xl font-bold text-primary" data-testid="avg-balance">
                  ${results.statistics.avgFinalBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <p className="text-xs text-muted-foreground">{t('profitProbability')}</p>
                <p className="text-xl font-bold text-green-500" data-testid="profit-prob">
                  {results.statistics.profitProbability}%
                </p>
              </div>
            </div>

            {/* Percentiles */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-3">{t('distribucionDeResultados_032fd8')}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-400">{t('worstFivePct_p015')}</span>
                  <span className="font-mono font-semibold">${results.statistics.percentile5.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-yellow-500">{t('medianFiftyPct_p016')}</span>
                  <span className="font-mono font-semibold">${results.statistics.percentile50.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-500">{t('mejor5_4e0b8a')}</span>
                  <span className="font-mono font-semibold">${results.statistics.percentile95.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xs text-muted-foreground">{t('riesgoDeRuina_ce3690')}</p>
                <p className="text-lg font-bold text-destructive flex items-center justify-center gap-1" data-testid="ruin-risk">
                  {results.statistics.riskOfRuin > 10 && <AlertTriangle className="w-4 h-4" />}
                  {results.statistics.riskOfRuin}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                <p className="text-xs text-muted-foreground">{t('avgDrawdown_p017')}</p>
                <p className="text-lg font-bold text-orange-500" data-testid="avg-dd">
                  {results.statistics.avgMaxDrawdown}%
                </p>
              </div>
            </div>

            {/* Mini Equity Chart Visual */}
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">{t('muestraDe5Simulaciones_359555')}</p>
              <div className="h-32 flex items-end gap-1">
                {results.simulations.slice(0, 5).map((sim, idx) => {
                  const final = sim[sim.length - 1];
                  const initial = parseFloat(initialCapital);
                  const isProfit = final > initial;
                  const height = Math.min(Math.abs((final - initial) / initial) * 100, 100);
                  
                  return (
                    <div 
                      key={`simulation-${idx}-${final.toFixed(2)}`}
                      className="flex-1 flex flex-col justify-end items-center gap-1"
                    >
                      <div 
                        className={`w-full rounded-t ${isProfit ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ height: `${Math.max(height, 10)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {isProfit ? '+' : ''}{((final - initial) / initial * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interpretation */}
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p className="font-medium mb-1">{t('interpretacion_1cc069')}</p>
              {results.statistics.profitProbability >= 60 ? (
                <p className="text-green-500">{t('tuEstrategiaTieneUnaVentaja_3ba865')}</p>
              ) : results.statistics.profitProbability >= 45 ? (
                <p className="text-yellow-500">{t('ventajaMarginalConsideraOptimizarPa_746aa8')}</p>
              ) : (
                <p className="text-red-500">{t('altaProbabilidadDePerdidaRevisa_a4b9b2')}</p>
              )}
              {results.statistics.riskOfRuin > 5 && (
                <p className="text-red-400 mt-1">{t('highRuinRisk_p018').replace('{pct}', results.statistics.riskOfRuin)}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
