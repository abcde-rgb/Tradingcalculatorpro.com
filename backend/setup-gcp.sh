#!/usr/bin/env bash
# =============================================================================
# TradingCalculator.pro — Preparar un proyecto de Google Cloud para el deploy
#
# Pensado para pegarse en GOOGLE CLOUD SHELL (ya trae gcloud autenticado):
#
#     git clone https://github.com/abcde-rgb/Tradingcalculatorpro.com.git
#     cd Tradingcalculatorpro.com
#     bash backend/setup-gcp.sh
#
# Es IDEMPOTENTE: se puede ejecutar las veces que haga falta. Lo que ya existe
# no se recrea; lo que falta se crea.
#
# ⚠️  CREA RECURSOS QUE CUESTAN DINERO (Cloud SQL sobre todo). Pide confirmación
#     antes del bloque de coste. Si usas Neon en vez de Cloud SQL, responde "n"
#     cuando lo pregunte y pon la variable de repositorio DB_PROVIDER=neon.
#
# Ajustable por entorno:
#     PROJECT_ID=otro-proyecto REGION=otra-region bash backend/setup-gcp.sh
# =============================================================================
set -euo pipefail

# ── Configuración ────────────────────────────────────────────────────────────
PROJECT_ID="${PROJECT_ID:-tradingcalculatorpro-502817}"
# Debe coincidir con GCP_REGION en .github/workflows/deploy-cloud-run.yml.
REGION="${REGION:-europe-west1}"
DB_INSTANCE="${DB_INSTANCE:-trading-db}"
DB_NAME="${DB_NAME:-trading_calculator_pro}"
DB_USER="${DB_USER:-trading_user}"
AR_REPO="${AR_REPO:-trading-repo}"
GITHUB_REPO="${GITHUB_REPO:-abcde-rgb/Tradingcalculatorpro.com}"
GITHUB_OWNER="${GITHUB_REPO%%/*}"

# DOS cuentas de servicio, no una. La que despliega y la que ejecuta tienen
# necesidades muy distintas: la de ejecución solo lee secretos y habla con la
# base de datos; la de despliegue puede publicar revisiones nuevas. Que el
# backend en producción cargue con permisos de despliegue es un riesgo gratuito:
# si alguien consigue ejecutar código dentro del contenedor, hereda la capacidad
# de desplegar lo que quiera.
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-trading-backend-sa}"
DEPLOY_SA_NAME="${DEPLOY_SA_NAME:-trading-deploy-sa}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="${DEPLOY_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

WIF_POOL="${WIF_POOL:-github-actions-pool}"
WIF_PROVIDER="${WIF_PROVIDER:-github-provider}"

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[0;32m✅ %s\033[0m\n' "$*"; }
info() { printf '  \033[0;90mℹ️  %s\033[0m\n' "$*"; }
warn() { printf '  \033[0;33m⚠️  %s\033[0m\n' "$*"; }
ask()  { local r; read -rp "  ❓ $1 [s/N]: " r; [[ "$r" =~ ^[sSyY]$ ]]; }

cat <<BANNER

╔════════════════════════════════════════════════════════════╗
║  TradingCalculator.pro — Setup de Google Cloud             ║
╚════════════════════════════════════════════════════════════╝
  Proyecto : ${PROJECT_ID}
  Región   : ${REGION}
  Repo     : ${GITHUB_REPO}

BANNER

if ! ask "¿Seguimos con ESTE proyecto y ESTA región?"; then
  echo "  Abortado. Relanza con: PROJECT_ID=... REGION=... bash $0"
  exit 0
fi

gcloud config set project "${PROJECT_ID}" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
ok "Proyecto ${PROJECT_ID} (número ${PROJECT_NUMBER})"

# ── 1. APIs ──────────────────────────────────────────────────────────────────
say "[1/7] Activando APIs (la primera vez tarda ~1 min)"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet
ok "APIs activadas"

# ── 2. Artifact Registry ─────────────────────────────────────────────────────
say "[2/7] Artifact Registry"
if gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  info "'${AR_REPO}' ya existe en ${REGION}"
else
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker --location="${REGION}" \
    --description="Imágenes del backend tradingcalculator-api" --quiet
  ok "Creado ${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
fi

# ── 3. Cuentas de servicio ───────────────────────────────────────────────────
say "[3/7] Cuentas de servicio"
ensure_sa() {
  local name="$1" desc="$2"
  if gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
    info "${name} ya existe"
  else
    gcloud iam service-accounts create "${name}" --display-name="${desc}" --quiet
    ok "${name} creada"
  fi
}
ensure_sa "${RUNTIME_SA_NAME}" "Backend en ejecución (Cloud Run)"
ensure_sa "${DEPLOY_SA_NAME}"  "Despliegue desde GitHub Actions"

grant() {  # grant <cuenta> <rol>
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:$1" --role="$2" --quiet --condition=None >/dev/null
}

# Ejecución: lo mínimo para funcionar.
for role in roles/cloudsql.client roles/secretmanager.secretAccessor \
            roles/logging.logWriter roles/monitoring.metricWriter; do
  grant "${RUNTIME_SA}" "${role}"
done
ok "Permisos de ejecución → ${RUNTIME_SA}"

# Despliegue: publicar la imagen y crear revisiones de Cloud Run.
for role in roles/run.admin roles/artifactregistry.writer; do
  grant "${DEPLOY_SA}" "${role}"
done

# Lo que más se olvida: para desplegar un servicio que CORRE como otra cuenta,
# la cuenta que despliega necesita 'actAs' SOBRE esa otra cuenta. Sin esto la
# autenticación va bien y el deploy revienta después con un
# "PERMISSION_DENIED: iam.serviceaccounts.actAs" que no dice sobre quién.
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${DEPLOY_SA}" \
  --role="roles/iam.serviceAccountUser" --quiet >/dev/null
ok "Permisos de despliegue → ${DEPLOY_SA}"

# ── 4. Workload Identity Federation ──────────────────────────────────────────
say "[4/7] Workload Identity (GitHub Actions sin claves JSON)"
if gcloud iam workload-identity-pools describe "${WIF_POOL}" --location=global >/dev/null 2>&1; then
  info "Pool '${WIF_POOL}' ya existe"
else
  gcloud iam workload-identity-pools create "${WIF_POOL}" \
    --location=global --display-name="GitHub Actions" --quiet
  ok "Pool creado"
fi

if gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER}" \
     --location=global --workload-identity-pool="${WIF_POOL}" >/dev/null 2>&1; then
  info "Provider '${WIF_PROVIDER}' ya existe"
else
  # --attribute-condition NO es opcional. gcloud rechaza crear el provider sin
  # ella cuando se mapea attribute.repository y, más importante, un provider sin
  # condición deja que CUALQUIER repositorio de GitHub pida un token para tus
  # cuentas de servicio. Esta condición lo ata a este repositorio.
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
    --location=global \
    --workload-identity-pool="${WIF_POOL}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition="assertion.repository_owner == '${GITHUB_OWNER}' && assertion.repository == '${GITHUB_REPO}'" \
    --quiet
  ok "Provider creado y restringido a ${GITHUB_REPO}"
fi

WIF_POOL_FULL="$(gcloud iam workload-identity-pools describe "${WIF_POOL}" \
  --location=global --format='value(name)')"
WIF_PROVIDER_FULL="${WIF_POOL_FULL}/providers/${WIF_PROVIDER}"

# Solo este repositorio puede suplantar a la cuenta de despliegue.
gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SA}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_FULL}/attribute.repository/${GITHUB_REPO}" \
  --quiet >/dev/null
ok "GitHub → ${DEPLOY_SA} autorizado"

# ── 5. Base de datos ─────────────────────────────────────────────────────────
say "[5/7] Base de datos"
DATABASE_URL=""
if gcloud sql instances describe "${DB_INSTANCE}" >/dev/null 2>&1; then
  info "Instancia '${DB_INSTANCE}' ya existe"
  CREATE_DB=yes
elif ask "¿Crear la instancia Cloud SQL '${DB_INSTANCE}'? (CUESTA DINERO; responde 'n' si usas Neon)"; then
  warn "Tarda entre 5 y 10 minutos..."
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_15 --tier=db-f1-micro --region="${REGION}" \
    --storage-auto-increase --storage-size=10GB --storage-type=SSD \
    --availability-type=zonal --quiet
  ok "Instancia creada"
  CREATE_DB=yes
else
  info "Sin Cloud SQL. Acuérdate de poner DB_PROVIDER=neon y el secreto DATABASE_URL a mano."
  CREATE_DB=no
fi

if [ "${CREATE_DB}" = "yes" ]; then
  gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE}" --quiet 2>/dev/null \
    && ok "Base de datos ${DB_NAME} creada" || info "Base de datos ${DB_NAME} ya existía"

  # La contraseña se FIJA siempre, no solo al crear el usuario. Antes se
  # generaba una nueva al vuelo pero solo se aplicaba si el usuario no existía:
  # al reejecutar el script se escribía un DATABASE_URL con una contraseña que
  # nunca llegó a aplicarse, y el backend no conectaba.
  DB_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
  if gcloud sql users list --instance="${DB_INSTANCE}" --format='value(name)' | grep -qx "${DB_USER}"; then
    gcloud sql users set-password "${DB_USER}" --instance="${DB_INSTANCE}" \
      --password="${DB_PASSWORD}" --quiet
    ok "Contraseña de ${DB_USER} rotada"
  else
    gcloud sql users create "${DB_USER}" --instance="${DB_INSTANCE}" \
      --password="${DB_PASSWORD}" --quiet
    ok "Usuario ${DB_USER} creado"
  fi
  CONN="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONN}"
fi

# ── 6. Secret Manager ────────────────────────────────────────────────────────
say "[6/7] Secretos"
# El deploy monta 7 secretos. Si UNO falta, `gcloud run deploy` falla entero,
# así que los que todavía no uses se crean VACÍOS: el código ya trata "sin
# configurar" como una situación normal (Stripe, SendGrid y el coach de IA se
# desactivan solos en vez de romper el arranque).
put_secret() {  # put_secret <nombre> <valor>
  local name="$1" value="$2"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=- --quiet >/dev/null
    ok "${name} actualizado"
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- \
      --replication-policy=automatic --quiet >/dev/null
    ok "${name} creado"
  fi
}
ensure_secret() {  # solo lo crea si NO existe; nunca pisa un valor bueno
  local name="$1"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    info "${name} ya existe (no se toca)"
  else
    printf '' | gcloud secrets create "${name}" --data-file=- \
      --replication-policy=automatic --quiet >/dev/null
    warn "${name} creado VACÍO — rellénalo cuando tengas la clave"
  fi
}

if gcloud secrets describe JWT_SECRET >/dev/null 2>&1; then
  # Rotarlo cierra la sesión de todo el mundo: no se toca sin pedirlo.
  info "JWT_SECRET ya existe (no se rota: invalidaría todas las sesiones)"
else
  put_secret JWT_SECRET "$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
fi

if [ -n "${DATABASE_URL}" ]; then
  put_secret DATABASE_URL "${DATABASE_URL}"
else
  ensure_secret DATABASE_URL
fi

for s in GOOGLE_CLIENT_ID STRIPE_API_KEY STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY ANTHROPIC_API_KEY; do
  ensure_secret "$s"
done

for s in JWT_SECRET DATABASE_URL GOOGLE_CLIENT_ID STRIPE_API_KEY \
         STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY ANTHROPIC_API_KEY; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" --quiet >/dev/null
done
ok "El backend puede leer los 7 secretos"

# ── 7. Resumen ───────────────────────────────────────────────────────────────
say "[7/7] Listo. Pega esto en GitHub"
cat <<RESUMEN

  Settings → Secrets and variables → Actions → SECRETS
  ─────────────────────────────────────────────────────────────
  GCP_WORKLOAD_IDENTITY_PROVIDER
    ${WIF_PROVIDER_FULL}

  GCP_SERVICE_ACCOUNT
    ${DEPLOY_SA}

  ADMIN_EMAILS
    tu-email@ejemplo.com        (si queda vacío, no serás admin)

  Settings → Secrets and variables → Actions → VARIABLES
  ─────────────────────────────────────────────────────────────
  GCP_PROJECT   ${PROJECT_ID}
  GCP_REGION    ${REGION}
$( [ "${CREATE_DB}" = "no" ] && printf '  DB_PROVIDER   neon          (y rellena el secreto DATABASE_URL)\n' )
  Después: Actions → "Deploy Backend → Cloud Run" → Run workflow.

  Aviso: la primera vez que entres al panel de admin te pedirá activar la
  verificación en dos pasos. Es obligatoria en producción y no se puede
  desactivar con una variable. Ten a mano una app de autenticación.

RESUMEN
