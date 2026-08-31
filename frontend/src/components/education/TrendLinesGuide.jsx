import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, TrendingDown, Target, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── SVG Chart for Bullish Trend Line ─────────────────────────────────────────
function BullishChart({ t }) {
  const W = 560, H = 260;
  const pad = { l: 40, r: 20, t: 20, b: 30 };

  // Price points (x, y) — higher lows trend
  const touches = [
    { x: 60,  y: 200 },
    { x: 140, y: 170 },
    { x: 220, y: 140 },
  ];

  // Candle-like bars between touches
  const bars = [
    { x: 60,  o: 210, c: 195, h: 215, l: 190, bull: false },
    { x: 90,  o: 195, c: 185, h: 200, l: 180, bull: false },
    { x: 120, o: 185, c: 178, h: 190, l: 175, bull: false },
    { x: 140, o: 178, c: 172, h: 183, l: 168, bull: false },
    { x: 160, o: 172, c: 162, h: 177, l: 158, bull: false },
    { x: 180, o: 162, c: 155, h: 167, l: 150, bull: false },
    { x: 200, o: 155, c: 148, h: 160, l: 144, bull: false },
    { x: 220, o: 148, c: 142, h: 153, l: 138, bull: false },
    { x: 240, o: 142, c: 135, h: 147, l: 131, bull: false },
    { x: 260, o: 135, c: 125, h: 140, l: 120, bull: false },
    { x: 280, o: 125, c: 118, h: 130, l: 114, bull: false },
    { x: 300, o: 118, c: 112, h: 123, l: 108, bull: false },
    { x: 320, o: 112, c: 105, h: 117, l: 101, bull: false },
    { x: 340, o: 105, c: 98,  h: 110, l: 94,  bull: false },
    { x: 360, o: 98,  c: 90,  h: 103, l: 86,  bull: false },
    { x: 380, o: 90,  c: 82,  h: 95,  l: 78,  bull: false },
    { x: 400, o: 82,  c: 76,  h: 87,  l: 72,  bull: false },
    { x: 420, o: 76,  c: 68,  h: 81,  l: 64,  bull: true  },
    { x: 440, o: 68,  c: 62,  h: 73,  l: 58,  bull: true  },
    { x: 460, o: 62,  c: 55,  h: 67,  l: 51,  bull: true  },
    { x: 480, o: 55,  c: 48,  h: 60,  l: 44,  bull: true  },
    { x: 500, o: 48,  c: 40,  h: 53,  l: 36,  bull: true  },
    { x: 520, o: 40,  c: 35,  h: 45,  l: 30,  bull: true  },
  ];

  // Build a clean rising price wave with 3 bounces off the trend line
  const pricePoints = [
    { x: 60, y: 200 },
    { x: 100, y: 165 },
    { x: 140, y: 170 }, // touch 2
    { x: 175, y: 145 },
    { x: 220, y: 140 }, // touch 3
    { x: 260, y: 110 },
    { x: 300, y: 105 },
    { x: 330, y: 90  }, // entry zone
    { x: 380, y: 65  },
    { x: 430, y: 50  },
    { x: 480, y: 35  },
  ];

  const trendY1 = 205; // y at x=50
  const trendX1 = 50;
  const trendY2 = 100; // y at x=490
  const trendX2 = 490;

  // Entry bar at touch 3
  const entryX = 220;
  const entryY = 140;
  const slY = 160; // stop loss below trendline
  const tp1Y = 100;
  const tp2Y = 65;

  const polyline = pricePoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl" style={{ background: 'hsl(var(--card))' }}>
      {/* Grid lines */}
      {[60, 100, 140, 180, 220].map(y => (
        <line key={y} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}

      {/* Trend line (green, dashed extended) */}
      <line
        x1={trendX1} y1={trendY1}
        x2={trendX2} y2={trendY2}
        stroke="#22c55e" strokeWidth="2.5"
        strokeDasharray="8 4"
      />

      {/* Trend line touches */}
      {touches.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill="#22c55e" opacity="0.9" />
      ))}

      {/* Price line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Entry zone shading */}
      <rect x={entryX - 12} y={entryY - 10} width={24} height={20} rx="3"
        fill="#22c55e" opacity="0.2" />

      {/* Stop loss line */}
      <line x1={150} y1={slY} x2={360} y2={slY}
        stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={365} y={slY + 4} fontSize="9" fill="#ef4444" fontWeight="600">SL</text>

      {/* TP1 line */}
      <line x1={240} y1={tp1Y} x2={420} y2={tp1Y}
        stroke="#facc15" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={425} y={tp1Y + 4} fontSize="9" fill="#facc15" fontWeight="600">TP1</text>

      {/* TP2 line */}
      <line x1={320} y1={tp2Y} x2={490} y2={tp2Y}
        stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={495} y={tp2Y + 4} fontSize="9" fill="#a78bfa" fontWeight="600">TP2</text>

      {/* Touch labels */}
      {touches.map((p, i) => (
        <text key={i} x={p.x} y={p.y + 18} textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="700">
          T{i + 1}
        </text>
      ))}

      {/* Entry label */}
      <text x={entryX} y={entryY - 16} textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="700">
        {t('trendEntry')}
      </text>

      {/* Trend line label */}
      <text x={80} y={190} fontSize="10" fill="#22c55e" fontWeight="700" transform="rotate(-12 80 190)">
        {t('trendBullLine')}
      </text>

      {/* Axis labels */}
      {[{ x: 60, label: '' }, { x: 220, label: '' }, { x: 440, label: '' }].map((a, i) => (
        <text key={i} x={a.x} y={H - 8} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
          {a.label}
        </text>
      ))}
    </svg>
  );
}

// ─── SVG Chart for Bearish Trend Line ─────────────────────────────────────────
function BearishChart({ t }) {
  const W = 560, H = 260;

  const touches = [
    { x: 80,  y: 55 },
    { x: 200, y: 90 },
    { x: 320, y: 125 },
  ];

  const pricePoints = [
    { x: 60,  y: 40  },
    { x: 80,  y: 55  }, // touch 1
    { x: 120, y: 80  },
    { x: 160, y: 68  },
    { x: 200, y: 90  }, // touch 2
    { x: 245, y: 120 },
    { x: 280, y: 108 },
    { x: 320, y: 125 }, // touch 3 / entry
    { x: 365, y: 160 },
    { x: 410, y: 185 },
    { x: 460, y: 200 },
    { x: 510, y: 220 },
  ];

  const trendX1 = 55, trendY1 = 48;
  const trendX2 = 490, trendY2 = 150;

  const entryX = 320, entryY = 125;
  const slY = 105;
  const tp1Y = 165;
  const tp2Y = 200;

  const polyline = pricePoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl" style={{ background: 'hsl(var(--card))' }}>
      {[60, 100, 140, 180, 220].map(y => (
        <line key={y} x1={40} y1={y} x2={W - 20} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}

      {/* Bearish trend line */}
      <line
        x1={trendX1} y1={trendY1}
        x2={trendX2} y2={trendY2}
        stroke="#ef4444" strokeWidth="2.5"
        strokeDasharray="8 4"
      />

      {/* Touches */}
      {touches.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill="#ef4444" opacity="0.9" />
      ))}

      {/* Price line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Entry zone */}
      <rect x={entryX - 12} y={entryY - 10} width={24} height={20} rx="3"
        fill="#ef4444" opacity="0.2" />

      {/* Stop loss */}
      <line x1={220} y1={slY} x2={430} y2={slY}
        stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={435} y={slY + 4} fontSize="9" fill="#ef4444" fontWeight="600">SL</text>

      {/* TP1 */}
      <line x1={340} y1={tp1Y} x2={500} y2={tp1Y}
        stroke="#facc15" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={505} y={tp1Y + 4} fontSize="9" fill="#facc15" fontWeight="600">TP1</text>

      {/* TP2 */}
      <line x1={400} y1={tp2Y} x2={540} y2={tp2Y}
        stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={544} y={tp2Y + 4} fontSize="9" fill="#a78bfa" fontWeight="600">TP2</text>

      {/* Touch labels */}
      {touches.map((p, i) => (
        <text key={i} x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="700">
          T{i + 1}
        </text>
      ))}

      {/* Entry label */}
      <text x={entryX} y={entryY + 28} textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="700">
        {t('trendEntry')}
      </text>

      {/* Trend line label */}
      <text x={130} y={62} fontSize="10" fill="#ef4444" fontWeight="700" transform="rotate(12 130 62)">
        {t('trendBearLine')}
      </text>
    </svg>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, color }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {num}
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TrendLinesGuide() {
  const { t } = useTranslation();
  const [active, setActive] = useState('bull');
  const isBull = active === 'bull';
  const color = isBull ? '#22c55e' : '#ef4444';

  const bullSteps = [
    { title: t('trendBullStep1Title'), desc: t('trendBullStep1Desc') },
    { title: t('trendBullStep2Title'), desc: t('trendBullStep2Desc') },
    { title: t('trendBullStep3Title'), desc: t('trendBullStep3Desc') },
    { title: t('trendBullStep4Title'), desc: t('trendBullStep4Desc') },
    { title: t('trendBullStep5Title'), desc: t('trendBullStep5Desc') },
  ];

  const bearSteps = [
    { title: t('trendBearStep1Title'), desc: t('trendBearStep1Desc') },
    { title: t('trendBearStep2Title'), desc: t('trendBearStep2Desc') },
    { title: t('trendBearStep3Title'), desc: t('trendBearStep3Desc') },
    { title: t('trendBearStep4Title'), desc: t('trendBearStep4Desc') },
    { title: t('trendBearStep5Title'), desc: t('trendBearStep5Desc') },
  ];

  const steps = isBull ? bullSteps : bearSteps;

  const rules = [
    { icon: <CheckCircle2 className="w-4 h-4 text-long flex-shrink-0" />, text: t('trendRule1') },
    { icon: <CheckCircle2 className="w-4 h-4 text-long flex-shrink-0" />, text: t('trendRule2') },
    { icon: <CheckCircle2 className="w-4 h-4 text-long flex-shrink-0" />, text: t('trendRule3') },
    { icon: <AlertCircle className="w-4 h-4 text-caution flex-shrink-0" />,  text: t('trendRule4') },
    { icon: <AlertCircle className="w-4 h-4 text-caution flex-shrink-0" />,  text: t('trendRule5') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold font-unbounded">{t('trendTitle')}</h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">{t('trendSubtitle')}</p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setActive('bull')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            isBull
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          {t('trendBullish')}
        </button>
        <button
          onClick={() => setActive('bear')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            !isBull
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          {t('trendBearish')}
        </button>
      </div>

      {/* Definition card */}
      <div
        className="rounded-xl border p-4 text-sm leading-relaxed"
        style={{ borderColor: `${color}40`, background: `${color}08` }}
      >
        <p className="font-semibold mb-1" style={{ color }}>
          {isBull ? t('trendBullishDef') : t('trendBearishDef')}
        </p>
        <p className="text-muted-foreground">
          {isBull ? t('trendBullishDefDesc') : t('trendBearishDefDesc')}
        </p>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-xs font-semibold" style={{ color }}>
          {isBull ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isBull ? t('trendBullChartTitle') : t('trendBearChartTitle')}
          <span className="ml-auto text-muted-foreground font-normal">
            T1 T2 T3 = {t('trendTouches')} · {t('trendEntry')} · SL · TP1 TP2
          </span>
        </div>
        <div className="p-3">
          {isBull ? <BullishChart t={t} /> : <BearishChart t={t} />}
        </div>
        <div className="px-4 py-2 border-t border-border grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <span className="font-semibold" style={{ color }}>{t('trendEntry')}</span>
            <p className="text-muted-foreground">{isBull ? t('trendBullEntryNote') : t('trendBearEntryNote')}</p>
          </div>
          <div>
            <span className="font-semibold text-short">Stop Loss</span>
            <p className="text-muted-foreground">{isBull ? t('trendBullSLNote') : t('trendBearSLNote')}</p>
          </div>
          <div>
            <span className="font-semibold text-caution">Take Profit</span>
            <p className="text-muted-foreground">{t('trendTPNote')}</p>
          </div>
        </div>
      </div>

      {/* How to trade */}
      <div>
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color }} />
          {t('trendHowToTrade')}
        </h4>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <StepCard key={i} num={i + 1} title={s.title} desc={s.desc} color={color} />
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-info" />
          {t('trendRulesTitle')}
        </h4>
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              {r.icon}
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Break warning */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
        <p className="text-sm font-semibold text-warn mb-1">{t('trendBreakTitle')}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('trendBreakDesc')}</p>
      </div>
    </div>
  );
}
