import { useMemo, useState } from 'react';
import { BookOpen, Download, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTradingJournalStore, useAuthStore } from '@/lib/store';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { toCsv, downloadFile } from '@/lib/csv';
import { toast } from 'sonner';

/**
 * ARCHIVO DEL DIARIO LOCAL — CONGELADO. No añadir funciones aquí.
 *
 * Este diario nunca salió del navegador: guardaba en `localStorage` bajo una
 * única clave global, sin `user_id`, así que dos cuentas en el mismo equipo
 * compartían operaciones y limpiar el navegador las borraba todas. Además
 * calculaba el P&L sobre el nocional (`size × movimiento × apalancamiento`),
 * una tercera fórmula que no coincide con la del backend para los mismos datos.
 *
 * Por eso está congelado y no borrado: quien ya tenía operaciones aquí sigue
 * pudiendo verlas y **exportarlas**, pero no se pueden crear más. El diario
 * real es `/performance`, que sí persiste en servidor y por usuario.
 *
 * Cuando deje de haber usuarios con datos en `trading-journal-storage`, este
 * componente y `useTradingJournalStore` se pueden eliminar enteros.
 */
export const TradingJournal = () => {
  const { isAuthenticated } = useAuthStore();
  const { trades, clearAllTrades } = useTradingJournalStore();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Las filas exportadas llevan el P&L tal y como se guardó, con su fórmula
  // anotada: reinterpretarlo aquí sería inventar un número que el usuario nunca
  // vio, y no reinterpretarlo sin avisar dejaría una cifra incomparable con la
  // del diario nuevo. Se exporta el dato y se etiqueta su procedencia.
  const rows = useMemo(() => trades.map((t) => ({
    symbol: t.symbol ?? '',
    direction: t.direction ?? '',
    status: t.status ?? '',
    entryPrice: t.entryPrice ?? '',
    exitPrice: t.exitPrice ?? '',
    size_usd: t.size ?? '',
    leverage: t.leverage ?? '',
    pnl_notional: t.pnl ?? '',
    strategy: t.strategy ?? '',
    notes: t.notes ?? '',
    createdAt: t.createdAt ?? '',
    pnl_formula: 'size * ((exit-entry)/entry) * leverage (diario local antiguo)',
  })), [trades]);

  const exportCsv = () => {
    downloadFile(`diario-local-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    toast.success(`${rows.length} operaciones exportadas a CSV`);
  };

  const exportJson = () => {
    downloadFile(
      `diario-local-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exported_at: new Date().toISOString(), source: 'localStorage:trading-journal-storage', trades }, null, 2),
      'application/json;charset=utf-8',
    );
    toast.success(`${rows.length} operaciones exportadas a JSON`);
  };

  const handleClear = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearAllTrades();
    setConfirmingClear(false);
    toast.success('Diario local borrado de este navegador');
  };

  // Sin datos que rescatar no hay nada que enseñar: quien no usó nunca este
  // diario no debe ver un cartel sobre una función que ya no existe.
  if (!isAuthenticated || trades.length === 0) return null;

  return (
    <Card className="bg-card border-yellow-500/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-500" />
          Diario local (archivado)
        </CardTitle>
        <span className="text-xs px-2 py-1 rounded bg-yellow-500/15 text-yellow-500 whitespace-nowrap">
          Solo lectura
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-yellow-500">
              Estas {trades.length} operaciones nunca se guardaron en tu cuenta.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Vivían solo en este navegador, así que se pierden al limpiarlo o al
              cambiar de dispositivo. Este diario está congelado: expórtalas y
              vuelve a registrarlas en el diario real, que sí guarda en tu cuenta.
              Su P&amp;L se calculó sobre el nocional, así que no es comparable
              con el del diario nuevo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={exportCsv} className="bg-green-500 text-black hover:bg-green-400">
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJson}>
            <Download className="w-4 h-4 mr-1" /> Exportar JSON
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/performance">
              Ir al diario real <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant={confirmingClear ? 'destructive' : 'ghost'}
            onClick={handleClear}
            onBlur={() => setConfirmingClear(false)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {confirmingClear ? '¿Seguro? Borra las ' + trades.length : 'Borrar del navegador'}
          </Button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {trades.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  trade.direction === 'long' ? 'bg-primary/20' : 'bg-destructive/20'
                }`}>
                  {trade.direction === 'long'
                    ? <TrendingUp className="w-5 h-5 text-primary" />
                    : <TrendingDown className="w-5 h-5 text-destructive" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{trade.symbol}</span>
                    {trade.leverage > 1 && (
                      <span className="text-xs text-yellow-500">{trade.leverage}x</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Entrada: ${formatNumber(trade.entryPrice)}
                    {trade.exitPrice && ` → Salida: $${formatNumber(trade.exitPrice)}`}
                  </p>
                </div>
              </div>
              {trade.status === 'closed' && (
                <div className={`text-right ${trade.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  <p className="font-mono font-bold">
                    {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
