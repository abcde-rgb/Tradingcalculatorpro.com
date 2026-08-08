#!/usr/bin/env python3
"""Lo compartido por las sondas de API.

Tres cosas que conviene tener escritas una sola vez: cómo se llama al backend
sin que un error HTTP corte la sonda (el código de error ES el dato que se
está midiendo), cómo se consulta Postgres directamente, y cómo se consigue una
cuenta de prueba cuando el limitador de registros ya se ha agotado.
"""
from __future__ import annotations

import json
import os
import subprocess
import urllib.error
import urllib.request
from typing import Any, Optional

API = os.environ.get("QA_API", "http://127.0.0.1:8080") + "/api"
BD = os.environ.get("QA_BD", "trading_dev")
BD_USUARIO = os.environ.get("QA_BD_USUARIO", os.environ.get("USER", "root"))


def llama(metodo: str, ruta: str, payload: Any = None,
          tok: Optional[str] = None, timeout: int = 60) -> tuple[int, Any]:
    """Devuelve (código, cuerpo). Nunca lanza.

    Una sonda de autorización mide CÓDIGOS: un 403 no es una excepción que
    interrumpa la prueba, es el resultado que se está comprobando. Que esto no
    lance es lo que permite escribir `assert cod in (403, 404)` en vez de
    envolver cada llamada en un try.
    """
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(API + ruta, data=data, method=metodo,
                                 headers={"Content-Type": "application/json"})
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            cuerpo = r.read().decode()
            return r.status, (json.loads(cuerpo) if cuerpo else None)
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode()
        try:
            return e.code, json.loads(cuerpo)
        except Exception:
            return e.code, cuerpo[:300]
    except Exception as e:                      # red caída, backend parado
        return 0, str(e)


def sql(consulta: str) -> str:
    """Consulta directa a Postgres.

    Las sondas de datos comprueban contra la BASE DE DATOS, no contra lo que la
    API dice haber hecho: «el borrado responde 200» y «no queda ninguna fila»
    son afirmaciones distintas, y sólo la segunda es la que importa.
    """
    r = subprocess.run(["psql", "-U", BD_USUARIO, "-d", BD, "-tAc", consulta],
                       capture_output=True, text=True)
    if r.returncode != 0:
        # Sin esto, un psql que falla devuelve "" y se lee como «0 filas»: la
        # comprobación de que el borrado no dejó restos pasaría SIEMPRE, incluso
        # con la base de datos caída. Un banco de pruebas que no puede consultar
        # tiene que pararse, no dar por bueno lo que no ha podido mirar.
        raise SystemExit(f"psql falló ({r.returncode}) en: {consulta[:80]}\n"
                         f"{r.stderr.strip()[:300]}")
    return r.stdout.strip()


def tablas_con_user_id() -> list[str]:
    """Toda tabla del shim que guarde un `user_id`, descubierta de la BD.

    A propósito no es una lista escrita a mano: mantener listas de tablas a mano
    es exactamente lo que produjo el hueco G-15 (una colección nueva que no
    entraba ni en el borrado de cuenta ni en el export). Una sonda que repitiera
    esa lista heredaría el mismo punto ciego.
    """
    nombres = sql("SELECT tablename FROM pg_tables "
                  "WHERE schemaname='public' ORDER BY 1").split("\n")
    salida = []
    for t in (n.strip() for n in nombres if n.strip()):
        n = sql(f"SELECT count(*) FROM {t} WHERE data ? 'user_id'")
        if n and int(n) > 0:
            salida.append(t)
    return salida


def da_premium(uid: str) -> None:
    """El diario está detrás del muro de pago. Sin esto, sembrar una operación
    devuelve 403 y la sonda mide un vacío creyendo que mide un fallo."""
    sql(f"""UPDATE users SET data = jsonb_set(
                jsonb_set(data,'{{is_premium}}','true'),
                '{{subscription_plan}}','"lifetime"')
            WHERE data->>'id' = '{uid}'""")


def cuenta(email: str, password: str, *, clon_de: Optional[str] = None,
           clon_password: Optional[str] = None) -> str:
    """Token de una cuenta de prueba. Login → registro → clonado por SQL.

    `POST /auth/register` está limitado a 3/hora, y las sondas que borran la
    cuenta necesitan una nueva en cada vuelta. Cuando el límite se agota se
    clona una cuenta hermana por SQL: mismo hash de contraseña, id y correo
    nuevos. Es un apaño de banco de pruebas, no una puerta trasera — hace falta
    acceso directo a la base de datos, que ya implica tenerlo todo.
    """
    cod, sesion = llama("POST", "/auth/login", {"email": email, "password": password})
    if cod == 200:
        return sesion["token"]
    if cod == 429:
        # Se dice por su nombre. Si no, el flujo cae al registro, que responde
        # «no se pudo completar el registro» porque la cuenta ya existe, y el
        # mensaje que llega no tiene nada que ver con la causa. Ha despistado
        # cinco veces en una sola sesión.
        raise SystemExit(f"⏸  límite de login alcanzado (10/min) para {email}. "
                         "Espera un minuto y repite: el limitador funciona, que "
                         "también es una de las cosas a comprobar.")

    cod, sesion = llama("POST", "/auth/register",
                        {"email": email, "password": password,
                         "name": email.split("@")[0]})
    if cod in (200, 201):
        return sesion["token"]

    if not clon_de:
        raise SystemExit(f"no se pudo preparar {email}: HTTP {cod} {sesion}")
    print(f"  (registro no disponible: HTTP {cod} — clonando de {clon_de})")
    sql(f"""INSERT INTO users (_key, data)
            SELECT gen_random_uuid()::text,
                   jsonb_set(jsonb_set(data, '{{id}}',
                             to_jsonb(gen_random_uuid()::text)),
                             '{{email}}', '"{email}"')
            FROM users WHERE data->>'email' = '{clon_de}' LIMIT 1""")
    # La fila clonada conserva el hash del DONANTE, así que se entra con SU
    # contraseña, no con la pedida. Intentarlo con la pedida es lo que hacía que
    # este camino no funcionara nunca y el escape al límite fuera decorativo.
    cod, sesion = llama("POST", "/auth/login",
                        {"email": email, "password": clon_password or password})
    if cod != 200:
        raise SystemExit(
            f"el clonado no sirvió para entrar como {email}: HTTP {cod}. "
            f"La fila lleva el hash de {clon_de}; pasa `clon_password` con la "
            "contraseña de esa cuenta.")
    return sesion["token"]


class Marcador:
    """Resultados con el mismo formato que las sondas de navegador."""

    def __init__(self) -> None:
        self.resultados: list[tuple[str, bool]] = []

    def __call__(self, nombre: str, ok: bool, detalle: str = "") -> bool:
        ok = bool(ok)
        self.resultados.append((nombre, ok))
        print(f"  {'✅' if ok else '❌'} {nombre}" + (f" — {detalle}" if detalle else ""))
        return ok

    def resumen(self) -> bool:
        fallos = [n for n, ok in self.resultados if not ok]
        print(f"\n{len(self.resultados) - len(fallos)}/{len(self.resultados)} "
              "comprobaciones OK")
        if fallos:
            print("\nFALLAN:")
            for f in fallos:
                print(f"  ❌ {f}")
        return not fallos
