# SEO — Guía de Verificación y Envío del Sitemap

## 1) Meta tags de verificación

Editar `/app/frontend/public/index.html` y reemplazar los placeholders:

```html
<meta name="google-site-verification" content="TU_CODIGO_GOOGLE" />
<meta name="msvalidate.01"            content="TU_CODIGO_BING" />
<meta name="yandex-verification"      content="TU_CODIGO_YANDEX" />
<meta name="p:domain_verify"          content="TU_CODIGO_PINTEREST" />
<meta name="facebook-domain-verification" content="TU_CODIGO_META" />
```

## 2) Cómo obtener cada código

### 🔍 Google Search Console (PRIORITARIO)
1. Ir a: https://search.google.com/search-console
2. **Añadir propiedad** → elegir **"Prefijo de URL"** → introducir `https://tradingcalculatorpro.com/`
3. Método de verificación: **"Etiqueta HTML"**
4. Google te muestra: `<meta name="google-site-verification" content="aBcDeFgHiJkLmN..." />`
5. Copia SOLO el valor de `content` y pégalo en `index.html`
6. Despliega tu app
7. Vuelve a Search Console y haz clic en "Verificar"

### 🔍 Bing Webmaster Tools
1. https://www.bing.com/webmasters
2. **Añadir un sitio** → introducir `https://tradingcalculatorpro.com`
3. Método **"Meta tag"** → te dan `msvalidate.01`
4. Pegar valor y desplegar

### 🔍 Yandex Webmaster
1. https://webmaster.yandex.com
2. Verificar dominio con meta tag `yandex-verification`

### 🔍 Pinterest (opcional pero útil para imágenes de patrones)
1. https://www.pinterest.com/business/
2. Confirmar sitio web → método meta tag

### 🔍 Meta/Facebook Domain (opcional)
1. https://business.facebook.com → Configuración → Dominios verificados
2. Método meta tag

---

## 3) Enviar el sitemap (clave para indexación rápida)

### Google Search Console
1. Una vez verificado, en el menú izquierdo → **"Sitemaps"**
2. Introducir: `sitemap.xml`
3. Clic **Enviar**
4. Google indexará en 1-7 días

### Bing Webmaster Tools
1. Menú **"Sitemaps"** → **Enviar sitemap**
2. URL completa: `https://tradingcalculatorpro.com/sitemap.xml`

### Yandex Webmaster
1. **Indexación** → **Archivos sitemap**
2. Añadir URL del sitemap

---

## 4) Verificación final

Después de desplegar, comprobar:

```bash
# Robots.txt accesible
curl https://tradingcalculatorpro.com/robots.txt

# Sitemap accesible y válido
curl https://tradingcalculatorpro.com/sitemap.xml

# Meta tags presentes
curl -s https://tradingcalculatorpro.com/ | grep -i "verification\|google-site"
```

Validar el sitemap con: https://www.xml-sitemaps.com/validate-xml-sitemap.html
Validar JSON-LD con: https://search.google.com/test/rich-results
Validar Open Graph con: https://www.opengraph.xyz/

---

## 5) Próximos pasos opcionales

- **Google Analytics 4**: añadir tag GA4 en `index.html` (te da datos de conversión).
- **Google Tag Manager**: si quieres añadir múltiples tags sin redeplegar.
- **Schema.org Course detallado**: enlazar cada `tab` del Education Center como `CourseInstance` propio con `learningResourceType: "Lesson"`.
- **Pre-render con Vite SSG/Next.js**: para que crawlers vean HTML completo sin esperar a que React monte.
- **Imagen `og-image.jpg` real (1200×630)**: actualmente apuntas a `/og-image.jpg` — sube una imagen real al `/public`.
