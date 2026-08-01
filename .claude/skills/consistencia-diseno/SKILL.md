---
name: consistencia-diseno
description: Verifica la consistencia visual y de UX entre páginas (jerarquía de bloques, tokens de color, densidad, tablas numéricas, dark mode, plantilla canónica de calculadora, responsive/móvil). Úsala al añadir una página o calculadora nueva, redistribuir una sección (p. ej. Opciones) o revisar la coherencia del sitio.
---

# Consistencia de diseño (herramienta profesional, no amateur)

Referencias de diseño de terminal: **Bloomberg** (densidad + command bar), **TradingView**
(gráfico protagonista), **Koyfin** (dashboards densos legibles, dark mode), **OptionStrat**
(payoff visual limpio).

## Plantilla canónica de calculadora / herramienta
Orden de bloques de arriba abajo (copiado del workspace de Opciones, la mejor página del sitio):
1. **Configurar** (inputs) → 2. **Resultado destacado** (KPI bar) → 3. **Visualización** (gráfico)
→ 4. **Detalle secundario en acordeón cerrado** → 5. **"Registrar en el diario" + Guardar/Compartir/
Export** → 6. enlaces cruzados a herramientas relacionadas → 7. FAQ (FAQPage JSON-LD) →
8. disclaimer a `/legal?tab=risk`. Sin paneles siempre abiertos ni toggles sueltos al final.

## Tokens
- Dark base `#0f172a` (no negro puro); texto off-white `#e5e7eb`; **un acento** (verde `#22c55e`,
  el `theme-color`). Verde=beneficio, rojo=pérdida, coherente en todo el sitio.
- **Elevación por color de superficie, no por sombra** (en dark las sombras no se ven).
- Cifras en `tabular-nums`, alineadas a la derecha, formato es-ES consistente.
- **Estado vacío honesto:** `None`/"—" explícito, nunca `0` ambiguo (para un usuario recién
  registrado todo panel arranca vacío con mensaje "aún no tienes datos", y se rellena al introducir).

## Responsive / móvil (PWA → futura app)
0 scroll horizontal; toques ≥ 44 px; tablas densas (cadena de opciones, admin) con scroll propio.
La web móvil ES la app (misma SPA en Capacitor/Tauri). Verifica breakpoints en cada ruta.

## Procedimiento
Recorre con Playwright MCP cada ruta, captura screenshot en desktop/tablet/móvil, y compara
niveles de encabezado, densidad y CTAs contra la plantilla canónica.
