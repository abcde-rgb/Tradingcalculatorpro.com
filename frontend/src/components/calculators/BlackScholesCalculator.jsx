import { useState, useMemo, useEffect, useRef } from 'react';
import { Activity, Sigma } from 'lucide-react';
import { useRiskFreeRate } from '@/hooks/useRiskFreeRate';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import {
  callPrice,
  putPrice,
  delta,
  gamma,
  theta,
  vega,
  rho,
} from '@/utils/blackScholes';

// d1/d2 helper (inline, avoids needing to export from blackScholes)
function computeD1D2(S, K, T, r, sigma, q) {
  if (T <= 0 || sigma <= 0) return { d1: 0, d2: 0 };
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return { d1, d2 };
}

function moneyness(S, K) {
  const diff = (S - K) / K;
  if (Math.abs(diff) < 0.005) return 'ATM';
  return diff > 0 ? 'ITM' : 'OTM';
}

function fmt(n, decimals = 4) {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function SliderInput({ label, value, onChange, min, max, step, unit = '' }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <span className="font-mono text-sm font-bold text-primary">
          {value}{unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="py-2"
      />
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        min={min}
        max={max}
        step={step}
        className="font-mono bg-muted border-border text-sm h-8"
      />
    </div>
  );
}

/**
 * Despeja la volatilidad implícita desde el precio al que cotiza la opción.
 *
 * `POST /api/calculate/implied-volatility` llevaba terminado y sin pantalla
 * (hueco G-14). Sin esto, la app sólo puede tragarse la IV que le dé el
 * proveedor, que en strikes ilíquidos es basura o un 0,30 por defecto.
 *
 * Lo importante es el caso que falla: cuando ninguna volatilidad reproduce ese
 * precio —la cotización está fuera de los límites de no arbitraje o el contrato
 * ya venció—, el backend devuelve `null` y su motivo. Aquí se enseña el motivo
 * y NO se toca el deslizador: rellenarlo con un número plausible sería
 * exactamente lo que esta ruta existe para no hacer.
 */
function DespejarIV({ S, K, T_days, r_pct, q_pct, onResuelta }) {
  const { t } = useTranslation();
  const [precio, setPrecio] = useState('');
  const [tipo, setTipo] = useState('call');
  const [ocupado, setOcupado] = useState(false);
  const [motivo, setMotivo] = useState(null);

  const API = process.env.REACT_APP_BACKEND_URL;

  const despejar = async () => {
    const marketPrice = parseFloat(precio);
    if (!API || !isFinite(marketPrice) || marketPrice <= 0) return;
    setOcupado(true);
    setMotivo(null);
    try {
      const res = await fetch(`${API}/api/calculate/implied-volatility`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketPrice, stockPrice: S, strike: K, daysToExpiry: T_days,
          optionType: tipo, riskFreeRate: r_pct / 100, dividendYield: q_pct / 100,
        }),
      });
      const d = await res.json();
      if (d?.solved && typeof d.impliedVolatilityPct === 'number') {
        onResuelta(Number(d.impliedVolatilityPct.toFixed(2)));
        toast.success(t('ivDespejada', { v: d.impliedVolatilityPct.toFixed(2) }));
      } else {
        // Ni se rellena el deslizador ni se pone un valor «razonable».
        setMotivo(t('ivSinSolucion'));
      }
    } catch (_) {
      setMotivo(t('ivError'));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="rounded-sharp border border-border bg-muted/30 p-3 space-y-2" data-testid="despejar-iv">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Sigma className="w-3.5 h-3.5" /> {t('ivDesdePrecio')}
      </Label>
      <div className="flex gap-2">
        <Input
          type="number" value={precio} onChange={(e) => setPrecio(e.target.value)}
          placeholder={t('ivPrecioMercado')} min={0} step="0.01"
          className="font-mono bg-muted border-border text-sm h-8"
          data-testid="iv-precio"
        />
        <select
          value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="h-8 rounded-sharp border border-border bg-muted text-sm px-2"
          aria-label={t('ivTipoOpcion')}
          data-testid="iv-tipo"
        >
          <option value="call">Call</option>
          <option value="put">Put</option>
        </select>
        <Button
          size="sm" variant="outline" onClick={despejar}
          disabled={ocupado || !precio}
          className="h-8 shrink-0" data-testid="iv-despejar"
        >
          {t('ivDespejar')}
        </Button>
      </div>
      {motivo && (
        <p className="text-[11px] text-warn leading-relaxed" data-testid="iv-motivo">{motivo}</p>
      )}
    </div>
  );
}

export const BlackScholesCalculator = () => {
  const { t } = useTranslation();

  const [S, setS] = useState(100);
  const [K, setK] = useState(100);
  const [T_days, setTDays] = useState(30);
  /**
   * El tipo libre de riesgo, del backend y no de un literal.
   *
   * Estaba escrito `useState(5.0)`, que es exactamente el bug que el propio
   * `CLAUDE.md` prohíbe («un 0.05 suelto es un bug») y que ya se pagó una vez:
   * el frontend valoraba con 5 % mientras el backend usaba el ^IRX en vivo, así
   * que Rho era decorativo y las dos mitades de la app discrepaban sobre la
   * misma posición. Aquí el valor entra desde `useRiskFreeRate` y el usuario
   * puede moverlo — pero parte de lo que se cotiza de verdad, no de un 5 %.
   */
  const { ratePct, isLive, source, resolved } = useRiskFreeRate();
  const [r_pct, setRPct] = useState(ratePct);
  const tocadoPorElUsuario = useRef(false);

  // Cuando llega el tipo real se adopta, salvo que el usuario ya lo haya movido:
  // pisarle un valor que acaba de teclear sería peor que empezar con el genérico.
  useEffect(() => {
    if (resolved && !tocadoPorElUsuario.current) setRPct(ratePct);
  }, [resolved, ratePct]);
  const [sigma_pct, setSigmaPct] = useState(25.0);
  const [q_pct, setQPct] = useState(0.0);
  const [showD1D2, setShowD1D2] = useState(false);

  const results = useMemo(() => {
    const T = Math.max(0, T_days / 365);
    const r = r_pct / 100;
    const sigma = Math.max(0.001, sigma_pct / 100);
    const q = q_pct / 100;

    if (S <= 0 || K <= 0) return null;

    const call = callPrice(S, K, T, r, sigma, q);
    const put = putPrice(S, K, T, r, sigma, q);

    const intrinsicCall = Math.max(0, S - K);
    const intrinsicPut = Math.max(0, K - S);
    const timeValueCall = Math.max(0, call - intrinsicCall);
    const timeValuePut = Math.max(0, put - intrinsicPut);

    const greeks = {
      call: {
        delta: delta(S, K, T, r, sigma, 'call', q),
        gamma: gamma(S, K, T, r, sigma, q),
        theta: theta(S, K, T, r, sigma, 'call', q),
        vega: vega(S, K, T, r, sigma, q),
        rho: rho(S, K, T, r, sigma, 'call', q),
      },
      put: {
        delta: delta(S, K, T, r, sigma, 'put', q),
        gamma: gamma(S, K, T, r, sigma, q),
        theta: theta(S, K, T, r, sigma, 'put', q),
        vega: vega(S, K, T, r, sigma, q),
        rho: rho(S, K, T, r, sigma, 'put', q),
      },
    };

    const { d1, d2 } = computeD1D2(S, K, T, r, sigma, q);

    return {
      call, put,
      intrinsicCall, intrinsicPut,
      timeValueCall, timeValuePut,
      greeks,
      d1, d2,
      money: moneyness(S, K),
    };
  }, [S, K, T_days, r_pct, sigma_pct, q_pct]);

  const moneyBadge = results ? results.money : 'ATM';
  const moneyColor =
    moneyBadge === 'ITM' ? 'bg-primary/10 text-primary border-primary/30' :
    moneyBadge === 'OTM' ? 'bg-destructive/10 text-destructive border-destructive/30' :
    'bg-accent/10 text-accent border-accent/30';

  const moneyLabel =
    moneyBadge === 'ITM' ? t('bsITM') :
    moneyBadge === 'OTM' ? t('bsOTM') :
    t('bsATM');

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {t('bsTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('bsSubtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT — Inputs */}
          <div className="space-y-5">
            <SliderInput
              label={t('bsSpotPrice')}
              value={S}
              onChange={setS}
              min={1}
              max={10000}
              step={1}
            />
            <SliderInput
              label={t('bsStrikePrice')}
              value={K}
              onChange={setK}
              min={1}
              max={10000}
              step={1}
            />
            <SliderInput
              label={t('bsDaysToExpiry')}
              value={T_days}
              onChange={setTDays}
              min={1}
              max={730}
              step={1}
              unit=" d"
            />
            <div>
              <SliderInput
                label={t('bsRiskFreeRate')}
                value={r_pct}
                onChange={(v) => { tocadoPorElUsuario.current = true; setRPct(v); }}
                min={0}
                max={20}
                step={0.1}
                unit="%"
              />
              {/* De dónde sale el número. `isLive` en false significa caché vieja
                  o valor de respaldo, y eso se dice: presentarlo como una
                  cotización cuando no lo es es inventarse un dato. */}
              <p className="text-[11px] text-muted-foreground mt-1" data-testid="bs-rate-origen">
                {isLive ? t('bsRateEnVivo', { fuente: source }) : t('bsRateRespaldo')}
              </p>
            </div>
            <DespejarIV
              S={S} K={K} T_days={T_days} r_pct={r_pct} q_pct={q_pct}
              onResuelta={setSigmaPct}
            />
            <SliderInput
              label={t('bsVolatility')}
              value={sigma_pct}
              onChange={setSigmaPct}
              min={1}
              max={200}
              step={0.5}
              unit="%"
            />
            <SliderInput
              label={t('bsDividendYield')}
              value={q_pct}
              onChange={setQPct}
              min={0}
              max={20}
              step={0.1}
              unit="%"
            />

            {/* Moneyness badge */}
            {results && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${moneyColor}`}>
                {moneyLabel} — S={S} / K={K}
              </div>
            )}
          </div>

          {/* RIGHT — Outputs */}
          {results ? (
            <div className="space-y-4">
              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t('bsCallPrice')}
                  </p>
                  <p className="font-mono text-2xl font-bold text-primary">
                    ${fmt(results.call, 2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {t('bsPutPrice')}
                  </p>
                  <p className="font-mono text-2xl font-bold text-destructive">
                    ${fmt(results.put, 2)}
                  </p>
                </div>
              </div>

              {/* Intrinsic / Time Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('bsCallPrice')} — {t('bsIntrinsicValue')} / {t('bsTimeValue')}
                  </p>
                  <div className="flex gap-4">
                    <span className="font-mono text-sm">
                      <span className="text-muted-foreground text-xs">IV </span>
                      ${fmt(results.intrinsicCall, 2)}
                    </span>
                    <span className="font-mono text-sm">
                      <span className="text-muted-foreground text-xs">TV </span>
                      ${fmt(results.timeValueCall, 2)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('bsPutPrice')} — {t('bsIntrinsicValue')} / {t('bsTimeValue')}
                  </p>
                  <div className="flex gap-4">
                    <span className="font-mono text-sm">
                      <span className="text-muted-foreground text-xs">IV </span>
                      ${fmt(results.intrinsicPut, 2)}
                    </span>
                    <span className="font-mono text-sm">
                      <span className="text-muted-foreground text-xs">TV </span>
                      ${fmt(results.timeValuePut, 2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Greeks table */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {t('bsGreeks')}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1 pr-4">Greek</th>
                        <th className="text-right py-1 pr-4">{t('bsCallOption')}</th>
                        <th className="text-right py-1">{t('bsPutOption')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr>
                        <td className="py-1.5 pr-4 text-muted-foreground">{t('bsDelta')}</td>
                        <td className="text-right pr-4 text-primary">{fmt(results.greeks.call.delta)}</td>
                        <td className="text-right text-destructive">{fmt(results.greeks.put.delta)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-muted-foreground">{t('bsGamma')}</td>
                        <td className="text-right pr-4">{fmt(results.greeks.call.gamma)}</td>
                        <td className="text-right">{fmt(results.greeks.put.gamma)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-muted-foreground">{t('bsTheta')}</td>
                        <td className="text-right pr-4 text-destructive">{fmt(results.greeks.call.theta)}</td>
                        <td className="text-right text-destructive">{fmt(results.greeks.put.theta)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-muted-foreground">{t('bsVega')}</td>
                        <td className="text-right pr-4">{fmt(results.greeks.call.vega)}</td>
                        <td className="text-right">{fmt(results.greeks.put.vega)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-muted-foreground">{t('bsRho')}</td>
                        <td className="text-right pr-4 text-primary">{fmt(results.greeks.call.rho)}</td>
                        <td className="text-right text-destructive">{fmt(results.greeks.put.rho)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* d1 / d2 collapsible */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => setShowD1D2((v) => !v)}
                >
                  <span>{t('bsD1D2')}</span>
                  <span className="text-lg leading-none">{showD1D2 ? '−' : '+'}</span>
                </button>
                {showD1D2 && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-4 bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">d1</p>
                      <p className="font-mono text-sm">{fmt(results.d1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">d2</p>
                      <p className="font-mono text-sm">{fmt(results.d2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              —
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
