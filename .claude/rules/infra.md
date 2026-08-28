---
paths:
  - ".github/workflows/**"
  - "backend/Dockerfile"
  - "backend/setup-gcp.sh"
  - "backend/requirements.txt"
---

# Infraestructura y despliegue

## Qué se despliega solo y qué no

| Trigger | Resultado |
|---|---|
| Push a `main` con cambios en `frontend/**` | `deploy-gh-pages.yml` → GitHub Pages |
| Push a `main` con cambios en `backend/**` | **Cloud Run source deploy** → `tradingcalculator-api` en `us-east1` |

**Las dos mitades salen solas.** El backend NO se despliega a mano.

⚠️ **Esta tabla decía lo contrario hasta el 2026-08-25**: que el backend no salía
nunca solo y que había que lanzar `cloudbuild.yaml` desde GCP. Era falso, y llevaba
siéndolo desde que se conectó el despliegue desde código —el repositorio de imágenes
`cloud-run-source-deploy` se creó el **2026-07-19**—. Nadie lo notó porque un
despliegue que ocurre solo no produce ninguna señal, y la documentación que dice
«esto no pasa» tampoco.

Se descubrió por el camino más caro: se le dijo al propietario que lanzara
`gcloud builds submit`, dio error, y al investigarlo apareció que el servicio vivo
corría ya el commit del último merge.

### Cómo está montado de verdad (comprobado el 2026-08-25)

| Qué | Valor |
|---|---|
| Servicio | `tradingcalculator-api`, **`us-east1`** (no `europe-west1`) |
| URL | `https://tradingcalculator-api-2rkq2snofq-ue.a.run.app` |
| Imágenes | `us-east1-docker.pkg.dev/<proy>/cloud-run-source-deploy/…` |
| Configuración | **15 variables de entorno en el propio servicio**, no `--update-secrets` |
| Base de datos | Externa, por `DATABASE_URL`. **No hay Cloud SQL** — la API `sqladmin` ni está habilitada |

Cómo comprobar qué está corriendo ahora mismo:

```bash
gcloud run services describe tradingcalculator-api --region=us-east1 \
  --format='value(spec.template.spec.containers[0].image)'   # la etiqueta es el SHA del commit
gcloud run revisions list --service=tradingcalculator-api --region=us-east1 --limit=3
```

⚠️ **No uses `describe` a secas para mirar la configuración**: imprime las variables
de entorno CON sus valores, y ahí va la cadena de conexión con contraseña. Para ver
sólo los nombres, `--format='value(spec.template.spec.containers[0].env[].name)'`.

### `cloudbuild.yaml` se retiró el 2026-08-25

Describía un montaje que no existe: `europe-west1`, un repositorio `trading-repo`,
una cuenta de servicio `trading-backend-sa`, siete secretos en Secret Manager y una
instancia de Cloud SQL `trading-db`. **Ninguno existe en el proyecto.** Lanzarlo no
sólo fallaba: si hubiera llegado al final habría creado un **segundo servicio en
Europa** mientras el frontend sigue apuntando al de EE. UU.

Un plan B que no funciona no es un plan B. Ver `docs/DECISIONES.md`.

Auth de GCP en Actions: **Workload Identity Federation**, sin claves JSON.

## Ajustes que parecen tuning y son decisiones

- **`min-instances`** (variable de repo `MIN_INSTANCES`, por defecto `1`): intencionado
  para evitar arranques en frío en una app financiera. A `0` se ahorra coste a cambio de
  2–4 s para el primer usuario tras inactividad.
- **`DB_PROVIDER`**: vacío/`cloudsql` monta el socket de Cloud SQL; `neon` conecta por
  TCP+SSL con el secreto `DATABASE_URL`. `init_pool` soporta ambos.
  Guía: [`docs/MIGRACION_NEON.md`](../../docs/MIGRACION_NEON.md).
- **`samesite=none` + `secure`** en cookies: obligatorio porque frontend (Pages) y backend
  (Cloud Run) son dominios distintos. Requiere HTTPS. **No lo toques.**
- **`ENVIRONMENT`** no se setea en producción → cae a `"production"`. En local,
  `ENVIRONMENT=development`.

## `init_pool` trata todo host TCP como si fuera Neon

Exige SSL verificado, así que un Postgres local sin SSL falla con
`CERTIFICATE_VERIFY_FAILED` (hueco G-11). En local, conecta **por socket Unix**:

```
DATABASE_URL='postgresql://user:pass@/trading_dev?host=/var/run/postgresql'
```

## Los secretos nunca entran al repo

Sólo `.env.example` + Secret Manager (backend) / GitHub Secrets (frontend).

⚠️ **C-08 sigue abierto**: `sendgrid_api_key`, `revolut_api_key`, `nowpayments_api_key` y
`coinbase_api_key` se pueden sobreescribir desde `app_settings` (BD, en claro). La
decisión tomada fue **sólo Secret Manager**; falta ejecutarla. Y `coinbase_api_key` está
muerto: es de una pasarela retirada.

## La purga por retención no tiene planificador

`purge_lapsed_user_data` sólo corre en `startup_event`. Con `min-instances=1`, un
contenedor que no se reinicie en semanas **no purga nada**. Falta un Cloud Scheduler.

## Dependencias

11 PRs de Dependabot abiertos, el más viejo del 14 de julio. `numpy` y `scipy` sostienen
Black-Scholes y las griegas: hay 761 funciones de test para respaldar el salto, y saltar
cinco versiones menores de golpe más adelante duele más.
