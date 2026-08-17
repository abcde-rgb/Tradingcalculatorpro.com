import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { swingDecimals } from '@/components/performance/form/productMeta';
import { Ruler, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { FIBONACCI_LEVELS } from '@/lib/constants';

export const TargetMeasurementTool = () => {
  const { t } = useTranslation();
  const [pointA, setPointA] = useState('');
  const [pointB, setPointB] = useState('');
  const [confirmationPoint, setConfirmationPoint] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    if (!pointA || !pointB) return;
    
    const a = parseFloat(pointA);
    const b = parseFloat(pointB);
    const confirmation = confirmationPoint ? parseFloat(confirmationPoint) : null;
    
    const height = Math.abs(b - a);
    // Los decimales salen del swing, no de una constante. Con los dos fijos de
    // `formatNumber`, un swing de EURUSD dejaba 3 niveles distintos de 13 y una
    // cripto por debajo de 0,01 los dejaba TODOS en «0,00».
    const dp = swingDecimals(a, b);
    const percentageMove = ((b - a) / a) * 100;
    const isUptrend = b > a;
    
    // Calcular niveles de Fibonacci
    const fibLevels = FIBONACCI_LEVELS.map(fib => {
      let price;
      if (isUptrend) {
        // En tendencia alcista, los retrocesos van de B hacia A
        price = b - (height * fib.level);
      } else {
        // En tendencia bajista, los retrocesos van de B hacia A
        price = b + (height * fib.level);
      }
      return {
        ...fib,
        price
      };
    });
    
    // Calcular targets (extensiones)
    const targets = [
      { label: '100% (Igual)', price: isUptrend ? b + height : b - height },
      { label: '127.2%', price: isUptrend ? b + (height * 1.272) : b - (height * 1.272) },
      { label: '161.8%', price: isUptrend ? b + (height * 1.618) : b - (height * 1.618) },
      { label: '200%', price: isUptrend ? b + (height * 2) : b - (height * 2) },
    ];
    
    // Calcular si hay confirmación
    let confirmationStatus = null;
    if (confirmation) {
      if (isUptrend) {
        confirmationStatus = confirmation > b ? 'CONFIRMADO - Ruptura alcista' : 'PENDIENTE - Esperando ruptura';
      } else {
        confirmationStatus = confirmation < b ? 'CONFIRMADO - Ruptura bajista' : 'PENDIENTE - Esperando ruptura';
      }
    }
    
    setResult({
      dp,
      pointA: a,
      pointB: b,
      height,
      percentageMove,
      isUptrend,
      fibLevels,
      targets,
      confirmationStatus,
      direction: isUptrend ? 'ALCISTA' : 'BAJISTA'
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-purple-500" />
          Medición de Targets y Fibonacci
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescMeasure')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-muted-foreground mb-3">
                Introduce los dos puntos del patrón para calcular el target y los niveles de Fibonacci
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Punto A (Inicio)
                  </Label>
                  <Input
                    type="number"
                    value={pointA}
                    onChange={(e) => setPointA(e.target.value)}
                    placeholder={t('precioInicio_6ccc35')}
                    className="font-mono bg-black/50 border-white/10"
                    data-testid="point-a-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    Punto B (Fin)
                  </Label>
                  <Input
                    type="number"
                    value={pointB}
                    onChange={(e) => setPointB(e.target.value)}
                    placeholder={t('precioFin_fca973')}
                    className="font-mono bg-black/50 border-white/10"
                    data-testid="point-b-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-yellow-500" />
                Punto de Confirmación/Ruptura (Opcional)
              </Label>
              <Input
                type="number"
                value={confirmationPoint}
                onChange={(e) => setConfirmationPoint(e.target.value)}
                placeholder={t('precioDeRupturaDelPatron_666552')}
                className="font-mono bg-black/50 border-white/10"
              />
            </div>
            
            <Button onClick={calculate} className="w-full bg-purple-500 text-white hover:bg-purple-400" data-testid="measure-btn">
              {t('calculateTargets')}
            </Button>
          </div>
          
          <div className="space-y-4">
            {result && (
              <>
                {/* Resumen del movimiento */}
                <div className={`p-4 rounded-xl border ${result.isUptrend ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.isUptrend ? <TrendingUp className="w-5 h-5 text-primary" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                    <span className={`font-bold ${result.isUptrend ? 'text-primary' : 'text-destructive'}`}>
                      Movimiento {result.direction}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Altura:</p>
                      <p className="font-mono font-bold">${formatNumber(result.height, result.dp)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Porcentaje:</p>
                      <p className={`font-mono font-bold ${result.percentageMove >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {result.percentageMove >= 0 ? '+' : ''}{formatNumber(result.percentageMove)}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Confirmación */}
                {result.confirmationStatus && (
                  <div className={`p-3 rounded-lg border ${result.confirmationStatus.includes('CONFIRMADO') ? 'bg-primary/10 border-primary/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                    <p className={`text-sm font-semibold ${result.confirmationStatus.includes('CONFIRMADO') ? 'text-primary' : 'text-yellow-500'}`}>
                      {result.confirmationStatus}
                    </p>
                  </div>
                )}
                
                {/* Targets */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Targets (Extensiones)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {result.targets.map((target, idx) => (
                      <div key={`target-${target.label}-${idx}`} className="p-2 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground">{target.label}</p>
                        <p className="font-mono font-bold text-primary">${formatNumber(target.price, result.dp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Niveles Fibonacci */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('nivelesDeFibonacciRetrocesos_a43a7b')}</p>
                  <div className="space-y-1">
                    {result.fibLevels.map((fib, idx) => (
                      <div key={`fib-${fib.label}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-xs text-muted-foreground">{fib.label}</span>
                        <span className="font-mono text-sm">${formatNumber(fib.price, result.dp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
