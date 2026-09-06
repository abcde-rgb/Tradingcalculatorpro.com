# SEO — Guía de Verificación y Envío del Sitemap

> ⚠️ **El dominio es `tradingcalculator.pro`** (con punto, «pro» como TLD).
> Hasta el 2026-09-06 esta guía decía `tradingcalculatorpro.com` en sus seis
> pasos operativos —el de Search Console incluido—, y **ese dominio es de un
> tercero**: se llama así el repositorio, y confundirlos ya tumbó la web entera
> una vez (BUG-067). Quien hubiera seguido esta guía al pie de la letra habría
> intentado verificar en Google, Bing y Yandex la propiedad de una web ajena.
>
> **Ningún verificador lo cazaba, y sigue sin cazarlo.** `check-seo.js` mira el
> `build/`; `check-doc-links.py` sólo comprueba que los enlaces resuelvan, y
> éstos resolvían. Un documento operativo que se lee y se teclea a mano no tiene
> red debajo: si tocas dominios aquí, compruébalos a mano contra los siete
> sitios que enumera `.claude/rules/i18n-seo.md`.


## 1) Meta tags de verificación

Los códigos NO se editan a mano en `frontend/public/index.html`: viajan como
secretos del repositorio y el build los interpola. Los `%REACT_APP_*%` de abajo
son los marcadores reales:

| Buscador | Secreto del repositorio | Estado |
|---|---|---|
| Google Search Console | `REACT_APP_GSC_VERIFICATION` | cableado |
| Bing Webmaster | `REACT_APP_BING_VERIFICATION` | cableado |
| Yandex Webmaster | `REACT_APP_YANDEX_VERIFICATION` | cableado, **secreto sin poner** |
| Pinterest · Meta | — | comentados en `index.html`, sin cablear |

Se ponen en GitHub → Settings → Secrets and variables → Actions, y entran en el
HTML en el siguiente despliegue. Si un secreto no está, su `meta` sale vacío y
no pasa nada.

## 2) Cómo obtener cada código

### 🔍 Google Search Console (PRIORITARIO)
1. Ir a: https://search.google.com/search-console
2. **Añadir propiedad** → elegir **"Prefijo de URL"** → introducir `https://tradingcalculator.pro/`
3. Método de verificación: **"Etiqueta HTML"**
4. Google te muestra: `<meta name="google-site-verification" content="aBcDeFgHiJkLmN..." />`
5. Copia SOLO el valor de `content` y ponlo en el secreto `REACT_APP_GSC_VERIFICATION`
   (§1) — **no** lo pegues en `index.html`: ahí sólo vive el marcador `%REACT_APP_…%`
6. Despliega (push a `main` que toque `frontend/**`, o Actions → «Build & Deploy» → Run)
7. Vuelve a Search Console y haz clic en "Verificar"

### 🔍 Bing Webmaster Tools
1. https://www.bing.com/webmasters
2. **Añadir un sitio** → introducir `https://tradingcalculator.pro`
3. Método **"Meta tag"** → te dan `msvalidate.01`
4. Al secreto `REACT_APP_BING_VERIFICATION`, y desplegar

### 🔍 Yandex Webmaster
1. https://webmaster.yandex.com
2. Verificar con meta tag → al secreto `REACT_APP_YANDEX_VERIFICATION`, y desplegar
3. **Es el que falta hoy.** Sin la propiedad verificada no se le puede enviar el
   sitemap ni pedirle que rastree el favicon, que es la vía por la que el icono
   deja de ser el globo genérico en sus resultados

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
2. URL completa: `https://tradingcalculator.pro/sitemap.xml`

### Yandex Webmaster
1. **Indexación** → **Archivos sitemap**
2. Añadir URL del sitemap

---

## 4) Verificación final

Después de desplegar, comprobar:

```bash
# Robots.txt accesible
curl https://tradingcalculator.pro/robots.txt

# Sitemap accesible y válido
curl https://tradingcalculator.pro/sitemap.xml

# Meta tags presentes
curl -s https://tradingcalculator.pro/ | grep -i "verification\|google-site"
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
