# 🧭 Decisiones — por qué el proyecto es como es

> **Sólo se añade. Nunca se edita una decisión pasada.** Si algo cambia, se
> escribe una decisión nueva que dice cuál sustituye. Esa regla es lo que hace
> que este documento no pueda desviarse del código, al contrario que una lista de
> pendientes: una decisión tomada en julio siguió siendo verdad en julio aunque
> hoy se haya revocado.
>
> **Para qué sirve.** Responder *«¿por qué esto es así?»* sin rastrear las 3.900
> líneas de [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md). El registro cuenta
> *qué se hizo*; esto cuenta *qué se decidió y qué se descartó*.
>
> **Qué entra.** Sólo lo **difícil de revertir** o lo que ya se ha explicado dos
> veces: proveedores, dinero, alcance, licencias, arquitectura. Un cambio de
> copy no es una decisión. Si dudas, no la metas.
>
> **Formato.** Fecha · qué se decidió · **qué se descartó** · por qué · dónde
> vive en el código. Lo descartado es la mitad que siempre se pierde y la que más
> se echa de menos seis meses después.

---

## Producto y negocio

### 2026-08-02 · Todo el contenido va tras el muro de pago
Se descartó el modelo mixto (parte gratis con publicidad). La publicidad se retiró
de raíz —`lib/ads.js`, `lib/adsPolicy.js`, `components/ads/*` y las cuatro
variables del workflow— y el sitio pasó a ser de pago íntegro con prueba de 7 días
con tarjeta por adelantado.
**Sustituye a** la decisión del 2026-08-01 de monetizar con Google AdSense, que
duró un día.
**Consecuencia viva:** ⚠️ `gen-seo-pages.js` sigue anunciando `price: "0"` en el
JSON-LD de las calculadoras, con títulos que dicen «Gratis». Sin cerrar (G-28).

### 2026-08-02 · No se da de alta ninguna cuenta de AdSense
Corolario de lo anterior, escrito aparte porque `ESTADO_PROYECTO.md` §6 siguió
**un día entero** mandando darla de alta después de borrar el código. El mismo
error que ya había pasado con OxaPay.

### 2026-07-17 · Programa de afiliados sólo para suscriptores de pago
Se descartó abrirlo a cualquier registrado. Quien está en la prueba gratuita no
puede ser afiliado.
**Sin decidir:** si `/affiliate` cae tras el muro. Hoy es sólo-auth y el backend
rechaza a quien no paga, así que un registrado sin plan ve una página que no puede
usar.

### 2026-08-08 · Roadmap 7.6 «datos reales de opciones»: evaluado y NO adoptado
Está en [`ROADMAP_IDEAS.md`](./ROADMAP_IDEAS.md) §7.6 con el porqué. Se deja
escrito para no volver a evaluarlo desde cero.

---

## Pagos

### 2026-07-16 · NOWPayments como pasarela cripto; Revolut Pay como alternativa
Se descartaron **OxaPay** (adoptada el 2026-06-27 y retirada tres semanas después)
y **MaxelPay** (adoptada y retirada el mismo día). No queda código de ninguna.
El IPN de NOWPayments se firma con HMAC-SHA512 sobre el JSON ordenado; el backend
rechaza con 401 cualquier IPN sin firma válida.
**Dónde vive:** `backend/nowpayments.py`, `backend/revolut.py`.
**Cicatriz:** cuatro comentarios de esos dos módulos siguen comparándose con «el
flujo de OxaPay», y `coinbase_api_key` sigue en la lista de ajustes marcado como
*superseded by OxaPay*. Ajuste muerto justificado por una pasarela que tampoco
existe.

### Cripto sin renovación automática
El cobro en cripto no admite domiciliación, así que las suscripciones pagadas con
cripto son **concesiones de un solo uso**, no renovables. No es una limitación de
la implementación: es cómo funciona el medio.

---

## Datos de mercado y licencias

### 2026-08-02 · Grupo A saneado: fuera CoinGecko, dentro Binance/Kraken/BCE/Tesoro
La licencia de CoinGecko no permitía redistribuir el dato en un producto de pago.
No queda ninguna llamada a `api.coingecko.com`.
**Cicatriz:** el mapa `COINGECKO_SYMBOL_TO_ID` conserva el nombre en
`stock_data.py`, y `realtime_alerts.py` lo importa. El nombre sobrevivió al
proveedor.

### 2026-08-02 · Grupo B: Yahoo se mantiene **a sabiendas**, y está mal
Acciones y ETFs de EE. UU., los 23 índices, los 15 futuros de materias primas y la
cadena de opciones siguen saliendo de Yahoo, cuya licencia **no permite**
redistribuir el dato en un producto de pago. Ese día se retiró la *mención*
pública, no la dependencia.
Se descartó migrar ya (IEX para acciones, ETF equivalentes para índices y materias
primas, cadena sintética para opciones) porque **cambia lo que ve el usuario** y
tiene coste. Es una decisión de negocio aplazada, no un olvido. Hueco **G-16**.

### 2026-08-23 · Candidatos de proveedor rastreados, pero **ninguno adoptado**
Se rastreó el índice `public-apis/public-apis` (60 entradas de «Finance», 20 de
divisas) buscando salida a G-16 y segundo eslabón para la cadena de reserva. El
resultado, con su razonamiento, está en
[`PROVEEDORES_DATOS.md`](./PROVEEDORES_DATOS.md).
**No se adoptó ninguno, y el motivo es la regla de la casa:** desde este entorno
el proxy responde 403 a todos los dominios de datos de mercado, así que **no se
pudo ver responder a ninguno**. Escribir un adaptador contra una API que no has
visto responder es escribirlo contra una suposición.
Lo que sí sale de ahí: **`goldprice.dev` (sin clave) es el mejor candidato para
los futuros de materias primas**, y **no existe ninguna opción de acciones en
tiempo real que sea gratuita, sin clave y con licencia comercial** — lo que
confirma que G-16 es una decisión con coste y no un descuido.
⚠️ Y una alerta sobre el plan escrito: **G-16 nombra «IEX para acciones», y hay
que verificarlo** antes de contar con él — IEX Cloud anunció el cierre de su API
pública. Que el índice comunitario lo siga listando no prueba que exista.

### 2026-08-02 · El tipo libre de riesgo sale del Tesoro de EE. UU., no de `^IRX`
`BC_3MONTH` de la Daily Treasury Par Yield Curve, que es dominio público. Se
descartó el literal `0.0525` y se descartó `^IRX` (Yahoo).
**Dónde vive:** `backend/market_rates.py`, `useRiskFreeRate()` en el frontend.

---

## Infraestructura

### 2026-08-03 · El despliegue del backend se hace a mano
Se retiró el workflow: fallaba la federación de identidad. Se despliega con
`cloudbuild.yaml` desde GCP.
**Coste asumido:** un despliegue manual es un despliegue que se olvida. Sin
decidir si se repone con la federación arreglada.

### `min-instances = 1`, intencionado
Se descartó `0`. Cuesta dinero, pero evita 2–4 s de arranque en frío al primer
usuario tras inactividad, en una aplicación con la que se dimensionan posiciones
reales. Conmutable por la variable de repositorio `MIN_INSTANCES`.

### La base de datos es conmutable Cloud SQL ↔ Neon
`DB_PROVIDER` vacío o `cloudsql` monta el socket; `neon` conecta por TCP+SSL. Se
dejó conmutable **antes** de necesitarlo, para que migrar por coste no sea un
refactor. Guía en [`MIGRACION_NEON.md`](./MIGRACION_NEON.md).

### El dominio propio `tradingcalculatorpro.com` NO está en uso
El sitio se sirve en `abcde-rgb.github.io/Tradingcalculatorpro.com`. No hay
`CNAME` en `public/`. Todo el SEO —canonical, hreflang de los 10 idiomas, sitemap,
JSON-LD— apunta ahí y es **coherente entre sí**, que es lo que importa.
Cuanto más tarde se active, más autoridad de enlaces habrá que redirigir.
Guía en [`MIGRACION_DOMINIO.md`](./MIGRACION_DOMINIO.md).

### MongoDB se descartó; la base es PostgreSQL
El proyecto nació en Emergent con una imagen `fastapi_react_mongo_shadcn`. Se
conserva el **shim** `db.coleccion.metodo(...)` que traduce Mongo→SQL porque
reescribir todas las llamadas era más riesgo que mantener la traducción.
**Consecuencia:** ese shim son ~750 líneas de las que depende todo el backend y
**sigue sin tests** (G-17), lo que a su vez bloquea partir `server.py`.

---

## Arquitectura y método

### 2026-08-13 · Lo que se puede contar no se escribe a mano
Módulos, rutas, líneas, componentes y claves i18n viven en
[`MAPA.md`](./MAPA.md), generado, con `--check` en CI. Se descartó seguir
manteniéndolos en `ESTADO_PROYECTO.md`: la doc llegó a decir 24 módulos con 28 en
el repo, 8232 líneas de `server.py` con 9097, y 5995 claves con 6110.

### 2026-08-13 · Las reglas por zona van en `.claude/rules/`, no en `CLAUDE.md`
Se descartó partir `CLAUDE.md` con imports `@fichero`: **no ahorran contexto**,
los imports se cargan al arrancar igual. Sólo `rules/` con `paths:` carga bajo
demanda.
**Excepción deliberada:** los invariantes universales se quedan en el
`CLAUDE.md` raíz, porque las reglas con `paths:` **no se reinyectan tras un
`/compact`** y las de la raíz sí.

### 2026-08-23 · No se instalan colecciones de *skills* de terceros
Se evaluaron cinco: [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills)
(`/spec /plan /build /test /review /ship /code-simplify /webperf`),
[`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills)
(CRO, copy, SEO, analítica),
[`mukul975/Anthropic-Cybersecurity-Skills`](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
(817 skills sobre tácticas MITRE),
[`headroomlabs-ai/headroom`](https://github.com/headroomlabs-ai/headroom)
(compresión de contexto) y
[`diegosouzapw/OmniRoute`](https://github.com/diegosouzapw/OmniRoute) (pasarela de
IA que agrega planes gratuitos). Dos enlaces más —el plugin `claude-code-setup` de
claude.com y la skill `task-observer` de claudemarketplaces.com— **no se pudieron
leer**: el proxy de este entorno los bloquea, así que no se opina sobre ellos.

**Se descartan los cinco, por tres motivos distintos:**

1. **Duplican lo que el repositorio ya tiene, y peor.** Las catorce skills de
   `.claude/skills/` no son genéricas: `auditar-formulas` conoce los invariantes
   de honestidad numérica, `qa` conoce las trampas del stack local, `no-me-fio`
   existe porque aquí ya han pasado por buenas tres comprobaciones que no
   comprobaban nada. Una skill genérica de «review» compite con `/verify` y con
   `probar-verificadores.sh` sin conocer ninguno de los dos.
2. **Cargar instrucciones de terceros es superficie de ataque.** Una skill es
   texto que entra en el contexto del agente y le dice qué hacer. En un
   repositorio con autenticación, pasarelas de pago y webhooks, eso es cadena de
   suministro, no comodidad. Si algún día se adopta una, se lee entera antes y se
   fija a un commit.
3. **OmniRoute, además, por producto.** Enrutar el AI Trade Coach —que es una
   función de un producto **de pago**— por un agregador de planes gratuitos
   choca con las condiciones de esos planes, no da fiabilidad ninguna y hace
   pasar las posiciones del usuario por una pasarela de terceros. Es un no
   independiente de lo bien hecha que esté la herramienta.

**Lo que sí se apunta, porque son huecos reales que estas colecciones señalan:**
no hay skill de **rendimiento web** (el build son 38 MB y 1589 páginas estáticas)
ni de **CRO / pricing / paywall**, y el producto vive de una suscripción con
prueba de 7 días. Si se escriben, se escriben aquí y con los datos de aquí.

### 2026-08-13 · Un verificador tiene que poder fallar
Tres comprobaciones resultaron no comprobar nada: una guarda tautológica, una
regla que no disparaba nunca y un smoke visual que imprimía ✅ produciendo
imágenes en blanco. Desde entonces, todo verificador nuevo se prueba
**rompiéndolo a propósito** — `scripts/probar-verificadores.sh`, en CI.

### El apalancamiento no entra en el P&L
`(salida − entrada) × cantidad × multiplicador`, donde `multiplier` es el tamaño
de contrato. El apalancamiento decide el margen y la liquidación, no el
resultado. Está aquí porque el diario legado **sí lo metía** y multiplicaba el
P&L por veinte (BUG-046). Fijado por un test parametrizado a 1/5/20/100×.

### 2026-08-22 · El sentido de una escalera de entradas lo declara quien la pide
`buildLadder` recibe `direction: 'with' | 'against'` en vez de deducirlo de un signo.
Piramidar (añadir a favor) y promediar a la baja (añadir en contra) son la misma
aritmética y planes opuestos, y la versión que llegó tenía el signo invertido con
un comentario que decía lo contrario: un largo bajaba de precio. Un plan que
convierte una técnica en su contraria sin decirlo no es un bug de cálculo, es una
mentira sobre lo que el usuario está simulando.

### 2026-08-22 · En margen cruzado el margen se evalúa en el precio del stop-out
`sizeForCushion` resuelve `L = saldo / (contrato · (colchón + th/100 · P'/lev))`
con `P' = P ∓ colchón`, no con `P`. Usar el precio de entrada era contradecir, en
la propia fórmula, el módulo que explica que el margen de un CFD se recalcula a
mercado. Y no es cosmético: es lo que hace que el resultado **converja al techo**
`saldo / (contrato · colchón)` cuando el apalancamiento tiende a infinito, que es
el argumento entero del módulo 08.

### 2026-08-22 · El aislado y el cruzado son dos lecturas, no una aproximación de la otra
En aislado la distancia hasta perder el margen es `precio ÷ apalancamiento` y no
depende del tamaño. En cruzado el corte es `equity / margen_usado < umbral` y
depende del saldo, del tamaño y del bróker. Con oro a 4.328,15 y 1:500 son 8,66 $
frente a 5,68 $: **la cuenta con más colateral detrás liquida antes**. Se enseñan
las dos juntas en el simulador porque leer una creyendo que vale por la otra es el
error que el módulo 04 existe para corregir. Recalcular el margen a mercado, en
cambio, sólo mueve el colchón de 5,672 $ a 5,678 $ y a favor: quien lo cita como
el gran problema del cruzado no ha hecho la cuenta.

### Lo que no se puede calcular es `None`, nunca `0`
Un R sin stop, un Sortino sin pérdidas, una IV que el precio no determina, un max
pain sobre cadena sintética. Un cero se promedia y falsea la distribución; un
`None` se ve. Se aplica también a `counts.confluent` del escáner: *sin comprobar*
y *comprobado sin coincidencias* son cosas distintas.

---

## Idiomas y contenido

### 2026-08-02 · Diez idiomas a la par, sin excepciones
`es, en, de, fr, ru, zh, ja, ar, pt, it` con el mismo juego de claves. Se descartó
tener idiomas «parciales»: una clave sin traducir cae a español por `t()`, que es
peor que un hueco porque no se ve. `i18n-check` lo fija en CI.
**Sin cerrar:** `pt` e `it` están completos pero **ningún nativo los ha
revisado**.

### Los términos del sector no se traducen
Los nombres de estrategias de opciones van en literal. `tr()` resuelve literal o
clave i18n indistintamente, así que añadir una estrategia no obliga a inventar
diez traducciones.


## 2026-08-25 — Se retira `cloudbuild.yaml`

**Decisión:** borrarlo, no arreglarlo.

**Por qué.** Describía un despliegue a `europe-west1` sobre un repositorio de
imágenes `trading-repo`, una cuenta de servicio `trading-backend-sa`, siete
secretos en Secret Manager y una instancia de Cloud SQL `trading-db`. Comprobado
contra el proyecto real: **no existe ninguno de los cinco**. El despliegue de
verdad lo hace Cloud Run desde el código, a `us-east1`, y se dispara solo con
cada push a `main`.

**Qué se descartó.** Corregirlo para que apuntara a la región y los recursos
reales, como plan B manual. Se descartó porque duplicaría en un fichero la
configuración que ya vive en el servicio —15 variables de entorno— y esa copia
se desviaría en silencio, que es exactamente lo que acababa de pasar. Y porque
un plan B que nadie ejecuta nunca es un plan B que no se sabe si funciona.

**Lo que costó no haberlo hecho antes.** La documentación afirmaba que el
backend se desplegaba a mano desde el 2026-08-03. Llevaba desplegándose solo
desde el 2026-07-19. Sobre esa base se le dijo al propietario que lanzara
`gcloud builds submit`; dio error, y al investigarlo se vio que el servicio vivo
ya corría el commit del último merge. La documentación no sólo estaba
desfasada: llevaba a ejecutar un comando que, de haber funcionado, habría
creado un segundo backend en otra región.

**Lo que NO se puede comprobar desde el repositorio.** El disparador vive en la
consola de GCP, así que ningún verificador de aquí puede afirmar que sigue
conectado. Lo que sí se puede es mirar qué está corriendo, y el comando está en
`DEPLOY_CHECKLIST.md` §0: la etiqueta de la imagen es el SHA del commit.

## El panel de Ajustes es una consola con rail, no un cajón con buscador (2026-09-03)

Se maquetaron **seis** rediseños completos de `/settings`
([`maquetas/panel-cliente.html`](./maquetas/panel-cliente.html)) y se eligió la
**Consola**: rail de secciones a la izquierda, panel de trabajo a la derecha.

La finalista era el **Cajón**: un panel superpuesto con buscador, que resuelve
mejor el problema de fondo —con dos docenas de ajustes, encontrarlos importa más
que ordenarlos—. Se descartó por tres motivos, en este orden:

1. **No tiene URL.** `AdminPage` manda a `/settings` al administrador sin 2FA, y
   soporte necesita poder enlazar «tu ajuste está aquí». Un cajón obliga a
   mantener además la página, o sea a construir las dos cosas.
2. **Cerrado no comunica nada.** El rail enseña el punto ámbar del 2FA sin abrir
   nada; el cajón, cerrado, no dice que haya algo pendiente.
3. **Coste.** Buscador, índice de ajustes, foco atrapado y teclado, frente a un
   layout y seis secciones.

Lo que el cajón hacía mejor sigue siendo cierto, así que **el buscador queda
pendiente como añadido a la consola**, no como diseño alternativo: es un filtro
sobre una lista de secciones que ahora ya existe.

Las otras cuatro (cabecera con pestañas, hoja de datos, panel de estado, rejilla)
siguen en la maqueta con sus pros y contras escritos: si alguien vuelve a abrir
esta discusión, el trabajo de comparar ya está hecho.
