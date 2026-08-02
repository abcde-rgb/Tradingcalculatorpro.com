# Plan de Trading — análisis del PDF, especificación de la herramienta y módulo formativo

**Fecha:** 2026-07-28 · **Commit de referencia:** `c5b6320`
**Documento analizado:** `Gestión_de_RIESGO_y_creación_de_un_plan_de_trading.pdf`

Este documento tiene cuatro partes:
1. Qué aporta el PDF y qué le falta
2. Qué de eso ya está en tu web (para no duplicar nada)
3. **Especificación para una IA** — la herramienta que hay que construir
4. El módulo formativo nuevo, con el único ángulo que no está cubierto

---

# PARTE 1 — El PDF

## 1.1 Qué es

Es material comercial de un bróker. Lo delata el propio texto: *"Opera con una cuenta demo sin riesgo · Practica el trading con fondos virtuales · **ABRE UNA CUENTA DEMO**"* incrustado en mitad del capítulo del plan de trading. Eso condiciona todo el contenido: encuadre CFD/forex, énfasis en la demo, y ninguna mención a los costes que cobra el propio bróker.

No es basura — la estructura general es razonable y el ejemplo numérico está bien calculado. Pero es un folleto, no un manual.

## 1.2 Errores y medias verdades

**a) El ratio 2:1 presentado como regla universal.**

> *"aunque sufra tres operaciones perdedoras, solamente necesitará dos exitosas"*

Eso asume implícitamente una tasa de acierto del 40% y no lo dice en ningún momento. **Un R:R sin tasa de acierto no significa nada**: 2:1 con 25% de acierto pierde dinero, y 1:1 con 60% lo gana. La única fórmula que importa es la esperanza matemática, y el PDF no la escribe ni una vez. Tu web sí la enseña (`getProbabilityStatistics` → `expectation-formula`), o sea que aquí el PDF es un retroceso.

**b) "Cobertura — tomar varias posiciones a la vez" listada como técnica de gestión de riesgo.**

Esto es directamente engañoso. Abrir varias posiciones a la vez sin analizar correlación **aumenta** el riesgo, no lo reduce: cuatro largos en EUR/USD, GBP/USD, AUD/USD y oro son una sola apuesta corta contra el dólar. Y la "cobertura" al estilo retail (comprar y vender el mismo par simultáneamente) es un artificio que solo duplica el coste del spread. Tu web ya lo trata bien en `getRiskManagementConcepts` → `correlation-risk` y `portfolio-heat`.

**c) SMART mal transcrito.** El PDF pone *"Traceable – rastreable"* para la T. El acrónimo estándar es **Time-bound** (con plazo). No es una tontería: lo que falta en un objetivo de trading es precisamente la fecha límite, y el PDF lo sustituye por otra cosa.

**d) La definición de "sistema de trading" es de hace quince años.** Medias móviles simples + estocástico + RSI. Ninguna mención a que un sistema necesita **validarse** antes de operarlo, ni a qué evidencia haría falta para creer que funciona.

**e) El ejemplo de los dos inversores demuestra algo que nunca nombra.**

Las tablas están bien calculadas: alternando ganancia/pérdida, el agresivo hace `(2,20 × 0,40)⁵ = 0,528` → 5.277 $, y el conservador `(1,10 × 0,95)⁵ = 1,246` → 12.462 $. Mismo acierto, mismo R:R, resultados opuestos.

Eso tiene nombre: **arrastre por volatilidad** (la media geométrica de una serie es menor que la aritmética, y la brecha crece con el cuadrado de la volatilidad). Es exactamente por qué existe el criterio de Kelly. El PDF enseña el fenómeno con números y no dice cómo se llama, así que el lector se lleva "arriesga poco" en vez de llevarse el principio que le permitiría razonar por su cuenta.

También es un espantapájaros: nadie arriesga el 60% por operación. Con 5% vs 1% —comparación realista— el efecto sigue existiendo y el ejemplo sería honesto.

## 1.3 Qué le falta (está muy incompleto)

Para ser un manual de plan de trading, faltan las piezas operativas:

| Ausente en el PDF | Por qué es imprescindible |
|---|---|
| **Fórmula de esperanza matemática** | Es lo único que dice si un plan tiene ventaja |
| **Fórmula del tamaño de posición** | Repite "el tamaño importa" sin dar nunca `Riesgo€ ÷ distancia al stop` |
| **Límite de pérdida diaria y semanal** | El mecanismo que impide que un mal día se convierta en un mal mes |
| **Calor de cartera / correlación** | Tres posiciones al 1% correlacionadas son un 3% |
| **Tamaño de muestra** | ¿Con cuántas operaciones sabes si el plan funciona o tuviste suerte? |
| **Costes** | Spread, comisión y swap. Un bróker no va a recordártelo |
| **Cuándo NO operar** | Regímenes, noticias, estado personal, mercados sin liquidez |
| **Cadencia de revisión concreta** | Dice "revisiones sistemáticas" y no dice cada cuánto ni qué se mira |
| **Cuándo cambiar el plan** | Nada. Y es donde muere la mayoría de los planes |
| **Un artefacto** | Todo es prosa. No hay ni una plantilla rellenable |

Ese último punto es el importante: **un plan de trading que no es un documento con campos no es un plan, es una lectura.**

---

# PARTE 2 — Qué de esto ya está en tu web

Recorrí el temario buscando cada concepto del PDF. Resultado:

| Concepto del PDF | Ya cubierto en | ¿Duplicar? |
|---|---|---|
| Tres pilares (sistema, psicología, gestión) | `TradingPillarsGuide`, `TradingPyramid` | ❌ No |
| Tamaño de posición | `getRiskManagementConcepts` → `position-sizing`, `sizing-methods` + calculadora | ❌ No |
| Riesgo por operación 1-2% | `getCapitalManagement` → `one-percent` | ❌ No |
| Ratio riesgo/beneficio | `getCapitalManagement` → `minimum-rr`, `rr-calculation` | ❌ No |
| Apalancamiento y margen | `LeverageGuide`, `getMarginLiquidation` | ❌ No |
| Stop loss | `StopLossGuide`, `getStopsAndTargets` (9 temas) | ❌ No |
| Psicología: miedo, codicia, expectativa | `getTradingPsychology`, `getPsychSolutions`, `getProDiscipline` → `tilt` | ❌ No |
| Overtrading | `detect_behavioral_biases` → `overtrading` + `getAccountKillers` | ❌ No |
| Elementos del plan | `printTradingPlan` (6 secciones) + `SetupBuilder` | ❌ No |
| Checklist previa | `PreTradeProtocol` + `planCheck1-6` | ❌ No |
| Horarios y sesiones | `getSessionTiming`, `SessionTimingVisual` | ❌ No |
| Revisión sistemática | `getSystemAdherence` → `review`, `routine`, `scoreprocess` | ❌ No |
| Cobertura / correlación | `getRiskManagementConcepts` → `correlation-risk`, `hedging` | ❌ No |
| Demo antes que real | `getTraderJourney` | ❌ No |

**Conclusión: no hay ni un solo concepto del PDF que merezca añadirse al temario.** Tu web lo cubre todo y en la mayoría de casos con más rigor que el original. Si metes este material, duplicas.

Lo único con valor añadido es el **ejemplo numérico del arrastre por volatilidad**, y solo si se reformula: con 5% vs 1% en lugar de 60%, y nombrando el concepto (media geométrica vs aritmética, y su relación con Kelly, que ya está en `getCapitalManagement` → `kelly`). Sería una figura dentro de un módulo existente, no un módulo nuevo.

## 2.1 Pero el ejercicio destapó algo mejor

Al ir a comprobar qué tenías sobre planes de trading, encontré esto:

**El plan de trading existe en tu web en tres sitios que no se hablan entre sí:**

1. `SetupBuilder.jsx` — guarda `{name, timeframe, style, approaches[], tools[], risk, rr}` en **localStorage**.
2. `printTradingPlan()` en `EducationPage.jsx` — abre una ventana e imprime un formulario **con las líneas en blanco**. No lee nada de lo anterior.
3. `PreTradeProtocol.jsx` — calcula límites de circuito (R diario, R semanal, pérdidas consecutivas, máx. operaciones/día) y **no los guarda en ninguna parte**.

Y el hallazgo de fondo, en `performance.py:24-26`:

```python
MIN_RR_THRESHOLD = 1.5             # min recommended R:R (per Education Center)
MAX_RISK_PCT_THRESHOLD = 2.0       # max risk per trade (% of account)
EARLY_CLOSE_THRESHOLD = 0.5        # closed before reaching 50% of TP
```

`detect_errors()` valida cada operación contra **esas tres constantes globales**, no contra el plan del usuario. Consecuencias reales:

- Un scalper que declara conscientemente 1:1 con 65% de acierto —un sistema perfectamente válido— recibe un error `low_rr` **en todas y cada una de sus operaciones**.
- Alguien que decide arriesgar 0,5% máximo no recibe ningún aviso al arriesgar 1,8%, porque el umbral global es 2%.
- El `rule_compliance_rate` que muestras en el panel no mide el cumplimiento del plan del usuario. Mide **el cumplimiento de la opinión de la app**.

Y hay un detalle que remata el diagnóstico: `getTradeManagement` → `maemfe` enseña muy bien MAE y MFE (*"anotarlas en el diario revela oro"*), y **el diario no tiene campos para anotarlas**. La web enseña una técnica que no te deja aplicar.

Ese es el trabajo real que hay que hacer, y es lo que especifica la Parte 3.

---

# PARTE 3 — Especificación para una IA

> Copia esta parte tal cual a Claude Code o al agente que uses.

## Contexto

Repositorio `Tradingcalculatorpro.com`. Backend FastAPI en `backend/` sobre un shim Mongo→PostgreSQL (usar siempre la API tipo Mongo del shim, nunca SQL suelto). Frontend React 19 + CRACO en `frontend/`. i18n obligatorio: 8 idiomas (`es, en, de, fr, ru, zh, ja, ar`), paridad total de claves, sin cadenas incrustadas en los componentes.

## Objetivo

Convertir el plan de trading, que hoy está disperso en tres piezas desconectadas y efímeras, en **un objeto de datos versionado en servidor que sea la única fuente de verdad de las reglas de riesgo del usuario**, y del que lean todos los módulos que hoy usan constantes globales.

Frase que resume el criterio de diseño: *el plan deja de ser un PDF que se imprime y pasa a ser la configuración que gobierna la aplicación.*

## No objetivos

- No crear contenido educativo nuevo sobre gestión de riesgo. Ya existe y es bueno; solo hay que enlazarlo.
- No tocar el motor de opciones ni el optimizador.
- No añadir un módulo al temario. La Parte 4 de este documento es lo único que se añade.

## 3.1 Modelo de datos

Colección nueva `trading_plans`. Un documento por versión; nunca se sobrescribe.

```python
{
  "id": str,                    # uuid4
  "user_id": str,
  "version": int,               # 1, 2, 3… incremental por usuario
  "status": str,                # "draft" | "active" | "archived"
  "created_at": str,            # ISO 8601 UTC
  "activated_at": str | None,
  "archived_at": str | None,
  "change_reason": str,         # OBLIGATORIO desde la v2. Máx 500 caracteres

  # ── 1. Identidad ────────────────────────────────────────────
  "name": str,
  "style": str,                 # scalping | day | swing | position
  "markets": [str],             # ["ES35", "EURUSD"]
  "sessions": [                 # ventanas horarias permitidas
    {"days": [1,2,3,4,5], "start": "09:00", "end": "12:00", "tz": "Europe/Zurich"}
  ],

  # ── 2. Setup (condiciones de entrada) ───────────────────────
  "timeframes": {"context": "4h", "entry": "15m"},
  "approaches": [str],          # reutilizar los ids de SetupBuilder
  "tools": [str],
  "entry_rules": [str],         # texto libre, 1 regla por línea, máx 10
  "invalidation": str,          # qué hace que el setup deje de ser válido
  "no_trade_conditions": [str], # cuándo NO se opera

  # ── 3. Riesgo (lo que consume el motor de reglas) ───────────
  "risk": {
    "max_risk_pct_per_trade": float,   # p. ej. 1.0
    "min_rr": float,                   # p. ej. 1.5
    "max_daily_loss_r": float,         # en múltiplos de R
    "max_weekly_loss_r": float,
    "max_consecutive_losses": int,
    "max_trades_per_day": int,
    "max_open_risk_r": float,          # calor de cartera total
    "max_correlated_positions": int,
    "require_stop_loss": bool          # por defecto true
  },

  # ── 4. Gestión de la posición ───────────────────────────────
  "management": {
    "breakeven_at_r": float | None,
    "partials": [{"at_r": float, "pct": float}],
    "trailing": str | None,
    "time_stop_bars": int | None,
    "close_before_events": bool
  },

  # ── 5. Revisión y validación ────────────────────────────────
  "review": {
    "cadence": str,                    # "weekly" | "biweekly" | "monthly"
    "min_sample_before_change": int,   # por defecto 30 operaciones
    "kill_criteria": str               # qué evidencia haría abandonar el plan
  }
}
```

**Reglas de negocio:**
- Solo un documento con `status: "active"` por usuario.
- Activar una versión nueva archiva la anterior automáticamente.
- Desde la v2, `change_reason` es obligatorio y no puede estar vacío.
- **Regla de enfriamiento:** si la versión activa tiene menos de `review.min_sample_before_change` operaciones cerradas asociadas, activar una nueva versión devuelve un aviso (no un bloqueo) explicando cuántas operaciones faltan. El usuario puede continuar, pero queda registrado en `change_reason`.
- Cada operación del diario guarda `plan_version` en el momento de crearse. Es inmutable después.

## 3.2 Endpoints

```
GET    /api/plan                  → plan activo (404 si no hay)
GET    /api/plan/history          → todas las versiones, desc por version
POST   /api/plan                  → crea v1 o nueva versión; activa
PATCH  /api/plan/draft            → edita el borrador sin activar
GET    /api/plan/compliance       → informe de cumplimiento (ver 3.4)
```

Todos requieren autenticación. `GET /api/plan` debe ser barato: lo van a llamar varios módulos.

## 3.3 Refactor del motor de reglas (lo más importante)

En `backend/performance.py`:

1. `detect_errors(trade, *, prev_trades=None)` pasa a `detect_errors(trade, *, plan=None, prev_trades=None)`.
2. Las constantes `MIN_RR_THRESHOLD`, `MAX_RISK_PCT_THRESHOLD` y `EARLY_CLOSE_THRESHOLD` **dejan de ser umbrales** y pasan a ser únicamente valores por defecto para cuando `plan is None`. Renombrar a `DEFAULT_MIN_RR`, etc., para que quede explícito.
3. Cada regla lee su umbral de `plan["risk"]`. Regla nueva `require_stop_loss`: si el plan lo pone en `false`, la regla `no_sl` **no se dispara**.
4. Reglas nuevas, que solo existen si hay plan:
   - `outside_session` — la hora de entrada cae fuera de `sessions`
   - `over_daily_limit` — la operación se abre con la pérdida diaria del plan ya alcanzada
   - `over_trade_count` — se supera `max_trades_per_day`
   - `traded_after_consecutive_losses` — se opera tras alcanzar `max_consecutive_losses`
   - `unlisted_market` — el símbolo no está en `markets`
5. Cada error devuelve además `plan_version` y `threshold`, para que el frontend pueda decir *"tu plan dice 1%, esta operación arriesgó 2,3%"* en vez de un mensaje genérico.

En `server.py`, el endpoint `/performance/analytics` carga el plan activo una sola vez y lo pasa a `_enrich_trade`.

**Compatibilidad:** los usuarios sin plan mantienen exactamente el comportamiento actual usando los valores por defecto.

## 3.4 Informe de cumplimiento

`GET /api/plan/compliance` devuelve, sobre las operaciones de la versión activa:

```python
{
  "plan_version": 3,
  "trades_under_plan": 47,
  "compliance_rate": 82.9,          # % de operaciones sin ningún error
  "by_rule": [                      # ordenado por coste, no por frecuencia
    {"code": "low_rr", "count": 6, "pnl_impact": -412.50, "threshold": 1.5}
  ],
  "adherence_vs_result": {          # la matriz 2×2 de la Parte 4
    "followed_won":   {"n": 21, "pnl": 1840.0},
    "followed_lost":  {"n": 18, "pnl": -910.0},
    "broke_won":      {"n": 3,  "pnl": 220.0},
    "broke_lost":     {"n": 5,  "pnl": -1180.0}
  },
  "ready_for_review": true,          # trades_under_plan >= min_sample_before_change
  "next_review_due": "2026-08-03"
}
```

`pnl_impact` por regla es lo que convierte esto en una herramienta: no es *"has incumplido 6 veces"*, es *"incumplir esta regla te ha costado 412 €"*.

`adherence_vs_result` es la matriz clave y debe pintarse siempre, aunque tenga pocos datos. Es lo que separa proceso de resultado.

## 3.5 Frontend

**Componente nuevo:** `frontend/src/components/plan/TradingPlanEditor.jsx` — asistente de 5 pasos siguiendo las 5 secciones del modelo. Cada paso enlaza al módulo del temario que lo explica (no repetir explicaciones: enlazar).

**Migraciones a hacer:**

| Pieza actual | Qué hacer |
|---|---|
| `SetupBuilder.jsx` | Se convierte en el **paso 2** del asistente. Migrar lo que haya en `localStorage['tcp-trading-setup']` al plan v1 la primera vez, y avisar al usuario |
| `PreTradeProtocol.jsx` | Se convierte en el **paso 3**. Los límites que hoy calcula se guardan en `risk` |
| `printTradingPlan()` | Deja de imprimir líneas en blanco: **rellena con el plan activo**. Mantener también la versión en blanco para quien aún no lo tiene |
| `planCheck1-6` | La checklist se genera **desde el plan**, no desde constantes de i18n |

**Cambios en piezas existentes:**

- `PositionSizeCalculator.jsx` — precarga `max_risk_pct_per_trade` desde el plan y avisa en rojo si el usuario lo sube por encima.
- `TradeFormModal.jsx` — al guardar una operación, escribe `plan_version` y muestra en vivo qué reglas del plan incumple **antes** de confirmar.
- `AnalyticsDashboard.jsx` — bloque de cumplimiento con la matriz 2×2 y la tabla de coste por regla.
- Enlace desde cada sesgo detectado al módulo correspondiente:
  `disposition_effect → getTradingPsychology` · `revenge_trade → getPsychSolutions` · `overtrading → getAccountKillers` · `no_stop_discipline → getSystemAdherence`.

## 3.6 Añadir MAE/MFE al diario

Va aquí porque es el mismo problema: `tmgMaeDesc` enseña la técnica y el diario no la soporta.

- Campos nuevos en `make_trade_doc`: `mae_price: float | None`, `mfe_price: float | None`.
- Calcular en `compute_trade_pnl`: `mae_r = |entry − mae_price| / risco_por_unidad`, ídem `mfe_r`.
- Agregados en `compute_analytics`: `avg_mae_r_winners`, `avg_mae_r_losers`, `avg_mfe_r`, y el dato accionable: **`suggested_stop_r`** = percentil 85 de la MAE de las ganadoras.
- Gráfico de dispersión MAE vs resultado en `AnalyticsDashboard`.
- Dos campos opcionales en `TradeFormModal`.

## 3.7 Criterios de aceptación

1. Un usuario con `min_rr: 1.0` en su plan **no** recibe errores `low_rr` en operaciones de R:R 1.2.
2. Un usuario con `max_risk_pct_per_trade: 0.5` **sí** recibe `oversize` en una operación al 1.2%.
3. Un usuario sin plan obtiene exactamente los mismos errores que antes del cambio.
4. Cambiar el plan crea v2, archiva v1, y las operaciones antiguas conservan `plan_version: 1`.
5. Intentar cambiar el plan con menos de `min_sample_before_change` operaciones devuelve el aviso de enfriamiento.
6. `printTradingPlan()` con plan activo sale relleno; sin plan activo sale en blanco.
7. Las 8 traducciones tienen paridad de claves; ninguna cadena incrustada en los `.jsx`.
8. Tests: modelo, versionado, regla de enfriamiento, cada regla nueva de `detect_errors`, y compatibilidad hacia atrás sin plan.

## 3.8 Orden de implementación

1. Modelo + endpoints + tests (backend aislado, sin tocar nada existente)
2. Refactor de `detect_errors` con `plan=None` por defecto → nada se rompe
3. Asistente frontend + migración desde localStorage
4. Informe de cumplimiento + matriz 2×2
5. `printTradingPlan` rellenado + checklist generada
6. MAE/MFE
7. Enlaces sesgo → módulo formativo

---

# PARTE 4 — El módulo formativo nuevo

## 4.1 Por qué solo un módulo, y por qué este

Busqué en las 2.100 claves de i18n antes de escribir nada. Ya está cubierto: la checklist, el proceso, el tilt, la fatiga, escribir las reglas, precomprometerse, la rendición de cuentas, el entorno, la rutina, la revisión, reducir tamaño para poder cumplir, los errores típicos. `getSystemAdherence` y `getProDiscipline` agotan el tema de *cómo cumplir un plan*.

Tres cosas **no** aparecen en ninguna de las 2.100 claves:

- `sesgo de resultado` / `outcome bias` → **no existe**
- `versión del plan` / `cuándo cambiar el plan` → **no existe**
- `falsable` / `falsabilidad` → **no existe**

Eso es el módulo. No es "la importancia de tener un plan" —eso ya está dicho de siete formas—, es **por qué el plan es lo que hace tu trading medible**, que es un argumento distinto y que nadie da en español.

## 4.2 Contenido propuesto

**Módulo: `getPlanAsHypothesis` — "El plan como hipótesis"**
Pilar: `pro` · Prerrequisito: `getSystemAdherence`

**Intro (`phIntro`)**
> Ya sabes que hay que tener un plan y ya sabes cómo cumplirlo. Este módulo va de otra cosa: de por qué sin plan escrito **no puedes aprender nada de tu operativa**. No es una cuestión de disciplina. Es una cuestión de que sin una predicción escrita antes, ningún resultado posterior te enseña nada.

**Ítem 1 · `hypothesis` — Tu plan es una predicción, no una promesa**
> Un plan de trading dice: *"cuando ocurra A, si entro en B con stop en C, esperando D, a lo largo de muchas repeticiones ganaré E."* Eso es una hipótesis con todas las letras: afirma algo comprobable sobre el futuro. Un plan que no se puede comprobar —"opero cuando veo oportunidad", "gestiono según el mercado"— no es un plan flojo, es que **no es un plan**: no hay nada que pueda demostrarse falso, y por tanto no hay nada que aprender. La pregunta que separa un plan real de una intención: *si esto no funcionara, ¿cómo me enteraría?*

**Ítem 2 · `outcome` — Proceso y resultado son dos ejes, no uno** *(tipo: crítico)*
> El error más caro del trader que ya sabe operar: juzgar la decisión por el resultado. En un entorno con azar, decisiones buenas producen pérdidas y decisiones pésimas producen ganancias. Cuatro casillas, no dos:
>
> |  | **Ganaste** | **Perdiste** |
> |---|---|---|
> | **Seguiste el plan** | Correcto. Repite | **Correcto.** Coste del negocio |
> | **Rompiste el plan** | **La casilla peligrosa** | Error caro, y al menos claro |
>
> La casilla que arruina cuentas no es abajo-derecha, es **arriba-derecha**: romper el plan y ganar. El mercado acaba de pagarte por saltarte tus reglas, y lo vas a repetir. Por eso el registro de errores debe llevarse **independientemente del resultado**: un incumplimiento ganador sigue siendo un incumplimiento. Y por eso "seguí el plan y perdí" no es un fracaso: es el coste previsto de operar una ventaja probabilística.

**Ítem 3 · `attribution` — Sin plan escrito no puedes atribuir nada**
> Pierdes 800 € en un mes. ¿Fue mala suerte dentro de lo esperado, o rompiste tus reglas, o el plan nunca tuvo ventaja? **Son tres problemas con tres soluciones opuestas** —no hacer nada, corregir la ejecución, o abandonar el sistema— y sin un plan escrito antes son indistinguibles. Aquí está la razón práctica de escribirlo: no es motivación, es que **convierte tu operativa en algo diagnosticable**. Tu informe de cumplimiento hace precisamente esa separación: cuánto perdiste siguiendo el plan y cuánto rompiéndolo.

**Ítem 4 · `versioning` — Cuándo cambiar el plan (y cuándo no)** *(tipo: crítico)*
> Casi todos los planes mueren igual: no se abandonan, se erosionan. Una excepción tras tres pérdidas, un stop un poco más ancho porque "esta vez es distinto", y a los dos meses no queda plan.
>
> La regla que lo evita: **el plan se cambia por versiones, no por parches.** Fijas de antemano una muestra mínima (30-50 operaciones), y hasta llegar a ella el plan **no se toca**. Cuando llegas, revisas con datos y, si cambias, creas una versión nueva con la fecha y el motivo escritos. Las operaciones antiguas siguen contando para la versión antigua.
>
> Dos consecuencias incómodas y necesarias: **no se cambia el plan en mitad de una racha perdedora** (es cuando peor información tienes y más ganas de cambiar), y **no se cambia después de una operación**, ni ganadora ni perdedora. Una operación no es evidencia de nada.

**Ítem 5 · `kill` — Escribe hoy lo que te haría abandonar** *(tipo: bajista)*
> La parte que nadie escribe, y la que te ahorra más dinero. **Antes** de operar el plan, defines qué evidencia te haría concluir que no funciona: *"si tras 50 operaciones cumpliendo el plan la esperanza sigue negativa, lo abandono"*, o *"si el drawdown supera el 15%, paro y reviso"*. Escrito **antes**, es una decisión racional tomada en frío. Decidido **después**, en medio del drawdown, es rendición o negación. Es la misma lógica que poner el stop antes de entrar, aplicada al sistema entero.

**Ítem 6 · `smart` — Objetivos que se pueden comprobar**
> Los objetivos de trading útiles son de **proceso**, no de resultado, porque el resultado no lo controlas. "Ganar 500 € este mes" no es un objetivo, es un deseo: depende del mercado. "Ejecutar todas mis operaciones con la checklist completa y mantener el cumplimiento por encima del 90% durante 30 operaciones" sí lo es: depende solo de ti, se mide, y si lo cumples y aun así pierdes, has aprendido algo real sobre tu sistema. *(Nota editorial: el acrónimo SMART termina en Time-bound, con plazo. Verás por ahí "Traceable"; es un error de transcripción que circula bastante.)*

**Nota final (`phNote`)**
> Resumen: el plan no está para obligarte a portarte bien. Está para que dentro de seis meses puedas responder con datos a la única pregunta que importa —*¿tengo ventaja, o solo he tenido suerte?*—. Sin plan escrito, esa pregunta no tiene respuesta posible, y sin respuesta no hay forma de mejorar. Escríbelo, fíjalo, ejecútalo una muestra completa, y solo entonces júzgalo.

## 4.3 Integración

- **Enlazar, no repetir.** El módulo debe apuntar a `getSystemAdherence` (cumplir), `getProDiscipline` (proceso), `getCapitalManagement` (los números) y `getProbabilityStatistics` (muestra y significancia). No reexplicar nada de eso.
- Botón al final: **"Escribir mi plan"** → `TradingPlanEditor`.
- La matriz 2×2 del ítem 2 es el mismo componente que el bloque `adherence_vs_result` del panel de analíticas. Uno se dibuja con datos de ejemplo, el otro con los del usuario.
- Tres preguntas nuevas para el banco del pilar `pro`, con las opciones barajadas (ver informe de contenido, §4.2).

---

*Análisis del PDF, contraste con el código en el commit `c5b6320` y especificación redactada para ejecución por agente. No es asesoramiento financiero.*
