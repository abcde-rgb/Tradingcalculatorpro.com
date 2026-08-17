---
name: cerrar-hueco
description: >-
  Llevar un hueco del inventario de TradingCalculator.Pro (G-01 … G-36 de
  docs/ESTADO_PROYECTO.md § 3) desde "abierto" hasta "cerrado y verificado", o
  decidir el destino del trabajo que no está en main. Úsalo cuando se nombre un
  hueco por su código, cuando se pregunte qué falta o por dónde seguir, al retomar
  el proyecto para avanzar de verdad, o cuando haya que decidir entre construir
  algo anunciado y retirar el anuncio. Obliga a comprobar que el hueco sigue
  existiendo antes de trabajar, y a dejar la prueba de que se cerró.
---

# Cerrar un hueco

El inventario de `docs/ESTADO_PROYECTO.md` § 3 es lo más valioso del proyecto y
también lo más fácil de creerse sin mirar. Un hueco marcado en rojo puede llevar
meses cerrado; uno en verde puede haberse reabierto solo.

## 1 · Comprueba que el hueco existe HOY

Antes de escribir una línea. Los documentos son afirmaciones de alguien, con
fecha, y este proyecto tiene un hueco (G-29) dedicado precisamente a que su
documento de pendientes daba por abierto lo cerrado y citaba cifras falsas.

```bash
python3 scripts/gen-mapa.py --check   # rutas sin consumidor: recalcula G-14
git log --oneline -20 -- <el fichero que el hueco menciona>
grep -rn "<lo que el hueco afirma>" backend/ frontend/src/
```

Si ya está cerrado: **actualiza el documento y dilo**. Es trabajo entregado, no
tiempo perdido — evita que la siguiente sesión lo repita.

Si el hueco existe pero no es lo que dice, corrige el enunciado primero: no se
puede cerrar bien un hueco mal descrito.

## 2 · Decide de qué tipo es

Esto determina el trabajo, y confundirlo es la forma habitual de perder una
sesión entera:

- **Construir** — el backend está y le falta pantalla (G-14: 41 rutas, cuatro
  módulos completos sin interfaz). El trabajo es frontend.
- **Retirar el anuncio** — la web promete algo que no existe. A veces la
  respuesta honesta es quitar la promesa, no construir la función. **Esta
  decisión es del usuario, no tuya**: pregúntala antes de hacer nada.
- **Unificar** — hay dos fuentes de verdad para el mismo número (G-22: dos
  expectancies distintas según la pantalla). Elige una, migra la otra, y deja un
  test que impida la tercera.
- **Rehacer sobre lo probado** — la lógica existe suelta y sin cobertura (G-33).
  Aquí manda el skill `auditar-herramienta`.
- **Decidir** — trabajo terminado fuera de `main` (G-32: 16 ramas de producto).
  Ni se fusiona ni se cierra a ciegas: se mira una por una.

## 3 · Sobre el trabajo que no está en main

Es el hueco que más crece solo. Para cada rama o PR:

```bash
git log --oneline origin/main..origin/<rama>
git diff --stat origin/main...origin/<rama>
```

Tres preguntas, en este orden: ¿qué resuelve? ¿sigue haciendo falta, o el código
ya cambió por debajo? ¿se sostiene con `/verify` hoy? Un `revert` de algo vivo se
cierra sin fusionar. Y **fusionar a `main` despliega a producción**: se pide
antes, siempre.

## 4 · Haz el trabajo, con red

Todo lo que se toque queda cubierto donde CI lo alcance: `engine-check` para el
número concreto, `simulacion-masiva` con **semilla nueva** para la invariante,
una sonda de navegador si hay pantalla. Si no se puede cubrir, dilo en el
informe: es parte del resultado.

## 5 · Verifica por una ruta que no sea la tuya

`/verify` entero. Y luego `no-me-fio` sobre tu propio trabajo: reproduce el
fallo original y comprueba que ya no ocurre. Un commit no es una prueba de que
algo esté arreglado; es una prueba de que algo cambió.

## 6 · Deja el documento al día — con la prueba

En `docs/ESTADO_PROYECTO.md`, la fila del hueco pasa a 🟢 con **fecha y
evidencia**, siguiendo el estilo que ya usan G-15, G-20 y G-25: qué era la
causa, no el síntoma; qué se hizo; qué comprobación lo fija; contra qué se
verificó. Y añade la entrada al § 7 Registro de sesiones.

Si el hueco queda a medias, dilo con la misma precisión: qué parte está cerrada,
qué parte no, y qué haría falta. Media verdad en este documento cuesta una
sesión entera a quien venga después.

## Por dónde empezar si no te dicen cuál

Por lo que da cifras falsas a un usuario antes que por lo que falta. Después,
por lo que la web promete y no cumple. Al final, la limpieza (G-30, G-31), que
no cambia lo que nadie ve.
