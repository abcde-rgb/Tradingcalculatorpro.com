# 🔬 Auditoría integral — 2026-08-10

> Examen completo del proyecto: contenido, cálculos, APIs, fuentes de datos, normativa y
> panel de administración. Todo lo que aparece aquí está **verificado contra el código**
> de la rama `claude/project-complete-audit-a6qg1c`; lo que se probó ejecutándolo lleva la
> etiqueta **[PROBADO]** con la evidencia.
>
> Documento hermano: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) (estado vivo) ·
> [`DIARIO_BUGS.md`](./DIARIO_BUGS.md) (historial con causa raíz).

---

## 0. Estado base (lo que sí está verde)

Antes de la lista de problemas, el punto de partida, medido hoy:

| Comprobación | Resultado |
|---|---|
| `pytest tests/` (Postgres 16 real) | **761 passed, 74 skipped** en 14,6 s |
| `npm run build` | exit 0 · **39 MB** · **1589 URLs** en el sitemap |
| `npx eslint src scripts` | **0 errores**, 123 avisos |
| `node scripts/i18n-check.js` | **6019 claves × 10 idiomas, 0 huecos** |
| `node scripts/engine-check.js` | **197/197** |
| `gen-instruments-js.py --check` | paridad backend ↔ frontend OK |
| `check-doc-links.py` | 55 documentos, 0 enlaces rotos |

La base de ingeniería es sólida. **Ninguno de los problemas graves de esta auditoría los
detecta la batería de comprobaciones actual** — y eso es, en sí mismo, el hallazgo
estructural: lo que se rompe aquí no es la matemática, es la frontera entre módulos, entre
el código y lo que el sitio *afirma*, y entre el producto y la ley.

---

## 1. 🔴 Riesgo legal inmediato — testimonios fabricados

**Dónde:** `frontend/src/lib/i18n/es.js:2454-2465` (y sus 9 traducciones) ·
`frontend/src/pages/LandingPage.jsx:604`

La portada publica tres testimonios con nombre, perfil y antigüedad inventados:

- «Carlos M. · Day Trader Cripto · 4 años»
- «Ana R. · Swing Trader Opciones» — *«Justifico el coste cada mes con una sola operación bien planeada»*
- «David L. · Trader Independiente · Forex» — *«Llevo 8 meses usándolo a diario… 5 estrellas»*

Y encima de ellos: **«Cientos de traders profesionales y particulares ya optimizan sus
estrategias con Trading Calculator PRO»** — sobre un producto que, según la propia
`ESTADO_PROYECTO.md`, todavía tiene Stripe sin verificar en producción y ni siquiera el
dominio en uso. No hay cientos de traders. No hay ninguno.

**Por qué es lo más grave del repositorio:**

1. La Directiva Ómnibus **(UE) 2019/2161** metió en el **Anexo I** de la Directiva
   2005/29/CE (la «lista negra») el hecho de publicar reseñas o recomendaciones de
   consumidores falsas. Lo que está en el Anexo I es **desleal en toda circunstancia**: no
   hay ponderación caso por caso, no hay defensa posible, se sanciona por existir.
2. En España, la trasposición (RDL 1/2007, tras la Ley 4/2022) sitúa esta infracción en la
   banda que llega hasta **el 4 % del volumen de negocio anual o 2 000 000 €**.
3. Está **en los 10 idiomas**, así que la exposición es simultánea en toda la UE.
4. El testimonio de Ana R. no es una opinión genérica: es una **afirmación implícita de
   rentabilidad** sobre un producto financiero. Contradice frontalmente la propia página de
   Advertencia de Riesgo del sitio, que promete «no promesas de rentabilidad»
   (`legalContent/es.js:239`). Que el sitio se desmienta a sí mismo agrava, no atenúa.

**Acción:** eliminar la sección entera hoy. Cuando haya clientes reales, reconstruirla con
testimonios verificables (Trustpilot ya está previsto en el panel admin) y consentimiento
por escrito. El coste de borrarla es una tarde; el de dejarla, un porcentaje de la
facturación que esta misión pretende crear.

---

## 2. 🔴 El panel de administración pierde el 100 % de tres tipos de escritura **[PROBADO]**

**Dónde:** `backend/admin_routes.py:245-262` (escritura) frente a `:892`, `:921`, `:692`,
`:1144` (lectura)

Sobre la **misma** colección `app_settings` conviven dos esquemas incompatibles:

| | Esquema | Quién lo usa |
|---|---|---|
| **A** | un único documento `{_id: "global"}` con un campo por ajuste | `_upsert_setting()`, `_get_all_settings()`, `server.py:8127`, el middleware de mantenimiento |
| **B** | un documento por clave, con campos `key` / `value` | `/public/settings`, `GET /admin/i18n`, `GET /admin/plans` |

Los endpoints **escriben con A y leen con B**. En el editor de planes la contradicción vive
dentro del mismo par de funciones: `update_plan` guarda con `_upsert_setting(db,
f"plan_{plan_id}", …)` (línea 934) y `list_plans` lo busca con `find_one({"key":
f"plan_{plan_id}"})` (línea 892).

A nivel SQL no hay ambigüedad: el shim traduce `{"key": {"$in": [...]}}` a
`data->>'key' IN (...)`, y el documento global no tiene ningún campo `key`.

**[PROBADO]** contra PostgreSQL 16 real, usando las funciones reales de escritura y los
filtros reales de lectura:

```
PROBE 1 — POST /admin/plans/{id}
  wrote  : plan_monthly = {'price': 29.0}      (via _upsert_setting)
  read   : find_one({'key': 'plan_monthly'}) -> None
  VERDICT: LOST — el admin sigue viendo el precio antiguo

PROBE 2 — GET /public/settings
  wrote  : ga4_measurement_id = G-TESTONLY123
  read   : /public/settings -> {}
  VERDICT: LOST — el ID de analítica nunca llega al frontend

PROBE 3 — GET /admin/i18n
  wrote  : i18n_heroTitle = {'es':'Hola','en':'Hi'}
  read   : /admin/i18n -> []
  VERDICT: LOST — el gestor i18n siempre muestra la lista vacía

PROBE 4 — ¿dónde fue el dato?
  documento global: {"plan_monthly": "...", "i18n_heroTitle": "...", "ga4_measurement_id": "G-TESTONLY123"}
  -> las escrituras SÍ llegaron, al documento {_id:'global'} (Esquema A).
  -> los tres lectores buscan documentos por clave (Esquema B), que nadie escribe.
```

Consecuencias en producción:

- El administrador cambia un precio, recibe **`{"success": true}`**, la acción queda en el
  log de auditoría… y no pasa absolutamente nada. El panel miente con acuse de recibo.
- **GA4, GTM, Microsoft Clarity y Trustpilot no se pueden activar desde el panel.** Todo el
  mecanismo de «configurar sin rebuild» que documenta `GoogleIntegrations.jsx:13-18` está
  muerto; sólo funciona el fallback por variable de entorno en build.
- El gestor de traducciones parece vacío haga lo que haga.

**Acción:** unificar en el Esquema A (es el que usa `server.py`, el que tiene el cifrado
Fernet de secretos y el que lee el middleware de mantenimiento). Son tres lecturas a
cambiar. Y después, tests del shim (G-17): esta clase de fallo es invisible sin ellos —
por eso lleva ahí desde que se escribió el panel.

**Nota aparte (A2):** aunque se arregle, el editor de precios seguirá siendo decorativo.
`/checkout/create` resuelve el plan contra la constante `SUBSCRIPTION_PLANS`
(`server.py:1122-1125`) y cobra contra un `stripe_price_id` fijo. Cambiar el precio en el
panel jamás podrá cambiar lo que cobra Stripe. O se conecta de verdad, o se quita el
formulario: un control que no controla nada es peor que su ausencia.

---

## 3. 🔴 Normativa — nueve huecos, cuatro de ellos bloqueantes

El trabajo legal existente es **muy bueno en el fondo y está incompleto en la forma**. La
Advertencia de Riesgo (`legalContent/es.js:220-249`) es honesta de verdad: cita ESMA,
Chague-De-Losso-Giovannetti (2020) y Barber-Odean con enlaces, y dice que la mayoría
pierde. Eso es raro y es un activo. El Consent Mode v2 está bien montado
(`public/index.html:36-42`, todo denegado por defecto, `wait_for_update: 500`). Y no
enlazar la plataforma ODR es **correcto**: dejó de operar el 20 de julio de 2025.

Lo que falta:

### N1 🔴 El responsable no está identificado
`legalContent/es.js:26` dice «operado por **una sociedad de responsabilidad limitada (LLC)
registrada en los Estados Unidos**». Sin denominación, sin estado de constitución, sin
domicilio, sin número de registro. El propio archivo lo reconoce como pendiente en su
cabecera (líneas 10-13).

Incumple tres normas a la vez: **RGPD art. 13(1)(a)** (identidad del responsable),
**Directiva 2000/31/CE art. 5** (nombre y dirección geográfica del prestador) y
**Directiva 2011/83/UE art. 6(1)(b)(c)** (identidad y dirección del comerciante *antes* de
que el consumidor quede vinculado). Ninguna admite fórmula genérica.

### N2 🔴 Sin representante en la Unión (RGPD art. 27)
Un responsable establecido fuera de la UE que ofrece servicios a residentes en la UE —y
aquí se ofrece: precios en euros, versión vinculante en español, mención expresa a la
AEPD— **debe designar por escrito un representante en la Unión** y publicarlo. No aparece
en ninguna parte.

### N3 🔴 No existe el derecho de desistimiento
**Cero apariciones** de «desistimiento» en todo `frontend/src`. Lo que hay es una «Política
de Reembolsos» (`legalContent/es.js:129-136`) que no es lo mismo y que, además, lo empeora:

- Condiciona la devolución a «**siempre que no hayas realizado uso significativo de las
  funcionalidades premium**». El desistimiento de 14 días del art. 9 de la Directiva
  2011/83/UE es **incondicional**; no se puede supeditar al uso.
- El plan Lifetime se declara «**no reembolsable**». Sólo puede serlo si el consumidor dio
  consentimiento previo expreso a la ejecución inmediata **y** reconoció perder el derecho
  (art. 16(m)) — y ese doble paso no existe en el checkout.
- Falta el **modelo de formulario de desistimiento** del Anexo I(B), de entrega obligatoria.

### N4 🔴 PostHog: grabación de sesión no declarada, y una afirmación falsa
`frontend/public/index.html:440` inicializa PostHog **con grabación de sesión activa** y
`recordCrossOriginIframes: true` (o sea, grabando también dentro del iframe de TradingView).

PostHog no aparece **en ninguna** política: ni en la lista de terceros
(`legalContent/es.js:58-69`), ni en la tabla de cookies, ni en el apartado de analítica,
que sólo menciona GA4. Y la Política de Cookies afirma en negrita:

> «**TradingCalculator.pro no utiliza cookies de publicidad, retargeting ni de seguimiento
> comportamental de terceros.**» — `legalContent/es.js:199`

La grabación de sesión por un procesador externo **es** seguimiento comportamental de un
tercero. No es una omisión: es una declaración expresa contraria al hecho, publicada, en
diez idiomas. En una aplicación financiera lo grabado incluye saldos, tamaños de posición y
notas del diario.

*El gating técnico sí funciona* (`opt_out_capturing_by_default` salvo consentimiento
`'all'`). El problema es exclusivamente de declaración — y es el que sanciona la AEPD.

### N5 🟠 Sin IVA en el checkout
`server.py:4110-4120`: no hay `automatic_tax`, ni `tax_id_collection`, ni
`billing_address_collection`. Se venden servicios digitales B2C en euros sin determinar el
país del cliente ni repercutir el tipo de destino.

Esto no es un defecto técnico, es un **pasivo que crece con el éxito**: cada suscripción
vendida a un consumidor de la UE genera un IVA devengado que no se está recaudando ni
declarando por la ventanilla única (OSS, régimen exterior a la Unión, para una LLC
estadounidense). Con 100 suscriptores mensuales a 17 € el agujero ronda los 350 €/mes de
IVA no repercutido, y sube en línea recta con el crecimiento. Encender **Stripe Tax** más
darse de alta en OSS lo resuelve; hacerlo *después* de facturar significa pagarlo del
margen y con recargo.

Además, la frase «Los precios… **incluyen los impuestos aplicables cuando corresponda**»
(`legalContent/es.js:127`) no cumple el art. 6(1)(e) de la 2011/83/UE, que exige el precio
total con impuestos incluidos, sin condicionales.

### N6 🟠 El derecho de rectificación se anuncia y no existe
La política promete: «puedes corregir datos inexactos o incompletos **en cualquier momento
desde los ajustes de tu cuenta**» (`legalContent/es.js:75`). No hay `PUT /auth/profile` en
todo el backend, ni pantalla — es el hueco G-26. El art. 16 del RGPD queda sin vía de
ejercicio y el documento afirma algo falso.

### N7 🟠 Teléfono y Twilio SMS sin declarar
`server.py:6846` recoge un teléfono y `notifications.py:128` lo envía a Twilio con el texto
del aviso. La política sólo nombra «Twilio **SendGrid** … **solo recibe tu dirección de
email**» (`legalContent/es.js:66`). Falta el teléfono como categoría de dato y Twilio (SMS)
como destinatario.

*Crédito donde toca:* el tratamiento en código es ejemplar — `sms_log` guarda sólo los
cuatro últimos dígitos, está en `_SECURITY_ARTEFACT_COLLECTIONS`, se borra con la cuenta y
no se exporta. La ejecución es mejor que la documentación.

### N8 🟡 La Política de Cookies quedó desfasada por G-25
Dice que las preferencias se guardan «en tu propio dispositivo» y «no se transmiten a
terceros» (`legalContent/es.js:182`). Desde el 2026-08-08 (`lib/cloudPrefs.js`) el tema, el
idioma, los favoritos, el progreso de la Academia y los setups **se sincronizan con la
cuenta en el servidor**. Sigue sin haber terceros, pero la descripción ya no es cierta.

### N9 🟡 Retención declarada sin ejecutor verificado
La política fija logs a 90 días y analítica a 14 meses. `usage_events` se purga a 120 días
y no figura en ninguna fila de la tabla de conservación.

---

## 4. 🔴 Fuentes de datos — la dependencia que puede matar el producto

**Dónde:** `backend/stock_data.py:14-40`

El comentario del código es explícito:

> «Yahoo returns empty data to plain datacenter requests (**bot detection**)… We hit Yahoo's
> JSON API directly via curl_cffi **impersonating a real Chrome browser** (TLS fingerprint +
> headers), **which Yahoo treats as a normal visitor**.»

`stock_data.py:34`: `_cffi.get(host + path, impersonate="chrome", …)`

De ahí salen las acciones y ETFs de EE. UU., los 23 índices, los 15 futuros de materias
primas **y la cadena de opciones entera** — es decir, el producto estrella. Y se cobra por
ello entre 17 € y 500 €.

`ESTADO_PROYECTO.md` lo registra como G-16, «licencia sin resolver». Es bastante más que
eso: no es usar un dato sin licencia, es **eludir deliberadamente una medida técnica de
control de acceso** para redistribuirlo en un producto de pago. Cambia la naturaleza del
riesgo (de discusión contractual a conducta evasiva documentada por escrito en el propio
repositorio) y añade el ángulo del derecho *sui generis* de base de datos (Directiva
96/9/CE) por extracción sustancial y reiterada.

Y el riesgo operativo es igual de serio: **un cambio de fingerprint en Yahoo apaga el
producto**. No hay proveedor alternativo enchufado para acciones ni para opciones; la
degradación es a cadena sintética, que por diseño devuelve `None` en max pain, GEX, perfil
de OI y ratio put/call. El día que Yahoo cierre la puerta, el cliente que pagó 500 € de por
vida abre la calculadora y encuentra la mitad de los paneles vacíos.

**Acción:** es una decisión de negocio con coste, y es la que sostiene todo lo demás.
Presupuestar un proveedor con licencia comercial para acciones/ETF y para la cadena de
opciones antes de escalar el marketing, no después.

*Lo que sí está limpio:* BCE para divisas (`ecb_rates.py`, dato público, publicación diaria
respetada), Tesoro de EE. UU. para el tipo libre de riesgo (`market_rates.py`, dominio
público) y Binance/Kraken para cripto (APIs públicas documentadas). Tres de cuatro fuentes
son irreprochables.

---

## 5. 🟠 Cálculos — la matemática es buena, los adaptadores la contaminan

El núcleo está bien hecho y bien razonado. `options_math.py` merece elogio concreto:
`payoff_bounds()` devuelve `None` para lo no acotado en vez de leer el borde de la
cuadrícula; `implied_volatility()` combina Newton con bisección y devuelve `None` cuando la
vega cae por debajo de lo identificable en lugar de inventarse un número;
`year_fraction()` cuenta las horas que quedan de sesión. Son decisiones de alguien que
entiende el dominio. 197/197 en `engine-check`, paridad de instrumentos verde.

Los problemas están **fuera** del núcleo, en la capa que le da de comer.

### M1 🔴 Se pierde hasta un día entero de vencimiento **[PROBADO]**
`stock_data.py:601`:

```python
exp_date = datetime.fromtimestamp(int(ts), tz=timezone.utc).replace(tzinfo=None)
days_to_expiry = (exp_date - today).days
```

Dos defectos superpuestos: `.days` **trunca** la fracción de día, y se resta un naive-UTC
de un naive-local (`datetime.now()`), lo que añade el desfase del huso si el servidor no
está en UTC.

Yahoo marca los vencimientos a medianoche UTC. Si un usuario abre la aplicación a las 14:30
con un contrato que vence dentro de 7 días naturales, la diferencia es de 6 días y 10
horas, y `.days` devuelve **6**.

**[PROBADO]:**

```
now                        : 2026-08-10 14:30:00
expiry (Yahoo stamp, UTC)  : 2026-08-17 00:00:00+00:00
true calendar days         : 7
daysToExpiry REPORTED      : 6

  days=6  T=0.017066  ATM call = 1.5972
  days=7  T=0.019806  ATM call = 1.7234

  mispricing from the lost day: -7.32% on an ATM weekly
```

**Un 7,3 % de error en una call ATM semanal**, sistemático y siempre en el mismo sentido
(infravalora). El error crece según se acorta el vencimiento: es máximo justo donde el
usuario más se juega, en los semanales y los 0DTE. Y contamina todo lo que cuelga de `T`:
theta, gamma, la superficie de IV y el optimizador.

Es especialmente irónico porque `year_fraction()` se escribió *precisamente* para tener en
cuenta la hora del día, y luego recibe un entero al que ya se le ha amputado esa
información.

**Arreglo:** contar en horas y redondear hacia arriba, con ambos lados conscientes del huso:

```python
now_utc = datetime.now(timezone.utc)
exp_utc = datetime.fromtimestamp(int(ts), tz=timezone.utc)
days_to_expiry = math.ceil((exp_utc - now_utc).total_seconds() / 86400)
```

### M2 🟠 La cadena **real** fabrica cifras, y sin marcarlas
`stock_data.py:552` y `:564`:

```python
_empty = {"bid": 0, "ask": 0, "mid": 0, "last": 0, "volume": 0, "openInterest": 0, "iv": 0.3}
...
"iv": _yf_safe_float(o.get("impliedVolatility"), 0.3) or 0.3,
```

Esto viola la regla nº 2 del propio proyecto («Lo que no se puede calcular es `None`, no
`0`… Una IV que el precio no puede determinar es `None`, no una cifra»), y lo hace en la
ruta de datos **reales**, que es donde no hay banda de aviso porque `_synthetic_marker`
sólo cubre la cadena modelada:

- Un *strike* que sólo cotiza por un lado recibe el otro lado entero inventado: precio 0,
  interés abierto 0 y **volatilidad implícita del 30 %**.
- El `or 0.3` es peor que el `default`: cuando Yahoo publica IV **0** —lo hace de continuo
  en contratos ilíquidos— se sustituye por 30 % y se presenta como medida.
- `_yf_safe_int(…, default=0)` convierte el `null` de Yahoo en `0`. Para el volumen pasa
  («no se ha negociado»); para el interés abierto no: `null` es *desconocido*.

El daño concreto: `options_positioning.py` está escrito con un cuidado exquisito —`_leg_oi()`
(línea 37) devuelve `None` «cuando nunca se observó», y max pain, GEX y el ratio put/call se
callan si no hay interés abierto real. **Ese cuidado se anula una capa más arriba**: nunca
les llega un `None`, les llega un `0` indistinguible de una observación. La defensa existe,
está bien diseñada, y el dato nunca llega en la forma que le permite dispararse.

**Arreglo:** `None` en lugar de `0`/`0.3` en el adaptador, y omitir el lado ausente en vez
de rellenarlo con `_empty`. La capa de posicionamiento ya sabe qué hacer con `None`.

### M3 🟡 Las griegas agregadas usan otro reloj
`options_math.py:512`: `T = max(leg.get("daysToExpiry", 30), 1) / SECONDS_PER_YEAR` —
días/365 pelado, en vez de `year_fraction()`, que es lo que usa el precio. El panel de
griegas y el precio miran relojes distintos, y en 0DTE la diferencia es la que hay entre
un día entero y unas horas.

### M4 🟡 `SECONDS_PER_YEAR` no son segundos
`options_math.py:25`: `SECONDS_PER_YEAR: int = 365  # market days approximation`. Ni son
segundos ni son días de mercado (serían 252): son días naturales. El nombre y el comentario
mienten los dos. Es cosmético, pero está en el módulo que más se lee.

---

## 6. 🟠 Contenido y SEO — 1589 páginas que pueden salir caras **[PROBADO]**

`frontend/scripts/gen-seo-pages.js` emite una página por estrategia × 10 idiomas. El build
de hoy: **1589 URLs**, todas con `<meta name="robots" content="index, follow">`.

**[PROBADO]** — comparando dos páginas de estrategia distintas ya construidas:

```
líneas de texto por página: 50
líneas IDÉNTICAS entre las dos páginas: 38
lo único que cambia: el título, una frase de descripción, la miga de pan y la lista de patas
```

Es decir: **~76 % de plantilla compartida**, y lo propio de cada página es *una frase*. La
propia `ESTADO_PROYECTO.md` lo llama por su nombre: «las 1589 páginas estáticas son
**anzuelo, no contenido**».

Eso es la definición operativa de *doorway page* en las políticas antispam de Google
(páginas creadas en masa para capturar consultas y canalizar al usuario a un destino único)
combinada con *thin content*. El riesgo no es que esas 1589 no posicionen —es que **arrastren
al dominio entero**, incluidas las páginas que sí merecen posicionar.

Y hay un segundo defecto que hace el esfuerzo estéril de todos modos:

### hreflang autodestructivo
`public/index.html:70-90`: el `canonical` de todas las variantes apunta a la URL desnuda,
mientras los `hreflang` apuntan a **la misma URL con `?lang=xx`**. Como el SPA traduce en
cliente, las 10 variantes sirven **el mismo HTML**. Google canonicaliza todas a una y
**descarta las alternativas**: el canonical y el hreflang se contradicen, y gana el
canonical. Nueve de los diez idiomas no se indexan como tales — se ha pagado la traducción
de 6019 claves × 10 idiomas y el SEO multiidioma no puede funcionar tal como está montado.

### Otras afirmaciones del contenido
- **`99.9 %` de uptime** en la portada (`LandingPage.jsx:190`) como dato duro. No hay SLA,
  no hay página de estado, y los propios Términos dicen «no garantizamos una disponibilidad
  del 100 %» (`legalContent/es.js:155`). GitHub Pages en plan gratuito no ofrece SLA
  ninguno. Publicitar una cifra que el contrato desmiente es práctica engañosa (art. 5
  Directiva 2005/29/CE).
- **`50+` activos** (`LandingPage.jsx:185`) cuando `lib/assets.js` tiene ~186. Se corrigió
  a la baja en su día desde un «250+» falso y se quedó anclado. Ahora infravende.

---

## 7. 🔴 El dominio — donde se pierde el dinero

No hay `frontend/public/CNAME`. `package.json:5` fija
`"homepage": "https://abcde-rgb.github.io/Tradingcalculatorpro.com"`, y el canonical, los
hreflang y el sitemap apuntan todos ahí, coherentemente.

Todo el negocio vive en **una ruta de proyecto dentro de un subdominio personal de
github.io**. Para un producto que pide 500 € por un acceso de por vida, esto es, con
diferencia, el mayor freno a la conversión del proyecto:

- La página de pago tiene un dominio que no es una marca. Nadie mete una tarjeta ahí.
- Toda la autoridad SEO que generen esas 1589 páginas se acumula en `github.io`, no en un
  activo propio. Es alquilar reputación en vez de construirla.
- El dominio `tradingcalculatorpro.com` ya está decidido y escrito por todo el código
  (CORS, emails, `FRONTEND_URL`, i18n, contacto). Sólo falta el DNS y el CNAME.

Es el arreglo con mejor relación impacto/esfuerzo del repositorio entero: una tarde de DNS
frente a un techo de conversión permanente.

---

## 8. Panel de administración — resto de la revisión

Más allá del §2, la revisión es tranquilizadora:

- 🟢 **Todas** las rutas de `admin_routes.py` llevan `Depends(require_admin_dep)`.
  Verificado uno a uno sobre las 40 definiciones.
- 🟢 Log de auditoría (`_audit`) en todas las acciones con efecto.
- 🟢 Secretos enmascarados al leer (`_mask_secret`, `server.py:8181`), cifrados con Fernet
  al guardar, con distintivo `*_set` para que el admin sepa si hay valor sin exponerlo.
- 🟢 `test_route_uniqueness_unit.py` pasa: no hay *route shadowing*.
- 🟠 **C-08 sigue abierto**: claves de API almacenables en la BD. La decisión de producto
  (sólo Secret Manager) lleva meses tomada y sin ejecutar.
- 🟡 `user_state_ttl_days` sigue expuesto en el panel (`admin_routes.py:228`) aunque
  `user_states` ya no caduca por diseño. Un mando desconectado que invita a un accidente:
  si alguien lo «arregla» conectándolo, borra los setups escritos a mano de los usuarios.

---

## 9. Plan de acción priorizado

### Hoy — riesgo legal vivo, coste casi nulo
1. **Borrar los testimonios y el «Cientos de traders»** de los 10 idiomas (§1).
2. **Declarar PostHog** en privacidad y cookies, y **corregir la frase falsa** sobre
   seguimiento comportamental (§3 N4). O declararlo, o apagarlo.
3. **Quitar el `99.9 %`** o sustituirlo por algo verificable (§6).

### Esta semana — bloquea el cobro legal
4. **Identidad real del titular** + domicilio, en los 10 idiomas (§3 N1).
5. **Representante en la UE** (RGPD art. 27) (§3 N2).
6. **Desistimiento de 14 días**: cláusula, formulario del Anexo I(B), y en el checkout la
   casilla de consentimiento a la ejecución inmediata con renuncia expresa (§3 N3).
7. **Stripe Tax + alta en OSS** antes de la primera factura (§3 N5).

### Este mes — producto y dinero
8. **DNS + CNAME del dominio propio** (§7). El mayor retorno por hora invertida.
9. **Arreglar `app_settings`** (§2) y decidir si el editor de precios se conecta o se quita.
10. **`days_to_expiry`** con `ceil` sobre segundos y ambos lados en UTC (§5 M1) — es un
    error de precio, y este producto se vende por dar precios buenos.
11. **`None` en vez de `0`/`0.3`** en el adaptador de la cadena real (§5 M2).
12. **hreflang con URLs propias por idioma**, o prerender, o retirar los hreflang (§6). Como
    está, la inversión en 10 idiomas no se cobra.

### Después — lo estructural
13. **Decidir el Grupo B de proveedores de datos** (§4). Es la decisión que determina si
    esto es un negocio o una carrera contra el detector de bots de Yahoo.
14. **G-14**: dar interfaz a los cuatro módulos terminados (~1770 líneas ya escritas,
    probadas y pagadas que hoy no producen ni un euro).
15. **Tests del shim `Collection`** (G-17). El fallo del §2 llevaba meses ahí y ninguna de
    las siete comprobaciones automáticas podía verlo.

---

## 10. Lectura de conjunto

El proyecto tiene un problema de **frontera**, no de fondo.

Cada módulo, mirado por dentro, está por encima de la media: la matemática de opciones es
seria, las reglas de honestidad numérica están escritas y defendidas con tests, el
tratamiento de datos personales en código es más riguroso que el de mucha empresa
establecida, el panel está bien autorizado y auditado, y la documentación viva es
excepcional.

Lo que falla es lo que ocurre **entre** las piezas, y siempre por la misma raza de fallo:

- entre `admin_routes` y `app_settings`: dos esquemas, ninguna prueba que los enfrente (§2);
- entre `stock_data` y `options_positioning`: uno fabrica ceros, el otro esperaba `None` (§5 M2);
- entre `stock_data` y `options_math`: uno amputa las horas, el otro se escribió para leerlas (§5 M1);
- entre el código y las políticas legales: el código añadió PostHog, sincronización de
  preferencias y SMS; las políticas siguen describiendo la versión anterior (§3);
- entre el producto y la portada: el producto promete no prometer rentabilidad; la portada
  la promete con nombre y apellido (§1).

Y por eso lo que hace falta no es más código. Hace falta cerrar los contratos entre capas
con pruebas que los crucen —el shim contra sus dos esquemas, el adaptador de Yahoo contra
las reglas de honestidad, las políticas legales contra un inventario de terceros que se
revise cuando se añade uno— y **poner el negocio encima de un dominio propio, con la
identidad legal declarada y el IVA recaudado**.

El camino a que esto genere dinero no pasa por añadir funciones: pasa por hacer cobrable y
defendible lo que ya existe.
