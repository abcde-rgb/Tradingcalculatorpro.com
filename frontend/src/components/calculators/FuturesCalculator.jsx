import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import { FUTURES_SPECS } from '@/lib/instruments';
import useRiskFreeRate from '@/hooks/useRiskFreeRate';

/**
 * La bolsa donde cotiza cada contrato. Es lo ÚNICO que sigue aquí, porque es
 * una etiqueta y no entra en ningún cálculo: el catálogo no la lleva y ponerla
 * en un `.jsx` no puede desviar una cifra.
 */
const BOLSAS = {
  ES: 'CME', NQ: 'CME', YM: 'CBOT', RTY: 'CME', MES: 'CME', MNQ: 'CME',
  M2K: 'CME', MYM: 'CBOT', CL: 'NYMEX', MCL: 'NYMEX', NG: 'NYMEX', RB: 'NYMEX',
  GC: 'COMEX', MGC: 'COMEX', SI: 'COMEX', SIL: 'COMEX', HG: 'COMEX', PL: 'NYMEX',
  '6E': 'CME', '6B': 'CME', '6J': 'CME', '6A': 'CME', '6C': 'CME',
  ZB: 'CBOT', ZN: 'CBOT', ZF: 'CBOT', ZS: 'CBOT', ZC: 'CBOT', ZW: 'CBOT',
};

/**
 * Los contratos, DERIVADOS del catálogo del proyecto.
 *
 * Antes esto era una tabla de 24 contratos escrita a mano dentro de este mismo
 * fichero, y se había desincronizado en seis: en bonos (ZB, ZN, ZF) y granos
 * (ZS, ZC, ZW) confundía el **tamaño de contrato** —el valor facial: 100 000 $
 * de nominal, 5 000 bushels— con el **valor del punto**, que es lo que mueve un
 * dólar de precio. La pestaña de margen multiplicaba el precio por el facial y
 * publicaba nocionales cien veces mayores: un T-Bond salía con 12 millones de
 * nocional y **2400× de apalancamiento real** donde son 120 000 y 24×.
 *
 * Ahora sale de `FUTURES_SPECS`, que `gen-instruments-js.py --check` mantiene en
 * paridad con `backend/instruments.py` en cada PR. Aquí no queda ninguna cifra
 * que pueda divergir, y de paso aparecen los cinco micros que la tabla a mano
 * no tenía (M2K, MCL, MGC, MYM, SIL).
 *
 * `pointValue` y `contractSize` son el MISMO número —lo que vale un punto— y se
 * publican los dos porque las mesas usan los dos nombres. Lo que no vuelve es
 * el facial: no participaba en ningún cálculo correcto.
 */
const FUTURES_CONTRACTS = Object.entries(FUTURES_SPECS).map(([symbol, f]) => ({
  symbol,
  name: f.name,
  category: f.category,
  tickSize: f.tick_size,
  tickValue: f.tick_value,
  contractSize: f.contract_size,
  pointValue: f.contract_size,
  initialMargin: f.initial_margin,
  exchange: BOLSAS[symbol] || '—',
}));

const CATEGORY_COLORS = {
  index: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  energy: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  metals: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  fx: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  bonds: 'bg-green-500/10 text-green-400 border-green-500/30',
  grains: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

function numFmt(n, decimals = 2) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtTick(n) {
  if (n < 0.001) return n.toFixed(7);
  if (n < 0.01) return n.toFixed(5);
  if (n < 0.1) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}

function ResultRow({ label, value, color = '' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold text-sm ${color}`}>{value}</span>
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1, min = 0 }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        step={step}
        min={min}
        className="font-mono bg-muted border-border text-sm"
      />
    </div>
  );
}

function ContractSelect({ value, onChange, t }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('futContract')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-muted border-border font-mono text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 overflow-y-auto">
          {FUTURES_CONTRACTS.map((c) => (
            <SelectItem key={c.symbol} value={c.symbol} className="font-mono text-sm">
              <span className="font-bold">{c.symbol}</span>
              <span className="text-muted-foreground ml-2 text-xs">{c.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SpecsTab({ t }) {
  const [symbol, setSymbol] = useState('ES');
  const contract = FUTURES_CONTRACTS.find((c) => c.symbol === symbol);
  const catColor = CATEGORY_COLORS[contract?.category] || '';

  const categoryLabel = {
    index: t('futCategoryIndex'),
    energy: t('futCategoryEnergy'),
    metals: t('futCategoryMetals'),
    fx: t('futCategoryFx'),
    bonds: t('futCategoryBonds'),
    grains: t('futCategoryGrains'),
  }[contract?.category] || contract?.category;

  return (
    <div className="space-y-4">
      <ContractSelect value={symbol} onChange={setSymbol} t={t} />
      {contract && (
        <div className="space-y-3">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${catColor}`}>
            {categoryLabel}
          </div>
          <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-0.5">
            <ResultRow label={t('futTickSize')} value={fmtTick(contract.tickSize)} />
            <ResultRow label={t('futTickValue')} value={`$${numFmt(contract.tickValue)}`} />
            <ResultRow label={t('futPointValue')} value={`$${numFmt(contract.pointValue)}`} />
            <ResultRow label={t('futContractSize')} value={numFmt(contract.contractSize, 0)} />
            <ResultRow label={t('futInitialMargin')} value={`$${numFmt(contract.initialMargin, 0)}`} />
            <ResultRow label={t('futExchange')} value={contract.exchange} />
          </div>
        </div>
      )}
    </div>
  );
}

function PnLTab({ t }) {
  const [symbol, setSymbol] = useState('ES');
  const [side, setSide] = useState('long');
  const [entryPrice, setEntryPrice] = useState(5000);
  const [exitPrice, setExitPrice] = useState(5010);
  const [numContracts, setNumContracts] = useState(1);

  const contract = FUTURES_CONTRACTS.find((c) => c.symbol === symbol);

  const results = useMemo(() => {
    if (!contract) return null;
    const priceMove = exitPrice - entryPrice;
    const directedMove = side === 'long' ? priceMove : -priceMove;
    const ticksMoved = directedMove / contract.tickSize;
    const pnlPerContract = ticksMoved * contract.tickValue;
    const totalPnl = pnlPerContract * numContracts;
    return { priceMove, ticksMoved, pnlPerContract, totalPnl };
  }, [contract, side, entryPrice, exitPrice, numContracts]);

  const pnlColor = results && results.totalPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';

  return (
    <div className="space-y-4">
      <ContractSelect value={symbol} onChange={setSymbol} t={t} />

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('futSide')}</Label>
        <div className="flex gap-2">
          {['long', 'short'].map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                side === s
                  ? s === 'long'
                    ? 'bg-[#22c55e]/20 text-[#4ade80] border-[#22c55e]/50'
                    : 'bg-[#ef4444]/20 text-[#f87171] border-[#ef4444]/50'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {s === 'long' ? t('futLong') : t('futShort')}
            </button>
          ))}
        </div>
      </div>

      <NumInput label={t('futEntryPrice')} value={entryPrice} onChange={setEntryPrice} step={contract?.tickSize || 0.25} />
      <NumInput label={t('futExitPrice')} value={exitPrice} onChange={setExitPrice} step={contract?.tickSize || 0.25} />
      <NumInput label={t('futContracts')} value={numContracts} onChange={setNumContracts} step={1} min={1} />

      {results && (
        <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-0.5">
          <ResultRow label={t('futPriceMove')} value={`${results.priceMove >= 0 ? '+' : ''}${numFmt(results.priceMove, 4)} pts`} />
          <ResultRow label={t('futTicksMoved')} value={`${results.ticksMoved >= 0 ? '+' : ''}${numFmt(results.ticksMoved, 1)} ticks`} />
          <ResultRow label={t('futPnlPerContract')} value={`$${numFmt(results.pnlPerContract)}`} color={results.pnlPerContract >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
          <ResultRow label={t('futTotalPnl')} value={`$${numFmt(results.totalPnl)}`} color={pnlColor} />
        </div>
      )}
    </div>
  );
}

function MarginTab({ t }) {
  const [symbol, setSymbol] = useState('ES');
  const [currentPrice, setCurrentPrice] = useState(5000);
  const [numContracts, setNumContracts] = useState(1);
  const [accountSize, setAccountSize] = useState(50000);

  const contract = FUTURES_CONTRACTS.find((c) => c.symbol === symbol);

  const results = useMemo(() => {
    if (!contract) return null;
    const notional = currentPrice * contract.contractSize * numContracts;
    const totalMargin = contract.initialMargin * numContracts;
    const realLeverage = notional / totalMargin;
    const pctOfAccount = (totalMargin / accountSize) * 100;
    return { notional, totalMargin, realLeverage, pctOfAccount };
  }, [contract, currentPrice, numContracts, accountSize]);

  const highMargin = results && results.pctOfAccount > 50;

  return (
    <div className="space-y-4">
      <ContractSelect value={symbol} onChange={setSymbol} t={t} />
      <NumInput label={t('futCurrentPrice')} value={currentPrice} onChange={setCurrentPrice} step={0.25} />
      <NumInput label={t('futContracts')} value={numContracts} onChange={setNumContracts} step={1} min={1} />
      <NumInput label={t('futAccountSize')} value={accountSize} onChange={setAccountSize} step={1000} min={100} />

      {results && (
        <>
          {highMargin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#f87171] text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {t('futMarginWarning')}
            </div>
          )}
          <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-0.5">
            <ResultRow label={t('futNotional')} value={`$${numFmt(results.notional, 0)}`} />
            <ResultRow label={t('futMarginRequired')} value={`$${numFmt(results.totalMargin, 0)}`} />
            <ResultRow label={t('futRealLeverage')} value={`${numFmt(results.realLeverage, 1)}×`} />
            <ResultRow
              label={t('futPctOfAccount')}
              value={`${numFmt(results.pctOfAccount, 1)}%`}
              color={highMargin ? 'text-[#ef4444]' : results.pctOfAccount > 25 ? 'text-[#f59e0b]' : 'text-[#22c55e]'}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FairValueTab({ t }) {
  // El tipo libre de riesgo NO se escribe a mano. Era `useState(5.0)`, y el
  // proyecto tiene una regla explícita al respecto: un 5 % suelto es un bug,
  // porque el backend valora con el rendimiento real del ^IRX y las dos mitades
  // de la app acaban discrepando sobre el mismo contrato. Se propone el vivo y
  // el usuario puede cambiarlo; lo que no se hace es inventarlo.
  const { ratePct, isLive, source } = useRiskFreeRate();
  const [spotPrice, setSpotPrice] = useState(5000);
  const [rPct, setRPct] = useState(null);
  const [qPct, setQPct] = useState(0.0);

  // Cuando llega el tipo vivo, entra en el campo — salvo que ya lo hayas tocado.
  useEffect(() => {
    setRPct((prev) => (prev === null ? ratePct : prev));
  }, [ratePct]);
  const rEfectivo = rPct === null ? ratePct : rPct;
  const [daysToExpiry, setDaysToExpiry] = useState(30);

  const results = useMemo(() => {
    const r = rEfectivo / 100;
    const q = qPct / 100;
    const T = daysToExpiry / 365;
    const fairValue = spotPrice * Math.exp((r - q) * T);
    const basis = fairValue - spotPrice;
    const basisPct = (basis / spotPrice) * 100;
    let marketState = 'parity';
    if (basis > 0.01) marketState = 'contango';
    if (basis < -0.01) marketState = 'backwardation';
    return { fairValue, basis, basisPct, marketState };
  }, [spotPrice, rEfectivo, qPct, daysToExpiry]);

  const stateColors = {
    contango: 'text-[#f59e0b]',
    backwardation: 'text-[#22c55e]',
    parity: 'text-muted-foreground',
  };

  const stateLabels = {
    contango: t('futContango'),
    backwardation: t('futBackwardation'),
    parity: t('futParity'),
  };

  return (
    <div className="space-y-4">
      <NumInput label={t('futSpotPrice')} value={spotPrice} onChange={setSpotPrice} step={0.01} />
      <div>
        <NumInput label={t('futRiskFreeRate')} value={rEfectivo} onChange={setRPct} step={0.1} />
        {/* De dónde sale el tipo. Presentarlo sin procedencia es presentarlo
            como una cotización cuando puede ser un valor de reserva. */}
        <p className="text-[10px] text-muted-foreground mt-1" data-testid="fut-rate-source">
          {isLive ? t('optRiskFreeLive') : t('optRiskFreeFallback')}
          {source ? ` (${source})` : ''}
        </p>
      </div>
      <NumInput label={t('futConvYield')} value={qPct} onChange={setQPct} step={0.1} />
      <NumInput label={t('futDaysToExpiry')} value={daysToExpiry} onChange={setDaysToExpiry} step={1} min={1} />

      <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-0.5">
        <ResultRow label={t('futTheoreticalPrice')} value={`$${numFmt(results.fairValue, 4)}`} color="text-primary font-bold" />
        <ResultRow
          label={t('futBasis')}
          value={`${results.basis >= 0 ? '+' : ''}$${numFmt(results.basis, 4)}`}
          color={results.basis >= 0 ? 'text-[#f59e0b]' : 'text-[#22c55e]'}
        />
        <ResultRow
          label={t('futBasisPct')}
          value={`${results.basisPct >= 0 ? '+' : ''}${numFmt(results.basisPct, 4)}%`}
        />
      </div>

      <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
        results.marketState === 'contango'
          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#fbbf24]'
          : results.marketState === 'backwardation'
          ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#4ade80]'
          : 'bg-muted border-border text-muted-foreground'
      }`}>
        {stateLabels[results.marketState]}
      </div>

      <p className="text-xs text-muted-foreground font-mono">{t('futFairValueFormula')}</p>
    </div>
  );
}

export function FuturesCalculator() {
  const { t } = useTranslation();

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('futuresCalcTitle')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescFutures')}
        </CardDescription>
        <p className="text-xs text-muted-foreground">{t('futuresCalcSubtitle')}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="specs" className="space-y-4">
          <TabsList className="bg-muted border border-border p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="specs" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {t('futSubSpecs')}
            </TabsTrigger>
            <TabsTrigger value="pnl" className="text-xs data-[state=active]:bg-[#22c55e] data-[state=active]:text-white">
              {t('futSubPnl')}
            </TabsTrigger>
            <TabsTrigger value="margin" className="text-xs data-[state=active]:bg-[#f59e0b] data-[state=active]:text-black">
              {t('futSubMargin')}
            </TabsTrigger>
            <TabsTrigger value="fairvalue" className="text-xs data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              {t('futSubFairValue')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="specs">
            <SpecsTab t={t} />
          </TabsContent>
          <TabsContent value="pnl">
            <PnLTab t={t} />
          </TabsContent>
          <TabsContent value="margin">
            <MarginTab t={t} />
          </TabsContent>
          <TabsContent value="fairvalue">
            <FairValueTab t={t} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
