# Captar tráfico a gran escala — plan de acción

Dos frentes: **(2) que Google vea muchas páginas** (código, ya hecho) y **(3) que otras webs te enlacen** (manual, esta guía). El punto 3 es el que más pesa en Google y el más lento; no se puede "programar" (hacerlo con bots = penalización). Aquí tienes qué hacer, tú o quien lleve el marketing.

> ⚠️ **Recordatorio del freno nº1:** todo esto rinde MUCHO más con **dominio propio** (~12 €/año). En el subdominio `github.io` el techo es bajo. Las páginas nuevas ya son portables: el día que compres dominio, funcionan igual.

---

## Punto 2 — Páginas indexables (✅ HECHO en código)

- **22 páginas estáticas nuevas** generadas en cada deploy (`scripts/gen-seo-pages.js`, hook `postbuild`):
  - 12 calculadoras en `/tools/<slug>/` (intención comercial: "calculadora de tamaño de posición", "calculadora de lotes forex"…).
  - 10 temas en `/learn/<slug>/` ("patrones de velas japonesas", "gestión del riesgo"…).
- Cada página: HTML completo (Google lee el contenido sin ejecutar JS), title/description/canonical/OG/JSON-LD, contenido real, CTA a la app (`?tab=`/`?topic=`) y enlaces internos.
- **sitemap.xml** ampliado a 30 URLs. Deep-link `?topic=` añadido a Educación.
- **Pendiente Fase 2 (fácil, cuando quieras):** ampliar a las ~26 páginas de temas restantes y versiones en inglés. El generador es data-driven: añadir entradas al array `LEARN`/`CALCS`.

**Acción tuya YA (gratis, 15 min):** dar de alta la web en **Google Search Console** y enviar el sitemap (`/sitemap.xml`). Sin esto, Google tarda semanas más en descubrir las 30 páginas.

---

## Punto 3 — Backlinks y distribución (manual)

### A. Directorios de herramientas (enlaces fáciles, hazlo esta semana)
Envía tu web a directorios de productos/herramientas. Cada uno es un enlace:
- **Product Hunt** (lanzamiento — puede traer un pico grande de tráfico).
- **BetaList**, **SaaSHub**, **AlternativeTo** (como alternativa a otras calculadoras/plataformas).
- **Directorios de trading/finanzas**: listados de "herramientas para traders", agregadores de calculadoras.
- **Toolify / There's An AI For That** si añades algo de IA (tienes AI Coach).

### B. Comunidades (aporta valor, no spamees)
La regla: **ayuda primero, enlaza después**. Responde dudas reales enlazando tu calculadora concreta cuando resuelva la pregunta.
- **Reddit**: r/Daytrading, r/Forex, r/algotrading, r/CryptoCurrency (con cuidado, leen las normas anti-autopromoción).
- **Foros**: Forex Factory, BabyPips (foro), Elite Trader, TradingView (ideas/scripts con enlace en el perfil).
- **Discord/Telegram** de trading: aporta la herramienta cuando encaje.
- **Quora / Stack Exchange (Money)**: responde "¿cómo calculo el tamaño de posición?" con tu herramienta.

### C. Contenido que atrae enlaces por sí solo
- **YouTube/TikTok/Shorts**: vídeos cortos usando tus calculadoras gratis ("cómo NO reventar tu cuenta en 60s"). Enlace en la descripción. Es el canal de tráfico **rápido** mientras el SEO madura (6-12 meses).
- **Tu blog / los /learn**: artículos que resuelven una búsqueda concreta y enlazan a tu calculadora relacionada.
- **Widget embebible (link magnet):** ofrecer un `<iframe>` de una calculadora para que otros blogs la incrusten CON enlace de vuelta. Es como Omnicalculator consigue miles de enlaces. → *Te lo puedo construir cuando quieras (Fase 2).*

### D. Plantilla de outreach (para pedir enlaces/menciones)
> Asunto: Calculadora gratuita para tu artículo sobre [tema]
>
> Hola [nombre], he visto tu artículo sobre [tema] — muy útil. He creado una calculadora gratuita de [X] que encaja justo con esa sección: [enlace]. Sin registro, en 8 idiomas. Por si te sirve para complementar el artículo. ¡Gracias por el contenido!

### E. Señales que mejoran el CTR desde Google (ya tienes base)
- JSON-LD en las páginas nuevas (hecho) → posibles estrellas/enriquecidos.
- Títulos y descripciones con la keyword exacta (hecho).
- Velocidad y móvil (React build, ok).

---

## Orden recomendado

1. **Dominio propio** (multiplica todo lo demás).
2. **Search Console + enviar sitemap** (que Google descubra las 30 páginas ya).
3. **Directorios** (enlaces rápidos) + **Product Hunt** (pico de tráfico).
4. **Vídeos cortos + comunidades** (tráfico rápido mientras el SEO madura).
5. **Fase 2 de contenido**: resto de temas + widget embebible.

Realismo: el SEO tarda **6-12 meses**; los vídeos y comunidades dan tráfico en **días/semanas**. Combina ambos.
