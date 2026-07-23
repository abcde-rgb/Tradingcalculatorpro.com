# Crecer con Google — playbook accionable (GA4 · Search Console · Looker · Trends)

> **Para aplicar en el futuro.** La web **ya tiene instalado** GA4 + GTM + Google
> Search Console + Bing, `sitemap.xml`, JSON-LD y ~664 páginas SEO
> pre-renderizadas. El objetivo de este doc **no es instalar**, es **usar bien**
> las herramientas de Google para crecer. Complementa
> [`CAPTAR_TRAFICO.md`](./CAPTAR_TRAFICO.md) (backlinks/distribución).

## Prioridad 1 — Google Search Console (gratis, el motor más rápido)
Muestra lo que pasa **antes del clic** (impresiones, CTR, posición por consulta).
- [ ] **Enviar `sitemap.xml`** (664 URLs) y revisar el informe **Páginas**: 0 excluidas por error.
- [ ] **Informe de Rendimiento**: filtrar consultas en **posición 5-20 con muchas
      impresiones y CTR bajo** → reescribir *title/meta* de esas páginas exactas
      (victorias rápidas de las páginas `/tools/*` y `/learn/*`).
- [ ] **Multi-idioma** (nuestro diferenciador): vigilar impresiones **por idioma**
      y que el `hreflang` se reconozca. Español/árabe/japonés = huecos poco
      competidos → priorizar contenido ahí.
- [ ] **Inspección de URL** → pedir indexación de las páginas clave.
- [ ] Revisar **Core Web Vitals** (es factor de ranking; el SPA en Pages puede ir lento).

## Prioridad 2 — GA4 (lo que pasa **después del clic**)
- [ ] **Marcar conversiones**: `sign_up`, `email_verified`, `begin_checkout`,
      `purchase` (premium). *(Ver "Tarea de código" abajo.)*
- [ ] **Landing por orgánico**: qué páginas SEO traen usuarios que **convierten
      vs rebotan** → duplicar en las buenas.
- [ ] **Exploración de embudo**: portada → herramienta → registro → pago; localizar la fuga.
- [ ] Respetar el **banner de consentimiento** (ya se hace: analítica solo con opt-in).

## Prioridad 3 — Looker Studio (gratis)
- [ ] Panel único que combine **GSC + GA4**: consultas, CTR, conversiones **por
      página e idioma**. Revisión **semanal** (queries/CTR) + **mensual** (estrategia).

## Prioridad 4 — Google Trends + Keyword Planner (gratis)
- [ ] **Trends**: qué calculadoras/temas e **idiomas** suben en demanda → priorizar
      contenido y traducciones.
- [ ] **Keyword Planner** (de Google Ads): volúmenes de búsqueda **gratis** aunque
      no se paguen anuncios → validar títulos de páginas SEO.

## Prioridad 5 — Validación técnica (gratis)
- [ ] **Rich Results Test**: validar el JSON-LD (hay mucho) para resultados enriquecidos.
- [ ] **PageSpeed Insights**: medir/mejorar CWV.

## La mayor palanca (estructural, honesta)
- [ ] **Dominio propio activo** (`tradingcalculatorpro.com`). github.io tiene techo
      de credibilidad e indexación; Google crece mucho más rápido sobre dominio propio.
      (Repetido en `ESTADO_PROYECTO.md` §6 y en el skill de SEO.)

---

## Tarea de CÓDIGO pendiente — eventos de conversión GA4
Hoy GA4 registra **vistas de página** (`AnalyticsTracker`), pero **no
conversiones**. Sin esto no sabemos **qué tráfico paga**.
- **Qué añadir:** `dataLayer.push` / evento GA4 en los puntos clave, respetando
  el consentimiento:
  - `sign_up` (registro completado),
  - `email_verified` (verificación),
  - `begin_checkout` (clic en pagar, con `plan` y `method`),
  - `purchase` (activación premium confirmada por webhook — idealmente server-side
    o al aterrizar en `/payment/success`, con `value` y `currency`).
- **Dónde:** en el flujo de auth (`store.js`/AuthPages), en `PricingPage`
  (begin_checkout) y en `PaymentPages` success (purchase). Marcar esos eventos
  como **conversiones** en GA4.
- **Guardarraíl:** no disparar nada si el usuario no aceptó cookies (mismo patrón
  que `AnalyticsTracker`). Evitar PII.

## Nota de mantenimiento
Cuando se implementen los eventos, marcar aquí las casillas y añadir entrada en
`ESTADO_PROYECTO.md` §7.

*Fuentes: guías 2026 de Google Search Console y GA4 para tráfico orgánico
(seo-hacker, seostrategypros, performancemarketingadvisors, softhubtools).*
