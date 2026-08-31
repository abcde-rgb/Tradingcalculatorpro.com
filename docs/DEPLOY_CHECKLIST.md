# 🚀 Checklist de despliegue y lanzamiento

> Pasos para dejar la web **publicada y operativa**. Lo marcado 🔴 **bloquea** el lanzamiento.
> Lo que está en código ya funciona; esta lista es sobre todo **operación** (consolas externas).
> Fuente de los nombres: `.github/workflows/*.yml` y `backend/.env.example`.

---

## 0. Las dos mitades salen solas 🔴

| Push a `main` que toque… | Qué pasa |
|---|---|
| `frontend/**` | `deploy-gh-pages.yml` → GitHub Pages |
| `backend/**` | Cloud Run source deploy → `tradingcalculator-api` en **`us-east1`** |

⚠️ **Esta sección decía que el backend «no sale nunca solo» y había que lanzar
`cloudbuild.yaml` a mano. Era falso**, y llevaba siéndolo desde el 2026-07-19,
cuando se conectó el despliegue desde código. `cloudbuild.yaml` se retiró el
2026-08-25 porque describía un montaje inexistente y, de haber funcionado,
habría creado un servicio duplicado en Europa.

Como salen las dos solas y del mismo push, el orden ya no hay que vigilarlo. Lo
que sí hay que vigilar es **que el push disparó las dos cosas**:

```bash
# El backend: la etiqueta de la imagen es el SHA del commit desplegado
gcloud run services describe tradingcalculator-api --region=us-east1 \
  --format='value(spec.template.spec.containers[0].image)'

# ¿Responde? (la primera petición tras un rato ociosa arranca en frío: da margen)
curl -s -m 60 -o /dev/null -w 'HTTP %{http_code} en %{time_total}s\n' \
  https://tradingcalculator-api-2rkq2snofq-ue.a.run.app/api/health

# El frontend: Actions → «Build & Deploy to GitHub Pages». Un merge que no
# dispara nada NO es un despliegue (pasó con el PR #177 el 2026-08-06).
```

⚠️ **La configuración del backend NO está en el repositorio.** Son 15 variables
de entorno puestas en el propio servicio de Cloud Run. Para ver cuáles hay sin
imprimir sus valores —entre ellos la cadena de conexión con contraseña—:

```bash
gcloud run services describe tradingcalculator-api --region=us-east1 \
  --format='value(spec.template.spec.containers[0].env[].name)'
```

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
- [ ] 🔴 `SECRET_ENCRYPTION_KEY` — `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
      Sin ella, las claves de Stripe/SendGrid/PayPal/Google que se guarden desde `/admin` caen a
      **texto plano** en Postgres (`server.py:cifrado_activo()`, `GET /admin/settings` lo expone como
      `encryption_active` y el panel pinta un aviso ámbar si falta). No rota nada por sí sola: si ya
      había secretos guardados en claro antes de ponerla, siguen en claro hasta que se regraben.

## D. Cloud Run / Cloud SQL (infra)

> ✅ **Resuelto el 2026-08-27.** Este bloque describía un montaje que NO EXISTE:
> `europe-west1`, una instancia de Cloud SQL `trading-db`, un repositorio
> `trading-repo` y siete secretos en Secret Manager. La comprobación contra el
> proyecto real (anotada en `.claude/rules/infra.md` el 2026-08-25, cuando se
> retiró `cloudbuild.yaml` por describir esa misma ficción) dice otra cosa:
>
> | Qué | De verdad |
> |---|---|
> | Servicio | `tradingcalculator-api` en **`us-east1`** |
> | Base de datos | **Externa, por `DATABASE_URL`. No hay Cloud SQL** — la API `sqladmin` ni está habilitada |
> | Configuración | 15 variables de entorno en el propio servicio, no `--update-secrets` |
>
> Dejarlo como estaba costaba caro en las dos direcciones: quien mirase
> `--region=europe-west1` vería «not found» sobre un servicio que existe y podría
> darlo por caído, y quien siguiera las casillas crearía un SEGUNDO servicio en
> Europa mientras el frontend apunta al de EE. UU.

- [x] ~~Cloud SQL `trading-db` en `europe-west1`~~ — **no aplica**: la base de datos
      es externa y llega por `DATABASE_URL`.
- [x] ~~Servicio Cloud Run en `europe-west1` con `--add-cloudsql-instances`~~ —
      **no aplica**: el servicio vive en `us-east1` y no monta ningún socket de
      Cloud SQL.
- [ ] `min-instances=1` (no bajar a 0). `concurrency=80`. Memoria 512Mi.
- [x] ~~Artifact Registry `trading-repo` en `europe-west1`~~ — **no aplica**: las
      imágenes van a `us-east1-docker.pkg.dev/<proy>/cloud-run-source-deploy/`,
      que crea el propio despliegue desde código.
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
  - Orígenes JS autorizados: **`https://tradingcalculator.pro`** — obligatorio desde el
    cutover del 2026-08-28, o el botón de Google falla. Deja también
    `https://abcde-rgb.github.io` mientras Pages siga respondiendo.
  - El `GOOGLE_CLIENT_ID` del backend (C) y `REACT_APP_GOOGLE_CLIENT_ID` (A) son el **mismo**.

## G. Dominio / DNS — **dominio: `tradingcalculator.pro`** ✅ (falta desplegar el backend)

⚠️ Ojo con el nombre: es `tradingcalculator.pro`, con punto. `tradingcalculatorpro.com`
—que es como se llama el repositorio— **es de un tercero**. Confundirlos costó BUG-067.

**Estado a 2026-08-28:** el cutover está hecho. `frontend/public/CNAME` lleva
`tradingcalculator.pro`, el `homepage` y el `PUBLIC_URL` cuelgan de la raíz, y el DNS
resuelve a los cuatro registros A de GitHub Pages (`185.199.108–111.153`, verificado).
El canonical/sitemap/robots y el CORS y los correos del backend están al dominio propio.

- [ ] 🔴 **Llevar el arreglo del CORS a `main`.** Está en `server.py` y Cloud Run corre
      el código anterior: **hasta que se despliegue, la web carga y no habla con el
      backend**. El push a `main` con cambios en `backend/**` dispara el despliegue solo
      (ver `.claude/rules/infra.md`); comprueba la revisión, no lo des por hecho.
- [ ] 🔴 **Actualizar `FRONTEND_URL`, `PASSKEY_RP_ID` y `PASSKEY_ORIGIN` en el servicio.**
      Las variables del servicio **sobreviven** al despliegue desde código, así que una
      `FRONTEND_URL` vieja le gana al valor del código y los correos seguirán llevando a
      la URL antigua. Comando exacto en `docs/MIGRACION_DOMINIO.md` § «Lo que falta».
- [ ] **GitHub → Settings → Pages → Custom domain** = `tradingcalculator.pro`, y
      **Enforce HTTPS** activado.
- [ ] Verifica: `curl -I https://tradingcalculator.pro` · `…/sitemap.xml` · `…/robots.txt`.
- [ ] ⚠️ Las **passkeys** registradas contra el dominio viejo dejan de validar: el `rp_id`
      cambia y WebAuthn no las migra. Hay que registrarlas de nuevo desde Ajustes.

## H. SendGrid

- [ ] 🔴 Dominio remitente verificado para `alerts@tradingcalculator.pro` (`SENDER_EMAIL`).
      Sin esto **ningún correo transaccional sale** — registro, reset de contraseña,
      magic link, alertas. Confirmado como causa raíz de BUG-075 (2026-08-31): "el
      envío de correos no funciona ni magic link". El fallo de magic link/verificación
      además era **silencioso en los logs** hasta ese commit (`server.py`: `_send_magic_link_email`,
      `_send_email_verification` no comprobaban el código de respuesta de SendGrid).
- [ ] Probar: verificación de email, reset de contraseña, magic link, alerta de precio.

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
