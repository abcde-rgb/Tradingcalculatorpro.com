---
name: mejorar-seo
description: >-
  Usar para auditar o mejorar el SEO de TradingCalculator.Pro: meta tags, títulos,
  sitemap, robots.txt, hreflang/idiomas, datos estructurados (schema.org), Open Graph,
  canonical, Search Console, indexación, velocidad o prerender. Úsalo también al añadir una
  página nueva (para no olvidar su SEO) o antes de lanzar. Conoce dónde vive cada pieza de
  SEO en este repo y cómo cambiarla sin romper nada.
---

# Mejorar el SEO de TradingCalculator.Pro

SEO = que Google/Bing encuentren, entiendan e indexen bien la web para que aparezca en
búsquedas. Este skill reúne **dónde está cada cosa** y **qué mejorar**, específico de este
proyecto (React SPA en GitHub Pages, 8 idiomas).

## 1. Arquitectura SEO (dónde vive cada pieza)

| Pieza | Archivo | Qué hace |
|---|---|---|
| **Meta por página** | `frontend/src/hooks/useSEO.js` | Hook que fija `<title>`, description, OG/Twitter, **canonical**, `lang/dir` y **hreflang** de los 8 idiomas en cada ruta. |
| **Meta base + schema** | `frontend/public/index.html` | Meta por defecto, **JSON-LD schema.org**, OG/Twitter, verificación (Google/Bing/Yandex), preconnect de fuentes. |
| **Sitemap** | `frontend/public/sitemap.xml` | Lista de páginas públicas. Se regenera con `frontend/scripts/gen-sitemap.js`. |
| **Robots** | `frontend/public/robots.txt` | Permite/bloquea crawlers + enlaza el sitemap. |
| **Textos SEO i18n** | `frontend/src/lib/i18n/*.js` | Claves `seo<Pagina>Title` / `seo<Pagina>Desc` por idioma. |
| **Guía de envío** | `SEO_GUIDE.md` (raíz) | Cómo verificar dominio y enviar el sitemap a Search Console/Bing/Yandex. |
| **Analítica** | `components/integrations/AnalyticsTracker.jsx` | GA4/GTM (mide, no posiciona). |

`ORIGIN` del canonical está en `useSEO.js` (`https://tradingcalculatorpro.com`). **Debe coincidir**
con el dominio del sitemap, robots y el CORS del backend (ver §6, gotcha de dominio).

## 2. Checklist de auditoría (recórrelo)

- [ ] **Cada página pública usa `useSEO`** con `titleKey` + `descriptionKey` + `canonicalPath`.
- [ ] Títulos únicos y descriptivos (<60 car.) y descriptions con gancho (<155 car.).
- [ ] **Claves SEO traducidas** en los 8 idiomas (`node scripts/i18n-check.js`; ver hueco G-09).
- [ ] **Sitemap** solo con páginas públicas indexables (sin login/muro) y dominio correcto.
- [ ] **robots.txt**: `Disallow` a `/api/`, `/admin/`, `/settings`, pagos; `Sitemap:` correcto.
- [ ] **hreflang** coherente (lo gestiona `useSEO`; no dejar alternates estáticos viejos).
- [ ] **JSON-LD** válido (Organization, WebSite, Product/Course según la página).
- [ ] **OG image real 1200×630** (`og-image.png`) y `og:url` por ruta.
- [ ] **Canonical** sin `?lang=` (el idioma se resuelve por hreflang).
- [ ] **Rendimiento**: build con code-splitting (ya hay), imágenes optimizadas, sin JS muerto.
- [ ] **Prerender/SSG** considerado (SPA: los crawlers deben ejecutar JS — ver §6).

## 3. Añadir SEO a una página nueva

1. En la página: `useSEO({ titleKey: 'seoMiPaginaTitle', descriptionKey: 'seoMiPaginaDesc', canonicalPath: '/mi-pagina' })`.
2. Añade las claves `seoMiPaginaTitle` / `seoMiPaginaDesc` en **es.js y en.js** (mínimo; el resto cae a es).
3. Si es **pública e indexable**, añádela a `PAGES` en `frontend/scripts/gen-sitemap.js` y regenera (§4).
   Si es privada/con muro (dashboard, settings…), **NO** la pongas en el sitemap y considera `Disallow` en robots.
4. `npm run build` para verificar.

## 4. Regenerar el sitemap

```bash
cd frontend && node scripts/gen-sitemap.js   # reescribe public/sitemap.xml
```
Edita `DOMAIN` y `PAGES` dentro del script. Solo rutas **públicas e indexables**.
Validar: https://www.xml-sitemaps.com/validate-xml-sitemap.html

## 5. Mejoras de mayor impacto (prioriza)

1. **Resolver el dominio** (§6) y unificar todo a él — sin esto, nada indexa bien.
2. **Verificar + enviar sitemap** en Google Search Console y Bing (ver `SEO_GUIDE.md`).
3. **Completar traducciones SEO** (títulos/descripcions en los 6 idiomas incompletos, G-09).
4. **Prerender** de las rutas públicas (react-snap o migrar a SSG/Next) → los crawlers ven HTML
   completo sin esperar a React. Es la mayor palanca para un SPA.
5. **Contenido**: la zona de Educación es el imán de tráfico; estructurar en URLs indexables,
   encabezados H1/H2 claros, FAQ con schema `FAQPage`.
6. **OG image real** y rich snippets (Product con precio para /pricing, Course para /education).

## 6. Gotchas / trampas conocidas

- **⚠️ Dominio inconsistente (BLOQUEA):** el frontend/SEO usa `tradingcalculatorpro.com` (.com)
  pero el **backend CORS** usa `tradingcalculator.pro` (.pro), y hoy se sirve en
  `abcde-rgb.github.io/Tradingcalculatorpro.com`. **Decide UNO** y actualiza: `useSEO.js`,
  `sitemap.xml`/`gen-sitemap.js`, `robots.txt`, `index.html` (canonical/OG) y el `_CORS_ORIGINS`
  del backend (`server.py`). Configura el CNAME de GitHub Pages.
- **SPA sin SSR:** GitHub Pages sirve `index.html` y React monta en el cliente. Google ejecuta
  JS (suele indexar), pero Bing/otros no siempre. Prerender mejora mucho la indexación.
- **404.html:** el deploy copia `index.html → 404.html` para rutas directas (no tocar).
- **Verificación:** los `content` de verificación pueden inyectarse por GitHub Secrets en el
  build (`REACT_APP_GSC_VERIFICATION`, `REACT_APP_BING_VERIFICATION`) — no hardcodear.
- **No indexar páginas con muro** (`/dashboard` es premium): fuera del sitemap.

## 7. Validar

```bash
# Tras desplegar:
curl https://DOMINIO/robots.txt
curl https://DOMINIO/sitemap.xml
```
- Rich results: https://search.google.com/test/rich-results
- Open Graph: https://www.opengraph.xyz/
- Search Console → Inspección de URL para ver cómo ve Google cada página.

## 8. Al terminar

Actualiza `docs/ESTADO_PROYECTO.md` (registro de sesiones y, si aplica, el backlog/§3).
Si tocaste el dominio, refléjalo también en `docs/DEPLOY_CHECKLIST.md`.
