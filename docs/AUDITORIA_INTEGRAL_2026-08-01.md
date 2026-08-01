# 🔬 AUDITORÍA INTEGRAL 100% — TradingCalculator.Pro

> **Fecha:** 2026-08-01 · **Rama:** `claude/trading-web-full-audit-xmcxz9`
> **Alcance:** frontend + backend + documentación del repo, verificado **contra el código real**.
> **Objetivo:** dejar por escrito, con el máximo detalle y sin ambigüedades, **qué existe ya**,
> **qué falta**, **qué está a medias** y **cómo llevar la web a TOP-1 en trading de aprendizaje,
> datos, análisis y psicología**.
>
> Este documento responde **punto por punto** a la petición del dueño (viti.fisas@gmail.com) del
> 2026-08-01. Cada petición está mapeada en la **§2 Matriz de trazabilidad** con su estado y la
> acción propuesta, para que **nada quede sin registrar**.
>
> Documentos hermanos que amplían partes de esto: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md),
> [`ROADMAP_IDEAS.md`](./ROADMAP_IDEAS.md), [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md),
> [`PENDIENTES.md`](./PENDIENTES.md), [`ANALISIS_COMPETENCIA_2026-07-19.md`](./ANALISIS_COMPETENCIA_2026-07-19.md).

---

## 0. Metodología

Se ha leído y verificado directamente:

- **Frontend** (`frontend/src/`): `App.js` (19 rutas), `pages/` (19 páginas), `components/`
  (~200 componentes en 15 carpetas), `lib/` (i18n ×8, assets, store, theme), `hooks/`, `services/`.
  Archivos clave leídos íntegros: `TradingViewChart.jsx`, `EconomicCalendar.jsx`,
  `UniversalAssetSearch.jsx`, `Header.jsx`, `DashboardPage.jsx`, y secciones de `EducationPage.jsx`
  (272 KB, ~60 pestañas educativas).
- **Backend** (`backend/`): `server.py` (295 KB, 169 rutas), `stock_data.py`, `missing_apis.py`,
  `options_math.py`, `admin_routes.py`, `referrals.py`, `affiliate_program.py`, pasarelas
  (`nowpayments.py`, `revolut.py`), `realtime_alerts.py`.
- **Documentación** del repo: 20+ documentos en `docs/` + raíz.

**Leyenda de estado usada en todo el documento:**
🟢 Implementado y correcto · 🟡 Parcial / mejorable · 🔴 No existe (hueco) · 🔵 Solo documentado (sin código)

---

## 1. Resumen ejecutivo

TradingCalculator.Pro **no es un MVP**: es una plataforma financiera madura y muy completa —
19 páginas, ~200 componentes, 169 rutas de backend, 14 calculadoras, ~28 componentes de opciones,
**~60 módulos educativos** (787 entradas de contenido), panel admin de 156 KB, programa de
afiliados, 3 pasarelas de pago, 2FA, borrado RGPD, 8 idiomas a la par. La base es **sólida y
profesional**.

La petición del dueño se traduce en **11 frentes de mejora**. Tras la auditoría, el estado es:

| # | Frente | Veredicto | Prioridad |
|---|---|---|:--:|
| 1 | **Datos de mercado fiables** (Twelve Data vs Yahoo) + buscadores con autocompletado | 🟡 Yahoo funciona pero es frágil; buscador universal ya es bueno, el del gráfico no | **P1** |
| 2 | **Gráfico TradingView con dibujos guardables** + widgets útiles | 🔴 El embed no guarda dibujos; falta migrar a Advanced Charts | **P1** |
| 3 | **Tipos de mercado interactivos** (clic → preguntas/ejemplos/calculadora/widget) | 🔴 Hoy son tarjetas estáticas | **P1** |
| 4 | **Calendario con cuenta atrás + banderas + ponentes de alto impacto** | 🔴 Solo iframe de eventos, sin cuenta atrás ni banderas | **P2** |
| 5 | **Panel de noticias** (entre performance y precios, con fuente/hora/filtros) | 🔴 No existe — **a estudiar, no aplicar aún** (§4.C.3) | **P2 (estudio)** |
| 6 | **App móvil + desktop + badges de tiendas + "Próximamente"** | 🟡 PWA existe; faltan badges y empaquetado nativo | **P2** |
| 7 | **SEO + featured snippets de Google** (preguntas cripto) | 🟡 SEO fuerte; faltan datos estructurados FAQ/HowTo | **P1** |
| 8 | **Seguridad / pagos / admin / ciclo de cuenta / legal / IP** | 🟢 Muy sólido; huecos menores de endurecimiento | **P1 (cerrar huecos)** |
| 9 | **Journal & performance** (mejoras) | 🟡 Bueno; faltan R-múltiplos, equity curve, MAE/MFE | **P2** |
| 10 | **i18n / banderas / traducciones** | 🟢 8 idiomas a la par, banderas ya puestas | **P3 (mantener)** |
| 11 | **Performance / "aparecer desde 0 y actualizarse"** | 🟡 Base OK; falta sync cross-device de preferencias/journal desde cero | **P2** |

**Top-5 acciones de mayor impacto/ratio esfuerzo:**
1. **Tipos de mercado interactivos** en Educación (frente 3) — encaja con contenido ya existente.
2. **Datos estructurados FAQ/HowTo (schema.org)** para featured snippets (frente 7).
3. **Advanced Charts** para dibujos guardables por usuario (frente 2) — el mayor diferenciador.
4. **Twelve Data** como fuente primaria con Yahoo de fallback (frente 1).
5. **Badges de tiendas + sección "Próximamente App"** en la landing (frente 6) — quick win.

---

## 2. Matriz de trazabilidad (tu petición → estado → acción)

> Cada fila es una cosa que pediste. **Ninguna se pierde.** El detalle está en la §4.

| # | Lo que pediste (resumen) | Estado hoy | Dónde vive en el código | Acción propuesta (§) |
|---|---|:--:|---|---|
| P-01 | Registrar todo en un doc (lo que hay + lo que cambiar) | 🟢 | *este documento* | — |
| P-02 | Twelve Data para datos fiables en tiempo real (o el mejor gratis) | 🔵 | `PENDIENTES.md:18`; backend usa Yahoo | §4.A.1 |
| P-03 | Buscadores que muestren resultados **al escribir** | 🟡 | `UniversalAssetSearch.jsx` ✅ / `TradingViewChart.jsx` búsqueda solo local | §4.A.2 |
| P-04 | Widgets de TradingView **útiles** (analizar API Reference) | 🟡 | Chart + `EconomicCalendar` embed | §4.B.1 |
| P-05 | **Herramientas de dibujo** sobre el gráfico **que se guarden** | 🔴 | Embed no lo permite | §4.B.2 |
| P-06 | Distribuir mejor la **sección de Opciones** + widgets de opciones TV | 🟡 | `OptionsPage.jsx` + `components/options/` | §4.E |
| P-07 | Tipos de mercado: clic → pestaña con preguntas/respuestas/ejemplos/calculadora/tabla o widget TV | 🔴 | `EducationPage.jsx:2250` (tarjetas estáticas) | §4.D.1 |
| P-08 | En cripto: añadir "lo útil del documento" + widget TV | 🟡 | `crypto-deep` tab existe | §4.D.1 |
| P-09 | Acciones: cómo se mide (marketcap, etc.); commodities, índices, ETFs, futuros, bonos, opciones, CFDs | 🟡 | Tabs deep existen; falta **bonos** y **CFDs** como tipo | §4.D.2 |
| P-10 | **Featured snippets** de Google (ej. "criptos más grandes") en inglés | 🔴 | Sin schema FAQ/HowTo/ItemList | §4.G.2 |
| P-11 | **Calendario económico**: cuenta atrás al siguiente dato (PMI…) + **banderas** + clic → Investing | 🔴 | `EconomicCalendar.jsx` (iframe simple) | §4.C.1 |
| P-12 | Segundo widget: cuándo hablan **Trump / FED** + conferencias + personas de alto impacto | 🔴 | No existe | §4.C.2 |
| P-13 | **Noticias** arriba del panel, entre performance y precios, con fuente/hora/filtros (**estudiar**) | 🔴 | No existe | §4.C.3 |
| P-14 | Forex, commodities, CFDs, gas natural, petróleo… bien detallado | 🟡 | `forex-deep`, `commodities` tabs | §4.D.2 |
| P-15 | Lotes, pips y **todas las unidades** | 🟢 | `LotSizeCalculator.jsx`, i18n `pipValue`… | §4.D.3 |
| P-16 | **Banderas de idiomas** + info que propuse antes | 🟢 | `i18n.js:23` (flags ✅) | §4.J |
| P-17 | Verificación de idiomas/traducciones | 🟢 | 8 locales a la par (i18n-check) | §4.J |
| P-18 | Versión **app / móvil** (web móvil = app) | 🟡 | Responsive + PWA; sin nativo | §4.F.1 |
| P-19 | "**Próximamente**" + badges Google Play / App Store en portada | 🔴 | Solo teaser de features | §4.F.2 |
| P-20 | App **desktop** (Microsoft Store) + Android/Mac/iOS/Windows/Linux | 🔴 | No existe | §4.F.3 |
| P-21 | Revisar **pagos, admin, ajustes, seguridad, IP, legal, privacidad** de cabo a rabo | 🟢/🟡 | `server.py`, `admin_routes.py`, `LegalPage.jsx` | §4.I |
| P-22 | Ciclo de vida: desde registro hasta cierre/eliminación de cuenta | 🟢 | `DELETE /auth/account` (RGPD) | §4.I.4 |
| P-23 | **Journal**: revisar y mejorar | 🟡 | `TradeJournal.jsx`, `performance.py` | §4.H |
| P-24 | **Performance / reactualización**: aparecer desde 0 y actualizarse al meter datos | 🟡 | localStorage + backend parcial | §4.K |
| P-25 | Implementar lo que mencionan los docs si no está | 🔵 | ROADMAP/PENDIENTES | §5 |
| P-26 | Revisar **resoluciones / distribución del frontend** (responsive) | 🟡 | Tailwind responsive; auditar breakpoints | §4.F.1 |

---

## 3. Inventario verificado — QUÉ HAY (por área)

### 3.1 Frontend (React 19 + CRACO + Tailwind + shadcn/ui)

- **19 rutas** (`App.js`): `/`, `/dashboard` (premium), `/pricing`, `/settings`, `/education`,
  `/subscription`, `/options`, `/performance` (premium), `/admin` (admin), `/affiliate`, `/login`,
  `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/magic`, `/payment/success`,
  `/payment/cancel`, `/legal`, `/contact`, `/about`, `*` (404).
- **14 calculadoras** (`components/calculators/`): BlackScholes, Compound, Fibonacci, Futures,
  Leverage, LotSize, MonteCarlo, PartialExit, PatternTrading, Percentage, PositionSize,
  SimulatorPro, Spot, TargetPrice + `TargetMeasurementTool`.
- **~28 componentes de opciones** (`components/options/`): cadena, payoff, griegas (display/panel/
  time-chart), IV surface, IV rank, unusual activity, market flow, optimizador, Kelly, AI Trade
  Coach, comparador, posiciones guardadas, earnings banner, portfolio greeks, etc.
- **~80 componentes educativos** (`components/education/`): Ichimoku, Elliott, Wyckoff, SMC,
  Order Flow, Gann, patrones (velas/chartistas/armónicos), gestión de capital, psicología,
  sesgos, glosario, etc.
- **Dashboard**: `TradingViewChart`, `StructureScanner`, `Watchlist`, `PriceAlerts`,
  `CalculationHistory`, `JournalStats`, `EconomicCalendar`, `TradingJournal`, `PriceTicker`.
- **i18n: 8 idiomas** con **banderas** (`lib/i18n.js`): es 🇪🇸, en 🇬🇧, de 🇩🇪, fr 🇫🇷, ru 🇷🇺,
  zh 🇨🇳, ja 🇯🇵, ar 🇸🇦 (con `dir=rtl` para árabe). Carga perezosa por chunks.
- **Buscador universal** (`UniversalAssetSearch.jsx`): catálogo local (crypto/acciones/ETFs/
  índices/forex/commodities) + búsqueda backend con **debounce 200 ms**, chips de categoría,
  recientes, trending, navegación por teclado, resaltado de coincidencia. **Muy bueno ya.**
- **PWA**: `manifest.json` (standalone, theme_color, iconos, shortcuts, screenshots).
- **Tema**: claro/oscuro/sistema + **4 temas premium** (Oro/Cripto/Forex/Nasdaq).

### 3.2 Backend (FastAPI + asyncpg, shim Mongo→PostgreSQL)

- **169 rutas** registradas. Módulos: `server.py` (monolito), `admin_routes.py`, `missing_apis.py`,
  `options_math.py`, `options_optimize.py`, `stock_data.py`, `candle_patterns.py`, `price_action.py`,
  `performance.py`, `realtime_alerts.py`, `referrals.py`, `affiliate_program.py`.
- **Datos de mercado**: Yahoo Finance vía **curl_cffi (impersonate Chrome)** + CoinGecko. Caché
  de 5 min por ticker. (`stock_data.py`).
- **Auth**: JWT httpOnly cookies + refresh + Google OAuth + **2FA TOTP** (`/auth/2fa/*`) +
  magic links + reset password.
- **Pagos**: Stripe (checkout + webhooks firmados), PayPal, **OxaPay** (crypto, HMAC-SHA512),
  Revolut y NOWPayments (módulos presentes).
- **Ciclo de cuenta**: **borrado RGPD** (`DELETE /auth/account`) que cancela la suscripción Stripe
  antes de borrar; retención de datos 3 meses tras impago con purga.
- **IA**: Anthropic SDK (AI Trade Coach) en `POST /api/options/ai-analyze`.
- **Seguridad**: rate limiting (slowapi), CORS allowlist, revocación de tokens, IP con
  `x-forwarded-for` (`server.py:1456`), Docker no-root, sin secretos en repo.

### 3.3 Educación — mapa de las ~60 pestañas (para no duplicar)

- **Fundamentos**: start-here, my-setup, fundamentals, mechanics, styles, fund-analysis,
  company-valuation, broker-safety, pfof, funded-truth, evidence-based, trader-journey,
  long-invest, taxes, glossary.
- **Análisis técnico**: tech-analysis, moving-averages, chart-patterns, candlesticks, price-action,
  gann-box, dow-theory, market-structure, wyckoff, alt-charts, elliott, ichimoku,
  harmonic-patterns, smc, order-flow, session-timing, advanced-ta, demark, ehlers, rrg, pitchfork,
  bill-williams, wolfe-waves, market-profile, elder, oscillators, time-cycles, sentiment,
  intermarket, **forex-deep, commodities, crypto-deep, indices**, macro, net-liquidity,
  breadth-cycles, cot.
- **Gestión de riesgo**: risk, stops-targets, capital, partial-exits, trade-mgmt, margin-liq,
  probability, tail-risk, …
- **Psicología / sesgos / IA**: múltiples módulos (Mark Douglas, disciplina, sesgos, checklists…).

> **Consecuencia:** ya existe contenido profundo por mercado (`forex-deep`, `commodities`,
> `crypto-deep`, `indices`). El hueco (P-07) **no es de contenido, sino de UX**: las tarjetas de
> "tipos de mercado" en *Fundamentos* no enlazan ni abren esa profundidad de forma interactiva
> con preguntas + calculadora + widget.

---

## 4. Hallazgos detallados y mejoras

### Bloque A — Datos de mercado & buscadores

#### 4.A.1 · Twelve Data vs Yahoo (P-02) 🟡→🎯

**Estado actual:** `stock_data.py` obtiene datos de **Yahoo Finance** golpeando su API JSON con
`curl_cffi` impersonando Chrome (para saltar la detección de bots desde Cloud Run) + **CoinGecko**
para cripto. Funciona pero es **frágil** (Yahoo puede cambiar fingerprinting; sin SLA; sin
cobertura fiable de forex/índices EU). En sandbox web ambos están **bloqueados** (ver CLAUDE.md).

**Veredicto sobre Twelve Data:** **sí sirve y es una buena elección** como fuente primaria:
- Plan **gratis: 800 llamadas/día, 8/min**, cubre acciones (US + EU/LATAM/Asia), forex, cripto,
  índices, ETFs y **algunos** endpoints de tiempo real. WebSocket solo en planes de pago.
- Fiabilidad y normalización de símbolos muy superiores a Yahoo scraping.
- **Límite:** 800/día es poco para muchos usuarios concurrentes → **hay que cachear agresivo**
  (TTL 10–30 s en `stock_data`, idea 7.3 del ROADMAP) y agrupar peticiones (`/batch`).

**Recomendación (arquitectura de proveedor conmutable):**
1. Crear `backend/market_data.py` con una **interfaz única** `get_quote / get_ohlc / search_symbols`
   y un patrón de **cadena de proveedores** (igual que ya se hizo con `DB_PROVIDER` cloudsql/neon):
   ```
   MARKET_DATA_PROVIDER = twelvedata | yahoo | auto   (variable de repo/secreto)
   TWELVEDATA_API_KEY  en Secret Manager
   ```
2. **Orden por clase de activo** (usar lo mejor de cada uno, todos gratis):
   - **Cripto (spot):** **Binance** público (sin key, ilimitado real-time) → CoinGecko fallback.
   - **Cripto (perps/funding/OI):** **Hyperliquid / Bybit** (diferenciador, ya en PENDIENTES).
   - **Acciones/ETFs/índices/forex:** **Twelve Data** → **Yahoo** (curl_cffi) fallback.
   - **Commodities:** Twelve Data (`WTI/USD`, `XAU/USD`, `NG/USD`) → Yahoo (`CL=F`, `GC=F`) fallback.
3. **Caché TTL** (in-memory + opcional tabla `market_cache`) y **rate-limit budget** por proveedor.
4. Mantener **contrato de respuesta idéntico** al actual para no tocar el frontend.

> **Nota:** el usuario debe crear la cuenta en twelvedata.com y darnos la API key (se guarda en
> Secret Manager / panel admin). Sin key, el sistema cae automáticamente a Yahoo/Binance.

#### 4.A.2 · Buscadores con autocompletado al escribir (P-03) 🟡

- **`UniversalAssetSearch`** ✅ ya cumple: resultados al teclear, debounce, categorías, teclado.
  Se usa en calculadoras y opciones.
- **Buscador del gráfico** (`TradingViewChart.jsx:41`): 🟡 solo filtra los **47 activos locales**
  de `lib/assets.js` (no llama al backend). **Mejora:** reutilizar `universalSearchAPI` (mismo que
  el buscador universal) para que encuentre cualquier símbolo, y al elegir uno que no esté en
  `assets.js`, **añadirlo dinámicamente** al store con su `tradingviewSymbol`.
- **Unificar**: extraer un hook `useAssetSearch(query, categories)` compartido para que **todos**
  los buscadores (gráfico, calculadoras, alertas, watchlist) usen la misma lógica y cobertura.

---

### Bloque B — Gráfico TradingView

#### 4.B.1 · Widgets útiles del catálogo TradingView (P-04) 🎯

El proyecto usa 2 widgets embed: **Advanced Chart** (gráfico) y **Events** (calendario). El
catálogo gratuito de TradingView tiene más widgets **útiles** que encajan con la web:

| Widget TV | Dónde usarlo | Valor |
|---|---|---|
| **Symbol Overview / Mini chart** | Ficha de cada tipo de mercado (§4.D.1), watchlist | Sparkline + precio |
| **Ticker tape** | Barra superior del dashboard (cinta de precios) | Sensación "terminal" |
| **Technical Analysis (gauge)** | Junto al gráfico y en fichas de activo | Resumen "Compra/Venta" |
| **Crypto Coins Heatmap** | Ficha de **cripto** (P-08) + snippet "criptos más grandes" | Market cap visual |
| **Stock Heatmap (SPX500)** | Ficha de **acciones/índices** | Sectores por % |
| **Forex Heatmap / Cross Rates** | Ficha de **forex** (P-14) | Fuerza de divisas |
| **Screener** | Nueva página "Screener" (idea 1.3 ROADMAP) | Filtrado de activos |
| **Economic Calendar (events)** | Ya usado; mejorar con capa propia (§4.C.1) | Datos macro |
| **Symbol Info / Fundamental data** | Ficha de acción (marketcap, PER…) (P-09) | Datos fundamentales |
| **Options (no oficial)** | TV no ofrece widget de cadena de opciones → usar el propio | — |

**Recomendación:** crear un wrapper reutilizable `components/charts/TVWidget.jsx` que reciba
`{ type, config }` y monte el embed correcto con tema/locale/`isTransparent` coherentes (hoy cada
widget repite el `TV_LOCALE_MAP` y el manejo de tema). Reutilizable en fichas de mercado,
dashboard y opciones.

#### 4.B.2 · Dibujos y layouts guardables por usuario (P-05) 🔴 → diferenciador clave

**Hecho técnico (verificado):** el gráfico usa el **iframe `widgetembed`**, que **no expone API**
para leer/escribir indicadores ni dibujos ni guardar layouts (`TRADINGVIEW_PERSONALIZACION.md`).
Por eso **hoy es imposible** guardar dibujos con este enfoque. Ya está bien diagnosticado como
hueco **G-05**.

**Solución (Opción B del doc dedicado): migrar a TradingView Advanced Charts** (librería JS
gratuita, auto-alojada, requiere solicitar acceso en tradingview.com/advanced-charts/):

- **Frontend:** instanciar `charting_library` con un `datafeed` (UDF sobre nuestros endpoints OHLC
  ya existentes) e implementar el **`save_load_adapter`** que persiste en backend.
- **Backend (con el shim, sin SQL directo):**
  ```
  POST/GET/DELETE /api/chart/layouts        # colección db.chart_layouts {id,user_id,name,content(JSONB),updated_at}
  GET/POST        /api/chart/study-templates # plantillas de indicadores
  GET/POST        /api/chart/drawings        # dibujos por símbolo
  ```
- **Beneficio:** cada usuario configura **sus indicadores, dibuja y su análisis se guarda
  cross-device** (cierra también BUG-007 para el gráfico). Es lo que iguala a TradingView y a la
  competencia.
- **Paso intermedio barato (Opción A):** presets de indicadores seleccionables (RSI+MACD,
  Bollinger, EMAs, Ichimoku) pasados por `studies=` y persistidos por usuario. Mejora percibida
  alta, coste bajo, **mientras** se tramita el acceso a Advanced Charts.

> **Acción de negocio:** solicitar acceso a Advanced Charts (aprobación de repo por TradingView).
> Es gratis pero requiere registro; sin ese acceso, los dibujos guardables **no** son posibles.

---

### Bloque C — Dashboard inteligente (calendario, ponentes, noticias)

#### 4.C.1 · Calendario con cuenta atrás + banderas + redirección (P-11) 🔴

**Estado:** `EconomicCalendar.jsx` es un **iframe del widget de eventos** de TradingView. No hay
cuenta atrás, ni banderas por país, ni clic-para-redirigir.

**Diseño propuesto — componente nuevo `NextEventCountdown.jsx`** (encima del iframe actual):
- **Fuente de datos** (sin depender del iframe, que no expone su contenido):
  - **Trading Economics** calendar API (gratis con atribución) **o**
  - **Financial Modeling Prep** `/economic_calendar` (plan gratis) **o**
  - scrap ligero cacheado en backend `GET /api/econ-calendar?impact=high` (TTL 15 min).
- **UI:** tarjeta con el **próximo evento de alto impacto**: bandera país (emoji o SVG),
  nombre (ej. "🇺🇸 ISM PMI Manufacturero"), **cuenta atrás en vivo** (HH:MM:SS), consenso/previo,
  y un botón "Ver en Investing" (`https://es.investing.com/economic-calendar/` o deep-link).
- **"Qué puede mover":** debajo, una línea explicando el impacto típico ("PMI > 50 = expansión →
  suele fortalecer el USD y presionar bonos"). Contenido curado y traducible (i18n).
- **Banderas:** reutilizar un mapa `country → emoji` (ya hay precedente de emojis-bandera en i18n).

**Backend nuevo:**
```
GET /api/econ-calendar        # lista filtrada (impacto, país, ventana temporal), cacheada
```

#### 4.C.2 · Ponentes de alto impacto: Trump / FED / conferencias (P-12) 🔴

**Segundo widget debajo del calendario**: "**Voces que mueven el mercado**".
- **Datos:** calendario de comparecencias (Fed speakers, ECB, BoE, discursos de Trump, testimonios
  Powell, Jackson Hole, FOMC pressers). Muchas APIs de calendario económico ya etiquetan estos
  eventos como "Speech/Testimony". Complementar con una lista **curada** de recurrentes
  (FOMC 8/año, ECB, NFP, CPI) en `backend` como fallback si la API no cubre.
- **UI:** tarjetas con foto/emoji, cargo (🇺🇸 Fed – J. Powell), fecha/hora local del usuario,
  cuenta atrás, y "impacto esperado" (alto/medio). Internacional: incluir ECB (Lagarde), BoJ, BoE,
  PBoC para el público forex global (el dueño lo pidió explícitamente).
- Enlazar cada uno a su fuente (Investing / web oficial del banco central).

#### 4.C.3 · Panel de noticias (P-13) 🔴 — **ESTUDIO, no implementar aún**

El dueño pidió **estudiarlo, no aplicarlo**. Conclusión del estudio:

**Ubicación pedida:** barra superior del dashboard, **entre Performance (JournalStats) y Precios**.
En `DashboardPage.jsx` sería un bloque nuevo tras `<JournalStats />` (línea ~273) y antes de la
`calc-workstation`.

**Enfoque recomendado (el más barato y legal): "solo titulares + reenvío a la fuente".**
- **Por qué:** republicar el cuerpo de la noticia tiene problemas de **copyright**. Mostrar
  **titular + fuente + hora + enlace** es práctica estándar (Google News style) y de bajo riesgo.
- **Fuentes gratis:**
  - **RSS agregado** (Reuters, Bloomberg vía feeds públicos, Cointelegraph, Investing, Yahoo
    Finance RSS por ticker) parseado en backend `GET /api/news?symbols=&category=`.
  - **Marketaux** o **NewsData.io** (planes gratis con `source`, `published_at`, `entities`).
  - **CryptoPanic** para cripto (gratis, con votos/sentimiento).
- **UI:** lista compacta con **filtros** (Todas / Empresas / Macro / Cripto / Forex), cada item:
  `[fuente] · hace X min · titular` → abre la fuente en pestaña nueva (`rel="noopener"`). Cita la
  fuente siempre. Opcional: **tono** (positivo/negativo) vía el AI Coach o el campo `sentiment`
  de la API.
- **Backend:** `GET /api/news` con caché TTL 5 min, dedup por URL, normalización de campos.
- **Coste/riesgo:** bajo si nos limitamos a titulares+enlace. **No** almacenar cuerpos. **No**
  mostrar imágenes de terceros sin permiso (usar favicon de la fuente).

> **Decisión pendiente del dueño** antes de implementar: (a) ¿titulares+enlace [recomendado] o
> resúmenes con IA?; (b) ¿qué proveedor de noticias contratamos (Marketaux/NewsData/CryptoPanic)?

---

### Bloque D — Educación

#### 4.D.1 · Tipos de mercado interactivos (P-07, P-08) 🔴 → alta prioridad

**Estado:** en *Fundamentos* (`EducationPage.jsx:2250`), `TRADING_FUNDAMENTALS.marketTypes.items`
se renderiza como **tarjetas estáticas** (icono, nombre, descripción, volumen). Al hacer clic **no
pasa nada**. Ya existe `TopicDetailModal.jsx` reutilizable.

**Diseño propuesto — al clicar una tarjeta de mercado, abrir un panel/modal con pestañas:**

```
┌ [🪙 Criptomonedas]  ──────────────────────────────┐
│  Tabs:  Resumen · Preguntas · Ejemplo · Calcular · Datos en vivo │
├───────────────────────────────────────────────────┤
│ Resumen:   qué es, cómo se mide, unidades, horario 24/7           │
│ Preguntas: FAQ (acordeón) con schema.org (§4.G.2)                 │
│ Ejemplo:   caso numérico resuelto (ej. tamaño de posición BTC)   │
│ Calcular:  botón → /dashboard?tab=position (o el que aplique)     │
│ Datos:     widget TV Crypto Coins Heatmap / Symbol Overview       │
└───────────────────────────────────────────────────┘
```

**Contenido por mercado** (reutilizar los tabs deep ya existentes como fuente):

| Mercado | Cómo se mide / clave | Widget TV | Calculadora que enlaza |
|---|---|---|---|
| **Cripto** | Market cap = precio × circulating supply; dominancia BTC; 24/7 | Crypto Coins Heatmap | PositionSize / Spot |
| **Acciones** | Market cap = precio × acciones; PER, EPS; float; sesión bolsa | Stock Heatmap + Symbol Info | PositionSize |
| **Forex** | Pips, lotes (std/mini/micro), valor pip, apalancamiento, sesiones | Forex Heatmap / Cross Rates | **LotSize** |
| **Commodities** | Contratos, tick/punto, WTI/Brent/NatGas/oro; contango | Symbol Overview | Futures |
| **Índices** | Ponderación (cap vs precio), constituyentes, futuros del índice | Stock Heatmap | Futures |
| **ETFs** | NAV, expense ratio, subyacente, prima/descuento | Symbol Overview | PositionSize |
| **Futuros** | Multiplicador punto/tick, vencimiento, margen | Symbol Overview | **Futures** |
| **Bonos** | Precio vs yield (inverso), duración, cupón *(FALTA como tipo)* | Symbol Overview | — (crear) |
| **Opciones** | Prima, strike, griegas, IV *(enlazar a /options)* | — (cadena propia) | BlackScholes |
| **CFDs** | Sintético sobre subyacente, swap/overnight, apalancamiento *(FALTA)* | — | Leverage |

**"Lo útil del documento" (P-08, cripto):** integrar en la pestaña *Resumen/Datos* de cripto los
conceptos del contenido interno (`crypto-deep`, `CryptoVisual.jsx`): supply/emisión, halving,
on-chain, funding/OI (si integramos Hyperliquid/Bybit).

**Implementación:** los `items` de `marketTypes` pasan de `{id,icon,name,desc,volume}` a
`{..., detail:{summary, faqs:[{q,a}], example, calcTab, tvWidget}}`. Todo en i18n ×8. El modal
reutiliza `TopicDetailModal` o uno nuevo `MarketTypeModal.jsx`.

#### 4.D.2 · Cobertura Forex / Commodities / CFDs / Bonos (P-09, P-14) 🟡

- ✅ **Forex**: `forex-deep` tab + `ForexVisual.jsx`. **Commodities**: `commodities` tab +
  `CommoditiesVisual.jsx` (petróleo, gas, oro…). **Índices/Cripto**: tabs deep.
- 🔴 **Huecos de tipo de mercado**: **CFDs** y **Bonos/Renta fija** no existen como módulo propio.
  - **CFDs:** crear módulo (qué es, swap/financiación overnight, apalancamiento, riesgos, por qué
    están restringidos en algunos países, CFD vs futuro vs spot). Encaja como tab en *Fundamentos*
    y como tipo de mercado (§4.D.1).
  - **Bonos:** crear módulo (precio↔yield inverso, curva de tipos, duración, cupón, bonos como
    "riesgo cero" y su papel macro). Complementa `macro` y `net-liquidity`.
- **Gas natural / petróleo**: ya cubiertos en commodities; **enriquecer** con estacionalidad
  (inventarios EIA los miércoles, driving season, invierno), spreads WTI-Brent.

#### 4.D.3 · Lotes, pips y unidades (P-15) 🟢

✅ Cubierto: `LotSizeCalculator.jsx` calcula valor por pip, lotes estándar/mini/micro, con SL en
pips. i18n tiene `pipValue`, `standardLots`, `miniLots`, `microLots`, `stopLossPips`. **Mejora
menor:** añadir una **tabla de referencia de unidades** (1 lote = 100.000 uds; pip = 0.0001 salvo
JPY = 0.01; tick vs pip vs punto según activo) dentro de la ficha *Forex* de §4.D.1.

---

### Bloque E — Opciones: distribución + widgets (P-06) 🟡

**Estado:** `/options` monta `OptionsPage.jsx` que delega en subcomponentes (`OptionsSubHeader`,
`CalculatorPage`, cadena, payoff, griegas, optimizador, AI Coach…). Es potente pero **denso**.

**Mejoras de distribución/UX (a validar con capturas):**
1. **Arquitectura de pestañas clara** en `OptionsSubHeader`: `Cadena · Estrategia (payoff) ·
   Griegas · Optimizar · IV/Vol · AI Coach · Guardadas`. Estado en URL (`?view=`) para deep-link.
2. **Layout responsive de 2 columnas** en desktop (cadena/legs a la izquierda, payoff+griegas a la
   derecha) que colapsa a 1 columna en móvil (ver §4.F.1).
3. **Buscador de subyacente** unificado (usar `UniversalAssetSearch`, no un `SearchBar` propio).
4. **Widget TV de contexto** por subyacente (mini-chart + Technical gauge) junto a la cadena.
5. **Verificación milimétrica**: E2E con Playwright de cada vista + estados de carga/error de la
   cadena (hoy depende de datos de red bloqueados en sandbox → mockear).
6. **Onboarding** de la página (qué es cada pestaña) con el `GuideModal` existente.

> Para no romper nada, primero **auditar con capturas** el estado real de cada vista en desktop,
> tablet y móvil, y luego redistribuir. Es un rediseño de UX, no de lógica.

---

### Bloque F — App móvil, desktop y tiendas

#### 4.F.1 · Responsive / "web móvil = app" (P-18, P-26) 🟡

- La web es **responsive** (Tailwind, menú móvil en `Header`). PWA instalable (`manifest.json`
  `display: standalone`). En móvil ya se comporta como app al "Añadir a pantalla de inicio".
- **Auditar breakpoints** (pendiente, requiere capturas): tablas de cadena de opciones, panel
  admin (156 KB, muchas tablas), calculadoras con muchos campos, y el gráfico en pantallas
  pequeñas. Objetivo: **0 scroll horizontal** y toques ≥ 44 px.
- **Mejora PWA → app real:** añadir **Service Worker** (offline shell + caché de assets) y prompt
  de instalación (`beforeinstallprompt`). Hoy el `manifest` existe pero conviene confirmar el SW.

#### 4.F.2 · "Próximamente" + badges de tiendas (P-19) 🔴 → quick win

- **Estado:** hay un teaser "Coming soon" de *features* en la landing, pero **no** badges de app
  stores.
- **Acción (frontend puro):** sección "**Próximamente en tu móvil y escritorio**" en la landing
  (`LandingPage.jsx`) con los **badges oficiales**: Google Play, App Store, y (para desktop)
  Microsoft Store. Como aún no hay apps publicadas, los badges van con estado **"Próximamente"**
  (deshabilitados o con captura de email "avísame cuando salga"). Usar los assets/marcas oficiales
  respetando las guidelines de cada tienda (no alterar los badges).
- **Captura de interés:** botón "Notifícame" que guarda el email (endpoint `POST /api/waitlist`
  o reutilizar newsletter) para avisar en el lanzamiento.

#### 4.F.3 · Apps nativas: Android, iOS, Windows, macOS, Linux (P-20) 🔴

Estrategia recomendada (**máxima reutilización del código React actual**):

- **Móvil (Android + iOS):** **Capacitor** (Ionic). Envuelve la build de React tal cual, da acceso
  a APIs nativas (push, biometría) y publica en Google Play + App Store. Menos fricción que React
  Native (no reescribir UI).
- **Desktop (Windows + macOS + Linux):** **Tauri** (Rust, binarios pequeños ~3-10 MB) **o**
  Electron (más pesado pero trivial). Tauri permite publicar en **Microsoft Store** (MSIX),
  `.dmg` (Mac) y `.AppImage/.deb` (Linux). Reutiliza la misma web.
- **Arquitectura:** la app nativa carga la **misma SPA** (o build embebida) apuntando al backend
  Cloud Run. La lógica no se duplica. "La misma en web móvil y en la futura app" (como pediste) se
  cumple por diseño.
- **Orden sugerido:** 1) PWA sólida (SW) → 2) Capacitor Android → 3) Capacitor iOS → 4) Tauri
  desktop. Publicar requiere **cuentas de desarrollador** (Google Play 25 $ único, Apple 99 $/año,
  Microsoft ~19 $) — decisión del dueño.

---

### Bloque G — SEO & featured snippets

#### 4.G.1 · SEO base (P-25) 🟢

✅ Fuerte: `sitemap.xml`, `robots.txt`, `og-image`, `manifest`, hook `useSEO`, ~258 páginas
indexables multi-idioma, GA4/GTM/GSC. Ver `SEO_GUIDE.md` y skill `mejorar-seo`.

#### 4.G.2 · Featured snippets de Google (P-10) 🔴 → alto valor SEO

**Objetivo del dueño:** que al buscar "¿Cuáles son las criptomonedas más grandes?" aparezca una
respuesta directa (rich result). Google genera featured snippets a partir de **contenido bien
estructurado + datos estructurados schema.org**.

**Acciones concretas:**
1. **FAQPage schema (JSON-LD)** en las fichas de mercado (§4.D.1) y en páginas de calculadora:
   incrustar las `faqs:[{q,a}]` como `@type: FAQPage`. Google muestra el acordeón en resultados.
2. **HowTo schema** en las calculadoras ("Cómo calcular el tamaño de posición") → rich result de
   pasos.
3. **ItemList / Dataset schema** para listados ("Top 10 criptos por market cap") con datos que
   podemos poblar desde TV/CoinGecko → candidato ideal a snippet de tabla/lista.
4. **Contenido en inglés indexable** (el dueño lo pidió): generar las FAQ/listas en **inglés** como
   idioma canónico para estas queries y dejar que Google traduzca; `hreflang` ya está montado.
5. **Preguntas objetivo** (crear páginas/secciones con H2 = la pregunta exacta): "largest
   cryptocurrencies", "what is a pip", "what is leverage in trading", "how to calculate position
   size", "biggest stocks by market cap", etc.

> Reutilizar el skill `mejorar-seo` para no romper el SEO existente al añadir el JSON-LD.

---

### Bloque H — Journal & Performance (P-23) 🟡

**Estado:** `TradeJournal.jsx`, `AnalyticsDashboard.jsx`, `performance.py`, `JournalStats.jsx`,
calendario de PnL, detección de sesgos ya existen. Base muy buena.

**Mejoras (del ROADMAP, priorizadas):**
- **R-múltiplos** por operación (riesgo en "R") en journal y analytics (idea 2.1). **Alto valor.**
- **Curva de equity + drawdown** en el tiempo (idea 6.1). Quick win con datos existentes.
- **MAE/MFE** (máxima excursión adversa/favorable) por trade (idea 6.2).
- **Etiquetas/filtros** (estrategia, setup, activo, emoción) + estadística por etiqueta (6.3).
- **Import por broker** (CSV IBKR, Binance, MT4/5) (6.4) — muy pedido por traders.
- **Check-in emocional** + checklist pre-operación (3.1, 3.2) — refuerza el ángulo psicología.
- **Comparativa vs benchmark** (tu cuenta vs SPX/BTC) (6.6).
- **Futuros como instrumento propio** en el diario (multiplicador punto/tick) — ya en PENDIENTES.

---

### Bloque I — Seguridad, pagos, admin, legal, IP (P-21, P-22)

#### 4.I.1 · Seguridad 🟢 (con endurecimiento menor)
- ✅ JWT httpOnly + refresh + revocación, 2FA TOTP, rate limiting, CORS allowlist, webhooks
  firmados (Stripe/OxaPay HMAC), Docker no-root, sin secretos en repo, OWASP pass previo.
- 🟡 **Endurecer** (de PENDIENTES): sustituir los **10 `detail=str(e)`** por mensajes genéricos
  (no filtrar texto de error interno). No es fuga de datos de usuario, pero es buena práctica.
- 🟡 **Activar** en ajustes del repo: **Dependabot + CodeQL + secret scanning** (G-07).
- 🟡 **C-08**: dejar de permitir override de API keys por DB en claro → solo Secret Manager.

#### 4.I.2 · IP de clientes 🟢
- ✅ Se lee `x-forwarded-for` (`server.py:1456`) con fallback a `request.client.host`. Usado para
  rate limiting (`get_remote_address`). **Mejora:** documentar en `SECURITY.md` la política de
  retención de IPs (RGPD) y **no** loguear IPs en claro más de lo necesario.

#### 4.I.3 · Pagos 🟢 (código) / 🔴 (operación)
- ✅ Código: Stripe (checkout+webhooks), PayPal, OxaPay (crypto), Revolut, NOWPayments.
- 🔴 **Operación (no verificable desde el repo):** productos/price IDs de Stripe, webhook secret,
  OxaPay Merchant Key + sandbox, dominio, OAuth origins. Está en el **semáforo P0** de
  `ESTADO_PROYECTO §1/§6`. **Requiere acción del dueño en las consolas externas.**
- 🟡 **Normalizar el importe** de `purchase` en backend (hoy varía según la vía de pago) para
  marcar conversiones GA4 con `value` (PENDIENTES analítica).

#### 4.I.4 · Ciclo de vida de la cuenta (registro → borrado) (P-22) 🟢
- ✅ Registro + verificación email (SendGrid), login (email + Google + magic link), 2FA, reset
  password, refresh en recarga, **borrado RGPD** (`DELETE /auth/account`) que cancela Stripe antes
  de borrar, retención 3 meses tras impago + purga.
- 🟡 **Cloud Scheduler** para la purga diaria (hoy solo al arrancar) — PENDIENTES.
- 🟡 **Exportación de datos** del usuario (RGPD "derecho de portabilidad"): endpoint
  `GET /api/user/export` (JSON con trades, cálculos, ajustes). Complementa el borrado.

#### 4.I.5 · Legal y privacidad 🟢
- ✅ `LegalPage.jsx` + `legalContent/` en 8 idiomas (términos, privacidad, cookies, riesgo).
  `CookieBanner`. **Revisar** que mencione: proveedor de datos (Twelve Data/Yahoo), noticias
  (fuentes), IP/analítica, y las nuevas apps (tiendas) cuando se lancen.

#### 4.I.6 · Admin 🟢 (con deuda técnica)
- ✅ Panel completo (`AdminPage.jsx` 156 KB): métricas, usuarios, impersonación (protegida),
  audit log, feature flags, gestión de pagos.
- 🟡 **G-04 route shadowing:** ~21 endpoints de `admin_routes.py` son **código muerto** (los de
  `server.py` ganan por orden de registro). Unificar en un solo router admin para evitar confusión
  y bugs futuros.

---

### Bloque J — i18n / banderas / traducciones (P-16, P-17) 🟢

- ✅ **8 idiomas a la par** (4401 claves c/u, 0 huecos tras el backfill de 2026-07-11), con
  **banderas** ya en Header y Footer, RTL para árabe, detección de idioma del navegador.
- 🟡 **Pendiente menor (PENDIENTES):** traducir **micro-etiquetas en inglés** dentro de algunos
  diagramas SVG de Educación (no son claves i18n, están hardcodeadas en los `Visual.jsx`).
- **Regla:** todo lo nuevo de esta auditoría (fichas de mercado, noticias, calendario, badges)
  **debe** salir con las 8 traducciones y pasar `node frontend/scripts/i18n-check.js`.

---

### Bloque K — Performance & "aparecer desde 0 y actualizarse" (P-24) 🟡

**Interpretación:** el dueño quiere que los paneles (journal stats, historial, watchlist, alertas)
**empiecen vacíos/en cero** para un usuario nuevo y **se rellenen/actualicen** conforme mete datos.

**Estado:**
- ✅ El dashboard refresca precios cada 30 s (`DashboardPage.jsx:131`), `JournalStats` y
  `CalculationHistory` leen del backend, alertas por WebSocket.
- 🟡 **Preferencias y algunos estados en `localStorage`** (BUG-007): favoritos de calculadora,
  recientes, ajustes del gráfico **no sincronizan cross-device**. Un usuario nuevo en otro
  dispositivo no ve "su" estado.
- 🟡 **Estado inicial "desde 0":** verificar que **cada** panel tiene un **empty state** claro
  ("aún no tienes operaciones — añade la primera") en vez de spinners o ceros ambiguos.

**Acciones:**
1. **`PATCH /api/user/preferences`** + carga en perfil (cierra BUG-007): favoritos, recientes,
   ajustes de gráfico, idioma/tema pasan a backend. Fuente de verdad = servidor, `localStorage` =
   caché.
2. **Empty states** consistentes y bonitos en todos los widgets del dashboard/performance.
3. **Optimista + revalidación:** al crear un trade/cálculo/alerta, actualizar la UI al instante y
   revalidar contra el backend (ya parcialmente hecho).
4. **Rendimiento:** el dashboard monta 14 calculadoras + gráfico + escáner + calendario a la vez.
   Confirmar **lazy-mount** de los `TabsContent` (que no se rendericen las 14 calc a la vez) y
   `React.lazy` para el gráfico/escáner pesados.

---

## 5. Roadmap priorizado (con esfuerzo)

> S = horas · M = 1-2 días · L = 3+ días · front/back/full

### P0 — Operación (bloquea lanzamiento, lo hace el dueño en consolas)
- [ ] Verificar Stripe real (productos, price IDs, webhook), OxaPay, dominio, OAuth origins, secretos.
      *(No es código — `ESTADO_PROYECTO §6`.)*

### P1 — Máximo impacto producto (implementable en el repo)
- [ ] **Tipos de mercado interactivos** (§4.D.1) — M (front) + i18n ×8. *El ancla de "aprendizaje".*
- [ ] **Schema FAQ/HowTo/ItemList** para featured snippets (§4.G.2) — S/M (front).
- [ ] **Twelve Data** como proveedor conmutable + caché (§4.A.1) — M (back). *Requiere API key del dueño.*
- [ ] **Buscador del gráfico** con backend + auto-añadir símbolo (§4.A.2) — S (front).
- [ ] **Advanced Charts** (dibujos guardables) (§4.B.2) — L (full). *Requiere acceso TV.*
      Paso previo barato: **presets de indicadores** — S (front).
- [ ] Endurecimiento seguridad: `detail=str(e)`, Dependabot/CodeQL, C-08 (§4.I.1) — S.

### P2 — Diferenciadores
- [ ] **Calendario: cuenta atrás + banderas + redirección** (§4.C.1) — M (full).
- [ ] **Ponentes de alto impacto (Fed/Trump/BCE)** (§4.C.2) — M (full).
- [ ] **Badges de tiendas + "Próximamente App"** en landing (§4.F.2) — S (front).
- [ ] **Capacitor (Android/iOS)** + **Tauri (desktop)** (§4.F.3) — L. *Requiere cuentas de dev.*
- [ ] **Journal:** R-múltiplos, equity curve, MAE/MFE, etiquetas, import broker (§4.H) — M/L.
- [ ] **Sync de preferencias cross-device** `PATCH /user/preferences` + empty states (§4.K) — M (full).
- [ ] **Widgets TV útiles** (ticker tape, heatmaps, gauges) vía wrapper `TVWidget` (§4.B.1) — S/M.
- [ ] **Módulos nuevos: CFDs y Bonos** (§4.D.2) — M (front) + i18n.
- [ ] **Redistribución UX de Opciones** + widgets (§4.E) — M (front). *Auditar con capturas antes.*

### P2 — Estudio (decisión del dueño antes de codificar)
- [ ] **Panel de noticias** (§4.C.3) — decidir proveedor y formato (titulares+enlace recomendado).

### P3 — Deuda técnica / mantenimiento
- [ ] Unificar router admin (G-04), refactor `server.py` monolítico.
- [ ] Traducir micro-etiquetas SVG de Educación, Cloud Scheduler de purga, export RGPD.

---

## 6. Riesgos y dependencias externas (lo que necesito del dueño)

Para poder implementar sin bloqueos, se necesitan **decisiones/accesos** del dueño:

1. **API keys de datos:** cuenta + key de **Twelve Data** (y opcional Marketaux/NewsData/CryptoPanic
   para noticias). Se guardan en Secret Manager / panel admin.
2. **Acceso a TradingView Advanced Charts** (solicitud de repo, gratis) para dibujos guardables.
3. **Cuentas de desarrollador** de tiendas si se quieren apps nativas (Google/Apple/Microsoft).
4. **Decisión de noticias** (§4.C.3): formato y proveedor.
5. **Verificación de operación** (Stripe/OxaPay/DNS/OAuth) en las consolas externas (P0).

---

## 7. Entrada para `ESTADO_PROYECTO.md` (registro de sesión)

```
### 2026-08-01 — Auditoría integral 100% (documento, sin cambios de código todavía)
- Auditados frontend (19 páginas, ~200 componentes), backend (169 rutas) y 20+ docs.
- Creado docs/AUDITORIA_INTEGRAL_2026-08-01.md con: inventario verificado, matriz de
  trazabilidad de las 26 peticiones del dueño, hallazgos detallados por bloque (datos/APIs,
  TradingView, dashboard inteligente, educación, opciones, app móvil/desktop, SEO, journal,
  seguridad, i18n, performance) y roadmap P0-P3.
- Hallazgos clave: (1) gráfico usa embed → sin dibujos guardables (necesita Advanced Charts);
  (2) tipos de mercado en Educación son estáticos → falta la pestaña interactiva pedida;
  (3) sin cuenta atrás/banderas en calendario ni panel de ponentes ni noticias; (4) sin badges
  de tiendas ni apps nativas; (5) Twelve Data solo pendiente, no integrado; (6) seguridad y
  ciclo de cuenta muy sólidos, con endurecimiento menor pendiente.
- Próximos pasos recomendados (P1): tipos de mercado interactivos, schema FAQ para snippets,
  Twelve Data conmutable, buscador del gráfico con backend, presets de indicadores.
```

---

> **Conclusión:** la web ya está en un nivel muy alto y profesional. El salto a **TOP-1** no
> depende de "arreglar" lo existente (que es sólido), sino de **cerrar 3 huecos de experiencia**
> — dibujos guardables (Advanced Charts), aprendizaje interactivo por tipo de mercado, y
> dashboard "inteligente" (cuenta atrás macro + voces + noticias) — más **datos fiables**
> (Twelve Data) y **presencia multiplataforma** (PWA→apps + badges). Todo está especificado arriba
> para ejecutarlo por tandas, sin ambigüedad y sin romper lo que funciona.
