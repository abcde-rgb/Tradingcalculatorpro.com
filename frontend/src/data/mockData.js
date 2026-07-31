// Ultra-comprehensive mock data for options calculator
// Supports ANY ticker with dynamic generation + 66 strategies

const KNOWN_STOCKS = {
  AAPL: { name: 'Apple Inc.', price: 198.45, sector: 'Technology' },
  TSLA: { name: 'Tesla, Inc.', price: 271.83, sector: 'Automotive' },
  MSFT: { name: 'Microsoft Corp.', price: 442.57, sector: 'Technology' },
  SPY: { name: 'SPDR S&P 500 ETF', price: 563.48, sector: 'ETF' },
  NVDA: { name: 'NVIDIA Corp.', price: 131.28, sector: 'Semiconductors' },
  AMZN: { name: 'Amazon.com Inc.', price: 205.74, sector: 'Technology' },
  META: { name: 'Meta Platforms', price: 598.32, sector: 'Technology' },
  GOOG: { name: 'Alphabet Inc.', price: 176.49, sector: 'Technology' },
  GOOGL: { name: 'Alphabet Inc. Class A', price: 177.12, sector: 'Technology' },
  NFLX: { name: 'Netflix Inc.', price: 1032.75, sector: 'Entertainment' },
  AMD: { name: 'Advanced Micro Devices', price: 158.92, sector: 'Semiconductors' },
  INTC: { name: 'Intel Corp.', price: 24.18, sector: 'Semiconductors' },
  BA: { name: 'Boeing Co.', price: 178.34, sector: 'Aerospace' },
  DIS: { name: 'Walt Disney Co.', price: 112.56, sector: 'Entertainment' },
  JPM: { name: 'JPMorgan Chase', price: 258.91, sector: 'Finance' },
  V: { name: 'Visa Inc.', price: 312.45, sector: 'Finance' },
  MA: { name: 'Mastercard Inc.', price: 528.73, sector: 'Finance' },
  WMT: { name: 'Walmart Inc.', price: 92.18, sector: 'Retail' },
  COST: { name: 'Costco Wholesale', price: 912.45, sector: 'Retail' },
  HD: { name: 'Home Depot Inc.', price: 378.92, sector: 'Retail' },
  PG: { name: 'Procter & Gamble', price: 172.34, sector: 'Consumer' },
  KO: { name: 'Coca-Cola Co.', price: 63.28, sector: 'Consumer' },
  PEP: { name: 'PepsiCo Inc.', price: 148.56, sector: 'Consumer' },
  JNJ: { name: 'Johnson & Johnson', price: 156.78, sector: 'Healthcare' },
  UNH: { name: 'UnitedHealth Group', price: 512.34, sector: 'Healthcare' },
  ABBV: { name: 'AbbVie Inc.', price: 178.92, sector: 'Pharma' },
  PFE: { name: 'Pfizer Inc.', price: 26.45, sector: 'Pharma' },
  MRK: { name: 'Merck & Co.', price: 128.34, sector: 'Pharma' },
  LLY: { name: 'Eli Lilly & Co.', price: 892.45, sector: 'Pharma' },
  XOM: { name: 'Exxon Mobil', price: 108.45, sector: 'Energy' },
  CVX: { name: 'Chevron Corp.', price: 156.78, sector: 'Energy' },
  QQQ: { name: 'Invesco QQQ Trust', price: 498.23, sector: 'ETF' },
  IWM: { name: 'iShares Russell 2000', price: 214.56, sector: 'ETF' },
  GLD: { name: 'SPDR Gold Shares', price: 289.34, sector: 'ETF' },
  SLV: { name: 'iShares Silver Trust', price: 31.28, sector: 'ETF' },
  TLT: { name: 'iShares 20+ Year Treasury', price: 92.45, sector: 'ETF' },
  COIN: { name: 'Coinbase Global', price: 267.89, sector: 'Crypto' },
  MSTR: { name: 'MicroStrategy Inc.', price: 398.12, sector: 'Crypto' },
  PLTR: { name: 'Palantir Technologies', price: 112.34, sector: 'Technology' },
  CRM: { name: 'Salesforce Inc.', price: 312.56, sector: 'Technology' },
  ORCL: { name: 'Oracle Corp.', price: 178.23, sector: 'Technology' },
  UBER: { name: 'Uber Technologies', price: 78.92, sector: 'Technology' },
  SNAP: { name: 'Snap Inc.', price: 12.34, sector: 'Technology' },
  ROKU: { name: 'Roku Inc.', price: 78.56, sector: 'Technology' },
  SQ: { name: 'Block Inc.', price: 72.34, sector: 'Finance' },
  PYPL: { name: 'PayPal Holdings', price: 68.92, sector: 'Finance' },
  RIVN: { name: 'Rivian Automotive', price: 14.56, sector: 'Automotive' },
  LCID: { name: 'Lucid Group', price: 3.28, sector: 'Automotive' },
  NIO: { name: 'NIO Inc.', price: 5.67, sector: 'Automotive' },
  BABA: { name: 'Alibaba Group', price: 128.45, sector: 'Technology' },
  TSM: { name: 'Taiwan Semiconductor', price: 189.34, sector: 'Semiconductors' },
  AVGO: { name: 'Broadcom Inc.', price: 218.56, sector: 'Semiconductors' },
  MU: { name: 'Micron Technology', price: 98.23, sector: 'Semiconductors' },
  SMCI: { name: 'Super Micro Computer', price: 42.18, sector: 'Technology' },
  ARM: { name: 'Arm Holdings', price: 168.92, sector: 'Semiconductors' },
  SHOP: { name: 'Shopify Inc.', price: 108.45, sector: 'Technology' },
  NET: { name: 'Cloudflare Inc.', price: 112.89, sector: 'Technology' },
  SNOW: { name: 'Snowflake Inc.', price: 178.34, sector: 'Technology' },
  DDOG: { name: 'Datadog Inc.', price: 132.56, sector: 'Technology' },
  ZS: { name: 'Zscaler Inc.', price: 198.92, sector: 'Cybersecurity' },
  CRWD: { name: 'CrowdStrike Holdings', price: 342.18, sector: 'Cybersecurity' },
  PANW: { name: 'Palo Alto Networks', price: 178.92, sector: 'Cybersecurity' },
  GS: { name: 'Goldman Sachs', price: 512.45, sector: 'Finance' },
  MS: { name: 'Morgan Stanley', price: 112.34, sector: 'Finance' },
  BAC: { name: 'Bank of America', price: 42.18, sector: 'Finance' },
  WFC: { name: 'Wells Fargo & Co.', price: 68.92, sector: 'Finance' },
  C: { name: 'Citigroup Inc.', price: 68.45, sector: 'Finance' },
  F: { name: 'Ford Motor Co.', price: 12.34, sector: 'Automotive' },
  GM: { name: 'General Motors', price: 48.92, sector: 'Automotive' },
  ADBE: { name: 'Adobe Inc.', price: 478.34, sector: 'Technology' },
  NOW: { name: 'ServiceNow Inc.', price: 892.18, sector: 'Technology' },
  INTU: { name: 'Intuit Inc.', price: 618.92, sector: 'Technology' },
  ABNB: { name: 'Airbnb Inc.', price: 148.92, sector: 'Travel' },
  BKNG: { name: 'Booking Holdings', price: 4218.45, sector: 'Travel' },
  NKE: { name: 'Nike Inc.', price: 78.34, sector: 'Consumer' },
  SBUX: { name: 'Starbucks Corp.', price: 98.18, sector: 'Consumer' },
  MCD: { name: "McDonald's Corp.", price: 298.92, sector: 'Consumer' },
  LULU: { name: 'Lululemon Athletica', price: 298.92, sector: 'Retail' },
  SPOT: { name: 'Spotify Technology', price: 578.92, sector: 'Entertainment' },
  SOFI: { name: 'SoFi Technologies', price: 14.92, sector: 'Finance' },
  HOOD: { name: 'Robinhood Markets', price: 48.34, sector: 'Finance' },
  DELL: { name: 'Dell Technologies', price: 118.45, sector: 'Technology' },
  IBM: { name: 'IBM Corp.', price: 228.92, sector: 'Technology' },
};

export function getStockData(symbol) {
  const upper = symbol.toUpperCase();
  if (KNOWN_STOCKS[upper]) {
    const s = KNOWN_STOCKS[upper];
    const change = +(((Math.random() - 0.4) * s.price * 0.03)).toFixed(2);
    return {
      symbol: upper, name: s.name, price: s.price, change,
      changePercent: +((change / s.price) * 100).toFixed(2),
      high52w: +(s.price * (1 + Math.random() * 0.4)).toFixed(2),
      low52w: +(s.price * (1 - Math.random() * 0.3)).toFixed(2),
      volume: `${(Math.random() * 100 + 5).toFixed(1)}M`, sector: s.sector,
    };
  }
  const price = +(Math.random() * 400 + 10).toFixed(2);
  const change = +(((Math.random() - 0.4) * price * 0.03)).toFixed(2);
  return {
    symbol: upper, name: `${upper} Corp.`, price, change,
    changePercent: +((change / price) * 100).toFixed(2),
    high52w: +(price * 1.3).toFixed(2), low52w: +(price * 0.7).toFixed(2),
    volume: `${(Math.random() * 50 + 1).toFixed(1)}M`, sector: 'Unknown',
  };
}

export function searchTickers(query) {
  if (!query) return Object.keys(KNOWN_STOCKS).slice(0, 12);
  const q = query.toUpperCase();
  return Object.entries(KNOWN_STOCKS)
    .filter(([sym, data]) => sym.includes(q) || data.name.toUpperCase().includes(q))
    .map(([sym]) => sym).slice(0, 12);
}

function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function generateOptionsChain(currentPrice, daysToExpiry) {
  const strikes = [];
  let strikeStep;
  if (currentPrice < 20) strikeStep = 0.5;
  else if (currentPrice < 50) strikeStep = 1;
  else if (currentPrice < 200) strikeStep = 2.5;
  else if (currentPrice < 500) strikeStep = 5;
  else strikeStep = 10;
  const baseStrike = Math.round(currentPrice / strikeStep) * strikeStep;
  const iv = 0.28 + Math.random() * 0.12;
  const T = daysToExpiry / 365;
  for (let i = -15; i <= 15; i++) {
    const strike = +(baseStrike + i * strikeStep).toFixed(2);
    if (strike <= 0) continue;
    const moneyness = Math.log(currentPrice / strike) / (iv * Math.sqrt(T || 0.001));
    const nd1 = 0.5 * (1 + erf(moneyness / Math.sqrt(2)));
    const callIntrinsic = Math.max(0, currentPrice - strike);
    const putIntrinsic = Math.max(0, strike - currentPrice);
    const callTimeVal = currentPrice * iv * Math.sqrt(T) * Math.exp(-moneyness * moneyness / 8) * 0.4;
    const putTimeVal = currentPrice * iv * Math.sqrt(T) * Math.exp(-moneyness * moneyness / 8) * 0.4;
    const callMid = Math.max(0.01, callIntrinsic + callTimeVal);
    const putMid = Math.max(0.01, putIntrinsic + putTimeVal);
    const callDelta = nd1;
    const putDelta = nd1 - 1;
    const g = Math.exp(-moneyness * moneyness / 2) / (currentPrice * iv * Math.sqrt(2 * Math.PI * (T || 0.001)));
    const callTheta = -(currentPrice * iv * g) / (2 * Math.sqrt(T || 0.001)) / 365;
    const v = currentPrice * Math.sqrt(T || 0.001) * g;
    const spread = Math.max(0.01, callMid * 0.03);
    strikes.push({
      strike,
      call: {
        bid: +Math.max(0.01, callMid - spread).toFixed(2), ask: +(callMid + spread).toFixed(2),
        mid: +callMid.toFixed(2), last: +callMid.toFixed(2),
        volume: Math.floor(Math.random() * 8000) + 50, openInterest: Math.floor(Math.random() * 30000) + 200,
        iv: +(iv + (Math.random() - 0.5) * 0.04).toFixed(4), delta: +callDelta.toFixed(4),
        gamma: +g.toFixed(6), theta: +callTheta.toFixed(4), vega: +(v / 100).toFixed(4),
      },
      put: {
        bid: +Math.max(0.01, putMid - spread).toFixed(2), ask: +(putMid + spread).toFixed(2),
        mid: +putMid.toFixed(2), last: +putMid.toFixed(2),
        volume: Math.floor(Math.random() * 8000) + 50, openInterest: Math.floor(Math.random() * 30000) + 200,
        iv: +(iv + (Math.random() - 0.5) * 0.04).toFixed(4), delta: +putDelta.toFixed(4),
        gamma: +g.toFixed(6), theta: +callTheta.toFixed(4), vega: +(v / 100).toFixed(4),
      },
      itm: currentPrice > strike ? 'call' : currentPrice < strike ? 'put' : 'atm',
    });
  }
  return strikes;
}

export function generateExpirations() {
  const expirations = [];
  const today = new Date();
  const daysOptions = [3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180, 270, 365];
  daysOptions.forEach((days) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    const dayOfWeek = date.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    date.setDate(date.getDate() + daysUntilFriday);
    const actualDays = Math.round((date - today) / (1000 * 60 * 60 * 24));
    expirations.push({
      date: date.toISOString().split('T')[0], daysToExpiry: actualDays,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isWeekly: days < 30, isMonthly: days >= 30 && days < 100, isLeaps: days >= 180,
    });
  });
  return expirations;
}

// ═══════════════════════════════════════════════════════════════
// 33 STRATEGIES - Complete professional options strategy library
// ═══════════════════════════════════════════════════════════════

export const STRATEGIES = [
  // ═══ BULLISH (8) ═══
  {
    id: 'long_call', name: 'mock_longCallBuy_780ea6ab', category: 'Bullish', color: '#22c55e',
    description: 'mock_compraUnaCallPagas_b48625be',
    legs: [{ type: 'call', action: 'buy', qty: 1, offset: 0 }],
    risk: 'mock_limitadoPrimaPagada_610169e3', reward: 'mock_ilimitado_07602bab', shape: 'call_buy',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_primaPagada_8d554c72',
    whenToUse: 'mock_ivBajaTendenciaAlcista_0cd845d3',
  },
  {
    id: 'short_put', name: 'mock_shortPutCspSell_9cc74ccd', category: 'Bullish', color: '#06b6d4',
    description: 'mock_vendesUnaPutGarantizada_378fac04',
    legs: [{ type: 'put', action: 'sell', qty: 1, offset: -1 }],
    risk: 'mock_altoStrikePrimaSi_bfa734ea', reward: 'mock_limitadoPrima_950e183f', shape: 'put_sell',
    maxProfit: 'mock_primaCobrada_c02e4698', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'mock_neutralAlcistaIvElevada_0db6b9a8',
  },
  {
    id: 'bull_call_spread', name: 'mock_bullCallSpread_aab17f2a', category: 'Bullish', color: '#10b981',
    description: 'mock_compraCallInferiorVende_512b6185',
    legs: [{ type: 'call', action: 'buy', qty: 1, offset: 0 }, { type: 'call', action: 'sell', qty: 1, offset: 3 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'bull_spread',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_alcistaModerado_6114a500',
  },
  {
    id: 'bull_put_spread', name: 'mock_bullPutSpread_47bb851b', category: 'Bullish', color: '#34d399',
    description: 'mock_vendePutSuperiorCompra_96cc00ae',
    legs: [{ type: 'put', action: 'sell', qty: 1, offset: -1 }, { type: 'put', action: 'buy', qty: 1, offset: -4 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'bull_spread',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_alcistaQuiereCobrarCredito_986410ac',
  },
  {
    id: 'call_ratio_backspread', name: 'mock_callRatioBackspread_50552983', category: 'Bullish', color: '#4ade80',
    description: 'mock_vende1CallAtm_4841d68d',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'buy', qty: 2, offset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'call_ratio',
    maxProfit: 'mock_ilimitadoAlAlza_eb34ff8b', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_muyAlcistaMovimientoFuerte_17bc9c4d',
  },
  {
    id: 'collar', name: 'mock_collar_ecd5a80c', category: 'Bullish', color: '#2dd4bf',
    description: 'mock_stockCompraPutOtm_3bbdd2c6',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -3 },
      { type: 'call', action: 'sell', qty: 1, offset: 3 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'collar',
    maxProfit: 'mock_callStrikeSpotCredito_0e05b9af', maxLoss: 'mock_spotPutStrikeCredito_d6a8bf4e',
    whenToUse: 'mock_protegerPosicionLargaExistente_a3cf891d',
  },
  {
    id: 'synthetic_long', name: 'mock_syntheticLong_2d018015', category: 'Bullish', color: '#059669',
    description: 'mock_compraCallAtmVende_65394e86',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_ilimitado_07602bab', shape: 'synthetic_long',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_strikeDebitoNeto_d98fccb0',
    whenToUse: 'mock_alcistaFuerteAlternativaA_ca369012',
  },
  {
    id: 'long_combo', name: 'mock_longCombo_b7c6b6e4', category: 'Bullish', color: '#0d9488',
    description: 'mock_compraCallOtmVende_a77ae7db',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 2 },
      { type: 'put', action: 'sell', qty: 1, offset: -2 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_ilimitado_07602bab', shape: 'long_combo',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_putStrikeDebitoNeto_bf6a8f04',
    whenToUse: 'mock_alcistaConMenosCapital_370ce22e',
  },

  // ═══ BEARISH (7) ═══
  {
    id: 'long_put', name: 'mock_longPutBuy_64a6349e', category: 'Bearish', color: '#ef4444',
    description: 'mock_comprasUnaPutPagas_8dceeace',
    legs: [{ type: 'put', action: 'buy', qty: 1, offset: 0 }],
    risk: 'mock_limitadoPrimaPagada_610169e3', reward: 'mock_altoHastaStrike_2ac64966', shape: 'put_buy',
    maxProfit: 'mock_strikePrima_e1d2b2aa', maxLoss: 'mock_primaPagada_8d554c72',
    whenToUse: 'mock_ivBajaCaidaEsperada_5f5f4890',
  },
  {
    id: 'short_call', name: 'mock_shortCallNakedSell_311c7764', category: 'Bearish', color: '#f97316',
    description: 'mock_vendesUnaCallDesnuda_f50a2e58',
    legs: [{ type: 'call', action: 'sell', qty: 1, offset: 1 }],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitadoPrima_950e183f', shape: 'call_sell',
    maxProfit: 'mock_primaCobrada_c02e4698', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'mock_bajistaIvElevadaCuenta_84dacd8b',
  },
  {
    id: 'bear_put_spread', name: 'mock_bearPutSpread_d88c8451', category: 'Bearish', color: '#f43f5e',
    description: 'mock_compraPutSuperiorVende_7a293d3d',
    legs: [{ type: 'put', action: 'buy', qty: 1, offset: 0 }, { type: 'put', action: 'sell', qty: 1, offset: -3 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'bear_spread',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_bajistaModerado_133c2c81',
  },
  {
    id: 'bear_call_spread', name: 'mock_bearCallSpread_f0c25756', category: 'Bearish', color: '#fb7185',
    description: 'mock_vendeCallInferiorCompra_51a76f60',
    legs: [{ type: 'call', action: 'sell', qty: 1, offset: 1 }, { type: 'call', action: 'buy', qty: 1, offset: 4 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'bear_spread',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_bajistaQuiereCobrarCredito_7efc0589',
  },
  {
    id: 'put_ratio_backspread', name: 'mock_putRatioBackspread_d5cb74d7', category: 'Bearish', color: '#e11d48',
    description: 'mock_vende1PutAtm_adfcfe9a',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
      { type: 'put', action: 'buy', qty: 2, offset: -3 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_alto_2c90bb36', shape: 'put_ratio',
    maxProfit: 'mock_putStrikeBajo100_5a8433a7', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_muyBajistaEsperaCrash_79ed593f',
  },
  {
    id: 'synthetic_short', name: 'mock_syntheticShort_59db1aa4', category: 'Bearish', color: '#dc2626',
    description: 'mock_compraPutAtmVende_76d6b840',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_alto_2c90bb36', shape: 'synthetic_short',
    maxProfit: 'mock_strikeCreditoNeto_bf798994', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'mock_bajistaFuerteAlternativaA_da34df03',
  },
  {
    id: 'short_combo', name: 'mock_shortCombo_fec3c311', category: 'Bearish', color: '#b91c1c',
    description: 'mock_vendeCallOtmCompra_109d1b9d',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 2 },
      { type: 'put', action: 'buy', qty: 1, offset: -2 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_alto_2c90bb36', shape: 'short_combo',
    maxProfit: 'mock_putStrikeCredito_4b8e0bd7', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'mock_bajistaFuerteConOtm_9da9c0d4',
  },

  // ═══ NEUTRAL / INCOME (11) ═══
  {
    id: 'covered_call', name: 'mock_coveredCall_2d754822', category: 'Neutral', color: '#8b5cf6',
    description: 'mock_stockLargoVentaDe_e65d9a5d',
    legs: [{ type: 'stock', action: 'buy', qty: 100, offset: 0 }, { type: 'call', action: 'sell', qty: 1, offset: 2 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'covered_call',
    maxProfit: 'mock_primaStrikeSpot_1ebed322', maxLoss: 'mock_spotPrima_d3da437b',
    whenToUse: 'mock_generarIngresosSobrePosicion_0f406e41',
  },
  {
    id: 'iron_condor', name: 'mock_ironCondor_87debb7b', category: 'Neutral', color: '#a78bfa',
    description: 'mock_vendePutSpreadCall_f894c130',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: -5 },
      { type: 'put', action: 'sell', qty: 1, offset: -2 },
      { type: 'call', action: 'sell', qty: 1, offset: 2 },
      { type: 'call', action: 'buy', qty: 1, offset: 5 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'iron_condor',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_neutralBajaIvEsperada_2eea341e',
  },
  {
    id: 'iron_butterfly', name: 'mock_ironButterfly_26902164', category: 'Neutral', color: '#d946ef',
    description: 'mock_vendeStraddleAtmCompra_e4dfa2af',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: -4 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 4 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'iron_butterfly',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'mock_neutralExactoMaximoCredito_f3fa0948',
  },
  {
    id: 'butterfly_call', name: 'mock_butterflyCall_17cf8384', category: 'Neutral', color: '#c084fc',
    description: 'mock_compra1CallBaja_86db8000',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -2 },
      { type: 'call', action: 'sell', qty: 2, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'butterfly',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_neutralBajoCoste_2528676e',
  },
  {
    id: 'butterfly_put', name: 'mock_butterflyPut_9799a457', category: 'Neutral', color: '#e879f9',
    description: 'mock_compra1PutAlta_dd5a6e7f',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 2 },
      { type: 'put', action: 'sell', qty: 2, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'butterfly',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_neutralAlternativaConPuts_f69904ed',
  },
  {
    id: 'jade_lizard', name: 'mock_jadeLizard_c30460d2', category: 'Neutral', color: '#14b8a6',
    description: 'mock_shortPutSpreadNaked_6962d18d',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: -4 },
      { type: 'put', action: 'sell', qty: 1, offset: -1 },
      { type: 'call', action: 'sell', qty: 1, offset: 3 },
    ],
    risk: 'mock_limitadoAbajo_dd326271', reward: 'mock_limitado_042e1180', shape: 'jade_lizard',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_difStrikesPutsCredito_26668134',
    whenToUse: 'mock_neutralAlcistaIvAlta_b7cf3556',
  },
  {
    id: 'short_straddle', name: 'mock_shortStraddle_a90b6f9e', category: 'Neutral', color: '#7c3aed',
    description: 'mock_vendeCallPutMismo_0cb3e536',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'short_straddle',
    maxProfit: 'mock_primaTotalCobrada_99490408', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'mock_neutralIvMuyAlta_2bf8d776',
  },
  {
    id: 'short_strangle', name: 'mock_shortStrangle_275c88c8', category: 'Neutral', color: '#6d28d9',
    description: 'mock_vendeCallOtmPut_522d2d95',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 2 },
      { type: 'put', action: 'sell', qty: 1, offset: -2 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'short_strangle',
    maxProfit: 'mock_primaTotalCobrada_99490408', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'mock_neutralRangoAmplioIv_2318f2d4',
  },
  {
    id: 'ratio_call_spread', name: 'mock_ratioCallSpread_d27eca4c', category: 'Neutral', color: '#9333ea',
    description: 'mock_compra1CallAtm_380172cb',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 2, offset: 3 },
    ],
    risk: 'mock_ilimitadoAlAlza_eb34ff8b', reward: 'mock_limitado_042e1180', shape: 'ratio_spread',
    maxProfit: 'mock_difStrikesCredito_6e4cb918', maxLoss: 'mock_ilimitadoSiSubeMucho_1170e83e',
    whenToUse: 'mock_alcistaModeradoNoEspera_93982f75',
  },
  {
    id: 'ratio_put_spread', name: 'mock_ratioPutSpread_07a68eb2', category: 'Neutral', color: '#a855f7',
    description: 'mock_compra1PutAtm_a32a6bb8',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 2, offset: -3 },
    ],
    risk: 'mock_altoSiBajaMucho_6cc0e7a9', reward: 'mock_limitado_042e1180', shape: 'ratio_spread_put',
    maxProfit: 'mock_difStrikesCredito_6e4cb918', maxLoss: 'mock_altoSiCaeFuerte_3ad2ab02',
    whenToUse: 'mock_bajistaModeradoNoEspera_f60f0a9c',
  },
  {
    id: 'broken_wing_butterfly', name: 'mock_brokenWingButterfly_ffa6db1f', category: 'Neutral', color: '#7e22ce',
    description: 'mock_butterflyAsimetricaCompra1_b0613e0c',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -2 },
      { type: 'call', action: 'sell', qty: 2, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 4 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'broken_wing',
    maxProfit: 'mock_creditoNetoBeneficioEn_291c02c4', maxLoss: 'mock_difAlasCredito_1f037536',
    whenToUse: 'mock_neutralConSesgoDireccional_6ad7afe3',
  },

  // ═══ VOLATILE (7) ═══
  {
    id: 'straddle', name: 'mock_longStraddle_c42db316', category: 'Volatile', color: '#eab308',
    description: 'mock_compraCallPutMismo_116da9e4',
    legs: [{ type: 'call', action: 'buy', qty: 1, offset: 0 }, { type: 'put', action: 'buy', qty: 1, offset: 0 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'straddle',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_primaTotalPagada_c75d4574',
    whenToUse: 'mock_esperaMovimientoFuerteIv_18ae84f2',
  },
  {
    id: 'strangle', name: 'mock_longStrangle_2e73f744', category: 'Volatile', color: '#f59e0b',
    description: 'mock_compraCallOtmPut_e3eabd4b',
    legs: [{ type: 'call', action: 'buy', qty: 1, offset: 2 }, { type: 'put', action: 'buy', qty: 1, offset: -2 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'strangle',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_primaTotalPagada_c75d4574',
    whenToUse: 'mock_esperaAltaVolatilidad_31cc2552',
  },
  {
    id: 'reverse_iron_condor', name: 'mock_reverseIronCondor_bca783ea', category: 'Volatile', color: '#fbbf24',
    description: 'mock_compraStrangleVendeStrangle_12fa7620',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -5 },
      { type: 'put', action: 'buy', qty: 1, offset: -2 },
      { type: 'call', action: 'buy', qty: 1, offset: 2 },
      { type: 'call', action: 'sell', qty: 1, offset: 5 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'reverse_ic',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_esperaRupturaDeRango_d93dc500',
  },
  {
    id: 'reverse_iron_butterfly', name: 'mock_reverseIronButterfly_ec21ef1c', category: 'Volatile', color: '#d97706',
    description: 'mock_compraStraddleAtmVende_7e77592b',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -4 },
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 4 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'reverse_ib',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'mock_esperaMovimientoFuerteCoste_90180d0c',
  },
  {
    id: 'long_guts', name: 'mock_longGuts_c4b17d9c', category: 'Volatile', color: '#ca8a04',
    description: 'mock_compraCallItmPut_ad8bdb09',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -2 },
      { type: 'put', action: 'buy', qty: 1, offset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'long_guts',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_difStrikesPrimaValor_71525442',
    whenToUse: 'mock_movimientoFuerteAlternativaA_fbe14564',
  },
  {
    id: 'strap', name: 'mock_strap_4b184fcf', category: 'Volatile', color: '#65a30d',
    description: 'mock_compra2Calls1_604210bd',
    legs: [
      { type: 'call', action: 'buy', qty: 2, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'strap',
    maxProfit: 'mock_ilimitadoMasSiSube_bf8378e4', maxLoss: 'mock_primaTotalPagada_c75d4574',
    whenToUse: 'mock_volatilConSesgoAlcista_c57ed246',
  },
  {
    id: 'strip', name: 'mock_strip_031b9e77', category: 'Volatile', color: '#dc2626',
    description: 'mock_compra1Call2_e582749c',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'buy', qty: 2, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_alto_2c90bb36', shape: 'strip',
    maxProfit: 'mock_altoMasSiBaja_de15ce82', maxLoss: 'mock_primaTotalPagada_c75d4574',
    whenToUse: 'mock_volatilConSesgoBajista_a2337b6f',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INCOME / CUBIERTAS (7)
  // Estructuras sobre acciones. El Cash Secured Put no es un duplicado del
  // short put: la diferencia está en el capital inmovilizado, que es
  // exactamente lo que decide si la operación cabe en la cuenta.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'cash_secured_put', name: 'Cash Secured Put', category: 'Bullish', color: '#0ea5e9',
    description: 'strat_csp_desc',
    legs: [{ type: 'put', action: 'sell', qty: 1, offset: -2 }],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'put_sell',
    maxProfit: 'mock_primaCobrada_c02e4698', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_wheel',
  },
  {
    id: 'protective_put', name: 'Protective Put', category: 'Bullish', color: '#38bdf8',
    description: 'strat_protective_put_desc',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'collar',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_spotPutStrikeCredito_d6a8bf4e',
    whenToUse: 'strat_when_hedge_long',
  },
  {
    id: 'covered_put', name: 'Covered Put', category: 'Bearish', color: '#f43f5e',
    description: 'strat_covered_put_desc',
    legs: [
      { type: 'stock', action: 'sell', qty: 100, offset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: -2 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'put_sell',
    maxProfit: 'mock_primaCobrada_c02e4698', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'strat_when_income_short',
  },
  {
    id: 'covered_strangle', name: 'Covered Strangle', category: 'Bullish', color: '#22d3ee',
    description: 'strat_covered_strangle_desc',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 3 },
      { type: 'put', action: 'sell', qty: 1, offset: -3 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'short_strangle',
    maxProfit: 'mock_callStrikeSpotCredito_0e05b9af', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_income_long',
  },
  {
    id: 'ratio_call_write', name: 'Ratio Call Write', category: 'Neutral', color: '#fb7185',
    description: 'strat_ratio_call_write_desc',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'call', action: 'sell', qty: 2, offset: 2 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'ratio_spread',
    maxProfit: 'mock_callStrikeSpotCredito_0e05b9af', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'strat_when_ratio_write',
  },
  {
    id: 'ratio_put_write', name: 'Ratio Put Write', category: 'Neutral', color: '#f472b6',
    description: 'strat_ratio_put_write_desc',
    legs: [
      { type: 'stock', action: 'sell', qty: 100, offset: 0 },
      { type: 'put', action: 'sell', qty: 2, offset: -2 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'ratio_spread_put',
    maxProfit: 'mock_primaCobrada_c02e4698', maxLoss: 'mock_alto_2c90bb36',
    whenToUse: 'strat_when_ratio_write',
  },
  {
    id: 'stock_repair', name: 'Stock Repair', category: 'Bullish', color: '#84cc16',
    description: 'strat_stock_repair_desc',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 2, offset: 3 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'ratio_spread',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_spotPutStrikeCredito_d6a8bf4e',
    whenToUse: 'strat_when_repair',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPORALES (8) — requieren vencimiento POR PATA (`expOffset`)
  // Hasta que el modelo de datos admitió varias expiraciones, ninguna de
  // estas ocho se podía siquiera escribir: todas las patas heredaban la
  // misma fecha y un calendar se aplanaba en un vertical de prima cero.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'call_calendar', name: 'Call Calendar Spread', category: 'Neutral', color: '#8b5cf6',
    description: 'strat_call_calendar_desc',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 0, expOffset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 0, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'calendar',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_calendar',
  },
  {
    id: 'put_calendar', name: 'Put Calendar Spread', category: 'Neutral', color: '#a78bfa',
    description: 'strat_put_calendar_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: 0, expOffset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: 0, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'calendar',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_calendar',
  },
  {
    id: 'call_diagonal', name: 'Call Diagonal Spread', category: 'Bullish', color: '#7c3aed',
    description: 'strat_call_diagonal_desc',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 3, expOffset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 0, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'diagonal',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_diagonal',
  },
  {
    id: 'put_diagonal', name: 'Put Diagonal Spread', category: 'Bearish', color: '#c084fc',
    description: 'strat_put_diagonal_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -3, expOffset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: 0, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'diagonal',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_diagonal',
  },
  {
    id: 'double_calendar', name: 'Double Calendar', category: 'Neutral', color: '#6366f1',
    description: 'strat_double_calendar_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -2, expOffset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -2, expOffset: 2 },
      { type: 'call', action: 'sell', qty: 1, offset: 2, expOffset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 2, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'double_calendar',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_calendar',
  },
  {
    id: 'double_diagonal', name: 'Double Diagonal', category: 'Neutral', color: '#818cf8',
    description: 'strat_double_diagonal_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -3, expOffset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -5, expOffset: 2 },
      { type: 'call', action: 'sell', qty: 1, offset: 3, expOffset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 5, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'double_calendar',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_diagonal',
  },
  {
    id: 'jelly_roll', name: 'Jelly Roll', category: 'Neutral', color: '#a855f7',
    description: 'strat_jelly_roll_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0, expOffset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: 0, expOffset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 0, expOffset: 2 },
      { type: 'put', action: 'buy', qty: 1, offset: 0, expOffset: 2 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'box',
    maxProfit: 'strat_max_rate_differential', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_rates',
  },
  {
    id: 'pmcc', name: "Poor Man's Covered Call", category: 'Bullish', color: '#14b8a6',
    description: 'strat_pmcc_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -6, expOffset: 3 },
      { type: 'call', action: 'sell', qty: 1, offset: 3, expOffset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'diagonal',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_pmcc',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ESTRUCTURAS AVANZADAS (11)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'zebra', name: 'ZEBRA', category: 'Bullish', color: '#16a34a',
    description: 'strat_zebra_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 2, offset: -3 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'synthetic_long',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_zebra',
  },
  {
    id: 'risk_reversal', name: 'Risk Reversal', category: 'Bullish', color: '#65a30d',
    description: 'strat_risk_reversal_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -3 },
      { type: 'call', action: 'buy', qty: 1, offset: 3 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_ilimitado_07602bab', shape: 'long_combo',
    maxProfit: 'mock_ilimitado_07602bab', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_risk_reversal',
  },
  {
    id: 'seagull', name: 'Seagull Spread', category: 'Bullish', color: '#0d9488',
    description: 'strat_seagull_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: -4 },
      { type: 'call', action: 'buy', qty: 1, offset: 1 },
      { type: 'call', action: 'sell', qty: 1, offset: 5 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'jade_lizard',
    maxProfit: 'mock_difStrikesDebito_7047c6fd', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_seagull',
  },
  {
    id: 'big_lizard', name: 'Big Lizard', category: 'Neutral', color: '#eab308',
    description: 'strat_big_lizard_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 2 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'jade_lizard',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_no_upside_risk',
  },
  {
    id: 'reverse_jade_lizard', name: 'Reverse Jade Lizard', category: 'Neutral', color: '#f97316',
    description: 'strat_reverse_jade_desc',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: 1 },
      { type: 'put', action: 'sell', qty: 1, offset: -1 },
      { type: 'put', action: 'buy', qty: 1, offset: -4 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'jade_lizard',
    maxProfit: 'mock_creditoNeto_636ec39f', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'strat_when_no_downside_risk',
  },
  {
    id: 'long_call_condor', name: 'Long Call Condor', category: 'Neutral', color: '#0891b2',
    description: 'strat_long_call_condor_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -4 },
      { type: 'call', action: 'sell', qty: 1, offset: -1 },
      { type: 'call', action: 'sell', qty: 1, offset: 1 },
      { type: 'call', action: 'buy', qty: 1, offset: 4 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'iron_condor',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_range_debit',
  },
  {
    id: 'long_put_condor', name: 'Long Put Condor', category: 'Neutral', color: '#0284c7',
    description: 'strat_long_put_condor_desc',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 4 },
      { type: 'put', action: 'sell', qty: 1, offset: 1 },
      { type: 'put', action: 'sell', qty: 1, offset: -1 },
      { type: 'put', action: 'buy', qty: 1, offset: -4 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'iron_condor',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_range_debit',
  },
  {
    id: 'long_put_butterfly', name: 'Long Put Butterfly', category: 'Neutral', color: '#2563eb',
    description: 'strat_long_put_butterfly_desc',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 3 },
      { type: 'put', action: 'sell', qty: 2, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -3 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'butterfly',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_pin',
  },
  {
    id: 'put_broken_wing', name: 'Put Broken Wing Butterfly', category: 'Neutral', color: '#4f46e5',
    description: 'strat_put_bwb_desc',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: -1 },
      { type: 'put', action: 'sell', qty: 2, offset: -4 },
      { type: 'put', action: 'buy', qty: 1, offset: -8 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'broken_wing',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'strat_when_bwb',
  },
  {
    id: 'xmas_tree_call', name: 'Christmas Tree Butterfly (Call)', category: 'Neutral', color: '#059669',
    description: 'strat_xmas_call_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 3, offset: 3 },
      { type: 'call', action: 'buy', qty: 2, offset: 5 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'broken_wing',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_xmas',
  },
  {
    id: 'xmas_tree_put', name: 'Christmas Tree Butterfly (Put)', category: 'Neutral', color: '#047857',
    description: 'strat_xmas_put_desc',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 3, offset: -3 },
      { type: 'put', action: 'buy', qty: 2, offset: -5 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'broken_wing',
    maxProfit: 'strat_max_at_short_strike', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_xmas',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ESCALERAS (4)
  // Un spread al que se le añade una tercera pata vendida (o comprada) más
  // lejos. La versión vendida deja un extremo abierto: es el detalle que las
  // hace peligrosas y el motivo de que lleven su propio aviso de riesgo.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'bull_call_ladder', name: 'Bull Call Ladder', category: 'Bullish', color: '#15803d',
    description: 'strat_bull_call_ladder_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: -2 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 3 },
    ],
    risk: 'mock_ilimitado_07602bab', reward: 'mock_limitado_042e1180', shape: 'ladder',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_ilimitado_07602bab',
    whenToUse: 'strat_when_ladder_short',
  },
  {
    id: 'bear_call_ladder', name: 'Bear Call Ladder', category: 'Volatile', color: '#b91c1c',
    description: 'strat_bear_call_ladder_desc',
    legs: [
      { type: 'call', action: 'sell', qty: 1, offset: -2 },
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 3 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_ilimitado_07602bab', shape: 'ladder_long',
    maxProfit: 'mock_ilimitadoAlAlza_eb34ff8b', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'strat_when_ladder_long',
  },
  {
    id: 'bull_put_ladder', name: 'Bull Put Ladder', category: 'Volatile', color: '#be123c',
    description: 'strat_bull_put_ladder_desc',
    legs: [
      { type: 'put', action: 'sell', qty: 1, offset: 2 },
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: -3 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_alto_2c90bb36', shape: 'ladder_long',
    maxProfit: 'mock_altoMasSiBaja_de15ce82', maxLoss: 'mock_difStrikesCredito_5013370a',
    whenToUse: 'strat_when_ladder_long',
  },
  {
    id: 'bear_put_ladder', name: 'Bear Put Ladder', category: 'Bearish', color: '#9f1239',
    description: 'strat_bear_put_ladder_desc',
    legs: [
      { type: 'put', action: 'buy', qty: 1, offset: 2 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: -3 },
    ],
    risk: 'mock_alto_2c90bb36', reward: 'mock_limitado_042e1180', shape: 'ladder',
    maxProfit: 'strat_max_between_strikes', maxLoss: 'mock_strikePrima_e1d2b2aa',
    whenToUse: 'strat_when_ladder_short',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ARBITRAJE / PARIDAD (3)
  // Su P&L ES el tipo de interés. Con `r` hardcodeado al 5% estas tres daban
  // números sin sentido; ahora se valoran con el tipo real de `^IRX`.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'box_spread', name: 'Box Spread', category: 'Neutral', color: '#525252',
    description: 'strat_box_desc',
    legs: [
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 3 },
      { type: 'put', action: 'buy', qty: 1, offset: 3 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'box',
    maxProfit: 'strat_max_rate_differential', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_rates',
  },
  {
    id: 'conversion', name: 'Conversion', category: 'Neutral', color: '#737373',
    description: 'strat_conversion_desc',
    legs: [
      { type: 'stock', action: 'buy', qty: 100, offset: 0 },
      { type: 'call', action: 'sell', qty: 1, offset: 0 },
      { type: 'put', action: 'buy', qty: 1, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'box',
    maxProfit: 'strat_max_rate_differential', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_rates',
  },
  {
    id: 'reversal', name: 'Reversal', category: 'Neutral', color: '#a3a3a3',
    description: 'strat_reversal_desc',
    legs: [
      { type: 'stock', action: 'sell', qty: 100, offset: 0 },
      { type: 'call', action: 'buy', qty: 1, offset: 0 },
      { type: 'put', action: 'sell', qty: 1, offset: 0 },
    ],
    risk: 'mock_limitado_042e1180', reward: 'mock_limitado_042e1180', shape: 'box',
    maxProfit: 'strat_max_rate_differential', maxLoss: 'mock_debitoNeto_189d540d',
    whenToUse: 'strat_when_rates',
  },
];

/**
 * Estrategias cuyas patas NO comparten vencimiento.
 *
 * Se deriva de los datos en vez de mantenerse a mano: una estrategia con
 * `expOffset` distinto de cero necesita más de una cadena cargada, y quien
 * pinte un aviso o precargue vencimientos debe poder preguntarlo sin
 * reimplementar la comprobación.
 */
export const isMultiExpiryStrategy = (strategy) =>
  new Set((strategy?.legs || []).map((l) => l.expOffset || 0)).size > 1;

/** Slug estable para la ruta pública `/options/strategies/:slug`. */
export const strategySlug = (strategy) => String(strategy?.id || '').replace(/_/g, '-');

export const STRATEGY_CATEGORIES = ['Bullish', 'Bearish', 'Neutral', 'Volatile'];

// ─────────────────────────────────────────────────────────────
// EDUCATION CONTENT
// ─────────────────────────────────────────────────────────────
export const EDU_MODULES = [
  {
    icon: '◈', title: 'edu_fundamentosComprarVsVende_6227e3cc', color: '#22c55e',
    content: 'edu_todaOperacionConOpciones_4b806806',
    items: [
      'edu_longCallBuyCall_b69bddbc',
      'edu_longPutBuyPut_0125f4de',
      'edu_shortCallSellCall_46b9297a',
      'edu_shortPutSellPut_cc28336a',
      'edu_regla802080_db62e282',
    ],
  },
  {
    icon: 'Δ', title: 'edu_lasGriegas_0ebfaf86', color: '#3b82f6',
    content: 'edu_lasGriegasCuantificanLa_560a7bae',
    items: [
      'edu_deltaCambioEnPrima_0791393e',
      'edu_thetaPerdidaDeValor_c24fe104',
      'edu_vegaSensibilidadAlCambio_49f4d565',
      'edu_gammaVelocidadDeCambio_2647e1e9',
      'edu_rhoSensibilidadACambios_6dd807ab',
    ],
  },
  {
    icon: '⬡', title: 'edu_moneynessItmAtmOtm_a4a14296', color: '#eab308',
    content: 'edu_laMoneynessIndicaLa_d33c00c2',
    items: [
      'edu_call_094692fa',
      'edu_itmInTheMoney_d20317a8',
      'edu_atmAtTheMoney_638c9e7d',
      'edu_otmOutOfThe_2b67777e',
      'edu_put_a27fa8fc',
      'edu_itmInTheMoney_bfd445a5',
      'edu_atmAtTheMoney_793be97c',
      'edu_otmOutOfThe_71ddb79d',
      'edu_cLculoDelPayoff_2fb38b8e',
      'edu_longCallPnlMax_e997a851',
      'edu_longPutPnlMax_80f585a4',
      'edu_shortCallPnlPrima_d573157a',
      'edu_shortPutPnlPrima_47fd35c2',
    ],
  },
  {
    icon: '⌬', title: 'edu_volatilidadImplicitaIv_9566fdd4', color: '#ef4444',
    content: 'edu_laIvEsEl_8e2ceb1e',
    items: [
      'edu_ivRankIvPercentile_da54acc4',
      'edu_crushPostEarningsLa_c269719f',
      'edu_vegaLongVsShort_404de31c',
      'edu_reglaPracticaComprarOpcio_98a9dbf8',
      'edu_skewLasPutsOtm_02473640',
    ],
  },
  {
    icon: '📐', title: 'edu_comoLeerElDiagrama_0e91a1f2', color: '#a78bfa',
    content: 'edu_elGraficoDePayoff_4228af6d',
    items: [
      'edu_lineaVerdeCurrentP_ecfc0457',
      'edu_lineaBlancaPunteadaAt_8a5c4ef9',
      'edu_lineaNaranjaSpotPrecio_de21f24f',
      'edu_lineaVioletaBreakEven_9112e631',
      'edu_zonaVerdeRangoDe_49e82b2d',
      'edu_zonasDeMoneynessNuevas_d71f9261',
      'edu_laDiferenciaEntreAmbas_439232b3',
    ],
  },
];

export const GUIDE_ITEMS = [
  { t: 'gd_leerElGrafico_01e33326', d: 'gd_laLineaAzulMuestra_94ffef2a' },
  { t: 'gd_delta_2772f4ee', d: 'gd_sensibilidadPor1De_937b8b0f' },
  { t: 'gd_theta_466abd04', d: 'gd_decaimientoDiarioLosVende_98a6f4d5' },
  { t: 'gd_vega_f1e18b4a', d: 'gd_siIvSube1_c5b35b3e' },
  { t: 'gd_probBeneficioPop_819a0c8f', d: 'gd_probabilidadEstadisticaDe_afd82330' },
  { t: 'gd_riskReward_cc314889', d: 'gd_ratioDeMaxProfit_3ca6ffc1' },
];
