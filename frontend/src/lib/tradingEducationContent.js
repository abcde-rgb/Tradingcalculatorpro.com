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
    { id: 'tick',      name: t('bcTickName'),      desc: t('bcTickDesc') },
    { id: 'trin',      name: t('bcTrinName'),      desc: t('bcTrinDesc') },
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
    { id: 'frontrun', name: t('iposFrontrunName'), desc: t('iposFrontrunDesc'), type: 'bearish' },
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
    { id: 'maemfe',    name: t('tmgMaeName'),       desc: t('tmgMaeDesc') },
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

// Market structure — reading price as a sequence of swing highs/lows: trends
// (HH/HL, LH/LL), ranges, break of structure (BOS), change of character (CHOCH),
// accumulation/distribution, pullbacks, break & retest, confirmed trend change.
// Pairs with SVG diagrams in MarketStructureVisual.jsx.
export const getMarketStructure = (t) => ({
  title: t('msTitle'),
  intro: t('msIntro'),
  items: [
    { id: 'uptrend',      name: t('msUptrendName'),     desc: t('msUptrendDesc'),     type: 'bullish' },
    { id: 'downtrend',    name: t('msDowntrendName'),   desc: t('msDowntrendDesc'),   type: 'bearish' },
    { id: 'range',        name: t('msRangeName'),       desc: t('msRangeDesc'),       type: 'neutral' },
    { id: 'bos',          name: t('msBosName'),         desc: t('msBosDesc') },
    { id: 'choch',        name: t('msChochName'),       desc: t('msChochDesc'),       type: 'bearish' },
    { id: 'accumulation', name: t('msAccumName'),       desc: t('msAccumDesc'),       type: 'bullish' },
    { id: 'distribution', name: t('msDistribName'),     desc: t('msDistribDesc'),     type: 'bearish' },
    { id: 'pullback',     name: t('msPullbackName'),    desc: t('msPullbackDesc') },
    { id: 'retest',       name: t('msRetestName'),      desc: t('msRetestDesc') },
    { id: 'trendchange',  name: t('msTrendChangeName'), desc: t('msTrendChangeDesc') },
  ],
  note: t('msNote'),
});

// Sessions & seasonality — time-of-day and calendar behavioural tendencies
// (all Spain time): the 3 sessions, Asian range, London open, NY open reversal
// (Judas), London-NY overlap, US data hour, gold's hot hours, power hour,
// weekend gap and month-end / witching / seasonality. Tendencies, not rules.
// Pairs with SVG diagrams in SessionTimingVisual.jsx.
export const getSessionTiming = (t) => ({
  title: t('hzTitle'),
  intro: t('hzIntro'),
  items: [
    { id: 'sessions',  name: t('hzSessionsName'), desc: t('hzSessionsDesc') },
    { id: 'asian',     name: t('hzAsianName'),    desc: t('hzAsianDesc') },
    { id: 'london',    name: t('hzLondonName'),   desc: t('hzLondonDesc') },
    { id: 'nyopen',    name: t('hzNyOpenName'),   desc: t('hzNyOpenDesc'), type: 'bearish' },
    { id: 'overlap',   name: t('hzOverlapName'),  desc: t('hzOverlapDesc') },
    { id: 'usdata',    name: t('hzUsDataName'),   desc: t('hzUsDataDesc') },
    { id: 'gold',      name: t('hzGoldName'),     desc: t('hzGoldDesc') },
    { id: 'powerhour', name: t('hzPowerName'),    desc: t('hzPowerDesc') },
    { id: 'weekend',   name: t('hzWeekendName'),  desc: t('hzWeekendDesc') },
    { id: 'calendar',  name: t('hzCalendarName'), desc: t('hzCalendarDesc') },
  ],
  note: t('hzNote'),
});

// Evidence-based trading — what funds, banks, desks and academic research have
// actually PROVEN with statistics and the law of large numbers: the retail base
// rates (ESMA, Brazil day-trading study), expectancy, SPIVA, factor premia,
// momentum (Jegadeesh-Titman), a century of trend following (AQR), Kelly /
// fixed-fractional sizing (Thorp) and hard institutional risk limits. Pairs
// with SVG diagrams in EvidenceVisual.jsx.
export const getEvidenceBased = (t) => ({
  title: t('evTitle'),
  intro: t('evIntro'),
  items: [
    { id: 'numbers',    name: t('evNumbersName'),    desc: t('evNumbersDesc'),    type: 'bearish' },
    { id: 'lln',        name: t('evLlnName'),        desc: t('evLlnDesc') },
    { id: 'expectancy', name: t('evExpectName'),     desc: t('evExpectDesc') },
    { id: 'indexing',   name: t('evIndexName'),      desc: t('evIndexDesc') },
    { id: 'factors',    name: t('evFactorsName'),    desc: t('evFactorsDesc') },
    { id: 'momentum',   name: t('evMomentumName'),   desc: t('evMomentumDesc'),   type: 'bullish' },
    { id: 'trend',      name: t('evTrendName'),      desc: t('evTrendDesc'),      type: 'bullish' },
    { id: 'sizing',     name: t('evSizingName'),     desc: t('evSizingDesc') },
    { id: 'desks',      name: t('evDesksName'),      desc: t('evDesksDesc') },
    { id: 'behavior',   name: t('evBehaviorName'),   desc: t('evBehaviorDesc'),   type: 'bearish' },
  ],
  note: t('evNote'),
});

// Options income & assignment — the "seller's" half of options: collect premium
// systematically (covered call, cash-secured put, the wheel) and understand what
// happens at assignment/expiration (american vs european, pin risk, 0DTE). Pairs
// with SVG diagrams in OptionsIncomeVisual.jsx.
export const getOptionsIncome = (t) => ({
  title: t('oiTitle'),
  intro: t('oiIntro'),
  items: [
    { id: 'covered', name: t('oiCoveredName'), desc: t('oiCoveredDesc'), type: 'bullish' },
    { id: 'csp',     name: t('oiCspName'),     desc: t('oiCspDesc'),     type: 'bullish' },
    { id: 'wheel',   name: t('oiWheelName'),   desc: t('oiWheelDesc') },
    { id: 'assign',  name: t('oiAssignName'),  desc: t('oiAssignDesc') },
    { id: 'expire',  name: t('oiExpireName'),  desc: t('oiExpireDesc'), type: 'bearish' },
    { id: 'zero',    name: t('oiZeroName'),     desc: t('oiZeroDesc'),   type: 'bearish' },
  ],
  note: t('oiNote'),
});

// Options volatility — the other axis of option pricing: implied volatility, IV
// rank/percentile, skew, term structure, earnings vol crush and vega (IV vs
// realized HV). Pairs with SVG diagrams in OptionsVolVisual.jsx.
export const getOptionsVol = (t) => ({
  title: t('ovTitle'),
  intro: t('ovIntro'),
  items: [
    { id: 'iv',    name: t('ovIvName'),    desc: t('ovIvDesc') },
    { id: 'rank',  name: t('ovRankName'),  desc: t('ovRankDesc') },
    { id: 'skew',  name: t('ovSkewName'),  desc: t('ovSkewDesc') },
    { id: 'term',  name: t('ovTermName'),  desc: t('ovTermDesc') },
    { id: 'crush', name: t('ovCrushName'), desc: t('ovCrushDesc'), type: 'bearish' },
    { id: 'vega',  name: t('ovVegaName'),  desc: t('ovVegaDesc') },
  ],
  note: t('ovNote'),
});

// Long-term investing — the evidence-backed "boring" path: compounding, DCA,
// index funds/ETFs, dividends & reinvestment, asset allocation & rebalancing.
// Pairs with SVG diagrams in LongInvestVisual.jsx.
export const getLongInvest = (t) => ({
  title: t('liTitle'),
  intro: t('liIntro'),
  items: [
    { id: 'compound', name: t('liCompoundName'), desc: t('liCompoundDesc'), type: 'bullish' },
    { id: 'dca',      name: t('liDcaName'),      desc: t('liDcaDesc') },
    { id: 'index',    name: t('liIndexName'),    desc: t('liIndexDesc') },
    { id: 'div',      name: t('liDivName'),      desc: t('liDivDesc') },
    { id: 'alloc',    name: t('liAllocName'),    desc: t('liAllocDesc') },
  ],
  note: t('liNote'),
});

// Trading taxes — general concepts (realized vs unrealized, Spain example,
// holding period, loss offsetting) with a strong "this is education, not tax
// advice" disclaimer. Pairs with SVG diagrams in TaxesVisual.jsx.
export const getTaxes = (t) => ({
  title: t('txTitle'),
  intro: t('txIntro'),
  items: [
    { id: 'basics',     name: t('txBasicsName'),     desc: t('txBasicsDesc') },
    { id: 'spain',      name: t('txSpainName'),      desc: t('txSpainDesc') },
    { id: 'holding',    name: t('txHoldingName'),    desc: t('txHoldingDesc') },
    { id: 'loss',       name: t('txLossName'),       desc: t('txLossDesc') },
    { id: 'disclaimer', name: t('txDisclaimerName'), desc: t('txDisclaimerDesc'), type: 'bearish' },
  ],
  note: t('txNote'),
});

// Algorithmic trading — systematic vs discretionary, backtesting (and its traps:
// overfitting, survivorship/look-ahead bias), execution/APIs/latency, and
// automation risk (kill switch). Pairs with SVG diagrams in AlgoTradingVisual.jsx.
export const getAlgoTrading = (t) => ({
  title: t('atTitle'),
  intro: t('atIntro'),
  items: [
    { id: 'what',     name: t('atWhatName'),     desc: t('atWhatDesc') },
    { id: 'backtest', name: t('atBacktestName'), desc: t('atBacktestDesc') },
    { id: 'exec',     name: t('atExecName'),     desc: t('atExecDesc') },
    { id: 'pitfall',  name: t('atPitfallName'),  desc: t('atPitfallDesc'), type: 'bearish' },
    { id: 'risk',     name: t('atRiskName'),     desc: t('atRiskDesc'),    type: 'bearish' },
  ],
  note: t('atNote'),
});

// Copy & social trading — how it works, vetting the lead trader, misaligned
// incentives, sizing/diversification and the measured reality (most popular
// copied portfolios lag an index). Pairs with SVG diagrams in CopyTradingVisual.jsx.
export const getCopyTrading = (t) => ({
  title: t('cpTitle'),
  intro: t('cpIntro'),
  items: [
    { id: 'what',   name: t('cpWhatName'),   desc: t('cpWhatDesc') },
    { id: 'due',    name: t('cpDueName'),    desc: t('cpDueDesc') },
    { id: 'incent', name: t('cpIncentName'), desc: t('cpIncentDesc'), type: 'bearish' },
    { id: 'size',   name: t('cpSizeName'),   desc: t('cpSizeDesc') },
  ],
  note: t('cpNote'),
});

// Forex in depth — sessions & overlap, carry trade & rate differentials, DXY &
// correlations, majors/minors/exotics, macro drivers. Pairs with ForexVisual.jsx.
export const getForexDeep = (t) => ({
  title: t('fxTitle'),
  intro: t('fxIntro'),
  items: [
    { id: 'sess',    name: t('fxSessName'),    desc: t('fxSessDesc') },
    { id: 'carry',   name: t('fxCarryName'),   desc: t('fxCarryDesc') },
    { id: 'dxy',     name: t('fxDxyName'),     desc: t('fxDxyDesc') },
    { id: 'pairs',   name: t('fxPairsName'),   desc: t('fxPairsDesc') },
    { id: 'drivers', name: t('fxDriversName'), desc: t('fxDriversDesc') },
  ],
  note: t('fxNote'),
});

// Commodities — the three groups, seasonality, gold vs real rates, oil
// (inventories/OPEC/WTI-Brent), futures curve & roll yield. Pairs with
// CommoditiesVisual.jsx.
export const getCommodities = (t) => ({
  title: t('cmTitle'),
  intro: t('cmIntro'),
  items: [
    { id: 'types',  name: t('cmTypesName'),  desc: t('cmTypesDesc') },
    { id: 'season', name: t('cmSeasonName'), desc: t('cmSeasonDesc') },
    { id: 'gold',   name: t('cmGoldName'),   desc: t('cmGoldDesc'), type: 'bullish' },
    { id: 'oil',    name: t('cmOilName'),    desc: t('cmOilDesc') },
    { id: 'curve',  name: t('cmCurveName'),  desc: t('cmCurveDesc') },
  ],
  note: t('cmNote'),
});

// Crypto in depth — halving & the cycle, funding rate, cascading liquidations,
// BTC dominance & stablecoins, 24/7 & on-chain data, correlation with the Nasdaq.
// Uses the 'cy' key prefix (the 'cr' prefix belongs to the trader-routine module).
// Pairs with CryptoVisual.jsx.
export const getCryptoDeep = (t) => ({
  title: t('cyTitle'),
  intro: t('cyIntro'),
  items: [
    { id: 'halving', name: t('cyHalvingName'), desc: t('cyHalvingDesc'), type: 'bullish' },
    { id: 'funding', name: t('cyFundingName'), desc: t('cyFundingDesc') },
    { id: 'liq',     name: t('cyLiqName'),     desc: t('cyLiqDesc'),     type: 'bearish' },
    { id: 'dom',     name: t('cyDomName'),     desc: t('cyDomDesc') },
    { id: 'chain',   name: t('cyChainName'),   desc: t('cyChainDesc') },
    { id: 'corr',    name: t('cyCorrName'),    desc: t('cyCorrDesc') },
  ],
  note: t('cyNote'),
});

// Indices & the Nasdaq — cap weighting (megacaps), ES/NQ futures & overnight,
// VIX vs the index, rebalances & triple witching, megacap earnings. Pairs with
// IndicesVisual.jsx.
export const getIndices = (t) => ({
  title: t('ixTitle'),
  intro: t('ixIntro'),
  items: [
    { id: 'weight', name: t('ixWeightName'), desc: t('ixWeightDesc') },
    { id: 'fut',    name: t('ixFutName'),    desc: t('ixFutDesc') },
    { id: 'vix',    name: t('ixVixName'),    desc: t('ixVixDesc'), type: 'bearish' },
    { id: 'witch',  name: t('ixWitchName'),  desc: t('ixWitchDesc') },
    { id: 'earn',   name: t('ixEarnName'),   desc: t('ixEarnDesc') },
  ],
  note: t('ixNote'),
});

// The truth about funded accounts — real prop firm vs "funded challenge", the
// fee-driven model (they win when you fail), simulated feeds, the negative-EV
// math, rules designed to fail you, real-broker leverage/withdrawal vs funded,
// the MyForexFunds regulatory case, and red flags. Pairs with FundedTruthVisual.jsx.
export const getFundedTruth = (t) => ({
  title: t('fdTitle'),
  intro: t('fdIntro'),
  items: [
    { id: 'real',     name: t('fdRealName'),     desc: t('fdRealDesc') },
    { id: 'model',    name: t('fdModelName'),    desc: t('fdModelDesc'),    type: 'bearish' },
    { id: 'demo',     name: t('fdDemoName'),     desc: t('fdDemoDesc'),     type: 'bearish' },
    { id: 'math',     name: t('fdMathName'),     desc: t('fdMathDesc'),     type: 'bearish' },
    { id: 'rules',    name: t('fdRulesName'),    desc: t('fdRulesDesc'),    type: 'bearish' },
    { id: 'leverage', name: t('fdLeverageName'), desc: t('fdLeverageDesc'), type: 'bullish' },
    { id: 'case',      name: t('fdCaseName'),      desc: t('fdCaseDesc'),      type: 'bearish' },
    { id: 'affiliate', name: t('fdAffiliateName'), desc: t('fdAffiliateDesc'), type: 'bearish' },
    { id: 'promo',     name: t('fdPromoName'),     desc: t('fdPromoDesc'),     type: 'bearish' },
    { id: 'denial',    name: t('fdDenialName'),    desc: t('fdDenialDesc'),    type: 'bearish' },
    { id: 'crisis',    name: t('fdCrisisName'),    desc: t('fdCrisisDesc'),    type: 'bearish' },
    { id: 'habits',    name: t('fdHabitsName'),    desc: t('fdHabitsDesc'),    type: 'bearish' },
    { id: 'broker',    name: t('fdBrokerName'),    desc: t('fdBrokerDesc'),    type: 'bullish' },
    { id: 'verdict',   name: t('fdVerdictName'),   desc: t('fdVerdictDesc') },
  ],
  note: t('fdNote'),
});

// The trader's journey & time-to-profitability — the honest map nobody sells:
// the four stages of competence (Broadwell), the Dunning-Kruger "valley of
// despair", the realistic 1-3 year timeline, the attrition/base rates (ESMA
// 74-89%, Taiwan <1% B&O, Brazil 97% Chague-De-Losso), deliberate practice vs
// screen time (Ericsson), the capital + emotional runway, measuring process
// over money, and why shortcuts (signals, courses, funded accounts) don't skip
// the stages. Pairs with SVG diagrams in TraderJourneyVisual.jsx.
export const getTraderJourney = (t) => ({
  title: t('tjTitle'),
  intro: t('tjIntro'),
  items: [
    { id: 'stages',    name: t('tjStagesName'),    desc: t('tjStagesDesc') },
    { id: 'valley',    name: t('tjValleyName'),    desc: t('tjValleyDesc'),    type: 'bearish' },
    { id: 'timeline',  name: t('tjTimelineName'),  desc: t('tjTimelineDesc') },
    { id: 'attrition', name: t('tjAttritionName'), desc: t('tjAttritionDesc'), type: 'bearish' },
    { id: 'practice',  name: t('tjPracticeName'),  desc: t('tjPracticeDesc'),  type: 'bullish' },
    { id: 'runway',    name: t('tjRunwayName'),    desc: t('tjRunwayDesc') },
    { id: 'measure',   name: t('tjMeasureName'),   desc: t('tjMeasureDesc'),   type: 'bullish' },
    { id: 'shortcut',  name: t('tjShortcutName'),  desc: t('tjShortcutDesc'),  type: 'bearish' },
  ],
  note: t('tjNote'),
});

// Moving averages deep-dive — the most-used TA indicator: SMA vs EMA, choosing
// the period, the three crossover strategies (price/MA, 2-MA, triple with a
// trend filter), the golden/death cross, MA as dynamic support/resistance, and
// where it sits among indicator families. Pairs with MovingAveragesVisual.jsx.
export const getMovingAverages = (t) => ({
  title: t('mavTitle'),
  intro: t('mavIntro'),
  items: [
    { id: 'smaema',      name: t('mavSmaEmaName'),      desc: t('mavSmaEmaDesc') },
    { id: 'periods',     name: t('mavPeriodsName'),     desc: t('mavPeriodsDesc') },
    { id: 'crossprice',  name: t('mavCrossPriceName'),  desc: t('mavCrossPriceDesc') },
    { id: 'cross2',      name: t('mavCross2Name'),      desc: t('mavCross2Desc') },
    { id: 'triple',      name: t('mavTripleName'),      desc: t('mavTripleDesc'),      type: 'bullish' },
    { id: 'goldendeath', name: t('mavGoldenDeathName'), desc: t('mavGoldenDeathDesc') },
    { id: 'dynamic',     name: t('mavDynamicName'),     desc: t('mavDynamicDesc') },
    { id: 'families',    name: t('mavFamiliesName'),    desc: t('mavFamiliesDesc') },
  ],
  note: t('mavNote'),
});

// Price action — reading the raw price (candles/bars) with no indicators: the
// "price discounts everything" premise, the inside bar (indecision/contraction)
// and outside/mother bar (range engulf), reading trend by HH/HL, higher
// timeframes first, and confluence entries. Pairs with PriceActionVisual.jsx.
export const getPriceAction = (t) => ({
  title: t('pacTitle'),
  intro: t('pacIntro'),
  items: [
    { id: 'what',       name: t('pacWhatName'),       desc: t('pacWhatDesc') },
    { id: 'inside',     name: t('pacInsideName'),     desc: t('pacInsideDesc'),     type: 'neutral' },
    { id: 'outside',    name: t('pacOutsideName'),    desc: t('pacOutsideDesc'),    type: 'bullish' },
    { id: 'trend',      name: t('pacTrendName'),      desc: t('pacTrendDesc') },
    { id: 'htf',        name: t('pacHtfName'),        desc: t('pacHtfDesc'),        type: 'bullish' },
    { id: 'confluence', name: t('pacConfluenceName'), desc: t('pacConfluenceDesc'), type: 'bullish' },
  ],
  note: t('pacNote'),
});

// The Gann Box — a technical-analysis drawing tool (W.D. Gann) anchored on a
// major swing pivot that divides BOTH price and time into proportional levels
// (0/25/50/75/100%), with the 1×1 diagonal as the price–time equilibrium. Covers
// what it is, where to anchor (which high/low), how to build it, the proportions,
// trading the levels, directional reads on closes, timeframes, and an honest
// myth-vs-reality note. Pairs with GannBoxVisual.jsx. Sits in the technical pillar.
export const getGannBox = (t) => ({
  title: t('gannTitle'),
  intro: t('gannIntro'),
  items: [
    { id: 'what',        name: t('gannWhatName'),        desc: t('gannWhatDesc') },
    { id: 'anchor',      name: t('gannAnchorName'),      desc: t('gannAnchorDesc') },
    { id: 'build',       name: t('gannBuildName'),       desc: t('gannBuildDesc') },
    { id: 'proportions', name: t('gannProportionsName'), desc: t('gannProportionsDesc') },
    { id: 'levels',      name: t('gannLevelsName'),      desc: t('gannLevelsDesc'),      type: 'bullish' },
    { id: 'close',       name: t('gannCloseName'),       desc: t('gannCloseDesc'),       type: 'bearish' },
    { id: 'timeframes',  name: t('gannTimeframesName'),  desc: t('gannTimeframesDesc') },
    { id: 'myth',        name: t('gannMythName'),        desc: t('gannMythDesc'),        type: 'neutral' },
  ],
  note: t('gannNote'),
});

// DeMark TD Sequential/Combo — Tom DeMark's counter-trend exhaustion/timing tool
// that ships on Bloomberg yet retail barely knows: the TD Price Flip, the 9-bar
// Setup, the "perfected" setup, the 13-bar Countdown, how to use it, honest limits.
export const getDeMark = (t) => ({
  title: t('dmkTitle'),
  intro: t('dmkIntro'),
  items: [
    { id: 'what',      name: t('dmkWhatName'),      desc: t('dmkWhatDesc') },
    { id: 'flip',      name: t('dmkFlipName'),      desc: t('dmkFlipDesc') },
    { id: 'setup',     name: t('dmkSetupName'),     desc: t('dmkSetupDesc') },
    { id: 'perfected', name: t('dmkPerfectedName'), desc: t('dmkPerfectedDesc'), type: 'bullish' },
    { id: 'countdown', name: t('dmkCountdownName'), desc: t('dmkCountdownDesc') },
    { id: 'use',       name: t('dmkUseName'),       desc: t('dmkUseDesc'),       type: 'bullish' },
    { id: 'limits',    name: t('dmkLimitsName'),    desc: t('dmkLimitsDesc'),    type: 'neutral' },
  ],
  note: t('dmkNote'),
});

// Ehlers DSP indicators — John Ehlers applied digital signal processing to price:
// the Fisher Transform, the MAMA/MESA adaptive average, dominant-cycle measurement
// + sinewave, and low-lag filters (SuperSmoother/roofing). Serious maths, very niche.
export const getEhlers = (t) => ({
  title: t('ehlTitle'),
  intro: t('ehlIntro'),
  items: [
    { id: 'what',    name: t('ehlWhatName'),    desc: t('ehlWhatDesc') },
    { id: 'fisher',  name: t('ehlFisherName'),  desc: t('ehlFisherDesc'),  type: 'bullish' },
    { id: 'mama',    name: t('ehlMamaName'),    desc: t('ehlMamaDesc') },
    { id: 'cycle',   name: t('ehlCycleName'),   desc: t('ehlCycleDesc') },
    { id: 'filters', name: t('ehlFiltersName'), desc: t('ehlFiltersDesc') },
    { id: 'limits',  name: t('ehlLimitsName'),  desc: t('ehlLimitsDesc'),  type: 'neutral' },
  ],
  note: t('ehlNote'),
});

// Relative Rotation Graphs (RRG) — Julius de Kempenaer's 4-quadrant rotation
// map (RS-Ratio vs RS-Momentum against a benchmark): the axes, the Leading/
// Weakening/Lagging/Improving quadrants, the clockwise rotation, the tails, use.
export const getRRG = (t) => ({
  title: t('rrgTitle'),
  intro: t('rrgIntro'),
  items: [
    { id: 'what',      name: t('rrgWhatName'),      desc: t('rrgWhatDesc') },
    { id: 'axes',      name: t('rrgAxesName'),      desc: t('rrgAxesDesc') },
    { id: 'quadrants', name: t('rrgQuadrantsName'), desc: t('rrgQuadrantsDesc') },
    { id: 'rotation',  name: t('rrgRotationName'),  desc: t('rrgRotationDesc') },
    { id: 'tails',     name: t('rrgTailsName'),     desc: t('rrgTailsDesc'),     type: 'bullish' },
    { id: 'use',       name: t('rrgUseName'),       desc: t('rrgUseDesc'),       type: 'bullish' },
    { id: 'limits',    name: t('rrgLimitsName'),    desc: t('rrgLimitsDesc'),    type: 'neutral' },
  ],
  note: t('rrgNote'),
});

// Andrews' Pitchfork (median line theory) — Alan Andrews' 3-parallel-line tool
// from 3 pivots: how to draw it, the median line as a magnet, the parallels as
// channel S/R, the Schiff variant, how to trade it, and honest (discretionary) limits.
export const getPitchfork = (t) => ({
  title: t('pfTitle'),
  intro: t('pfIntro'),
  items: [
    { id: 'what',   name: t('pfWhatName'),   desc: t('pfWhatDesc') },
    { id: 'build',  name: t('pfBuildName'),  desc: t('pfBuildDesc') },
    { id: 'median', name: t('pfMedianName'), desc: t('pfMedianDesc'),  type: 'bullish' },
    { id: 'lines',  name: t('pfLinesName'),  desc: t('pfLinesDesc') },
    { id: 'schiff', name: t('pfSchiffName'), desc: t('pfSchiffDesc') },
    { id: 'use',    name: t('pfUseName'),    desc: t('pfUseDesc'),     type: 'bullish' },
    { id: 'limits', name: t('pfLimitsName'), desc: t('pfLimitsDesc'),  type: 'neutral' },
  ],
  note: t('pfNote'),
});

// Bill Williams "Trading Chaos" — the once-famous, now-obscure system: the
// Alligator (3 displaced smoothed MAs), Fractals, the Awesome Oscillator, the
// Gator + Market Facilitation Index, how the 5 "dimensions" combine, honest limits.
export const getBillWilliams = (t) => ({
  title: t('bwTitle'),
  intro: t('bwIntro'),
  items: [
    { id: 'what',      name: t('bwWhatName'),      desc: t('bwWhatDesc') },
    { id: 'alligator', name: t('bwAlligatorName'), desc: t('bwAlligatorDesc') },
    { id: 'fractals',  name: t('bwFractalsName'),  desc: t('bwFractalsDesc'),  type: 'bullish' },
    { id: 'ao',        name: t('bwAoName'),        desc: t('bwAoDesc') },
    { id: 'gatormfi',  name: t('bwGatorMfiName'),  desc: t('bwGatorMfiDesc') },
    { id: 'use',       name: t('bwUseName'),       desc: t('bwUseDesc'),       type: 'bullish' },
    { id: 'limits',    name: t('bwLimitsName'),    desc: t('bwLimitsDesc'),    type: 'neutral' },
  ],
  note: t('bwNote'),
});

// Wolfe Waves — a cult, very obscure 5-wave reversal pattern that projects a
// target line in price AND time: the structure, the target line, the validity
// rules, how to trade it, and an honest (highly subjective) limits card.
export const getWolfeWaves = (t) => ({
  title: t('wlfTitle'),
  intro: t('wlfIntro'),
  items: [
    { id: 'what',      name: t('wlfWhatName'),      desc: t('wlfWhatDesc') },
    { id: 'structure', name: t('wlfStructureName'), desc: t('wlfStructureDesc') },
    { id: 'line',      name: t('wlfLineName'),      desc: t('wlfLineDesc'),      type: 'bullish' },
    { id: 'rules',     name: t('wlfRulesName'),     desc: t('wlfRulesDesc') },
    { id: 'use',       name: t('wlfUseName'),       desc: t('wlfUseDesc'),       type: 'bullish' },
    { id: 'limits',    name: t('wlfLimitsName'),    desc: t('wlfLimitsDesc'),    type: 'neutral' },
  ],
  note: t('wlfNote'),
});

// Market Profile & Auction Market Theory — Steidlmayer's TPO/time-based view and
// the auction framework (value area, POC, initial balance, balance vs imbalance).
// Complements the volume-profile/POC already covered in advanced-ta/order-flow.
export const getMarketProfile = (t) => ({
  title: t('mpTitle'),
  intro: t('mpIntro'),
  items: [
    { id: 'what',     name: t('mpWhatName'),     desc: t('mpWhatDesc') },
    { id: 'tpo',      name: t('mpTpoName'),      desc: t('mpTpoDesc') },
    { id: 'valuepoc', name: t('mpValuePocName'), desc: t('mpValuePocDesc'), type: 'bullish' },
    { id: 'ib',       name: t('mpIbName'),       desc: t('mpIbDesc') },
    { id: 'use',      name: t('mpUseName'),      desc: t('mpUseDesc'),      type: 'bullish' },
    { id: 'limits',   name: t('mpLimitsName'),   desc: t('mpLimitsDesc'),   type: 'neutral' },
  ],
  note: t('mpNote'),
});

// The Elder system — Alexander Elder's practical toolkit: the Triple Screen,
// Elder-Ray (Bull/Bear Power), the Force Index, the Impulse System, and honest
// limits (classic, sensible, edge is in the discipline more than the indicators).
export const getElder = (t) => ({
  title: t('eldTitle'),
  intro: t('eldIntro'),
  items: [
    { id: 'what',        name: t('eldWhatName'),        desc: t('eldWhatDesc') },
    { id: 'triplescreen',name: t('eldTripleName'),      desc: t('eldTripleDesc'),  type: 'bullish' },
    { id: 'elderray',    name: t('eldRayName'),         desc: t('eldRayDesc') },
    { id: 'forceindex',  name: t('eldForceName'),       desc: t('eldForceDesc') },
    { id: 'impulse',     name: t('eldImpulseName'),     desc: t('eldImpulseDesc'), type: 'bullish' },
    { id: 'limits',      name: t('eldLimitsName'),      desc: t('eldLimitsDesc'),  type: 'neutral' },
  ],
  note: t('eldNote'),
});

// Obscure oscillators — a bundle of little-known momentum tools: the Coppock
// Curve (long-term bottoms), the Schaff Trend Cycle, Connors RSI-2 (mean
// reversion) and the True Strength Index (TSI), with honest limits.
export const getObscureOscillators = (t) => ({
  title: t('oscTitle'),
  intro: t('oscIntro'),
  items: [
    { id: 'what',    name: t('oscWhatName'),    desc: t('oscWhatDesc') },
    { id: 'coppock', name: t('oscCoppockName'), desc: t('oscCoppockDesc'), type: 'bullish' },
    { id: 'schaff',  name: t('oscSchaffName'),  desc: t('oscSchaffDesc') },
    { id: 'connors', name: t('oscConnorsName'), desc: t('oscConnorsDesc') },
    { id: 'tsi',     name: t('oscTsiName'),     desc: t('oscTsiDesc') },
    { id: 'limits',  name: t('oscLimitsName'),  desc: t('oscLimitsDesc'),  type: 'neutral' },
  ],
  note: t('oscNote'),
});

// Time & cycles — the forgotten TIME axis of technical analysis: Fibonacci time
// zones and clusters, Hurst's nominal cycle model (nested waves) and the FLD, plus
// an honest limits card (cycles drift, subjective). Sits beside Gann in the pillar.
export const getTimeCycles = (t) => ({
  title: t('cycTitle'),
  intro: t('cycIntro'),
  items: [
    { id: 'what',        name: t('cycWhatName'),        desc: t('cycWhatDesc') },
    { id: 'fibtime',     name: t('cycFibTimeName'),     desc: t('cycFibTimeDesc') },
    { id: 'clusters',    name: t('cycClustersName'),    desc: t('cycClustersDesc'), type: 'bullish' },
    { id: 'hurst',       name: t('cycHurstName'),       desc: t('cycHurstDesc') },
    { id: 'fld',         name: t('cycFldName'),         desc: t('cycFldDesc') },
    { id: 'limits',      name: t('cycLimitsName'),      desc: t('cycLimitsDesc'),   type: 'neutral' },
  ],
  note: t('cycNote'),
});

// Trading psychology — problem -> solution. The actionable/fix layer that
// complements the descriptive biases module: each item names a recognisable
// problem in the trader's own voice and gives the evidence-based fix, built on
// implementation intentions ("if-then"), Steenbarger's self-monitoring and
// Douglas's probabilistic mindset. Sits in the psychology pillar.
export const getPsychSolutions = (t) => ({
  title: t('pssTitle'),
  intro: t('pssIntro'),
  items: [
    { id: 'ifthen',        name: t('pssIfThenName'),      desc: t('pssIfThenDesc'),      type: 'bullish' },
    { id: 'revenge',       name: t('pssRevengeName'),     desc: t('pssRevengeDesc'),     type: 'bearish' },
    { id: 'movestop',      name: t('pssMoveStopName'),    desc: t('pssMoveStopDesc'),    type: 'bearish' },
    { id: 'fomo',          name: t('pssFomoName'),        desc: t('pssFomoDesc'),        type: 'bearish' },
    { id: 'trigger',       name: t('pssTriggerName'),     desc: t('pssTriggerDesc'),     type: 'neutral' },
    { id: 'overtrading',   name: t('pssOvertradingName'), desc: t('pssOvertradingDesc'), type: 'bearish' },
    { id: 'disposition',   name: t('pssDispositionName'), desc: t('pssDispositionDesc'), type: 'bearish' },
    { id: 'tilt',          name: t('pssTiltName'),        desc: t('pssTiltDesc'),        type: 'bearish' },
    { id: 'probabilistic', name: t('pssProbName'),        desc: t('pssProbDesc'),        type: 'bullish' },
  ],
  note: t('pssNote'),
});

// System adherence — how to actually FOLLOW your system every time. The
// "engineering of discipline": write the rules, automate execution, pre-commit
// (Ulysses contracts), score the process not P&L, accountability, environment
// design, routine/habit, the review loop, and size-to-comply. Problem -> solution.
export const getSystemAdherence = (t) => ({
  title: t('sysTitle'),
  intro: t('sysIntro'),
  items: [
    { id: 'written',      name: t('sysWrittenName'),      desc: t('sysWrittenDesc'),      type: 'bullish' },
    { id: 'automate',     name: t('sysAutomateName'),     desc: t('sysAutomateDesc') },
    { id: 'precommit',    name: t('sysPrecommitName'),    desc: t('sysPrecommitDesc'),    type: 'bearish' },
    { id: 'scoreprocess', name: t('sysScoreName'),        desc: t('sysScoreDesc'),        type: 'bullish' },
    { id: 'accountability', name: t('sysAccountName'),    desc: t('sysAccountDesc') },
    { id: 'environment',  name: t('sysEnvName'),          desc: t('sysEnvDesc') },
    { id: 'routine',      name: t('sysRoutineName'),      desc: t('sysRoutineDesc'),      type: 'bullish' },
    { id: 'review',       name: t('sysReviewName'),       desc: t('sysReviewDesc') },
    { id: 'sizetocomply', name: t('sysSizeName'),         desc: t('sysSizeDesc'),         type: 'bearish' },
  ],
  note: t('sysNote'),
});

// Dealer positioning & gamma — the lesser-known options market structure that
// actually moves the underlying: market makers hedging delta, gamma exposure
// (GEX) dampening/amplifying vol, pinning/max pain, the gamma squeeze, vanna
// (IV-driven), charm (the OPEX drift), and 0DTE/OPEX. Pairs with GammaExposureVisual.jsx.
export const getGammaExposure = (t) => ({
  title: t('gexTitle'),
  intro: t('gexIntro'),
  items: [
    { id: 'mm',      name: t('gexMmName'),      desc: t('gexMmDesc') },
    { id: 'gamma',   name: t('gexGammaName'),   desc: t('gexGammaDesc') },
    { id: 'pin',     name: t('gexPinName'),     desc: t('gexPinDesc') },
    { id: 'squeeze', name: t('gexSqueezeName'), desc: t('gexSqueezeDesc'), type: 'bullish' },
    { id: 'vanna',   name: t('gexVannaName'),   desc: t('gexVannaDesc'),   type: 'bullish' },
    { id: 'charm',   name: t('gexCharmName'),   desc: t('gexCharmDesc') },
    { id: 'zerodte', name: t('gexZeroDteName'), desc: t('gexZeroDteDesc'), type: 'bearish' },
  ],
  note: t('gexNote'),
});

// "Free isn't free" — how commission-free brokers really make money: payment
// for order flow (PFOF), internalisation by wholesalers, the invisible spread
// cost, the conflict of interest, and how to protect yourself. Pairs with
// PfofVisual.jsx. Fits the honest/broker-safety line of the site.
export const getOrderFlowPayment = (t) => ({
  title: t('pfofTitle'),
  intro: t('pfofIntro'),
  items: [
    { id: 'free',     name: t('pfofFreeName'),     desc: t('pfofFreeDesc'),     type: 'bearish' },
    { id: 'pfof',     name: t('pfofPfofName'),     desc: t('pfofPfofDesc') },
    { id: 'internal', name: t('pfofInternalName'), desc: t('pfofInternalDesc'), type: 'bearish' },
    { id: 'spread',   name: t('pfofSpreadName'),   desc: t('pfofSpreadDesc'),   type: 'bearish' },
    { id: 'conflict', name: t('pfofConflictName'), desc: t('pfofConflictDesc'), type: 'bearish' },
    { id: 'protect',  name: t('pfofProtectName'),  desc: t('pfofProtectDesc'),  type: 'bullish' },
  ],
  note: t('pfofNote'),
});

// Macro net liquidity — the hidden market driver retail rarely hears about: net
// liquidity = Fed balance sheet (WALCL) − TGA − RRP, QE/QT, the Treasury account,
// reverse repo, the ~0.95 S&P correlation and its limits. Pairs with NetLiquidityVisual.jsx.
export const getNetLiquidity = (t) => ({
  title: t('liqTitle'),
  intro: t('liqIntro'),
  items: [
    { id: 'what',    name: t('liqWhatName'),    desc: t('liqWhatDesc') },
    { id: 'balance', name: t('liqBalanceName'), desc: t('liqBalanceDesc') },
    { id: 'tga',     name: t('liqTgaName'),     desc: t('liqTgaDesc') },
    { id: 'rrp',     name: t('liqRrpName'),     desc: t('liqRrpDesc') },
    { id: 'market',  name: t('liqMarketName'),  desc: t('liqMarketDesc'),  type: 'bullish' },
    { id: 'caveat',  name: t('liqCaveatName'),  desc: t('liqCaveatDesc'),  type: 'bearish' },
  ],
  note: t('liqNote'),
});

// Fat tails & tail risk — why the normal distribution lies: fat tails/kurtosis,
// black swans (Taleb), the "impossible" sigma moves that keep happening, ruin &
// non-ergodicity, convexity/tail hedging and the barbell. Pairs with TailRiskVisual.jsx.
export const getTailRisk = (t) => ({
  title: t('tailTitle'),
  intro: t('tailIntro'),
  items: [
    { id: 'normal',    name: t('tailNormalName'),    desc: t('tailNormalDesc'),    type: 'bearish' },
    { id: 'blackswan', name: t('tailBlackSwanName'), desc: t('tailBlackSwanDesc'), type: 'bearish' },
    { id: 'frequency', name: t('tailFrequencyName'), desc: t('tailFrequencyDesc'), type: 'bearish' },
    { id: 'ruin',      name: t('tailRuinName'),      desc: t('tailRuinDesc'),      type: 'bearish' },
    { id: 'convexity', name: t('tailConvexityName'), desc: t('tailConvexityDesc'), type: 'bullish' },
    { id: 'barbell',   name: t('tailBarbellName'),   desc: t('tailBarbellDesc'),   type: 'bullish' },
  ],
  note: t('tailNote'),
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
      },
      {
        id: 'correlation',
        title: t('capCorrelationTitle'),
        description: t('capCorrelationDesc'),
        importance: 'high'
      },
      {
        id: 'sequence-risk',
        title: t('capSequenceTitle'),
        description: t('capSequenceDesc'),
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

// Value a company — deep fundamental analysis of a stock: income statement,
// margins, free cash flow, debt, ROE/ROIC, the economic moat, valuation
// (multiples + DCF) and how to read an earnings report. Pairs with SVGs in
// CompanyValuationVisual.jsx.
export const getCompanyValuation = (t) => ({
  title: t('cvTitle'),
  intro: t('cvIntro'),
  items: [
    { id: 'whatis',    name: t('cvWhatisName'),    desc: t('cvWhatisDesc') },
    { id: 'income',    name: t('cvIncomeName'),    desc: t('cvIncomeDesc') },
    { id: 'margins',   name: t('cvMarginsName'),   desc: t('cvMarginsDesc') },
    { id: 'fcf',       name: t('cvFcfName'),       desc: t('cvFcfDesc') },
    { id: 'debt',      name: t('cvDebtName'),      desc: t('cvDebtDesc') },
    { id: 'roic',      name: t('cvRoicName'),      desc: t('cvRoicDesc') },
    { id: 'moat',      name: t('cvMoatName'),      desc: t('cvMoatDesc') },
    { id: 'multiples', name: t('cvMultiplesName'), desc: t('cvMultiplesDesc') },
    { id: 'dcf',       name: t('cvDcfName'),       desc: t('cvDcfDesc') },
    { id: 'earnings',  name: t('cvEarningsName'),  desc: t('cvEarningsDesc') },
  ],
  note: t('cvNote'),
});

// Macro: the economic cycle, central-bank rates, the yield curve and sector
// rotation — the top-down forces that move whole markets. Pairs with SVG
// diagrams in MacroVisual.jsx.
export const getMacro = (t) => ({
  title: t('mcTitle'),
  intro: t('mcIntro'),
  items: [
    { id: 'whatis',     name: t('mcWhatisName'),     desc: t('mcWhatisDesc') },
    { id: 'cycle',      name: t('mcCycleName'),      desc: t('mcCycleDesc') },
    { id: 'rates',      name: t('mcRatesName'),      desc: t('mcRatesDesc') },
    { id: 'yieldcurve', name: t('mcYieldName'),      desc: t('mcYieldDesc') },
    { id: 'inversion',  name: t('mcInversionName'),  desc: t('mcInversionDesc'), type: 'bearish' },
    { id: 'sectors',    name: t('mcSectorsName'),    desc: t('mcSectorsDesc') },
    { id: 'rotation',   name: t('mcRotationName'),   desc: t('mcRotationDesc') },
    { id: 'leading',    name: t('mcLeadingName'),    desc: t('mcLeadingDesc') },
  ],
  note: t('mcNote'),
});

// Order flow / tape reading — reading the raw buying/selling pressure (DOM,
// time & sales, volume delta, footprint, absorption, icebergs, POC) rather than
// only the finished price. Pairs with SVG diagrams in OrderFlowVisual.jsx.
export const getOrderFlow = (t) => ({
  title: t('ofTitle'),
  intro: t('ofIntro'),
  items: [
    { id: 'whatis',     name: t('ofWhatisName'),     desc: t('ofWhatisDesc') },
    { id: 'dom',        name: t('ofDomName'),        desc: t('ofDomDesc') },
    { id: 'tape',       name: t('ofTapeName'),       desc: t('ofTapeDesc') },
    { id: 'delta',      name: t('ofDeltaName'),      desc: t('ofDeltaDesc') },
    { id: 'footprint',  name: t('ofFootprintName'),  desc: t('ofFootprintDesc') },
    { id: 'absorption', name: t('ofAbsorptionName'), desc: t('ofAbsorptionDesc'), type: 'bullish' },
    { id: 'iceberg',    name: t('ofIcebergName'),    desc: t('ofIcebergDesc') },
    { id: 'poc',        name: t('ofPocName'),        desc: t('ofPocDesc') },
  ],
  note: t('ofNote'),
});

// "Start here" — the zero-knowledge first lesson: a linear 9-step walkthrough of
// what opening a trade actually means (long/short, reading a candle, bid/ask,
// units, leverage, the 1% rule, sizing, placing the order, closing + journaling).
// Ends with a CTA into the Position Size Calculator (/dashboard?tab=position).
export const getStartHere = (t) => ({
  title: t('shTitle'),
  intro: t('shIntro'),
  steps: [
    { id: 'longshort', name: t('shLongShortName'), desc: t('shLongShortDesc') },
    { id: 'candle',    name: t('shCandleName'),    desc: t('shCandleDesc') },
    { id: 'bidask',    name: t('shBidAskName'),    desc: t('shBidAskDesc') },
    { id: 'units',     name: t('shUnitsName'),     desc: t('shUnitsDesc') },
    { id: 'leverage',  name: t('shLeverageName'),  desc: t('shLeverageDesc') },
    { id: 'risk',      name: t('shRiskName'),      desc: t('shRiskDesc') },
    { id: 'size',      name: t('shSizeName'),      desc: t('shSizeDesc') },
    { id: 'order',     name: t('shOrderName'),     desc: t('shOrderDesc') },
    { id: 'manage',    name: t('shManageName'),    desc: t('shManageDesc') },
  ],
  cta: { title: t('shCtaTitle'), desc: t('shCtaDesc'), button: t('shCtaButton') },
  note: t('shNote'),
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
