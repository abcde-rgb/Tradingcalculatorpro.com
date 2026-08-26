#!/usr/bin/env bash
# ============================================================
# TradingCalculator.pro — verificación de endpoints
# Uso: bash check.sh
# ============================================================

# La URL sale del entorno. El valor que había aquí apuntaba a us-central1, y el
# despliegue real está en europe-west1 (ver CLAUDE.md y deploy-cloud-run.yml), así
# que este script llevaba tiempo comprobando un host equivocado: todo fallaba y no
# porque la API estuviera mal. Sin BACKEND_URL no se adivina nada, se aborta.
if [ -z "$BACKEND_URL" ]; then
  echo "Falta BACKEND_URL. Ejemplo:"
  echo "  BACKEND_URL=https://<servicio>-<num>.europe-west1.run.app bash check.sh"
  exit 2
fi
BASE="${BACKEND_URL%/}/api"
PASS=0
FAIL=0

check() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"
  local expected="$5"

  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -w "\n%{http_code}" 2>/dev/null)
  else
    response=$(curl -s "$url" -w "\n%{http_code}" 2>/dev/null)
  fi

  code=$(echo "$response" | tail -1)
  body_out=$(echo "$response" | head -n -1)

  if echo "$body_out" | grep -q "$expected"; then
    echo "✅  $label (HTTP $code)"
    PASS=$((PASS+1))
  else
    echo "❌  $label (HTTP $code) — esperado: '$expected' — respuesta: $(echo $body_out | cut -c1-120)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "======================================================"
echo "  TradingCalculator.pro — Health Check"
echo "  $BASE"
echo "======================================================"
echo ""

# ── Infraestructura ─────────────────────────────────────────
check "Health endpoint"        GET  "$BASE/health"                   "" "healthy"
check "Root API"               GET  "$BASE/"                         "" "TradingCalculator"

# ── Datos de mercado (sin auth) ─────────────────────────────
check "Precios (BTC)"          GET  "$BASE/prices?symbols=BTC-USD"   "" "BTC"
check "Stock data (AAPL)"      GET  "$BASE/stock/AAPL"               "" "AAPL"
check "Ticker search"          GET  "$BASE/tickers/search?q=apple"   "" "AAPL"
check "Options expirations"    GET  "$BASE/options/expirations/AAPL" "" "expir"

# ── Auth (endpoints que deben rechazar sin token) ───────────
check "Auth /me sin token (401)" GET "$BASE/auth/me"                "" "detail"

# ── Planes de suscripción ────────────────────────────────────
check "Planes disponibles"     GET  "$BASE/plans"                    "" "price"

# ── Cálculos opciones (sin auth) ────────────────────────────
check "Payoff diagram" POST "$BASE/calculate/payoff" \
  '{"legs":[{"type":"call","action":"buy","strike":150,"premium":5,"qty":1,"daysToExpiry":30,"iv":0.25}],"stockPrice":150}' \
  "payoff"

check "Greeks" POST "$BASE/calculate/greeks" \
  '{"legs":[{"type":"call","action":"buy","strike":150,"premium":5,"qty":1,"daysToExpiry":30,"iv":0.25}],"stockPrice":150}' \
  "delta"

# ── Monte Carlo ──────────────────────────────────────────────
check "Monte Carlo" POST "$BASE/monte-carlo" \
  '{"ticker":"AAPL","days":30,"simulations":100}' \
  "simulations"

echo ""
echo "======================================================"
printf "  Resultado: %d pasados, %d fallidos\n" "$PASS" "$FAIL"
echo "======================================================"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
