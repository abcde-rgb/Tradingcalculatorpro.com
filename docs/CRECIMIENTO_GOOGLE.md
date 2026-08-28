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
- [x] **Dominio propio activo** (`tradingcalculator.pro`, desde 2026-08-28). github.io tiene techo
      de credibilidad e indexación; Google crece mucho más rápido sobre dominio propio.
      (Repetido en `ESTADO_PROYECTO.md` §6 y en el skill de SEO.)

---

## Eventos de conversión GA4 — estado real (auditado)
✅ **Ya están cableados** (respetan consentimiento; `gtag` solo carga con
consentimiento total, y `trackEvent` es no-op sin él):
- `login` (email / email_2fa / google) — `lib/store.js`.
- `sign_up` (email) — `lib/store.js`.
- `begin_checkout` (con `plan` y `payment_method`) — `pages/PricingPage.jsx`.
- `purchase` (con `transaction_id`, `currency`, `plan`; **dedupe por sesión** para
  no recontar al recargar) — `pages/PaymentPages.jsx`.

**Lo que queda (tú, en consola / opcional en código):**
- [ ] 🌐 En **GA4**: marcar `sign_up`, `begin_checkout` y `purchase` como
  **eventos clave / conversiones** (si no, se registran pero no cuentan como conversión).
- [ ] ⌨️ *(opcional)* Enviar **`value`** en `purchase`: hoy se omite a propósito
  porque el importe se guarda en **unidades distintas según la vía de pago**
  (unidad mayor en checkout, céntimos en el webhook) → habría que **normalizarlo
  en backend** antes de mandarlo, para no reportar ingresos 100× erróneos.
- [ ] ⌨️ *(opcional)* `sign_up` también en registro con Google (hoy Google solo
  dispara `login`).
- **Guardarraíl:** nunca disparar sin consentimiento (ya garantizado). Sin PII.

## Nota de mantenimiento
Cuando se implementen los eventos, marcar aquí las casillas y añadir entrada en
`ESTADO_PROYECTO.md` §7.

*Fuentes: guías 2026 de Google Search Console y GA4 para tráfico orgánico
(seo-hacker, seostrategypros, performancemarketingadvisors, softhubtools).*
