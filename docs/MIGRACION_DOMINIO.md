# Mudanza a `tradingcalculator.pro`

**Estado: hecha en el repositorio el 2026-08-28.** El sitio se sirve desde
`https://tradingcalculator.pro`. Queda **un paso obligatorio fuera del repo**:
desplegar el backend (§ «Lo que falta»), sin el cual la web sigue caída.

> ### ⚠️ Lo que pasó el 2026-08-28, y por qué este documento decía «todo o nada»
>
> Tres commits hicieron los pasos **3, 4, 5 y 6** —`CNAME`, `PUBLIC_URL: /`,
> `homepage`, `SITE_ORIGIN`— y ninguno de los pasos **1, 7 y 8**. GitHub Pages
> empezó a servir la web en el dominio propio y el backend siguió con
> `tradingcalculator.pro` fuera de su lista de CORS: **el navegador descartó
> todas las respuestas y la web dejó de funcionar entera** (BUG-067).
>
> No es un fallo visible: sin cabecera CORS el backend responde 200 con las
> cookies puestas y es el navegador quien tira la respuesta. En Cloud Run los
> logs se ven perfectos y `curl` no lo reproduce.
>
> Los pasos 1, 7 y 8a–8c están ahora hechos, y hay dos tests que impiden que
> vuelva a divergir: uno compara la lista de CORS con `frontend/public/CNAME`
> —el fichero que decide de verdad dónde se sirve la web— y otro exige que el
> dominio ajeno no vuelva a la lista. Los dos, saboteados en
> `scripts/probar-verificadores.sh`.

Este documento es el checklist de la mudanza, y existe porque el cambio **no es
una línea**.

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
> **Corregido el 2026-08-28** en código: CORS y correos del backend
> (`server.py`, `missing_apis.py`, `passkeys.py`, `admin_routes.py`), los 10
> ficheros de i18n, `Footer.jsx`, `LegalPage.jsx`, `ContactPage.jsx`,
> `EducationPage.jsx`, `index.html`, `robots.txt`, `sitemap.xml`, `useSEO.js` y
> los generadores. Quedan menciones en `docs/historico/` y en entradas fechadas
> del registro de sesiones: son fotos de su día y **no se reescriben**.
>
> Lo que NO se tocó, a propósito: `linkedin.com/company/tradingcalculatorpro` y
> `youtube.com/@tradingcalculatorpro` son identificadores de cuenta, no el
> dominio; `com.tradingcalculatorpro.app` es el nombre de paquete Android y
> cambiarlo rompería la app instalada.
>
> ⚠️ **Al corregirlas, cambia sólo las minúsculas.** El repositorio se llama
> `Tradingcalculatorpro.com`, así que esa cadena aparece con **T mayúscula** en
> todas las rutas de GitHub Pages (`github.io/Tradingcalculatorpro.com`,
> `PUBLIC_URL`). Un `sed` sin distinguir mayúsculas rompe el despliegue actual.

## Por qué no se cambió sin más — *foto del 2026-08-14, ya superada*

> Todo lo de esta sección describe el repositorio **antes** del cutover. Se deja
> porque explica por qué el cambio no era una línea, no porque siga siendo
> cierto: el `CNAME` existe, el `PUBLIC_URL` es `/` y el DNS resuelve a GitHub
> Pages (verificado el 2026-08-28: `185.199.108–111.153`).

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

Marcado a 2026-08-28. Lo que sigue abierto está en «Lo que falta».

1. ✅ **Corregir el dominio en el repositorio.** Las ~95 apariciones de
   `tradingcalculatorpro.com` (dominio ajeno) → `tradingcalculator.pro`,
   **respetando las mayúsculas de la ruta del repo** (ver el aviso de arriba).
   Sin esto, el cutover apunta el CORS y los correos a un dominio de un tercero.
2. ✅ **DNS en GoDaddy** (el dominio está ahí, y las NS también — no hay Cloudflare
   de por medio) → registros **A** del apex `@` a `185.199.108.153`,
   `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, y **CNAME** `www` a
   `abcde-rgb.github.io`. Quitar antes los registros del parking de GoDaddy.
3. ✅ **`frontend/public/CNAME`** con una línea: `tradingcalculator.pro`.
   En `public/` para que CRA lo copie al build en cada despliegue — si se sube
   a mano al branch `gh-pages`, `keep_files: false` lo borra.
4. ✅ **`PUBLIC_URL: /`** en `.github/workflows/deploy-gh-pages.yml`. Con dominio
   propio el sitio cuelga de la raíz; dejarlo en `/Tradingcalculatorpro.com`
   rompe **todos** los assets.
5. ✅ **`homepage`** en `frontend/package.json` → `https://tradingcalculator.pro`.
6. ✅ **`SITE_ORIGIN`** en el paso de build del workflow → `https://tradingcalculator.pro`.
   Cubre de golpe `gen-sitemap.js` y `gen-seo-pages.js` (sitemap + las ~1.580
   páginas generadas).
7. ✅ **Literales que aún no leen `SITE_ORIGIN`** — hay que cambiarlos a mano:
   - `frontend/src/hooks/useSEO.js` (`ORIGIN`)
   - `frontend/public/index.html` (canonical, 10 × hreflang, `og:url`,
     `og:image`, `twitter:url`, `twitter:image`, y las URLs de los bloques JSON-LD)
   - `frontend/public/robots.txt` (línea `Sitemap:`)
8. ✅ *(en el código; falta desplegar)* **Backend** — ⚠️ **sí hay que tocarlo.** (Este paso decía «nada que tocar»; era
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
9. ⬜ **Google OAuth**: añadir el dominio nuevo a los orígenes autorizados en la
   consola de Google Cloud, o los logins fallan.
10. ⬜ **Search Console**: dar de alta la propiedad nueva y usar la herramienta de
    cambio de dirección. Mantener la vieja hasta que se traspase la indexación.

## Lo que falta — **nada de esto se puede hacer desde el repositorio**

Mientras el punto 1 no esté hecho, la web sigue cargando y **sin backend**: es
el estado exacto de BUG-067.

1. 🔴 **Desplegar el backend a Cloud Run.** Es lo único que levanta la web. El
   arreglo del CORS vive en `server.py`, y el servicio corre el código del
   despliegue anterior. Y en el mismo `gcloud run deploy`, o con
   `--update-env-vars` después, hay que dejar puestas:

   | Variable | Valor | Por qué |
   |---|---|---|
   | `FRONTEND_URL` | `https://tradingcalculator.pro` | Si sigue con el valor viejo **gana la variable** sobre el código y los correos de verificación y reset seguirán llevando a la URL antigua. |
   | `PASSKEY_RP_ID` | `tradingcalculator.pro` | Fijarlo evita que un despliegue que pierda `FRONTEND_URL` cambie el `rp_id` por sorpresa. |
   | `PASSKEY_ORIGIN` | `https://tradingcalculator.pro` | Ídem. |
   | `CORS_ORIGINS` | *(vacío, o sólo staging)* | Si trae el dominio ajeno, lo vuelve a permitir: la lista del código ya no lo lleva a propósito. |

   ⚠️ Un `gcloud run deploy` **sin** `--set-env-vars` borra las variables del
   servicio. Por eso el código trae los mismos valores por defecto: para que
   perder la variable no tumbe nada.

2. 🔴 **Google OAuth** (Google Cloud Console → Credenciales → cliente OAuth):
   añadir `https://tradingcalculator.pro` a **orígenes JavaScript autorizados**.
   Sin esto el botón de Google falla aunque el CORS ya esté bien.

3. 🟠 **GitHub → Settings → Pages**: comprobar que **Custom domain** dice
   `tradingcalculator.pro` y que **Enforce HTTPS** está activado. El DNS ya
   resuelve a los cuatro registros A de Pages (verificado 2026-08-28).

4. 🟠 **Passkeys**: el `rp_id` cambia, así que **toda passkey registrada contra
   `abcde-rgb.github.io` deja de validar** — WebAuthn ata cada credencial a su
   dominio a propósito y no se pueden migrar. Quien la tuviera debe registrarla
   de nuevo desde Ajustes; asegúrate de que tiene contraseña o Google antes.

5. 🟠 **SendGrid**: verificar el dominio remitente de `alerts@tradingcalculator.pro`
   (`SENDER_EMAIL`). Hasta entonces los correos transaccionales no salen.

6. 🟡 **Buzón de contacto**: `contact@tradingcalculator.pro` aparece ahora en el
   pie, en Legal y en Contacto. Tiene que existir de verdad — antes apuntaba a
   un dominio de un tercero, así que ese correo nunca llegó a nadie nuestro.

7. 🟡 **Pasarelas de pago**: revisar en Stripe, PayPal, Revolut, NOWPayments y
   Kunfupay las URLs de retorno y de webhook que lleven el dominio viejo.

8. 🟡 **Search Console**: alta de la propiedad nueva + herramienta de cambio de
   dirección; mantener la vieja hasta que se traspase la indexación.

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
