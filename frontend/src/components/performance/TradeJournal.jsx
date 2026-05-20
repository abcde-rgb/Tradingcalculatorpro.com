import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus, AlertTriangle, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { listTrades, deleteTrade } from '@/services/performanceApi';
import TradeFormModal from './TradeFormModal';
import TradeImportExport from './TradeImportExport';
import { toast } from 'sonner';

const STATUS_LABELS = {
  open:   { key: 'tradeStatusOpen',   color: 'bg-[#3b82f6]/15 text-[#3b82f6]' },
  closed: { key: 'tradeStatusClosed', color: 'bg-muted-foreground/15 text-muted-foreground' },
  sl_hit: { key: 'tradeStatusSLHit',  color: 'bg-[#ef4444]/15 text-[#ef4444]' },
  tp_hit: { key: 'tradeStatusTPHit',  color: 'bg-[#22c55e]/15 text-[#22c55e]' },
};

const SEVERITY_COLORS = {
  critical: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30',
  high:     'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30',
  medium:   'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
};

export default function TradeJournal({ refreshKey, onChange }) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-unbounded text-xl font-bold">{t('tradeJournal')}</h2>
          <span className="text-xs text-muted-foreground">({trades.length})</span>
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}…</div>
      ) : trades.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
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
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeSide')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeSetup')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradeEntry')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradeExit')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">{t('tradePnL')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px] text-right">R</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeStatus')}</th>
                <th className="px-3 py-2 font-bold uppercase tracking-wider text-[10px]">{t('tradeErrors')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((tr) => {
                const status = STATUS_LABELS[tr.status] || STATUS_LABELS.closed;
                const pnlPositive = (tr.pnl || 0) > 0;
                const pnlNegative = (tr.pnl || 0) < 0;
                return (
                  <tr key={tr.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`trade-row-${tr.id}`}>
                    <td className="px-3 py-2 font-bold">{tr.symbol}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tr.side === 'long' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        {tr.side === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {tr.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{tr.setup || '—'}</td>
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
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(tr.id)}
                          className="p-1 rounded hover:bg-[#ef4444]/15 text-muted-foreground hover:text-[#ef4444]"
                          data-testid={`trade-delete-${tr.id}`}
                          aria-label={t('confirmDeleteTradeTitle')}
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
