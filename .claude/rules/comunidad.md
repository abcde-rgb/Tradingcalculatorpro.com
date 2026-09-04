---
paths:
  - "backend/forum.py"
  - "backend/tests/test_forum*.py"
  - "frontend/src/pages/CommunityPage.jsx"
  - "frontend/src/components/community/**"
  - "frontend/src/services/forumApi.js"
  - "tests/e2e/api/comunidad.py"
  - "tests/e2e/navegador/comunidad.js"
---

# Comunidad — el foro propio

Construido el 2026-09-03. El porqué y qué se descartó, en
[`docs/FORO_COMUNIDAD.md`](../../docs/FORO_COMUNIDAD.md); las decisiones, en
[`docs/DECISIONES.md`](../../docs/DECISIONES.md). Aquí van sólo las trampas.

## 1 · La identidad pública es el seudónimo, y SÓLO el seudónimo

Ninguna respuesta de `forum.py` puede contener el correo, el nombre real o el
`user_id` de nadie. Se sigue a la gente por su `handle`, no por su id.

`vista_publica_hilo()` y `vista_publica_perfil()` son los dos únicos sitios por los
que un documento sale a la API, y borran los campos privados. **No devuelvas un
documento crudo**, ni siquiera «sólo este campo». Un `user_id` filtrado es un
identificador estable que cruza el foro con el resto del producto.

Lo fijan `test_forum_unit.py` (sobre el diccionario) y `tests/e2e/api/comunidad.py`
(sobre el JSON crudo del backend vivo, buscando las cadenas literales).

## 2 · El orden numérico se hace en Python, NO en SQL

El shim ordena con `ORDER BY (data->>'campo')`, que es orden de **texto**: por ahí,
un hilo con 9 me gusta va por delante de otro con 10.

`listar_hilos` trae candidatos por `created_at` —ISO ordena bien como texto— con un
tope de `VENTANA_ORDEN` (600) y ordena en memoria con `ordenar_hilos()`.

**No lo cambies por `.sort("likes", -1)`.** Y si la ventana se llena, la respuesta lo
dice con `windowExhausted`: el total es el de la ventana, no el del foro, y la
interfaz lo enseña en vez de publicar una cifra que no es.

## 3 · Los contadores y el idioma NO los manda el cliente

`views`, `likes`, `replies`, `lang` y `status` los pone el servidor. Los modelos de
escritura llevan `extra="forbid"` y `CAMPOS_PROHIBIDOS_AL_CLIENTE` lista lo que no
pueden declarar; hay un test **estructural** sobre `model_fields` que lo fija.

Por qué estructural y no de comportamiento: mandar `{"views": 999}` ya fallaba antes
porque Pydantic descarta lo no declarado — protección **por accidente**, que
desaparecería el día que alguien añadiera `views` al modelo por otro motivo. Un
sabotaje deliberado lo destapó.

El idioma sale de `user["preferred_locale"]`, en el servidor. Si lo mandara el
cliente, se podría dirigir la traducción marcando un mensaje español como japonés.

## 4 · Un R:R que no se puede calcular es `None`, con su motivo

`analisis_normalizado()` recalcula el R:R sobre entrada, stop y objetivo e **ignora
el que mande el cliente**. Sin stop, `rr = None` y `rrUndefinedReason = "sin_stop"`.
Nunca 0: como cero arrastraría la media publicada de la comunidad. Es el invariante
de honestidad de `CLAUDE.md` § 2 aplicado aquí, y la interfaz pinta «—» con el motivo
al lado.

## 5 · El límite de escritura es por CUENTA, no por IP

`slowapi` va por IP (`_rate_limit_key`), y detrás de un NAT compartido diez personas
se comen la cuota de las demás — es exactamente lo que obligó a **quitar** el límite
de `/auth/register` (ver `rules/infra.md` y `rules/backend.md`).

`server.py` inyecta `_forum_rate_key`, que usa el `user_id` del token cuando lo hay y
cae a la IP cuando no. Los decoradores del módulo usan `_limite(...)`, no
`limiter.limit(...)` directamente. **No los cambies de vuelta.**

## 6 · Una colección del foro nueva se da de alta en TRES sitios

1. El `known` de `create_all_tables` — el shim **no autocrea tablas**.
2. `_USER_NON_PURGED_COLLECTIONS` si lleva datos de usuario (el foro **no se purga
   por impago**: vaciarlo rompería conversaciones de terceros).
3. `_USER_OWNER_FIELDS` **si el usuario no está en `user_id`**. `forum_threads` lo
   guarda en `author_id` y `forum_follows` tiene dos referencias; el borrado de
   cuenta buscaba sólo `user_id` y dejaba los hilos en la base de datos. Ese fallo
   existió y lo cazó la sonda contra PostgreSQL, no la respuesta 200 del endpoint.

`forum_views` y `forum_translations` **no** llevan `user_id` a propósito: la primera
guarda una huella con sal que caduca cada día y la segunda es caché de texto ya
público. Por eso están en `known` y en ninguna tupla del RGPD.

## 7 · El texto se guarda en plano, y el orden del saneado importa

`sanitizar_texto()` **decodifica entidades ANTES de quitar etiquetas**. Al revés,
`&lt;img onerror=…&gt;` sobrevive: en el primer paso no parece una etiqueta y en el
segundo ya nadie mira. También quita los controles invisibles, incluidos los de
dirección bidi, que sirven para que un texto se lea al revés de como está guardado.

No hay HTML de usuario en ninguna parte: el frontend lo pinta como texto y React
escapa. **No metas `dangerouslySetInnerHTML` en esta zona.**

## 8 · La traducción

`POST /forum/translate` exige sesión —si no, sería un traductor gratuito y abierto
sobre nuestra factura— y cachea por `(mensaje, idioma, hash del contenido)`. El hash
no es opcional: sin él, editar un mensaje deja la traducción vieja mintiendo para
siempre.

El texto del usuario va **delimitado y etiquetado como datos** en el prompt. Un
mensaje de foro es entrada de un desconocido: pegado suelto, «ignora las
instrucciones anteriores» deja de ser texto y pasa a ser una orden.

Si el modelo no devuelve JSON válido **se falla**, no se inventa una traducción
parcial: un texto a medias en otro idioma es peor que no traducir.

## 9 · Nada de contenido sembrado

El foro se publica **vacío**. Ni hilos de ejemplo, ni cuentas de relleno, ni mensajes
de bienvenida firmados por nadie. Es una petición explícita del dueño y también la
decisión correcta: un foro con conversaciones inventadas es una mentira que se
descubre el primer día y se lleva por delante la confianza en los números de las
calculadoras.

El estado vacío de `CommunityPage` está diseñado para eso: dice que está vacío,
explica por qué, y propone escribir el primero.

## 10 · El registro visual va por delante del resto del producto

Decidido por el dueño el 2026-09-03: la comunidad estrena el registro al que va a ir
la web entera. Titular de portada, rótulos en monoespaciada, aire, entrada escalonada
y esqueletos.

Tres cosas que **no** se pueden deshacer por «volver al sistema»:

- La display aparece **una sola vez por pantalla** (el titular). Es lo que
  `identidad-visual` § 2 pide para esa familia, no una excepción.
- La profundidad del fondo es `.tc-campo`: una **retícula de marcas de calibre**, la
  misma escala que la regleta. **No es un degradado de color** y no se sustituye por
  uno: ahí está la diferencia entre esto y una plantilla.
- El halo (`.tc-halo`) lo lleva **un único objeto de la pantalla**: la ficha de la
  operación en el detalle. Si algún día lo llevan dos, deja de significar nada.

Las animaciones viven en `index.css` y no en el componente, para que la regla global
de `prefers-reduced-motion` las alcance. `.tc-entra` tiene el estado final como estado
por defecto: si el JavaScript no llega, el contenido se ve igual.

## 11 · Cómo se prueba esto

```bash
cd backend && python -m pytest tests/test_forum_unit.py tests/test_forum_rutas_unit.py -q
bash tests/e2e/stack/arriba.sh          # Postgres + backend + build
python3 tests/e2e/api/comunidad.py      # contra PostgreSQL de verdad
node tests/e2e/navegador/comunidad.js   # ciclo completo en Chromium
```

⚠️ **El build tiene que llevar `REACT_APP_BACKEND_URL`.** `arriba.sh` lo pone; un
`npm run build` a secas deja `API = null`, el frontend no habla con el backend y la
sonda falla en sitios que no tienen nada que ver (se ve venir por el
`%REACT_APP_BACKEND_URL%` sin sustituir en la CSP). Ya despistó una vez.

Las anclas de la sonda son `data-testid` (`foro-producto`, `foro-activo`,
`foro-orden`, `foro-buscar`), no `id`: al rediseñar la pantalla los ids desaparecieron
y la sonda falló por el ancla en vez de por el producto.

Los tests de rutas usan un **doble** de base de datos: prueban la lógica, no la
traducción a SQL. Lo segundo lo cubre la sonda de API, y por eso las dos hacen falta
— el fallo del RGPD sólo aparecía en la segunda.
