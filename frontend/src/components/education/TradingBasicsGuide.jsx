import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import {
  TrendingUp, TrendingDown, Target, Shield, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Info, ArrowUp, ArrowDown,
  DollarSign, Percent, BookOpen, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ──────────────────────────────────────────────────────────────────────────────
//  SVG: simplified price chart to illustrate long / short / TP / SL
// ──────────────────────────────────────────────────────────────────────────────

function LongDiagram({ entry, caption }) {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-xs mx-auto" aria-label="Long diagram">
      {[40, 80, 120, 160].map(y => (
        <line key={y} x1="40" y1={y} x2="300" y2={y} stroke="#ffffff10" strokeWidth="1" />
      ))}
      <polyline
        points="40,150 80,130 120,110 160,125 200,90 240,60 280,45"
        fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round"
      />
      <polygon
        points="40,150 80,130 120,110 160,125 200,90 240,60 280,45 280,150"
        fill="#22c55e" fillOpacity="0.07"
      />
      <line x1="120" y1="30" x2="120" y2="155" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="120" cy="110" r="5" fill="#facc15" />
      <text x="123" y="28" fill="#facc15" fontSize="10" fontWeight="bold">{entry}</text>
      <line x1="40" y1="55" x2="300" y2="55" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="245" y="50" fill="#22c55e" fontSize="10" fontWeight="bold">TP ↑</text>
      <line x1="40" y1="140" x2="300" y2="140" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="245" y="155" fill="#ef4444" fontSize="10" fontWeight="bold">SL ↓</text>
      <line x1="165" y1="55" x2="165" y2="110" stroke="#22c55e" strokeWidth="2" />
      <polygon points="161,60 169,60 165,52" fill="#22c55e" />
      <text x="168" y="88" fill="#22c55e" fontSize="9">+PnL</text>
      <line x1="185" y1="110" x2="185" y2="140" stroke="#ef4444" strokeWidth="2" />
      <polygon points="181,138 189,138 185,146" fill="#ef4444" />
      <text x="188" y="130" fill="#ef4444" fontSize="9">-SL</text>
      <text x="55" y="175" fill="#94a3b8" fontSize="9">{caption}</text>
    </svg>
  );
}

function ShortDiagram({ entry, caption }) {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-xs mx-auto" aria-label="Short diagram">
      {[40, 80, 120, 160].map(y => (
        <line key={y} x1="40" y1={y} x2="300" y2={y} stroke="#ffffff10" strokeWidth="1" />
      ))}
      <polyline
        points="40,40 80,55 120,70 160,60 200,90 240,120 280,145"
        fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round"
      />
      <polygon
        points="40,40 80,55 120,70 160,60 200,90 240,120 280,145 280,40"
        fill="#ef4444" fillOpacity="0.07"
      />
      <line x1="120" y1="25" x2="120" y2="155" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="120" cy="70" r="5" fill="#facc15" />
      <text x="123" y="23" fill="#facc15" fontSize="10" fontWeight="bold">{entry}</text>
      <line x1="40" y1="140" x2="300" y2="140" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="245" y="155" fill="#22c55e" fontSize="10" fontWeight="bold">TP ↓</text>
      <line x1="40" y1="38" x2="300" y2="38" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="245" y="33" fill="#ef4444" fontSize="10" fontWeight="bold">SL ↑</text>
      <line x1="165" y1="70" x2="165" y2="140" stroke="#22c55e" strokeWidth="2" />
      <polygon points="161,138 169,138 165,146" fill="#22c55e" />
      <text x="168" y="110" fill="#22c55e" fontSize="9">+PnL</text>
      <line x1="185" y1="38" x2="185" y2="70" stroke="#ef4444" strokeWidth="2" />
      <polygon points="181,42 189,42 185,34" fill="#ef4444" />
      <text x="188" y="58" fill="#ef4444" fontSize="9">-SL</text>
      <text x="45" y="175" fill="#94a3b8" fontSize="9">{caption}</text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
//  FAQ accordion
// ──────────────────────────────────────────────────────────────────────────────

function FaqAccordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            {open === i
              ? <ChevronDown className="w-4 h-4 text-primary flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            }
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
//  Compare row
// ──────────────────────────────────────────────────────────────────────────────

function CompareRow({ label, long, short }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 px-3 text-xs text-muted-foreground font-medium w-1/3">{label}</td>
      <td className="py-2 px-3 text-xs text-long">{long}</td>
      <td className="py-2 px-3 text-xs text-short">{short}</td>
    </tr>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
//  Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function TradingBasicsGuide() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('long');

  const sections = [
    { id: 'long',      label: t('basicsLongLabel'),   icon: TrendingUp,   color: 'text-long' },
    { id: 'short',     label: t('basicsShortLabel'),  icon: TrendingDown, color: 'text-short'   },
    { id: 'tp',        label: t('takeProfit'),         icon: Target,       color: 'text-emerald-400' },
    { id: 'sl',        label: t('stopLoss'),           icon: Shield,       color: 'text-warn' },
    { id: 'positions', label: t('positionSize'),       icon: Layers,       color: 'text-info' },
  ];

  const FAQ_LONG = [
    { q: t('basicsFaqLong1Q'), a: t('basicsFaqLong1A') },
    { q: t('basicsFaqLong2Q'), a: t('basicsFaqLong2A') },
    { q: t('basicsFaqLong3Q'), a: t('basicsFaqLong3A') },
  ];
  const FAQ_SHORT = [
    { q: t('basicsFaqShort1Q'), a: t('basicsFaqShort1A') },
    { q: t('basicsFaqShort2Q'), a: t('basicsFaqShort2A') },
    { q: t('basicsFaqShort3Q'), a: t('basicsFaqShort3A') },
  ];
  const FAQ_TP = [
    { q: t('basicsFaqTp1Q'), a: t('basicsFaqTp1A') },
    { q: t('basicsFaqTp2Q'), a: t('basicsFaqTp2A') },
    { q: t('basicsFaqTp3Q'), a: t('basicsFaqTp3A') },
  ];
  const FAQ_SL = [
    { q: t('basicsFaqSl1Q'), a: t('basicsFaqSl1A') },
    { q: t('basicsFaqSl2Q'), a: t('basicsFaqSl2A') },
    { q: t('basicsFaqSl3Q'), a: t('basicsFaqSl3A') },
    { q: t('basicsFaqSl4Q'), a: t('basicsFaqSl4A') },
  ];
  const FAQ_POSITIONS = [
    { q: t('basicsFaqPos1Q'), a: t('basicsFaqPos1A') },
    { q: t('basicsFaqPos2Q'), a: t('basicsFaqPos2A') },
    { q: t('basicsFaqPos3Q'), a: t('basicsFaqPos3A') },
    { q: t('basicsFaqPos4Q'), a: t('basicsFaqPos4A') },
    { q: t('basicsFaqPos5Q'), a: t('basicsFaqPos5A') },
  ];

  return (
    <div className="space-y-8">

      {/* Hero */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-unbounded text-2xl">
            <BookOpen className="w-7 h-7 text-primary" />
            {t('basicsHeroTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{t('basicsHeroDesc')}</p>
        </CardContent>
      </Card>

      {/* Section navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {sections.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-sm font-medium
              ${activeSection === id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
          >
            <Icon className={`w-6 h-6 ${color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* ── LONG ─────────────────────────────────────────────────────────── */}
      {activeSection === 'long' && (
        <motion.div key="long" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-long">
                <TrendingUp className="w-6 h-6" />
                {t('basicsLongTitle')}
                <Badge className="ml-auto bg-green-500/20 text-long border-green-500/30">{t('basicsLongBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{t('basicsLongDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <ArrowUp className="w-4 h-4 text-long mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenToOpen')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsLongWhenDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <DollarSign className="w-4 h-4 text-long mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenYouWin')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsLongWinDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <XCircle className="w-4 h-4 text-short mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenYouLose')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsLongLoseDesc')}</p>
                  </div>
                </div>
              </div>
              <LongDiagram entry={t('basicsEntry')} caption={t('basicsLongDiagramCaption')} />
              <div className="p-4 rounded-lg bg-card border border-green-500/20">
                <p className="text-xs font-semibold text-long mb-2 flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5" /> {t('basicsLongFormulaTitle')}
                </p>
                <p className="font-mono text-sm text-foreground">{t('basicsLongFormula')}</p>
                <p className="text-xs text-muted-foreground mt-2">{t('basicsLongFormulaExample')}</p>
              </div>
            </CardContent>
          </Card>
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> {t('basicsFaqLongTitle')}
            </h3>
            <FaqAccordion items={FAQ_LONG} />
          </div>
        </motion.div>
      )}

      {/* ── SHORT ────────────────────────────────────────────────────────── */}
      {activeSection === 'short' && (
        <motion.div key="short" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-short">
                <TrendingDown className="w-6 h-6" />
                {t('basicsShortTitle')}
                <Badge className="ml-auto bg-red-500/20 text-short border-red-500/30">{t('basicsShortBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{t('basicsShortDesc')}</p>
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-warn">{t('basicsImportant')}</strong> {t('basicsShortWarning')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <ArrowDown className="w-4 h-4 text-short mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenToOpen')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsShortWhenDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <DollarSign className="w-4 h-4 text-long mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenYouWin')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsShortWinDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                  <XCircle className="w-4 h-4 text-short mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t('basicsWhenYouLose')}</p>
                    <p className="text-xs text-muted-foreground">{t('basicsShortLoseDesc')}</p>
                  </div>
                </div>
              </div>
              <ShortDiagram entry={t('basicsEntry')} caption={t('basicsShortDiagramCaption')} />
              <div className="p-4 rounded-lg bg-card border border-red-500/20">
                <p className="text-xs font-semibold text-short mb-2 flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5" /> {t('basicsShortFormulaTitle')}
                </p>
                <p className="font-mono text-sm text-foreground">{t('basicsShortFormula')}</p>
                <p className="text-xs text-muted-foreground mt-2">{t('basicsShortFormulaExample')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3">{t('basicsCompareTitle')}</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/30 text-xs font-semibold">
                        <th className="py-2 px-3 text-muted-foreground">{t('basicsCompareConcept')}</th>
                        <th className="py-2 px-3 text-long">Long ↑</th>
                        <th className="py-2 px-3 text-short">Short ↓</th>
                      </tr>
                    </thead>
                    <tbody>
                      <CompareRow label={t('basicsCompareRowDir')}    long={t('basicsCompareLongDir')}    short={t('basicsCompareShortDir')} />
                      <CompareRow label={t('basicsCompareRowAction')} long={t('basicsCompareLongAction')} short={t('basicsCompareShortAction')} />
                      <CompareRow label={t('basicsCompareRowClose')}  long={t('basicsCompareLongClose')}  short={t('basicsCompareShortClose')} />
                      <CompareRow label={t('basicsCompareRowMaxLoss')} long={t('basicsCompareLongMaxLoss')} short={t('basicsCompareShortMaxLoss')} />
                      <CompareRow label={t('basicsCompareRowTp')}     long={t('basicsCompareLongTp')}     short={t('basicsCompareShortTp')} />
                      <CompareRow label={t('basicsCompareRowSl')}     long={t('basicsCompareLongSl')}     short={t('basicsCompareShortSl')} />
                      <CompareRow label={t('basicsCompareRowMargin')} long={t('basicsCompareLongMargin')} short={t('basicsCompareShortMargin')} />
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> {t('basicsFaqShortTitle')}
            </h3>
            <FaqAccordion items={FAQ_SHORT} />
          </div>
        </motion.div>
      )}

      {/* ── TAKE PROFIT ──────────────────────────────────────────────────── */}
      {activeSection === 'tp' && (
        <motion.div key="tp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-emerald-400">
                <Target className="w-6 h-6" />
                {t('basicsTpTitle')}
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{t('basicsTpBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">{t('basicsTpDesc')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: CheckCircle, color: 'text-long', titleKey: 'basicsTpBen1Title', descKey: 'basicsTpBen1Desc' },
                  { icon: CheckCircle, color: 'text-long', titleKey: 'basicsTpBen2Title', descKey: 'basicsTpBen2Desc' },
                  { icon: CheckCircle, color: 'text-long', titleKey: 'basicsTpBen3Title', descKey: 'basicsTpBen3Desc' },
                  { icon: CheckCircle, color: 'text-long', titleKey: 'basicsTpBen4Title', descKey: 'basicsTpBen4Desc' },
                ].map(({ icon: Icon, color, titleKey, descKey }) => (
                  <div key={titleKey} className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
                    <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t(titleKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" /> {t('basicsTpMethodsTitle')}
                </h3>
                <div className="space-y-3">
                  {[
                    { num: '01', titleKey: 'basicsTpM1Title', descKey: 'basicsTpM1Desc', exKey: 'basicsTpM1Example' },
                    { num: '02', titleKey: 'basicsTpM2Title', descKey: 'basicsTpM2Desc', exKey: 'basicsTpM2Example' },
                    { num: '03', titleKey: 'basicsTpM3Title', descKey: 'basicsTpM3Desc', exKey: 'basicsTpM3Example' },
                    { num: '04', titleKey: 'basicsTpM4Title', descKey: 'basicsTpM4Desc', exKey: 'basicsTpM4Example' },
                    { num: '05', titleKey: 'basicsTpM5Title', descKey: 'basicsTpM5Desc', exKey: 'basicsTpM5Example' },
                  ].map(({ num, titleKey, descKey, exKey }) => (
                    <div key={num} className="flex gap-3 p-4 rounded-lg bg-card border border-border">
                      <span className="text-2xl font-bold text-primary/30 font-mono leading-none">{num}</span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
                        <p className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded mt-2">{t(exKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> {t('basicsFaqTpTitle')}
            </h3>
            <FaqAccordion items={FAQ_TP} />
          </div>
        </motion.div>
      )}

      {/* ── STOP LOSS ────────────────────────────────────────────────────── */}
      {activeSection === 'sl' && (
        <motion.div key="sl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-warn">
                <Shield className="w-6 h-6" />
                {t('basicsSlTitle')}
                <Badge className="ml-auto bg-red-500/20 text-short border-red-500/30">{t('basicsSlBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">{t('basicsSlDesc')}</p>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-short flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-short mb-1">{t('basicsSlGoldenTitle')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('basicsSlGoldenRule')}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-warn" /> {t('basicsSlTypesTitle')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { titleKey: 'basicsSlT1Title', descKey: 'basicsSlT1Desc', badgeKey: 'basicsSlT1Badge', badgeColor: 'bg-green-500/20 text-long border-green-500/30' },
                    { titleKey: 'basicsSlT2Title', descKey: 'basicsSlT2Desc', badgeKey: 'basicsSlT2Badge', badgeColor: 'bg-blue-500/20 text-info border-blue-500/30' },
                    { titleKey: 'basicsSlT3Title', descKey: 'basicsSlT3Desc', badgeKey: 'basicsSlT3Badge', badgeColor: 'bg-purple-500/20 text-compare border-purple-500/30' },
                    { titleKey: 'basicsSlT4Title', descKey: 'basicsSlT4Desc', badgeKey: 'basicsSlT4Badge', badgeColor: 'bg-yellow-500/20 text-caution border-yellow-500/30' },
                  ].map(({ titleKey, descKey, badgeKey, badgeColor }) => (
                    <div key={titleKey} className="p-4 rounded-lg bg-card border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
                        <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>{t(badgeKey)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-short" /> {t('basicsSlErrorsTitle')}
                </h3>
                <div className="space-y-2">
                  {[
                    { eKey: 'basicsSlE1', fKey: 'basicsSlFix1' },
                    { eKey: 'basicsSlE2', fKey: 'basicsSlFix2' },
                    { eKey: 'basicsSlE3', fKey: 'basicsSlFix3' },
                    { eKey: 'basicsSlE4', fKey: 'basicsSlFix4' },
                    { eKey: 'basicsSlE5', fKey: 'basicsSlFix5' },
                  ].map(({ eKey, fKey }) => (
                    <div key={eKey} className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 text-short flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-short">{t(eKey)}</p>
                      </div>
                      <div className="flex items-start gap-2 mt-1.5 pl-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-long flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{t(fKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-card border border-orange-500/20">
                  <p className="text-xs font-semibold text-warn mb-2">{t('basicsSlFormula1Title')}</p>
                  <p className="font-mono text-xs text-foreground">{t('basicsSlFormula1')}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t('basicsSlFormula1Ex')}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-red-500/20">
                  <p className="text-xs font-semibold text-short mb-2">{t('basicsSlFormula2Title')}</p>
                  <p className="font-mono text-xs text-foreground">{t('basicsSlFormula2')}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t('basicsSlFormula2Ex')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> {t('basicsFaqSlTitle')}
            </h3>
            <FaqAccordion items={FAQ_SL} />
          </div>
        </motion.div>
      )}

      {/* ── TAMAÑO DE POSICIÓN ───────────────────────────────────────────── */}
      {activeSection === 'positions' && (
        <motion.div key="positions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="border-cyan-500/30 bg-cyan-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-info">
                <Layers className="w-6 h-6" />
                {t('basicsPosTitle')}
                <Badge className="ml-auto bg-cyan-500/20 text-info border-cyan-500/30">{t('basicsPosBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground leading-relaxed">{t('basicsPosDesc')}</p>

              {/* Lot table */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-info" /> {t('basicsPosTableTitle')}
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/40 text-xs font-semibold">
                        <th className="py-2.5 px-3 text-muted-foreground">{t('basicsPosColType')}</th>
                        <th className="py-2.5 px-3 text-muted-foreground">{t('basicsPosColSize')}</th>
                        <th className="py-2.5 px-3 text-muted-foreground">{t('basicsPosColUnits')}</th>
                        <th className="py-2.5 px-3 text-muted-foreground">{t('basicsPosColPip')}</th>
                        <th className="py-2.5 px-3 text-muted-foreground">{t('basicsPosColAccount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { nameKey: 'basicsMicroName', lot: '0.01', units: '1.000', pip: '~$0.10', accountKey: 'basicsMicroAccount', color: 'text-sky-400',    badgeKey: 'basicsMicroBadge',  badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
                        { nameKey: 'basicsMiniName',  lot: '0.1',  units: '10.000', pip: '~$1.00', accountKey: 'basicsMiniAccount',  color: 'text-info',  badgeKey: 'basicsMiniNBadge', badgeColor: 'bg-cyan-500/20 text-info border-cyan-500/30' },
                        { nameKey: 'basicsStdName',   lot: '1.0',  units: '100.000', pip: '~$10.00', accountKey: 'basicsStdAccount',  color: 'text-teal-400',  badgeKey: 'basicsStdBadge',   badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
                        { nameKey: 'basicsMacroName', lot: '10+',  units: '1.000.000+', pip: '~$100+', accountKey: 'basicsMacroAccount', color: 'text-compare', badgeKey: 'basicsMacroBadge', badgeColor: 'bg-purple-500/20 text-compare border-purple-500/30' },
                      ].map(({ nameKey, lot, units, pip, accountKey, color, badgeKey, badgeColor }) => (
                        <tr key={lot} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${color}`}>{t(nameKey)}</span>
                              <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${badgeColor}`}>{t(badgeKey)}</Badge>
                            </div>
                          </td>
                          <td className={`py-2.5 px-3 text-xs font-mono font-bold ${color}`}>{lot}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{units}</td>
                          <td className={`py-2.5 px-3 text-xs font-semibold ${color}`}>{pip}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{t(accountKey)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">{t('basicsPosNote')}</p>
              </div>

              {/* Detail cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { titleKey: 'basicsMicroTitle', unitsKey: 'basicsMicroUnits', descKey: 'basicsMicroDesc', formula: '1 pip = $0.10', formula2: '100 pips = $10 | SL 50 pips → −$5', tipKey: 'basicsMicroTip', tipIcon: CheckCircle, tipColor: 'text-long', borderColor: 'border-sky-500/30 bg-sky-500/5', titleColor: 'text-sky-400', badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30', badgeKey: 'basicsMicroUnits' },
                  { titleKey: 'basicsMiniTitle',  unitsKey: 'basicsMiniUnits',  descKey: 'basicsMiniDesc',  formula: '1 pip = $1.00', formula2: '100 pips = $100 | SL 50 pips → −$50', tipKey: 'basicsMiniTip',  tipIcon: CheckCircle, tipColor: 'text-long', borderColor: 'border-cyan-500/30 bg-cyan-500/5', titleColor: 'text-info', badgeColor: 'bg-cyan-500/20 text-info border-cyan-500/30',  badgeKey: 'basicsMiniUnits' },
                  { titleKey: 'basicsStdTitle',   unitsKey: 'basicsStdUnits',   descKey: 'basicsStdDesc',   formula: '1 pip = $10.00', formula2: '100 pips = $1.000 | SL 50 pips → −$500', tipKey: 'basicsStdWarning', tipIcon: AlertTriangle, tipColor: 'text-warn', borderColor: 'border-teal-500/30 bg-teal-500/5', titleColor: 'text-teal-400', badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',  badgeKey: 'basicsStdUnits' },
                  { titleKey: 'basicsMacroTitle', unitsKey: 'basicsMacroUnits', descKey: 'basicsMacroDesc', formula: '10 lotes: 1 pip = $100', formula2: '100 lotes: 1 pip = $1.000', tipKey: 'basicsMacroInfo', tipIcon: Info, tipColor: 'text-info', borderColor: 'border-purple-500/30 bg-purple-500/5', titleColor: 'text-compare', badgeColor: 'bg-purple-500/20 text-compare border-purple-500/30', badgeKey: 'basicsMacroUnits' },
                ].map(({ titleKey, unitsKey, descKey, formula, formula2, tipKey, tipIcon: TipIcon, tipColor, borderColor, titleColor, badgeColor, badgeKey }) => (
                  <div key={titleKey} className={`p-4 rounded-xl border ${borderColor} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${titleColor}`}>{t(titleKey)}</p>
                      <Badge variant="outline" className={`${badgeColor} text-[10px]`}>{t(badgeKey)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
                    <div className="font-mono text-xs bg-card border border-border rounded p-2 space-y-1">
                      <p className={titleColor}>{formula}</p>
                      <p className="text-muted-foreground">{formula2}</p>
                    </div>
                    <div className="flex items-start gap-2 pt-1">
                      <TipIcon className={`w-3.5 h-3.5 ${tipColor} flex-shrink-0 mt-0.5`} />
                      <p className="text-xs text-muted-foreground">{t(tipKey)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formula section */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-info" /> {t('basicsPosFormulaTitle')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-card border border-cyan-500/20 space-y-2">
                    <p className="text-xs font-semibold text-info">{t('basicsPosFormulaLabel')}</p>
                    <p className="font-mono text-xs text-foreground leading-relaxed">{t('basicsPosFormula')}</p>
                    <div className="border-t border-border pt-2 space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold">{t('basicsPosFormulaExLabel')}</p>
                      <p className="text-xs text-muted-foreground">{t('basicsPosFormulaExDesc')}</p>
                      <p className="font-mono text-xs text-info">{t('basicsPosFormulaExResult')}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">{t('basicsPosGuideTitle')}</p>
                    <div className="space-y-1.5">
                      {[
                        { capital: '$500',    risk: '1% = $5',   lot: '0.05 micro',   color: 'text-sky-400' },
                        { capital: '$1.000',  risk: '1% = $10',  lot: '0.1 mini',     color: 'text-info' },
                        { capital: '$5.000',  risk: '1% = $50',  lot: '0.5 mini',     color: 'text-info' },
                        { capital: '$10.000', risk: '1% = $100', lot: '1.0 estándar', color: 'text-teal-400' },
                        { capital: '$50.000', risk: '1% = $500', lot: '5.0 estándar', color: 'text-teal-400' },
                      ].map(({ capital, risk, lot, color }) => (
                        <div key={capital} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-mono">{capital}</span>
                          <span className="text-muted-foreground">{risk}</span>
                          <span className={`font-semibold font-mono ${color}`}>{lot}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">{t('basicsPosGuideNote')}</p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-short flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-short mb-1">{t('basicsPosWarningTitle')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('basicsPosWarning')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> {t('basicsFaqPosTitle')}
            </h3>
            <FaqAccordion items={FAQ_POSITIONS} />
          </div>
        </motion.div>
      )}

      {/* Summary */}
      <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
        <CardContent className="p-6">
          <h3 className="font-unbounded font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {t('basicsSummaryTitle')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { color: 'border-green-500/40 bg-green-500/5',   icon: TrendingUp,   iconColor: 'text-long',   title: 'LONG',  descKey: 'basicsSummaryLongDesc' },
              { color: 'border-red-500/40 bg-red-500/5',       icon: TrendingDown, iconColor: 'text-short',     title: 'SHORT', descKey: 'basicsSummaryShortDesc' },
              { color: 'border-emerald-500/40 bg-emerald-500/5', icon: Target,     iconColor: 'text-emerald-400', title: 'TP',    descKey: 'basicsSummaryTpDesc' },
              { color: 'border-orange-500/40 bg-orange-500/5', icon: Shield,       iconColor: 'text-warn',  title: 'SL',    descKey: 'basicsSummarySlDesc' },
              { color: 'border-cyan-500/40 bg-cyan-500/5',     icon: Layers,       iconColor: 'text-info',    titleKey: 'basicsSummaryLotsTitle', descKey: 'basicsSummaryLotsDesc' },
            ].map(({ color, icon: Icon, iconColor, title, titleKey, descKey }) => (
              <div key={descKey} className={`p-4 rounded-lg border ${color} text-center space-y-2`}>
                <Icon className={`w-6 h-6 ${iconColor} mx-auto`} />
                <p className={`font-bold text-sm ${iconColor}`}>{titleKey ? t(titleKey) : title}</p>
                <p className="text-xs text-muted-foreground">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
