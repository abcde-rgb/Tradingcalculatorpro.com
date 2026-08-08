---
name: microinteracciones
description: >-
  Usar al añadir o revisar cualquier animación, transición, hover, estado de foco, feedback
  al pulsar, carga, aparición al hacer scroll o sonido en TradingCalculator.Pro. Úsalo
  también cuando se diga que la web "se siente barata", "seca", "sin vida" o "sin
  respuesta", al tocar `framer-motion`, al crear un botón/input/tabla nueva, y siempre
  antes de instalar una librería de animación o de audio. Define las curvas, los tiempos,
  el sistema de sonido sintetizado y qué NO animar nunca.
---

# Movimiento y sonido

## 1. Diagnóstico

Medido sobre `frontend/src`:

- **11** clases `duration-*` en total, repartidas en 251 archivos `.jsx`.
- **0** `cubic-bezier` propios: todo usa el `ease` por defecto del navegador.
- **~330** variantes `hover:` (`hover:border-primary` ×74, `hover:bg-muted` ×70,
  `hover:text-foreground` ×64…) **sin transición asociada**.

Traducción: la web tiene cientos de estados hover que **cambian de golpe, en un frame**. Eso
es exactamente lo que hace que una interfaz se sienta a medio hacer. No falta animación:
falta que la que ya existe tenga tiempo y curva.

`framer-motion@12` ya está instalado. No hace falta GSAP.

## 2. Curvas y tiempos

Añadir a `tailwind.config.js` → `theme.extend`:

```js
transitionTimingFunction: {
  // Reacción a una acción del usuario. Sale rápido, frena suave.
  out:   'cubic-bezier(0.22, 1, 0.36, 1)',
  // Movimiento entre dos estados (paneles, acordeones).
  inout: 'cubic-bezier(0.65, 0, 0.35, 1)',
  // Un punto de rebote muy contenido. SOLO para confirmaciones.
  snap:  'cubic-bezier(0.34, 1.4, 0.64, 1)',
},
transitionDuration: {
  tick:  '90ms',   // hover, foco, cambio de color
  beat:  '180ms',  // press, tooltip, badge
  swing: '320ms',  // panel, modal, acordeón
  arc:   '520ms',  // entrada de sección al hacer scroll
},
```

Reglas de asignación:

| Interacción | Duración | Curva | Propiedad |
|---|---|---|---|
| Hover de color/borde | `tick` | `out` | `color`, `border-color`, `background-color` |
| Press (mousedown) | `90ms` | `out` | `transform: scale(0.985)` |
| Foco de teclado | inmediato | — | el anillo aparece **sin** transición (accesibilidad) |
| Tooltip / popover | `beat` | `out` | `opacity` + `translateY(4px)` |
| Modal / drawer | `swing` | `inout` | `opacity` + `scale(0.98→1)` |
| Sección al entrar en viewport | `arc` | `out` | `opacity` + `translateY(16px)`, **una sola vez** |
| Número que cambia | `beat` | `out` | ver §4 |

**Solo se animan `transform` y `opacity`.** Animar `width`, `height`, `top` o `box-shadow`
provoca layout thrashing; en tablas de opciones con cientos de filas se nota.

## 3. Hover: qué hace un hover bien hecho

Un hover no es un cambio de color. Son **dos o tres propiedades que se mueven juntas** con
el mismo timing:

```jsx
// Card de calculadora
className="
  border border-rule bg-ink-raised
  transition-[border-color,background-color,transform] duration-tick ease-out
  hover:border-amber/40 hover:bg-ink-raised/80 hover:-translate-y-px
"
```

Ese `-translate-y-px` (un solo píxel) es lo que separa "cambia de color" de "responde".
No uses `hover:scale-105`: en una card de 400px eso son 20px de salto y delata plantilla.

Jerarquía de intensidad — **no todo reacciona igual**:

- **Primario** (CTA, botón calcular): color + elevación + sonido.
- **Secundario** (cards, filas de tabla): borde + fondo sutil.
- **Terciario** (links de footer, breadcrumbs): solo subrayado o color.

Si todo en la página reacciona con la misma fuerza, nada destaca.

## 4. El momento clave: el resultado del cálculo

Es la única animación que importa de verdad en este producto. Cuando el usuario pulsa
calcular, el resultado **no debe aparecer de golpe ni hacer fade**: debe **contar**.

- Los dígitos suben desde el valor anterior hasta el nuevo en `beat` con curva `out`.
- Ancho fijo con `tabular-nums` para que nada se mueva lateralmente.
- El signo (+/−) y el color (`--long` / `--short`) cambian **al final** del conteo, no al
  principio: el usuario ve el número asentarse antes de saber si es bueno.
- La regleta de la §3 de `identidad-visual` redibuja sus marcas en `arc`.

Nada más en la página se mueve durante ese medio segundo.

## 5. Sonido

Sí, pero con condiciones estrictas. Esto es una herramienta profesional que se usa en el
trabajo y en abierto.

**Reglas no negociables:**
1. **Apagado por defecto.** Toggle visible en `SettingsPage.jsx`, persistido en `zustand`.
2. **Cero archivos de audio.** Todo sintetizado con Web Audio API → 0 KB de descarga, 0
   latencia, no bloquea el `build`.
3. **Nada supera 120 ms ni −18 dBFS.** Son detentes mecánicos, no notificaciones.
4. Solo suena lo que el usuario **provoca**. Nada suena solo.
5. Primer sonido solo tras un gesto real del usuario (política de autoplay del navegador).

**Paleta sonora** (cinco sonidos, ni uno más):

| Evento | Sonido | Síntesis |
|---|---|---|
| Cálculo completado | *tick* seco | Onda sine 880 Hz, 40 ms, decay exponencial |
| Detente de slider | *click* muy corto | Ruido filtrado paso-banda 2 kHz, 12 ms |
| Trade guardado en el diario | *thunk* grave | Sine 220 Hz, 90 ms |
| Error de validación | *thud* doble | Sine 160 Hz ×2 separados 60 ms |
| Toggle / cambio de pestaña | *tap* | Sine 660 Hz, 25 ms, volumen mitad |

Implementación: un solo `AudioContext` compartido en `frontend/src/lib/sound.js`, creado
perezosamente en la primera interacción. Un `GainNode` maestro que respeta el toggle.
Ningún componente crea su propio contexto.

**No suenan nunca:** hover, scroll, carga de página, aparición de secciones, navegación.
Un sonido al pasar el ratón convierte la web en un juguete y la hace inusable en una
oficina.

## 6. Accesibilidad (no opcional)

`AnimatedHeroChart.jsx` y `AuroraBackground.jsx` ya respetan `prefers-reduced-motion`. Son
los **únicos dos** archivos del repo que lo hacen. Extiéndelo globalmente:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Además: solo **14** usos de `focus-visible` en todo el repo. Cada elemento interactivo
necesita un anillo de foco visible en ámbar, con 2px de offset. Un usuario que navega con
teclado tiene que poder ver dónde está.

## 7. Qué no animar nunca

- Tablas de datos al filtrar u ordenar. Reordenar filas con animación en una cadena de
  opciones hace que el usuario pierda la fila que estaba mirando.
- El header al hacer scroll. Que se quede quieto.
- Nada mientras hay una petición al backend en curso, salvo el propio indicador de carga.
- Nada que retrase la interacción por debajo de los 100 ms.
- Repetición de la animación de entrada al volver a hacer scroll: `whileInView` siempre con
  `viewport={{ once: true }}` (revisar los `MOTION_*_VIEW` de `LandingPage.jsx`).

## 8. Orden de trabajo

1. Añadir curvas y duraciones a `tailwind.config.js`.
2. Añadir el bloque global de `prefers-reduced-motion` a `index.css`.
3. Arreglar los ~330 hover sin transición, empezando por `components/ui/button.jsx`,
   `card.jsx` e `input.jsx` — al ser primitivas, arreglan cientos de sitios de una vez.
4. Anillos de foco en las mismas primitivas.
5. El contador del resultado (§4).
6. `lib/sound.js` + toggle en ajustes, apagado por defecto.

Los pasos 3 y 4 son los que más cambian la sensación por línea de código tocada.
