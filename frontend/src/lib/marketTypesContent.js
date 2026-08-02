/**
 * Deep content for the "Market Types" cards in Fundamentals.
 *
 * Why it lives here and not in lib/i18n/*.js:
 *   - it is long-form prose + numeric tables, not UI strings;
 *   - keeping it out of the i18n dictionaries keeps `i18n-check` meaningful
 *     (that script enforces exact key parity across the 8 locales, which is
 *     right for UI labels and wrong for essays).
 *
 * Language policy (deliberate, see docs/EXAMEN_FINAL_2026-07-26.md §M-45):
 *   es + en are written in full. The other six locales fall back to **English**,
 *   never to Spanish — a Japanese reader gets English, which is useful, instead
 *   of Spanish, which is not. Translating these is tracked as explicit debt.
 *
 * Every number here is a real, checkable contract spec. Nothing invented.
 */

const CONTENT = {
  // ─────────────────────────────────────────────── FOREX
  forex: {
    es: {
      what: 'El mercado de divisas es el más grande del mundo: se negocian unos 7,5 billones de dólares al día. No tiene una bolsa central; es una red de bancos (mercado OTC) abierta 24 horas de domingo por la tarde a viernes por la tarde. Siempre operas un PAR: comprar EUR/USD es comprar euros y vender dólares a la vez.',
      measure: [
        { k: 'Pip', v: 'La unidad mínima de variación estándar: el 4º decimal (0,0001) en casi todos los pares. Excepción: en los pares con yen (JPY) el pip es el 2º decimal (0,01).' },
        { k: 'Pipette', v: 'Un décimo de pip (5º decimal). Los brókers cotizan con pipettes para afinar el spread: 1,08542 son 1,0854 y 2 pipettes.' },
        { k: 'Lote estándar', v: '100.000 unidades de la divisa base. Mini lote = 10.000. Micro lote = 1.000. Nano lote = 100.' },
        { k: 'Valor del pip', v: 'Con un lote estándar y el USD de cotización: 10 $ por pip. Mini: 1 $. Micro: 0,10 $. Si el USD no es la divisa de cotización hay que convertir.' },
        { k: 'Nocional', v: 'Lotes × tamaño del lote × precio. Es tu exposición real, no lo que depositas.' },
        { k: 'Spread', v: 'Diferencia entre compra y venta, medida en pips. Es tu coste de entrada inmediato.' },
        { k: 'Swap / rollover', v: 'Interés que pagas o cobras por mantener la posición de un día para otro (diferencial de tipos entre las dos divisas). Los miércoles suele ser triple, por el ciclo de liquidación del fin de semana.' },
      ],
      example: {
        title: 'Ejemplo resuelto: cuánto arriesgas de verdad',
        rows: [
          ['Cuenta', '5.000 €'],
          ['Riesgo por operación', '1% = 50 €'],
          ['Par', 'EUR/USD a 1,0850'],
          ['Stop loss', '25 pips'],
          ['Valor del pip (1 lote estándar)', '10 $'],
          ['Tamaño máximo', '50 $ ÷ (25 pips × 10 $) = 0,20 lotes (2 mini lotes)'],
          ['Nocional controlado', '0,20 × 100.000 = 20.000 € (4× tu cuenta)'],
        ],
        note: 'Fíjate en la última línea: con un riesgo prudente del 1% ya estás moviendo 4 veces tu cuenta. Ahí es donde el apalancamiento deja de ser abstracto.',
      },
      faq: [
        { q: '¿Cuáles son los pares de divisas más negociados?', a: 'Los "majors", todos contra el dólar: EUR/USD (el más líquido con diferencia, ~28% del volumen), USD/JPY, GBP/USD, USD/CHF, AUD/USD, USD/CAD y NZD/USD. Los cruces sin dólar (EUR/GBP, EUR/JPY, GBP/JPY) tienen menos liquidez y spreads más amplios.' },
        { q: '¿Cuánto vale un pip exactamente?', a: 'Con un lote estándar (100.000 unidades) y el dólar como divisa de cotización, un pip vale 10 $. Con un mini lote, 1 $. Con un micro lote, 0,10 $. Si la divisa de cotización no es el dólar, hay que convertir al tipo de cambio del momento.' },
        { q: '¿Cuándo está abierto el mercado de divisas?', a: '24 horas, cinco días a la semana: abre el domingo a las 22:00 UTC (Sídney) y cierra el viernes a las 22:00 UTC (Nueva York). Las horas útiles reales son los solapamientos: Londres-Nueva York (12:00-16:00 UTC) concentra la mayor liquidez.' },
        { q: '¿Por qué se opera forex con tanto apalancamiento?', a: 'Porque los movimientos diarios son pequeños: un par major se mueve un 0,5-0,8% al día. Sin apalancamiento, las variaciones serían irrelevantes. Ese es también el motivo de que sea tan peligroso: el apalancamiento que hace útil al forex es el que arruina las cuentas.' },
        { q: '¿Qué es el swap en forex y cuándo se cobra?', a: 'Es el interés neto por mantener una posición abierta de un día para otro, calculado con el diferencial de tipos entre las dos divisas. Se aplica al cierre de Nueva York (22:00 UTC). Los miércoles se aplica triple porque cubre la liquidación del fin de semana.' },
      ],
    },
    en: {
      what: 'Foreign exchange is the largest market on earth: roughly $7.5 trillion changes hands every day. It has no central exchange — it is a network of banks (an OTC market) open 24 hours from Sunday evening to Friday evening. You always trade a PAIR: buying EUR/USD means buying euros and selling dollars in the same instant.',
      measure: [
        { k: 'Pip', v: 'The standard minimum move: the 4th decimal (0.0001) on almost every pair. Exception: on yen (JPY) pairs the pip is the 2nd decimal (0.01).' },
        { k: 'Pipette', v: 'One tenth of a pip (5th decimal). Brokers quote pipettes to price the spread finely: 1.08542 is 1.0854 plus 2 pipettes.' },
        { k: 'Standard lot', v: '100,000 units of the base currency. Mini lot = 10,000. Micro lot = 1,000. Nano lot = 100.' },
        { k: 'Pip value', v: 'One standard lot with USD as the quote currency: $10 per pip. Mini: $1. Micro: $0.10. If USD is not the quote currency you must convert.' },
        { k: 'Notional', v: 'Lots × lot size × price. This is your real exposure — not what you deposit.' },
        { k: 'Spread', v: 'Bid-ask difference measured in pips. It is your immediate cost of entry.' },
        { k: 'Swap / rollover', v: 'Interest paid or received for holding overnight (the rate differential between the two currencies). Wednesday is usually triple, covering the weekend settlement cycle.' },
      ],
      example: {
        title: 'Worked example: what you are actually risking',
        rows: [
          ['Account', '€5,000'],
          ['Risk per trade', '1% = €50'],
          ['Pair', 'EUR/USD at 1.0850'],
          ['Stop loss', '25 pips'],
          ['Pip value (1 standard lot)', '$10'],
          ['Maximum size', '$50 ÷ (25 pips × $10) = 0.20 lots (2 mini lots)'],
          ['Notional controlled', '0.20 × 100,000 = €20,000 (4× your account)'],
        ],
        note: 'Look at the last line: a conservative 1% risk already has you moving four times your account. That is the point where leverage stops being an abstraction.',
      },
      faq: [
        { q: 'What are the most traded currency pairs?', a: 'The "majors", all against the dollar: EUR/USD (by far the most liquid, ~28% of volume), USD/JPY, GBP/USD, USD/CHF, AUD/USD, USD/CAD and NZD/USD. Crosses without the dollar (EUR/GBP, EUR/JPY, GBP/JPY) carry less liquidity and wider spreads.' },
        { q: 'How much is one pip worth?', a: 'With one standard lot (100,000 units) and the dollar as quote currency, a pip is worth $10. One mini lot, $1. One micro lot, $0.10. If the quote currency is not the dollar you convert at the current rate.' },
        { q: 'When is the forex market open?', a: '24 hours, five days a week: it opens Sunday 22:00 UTC (Sydney) and closes Friday 22:00 UTC (New York). The hours that matter are the overlaps: London-New York (12:00-16:00 UTC) concentrates the deepest liquidity.' },
        { q: 'Why is forex traded with so much leverage?', a: 'Because daily moves are small — a major pair travels 0.5-0.8% a day. Without leverage those moves would be irrelevant. That is also why it is dangerous: the same leverage that makes forex usable is what destroys accounts.' },
        { q: 'What is a forex swap and when is it charged?', a: 'It is the net interest for holding a position overnight, derived from the rate differential between the two currencies. It is applied at the New York close (22:00 UTC). Wednesday is charged triple because it covers weekend settlement.' },
      ],
    },
    tv: { widget: 'forex-cross-rates' },
    calc: 'lotsize',
  },

  // ─────────────────────────────────────────────── STOCKS
  stocks: {
    es: {
      what: 'Una acción es una participación en la propiedad de una empresa. Cuando compras una acción de Apple eres, literalmente, socio de Apple en la proporción que te corresponde. El precio sube o baja según lo que el mercado cree que valdrán los beneficios futuros de esa empresa. Se negocian en bolsas reguladas con horario fijo.',
      measure: [
        { k: 'Capitalización (market cap)', v: 'Precio × número de acciones en circulación. Es lo que vale la empresa entera en bolsa. Mega cap >200.000 M$, large cap >10.000 M$, mid cap 2.000-10.000 M$, small cap 300-2.000 M$.' },
        { k: 'Free float', v: 'Las acciones realmente disponibles para negociar (excluye las de fundadores, Estado o bloqueadas). Un free float bajo = precio manipulable y muy volátil.' },
        { k: 'BPA (beneficio por acción)', v: 'Beneficio neto ÷ acciones. Es el motor real del precio a largo plazo.' },
        { k: 'PER', v: 'Precio ÷ BPA. Cuántos años de beneficios actuales estás pagando. Un PER de 25 significa 25 años — solo tiene sentido si esperas crecimiento.' },
        { k: 'Volumen', v: 'Acciones negociadas al día. Por debajo de ~500.000 acciones/día, la horquilla y el slippage empiezan a comerse tu ventaja.' },
        { k: 'Dividendo / rentabilidad', v: 'Pago por acción ÷ precio. Ojo con la fecha ex-dividendo: el precio cae por el importe del dividendo ese día.' },
      ],
      example: {
        title: 'Ejemplo resuelto: leer una acción en 30 segundos',
        rows: [
          ['Precio', '180 $'],
          ['Acciones en circulación', '15.000 M'],
          ['Capitalización', '180 × 15.000 M = 2,7 billones $'],
          ['BPA (12 meses)', '6,50 $'],
          ['PER', '180 ÷ 6,50 = 27,7'],
          ['Dividendo anual', '1,00 $ → rentabilidad 0,55%'],
        ],
        note: 'Un PER de 27,7 frente a la media histórica del S&P 500 (~16-18) dice que el mercado paga una prima por crecimiento. No es "caro" ni "barato" por sí solo: es una pregunta, no una respuesta.',
      },
      faq: [
        { q: '¿Cómo se calcula la capitalización bursátil de una empresa?', a: 'Multiplicando el precio de la acción por el número de acciones en circulación. Si una empresa cotiza a 50 $ y tiene 1.000 millones de acciones, su capitalización es de 50.000 millones de dólares. Es la forma correcta de comparar el tamaño de dos empresas: el precio por acción por sí solo no dice nada.' },
        { q: '¿Cuáles son las empresas más grandes del mundo por capitalización?', a: 'El grupo de cabeza lo ocupan de forma persistente las tecnológicas estadounidenses —Apple, Microsoft, NVIDIA, Alphabet, Amazon, Meta— junto con Saudi Aramco. El orden exacto cambia cada semana; la tabla en vivo de esta página muestra el ranking actualizado.' },
        { q: '¿Qué es un PER y qué se considera alto?', a: 'El PER (precio/beneficio) es el precio de la acción dividido entre el beneficio por acción. La media histórica del S&P 500 ronda 16-18. Por encima de 25 el mercado está pagando expectativas de crecimiento fuerte; por debajo de 10 suele haber un problema —o una oportunidad—. Solo es comparable entre empresas del mismo sector.' },
        { q: '¿Qué horario tiene la bolsa estadounidense?', a: 'De 9:30 a 16:00 hora de Nueva York (15:30-22:00 CET en horario de verano europeo). Hay pre-mercado desde las 4:00 y after-hours hasta las 20:00 ET, con mucha menos liquidez y horquillas más amplias.' },
        { q: '¿Qué es el free float y por qué importa?', a: 'Son las acciones realmente disponibles para negociar, excluyendo las bloqueadas en manos de fundadores, el Estado o insiders. Con un free float pequeño, unas pocas órdenes mueven el precio muchísimo: es la característica que comparten casi todos los valores fácilmente manipulables.' },
      ],
    },
    en: {
      what: 'A share is a unit of ownership in a company. When you buy one share of Apple you are, literally, a part-owner of Apple in that proportion. The price moves on what the market believes the company\'s future profits are worth. Shares trade on regulated exchanges with fixed hours.',
      measure: [
        { k: 'Market cap', v: 'Price × shares outstanding. What the whole company is worth on the market. Mega cap >$200B, large cap >$10B, mid cap $2-10B, small cap $300M-2B.' },
        { k: 'Free float', v: 'Shares actually available to trade (excludes founder, state and locked-up holdings). A small float means a manipulable, violently volatile price.' },
        { k: 'EPS', v: 'Net profit ÷ shares. The real engine of price over the long run.' },
        { k: 'P/E ratio', v: 'Price ÷ EPS. How many years of current earnings you are paying. A P/E of 25 means 25 years — only sensible if you expect growth.' },
        { k: 'Volume', v: 'Shares traded per day. Below ~500,000 shares/day, spread and slippage start eating your edge.' },
        { k: 'Dividend / yield', v: 'Payment per share ÷ price. Watch the ex-dividend date: the price drops by the dividend amount that day.' },
      ],
      example: {
        title: 'Worked example: reading a stock in 30 seconds',
        rows: [
          ['Price', '$180'],
          ['Shares outstanding', '15.0B'],
          ['Market cap', '180 × 15.0B = $2.7 trillion'],
          ['EPS (trailing 12m)', '$6.50'],
          ['P/E', '180 ÷ 6.50 = 27.7'],
          ['Annual dividend', '$1.00 → 0.55% yield'],
        ],
        note: 'A P/E of 27.7 against the S&P 500 historical average (~16-18) says the market is paying a premium for growth. That is neither "expensive" nor "cheap" on its own: it is a question, not an answer.',
      },
      faq: [
        { q: 'How is a company\'s market capitalization calculated?', a: 'Multiply the share price by the number of shares outstanding. A company trading at $50 with 1 billion shares has a $50 billion market cap. This is the correct way to compare the size of two companies — the share price alone tells you nothing.' },
        { q: 'What are the largest companies in the world by market cap?', a: 'The top of the table is persistently occupied by US technology companies — Apple, Microsoft, NVIDIA, Alphabet, Amazon, Meta — alongside Saudi Aramco. The exact order changes weekly; the live table on this page shows the current ranking.' },
        { q: 'What is a P/E ratio and what counts as high?', a: 'The price-to-earnings ratio is the share price divided by earnings per share. The S&P 500 historical average sits around 16-18. Above 25 the market is paying for strong expected growth; below 10 there is usually a problem — or an opportunity. It is only comparable between companies in the same sector.' },
        { q: 'What are US stock market hours?', a: '9:30 to 16:00 New York time. Pre-market runs from 4:00 and after-hours until 20:00 ET, both with far less liquidity and much wider spreads.' },
        { q: 'What is free float and why does it matter?', a: 'It is the shares actually available to trade, excluding those locked up with founders, the state or insiders. With a small float a handful of orders move the price enormously — the feature shared by nearly every easily manipulated stock.' },
      ],
    },
    tv: { widget: 'stock-screener' },
    calc: 'position',
  },

  // ─────────────────────────────────────────────── CRYPTO
  crypto: {
    es: {
      what: 'Las criptomonedas son activos digitales que se negocian 24 horas al día, 365 días al año, sin cierre ni horario. No hay cierre de sesión, no hay circuit breakers y no hay un regulador que pare la caída. Esa disponibilidad total es la razón de su volatilidad: no existe la pausa nocturna que amortigua el pánico en el resto de mercados.',
      measure: [
        { k: 'Capitalización (market cap)', v: 'Precio × oferta CIRCULANTE. Es el valor de mercado de lo que hoy existe y se puede vender.' },
        { k: 'Oferta circulante', v: 'Las monedas que ya están en el mercado. Es el número que se usa para la capitalización.' },
        { k: 'Oferta total / máxima', v: 'Las que existirán cuando se emitan todas. Bitcoin: 21 millones, fijos. Muchos tokens nuevos: una fracción pequeña circula y el resto está bloqueado esperando desbloqueo.' },
        { k: 'FDV (valoración totalmente diluida)', v: 'Precio × oferta TOTAL. Es lo que valdría el proyecto si todas las monedas estuvieran ya en circulación. Cuando FDV ≫ capitalización, hay una avalancha de oferta pendiente.' },
        { k: 'Volumen 24h', v: 'Cuánto se negocia al día. Si el volumen es una fracción minúscula de la capitalización, no puedes salir de una posición grande sin hundir el precio.' },
        { k: 'Holders', v: 'Número de direcciones que la poseen. Pocos holders = comunidad frágil y concentración en pocas manos (riesgo de que uno solo tire el precio).' },
        { k: 'Vesting / unlocks', v: 'Calendario de liberación de tokens bloqueados. Un desbloqueo grande es oferta nueva entrando en el mercado en una fecha conocida.' },
      ],
      example: {
        title: 'Ejemplo resuelto: la cuenta que casi nadie hace (dilución)',
        rows: [
          ['Precio actual', '20 $'],
          ['Oferta circulante', '200 M de unidades'],
          ['Oferta total', '1.000 M de unidades'],
          ['Capitalización', '20 × 200 M = 4.000 M $'],
          ['FDV', '20 × 1.000 M = 20.000 M $'],
          ['% circulando', '200 ÷ 1.000 = 20%'],
          ['Precio implícito tras dilución total', '4.000 M ÷ 1.000 M = 4 $ (−80%)'],
        ],
        note: 'Si el mercado sigue valorando el proyecto en 4.000 M$ cuando circulen las 1.000 M de unidades, el precio por unidad tiene que ser 4 $. Para que se mantenga en 20 $ hay que creer que la demanda se multiplicará por cinco. Ojo: esto NO predice que caerá a 4 $ — es el precio que resultaría a igualdad de capitalización, y los desbloqueos suelen estar parcialmente descontados. Es una pregunta que hay que hacerse ANTES de comprar, no después.',
      },
      faq: [
        { q: '¿Cuáles son las criptomonedas más grandes?', a: 'Por capitalización de mercado, Bitcoin (BTC) y Ethereum (ETH) ocupan de forma estable los dos primeros puestos, seguidos por stablecoins como Tether (USDT) y USD Coin (USDC), y por monedas de plataforma como BNB, Solana (SOL) y XRP. El orden a partir del tercer puesto cambia constantemente; la tabla en vivo de esta página muestra el ranking actual con precio, capitalización y volumen.' },
        { q: '¿Cómo se calcula la capitalización de una criptomoneda?', a: 'Precio actual × oferta circulante (las monedas que ya están en el mercado). No se usa la oferta total. Por eso dos monedas al mismo precio pueden tener capitalizaciones radicalmente distintas, y por eso el precio por unidad no dice nada sobre si una cripto es "cara".' },
        { q: '¿Qué es el FDV o valoración totalmente diluida?', a: 'Es el precio multiplicado por la oferta TOTAL, no por la circulante. Responde a: "¿cuánto valdría este proyecto si todas las monedas ya existieran?". Cuando el FDV es varias veces la capitalización actual, significa que queda mucha oferta por liberar y que los tenedores actuales se van a diluir.' },
        { q: '¿Qué criptomonedas conviene evitar?', a: 'Las que combinan varias señales de alarma: volumen diario muy bajo respecto a su capitalización (no podrás salir), pocos holders (comunidad frágil y concentración de riesgo), capitalización minúscula (manipulable con poco dinero) y emisión sin tope o con una fracción mínima circulando frente al total (dilución garantizada).' },
        { q: '¿Por qué el mercado cripto no cierra nunca?', a: 'Porque no hay una bolsa central que abra y cierre: son exchanges globales operando sobre redes que funcionan continuamente. La consecuencia práctica es que no existe la pausa nocturna que en las bolsas tradicionales permite digerir las noticias, así que un pánico se propaga sin frenos y las liquidaciones en cascada ocurren de madrugada.' },
        { q: '¿Cuántos bitcoins existirán como máximo?', a: '21 millones. El límite está escrito en el protocolo y la emisión se reduce a la mitad aproximadamente cada cuatro años (el "halving"). Es lo que hace que la oferta de Bitcoin sea previsible y contrasta con los tokens de emisión discrecional.' },
      ],
    },
    en: {
      what: 'Cryptocurrencies are digital assets traded 24 hours a day, 365 days a year, with no close. No session end, no circuit breakers, and no regulator to halt a fall. That total availability is exactly why they are so volatile: there is no overnight pause to absorb panic like every other market has.',
      measure: [
        { k: 'Market cap', v: 'Price × CIRCULATING supply. The market value of what exists and can be sold today.' },
        { k: 'Circulating supply', v: 'Coins already in the market. This is the figure used for market cap.' },
        { k: 'Total / max supply', v: 'What will exist once fully issued. Bitcoin: 21 million, fixed. Many new tokens: a small fraction circulates and the rest is locked, awaiting unlock.' },
        { k: 'FDV (fully diluted valuation)', v: 'Price × TOTAL supply. What the project would be worth if every coin were already circulating. When FDV ≫ market cap, a wave of supply is still pending.' },
        { k: '24h volume', v: 'How much trades per day. If volume is a tiny fraction of market cap, you cannot exit a large position without collapsing the price.' },
        { k: 'Holders', v: 'Number of addresses holding it. Few holders means a fragile community and concentration risk — one wallet can crater the price.' },
        { k: 'Vesting / unlocks', v: 'The release schedule for locked tokens. A large unlock is new supply hitting the market on a date everyone can read in advance.' },
      ],
      example: {
        title: 'Worked example: the calculation almost nobody does (dilution)',
        rows: [
          ['Current price', '$20'],
          ['Circulating supply', '200M units'],
          ['Total supply', '1,000M units'],
          ['Market cap', '20 × 200M = $4.0B'],
          ['FDV', '20 × 1,000M = $20.0B'],
          ['% circulating', '200 ÷ 1,000 = 20%'],
          ['Implied price after full dilution', '$4.0B ÷ 1,000M = $4 (−80%)'],
        ],
        note: 'If the market still values the project at $4.0B once all 1,000M units circulate, the price per unit has to be $4. For it to hold $20 you must believe demand will multiply fivefold. Careful: this does NOT predict a fall to $4 — it is the price implied at constant market cap, and unlocks are usually partly priced in. It is a question to ask BEFORE buying, not after.',
      },
      faq: [
        { q: 'What are the largest cryptocurrencies?', a: 'By market capitalization, Bitcoin (BTC) and Ethereum (ETH) hold the top two places consistently, followed by stablecoins such as Tether (USDT) and USD Coin (USDC), and platform coins like BNB, Solana (SOL) and XRP. Beyond third place the order changes constantly; the live table on this page shows the current ranking with price, market cap and volume.' },
        { q: 'How is a cryptocurrency\'s market cap calculated?', a: 'Current price × circulating supply (the coins already in the market). Total supply is not used. That is why two coins at the same price can have radically different market caps, and why the price per unit tells you nothing about whether a crypto is "expensive".' },
        { q: 'What is FDV or fully diluted valuation?', a: 'It is the price multiplied by TOTAL supply rather than circulating supply. It answers: "what would this project be worth if every coin already existed?". When FDV is several times the current market cap, a lot of supply is still to be released and current holders will be diluted.' },
        { q: 'Which cryptocurrencies should you avoid?', a: 'The ones combining several warning signs: very low daily volume relative to market cap (you will not be able to exit), few holders (fragile community and concentration risk), a tiny market cap (manipulable with little money), and uncapped issuance or a minimal fraction circulating against the total (guaranteed dilution).' },
        { q: 'Why does the crypto market never close?', a: 'Because there is no central exchange opening and closing: these are global exchanges running on networks that operate continuously. The practical consequence is that there is no overnight pause to digest news, so panic spreads unchecked and cascading liquidations happen at 3am.' },
        { q: 'How many bitcoins will ever exist?', a: '21 million. The cap is written into the protocol and issuance halves roughly every four years (the "halving"). That is what makes Bitcoin\'s supply predictable, in contrast with tokens issued at a team\'s discretion.' },
      ],
    },
    tv: { widget: 'crypto-screener' },
    calc: 'dilution',
  },

  // ─────────────────────────────────────────────── COMMODITIES
  commodities: {
    es: {
      what: 'Las materias primas son bienes físicos: petróleo, gas natural, oro, cobre, trigo, café. Se negocian casi siempre a través de FUTUROS, que vencen y hay que renovar. Cada contrato representa una cantidad física concreta, y esa cantidad es lo que determina cuánto ganas o pierdes por cada movimiento del precio.',
      measure: [
        { k: 'Petróleo WTI (CL)', v: '1 contrato = 1.000 barriles. Tick 0,01 $ = 10 $ por contrato. Un movimiento de 1 $ = 1.000 $.' },
        { k: 'Petróleo Brent (BZ)', v: '1 contrato = 1.000 barriles. Mismo tick de 0,01 $ = 10 $.' },
        { k: 'Gas natural (NG)', v: '1 contrato = 10.000 MMBtu. Tick 0,001 $ = 10 $. Es el futuro más volátil del complejo energético.' },
        { k: 'Oro (GC)', v: '1 contrato = 100 onzas troy. Tick 0,10 $ = 10 $. Un movimiento de 10 $ en el oro = 1.000 $ por contrato.' },
        { k: 'Plata (SI)', v: '1 contrato = 5.000 onzas troy. Tick 0,005 $ = 25 $. Mucho más "nerviosa" que el oro.' },
        { k: 'Cobre (HG)', v: '1 contrato = 25.000 libras. Tick 0,0005 $ = 12,50 $. El "doctor cobre": anticipa el ciclo económico.' },
        { k: 'Contango / backwardation', v: 'Si los vencimientos lejanos cotizan más caros (contango), renovar una posición larga cuesta dinero cada mes. En backwardation, te lo paga. Es la razón por la que un ETF de materias primas puede perder aunque el precio al contado suba.' },
      ],
      example: {
        title: 'Ejemplo resuelto: por qué el tamaño del contrato lo es todo',
        rows: [
          ['Contrato', 'Gas natural (NG)'],
          ['Tamaño', '10.000 MMBtu'],
          ['Precio', '3,00 $/MMBtu'],
          ['Nocional', '3,00 × 10.000 = 30.000 $'],
          ['Margen inicial aproximado', '~2.500 $'],
          ['Apalancamiento efectivo', '30.000 ÷ 2.500 = 12×'],
          ['Un movimiento del 10% (0,30 $)', '0,30 × 10.000 = 3.000 $ = 120% de tu margen'],
        ],
        note: 'Un movimiento del 10% en el gas natural —que ocurre en un día malo de invierno— se lleva más que todo el margen depositado. Por eso las materias primas exigen posiciones más pequeñas de lo que la intuición sugiere.',
      },
      faq: [
        { q: '¿Cuánto es un contrato de petróleo?', a: 'Un contrato estándar de WTI (símbolo CL) equivale a 1.000 barriles. Con el petróleo a 75 $, el nocional es de 75.000 $. El tick mínimo es de 0,01 $ por barril, es decir 10 $ por contrato. Existe también el mini (QM, 500 barriles) y el micro (MCL, 100 barriles) para cuentas pequeñas.' },
        { q: '¿Cuánto vale un contrato de oro?', a: 'El contrato estándar (GC) son 100 onzas troy. Con el oro a 2.400 $/oz, el nocional son 240.000 $. Cada movimiento de 1 $ en la onza equivale a 100 $ por contrato. El micro (MGC) son 10 onzas.' },
        { q: '¿Qué mueve el precio del gas natural?', a: 'Principalmente el clima —la demanda de calefacción en invierno y de refrigeración en verano—, los niveles de almacenamiento (el informe semanal de la EIA), la producción y, en Europa, la geopolítica del suministro. Es el futuro más volátil del complejo energético: movimientos diarios de 5-10% son normales.' },
        { q: '¿Qué es el contango y por qué me perjudica?', a: 'Contango es cuando los contratos de vencimiento lejano cotizan más caros que los cercanos. Si mantienes una posición larga tienes que renovar cada mes vendiendo el barato y comprando el caro: pierdes dinero en cada renovación aunque el precio al contado no se mueva. Es la razón por la que muchos ETF de materias primas rinden peor que la materia prima que replican.' },
        { q: '¿Se puede operar materias primas sin futuros?', a: 'Sí: mediante ETFs y ETCs (que sufren el efecto del roll), acciones de mineras y petroleras (que añaden riesgo empresarial), o CFDs (con coste de financiación diario). Cada vía cambia el riesgo: ninguna te da exposición pura al precio al contado sin coste.' },
      ],
    },
    en: {
      what: 'Commodities are physical goods: crude oil, natural gas, gold, copper, wheat, coffee. They trade almost entirely through FUTURES, which expire and must be rolled. Each contract represents a specific physical quantity, and that quantity is what determines how much you make or lose per unit of price movement.',
      measure: [
        { k: 'WTI crude (CL)', v: '1 contract = 1,000 barrels. Tick $0.01 = $10 per contract. A $1 move = $1,000.' },
        { k: 'Brent crude (BZ)', v: '1 contract = 1,000 barrels. Same $0.01 tick = $10.' },
        { k: 'Natural gas (NG)', v: '1 contract = 10,000 MMBtu. Tick $0.001 = $10. The most volatile future in the energy complex.' },
        { k: 'Gold (GC)', v: '1 contract = 100 troy ounces. Tick $0.10 = $10. A $10 move in gold = $1,000 per contract.' },
        { k: 'Silver (SI)', v: '1 contract = 5,000 troy ounces. Tick $0.005 = $25. Far twitchier than gold.' },
        { k: 'Copper (HG)', v: '1 contract = 25,000 pounds. Tick $0.0005 = $12.50. "Dr Copper": it front-runs the economic cycle.' },
        { k: 'Contango / backwardation', v: 'If far-dated contracts trade higher (contango), rolling a long position costs money every month. In backwardation it pays you. This is why a commodity ETF can lose while spot rises.' },
      ],
      example: {
        title: 'Worked example: why contract size is everything',
        rows: [
          ['Contract', 'Natural gas (NG)'],
          ['Size', '10,000 MMBtu'],
          ['Price', '$3.00/MMBtu'],
          ['Notional', '3.00 × 10,000 = $30,000'],
          ['Approx. initial margin', '~$2,500'],
          ['Effective leverage', '30,000 ÷ 2,500 = 12×'],
          ['A 10% move ($0.30)', '0.30 × 10,000 = $3,000 = 120% of your margin'],
        ],
        note: 'A 10% move in natural gas — which happens on a bad winter day — takes more than the entire margin you posted. That is why commodities demand smaller positions than intuition suggests.',
      },
      faq: [
        { q: 'How big is one oil contract?', a: 'A standard WTI contract (symbol CL) is 1,000 barrels. With oil at $75, notional is $75,000. The minimum tick is $0.01 per barrel, i.e. $10 per contract. A mini (QM, 500 barrels) and a micro (MCL, 100 barrels) exist for smaller accounts.' },
        { q: 'How much is one gold contract worth?', a: 'The standard contract (GC) is 100 troy ounces. With gold at $2,400/oz, notional is $240,000. Every $1 move in the ounce is $100 per contract. The micro (MGC) is 10 ounces.' },
        { q: 'What drives the natural gas price?', a: 'Mainly weather — heating demand in winter, cooling demand in summer — plus storage levels (the weekly EIA report), production, and in Europe the geopolitics of supply. It is the most volatile future in the energy complex: 5-10% daily moves are routine.' },
        { q: 'What is contango and why does it hurt me?', a: 'Contango is when far-dated contracts trade above near-dated ones. Holding a long position means rolling every month: selling the cheap one and buying the expensive one, losing money on each roll even if spot never moves. It is why many commodity ETFs underperform the commodity they track.' },
        { q: 'Can you trade commodities without futures?', a: 'Yes: through ETFs and ETCs (which suffer the roll effect), miner and oil-producer shares (which add company risk), or CFDs (with a daily financing cost). Each route changes the risk — none gives you pure spot exposure for free.' },
      ],
    },
    tv: { widget: 'market-overview-commodities' },
    calc: 'futures',
  },

  // ─────────────────────────────────────────────── INDICES
  indices: {
    es: {
      what: 'Un índice mide el comportamiento conjunto de una cesta de acciones. El S&P 500 son las 500 mayores empresas de EE. UU.; el IBEX 35, las 35 más líquidas de España. No puedes comprar un índice directamente: se opera mediante futuros, ETFs, opciones o CFDs sobre él.',
      measure: [
        { k: 'Ponderación por capitalización', v: 'La mayoría (S&P 500, Nasdaq 100, IBEX 35): pesa más la empresa más grande. Consecuencia real: hoy las 7 mayores tecnológicas pesan más de un tercio del S&P 500, así que el "mercado" es en buena parte esas 7.' },
        { k: 'Ponderación por precio', v: 'Dow Jones y Nikkei 225: pesa más la acción con precio más alto, sin importar el tamaño de la empresa. Es un método arcaico que aún se usa por tradición.' },
        { k: 'Divisor', v: 'Número que ajusta el índice ante splits, ampliaciones y cambios de composición para que la serie histórica siga siendo comparable.' },
        { k: 'Valor del punto', v: 'Lo que gana o pierde tu contrato por cada punto de índice. E-mini S&P 500 (ES): 50 $/punto. Micro E-mini (MES): 5 $/punto. Nasdaq E-mini (NQ): 20 $/punto; micro (MNQ): 2 $/punto.' },
        { k: 'Precio de rentabilidad vs total', v: 'Casi todos los índices que ves (S&P 500, IBEX) son de precio: NO incluyen dividendos. El DAX alemán sí los incluye, lo que hace que su gráfico parezca mucho mejor a largo plazo. Comparar uno con otro sin saberlo es un error clásico.' },
      ],
      example: {
        title: 'Ejemplo resuelto: cuánto arriesgas con un contrato de índice',
        rows: [
          ['Contrato', 'Micro E-mini S&P 500 (MES)'],
          ['Índice', '5.400 puntos'],
          ['Valor del punto', '5 $'],
          ['Nocional', '5.400 × 5 = 27.000 $'],
          ['Margen intradía típico', '~1.200 $'],
          ['Apalancamiento', '27.000 ÷ 1.200 = 22×'],
          ['Stop de 20 puntos', '20 × 5 = 100 $ de riesgo'],
        ],
        note: 'El micro contrato existe precisamente para que un stop razonable sea un riesgo razonable. Con el E-mini normal (ES, 50 $/punto) ese mismo stop de 20 puntos serían 1.000 $.',
      },
      faq: [
        { q: '¿Qué es el S&P 500 y cómo se calcula?', a: 'Es un índice de las 500 mayores empresas cotizadas de Estados Unidos, ponderado por capitalización ajustada al free float: cuanto más vale una empresa en bolsa, más pesa en el índice. Lo mantiene S&P Dow Jones Indices, que revisa su composición trimestralmente. Representa alrededor del 80% de la capitalización bursátil estadounidense.' },
        { q: '¿Cuáles son los principales índices bursátiles del mundo?', a: 'S&P 500, Nasdaq 100 y Dow Jones en Estados Unidos; DAX (Alemania), CAC 40 (Francia), FTSE 100 (Reino Unido), IBEX 35 (España) y Euro Stoxx 50 en Europa; Nikkei 225 y Hang Seng en Asia. Los tres primeros marcan el tono del resto: cuando cae el S&P 500, casi todo cae con él.' },
        { q: '¿Se puede comprar un índice directamente?', a: 'No. Un índice es un número calculado, no un activo. Se obtiene exposición mediante ETFs que lo replican (SPY, VOO para el S&P 500), futuros (ES, MES), opciones sobre el índice, o CFDs. Cada instrumento tiene costes y riesgos distintos.' },
        { q: '¿Por qué el DAX sube más que el IBEX a largo plazo?', a: 'En parte porque el DAX es un índice de rentabilidad total: reinvierte los dividendos dentro del propio índice. El IBEX 35 que se publica es de precio y no los incluye (existe una versión "con dividendos" que se difunde mucho menos). Comparar un índice de rentabilidad total con uno de precio exagera enormemente la diferencia real.' },
        { q: '¿Cuánto vale un punto del S&P 500 en futuros?', a: 'En el E-mini (ES), 50 $ por punto. En el Micro E-mini (MES), 5 $ por punto. Con el índice en 5.400, un contrato ES controla 270.000 $ de nocional y un MES, 27.000 $.' },
      ],
    },
    en: {
      what: 'An index measures the combined behaviour of a basket of shares. The S&P 500 is the 500 largest US companies; the IBEX 35, Spain\'s 35 most liquid. You cannot buy an index directly: you trade it through futures, ETFs, options or CFDs.',
      measure: [
        { k: 'Cap weighting', v: 'Most indices (S&P 500, Nasdaq 100, IBEX 35): the biggest company weighs most. Real consequence: the seven largest tech names are now more than a third of the S&P 500, so "the market" is largely those seven.' },
        { k: 'Price weighting', v: 'Dow Jones and Nikkei 225: the highest-priced share weighs most, regardless of company size. An archaic method still used out of tradition.' },
        { k: 'Divisor', v: 'A number that adjusts the index for splits, issuance and constituent changes so the historical series stays comparable.' },
        { k: 'Point value', v: 'What your contract makes or loses per index point. E-mini S&P 500 (ES): $50/point. Micro E-mini (MES): $5/point. Nasdaq E-mini (NQ): $20/point; micro (MNQ): $2/point.' },
        { k: 'Price vs total return', v: 'Nearly every index you see (S&P 500, IBEX) is price return: it does NOT include dividends. Germany\'s DAX does, which makes its long-run chart look far better. Comparing one with the other unknowingly is a classic error.' },
      ],
      example: {
        title: 'Worked example: what one index contract risks',
        rows: [
          ['Contract', 'Micro E-mini S&P 500 (MES)'],
          ['Index', '5,400 points'],
          ['Point value', '$5'],
          ['Notional', '5,400 × 5 = $27,000'],
          ['Typical intraday margin', '~$1,200'],
          ['Leverage', '27,000 ÷ 1,200 = 22×'],
          ['A 20-point stop', '20 × 5 = $100 at risk'],
        ],
        note: 'The micro contract exists precisely so that a reasonable stop is a reasonable risk. On the full E-mini (ES, $50/point) that same 20-point stop is $1,000.',
      },
      faq: [
        { q: 'What is the S&P 500 and how is it calculated?', a: 'It is an index of the 500 largest listed US companies, weighted by float-adjusted market capitalization: the more a company is worth on the market, the more it weighs. S&P Dow Jones Indices maintains it and reviews constituents quarterly. It represents about 80% of US market capitalization.' },
        { q: 'What are the major stock market indices in the world?', a: 'S&P 500, Nasdaq 100 and Dow Jones in the United States; DAX (Germany), CAC 40 (France), FTSE 100 (UK), IBEX 35 (Spain) and Euro Stoxx 50 in Europe; Nikkei 225 and Hang Seng in Asia. The first three set the tone for the rest: when the S&P 500 falls, almost everything falls with it.' },
        { q: 'Can you buy an index directly?', a: 'No. An index is a calculated number, not an asset. You get exposure through ETFs that track it (SPY, VOO for the S&P 500), futures (ES, MES), index options, or CFDs. Each instrument carries different costs and risks.' },
        { q: 'Why does the DAX outperform the IBEX over the long run?', a: 'Partly because the DAX is a total return index: it reinvests dividends inside the index itself. The published IBEX 35 is price return and excludes them (a "with dividends" version exists but is barely quoted). Comparing a total return index with a price return one wildly exaggerates the real difference.' },
        { q: 'How much is one S&P 500 point worth in futures?', a: 'On the E-mini (ES), $50 per point. On the Micro E-mini (MES), $5 per point. With the index at 5,400, one ES contract controls $270,000 of notional and one MES, $27,000.' },
      ],
    },
    tv: { widget: 'market-overview-indices' },
    calc: 'futures',
  },

  // ─────────────────────────────────────────────── ETFs
  etfs: {
    es: {
      what: 'Un ETF es un fondo que cotiza en bolsa como si fuera una acción. Compras una participación y con ella tienes, de golpe, una cesta entera: todo el S&P 500, todo el oro, toda la deuda europea. Es la forma más barata y sencilla de diversificar, y por eso es el vehículo dominante de la inversión moderna.',
      measure: [
        { k: 'NAV (valor liquidativo)', v: 'El valor real de los activos que contiene, por participación. Es el precio "justo" del ETF en cada momento.' },
        { k: 'Prima / descuento', v: 'Diferencia entre el precio de mercado y el NAV. En ETFs líquidos es casi cero; en ETFs de mercados exóticos o en momentos de pánico puede dispararse — y ahí es donde el inversor pierde dinero sin darse cuenta.' },
        { k: 'TER (coste total)', v: 'Comisión anual, descontada a diario del NAV. 0,07% en un ETF del S&P 500; 0,50-0,90% en temáticos. Sobre 20 años, la diferencia entre 0,07% y 0,70% se come cerca del 12% de tu capital final.' },
        { k: 'Tracking error', v: 'Cuánto se desvía el ETF de su índice. Cuanto menor, mejor lo replica.' },
        { k: 'Réplica física vs sintética', v: 'Física: compra los activos de verdad. Sintética: usa un swap con un banco, lo que añade riesgo de contraparte a cambio de replicar mejor mercados difíciles.' },
        { k: 'Acumulación vs distribución', v: 'Acumulación reinvierte los dividendos dentro del fondo (mejor fiscalmente en España, difiere el impuesto). Distribución te los paga y tributas cada año.' },
      ],
      example: {
        title: 'Ejemplo resuelto: lo que cuesta de verdad un 0,63% extra',
        rows: [
          ['Inversión inicial', '10.000 €'],
          ['Rentabilidad bruta anual', '7%'],
          ['Plazo', '20 años'],
          ['ETF barato (TER 0,07%)', '10.000 × 1,0693²⁰ = 38.061 €'],
          ['ETF caro (TER 0,70%)', '10.000 × 1,063²⁰ = 33.895 €'],
          ['Diferencia', '4.166 € — el 11% de tu resultado, solo en comisiones'],
        ],
        note: 'Es el único coste de la inversión que puedes controlar con total certeza antes de invertir. Todo lo demás es una hipótesis; el TER es un hecho.',
      },
      faq: [
        { q: '¿Qué es un ETF y en qué se diferencia de un fondo?', a: 'Un ETF (fondo cotizado) es un fondo que se compra y vende en bolsa a lo largo del día, como una acción, con precio en tiempo real. Un fondo de inversión tradicional se suscribe y reembolsa una vez al día al valor liquidativo de cierre. Los ETF suelen ser más baratos y transparentes; los fondos, en España, permiten traspasos sin tributar.' },
        { q: '¿Cuáles son los ETFs más grandes del mundo?', a: 'Los que replican el S&P 500 dominan por tamaño: SPY (el primero de la historia, 1993), IVV y VOO, cada uno con cientos de miles de millones de dólares. Les siguen los de mercado total estadounidense (VTI), los de renta variable mundial (VT, IWDA en Europa) y los de oro físico (GLD, IAU).' },
        { q: '¿Qué es el TER de un ETF?', a: 'El coste total anual, expresado en porcentaje del patrimonio y descontado diariamente del valor liquidativo (no te llega ninguna factura). Un ETF de índice grande cuesta entre 0,03% y 0,20%; uno temático o de gestión activa, entre 0,40% y 0,90%. La diferencia compuesta durante décadas es enorme.' },
        { q: '¿Acumulación o distribución: cuál conviene?', a: 'Depende de tu fiscalidad y tu objetivo. Si estás acumulando patrimonio y tributas en España, la clase de acumulación difiere el impuesto sobre los dividendos y compone mejor. Si necesitas rentas periódicas, la de distribución te las paga directamente sin tener que vender participaciones.' },
        { q: '¿Un ETF puede quebrar y perder mi dinero?', a: 'Los activos del ETF están segregados del patrimonio de la gestora, así que si la gestora quiebra, tus activos no se pierden: se liquidan o se traspasan. El riesgo real es otro: que el índice caiga (riesgo de mercado), y en los ETF sintéticos, que falle la contraparte del swap. Los ETF apalancados o inversos añaden además el problema del reajuste diario, que los hace inadecuados para mantener a largo plazo.' },
      ],
    },
    en: {
      what: 'An ETF is a fund that trades on an exchange like a share. You buy one unit and instantly own an entire basket: the whole S&P 500, all of gold, all of European debt. It is the cheapest and simplest way to diversify, which is why it dominates modern investing.',
      measure: [
        { k: 'NAV', v: 'The real value of the assets it holds, per unit. The "fair" price of the ETF at any moment.' },
        { k: 'Premium / discount', v: 'Gap between market price and NAV. Near zero in liquid ETFs; it can blow out in exotic markets or during panics — and that is where investors lose money without noticing.' },
        { k: 'TER (total cost)', v: 'Annual fee, deducted daily from NAV. 0.07% on an S&P 500 ETF; 0.50-0.90% on thematics. Over 20 years the gap between 0.07% and 0.70% eats around 12% of your final capital.' },
        { k: 'Tracking error', v: 'How far the ETF drifts from its index. Lower is better replication.' },
        { k: 'Physical vs synthetic', v: 'Physical: it actually buys the assets. Synthetic: it uses a swap with a bank, adding counterparty risk in exchange for better tracking of difficult markets.' },
        { k: 'Accumulating vs distributing', v: 'Accumulating reinvests dividends inside the fund (tax-deferring in many jurisdictions). Distributing pays them out and you are taxed each year.' },
      ],
      example: {
        title: 'Worked example: what an extra 0.63% really costs',
        rows: [
          ['Initial investment', '€10,000'],
          ['Gross annual return', '7%'],
          ['Horizon', '20 years'],
          ['Cheap ETF (TER 0.07%)', '10,000 × 1.0693²⁰ = €38,061'],
          ['Expensive ETF (TER 0.70%)', '10,000 × 1.063²⁰ = €33,895'],
          ['Difference', '€4,166 — 11% of your result, in fees alone'],
        ],
        note: 'It is the only cost of investing you can know with total certainty before you invest. Everything else is a hypothesis; the TER is a fact.',
      },
      faq: [
        { q: 'What is an ETF and how does it differ from a mutual fund?', a: 'An ETF (exchange-traded fund) is bought and sold on an exchange throughout the day, like a share, at a live price. A traditional mutual fund is subscribed and redeemed once a day at the closing NAV. ETFs are usually cheaper and more transparent; funds, in some jurisdictions, allow tax-free switching.' },
        { q: 'What are the largest ETFs in the world?', a: 'S&P 500 trackers dominate by size: SPY (the first ever, 1993), IVV and VOO, each with hundreds of billions of dollars. Behind them come total US market funds (VTI), global equity funds (VT, IWDA in Europe) and physical gold funds (GLD, IAU).' },
        { q: 'What is an ETF\'s TER?', a: 'The total annual cost, expressed as a percentage of assets and deducted daily from the NAV (no invoice ever reaches you). A large index ETF costs 0.03% to 0.20%; a thematic or actively managed one, 0.40% to 0.90%. Compounded over decades the difference is enormous.' },
        { q: 'Accumulating or distributing: which is better?', a: 'It depends on your tax situation and your goal. If you are building capital, the accumulating class defers dividend tax and compounds better. If you need regular income, the distributing class pays it directly without selling units.' },
        { q: 'Can an ETF go bust and lose my money?', a: 'The ETF\'s assets are segregated from the manager\'s balance sheet, so if the manager fails your assets are not lost: they are liquidated or transferred. The real risks are different: the index falling (market risk) and, in synthetic ETFs, the swap counterparty failing. Leveraged and inverse ETFs add daily rebalancing decay, which makes them unsuitable to hold long term.' },
      ],
    },
    tv: { widget: 'stock-screener-etf' },
    calc: 'compound',
  },

  // ─────────────────────────────────────────────── FUTURES
  futures: {
    es: {
      what: 'Un futuro es un contrato para comprar o vender una cantidad concreta de un activo, a un precio fijado hoy, con entrega en una fecha futura. Se negocian en mercados organizados con cámara de compensación, lo que elimina el riesgo de contraparte. Llevan apalancamiento incorporado por diseño: depositas un margen, no el valor total.',
      measure: [
        { k: 'Nocional', v: 'Precio × tamaño del contrato. Es tu exposición real al mercado.' },
        { k: 'Margen inicial', v: 'Lo que tienes que depositar para abrir. Suele ser el 3-12% del nocional. Lo fija la cámara y sube cuando sube la volatilidad.' },
        { k: 'Margen de mantenimiento', v: 'El mínimo que debe quedar en la cuenta. Si bajas de ahí, llega el margin call y, si no repones, la liquidación forzosa.' },
        { k: 'Tick y valor del tick', v: 'La variación mínima de precio y lo que vale en dinero. Es el "pip" de los futuros.' },
        { k: 'Vencimiento y rollover', v: 'Cada contrato expira. Para mantener la exposición hay que cerrar el que vence y abrir el siguiente. Ese cambio tiene un coste (§ contango/backwardation).' },
        { k: 'Liquidación', v: 'Financiera (índices: se paga la diferencia en efectivo) o física (materias primas: entrega real). Si no cierras un contrato de entrega física a tiempo, te pueden entregar 1.000 barriles de petróleo. Ha pasado.' },
        { k: 'Interés abierto', v: 'Contratos vivos. Cuando el interés abierto migra del contrato cercano al siguiente, es la señal de que toca rolar.' },
      ],
      example: {
        title: 'Ejemplo resuelto: el apalancamiento incorporado',
        rows: [
          ['Contrato', 'E-mini S&P 500 (ES)'],
          ['Índice', '5.400 puntos'],
          ['Valor del punto', '50 $'],
          ['Nocional', '5.400 × 50 = 270.000 $'],
          ['Margen inicial', '~13.000 $'],
          ['Apalancamiento', '270.000 ÷ 13.000 = 20,8×'],
          ['Caída del 5% del índice', '270 puntos × 50 = 13.500 $ perdidos'],
        ],
        note: 'Una caída del 5% —que en el S&P 500 ocurre varias veces al año— borra el margen entero. Con futuros, el tamaño de la posición no lo decide lo que puedes depositar: lo decide lo que puedes perder.',
      },
      faq: [
        { q: '¿Qué es un contrato de futuros?', a: 'Un acuerdo estandarizado y negociado en mercado organizado para comprar o vender una cantidad fija de un activo en una fecha futura a un precio pactado hoy. La cámara de compensación se interpone entre comprador y vendedor, de modo que ninguno depende del crédito del otro. Es el derivado más antiguo y más regulado.' },
        { q: '¿Cuánto dinero hace falta para operar futuros?', a: 'Depende del contrato. Un Micro E-mini S&P 500 (MES) exige un margen intradía de unos 1.200-1.500 $; un E-mini (ES), unos 13.000 $. Pero el margen mínimo NO es el capital recomendable: para operar un MES con un riesgo sano hacen falta varios miles de euros, porque el margen no te protege de la pérdida, solo permite abrir.' },
        { q: '¿Qué es el rollover en futuros y cuándo se hace?', a: 'Es cerrar el contrato que va a vencer y abrir el mismo sesgo en el siguiente vencimiento, para mantener la exposición sin llegar al vencimiento ni a la entrega. Se suele hacer cuando el volumen y el interés abierto empiezan a migrar al contrato siguiente, unos días antes del vencimiento, para evitar horquillas anchas y mala liquidez de última hora.' },
        { q: '¿Cuál es la diferencia entre futuros y CFDs?', a: 'Los futuros se negocian en mercados regulados con precios centralizados, cámara de compensación y vencimiento; los CFDs son contratos privados con tu bróker, sin vencimiento, con precio fijado por él y coste de financiación diario. Los futuros son más transparentes y baratos si operas volumen; los CFDs son más accesibles para cuentas pequeñas y, a cambio, más caros y opacos.' },
        { q: '¿Me pueden entregar el activo físico?', a: 'Solo en los contratos de liquidación física (petróleo, granos, metales) y solo si mantienes la posición más allá del último día de negociación. Los brókers retail cierran esas posiciones automáticamente antes, pero conviene conocer las fechas: es responsabilidad tuya, no suya.' },
      ],
    },
    en: {
      what: 'A future is a contract to buy or sell a specific quantity of an asset, at a price fixed today, for delivery on a future date. They trade on organised markets with a clearing house, which removes counterparty risk. They carry leverage by design: you post margin, not the full value.',
      measure: [
        { k: 'Notional', v: 'Price × contract size. Your real market exposure.' },
        { k: 'Initial margin', v: 'What you must post to open. Typically 3-12% of notional. Set by the clearing house and raised when volatility rises.' },
        { k: 'Maintenance margin', v: 'The minimum that must remain in the account. Fall below it and you get a margin call, then forced liquidation if you do not top up.' },
        { k: 'Tick and tick value', v: 'The minimum price increment and what it is worth in money. The futures equivalent of a pip.' },
        { k: 'Expiry and rollover', v: 'Every contract expires. Holding exposure means closing the expiring one and opening the next. That switch has a cost (§ contango/backwardation).' },
        { k: 'Settlement', v: 'Cash (indices: the difference is paid) or physical (commodities: real delivery). Fail to close a physically-settled contract in time and you can be delivered 1,000 barrels of oil. It has happened.' },
        { k: 'Open interest', v: 'Live contracts. When open interest migrates from the front contract to the next, that is the signal to roll.' },
      ],
      example: {
        title: 'Worked example: the built-in leverage',
        rows: [
          ['Contract', 'E-mini S&P 500 (ES)'],
          ['Index', '5,400 points'],
          ['Point value', '$50'],
          ['Notional', '5,400 × 50 = $270,000'],
          ['Initial margin', '~$13,000'],
          ['Leverage', '270,000 ÷ 13,000 = 20.8×'],
          ['A 5% index drop', '270 points × 50 = $13,500 lost'],
        ],
        note: 'A 5% fall — which the S&P 500 delivers several times a year — wipes out the entire margin. With futures, position size is not decided by what you can post: it is decided by what you can lose.',
      },
      faq: [
        { q: 'What is a futures contract?', a: 'A standardised, exchange-traded agreement to buy or sell a fixed quantity of an asset on a future date at a price agreed today. A clearing house stands between buyer and seller so neither depends on the other\'s credit. It is the oldest and most regulated derivative.' },
        { q: 'How much money do you need to trade futures?', a: 'It depends on the contract. A Micro E-mini S&P 500 (MES) requires roughly $1,200-1,500 of intraday margin; an E-mini (ES), about $13,000. But minimum margin is NOT the sensible capital: trading one MES with healthy risk needs several thousand, because margin does not protect you from loss — it only lets you open.' },
        { q: 'What is a futures rollover and when do you do it?', a: 'Closing the expiring contract and reopening the same direction in the next expiry, to keep exposure without reaching expiry or delivery. It is normally done when volume and open interest start migrating to the next contract, a few days before expiry, to avoid the wide spreads and poor liquidity of the last moment.' },
        { q: 'What is the difference between futures and CFDs?', a: 'Futures trade on regulated markets with centralised pricing, a clearing house and an expiry; CFDs are private contracts with your broker, with no expiry, a price your broker sets and a daily financing cost. Futures are more transparent and cheaper at volume; CFDs are more accessible for small accounts and, in exchange, more expensive and more opaque.' },
        { q: 'Can I actually be delivered the physical asset?', a: 'Only on physically-settled contracts (oil, grains, metals) and only if you hold past the last trading day. Retail brokers auto-close those positions beforehand, but you should know the dates: it is your responsibility, not theirs.' },
      ],
    },
    tv: { widget: 'market-overview-futures' },
    calc: 'futures',
  },

  // ─────────────────────────────────────────────── BONDS
  bonds: {
    es: {
      what: 'Un bono es un préstamo: le prestas dinero a un Estado o a una empresa y te devuelve intereses periódicos (el cupón) más el principal al vencimiento. Es el mercado más grande del mundo por volumen emitido, y el que manda: los tipos de interés de los bonos son el precio del dinero, y de ahí se deriva la valoración de todo lo demás.',
      measure: [
        { k: 'Cupón', v: 'El interés anual que paga el bono sobre su nominal. Es fijo desde la emisión y no cambia nunca.' },
        { k: 'TIR / rentabilidad (yield)', v: 'La rentabilidad real si lo compras HOY al precio de mercado y lo mantienes a vencimiento. Es lo que se cotiza y lo que sale en las noticias.' },
        { k: 'Relación precio↔tipo', v: 'INVERSA y no negociable: si los tipos suben, el precio del bono baja. Es la regla que sorprende a todo el mundo la primera vez.' },
        { k: 'Duración', v: 'Sensibilidad del precio a los tipos. Duración 7 significa que un alza de 1% en los tipos hace caer el precio ~7%. Es la medida de riesgo clave en renta fija.' },
        { k: 'Punto básico (pb)', v: 'Una centésima de punto porcentual (0,01%). Los movimientos de bonos se cuentan en pb: "el bono a 10 años sube 8 pb".' },
        { k: 'Diferencial (spread)', v: 'La prima sobre el bono libre de riesgo. La "prima de riesgo" española es el diferencial entre el bono español y el alemán a 10 años.' },
        { k: 'Curva de tipos', v: 'La rentabilidad a cada plazo. Cuando se invierte (el corto plazo paga más que el largo), históricamente ha anticipado recesiones.' },
      ],
      example: {
        title: 'Ejemplo resuelto: cuánto pierdes si suben los tipos',
        rows: [
          ['Bono', 'Estado a 10 años, cupón 3%'],
          ['Nominal', '1.000 €'],
          ['Precio de compra', '100% = 1.000 €'],
          ['Duración modificada', '8,2'],
          ['Los tipos suben 100 pb (1%)', '−8,2% de precio'],
          ['Nuevo precio aproximado', '918 €'],
          ['Pérdida latente', '−82 € (aunque cobres el cupón)'],
        ],
        note: 'Esto es exactamente lo que ocurrió en 2022: la peor caída de la renta fija en décadas, en el activo que todo el mundo consideraba "seguro". Seguro significa que te devuelven el dinero al vencimiento — no que el precio no pueda desplomarse antes.',
      },
      faq: [
        { q: '¿Por qué el precio de un bono baja cuando suben los tipos de interés?', a: 'Porque tu bono paga un cupón fijo. Si compraste un bono que paga el 3% y mañana el Estado emite bonos nuevos al 4%, nadie querrá el tuyo al mismo precio: para que dé la misma rentabilidad, su precio tiene que bajar hasta que su rentabilidad iguale al 4%. Es aritmética, no sentimiento de mercado.' },
        { q: '¿Qué es la duración de un bono?', a: 'La medida de cuánto se mueve su precio ante un cambio en los tipos. Una duración modificada de 8 significa que una subida de un punto porcentual en los tipos hace caer el precio alrededor de un 8%. Cuanto más largo el vencimiento y más bajo el cupón, mayor la duración y mayor el riesgo.' },
        { q: '¿Qué es la prima de riesgo?', a: 'El diferencial entre la rentabilidad del bono a 10 años de un país y la del bono alemán al mismo plazo, medido en puntos básicos. Refleja cuánto interés extra exige el mercado por prestar a ese país en lugar de a Alemania, que se toma como referencia sin riesgo de la eurozona.' },
        { q: '¿Qué significa que la curva de tipos se invierta?', a: 'Que los bonos a corto plazo pagan más que los de largo plazo, lo contrario de lo normal. Señala que el mercado espera que los tipos bajen en el futuro, generalmente porque anticipa una desaceleración. Históricamente, la inversión de la curva 2-10 años en EE. UU. ha precedido a todas las recesiones desde 1955, con un retraso de entre 6 y 24 meses.' },
        { q: '¿Cómo puede un particular comprar bonos?', a: 'Directamente en las subastas del Tesoro de su país o a través del bróker en el mercado secundario, aunque con importes mínimos que a veces son elevados. La vía más accesible son los ETFs de renta fija, que dan exposición diversificada con cualquier importe — a cambio de no tener una fecha de vencimiento fija.' },
      ],
    },
    en: {
      what: 'A bond is a loan: you lend money to a government or a company and receive periodic interest (the coupon) plus the principal at maturity. It is the largest market in the world by amount issued, and the one that rules: bond yields are the price of money, and everything else is valued off them.',
      measure: [
        { k: 'Coupon', v: 'The annual interest the bond pays on its face value. Fixed at issue and never changes.' },
        { k: 'Yield (YTM)', v: 'The real return if you buy TODAY at market price and hold to maturity. This is what is quoted and what appears in the news.' },
        { k: 'Price↔rate relationship', v: 'INVERSE and non-negotiable: when rates rise, bond prices fall. The rule that surprises everyone the first time.' },
        { k: 'Duration', v: 'Price sensitivity to rates. A duration of 7 means a 1% rate rise cuts the price by roughly 7%. The key risk measure in fixed income.' },
        { k: 'Basis point (bp)', v: 'One hundredth of a percentage point (0.01%). Bond moves are counted in bps: "the 10-year is up 8 bps".' },
        { k: 'Spread', v: 'The premium over the risk-free bond. A country\'s "risk premium" is the spread between its 10-year and Germany\'s.' },
        { k: 'Yield curve', v: 'The yield at each maturity. When it inverts (short pays more than long) it has historically preceded recessions.' },
      ],
      example: {
        title: 'Worked example: what a rate rise costs you',
        rows: [
          ['Bond', '10-year government, 3% coupon'],
          ['Face value', '€1,000'],
          ['Purchase price', '100% = €1,000'],
          ['Modified duration', '8.2'],
          ['Rates rise 100 bps (1%)', '−8.2% of price'],
          ['Approximate new price', '€918'],
          ['Unrealised loss', '−€82 (even while collecting the coupon)'],
        ],
        note: 'This is exactly what happened in 2022: the worst fixed income drawdown in decades, in the asset everyone considered "safe". Safe means you get your money back at maturity — not that the price cannot collapse before then.',
      },
      faq: [
        { q: 'Why do bond prices fall when interest rates rise?', a: 'Because your bond pays a fixed coupon. If you bought one paying 3% and tomorrow the government issues new bonds at 4%, nobody will buy yours at the same price: for it to deliver the same return, its price must fall until its yield matches 4%. It is arithmetic, not sentiment.' },
        { q: 'What is bond duration?', a: 'The measure of how much a bond\'s price moves for a change in rates. A modified duration of 8 means a one percentage point rate rise cuts the price by about 8%. The longer the maturity and the lower the coupon, the higher the duration and the greater the risk.' },
        { q: 'What is a country risk premium?', a: 'The spread between a country\'s 10-year bond yield and Germany\'s at the same maturity, measured in basis points. It shows how much extra interest the market demands to lend to that country instead of Germany, which is taken as the eurozone\'s risk-free reference.' },
        { q: 'What does an inverted yield curve mean?', a: 'That short-dated bonds pay more than long-dated ones, the opposite of normal. It signals the market expects rates to fall, usually because it anticipates a slowdown. Historically, the US 2-10 year inversion has preceded every recession since 1955, with a lag of 6 to 24 months.' },
        { q: 'How can a retail investor buy bonds?', a: 'Directly at national treasury auctions or through a broker in the secondary market, though minimum sizes can be high. The most accessible route is fixed income ETFs, which give diversified exposure at any amount — at the cost of having no fixed maturity date.' },
      ],
    },
    tv: { widget: 'market-overview-bonds' },
    calc: 'compound',
  },

  // ─────────────────────────────────────────────── OPTIONS
  options: {
    es: {
      what: 'Una opción da el DERECHO —no la obligación— de comprar (call) o vender (put) un activo a un precio fijado (strike) antes o en una fecha concreta. Quien compra paga una prima y arriesga solo esa prima. Quien vende cobra la prima y asume la obligación, con riesgo potencialmente ilimitado. Es el único instrumento que permite construir un perfil de riesgo a medida.',
      measure: [
        { k: 'Prima', v: 'El precio de la opción. Se cotiza por acción, pero se paga por contrato: prima × multiplicador.' },
        { k: 'Multiplicador', v: '100 en opciones sobre acciones estadounidenses. Una prima de 2,50 $ cuesta 250 $ por contrato. Es el error de cálculo más común del principiante.' },
        { k: 'Strike', v: 'El precio al que se ejerce el derecho. Determina si la opción está ITM (con valor intrínseco), ATM o OTM (solo valor temporal).' },
        { k: 'Volatilidad implícita (IV)', v: 'La volatilidad que el mercado descuenta. Es el único input del precio que no se observa: se deduce. Comprar con IV alta y que caiga te hace perder aunque aciertes la dirección.' },
        { k: 'Griegas', v: 'Delta (sensibilidad al subyacente), Gamma (cambio de la delta), Theta (pérdida diaria por tiempo), Vega (sensibilidad a la IV), Rho (a los tipos).' },
        { k: 'Valor intrínseco vs temporal', v: 'Intrínseco = lo que valdría si venciera ahora. Temporal = todo lo demás, y se evapora hasta llegar a cero el día del vencimiento.' },
        { k: 'Apalancamiento nocional', v: 'Nocional controlado ÷ prima pagada. Ajustado por delta da el apalancamiento efectivo, que es el que de verdad importa.' },
      ],
      example: {
        title: 'Ejemplo resuelto: el apalancamiento real de una opción',
        rows: [
          ['Subyacente', '100 €'],
          ['Contrato', '100 acciones → nocional 10.000 €'],
          ['Prima', '2 € por acción → 200 € por contrato'],
          ['Apalancamiento nocional', '10.000 ÷ 200 = 50×'],
          ['Delta de la opción', '0,50'],
          ['Apalancamiento efectivo', '50 × 0,50 = 25×'],
          ['Si el subyacente sube 2% (2 €)', 'La prima gana ≈ 2 € × 0,50 = 1 € → +50% sobre la prima'],
        ],
        note: 'Las opciones OTM baratas tienen MÁS apalancamiento nocional (la prima es minúscula) pero MENOS delta, así que se mueven menos por cada euro del subyacente. Es la trampa del "billete de lotería": mucho apalancamiento teórico, poca sensibilidad real, y theta comiéndose la prima cada día.',
      },
      faq: [
        { q: '¿Qué es una opción call y una opción put?', a: 'Una call da derecho a COMPRAR el activo al precio de ejercicio; se compra esperando que el precio suba. Una put da derecho a VENDERLO a ese precio; se compra esperando que baje o para proteger una cartera. En ambos casos el comprador arriesga como máximo la prima pagada.' },
        { q: '¿Cuánto cuesta un contrato de opciones?', a: 'La prima cotizada multiplicada por el multiplicador del contrato, que en opciones sobre acciones estadounidenses es 100. Una prima de 3,20 $ significa 320 $ por contrato, no 3,20 $. Es la confusión que más dinero cuesta a los principiantes.' },
        { q: '¿Qué significa comprar para abrir y vender para cerrar?', a: 'Comprar para abrir (buy to open) inicia una posición larga pagando la prima. Vender para cerrar (sell to close) la deshace vendiendo el contrato en el mercado. Si en cambio abriste vendiendo (sell to open, cobrando la prima), cierras comprando (buy to close). Confundir abrir con cerrar te deja con una posición vendida sin quererlo.' },
        { q: '¿Qué pasa si dejo expirar una opción?', a: 'Si vence fuera de dinero (OTM), expira sin valor y pierdes toda la prima pagada. Si vence dentro de dinero (ITM), se ejerce o se liquida automáticamente: en opciones sobre acciones eso significa recibir o entregar 100 acciones por contrato, lo que puede exigir capital que no tienes. Por eso los profesionales cierran antes del vencimiento.' },
        { q: '¿Por qué pierdo dinero con la opción si acerté la dirección?', a: 'Por dos motivos casi siempre: la theta (el valor temporal se evapora cada día, y se acelera en las últimas semanas) y la caída de la volatilidad implícita (si compraste con IV alta —antes de resultados, por ejemplo— y la IV se desploma tras el evento, la prima cae aunque el precio se mueva a tu favor). Acertar la dirección es solo uno de los tres factores que hay que acertar.' },
      ],
    },
    en: {
      what: 'An option gives the RIGHT — not the obligation — to buy (call) or sell (put) an asset at a fixed price (strike) before or on a set date. The buyer pays a premium and risks only that premium. The seller collects the premium and takes on the obligation, with potentially unlimited risk. It is the only instrument that lets you build a bespoke risk profile.',
      measure: [
        { k: 'Premium', v: 'The option\'s price. Quoted per share, paid per contract: premium × multiplier.' },
        { k: 'Multiplier', v: '100 on US equity options. A $2.50 premium costs $250 per contract. The most common beginner miscalculation.' },
        { k: 'Strike', v: 'The price at which the right is exercised. It determines whether the option is ITM (has intrinsic value), ATM or OTM (time value only).' },
        { k: 'Implied volatility (IV)', v: 'The volatility the market is pricing in. The only price input you cannot observe — it is inferred. Buy at high IV and watch it fall and you lose even when the direction is right.' },
        { k: 'The Greeks', v: 'Delta (sensitivity to the underlying), Gamma (rate of change of delta), Theta (daily time decay), Vega (sensitivity to IV), Rho (to rates).' },
        { k: 'Intrinsic vs time value', v: 'Intrinsic = what it would be worth expiring now. Time value = everything else, and it evaporates to exactly zero on expiry day.' },
        { k: 'Notional leverage', v: 'Notional controlled ÷ premium paid. Adjusted by delta it becomes effective leverage, which is the one that matters.' },
      ],
      example: {
        title: 'Worked example: an option\'s real leverage',
        rows: [
          ['Underlying', '€100'],
          ['Contract', '100 shares → €10,000 notional'],
          ['Premium', '€2 per share → €200 per contract'],
          ['Notional leverage', '10,000 ÷ 200 = 50×'],
          ['Option delta', '0.50'],
          ['Effective leverage', '50 × 0.50 = 25×'],
          ['If the underlying rises 2% (€2)', 'Premium gains ≈ €2 × 0.50 = €1 → +50% on the premium'],
        ],
        note: 'Cheap OTM options have MORE notional leverage (the premium is tiny) but LESS delta, so they move less per euro of underlying. That is the lottery-ticket trap: large theoretical leverage, small real sensitivity, and theta eating the premium every day.',
      },
      faq: [
        { q: 'What is a call option and a put option?', a: 'A call gives the right to BUY the asset at the strike price; you buy one expecting the price to rise. A put gives the right to SELL at that price; you buy one expecting a fall or to protect a portfolio. In both cases the buyer risks at most the premium paid.' },
        { q: 'How much does one options contract cost?', a: 'The quoted premium multiplied by the contract multiplier, which on US equity options is 100. A $3.20 premium means $320 per contract, not $3.20. It is the confusion that costs beginners the most money.' },
        { q: 'What do buy to open and sell to close mean?', a: 'Buy to open starts a long position by paying the premium. Sell to close unwinds it by selling the contract in the market. If instead you opened by selling (sell to open, collecting the premium), you close by buying (buy to close). Confusing opening with closing leaves you short a contract you never meant to sell.' },
        { q: 'What happens if I let an option expire?', a: 'If it expires out of the money (OTM) it becomes worthless and you lose the entire premium. If it expires in the money (ITM) it is exercised or cash-settled automatically: on equity options that means receiving or delivering 100 shares per contract, which can demand capital you do not have. That is why professionals close before expiry.' },
        { q: 'Why did I lose money on the option when I got the direction right?', a: 'Almost always two reasons: theta (time value evaporates daily and accelerates in the final weeks) and an implied volatility crush (if you bought at high IV — before earnings, say — and IV collapses after the event, the premium falls even as the price moves your way). Getting the direction right is only one of the three things you have to get right.' },
      ],
    },
    tv: { widget: 'technical' },
    calc: 'options',
  },

  // ─────────────────────────────────────────────── CFDs
  cfds: {
    es: {
      what: 'Un CFD (contrato por diferencia) es un acuerdo privado con tu bróker para intercambiar la diferencia de precio de un activo entre la apertura y el cierre. Nunca posees el activo. Permite operar casi cualquier mercado con poco capital y ponerse corto con un clic — y es, con diferencia, el producto donde más dinero pierde el minorista.',
      measure: [
        { k: 'Nocional', v: 'Tamaño de la posición × precio. Es sobre lo que se calculan tus ganancias, pérdidas y costes.' },
        { k: 'Margen', v: 'Lo que bloquea el bróker. En la UE, ESMA limita el apalancamiento minorista: 30:1 en majors de forex, 20:1 en índices principales, 10:1 en materias primas, 5:1 en acciones y 2:1 en cripto.' },
        { k: 'Spread', v: 'La diferencia entre compra y venta que fija tu bróker. Es su principal ingreso y tu coste inmediato: entras perdiendo el spread.' },
        { k: 'Coste de financiación nocturna', v: 'Cada noche que mantienes la posición pagas un interés sobre el NOCIONAL COMPLETO, no sobre tu margen. Es lo que convierte un CFD en un producto caro para mantener más de unos días.' },
        { k: 'Protección de saldo negativo', v: 'Obligatoria en la UE para minoristas: no puedes perder más de lo depositado. Fuera de la UE, en muchos brókers, sí puedes.' },
        { k: 'Riesgo de contraparte', v: 'No hay cámara de compensación: si tu bróker quiebra, eres un acreedor más. Por eso el regulador del bróker importa tanto como su spread.' },
      ],
      example: {
        title: 'Ejemplo resuelto: lo que cuesta mantener un CFD abierto',
        rows: [
          ['Posición', 'CFD sobre índice, nocional 20.000 €'],
          ['Margen depositado (20:1)', '1.000 €'],
          ['Spread de entrada', '~1 punto ≈ 4 €'],
          ['Financiación diaria (~4,5% anual sobre nocional)', '20.000 × 4,5% ÷ 365 = 2,47 €/día'],
          ['Coste a 30 días', '74 € = 7,4% de tu margen'],
          ['Coste a 90 días', '222 € = 22% de tu margen'],
        ],
        note: 'Mantener ese CFD tres meses cuesta el 22% del capital que pusiste, antes de que el mercado se mueva un solo punto. Por eso el CFD es una herramienta de corto plazo: usarlo como inversión a largo plazo es pagar un alquiler carísimo por algo que podrías comprar en propiedad con un ETF.',
      },
      faq: [
        { q: '¿Qué es un CFD y cómo funciona?', a: 'Un contrato por diferencia es un acuerdo con tu bróker para intercambiar la diferencia entre el precio de apertura y el de cierre de un activo. Si compras un CFD sobre una acción y esta sube un 5%, ganas ese 5% sobre el nocional sin haber comprado la acción. Nunca eres propietario del subyacente: no cobras dividendos como tal (se ajustan), no tienes derecho de voto y no puedes retirar el activo.' },
        { q: '¿Por qué pierde dinero la mayoría de quien opera CFDs?', a: 'Los propios brókers están obligados por ESMA a publicarlo: entre el 74% y el 89% de las cuentas minoristas pierden dinero. Las causas son estructurales: apalancamiento alto que amplifica los errores de tamaño, spread y financiación que erosionan el resultado, y un producto que invita a operar en exceso. No es mala suerte; es la matemática del producto combinada con el comportamiento humano.' },
        { q: '¿Qué apalancamiento permite la ley en CFDs?', a: 'En la Unión Europea, ESMA limita el apalancamiento para clientes minoristas a 30:1 en pares de divisas principales, 20:1 en índices principales y oro, 10:1 en el resto de materias primas e índices secundarios, 5:1 en acciones individuales y 2:1 en criptomonedas. Los clientes profesionales pueden pedir más, renunciando a protecciones.' },
        { q: '¿Cuál es la diferencia entre un CFD y comprar la acción?', a: 'Comprando la acción eres propietario: cobras dividendos, votas, no pagas financiación y puedes mantenerla indefinidamente. Con el CFD tienes exposición al precio con menos capital y puedes ponerte corto fácilmente, pero pagas spread y financiación diaria, dependes del crédito de tu bróker y no posees nada. Para largo plazo, la acción o el ETF; para corto plazo con apalancamiento, el CFD.' },
        { q: '¿Se puede perder más dinero del depositado con un CFD?', a: 'En la Unión Europea no: la protección de saldo negativo es obligatoria para clientes minoristas desde 2018 y tu pérdida máxima es el saldo de la cuenta. Con brókers de fuera de la UE o con la clasificación de cliente profesional, esa protección puede no existir y sí puedes acabar debiendo dinero.' },
      ],
    },
    en: {
      what: 'A CFD (contract for difference) is a private agreement with your broker to exchange the price difference of an asset between opening and closing. You never own the asset. It lets you trade almost any market with little capital and go short in one click — and it is, by a wide margin, the product where retail loses the most money.',
      measure: [
        { k: 'Notional', v: 'Position size × price. Your gains, losses and costs are all computed on it.' },
        { k: 'Margin', v: 'What the broker locks up. In the EU, ESMA caps retail leverage: 30:1 on major forex, 20:1 on major indices, 10:1 on commodities, 5:1 on single shares and 2:1 on crypto.' },
        { k: 'Spread', v: 'The bid-ask gap your broker sets. It is their main revenue and your immediate cost: you enter already down the spread.' },
        { k: 'Overnight financing', v: 'Every night you hold, you pay interest on the FULL NOTIONAL, not on your margin. This is what makes a CFD expensive to hold beyond a few days.' },
        { k: 'Negative balance protection', v: 'Mandatory in the EU for retail clients: you cannot lose more than you deposited. Outside the EU, at many brokers, you can.' },
        { k: 'Counterparty risk', v: 'There is no clearing house: if your broker fails, you are just another creditor. Which is why the broker\'s regulator matters as much as its spread.' },
      ],
      example: {
        title: 'Worked example: the cost of holding a CFD open',
        rows: [
          ['Position', 'Index CFD, €20,000 notional'],
          ['Margin posted (20:1)', '€1,000'],
          ['Entry spread', '~1 point ≈ €4'],
          ['Daily financing (~4.5% p.a. on notional)', '20,000 × 4.5% ÷ 365 = €2.47/day'],
          ['Cost over 30 days', '€74 = 7.4% of your margin'],
          ['Cost over 90 days', '€222 = 22% of your margin'],
        ],
        note: 'Holding that CFD for three months costs 22% of the capital you posted, before the market moves a single point. That is why a CFD is a short-term tool: using it as a long-term investment is paying an extortionate rent for something you could own outright with an ETF.',
      },
      faq: [
        { q: 'What is a CFD and how does it work?', a: 'A contract for difference is an agreement with your broker to exchange the difference between an asset\'s opening and closing price. Buy a share CFD and the share rises 5%, you make that 5% on the notional without ever buying the share. You never own the underlying: you receive no dividends as such (they are adjusted), you have no voting rights and you cannot withdraw the asset.' },
        { q: 'Why do most CFD traders lose money?', a: 'Brokers are required by ESMA to publish it: between 74% and 89% of retail accounts lose money. The causes are structural: high leverage that amplifies sizing errors, spread and financing that erode results, and a product that invites overtrading. It is not bad luck; it is the product\'s mathematics meeting human behaviour.' },
        { q: 'What leverage does the law allow on CFDs?', a: 'In the European Union, ESMA caps retail leverage at 30:1 on major currency pairs, 20:1 on major indices and gold, 10:1 on other commodities and non-major indices, 5:1 on individual shares and 2:1 on cryptocurrencies. Professional clients can request more by waiving protections.' },
        { q: 'What is the difference between a CFD and buying the share?', a: 'Buying the share makes you an owner: you receive dividends, you vote, you pay no financing and you can hold indefinitely. With a CFD you get price exposure with less capital and can short easily, but you pay spread and daily financing, you depend on your broker\'s solvency, and you own nothing. For the long term, the share or the ETF; for short-term leveraged trades, the CFD.' },
        { q: 'Can you lose more than you deposit with a CFD?', a: 'In the European Union, no: negative balance protection has been mandatory for retail clients since 2018 and your maximum loss is your account balance. With non-EU brokers, or under professional client classification, that protection may not apply and you can end up owing money.' },
      ],
    },
    tv: { widget: 'market-overview-cfd' },
    calc: 'leverage',
  },
};

/** Resolve a market's content for a locale, falling back to English (never Spanish). */
export function getMarketContent(marketId, locale) {
  const entry = CONTENT[marketId];
  if (!entry) return null;
  const body = entry[locale] || entry.en;
  return { ...body, tv: entry.tv, calc: entry.calc, id: marketId };
}

export const MARKET_IDS = Object.keys(CONTENT);

export default CONTENT;
