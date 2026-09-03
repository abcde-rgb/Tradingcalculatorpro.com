# Foro propio de la comunidad — motores de código abierto y cómo encajan aquí

> **Estado: exploración, nada decidido ni construido.** Este documento y la galería
> [`maquetas/foro-comunidad.html`](./maquetas/foro-comunidad.html) existen para **elegir
> forma y motor antes de escribir una línea**. No hay hueco `G-xx` abierto para el foro
> ni ruta de backend que lo sirva.

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

## 6. Lo que aún no se ha hecho

- [ ] No hay decisión tomada: esto es material para decidir, no un plan aprobado.
- [ ] No se ha medido el coste mensual real de un servidor para Discourse.
- [ ] No se ha comprobado en vivo ninguna versión, licencia ni requisito de la § 2.
- [ ] No existe esquema de datos, ni ruta, ni pantalla: **nada de esto está construido**.
- [ ] Si se elige la ruta C, hay que meter las colecciones del foro en las tres rutas del
      RGPD desde el primer commit, no después (la lección de G-15).
