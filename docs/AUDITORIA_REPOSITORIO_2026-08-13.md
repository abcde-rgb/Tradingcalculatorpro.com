# 🔍 Auditoría del repositorio — lo obsoleto, lo perdido y lo que se pasó por alto

> 📅 **Fecha:** 2026-08-13 · **Base:** `origin/main` en `6c88815`
> 🎯 **Encargo:** revisar el proyecto y redactar qué está obsoleto, qué se ha pasado
> por alto y qué **no está todavía en el repositorio de GitHub**.
>
> Documentos hermanos: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) (estado vivo) ·
> [`PENDIENTES.md`](./PENDIENTES.md) (tareas abiertas) · [`DIARIO_BUGS.md`](./DIARIO_BUGS.md)
> (historial de bugs) · [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) (lanzamiento).

---

## 0. Alcance: qué he podido revisar y qué no

**Lo que NO he podido hacer, y conviene que conste antes de leer nada más:** no tengo
acceso a las conversaciones anteriores. Cada sesión arranca en frío, sin historial de
chats. Así que «revisar todos los chats» no es literalmente posible.

Lo que sí he hecho es reconstruir el rastro de esas conversaciones desde donde queda
fijado: **el historial de git**. Cada sesión de trabajo dejó commits, ramas y pull
requests, y ahí es donde aparece lo que se decidió, lo que se escribió y —esto es lo
importante— **lo que se escribió y nunca llegó a `main`**. Una rama abandonada es el
fósil de una conversación que terminó sin cerrarse.

**Fuentes revisadas:**

| Fuente | Volumen |
|---|---|
| Ramas remotas en GitHub | 43 |
| Pull requests (abiertos + cerrados) | 20 abiertos · 40 cerrados revisados |
| Registro de sesiones (§7 de `ESTADO_PROYECTO.md`) | ~90 entradas, del 2026-06-25 al 2026-08-12 |
| Diario de bugs | hasta BUG-057 |
| Documentación | 38 documentos en `docs/` + `CLAUDE.md` + `README.md` |
| Código | 28 módulos backend (23 379 líneas) · frontend React |

**Verificaciones ejecutadas hoy** (todas offline, sin red):
`python -m py_compile *.py` (28 módulos ✅) · `check-doc-links.py` (56 documentos, 0
roturas ✅) · `gen-instruments-js.py --check` (paridad ✅) · `i18n-check.js` (6110
claves × 10 idiomas, 0 huecos ✅) · `engine-check.js` (197/197 ✅).

**No pude ejecutar** `pytest`, `eslint` ni `npm run build`: las dependencias no están
instaladas en este entorno. Cuando cito cifras de esas tres, digo de dónde salen y no
las presento como verificadas hoy.

---

## 1. Resumen ejecutivo — los cinco hallazgos que más pesan

1. **Hay trabajo terminado que nunca entró en `main`.** 6 pull requests de producto
   llevan **11 días abiertos** y 4 ramas más tienen commits sin PR ninguno. Entre ellos:
   un arreglo de honestidad del escáner, una pestaña de posicionamiento de dealers, las
   métricas avanzadas del diario, el país e idioma en el registro y **dos auditorías
   completas del proyecto que no existen en el repositorio**. → [§2](#2)

2. **El pull request #178 es una bomba abierta.** Es un *revert* del multiproducto
   (catálogo de instrumentos, unidades, apalancamiento). El multiproducto **sí está**
   en `main` desde el 8 de agosto. Si alguien fusiona ese PR por error, deshace la
   pieza sobre la que se apoyan el diario, el P&L y `instruments.py`. Ciérralo hoy.
   → [§2.1](#21)

3. **Las páginas de calculadora anuncian precio 0 a Google, y el producto es de pago
   íntegro desde el 2 de agosto.** `gen-seo-pages.js` emite `"price": "0"` en el
   JSON-LD, con títulos que dicen «Gratis» y «Free», mientras `index.html` declara
   17/45/200 €. Google recibe dos ofertas contradictorias del mismo producto. → [§4.3](#43)

4. **Las passkeys no existen en la documentación.** `backend/passkeys.py` (242 líneas)
   añadió un método de autenticación completo el 12 de agosto. `CLAUDE.md` no lo
   menciona; `ESTADO_PROYECTO.md` tampoco. La sección «Autenticación» de `CLAUDE.md`
   sigue describiendo un mundo de JWT + Google OAuth. → [§4.1](#41)

5. **El día entero de seguridad no está en el registro de sesiones.** Los tres commits
   del 10 de agosto —bypass de 2FA, *account pre-hijacking* y passkeys— no dejaron
   entrada en §7, ni tampoco los cuatro de hoy sobre el escáner. Sí están en
   `DIARIO_BUGS.md`, que es lo que salva la trazabilidad. → [§5](#5)

---

<a id="2"></a>
## 2. Lo que NO está en el repositorio (`main`)

El árbol de trabajo está limpio y no hay nada sin commitear. Lo que falta no está en
tu disco: está **en ramas de GitHub que nunca se fusionaron**.

### <a id="21"></a>2.1 Pull requests de producto abiertos (6 + 1 peligroso)

Todos creados el **2026-08-02**. Llevan **11 días** parados.

| PR | Rama | Qué contiene | Verificado |
|:--:|---|---|---|
| **#161** | `claude/temas-contraste-wcag` | Atmósfera propia por tema, **un fallo de contraste real en modo claro**, verificador `theme-contrast-check.js` **con paso en CI**, y el escáner vistiéndose del activo que lee | `frontend/scripts/theme-contrast-check.js` no existe en `main` |
| **#162** | `claude/escaneres-datos-honestos` | **Arreglo de honestidad del escáner**: el precio de referencia de soportes/resistencias se etiqueta (fuente, fecha, antigüedad) y admite cotización viva; ratio put/call sin OI; detecciones marcadas como provisionales; `test_scanner_data_unit.py` | `price_action.py` en `main` sigue usando `rows[-1].get("close")` **sin etiquetar** |
| **#163** | `claude/opciones-vanna-charm-metricas` | Pestaña **Dealers** (GEX por strike + vanna/charm), **métricas avanzadas del diario visibles** (SQN, Calmar, Ulcer, Z-score, VaR/CVaR), auditoría integral en `docs/` | `DealerPositioning.jsx` no existe en `main` |
| **#164** | `claude/lucide-v1-linkedin` | `lucide-react` 0.507 → 1.27 con el icono de LinkedIn portado a mano | — |
| **#165** | `claude/acceso-comp` | **Acceso premium de cortesía por correo**, sin pasar por Stripe | No hay rastro de `FREE_ACCESS_EMAILS` en `main` |
| **#169** | `claude/web-redesign-calculator-analysis-cz5tvc` | `REDISENO_PARIDAD_2026-08-02.md` y `PLAN_JOURNAL_OPCIONES_2026-08-02.md` | Ninguno de los dos existe en `main` |
| ⚠️ **#178** | `revert-177-claude/…-ytk889` | **Revert del multiproducto** (catálogo, unidades, apalancamiento, costes) | **`main` SÍ tiene el multiproducto** (PR #180, 08-08). Este PR abierto lo deshace |

> **Patrón preocupante:** #161, #162, #163 y #165 son **la segunda vida** de PRs que ya
> se cerraron sin fusionar el 2026-08-02 (#140, #154, #159 y #117 respectivamente).
> El mismo trabajo lleva dos rondas sin entrar. No es que se olvidara una vez: se ha
> olvidado dos.

### 2.2 Ramas con trabajo y **sin ningún pull request**

Esto es lo verdaderamente invisible: no aparece en la pestaña de PRs, así que no hay
nada que recuerde su existencia.

| Rama | Fecha | Commits | Contenido que no está en `main` |
|---|:--:|:--:|---|
| **`claude/project-complete-audit-a6qg1c`** | **2026-08-10/11** | 6 | **Lo más reciente que se ha perdido.** `docs/AUDITORIA_2026-08-10.md`, `docs/COMPETENCIA_Y_PASARELA_BROKERS.md` (estudio de competencia, pasarelas de datos de broker, licencias de redistribución e IBKR), `lib/legalContent/entity.js` (**datos de la entidad legal**), 2 tests nuevos (`test_app_settings_roundtrip_unit.py`, `test_chain_honesty_unit.py`) y cambios en Landing/Legal/Settings con los 10 idiomas. 40 ficheros, +2779 líneas |
| **`claude/competitive-feature-analysis-8mzm3p`** | 2026-07-24 | 10 | **País e idioma en el registro** (`lib/countries.js`, también con Google, visibles en Admin) · **Monte-Carlo en el Simulador Pro** y corrección del *max drawdown* (running peak, no pico global vs mínimo: un bug real) · `purchase` de GA4 con dedupe · `docs/CRECIMIENTO_GOOGLE.md` y `docs/CHECKLIST_MODO_CASI_GRATIS.md` |
| **`claude/trading-setup-diary-analytics-pfd0gk`** | 2026-08-06 | 1 | `docs/PLAN_DIARIO_ANALITICA_MAESTRO.md` |
| **`claude/restructure-org-scanner-f5a8i6`** | 2026-08-06 | 1 | «Estudio del stop loss y curva de calibración sobre datos reales» (el PR #176 de esta rama sí se fusionó, pero **este commit posterior no**) |

> 🔑 **Esto resuelve un misterio de la documentación.** `PENDIENTES.md` acumuló
> referencias a `CRECIMIENTO_GOOGLE.md` y `CHECKLIST_MODO_CASI_GRATIS.md`, y el hueco
> G-18 lo atribuye a que `check-doc-links.py` no corre en CI. La causa es más
> interesante: **esos dos documentos existen de verdad**, en la rama
> `claude/competitive-feature-analysis-8mzm3p`. No eran erratas, eran huellas de
> trabajo que se quedó fuera.

### 2.3 Dependencias: 11 pull requests de Dependabot abiertos

| Antigüedad | PRs |
|---|---|
| Desde el **14 de julio** (30 días) | `actions/checkout` 4→7 (#104) |
| Desde el 28 de julio | `cloud-sql-python-connector` 1.12.1→1.21.0 · `google-cloud-secret-manager` 2.22→2.30 · 3 de `@radix-ui` |
| Desde el 4 de agosto | `scipy` 1.14.1→1.17.1 · `react-router-dom` · `react-hook-form` · `actions/setup-python` 5→7 |
| Desde el 11 de agosto | `numpy` 2.1.3→2.4.6 · `pydantic-settings` 2.7→2.15 · `codeql-action` 3→4 |

`scipy` y `numpy` son las que sostienen Black-Scholes y las griegas: saltar cinco
versiones menores de golpe más adelante duele más que hacerlo ahora, y hay 761
funciones de test para respaldar el salto.

### 2.4 Ramas muertas que sólo hacen ruido

- **`web-analysis`** — 295 commits desde el 2026-06-06, historia paralela que no
  comparte camino con `main`. Es el import original.
- **`claude/stoic-mayer-04dpp2`** — 12 commits de julio (Revolut, NOWPayments, legal
  ×8) cuyo contenido **sí está** en `main` por otras vías; la sesión 41 está registrada.
- **`claude/digital-project-audit-3upqfd`** y **`claude/revert-redesign-3upqfd`** — el
  rediseño que se revirtió a petición tuya. Cerrado, pero las dos ramas siguen ahí.
- 8 ramas más con `ahead=0`: ya fusionadas, sin motivo para existir.

---

## 3. Lo obsoleto

### 3.1 Residuos de la plataforma de origen (Emergent)

`CLAUDE.md` ya avisa de que `.emergent/emergent.yml` es «un residuo inofensivo». Hay
más, y algunos no son inofensivos porque **dan instrucciones falsas a quien los lea**:

| Ruta | Qué es | Por qué sobra |
|---|---|---|
| `backend/patches/server_fixes.patch` | Parche manual de mayo 2026 | Contiene `MONGO_URL` — la base de datos que se **descartó**. Manda aplicar a mano parches ya aplicados |
| `backend/FIXES_README.md` | «Cómo integrar `fixes.py` en `server.py`» | **`fixes.py` no existe** en el repositorio |
| `backend/ADMIN_INTEGRATION.md` | «Pasos para integrar `admin_routes.py`» | Ya está integrado desde hace meses (`startup_event`) |
| `memory/PRD.md` | 58 KB de documento de producto original | Sin actualizar desde el origen; `ESTADO_PROYECTO.md` es la fuente de verdad |
| `monitoring/dashboard.json` | Panel de monitorización | No lo consume ningún workflow ni `cloudbuild.yaml` |
| `packaging/twa-manifest.json` | Empaquetado Android (TWA) | El `.gitignore` excluye `packaging/android/` y el keystore; queda el manifiesto suelto |
| `check.sh` (raíz) | Verificador de endpoints por curl | Anterior a `backend/tests/` (45 ficheros) y a la skill `qa`. Ya lleva un comentario admitiendo que apuntaba al host equivocado |
| `_archive/` | 2 ficheros, 75 KB | Ya declarado retirado en `CLAUDE.md`; nadie lo importa |

### 3.2 Rastros de tecnologías retiradas

La retirada de OxaPay, MaxelPay, CoinGecko y AdSense se hizo **bien** —no queda código
vivo de ninguna—, pero quedaron cicatrices que confunden:

- **`backend/server.py:8061`** — el ajuste `coinbase_api_key` sigue en la lista de
  `app_settings`, comentado como *«legacy/unused — superseded by OxaPay»*. Un ajuste
  muerto justificado por una pasarela que tampoco existe.
- **`backend/nowpayments.py`** y **`backend/revolut.py`** — 4 comentarios describen el
  modelo de cobro «igual que el flujo de OxaPay». La comparación ya no se puede
  comprobar contra nada.
- **`COINGECKO_SYMBOL_TO_ID`** en `stock_data.py`, importado por `realtime_alerts.py`:
  el nombre del mapa sobrevivió al proveedor. No hay ninguna llamada a
  `api.coingecko.com` en el repositorio (**verificado**), pero el símbolo sigue diciendo
  lo contrario.
- **`frontend/scripts/gen-seo-pages.js:55`** — quedó una cabecera de sección
  `─── Publicidad (Google AdSense) ───` cuyo cuerpo se borró, dejando **un comentario
  cortado a mitad de frase** («…se replica aquí, en») seguido de código sin relación.
  Dice que la página replica la lógica de ocultar anuncios; no lo hace, porque ya no
  hay anuncios.
- **`frontend/src/pages/OptionsStrategyPage.jsx:112`** — comentario sobre dónde colocar
  un anuncio para no arriesgar «la suspensión de la cuenta de AdSense».
- **`backend/missing_apis.py:8`** — la cabecera del módulo aún documenta *«Crypto OHLC
  via yfinance (not only CoinGecko 11)»*.

### 3.3 Documentación caducada

**Lo más grave: `PENDIENTES.md` afirma como abierto algo que está cerrado y verificado.**

| Documento | Afirma | Realidad (verificada hoy) |
|---|---|---|
| `PENDIENTES.md` §Cumplimiento | «`trading_plans` no se borra ni se exporta» (G-15) | **Falso.** `trading_plans` está en `_USER_DATA_COLLECTIONS` (`server.py:1680`), del que derivan las otras tres listas. `ESTADO_PROYECTO.md` lo da por cerrado el 06-08 y verificado contra Postgres el 07-08 |
| `PENDIENTES.md` §Endurecimiento | «`FRONTEND_URL` cae a `https://tradingcalculatorpro.com` en cuatro sitios» | **Falso.** `DEFAULT_FRONTEND_URL` es hoy `https://abcde-rgb.github.io/Tradingcalculatorpro.com` (`server.py:1167`) |
| `PENDIENTES.md` §Contenido | «los 5652 términos» | Son **6110** |
| `PENDIENTES.md` §Contenido | «Futuros: no hay ni selector de instrumento ni valor de tick» | El multiproducto entró el 06-08: `instruments.py` + `instrumentSpecs.generated.js` |

Un documento de pendientes que manda arreglar lo ya arreglado hace perder una sesión
entera. Es el mismo error que la cabecera de `ESTADO_PROYECTO.md` denuncia con OxaPay y
con AdSense, sólo que en otro fichero.

**Documentos que ya son historia y siguen en `docs/` como si fueran vigentes** (la
convención del repositorio manda las fotos fechadas a `docs/historico/`):

`ANALISIS_2026-06-25.md` · `EXAMEN_FINAL_2026-07-26.md` · `AUDITORIA_2026-07-27.md` ·
`BACKLOG_AUDITORIA_2026-07-27.md` · `ANALISIS_COMPETENCIA_2026-07-19.md`. Diez
documentos más no se han tocado desde el 18–23 de julio.

**Documentos fuera del índice** (`docs/README.md` no los enlaza):
`AUDITORIA_DIARIO.md`, `MIGRACION_DOMINIO.md` y los 4 de `docs/historico/`.

### 3.4 Código muerto en el frontend

20 componentes `.jsx` que **ningún fichero importa**:

- **17 de `components/ui/`** (1318 líneas): `drawer`, `avatar`, `alert-dialog`,
  `input-otp`, `carousel`, `command`, `pagination`, `toggle-group`, `navigation-menu`,
  `context-menu`, `resizable`, `aspect-ratio`, `hover-card`, `menubar`, `radio-group`,
  `scroll-area`. Andamiaje de shadcn/ui que nunca se usó.
- **3 propios** (933 líneas): `options/GreeksPanel.jsx` (126, sustituido por
  `GreeksStrip`), `education/TradingBasicsGuide.jsx` (670),
  `education/WhyItMatters.jsx` (59), `dashboard/PriceTicker.jsx` (78).

Y lo que cuesta dinero de verdad: **10 de los 27 paquetes `@radix-ui` declarados en
`package.json` sólo los usan esos componentes muertos** — `alert-dialog`,
`aspect-ratio`, `avatar`, `context-menu`, `hover-card`, `menubar`, `navigation-menu`,
`radio-group`, `scroll-area`, `toggle-group`. Se instalan, se auditan, generan PRs de
Dependabot y no llegan a ninguna pantalla.

---

## 4. Lo que se ha pasado por alto

Ordenado por lo que cuesta si no se toca.

### <a id="41"></a>4.1 🔴 Las passkeys no están documentadas en ninguna parte

`backend/passkeys.py` (242 líneas) entró el 2026-08-10 con el commit *«Passkeys: acceso
sin contraseña y resistente al phishing»*. Comprobado:

- `CLAUDE.md` → **0 menciones**. Su tabla de módulos no lo lista, y la sección
  «Autenticación» describe sólo JWT + cookies + Google OAuth.
- `ESTADO_PROYECTO.md` → **0 menciones**, ni en el inventario (§2) ni en el semáforo.
- `DIARIO_BUGS.md` → sí lo recoge (2 menciones), que es lo que salva la trazabilidad.

Es un **método de autenticación entero** invisible para quien retome el proyecto. Y
tiene una arista técnica sin anotar: `passkeys.py:63` usa como origen por defecto
`https://abcde-rgb.github.io` **sin la ruta del repositorio**, a diferencia de los otros
tres sitios donde se resuelve `FRONTEND_URL`. Para WebAuthn el *origin* no lleva ruta,
así que probablemente es correcto — pero es justo la clase de asimetría que hay que
dejar escrita antes de que alguien la «arregle» y rompa el login.

`migrate_trades_schema.py` (168 líneas) tampoco está en la tabla de `CLAUDE.md`.

### 4.2 🔴 Hyperliquid: una tarjeta de afiliado que no paga

`frontend/src/components/common/RecommendedTools.jsx:22`:

```js
// TODO(pendiente): reemplazar por el enlace de referido real de Hyperliquid
url: 'https://app.hyperliquid.xyz/',
```

La tarjeta está **en producción**, con `rel="sponsored"`, junto a la de Margex (que sí
lleva `?rid=44932212`). Cada clic que se lleva Hyperliquid desde tu web es tráfico
regalado: comisión cero. Está anotado en `PENDIENTES.md` desde el 25 de julio y sigue
igual **19 días después**. El logo también es un SVG provisional.

### <a id="43"></a>4.3 🟠 A Google le dices que la app es gratis, y es de pago íntegro

Desde el 2026-08-02 el sitio tiene **muro de pago duro** (PR #167: «Retirar AdSense y
cerrar todo el contenido tras el muro de pago»). Pero:

- `frontend/scripts/gen-seo-pages.js:421` emite en el JSON-LD de cada página de
  calculadora: `offers: { '@type':'Offer', price:'0', priceCurrency:'EUR' }`.
- Los títulos de esas mismas páginas —los que salen en azul en Google— dicen
  *«Calculadora de Tamaño de Posición — **Gratis** y Profesional»* y *«Position Size
  Calculator — **Free** & Professional»*. Son 12 slugs × los idiomas con traducción.
- El botón de esas páginas apunta a `/dashboard?tab=…`, que exige suscripción activa.
- Mientras tanto `frontend/public/index.html` declara para el **mismo producto**
  ofertas de **17,00 / 45,00 / 200,00 €**.

Google recibe dos declaraciones estructuradas contradictorias y una promesa que la
página de destino no cumple. Hay una prueba gratuita de 7 días (con tarjeta), así que
«gratis» no es una mentira completa — pero `price: "0"` sí lo es, y es el campo que las
máquinas leen.

### 4.4 🔴 G-14 sigue exactamente igual, y ya lleva así desde julio

Verificado hoy con grep sobre `frontend/src`, filtrando i18n y contenido educativo:

| Endpoint | Llamadas desde el frontend |
|---|:--:|
| `/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance` | **0** |
| `/backtest/validate`, `/backtest/strategies` | **0** |
| `/performance/portfolio-risk` | **0** |
| Opciones americanas / asignación temprana | **0** |
| `/options/term-structure` | **0** |

Son ~1770 líneas escritas y probadas que ningún usuario puede alcanzar. `ESTADO_PROYECTO.md`
lo llama «el mayor hueco abierto del proyecto» y `PLAN_DE_TRADING_spec.md` ya tiene la
especificación de la pantalla. Sigue siendo el mejor sitio donde poner la próxima sesión.

### 4.5 🟠 El escáner sigue etiquetando soportes contra un precio sin fecha

`price_action.py:905` toma `current_price = rows[-1].get("close")` y de ahí sale el
reparto entre soporte y resistencia. En un gráfico diario después del cierre eso es el
cierre de hoy; un sábado, el del viernes; en mensual, el cierre corriente del mes. El
usuario lee «resistencia» sobre un nivel que el precio ya cruzó.

El arreglo —etiquetar la fuente, la fecha y la antigüedad de la referencia, y aceptar
cotización viva— **está escrito** en el PR #162, abierto desde el 2 de agosto. Encaja
con la regla nº1 de honestidad numérica del proyecto: *nada de datos sin etiquetar*.

### 4.6 🟠 Ajustes y deuda de seguridad que llevan meses anotados

- **C-08** — `sendgrid_api_key`, `revolut_api_key`, `nowpayments_api_key` y
  `coinbase_api_key` siguen siendo sobreescribibles desde `app_settings` (BD, en claro).
  La decisión tomada fue «sólo Secret Manager». Sin ejecutar.
- **`detail=str(e)`** en **10 puntos** del backend: devuelve al cliente el texto del
  error interno.
- **G-10, CSP en el HTML de Pages** — el mayor hueco de seguridad abierto. GitHub Pages
  no permite cabeceras, así que hay que ponerlo como `meta http-equiv`, y el `meta` no
  admite modo report-only: hay que enumerar orígenes y probar en navegador.
- **G-17, el shim `Collection` sin tests** — ~750 líneas de las que depende **todo** el
  backend, y bloquean el refactor de `server.py`, que ya va por **9097 líneas**.

### 4.7 🟡 El dominio propio sigue sin usarse

No hay `frontend/public/CNAME`. Todo el SEO —canonical, hreflang de los 10 idiomas,
sitemap, JSON-LD— apunta a `abcde-rgb.github.io/Tradingcalculatorpro.com`. Es
**coherente**, que es lo importante, pero el producto se llama TradingCalculator.Pro,
el repositorio se llama así y los correos remitentes son `@tradingcalculatorpro.com`.
Cuanto más tarde se active el dominio, más autoridad de enlaces habrá que redirigir.

### 4.8 🟡 Otros cabos sueltos verificados

- **Purga por retención sin planificador.** `purge_lapsed_user_data` sólo corre en
  `startup_event`. Con `min-instances=1`, un contenedor que no se reinicie en semanas
  no purga nada. Falta el Cloud Scheduler.
- **Despliegue del backend a mano** desde el 2026-08-03: no hay workflow, se lanza
  `cloudbuild.yaml` desde GCP. Un despliegue manual es un despliegue que se olvida.
- **Los parsers nuevos nunca han visto la red real.** BCE, Binance, Kraken y el Tesoro
  se escribieron y probaron contra muestras porque el sandbox no tiene salida. El
  primer contacto de verdad será en producción, con usuarios delante.
- **`pt` e `it` sin revisión nativa**, anunciados como idiomas completos.
- **`/affiliate` sin decidir**: hoy es sólo-auth, y el backend rechaza a quien no paga.
  El usuario ve una página que no puede usar.

---

<a id="5"></a>
## 5. Deriva documental: lo que dice la doc vs. lo que mide el código

Medido hoy contra `main`:

| Métrica | Dice `ESTADO_PROYECTO.md` | Real (2026-08-13) | Δ |
|---|:--:|:--:|:--:|
| Módulos del backend | 24 | **28** | +4 |
| Líneas de `server.py` | 8232 | **9097** | +865 |
| Ficheros de test | 34 | **45** | +11 |
| Funciones de test | 503 → 718 | **761 definidas** | — |
| Claves i18n | 5995 | **6110** | +115 |
| Rutas en `App.js` | 26 | **27** | +1 |
| Documentos que revisa `check-doc-links` | 47 | **56** | +9 |
| `engine-check` | 197/197 | **197/197** ✅ | — |

Y en la cabecera del propio documento:

- «Última verificación real contra el código: **2026-08-08**» — pero el fichero se
  modificó el 13, y las cifras de §1 y §2 son las del 3 al 8 de agosto.
- «Rama de trabajo actual: `claude/github-branches-cleanup-cfef9j`» — esa rama lleva
  parada desde el 8 de agosto.

**El registro de sesiones (§7) cubre bien el 12 de agosto** (glosario 68→109 y sello de
revisión, dos entradas). Lo que falta son **8 commits de tres días distintos**:

| Fecha | Commits sin entrada en §7 | Comprobación |
|---|---|---|
| 2026-08-09 | Simulador Pro reordenado, comisiones visibles | sin entrada de esa fecha |
| **2026-08-10** | **Auditoría ofensiva (bypass de 2FA + 3 huecos)**, **account pre-hijacking del enlazado con Google**, **passkeys** | «ofensiva», «passkey» y «pre-hijacking» → **0 apariciones** en todo el documento |
| 2026-08-13 | Escáner a la temporalidad del gráfico, tira de prueba de velas, crash del panel, tests de aritmética | sin entrada de esa fecha |

El día 10 es el que más duele: **una jornada entera de seguridad sin rastro en la fuente
de verdad del proyecto.** `DIARIO_BUGS.md` sí la recoge —por eso no se ha perdido—, pero
la regla del skill `estado-proyecto` es que se actualicen los dos, y quien lea el
semáforo hoy no sabrá que existen ni las passkeys ni los cuatro huecos cerrados.

---

## 6. Qué haría yo, y en qué orden

**Hoy, media hora, sin escribir código:**

1. **Cerrar el PR #178.** Es un revert de algo que está vivo en `main`. Riesgo puro sin
   beneficio.
2. **Decidir uno por uno los 6 PRs de producto**: fusionar o cerrar. Once días abiertos
   es la peor de las dos opciones, porque cada día que pasa `main` se aleja y el
   conflicto crece. Mi orden: **#162 primero** (es honestidad de datos, la regla nº1 del
   proyecto), luego #163, #161, #164, #169, #165.
3. **Rescatar `claude/project-complete-audit-a6qg1c`.** Es de anteayer, son dos
   auditorías, dos tests y los datos de la entidad legal. Nada de eso existe en el
   repositorio y no hay ningún PR que lo recuerde.
4. **Borrar las ramas muertas** (`web-analysis`, `stoic-mayer`, las 8 con `ahead=0`)
   *después* de comprobar que no llevan nada — no antes.

**Esta semana:**

5. **Poner el enlace de referido real de Hyperliquid**, o retirar la tarjeta. Cada día
   son clics regalados.
6. **Quitar `price: '0'`** de `gen-seo-pages.js` y alinear los títulos «Gratis»/«Free»
   con lo que el usuario encuentra al llegar.
7. **Corregir `PENDIENTES.md`**: G-15 está cerrado, `FRONTEND_URL` está corregido, los
   futuros ya tienen instrumento. Un documento de pendientes con datos falsos es peor
   que no tenerlo.
8. **Documentar las passkeys** en `CLAUDE.md` (tabla de módulos + sección
   «Autenticación») y en el inventario de `ESTADO_PROYECTO.md`.
9. **Añadir `check-doc-links.py` a `ci.yml`** — 3 líneas, y cierra G-18.
10. **Fusionar los Dependabot** de `numpy` y `scipy` con el suite en verde delante.

**Cuando haya sesión larga:**

11. **G-14: la pantalla del plan de trading.** ~1770 líneas esperando una interfaz, con
    la especificación ya escrita.
12. **G-17: tests del shim `Collection`**, que es lo que desbloquea partir `server.py`.
13. **Limpieza**: los 20 componentes muertos, los 10 paquetes `@radix-ui` huérfanos, y
    los residuos de `backend/patches/`, `FIXES_README.md`, `ADMIN_INTEGRATION.md`.

---

## 7. Anexo — cómo reproducir esta auditoría

```bash
# Ramas con trabajo sin fusionar
for b in $(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||'); do
  git fetch origin "$b" -q
  echo "$b ahead=$(git rev-list --count origin/main..FETCH_HEAD)"
done

# Ficheros que una rama tiene y main no
git diff --name-status $(git merge-base origin/main FETCH_HEAD) FETCH_HEAD | grep '^A'

# Componentes del frontend que nadie importa
cd frontend/src && for f in $(find . -name "*.jsx"); do
  b=$(basename "$f" .jsx)
  [ "$(grep -rl "\b$b\b" . --include=*.js --include=*.jsx | grep -v "$f" | wc -l)" -eq 0 ] && echo "$f"
done

# Endpoints del backend sin consumidor en el frontend
grep -rn "plan/compliance\|portfolio-risk\|backtest/validate\|term-structure" frontend/src

# Verificadores offline del repositorio
cd backend && python -m py_compile *.py
python scripts/check-doc-links.py
python scripts/gen-instruments-js.py --check
cd frontend && node scripts/i18n-check.js && node scripts/engine-check.js
```

**Lo que este documento NO cubre**, y hay que hacer con el entorno montado:
`pytest`, `eslint`, `npm run build` y todo el banco E2E de la skill `qa` (Playwright
contra la aplicación viva). Nada de lo que afirmo aquí depende de ellos.
