---
name: mejorar-seo
description: >-
  Usar para auditar o mejorar el SEO de TradingCalculator.Pro: páginas estáticas
  prerenderizadas, sitemap, robots.txt, hreflang/idiomas, datos estructurados
  (schema.org), Open Graph, canonical, hubs de sección, lastmod, Search Console e
  IndexNow. Úsalo también al añadir un tipo de contenido nuevo (para saber si toca
  `gen-seo-pages.js` o `useSEO.js`) o antes de lanzar. Conoce dónde vive cada pieza de
  SEO en este repo y cómo cambiarla sin romper nada.
---

# Mejorar el SEO de TradingCalculator.Pro

SEO = que Google/Bing/Yandex encuentren, entiendan e indexen bien la web. Este proyecto
tiene **dos superficies de SEO distintas**, y confundirlas es el error más caro: casi
todo el contenido indexable ya NO es la SPA — es HTML estático generado en el `postbuild`.

## 0. Antes de nada: ¿qué superficie estoy tocando?

| Si el contenido... | vive en... | y su SEO lo gestiona... |
|---|---|---|
| es una **calculadora, tema de academia, mercado, estrategia de opciones, patrón chartista o de vela** | datos ya existentes en la app (`mockData.js`, `tradingEducationContent.js`, `marketTypesContent.js`, i18n) | **`frontend/scripts/gen-seo-pages.js`** — genera HTML autocontenido en el `postbuild`, sin React |
| es una **ruta de la SPA pública** (`/pricing`, `/about`, `/contact`, `/legal`) | `src/pages/*.jsx`, montada por React Router | **ambos**: `gen-seo-pages.js` le escribe un `index.html` propio (para que GitHub Pages no le dé 404, ver §6) y la página en sí sigue usando `useSEO()` para cuando React monta encima |
| es una **pantalla tras el muro** (`/dashboard`, `/options*`, `/education`, `/performance`, `/settings`…) | `src/pages/*.jsx`, `ProtectedRoute` | **`useSEO({ noindex: true })`** — nunca `gen-seo-pages.js`. No se indexa a propósito: es contenido de pago |

Si dudas cuál te toca: **¿existe ya como dato dentro de la app, sin sesión, y quieres
que Google lo vea?** → `gen-seo-pages.js`. **¿Es una pantalla de React que se monta con
JS?** → `useSEO.js`.

## 1. `gen-seo-pages.js` — el motor de páginas estáticas (la superficie que importa)

Corre como `postbuild` (después de `craco build`) y hoy genera **2.410 páginas +
60 hubs de sección + sitemap.xml (2.475 URLs)**, sin depender de que ningún
rastreador ejecute React:

| Sección | Origen del contenido | Slug |
|---|---|---|
| Calculadoras (`/tools/<slug>/`) | tabla propia en el script | traducido, ancla en `es` |
| Academia (`/learn/<slug>/`) | `tradingEducationContent.js` (conceptos) + `lib/i18n/*.js`+`*.edu.js` | traducido, ancla en `es` |
| Mercados (`/markets/<id>/`) | `marketTypesContent.js` | traducido, ancla en `es` |
| Estrategias (`/options/strategies/<slug>/`) | `mockData.js` (`STRATEGIES`) | traducido, ancla en `es` |
| Patrones chartistas (`/patterns/<id>/`) | `tradingEducationContent.js` (`getChartPatterns`) | **`id` sin traducir** (jerga técnica) |
| Patrones de vela (`/candles/<id>/`) | `tradingEducationContent.js` (`getCandlestickPatterns`) | **`id` sin traducir** |

Todas comparten el mismo `render()`: canonical auto-referente, hreflang de los 10
idiomas **en el `<head>`** (no sólo en el sitemap — ver §6), Open Graph, `BreadcrumbList`,
CSP propia (`default-src 'none'`, son autocontenidas), y un CTA hacia la app de pago.

### Cómo se ve una sección por dentro (patrones/candles como ejemplo guía)

Las seis secciones son el mismo patrón repetido seis veces. Si añades una séptima
(un dato nuevo que ya existe en la app y que quieres indexar), sigue estos pasos EN
ESTE ORDEN — es literalmente lo que se hizo para patrones/candles el 2026-09-05:

1. **Localiza el dato de origen.** No dupliques texto: llama al mismo getter/objeto
   que usa la pantalla de React (`EDU.getXxx(t)`, un array exportado, etc.) con
   `t = (k) => T[lang][k] || k`. Si el dato no existe todavía en ningún sitio de la
   app, **esto no es tu tarea**: no inventes contenido para llenar páginas (ver §5,
   "contenido a escala").
2. **Decide el slug.** ¿Es jerga técnica que se busca igual en cualquier idioma
   ("head-shoulders", nombres de estrategias de opciones)? Usa el `id` tal cual, sin
   `tablaDeSlugs()` ni página puente. ¿Es un título traducible? Usa
   `tablaDeSlugs(entradas, idDe, titulosDe)` — el español NUNCA se deriva (es el único
   idioma con indexación consolidada; moverlo la tira).
3. **Añade la sección a `SECCIONES`** (activa su hub en `/<idioma>/<seccion>/`) y a
   `indice` (`indice.miSeccion = {}`) — **las dos**, o el generador revienta al llegar
   al hub con `Cannot read properties of undefined` (fue exactamente el bug que
   bloqueó la primera versión de patrones/candles).
4. **Añade la etiqueta de la sección** a `navHubs()`, `HUB_UI` (los 10 idiomas) y
   `CONTADOR`, y el caso especial en `renderHub()` si el título no sale de `HUB_UI`.
5. **Escribe el bucle de generación**: por cada entrada × cada idioma, `render()` con
   `fecha = fechaReal(...todas las rutas fuente...)` (nunca la fecha del build — ver
   más abajo), `sitemapUrls.push([...])` e `indice.miSeccion[lang].push({...fecha})`.
6. **`node --check scripts/gen-seo-pages.js`**, luego `npm run build` completo, luego
   `node scripts/check-seo.js`. Tiene que salir en verde sin excepciones nuevas.
7. **Sabotea tu propio código** en `scripts/probar-verificadores.sh`: como mínimo, un
   caso que rompa el enlace del hub nuevo y compruebe que `check-seo.js` lo detecta.
   Sin esto no cuenta como terminado — ver §4.

### `lastmod` real, no la fecha del build

`fechaReal(...rutas)` en `gen-seo-pages.js` deriva la fecha de `git log -1 --date=short
-- ruta1 ruta2…` sobre el/los fichero(s) fuente del CONTENIDO. **Un solo `--`**, con
todas las rutas detrás — un segundo `--` es un pathspec literal que no casa nada y git
lo tolera en silencio devolviendo el commit más reciente del repo ENTERO en vez de
filtrar (BUG-089, real hasta el 2026-09-05). Si tocas esta función, pruébala con más de
una ruta y confirma que el resultado varía según CUÁL de las rutas es más reciente, no
sólo que devuelve "una fecha".

## 2. `useSEO.js` — sólo para rutas de la SPA

Hook que fija `<title>`, description, OG/Twitter, canonical, `lang`/`dir` y
`og:locale` cuando React monta una página. **Ya no** gestiona la lista de hreflang por
idioma salvo para las rutas que también tienen ficha estática (ver §0) — para el resto
de la app (todo tras el muro) no hace falta: son idiomas de la MISMA URL, resueltos por
el store de locale, no URLs distintas por idioma.

```js
useSEO({ titleKey: 'seoMiPaginaTitle', descriptionKey: 'seoMiPaginaDesc',
         canonicalPath: '/mi-pagina', noindex: false });
```

`noindex: true` en cualquier pantalla tras `ProtectedRoute`. Si una ruta con
`noindex: true` en su componente aparece en la tabla `APP` de `gen-seo-pages.js` **como
indexable**, el generador **aborta el build** (guarda IIFE tras la definición de `APP`)
— es la contradicción exacta que sacó `/brokers` y `/backtesting` del sitemap. Una ruta
premium o de acceso sí puede estar en `APP`: entra con la última columna a `false`, así
que recibe fichero (200) y `noindex, follow`, y no se anuncia.

## 3. Verificadores (usa el más barato para lo que preguntas)

| Herramienta | Qué mide | Cuándo |
|---|---|---|
| `node scripts/check-seo.js` | El `build/` en disco: canonical, hreflang ×10 + reciprocidad, JSON-LD, favicon, description sin cortar a media palabra, robots.txt por coincidencia más larga, huérfanas (todo a ≤2 saltos de un hub), puentes, `lastmod` no caído al build-date | Siempre, tras `npm run build`. Es el gate offline |
| `node scripts/check-seo-en-vivo.js [URL]` | El sitio YA PUBLICADO: códigos de estado reales, canonical que no se ha desincronizado del deploy | Tras desplegar. **Sin red en este sandbox** — pruébalo contra `npx serve -s build` en local; en real corre en `seo-en-vivo.yml` |
| subagente `auditor-seo` | Veredicto compacto sin volcar 2.475 páginas al contexto | Antes de un deploy, o para no gastar contexto en una auditoría rutinaria |
| skill `auditar-seo-spa` | Otra checklist técnica (prerender/JSON-LD/noindex), con más foco en Lighthouse/Screaming Frog externos | Complementaria — coordínalas, no dupliques el mismo hallazgo en las dos |

## 4. Ley del repo: ningún verificador nuevo sin sabotaje

Si tocas o añades una comprobación en `check-seo.js`, o una sección en
`gen-seo-pages.js`, añade su caso en `scripts/probar-verificadores.sh`
(`probar "nombre" "comando" "sabotaje" "restaurar"`). Pruébalo aparte antes de correr
el arnés completo (~25 min): extrae la función `probar()` con
`sed -n '89,132p' scripts/probar-verificadores.sh` a un script de usar y tirar, defina
las variables que tu caso necesite, y ejecuta sólo ese caso. Debe: aplicarse,
detectarse como fallo, y restaurar sin dejar residuo (el siguiente `comando` vuelve a
pasar). Un verificador que nunca se ha visto fallar no es un verificador.

## 5. Checklist de auditoría

- [ ] Cada sección de contenido en `gen-seo-pages.js` tiene su hub, y el hub la enlaza
      de verdad (no basta con que `check-seo.js` no proteste: mira `hubCount`/`n` en su
      salida y confirma que crecen con tus páginas nuevas).
- [ ] `node scripts/i18n-check.js` — 0 claves crudas, mismo total en los 10 idiomas.
- [ ] `robots.txt`: nada con muro en el sitemap; `Allow` explícito donde un `Disallow`
      más corto se llevaría por delante contenido público (ver `/options` vs
      `/options/strategies/`).
- [ ] JSON-LD válido y **describiendo sólo lo que la página muestra** — un `HowTo`
      sobre pasos que no están impresos (porque viven tras el muro) es peor que no
      tener schema: Google indexa una promesa vacía.
- [ ] `og-image` real (1200×630, PNG — SVG no renderiza en redes sociales).
- [ ] Canonical auto-referente, sin `?lang=`.
- [ ] Ninguna cifra inventada. Un dato como "el 80 % de las opciones expiran sin
      valor" sin fuente real costó una corrección en los 10 idiomas (2026-09-05): si
      vas a citar una estadística, cita la fuente o no la publiques.
- [ ] `bash scripts/probar-verificadores.sh` si tocaste algún verificador o generador.

## 6. Trampas conocidas

- **GitHub Pages sólo sirve `index.html` en la RAÍZ.** Cualquier otra ruta sin fichero
  físico recibe `404.html` **con código HTTP 404** — invisible para una persona (ve el
  SPA perfecto), fatal para un rastreador. Por eso las rutas de la SPA (la tabla `APP`
  de `gen-seo-pages.js`) se escriben en las dos formas —`<ruta>.html` y
  `<ruta>/index.html`—, y por eso una ruta nueva que quieras servir con 200 necesita
  entrar ahí. Detalle completo:
  `.claude/rules/i18n-seo.md` (se carga solo al tocar ficheros de esta zona).
- **`gen-sitemap.js` existe pero está MUERTO.** Nada lo ejecuta (`postbuild` sólo corre
  `gen-seo-pages.js`). Se queda en el repo a propósito: `check-seo.js` comprueba que
  `public/sitemap.xml` NO exista, precisamente porque `gen-sitemap.js` es lo único que
  lo escribiría, y si reaparece es señal de que alguien lo ha ejecutado por error. **No
  lo "arregles" ni lo uses como referencia** — la lógica correcta es la de
  `gen-seo-pages.js`.
- **El hreflang va en el `<head>` de cada página, no sólo en el sitemap.** Algunas
  guías externas recomiendan declararlo sólo en el sitemap para sitios grandes. Aquí
  se descartó esa recomendación a propósito (2026-09-05): el de `<head>` está
  verificado funcionando con reciprocidad y `x-default` en las 2.475 páginas, y ambos
  métodos son igual de válidos para Google — cambiar el mecanismo de señalización de
  idioma sobre una indexación que ya se está consolidando no resuelve nada y sí puede
  costar caro.
- **`robots.txt` resuelve por coincidencia MÁS LARGA**, no por orden ni sólo por
  `Disallow`, y así lo lee `check-seo.js`. Si añades un `Disallow` sobre una rama que
  contiene páginas del sitemap (`Disallow: /options` se llevaría las 660 fichas de
  `/options/strategies/…`), es el `Allow` más largo lo que las salva.
- **Una ruta con página propia NO se bloquea en `robots.txt`.** `/education`, `/options`
  y `/options/strategies` tienen muro, pero responden 200 con `noindex, follow` y están
  fuera de `robots.txt` a propósito: prohibida ahí, un rastreador nunca leería su
  `noindex` y podría indexar la URL a secas por los miles de enlaces internos que la
  citan. En `robots.txt` sólo va lo que no tiene fichero.
- **El dominio es `tradingcalculator.pro`** (con punto). `tradingcalculatorpro.com` es
  el nombre del repositorio y pertenece a un tercero — ponerlo en un canonical o en el
  CORS del backend ya tumbó la web una vez (BUG-067). Si cambia, se actualiza a la vez
  en `public/CNAME`, `SITE_ORIGIN` del workflow, `homepage` de `package.json`,
  `useSEO.js`, `gen-seo-pages.js` y `_CORS_ORIGINS`/`DEFAULT_FRONTEND_URL` del backend.
- **Contenido a escala.** El sitio ya son ~2.475 URLs y es YMYL (finanzas), el nivel de
  E-E-A-T más alto que aplica Google. Generar más páginas desde listas de preguntas
  (People Also Ask, AlsoAsked…) sin contenido real detrás es el patrón que persigue la
  política de *scaled content abuse* desde marzo de 2024. Usa esa investigación para
  enriquecer páginas que ya existen, no para inflar el conteo. Y nunca generes una
  página desde datos puramente numéricos sin texto real que decir (por eso el catálogo
  de ~186 instrumentos de `instrumentSpecs.generated.js` — sólo specs, sin narrativa —
  no tiene una página por activo).

## 7. Lo que no es una decisión técnica

- **Autoría / E-E-A-T**: Google valora una biografía de autor real con credenciales
  verificables. No hay una que publicar todavía, y fabricarla sería el tipo exacto de
  contenido sin respaldo que las reglas de honestidad numérica de este proyecto
  prohíben. Hace falta un nombre, credenciales y foto reales — pregúntalo, no lo
  inventes.
- **Calculadoras delante del muro** ("regala el cálculo, cobra la memoria/el
  historial/las alertas"): mejoraría el SEO de las fichas de calculadora, pero es una
  decisión de modelo de negocio, no de SEO. No la tomes sin que el dueño la apruebe.

## 8. IndexNow

`frontend/scripts/indexnow-ping.js` avisa a Bing/Yandex tras cada despliegue, con las
URLs cuyo `lastmod` es HOY (reutiliza `fechaReal()`, no reenvía las 2.475 cada vez). La
clave (`frontend/public/<key>.txt`) no es secreta — el protocolo la usa para probar
propiedad del dominio, igual que la verificación HTML de Search Console — así que vive
en el repo. Corre como paso `continue-on-error` en `deploy-gh-pages.yml`, después de
publicar: un fallo de red ahí no debe deshacer un despliegue que ya tuvo éxito.

Detalle operativo de envío a Search Console/Bing/Yandex y verificación de propiedad:
[`docs/setup/SEO_GUIDE.md`](../../../docs/setup/SEO_GUIDE.md).

## 9. Al terminar

Actualiza `docs/ESTADO_PROYECTO.md` (§ cifras de páginas/sitemap si cambiaron) y añade
una entrada en `docs/REGISTRO_SESIONES.md`. Si añadiste una sección nueva a
`gen-seo-pages.js`, confirma que `python scripts/gen-mapa.py --check` sigue en verde.
