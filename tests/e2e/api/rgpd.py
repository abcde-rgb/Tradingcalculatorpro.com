#!/usr/bin/env python3
"""RGPD: ¿el export se lleva TODO y el borrado no deja nada?

`CLAUDE.md` documenta el hueco G-15: `trading_plans` faltaba en `delete_account`,
en la purga por retención y en `/auth/my-data`. El código de hoy dice que se
arregló derivando las tres listas de una tupla única. Esto no lo lee: lo
comprueba contra Postgres, que es el único sitio donde la respuesta es un hecho.

Dos exigencias, y la segunda es la que se olvida:
  1. borrar la cuenta no deja ninguna fila con ese `user_id` en ninguna tabla;
  2. el export incluye TODO lo que el borrado destruye. Exportar menos de lo que
     se borra es exactamente el agujero que el artículo 20 existe para cerrar.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import (  # noqa: E402
    API, Marcador, cuenta, da_premium, llama, sql, tablas_con_user_id,
)
import json
import subprocess
import urllib.error
import urllib.request

CUENTA = ("victima@example.com", "VictimaQa2026!")

resultados = []


def marca(nombre, ok, detalle=""):
    resultados.append(ok)
    print(f"  {'✅' if ok else '❌'} {nombre}" + (f" — {detalle}" if detalle else ""))







print("\n" + "=" * 78)
print("RGPD — el export se lo lleva todo, el borrado no deja nada")
print("=" * 78 + "\n")

def asegura_cuenta():
    """Deja la cuenta de prueba lista. Tres caminos, en orden de preferencia.

    La prueba BORRA la cuenta —es su objeto— así que cada vuelta necesita una
    nueva, y `POST /auth/register` está limitado a 3/hora. Cuando ese límite se
    agota, se clona por SQL desde una cuenta hermana: mismo hash de contraseña,
    id y correo nuevos. Es un apaño de banco de pruebas, no una puerta trasera —
    requiere acceso directo a la base de datos.
    """

    cod, sesion = llama("POST", "/auth/login", {"email": CUENTA[0], "password": CUENTA[1]})
    if cod == 200:
        return sesion["token"]
    cod, sesion = llama("POST", "/auth/register",
                        {"email": CUENTA[0], "password": CUENTA[1], "name": "victima"})
    if cod in (200, 201):
        return sesion["token"]
    print(f"  (registro no disponible: HTTP {cod} — clonando por SQL)")
    sql(f"""INSERT INTO users (_key, data)
            SELECT gen_random_uuid()::text,
                   jsonb_set(jsonb_set(data, '{{id}}', to_jsonb(gen_random_uuid()::text)),
                             '{{email}}', '"{CUENTA[0]}"')
            FROM users WHERE data->>'email' = 'atacante@example.com' LIMIT 1""")
    cod, sesion = llama("POST", "/auth/login",
                        {"email": CUENTA[0], "password": "AtacanteQa2026!"})
    if cod != 200:
        raise SystemExit(f"no se pudo preparar la cuenta de prueba: {cod} {sesion}")
    return sesion["token"]


tok = asegura_cuenta()
uid = llama("GET", "/auth/me", None, tok)[1]["id"]
# El diario está detrás del muro de pago: sin premium la siembra de la operación
# se queda en un 403 y la prueba mediría un export al que le falta el dato más
# importante — pareciendo un fallo del export.
sql(f"""UPDATE users SET data = jsonb_set(jsonb_set(data,'{{is_premium}}','true'),
        '{{subscription_plan}}','"lifetime"') WHERE data->>'id' = '{uid}'""")
print(f"cuenta de prueba: {CUENTA[0]}  id={uid}  (premium concedido para la siembra)")

# ── 0 · Sembrar. La prueba tiene que crear lo que luego exige ────────────
print("\n── se siembran datos de cada tipo ──")
llama("POST", "/performance/trades", {
    "symbol": "SECRETO", "instrument_type": "cfd", "side": "long",
    "entry_price": 100, "quantity": 1, "leverage": 5, "account_balance": 10000,
    "sl": 95, "tp": 110, "status": "open", "notes": "dato privado de la victima"}, tok)
llama("POST", "/calculations", {"type": "position-size",
                                "inputs": {"balance": 10000}, "results": {"units": 3}}, tok)
llama("POST", "/alerts", {"symbol": "BTCUSDT", "targetPrice": 90000, "condition": "above"}, tok)
llama("POST", "/user-states/save", {"state_id": "borrador-privado",
                                    "state": {"nota": "solo para la victima"}}, tok)
cod, _ = llama("POST", "/plan", {"name": "Plan privado de la victima",
                                 "risk": {"max_risk_pct_per_trade": 1.0, "min_rr": 2.0},
                                 "change_reason": "siembra de la prueba"}, tok)
print(f"  sembrado (plan: HTTP {cod})")

# ── 1 · Qué tiene esta cuenta, según Postgres ────────────────────────────
print("── lo que hay en la base de datos ANTES ──")
antes = {}
for t in tablas_con_user_id():
    n = sql(f"SELECT count(*) FROM {t} WHERE data->>'user_id' = '{uid}'")
    if n and int(n) > 0:
        antes[t] = int(n)
        print(f"  {t:28} {n} fila(s)")
if not antes:
    raise SystemExit("la cuenta no tiene datos: la prueba no mediría nada")

# ── 2 · El export ────────────────────────────────────────────────────────
print("\n── GET /auth/my-data ──")
cod, export = llama("GET", "/auth/my-data", None, tok)
if cod == 429:
    # 5/hora. Igual que el borrado: agotar el límite no es un fallo del export.
    raise SystemExit("⏸  límite de 5 exports/hora alcanzado; repetir en una hora "
                     "(el limitador funciona, que también se estaba comprobando)")
marca("el export responde", cod == 200, f"HTTP {cod}")
texto = json.dumps(export or {}, ensure_ascii=False)
claves = list((export or {}).keys())
print(f"  claves del export: {claves}")

# Lo importante no son las claves: es que el CONTENIDO esté.
marca("el export incluye la operación privada", "SECRETO" in texto)
marca("el export incluye el plan de trading", "Plan privado de la victima" in texto,
      "es el hueco G-15 documentado en CLAUDE.md")
marca("el export incluye el estado guardado", "solo para la victima" in texto)
# La contraseña se busca como HASH y como CLAVE, no como subcadena: el export
# contiene legítimamente `"auth_provider": "password"`, que es el método de
# acceso, no la credencial. Buscar "password" a secas da un falso positivo.
import re as _re
hashes = _re.findall(r"\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}|\$argon2", texto)
marca("el export no lleva el hash de la contraseña", not hashes,
      f"{len(hashes)} hash(es)" if hashes else "ninguno")
marca("el perfil exportado no tiene clave `password`",
      "password" not in ((export or {}).get("profile") or {}),
      f"claves: {sorted(((export or {}).get('profile') or {}).keys())}")

# Artefactos de seguridad: tokens y revocaciones. El contrato del proyecto es
# que se BORREN con la cuenta y NO se exporten nunca — mandárselos al usuario en
# un JSON sería una regresión de seguridad, no portabilidad. Así que aquí se
# exige justo lo contrario que para los datos: ausencia en el export.
# Espejo de `_SECURITY_ARTEFACT_COLLECTIONS` en server.py: se borran con la
# cuenta y NO se exportan nunca.
ARTEFACTOS = ("usage_events", "email_verification_tokens", "password_resets",
              "password_reset_tokens", "user_revocations", "referral_redemptions",
              "sms_log")
# Tablas que SÍ se exportan pero bajo otra clave, así que buscarlas por su nombre
# de tabla da un falso negativo: facturación viaja como `payments`, y la copia de
# la migración va dentro de `trades` (duplicarla no es portabilidad).
OTRO_NOMBRE = {"transactions": "payments", "payment_transactions": "payments",
               "trades_migration_backup": "trades"}
filtrados = [t for t in ARTEFACTOS if t in (export or {})]
marca("los artefactos de seguridad NO se exportan", not filtrados,
      f"se filtran: {filtrados}" if filtrados else "ninguno viaja en el JSON")

# Y de los datos de verdad, ninguno puede quedarse fuera.
sin_exportar = [t for t in antes
                if t not in ("users",) and t not in ARTEFACTOS
                and OTRO_NOMBRE.get(t, t) not in (export or {})]
marca("ninguna tabla de DATOS se queda fuera del export", not sin_exportar,
      f"faltan: {sin_exportar}" if sin_exportar else "todas presentes")

# ── 3 · El borrado ───────────────────────────────────────────────────────
print("\n── DELETE /auth/account ──")
cod, resp = llama("DELETE", "/auth/account", None, tok)
if cod == 429:
    # Borrar cuenta está limitado a 3/hora. Agotarlo NO es un fallo del borrado:
    # es el limitador haciendo su trabajo. Se dice y se para, porque medir el
    # «después» sin que el borrado haya corrido daría restos falsos y un informe
    # que acusa al producto de algo que no ha pasado.
    print("  ⏸  límite de 3 borrados/hora alcanzado: la mitad del borrado no se")
    print("      puede medir en esta vuelta (el limitador funciona, que también")
    print("      era una de las cosas a comprobar). Repetir dentro de una hora.")
    print(f"\n{len([r for r in resultados if r])}/{len(resultados)} comprobaciones OK "
          f"(sólo la parte de export)")
    raise SystemExit(0 if all(resultados) else 1)
marca("el borrado responde", cod == 200, f"HTTP {cod} {resp if cod != 200 else ''}")

print("\n── lo que queda en la base de datos DESPUÉS ──")
restos = {}
for t in antes:
    n = sql(f"SELECT count(*) FROM {t} WHERE data->>'user_id' = '{uid}'")
    n = int(n or 0)
    print(f"  {t:28} {antes[t]} → {n}" + ("   ← QUEDAN RESTOS" if n else ""))
    if n:
        restos[t] = n

marca("no queda ninguna fila del usuario en ninguna tabla", not restos,
      f"restos: {restos}" if restos else f"{sum(antes.values())} filas borradas de "
      f"{len(antes)} tablas")

quedan_users = sql(f"SELECT count(*) FROM users WHERE data->>'id' = '{uid}'")
marca("la propia cuenta ya no existe", int(quedan_users or 0) == 0)

# Comprobado contra la BASE DE DATOS y no por login: si la cuenta se preparó
# clonando, lleva el hash de la donante y un 401 significaría «contraseña
# equivocada», no «cuenta borrada». Dos causas para el mismo código.
quedan_email = sql(f"SELECT count(*) FROM users WHERE data->>'email' = '{CUENTA[0]}'")
marca("no queda ninguna fila de usuario con ese correo", int(quedan_email or 0) == 0,
      f"{quedan_email} fila(s)")

print("\n" + "=" * 78)
fallos = len([r for r in resultados if not r])
print(f"{len(resultados) - fallos}/{len(resultados)} comprobaciones OK")
raise SystemExit(1 if fallos else 0)
