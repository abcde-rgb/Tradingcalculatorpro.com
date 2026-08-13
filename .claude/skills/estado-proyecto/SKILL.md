---
name: estado-proyecto
description: Usar al retomar el proyecto TradingCalculator.Pro, antes de añadir funciones, calculadoras, páginas, endpoints, idiomas o secciones admin, al preparar el despliegue/lanzamiento, o cuando se pregunte "qué falta", "qué hay que probar" o "qué está hecho". Carga el estado vivo del proyecto y las guías de extensión, despliegue y personalización de TradingView, y obliga a dejar la documentación actualizada al terminar.
---

# Estado y mantenimiento de TradingCalculator.Pro

Mantiene el proyecto coherente entre sesiones. **Léelo entero antes de tocar nada.**

## 1. Orientación — en este orden

El hook de arranque (`.claude/hooks/orientacion.sh`) ya te ha dado, antes de tu primer
mensaje: rama, árbol limpio o sucio, ramas con trabajo sin fusionar y si la doc o el mapa
se han quedado atrás. **No vuelvas a averiguar eso a mano.**

1. **[`docs/ESTADO_PROYECTO.md`](../../../docs/ESTADO_PROYECTO.md)** (~300 líneas) — el
   estado: semáforo, inventario, huecos `G-xx`, plan de test, backlog y gating de
   operación. Es criterio, no conteos.
2. **[`docs/MAPA.md`](../../../docs/MAPA.md)** — dónde está cada cosa: módulos con su
   responsabilidad y tamaño, las rutas con `fichero:línea`, las rutas **sin consumidor en
   el frontend**, carpetas del frontend y los ficheros que más cuesta abrir. Generado
   desde el código: si tienes que saber cuántos/cuáles/dónde, la respuesta está aquí y no
   hay que buscarla.
3. **[`CLAUDE.md`](../../../CLAUDE.md)** — se carga solo. Sólo lleva lo universal; las
   reglas por zona (`.claude/rules/`) entran solas al abrir ficheros de su área.

Según la tarea:

| Vas a… | Abre |
|---|---|
| Añadir algo nuevo | `docs/GUIA_EXTENSION.md` |
| Publicar / lanzar | `docs/DEPLOY_CHECKLIST.md` |
| Entender por qué algo acabó así | `docs/REGISTRO_SESIONES.md` (**busca por fecha o palabra, no lo leas entero**) |
| Arreglar un bug | `docs/DIARIO_BUGS.md` |
| Gráficos por usuario | `docs/TRADINGVIEW_PERSONALIZACION.md` |
| Saber qué no está en `main` | `docs/AUDITORIA_REPOSITORIO_2026-08-13.md` §2 |

⚠️ **No leas `docs/REGISTRO_SESIONES.md` entero**: son ~3.900 líneas y ~73.000 tokens.
Es el histórico de 126 sesiones y se consulta con `grep`.

## 2. Reglas de oro (no romper)

Están en `CLAUDE.md` § *Invariantes* y ya las tienes cargadas. Las tres que más han
costado: la BD sólo por el shim (**nunca SQL directo**), el **apalancamiento no entra en
el P&L** y **lo que no se puede calcular es `None`, no `0`**.

## 3. Verificación obligatoria antes de commit

```bash
cd backend && python -m py_compile *.py     # TODOS los módulos
cd backend && pytest tests/ -q              # los *_unit.py corren siempre
cd frontend && npx eslint src scripts       # 0 errores
cd frontend && node scripts/i18n-check.js && node scripts/engine-check.js
cd frontend && npm run build                # exit 0
python scripts/gen-mapa.py --check          # el mapa refleja el código
python scripts/gen-instruments-js.py --check
python scripts/check-doc-links.py
```

Los tres últimos corren en CI (job `documentacion`), así que si te los saltas, el PR
rompe. Atajo para todo: `/verify`.

Notas de entorno: si `pip install -r requirements.txt` choca con el `PyJWT` del sistema,
usa un venv aislado. Los tests de integración requieren `BACKEND_URL` vivo; sin él se
saltan.

## 4. Al terminar — OBLIGATORIO

1. **Regenera el mapa** si tocaste módulos, rutas o páginas: `python scripts/gen-mapa.py`.
2. **Añade la entrada de sesión** en `docs/REGISTRO_SESIONES.md` (con fecha, qué se hizo,
   qué se verificó y qué se dejó fuera a propósito) **y actualiza la tabla de las cinco
   últimas en §7 de `ESTADO_PROYECTO.md`**.
3. **Actualiza `ESTADO_PROYECTO.md`**: semáforo (§1), inventario (§2) si cambió *qué* hay
   —los *cuántos* ya los lleva el mapa—, casillas del backlog (§5) y huecos nuevos en §3
   con ID `G-xx`.
4. Si tocaste seguridad o bugs, refleja también en `docs/DIARIO_BUGS.md`. **Esto se ha
   olvidado**: el 2026-08-10 se cerró un bypass de 2FA y un *account pre-hijacking* y no
   quedó entrada de sesión.
5. Si descubriste una trampa nueva de una zona concreta, va a `.claude/rules/<zona>.md`,
   **no** a `CLAUDE.md` — que tiene que seguir por debajo de 200 líneas.

**Regla:** la documentación refleja el **código real**, no intenciones. Verifica
(compila, ejecuta, lee) antes de afirmar que algo está hecho.

## 5. Lo que hay que saber sí o sí

- **Hay trabajo terminado que no está en `main`**: 6 PRs de producto abiertos desde el
  02-08 y 4 ramas sin PR. Y el **PR #178 es un *revert* del multiproducto que sí está
  fusionado — no lo fusiones.**
- **35 rutas del backend no las llama nadie** (hueco G-14). Antes de escribir un módulo
  nuevo, mira `MAPA.md` § *Rutas sin consumidor*: puede que ya esté escrito.
- Los bloqueos de lanzamiento que quedan son **operativos** (Stripe real, secretos, DNS),
  no de código — ver `DEPLOY_CHECKLIST.md`.
