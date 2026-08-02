import React, { useEffect, useState } from 'react';
import { Crosshair, Activity, Scale } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Dónde está colocado el mercado: max pain, gamma exposure, perfil de interés
 * abierto y ratio put/call.
 *
 * Estas cuatro métricas existían sólo como texto en el centro educativo, con
 * los datos de interés abierto ya en la cadena y el cálculo sin hacer. Son
 * lecturas de posicionamiento OBSERVADO, así que cuando el proveedor no da
 * cadena real el backend devuelve todo a `null` y aquí se dice, en vez de
 * pintar un max pain inventado que en pantalla es indistinguible del bueno.
 */

const fmtCompact = (n) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

const Metric = ({ icon: Icon, label, value, hint, tone = 'muted' }) => (
  <div className="bg-card border border-border rounded-lg px-3 py-2">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
    </div>
    <span
      className={`block text-sm font-bold font-mono tabular-nums mt-1 ${
        tone === 'up' ? 'text-[#22c55e]' : tone === 'down' ? 'text-[#ef4444]' : 'text-foreground'
      }`}
    >
      {value}
    </span>
    {hint && <span className="block text-[10px] text-muted-foreground mt-0.5">{hint}</span>}
  </div>
);

const PositioningPanel = ({ symbol, expirationIdx = 3, stockPrice }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!API || !symbol) return undefined;
    let alive = true;
    setLoading(true);
    fetch(`${API}/api/options/positioning/${symbol}?expiration_idx=${expirationIdx}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol, expirationIdx]);

  if (loading && !data) {
    return <p className="text-xs text-muted-foreground">{t('optPositioningLoading')}</p>;
  }
  if (!data) return null;

  const { maxPain, gex, openInterestProfile, putCallRatio, expectedMove } = data;

  // Sin posicionamiento observable no hay nada que leer. Se dice explícitamente
  // en vez de pintar cuatro guiones sin explicación.
  const nothingObserved = !maxPain && !gex && !openInterestProfile && !putCallRatio;

  const profileMax = openInterestProfile
    ? Math.max(...openInterestProfile.map((r) => r.totalOI || 0), 1)
    : 1;

  return (
    <div className="space-y-3" data-testid="positioning-panel">
      {nothingObserved && (
        <div className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2">
          <p className="text-[11px] text-[#f59e0b]">{t('optPositioningUnavailable')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric
          icon={Crosshair}
          label={t('optMaxPain')}
          value={maxPain ? `$${maxPain.strike.toFixed(2)}` : '—'}
          hint={
            maxPain && stockPrice
              ? `${maxPain.strike > stockPrice ? '+' : ''}${(((maxPain.strike - stockPrice) / stockPrice) * 100).toFixed(1)}%`
              : t('optMaxPainHint')
          }
        />
        <Metric
          icon={Activity}
          label={t('optGex')}
          value={gex ? `$${fmtCompact(gex.total)}` : '—'}
          tone={gex ? (gex.total >= 0 ? 'up' : 'down') : 'muted'}
          hint={gex ? (gex.total >= 0 ? t('optGexPositive') : t('optGexNegative')) : t('optGexHint')}
        />
        <Metric
          icon={Scale}
          label={t('optGammaFlip')}
          value={gex?.flipStrike ? `$${gex.flipStrike.toFixed(2)}` : '—'}
          hint={t('optGammaFlipHint')}
        />
        <Metric
          icon={Scale}
          label={t('optPutCallRatio')}
          value={
            putCallRatio?.byOpenInterest !== null && putCallRatio?.byOpenInterest !== undefined
              ? putCallRatio.byOpenInterest.toFixed(2)
              : '—'
          }
          hint={t('optPutCallRatioHint')}
        />
      </div>

      {expectedMove && (
        <p className="text-[11px] text-muted-foreground" data-testid="expected-move">
          {t('optExpectedMove')}:{' '}
          <span className="font-mono font-bold text-foreground">
            ±${expectedMove.absolute.toFixed(2)} ({(expectedMove.pct * 100).toFixed(1)}%)
          </span>{' '}
          — ${expectedMove.lower.toFixed(2)} / ${expectedMove.upper.toFixed(2)}
        </p>
      )}

      {openInterestProfile && (
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
            {t('optOIProfile')}
          </h4>
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
            {openInterestProfile.map((row) => {
              const width = ((row.totalOI || 0) / profileMax) * 100;
              const atSpot =
                stockPrice && Math.abs(row.strike - stockPrice) < (stockPrice * 0.005);
              return (
                <div key={row.strike} className="flex items-center gap-2">
                  <span
                    className={`w-14 text-right text-[10px] font-mono tabular-nums ${
                      atSpot ? 'text-primary font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {row.strike.toFixed(0)}
                  </span>
                  <div className="flex-1 h-3 bg-muted/40 rounded-sm overflow-hidden">
                    {/* Un strike sin OI reportado no dibuja barra: una barra de
                        ancho cero diría "nadie tiene esto", que no es lo mismo
                        que "no lo sabemos". */}
                    {row.totalOI !== null && (
                      <div
                        className="h-full bg-primary/50"
                        style={{ width: `${width}%` }}
                        title={`C ${row.callOI ?? '—'} / P ${row.putOI ?? '—'}`}
                      />
                    )}
                  </div>
                  <span className="w-14 text-[10px] font-mono tabular-nums text-muted-foreground">
                    {row.totalOI === null ? '—' : fmtCompact(row.totalOI)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gex && (
        <p className="text-[10px] text-muted-foreground">
          {t('optGexConvention')}: {gex.convention}
        </p>
      )}
    </div>
  );
};

export default PositioningPanel;
