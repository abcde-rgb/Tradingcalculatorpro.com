#!/usr/bin/env bash
# =============================================================
# TradingCalculator.pro — Setup GCP para Cloud Run (parametrizado)
# Ejecutar UNA VEZ en el proyecto nuevo (ideal: Google Cloud Shell).
# Requiere: gcloud autenticado con una cuenta Owner del proyecto.
#
# Uso (Neon, recomendado y más barato):
#   PROJECT_ID=mi-proyecto REGION=europe-west1 DB_PROVIDER=neon \
#   NEON_DATABASE_URL='postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
#   GITHUB_REPO='abcde-rgb/Tradingcalculatorpro.com' bash setup-gcp.sh
#
# Uso (Cloud SQL):
#   PROJECT_ID=mi-proyecto REGION=europe-west1 DB_PROVIDER=cloudsql bash setup-gcp.sh
#
# Si no pasas PROJECT_ID, usa el proyecto activo de gcloud.
# Guía completa: docs/MIGRACION_GCP_NUEVA_CUENTA.md
# =============================================================
set -euo pipefail

# ── Configuración (todo por variables de entorno, con defaults) ──
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-europe-west1}"
DB_PROVIDER="${DB_PROVIDER:-neon}"          # neon | cloudsql
SA_NAME="${SA_NAME:-trading-backend-sa}"
AR_REPO="${AR_REPO:-trading-repo}"
GITHUB_REPO="${GITHUB_REPO:-abcde-rgb/Tradingcalculatorpro.com}"
# Solo Cloud SQL:
DB_INSTANCE="${DB_INSTANCE:-trading-db}"
DB_NAME="${DB_NAME:-trading_calculator_pro}"
DB_USER="${DB_USER:-trading_user}"

if [ -z "${PROJECT_ID}" ]; then
  echo "❌ Falta PROJECT_ID (y no hay proyecto activo en gcloud). Aborto."; exit 1
fi

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/backend"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  TradingCalculator.pro — GCP Setup                   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Proyecto : ${PROJECT_ID}"
echo "║  Región   : ${REGION}"
echo "║  BD       : ${DB_PROVIDER}"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Proyecto + APIs ─────────────────────────────────────────
echo "▶  [1/8] Configurando proyecto y activando APIs..."
gcloud config set project "${PROJECT_ID}"
APIS=(run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
      cloudbuild.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
      cloudresourcemanager.googleapis.com sts.googleapis.com)
[ "${DB_PROVIDER}" = "cloudsql" ] && APIS+=(sqladmin.googleapis.com)
gcloud services enable "${APIS[@]}" --quiet
echo "    ✅ APIs activadas"

# ── 2. Artifact Registry ───────────────────────────────────────
echo "▶  [2/8] Creando Artifact Registry..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker --location="${REGION}" \
  --description="Backend Docker images" --quiet 2>/dev/null || echo "    ℹ️  Ya existe"
echo "    ✅ ${IMAGE_BASE}"

# ── 3. Base de datos ───────────────────────────────────────────
if [ "${DB_PROVIDER}" = "neon" ]; then
  echo "▶  [3/8] BD = Neon (TCP). No se crea Cloud SQL."
  DATABASE_URL="${NEON_DATABASE_URL:-}"
  if [ -z "${DATABASE_URL}" ]; then
    read -rp "  Pega la DATABASE_URL de Neon (postgresql://...sslmode=require): " DATABASE_URL
  fi
  [ -z "${DATABASE_URL}" ] && { echo "❌ Falta la DATABASE_URL de Neon."; exit 1; }
else
  echo "▶  [3/8] Creando Cloud SQL (PostgreSQL 15, db-f1-micro)... (5-10 min)"
  if [ -z "$(gcloud sql instances list --filter="name=${DB_INSTANCE}" --format='value(name)' 2>/dev/null)" ]; then
    gcloud sql instances create "${DB_INSTANCE}" --database-version=POSTGRES_15 \
      --tier=db-f1-micro --region="${REGION}" --storage-auto-increase \
      --storage-size=10GB --storage-type=SSD --availability-type=zonal --quiet
  else echo "    ℹ️  Instancia ya existe"; fi
  gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE}" --quiet 2>/dev/null || true
  DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
  gcloud sql users create "${DB_USER}" --instance="${DB_INSTANCE}" --password="${DB_PASSWORD}" --quiet 2>/dev/null || \
    echo "    ℹ️  Usuario ya existe (contraseña no cambiada)"
  CLOUDSQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUDSQL_CONNECTION}"
  echo "    ✅ Cloud SQL: ${CLOUDSQL_CONNECTION}"
fi

# ── 4. Service Account + roles ─────────────────────────────────
echo "▶  [4/8] Configurando Service Account..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="Trading Calculator Backend" --quiet 2>/dev/null || echo "    ℹ️  Ya existe"
ROLES=(roles/secretmanager.secretAccessor roles/logging.logWriter roles/monitoring.metricWriter)
[ "${DB_PROVIDER}" = "cloudsql" ] && ROLES+=(roles/cloudsql.client roles/cloudsql.instanceUser)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" --role="${ROLE}" --quiet >/dev/null
done
echo "    ✅ SA: ${SA_EMAIL}"

# ── 5. Workload Identity Federation (deploy desde GitHub sin claves JSON) ──
echo "▶  [5/8] Configurando Workload Identity Federation..."
WIF_POOL="${WIF_POOL:-github-actions-pool}"
WIF_PROVIDER="${WIF_PROVIDER:-github-provider}"
gcloud iam workload-identity-pools create "${WIF_POOL}" --location="global" \
  --display-name="GitHub Actions Pool" --quiet 2>/dev/null || echo "    ℹ️  Pool ya existe"
gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" --location="global" \
  --workload-identity-pool="${WIF_POOL}" --display-name="GitHub OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" --quiet 2>/dev/null || echo "    ℹ️  Provider ya existe"
WIF_FULL_POOL=$(gcloud iam workload-identity-pools describe "${WIF_POOL}" --location="global" --format="value(name)")
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_FULL_POOL}/attribute.repository/${GITHUB_REPO}" --quiet >/dev/null
WIF_PROVIDER_FULL="${WIF_FULL_POOL}/providers/${WIF_PROVIDER}"
echo "    ✅ Workload Identity configurado"

# ── 6. Secret Manager ──────────────────────────────────────────
echo "▶  [6/8] Creando secretos..."
create_secret() {
  if gcloud secrets describe "$1" --quiet >/dev/null 2>&1; then
    printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- --quiet; echo "    ↻ $1 actualizado"
  else
    printf '%s' "$2" | gcloud secrets create "$1" --data-file=- --replication-policy=automatic --quiet; echo "    ✅ $1 creado"
  fi
}
read_secret() { local I; read -rp "  $1 [$2]: " I; echo "${I:-$2}"; }

create_secret "JWT_SECRET" "$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
create_secret "DATABASE_URL" "${DATABASE_URL}"
echo ""
echo "  Introduce los valores reales (Enter = placeholder, editable después):"
create_secret "GOOGLE_CLIENT_ID"      "$(read_secret GOOGLE_CLIENT_ID your-id.apps.googleusercontent.com)"
create_secret "STRIPE_API_KEY"        "$(read_secret STRIPE_API_KEY sk_live_...)"
create_secret "SENDGRID_API_KEY"      "$(read_secret SENDGRID_API_KEY SG....)"
create_secret "STRIPE_WEBHOOK_SECRET" "$(read_secret STRIPE_WEBHOOK_SECRET whsec_...)"
create_secret "ANTHROPIC_API_KEY"     "$(read_secret ANTHROPIC_API_KEY sk-ant-...)"
for S in JWT_SECRET DATABASE_URL GOOGLE_CLIENT_ID STRIPE_API_KEY SENDGRID_API_KEY STRIPE_WEBHOOK_SECRET ANTHROPIC_API_KEY; do
  gcloud secrets add-iam-policy-binding "${S}" \
    --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" --quiet >/dev/null
done
echo "    ✅ Secretos configurados y accesibles por la SA"

# ── 7. (Cloud SQL) permiso extra — ya cubierto arriba ──────────
echo "▶  [7/8] Permisos ✅"

# ── 8. Resumen: qué poner en GitHub ────────────────────────────
echo ""
echo "▶  [8/8] SETUP COMPLETADO ✅"
echo ""
echo "════════════ CONFIGURA ESTO EN GITHUB ════════════"
echo "  (repo → Settings → Secrets and variables → Actions)"
echo ""
echo "  🔐 SECRETS:"
echo "     GCP_WORKLOAD_IDENTITY_PROVIDER = ${WIF_PROVIDER_FULL}"
echo "     GCP_SERVICE_ACCOUNT            = ${SA_EMAIL}"
echo "     (REACT_APP_BACKEND_URL se pone DESPUÉS del primer deploy, con la URL de Cloud Run)"
echo ""
echo "  🔧 VARIABLES:"
echo "     GCP_PROJECT   = ${PROJECT_ID}"
echo "     GCP_REGION    = ${REGION}"
echo "     DB_PROVIDER   = ${DB_PROVIDER}"
echo "     MIN_INSTANCES = 0"
echo ""
echo "  Recursos: Artifact Registry ${IMAGE_BASE} · SA ${SA_EMAIL}"
[ "${DB_PROVIDER}" = "cloudsql" ] && echo "            Cloud SQL ${CLOUDSQL_CONNECTION:-}"
echo "═══════════════════════════════════════════════════"
echo "  Siguiente: push a main (o 'Run workflow') → deploy automático."
echo ""
