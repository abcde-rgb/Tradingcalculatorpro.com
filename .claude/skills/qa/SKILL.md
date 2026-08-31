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

Dos sondas viven fuera del examen porque necesitan otro montaje:

```bash
node tests/e2e/navegador/panel-admin.js        # la interfaz ante 428/403/formas raras
                                               # (no necesita backend: responde ella misma)

# El camino del admin con el 2FA exigido como en producción. Hace falta un
# backend con ADMIN_2FA_OPTIONAL=false y una cuenta en ADMIN_EMAILS:
ENVIRONMENT=development ADMIN_2FA_OPTIONAL=false JWT_SECRET=devonly \
  ADMIN_EMAILS=jefe@example.com CORS_ORIGINS=http://127.0.0.1:3100 \
  DATABASE_URL='postgresql://…' uvicorn server:app --port 8090 --app-dir backend &
QA_API=http://127.0.0.1:8090 node tests/e2e/navegador/admin-2fa.js
```

> Encontró BUG-076 y lo demostró: contra el código anterior falla en el paso 2
> —«Ajustes ofrece ACTIVAR el 2FA»— porque a un admin de Google se le exigía el
> segundo factor y se le escondía el botón para activarlo. **Y su primera
> versión pasaba con el código roto**: buscaba el texto «dos pasos» en cualquier
> parte, y el aviso ámbar de «activa el 2FA» lo lleva, así que casaba justo en
> la pantalla donde la tarjeta no estaba. Ahora busca el BOTÓN. Un ✅ que no
> prueba nada es peor que un ❌.

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

La de accesibilidad necesita `axe-core`, y **ya lo instala `arriba.sh`**:

```bash
node tests/e2e/navegador/accesibilidad.js escritorio   # y `movil`
```

> ⚠️ No lo instales a mano con `npm install --no-save axe-core`. Aquí no hay
> `package.json`, así que esa orden **poda todo lo que no nombres**: se lleva
> `playwright-core` por delante y deja `tests/e2e/lib/playwright-core` como un
> enlace roto. Reinstalar Playwright se lleva entonces axe, y así
> indefinidamente. `arriba.sh` las instala en la misma orden por eso.

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
| `navegador/admin-2fa.js` | El camino completo del administrador con el **2FA exigido como en producción**: que el panel abre por el margen de alta, que Ajustes ofrece activar el segundo factor **aunque la cuenta sea de Google**, que al vencer el margen el backend lo echa, y que activarlo de verdad —código TOTP calculado en la sonda— devuelve el panel. Fuera de `correr.sh` porque necesita el backend con `ADMIN_2FA_OPTIONAL=false` |

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
