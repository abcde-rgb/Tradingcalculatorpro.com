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
    """Token de la cuenta, creándola si hace falta. El entorno distingue un
    429 del limitador de una cuenta que no existe."""
    return cuenta(email, password)


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
    # Obligatorio al reemplazar uno existente, y en la segunda vuelta siempre lo
    # hay. Sin esto la respuesta es un 422 que parece un fallo y es versionado
    # funcionando como debe.
    "change_reason": "siembra de la sonda de autorización",
}, tok_v)
# La respuesta anida el plan bajo "plan"; leer `id` en la raíz daba None y
# la sonda reportaba «no se creó» sobre un HTTP 200.
objetos["plan de trading"] = (None, ((p or {}).get("plan") or {}).get("id"), cod)

for nombre, (_, oid, cod) in objetos.items():
    print(f"  {nombre:22} creado: {'sí' if oid else 'NO'}  (HTTP {cod})"
          + (f"  id={str(oid)[:8]}…" if oid else ""))

# Si algo no se creó, el bloque que lo usa se salta EN SILENCIO y la sonda sale
# en verde sin haber probado lo único que de verdad hay que demostrar. Eso ya
# pasó: sin premium, la operación daba 403 y las seis comprobaciones de acceso
# cruzado desaparecían del informe sin dejar rastro.
for _nombre, (_ruta, _oid, _cod) in objetos.items():
    marca(f"la víctima pudo crear: {_nombre}", bool(_oid), f"HTTP {_cod}")

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

    # Aquí había una segunda tanda contra `/journal/trades`, que era otra puerta
    # autenticada a ESTA MISMA operación: comprobaba que la puerta legada también
    # estuviera cerrada. Se retiró el 2026-08-22 (duplicaba `/performance/trades`
    # sobre la misma colección con otro esquema — BUG-039), así que ya no hay
    # cerrojo que comprobar: hay que comprobar que no hay puerta.
    #
    # No sirve pedirle un 404 a la ruta: FastAPI devuelve 404 tanto para un
    # camino que no existe como para una operación que no es tuya, así que un
    # 404 no distingue «retirada» de «bien protegida». Se mira el índice que el
    # propio servidor publica.
    caminos = set()
    try:
        # El esquema lo publica la aplicación en su RAÍZ, no bajo `/api`:
        # `api_router` cuelga de `/api`, pero `openapi_url` es de `app`.
        # Pedirlo a `{API}/openapi.json` daba 404 y la comprobación llevaba
        # tiempo en rojo por la URL, sin llegar a mirar ninguna ruta.
        raiz = API[:-4] if API.endswith("/api") else API
        with urllib.request.urlopen(f"{raiz}/openapi.json", timeout=15) as r:
            caminos = set(json.load(r).get("paths", {}))
    except (urllib.error.URLError, ValueError) as e:
        # Desde el 2026-08-28 `/openapi.json` sólo existe fuera de producción
        # (era el índice completo de la API servido a cualquiera). Contra un
        # despliegue real esto da 404 y es CORRECTO: el banco corre con
        # ENVIRONMENT=development, donde sigue publicado.
        marca("se puede leer el índice de rutas del servidor", False,
              f"{e} — ¿el backend corre con ENVIRONMENT=development?")
    if caminos:
        legadas = sorted(p for p in caminos if p.startswith("/api/journal/trades"))
        marca("la puerta legada al diario ya no existe", not legadas,
              ", ".join(legadas) if legadas else f"{len(caminos)} rutas publicadas")
        # Control: si esto fallara, el conjunto estaría vacío o mal leído y la
        # comprobación de arriba pasaría sin haber mirado nada.
        marca("y el índice sí contiene la ruta VIVA del diario",
              "/api/performance/trades" in caminos)

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
# Por CONTENIDO, no por número: el listado trae 100 filas por defecto y la
# analítica mira hasta 1000, así que igualar los dos contadores se rompe solo en
# cuanto la cuenta acumula historial. Lo que hay que demostrar es que el símbolo
# privado de la víctima no aparece y que la víctima sigue teniendo lo suyo.
texto_a = json.dumps(an_a or {}, ensure_ascii=False)
marca("la analítica del atacante no menciona la operación de la víctima",
      "SECRETO" not in texto_a, f"suyas={n_a}, de la víctima={n_v}")

# ── Escalada de privilegios ──────────────────────────────────────────────
print("\n── escalada de privilegios ──")
# Sólo rutas que EXISTEN, y exigiendo 401/403: un 404 sobre una ruta inexistente
# no demuestra que se deniegue el acceso, demuestra que no hay nada ahí.
# `/admin/stats` estaba en esta lista y no existe — su 404 se contaba como éxito.
for ruta in ("/admin/users", "/admin/feature-flags", "/admin/coupons"):
    cod, _ = llama("GET", ruta, None, tok_a)
    marca(f"un usuario normal no entra en {ruta}", cod in (401, 403),
          f"HTTP {cod}" + (" ← 404: ¿existe esa ruta?" if cod == 404 else ""))

# Asignación masiva: ¿puede alguien hacerse premium o admin escribiéndolo?
# Asignación masiva. La versión anterior escribía contra `PUT /auth/profile` y
# `PUT /auth/me`, que NO EXISTEN en este backend: los 404 dejaban el usuario
# intacto y la comprobación pasaba sin haber probado nada. Una prueba que sólo
# puede pasar es peor que ninguna, porque además certifica.
#
# Aquí se hacen dos cosas distintas:
#   a) dejar constancia de que no hay ruta de perfil — si algún día se añade,
#      esta comprobación se pone roja y obliga a escribir el test de verdad;
#   b) atacar las rutas que SÍ existen y SÍ escriben en `db.users`.
# `PUT /auth/me` sigue sin existir: para ésa se mantiene el centinela.
cod_me, _ = llama("PUT", "/auth/me", {"name": "x", "is_premium": True}, tok_a)
marca("PUT /auth/me sigue sin existir", cod_me in (404, 405),
      f"HTTP {cod_me}" + (" ← ¡AHORA EXISTE! hay que probar la asignación masiva"
                          if cod_me not in (404, 405) else ""))

# `/auth/profile` YA EXISTE, así que aquí abajo se prueba de verdad. Ver el
# bloque «perfil» después de CONTRABANDO.

# Las rutas reales por las que un usuario normal puede provocar una escritura en
# su propio documento. Se les cuelan campos privilegiados y se mide por
# DIFERENCIA antes/después: las cuentas de prueba ya son premium a propósito, así
# que mirar el valor absoluto daría un falso positivo.
VIGILADOS = ("is_premium", "is_admin", "subscription_plan", "role",
             "subscription_end", "id", "email")
_, antes = llama("GET", "/auth/me", None, tok_a)
CONTRABANDO = {"is_premium": True, "is_admin": True, "role": "admin",
               "subscription_plan": "lifetime",
               "subscription_end": "2099-01-01T00:00:00Z"}
# El nombre que la sonda escribe en el perfil: reconocible en la base si algún
# día hay que rastrear de dónde salió.
NOMBRE_SONDA = "Sonda Autorizacion"
# `POST /auth/change-password` queda FUERA a propósito: revoca todas las sesiones
# del usuario, así que la lectura de después devolvería un 401 y los siete campos
# vigilados «cambiarían» de golpe. Eso ya produjo una falsa alarma que parecía
# una escalada de privilegios en toda regla. Se prueba aparte, al final.
llama("POST", "/performance/trades",
      {"symbol": "AAPL", "instrument_type": "stock", "side": "long",
       "entry_price": 1, "quantity": 1, "account_balance": 100,
       "status": "open", **CONTRABANDO}, tok_a)
llama("POST", "/user-states/save",
      {"state_id": "contrabando", "state": {"x": 1}, **CONTRABANDO}, tok_a)
llama("POST", "/plan", {"name": "p", "change_reason": "x", **CONTRABANDO}, tok_a)
cod_d, despues = llama("GET", "/auth/me", None, tok_a)
# Guarda: si la lectura de después no es un usuario, comparar campo a campo dice
# que «han cambiado todos» y eso se lee como una escalada de privilegios. Antes
# de acusar hay que asegurarse de que se está comparando lo mismo.
if cod_d != 200 or not isinstance(despues, dict) or "id" not in despues:
    marca("la sesión sigue viva para poder comparar el después", False,
          f"HTTP {cod_d} — sin esto, la comparación no significa nada")
else:
    movidos = [c for c in VIGILADOS if (antes or {}).get(c) != despues.get(c)]
    marca("colar campos privilegiados en trades, user-states y plan no cambia nada",
          not movidos, f"cambian: {movidos}" if movidos else
          "ningún campo sensible se movió")

# ── Perfil: el centinela saltó, y esta es la prueba que pedía ───────────────
# Hasta el 2026-09-01 no había endpoint de perfil, y esto era un CENTINELA: se
# exigía 404/405 para que, el día que apareciera uno, la sonda se pusiera roja y
# obligara a escribir la prueba de verdad en vez de dejar el hueco. Ese día
# llegó —BUG-079 registró `POST` y `PUT /auth/profile`— y la sonda cumplió su
# trabajo: salió roja en la primera tanda con backend vivo (2026-09-04).
#
# Es la ruta de escritura sobre `db.users` más golosa que tiene un usuario
# normal: escribe en su PROPIA fila, que es donde viven `is_premium` e
# `is_admin`. Si construyera el `$set` desde el cuerpo recibido, cualquiera se
# haría admin con una línea de curl.
_, perfil_antes = llama("GET", "/auth/me", None, tok_a)
cod_pf, cuerpo_pf = llama("PUT", "/auth/profile",
                          {"name": NOMBRE_SONDA, **CONTRABANDO}, tok_a)
marca("PUT /auth/profile responde para poder medirlo", cod_pf == 200, f"HTTP {cod_pf}")
_, perfil_despues = llama("GET", "/auth/me", None, tok_a)
if cod_pf != 200 or not isinstance(perfil_despues, dict) or "id" not in perfil_despues:
    marca("se puede releer el usuario tras tocar el perfil", False,
          f"HTTP {cod_pf} — sin esto la comparación no significa nada")
else:
    movidos_pf = [c for c in VIGILADOS
                  if (perfil_antes or {}).get(c) != perfil_despues.get(c)]
    marca("PUT /auth/profile no deja colar campos privilegiados",
          not movidos_pf, f"cambian: {movidos_pf}" if movidos_pf else
          "ni is_premium ni is_admin ni el plan se movieron")
    # La otra mitad, y no es adorno: un endpoint que ignorase TODO el cuerpo
    # pasaría la comprobación de arriba con nota. Hay que ver que sí hace su
    # trabajo, o lo que se estaría certificando es que no funciona.
    marca("...y sí escribe lo que le toca (el nombre)",
          isinstance(cuerpo_pf, dict) and cuerpo_pf.get("name") == NOMBRE_SONDA,
          f"name={(cuerpo_pf or {}).get('name')!r}")

# Y ahora change-password, que sí revoca la sesión: se comprueba por separado y
# releyendo con una sesión NUEVA.
# Se relee justo antes: entre `antes` y aquí ha pasado el bloque anterior de
# escrituras, y comparar contra una foto vieja mezcla dos experimentos.
_, previo = llama("GET", "/auth/me", None, tok_a)
cod_cp, _ = llama("POST", "/auth/change-password",
                  {"current_password": ATACANTE[1], "new_password": ATACANTE[1],
                   **CONTRABANDO}, tok_a)
tok_a2 = entra(*ATACANTE)
cod_t, tras_cambio = llama("GET", "/auth/me", None, tok_a2)
# La misma guarda que arriba: si la relectura no es un usuario, comparar campo a
# campo dice «han cambiado todos» y eso se lee como una escalada de privilegios
# en toda regla. Ya produjo esa falsa alarma una vez.
if cod_cp != 200:
    marca("change-password responde para poder medirlo", False, f"HTTP {cod_cp}")
elif cod_t != 200 or not isinstance(tras_cambio, dict) or "id" not in tras_cambio:
    marca("la sesión nueva sirve para releer el usuario", False,
          f"HTTP {cod_t} — sin esto la comparación no significa nada")
else:
    movidos2 = [c for c in VIGILADOS if (previo or {}).get(c) != tras_cambio.get(c)]
    marca("colar campos privilegiados en change-password no cambia nada",
          not movidos2,
          f"cambian: {movidos2}" if movidos2 else "ninguno se movió")
    tok_a = tok_a2

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
