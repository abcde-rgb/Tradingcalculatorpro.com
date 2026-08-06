/* eslint-disable */
/**
 * GENERADO AUTOMÁTICAMENTE — no editar a mano.
 *
 * Fuente: `backend/instruments.py`.
 * Regenerar: `python scripts/gen-instruments-js.py`
 * Verificar: `python scripts/gen-instruments-js.py --check`
 *
 * Aquí sólo hay DATOS (tamaños de contrato, ticks, pips, apalancamientos
 * típicos). La matemática que los usa vive en `lib/instruments.js`, escrita a
 * mano y en paralelo a la del backend: el navegador tiene que poder calcular
 * sin red y el servidor no puede fiarse de lo que le llegue del navegador.
 */

const SPECS = {
  "cfd": {
    "AUS200": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "ASX 200",
      "tick_size": 1
    },
    "ESP35": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "IBEX 35",
      "tick_size": 1
    },
    "FRA40": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "CAC 40",
      "tick_size": 0.5
    },
    "GER40": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "DAX 40",
      "tick_size": 0.5
    },
    "HK50": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Hang Seng",
      "tick_size": 1
    },
    "JPN225": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Nikkei 225",
      "tick_size": 1
    },
    "NAS100": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "Nasdaq 100",
      "tick_size": 0.25
    },
    "NATGAS": {
      "category": "energy",
      "contract_size": 10000,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Gas natural",
      "tick_size": 0.001
    },
    "UK100": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "FTSE 100",
      "tick_size": 0.5
    },
    "UKOIL": {
      "category": "energy",
      "contract_size": 1000,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Petróleo Brent",
      "tick_size": 0.01
    },
    "US30": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "Dow Jones 30",
      "tick_size": 1
    },
    "US500": {
      "category": "index",
      "contract_size": 1,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "S&P 500",
      "tick_size": 0.1
    },
    "USOIL": {
      "category": "energy",
      "contract_size": 1000,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Petróleo WTI",
      "tick_size": 0.01
    },
    "XAGUSD": {
      "category": "metals",
      "contract_size": 5000,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Plata / USD",
      "tick_size": 0.001
    },
    "XAUUSD": {
      "category": "metals",
      "contract_size": 100,
      "default_leverage": 20,
      "max_leverage": 20,
      "name": "Oro / USD",
      "tick_size": 0.01
    },
    "XPTUSD": {
      "category": "metals",
      "contract_size": 100,
      "default_leverage": 10,
      "max_leverage": 10,
      "name": "Platino / USD",
      "tick_size": 0.01
    }
  },
  "cfdCategoryLeverage": {
    "commodity": 10.0,
    "crypto": 2.0,
    "energy": 10.0,
    "fx": 30.0,
    "index": 20.0,
    "metals": 20.0,
    "stock": 5.0
  },
  "constants": {
    "fundingIntervalHours": 8,
    "maintenanceMarginRate": 0.005,
    "maxExposureMultiple": 10.0,
    "minRRFloor": 1.0
  },
  "cryptoPerp": {
    "ADAUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.0065,
      "max_leverage": 75,
      "name": "Cardano perpetuo"
    },
    "AVAXUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.01,
      "max_leverage": 50,
      "name": "Avalanche perpetuo"
    },
    "BNBUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.0065,
      "max_leverage": 75,
      "name": "BNB perpetuo"
    },
    "BTCUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.004,
      "max_leverage": 125,
      "name": "Bitcoin perpetuo"
    },
    "DOGEUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.0065,
      "max_leverage": 75,
      "name": "Dogecoin perpetuo"
    },
    "ETHUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.005,
      "max_leverage": 100,
      "name": "Ethereum perpetuo"
    },
    "LINKUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.01,
      "max_leverage": 50,
      "name": "Chainlink perpetuo"
    },
    "MATICUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.01,
      "max_leverage": 50,
      "name": "Polygon perpetuo"
    },
    "SOLUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.0065,
      "max_leverage": 75,
      "name": "Solana perpetuo"
    },
    "XRPUSDT": {
      "contract_size": 1,
      "maintenance_margin_rate": 0.0065,
      "max_leverage": 75,
      "name": "XRP perpetuo"
    }
  },
  "forexLotTypes": {
    "micro": {
      "id": "micro",
      "label": "Micro lote",
      "units": 1000.0
    },
    "mini": {
      "id": "mini",
      "label": "Mini lote",
      "units": 10000.0
    },
    "nano": {
      "id": "nano",
      "label": "Nano lote",
      "units": 100.0
    },
    "standard": {
      "id": "standard",
      "label": "Lote estándar",
      "units": 100000.0
    },
    "units": {
      "id": "units",
      "label": "Unidades",
      "units": 1.0
    }
  },
  "forexPairs": [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "NZDUSD",
    "EURGBP",
    "EURJPY",
    "GBPJPY",
    "EURCHF",
    "EURAUD",
    "EURCAD",
    "AUDJPY",
    "CADJPY",
    "CHFJPY",
    "NZDJPY",
    "GBPAUD",
    "GBPCAD",
    "GBPCHF",
    "AUDCAD",
    "AUDCHF",
    "AUDNZD",
    "NZDCAD",
    "NZDCHF",
    "USDMXN",
    "USDZAR",
    "USDTRY",
    "USDSEK",
    "USDNOK",
    "USDPLN",
    "USDHUF",
    "USDSGD",
    "USDHKD",
    "USDCNH"
  ],
  "forexPip": {
    "default": 0.0001,
    "jpy": 0.01
  },
  "futures": {
    "6A": {
      "category": "fx",
      "contract_size": 100000,
      "initial_margin": 2200,
      "name": "Australian Dollar",
      "tick_size": 0.0001,
      "tick_value": 10.0
    },
    "6B": {
      "category": "fx",
      "contract_size": 62500,
      "initial_margin": 2700,
      "name": "British Pound",
      "tick_size": 0.0001,
      "tick_value": 6.25
    },
    "6C": {
      "category": "fx",
      "contract_size": 100000,
      "initial_margin": 1900,
      "name": "Canadian Dollar",
      "tick_size": 5e-05,
      "tick_value": 5.0
    },
    "6E": {
      "category": "fx",
      "contract_size": 125000,
      "initial_margin": 2800,
      "name": "Euro FX",
      "tick_size": 5e-05,
      "tick_value": 6.25
    },
    "6J": {
      "category": "fx",
      "contract_size": 12500000,
      "initial_margin": 3000,
      "name": "Japanese Yen",
      "tick_size": 5e-07,
      "tick_value": 6.25
    },
    "CL": {
      "category": "energy",
      "contract_size": 1000,
      "initial_margin": 6500,
      "name": "Crude Oil WTI",
      "tick_size": 0.01,
      "tick_value": 10.0
    },
    "ES": {
      "category": "index",
      "contract_size": 50,
      "initial_margin": 13200,
      "name": "E-mini S&P 500",
      "tick_size": 0.25,
      "tick_value": 12.5
    },
    "GC": {
      "category": "metals",
      "contract_size": 100,
      "initial_margin": 10000,
      "name": "Gold",
      "tick_size": 0.1,
      "tick_value": 10.0
    },
    "HG": {
      "category": "metals",
      "contract_size": 25000,
      "initial_margin": 6500,
      "name": "Copper",
      "tick_size": 0.0005,
      "tick_value": 12.5
    },
    "M2K": {
      "category": "index",
      "contract_size": 5,
      "initial_margin": 700,
      "name": "Micro Russell 2000",
      "tick_size": 0.1,
      "tick_value": 0.5
    },
    "MCL": {
      "category": "energy",
      "contract_size": 100,
      "initial_margin": 650,
      "name": "Micro Crude Oil",
      "tick_size": 0.01,
      "tick_value": 1.0
    },
    "MES": {
      "category": "index",
      "contract_size": 5,
      "initial_margin": 1320,
      "name": "Micro E-mini S&P 500",
      "tick_size": 0.25,
      "tick_value": 1.25
    },
    "MGC": {
      "category": "metals",
      "contract_size": 10,
      "initial_margin": 1000,
      "name": "Micro Gold",
      "tick_size": 0.1,
      "tick_value": 1.0
    },
    "MNQ": {
      "category": "index",
      "contract_size": 2,
      "initial_margin": 1760,
      "name": "Micro E-mini Nasdaq",
      "tick_size": 0.25,
      "tick_value": 0.5
    },
    "MYM": {
      "category": "index",
      "contract_size": 0.5,
      "initial_margin": 1050,
      "name": "Micro E-mini Dow",
      "tick_size": 1,
      "tick_value": 0.5
    },
    "NG": {
      "category": "energy",
      "contract_size": 10000,
      "initial_margin": 3300,
      "name": "Natural Gas",
      "tick_size": 0.001,
      "tick_value": 10.0
    },
    "NQ": {
      "category": "index",
      "contract_size": 20,
      "initial_margin": 17600,
      "name": "E-mini Nasdaq 100",
      "tick_size": 0.25,
      "tick_value": 5.0
    },
    "PL": {
      "category": "metals",
      "contract_size": 50,
      "initial_margin": 4400,
      "name": "Platinum",
      "tick_size": 0.1,
      "tick_value": 5.0
    },
    "RB": {
      "category": "energy",
      "contract_size": 42000,
      "initial_margin": 7700,
      "name": "RBOB Gasoline",
      "tick_size": 0.0001,
      "tick_value": 4.2
    },
    "RTY": {
      "category": "index",
      "contract_size": 50,
      "initial_margin": 7000,
      "name": "E-mini Russell 2000",
      "tick_size": 0.1,
      "tick_value": 5.0
    },
    "SI": {
      "category": "metals",
      "contract_size": 5000,
      "initial_margin": 15500,
      "name": "Silver",
      "tick_size": 0.005,
      "tick_value": 25.0
    },
    "SIL": {
      "category": "metals",
      "contract_size": 1000,
      "initial_margin": 3100,
      "name": "Micro Silver",
      "tick_size": 0.005,
      "tick_value": 5.0
    },
    "YM": {
      "category": "index",
      "contract_size": 5,
      "initial_margin": 10500,
      "name": "E-mini Dow",
      "tick_size": 1,
      "tick_value": 5.0
    },
    "ZB": {
      "category": "bonds",
      "contract_size": 1000,
      "initial_margin": 5000,
      "name": "30-Year T-Bond",
      "tick_size": 0.03125,
      "tick_value": 31.25
    },
    "ZC": {
      "category": "grains",
      "contract_size": 50,
      "initial_margin": 2200,
      "name": "Corn",
      "tick_size": 0.25,
      "tick_value": 12.5
    },
    "ZF": {
      "category": "bonds",
      "contract_size": 1000,
      "initial_margin": 1800,
      "name": "5-Year T-Note",
      "tick_size": 0.0078125,
      "tick_value": 7.8125
    },
    "ZN": {
      "category": "bonds",
      "contract_size": 1000,
      "initial_margin": 2400,
      "name": "10-Year T-Note",
      "tick_size": 0.015625,
      "tick_value": 15.625
    },
    "ZS": {
      "category": "grains",
      "contract_size": 50,
      "initial_margin": 4000,
      "name": "Soybeans",
      "tick_size": 0.25,
      "tick_value": 12.5
    },
    "ZW": {
      "category": "grains",
      "contract_size": 50,
      "initial_margin": 2900,
      "name": "Wheat",
      "tick_size": 0.25,
      "tick_value": 12.5
    }
  },
  "products": {
    "cfd": {
      "carry": "swap",
      "default_contract_size": 1.0,
      "default_leverage": 10.0,
      "defined_risk": false,
      "id": "cfd",
      "label": "CFD",
      "quote_units": [
        "price",
        "points",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "lots",
      "typical_max_leverage": 30.0,
      "uses_leverage": true
    },
    "crypto_perp": {
      "carry": "funding",
      "default_contract_size": 1.0,
      "default_leverage": 5.0,
      "defined_risk": false,
      "id": "crypto_perp",
      "label": "Cripto perpetuo",
      "quote_units": [
        "price",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "coins",
      "typical_max_leverage": 125.0,
      "uses_leverage": true
    },
    "crypto_spot": {
      "carry": null,
      "default_contract_size": 1.0,
      "default_leverage": 1.0,
      "defined_risk": false,
      "id": "crypto_spot",
      "label": "Cripto spot",
      "quote_units": [
        "price",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "coins",
      "typical_max_leverage": 1.0,
      "uses_leverage": false
    },
    "forex": {
      "carry": "swap",
      "default_contract_size": 100000.0,
      "default_leverage": 30.0,
      "defined_risk": false,
      "id": "forex",
      "label": "Forex",
      "quote_units": [
        "price",
        "pips",
        "money",
        "pct_balance"
      ],
      "sizing": "lots",
      "typical_max_leverage": 500.0,
      "uses_leverage": true
    },
    "futures": {
      "carry": null,
      "default_contract_size": null,
      "default_leverage": null,
      "defined_risk": false,
      "id": "futures",
      "label": "Futuros",
      "quote_units": [
        "price",
        "ticks",
        "points",
        "money",
        "pct_balance"
      ],
      "sizing": "contracts",
      "typical_max_leverage": null,
      "uses_leverage": true
    },
    "option": {
      "carry": null,
      "default_contract_size": 100.0,
      "default_leverage": 1.0,
      "defined_risk": true,
      "id": "option",
      "label": "Opciones",
      "quote_units": [
        "price",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "contracts",
      "typical_max_leverage": 1.0,
      "uses_leverage": false
    },
    "spot": {
      "carry": null,
      "default_contract_size": 1.0,
      "default_leverage": 1.0,
      "defined_risk": false,
      "id": "spot",
      "label": "Spot",
      "quote_units": [
        "price",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "units",
      "typical_max_leverage": 1.0,
      "uses_leverage": true
    },
    "stock": {
      "carry": null,
      "default_contract_size": 1.0,
      "default_leverage": 1.0,
      "defined_risk": false,
      "id": "stock",
      "label": "Acciones",
      "quote_units": [
        "price",
        "pct",
        "money",
        "pct_balance"
      ],
      "sizing": "shares",
      "typical_max_leverage": 5.0,
      "uses_leverage": true
    }
  },
  "units": [
    "price",
    "pips",
    "ticks",
    "points",
    "pct",
    "money",
    "pct_balance",
    "r"
  ]
};

export default SPECS;
