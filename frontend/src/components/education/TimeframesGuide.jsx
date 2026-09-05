import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Clock, TrendingUp, Zap, Target, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { tf: 'M1',  label: '1 min',   candles: '~1440', noise: 5, style: 'scalping',  contextKey: 'tfM1Context',  useKey: 'tfM1Use',  stopKey: 'tfM1Stop'  },
  { tf: 'M5',  label: '5 min',   candles: '~288',  noise: 4, style: 'scalping',  contextKey: 'tfM5Context',  useKey: 'tfM5Use',  stopKey: 'tfM5Stop'  },
  { tf: 'M15', label: '15 min',  candles: '~96',   noise: 3, style: 'scalping',  contextKey: 'tfM15Context', useKey: 'tfM15Use', stopKey: 'tfM15Stop' },
  { tf: 'M30', label: '30 min',  candles: '~48',   noise: 3, style: 'day',       contextKey: 'tfM30Context', useKey: 'tfM30Use', stopKey: 'tfM30Stop' },
  { tf: 'H1',  label: '1 hora',  candles: '~24',   noise: 2, style: 'day',       contextKey: 'tfH1Context',  useKey: 'tfH1Use',  stopKey: 'tfH1Stop'  },
  { tf: 'H4',  label: '4 horas', candles: '~6',    noise: 2, style: 'swing',     contextKey: 'tfH4Context',  useKey: 'tfH4Use',  stopKey: 'tfH4Stop'  },
  { tf: 'D',   label: 'Diario',  candles: '~1',    noise: 1, style: 'swing',     contextKey: 'tfDContext',   useKey: 'tfDUse',   stopKey: 'tfDStop'   },
  { tf: 'W',   label: 'Semanal', candles: '~1/5',  noise: 1, style: 'position',  contextKey: 'tfWContext',   useKey: 'tfWUse',   stopKey: 'tfWStop'   },
  { tf: 'MN',  label: 'Mensual', candles: '~1/20', noise: 1, style: 'position',  contextKey: 'tfMNContext',  useKey: 'tfMNUse',  stopKey: 'tfMNStop'  },
];

const COMBINATIONS = [
  {
    styleKey: 'tfCombScalping',
    icon: <Zap className="w-4 h-4" />,
    color: '#f59e0b',
    context: 'H1 / H4',
    signal: 'M15',
    entry: 'M1 / M5',
    descKey: 'tfCombScalpingDesc',
  },
  {
    styleKey: 'tfCombDay',
    icon: <Clock className="w-4 h-4" />,
    color: '#3b82f6',
    context: 'D / H4',
    signal: 'H1',
    entry: 'M15 / M30',
    descKey: 'tfCombDayDesc',
  },
  {
    styleKey: 'tfCombSwing',
    icon: <TrendingUp className="w-4 h-4" />,
    color: '#22c55e',
    context: 'W / D',
    signal: 'H4',
    entry: 'H1',
    descKey: 'tfCombSwingDesc',
  },
  {
    styleKey: 'tfCombPosition',
    icon: <Target className="w-4 h-4" />,
    color: '#a78bfa',
    context: 'MN / W',
    signal: 'D',
    entry: 'H4 / D',
    descKey: 'tfCombPositionDesc',
  },
];

const STYLE_COLORS = {
  scalping: '#f59e0b',
  day: '#3b82f6',
  swing: '#22c55e',
  position: '#a78bfa',
};

// Noise bar
function NoiseBar({ level }) {
  const filled = level;
  const total = 5;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-sm"
          style={{
            background: i < filled
              ? `hsl(${(total - filled) * 24}, 90%, 55%)`
              : 'hsl(var(--border))',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimeframesGuide() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);
  const [filterStyle, setFilterStyle] = useState('all');

  const filtered = filterStyle === 'all' ? TIMEFRAMES : TIMEFRAMES.filter(tf => tf.style === filterStyle);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold font-unbounded">{t('tfGuideTitle')}</h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t('tfGuideSubtitle')}</p>
      </div>

      {/* MTF Hierarchy visual */}
      <div className="rounded-xl border border-border bg-muted/20 p-5">
        <h4 className="text-sm font-bold mb-4 text-center">{t('tfHierarchyTitle')}</h4>
        <div className="flex flex-col items-center gap-2">
          {/* Level 1 - Context */}
          <div className="w-full max-w-md">
            <div className="bg-blue-500/15 border border-blue-500/40 rounded-xl px-5 py-3 text-center">
              <p className="text-xs font-bold text-info uppercase tracking-widest mb-0.5">{t('tfLevel1Label')}</p>
              <p className="text-sm font-semibold">W · D · H4</p>
              <p className="text-xs text-muted-foreground">{t('tfLevel1Desc')}</p>
            </div>
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Level 2 - Signal */}
          <div className="w-full max-w-sm">
            <div className="bg-green-500/15 border border-green-500/40 rounded-xl px-5 py-3 text-center">
              <p className="text-xs font-bold text-long uppercase tracking-widest mb-0.5">{t('tfLevel2Label')}</p>
              <p className="text-sm font-semibold">H4 · H1 · M30</p>
              <p className="text-xs text-muted-foreground">{t('tfLevel2Desc')}</p>
            </div>
          </div>
          <div className="w-px h-4 bg-border" />
          {/* Level 3 - Entry */}
          <div className="w-full max-w-xs">
            <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl px-5 py-3 text-center">
              <p className="text-xs font-bold text-warn uppercase tracking-widest mb-0.5">{t('tfLevel3Label')}</p>
              <p className="text-sm font-semibold">M15 · M5 · M1</p>
              <p className="text-xs text-muted-foreground">{t('tfLevel3Desc')}</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4 italic">{t('tfHierarchyNote')}</p>
      </div>

      {/* Timeframes table */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-bold">{t('tfTableTitle')}</h4>
          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'scalping', 'day', 'swing', 'position'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStyle(s)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filterStyle === s
                    ? (s === 'all' ? 'hsl(var(--primary))' : STYLE_COLORS[s])
                    : 'hsl(var(--muted))',
                  color: filterStyle === s ? '#fff' : 'hsl(var(--muted-foreground))',
                }}
              >
                {s === 'all' ? t('tfAll') : t(`tfStyle_${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[56px_80px_1fr_80px_80px] gap-0 bg-muted/40 border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span>{t('tfColTF')}</span>
            <span>{t('tfColStyle')}</span>
            <span>{t('tfColUse')}</span>
            <span className="text-center">{t('tfColCandles')}</span>
            <span className="text-center">{t('tfColNoise')}</span>
          </div>

          {filtered.map((tf, idx) => {
            const isExpanded = expanded === tf.tf;
            const styleColor = STYLE_COLORS[tf.style];
            return (
              <div key={tf.tf} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}>
                <button
                  className="w-full grid grid-cols-[56px_80px_1fr_80px_80px] gap-0 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : tf.tf)}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono" style={{ color: styleColor }}>{tf.tf}</span>
                  </span>
                  <span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${styleColor}20`, color: styleColor }}
                    >
                      {t(`tfStyle_${tf.style}`)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground truncate pr-2">{t(tf.useKey)}</span>
                  <span className="text-xs text-center text-muted-foreground">{tf.candles}</span>
                  <span className="flex justify-center items-center">
                    <NoiseBar level={tf.noise} />
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-border/50 bg-muted/5">
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-muted-foreground mb-0.5">{t('tfDetailContext')}</p>
                        <p className="text-foreground">{t(tf.contextKey)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground mb-0.5">{t('tfDetailStop')}</p>
                        <p className="text-foreground">{t(tf.stopKey)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">{t('tfTableNote')}</p>
      </div>

      {/* MTF Combinations */}
      <div>
        <h4 className="text-sm font-bold mb-4">{t('tfCombTitle')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMBINATIONS.map(c => (
            <div
              key={c.styleKey}
              className="rounded-xl border p-4 space-y-3"
              style={{ borderColor: `${c.color}30`, background: `${c.color}08` }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: c.color }}>{c.icon}</span>
                <span className="text-sm font-bold" style={{ color: c.color }}>{t(c.styleKey)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="font-semibold text-info mb-0.5">{t('tfLevel1Label')}</p>
                  <p className="font-mono font-bold">{c.context}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-long mb-0.5">{t('tfLevel2Label')}</p>
                  <p className="font-mono font-bold">{c.signal}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-warn mb-0.5">{t('tfLevel3Label')}</p>
                  <p className="font-mono font-bold">{c.entry}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(c.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top-Down method */}
      <div className="bg-muted/30 border border-border rounded-xl p-5">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t('tfTopDownTitle')}
        </h4>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{n}</div>
              <div>
                <p className="text-sm font-semibold">{t(`tfTopDownStep${n}Title`)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`tfTopDownStep${n}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key rules */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
        <p className="text-sm font-semibold text-warn mb-2">{t('tfRulesTitle')}</p>
        <ul className="space-y-1">
          {[1, 2, 3].map(n => (
            <li key={n} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-warn mt-0.5">•</span>
              {t(`tfRule${n}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
