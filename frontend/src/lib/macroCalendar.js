/**
 * Recurring macro events, computed from their published release rules.
 *
 * SCOPE — read this before extending:
 * This module answers "WHEN is the next release and what does it usually move".
 * It never invents a figure, a consensus or a previous value. For the actual
 * number the UI sends the user to the source. When a real data provider lands
 * (docs/EXAMEN_FINAL_2026-07-26.md §M-01) this can be swapped for live consensus
 * data without touching the components.
 *
 * All times are the OFFICIAL local release time converted to UTC using the
 * standard offset for that period of the year; ±1h around DST switches is
 * acceptable for a countdown and is flagged as approximate in the UI.
 */

const UTC = (y, m, d, h, min = 0) => new Date(Date.UTC(y, m, d, h, min, 0, 0));

/** Nth weekday of a month. weekday: 0=Sun..6=Sat. n=1 → first, n=-1 → last. */
function nthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month, 1));
    const shift = (weekday - first.getUTCDay() + 7) % 7;
    return 1 + shift + (n - 1) * 7;
  }
  const last = new Date(Date.UTC(year, month + 1, 0));
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return last.getUTCDate() - shift;
}

/** US Eastern is UTC-4 (Mar→Nov) and UTC-5 otherwise. Good enough for a clock. */
const usOffset = (month) => (month >= 2 && month <= 10 ? 4 : 5);
/** Central Europe is UTC+2 (Apr→Oct) and UTC+1 otherwise. */
const euOffset = (month) => (month >= 3 && month <= 9 ? 2 : 1);

/**
 * Event definitions. `next(from)` returns the next occurrence at or after
 * `from`, or null if the rule cannot produce one.
 */
const EVENTS = [
  {
    id: 'us-cpi',
    country: 'us',
    name: { es: 'IPC de EE. UU.', en: 'US CPI inflation' },
    impact: 'high',
    // Bureau of Labor Statistics: monthly, around the 10th-13th, 08:30 ET.
    moves: {
      es: 'Es el dato que fija las expectativas de tipos. Un IPC por encima de lo esperado suele fortalecer el dólar y castigar a bonos, oro e índices; por debajo, lo contrario.',
      en: 'The release that sets rate expectations. A hotter-than-expected CPI usually lifts the dollar and hits bonds, gold and indices; cooler does the reverse.',
    },
    url: 'https://www.bls.gov/cpi/',
    next: (from) => monthlyOn(from, 12, (y, m) => usOffset(m), 8, 30),
  },
  {
    id: 'us-nfp',
    country: 'us',
    name: { es: 'Nóminas no agrícolas (NFP)', en: 'US Non-Farm Payrolls' },
    impact: 'high',
    // BLS employment situation: first Friday of the month, 08:30 ET.
    moves: {
      es: 'El termómetro del empleo estadounidense. Sorpresas al alza refuerzan al dólar y presionan al oro; una cifra débil dispara las apuestas de bajadas de tipos.',
      en: 'The US labour thermometer. Upside surprises strengthen the dollar and pressure gold; a weak print fuels rate-cut bets.',
    },
    url: 'https://www.bls.gov/news.release/empsit.toc.htm',
    next: (from) => nthWeekdayMonthly(from, 5, 1, (y, m) => usOffset(m), 8, 30),
  },
  {
    id: 'us-fomc',
    country: 'us',
    name: { es: 'Decisión de tipos de la Fed (FOMC)', en: 'Fed rate decision (FOMC)' },
    impact: 'high',
    moves: {
      es: 'La decisión y, sobre todo, la rueda de prensa posterior mueven TODOS los activos: dólar, bonos, índices, oro y cripto. La volatilidad se dispara media hora después del comunicado.',
      en: 'The decision — and above all the press conference after it — moves EVERY asset: dollar, bonds, indices, gold and crypto. Volatility spikes half an hour after the statement.',
    },
    url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    // Eight scheduled meetings a year; the decision lands 14:00 ET on day two.
    approx: true,
    fixed: [
      [0, 28], [2, 18], [3, 29], [5, 17], [6, 29], [8, 16], [10, 4], [11, 16],
    ],
    fixedHourLocal: 14,
    fixedOffset: usOffset,
  },
  {
    id: 'ecb-rate',
    country: 'eu',
    name: { es: 'Decisión de tipos del BCE', en: 'ECB rate decision' },
    impact: 'high',
    moves: {
      es: 'Marca el rumbo del euro y de la banca europea. La rueda de prensa 45 minutos después suele mover más que la propia decisión.',
      en: 'Sets the direction for the euro and European banks. The press conference 45 minutes later usually moves more than the decision itself.',
    },
    url: 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html',
    approx: true,
    fixed: [[1, 5], [2, 19], [3, 30], [5, 11], [6, 23], [8, 10], [9, 29], [11, 17]],
    fixedHourLocal: 14,
    fixedOffset: euOffset,
  },
  {
    id: 'eu-pmi',
    country: 'eu',
    name: { es: 'PMI flash de la eurozona', en: 'Eurozone flash PMI' },
    impact: 'medium',
    // S&P Global flash PMIs: around the 22nd-24th, 10:00 CET.
    moves: {
      es: 'Primera foto del mes del ciclo económico. Por encima de 50 = expansión, por debajo = contracción. Mueve el euro y los índices europeos, sobre todo cuando cruza el 50.',
      en: 'The first snapshot of the month\'s economic cycle. Above 50 = expansion, below = contraction. It moves the euro and European indices, especially when it crosses 50.',
    },
    url: 'https://www.pmi.spglobal.com/',
    next: (from) => monthlyOn(from, 23, (y, m) => -euOffset(m), 10, 0),
  },
  {
    id: 'us-pmi',
    country: 'us',
    name: { es: 'PMI flash de EE. UU.', en: 'US flash PMI' },
    impact: 'medium',
    moves: {
      es: 'Mismo indicador adelantado para EE. UU. Su componente de precios pagados es una pista temprana de la inflación que verá el IPC.',
      en: 'The same leading indicator for the US. Its prices-paid component is an early clue to the inflation CPI will later confirm.',
    },
    url: 'https://www.pmi.spglobal.com/',
    next: (from) => monthlyOn(from, 23, (y, m) => usOffset(m), 9, 45),
  },
  {
    id: 'us-gdp',
    country: 'us',
    name: { es: 'PIB de EE. UU. (avance)', en: 'US GDP (advance)' },
    impact: 'medium',
    moves: {
      es: 'Confirma o desmiente la narrativa de recesión. Afecta sobre todo a bonos y a los sectores cíclicos.',
      en: 'Confirms or kills the recession narrative. It mostly moves bonds and cyclical sectors.',
    },
    url: 'https://www.bea.gov/data/gdp/gross-domestic-product',
    // Advance estimate: end of the month after each quarter, 08:30 ET.
    approx: true,
    fixed: [[0, 30], [3, 30], [6, 30], [9, 30]],
    fixedHourLocal: 8.5,
    fixedOffset: usOffset,
  },
  {
    id: 'eia-gas',
    country: 'us',
    name: { es: 'Inventarios de gas natural (EIA)', en: 'EIA natural gas storage' },
    impact: 'medium',
    moves: {
      es: 'El dato semanal que hace del gas natural el futuro más volátil del complejo energético. Una desviación grande frente al consenso mueve el precio un 5-10% en minutos.',
      en: 'The weekly print that makes natural gas the most volatile energy future. A big miss against consensus moves price 5-10% in minutes.',
    },
    url: 'https://ir.eia.gov/ngs/ngs.html',
    weekly: { weekday: 4, hourLocal: 10.5, offset: usOffset }, // Thursday 10:30 ET
  },
  {
    id: 'eia-oil',
    country: 'us',
    name: { es: 'Inventarios de petróleo (EIA)', en: 'EIA crude oil inventories' },
    impact: 'medium',
    moves: {
      es: 'Oferta y demanda reales del crudo estadounidense. Una acumulación mayor de lo esperado presiona al WTI y al Brent a la baja.',
      en: 'Real supply and demand for US crude. A bigger-than-expected build pushes WTI and Brent down.',
    },
    url: 'https://www.eia.gov/petroleum/supply/weekly/',
    weekly: { weekday: 3, hourLocal: 10.5, offset: usOffset }, // Wednesday 10:30 ET
  },
  {
    id: 'boj-rate',
    country: 'jp',
    name: { es: 'Decisión de tipos del Banco de Japón', en: 'Bank of Japan rate decision' },
    impact: 'high',
    moves: {
      es: 'El yen es la divisa de financiación del mundo. Cualquier giro del BoJ deshace operaciones de carry trade globales y sacude bolsas y bonos muy lejos de Japón.',
      en: 'The yen funds the world. Any BoJ turn unwinds global carry trades and shakes equities and bonds far beyond Japan.',
    },
    url: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
    approx: true,
    fixed: [[0, 23], [2, 19], [3, 30], [5, 16], [6, 31], [8, 19], [9, 30], [11, 18]],
    fixedHourLocal: 3,
    fixedOffset: () => -9, // JST is UTC+9
  },
  {
    id: 'boe-rate',
    country: 'gb',
    name: { es: 'Decisión de tipos del Banco de Inglaterra', en: 'Bank of England rate decision' },
    impact: 'high',
    moves: {
      es: 'Motor principal de la libra y del FTSE 100. Ojo al reparto de votos del comité: dice más que la decisión.',
      en: 'The main driver of sterling and the FTSE 100. Watch the committee vote split: it says more than the decision.',
    },
    url: 'https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates',
    approx: true,
    fixed: [[1, 5], [2, 19], [4, 7], [5, 18], [7, 6], [8, 17], [10, 5], [11, 17]],
    fixedHourLocal: 12,
    fixedOffset: () => 0, // announced 12:00 London
  },
];

/* ── rule helpers ─────────────────────────────────────────────── */

function monthlyOn(from, day, offsetFn, hourLocal, minute) {
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const when = UTC(y, m, day, hourLocal + offsetFn(y, m), minute);
    if (when > from) return when;
  }
  return null;
}

function nthWeekdayMonthly(from, weekday, n, offsetFn, hourLocal, minute) {
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const when = UTC(y, m, nthWeekday(y, m, weekday, n), hourLocal + offsetFn(y, m), minute);
    if (when > from) return when;
  }
  return null;
}

function nextWeekly(from, { weekday, hourLocal, offset }) {
  const base = new Date(from.getTime());
  for (let i = 0; i <= 8; i += 1) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    if (d.getUTCDay() !== weekday) continue;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const h = Math.floor(hourLocal) + offset(y, m);
    const when = UTC(y, m, d.getUTCDate(), h, Math.round((hourLocal % 1) * 60));
    if (when > from) return when;
  }
  return null;
}

function nextFixed(from, ev) {
  for (let yearShift = 0; yearShift <= 1; yearShift += 1) {
    const y = from.getUTCFullYear() + yearShift;
    for (const [m, day] of ev.fixed) {
      const h = Math.floor(ev.fixedHourLocal) + ev.fixedOffset(y, m);
      const when = UTC(y, m, day, h, Math.round((ev.fixedHourLocal % 1) * 60));
      if (when > from) return when;
    }
  }
  return null;
}

/**
 * Upcoming macro events, soonest first.
 * @param {Date} from - reference instant (defaults to now)
 * @param {number} limit - how many to return
 */
export function getUpcomingEvents(from = new Date(), limit = 6) {
  return EVENTS
    .map((ev) => {
      let at = null;
      if (ev.fixed) at = nextFixed(from, ev);
      else if (ev.weekly) at = nextWeekly(from, ev.weekly);
      else if (ev.next) at = ev.next(from);
      return at ? { ...ev, at } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
}

/**
 * Scheduled appearances by people who move price on their own.
 * Same policy as above: dates and context only, never a prediction.
 */
export const SPEAKERS = [
  {
    id: 'fed-chair',
    country: 'us',
    who: { es: 'Presidente de la Reserva Federal', en: 'Federal Reserve Chair' },
    when: { es: 'Rueda de prensa tras cada FOMC + comparecencias semestrales en el Congreso', en: 'Press conference after every FOMC + semiannual testimony to Congress' },
    moves: {
      es: 'Dólar, bonos del Tesoro, oro, Nasdaq y cripto. Es la voz que más mueve el precio del planeta: un matiz sobre el ritmo de bajadas de tipos vale más que el dato del mes.',
      en: 'Dollar, Treasuries, gold, Nasdaq and crypto. The single voice that moves price most on earth: one nuance about the pace of cuts is worth more than the month\'s data.',
    },
    url: 'https://www.federalreserve.gov/newsevents/calendar.htm',
    linkedEvent: 'us-fomc',
  },
  {
    id: 'ecb-president',
    country: 'eu',
    who: { es: 'Presidenta del Banco Central Europeo', en: 'European Central Bank President' },
    when: { es: 'Rueda de prensa 45 min tras cada decisión + foro anual de Sintra', en: 'Press conference 45 min after each decision + the annual Sintra forum' },
    moves: {
      es: 'EUR/USD, banca europea, deuda periférica y DAX. El tono sobre la inflación subyacente es lo que se opera.',
      en: 'EUR/USD, European banks, peripheral debt and the DAX. The tone on core inflation is what gets traded.',
    },
    url: 'https://www.ecb.europa.eu/press/calendars/weekly/html/index.en.html',
    linkedEvent: 'ecb-rate',
  },
  {
    id: 'us-president',
    country: 'us',
    who: { es: 'Presidente de Estados Unidos', en: 'President of the United States' },
    when: { es: 'Sin calendario fijo: anuncios de aranceles, política fiscal y redes sociales', en: 'No fixed schedule: tariff announcements, fiscal policy and social media' },
    moves: {
      es: 'Los anuncios de aranceles mueven divisas emergentes, el peso mexicano, el yuan, materias primas y sectores concretos (automoción, semiconductores, acero) en minutos y sin previo aviso. Es el riesgo de titular por excelencia: no se puede programar, solo se puede gestionar con tamaño de posición.',
      en: 'Tariff announcements move emerging currencies, the Mexican peso, the yuan, commodities and specific sectors (autos, semiconductors, steel) within minutes and with no warning. This is headline risk in its purest form: you cannot schedule it, only manage it with position size.',
    },
    url: 'https://www.whitehouse.gov/news/',
  },
  {
    id: 'boj-governor',
    country: 'jp',
    who: { es: 'Gobernador del Banco de Japón', en: 'Bank of Japan Governor' },
    when: { es: 'Rueda de prensa tras cada reunión de política monetaria', en: 'Press conference after each monetary policy meeting' },
    moves: {
      es: 'USD/JPY y, por la vía del carry trade, medio mercado global. Cualquier insinuación de normalizar tipos provoca un movimiento brusco del yen.',
      en: 'USD/JPY and, through the carry trade, half the global market. Any hint of normalising rates triggers a violent yen move.',
    },
    url: 'https://www.boj.or.jp/en/about/press/index.htm',
    linkedEvent: 'boj-rate',
  },
  {
    id: 'boe-governor',
    country: 'gb',
    who: { es: 'Gobernador del Banco de Inglaterra', en: 'Bank of England Governor' },
    when: { es: 'Rueda de prensa tras la decisión + informe de política monetaria trimestral', en: 'Post-decision press conference + quarterly monetary policy report' },
    moves: {
      es: 'GBP/USD, EUR/GBP, FTSE 100 y gilts.',
      en: 'GBP/USD, EUR/GBP, the FTSE 100 and gilts.',
    },
    url: 'https://www.bankofengland.co.uk/news/speeches',
    linkedEvent: 'boe-rate',
  },
  {
    id: 'opec',
    country: 'world',
    who: { es: 'Reuniones de la OPEP+', en: 'OPEC+ meetings' },
    when: { es: 'Reuniones ministeriales periódicas, con filtraciones previas', en: 'Periodic ministerial meetings, usually pre-leaked' },
    moves: {
      es: 'Petróleo Brent y WTI, divisas de países exportadores (CAD, NOK, RUB) y, por la vía de la inflación energética, los bonos.',
      en: 'Brent and WTI crude, exporter currencies (CAD, NOK, RUB) and, through energy inflation, bonds.',
    },
    url: 'https://www.opec.org/opec_web/en/press_room/28.htm',
  },
];

export default EVENTS;
