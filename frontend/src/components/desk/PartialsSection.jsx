import React from 'react';
import { Plus, Trash2, Split } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import SectionCard from '@/components/common/SectionCard';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '@/components/performance/form/productMeta';
import { sizingLabelKey } from '@/lib/instruments';

/**
 * Entradas y salidas por tramos.
 *
 * Casi nadie entra de golpe ni sale de golpe, y las dos cosas cambian números
 * distintos:
 *
 *   · **Entrar por tramos** cambia el precio medio, y con él el riesgo real de
 *     toda la posición. La media es ponderada por tamaño; promediar los precios
 *     a secas da un número que no coincide con ningún extracto.
 *   · **Salir por tramos** convierte parte del resultado en realizado y deja
 *     vivo el resto. Lo interesante entonces no es el P&L: es hasta dónde puede
 *     retroceder lo que queda sin que la operación entre en pérdidas — que es
 *     exactamente lo que se busca al cerrar el primer tercio.
 *
 * Está plegada porque no hace falta para dimensionar. Quien la abre ya sabe
 * para qué.
 */
export default function PartialsSection({
  entries, exits, onEntriesChange, onExitsChange,
  avgEntry, exitResult, spec, quantity, entryPrice,
}) {
  const { t } = useTranslation();
  const unit = t(sizingLabelKey(spec));
  const dp = spec?.sizing === 'contracts' || spec?.sizing === 'shares' ? 0 : 4;

  const rows = (list, onChange) => ({
    add: () => onChange([...(list || []), { price: '', qty: '' }]),
    remove: (i) => onChange(list.filter((_, k) => k !== i)),
    patch: (i, key, v) => onChange(list.map((r, k) => (k === i ? { ...r, [key]: v } : r))),
  });
  const entryOps = rows(entries, onEntriesChange);
  const exitOps = rows(exits, onExitsChange);

  const usedCount = (entries?.length || 0) + (exits?.length || 0);

  return (
    <SectionCard
      icon={<Split className="w-4 h-4" />}
      title={t('deskPartialsTitle')}
      subtitle={t('deskPartialsHint')}
      accent="blue"
      badge={usedCount ? (
        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
          {usedCount}
        </span>
      ) : null}
      testid="desk-partials"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Entradas ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('deskPartialEntries')}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={entryOps.add}
              data-testid="desk-add-entry">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {(entries || []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('deskPartialEntriesEmpty')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {entries.map((r, i) => (
                <Row
                  key={i}
                  index={i}
                  row={r}
                  unit={unit}
                  onPatch={(k, v) => entryOps.patch(i, k, v)}
                  onRemove={() => entryOps.remove(i)}
                  pricePh={t('deskTranchePrice')}
                  qtyPh={t('deskTrancheQty')}
                  testid={`desk-entry-${i}`}
                />
              ))}
            </div>
          )}

          {avgEntry?.price != null && (
            <div className="mt-2 grid grid-cols-2 gap-2" data-testid="desk-avg-entry">
              <Stat label={t('deskAvgEntry')} value={fmtPrice(avgEntry.price, spec?.tickSize)} accent />
              <Stat label={t('deskAvgQty')} value={`${fmtNum(avgEntry.quantity, dp)} ${unit}`} />
            </div>
          )}
        </div>

        {/* ── Salidas ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('deskPartialExits')}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={exitOps.add}
              data-testid="desk-add-exit">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {(exits || []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('deskPartialExitsEmpty')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {exits.map((r, i) => (
                <Row
                  key={i}
                  index={i}
                  row={r}
                  unit={unit}
                  onPatch={(k, v) => exitOps.patch(i, k, v)}
                  onRemove={() => exitOps.remove(i)}
                  pricePh={t('deskTranchePrice')}
                  qtyPh={t('deskTrancheQty')}
                  pct={exitResult?.rows?.[i]?.pctOfPosition}
                  testid={`desk-exit-${i}`}
                />
              ))}
            </div>
          )}

          {exitResult?.realized != null && (
            <div className="mt-2 grid grid-cols-2 gap-2" data-testid="desk-exit-result">
              <Stat
                label={t('deskRealized')}
                value={fmtMoney(exitResult.realized)}
                tone={exitResult.realized >= 0 ? 'good' : 'bad'}
              />
              <Stat
                label={t('deskClosedPct')}
                value={fmtPct(exitResult.realizedPct, 0)}
              />
              <Stat
                label={t('deskRemaining')}
                value={`${fmtNum(exitResult.remainingQty, dp)} ${unit}`}
              />
              <Stat
                label={t('deskBERemaining')}
                value={fmtPrice(exitResult.breakEvenRemaining, spec?.tickSize)}
                accent
              />
            </div>
          )}

          {exitResult?.breakEvenRemaining != null && entryPrice != null && (
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed"
              data-testid="desk-be-explain">
              {t('deskBERemainingHint')
                .replace('{be}', fmtPrice(exitResult.breakEvenRemaining, spec?.tickSize))
                .replace('{entry}', fmtPrice(entryPrice, spec?.tickSize))}
            </p>
          )}

          {quantity == null && (exits || []).length > 0 && (
            <p className="mt-2 text-[11px] text-[#fbbf24]" data-testid="desk-exit-needs-size">
              {t('deskPartialNeedsSize')}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function Row({ row, unit, onPatch, onRemove, pricePh, qtyPh, pct, testid }) {
  return (
    <div className="flex items-center gap-1.5" data-testid={testid}>
      <Input
        type="number" step="any" value={row.price ?? ''}
        onChange={(e) => onPatch('price', e.target.value)}
        placeholder={pricePh} className="h-8 text-xs flex-1"
        data-testid={`${testid}-price`}
      />
      <div className="relative flex-1">
        <Input
          type="number" step="any" value={row.qty ?? ''}
          onChange={(e) => onPatch('qty', e.target.value)}
          placeholder={qtyPh} className="h-8 text-xs pr-12"
          data-testid={`${testid}-qty`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
          {pct == null ? unit : `${Math.round(pct)}%`}
        </span>
      </div>
      <button
        type="button" onClick={onRemove}
        className="p-1.5 rounded text-muted-foreground hover:text-[#f87171] transition-colors"
        aria-label="—"
        data-testid={`${testid}-remove`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const TONES = { good: 'text-[#4ade80]', bad: 'text-[#f87171]' };

function Stat({ label, value, tone, accent }) {
  return (
    <div className="px-2.5 py-1.5 rounded-md bg-muted/50 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className={`font-mono text-sm font-bold ${TONES[tone] || (accent ? 'text-primary' : '')}`}>
        {value}
      </p>
    </div>
  );
}
