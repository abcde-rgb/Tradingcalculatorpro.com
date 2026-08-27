---
name: qa
description: >-
  Banco de pruebas E2E de TradingCalculator.Pro contra la aplicación VIVA: levanta
  Postgres, el backend y el build de producción, y corre sondas de navegador
  (Playwright, escritorio y móvil) y de API (autorización entre cuentas, RGPD,
  pantalla-vs-base-de-datos). Úsalo siempre que se pida probar, examinar, auditar
  o certificar la web, hacer capturas, comprobar que algo "funciona de verdad",
  verificar un cambio antes de mergear, o cuando haya que reproducir un fallo que
  sólo aparece con backend y base de datos reales. También al retomar el proyecto
  si hace falta un entorno local en marcha. No lo uses para comprobaciones offline
  (sintaxis, i18n, lint, paridad del catálogo): para eso está `/verify`.
---

# Banco de pruebas E2E

`/verify` comprueba el repositorio sin arrancar nada. Esto es lo otro: la
aplicación **en marcha**, con Postgres real, el backend real y el **build de
producción** que se publica —no un servidor de desarrollo—, recorrida por un
navegador de verdad.

Existe porque el backend tiene los cálculos muy cubiertos y las **rutas HTTP casi
sin cubrir** (`server.py` al 26 %). Los tests de `pytest` comprueban funciones
puras; lo que rodea a esas funciones —autenticación, autorización, validación,
degradación cuando un proveedor se cae— sólo se puede comprobar así.

## Poner en marcha

```bash
tests/e2e/stack/arriba.sh     # Postgres + backend + frontend servido como en producción
tests/e2e/correr.sh           # el examen entero
tests/e2e/stack/abajo.sh      # parar (Postgres se queda: tarda en arrancar)
```

`arriba.sh` es **idempotente**: si algo ya está en pie no lo toca, y la primera
vez crea el entorno de Python, instala `playwright-core` y compila el frontend si
no hay build. En una sesión remota el contenedor se duerme y hay que rearrancar a
mitad de trabajo — por eso está escrito así.

Para una sonda suelta: `tests/e2e/correr.sh analitica autorizacion`.

## Mirar una pantalla mientras la diseñas

El examen entero es lo correcto antes de mergear y demasiado caro mientras
trabajas, que es justo cuando más falta hace mirar. `mirar.js` es ese hueco:
una orden, una pantalla, una captura, y de paso los errores de JavaScript, el
desbordamiento horizontal y el texto real de los `data-testid` que pidas.

```bash
node tests/e2e/mirar.js dashboard --movil
node tests/e2e/mirar.js dashboard \
  --hacer 'fill:desk-capital=10000; click:desk-product-futures; fill:desk-entry=5000; fill:desk-sl-value=4980' \
  --leer desk-size-value,desk-size-binding,desk-per-tick \
  --recorta trading-desk
```

Verbos de `--hacer`: `fill:`, `click:`, `select:`, `tecla:`, `esperar:`,
separados por `;`. No es un lenguaje: en cuanto una comprobación merece
repetirse, su sitio es una sonda de `navegador/`.

Los recursos externos bloqueados por la política de red del sandbox se cuentan
**aparte** y no tiñen el resultado: si se mezclaran, cada ejecución gritaría
«9 errores» y a la tercera vez nadie los leería.

> Esto no es opcional al añadir una pantalla. La mesa de cálculo pasó lint, 264
> comprobaciones de motor y 782 tests, y **la primera captura encontró dos
> fallos en treinta segundos**: el margen de un micro E-mini salía a 25 000 $
> en vez de 1320 (la palanca se caía a 1× porque se deducía del nocional, que
> depende de la cantidad, que es lo que se estaba calculando) y el aviso de
> email tapaba el campo de capital.

La de accesibilidad va aparte porque necesita `axe-core`:

```bash
cd tests/e2e && npm install --no-save axe-core
node navegador/accesibilidad.js escritorio   # y `movil`
```

## Qué hay dentro

| Sonda | Qué demuestra |
|---|---|
| `navegador/recorrido.js` | Los 7 productos del diario de punta a punta: catálogo, apalancamiento sugerido, nocional, margen, tope de exposición, unidades del stop (pips/ticks/R), R:B, opciones y perpetuos. **35 comprobaciones × escritorio y móvil** |
| `navegador/analitica.js` | El alcance por producto: que filtrar **recalcula en el backend** y las cifras cambian, y el aviso de cuentas mezcladas. 16 × 2 vistas |
| `navegador/temas.js` | Los 6 temas y los 10 idiomas en el menú móvil, comprobando que el tema **se aplica**, no sólo que aparece listado |
| `navegador/ticker.js` | Que el dashboard degrada con honestidad cuando el proveedor de precios está caído (BUG-047) |
| `api/autorizacion.py` | **Dos cuentas**: que una no puede leer, editar ni borrar los datos de la otra cambiando el id de la URL — y que el dato sigue intacto después. Escalada de privilegios y confusión de tokens. 29 comprobaciones |
| `api/rgpd.py` | Que el export se lleva todo lo que el borrado destruye, y que borrar la cuenta **no deja ninguna fila** — contado en Postgres, no leído del código |
| `navegador/idiomas.js` | Los 10 idiomas **en pantalla**: `<html lang>`/`dir` correctos, sin desbordes y sin claves i18n crudas coladas como texto. Incluye el árabe en RTL, que `i18n-check` no puede ver |
| `navegador/accesibilidad.js` | WCAG 2.1 AA con axe-core sobre 4 páginas: nombres accesibles, contraste y ARIA. Sólo reporta lo `critical`/`serious` — los avisos menores esconden lo que de verdad bloquea a alguien |
| `api/pasarelas.py` | Los raíles de cobro: que **apagar una pasarela en admin cierra el checkout en el servidor** (no sólo esconde el botón), que Kunfupay cobra **suscripción y pago único**, y que el alta manual concede premium, es idempotente por referencia y **apila** el periodo. 22 comprobaciones |
| `api/persistencia.py` | Que la cifra que la pantalla enseña antes de guardar es **exactamente** la que queda almacenada (hay dos copias de la matemática: navegador y backend) |

`entorno.js` y `entorno.py` tienen lo compartido: dónde está Chromium, cómo se
entra, cómo se consulta la base de datos, cómo se consigue una cuenta de prueba.

## Cómo leer un resultado

Cada sonda imprime `✅`/`❌` por línea y un recuento. `correr.sh` devuelve el
número de sondas con fallos, así que sirve en un condicional.

**Antes de acusar al producto, descarta el banco de pruebas.** En esta sesión
cuatro «fallos» resultaron ser de las sondas: un PUT con cuerpo incompleto que se
quedaba en el 422 de validación sin llegar a comprobar la propiedad; un premium
concedido por SQL dos minutos antes que hacía fallar una comprobación de
escalada; una búsqueda de «password» que casaba con `auth_provider`; y un 429 del
limitador leído como borrado roto. Las guardas están escritas en las sondas, pero
la disciplina no se puede automatizar: **un ❌ es una hipótesis, no un veredicto**.
Compruébalo a mano antes de escribir un arreglo, porque una prueba que acusa al
producto de lo que hace el banco de pruebas es peor que no tener prueba.

El modo de fallo más traicionero no es el ❌ falso: es el **✅ que no ha probado
nada**. Una revisión de este mismo banco encontró comprobaciones que sólo podían
pasar — escribían contra `PUT /auth/profile`, que no existe, y contaban el 404
como «no se pudo escalar privilegios»; o aceptaban el 404 de `/admin/stats`, que
tampoco existe, como prueba de denegación. Al tocar una sonda, pregúntate qué
tendría que romperse en el producto para que se pusiera roja. Si no hay
respuesta, la comprobación no vale.

Señales de que el fallo es del banco:
- **429** en cualquier sitio → límite de tasa agotado por repetir la tanda
  (registro 3/h, borrado de cuenta 3/h, export 5/h, login 10/min). Espera.
- **403** al crear una operación → la cuenta no es premium. `da_premium(uid)`.
- **422** en un PUT/POST → el cuerpo está incompleto y la validación corta antes
  de que se ejecute lo que querías medir. La comprobación no ha probado nada.
- **Cifras que no cuadran tras varias tandas** → las sondas dejan datos. Compara
  por contenido, no por número de filas.
- **«Han cambiado todos los campos»** → probablemente la sesión murió en medio
  (`/auth/change-password` revoca todas) y estás comparando un usuario con un
  cuerpo de error. Comprueba que la segunda lectura sigue siendo un usuario
  antes de concluir que hay una escalada de privilegios.

## Qué NO cubre

- **Yahoo Finance y CoinGecko están bloqueados** por la política de red del
  sandbox. Todo lo que dependa de precios en vivo (`/prices`, escáner,
  `pattern-scan`) devuelve vacío. Eso es *correcto* —el producto debe degradar
  diciéndolo— pero no sirve para probar el camino feliz.
- **Las cookies `secure` no persisten sobre `http://localhost`**: usa navegación
  cliente dentro de la prueba, no recargas completas.
- Pasarela de pago, envío real de correo y SMS.

## Al terminar

Las capturas quedan en `.qa-capturas/` (ignorado por git). Si la tanda destapó un
fallo real, anótalo en `docs/DIARIO_BUGS.md` con su causa raíz y añade el test que
lo fija —de preferencia en `backend/tests/`, que corre sin levantar nada—; el
banco E2E demuestra el síntoma, el test unitario impide que vuelva.
