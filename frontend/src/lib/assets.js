// Sistema de activos - Trading Calculator PRO
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Categorías de activos
export const ASSET_CATEGORIES = {
  crypto: {
    id: 'crypto',
    name: 'Criptomonedas',
    icon: 'Bitcoin',
    color: 'text-orange-500'
  },
  forex: {
    id: 'forex',
    name: 'Forex',
    icon: 'DollarSign',
    color: 'text-green-500'
  },
  stocks: {
    id: 'stocks',
    name: 'Acciones',
    icon: 'TrendingUp',
    color: 'text-blue-500'
  },
  indices: {
    id: 'indices',
    name: 'Índices',
    icon: 'BarChart3',
    color: 'text-purple-500'
  },
  commodities: {
    id: 'commodities',
    name: 'Materias Primas',
    icon: 'Gem',
    color: 'text-yellow-500'
  },
  futures: {
    id: 'futures',
    name: 'Futuros',
    icon: 'Calendar',
    color: 'text-red-500'
  }
};

// Todos los activos disponibles
export const ALL_ASSETS = {
  // Crypto
  BTC: { symbol: 'BTC', name: 'Bitcoin', category: 'crypto', pair: 'BTCUSDT', coingeckoId: 'bitcoin', tradingviewSymbol: 'BINANCE:BTCUSDT' },
  ETH: { symbol: 'ETH', name: 'Ethereum', category: 'crypto', pair: 'ETHUSDT', coingeckoId: 'ethereum', tradingviewSymbol: 'BINANCE:ETHUSDT' },
  SOL: { symbol: 'SOL', name: 'Solana', category: 'crypto', pair: 'SOLUSDT', coingeckoId: 'solana', tradingviewSymbol: 'BINANCE:SOLUSDT' },
  BNB: { symbol: 'BNB', name: 'BNB', category: 'crypto', pair: 'BNBUSDT', coingeckoId: 'binancecoin', tradingviewSymbol: 'BINANCE:BNBUSDT' },
  XRP: { symbol: 'XRP', name: 'Ripple', category: 'crypto', pair: 'XRPUSDT', coingeckoId: 'ripple', tradingviewSymbol: 'BINANCE:XRPUSDT' },
  ADA: { symbol: 'ADA', name: 'Cardano', category: 'crypto', pair: 'ADAUSDT', coingeckoId: 'cardano', tradingviewSymbol: 'BINANCE:ADAUSDT' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', category: 'crypto', pair: 'DOGEUSDT', coingeckoId: 'dogecoin', tradingviewSymbol: 'BINANCE:DOGEUSDT' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', category: 'crypto', pair: 'AVAXUSDT', coingeckoId: 'avalanche-2', tradingviewSymbol: 'BINANCE:AVAXUSDT' },
  DOT: { symbol: 'DOT', name: 'Polkadot', category: 'crypto', pair: 'DOTUSDT', coingeckoId: 'polkadot', tradingviewSymbol: 'BINANCE:DOTUSDT' },
  LINK: { symbol: 'LINK', name: 'Chainlink', category: 'crypto', pair: 'LINKUSDT', coingeckoId: 'chainlink', tradingviewSymbol: 'BINANCE:LINKUSDT' },
  LTC: { symbol: 'LTC', name: 'Litecoin', category: 'crypto', pair: 'LTCUSDT', coingeckoId: 'litecoin', tradingviewSymbol: 'BINANCE:LTCUSDT' },
  POL: { symbol: 'POL', name: 'Polygon (POL)', category: 'crypto', pair: 'POLUSDT', coingeckoId: 'polygon-ecosystem-token', tradingviewSymbol: 'BINANCE:POLUSDT' },
  TRX: { symbol: 'TRX', name: 'TRON', category: 'crypto', pair: 'TRXUSDT', coingeckoId: 'tron', tradingviewSymbol: 'BINANCE:TRXUSDT' },
  ATOM: { symbol: 'ATOM', name: 'Cosmos', category: 'crypto', pair: 'ATOMUSDT', coingeckoId: 'cosmos', tradingviewSymbol: 'BINANCE:ATOMUSDT' },
  NEAR: { symbol: 'NEAR', name: 'NEAR Protocol', category: 'crypto', pair: 'NEARUSDT', coingeckoId: 'near', tradingviewSymbol: 'BINANCE:NEARUSDT' },
  APT: { symbol: 'APT', name: 'Aptos', category: 'crypto', pair: 'APTUSDT', coingeckoId: 'aptos', tradingviewSymbol: 'BINANCE:APTUSDT' },
  ARB: { symbol: 'ARB', name: 'Arbitrum', category: 'crypto', pair: 'ARBUSDT', coingeckoId: 'arbitrum', tradingviewSymbol: 'BINANCE:ARBUSDT' },
  OP: { symbol: 'OP', name: 'Optimism', category: 'crypto', pair: 'OPUSDT', coingeckoId: 'optimism', tradingviewSymbol: 'BINANCE:OPUSDT' },
  INJ: { symbol: 'INJ', name: 'Injective', category: 'crypto', pair: 'INJUSDT', coingeckoId: 'injective-protocol', tradingviewSymbol: 'BINANCE:INJUSDT' },
  SUI: { symbol: 'SUI', name: 'Sui', category: 'crypto', pair: 'SUIUSDT', coingeckoId: 'sui', tradingviewSymbol: 'BINANCE:SUIUSDT' },
  TIA: { symbol: 'TIA', name: 'Celestia', category: 'crypto', pair: 'TIAUSDT', coingeckoId: 'celestia', tradingviewSymbol: 'BINANCE:TIAUSDT' },
  SHIB: { symbol: 'SHIB', name: 'Shiba Inu', category: 'crypto', pair: 'SHIBUSDT', coingeckoId: 'shiba-inu', tradingviewSymbol: 'BINANCE:SHIBUSDT' },
  PEPE: { symbol: 'PEPE', name: 'Pepe', category: 'crypto', pair: 'PEPEUSDT', coingeckoId: 'pepe', tradingviewSymbol: 'BINANCE:PEPEUSDT' },
  TON: { symbol: 'TON', name: 'Toncoin', category: 'crypto', pair: 'TONUSDT', coingeckoId: 'the-open-network', tradingviewSymbol: 'BINANCE:TONUSDT' },
  UNI: { symbol: 'UNI', name: 'Uniswap', category: 'crypto', pair: 'UNIUSDT', coingeckoId: 'uniswap', tradingviewSymbol: 'BINANCE:UNIUSDT' },
  XLM: { symbol: 'XLM', name: 'Stellar', category: 'crypto', pair: 'XLMUSDT', coingeckoId: 'stellar', tradingviewSymbol: 'BINANCE:XLMUSDT' },
  ETC: { symbol: 'ETC', name: 'Ethereum Classic', category: 'crypto', pair: 'ETCUSDT', coingeckoId: 'ethereum-classic', tradingviewSymbol: 'BINANCE:ETCUSDT' },
  BCH: { symbol: 'BCH', name: 'Bitcoin Cash', category: 'crypto', pair: 'BCHUSDT', coingeckoId: 'bitcoin-cash', tradingviewSymbol: 'BINANCE:BCHUSDT' },
  FIL: { symbol: 'FIL', name: 'Filecoin', category: 'crypto', pair: 'FILUSDT', coingeckoId: 'filecoin', tradingviewSymbol: 'BINANCE:FILUSDT' },
  ALGO: { symbol: 'ALGO', name: 'Algorand', category: 'crypto', pair: 'ALGOUSDT', coingeckoId: 'algorand', tradingviewSymbol: 'BINANCE:ALGOUSDT' },
  VET: { symbol: 'VET', name: 'VeChain', category: 'crypto', pair: 'VETUSDT', coingeckoId: 'vechain', tradingviewSymbol: 'BINANCE:VETUSDT' },
  HBAR: { symbol: 'HBAR', name: 'Hedera', category: 'crypto', pair: 'HBARUSDT', coingeckoId: 'hedera-hashgraph', tradingviewSymbol: 'BINANCE:HBARUSDT' },
  AAVE: { symbol: 'AAVE', name: 'Aave', category: 'crypto', pair: 'AAVEUSDT', coingeckoId: 'aave', tradingviewSymbol: 'BINANCE:AAVEUSDT' },
  MKR: { symbol: 'MKR', name: 'Maker', category: 'crypto', pair: 'MKRUSDT', coingeckoId: 'maker', tradingviewSymbol: 'BINANCE:MKRUSDT' },
  SAND: { symbol: 'SAND', name: 'The Sandbox', category: 'crypto', pair: 'SANDUSDT', coingeckoId: 'the-sandbox', tradingviewSymbol: 'BINANCE:SANDUSDT' },
  MANA: { symbol: 'MANA', name: 'Decentraland', category: 'crypto', pair: 'MANAUSDT', coingeckoId: 'decentraland', tradingviewSymbol: 'BINANCE:MANAUSDT' },
  XTZ: { symbol: 'XTZ', name: 'Tezos', category: 'crypto', pair: 'XTZUSDT', coingeckoId: 'tezos', tradingviewSymbol: 'BINANCE:XTZUSDT' },
  CAKE: { symbol: 'CAKE', name: 'PancakeSwap', category: 'crypto', pair: 'CAKEUSDT', coingeckoId: 'pancakeswap-token', tradingviewSymbol: 'BINANCE:CAKEUSDT' },
  THETA: { symbol: 'THETA', name: 'Theta', category: 'crypto', pair: 'THETAUSDT', coingeckoId: 'theta-token', tradingviewSymbol: 'BINANCE:THETAUSDT' },
  AXS: { symbol: 'AXS', name: 'Axie Infinity', category: 'crypto', pair: 'AXSUSDT', coingeckoId: 'axie-infinity', tradingviewSymbol: 'BINANCE:AXSUSDT' },
  ICP: { symbol: 'ICP', name: 'Internet Computer', category: 'crypto', pair: 'ICPUSDT', coingeckoId: 'internet-computer', tradingviewSymbol: 'BINANCE:ICPUSDT' },
  GRT: { symbol: 'GRT', name: 'The Graph', category: 'crypto', pair: 'GRTUSDT', coingeckoId: 'the-graph', tradingviewSymbol: 'BINANCE:GRTUSDT' },
  IMX: { symbol: 'IMX', name: 'Immutable', category: 'crypto', pair: 'IMXUSDT', coingeckoId: 'immutable-x', tradingviewSymbol: 'BINANCE:IMXUSDT' },
  RENDER: { symbol: 'RENDER', name: 'Render', category: 'crypto', pair: 'RENDERUSDT', coingeckoId: 'render-token', tradingviewSymbol: 'BINANCE:RENDERUSDT' },
  FET: { symbol: 'FET', name: 'Fetch.ai', category: 'crypto', pair: 'FETUSDT', coingeckoId: 'fetch-ai', tradingviewSymbol: 'BINANCE:FETUSDT' },
  STX: { symbol: 'STX', name: 'Stacks', category: 'crypto', pair: 'STXUSDT', coingeckoId: 'blockstack', tradingviewSymbol: 'BINANCE:STXUSDT' },
  TAO: { symbol: 'TAO', name: 'Bittensor', category: 'crypto', pair: 'TAOUSDT', coingeckoId: 'bittensor', tradingviewSymbol: 'BINANCE:TAOUSDT' },
  WIF: { symbol: 'WIF', name: 'dogwifhat', category: 'crypto', pair: 'WIFUSDT', coingeckoId: 'dogwifcoin', tradingviewSymbol: 'BINANCE:WIFUSDT' },
  BONK: { symbol: 'BONK', name: 'Bonk', category: 'crypto', pair: 'BONKUSDT', coingeckoId: 'bonk', tradingviewSymbol: 'BINANCE:BONKUSDT' },
  FLOKI: { symbol: 'FLOKI', name: 'Floki', category: 'crypto', pair: 'FLOKIUSDT', coingeckoId: 'floki', tradingviewSymbol: 'BINANCE:FLOKIUSDT' },
  JUP: { symbol: 'JUP', name: 'Jupiter', category: 'crypto', pair: 'JUPUSDT', coingeckoId: 'jupiter-exchange-solana', tradingviewSymbol: 'BINANCE:JUPUSDT' },
  PYTH: { symbol: 'PYTH', name: 'Pyth Network', category: 'crypto', pair: 'PYTHUSDT', coingeckoId: 'pyth-network', tradingviewSymbol: 'BINANCE:PYTHUSDT' },
  SEI: { symbol: 'SEI', name: 'Sei', category: 'crypto', pair: 'SEIUSDT', coingeckoId: 'sei-network', tradingviewSymbol: 'BINANCE:SEIUSDT' },
  ENA: { symbol: 'ENA', name: 'Ethena', category: 'crypto', pair: 'ENAUSDT', coingeckoId: 'ethena', tradingviewSymbol: 'BINANCE:ENAUSDT' },
  WLD: { symbol: 'WLD', name: 'Worldcoin', category: 'crypto', pair: 'WLDUSDT', coingeckoId: 'worldcoin-wld', tradingviewSymbol: 'BINANCE:WLDUSDT' },
  LDO: { symbol: 'LDO', name: 'Lido DAO', category: 'crypto', pair: 'LDOUSDT', coingeckoId: 'lido-dao', tradingviewSymbol: 'BINANCE:LDOUSDT' },
  CRV: { symbol: 'CRV', name: 'Curve', category: 'crypto', pair: 'CRVUSDT', coingeckoId: 'curve-dao-token', tradingviewSymbol: 'BINANCE:CRVUSDT' },
  GALA: { symbol: 'GALA', name: 'Gala', category: 'crypto', pair: 'GALAUSDT', coingeckoId: 'gala', tradingviewSymbol: 'BINANCE:GALAUSDT' },
  FLOW: { symbol: 'FLOW', name: 'Flow', category: 'crypto', pair: 'FLOWUSDT', coingeckoId: 'flow', tradingviewSymbol: 'BINANCE:FLOWUSDT' },
  CHZ: { symbol: 'CHZ', name: 'Chiliz', category: 'crypto', pair: 'CHZUSDT', coingeckoId: 'chiliz', tradingviewSymbol: 'BINANCE:CHZUSDT' },
  IOTA: { symbol: 'IOTA', name: 'IOTA', category: 'crypto', pair: 'IOTAUSDT', coingeckoId: 'iota', tradingviewSymbol: 'BINANCE:IOTAUSDT' },
  
  // Forex
  EURUSD: { symbol: 'EURUSD', name: 'Euro/Dólar', category: 'forex', pair: 'EUR/USD', tradingviewSymbol: 'FX:EURUSD', pipValue: 0.0001 },
  GBPUSD: { symbol: 'GBPUSD', name: 'Libra/Dólar', category: 'forex', pair: 'GBP/USD', tradingviewSymbol: 'FX:GBPUSD', pipValue: 0.0001 },
  USDJPY: { symbol: 'USDJPY', name: 'Dólar/Yen', category: 'forex', pair: 'USD/JPY', tradingviewSymbol: 'FX:USDJPY', pipValue: 0.01 },
  USDCHF: { symbol: 'USDCHF', name: 'Dólar/Franco', category: 'forex', pair: 'USD/CHF', tradingviewSymbol: 'FX:USDCHF', pipValue: 0.0001 },
  AUDUSD: { symbol: 'AUDUSD', name: 'Aussie/Dólar', category: 'forex', pair: 'AUD/USD', tradingviewSymbol: 'FX:AUDUSD', pipValue: 0.0001 },
  USDCAD: { symbol: 'USDCAD', name: 'Dólar/CAD', category: 'forex', pair: 'USD/CAD', tradingviewSymbol: 'FX:USDCAD', pipValue: 0.0001 },
  NZDUSD: { symbol: 'NZDUSD', name: 'NZD/Dólar', category: 'forex', pair: 'NZD/USD', tradingviewSymbol: 'FX:NZDUSD', pipValue: 0.0001 },
  EURGBP: { symbol: 'EURGBP', name: 'Euro/Libra', category: 'forex', pair: 'EUR/GBP', tradingviewSymbol: 'FX:EURGBP', pipValue: 0.0001 },
  EURJPY: { symbol: 'EURJPY', name: 'Euro/Yen', category: 'forex', pair: 'EUR/JPY', tradingviewSymbol: 'FX:EURJPY', pipValue: 0.01 },
  GBPJPY: { symbol: 'GBPJPY', name: 'Libra/Yen', category: 'forex', pair: 'GBP/JPY', tradingviewSymbol: 'FX:GBPJPY', pipValue: 0.01 },
  EURAUD: { symbol: 'EURAUD', name: 'Euro/Aussie', category: 'forex', pair: 'EUR/AUD', tradingviewSymbol: 'FX:EURAUD', pipValue: 0.0001 },
  EURCHF: { symbol: 'EURCHF', name: 'Euro/Franco', category: 'forex', pair: 'EUR/CHF', tradingviewSymbol: 'FX:EURCHF', pipValue: 0.0001 },
  EURCAD: { symbol: 'EURCAD', name: 'Euro/CAD', category: 'forex', pair: 'EUR/CAD', tradingviewSymbol: 'FX:EURCAD', pipValue: 0.0001 },
  GBPCHF: { symbol: 'GBPCHF', name: 'Libra/Franco', category: 'forex', pair: 'GBP/CHF', tradingviewSymbol: 'FX:GBPCHF', pipValue: 0.0001 },
  GBPAUD: { symbol: 'GBPAUD', name: 'Libra/Aussie', category: 'forex', pair: 'GBP/AUD', tradingviewSymbol: 'FX:GBPAUD', pipValue: 0.0001 },
  GBPCAD: { symbol: 'GBPCAD', name: 'Libra/CAD', category: 'forex', pair: 'GBP/CAD', tradingviewSymbol: 'FX:GBPCAD', pipValue: 0.0001 },
  AUDNZD: { symbol: 'AUDNZD', name: 'Aussie/NZD', category: 'forex', pair: 'AUD/NZD', tradingviewSymbol: 'FX:AUDNZD', pipValue: 0.0001 },
  AUDCAD: { symbol: 'AUDCAD', name: 'Aussie/CAD', category: 'forex', pair: 'AUD/CAD', tradingviewSymbol: 'FX:AUDCAD', pipValue: 0.0001 },
  AUDJPY: { symbol: 'AUDJPY', name: 'Aussie/Yen', category: 'forex', pair: 'AUD/JPY', tradingviewSymbol: 'FX:AUDJPY', pipValue: 0.01 },
  CADJPY: { symbol: 'CADJPY', name: 'CAD/Yen', category: 'forex', pair: 'CAD/JPY', tradingviewSymbol: 'FX:CADJPY', pipValue: 0.01 },
  CHFJPY: { symbol: 'CHFJPY', name: 'Franco/Yen', category: 'forex', pair: 'CHF/JPY', tradingviewSymbol: 'FX:CHFJPY', pipValue: 0.01 },
  NZDJPY: { symbol: 'NZDJPY', name: 'NZD/Yen', category: 'forex', pair: 'NZD/JPY', tradingviewSymbol: 'FX:NZDJPY', pipValue: 0.01 },
  USDMXN: { symbol: 'USDMXN', name: 'Dólar/Peso MX', category: 'forex', pair: 'USD/MXN', tradingviewSymbol: 'FX:USDMXN', pipValue: 0.0001 },
  USDZAR: { symbol: 'USDZAR', name: 'Dólar/Rand', category: 'forex', pair: 'USD/ZAR', tradingviewSymbol: 'FX:USDZAR', pipValue: 0.0001 },
  USDTRY: { symbol: 'USDTRY', name: 'Dólar/Lira', category: 'forex', pair: 'USD/TRY', tradingviewSymbol: 'FX:USDTRY', pipValue: 0.0001 },
  USDSEK: { symbol: 'USDSEK', name: 'Dólar/Corona SEK', category: 'forex', pair: 'USD/SEK', tradingviewSymbol: 'FX:USDSEK', pipValue: 0.0001 },
  USDNOK: { symbol: 'USDNOK', name: 'Dólar/Corona NOK', category: 'forex', pair: 'USD/NOK', tradingviewSymbol: 'FX:USDNOK', pipValue: 0.0001 },
  USDSGD: { symbol: 'USDSGD', name: 'Dólar/SGD', category: 'forex', pair: 'USD/SGD', tradingviewSymbol: 'FX:USDSGD', pipValue: 0.0001 },
  USDPLN: { symbol: 'USDPLN', name: 'Dólar/Zloty', category: 'forex', pair: 'USD/PLN', tradingviewSymbol: 'FX:USDPLN', pipValue: 0.0001 },
  
  // Stocks
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', category: 'stocks', tradingviewSymbol: 'NASDAQ:AAPL' },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'stocks', tradingviewSymbol: 'NASDAQ:GOOGL' },
  MSFT: { symbol: 'MSFT', name: 'Microsoft', category: 'stocks', tradingviewSymbol: 'NASDAQ:MSFT' },
  AMZN: { symbol: 'AMZN', name: 'Amazon', category: 'stocks', tradingviewSymbol: 'NASDAQ:AMZN' },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', category: 'stocks', tradingviewSymbol: 'NASDAQ:TSLA' },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA', category: 'stocks', tradingviewSymbol: 'NASDAQ:NVDA' },
  META: { symbol: 'META', name: 'Meta Platforms', category: 'stocks', tradingviewSymbol: 'NASDAQ:META' },
  JPM: { symbol: 'JPM', name: 'JPMorgan Chase', category: 'stocks', tradingviewSymbol: 'NYSE:JPM' },
  AMD: { symbol: 'AMD', name: 'AMD', category: 'stocks', tradingviewSymbol: 'NASDAQ:AMD' },
  NFLX: { symbol: 'NFLX', name: 'Netflix', category: 'stocks', tradingviewSymbol: 'NASDAQ:NFLX' },
  INTC: { symbol: 'INTC', name: 'Intel', category: 'stocks', tradingviewSymbol: 'NASDAQ:INTC' },
  AVGO: { symbol: 'AVGO', name: 'Broadcom', category: 'stocks', tradingviewSymbol: 'NASDAQ:AVGO' },
  QCOM: { symbol: 'QCOM', name: 'Qualcomm', category: 'stocks', tradingviewSymbol: 'NASDAQ:QCOM' },
  MU: { symbol: 'MU', name: 'Micron', category: 'stocks', tradingviewSymbol: 'NASDAQ:MU' },
  SMCI: { symbol: 'SMCI', name: 'Super Micro', category: 'stocks', tradingviewSymbol: 'NASDAQ:SMCI' },
  ARM: { symbol: 'ARM', name: 'Arm Holdings', category: 'stocks', tradingviewSymbol: 'NASDAQ:ARM' },
  PLTR: { symbol: 'PLTR', name: 'Palantir', category: 'stocks', tradingviewSymbol: 'NASDAQ:PLTR' },
  COIN: { symbol: 'COIN', name: 'Coinbase', category: 'stocks', tradingviewSymbol: 'NASDAQ:COIN' },
  MSTR: { symbol: 'MSTR', name: 'MicroStrategy', category: 'stocks', tradingviewSymbol: 'NASDAQ:MSTR' },
  UBER: { symbol: 'UBER', name: 'Uber', category: 'stocks', tradingviewSymbol: 'NYSE:UBER' },
  SHOP: { symbol: 'SHOP', name: 'Shopify', category: 'stocks', tradingviewSymbol: 'NYSE:SHOP' },
  BABA: { symbol: 'BABA', name: 'Alibaba', category: 'stocks', tradingviewSymbol: 'NYSE:BABA' },
  TSM: { symbol: 'TSM', name: 'TSMC', category: 'stocks', tradingviewSymbol: 'NYSE:TSM' },
  ASML: { symbol: 'ASML', name: 'ASML', category: 'stocks', tradingviewSymbol: 'NASDAQ:ASML' },
  V: { symbol: 'V', name: 'Visa', category: 'stocks', tradingviewSymbol: 'NYSE:V' },
  MA: { symbol: 'MA', name: 'Mastercard', category: 'stocks', tradingviewSymbol: 'NYSE:MA' },
  WMT: { symbol: 'WMT', name: 'Walmart', category: 'stocks', tradingviewSymbol: 'NYSE:WMT' },
  KO: { symbol: 'KO', name: 'Coca-Cola', category: 'stocks', tradingviewSymbol: 'NYSE:KO' },
  PEP: { symbol: 'PEP', name: 'PepsiCo', category: 'stocks', tradingviewSymbol: 'NASDAQ:PEP' },
  DIS: { symbol: 'DIS', name: 'Disney', category: 'stocks', tradingviewSymbol: 'NYSE:DIS' },
  BA: { symbol: 'BA', name: 'Boeing', category: 'stocks', tradingviewSymbol: 'NYSE:BA' },
  XOM: { symbol: 'XOM', name: 'ExxonMobil', category: 'stocks', tradingviewSymbol: 'NYSE:XOM' },
  SAN: { symbol: 'SAN', name: 'Banco Santander', category: 'stocks', tradingviewSymbol: 'BME:SAN' },
  BBVA: { symbol: 'BBVA', name: 'BBVA', category: 'stocks', tradingviewSymbol: 'BME:BBVA' },
  ITX: { symbol: 'ITX', name: 'Inditex', category: 'stocks', tradingviewSymbol: 'BME:ITX' },
  IBE: { symbol: 'IBE', name: 'Iberdrola', category: 'stocks', tradingviewSymbol: 'BME:IBE' },
  TEF: { symbol: 'TEF', name: 'Telefónica', category: 'stocks', tradingviewSymbol: 'BME:TEF' },
  REP: { symbol: 'REP', name: 'Repsol', category: 'stocks', tradingviewSymbol: 'BME:REP' },
  CABK: { symbol: 'CABK', name: 'CaixaBank', category: 'stocks', tradingviewSymbol: 'BME:CABK' },
  AENA: { symbol: 'AENA', name: 'Aena', category: 'stocks', tradingviewSymbol: 'BME:AENA' },
  AIR: { symbol: 'AIR', name: 'Airbus', category: 'stocks', tradingviewSymbol: 'EURONEXT:AIR' },
  MC: { symbol: 'MC', name: 'LVMH', category: 'stocks', tradingviewSymbol: 'EURONEXT:MC' },
  OR: { symbol: 'OR', name: 'L\'Oréal', category: 'stocks', tradingviewSymbol: 'EURONEXT:OR' },
  BNP: { symbol: 'BNP', name: 'BNP Paribas', category: 'stocks', tradingviewSymbol: 'EURONEXT:BNP' },
  TTE: { symbol: 'TTE', name: 'TotalEnergies', category: 'stocks', tradingviewSymbol: 'EURONEXT:TTE' },
  SIE: { symbol: 'SIE', name: 'Siemens', category: 'stocks', tradingviewSymbol: 'XETR:SIE' },
  BMW: { symbol: 'BMW', name: 'BMW', category: 'stocks', tradingviewSymbol: 'XETR:BMW' },
  VOW3: { symbol: 'VOW3', name: 'Volkswagen', category: 'stocks', tradingviewSymbol: 'XETR:VOW3' },
  ALV: { symbol: 'ALV', name: 'Allianz', category: 'stocks', tradingviewSymbol: 'XETR:ALV' },
  DTE: { symbol: 'DTE', name: 'Deutsche Telekom', category: 'stocks', tradingviewSymbol: 'XETR:DTE' },
  ADS: { symbol: 'ADS', name: 'Adidas', category: 'stocks', tradingviewSymbol: 'XETR:ADS' },
  SAP: { symbol: 'SAP', name: 'SAP', category: 'stocks', tradingviewSymbol: 'XETR:SAP' },
  ENI: { symbol: 'ENI', name: 'Eni', category: 'stocks', tradingviewSymbol: 'MIL:ENI' },
  ISP: { symbol: 'ISP', name: 'Intesa Sanpaolo', category: 'stocks', tradingviewSymbol: 'MIL:ISP' },
  UCG: { symbol: 'UCG', name: 'UniCredit', category: 'stocks', tradingviewSymbol: 'MIL:UCG' },
  ENEL: { symbol: 'ENEL', name: 'Enel', category: 'stocks', tradingviewSymbol: 'MIL:ENEL' },
  NESN: { symbol: 'NESN', name: 'Nestlé', category: 'stocks', tradingviewSymbol: 'SIX:NESN' },
  NOVN: { symbol: 'NOVN', name: 'Novartis', category: 'stocks', tradingviewSymbol: 'SIX:NOVN' },
  ROG: { symbol: 'ROG', name: 'Roche', category: 'stocks', tradingviewSymbol: 'SIX:ROG' },
  HSBA: { symbol: 'HSBA', name: 'HSBC', category: 'stocks', tradingviewSymbol: 'LSE:HSBA' },
  ULVR: { symbol: 'ULVR', name: 'Unilever', category: 'stocks', tradingviewSymbol: 'LSE:ULVR' },
  AZN: { symbol: 'AZN', name: 'AstraZeneca', category: 'stocks', tradingviewSymbol: 'LSE:AZN' },
  SHEL: { symbol: 'SHEL', name: 'Shell', category: 'stocks', tradingviewSymbol: 'LSE:SHEL' },
  RIO: { symbol: 'RIO', name: 'Rio Tinto', category: 'stocks', tradingviewSymbol: 'LSE:RIO' },
  
  // Indices
  SPX: { symbol: 'SPX', name: 'S&P 500', category: 'indices', tradingviewSymbol: 'FOREXCOM:SPXUSD' },
  NDX: { symbol: 'NDX', name: 'Nasdaq 100', category: 'indices', tradingviewSymbol: 'NASDAQ:NDX' },
  DJI: { symbol: 'DJI', name: 'Dow Jones', category: 'indices', tradingviewSymbol: 'DJ:DJI' },
  DAX: { symbol: 'DAX', name: 'DAX 40', category: 'indices', tradingviewSymbol: 'XETR:DAX' },
  FTSE: { symbol: 'FTSE', name: 'FTSE 100', category: 'indices', tradingviewSymbol: 'FTSE:UKX' },
  N225: { symbol: 'N225', name: 'Nikkei 225', category: 'indices', tradingviewSymbol: 'TVC:NI225' },
  HSI: { symbol: 'HSI', name: 'Hang Seng', category: 'indices', tradingviewSymbol: 'HSI:HSI' },
  RUT: { symbol: 'RUT', name: 'Russell 2000', category: 'indices', tradingviewSymbol: 'TVC:RUT' },
  VIX: { symbol: 'VIX', name: 'Índice VIX', category: 'indices', tradingviewSymbol: 'TVC:VIX' },
  SX5E: { symbol: 'SX5E', name: 'Euro Stoxx 50', category: 'indices', tradingviewSymbol: 'TVC:SX5E' },
  IBEX: { symbol: 'IBEX', name: 'IBEX 35', category: 'indices', tradingviewSymbol: 'BME:IBC35' },
  CAC: { symbol: 'CAC', name: 'CAC 40', category: 'indices', tradingviewSymbol: 'EURONEXT:PX1' },
  XJO: { symbol: 'XJO', name: 'ASX 200', category: 'indices', tradingviewSymbol: 'ASX:XJO' },
  NIFTY: { symbol: 'NIFTY', name: 'Nifty 50', category: 'indices', tradingviewSymbol: 'NSE:NIFTY' },
  IBOV: { symbol: 'IBOV', name: 'Bovespa', category: 'indices', tradingviewSymbol: 'BMFBOVESPA:IBOV' },
  
  // Commodities
  XAUUSD: { symbol: 'XAUUSD', name: 'Oro/USD', category: 'commodities', tradingviewSymbol: 'TVC:GOLD' },
  XAGUSD: { symbol: 'XAGUSD', name: 'Plata/USD', category: 'commodities', tradingviewSymbol: 'TVC:SILVER' },
  WTIUSD: { symbol: 'WTIUSD', name: 'Petróleo WTI', category: 'commodities', tradingviewSymbol: 'TVC:USOIL' },
  BRENTUSD: { symbol: 'BRENTUSD', name: 'Petróleo Brent', category: 'commodities', tradingviewSymbol: 'TVC:UKOIL' },
  NATGAS: { symbol: 'NATGAS', name: 'Gas Natural', category: 'commodities', tradingviewSymbol: 'TVC:NATGAS' },
  COPPER: { symbol: 'COPPER', name: 'Cobre', category: 'commodities', tradingviewSymbol: 'TVC:COPPER' },
  PLATINUM: { symbol: 'PLATINUM', name: 'Platino', category: 'commodities', tradingviewSymbol: 'TVC:PLATINUM' },
  PALLADIUM: { symbol: 'PALLADIUM', name: 'Paladio', category: 'commodities', tradingviewSymbol: 'TVC:PALLADIUM' },
  
  // Futures
  ES: { symbol: 'ES', name: 'E-mini S&P 500', category: 'futures', tradingviewSymbol: 'CME:ES1!' },
  NQ: { symbol: 'NQ', name: 'E-mini Nasdaq', category: 'futures', tradingviewSymbol: 'CME:NQ1!' },
  CL: { symbol: 'CL', name: 'Crude Oil Futures', category: 'futures', tradingviewSymbol: 'NYMEX:CL1!' },
  GC: { symbol: 'GC', name: 'Gold Futures', category: 'futures', tradingviewSymbol: 'COMEX:GC1!' },
  SI: { symbol: 'SI', name: 'Silver Futures', category: 'futures', tradingviewSymbol: 'COMEX:SI1!' },
  YM: { symbol: 'YM', name: 'E-mini Dow', category: 'futures', tradingviewSymbol: 'CBOT:YM1!' },
  RTY: { symbol: 'RTY', name: 'E-mini Russell', category: 'futures', tradingviewSymbol: 'CME:RTY1!' },
  NG: { symbol: 'NG', name: 'Natural Gas Futures', category: 'futures', tradingviewSymbol: 'NYMEX:NG1!' },
  HG: { symbol: 'HG', name: 'Copper Futures', category: 'futures', tradingviewSymbol: 'COMEX:HG1!' },
};

// Obtener activos por categoría
export const getAssetsByCategory = (category) => {
  return Object.values(ALL_ASSETS).filter(asset => asset.category === category);
};

// Store para activos seleccionados por el usuario
export const useAssetsStore = create(
  persist(
    (set, get) => ({
      // Activos favoritos del usuario
      favorites: ['BTC', 'ETH', 'EURUSD', 'XAUUSD', 'SPX'],
      
      // Activo actualmente seleccionado
      selectedAsset: 'BTC',
      
      // Categoría actualmente seleccionada
      selectedCategory: 'crypto',

      /* Temporalidad del gráfico, en el vocabulario de TradingView
         ('5', '60', '240', 'D'…). Vive AQUÍ y no dentro del gráfico porque el
         escáner de estructura tiene que leer la misma que estás mirando.
         Antes cada uno guardaba la suya y las persistía por separado: ponías
         el gráfico en 4H y el escáner seguía informando del diario, así que
         tendencia, niveles y distancias describían un gráfico distinto del que
         tenías delante. */
      chartInterval: 'D',

      setChartInterval: (interval) => {
        set({ chartInterval: interval });
      },

      addFavorite: (symbol) => {
        const favorites = get().favorites;
        if (!favorites.includes(symbol)) {
          set({ favorites: [...favorites, symbol] });
        }
      },
      
      removeFavorite: (symbol) => {
        set({ favorites: get().favorites.filter(s => s !== symbol) });
      },
      
      setSelectedAsset: (symbol) => {
        set({ selectedAsset: symbol });
      },
      
      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },
      
      getAsset: () => {
        return ALL_ASSETS[get().selectedAsset];
      },
      
      getFavoriteAssets: () => {
        return get().favorites.map(symbol => ALL_ASSETS[symbol]).filter(Boolean);
      }
    }),
    { name: 'trading-assets-storage' }
  )
);

// Datos de precios en tiempo real
export const usePricesStore = create((set, get) => ({
  prices: {},
  isLoading: false,
  lastUpdate: null,
  
  updatePrice: (symbol, priceData) => {
    set(state => ({
      prices: {
        ...state.prices,
        [symbol]: {
          ...priceData,
          lastUpdate: Date.now()
        }
      }
    }));
  },
  
  updatePrices: (pricesData) => {
    set({
      prices: {
        ...get().prices,
        ...pricesData
      },
      lastUpdate: Date.now()
    });
  },
  
  getPrice: (symbol) => {
    return get().prices[symbol] || null;
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  }
}));
