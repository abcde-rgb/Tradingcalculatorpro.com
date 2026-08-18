#!/usr/bin/env python3
"""¿El muro de pago aguanta si el cliente miente?

La pregunta no es si la interfaz esconde el botón —eso lo hace `useIsPremium()`
y cualquiera lo desactiva desde la consola del navegador en diez segundos—, sino
si el **backend** sirve los datos igualmente. Un muro que sólo vive en el cliente
no es un muro: es una cortina.

El método: una cuenta recién creada y SIN suscripción llama a todas las rutas que
`server.py` marca con `Depends(require_premium)`. Lo que se exige es 403 en cada
una. Y también lo contrario, que es donde se cuelan los falsos verdes: la misma
cuenta, ya con premium en la base, tiene que recibir 200 en esas mismas rutas —
si diera 403 siempre, el 403 no probaría nada sobre la suscripción, sólo que la
ruta está rota.

    python tests/e2e/api/muro-premium.py
"""

import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import API, cuenta, da_premium, llama  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent.parent.parent
SERVER = RAIZ / "backend" / "server.py"

FALLOS = []


def marca(nombre: str, ok: bool, detalle: str = "") -> None:
    print(f"  {'✅' if ok else '❌'} {nombre}{' — ' + detalle if detalle else ''}")
    if not ok:
        FALLOS.append(nombre)


def rutas_premium() -> list[tuple[str, str]]:
    """(método, ruta) de todo lo decorado con `require_premium`.

    Se leen del fuente en vez de mantener una lista a mano: una lista escrita a
    mano envejece en cuanto alguien añade una ruta, y entonces la que falta es
    justo la que nadie probó.
    """
    src = SERVER.read_text(errors="ignore")
    out = []
    dec = re.compile(r'@api_router\.(get|post|put|patch|delete)\("([^"]+)"')
    for m in dec.finditer(src):
        # El cuerpo de la función va desde el decorador hasta el siguiente
        # decorador de ruta; `require_premium` tiene que aparecer en la firma.
        sig_fin = src.find("\n\n", m.end())
        firma = src[m.end():sig_fin if sig_fin > 0 else m.end() + 600]
        if "require_premium" in firma.split("):")[0]:
            out.append((m.group(1).upper(), m.group(2)))
    return sorted(set(out))


def main() -> int:
    print("═══ ¿El muro de pago vive en el servidor o sólo en la pantalla? ═══\n")

    premium = rutas_premium()
    print(f"Rutas con Depends(require_premium) en server.py: {len(premium)}")
    if not premium:
        marca("se encuentran rutas premium que probar", False,
              "el detector no halló ninguna: sin esto la sonda no mide nada")
        return 1

    # La cuenta se GASTA: al final del control invertido queda con premium, así
    # que cada vuelta necesita una nueva. Y `POST /auth/register` va a 3/hora,
    # que es un límite correcto y no se toca. Por eso se puede pasar una cuenta
    # ya creada por entorno — sin eso la sonda sólo se puede correr tres veces
    # por hora y acaba no corriéndose nunca.
    correo = os.environ.get("QA_CUENTA_LIBRE") or f"libre{int(time.time())}@ejemplo.com"
    clave = os.environ.get("QA_CUENTA_LIBRE_CLAVE", "Clave-Segura-123")
    tok = cuenta(correo, clave,
                 clon_de="victima@example.com",
                 clon_password=os.environ.get("QA_CLAVE_VICTIMA", "Clave-Segura-123"))
    cod_yo, yo = llama("GET", "/auth/me", None, tok)
    if cod_yo != 200 or not isinstance(yo, dict) or not yo.get("id"):
        marca("la cuenta de prueba existe y se puede releer", False,
              f"HTTP {cod_yo} — sin esto la sonda no mide nada")
        return 1
    if yo.get("is_premium"):
        marca("la cuenta de prueba empieza SIN premium", False,
              "arranca ya premium: el 403 de abajo no probaría el muro")
        return 1
    marca("la cuenta de prueba existe y empieza sin premium", True, correo)

    # ── 1 · sin token ────────────────────────────────────────────────────
    print("\n── sin autenticar ──")
    sin_auth = []
    for metodo, ruta in premium:
        cod, _ = llama(metodo, ruta, {} if metodo in ("POST", "PUT", "PATCH") else None, None)
        if cod not in (401, 403, 422):
            sin_auth.append(f"{metodo} {ruta} → {cod}")
    marca("ninguna ruta premium responde a un anónimo", not sin_auth,
          "; ".join(sin_auth[:4]) if sin_auth else f"{len(premium)} rutas, todas 401/403")

    # ── 2 · cuenta gratuita ──────────────────────────────────────────────
    print("\n── cuenta creada hoy, sin suscripción ──")
    filtradas = []
    for metodo, ruta in premium:
        cod, cuerpo = llama(metodo, ruta, {} if metodo in ("POST", "PUT", "PATCH") else None, tok)
        # 404 = el objeto no existe (ruta con :id inventado) → el muro no llegó
        # a evaluarse; 422 = el cuerpo vacío no valida, idem. Sólo un 2xx es fuga.
        if 200 <= cod < 300:
            filtradas.append(f"{metodo} {ruta} → {cod} {str(cuerpo)[:60]}")
    marca("una cuenta gratuita no obtiene datos de ninguna ruta premium",
          not filtradas,
          "; ".join(filtradas[:5]) if filtradas else f"{len(premium)} rutas, ni una 2xx")

    # ── 3 · el control invertido ─────────────────────────────────────────
    # Si el 403 de arriba saliera igual con premium, no estaría midiendo la
    # suscripción sino una ruta rota. Se comprueba con una lectura sencilla.
    print("\n── el mismo usuario, ya con premium (control invertido) ──")
    lecturas = [(m, r) for m, r in premium
                if m == "GET" and "{" not in r and "/export" not in r][:6]
    antes = {r: llama("GET", r, None, tok)[0] for _, r in lecturas}
    da_premium(yo["id"])
    despues = {r: llama("GET", r, None, tok)[0] for _, r in lecturas}

    cambian = [r for r in antes if antes[r] == 403 and 200 <= despues[r] < 300]
    siguen = [f"{r}: {antes[r]}→{despues[r]}" for r in antes if not (antes[r] == 403 and 200 <= despues[r] < 300)]
    marca("dar premium abre las rutas que antes daban 403", bool(cambian),
          f"{len(cambian)} de {len(antes)} cambian"
          + (f" · sin cambiar: {'; '.join(siguen[:3])}" if siguen else ""))

    print("\n" + "=" * 70)
    print(f"{5 - len(FALLOS)}/5 comprobaciones OK")
    if FALLOS:
        print("\nFALLAN:")
        for f in FALLOS:
            print(f"  ❌ {f}")
    return 1 if FALLOS else 0


if __name__ == "__main__":
    sys.exit(main())
