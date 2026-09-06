---
name: rendimiento-web
description: >-
  Medir y defender el peso y la velocidad de TradingCalculator.Pro: cuánto se
  descarga cada pantalla, si un cambio la ha engordado, qué se puede quitar y qué
  NO se puede medir en este entorno. Úsalo antes de añadir una librería, al
  revisar un PR que toca `frontend/`, cuando se diga que la web "carga lenta" o
  "pesa mucho", y siempre después de tocar `App.js`, un `import` de página o el
  contenido de la Academia. Para los ARREGLOS estructurales —partir páginas,
  code-splitting, migrar de CRA a Vite— usa `reorganizar-frontend`: esta skill
  mide, aquella reordena.
---

# Rendimiento web

Esta skill existe porque faltaba **la mitad de medir**. `reorganizar-frontend` ya
dice qué está mal y en qué orden arreglarlo; lo que no había era forma de
comprobar si algo mejoró, ni de que una regresión rompiera nada.

> **No dupliques `reorganizar-frontend`.** Si la pregunta es «¿cómo lo arreglo?»,
> esa es la skill. Si es «¿cuánto pesa, ha empeorado, y con qué lo comparo?»,
> es ésta.

## Lo medido, no lo estimado (2026-09-06)

| | |
|---|---|
| Build completo | **67 MB**, de los cuales **16 MB de JS** |
| Páginas estáticas | **3429** `index.html` (las SEO) |
| Fragmento JS mayor | 1,5 MB · el siguiente 1,2 MB · `main` 719 KB |
| **JS que descarga la portada** | **1 014 KB** sin comprimir |
| `/legal` | 1 422 KB · `/pricing` 1 046 KB · `/about` 1 022 KB · `/brokers` 1 024 KB |

Léelo así: **todas las pantallas públicas descargan aproximadamente lo mismo, ~1 MB**,
y eso es el síntoma exacto de que **no hay code-splitting por ruta** — hay un solo
`React.lazy` en toda la aplicación. Quien entra en la portada se lleva
`AdminPage`, la Academia y los textos legales sin usarlos. No es una sospecha:
son las cinco cifras de arriba, y por eso `/legal` (que sí usa sus 268 KB de
textos) pesa apenas un 40 % más que `/about`, que no usa nada de eso.

## La herramienta

```bash
node tests/e2e/stack/servidor.js &          # sirve frontend/build
node tests/e2e/navegador/peso.js            # mide y compara con el presupuesto
node tests/e2e/navegador/peso.js --actualizar   # reescribe el presupuesto
```

El presupuesto vive en `tests/e2e/presupuesto-peso.json`. **Subir un número ahí
es una decisión, no un trámite**: escribe en el commit por qué esa pantalla tiene
que pesar más. Bajarlo, en cambio, es gratis y es el objetivo.

### Qué significan esos bytes, exactamente

Son `encodedBodySize` con la caché fría, servidos por el servidor local, que
**no comprime**. GitHub Pages sí comprime, así que **el usuario real descarga
bastante menos**. No conviertas estas cifras en «tu web tarda X»: son una vara
consistente para detectar que algo engordó, no una medida de la experiencia.

### Y lo que NO mide, a propósito

**LCP, CLS e INP no son puertas aquí.** En un contenedor con CPU compartida bailan
entre ejecuciones, y una comprobación que falla según lo cargado que esté el
runner es una comprobación que alguien acaba desactivando —y con ella se va la
confianza en las demás—. El FCP se imprime como informativo y nada más. Si hace
falta medir experiencia de verdad, se mide en el sitio desplegado y con datos de
campo, no aquí.

## La holgura es en KB, no en porcentaje — y esto costó un fallo

La primera versión daba **+8 %** de margen. Suena prudente hasta que haces la
cuenta: sobre una pantalla de 1 MB son **80 KB de holgura**. Se le metió a
`/about` un `import` de los textos legales que no usa —27 KB reales— y **el
verificador siguió en verde**.

Lo que se quiere cazar es «alguien ha metido una librería», y eso es una cantidad
fija de KB, no una fracción. Con un porcentaje, **cuanto más gorda está una
pantalla más fácil le resulta seguir engordando**. Ahora la holgura son 15 KB
absolutos y ese mismo sabotaje falla.

## Cómo usarla

**Antes de añadir una dependencia** — mide, añádela, vuelve a medir. Si la
portada crece y la librería no la usa la portada, el problema no es la librería:
es que no hay code-splitting y ahora todo el mundo paga por ella. Eso es
`reorganizar-frontend` § 2.3.

**Revisando un PR que toca `frontend/`** — si toca `App.js`, los `import` de una
página, `tradingEducationContent.js` (140 KB), `marketTypesContent.js` (84 KB) o
`lib/legalContent/` (268 KB), mide. Son los cuatro sitios desde los que el peso
se propaga a todas las pantallas.

**Cuando alguien diga «va lento»** — pregunta *dónde* y *en qué red*. Estas cifras
no responden a eso. Lo que sí responden es si la aplicación ha engordado desde la
última medición, que suele ser la causa.

## Lo que de verdad movería la aguja

Por orden de efecto, y todo ello está detallado en `reorganizar-frontend`:

1. **`lazy()` por ruta en `App.js`.** Es el único cambio que puede bajar la
   portada de 1 014 KB a una fracción, porque hoy arrastra pantallas que el
   visitante no abre. Empezar por `AdminPage` —la usa una persona y viaja a todo
   el mundo— y por `EducationPage`.
2. **`AdminPage` fuera del bundle público**, por peso y porque no tiene por qué
   estar ahí.
3. **Vite en vez de CRA + CRACO**, que es lo que hace medible todo lo demás.

Después de cada uno: `--actualizar`, y que el número **baje** en el commit. Un
presupuesto que sólo sube es un presupuesto decorativo.

## Reglas

- **Mide sobre el build compilado**, nunca sobre `npm start`. El servidor de
  desarrollo no minifica ni parte el código: sus cifras no significan nada.
- **Una ruta que redirige no se mide.** Las protegidas mandan al login, así que
  medirlas mide el login. Por eso las cinco de la lista son públicas.
- **Nunca subas el presupuesto para que pase CI.** Ése es exactamente el momento
  en que la comprobación deja de servir para algo.
- Y si añades una comprobación nueva aquí, **saboteála** y comprueba que falla —
  `scripts/probar-verificadores.sh`. Esta misma nació sin cazar su propio
  sabotaje.
