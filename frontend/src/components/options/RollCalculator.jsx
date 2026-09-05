import React, { useMemo, useState } from 'react';
import { RefreshCw, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * RollCalculator — what a roll actually costs you.
 *
 * Closes the loop on the rollover material added from the PDF: the theory says
 * "check the net debit/credit, the change in theta and delta, and what you're
 * paying per extra day". This does that arithmetic.
 *
 * Deliberate design choice: this does NOT re-price the options with
 * Black-Scholes. You type the premiums your broker is quoting, because the
 * quoted price already contains the spread and the real implied volatility —
 * a model price would be tidier and less true. The Black-Scholes calculator
 * lives in its own tab for when you want the theoretical value.
 */

const UI = {
  es: {
    title: 'Calculadora de roll',
    lead: 'Introduce lo que te cotiza tu bróker para la posición actual y para la candidata. Te dice el flujo neto, cómo cambia el riesgo y cuánto pagas por cada día extra que compras.',
    current: 'Posición actual (la que cierras)',
    candidate: 'Posición nueva (la que abres)',
    premium: 'Prima',
    delta: 'Delta',
    theta: 'Theta (día)',
    dte: 'Días a vencimiento',
    contracts: 'Contratos',
    multiplier: 'Multiplicador',
    fees: 'Comisiones por pata',
    short: 'Posición vendida (cobraste la prima)',
    netFlow: 'Flujo neto',
    debit: 'Débito (pagas)',
    credit: 'Crédito (cobras)',
    daysBought: 'Días comprados',
    costPerDay: 'Coste por día',
    deltaChange: 'Cambio de delta',
    thetaChange: 'Cambio de theta',
    perDay: '/día',
    verdict: 'Lectura',
    vDebitLong: 'Pagas por más tiempo. Solo tiene sentido si tu tesis sigue viva y el nuevo strike encaja mejor con el escenario de ahora.',
    vCreditLong: 'Sales con crédito: recuperas parte de la prima al alargar. Comprueba que no estás reduciendo tanto la delta que la posición ya no capture el movimiento que esperas.',
    vNoTime: 'No estás comprando tiempo: el vencimiento nuevo no es posterior. Eso no es un roll, es cambiar de posición.',
    vThetaWorse: 'La theta empeora: la posición nueva pierde más valor por día que la actual.',
    vThetaBetter: 'La theta mejora: la posición nueva se deteriora más despacio.',
    warn: 'Rolar NO elimina una pérdida: la desplaza en el tiempo y muchas veces la redistribuye. Si la tesis original ya no se sostiene, cerrar es una decisión válida.',
  },
  en: {
    title: 'Roll calculator',
    lead: "Enter what your broker is quoting for the current position and the candidate. It gives you the net flow, how the risk changes, and what you're paying per extra day bought.",
    current: 'Current position (the one you close)',
    candidate: 'New position (the one you open)',
    premium: 'Premium',
    delta: 'Delta',
    theta: 'Theta (day)',
    dte: 'Days to expiry',
    contracts: 'Contracts',
    multiplier: 'Multiplier',
    fees: 'Fees per leg',
    short: 'Short position (you collected the premium)',
    netFlow: 'Net flow',
    debit: 'Debit (you pay)',
    credit: 'Credit (you receive)',
    daysBought: 'Days bought',
    costPerDay: 'Cost per day',
    deltaChange: 'Delta change',
    thetaChange: 'Theta change',
    perDay: '/day',
    verdict: 'Reading',
    vDebitLong: 'You are paying for more time. Only worth it if your thesis is still alive and the new strike fits the current scenario better.',
    vCreditLong: 'You roll for a credit: you take back part of the premium while extending. Check you are not cutting delta so far that the position no longer captures the move you expect.',
    vNoTime: 'You are not buying time: the new expiry is not later. That is not a roll, it is a different position.',
    vThetaWorse: 'Theta gets worse: the new position bleeds more value per day than the current one.',
    vThetaBetter: 'Theta improves: the new position decays more slowly.',
    warn: 'Rolling does NOT remove a loss: it moves it in time and often redistributes it. If the original thesis no longer holds, closing is a valid decision.',
  },
};

const n = (v) => {
  const x = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};
const fmt = (v, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

const Field = ({ label, value, onChange, step = 'any', suffix }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="relative mt-1">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 rounded-md border border-border bg-background px-2 pr-8 font-mono text-sm"
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </label>
);

const Out = ({ label, value, hint, tone = '' }) => (
  <div className={`rounded-lg border p-3 ${tone || 'border-border bg-muted/30'}`}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="font-mono font-bold text-base">{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
  </div>
);

export default function RollCalculator() {
  const { locale } = useTranslation();
  const L = UI[locale === 'es' ? 'es' : 'en'];

  const [isShort, setIsShort] = useState(false);
  const [contracts, setContracts] = useState('1');
  const [mult, setMult] = useState('100');
  const [fees, setFees] = useState('1');

  const [curPrem, setCurPrem] = useState('1.20');
  const [curDelta, setCurDelta] = useState('0.35');
  const [curTheta, setCurTheta] = useState('-0.05');
  const [curDte, setCurDte] = useState('7');

  const [newPrem, setNewPrem] = useState('2.60');
  const [newDelta, setNewDelta] = useState('0.42');
  const [newTheta, setNewTheta] = useState('-0.03');
  const [newDte, setNewDte] = useState('45');

  const r = useMemo(() => {
    const qty = Math.abs(n(contracts)) * Math.abs(n(mult));
    const feeTotal = Math.abs(n(fees)) * 2 * Math.abs(n(contracts)); // two legs

    // Long: you SELL the old (cash in) and BUY the new (cash out).
    // Short: you BUY BACK the old (cash out) and SELL the new (cash in).
    const closeFlow = isShort ? -n(curPrem) * qty : n(curPrem) * qty;
    const openFlow = isShort ? n(newPrem) * qty : -n(newPrem) * qty;
    const net = closeFlow + openFlow - feeTotal;

    const daysBought = n(newDte) - n(curDte);
    const costPerDay = daysBought > 0 ? Math.abs(net) / daysBought : null;

    const dDelta = n(newDelta) - n(curDelta);
    const dTheta = n(newTheta) - n(curTheta);
    // Theta is normally negative for a long option: less negative = better.
    const thetaBetter = Math.abs(n(newTheta)) < Math.abs(n(curTheta));

    return { net, daysBought, costPerDay, dDelta, dTheta, thetaBetter, feeTotal, qty };
  }, [isShort, contracts, mult, fees, curPrem, curDelta, curTheta, curDte, newPrem, newDelta, newTheta, newDte]);

  const isCredit = r.net > 0;

  return (
    <section className="space-y-4" data-testid="roll-calculator">
      <div>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <RefreshCw className="w-4 h-4 text-primary" /> {L.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">{L.lead}</p>
      </div>

      {/* Shared parameters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Field label={L.contracts} value={contracts} onChange={setContracts} />
        <Field label={L.multiplier} value={mult} onChange={setMult} />
        <Field label={L.fees} value={fees} onChange={setFees} />
        <label className="flex items-end gap-2 pb-1">
          <input
            type="checkbox"
            checked={isShort}
            onChange={(e) => setIsShort(e.target.checked)}
            className="w-4 h-4 accent-current"
            data-testid="roll-is-short"
          />
          <span className="text-[11px] text-muted-foreground leading-tight">{L.short}</span>
        </label>
      </div>

      {/* The two legs */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-bold mb-2">{L.current}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.premium} value={curPrem} onChange={setCurPrem} step="0.01" />
            <Field label={L.dte} value={curDte} onChange={setCurDte} />
            <Field label={L.delta} value={curDelta} onChange={setCurDelta} step="0.01" />
            <Field label={L.theta} value={curTheta} onChange={setCurTheta} step="0.01" />
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto rotate-90 md:rotate-0" />

        <div className="rounded-xl border border-primary/40 bg-card p-3">
          <div className="text-xs font-bold mb-2">{L.candidate}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.premium} value={newPrem} onChange={setNewPrem} step="0.01" />
            <Field label={L.dte} value={newDte} onChange={setNewDte} />
            <Field label={L.delta} value={newDelta} onChange={setNewDelta} step="0.01" />
            <Field label={L.theta} value={newTheta} onChange={setNewTheta} step="0.01" />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Out
          label={L.netFlow}
          value={`${isCredit ? '+' : ''}${fmt(r.net)}`}
          hint={isCredit ? L.credit : L.debit}
          tone={isCredit ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}
        />
        <Out label={L.daysBought} value={r.daysBought > 0 ? `+${r.daysBought}` : String(r.daysBought)} />
        <Out
          label={L.costPerDay}
          value={r.costPerDay === null ? '—' : `${fmt(r.costPerDay)}${L.perDay}`}
        />
        <Out
          label={L.deltaChange}
          value={`${r.dDelta >= 0 ? '+' : ''}${fmt(r.dDelta, 3)}`}
        />
      </div>

      {/* Reading */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">{L.verdict}</div>
        <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          {r.daysBought <= 0 ? (
            <li className="flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warn" />
              <span>{L.vNoTime}</span>
            </li>
          ) : (
            <li className="flex gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <span>{isCredit ? L.vCreditLong : L.vDebitLong}</span>
            </li>
          )}
          <li className="flex gap-2">
            <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${r.thetaBetter ? 'text-long' : 'text-warn'}`} />
            <span>
              {r.thetaBetter ? L.vThetaBetter : L.vThetaWorse}{' '}
              <span className="font-mono">
                ({r.dTheta >= 0 ? '+' : ''}{fmt(r.dTheta, 3)})
              </span>
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex gap-2.5">
        <AlertTriangle className="w-4 h-4 text-short shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">{L.warn}</p>
      </div>
    </section>
  );
}
