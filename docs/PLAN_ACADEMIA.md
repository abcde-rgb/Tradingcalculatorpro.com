# Plan de Academia / Contenido de Aprendizaje — TradingCalculatorPro

> Documento **vivo** de trabajo. Recoge la especificación del PDF
> (`tradingcalcespecificacionesfinal.pdf`) + la petición detallada del dueño, cruzada con
> **lo que ya existe en el código**. Se irá editando a medida que se implementa.
> Última actualización: 2026-07-25.

## 0. Cómo está montada la Academia hoy (para no romper nada)

- **`frontend/src/pages/EducationPage.jsx`** (~5.270 líneas): la página. Renderiza cada
  sección con su componente visual **en línea** (no en modal, salvo los patrones).
- **`frontend/src/lib/tradingEducationContent.js`** (~3.578 líneas): los datos de contenido
  (módulos, patrones de velas/gráficos, glosario). ~760 `id:`.
- **`frontend/src/components/education/*`** (~64 componentes SVG/React): cada visual.
- **Modal de "ampliar / cerrar" YA EXISTE** → `PatternDetailModal` (EducationPage.jsx:219) +
  `PatternCard` (:175), gobernado por el estado `selectedPattern`. Botón de cerrar
  (`data-testid="pattern-modal-close"`) + clic fuera. **Esta es la pieza a reutilizar**
  para que el contenido de aprendizaje se expanda igual que los patrones.
- **NO existe** ningún tratamiento "en construcción / difuminado / trabajando en ello".

---

## 1. Comportamiento UX (transversal)

| # | Requisito (PDF §2, petición) | Estado hoy | Propuesta |
|---|---|---|---|
| U1 | Temas de aprendizaje = tarjetas clicables que **se expanden** (gráficos + ejemplos) y se **cierran** con botón/clic fuera, igual que los patrones | Los patrones sí; los temas se muestran en línea/acordeón | Extraer un `TopicDetailModal` genérico (basado en `PatternDetailModal`) y envolver los temas técnicos en `TopicCard` → modal grande |
| U2 | Patrones: listado compacto → modal con dibujo grande, explicación paso a paso, **contexto** (tendencia previa, volumen, marco temporal) | Modal existe; falta verificar que **todos** traen contexto | Auditar `tradingEducationContent.js`: añadir campos `priorTrend`, `volume`, `timeframe` donde falten |
| U3 | Secciones "en construcción": **difuminadas** (baja opacidad + blur ligero), **clicables**, y al pulsar → overlay "Estamos trabajando en ello" | No existe | Crear componente `WipOverlay` + wrapper `WipSection` reutilizable (blur + `pointer` + modal mensaje) |

---

## 2. Contenido técnico — estado por tema

Leyenda: ✅ existe con profundidad · 🟡 existe pero flojo/ampliar · 🔴 no existe (crear)

| # | Tema (PDF §3) | Componente actual | Estado | Acción propuesta |
|---|---|---|---|---|
| T1 | **Glosario** (§3.1) | `GlossaryVisual.jsx` (230 l) | 🟡 | Completar los 22 términos mínimos del PDF + faltantes; para cada uno: definición corta + explicación novato + **ejemplo fill-in-the-blanks** (componente nuevo `FillBlanksExample`). Añadir términos que falten (auditar vocabulario) |
| T2 | **Fiscalidad** (§3.2) | `TaxesVisual.jsx` (92 l) | 🟡→WIP | **No borrar.** Envolver en `WipSection` (difuminado + "Estamos trabajando en ello"). Conservar el contenido para reactivarlo luego por país |
| T3 | **Soportes y Resistencias** (§3.3) | `TrendLinesGuide.jsx` (412 l) | 🟡 | Añadir **ejemplo gráfico interactivo**: soporte horizontal con varios rebotes + resistencia con varios rechazos; clic → se abre grande con anotaciones y explicación de cómo identificarlos |
| T4 | **Método Top-Down** (§3.4) | `TimeframesGuide.jsx` (dentro) | 🟡 | Detallar flujo semanal→diario→4h→1h→15m; añadir **representación tipo árbol/flujo** con ejemplo |
| T5 | **Teoría de Dow** (§3.5) | `DowTheoryDiagram.jsx` | 🟡 | Ampliar para novatos: movimiento primario/secundario/menor, fases (acumulación/participación/distribución), volumen como confirmación; ejemplos gráficos |
| T6 | **Estructura de mercado + Wyckoff** (§3.6) | `WyckoffSchematic.jsx`, `MarketStructureVisual.jsx` | 🟡 | Fases A–E + **eventos clave** (PS, SC/BC, AR, ST, Spring/UTAD, SOS/SOW, LPS/LPSY): para cada uno definición + aspecto visual + comportamiento del volumen |
| T7 | **Volumen + operar con Wyckoff** (§3.7) | — (parte de Wyckoff) | 🔴/🟡 | Ley esfuerzo vs resultado; ejemplos (selling climax, test con volumen menor, acumulación, distribución); **guía operativa**: identificar fase → esperar evento → confirmar ruptura+retest → entrada/stop/objetivos |
| T8 | **Gráficos alternativos** (§3.8) | — | 🔴 | Crear `AltChartsVisual`: Renko, Heiken Ashi, Point & Figure — explicación breve + ejemplo + contexto de uso |
| T9 | **Ondas de Elliott** (§3.9) | — | 🔴 | Crear `ElliottWavesVisual`: estructura 5-3 (5 impulsivas + 3 correctivas), reglas básicas, ejemplo gráfico simple; recomendar diario/4h |
| T10 | **Ichimoku** (§3.10) | — | 🔴 | Crear `IchimokuVisual`: Tenkan, Kijun, Span A/B, Chikou; interpretación (precio sobre nube, nube alcista/bajista, confirmación Chikou); recomendar diario/semanal |
| T11 | **Patrones armónicos** (§3.11) | — | 🔴 | Crear `HarmonicPatternsVisual`: Gartley, Bat, Crab, Butterfly; base Fibonacci; representación X-A-B-C-D + ejemplo + temporalidades |
| T12 | **Smart Money / ICT** (§3.12) | — | 🔴 | Crear `SmartMoneyVisual`: liquidez, order blocks, fair value gaps, kill zones; definición + ejemplo gráfico + relación con estructura y top-down |
| T13 | **Técnico avanzado** (§3.13) | varios sueltos | 🟡 | Sección paraguas que agrupe: Wyckoff avanzado, ICT, Elliott avanzado, Volume Profile, VWAP. Enfoque a usuarios que ya dominan la base |

---

## 3. Feature nueva — "Crea tu setup de trading" (§3.14)

Objetivo: panel donde el usuario **configura su propio setup**.
- Elegir **marco temporal**.
- **Seleccionar herramientas** (indicadores/enfoques).
- **Combinar enfoques**: Wyckoff, ICT, S/R, Elliott, Ichimoku, etc.
- Mostrar **resumen final** del setup configurado.
- A futuro: conectar el setup con contenido/ejemplos personalizados.

**Propuesta técnica (v1, sin backend):**
- Nueva ruta/sección `SetupBuilder` (componente en `components/education/` o página propia).
- Estado local: `{ timeframe, tools:[], approaches:[] }`.
- Persistir en `localStorage` (v1). **v2**: guardar en backend por usuario (tabla `user_setups`
  vía el shim `Collection`; endpoint `/api/setups` GET/POST). Decidir en fase 2.
- UI: selector de timeframe + chips de herramientas + panel-resumen. Botón "Guardar setup".

---

## 4. Fuera del contenido de aprendizaje (PDF §4–§8) — registrado, NO en este bloque

Estos puntos del PDF son de **admin/integraciones**; se anotan aquí para no perderlos, pero
son workstreams separados:

- **§4 Admin**: rediseño programa de referidos (ya hay base del sistema de afiliados),
  analítica de tráfico (GA/Plausible), cobros/fuentes/direcciones, dashboard SaaS con auditoría.
- **§4.5 Herramientas recomendadas / brokers afiliados**: VT Markets, FP Markets, AvaTrade,
  Saxo, Swissquote (sección monetizable). *Requiere decisión de negocio.*
- **§5 Integraciones**: login Google (revisar OAuth — en curso en el hilo de despliegue),
  auditoría de APIs de datos, APIs de correo.
- **§6 Selector de idioma**: mostrar nombres de idioma; banderas pendientes.
- **§7 Calendario económico**: sustituir widget TradingView por **Investing.com Economic
  Calendar**. *Ojo:* el PDF §7 pide quitar el widget de TV; verificar que no rompa otras vistas.

---

## 5. Plan por fases (propuesta de ejecución)

**Fase 1 — UX base (rápida, alto impacto visible):**
- U1 `TopicDetailModal` genérico + U3 `WipSection`/"Estamos trabajando en ello".
- T2 Fiscalidad → difuminada.
- T3 ejemplo interactivo de Soportes/Resistencias.

**Fase 2 — Profundizar lo que ya existe:**
- T1 Glosario completo + fill-in-the-blanks.
- T4 Top-Down (árbol), T5 Dow, T6 Wyckoff eventos, T7 volumen/operativa.

**Fase 3 — Componentes nuevos:**
- T8 Alt charts, T9 Elliott, T10 Ichimoku, T11 Armónicos, T12 ICT, T13 paraguas avanzado.

**Fase 4 — Feature:**
- §3.14 "Crea tu setup" (v1 localStorage; v2 backend).

Cada fase = 1 PR a `main` (o a la rama de trabajo actual), con `npm run build` verde e i18n
de las cadenas nuevas en los 8 idiomas.

---

## 6. Decisiones abiertas (para el dueño)

1. **¿Por dónde empezar?** ¿Fase 1 completa, o priorizar algún tema concreto (p.ej. Wyckoff/ICT)?
2. **"Crea tu setup"**: ¿v1 solo local (rápido) o directamente con guardado en backend por usuario?
3. **Idiomas**: ¿el contenido técnico nuevo va en los 8 idiomas desde el principio, o primero
   ES/EN y luego el resto? (Traducir contenido pedagógico largo es costoso.)
4. **Calendario económico (Investing.com)**: ¿lo metemos en este bloque o va aparte?
