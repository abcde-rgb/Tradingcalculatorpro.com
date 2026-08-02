# Auditoría de producto digital — TradingCalculator.Pro
**Fecha:** 2026-07-27 · **Rama:** `claude/digital-project-audit-3upqfd` · **Commit:** `00d01b2`

---

## 0. Alcance y honestidad sobre el método

Antes de nada, qué es esta auditoría y qué no.

**Lo que se ha verificado ejecutando, no leyendo:**

| Comprobación | Resultado |
|---|---|
| `npm run build` | exit 0 · 744 URLs de sitemap · 40 MB en `build/` |
| `pytest tests/` | **264 passed, 74 skipped** |
| `python -m py_compile *.py` | 16/16 módulos |
| `npx eslint src scripts` | **0 errores**, 128 avisos |
| `node scripts/i18n-check.js` | 5327 claves × 8 idiomas, **0 huecos** |
| `node scripts/check-fetch-credentials.js` | limpio |
| Rutas registradas (`server.app.routes`) | **181** |
| Fallo del buscador admin | reproducido y corregido **contra PostgreSQL 16 real** |
| `ReferenceError` de Fibonacci | reproducido en Node |
| `npm audit` | 45 vulnerabilidades, clasificadas una a una |

**Lo que NO se ha podido verificar y por qué** — dilo en voz alta antes de que
alguien tome una decisión creyendo lo contrario:

- **No hay revisión visual del sitio desplegado.** No he abierto
  `abcde-rgb.github.io` en un navegador contra el backend de producción. Todo
  juicio de UX/UI de este documento sale de leer el código, no de ver la web
  funcionando. Los apartados de diseño van marcados como **inferencia**.
- **No hay Lighthouse ni Core Web Vitals reales.** Los números de rendimiento
  son pesos de bundle medidos en disco, no LCP/INP/CLS de campo.
- **No hay analítica.** Sin acceso a GA4 no puedo decir qué convierte ni dónde
  se cae la gente. Todo lo de conversión es hipótesis razonada, no dato.
- **La red del sandbox bloquea Yahoo Finance y CoinGecko**, así que ningún
  camino de datos de mercado en vivo se ha ejercitado de verdad.
- **Sin acceso a Stripe, GCP, SendGrid ni DNS**: el "gating de operación" no se
  puede cerrar desde aquí.

Al final (§11) tienes la lista exacta de lo que necesitaría para afinar.

---

## 1. Resumen ejecutivo

**Nivel actual: bueno tirando a muy bueno, con un agujero de proceso que le
estaba costando caro.**

Esto no es un proyecto improvisado. Es un producto grande y bien pensado: 181
rutas de API, 100 000 líneas de frontend, 8 idiomas sin un solo hueco, 264 tests,
744 páginas SEO generadas en cada build, y un backend con decisiones de seguridad
que están por encima de la media del sector (la clave de rate limiting se deriva
contando desde la derecha del `X-Forwarded-For` — eso no lo hace casi nadie, y es
lo correcto). La documentación interna es, cuando está al día, excelente.

**Lo que impedía que fuera excelente no era el código: era que nadie miraba.**

ESLint estaba instalado, configurado con `jsx-a11y`, `react-hooks` y todo el
aparato… y **no analizaba ni un solo fichero**: el parser abortaba en los 283.
Y CI tampoco lo ejecutaba, así que no había forma de enterarse. Un linter mudo
durante meses en un proyecto de 100 000 líneas no es un detalle de higiene, es
una alarma desconectada. En cuanto se arregló, lo primero que salió fue que **la
calculadora de Fibonacci estaba caída** — un `idx` no declarado que lanza
`ReferenceError` en cuanto alguien pulsa calcular, en una herramienta enlazada
desde el dashboard principal.

Ese es el patrón de todo el diagnóstico: **el problema no es la falta de
capacidad técnica, es la falta de red de seguridad automática.** Los mismos
fallos aparecían dos y tres veces porque se parcheaba el síntoma donde se veía,
sin nada que avisara de las otras diez copias. El caso más claro: el bug del
`Bearer null` tras recargar se había arreglado a mano dos veces en dos tarjetas
distintas del panel admin… mientras seguía vivo en **once** más.

**Lo mismo pasa con la documentación.** El `ESTADO_PROYECTO.md` se declara "la
fuente de verdad" y manda leer §1–§5 antes de tocar nada. Pero sólo se
actualizaba §7 (el registro de sesiones). Resultado: §1 y §6 llevaban un mes
diciendo que había que dar de alta **OxaPay** — una pasarela retirada del código
hace tiempo, hoy sustituida por NOWPayments. Alguien siguiendo el documento se
habría puesto a abrir una cuenta que la web no llama. Un documento que miente en
la lista de bloqueantes de lanzamiento es peor que no tener documento.

**El veredicto en una frase:** el producto está mucho más cerca de excelente de
lo que sugiere la lista de fallos de esta auditoría, porque los fallos
encontrados son casi todos consecuencia de una única causa raíz —no había
verificación automática— y esa causa ya está corregida en esta rama.

---

## 2. Puntuación global

Notas **antes** de esta auditoría y **después** de los arreglos ya aplicados.

| Área | Antes | Después | Comentario |
|---|:--:|:--:|---|
| **Producto** | 8,0 | 8,0 | Alcance y profundidad notables. Le falta foco, no funciones |
| **UX/UI** | 7,0* | 7,0* | *Inferido del código. i18n y temas impecables; densidad preocupante |
| **Código** | 6,5 | 7,5 | Buenas piezas, pero `server.py` de 7377 líneas y 128 símbolos muertos |
| **Arquitectura** | 7,5 | 7,5 | El shim Mongo→SQL es discutible pero está *bien hecho* y bien aislado |
| **Rendimiento** | 7,5 | 7,5 | Split de rutas, locales y libs pesadas ya correctos. 275 KB gz de entrada |
| **SEO** | 8,5 | 8,5 | 744 páginas estáticas multi-idioma con hreflang. Techo: el dominio |
| **Accesibilidad** | 6,0* | 6,5 | *No auditada en vivo. Ahora al menos el linter a11y puede opinar |
| **Seguridad** | 8,0 | 8,5 | Backend sólido de verdad. Falta CSP en el HTML de Pages |
| **Conversión** | 6,5* | 6,5* | *Sin analítica no hay diagnóstico real, sólo hipótesis |
| **Mantenibilidad** | 5,5 | 7,5 | El salto grande: linter vivo + CI que lo ejecuta + doc corregida |
| **Calidad general** | **7,0** | **7,8** | |

> Las notas con asterisco son las que **no** puedo defender con una medición.
> No las uses para tomar decisiones sin verificarlas primero.

---

## 3. Lo que ya está bien (no lo toques)

Esto es tan importante como la lista de fallos. Hay trabajo aquí que sería un
error deshacer:

1. **La derivación de la clave de rate limiting** (`_real_client_ip`,
   `server.py`). Cuenta las IPs del `X-Forwarded-For` **desde la derecha**, con
   `TRUSTED_PROXY_HOPS` configurable. Eso es exactamente lo correcto y casi nadie
   lo hace: un cliente puede *prepender* IPs falsas, pero no puede *appendear*
   más allá del proxy. Con el comentario que explica por qué. **No lo simplifiques.**

2. **El 2FA de admin que no se puede desactivar en producción.** `ADMIN_2FA_OPTIONAL`
   sólo se respeta si `ENVIRONMENT` es de desarrollo; en producción la variable se
   ignora *a propósito*, para que no baste con tocar una env var del servicio.
   Es una decisión de diseño de seguridad madura.

3. **El shim Mongo→PostgreSQL está blindado contra inyección SQL.** Audité los
   **seis** puntos donde se interpola un nombre de campo en el SQL (`_build_where_clause`,
   `sort`, `distinct`, `aggregate` ×3) y **todos** pasan por `_SAFE_FIELD_RE`.
   Los valores van siempre como parámetros. Para ser código escrito a mano, está
   bien hecho.

4. **El service worker.** Network-first para navegación, cache-first sólo para
   assets con hash, y **nunca** toca datos de mercado. El comentario explica que
   cachear precios en una web financiera es un pasivo. Correcto y bien razonado.

5. **La recuperación de `ChunkLoadError`** (`lazyRetry` en `App.js`). Contempla
   que `sessionStorage` lanza en modo privado, que un reload normal puede
   devolver el mismo shell rancio, y se guarda de bucles con una ventana de 30 s.
   Alguien se peleó de verdad con este problema y lo resolvió bien.

6. **i18n: 5327 claves × 8 idiomas, 0 huecos, con un verificador propio en CI.**
   Y los locales se cargan **lazy** (sólo español va en el bundle inicial).
   Esto es de las cosas mejor ejecutadas del proyecto.

7. **El code splitting ya está resuelto.** Verifiqué que `framer-motion`,
   `recharts`, `jspdf`, `html2canvas` y `lightweight-charts` **no** están en el
   chunk de entrada. Está bien hecho; no hace falta tocarlo.

8. **La generación de 744 páginas SEO estáticas multi-idioma** con hreflang,
   JSON-LD y `dir="rtl"` en árabe, en el `postbuild`. Es la respuesta correcta al
   problema de que una SPA no se indexa bien.

9. **Los tests de paridad de umbrales** (`test_candle_rules_parity_unit.py`):
   leen el JavaScript y comparan número a número contra el Python. Alguien
   entendió que el peligro de duplicar una constante no es la copia, es la deriva
   silenciosa. Ese instinto es el que hay que extender al resto del proyecto.

10. **La honestidad del contenido legal.** En la pestaña de Advertencia de Riesgo
    se rechazó poner un reclamo falso ("se pierde 100 % seguro") y se pusieron las
    cifras reales con fuente. Eso protege legalmente y construye confianza.

---

## 4. Problemas encontrados

### 4.1 CRÍTICOS

---

**C-1 · La calculadora de Fibonacci se rompe al calcular** ✅ **CORREGIDO**

- **Qué pasa:** `FibonacciCalculator.jsx` usaba `idx` dentro de dos
  `.map((item) => …)` que nunca lo declaraban.
- **Dónde:** `frontend/src/components/calculators/FibonacciCalculator.jsx:189` y `:225`.
- **Por qué es un problema:** en JavaScript, leer un identificador no declarado
  lanza `ReferenceError`. Comprobado en Node:
  `ReferenceError: idx is not defined`. El error ocurre **al pintar los niveles**,
  o sea en cuanto el usuario pulsa calcular.
- **Impacto real:** una de las 14 calculadoras, enlazada desde `DashboardPage`,
  caída para todo el mundo. En una web cuyo nombre es "calculator", una
  calculadora que revienta es daño de credibilidad, no un bug menor.
- **Solución:** añadir el índice a ambos callbacks: `.map((item, idx) => …)`.
- **Prioridad:** máxima · **Dificultad:** trivial (2 líneas)

---

**C-2 · ESLint no analizaba ningún fichero, y CI no lo ejecutaba** ✅ **CORREGIDO**

- **Qué pasa:** `eslint.config.mjs` cargaba `@babel/eslint-parser`. CRA no deja
  un `babel.config.js` en el repo (su configuración vive dentro de
  `react-scripts`), así que el parser abortaba con *"No Babel config file
  detected"* en **283 de 283** ficheros.
- **Dónde:** `frontend/eslint.config.mjs` y `.github/workflows/ci.yml`.
- **Por qué es un problema:** `jsx-a11y`, `react-hooks/rules-of-hooks` y
  `exhaustive-deps` estaban instalados y declarados, pero sin analizar nada.
  Es una alarma desconectada: da la sensación de cobertura sin darla.
- **Impacto real:** dejó pasar C-1 (crash en producción) y C-3 (11 tarjetas
  rotas). Es la **causa raíz** de la mayoría de esta auditoría.
- **Solución aplicada:** parser propio de ESLint (espree), que entiende JSX con
  `ecmaFeatures.jsx` sin depender de Babel ni de `NODE_ENV`; `react/jsx-uses-vars`
  activado (sin él, `no-unused-vars` marca como muerto cada componente que sólo
  se usa en JSX: eran 1987 falsos positivos, quedaron 111 reales); y paso
  `Lint (ESLint)` añadido a CI.
- **Prioridad:** máxima · **Dificultad:** baja

---

### 4.2 ALTOS

---

**A-1 · 11 tarjetas del panel admin se quedan vacías tras recargar** ✅ **CORREGIDO**

- **Qué pasa:** once tarjetas repetían
  `useEffect(() => { if (API) load(); else setLoading(false); }, [])`.
- **Dónde:** `frontend/src/pages/AdminPage.jsx` — AuditLog, MaintenanceMode,
  EmailCampaigns, ChurnSurvey, CohortAnalysis, ReferralManager, PlansEditor,
  I18nManager, ErrorMonitor, RateLimiting, GDPRExport.
- **Por qué es un problema:** el token vive **sólo en memoria** (Zustand, por
  diseño). Tras un F5 arranca a `null`, la cabecera sale literalmente como
  `"Bearer null"`, el backend responde 401, el `catch` se lo traga y —al no
  depender de `headers`— **el efecto no se reintenta jamás**.
- **Impacto real:** el panel de administración queda medio muerto después de
  cualquier recarga. Silencioso: ni error visible ni forma de saber que faltan datos.
- **Agravante:** este proyecto **ya había arreglado este mismo fallo dos veces**
  (`UsageHeatmapCard`, `IntegrationsEditor`), cada una en su sitio, sin tocar la
  raíz. Sin linter, no había forma de ver las otras once.
- **Solución aplicada:** un hook compartido, `useAuthedLoad(headers, load, setLoading)`,
  que espera a que el bearer sea real y **relanza la carga cuando llega**.
  Mientras espera mantiene el spinner (que es la verdad: está esperando) y sólo
  apaga `loading` cuando no va a llegar nada nunca (sin backend o modo demo).
- **Prioridad:** alta · **Dificultad:** media (refactor, no parche)

---

**A-2 · La búsqueda de usuarios del admin devuelve 500 con un paréntesis** ✅ **CORREGIDO**

- **Qué pasa:** el parámetro `q` se pasaba **crudo** a los operadores `~` / `~*`
  de PostgreSQL.
- **Dónde:** `backend/server.py`, endpoint `GET /api/admin/users`.
- **Por qué es un problema:** lo que se teclea en un buscador es texto, no una
  expresión regular. Buscar `Rodríguez (padre)` —o teclear `(` a medias mientras
  escribes— aborta la consulta. **Reproducido contra PostgreSQL 16 real:**
  `InvalidRegularExpressionError: invalid regular expression: parentheses () not balanced`.
- **Impacto real:** el listado de usuarios cae con 500. Además la búsqueda tenía
  una semántica oculta que nadie espera (`.` como comodín, `|` como alternativa).
- **Solución aplicada:** `_literal_regex()` escapa los metacaracteres → subcadena
  literal, insensible a mayúsculas. **+5 tests** de regresión.
- **🔎 Lo que NO es, aunque lo parecía:** sospeché **ReDoS** y **lo medí antes de
  reportarlo**. El motor de PostgreSQL resolvió `(a+)+$` contra el caso patológico
  sin despeinarse. **No hay ReDoS.** Queda documentado como crash de entrada
  inválida y nada más — no se reporta lo que no se ha demostrado.
- **Prioridad:** alta · **Dificultad:** baja

---

**A-3 · La "fuente de verdad" mandaba configurar una pasarela que ya no existe** ✅ **CORREGIDO**

- **Qué pasa:** `docs/ESTADO_PROYECTO.md` §1 y §6 pedían dar de alta **OxaPay**
  (Merchant API Key, callback `/api/webhook/oxapay`, `oxapay_sandbox`). OxaPay se
  retiró del código; hoy la pasarela cripto es **NOWPayments**. `backend/oxapay.py`
  **no existe**.
- **Dónde:** `docs/ESTADO_PROYECTO.md` (13 menciones), `CLAUDE.md`.
- **Por qué es un problema:** el documento se declara fuente de verdad y manda
  leer §1–§5 antes de trabajar. Sólo se actualizaba §7. La corrección existía…
  1200 líneas más abajo, en el registro histórico.
- **Impacto real:** el dueño, siguiendo su propia documentación, se pondría a
  abrir una cuenta de OxaPay para desbloquear el lanzamiento. Tiempo perdido en
  la ruta crítica, y confianza perdida en el documento.
- **Solución aplicada:** §1, §2 y §6 reescritas con **cifras medidas** (181 rutas,
  16 módulos, `server.py` 7377 líneas, 24 rutas en `App.js`, 14 calculadoras,
  5327 claves × 8) + aviso de método en la cabecera. El registro histórico (§7)
  **no** se toca: es append-only y su contenido era correcto en su momento.
- **Prioridad:** alta · **Dificultad:** baja

---

**A-4 · El HTML del sitio va sin CSP** ⏳ **ABIERTO (G-10)**

- **Qué pasa:** `SecurityHeadersMiddleware` pone CSP, `X-Frame-Options`, HSTS y
  compañía… en las respuestas de **la API** (Cloud Run). El HTML de la web lo
  sirve **GitHub Pages**, que no permite definir cabeceras. `public/index.html`
  tampoco lleva `<meta http-equiv>`.
- **Dónde:** `frontend/public/index.html`.
- **Por qué es un problema:** la web queda sin defensa en profundidad contra XSS
  y sin `frame-ancestors` (clickjacking). En un producto financiero con sesión y
  pagos, es la capa que quieres tener aunque no haya un XSS conocido.
- **Impacto real:** medio. No hay vulnerabilidad conocida que explotar hoy; es
  mitigación, no parche de un agujero abierto.
- **Por qué NO lo he activado:** un `<meta>` CSP **no admite `report-only`**. O
  está bien a la primera, o rompes TradingView, GA4/GTM, Google OAuth, Stripe y
  PayPal de golpe, en producción. Activarlo sin poder abrir un navegador contra
  el sitio real sería exactamente el "empeorar algo que funciona" que hay que
  evitar. En §9 tienes la política concreta y el procedimiento de verificación.
- **Prioridad:** alta · **Dificultad:** media (la política es fácil; verificarla no)

---

### 4.3 MEDIOS

---

**M-1 · `agent-browser` en `dependencies` de producción** ✅ **CORREGIDO**

- **Qué:** 73 MB, **cero** imports, **cero** menciones en todo el repo y la
  documentación. No llegaba al bundle (webpack sólo empaqueta lo importado), pero
  sí a cada `npm ci` de CI y de cada despliegue, y al árbol de dependencias de
  producción (superficie de supply chain).
- **Solución:** eliminado. `node_modules`: **624 MB → 551 MB**.
- **Nota:** si hace falta para smokes locales, su sitio es `npm i -D agent-browser`.
- **Prioridad:** media · **Dificultad:** trivial

---

**M-2 · `axios` con vulnerabilidad alta que sí viaja al navegador** ✅ **CORREGIDO**

- **Qué:** `axios ^1.8.4` (instalado 1.16.1), rango vulnerable 1.0.0–1.17.0.
  Se usa en `optionsApi.js` y `performanceApi.js`, o sea que **llega al usuario**.
- **Solución:** `^1.18.1`. `npm audit` da axios limpio.
- **El matiz que importa:** de las 45 vulnerabilidades restantes, la inmensa
  mayoría son **cadena de compilación** (react-scripts, workbox, svgr, postcss,
  shell-quote, websocket-driver). No se ejecutan en el navegador del usuario ni
  en el servidor: sólo durante el build, en CI. Tratarlas como si fueran riesgo
  de producción es ruido que oculta las dos que sí importaban.
- **Prioridad:** media · **Dificultad:** trivial

---

**M-3 · `react-router-dom`: por qué NO se toca** ✅ **DECISIÓN CONSCIENTE**

- `npm audit` marca *high* y propone "arreglarlo" **bajando a 7.11.0** (salto
  mayor hacia atrás).
- El aviso es **"RSC Mode CSRF Bypass"**. Esto es una SPA de Create React App:
  **no hay React Server Components**, verificado (cero usos de APIs RSC).
- **Cambiar una versión que funciona por un aviso que no aplica, mediante un
  downgrade mayor, es empeorar el proyecto.** Se deja como está, documentado.
- **Prioridad:** ninguna · **Acción:** revisar cuando react-router publique un
  parche hacia adelante.

---

**M-4 · `py_compile` en CI iba con lista escrita a mano** ✅ **CORREGIDO**

- **Qué:** la lista de módulos estaba a fuego y se había quedado atrás:
  `price_action`, `timeframes`, `market_data`, `nowpayments`, `revolut` y
  `affiliate_program` **no se comprobaban**. Seis módulos, incluidos dos de pagos.
- **Solución:** `python -m py_compile *.py`. Nada que recordar actualizar.
- **Prioridad:** media · **Dificultad:** trivial

---

**M-5 · La orden de desarrollo local documentada no puede conectar** ⏳ **DOCUMENTADO (G-11)**

- **Qué:** `init_pool` trata **cualquier** host TCP como si fuera Neon y exige SSL
  verificado. El `DATABASE_URL` de dev que documentaban `CLAUDE.md` y el README
  apunta a un Postgres local sin SSL → `CERTIFICATE_VERIFY_FAILED`. Lo sufrí
  montando el entorno de verificación.
- **Decisión:** **el código no se toca.** Exigir TLS por defecto es lo correcto y
  relajarlo por comodidad de desarrollo es como se acaba enviando texto plano a
  producción. Se ha documentado la forma que **sí** funciona (socket Unix,
  `?host=/var/run/postgresql`), verificada.
- **Mejora opcional (§9):** aceptar `sslmode=disable` **sólo** si
  `ENVIRONMENT=development`.
- **Prioridad:** media · **Dificultad:** baja

---

**M-6 · 128 símbolos muertos** ⏳ **ABIERTO (deuda de limpieza)**

- **Qué:** al arreglar el linter afloraron 111 `no-unused-vars` + 17 avisos varios.
  Ninguno rompe nada en ejecución.
- **Decisión:** la regla se deja en **`warn`**, no `error`, a propósito: es deuda
  heredada real, pero no debe bloquear el PR de otra persona. Lo que **sí**
  bloquea es lo que revienta en el navegador (`no-undef`, `rules-of-hooks`).
  Cuando el contador llegue a 0, súbelo a `error`.
- **Prioridad:** media-baja · **Dificultad:** baja pero tediosa

---

### 4.4 BAJOS

| ID | Qué | Dónde | Impacto | Solución | Dif. |
|---|---|---|---|---|:--:|
| B-1 | `server.py` de **7377 líneas** (la doc decía 6107) | `backend/server.py` | Mantenibilidad; nadie lo abarca | Extraer a `app/routers/` **con tests antes**. No urgente | alta |
| B-2 | 12 `eslint-disable` obsoletos que ya no silencian nada | varios | Ruido; ocultan intención | `--fix` los quita | triv. |
| B-3 | `no-useless-escape` ×3 (`[^\d.\-]`) | CompareBar, tradeImport | Cosmético (probé que es equivalente) | Ya corregido | triv. |
| B-4 | Route shadowing admin (~21 endpoints muertos) | `admin_routes.py` | Código muerto que confunde | Unificar en un router (G-04, ya conocido) | media |
| B-5 | Defaults de `FRONTEND_URL`/CORS apuntan a un dominio no servido | `server.py`, `missing_apis.py` | Latente: los 2 despliegues sí lo sobreescriben, pero un tercero rompería emails y CORS | Que el default sea el real, o `RuntimeError` en producción si falta | baja |
| B-6 | `@app.on_event` obsoleto (FastAPI) | `server.py:7370` | Aviso de deprecación | Migrar a `lifespan` | baja |
| B-7 | Pydantic v1 `class Config` obsoleto | modelos | Aviso; romperá en Pydantic v3 | `ConfigDict` | baja |

---

## 5. Partes inacabadas o débiles

1. **El dominio propio, sin decidir.** No hay `frontend/public/CNAME`; el sitio
   vive en `abcde-rgb.github.io/Tradingcalculatorpro.com`. El historial muestra
   que se compró/planeó `tradingcalculatorpro.com`, se migró todo el SEO, y luego
   se revirtió a github.io. **Es el mayor techo del proyecto**: un subdominio de
   github.io limita autoridad SEO, y una web financiera que pide tarjeta desde un
   `github.io` pierde conversión por desconfianza. *Cómo terminarlo:* §9.4.

2. **Stripe en producción sin verificar** (G-01, bloqueante conocido). El código
   está; los productos, price IDs y el webhook secret no están confirmados contra
   el dashboard real. **Nada de esto se puede cerrar desde el repo.**

3. **NOWPayments sin probar de verdad.** El IPN está implementado y verificado con
   HMAC, pero la llamada saliente nunca se ha ejercitado (red bloqueada).
   Necesita una prueba en sandbox con API Key real.

4. **`test_result.md` (67 KB) y `test_summary.txt` en la raíz**: restos de la era
   Emergent, junto a `backend_test_security.py` (que la propia `CLAUDE.md` marca
   como OBSOLETO porque hace `sys.exit(1)`). Es ruido que hace dudar de qué es
   fuente de verdad. *Cómo terminarlo:* moverlos a `_archive/`, que ya existe.

5. **Cobertura de tests desequilibrada.** 264 tests, pero concentrados en
   matemáticas puras (opciones, velas, price action). El **shim de BD** —la pieza
   más peligrosa y más casera del backend— y los **flujos de pago** tienen mucha
   menos cobertura relativa. Ahí es donde un fallo cuesta dinero.

6. **Los `catch { /* ignore */ }` del panel admin.** Ahora que el token se espera
   bien, el siguiente escalón es distinguir "no hay datos" de "la petición falló".
   Hoy ambos casos pintan una tarjeta vacía idéntica.

---

## 6. Mejoras propuestas

### Quick wins (ya aplicadas en esta rama)
- ✅ Linter funcionando + en CI · ✅ Fibonacci arreglada · ✅ 11 tarjetas admin
- ✅ Buscador admin sin 500 · ✅ −73 MB de dependencias · ✅ axios seguro
- ✅ `py_compile *.py` · ✅ Documentación reconciliada con el código

### Técnicas (siguientes)
- **Obligatorio:** activar **Dependabot + CodeQL + secret scanning** (G-07). El
  workflow `codeql.yml` ya existe: falta activarlo en ajustes del repo.
- **Recomendado:** bajar los 128 avisos a 0 y subir `no-unused-vars` a `error`.
- **Recomendado:** tests del **shim `Collection`** (operadores `$set/$inc/$push/
  $or/$in/$regex`, agregación). Es la pieza casera de la que depende todo.
- **Opcional:** partir `server.py` en `app/routers/` — **sólo después** de tener
  esos tests. Hacerlo antes es cambiar deuda por riesgo.
- **Opcional:** migrar `on_event` → `lifespan` y `class Config` → `ConfigDict`.

### Seguridad
- **Obligatorio:** CSP en `index.html` (§9.1), con la verificación de §9.2.
- **Recomendado:** cerrar **C-08** — API keys de Stripe/SendGrid dejan de poder
  guardarse en `app_settings` en claro; sólo Secret Manager.
- **Recomendado:** que `FRONTEND_URL` sin definir lance `RuntimeError` en
  producción, igual que ya hace `JWT_SECRET`. Un enlace de recuperación de
  contraseña apuntando al dominio equivocado es un incidente, no un detalle.

### Rendimiento
- **Nota honesta: aquí hay menos que rascar de lo que parece.** Verifiqué que el
  split de rutas, la carga lazy de los 8 locales y la exclusión de
  `framer-motion`/`recharts`/`jspdf`/`html2canvas` del chunk de entrada **ya están
  bien hechos**. No inventes trabajo aquí.
- **Recomendado:** el chunk de entrada son **275 KB gz** (863 KB en crudo) + 21 KB
  gz de CSS. Es alto para un primer pintado. El sospechoso principal es
  `lucide-react` (único paquete pesado que sí está en `main.js`): revisa que se
  importe icono a icono y no como barrel.
- **Recomendado:** medir **de verdad** con Lighthouse contra el sitio desplegado
  antes de optimizar nada más. Optimizar sin medir es adivinar.

### Accesibilidad
- **Obligatorio primero:** activar las reglas `jsx-a11y` en el config (ahora ya
  *pueden* ejecutarse) y ver el recuento real. Hasta entonces cualquier cifra de
  a11y de este documento es inferencia.
- **Recomendado:** auditoría manual de teclado y lector de pantalla en los tres
  flujos que dan dinero: registro, checkout y la calculadora principal.
- **Ya bien:** `lang`/`dir` **sí** se actualizan en runtime al cambiar idioma
  (`i18n.js`), y hay `prefers-reduced-motion` en las animaciones de la landing.
  Lo comprobé antes de reportarlo como fallo: no lo es.

### SEO
- **La palanca dominante es el dominio propio.** Todo lo demás son decimales al
  lado.
- **Ya excelente:** 744 URLs, hreflang ×9, JSON-LD, `noindex` en páginas privadas.
- **Recomendado:** Search Console + envío del sitemap (si no está hecho).

### Analítica
- **Obligatorio:** definir los eventos del embudo. Hoy hay GA4/GTM y un heatmap
  propio, pero **no puedo confirmar** que se midan los pasos de conversión.
  Mínimo: `calculadora_usada`, `registro_iniciado/completado`,
  `checkout_iniciado`, `pago_completado`, con el plan como parámetro.
- **Recomendado:** medir la tasa de error de la UI (los `catch` silenciosos son
  invisibles hoy).

### Negocio / conversión *(hipótesis — sin analítica no hay diagnóstico)*
- El producto tiene **muchísimo** alcance: 14 calculadoras, ~70 módulos de
  academia, opciones, journal, escáner. La hipótesis de riesgo es de **foco**, no
  de falta de funciones: cuesta explicar en una frase para quién es. La pregunta
  que hay que responder con datos, no con opinión, es qué usa realmente la gente
  — y para eso el mapa de calor de uso que ya existe en el admin es el sitio por
  donde empezar a mirar.

---

## 7. Ideas nuevas con sentido

Sólo ideas que encajan con lo que el producto ya es. Nada de relleno.

1. **Convertir el verificador de paridad en un patrón general.** Ya existe
   `test_candle_rules_parity_unit.py`, que compara los umbrales del JS contra el
   Python número a número. Esa idea —tests que vigilan que dos fuentes no
   deriven— es la mejor del repo y debería cubrir también los **planes y precios**
   (hoy el precio vive en Stripe, en el backend y en el copy de la web; ya hubo un
   incidente de "$9.99" contra 17 € real).

2. **Un "health check" de configuración en el panel admin.** Una tarjeta que diga
   en verde/rojo: Stripe configurado, NOWPayments configurado, SendGrid
   verificado, webhooks vistos en las últimas 24 h. La mitad de los bloqueantes de
   lanzamiento son de operación, invisibles desde el código. `webhook_health` ya
   existe en la BD: es la mitad del trabajo hecho.

3. **Exponer el diario como "tu ventaja real" en la portada.** La función más
   diferencial ya está construida (`JournalEdgeButton`: alimenta Kelly y Riesgo de
   Ruina con las operaciones **reales** del usuario). Casi ninguna calculadora
   gratuita hace eso. Es un argumento de venta, no una función escondida.

4. **Alertas de estructura, no sólo de precio.** El motor de `price_action.py`
   (BOS/CHoCH, FVG, S/R) ya detecta eventos. Las alertas hoy son sólo de precio.
   "Avísame si el BTC rompe estructura en 4H" es una función premium natural que
   reutiliza dos piezas que ya existen.

---

## 8. Plan de acción priorizado

### Fase 1 — Urgente (hecho en esta rama)
| Acción | Beneficio | Coste | Riesgo | Dependencias |
|---|---|:--:|:--:|---|
| Arreglar Fibonacci | Herramienta principal deja de estar caída | trivial | nulo | — |
| Linter vivo + en CI | Corta la causa raíz de casi todo lo demás | bajo | nulo | — |
| 11 tarjetas admin | Panel usable tras recargar | medio | bajo | — |
| Buscador admin | Se acaban los 500 | bajo | nulo | — |
| axios + `agent-browser` | Superficie y CI más ligeros | trivial | nulo | — |
| Reconciliar documentación | Deja de mandar a configurar OxaPay | bajo | nulo | — |

### Fase 2 — Alto impacto (siguiente)
| Acción | Beneficio | Coste | Riesgo | Dependencias |
|---|---|:--:|:--:|---|
| **Decidir el dominio propio** | Techo de SEO **y** de confianza | medio | medio | DNS, Pages, GCP CORS, OAuth |
| Verificar Stripe en real | Desbloquea el lanzamiento | medio | alto si falla | Acceso a Stripe |
| CSP en `index.html` | Defensa en profundidad | medio | **alto si no se verifica** | Navegador real |
| Dependabot + CodeQL | Vigilancia continua | bajo | nulo | Ajustes del repo |
| Eventos de embudo GA4 | Sin esto, la conversión es opinión | medio | bajo | — |

### Fase 3 — Optimización
| Acción | Beneficio | Coste | Riesgo | Dependencias |
|---|---|:--:|:--:|---|
| Tests del shim de BD | Protege la pieza más casera | medio | nulo | — |
| 128 avisos → 0 | Linter en `error` | medio | bajo | — |
| Lighthouse + `lucide-react` | Primer pintado | bajo | bajo | Sitio desplegado |
| Auditoría a11y manual | Alcance legal y humano | medio | nulo | — |
| Limpiar restos de Emergent | Menos confusión | trivial | nulo | — |

### Fase 4 — Escalado
| Acción | Beneficio | Coste | Riesgo | Dependencias |
|---|---|:--:|:--:|---|
| `server.py` → `app/routers/` | Mantenibilidad | alto | **alto** | Tests del shim primero |
| Alertas de estructura | Función premium diferencial | medio | bajo | `price_action.py` |
| Health check de configuración | Cierra el hueco de operación | bajo | nulo | `webhook_health` |
| Salir de CRA (Vite) | CRA está sin mantenimiento; mata ~40 vulns de build | alto | medio | Nada urgente |

---

## 9. Cambios de código

### 9.1 CSP para GitHub Pages (obligatorio, **verificar antes de mergear**)

En `frontend/public/index.html`, dentro de `<head>`:

```html
<!--
  GitHub Pages no permite definir cabeceras HTTP, así que el CSP tiene que ir
  como <meta>. OJO: la variante <meta> NO admite report-only — o la política es
  correcta a la primera, o rompe la web en producción. Verifícala con §9.2
  ANTES de mergear.
-->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://s3.tradingview.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.run.app https://www.google-analytics.com https://accounts.google.com https://api.stripe.com;
  frame-src https://s.tradingview.com https://www.tradingview.com https://accounts.google.com https://js.stripe.com https://www.paypal.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
">
```

> `'unsafe-inline'` en `script-src` es **necesario** mientras GTM y el snippet de
> GA4 estén en línea. Quitarlo exige nonces, que un sitio estático de Pages no
> puede generar por petición. Es un compromiso consciente, no un descuido.
>
> **Sustituye `https://*.run.app` por la URL exacta de Cloud Run.** El comodín
> vale para arrancar, pero lo correcto es fijar el host.

### 9.2 Cómo verificar el CSP sin romper producción

```bash
cd frontend && npm run build && npx serve -s build -l 5000
```

Con el sitio servido, recorre **con la consola abierta** y sin una sola línea
`Refused to …`: portada · registro y login (incluido Google) · dashboard con el
gráfico de TradingView · una calculadora · `/pricing` con Stripe y PayPal ·
cambio de idioma y de tema. Cualquier violación te dice el origen exacto que
falta. **Sólo entonces** mergear.

### 9.3 Que falte `FRONTEND_URL` falle pronto y fuerte (recomendado)

Hoy el default es `https://tradingcalculatorpro.com`, un dominio que **no se
sirve**. Los dos caminos de despliegue lo sobreescriben, así que producción está
bien — pero un tercer camino que lo olvide manda todos los correos de
recuperación de contraseña a un sitio muerto, en silencio.

```python
# backend/server.py — mismo criterio que ya se aplica a JWT_SECRET.
_FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if not _FRONTEND_URL:
    if _IS_PRODUCTION:
        # Sin esto, los enlaces de verificación y de recuperación de contraseña
        # apuntan a un dominio que no servimos: el usuario no puede entrar y
        # nadie se entera, porque el correo se envía "con éxito".
        raise RuntimeError("FRONTEND_URL es obligatoria en producción")
    _FRONTEND_URL = "http://localhost:3000"
```

### 9.4 Activar el dominio propio (cuando se decida)

Trabajo real, coordinado, en este orden:
1. `frontend/public/CNAME` con `tradingcalculatorpro.com`.
2. `homepage` en `package.json` y `PUBLIC_URL` a `/` en `deploy-gh-pages.yml`.
3. DNS (registros A de Pages + CNAME de `www`) y *Custom domain* en Pages.
4. `CORS_ORIGINS` y `FRONTEND_URL` del despliegue de Cloud Run **y** de
   `cloudbuild.yaml` (los dos caminos: si sólo cambias uno, un despliegue manual
   revierte el otro).
5. Origen autorizado en Google OAuth.
6. Regenerar SEO (`gen-seo-pages.js`, `gen-sitemap.js`) al dominio nuevo.
7. Search Console: propiedad nueva + sitemap.

> El paso 4 es el que rompe el login si se olvida, y es el menos evidente.

### 9.5 SSL relajable sólo en desarrollo (opcional, cierra M-5)

```python
# backend/server.py, en init_pool, rama TCP:
import ssl as _ssl
# Sólo en desarrollo: contra un Postgres local no hay certificado que verificar
# y la orden documentada falla con CERTIFICATE_VERIFY_FAILED. En producción NO
# se ofrece la opción, a propósito.
if not _IS_PRODUCTION and os.environ.get("DB_SSL", "").lower() in ("0", "false", "disable"):
    ssl_ctx = False
else:
    ssl_ctx = _ssl.create_default_context()
```

---

## 10. Checklist final de excelencia

**Bloqueantes de lanzamiento**
- [ ] Stripe verificado en real: productos, price IDs, webhook `whsec_…`
- [ ] NOWPayments: API key + IPN secret + callback registrado, probado en sandbox
- [ ] Todos los secretos presentes en GitHub Actions y GCP Secret Manager
- [ ] Google OAuth: origen `https://abcde-rgb.github.io` autorizado
- [ ] SendGrid: dominio remitente verificado
- [ ] Decisión tomada y ejecutada sobre el **dominio propio**

**Seguridad**
- [x] Cabeceras de seguridad en la API · [x] Rate limiting con clave no falsificable
- [x] 2FA de admin no desactivable en producción · [x] Shim a prueba de inyección
- [x] Sin secretos en el repo · [x] axios sin vulnerabilidades
- [ ] **CSP en el HTML** (§9.1 + §9.2) · [ ] Dependabot + CodeQL + secret scanning
- [ ] C-08 cerrado (API keys sólo en Secret Manager) · [ ] `FRONTEND_URL` obligatoria

**Calidad**
- [x] Build exit 0 · [x] 264 tests · [x] ESLint 0 errores · [x] Lint en CI
- [x] `py_compile` de los 16 módulos · [x] i18n 5327 × 8 sin huecos
- [ ] 128 avisos a 0 y `no-unused-vars` en `error` · [ ] Tests del shim de BD

**Rendimiento / SEO / A11y**
- [x] Split de rutas, locales lazy, libs pesadas fuera del chunk de entrada
- [x] 744 URLs con hreflang · [x] `noindex` en páginas privadas
- [x] `lang`/`dir` en runtime · [x] `prefers-reduced-motion`
- [ ] Lighthouse real · [ ] Reglas `jsx-a11y` activadas y a 0 · [ ] Teclado y lector

**Producto**
- [ ] Eventos del embudo definidos y verificados en GA4
- [ ] Health check de configuración en el admin
- [ ] Restos de Emergent a `_archive/`

---

## 11. Qué necesito para afinar más

Datos concretos que hoy no tengo y que cambiarían el diagnóstico:

1. **¿El dominio `tradingcalculatorpro.com` está comprado y a tu nombre?** Es la
   decisión de la que cuelga la mitad de la Fase 2.
2. **Acceso a GA4** (o una exportación): tráfico, páginas más vistas, embudo de
   registro y de checkout. Sin esto, todo lo de conversión es hipótesis.
3. **Un informe de Lighthouse** del sitio desplegado (móvil y escritorio).
4. **Capturas o acceso a la web en producción** para poder juzgar UX/UI de verdad
   en lugar de inferirla del código.
5. **¿Está Stripe operativo?** ¿Hay ya pagos reales, o sigue todo en test?
6. **¿Quién es el usuario objetivo?** El producto sirve hoy desde principiante
   absoluto hasta operador de opciones. Saber a quién priorizas cambia por
   completo las recomendaciones de foco.
7. **¿`agent-browser` lo usabas para algo?** Lo he quitado por no estar
   referenciado en ningún sitio; si lo usabas en local, dilo y lo devuelvo como
   dependencia de desarrollo.
