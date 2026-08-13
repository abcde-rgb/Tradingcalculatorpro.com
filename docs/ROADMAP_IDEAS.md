# 💡 Catálogo de ideas implementables — análisis, gestión, psicología y comportamiento

> Síntesis de conocimiento de trading (análisis técnico, gestión de riesgo, psicología,
> finanzas conductuales, educación) traducido a **funciones concretas implementables** en
> TradingCalculator.Pro. Cada idea indica: **dónde encaja**, **esfuerzo** (S = horas,
> M = 1-2 días, L = 3+ días) y si toca **front/back**.
>
> Mencionadas **por separado** como pediste. Marca lo que quieras y lo construyo.
> Fuentes conceptuales: literatura estándar de trading (Van Tharp, Mark Douglas, Brett
> Steenbarger, Kahneman, Elder, Murphy, Tharp R-multiples, Kelly, etc.) + prácticas de
> plataformas líderes (TradingView, TradeZella, OptionStrat, Tastytrade).

---

## 1. Análisis técnico

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 1.1 | **Presets de indicadores** seleccionables en el gráfico (RSI+MACD, Bollinger, EMAs, Ichimoku) y persistidos por usuario | `TradingViewChart` | S (front) |
| 1.2 | **Indicadores y dibujos guardables por usuario** (Advanced Charts + `save_load_adapter`) | ver `TRADINGVIEW_PERSONALIZACION.md` | L (full) |
| 1.3 | **Screener técnico**: filtrar activos por RSI sobrecompra/venta, cruce de medias, ruptura de rango | nuevo endpoint + página | M (full) |
| 1.4 | **Detector de soportes/resistencias** automático sobre OHLC | `stock_data` + UI | M (full) |
| 1.5 | **Confluencia multi-timeframe**: mostrar tendencia en 1H/4H/1D a la vez | dashboard | M (full) |
| 1.6 | **Backtesting visual** de reglas simples (cruce de medias, RSI) con curva de resultados | ya hay `/backtest` | M (full) |
| 1.7 | Ampliar **patrones de velas** (ya hay `candle_patterns.py`) con fiabilidad estadística por activo | `candle_patterns` | M (back) |

## 2. Gestión de riesgo y capital

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 2.1 | **R-múltiplos** (riesgo por operación en "R") en el journal y analytics | `performance.py` + UI | M (full) |
| 2.2 | **Position sizing por % de riesgo de cuenta** unificado (riesgo fijo, volatilidad/ATR, Kelly fraccional) | calculadoras | M (full) |
| 2.3 | **Simulador de drawdown / ruina**: probabilidad de quiebra según win-rate y riesgo | extiende Monte Carlo | S (full) |
| 2.4 | **Límites de riesgo diario/semanal** con aviso ("has alcanzado tu pérdida máxima del día") | journal + settings | M (full) |
| 2.5 | **Correlación de cartera**: avisar si el usuario está sobreexpuesto a activos correlacionados | `portfolio` | M (full) |
| 2.6 | **Calculadora de expectativa matemática** (win% × avgWin − loss% × avgLoss) destacada | journal | S (front) |
| 2.7 | **Heat de exposición**: % de capital en riesgo abierto ahora mismo | dashboard | S (full) |

## 3. Psicología del trading

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 3.1 | **Check-in emocional** antes/después de operar (estado, sueño, estrés) y correlación con resultados | journal | M (full) |
| 3.2 | **Checklist pre-operación** configurable (no operar sin cumplir tu plan) | journal/settings | S (full) |
| 3.3 | **Reglas personales + alertas de disciplina** ("rompiste tu regla de no promediar pérdidas") | journal | M (full) |
| 3.4 | **Diario emocional** con etiquetas (FOMO, venganza, miedo, codicia) y reporte de patrones | journal | M (full) |
| 3.5 | **Modo "cool-down"**: tras X pérdidas seguidas, sugerir pausa | journal | S (front) |
| 3.6 | **Resumen semanal de mentalidad** generado por el AI Coach | extiende AI | M (full) |

## 4. Finanzas conductuales / sesgos

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 4.1 | **Detección de sesgos** sobre el journal: *disposition effect* (cortar ganancias/dejar correr pérdidas), *overtrading*, *revenge trading*, *anclaje* | `performance.py` analytics | M (back) |
| 4.2 | **Informe de comportamiento**: "tus mejores trades son a media mañana; los peores, tras una pérdida" | analytics | M (full) |
| 4.3 | **Sesgo de hora/día**: heatmap de rendimiento por hora/día (complementa el de uso) | analytics | S (full) |
| 4.4 | **Alerta de overtrading**: nº de operaciones vs tu media, en tiempo real | journal | S (full) |
| 4.5 | **Análisis "qué hubiera pasado"**: si hubieras respetado tu stop/target | journal | M (back) |

## 5. Educación / zona de aprendizaje

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 5.1 | **Rutas de aprendizaje** estructuradas (principiante → opciones → gestión → psicología) con progreso | `EducationPage` | M (full) |
| 5.2 | **Quizzes** con puntuación y badges al terminar cada módulo | education | M (full) |
| 5.3 | **Glosario interactivo** con tooltips en toda la app (hover sobre "Delta", "IV rank"...) | global | M (front) |
| 5.4 | **Tarjetas de patrones** con ejemplo real en vivo (ya hay pattern-scan) | education | S (full) |
| 5.5 | **Completar i18n** (G-09): ~290 claves en de/fr/ru/zh/ja/ar (sobre todo educación) | i18n | M (front) |
| 5.6 | **Casos de estudio** / playbooks de estrategias de opciones con cuándo usarlas | education | M (front) |

## 6. Journal y performance avanzado

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 6.1 | **Curva de equity** y drawdown en el tiempo | `PerformancePage` | S (full) |
| 6.2 | **MAE / MFE** (máxima excursión adversa/favorable) por operación | performance | M (full) |
| 6.3 | **Etiquetas y filtros** (estrategia, setup, activo, emoción) + estadística por etiqueta | journal | M (full) |
| 6.4 | **Import por broker** (CSV/plantillas de IBKR, Binance, MT4/5) | journal | M-L (full) |
| 6.5 | **Calendario de PnL** estilo TradeZella (verde/rojo por día) | performance | S (front) |
| 6.6 | **Comparativa vs benchmark** (tu cuenta vs SPX/BTC) | performance | M (full) |

## 7. Datos de mercado y contexto

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 7.1 | **Fear & Greed Index** (cripto y acciones) en el dashboard | nuevo endpoint | S (full) |
| 7.2 | **Calendario económico** (FOMC, NFP, earnings) con avisos | nuevo endpoint | M (full) |
| 7.3 | **Caché TTL de precios** (10-30 s) para reducir latencia y baneos de upstream | `stock_data` | S (back) |
| 7.4 | **Sentimiento de noticias** por activo (titulares + tono) | nuevo + IA | M-L (full) |
| 7.5 | **Mapa de calor de mercado** (sectores/cripto por % cambio) | nuevo endpoint | M (full) |
| 7.6 | **Cadenas de opciones REALES** (proveedor de pago) → enciende `options_positioning` | `market_data` + `server` | M (back) · ver ↓ |

### 7.6 — Datos reales de opciones (evaluado 2026-08-08, NO adoptado)

**Qué desbloquea, y por qué es distinto de las demás ideas de esta lista:** no
construye nada nuevo, **enciende algo ya escrito**. `options_positioning.py`
—max pain, GEX, perfil de interés abierto, ratio put/call, liquidez por
contrato— está terminado y con tests, y hoy devuelve **siempre `None`**. No es
un bug: esas métricas se leen del interés abierto *observado*, y las cadenas del
producto son sintéticas (`generate_options_chain` + `_synthetic_marker`), así
que el `openInterest` es `None` y el módulo se calla a propósito. Un max pain
inventado es indistinguible en pantalla de uno real.

Con un feed real, el módulo empieza a devolver números, `synthetic` pasa a
`false` y la banda de aviso desaparece sola en los cuatro sitios donde ya está
montado `SyntheticDataBanner` (calculadora, cadena, superficie de IV,
optimizador). No hay interfaz que escribir.

**Candidato evaluado: EODHD.** 6.600+ acciones US, interés abierto, las cinco
griegas, IV y 42+ campos por contrato; ~2,5 años de histórico desde Q4 2023.
Desde **99,99 $/mes**, y **sólo opciones US**.

**Cómo se integraría** (si algún día se hace):

1. Un `Provider` nuevo en `market_data.py` — la capa ya tiene failover, caché y
   circuit breakers, así que hay hueco limpio.
2. Sustituir `generate_options_chain` por la cadena real **sólo cuando el
   símbolo esté cubierto**, dejando la sintética como fallback **etiquetado**.
   La regla de honestidad numérica no se toca: lo modelado sigue marcado.
3. Nada más. `options_positioning` no necesita cambios: ya distingue observado
   de modelado.

**Por qué NO se adoptó ahora:** la pregunta es de negocio, no técnica —
¿cuántos suscriptores operan opciones **americanas** y pagarían por
posicionamiento real? El producto es multi-activo y multi-idioma; si la
respuesta es "pocos", el módulo puede seguir callado sin que pase nada, que es
exactamente para lo que está diseñado. Para precios normales (acciones, índices,
materias primas) **no hace falta**: ya hay Yahoo → Finnhub → Twelve Data con
failover, cripto con Binance + Kraken, forex del BCE y tipo libre de riesgo del
Tesoro. Añadirlo ahí sería pagar por redundancia que ya existe gratis.

> ⚠️ **No confundir con el MCP.** EODHD publica también un servidor MCP
> (`claude mcp add eodhd --transport http "https://…/mcp?apikey=…"`). Eso conecta
> el proveedor **al agente de desarrollo**, no al backend: sirve para que Claude
> Code consulte datos mientras se programa, y **no integra nada en la app**. Si
> se usa, tener en cuenta que la API key viaja **en la URL**, queda en la
> configuración del MCP y las URLs acaban en logs — usar una clave de solo
> lectura y acotada.

## 8. Producto, UX y "arte"

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 8.1 | **Volver + X de cerrar** en login/registro | ✅ hecho esta sesión | — |
| 8.2 | **Onboarding guiado** (ya hay `OnboardingModal`) con tour interactivo de las herramientas | global | M (front) |
| 8.3 | **Animaciones sutiles** con framer-motion (ya instalado): entradas, hover de tarjetas, números que cuentan | landing/dashboard | S-M (front) |
| 8.4 | **Rediseño del hero de la landing** (la parte que no te gusta — dime cuál) + social proof / testimonios | `LandingPage` | M (front) |
| 8.5 | **Modo "demo en vivo"** en la landing: mini-calculadora funcional sin registro | landing | M (front) |
| 8.6 | **Gamificación**: rachas, niveles, logros por usar herramientas y respetar el plan | global | M-L (full) |
| 8.7 | **Skeleton loaders** y micro-interacciones para sensación premium | global | S (front) |
| 8.8 | **Compartir resultados** (imagen con marca de tu payoff/setup) — ya hay `html2canvas`/`jspdf` | calculadoras | S (front) |

## 9. IA (extender el AI Trade Coach)

| # | Idea | Encaja en | Esfuerzo |
|---|---|---|---|
| 9.1 | **Revisión del journal por IA**: resumen semanal de errores y mejoras | extiende AI | M (full) |
| 9.2 | **"Explica esta operación"** desde cualquier setup | ya hay `ExplainTrade` | S (full) |
| 9.3 | **Coach de plan de trading**: la IA ayuda a redactar reglas y las verifica | nuevo | M (full) |
| 9.4 | **Asistente de estrategia de opciones** por objetivo (ingresos, cobertura, direccional) | opciones | M (full) |

---

## Prioridades sugeridas (mi recomendación)

**Quick wins de alto impacto (S/M, ya casi listos por la infra existente):**
- 6.1 Curva de equity · 6.5 Calendario de PnL · 4.3 Heatmap de rendimiento por hora
- 2.1 R-múltiplos · 2.3 Simulador de ruina · 8.3 Animaciones · 8.8 Compartir resultados
- 7.1 Fear & Greed · 7.3 Caché de precios · 3.2 Checklist pre-operación

**Diferenciadores de medio plazo:**
- 1.2 Análisis guardable en el gráfico · 4.1 Detección de sesgos · 5.1 Rutas de aprendizaje
- 9.1 Revisión del journal por IA · 7.2 Calendario económico

> Cuando se implemente algo de aquí, muévelo al backlog de `ESTADO_PROYECTO.md` y márcalo.
