---
name: 3d-webgl
description: >-
  Usar antes de añadir cualquier elemento 3D, WebGL, canvas animado o shader a
  TradingCalculator.Pro, y cuando se pida "algo en 3D", una superficie de volatilidad, un
  gráfico de payoff tridimensional o efectos tipo Awwwards. Decide si el 3D está
  justificado, dónde sí y dónde no, y cómo integrarlo sin hundir el peso del bundle ni el
  rendimiento en móvil. Léelo también antes de instalar `three`, `@react-three/fiber` o
  cualquier librería de WebGL.
---

# 3D en TradingCalculator.Pro

Hoy el proyecto **no tiene ninguna dependencia 3D**. Eso es una decisión que hay que tomar
a conciencia, no por inercia.

## 1. El criterio

`three` + `@react-three/fiber` añaden más de **150 KB comprimidos** al bundle. Para una
herramienta que un trader abre con prisa antes de entrar en mercado, ese coste solo se
justifica si el 3D **muestra algo que en 2D no se puede mostrar**.

| Uso | ¿Justificado? |
|---|---|
| Superficie de volatilidad implícita (strike × vencimiento × IV) | **Sí.** Son tres variables. Aplanarla a 2D pierde información. |
| Payoff de una estrategia multi-pata en función de precio **y** tiempo hasta vencimiento | **Sí.** La erosión temporal es la segunda dimensión. |
| Blob/esfera flotante en el hero | No. Decoración cara. |
| Fondo de partículas | No. |
| Tarjetas que se inclinan con el ratón | No. Y además rompe el foco de teclado. |
| Logo 3D girando | No. |
| Globo terráqueo de "usuarios en el mundo" | No. |

Regla: **el 3D solo entra si es un eje de datos.** Si es un adorno, la respuesta es no, por
bonito que quede en Awwwards. Las webs premiadas allí se visitan una vez; esta se abre cada
día.

## 2. Lo que sí se construye

### Superficie de volatilidad implícita

La pieza estrella. Va **solo** en `pages/OptionsHubPage.jsx`, nunca en la landing.

- Ejes: strike (X), días a vencimiento (Y), IV (Z).
- Malla de filete fino en `--rule`, sin material brillante ni luces dramáticas. Es un
  instrumento científico, no un videojuego.
- Color por altura usando la escala ámbar→hueso de `identidad-visual`. **Nunca** verde/rojo:
  esos colores están reservados al P&L.
- Órbita limitada (sin giro libre de 360°: el usuario se desorienta y pierde la lectura).
- Al pasar el ratón, se proyectan líneas guía a los tres planos con el valor numérico en
  `IBM Plex Mono`. El dato manda sobre el efecto.
- Corte 2D siempre visible al lado: la superficie contextualiza, la sección se lee.

### Payoff en tiempo

El diagrama de payoff que ya existe en 2D, extendido con el eje de días restantes, para que
se vea cómo se dobla la curva según se acerca el vencimiento. Es la mejor explicación
visual de theta que existe y encaja directamente con `EducationPage`.

## 3. Cómo integrarlo sin romper nada

```jsx
// Nunca un import directo de three en un componente de ruta.
const VolSurface = lazy(() => import('@/components/options/VolSurface'));
```

Requisitos obligatorios:

1. **Carga diferida y bajo demanda.** El chunk 3D no se descarga hasta que el usuario abre
   la pestaña que lo contiene. Coordinar con el paso 2 de `reorganizar-frontend`.
2. **Fallback 2D real**, no un spinner. Si no hay WebGL, si el dispositivo es de gama baja
   o si el usuario tiene `prefers-reduced-motion`, se sirve el corte 2D con `recharts`, que
   ya está en el proyecto. El fallback debe ser útil por sí solo.
3. **Detección antes de montar:** comprobar contexto WebGL, `navigator.hardwareConcurrency`
   y `matchMedia('(pointer: coarse)')`. En móvil, 2D por defecto con opción de activar 3D.
4. **`frameloop="demand"`.** La escena solo redibuja cuando cambian los datos o el usuario
   la manipula. Un `requestAnimationFrame` constante a 60 fps quema batería en un portátil
   que además tiene abierta la plataforma de trading.
5. **Descartar la escena al desmontar** (geometrías, materiales, texturas y renderer). Con
   navegación SPA, no hacerlo provoca fugas de memoria en sesiones largas — y aquí las
   sesiones son largas.
6. **Presupuesto:** si el chunk 3D supera los 200 KB comprimidos, importar solo los módulos
   de `three` que se usen en vez del paquete completo.

## 4. Alternativas sin coste

Antes de instalar nada, considera que buena parte del efecto "3D" se consigue con lo que ya
hay:

- **SVG con profundidad**: proyección isométrica de la escalera de precios. Cero
  dependencias, funciona en cualquier dispositivo, indexable.
- **Canvas 2D**: `AnimatedHeroChart.jsx` ya lo usa. Un mapa de calor de la cadena de
  opciones con canvas rinde mejor que cualquier malla WebGL.
- **CSS `transform: perspective()`**: para el apilado de capas de una estrategia
  multi-pata basta y sobra.

Si un SVG resuelve el problema, el SVG gana.

## 5. Antes de instalar `three`

- [ ] ¿El 3D representa una tercera variable de datos real? Si no, para aquí.
- [ ] ¿Existe un fallback 2D que funcione solo?
- [ ] ¿Está fuera de la landing y de cualquier ruta pública crítica?
- [ ] ¿Está en `lazy()` con su propio chunk?
- [ ] ¿`frameloop="demand"` y limpieza al desmontar?
- [ ] ¿Respeta `prefers-reduced-motion`?
- [ ] ¿Se mantiene la paleta de `identidad-visual` (verde/rojo solo para P&L)?

Si alguna casilla queda sin marcar, no se instala.
