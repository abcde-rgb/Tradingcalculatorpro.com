# 🌿 Cierre de G-32 — qué se hizo con cada rama sin fusionar

> 📅 **Fecha:** 2026-08-18 · **Encargo:** clasificar las 16 ramas de producto con
> trabajo fuera de `main` y ejecutar la clasificación.
>
> Documentos hermanos: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) (estado vivo) ·
> [`AUDITORIA_REPOSITORIO_2026-08-13.md`](./AUDITORIA_REPOSITORIO_2026-08-13.md) §2
> (el inventario del que sale esta lista) · [`DECISIONES.md`](./DECISIONES.md).

---

## 0. Por qué existe este documento

Una rama sin fusionar no es trabajo guardado: es trabajo que **caduca**. Cada día que
`main` avanza, el coste de traerla sube y el valor de lo que trae baja, hasta que fusionarla
es más arriesgado que reescribirla. Diecisiete ramas acumuladas significan diecisiete
decisiones que nadie tomó, y el inventario no se cierra dejándolas ahí: se cierra
decidiendo cada una y **dejando escrito por qué**, con el SHA delante, para que nadie
tenga que volver a averiguarlo.

**Ninguna rama se ha borrado.** Todas las referencias siguen en `origin`, y cada fila
lleva su SHA: lo que se cierra es la *decisión*, no el historial. Borrar los `refs`
requiere empujar a ramas que esta sesión no tiene permiso para tocar — los comandos
están en la §5, para quien quiera ejecutarlos.

---

## 1. Fusionadas (6)

| Rama | SHA | Qué aportó |
|---|---|---|
| `claude/acceso-comp` | `6bee723` | Cuentas de cortesía: premium sin pagar, para prensa y pruebas |
| `claude/escaneres-datos-honestos` | `fea4fe5` | El escáner dice contra qué precio reparte. **Parcial**: el backend ya es honesto, la UI todavía no pinta las etiquetas |
| `claude/project-complete-audit-a6qg1c` | `4d46cd4` | Las dos auditorías, el estudio de pasarelas de broker y los datos de la entidad legal. **Sólo la documentación**: el código de `main` se conservó entero |
| `claude/competitive-feature-analysis-8mzm3p` | `71bd849` | País e idioma del usuario. **Sólo eso**: se preservaron el motor del simulador de `main` y el bloqueo de seguridad del acceso con Google. `PUT /auth/profile` se recuperó aparte, y cierra media G-26 |
| `claude/opciones-vanna-charm-metricas` | `b6668e3` | SQN, Calmar, Ulcer, z-score, VaR y CVaR en `performance_metrics.py`; vanna y charm; el panel de posicionamiento de dealers |
| `claude/trading-web-full-audit-xmcxz9` | `cd2d367` | **Entró sola.** Ver §3 |

## 2. Rehecha, no fusionada (1)

| Rama | SHA | Qué se hizo |
|---|---|---|
| `claude/tradingcalculator-audit-docs-hjqdsi` | `c9b69b5` | Ver §3 |

## 3. Dos correcciones a la tabla que se entregó

La clasificación se entregó antes de ejecutarla, y ejecutarla desmintió dos filas. Van
aquí porque una tabla que se corrige a sí misma sirve más que una que se defiende.

**`claude/trading-web-full-audit-xmcxz9` no había que rehacerla: ya estaba dentro.**
Se clasificó como «rehacer, superconjunto de la rama de vanna». Era al revés — es su
*antecesor*: `cd2d367` es alcanzable desde la punta de `opciones-vanna-charm-metricas`,
así que fusionar vanna la trajo entera. Hoy está a 0 commits de `main` y no queda nada
que rehacer. El error vino de comparar tamaños de diff en vez de preguntar por la
ascendencia (`git merge-base --is-ancestor`), que es la pregunta que de verdad
respondía.

**`claude/tradingcalculator-audit-docs-hjqdsi` era mayormente fusionable.** Se clasificó
como «rehacer» con un motivo cierto pero incompleto: su parche de `gen-mapa.py` ya no
aplica, porque el detector de rutas se reescribió entero el 2026-08-17. Cierto — y sólo
afectaba a **un** fichero. Los otros ocho eran ficheros **nuevos** que no chocaban con
nada, y descartarlos por el conflicto de un vecino habría tirado lo más valioso que
traía la rama: `scripts/probar-verificadores.sh`, que sabotea cada verificador y exige
que falle.

Rehecha sobre `main`, no aplicada como parche:

- Los ocho ficheros nuevos entran tal cual (`auditar.py`, `capturas.js`,
  `preparar-entorno.sh`, `probar-verificadores.sh`, `DECISIONES.md` y tres comandos).
- El determinismo de `gen-mapa.py` se **reimplantó** sobre el detector nuevo. `rutas()`
  ordenaba por `(path, metodo)`, que empata cuando dos ficheros declaran el mismo par, y
  el desempate lo decidía `glob()` — que no ordena igual en un portátil que en el runner.
- `probar-verificadores.sh` pasó de 8 comprobaciones a 15: las suyas más las de los
  verificadores que no existían cuando se escribió.

## 4. Cerradas sin fusionar (4)

Verificadas una a una hoy, no heredadas del inventario.

| Rama | SHA | Por qué no entra |
|---|---|---|
| `revert-177-claude/trading-journal-multiproduct-ytk889` | `de53ad7` | Revierte 7.517 líneas del multiproducto, que es el suelo sobre el que hoy se apoyan el diario, la mesa y las catorce calculadoras. Entre lo que borra está `scripts/gen-instruments-js.py`, hoy una puerta de CI. Fusionarla no retiraría una función: retiraría los cimientos |
| `web-analysis` | `d21aa02` | **Sin ancestro común con `main`** (`git merge-base` no devuelve nada): 295 commits colgando de una raíz paralela. No es una rama que divergió, es otro repositorio con el mismo nombre |
| `claude/trading-web-analysis-ktsvkd` | `385f850` | Contenida por completo en `claude/temas-contraste-wcag`. Se decida lo que se decida sobre aquélla, ésta no aporta un solo commit propio |
| `claude/web-redesign-calculator-analysis-cz5tvc` | `5b5e6cc` | Dos estudios fechados del 2026-08-02, sin una línea de código. Su mitad de diario la sustituye `ROADMAP_JOURNAL_OPCIONES.md`, que llegó con la rama de vanna y trae la misma investigación puesta al día. Su §6.5 —«qué pieza del diario vive en qué rama»— la deja obsoleta precisamente este documento |

> **Nota sobre la última.** Es la única de las cuatro que no cierra por riesgo sino por
> redundancia: son 1.128 líneas de documentación, y conservarlas no costaba nada. Si
> alguna vez se echa de menos, sale entera con
> `git show 5b5e6cc:docs/REDISENO_PARIDAD_2026-08-02.md`. La decisión fue no traerla; el
> dato de que era barata traerla queda aquí para que se pueda revisar.

## 5. Pendientes de decidir (5)

Ninguna se ha tocado. Tres estaban marcadas desde el principio como decisión del dueño;
dos siguen en «rehacer» y no se han rehecho porque lo que hacen excede lo técnico.

| Rama | SHA | Qué trae | Por qué no la decide esta sesión |
|---|---|---|---|
| `claude/affiliate-payment-system-nda23v` | `799862b` | Borra el despliegue entero: `deploy-cloud-run.yml`, `cloudbuild.yaml`, `setup-gcp.sh/.ps1` y `GOOGLE_CLOUD_SETUP.md` — 996 líneas — para migrar a una cuenta GCP nueva | No es un rehacer técnico: es decidir si la migración de cuenta se hace. Su primer commit (correos con acceso libre) **ya está en `main`** vía `acceso-comp` |
| `claude/lucide-v1-linkedin` | `08d4231` | `lucide-react` 0.507 → 1.27, con el icono de LinkedIn a mano | Salto de versión mayor sobre una librería que usa toda la interfaz. Además quita `gen-ads-txt.js` del `postbuild`, que es un cambio distinto colado en el mismo commit |
| `claude/temas-contraste-wcag` | `66d1512` | Contraste WCAG en los temas | Decisión de diseño |
| `claude/trading-setup-diary-analytics-pfd0gk` | `8cdf5ff` | 924 líneas nuevas de analítica de setups | Decisión de producto |
| `claude/restructure-org-scanner-f5a8i6` | `f52848f` | Reestructuración del escáner | Decisión de arquitectura |

**Para borrar los `refs` de las cuatro cerradas** (requiere permiso de empuje sobre esas
ramas, que esta sesión no tiene):

```bash
git push origin --delete revert-177-claude/trading-journal-multiproduct-ytk889
git push origin --delete web-analysis
git push origin --delete claude/trading-web-analysis-ktsvkd
git push origin --delete claude/web-redesign-calculator-analysis-cz5tvc
```

---

## 6. Cómo queda el inventario

De las diecisiete ramas de producto con trabajo fuera de `main`, **veinte referencias
están hoy a 0 commits de `main`** (las seis fusionadas más las que ya estaban contenidas
sin que el inventario lo hubiera comprobado). Quedan cinco por decidir y cuatro cerradas
cuyo `ref` sigue existiendo.

`claude/tradingcalculator-audit-docs-hjqdsi` seguirá apareciendo como «4 commits sin
fusionar» en `auditar.py` y en el aviso de arranque, y es correcto: su **contenido** está
en `main`, sus **commits** no. Rehacer y fusionar no son lo mismo, y la herramienta cuenta
commits porque es lo único que puede contar sin equivocarse.

Una advertencia que vale para la próxima vez: `git merge-tree` informó de **cero
conflictos en las dieciséis ramas**, y era falso — al intentar las fusiones de verdad,
las dieciséis conflictaban. No se puede clasificar por lo que diga `merge-tree`; hay que
intentar la fusión.
