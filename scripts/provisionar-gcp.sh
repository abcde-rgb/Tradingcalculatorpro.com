#!/usr/bin/env bash
# ============================================================================
# Deja un proyecto de GCP VACÍO listo para `gcloud builds submit`.
#
# Por qué existe
# --------------
# `cloudbuild.yaml` da por hechos seis recursos con nombre fijo —el repositorio
# de imágenes, la cuenta de servicio del backend, los siete secretos, el
# servicio de Cloud Run— y en un proyecto nuevo no existe ninguno. El build
# arranca y revienta en el primer paso que toque uno, con un error que no dice
# «te falta esto», sino «not found».
#
# Pasó de verdad el 2026-08-25: se migró a `tradingcalculatorpro-502817`, con
# facturación activa y **cero** repositorios, cero servicios y cero secretos.
# El despliegue llevaba roto desde la migración y nadie lo sabía, porque el
# backend no se despliega solo y nada avisa de que lleve meses sin salir.
#
# Qué hace y qué NO hace
# ----------------------
# Crea lo que falta y sólo lo que falta: es idempotente, así que se puede
# ejecutar dos veces sin romper nada. Al final imprime lo que sigue faltando.
#
# **No crea la base de datos y no toca los datos de nadie.** Con Neon la BD se
# crea en su panel y aquí sólo entra su cadena de conexión; con Cloud SQL, la
# instancia se crea aparte. Si vienes de otro proyecto, EXPORTA antes: apuntar
# producción a una base vacía deja fuera a todos los usuarios registrados y no
# hay error que lo avise — la web funciona, simplemente no conoce a nadie.
#
# **No lleva ningún secreto dentro.** Los pide por entrada estándar y los
# escribe en Secret Manager. Un secreto en el repositorio es un secreto
# quemado, aunque el repositorio sea privado.
#
# Uso
# ---
#     bash scripts/provisionar-gcp.sh                 # informe: qué falta
#     bash scripts/provisionar-gcp.sh --crear         # crea lo que falta
#
# Se ejecuta desde Google Cloud Shell, que ya trae `gcloud` autenticado.
# ============================================================================
set -uo pipefail

CREAR=false
[ "${1:-}" = "--crear" ] && CREAR=true

REGION="europe-west1"
REPO="trading-repo"
SERVICIO="tradingcalculator-api"
SA="trading-backend-sa"

# Los siete que `cloudbuild.yaml` monta con `--update-secrets`. La lista sale de
# ahí: si se añade uno allí y no aquí, el despliegue falla en el arranque del
# contenedor y no en el build, que es mucho más caro de diagnosticar.
SECRETOS=(JWT_SECRET DATABASE_URL GOOGLE_CLIENT_ID STRIPE_API_KEY
          SENDGRID_API_KEY STRIPE_WEBHOOK_SECRET ANTHROPIC_API_KEY)

# Sólo las que usa el despliegue. Habilitar de más es superficie que auditar.
APIS=(cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com
      secretmanager.googleapis.com iam.googleapis.com)

PROYECTO="$(gcloud config get-value project 2>/dev/null)"
if [ -z "$PROYECTO" ] || [ "$PROYECTO" = "(unset)" ]; then
  echo "✗ No hay proyecto activo. Ponlo antes:  gcloud config set project TU_PROYECTO" >&2
  exit 1
fi

echo "═══ Proyecto: $PROYECTO · región: $REGION ═══"
$CREAR || echo "    (modo informe — nada se crea; usa --crear para crearlo)"
echo ""

FALTAN=0
marca() { if [ "$1" = ok ]; then echo "  ✅ $2"; else echo "  ❌ $2"; FALTAN=$((FALTAN+1)); fi; }

# ── Facturación ─────────────────────────────────────────────────────────────
# Sin ella todo lo demás falla con errores que hablan de permisos, no de dinero.
FACT="$(gcloud beta billing projects describe "$PROYECTO" \
        --format='value(billingEnabled)' 2>/dev/null)"
[ "$FACT" = "True" ] && marca ok "facturación activa" \
                     || marca no "facturación DESACTIVADA — nada más va a funcionar"

# ── APIs ────────────────────────────────────────────────────────────────────
echo ""
echo "APIs:"
HABILITADAS="$(gcloud services list --enabled --format='value(config.name)' 2>/dev/null)"
for api in "${APIS[@]}"; do
  if grep -qx "$api" <<<"$HABILITADAS"; then
    marca ok "$api"
  else
    marca no "$api"
    $CREAR && gcloud services enable "$api" --quiet && echo "     → habilitada"
  fi
done

# ── Repositorio de imágenes ─────────────────────────────────────────────────
echo ""
echo "Artifact Registry:"
if gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  marca ok "$REPO en $REGION"
else
  marca no "$REPO en $REGION"
  $CREAR && gcloud artifacts repositories create "$REPO" \
      --repository-format=docker --location="$REGION" \
      --description="Imágenes del backend de TradingCalculator.Pro" --quiet \
      && echo "     → creado"
fi

# ── Cuenta de servicio del backend ──────────────────────────────────────────
#
# Es la identidad con la que CORRE el contenedor, distinta de la que despliega.
# Necesita leer secretos y —sólo con Cloud SQL— conectar a la instancia. Se le
# dan esos dos roles y ninguno más: el servicio no administra nada.
echo ""
echo "Cuenta de servicio:"
CORREO_SA="${SA}@${PROYECTO}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$CORREO_SA" >/dev/null 2>&1; then
  marca ok "$CORREO_SA"
else
  marca no "$CORREO_SA"
  if $CREAR; then
    gcloud iam service-accounts create "$SA" \
      --display-name="Backend de TradingCalculator.Pro" --quiet && echo "     → creada"
    for rol in roles/secretmanager.secretAccessor roles/cloudsql.client; do
      gcloud projects add-iam-policy-binding "$PROYECTO" \
        --member="serviceAccount:${CORREO_SA}" --role="$rol" \
        --condition=None --quiet >/dev/null && echo "     → rol $rol"
    done
  fi
fi

# ── Permisos de Cloud Build ─────────────────────────────────────────────────
#
# La cuenta que ejecuta el build tiene que poder desplegar en Cloud Run y
# «actuar como» la cuenta de arriba. Sin `iam.serviceAccountUser` el build
# termina en verde el push de la imagen y falla en el deploy, que es el momento
# más confuso posible para descubrirlo.
echo ""
echo "Permisos de Cloud Build:"
NUM="$(gcloud projects describe "$PROYECTO" --format='value(projectNumber)' 2>/dev/null)"
CB_SA="${NUM}@cloudbuild.gserviceaccount.com"
POLITICA="$(gcloud projects get-iam-policy "$PROYECTO" --flatten='bindings[].members' \
            --format='value(bindings.role)' --filter="bindings.members:${CB_SA}" 2>/dev/null)"
for rol in roles/run.admin roles/iam.serviceAccountUser; do
  if grep -qx "$rol" <<<"$POLITICA"; then
    marca ok "$rol"
  else
    marca no "$rol"
    $CREAR && gcloud projects add-iam-policy-binding "$PROYECTO" \
        --member="serviceAccount:${CB_SA}" --role="$rol" --condition=None --quiet >/dev/null \
        && echo "     → concedido"
  fi
done

# ── Secretos ────────────────────────────────────────────────────────────────
#
# Se piden por entrada estándar y NUNCA se pasan por la línea de comandos: un
# `--data-file=-` con `echo` deja el valor en el historial del shell.
echo ""
echo "Secret Manager:"
EXISTENTES="$(gcloud secrets list --format='value(name)' 2>/dev/null)"
for s in "${SECRETOS[@]}"; do
  if grep -qx "$s" <<<"$EXISTENTES"; then
    marca ok "$s"
  else
    marca no "$s"
    if $CREAR; then
      echo -n "     valor para $s (vacío = saltar): "
      read -rs VALOR; echo ""
      if [ -n "$VALOR" ]; then
        gcloud secrets create "$s" --replication-policy=automatic --quiet >/dev/null 2>&1
        printf '%s' "$VALOR" | gcloud secrets versions add "$s" --data-file=- --quiet >/dev/null \
          && echo "     → guardado"
        unset VALOR
      else
        echo "     → saltado; el despliegue fallará al arrancar sin él"
      fi
    fi
  fi
done

# ── Cloud Run ───────────────────────────────────────────────────────────────
# No se crea aquí: lo crea el propio `cloudbuild.yaml` en el primer despliegue.
echo ""
echo "Cloud Run:"
gcloud run services describe "$SERVICIO" --region="$REGION" >/dev/null 2>&1 \
  && marca ok "$SERVICIO ya desplegado" \
  || echo "  ⏭️  $SERVICIO todavía no existe — lo crea el primer despliegue"

echo ""
echo "══════════════════════════════════════════════════════"
if [ "$FALTAN" -eq 0 ]; then
  echo "✅ El proyecto tiene todo lo que \`cloudbuild.yaml\` da por hecho."
  echo "   Siguiente:  gcloud builds submit --config=cloudbuild.yaml ."
elif $CREAR; then
  echo "⚠️  Se ha intentado crear $FALTAN cosa(s). Vuelve a ejecutar SIN --crear"
  echo "   para comprobar que quedaron creadas antes de desplegar."
else
  echo "❌ Faltan $FALTAN cosa(s). Ejecuta:  bash scripts/provisionar-gcp.sh --crear"
fi
echo ""
echo "⚠️  La base de datos NO la toca este script. Con Neon, crea el proyecto en"
echo "    su panel y mete su cadena de conexión en el secreto DATABASE_URL."
echo "    Si vienes de otro proyecto de GCP, EXPORTA los datos antes: apuntar"
echo "    producción a una base vacía no da ningún error — la web funciona y"
echo "    simplemente no conoce a ningún usuario."
