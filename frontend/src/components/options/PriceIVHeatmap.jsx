import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { legPnL, frontDaysToExpiry } from '@/utils/blackScholes';

/**
 * P&L de la posición sobre una rejilla de precio × volatilidad implícita.
 *
 * El gráfico de payoff responde "cuánto gano si el precio va a X". No responde
 * la otra mitad de la pregunta, que es la que arruina a un vendedor de prima:
 * "cuánto pierdo si el precio no se mueve pero la IV sube diez puntos". Esta
 * tabla cruza ambas cosas, que es exactamente lo que se mira antes de vender
 * volatilidad y lo que la app no tenía en ninguna vista.
 *
 * Se calcula con el mismo motor que el payoff (`legPnL`), así que un cambio en
 * el modelo de precios no puede hacer que las dos vistas discrepen.
 */

const IV_SHIFTS = [-0.10, -0.05, 0, 0.05, 0.10];
const PRICE_STEPS = 11;

// Escala divergente: rojo para pérdida, verde para beneficio, con la
// intensidad ligada a la magnitud RELATIVA dentro de la propia rejilla — una
// escala absoluta pintaría de rojo intenso una pérdida de $12 en una posición
// que arriesga $2.000.
function cellColor(pnl, maxAbs) {
  if (!Number.isFinite(pnl) || maxAbs <= 0) return 'transparent';
  const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
  const alpha = 0.08 + intensity * 0.42;
  return pnl >= 0 ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
}

const PriceIVHeatmap = ({ legs = [], stockPrice, riskFreeRate, dividendYield = 0 }) => {
  const { t } = useTranslation();
  const [daysAhead, setDaysAhead] = useState(0);

  const frontDTE = useMemo(() => frontDaysToExpiry(legs), [legs]);

  const grid = useMemo(() => {
    if (!stockPrice || stockPrice <= 0 || legs.length === 0) return null;

    // El ancho de la rejilla sale del propio expected move para que las
    // columnas cubran el rango en el que la posición realmente puede acabar.
    const ivs = legs.filter((l) => l.type !== 'stock' && l.iv > 0).map((l) => l.iv);
    const sigma = ivs.length > 0 ? Math.max(...ivs) : 0.3;
    const horizon = Math.max(1, frontDTE);
    const move = stockPrice * sigma * Math.sqrt(horizon / 365);
    const span = Math.max(stockPrice * 0.05, 2 * move);

    const prices = Array.from({ length: PRICE_STEPS }, (_, i) => {
      const ratio = i / (PRICE_STEPS - 1);
      return stockPrice - span + ratio * 2 * span;
    });

    const rows = IV_SHIFTS.map((shift) => {
      const cells = prices.map((price) => {
        let pnl = 0;
        legs.forEach((leg) => {
          if (leg.type === 'stock') {
            const mult = leg.action === 'buy' ? 1 : -1;
            pnl += (price - stockPrice) * mult * (leg.quantity || 100);
            return;
          }
          // La IV se desplaza en puntos absolutos y se recorta en un mínimo
          // positivo: una volatilidad de cero o negativa no es un escenario,
          // es una división por cero disfrazada de caso extremo.
          const shocked = { ...leg, iv: Math.max(0.01, (leg.iv || 0.3) + shift) };
          const remaining = Math.max(0, (leg.daysToExpiry ?? frontDTE) - daysAhead);
          pnl += legPnL(price, shocked, remaining, riskFreeRate, dividendYield);
        });
        return pnl;
      });
      return { shift, cells };
    });

    const maxAbs = Math.max(...rows.flatMap((r) => r.cells.map((c) => Math.abs(c))), 1);
    return { prices, rows, maxAbs };
  }, [legs, stockPrice, riskFreeRate, dividendYield, daysAhead, frontDTE]);

  if (!grid) {
    return <p className="text-xs text-muted-foreground">{t('optHeatmapEmpty')}</p>;
  }

  return (
    <div className="space-y-3" data-testid="price-iv-heatmap">
      <div className="flex items-center gap-3">
        <label htmlFor="heatmap-days" className="text-[11px] text-muted-foreground whitespace-nowrap">
          {t('optHeatmapDaysAhead')}
        </label>
        <input
          id="heatmap-days"
          type="range"
          min={0}
          max={Math.max(1, frontDTE)}
          value={Math.min(daysAhead, Math.max(1, frontDTE))}
          onChange={(e) => setDaysAhead(parseInt(e.target.value, 10))}
          className="flex-1 min-w-0"
          data-testid="heatmap-days-slider"
        />
        <span className="text-xs font-mono font-bold tabular-nums whitespace-nowrap">
          +{daysAhead}d
        </span>
      </div>

      {/* La tabla se desborda en horizontal DENTRO de su contenedor: la página
          nunca debe hacer scroll lateral por culpa de una rejilla. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px] tabular-nums">
          <caption className="sr-only">{t('optHeatmapCaption')}</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left px-2 py-1 text-muted-foreground font-semibold sticky left-0 bg-card">
                {t('optHeatmapIvShift')}
              </th>
              {grid.prices.map((price) => (
                <th
                  key={price}
                  scope="col"
                  className="px-2 py-1 text-right text-muted-foreground font-mono font-medium whitespace-nowrap"
                >
                  ${price.toFixed(price < 25 ? 2 : 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.shift}>
                <th
                  scope="row"
                  className="text-left px-2 py-1 font-mono font-bold whitespace-nowrap sticky left-0 bg-card"
                >
                  {row.shift > 0 ? '+' : ''}{(row.shift * 100).toFixed(0)}%
                </th>
                {row.cells.map((pnl, i) => (
                  <td
                    key={grid.prices[i]}
                    className="px-2 py-1 text-right font-mono font-semibold border border-border/30"
                    style={{ backgroundColor: cellColor(pnl, grid.maxAbs) }}
                    title={`${t('optHeatmapIvShift')} ${(row.shift * 100).toFixed(0)}% · $${grid.prices[i].toFixed(2)}`}
                  >
                    {pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toFixed(0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">{t('optHeatmapHint')}</p>
    </div>
  );
};

export default PriceIVHeatmap;
