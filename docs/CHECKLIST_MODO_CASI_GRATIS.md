# Checklist — pasar a "modo casi-gratis" (para esta tarde)

> Pasos concretos para bajar el coste a ~€0 usando lo que **ya tienes** (GitHub,
> Node, Google Cloud). No requiere reescribir código: casi todo son **variables
> de repositorio** y consolas externas. Detalle de fondo en
> [`ESTUDIO_INFRAESTRUCTURA_COSTES.md`](./ESTUDIO_INFRAESTRUCTURA_COSTES.md).
>
> ⚠️ Los pasos con 🌐 son **acciones tuyas** en una consola externa (yo no tengo
> acceso). Los ⌨️ los puedo hacer/ayudar desde el repo.

## 1. Base de datos → Neon (gratis, el mayor ahorro)
- [ ] 🌐 Crear cuenta en **neon.tech** → nuevo proyecto, **región UE** (cerca de
      europe-west1). Copiar la *connection string* (`postgresql://…?sslmode=require`).
- [ ] 🌐 **Migrar datos** de Cloud SQL → Neon si hay datos que conservar
      (`pg_dump` + `pg_restore`, pasos exactos en `MIGRACION_NEON.md`).
      Si aún no hay datos reales, se puede empezar limpio (las tablas se crean solas al arrancar).
- [ ] 🌐 En **GCP Secret Manager**: actualizar el secreto **`DATABASE_URL`** con la
      cadena de Neon.
- [ ] 🌐 En **GitHub → repo → Settings → Secrets and variables → Actions →
      Variables**: crear/poner **`DB_PROVIDER=neon`**.
- [ ] ⌨️ Redeploy del backend (push a `main` con cambio en `backend/**`, o lanzar
      el workflow a mano) → verificar que arranca y responde.

## 2. Backend → scale-to-zero (ahorro inmediato)
- [ ] 🌐 GitHub → Variables → **`MIN_INSTANCES=0`**.
- [ ] ⌨️ Redeploy. A cambio: **cold start** (~2-4 s el primer usuario tras
      inactividad). Aceptable antes de lanzar.

## 3. Dominio propio + Cloudflare (la única inversión: ~€10/año)
- [ ] 🌐 Comprar **`tradingcalculatorpro.com`** en **Cloudflare Registrar** (a
      precio de coste) o Namecheap/Porkbun.
- [ ] 🌐 Añadir el sitio a **Cloudflare** y apuntar los *nameservers* del dominio a
      Cloudflare (DNS + CDN gratis).
- [ ] 🌐 **Frontend (GitHub Pages)**: en GitHub → repo → Settings → Pages →
      *Custom domain* = `tradingcalculatorpro.com`; activar **Enforce HTTPS**.
      (El repo ya trae `frontend/public/CNAME`.)
- [ ] 🌐 **DNS en Cloudflare**: registro para el ápice/`www` hacia GitHub Pages
      (CNAME `www` → `abcde-rgb.github.io`; ápice con *CNAME flattening*).
- [ ] 🌐 **Backend**: crear *domain mapping* en Cloud Run
      (`api.tradingcalculatorpro.com`) **o** dejar la URL de Cloud Run. Si usas
      subdominio propio, apúntalo en Cloudflare (⚠️ modo **DNS only/gris** para el
      subdominio del API, no naranja, para no romper el WebSocket de alertas).
- [ ] ⌨️ Revisar que `REACT_APP_BACKEND_URL` (GitHub Secret) apunte al backend
      correcto y que el CORS incluya el dominio (ya hardcodeado
      `tradingcalculatorpro.com`).

## 4. Limpieza de imágenes Docker (coste pequeño que se acumula)
- [ ] 🌐 En **Artifact Registry** (`trading-repo`): crear una **política de
      limpieza** que borre tags viejos (deja `latest` + últimas N). O borrar a mano
      las imágenes antiguas cada cierto tiempo.

## 5. (Opcional) Frontend a Cloudflare Pages
- [ ] 🌐 Solo si quieres más velocidad/control que GitHub Pages: conectar el repo a
      **Cloudflare Pages** (build `npm run build`, salida `frontend/build`). Gratis.
      No es necesario para lanzar.

## 6. Verificación final (el "go/no-go")
- [ ] Smoke en vivo: **registro → email de verificación → login (Google + email) →
      checkout (Stripe y OxaPay) → webhook sube a premium → acceso completo.**
- [ ] Si los 6 pasos funcionan de punta a punta → listo. Si alguno falla, no abrir.

---
**Resumen:** con los pasos **1 y 2** (dos variables + Neon) ya estás en ~€0/mes.
El paso **3** (dominio + Cloudflare) es la inversión que sí merece la pena. El
resto es opcional. Nada de esto exige tocar el código.
