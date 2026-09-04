# Maquetas

Propuestas de diseño para **elegir antes de tocar código**. Dos series:

| Fichero | Qué propone |
|---|---|
| [`panel-cliente.html`](./panel-cliente.html) | 6 rediseños de `/settings` — **elegida la 1, «Consola»**, ya implementada |
| [`escaneres-flujo.html`](./escaneres-flujo.html) | 6 escáneres sobre un catálogo de **61 detectores** con su cita, el dato que exigen y su nivel de evidencia — sin elegir |

---

# Panel de configuración del cliente

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
