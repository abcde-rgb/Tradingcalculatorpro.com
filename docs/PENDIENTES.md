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
