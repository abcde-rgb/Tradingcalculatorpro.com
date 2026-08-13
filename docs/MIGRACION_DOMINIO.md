# Mudanza a `tradingcalculatorpro.com`

**Estado: NO hecha.** El sitio se sirve hoy desde
`https://abcde-rgb.github.io/Tradingcalculatorpro.com`. Este documento es el
checklist para mudarlo, y existe porque el cambio **no es una línea**.

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
| DNS de `tradingcalculatorpro.com` | resuelve a **Cloudflare** (`2606:4700:…`), no a GitHub Pages (`2606:50c0:…`) |

Es decir: **este repositorio despliega a la subcarpeta de GitHub Pages**, y todas
las señales de SEO (canonical, hreflang, Open Graph, Twitter, JSON-LD, el
`Sitemap:` de `robots.txt`, `useSEO.js`) apuntan **coherentemente** ahí.

Cambiar solo el sitemap deja el sitemap anunciando URLs de un dominio mientras
cada página declara `rel=canonical` hacia otro. Google descarta las URLs
anunciadas y se queda con el canonical: se pierde el sitemap entero. Y si el
dominio de Cloudflare no sirve este build, además serían 404.

Falta un dato que no se puede obtener desde el sandbox (la red de salida está
restringida): **qué sirve hoy `tradingcalculatorpro.com`**. Antes de mudar hay
que mirarlo con un navegador.

## Checklist (todo o nada, en este orden)

1. **Confirmar qué sirve el dominio.** Si Cloudflare ya sirve otra cosa,
   decidir antes qué gana.
2. **DNS** → apuntar a GitHub Pages (`185.199.108–111.153` / `2606:50c0::153`).
   Si sigue por Cloudflare, poner el proxy en «DNS only» para que GitHub pueda
   emitir el certificado.
3. **`frontend/public/CNAME`** con una línea: `tradingcalculatorpro.com`.
   En `public/` para que CRA lo copie al build en cada despliegue — si se sube
   a mano al branch `gh-pages`, `keep_files: false` lo borra.
4. **`PUBLIC_URL: /`** en `.github/workflows/deploy-gh-pages.yml`. Con dominio
   propio el sitio cuelga de la raíz; dejarlo en `/Tradingcalculatorpro.com`
   rompe **todos** los assets.
5. **`homepage`** en `frontend/package.json` → `https://tradingcalculatorpro.com`.
6. **`SITE_ORIGIN`** en el paso de build del workflow → `https://tradingcalculatorpro.com`.
   Cubre de golpe `gen-sitemap.js` y `gen-seo-pages.js` (sitemap + las ~1.580
   páginas generadas).
7. **Literales que aún no leen `SITE_ORIGIN`** — hay que cambiarlos a mano:
   - `frontend/src/hooks/useSEO.js` (`ORIGIN`)
   - `frontend/public/index.html` (canonical, 10 × hreflang, `og:url`,
     `og:image`, `twitter:url`, `twitter:image`, y las URLs de los bloques JSON-LD)
   - `frontend/public/robots.txt` (línea `Sitemap:`)
8. **Backend**: el CORS ya incluye `tradingcalculatorpro.com` y
   `www.tradingcalculatorpro.com` (hardcodeados en `server.py`). Nada que tocar.
9. **Google OAuth**: añadir el dominio nuevo a los orígenes autorizados en la
   consola de Google Cloud, o los logins fallan.
10. **Search Console**: dar de alta la propiedad nueva y usar la herramienta de
    cambio de dirección. Mantener la vieja hasta que se traspase la indexación.

## Verificación después

```bash
cd frontend
SITE_ORIGIN=https://tradingcalculatorpro.com npm run build
grep -c 'tradingcalculatorpro.com' build/sitemap.xml   # debe ser > 1500
grep -o '<loc>[^<]*</loc>' build/sitemap.xml | head -3 # sin /Tradingcalculatorpro.com/
```

Y ya desplegado: que el canonical de una página generada y su `<loc>` en el
sitemap sean **la misma cadena**. Si no coinciden, algo del paso 7 se quedó sin
cambiar.
