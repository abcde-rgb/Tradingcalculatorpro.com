# 🚀 Checklist de despliegue y lanzamiento

> Pasos para dejar la web **publicada y operativa**. Lo marcado 🔴 **bloquea** el lanzamiento.
> Lo que está en código ya funciona; esta lista es sobre todo **operación** (consolas externas).
> Fuente de los nombres: `.github/workflows/*.yml`, `backend/.env.example`, `cloudbuild.yaml`.

---

## A. Secretos de GitHub Actions (frontend → GitHub Pages)

Repo → Settings → Secrets and variables → Actions. Los usa `deploy-gh-pages.yml`:

- [ ] 🔴 `REACT_APP_BACKEND_URL` — URL de Cloud Run **sin** `/api` (si falta, la app no llama al backend)
- [ ] 🔴 `REACT_APP_GOOGLE_CLIENT_ID` — login Google
- [ ] `REACT_APP_GA4_MEASUREMENT_ID` — analítica GA4
- [ ] `REACT_APP_GTM_ID` — Google Tag Manager
- [ ] `REACT_APP_GSC_VERIFICATION` — verificación Search Console
- [ ] `REACT_APP_BING_VERIFICATION` — verificación Bing

## B. Secretos de GitHub Actions (backend → Cloud Run)

Los usa `deploy-cloud-run.yml`:
- [ ] 🔴 `GCP_WORKLOAD_IDENTITY_PROVIDER` — federación de identidad (sin claves JSON)
- [ ] 🔴 `GCP_SERVICE_ACCOUNT` — SA de despliegue
- [ ] `ADMIN_EMAILS` — emails admin (coma-separados)
- [ ] `BACKEND_URL` — **opcional**: si apunta a un backend vivo, el job `test` ejecuta los
      tests de integración contra él; si se deja vacío, ahora se **saltan** limpiamente
      (fix de `conftest.py` de 2026-06-25). Los tests unitarios offline corren siempre.

## C. GCP Secret Manager (backend en runtime)

`--update-secrets` en el deploy los inyecta como env vars. Crea cada secreto:
- [ ] 🔴 `JWT_SECRET` — `openssl rand -hex 32` (si falta, el backend **no arranca** en prod)
- [ ] 🔴 `DATABASE_URL` — `postgresql://user:pass@/db?host=/cloudsql/PROJ:REGION:trading-db`
- [ ] 🔴 `GOOGLE_CLIENT_ID` — **sin** `\n` final (un salto de línea rompe todos los logins)
- [ ] 🔴 `STRIPE_API_KEY` — `sk_live_...` en producción
- [ ] 🔴 `STRIPE_WEBHOOK_SECRET` — `whsec_...`
- [ ] `SENDGRID_API_KEY` — email
- [ ] `ANTHROPIC_API_KEY` — AI Trade Coach

## D. Cloud Run / Cloud SQL (infra)

- [ ] 🔴 Cloud SQL **PostgreSQL** `trading-db` en `europe-west1` operativa.
- [ ] 🔴 Servicio Cloud Run `tradingcalculator-api` en `europe-west1`,
      `--add-cloudsql-instances=PROJ:europe-west1:trading-db`.
- [ ] `min-instances=1` (no bajar a 0). `concurrency=80`. Memoria 512Mi.
- [ ] Artifact Registry `trading-repo` en `europe-west1` (el workflow lo crea si falta).
- [ ] Healthcheck post-deploy responde: `GET {SERVICE_URL}/api/health` → 200 `{status: healthy}`.

## E. Stripe (operación) 🔴

- [ ] Productos y **price IDs** coinciden con `SUBSCRIPTION_PLANS` en `server.py`
      (`price_1TXM8E…` monthly, `…K…` quarterly, `…Q…` annual, `…Y…` lifetime).
- [ ] **Webhook endpoint** en Stripe → `https://{BACKEND_URL}/api/webhook/stripe`,
      eventos: `checkout.session.completed`, `customer.subscription.deleted/updated`,
      `invoice.payment_failed`. Copia el `whsec_...` a Secret Manager (C).
- [ ] Probar un pago de prueba de cada plan y confirmar que el usuario pasa a premium.
- [ ] (Hardening C-08) Asegurar que las claves Stripe **no** se sobreescriben desde la DB
      (`app_settings`); usar solo Secret Manager.

## F. Google OAuth 🔴

- [ ] En Google Cloud Console → Credenciales → OAuth client:
  - Orígenes JS autorizados: `https://abcde-rgb.github.io` (y el dominio propio si aplica).
  - El `GOOGLE_CLIENT_ID` del backend (C) y `REACT_APP_GOOGLE_CLIENT_ID` (A) son el **mismo**.

## G. Dominio / DNS — **dominio: `tradingcalculatorpro.com`**

El **código ya está unificado** a este dominio (frontend canonical/sitemap/robots, CORS y
emails del backend, `frontend/public/CNAME`, `homepage` y `PUBLIC_URL` = raíz `/`). Falta solo
el **cutover de DNS/Pages** (acción manual en consolas):

1. **En tu registrador de dominios**, apunta el dominio a GitHub Pages:
   - Registros **A** del apex `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Registro **CNAME** `www` → `abcde-rgb.github.io`
2. **GitHub → Settings → Pages → Custom domain** → `tradingcalculatorpro.com` → Save
   (el archivo `frontend/public/CNAME` ya lo fija en cada deploy).
3. Activa **Enforce HTTPS** cuando GitHub emita el certificado (minutos/horas).
4. ⚠️ **Orden:** configura el DNS (paso 1) **antes** de mergear el PR. Tras el deploy la web
   vivirá en `https://tradingcalculatorpro.com/` (raíz); el viejo
   `abcde-rgb.github.io/Tradingcalculatorpro.com` dejará de servir (el `homepage`/`PUBLIC_URL`
   cambiaron a raíz). Si mergeas sin DNS, habrá un hueco hasta que propague.
5. Verifica: `curl -I https://tradingcalculatorpro.com` · `…/sitemap.xml` · `…/robots.txt`.

## H. SendGrid

- [ ] Dominio remitente verificado para `alerts@tradingcalculatorpro.com` (`SENDER_EMAIL`).
- [ ] Probar: verificación de email, reset de contraseña, alerta de precio.

## I. Endurecimiento del repositorio (recomendado)

- [ ] **Branch protection** en `main`: exigir checks de CI + 1 review, bloquear push directo.
- [ ] Activar **Dependabot**, **CodeQL** y **secret scanning** (Settings → Code security).
- [ ] El nuevo `ci.yml` corre en PRs (compile + unit tests + build). Marcarlo como check requerido.

---

## J. Smoke test post-lanzamiento (5 min)

1. Abrir la web → carga la landing, sin errores en consola.
2. Registro → email de verificación llega → verificar.
3. Login Google → entra al dashboard.
4. Recargar `/dashboard` → la sesión se mantiene (refresh por cookie).
5. Gráfico TradingView carga; cambiar activo/temporalidad persiste.
6. Crear un cálculo y guardarlo → aparece en historial.
7. Ir a `/pricing` → checkout de un plan (modo prueba) → webhook → premium activo.
8. (Admin) entrar a `/admin` con un `ADMIN_EMAILS` → ver métricas reales.
9. `GET /api/health` → 200.

> Al terminar el lanzamiento, registra el resultado en el **registro de sesiones** de
> [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) y actualiza el **semáforo** (§1).
