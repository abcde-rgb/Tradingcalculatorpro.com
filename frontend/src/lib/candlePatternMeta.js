// Shared metadata for rendering candlestick pattern detections.
// Consumed by the Education live detector (LivePatternDetector) and the
// Dashboard price-structure scanner (StructureScanner) so the id→name map,
// type badge and reliability colour stay in one place.

// pattern_id (backend) → i18n name key (frontend)
export const PATTERN_NAME_KEY = {
  // single
  'hammer':               'hammerName',
  'hanging-man':          'hangingManName',
  'inverted-hammer':      'invertedHammerName',
  'shooting-star':        'shootingStarName',
  'doji':                 'dojiName',
  'dragonfly-doji':       'dragonflyDojiName',
  'gravestone-doji':      'gravestoneDojiName',
  'long-legged-doji':     'longLeggedDojiName',
  'high-wave':            'highWaveName',
  'bullish-marubozu':     'bullishMarubozuName',
  'bearish-marubozu':     'bearishMarubozuName',
  'spinning-top':         'spinningTopName',
  // two
  'bullish-engulfing':    'engulfingBullName',
  'bearish-engulfing':    'engulfingBearName',
  'bullish-harami':       'bullishHaramiName',
  'bearish-harami':       'bearishHaramiName',
  'piercing-line':        'piercingLineName',
  'dark-cloud-cover':     'darkCloudName',
  'tweezer-bottom':       'tweezerBottomName',
  'tweezer-top':          'tweezerTopName',
  'bullish-kicker':       'bullishKickerName',
  'bearish-kicker':       'bearishKickerName',
  // three
  'morning-star':         'morningStarName',
  'evening-star':         'eveningStarName',
  'morning-doji-star':    'morningDojiStarName',
  'evening-doji-star':    'eveningDojiStarName',
  'three-white-soldiers': 'threeWhiteSoldiersName',
  'three-black-crows':    'threeBlackCrowsName',
  'three-inside-up':      'threeInsideUpName',
  'three-inside-down':    'threeInsideDownName',
};

export const TYPE_BADGE = {
  bullish: { color: 'text-long', bg: 'bg-long/10', border: 'border-long/30', icon: '↑' },
  bearish: { color: 'text-short', bg: 'bg-short/10', border: 'border-short/30', icon: '↓' },
  neutral: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: '↔' },
};

export const BEHAVIOR_KEY = {
  reversal:     'patReversal',
  continuation: 'patContinuation',
  indecision:   'patIndecision',
};

// Colour the reliability % by strength: strong ≥65, medium ≥55, weak below.
export const rateColor = (rate) =>
  rate >= 65 ? 'text-long' : rate >= 55 ? 'text-warn' : 'text-muted-foreground';
