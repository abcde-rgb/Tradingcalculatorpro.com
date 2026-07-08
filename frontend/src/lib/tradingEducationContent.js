// Trading Education Content - Multi-language support
// This file returns translated content based on the current locale

export const getTradingRules = (t) => [
  {
    id: 1,
    category: t('Planificación'),
    rule: t('rule1Title'),
    explanation: t('rule1Explanation'),
    priority: 'critical'
  },
  {
    id: 2,
    category: t('Gestión de Riesgo'),
    rule: t('rule2Title'),
    explanation: t('rule2Explanation'),
    priority: 'critical'
  },
  {
    id: 3,
    category: t('Disciplina'),
    rule: t('rule3Title'),
    explanation: t('rule3Explanation'),
    priority: 'critical'
  },
  {
    id: 4,
    category: t('Entrada'),
    rule: t('rule4Title'),
    explanation: t('rule4Explanation'),
    priority: 'high'
  },
  {
    id: 5,
    category: t('Salida'),
    rule: t('rule5Title'),
    explanation: t('rule5Explanation'),
    priority: 'critical'
  },
  {
    id: 6,
    category: t('Psicología'),
    rule: t('rule6Title'),
    explanation: t('rule6Explanation'),
    priority: 'high'
  },
  {
    id: 7,
    category: t('Gestión de Riesgo'),
    rule: t('rule7Title'),
    explanation: t('rule7Explanation'),
    priority: 'critical'
  },
  {
    id: 8,
    category: t('Análisis'),
    rule: t('rule8Title'),
    explanation: t('rule8Explanation'),
    priority: 'high'
  },
  {
    id: 9,
    category: t('Capital'),
    rule: t('rule9Title'),
    explanation: t('rule9Explanation'),
    priority: 'critical'
  },
  {
    id: 10,
    category: t('Disciplina'),
    rule: t('rule10Title'),
    explanation: t('rule10Explanation'),
    priority: 'high'
  },
  {
    id: 11,
    category: t('Mercado'),
    rule: t('rule11Title'),
    explanation: t('rule11Explanation'),
    priority: 'medium'
  },
  {
    id: 12,
    category: t('Apalancamiento'),
    rule: t('rule12Title'),
    explanation: t('rule12Explanation'),
    priority: 'critical'
  },
  {
    id: 13,
    category: t('Tendencia'),
    rule: t('rule13Title'),
    explanation: t('rule13Explanation'),
    priority: 'high'
  },
  {
    id: 14,
    category: t('Posición'),
    rule: t('rule14Title'),
    explanation: t('rule14Explanation'),
    priority: 'high'
  },
  {
    id: 15,
    category: t('Ganadores'),
    rule: t('rule15Title'),
    explanation: t('rule15Explanation'),
    priority: 'high'
  }
];

export const getChartPatterns = (t) => ({
  reversal: [
    {
      id: 'head-shoulders',
      name: t('headShouldersName'),
      type: 'bearish',
      description: t('headShouldersDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/9wfzko6e_HOMBRO%20CABEZA%20HOMBRO.png',
      howToTrade: [
        t('htt_identificarLaTendenciaAlcist_af7998c2'),
        t('htt_esperarFormacionCompletaDelP_133fd32f'),
        t('htt_entradaEnRupturaDeLa_b6ec351f'),
        t('htt_stopLossPorEncimaDel_ff332cba'),
        t('htt_objetivoDistanciaDeLaCabeza_cbfcc87b')
      ],
      reliability: t('highReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'inverse-head-shoulders',
      name: t('invHeadShouldersName'),
      type: 'bullish',
      description: t('invHeadShouldersDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/2ygvtz2y_HOMBRO%20CABEZA%20HOMBRO%20INVERTIDO.png',
      howToTrade: [
        t('htt_identificarLaTendenciaBajist_4fb6db68'),
        t('htt_esperarFormacionCompletaDelP_133fd32f'),
        t('htt_entradaEnRupturaAlcistaDe_6b085224'),
        t('htt_stopLossPorDebajoDel_2dbe09a2'),
        t('htt_objetivoDistanciaProyectadaH_f01194e7')
      ],
      reliability: t('highReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'double-top',
      name: t('doubleTopName'),
      type: 'bearish',
      description: t('doubleTopDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/raa08hc3_DOBLE%20TECHO.png',
      howToTrade: [
        t('htt_identificarDosMaximosSimilar_8da8788c'),
        t('htt_confirmarConVolumenDecrecien_e341216e'),
        t('htt_entradaEnRupturaDelSoporte_6a7b1a5b'),
        t('htt_stopLossPorEncimaDel_4b218f42'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'double-bottom',
      name: t('doubleBottomName'),
      type: 'bullish',
      description: t('doubleBottomDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/bvkk52gf_DOBLE%20SUELO.png',
      howToTrade: [
        t('htt_identificarDosMinimosSimilar_aacf8393'),
        t('htt_confirmarConVolumenCreciente_8bf6da85'),
        t('htt_entradaEnRupturaDeLa_589f80e8'),
        t('htt_stopLossPorDebajoDel_452c7a62'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'triple-top',
      name: t('tripleTopName'),
      type: 'bearish',
      description: t('tripleTopDesc'),
      howToTrade: [
        t('htt_identificarTresMaximosEnEl_00258ad0'),
        t('htt_volumenDebeDisminuirEnCada_54194fb5'),
        t('htt_entradaEnRupturaDelSoporte_ee4a1c71'),
        t('htt_stopLossPorEncimaDel_76146771'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'triple-bottom',
      name: t('tripleBottomName'),
      type: 'bullish',
      description: t('tripleBottomDesc'),
      howToTrade: [
        t('htt_identificarTresMinimosEnEl_e48405f1'),
        t('htt_volumenCrecienteEnRebotes_d9968d81'),
        t('htt_entradaEnRupturaDeResistenci_1e4d15d8'),
        t('htt_stopLossPorDebajoDel_12538615'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'asc-broadening-wedge',
      name: t('expandingPatternsAscWedgeName'),
      type: 'bearish',
      description: t('expandingPatternsAscWedgeDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/z7egei96_CU%C3%91A%20DE%20EXPANSION%20ASCENDENTE.png',
      howToTrade: [
        t('htt_entry1ComprarEnRuptura_f5a96723').replace('Comprar', 'Vender'),
        t('httEntry2RetestLower'),
        t('htt_stopLossPorEncimaDel_76146771'),
        t('htt_takeProfit1Y2_d37da2f4'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'bear-broadening-bull-rev',
      name: t('expandingPatternsBearRevName'),
      type: 'bullish',
      description: t('expandingPatternsBearRevDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/ce7dvho5_TRIANGULO%20SIMETRICO%20EXPANSIVO%20BAJISTA%28CAMBIO%20ALCISTA%29.png',
      howToTrade: [
        t('httEntry1BreakUpper'),
        t('httEntry2BuyRetest'),
        t('htt_stopLossPorDebajoDel_714cbb59'),
        t('htt_takeProfit1Y2_d37da2f4'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'bear-broadening-bear-rev',
      name: t('expandingPatternsBearRevDownName'),
      type: 'bearish',
      description: t('expandingPatternsBearRevDownDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/a7rj6hlx_TRIANGULO%20SIMETRICO%20EXPANSIVO%20BAJISTA%28CAMBIO%20BAJISTA%29.png',
      howToTrade: [
        t('httEntry1SellBreakLower'),
        t('httEntry2SellRetest'),
        t('htt_stopLossPorEncimaDel_76146771'),
        t('htt_takeProfit1Y2_d37da2f4'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'v-bottom-reversal',
      name: t('vBottomReversalName'),
      type: 'bullish',
      description: t('vBottomReversalDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/m4gllqw8_SUELO%20EN%20V%28CAMBIO%20ALCISTA%29.png',
      howToTrade: [
        t('vBottomReversalHTT_1'),
        t('vBottomReversalHTT_2'),
        t('vBottomReversalHTT_3'),
        t('vBottomReversalHTT_4'),
        t('vBottomReversalHTT_5'),
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'rising-wedge',
      name: t('risingWedgeName'),
      type: 'bearish',
      description: t('risingWedgeDesc'),
      howToTrade: [
        t('risingWedgeHTT_1'),
        t('risingWedgeHTT_2'),
        t('risingWedgeHTT_3'),
        t('risingWedgeHTT_4'),
        t('risingWedgeHTT_5'),
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'falling-wedge',
      name: t('fallingWedgeName'),
      type: 'bullish',
      description: t('fallingWedgeDesc'),
      howToTrade: [
        t('fallingWedgeHTT_1'),
        t('fallingWedgeHTT_2'),
        t('fallingWedgeHTT_3'),
        t('fallingWedgeHTT_4'),
        t('fallingWedgeHTT_5'),
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'desc-broadening-wedge',
      name: t('descBroadeningWedgeName'),
      type: 'bullish',
      description: t('descBroadeningWedgeDesc'),
      howToTrade: [
        t('descBroadeningWedgeHTT_1'),
        t('descBroadeningWedgeHTT_2'),
        t('descBroadeningWedgeHTT_3'),
        t('descBroadeningWedgeHTT_4'),
        t('descBroadeningWedgeHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'bullish-diamond',
      name: t('bullishDiamondName'),
      type: 'bullish',
      description: t('bullishDiamondDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/vgzdj1ay_DIAMANTE%20ALCISTA.png',
      howToTrade: [
        t('bullishDiamondHTT_1'),
        t('bullishDiamondHTT_2'),
        t('bullishDiamondHTT_3'),
        t('bullishDiamondHTT_4'),
        t('bullishDiamondHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'bearish-diamond',
      name: t('bearishDiamondName'),
      type: 'bearish',
      description: t('bearishDiamondDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/qf6raoaj_DIAMANTE%20BAJISTA.png',
      howToTrade: [
        t('bearishDiamondHTT_1'),
        t('bearishDiamondHTT_2'),
        t('bearishDiamondHTT_3'),
        t('bearishDiamondHTT_4'),
        t('bearishDiamondHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'v-top',
      name: t('vTopName'),
      type: 'bearish',
      description: t('vTopDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/enj4wnk0_TECHO%20EN%20V.png',
      howToTrade: [
        t('vTopHTT_1'),
        t('vTopHTT_2'),
        t('vTopHTT_3'),
        t('vTopHTT_4'),
        t('vTopHTT_5'),
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'saucer',
      name: t('saucerName'),
      type: 'bullish',
      description: t('saucerDesc'),
      howToTrade: [
        t('saucerHTT_1'),
        t('saucerHTT_2'),
        t('saucerHTT_3'),
        t('saucerHTT_4'),
        t('saucerHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['D', 'W']
    },
    {
      id: 'rounded-top',
      name: t('roundedTopName'),
      type: 'bearish',
      description: t('roundedTopDesc'),
      howToTrade: [
        t('roundedTopHTT_1'),
        t('roundedTopHTT_2'),
        t('roundedTopHTT_3'),
        t('roundedTopHTT_4'),
        t('roundedTopHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['D', 'W']
    },
    {
      id: 'rounded-bottom',
      name: t('roundedBottomName'),
      type: 'bullish',
      description: t('roundedBottomDesc'),
      howToTrade: [
        t('roundedBottomHTT_1'),
        t('roundedBottomHTT_2'),
        t('roundedBottomHTT_3'),
        t('roundedBottomHTT_4'),
        t('roundedBottomHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['D', 'W']
    },
    {
      id: 'symmetric-broadening-bull',
      name: t('symmetricBroadeningBullName'),
      type: 'bullish',
      description: t('symmetricBroadeningBullDesc'),
      howToTrade: [
        t('symmetricBroadeningBullHTT_1'),
        t('symmetricBroadeningBullHTT_2'),
        t('symmetricBroadeningBullHTT_3'),
        t('symmetricBroadeningBullHTT_4'),
        t('symmetricBroadeningBullHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D']
    },
    {
      id: 'symmetric-broadening-bear',
      name: t('symmetricBroadeningBearName'),
      type: 'bearish',
      description: t('symmetricBroadeningBearDesc'),
      howToTrade: [
        t('symmetricBroadeningBearHTT_1'),
        t('symmetricBroadeningBearHTT_2'),
        t('symmetricBroadeningBearHTT_3'),
        t('symmetricBroadeningBearHTT_4'),
        t('symmetricBroadeningBearHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D']
    },
    {
      id: 'right-angle-asc-broadening',
      name: t('rightAngleAscBroadeningName'),
      type: 'bearish',
      description: t('rightAngleAscBroadeningDesc'),
      howToTrade: [
        t('rightAngleAscBroadeningHTT_1'),
        t('rightAngleAscBroadeningHTT_2'),
        t('rightAngleAscBroadeningHTT_3'),
        t('rightAngleAscBroadeningHTT_4'),
        t('rightAngleAscBroadeningHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D']
    },
    {
      id: 'right-angle-desc-broadening',
      name: t('rightAngleDescBroadeningName'),
      type: 'bullish',
      description: t('rightAngleDescBroadeningDesc'),
      howToTrade: [
        t('rightAngleDescBroadeningHTT_1'),
        t('rightAngleDescBroadeningHTT_2'),
        t('rightAngleDescBroadeningHTT_3'),
        t('rightAngleDescBroadeningHTT_4'),
        t('rightAngleDescBroadeningHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['4H', 'D']
    }
  ],
  continuation: [
    {
      id: 'v-bottom-continuation',
      name: t('vBottomContinuationName'),
      type: 'bullish',
      description: t('vBottomContinuationDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/n7t7zeai_SUELO%20EN%20V%28CONTINUACCION%20ALCISTA%29.png',
      howToTrade: [
        t('vBottomContinuationHTT_1'),
        t('vBottomContinuationHTT_2'),
        t('vBottomContinuationHTT_3'),
        t('vBottomContinuationHTT_4'),
        t('vBottomContinuationHTT_5'),
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'ascending-triangle',
      name: t('ascTriangleName'),
      type: 'bullish',
      description: t('ascTriangleDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/9hxylq5z_TRIANGULO%20DE%20CONTINUACCION%20ALCISTA.png',
      howToTrade: [
        t('htt_identificarResistenciaPlanaC_c844339b'),
        t('htt_esperarRupturaDeLaResistenci_350ac0e7'),
        t('htt_entry1EnLaRuptura_9701d6f9'),
        t('htt_entry2EnElRetroceso_91b8b422'),
        t('htt_stopLossPorDebajoDel_714cbb59'),
        t('htt_takeProfit1Y2_d37da2f4')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'descending-triangle',
      name: t('descTriangleName'),
      type: 'bearish',
      description: t('descTriangleDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/ggcbypeq_TRIANGULO%20DE%20CONTINUACCION%20BAJISTA.png',
      howToTrade: [
        t('htt_identificarSoportePlanoConMa_3d058880'),
        t('htt_esperarRupturaDelSoporteCon_09579d67'),
        t('htt_entry1EntradaEnLa_b0f1ca34'),
        t('htt_entry2EntradaEnRetroceso_d5f5519a'),
        t('htt_stopLoss1Y2_6cdb3f20'),
        t('htt_takeProfit1Y2_d37da2f4')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'symmetrical-triangle',
      name: t('symTriangleName'),
      type: 'neutral',
      description: t('symTriangleDesc'),
      howToTrade: [
        t('htt_identificarConvergenciaDeLin_b44ab6c2'),
        t('htt_esperarRupturaClaraEnCualqui_e7063a51'),
        t('htt_entryEnDireccionDeLa_c707f212'),
        t('htt_stopLossAlOtroLado_c17f817c'),
        t('htt_objetivoAlturaDelTrianguloPr_fde74f7d')
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'symmetrical-triangle-bullish',
      name: t('symTriangleBullName'),
      type: 'bullish',
      description: t('symTriangleBullDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/xzk3o1rm_TRIANGULO%20SIMETRICO%20DE%20CONTINUACCION%20ALCISTA.png',
      howToTrade: [
        t('htt_identificarConvergenciaDeLin_b44ab6c2'),
        t('htt_entry1RupturaAlcistaDe_2d66fc23'),
        t('htt_entry2RetrocesoTrasRuptura_e12ca812'),
        t('htt_stopLoss1Y2_bcefdc4a'),
        t('htt_takeProfit1Y2_4240ed83')
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'symmetrical-triangle-bearish',
      name: t('symTriangleBearName'),
      type: 'bearish',
      description: t('symTriangleBearDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/ui5ydasb_TRIANGULO%20SIMETRICO%20DE%20CONTINUACCION%20BAJISTA.png',
      howToTrade: [
        t('htt_identificarConvergenciaDeLin_b44ab6c2'),
        t('htt_entry1RupturaBajistaDel_3b93e3f8'),
        t('htt_entry2RetrocesoTrasRuptura_e12ca812'),
        t('htt_stopLoss1Y2_6cdb3f20'),
        t('htt_takeProfit1Y2_ba05ebc9')
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'bull-flag',
      name: t('bullFlagName'),
      type: 'bullish',
      description: t('bullFlagDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/tyu0tbqa_BANDERA%20DE%20CONTINUACCION%20ALCISTA.png',
      howToTrade: [
        t('htt_identificarMovimientoAlcista_a29dfcc7'),
        t('htt_consolidacionEnCanalBajistaB_c250b95e'),
        t('htt_entradaEnRupturaAlcistaDe_e7b25835'),
        t('htt_stopLossPorDebajoDe_76054fe2'),
        t('htt_takeProfit1Y2_9ff0c403')
      ],
      reliability: t('highReliability'),
      timeframes: ['15m', '1H', '4H']
    },
    {
      id: 'bear-flag',
      name: t('bearFlagName'),
      type: 'bearish',
      description: t('bearFlagDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/yxqoe3xy_BANDERA%20DE%20CONTINUACCION%20BAJISTA.png',
      howToTrade: [
        t('htt_identificarMovimientoBajista_dc5090ef'),
        t('htt_consolidacionEnCanalAlcistaB_a0a69e0b'),
        t('htt_entradaEnRupturaBajistaDe_7011912c'),
        t('htt_stopLossPorEncimaDe_c954ac0a'),
        t('htt_takeProfit1Y2_9ff0c403')
      ],
      reliability: t('highReliability'),
      timeframes: ['15m', '1H', '4H']
    },
    {
      id: 'pennant',
      name: t('pennantName'),
      type: 'neutral',
      description: t('pennantDesc'),
      howToTrade: [
        t('htt_identificarAstaMovimientoFue_82ce3e7f'),
        t('htt_pequenoTrianguloSimetricoBan_4141f840'),
        t('htt_entradaEnRupturaEnDireccion_e70cf7f2'),
        t('htt_stopLossAlOtroLado_1a6c0de4'),
        t('htt_objetivoLongitudDelAsta_03e9a53f')
      ],
      reliability: t('highReliability'),
      timeframes: ['5m', '15m', '1H']
    },
    {
      id: 'bull-pennant',
      name: t('bullPennantName'),
      type: 'bullish',
      description: t('bullPennantDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/4ikd2cr5_BANDERIN%20DE%20CONTINUACCION%20ALCISTA.png',
      howToTrade: [
        t('htt_identificarAstaAlcistaFuerte_1a64b4ba'),
        t('htt_pequenoTrianguloSimetricoBan_4141f840'),
        t('htt_entradaEnRupturaAlcistaEntry_99b45711'),
        t('htt_stopLossPorDebajoDel_609ed513'),
        'Take Profit 1 y 2: longitud del asta'
      ],
      reliability: t('highReliability'),
      timeframes: ['5m', '15m', '1H']
    },
    {
      id: 'bear-pennant',
      name: t('bearPennantName'),
      type: 'bearish',
      description: t('bearPennantDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/urowelfz_BANDERIN%20DE%20CONTINUACCION%20BAJISTA.png',
      howToTrade: [
        t('htt_identificarAstaBajistaFuerte_2ebc185e'),
        t('htt_pequenoTrianguloSimetricoBan_4141f840'),
        t('htt_entradaEnRupturaBajistaEntry_6496258f'),
        t('htt_stopLossPorEncimaDel_4b403a59'),
        'Take Profit 1 y 2: longitud del asta'
      ],
      reliability: t('highReliability'),
      timeframes: ['5m', '15m', '1H']
    },
    {
      id: 'ascending-channel',
      name: t('ascChannelName'),
      type: 'bullish',
      description: t('ascChannelDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/xwieicd1_CANAL%20ALCISTA.png',
      howToTrade: [
        t('htt_dibujarLineasParalelasConect_a52d6314'),
        t('htt_entry1ComprarEnEl_2fefd3e7'),
        t('httEntry2BuyPullbackChannel'),
        t('htt_stopLossPorDebajoDel_09f9a153'),
        t('htt_takeProfitEnLaResistencia_3bdadd68')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'descending-channel',
      name: t('descChannelName'),
      type: 'bearish',
      description: t('descChannelDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/17ftg4ps_CANAL%20BAJISTA.png',
      howToTrade: [
        t('htt_dibujarLineasParalelasConect_95298983'),
        t('htt_entry1VenderEnLa_0de2bbcf'),
        t('htt_entry2VenderTrasRebote_596fb9fc'),
        t('htt_stopLossPorEncimaDel_4e863757'),
        t('htt_takeProfitEnElSoporte_e0a715d8')
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'horizontal-channel',
      name: t('horzChannelName'),
      type: 'neutral',
      description: t('horzChannelDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/wrbamc2m_CANAL%20HORIZONTAL.png',
      howToTrade: [
        t('htt_identificarSoporteYResistenc_44379c8a'),
        t('htt_entry1ComprarEnEl_205a48a2'),
        t('htt_entry2OperarElRebote_38c4a2db'),
        t('htt_stopLossFueraDelCanal_6d124093'),
        'Take Profit en el extremo opuesto del canal'
      ],
      reliability: t('mediumReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'horizontal-channel-bullish',
      name: t('horzChannelBullName'),
      type: 'bullish',
      description: t('horzChannelBullDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/m4fqb9l4_CANAL%20HORIZONTAL%20ALCISTA.png',
      howToTrade: [
        t('htt_identificarRangoHorizontalCo_9413adc0'),
        t('htt_entry1ComprarEnSoporte_a2b22c0e'),
        t('htt_entry2ComprarEnRuptura_f2af04a2'),
        t('htt_stopLossPorDebajoDel_a8880ddb'),
        'Take Profit 1 y 2: proyectar altura del canal hacia arriba'
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'horizontal-channel-bearish',
      name: t('horzChannelBearName'),
      type: 'bearish',
      description: t('horzChannelBearDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/grq5z4q9_CANAL%20HORIZONTAL%20BAJISTA.png',
      howToTrade: [
        t('htt_identificarRangoHorizontalCo_28a4b59b'),
        t('htt_entry1VenderEnResistencia_128c1a2d'),
        t('htt_entry2VenderEnRuptura_494ec4d6'),
        t('htt_stopLossPorEncimaDe_aa19282c'),
        'Take Profit 1 y 2: proyectar altura del canal hacia abajo'
      ],
      reliability: t('mediumReliability') + '-' + t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'cup-and-handle',
      name: t('cupHandleName'),
      type: 'bullish',
      description: t('cupHandleDesc'),
      image: 'https://customer-assets.emergentagent.com/job_transaction-hub-113/artifacts/xxyrw8nn_TAZA%20CON%20ASA.png',
      howToTrade: [
        t('htt_identificarFormacionDeTazaU_efa479b6'),
        t('htt_entry1ComprarEnRuptura_f5a96723'),
        t('htt_entry2ComprarEnRetroceso_88ee4c83'),
        t('htt_stopLossPorDebajoDel_edb858e4'),
        t('htt_takeProfitAlturaDeLa_7f1b2ca3')
      ],
      reliability: t('highReliability'),
      timeframes: ['4H', 'D', 'W']
    },
    {
      id: 'bull-broadening-cont',
      name: t('expandingPatternsBullContName'),
      type: 'bullish',
      description: t('expandingPatternsBullContDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/ozc52r6l_TRIANGULO%20SIMETRICO%20EXPANISVO%20ALCISTA%28CONTINUACCION%20ALCISTA%29.png',
      howToTrade: [
        t('httEntry1BuyBullBreakUpper'),
        t('httEntry2BuyRetest'),
        t('htt_stopLossPorDebajoDel_714cbb59'),
        t('htt_takeProfit1Y2_d37da2f4'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    },
    {
      id: 'bear-broadening-cont',
      name: t('expandingPatternsBearContName'),
      type: 'bearish',
      description: t('expandingPatternsBearContDesc'),
      image: 'https://customer-assets.emergentagent.com/job_unified-site-1/artifacts/jix471rb_TRIANGULO%20SIMETRICO%20EXPANSIVO%20BAJISTA%28CONTINUACION%20BAJISTA%29.png',
      howToTrade: [
        t('httEntry1SellBearBreakLower'),
        t('httEntry2SellRetest'),
        t('htt_stopLossPorEncimaDel_76146771'),
        t('htt_takeProfit1Y2_d37da2f4'),
        t('htt_objetivoAlturaDelPatron_dc9c40b9')
      ],
      reliability: t('highReliability'),
      timeframes: ['1H', '4H', 'D']
    }
  ]
});

// Approximate historical reliability per candlestick pattern (Bulkowski,
// "Encyclopedia of Candlestick Charts"). Language-neutral numbers, mirrored
// from the backend catalogue. behavior: reversal | continuation | indecision;
// successRate: % it resolves that way; rank: overall performance (1 = best/103).
export const CANDLE_PATTERN_STATS = {
  'hammer':               { behavior: 'reversal',     successRate: 60, rank: 26 },
  'hanging-man':          { behavior: 'reversal',     successRate: 59, rank: 51 },
  'inverted-hammer':      { behavior: 'reversal',     successRate: 65, rank: 14 },
  'shooting-star':        { behavior: 'reversal',     successRate: 59, rank: 31 },
  'doji':                 { behavior: 'indecision',   successRate: 50, rank: 75 },
  'dragonfly-doji':       { behavior: 'reversal',     successRate: 50, rank: 72 },
  'gravestone-doji':      { behavior: 'reversal',     successRate: 51, rank: 77 },
  'long-legged-doji':     { behavior: 'indecision',   successRate: 51, rank: 80 },
  'high-wave':            { behavior: 'indecision',   successRate: 50, rank: 82 },
  'bullish-marubozu':     { behavior: 'continuation', successRate: 56, rank: 58 },
  'bearish-marubozu':     { behavior: 'continuation', successRate: 55, rank: 60 },
  'spinning-top':         { behavior: 'indecision',   successRate: 50, rank: 78 },
  'bullish-engulfing':    { behavior: 'reversal',     successRate: 63, rank: 22 },
  'bearish-engulfing':    { behavior: 'reversal',     successRate: 79, rank: 9 },
  'bullish-harami':       { behavior: 'reversal',     successRate: 53, rank: 68 },
  'bearish-harami':       { behavior: 'reversal',     successRate: 53, rank: 65 },
  'piercing-line':        { behavior: 'reversal',     successRate: 64, rank: 19 },
  'dark-cloud-cover':     { behavior: 'reversal',     successRate: 60, rank: 30 },
  'tweezer-bottom':       { behavior: 'reversal',     successRate: 56, rank: 56 },
  'tweezer-top':          { behavior: 'reversal',     successRate: 55, rank: 57 },
  'bullish-kicker':       { behavior: 'reversal',     successRate: 68, rank: 7 },
  'bearish-kicker':       { behavior: 'reversal',     successRate: 67, rank: 8 },
  'morning-star':         { behavior: 'reversal',     successRate: 78, rank: 6 },
  'evening-star':         { behavior: 'reversal',     successRate: 72, rank: 11 },
  'morning-doji-star':    { behavior: 'reversal',     successRate: 76, rank: 10 },
  'evening-doji-star':    { behavior: 'reversal',     successRate: 71, rank: 13 },
  'three-white-soldiers': { behavior: 'reversal',     successRate: 82, rank: 3 },
  'three-black-crows':    { behavior: 'reversal',     successRate: 78, rank: 5 },
  'three-inside-up':      { behavior: 'reversal',     successRate: 65, rank: 16 },
  'three-inside-down':    { behavior: 'reversal',     successRate: 60, rank: 28 },
};

export const getCandlestickPatterns = (t) => ({
  bullish: [
    {
      id: 'hammer',
      name: t('hammerName'),
      description: t('hammerDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability') + '-' + t('highReliability')
    },
    {
      id: 'bullish-engulfing',
      name: t('engulfingBullName'),
      description: t('engulfingBullDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'morning-star',
      name: t('morningStarName'),
      description: t('morningStarDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'dragonfly-doji',
      name: t('dragonflyDojiName'),
      description: t('dragonflyDojiDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'three-white-soldiers',
      name: t('threeWhiteSoldiersName'),
      description: t('threeWhiteSoldiersDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bullish-harami',
      name: t('bullishHaramiName'),
      description: t('bullishHaramiDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'inverted-hammer',
      name: t('invertedHammerName'),
      description: t('invertedHammerDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'three-inside-up',
      name: t('threeInsideUpName'),
      description: t('threeInsideUpDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'morning-doji-star',
      name: t('morningDojiStarName'),
      description: t('morningDojiStarDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bullish-marubozu',
      name: t('bullishMarubozuName'),
      description: t('bullishMarubozuDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bullish-kicker',
      name: t('bullishKickerName'),
      description: t('bullishKickerDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'piercing-line',
      name: t('piercingLineName'),
      description: t('piercingLineDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'tweezer-bottom',
      name: t('tweezerBottomName'),
      description: t('tweezerBottomDesc'),
      type: 'bullish',
      signal: t('bullishReversal'),
      reliability: t('mediumReliability')
    }
  ],
  bearish: [
    {
      id: 'shooting-star',
      name: t('shootingStarName'),
      description: t('shootingStarDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability') + '-' + t('highReliability')
    },
    {
      id: 'bearish-engulfing',
      name: t('engulfingBearName'),
      description: t('engulfingBearDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'evening-star',
      name: t('eveningStarName'),
      description: t('eveningStarDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'gravestone-doji',
      name: t('gravestoneDojiName'),
      description: t('gravestoneDojiDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'three-black-crows',
      name: t('threeBlackCrowsName'),
      description: t('threeBlackCrowsDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bearish-harami',
      name: t('bearishHaramiName'),
      description: t('bearishHaramiDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'hanging-man',
      name: t('hangingManName'),
      description: t('hangingManDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'three-inside-down',
      name: t('threeInsideDownName'),
      description: t('threeInsideDownDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'evening-doji-star',
      name: t('eveningDojiStarName'),
      description: t('eveningDojiStarDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bearish-marubozu',
      name: t('bearishMarubozuName'),
      description: t('bearishMarubozuDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'bearish-kicker',
      name: t('bearishKickerName'),
      description: t('bearishKickerDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('highReliability')
    },
    {
      id: 'dark-cloud-cover',
      name: t('darkCloudName'),
      description: t('darkCloudDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'tweezer-top',
      name: t('tweezerTopName'),
      description: t('tweezerTopDesc'),
      type: 'bearish',
      signal: t('bearishReversal'),
      reliability: t('mediumReliability')
    }
  ],
  neutral: [
    {
      id: 'doji',
      name: t('dojiName'),
      description: t('dojiDesc'),
      type: 'neutral',
      signal: t('indecisionSignal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'spinning-top',
      name: t('spinningTopName'),
      description: t('spinningTopDesc'),
      type: 'neutral',
      signal: t('indecisionSignal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'long-legged-doji',
      name: t('longLeggedDojiName'),
      description: t('longLeggedDojiDesc'),
      type: 'neutral',
      signal: t('indecisionSignal'),
      reliability: t('mediumReliability')
    },
    {
      id: 'high-wave',
      name: t('highWaveName'),
      description: t('highWaveDesc'),
      type: 'neutral',
      signal: t('indecisionSignal'),
      reliability: t('mediumReliability')
    }
  ]
});

export const getRiskManagementConcepts = (t) => [
  {
    id: 'position-sizing',
    title: t('positionSizingTitle'),
    description: t('positionSizingDesc'),
    importance: 'critical'
  },
  {
    id: 'risk-reward',
    title: t('riskRewardTitle'),
    description: t('riskRewardDesc'),
    importance: 'critical'
  },
  {
    id: 'diversification',
    title: t('diversificationTitle'),
    description: t('diversificationDesc'),
    importance: 'high'
  },
  {
    id: 'stop-loss',
    title: t('riskStopLossTitle'),
    description: t('riskStopLossDesc'),
    importance: 'critical'
  },
  {
    id: 'max-drawdown',
    title: t('riskDrawdownTitle'),
    description: t('riskDrawdownDesc'),
    importance: 'critical'
  },
  {
    id: 'risk-of-ruin',
    title: t('riskOfRuinTitle'),
    description: t('riskOfRuinDesc'),
    importance: 'critical'
  },
  {
    id: 'daily-loss',
    title: t('riskDailyLossTitle'),
    description: t('riskDailyLossDesc'),
    importance: 'high'
  },
  {
    id: 'leverage-risk',
    title: t('riskLeverageTitle'),
    description: t('riskLeverageDesc'),
    importance: 'critical'
  },
  {
    id: 'gap-risk',
    title: t('riskGapTitle'),
    description: t('riskGapDesc'),
    importance: 'high'
  },
  {
    id: 'correlation-risk',
    title: t('riskCorrelationTitle'),
    description: t('riskCorrelationDesc'),
    importance: 'high'
  },
  {
    id: 'tail-risk',
    title: t('riskTailTitle'),
    description: t('riskTailDesc'),
    importance: 'high'
  },
  {
    id: 'portfolio-heat',
    title: t('riskHeatTitle'),
    description: t('riskHeatDesc'),
    importance: 'high'
  },
  {
    id: 'sizing-methods',
    title: t('riskSizingTitle'),
    description: t('riskSizingDesc'),
    importance: 'high'
  },
  {
    id: 'hedging',
    title: t('riskHedgingTitle'),
    description: t('riskHedgingDesc'),
    importance: 'medium'
  }
];

export const getGoldenRules = (t) => ({
  title: t('goldenRulesTitle'),
  intro: t('goldenRulesIntro'),
  rules: [
    { id: 'g1', name: t('goldenRule1Name'), desc: t('goldenRule1Desc') },
    { id: 'g2', name: t('goldenRule2Name'), desc: t('goldenRule2Desc') },
    { id: 'g3', name: t('goldenRule3Name'), desc: t('goldenRule3Desc') },
    { id: 'g4', name: t('goldenRule4Name'), desc: t('goldenRule4Desc') },
    { id: 'g5', name: t('goldenRule5Name'), desc: t('goldenRule5Desc') },
    { id: 'g6', name: t('goldenRule6Name'), desc: t('goldenRule6Desc') },
    { id: 'g7', name: t('goldenRule7Name'), desc: t('goldenRule7Desc') },
    { id: 'g8', name: t('goldenRule8Name'), desc: t('goldenRule8Desc') },
  ],
});

export const getDowTheory = (t) => ({
  title: t('dowTheoryTitle'),
  intro: t('dowTheoryIntro'),
  principles: [
    {
      id: 1,
      title: t('dowPrinciple1Title'),
      description: t('dowPrinciple1Desc'),
      importance: 'critical'
    },
    {
      id: 2,
      title: t('dowPrinciple2Title'),
      description: t('dowPrinciple2Desc'),
      importance: 'critical'
    },
    {
      id: 3,
      title: t('dowPrinciple3Title'),
      description: t('dowPrinciple3Desc'),
      importance: 'high'
    },
    {
      id: 4,
      title: t('dowPrinciple4Title'),
      description: t('dowPrinciple4Desc'),
      importance: 'high'
    },
    {
      id: 5,
      title: t('dowPrinciple5Title'),
      description: t('dowPrinciple5Desc'),
      importance: 'critical'
    },
    {
      id: 6,
      title: t('dowPrinciple6Title'),
      description: t('dowPrinciple6Desc'),
      importance: 'critical'
    }
  ],
  application: {
    title: t('dowApplicationTitle'),
    description: t('dowApplicationDesc')
  },
  limitations: {
    title: t('dowLimitationsTitle'),
    description: t('dowLimitationsDesc')
  }
});

// The trader's craft — the professional PROCESS: trade management, a written
// plan + pre-trade checklist, thinking in R, and treating trading as a business.
export const getTraderCraft = (t) => ({
  title: t('craftTitle'),
  intro: t('craftIntro'),
  management: {
    title: t('mgmtTitle'),
    intro: t('mgmtIntro'),
    items: [
      { id: 'breakeven',  name: t('mgmtBreakevenName'),  desc: t('mgmtBreakevenDesc') },
      { id: 'partials',   name: t('mgmtPartialsName'),   desc: t('mgmtPartialsDesc') },
      { id: 'trailing',   name: t('mgmtTrailingName'),   desc: t('mgmtTrailingDesc') },
      { id: 'pyramiding', name: t('mgmtPyramidingName'), desc: t('mgmtPyramidingDesc') },
      { id: 'takeprofit', name: t('mgmtTakeProfitName'), desc: t('mgmtTakeProfitDesc') },
      { id: 'cutquick',   name: t('mgmtCutQuickName'),   desc: t('mgmtCutQuickDesc') },
    ],
  },
  plan: {
    title: t('planTitle'),
    intro: t('planIntro'),
    checklistTitle: t('planChecklistTitle'),
    checklist: [t('planCheck1'), t('planCheck2'), t('planCheck3'), t('planCheck4'), t('planCheck5'), t('planCheck6')],
  },
  rmultiple: {
    title: t('rTitle'),
    intro: t('rIntro'),
    items: [
      { id: 'whatisr',    name: t('rWhatIsName'),     desc: t('rWhatIsDesc') },
      { id: 'whyr',       name: t('rWhyName'),        desc: t('rWhyDesc') },
      { id: 'expectancy', name: t('rExpectancyName'), desc: t('rExpectancyDesc') },
      { id: 'recordr',    name: t('rRecordName'),     desc: t('rRecordDesc') },
    ],
  },
  business: {
    title: t('bizTitle'),
    intro: t('bizIntro'),
    items: [
      { id: 'process',      name: t('bizProcessName'),      desc: t('bizProcessDesc') },
      { id: 'expectations', name: t('bizExpectationsName'), desc: t('bizExpectationsDesc') },
      { id: 'treatbiz',     name: t('bizTreatName'),        desc: t('bizTreatDesc') },
      { id: 'survive',      name: t('bizSurviveName'),      desc: t('bizSurviveDesc') },
    ],
  },
  journal: {
    title: t('cjTitle'),
    intro: t('cjIntro'),
    items: [
      { id: 'review',  name: t('cjReviewName'),  desc: t('cjReviewDesc') },
      { id: 'tags',    name: t('cjTagsName'),    desc: t('cjTagsDesc') },
      { id: 'metrics', name: t('cjMetricsName'), desc: t('cjMetricsDesc') },
    ],
  },
  testing: {
    title: t('ctTitle'),
    intro: t('ctIntro'),
    items: [
      { id: 'backtest', name: t('ctBacktestName'), desc: t('ctBacktestDesc') },
      { id: 'forward',  name: t('ctForwardName'),  desc: t('ctForwardDesc') },
      { id: 'sample',   name: t('ctSampleName'),   desc: t('ctSampleDesc') },
    ],
  },
  routine: {
    title: t('crTitle'),
    intro: t('crIntro'),
    items: [
      { id: 'pre',    name: t('crPreName'),    desc: t('crPreDesc') },
      { id: 'during', name: t('crDuringName'), desc: t('crDuringDesc') },
      { id: 'post',   name: t('crPostName'),   desc: t('crPostDesc') },
    ],
  },
  regimes: {
    title: t('cgTitle'),
    intro: t('cgIntro'),
    items: [
      { id: 'trend',    name: t('cgTrendName'),    desc: t('cgTrendDesc'),    type: 'bullish' },
      { id: 'range',    name: t('cgRangeName'),    desc: t('cgRangeDesc'),    type: 'neutral' },
      { id: 'volatile', name: t('cgVolatileName'), desc: t('cgVolatileDesc'), type: 'bearish' },
    ],
    note: t('cgNote'),
  },
});

// Advanced technical analysis: volume-based tools and dedicated concepts that
// complement the base TA tab (supply/demand, profiles, divergences, VSA...).
export const getAdvancedTA = (t) => ({
  title: t('advTaTitle'),
  intro: t('advTaIntro'),
  items: [
    { id: 'supplydemand', name: t('advSupplyDemandName'), desc: t('advSupplyDemandDesc') },
    { id: 'volprofile',   name: t('advVolProfileName'),   desc: t('advVolProfileDesc') },
    { id: 'vwap',         name: t('advVwapName'),         desc: t('advVwapDesc') },
    { id: 'divergence',   name: t('advDivergenceName'),   desc: t('advDivergenceDesc') },
    { id: 'pivots',       name: t('advPivotsName'),       desc: t('advPivotsDesc') },
    { id: 'vsa',          name: t('advVsaName'),          desc: t('advVsaDesc') },
    { id: 'squeeze',      name: t('advSqueezeName'),      desc: t('advSqueezeDesc') },
  ],
});

// The trading business: funding, taxes, compounding — plus instrument deep
// dives (crypto mechanics, futures/forex specifications).
export const getTradingBusiness = (t) => ({
  title: t('tbizTitle'),
  intro: t('tbizIntro'),
  items: [
    { id: 'propfirms', name: t('tbizPropName'),     desc: t('tbizPropDesc') },
    { id: 'taxes',     name: t('tbizTaxesName'),    desc: t('tbizTaxesDesc') },
    { id: 'compound',  name: t('tbizCompoundName'), desc: t('tbizCompoundDesc') },
    { id: 'fulltime',  name: t('tbizFulltimeName'), desc: t('tbizFulltimeDesc') },
  ],
  instruments: {
    title: t('tbizInstrTitle'),
    items: [
      { id: 'cryptodeep',  name: t('tbizCryptoName'),  desc: t('tbizCryptoDesc') },
      { id: 'futuresdeep', name: t('tbizFuturesName'), desc: t('tbizFuturesDesc') },
    ],
  },
});

// Options strategies: combining calls/puts for defined-risk, volatility and
// income plays. Pairs with the Options Calculator (greeks + payoff diagram).
export const getOptionsStrategies = (t) => ({
  title: t('optTitle'),
  intro: t('optIntro'),
  items: [
    { id: 'coveredcall',   name: t('optCoveredCallName'),   desc: t('optCoveredCallDesc'),   type: 'bullish' },
    { id: 'cashput',       name: t('optCashPutName'),       desc: t('optCashPutDesc'),       type: 'bullish' },
    { id: 'bullspread',    name: t('optBullSpreadName'),    desc: t('optBullSpreadDesc'),    type: 'bullish' },
    { id: 'bearspread',    name: t('optBearSpreadName'),    desc: t('optBearSpreadDesc'),    type: 'bearish' },
    { id: 'ironcondor',    name: t('optIronCondorName'),    desc: t('optIronCondorDesc'),    type: 'neutral' },
    { id: 'straddle',      name: t('optStraddleName'),      desc: t('optStraddleDesc'),      type: 'neutral' },
    { id: 'protectiveput', name: t('optProtectivePutName'), desc: t('optProtectivePutDesc'), type: 'bearish' },
  ],
  note: t('optNote'),
});

// News/event trading: how pros handle high-impact releases (NFP, CPI, rates).
export const getNewsTrading = (t) => ({
  title: t('ntTitle'),
  intro: t('ntIntro'),
  items: [
    { id: 'events', name: t('ntWhoName'),    desc: t('ntWhoDesc') },
    { id: 'before', name: t('ntBeforeName'), desc: t('ntBeforeDesc') },
    { id: 'spread', name: t('ntSpreadName'), desc: t('ntSpreadDesc') },
    { id: 'spike',  name: t('ntSpikeName'),  desc: t('ntSpikeDesc') },
    { id: 'strats', name: t('ntStratsName'), desc: t('ntStratsDesc') },
  ],
  note: t('ntNote'),
});

// Market sentiment: VIX, put/call, Fear&Greed, surveys — contrarian reading.
export const getSentiment = (t) => ({
  title: t('smTitle'),
  intro: t('smIntro'),
  items: [
    { id: 'vix',       name: t('smVixName'),       desc: t('smVixDesc') },
    { id: 'putcall',   name: t('smPutCallName'),   desc: t('smPutCallDesc') },
    { id: 'feargreed', name: t('smFearGreedName'), desc: t('smFearGreedDesc') },
    { id: 'surveys',   name: t('smSurveysName'),   desc: t('smSurveysDesc') },
    { id: 'contrarian',name: t('smContrarianName'),desc: t('smContrarianDesc') },
  ],
});

// Intermarket analysis (Murphy): dollar, yields, commodities, equities, FX correlations.
export const getIntermarket = (t) => ({
  title: t('imTitle'),
  intro: t('imIntro'),
  items: [
    { id: 'dollar',   name: t('imDollarName'),   desc: t('imDollarDesc') },
    { id: 'yields',   name: t('imYieldsName'),   desc: t('imYieldsDesc') },
    { id: 'riskonoff',name: t('imRiskName'),     desc: t('imRiskDesc') },
    { id: 'fxcorr',   name: t('imFxCorrName'),   desc: t('imFxCorrDesc') },
    { id: 'rs',       name: t('imRsName'),       desc: t('imRsDesc') },
    { id: 'use',      name: t('imUseName'),      desc: t('imUseDesc') },
  ],
});

// Market breadth + cycles & seasonality (CMT staples).
export const getBreadthCycles = (t) => ({
  title: t('bcTitle'),
  intro: t('bcIntro'),
  items: [
    { id: 'ad',        name: t('bcAdName'),        desc: t('bcAdDesc') },
    { id: 'highslows', name: t('bcHlName'),        desc: t('bcHlDesc') },
    { id: 'mcclellan', name: t('bcMcClellanName'), desc: t('bcMcClellanDesc') },
    { id: 'seasonal',  name: t('bcSeasonalName'),  desc: t('bcSeasonalDesc') },
    { id: 'cycles',    name: t('bcCyclesName'),    desc: t('bcCyclesDesc') },
  ],
  note: t('bcNote'),
});

// Broker safety: regulation, segregated funds and how to spot scams.
export const getBrokerSafety = (t) => ({
  title: t('bkrTitle'),
  intro: t('bkrIntro'),
  items: [
    { id: 'regulation', name: t('bkrRegulationName'), desc: t('bkrRegulationDesc') },
    { id: 'segregated', name: t('bkrSegregatedName'), desc: t('bkrSegregatedDesc') },
    { id: 'redflags',   name: t('bkrRedFlagsName'),   desc: t('bkrRedFlagsDesc') },
    { id: 'gurus',      name: t('bkrGurusName'),      desc: t('bkrGurusDesc') },
    { id: 'ponzi',      name: t('bkrPonziName'),      desc: t('bkrPonziDesc') },
    { id: 'checklist',  name: t('bkrChecklistName'),  desc: t('bkrChecklistDesc') },
  ],
});

// Margin & liquidation in leveraged derivatives: isolated vs cross, position
// modes, mark price, funding, liquidation hunting and anti-manipulation engines.
export const getMarginLiquidation = (t) => ({
  title: t('mlqTitle'),
  intro: t('mlqIntro'),
  items: [
    { id: 'isolated',  name: t('mlqIsolatedName'),  desc: t('mlqIsolatedDesc') },
    { id: 'cross',     name: t('mlqCrossName'),     desc: t('mlqCrossDesc') },
    { id: 'mode',      name: t('mlqModeName'),      desc: t('mlqModeDesc') },
    { id: 'liqprice',  name: t('mlqLiqPriceName'),  desc: t('mlqLiqPriceDesc') },
    { id: 'markprice', name: t('mlqMarkPriceName'), desc: t('mlqMarkPriceDesc') },
    { id: 'funding',   name: t('mlqFundingName'),   desc: t('mlqFundingDesc') },
    { id: 'wicks',     name: t('mlqWicksName'),     desc: t('mlqWicksDesc') },
    { id: 'shield',    name: t('mlqShieldName'),    desc: t('mlqShieldDesc') },
  ],
  note: t('mlqNote'),
});

// Option greeks theory with numeric examples. Pairs with the Black-Scholes
// calculator and the portfolio-greeks panel on the Options page.
export const getOptionGreeks = (t) => ({
  title: t('gkTitle'),
  intro: t('gkIntro'),
  items: [
    { id: 'delta', name: t('gkDeltaName'), desc: t('gkDeltaDesc') },
    { id: 'gamma', name: t('gkGammaName'), desc: t('gkGammaDesc') },
    { id: 'theta', name: t('gkThetaName'), desc: t('gkThetaDesc') },
    { id: 'vega',  name: t('gkVegaName'),  desc: t('gkVegaDesc') },
    { id: 'rho',   name: t('gkRhoName'),   desc: t('gkRhoDesc') },
    { id: 'iv',    name: t('gkIvName'),    desc: t('gkIvDesc') },
  ],
  note: t('gkNote'),
});

// The institutional trading desk: roles, execution algos, microstructure,
// risk governance, P&L attribution and desk process — with what retail can steal.
export const getInstitutionalDesk = (t) => ({
  title: t('ideskTitle'),
  intro: t('ideskIntro'),
  items: [
    { id: 'roles',   name: t('ideskRolesName'),   desc: t('ideskRolesDesc') },
    { id: 'algo',    name: t('ideskAlgoName'),    desc: t('ideskAlgoDesc') },
    { id: 'impact',  name: t('ideskImpactName'),  desc: t('ideskImpactDesc') },
    { id: 'var',     name: t('ideskVarName'),     desc: t('ideskVarDesc') },
    { id: 'attrib',  name: t('ideskAttribName'),  desc: t('ideskAttribDesc') },
    { id: 'routine', name: t('ideskRoutineName'), desc: t('ideskRoutineDesc') },
  ],
  note: t('ideskNote'),
});

// Institutional METHODS — what banks/funds/prop desks genuinely use (VWAP, GEX,
// Volume Profile, stat-arb, risk parity, order flow), with an honest line
// between real institutional behaviour and retail marketing packaging.
export const getInstitutionalMethods = (t) => ({
  title: t('imethTitle'),
  intro: t('imethIntro'),
  items: [
    { id: 'real',       name: t('imethRealName'),       desc: t('imethRealDesc'),       type: 'neutral' },
    { id: 'vwap',       name: t('imethVwapName'),       desc: t('imethVwapDesc'),       type: 'neutral' },
    { id: 'gex',        name: t('imethGexName'),        desc: t('imethGexDesc'),        type: 'neutral' },
    { id: 'profile',    name: t('imethProfileName'),    desc: t('imethProfileDesc'),    type: 'neutral' },
    { id: 'statarb',    name: t('imethStatarbName'),    desc: t('imethStatarbDesc'),    type: 'neutral' },
    { id: 'riskparity', name: t('imethRiskparityName'), desc: t('imethRiskparityDesc'), type: 'neutral' },
    { id: 'flow',       name: t('imethFlowName'),       desc: t('imethFlowDesc'),       type: 'bearish' },
  ],
  note: t('imethNote'),
});

// Institutional POSITION CONSTRUCTION — how large orders are actually built and
// unwound without moving the market: slicing, VWAP/TWAP/POV, icebergs,
// anti-detection jitter, accumulation/distribution campaigns and exit.
export const getPositionBuilding = (t) => ({
  title: t('iposTitle'),
  intro: t('iposIntro'),
  items: [
    { id: 'why',      name: t('iposWhyName'),      desc: t('iposWhyDesc'),      type: 'neutral' },
    { id: 'slice',    name: t('iposSliceName'),    desc: t('iposSliceDesc'),    type: 'neutral' },
    { id: 'algos',    name: t('iposAlgosName'),    desc: t('iposAlgosDesc'),    type: 'neutral' },
    { id: 'iceberg',  name: t('iposIcebergName'),  desc: t('iposIcebergDesc'),  type: 'neutral' },
    { id: 'jitter',   name: t('iposJitterName'),   desc: t('iposJitterDesc'),   type: 'bearish' },
    { id: 'campaign', name: t('iposCampaignName'), desc: t('iposCampaignDesc'), type: 'neutral' },
    { id: 'unwind',   name: t('iposUnwindName'),   desc: t('iposUnwindDesc'),   type: 'bearish' },
  ],
  note: t('iposNote'),
});

// Probabilistic mindset (Mark Douglas, "Trading in the Zone"): thinking in
// probabilities, the 5 fundamental truths, the 7 principles of consistency,
// the 4 fears, truly accepting risk, the edge/casino mentality, and the zone.
export const getTradingMindset = (t) => ({
  title: t('mdzTitle'),
  intro: t('mdzIntro'),
  items: [
    { id: 'probs',  name: t('mdzProbsName'),  desc: t('mdzProbsDesc') },
    { id: 'truths', name: t('mdzTruthsName'), desc: t('mdzTruthsDesc') },
    { id: 'seven',  name: t('mdzSevenName'),  desc: t('mdzSevenDesc') },
    { id: 'fears',  name: t('mdzFearsName'),  desc: t('mdzFearsDesc') },
    { id: 'accept', name: t('mdzAcceptName'), desc: t('mdzAcceptDesc') },
    { id: 'edge',   name: t('mdzEdgeName'),   desc: t('mdzEdgeDesc') },
    { id: 'zone',   name: t('mdzZoneName'),   desc: t('mdzZoneDesc') },
  ],
  note: t('mdzNote'),
});

// Trading masters — distilled lessons from the greatest traders (Livermore,
// Tudor Jones, Soros, Seykota, Dennis/Turtles, Van Tharp, Elder, Weinstein).
// Note what they all REPEAT: risk management and discipline over entry method.
export const getTradingMasters = (t) => ({
  title: t('mstrTitle'),
  intro: t('mstrIntro'),
  items: [
    { id: 'livermore', name: t('mstrLivermoreName'), desc: t('mstrLivermoreDesc') },
    { id: 'tudor',     name: t('mstrTudorName'),     desc: t('mstrTudorDesc') },
    { id: 'soros',     name: t('mstrSorosName'),     desc: t('mstrSorosDesc') },
    { id: 'seykota',   name: t('mstrSeykotaName'),   desc: t('mstrSeykotaDesc') },
    { id: 'dennis',    name: t('mstrDennisName'),    desc: t('mstrDennisDesc') },
    { id: 'tharp',     name: t('mstrTharpName'),     desc: t('mstrTharpDesc') },
    { id: 'elder',     name: t('mstrElderName'),     desc: t('mstrElderDesc') },
    { id: 'weinstein', name: t('mstrWeinsteinName'), desc: t('mstrWeinsteinDesc') },
  ],
  note: t('mstrNote'),
});

// Futures masters — reference futures traders with verified track records
// (Donchian, Larry Williams, Kovner, Marcus, Trout, Eckhardt). Pattern: trend
// following + obsessive risk control, because leverage punishes indiscipline.
export const getFuturesMasters = (t) => ({
  title: t('fmstTitle'),
  intro: t('fmstIntro'),
  items: [
    { id: 'donchian', name: t('fmstDonchianName'), desc: t('fmstDonchianDesc') },
    { id: 'williams', name: t('fmstWilliamsName'), desc: t('fmstWilliamsDesc') },
    { id: 'kovner',   name: t('fmstKovnerName'),   desc: t('fmstKovnerDesc') },
    { id: 'marcus',   name: t('fmstMarcusName'),   desc: t('fmstMarcusDesc') },
    { id: 'trout',    name: t('fmstTroutName'),    desc: t('fmstTroutDesc') },
    { id: 'eckhardt', name: t('fmstEckhardtName'), desc: t('fmstEckhardtDesc') },
  ],
  note: t('fmstNote'),
});

// Partial exits / scaling out — an honest take: what it is, the case for it
// (psychology + risk), the honest counter-argument (it usually lowers
// expectancy), the two common strategies, the R-math and the common mistakes.
export const getPartialExits = (t) => ({
  title: t('pexTitle'),
  intro: t('pexIntro'),
  items: [
    { id: 'what',     name: t('pexWhatName'),     desc: t('pexWhatDesc') },
    { id: 'pros',     name: t('pexProsName'),     desc: t('pexProsDesc') },
    { id: 'cons',     name: t('pexConsName'),     desc: t('pexConsDesc') },
    { id: 'half',     name: t('pexHalfName'),     desc: t('pexHalfDesc') },
    { id: 'thirds',   name: t('pexThirdsName'),   desc: t('pexThirdsDesc') },
    { id: 'math',     name: t('pexMathName'),     desc: t('pexMathDesc') },
    { id: 'mistakes', name: t('pexMistakesName'), desc: t('pexMistakesDesc') },
  ],
  note: t('pexNote'),
});

// Entries & exits done right — the non-obvious mechanics of SL/TP and order
// execution: invalidation-based stops, size from the stop, stop types, hard vs
// mental stop, structure targets, R:R vs win-rate, stop-hunting/liquidity,
// order types & real costs, and the classic SL/TP mistakes.
export const getStopsAndTargets = (t) => ({
  title: t('sltpTitle'),
  intro: t('sltpIntro'),
  items: [
    { id: 'invalidation', name: t('sltpInvalidationName'), desc: t('sltpInvalidationDesc') },
    { id: 'stopfirst',    name: t('sltpStopFirstName'),    desc: t('sltpStopFirstDesc') },
    { id: 'stoptypes',    name: t('sltpStopTypesName'),    desc: t('sltpStopTypesDesc') },
    { id: 'hardstop',     name: t('sltpHardStopName'),     desc: t('sltpHardStopDesc') },
    { id: 'target',       name: t('sltpTargetName'),       desc: t('sltpTargetDesc') },
    { id: 'rr',           name: t('sltpRrName'),           desc: t('sltpRrDesc') },
    { id: 'liquidity',    name: t('sltpLiquidityName'),    desc: t('sltpLiquidityDesc') },
    { id: 'orders',       name: t('sltpOrdersName'),       desc: t('sltpOrdersDesc') },
    { id: 'mistakes',     name: t('sltpMistakesName'),     desc: t('sltpMistakesDesc') },
  ],
  note: t('sltpNote'),
});

// Managing the live trade — what to do once you're IN: break-even, trailing,
// pyramiding winners, de-risking, time management, event risk, not
// micromanaging, and when the best action is to do nothing.
export const getTradeManagement = (t) => ({
  title: t('tmgTitle'),
  intro: t('tmgIntro'),
  items: [
    { id: 'breakeven', name: t('tmgBreakevenName'), desc: t('tmgBreakevenDesc') },
    { id: 'trailing',  name: t('tmgTrailingName'),  desc: t('tmgTrailingDesc') },
    { id: 'addwin',    name: t('tmgAddWinName'),    desc: t('tmgAddWinDesc') },
    { id: 'reduce',    name: t('tmgReduceName'),    desc: t('tmgReduceDesc') },
    { id: 'time',      name: t('tmgTimeName'),      desc: t('tmgTimeDesc') },
    { id: 'events',    name: t('tmgEventsName'),    desc: t('tmgEventsDesc') },
    { id: 'micro',     name: t('tmgMicroName'),     desc: t('tmgMicroDesc') },
    { id: 'donothing', name: t('tmgDoNothingName'), desc: t('tmgDoNothingDesc') },
  ],
  note: t('tmgNote'),
});

// Professional discipline & mental performance: process-over-outcome, checklists,
// error taxonomy, tilt/stress protocol, decision fatigue and accountability.
export const getProDiscipline = (t) => ({
  title: t('discTitle'),
  intro: t('discIntro'),
  items: [
    { id: 'process',   name: t('discProcessName'),   desc: t('discProcessDesc') },
    { id: 'checklist', name: t('discChecklistName'), desc: t('discChecklistDesc') },
    { id: 'errors',    name: t('discErrorsName'),    desc: t('discErrorsDesc') },
    { id: 'tilt',      name: t('discTiltName'),      desc: t('discTiltDesc') },
    { id: 'fatigue',   name: t('discFatigueName'),   desc: t('discFatigueDesc') },
  ],
  note: t('discNote'),
});

// Smart Money Concepts (ICT-style): tracking institutional footprints —
// structure, order blocks, imbalances, liquidity and where price returns.
export const getSmartMoney = (t) => ({
  title: t('smcTitle'),
  intro: t('smcIntro'),
  items: [
    { id: 'structure',  name: t('smcStructureName'),  desc: t('smcStructureDesc'),  type: 'neutral' },
    { id: 'orderblock', name: t('smcOrderBlockName'), desc: t('smcOrderBlockDesc'), type: 'bullish' },
    { id: 'fvg',        name: t('smcFvgName'),        desc: t('smcFvgDesc'),        type: 'neutral' },
    { id: 'liquidity',  name: t('smcLiquidityName'),  desc: t('smcLiquidityDesc'),  type: 'neutral' },
    { id: 'grab',       name: t('smcGrabName'),       desc: t('smcGrabDesc'),       type: 'bearish' },
    { id: 'premium',    name: t('smcPremiumName'),    desc: t('smcPremiumDesc'),    type: 'neutral' },
    { id: 'mitigation', name: t('smcMitigationName'), desc: t('smcMitigationDesc'), type: 'bullish' },
  ],
  note: t('smcNote'),
});

// Self-diagnosis catalogue: the most common behaviours that blow up accounts.
// tag: which pillar the cause belongs to (psych | risk | discipline | system).
export const getAccountKillers = (t) => ({
  title: t('killersTitle'),
  intro: t('killersIntro'),
  items: [
    { id: 'leverage',   name: t('killerLeverageName'),   desc: t('killerLeverageDesc'),   tag: 'risk' },
    { id: 'gambling',   name: t('killerGamblingName'),   desc: t('killerGamblingDesc'),   tag: 'psych' },
    { id: 'structure',  name: t('killerStructureName'),  desc: t('killerStructureDesc'),  tag: 'system' },
    { id: 'revenge',    name: t('killerRevengeName'),    desc: t('killerRevengeDesc'),    tag: 'psych' },
    { id: 'nolimits',   name: t('killerNoLimitsName'),   desc: t('killerNoLimitsDesc'),   tag: 'risk' },
    { id: 'adrenaline', name: t('killerAdrenalineName'), desc: t('killerAdrenalineDesc'), tag: 'psych' },
    { id: 'nosystem',   name: t('killerNoSystemName'),   desc: t('killerNoSystemDesc'),   tag: 'system' },
    { id: 'tilt',       name: t('killerTiltName'),       desc: t('killerTiltDesc'),       tag: 'psych' },
    { id: 'ego',        name: t('killerEgoName'),        desc: t('killerEgoDesc'),        tag: 'psych' },
    { id: 'greed',      name: t('killerGreedName'),      desc: t('killerGreedDesc'),      tag: 'psych' },
    { id: 'noconfirm',  name: t('killerNoConfirmName'),  desc: t('killerNoConfirmDesc'),  tag: 'system' },
    { id: 'fatigue',    name: t('killerFatigueName'),    desc: t('killerFatigueDesc'),    tag: 'discipline' },
    { id: 'boredom',    name: t('killerBoredomName'),    desc: t('killerBoredomDesc'),    tag: 'psych' },
    { id: 'nojournal',  name: t('killerNoJournalName'),  desc: t('killerNoJournalDesc'),  tag: 'discipline' },
    { id: 'breakrules', name: t('killerBreakRulesName'), desc: t('killerBreakRulesDesc'), tag: 'discipline' },
    { id: 'fomo',       name: t('killerFomoName'),       desc: t('killerFomoDesc'),       tag: 'psych' },
  ],
});

export const getTradingPsychology = (t) => ({
  title: t('tradingPsychologyTitle'),
  intro: t('tradingPsychologyIntro'),
  cognitiveBiases: {
    title: t('cognitiveBiasesTitle'),
    biases: [
      {
        id: 'fomo',
        title: t('fomoTitle'),
        description: t('fomoDesc'),
        severity: 'high'
      },
      {
        id: 'confirmation',
        title: t('confirmationBiasTitle'),
        description: t('confirmationBiasDesc'),
        severity: 'high'
      },
      {
        id: 'loss-aversion',
        title: t('lossAversionTitle'),
        description: t('lossAversionDesc'),
        severity: 'critical'
      },
      {
        id: 'herd',
        title: t('herdMentalityTitle'),
        description: t('herdMentalityDesc'),
        severity: 'medium'
      },
      {
        id: 'revenge',
        title: t('revengeTradingTitle'),
        description: t('revengeTradingDesc'),
        severity: 'critical'
      },
      {
        id: 'overconfidence',
        title: t('overconfidenceTitle'),
        description: t('overconfidenceDesc'),
        severity: 'high'
      },
      {
        id: 'recency',
        title: t('recencyBiasTitle'),
        description: t('recencyBiasDesc'),
        severity: 'high'
      },
      {
        id: 'anchoring',
        title: t('anchoringBiasTitle'),
        description: t('anchoringBiasDesc'),
        severity: 'medium'
      },
      {
        id: 'gambler',
        title: t('gamblersFallacyTitle'),
        description: t('gamblersFallacyDesc'),
        severity: 'high'
      },
      {
        id: 'sunk-cost',
        title: t('sunkCostTitle'),
        description: t('sunkCostDesc'),
        severity: 'high'
      }
    ]
  },
  emotions: {
    title: t('traderEmotionsTitle'),
    intro: t('traderEmotionsIntro'),
    items: [
      { id: 'greed', title: t('emotionGreedTitle'), description: t('emotionGreedDesc'), type: 'bearish' },
      { id: 'fear', title: t('emotionFearTitle'), description: t('emotionFearDesc'), type: 'bearish' },
      { id: 'hope', title: t('emotionHopeTitle'), description: t('emotionHopeDesc'), type: 'bearish' },
      { id: 'euphoria', title: t('emotionEuphoriaTitle'), description: t('emotionEuphoriaDesc'), type: 'bearish' },
    ],
  },
  emotionalControl: {
    title: t('emotionalControlTitle'),
    techniques: [
      {
        id: 'losing-streaks',
        title: t('losingStreaksTitle'),
        description: t('losingStreaksDesc'),
        importance: 'critical'
      },
      {
        id: 'winning-discipline',
        title: t('winningDisciplineTitle'),
        description: t('winningDisciplineDesc'),
        importance: 'high'
      },
      {
        id: 'overtrading',
        title: t('overtradingTitle'),
        description: t('overtradingDesc'),
        importance: 'high'
      },
      {
        id: 'routines',
        title: t('tradingRoutinesTitle'),
        description: t('tradingRoutinesDesc'),
        importance: 'medium'
      },
      {
        id: 'accept-losses',
        title: t('acceptLossesTitle'),
        description: t('acceptLossesDesc'),
        importance: 'critical'
      },
      {
        id: 'patience',
        title: t('patienceTitle'),
        description: t('patienceDesc'),
        importance: 'high'
      },
      {
        id: 'tilt',
        title: t('tiltControlTitle'),
        description: t('tiltControlDesc'),
        importance: 'high'
      }
    ]
  },
  drawdown: {
    title: t('pddTitle'),
    intro: t('pddIntro'),
    items: [
      { id: 'reduce',  title: t('pddReduceName'),  description: t('pddReduceDesc') },
      { id: 'review',  title: t('pddReviewName'),  description: t('pddReviewDesc') },
      { id: 'rebuild', title: t('pddRebuildName'), description: t('pddRebuildDesc') },
    ],
  },
  health: {
    title: t('phTitle'),
    intro: t('phIntro'),
    items: [
      { id: 'sleep',   title: t('phSleepName'),   description: t('phSleepDesc') },
      { id: 'stress',  title: t('phStressName'),  description: t('phStressDesc') },
      { id: 'burnout', title: t('phBurnoutName'), description: t('phBurnoutDesc') },
    ],
  }
});

export const getCapitalManagement = (t) => ({
  title: t('capitalManagementTitle'),
  intro: t('capitalManagementIntro'),
  capitalRules: {
    title: t('capitalRulesTitle'),
    rules: [
      {
        id: 'one-percent',
        title: t('onePercentRuleTitle'),
        description: t('onePercentRuleDesc'),
        importance: 'critical'
      },
      {
        id: 'kelly',
        title: t('kellyCriterionTitle'),
        description: t('kellyCriterionDesc'),
        importance: 'high'
      },
      {
        id: 'scaling',
        title: t('positionScalingTitle'),
        description: t('positionScalingDesc'),
        importance: 'medium'
      },
      {
        id: 'diversification',
        title: t('diversificationRuleTitle'),
        description: t('diversificationRuleDesc'),
        importance: 'high'
      }
    ]
  },
  riskReward: {
    title: t('riskRewardRulesTitle'),
    concepts: [
      {
        id: 'minimum-rr',
        title: t('minimumRRTitle'),
        description: t('minimumRRDesc'),
        importance: 'critical'
      },
      {
        id: 'rr-calculation',
        title: t('rrCalculationTitle'),
        description: t('rrCalculationDesc'),
        importance: 'critical'
      }
    ]
  }
});

export const getTradingStrategies = (t) => ({
  title: t('tradingStrategiesTitle'),
  intro: t('tradingStrategiesIntro'),
  strategies: [
    {
      id: 'strategy-1',
      title: t('strategy1Title'),
      timeframe: t('strategy1Timeframe'),
      setup: t('strategy1Setup'),
      entry: t('strategy1Entry'),
      exit: t('strategy1Exit'),
      tips: t('strategy1Tips'),
      difficulty: 'beginner',
      winRate: '55-60%'
    },
    {
      id: 'strategy-2',
      title: t('strategy2Title'),
      timeframe: t('strategy2Timeframe'),
      setup: t('strategy2Setup'),
      entry: t('strategy2Entry'),
      exit: t('strategy2Exit'),
      tips: t('strategy2Tips'),
      difficulty: 'intermediate',
      winRate: '50-55%'
    },
    {
      id: 'strategy-3',
      title: t('strategy3Title'),
      timeframe: t('strategy3Timeframe'),
      setup: t('strategy3Setup'),
      entry: t('strategy3Entry'),
      exit: t('strategy3Exit'),
      tips: t('strategy3Tips'),
      difficulty: 'beginner',
      winRate: '45-50%'
    },
    {
      id: 'strategy-4',
      title: t('strategy4Title'),
      timeframe: t('strategy4Timeframe'),
      setup: t('strategy4Setup'),
      entry: t('strategy4Entry'),
      exit: t('strategy4Exit'),
      tips: t('strategy4Tips'),
      difficulty: 'advanced',
      winRate: '60-65%'
    },
    {
      id: 'strategy-5',
      title: t('strategy5Title'),
      timeframe: t('strategy5Timeframe'),
      setup: t('strategy5Setup'),
      entry: t('strategy5Entry'),
      exit: t('strategy5Exit'),
      tips: t('strategy5Tips'),
      difficulty: 'intermediate',
      winRate: '55-60%'
    },
    {
      id: 'strategy-6',
      title: t('strategy6Title'),
      timeframe: t('strategy6Timeframe'),
      winRate: t('strategy6WinRate'),
      difficulty: 'intermediate',
      setup: t('strategy6Setup'),
      entry: t('strategy6Entry'),
      exit: t('strategy6Exit'),
      tips: t('strategy6Tips'),
    },
    {
      id: 'strategy-7',
      title: t('strategy7Title'),
      timeframe: t('strategy7Timeframe'),
      winRate: t('strategy7WinRate'),
      difficulty: 'intermediate',
      setup: t('strategy7Setup'),
      entry: t('strategy7Entry'),
      exit: t('strategy7Exit'),
      tips: t('strategy7Tips'),
    },
    {
      id: 'strategy-8',
      title: t('strategy8Title'),
      timeframe: t('strategy8Timeframe'),
      winRate: t('strategy8WinRate'),
      difficulty: 'advanced',
      setup: t('strategy8Setup'),
      entry: t('strategy8Entry'),
      exit: t('strategy8Exit'),
      tips: t('strategy8Tips'),
    },
    {
      id: 'strategy-9',
      title: t('strategy9Title'),
      timeframe: t('strategy9Timeframe'),
      winRate: t('strategy9WinRate'),
      difficulty: 'advanced',
      setup: t('strategy9Setup'),
      entry: t('strategy9Entry'),
      exit: t('strategy9Exit'),
      tips: t('strategy9Tips'),
    }
  ]
});

export const getProbabilityStatistics = (t) => ({
  title: t('probabilityStatsTitle'),
  intro: t('probabilityStatsIntro'),
  sections: {
    mathematicalExpectation: {
      title: t('mathematicalExpectationTitle'),
      concepts: [
        {
          id: 'expectation-formula',
          title: t('expectationFormulaTitle'),
          description: t('expectationFormulaDesc'),
          importance: 'critical'
        },
        {
          id: 'why-expectation-matters',
          title: t('whyExpectationMattersTitle'),
          description: t('whyExpectationMattersDesc'),
          importance: 'critical'
        }
      ]
    },
    lawOfLargeNumbers: {
      title: t('lawOfLargeNumbersTitle'),
      concepts: [
        {
          id: 'large-numbers-concept',
          title: t('largeNumbersConceptTitle'),
          description: t('largeNumbersConceptDesc'),
          importance: 'high'
        },
        {
          id: 'variance-short-term',
          title: t('varianceShortTermTitle'),
          description: t('varianceShortTermDesc'),
          importance: 'critical'
        }
      ]
    },
    resultsDistribution: {
      title: t('resultsDistributionTitle'),
      concepts: [
        {
          id: 'normal-distribution',
          title: t('normalDistributionTitle'),
          description: t('normalDistributionDesc'),
          importance: 'high'
        },
        {
          id: 'outliers-impact',
          title: t('outliersImpactTitle'),
          description: t('outliersImpactDesc'),
          importance: 'high'
        }
      ]
    },
    streaksManagement: {
      title: t('streaksManagementTitle'),
      concepts: [
        {
          id: 'losing-streak-prob',
          title: t('losingStreakProbTitle'),
          description: t('losingStreakProbDesc'),
          importance: 'critical'
        },
        {
          id: 'psychological-impact',
          title: t('psychologicalImpactTitle'),
          description: t('psychologicalImpactDesc'),
          importance: 'high'
        }
      ]
    },
    varianceStdDev: {
      title: t('varianceStdDevTitle'),
      concepts: [
        {
          id: 'volatility-results',
          title: t('volatilityOfResultsTitle'),
          description: t('volatilityOfResultsDesc'),
          importance: 'medium'
        },
        {
          id: 'sharpe-ratio',
          title: t('sharpeRatioTitle'),
          description: t('sharpeRatioDesc'),
          importance: 'high'
        }
      ]
    },
    correlation: {
      title: t('correlationTitle'),
      concepts: [
        {
          id: 'correlation-concept',
          title: t('correlationConceptTitle'),
          description: t('correlationConceptDesc'),
          importance: 'medium'
        },
        {
          id: 'diversification-correlation',
          title: t('diversificationCorrelationTitle'),
          description: t('diversificationCorrelationDesc'),
          importance: 'high'
        }
      ]
    },
    keyMetrics: {
      title: t('keyMetricsTitle'),
      metrics: [
        {
          id: 'win-rate',
          title: t('winRateMetricTitle'),
          description: t('winRateMetricDesc'),
          importance: 'high'
        },
        {
          id: 'profit-factor',
          title: t('profitFactorMetricTitle'),
          description: t('profitFactorMetricDesc'),
          importance: 'critical'
        },
        {
          id: 'r-multiple',
          title: t('rMultipleMetricTitle'),
          description: t('rMultipleMetricDesc'),
          importance: 'high'
        },
        {
          id: 'max-drawdown',
          title: t('maxDrawdownMetricTitle'),
          description: t('maxDrawdownMetricDesc'),
          importance: 'critical'
        }
      ]
    },
    backtestingStats: {
      title: t('backtestingStatsTitle'),
      concepts: [
        {
          id: 'sample-size',
          title: t('sampleSizeTitle'),
          description: t('sampleSizeDesc'),
          importance: 'critical'
        },
        {
          id: 'overfitting-danger',
          title: t('overfittingDangerTitle'),
          description: t('overfittingDangerDesc'),
          importance: 'critical'
        },
        {
          id: 'statistical-significance',
          title: t('statisticalSignificanceTitle'),
          description: t('statisticalSignificanceDesc'),
          importance: 'high'
        }
      ]
    }
  }
});

export const getTradingFundamentals = (t) => ({
  title: t('fundTitle'),
  intro: t('fundIntro'),
  marketTypes: {
    title: t('marketTypesTitle'),
    intro: t('marketTypesIntro'),
    items: [
      { id: 'forex', name: t('mktForexName'), desc: t('mktForexDesc'), volume: t('mktForexVolume'), icon: '💱' },
      { id: 'stocks', name: t('mktStocksName'), desc: t('mktStocksDesc'), volume: t('mktStocksVolume'), icon: '📈' },
      { id: 'crypto', name: t('mktCryptoName'), desc: t('mktCryptoDesc'), volume: t('mktCryptoVolume'), icon: '₿' },
      { id: 'commodities', name: t('mktCommoditiesName'), desc: t('mktCommoditiesDesc'), volume: t('mktCommoditiesVolume'), icon: '🛢️' },
      { id: 'indices', name: t('mktIndicesName'), desc: t('mktIndicesDesc'), volume: t('mktIndicesVolume'), icon: '📊' },
      { id: 'etfs', name: t('mktEtfsName'), desc: t('mktEtfsDesc'), volume: t('mktEtfsVolume'), icon: '🗂️' },
      { id: 'futures', name: t('mktFuturesName'), desc: t('mktFuturesDesc'), volume: t('mktFuturesVolume'), icon: '📅' },
      { id: 'bonds', name: t('mktBondsName'), desc: t('mktBondsDesc'), volume: t('mktBondsVolume'), icon: '🏦' },
      { id: 'options', name: t('mktOptionsName'), desc: t('mktOptionsDesc'), volume: t('mktOptionsVolume'), icon: '🎯' },
      { id: 'cfds', name: t('mktCfdsName'), desc: t('mktCfdsDesc'), volume: t('mktCfdsVolume'), icon: '🔀' },
    ]
  },
  participants: {
    title: t('marketParticipantsTitle'),
    intro: t('marketParticipantsIntro'),
    items: [
      { id: 'retail', name: t('partRetailName'), desc: t('partRetailDesc'), icon: '👤' },
      { id: 'institutional', name: t('partInstitutionalName'), desc: t('partInstitutionalDesc'), icon: '🏦' },
      { id: 'banks', name: t('partBanksName'), desc: t('partBanksDesc'), icon: '🏢' },
      { id: 'hedgefunds', name: t('partHedgeFundsName'), desc: t('partHedgeFundsDesc'), icon: '🦈' },
      { id: 'funds', name: t('partFundsName'), desc: t('partFundsDesc'), icon: '💼' },
      { id: 'marketmakers', name: t('partMarketMakersName'), desc: t('partMarketMakersDesc'), icon: '⚖️' },
      { id: 'hft', name: t('partHftName'), desc: t('partHftDesc'), icon: '⚡' },
      { id: 'brokers', name: t('partBrokersName'), desc: t('partBrokersDesc'), icon: '🔗' },
      { id: 'corporates', name: t('partCorporatesName'), desc: t('partCorporatesDesc'), icon: '🏭' },
      { id: 'centralbanks', name: t('partCentralBanksName'), desc: t('partCentralBanksDesc'), icon: '🏛️' },
    ]
  },
  sessions: {
    title: t('sessionsTitle'),
    intro: t('sessionsIntro'),
    items: [
      { id: 'sydney', name: t('sessSydneyName'), hours: t('sessSydneyHours'), desc: t('sessSydneyDesc'), color: 'blue' },
      { id: 'asia', name: t('sessAsiaName'), hours: t('sessAsiaHours'), desc: t('sessAsiaDesc'), color: 'blue' },
      { id: 'overlap2', name: t('sessOverlap2Name'), hours: t('sessOverlap2Hours'), desc: t('sessOverlap2Desc'), color: 'red' },
      { id: 'london', name: t('sessLondonName'), hours: t('sessLondonHours'), desc: t('sessLondonDesc'), color: 'green' },
      { id: 'overlap', name: t('sessOverlapName'), hours: t('sessOverlapHours'), desc: t('sessOverlapDesc'), color: 'red' },
      { id: 'ny', name: t('sessNyName'), hours: t('sessNyHours'), desc: t('sessNyDesc'), color: 'orange' },
    ]
  }
});

export const getElliottWave = (t) => ({
  title: t('ewTitle'),
  intro: t('ewIntro'),
  motive: {
    title: t('ewMotiveTitle'),
    intro: t('ewMotiveIntro'),
    waves: [
      { id: 1, name: t('ewWave1Name'), desc: t('ewWave1Desc'), type: 'bullish' },
      { id: 2, name: t('ewWave2Name'), desc: t('ewWave2Desc'), type: 'bearish' },
      { id: 3, name: t('ewWave3Name'), desc: t('ewWave3Desc'), type: 'bullish' },
      { id: 4, name: t('ewWave4Name'), desc: t('ewWave4Desc'), type: 'bearish' },
      { id: 5, name: t('ewWave5Name'), desc: t('ewWave5Desc'), type: 'bullish' },
    ],
  },
  corrective: {
    title: t('ewCorrTitle'),
    intro: t('ewCorrIntro'),
    waves: [
      { id: 'A', name: t('ewWaveAName'), desc: t('ewWaveADesc'), type: 'bearish' },
      { id: 'B', name: t('ewWaveBName'), desc: t('ewWaveBDesc'), type: 'bullish' },
      { id: 'C', name: t('ewWaveCName'), desc: t('ewWaveCDesc'), type: 'bearish' },
    ],
  },
  rules: {
    title: t('ewRulesTitle'),
    items: [
      { id: 'r1', name: t('ewRule1Name'), desc: t('ewRule1Desc'), importance: 'critical' },
      { id: 'r2', name: t('ewRule2Name'), desc: t('ewRule2Desc'), importance: 'critical' },
      { id: 'r3', name: t('ewRule3Name'), desc: t('ewRule3Desc'), importance: 'critical' },
    ],
  },
  patterns: {
    title: t('ewPatternsTitle'),
    items: [
      { id: 'zigzag', name: t('ewZigzagName'), desc: t('ewZigzagDesc') },
      { id: 'flat', name: t('ewFlatName'), desc: t('ewFlatDesc') },
      { id: 'triangle', name: t('ewTriangleName'), desc: t('ewTriangleDesc') },
    ],
  },
  fibonacci: { title: t('ewFibTitle'), desc: t('ewFibDesc') },
  degrees: { title: t('ewDegreesTitle'), desc: t('ewDegreesDesc') },
  mistakes: {
    title: t('ewMistakesTitle'),
    items: [t('ewMistake1'), t('ewMistake2'), t('ewMistake3')],
  },
});

export const getIchimoku = (t) => ({
  title: t('ichiTitle'),
  intro: t('ichiIntro'),
  lines: {
    title: t('ichiLinesTitle'),
    intro: t('ichiLinesIntro'),
    items: [
      { id: 'tenkan', name: t('ichiTenkanName'), period: '9', desc: t('ichiTenkanDesc'), type: 'bullish' },
      { id: 'kijun', name: t('ichiKijunName'), period: '26', desc: t('ichiKijunDesc'), type: 'bullish' },
      { id: 'senkouA', name: t('ichiSenkouAName'), period: '→26', desc: t('ichiSenkouADesc'), type: 'neutral' },
      { id: 'senkouB', name: t('ichiSenkouBName'), period: '52→26', desc: t('ichiSenkouBDesc'), type: 'neutral' },
      { id: 'chikou', name: t('ichiChikouName'), period: '←26', desc: t('ichiChikouDesc'), type: 'bearish' },
    ],
  },
  cloud: {
    title: t('ichiCloudTitle'),
    intro: t('ichiCloudIntro'),
    items: [
      { id: 'above', name: t('ichiAboveName'), desc: t('ichiAboveDesc'), type: 'bullish' },
      { id: 'below', name: t('ichiBelowName'), desc: t('ichiBelowDesc'), type: 'bearish' },
      { id: 'inside', name: t('ichiInsideName'), desc: t('ichiInsideDesc'), type: 'neutral' },
      { id: 'thick', name: t('ichiThickName'), desc: t('ichiThickDesc'), type: 'neutral' },
    ],
  },
  signals: {
    title: t('ichiSignalsTitle'),
    items: [
      { id: 'tkcross', name: t('ichiTkCrossName'), desc: t('ichiTkCrossDesc'), importance: 'critical' },
      { id: 'cloudbreak', name: t('ichiCloudBreakName'), desc: t('ichiCloudBreakDesc'), importance: 'high' },
      { id: 'chikouconf', name: t('ichiChikouConfName'), desc: t('ichiChikouConfDesc'), importance: 'high' },
    ],
  },
  tips: {
    title: t('ichiTipsTitle'),
    items: [t('ichiTip1'), t('ichiTip2'), t('ichiTip3')],
  },
});

export const getTechnicalAnalysis = (t) => ({
  title: t('techTitle'),
  intro: t('techIntro'),
  scale: {
    title: t('scaleTitle'),
    concepts: [
      { id: 'linear', name: t('scaleLinearName'), desc: t('scaleLinearDesc'), importance: 'high' },
      { id: 'log', name: t('scaleLogName'), desc: t('scaleLogDesc'), importance: 'critical' },
      { id: 'when', name: t('scaleWhenName'), desc: t('scaleWhenDesc'), importance: 'high' },
      { id: 'analysis', name: t('scaleAnalysisName'), desc: t('scaleAnalysisDesc'), importance: 'critical' },
    ],
  },
  supportResistance: {
    title: t('srTitle'),
    concepts: [
      { id: 'support', name: t('srSupportName'), desc: t('srSupportDesc'), importance: 'critical' },
      { id: 'resistance', name: t('srResistanceName'), desc: t('srResistanceDesc'), importance: 'critical' },
      { id: 'zones', name: t('srZonesName'), desc: t('srZonesDesc'), importance: 'high' },
      { id: 'breakout', name: t('srBreakoutName'), desc: t('srBreakoutDesc'), importance: 'high' },
    ]
  },
  trends: {
    title: t('trendTitle'),
    concepts: [
      { id: 'uptrend', name: t('trendUptrendName'), desc: t('trendUptrendDesc'), type: 'bullish' },
      { id: 'downtrend', name: t('trendDowntrendName'), desc: t('trendDowntrendDesc'), type: 'bearish' },
      { id: 'sideways', name: t('trendSidewaysName'), desc: t('trendSidewaysDesc'), type: 'neutral' },
      { id: 'structure', name: t('trendStructureName'), desc: t('trendStructureDesc'), type: 'neutral' },
    ]
  },
  indicators: {
    title: t('indicatorsTitle'),
    items: [
      { id: 'sma', name: t('indSMAName'), desc: t('indSMADesc'), category: t('indCatTrend'), importance: 'critical' },
      { id: 'ema', name: t('indEMAName'), desc: t('indEMADesc'), category: t('indCatTrend'), importance: 'critical' },
      { id: 'rsi', name: t('indRSIName'), desc: t('indRSIDesc'), category: t('indCatMomentum'), importance: 'critical' },
      { id: 'macd', name: t('indMACDName'), desc: t('indMACDDesc'), category: t('indCatMomentum'), importance: 'high' },
      { id: 'bb', name: t('indBBName'), desc: t('indBBDesc'), category: t('indCatVolatility'), importance: 'high' },
      { id: 'fib', name: t('indFibName'), desc: t('indFibDesc'), category: t('indCatLevels'), importance: 'high' },
    ]
  },
  mtf: {
    title: t('mtfTitle'),
    concepts: [
      { id: 'concept', name: t('mtfConceptName'), desc: t('mtfConceptDesc'), importance: 'critical' },
      { id: 'topdown', name: t('mtfTopDownName'), desc: t('mtfTopDownDesc'), importance: 'high' },
    ]
  }
});

export const getFundamentalAnalysis = (t) => ({
  title: t('fundAnalTitle'),
  intro: t('fundAnalIntro'),
  macro: {
    title: t('macroTitle'),
    items: [
      { id: 'gdp', name: t('macroGDPName'), desc: t('macroGDPDesc'), impact: t('macroHighImpact') },
      { id: 'cpi', name: t('macroCPIName'), desc: t('macroCPIDesc'), impact: t('macroHighImpact') },
      { id: 'rates', name: t('macroInterestName'), desc: t('macroInterestDesc'), impact: t('macroHighImpact') },
      { id: 'nfp', name: t('macroNFPName'), desc: t('macroNFPDesc'), impact: t('macroHighImpact') },
      { id: 'unemployment', name: t('macroUnemploymentName'), desc: t('macroUnemploymentDesc'), impact: t('macroMediumImpact') },
    ]
  },
  calendar: {
    title: t('econCalTitle'),
    concepts: [
      { id: 'howto', name: t('econCalHowToName'), desc: t('econCalHowToDesc'), importance: 'critical' },
      { id: 'impact', name: t('econCalImpactName'), desc: t('econCalImpactDesc'), importance: 'high' },
    ]
  },
  stocks: {
    title: t('stockFundTitle'),
    items: [
      { id: 'per', name: t('stockPERName'), desc: t('stockPERDesc'), importance: 'critical' },
      { id: 'eps', name: t('stockEPSName'), desc: t('stockEPSDesc'), importance: 'high' },
      { id: 'revenue', name: t('stockRevenueGrowthName'), desc: t('stockRevenueGrowthDesc'), importance: 'high' },
      { id: 'dividend', name: t('stockDividendName'), desc: t('stockDividendDesc'), importance: 'medium' },
    ]
  }
});

export const getTradingStylesContent = (t) => ({
  title: t('stylesTitle'),
  intro: t('stylesIntro'),
  choiceTitle: t('styleChoiceTitle'),
  choiceDesc: t('styleChoiceDesc'),
  styles: [
    {
      id: 'scalping',
      name: t('styleScalpingName'),
      desc: t('styleScalpingDesc'),
      timeframe: t('styleScalpingTimeframe'),
      frequency: t('styleScalpingFrequency'),
      pros: [t('styleScalpingPro1'), t('styleScalpingPro2'), t('styleScalpingPro3')],
      cons: [t('styleScalpingCon1'), t('styleScalpingCon2'), t('styleScalpingCon3')],
      color: 'purple',
      icon: '⚡',
    },
    {
      id: 'daytrading',
      name: t('styleDayTradingName'),
      desc: t('styleDayTradingDesc'),
      timeframe: t('styleDayTradingTimeframe'),
      frequency: t('styleDayTradingFrequency'),
      pros: [t('styleDayTradingPro1'), t('styleDayTradingPro2'), t('styleDayTradingPro3')],
      cons: [t('styleDayTradingCon1'), t('styleDayTradingCon2'), t('styleDayTradingCon3')],
      color: 'blue',
      icon: '🌅',
    },
    {
      id: 'swing',
      name: t('styleSwingName'),
      desc: t('styleSwingDesc'),
      timeframe: t('styleSwingTimeframe'),
      frequency: t('styleSwingFrequency'),
      pros: [t('styleSwingPro1'), t('styleSwingPro2'), t('styleSwingPro3')],
      cons: [t('styleSwingCon1'), t('styleSwingCon2'), t('styleSwingCon3')],
      color: 'green',
      icon: '🌊',
    },
    {
      id: 'position',
      name: t('stylePositionName'),
      desc: t('stylePositionDesc'),
      timeframe: t('stylePositionTimeframe'),
      frequency: t('stylePositionFrequency'),
      pros: [t('stylePositionPro1'), t('stylePositionPro2'), t('stylePositionPro3')],
      cons: [t('stylePositionCon1'), t('stylePositionCon2'), t('stylePositionCon3')],
      color: 'orange',
      icon: '🏔️',
    },
  ]
});

export const getHarmonicPatterns = (t) => [
  {
    id: 'gartley-bull',
    name: t('gartleyBullName'),
    type: 'bullish',
    description: t('gartleyBullDesc'),
    ratios: {
      'B retracement': '61.8% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '78.6% of XA',
    },
    steps: [
      t('gartleyBullStep1'),
      t('gartleyBullStep2'),
      t('gartleyBullStep3'),
      t('gartleyBullStep4'),
      t('gartleyBullStep5'),
    ],
    reliability: t('gartleyBullReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'gartley-bear',
    name: t('gartleyBearName'),
    type: 'bearish',
    description: t('gartleyBearDesc'),
    ratios: {
      'B retracement': '61.8% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '78.6% of XA',
    },
    steps: [
      t('gartleyBearStep1'),
      t('gartleyBearStep2'),
      t('gartleyBearStep3'),
      t('gartleyBearStep4'),
      t('gartleyBearStep5'),
    ],
    reliability: t('gartleyBearReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'butterfly-bull',
    name: t('butterflyBullName'),
    type: 'bullish',
    description: t('butterflyBullDesc'),
    ratios: {
      'B retracement': '78.6% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '127.2% or 161.8% of XA',
    },
    steps: [
      t('butterflyBullStep1'),
      t('butterflyBullStep2'),
      t('butterflyBullStep3'),
      t('butterflyBullStep4'),
      t('butterflyBullStep5'),
    ],
    reliability: t('butterflyBullReliability'),
    timeframes: ['4H', 'Daily', 'Weekly'],
  },
  {
    id: 'butterfly-bear',
    name: t('butterflyBearName'),
    type: 'bearish',
    description: t('butterflyBearDesc'),
    ratios: {
      'B retracement': '78.6% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '127.2% or 161.8% of XA',
    },
    steps: [
      t('butterflyBearStep1'),
      t('butterflyBearStep2'),
      t('butterflyBearStep3'),
      t('butterflyBearStep4'),
      t('butterflyBearStep5'),
    ],
    reliability: t('butterflyBearReliability'),
    timeframes: ['4H', 'Daily', 'Weekly'],
  },
  {
    id: 'bat-bull',
    name: t('batBullName'),
    type: 'bullish',
    description: t('batBullDesc'),
    ratios: {
      'B retracement': '38.2-50% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '88.6% of XA',
    },
    steps: [
      t('batBullStep1'),
      t('batBullStep2'),
      t('batBullStep3'),
      t('batBullStep4'),
      t('batBullStep5'),
    ],
    reliability: t('batBullReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'bat-bear',
    name: t('batBearName'),
    type: 'bearish',
    description: t('batBearDesc'),
    ratios: {
      'B retracement': '38.2-50% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '88.6% of XA',
    },
    steps: [
      t('batBearStep1'),
      t('batBearStep2'),
      t('batBearStep3'),
      t('batBearStep4'),
      t('batBearStep5'),
    ],
    reliability: t('batBearReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'crab-bull',
    name: t('crabBullName'),
    type: 'bullish',
    description: t('crabBullDesc'),
    ratios: {
      'B retracement': '38.2-61.8% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '161.8% of XA',
    },
    steps: [
      t('crabBullStep1'),
      t('crabBullStep2'),
      t('crabBullStep3'),
      t('crabBullStep4'),
      t('crabBullStep5'),
    ],
    reliability: t('crabBullReliability'),
    timeframes: ['4H', 'Daily', 'Weekly'],
  },
  {
    id: 'crab-bear',
    name: t('crabBearName'),
    type: 'bearish',
    description: t('crabBearDesc'),
    ratios: {
      'B retracement': '38.2-61.8% of XA',
      'C retracement': '38.2-88.6% of AB',
      'D (PRZ)': '161.8% of XA',
    },
    steps: [
      t('crabBearStep1'),
      t('crabBearStep2'),
      t('crabBearStep3'),
      t('crabBearStep4'),
      t('crabBearStep5'),
    ],
    reliability: t('crabBearReliability'),
    timeframes: ['4H', 'Daily', 'Weekly'],
  },
  {
    id: 'shark',
    name: t('sharkName'),
    type: 'neutral',
    description: t('sharkDesc'),
    ratios: {
      'C extension of OX': '88.6-113%',
      'C extension of AB': '161.8-224%',
      'Entry': 'At C (PRZ)',
    },
    steps: [
      t('sharkStep1'),
      t('sharkStep2'),
      t('sharkStep3'),
      t('sharkStep4'),
      t('sharkStep5'),
    ],
    reliability: t('sharkReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'cypher-bull',
    name: t('cypherBullName'),
    type: 'bullish',
    description: t('cypherBullDesc'),
    ratios: {
      'B retracement': '38.2-61.8% of XA',
      'C extension': '113-141.4% of XA',
      'D (PRZ)': '78.6% of XC',
    },
    steps: [
      t('cypherBullStep1'),
      t('cypherBullStep2'),
      t('cypherBullStep3'),
      t('cypherBullStep4'),
      t('cypherBullStep5'),
    ],
    reliability: t('cypherBullReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
  {
    id: 'cypher-bear',
    name: t('cypherBearName'),
    type: 'bearish',
    description: t('cypherBearDesc'),
    ratios: {
      'B retracement': '38.2-61.8% of XA',
      'C extension': '113-141.4% of XA',
      'D (PRZ)': '78.6% of XC',
    },
    steps: [
      t('cypherBearStep1'),
      t('cypherBearStep2'),
      t('cypherBearStep3'),
      t('cypherBearStep4'),
      t('cypherBearStep5'),
    ],
    reliability: t('cypherBearReliability'),
    timeframes: ['1H', '4H', 'Daily'],
  },
];

export const getMarketMechanics = (t) => ({
  title: t('mechTitle'),
  intro: t('mechIntro'),
  orders: {
    title: t('ordersTitle'),
    items: [
      { id: 'market', name: t('orderMarketName'), desc: t('orderMarketDesc'), use: t('orderMarketUse'), importance: 'critical' },
      { id: 'limit', name: t('orderLimitName'), desc: t('orderLimitDesc'), use: t('orderLimitUse'), importance: 'critical' },
      { id: 'stop', name: t('orderStopName'), desc: t('orderStopDesc'), use: t('orderStopUse'), importance: 'critical' },
      { id: 'stoplimit', name: t('orderStopLimitName'), desc: t('orderStopLimitDesc'), use: t('orderStopLimitUse'), importance: 'high' },
      { id: 'trailing', name: t('orderTrailingName'), desc: t('orderTrailingDesc'), use: t('orderTrailingUse'), importance: 'high' },
    ]
  },
  broker: {
    title: t('brokerTitle'),
    intro: t('brokerIntro'),
    criteria: [
      { id: 'regulation', name: t('brokerRegulationName'), desc: t('brokerRegulationDesc'), importance: 'critical' },
      { id: 'spread', name: t('brokerSpreadName'), desc: t('brokerSpreadDesc'), importance: 'critical' },
      { id: 'execution', name: t('brokerExecutionName'), desc: t('brokerExecutionDesc'), importance: 'high' },
      { id: 'leverage', name: t('brokerLeverageName'), desc: t('brokerLeverageDesc'), importance: 'high' },
    ]
  },
  platforms: {
    title: t('platformsTitle'),
    items: [
      { id: 'mt4', name: t('platformMT4Name'), desc: t('platformMT4Desc'), best: t('platformMT4Best'), icon: '🖥️' },
      { id: 'mt5', name: t('platformMT5Name'), desc: t('platformMT5Desc'), best: t('platformMT5Best'), icon: '🖥️' },
      { id: 'tv', name: t('platformTVName'), desc: t('platformTVDesc'), best: t('platformTVBest'), icon: '📱' },
    ]
  },
  journal: {
    title: t('journalTitle'),
    concepts: [
      { id: 'why', name: t('journalWhyName'), desc: t('journalWhyDesc'), importance: 'critical' },
      { id: 'track', name: t('journalTrackName'), desc: t('journalTrackDesc'), importance: 'critical' },
      { id: 'review', name: t('journalReviewName'), desc: t('journalReviewDesc'), importance: 'high' },
    ]
  }
});

export const getWyckoffContent = (t) => ({
  title: t('wyckoffTitle'),
  intro: t('wyckoffIntro'),
  laws: {
    title: t('wyckoffLawsTitle'),
    items: [
      { id: 'supply-demand', name: t('wyckoffLawSupplyName'), desc: t('wyckoffLawSupplyDesc') },
      { id: 'cause-effect', name: t('wyckoffLawCauseName'), desc: t('wyckoffLawCauseDesc') },
      { id: 'effort-result', name: t('wyckoffLawEffortName'), desc: t('wyckoffLawEffortDesc') },
    ]
  },
  phases: {
    title: t('wyckoffPhasesTitle'),
    intro: t('wyckoffPhasesIntro'),
    items: [
      { id: 'accumulation', name: t('wyckoffAccumulationName'), desc: t('wyckoffAccumulationDesc'), type: 'bullish' },
      { id: 'markup',       name: t('wyckoffMarkupName'),       desc: t('wyckoffMarkupDesc'),       type: 'bullish' },
      { id: 'distribution', name: t('wyckoffDistributionName'), desc: t('wyckoffDistributionDesc'), type: 'bearish' },
      { id: 'markdown',     name: t('wyckoffMarkdownName'),     desc: t('wyckoffMarkdownDesc'),     type: 'bearish' },
    ],
  },
  events: {
    title: t('wyckoffEventsTitle'),
    intro: t('wyckoffEventsIntro'),
    items: [
      { id: 'ps',   name: t('wyckoffPsName'),   desc: t('wyckoffPsDesc'),   sentiment: 'bullish' },
      { id: 'sc',   name: t('wyckoffScName'),   desc: t('wyckoffScDesc'),   sentiment: 'bullish' },
      { id: 'ar',   name: t('wyckoffArName'),   desc: t('wyckoffArDesc'),   sentiment: 'neutral' },
      { id: 'st',   name: t('wyckoffStName'),   desc: t('wyckoffStDesc'),   sentiment: 'bullish' },
      { id: 'spring', name: t('wyckoffSpringName'), desc: t('wyckoffSpringDesc'), sentiment: 'bullish' },
      { id: 'buec', name: t('wyckoffBuecName'), desc: t('wyckoffBuecDesc'), sentiment: 'bullish' },
      { id: 'sos',  name: t('wyckoffSosName'),  desc: t('wyckoffSosDesc'),  sentiment: 'bullish' },
      { id: 'lps',  name: t('wyckoffLPSName'),  desc: t('wyckoffLPSDesc'),  sentiment: 'bullish' },
      { id: 'psy',  name: t('wyckoffPSYName'),  desc: t('wyckoffPSYDesc'),  sentiment: 'bearish' },
      { id: 'bc',   name: t('wyckoffBCName'),   desc: t('wyckoffBCDesc'),   sentiment: 'bearish' },
      { id: 'ut',   name: t('wyckoffUTName'),   desc: t('wyckoffUTDesc'),   sentiment: 'bearish' },
      { id: 'utad', name: t('wyckoffUtadName'), desc: t('wyckoffUtadDesc'), sentiment: 'bearish' },
      { id: 'sow',  name: t('wyckoffSowName'),  desc: t('wyckoffSowDesc'),  sentiment: 'bearish' },
      { id: 'lpsy', name: t('wyckoffLPSYName'), desc: t('wyckoffLPSYDesc'), sentiment: 'bearish' },
    ],
  },
  composite: {
    title: t('wyckoffCompositeTitle'),
    desc: t('wyckoffCompositeDesc'),
    concepts: [
      { id: 'acc-campaign',  name: t('wyckoffCompositeAccName'),  desc: t('wyckoffCompositeAccDesc') },
      { id: 'dist-campaign', name: t('wyckoffCompositeDistName'), desc: t('wyckoffCompositeDistDesc') },
    ],
  },
  volume: {
    title: t('wyckoffVolumeTitle'),
    intro: t('wyckoffVolumeIntro'),
    rules: [
      { id: 'effort-result', name: t('wyckoffVolumeEffortName'),   desc: t('wyckoffVolumeEffortDesc') },
      { id: 'no-supply',     name: t('wyckoffVolumeNoSupplyName'), desc: t('wyckoffVolumeNoSupplyDesc') },
      { id: 'no-demand',     name: t('wyckoffVolumeNoDemandName'), desc: t('wyckoffVolumeNoDemandDesc') },
      { id: 'climactic',     name: t('wyckoffVolumeClimaticName'), desc: t('wyckoffVolumeClimaticDesc') },
    ],
  },
  howToTrade: {
    title: t('wyckoffHowToTitle'),
    steps: [
      t('wyckoffHowToStep1'),
      t('wyckoffHowToStep2'),
      t('wyckoffHowToStep3'),
      t('wyckoffHowToStep4'),
      t('wyckoffHowToStep5'),
    ],
  },
});

export const getAlternativeCharts = (t) => ({
  title: t('altChartTitle'),
  intro: t('altChartIntro'),
  charts: [
    {
      id: 'renko',
      name: t('renkoName'),
      desc: t('renkoDesc'),
      construction: t('renkoConstructionDesc'),
      strengths: [t('renkoStrength1'), t('renkoStrength2'), t('renkoStrength3')],
      weaknesses: [t('renkoWeakness1'), t('renkoWeakness2')],
      bestFor: t('renkoBestFor'),
      color: 'orange',
    },
    {
      id: 'heikin-ashi',
      name: t('heikinAshiName'),
      desc: t('heikinAshiDesc'),
      construction: t('heikinAshiConstructionDesc'),
      strengths: [t('heikinAshiStrength1'), t('heikinAshiStrength2'), t('heikinAshiStrength3')],
      weaknesses: [t('heikinAshiWeakness1'), t('heikinAshiWeakness2')],
      bestFor: t('heikinAshiBestFor'),
      color: 'blue',
    },
    {
      id: 'point-figure',
      name: t('pointFigureName'),
      desc: t('pointFigureDesc'),
      construction: t('pointFigureConstructionDesc'),
      strengths: [t('pointFigureStrength1'), t('pointFigureStrength2'), t('pointFigureStrength3')],
      weaknesses: [t('pointFigureWeakness1'), t('pointFigureWeakness2')],
      bestFor: t('pointFigureBestFor'),
      color: 'purple',
    },
    {
      id: 'kagi',
      name: t('kagiName'),
      desc: t('kagiDesc'),
      construction: t('kagiConstructionDesc'),
      strengths: [t('kagiStrength1'), t('kagiStrength2'), t('kagiStrength3')],
      weaknesses: [t('kagiWeakness1'), t('kagiWeakness2')],
      bestFor: t('kagiBestFor'),
      color: 'green',
    },
    {
      id: 'three-line-break',
      name: t('threeLineBreakName'),
      desc: t('threeLineBreakDesc'),
      construction: t('threeLineBreakConstructionDesc'),
      strengths: [t('threeLineBreakStrength1'), t('threeLineBreakStrength2'), t('threeLineBreakStrength3')],
      weaknesses: [t('threeLineBreakWeakness1'), t('threeLineBreakWeakness2')],
      bestFor: t('threeLineBreakBestFor'),
      color: 'cyan',
    },
  ],
});

export const getCotContent = (t) => ({
  title: t('cotTitle'),
  intro: t('cotIntro'),
  traderTypes: {
    title: t('cotTraderTypesTitle'),
    items: [
      { id: 'commercial', name: t('cotCommercialName'), desc: t('cotCommercialDesc'), tag: t('cotCommercialTag') },
      { id: 'large',      name: t('cotLargeName'),      desc: t('cotLargeDesc'),      tag: t('cotLargeTag') },
      { id: 'small',      name: t('cotSmallName'),      desc: t('cotSmallDesc'),      tag: t('cotSmallTag') },
    ],
  },
  howToRead: {
    title: t('cotHowToReadTitle'),
    items: [
      { id: 'net',        name: t('cotReadNetName'),        desc: t('cotReadNetDesc') },
      { id: 'change',     name: t('cotReadChangeName'),     desc: t('cotReadChangeDesc') },
      { id: 'extreme',    name: t('cotReadExtremeName'),    desc: t('cotReadExtremeDesc') },
      { id: 'divergence', name: t('cotReadDivergenceName'), desc: t('cotReadDivergenceDesc') },
    ],
  },
  cotIndex: {
    title: t('cotIndexSecTitle'),
    desc: t('cotIndexSecDesc'),
    formula: t('cotIndexFormula'),
  },
  contrarian: {
    title: t('cotContrarianTitle'),
    items: [
      { id: 'bottom', name: t('cotBottomName'), desc: t('cotBottomDesc') },
      { id: 'top',    name: t('cotTopName'),    desc: t('cotTopDesc') },
    ],
  },
  combine: {
    title: t('cotCombineTitle'),
    tips: [t('cotCombine1'), t('cotCombine2'), t('cotCombine3')],
  },
  reports: {
    title: t('cotReportsTitle'),
    items: [
      { id: 'legacy',    name: t('cotLegacyName'),  desc: t('cotLegacyDesc') },
      { id: 'disagg',    name: t('cotDisaggName'),  desc: t('cotDisaggDesc') },
      { id: 'tff',       name: t('cotTffName'),     desc: t('cotTffDesc') },
    ],
  },
  sources: {
    title: t('cotSourcesTitle'),
    desc: t('cotSourcesDesc'),
  },
  limitations: {
    title: t('cotLimitationsTitle'),
    items: [t('cotLimit1'), t('cotLimit2'), t('cotLimit3')],
  },
});
