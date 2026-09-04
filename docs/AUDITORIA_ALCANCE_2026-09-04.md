# Auditoría de alcance — 2026-09-04

Qué separa hoy a TradingCalculator.Pro de su cliente, medido sobre el build real
(1.685 páginas) y contrastado con los criterios establecidos de indexación,
rendimiento y calidad de contenido.

> ⚠️ **Foto fechada.** Vale para saber *por qué* algo está así, no para saber
> cómo está hoy. Las cifras salen del build del 2026-09-04.

> ⚠️ **Límite del método, que conviene no olvidar.** Esta auditoría se hizo en un
> entorno **sin salida a internet**: no se consultó la documentación de Google ni
> ningún foro en vivo, y **no se pidió ni una URL del sitio publicado**. Todo lo
> medible está medido sobre `frontend/build/`; lo demás son criterios
> establecidos aplicados a lo que hay. Lo que sólo se puede comprobar en vivo
> —códigos de estado, tiempos reales, indexación— lo cierra
> `.github/workflows/seo-en-vivo.yml`, que sí tiene red.

---

## 1 · Lo que ya está bien, y no es poco

No todo lo que sigue es mérito de esta sesión; conviene tenerlo en la cabeza
antes de leer los huecos.

| Señal | Estado |
|---|---|
| Datos estructurados de marca en la portada | `WebSite` con `SearchAction`, `Organization` con `logo`, `sameAs` y `contactPoint`, `WebApplication`, `Course`, `FAQPage` |
| Migas de pan | `BreadcrumbList` en las 1.680 páginas |
| `FAQPage` con la pregunta y la respuesta **visibles** | 100 fichas de mercado |
| `hreflang` recíproco de verdad en los 10 idiomas | 1.685 páginas, comprobado en las dos direcciones |
| Títulos y descripciones únicos dentro de cada idioma | 0 duplicados |
| Páginas estáticas: peso | **4–9 KB comprimidos, cero JavaScript** |
| `noindex` en lo privado | 13 pantallas lo declaran |

El marcado de la portada está por encima de lo que se ve en la mayoría de sitios
de este tamaño. El problema no está ahí.

---

## 2 · El límite real de alcance hoy: el peso de la SPA

Es, con diferencia, lo que más cuesta en clientes. Ya está en el backlog (§5, P3)
con la causa bien diagnosticada; esta auditoría añade la medida y el argumento
para subirlo de prioridad.

```
main.js                      718 KB  →  214 KB comprimido
portada (todos los chunks)  1.014 KB  ·  12 peticiones
precios                     1.046 KB
legales                     1.422 KB
brokers                     1.024 KB
sobre                       1.022 KB
```

**Las cinco pantallas públicas pesan casi lo mismo.** Ése es el síntoma: no hay
troceado por ruta que valga: quien entra a leer el aviso legal se descarga la
suite de opciones entera. Hay 63 chunks y 44 dependencias, con 17 paquetes de
`@radix-ui` y `recharts`, `framer-motion`, `date-fns` y `react-day-picker`
dentro.

El contraste con lo que produjo esta rama es el mejor argumento disponible:

| | Comprimido | Peticiones JS |
|---|---|---|
| Portada del SPA | ~300 KB | 12 |
| Una ficha estática | **4 KB** | **0** |
| Un hub de sección | **9 KB** | **0** |

Las 1.685 páginas que van a recibir el tráfico de búsqueda ya son rápidas. **La
que no lo es es la portada** — justo donde aterriza quien busca la marca, y la
que decide si el visitante llega a ver un precio.

**Qué hacer**: `reorganizar-frontend` § 2.3 tiene el plan. Herramienta de
medida: `node tests/e2e/navegador/peso.js`, con presupuesto en CI.

---

## 3 · El hueco estructural: nadie firma el contenido

Esto es específico de un sitio financiero y no aplica igual a otros sectores. El
contenido sobre dinero se juzga con un listón más alto —experiencia, autoridad y
quién responde de lo que dice— y aquí las señales no existen:

```
dateModified    0 de 2.633 páginas
datePublished   0
"publisher"     0
"author"        7
```

Y la página «Sobre nosotros» dice *«Construido por traders, para traders»*: no
hay ninguna persona, ninguna credencial, ninguna política editorial.

Con 750 páginas de academia explicando cómo dimensionar posiciones reales, eso
es el techo más bajo que tiene el proyecto para posicionar en consultas
competitivas. Un rival con las mismas páginas y un autor con nombre y trayectoria
gana.

**Qué hacer, por orden de coste:**

1. **Fecha de actualización por página** (`dateModified` en el JSON-LD y visible
   en la página). ⚠️ Tiene que salir de una fuente **real** —el último commit que
   tocó el contenido de ese tema—, no de la fecha del build. Inventarla sería la
   versión editorial de rellenar un dato que no se puede calcular, y este
   proyecto tiene una regla explícita contra eso.
2. **`publisher`** apuntando a la `Organization` que ya está declarada en la
   portada. Es mecánico y no requiere decidir nada.
3. **Autoría y revisión.** Es una decisión del dueño, no algo que se pueda
   generar: quién firma, con qué experiencia, y si hay alguien que revisa. Sin
   una respuesta verdadera, no se pone.

---

## 4 · `lastmod` uniforme: hoy no dice nada

Las 1.685 URLs del sitemap llevan **la misma fecha**, la del build. Cada
despliegue afirma que las 1.685 páginas cambiaron, lo cual es falso.

Un buscador que compara esa afirmación con el contenido real deja de fiarse del
campo y lo ignora — y entonces tampoco sirve cuando una página sí cambia de
verdad. Es la misma raíz que el punto 3.1: la fecha tiene que venir del
contenido.

Mientras no haya una fuente real, **quitarlo es más honesto que emitirlo mal**.

---

## 5 · Oportunidad barata: IndexNow

Bing y Yandex aceptan un aviso directo de «esta URL ha cambiado» en vez de
esperar al rastreo. Es un `POST` con una clave publicada en el dominio, se hace
una vez en el workflow de despliegue, y **Yandex es justo donde el dueño detectó
el problema** que abrió este trabajo. Google no lo usa.

No es un defecto: es un atajo que hoy no se está tomando.

---

## 6 · Corregido en esta sesión

Lo que motivó la revisión (una captura de Yandex con el globo genérico, una sola
página de resultado y el descargo legal usado como descripción) resultó ser cinco
bugs, documentados como BUG-081…085 en `DIARIO_BUGS.md`. Más, encontrado al
auditar:

- **`/brokers` y `/backtesting` estaban anunciadas en el sitemap declarando
  `noindex` en su propio componente.** Tres señales contradiciéndose sobre la
  misma URL. Fuera las dos, y una guarda en el generador que lee `App.js` para
  impedir que vuelva a pasar.
- **1.640 enlaces internos hacia URLs sin fichero.** Resultaron ser tres
  destinos, los tres CTA hacia la aplicación de pago y los tres prohibidos en
  `robots.txt`, así que ningún rastreador los sigue. No había nada roto, pero
  tampoco nada que impidiera que lo hubiera: ahora el invariante está fijado.

---

## 7 · Por dónde empezar

1. **Desplegar.** Nada de lo hecho existe hasta entonces, y el fallo original era
   del servidor. Después, `seo-en-vivo.yml`.
2. **Search Console y Yandex Webmaster**: reenviar el sitemap, pedir reindexación
   de las rutas que devolvían 404, y verificar la propiedad en Yandex para que
   rastree el favicon.
3. **Peso de la portada** (§2). Es lo que más clientes cuesta hoy.
4. **Fecha de actualización y autoría** (§3). Es el techo a medio plazo.
