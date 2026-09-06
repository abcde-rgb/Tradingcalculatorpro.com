# Captar tráfico — qué hacen los métodos de pago, y cómo replicarlos gratis

> **Reescrito el 2026-09-06.** La versión anterior hablaba de «22 páginas estáticas» y
> «sitemap de 30 URLs» cuando el build publica **2.475**, y avisaba del techo del
> subdominio `github.io` cuando el dominio propio está activo desde el 2026-08-28. Se
> conserva lo que seguía siendo válido —directorios, comunidades, la plantilla de
> outreach, el widget embebible— y se tira todo lo que ya no era cierto.

Este documento tiene una tesis y la sostiene con números medidos: **de todo lo que cobra
una agencia de SEO, la parte que de verdad mueve la aguja es gratis, y la parte que se
paga es sobre todo información y velocidad.** Abajo está el desglose, qué se replicó ya
en este repositorio, qué falta y qué no se puede replicar.

---

## 0 · Lo que este documento NO puede decirte

El entorno donde se hizo la auditoría **no tiene salida a internet**: no se ha pedido ni
una URL del sitio publicado, ni de Google, ni de Yandex. Por lo tanto aquí **no hay ni
una posición, ni una impresión, ni un CTR, ni un enlace entrante externo**. Cualquier
documento que te dé esas cifras sin haber consultado Search Console se las está
inventando.

Todo lo que se afirma abajo con un número sale de **medir el `build/` en disco** con
`frontend/scripts/auditar-visibilidad.js`. Lo demás son mecanismos, no promesas.

---

## 1 · Qué compras realmente cuando pagas

### 1.1 Una agencia de SEO

Una iguala típica de agencia (orden de magnitud: entre unos cientos y varios miles de
euros al mes, según mercado) se reparte, más o menos, así:

| Partida | Qué es de verdad | ¿Se replica gratis? |
|---|---|---|
| **Licencias de herramientas** | Ahrefs / Semrush / Sistrix. Lo que pagas es un **índice propio de enlaces** y una **base de volúmenes de búsqueda** | ⚠️ **Parcial.** Es lo único genuinamente difícil de replicar. Ver §1.3 |
| **Auditoría técnica** | Un crawler (Screaming Frog, Sitebulb) que recorre el sitio y lista defectos | ✅ **Replicado y superado.** `check-seo.js` (43 comprobaciones) + `auditar-visibilidad.js` (16 métricas) corren sobre el build, en local y en CI, gratis y para siempre |
| **Keyword research** | Qué busca la gente y con cuánta competencia | ✅ **Con datos mejores.** Ver §1.3 |
| **Arquitectura y enlazado interno** | Cómo se reparte la autoridad dentro del sitio | ✅ **Es 100 % gratis y es lo que más rindió hoy.** Ver §2 |
| **Contenido** | Redactores | ❌ No se replica: es trabajo. Y es el cuello de botella real de este sitio |
| **Link building** | Conseguir que otras webs te enlacen. En agencia se traduce en outreach y, con frecuencia, en enlaces comprados | ⚠️ Parcial, y la parte comprada **no debes replicarla** (§5) |
| **Informes** | Un panel bonito cada mes | ✅ Looker Studio conectado a Search Console, gratis, y `auditar-visibilidad.js --json` para diffear entre despliegues |

**La conclusión incómoda para el sector:** de esas siete partidas, cinco son gratis, una
es trabajo que nadie te va a regalar (contenido) y sólo una —los datos— es un producto
de pago con réplica imperfecta.

### 1.2 Google Ads y Meta Ads

Conviene entender el mecanismo, no el folleto.

**Google Ads compra intención en el instante en que existe.** Alguien teclea
«calculadora de tamaño de posición» y tu anuncio está ahí ese segundo. Eso es lo que
cuesta dinero y **eso es lo único que el SEO no puede darte: velocidad**. Un anuncio
trae visitas hoy; el SEO tarda de seis a doce meses.

Lo que hace un buen anunciante, en orden:

1. **Descubre qué consultas convierten** — no las que tienen volumen, las que acaban en
   alta. Se descubre pagando por muchas y apagando las que no rinden.
2. **Una landing por intención.** El que busca «calculadora de lotes forex» aterriza en
   una página que hace exactamente eso, no en la portada.
3. **Mide la conversión** de punta a punta.
4. **Itera** el texto del anuncio contra el CTR.

Y aquí está la parte que casi nadie cuenta: **Google te cobra menos por hacerlo bien.**
El *Quality Score* combina CTR esperado, relevancia del anuncio y **experiencia de la
página de destino**; un anunciante con mejor landing paga menos por el mismo clic. Es
decir: la mitad del trabajo de una campaña de pago **es trabajo de SEO on-page**, y ese
trabajo no caduca cuando apagas la campaña.

**La réplica gratis de Ads no es un truco para conseguir clics gratis** —eso no existe—
**es quedarse con su disciplina**:

| Lo que hace Ads | Réplica gratuita | Estado aquí |
|---|---|---|
| Una landing por intención de búsqueda | Una página estática por calculadora, tema, mercado, estrategia y patrón | ✅ **2.475 URLs.** Esto es literalmente lo que una agencia cobraría por montar |
| El anuncio dice lo que busca el usuario | `title` y `description` con la consulta exacta, y que **quepan** en el resultado | ✅ Arreglado hoy: títulos cortados 188 → 42 |
| Segmentar por idioma y país | 10 idiomas con `hreflang` recíproco y slug traducido | ✅ Hecho |
| Descubrir qué consultas convierten | **Search Console**, que te da las consultas REALES con impresiones, clics, CTR y posición | ⛔ **Bloqueado: falta verificar la propiedad** |
| Test A/B del mensaje | Reescribir `title`/`description` y ver el CTR en Search Console | ⛔ Mismo bloqueo |

### 1.3 Los datos: lo único de pago con réplica imperfecta

Ahrefs y Semrush venden dos cosas. Ésta es la réplica honesta de cada una:

**Volumen de búsqueda.**
- **Search Console** (gratis) te da algo *mejor* que una estimación: las consultas
  **reales** por las que ya apareces, con impresiones, clics, CTR y posición media, por
  país y por idioma. Su límite: sólo ve consultas donde ya sales. No sirve para explorar
  lo que aún no tienes.
- **Bing Webmaster Tools** (gratis) incluye una herramienta de investigación de palabras
  clave con volúmenes, sin exigir campaña de pago. Bing es un buscador pequeño, pero la
  **forma** de la demanda se parece.
- **Yandex Wordstat** (gratis) para el ruso. Relevante aquí: el sitio publica 168 páginas
  en ruso y Yandex ya las indexa.
- **Google Trends** (gratis) da estacionalidad y comparación relativa, no absolutos.
- **El planificador de Google Ads** da rangos anchos e inútiles si no tienes campaña
  activa. Es la trampa que empuja a abrir una campaña «sólo para ver los datos».
- **Autocompletar, «Otras preguntas» y las búsquedas relacionadas** son gratis y salen
  del comportamiento real. ⚠️ Léelo en §5 antes de convertirlas en páginas.

**Índice de enlaces entrantes.**
- **Search Console → Enlaces** (gratis) te lista los tuyos. No los de la competencia.
- **Bing Webmaster → Backlinks** (gratis) sí muestra algo de la competencia.
- Ver los enlaces de un rival con precisión **es lo que se paga**, y no tiene sustituto
  gratuito completo. Ahora bien: sirve para copiar una estrategia, no para ejecutarla. El
  trabajo de conseguir el enlace es el mismo con o sin la lista.

---

## 2 · Lo que se midió en tradingcalculator.pro, y lo que se arregló

Medido con `node scripts/auditar-visibilidad.js` sobre el build real (3.428 ficheros
HTML, 1.811 páginas de contenido, 948 puentes, 2.475 URLs en el sitemap).

### 2.1 El hallazgo grande: nueve idiomas regalando autoridad

**De las 1.811 páginas de contenido, sólo 182 se alcanzaban siguiendo enlaces desde la
portada — y las 182 eran españolas.** Las otras 1.629, los nueve idiomas restantes,
enlazaban *hacia* la portada y hacia `/pricing` y **no recibían ni un solo `<a>`
entrante**. Una válvula de un solo sentido.

Lo que hacía invisible el agujero: el `hreflang` estaba puesto y era recíproco, y
`check-seo.js` decía que no había huérfanas. Las dos cosas eran ciertas y ninguna
contradecía el problema:

- `<link rel="alternate" hreflang>` le dice al buscador que dos URLs son **la misma cosa
  en otro idioma**. Sirve para descubrirlas y agruparlas. **No transmite autoridad.**
- El **sitemap** descubre; tampoco reparte.
- «Huérfana» en `check-seo.js` significa «ningún hub de **su** idioma la enlaza» — una
  condición **local**, que se cumplía perfectamente.

Sólo un `<a href>` reparte. **Arreglado**: los `alts` que ya se calculaban para el
`hreflang` se pintan ahora como un selector de idioma visible en el pie de las tres
plantillas. No inventa datos —son exactamente las traducciones que existen, así que no
puede apuntar a un 404— y de paso es una función real: hasta ahora no había forma de
cambiar de idioma desde una página estática.

| Plantilla | Enlaces entrantes (mediana) antes | después |
|---|---|---|
| `/learn/` | 2 | **11** |
| `/patterns/` | 1 | **10** |
| `/candles/` | 4 | **13** |
| `/tools/` | 8 | **17** |
| `/markets/` | 10 | **19** |

Y para que no vuelva a pasar en silencio, es ahora un invariante con puerta:
`check-seo.js` falla si una página declara más de una traducción y no enlaza a ninguna,
con su sabotaje en `probar-verificadores.sh`.

### 2.2 Lo demás que se arregló hoy

| Hallazgo | Antes | Después |
|---|---|---|
| Títulos que el buscador corta (>600 px) | 188 | **42** |
| Descripciones que el buscador corta (>1.200 px) | 88 | **0** |
| Títulos duplicados dentro del mismo idioma | 1 grupo | **0** |
| Páginas con un solo enlace entrante | 553 | **0** |
| Páginas que reciben todos sus enlaces con el mismo texto | 1.251 | **0** |

Dos detalles del método, porque el resultado depende de ellos:

- **Se mide en píxeles, no en caracteres.** El buscador corta por ancho. La tabla de
  avances (Helvetica, métricamente compatible con la Arial que renderiza Google) vive en
  `scripts/serp-ancho.js` y **la comparten el generador y el auditor**: el que decide
  cuánto texto emitir y el que comprueba si cabe usan el mismo milímetro, así que no
  pueden contradecirse.
- **El tope de 158 caracteres de la descripción era correcto para el latino y falso para
  el CJK**, porque un ideograma ocupa exactamente el doble. Las descripciones japonesas y
  chinas salían de 1.400 a 3.000 px sobre un contenedor de 1.200. Ahora el presupuesto se
  reparte por ancho real: el latino y el cirílico no se mueven, el CJK baja a ~1.100 px.

### 2.3 Un bug que no era de SEO

El japonés llamaba **三羽烏** («tres cuervos», patrón **bajista**) también al patrón
**alcista** *Three White Soldiers*. Lo destapó la comprobación de títulos duplicados: dos
URLs distintas con el mismo `<title>`. Los otros nueve idiomas distinguían los dos
patrones correctamente. Corregido a **赤三兵**, que es el nombre estándar y el que ya usa
el propio fichero japonés en `labPresetSoldier: "三兵"`.

Un usuario japonés leía el nombre de un patrón bajista sobre la ficha de uno alcista. Eso
no es una penalización de Google: es una señal de trading invertida.

### 2.4 Lo que sigue abierto (y por qué no lo he tocado)

| Hallazgo | Cifra medida | Por qué no se arregla desde el código |
|---|---|---|
| **Ni una imagen en el contenido indexable** | 0 `<img>` en 1.811 páginas | Sin imagen no hay miniatura en el resultado móvil ni entrada a Discover, y el `max-image-preview:large` que emiten las 2.475 páginas no describe nada. Poner cualquier imagen de relleno sería peor. Lo que corresponde es un **diagrama por patrón** (42 chartistas + 35 de vela), que es contenido nuevo, no una línea de código |
| **Contenido delgado** | `/candles/` mediana **73** palabras · `/patterns/` **117** · `/tools/` **146** | Hace falta escribir. Es hermano del hueco G-42 |
| **Una sola imagen social** | 1 `og:image` para 1.811 páginas | Barato de arreglar: `scripts/gen-og-image.js` ya sabe vectorizar texto sobre una plantilla de 1200×630. Seis imágenes, una por sección, es una tarde |
| **Ni un autor declarado** | 0 páginas con `Person` | Finanzas es **YMYL**: el listón de E-E-A-T más alto que aplica Google. **Esto no se arregla inventando un autor.** Hace falta un nombre, credenciales y foto reales. Es una decisión tuya |
| **80 fichas de mercado en inglés bajo `<html lang>` de otro idioma** | Hueco G-43 | Decisión de tráfico: traducir las nueve fichas, o dejar de generar el idioma sin traducción (retira 80 URLs publicadas) |

---

## 3 · El plan gratuito, en orden de retorno

### Nivel 0 — Las tres cuentas. Sin código, sin dinero, media hora, y sólo puedes hacerlo tú

**Todo lo demás de este documento rinde a ciegas hasta que esto esté hecho.** Sin Search
Console no sabes por qué consultas apareces, ni con qué CTR, ni en qué países — o sea,
no puedes decidir nada con datos.

1. **Google Search Console** → verificar `https://tradingcalculator.pro` y enviar
   `sitemap.xml`. Pasos exactos en [`setup/SEO_GUIDE.md`](./setup/SEO_GUIDE.md).
2. **Bing Webmaster Tools** → importa la propiedad desde Search Console en un clic. Te
   da además, gratis, la investigación de palabras clave con volúmenes.
3. **Yandex Webmaster** → es el que falta y el que más se nota ahora mismo: el sitio
   publica 168 páginas en ruso y Yandex ya las indexa, pero sin la propiedad verificada
   no puedes enviarle el sitemap ni pedirle que rastree el favicon (por eso el resultado
   sale con el globo genérico). El `meta` ya está cableado a
   `REACT_APP_YANDEX_VERIFICATION`; sólo falta el secreto.

**IndexNow ya está automatizado** (`scripts/indexnow-ping.js` avisa a Bing y Yandex tras
cada despliegue, sólo de las URLs que cambiaron). No hay nada que hacer ahí.

### Nivel 1 — Enlaces ganados: la réplica honesta del link building

Tu activo regalable son **trece calculadoras que funcionan y no piden registro**. Eso es
exactamente lo que gana enlaces sin pedirlos, y es como Omnicalculator construyó su
perfil de enlaces.

- **Widget embebible.** Un `<iframe>` de una calculadora que otros blogs puedan
  incrustar, con enlace de vuelta. Es la palanca de mayor retorno de toda esta lista y
  **es código, no outreach**: se puede construir aquí.
- **Directorios de herramientas.** Product Hunt (pico de tráfico el día del
  lanzamiento), BetaList, SaaSHub, AlternativeTo (posiciónate como alternativa a
  calculadoras existentes), listados de «herramientas para traders».
- **Datos propios.** Tienes un simulador Monte Carlo, un catálogo de ~186 instrumentos y
  las matemáticas de opciones. Un estudio con datos propios —del tipo «qué probabilidad
  real de ruina tiene arriesgar el 5 % por operación»— es lo que consigue enlaces de
  medios, porque nadie más tiene esa cifra. ⚠️ Sujeto a las reglas de honestidad numérica
  del proyecto: cifra reproducible o no se publica.
- **Comunidades.** Reddit (r/Daytrading, r/Forex, r/algotrading), Forex Factory,
  BabyPips, Elite Trader, TradingView, Quora. La regla es **ayudar primero y enlazar
  después**: responde la pregunta concreta y enlaza la calculadora que la resuelve. El
  autopromocional se detecta y se banea.
- **Vídeo corto.** YouTube Shorts y TikTok usando las calculadoras. Es el canal de
  tráfico **rápido** mientras el SEO madura, y la búsqueda de YouTube es la segunda del
  mundo.

**Plantilla de outreach** (sigue siendo válida):

> Asunto: Calculadora gratuita para tu artículo sobre [tema]
>
> Hola [nombre], he visto tu artículo sobre [tema] — muy útil. He hecho una calculadora
> gratuita de [X] que encaja justo con esa sección: [enlace]. Sin registro, en 10
> idiomas. Por si te sirve para complementarlo. Gracias por el contenido.

### Nivel 2 — Entidad de marca

Es la réplica gratuita del *brand awareness* que se compra con display:

- Perfiles consistentes (mismo nombre, mismo logo, mismo dominio) y declararlos con
  `sameAs` dentro del `Organization` de la portada.
- El `Organization` y el `WebSite` + `SearchAction` ya se emiten. Lo que falta es que
  apunten a algún sitio.

---

## 4 · Cómo sabrás si funciona

| Señal | Dónde se mira | Cadencia |
|---|---|---|
| Defectos técnicos y de competitividad | `node scripts/auditar-visibilidad.js` sobre el build. `--json` para diffear entre despliegues | Cada cambio grande |
| Que no se rompa nada de lo arreglado | `node scripts/check-seo.js` — es la puerta, corre en CI y en el despliegue | Automático |
| Que el sitio publicado responda de verdad | `.github/workflows/seo-en-vivo.yml` (sí tiene red) | Tras cada despliegue |
| **Impresiones, clics, CTR y posición** | **Search Console** | Semanal, en cuanto exista |
| Ruso | Yandex Webmaster | Semanal, en cuanto exista |

Realismo, sin adornos: el SEO tarda **de seis a doce meses**. Los vídeos y las
comunidades dan tráfico en **días o semanas**. El orden correcto es hacer las dos cosas a
la vez, no una detrás de otra.

---

## 5 · Lo que NO hay que hacer, aunque te lo vendan

- **Comprar enlaces, PBN, intercambios masivos.** Es lo que más rápido tumba un dominio,
  y en YMYL el listón es más bajo todavía.
- **Generar más páginas desde listas de preguntas** (People Also Ask, AlsoAsked,
  AnswerThePublic). El sitio ya tiene 2.475 URLs generadas y es YMYL: ése es exactamente
  el patrón que persigue la política de *scaled content abuse* desde marzo de 2024. **Esa
  investigación es útil, pero su destino es enriquecer las páginas que ya existen** —
  empezando por las de 73 palabras—, no crear páginas nuevas.
- **Traducción automática masiva sin revisión.** Ya hay 80 fichas de mercado publicando
  inglés bajo `<html lang>` de otro idioma (G-43), y hoy ha aparecido un patrón japonés
  con el nombre invertido. Más volumen sin revisión multiplica ese tipo de error.
- **Mover el `hreflang` del `<head>` al sitemap.** Se descartó a propósito: los dos
  métodos son igual de válidos para Google, y cambiar el mecanismo de señalización sobre
  una indexación que se está consolidando no resuelve nada y sí puede costar caro.
- **Tocar los slugs españoles.** Es el único idioma con indexación consolidada; moverlo
  la tira. Los otros nueve ya se movieron, con página puente.
- **`meta keywords`.** Google confirmó en 2009 que no lo usa. Hoy sólo señala «SEO de
  hace quince años» a quien sí lo lee. Ya está retirado del repositorio.
- **Abrir una campaña de Google Ads «sólo para ver los volúmenes» del planificador.** Si
  lo que quieres son datos, Bing Webmaster y Yandex Wordstat te los dan gratis, y Search
  Console te da algo mejor: los tuyos, reales.

---

## 6 · Las tres decisiones que no puedo tomar por ti

1. **¿Hay un autor real que firmar?** Nombre, credenciales verificables y foto. Es el
   techo de E-E-A-T de todo el sitio y **no se puede inventar** — sería exactamente el
   tipo de contenido sin respaldo que las reglas del proyecto prohíben.
2. **¿Las calculadoras van delante del muro?** Regalar el cálculo y cobrar la memoria, el
   historial y las alertas mejoraría mucho el SEO de las fichas y la captación de
   enlaces. Es una decisión de modelo de negocio, no de SEO.
3. **G-43: ¿traducir las nueve fichas de mercado o retirar las 80 URLs** que hoy publican
   inglés bajo otro idioma?

---

## Dónde está cada cosa

| Necesito… | Documento |
|---|---|
| Verificar propiedad, enviar sitemap | [`setup/SEO_GUIDE.md`](./setup/SEO_GUIDE.md) |
| Cambiar una pieza de SEO sin romper nada | skill `mejorar-seo` · `.claude/rules/i18n-seo.md` |
| Medir competitividad | `frontend/scripts/auditar-visibilidad.js` |
| La puerta que bloquea el despliegue | `frontend/scripts/check-seo.js` |
| Precios, muro y conversión | skill `conversion-y-precio` |
| Comisiones de afiliados | [`PROGRAMA_AFILIADOS.md`](./PROGRAMA_AFILIADOS.md) |
