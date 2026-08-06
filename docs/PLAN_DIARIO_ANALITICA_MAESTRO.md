# El plan, el diario y la analítica — estudio a fondo y plan maestro

**Fecha:** 2026-08-06 · **Commit de referencia:** `5b5872b` · **Alcance:** `backend/performance.py`,
`backend/trading_plan.py`, `frontend/src/components/performance/*`, `frontend/src/lib/tradingSystem.js`,
`frontend/src/lib/projection.js`, `frontend/src/pages/PerformancePage.jsx`

> Este documento no propone «añadir features». Propone **cerrar una fractura** que ya existe en el
> código y que, mientras siga abierta, hace que cada cosa nueva que se construya encima esté torcida.
> Todo lo que se afirma aquí está verificado contra el código en el commit de referencia; donde hay
> una cifra, hay un fichero y una línea detrás.

---

## 0. Resumen en una página

**Lo que hay es mejor de lo que parece, y peor de lo que podría ser.**

El backend de este proyecto tiene un motor de diario y analítica que está por encima de la media del
sector: 25+ métricas con guardas de muestra, MAE/MFE con ratio de captura, Sharpe/Sortino anualizados
sólo cuando la muestra lo sostiene, sesgos de comportamiento, y —lo importante— **un plan de trading
versionado que es la fuente de verdad de los umbrales de riesgo**, con informe de cumplimiento
valorado en dinero y matriz proceso × resultado.

Ese plan **no tiene ni una sola pantalla**. `grep` en `frontend/src` sobre `/plan`: cero llamadas.
558 líneas de modelo, cinco endpoints, tests en verde, y el usuario no puede llegar. Es el hueco G-14
de [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md), y es el eje de todo este documento.

La consecuencia no es «falta una pantalla». Es que **hay dos sistemas de reglas viviendo en paralelo
sin saber el uno del otro**:

| | Reglas del navegador | Reglas del servidor |
|---|---|---|
| Dónde viven | `localStorage['tcp-trading-system']` | Colección `trading_plans` |
| Quién las escribe | `SetupBuilder.jsx` | Nadie (no hay interfaz) |
| Quién las lee | `TradeFormModal` (aviso en vivo), `SetupPerformance`, `ProjectionPanel` | `detect_errors`, `compliance_report`, sello `plan_version` |
| Sobreviven a… | nada: cambiar de navegador las borra | siempre; versionadas y auditables |
| Salen en el export RGPD | no | **tampoco** (G-15, sigue abierto) |

El usuario ve un aviso de «R:R mínimo 2» que sale de su navegador, y el servidor le apunta un error
`low_rr` calculado contra 1,5 porque nunca ha podido escribir un plan. **Dos jueces distintos para la
misma operación.**

Y una segunda cosa, más barata todavía de arreglar: `GET /api/performance/analytics` ya devuelve
`compliance` y `plan` en su respuesta (`server.py:6795-6799`). `AnalyticsDashboard.jsx` lee
`data.analytics` y `data.insights`, y **tira el resto a la basura**. La matriz 2×2 y el coste por
regla —la pieza más diferencial de todo el producto— se calculan en cada petición y no se pintan.

**La tesis competitiva**, en una frase: no vamos a ganar a TradeZella en número de informes (tienen
300) ni en importadores de bróker (tienen 500). Vamos a ser **el único diario del mercado donde el
plan escrito es código ejecutable que juzga, valora en dinero y versiona tu operativa** — y en diez
idiomas, a un tercio del precio.

Los doce movimientos del §4 están ordenados por *valor entregado ÷ líneas escritas*. Los tres
primeros ya tienen el backend hecho.

---

## 1. Inventario verificado

### 1.1 Backend — lo que ya está construido

| Fichero | Líneas | Qué resuelve | ¿Llega al usuario? |
|---|---|---|---|
| `performance.py` | 1319 | PnL, R, MAE/MFE, 25+ métricas, 11 reglas de error, 4 sesgos, insights, agrupaciones | Parcialmente |
| `trading_plan.py` | 558 | Plan versionado, activación/archivado, enfriamiento, informe de cumplimiento | **No. Cero.** |
| `portfolio_risk.py` | 290 | Calor abierto, correlación, límites con bloqueo, sizing por ATR | **No** |
| `backtest.py` | 642 | In-sample/out-of-sample, walk-forward, corrección por data snooping | **No** |
| `american_options.py` | 282 | Binomial CRR, BAW, asignación temprana | **No** |

Endpoints existentes y quién los llama desde el frontend:

```
POST   /api/performance/trades          → TradeFormModal            ✅
POST   /api/performance/trades/bulk     → TradeImportWizard         ✅
GET    /api/performance/trades          → TradeJournal              ✅
PUT    /api/performance/trades/{id}     → TradeFormModal            ✅
DELETE /api/performance/trades/{id}     → TradeJournal              ✅
GET    /api/performance/analytics       → 3 componentes             ✅ (parcialmente consumido)
POST   /api/performance/portfolio-risk  → nadie                     ❌
GET    /api/plan                        → nadie                     ❌
GET    /api/plan/history                → nadie                     ❌
POST   /api/plan                        → nadie                     ❌
PATCH  /api/plan/draft                  → nadie                     ❌
GET    /api/plan/compliance             → nadie                     ❌
```

**Lo que ya hace bien el motor** (y que no hay que tocar, sólo enseñar):

- `sort_trades_chronologically` ordena por `exit_date` antes de todo lo sensible al orden. El
  drawdown no es simétrico bajo inversión, y esto está fijado por tests.
- `r_multiple` es `None` sin stop, no 0. `sortino_ratio` es `None` sin pérdidas. `capture_ratio` es
  `None` sin muestra. La regla «lo que no se puede calcular es `None`» está aplicada con disciplina.
- `_periods_per_year` se niega a anualizar por debajo de 10 operaciones o 7 días, y tapa el ritmo en
  2520 op/año para que una semana de scalping no convierta un Sharpe de 0,05 en un 5,5.
- `suggested_stop_r` no sale por debajo de `MIN_WINNERS_FOR_STOP_ADVICE = 10` ganadoras, **en el
  origen**, no en el consumidor.
- `_group_winrate_by_multi`: una operación con dos setups cuenta en los dos grupos, y la respuesta
  publica `setups_multi_tagged` para poder decirlo en pantalla.
- `returns_by_period` compone, no suma: +10 % y −10 % es −1 %, y cada mes se mide sobre el saldo con
  el que empezó ese mes.
- `detect_errors` con plan activo levanta cinco reglas que sin plan no se pueden ni expresar
  (`outside_session`, `over_daily_limit`, `over_trade_count`,
  `traded_after_consecutive_losses`, `unlisted_market`) y adjunta el `threshold` y el `plan_version`
  que la juzgó.

Ese último punto es la clave de todo: **el motor ya sabe operar con plan. Falta que exista un plan.**

### 1.2 Frontend — lo que ve el usuario

`/performance`, cinco pestañas (`PerformancePage.jsx:135-224`):

| Pestaña | Componente | Líneas | Estado real |
|---|---|---|---|
| Overview | inline | ~220 | Página de marketing. Es lo primero que ve un anónimo |
| Diario | `TradeJournal.jsx` | 340 | Tabla plana. Sin ordenación, sin filtro de fechas, sin detalle |
| Analítica | `AnalyticsDashboard.jsx` | 635 | 8 KPI, curva, calendario, MAE/MFE, R, sesgos, insights |
| Setups | `SetupPerformance` + `SetupBuilder` | 266 + 586 | Cruce librería × diario. Todo en `localStorage` |
| Proyección | `ProjectionPanel.jsx` | 645 | Monte Carlo sobre la operativa real. Bien hecho |

**Campos del modelo que el frontend no usa en absoluto:**

- `screenshot_urls` — existe en `make_trade_doc`, en `TradeIn`, se persiste… y ningún componente lo
  escribe ni lo lee. Un diario sin captura de pantalla es media herramienta.
- `tags` — igual: modelado, aceptado por la API, invisible.
- `fees` — se captura en el formulario y se descuenta del PnL, pero **no se agrega ni se muestra en
  ningún sitio**. El usuario no puede responder «¿cuánto me han costado las comisiones este año?».
- `notes` y `emotion` — se guardan, y la tabla del diario no los enseña. La emoción sólo aparece
  promediada en `avg_emotion`, que tampoco se pinta.

### 1.3 El mapa de las dos fuentes de verdad

```
        ┌──────────────────────── NAVEGADOR ────────────────────────┐
        │  localStorage['tcp-trading-system']                       │
        │    setups[] · systemRules{} · reglas de caja              │
        │       ↑ escribe            ↓ leen                         │
        │   SetupBuilder      TradeFormModal (aviso en vivo)        │
        │                     SetupPerformance                      │
        │                     ProjectionPanel (caja)                │
        └───────────────────────────┬───────────────────────────────┘
                                    ╎
                            NO SE HABLAN
                                    ╎
        ┌───────────────────────────┴───────────────────────────────┐
        │  PostgreSQL · trading_plans                               │
        │    risk{} · sessions[] · management{} · review{}          │
        │       ↑ escribe: NADIE      ↓ leen                        │
        │                      detect_errors  (11 reglas)           │
        │                      compliance_report (matriz 2×2)       │
        │                      sello plan_version en cada operación │
        └───────────────────────────────────────────────────────────┘
```

Ese hueco en el centro es el documento entero.

---

## 2. Diagnóstico: cuatro fracturas

### F-1 · Dos sistemas de reglas paralelos (raíz de todo)

`TradeFormModal.jsx:122` calcula sus avisos con `setupRulesFor(loadSystem(), setups)` —el navegador—.
`server.py:6421` juzga la misma operación con `detect_errors(..., plan=plan)` —el servidor—. Un
usuario con «R:R mínimo 2» escrito en su setup ve el aviso rojo del navegador y recibe del servidor
un error calculado contra 1,5, porque `DEFAULT_MIN_RR` es el respaldo de quien no tiene plan y **nadie
puede tener plan**.

Consecuencias medibles, no teóricas:

1. `rule_compliance_rate` —un KPI en portada del panel— mide el cumplimiento de la opinión de la app,
   no del plan del usuario. Un scalper deliberado de 1:1 al 65 % de acierto recoge `low_rr` en todas
   sus operaciones y aprende a ignorar la lista de errores entera.
2. `plan_version` se sella en la creación de cada operación (`server.py:6419`) y siempre vale `None`,
   porque nunca hay plan activo. La inmutabilidad histórica que el modelo protege con tanto cuidado
   protege el vacío.
3. Los setups del usuario —el corazón de su sistema— viven en `localStorage`. Cambia de navegador y
   los pierde. No están en la copia de seguridad. No están en el export RGPD.

### F-2 · El backend publica cumplimiento y la pantalla lo tira

`server.py:6795-6799` devuelve en cada `/performance/analytics`:

```python
"plan": {"version": ..., "name": ...} if plan else None,
"compliance": compliance_report(enriched, plan) if plan else None,
```

`AnalyticsDashboard.jsx:279-280` lee `data.analytics` y `data.insights`. `data.compliance` y
`data.plan` no aparecen en el fichero. Se calcula el informe completo —matriz 2×2, coste por regla
ordenado por dinero, `ready_for_review`, `next_review_due`— en cada petición, y se descarta.

Es trabajo ya pagado, ya probado, a cero coste de backend. Es el movimiento con mejor relación
valor/línea de todo el documento (M-4).

### F-3 · El diario es una tabla, no un instrumento

`TradeJournal.jsx` renderiza `visible.map(...)` sobre las 200 primeras operaciones ordenadas por
`entry_date desc`, y ya. No hay:

- ordenación por ninguna columna (¿cuál fue mi peor operación? → a ojo)
- rango de fechas (¿cómo fue julio? → el calendario de la otra pestaña, sin poder saltar al detalle)
- filtro por símbolo, lado, estado, R, error o etiqueta
- vista de detalle: las notas, la emoción, la captura y los errores completos de UNA operación
- paginación real por encima de 200 filas
- diseño móvil: la tabla de 11 columnas se desborda en horizontal

Lo que sí hay y está bien: el aviso de calidad del dato (`journal-quality`), que dice cuántas
operaciones cerradas no tienen stop ni saldo, porque esas no cuentan para R ni para el porcentaje.
Ese aviso es exactamente el tipo de honestidad que hay que extender, no recortar.

### F-4 · La analítica termina en sí misma

El diario mide, y lo medido no gobierna nada. Concretamente:

- El plan declara `review.cadence` y el backend calcula `next_review_due` y `ready_for_review`.
  Nada lo enseña. **No existe el ritual de revisión**, que es el único momento en el que un diario
  cambia el comportamiento de alguien.
- El plan declara `max_daily_loss_r` y `max_trades_per_day`. Se evalúan *a posteriori*, cuando la
  operación ya está guardada. Un límite diario que sólo te avisa al día siguiente no es un límite.
- `PreTradeProtocol.jsx` (303 líneas) calcula límites de circuito y no los guarda en ninguna parte.
  La checklist previa existe y no queda registro de si se cumplió.
- `portfolio_risk.py` sabe calcular el calor abierto de la cuenta y nadie se lo pregunta.

---

## 3. Benchmark honesto

Contrastado con [`ANALISIS_COMPETENCIA_2026-07-19.md`](./ANALISIS_COMPETENCIA_2026-07-19.md) y
revisado para este documento.

### Lo que no vamos a ganar, y hay que dejar de intentarlo

| Frente | Quién gana | Por qué es inalcanzable |
|---|---|---|
| Importación automática | TradeZella (500+), TraderSync (700+) | Cada bróker es un contrato de mantenimiento. A 17 €/mes no salen las cuentas |
| Nº de informes | TradeZella (300+) | Un número de vanidad; 300 informes es un buscador, no una lectura |
| Flow de opciones en vivo | OptionStrat (99 $/mes) | Es el coste del dato, no el del software |
| Autoridad SEO | BabyPips | Quince años de dominio. Se compite por el lado largo, no de frente |

### Lo que ya ganamos y no se está contando

| Frente | Estado |
|---|---|
| Detección de sesgos de comportamiento | 4 sesgos con causa y coste. Edgewonk cobra 197 $/año por menos |
| MAE/MFE con ratio de captura y stop sugerido | Con suelo de muestra en el origen. TradeZella lo pinta sin guarda |
| Proyección Monte Carlo sobre la operativa real | Con etiqueta medido/supuesto por variable. Nadie hace esto |
| Diez idiomas con paridad total (5817 claves) | El mercado hispano, alemán, ruso, japonés y árabe está prácticamente vacío |
| Diario → calculadoras (edge en vivo → RoR/Kelly) | El bucle cerrado que ningún journal tiene |

### Lo que nadie hace y está a tres pantallas de distancia

Éste es el foso. Los cinco puntos siguientes **no existen en ningún competidor revisado**:

1. **El plan como objeto versionado que gobierna la app.** TradeZella tiene *playbooks*: plantillas
   descriptivas. Nadie versiona el plan, exige un motivo de cambio desde la v2, sella cada operación
   con la versión que la juzgó ni impide que un cambio de reglas reescriba retroactivamente la
   historia que esas reglas debían medir. Nosotros ya lo tenemos escrito.
2. **Cumplimiento valorado en dinero.** «Has incumplido 6 veces» invita a encogerse de hombros.
   «Incumplir esta regla te ha costado 412 €» no. `by_rule` ya sale ordenado por coste, no por
   frecuencia.
3. **La matriz proceso × resultado.** Separar «seguí el plan y perdí» (coste del negocio) de «rompí
   el plan y gané» (la casilla que arruina cuentas). Ya calculada, sin pintar.
4. **Retro-simulación de reglas.** Cambiar un umbral del plan y ver, en el mismo instante, qué le
   habría hecho a tu historial real. Es un `detect_errors` sobre tus propias operaciones. Nadie lo
   ofrece, y para nosotros es un endpoint de veinte líneas porque la función ya es pura.
5. **El ritual de revisión con muestra mínima.** El plan declara cuánta evidencia quiere antes de
   ser rejuzgado; hasta ahí no se toca. Es la diferencia entre un plan que se versiona y un plan que
   se erosiona.

**La frase de posicionamiento**: *el único diario donde tu plan escrito es código ejecutable que
juzga, valora en dinero y versiona tu operativa.*

---

## 4. El plan maestro — doce movimientos

Ordenados por valor entregado ÷ esfuerzo. Cada uno lleva su criterio de aceptación.

### BLOQUE A · Cerrar la fractura (sin esto, lo demás está torcido)

---

#### M-1 · El plan sale a pantalla, y es un backtest de tus propias reglas

**Cierra:** G-14, F-1 · **Backend:** hecho, salvo un endpoint nuevo · **Frontend:** nuevo

Asistente de cinco pasos, `frontend/src/components/plan/TradingPlanEditor.jsx`, siguiendo las cinco
secciones del modelo: identidad, setup, riesgo, gestión, revisión.

Pero **un formulario de cinco pasos no es la feature**. La feature es que cada paso muestre, en vivo,
**qué le habría hecho esa regla a tu historial real**:

```
  Riesgo máximo por operación   [ 1,0 ] %
  ────────────────────────────────────────────────────────────
  Con esta regla, 27 de tus 143 operaciones habrían sido
  infracciones. Esas 27 suman −1.842 €.
  Con 2,0 % serían 6 operaciones y −310 €.
```

Eso convierte el editor del plan en el único sitio del mercado donde escribir una regla es una
decisión informada en vez de un número copiado de un curso. Y es barato: `detect_errors` es una
función pura sobre dicts.

**Endpoint nuevo** (lo único de backend que falta en este movimiento):

```
POST /api/plan/simulate
  body:  { ...mismo shape que PlanIn }
  200:   { "trades_evaluated": 143,
           "by_rule": [{"code": "oversize", "count": 27, "pnl_impact": -1842.0,
                        "threshold": "1.0"}],
           "compliance_rate": 81.1,
           "adherence_vs_result": {...},
           "vs_active": { "compliance_rate_delta": -12.4, ... } }
```

Reutiliza `_enrich_trade` + `compliance_report` con un plan candidato **no persistido**. Cero
escritura, cero efectos secundarios. `require_premium`, como el resto.

**Honestidad obligatoria en esta pantalla** (si no, es un simulador de fantasías):

- La retro-simulación describe **las operaciones que tomaste**, no las que habrías tomado con otras
  reglas. Un límite diario más estricto no sólo marca infracciones: habría impedido operaciones
  posteriores que sí existieron. La etiqueta correcta es *«de las operaciones que registraste,
  cuántas habrían incumplido»*, nunca *«cuánto habrías ganado»*.
- Por debajo de 30 operaciones cerradas, el bloque sale con aviso de muestra y sin conclusión.
- Un umbral no declarado es `None` (regla callada), jamás 0. Ya está así en `_normalize_risk`.

**Criterios de aceptación**
1. Un usuario sin plan puede crear la v1 sin `change_reason`; desde la v2 el 422 es visible y
   explicado, no un toast genérico.
2. Activar v2 archiva v1 y las operaciones antiguas conservan `plan_version: 1`.
3. El aviso de enfriamiento se pinta como aviso, nunca bloquea (`cooldown_notice`).
4. Cada paso enlaza al módulo del temario que lo explica; no se reexplica nada.
5. Paridad de las 10 traducciones, cero cadenas incrustadas en el `.jsx`.

---

#### M-2 · Los setups suben al servidor y las dos reglas se funden en una

**Cierra:** F-1 · **Toca:** `trading_plan.py`, `tradingSystem.js`, `SetupBuilder`, `TradeFormModal`

El plan gana una sección `setups[]` con la forma que ya tiene `EMPTY_SETUP` en `tradingSystem.js`
(nombre, tipo, marcos, disparador de entrada, invalidación, regla de stop, R:R, riesgo). El
constructor pasa a escribir en `PATCH /plan/draft`.

`localStorage` **no desaparece**: se queda como caché offline y como camino de migración. En el
primer arranque con plan en servidor, si hay un sistema local no vacío, se ofrece la migración
explícitamente («tienes 4 setups en este navegador, ¿los subo al plan v1?»). Migrar en silencio la
configuración de riesgo de alguien es exactamente lo que no se hace.

Y entonces —esto es el punto— `TradeFormModal` deja de calcular sus avisos con `setupRulesFor(...)`
sobre el navegador y los calcula contra el plan activo. **El aviso en vivo y el error del servidor
pasan a ser el mismo número.**

Regla que se conserva tal cual: con varios setups gana **el más estricto** de cada límite (el R:R más
alto, el riesgo más bajo). Y se conserva la distinción `source: 'setup' | 'default'`, porque
presentar un respaldo como si fuera decisión del usuario es lo que hace que un aviso se ignore.

**Criterio de aceptación**: definir un setup con «R:R mínimo 2» y guardar una operación de R:R 1,8
produce **un solo** aviso, con el mismo umbral, antes de guardar y después.

---

#### M-3 · `trading_plans` entra en las tres listas del RGPD

**Cierra:** G-15 · **Coste:** tres líneas y un test · **Riesgo de no hacerlo:** multa

Verificado en el commit de referencia: `trading_plans` está en `known` (`server.py:968`) y tiene
índice por `user_id` (`server.py:979`), pero **no** aparece en:

- `delete_account` → `server.py:2472-2476`. Borrar la cuenta deja los planes en la base de datos.
- `_USER_DATA_COLLECTIONS` → `server.py:1633`. La purga por retención no los toca.
- El export de `/auth/my-data` → `server.py:2514-2516`. El usuario no puede descargar su propio plan.

El arreglo son tres líneas. Lo que hay que añadir además es **el test que impide que vuelva a pasar
con la siguiente colección**: recorrer las tablas con `user_id` y exigir que cada una esté en las
tres listas. Listar tablas a mano es la trampa; el test es la salida.

---

### BLOQUE B · Enseñar la analítica que ya existe

---

#### M-4 · El bloque de cumplimiento — la matriz 2×2 y el precio de cada regla

**Cierra:** F-2 · **Backend:** cero · **Frontend:** un componente

`data.compliance` ya viene en la respuesta. Se pinta un bloque nuevo en `AnalyticsDashboard`, arriba,
justo después de rentabilidad por periodo:

```
  CUMPLIMIENTO DEL PLAN v3            47 operaciones bajo este plan · 82,9 %

  ┌─────────────────────┬──────────────────────┬──────────────────────┐
  │                     │      GANASTE         │      PERDISTE        │
  ├─────────────────────┼──────────────────────┼──────────────────────┤
  │  Seguiste el plan   │   21 ops  +1.840 €   │   18 ops   −910 €    │
  │                     │   Correcto. Repite   │  Coste del negocio   │
  ├─────────────────────┼──────────────────────┼──────────────────────┤
  │  Rompiste el plan   │  ⚠ 3 ops   +220 €    │    5 ops  −1.180 €   │
  │                     │  LA CASILLA CARA     │  Error, pero claro   │
  └─────────────────────┴──────────────────────┴──────────────────────┘
```

**Decisión de diseño que hay que respetar:** la casilla visualmente más ruidosa es
**romper-el-plan-y-ganar**, no la de perder. Es contraintuitivo y es el punto entero del bloque: el
mercado acaba de pagarte por saltarte tus reglas y lo vas a repetir. Ámbar con borde, no verde. La
casilla seguí-el-plan-y-perdí va en gris neutro con la etiqueta «coste previsto», nunca en rojo.

Debajo, el coste por regla, ordenado por dinero:

```
  no_sl          4 ops   −1.204 €  ██████████████████
  oversize       9 ops     −412 €  ██████
  low_rr         6 ops     −188 €  ███              (tu plan: 1,5)
```

**Reglas de honestidad**: `compliance_rate` es `None` sin operaciones bajo el plan, no 100 % — un
diario vacío no es un expediente limpio, y `compliance_report` ya lo devuelve así. La matriz se pinta
**siempre**, aunque la muestra sea fina, porque su forma es la lección; y `sample_warning` lo dice
en texto.

Sin plan activo, el bloque se sustituye por una invitación: *«tus operaciones se están juzgando con
los valores por defecto de la app, no con tus reglas»* → botón a M-1.

---

#### M-5 · Atribución del resultado: suerte, ejecución o sistema

**Backend:** una función nueva sobre piezas existentes · **Diferencial: alto**

Un trader pierde 800 € en un mes. Hay tres explicaciones con tres soluciones **opuestas**: mala suerte
dentro de lo esperado (no hacer nada), incumplimiento (corregir la ejecución), o el sistema no tiene
ventaja (abandonarlo). Hoy son indistinguibles. Con plan escrito, no.

Bloque nuevo que descompone el resultado del periodo:

```
  ¿DE DÓNDE SALE TU RESULTADO?          −812 € en 40 operaciones

  Ventaja del sistema (cumpliendo)     +341 €   esperanza 0,09R × 39 ops
  Coste de los incumplimientos        −1.180 €  5 operaciones
  Comisiones                             −94 €
  Varianza                              +121 €  dentro de lo esperado ✓
  ─────────────────────────────────────────────
                                        −812 €

  Con tu esperanza medida, 40 operaciones caen el 90 % de las veces
  entre −1.430 € y +2.110 €. Tu −812 € está DENTRO. Este mes no dice
  nada sobre tu sistema; los 1.180 € de incumplimientos sí.
```

La banda no se inventa: se remuestrea con el motor que ya existe en
[`projection.js`](../frontend/src/lib/projection.js) (`runPaths`, semilla fija `PROJECTION_SEED`, de
forma que el mismo historial dé siempre el mismo dibujo). Las comisiones salen de `fees`, que hoy se
captura y no se agrega en ningún sitio.

**Guarda obligatoria**: por debajo de `MIN_SAMPLE_FOR_PROJECTION = 30` el bloque no concluye, sólo
muestra la descomposición contable (que sí es exacta) y omite la banda. Una banda de confianza sobre
ocho operaciones es un adorno con aspecto de estadística.

---

#### M-6 · El ritual de revisión

**Cierra:** F-4 · **Backend:** hecho (`ready_for_review`, `next_review_due`, `cooldown_notice`)

Cuando `trades_under_plan >= min_sample_before_change`, el producto **cambia de estado**: aparece un
aviso persistente en la barra de estado (M-11) y un modo Revisión que recorre, en orden:

1. Cumplimiento del periodo (M-4)
2. Atribución (M-5)
3. Rendimiento por setup — cuál mantener, cuál retirar
4. Los criterios de abandono que el propio usuario escribió (`review.kill_criteria`), contrastados
   contra los números de ahora
5. Decisión: **mantener el plan** (se sella la revisión con fecha) o **crear la v2** (con
   `change_reason` obligatorio, prellenado con lo que la revisión encontró)

Es el bucle cerrándose. Y es lo que convierte el producto de «una herramienta que consultas» en «un
proceso que te llama». Retención pura, y honesta: no llama para que entres, llama porque tu propia
regla dijo que a las 30 operaciones tocaba mirar.

---

### BLOQUE C · El diario como instrumento de trabajo

---

#### M-7 · La tabla se convierte en una superficie

**Cierra:** F-3

| Qué | Por qué |
|---|---|
| Ordenación por cualquier columna | «¿Cuál fue mi peor operación?» debe ser un clic |
| Rango de fechas + presets (mes, trimestre, año, bajo el plan vN) | El calendario ya agrupa por día; falta poder saltar a esas operaciones |
| Filtros combinables: símbolo, lado, estado, setup, error, R, etiqueta | El filtro por setup ya existe (`setupFilter`); generalizarlo |
| Vistas guardadas | Cada trader mira dos o tres cortes, siempre los mismos |
| Selector de columnas + densidad | 11 columnas fijas no le sirven a nadie del todo |
| Virtualización por encima de ~200 filas | Hoy el límite es 200 y no hay paginación |
| Cabecera fija y navegación por teclado | Trabajo de revisión, no de lectura |
| Tarjetas en móvil (`< md`) | Hoy la tabla se desborda en horizontal |

Y el **cajón de detalle** (drawer lateral, no otra página): captura, notas, emoción, la lista completa
de errores **con el umbral del plan que incumplió** («tu plan v3 dice 1 %, esta operación arriesgó
2,3 %»), la línea temporal entrada→MAE→MFE→salida, y el enlace al gráfico.

---

#### M-8 · La captura de pantalla, que ya está modelada y nadie usa

`screenshot_urls` existe en el modelo desde siempre y ningún componente lo toca. Un diario sin imagen
del gráfico obliga a recordar, y recordar es exactamente lo que el diario existe para no tener que
hacer.

Dos piezas:

1. **Pegar desde el portapapeles** en el formulario y en el cajón de detalle. Es el gesto real: el
   trader tiene la captura en el portapapeles justo después de cerrar.
2. **Enlace profundo a TradingView** con el símbolo, el marco temporal y las líneas de entrada, stop
   y objetivo. El componente `TradingViewChart` ya está integrado; para una operación cerrada, poder
   ver el gráfico de aquel día con los niveles pintados es media revisión hecha.

Decisión pendiente y honesta: alojar imágenes cuesta dinero y tiene implicaciones de RGPD. La primera
versión puede aceptar **sólo URL externas** (el trader ya usa TradingView/Imgur) y dejar la subida
propia para cuando haya cuota definida. Lo que no se puede hacer es seguir teniendo el campo y
fingir que no está.

---

#### M-9 · El plan como puerta, no como documento

**Cierra:** F-4 (la parte que más cambia el comportamiento)

Hoy el plan juzga *después*. Tiene que avisar *antes*:

- **Cierre en dos clics.** Una operación abierta se cierra hoy abriendo el modal completo. Debe ser
  inline: precio de salida, fecha, MAE/MFE. Tres campos.
- **Checklist previa generada desde el plan.** `PreTradeProtocol.jsx` ya existe, calcula límites y
  los tira. Que los lea del plan, y que **quede registrado qué ítems se marcaron** en la operación.
  Eso hace medible el proceso, no sólo el resultado.
- **Estado del día contra los límites del plan**, calculado antes de guardar:
  «llevas −1,8R de tu límite diario de 2R», «ésta sería tu 4ª operación y tu plan dice 3».
  El backend ya calcula esas reglas (`over_daily_limit`, `over_trade_count`,
  `traded_after_consecutive_losses`); sólo hay que preguntárselas antes en vez de después.

Un límite diario que te avisa al día siguiente no es un límite: es un reproche.

---

#### M-10 · Importación: profundidad en vez de amplitud

No se compite con 500 brokers. Se compite con **cuatro importadores que funcionen de verdad** y un
importador genérico excelente.

Del genérico (`TradeImportWizard.jsx`, 223 líneas) falta:

- **Memoria del mapeo por origen.** Quien importa de su bróker lo hará todos los meses; mapear las
  columnas una vez y que se recuerde.
- **Deduplicación por huella** (símbolo + entrada + fecha + cantidad). Importar dos veces el mismo
  extracto no puede duplicar el historial: corrompe todo lo demás en silencio.
- **Zona horaria explícita.** Las sesiones del plan se evalúan en su propia zona; una importación con
  la hora mal dispara `outside_session` en operaciones perfectamente dentro del plan.
- **Ejecuciones → operación.** Un extracto real trae *fills* parciales; tres entradas y dos salidas
  del mismo símbolo son **una** operación con precio medio, no cinco. Sin esto, cualquier importación
  de un bróker serio destroza el R y el recuento.

Los cuatro adaptadores propios, por cobertura del público objetivo: **MT4/MT5** (extracto HTML),
**IBKR Flex**, **Binance** (CSV de spot y de futuros) y **el formato de las prop firms** más comunes.

---

### BLOQUE D · Los gráficos

---

#### M-11 · La carta de gráficos que faltan

Lo que hay hoy: curva de equity (área), calendario PnL mensual, barras por setup/día, histograma de R,
dispersión MAE. Está bien y es honesto. Lo que falta, ordenado por valor:

| Gráfico | Qué responde | Estado del dato |
|---|---|---|
| **Underwater / drawdown** bajo la curva | «¿Cuánto tiempo llevo bajo máximos?» — la pregunta que de verdad duele | `equity_curve` ya está |
| **Marcas de versión del plan** sobre la curva | «¿La v2 mejoró algo?» Separación visual de eras | `plan_version` por operación |
| **Equity sin las operaciones que rompieron el plan** | El gráfico más persuasivo posible | `errors` por operación |
| **Mapa de calor hora × día** (acierto y esperanza) | «¿A qué hora opero mal?» Estándar del sector, aquí no existe | `entry_date`; falta agrupar por hora |
| **Cascada de atribución** | De saldo inicial a saldo actual, por setup / infracción / comisiones | `by_setup`, `by_rule`, `fees` |
| **Esperanza móvil** (ventana de N operaciones) | «¿Estoy mejorando?» La curva de aprendizaje | `r_multiple` ordenado |
| **Cinta de rachas** (W/L en tira) | Ver si las pérdidas se agrupan — señal de tilt | `pnls` ordenado |
| **Distribución de R con banda de confianza** | Separar la ventaja del ruido | `runPaths` de `projection.js` |
| **MAE/MFE con cuadrantes y pincel** | Seleccionar una región → filtrar el diario | `excursion.scatter` ya está |

**Sobre el gráfico contrafactual, una advertencia que hay que escribir en pantalla:** quitar las
operaciones que rompieron el plan **no** dibuja lo que habrías ganado. Cumplir el plan habría
cambiado también qué operaciones existieron después. La etiqueta correcta es *«tu curva sin las
operaciones que incumplieron»* y jamás *«lo que habrías ganado cumpliendo»*. Esa distinción es la
diferencia entre una herramienta y un anuncio.

Reglas transversales para todos: paleta y convenciones del skill `dataviz`; tamaño de muestra visible
en cualquier gráfico que sostenga un consejo; sin muestra el panel **no se pinta**, no se pinta a
cero; y todo lo sensible al orden se construye sobre `sort_trades_chronologically`.

---

### BLOQUE E · Diseño, estructura y visibilidad

---

#### M-12 · La estructura de `/performance` sigue el bucle del trabajo

**El problema estructural.** Cinco pestañas cuyo orden no es el del trabajo, y una página de
marketing ocupando la primera posición. El bucle real del oficio es:

```
  ESCRIBIR EL PLAN → EJECUTAR (diario) → MEDIR (analítica) → REVISAR (cumplimiento) → PROYECTAR
        ↑                                                            │
        └────────────────── nueva versión ───────────────────────────┘
```

**Propuesta de estructura:**

```
  /performance                    → hoy: marketing público. Pasa a /diario-de-trading (M-12b)
  /performance/plan               → NUEVO. Editor + historial de versiones
  /performance/journal            → Diario
  /performance/analytics          → Analítica (con cumplimiento y atribución)
  /performance/setups             → Setups (marcador + constructor)
  /performance/projection         → Proyección
```

Rutas propias, no estado local: hoy la pestaña vive en `useState` y no se puede enlazar «mi analítica»
a nadie ni volver a ella con el botón atrás.

**La barra de estado del día — la pieza de visibilidad que falta.** Fija bajo las pestañas, visible
desde todas ellas:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Plan v3 ✓   Hoy: 2 ops · −0,4R    Límite diario: −2,0R  ███░░░ 20 %   │
  │ Cumplimiento 30 días: 91 %        Revisión: faltan 4 operaciones      │
  └────────────────────────────────────────────────────────────────────────┘
```

Eso es lo que convierte el plan de documento en barandilla. Y es la respuesta directa a «visibilidad»:
lo que importa deja de estar a tres clics.

**El orden dentro de cada pantalla** sigue la misma ley que el panel de opciones y el escáner de
estructura, que ya está fijada en [`CLAUDE.md`](../CLAUDE.md):

> 1 configurar → 2 resultado → 3 detalle → lo accesorio en `SectionCard` **plegado y con contador**.

Para la analítica, eso significa un orden explícito y defendible:

1. **Cumplimiento del plan** (M-4) — el proceso, antes que el resultado
2. **Rentabilidad por periodo** — la unidad en la que se cobra (ya está primero, y está bien)
3. **Atribución** (M-5) — de dónde sale ese resultado
4. **KPI + curva + calendario** — el resultado, con su forma
5. **Desgloses** (setup, día, hora, símbolo)
6. **Calibración** (MAE/MFE, distribución de R) — en `SectionCard` plegado
7. **Sesgos e insights** — al final, porque son consecuencia de todo lo anterior

Encabezar con el win rate —que es lo que hace todo el sector— invita a optimizar la métrica
equivocada: un 70 % de acierto con payoff 0,5 pierde dinero. Este panel ya evita ese error; hay que
mantenerlo al añadir.

**Estados vacíos que enseñan.** Cada panel sin muestra dice qué hacer para ganársela, no «sin datos».
El de la analítica ya lo hace (`analytics-empty` con CTA); hay que extenderlo a todos.

---

#### M-12b · Visibilidad hacia fuera: la referencia pública

Se aplica el patrón que [`CLAUDE.md`](../CLAUDE.md) ya fija para opciones:

> `/options` es público; el workspace es `/options/calculator`. La referencia no lleva muro de pago y
> tiene URL propia e indexable; la calculadora en vivo sí lo lleva y va con `noindex`.

Traducción para esta área:

- **`/diario-de-trading`** — público, indexable, en los 10 idiomas. Qué es un diario de trading, qué
  mide cada métrica, la matriz 2×2 explicada con datos de ejemplo, un demo con operativa ficticia
  claramente etiquetada. JSON-LD `HowTo`. El workspace queda en `/performance/*` con `noindex`.
- **Páginas por métrica**, generadas como ya hace `gen-seo-pages.js` con las estrategias de opciones:
  `/metricas/esperanza-matematica`, `/metricas/mae-mfe`, `/metricas/factor-de-beneficio`,
  `/metricas/drawdown`, `/metricas/r-multiplo`… × 10 idiomas. Cada una explica la métrica, enseña la
  fórmula y termina en la herramienta. Es exactamente la jugada que ya funciona en el sitio.
- **Correo de revisión semanal** con SendGrid, disparado por la cadencia que el propio usuario
  declaró en `review.cadence`. Es el único correo de retención que no es spam: se lo pidió él.
- **`JournalStats` en el dashboard**: hoy enseña estadística; que enseñe además el estado del día y
  las operaciones sin cerrar.

---

## 5. Contratos de datos

Lo que hay que añadir, expresado como contrato para que se pueda implementar sin releer este
documento entero.

### 5.1 Plan — sección nueva `setups[]`

```python
"setups": [{
    "id": str,                 # uuid; el mismo que ya genera tradingSystem.js
    "name": str,               # clave de unión con by_setup del diario
    "setup_type": str,         # trend | reversal | breakout | range
    "assets": [str],
    "timeframes": {"context": str, "entry": str},
    "entry_trigger": str,      # el momento exacto. Sin esto no es una regla, es un ánimo
    "invalidation": str,
    "stop_rule": str,          # structural | atr | fixed-pct
    "risk_per_trade": float | None,
    "min_rr": float | None,
    "management": [str],
    "max_concurrent": int | None,
}]
```

Con varios setups en una operación gana el más estricto de cada límite. Un límite no declarado es
`None` y su regla calla.

### 5.2 Analítica — campos nuevos

```python
"by_hour":        [{"group": "14", "n": .., "wins": .., "win_rate": .., "pnl": .., "avg_r": ..}],
"by_hour_day":    [{"day": 1..7, "hour": 0..23, "n": .., "win_rate": .., "expectancy_r": ..}],
"fees_total":     float,
"fees_pct_of_gross": float | None,   # None si el bruto es <= 0
"rolling_expectancy": [{"i": int, "expectancy_r": float, "window": int}],
"streak_ribbon":  [1, -1, -1, 1, ...],          # ordenado por exit_date
"attribution": {                                 # M-5
    "edge": float, "violations": float, "fees": float, "variance": float,
    "band_p05": float | None, "band_p95": float | None,   # None bajo muestra mínima
    "sample": int, "inside_band": bool | None,
},
"equity_clean":   [float],   # sin las operaciones con errores. SIEMPRE con su etiqueta
```

`by_hour` se agrupa por hora local del usuario, no UTC. Si no se conoce la zona del usuario, se
agrupa por la zona declarada en `sessions[0].tz`; si tampoco existe, **el panel no se pinta** —una
distribución horaria en la zona equivocada es peor que ninguna.

### 5.3 Endpoints nuevos

```
POST /api/plan/simulate      → retro-simulación de un plan candidato (M-1). No persiste
POST /api/plan/review        → sella una revisión: {decision: "keep"|"new_version", notes}
GET  /api/performance/today  → estado del día contra los límites del plan (M-9, M-12)
```

`/performance/today` debe ser barato: lo va a llamar la barra de estado en cada carga.

---

## 6. Las reglas que no se pueden romper

Las tres de [`CLAUDE.md`](../CLAUDE.md), aplicadas a esta área:

1. **Nada inventado sin etiquetar.** La curva contrafactual, la banda de confianza y toda
   retro-simulación llevan etiqueta explícita de qué son y qué no son.
2. **Lo que no se puede calcular es `None`, no `0`.** `compliance_rate` sin operaciones es `None`.
   Un setup definido y sin operar es *sin muestra*, nunca un 0 % de acierto. Un límite no declarado
   es regla callada, nunca límite de cero.
3. **Lo sensible al orden se ordena.** Curva, drawdown, rachas, esperanza móvil y cinta: todo sobre
   `sort_trades_chronologically`, por `exit_date`.

Y tres específicas de este trabajo:

4. **Un número que dispare un consejo de tamaño de posición necesita muestra EN EL ORIGEN.** Ya está
   así en `suggested_stop_r`; lo mismo aplica a cualquier recomendación nueva.
5. **Cambiar el plan no re-juzga la historia.** `plan_version` se sella al crear y no se reescribe.
6. **Una operación con varios setups cuenta en todos sus grupos**, y la pantalla lo dice
   (`setups_multi_tagged`) en lugar de dejar que el lector suponga que las columnas son una partición.

---

## 7. Orden de ejecución

Cada fase deja el producto en un estado coherente y publicable. No hay fase que dependa de una
posterior.

| Fase | Contenido | Backend | Frontend | Cierra |
|---|---|---|---|---|
| **1** | M-3 RGPD + test de colecciones | 3 líneas + test | — | G-15 |
| **2** | M-4 bloque de cumplimiento | **cero** | 1 componente | F-2 |
| **3** | M-1 editor del plan + `/plan/simulate` | 1 endpoint | asistente 5 pasos | **G-14** |
| **4** | M-2 setups al servidor + fusión de reglas | sección `setups[]` | migración + `TradeFormModal` | F-1 |
| **5** | M-12 estructura, rutas y barra de estado | `/performance/today` | reorganización | F-4 |
| **6** | M-7 + M-9 diario como superficie y como puerta | — | tabla + cajón + cierre inline | F-3 |
| **7** | M-5 atribución + M-11 gráficos | agregados nuevos | gráficos | — |
| **8** | M-6 ritual de revisión | `/plan/review` | modo revisión | F-4 |
| **9** | M-8 capturas + M-10 importación | — | + adaptadores | — |
| **10** | M-12b referencia pública y SEO | — | páginas generadas | — |

**Por qué la fase 2 va antes que la 3** aunque el plan sea la raíz: el bloque de cumplimiento cuesta
cero backend, y con él en pantalla el editor del plan deja de ser «un formulario más» para ser «lo
que enciende ese bloque». Se construye el hueco antes que la pieza.

---

## 8. Cómo se verifica

Además del bucle de siempre (`/verify`):

```bash
# Sintaxis de todo el backend
cd backend && python -m py_compile *.py

# Tests del área
cd backend && pytest tests/ -k "performance or plan or trading_plan" -v

# Paridad de los 10 idiomas — bloquea si falta una clave
cd frontend && node scripts/i18n-check.js

# El motor de proyección y el de setups
cd frontend && node scripts/engine-check.js

# Lint y build
cd frontend && npx eslint src scripts && npm run build

# Enlaces de la documentación (este documento incluido)
python scripts/check-doc-links.py
```

Tests nuevos que hay que escribir, por fase:

- **F1**: un test que recorra las colecciones con `user_id` y exija que cada una esté en
  `delete_account`, `_USER_DATA_COLLECTIONS` y el export de `/auth/my-data`.
- **F3**: `/plan/simulate` no escribe nada en la base de datos (contar documentos antes y después).
- **F4**: definido «R:R mínimo 2» → el aviso del formulario y el error del servidor usan el mismo
  umbral.
- **F7**: `attribution` devuelve `band_p05 = None` por debajo de 30 operaciones; `equity_clean`
  coincide con `equity_curve` cuando no hay errores.
- **F8**: sellar una revisión no altera el `plan_version` de ninguna operación existente.

**En el sandbox web** (sesiones remotas): Yahoo y CoinGecko están bloqueados, pero **nada de este
trabajo necesita red**. El diario, el plan y la analítica operan sobre datos del propio usuario. Es,
con diferencia, el área del proyecto más verificable en local — motivo adicional para atacarla ahora.

---

## 9. Lo que deliberadamente no se hace

Decir que no también es diseño:

- **No se persiguen los 500 brokers.** Cuatro adaptadores buenos y un importador genérico excelente
  (M-10). La amplitud es un compromiso de mantenimiento perpetuo que este precio no sostiene.
- **No se añaden 300 informes.** Un buscador de informes es lo que se construye cuando no se sabe
  cuál es la lectura importante. Aquí sí se sabe.
- **No se hace trade replay tick a tick.** Requiere datos de tick con licencia (ver G-16). El enlace
  al gráfico con los niveles pintados (M-8) cubre el 80 % del valor a un coste de cero.
- **No se pinta ninguna métrica sin muestra.** Aunque quede un hueco en la retícula. Un hueco es
  honesto; un cero es una afirmación falsa.
- **No se migran los setups del navegador en silencio.** Se pregunta. Es su configuración de riesgo.
- **No se promete lo que la retro-simulación no puede decir.** «Cuántas de tus operaciones habrían
  incumplido», sí. «Cuánto habrías ganado», nunca.

---

## 10. La frase que resume el trabajo

> El plan de trading deja de ser un PDF que se imprime y pasa a ser la configuración que gobierna la
> aplicación.

Está escrita en [`PLAN_DE_TRADING_spec.md`](./PLAN_DE_TRADING_spec.md) desde el 2026-07-28. El backend
la cumplió. Falta que el usuario pueda verla.

---

*Estudio realizado sobre el código en el commit `5b5872b`. Cada afirmación sobre el estado actual está
verificada contra el fichero y la línea citados. No es asesoramiento financiero.*
