---
description: Examen integral repetible de la web — dispara auditoría de fórmulas, SEO, seguridad, i18n y consistencia de diseño, y consolida un resumen con severidades.
argument-hint: (opcional) área a enfocar, p. ej. "opciones" o "seo"
---

# /examen-web — examen integral de TradingCalculator.Pro

Orquesta el examen completo de la web. Ejecuta en este orden y consolida:

1. **Base verde primero:** corre `/verify` (py_compile + pytest + eslint + i18n-check + build).
   Si algo falla, arréglalo antes de seguir.
2. **Fórmulas:** aplica la skill `auditar-formulas` (o lanza el subagente `auditor-formulas`).
3. **SEO técnico:** aplica la skill `auditar-seo-spa`.
4. **Seguridad y pagos:** lanza el subagente `revisor-seguridad`.
5. **i18n y contenido:** lanza el subagente `revisor-i18n-contenido`.
6. **Consistencia visual:** aplica la skill `consistencia-diseno` (o el subagente `crawler-visual`
   si hay Playwright).

Si `$ARGUMENTS` indica un área (p. ej. "opciones"), prioriza esa vertical pero no omitas la base verde.

**Salida consolidada:** una tabla única `área | hallazgo | severidad (🔴/🟠/🟢) | fichero:línea |
acción` ordenada por severidad, y una entrada lista para pegar en `docs/ESTADO_PROYECTO.md §7`.
Abre (o propón) un ítem por cada 🔴/🟠.
