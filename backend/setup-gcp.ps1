# =============================================================
# TradingCalculator.pro — Setup GCP para Cloud Run (Windows)
# Ejecutar en Google Cloud SDK Shell o PowerShell con gcloud.
# Uso: .\setup-gcp.ps1
# =============================================================

$PROJECT_ID   = "tradingcalculator-495806"
$REGION       = "europe-west1"
$DB_INSTANCE  = "trading-db"
$DB_NAME      = "trading_calculator_pro"
$DB_USER      = "trading_user"
$SA_NAME      = "trading-backend-sa"
$AR_REPO      = "trading-repo"
$GITHUB_REPO  = "abcde-rgb/Tradingcalculatorpro.com"
$SA_EMAIL     = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TradingCalculator.pro — GCP Setup (Windows)        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. Activar APIs ───────────────────────────────────────────
Write-Host "▶  [1/8] Activando APIs de GCP..." -ForegroundColor Yellow
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
Write-Host "    ✅ APIs activadas" -ForegroundColor Green

# ── 2. Artifact Registry ──────────────────────────────────────
Write-Host "▶  [2/8] Creando Artifact Registry..." -ForegroundColor Yellow
gcloud artifacts repositories create $AR_REPO `
  --repository-format=docker `
  --location=$REGION `
  --description="Backend Docker images" `
  --quiet 2>$null
Write-Host "    ✅ Artifact Registry listo" -ForegroundColor Green

# ── 3. Cloud SQL ──────────────────────────────────────────────
Write-Host "▶  [3/8] Creando Cloud SQL PostgreSQL 15 (esto tarda ~8 min)..." -ForegroundColor Yellow
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
  Write-Host "    ✅ Instancia Cloud SQL creada" -ForegroundColor Green
} else {
  Write-Host "    ℹ️  Cloud SQL ya existe" -ForegroundColor Gray
}

gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet 2>$null
Write-Host "    ✅ Base de datos: $DB_NAME" -ForegroundColor Green

# Generar contraseña aleatoria
$DB_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_})
gcloud sql users create $DB_USER --instance=$DB_INSTANCE --password=$DB_PASSWORD --quiet 2>$null
Write-Host "    ✅ Usuario DB: $DB_USER" -ForegroundColor Green

$CLOUDSQL_CONNECTION = "$PROJECT_ID`:$REGION`:$DB_INSTANCE"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/$CLOUDSQL_CONNECTION"

# ── 4. Service Account ────────────────────────────────────────
Write-Host "▶  [4/8] Creando Service Account..." -ForegroundColor Yellow
gcloud iam service-accounts create $SA_NAME `
  --display-name="Trading Calculator Backend" `
  --quiet 2>$null

foreach ($role in @(
  "roles/cloudsql.client",
  "roles/cloudsql.instanceUser",
  "roles/secretmanager.secretAccessor",
  "roles/logging.logWriter",
  "roles/monitoring.metricWriter"
)) {
  gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SA_EMAIL" `
    --role=$role `
    --quiet | Out-Null
}
Write-Host "    ✅ Service Account: $SA_EMAIL" -ForegroundColor Green

# ── 5. Workload Identity Federation ──────────────────────────
Write-Host "▶  [5/8] Configurando Workload Identity Federation..." -ForegroundColor Yellow
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
Write-Host "    ✅ Workload Identity configurado" -ForegroundColor Green

# ── 6. Secret Manager ─────────────────────────────────────────
Write-Host "▶  [6/8] Creando secretos en Secret Manager..." -ForegroundColor Yellow
Write-Host ""

function Set-GcpSecret {
  param([string]$Name, [string]$Value)
  $exists = gcloud secrets describe $Name --quiet 2>$null
  if ($exists) {
    $Value | gcloud secrets versions add $Name --data-file=- --quiet | Out-Null
    Write-Host "    ↻ $Name actualizado" -ForegroundColor Gray
  } else {
    $Value | gcloud secrets create $Name --data-file=- --replication-policy=automatic --quiet | Out-Null
    Write-Host "    ✅ $Name creado" -ForegroundColor Green
  }
  # Dar acceso al SA
  gcloud secrets add-iam-policy-binding $Name `
    --member="serviceAccount:$SA_EMAIL" `
    --role="roles/secretmanager.secretAccessor" `
    --quiet | Out-Null
}

# JWT_SECRET y DATABASE_URL se generan automáticamente
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) + (33..47) | Get-Random -Count 48 | ForEach-Object {[char]$_})
Set-GcpSecret "JWT_SECRET" $JWT_SECRET
Set-GcpSecret "DATABASE_URL" $DATABASE_URL

# Los demás los introduce el usuario
Write-Host ""
Write-Host "  Introduce los valores para los siguientes secretos:" -ForegroundColor Cyan
Write-Host "  (Pulsa Enter para dejar el placeholder y editarlo después en Secret Manager)" -ForegroundColor Gray
Write-Host ""

$GOOGLE_CLIENT_ID     = Read-Host "  GOOGLE_CLIENT_ID     "
$STRIPE_API_KEY       = Read-Host "  STRIPE_API_KEY       "
$SENDGRID_API_KEY     = Read-Host "  SENDGRID_API_KEY     "
$STRIPE_WEBHOOK       = Read-Host "  STRIPE_WEBHOOK_SECRET"
$ANTHROPIC_API_KEY    = Read-Host "  ANTHROPIC_API_KEY    "

if (-not $GOOGLE_CLIENT_ID)  { $GOOGLE_CLIENT_ID  = "placeholder-google-client-id" }
if (-not $STRIPE_API_KEY)    { $STRIPE_API_KEY    = "placeholder-stripe-key" }
if (-not $SENDGRID_API_KEY)  { $SENDGRID_API_KEY  = "placeholder-sendgrid-key" }
if (-not $STRIPE_WEBHOOK)    { $STRIPE_WEBHOOK    = "placeholder-webhook-secret" }
if (-not $ANTHROPIC_API_KEY) { $ANTHROPIC_API_KEY = "placeholder-anthropic-key" }

Set-GcpSecret "GOOGLE_CLIENT_ID"      $GOOGLE_CLIENT_ID
Set-GcpSecret "STRIPE_API_KEY"        $STRIPE_API_KEY
Set-GcpSecret "SENDGRID_API_KEY"      $SENDGRID_API_KEY
Set-GcpSecret "STRIPE_WEBHOOK_SECRET" $STRIPE_WEBHOOK
Set-GcpSecret "ANTHROPIC_API_KEY"     $ANTHROPIC_API_KEY

Write-Host "    ✅ Todos los secretos configurados" -ForegroundColor Green

# ── 7. Resumen final ──────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SETUP COMPLETADO ✅                                        ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Añade estos 2 secretos en GitHub Actions:                  ║" -ForegroundColor Green
Write-Host "║  (Settings → Secrets and variables → Actions)               ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host ""
Write-Host "  GCP_WORKLOAD_IDENTITY_PROVIDER:" -ForegroundColor Cyan
Write-Host "  $WIF_PROVIDER_FULL" -ForegroundColor White
Write-Host ""
Write-Host "  GCP_SERVICE_ACCOUNT:" -ForegroundColor Cyan
Write-Host "  $SA_EMAIL" -ForegroundColor White
Write-Host ""
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Próximo paso: git push a main → GitHub Actions despliega automáticamente." -ForegroundColor Yellow
Write-Host ""
