# 🔬 EXAMEN FINAL 100% — TradingCalculator.Pro

> **Auditoría integral punto por punto**: qué hay hoy (verificado contra el código, no contra la
> documentación), qué falla, qué falta y qué hay que cambiar — con el detalle suficiente para que
> no haya malentendidos ni fallos al implementarlo.
>
> - 📅 **Fecha:** 2026-07-26 · 🌿 **Rama:** `claude/trading-web-analysis-ktsvkd`
> - 📎 **Entradas de esta auditoría:** el repo completo + 4 PDF aportados por el propietario
>   (libro de órdenes de opciones · apertura/cierre de posiciones de opciones · rollover en
>   derivados · 100 reglas de trading) + investigación externa (proveedores de datos, widgets de
>   TradingView, tiendas de aplicaciones).
> - 🔗 Documentos hermanos: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) ·
>   [`ANALISIS_COMPETENCIA_2026-07-19.md`](./ANALISIS_COMPETENCIA_2026-07-19.md) ·
>   [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md) ·
>   [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · [`DIARIO_BUGS.md`](../DIARIO_BUGS.md)

---

## 0. Cómo leer este documento

| Prefijo | Significado |
|---|---|
| **F-xx** | **Fallo / riesgo** encontrado en el código actual. Tiene severidad. |
| **M-xx** | **Mejora** propuesta. Tiene impacto y esfuerzo. |
| **C-xx** | **Contenido** que falta (educativo/informativo). |

Severidad: 🔴 crítico (rompe o pierde dinero) · 🟠 alto · 🟡 medio · 🟢 bajo/cosmético.
Estado: ✅ implementado en esta sesión · 🚧 en curso · ⏳ propuesto (no tocado) · 🧊 descartado (con motivo).

**Regla que se ha seguido:** nada se marca como “existe” sin haberlo leído en el código. Cuando la
documentación previa decía algo distinto del código, manda el código y se anota la discrepancia.

---

## 1. Resumen ejecutivo

### 1.1 Veredicto

El proyecto **no es un prototipo**: son ~14.000 líneas de backend Python, ~20.000 de páginas y
componentes React, 68 módulos de academia en 8 idiomas, 5 pasarelas de pago, panel de administración
completo, programa de afiliados operativo y 178 rutas de API. En términos de *superficie de producto*
está por encima de casi toda la competencia directa.

**Lo que le separa del “TOP 1” no es cantidad de funciones. Son cinco cosas concretas:**

1. **Los datos.** Todo el precio en vivo depende de *scraping* de Yahoo Finance (`stock_data.py` usa
   `curl_cffi` con impersonación de Chrome porque Yahoo bloquea los datacenters). Es frágil por
   diseño: el día que Yahoo cambie el bloqueo, la web se queda sin precios y sin cadena de opciones.
   **No hay proveedor de respaldo.** → §4.1
2. **La profundidad se ve, pero no se toca.** Hay muchísimo contenido excelente, pero está en
   tarjetas estáticas. El usuario pide —con razón— que al clicar se abra algo **interactivo**:
   pregunta/respuesta, ejemplo numérico, calculadora y datos reales. → §4.3
3. **No hay “app”.** Hay un `manifest.json` pero **no hay service worker**, así que la PWA no es
   instalable de verdad ni funciona offline. Y no hay ninguna ruta hacia Google Play / App Store /
   Microsoft Store. → §4.8
4. **Un fallo de disponibilidad silencioso en producción.** El *rate limiting* está mal
   identificado detrás del proxy de Cloud Run: **todos los usuarios del mundo comparten el mismo
   cubo**. Con `3 registros/hora` eso significa que el cuarto cliente del mundo que intente
   registrarse en una hora recibe un 429. → F-01
5. **El dominio.** Sigue sirviéndose desde `github.io`. Es la palanca nº1 de SEO y ya estaba
   señalada en sesiones anteriores; sigue abierta.

### 1.2 Las 12 palancas por orden de retorno

| # | Palanca | Ref | Estado |
|---|---|---|---|
| 1 | Arreglar el rate limiting por IP real (pérdida de altas) | F-01 | ✅ |
| 2 | Arquitectura multi-proveedor de datos con failover + caché | M-01 | ⏳ diseñado |
| 3 | Tipos de mercado interactivos (Q&A + ejemplo + calculadora + widget) | M-10 | ✅ |
| 4 | Librería de widgets de TradingView (los útiles, no todos) | M-06 | ✅ |
| 5 | PWA instalable real + insignias “Próximamente” de tiendas | M-30 | ✅ |
| 6 | Contenido de opciones de los PDFs (prima, BTO/STO, rollover) | C-01..C-03 | ✅ |
| 7 | Cuenta atrás del próximo dato macro + ponentes de alto impacto | M-20 | ✅ |
| 8 | Noticias en la cabecera (diseño decidido, sin implementar aún) | M-22 | ⏳ estudiado |
| 9 | Dominio propio | (ops) | ⏳ |
| 10 | Import CSV de operaciones al diario | M-25 | ⏳ |
| 11 | Guardar dibujos/layouts de TradingView por usuario | M-08 | ⏳ límite técnico documentado |
| 12 | Tokenomics de cripto (FDV/dilución) — del PDF de 100 reglas | C-04 | ✅ |

---

## 2. Inventario verificado — lo que YA existe

> Esta sección es el “antes”. Si algo no está aquí, es que no está en el código.

### 2.1 Frontend (React 19 + CRACO + Tailwind + shadcn/ui)

**Páginas (20 rutas en `App.js`):** Landing, Dashboard (muro premium), Pricing, Settings, Education,
Subscription, Options (muro premium), Performance (muro premium), Admin (muro admin), Affiliate,
Login, Register, Forgot/Reset password, Verify-email, Magic-link, Payment success/cancel, Legal,
Contact, About, 404.

**Calculadoras (14 en `components/calculators/`):** BlackScholes, Compound, Fibonacci, Futures,
Leverage, LotSize, MonteCarlo, PartialExit, PatternTrading, Percentage, PositionSize, SimulatorPro,
Spot, TargetPrice (+ subcarpeta `simulator/`). En el dashboard están agrupadas en 4 familias
(riesgo, precio, técnico, simulación) con navegación de dos niveles.

**Opciones (28 componentes en `components/options/`):** cadena de opciones, payoff, griegas
(display/panel/evolución temporal), superficie de IV, IV rank, actividad inusual, flujo de mercado,
optimizador de estrategias, Kelly, AI Trade Coach, comparador, posiciones guardadas, editor de patas
multi-leg, banner de resultados, barra de KPIs, guía modal, pestaña de academia.

**Educación (76 componentes en `components/education/`):** 68 módulos temáticos, 42 patrones
chartistas dibujados en SVG por código, 11 armónicos XABCD, ~28 velas japonesas, detector de patrones
en vivo, glosario, quiz, constructor de setups, calculadoras de riesgo de ruina / expectativa /
gestión de capital, protocolo pre-operación.

**Gráficos:** `TradingViewChart.jsx` (iframe del *Advanced Chart*, 186 activos en 6 categorías,
buscador instantáneo transversal, favoritos, 9 temporalidades, tema y locale sincronizados) y
`StructureScanner.jsx` (escáner de estructura de mercado propio).

**Dashboard:** Watchlist con precios en vivo, alertas de precio (WebSocket), historial de cálculos,
estadísticas del diario, calendario económico (widget de TradingView), ticker de precios.

**Otros:** i18n en 8 idiomas con carga perezosa por chunks (**5.077+ claves con paridad exacta**),
6 temas visuales (claro/oscuro + oro/cripto/forex/nasdaq), banner de cookies, onboarding, error
boundary, tracker de analítica con consentimiento.

### 2.2 Backend (FastAPI + asyncpg sobre shim Mongo→PostgreSQL)

| Módulo | Líneas | Responsabilidad |
|---|--:|---|
| `server.py` | 6.963 | Monolito: shim de BD, auth, pagos, la mayoría de rutas, startup |
| `admin_routes.py` | 1.143 | Panel admin |
| `missing_apis.py` | 1.154 | Forex real, índices, materias primas, reset de contraseña, magic links |
| `affiliate_program.py` | 859 | Afiliados: alta, liquidación por bloques, payouts |
| `performance.py` | 694 | PnL, analítica del diario, sesgos de comportamiento |
| `stock_data.py` | 597 | Datos de mercado (Yahoo vía `curl_cffi`, CoinGecko) |
| `options_math.py` | 462 | Black-Scholes, griegas, payoff |
| `candle_patterns.py` | 459 | Patrones de velas |
| `options_optimize.py` | 395 | Optimizador de estrategias |
| `referrals.py` | 373 | Referidos |
| `realtime_alerts.py` | 366 | Poller de alertas |
| `price_action.py` | 302 | Swings, BOS/CHoCH, S/R, FVG |
| `nowpayments.py` / `revolut.py` | 181 / 215 | Pasarelas |

**Total: 178 rutas registradas.**

### 2.3 Pagos, seguridad y operación

- **Pasarelas:** Stripe (checkout + webhooks de ciclo de vida completo), PayPal, NOWPayments
  (cripto, IPN HMAC-SHA512), Revolut Pay (HMAC-SHA256). Todas con reclamo atómico idempotente vía
  `find_one_and_update`.
- **Auth:** JWT en cookies httpOnly (`samesite=none; secure`) + Google OAuth + magic links + 2FA
  (`TwoFactorCard.jsx`). Token en memoria (Zustand), refresh silencioso.
- **Cabeceras de seguridad:** `SecurityHeadersMiddleware` con `X-Frame-Options: DENY`, CSP y HSTS.
- **Muro de pago duro:** dependencia `require_premium` en 12 endpoints + `ProtectedRoute premiumOnly`.
- **Retención de datos:** `premium_lapsed_at` + purga automática a los 90 días (configurable) que
  borra datos de trading pero conserva la cuenta.
- **Borrado de cuenta:** `DELETE /api/auth/account` existe.
- **Rate limiting:** slowapi con límites por endpoint (registro 3/h, login 10/min, Google 10/min,
  refresh 30/min). ⚠️ Ver **F-01**.
- **Auditoría admin:** `log_admin_action` con IP correcta (`_client_ip` respeta `X-Forwarded-For`).
- **Legal:** privacidad, términos, cookies y advertencia de riesgo, en los 8 idiomas, con cifras
  citadas (ESMA 74-89%, estudio Brasil 97%, Barber & Odean).

### 2.4 SEO

- 664 URLs en el sitemap: 560 páginas de educación (68 temas × 8 idiomas) + 96 de calculadoras
  (12 × 8) + páginas públicas, todas generadas estáticamente en `postbuild` con
  `scripts/gen-seo-pages.js` (HTML real, sin depender de que Google ejecute JS).
- `hreflang` completo entre los 8 idiomas + `x-default`, `dir="rtl"` en árabe.
- JSON-LD: Organization, WebSite, WebApplication, Course, FAQPage, BreadcrumbList,
  SoftwareApplication, LearningResource.
- `useSEO` con soporte de `noindex` para páginas privadas.

### 2.5 CI/CD y documentación

- `ci.yml` (PR: compile + tests + build), `deploy-gh-pages.yml`, `deploy-cloud-run.yml`,
  `cloudbuild.yaml`. Auth GCP por Workload Identity Federation.
- 21 documentos en `docs/` + `CLAUDE.md` + `DIARIO_BUGS.md` + 3 skills
  (`estado-proyecto`, `mejorar-seo`, `verify`).
- Tests: 124 unitarios offline + ~148 de integración contra backend vivo.

---

## 3. Fallos y riesgos encontrados

### F-01 🔴 El rate limiting no identifica al usuario real detrás de Cloud Run — ✅ CORREGIDO

**Qué pasa.** `server.py:1119` crea el limitador con
`Limiter(key_func=get_remote_address, ...)`. `get_remote_address` de slowapi devuelve
`request.client.host`. En Cloud Run, `request.client.host` es **la IP del frontend de Google**, no la
del cliente, porque:

- el `Dockerfile:49` arranca `uvicorn` **sin** `--forwarded-allow-ips`, y
- el valor por defecto de uvicorn para `forwarded_allow_ips` es `127.0.0.1`, que **no** coincide con
  el peer real en Cloud Run → uvicorn **descarta** `X-Forwarded-For`.

**Consecuencia real (no teórica):**

| Endpoint | Límite | Efecto en producción |
|---|---|---|
| `POST /auth/register` | 3/hora | **El 4º registro del mundo en una hora recibe 429.** Pérdida directa de altas y de ingresos. |
| `POST /auth/login` | 10/minuto | Con 10 logins/min en toda la web, el resto de clientes no puede entrar. |
| `POST /auth/google` | 10/minuto | Idem para OAuth. |
| `POST /auth/refresh` | 30/minuto | Sesiones cayéndose en masa al refrescar. |
| `POST /analytics/track` | 240/minuto | Analítica truncada. |

Que el código **ya sepa** leer `X-Forwarded-For` correctamente en `_client_ip` (línea 1453) pero
solo lo use para el log de auditoría del admin confirma que es un descuido, no una decisión.

**Corrección aplicada.** Nueva `key_func` `_rate_limit_key` que:
1. lee `X-Forwarded-For`,
2. toma la entrada **contando desde la derecha** según `TRUSTED_PROXY_HOPS` (por defecto `1`, que es
   lo correcto para Cloud Run directo) — así **no es falsificable** anteponiendo IPs falsas, que es
   el error clásico de coger `parts[0]`,
3. cae a `request.client.host` si no hay cabecera.
`_client_ip` pasa a usar la misma lógica, de modo que el log de auditoría del admin también deja de
ser falsificable. Configurable por entorno: si algún día se mete un balanceador HTTPS delante,
basta `TRUSTED_PROXY_HOPS=2`.

### F-02 🟠 La PWA no es instalable — ✅ CORREGIDO

`public/manifest.json` existe y está bien, pero **no había ningún service worker registrado**. Sin
service worker, Chrome/Edge no ofrecen “Instalar aplicación” y no hay comportamiento offline. La
web era una PWA solo de nombre. → Corregido en **M-30**.

### F-03 🟡 Banderas de idioma en emoji: invisibles en Windows — ✅ CORREGIDO

`lib/i18n.js` define las 8 banderas como emoji (`🇪🇸`, `🇬🇧`…). **Windows no tiene glifos de
banderas**: en Chrome/Edge sobre Windows (≈70% del tráfico de escritorio de una web financiera) el
usuario ve las letras `ES`, `GB`, `DE`… en vez de una bandera. Corregido con banderas SVG inline
(componente `FlagIcon`), que además se ven idénticas en todos los sistemas.

### F-04 🟡 Reclamo falso en el JSON-LD de FAQ de la portada — ✅ CORREGIDO

`public/index.html` afirma en el `FAQPage`: *“Más de 250 activos”*. El catálogo real es de **186
activos curados** en `lib/assets.js` (+ búsqueda remota ilimitada). Ya se corrigió una vez el mismo
error en la landing (sesión 2026-06-27) pero **quedó en el JSON-LD**, que es justo lo que Google lee
para los rich snippets. Corregido a la cifra real y reformulado para reflejar que la búsqueda remota
sí es ilimitada.

### F-05 🟡 El precio en el FAQ estructurado no coincide con el precio real

El mismo bloque JSON-LD dice **“$17/mes”** mientras la página de precios cobra **17 €**. Google
puede mostrar el precio en dólares en el snippet. Corregido a `17 €/mes`.

### F-06 🟠 Dependencia de proveedor único de datos (sin failover)

`stock_data.py` documenta en su propia cabecera: *“…es por lo que yfinance falla desde Cloud Run
('possibly delisted; no price data')”*. La solución adoptada fue llamar a la API pública de Yahoo con
`curl_cffi` impersonando Chrome. Funciona, pero:

- es una carrera armamentística contra el anti-bot de Yahoo,
- no hay contrato ni SLA,
- **si cae, caen a la vez**: precios, watchlist, alertas, cadena de opciones, IV rank, actividad
  inusual, escáner de estructura y las calculadoras alimentadas con precio en vivo.

→ Arquitectura de solución en **M-01**. No implementado en esta sesión (requiere dar de alta claves
en proveedores externos, que es una acción del propietario).

### F-07 🟡 21 endpoints admin sombreados (código muerto) — sigue abierto (G-04)

Ya estaba documentado. Los endpoints de `admin_routes.py` que duplican rutas de `server.py` nunca se
ejecutan porque gana el orden de registro. Riesgo: alguien corrige un bug en el fichero equivocado y
cree que lo ha arreglado.

### F-08 🟢 `backend_test_security.py` y `backend_test.py` en la raíz siguen siendo trampas

Ya está en `CLAUDE.md`, pero siguen ahí: 75 KB de tests obsoletos que apuntan a MongoDB y a puertos
que ya no existen. Propuesta: moverlos a `_archive/` o borrarlos.

---

## 4. Mejoras por área — punto por punto

### 4.1 Datos de mercado y APIs

#### M-01 ⏳ Arquitectura multi-proveedor con failover (la decisión más importante del proyecto)

**Sobre Twelve Data, que es lo que preguntabas concretamente:**

| | Twelve Data (plan gratis) |
|---|---|
| Peticiones | **8 por minuto · 800 por día** |
| Cobertura | Acciones de EE. UU., forex y cripto (los mercados globales son de pago) |
| WebSocket | 8 créditos de prueba |
| Latencia | El plan gratis no es tiempo real de verdad en todos los mercados |

**Veredicto honesto: el plan gratuito de Twelve Data NO puede ser el proveedor principal de esta
web.** 800 peticiones/día se agotan con ~30 usuarios activos mirando una watchlist. Sí sirve como
**respaldo** o para datos que se cachean muy agresivamente (cierres diarios, fundamentales).

**Lo que sí recomiendo, por orden:**

| Proveedor | Plan gratis | Para qué usarlo aquí |
|---|---|---|
| **Finnhub** | **60 llamadas/minuto** + WebSocket gratis + **API de noticias con sentimiento** | **El mejor candidato como respaldo principal.** 60/min es ~7× lo que da Twelve Data por minuto y encima resuelve el módulo de noticias (§4.6). |
| **CoinGecko** | Ya en uso | Sigue siendo el mejor para cripto (market cap, oferta circulante, FDV — justo lo que pide el PDF). |
| **Twelve Data** | 800/día | Tercer nivel / fundamentales cacheados. |
| **Yahoo (`curl_cffi`)** | Sin límite formal, sin garantías | Mantener como primario mientras funcione: es el que da cadena de opciones. |
| **exchangerate.host / Frankfurter** | Gratis, sin clave | Divisas de referencia (no intradía). |

**Diseño concreto propuesto** (`backend/market_data.py`, nuevo):

```
get_quote(symbol) →
  1. caché en memoria (TTL 15 s para intradía, 12 h para fundamentales)
  2. proveedor primario   (Yahoo)          — si 200 y precio > 0 → devolver
  3. proveedor secundario (Finnhub)        — si el primario falla o devuelve 0
  4. proveedor terciario  (Twelve Data)    — último recurso
  5. último valor bueno conocido + campo `stale: true` + `as_of`
```

Puntos que NO hay que olvidar al implementarlo:
- Las claves van a **Secret Manager**, nunca a la BD (cierra también C-08 del backlog viejo).
- Cada proveedor con su propio *circuit breaker*: 5 fallos seguidos → 5 minutos fuera.
- El frontend debe **mostrar** cuándo un precio es `stale` (una web financiera que enseña un precio
  viejo sin avisar es un problema legal, no solo de UX).
- Métrica por proveedor en el panel admin (llamadas, fallos, % de failover).

#### M-02 ⏳ Cachear en PostgreSQL, no solo en memoria
Con `min-instances=1` y 2 workers, cada worker tiene su caché. Una tabla `market_cache` por el shim
(`_key = symbol`) evita el doble de llamadas y sobrevive a los reinicios.

#### M-03 ⏳ Presupuesto de llamadas visible en admin
Contador diario por proveedor con aviso al 80% del cupo.

### 4.2 TradingView

#### M-06 ✅ Librería de widgets reutilizable

**Lo que había:** exactamente **dos** integraciones — el *Advanced Chart* (iframe manual) y el
calendario económico (iframe manual). Nada más. Cada una repetía a mano el mapeo de locale y de tema.

**Lo que se ha hecho:** componente `TVWidget.jsx` que carga el script oficial
(`s3.tradingview.com/external-embedding/embed-widget-<tipo>.js`), sincroniza tema y locale con la
app, hace *lazy mount* con `IntersectionObserver` (no penaliza el LCP) y se limpia al desmontar.
Sobre él, componentes con nombre para los widgets **útiles** (se han descartado los decorativos):

| Widget | Dónde se usa | Por qué es útil aquí |
|---|---|---|
| `crypto-mkt-screener` | Tipos de mercado → Cripto | Da precio, **capitalización** y volumen: es literalmente la tabla que pedías |
| `screener` (acciones) | Tipos de mercado → Acciones/ETFs | Ratios fundamentales, no solo precio |
| `forex-cross-rates` | Tipos de mercado → Forex | Matriz de cruces: enseña de un vistazo qué es un par |
| `market-overview` | Tipos de mercado → Índices/Materias/Bonos | Multi-pestaña con mini-gráficos |
| `crypto-coins-heatmap` | Tipos de mercado → Cripto | Mapa por capitalización |
| `stock-heatmap` | Tipos de mercado → Acciones | Mapa del S&P 500 por sector |
| `symbol-info` + `symbol-overview` | Modales de activo | Ficha del activo |
| `technical-analysis` | Opciones / mercados | Medidor de consenso técnico |
| `ticker-tape` | Cabecera del dashboard | Cinta de precios global |
| `events` | Dashboard | Ya existía; ahora pasa por el mismo componente |

**Descartados a propósito:** *mini-chart* (redundante con `symbol-overview`), *single-quote* (poco
valor por píxel), *top-stories* (ver §4.6: la fuente de noticias debe ser propia y citable).

#### M-07 ✅ Todos los widgets con tema y locale de la app
Ya lo hacían el chart y el calendario; ahora es una sola función compartida (`resolveMode` +
`TV_LOCALE_MAP` centralizados) y no puede volver a divergir.

#### M-08 ⏳ Guardar dibujos y layouts del usuario — **límite técnico, hay que decidir**

Esto lo pediste explícitamente, así que conviene ser muy claro:

- El widget **gratuito** *Advanced Chart* (el que usa la web) **no expone API de guardado**. Los
  dibujos viven dentro del iframe de TradingView y se pierden al recargar. No hay truco: no es una
  limitación del código, es de la licencia del widget.
- Guardar dibujos por usuario **exige la biblioteca `charting_library` / `trading_terminal`**, que
  TradingView cede **gratis pero bajo solicitud y firma** (formulario en su web, entrega por GitHub
  privado). Con ella sí existen `save_load_adapter`, `saveChartToServer`, `loadChartFromServer`, y
  los dibujos se persisten donde tú digas.
- **Coste de integración:** hay que servir la biblioteca desde el propio dominio y **exponer un
  feed de datos propio** (`UDF` o `JS API`) — es decir, tu backend tendría que servir OHLC. Con la
  arquitectura de M-01 esto pasa de imposible a razonable.

**Recomendación:** solicitar hoy la `charting_library` (es gratis y tarda días en llegar) y
planificarlo como una fase propia *después* de M-01. Mientras tanto, ya se guardan por usuario el
activo, la temporalidad, los favoritos y el estado del panel — que es lo que se puede guardar sin la
biblioteca. Detalle completo en [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md).

### 4.3 Fundamentos → Tipos de Mercado (lo que pediste con más detalle)

#### M-10 ✅ De 10 tarjetas muertas a 10 fichas interactivas

**Lo que había:** en `EducationPage.jsx` (línea ~2262) las 10 tarjetas de tipos de mercado
(forex, acciones, cripto, materias primas, índices, ETFs, futuros, bonos, opciones, CFDs) eran
`<Card>` **sin `onClick`**: icono, nombre, dos líneas de descripción y una etiqueta de volumen. No
se podía hacer nada con ellas.

**Lo que hay ahora** — al clicar cualquiera se abre una ficha a pantalla completa con **6 bloques**:

1. **Qué es** — definición operativa, no de diccionario.
2. **Cómo se mide** — la parte que faltaba en toda la web. Por mercado:
   - *Forex*: pip, pipette, lote estándar/mini/micro, valor del pip, nocional, swap.
   - *Acciones*: capitalización, free float, BPA, PER, volumen, ampliaciones.
   - *Cripto*: **precio, capitalización, oferta circulante vs total, FDV y dilución** (§C-04).
   - *Materias primas*: tamaño de contrato (1.000 barriles de WTI, 100 oz de oro, 10.000 MMBtu de
     gas natural), tick y valor del tick, contango/backwardation.
   - *Índices*: ponderación (capitalización vs precio), divisor, valor del punto.
   - *ETFs*: NAV, prima/descuento, TER, tracking error.
   - *Futuros*: nocional, margen inicial vs de mantenimiento, vencimiento, rollover.
   - *Bonos*: cupón, TIR, duración, puntos básicos, relación precio↔tipo.
   - *Opciones*: prima, multiplicador ×100, strike, IV, griegas.
   - *CFDs*: nocional, margen, spread, **coste de financiación nocturna** y por qué el 74-89% pierde.
3. **Ejemplo numérico resuelto** — con números concretos, no “imagina que…”.
4. **Calculadora en vivo** enlazada al mercado (valor del pip para forex, dilución para cripto,
   valor del tick para materias primas/futuros…).
5. **Datos reales** — el widget de TradingView correspondiente (§M-06).
6. **Preguntas y respuestas** — 4-6 por mercado, escritas como se pregunta en Google.

#### M-11 ✅ Rich results de Google en inglés

Pediste que preguntas como *“¿Cuáles son las criptomonedas más grandes?”* salgan respondidas
directamente en Google. Cómo se consigue de verdad (y qué no funciona):

- **Lo que NO funciona:** copiar la tabla de TradingView. El contenido dentro de un `<iframe>` de
  terceros **Google no lo atribuye a tu dominio**, y marcar como `FAQPage` datos que no están en tu
  HTML es motivo de acción manual.
- **Lo que sí funciona:** las preguntas y respuestas **en tu propio HTML estático**, marcadas con
  `FAQPage`, en **inglés** (como pediste: el mercado en inglés es 10× mayor y Google traduce el
  snippet al idioma del usuario automáticamente).
- Implementación: `scripts/gen-seo-pages.js` genera ahora **`/markets/<tipo>/`** por idioma, con la
  Q&A en el HTML, `FAQPage` + `BreadcrumbList` en JSON-LD, y el widget de TradingView **debajo** como
  complemento visual (no como fuente de la respuesta). Nuevas URLs en el sitemap.
- ⚠️ **Aviso honesto sobre expectativas:** los *rich results* de FAQ los muestra Google hoy sobre
  todo a sitios con autoridad reconocida. El marcado es condición necesaria pero no suficiente: la
  otra mitad es el **dominio propio** y los enlaces entrantes. Nadie puede garantizar el snippet.

### 4.4 Opciones

#### M-15 ✅ Redistribución de la sección (era lo que peor escalaba)

**Lo que había:** `OptionsSubHeader` mete en **una sola fila** el buscador, el precio en vivo, el
cambio, el sector, el IV rank, **7 pestañas** y el indicador LIVE. En pantallas de ≤1280 px la fila
se desborda y se navega con scroll horizontal — funciona, pero es exactamente lo contrario de
“fácil de usar”. En móvil es peor.

**Lo que se ha hecho:**
- Las 7 pestañas se agrupan en **3 familias** con sentido para el usuario:
  **Operar** (Calculadora · Optimizador) · **Analizar** (Cadena · Superficie IV · Flujo) ·
  **Aprender** (Black-Scholes · Academia).
- En ≥1024 px se ven las familias con sus pestañas; en móvil, un selector desplegable con la
  pestaña actual, que ocupa una línea en vez de siete.
- La ficha del activo (precio/cambio/sector/IV rank) baja a su propia línea, con tipografía
  tabular para que no “baile” al actualizarse.

#### C-01 ✅ Cómo se forma el precio de la prima (PDF “libro de órdenes”)

**No existía en toda la web** (comprobado: 0 coincidencias de “market maker” en el contexto de
opciones, ninguna explicación de cómo se llega al precio que ves). Ahora es un bloque nuevo en la
academia de opciones con lo del PDF y su estructura:

- Mercados organizados **con order book real** (bids/asks por strike y vencimiento, profundidad,
  top of book) frente a **brokers OTC / market maker** que internalizan el flujo y te muestran un
  precio derivado de su modelo.
- La prima = **valor teórico** (subyacente, strike, tiempo, IV, tipos, dividendos)
  **+ oferta y demanda real + spread del creador de mercado**.
- Cómo entra el subyacente: delta como tasa de cambio de la prima; el flujo
  *subyacente → valor teórico → libro/modelo → precio en pantalla*.
- **Apalancamiento nocional vs efectivo**: el ejemplo del PDF resuelto —subyacente 100 €, contrato
  de 100 acciones = 10.000 € nocionales, prima 2 €/acción = 200 € → **50×** nocional; ajustado por
  delta 0.5 → **25×** efectivo. Con la advertencia de que las OTM baratas tienen más apalancamiento
  nocional y menos delta.

#### C-02 ✅ Abrir y cerrar posiciones: BTO / STO / BTC / STC (PDF “apertura y cierre”)

**Tampoco existía** (0 coincidencias de “sell to open” / “buy to open” en los 8 idiomas). Es una
laguna grave: es lo primero que ve alguien en la plataforma de su bróker y es donde se cometen los
errores caros (cerrar creyendo que abres y quedarte corto de opciones sin querer).

Añadido: las 4 acciones con su signo de caja (débito/crédito) y su obligación, cómo se lee la cadena
(clicar en *ask* compra, en *bid* vende), las 3 formas de cerrar (STC, BTC, dejar expirar con
liquidación ITM/OTM), el cierre parcial, y la lista de comprobación de riesgos (liquidez, horquilla,
horario, asignación temprana).

#### C-03 ✅ Rollover y rolling (PDF “rollover en derivados”)

Estado previo: la palabra aparecía **de pasada** en 2 sitios (una descripción de futuros y un término
del glosario). Sin explicación propia. Ahora es un bloque completo:

- Rollover en **futuros** (cerrar el vencimiento cercano y abrir el siguiente) vs **rolling** en
  **opciones** (que además cambia strike, delta, theta y perfil de payoff).
- **Roll out / roll up / roll down / roll out-and-up-or-down** con cuándo se usa cada uno.
- **Cuándo**: migración de volumen e interés abierto al siguiente contrato; unos días antes del
  vencimiento; theta acelerándose; strike ya ineficiente.
- **Coste real del roll**: diferencial entre contratos, **contango vs backwardation** (con la
  consecuencia clave: *puedes acertar la dirección y aun así perder por el roll*), débito/crédito
  neto, comisiones, slippage y horquillas.
- **Errores comunes**: rolar tarde, no comprobar liquidez del nuevo strike, ejecutar una pata y
  dejar la otra, y —el más importante— **creer que rolar elimina una pérdida cuando solo la
  desplaza**.

#### M-16 ⏳ Calculadora de roll (propuesta, no implementada)
Entrada: posición actual (strike, vencimiento, prima, delta, IV) + candidata nueva → salida:
débito/crédito neto, cambio de theta y delta, breakeven nuevo y días comprados por euro. Encaja como
pestaña dentro de Opciones → Operar.

### 4.5 Diario de operaciones (journal)

#### Lo que ya hay (revisado a fondo)
CRUD de operaciones con **spot y opciones** (call/put, strike, vencimiento, multiplicador), import/export,
analítica con curva de equity, calendario de PnL mensual estilo TradeZella, R-múltiplos, expectativa,
detección de **sesgos de comportamiento** (efecto disposición, revenge trading, overtrading, falta de
stop) y botón “usar mis datos del diario” que alimenta Risk of Ruin y Kelly con las cifras reales.

**Esto ya es mejor que la mayoría de journals gratuitos.** Los huecos reales son tres:

#### M-25 ⏳ Import automático desde bróker/CSV — *el mayor hueco objetivo frente a TradeZella*
Ya identificado en el análisis de competencia. Fase 1 realista: importador CSV con **mapeo de
columnas guiado** (el usuario dice qué columna es qué) + plantillas para MT4/MT5, Interactive
Brokers, Binance y Bybit. No hace falta integración por API para el 80% del valor.

#### M-26 ⏳ Adjuntar captura del gráfico a cada operación
Un journal sin la imagen del setup pierde la mitad de su valor de revisión. Requiere almacenamiento
(Cloud Storage) y política de retención coherente con la purga de 90 días.

#### M-27 ⏳ Etiquetas de setup + informe “qué setup me da dinero”
Existe analítica por instrumento; falta cerrar el bucle con las etiquetas propias del usuario.

### 4.6 Dashboard: macro, ponentes y noticias

#### M-20 ✅ Cuenta atrás al próximo dato macro con bandera de país

**Lo que había:** el widget de calendario económico de TradingView, que es una tabla. Útil, pero no
responde a la pregunta que de verdad tiene el trader: *“¿cuánto falta para el próximo dato que
puede moverme el precio?”*.

**Lo que hay ahora:** tarjeta `NextDataCountdown` con:
- cuenta atrás en vivo (días/horas/minutos/segundos) al próximo evento de alto impacto,
- **bandera del país** en SVG (mismo componente que arregla F-03),
- etiqueta de impacto (alto/medio) y **qué suele mover** ese dato concreto (el IPC mueve tipos →
  dólar e índices; el PMI mueve el sentimiento cíclico; el NFP mueve dólar y oro…),
- clic → abre el evento en la fuente,
- los 5 siguientes eventos en lista bajo el principal.

**Nota de honestidad técnica:** el calendario se alimenta de un **catálogo de eventos recurrentes con
sus reglas de publicación** (p. ej. IPC de EE. UU.: mensual, ~día 13, 08:30 ET; NFP: primer viernes,
08:30 ET; PMI flash: ~día 23; decisiones del BCE/Fed: fechas oficiales publicadas del año), calculado
en el cliente. **No inventa cifras ni consenso**: solo fecha/hora y contexto, y para el dato manda a
la fuente. Cuando exista el proveedor de M-01, se puede sustituir por un calendario real con
consenso y valor previo sin tocar la interfaz.

#### M-21 ✅ Comparecencias de alto impacto (Fed, BCE, Trump, BoJ, BoE)

Segunda tarjeta, debajo, tal y como pediste: quién habla, cuándo, y **qué activos suele mover**
(presidente de la Fed → dólar, oro, bonos, Nasdaq; presidente del BCE → EUR y bancos europeos;
declaraciones sobre aranceles → divisas emergentes, materias primas, sectores concretos). Cobertura
internacional porque quien opera forex necesita las 4 grandes campanas, no solo la de EE. UU.

#### M-22 ⏳ Noticias en la barra superior — **estudiado, NO implementado (como pediste)**

Ubicación pedida: **entre “Performance” y “Precios”** en el menú principal. Es la ubicación correcta:
está en el flujo de análisis y no interrumpe el de pago.

**Las tres formas de hacerlo, con su verdad:**

| Opción | Coste | Legalidad | Calidad |
|---|---|---|---|
| **A. Widget `top-stories` de TradingView** | 0 € · 1 hora | Correcto (es su widget) | Bajo control: no puedes filtrar ni citar bien, y no es contenido tuyo (0 SEO) |
| **B. Titulares por API (Finnhub `/news`, gratis)** | 0 € · ~1 día | ✅ **Lo correcto**: titular + fuente + hora + enlace al original | Filtrable por activo/categoría, con sentimiento |
| **C. Reescribir/resumir la noticia** | — | 🔴 **No hacerlo.** Reescribir sistemáticamente noticias de agencia es infracción de derechos, y con IA además arriesga penalización por contenido automatizado | — |

**Recomendación firme: opción B, y solo titulares.** Es exactamente lo que planteabas
(“que solo aparezcan titulares y me reenvía a la fuente”), y además es lo único defendible
legalmente. Diseño concreto para cuando se apruebe:

- Ruta `/news`, entrada de menú entre Performance y Precios.
- Backend: `GET /api/news?category=&symbol=&limit=` con caché de 5 minutos (una llamada por
  categoría cada 5 min ≈ 300 llamadas/día, holgadísimo dentro de las 60/min de Finnhub).
- Tarjeta por noticia: **titular · fuente · hora relativa · categoría · enlace externo**
  (`rel="noopener nofollow"`, se abre en pestaña nueva). **Nunca** el cuerpo de la noticia.
- Filtros: categoría (macro/empresas/cripto/forex), activo, fuente, ventana temporal.
- Franja compacta opcional en el dashboard con los 5 últimos titulares de alto impacto.
- Métrica de éxito: clics a fuente por sesión. Si nadie clica, la función sobra.

### 4.7 Buscadores

**Lo que había (mejor de lo que parecía):** `UniversalAssetSearch` ya tiene debounce de teclado,
catálogo local instantáneo (76 criptos, 30 pares de forex, acciones EU/ES, índices, materias primas)
y búsqueda remota. El buscador del gráfico busca en los 186 activos del catálogo. El de opciones
tiene el suyo.

#### M-28 ⏳ Unificar los tres buscadores en uno
Hay **tres implementaciones distintas** (`UniversalAssetSearch`, el del `TradingViewChart` y
`options/SearchBar`). Funcionan, pero divergen: teclas de navegación distintas, resultados distintos
para la misma consulta y tres sitios donde arreglar el mismo bug. Propuesta: un `AssetSearch`
compartido con adaptadores por contexto.

#### M-29 ⏳ Mejoras transversales de los buscadores
Navegación completa con teclado (↑↓, Enter, Esc) en los tres, resaltado del texto coincidente,
sección “recientes” en todos, y atajo global `/` para enfocar el buscador (convención de terminales
financieros).

### 4.8 App móvil, de escritorio y tiendas

#### M-30 ✅ PWA instalable de verdad (base de todo lo demás)

- `public/sw.js`: service worker con estrategia **network-first para navegación** (nunca servir un
  `index.html` viejo tras un deploy: fue la causa del `ChunkLoadError` que ya se parcheó en su día) y
  **cache-first para estáticos con hash** (que son inmutables por definición).
- Registro solo en producción y con limpieza de cachés viejas por versión.
- Página offline con marca propia.
- `InstallAppCard` / prompt de instalación: captura `beforeinstallprompt`, y en iOS —que no lo
  soporta— muestra las instrucciones reales (Compartir → Añadir a pantalla de inicio).
- `manifest.json` ampliado: `id`, `scope`, `display_override`, `launch_handler` y atajos correctos.

#### M-31 ✅ Sección “Próximamente” con las insignias de las tiendas

En la portada, tal y como pediste: bloque con **Google Play**, **App Store** y **Microsoft Store**
marcadas como *Próximamente*, con captura de correo para avisar del lanzamiento.
⚠️ Las insignias son **reproducciones propias en SVG con el estilo genérico**, no los logotipos
oficiales: Google y Apple prohíben usar sus insignias oficiales para apps que **no están publicadas**
todavía. Cuando la app exista, se sustituyen por las oficiales (los enlaces ya están preparados).

#### M-32 ⏳ Ruta a las tiendas de verdad — plan técnico

Se ha documentado el camino completo, porque “hacer una app” significa cosas muy distintas según la
tienda:

| Destino | Tecnología recomendada | Trabajo real | Coste |
|---|---|---|---|
| **Android (Google Play)** | **TWA** (Trusted Web Activity) vía Bubblewrap sobre la PWA | 1-2 días si la PWA pasa Lighthouse | 25 $ una vez |
| **iOS (App Store)** | **Capacitor** (la PWA en un contenedor nativo) | 3-5 días | 99 $/año + Mac para firmar |
| **Windows (Microsoft Store)** | **PWABuilder** genera el paquete MSIX desde la PWA | ~1 día | 19 $ una vez |
| **macOS / Linux (escritorio)** | **Tauri** (binario ~5 MB, no Electron) | 2-3 días | 0 € (fuera de tienda) o 99 $/año en Mac App Store |

**Puntos que no hay que subestimar** (aquí es donde se cae la gente):
- **Apple rechaza sistemáticamente** las apps que son “solo una web envuelta” sin valor nativo
  añadido. Hay que aportar al menos **notificaciones push nativas** y **biométrica de acceso**.
  Con eso pasa; sin eso, rechazo por la directriz 4.2 (Minimum Functionality).
- **Pagos dentro de la app**: si la suscripción se vende **dentro** de la app, Apple y Google se
  llevan un 15-30%. La salida legal es la de las apps “reader”: la app **no** vende, el usuario ya
  llega suscrito desde la web. Hay que diseñarlo así **desde el principio** o hay que rehacerlo.
- **La PWA es el prerrequisito de las tres tiendas** — por eso M-30 va primero y ya está hecho.

#### M-33 ⏳ Diseño “mobile-first” real de la app
Lo que ya funciona en móvil es una web responsive. Para que se sienta app hace falta: navegación
inferior con 4-5 destinos, gestos de deslizar entre pestañas, objetivos táctiles ≥44 px en las
calculadoras (hoy hay campos numéricos de 32 px) y teclado numérico (`inputMode="decimal"`) en todos
los campos de importe — hoy no está puesto en todos, y en móvil eso obliga a cambiar de teclado en
cada campo.

### 4.9 Interfaz, resoluciones y rendimiento

#### M-35 ⏳ Presupuesto de rendimiento (lo más medible que queda)
El build pesa ~5 MB. El `code-splitting` por rutas ya está, pero:
- `EducationPage.jsx` son **5.293 líneas en un solo chunk**; el usuario que abre un módulo se
  descarga los 68.
- `AdminPage.jsx` son 3.181 líneas y lo carga… un admin.
- `lib/i18n/` pesa **4,6 MB en fuente** (8 × ~5.077 claves). Ya va por chunks perezosos, bien, pero
  el chunk español entra siempre y contiene los 68 módulos de academia.
→ Propuesta: dividir el contenido de academia por pilar (6 chunks) y cargar cada módulo bajo
demanda. Ganancia estimada: −60% del JS inicial en la ruta `/education`.

#### M-36 ⏳ Resoluciones que faltan por revisar
La sesión #66 revisó el responsive general. Quedan tres escenarios concretos sin cubrir:
- **1366×768** (el portátil más común del mundo): la barra de opciones y la tabla de la cadena se
  cortan; hay que verificar con esa altura exacta, no solo con anchura.
- **Ultrawide (≥2560 px)**: el contenido se queda en `max-w-6xl` y deja dos franjas vacías enormes;
  el gráfico debería poder ocupar más.
- **Móvil apaisado** (≤500 px de alto): las cabeceras `sticky` (16 px de header + 14 px de subheader
  de opciones) se comen el 40% de la pantalla.

#### M-37 ⏳ Estados de carga coherentes
Conviven tres patrones: `Loader2` girando, `Skeleton` de shadcn y “—”. Unificar en skeletons con la
forma del contenido final (es lo que hace que una web se sienta rápida aunque tarde lo mismo).

#### M-38 ⏳ “Que aparezca todo desde 0 y se actualice al meter datos”
Lo que pedías aquí ya está resuelto a medias y merece la pena cerrarlo bien:
- **Estado vacío con sentido:** hoy varias tarjetas vacías muestran “Sin datos”. Deberían mostrar
  **el ejemplo** de lo que aparecerá (una operación de muestra atenuada + un botón para crear la
  primera). Es la diferencia entre parecer roto y parecer nuevo.
- **Actualización al introducir datos:** el diario y la analítica ya se recargan; pero las tarjetas
  del dashboard (estadísticas del diario, historial de cálculos) **no escuchan** los eventos de
  creación desde otras páginas. Propuesta: un `useDataVersion()` en el store que se incremente en
  cada escritura y del que dependan los efectos de recarga. Es un cambio pequeño con efecto grande.

### 4.10 Seguridad, privacidad y ciclo de vida de la cuenta

Auditado el recorrido completo: registro → verificación → login → uso → pago → cambio de plan →
impago → recuperación → borrado.

| Punto | Estado | Nota |
|---|:--:|---|
| Contraseñas | ✅ | Hash correcto, nunca en logs |
| JWT en cookies httpOnly + refresh | ✅ | `samesite=none; secure`, rutas acotadas |
| 2FA de usuario | ✅ | `TwoFactorCard.jsx` |
| **2FA obligatorio para admin** | ⏳ | **Sigue abierto del backlog viejo.** Un admin comprometido puede impersonar usuarios |
| Verificación de email | ✅ | SendGrid |
| Reset de contraseña | ✅ | Token de un solo uso |
| Rate limiting | ✅ | **Tras F-01**. Antes, roto |
| Cabeceras de seguridad | ✅ | CSP, HSTS, X-Frame-Options |
| CORS | ✅ | Orígenes explícitos, incluye PATCH |
| Webhooks de pago | ✅ | Firma verificada **antes** de actuar en las 3 pasarelas |
| Idempotencia de pagos | ✅ | Reclamo atómico `find_one_and_update` |
| Impersonación admin | ✅ | Prohibido impersonar a otro admin; queda en el audit log |
| Audit log admin | ✅ | Con IP, ahora no falsificable (F-01) |
| **IP de clientes** | 🟡 | Solo se guarda en el audit log del admin. Ninguna IP de usuario normal se persiste → **bien para GDPR**, pero conviene decirlo explícitamente en la política de privacidad |
| Borrado de cuenta | ✅ | `DELETE /api/auth/account` |
| **Exportación de datos (GDPR art. 20)** | ⏳ | **No existe un “descarga todos mis datos”.** Es obligatorio en la UE. Hay export del diario, pero no del perfil completo |
| Purga tras impago | ✅ | 90 días configurables, conserva la cuenta |
| Secretos | ✅ | Ninguno en el repo |
| **Claves de API en BD** | 🟠 | **C-08 sigue abierto**: `app_settings` puede guardar claves de Stripe/SendGrid cifradas con Fernet, pero la clave de Fernet vive en el mismo entorno. Decisión pendiente: solo Secret Manager |
| Dependabot / CodeQL / secret scanning | ⏳ | Sigue sin activarse en el repo (G-07) |

#### F-09 🟠 Falta “descargar mis datos” (RGPD art. 20)
Endpoint propuesto: `GET /api/auth/export` → ZIP con perfil, operaciones, cálculos, alertas,
posiciones y preferencias en JSON + CSV. Con rate limit de 1/día. Es el hueco legal más claro que
queda.

#### F-10 🟡 La política de privacidad no menciona la conservación de IP del admin
Se guarda la IP del administrador en el audit log (correcto y necesario), pero no está declarado.
Añadir una línea a la sección de datos tratados.

### 4.11 Pagos y administración

**Revisado endpoint por endpoint.** El flujo de dinero está sólido: firma verificada, idempotencia,
reembolso revoca premium, cambio de plan proporcional, cancelar/reanudar, portal de facturación.
Los huecos son de operación y de visibilidad, no de código:

#### M-40 ⏳ Panel de conciliación de pagos
Hoy el admin ve ingresos y transacciones, pero no hay una vista que cruce
*suscripciones activas × pagos recibidos × webhooks procesados* para detectar el caso clásico:
usuario que paga y no recibe premium porque el webhook se perdió. Propuesta: tarjeta
“Discrepancias” con reintento manual del webhook.

#### M-41 ⏳ Alerta de webhook caído
Si no llega ningún webhook de Stripe en 24 h habiendo suscripciones activas, avisar por email al
admin. Es el fallo más caro que puede pasar desapercibido.

#### M-42 ⏳ Prueba de las 3 pasarelas en sandbox
Estado real: Stripe y PayPal probados en código; **NOWPayments y Revolut no tienen prueba de ida y
vuelta** (la llamada saliente no es verificable desde el sandbox de desarrollo, red bloqueada).
Antes de lanzar hay que hacer una compra real de 1 € por cada una.

### 4.12 Contenido que falta

#### C-04 ✅ Tokenomics de cripto: capitalización, oferta y **dilución** (del PDF de 100 reglas)

Estado previo verificado por búsqueda en los 8 idiomas: **“oferta circulante” 0 coincidencias,
“dilución” 0, “market cap” 0, “holders” 0**. Solo una mención de pasada a *tokenomics* dentro del
módulo de análisis fundamental. Para una web cuyo público principal opera cripto, era el hueco de
contenido más grande.

Añadido (ficha de Cripto en Tipos de Mercado + calculadora):
- Los 3 filtros del PDF para elegir qué operar: **volumen alto + muchos holders** (liquidez),
  **capitalización en la franja útil** (ni tan grande que no pueda crecer, ni tan pequeña que sea
  manipulable) y **oferta total limitada**.
- Qué evitar: volumen bajo, comunidad inexistente, capitalización minúscula, emisión sin tope.
- **Calculadora de dilución/FDV** con el caso real del PDF: precio 20 $, oferta circulante 200 M,
  oferta total 1.000 M → capitalización 4.000 M $, **FDV 20.000 M $**, precio implícito tras la
  dilución completa **4 $ (−80%)** si la capitalización se mantiene. Es la cuenta que casi nadie
  hace y que explica la mitad de las ruinas en cripto.
- Aviso metodológico honesto: la dilución **no** significa que el precio caiga a ese número; es el
  precio que resultaría *si la capitalización total se mantuviera constante*. Y los desbloqueos ya
  suelen estar parcialmente descontados.

#### C-05 ✅ Unidades de forex, materias primas y CFDs
Pediste explícitamente pips, lotes y “todas esas unidades”. Estado previo: la calculadora de lotaje
existe y hay 37 menciones de “pip”, pero **la definición sistemática por mercado no estaba en un
solo sitio**. Ahora está en las fichas de Tipos de Mercado (§M-10, bloque “Cómo se mide”), con
tablas de tamaño de contrato reales: WTI 1.000 barriles, Brent 1.000 barriles, oro 100 oz, plata
5.000 oz, gas natural 10.000 MMBtu, cobre 25.000 lb, y el valor del tick de cada uno.

#### C-06 ⏳ Fiscalidad por país
Existe un módulo de impuestos genérico. Para España (mercado principal) merece su propia ficha:
base del ahorro, compensación de pérdidas a 4 años, la **regla de los 2 meses** (recompra), modelo
720/721 para cripto en el extranjero. **Con aviso legal claro**: informativo, no asesoramiento.

#### C-07 ⏳ Reglas de trading del PDF (las 100)
El PDF entregado tiene desarrolladas ~17 de las 100 reglas (el resto son epígrafes vacíos). Lo
aprovechable ya está integrado: selección de cripto (C-04), margen aislado vs cruzado (**ya existía**
en el módulo `margin-liq`), tipos de trading con apalancamiento típico por estilo (**ya existía** en
`TradingStylesCompare`), y estacionalidad cripto.
⚠️ **Dos cosas del PDF NO se han incorporado, a propósito, y conviene que sepas por qué:**
- *“Estrategia que funciona 100%”* y *“Cómo operar para ganar siempre”*: no existe tal cosa. Ponerlo
  en la web sería falso y, con la normativa europea de promoción de servicios financieros, un riesgo
  legal real. La web ya dice lo contrario con datos citados (74-89% pierde).
- *“Duplicar la posición en cada caída”* (promediar a la baja doblando: 1, 2, 4 unidades): es una
  **martingala**. Matemáticamente garantiza la ruina con capital finito. Si quieres incluirlo, la
  forma responsable es como **caso de estudio con la simulación de riesgo de ruina al lado**
  mostrando la probabilidad de arruinarse — la calculadora de Monte Carlo de la web ya lo puede
  demostrar numéricamente. Dime si quieres que lo monte así.

### 4.13 i18n

**Estado: excelente.** 8 idiomas con paridad exacta verificada por `scripts/i18n-check.js`.
Banderas ahora en SVG (F-03).

#### M-45 ⏳ Deuda de traducción del contenido nuevo
Las fichas de Tipos de Mercado (§M-10) llevan **es + en completos**; para los otros 6 idiomas la
interfaz sí está traducida (van por claves i18n) pero el **texto largo de las fichas cae a inglés**.
Es una decisión consciente: prefiero inglés correcto a español mostrado a un usuario japonés. Queda
anotado como deuda explícita, no como descuido.

#### M-46 ⏳ `hreflang` de las nuevas páginas `/markets/`
Generadas con hreflang entre idiomas; falta añadirlas al `sitemap.xml` principal en el siguiente
build (se hace solo en `postbuild`).

---

## 5. Los 4 PDFs: mapa de cobertura

| PDF | Concepto | ¿Estaba? | Acción |
|---|---|:--:|---|
| Libro de órdenes | Order book real vs OTC/market maker | ❌ | ✅ C-01 |
| Libro de órdenes | Prima = teórico + oferta/demanda + spread | ❌ | ✅ C-01 |
| Libro de órdenes | Delta como transmisión del subyacente | ✅ (módulo de griegas) | Enlazado |
| Libro de órdenes | Apalancamiento nocional vs efectivo (delta) | ❌ | ✅ C-01 con el ejemplo 50×/25× |
| Apertura/cierre | Buy/Sell to Open, Buy/Sell to Close | ❌ | ✅ C-02 |
| Apertura/cierre | Leer la cadena (clic en bid/ask) | Parcial | ✅ C-02 |
| Apertura/cierre | Dejar expirar: ITM se ejerce, OTM caduca | Parcial | ✅ C-02 |
| Apertura/cierre | Cierre parcial | ❌ | ✅ C-02 |
| Rollover | Rollover en futuros | Mención suelta | ✅ C-03 |
| Rollover | Roll out / up / down en opciones | ❌ | ✅ C-03 |
| Rollover | Coste del roll, contango/backwardation | ✅ (materias/futuros) | Ampliado y enlazado |
| Rollover | Errores comunes del roll | ❌ | ✅ C-03 |
| 100 reglas | Volumen, holders, capitalización | ❌ | ✅ C-04 |
| 100 reglas | Oferta circulante vs total, dilución, FDV | ❌ | ✅ C-04 + calculadora |
| 100 reglas | Margen aislado vs cruzado | ✅ (`margin-liq`) | Sin cambios |
| 100 reglas | Tipos de trading y apalancamiento típico | ✅ | Sin cambios |
| 100 reglas | Estacionalidad cripto | Parcial | ✅ en ficha de Cripto |
| 100 reglas | “Estrategia 100% fiable” / martingala | — | 🧊 Rechazado con motivo (§C-07) |

---

## 6. Plan por olas

### Ola 1 — hecha en esta sesión
F-01 · F-02 · F-03 · F-04 · F-05 · M-06 · M-07 · M-10 · M-11 · M-15 · M-20 · M-21 · M-30 · M-31 ·
C-01 · C-02 · C-03 · C-04 · C-05.

### Ola 2 — siguiente (por retorno)
1. **M-01** proveedor multi-fuente (requiere que des de alta Finnhub — es gratis).
2. **M-22** noticias (opción B) una vez apruebes el diseño.
3. **F-09** exportación RGPD de datos.
4. **M-25** import CSV al diario.
5. **M-35** presupuesto de rendimiento (dividir academia y admin).

### Ola 3 — plataforma
1. **M-32** TWA de Android + MSIX de Windows (los dos más baratos y rápidos).
2. **M-08** `charting_library` para guardar dibujos (solicitarla ya, tarda).
3. **M-16** calculadora de roll · **M-26** capturas en el diario.
4. **2FA obligatorio de admin** + Dependabot/CodeQL.

### Acciones que solo puedes hacer tú (operación)
- Dar de alta **Finnhub** (gratis) y meter la clave en Secret Manager.
- **Solicitar la `charting_library`** a TradingView (gratis, formulario).
- Comprar/apuntar el **dominio propio** y darlo de alta en Search Console.
- Compra real de 1 € por **NOWPayments** y **Revolut** para cerrar M-42.
- Cuentas de desarrollador: Google Play (25 $), Apple (99 $/año), Microsoft (19 $).

---

## 7. Registro de lo implementado en esta sesión

Ver la entrada correspondiente en [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) §7 y, para los
fallos, [`DIARIO_BUGS.md`](../DIARIO_BUGS.md).
