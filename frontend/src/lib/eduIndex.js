/**
 * eduIndex.js — el índice de la Academia, para poder preguntarle.
 *
 * El buscador de la barra lateral filtra **títulos**. Sirve para "candlestick"
 * y no sirve para nada más: quien no sabe cómo se llama lo que busca —que es
 * precisamente quien necesita una academia— escribe "¿cuánto arriesgo por
 * operación?" y no encuentra nada, porque ningún módulo se llama así.
 *
 * Aquí se construye un índice sobre el CONTENIDO real: el título, la entrada y
 * el nombre de cada apartado de los setenta y siete módulos. Con eso, esa
 * misma pregunta cae en «Gestión del riesgo», «Gestión del capital» y
 * «Probabilidad y estadística», que es donde está la respuesta.
 *
 * Tres decisiones que lo mantienen honesto:
 *
 *   1. **No inventa destinos.** Lo único que puede devolver son módulos que
 *      existen, con su `id` real, porque el índice se construye llamando a los
 *      mismos getters que pinta la página. Un buscador que manda a una sección
 *      inexistente es peor que no tener buscador.
 *   2. **Dice POR QUÉ ha salido cada resultado** (`matched`, `sections`). Sin
 *      eso, una lista ordenada por un número que nadie ve es un oráculo.
 *   3. **Cero red.** Es texto que ya está cargado en el navegador y aritmética
 *      de conjuntos. Funciona sin backend, sin clave de IA y sin conexión, que
 *      es lo que hace que se pueda prometer que siempre responde.
 *
 * El índice se construye bajo demanda y se memoiza por idioma: son ~80
 * llamadas a getters que devuelven objetos grandes, y no hay ninguna razón
 * para pagarlas si nadie pregunta.
 *
 * Comprobado en `scripts/engine-check.js`.
 */
// Con extensión explícita: `engine-check.js` importa este módulo con el ESM de
// Node, que no resuelve extensiones por su cuenta como hace webpack — el mismo
// motivo por el que `instruments.js` la lleva.
import * as C from './tradingEducationContent.js';

/**
 * Qué módulo es cada cosa y de dónde sale su contenido.
 *
 * El `id` es el mismo `value` de `EDUCATION_NAV` en `EducationPage`, que es lo
 * que acepta `?topic=`; si dejaran de coincidir, el enlace llevaría a la
 * pantalla equivocada. `engine-check` comprueba que todo getter nombrado aquí
 * existe de verdad, y `scripts/check-edu-index.js` que no falte ningún módulo
 * de la navegación.
 *
 * Los módulos sin getter (glosario, quiz, tu sistema) no llevan contenido
 * indexable: se buscan por título, que es todo lo que tienen.
 */
export const EDU_MODULES = [
  // ── Empezar ──────────────────────────────────────────────────
  { id: 'start-here', titleKey: 'shTitle', getters: ['getStartHere'] },
  { id: 'my-setup', titleKey: 'tsysTitle', getters: [] },
  { id: 'fundamentals', titleKey: 'fundTab', getters: ['getTradingFundamentals'] },
  { id: 'mechanics', titleKey: 'mechTab', getters: ['getMarketMechanics'] },
  { id: 'styles', titleKey: 'stylesTab', getters: ['getTradingStylesContent'] },
  { id: 'fund-analysis', titleKey: 'fundAnalTab', getters: ['getFundamentalAnalysis'] },
  { id: 'company-valuation', titleKey: 'cvTitle', getters: ['getCompanyValuation'] },
  { id: 'broker-safety', titleKey: 'bkrTitle', getters: ['getBrokerSafety'] },
  { id: 'pfof', titleKey: 'pfofTitle', getters: ['getOrderFlowPayment'] },
  { id: 'funded-truth', titleKey: 'fdTitle', getters: ['getFundedTruth'] },
  { id: 'evidence-based', titleKey: 'evTitle', getters: ['getEvidenceBased'] },
  { id: 'trader-journey', titleKey: 'tjTitle', getters: ['getTraderJourney'] },
  { id: 'long-invest', titleKey: 'liTitle', getters: ['getLongInvest'] },
  { id: 'taxes', titleKey: 'txTitle', getters: ['getTaxes'] },
  { id: 'glossary', titleKey: 'glossaryTab', getters: [] },

  // ── Análisis técnico ─────────────────────────────────────────
  { id: 'tech-analysis', titleKey: 'techTab', getters: ['getTechnicalAnalysis'] },
  { id: 'moving-averages', titleKey: 'mavTitle', getters: ['getMovingAverages'] },
  { id: 'chart-patterns', titleKey: 'chartPatterns', getters: ['getChartPatterns'] },
  { id: 'candlesticks', titleKey: 'candlestickPatterns', getters: ['getCandlestickPatterns'] },
  { id: 'price-action', titleKey: 'pacTitle', getters: ['getPriceAction'] },
  { id: 'dow-theory', titleKey: 'dowTheoryTitle', getters: ['getDowTheory'] },
  { id: 'market-structure', titleKey: 'msTitle', getters: ['getMarketStructure'] },
  { id: 'wyckoff', titleKey: 'wyckoffTab', getters: ['getWyckoffContent'] },
  { id: 'alt-charts', titleKey: 'altChartTab', getters: ['getAlternativeCharts'] },
  { id: 'gann-box', titleKey: 'gannTitle', getters: ['getGannBox'], evidence: 'disputed' },

  // ── Avanzado ─────────────────────────────────────────────────
  { id: 'elliott', titleKey: 'ewTab', getters: ['getElliottWave'] },
  { id: 'ichimoku', titleKey: 'ichiTab', getters: ['getIchimoku'] },
  { id: 'harmonic-patterns', titleKey: 'harmonicPatternsTab', getters: ['getHarmonicPatterns'] },
  { id: 'smc', titleKey: 'smcTitle', getters: ['getSmartMoney'] },
  { id: 'order-flow', titleKey: 'ofTitle', getters: ['getOrderFlow'] },
  { id: 'session-timing', titleKey: 'hzTitle', getters: ['getSessionTiming'] },
  { id: 'advanced-ta', titleKey: 'advTaTitle', getters: ['getAdvancedTA'] },
  { id: 'market-profile', titleKey: 'mpTitle', getters: ['getMarketProfile'] },
  { id: 'elder', titleKey: 'eldTitle', getters: ['getElder'] },
  { id: 'demark', titleKey: 'dmkTitle', getters: ['getDeMark'] },
  { id: 'ehlers', titleKey: 'ehlTitle', getters: ['getEhlers'] },
  { id: 'rrg', titleKey: 'rrgTitle', getters: ['getRRG'] },
  { id: 'pitchfork', titleKey: 'pfTitle', getters: ['getPitchfork'] },
  { id: 'bill-williams', titleKey: 'bwTitle', getters: ['getBillWilliams'], evidence: 'caution' },
  { id: 'wolfe-waves', titleKey: 'wlfTitle', getters: ['getWolfeWaves'], evidence: 'disputed' },
  { id: 'oscillators', titleKey: 'oscTitle', getters: ['getObscureOscillators'] },
  { id: 'time-cycles', titleKey: 'cycTitle', getters: ['getTimeCycles'], evidence: 'disputed' },
  { id: 'sentiment', titleKey: 'smTitle', getters: ['getSentiment'] },
  { id: 'intermarket', titleKey: 'imTitle', getters: ['getIntermarket'] },
  { id: 'forex-deep', titleKey: 'fxTitle', getters: ['getForexDeep'] },
  { id: 'commodities', titleKey: 'cmTitle', getters: ['getCommodities'] },
  { id: 'crypto-deep', titleKey: 'cyTitle', getters: ['getCryptoDeep'] },
  { id: 'indices', titleKey: 'ixTitle', getters: ['getIndices'] },
  { id: 'macro', titleKey: 'mcTitle', getters: ['getMacro'] },
  { id: 'net-liquidity', titleKey: 'liqTitle', getters: ['getNetLiquidity'] },
  { id: 'breadth-cycles', titleKey: 'bcTitle', getters: ['getBreadthCycles'] },
  { id: 'cot', titleKey: 'cotTab', getters: ['getCotContent'] },

  // ── Riesgo y capital ─────────────────────────────────────────
  { id: 'risk', titleKey: 'riskManagement', getters: ['getRiskManagementConcepts'] },
  { id: 'stops-targets', titleKey: 'sltpTitle', getters: ['getStopsAndTargets'] },
  { id: 'capital', titleKey: 'capitalManagementTitle', getters: ['getCapitalManagement'] },
  { id: 'partial-exits', titleKey: 'pexTitle', getters: ['getPartialExits'] },
  { id: 'trade-mgmt', titleKey: 'tmgTitle', getters: ['getTradeManagement'] },
  { id: 'margin-liq', titleKey: 'mlqTitle', getters: ['getMarginLiquidation'] },
  { id: 'probability', titleKey: 'probabilityStatsTitle', getters: ['getProbabilityStatistics'] },
  { id: 'tail-risk', titleKey: 'tailTitle', getters: ['getTailRisk', 'getAccountKillers'] },

  // ── Psicología ───────────────────────────────────────────────
  { id: 'psychology', titleKey: 'tradingPsychologyTitle', getters: ['getTradingPsychology'] },
  { id: 'psych-solutions', titleKey: 'pssTitle', getters: ['getPsychSolutions'] },
  { id: 'system-adherence', titleKey: 'sysTitle', getters: ['getSystemAdherence'] },
  { id: 'time-impact', titleKey: 'tviTitle', getters: [] },
  { id: 'pre-trade-protocol', titleKey: 'protoTitle', getters: [] },
  { id: 'mindset', titleKey: 'mdzTitle', getters: ['getTradingMindset'] },
  { id: 'masters', titleKey: 'mstrTitle', getters: ['getTradingMasters'] },
  { id: 'futures-masters', titleKey: 'fmstTitle', getters: ['getFuturesMasters'] },
  { id: 'rules', titleKey: 'tradingRules', getters: ['getTradingRules', 'getGoldenRules'] },
  { id: 'pro-discipline', titleKey: 'discTitle', getters: ['getProDiscipline'] },
  { id: 'quiz', titleKey: 'quizTab', getters: [] },

  // ── Trading profesional ──────────────────────────────────────
  { id: 'craft', titleKey: 'craftTitle', getters: ['getTraderCraft'] },
  { id: 'strategies', titleKey: 'tradingStrategiesTitle', getters: ['getTradingStrategies'] },
  { id: 'option-greeks', titleKey: 'gkTitle', getters: ['getOptionGreeks'] },
  { id: 'options-strat', titleKey: 'optTitle', getters: ['getOptionsStrategies'] },
  { id: 'options-income', titleKey: 'oiTitle', getters: ['getOptionsIncome'] },
  { id: 'options-vol', titleKey: 'ovTitle', getters: ['getOptionsVol'] },
  { id: 'gamma-exposure', titleKey: 'gexTitle', getters: ['getGammaExposure'] },
  { id: 'news-trading', titleKey: 'ntTitle', getters: ['getNewsTrading'] },
  { id: 'algo-trading', titleKey: 'atTitle', getters: ['getAlgoTrading'] },
  { id: 'copy-trading', titleKey: 'cpTitle', getters: ['getCopyTrading'] },
  { id: 'inst-desk', titleKey: 'ideskTitle', getters: ['getInstitutionalDesk'] },
  { id: 'inst-methods', titleKey: 'imethTitle', getters: ['getInstitutionalMethods'] },
  { id: 'inst-positions', titleKey: 'iposTitle', getters: ['getPositionBuilding'] },
  { id: 'business', titleKey: 'tbizTitle', getters: ['getTradingBusiness'] },
];

/**
 * Normaliza para comparar: minúsculas y sin diacríticos.
 *
 * Sin quitar tildes, "gestion" no encuentra "gestión" — y nadie escribe con
 * tildes en un buscador. Con `NFD` vale igual para el francés, el alemán y el
 * portugués; el ruso, el árabe y los idiomas CJK no llevan diacríticos que
 * estorben y pasan intactos.
 */
export const fold = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

/**
 * Palabras que aparecen en cualquier pregunta y no distinguen nada.
 *
 * Sin ellas, "¿cómo se calcula el riesgo?" puntuaría por "como" y "se" en los
 * setenta y siete módulos y el orden lo decidiría el ruido. La lista cubre los
 * diez idiomas de la web; para los que no separan por espacios (chino,
 * japonés) el filtro por longitud hace casi todo el trabajo.
 */
const STOPWORDS = new Set(fold(`
  que cual cuales como cuando cuanto cuanta cuantos cuantas donde porque para
  pero por con sin sobre entre del los las una unos unas este esta esto ese esa
  aquel mio tuyo suyo hay son ser estar tiene tener hace hacer puedo puede debo
  debe quiero saber
  the what which how much many when where why for but with without about from
  that this these those and are was were have has had can could should would
  want know
  der die das und oder aber fur mit ohne uber wie was wann wo warum ist sind
  viel viele wieviel
  le la les des une uns pour mais avec sans sur entre comment combien quand est
  sont
  che come quando quanto quanti dove perche per ma con senza sopra tra sono
  quando onde mas com sem sao quantos quantas
  что как сколько когда где почему для но без про это эти есть быть
  多少 什么 怎么 为什么 哪里
`).split(/\s+/).filter(Boolean));

/**
 * La raíz con la que se comparan las palabras largas.
 *
 * Sin esto, "arriesgo" no encuentra "arriesgas" ni "arriesgar", y una academia
 * en la que preguntar «cuánto arriesgo» no lleva a gestión del riesgo no sirve
 * de nada. Cinco caracteres es donde se separan los verbos de sus formas sin
 * empezar a fundir palabras distintas ("margen"/"margin" quedan aparte de
 * "mercado"), y por eso la coincidencia por raíz puntúa como el cuerpo y nunca
 * como el título: es una pista, no una certeza.
 */
export const STEM_LEN = 5;
export const stem = (w) => (w.length > STEM_LEN ? w.slice(0, STEM_LEN) : w);

/** Los términos con los que merece la pena buscar. */
export function terms(text) {
  return [...new Set(
    fold(text)
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  )];
}

/**
 * Recoge las cadenas de lo que devuelve un getter, sin saber su forma.
 *
 * Los ochenta getters no comparten esquema —unos tienen `items`, otros
 * `sections`, otros listas de listas— y escribir un lector por forma sería
 * garantizar que el próximo getter se quede fuera del índice en silencio. Se
 * recorre el árbol y se recoge todo lo que sea texto.
 *
 * `names` guarda aparte lo que va bajo una clave de nombre o título: son los
 * apartados del módulo, lo que se le puede enseñar al usuario como "está en
 * este apartado", y por eso puntúan más que el cuerpo.
 */
function harvest(node, out, depth = 0) {
  if (node == null || depth > 6) return out;
  if (typeof node === 'string') {
    out.body.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const v of node) harvest(v, out, depth + 1);
    return out;
  }
  if (typeof node !== 'object') return out;

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && /^(name|title|label|q)$/.test(key)) {
      out.names.push(value);
    } else {
      harvest(value, out, depth + 1);
    }
  }
  return out;
}

const cache = new Map();

/**
 * Construye (o recupera) el índice para este idioma.
 *
 * `locale` sólo se usa como clave de memoización: los textos salen de `t`, que
 * ya viene atado al idioma activo.
 */
export function buildEduIndex(t, locale = 'es') {
  if (cache.has(locale)) return cache.get(locale);

  const index = EDU_MODULES.map((mod) => {
    const collected = { names: [], body: [] };
    for (const name of mod.getters) {
      const getter = C[name];
      if (typeof getter !== 'function') continue;
      try {
        harvest(getter(t), collected);
      } catch (_) {
        // Un getter que reviente no puede tumbar el buscador entero: ese
        // módulo se queda con su título y los otros ochenta y cuatro responden.
      }
    }

    // El título también va protegido, y no por simetría: al construir el
    // índice se llama a `t` ochenta y cinco veces, y una sola que falle aquí
    // fuera se lleva por delante el buscador entero — no un módulo. Cayendo a
    // la clave, ese módulo pierde su nombre traducido y sigue encontrándose.
    let title;
    try {
      title = t(mod.titleKey);
    } catch (_) {
      title = mod.titleKey;
    }
    return {
      id: mod.id,
      title,
      evidence: mod.evidence || null,
      sections: collected.names,
      titleTerms: new Set(terms(title)),
      sectionTerms: new Set(terms(collected.names.join(' '))),
      bodyTerms: new Set(terms(collected.body.join(' '))),
      stems: new Set([
        ...terms(title), ...terms(collected.names.join(' ')),
        ...terms(collected.body.join(' ')),
      ].map(stem)),
    };
  });

  cache.set(locale, index);
  return index;
}

/** Se vacía al cambiar de idioma; lo llama el propio buscador. */
export function clearEduIndex() {
  cache.clear();
}

// Un acierto en el título vale por cinco en el cuerpo: que un módulo se LLAME
// "Gestión del riesgo" dice muchísimo más que que la palabra aparezca en su
// tercer párrafo.
const W_TITLE = 5;
const W_SECTION = 3;
const W_BODY = 1;

/**
 * Busca una pregunta en la Academia.
 *
 * Devuelve, por módulo, el `id` al que enlazar, la puntuación, **qué términos
 * han acertado y en qué apartados**. Ese último dato es el que convierte una
 * lista en una respuesta: no es "mira en Gestión del riesgo", es "en Gestión
 * del riesgo, apartado «Tamaño de posición»".
 *
 * `matchedAll` marca los módulos que contienen TODOS los términos de la
 * pregunta. Se ordena por eso primero: un módulo que responde a la pregunta
 * entera va antes que otro que sólo acierta la palabra más repetida.
 */
export function searchEdu(index, question, { limit = 5 } = {}) {
  const q = terms(question);
  if (!q.length) return { terms: [], results: [] };

  const scored = [];
  for (const mod of index) {
    let score = 0;
    const matched = [];
    for (const term of q) {
      let w = 0;
      if (mod.titleTerms.has(term)) w = W_TITLE;
      else if (mod.sectionTerms.has(term)) w = W_SECTION;
      else if (mod.bodyTerms.has(term)) w = W_BODY;
      else if (term.length > STEM_LEN && mod.stems.has(stem(term))) w = W_BODY;
      if (w) { score += w; matched.push(term); }
    }
    if (!score) continue;

    // Los apartados concretos que contienen algo de lo preguntado: es lo que
    // se le enseña al usuario para que sepa a dónde va antes de hacer clic.
    const hits = mod.sections.filter((s) => {
      const st = terms(s);
      const sst = st.map(stem);
      return q.some((term) => st.includes(term)
        || (term.length > STEM_LEN && sst.includes(stem(term))));
    }).slice(0, 3);

    scored.push({
      id: mod.id,
      title: mod.title,
      evidence: mod.evidence,
      score,
      matched,
      matchedAll: matched.length === q.length,
      sections: hits,
    });
  }

  scored.sort((a, b) => (
    (b.matchedAll - a.matchedAll)
    || (b.matched.length - a.matched.length)
    || (b.score - a.score)
    || a.title.localeCompare(b.title)
  ));

  return { terms: q, results: scored.slice(0, limit) };
}
