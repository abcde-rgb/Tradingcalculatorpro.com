# Pendientes (cosas que faltan / a completar)

> Lista viva de tareas abiertas y "placeholders" que hay que sustituir cuando
> haya datos reales. Marca la casilla al cerrarlas.

## Referidos / partners
- [ ] **Hyperliquid — enlace de referido real.** Ahora usa un placeholder
      (`https://app.hyperliquid.xyz/`) en `components/common/RecommendedTools.jsx`.
      Sustituir por el enlace de referido cuando el usuario lo facilite.
- [ ] **Hyperliquid — logo oficial.** Ahora usa un SVG placeholder
      (`assets/partners/hyperliquid-square.svg`). Sustituir por el logo oficial
      (`hyperliquid-square.png`, cuadrado) y actualizar el import.

## Datos de mercado (mejora de fiabilidad vs Yahoo)
- [ ] Integrar **Binance** (spot cripto, sin key) detrás de `get_ohlc_history`.
- [ ] Integrar **Hyperliquid** (perps/funding/OI + posiciones on-chain como
      diferenciador) — módulo `hyperliquid.py`.
- [ ] Integrar **Twelve Data** (global: acciones EU/forex/índices) como reemplazo
      de Yahoo; Yahoo como *fallback*. Ver estudio en el chat / `CRECIMIENTO_GOOGLE.md`.

## Analítica / Google
- [ ] En **GA4**: marcar `sign_up`, `begin_checkout`, `purchase` como conversiones.
- [ ] `purchase` con `value`: requiere **normalizar el importe** en backend
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

## Endurecimiento (menor)
- [ ] Sustituir `detail=str(e)` por mensajes genéricos en los endpoints que lo usan
      (evita filtrar texto de error interno). No es fuga de datos de usuario.
