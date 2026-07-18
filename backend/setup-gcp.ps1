# =============================================================
# TradingCalculator.pro - Setup GCP para Cloud Run (Windows)
# Uso: .\backend\setup-gcp.ps1
#
# NOTA: para una CUENTA/PROYECTO NUEVO usa `backend/setup-gcp.sh` (parametrizado,
# compatible con Neon) en Google Cloud Shell, y la guía
# docs/MIGRACION_GCP_NUEVA_CUENTA.md. Este .ps1 apunta al proyecto original.
# =============================================================

$PROJECT_ID   = "tradingcalculator-495806"
$REGION       = "us-central1"
$DB_INSTANCE  = "trading-db"
$DB_NAME      = "trading_calculator_pro"
$DB_USER      = "trading_user"
$SA_NAME      = "trading-backend-sa"
$AR_REPO      = "trading-repo"
$GITHUB_REPO  = "abcde-rgb/Tradingcalculatorpro.com"
$SA_EMAIL     = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host ""
Write-Host "=== TradingCalculator.pro - GCP Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Activar APIs
Write-Host "[1/7] Activando APIs..." -ForegroundColor Yellow
gcloud services enable `
  run.googleapis.com `
  sqladmin.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  iam.googleapis.com `
  iamcredentials.googleapis.com `
  cloudresourcemanager.googleapis.com `
  --quiet
Write-Host "OK - APIs activadas" -ForegroundColor Green

# 2. Artifact Registry
Write-Host "[2/7] Creando Artifact Registry..." -ForegroundColor Yellow
gcloud artifacts repositories create $AR_REPO `
  --repository-format=docker `
  --location=$REGION `
  --description="Backend Docker images" `
  --quiet 2>$null
Write-Host "OK - Artifact Registry listo" -ForegroundColor Green

# 3. Cloud SQL
Write-Host "[3/7] Creando Cloud SQL PostgreSQL 15 (tarda ~8 minutos)..." -ForegroundColor Yellow
$dbExists = gcloud sql instances list --filter="name=$DB_INSTANCE" --format="value(name)" 2>$null
if (-not $dbExists) {
  gcloud sql instances create $DB_INSTANCE `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$REGION `
    --storage-auto-increase `
    --storage-size=10GB `
    --storage-type=SSD `
    --availability-type=zonal `
    --quiet
  Write-Host "OK - Cloud SQL creado" -ForegroundColor Green
} else {
  Write-Host "INFO - Cloud SQL ya existe" -ForegroundColor Gray
}

gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet 2>$null
Write-Host "OK - Base de datos: $DB_NAME" -ForegroundColor Green

$chars = (65..90) + (97..122) + (48..57)
$DB_PASSWORD = -join ($chars | Get-Random -Count 24 | ForEach-Object {[char]$_})
gcloud sql users create $DB_USER --instance=$DB_INSTANCE --password=$DB_PASSWORD --quiet 2>$null
Write-Host "OK - Usuario DB: $DB_USER" -ForegroundColor Green

$CLOUDSQL_CONNECTION = "${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/$CLOUDSQL_CONNECTION"

# 4. Service Account
Write-Host "[4/7] Creando Service Account..." -ForegroundColor Yellow
gcloud iam service-accounts create $SA_NAME `
  --display-name="Trading Calculator Backend" `
  --quiet 2>$null

$roles = @(
  "roles/cloudsql.client",
  "roles/cloudsql.instanceUser",
  "roles/secretmanager.secretAccessor",
  "roles/logging.logWriter",
  "roles/monitoring.metricWriter"
)
foreach ($role in $roles) {
  gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role=$role --condition=None --quiet | Out-Null
}
Write-Host "OK - Service Account: $SA_EMAIL" -ForegroundColor Green

# 5. Workload Identity Federation
Write-Host "[5/7] Configurando Workload Identity Federation..." -ForegroundColor Yellow
$WIF_POOL     = "github-actions-pool"
$WIF_PROVIDER = "github-provider"

gcloud iam workload-identity-pools create $WIF_POOL `
  --location="global" `
  --display-name="GitHub Actions Pool" `
  --quiet 2>$null

gcloud iam workload-identity-pools providers create-oidc $WIF_PROVIDER `
  --location="global" `
  --workload-identity-pool=$WIF_POOL `
  --display-name="GitHub OIDC Provider" `
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --quiet 2>$null

$WIF_FULL_POOL = gcloud iam workload-identity-pools describe $WIF_POOL `
  --location="global" --format="value(name)"

gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL `
  --role="roles/iam.workloadIdentityUser" `
  --member="principalSet://iam.googleapis.com/$WIF_FULL_POOL/attribute.repository/$GITHUB_REPO" `
  --quiet | Out-Null

$WIF_PROVIDER_FULL = "$WIF_FULL_POOL/providers/$WIF_PROVIDER"
Write-Host "OK - Workload Identity configurado" -ForegroundColor Green

# 6. Secret Manager
Write-Host "[6/7] Creando secretos..." -ForegroundColor Yellow

function Set-GcpSecret {
  param([string]$Name, [string]$Value)
  $exists = gcloud secrets describe $Name --quiet 2>$null
  if ($exists) {
    $Value | gcloud secrets versions add $Name --data-file=- --quiet | Out-Null
  } else {
    $Value | gcloud secrets create $Name --data-file=- --replication-policy=automatic --quiet | Out-Null
  }
  gcloud secrets add-iam-policy-binding $Name `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/secretmanager.secretAccessor" `
    --quiet | Out-Null
  Write-Host "  OK - $Name" -ForegroundColor Green
}

$jwtChars = (65..90) + (97..122) + (48..57)
$JWT_SECRET = -join ($jwtChars | Get-Random -Count 48 | ForEach-Object {[char]$_})
Set-GcpSecret "JWT_SECRET" $JWT_SECRET
Set-GcpSecret "DATABASE_URL" $DATABASE_URL

Write-Host ""
Write-Host "Introduce los valores (Enter para dejar placeholder y editar despues):" -ForegroundColor Cyan
Write-Host ""

$v1 = Read-Host "  GOOGLE_CLIENT_ID"
$v2 = Read-Host "  STRIPE_API_KEY"
$v3 = Read-Host "  SENDGRID_API_KEY"
$v4 = Read-Host "  STRIPE_WEBHOOK_SECRET"
$v5 = Read-Host "  ANTHROPIC_API_KEY"

if (-not $v1) { $v1 = "placeholder" }
if (-not $v2) { $v2 = "placeholder" }
if (-not $v3) { $v3 = "placeholder" }
if (-not $v4) { $v4 = "placeholder" }
if (-not $v5) { $v5 = "placeholder" }

Set-GcpSecret "GOOGLE_CLIENT_ID"      $v1
Set-GcpSecret "STRIPE_API_KEY"        $v2
Set-GcpSecret "SENDGRID_API_KEY"      $v3
Set-GcpSecret "STRIPE_WEBHOOK_SECRET" $v4
Set-GcpSecret "ANTHROPIC_API_KEY"     $v5

# 7. Resumen
Write-Host ""
Write-Host "=== SETUP COMPLETADO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Anade estos 2 secretos en GitHub Actions:" -ForegroundColor Cyan
Write-Host "GitHub > Settings > Secrets and variables > Actions" -ForegroundColor Gray
Write-Host ""
Write-Host "GCP_WORKLOAD_IDENTITY_PROVIDER:" -ForegroundColor Yellow
Write-Host $WIF_PROVIDER_FULL
Write-Host ""
Write-Host "GCP_SERVICE_ACCOUNT:" -ForegroundColor Yellow
Write-Host $SA_EMAIL
Write-Host ""
Write-Host "Siguiente paso: git push a main para desplegar automaticamente." -ForegroundColor Cyan
Write-Host ""
