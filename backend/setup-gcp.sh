#!/usr/bin/env bash
# =============================================================
# TradingCalculator.pro — Setup GCP para Cloud Run
# Ejecutar UNA VEZ antes del primer deploy.
# Requiere: gcloud CLI autenticado con una cuenta Owner/Editor.
# Uso: bash setup-gcp.sh
# =============================================================
set -euo pipefail

# ── Configuración ─────────────────────────────────────────────
PROJECT_ID="tradingcalculator-495806"
REGION="europe-west1"
DB_INSTANCE="trading-db"
DB_NAME="trading_calculator_pro"
DB_USER="trading_user"
SA_NAME="trading-backend-sa"
AR_REPO="trading-repo"
GITHUB_REPO="abcde-rgb/Tradingcalculatorpro.com"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/backend"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  TradingCalculator.pro — GCP Setup                  ║"
echo "║  Proyecto: ${PROJECT_ID}              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Seleccionar proyecto y activar APIs ─────────────────────
echo "▶  [1/8] Configurando proyecto y activando APIs..."
gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet

echo "    ✅ APIs activadas"

# ── 2. Artifact Registry ───────────────────────────────────────
echo "▶  [2/8] Creando Artifact Registry..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Backend Docker images" \
  --quiet 2>/dev/null || echo "    ℹ️  Repositorio ya existe"

echo "    ✅ Artifact Registry: ${IMAGE_BASE}"

# ── 3. Cloud SQL (PostgreSQL 15) ───────────────────────────────
echo "▶  [3/8] Creando instancia Cloud SQL (PostgreSQL 15)..."
echo "    ⏳ Esto puede tardar 5-10 minutos..."

DB_EXISTS=$(gcloud sql instances list --filter="name=${DB_INSTANCE}" --format="value(name)" 2>/dev/null || true)
if [ -z "${DB_EXISTS}" ]; then
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --storage-auto-increase \
    --storage-size=10GB \
    --storage-type=SSD \
    --availability-type=zonal \
    --quiet
  echo "    ✅ Instancia Cloud SQL creada"
else
  echo "    ℹ️  Instancia ya existe"
fi

# Crear base de datos
gcloud sql databases create "${DB_NAME}" \
  --instance="${DB_INSTANCE}" \
  --quiet 2>/dev/null || echo "    ℹ️  Base de datos ya existe"

# Crear usuario con contraseña aleatoria
DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
gcloud sql users create "${DB_USER}" \
  --instance="${DB_INSTANCE}" \
  --password="${DB_PASSWORD}" \
  --quiet 2>/dev/null && \
  echo "    ✅ Usuario DB creado: ${DB_USER}" || \
  echo "    ℹ️  Usuario ya existe (contraseña no cambiada)"

CLOUDSQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUDSQL_CONNECTION}"

# ── 4. Service Account ────────────────────────────────────────
echo "▶  [4/8] Configurando Service Account..."

gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Trading Calculator Backend" \
  --quiet 2>/dev/null || echo "    ℹ️  Service account ya existe"

# Roles necesarios
for ROLE in \
  roles/cloudsql.client \
  roles/secretmanager.secretAccessor \
  roles/logging.logWriter \
  roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet > /dev/null
done

echo "    ✅ Service Account: ${SA_EMAIL}"

# ── 5. Workload Identity Federation (sin claves JSON) ─────────
echo "▶  [5/8] Configurando Workload Identity Federation..."

WIF_POOL="github-actions-pool"
WIF_PROVIDER="github-provider"

# Crear pool
gcloud iam workload-identity-pools create "${WIF_POOL}" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --quiet 2>/dev/null || echo "    ℹ️  Pool ya existe"

# Crear provider
gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
  --location="global" \
  --workload-identity-pool="${WIF_POOL}" \
  --display-name="GitHub OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --quiet 2>/dev/null || echo "    ℹ️  Provider ya existe"

# Permitir que el repo de GitHub use el SA
WIF_FULL_POOL=$(gcloud iam workload-identity-pools describe "${WIF_POOL}" \
  --location="global" --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_FULL_POOL}/attribute.repository/${GITHUB_REPO}" \
  --quiet > /dev/null

WIF_PROVIDER_FULL="${WIF_FULL_POOL}/providers/${WIF_PROVIDER}"
echo "    ✅ Workload Identity configurado"

# ── 6. Secret Manager ─────────────────────────────────────────
echo "▶  [6/8] Creando secretos en Secret Manager..."

# Función para crear o actualizar un secreto
create_secret() {
  local NAME="$1"
  local VALUE="$2"
  if gcloud secrets describe "${NAME}" --quiet > /dev/null 2>&1; then
    echo "${VALUE}" | gcloud secrets versions add "${NAME}" --data-file=- --quiet
    echo "    ↻ ${NAME} actualizado"
  else
    echo "${VALUE}" | gcloud secrets create "${NAME}" --data-file=- --replication-policy=automatic --quiet
    echo "    ✅ ${NAME} creado"
  fi
}

# Generar JWT_SECRET automáticamente
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
create_secret "JWT_SECRET" "${JWT_SECRET}"
create_secret "DATABASE_URL" "${DATABASE_URL}"

# Secretos que el usuario debe proveer
echo ""
echo "  Los siguientes secretos necesitan valores reales:"
echo "  (Pulsa Enter para usar el placeholder y editar manualmente después)"
echo ""

read_secret() {
  local PROMPT="$1"
  local DEFAULT="$2"
  local INPUT
  read -rp "  ${PROMPT} [${DEFAULT}]: " INPUT
  echo "${INPUT:-${DEFAULT}}"
}

GOOGLE_CLIENT_ID=$(read_secret "GOOGLE_CLIENT_ID" "your-google-client-id.apps.googleusercontent.com")
STRIPE_API_KEY=$(read_secret "STRIPE_API_KEY" "sk_live_...")
SENDGRID_API_KEY=$(read_secret "SENDGRID_API_KEY" "SG....")
STRIPE_WEBHOOK_SECRET=$(read_secret "STRIPE_WEBHOOK_SECRET" "whsec_...")
ANTHROPIC_API_KEY=$(read_secret "ANTHROPIC_API_KEY" "sk-ant-...")

create_secret "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID}"
create_secret "STRIPE_API_KEY" "${STRIPE_API_KEY}"
create_secret "SENDGRID_API_KEY" "${SENDGRID_API_KEY}"
create_secret "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET}"
create_secret "ANTHROPIC_API_KEY" "${ANTHROPIC_API_KEY}"

# Permitir que el SA acceda a todos los secretos
for SECRET in JWT_SECRET DATABASE_URL GOOGLE_CLIENT_ID STRIPE_API_KEY SENDGRID_API_KEY STRIPE_WEBHOOK_SECRET ANTHROPIC_API_KEY; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet > /dev/null
done

echo "    ✅ Todos los secretos configurados"

# ── 7. Dar permisos a Cloud Run para Cloud SQL ────────────────
echo "▶  [7/8] Configurando permisos Cloud Run..."

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.instanceUser" \
  --quiet > /dev/null

echo "    ✅ Permisos Cloud Run configurados"

# ── 8. Resumen ────────────────────────────────────────────────
echo ""
echo "▶  [8/8] Resumen de configuración"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SETUP COMPLETADO ✅                                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Ahora configura estos secretos en GitHub Actions:          ║"
echo "║  (Settings → Secrets and variables → Actions)               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║"
echo "║  GCP_WORKLOAD_IDENTITY_PROVIDER:"
echo "║    ${WIF_PROVIDER_FULL}"
echo "║"
echo "║  GCP_SERVICE_ACCOUNT:"
echo "║    ${SA_EMAIL}"
echo "║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Recursos creados:                                          ║"
echo "║  • Cloud SQL: ${CLOUDSQL_CONNECTION}"
echo "║  • Artifact Registry: ${IMAGE_BASE}"
echo "║  • Service Account: ${SA_EMAIL}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Próximo paso: git push → GitHub Actions desplegará automáticamente."
echo ""
