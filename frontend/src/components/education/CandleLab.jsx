import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, RotateCcw, Check, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { classify } from '@/lib/candleRules';
import { PATTERN_NAME_KEY } from '@/lib/candlePatternMeta';
import { themeVars } from '@/lib/marketTheme';

/**
 * Laboratorio de velas: el usuario CONSTRUYE la vela y ve en vivo qué reglas se
 * cumplen y cuáles no, con los números exactos.
 *
 * Es deliberadamente lo contrario de una galería de patrones. Una imagen de un
 * martillo enseña a reconocer ESE dibujo; mover el ratón hasta que la mecha
 * pasa de 1,7× a 1,8× el cuerpo y ver el veredicto cambiar enseña la REGLA. Y
 * enseña algo que ninguna galería cuenta: dónde está exactamente la frontera, y
 * que un patrón "casi" no es el patrón.
 *
 * Las condiciones que fallan se muestran igual que las que pasan, con el valor
 * medido al lado. Ver "le falta un 3 % de mecha" explica el concepto mejor que
 * cualquier definición.
 */

// Presets pensados para enseñar, no para adornar: cada uno cae justo en un
// lado de una frontera concreta.
const PRESETS = [
  { key: 'labPresetHammer',    v: { open: 62, high: 66, low: 12, close: 66 } },
  { key: 'labPresetStar',      v: { open: 34, high: 88, low: 30, close: 38 } },
  { key: 'labPresetDoji',      v: { open: 50, high: 78, low: 22, close: 51 } },
  { key: 'labPresetMarubozu',  v: { open: 14, high: 87, low: 12, close: 85 } },
  { key: 'labPresetSoldier',   v: { open: 22, high: 82, low: 18, close: 78 } },
  // Falla SOLO por la mecha superior: 3 puntos frente a un límite de 2,4
  // (0,4× el cuerpo). Es el preset más didáctico del laboratorio — enseña que
  // "casi" no es el patrón, y exactamente por cuánto.
  { key: 'labPresetNearMiss',  v: { open: 60, high: 69, low: 20, close: 66 } },
];

const DEFAULT = { open: 30, high: 90, low: 15, close: 70 };

const CandleLab = ({ theme }) => {
  const { t } = useTranslation();
  const [c, setC] = useState(DEFAULT);

  // Restricciones físicas de una vela: el máximo no puede estar por debajo del
  // cuerpo ni el mínimo por encima. Sin esto se pueden construir velas
  // imposibles y el laboratorio enseñaría física falsa.
  const set = (field) => (e) => {
    const v = Number(e.target.value);
    setC((prev) => {
      const next = { ...prev, [field]: v };
      const bodyTop = Math.max(next.open, next.close);
      const bodyLow = Math.min(next.open, next.close);
      next.high = Math.max(next.high, bodyTop);
      next.low = Math.min(next.low, bodyLow);
      return next;
    });
  };

  const { metrics: m, results, matched } = useMemo(() => classify(c), [c]);
  const isBull = c.close > c.open;
  const color = isBull ? '#22c55e' : '#ef4444';

  // Geometría del dibujo (0..100 → alto del SVG, invertido).
  const y = (v) => 100 - v;
  const bodyTop = Math.max(c.open, c.close);
  const bodyLow = Math.min(c.open, c.close);

  const Bar = ({ label, value, pct }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: 'var(--mk-accent, #22c55e)' }} />
      </div>
      <span className="text-[10px] font-mono w-12 text-right">{value}</span>
    </div>
  );

  return (
    <Card style={theme ? themeVars(theme) : undefined} data-testid="candle-lab">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-unbounded text-base">
          <FlaskConical className="w-5 h-5" style={{ color: 'var(--mk-accent, hsl(var(--primary)))' }} />
          {t('labTitle')}
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('labIntro')}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
          {/* La vela */}
          <div className="flex flex-col items-center justify-center gap-2">
            <svg viewBox="0 0 40 100" className="w-20 h-44" preserveAspectRatio="none" aria-hidden="true">
              <line x1="20" y1={y(c.high)} x2="20" y2={y(bodyTop)} stroke={color} strokeWidth="1.5" />
              <line x1="20" y1={y(bodyLow)} x2="20" y2={y(c.low)} stroke={color} strokeWidth="1.5" />
              <rect
                x="8" y={y(bodyTop)} width="24"
                height={Math.max(Math.abs(bodyTop - bodyLow), 0.6)}
                fill={isBull ? color : 'none'} stroke={color} strokeWidth="1.5"
              />
            </svg>
            <div className="text-[10px] font-mono text-muted-foreground text-center leading-tight">
              O {c.open} · H {c.high}<br />L {c.low} · C {c.close}
            </div>
          </div>

          {/* Controles + medidas */}
          <div className="space-y-3">
            {['open', 'high', 'low', 'close'].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <label htmlFor={`lab-${f}`} className="text-[11px] font-mono uppercase w-12 shrink-0 text-muted-foreground">{f}</label>
                <input
                  id={`lab-${f}`} type="range" min="0" max="100" value={c[f]} onChange={set(f)}
                  className="flex-1 accent-[color:var(--mk-accent,#22c55e)]"
                  data-testid={`lab-${f}`}
                />
                <span className="text-[11px] font-mono w-8 text-right">{c[f]}</span>
              </div>
            ))}

            <div className="pt-1 space-y-1.5" data-testid="lab-metrics">
              <Bar label={t('candleBodyLabel')} value={`${(m.bodyPct * 100).toFixed(0)}%`} pct={m.bodyPct * 100} />
              <Bar label={t('candleUpperWickLabel')} value={`${((m.upper / m.range) * 100).toFixed(0)}%`} pct={(m.upper / m.range) * 100} />
              <Bar label={t('candleLowerWickLabel')} value={`${((m.lower / m.range) * 100).toFixed(0)}%`} pct={(m.lower / m.range) * 100} />
            </div>
          </div>
        </div>

        {/* Veredicto */}
        <div className="rounded-lg border border-border bg-muted/30 p-3" data-testid="lab-verdict">
          {matched.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{t('labFormsA')}</span>
              {matched.map((r) => (
                <span
                  key={r.id}
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--mk-soft,rgba(34,197,94,0.12))', color: 'var(--mk-accent,#22c55e)' }}
                >
                  {PATTERN_NAME_KEY[r.id] ? t(PATTERN_NAME_KEY[r.id]) : t('labSoldierCandle')}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t('labFormsNothing')}</div>
          )}
        </div>

        {/* Reglas: por qué sí y por qué no */}
        <div>
          <h4 className="text-xs font-semibold mb-2">{t('labRulesTitle')}</h4>
          <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
            {results.map((r) => (
              <div key={r.id} className={`rounded-md border px-2.5 py-1.5 ${r.ok ? 'border-long/40 bg-long/5' : 'border-border bg-muted/20'}`}>
                <div className="flex items-center gap-1.5">
                  {r.ok
                    ? <Check className="w-3.5 h-3.5 text-long shrink-0" />
                    : <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className={`text-xs font-semibold ${r.ok ? '' : 'text-muted-foreground'}`}>
                    {PATTERN_NAME_KEY[r.id] ? t(PATTERN_NAME_KEY[r.id]) : t('labSoldierCandle')}
                  </span>
                  <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-muted text-muted-foreground">
                    {t(r.basis === 'body' ? 'structBasisBody' : r.basis === 'wicks' ? 'structBasisWicks' : 'structBasisBoth')}
                  </span>
                </div>
                {/* Lo que FALTA, con el número medido: es donde se aprende. */}
                {!r.ok && (
                  <div className="mt-0.5 pl-5 text-[10px] font-mono text-muted-foreground">
                    {r.failed.map((f) => (
                      <div key={f.label}>
                        {t(`labRule_${f.label}`)}: {f.unit === 'x' ? `${f.got.toFixed(2)}×` : `${(f.got * 100).toFixed(0)}%`}
                        {' '}<span className="opacity-60">({f.cmp} {f.unit === 'x' ? `${f.want}×` : `${(f.want * 100).toFixed(0)}%`})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setC(p.v)}
              className="text-[11px] px-2 py-1 rounded border border-border hover:border-[color:var(--mk-accent,#22c55e)] transition-colors"
              data-testid={`lab-preset-${p.key}`}
            >
              {t(p.key)}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setC(DEFAULT)} className="text-[11px] h-7 ml-auto">
            <RotateCcw className="w-3 h-3 mr-1" />{t('labReset')}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">{t('labNote')}</p>
      </CardContent>
    </Card>
  );
};

export default CandleLab;
