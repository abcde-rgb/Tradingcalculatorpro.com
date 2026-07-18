# 🚚 Migración del backend a una cuenta de Google Cloud NUEVA (desde 0)

> Objetivo: montar el backend (Cloud Run) en **tu** cuenta de Google Cloud, desde cero,
> con la **base de datos en Neon (gratis)** y el mínimo coste posible.
>
> **Decisiones aplicadas:** BD **Neon** (us-east-1) · Cloud Run región **us-east1** (misma costa que
> tu Neon → baja latencia, tarifa barata) · **BD vacía** (empezar de 0) · **min-instances=0** (escala a
> cero = ~€0 en reposo) · **OAuth de Google nuevo** en la cuenta nueva.
>
> **La app (Python/React) NO cambia.** Solo cambia el "envoltorio" de despliegue, que ya está
> **parametrizado por variables** (no queda ningún ID del proyecto viejo en el repo).

---

## 0. Reparto de trabajo y "¿qué te tengo que dar?"

- **Yo (ya hecho):** dejé los workflows y `cloudbuild.yaml` parametrizados y un script
  `backend/setup-gcp.sh` que crea todo en tu proyecto nuevo. **No necesito ninguna clave tuya.**
- **Tú:** creas el proyecto en GCP, ejecutas 1 script en Cloud Shell, creas el cliente OAuth, y
  pegas unos valores en GitHub. Tus secretos (Neon, Stripe, etc.) **los pones tú**, nunca me los das.

**¿Consola o CLI?** Mixto (lo más fácil):
- **Consola web** para: crear cuenta/proyecto, activar facturación, crear el cliente OAuth.
- **Cloud Shell** (terminal en el navegador, sin instalar nada) para: ejecutar `setup-gcp.sh`, que
  hace el 90% del trabajo (APIs, Artifact Registry, Service Account, Workload Identity, Secret Manager).

---

## 1. Crear proyecto en Google Cloud (consola)

1. Entra en <https://console.cloud.google.com> con tu cuenta nueva.
2. Arriba, selector de proyecto → **Proyecto nuevo** → nombre p. ej. `tradingcalc-prod` → **Crear**.
3. Apunta el **Project ID** (algo como `tradingcalc-prod-123456`).
4. **Facturación**: menú → *Facturación* → vincula una tarjeta. (Sin billing, Cloud Run no despliega.)
   Con min-instances=0 + Neon, el coste en reposo es ~€0; solo pagas Cloud Run por uso real.

## 2. La base de datos (Neon — ya la tienes)

Ya creaste el proyecto en Neon (`us-east-1`). Solo necesitas la **cadena de conexión DIRECTA**:
- En Neon → *Connection Details* → copia la URL. Usa la **directa** (sin `-pooler`), con
  `?sslmode=require`. Es la que empieza por `postgresql://neondb_owner:...@ep-...us-east-1.aws.neon.tech/neondb?sslmode=require`.
- ⚠️ **Es un secreto.** No lo pongas en el repo ni me lo pegues por chat sin necesidad: lo introduces
  tú en el script del paso 3. (La BD arranca vacía; las tablas se crean solas al primer inicio.)

## 3. Ejecutar el setup en Cloud Shell (crea todo en GCP)

1. En la consola, arriba a la derecha, pulsa el icono **`>_` (Activar Cloud Shell)**.
2. Clona el repo (o súbelo) y entra en `backend/`:
   ```bash
   git clone https://github.com/abcde-rgb/Tradingcalculatorpro.com.git
   cd Tradingcalculatorpro.com/backend
   ```
3. Ejecuta el script con **tus** valores (sustituye `TU_PROJECT_ID` y pega tu URL de Neon):
   ```bash
   PROJECT_ID=TU_PROJECT_ID \
   REGION=us-east1 \
   DB_PROVIDER=neon \
   NEON_DATABASE_URL='postgresql://neondb_owner:...@ep-...us-east-1.aws.neon.tech/neondb?sslmode=require' \
   GITHUB_REPO='abcde-rgb/Tradingcalculatorpro.com' \
   bash setup-gcp.sh
   ```
   El script te pedirá los valores reales de `GOOGLE_CLIENT_ID`, `STRIPE_API_KEY`, `SENDGRID_API_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` (puedes pulsar Enter y editarlos luego en Secret Manager).
4. Al terminar imprime **exactamente** lo que tienes que poner en GitHub (paso 5). Cópialo.

Qué crea: APIs activadas · Artifact Registry `trading-repo` · Service Account
`trading-backend-sa@…` con permisos · Workload Identity (deploy sin claves JSON) · todos los secretos
en Secret Manager (incluida `DATABASE_URL` = tu Neon). **No** crea Cloud SQL (usas Neon).

## 4. Cliente OAuth de Google NUEVO (consola)

1. Consola → *APIs y servicios* → *Pantalla de consentimiento OAuth* → configúrala (External, nombre
   de la app, email de soporte). Publícala (o añádete como usuario de prueba).
2. *APIs y servicios* → *Credenciales* → **Crear credenciales** → *ID de cliente de OAuth* → tipo
   **Aplicación web**.
3. **Orígenes autorizados de JavaScript** (añade los dos):
   - `https://abcde-rgb.github.io`
   - `https://tradingcalculatorpro.com` (si usas el dominio propio)
4. Crea → copia el **Client ID** (`....apps.googleusercontent.com`).
5. Actualiza el secreto en Secret Manager y guarda el mismo valor para el frontend:
   ```bash
   printf '%s' 'TU_CLIENT_ID.apps.googleusercontent.com' | gcloud secrets versions add GOOGLE_CLIENT_ID --data-file=-
   ```
   (El mismo Client ID va también como **variable de GitHub** `REACT_APP_GOOGLE_CLIENT_ID`, paso 5.)

## 5. Configurar GitHub (repo → Settings → Secrets and variables → Actions)

**🔐 Secrets** (los imprime el script + OAuth):
| Secret | Valor |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | lo imprime el script (`projects/…/providers/github-provider`) |
| `GCP_SERVICE_ACCOUNT` | `trading-backend-sa@TU_PROJECT_ID.iam.gserviceaccount.com` |
| `REACT_APP_BACKEND_URL` | **se rellena tras el paso 6** con la URL de Cloud Run |

**🔧 Variables:**
| Variable | Valor |
|---|---|
| `GCP_PROJECT` | tu Project ID nuevo |
| `GCP_REGION` | `us-east1` |
| `DB_PROVIDER` | `neon` |
| `MIN_INSTANCES` | `0` |
| `REACT_APP_GOOGLE_CLIENT_ID` | tu Client ID de OAuth (paso 4) |

> Si ya usabas GitHub Secrets del frontend (`REACT_APP_GA4_MEASUREMENT_ID`, etc.), déjalos.

## 6. Primer deploy del backend

- Haz un commit a `main` que toque `backend/**`, **o** ve a *Actions → Deploy Backend → Cloud Run →
  Run workflow*.
- Cuando termine, copia la **URL de Cloud Run** (la imprime el paso "Obtener URL"; también en
  *Cloud Run → tu servicio*). Será algo como `https://tradingcalculator-api-xxxxx-ue.a.run.app`.
- Verifícalo: abre `https://…run.app/api/health` → debe responder OK.

## 7. Conectar el frontend al nuevo backend

1. GitHub → Secret `REACT_APP_BACKEND_URL` = la URL de Cloud Run del paso 6 (**sin** `/api`).
2. Dispara el deploy del frontend: *Actions → Deploy → GitHub Pages → Run workflow* (o un commit en
   `frontend/**`). El sitio quedará apuntando al backend nuevo.

## 8. Post-deploy (imprescindible para pagos y login)

- **Google OAuth**: si al probar el login falla, revisa que los *orígenes autorizados* del cliente
  OAuth incluyen tu dominio del frontend (paso 4.3).
- **Stripe webhook**: en Stripe → *Developers → Webhooks*, apunta el endpoint a
  `https://…run.app/api/webhook/stripe` y copia el nuevo *Signing secret* a Secret Manager
  (`STRIPE_WEBHOOK_SECRET`). Redeploy backend.
- **Verifica**: registro + login, una calculadora premium, y `/api/health`.

---

## ⚠️ Orden seguro para no romper nada al mergear la config

Los workflows ahora exigen la variable `GCP_PROJECT`. **Antes de mergear** esta rama a `main`:

- Si aún NO vas a cortar al proyecto nuevo: pon en GitHub la variable `GCP_PROJECT` con tu proyecto
  **actual** (`tradingcalculator-495806`) y `GCP_REGION=europe-west1`. Así los despliegues siguen igual
  que ahora y nada se rompe.
- Cuando ya tengas el proyecto nuevo listo (pasos 1-5): **cambia** las variables/secretos a los nuevos
  (`GCP_PROJECT`, `GCP_REGION=us-east1`, `DB_PROVIDER=neon`, y los secretos `GCP_WORKLOAD_IDENTITY_PROVIDER`
  / `GCP_SERVICE_ACCOUNT`) y lanza el deploy. Ese es el "cutover".

## 💶 Coste estimado (setup elegido)

- **Neon**: plan gratis → **0 €**.
- **Cloud Run** con `min-instances=0`: **0 €** en reposo; pagas solo por peticiones reales (los
  primeros ~2M req/mes y CPU/mem tienen capa gratuita generosa). Un arranque en frío añade ~2-4 s al
  primer usuario tras inactividad.
- **Artifact Registry / Secret Manager / logs**: céntimos.
- **Sin Cloud SQL** → te quitas el mayor coste fijo que tenías antes.

Resumen: en reposo ≈ **0 €**; escala sola cuando llega tráfico. Justo lo que pediste.

---

## Apéndice — qué quedó parametrizado en el repo (para referencia)

- `.github/workflows/deploy-cloud-run.yml`: `GCP_PROJECT` / `GCP_REGION` / `SERVICE_NAME` / `AR_REPO`
  / `RUNTIME_SA` salen de variables; imagen y Cloud SQL se derivan; `DB_PROVIDER` y `MIN_INSTANCES`
  ya existían como variables.
- `cloudbuild.yaml`: usa `$PROJECT_ID` (built-in) + substitutions `_REGION/_AR_REPO/_SERVICE/_MIN_INSTANCES`.
- `backend/setup-gcp.sh`: parametrizado y compatible con Neon (`DB_PROVIDER=neon`).
- El código de conexión (`init_pool` en `server.py`) ya soporta Neon (TCP+SSL) sin cambios.
