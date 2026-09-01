import React, { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Objetivos de salida: a qué precio del subyacente y con qué prima se cierra
 * la posición en cada nivel de beneficio, y dónde está la pérdida máxima.
 *
 * El gráfico de payoff dice "cuánto gano si acaba en X". Esta tabla responde la
 * pregunta inversa, que es la que se usa para poner órdenes: "para llevarme el
 * 50% del máximo, ¿a cuánto tiene que estar el subyacente y por cuánto vendo?".
 * Sin eso, el usuario tiene que leer el objetivo a ojo sobre la curva.
 *
 * Todo sale de la MISMA curva `pnlAtExpiry` que dibuja el gráfico, así que la
 * tabla y el gráfico no pueden discrepar.
 */

const LEVELS = [0.25, 0.5, 0.75, 1];

/** Cash neto de entrada. Negativo = débito pagado; positivo = crédito cobrado. */
function entryCashFlow(legs) {
  return legs.reduce((acc, leg) => {
    if (leg.type === 'stock') return acc;
    const sign = leg.action === 'buy' ? -1 : 1;
    return acc + sign * (leg.premium || 0) * (leg.quantity || 1) * 100;
  }, 0);
}

/**
 * Precio(s) del subyacente donde la curva al vencimiento alcanza `target`.
 *
 * Devuelve el cruce más cercano al spot por cada lado. Una mariposa o un cóndor
 * alcanzan el mismo P&L por arriba y por abajo, y quedarse con uno solo daría un
 * objetivo falso para la mitad de las estrategias.
 */
function pricesAtPnl(points, target, spot) {
  const hits = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const lo = Math.min(a.pnlAtExpiry, b.pnlAtExpiry);
    const hi = Math.max(a.pnlAtExpiry, b.pnlAtExpiry);
    if (target < lo || target > hi) continue;
    const span = b.pnlAtExpiry - a.pnlAtExpiry;
    const ratio = span === 0 ? 0 : (target - a.pnlAtExpiry) / span;
    hits.push(a.price + ratio * (b.price - a.price));
  }
  if (hits.length === 0) return [];
  const below = hits.filter((p) => p <= spot).sort((x, y) => y - x)[0];
  const above = hits.filter((p) => p > spot).sort((x, y) => x - y)[0];
  return [below, above].filter((p) => typeof p === 'number');
}

const ExitTargetsTable = ({ payoffData = [], legs = [], stockPrice, commission = 0, contracts = 1 }) => {
  const { t } = useTranslation();

  const rows = useMemo(() => {
    if (!payoffData.length || !legs.length || !stockPrice) return null;

    const expPnls = payoffData.map((p) => p.pnlAtExpiry);
    const rawMaxProfit = Math.max(...expPnls);
    const rawMaxLoss = Math.min(...expPnls);
    const cash = entryCashFlow(legs);
    const isDebit = cash < 0;
    const entryCost = Math.abs(cash);
    const fees = (commission || 0) * legs.length * (contracts || 1) * 2;

    // Prima de salida: lo que vale cerrar la posición en ese punto. En un
    // débito, lo que te pagan por venderla; en un crédito, lo que cuesta
    // recomprarla. Son la misma cifra vista desde los dos lados de la mesa.
    const exitPremium = (pnl) => Math.max(0, isDebit ? entryCost + pnl : entryCost - pnl);

    const out = LEVELS.map((level) => {
      const target = rawMaxProfit * level;
      return {
        key: `tp-${level}`,
        label: level === 1 ? t('optStrategyMaxProfit') : `${t('optExitTarget')} ${level * 100}%`,
        pnl: target - fees,
        prices: pricesAtPnl(payoffData, target, stockPrice),
        premium: exitPremium(target),
        tone: 'up',
      };
    });

    out.push({
      key: 'sl',
      label: t('optStrategyMaxLoss'),
      pnl: rawMaxLoss - fees,
      prices: pricesAtPnl(payoffData, rawMaxLoss, stockPrice),
      premium: exitPremium(rawMaxLoss),
      tone: 'down',
    });

    return {
      rows: out,
      entryCost,
      isDebit,
      // El payoff se dibuja sobre una ventana de precios acotada: si la curva
      // sigue subiendo en el borde, el "máximo" es el del gráfico, no el de la
      // estrategia, y decirlo evita presentar un techo que no existe.
      openEnded:
        expPnls[expPnls.length - 1] >= rawMaxProfit - 1e-6 || expPnls[0] >= rawMaxProfit - 1e-6,
    };
  }, [payoffData, legs, stockPrice, commission, contracts, t]);

  if (!rows) {
    return <p className="text-xs text-muted-foreground">{t('optSectionNeedsPosition')}</p>;
  }

  const money = (n) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(0)}`;

  return (
    <div className="space-y-2" data-testid="exit-targets">
      <p className="text-[11px] text-muted-foreground">
        {rows.isDebit ? t('optExitFromDebit') : t('optExitFromCredit')}{' '}
        <span className="font-mono font-bold text-foreground">${rows.entryCost.toFixed(0)}</span>
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="text-left font-semibold py-1.5 pr-2">{t('optExitLevel')}</th>
              <th scope="col" className="text-right font-semibold py-1.5 px-2">{t('precioObjetivo_beefc6')}</th>
              <th scope="col" className="text-right font-semibold py-1.5 px-2">{t('prima_ua002')}</th>
              <th scope="col" className="text-right font-semibold py-1.5 pl-2">{t('optExitNet')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.rows.map((r) => (
              <tr key={r.key} className="border-t border-border/60">
                <th scope="row" className="text-left font-medium py-1.5 pr-2 text-foreground">
                  {r.label}
                </th>
                <td className="text-right py-1.5 px-2 font-mono text-foreground">
                  {r.prices.length === 0
                    ? '—'
                    : r.prices.map((p) => `$${p.toFixed(2)}`).join(' / ')}
                </td>
                <td className="text-right py-1.5 px-2 font-mono text-muted-foreground">
                  ${r.premium.toFixed(0)}
                </td>
                <td
                  className={`text-right py-1.5 pl-2 font-mono font-bold ${
                    r.tone === 'up' ? 'text-long' : 'text-short'
                  }`}
                >
                  {money(r.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.openEnded && (
        <p className="text-[10px] text-warn">{t('optExitOpenEnded')}</p>
      )}
      <p className="text-[10px] text-muted-foreground">{t('optExitNote')}</p>
    </div>
  );
};

export default ExitTargetsTable;
