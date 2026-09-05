---
paths:
  - "frontend/src/lib/i18n/**"
  - "frontend/scripts/gen-*.js"
  - "frontend/public/index.html"
  - "frontend/public/robots.txt"
  - "frontend/src/data/mockData.js"
---

# i18n y SEO generado

Guía completa: [`docs/setup/SEO_GUIDE.md`](../../docs/setup/SEO_GUIDE.md).

## 10 idiomas a la par, sin excepciones

`es, en, de, fr, ru, zh, ja, ar, pt, it` — mismo juego de claves en los diez.
`node scripts/i18n-check.js` falla si falta o sobra una, y corre en CI. Una clave sin
traducir cae a español por `t()`, que es peor que un hueco: no se ve.

⚠️ **`pt` e `it` no los ha revisado ningún nativo.** Están completos, no validados.

## Las páginas por estrategia se generan solas en el `postbuild`

`gen-seo-pages.js` lee `STRATEGIES` de `mockData.js` y emite **una página por estrategia ×
10 idiomas** con JSON-LD. Añadir una estrategia al array añade 10 páginas al sitemap; no
hay nada que escribir a mano.

Los nombres nuevos van **en literal** (los términos del sector no se traducen) y `tr()`
resuelve literal o clave i18n indistintamente.

## ⚠️ GitHub Pages devuelve 404 en toda ruta sin fichero físico

**La regla más cara de este repositorio, y la más invisible.** Pages sólo sirve
`index.html` en la RAÍZ. Cualquier otra ruta que no tenga su propio fichero recibe
`404.html` — **con estado HTTP 404**. El workflow copia ahí el shell del SPA, así que la
persona ve la web perfecta y el rastreador ve un 404 y no indexa. Siete rutas llevaban
así desde siempre, anunciadas en el sitemap (BUG-081).

Por eso `gen-seo-pages.js` escribe un `build/<ruta>/index.html` real para cada ruta
pública del SPA (`RUTAS_SPA`). **Si añades una ruta pública a `src/App.js` y quieres que
se indexe, añádela también ahí.** Si no, será un 404 para Google y nadie se enterará.

Y al revés: **nunca escribas un fichero estático sobre una ruta que sirve el SPA**. Le
robarías la pantalla a quien recargue esa URL. Es la razón de que el hub de estrategias
viva en `/strategies/` y no en `/options/strategies/`, que es `OptionsStrategiesIndexPage`.

## Lo que tiene muro NO va al sitemap

`/education`, `/options`, `/options/strategies`, `/dashboard`, `/performance` y `/plan`
son `ProtectedRoute` en `src/App.js`: mandan a `/login` a quien no ha entrado. Anunciarlas
sólo consigue que Google indexe una pantalla de acceso. Están en `robots.txt` y fuera del
sitemap; su contenido público vive en las páginas estáticas, que no tienen muro.

⚠️ `robots.txt` resuelve por **coincidencia más larga**, no por orden. Por eso
`Disallow: /options` convive con `Allow: /options/strategies/`: sin ese `Allow`, el
`Disallow` se llevaría por delante las 66 fichas públicas de estrategia.

## Hubs, slugs y páginas puente

- **Los cuatro hubs** (`/learn/`, `/tools/`, `/markets/`, `/strategies/`, y sus
  `/<idioma>/…`) son el esqueleto: sin ellos las 1.680 páginas son huérfanas, alcanzables
  sólo por el sitemap —que descubre, pero no reparte autoridad—. `check-seo.js` falla si
  una página se queda sin hub que la enlace.
- **El slug sale del título traducido**, no del español. Cirílico transliterado; zh/ja/ar
  caen al inglés. **`es` no se deriva nunca**: es el único idioma con indexación
  consolidada y moverlo sería tirarla.
- **Al cambiar un slug se publica una página puente** en la URL vieja (`canonical` +
  `meta refresh`). Pages no sirve cabeceras, así que un 301 de verdad es imposible. Los
  puentes **no van al sitemap** y no pueden pisar una página real: el generador aborta si
  chocan.

## La description se recorta con `recortar()`, no con `slice()`

Un `.slice(0, 158)` parte la última palabra, y entonces el buscador **descarta la
descripción** y se inventa el resumen con el texto de la página. Pasó: Yandex publicaba el
descargo legal del pie como si fuera la descripción del tema (BUG-084).

## Nada de dominios a mano

Todo el SEO sale de `DEFAULT_ORIGIN` / `SITE_ORIGIN`, hoy
`https://tradingcalculator.pro` — el dominio propio, activo desde el 2026-08-28
(`frontend/public/CNAME`, `PUBLIC_URL: /`). Canonical, hreflang de los 10 idiomas,
sitemap y JSON-LD son coherentes entre sí — si cambias uno, cambian todos.

⚠️ **`tradingcalculatorpro.com` (sin punto, con «pro» pegado) NO es nuestro**: lo sirve
un tercero. Se llama así el repositorio, y confundirlos ya tumbó la web entera una vez
(BUG-067). El origen vive en cinco sitios que tienen que decir lo mismo: `public/CNAME`,
`SITE_ORIGIN` del workflow, `homepage` de `package.json`, `ORIGIN` de `useSEO.js` y los
`DEFAULT_ORIGIN` de `gen-sitemap.js`/`gen-seo-pages.js` — **más `_CORS_ORIGINS` y
`DEFAULT_FRONTEND_URL` del backend**, que es lo que se olvidó.
Historia y pasos pendientes: [`docs/MIGRACION_DOMINIO.md`](../../docs/MIGRACION_DOMINIO.md).

## Estos ficheros ensucian las búsquedas

Los 10 ficheros de `lib/i18n/` son ~4.000 líneas **cada uno** y aparecen en casi cualquier
`grep` de contenido: en una búsqueda típica, 20 de los ~90 ficheros que salen son i18n.

Cuando busques **código**, exclúyelos:

```bash
grep -rn "loQueSea" frontend/src --include=*.jsx --include=*.js | grep -v "lib/i18n/"
```

Para preguntas de traducción, la herramienta correcta es `i18n-check.js --full`, no grep.
