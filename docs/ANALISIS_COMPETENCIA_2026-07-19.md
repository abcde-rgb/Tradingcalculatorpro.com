# 🥊 Análisis de competencia — TradingCalculator.Pro (2026-07-19)

> **Pregunta del propietario**: «¿Existe alguien en la competencia que ofrezca TODO lo que
> ofrezco yo, mejor que yo?»
>
> **Respuesta corta: NO.** No existe hoy (julio 2026) un competidor único que ofrezca el
> paquete completo de esta web en un solo producto. Pero **en cada vertical suelta sí hay un
> especialista que gana en esa vertical concreta**. El foso competitivo real es el *bundle* +
> los 8 idiomas + el precio (17 €/mes), no ninguna funcionalidad aislada.

---

## 1. Qué ofrece TradingCalculator.Pro (inventario verificado contra el código)

| Vertical | Qué hay |
|---|---|
| **Calculadoras** (19+) | Position Size, Lot Size, Leverage, Futures (tick/nocional/margen), Fibonacci, Percentage, Target Price, Spot, Black-Scholes, Monte Carlo, Pattern Trading, Simulator Pro (con TP parciales), Salida parcial (R:B), Interés compuesto, Risk of Ruin, Kelly, Drawdown→Recuperación, Portfolio Heat con correlación, Stress test de margen |
| **Suite de opciones** (~28 componentes) | Cadena, payoff, griegas (+evolución temporal), IV surface, IV rank, unusual activity, market flow, optimizador, comparador, posiciones guardadas, **AI Trade Coach (Claude)** |
| **Diario + analytics** | Calendario PnL mensual, curva de equity, R-múltiplos, MAE/MFE, **detección de sesgos de comportamiento** (disposición, revenge trading, overtrading, falta de stop), «edge en vivo» que alimenta las calculadoras RoR/Kelly con datos reales del diario |
| **Academia** | **68 módulos × 8 idiomas**, 6 pilares, glosario de 60 términos con 20 diagramas SVG, quizzes por pilar, ruta guiada «Empieza aquí», módulos de realidad (evidencia, verdad del fondeo, camino del trader) con fuentes citadas |
| **Gráficos + escáner propio** | TradingView embebido (186 activos) + **escáner de estructura propio** (swings, HH/HL, BOS/CHoCH, S/R automáticos, FVG, confirmación de rupturas con volumen) + escáner de patrones de velas |
| **Mercado** | Alertas de precio en cualquier activo (WebSocket), watchlist con precios en vivo, calendario económico, ~290 símbolos buscables |
| **Plataforma** | 8 idiomas con paridad total (5052 claves), ~660 páginas SEO estáticas, PWA, 4 temas premium, 2FA TOTP, Google OAuth, programa de afiliados propio, panel admin |
| **Precio** | **17 €/mes · 45 €/trim · 200 €/año · 500 € lifetime**, prueba de 7 días, pago con Stripe/PayPal/Revolut/cripto (NOWPayments) |

---

## 2. Comparativa por vertical: quién te gana en QUÉ

### 2.1 Diario de trading → **te ganan los especialistas** 🔴 (el mayor gap)

| Competidor | Precio | Lo que tiene y tú no |
|---|---|---|
| **TradeZella** | $24–49/mes | **Importación automática desde 500+ brokers/prop firms**, 300+ informes, trade replay segundo a segundo, backtesting con 11 años de datos en lenguaje natural, Zella AI (auto-tagging + revisión automática de cada trade) |
| **TraderSync** | $29.95–79.95/mes | 700+ brokers, IA «Cypher» |
| **Tradervue** | desde $29.95/mes | 80+ brokers, 100+ informes, estándar del sector |
| **Edgewonk** | $197/año | Foco psicología/emociones |
| **TradesViz** | $14.99–29.99/mes | 200+ brokers, AI Q&A, tier gratis (3000 ejecuciones/mes) |

**Veredicto**: tu diario es **manual** (el usuario teclea sus operaciones). Para un trader
activo eso es un dealbreaker frente al auto-import. A tu favor: tu detección de sesgos de
comportamiento y el «edge en vivo» hacia las calculadoras son features que ellos no unen así,
y tu precio es la mitad o un tercio. Pero **en la vertical journal, TradeZella es mejor que tú**.

### 2.2 Suite de opciones → **te gana OptionStrat en datos en vivo** 🟠

- **OptionStrat**: gratis (datos retrasados) / $39.99/mes (Live Tools) / $99.99/mes (Live Flow).
  P&L multi-leg en tiempo real, griegas combinadas y su evolución, **flow institucional en vivo**
  con filtros. **Options Profit Calculator** y la calculadora de Barchart son gratis.
- Tu suite es sorprendentemente completa para el precio (IV surface, IV rank, optimizador,
  comparador, AI Coach), pero corre sobre **yfinance** (datos retrasados/limitados). El
  «unusual activity» y «market flow» tuyos no compiten con un feed real de $99/mes.

**Veredicto**: como *analytics educativos + calculadora* estás muy bien; como *herramienta de
flow en vivo* OptionStrat es mejor. Nadie a 17 €/mes da flow real — no es tu batalla.

### 2.3 Calculadoras → **nadie te gana en profundidad, pero el «gratis» compite** 🟡

- **Myfxbook, BabyPips, brokers (XTB, AvaTrade, Admiral)**: calculadoras básicas gratis y sin
  registro. Ganan por fricción cero y SEO, no por calidad.
- **CalcuTrader** (español): 26 calculadoras gratis orientadas a prop/fondeo.
- Ninguno de los gratuitos tiene Monte Carlo + Kelly + RoR + stress test de margen + correlación
  de cartera + simulador con TP parciales **integrados con el diario real del usuario**.

**Veredicto**: en profundidad ganas tú; en captación (gratis + sin registro) ganan ellos. Tu
demo de la landing sin registro mitiga esto.

### 2.4 Educación → **BabyPips te gana en autoridad, no en amplitud** 🟡

- **BabyPips** (gratis): la referencia mundial en educación forex, autoridad de dominio
  altísima, pero solo inglés y solo forex-céntrico.
- **Zella University** (dentro de TradeZella): vídeos + webinars, solo inglés.
- Tu academia: 68 módulos × **8 idiomas**, con contenido honesto y citado (ESMA, SPIVA,
  Barber & Odean) que casi nadie publica (verdad del fondeo, PFOF, GEX, liquidez macro).

**Veredicto**: en contenido y amplitud multiidioma probablemente ganas tú hoy; en SEO/autoridad
te ganan por goleada (y son gratis). Sin dominio propio, esta batalla no se puede ganar.

### 2.5 Escáner de estructura / price action → **diferencial a tu precio** 🟢

TrendSpider y WealthCharts hacen detección automática (y más), pero cuestan mucho más y no
están en español. A 17 €/mes, un escáner BOS/CHoCH/S-R/FVG sincronizado con el gráfico es un
diferenciador que los journals y las calculadoras gratuitas no tienen.

### 2.6 Mercado hispanohablante → **tu playa está casi vacía** 🟢

- **Awake Trader** (ES): diario con IA + backtesting en español — el competidor más parecido
  en tu idioma, pero sin suite de opciones, sin academia de 68 módulos, sin calculadoras pro.
- **CalcuTrader** (ES): solo calculadoras, gratis.
- Nadie en español (ni en de/fr/ru/zh/ja/ar) bundlea calculadoras pro + opciones + diario +
  academia + escáner. **Los grandes (TradeZella, OptionStrat, BabyPips) son inglés-only.**

---

## 3. Matriz resumen

| Vertical | ¿Alguien lo hace mejor? | Quién | ¿Te lo hace TODO mejor? |
|---|:--:|---|:--:|
| Diario/journal | ✅ Sí | TradeZella, TraderSync | ❌ (no tienen calculadoras pro, ni opciones, ni 8 idiomas) |
| Opciones en vivo | ✅ Sí | OptionStrat | ❌ (solo opciones, inglés, $40–100/mes) |
| Calculadoras básicas | ⚖️ Empate (gratis) | Myfxbook, BabyPips, brokers | ❌ (sin profundidad ni integración) |
| Calculadoras avanzadas | ❌ No | — | — |
| Academia multiidioma | ⚖️ Autoridad sí, amplitud no | BabyPips | ❌ (solo inglés, solo forex) |
| Escáner de estructura | ✅ A más precio | TrendSpider, WealthCharts | ❌ (30–100+ $/mes, otro público) |
| Sesgos de comportamiento + edge en vivo | ❌ No así integrado | (Edgewonk parcial) | — |
| 8 idiomas con paridad total | ❌ Nadie | — | — |
| Precio del bundle | ❌ Nadie a 17 €/mes | — | — |

**Conclusión**: el conjunto {todo lo anterior, en 8 idiomas, a 17 €/mes} **no lo ofrece nadie**.
El riesgo no es un competidor que lo haga todo mejor — es que **el cliente que solo quiere UNA
cosa** elija al especialista (journal → TradeZella) o al gratuito (calculadora → Myfxbook).

---

## 4. Implicaciones accionables (por impacto)

1. **Importar operaciones automáticamente** (aunque sea CSV de los 5-10 brokers más comunes):
   es EL gap objetivo frente a los journals. Sin esto, el diario compite cojo.
2. **Dominio propio + Search Console** (ya identificado como palanca nº1 en ESTADO_PROYECTO):
   sin autoridad de dominio, la academia y las ~660 páginas SEO no pueden pelear con BabyPips.
3. **Posicionar el mensaje como bundle**: «todo lo que necesitas por 17 €/mes — lo que en
   TradeZella + OptionStrat te costaría 65–150 $/mes» es un claim verificable y potente.
4. **Doblar la apuesta por el español/multiidioma**: es el único frente donde no hay NADIE
   con un producto comparable. Marketing y contenido primero en ES/LATAM.
5. **No perseguir el flow en vivo de opciones**: exigiría feeds de datos caros; reposicionar
   la suite de opciones como «análisis + educación + estrategia», que es donde ya gana.

---

## 5. Fuentes consultadas (julio 2026)

- TradeZella: [pricing](https://www.tradezella.com/pricing) · [review StockBrokers](https://www.stockbrokers.com/review/tools/tradezella) · [pricing 2026 explicado](https://www.tradezella.com/blog/tradezella-pricing)
- OptionStrat: [features](https://optionstrat.com/features) · [review 2026](https://tradingtoolshub.com/blog/optionsstrat-review-2026-free-options-profit-calculator-worth-using/)
- Journals: [comparativa Tradeciety](https://tradeciety.com/best-online-trading-journals) · [daytradingz](https://daytradingz.com/best-trading-journal/) · [comparador JournalPlus](https://journalplus.co/compare/)
- Calculadoras gratis: [Myfxbook](https://www.myfxbook.com/forex-calculators) · [BabyPips tools](https://www.babypips.com/tools) · [CalcuTrader](https://calcutrader.com/)
- Español: [Awake Trader](https://www.awaketrader.com/plantilla-diario-trading) · [Trading Latam](https://trading-latam.com/calculadora-de-trading/)
- All-in-one: [WealthCharts](https://www.wealthcharts.com/)

> ⚠️ Precios y features de terceros verificados por búsqueda web en la fecha del análisis;
> pueden cambiar. Revisar antes de usar en marketing comparativo público.
