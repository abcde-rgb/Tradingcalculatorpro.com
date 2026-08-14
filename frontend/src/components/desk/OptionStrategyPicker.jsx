import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, Search, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { STRATEGIES, STRATEGY_CATEGORIES } from '@/data/mockData';
import { SINGLE_LEG_IDS, CATEGORY_TONE, CATEGORY_LABEL_KEY, optionDirection } from './deskMeta';

const TONE = {
  up:   'text-[#4ade80] border-[#22c55e]/40 bg-[#22c55e]/10',
  down: 'text-[#f87171] border-[#ef4444]/40 bg-[#ef4444]/10',
  flat: 'text-[#c084fc] border-[#a855f7]/40 bg-[#a855f7]/10',
  vol:  'text-[#fbbf24] border-[#f59e0b]/40 bg-[#f59e0b]/10',
};

/**
 * El selector de estructura de opciones de la mesa.
 *
 * Las 66 del catálogo (`data/mockData.js`), con **los cuatro contratos sueltos
 * arriba y aparte**. No son cuatro estrategias añadidas: son cuatro de las 66,
 * y el grupo se construye buscando sus `id` reales para que no puedan
 * duplicarse ni quedarse desincronizados si el catálogo cambia.
 *
 * Están arriba porque el orden ES la funcionalidad: quien entra a dimensionar
 * una call comprada no debería tener que reconocerla entre sesenta y seis
 * tarjetas, y quien busca un iron condor sabe buscarlo.
 *
 * Y cada opción suelta lleva escrito **qué significa comprarla o venderla**,
 * que es la confusión que de verdad cuesta dinero: comprar no es "alcista" y
 * vender no es "bajista" — depende de si es call o put, y vender cambia además
 * la forma del riesgo. Una call vendida desnuda no tiene pérdida máxima, y eso
 * no se puede deducir de un nombre.
 *
 * La mesa dimensiona la posición (contratos, prima, riesgo, margen). Para el
 * payoff, las griegas y la cadena real hay un panel entero en `/options`, así
 * que cada estructura lleva su enlace en vez de una versión pobre aquí.
 */
export default function OptionStrategyPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');

  const singles = useMemo(
    () => SINGLE_LEG_IDS.map((id) => STRATEGIES.find((s) => s.id === id)).filter(Boolean),
    [],
  );
  const selected = useMemo(
    () => STRATEGIES.find((s) => s.id === value) || null,
    [value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STRATEGIES.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (!q) return true;
      return t(s.name).toLowerCase().includes(q) || s.id.replace(/_/g, ' ').includes(q);
    });
  }, [query, cat, t]);

  const pick = (s) => {
    onChange(s.id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div data-testid="desk-option-strategy">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-border bg-muted/40 text-left hover:border-primary/50 transition-colors"
        data-testid="desk-strategy-toggle"
      >
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">
            {selected ? t(selected.name) : t('deskStrategyPick')}
          </span>
          <span className="block text-[11px] text-muted-foreground truncate">
            {selected
              ? `${selected.legs.length} ${t(selected.legs.length === 1 ? 'deskLegOne' : 'deskLegMany')} · ${t(selected.whenToUse)}`
              : t('deskStrategyCount').replace('{n}', String(STRATEGIES.length)).replace('{s}', String(singles.length))}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* La estructura elegida, con lo que hay que saber antes de dimensionarla.
          El riesgo máximo es lo que la mesa necesita para tratarla como una
          posición de riesgo definido o no. */}
      {selected && !open && (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="desk-strategy-summary">
          <Fact label={t('deskStratMaxLoss')} value={t(selected.maxLoss)} tone="down" />
          <Fact label={t('deskStratMaxProfit')} value={t(selected.maxProfit)} tone="up" />
          {/* `/options` es el hub; el panel con payoff, griegas y cadena vive
              en `/options/calculator`, y `?strategy=` ya lo abre con la
              estructura elegida (`strategyFromUrl`). */}
          <Link
            to={`/options/calculator?strategy=${selected.id}`}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
            data-testid="desk-strategy-open-options"
          >
            {t('deskStrategyOpenInOptions')}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card p-3 space-y-3" data-testid="desk-strategy-panel">
          {/* ── Los cuatro sueltos, primero ─────────────────────────── */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t('deskOptionSingles')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {singles.map((s) => {
                const leg = s.legs[0];
                const dir = optionDirection(leg.action, leg.type);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => pick(s)}
                    className={`flex flex-col gap-0.5 px-3 py-2 rounded-md border text-left transition-colors hover:brightness-125 ${
                      value === s.id ? TONE[dir?.tone] : 'border-border bg-muted/30'
                    }`}
                    data-testid={`desk-single-${s.id}`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {t(leg.action === 'buy' ? 'deskOptBuy' : 'deskOptSell')} {leg.type === 'call' ? 'CALL' : 'PUT'}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {dir ? `${t(dir.biasKey)} · ${t(dir.riskKey)}` : t(s.risk)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
              {t('deskOptionSinglesNote')}
            </p>
          </div>

          {/* ── Las 66, con buscador y categorías ───────────────────── */}
          <div className="pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('deskStrategySearch')}
                  className="pl-8 h-8 text-xs"
                  data-testid="desk-strategy-search"
                />
              </div>
              <button
                type="button"
                onClick={() => setCat('all')}
                className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                  cat === 'all' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'
                }`}
              >
                {t('filterAll')} {STRATEGIES.length}
              </button>
              {STRATEGY_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                    cat === c ? TONE[CATEGORY_TONE[c]] : 'border-border text-muted-foreground'
                  }`}
                  data-testid={`desk-strategy-cat-${c}`}
                >
                  {t(CATEGORY_LABEL_KEY[c])}
                </button>
              ))}
            </div>

            <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {filtered.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => pick(s)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                    value === s.id
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                  data-testid={`desk-strategy-${s.id}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">{t(s.name)}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] opacity-60">
                    {s.legs.length}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full px-2 py-3 text-xs text-muted-foreground" data-testid="desk-strategy-empty">
                  {t('calcNoMatches')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, tone }) {
  return (
    <div className={`px-3 py-2 rounded-md border ${TONE[tone] || 'border-border'}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-[11px] font-semibold leading-snug mt-0.5">{value}</p>
    </div>
  );
}
