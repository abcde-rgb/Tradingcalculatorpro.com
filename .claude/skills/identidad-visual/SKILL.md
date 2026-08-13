---
name: identidad-visual
description: >-
  Usar al tocar cualquier cosa visual de TradingCalculator.Pro: colores, tipografías,
  espaciados, tamaños, bordes, sombras, layout de una página, la landing, una card, un
  formulario o un componente nuevo de `components/ui/`. Úsalo también cuando se pida que
  "no parezca hecho por una IA", rediseñar una sección, o antes de añadir cualquier
  gradiente, blur o color nuevo. Define el sistema de diseño real del proyecto y prohíbe
  explícitamente los patrones genéricos que hoy dominan el repo.
---

# Identidad visual de TradingCalculator.Pro

El problema no es que la web sea fea. Es que es **intercambiable**: cualquier SaaS generado
con shadcn + Tailwind en 2025 tiene exactamente este aspecto. Este skill fija una identidad
propia y prohíbe los tics que delatan generación automática.

## 1. Diagnóstico (medido sobre el repo, no opinión)

| Señal | Medida real | Por qué delata |
|---|---|---|
| `bg-gradient-to-*` | **124 usos** en `.jsx` | El degradado es el relleno por defecto cuando no hay decisión de color. |
| `rounded-xl` | **214 usos** | Un solo radio para todo = no hay jerarquía de materiales. |
| `blur-3xl` + aurora | 7 usos + `AuroraBackground.jsx` | El "blob difuminado" es el fondo genérico de 2023-2025. |
| Iconos `lucide` con chip de color | 8 features, 8 colores distintos | Arcoíris de categorías: decora, no informa. |
| `Sparkles` | 14 usos | Icono-firma del contenido generado por IA. Fuera. |
| Tipografías cargadas | **4** (Inter, Unbounded, JetBrains Mono, Space Grotesk) | Nadie eligió; se acumularon. |
| `.font-unbounded` | **216 usos**, y definida **dos veces** en conflicto | `App.css:21` dice Unbounded, `index.css:25` dice Space Grotesk. Gana la que cargue después. Una clase que miente sobre lo que hace es podredumbre del sistema. |
> ⚠️ **Las cifras de arriba son del diagnóstico inicial (2026-08-08, antes de
> trabajar).** Estado real medido al final de esa sesión, más abajo en §1.bis.
> Vuelve a medir antes de citar cualquiera de estos números.

## 1.bis Estado real (medido 2026-08-08, después de trabajar)

| Señal | Antes | Ahora | Estado |
|---|---:|---:|---|
| Tipografías cargadas | 4 | **3** | ✅ Archivo / Inter Tight / IBM Plex Mono |
| `.font-unbounded` duplicada y en conflicto | sí | **no** | ✅ Definición única `.font-display`, nombre viejo como alias |
| `cubic-bezier` propios | 0 | **8** | ✅ Curvas y duraciones en `tailwind.config.js` |
| `prefers-reduced-motion` | 2 archivos | **global** | ✅ |
| Radios | 1 para todo | **2** | ✅ `--radius-sharp` + `--radius`; `rounded-xl` remapeado |
| `bg-gradient-to-*` | 124 | **121** | ⬜ Limpiada la portada; quedan páginas internas |
| `blur-3xl` | 7 | **6** | ⬜ Fuera los orbes del hero; quedan Dashboard/Education/Options/Auth |
| `Sparkles` | 14 | **10** | ⬜ Fuera de portada y precios |
| `shadow-lg` | 18 | **16** | ⬜ |
| Usos de la display | 216 | **216** | ⬜ **Sin empezar.** Objetivo <20 |

### Decisión de color — TOMADA, no la revuelvas

El diagnóstico original decía que el verde de marca era "un fallo grave" y
proponía ámbar. **Se implementó, se comparó en captura y el propietario lo
rechazó.** La marca es **verde** (`145 80% 45%` oscuro / `145 70% 35%` claro),
está mergeada y desplegada en producción desde el PR #183.

Lo que sí se conservó de aquel intento, y hay que mantener: el P&L tiene
**tokens propios** `--long` / `--short` en vez de `text-green-500` suelto por el
código. Visualmente coinciden con el verde de marca —es la decisión tomada— pero
si algún día se quieren despegar los dos verdes, se toca en un solo sitio.

**Lo que NO hay que hacer:** volver a proponer ámbar como color de marca, ni
"arreglar" la coincidencia entre verde de marca y verde de beneficio. Está
documentado como decisión deliberada en `frontend/src/index.css`, en la cabecera
del bloque de tokens.

Lo que sigue vigente de la regla original: **un solo acento**. Si algo necesita
destacar y no es P&L, usa el verde de marca o no destaca. No metas un segundo
color de acento.

## 2. Dirección: "instrumento de precisión"

El producto no es una app de finanzas alegre. Es un **instrumento de medida**: calibre,
regleta, escala de ticks, cinta de cotizaciones. Todo sale de ahí.

### Color

Esto es lo que hay **implementado y desplegado** (`frontend/src/index.css`, en
HSL de shadcn; los hex van al lado sólo como referencia):

```css
/* Tema oscuro (por defecto) */
--background: 220 22% 8%;    /* #101319 grafito azulado, NO negro puro */
--card:       218 19% 11%;   /* #171B22 superficie elevada */
--rule:       218 17% 18%;   /* #262C36 filete de 1px, separador principal */
--foreground: 42 26% 87%;    /* #E7E2D6 texto hueso, no blanco puro */
--muted-foreground: 224 6% 60%;
--primary:    145 80% 45%;   /* MARCA. Verde. Decisión tomada — ver §1.bis */
--long:       142 71% 45%;   /* P&L positivo. Token propio. */
--short:      0 84% 60%;     /* P&L negativo. Token propio. */
```

En claro, el papel es hueso (`42 24% 96%`) y el verde baja a `145 70% 35%` para
que el texto blanco sobre el botón primario mantenga contraste.

Reglas:
- **Un solo acento.** Si algo necesita destacar y no es P&L, es el verde de
  marca o no destaca. No añadas un segundo color de acento.
- El P&L sale **siempre** de `--long` / `--short`, nunca de `text-green-500` ni
  `text-red-500` sueltos. Es lo que permite ajustarlo por tema desde un sitio.
- El fondo se separa por **filete de 1px (`--rule`)**, no por sombra ni degradado.
- Cero `blur-3xl`. Cero `bg-gradient-to-*` fuera de gráficos de datos.

### Tipografía

Tres familias, todas variables (pesan menos que las 4 actuales):

| Rol | Familia | Uso |
|---|---|---|
| Display | **Archivo** (eje de anchura) | Solo titulares de sección y hero. Máximo ~15 apariciones en toda la web. |
| Texto | **Inter Tight** | Párrafos, labels, navegación. |
| Datos | **IBM Plex Mono** | Todo número: precios, lotes, %, R:R, griegas. |

- Todo número lleva `font-variant-numeric: tabular-nums`. Sin excepción — si las cifras
  bailan al actualizarse, el instrumento parece barato.
- ✅ **Hecho:** las tres familias están cargadas (`public/index.html`, de 4 a 3) y la
  definición duplicada ya no existe. Hay una sola declaración en `index.css` con el nombre
  honesto `.font-display`; `.font-unbounded` se mantiene como alias por los usos heredados.
- ⬜ **Pendiente, y es el trabajo tipográfico que queda:** la display sigue apareciendo
  **216 veces**; el objetivo es **menos de 20**. Una tipografía con carácter usada en todas
  partes deja de tener carácter. No es un renombrado mecánico: hay que decidir sitio por
  sitio si ese titular merece la display o va en Inter Tight, así que se hace por pantallas,
  no con un `sed`.

### Forma y espacio

```css
--radius-sharp: 2px;   /* inputs, celdas de tabla, chips de datos */
--radius-soft:  10px;  /* cards, modales */
/* nada más. Dos radios, no uno para todo. */
```

- Escala de espaciado en múltiplos de 4, y **cada sección usa el mismo ritmo vertical**
  (96px desktop / 56px móvil entre bloques). Hoy cada sección improvisa su padding.
- Sombras: casi ninguna. La elevación se comunica con `--ink-raised` + filete, no con
  `shadow-lg` (18 usos actuales → objetivo 0 fuera de popovers y dropdowns).

## 3. Elemento firma: la regleta

Lo único que la web debe hacer que nadie más hace. Una **escala de ticks** — filete
horizontal con marcas verticales de distinta altura, como el borde de un calibre.

Aparece en tres sitios y en ninguno más:
1. Como separador entre secciones de la landing, con las marcas más densas donde hay más
   contenido debajo. La regleta **mide** la página.
2. En los sliders de riesgo: los detentes son marcas reales, no un track liso.
3. En el hero, bajo la calculadora, marcando la distancia entre entrada, stop y objetivo a
   escala real del cálculo que el usuario acaba de hacer.

Es un elemento estructural que codifica información (escala, distancia, riesgo), que es
exactamente lo que el producto vende. No es decoración.

## 4. El hero

Hoy el hero es: titular + degradado + aurora + chart animado + demo. Son cuatro cosas
compitiendo. La tesis del hero debe ser **una**.

La cosa más característica de este producto es la calculadora funcionando. El hero es
`LandingDemoCalculator` a tamaño real, con la regleta debajo mostrando el trade que el
visitante acaba de dimensionar. Sin aurora, sin chart de adorno. El titular es una línea
corta a la izquierda; el instrumento ocupa el peso.

Si al quitar `AuroraBackground.jsx` la sección se cae, es que la sección se sostenía en el
adorno.

## 5. Reglas duras (checklist antes de commitear cualquier UI)

- [ ] ¿He añadido un degradado? → Bórralo salvo que sea un fill de gráfico de datos.
- [ ] ¿He pintado un P&L con `text-green-500` / `text-red-500`? → Usa `--long` / `--short`.
- [ ] ¿He usado más de un color de acento en la vista? → Reduce a uno (el verde de marca).
- [ ] ¿Hay iconos con chip de color de fondo? → Icono monocromo, sin chip.
- [ ] ¿He usado `Sparkles`, `Zap` o `Rocket`? → Sustituye por un icono del dominio.
- [ ] ¿Los números son `tabular-nums`? → Obligatorio.
- [ ] ¿La display aparece más de una vez en esta vista? → Sobra.
- [ ] ¿Hay `shadow-lg`? → Filete + superficie elevada.
- [ ] ¿El copy dice "potencia tu trading" o similar? → Reescribe en concreto: qué calcula,
      con qué dato, en cuánto tiempo.

## 6. Qué NO copiar de Awwwards

Awwwards premia sobre todo portfolios, webs de marca y experiencias promocionales — piezas
que se visitan una vez. TradingCalculator.Pro es una herramienta que se abre **cada día
antes de operar**. Copiar el formato es un error de categoría:

| De Awwwards se roba | De Awwwards NO se roba |
|---|---|
| El nivel de acabado tipográfico | El scroll-jacking / smooth scroll con Lenis |
| Las curvas de easing y el timing | El preloader con contador de porcentaje |
| El cuidado de los estados hover/focus | El hero WebGL a pantalla completa |
| El uso de filetes y grids visibles | Cursores personalizados |
| La coherencia de un solo acento | Transiciones de página que retrasan la interacción |

Un trader que quiere calcular un tamaño de posición antes de que se le escape la entrada no
perdona 2 segundos de intro animada. **La velocidad es parte del diseño.**

## 7. Dónde se toca cada cosa

| Qué | Archivo |
|---|---|
| Tokens de color y radios | `frontend/src/index.css` (`:root`, `.light`, `.dark`) |
| Escala, fuentes, easings | `frontend/tailwind.config.js` → `theme.extend` |
| Carga de fuentes | `frontend/public/index.html` (hoy carga 4; dejar 3) |
| Utilidades tipográficas | `frontend/src/App.css` — **eliminar el duplicado de `.font-unbounded`** |
| Primitivas | `frontend/src/components/ui/` (46 componentes shadcn) |
| Landing | `frontend/src/pages/LandingPage.jsx` + `components/landing/` |

Cambia los tokens **primero**. Con 46 primitivas shadcn consumiendo variables CSS, mover
`--primary` y `--radius` reescribe la mitad de la web sin tocar un solo `.jsx`.
