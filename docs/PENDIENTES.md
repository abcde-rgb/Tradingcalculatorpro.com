# Pendientes (cosas que faltan / a completar)

> Lista viva de tareas abiertas y "placeholders" que hay que sustituir cuando
> haya datos reales. Marca la casilla al cerrarlas.
>
> 📅 **Revisada contra el código el 2026-08-03.** Lo que estaba hecho se ha
> marcado; lo que apuntaba a documentos inexistentes se ha corregido. El estado
> completo, con severidades, vive en [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) §3.

## Lo primero: dar interfaz a lo que ya está escrito (G-14)
- [ ] **Asistente del plan de trading.** `trading_plan.py` (558 líneas) y sus cinco
      endpoints (`/plan`, `/plan/history`, `/plan/draft`, `/plan/compliance`) están
      terminados y **sin una sola pantalla**. Especificación lista en
      [`PLAN_DE_TRADING_spec.md`](./PLAN_DE_TRADING_spec.md). Empezar por aquí: es
      además la fuente de los umbrales de riesgo que consume `detect_errors`.
- [ ] **Backtest con validación** (`/backtest/validate`, `/backtest/strategies`):
      in-sample/out-of-sample, walk-forward y corrección por data snooping. Sin UI.
- [ ] **Riesgo de cartera** (`/performance/portfolio-risk`): heat abierto,
      correlación, límites de pérdida y sizing por ATR. Sin UI.
- [ ] **Opciones americanas**: binomial CRR, Barone-Adesi-Whaley y riesgo de
      asignación temprana por dividendo. Sin UI.
- [ ] **Term structure de IV** (`/options/term-structure`): el endpoint existe;
      `PositioningPanel` sólo consume `/options/positioning`.

## Cumplimiento (RGPD) — G-15
- [ ] **`trading_plans` no se borra ni se exporta.** Falta en la lista de
      `delete_account`, en `_USER_DATA_COLLECTIONS` (purga por retención) y en
      `/auth/my-data`. Añadirla a las tres y dejar un test que recorra las
      colecciones con `user_id`.

## Referidos / partners
- [ ] **Hyperliquid — enlace de referido real.** Ahora usa un placeholder
      (`https://app.hyperliquid.xyz/`) en `components/common/RecommendedTools.jsx`.
      Sustituir por el enlace de referido cuando el usuario lo facilite.
- [ ] **Hyperliquid — logo oficial.** Ahora usa un SVG placeholder
      (`assets/partners/hyperliquid-square.svg`). Sustituir por el logo oficial
      (`hyperliquid-square.png`, cuadrado) y actualizar el import.

## Datos de mercado
- [x] **Binance** (spot cripto, sin key) — hecho el 2026-08-02 en `crypto_data.py`,
      con Kraken por delante en los 20 pares que cotiza contra dólar de verdad.
- [ ] **Grupo B: quitar Yahoo de lo que queda** (G-16). Acciones y ETFs de EE. UU.
      (→ IEX), los 23 índices (→ ETF equivalentes), los 15 futuros de materias
      primas (→ ETF) y la cadena de opciones (→ la sintética que ya existe).
      **Cambia lo que ve el usuario** y tiene coste: es decisión de negocio.
- [ ] Integrar **Hyperliquid** (perps/funding/OI + posiciones on-chain como
      diferenciador) — módulo `hyperliquid.py`.
- [ ] **Twelve Data** (acciones EU/forex/índices) está referenciado en
      `market_data.py` pero no sustituye a Yahoo todavía.
- [ ] **Probar los parsers nuevos contra la red real.** BCE, Binance, Kraken y el
      Tesoro se escribieron y probaron contra muestras: en el sandbox no hay
      salida. El primer contacto de verdad será en Cloud Run.

## Analítica / Google
- [ ] En **GA4**: marcar `sign_up`, `begin_checkout`, `purchase` como conversiones.
- [ ] `purchase` con `value`: requiere **normalizar el importe** en backend
      (hoy se guarda en unidades distintas según la vía de pago).
- [ ] Definir e implementar los 6 eventos de embudo (§8 de
      [`BACKLOG_AUDITORIA_2026-07-27.md`](./BACKLOG_AUDITORIA_2026-07-27.md)).

## Infraestructura
- [ ] Migrar BD a **Neon** (`DB_PROVIDER=neon`) + `MIN_INSTANCES=0`. Ver
      [`MIGRACION_NEON.md`](./MIGRACION_NEON.md).
- [ ] **Cloud Scheduler** para la purga diaria de retención (hoy sólo al arrancar,
      `purge_lapsed_user_data` en `startup_event`).
- [ ] **Despliegue del backend**: desde el 2026-08-03 no hay workflow. Se hace a
      mano con `cloudbuild.yaml`. Decidir si se repone con la federación arreglada.

## Contenido / producto
- [x] **Borrado de cuenta completo** — `DELETE /api/auth/account` cancela la
      suscripción de Stripe y borra las colecciones del usuario. *Salvo
      `trading_plans`: ver el bloque de RGPD arriba.*
- [ ] **Futuros** como instrumento propio en el diario. Parcial: `performance.py`
      ya respeta un `multiplier` por operación, pero no hay ni selector de
      instrumento ni valor de tick en la interfaz.
- [ ] **Revisión nativa de `pt` e `it`.** Los 5652 términos están traducidos a
      mano y sin huecos, pero nadie nativo los ha revisado — sobre todo la
      academia y los textos legales.
- [ ] **Traducir micro-etiquetas** en inglés de los diagramas visuales de Educación.
- [ ] **Construir la Fase 1** del técnico avanzado (Volume Profile, falso rompimiento,
      objetivos Ichimoku, TD Sequential). Spec en
      [`DETALLE_TECNICAS_IMPLEMENTACION.md`](./DETALLE_TECNICAS_IMPLEMENTACION.md).
- [ ] **Decidir si `/affiliate` cae tras el muro.** Hoy es sólo-auth: un registrado
      sin plan ve la página aunque `_is_paying_member` no le deje entrar al programa.

## Endurecimiento (menor)
- [ ] **CSP en el HTML de Pages** (G-10). Es el mayor hueco de seguridad abierto.
      Verificar en navegador: el meta no admite report-only.
- [ ] **`FRONTEND_URL` obligatoria en producción.** Hoy cae a
      `https://tradingcalculatorpro.com` por defecto en cuatro sitios de
      `server.py`, que es un dominio que no se está sirviendo.
- [ ] **C-08**: quitar el override por BD de las API keys (`sendgrid_api_key` sigue
      en `app_settings`); dejar sólo Secret Manager.
- [ ] Sustituir `detail=str(e)` por mensajes genéricos en los **10** puntos que lo
      usan (evita filtrar texto de error interno). No es fuga de datos de usuario.
- [ ] **`check-doc-links.py` en CI** (G-18) — 3 líneas, y esta lista deja de
      acumular referencias a documentos que no existen.
