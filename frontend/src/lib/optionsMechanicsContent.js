/**
 * Options mechanics: how the premium is priced, how you open and close a
 * position, and how rolling works.
 *
 * These three subjects had ZERO coverage anywhere in the app (verified across
 * all 8 locales: "sell to open" = 0 hits, "market maker" only in the order-flow
 * module, "rollover" only as a passing mention). They are the first things a
 * user meets in a real broker screen and where the expensive mistakes happen.
 *
 * Same language policy as marketTypesContent.js: es + en written in full,
 * everything else falls back to English rather than Spanish.
 */

const CONTENT = {
  es: {
    // ── 1. How the premium price is formed ──────────────────────
    pricing: {
      title: 'Cómo se forma el precio de la prima',
      lead: 'El precio que ves en la cadena de opciones no lo pone nadie a dedo, pero tampoco sale solo de una fórmula. Es la suma de tres cosas: un valor teórico, la oferta y la demanda reales, y el margen del creador de mercado.',
      venues: [
        {
          k: 'Mercados organizados: hay libro de órdenes real',
          v: 'En una bolsa de opciones existe un order book por cada strike y cada vencimiento: órdenes de compra (bids) y de venta (asks), el mejor bid y el mejor ask (top of book) y varios niveles de profundidad. Tu bróker envía la orden al mercado y el precio de la prima sale de ese libro.',
        },
        {
          k: 'Brókers OTC / creadores de mercado: te ponen un precio',
          v: 'Muchos brókers minoristas no muestran un libro nivel por nivel. Te enseñan un precio derivado de su propia liquidez o de uno o varios proveedores, y a veces internalizan el flujo (el bróker es tu contraparte) para después cubrirse en el mercado mayorista. Ese precio sigue reflejando el mercado real, pero pasa por su modelo.',
        },
        {
          k: 'Los creadores de mercado son el motor',
          v: 'Publican continuamente bid y ask, y ganan con el spread entre ambos, no con la dirección del mercado. Su actividad es lo que hace que exista un precio en todo momento para cada prima, incluso en strikes que nadie está negociando.',
        },
      ],
      formula: {
        title: 'La ecuación real del precio en pantalla',
        parts: [
          { k: 'Valor teórico', v: 'Sale del modelo (Black-Scholes u otros) con seis entradas: precio del subyacente, strike, tiempo a vencimiento, volatilidad implícita, tipos de interés y dividendos.' },
          { k: '+ Oferta y demanda', v: 'Si hay más demanda de calls que oferta, la prima sube. Si hay más oferta, baja. Por eso dos opciones con el mismo valor teórico pueden cotizar distinto.' },
          { k: '+ Spread del creador de mercado', v: 'La horquilla refleja la liquidez del strike y el riesgo que asume quien te da contrapartida. En strikes ilíquidos puede ser enorme, y es un coste que pagas entero al entrar y salir.' },
        ],
      },
      flow: {
        title: 'Por dónde viaja tu orden',
        steps: ['Tú', 'Tu bróker', 'Creador de mercado', 'Libro de órdenes / mercado mayorista'],
        note: 'El precio del subyacente entra por la derecha: el bróker lo recibe, actualiza el valor teórico de la prima, lo mezcla con el libro o con su modelo de creación de mercado y te muestra el precio de compra y de venta.',
      },
      delta: {
        title: 'Cómo entra el subyacente en la prima',
        v: 'La delta mide cuánto cambia la prima por cada unidad que se mueve el subyacente. Si el subyacente sube, las calls tienden a subir y las puts a bajar; si baja, al revés. Una delta de 0,50 significa que la prima se mueve 50 céntimos por cada euro del subyacente.',
      },
    },

    // ── 2. Leverage: notional vs effective ──────────────────────
    leverage: {
      title: 'Apalancamiento: el nocional engaña, la delta manda',
      lead: 'Las opciones son instrumentos apalancados por naturaleza: con una prima pequeña controlas un nocional grande. Pero hay dos formas de medir ese apalancamiento, y solo una es útil.',
      nominal: {
        title: 'Apalancamiento nocional',
        formula: 'Nocional controlado ÷ prima pagada',
        v: 'Es la cuenta ingenua. Subyacente a 100 €, contrato de 100 acciones = 10.000 € de nocional; prima de 2 € por acción = 200 € por contrato. Apalancamiento nocional = 10.000 ÷ 200 = 50×.',
      },
      effective: {
        title: 'Apalancamiento efectivo (ajustado por delta)',
        formula: 'Apalancamiento nocional × delta',
        v: 'Es el que importa. Con delta 0,50 solo te mueves como si tuvieras el 50% del subyacente: 50 × 0,50 = 25×. Las opciones muy fuera de dinero (OTM) tienen MÁS apalancamiento nocional porque la prima es minúscula, pero MENOS delta, así que reaccionan menos a cada movimiento del precio.',
      },
      warning: 'Es la trampa del "billete de lotería": compras la opción más barata porque el apalancamiento teórico es enorme, y luego el subyacente se mueve a tu favor y tu prima apenas se inmuta — mientras la theta se la come cada día. Si el subyacente sube un 2%, una OTM barata puede subir un 20-30%; pero si no se mueve o va en tu contra, esa misma prima puede caer un 50-80% en días.',
    },

    // ── 3. Opening and closing ──────────────────────────────────
    openClose: {
      title: 'Abrir y cerrar: las cuatro acciones que tienes que distinguir',
      lead: 'En la plataforma de tu bróker toda operación de opciones es una de estas cuatro acciones. Confundir abrir con cerrar es cómo la gente acaba vendida en opciones sin pretenderlo.',
      actions: [
        { code: 'BTO', es: 'Comprar para abrir', en: 'Buy to Open', flow: 'Débito', dir: 'open', v: 'Inicias una posición larga pagando la prima. Adquieres el derecho, no la obligación. Riesgo máximo: la prima pagada.' },
        { code: 'STO', es: 'Vender para abrir', en: 'Sell to Open', flow: 'Crédito', dir: 'open', v: 'Inicias una posición vendida cobrando la prima. Asumes la OBLIGACIÓN de entregar o comprar el subyacente si te ejercen. Típico de covered calls y short puts. Riesgo: potencialmente muy grande.' },
        { code: 'STC', es: 'Vender para cerrar', en: 'Sell to Close', flow: 'Crédito', dir: 'close', v: 'Cierras una posición que abriste comprando. Vendes el contrato en el mercado y realizas el resultado.' },
        { code: 'BTC', es: 'Comprar para cerrar', en: 'Buy to Close', flow: 'Débito', dir: 'close', v: 'Cierras una posición que abriste vendiendo. Recompras el contrato para extinguir la obligación.' },
      ],
      howToOpen: {
        title: 'Cómo se abre, paso a paso',
        steps: [
          'Abre la cadena de opciones (option chain) del subyacente.',
          'Elige el vencimiento. Para direccional, lo habitual es 30-60 días.',
          'Elige call o put y el strike.',
          'Haz clic en el ASK si compras, o en el BID si vendes: la plataforma preconfigura la orden.',
          'Fija el número de contratos y recuerda el multiplicador (×100 en acciones).',
          'Usa orden LIMITADA, no a mercado: en opciones la horquilla puede ser muy ancha.',
          'Comprueba que tienes capital o margen suficiente y envía.',
        ],
      },
      howToClose: {
        title: 'Las tres formas de cerrar',
        ways: [
          { k: 'Vender para cerrar (STC)', v: 'Si compraste para abrir, vendes el contrato en el mercado.' },
          { k: 'Comprar para cerrar (BTC)', v: 'Si vendiste para abrir, recompras el contrato.' },
          { k: 'Dejar que expire', v: 'Si no haces nada: las OTM expiran sin valor (pierdes la prima); las ITM se ejercen o se liquidan automáticamente, lo que en opciones sobre acciones significa recibir o entregar 100 acciones por contrato.' },
        ],
        partial: 'Muchas plataformas permiten el cierre parcial: cerrar solo parte de los contratos y dejar el resto corriendo. Es la forma más sencilla de asegurar parte del beneficio sin renunciar a la continuación.',
      },
      risks: {
        title: 'Antes de darle a enviar',
        items: [
          'Cerrar antes del vencimiento evita el riesgo de ejercicio y de entrega, sobre todo si la opción está ITM.',
          'Comprueba la liquidez y la horquilla del strike concreto: el volumen del subyacente no dice nada del strike.',
          'Vigila el horario: en los últimos minutos la horquilla se ensancha.',
          'Ten claro si tu orden es de apertura o de cierre. Es el error de posición más común y el más caro.',
        ],
      },
    },

    // ── 4. Rollover / rolling ───────────────────────────────────
    rolling: {
      title: 'Rollover: mover la posición al siguiente vencimiento',
      lead: 'Rolar es cerrar una posición cercana al vencimiento y abrir otra similar en un vencimiento posterior para mantener la exposición. En futuros suele ser literal; en opciones casi siempre cambia también el perfil de riesgo.',
      futuresVsOptions: [
        { k: 'En futuros', v: 'Es directo: cierras el contrato que expira y abres el mismo sesgo en el siguiente vencimiento. El objetivo es evitar el vencimiento, la entrega física cuando aplique y la pérdida de liquidez del contrato cercano.' },
        { k: 'En opciones (rolling)', v: 'No es copiar la posición: al cambiar de vencimiento o de strike cambian la prima, la delta, la theta y todo el perfil de payoff. Por eso se habla de tipos de roll distintos.' },
      ],
      types: [
        { k: 'Roll out', v: 'Mover la opción a un vencimiento más lejano manteniendo el strike. Compras tiempo para que la tesis se desarrolle.' },
        { k: 'Roll up', v: 'Subir el strike. Típico en calls cuando el subyacente ha subido: realizas parte del valor intrínseco, reduces delta y reposicionas la apuesta más arriba.' },
        { k: 'Roll down', v: 'Bajar el strike. Típico en puts o como ajuste defensivo.' },
        { k: 'Roll out and up / down', v: 'Cambiar vencimiento y strike a la vez. Es el ajuste más completo y también el que más cambia el riesgo.' },
      ],
      when: {
        title: 'Cuándo se rola',
        futures: [
          'Cuando el volumen y el interés abierto empiezan a migrar del contrato cercano al siguiente.',
          'Unos días antes del vencimiento, para evitar el ensanchamiento de horquillas y la peor liquidez del último momento.',
        ],
        options: [
          'Queda poco tiempo a vencimiento y la theta se acelera.',
          'La opción sigue encajando con la idea original, pero necesita más tiempo.',
          'El strike actual ya no es el más eficiente para el escenario nuevo.',
          'En opciones vendidas: para evitar la asignación o para extender duración y seguir cobrando prima.',
        ],
      },
      cost: {
        title: 'El coste del roll no es solo la comisión',
        items: [
          'La diferencia de precio entre el contrato cercano y el lejano (en futuros).',
          'Contango o backwardation: en contango, rolar una posición larga cuesta dinero cada vez; en backwardation, te lo paga.',
          'El débito o crédito neto de cerrar una opción y abrir la nueva.',
          'Comisiones del bróker en las dos patas.',
          'Slippage por ejecución pobre y horquillas más anchas en strikes o contratos poco líquidos.',
        ],
        key: 'Esto es lo importante: puedes acertar la dirección del mercado y aun así perder parte del rendimiento por una mala estructura de roll. Es el motivo por el que un ETF de materias primas puede caer mientras el precio al contado sube.',
      },
      checklist: {
        title: 'Qué mirar antes de rolar',
        futures: ['Fecha exacta de vencimiento', 'Tipo de liquidación: financiera o física', 'Liquidez del siguiente vencimiento', 'Diferencial entre contratos', 'Coste total con comisiones y slippage'],
        options: ['Días a vencimiento', 'Theta y pérdida temporal', 'Delta y sensibilidad al subyacente', 'Volatilidad implícita', 'Liquidez del nuevo vencimiento y strike', 'Débito o crédito del ajuste'],
      },
      mistakes: {
        title: 'Errores comunes',
        items: [
          'Rolar demasiado tarde y comerse la mala liquidez del último día.',
          'No comprobar la liquidez del nuevo contrato o strike.',
          'Ejecutar una pata y tardar en la otra: te quedas temporalmente sin cobertura o con exposición no deseada.',
          'Ignorar el efecto de la theta, de la IV o del nuevo perfil de riesgo.',
          'No revisar si el producto tiene entrega física al vencimiento.',
        ],
        big: 'Y el error de fondo, el que de verdad cuesta dinero: creer que rolar elimina una pérdida. No la elimina. La desplaza en el tiempo y muchas veces la redistribuye. Rolar es una decisión de gestión, no un botón de deshacer.',
      },
    },
  },

  en: {
    pricing: {
      title: 'How the premium price is formed',
      lead: 'The price you see in the option chain is not set by hand, but it does not come from a formula alone either. It is the sum of three things: a theoretical value, real supply and demand, and the market maker\'s margin.',
      venues: [
        {
          k: 'Organised markets: there is a real order book',
          v: 'On an options exchange there is an order book for every strike and every expiry: bids and asks, best bid and best ask (top of book) and several levels of depth. Your broker routes the order to the market and the premium comes out of that book.',
        },
        {
          k: 'OTC brokers / market makers: they quote you a price',
          v: 'Many retail brokers do not show a level-by-level book. They show a price derived from their own liquidity or from one or more providers, and sometimes they internalise the flow (the broker is your counterparty) and hedge later in the wholesale market. That price still reflects the real market, but it passes through their model.',
        },
        {
          k: 'Market makers are the engine',
          v: 'They continuously publish bid and ask and earn the spread between them, not the market direction. Their activity is what makes a price exist at all times for every premium, even on strikes nobody is trading.',
        },
      ],
      formula: {
        title: 'The real equation behind the screen price',
        parts: [
          { k: 'Theoretical value', v: 'From the model (Black-Scholes or others) with six inputs: underlying price, strike, time to expiry, implied volatility, interest rates and dividends.' },
          { k: '+ Supply and demand', v: 'More demand for calls than supply and the premium rises. More supply and it falls. That is why two options with the same theoretical value can quote differently.' },
          { k: '+ Market maker spread', v: 'The bid-ask gap reflects the strike\'s liquidity and the risk taken by whoever fills you. On illiquid strikes it can be enormous, and you pay it in full both entering and exiting.' },
        ],
      },
      flow: {
        title: 'Where your order travels',
        steps: ['You', 'Your broker', 'Market maker', 'Order book / wholesale market'],
        note: 'The underlying price enters from the right: the broker receives it, updates the theoretical premium, blends it with the book or with its market-making model, and shows you a bid and an ask.',
      },
      delta: {
        title: 'How the underlying feeds into the premium',
        v: 'Delta measures how much the premium changes per unit move in the underlying. If the underlying rises, calls tend to rise and puts to fall; if it falls, the reverse. A delta of 0.50 means the premium moves 50 cents per euro of underlying.',
      },
    },
    leverage: {
      title: 'Leverage: notional lies, delta rules',
      lead: 'Options are leveraged by nature: a small premium controls a large notional. But there are two ways to measure that leverage, and only one is useful.',
      nominal: {
        title: 'Notional leverage',
        formula: 'Notional controlled ÷ premium paid',
        v: 'The naive calculation. Underlying at €100, a contract of 100 shares = €10,000 notional; a €2 per-share premium = €200 per contract. Notional leverage = 10,000 ÷ 200 = 50×.',
      },
      effective: {
        title: 'Effective leverage (delta-adjusted)',
        formula: 'Notional leverage × delta',
        v: 'The one that matters. With delta 0.50 you only move as if you held 50% of the underlying: 50 × 0.50 = 25×. Deep out-of-the-money options carry MORE notional leverage because the premium is tiny, but LESS delta, so they react less to each price move.',
      },
      warning: 'This is the lottery-ticket trap: you buy the cheapest option because the theoretical leverage looks enormous, then the underlying moves your way and the premium barely flinches — while theta eats it every day. If the underlying rises 2%, a cheap OTM option can gain 20-30%; but if it stalls or turns, that same premium can fall 50-80% in days.',
    },
    openClose: {
      title: 'Opening and closing: the four actions you must tell apart',
      lead: 'In your broker\'s platform every options trade is one of these four actions. Confusing opening with closing is how people end up short options they never meant to sell.',
      actions: [
        { code: 'BTO', es: 'Comprar para abrir', en: 'Buy to Open', flow: 'Debit', dir: 'open', v: 'You start a long position by paying the premium. You acquire the right, not the obligation. Maximum risk: the premium paid.' },
        { code: 'STO', es: 'Vender para abrir', en: 'Sell to Open', flow: 'Credit', dir: 'open', v: 'You start a short position by collecting the premium. You take on the OBLIGATION to deliver or buy the underlying if assigned. Typical of covered calls and short puts. Risk: potentially very large.' },
        { code: 'STC', es: 'Vender para cerrar', en: 'Sell to Close', flow: 'Credit', dir: 'close', v: 'You close a position you opened by buying. You sell the contract in the market and realise the result.' },
        { code: 'BTC', es: 'Comprar para cerrar', en: 'Buy to Close', flow: 'Debit', dir: 'close', v: 'You close a position you opened by selling. You buy the contract back to extinguish the obligation.' },
      ],
      howToOpen: {
        title: 'How to open, step by step',
        steps: [
          'Open the underlying\'s option chain.',
          'Pick the expiry. For directional trades, 30-60 days is standard.',
          'Pick call or put and the strike.',
          'Click the ASK to buy, or the BID to sell: the platform pre-fills the order.',
          'Set the number of contracts and remember the multiplier (×100 on equities).',
          'Use a LIMIT order, never market: option spreads can be very wide.',
          'Check you have enough cash or margin and send it.',
        ],
      },
      howToClose: {
        title: 'The three ways to close',
        ways: [
          { k: 'Sell to Close (STC)', v: 'If you bought to open, you sell the contract in the market.' },
          { k: 'Buy to Close (BTC)', v: 'If you sold to open, you buy the contract back.' },
          { k: 'Let it expire', v: 'Do nothing and: OTM options expire worthless (you lose the premium); ITM options are exercised or cash-settled automatically, which on equity options means receiving or delivering 100 shares per contract.' },
        ],
        partial: 'Many platforms allow partial closing: close only some of the contracts and let the rest run. It is the simplest way to bank part of the profit without giving up the continuation.',
      },
      risks: {
        title: 'Before you hit send',
        items: [
          'Closing before expiry avoids exercise and delivery risk, especially when the option is ITM.',
          'Check liquidity and the spread on that specific strike: the underlying\'s volume says nothing about the strike.',
          'Watch the clock: spreads widen in the final minutes.',
          'Be certain whether your order opens or closes. It is the most common position error and the most expensive.',
        ],
      },
    },
    rolling: {
      title: 'Rollover: moving the position to the next expiry',
      lead: 'Rolling means closing a position near expiry and opening a similar one further out to keep the exposure. In futures it is usually literal; in options it almost always changes the risk profile too.',
      futuresVsOptions: [
        { k: 'In futures', v: 'It is straightforward: close the expiring contract and open the same bias in the next expiry. The goal is to avoid expiry, physical delivery where it applies, and the liquidity drain of the front contract.' },
        { k: 'In options (rolling)', v: 'It is not copying the position: changing expiry or strike changes the premium, the delta, the theta and the whole payoff profile. Hence the different types of roll.' },
      ],
      types: [
        { k: 'Roll out', v: 'Move the option to a later expiry keeping the strike. You buy time for the thesis to play out.' },
        { k: 'Roll up', v: 'Raise the strike. Typical on calls after the underlying has risen: you realise part of the intrinsic value, cut delta and reposition higher.' },
        { k: 'Roll down', v: 'Lower the strike. Typical on puts or as a defensive adjustment.' },
        { k: 'Roll out and up / down', v: 'Change expiry and strike at once. The most complete adjustment and the one that changes risk the most.' },
      ],
      when: {
        title: 'When to roll',
        futures: [
          'When volume and open interest start migrating from the front contract to the next one.',
          'A few days before expiry, to avoid widening spreads and the poor last-minute liquidity.',
        ],
        options: [
          'Little time to expiry and theta is accelerating.',
          'The option still fits the original idea but needs more time.',
          'The current strike is no longer the most efficient for the new scenario.',
          'On short options: to avoid assignment or to extend duration and keep collecting premium.',
        ],
      },
      cost: {
        title: 'The cost of a roll is not just commission',
        items: [
          'The price difference between the near and far contract (in futures).',
          'Contango or backwardation: in contango, rolling a long position costs money each time; in backwardation it pays you.',
          'The net debit or credit of closing one option and opening the new one.',
          'Broker commissions on both legs.',
          'Slippage from poor fills and wider spreads on illiquid strikes or contracts.',
        ],
        key: 'Here is what matters: you can be right about market direction and still lose part of the return to a bad roll structure. It is why a commodity ETF can fall while spot rises.',
      },
      checklist: {
        title: 'What to check before rolling',
        futures: ['Exact expiry date', 'Settlement type: cash or physical', 'Liquidity of the next expiry', 'Spread between contracts', 'Total cost including commissions and slippage'],
        options: ['Days to expiry', 'Theta and time decay', 'Delta and sensitivity to the underlying', 'Implied volatility', 'Liquidity of the new expiry and strike', 'Debit or credit of the adjustment'],
      },
      mistakes: {
        title: 'Common mistakes',
        items: [
          'Rolling too late and wearing the last day\'s poor liquidity.',
          'Not checking liquidity on the new contract or strike.',
          'Filling one leg and lagging on the other: you are temporarily unhedged or wrongly exposed.',
          'Ignoring the effect of theta, IV or the new risk profile.',
          'Not checking whether the product settles physically at expiry.',
        ],
        big: 'And the underlying mistake, the one that actually costs money: believing that rolling removes a loss. It does not. It moves the loss in time and often redistributes it. Rolling is a management decision, not an undo button.',
      },
    },
  },
};

export function getOptionsMechanics(locale) {
  return CONTENT[locale] || CONTENT.en;
}

export default CONTENT;
