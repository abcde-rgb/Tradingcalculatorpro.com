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
- [x] ~~**`trading_plans` no se borra ni se exporta.**~~ ✅ **Cerrado
      (2026-08-06, BUG-044).** Y no parcheando las tres listas sino la causa:
      las cuatro derivan hoy de una sola tupla, `_USER_DATA_COLLECTIONS` →
      `_ALL_USER_COLLECTIONS` → `_EXPORTABLE_COLLECTIONS`, así que una
      colección nueva las hereda. `test_user_data_collections_unit.py` fija que
      lo que se purga se borra y lo que se borra se puede exportar. Verificado
      contra Postgres real el 2026-08-07.
      *Esta línea siguió diciendo lo contrario durante dos semanas y la cazó
      `auditar.py` en el examen del 2026-08-23: una tarea pendiente que ya está
      hecha no es ruido inofensivo, es alguien rehaciéndola.*


## Componentes escritos y nunca conectados

El 2026-08-24 se retiró el **andamiaje de shadcn/ui que nunca se usó** (16
componentes, 1.334 líneas) y los **15 paquetes** que sólo servían a esos
ficheros. No aligera el bundle —código que nadie importa no entra en él— pero sí
`node_modules`, el tiempo de instalación y la superficie que hay que auditar.
Se regeneran con `npx shadcn@latest add <nombre>` el día que hagan falta.

Quedan **cuatro componentes propios**: trabajo terminado que no cuelga de
ninguna pantalla. Cada uno con su decisión, para que la lista no vuelva a ser
un recuento sin dueño:

- [ ] **`education/TradingBasicsGuide.jsx` (671 líneas) — decisión del dueño.**
      Guía de largo/corto con diagramas SVG propios y **135 claves i18n que no
      usa nada más**, traducidas a los diez idiomas: ~14 KB del diccionario que
      cada visitante descarga, más 138 KB en el repositorio. Las dos salidas son
      legítimas y llevan a sitios distintos, así que no se toma sola: **(a)**
      colgarla de la Academia —es contenido acabado y hoy son 86 módulos— o
      **(b)** retirarla con sus 135 claves × 10 idiomas. Lo que no vale es
      dejarla como está: se paga el peso sin que nadie la lea.
- [ ] **`options/GreeksPanel.jsx` (127 líneas).** Lo sustituyó `GreeksDisplay`,
      que sí está montado en el panel de opciones. Retirar; comprobar antes que
      no tenga nada que el vivo no haga.
- [ ] **`dashboard/PriceTicker.jsx` (79 líneas).** Sin pantalla. Ojo: lee precio
      en vivo, así que antes de reconectarlo tiene que respetar `stale`/`as_of`
      de la cascada de `market_data.py` — pintar un precio viejo como fresco es
      exactamente BUG-060.
- [ ] **`education/WhyItMatters.jsx` (60 líneas).** Retirar salvo que se quiera
      dentro de la Academia.

## Autenticación

- [ ] **La revocación de sesión mata el token del mismo segundo.**
      `_revoke_user_sessions` guarda `revoked_after` con **microsegundos**
      (`datetime.now(timezone.utc)`) y el `iat` del JWT se codifica en segundos
      enteros, así que un token emitido a las 10:00:00**.8** lleva `iat` =
      10:00:00**.0** y pierde contra una revocación de 10:00:00**.5**: quien
      cambia la contraseña y vuelve a entrar dentro del mismo segundo recibe un
      token que el backend da por revocado. Falla **cerrado** —rechaza un token
      válido, no acepta uno muerto—, así que es usabilidad, no un agujero.
      **El arreglo ya está escrito** en la rama
      `claude/anthropic-cybersecurity-skills-nqqmr1` (PR #207), que además hay
      que renumerar: llama BUG-058 a esto y en `main` ese número ya es la regla
      de inyección en logs. Encontrado al inventariar las ramas el 2026-08-24.

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
## Datos de mercado (mejora de fiabilidad vs Yahoo)
- [ ] Integrar **Binance** (spot cripto, sin key) detrás de `get_ohlc_history`.
- [ ] Integrar **Hyperliquid** (perps/funding/OI + posiciones on-chain como
      diferenciador) — módulo `hyperliquid.py`.
- [ ] Integrar **Twelve Data** (global: acciones EU/forex/índices) como reemplazo
      de Yahoo; Yahoo como *fallback*. Ver estudio en el chat / `CRECIMIENTO_GOOGLE.md`.

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
      (hoy se guarda en unidades distintas según la vía de pago). Ver `CRECIMIENTO_GOOGLE.md`.

## Infraestructura (coste casi-gratis)
- [ ] Migrar BD a **Neon** (`DB_PROVIDER=neon`) + `MIN_INSTANCES=0`. Ver
      `CHECKLIST_MODO_CASI_GRATIS.md` y `MIGRACION_NEON.md`.

## Contenido / producto (aparcados en sesiones previas)
- [ ] **Futuros** como instrumento propio en el diario (multiplicador punto/tick).
- [ ] **Borrado de cuenta** completo (vs solo-datos).
- [ ] **Cloud Scheduler** para la purga diaria de retención (hoy solo al arrancar).
- [ ] **Traducir micro-etiquetas** en inglés de los diagramas visuales de Educación.
- [ ] **Construir la Fase 1** del técnico avanzado (Volume Profile, falso rompimiento,
      objetivos Ichimoku, TD Sequential). Spec en `DETALLE_TECNICAS_IMPLEMENTACION.md`.

## SimulatorPro (mejoras aplicadas — conservando su esencia de largo plazo)
- [x] **Curva = escenario mediano de 1000 simulaciones** (Monte-Carlo de la MISMA
      config multi-fase). Sigue siendo una única curva de capital a largo plazo,
      pero representativa y estable, no un único camino con suerte. La aleatoriedad
      se muestra ahora como *rango* (p5 / p50 / p95), no como ruido en la curva.
- [x] **Panel "Rango a largo plazo"**: pesimista (peor 5%), mediano, optimista
      (mejor 5%), probabilidad de beneficio, peor drawdown y peor racha perdedora.
- [x] **Bug corregido**: en modo *sin* interés compuesto el saldo final quedaba
      igual al inicial (no acumulaba P&L). Ahora acumula y usa tamaño de posición
      fijo sobre el saldo inicial.
- [x] **Comisión sobre el nocional** (tamaño de posición), no sobre el |P&L| —
      como cobran realmente brokers/exchanges.
- [x] **Bug corregido**: `winRate/posSize/tp/sl/numOps` en 0 se trataban como el
      valor por defecto (`|| default`) → ahora `?? default` respeta el 0.
- [x] **Rachas** ganadora/perdedora máximas añadidas a métricas avanzadas.
- [x] **PRNG con semilla** (`mulberry32`) → resultados reproducibles.
- [ ] *Opcional futuro*: control de nº de simulaciones en la UI (hoy fijo a 1000)
      y banda p5–p95 sombreada sobre la propia curva de capital.

## Endurecimiento (menor)
- [ ] Sustituir `detail=str(e)` por mensajes genéricos en los endpoints que lo usan
      (evita filtrar texto de error interno). No es fuga de datos de usuario.
