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

## ⚠️ El JSON-LD anuncia `price: "0"` con muro de pago duro (G-28)

`gen-seo-pages.js` emite `offers: { price:'0', priceCurrency:'EUR' }` en las páginas de
calculadora, y sus títulos dicen «Gratis» / «Free». Pero desde el 2026-08-02 **todo el
contenido está tras el muro de pago**, y `public/index.html` declara ofertas de
17/45/200 €.

Son dos declaraciones contradictorias del mismo producto para Google, y un destino que no
cumple lo que promete el título. Si tocas el generador, arréglalo.

## Nada de dominios a mano

Todo el SEO sale de `DEFAULT_ORIGIN`, hoy
`https://abcde-rgb.github.io/Tradingcalculatorpro.com`. **No hay `CNAME`**: el dominio
propio `tradingcalculatorpro.com` no está en uso. Canonical, hreflang de los 10 idiomas,
sitemap y JSON-LD son coherentes entre sí — si cambias uno, cambian todos.
Para activar el dominio: [`docs/MIGRACION_DOMINIO.md`](../../docs/MIGRACION_DOMINIO.md).

## Estos ficheros ensucian las búsquedas

Los 10 ficheros de `lib/i18n/` son ~4.000 líneas **cada uno** y aparecen en casi cualquier
`grep` de contenido: en una búsqueda típica, 20 de los ~90 ficheros que salen son i18n.

Cuando busques **código**, exclúyelos:

```bash
grep -rn "loQueSea" frontend/src --include=*.jsx --include=*.js | grep -v "lib/i18n/"
```

Para preguntas de traducción, la herramienta correcta es `i18n-check.js --full`, no grep.
