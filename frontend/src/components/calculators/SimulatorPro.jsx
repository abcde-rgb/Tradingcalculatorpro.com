import { useState, useEffect } from 'react';
import { useIsPremium } from '@/lib/premium';
import { useTranslation } from '@/lib/i18n';
import { runSimulation } from './simulator/simulatorEngine';
import MonteCarloPanel from './simulator/MonteCarloPanel';
import SimulatorLocked from './simulator/SimulatorLocked';
import SimulatorConfigPanel from './simulator/SimulatorConfigPanel';
import SimulatorResults from './simulator/SimulatorResults';

/** Default Per-phase configuration used when totalPhases grows. */
const DEFAULT_PHASES = [
  { numOps: 30, posSize: 100, tp: 2,   sl: 1,   winRate: 55, strategy: 'scalping'   },
  { numOps: 30, posSize: 100, tp: 2,   sl: 1,   winRate: 55, strategy: 'daytrading' },
  { numOps: 30, posSize: 10,  tp: 3,   sl: 1.5, winRate: 52, strategy: 'daytrading' },
  { numOps: 30, posSize: 10,  tp: 3,   sl: 1.5, winRate: 50, strategy: 'swing'      },
  { numOps: 30, posSize: 3,   tp: 4,   sl: 2,   winRate: 48, strategy: 'swing'      },
  { numOps: 30, posSize: 3,   tp: 5,   sl: 2.5, winRate: 45, strategy: 'trend'      },
];

/**
 * Multi-phase Monte-Carlo simulator (Premium).
 *
 * Thin orchestrator: owns configuration state, delegates rendering to
 * SimulatorConfigPanel + SimulatorResults, and runs trades through the
 * pure `runSimulation` engine.
 */
export function SimulatorPro() {
  const { t } = useTranslation();
  const isPremium = useIsPremium();

  // El estado va agrupado por MODO, no suelto. Antes eran 22 `useState` planos
  // que se pasaban uno a uno al panel de configuración, y en torno a la mitad
  // estaban muertos en cualquier momento porque pertenecían al modo que no
  // estaba activo. Agrupar deja explícito qué configura qué y baja el paso de
  // props de 22 a 8.
  const [capitalMode, setCapitalMode] = useState('compound');  // 'compound' | 'fixed'
  const [initialBalance, setInitialBalance] = useState(1000);

  // Costes: se aplican en LOS DOS modos (el motor los mete en `totalCommRate`
  // sin mirar el modo), así que viven fuera de la configuración de cada uno.
  // Estaban dentro del bloque de compuesto, y eso los hacía ineditables en
  // riesgo fijo mientras se seguían cobrando: 0,15 % por operación invisible.
  const [costs, setCosts] = useState({ trading: 0.1, platform: 0.05 });
  const setCost = (field, value) =>
    setCosts((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));

  // Modo COMPUESTO: fases con su propia configuración.
  const [totalPhases, setTotalPhases] = useState(6);
  const [compoundInterest, setCompoundInterest] = useState(true);
  const [phases, setPhases] = useState(DEFAULT_PHASES);

  // Modo RIESGO FIJO.
  const [fixed, setFixed] = useState({
    capitalPerOp: 100,
    totalOps: 100,
    winRate: 55,
    takeProfit: 2,
    stopLoss: 1,
    partialTps: false,
    partialLegs: [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }],
    partialCont: 60,
  });
  const setFixedField = (field, value) =>
    setFixed((prev) => ({ ...prev, [field]: value }));

  const updatePartialLeg = (index, field, value) => {
    setFixed((prev) => {
      const legs = prev.partialLegs.map((l) => ({ ...l }));
      legs[index] = { ...legs[index], [field]: parseFloat(value) || 0 };
      return { ...prev, partialLegs: legs };
    });
  };

  // Output
  const [results, setResults] = useState(null);
  const [operations, setOperations] = useState([]);
  const [lastConfig, setLastConfig] = useState(null);
  // Trayectoria mediana del último barrido de Monte Carlo, cuando el usuario lo
  // ha lanzado. Sustituye a la tirada suelta en las tarjetas de cabecera: leer
  // un ROI arbitrario justo encima de un rango P5–P95 es el error que la propia
  // distribución venía a corregir.
  const [mcMedian, setMcMedian] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(true);

  // Keep phases array length in sync with totalPhases (fills with sensible defaults).
  useEffect(() => {
    setPhases((prev) => {
      const next = [];
      for (let i = 0; i < totalPhases; i += 1) {
        if (prev[i]) {
          next.push({ ...prev[i], id: prev[i].id || `phase-${i}-${Date.now()}` });
        } else {
          const strategies = ['scalping', 'daytrading', 'swing', 'trend', 'breakout'];
          next.push({
            id: `phase-${i}-${Date.now()}`,
            numOps: 30,
            posSize: i < 2 ? 100 : i < 4 ? 10 : 3,
            tp: 2 + i * 0.5,
            sl: 1 + i * 0.25,
            winRate: 55 - i * 2,
            strategy: strategies[Math.min(i, strategies.length - 1)],
          });
        }
      }
      return next;
    });
  }, [totalPhases]);

  const updatePhase = (index, field, value) => {
    setPhases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Enable/disable partial TPs for a phase (seeds legs + continuation on enable).
  const togglePhasePartial = (index, checked) => {
    setPhases((prev) => {
      const next = [...prev];
      const p = { ...next[index], partialTps: checked };
      if (checked && !Array.isArray(p.legs)) {
        p.legs = [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }];
      }
      if (checked && p.cont == null) p.cont = 60;
      next[index] = p;
      return next;
    });
  };

  const updatePhaseLeg = (index, legIndex, field, value) => {
    setPhases((prev) => {
      const next = [...prev];
      const legs = Array.isArray(next[index].legs)
        ? next[index].legs.map((l) => ({ ...l }))
        : [{ r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 }];
      legs[legIndex] = { ...legs[legIndex], [field]: parseFloat(value) || 0 };
      next[index] = { ...next[index], legs };
      return next;
    });
  };

  const getOperationRange = (phaseIndex) => {
    let start = 1;
    for (let i = 0; i < phaseIndex; i += 1) start += phases[i]?.numOps || 30;
    const end = start + (phases[phaseIndex]?.numOps || 30) - 1;
    return { start, end };
  };

  // El motor mantiene su contrato plano (`fixedX`, `tradingComm`…): agrupar es
  // una decisión de la interfaz, y traducir aquí evita tocar `simulatorEngine`
  // y sus pruebas por un cambio que es de organización, no de cálculo.
  const buildConfig = () => ({
    initialBalance, capitalMode, phases, compoundInterest,
    tradingComm: costs.trading, platformComm: costs.platform,
    fixedCapitalPerOp: fixed.capitalPerOp,
    fixedTotalOps: fixed.totalOps,
    fixedWinRate: fixed.winRate,
    fixedTakeProfit: fixed.takeProfit,
    fixedStopLoss: fixed.stopLoss,
    fixedPartialTps: fixed.partialTps,
    fixedPartialLegs: fixed.partialLegs,
    fixedPartialCont: fixed.partialCont,
  });

  const executeSimulation = () => {
    if (!isPremium) return;
    setIsLoading(true);
    const cfg = buildConfig();
    const { operations: ops, results: agg } = runSimulation(cfg);
    setResults(agg);
    setOperations(ops);
    setLastConfig(cfg);
    setMcMedian(null);   // la config cambió: el barrido anterior ya no aplica
    setShowConfig(false);
    setIsLoading(false);
  };

  const resetSimulation = () => {
    setResults(null);
    setOperations([]);
    setLastConfig(null);
    setMcMedian(null);
    setShowConfig(true);
  };

  if (!isPremium) return <SimulatorLocked />;

  return (
    <div className="space-y-4" data-testid="simulator-pro">
      <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
        {t('calcDescSimulator')}
      </p>
      <SimulatorConfigPanel
        showConfig={showConfig} setShowConfig={setShowConfig}
        initialBalance={initialBalance} setInitialBalance={setInitialBalance}
        capitalMode={capitalMode} setCapitalMode={setCapitalMode}
        costs={costs} setCost={setCost}
        compound={{
          totalPhases, setTotalPhases, compoundInterest, setCompoundInterest,
          phases, updatePhase, getOperationRange, togglePhasePartial, updatePhaseLeg,
        }}
        fixed={fixed} setFixedField={setFixedField} updatePartialLeg={updatePartialLeg}
        onExecute={executeSimulation} isLoading={isLoading}
      />

      {results && (
        <SimulatorResults
          results={mcMedian ? mcMedian.results : results}
          operations={mcMedian ? mcMedian.operations : operations}
          isMedianOfSweep={Boolean(mcMedian)}
          onReset={resetSimulation}
        />
      )}

      {/* One path is a sample, not a forecast — the distribution is next. */}
      {results && lastConfig && (
        <MonteCarloPanel
          config={lastConfig}
          onResult={(mc) => setMcMedian(mc?.medianPath || null)}
        />
      )}
    </div>
  );
}
