import React from 'react';
import { useTranslation } from '@/lib/i18n';

const CALL_COLS = ['Bid', 'Ask', 'Last', 'Vol', 'OI', 'IV', 'Delta'];
const PUT_COLS = ['Delta', 'IV', 'OI', 'Vol', 'Last', 'Ask', 'Bid'];

/**
 * Cadena de opciones.
 *
 * El scroll estaba roto: la tabla vivía en un `flex-1 … overflow-hidden` cuyo
 * hijo `overflow-auto` no tenía altura acotada, así que quien scrolleaba era la
 * página entera y el `thead sticky top-0` se pegaba al contenedor equivocado —
 * acababa oculto detrás de las dos barras fijas de arriba. Resultado: al abrir
 * la pestaña no se veía ni la fila CALLS/PUTS ni el selector de vencimiento.
 *
 * Ahora la tabla scrollea DENTRO de su tarjeta, con altura acotada, y la
 * cabecera se queda pegada a esa tarjeta, que es donde tiene sentido.
 */
const OptionsChainView = ({ chain, stockPrice, expirations, selectedExpIdx, onExpChange }) => {
  const { t } = useTranslation();

  if (!chain || chain.length === 0) {
    return (
      <div className="p-3 md:p-4">
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {t('optChainEmpty')}
        </div>
      </div>
    );
  }

  const atmIdx = chain.reduce(
    (best, s, idx) => (Math.abs(s.strike - stockPrice) < Math.abs(chain[best].strike - stockPrice) ? idx : best),
    0
  );

  return (
    <div className="p-3 md:p-4 space-y-2">
      {/* Selector de vencimiento — mismos chips que la barra de configuración
          de la calculadora, para que la misma decisión se vea igual en toda
          la sección. */}
      <div className="bg-card border border-border rounded-xl px-3 py-2.5">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
          {t('optExpirationDate')}
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {expirations.map((exp, idx) => {
            const active = selectedExpIdx === idx;
            return (
              <button
                key={exp.date}
                type="button"
                onClick={() => onExpChange(idx)}
                aria-pressed={active}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground hover:border-primary/25'
                }`}
              >
                {exp.fullLabel} <span className="opacity-50 tabular-nums">({exp.daysToExpiry}d)</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="max-h-[calc(100vh-19rem)] min-h-[320px] overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card">
                <th colSpan="7" className="text-center py-2 text-long text-xs font-semibold border-b border-border">CALLS</th>
                <th className="py-2 px-3 text-center text-foreground font-bold border-b border-border bg-muted">Strike</th>
                <th colSpan="7" className="text-center py-2 text-short text-xs font-semibold border-b border-border">PUTS</th>
              </tr>
              <tr className="bg-background">
                {CALL_COLS.map((h) => (
                  <th key={`c-${h}`} className="py-1.5 px-2 text-right text-muted-foreground font-medium border-b border-border">{h}</th>
                ))}
                <th className="py-1.5 px-3 text-center text-muted-foreground font-bold border-b border-border bg-muted">$</th>
                {PUT_COLS.map((h) => (
                  <th key={`p-${h}`} className="py-1.5 px-2 text-left text-muted-foreground font-medium border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chain.map((row, idx) => {
                const isITMCall = row.strike < stockPrice;
                const isITMPut = row.strike > stockPrice;
                const isATM = idx === atmIdx;
                const callBg = isITMCall ? 'bg-long/5' : '';
                const putBg = isITMPut ? 'bg-short/5' : '';
                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${isATM ? 'bg-primary/5' : ''}`}
                  >
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${callBg}`}>{row.call?.bid ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${callBg}`}>{row.call?.ask ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums text-foreground ${callBg}`}>{row.call?.last ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums text-muted-foreground ${callBg}`}>{(row.call?.volume ?? 0).toLocaleString()}</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums text-muted-foreground ${callBg}`}>{(row.call?.openInterest ?? 0).toLocaleString()}</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${callBg}`}>{((row.call?.iv ?? 0) * 100).toFixed(1)}%</td>
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${isITMCall ? 'bg-long/5 text-long' : 'text-muted-foreground'}`}>{(row.call?.delta ?? 0).toFixed(3)}</td>

                    <td className={`py-1.5 px-3 text-center font-mono tabular-nums font-bold bg-muted border-x border-border ${
                      isATM ? 'text-primary' : isITMCall ? 'text-long' : 'text-short'
                    }`}>
                      ${row.strike}
                      {isATM && <span className="text-[8px] ml-1 text-primary opacity-70">ATM</span>}
                    </td>

                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums ${isITMPut ? 'bg-short/5 text-short' : 'text-muted-foreground'}`}>{(row.put?.delta ?? 0).toFixed(3)}</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums ${putBg}`}>{((row.put?.iv ?? 0) * 100).toFixed(1)}%</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums text-muted-foreground ${putBg}`}>{(row.put?.openInterest ?? 0).toLocaleString()}</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums text-muted-foreground ${putBg}`}>{(row.put?.volume ?? 0).toLocaleString()}</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums text-foreground ${putBg}`}>{row.put?.last ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums ${putBg}`}>{row.put?.ask ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-left font-mono tabular-nums ${putBg}`}>{row.put?.bid ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OptionsChainView;
