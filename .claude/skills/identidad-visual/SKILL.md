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
| Colisión semántica | `--primary: 145 80% 45%` (verde ácido) | El verde es a la vez **color de marca** y **color de beneficio**. En una herramienta financiera eso es un fallo grave: el usuario no puede distinguir "esto es la marca" de "esto está en verde porque ganas dinero". |

Ese último punto es el que hay que arreglar primero. **En este producto el verde y el rojo
están reservados para el P&L. La marca no puede usarlos.**

## 2. Dirección: "instrumento de precisión"

El producto no es una app de finanzas alegre. Es un **instrumento de medida**: calibre,
regleta, escala de ticks, cinta de cotizaciones. Todo sale de ahí.

### Color

```css
/* Tema oscuro (por defecto) */
--ink:        #101319;   /* grafito azulado, NO negro puro #0a0a0a */
--ink-raised: #171B22;   /* superficie elevada */
--rule:       #262C36;   /* filete de 1px, el separador principal */
--bone:       #E7E2D6;   /* texto: hueso, no blanco puro */
--bone-dim:   #8B8E96;   /* texto secundario */
--amber:      #E0A03C;   /* MARCA. Acento único. Ámbar de instrumento. */
--long:       #3E8E6B;   /* verde apagado, contable. Solo P&L positivo. */
--short:      #C25A47;   /* rojo óxido. Solo P&L negativo. */
```

Reglas:
- **Un solo acento**: ámbar. Si algo necesita destacar y no es P&L, es ámbar o no destaca.
- Verde y rojo **nunca** en botones, links, badges de marca ni iconos decorativos.
- El fondo se separa por **filete de 1px (`--rule`)**, no por sombra ni por degradado.
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
- **Regla dura:** la display se usa con restricción. Hoy `.font-unbounded` aparece 216
  veces; el objetivo es **menos de 20**. Una tipografía con carácter usada en todas partes
  deja de tener carácter.
- Borra la definición duplicada: una sola declaración, en `index.css`, con nombre honesto
  (`.font-display`, no `.font-unbounded`).

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
- [ ] ¿He usado verde o rojo para algo que no es P&L? → Cámbialo a ámbar o neutro.
- [ ] ¿He usado más de un color de acento en la vista? → Reduce a uno.
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
