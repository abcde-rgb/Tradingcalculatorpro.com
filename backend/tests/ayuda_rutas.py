"""Enumerar las rutas REGISTRADAS de la aplicación, en cualquier FastAPI.

## Por qué hace falta

`test_route_uniqueness_unit.py` es el guardián de G-04 (ningún par
método+ruta duplicado). Recorría `app.routes` directamente, y eso dejó de
significar lo mismo:

| FastAPI | `len(app.routes)` |
|---|---|
| 0.115 | **202** — los routers incluidos se aplanan en la app |
| 0.141 | **5** — `include_router` deja un `_IncludedRouter` sin aplanar |

El peligro no es que el test falle: es que **pase**. Con 5 rutas, «no hay dos
iguales» es cierto por vacío, y el guardián de las rutas duplicadas se
convertiría en un adorno el día que alguien suba FastAPI. Que fallara ruidoso
fue suerte de `test_some_routes_were_actually_found`, que existe justamente para
eso — y es la razón por la que esa prueba no se debe quitar nunca.

Este recorrido baja por los routers anidados, así que da el mismo conjunto en
las dos versiones.
"""
from typing import Any, Iterator, List, Tuple


def _hijos_y_prefijo(objeto: Any):
    """Las rutas que cuelgan de un router, y el prefijo con el que se montaron.

    - FastAPI ≤ 0.140: `app.routes` ya trae todo aplanado y con el prefijo
      aplicado en `route.path`, así que no hay nada que acumular.
    - FastAPI ≥ 0.141: `include_router` deja un `_IncludedRouter` que guarda el
      router en `.original_router` **con las rutas RELATIVAS**, y el prefijo en
      `.include_context.prefix`. Sin acumularlo, `/api/admin/plans` se lee como
      `/plans`: los conteos cuadrarían y las comparaciones no, que es la peor
      de las dos situaciones.
    """
    interno = getattr(objeto, "original_router", None)
    if interno is not None and hasattr(interno, "routes"):
        contexto = getattr(objeto, "include_context", None)
        return list(interno.routes), getattr(contexto, "prefix", "") or ""
    interno = getattr(objeto, "router", None)
    if interno is not None and hasattr(interno, "routes"):
        return list(interno.routes), getattr(objeto, "prefix", "") or ""
    if hasattr(objeto, "routes"):
        return list(objeto.routes), getattr(objeto, "prefix", "") or ""
    return [], ""


def caminar_rutas(app: Any) -> Iterator[Tuple[str, Any]]:
    """`(ruta_completa, objeto)` de cada ruta hoja, con los prefijos aplicados."""
    pendientes: List[Tuple[str, Any]] = [("", r) for r in getattr(app, "routes", [])]
    vistos: set = set()
    while pendientes:
        prefijo, actual = pendientes.pop()
        marca = (prefijo, id(actual))
        if marca in vistos:
            continue
        vistos.add(marca)
        hijos, propio = _hijos_y_prefijo(actual)
        if hijos:
            pendientes.extend((prefijo + propio, h) for h in hijos)
            continue
        camino = getattr(actual, "path", None)
        if camino:
            yield prefijo + camino, actual


def metodos_y_rutas(app: Any) -> List[Tuple[str, str]]:
    """Pares `(método, ruta)` de todas las rutas HTTP registradas.

    Las de WebSocket no tienen `methods`; se devuelven con el método `WS` para
    que también entren en la comprobación de duplicados.
    """
    salida: List[Tuple[str, str]] = []
    for camino, ruta in caminar_rutas(app):
        metodos = getattr(ruta, "methods", None)
        if metodos:
            salida.extend((m, camino) for m in metodos)
        elif type(ruta).__name__.endswith("WebSocketRoute"):
            salida.append(("WS", camino))
    return salida


def caminos(app: Any) -> set:
    """El conjunto de rutas (sin método), para comprobar que algo existe."""
    return {c for _, c in metodos_y_rutas(app)}
