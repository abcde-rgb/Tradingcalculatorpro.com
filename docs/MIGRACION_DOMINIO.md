# Mudanza a `tradingcalculator.pro`

**Estado: NO hecha.** El sitio se sirve hoy desde
`https://abcde-rgb.github.io/Tradingcalculatorpro.com`. Este documento es el
checklist para mudarlo, y existe porque el cambio **no es una línea**.

> ## ⚠️ El dominio es `tradingcalculator.pro`, NO `tradingcalculatorpro.com`
>
> El 2026-06-26 una sesión «unificó» el dominio y reemplazó todas las referencias
> a `tradingcalculator.pro` por `tradingcalculatorpro.com`, calificando al primero
> de «incorrecto» (ver `REGISTRO_SESIONES.md`). **Fue al revés.** Comprobado por
> DNS el 2026-08-14:
>
> | Dominio | Resuelve a | Qué es |
> |---|---|---|
> | `tradingcalculator.pro` | `3.33.130.190`, `15.197.148.33` | **Parking de GoDaddy** — el dominio propio, registrado y sin web |
> | `tradingcalculatorpro.com` | `2606:4700:…` (Cloudflare) | **De un tercero**, sirviendo otra cosa |
>
> Este documento ya está corregido. **El resto del repositorio no**: quedan ~95
> apariciones de `tradingcalculatorpro.com` en código y docs — CORS y emails del
> backend (`server.py`, `missing_apis.py`), `cloudbuild.yaml`, los 10 ficheros de
> i18n, `Footer.jsx`, `LegalPage.jsx`, `ContactPage.jsx`, `index.html`. Apuntan a
> un dominio ajeno y **hay que corregirlas antes del cutover**.
>
> ⚠️ **Al corregirlas, cambia sólo las minúsculas.** El repositorio se llama
> `Tradingcalculatorpro.com`, así que esa cadena aparece con **T mayúscula** en
> todas las rutas de GitHub Pages (`github.io/Tradingcalculatorpro.com`,
> `PUBLIC_URL`). Un `sed` sin distinguir mayúsculas rompe el despliegue actual.

## Por qué no se cambió sin más

La auditoría del diario (2026-08-06) marcó como arreglo de diez minutos
«corregir `DOMAIN` en `gen-sitemap.js`». No lo es, y hacerlo suelto **empeora**
el SEO en lugar de arreglarlo.

Lo que se comprobó en el repo:

| Comprobación | Resultado |
|---|---|
| `frontend/public/CNAME` | **No existe** |
| `cname:` en `deploy-gh-pages.yml` | **No está** |
| `PUBLIC_URL` del workflow | `/Tradingcalculatorpro.com` — subcarpeta, no raíz |
| `keep_files` de la acción de deploy | `false` → un CNAME subido a mano al branch `gh-pages` se borra en cada despliegue |
| `homepage` en `package.json` | apunta a GitHub Pages |
| DNS de `tradingcalculator.pro` | resuelve a `3.33.130.190` / `15.197.148.33` — **parking de GoDaddy**, no GitHub Pages (`185.199.10x.153`) |

Es decir: **este repositorio despliega a la subcarpeta de GitHub Pages**, y todas
las señales de SEO (canonical, hreflang, Open Graph, Twitter, JSON-LD, el
`Sitemap:` de `robots.txt`, `useSEO.js`) apuntan **coherentemente** ahí.

Cambiar solo el sitemap deja el sitemap anunciando URLs de un dominio mientras
cada página declara `rel=canonical` hacia otro. Google descarta las URLs
anunciadas y se queda con el canonical: se pierde el sitemap entero. Y si el
dominio de Cloudflare no sirve este build, además serían 404.

Qué sirve hoy `tradingcalculator.pro`: **nada**. Resuelve al parking de GoDaddy
(`3.33.130.190`, `15.197.148.33`), es decir dominio registrado sin web detrás.
Eso simplifica la mudanza — no hay contenido que desplazar ni que decidir qué
gana.

## Checklist (todo o nada, en este orden)

1. **Corregir el dominio en el repositorio.** Las ~95 apariciones de
   `tradingcalculatorpro.com` (dominio ajeno) → `tradingcalculator.pro`,
   **respetando las mayúsculas de la ruta del repo** (ver el aviso de arriba).
   Sin esto, el cutover apunta el CORS y los correos a un dominio de un tercero.
2. **DNS en GoDaddy** (el dominio está ahí, y las NS también — no hay Cloudflare
   de por medio) → registros **A** del apex `@` a `185.199.108.153`,
   `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, y **CNAME** `www` a
   `abcde-rgb.github.io`. Quitar antes los registros del parking de GoDaddy.
3. **`frontend/public/CNAME`** con una línea: `tradingcalculator.pro`.
   En `public/` para que CRA lo copie al build en cada despliegue — si se sube
   a mano al branch `gh-pages`, `keep_files: false` lo borra.
4. **`PUBLIC_URL: /`** en `.github/workflows/deploy-gh-pages.yml`. Con dominio
   propio el sitio cuelga de la raíz; dejarlo en `/Tradingcalculatorpro.com`
   rompe **todos** los assets.
5. **`homepage`** en `frontend/package.json` → `https://tradingcalculator.pro`.
6. **`SITE_ORIGIN`** en el paso de build del workflow → `https://tradingcalculator.pro`.
   Cubre de golpe `gen-sitemap.js` y `gen-seo-pages.js` (sitemap + las ~1.580
   páginas generadas).
7. **Literales que aún no leen `SITE_ORIGIN`** — hay que cambiarlos a mano:
   - `frontend/src/hooks/useSEO.js` (`ORIGIN`)
   - `frontend/public/index.html` (canonical, 10 × hreflang, `og:url`,
     `og:image`, `twitter:url`, `twitter:image`, y las URLs de los bloques JSON-LD)
   - `frontend/public/robots.txt` (línea `Sitemap:`)
8. **Backend** — ⚠️ **sí hay que tocarlo.** (Este paso decía «nada que tocar»; era
   falso y dejaba dos fallos servidos el día del cutover.)

   a. **CORS**: la lista de `server.py` está hardcodeada con
      `https://tradingcalculatorpro.com` y su `www` — **el dominio ajeno**. Hay
      que sustituirlos por `https://tradingcalculator.pro` y
      `https://www.tradingcalculator.pro`, o el navegador descarta todas las
      respuestas y el login queda muerto en todo el sitio. Mismo cambio en la
      lista `allowed` de `missing_apis.py`.

      El fallo **no se ve en los logs**: sin cabecera CORS el backend responde
      200 con las cookies puestas y es el navegador quien tira la respuesta.
      `curl` tampoco lo reproduce, porque ignora CORS.

   b. **`FRONTEND_URL`**: es la base de los enlaces que se **envían por correo**
      (verificación, reset de contraseña, magic link). Su valor por defecto en
      el código sigue siendo la URL de GitHub Pages
      (`DEFAULT_FRONTEND_URL` en `server.py`, y el literal repetido en
      `missing_apis.py`). Hay que ponerla a `https://tradingcalculator.pro`
      **en el código y en Cloud Run** (`--update-secrets` / `--set-env-vars`) y
      en `cloudbuild.yaml`. Si sólo se cambia el frontend, los correos siguen
      llevando a la URL vieja y quien se registre no puede validar la cuenta.

      ⚠️ El backend se despliega a mano: un `gcloud run deploy` sin las
      variables **las borra**. Por eso el valor del código y el del despliegue
      tienen que coincidir.

   c. **Passkeys (WebAuthn) — se rompen, y no tiene arreglo.** En `passkeys.py`
      el `rp_id` se deriva de `FRONTEND_URL` (o de `PASSKEY_ORIGIN` si está).
      Al pasar de `abcde-rgb.github.io` a `tradingcalculator.pro` cambia el
      `rp_id`, y **toda passkey ya registrada deja de validar**: WebAuthn ata
      cada credencial a su dominio a propósito, así que no se pueden migrar.
      Los usuarios afectados tienen que registrarla de nuevo desde Ajustes.

      Mientras no haya usuarios reales con passkey el coste es cero — **razón
      de peso para hacer el cutover antes de tener tráfico**. Si ya los hay:
      avisar por correo antes, y dejarles otra vía de acceso (contraseña o
      Google) para que no se queden fuera.

      `PASSKEY_RP_ID` y `PASSKEY_ORIGIN` permiten fijarlos explícitamente en vez
      de derivarlos; conviene ponerlos para que un despliegue que pierda
      `FRONTEND_URL` no cambie el `rp_id` por sorpresa.
9. **Google OAuth**: añadir el dominio nuevo a los orígenes autorizados en la
   consola de Google Cloud, o los logins fallan.
10. **Search Console**: dar de alta la propiedad nueva y usar la herramienta de
    cambio de dirección. Mantener la vieja hasta que se traspase la indexación.

## Verificación después

```bash
cd frontend
SITE_ORIGIN=https://tradingcalculator.pro npm run build
grep -c 'tradingcalculator.pro' build/sitemap.xml   # debe ser > 1500
grep -o '<loc>[^<]*</loc>' build/sitemap.xml | head -3 # sin /Tradingcalculatorpro.com/
```

Y ya desplegado: que el canonical de una página generada y su `<loc>` en el
sitemap sean **la misma cadena**. Si no coinciden, algo del paso 7 se quedó sin
cambiar.
