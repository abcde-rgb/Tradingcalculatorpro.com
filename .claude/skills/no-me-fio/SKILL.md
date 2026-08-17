---
name: no-me-fio
description: >-
  Verificación adversaria de una afirmación sobre TradingCalculator.Pro: una cifra
  de la web, un "ya está arreglado", un resultado de test, un dato de la
  documentación, una conclusión de otra sesión o de un agente. Úsalo antes de
  fusionar a main, cuando alguien diga que algo funciona, cuando un documento
  afirme un estado del proyecto, cuando un check salga verde y haya que decidir
  sobre él, o cuando el usuario pregunte "¿seguro?". Parte de que la afirmación es
  FALSA y busca la ruta independiente que la confirme o la tumbe. No lo uses para
  ejecutar la batería de comprobaciones —para eso está `/verify`— sino para
  decidir si lo que esa batería dijo significa lo que parece.
---

# No me fío

Este proyecto muestra cifras con las que alguien dimensiona posiciones reales.
Una afirmación equivocada aquí no es un bug: es dinero de otro.

La regla es una: **una afirmación no vale por quien la hace ni por lo verde que
salga, vale por la ruta independiente que la confirma.** Eso aplica al código, a
la documentación, a un resultado de test, a lo que dijo otra sesión y —sobre
todo— a lo que acabas de escribir tú.

## El procedimiento

### 1 · Escribe la afirmación en una frase falsable

«El lotaje está bien» no es falsable. «Un lote estándar de XAUUSD mueve 1 $ por
pip en la pantalla de lotaje» sí. Si no puedes escribirla así, no la puedes
verificar: primero conviértela.

### 2 · Busca la SEGUNDA ruta

Una comprobación que usa el mismo código que la afirmación no comprueba nada,
sólo lo repite. La segunda ruta tiene que llegar al mismo número por otro
camino:

| Afirmación sobre | Primera ruta | Segunda ruta independiente |
|---|---|---|
| Una fórmula | la función | un cálculo a mano con números redondos, o la identidad que debe cumplir |
| Un valor del catálogo | `resolveSpec()` | el dato publicado del contrato (`tick_value`), o el backend en `instruments.py` |
| Lo que ve el usuario | el componente | el **build compilado**, en el navegador |
| Un estado del proyecto | el documento | `git log`, `gen-mapa.py`, el propio código |
| «Ya está arreglado» | el commit | reproducir el fallo original y ver que ya no pasa |
| Un total | la suma | el mismo total agregado por otra dimensión |

Ejemplo real: `pipValue()` se comprueba contra el `tick_value` que el catálogo
publica para MES, ES, CL y GC. Son dos caminos que no comparten código y tienen
que dar el mismo número. Eso es una verificación; correr la función y ver que no
revienta, no.

### 3 · Haz que falle a propósito

Un test que nunca ha fallado no se sabe si prueba algo. Antes de fiarte de una
comprobación nueva, rómpela: cambia el signo, quita el factor, mete un cero.
Si sigue en verde, la comprobación es decorativa.

### 4 · Comprueba también lo que NO tiene que pasar

Casi todos los falsos verdes de este proyecto han sido de omisión, no de error.

## El catálogo de falsos verdes (todos ocurridos aquí)

**El check que sólo mira la mitad.** El lotaje enseñaba el aviso «por encima del
tope del 10 %» **y debajo un tamaño calculado con otro techo**. La sonda
comprobaba que el aviso apareciera y daba verde. Faltaba la aserción negativa:
*y no hay ningún tamaño*.

**El artefacto viejo.** Una cadena `npm run build | grep | head -1 && cp` se
rompió por SIGPIPE, la copia nunca se ejecutó y el navegador leyó un bundle
anterior. Verde sobre código que no estaba desplegado. Comprueba siempre que lo
que sirves es lo que acabas de compilar.

**El servidor que contesta 200 a todo.** `python -m http.server` no tiene
fallback de SPA: `/dashboard` devolvía una página de error 404 con código 200, y
la sonda dio por bueno «la página carga» mirando sólo la URL. Afirma sobre el
CONTENIDO, no sobre el código de respuesta.

**La función pura correcta y la pantalla rota.** `deskMath` tenía 322
comprobaciones en verde mientras `DeskForm` colapsaba el modo nuevo a `pct` con
un ternario de dos ramas: la aritmética perfecta y el usuario sin verla. Y
Fibonacci tenía DOS recortes de decimales —uno en el cálculo y otro en el
render, `parseFloat(...).toLocaleString()`— así que arreglar el primero no se
notaba. **La capa de presentación es código y también miente.**

**La semilla que nunca se corrió.** `snapDown` llevaba un epsilon absoluto donde
el error es relativo. Un millón de comprobaciones en verde durante meses; salió
con una semilla nueva. Cambia la semilla (`--semilla N`) al verificar algo
nuevo: repetir la misma tanda no añade información.

**El documento que se cree a sí mismo.** `PENDIENTES.md` daba por abierto lo
cerrado y citaba cifras falsas (G-29). Un documento es una afirmación de
alguien, no una fuente. Contrástalo con el código.

**La descripción que promete lo que el código no hace.** `calcDescLotsize`
prometía «el valor del pip de cada par y tu divisa de cuenta»; ninguna de las dos
cosas existía. Lee la etiqueta y el código como dos afirmaciones distintas.

**El parser de la propia sonda.** Dos falsos rojos por leer `-$100,00` (locale
`es-ES`) con un parser en-US. Cuando una sonda falla, la primera sospechosa es
la sonda.

## Cómo se reporta

Di lo que comprobaste, por qué ruta, y **qué queda sin comprobar**. Un informe
que sólo lleva verdes es un informe incompleto: siempre hay algo que no se
midió, y decirlo es parte del resultado.

Nunca escribas «verificado» sobre algo que sólo leíste. Leer el código es una
hipótesis; ejecutarlo es una comprobación.

Si la afirmación era tuya y era falsa, corrígela en una frase y sigue. Sin
disculpas y sin recuento de errores pasados.
