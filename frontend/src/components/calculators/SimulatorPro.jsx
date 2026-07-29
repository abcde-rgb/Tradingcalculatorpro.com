import { useState, useEffect } from 'react';
import { useIsPremium } from '@/lib/premium';
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
  const isPremium = useIsPremium();

  // Global config
  const [initialBalance, setInitialBalance] = useState(1000);
  const [capitalMode, setCapitalMode] = useState('compound');  // 'compound' | 'fixed'
  const [totalPhases, setTotalPhases] = useState(6);
  const [tradingComm, setTradingComm] = useState(0.1);
  const [platformComm, setPlatformComm] = useState(0.05);
  const [compoundInterest, setCompoundInterest] = useState(true);
  const [phases, setPhases] = useState(DEFAULT_PHASES);

  // Fixed risk config
  const [fixedCapitalPerOp, setFixedCapitalPerOp] = useState(100);
  const [fixedTotalOps, setFixedTotalOps] = useState(100);
  const [fixedWinRate, setFixedWinRate] = useState(55);
  const [fixedTakeProfit, setFixedTakeProfit] = useState(2);
  const [fixedStopLoss, setFixedStopLoss] = useState(1);
  // Partial take-profits (scale-out) for fixed mode
  const [fixedPartialTps, setFixedPartialTps] = useState(false);
  const [fixedPartialLegs, setFixedPartialLegs] = useState([
    { r: 1, pct: 50 }, { r: 2, pct: 30 }, { r: 3, pct: 20 },
  ]);
  const [fixedPartialCont, setFixedPartialCont] = useState(60);

  const updatePartialLeg = (index, field, value) => {
    setFixedPartialLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: parseFloat(value) || 0 };
      return next;
    });
  };

  // Output
  const [results, setResults] = useState(null);
  const [operations, setOperations] = useState([]);
  const [lastConfig, setLastConfig] = useState(null);
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

  const buildConfig = () => ({
    initialBalance, capitalMode, phases, compoundInterest,
    tradingComm, platformComm,
    fixedCapitalPerOp, fixedTotalOps, fixedWinRate, fixedTakeProfit, fixedStopLoss,
    fixedPartialTps, fixedPartialLegs, fixedPartialCont,
  });

  const executeSimulation = () => {
    if (!isPremium) return;
    setIsLoading(true);
    const cfg = buildConfig();
    const { operations: ops, results: agg } = runSimulation(cfg);
    setResults(agg);
    setOperations(ops);
    setLastConfig(cfg);
    setShowConfig(false);
    setIsLoading(false);
  };

  const resetSimulation = () => {
    setResults(null);
    setOperations([]);
    setLastConfig(null);
    setShowConfig(true);
  };

  if (!isPremium) return <SimulatorLocked />;

  return (
    <div className="space-y-4" data-testid="simulator-pro">
      <SimulatorConfigPanel
        showConfig={showConfig} setShowConfig={setShowConfig}
        initialBalance={initialBalance} setInitialBalance={setInitialBalance}
        capitalMode={capitalMode} setCapitalMode={setCapitalMode}
        totalPhases={totalPhases} setTotalPhases={setTotalPhases}
        tradingComm={tradingComm} setTradingComm={setTradingComm}
        platformComm={platformComm} setPlatformComm={setPlatformComm}
        compoundInterest={compoundInterest} setCompoundInterest={setCompoundInterest}
        phases={phases} updatePhase={updatePhase} getOperationRange={getOperationRange}
        togglePhasePartial={togglePhasePartial} updatePhaseLeg={updatePhaseLeg}
        fixedCapitalPerOp={fixedCapitalPerOp} setFixedCapitalPerOp={setFixedCapitalPerOp}
        fixedTotalOps={fixedTotalOps} setFixedTotalOps={setFixedTotalOps}
        fixedTakeProfit={fixedTakeProfit} setFixedTakeProfit={setFixedTakeProfit}
        fixedStopLoss={fixedStopLoss} setFixedStopLoss={setFixedStopLoss}
        fixedWinRate={fixedWinRate} setFixedWinRate={setFixedWinRate}
        fixedPartialTps={fixedPartialTps} setFixedPartialTps={setFixedPartialTps}
        fixedPartialLegs={fixedPartialLegs} updatePartialLeg={updatePartialLeg}
        fixedPartialCont={fixedPartialCont} setFixedPartialCont={setFixedPartialCont}
        onExecute={executeSimulation} isLoading={isLoading}
      />

      {results && (
        <SimulatorResults
          results={results}
          operations={operations}
          onReset={resetSimulation}
        />
      )}

      {/* One path is a sample, not a forecast — the distribution is next. */}
      {results && lastConfig && <MonteCarloPanel config={lastConfig} />}
    </div>
  );
}
