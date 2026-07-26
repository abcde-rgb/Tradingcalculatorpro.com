import React, { useMemo, useState, useEffect } from 'react';
import { Check, AlertTriangle, ArrowRight, FileSpreadsheet } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import {
  CANONICAL_FIELDS, BROKER_PRESETS, detectBroker, autoDetectMapping, buildImport,
} from '@/lib/tradeImport';

const NONE = '__none__';

/**
 * TradeImportWizard — see what will be imported before importing it.
 *
 * The old flow guessed column names and silently dropped whatever it couldn't
 * match. Now: detect the broker format, show the mapping, let the user fix any
 * column, and preview the first rows plus a count of what will be skipped and
 * why. Nothing is written until "Import" is pressed.
 */
export default function TradeImportWizard({ open, onOpenChange, headers, rows, onConfirm, busy }) {
  const { t } = useTranslation();
  const [broker, setBroker] = useState('auto');
  const [mapping, setMapping] = useState({});

  // Re-detect whenever a new file is loaded.
  useEffect(() => {
    if (!open || !headers?.length) return;
    const detected = detectBroker(headers);
    setBroker(detected);
    setMapping(autoDetectMapping(headers, detected));
  }, [open, headers]);

  const onBrokerChange = (id) => {
    setBroker(id);
    setMapping(autoDetectMapping(headers, id));
  };

  const setField = (key, col) =>
    setMapping((m) => ({ ...m, [key]: col === NONE ? null : col }));

  const { valid, invalid } = useMemo(
    () => (rows?.length ? buildImport(rows, mapping) : { valid: [], invalid: [] }),
    [rows, mapping]
  );

  const missingRequired = CANONICAL_FIELDS.filter((f) => f.required && !mapping[f.key]);
  const canImport = !busy && valid.length > 0 && missingRequired.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="trade-import-wizard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {t('importWizardTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Broker format */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t('importWizardBroker')}
            </label>
            <Select value={broker} onValueChange={onBrokerChange}>
              <SelectTrigger className="mt-1 h-9" data-testid="import-broker-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BROKER_PRESETS).map(([id, p]) => (
                  <SelectItem key={id} value={id}>
                    {id === 'auto' ? t('importWizardAutoDetect') : p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5">{t('importWizardBrokerHint')}</p>
          </div>

          {/* Column mapping */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">{t('importWizardMapping')}</h3>
              <span className="text-[11px] text-muted-foreground">
                {t('importWizardDetected', {
                  n: Object.values(mapping).filter(Boolean).length,
                  total: CANONICAL_FIELDS.length,
                })}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CANONICAL_FIELDS.map((f) => {
                const missing = f.required && !mapping[f.key];
                return (
                  <div
                    key={f.key}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                      missing ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-muted/20'
                    }`}
                  >
                    <span className="text-xs font-medium w-32 shrink-0 truncate">
                      {t(`importField_${f.key}`)}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <Select
                      value={mapping[f.key] || NONE}
                      onValueChange={(v) => setField(f.key, v)}
                    >
                      <SelectTrigger className="h-7 text-xs" data-testid={`import-map-${f.key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t('importWizardIgnore')}</SelectItem>
                        {headers?.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-bold mb-2">{t('importWizardPreview')}</h3>
            {valid.length > 0 ? (
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {['symbol', 'side', 'entry_price', 'exit_price', 'quantity'].map((c) => (
                        <th key={c} className="text-left px-2.5 py-1.5 font-semibold whitespace-nowrap">
                          {t(`importField_${c}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 4).map((p, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-2.5 py-1.5 font-mono">{p.symbol}</td>
                        <td className="px-2.5 py-1.5">
                          <Badge
                            variant={p.side === 'long' ? 'secondary' : 'outline'}
                            className="text-[10px]"
                          >
                            {p.side}
                          </Badge>
                        </td>
                        <td className="px-2.5 py-1.5 font-mono">{p.entry_price}</td>
                        <td className="px-2.5 py-1.5 font-mono">{p.exit_price ?? '—'}</td>
                        <td className="px-2.5 py-1.5 font-mono">{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('importWizardNoValid')}</p>
            )}
          </div>

          {/* Outcome summary */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <Check className="w-3.5 h-3.5" /> {t('importWizardWillImport', { n: valid.length })}
            </span>
            {invalid.length > 0 && (
              <span className="flex items-center gap-1.5 text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('importWizardWillSkip', { n: invalid.length })}
              </span>
            )}
          </div>

          {invalid.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-[11px] text-muted-foreground mb-1">{t('importWizardSkipReason')}</p>
              <ul className="text-[11px] text-muted-foreground font-mono space-y-0.5 max-h-24 overflow-y-auto">
                {invalid.slice(0, 8).map((e) => (
                  <li key={e.row}>
                    {t('importWizardRow', { n: e.row })} → {t(`importField_${e.reason}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingRequired.length > 0 && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('importWizardMissingRequired', {
                fields: missingRequired.map((f) => t(`importField_${f.key}`)).join(', '),
              })}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => onConfirm(valid)}
            disabled={!canImport}
            data-testid="import-confirm"
          >
            {busy ? t('journalCsvImporting') : t('importWizardConfirm', { n: valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
