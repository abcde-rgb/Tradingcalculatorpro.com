import React, { useRef, useState } from 'react';
import { Download, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { parseCsv, toCsv, downloadFile } from '@/lib/csv';
import { bulkCreateTrades } from '@/services/performanceApi';
import TradeImportWizard from './TradeImportWizard';

/**
 * Columns written on export. Import mapping lives in lib/tradeImport.js and is
 * confirmed by the user through TradeImportWizard.
 */
const EXPORT_COLUMNS = [
  'symbol', 'side', 'setup',
  'entry_price', 'exit_price', 'sl', 'tp',
  'quantity', 'account_balance', 'fees',
  'entry_date', 'exit_date', 'status',
  'pnl', 'pnl_pct', 'r_multiple',
  'emotion', 'notes',
];

export default function TradeImportExport({ trades, onImported }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    if (!trades || trades.length === 0) {
      toast.warning(t('journalCsvNothingToExport'));
      return;
    }
    const rows = trades.map((tr) => {
      const row = {};
      EXPORT_COLUMNS.forEach((col) => { row[col] = tr[col] ?? ''; });
      return row;
    });
    const csv = toCsv(rows, { columns: EXPORT_COLUMNS });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`trade-journal-${stamp}.csv`, csv);
    toast.success(t('journalCsvExportSuccess', { n: trades.length }));
  };

  const handleImportClick = () => fileRef.current?.click();

  // Parsed file waiting for the user to confirm the column mapping.
  const [pending, setPending] = useState({ headers: [], rows: [] });
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';  // allow picking the same file again
    if (!file) return;
    try {
      const text = await file.text();
      const rawRows = parseCsv(text);
      if (!rawRows.length) {
        toast.error(t('journalCsvEmpty'));
        return;
      }
      // Open the mapping wizard instead of importing blind: the previous flow
      // guessed column names and silently dropped whatever it couldn't match.
      setPending({ headers: Object.keys(rawRows[0]), rows: rawRows });
      setWizardOpen(true);
    } catch (err) {
      toast.error(err?.message || t('journalCsvImportError'));
    }
  };

  const handleConfirmImport = async (payloads) => {
    if (!payloads?.length) {
      toast.error(t('journalCsvNoValidRows'));
      return;
    }
    setBusy(true);
    try {
      const res = await bulkCreateTrades(payloads);
      const imported = res?.imported ?? 0;
      const failed = res?.failed?.length ?? 0;
      if (imported > 0) toast.success(t('journalCsvImportSuccess', { n: imported }));
      if (failed > 0) toast.warning(t('journalCsvImportPartial', { n: failed }));
      setWizardOpen(false);
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('journalCsvImportError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="trade-import-export">
      <Button
        variant="outline" size="sm"
        onClick={handleExport}
        className="gap-2"
        data-testid="trade-journal-export"
      >
        <Download className="w-3.5 h-3.5" />
        {t('journalCsvExport')}
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={handleImportClick}
        disabled={busy}
        className="gap-2"
        data-testid="trade-journal-import"
      >
        {busy ? <FileText className="w-3.5 h-3.5 animate-pulse" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? t('journalCsvImporting') : t('journalCsvImport')}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFilePicked}
        className="hidden"
        data-testid="trade-journal-file-input"
      />
      <TradeImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        headers={pending.headers}
        rows={pending.rows}
        onConfirm={handleConfirmImport}
        busy={busy}
      />
    </div>
  );
}
