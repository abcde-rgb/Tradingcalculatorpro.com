#!/usr/bin/env python3
"""¿Puede una cuenta tocar los datos de otra?

`server.py` está al 26 % de cobertura: los 693 tests comprueban funciones puras,
casi ninguno cruza la capa HTTP. Esta es la pregunta que ese hueco deja sin
responder, y la única cuyo «no» hay que poder demostrar en un producto donde el
usuario guarda su historial de operaciones.

El método: dos cuentas reales (VÍCTIMA y ATACANTE), la víctima crea un objeto de
cada tipo, y el atacante intenta leerlo, editarlo y borrarlo cambiando el id de
la URL. Lo que se exige NO es sólo que falle: es que falle **sin filtrar nada** y
que el objeto siga intacto después.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import (  # noqa: E402
    API, Marcador, cuenta, da_premium, llama, sql, tablas_con_user_id,
)
import json
import urllib.error
import urllib.request


VICTIMA = ("victima@example.com", "VictimaQa2026!")
ATACANTE = ("atacante@example.com", "AtacanteQa2026!")

resultados = []


def marca(nombre, ok, detalle=""):
    resultados.append((nombre, ok, detalle))
    print(f"  {'✅' if ok else '❌'} {nombre}" + (f" — {detalle}" if detalle else ""))



def entra(email, password):
    """Login; si la cuenta no existe, la registra."""
    cod, cuerpo = llama("POST", "/auth/login", {"email": email, "password": password})
    if cod == 200:
        return cuerpo["token"]
    cod, cuerpo = llama("POST", "/auth/register",
                        {"email": email, "password": password, "name": email.split("@")[0]})
    if cod in (200, 201):
        return cuerpo["token"]
    raise SystemExit(f"no se pudo entrar como {email}: {cod} {cuerpo}")


print("\n" + "=" * 78)
print("AUTORIZACIÓN CRUZADA — ¿puede una cuenta tocar los datos de otra?")
print("=" * 78 + "\n")

tok_v = entra(*VICTIMA)
tok_a = entra(*ATACANTE)
yo_v = llama("GET", "/auth/me", None, tok_v)[1]
yo_a = llama("GET", "/auth/me", None, tok_a)[1]
# El diario está tras el muro de pago. Sin premium, la víctima no puede crear la
# operación y el bloque más importante de esta sonda —leer, editar y borrar la
# operación de OTRO— se salta sin decir nada: 14 comprobaciones en verde que no
# han probado lo único que de verdad hay que demostrar.
da_premium(yo_v["id"])
da_premium(yo_a["id"])
print(f"víctima  : {yo_v.get('email')}  id={yo_v.get('id')[:8]}…")
print(f"atacante : {yo_a.get('email')}  id={yo_a.get('id')[:8]}…\n")

# ── La víctima crea un objeto de cada tipo ───────────────────────────────
print("── la víctima crea sus datos ──")
objetos = {}

cod, t = llama("POST", "/performance/trades", {
    "symbol": "SECRETO", "instrument_type": "cfd", "side": "long",
    "entry_price": 100, "quantity": 1, "leverage": 5, "account_balance": 10000,
    "sl": 95, "tp": 110, "status": "open", "notes": "dato privado de la victima",
}, tok_v)
objetos["operación del diario"] = ("/performance/trades/{}", t.get("id") if t else None, cod)

cod, c = llama("POST", "/calculations", {
    "type": "position-size", "inputs": {"balance": 10000}, "results": {"units": 3},
}, tok_v)
objetos["cálculo guardado"] = ("/calculations/{}", (c or {}).get("id"), cod)

cod, a = llama("POST", "/alerts", {
    "symbol": "BTCUSDT", "targetPrice": 90000, "condition": "above",
}, tok_v)
objetos["alerta de precio"] = ("/alerts/{}", (a or {}).get("id"), cod)

cod, s = llama("POST", "/user-states/save", {
    "state_id": "borrador-privado", "state": {"nota": "solo para la victima"},
}, tok_v)
objetos["estado guardado"] = ("/user-states/get/{}", "borrador-privado", cod)

cod, p = llama("POST", "/plan", {
    "name": "Plan privado de la victima",
    "risk": {"max_risk_pct_per_trade": 1.0, "min_rr": 2.0},
}, tok_v)
objetos["plan de trading"] = (None, (p or {}).get("id"), cod)

for nombre, (_, oid, cod) in objetos.items():
    print(f"  {nombre:22} creado: {'sí' if oid else 'NO'}  (HTTP {cod})"
          + (f"  id={str(oid)[:8]}…" if oid else ""))

tid = objetos["operación del diario"][1]
cid = objetos["cálculo guardado"][1]
aid = objetos["alerta de precio"][1]

# ── El atacante intenta llegar a cada uno ────────────────────────────────
print("\n── el atacante cambia el id de la URL ──")

if tid:
    cod, cuerpo = llama("GET", f"/performance/trades/{tid}", None, tok_a)
    filtra = isinstance(cuerpo, dict) and ("SECRETO" in json.dumps(cuerpo))
    marca("no puede LEER la operación de la víctima", cod in (403, 404) and not filtra,
          f"HTTP {cod}" + (" ¡Y DEVUELVE EL CONTENIDO!" if filtra else ""))

    # Cuerpo COMPLETO y válido: con uno incompleto la respuesta es un 422 de
    # validación y la comprobación de propiedad no llega a ejecutarse — el test
    # pasaría sin haber probado nada.
    pirata = {"symbol": "PIRATEADO", "instrument_type": "cfd", "side": "long",
              "entry_price": 100, "quantity": 1, "leverage": 5,
              "account_balance": 10000, "sl": 95, "tp": 110, "status": "open",
              "notes": "modificado por el atacante"}
    cod, cuerpo = llama("PUT", f"/performance/trades/{tid}", pirata, tok_a)
    marca("no puede EDITAR la operación de la víctima", cod in (403, 404),
          f"HTTP {cod}" + (" ¡LA HA MODIFICADO!" if cod == 200 else ""))

    cod, _ = llama("DELETE", f"/performance/trades/{tid}", None, tok_a)
    marca("no puede BORRAR la operación de la víctima", cod in (403, 404), f"HTTP {cod}")

    # Lo que de verdad importa: que después siga intacta.
    cod, sigue = llama("GET", f"/performance/trades/{tid}", None, tok_v)
    intacta = cod == 200 and sigue.get("symbol") == "SECRETO"
    marca("la operación sigue intacta tras los tres intentos", intacta,
          f"symbol={(sigue or {}).get('symbol')}")

    # La misma operación por la ruta LEGADA, que es otra puerta al mismo dato.
    cod, _ = llama("PUT", f"/journal/trades/{tid}", {"symbol": "PIRATEADO"}, tok_a)
    marca("la ruta legada tampoco deja editarla", cod in (403, 404), f"HTTP {cod}")
    cod, _ = llama("DELETE", f"/journal/trades/{tid}", None, tok_a)
    marca("la ruta legada tampoco deja borrarla", cod in (403, 404), f"HTTP {cod}")
    cod, sigue = llama("GET", f"/performance/trades/{tid}", None, tok_v)
    marca("sigue intacta tras probar la ruta legada",
          cod == 200 and sigue.get("symbol") == "SECRETO")

if cid:
    cod, _ = llama("DELETE", f"/calculations/{cid}", None, tok_a)
    marca("no puede borrar un cálculo de la víctima", cod in (403, 404), f"HTTP {cod}")

if aid:
    cod, _ = llama("DELETE", f"/alerts/{aid}", None, tok_a)
    marca("no puede borrar una alerta de la víctima", cod in (403, 404), f"HTTP {cod}")

cod, cuerpo = llama("GET", "/user-states/get/borrador-privado", None, tok_a)
filtra = "solo para la victima" in json.dumps(cuerpo or {})
marca("no puede leer un estado guardado de la víctima", not filtra,
      f"HTTP {cod}" + (" ¡FILTRA EL CONTENIDO!" if filtra else ""))

cod, cuerpo = llama("GET", "/plan", None, tok_a)
filtra = "Plan privado de la victima" in json.dumps(cuerpo or {})
marca("no ve el plan de trading de la víctima", not filtra, f"HTTP {cod}")

# ── Los listados no deben mezclar cuentas ────────────────────────────────
print("\n── los listados de cada cuenta ──")
cod, lista = llama("GET", "/performance/trades", None, tok_a)
ops = lista if isinstance(lista, list) else (lista or {}).get("trades", [])
marca("el listado del atacante no trae operaciones de la víctima",
      not any(o.get("symbol") == "SECRETO" for o in ops), f"{len(ops)} operaciones")

# Por CONTENIDO, no por número: el atacante tiene operaciones propias de tandas
# anteriores, así que «pocas» no significa nada. Lo que hay que demostrar es que
# la cifra del atacante coincide con SU historial y no incluye el de la víctima.
cod, an_a = llama("GET", "/performance/analytics", None, tok_a)
cod, an_v = llama("GET", "/performance/analytics", None, tok_v)
n_a = ((an_a or {}).get("analytics") or {}).get("total_trades") or 0
n_v = ((an_v or {}).get("analytics") or {}).get("total_trades") or 0
propias = len([o for o in ops])
marca("la analítica del atacante cuenta sólo sus propias operaciones",
      n_a == propias, f"analítica={n_a}, listado propio={propias}, víctima={n_v}")

# ── Escalada de privilegios ──────────────────────────────────────────────
print("\n── escalada de privilegios ──")
for ruta in ("/admin/users", "/admin/stats", "/admin/feature-flags"):
    cod, _ = llama("GET", ruta, None, tok_a)
    marca(f"un usuario normal no entra en {ruta}", cod in (401, 403, 404), f"HTTP {cod}")

# Asignación masiva: ¿puede alguien hacerse premium o admin escribiéndolo?
# Se compara ANTES contra DESPUÉS, no contra un valor absoluto: estas cuentas
# ya son premium a propósito (el diario lo exige), así que mirar `is_premium`
# a secas daría un falso positivo. Lo que importa es si la escritura CAMBIA algo.
VIGILADOS = ("is_premium", "is_admin", "subscription_plan", "role",
             "subscription_end", "id", "email")
_, antes = llama("GET", "/auth/me", None, tok_a)
for campo, valor in (("is_premium", True), ("is_admin", True),
                     ("subscription_plan", "lifetime"), ("role", "admin"),
                     ("subscription_end", "2099-01-01T00:00:00Z"),
                     ("email", "atacante-cambiado@example.com")):
    llama("PUT", "/auth/profile", {"name": "atacante", campo: valor}, tok_a)
    llama("PUT", "/auth/me", {campo: valor}, tok_a)
_, despues = llama("GET", "/auth/me", None, tok_a)
movidos = [c for c in VIGILADOS if antes.get(c) != despues.get(c)]
marca("escribir campos privilegiados en el perfil no cambia nada", not movidos,
      f"cambian: {movidos}" if movidos else "ningún campo sensible se movió")

# ¿Puede crear una operación A NOMBRE DE OTRO usuario?
cod, t2 = llama("POST", "/performance/trades", {
    "symbol": "INYECTADA", "instrument_type": "stock", "side": "long",
    "entry_price": 10, "quantity": 1, "account_balance": 1000, "status": "open",
    "user_id": yo_v.get("id"),          # ← el id de la víctima
}, tok_a)
cod2, lista_v = llama("GET", "/performance/trades", None, tok_v)
ops_v = lista_v if isinstance(lista_v, list) else (lista_v or {}).get("trades", [])
inyectada = any(o.get("symbol") == "INYECTADA" for o in ops_v)
marca("no puede escribir una operación en el diario de otro", not inyectada,
      "aparecería en el listado de la víctima" if inyectada else "el user_id del payload se ignora")

# ── Confusión de tipo de token ───────────────────────────────────────────
print("\n── tokens ──")
cod, sesion = llama("POST", "/auth/login", {"email": ATACANTE[0], "password": ATACANTE[1]})
refresh = (sesion or {}).get("refresh_token")
if refresh:
    cod, _ = llama("GET", "/auth/me", None, refresh)
    marca("un refresh token no vale como token de acceso", cod == 401, f"HTTP {cod}")
else:
    marca("el refresh token no viaja en el cuerpo (sólo cookie)", True)

cod, _ = llama("GET", "/auth/me", None, "esto.no.es.un.token")
marca("un token inventado no entra", cod == 401, f"HTTP {cod}")
cod, _ = llama("GET", "/performance/trades", None, None)
marca("sin token no se listan operaciones", cod == 401, f"HTTP {cod}")

print("\n" + "=" * 78)
fallos = [n for n, ok, _ in resultados if not ok]
print(f"{len(resultados) - len(fallos)}/{len(resultados)} comprobaciones OK")
if fallos:
    print("\nFALLAN:")
    for f in fallos:
        print(f"  ❌ {f}")
raise SystemExit(1 if fallos else 0)
