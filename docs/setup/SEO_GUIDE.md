# SEO — Guía de Verificación y Envío del Sitemap

## 1) Meta tags de verificación

Editar `/app/frontend/public/index.html` y reemplazar los placeholders:

```html
<meta name="google-site-verification" content="TU_CODIGO_GOOGLE" />
<meta name="msvalidate.01"            content="TU_CODIGO_BING" />
<meta name="yandex-verification"      content="TU_CODIGO_YANDEX" />
<meta name="p:domain_verify"          content="TU_CODIGO_PINTEREST" />
<meta name="facebook-domain-verification" content="TU_CODIGO_META" />
```

## 2) Cómo obtener cada código

### 🔍 Google Search Console (PRIORITARIO)
1. Ir a: https://search.google.com/search-console
2. **Añadir propiedad** → elegir **"Prefijo de URL"** → introducir `https://tradingcalculatorpro.com/`
3. Método de verificación: **"Etiqueta HTML"**
4. Google te muestra: `<meta name="google-site-verification" content="aBcDeFgHiJkLmN..." />`
5. Copia SOLO el valor de `content` y pégalo en `index.html`
6. Despliega tu app
7. Vuelve a Search Console y haz clic en "Verificar"

### 🔍 Bing Webmaster Tools
1. https://www.bing.com/webmasters
2. **Añadir un sitio** → introducir `https://tradingcalculatorpro.com`
3. Método **"Meta tag"** → te dan `msvalidate.01`
4. Pegar valor y desplegar

### 🔍 Yandex Webmaster
1. https://webmaster.yandex.com
2. Verificar dominio con meta tag `yandex-verification`

### 🔍 Pinterest (opcional pero útil para imágenes de patrones)
1. https://www.pinterest.com/business/
2. Confirmar sitio web → método meta tag

### 🔍 Meta/Facebook Domain (opcional)
1. https://business.facebook.com → Configuración → Dominios verificados
2. Método meta tag

---

## 3) Enviar el sitemap (clave para indexación rápida)

### Google Search Console
1. Una vez verificado, en el menú izquierdo → **"Sitemaps"**
2. Introducir: `sitemap.xml`
3. Clic **Enviar**
4. Google indexará en 1-7 días

### Bing Webmaster Tools
1. Menú **"Sitemaps"** → **Enviar sitemap**
2. URL completa: `https://tradingcalculatorpro.com/sitemap.xml`

### Yandex Webmaster
1. **Indexación** → **Archivos sitemap**
2. Añadir URL del sitemap

---

## 4) Verificación final

Después de desplegar, comprobar:

```bash
# Robots.txt accesible
curl https://tradingcalculatorpro.com/robots.txt

# Sitemap accesible y válido
curl https://tradingcalculatorpro.com/sitemap.xml

# Meta tags presentes
curl -s https://tradingcalculatorpro.com/ | grep -i "verification\|google-site"
```

Validar el sitemap con: https://www.xml-sitemaps.com/validate-xml-sitemap.html
Validar JSON-LD con: https://search.google.com/test/rich-results
Validar Open Graph con: https://www.opengraph.xyz/

---

## 5) Datos estructurados — qué rinde y qué ya no

**Comprobado el 2026-08-08.** Dos de los formatos que el proyecto emite ya no
producen ningún resultado enriquecido en Google. No hay nada roto y **no hay que
borrarlos** —siguen siendo Schema.org válido y Google los sigue parseando para
entender la página—, pero conviene no invertir más esfuerzo esperando un
resultado visual que no va a llegar.

| Tipo | Dónde se emite | Estado en Google |
|---|---|---|
| `HowTo` | `gen-seo-pages.js` → **660 páginas** (66 estrategias × 10 idiomas) | ❌ **Retirado.** Fuera de móvil en agosto 2023 y de escritorio en septiembre 2023. Google eliminó incluso la documentación del formato. |
| `FAQPage` | `public/index.html` (portada) y fichas de `/markets/<id>/` | ❌ **Retirado.** Restringido a webs gubernamentales y sanitarias en agosto 2023, y suprimido por completo el **7 de mayo de 2026**. Sale del informe de Search Console en junio de 2026 y de la API en agosto. |
| `WebApplication`, `Organization`, `WebSite` + `SearchAction` | `public/index.html` | ✅ Vigentes |
| `BreadcrumbList` | `gen-seo-pages.js`, `useSEO.js` | ✅ Vigente |
| `Course` / `CourseInstance` | Education Center | ✅ Vigente |
| `Offer` | `/pricing` | ✅ Vigente |

**Qué NO hacer a raíz de esto:**

- No borrar el marcado. No penaliza, y sigue sirviendo para que el buscador
  entienda la estructura de la página (y para asistentes/LLM que leen JSON-LD).
- No sustituir `FAQPage` por otro tipo "que sí salga": no existe un reemplazo.
  El bloque de preguntas se mantiene porque **responde al usuario**, no por el
  SERP.

**Qué SÍ conservar del criterio que ya estaba escrito.** El comentario de
`gen-seo-pages.js` dice que el marcado `FAQPage` sólo es válido si la pregunta y
la respuesta están **visibles en la página**. Esa regla sigue siendo la buena;
lo que cambia es el motivo: ya no es para ganar el resultado enriquecido, es
para que el contenido responda de verdad a la intención de búsqueda.

**Aviso sobre contenido a escala (importante en este proyecto).** El sitio ya
genera ~1.589 URLs automáticamente y es **YMYL** (finanzas), la categoría a la
que Google aplica el listón de E-E-A-T más alto. Ampliar el corpus generando más
páginas desde listas de preguntas (People Also Ask, AlsoAsked, AnswerThePublic y
similares) es exactamente el patrón que persigue la política de *scaled content
abuse* desde marzo de 2024. La investigación de preguntas es útil, pero el
destino correcto es **enriquecer las páginas que ya existen** —sobre todo con
preguntas reales por idioma, que hoy son las mismas cinco traducidas— y no crear
páginas nuevas.

## 6) Próximos pasos opcionales

- **Google Analytics 4**: añadir tag GA4 en `index.html` (te da datos de conversión).
- **Google Tag Manager**: si quieres añadir múltiples tags sin redeplegar.
- **Schema.org Course detallado**: enlazar cada `tab` del Education Center como `CourseInstance` propio con `learningResourceType: "Lesson"`.
- ~~Pre-render con Vite SSG/Next.js~~ — **hecho, sin migrar nada**: `gen-seo-pages.js`
  genera HTML completo (2.475 URLs: calculadoras, academia, mercados, estrategias,
  patrones, candelas y sus hubs) en el `postbuild`, así que los rastreadores lo ven
  sin esperar a que React monte. Sigue habiendo SPA pura detrás del muro
  (`/dashboard`, `/options/calculator`…) — a propósito, no es contenido indexable.
- ~~Imagen `og-image.jpg` real (1200×630)~~ — **hecho**: `/og-image.png`, 1200×630,
  citada por su nombre real en `useSEO.js` y en `OG_IMAGE` de `gen-seo-pages.js`.
