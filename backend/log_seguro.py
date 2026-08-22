"""Un valor de fuera, apto para meter en una línea de log.

Vivía dentro de `server.py`, y eso lo hacía inalcanzable para los otros once
módulos del backend: `stock_data.py` no puede importar `server.py` sin montar un
ciclo, así que cada uno seguía escribiendo sus logs con el valor crudo. La
medición del 2026-08-22 lo puso en números: **48 interpolaciones crudas y 88
argumentos `%` sin proteger** repartidos por once ficheros, mientras la regla que
decía cubrir esto miraba un solo fichero y una sola forma sintáctica.

Aquí no hay estado ni dependencias: se puede importar desde cualquier sitio.
"""
from __future__ import annotations

from typing import Any

# 200 y no 64 porque esto envuelve también EXCEPCIONES, y un mensaje de
# excepción útil pasa de 64 con facilidad — «HTTPSConnectionPool(host='...',
# port=443): Max retries exceeded with url: ...» son 150 de salida. Con 64 el
# log quedaba a salvo y sin servir para depurar, que es cambiar un problema por
# otro.
LIMITE_POR_DEFECTO = 200


def log_safe(value: Any, limite: int = LIMITE_POR_DEFECTO) -> str:
    """El valor saneado para un log de una sola línea.

    Un símbolo llega por la ruta o por la query y va tal cual a `logging`. Si
    lleva un salto de línea dentro, lo que escribe no es una línea con un salto:
    son DOS líneas, y la segunda la redacta quien hizo la petición. Con eso se
    fabrican entradas falsas —un `ERROR` inventado, un login que nadie hizo— y
    quien lea el log después no tiene forma de distinguirlas de las de verdad.
    Es lo que CodeQL llama *log injection*, y lo cazó en la ruta de level-odds.

    ⚠️ `.strip()` NO vale, y era lo que había: quita los saltos de los extremos
    y deja intactos los de en medio, que son justamente los que parten la línea.

    Se sustituye cualquier carácter no imprimible por `?`, se recorta a `limite`
    y se marca el recorte. No se descarta el valor: el símbolo que provocó el
    error es justo lo que uno quiere ver en el log.

    ⚠️ Los dos `.replace()` de abajo son REDUNDANTES para el comportamiento: el
    barrido de `isprintable()` ya se lleva `\\r` y `\\n` por delante. Están porque
    el análisis de taint de CodeQL sí modela `str.replace` y NO modela un
    `isprintable()` dentro de un generador, así que sin ellos marcaba como *log
    injection* las 17 llamadas que pasan justamente por aquí. No es maquillaje
    para el escáner: quitarlos no cambia una sola salida de esta función, y
    ponerlos hace que la intención sea legible para una persona y para una
    herramienta. La garantía de verdad sigue siendo el barrido, que además cubre
    lo que un `replace` de saltos de línea no ve — `\\x1b` (secuencias ANSI),
    `\\x00` y el separador de línea Unicode U+2028.
    """
    texto = str(value).replace("\r", "?").replace("\n", "?")
    limpio = "".join(c if c.isprintable() else "?" for c in texto)
    return limpio[:limite] + "…" if len(limpio) > limite else limpio
