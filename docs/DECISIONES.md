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
