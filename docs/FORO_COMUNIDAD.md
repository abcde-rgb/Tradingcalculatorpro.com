# Foro propio de la comunidad — motores de código abierto y cómo encajan aquí

> **Estado: CONSTRUIDO (ruta C — foro propio), sin desplegar.** El 2026-09-03 se
> implementó la comunidad dentro del producto: `backend/forum.py` (19 rutas),
> `frontend/src/pages/CommunityPage.jsx` y la cola de moderación en el panel admin.
> Lo que sigue vigente de este documento es el **porqué**: los motores comparados y
> las tres rutas de integración, que explican qué se descartó. Ver § 7 para lo que
> se construyó y § 8 para lo que falta.

Seis maquetas, cada una emparejada con el motor de código abierto que la sirve de fábrica:

```
docs/maquetas/foro-comunidad.html          ← ábrelo en el navegador
docs/maquetas/foro-comunidad.html#/f6      ← una maqueta concreta
docs/maquetas/foro-comunidad.html?tema=claro#/f3
docs/maquetas/foro-comunidad.html?ancho=movil#/f1
```

---

## 1. El obstáculo que decide casi todo: Pages es estático

El frontend se sirve desde **GitHub Pages**, que entrega ficheros y nada más: no ejecuta
código, no guarda mensajes y no puede alojar un foro. Cualquier opción de esta lista pasa
por poner **un servidor detrás**, y sólo hay tres formas de hacerlo (§ 4).

Esto no es un detalle de implementación: cambia el coste de cada opción mucho más que el
diseño de la pantalla.

---

## 2. Los motores

Todo lo de esta tabla es software libre y autoalojable. La columna **Base de datos**
importa más de lo que parece: el producto ya tiene un PostgreSQL, y un motor que hable
otro dialecto añade una segunda base que respaldar, migrar y pagar.

| Motor | Licencia | Stack | Base de datos | Qué forma da | Dónde duele |
|---|---|---|---|---|---|
| **Discourse** | GPLv2 | Ruby on Rails | PostgreSQL + Redis | Tablón clásico por categorías (maqueta 01) | La instalación más pesada de la lista: contenedor propio, Redis y ~2 GB de RAM. A cambio, la mejor moderación en abierto |
| **Flarum** | MIT | PHP | MySQL / MariaDB | Flujo único con etiquetas (maqueta 02) | **No habla PostgreSQL**: te obliga a una segunda base. Muchas funciones básicas viven en extensiones de terceros |
| **NodeBB** | GPLv3 | Node.js | PostgreSQL, MongoDB o Redis | Sirve 02 y 04 con temas distintos | Menos comunidad que Discourse; los plugins buenos se cuentan con los dedos. Pero **sí habla PostgreSQL** |
| **Talkyard** | Código abierto (AGPL) | Scala + Play | PostgreSQL | Foro y preguntas a la vez (maqueta 03) | Proyecto pequeño: pocos ojos encima y un mantenedor principal. Riesgo de quedarte solo |
| **Question2Answer** | GPL | PHP | MySQL | Preguntas votadas puras (maqueta 03) | Veterano y estable, pero con aspecto de 2012 y una segunda base de datos |
| **Zulip** | Apache 2.0 | Python / Django | PostgreSQL | Salas en directo con canal + tema (maqueta 05) | Es chat, no archivo: el valor de búsqueda a los seis meses es mucho menor |
| **Forem** | AGPLv3 | Ruby on Rails | PostgreSQL + Redis | Muro de publicaciones (maqueta 04) | Es el motor de dev.to y pesa lo que pesa: workers, Redis, Elasticsearch opcional |
| **Misago** | GPLv2 | Python / Django | PostgreSQL | Tablón clásico (maqueta 01) | **El que más se parece al backend de casa** (Python + Postgres). Comunidad pequeña y desarrollo lento |

> ⚠️ **Verifica licencia, requisitos y estado del proyecto en su web antes de decidir.**
> Este sandbox no tiene salida a internet (ver `CLAUDE.md` § Sandbox remoto), así que la
> tabla sale de conocimiento previo y no de una comprobación hecha hoy. Lo que sí está
> comprobado contra el repo es todo lo que se afirma de **nuestro** lado.

---

## 3. Qué te da un motor de terceros que tú no vas a escribir

Es la razón por la que casi nadie construye un foro desde cero, y conviene tenerla
delante antes de elegir la maqueta 06:

- Cola de moderación, denuncias, silenciar, expulsar, revisar al primer mensaje.
- Antispam: los foros nuevos reciben spam automatizado **en días**, no en meses.
- Correo saliente: avisos, resúmenes, respuesta por email y su gestión de rebotes.
- Buscador de texto completo, con relevancia y no con `LIKE '%…%'`.
- Editor con adjuntos, citas, previsualización y pegado de imágenes.
- Exportación y borrado de datos de un usuario — que aquí no es opcional: el RGPD ya
  está resuelto en el producto (`_USER_DATA_COLLECTIONS`, G-15) y un foro propio
  añadiría colecciones nuevas a las tres rutas de borrado, export y purga.

---

## 4. Las tres rutas de integración

### A · Subdominio con la cuenta compartida — `foro.tradingcalculator.pro`

El motor vive en su propio servidor y **delega el login en el backend actual**. Discourse
lo llama *DiscourseConnect*; NodeBB y Flarum lo resuelven con OAuth2. El backend ya emite
JWT, tiene Google OAuth, 2FA y passkeys: firmar además un payload de SSO es trabajo de
horas, no de semanas.

- ✅ Lo más rápido con diferencia. El usuario no crea una segunda cuenta.
- ✅ Cada hilo es una URL indexable en un subdominio del dominio propio.
- ❌ Es un segundo servicio: actualizaciones de seguridad, copias, correo y factura.
- ❌ El foro no puede leer la mesa de cálculo del usuario. Se comparten capturas, no cifras.

### B · Comentarios incrustados en las páginas que ya existen

Discourse y Talkyard pueden incrustar hilos dentro de una página del sitio. Cada
calculadora y cada módulo de la Academia tendría su conversación debajo.

- ✅ La comunidad aparece donde el usuario ya está, sin pedirle que vaya a otro sitio.
- ✅ Siembra sola: no hay categorías vacías, hay una página con su hilo.
- ❌ Conversación fragmentada en 1.630 páginas; no hay «comunidad» a la que entrar.
- ❌ Un `<iframe>` de terceros choca con la CSP endurecida de G-10, y las páginas
  estáticas van con `default-src 'none'`: habría que abrir un hueco a mano y medido.

### C · Foro propio dentro del producto (maqueta 06)

Hilos en PostgreSQL **por el shim** (`db.foro_hilos.find(...)`, nunca SQL directo),
rutas en FastAPI y pantalla React dentro de la aplicación.

- ✅ Lo único que ningún competidor puede copiar: el hilo lleva la operación dentro, con
  entrada, stop, objetivo y R:R, y la columna derecha la recalcula **con el capital de
  quien lee**, no con el de quien publicó.
- ✅ Cero servicios nuevos: el mismo Cloud Run, la misma base, la misma sesión.
- ✅ Encaja con lo que ya está construido: la mesa de cálculo, `riskBudget()`, la ficha
  del instrumento y el diario.
- ❌ Todo lo de la § 3 lo escribes tú, y el mantenimiento de la moderación no acaba nunca.

---

## 5. Recomendación

**Empezar por A, y construir de C sólo la pieza que A no puede dar.**

1. Discourse (o NodeBB, si pesa la afinidad con PostgreSQL) en `foro.tradingcalculator.pro`,
   con SSO contra el backend actual. Dos categorías, no seis: una comunidad de cien
   personas repartida en seis foros parece abandonada — está en el «en contra» de la
   maqueta 01 y es el error más común al abrir un foro.
2. Encima, la pieza propia: un botón **«Compartir esta operación»** en la mesa y en el
   diario que publique la ficha en el foro como un bloque estructurado. Es el 20 % de la
   maqueta 06 que aporta el 80 % de su valor, y no obliga a escribir un foro entero.
3. Si la comunidad arraiga, traer los hilos a casa (ruta C) deja de ser una apuesta y
   pasa a ser una migración con datos reales que la justifican.

Y una nota que no es técnica: un foro vacío **resta**. Antes de abrirlo hay que tener
respondidas cuarenta o cincuenta preguntas de verdad —el material está en la Academia y
en `DIARIO_BUGS.md`— y alguien que entre a diario los primeros tres meses.

---

## 6. Registros visuales — la segunda galería

Elegida la ruta, quedaba el **registro visual**. Una segunda galería explora seis
tonos sobre la MISMA maquetación, para que la comparación mida diseño y no contenido:

```
docs/maquetas/comunidad-layers.html          ← ábrelo en el navegador
docs/maquetas/comunidad-layers.html#/lujo    ← un registro concreto
```

| # | Registro | Qué propone | Qué decisión rompe |
|---|---|---|---|
| 1 | **Cinemático** | Portada editorial: titular de 62 px, cuatro hilos por pantalla | El ritmo vertical; la retícula de puntos es decoración |
| 2 | **Técnico** | Densidad máxima, todo en monoespaciada, retícula visible | La monoespaciada como tipografía de texto |
| 3 | **Lujo** | Serif de titular, interlineado 1,65, verde apagado | **El verde de marca** (decisión tomada) y dos familias más |
| 4 | **Brutalista** | Filete de 2 px, cero radios, acento como relleno | El filete de 1 px y los dos radios del sistema |
| 5 | **Calma** | Papel claro, serif de lectura, separación por aire | La separación por filete; el producto es oscuro por defecto |
| 6 | **Producto** | El sistema real, sin cambiar nada | Ninguna — es lo implementado |

**La primera implementación usó la 6 y el dueño la rechazó el mismo día**: pedía algo
más moderno y dejó dicho que la web entera va en esa dirección. La pantalla que hay
hoy es un **cinemático disciplinado** —titular de portada, rótulos en monoespaciada,
aire, entrada escalonada y esqueletos— que toma de la 1 la escala y el aire sin su
decoración. Qué rompe exactamente de `identidad-visual` y por qué se acepta, en
[`DECISIONES.md`](./DECISIONES.md).

> El lenguaje de estos registros sale del vocabulario de getlayers.ai (dark/light ×
> luxe, technical, brutalist, calm…). **No se ha copiado ninguna plantilla suya**: el
> dominio está bloqueado por la política de red del sandbox y no se pudo abrir. Se
> traduce el lenguaje, no el código.

---

## 7. Lo que se construyó (2026-09-03)

### Backend — `backend/forum.py` (1.178 líneas, 19 rutas)

Router inyectado desde `server.py` con el mismo patrón que `admin_routes.py`: el
módulo no importa `server` (sería un ciclo) y recibe `db`, las dependencias de
autenticación y el limitador desde fuera. Ocho colecciones, todas por el shim.

Cinco decisiones que no se deshacen sin leer la cabecera del módulo:

1. **La identidad pública es el seudónimo, y sólo el seudónimo.** Ninguna respuesta
   lleva correo, nombre real ni `user_id`. Se sigue a la gente por su `handle`.
2. **El orden numérico se hace en Python, no en SQL.** El shim ordena con
   `ORDER BY (data->>'campo')`, que es orden de TEXTO: por ahí, 9 me gusta van por
   delante de 10. Se traen candidatos por fecha y se ordena en memoria.
3. **Lo que no se puede calcular es `None`, no `0`.** Un análisis sin stop publica
   `rr: null` con su motivo.
4. **Los contadores no los manda el cliente.** `extra="forbid"` en los modelos de
   escritura, y un test estructural fija que no declaran campos de servidor.
5. **El texto se guarda en plano.** Se decodifican entidades ANTES de quitar
   etiquetas (al revés, `&lt;img onerror=…&gt;` sobrevive) y se eliminan los
   controles invisibles, incluidos los de dirección bidi.

**El límite de escritura es por CUENTA, no por IP.** `slowapi` va por IP, y detrás
de un NAT compartido diez personas se comen la cuota de las demás — es lo que obligó
a quitar el límite de `/auth/register`. Aquí no hace falta quitarlo: con el token
delante se puede contar por cuenta, que es a quien se quiere limitar.

**Traducción bajo demanda** con el SDK de Anthropic (`claude-haiku-4-5`), cacheada
por (mensaje, idioma, **hash del contenido**) para que editar un mensaje no deje la
traducción vieja mintiendo. El texto del usuario va delimitado y etiquetado como
datos en el prompt: un mensaje de foro es entrada de un desconocido.

### RGPD — un fallo real encontrado, y su causa

La sonda contra PostgreSQL destapó que **borrar la cuenta no borraba los hilos**:
`forum_threads` guarda a su autor en `author_id` y `forum_follows` tiene dos
referencias, y el bucle de `delete_account` buscaba sólo `{"user_id": …}`. Es el
hueco G-15 con otro nombre de campo, y la respuesta 200 del endpoint decía que todo
había ido bien.

Se arregló **la causa**: `_USER_OWNER_FIELDS` declara los campos de propiedad que no
son `user_id`, y borrado, purga y export los heredan. La comunidad va además en
`_USER_NON_PURGED_COLLECTIONS`: se borra con la cuenta (art. 17) y se exporta
(art. 20), pero la purga por impago **no la toca** — vaciar el foro a los 90 días
rompería conversaciones de terceros.

### Frontend

`/community` y `/community/:threadId`, **sin `ProtectedRoute`**: se lee sin cuenta
porque cada hilo es una URL indexable y es la única forma de que a un foro nuevo lo
encuentre alguien. Escribir sí exige sesión, y eso lo comprueba el backend.

102 claves i18n **en los diez idiomas**, con paridad verificada. La cola de
moderación vive en el panel admin, bajo «Legal y RGPD».

### Qué se probó, y con qué

| Capa | Fichero | Qué fija |
|---|---|---|
| Puro | `backend/tests/test_forum_unit.py` (48) | Saneado, seudónimos, R:R, orden numérico, privacidad |
| Rutas | `backend/tests/test_forum_rutas_unit.py` (48) | Permisos entre cuentas, contadores, traducción, moderación |
| RGPD | `backend/tests/test_user_data_collections_unit.py` (+5) | Campos de propiedad distintos de `user_id` |
| Vivo | `tests/e2e/api/comunidad.py` (26) | Contra backend y PostgreSQL reales, incluido el borrado |
| Navegador | `tests/e2e/navegador/comunidad.js` (16) | Ciclo completo en Chromium, escritorio y móvil |

**Siete sabotajes deliberados** sobre `forum.py` para comprobar que los tests
verifican algo. Seis se cazaron a la primera; el séptimo —«el cliente puede fijar
sus propios contadores»— **no**, porque el test pasaba por el descarte silencioso
de Pydantic y no por el código. Se arregló con `extra="forbid"` y un test
estructural, y entonces sí lo cazó.

---

## 8. Lo que falta

- [ ] **No está desplegado.** El backend sube con el siguiente deploy de Cloud Run;
      el frontend, con el siguiente build de Pages.
- [ ] `ANTHROPIC_API_KEY` tiene que estar en el servicio para que la traducción
      funcione. Sin ella, `POST /forum/translate` responde 503 y la pantalla enseña
      el original — degrada, no rompe.
- [ ] **Moderación proactiva**: hoy hay denuncia + ocultar. No hay antispam
      automático, ni silenciar, ni expulsar, ni revisión del primer mensaje.
- [ ] **Notificaciones**: nadie se entera de que le han respondido.
- [ ] **Buscador**: `$regex` sin anclar sobre el título. Sirve para cien hilos, no
      para diez mil.
- [ ] **Paginación real**: la ventana de orden son 600 candidatos y la respuesta
      avisa con `windowExhausted` cuando se llena. Es honesto, no es infinito.
- [ ] **Sembrar la comunidad**: el foro se publica vacío a propósito, pero un foro
      vacío resta. Antes de anunciarlo hacen falta cuarenta o cincuenta preguntas
      reales respondidas y alguien que entre a diario los primeros tres meses.
- [ ] No se ha comprobado ninguna versión, licencia ni requisito de los motores de
      la § 2: el sandbox no tiene salida a internet.
