# 🧠 Arquitectura del asistente — TradingCalculator.Pro

> **Generado.** Sale de `python scripts/gen-asistente.py`, y `--check` falla en CI
> si se queda atrás. No lo edites a mano: la versión anterior se escribía así y
> llegó a listar 7 de las 17 skills que existían.

Modelo mental: **`CLAUDE.md` es la constitución** —se carga siempre—; **una skill es
una ley** que sólo entra cuando se invoca, y no cuesta nada hasta entonces. Si no
sabes por dónde entrar a una petición, la puerta es la skill **`orientarse`**.

## Capas

```
CLAUDE.md ─── constitución: stack real, honestidad numérica, invariantes
   │
   ├─ docs/            conocimiento vivo (ESTADO_PROYECTO = estado · MAPA = dónde)
   ├─ .claude/rules/   se cargan SOLAS al abrir un fichero de su zona
   ├─ .claude/skills/  leyes invocables (checklists especializadas)
   ├─ .claude/agents/  subagentes con contexto propio (no contaminan el principal)
   └─ .claude/commands/ orquestadores (slash commands)
```

## Skills (18)

| Skill | Cuándo se invoca | Líneas |
|---|---|---|
| `3d-webgl` | Usar antes de añadir cualquier elemento 3D, WebGL, canvas animado o shader a TradingCalculator.Pro, y cuando se pida "algo en 3D", una superficie de… | 109 |
| `auditar-formulas` | Audita la corrección matemática de las fórmulas financieras del backend (Black-Scholes, griegas incl | 46 |
| `auditar-herramienta` | Auditar o rehacer lo que CALCULA una herramienta de TradingCalculator.Pro —una de las catorce calculadoras sueltas, la mesa, el simulador, el escáner, un… | 151 |
| `auditar-seo-spa` | Audita el SEO técnico de la SPA React desplegada en GitHub Pages (prerender de páginas estáticas, canonical, hreflang x10, JSON-LD… | 28 |
| `cerrar-hueco` | Llevar un hueco del inventario de TradingCalculator.Pro (G-01 … G-36 de docs/ESTADO_PROYECTO.md § 3) desde "abierto" hasta "cerrado y verificado", o… | 98 |
| `consistencia-diseno` | Verifica la consistencia visual y de UX entre páginas (jerarquía de bloques, tokens de color, densidad, tablas numéricas, dark mode, plantilla canónica… | 34 |
| `conversion-y-precio` | Trabajar el embudo de TradingCalculator.Pro: la página de precios, el muro de pago, la prueba de 7 días con tarjeta, el alta, el checkout y qué se mide… | 103 |
| `estado-proyecto` | Usar al retomar el proyecto TradingCalculator.Pro, antes de añadir funciones, calculadoras, páginas, endpoints, idiomas o secciones admin, al preparar el… | 94 |
| `identidad-visual` | Usar al tocar cualquier cosa visual de TradingCalculator.Pro: colores, tipografías, espaciados, tamaños, bordes, sombras, layout de una página, la… | 207 |
| `mejorar-seo` | Usar para auditar o mejorar el SEO de TradingCalculator.Pro: meta tags, títulos, sitemap, robots.txt, hreflang/idiomas, datos estructurados (schema.org),… | 129 |
| `microinteracciones` | Usar al añadir o revisar cualquier animación, transición, hover, estado de foco, feedback al pulsar, carga, aparición al hacer scroll o sonido en… | 175 |
| `no-me-fio` | Verificación adversaria de una afirmación sobre TradingCalculator.Pro: una cifra de la web, un "ya está arreglado", un resultado de test, un dato de la… | 115 |
| `orientarse` | La puerta de entrada | 180 |
| `qa` | Banco de pruebas E2E de TradingCalculator.Pro contra la aplicación VIVA: levanta Postgres, el backend y el build de producción, y corre sondas de… | 177 |
| `rendimiento-web` | Medir y defender el peso y la velocidad de TradingCalculator.Pro: cuánto se descarga cada pantalla, si un cambio la ha engordado, qué se puede quitar y… | 123 |
| `reorganizar-frontend` | Usar para limpiar, reorganizar o refactorizar el frontend de TradingCalculator.Pro: partir archivos gigantes, eliminar duplicados, decidir dónde va un… | 146 |
| `revisar-contenido-trading` | Revisa la exactitud, el nivel profesional y la consistencia terminológica del contenido educativo de trading en los 10 idiomas | 30 |
| `seguridad-pagos` ⌨️ | Revisa la seguridad de auth (JWT httpOnly + Google OAuth + 2FA TOTP), pagos (Stripe/PayPal/Revolut/NOWPayments) y admin en FastAPI | 32 |

⌨️ = `disable-model-invocation`: no se activa sola, hay que escribirla.

## Comandos (6)

| Comando | Para qué | Líneas |
|---|---|---|
| `/auditar` | Audita el estado del repositorio más allá de la rama actual. | 34 |
| `/capturas` | Smoke visual de las pantallas públicas, sin backend. | 38 |
| `/cerrar-sesion` | Cierra la sesión dejando el proyecto coherente | 68 |
| `/examen-web` | Examen integral repetible de la web — dispara auditoría de fórmulas, SEO, seguridad, i18n y consistencia de diseño, y consolida un resumen con severidades. | 27 |
| `/pre-deploy` | Recorre el checklist de lanzamiento y marca los bloqueantes operativos (Stripe, secretos, OAuth, dominio, health) que NO se pueden cerrar desde el repo. | 26 |
| `/verify` | Verifica el proyecto antes de commit/push. | 79 |

## Subagentes (6)

| Subagente | Devuelve | Herramientas |
|---|---|---|
| `auditor-formulas` | Corre los tests matemáticos del backend en aislamiento y devuelve SOLO el veredicto (no contamina el… | Bash, Read, Grep, Glob |
| `auditor-seo` | Audita el SEO del sitio sobre el build compilado y devuelve un veredicto compacto (no vuelca las 1.630… | Bash, Read, Grep, Glob |
| `buscador-doc` | Responde preguntas sobre la documentación del proyecto (1,6 MB en 53 ficheros) sin traer los documentos al… | Bash, Read, Grep, Glob |
| `crawler-visual` | Fotografía y audita lo que `scripts/capturas.js` NO cubre — el breakpoint de tablet (768px) y las rutas tras… | Bash, Read, Grep, Glob |
| `revisor-i18n-contenido` | Valida la paridad de los 10 idiomas (0 claves crudas, sets idénticos) y la exactitud factual de los módulos… | Bash, Read, Grep, Glob |
| `revisor-seguridad` | Audita auth (JWT/OAuth/2FA), pagos (Stripe/PayPal/Revolut/NOWPayments), webhooks y admin del backend… | Bash, Read, Grep, Glob |

## Reglas por zona (7)

No se invocan: entran solas al abrir un fichero que case con su `paths:`.

| Regla | Se carga al tocar | Ficheros que casan |
|---|---|---|
| `rules/backend.md` | `backend/*.py`<br>`backend/**/*.py` | 142 |
| `rules/diario-riesgo.md` | `backend/performance.py`<br>`backend/instruments.py`<br>`backend/trading_plan.py`<br>`backend/portfolio_risk.py`<br>`backend/backtest.py`<br>`frontend/src/components/performance/**`<br>`frontend/src/lib/instruments.js`<br>`frontend/src/lib/instrumentSpecs.generated.js`<br>`frontend/src/lib/tradingSystem.js`<br>`frontend/src/services/performanceApi.js` | 11 |
| `rules/escaner.md` | `backend/price_action.py`<br>`backend/candle_patterns.py`<br>`backend/timeframes.py`<br>`frontend/src/components/charts/**` | 5 |
| `rules/i18n-seo.md` | `frontend/src/lib/i18n/**`<br>`frontend/scripts/gen-*.js`<br>`frontend/public/index.html`<br>`frontend/public/robots.txt`<br>`frontend/src/data/mockData.js` | 8 |
| `rules/infra.md` | `.github/workflows/**`<br>`backend/Dockerfile`<br>`backend/setup-gcp.sh`<br>`backend/requirements.txt` | 4 |
| `rules/opciones.md` | `backend/options_*.py`<br>`backend/american_options.py`<br>`backend/market_rates.py`<br>`frontend/src/components/options/**`<br>`frontend/src/services/optionsApi.js`<br>`frontend/src/hooks/useRiskFreeRate.js`<br>`frontend/src/pages/Options*.jsx` | 11 |
| `rules/preferencias.md` | `frontend/src/lib/cloudPrefs.js`<br>`frontend/src/lib/prefsMerge.js`<br>`frontend/src/lib/store.js`<br>`frontend/src/pages/SettingsPage.jsx` | 4 |

⚠️ Tras un `/compact` **estas reglas no se reinyectan**: vuelven a entrar la próxima
vez que se lea un fichero de su zona. Por eso los invariantes viven en `CLAUDE.md`.

## Regla de oro

Material extenso y checklists → **skills**, nunca en `CLAUDE.md`, que se paga en
tokens en cada turno. `CLAUDE.md` sólo lleva lo que debe estar SIEMPRE presente.
