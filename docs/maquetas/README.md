# Maquetas — elegir antes de tocar código

Galerías de propuestas en HTML puro, sin dependencias, con los tokens reales del producto.
Se abren en el navegador y sirven para **decidir la forma antes de escribir la primera
línea**. Cada una lleva un selector arriba, conmutador de tema y vista móvil real.

| Galería | Qué decide | Estado |
|---|---|---|
| [`panel-cliente.html`](./panel-cliente.html) | 6 rediseños de `/settings` | ✅ Elegida la 1 e implementada (2026-09-03) |
| [`foro-comunidad.html`](./foro-comunidad.html) | 6 formas de foro de comunidad, cada una con su motor de código abierto | ✅ Elegida la 6 (foro propio) y **construida** el 2026-09-03. Contexto en [`FORO_COMUNIDAD.md`](../FORO_COMUNIDAD.md) |
| [`comunidad-layers.html`](./comunidad-layers.html) | 6 **registros visuales** sobre la misma maquetación (cinemático, técnico, lujo, brutalista, calma, producto) | ✅ Elegido el 6, «Producto»: el sistema real sin cambiarlo |

---

## Panel de configuración del cliente

Seis propuestas de rediseño de `/settings` para **elegir una antes de tocar código**.

> ✅ **Elegida y ya implementada: la 1, «Consola»** (2026-09-03). Vive en
> `frontend/src/pages/SettingsPage.jsx`. Las otras cinco se conservan porque
> explican qué se descartó y por qué — ver [`DECISIONES.md`](../DECISIONES.md).

```
docs/maquetas/panel-cliente.html     ← ábrelo en el navegador
```

Todo vive en un solo fichero, sin dependencias. Arriba hay un selector con las seis,
un conmutador de tema y una vista móvil real. Se puede enlazar un estado concreto:

| URL | Qué abre |
|---|---|
| `panel-cliente.html#/v3` | la maqueta 3 |
| `panel-cliente.html?tema=claro#/v4` | la 4 en tema claro |
| `panel-cliente.html?ancho=movil#/v2` | la 2 a 390 px |

> El ancla lleva barra (`#/v3`, no `#v3`) a propósito: si coincidiera con el `id` de la
> sección, el navegador saltaría a ella y dejaría la página desplazada por debajo del
> contenido. Pasó, y las capturas salían **en blanco** sin que nada fallara.

La vista móvil usa **container queries**, no media queries: al estrechar el escenario a
390 px la maqueta reflow-ea de verdad en lugar de quedarse en la versión de escritorio
encogida. Es lo que permite juzgar el móvil sin abrirlo en el móvil.

## Qué se ha respetado

Los tokens son los reales de `frontend/src/index.css` (grafito azulado, tinta hueso,
verde de marca `145 80% 45%`), las tres familias del producto (Archivo · Inter Tight ·
IBM Plex Mono) y las reglas del skill `identidad-visual`: **un solo acento**, filete de
1 px en lugar de sombra, dos radios (2 px y 10 px), cero degradados, cero `blur-3xl` y
todo número en `tabular-nums`. La regleta —la escala de calibre— aparece en las maquetas
1 y 4, donde mide algo, y en ninguna más.

## El problema que resuelven

`SettingsPage.jsx` son 673 líneas: **ocho tarjetas apiladas en una columna de 672 px**,
todas con el mismo peso visual, sin navegación ni agrupación. La seguridad está repartida
en tres tarjetas seguidas (contraseña, 2FA, passkeys) que no se leen como un bloque, y
la zona de peligro va justo detrás de «Acciones», con el mismo aspecto.

Además, tres ajustes que el usuario espera encontrar aquí **no están**: el tema y el
idioma viven en la cabecera, y la cuenta de la mesa (capital, riesgo máximo por
operación, vista de inicio) dentro del dashboard. En las maquetas van marcados
`propuesta`: son decisión aparte de la de elegir un diseño.

## Las seis

| # | Nombre | Idea | Coste |
|---|---|---|---|
| 1 | **Consola** | Rail de secciones + panel de trabajo. El rail marca en ámbar lo que reclama atención | Medio |
| 2 | **Cabecera** | Banda de identidad con tira de datos + pestañas + una columna de 720 px | Bajo |
| 3 | **Hoja de datos** | Cero tarjetas: cada ajuste es una fila con su valor actual visible; se edita en la propia fila | Medio-alto |
| 4 | **Estado** | Columna fija con las comprobaciones de la cuenta y acceso directo a lo pendiente | Alto |
| 5 | **Cajón** | Panel superpuesto con buscador: escribes «riesgo» y llegas sin saber en qué sección vive | Alto |
| 6 | **Rejilla** | Mosaico de módulos sobre retícula de 1 px; todo a la vista sin desplazarse | Medio |

Cada una lleva escrito en la propia página lo que gana, lo que pierde y lo que cuesta.

## Qué se implementó de la elegida

Todo lo que la maqueta 1 enseñaba, más las tres secciones que iban marcadas
`propuesta`:

- **Rail de seis secciones** con estado: punto ámbar en Seguridad si falta el 2FA,
  el plan en Suscripción y el capital en Mesa y riesgo, sin entrar en ninguna.
- **Enlace por sección**: `/settings?s=seguridad`. Es lo que el cajón (maqueta 5)
  no podía dar, y lo que usa el panel de administración al exigir el 2FA.
- **Mesa y riesgo**: capital, riesgo por operación en % o en dinero, y vista de
  inicio. Escribe en `deskAccount`, la MISMA preferencia que usa la mesa, y calcula
  con `riskBudget()`, la MISMA función: el tope duro del 10 % no se reimplementa.
- **Tema e idioma** dentro de Preferencias, sobre los mismos almacenes que el menú
  de la cabecera. `PREMIUM_THEMES` se subió a `lib/theme.js` para no tener una
  tercera copia de la lista.

---

## Foro de la comunidad

Seis formas de dar a la web un foro propio. **Elegir dibujo es elegir motor**, así que
cada maqueta va emparejada con el software de código abierto que la sirve de fábrica y
lleva escrito su coste real:

| # | Nombre | Motor de referencia | Lo que decide |
|---|---|---|---|
| 1 | **Tablón** | Discourse (GPLv2 · Rails + PostgreSQL) | Categorías + tabla de temas. Lo que todo el mundo reconoce como «un foro» |
| 2 | **Flujo** | Flarum (MIT · PHP) / NodeBB (GPLv3 · Node) | Sin categorías: una corriente y etiquetas. Aguanta mejor una comunidad pequeña |
| 3 | **Preguntas** | Talkyard / Question2Answer | Votos y respuesta aceptada. La única que produce SEO de verdad (`QAPage`) |
| 4 | **Muro** | Forem (AGPLv3 · Rails) / NodeBB | Tarjetas con la ficha de la operación debajo del texto |
| 5 | **Salas** | Zulip (Apache 2.0 · Django + PostgreSQL) | Chat por canal y tema durante la sesión de mercado |
| 6 | **Hilo de operación** | Ninguno — propio sobre FastAPI + el shim | El hilo *es* una operación, y se recalcula con el capital de quien lee |

La comparación de motores, las tres rutas de integración (subdominio con SSO, comentarios
incrustados, foro propio) y la recomendación están en
[`../FORO_COMUNIDAD.md`](../FORO_COMUNIDAD.md).

### Qué se ha respetado

Los mismos tokens y las mismas reglas que la otra galería: un solo acento, filete de 1 px
en vez de sombra, dos radios, cero degradados, cero `blur-3xl`, `tabular-nums` en todo
número y las tres familias del producto. **La regleta aparece en las maquetas 4 y 6**, que
son las únicas donde mide algo: en la 6 marca stop, entrada y objetivo a distancia real
sobre el recorrido (2.398 → 2.441 son 43,00 $, y la entrada cae al 33,3 %).

Los datos son de ejemplo y así lo dice la propia página. Ninguna cifra sale de una cuenta
real, y el R medio publicado de la maqueta 4 lleva escrito que **sólo cuenta operaciones
con stop declarado**: sin stop el R es indefinido, no cero, que es invariante del producto.

---

## Registros visuales de la comunidad

Elegida la forma del foro, quedaba el **tono**. Esta galería explora seis registros
sobre **exactamente la misma maquetación y el mismo contenido**: lo único que cambia
son los tokens, la tipografía, la densidad y el peso del filete. Así la comparación
mide diseño y no maquetación — si cada uno enseñara hilos distintos, se elegiría por
el contenido.

```
docs/maquetas/comunidad-layers.html#/lujo
```

| # | Registro | Qué decisión de `identidad-visual` rompe |
|---|---|---|
| 1 | **Cinemático** | El ritmo vertical; la retícula de puntos es decoración pura |
| 2 | **Técnico** | La monoespaciada como tipografía de TEXTO (está reservada a números) |
| 3 | **Lujo** | **El verde de marca** —decisión tomada y desplegada— y dos familias más |
| 4 | **Brutalista** | El filete de 1 px y los dos radios (2/10 px) del sistema |
| 5 | **Calma** | La separación por filete; y el producto es oscuro por defecto |
| 6 | **Producto** | Ninguna. Es `frontend/src/index.css` tal cual — y lo implementado |

**Se implementó la 6.** Las otras cinco se conservan porque explican el precio de las
alternativas: cinco de las seis exigen cambiar el sistema de diseño del producto
entero, no sólo esta pantalla. Cada ficha lo lleva escrito en la propia página.

> El vocabulario de moods sale de getlayers.ai (dark/light × luxe, technical,
> brutalist, calm…). **No se ha copiado ninguna plantilla suya**: el dominio está
> bloqueado por la política de red del sandbox y no se pudo abrir. Se tradujo el
> lenguaje, no el código.
