# Documentación de TradingCalculator.Pro

Mapa de los documentos del proyecto. **Si no sabes por dónde empezar, empieza por
[`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md)** — es la fuente de verdad de qué hay
hecho, qué falta y qué toca probar.

Los documentos están agrupados por **para qué los vas a abrir**, no por tema. Un
doc de 1.400 líneas sobre técnicas de implementación y una checklist de 111 no se
leen en el mismo momento ni con la misma intención.

---

## 🟢 Empieza aquí

| Documento | Para qué | Tamaño |
|---|---|---|
| [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) | **Fuente de verdad del estado.** Semáforo, inventario, huecos `G-xx`, plan de test y backlog. Criterio, no conteos | 414 |
| [`MAPA.md`](./MAPA.md) | **Dónde está cada cosa.** Módulos, rutas con `fichero:línea`, rutas sin consumidor, carpetas y ficheros grandes. **Generado** — `--check` en CI | generado |
| [`RUTAS_MUERTAS.md`](./RUTAS_MUERTAS.md) | **Qué se hace con cada ruta que ninguna pantalla llama** (borrar / construir / arreglar). El mapa las cuenta; esto las decide. `check-rutas-muertas.py` en CI | 130 |
| [`../CLAUDE.md`](../CLAUDE.md) | Invariantes que aplican siempre. Se carga en cada sesión; lo específico por zona vive en `.claude/rules/` | 173 |
| [`DIARIO_BUGS.md`](./DIARIO_BUGS.md) | Historial de bugs con su causa raíz. Se consulta para no repetir un error ya pagado | 589 |
| [`REGISTRO_SESIONES.md`](./REGISTRO_SESIONES.md) | Histórico de 150 sesiones. **No se lee entero** (~5.700 líneas): se busca por fecha o palabra | 5.701 |
| [`PENDIENTES.md`](./PENDIENTES.md) | Lo inmediato, en crudo. ⚠️ Con datos caducados: ver auditoría del 13-08 §3.3 | 97 |

## 🔧 Voy a escribir código

| Documento | Para qué |
|---|---|
| [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) | Cómo añadir una calculadora, página, endpoint, idioma o sección admin sin romper nada |
| [`ESCANER_ESTRUCTURA.md`](./ESCANER_ESTRUCTURA.md) | Manual del escáner de estructura de precio (`price_action.py`): swings, BOS/CHoCH, FVG |
| [`TRADINGVIEW_PERSONALIZACION.md`](./TRADINGVIEW_PERSONALIZACION.md) | Gráficos y personalización por usuario |
| [`MIGRACION_NEON.md`](./MIGRACION_NEON.md) | Conmutar la BD entre Cloud SQL y Neon (`DB_PROVIDER`) |
| [`PLAN_DE_TRADING_spec.md`](./PLAN_DE_TRADING_spec.md) | Especificación del plan de trading versionado. **Backend terminado; sigue sin una sola pantalla** (G-14) |

## 🚀 Voy a desplegar

| Documento | Para qué |
|---|---|
| [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) | **Checklist de lanzamiento.** Repásala entera antes de publicar |
| [`setup/GOOGLE_CLOUD_SETUP.md`](./setup/GOOGLE_CLOUD_SETUP.md) | Alta de Cloud Run, Cloud SQL, Secret Manager y Workload Identity |
| [`setup/GOOGLE_OAUTH_SETUP.md`](./setup/GOOGLE_OAUTH_SETUP.md) | Credenciales de Google OAuth |
| [`PUBLICAR_EN_TIENDAS.md`](./PUBLICAR_EN_TIENDAS.md) | Empaquetado para Play Store / App Store (TWA) |
| [`MIGRACION_DOMINIO.md`](./MIGRACION_DOMINIO.md) | Activar el dominio propio `tradingcalculatorpro.com` (hoy se sirve en `github.io`) |

## 📈 Voy a captar usuarios

| Documento | Para qué |
|---|---|
| [`setup/SEO_GUIDE.md`](./setup/SEO_GUIDE.md) | Dónde vive cada pieza de SEO y cómo cambiarla |
| [`CAPTAR_TRAFICO.md`](./CAPTAR_TRAFICO.md) | Canales de adquisición |
| [`PROGRAMA_AFILIADOS.md`](./PROGRAMA_AFILIADOS.md) | Comisiones, tramos y solicitudes de pago |
| [`ESTUDIO_UBICACION_WEB.md`](./ESTUDIO_UBICACION_WEB.md) | Dónde colocar cada cosa en la web |

## 🧠 Contenido y formación

| Documento | Para qué |
|---|---|
| [`PLAN_ACADEMIA.md`](./PLAN_ACADEMIA.md) | Estructura de la academia |
| [`EDUCATION_BACKLOG.md`](./EDUCATION_BACKLOG.md) | Módulos formativos pendientes |
| [`ESTUDIO_APRENDIZAJE.md`](./ESTUDIO_APRENDIZAJE.md) | Cómo se aprende a operar (base pedagógica) |
| [`APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md`](./APRENDER_ICHIMOKU_PROFUNDO_Y_ESCUELA_RUSA.md) | Ichimoku y escuela rusa, a fondo |

## 🔬 Referencia técnica de trading

Documentos largos, de consulta. No se leen de una sentada.

| Documento | Para qué | Tamaño |
|---|---|---|
| [`DETALLE_TECNICAS_IMPLEMENTACION.md`](./DETALLE_TECNICAS_IMPLEMENTACION.md) | Cómo se implementa cada técnica | 1.411 |
| [`ANALISIS_TECNICO_AVANZADO.md`](./ANALISIS_TECNICO_AVANZADO.md) | Análisis técnico avanzado | 464 |
| [`DETECCION_ACCION_PRECIO_REPLICABLE.md`](./DETECCION_ACCION_PRECIO_REPLICABLE.md) | Detección de acción de precio, replicable | 347 |
| [`METODOS_INSTITUCIONALES_REPLICABLE.md`](./METODOS_INSTITUCIONALES_REPLICABLE.md) | Métodos institucionales | 339 |

## 📋 Auditorías y análisis (fechados)

Fotos de un momento concreto. Se leen por su fecha, no como estado actual.

| Documento | Fecha |
|---|---|
| [`CIERRE_RAMAS_2026-08-18.md`](./CIERRE_RAMAS_2026-08-18.md) | 2026-08-18 — **qué se hizo con cada rama sin fusionar, y por qué**. Cierra G-32 salvo cinco decisiones |
| [`AUDITORIA_REPOSITORIO_2026-08-13.md`](./AUDITORIA_REPOSITORIO_2026-08-13.md) | 2026-08-13 — **lo obsoleto, lo perdido en ramas sin fusionar y lo que se pasó por alto** |
| [`AUDITORIA_DIARIO.md`](./AUDITORIA_DIARIO.md) | 2026-08-06 — auditoría del diario de operaciones |
| [`AUDITORIA_2026-08-10.md`](./AUDITORIA_2026-08-10.md) — integral: contenido, cálculos, APIs, datos, normativa y admin | 2026-08-10 |
| [`EXAMEN_FINAL_2026-07-26.md`](./EXAMEN_FINAL_2026-07-26.md) | 2026-07-26 |
| [`AUDITORIA_2026-07-27.md`](./AUDITORIA_2026-07-27.md) | 2026-07-27 |
| [`BACKLOG_AUDITORIA_2026-07-27.md`](./BACKLOG_AUDITORIA_2026-07-27.md) | 2026-07-27 |
| [`COMPETENCIA_Y_PASARELA_BROKERS.md`](./COMPETENCIA_Y_PASARELA_BROKERS.md) — diario/setups/analítica frente a la competencia, pasarela de solo lectura y modelos de ingreso de brokers | 2026-08-11 |
| [`BROKERS_REFERIDOS.md`](./BROKERS_REFERIDOS.md) — expediente de los seis brókers para enlaces de referido: entidad, licencia, % de pérdidas y qué exigirle a cada uno. Ejecuta el §4 del anterior | 2026-08-22 |
| [`PROVEEDORES_DATOS.md`](./PROVEEDORES_DATOS.md) — candidatos de proveedor de datos de mercado para G-16 y para la cadena de reserva, rastreados sobre `public-apis`. **Ninguno adoptado**: no se pudo ver responder a ninguno desde este entorno | 2026-08-23 |
| [`PASARELA_KUNFUPAY.md`](./PASARELA_KUNFUPAY.md) — ¿puede Kunfupay sustituir a Stripe? Inventario de lo que Stripe hace hoy aquí, qué se cae al apagarlo, coste comparado y las diez preguntas que decide su soporte. **Nada adoptado**: su web está bloqueada desde este entorno y no tienen documentación de API pública | 2026-08-26 |
| [`ANALISIS_COMPETENCIA_2026-07-19.md`](./ANALISIS_COMPETENCIA_2026-07-19.md) | 2026-07-19 |
| [`ANALISIS_2026-06-25.md`](./ANALISIS_2026-06-25.md) | 2026-06-25 |
| [`ROADMAP_IDEAS.md`](./ROADMAP_IDEAS.md) | sin fecha |

## 🗄️ [`historico/`](./historico/)

Documentos que ya no describen el sistema actual y **no se mantienen**. Se
conservan por trazabilidad. Incluye el residuo de la plataforma Emergent
(`test_result.md`, un protocolo de comunicación entre agentes de un sistema
retirado) y análisis de mayo de 2026.

---

## Convenciones

- **La doc refleja el código real, no intenciones.** Antes de escribir que algo
  está hecho: compílalo, ejecútalo o léelo.
- **Un documento fechado no se actualiza**, se sustituye por otro con fecha nueva.
  `ESTADO_PROYECTO.md`, `DIARIO_BUGS.md` y `REGISTRO_SESIONES.md` son las excepciones:
  son vivos.
- **Lo que se puede contar no se escribe a mano.** Módulos, rutas, líneas, componentes y
  claves i18n van en [`MAPA.md`](./MAPA.md), que se genera con `scripts/gen-mapa.py` y
  cuyo `--check` corre en CI. Escribir un número a mano es garantizar que envejezca: la
  doc llegó a decir 24 módulos con 28 en el repo.
- **Los enlaces relativos se verifican.** `python scripts/check-doc-links.py`
  falla si un enlace markdown apunta a un archivo que no existe. Ya pasó que un
  doc citara un archivo inexistente y nadie lo detectara.
- Al cerrar sesión, el skill [`estado-proyecto`](../.claude/skills/estado-proyecto/SKILL.md)
  obliga a actualizar `ESTADO_PROYECTO.md`.
