# 🚀 TradingCalculator.pro — Guía Completa Google Cloud Setup

> ⚠️ **Este documento describe el proyecto ACTUAL.** El proyecto y la región no
> están fijados en el workflow: salen de las variables de repositorio
> `GCP_PROJECT` y `GCP_REGION` (ver `cloudbuild.yaml`).
> Si cambias de proyecto, ajusta esas variables — no hace falta tocar el YAML.
>
> Antes este documento decía `us-central1` mientras el deploy real usaba
> `europe-west1`. No era un detalle: el nombre de conexión de Cloud SQL lleva la
> región dentro, así que seguir el doc al pie de la letra creaba una instancia a
> la que el servicio no se podía conectar.

**Proyecto GCP:** `tradingcalculatorpro-502817`  
**Región:** `europe-west1` (Bélgica)  
**Repositorio:** `abcde-rgb/Tradingcalculatorpro.com`

---

## 📋 PASO 1 — Habilitar APIs de Google Cloud

Ejecuta esto UNA SOLA VEZ en Google Cloud Shell o tu terminal con `gcloud` instalado:

```bash
gcloud config set project tradingcalculatorpro-502817

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

---

## 🐳 PASO 2 — Crear Artifact Registry (repositorio de imágenes Docker)

```bash
gcloud artifacts repositories create trading-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Imágenes Docker de TradingCalculator.pro"
```

---

## 🔐 PASO 3 — Crear Service Account con permisos

```bash
# Crear la cuenta de servicio del backend
gcloud iam service-accounts create trading-backend-sa \
  --display-name="TradingCalculator Backend" \
  --description="SA para Cloud Run backend de TradingCalculator.pro"

# Asignar permisos necesarios
for ROLE in \
  roles/cloudsql.client \
  roles/secretmanager.secretAccessor \
  roles/logging.logWriter \
  roles/monitoring.metricWriter \
  roles/artifactregistry.reader; do
  gcloud projects add-iam-policy-binding tradingcalculatorpro-502817 \
    --member="serviceAccount:trading-backend-sa@tradingcalculatorpro-502817.iam.gserviceaccount.com" \
    --role="$ROLE"
done

echo "✅ Service Account creada con todos los permisos"
```

---

## 🔑 PASO 4 — Guardar Secrets en Secret Manager

Esto reemplaza el archivo `.env`. Las claves se guardan de forma segura en GCP:

```bash
# JWT Secret (genera uno nuevo)
JWT_VAL=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
echo -n "$JWT_VAL" | gcloud secrets create JWT_SECRET --data-file=-
echo "Tu JWT_SECRET: $JWT_VAL  ← guárdalo en un lugar seguro"

# Database URL (Cloud SQL con socket Unix para Cloud Run)
echo -n "postgresql://trading_user:TU_PASSWORD@/trading_db?host=/cloudsql/tradingcalculatorpro-502817:europe-west1:trading-db" \
  | gcloud secrets create DATABASE_URL --data-file=-

# Google OAuth Client ID
echo -n "TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com" \
  | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-

# Stripe
echo -n "sk_live_TU_STRIPE_KEY" | gcloud secrets create STRIPE_API_KEY --data-file=-

# SendGrid
echo -n "SG.TU_SENDGRID_KEY" | gcloud secrets create SENDGRID_API_KEY --data-file=-

echo "✅ Todos los secrets guardados en Secret Manager"
```

**Para actualizar un secret existente:**
```bash
echo -n "NUEVO_VALOR" | gcloud secrets versions add NOMBRE_SECRET --data-file=-
```

---

## 🗄️ PASO 5 — Crear Cloud SQL (PostgreSQL)

```bash
# Crear instancia (tarda ~5 minutos)
gcloud sql instances create trading-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4

# Crear base de datos
gcloud sql databases create trading_db --instance=trading-db

# Crear usuario
gcloud sql users create trading_user \
  --instance=trading-db \
  --password=GENERA_UN_PASSWORD_SEGURO

echo "✅ Cloud SQL PostgreSQL creado: tradingcalculatorpro-502817:europe-west1:trading-db"
```

---

## 🔗 PASO 6 — Configurar Workload Identity Federation (GitHub → GCP sin claves JSON)

```bash
# Crear pool de identidades
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# Crear proveedor OIDC
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Obtener el nombre completo del pool
POOL_NAME=$(gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --format='value(name)')

# Permitir que el repositorio específico use la SA
gcloud iam service-accounts add-iam-policy-binding \
  trading-backend-sa@tradingcalculatorpro-502817.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/abcde-rgb/Tradingcalculatorpro.com"

# Obtener los valores para los GitHub Secrets
PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --format='value(name)')

echo "======================================================"
echo "Guarda estos valores como GitHub Secrets:"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER = $PROVIDER"
echo "GCP_SERVICE_ACCOUNT = trading-backend-sa@tradingcalculatorpro-502817.iam.gserviceaccount.com"
echo "======================================================"
```

---

## ⚙️ PASO 7 — Agregar GitHub Secrets

Ve a: **GitHub → tu repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Valor |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | El valor del comando anterior |
| `GCP_SERVICE_ACCOUNT` | `trading-backend-sa@tradingcalculatorpro-502817.iam.gserviceaccount.com` |

---

## ✅ PASO 8 — Verificar el deploy

Después de hacer `git push` a `main`, el workflow arranca automáticamente.

```bash
# Ver el estado del servicio
gcloud run services describe tradingcalculator-api \
  --region=europe-west1 \
  --format='table(status.url,spec.template.spec.containers[0].image)'

# Ver logs en tiempo real
gcloud run services logs tail tradingcalculator-api --region=europe-west1

# Ver métricas básicas
gcloud run services describe tradingcalculator-api \
  --region=europe-west1 \
  --format='value(status.observedGeneration,status.conditions)'
```

---

## 📊 PASO 9 — Analytics y Monitoreo

```bash
# Crear dashboard de monitoreo
gcloud monitoring dashboards create --config-from-file=monitoring/dashboard.json

# Crear alerta de errores 5xx
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/alert-policy.json
```

O ve directamente a:  
🔗 https://console.cloud.google.com/monitoring/dashboards?project=tradingcalculatorpro-502817

---

## 💰 Costes estimados (uso normal)

| Servicio | Coste mensual estimado |
|---|---|
| Cloud Run (backend) | ~$5-15/mes (escala a 0 cuando no hay tráfico) |
| Cloud SQL db-f1-micro | ~$7/mes |
| Artifact Registry | ~$1/mes |
| Secret Manager | ~$0.06/mes |
| Logging/Monitoring | Gratis (tier básico) |
| **Total estimado** | **~$13-23/mes** |

---

## 🛠️ Comandos de emergencia

```bash
# Rollback a versión anterior
gcloud run services update-traffic tradingcalculator-api \
  --region=europe-west1 \
  --to-revisions=REVISION_ANTERIOR=100

# Ver revisiones disponibles
gcloud run revisions list --service=tradingcalculator-api --region=europe-west1

# Escalar a 0 manualmente (parar el servicio)
gcloud run services update tradingcalculator-api \
  --region=europe-west1 \
  --max-instances=0
```
