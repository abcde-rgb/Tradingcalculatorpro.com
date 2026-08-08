import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus, AlertTriangle, TrendingUp, TrendingDown, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { listTrades, deleteTrade } from '@/services/performanceApi';
import { tradeSetups } from '@/lib/tradingSystem';
import { productLabelKey } from './form/productMeta';
import TradeFormModal from './TradeFormModal';
import TradeImportExport from './TradeImportExport';
import { toast } from 'sonner';

const STATUS_LABELS = {
  open:   { key: 'tradeStatusOpen',   color: 'bg-[#3b82f6]/15 text-[#60a5fa]' },
  closed: { key: 'tradeStatusClosed', color: 'bg-muted-foreground/15 text-muted-foreground' },
  sl_hit: { key: 'tradeStatusSLHit',  color: 'bg-[#ef4444]/15 text-[#f87171]' },
  tp_hit: { key: 'tradeStatusTPHit',  color: 'bg-[#22c55e]/15 text-[#4ade80]' },
};

const SEVERITY_COLORS = {
  critical: 'bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30',
  high:     'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30',
  medium:   'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
};

/**
 * `setupFilter` llega desde el marcador de la pestaña Setups: pinchar un setup
 * lleva a SUS operaciones. Sin ese salto, el marcador daba un número y dejaba
 * al usuario buscando a mano en la tabla cuáles eran las operaciones detrás.
 */
export default function TradeJournal({ refreshKey, onChange, setupFilter, onClearSetupFilter }) {
  const { t } = useTranslation();
  const [trades, setTrades]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTrades({ limit: 200 });
      setTrades(data.trades || []);
    } catch (e) {
      // 401 handled globally by axios interceptor (clears auth);
      // skip toast to avoid noisy "Se requiere autenticación" loops.
      if (e?.response?.status !== 401) {
        toast.error(e?.response?.data?.detail || 'Error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTrade(deleteId);
      toast.success(t('tradeDeleted'));
      load();
      onChange?.();
    } catch (e) {
      toast.error('Error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSaved = () => {
    load();
    onChange?.();
  };

  // El filtro es del cliente a propósito: la lista ya está cargada entera y así
  // el salto desde el marcador es instantáneo y no gasta otra petición.
  const filterName = String(setupFilter || '').trim().toLowerCase();
  const visible = filterName
    ? trades.filter((tr) => tradeSetups(tr).some((s) => s.toLowerCase() === filterName))
    : trades;

  // Calidad del dato. El diario es la fuente de TODO lo demás: una operación
  // sin stop no tiene R, así que no cuenta para medir la ventaja de un setup;
  // una sin saldo de cuenta no tiene % y no entra en la rentabilidad. Callarlo
  // hace que el resto de paneles midan sobre menos muestra de la que el usuario
  // cree tener.
  const closed = trades.filter((tr) => tr.exit_price != null);
  const noStop = closed.filter((tr) => tr.sl == null || tr.r_multiple == null).length;
  const noBalance = closed.filter((tr) => !tr.account_balance).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-unbounded text-xl font-bold">{t('tradeJournal')}</h2>
          <span className="text-xs text-muted-foreground">
            ({filterName ? `${visible.length}/${trades.length}` : trades.length})
          </span>
          {filterName && (
            <button
              type="button"
              onClick={onClearSetupFilter}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/40 text-[11px] font-semibold hover:bg-primary/25 transition-colors"
              data-testid="journal-setup-filter"
            >
              {t('journalFilteredBySetup').replace('{setup}', setupFilter)}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TradeImportExport
            trades={trades}
            onImported={() => { load(); onChange?.(); }}
          />
          <Button
            onClick={() => { setEditingTrade(null); setModalOpen(true); }}
            className="gap-2"
            data-testid="trade-journal-add"
          >
            <Plus className="w-4 h-4" />
            {t('newTrade')}
          </Button>
        </div>
      </div>

      {(noStop > 0 || noBalance > 0) && !loading && (
        <div
          className="flex items-start gap-2 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/5 px-3 py-2"
          data-testid="journal-quality"
        >
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#f59e0b] leading-relaxed">
            {noStop > 0 && (
              <div>{t('journalNoStopWarn').replace('{n}', String(noStop)).replace('{total}', String(closed.length))}</div>
            )}
            {noBalance > 0 && (
              <div>{t('journalNoBalanceWarn').replace('{n}', String(noBalance))}</div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}…</div>
      ) : trades.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('tradeJournalEmpty')}</p>
          <Button
            onClick={() => { setEditingTrade(null); setModalOpen(true); }}
            className="mt-4 gap-2"
            data-testid="trade-journal-add-empty"
          >
            <Plus className="w-4 h-4" />
            {t('addFirstTrade')}
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-left">
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeSymbol')}</th>
                {/* El producto va junto al símbolo porque sin él "AAPL 10" es
                    ambiguo: ¿diez acciones o diez contratos de opciones? */}
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeProduct')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeSide')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeSetup')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradeEntry')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradeExit')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradePnL')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">R</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradePctAccount')}</th>
                {/* Coste total (comisión + funding/swap). Sin esta columna, lo
                    que se paga por mantener abierta una posición no aparece en
                    ninguna parte del diario y se descubre en el extracto. */}
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradeCosts')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeStatus')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeErrors')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((tr) => {
                const status = STATUS_LABELS[tr.status] || STATUS_LABELS.closed;
                const pnlPositive = (tr.pnl || 0) > 0;
                const pnlNegative = (tr.pnl || 0) < 0;
                return (
                  <tr key={tr.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`trade-row-${tr.id}`}>
                    <td className="px-3 py-2 font-bold">{tr.symbol}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] uppercase tracking-wide">
                          {t(productLabelKey(tr.instrument_type))}
                        </span>
                        {/* El apalancamiento sólo se pinta donde existe: un "1×"
                            en una acción al contado es ruido, y un "—" invita a
                            pensar que falta el dato. */}
                        {tr.leverage > 1 && (
                          <span className="px-1 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24] text-[10px] font-bold">
                            {tr.leverage}×
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tr.side === 'long' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#ef4444]/15 text-[#f87171]'
                      }`}>
                        {tr.side === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {tr.side}
                      </span>
                    </td>
                    {/* Una operación puede llevar varios setups: se pintan como
                        etiquetas, no como una cadena cortada por el ancho. */}
                    <td className="px-3 py-2 max-w-[160px]">
                      {tradeSetups(tr).length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1" title={tradeSetups(tr).join(', ')}>
                          {tradeSetups(tr).slice(0, 2).map((name) => (
                            <span
                              key={name}
                              className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] truncate max-w-[110px]"
                            >
                              {name}
                            </span>
                          ))}
                          {tradeSetups(tr).length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{tradeSetups(tr).length - 2}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-right">${tr.entry_price?.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-right">{tr.exit_price ? `$${tr.exit_price.toFixed(2)}` : '—'}</td>
                    <td className={`px-3 py-2 font-mono text-right font-bold ${
                      pnlPositive ? 'text-[#22c55e]' : pnlNegative ? 'text-[#ef4444]' : 'text-muted-foreground'
                    }`}>
                      {tr.exit_price ? `${pnlPositive ? '+' : ''}$${tr.pnl?.toFixed(2)}` : '—'}
                    </td>
                    <td className={`px-3 py-2 font-mono text-right ${
                      (tr.r_multiple || 0) > 0 ? 'text-[#22c55e]' : (tr.r_multiple || 0) < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'
                    }`}>
                      {tr.r_multiple ? `${tr.r_multiple > 0 ? '+' : ''}${tr.r_multiple}R` : '—'}
                    </td>
                    {/* % sobre el saldo con el que se operó: es la unidad de la
                        analítica, y tenerla junto a R deja ver de un vistazo que
                        un +2R puede ser un +0,4 % o un +4 % según el tamaño. */}
                    <td className={`px-3 py-2 font-mono text-right ${
                      (tr.pnl || 0) > 0 ? 'text-[#22c55e]' : (tr.pnl || 0) < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'
                    }`}
                    >
                      {tr.exit_price && tr.account_balance
                        ? `${tr.pnl > 0 ? '+' : ''}${((tr.pnl / tr.account_balance) * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-muted-foreground"
                      title={tr.carry_total ? t('tradeCostsBreakdown')
                        .replace('{fees}', String(tr.fees || 0))
                        .replace('{carry}', String(tr.carry_total)) : undefined}
                    >
                      {tr.costs_total ? `$${Number(tr.costs_total).toFixed(2)}` : '—'}
                      {tr.carry_total ? <span className="text-[#f59e0b]"> •</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.color}`}>
                        {t(status.key)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {tr.errors && tr.errors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tr.errors.slice(0, 3).map((err, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${SEVERITY_COLORS[err.severity] || 'border-border'}`}
                              title={t(err.message_key)}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {t(err.message_key)}
                            </span>
                          ))}
                          {tr.errors.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{tr.errors.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#22c55e]">✓ {t('tradeNoErrors')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditingTrade(tr); setModalOpen(true); }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          data-testid={`trade-edit-${tr.id}`}
                          aria-label={`${t('edit')} ${tr.symbol}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(tr.id)}
                          className="p-1 rounded hover:bg-[#ef4444]/15 text-muted-foreground hover:text-[#f87171]"
                          data-testid={`trade-delete-${tr.id}`}
                          aria-label={`${t('delete')} ${tr.symbol}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Con filtro puesto y sin coincidencias, la tabla vacía se leía como
              "no tienes operaciones". Son cosas distintas. */}
          {visible.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground" data-testid="journal-filter-empty">
              {t('journalNoTradesForSetup').replace('{setup}', setupFilter || '')}
            </div>
          )}
        </div>
      )}

      <TradeFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTrade(null); }}
        onSaved={handleSaved}
        initialTrade={editingTrade}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('confirmDeleteTradeTitle')}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {t('confirmDeleteTradeDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting} className="w-full sm:w-auto">
              {t('keepPlanBtn')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="w-full sm:w-auto">
              {t('deleteTradeBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
