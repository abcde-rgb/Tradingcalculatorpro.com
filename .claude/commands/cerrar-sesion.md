Cierra la sesión dejando el proyecto coherente. **Ejecuta los pasos en orden y no
te saltes ninguno**: este ritual existe porque se olvidaba. El 2026-08-10 se cerró
un bypass de 2FA y un *account pre-hijacking* y no quedó ni una línea escrita.

## 1. Regenerar lo generado

```bash
python scripts/gen-mapa.py
python scripts/gen-instruments-js.py     # sólo si tocaste backend/instruments.py
```

**Mira el diff del mapa.** Si aparecen rutas nuevas bajo «Rutas sin consumidor»,
acabas de escribir backend que ningún usuario puede alcanzar: dilo explícitamente
en el resumen, no lo dejes pasar.

## 2. Verificar

Ejecuta `/verify` entero. Si falta `.venv` o `node_modules`, corre antes
`bash scripts/preparar-entorno.sh` — **no des por «no ejecutado» algo que se podía
ejecutar**.

Si añadiste un verificador nuevo, corre también
`bash scripts/probar-verificadores.sh` y añádele su caso: un verificador que no
se ha roto a propósito todavía no se sabe si verifica.

## 3. Escribir lo que pasó

En [`docs/REGISTRO_SESIONES.md`](../../docs/REGISTRO_SESIONES.md), al final, una
entrada con fecha (`## AAAA-MM-DD — Título en una frase`) que diga:

- **Qué se buscaba** y qué se encontró de verdad.
- **Qué se hizo**, con la causa raíz, no sólo el síntoma.
- **Qué se verificó**, con cifras reales. Y **qué NO se ejecutó y por qué**.
- **Qué se dejó fuera a propósito** — esta parte es la que más se agradece luego.

Luego actualiza la tabla de las cinco últimas en §7 de `ESTADO_PROYECTO.md`.

## 4. Actualizar el estado

En [`docs/ESTADO_PROYECTO.md`](../../docs/ESTADO_PROYECTO.md):

- **§1 semáforo** si cambió algo. Cifras **medidas hoy**, no heredadas.
- **§2 inventario** sólo si cambió *qué* hay. Los *cuántos* los lleva el mapa.
- **§3** huecos nuevos con ID `G-xx`; marca los cerrados.
- **§5** casillas del backlog.

## 5. Lo que se olvida

- ¿Tocaste **seguridad o un bug**? → entrada en
  [`docs/DIARIO_BUGS.md`](../../docs/DIARIO_BUGS.md) con la causa raíz.
- ¿Tomaste una decisión **difícil de revertir** (proveedor, licencia, alcance,
  dinero, arquitectura)? → una entrada en
  [`docs/DECISIONES.md`](../../docs/DECISIONES.md), **incluyendo qué descartaste**.
- ¿Descubriste una trampa de **una zona concreta**? → va a
  `.claude/rules/<zona>.md`, **no** a `CLAUDE.md`, que tiene que seguir por
  debajo de 200 líneas.

## 6. Commit y push

Mensaje que explique **por qué**, no qué ficheros cambiaron. Push a la rama de
trabajo. **No fusiones a `main` sin permiso explícito.**

## 7. Decir la verdad en el resumen

Termina con: qué quedó hecho, qué quedó a medias, qué no se pudo verificar y qué
decisión necesita el dueño. Si algo falló, dilo con la salida real. Nunca
presentes como verificado algo que no se ejecutó.
