#!/usr/bin/env python3
"""El precio que se enseña tiene que ser el que se cobra.

El fallo que esto impide
------------------------
El importe de cada plan está escrito **en doce sitios**: una vez en
`SUBSCRIPTION_PLANS` de `backend/server.py` —el único que manda cuando Stripe
cobra— y once veces como texto, una por cada uno de los diez idiomas más la
página de precios. Subir un precio es editar doce ficheros y confiar en no
olvidar ninguno.

Y el sitio que manda es justamente **el que la página no consulta**: `GET /plans`
existe, devuelve `SUBSCRIPTION_PLANS`, y ninguna pantalla lo llama — está en
`docs/RUTAS_MUERTAS.md` como CONSTRUIR. Mientras siga así, nada impide que la
página anuncie 17 € y el checkout cobre 19.

Un usuario al que le cobran más de lo anunciado no tiene un bug: tiene un motivo
de devolución y, en la UE, una práctica comercial desleal. Así que hasta que la
página lea el precio del backend, esto lo comprueba en CI.

    python scripts/check-precios.py

Sale 1 si algún idioma anuncia un importe distinto del que se cobra.
"""
from __future__ import annotations

import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SERVIDOR = RAIZ / "backend" / "server.py"
I18N = RAIZ / "frontend" / "src" / "lib" / "i18n"

# `"monthly": {"name": ..., "price": 17.00, ...}`
PLAN = re.compile(r'"(?P<id>[a-z]+)":\s*\{[^}]*?"price":\s*(?P<precio>[0-9]+(?:\.[0-9]+)?)')


def planes_del_backend() -> dict[str, float]:
    txt = SERVIDOR.read_text(encoding="utf-8")
    i = txt.index("SUBSCRIPTION_PLANS = {")
    bloque = txt[i:txt.index("\n}", i)]
    return {m.group("id"): float(m.group("precio")) for m in PLAN.finditer(bloque)}


def precio_anunciado(texto: str, clave: str) -> str | None:
    m = re.search(rf'"{re.escape(clave)}":\s*"([^"]*)"', texto)
    return m.group(1) if m else None


def numero(txt: str) -> float | None:
    """El importe que hay dentro de «€17», «17 €», «EUR 17,00»…

    Se queda con dígitos y separadores para no depender de dónde ponga cada
    idioma el símbolo. Lo que NO hace es adivinar: si no encuentra número,
    devuelve None y el llamante lo trata como error, no como cero.
    """
    m = re.search(r"(\d[\d.,  ]*)", txt or "")
    if not m:
        return None
    crudo = m.group(1).replace(" ", "").replace(" ", "")
    # 1.234,56 → 1234.56 · 1,234.56 → 1234.56 · 200 → 200
    if "," in crudo and "." in crudo:
        crudo = (crudo.replace(".", "").replace(",", ".")
                 if crudo.rindex(",") > crudo.rindex(".") else crudo.replace(",", ""))
    elif "," in crudo:
        crudo = crudo.replace(",", ".") if len(crudo.split(",")[-1]) <= 2 else crudo.replace(",", "")
    elif crudo.count(".") == 1 and len(crudo.split(".")[-1]) > 2:
        crudo = crudo.replace(".", "")
    try:
        return float(crudo)
    except ValueError:
        return None


def main() -> int:
    planes = planes_del_backend()
    if not planes:
        print("❌ no se pudo leer SUBSCRIPTION_PLANS de backend/server.py")
        return 1

    locales = sorted(p for p in I18N.glob("*.js") if ".edu." not in p.name)
    fallos: list[str] = []
    comprobados = 0

    for ruta in locales:
        texto = ruta.read_text(encoding="utf-8")
        for plan, precio in planes.items():
            clave = f"{plan}Price"
            anunciado = precio_anunciado(texto, clave)
            if anunciado is None:
                # No todos los planes tienen por qué anunciarse en la página.
                # Lo que no vale es que se anuncie MAL.
                continue
            comprobados += 1
            visto = numero(anunciado)
            if visto is None:
                fallos.append(f"{ruta.name}: {clave} = {anunciado!r} — no se le encuentra importe")
            elif abs(visto - precio) > 0.005:
                fallos.append(
                    f"{ruta.name}: {clave} anuncia {anunciado!r} ({visto:g}) "
                    f"y el backend cobra {precio:g}"
                )

    if fallos:
        print(f"❌ {len(fallos)} precio(s) anunciados no coinciden con lo que se cobra:")
        for f in fallos:
            print(f"   · {f}")
        print("\n   El importe vive en SUBSCRIPTION_PLANS (backend/server.py) y se repite")
        print("   como texto en los 10 idiomas. Si has subido un precio, súbelo en todos.")
        print("   El arreglo de fondo es que la página lea GET /api/plans — ver")
        print("   docs/RUTAS_MUERTAS.md.")
        return 1

    print(f"✅ los {comprobados} precios anunciados coinciden con los "
          f"{len(planes)} planes que cobra el backend "
          f"({len(locales)} idiomas).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
