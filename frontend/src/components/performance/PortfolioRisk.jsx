import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { getPortfolioRisk } from '@/services/performanceApi';
import { CargaArco } from '@/components/common/BrandLoading';

/**
 * Riesgo de la cuenta: calor abierto, correlación y topes de pérdida.
 *
 * `portfolio_risk.py` y su ruta llevaban terminados y sin pantalla desde hacía
 * meses (`docs/RUTAS_MUERTAS.md`, hueco G-14). Esta es la pantalla.
 *
 * ⚠️ Lo que NO se puede ocultar
 * ----------------------------
 * El backend lo deja escrito en un comentario y aquí se cumple: las posiciones
 * SIN STOP y aquellas cuyo riesgo no se puede traducir a dinero —falta el
 * tamaño de contrato— **no suman al calor**. Pintar un 3 % tranquilizador
 * callando que hay cuatro posiciones que no entran en la cuenta es peor que no
 * pintar nada: el número sería técnicamente correcto y prácticamente mentira.
 * Por eso el aviso va ARRIBA y en el color de riesgo, no en una nota al pie.
 */
export default function PortfolioRisk() {
  const { t } = useTranslation();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await getPortfolioRisk({}));
    } catch (err) {
      setError(err?.response?.data?.detail || t('riesgoCarteraError'));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-14" data-testid="riesgo-cartera-cargando">
        <CargaArco className="w-8 h-8" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground"
           data-testid="riesgo-cartera-error">
        {error}
      </div>
    );
  }

  const heat = datos?.heat || {};
  const limits = datos?.limits || {};
  const umbrales = heat.thresholds || {};
  const abiertas = heat.open_positions || 0;
  const sinStop = heat.positions_without_stop || 0;
  const sinCuantificar = heat.positions_risk_unquantifiable || 0;
  const incompleto = sinStop > 0 || sinCuantificar > 0;

  // El color sale del nivel que calcula el backend, no de un umbral repetido aquí.
  const tono = heat.level === 'critical' ? 'text-short'
    : heat.level === 'warning' ? 'text-warn' : 'text-long';

  const pct = (v) => (typeof v === 'number' ? `${v.toFixed(2)} %` : '—');
  const dinero = (v) => (typeof v === 'number' ? v.toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) : '—');

  if (!abiertas) {
    return (
      <div className="rounded-xl border border-border bg-card p-6" data-testid="riesgo-cartera-vacio">
        <h3 className="font-semibold mb-1.5">{t('riesgoCarteraTitulo')}</h3>
        <p className="text-sm text-muted-foreground">{t('riesgoCarteraSinPosiciones')}</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden" data-testid="riesgo-cartera">
      <header className="px-6 pt-5 pb-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          {t('riesgoCarteraTitulo')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{t('riesgoCarteraSub')}</p>
      </header>

      {/* El aviso va primero: sin él, el calor de abajo se lee como completo. */}
      {incompleto && (
        <div className="mx-6 mt-4 flex gap-2.5 rounded-sharp border border-warn/40 bg-warn/10 px-4 py-3"
             data-testid="riesgo-incompleto">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warn" />
          <p className="text-sm text-warn leading-relaxed">
            {t('riesgoCarteraIncompleto', { sinStop, sinCuantificar })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mt-4">
        <Cifra k={t('riesgoCalor')} v={pct(heat.heat_pct)} tono={tono} />
        <Cifra k={t('riesgoCalorEfectivo')} v={pct(heat.effective_heat_pct)}
               pie={t('riesgoCorrelacionUsada', { c: heat.correlation_used })} />
        <Cifra k={t('riesgoEnRiesgo')} v={dinero(heat.total_risk)} />
        <Cifra k={t('riesgoAbiertas')} v={String(abiertas)} />
      </div>

      {typeof umbrales.warning === 'number' && (
        <p className="px-6 pt-3 text-xs text-muted-foreground">
          {t('riesgoUmbrales', { aviso: umbrales.warning, critico: umbrales.critical })}
        </p>
      )}

      {/* Topes de pérdida */}
      <div className="px-6 py-5 mt-2 border-t border-border grid gap-3">
        {['day', 'week'].map((k) => {
          const l = limits[k] || {};
          if (typeof l.limit_pct !== 'number') return null;
          return (
            <div key={k} className="flex items-center justify-between gap-4 text-sm"
                 data-testid={`riesgo-limite-${k}`}>
              <span className="text-muted-foreground">
                {k === 'day' ? t('riesgoLimiteDia') : t('riesgoLimiteSemana')}
              </span>
              <span className="flex items-center gap-3 font-mono tabular-nums">
                <span className={l.pnl < 0 ? 'text-short' : 'text-long'}>{pct(l.pnl_pct)}</span>
                <span className="text-muted-foreground">/ {pct(l.limit_pct)}</span>
                {l.breached
                  ? <span className="text-short font-sans font-medium">{t('riesgoSuperado')}</span>
                  : <span className="text-muted-foreground font-sans">
                      {t('riesgoQueda', { p: (l.remaining_pct ?? 0).toFixed(2) })}
                    </span>}
              </span>
            </div>
          );
        })}
        {limits.blocked && (
          <div className="flex gap-2.5 rounded-sharp border border-short/40 bg-short/10 px-4 py-3 mt-1"
               data-testid="riesgo-bloqueado">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-short" />
            <p className="text-sm text-short">{t('riesgoBloqueado')}</p>
          </div>
        )}
      </div>

      {/* Por grupo de correlación: dónde el riesgo es la misma apuesta repetida */}
      {heat.by_correlation_group?.length > 1 && (
        <div className="px-6 pb-6 border-t border-border pt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {t('riesgoPorGrupo')}
          </p>
          <div className="grid gap-1.5">
            {heat.by_correlation_group.map((g) => (
              <div key={g.group} className="flex items-center justify-between gap-4 text-sm">
                <span>{g.group} <span className="text-muted-foreground">({g.positions})</span></span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {pct(g.risk_pct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Cifra({ k, v, tono = '', pie }) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</p>
      <p className={`font-mono tabular-nums text-2xl mt-1.5 ${tono}`}>{v}</p>
      {pie && <p className="text-[11px] text-muted-foreground mt-1">{pie}</p>}
    </div>
  );
}
