# 🧠 Arquitectura del asistente — red estructural de TradingCalculator.Pro

> Mapa de cómo está organizado el trabajo asistido por Claude Code en este repo, para que
> **todo esté interconectado y con orden**. Deriva de la Sección 3 de la auditoría pre-lanzamiento.
> Modelo mental: **`CLAUDE.md` = la constitución** (siempre en contexto); **una skill = una ley**
> que se invoca solo cuando aplica (cuesta casi nada hasta que la usas).

## Capas

```
CLAUDE.md  ── constitución (stack real, shim PostgreSQL, honestidad numérica, trampas)
   │
   ├─ docs/           ── conocimiento vivo (estado, auditorías, guías, roadmap)
   │    ├─ ESTADO_PROYECTO.md          (fuente de verdad: qué hay / falta / probar)
   │    ├─ AUDITORIA_INTEGRAL_2026-08-01.md   (matriz de peticiones + roadmap)
   │    ├─ AUDITORIA_FINAL_PRELANZAMIENTO.md  (huecos financieros + checklist deploy)
   │    ├─ ROADMAP_JOURNAL_OPCIONES.md         (journal/analytics: métricas + fases)
   │    ├─ ROADMAP_IDEAS.md · GUIA_EXTENSION.md · TRADINGVIEW_PERSONALIZACION.md · PENDIENTES.md
   │
   ├─ .claude/skills/ ── leyes invocables (checklists especializadas)
   │    ├─ estado-proyecto        (retomar proyecto / cerrar sesión → actualizar doc)
   │    ├─ mejorar-seo            (SEO: meta, sitemap, hreflang, schema)
   │    ├─ auditar-formulas       (corrección matemática del backend)
   │    ├─ revisar-contenido-trading (exactitud + i18n ×8 del contenido educativo)
   │    ├─ auditar-seo-spa        (SEO técnico del prerender/JSON-LD)
   │    ├─ seguridad-pagos        (auth/pagos/webhooks/admin) [solo /comando]
   │    └─ consistencia-diseno    (plantilla canónica + tokens + responsive)
   │
   ├─ .claude/agents/ ── subagentes (contexto propio, output verboso resumido)
   │    ├─ auditor-formulas       → corre pytest matemático y devuelve veredicto
   │    ├─ crawler-visual         → Playwright: capturas + inconsistencias UI
   │    ├─ revisor-seguridad      → tabla de controles de seguridad
   │    └─ revisor-i18n-contenido → paridad 8 idiomas + exactitud factual
   │
   └─ .claude/commands/ ── orquestadores (slash commands)
        ├─ /verify        (red de seguridad offline: py_compile+pytest+eslint+i18n+build)
        ├─ /examen-web    (dispara las 5 auditorías y consolida por severidad)
        └─ /pre-deploy    (semáforo de bloqueantes operativos)
```

## Flujo de trabajo canónico

1. **Al retomar:** leer `ESTADO_PROYECTO.md` (skill `estado-proyecto`).
2. **Antes de tocar:** identificar la vertical y activar la skill correspondiente
   (fórmulas → `auditar-formulas`; contenido → `revisar-contenido-trading`; UI → `consistencia-diseno`;
   SEO → `auditar-seo-spa`/`mejorar-seo`; pagos → `/seguridad-pagos`).
3. **Al implementar:** seguir la plantilla canónica de calculadora y las reglas de honestidad numérica.
4. **Antes de commit:** `/verify` (SIEMPRE). Toda clave i18n nueva en los 8 idiomas.
5. **Examen periódico:** `/examen-web`.
6. **Antes de lanzar:** `/pre-deploy`.
7. **Al cerrar sesión:** actualizar `ESTADO_PROYECTO.md §1 semáforo` y `§7 registro` (obligado por skill).

## Interconexión código ↔ verticales (qué skill vigila qué)

| Vertical del código | Ficheros clave | Skill / agente que la protege |
|---|---|---|
| Matemáticas financieras | `options_math.py`, `performance.py`, `performance_metrics.py`, `gamma_exposure.py` | `auditar-formulas` / `auditor-formulas` |
| Contenido educativo | `EducationPage.jsx`, `tradingEducationContent.js`, `education/*`, `i18n/*` | `revisar-contenido-trading` / `revisor-i18n-contenido` |
| SEO | `useSEO.js`, `gen-seo-pages.js`, `sitemap`, `data/marketTypeDetails.js` (FAQ) | `auditar-seo-spa` / `mejorar-seo` |
| Auth y pagos | `server.py` (auth/webhooks), `admin_routes.py`, `nowpayments.py`, `revolut.py` | `seguridad-pagos` / `revisor-seguridad` |
| Diseño / UX | `pages/*`, `components/*`, tokens Tailwind | `consistencia-diseno` / `crawler-visual` |

## Regla de oro
Material extenso y checklists → **skills**, no en `CLAUDE.md` (para no gastar tokens cada turno).
`CLAUDE.md` solo lleva lo que debe estar SIEMPRE presente.
