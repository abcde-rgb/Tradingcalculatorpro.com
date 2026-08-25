# 🚀 Checklist de despliegue y lanzamiento

> Pasos para dejar la web **publicada y operativa**. Lo marcado 🔴 **bloquea** el lanzamiento.
> Lo que está en código ya funciona; esta lista es sobre todo **operación** (consolas externas).
> Fuente de los nombres: `.github/workflows/*.yml`, `backend/.env.example`, `cloudbuild.yaml`.

---

## 0.bis. Antes de nada: ¿el proyecto de GCP tiene con qué? 🔴

`cloudbuild.yaml` da por hechos seis recursos con nombre fijo —`trading-repo`,
`tradingcalculator-api`, `trading-backend-sa`, los siete secretos, y con Cloud SQL
también `trading-db`—. En un proyecto **nuevo** no existe ninguno, y el build no
dice «te falta esto»: revienta con un `not found` en el primer paso que toque uno.

```bash
bash scripts/provisionar-gcp.sh            # informe: qué falta
bash scripts/provisionar-gcp.sh --crear    # crea lo que falta (idempotente)
```

⚠️ **Descubierto el 2026-08-25.** Se había migrado a `tradingcalculatorpro-502817`,
con facturación activa y **cero** repositorios, cero servicios y cero secretos. El
despliegue llevaba roto desde la migración sin que nadie lo supiera: el backend no
sale solo, así que nada avisa de que lleve meses sin desplegarse.

⚠️ **Y antes de apuntar producción a una base nueva, EXPORTA la vieja.** Una base
vacía no produce ningún error: la web arranca, responde y simplemente no conoce a
ningún usuario. Los registros y las suscripciones se descubren perdidos cuando
alguien intenta entrar.

---

## 0. Orden: **el backend PRIMERO, siempre** 🔴

Las dos mitades se despliegan por caminos distintos y a velocidades distintas: el
frontend sale solo en cuanto se toca `frontend/**` en `main`, y el backend **no sale
nunca solo** — hay que lanzar `cloudbuild.yaml` a mano. Esa asimetría hace que el
orden por defecto sea justo el peligroso.

Un frontend por delante de su backend **no degrada, rompe**. El caso real: el diario
multiproducto (2026-08-06) manda `instrument_type` con siete valores nuevos; el
backend anterior los valida contra `^(spot|option)$` y responde **422 a todo**,
incluido el valor por defecto del formulario. No se pierde nada y se arregla
desplegando el backend, pero mientras tanto el usuario no puede guardar ni una
operación.

```bash
# 1) Backend (desde la raíz del repo, con el proyecto de GCP activo)
gcloud builds submit --config=cloudbuild.yaml .

# 2) Comprobar que respondió ANTES de tocar el frontend
gcloud run services describe tradingcalculator-api --region=europe-west1 \
  --format='value(status.url)'
curl -fsS "$(gcloud run services describe tradingcalculator-api \
  --region=europe-west1 --format='value(status.url)')/api/health"

# 3) Frontend: sale solo al mergear a `main`. Si el workflow no se disparó,
#    Actions → «Build & Deploy to GitHub Pages» → Run workflow (tiene
#    workflow_dispatch). Un merge que no dispara nada NO es un despliegue.
```

⚠️ **Comprueba siempre que el merge disparó el workflow.** El 2026-08-06 el merge del
PR #177 tocó 23 archivos de `frontend/**` y no generó ninguna ejecución: el sitio se
quedó en la versión anterior sin que nada avisara, porque la ausencia de un run no
produce ningún error en ninguna pantalla.

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

Los usa el despliegue del backend (`cloudbuild.yaml`, manual desde GCP):
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

### E-bis. IVA y desistimiento — **obligatorio antes de la primera venta** 🔴

Desde la auditoría del 2026-08-10, `_create_stripe_checkout_session` manda
`automatic_tax`, `tax_id_collection`, `billing_address_collection` y
`consent_collection`. Esos cuatro campos **fallan la creación de la sesión** si
lo de abajo no está hecho en el dashboard de Stripe:

- [ ] **Stripe Tax activado** (Settings → Tax). Sin él, `automatic_tax.enabled`
      devuelve error y el checkout no abre.
- [ ] **Dirección de origen y categoría de producto** configuradas en Stripe Tax
      (servicio digital / *electronically supplied services*).
- [ ] **Alta en la ventanilla única del IVA** — para una LLC estadounidense que
      vende a consumidores de la UE, el régimen **OSS exterior a la Unión**
      (non-Union OSS). Sin el alta se recauda el impuesto y no hay dónde
      declararlo, que es peor que no recaudarlo.
- [ ] **URL de Términos y de Privacidad** en Stripe (Settings → Public details).
      `consent_collection.terms_of_service = "required"` pinta la casilla de
      aceptación y **exige** que esa URL exista.
- [ ] Comprobar en una sesión de prueba que el IVA aparece **desglosado** antes
      de confirmar: los Términos dicen que el total mostrado es el que se cobra.

> Por qué está aquí: se vendían servicios digitales B2C en euros sin determinar
> el país del cliente ni repercutir el tipo de destino. Cada suscripción
> devengaba un IVA no recaudado — un pasivo que crece con las ventas y que luego
> se paga del margen y con recargo.

## F. Google OAuth 🔴

- [ ] En Google Cloud Console → Credenciales → OAuth client:
  - Orígenes JS autorizados: `https://abcde-rgb.github.io` (y el dominio propio si aplica).
  - El `GOOGLE_CLIENT_ID` del backend (C) y `REACT_APP_GOOGLE_CLIENT_ID` (A) son el **mismo**.

## G. Dominio / DNS — **dominio: `tradingcalculatorpro.com`**

⚠️ **Estado real, verificado el 2026-08-03:** el cutover **se revirtió en su día y no
está hecho**. Hoy `frontend/public/CNAME` **no existe**, el `homepage` de `package.json`
sigue en `https://abcde-rgb.github.io/Tradingcalculatorpro.com` y el workflow publica con
`PUBLIC_URL: /Tradingcalculatorpro.com`. Lo que sí está unificado al dominio propio es el
canonical/sitemap/robots del frontend y el CORS y los emails del backend. Falta reponer
las tres piezas de la ruta base **y** el cutover de DNS/Pages (acción manual en consolas):

1. **En tu registrador de dominios**, apunta el dominio a GitHub Pages:
   - Registros **A** del apex `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Registro **CNAME** `www` → `abcde-rgb.github.io`
2. **Crear `frontend/public/CNAME`** con `tradingcalculatorpro.com` dentro, y poner el
   `homepage` de `package.json` y el `PUBLIC_URL` del workflow en la raíz (`/`). Luego
   **GitHub → Settings → Pages → Custom domain** → `tradingcalculatorpro.com` → Save.
3. Activa **Enforce HTTPS** cuando GitHub emita el certificado (minutos/horas).
4. ⚠️ **Orden:** configura el DNS (paso 1) **antes** de mergear el PR. Tras el deploy la web
   vivirá en `https://tradingcalculatorpro.com/` (raíz); el viejo
   `abcde-rgb.github.io/Tradingcalculatorpro.com` dejará de servir (el `homepage`/`PUBLIC_URL`
   cambiaron a raíz). Si mergeas sin DNS, habrá un hueco hasta que propague.
5. Verifica: `curl -I https://tradingcalculatorpro.com` · `…/sitemap.xml` · `…/robots.txt`.
6. ⚠️ **Nada de esto es reversible en caliente:** hasta que el DNS propague, cambiar la
   ruta base deja el sitio actual sin servir. Por eso el paso 1 va antes que el 2.

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
