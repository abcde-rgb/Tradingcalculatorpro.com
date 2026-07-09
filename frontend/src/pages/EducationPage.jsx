import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, TrendingUp, TrendingDown, Target, Shield, AlertTriangle,
  ChevronRight, ChevronDown, Search, Filter, Star, Info,
  CandlestickChart, BarChart3, Scale, Brain, Lightbulb, X, CheckCircle2, Printer,
  Newspaper, Globe, Gauge, Activity, Sigma, Landmark, Focus, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n';
import { useSEO } from '@/hooks/useSEO';
import { getTradingRules, getGoldenRules, getAccountKillers, getTraderCraft, getSmartMoney, getOptionsStrategies, getAdvancedTA, getTradingBusiness, getRiskManagementConcepts, getChartPatterns, getCandlestickPatterns, getDowTheory, getTradingPsychology, getCapitalManagement, getTradingStrategies, getProbabilityStatistics, getTradingFundamentals, getTechnicalAnalysis, getFundamentalAnalysis, getTradingStylesContent, getMarketMechanics, getHarmonicPatterns, getWyckoffContent, getAlternativeCharts, getCotContent, getElliottWave, getIchimoku, getNewsTrading, getSentiment, getIntermarket, getBreadthCycles, getBrokerSafety, getMarginLiquidation, getOptionGreeks, getInstitutionalDesk, getInstitutionalMethods, getPositionBuilding, getTradingMindset, getTradingMasters, getFuturesMasters, getPartialExits, getStopsAndTargets, getTradeManagement, getProDiscipline, getStartHere, CANDLE_PATTERN_STATS } from '@/lib/tradingEducationContent';
import { useIsPremium } from '@/lib/premium';
import { useAuthStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import ExpectancyMatrix from '@/components/education/ExpectancyMatrix';
import ExpectancyCalculator from '@/components/education/ExpectancyCalculator';
import CandleAnatomy from '@/components/education/CandleAnatomy';
import CandlePatternFigure, { hasCandleBlueprint } from '@/components/education/CandlePatternFigure';
import LivePatternDetector from '@/components/education/LivePatternDetector';
import PatternFilterBar from '@/components/education/PatternFilterBar';
import LeverageGuide from '@/components/education/LeverageGuide';
import TradingPillarsGuide from '@/components/education/TradingPillarsGuide';
import TradingPyramid from '@/components/education/TradingPyramid';
import TrendLinesGuide from '@/components/education/TrendLinesGuide';
import TimeframesGuide from '@/components/education/TimeframesGuide';
import CapitalManagementTools from '@/components/education/CapitalManagementTools';
import StopLossGuide from '@/components/education/StopLossGuide';
import OrderTypesGuide from '@/components/education/OrderTypesGuide';
import DowTheoryDiagram from '@/components/education/DowTheoryDiagram';
import TradingStylesCompare from '@/components/education/TradingStylesCompare';
import RiskAnalysisTools from '@/components/education/RiskAnalysisTools';
import RiskOfRuinCalculator from '@/components/education/RiskOfRuinCalculator';
import WyckoffSchematic from '@/components/education/WyckoffSchematic';
import CotGuide from '@/components/education/CotGuide';
import GlossaryVisual from '@/components/education/GlossaryVisual';
import TimeVsImpact from '@/components/education/TimeVsImpact';

const priorityColors = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
};

const patternTypeColors = {
  bullish: 'text-green-500',
  bearish: 'text-red-500',
  neutral: 'text-yellow-500'
};

const PATTERN_BEHAVIOR_KEY = {
  reversal: 'patReversal',
  continuation: 'patContinuation',
  indecision: 'patIndecision',
};
// Colour the historical hit-rate by strength.
const candleRateColor = (r) =>
  r >= 65 ? 'text-green-500' : r >= 55 ? 'text-yellow-500' : 'text-muted-foreground';

// Motion variants extracted to module level to avoid inline-object re-renders
const MOTION_FADE_UP = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const MOTION_EXPAND = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};
const MOTION_FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const MOTION_SCALE_IN = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

function RuleCard({ rule, isExpanded, onToggle }) {
  const { t } = useTranslation();
  
  return (
    <motion.div
      layout
      {...MOTION_FADE_UP}
      className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/50 ${
        isExpanded ? 'bg-primary/5 border-primary' : 'bg-card border-border'
      }`}
      onClick={onToggle}
      data-testid={`rule-${rule.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-bold text-primary">#{rule.id}</span>
            <Badge variant="outline" className={priorityColors[rule.priority]}>
              {t(rule.priority)}
            </Badge>
            <Badge variant="secondary">{t(rule.category)}</Badge>
          </div>
          <h3 className="font-semibold">{rule.rule}</h3>
        </div>
        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            {...MOTION_EXPAND}
            className="mt-4 pt-4 border-t border-border"
          >
            <p className="text-muted-foreground text-sm leading-relaxed">
              {rule.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PatternCard({ pattern, onClick }) {
  const { t } = useTranslation();
  
  const getPatternTypeLabel = (type) => {
    if (type === 'bullish') return `↑ ${t('bullish')}`;
    if (type === 'bearish') return `↓ ${t('bearish')}`;
    return `↔ ${t('neutral')}`;
  };
  
  return (
    <Card 
      className="bg-card border-border hover:border-primary/50 cursor-pointer transition-all"
      onClick={() => onClick(pattern)}
      data-testid={`pattern-${pattern.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{pattern.name}</h3>
            {pattern.type && (
              <span className={`text-xs font-medium ${patternTypeColors[pattern.type]}`}>
                {getPatternTypeLabel(pattern.type)}
              </span>
            )}
          </div>
          {/* Mini SVG illustration drawn from OHLC blueprints (24x80 px per candle) */}
          <CandlePatternFigure patternId={pattern.id} className="flex-shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{pattern.description}</p>
        {(() => {
          const s = CANDLE_PATTERN_STATS[pattern.id];
          if (!s) {
            return pattern.reliability ? (
              <div className="mt-3 flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">{t('reliability')}: {pattern.reliability}</span>
              </div>
            ) : null;
          }
          return (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border">
                {t(PATTERN_BEHAVIOR_KEY[s.behavior] || 'patReversal')}
              </span>
              <span className={`text-xs font-bold font-mono ${candleRateColor(s.successRate)}`}>
                {s.successRate}%
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">· #{s.rank}/103</span>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

function PatternDetailModal({ pattern, onClose }) {
  const { t } = useTranslation();
  const [imageZoom, setImageZoom] = useState(false);
  
  if (!pattern) return null;
  
  const getPatternTypeLabel = (type) => {
    if (type === 'bullish') return t('bullishPattern');
    if (type === 'bearish') return t('bearishPattern');
    if (type === 'continuation') return t('continuationPattern');
    if (type === 'reversal') return t('reversalPattern');
    return t('neutralPattern');
  };
  
  return (
    <motion.div
      {...MOTION_FADE}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        {...MOTION_SCALE_IN}
        className="bg-card border border-border rounded-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="pattern-detail-modal"
      >
        <div className="p-6 lg:p-8">
          <div className="flex items-start justify-between mb-5 sticky top-0 bg-card/95 backdrop-blur-sm pb-3 -mt-2 -mx-2 px-2 z-10">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold">{pattern.name}</h2>
              {pattern.type && (
                <span className={`text-sm font-medium ${patternTypeColors[pattern.type]}`}>
                  {getPatternTypeLabel(pattern.type)}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="pattern-modal-close">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* LEFT column: image (large) — or, for candlestick patterns, a rendered SVG figure */}
            {pattern.image ? (
              <div className="lg:sticky lg:top-20 self-start">
                <button
                  type="button"
                  onClick={() => setImageZoom(true)}
                  className="w-full rounded-lg overflow-hidden border border-border bg-white cursor-zoom-in hover:border-primary/50 transition-colors group relative"
                  data-testid="pattern-image-zoom-trigger"
                  aria-label="Click to zoom"
                >
                  <img
                    src={pattern.image}
                    alt={pattern.name}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                  <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    🔍 Zoom
                  </span>
                </button>
              </div>
            ) : hasCandleBlueprint(pattern.id) ? (
              <div className="lg:sticky lg:top-20 self-start">
                <div
                  className="w-full rounded-lg border border-border bg-card flex items-center justify-center py-10"
                  data-testid="pattern-candle-figure"
                >
                  <CandlePatternFigure patternId={pattern.id} size="lg" showLabels />
                </div>
              </div>
            ) : null}

            {/* RIGHT column: textual content */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> {t('description')}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{pattern.description}</p>
              </div>
              
              {pattern.howToTrade && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> {t('howToTrade')}
                  </h3>
                  <ol className="space-y-2.5">
                    {pattern.howToTrade.map((step, idx) => (
                      <li key={`${pattern.id}-step-${idx}`} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-muted-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              
              {CANDLE_PATTERN_STATS[pattern.id] && (() => {
                const s = CANDLE_PATTERN_STATS[pattern.id];
                return (
                  <div className="grid grid-cols-3 gap-3" data-testid="pattern-stats">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('patBehaviorHint')}</p>
                      <p className="font-semibold mt-0.5">{t(PATTERN_BEHAVIOR_KEY[s.behavior] || 'patReversal')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('patSuccessRateLabel')}</p>
                      <p className={`font-bold font-mono mt-0.5 ${candleRateColor(s.successRate)}`}>{s.successRate}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('patRankLabel')}</p>
                      <p className="font-semibold font-mono mt-0.5">#{s.rank}/103</p>
                    </div>
                    <p className="col-span-3 text-[10px] text-muted-foreground/70 leading-relaxed">{t('patStatsNote')}</p>
                  </div>
                );
              })()}

              {pattern.reliability && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('reliability')}</p>
                    <p className="font-semibold">{pattern.reliability}</p>
                  </div>
                  {pattern.timeframes && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('bestTimeframes')}</p>
                      <div className="flex gap-1">
                        {pattern.timeframes.map(tf => (
                          <Badge key={tf} variant="secondary" className="text-xs">{tf}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            
              {pattern.signal && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">{t('signal')}</p>
                  <p className="font-semibold text-primary">{pattern.signal}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Image zoom lightbox */}
      {imageZoom && pattern.image && (
        <motion.div
          {...MOTION_FADE}
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setImageZoom(false); }}
          data-testid="pattern-image-lightbox"
        >
          <Button
            variant="ghost" size="icon"
            onClick={(e) => { e.stopPropagation(); setImageZoom(false); }}
            className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={pattern.image}
            alt={pattern.name}
            className="max-w-[95vw] max-h-[92vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function EducationPage() {
  const [activeTopic, setActiveTopic] = useState('start-here');
  const [topicQuery, setTopicQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRules, setExpandedRules] = useState(new Set([1, 2, 3]));
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [patternQuery, setPatternQuery] = useState('');
  const [patternTypeFilter, setPatternTypeFilter] = useState('all');
  const [candleQuery, setCandleQuery] = useState('');
  const [candleTypeFilter, setCandleTypeFilter] = useState('all');
  const [harmonicFilter, setHarmonicFilter] = useState('all');
  const { t } = useTranslation();

  const isPremium = useIsPremium();
  const { isAuthenticated } = useAuthStore();

  // Localize the English descriptor words inside harmonic Fibonacci ratios
  // (e.g. "61.8% of XA", "B retracement") while keeping the universal
  // Fibonacci notation (XA, AB, %, PRZ) intact.
  const localizeRatio = (s) =>
    String(s)
      .replace(/\bretracement\b/gi, t('hRetracement'))
      .replace(/\bextension\b/gi, t('hExtension'))
      .replace(/\bEntry\b/g, t('hEntry'))
      .replace(/\bof\b/gi, t('hOf'))
      .replace(/\bat\b/gi, t('hAt'))
      .replace(/\bor\b/gi, t('hOr'));

  useSEO({
    titleKey: 'seoEducationTitle',
    descriptionKey: 'seoEducationDesc',
    canonicalPath: '/education',
  });
  
  // ✅ Get ALL translated content dynamically based on current language
  const TRADING_RULES = getTradingRules(t);
  const GOLDEN_RULES = getGoldenRules(t);
  const ACCOUNT_KILLERS = getAccountKillers(t);
  const TRADER_CRAFT = getTraderCraft(t);
  const SMART_MONEY = getSmartMoney(t);
  const OPTIONS_STRATEGIES = getOptionsStrategies(t);
  const ADVANCED_TA = getAdvancedTA(t);
  const TRADING_BUSINESS = getTradingBusiness(t);
  const RISK_MANAGEMENT_CONCEPTS = getRiskManagementConcepts(t);
  const CHART_PATTERNS = getChartPatterns(t);
  const CANDLESTICK_PATTERNS = getCandlestickPatterns(t);
  const DOW_THEORY = getDowTheory(t);
  const TRADING_PSYCHOLOGY = getTradingPsychology(t);
  const CAPITAL_MANAGEMENT = getCapitalManagement(t);
  const TRADING_STRATEGIES = getTradingStrategies(t);
  const PROBABILITY_STATS = getProbabilityStatistics(t);
  const TRADING_FUNDAMENTALS = getTradingFundamentals(t);
  const TECHNICAL_ANALYSIS = getTechnicalAnalysis(t);
  const ELLIOTT_WAVE = getElliottWave(t);
  const ICHIMOKU = getIchimoku(t);
  const NEWS_TRADING = getNewsTrading(t);
  const SENTIMENT = getSentiment(t);
  const INTERMARKET = getIntermarket(t);
  const BREADTH_CYCLES = getBreadthCycles(t);
  const BROKER_SAFETY = getBrokerSafety(t);
  const MARGIN_LIQ = getMarginLiquidation(t);
  const OPTION_GREEKS = getOptionGreeks(t);
  const INST_DESK = getInstitutionalDesk(t);
  const INST_METHODS = getInstitutionalMethods(t);
  const POS_BUILDING = getPositionBuilding(t);
  const TRADING_MINDSET = getTradingMindset(t);
  const TRADING_MASTERS = getTradingMasters(t);
  const FUTURES_MASTERS = getFuturesMasters(t);
  const PARTIAL_EXITS = getPartialExits(t);
  const STOPS_TARGETS = getStopsAndTargets(t);
  const TRADE_MGMT = getTradeManagement(t);
  const PRO_DISCIPLINE = getProDiscipline(t);
  const FUNDAMENTAL_ANALYSIS = getFundamentalAnalysis(t);
  const TRADING_STYLES_CONTENT = getTradingStylesContent(t);
  const MARKET_MECHANICS = getMarketMechanics(t);
  const START_HERE = getStartHere(t);
  const HARMONIC_PATTERNS = getHarmonicPatterns(t);
  const WYCKOFF = getWyckoffContent(t);
  const ALT_CHARTS = getAlternativeCharts(t);
  const COT = getCotContent(t);

  // Grouped curriculum — 6 pillars, broker-academy style (IBKR Campus / IG Academy).
  // Values map 1:1 to the existing TabsContent blocks; only navigation changes.
  const EDUCATION_NAV = [
    { id: 'start', label: t('eduCatStart'), topics: [
      { value: 'start-here', label: t('shTitle') },
      { value: 'fundamentals', label: t('fundTab') },
      { value: 'mechanics', label: t('mechTab') },
      { value: 'styles', label: t('stylesTab') },
      { value: 'fund-analysis', label: t('fundAnalTab') },
      { value: 'broker-safety', label: t('bkrTitle') },
      { value: 'glossary', label: t('glossaryTab') },
    ]},
    { id: 'technical', label: t('eduCatTechnical'), topics: [
      { value: 'tech-analysis', label: t('techTab') },
      { value: 'chart-patterns', label: t('chartPatterns') },
      { value: 'candlesticks', label: t('candlestickPatterns') },
      { value: 'dow-theory', label: t('dowTheoryTitle') },
      { value: 'wyckoff', label: t('wyckoffTab') },
      { value: 'alt-charts', label: t('altChartTab') },
    ]},
    { id: 'advanced', label: t('eduCatAdvanced'), topics: [
      { value: 'elliott', label: t('ewTab') },
      { value: 'ichimoku', label: t('ichiTab') },
      { value: 'harmonic-patterns', label: t('harmonicPatternsTab') },
      { value: 'smc', label: t('smcTitle') },
      { value: 'advanced-ta', label: t('advTaTitle') },
      { value: 'sentiment', label: t('smTitle') },
      { value: 'intermarket', label: t('imTitle') },
      { value: 'breadth-cycles', label: t('bcTitle') },
      { value: 'cot', label: t('cotTab') },
    ]},
    { id: 'risk', label: t('eduCatRisk'), topics: [
      { value: 'risk', label: t('riskManagement') },
      { value: 'stops-targets', label: t('sltpTitle') },
      { value: 'capital', label: t('capitalManagementTitle') },
      { value: 'partial-exits', label: t('pexTitle') },
      { value: 'trade-mgmt', label: t('tmgTitle') },
      { value: 'margin-liq', label: t('mlqTitle') },
      { value: 'probability', label: t('probabilityStatsTitle') },
    ]},
    { id: 'psych', label: t('eduCatPsych'), topics: [
      { value: 'psychology', label: t('tradingPsychologyTitle') },
      { value: 'time-impact', label: t('tviTitle') },
      { value: 'mindset', label: t('mdzTitle') },
      { value: 'masters', label: t('mstrTitle') },
      { value: 'futures-masters', label: t('fmstTitle') },
      { value: 'rules', label: t('tradingRules') },
      { value: 'pro-discipline', label: t('discTitle') },
      { value: 'quiz', label: t('quizTab') },
    ]},
    { id: 'pro', label: t('eduCatPro'), topics: [
      { value: 'craft', label: t('craftTitle') },
      { value: 'strategies', label: t('tradingStrategiesTitle') },
      { value: 'option-greeks', label: t('gkTitle') },
      { value: 'options-strat', label: t('optTitle') },
      { value: 'news-trading', label: t('ntTitle') },
      { value: 'inst-desk', label: t('ideskTitle') },
      { value: 'inst-methods', label: t('imethTitle') },
      { value: 'inst-positions', label: t('iposTitle') },
      { value: 'business', label: t('tbizTitle') },
    ]},
  ];
  const totalTopics = EDUCATION_NAV.reduce((n, c) => n + c.topics.length, 0);
  const activeCategory = EDUCATION_NAV.find(c => c.topics.some(tp => tp.value === activeTopic));

  // Deep-link to a module from a static SEO landing page, e.g. /education?topic=candlesticks
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const requested = searchParams.get('topic');
    if (requested && EDUCATION_NAV.some(c => c.topics.some(tp => tp.value === requested))) {
      setActiveTopic(requested);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-module completion (localStorage) → progress bars in sidebar/header.
  const [eduDone, setEduDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tcp-edu-progress') || '[]'); } catch { return []; }
  });
  const toggleTopicDone = (value) => {
    setEduDone(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      try { localStorage.setItem('tcp-edu-progress', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const doneCount = eduDone.filter(v => EDUCATION_NAV.some(c => c.topics.some(tp => tp.value === v))).length;

  // Glossary + quiz data (localized via i18n keys; answers are key-order-fixed).
  const GLOSSARY = Array.from({ length: 60 }, (_, i) => ({ n: i + 1, term: t(`gl${i + 1}t`), def: t(`gl${i + 1}d`) }));
  const [glossQ, setGlossQ] = useState('');
  const glossFiltered = GLOSSARY.filter(g =>
    !glossQ || (g.term + ' ' + g.def).toLowerCase().includes(glossQ.toLowerCase())
  );

  const QUIZ = Array.from({ length: 8 }, (_, i) => ({
    q: t(`qz${i + 1}q`),
    opts: [t(`qz${i + 1}a`), t(`qz${i + 1}b`), t(`qz${i + 1}c`)],
  }));
  const QUIZ_CORRECT = [1, 0, 2, 1, 0, 2, 1, 0];
  const [quizSel, setQuizSel] = useState({});
  const [quizDone, setQuizDone] = useState(false);
  const quizScore = QUIZ_CORRECT.reduce((n, c, i) => n + (quizSel[i] === c ? 1 : 0), 0);

  // Printable one-page Trading Plan + pre-trade checklist (localized).
  // Opens a print-ready window; the user saves it as PDF from the print dialog.
  const printTradingPlan = () => {
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) return;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = (n) => Array.from({ length: n }).map(() => '<div class="line"></div>').join('');
    const checks = [1, 2, 3, 4, 5, 6]
      .map((i) => `<div class="chk"><span class="box"></span><span>${esc(t(`planCheck${i}`))}</span></div>`)
      .join('');
    const rules = ['tplRisk1', 'tplRisk2', 'tplRisk3']
      .map((k) => `<div class="chk"><span class="box"></span><span>${esc(t(k))}</span></div>`)
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('tplTitle'))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111; margin: 0; font-size: 12.5px; line-height: 1.45; }
  .brand { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #666; }
  h1 { font-size: 21px; margin: 2px 0 14px; }
  .meta { display: flex; gap: 24px; margin-bottom: 14px; }
  .meta div { flex: 1; border-bottom: 1px solid #999; padding: 6px 2px; color: #444; }
  h2 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; border-bottom: 2px solid #111; padding-bottom: 3px; margin: 16px 0 8px; }
  .line { border-bottom: 1px dotted #aaa; height: 22px; }
  .chk { display: flex; gap: 8px; align-items: flex-start; margin: 6px 0; }
  .box { width: 12px; height: 12px; border: 1.5px solid #111; border-radius: 2px; flex: none; margin-top: 2px; }
  .commit { margin-top: 18px; border: 1.5px solid #111; padding: 10px 12px; font-weight: 600; }
  .sign { display: flex; gap: 24px; margin-top: 14px; }
  .sign div { flex: 1; border-bottom: 1px solid #999; height: 30px; }
  .foot { margin-top: 10px; font-size: 10px; color: #888; }
</style></head><body>
  <div class="brand">TradingCalculator PRO</div>
  <h1>${esc(t('tplTitle'))}</h1>
  <div class="meta"><div>${esc(t('tplTrader'))}: </div><div>${esc(t('tplDate'))}: </div></div>
  <h2>1 · ${esc(t('tplMarkets'))}</h2>${lines(2)}
  <h2>2 · ${esc(t('tplSetup'))}</h2>${lines(3)}
  <h2>3 · ${esc(t('tplRisk'))}</h2>${rules}
  <h2>4 · ${esc(t('planChecklistTitle'))}</h2>${checks}
  <h2>5 · ${esc(t('tplManagement'))}</h2>${lines(2)}
  <h2>6 · ${esc(t('tplReview'))}</h2>${lines(2)}
  <div class="commit">${esc(t('tplCommit'))}</div>
  <div class="sign"><div></div></div>
  <div class="foot">tradingcalculatorpro.com</div>
<script>setTimeout(function(){window.print();},350);</script>
</body></html>`);
    w.document.close();
    w.focus();
  };

  // Premium Gate - Block non-authenticated OR non-premium users
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
              <BookOpen className="h-24 w-24 text-primary mx-auto relative" />
            </div>
            
            <h1 className="text-4xl font-bold">{t('educationGateTitle')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('educationGateDescription')}
            </p>
            
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">{t('optionsGateIncludedTitle')}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                <li className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>{t('eduFeatureRules')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>{t('eduFeatureRisk')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CandlestickChart className="h-5 w-5 text-primary" />
                  <span>{t('eduFeatureCandles')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>{t('eduFeatureDow')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span>{t('eduFeaturePsychology')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>{t('eduFeatureStats')}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t('login')}
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/pricing">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t('viewPremiumPlans')}
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      {t('backHome')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredRules = TRADING_RULES.filter(rule => {
    const matchesSearch = rule.rule.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(TRADING_RULES.map(r => r.category))];

  const toggleRule = (id) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRules(newExpanded);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Professional page header — sober, left-aligned, broker-academy style */}
          <div className="mb-8 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-2">
              {t('eduAcademyLabel')}
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-unbounded text-2xl md:text-3xl font-bold mb-2">
                  {t('educationCenter')}
                </h1>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {t('educationCenterDesc')}
                </p>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-5">
                  <span><span className="text-foreground font-bold">{totalTopics}</span> {t('eduModulesLabel')}</span>
                  <span className="opacity-40">|</span>
                  <span><span className="text-foreground font-bold">{EDUCATION_NAV.length}</span> {t('eduPathsLabel')}</span>
                  <span className="opacity-40">|</span>
                  <span data-testid="edu-progress-count">
                    <span className="text-primary font-bold">{doneCount}</span>/{totalTopics} {t('eduProgressLabel')}
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden" data-testid="edu-progress-bar">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((doneCount / totalTopics) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTopic} onValueChange={setActiveTopic}>
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
              {/* Curriculum sidebar (desktop) — grouped pillars, private-banking style */}
              <aside className="hidden lg:block w-64 flex-shrink-0" data-testid="edu-sidebar">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-8 space-y-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      placeholder={t('eduSearchTopic')}
                      className="pl-9 h-9 text-sm"
                      data-testid="edu-topic-search"
                    />
                  </div>
                  {EDUCATION_NAV.map((cat, ci) => {
                    const topics = cat.topics.filter(tp => !topicQuery || tp.label.toLowerCase().includes(topicQuery.toLowerCase()));
                    if (topics.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <p className="flex items-center gap-2 px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          <span className="font-mono text-primary/70">{String(ci + 1).padStart(2, '0')}</span>
                          {cat.label}
                          <span className="ml-auto font-mono normal-case tracking-normal opacity-70">
                            {cat.topics.filter(tp => eduDone.includes(tp.value)).length}/{cat.topics.length}
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {topics.map(tp => (
                            <button
                              key={tp.value}
                              type="button"
                              onClick={() => setActiveTopic(tp.value)}
                              data-testid={`edunav-${tp.value}`}
                              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 rounded-md text-[13px] leading-snug transition-colors border-l-2 ${
                                activeTopic === tp.value
                                  ? 'border-primary bg-primary/10 text-primary font-medium'
                                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                              }`}
                            >
                              <span className="min-w-0 truncate">{tp.label}</span>
                              {eduDone.includes(tp.value) && (
                                <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Mobile: two-level nav (pillar row + topic row) */}
              <div className="lg:hidden space-y-2" data-testid="edu-mobile-nav">
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {EDUCATION_NAV.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveTopic(cat.topics[0].value)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        activeCategory?.id === cat.id
                          ? 'bg-primary text-black border-primary'
                          : 'bg-card text-muted-foreground border-border'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {(activeCategory?.topics || []).map(tp => (
                    <button
                      key={tp.value}
                      type="button"
                      onClick={() => setActiveTopic(tp.value)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                        activeTopic === tp.value
                          ? 'border-primary text-primary bg-primary/10 font-medium'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module content column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <p className="text-[11px] text-muted-foreground font-mono" data-testid="edu-breadcrumb">
                    {activeCategory?.label}
                    <span className="mx-1.5 opacity-50">/</span>
                    <span className="text-foreground">{activeCategory?.topics.find(tp => tp.value === activeTopic)?.label}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleTopicDone(activeTopic)}
                    data-testid="edu-mark-done"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      eduDone.includes(activeTopic)
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {eduDone.includes(activeTopic) ? t('eduDoneLabel') : t('eduMarkDone')}
                  </button>
                </div>

            {/* Start Here — zero-knowledge first lesson */}
            <TabsContent value="start-here" className="space-y-8">
              <Card className="bg-gradient-to-br from-primary/10 to-green-500/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    {START_HERE.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{START_HERE.intro}</p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {START_HERE.steps.map((step) => (
                  <Card key={step.id} className="bg-card border-border border-l-2 border-l-primary/50 hover:border-primary/40 transition-colors">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-1.5">{step.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {START_HERE.cta.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">{START_HERE.cta.desc}</p>
                  </div>
                  <Link to="/dashboard?tab=position" className="flex-shrink-0">
                    <Button size="lg" className="w-full sm:w-auto">{START_HERE.cta.button}</Button>
                  </Link>
                </CardContent>
              </Card>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{START_HERE.note}</p>
              </div>
            </TabsContent>

            {/* Time vs Impact — the trader's paradox */}
            <TabsContent value="time-impact" className="space-y-6">
              <TimeVsImpact />
            </TabsContent>

            {/* Fundamentals */}
            <TabsContent value="fundamentals" className="space-y-8">
              {/* Hero intro */}
              <Card className="bg-gradient-to-br from-primary/5 to-blue-500/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    {TRADING_FUNDAMENTALS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{TRADING_FUNDAMENTALS.intro}</p>
                </CardContent>
              </Card>

              {/* Market Types */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {TRADING_FUNDAMENTALS.marketTypes.title}
                </h2>
                {TRADING_FUNDAMENTALS.marketTypes.intro && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                    {TRADING_FUNDAMENTALS.marketTypes.intro}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TRADING_FUNDAMENTALS.marketTypes.items.map(item => (
                    <Card key={item.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-2xl">{item.icon}</span>
                          {item.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                        <Badge variant="secondary" className="text-xs">{item.volume}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Market Participants */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  {TRADING_FUNDAMENTALS.participants.title}
                </h2>
                {TRADING_FUNDAMENTALS.participants.intro && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                    {TRADING_FUNDAMENTALS.participants.intro}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRADING_FUNDAMENTALS.participants.items.map(item => (
                    <Card key={item.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-xl">{item.icon}</span>
                          {item.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Trading Sessions */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  {TRADING_FUNDAMENTALS.sessions.title}
                </h2>
                {TRADING_FUNDAMENTALS.sessions.intro && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                    {TRADING_FUNDAMENTALS.sessions.intro}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRADING_FUNDAMENTALS.sessions.items.map(item => {
                    const colorMap = { blue: 'border-blue-500/30 bg-blue-500/5', green: 'border-green-500/30 bg-green-500/5', orange: 'border-orange-500/30 bg-orange-500/5', red: 'border-red-500/30 bg-red-500/5' };
                    const textMap = { blue: 'text-blue-500', green: 'text-green-500', orange: 'text-orange-500', red: 'text-red-500' };
                    return (
                      <Card key={item.id} className={`border ${colorMap[item.color]}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>{item.name}</span>
                            <Badge variant="outline" className={`text-xs font-mono ${textMap[item.color]}`}>{item.hours}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Technical Analysis */}
            <TabsContent value="tech-analysis" className="space-y-8">
              <Card className="bg-gradient-to-br from-green-500/5 to-teal-500/10 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                    {TECHNICAL_ANALYSIS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{TECHNICAL_ANALYSIS.intro}</p>
                </CardContent>
              </Card>

              {/* Trend Lines Guide */}
              <Card className="bg-gradient-to-br from-green-500/5 via-card to-red-500/5 border-border">
                <CardContent className="pt-6">
                  <TrendLinesGuide />
                </CardContent>
              </Card>

              {/* Chart scale: log vs linear */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-500" />
                  {TECHNICAL_ANALYSIS.scale.title}
                </h2>
                <div className="grid gap-4">
                  {TECHNICAL_ANALYSIS.scale.concepts.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={priorityColors[c.importance]}>{t(c.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Support & Resistance */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  {TECHNICAL_ANALYSIS.supportResistance.title}
                </h2>
                <div className="grid gap-4">
                  {TECHNICAL_ANALYSIS.supportResistance.concepts.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={priorityColors[c.importance]}>{t(c.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Trend Analysis */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  {TECHNICAL_ANALYSIS.trends.title}
                </h2>
                <div className="grid gap-4">
                  {TECHNICAL_ANALYSIS.trends.concepts.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          {c.type === 'bullish' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {c.type === 'bearish' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          {c.type === 'neutral' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          <span>{c.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Indicators */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  {TECHNICAL_ANALYSIS.indicators.title}
                </h2>
                <div className="grid gap-4">
                  {TECHNICAL_ANALYSIS.indicators.items.map(ind => (
                    <Card key={ind.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base flex-wrap">
                          <span>{ind.name}</span>
                          <Badge variant="secondary" className="text-xs">{ind.category}</Badge>
                          <Badge variant="outline" className={priorityColors[ind.importance]}>{t(ind.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{ind.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* MTF */}
              {/* Timeframes Guide — replaces old MTF 2-card section */}
              <Card className="bg-gradient-to-br from-blue-500/5 via-card to-orange-500/5 border-border">
                <CardContent className="pt-6">
                  <TimeframesGuide />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Elliott Wave Theory */}
            <TabsContent value="elliott" className="space-y-8">
              <Card className="bg-gradient-to-br from-indigo-500/5 to-blue-500/10 border-indigo-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <TrendingUp className="w-6 h-6 text-indigo-500" />
                    {ELLIOTT_WAVE.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{ELLIOTT_WAVE.intro}</p>
                </CardContent>
              </Card>

              {/* Motive waves 1-5 */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  {ELLIOTT_WAVE.motive.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {ELLIOTT_WAVE.motive.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ELLIOTT_WAVE.motive.waves.map(w => (
                    <Card key={w.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {w.id}
                          </span>
                          <span className={patternTypeColors[w.type]}>{w.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Corrective waves A-B-C */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  {ELLIOTT_WAVE.corrective.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {ELLIOTT_WAVE.corrective.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ELLIOTT_WAVE.corrective.waves.map(w => (
                    <Card key={w.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="w-7 h-7 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {w.id}
                          </span>
                          <span className={patternTypeColors[w.type]}>{w.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* The 3 unbreakable rules */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {ELLIOTT_WAVE.rules.title}
                </h2>
                <div className="grid gap-4">
                  {ELLIOTT_WAVE.rules.items.map(r => (
                    <Card key={r.id} className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{r.name}</span>
                          <Badge variant="outline" className={priorityColors[r.importance]}>{t(r.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Corrective patterns */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  {ELLIOTT_WAVE.patterns.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ELLIOTT_WAVE.patterns.items.map(p => (
                    <Card key={p.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Fibonacci + degrees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-yellow-500/5 border-yellow-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-4 h-4 text-yellow-500" />
                      {ELLIOTT_WAVE.fibonacci.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ELLIOTT_WAVE.fibonacci.desc}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="w-4 h-4 text-blue-500" />
                      {ELLIOTT_WAVE.degrees.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ELLIOTT_WAVE.degrees.desc}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Common mistakes */}
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    {ELLIOTT_WAVE.mistakes.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ELLIOTT_WAVE.mistakes.items.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                        <span className="text-orange-500 mt-0.5">•</span> {m}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ichimoku Kinko Hyo */}
            <TabsContent value="ichimoku" className="space-y-8">
              <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/10 border-red-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <CandlestickChart className="w-6 h-6 text-red-500" />
                    {ICHIMOKU.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{ICHIMOKU.intro}</p>
                </CardContent>
              </Card>

              {/* The 5 lines */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {ICHIMOKU.lines.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {ICHIMOKU.lines.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ICHIMOKU.lines.items.map(l => (
                    <Card key={l.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                          <span className={patternTypeColors[l.type]}>{l.name}</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">{l.period}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{l.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* The cloud (Kumo) */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <CandlestickChart className="w-5 h-5 text-orange-500" />
                  {ICHIMOKU.cloud.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {ICHIMOKU.cloud.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ICHIMOKU.cloud.items.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {c.type === 'bullish' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {c.type === 'bearish' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          {c.type === 'neutral' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          <span>{c.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Main signals */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {ICHIMOKU.signals.title}
                </h2>
                <div className="grid gap-4">
                  {ICHIMOKU.signals.items.map(s => (
                    <Card key={s.id} className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{s.name}</span>
                          <Badge variant="outline" className={priorityColors[s.importance]}>{t(s.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Tips & mistakes */}
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-orange-500" />
                    {ICHIMOKU.tips.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ICHIMOKU.tips.items.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                        <span className="text-orange-500 mt-0.5">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Smart Money Concepts (ICT) */}
            <TabsContent value="smc" className="space-y-8">
              <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                    {SMART_MONEY.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{SMART_MONEY.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SMART_MONEY.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {s.type === 'bullish' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {s.type === 'bearish' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {s.type === 'neutral' && <BarChart3 className="w-4 h-4 text-purple-500" />}
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    {SMART_MONEY.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Institutional methods (VWAP, GEX, Volume Profile, stat-arb, risk parity…) */}
            <TabsContent value="inst-methods" className="space-y-8">
              <Card className="bg-gradient-to-br from-amber-500/5 to-blue-500/10 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Landmark className="w-6 h-6 text-amber-500" />
                    {INST_METHODS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{INST_METHODS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INST_METHODS.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {s.type === 'bearish' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <BarChart3 className="w-4 h-4 text-amber-500" />}
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    {INST_METHODS.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Institutional position construction (slicing, VWAP/TWAP, icebergs, campaigns…) */}
            <TabsContent value="inst-positions" className="space-y-8">
              <Card className="bg-gradient-to-br from-emerald-500/5 to-blue-500/10 border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Layers className="w-6 h-6 text-emerald-500" />
                    {POS_BUILDING.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{POS_BUILDING.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POS_BUILDING.items.map((s, i) => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 text-[11px] font-bold flex-shrink-0">{i + 1}</span>
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {POS_BUILDING.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Probabilistic mindset (Mark Douglas) */}
            <TabsContent value="mindset" className="space-y-8">
              <Card className="bg-gradient-to-br from-violet-500/5 to-blue-500/10 border-violet-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Brain className="w-6 h-6 text-violet-500" />
                    {TRADING_MINDSET.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{TRADING_MINDSET.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRADING_MINDSET.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Brain className="w-4 h-4 text-violet-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-violet-500/10 border-violet-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                    {TRADING_MINDSET.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trading masters — lessons from the greats */}
            <TabsContent value="masters" className="space-y-8">
              <Card className="bg-gradient-to-br from-amber-500/5 to-yellow-500/10 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Star className="w-6 h-6 text-amber-500" />
                    {TRADING_MASTERS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{TRADING_MASTERS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRADING_MASTERS.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    {TRADING_MASTERS.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Futures masters — reference futures traders */}
            <TabsContent value="futures-masters" className="space-y-8">
              <Card className="bg-gradient-to-br from-teal-500/5 to-cyan-500/10 border-teal-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Target className="w-6 h-6 text-teal-500" />
                    {FUTURES_MASTERS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{FUTURES_MASTERS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FUTURES_MASTERS.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="w-4 h-4 text-teal-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-teal-500/10 border-teal-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    {FUTURES_MASTERS.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Partial exits / scaling out */}
            <TabsContent value="partial-exits" className="space-y-8">
              <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/10 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Gauge className="w-6 h-6 text-blue-500" />
                    {PARTIAL_EXITS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{PARTIAL_EXITS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PARTIAL_EXITS.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Gauge className="w-4 h-4 text-blue-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    {PARTIAL_EXITS.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Entries & exits: SL, TP & orders */}
            <TabsContent value="stops-targets" className="space-y-8">
              <Card className="bg-gradient-to-br from-rose-500/5 to-orange-500/10 border-rose-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Target className="w-6 h-6 text-rose-500" />
                    {STOPS_TARGETS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{STOPS_TARGETS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STOPS_TARGETS.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="w-4 h-4 text-rose-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-rose-500/10 border-rose-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    {STOPS_TARGETS.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Managing the live trade */}
            <TabsContent value="trade-mgmt" className="space-y-8">
              <Card className="bg-gradient-to-br from-sky-500/5 to-blue-500/10 border-sky-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Activity className="w-6 h-6 text-sky-500" />
                    {TRADE_MGMT.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{TRADE_MGMT.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRADE_MGMT.items.map(s => (
                  <Card key={s.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="w-4 h-4 text-sky-500" />
                        <span>{s.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-sky-500/10 border-sky-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    {TRADE_MGMT.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Options strategies */}
            <TabsContent value="options-strat" className="space-y-8">
              <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Scale className="w-6 h-6 text-cyan-500" />
                    {OPTIONS_STRATEGIES.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{OPTIONS_STRATEGIES.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OPTIONS_STRATEGIES.items.map(o => (
                  <Card key={o.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {o.type === 'bullish' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {o.type === 'bearish' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {o.type === 'neutral' && <BarChart3 className="w-4 h-4 text-cyan-500" />}
                        <span>{o.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    {OPTIONS_STRATEGIES.note}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced technical analysis */}
            <TabsContent value="advanced-ta" className="space-y-8">
              <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <BarChart3 className="w-6 h-6 text-emerald-500" />
                    {ADVANCED_TA.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{ADVANCED_TA.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ADVANCED_TA.items.map(a => (
                  <Card key={a.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        <span>{a.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* The trading business */}
            <TabsContent value="business" className="space-y-8">
              <Card className="bg-gradient-to-br from-amber-500/5 to-yellow-500/10 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Shield className="w-6 h-6 text-amber-500" />
                    {TRADING_BUSINESS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{TRADING_BUSINESS.intro}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRADING_BUSINESS.items.map(b => (
                  <Card key={b.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{b.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Instrument deep dives */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                  {TRADING_BUSINESS.instruments.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRADING_BUSINESS.instruments.items.map(ins => (
                    <Card key={ins.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{ins.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{ins.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Fundamental Analysis */}
            <TabsContent value="fund-analysis" className="space-y-8">
              <Card className="bg-gradient-to-br from-yellow-500/5 to-orange-500/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <BarChart3 className="w-6 h-6 text-yellow-500" />
                    {FUNDAMENTAL_ANALYSIS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{FUNDAMENTAL_ANALYSIS.intro}</p>
                </CardContent>
              </Card>

              {/* Macro */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  {FUNDAMENTAL_ANALYSIS.macro.title}
                </h2>
                <div className="grid gap-4">
                  {FUNDAMENTAL_ANALYSIS.macro.items.map(item => (
                    <Card key={item.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{item.name}</span>
                          <Badge variant="outline" className={item.impact === FUNDAMENTAL_ANALYSIS.macro.items[0].impact ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}>
                            {item.impact}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Economic Calendar */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  {FUNDAMENTAL_ANALYSIS.calendar.title}
                </h2>
                <div className="grid gap-4">
                  {FUNDAMENTAL_ANALYSIS.calendar.concepts.map(c => (
                    <Card key={c.id} className="bg-blue-500/10 border-blue-500/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={priorityColors[c.importance]}>{t(c.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Stock Fundamentals */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  {FUNDAMENTAL_ANALYSIS.stocks.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FUNDAMENTAL_ANALYSIS.stocks.items.map(item => (
                    <Card key={item.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{item.name}</span>
                          <Badge variant="outline" className={priorityColors[item.importance]}>{t(item.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Trading Styles */}
            <TabsContent value="styles" className="space-y-8">
              <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Target className="w-6 h-6 text-purple-500" />
                    {TRADING_STYLES_CONTENT.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{TRADING_STYLES_CONTENT.intro}</p>
                </CardContent>
              </Card>

              {/* At-a-glance comparison of the four styles */}
              <TradingStylesCompare />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {TRADING_STYLES_CONTENT.styles.map(style => {
                  const colorBorder = { purple: 'border-purple-500/30', blue: 'border-blue-500/30', green: 'border-green-500/30', orange: 'border-orange-500/30' };
                  const colorBg = { purple: 'bg-purple-500/5', blue: 'bg-blue-500/5', green: 'bg-green-500/5', orange: 'bg-orange-500/5' };
                  const colorText = { purple: 'text-purple-500', blue: 'text-blue-500', green: 'text-green-500', orange: 'text-orange-500' };
                  return (
                    <Card key={style.id} className={`border ${colorBorder[style.color]} ${colorBg[style.color]}`}>
                      <CardHeader>
                        <CardTitle className={`flex items-center gap-2 text-xl ${colorText[style.color]}`}>
                          <span className="text-2xl">{style.icon}</span>
                          {style.name}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap mt-2">
                          <Badge variant="outline" className="text-xs">{t('styleTimeframeLabel')}: {style.timeframe}</Badge>
                          <Badge variant="outline" className="text-xs">{t('styleFrequencyLabel')}: {style.frequency}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{style.desc}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-green-500 mb-2 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" /> {t('styleProsLabel')}
                            </p>
                            <ul className="space-y-1">
                              {style.pros.map((pro, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-green-500 mt-0.5">✓</span> {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" /> {t('styleConsLabel')}
                            </p>
                            <ul className="space-y-1">
                              {style.cons.map((con, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span className="text-red-500 mt-0.5">✗</span> {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    {TRADING_STYLES_CONTENT.choiceTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{TRADING_STYLES_CONTENT.choiceDesc}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Mechanics */}
            <TabsContent value="mechanics" className="space-y-8">
              <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Scale className="w-6 h-6 text-cyan-500" />
                    {MARKET_MECHANICS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{MARKET_MECHANICS.intro}</p>
                </CardContent>
              </Card>

              {/* Order book visual + iceberg / hidden / advanced order types */}
              <OrderTypesGuide />

              {/* Order Types */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {MARKET_MECHANICS.orders.title}
                </h2>
                <div className="grid gap-4">
                  {MARKET_MECHANICS.orders.items.map(order => (
                    <Card key={order.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{order.name}</span>
                          <Badge variant="outline" className={priorityColors[order.importance]}>{t(order.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{order.desc}</p>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1">{t('orderUseLabel')}</p>
                          <p className="text-xs text-muted-foreground">{order.use}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Broker */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  {MARKET_MECHANICS.broker.title}
                </h2>
                <p className="text-muted-foreground mb-4 text-sm">{MARKET_MECHANICS.broker.intro}</p>
                <div className="grid gap-4">
                  {MARKET_MECHANICS.broker.criteria.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={priorityColors[c.importance]}>{t(c.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  {MARKET_MECHANICS.platforms.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MARKET_MECHANICS.platforms.items.map(p => (
                    <Card key={p.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-xl">{p.icon}</span>
                          {p.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                        <div className="p-2 rounded bg-primary/5 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-0.5">{t('platformBestFor')}</p>
                          <p className="text-xs text-muted-foreground">{p.best}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Journal */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                  {MARKET_MECHANICS.journal.title}
                </h2>
                <div className="grid gap-4">
                  {MARKET_MECHANICS.journal.concepts.map(c => (
                    <Card key={c.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={priorityColors[c.importance]}>{t(c.importance)}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Trading Rules */}
            <TabsContent value="rules" className="space-y-6">
              {/* Golden / inviolable rules — highlighted non-negotiables */}
              <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-xl">
                    <Star className="w-5 h-5 text-yellow-500" />
                    {GOLDEN_RULES.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{GOLDEN_RULES.intro}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {GOLDEN_RULES.rules.map((r, i) => (
                      <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-yellow-500/15">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{r.name}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchRules')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-rules"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'all' ? t('all') : cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rules List */}
              <div className="grid gap-4">
                {filteredRules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isExpanded={expandedRules.has(rule.id)}
                    onToggle={() => toggleRule(rule.id)}
                  />
                ))}
              </div>
              
              {filteredRules.length === 0 && (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noRulesFound')}</p>
                </div>
              )}
            </TabsContent>

            {/* Dow Theory */}
            <TabsContent value="dow-theory" className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    {DOW_THEORY.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {DOW_THEORY.intro}
                  </p>
                </CardContent>
              </Card>

              {/* Market-cycle diagram: phases + trend degrees */}
              <DowTheoryDiagram />

              {/* Principles */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {t('principles')}
                </h2>
                <div className="grid gap-4">
                  {DOW_THEORY.principles.map(principle => (
                    <Card key={principle.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {principle.id}
                          </div>
                          <span className="text-base">{principle.title}</span>
                          <Badge variant="outline" className={priorityColors[principle.importance]}>
                            {t(principle.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {principle.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Application */}
              <Card className="bg-green-500/10 border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-green-500" />
                    {DOW_THEORY.application.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {DOW_THEORY.application.description}
                  </p>
                </CardContent>
              </Card>

              {/* Limitations */}
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    {DOW_THEORY.limitations.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {DOW_THEORY.limitations.description}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trading Psychology */}
            <TabsContent value="psychology" className="space-y-6">
              {/* The 3 pillars of trading: 50/30/20 mental model */}
              <TradingPillarsGuide />

              <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/10 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Brain className="w-6 h-6 text-blue-500" />
                    {TRADING_PSYCHOLOGY.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {TRADING_PSYCHOLOGY.intro}
                  </p>
                </CardContent>
              </Card>

              {/* Account killers — self-diagnosis of the most common ways traders lose */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {ACCOUNT_KILLERS.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {ACCOUNT_KILLERS.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ACCOUNT_KILLERS.items.map((k, i) => {
                    const tagStyle = {
                      psych: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
                      risk: 'bg-red-500/10 text-red-500 border-red-500/30',
                      discipline: 'bg-green-500/10 text-green-500 border-green-500/30',
                      system: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
                    }[k.tag] || 'bg-muted text-muted-foreground border-border';
                    const tagLabel = { psych: t('killerTagPsych'), risk: t('killerTagRisk'), discipline: t('killerTagDiscipline'), system: t('killerTagSystem') }[k.tag] || k.tag;
                    return (
                      <div key={k.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-red-500/15"
                        data-testid={`account-killer-${k.id}`}>
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{k.name}</p>
                            <Badge variant="outline" className={`text-[9px] ${tagStyle}`}>{tagLabel}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{k.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cognitive Biases */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  {TRADING_PSYCHOLOGY.cognitiveBiases.title}
                </h2>
                <div className="grid gap-4">
                  {TRADING_PSYCHOLOGY.cognitiveBiases.biases.map(bias => (
                    <Card key={bias.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{bias.title}</span>
                          <Badge variant="outline" className={priorityColors[bias.severity]}>
                            {t(bias.severity)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {bias.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* The trader's core emotions */}
              {TRADING_PSYCHOLOGY.emotions && (
                <div>
                  <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-red-500" />
                    {TRADING_PSYCHOLOGY.emotions.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                    {TRADING_PSYCHOLOGY.emotions.intro}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TRADING_PSYCHOLOGY.emotions.items.map(e => (
                      <Card key={e.id} className="bg-red-500/5 border-red-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{e.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{e.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotional Control */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  {TRADING_PSYCHOLOGY.emotionalControl.title}
                </h2>
                <div className="grid gap-4">
                  {TRADING_PSYCHOLOGY.emotionalControl.techniques.map(technique => (
                    <Card key={technique.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{technique.title}</span>
                          <Badge variant="outline" className={priorityColors[technique.importance]}>
                            {t(technique.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {technique.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Managing drawdown + trader health */}
              {[TRADING_PSYCHOLOGY.drawdown, TRADING_PSYCHOLOGY.health].map((sec, si) => sec && (
                <div key={`psy-sec-${si}`}>
                  <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                    {si === 0
                      ? <TrendingDown className="w-5 h-5 text-red-500" />
                      : <Shield className="w-5 h-5 text-green-500" />}
                    {sec.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">{sec.intro}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sec.items.map(it => (
                      <Card key={it.id} className="bg-card border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{it.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{it.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* The trader's craft — the professional process */}
            <TabsContent value="craft" className="space-y-8">
              <Card className="bg-gradient-to-br from-primary/5 to-emerald-500/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Target className="w-6 h-6 text-primary" />
                    {TRADER_CRAFT.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{TRADER_CRAFT.intro}</p>
                </CardContent>
              </Card>

              {/* Trade management */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  {TRADER_CRAFT.management.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {TRADER_CRAFT.management.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TRADER_CRAFT.management.items.map(m => (
                    <Card key={m.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{m.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Trading plan + pre-trade checklist */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  {TRADER_CRAFT.plan.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {TRADER_CRAFT.plan.intro}
                </p>
                <Card className="bg-gradient-to-br from-blue-500/10 to-primary/5 border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base flex-wrap">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        {TRADER_CRAFT.plan.checklistTitle}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={printTradingPlan}
                        className="gap-1.5"
                        data-testid="print-trading-plan"
                      >
                        <Printer className="w-3.5 h-3.5" /> {t('tplPrintBtn')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {TRADER_CRAFT.plan.checklist.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/40 border border-blue-500/15">
                          <span className="flex-shrink-0 w-5 h-5 rounded border border-blue-500/40 text-blue-500 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{c}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Thinking in R */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-yellow-500" />
                  {TRADER_CRAFT.rmultiple.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {TRADER_CRAFT.rmultiple.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRADER_CRAFT.rmultiple.items.map(r => (
                    <Card key={r.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{r.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Trading as a business */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {TRADER_CRAFT.business.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  {TRADER_CRAFT.business.intro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TRADER_CRAFT.business.items.map(b => (
                    <Card key={b.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{b.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Journal methodology / backtesting / daily routine / market regimes */}
              {[TRADER_CRAFT.journal, TRADER_CRAFT.testing, TRADER_CRAFT.routine].map((sec, si) => sec && (
                <div key={`craft-sec-${si}`}>
                  <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                    {sec.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">{sec.intro}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sec.items.map(it => (
                      <Card key={it.id} className="bg-card border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{it.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {TRADER_CRAFT.regimes && (
                <div>
                  <h2 className="font-unbounded text-xl font-bold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    {TRADER_CRAFT.regimes.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-3xl">{TRADER_CRAFT.regimes.intro}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TRADER_CRAFT.regimes.items.map(r => (
                      <Card key={r.id} className="bg-card border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {r.type === 'bullish' && <TrendingUp className="w-4 h-4 text-green-500" />}
                            {r.type === 'bearish' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {r.type === 'neutral' && <BarChart3 className="w-4 h-4 text-yellow-500" />}
                            <span>{r.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card className="bg-orange-500/10 border-orange-500/30 mt-4">
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        {TRADER_CRAFT.regimes.note}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Capital Management */}
            <TabsContent value="capital" className="space-y-6">
              <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/10 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Shield className="w-6 h-6 text-green-500" />
                    {CAPITAL_MANAGEMENT.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {CAPITAL_MANAGEMENT.intro}
                  </p>
                </CardContent>
              </Card>

              {/* Interactive calculators: position size + Kelly */}
              <CapitalManagementTools />

              {/* Capital Rules */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {CAPITAL_MANAGEMENT.capitalRules.title}
                </h2>
                <div className="grid gap-4">
                  {CAPITAL_MANAGEMENT.capitalRules.rules.map(rule => (
                    <Card key={rule.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{rule.title}</span>
                          <Badge variant="outline" className={priorityColors[rule.importance]}>
                            {t(rule.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {rule.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Stop-loss philosophy + break-even R:R by win rate */}
              <StopLossGuide />

              {/* Risk/Reward Ratios */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  {CAPITAL_MANAGEMENT.riskReward.title}
                </h2>
                <div className="grid gap-4">
                  {CAPITAL_MANAGEMENT.riskReward.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Advanced Risk Analytics */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  {t('capitalAdvancedToolsTitle')}
                </h2>
                <RiskAnalysisTools />
              </div>
            </TabsContent>

            {/* Trading Strategies */}
            <TabsContent value="strategies" className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Target className="w-6 h-6 text-purple-500" />
                    {TRADING_STRATEGIES.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {TRADING_STRATEGIES.intro}
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {TRADING_STRATEGIES.strategies.map((strategy, index) => (
                  <Card key={strategy.id} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-lg">{strategy.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {strategy.difficulty && (
                            <Badge variant="outline" className={
                              strategy.difficulty === 'beginner' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                              : strategy.difficulty === 'advanced' ? 'bg-red-500/10 text-red-500 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30'
                            }>
                              {strategy.difficulty === 'beginner' ? t('diffBeginner')
                                : strategy.difficulty === 'advanced' ? t('diffAdvanced')
                                : t('diffIntermediate')}
                            </Badge>
                          )}
                          <Badge variant="secondary">{strategy.timeframe}</Badge>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            {strategy.winRate}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" />
                          {t('setupLabel')}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                          {strategy.setup}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-green-500" />
                          {t('entryLabel')}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                          {strategy.entry}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-red-500" />
                          {t('exitLabel')}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                          {strategy.exit}
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                          <Lightbulb className="w-4 h-4" />
                          {t('tipsLabel')}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {strategy.tips}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Probability & Statistics */}
            <TabsContent value="probability" className="space-y-6">
              <Card className="bg-gradient-to-br from-orange-500/5 to-yellow-500/10 border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                    {PROBABILITY_STATS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {PROBABILITY_STATS.intro}
                  </p>
                </CardContent>
              </Card>

              {/* Mathematical Expectation */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  {PROBABILITY_STATS.sections.mathematicalExpectation.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.mathematicalExpectation.concepts.map(concept => (
                    <Card key={concept.id} className="bg-green-500/10 border-green-500/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Expectancy Matrix — interactive table derived from EV = (%A × R) − (%F × 1) */}
              <ExpectancyCalculator />
              <ExpectancyMatrix />

              {/* Law of Large Numbers */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  {PROBABILITY_STATS.sections.lawOfLargeNumbers.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.lawOfLargeNumbers.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Results Distribution */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  {PROBABILITY_STATS.sections.resultsDistribution.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.resultsDistribution.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Streaks Management */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  {PROBABILITY_STATS.sections.streaksManagement.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.streaksManagement.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Variance & Std Dev */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-500" />
                  {PROBABILITY_STATS.sections.varianceStdDev.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.varianceStdDev.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Correlation */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                  {PROBABILITY_STATS.sections.correlation.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.correlation.concepts.map(concept => (
                    <Card key={concept.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {PROBABILITY_STATS.sections.keyMetrics.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.keyMetrics.metrics.map(metric => (
                    <Card key={metric.id} className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <span>{metric.title}</span>
                          <Badge variant="outline" className={priorityColors[metric.importance]}>
                            {t(metric.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {metric.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Backtesting Statistics */}
              <div>
                <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  {PROBABILITY_STATS.sections.backtestingStats.title}
                </h2>
                <div className="grid gap-4">
                  {PROBABILITY_STATS.sections.backtestingStats.concepts.map(concept => (
                    <Card key={concept.id} className="bg-yellow-500/10 border-yellow-500/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span>{concept.title}</span>
                          <Badge variant="outline" className={priorityColors[concept.importance]}>
                            {t(concept.importance)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {concept.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Chart Patterns */}
            <TabsContent value="chart-patterns" className="space-y-8">
              {(() => {
                const q = patternQuery.trim().toLowerCase();
                const filterFn = (p) => {
                  if (patternTypeFilter !== 'all' && p.type !== patternTypeFilter) return false;
                  if (!q) return true;
                  return (
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.description || '').toLowerCase().includes(q)
                  );
                };
                const reversal = CHART_PATTERNS.reversal.filter(filterFn);
                const continuation = CHART_PATTERNS.continuation.filter(filterFn);
                const totalAll = CHART_PATTERNS.reversal.length + CHART_PATTERNS.continuation.length;
                const totalShown = reversal.length + continuation.length;
                if (reversal.length === 0 && continuation.length === 0) {
                  return (
                    <>
                      <PatternFilterBar
                        query={patternQuery}
                        onQueryChange={setPatternQuery}
                        typeFilter={patternTypeFilter}
                        onTypeFilterChange={setPatternTypeFilter}
                        totalShown={0}
                        totalAll={totalAll}
                        testIdPrefix="patterns"
                      />
                      <div className="text-center py-12 text-muted-foreground" data-testid="patterns-empty">
                        <p className="text-sm">
                          {t('patternsNoResults')} {patternQuery && <>"<span className="text-foreground font-bold">{patternQuery}</span>"</>}
                        </p>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <PatternFilterBar
                      query={patternQuery}
                      onQueryChange={setPatternQuery}
                      typeFilter={patternTypeFilter}
                      onTypeFilterChange={setPatternTypeFilter}
                      totalShown={totalShown}
                      totalAll={totalAll}
                      testIdPrefix="patterns"
                    />

                    {/* Reversal Patterns */}
                    {reversal.length > 0 && (
                      <div>
                        <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-red-500" />
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          {t('reversalPatterns')}
                          <span className="text-xs text-muted-foreground font-normal ml-1">({reversal.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {reversal.map(pattern => (
                            <PatternCard key={pattern.id} pattern={pattern} onClick={setSelectedPattern} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Continuation Patterns */}
                    {continuation.length > 0 && (
                      <div>
                        <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                          <ChevronRight className="w-5 h-5 text-blue-500" />
                          {t('continuationPatterns')}
                          <span className="text-xs text-muted-foreground font-normal ml-1">({continuation.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {continuation.map(pattern => (
                            <PatternCard key={pattern.id} pattern={pattern} onClick={setSelectedPattern} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            {/* Candlestick Patterns */}
            <TabsContent value="candlesticks" className="space-y-8">
              {/* Anatomy primer with SVG candles */}
              <CandleAnatomy />

              {/* Live pattern detector — scans real Yahoo Finance OHLC */}
              <LivePatternDetector />

              {(() => {
                const q = candleQuery.trim().toLowerCase();
                const matches = (p) => {
                  if (candleTypeFilter !== 'all' && p.type !== candleTypeFilter) return false;
                  if (!q) return true;
                  return (
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.description || '').toLowerCase().includes(q)
                  );
                };
                const bull = CANDLESTICK_PATTERNS.bullish.filter(matches);
                const bear = CANDLESTICK_PATTERNS.bearish.filter(matches);
                const neut = CANDLESTICK_PATTERNS.neutral.filter(matches);
                const totalAll = CANDLESTICK_PATTERNS.bullish.length
                              + CANDLESTICK_PATTERNS.bearish.length
                              + CANDLESTICK_PATTERNS.neutral.length;
                const totalShown = bull.length + bear.length + neut.length;
                const isEmpty = bull.length === 0 && bear.length === 0 && neut.length === 0;
                return (
                  <>
                    <PatternFilterBar
                      query={candleQuery}
                      onQueryChange={setCandleQuery}
                      typeFilter={candleTypeFilter}
                      onTypeFilterChange={setCandleTypeFilter}
                      totalShown={totalShown}
                      totalAll={totalAll}
                      testIdPrefix="candles"
                      neutralIcon
                    />
                    {isEmpty ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="candles-empty">
                        <p className="text-sm">
                          {t('patternsNoResults')} {candleQuery && <>"<span className="text-foreground font-bold">{candleQuery}</span>"</>}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Bullish */}
                        {bull.length > 0 && (
                          <div>
                            <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              {t('bullishPatterns')}
                              <span className="text-xs text-muted-foreground font-normal ml-1">({bull.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {bull.map(pattern => (
                                <PatternCard key={pattern.id} pattern={pattern} onClick={setSelectedPattern} />
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Bearish */}
                        {bear.length > 0 && (
                          <div>
                            <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                              <TrendingDown className="w-5 h-5 text-red-500" />
                              {t('bearishPatterns')}
                              <span className="text-xs text-muted-foreground font-normal ml-1">({bear.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {bear.map(pattern => (
                                <PatternCard key={pattern.id} pattern={pattern} onClick={setSelectedPattern} />
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Neutral */}
                        {neut.length > 0 && (
                          <div>
                            <h2 className="font-unbounded text-xl font-bold mb-4 flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                              {t('indecisionPatterns')}
                              <span className="text-xs text-muted-foreground font-normal ml-1">({neut.length})</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {neut.map(pattern => (
                                <PatternCard key={pattern.id} pattern={pattern} onClick={setSelectedPattern} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            {/* Risk Management */}
            <TabsContent value="risk" className="space-y-6">
              {/* Interactive Monte Carlo risk-of-ruin calculator */}
              <RiskOfRuinCalculator />

              {/* Leverage 0x-100x guide with mini calc + redirect to full Dashboard */}
              <LeverageGuide />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {RISK_MANAGEMENT_CONCEPTS.map(concept => (
                  <Card key={concept.id} className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-primary" />
                        {concept.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-sm text-muted-foreground">
                          {concept.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Harmonic Patterns */}
            <TabsContent value="harmonic-patterns" className="space-y-8">
              <Card className="bg-gradient-to-br from-primary/5 to-blue-500/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    {t('harmonicPatternsTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{t('harmonicPatternsIntro')}</p>
                </CardContent>
              </Card>

              {/* Filter bar */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: t('harmonicAllFilter') },
                  { key: 'bullish', label: t('harmonicBullishFilter') },
                  { key: 'bearish', label: t('harmonicBearishFilter') },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={harmonicFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHarmonicFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground self-center">
                  {HARMONIC_PATTERNS.filter(p => harmonicFilter === 'all' || p.type === harmonicFilter).length} / {HARMONIC_PATTERNS.length}
                </span>
              </div>

              {/* Pattern cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {HARMONIC_PATTERNS
                  .filter(p => harmonicFilter === 'all' || p.type === harmonicFilter)
                  .map(pattern => (
                    <Card key={pattern.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-bold">{pattern.name}</CardTitle>
                          <Badge
                            className={
                              pattern.type === 'bullish'
                                ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                : pattern.type === 'bearish'
                                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                            }
                          >
                            {pattern.type === 'bullish'
                              ? t('harmonicBullishFilter')
                              : pattern.type === 'bearish'
                              ? t('harmonicBearishFilter')
                              : t('harmonicPatternType')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{pattern.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Fibonacci Ratios */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {t('harmonicKeyRatios')}
                          </h4>
                          <div className="grid grid-cols-1 gap-1">
                            {Object.entries(pattern.ratios).map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-xs">
                                <span className="text-muted-foreground">{localizeRatio(label)}</span>
                                <span className="font-mono font-semibold text-primary">{localizeRatio(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Trading steps */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {t('harmonicHowToTrade')}
                          </h4>
                          <ol className="space-y-1.5">
                            {pattern.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <span className="text-muted-foreground leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Reliability + Timeframes */}
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <div className="flex gap-1 flex-wrap">
                            {pattern.timeframes.map(tf => (
                              <Badge key={tf} variant="outline" className="text-[10px] px-1.5 py-0">{tf}</Badge>
                            ))}
                          </div>
                          <span className={`text-xs font-semibold ${
                            pattern.reliability === 'High' || pattern.reliability === 'Alta'
                              ? 'text-green-500'
                              : 'text-yellow-500'
                          }`}>
                            {pattern.reliability}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="wyckoff" className="space-y-8 mt-6">
              {/* Intro */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-6">
                <h2 className="font-unbounded text-2xl font-bold mb-3 flex items-center gap-3">
                  <TrendingUp className="w-7 h-7 text-amber-500" />
                  {WYCKOFF.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{WYCKOFF.intro}</p>
              </div>

              {/* Three Laws */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-4">{WYCKOFF.laws.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {WYCKOFF.laws.items.map((law) => (
                    <div key={law.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                      <h4 className="font-bold text-sm text-amber-400 mb-2">{law.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{law.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schematics */}
              <WyckoffSchematic />

              {/* Four Phases */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-1">{WYCKOFF.phases.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{WYCKOFF.phases.intro}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WYCKOFF.phases.items.map((phase) => (
                    <div key={phase.id} className={`rounded-xl border p-5 ${phase.type === 'bullish' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-base">{phase.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${phase.type === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {phase.type === 'bullish' ? '↑' : '↓'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{phase.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Events */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-1">{WYCKOFF.events.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{WYCKOFF.events.intro}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WYCKOFF.events.items.map((event) => (
                    <div key={event.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm text-primary">{event.name}</h4>
                        {event.sentiment && (
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            event.sentiment === 'bullish' ? 'bg-green-500/15 text-green-500'
                            : event.sentiment === 'bearish' ? 'bg-red-500/15 text-red-500'
                            : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-500'
                          }`}>
                            {event.sentiment === 'bullish' ? `↑ ${t('bullish')}` : event.sentiment === 'bearish' ? `↓ ${t('bearish')}` : `↔ ${t('neutral')}`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Composite Operator */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6">
                <h3 className="font-unbounded text-lg font-bold mb-2 flex items-center gap-2">
                  <span className="text-purple-400">◈</span> {WYCKOFF.composite.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{WYCKOFF.composite.desc}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WYCKOFF.composite.concepts.map((c) => (
                    <div key={c.id} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-1 text-purple-300">{c.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume Analysis */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-1">{WYCKOFF.volume.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{WYCKOFF.volume.intro}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WYCKOFF.volume.rules.map((rule) => (
                    <div key={rule.id} className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                      <h4 className="font-semibold text-sm mb-1 text-blue-400">{rule.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Trade */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6">
                <h3 className="font-unbounded text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-green-400">▶</span> {WYCKOFF.howToTrade.title}
                </h3>
                <ol className="space-y-3">
                  {WYCKOFF.howToTrade.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold border border-green-500/30">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="alt-charts" className="space-y-8 mt-6">
              {/* Intro */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20 rounded-xl p-6">
                <h2 className="font-unbounded text-2xl font-bold mb-3 flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-purple-500" />
                  {ALT_CHARTS.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{ALT_CHARTS.intro}</p>
              </div>

              {/* Chart cards */}
              <div className="space-y-6">
                {ALT_CHARTS.charts.map((chart) => {
                  const colorMap = {
                    orange: { card: 'bg-orange-500/5 border-orange-500/20', badge: 'bg-orange-500/20 text-orange-400', pro: 'text-green-400', con: 'text-red-400', heading: 'text-orange-400' },
                    blue:   { card: 'bg-blue-500/5 border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-400',     pro: 'text-green-400', con: 'text-red-400', heading: 'text-blue-400' },
                    purple: { card: 'bg-purple-500/5 border-purple-500/20', badge: 'bg-purple-500/20 text-purple-400', pro: 'text-green-400', con: 'text-red-400', heading: 'text-purple-400' },
                    green:  { card: 'bg-green-500/5 border-green-500/20',  badge: 'bg-green-500/20 text-green-400',   pro: 'text-green-400', con: 'text-red-400', heading: 'text-green-400' },
                    cyan:   { card: 'bg-cyan-500/5 border-cyan-500/20',    badge: 'bg-cyan-500/20 text-cyan-400',     pro: 'text-green-400', con: 'text-red-400', heading: 'text-cyan-400' },
                  };
                  const colors = colorMap[chart.color] || colorMap.blue;
                  return (
                    <div key={chart.id} className={`rounded-xl border p-6 ${colors.card}`}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className={`font-unbounded text-lg font-bold ${colors.heading}`}>{chart.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{chart.desc}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* How it works */}
                        <div className="bg-card/60 rounded-lg p-3 border border-border/50">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('altChartConstruction')}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{chart.construction}</p>
                        </div>
                        {/* Strengths */}
                        <div className="bg-card/60 rounded-lg p-3 border border-border/50">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('altChartStrengths')}</p>
                          <ul className="space-y-1">
                            {chart.strengths.map((s, i) => (
                              <li key={i} className={`text-xs leading-relaxed flex items-start gap-1.5 ${colors.pro}`}>
                                <span className="mt-0.5 flex-shrink-0">✓</span><span className="text-muted-foreground">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Weaknesses */}
                        <div className="bg-card/60 rounded-lg p-3 border border-border/50">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('altChartWeaknesses')}</p>
                          <ul className="space-y-1">
                            {chart.weaknesses.map((w, i) => (
                              <li key={i} className="text-xs leading-relaxed flex items-start gap-1.5 text-red-400">
                                <span className="mt-0.5 flex-shrink-0">✗</span><span className="text-muted-foreground">{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground"><span className="font-semibold">{t('altChartBestFor')}:</span> {chart.bestFor}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* COT Report */}
            <TabsContent value="cot" className="space-y-8 mt-6">
              {/* Intro */}
              <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 rounded-xl p-6">
                <h2 className="font-unbounded text-2xl font-bold mb-3 flex items-center gap-3">
                  <Scale className="w-7 h-7 text-teal-500" />
                  {COT.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{COT.intro}</p>
              </div>

              {/* Visual Guide */}
              <CotGuide />

              {/* Trader Types */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-4">{COT.traderTypes.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {COT.traderTypes.items.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <Badge variant="outline" className="text-[10px] shrink-0">{item.tag}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Read */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-4">{COT.howToRead.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COT.howToRead.items.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-teal-400 mb-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* COT Index */}
              <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-6">
                <h3 className="font-unbounded text-lg font-bold mb-2">{COT.cotIndex.title}</h3>
                <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{COT.cotIndex.desc}</p>
                <code className="block bg-muted/50 rounded-lg px-4 py-2 text-xs font-mono text-teal-400">{COT.cotIndex.formula}</code>
              </div>

              {/* Contrarian Signals */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-4">{COT.contrarian.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COT.contrarian.items.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-5 ${item.id === 'bottom' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <h4 className={`font-bold text-sm mb-2 ${item.id === 'bottom' ? 'text-green-400' : 'text-red-400'}`}>{item.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Combine */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-3">{COT.combine.title}</h3>
                <ul className="space-y-2">
                  {COT.combine.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3">
                      <span className="text-teal-400 mt-0.5 shrink-0">→</span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Report Formats */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-4">{COT.reports.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {COT.reports.items.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                      <h4 className="font-semibold text-sm mb-1 text-teal-400">{item.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                <h4 className="font-semibold text-sm text-blue-400 mb-1">{COT.sources.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{COT.sources.desc}</p>
              </div>

              {/* Limitations */}
              <div>
                <h3 className="font-unbounded text-lg font-bold mb-3">{COT.limitations.title}</h3>
                <ul className="space-y-2">
                  {COT.limitations.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            {/* The 5 CMT/Babypips gap modules — shared compact layout */}
            {[
              { value: 'news-trading', data: NEWS_TRADING, Icon: Newspaper, color: 'text-orange-500', grad: 'from-orange-500/5 to-primary/10 border-orange-500/20' },
              { value: 'sentiment', data: SENTIMENT, Icon: Gauge, color: 'text-purple-500', grad: 'from-purple-500/5 to-blue-500/10 border-purple-500/20' },
              { value: 'intermarket', data: INTERMARKET, Icon: Globe, color: 'text-blue-500', grad: 'from-blue-500/5 to-teal-500/10 border-blue-500/20' },
              { value: 'breadth-cycles', data: BREADTH_CYCLES, Icon: Activity, color: 'text-teal-500', grad: 'from-teal-500/5 to-primary/10 border-teal-500/20' },
              { value: 'broker-safety', data: BROKER_SAFETY, Icon: Shield, color: 'text-primary', grad: 'from-primary/5 to-red-500/10 border-primary/20' },
              { value: 'margin-liq', data: MARGIN_LIQ, Icon: Scale, color: 'text-red-500', grad: 'from-red-500/5 to-orange-500/10 border-red-500/20' },
              { value: 'option-greeks', data: OPTION_GREEKS, Icon: Sigma, color: 'text-cyan-500', grad: 'from-cyan-500/5 to-blue-500/10 border-cyan-500/20' },
              { value: 'inst-desk', data: INST_DESK, Icon: Landmark, color: 'text-indigo-500', grad: 'from-indigo-500/5 to-blue-500/10 border-indigo-500/20' },
              { value: 'pro-discipline', data: PRO_DISCIPLINE, Icon: Focus, color: 'text-emerald-500', grad: 'from-emerald-500/5 to-primary/10 border-emerald-500/20' },
            ].map(mod => (
              <TabsContent key={mod.value} value={mod.value} className="space-y-6">
                <Card className={`bg-gradient-to-br ${mod.grad}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                      <mod.Icon className={`w-6 h-6 ${mod.color}`} />
                      {mod.data.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{mod.data.intro}</p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mod.data.items.map(it => (
                    <Card key={it.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{it.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {mod.data.note && (
                  <Card className="bg-orange-500/10 border-orange-500/30">
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        {mod.data.note}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}

            {/* Glossary — searchable trading terms */}
            <TabsContent value="glossary" className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/5 to-blue-500/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <BookOpen className="w-6 h-6 text-primary" />
                    {t('glossaryTab')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={glossQ}
                      onChange={(e) => setGlossQ(e.target.value)}
                      placeholder={t('glossarySearch')}
                      className="pl-10"
                      data-testid="glossary-search"
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="glossary-grid">
                {glossFiltered.map((g) => (
                  <div key={g.n} className="p-3.5 rounded-lg bg-card border border-border">
                    <p className="text-sm font-bold text-primary mb-1">{g.term}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{g.def}</p>
                    <GlossaryVisual n={g.n} />
                  </div>
                ))}
                {glossFiltered.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6">—</p>
                )}
              </div>
            </TabsContent>

            {/* Quiz — quick self-test on the essentials */}
            <TabsContent value="quiz" className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-500/5 to-primary/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-unbounded text-2xl">
                    <Brain className="w-6 h-6 text-purple-500" />
                    {t('quizTab')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{t('qzIntro')}</p>
                </CardContent>
              </Card>

              <div className="space-y-4" data-testid="quiz-questions">
                {QUIZ.map((item, qi) => (
                  <Card key={qi} className="bg-card border-border">
                    <CardContent className="pt-5">
                      <p className="text-sm font-semibold mb-3">
                        <span className="font-mono text-primary mr-2">{qi + 1}.</span>{item.q}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {item.opts.map((opt, oi) => {
                          const chosen = quizSel[qi] === oi;
                          const correct = QUIZ_CORRECT[qi] === oi;
                          let cls = 'border-border bg-background text-muted-foreground hover:text-foreground';
                          if (quizDone && correct) cls = 'border-[#22c55e]/60 bg-[#22c55e]/10 text-[#22c55e] font-medium';
                          else if (quizDone && chosen && !correct) cls = 'border-[#ef4444]/60 bg-[#ef4444]/10 text-[#ef4444]';
                          else if (chosen) cls = 'border-primary text-primary bg-primary/10 font-medium';
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={quizDone}
                              onClick={() => setQuizSel(prev => ({ ...prev, [qi]: oi }))}
                              className={`px-3 py-2 rounded-md text-xs text-left border transition-colors ${cls}`}
                              data-testid={`quiz-q${qi}-o${oi}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!quizDone ? (
                <Button
                  onClick={() => setQuizDone(true)}
                  disabled={Object.keys(quizSel).length < QUIZ.length}
                  className="bg-primary text-black hover:bg-primary/90"
                  data-testid="quiz-submit"
                >
                  {t('qzSubmit')}
                </Button>
              ) : (
                <Card className={`border ${quizScore >= 7 ? 'border-[#22c55e]/40 bg-[#22c55e]/10' : quizScore >= 5 ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10' : 'border-[#ef4444]/40 bg-[#ef4444]/10'}`}>
                  <CardContent className="pt-5 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-semibold" data-testid="quiz-score">
                      {t('qzScoreLabel')}: <span className="font-mono text-lg">{quizScore}/{QUIZ.length}</span>
                      <span className="ml-2 text-muted-foreground font-normal">
                        {quizScore >= 7 ? t('qzPerfect') : quizScore >= 5 ? t('qzGood') : t('qzBad')}
                      </span>
                    </p>
                    <Button variant="outline" size="sm" onClick={() => { setQuizSel({}); setQuizDone(false); }} data-testid="quiz-retry">
                      {t('qzRetry')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Pattern Detail Modal */}
      <AnimatePresence>
        {selectedPattern && (
          <PatternDetailModal
            pattern={selectedPattern}
            onClose={() => setSelectedPattern(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
