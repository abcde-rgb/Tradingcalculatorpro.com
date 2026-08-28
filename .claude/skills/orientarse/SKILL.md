---
name: orientarse
description: >-
  La puerta de entrada. Úsala al recibir CUALQUIER petición de trabajo sobre
  TradingCalculator.Pro —analizar, corregir, añadir, actualizar, rediseñar,
  optimizar, revisar— antes de abrir ningún fichero, y siempre que no esté claro
  dónde se toca eso, qué documentación leer, qué no se puede romper o qué
  verificador cierra el cambio. Enruta a la skill, la regla y el documento que
  aplican, y dice explícitamente qué NO hay que leer. No la uses para saber en qué
  estado está el proyecto —para eso está `estado-proyecto`—: ésta no dice cómo está
  la web, dice por dónde se entra.
---

# Por dónde se entra

Este repo tiene **37 puntos de entrada** (18 skills, 6 comandos, 6 subagentes, 7
reglas) y **1,6 MB de documentación**. Perderse no es un descuido: es lo que pasa
por defecto. Esta skill existe para gastar 30 segundos en decidir el camino en vez
de veinte minutos en encontrarlo.

**Salida obligatoria antes de tocar nada.** Responde estas cinco, en una línea cada
una, y ponlas en el chat:

```
zona     · qué parte del producto se toca
regla    · la de .claude/rules/ que entrará sola (o «ninguna»)
skill    · la que manda en esta petición (o «ninguna»)
leo      · los 2-4 documentos concretos, con su sección
puerta   · el verificador que decide si esto está bien
```

Si no sabes rellenar una, ese es el trabajo previo. No empieces a editar «para ir
viendo»: en este repo eso termina en un módulo duplicado (ya pasó: hay ~1.770
líneas de backend terminado y sin pantalla, hueco G-14).

---

## 1 · Enrutado

Busca la petición por lo que **dice el usuario**, no por el fichero que imaginas.

| Te piden… | Zona | Skill que manda | Puerta |
|---|---|---|---|
| «este número está mal», dudas de un cálculo | cálculo backend | `auditar-formulas` | `pytest tests/ -q` |
| revisar / rehacer / añadir una calculadora | calculadora | `auditar-herramienta` | `/verify` |
| «se ve mal», rediseñar, color, tipografía, layout | visual | `identidad-visual` | `/capturas` |
| «parece hecho por una IA», página incoherente | visual | `consistencia-diseno` | `/capturas` |
| animación, hover, «se siente muerto», sonido | visual | `microinteracciones` | `/capturas` |
| algo en 3D, WebGL, superficie de volatilidad | visual | `3d-webgl` | `rendimiento-web` |
| «carga lento», «pesa mucho» — **medir** | frontend | `rendimiento-web` | `npm run build` |
| «está desordenado», partir ficheros — **arreglar** | frontend | `reorganizar-frontend` | `npm run build` |
| no sale en Google, meta, sitemap, hreflang | SEO | `mejorar-seo` | `node scripts/check-seo.js` |
| prerender, JSON-LD, canonical, noindex | SEO | `auditar-seo-spa` | `node scripts/check-seo.js` |
| auditoría SEO completa sin gastar contexto | SEO | subagente `auditor-seo` | — |
| «¿por qué está así?», «¿ya se decidió esto?» | — | subagente `buscador-doc` | — |
| traducciones, idioma, claves crudas | i18n | `revisar-contenido-trading` | `node scripts/i18n-check.js` |
| contenido de la academia, glosario, exactitud | contenido | `revisar-contenido-trading` | subagente `revisor-i18n-contenido` |
| login, JWT, 2FA, pagos, webhooks, admin | seguridad | `/seguridad-pagos` ⌨️ | subagente `revisor-seguridad` |
| precios, muro de pago, alta, «no convierte» | negocio | `conversion-y-precio` | `python scripts/check-precios.py` |
| opciones, griegas, cadena, GEX | opciones | `auditar-formulas` | `pytest tests/ -q` |
| escáner, BOS/CHoCH, estructura de precio | escáner | `auditar-herramienta` | `pytest tests/ -q` |
| «¿qué falta?», «¿por dónde sigo?» | — | `estado-proyecto` | — |
| cerrar un hueco `G-xx` concreto | — | `cerrar-hueco` | la que diga el hueco |
| «¿seguro que funciona?», dudar de un verde | — | `no-me-fio` | — |
| probarlo de verdad, con backend vivo y navegador | — | `qa` | — |
| antes de desplegar | — | `/pre-deploy` | `/examen-web` |
| examen completo de la web | — | `/examen-web` | — |

⌨️ `seguridad-pagos` no se activa sola: hay que escribir `/seguridad-pagos`.

### Delegar para no gastar contexto

Seis subagentes trabajan **en su propio contexto** y devuelven sólo el veredicto. Lo
que se comen ellos —miles de líneas de `pytest`, 1.630 páginas de HTML, 1,6 MB de
documentación— no entra en esta conversación. Delega siempre que la tarea produzca
mucha salida y poca conclusión:

| Delega en… | Cuando la respuesta cuesta leer |
|---|---|
| `buscador-doc` | la documentación: 53 ficheros, 5.649 líneas sólo el registro |
| `auditor-formulas` | los tests matemáticos del backend |
| `auditor-seo` | las 1.630 páginas prerenderizadas |
| `revisor-seguridad` | auth, pagos, webhooks y admin |
| `revisor-i18n-contenido` | la paridad de los 10 idiomas |
| `crawler-visual` | las capturas de las pantallas |

No delegues lo que ya sabes hacer en dos comandos: un subagente arranca en frío y
vuelve a deducir el contexto que tú ya tienes. La regla es **mucha salida, poca
conclusión**; si es al revés, hazlo aquí.

**Las reglas de `.claude/rules/` no se invocan.** Entran solas al abrir un fichero
de su zona, y **no vuelven tras un `/compact`**. Si compactaste y sigues en la
misma zona, vuelve a abrir un fichero de ella antes de fiarte de lo que recuerdas.

---

## 2 · Qué leer, y sobre todo qué no

El error caro aquí no es leer poco: es leer 300 KB y llegar sin contexto útil.

**Lee, casi siempre:**

| Documento | Cuándo | Coste |
|---|---|---|
| `docs/ESTADO_PROYECTO.md` §1–§6 | al retomar, o si hay que saber qué falta | 412 líneas |
| `docs/MAPA.md` | para saber **dónde** está algo. Generado, nunca miente | ~500 |
| `docs/RUTAS_MUERTAS.md` | **antes de escribir un módulo nuevo** | 130 |
| `docs/DECISIONES.md` | antes de «arreglar» algo raro: puede estar así a propósito | 300 |
| `docs/DIARIO_BUGS.md` | ante un bug: busca si ya se pagó una vez | grep |

**No leas enteros, nunca — se buscan con `grep`:**

- `docs/REGISTRO_SESIONES.md` (5.601 líneas) — historia. `grep -n "^#\{2,3\} 2026-08"`
- `docs/DETALLE_TECNICAS_IMPLEMENTACION.md` (1.411) y las `AUDITORIA_*.md` y
  `EXAMEN_*.md` — fotos fechadas. Valen para saber **por qué** algo acabó así, no
  para saber cómo está hoy.
- Todo `_archive/` — código retirado. **No se importa ni se cita.**

Si un documento con fecha en el nombre contradice al código, **manda el código**, y
la contradicción se anota. Es un retrato de un día, no el estado.

---

## 3 · Cambiar sin romper nada

Lo que el usuario llama «sin perjudicar a nadie ni a nada» son, en concreto, seis
cosas. Las tres primeras están fijadas por tests y ya costaron bugs:

1. **Nada inventado sin etiquetar.** Cadena modelada → `synthetic: true`, y su
   volumen e interés abierto van a `None`: son observaciones, no salida de un modelo.
2. **Lo que no se puede calcular es `None`, no `0`.** Un R sin stop es indefinido;
   como cero arrastra la media y falsea la distribución.
3. **Lo sensible al orden se ordena.** Equity, drawdown y rachas sobre
   `sort_trades_chronologically()`: el drawdown no es simétrico si inviertes el orden.
4. **El apalancamiento NO entra en el P&L.** `multiplier` es tamaño de contrato, no
   palanca. Confundirlos multiplica el resultado por veinte.
5. **La BD sólo por el shim** (`db.coleccion.metodo(...)`). Nunca SQL directo.
6. **Lo generado no se edita a mano**: `instrumentSpecs.generated.js`, `docs/MAPA.md`
   y `.claude/ARQUITECTURA_ASISTENTE.md` salen de un script y CI falla si divergen.

Y antes de crear cualquier cosa: **comprueba si ya existe.** `docs/MAPA.md` y
`docs/RUTAS_MUERTAS.md` listan backends enteros terminados esperando interfaz
(`backtest.py`, `portfolio_risk.py`, `american_options.py`, `market_data.py`).
Construir el segundo es más caro que buscar el primero.

---

## 4 · Cerrar

Un cambio no está hecho porque compile. Está hecho cuando **su puerta** lo dice.

```bash
/verify          # la red de seguridad offline: compila, tests, eslint, i18n, catálogo, mapa
```

Si tocaste un verificador, además: `bash scripts/probar-verificadores.sh`.
Sabotea cada comprobación a propósito y exige que falle. Es ley del repo porque ya
aparecieron verificadores que no verificaban nada y **pasaban**: ejecutarlos y ver
que salían en verde no los habría cazado.

Si tocaste el cableado del asistente (skills, comandos, subagentes, reglas):
`python scripts/gen-asistente.py`.

Si tocaste SEO, `useSEO.js` o `gen-seo-pages.js`: `cd frontend && npm run build &&
node scripts/check-seo.js` — las 1.630 páginas prerenderizadas son el mayor activo
de captación y sus fallos son invisibles: un canonical cruzado no rompe ninguna
pantalla, sólo hace que Google deje de indexar.

**Al terminar, deja rastro** — es lo que evita que la próxima sesión repita el
trabajo: entrada con fecha en `docs/REGISTRO_SESIONES.md`, semáforo e inventario de
`ESTADO_PROYECTO.md` §1–§2 si cambiaron, y `docs/DIARIO_BUGS.md` si era un bug.
El comando `/cerrar-sesion` recorre el ritual entero.

**No digas «funciona» de lo que no has ejecutado.** Este sandbox **no tiene salida a
internet**: ni Yahoo Finance ni los proveedores de precio, pero tampoco Google,
Search Console ni el sitio publicado. Cualquier afirmación sobre indexación real o
posiciones es inventada — eso lo comprueba `.github/workflows/seo-en-vivo.yml`, que
sí corre con red. Aquí, mockea o usa fixtures. Ante un verde que decide algo
importante, `no-me-fio`.
