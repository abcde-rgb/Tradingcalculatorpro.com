"""Ninguna ruta convierte su propio 4xx en un 500.

`HTTPException` hereda de `Exception`. Un `try` que lanza `HTTPException(400)`
y se cierra con `except Exception: raise HTTPException(500)` reetiqueta su
propia respuesta: el cliente deja de poder distinguir «lo has pedido mal» de
«el servidor está roto», el mensaje que el desarrollador escribió no llega a
nadie, y cada error de usuario entra en las alarmas como fallo del servidor,
enterrando los 500 de verdad.

Encontrado el 2026-08-07 en el examen de autorización: `POST
/user-states/save` sin `state_id` devolvía **500** teniendo escrito un 400 con
su mensaje. Eran cinco funciones, tres de ellas de **facturación**, donde «no
tienes suscripción activa» salía como error del servidor.

Esto se comprueba sobre el ÁRBOL SINTÁCTICO y no llamando a las rutas: el fallo
es estructural, y así cubre también las que no tienen test de integración —que
son casi todas, con `server.py` al 26 % de cobertura.
"""
import ast
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
MODULOS = ("server.py", "missing_apis.py", "admin_routes.py", "realtime_alerts.py")


def _lanza_http(nodo: ast.AST) -> bool:
    for n in ast.walk(nodo):
        if isinstance(n, ast.Raise) and isinstance(n.exc, ast.Call):
            f = n.exc.func
            if getattr(f, "id", None) == "HTTPException" or getattr(f, "attr", None) == "HTTPException":
                return True
    return False


def _tipos_capturados(try_node: ast.Try):
    return [getattr(h.type, "id", None) or getattr(h.type, "attr", None)
            for h in try_node.handlers]


def _culpables(fuente: str):
    """(función, línea) por cada `try` que lanza un HTTPException y lo captura
    con un `except Exception` sin dejar pasar antes el HTTPException."""
    fuera = []
    for fn in ast.walk(ast.parse(fuente)):
        if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for t in ast.walk(fn):
            if not isinstance(t, ast.Try) or not any(_lanza_http(s) for s in t.body):
                continue
            tipos = _tipos_capturados(t)
            if "HTTPException" in tipos:
                continue                      # tiene la guarda: correcta
            if any(x in ("Exception", "BaseException", None) for x in tipos):
                fuera.append((fn.name, t.lineno))
    return fuera


@pytest.mark.parametrize("modulo", MODULOS)
def test_ninguna_ruta_reetiqueta_su_propio_4xx_como_500(modulo):
    ruta = BACKEND / modulo
    if not ruta.exists():
        pytest.skip(f"{modulo} no existe")
    culpables = _culpables(ruta.read_text(encoding="utf-8"))
    assert not culpables, (
        f"{modulo}: estas funciones lanzan un HTTPException dentro de un try "
        f"cuyo `except Exception` lo convierte en 500 — añade "
        f"`except HTTPException: raise` antes: {culpables}"
    )


def test_el_detector_encuentra_el_patron_cuando_existe():
    """Sin esto, el test de arriba pasaría aunque el detector estuviera roto."""
    malo = (
        "from fastapi import HTTPException\n"
        "def f():\n"
        "    try:\n"
        "        raise HTTPException(status_code=400, detail='mal pedido')\n"
        "    except Exception:\n"
        "        raise HTTPException(status_code=500, detail='error')\n"
    )
    assert _culpables(malo) == [("f", 3)]

    bueno = (
        "from fastapi import HTTPException\n"
        "def f():\n"
        "    try:\n"
        "        raise HTTPException(status_code=400, detail='mal pedido')\n"
        "    except HTTPException:\n"
        "        raise\n"
        "    except Exception:\n"
        "        raise HTTPException(status_code=500, detail='error')\n"
    )
    assert _culpables(bueno) == []
