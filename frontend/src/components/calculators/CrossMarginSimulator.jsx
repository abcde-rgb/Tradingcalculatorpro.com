import { useMemo } from 'react';
import { Layers, Trash2, AlertTriangle, Check, X, Lock } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LabelWithHelp } from '@/components/common/FieldHelp';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useTranslation } from '@/lib/i18n';
import { CFD_SPECS, resolveSpec, contractSizeFor } from '@/lib/instruments';
import {
  buildLadder, simulateLadder, marginCurve, accountState,
  sizeForCushion, absoluteMaxLots, isolatedStopDistance,
  DEFAULT_STOP_OUT_PCT, DEFAULT_MARGIN_CALL_PCT,
} from '@/lib/crossMargin';

/**
 * Simulador de escalera en margen cruzado.
 *
 * Responde la pregunta que ninguna calculadora del mercado responde. Todas
 * dicen «con X de margen puedes abrir Y». Ninguna dice si el bróker te dejará
 * abrir el SEGUNDO tramo, que es donde muere la mayoría de los planes de
 * piramidación: no en el stop-out, sino en una orden rechazada por falta de
 * margen libre cuando el flotante todavía no ha crecido lo suficiente.
 *
 * Tres cosas que no están en las demás:
 *
 *   · la **curva de margen libre**: cuánto margen disponible tienes en cada
 *     precio, es decir, en función del flotante que lleves en ese momento, con
 *     margin call y stop-out marcados sobre la misma escala;
 *   · las **dos lecturas** del mismo trade —la distancia hasta perder el margen
 *     en aislado y la distancia hasta el stop-out en cruzado—, que en oro a
 *     1:500 se diferencian en un tercio y siempre en la dirección que te hace
 *     sentir más seguro;
 *   · el **candado**, que enseña por qué cubrir no libera capital y, con el
 *     modelo de margen que cobra las dos patas, provoca el stop-out que
 *     intentabas evitar.
 *
 * Toda la matemática vive en `lib/crossMargin.js`, con cifras de referencia
 * fijadas en `scripts/engine-check.js`. Aquí sólo se pregunta y se pinta.
 *
 * El contenido que lo explica está en la Academia → Riesgo → «Margen cruzado»
 * (`?topic=cross-margin`), y los cuatro escenarios de abajo son exactamente los
 * casos trabajados de esos módulos: se abren con un clic para que el lector
 * pueda reproducir cada número en vez de creérselo.
 */

const PRESETS = {
  // Piramidar bien: separación amplia, a favor. El flotante crece más deprisa
  // que el margen y el colchón se ENSANCHA de 5,67 $ a 17,65 $.
  pyramid: { side: 'long', direction: 'with', spacing: '10', lots: '5', rungs: '5', taper: '1' },
  // El tramo que no entra: misma escalera con 5 céntimos de separación. El
  // segundo tramo pide 4.328,20 y hay 696,80. Rechazado.
  blocked: { side: 'long', direction: 'with', spacing: '0.05', lots: '5', rungs: '5', taper: '1' },
  // Promediar a la baja: en contra. También muere en el segundo tramo, pero
  // con la posición perdiendo en vez de ganando.
  average: { side: 'long', direction: 'against', spacing: '10', lots: '5', rungs: '5', taper: '1' },
  // Piramidación con tramos decrecientes: la tercera regla del manual.
  taper: { side: 'long', direction: 'with', spacing: '10', lots: '5', rungs: '5', taper: '0.6' },
};

const INITIAL = {
  symbol: 'XAUUSD',
  balance: '5000',
  leverage: '500',
  side: 'long',
  direction: 'with',
  entry: '4328.15',
  lots: '5',
  spacing: '10',
  rungs: '5',
  taper: '1',
  target: '4588.15',
  stopOutPct: String(DEFAULT_STOP_OUT_PCT),
  marginModel: 'net',
  atr: '70',
};

export function CrossMarginSimulator() {
  const { t, locale } = useTranslation();
  const [d, setD, limpiar] = usePersistedState('cross_margin_simulator_v1', INITIAL);

  const set = (k) => (v) => setD((p) => ({ ...p, [k]: v }));
  const nz = (v) => {
    const n = Number(v);
    return v === '' || v === null || !Number.isFinite(n) ? null : n;
  };

  // Formato con el idioma activo, y `—` para lo indefinido. `formatNumber` de
  // `lib/utils` fija el español y devuelve `0` para null; las dos cosas mienten
  // aquí: un colchón que no se puede calcular no es cero.
  const fmt = useMemo(() => {
    const nf = (min, max) => new Intl.NumberFormat(locale || 'es', {
      minimumFractionDigits: min, maximumFractionDigits: max,
    });
    const money = nf(2, 2);
    const px = nf(2, 2);
    const lots = nf(2, 2);
    const fine = nf(3, 3);
    return {
      money: (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : money.format(v)),
      px: (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : px.format(v)),
      lots: (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : lots.format(v)),
      fine: (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : fine.format(v)),
      pct: (v, dec = 1) => (v === null || v === undefined || !Number.isFinite(v)
        ? '—' : `${nf(dec, dec).format(v)} %`),
    };
  }, [locale]);

  const r = useMemo(() => {
    const balance = nz(d.balance);
    const leverage = nz(d.leverage);
    const entry = nz(d.entry);
    const lots = nz(d.lots);
    const spacing = nz(d.spacing);
    const rungs = nz(d.rungs);
    const target = nz(d.target);
    const atr = nz(d.atr);
    const stopOutPct = nz(d.stopOutPct) ?? DEFAULT_STOP_OUT_PCT;
    if (!balance || balance <= 0 || !leverage || leverage <= 0 || !entry || entry <= 0
      || !lots || lots <= 0 || spacing === null) return null;

    // `resolveSpec` lleva DOS argumentos: producto y símbolo. Llamarla con uno
    // solo la hace resolver el producto por defecto —contado— y devolver el
    // tamaño de contrato genérico en vez del del oro.
    const spec = resolveSpec('cfd', d.symbol);
    const contractSize = contractSizeFor('cfd', d.symbol);

    const entries = buildLadder({
      entry, lots, spacing, rungs, side: d.side, direction: d.direction, taper: nz(d.taper) ?? 1,
    });

    const sim = simulateLadder({
      balance, leverage, contractSize, side: d.side, entries, target,
      marginModel: d.marginModel, stopOutPct, marginCallPct: DEFAULT_MARGIN_CALL_PCT,
    });

    const accepted = sim.rungs.filter((x) => x.accepted);
    const openPos = accepted.map((x) => ({ lots: x.lots, entry: x.price, side: d.side }));
    const last = accepted[accepted.length - 1] || null;

    // La curva abarca del stop-out al objetivo, para que se vea el recorrido
    // completo y no sólo la parte cómoda.
    const marks = [entry, target, last?.stopOutPrice, last?.marginCallPrice]
      .filter((v) => v !== null && v !== undefined && Number.isFinite(v));
    const lo = Math.min(...marks);
    const hi = Math.max(...marks);
    const pad = (hi - lo) * 0.08 || Math.max(entry * 0.002, 0.01);

    const curve = openPos.length
      ? marginCurve({
        balance, positions: openPos, leverage, contractSize,
        from: lo - pad, to: hi + pad, steps: 140, marginModel: d.marginModel,
      })
      : [];

    // El candado, a precio de mercado y con la escalera ya abierta: qué le pasa
    // al margen usado si añades la pata contraria, bajo los tres modelos.
    const hedgePrice = last ? last.price : entry;
    const lock = openPos.length
      ? ['net', 'max', 'sum'].map((model) => {
        const before = accountState({
          balance, positions: openPos, price: hedgePrice, leverage, contractSize, marginModel: model,
        });
        const after = accountState({
          balance,
          positions: [...openPos, { lots: sim.lotsOpened, entry: hedgePrice, side: d.side === 'short' ? 'long' : 'short' }],
          price: hedgePrice, leverage, contractSize, marginModel: model,
        });
        return { model, before: before.marginUsed, after: after.marginUsed, levelAfter: after.marginLevel };
      })
      : [];

    return {
      sim, spec, contractSize, curve, entry, target, atr, lock, stopOutPct,
      leverage,
      // Las dos lecturas del MISMO trade. `isolatedStopDistance` no depende del
      // tamaño: en aislado la distancia sólo la fijan precio y apalancamiento.
      isolated: isolatedStopDistance({ price: entry, leverage }),
      crossCushion: sim.finalCushion,
      safeLots: sizeForCushion({
        balance, price: entry, leverage, contractSize, cushionPrice: atr,
        thresholdPct: stopOutPct, side: d.side,
      }),
      ceiling: absoluteMaxLots({ balance, contractSize, cushionPrice: atr }),
      stopOutPrice: last?.stopOutPrice ?? null,
      marginCallPrice: last?.marginCallPrice ?? null,
      // El catálogo lleva el tope legal minorista de la UE. Si el simulador
      // corre con más, es una entidad fuera de ese marco y hay que decirlo.
      overLegal: spec.maxLeverage && leverage > spec.maxLeverage ? spec.maxLeverage : null,
    };
  }, [d]);

  const applyPreset = (key) => setD((p) => ({ ...p, ...PRESETS[key] }));

  const field = (key, labelKey, helpKey, extra = {}) => (
    <div className="space-y-1.5">
      <LabelWithHelp
        className="text-xs uppercase tracking-wider text-muted-foreground"
        bodyKey={helpKey}
      >
        <label htmlFor={`xm-${key}`}>{t(labelKey)}</label>
      </LabelWithHelp>
      <Input
        id={`xm-${key}`}
        data-testid={`xm-${key}`}
        inputMode="decimal"
        value={d[key] ?? ''}
        onChange={(e) => set(key)(e.target.value)}
        className="rounded-sharp font-mono tabular-nums transition-[border-color] duration-tick ease-out"
        {...extra}
      />
    </div>
  );

  const chip = (active, onClick, label, testId) => (
    <button
      key={testId}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`rounded-sharp border px-3 py-1.5 text-xs transition-[border-color,color,transform]
        duration-tick ease-out active:scale-[0.985] ${active
    ? 'border-primary text-primary'
    : 'border-rule text-muted-foreground hover:border-primary/40'}`}
    >
      {label}
    </button>
  );

  return (
    <Card className="bg-card border-border" data-testid="cross-margin-simulator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" aria-hidden />
          {t('xmTitle')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed max-w-2xl">
          {t('calcDescCrossMargin')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ── Escenarios: los casos trabajados de la Academia, con un clic ── */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('xmPresets')}</p>
          <div className="flex flex-wrap gap-2">
            {chip(false, () => applyPreset('pyramid'), t('xmPresetPyramid'), 'xm-preset-pyramid')}
            {chip(false, () => applyPreset('blocked'), t('xmPresetBlocked'), 'xm-preset-blocked')}
            {chip(false, () => applyPreset('average'), t('xmPresetAverage'), 'xm-preset-average')}
            {chip(false, () => applyPreset('taper'), t('xmPresetTaper'), 'xm-preset-taper')}
          </div>
        </div>

        {/* ── Entradas ────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <LabelWithHelp
              className="text-xs uppercase tracking-wider text-muted-foreground"
              bodyKey="xmSymbolHelp"
            >
              <span>{t('xmSymbol')}</span>
            </LabelWithHelp>
            <Select value={d.symbol} onValueChange={set('symbol')}>
              <SelectTrigger data-testid="xm-symbol" className="rounded-sharp font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CFD_SPECS).map(([sym, s]) => (
                  <SelectItem key={sym} value={sym}>
                    <span className="font-mono">{sym}</span>
                    <span className="text-muted-foreground"> · {s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('balance', 'xmBalance', 'xmBalanceHelp')}
          {field('leverage', 'xmLeverage', 'xmLeverageHelp')}
          {field('entry', 'xmEntry', 'xmEntryHelp')}
          {field('lots', 'xmLots', 'xmLotsHelp')}
          {field('spacing', 'xmSpacing', 'xmSpacingHelp')}
          {field('rungs', 'xmRungs', 'xmRungsHelp')}
          {field('taper', 'xmTaper', 'xmTaperHelp')}
          {field('target', 'xmTarget', 'xmTargetHelp')}
          {field('stopOutPct', 'xmStopOut', 'xmStopOutHelp')}
          {field('atr', 'xmAtr', 'xmAtrHelp')}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chip(d.side === 'long', () => set('side')('long'), t('xmLong'), 'xm-side-long')}
          {chip(d.side === 'short', () => set('side')('short'), t('xmShort'), 'xm-side-short')}
          <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
          {chip(d.direction === 'with', () => set('direction')('with'), t('xmDirWith'), 'xm-dir-with')}
          {chip(d.direction === 'against', () => set('direction')('against'), t('xmDirAgainst'), 'xm-dir-against')}
          <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
          {['net', 'max', 'sum'].map((m) => chip(
            d.marginModel === m, () => set('marginModel')(m), t(`xmModel_${m}`), `xm-model-${m}`,
          ))}
        </div>

        {r?.overLegal && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground" data-testid="xm-legal-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-short" aria-hidden />
            {t('xmOverLegal').replace('{max}', String(r.overLegal)).replace('{sym}', d.symbol)}
          </p>
        )}

        {/* ── Veredicto ───────────────────────────────────────────────── */}
        {r && (
          <div
            className={`rounded-sharp border p-4 ${r.sim.blockedAt ? 'border-short/50 bg-short/5' : 'border-rule'}`}
            role="status"
            data-testid="xm-verdict"
          >
            <div className="flex items-start gap-3">
              {r.sim.blockedAt
                ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-short" aria-hidden />
                : <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
              <div className="space-y-1 text-sm">
                <p className="text-foreground">
                  {r.sim.blockedAt
                    ? t('xmBlockedAt').replace('{n}', String(r.sim.blockedAt))
                    : t('xmAllAccepted').replace('{n}', String(r.sim.rungs.length))}
                </p>
                <p className="text-muted-foreground">
                  {t('xmOpened')}{' '}
                  <span className="font-mono tabular-nums text-foreground">{fmt.lots(r.sim.lotsOpened)}</span>
                  {' · '}{t('xmFinalCushion')}{' '}
                  <span className="font-mono tabular-nums text-foreground">{fmt.px(r.sim.finalCushion)}</span>
                  {r.sim.minCushionAt !== null && (
                    <>
                      {' · '}{t('xmMinCushion')}{' '}
                      <span className="font-mono tabular-nums text-foreground">{fmt.px(r.sim.minCushion)}</span>
                      {' '}({t('xmAtRung').replace('{n}', String(r.sim.minCushionAt))})
                    </>
                  )}
                  {r.sim.survival !== null && (
                    <>
                      {' · '}{t('xmSurvival')}{' '}
                      <span className="font-mono tabular-nums text-foreground">
                        {fmt.pct(r.sim.survival * 100)}
                      </span>
                    </>
                  )}
                </p>
                {r.sim.atTarget && r.sim.atTarget.move !== null && r.sim.atTarget.move <= 0 && (
                  <p className="text-xs text-short" data-testid="xm-target-wrong-side">
                    {t('xmTargetWrongSide')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── La escalera ─────────────────────────────────────────────── */}
        {r && r.sim.rungs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" data-testid="xm-ladder">
              <caption className="sr-only">{t('xmTitle')}</caption>
              <thead>
                <tr className="border-b border-rule text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-normal">#</th>
                  <th scope="col" className="py-2 pr-3 font-normal">{t('xmColPrice')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmColLots')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmColNeeded')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmColFree')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmColML')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmColCushion')}</th>
                  <th scope="col" className="py-2 text-right font-normal">{t('xmColPerUnit')}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {r.sim.rungs.map((x) => (
                  <tr
                    key={x.index}
                    data-testid={`xm-rung-${x.index}`}
                    className={`border-b border-rule/60 transition-colors duration-tick ease-out
                      ${x.accepted ? 'hover:bg-muted/40' : 'text-short'}`}
                  >
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        {x.accepted
                          ? <Check className="h-3 w-3 text-muted-foreground" aria-label={t('xmAccepted')} />
                          : <X className="h-3 w-3 text-short" aria-label={t('xmRejected')} />}
                        {x.index}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{fmt.px(x.price)}</td>
                    <td className="py-2 pr-3 text-right">{fmt.lots(x.lots)}</td>
                    <td className="py-2 pr-3 text-right">{fmt.money(x.required)}</td>
                    <td className="py-2 pr-3 text-right">{fmt.money(x.available)}</td>
                    <td className="py-2 pr-3 text-right">{fmt.pct(x.state?.marginLevel)}</td>
                    <td className="py-2 pr-3 text-right">{fmt.px(x.cushion)}</td>
                    <td className="py-2 text-right">
                      {x.accepted
                        ? fmt.money(x.valuePerUnit)
                        : <span title={t('xmShortfall')}>−{fmt.money(x.shortfall)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">{t('xmTableNote')}</p>
          </div>
        )}

        {/* ── Curva de margen libre según el flotante ─────────────────── */}
        {r && r.curve.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{t('xmCurveTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('xmCurveNote')}</p>
            <div className="h-64 rounded-sharp border border-rule bg-background p-2" data-testid="xm-curve">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={r.curve} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="hsl(var(--rule))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="price" type="number" domain={['dataMin', 'dataMax']}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => fmt.px(v)}
                    stroke="hsl(var(--rule))"
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
                    stroke="hsl(var(--rule))"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--rule))',
                      borderRadius: 'var(--radius-sharp)',
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => `${t('xmColPrice')} ${fmt.px(Number(v))}`}
                    formatter={(v, n) => [fmt.money(v), t(n === 'freeMargin' ? 'xmColFree' : 'xmEquity')]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--rule))" />
                  <ReferenceLine x={r.entry} stroke="hsl(var(--muted-foreground))" />
                  {r.marginCallPrice && (
                    <ReferenceLine x={r.marginCallPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" />
                  )}
                  {r.stopOutPrice && (
                    <ReferenceLine
                      x={r.stopOutPrice} stroke="hsl(var(--short))" strokeDasharray="3 3"
                      label={{
                        value: t('xmStopOutShort'), fill: 'hsl(var(--short))', fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  {r.target && <ReferenceLine x={r.target} stroke="hsl(var(--primary))" />}
                  <Line
                    type="monotone" dataKey="freeMargin" dot={false}
                    stroke="hsl(var(--primary))" strokeWidth={1.5} isAnimationActive={false}
                  />
                  <Line
                    type="monotone" dataKey="equity" dot={false}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={1}
                    strokeDasharray="4 4" isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── La regleta: stop-out, entrada y objetivo a escala real ──── */}
        {r && r.stopOutPrice && (
          <TickScale
            marks={[
              { v: r.stopOutPrice, label: t('xmStopOutShort'), color: 'hsl(var(--short))' },
              { v: r.entry, label: t('xmEntryShort'), color: 'hsl(var(--muted-foreground))' },
              { v: r.target, label: t('xmTargetShort'), color: 'hsl(var(--primary))' },
            ]}
            format={fmt.px}
            caption={t('xmScaleCaption')}
          />
        )}

        {/* ── Las dos lecturas del mismo trade ────────────────────────── */}
        {r && (r.isolated !== null || r.crossCushion !== null) && (
          <section className="space-y-2 border-t border-rule pt-6" data-testid="xm-two-readings">
            <h3 className="text-sm font-medium text-foreground">{t('xmReadingsTitle')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Metric
                label={t('xmIsolatedLabel')}
                value={fmt.px(r.isolated)}
                hint={t('xmIsolatedHint')}
                testId="xm-isolated"
              />
              <Metric
                label={t('xmCrossLabel').replace('{pct}', String(r.stopOutPct))}
                value={fmt.px(r.crossCushion)}
                hint={t('xmCrossHint')}
                testId="xm-cross"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('xmReadingsNote')}</p>
          </section>
        )}

        {/* ── El candado ──────────────────────────────────────────────── */}
        {r && r.lock.length > 0 && (
          <section className="space-y-2 border-t border-rule pt-6" data-testid="xm-lock">
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {t('xmLockTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('xmLockNote')}</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-normal">{t('xmLockModel')}</th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmLockBefore')}</th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">{t('xmLockAfter')}</th>
                    <th scope="col" className="py-2 text-right font-normal">{t('xmLockLevel')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {r.lock.map((l) => (
                    <tr key={l.model} className="border-b border-rule/60" data-testid={`xm-lock-${l.model}`}>
                      <td className="py-2 pr-3 font-sans">{t(`xmModel_${l.model}`)}</td>
                      <td className="py-2 pr-3 text-right">{fmt.money(l.before)}</td>
                      <td className={`py-2 pr-3 text-right ${l.after > l.before ? 'text-short' : ''}`}>
                        {fmt.money(l.after)}
                      </td>
                      <td className={`py-2 text-right ${
                        l.levelAfter !== null && l.levelAfter < r.stopOutPct ? 'text-short' : ''}`}
                      >
                        {l.levelAfter === null ? t('xmInfinite') : fmt.pct(l.levelAfter, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Tamaño defendible ───────────────────────────────────────── */}
        {r && (
          <div className="grid gap-4 border-t border-rule pt-6 sm:grid-cols-3">
            <Metric
              label={t('xmSafeLots')}
              value={fmt.fine(r.safeLots)}
              hint={t('xmSafeLotsHint').replace('{atr}', fmt.px(r.atr))}
              testId="xm-safe-lots"
            />
            <Metric
              label={t('xmCeiling')}
              value={fmt.fine(r.ceiling)}
              hint={t('xmCeilingHint')}
              testId="xm-ceiling"
            />
            <Metric
              label={t('xmAtTarget')}
              value={fmt.money(r.sim.atTarget?.equity ?? null)}
              hint={r.sim.atTarget?.returnPct !== null && r.sim.atTarget
                ? `${fmt.pct(r.sim.atTarget.returnPct, 0)} ${t('xmOnBalance')}`
                : ''}
              tone={r.sim.atTarget?.returnPct === null || !r.sim.atTarget ? null
                : (r.sim.atTarget.returnPct >= 0 ? 'long' : 'short')}
              testId="xm-at-target"
            />
          </div>
        )}

        <Button
          type="button" variant="ghost" onClick={limpiar} data-testid="xm-clear"
          className="rounded-sharp text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />{t('clearShort_p006')}
        </Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, hint, tone = null, testId }) {
  const color = tone === 'long' ? 'text-long' : tone === 'short' ? 'text-short' : 'text-foreground';
  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-xl tabular-nums ${color}`}>{value ?? '—'}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * La regleta del sistema de identidad: filete con marcas verticales que mide la
 * distancia real entre stop-out, entrada y objetivo. No decora — codifica la
 * asimetría que define la operación. Cuando el colchón es de 5 $ y el objetivo
 * de 260 $, la marca del stop-out queda pegada a la de entrada y eso se ve
 * antes de leer ninguna cifra.
 *
 * Los colores llegan ya en `hsl(...)`: las variables del tema guardan el trío
 * HSL suelto (`--short: 0 84% 60%`), así que un `background: var(--short)` es
 * CSS inválido y la marca sale invisible.
 */
function TickScale({ marks, format, caption }) {
  const pts = (marks || []).filter((m) => m.v !== null && m.v !== undefined && Number.isFinite(m.v));
  if (pts.length < 2) return null;
  const lo = Math.min(...pts.map((m) => m.v));
  const hi = Math.max(...pts.map((m) => m.v));
  const span = hi - lo || 1;
  const at = (v) => ((v - lo) / span) * 100;

  return (
    <section aria-label={caption} className="pt-2" data-testid="xm-scale">
      <div className="relative h-14">
        <div className="absolute inset-x-0 top-8 h-px bg-rule" />
        {Array.from({ length: 41 }, (_, i) => (
          <span
            key={i}
            className="absolute top-8 w-px bg-rule"
            style={{ left: `${(i / 40) * 100}%`, height: i % 5 === 0 ? 6 : 3 }}
            aria-hidden
          />
        ))}
        {pts.map((m, i) => (
          <span
            key={m.label}
            className="absolute top-0"
            style={{ left: `${at(m.v)}%` }}
          >
            <span className="absolute -left-px top-4 h-8 w-0.5" style={{ background: m.color }} aria-hidden />
            <span
              className={`absolute -left-px whitespace-nowrap font-mono text-[10px] tabular-nums
                ${i % 2 ? 'top-0' : 'top-[14px]'}`}
              style={{
                color: m.color,
                transform: at(m.v) > 80 ? 'translateX(-100%)' : at(m.v) < 20 ? 'none' : 'translateX(-50%)',
              }}
            >
              {m.label} {format(m.v)}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

export default CrossMarginSimulator;
