# 💰 Publicidad (Google AdSense) en el contenido gratuito

> **La regla del sistema, y la única que no se negocia:** *quien paga no ve
> anuncios en ninguna parte del sitio, tampoco cuando lee el contenido
> gratuito.* No es que se le oculte el bloque: con la suscripción activa **el
> script de AdSense ni siquiera se descarga**, así que su navegador no habla con
> la red publicitaria. Está fijado por `frontend/scripts/ads-check.js`, que corre
> en CI.

Estado a 2026-07-31: **implementado y verificado, apagado por defecto.** Sin las
variables de entorno el sitio queda byte a byte como antes. Para encenderlo
faltan pasos de *operación* (cuenta de AdSense y, sobre todo, dominio propio),
detallados abajo.

---

## 1. Cómo funciona

### La decisión: una función pura

Toda la lógica vive en **`frontend/src/lib/adsPolicy.js`**, un módulo sin imports
para que puedan usarlo tres runtimes distintos: React, el generador de páginas
estáticas y el verificador offline.

```js
shouldShowAds({ clientId, consent, isPremium, isAdmin, resolved, pathname, cmp })
```

Devuelve `true` sólo si se cumple **todo**:

| Condición | Por qué |
|---|---|
| `clientId` no vacío | Sin `REACT_APP_ADSENSE_CLIENT` no hay publicidad en absoluto |
| `resolved` | Hay sesión pero aún no se sabe si paga (recarga + refresh silencioso) → no se pinta nada. Un suscriptor no puede ver ni un parpadeo |
| `!isPremium && !isAdmin` | La promesa comercial |
| `isAdSurface(pathname)` | Lista blanca de rutas; deniega por defecto |
| `consent === 'all'` o CMP de Google | RGPD: sin consentimiento no se carga el script |

### Dónde hay anuncios

**En la SPA** (`AD_SURFACES` en `adsPolicy.js`):

| Ruta | Huecos |
|---|---|
| `/options` (hub público) | 1 (`article`) |
| `/options/strategies` | 1 (`bottom`) |
| `/options/strategies/:slug` | 2 (`article` + `bottom`) |

**En las páginas estáticas del postbuild** (`gen-seo-pages.js`) — las 1273 URLs
de `/tools/…`, `/learn/…`, `/markets/…` y `/options/strategies/…` en 8 idiomas:
2 huecos por página.

**Dónde NO, y por qué:**

- `/dashboard`, `/performance`, `/options/calculator`, `/admin`, `/settings`,
  `/subscription` → son de pago; ahí no hay usuarios que puedan ver anuncios.
- `/pricing`, `/login`, `/register`, `/payment/*` → páginas de conversión y
  trámite. Un anuncio ahí compite con el propio checkout.
- `/legal`, `/contact`, `/about` → texto fino; AdSense penaliza anunciar sobre
  páginas sin contenido propio.
- **Landing (`/`)** → es la página de venta, no contenido. Se ha dejado limpia a
  propósito.
- **`/news`** → hoy es una maqueta con filas de relleno (`WipSection`). Poner
  anuncios sobre contenido de mentira es motivo de suspensión de cuenta.
- **`/education`** → es un muro de pago con vista previa. Cuando se abra parte
  del temario, será la siguiente superficie natural: se añade la ruta a
  `AD_SURFACES` y un `<AdSlot>`, nada más.

### El puente con las páginas estáticas

Las páginas del postbuild son HTML plano: no tienen sesión ni pueden preguntar
al backend. Para que un suscriptor que aterriza en `/learn/…` desde Google
tampoco vea publicidad, comprueban **dos** cosas en `localStorage` antes de
tocar la red:

1. `tcp-ads === 'off'` — la marca que escribe la SPA (`AdsBootstrap` →
   `useAdFreeMarker`) cada vez que el usuario entra, sale o cambia de plan.
2. `btc-auth-storage` — la sesión persistida de Zustand, que existe desde el
   primer login y cubre al premium que aún no había pasado por una página con
   anuncios en ese navegador.

> **Límite conocido y aceptado:** un suscriptor que abra una página estática en
> un dispositivo **donde nunca ha iniciado sesión** (o tras borrar los datos del
> sitio) sí verá anuncios hasta que entre en la app. Evitarlo exigiría una
> llamada al backend desde cada página estática, que es justo lo que las hace
> rápidas e indexables.

### Consentimiento

- **En la SPA** manda el banner de cookies de siempre. «Aceptar todo» ahora
  concede también `ad_storage`, `ad_user_data` y `ad_personalization` en Consent
  Mode v2, y dispara el evento `tcp:consent` para que los huecos ya montados
  aparezcan sin recargar. Por defecto, desde `index.html`, todo va **denegado**.
- **En las páginas estáticas** hay un banner mínimo en JavaScript plano
  (traducido a los 8 idiomas) que escribe **la misma clave** `tcp-cookie-consent`.
  Antes no existía porque esas páginas no ponían cookies; con publicidad, sí.
- Los textos legales (banner, política de cookies, privacidad, base jurídica y
  lista de terceros) se han actualizado en **los 8 idiomas**. Decían literalmente
  *«no mostramos anuncios de terceros ni compartimos datos con redes
  publicitarias»*: con AdSense encendido, eso habría sido falso.

---

## 2. Encenderlo

### Variables (GitHub → Settings → Secrets and variables → Actions → **Variables**)

Van como *variables*, no como secretos: el ID de editor viaja en el HTML de cada
página, no hay nada que ocultar.

| Variable | Ejemplo | Qué es |
|---|---|---|
| `REACT_APP_ADSENSE_CLIENT` | `ca-pub-1234567890123456` | ID de editor. **Sin esto no hay publicidad** |
| `REACT_APP_ADSENSE_SLOT_ARTICLE` | `1234567890` | Bloque intercalado en el contenido |
| `REACT_APP_ADSENSE_SLOT_BOTTOM` | `0987654321` | Bloque del final de página |
| `REACT_APP_ADSENSE_CMP` | `google` o vacío | `google` si el consentimiento lo lleva la CMP certificada de Google |

Un hueco sin su ID de bloque simplemente no se pinta, así que se puede desplegar
posición a posición.

### Pasos

1. **Dominio propio primero** (ver §3). Sin él no tiene sentido seguir.
2. Alta en [AdSense](https://adsense.google.com) con `tradingcalculatorpro.com`.
3. Crear dos bloques de anuncio *display* → anotar sus IDs.
4. Definir las variables del repositorio y desplegar. El `postbuild` genera
   `ads.txt` solo (`scripts/gen-ads-txt.js`).
5. Verificar en producción: `https://tradingcalculatorpro.com/ads.txt` debe
   responder `google.com, pub-…, DIRECT, f08c47fec0942fa0`.
6. Esperar la revisión de Google (suele tardar días).

### Comprobar sin desplegar

```bash
cd frontend
node scripts/ads-check.js          # la política, offline (corre en CI)

# Build con publicidad simulada
REACT_APP_ADSENSE_CLIENT=ca-pub-1234567890123456 \
REACT_APP_ADSENSE_SLOT_ARTICLE=1111111111 \
REACT_APP_ADSENSE_SLOT_BOTTOM=2222222222 \
PUBLIC_URL=/Tradingcalculatorpro.com CI=false npm run build
```

### Apagarlo

Borrar `REACT_APP_ADSENSE_CLIENT` y volver a desplegar. Desaparece todo: script,
huecos, CSS, banner de las estáticas y `ads.txt` (que además se borra si quedaba
de un build anterior).

---

## 3. Dos avisos que hay que leer antes de dar de alta la cuenta

### 3.1 En `abcde-rgb.github.io` esto no va a funcionar

Hoy el sitio se publica en `https://abcde-rgb.github.io/Tradingcalculatorpro.com/`,
un **subdirectorio de un dominio que no es nuestro**. Eso rompe dos requisitos
de AdSense a la vez:

- **`ads.txt` tiene que servirse en la raíz del dominio.** Desde este repositorio
  el archivo acaba en `…github.io/Tradingcalculatorpro.com/ads.txt`; los
  rastreadores miran `…github.io/ads.txt`, que pertenece a otro repositorio.
- **Google exige demostrar la propiedad del sitio.** `github.io` es de GitHub.

**Acción:** activar el dominio propio `tradingcalculatorpro.com` (ya está
decidido y el `CNAME` existía; ver §6 de `ESTADO_PROYECTO.md` y §G de
`DEPLOY_CHECKLIST.md`). Con el dominio propio el build pasa a servirse en la
raíz y `ads.txt` cae donde debe, sin tocar código. **Este es el bloqueo real de
la monetización, no el código.**

### 3.2 El banner propio no es una CMP certificada

Para tráfico del EEE y Reino Unido, Google exige desde 2024 una **CMP
certificada** registrada en su lista de IAB TCF. El banner de cookies de esta web
es propio y **no lo es**. Dos salidas:

- **Recomendada:** activar la CMP de Google (AdSense → *Privacidad y mensajes*),
  que es gratuita, y poner `REACT_APP_ADSENSE_CMP=google`. Nuestro banner deja
  entonces de bloquear la publicidad (sigue gobernando la analítica) y quien
  decide sobre anuncios es la CMP de Google.
- Integrar otra CMP certificada.

Mientras `REACT_APP_ADSENSE_CMP` esté vacío, la publicidad sólo se carga con
«Aceptar todo» propio: es **más** restrictivo que lo que pide Google, así que no
se sirve nada sin consentimiento, pero formalmente sigue faltando la CMP
certificada.

### 3.3 Política de contenido financiero

AdSense es exigente con el contenido de trading. Lo que ya está a favor: la
advertencia de riesgo con cifras de ESMA/CNMV, el aviso de «no es asesoramiento
financiero» en el pie de cada página estática y el etiquetado «Publicidad» sobre
cada bloque. Lo que hay que evitar: anuncios sobre páginas sin contenido propio y
bloques pegados a botones (por eso el hueco de la ficha de estrategia va
separado del CTA).

---

## 4. Qué se toca si se quiere cambiar algo

| Quiero… | Toco |
|---|---|
| Añadir una ruta con anuncios | `AD_SURFACES` en `src/lib/adsPolicy.js` **y** un `<AdSlot>` en la página |
| Añadir un tipo de hueco | `AD_SLOTS` en `src/lib/ads.js` + variable de entorno + workflow |
| Cambiar el aspecto del hueco | `src/components/ads/AdSlot.jsx` (SPA) · `ADS_CSS` en `scripts/gen-seo-pages.js` (estáticas) |
| Cambiar quién no ve anuncios | `shouldShowAds` en `adsPolicy.js` → `ads-check.js` fallará hasta que actualices el test, que es lo que se busca |
| Textos de «Publicidad» / «Quitar anuncios» | claves i18n `adsLabel` y `adsRemove` (8 idiomas) |

---

## 5. Expectativa de ingresos (para no engañarse)

El RPM típico de AdSense en finanzas ronda **1–5 €/1000 páginas vistas** en
tráfico hispanohablante. Con 10 000 páginas vistas al mes eso son **10–50 €**.
Una sola suscripción de 17 €/mes vale más que varios miles de visitas.

La conclusión práctica es que la publicidad aquí no es el negocio: es lo que
sostiene el contenido gratuito **mientras** hace de escaparate. Por eso cada
bloque lleva al lado el enlace «Quitar anuncios con Premium»: el anuncio también
trabaja para la conversión.

---

## Documentos relacionados

- [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) — estado vivo del proyecto
- [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) — dominio propio y despliegue
- [`setup/SEO_GUIDE.md`](./setup/SEO_GUIDE.md) — dónde vive cada pieza de SEO
- [`CAPTAR_TRAFICO.md`](./CAPTAR_TRAFICO.md) — sin tráfico no hay publicidad que valga
