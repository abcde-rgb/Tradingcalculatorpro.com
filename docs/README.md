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
| [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) | **Fuente de verdad.** Semáforo, inventario, huecos, backlog y registro de sesiones. Se actualiza al cerrar cada sesión | 2.996 |
| [`../CLAUDE.md`](../CLAUDE.md) | Arquitectura real y trampas conocidas. Lectura obligatoria antes de tocar código | 302 |
| [`DIARIO_BUGS.md`](./DIARIO_BUGS.md) | Historial de bugs con su causa raíz. Se consulta para no repetir un error ya pagado | 450 |
| [`PENDIENTES.md`](./PENDIENTES.md) | Lo inmediato, en crudo. Revisado contra el código el 2026-08-03 | 97 |

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
| [`EXAMEN_FINAL_2026-07-26.md`](./EXAMEN_FINAL_2026-07-26.md) | 2026-07-26 |
| [`AUDITORIA_2026-07-27.md`](./AUDITORIA_2026-07-27.md) | 2026-07-27 |
| [`BACKLOG_AUDITORIA_2026-07-27.md`](./BACKLOG_AUDITORIA_2026-07-27.md) | 2026-07-27 |
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
  `ESTADO_PROYECTO.md` y `DIARIO_BUGS.md` son las dos excepciones: son vivos.
- **Los enlaces relativos se verifican.** `python scripts/check-doc-links.py`
  falla si un enlace markdown apunta a un archivo que no existe. Ya pasó que un
  doc citara un archivo inexistente y nadie lo detectara.
- Al cerrar sesión, el skill [`estado-proyecto`](../.claude/skills/estado-proyecto/SKILL.md)
  obliga a actualizar `ESTADO_PROYECTO.md`.
