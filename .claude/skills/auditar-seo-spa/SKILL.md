---
name: auditar-seo-spa
description: Audita el SEO técnico de la SPA React desplegada en GitHub Pages (prerender de páginas estáticas, canonical, hreflang x10, JSON-LD FAQPage/HowTo/LearningResource, sitemap, robots, noindex en páginas privadas). Úsala antes de un deploy o cuando se toque useSEO.js, gen-seo-pages.js o el sitemap.
---

# Auditoría SEO técnica (SPA en GitHub Pages)

Google **no ejecuta JS de forma fiable** → lo que no esté en el HTML prerenderizado
(`postbuild` → `gen-seo-pages.js`) no se indexa bien. La academia (~560 páginas) y las
calculadoras (~96 páginas) son el mayor activo SEO.

## Comprobaciones
1. **Canonical / hreflang / OG** apuntan a la URL de despliegue vigente
   (`https://abcde-rgb.github.io/Tradingcalculatorpro.com`, o el dominio propio si se activa).
2. **og-image = PNG 1200×630** (NUNCA svg: las redes no lo renderizan).
3. **noindex** en dashboard/settings/admin/subscription/performance/404 y en el workspace de
   opciones de pago. Verifícalo en `useSEO` y en el prerender.
4. `npm run build` genera las páginas estáticas + `sitemap.xml`; valida HTML autocontenido
   (>100 palabras reales, JSON-LD correcto, CTA con `?tab=`/`?topic=`).
5. **Featured snippets:** las FAQ (p. ej. de tipos de mercado, "largest cryptocurrencies",
   "what is a pip") deben emitir **FAQPage JSON-LD** en las páginas prerenderizadas, en inglés.
   Las calculadoras emiten **HowTo**. Comprueba que el generador incluye el `@type` correcto.
6. **robots.txt:** sin `Allow` a rutas con muro.

## Herramientas externas a combinar
Lighthouse CI (rendimiento/SEO), Screaming Frog/sitebulb (crawl), Search Console (indexación).
Coordina con la skill `mejorar-seo` (ya existe) para no duplicar cambios.
