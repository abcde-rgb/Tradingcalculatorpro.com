// Knowledge base for the interactive "market type" cards in Education → Fundamentals.
// Content is authored in ENGLISH on purpose: the owner wants these Q&A blocks to rank
// as Google featured snippets in English and let Google auto-translate per locale
// (see docs/AUDITORIA_INTEGRAL_2026-08-01.md §4.D.1 and §4.G.2). The surrounding UI
// chrome is localized via i18n; the answer bodies stay English for SEO.
//
// Each entry:
//   howMeasured : one/two-sentence "how is it priced / measured" explainer
//   units       : the units traders quote it in
//   faqs        : [{ q, a }]  → rendered as accordion + candidate for FAQPage schema
//   example     : a short worked example
//   calcTab     : dashboard calculator tab id to deep-link (or null)
//   learnTopic  : Education deep-dive tab id to jump to (or null)
//   optionsLink : true → link to the /options page instead of a calculator
//   tv          : TradingView embed widget descriptor { name, config }

const dark = true; // config colorTheme is patched at render time; placeholder here.

const symbolOverview = (symbols) => ({
  name: 'symbol-overview',
  config: {
    symbols,
    chartOnly: false,
    width: '100%',
    height: '100%',
    locale: 'en',
    colorTheme: dark ? 'dark' : 'light',
    isTransparent: true,
    autosize: true,
    showVolume: false,
    showMA: false,
    fontColor: '#787b86',
    gridLineColor: 'rgba(120,123,134,0.12)',
    dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
  },
});

export const MARKET_TYPE_DETAILS = {
  forex: {
    howMeasured:
      'Forex prices are quoted as an exchange rate between two currencies (a pair). The first currency is the base, the second is the quote: EUR/USD = 1.0850 means 1 euro buys 1.0850 US dollars. It is the largest and most liquid market on earth.',
    units: 'Pips (0.0001, or 0.01 for JPY pairs) · Lots (standard 100,000 / mini 10,000 / micro 1,000 units) · Pip value',
    faqs: [
      { q: 'What is a pip in forex?', a: 'A pip is the smallest standard price move of a currency pair — 0.0001 for most pairs (the 4th decimal) and 0.01 for JPY pairs (the 2nd decimal). Pip value depends on lot size: on a standard lot (100,000 units) one pip is worth about $10 on USD-quoted pairs.' },
      { q: 'What is a lot in forex?', a: 'A lot is the trade size. A standard lot = 100,000 units of the base currency, a mini lot = 10,000, and a micro lot = 1,000. Position size and pip value scale with the lot: risk is controlled by combining lot size with a stop-loss in pips.' },
      { q: 'How does leverage work in forex?', a: 'Leverage lets you control a large position with a small margin deposit (e.g. 30:1 means $1,000 controls $30,000). It multiplies both gains and losses, so it must be paired with strict position sizing and a stop-loss.' },
    ],
    example: 'You buy 1 mini lot (10,000) of EUR/USD at 1.0850 and it rises to 1.0900 (+50 pips). At ~$1/pip for a mini lot, that is roughly +$50 before costs.',
    calcTab: 'lotsize',
    learnTopic: 'forex-deep',
    tv: {
      name: 'forex-cross-rates',
      config: {
        currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'],
        isTransparent: true, colorTheme: dark ? 'dark' : 'light',
        width: '100%', height: '100%', locale: 'en',
      },
    },
  },
  stocks: {
    howMeasured:
      'A stock is a share of ownership in a company. Its size is measured by market capitalization = share price × number of shares outstanding. Valuation is judged with ratios like P/E (price ÷ earnings per share), EPS, and revenue growth.',
    units: 'Shares · Market cap (large/mid/small) · P/E, EPS · Float',
    faqs: [
      { q: 'How is a company\'s market cap calculated?', a: 'Market capitalization = current share price × total shares outstanding. A $150 stock with 1 billion shares has a $150 billion market cap. It classifies companies into large-cap, mid-cap and small-cap.' },
      { q: 'What is the P/E ratio?', a: 'The price-to-earnings ratio = share price ÷ earnings per share (EPS). It shows how much investors pay for each $1 of annual profit. A high P/E implies high growth expectations; a low P/E can signal value or trouble.' },
      { q: 'What moves a stock price?', a: 'Earnings reports, guidance, sector rotation, interest rates, macro data and news flow. Around earnings, implied volatility rises and gaps are common.' },
    ],
    example: 'A company earns $5 EPS and trades at $100 → P/E = 20. If it has 500 million shares, its market cap is $50 billion.',
    calcTab: 'position',
    learnTopic: 'company-valuation',
    tv: {
      name: 'stock-heatmap',
      config: {
        dataSource: 'SPX500', blockSize: 'market_cap_basic', blockColor: 'change',
        grouping: 'sector', locale: 'en', symbolUrl: '',
        colorTheme: dark ? 'dark' : 'light', hasTopBar: false, isDataSetEnabled: false,
        isZoomEnabled: true, hasSymbolTooltip: true, width: '100%', height: '100%',
      },
    },
  },
  crypto: {
    howMeasured:
      'A cryptocurrency\'s size is measured by market capitalization = price × circulating supply. Bitcoin dominance (BTC market cap ÷ total crypto market cap) tracks how much of the market is in BTC. Crypto trades 24/7, all year.',
    units: 'Coins/tokens · Market cap · Circulating vs max supply · BTC dominance',
    faqs: [
      { q: 'What are the largest cryptocurrencies?', a: 'By market capitalization the largest cryptocurrencies are typically Bitcoin (BTC) and Ethereum (ETH), followed by large stablecoins and layer-1 tokens such as BNB, XRP and Solana. The live ranking by market cap is shown in the heatmap on this page.' },
      { q: 'How is crypto market cap calculated?', a: 'Market cap = current price × circulating supply (coins in active circulation). A coin at $2 with 1 billion coins circulating has a $2 billion market cap — a high unit price does not mean a high market cap.' },
      { q: 'What is Bitcoin halving?', a: 'Roughly every four years the block reward paid to Bitcoin miners is cut in half, slowing new supply. Historically halvings have preceded major shifts in the BTC price cycle.' },
    ],
    example: 'A token priced at $0.50 with 4 billion coins circulating has a $2 billion market cap — larger than a $50 token with only 30 million coins ($1.5 billion).',
    calcTab: 'position',
    learnTopic: 'crypto-deep',
    tv: {
      name: 'crypto-coins-heatmap',
      config: {
        dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: 'change',
        locale: 'en', symbolUrl: '', colorTheme: dark ? 'dark' : 'light',
        hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
        hasSymbolTooltip: true, width: '100%', height: '100%',
      },
    },
  },
  commodities: {
    howMeasured:
      'Commodities are raw materials priced per standardized contract or unit — a barrel of crude oil, a troy ounce of gold, MMBtu of natural gas. Most trade via futures with a defined tick size and contract multiplier.',
    units: 'Contracts · Tick / point value · Barrels, troy ounces, MMBtu, bushels',
    faqs: [
      { q: 'How is crude oil priced?', a: 'Crude oil is quoted per barrel in US dollars, with WTI and Brent as the two global benchmarks. A standard futures contract covers 1,000 barrels, so a $1 move equals $1,000 per contract.' },
      { q: 'What drives natural gas prices?', a: 'Weather (heating/cooling demand), storage/inventory reports (the EIA publishes weekly), production levels and exports. Natural gas is highly seasonal and one of the most volatile commodities.' },
      { q: 'Why is gold seen as a safe haven?', a: 'Gold holds value when currencies weaken or uncertainty rises. It is quoted per troy ounce in USD (XAU/USD) and often moves inversely to real yields and the dollar.' },
    ],
    example: 'WTI crude rises from $78 to $80 (+$2). On one futures contract of 1,000 barrels that is +$2,000 before costs.',
    calcTab: 'futures',
    learnTopic: 'commodities',
    tv: symbolOverview([['Gold', 'TVC:GOLD|12M'], ['WTI Oil', 'TVC:USOIL|12M'], ['NatGas', 'NYMEX:NG1!|12M'], ['Copper', 'COMEX:HG1!|12M']]),
  },
  indices: {
    howMeasured:
      'An index measures the aggregate value of a basket of stocks. Most (S&P 500, Nasdaq-100) are market-cap weighted, so bigger companies move them more; the Dow is price-weighted. You cannot buy an index directly — you trade its ETF, futures or CFD.',
    units: 'Index points · Point/tick value (via futures) · Weighting method',
    faqs: [
      { q: 'How is the S&P 500 calculated?', a: 'The S&P 500 is a market-capitalization-weighted index of 500 large US companies: each constituent\'s weight is proportional to its market cap, so Apple or Microsoft move it far more than a small member.' },
      { q: 'How do you trade an index?', a: 'Through an index ETF (e.g. SPY for the S&P 500), index futures (ES for the E-mini S&P), options, or a CFD. Each has different capital, leverage and tax characteristics.' },
      { q: 'What is the VIX?', a: 'The VIX is the "fear index" — it measures the market\'s expected 30-day volatility from S&P 500 option prices. It rises when markets fall sharply and fear spikes.' },
    ],
    example: 'The E-mini S&P 500 future (ES) has a $50 multiplier. A 10-point move = 10 × $50 = $500 per contract.',
    calcTab: 'futures',
    learnTopic: 'indices',
    tv: symbolOverview([['S&P 500', 'SP:SPX|12M'], ['Nasdaq 100', 'NASDAQ:NDX|12M'], ['Dow', 'DJ:DJI|12M'], ['DAX', 'XETR:DAX|12M']]),
  },
  etfs: {
    howMeasured:
      'An ETF (Exchange-Traded Fund) is a basket of assets that trades like a single stock. Its price tracks its Net Asset Value (NAV) — the value of everything it holds ÷ shares. It carries an annual expense ratio (management fee).',
    units: 'Shares · NAV · Expense ratio (%) · Premium/discount to NAV',
    faqs: [
      { q: 'What is an ETF?', a: 'An Exchange-Traded Fund holds a basket of assets (stocks, bonds, commodities) and trades on an exchange like a stock. It gives instant diversification — one SPY share exposes you to all 500 S&P companies.' },
      { q: 'What is an expense ratio?', a: 'The expense ratio is the annual fee the fund charges, expressed as a percentage of assets. A 0.03% ratio costs $3 per year per $10,000 invested — broad index ETFs are among the cheapest.' },
      { q: 'ETF vs index fund vs stock?', a: 'An ETF trades intraday like a stock; a traditional index fund prices once a day. Both can track the same index. A single stock is one company; an ETF is many, so it spreads risk.' },
    ],
    example: 'You buy SPY at $500 with a 0.09% expense ratio. On $10,000 invested the annual fee is about $9, and you own a slice of all 500 S&P companies.',
    calcTab: 'position',
    learnTopic: 'long-invest',
    tv: symbolOverview([['S&P 500 ETF', 'AMEX:SPY|12M'], ['Nasdaq ETF', 'NASDAQ:QQQ|12M'], ['Gold ETF', 'AMEX:GLD|12M'], ['Bonds ETF', 'NASDAQ:TLT|12M']]),
  },
  futures: {
    howMeasured:
      'A futures contract is a standardized agreement to buy/sell an asset at a set price on a future date. Each contract has a defined multiplier (point/tick value) and expiry, and is traded on margin.',
    units: 'Contracts · Tick size & tick value · Point multiplier · Expiry month',
    faqs: [
      { q: 'How does a futures contract work?', a: 'You post margin (a fraction of contract value) to control the full contract. Profit/loss = price move × the contract multiplier. Contracts expire, so positions must be closed or rolled to the next month.' },
      { q: 'What is tick value?', a: 'A tick is the minimum price increment; tick value is what one tick is worth. The E-mini S&P moves in 0.25 ticks worth $12.50 each ($50 per full point).' },
      { q: 'What is contango?', a: 'Contango is when futures further out cost more than the spot/near contract (common in storable commodities). Its opposite, backwardation, is when nearer contracts are pricier.' },
    ],
    example: 'Crude oil (CL) has a 1,000-barrel multiplier. A $0.50 move = $500 per contract. Margin may be only a few thousand dollars — high leverage.',
    calcTab: 'futures',
    learnTopic: 'margin-liq',
    tv: symbolOverview([['E-mini S&P', 'CME_MINI:ES1!|12M'], ['Crude Oil', 'NYMEX:CL1!|12M'], ['Gold', 'COMEX:GC1!|12M'], ['Nasdaq', 'CME_MINI:NQ1!|12M']]),
  },
  bonds: {
    howMeasured:
      'A bond is a loan to a government or company that pays interest (the coupon). Its price and its yield move inversely: when the price rises the yield falls. Duration measures sensitivity to interest-rate changes.',
    units: 'Face/par value · Coupon (%) · Yield (%) · Duration (years)',
    faqs: [
      { q: 'Why do bond prices and yields move inversely?', a: 'A bond pays a fixed coupon. If market rates rise, new bonds pay more, so existing lower-coupon bonds must fall in price until their effective yield matches — hence price down, yield up, and vice versa.' },
      { q: 'What is the yield curve?', a: 'The yield curve plots yields across maturities (e.g. 2-year to 30-year). A normal curve slopes up; an inverted curve (short yields above long) has historically preceded recessions.' },
      { q: 'What is duration?', a: 'Duration estimates how much a bond\'s price changes for a 1% move in rates. A duration of 7 means roughly a 7% price drop if rates rise 1% — longer bonds are more rate-sensitive.' },
    ],
    example: 'A 10-year bond with a 4% coupon and duration of ~8 loses about 8% of its price if yields jump from 4% to 5%.',
    calcTab: null,
    learnTopic: 'macro',
    tv: symbolOverview([['US 10Y', 'TVC:US10Y|12M'], ['US 02Y', 'TVC:US02Y|12M'], ['US 30Y', 'TVC:US30Y|12M'], ['Germany 10Y', 'TVC:DE10Y|12M']]),
  },
  options: {
    howMeasured:
      'An option is a contract giving the right (not obligation) to buy (call) or sell (put) an asset at a strike price before expiry. Its price (premium) is driven by the strike vs spot, time to expiry, and implied volatility, summarized by the Greeks.',
    units: 'Contracts (×100 shares) · Premium · Strike · Implied volatility (IV) · Greeks (delta, gamma, theta, vega)',
    faqs: [
      { q: 'What is an option premium?', a: 'The premium is the price you pay (or receive) for the option. It has intrinsic value (how far in-the-money it is) plus time value, which decays as expiry approaches (theta) and grows with implied volatility (vega).' },
      { q: 'What are the option Greeks?', a: 'Delta = sensitivity to the underlying price; gamma = how delta changes; theta = time decay per day; vega = sensitivity to implied volatility. Together they describe an option\'s risk.' },
      { q: 'What is implied volatility (IV)?', a: 'IV is the market\'s expected future volatility priced into the option. Higher IV means richer premiums. IV Rank shows where current IV sits versus its own past year.' },
    ],
    example: 'You buy a $100 call for $3 premium (=$300 per contract). At expiry with the stock at $110 the call is worth $10 ($1,000) — a $700 gain before costs.',
    calcTab: null,
    learnTopic: null,
    optionsLink: true,
    tv: symbolOverview([['Apple', 'NASDAQ:AAPL|12M'], ['S&P 500', 'SP:SPX|12M'], ['Tesla', 'NASDAQ:TSLA|12M'], ['Nvidia', 'NASDAQ:NVDA|12M']]),
  },
  cfds: {
    howMeasured:
      'A CFD (Contract for Difference) is a leveraged agreement to exchange the difference in an asset\'s price between open and close — you never own the underlying. It mirrors the underlying\'s price and charges an overnight financing (swap) fee.',
    units: 'Contracts/units · Leverage · Spread · Overnight swap/financing',
    faqs: [
      { q: 'What is a CFD?', a: 'A Contract for Difference lets you speculate on an asset\'s price (stocks, indices, forex, commodities) with leverage and without owning it. You profit or lose the price difference, long or short.' },
      { q: 'What is the overnight swap fee?', a: 'Because CFDs are leveraged (borrowed) positions, brokers charge a daily financing/swap fee to hold them overnight. It makes CFDs better suited to short-term trades than long-term holding.' },
      { q: 'CFD vs future vs owning the asset?', a: 'A CFD has no expiry but pays swap fees; a future has an expiry and a multiplier; owning the asset (share/coin) has no leverage or financing but ties up full capital. CFDs are restricted or banned for retail in some countries.' },
    ],
    example: 'You open a CFD on 100 shares at $50 with 5:1 leverage: exposure $5,000 but margin only $1,000. A move to $52 (+$2) yields +$200 — before spread and overnight swap.',
    calcTab: 'leverage',
    learnTopic: 'margin-liq',
    tv: symbolOverview([['EUR/USD', 'FX:EURUSD|12M'], ['S&P 500', 'SP:SPX|12M'], ['Gold', 'TVC:GOLD|12M'], ['Apple', 'NASDAQ:AAPL|12M']]),
  },
};

export default MARKET_TYPE_DETAILS;
