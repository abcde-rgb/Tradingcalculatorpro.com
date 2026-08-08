---
name: reorganizar-frontend
description: >-
  Usar para limpiar, reorganizar o refactorizar el frontend de TradingCalculator.Pro:
  partir archivos gigantes, eliminar duplicados, decidir dónde va un archivo nuevo,
  reducir el peso del bundle, arreglar el code-splitting, migrar la herramienta de build,
  o cuando se diga que el proyecto "está desordenado", "pesa mucho", "carga lento" o "no
  sé dónde poner esto". Contiene el mapa real de carpetas, los duplicados detectados y el
  orden en que hay que atacar cada cosa.
---

# Reorganización del frontend

Estado medido: **251 archivos `.jsx`, 52 915 líneas** en `frontend/src`.

## 1. Lo que ya está bien (no lo toques)

- **i18n con carga diferida.** `lib/i18n.js` importa `es` estáticamente y los otros 9
  idiomas con `import()` dinámico. Los 6,3 MB de `lib/i18n/` **no** viajan en el bundle
  inicial. Está bien resuelto.
- **46 primitivas shadcn** en `components/ui/` consumiendo variables CSS. Es la palanca
  que permite rediseñar la web entera desde `index.css`.
- Separación backend/frontend limpia, con scripts propios (`gen-sitemap`, `i18n-check`,
  `check-fetch-credentials`).

## 2. Los cinco problemas reales, por orden de impacto

### 2.1 Páginas monolíticas

| Archivo | Líneas |
|---|---|
| `pages/EducationPage.jsx` | **5 366** |
| `pages/AdminPage.jsx` | **3 342** |
| `components/performance/TradeFormModal.jsx` | 945 |
| `components/options/CalculatorPage.jsx` | 846 |
| `pages/AuthPages.jsx` | 841 |

`EducationPage.jsx` sola es el 10 % del frontend. Un archivo de 5 000 líneas no se revisa,
no se testea y cada cambio arrastra riesgo a todo lo demás.

**Cómo partirlo** (no por líneas, por responsabilidad):
```
pages/EducationPage.jsx          →  ~120 líneas: rutas, SEO, layout
components/education/
  academy/ModuleShell.jsx           carcasa de módulo
  academy/Quiz.jsx                  motor de quiz (uno, no diez copias)
  academy/ProgressTrack.jsx         progreso
  academy/modules/<slug>.jsx        un archivo por módulo
lib/education/curriculum.js         estructura de datos, sin JSX
```
El contenido va a datos (`lib/`), la presentación a componentes. Hoy están mezclados.

### 2.2 Duplicado confirmado

```
components/options/BlackScholesCalculator.jsx      343 líneas
components/calculators/BlackScholesCalculator.jsx  346 líneas
```

Dos implementaciones del mismo modelo de valoración con 3 líneas de diferencia. En una
herramienta financiera esto es **peligroso**, no solo feo: si alguien corrige un fallo en
una, la otra sigue mintiendo. Diagnóstico obligatorio antes de tocar nada: comparar ambas
línea a línea, decidir cuál es correcta, dejar una sola en `components/calculators/` y
reexportarla donde haga falta.

Regla permanente: **la matemática vive en `utils/`** (`blackScholes.js`,
`strategyStats.js`), nunca dentro de un `.jsx`. El componente solo pinta.

### 2.3 Sin code-splitting por ruta

**Un solo `React.lazy` en toda la aplicación.** Las 20 páginas se empaquetan juntas, así
que quien entra en la landing se descarga `AdminPage` (3 342 líneas),
`tradingEducationContent.js` (140 KB) y `marketTypesContent.js` (84 KB) sin usarlos jamás.

Arreglo — todas las rutas de `App.js` con `lazy()` + `<Suspense>`, prioridad:

| Ruta | Por qué urge |
|---|---|
| `AdminPage` | La usas solo tú. Nunca debe viajar al público. |
| `EducationPage` | La más pesada, con diferencia. |
| `OptionsHub` / `OptionsStrategy` | Arrastra `lightweight-charts` y `recharts`. |
| `LegalPage` | `lib/legalContent/` son 268 KB. |

La landing debe cargar **solo** la landing.

### 2.4 `homepage` apunta a GitHub Pages

```json
"homepage": "https://abcde-rgb.github.io/Tradingcalculatorpro.com"
```

Toda la autoridad SEO se acumula en un subdominio de GitHub en lugar de en el dominio
propio, y GitHub Pages no permite prerender ni cabeceras. Ya tienes el MCP de Vercel
conectado: mover el hosting arregla de una vez el SEO, el prerender de la SPA y las
cabeceras de seguridad. Coordínalo con el skill `mejorar-seo` (los canonical y hreflang de
`useSEO.js` dependen de esto).

### 2.5 Herramienta de build obsoleta

`react-scripts@5.0.1` + CRACO. CRA está sin mantenimiento desde 2023. Con React 19 y 251
componentes, el arranque en desarrollo y los builds son lentos sin motivo.

Migrar a **Vite** es mecánico (mover `index.html` a la raíz, `REACT_APP_` → `VITE_`,
ajustar el alias `@/`, reemplazar el plugin de CRACO). Es lo que desbloquea análisis de
bundle decente y hace las siguientes optimizaciones medibles.

**No lo hagas a la vez que el rediseño.** Un cambio a la vez.

## 3. Dónde va cada archivo nuevo

| Tipo | Carpeta | Regla |
|---|---|---|
| Fórmula, modelo, estadística | `utils/` | Función pura, sin React, testeable |
| Datos de contenido | `lib/` | Sin JSX |
| Llamada al backend | `services/` | Un archivo por dominio |
| Lógica de React reutilizable | `hooks/` | Empieza por `use` |
| Primitiva de UI | `components/ui/` | Sin lógica de negocio |
| Componente de dominio | `components/<dominio>/` | Un solo dominio |
| Composición de ruta | `pages/` | **Objetivo: menos de 200 líneas** |

Hoy `utils/` (3 archivos) y `lib/` (20+) se solapan. `lib/projection.js` y
`lib/candleRules.js` son matemática pura: pertenecen a `utils/`. Unifica el criterio en un
solo movimiento, no poco a poco.

## 4. Orden de ejecución

Cada paso es un commit independiente y verificable con `/verify`.

1. **Resolver el duplicado de Black-Scholes.** Corrección, no limpieza. Va primero.
2. **`lazy()` en las 20 rutas.** Máximo impacto, riesgo casi nulo, medible en el bundle.
3. **Consolidar `utils/` vs `lib/`.** Un commit de movimientos, sin cambios de lógica.
4. **Partir `EducationPage.jsx`.** Una semana de trabajo real; no lo mezcles con nada.
5. **Partir `AdminPage.jsx`.**
6. **Migrar a Vite.**
7. **Mover el hosting a Vercel** y actualizar `homepage`, canonical y sitemap.

Los pasos 1–3 caben en una tarde y ya cambian el arranque de la web.

## 5. Reglas para no volver al desorden

- Ningún `.jsx` supera las 400 líneas. Al llegar a 400, se parte.
- Ninguna página supera las 200 líneas: compone, no implementa.
- Ninguna fórmula financiera vive fuera de `utils/`, y cada una tiene su test en `tests/`.
- Antes de crear un archivo, buscar si ya existe: `grep -ri "<nombre>" frontend/src`.
- Cada ruta nueva nace con `lazy()`.
