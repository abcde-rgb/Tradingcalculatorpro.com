# Estudio de infraestructura y costes — de código a dominio

> Tu stack hoy: **GitHub** (repo + Pages), **Node** (build del frontend) y
> **Google Cloud** (Cloud Run + Cloud SQL). Este doc estudia **cada capa**:
> qué usas, qué cuesta, alternativas gratis/baratas, velocidad y qué cambiar.
> Cifras **aproximadas** (región UE); verifica siempre en la consola de facturación.

## 1. Mapa actual (verificado en el repo)
| Capa | Hoy | Coste | Dónde |
|---|---|---|---|
| **Frontend** (React build) | **GitHub Pages** | **Gratis** | `deploy-gh-pages.yml` |
| **Backend** (FastAPI) | **Cloud Run** 1 vCPU / 1 Gi, `min-instances` def. **1**, max 10, conc. 80 | **Pago** (⚠️ el mayor evitable) | `deploy-cloud-run.yml` |
| **Base de datos** | **Cloud SQL** PostgreSQL (europe-west1) 24/7 | **Pago** (⚠️ el mayor fijo) | socket `--add-cloudsql-instances` |
| **Imágenes Docker** | **Artifact Registry** | Pago pequeño (se acumulan) | `trading-repo` |
| **Secretos** | Secret Manager | ~Gratis | `--update-secrets` |
| **Dominio** | `abcde-rgb.github.io/...` | Gratis (❗techo de credibilidad/SEO) | CNAME |
| **Email** | SendGrid | Gratis (100/día) | — |
| **Almacenamiento de archivos** | *ninguno* (datos en Postgres JSONB) | — | screenshots = URLs |

## 2. Dónde se va el dinero (por orden)
1. **Cloud SQL 24/7** — es un servidor encendido todo el día aunque no haya nadie
   (~**€8-25/mes** según tier/almacenamiento). El mayor coste fijo.
2. **Cloud Run `min-instances=1`** — mantiene una instancia **siempre caliente**
   (se factura aunque no haya tráfico): **~€10-15/mes**. Con `min=0` pagas
   **solo por petición** → ~**€0** con poco tráfico.
3. **Artifact Registry** — las imágenes Docker se **acumulan** en cada deploy;
   pequeño pero conviene una política de limpieza.
4. **Egress/red** — insignificante con tráfico bajo.

## 3. Capa por capa — opciones, gratis vs pago, velocidad

### Frontend (dónde sirves el React)
- **GitHub Pages** (hoy): gratis, CDN global decente, pero **sin control de
  cabeceras/caché** y limitado para SPA.
- **Cloudflare Pages / Netlify / Vercel** (free tier): **gratis**, CDN más rápido,
  cabeceras/caché configurables, *previews* por PR, y (Vercel/Netlify) SSR/
  prerender si algún día lo quieres. **Recomendado migrar aquí** por velocidad y
  control — es gratis.

### Backend (FastAPI)
- **Cloud Run `min=0`** (scale-to-zero): **casi gratis** en reposo; coste solo por
  uso. **Contra:** *cold start* ~2-4 s para el primer usuario tras inactividad.
- **Cloud Run `min=1`** (hoy): sin cold start, pero **siempre pagando**.
- Alternativas gestionadas con free tier: **Render**, **Railway**, **Fly.io**
  (buenas para bajo tráfico; menos "serias" que Cloud Run para escalar).
- **Recomendación:** `min=0` **antes de lanzar / con poco tráfico**; sube a `min=1`
  cuando tengas **usuarios de pago** que justifiquen el arranque instantáneo.

### Base de datos (el mayor ahorro)
- **Cloud SQL** (hoy): sólido y gestionado, pero **encendido 24/7 = coste fijo**.
- **Neon** (Postgres serverless): **free tier** (0,5 GB, *scale-to-zero*), TCP+SSL.
  **Tu código YA lo soporta** (`DB_PROVIDER=neon`, guía en `MIGRACION_NEON.md`).
  Cambio = variable + secreto, **sin tocar código**.
- **Supabase** (Postgres free): alternativa con extras (auth/storage) que no
  necesitas ahora.
- **Recomendación:** **Neon free** hasta tener tracción; volver a Cloud SQL (o
  Neon de pago) cuando el volumen/uptime lo pidan.

### Dominio (la mejor inversión)
- Comprar `tradingcalculatorpro.com`: **~€10-15/año** en **Cloudflare Registrar**
  (a precio de coste, sin markup) o Namecheap/Porkbun.
- Es **la mayor palanca** de credibilidad e indexación (github.io tiene techo).
  Apúntalo con **Cloudflare DNS** (gratis) y de paso metes su CDN/caché delante.

### CDN / velocidad
- **Cloudflare (free)** por delante de todo: caché, HTTPS, compresión, protección.
  Mejora Core Web Vitals (factor de ranking) sin coste.
- Ya generas **~664 páginas pre-renderizadas** → bueno para SEO/velocidad; mantenlo.

### Almacenamiento de archivos (futuro)
- Hoy **no usas blobs** (todo en Postgres JSONB; capturas = URLs). Si algún día
  subes imágenes: **Cloudflare R2** (sin coste de egress) o **GCS**. No lo
  necesitas aún.

### Email
- **SendGrid free** (100/día) sobra para arranque; si creces, plan de pago o
  alternativas (Resend, Amazon SES muy barato).

## 4. Dos configuraciones recomendadas

### A. Pre-lanzamiento / bajo tráfico — **casi gratis**
- Frontend: GitHub Pages **o** Cloudflare Pages (gratis, más rápido).
- Backend: Cloud Run **`MIN_INSTANCES=0`**.
- BD: **`DB_PROVIDER=neon`** (free).
- Dominio propio (~€10/año) + **Cloudflare DNS/CDN** (gratis).
- **Coste estimado: ~€0-3/mes + ~€10/año de dominio.**
- **Trade-off honesto:** cold starts (unos segundos para el primer usuario tras
  inactividad, en backend y BD). Aceptable sin tráfico real.

### B. Con usuarios de pago — **rápido y fiable**
- Cloud Run **`min=1`** (sin cold start; app financiera = UX importa).
- BD: Cloud SQL o Neon de pago (según uptime/volumen).
- Cloudflare delante. Sube recursos (memoria/CPU) solo si hace falta.
- **Coste:** decenas de € /mes, pero **ya cubierto por ingresos**.

## 5. Acciones concretas (sin tocar código)
- [ ] Variable de repo **`DB_PROVIDER=neon`** + crear proyecto Neon y poner
      `DATABASE_URL` en el secreto (guía `MIGRACION_NEON.md`).
- [ ] Variable de repo **`MIN_INSTANCES=0`** (ahorro inmediato; cold start a cambio).
- [ ] Comprar dominio + **Cloudflare** (DNS gratis, CDN gratis) delante.
- [ ] Política de **limpieza de imágenes** en Artifact Registry (borra tags viejos).
- [ ] (Opcional) migrar el frontend a **Cloudflare Pages** por velocidad.

## 6. Honestidad
- La regla: **paga por rendimiento cuando haya ingresos, no antes.** Hoy puedes
  estar **casi a €0** con `min=0` + Neon, aceptando cold starts.
- La **única** inversión que yo haría ya es el **dominio** (~€10/año): multiplica
  SEO y confianza y no tiene alternativa gratis creíble.
- Cambiar de proveedor de BD o de hosting **no requiere reescribir el código**
  (el shim y `init_pool` ya soportan Cloud SQL y Neon; el frontend es estático).

*Verifica precios reales en la consola de GCP/Cloudflare antes de decidir; las
cifras aquí son órdenes de magnitud, no facturas.*
