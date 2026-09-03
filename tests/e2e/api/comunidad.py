#!/usr/bin/env python3
"""Sonda del foro contra el backend VIVO y PostgreSQL de verdad.

Los tests unitarios de `backend/tests/test_forum_*.py` corren contra un doble
de base de datos: prueban la lógica, no la traducción a SQL. Esta sonda prueba
lo otro — que el shim guarda y consulta lo que el módulo cree, que las tablas
existen (el shim NO las autocrea) y que la privacidad se sostiene sobre la
respuesta HTTP real, no sobre un diccionario en memoria.

Lo que mide, en orden:

  1. Las tablas del foro existen. Sin ellas la primera consulta revienta.
  2. Publicar exige seudónimo, y el seudónimo se puede elegir.
  3. La respuesta HTTP **no contiene el correo, el nombre ni el id** de nadie.
     Se comprueba sobre el JSON crudo, buscando las cadenas literales.
  4. El R:R de un análisis sin stop sale `null`, no 0 — contra la base de datos.
  5. El orden por «me gusta» es numérico (10 antes que 9) atravesando el shim.
  6. Una cuenta no puede borrar el hilo de otra.
  7. Seguir a alguien sube sus hilos en el listado.
  8. El RGPD: al borrar la cuenta no queda ni una fila del foro.

Uso:  python3 tests/e2e/api/comunidad.py     (con el banco en pie)
"""
from __future__ import annotations

import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from entorno import API, cuenta, llama, sql  # noqa: E402

FALLOS: list[str] = []
SELLO = str(int(time.time()))


def comprueba(nombre: str, condicion: bool, detalle: str = "") -> None:
    if condicion:
        print(f"  ✓ {nombre}")
    else:
        print(f"  ✗ {nombre}" + (f" — {detalle}" if detalle else ""))
        FALLOS.append(nombre)


def main() -> int:
    print(f"Sonda de la comunidad contra {API}\n")

    # ── 1 · Las tablas existen ─────────────────────────────────────────────
    tablas = set(sql("SELECT tablename FROM pg_tables WHERE schemaname='public'").split("\n"))
    esperadas = {"forum_profiles", "forum_threads", "forum_posts", "forum_follows",
                 "forum_reactions", "forum_reports", "forum_views", "forum_translations"}
    faltan = esperadas - {t.strip() for t in tablas}
    comprueba("las ocho tablas del foro existen", not faltan, f"faltan {sorted(faltan)}")

    cod, meta = llama("GET", "/forum/meta")
    comprueba("GET /forum/meta responde", cod == 200, f"HTTP {cod}")

    # ── 2 · Dos cuentas con seudónimo ──────────────────────────────────────
    correo_a = f"foro_a_{SELLO}@example.com"
    correo_b = f"foro_b_{SELLO}@example.com"
    tok_a = cuenta(correo_a, "Pruebas-1234", clon_de="qa@example.com",
                   clon_password="Pruebas-1234")
    tok_b = cuenta(correo_b, "Pruebas-1234", clon_de="qa@example.com",
                   clon_password="Pruebas-1234")

    hilo_min = {"title": "Un titulo suficientemente largo para pasar",
                "body": "Un cuerpo con longitud mas que suficiente para el minimo exigido."}
    cod, _ = llama("POST", "/forum/threads", hilo_min, tok=tok_a)
    comprueba("publicar sin seudonimo devuelve 409", cod == 409, f"HTTP {cod}")

    handle_a = f"alfa_{SELLO}"[:24]
    handle_b = f"beta_{SELLO}"[:24]
    cod, _ = llama("PUT", "/forum/profile", {"handle": handle_a}, tok=tok_a)
    comprueba("se puede elegir seudonimo", cod == 200, f"HTTP {cod}")
    llama("PUT", "/forum/profile", {"handle": handle_b}, tok=tok_b)

    cod, _ = llama("PUT", "/forum/profile", {"handle": "moderador"}, tok=tok_b)
    comprueba("un seudonimo reservado se rechaza", cod == 400, f"HTTP {cod}")

    cod, _ = llama("PUT", "/forum/profile", {"handle": handle_a}, tok=tok_b)
    comprueba("un seudonimo ocupado se rechaza", cod == 409, f"HTTP {cod}")

    # ── 3 · Publicar y NO filtrar identidad ────────────────────────────────
    cod, r = llama("POST", "/forum/threads", {
        **hilo_min,
        "category": "analisis", "product": "forex", "symbol": "EURUSD",
        "analysis": {"symbol": "EURUSD", "side": "long", "entry": 1.0842,
                     "target": 1.0910},          # sin stop, a propósito
    }, tok=tok_a)
    if cod == 429:
        # Se dice por su nombre. Antes reventaba con un KeyError cincuenta
        # líneas más abajo y el error que llegaba no tenía nada que ver con la
        # causa. El límite del foro se cuenta POR CUENTA, así que llegar aquí
        # significa que esta misma cuenta ya publicó diez veces esta hora.
        raise SystemExit("⏸  límite de publicación alcanzado (10/hora por cuenta). "
                         "Espera o usa otra cuenta: el limitador funciona, que "
                         "también es una de las cosas a comprobar.")
    comprueba("publicar con analisis responde 200", cod == 200, f"HTTP {cod} {r}")
    hilo_id = (r or {}).get("thread", {}).get("id")
    if not hilo_id:
        raise SystemExit(f"no se pudo crear el hilo base: HTTP {cod} {r}")

    cod, detalle = llama("GET", f"/forum/threads/{hilo_id}")
    crudo = json.dumps(detalle, ensure_ascii=False)
    uid_a = sql(f"SELECT data->>'id' FROM users WHERE data->>'email' = '{correo_a}'")
    comprueba("el JSON no lleva el correo", correo_a not in crudo)
    comprueba("el JSON no lleva el user_id", bool(uid_a) and uid_a not in crudo)
    comprueba("el JSON no lleva la clave author_id", '"author_id"' not in crudo)
    comprueba("el seudonimo si viaja", handle_a in crudo)

    # ── 4 · El R:R sin stop es null, no 0 ──────────────────────────────────
    guardado = sql(f"SELECT data->'analysis'->>'rr' FROM forum_threads "
                   f"WHERE data->>'id' = '{hilo_id}'")
    motivo = sql(f"SELECT data->'analysis'->>'rrUndefinedReason' FROM forum_threads "
                 f"WHERE data->>'id' = '{hilo_id}'")
    comprueba("el R:R sin stop se guarda como null (no 0)", guardado == "",
              f"la base de datos dice {guardado!r}")
    comprueba("y con su motivo escrito", motivo == "sin_stop", f"dice {motivo!r}")
    api_rr = detalle["thread"]["analysis"]["rr"]
    comprueba("la API tambien lo devuelve como null", api_rr is None, f"devuelve {api_rr!r}")

    # ── 5 · Orden numerico atravesando el shim ─────────────────────────────
    # El filtro va por un SÍMBOLO único de esta ejecución, no por categoría: con
    # una categoría compartida los hilos de la vuelta anterior se cuelan en el
    # listado y el orden medido deja de ser el de estos tres. Pasó, y el fallo
    # parecía del código.
    simbolo_orden = f"ORD{SELLO}"[:24]
    for i, likes in enumerate((9, 10, 100)):
        cod, r = llama("POST", "/forum/threads", {
            "title": f"Orden numero {i} con titulo suficientemente largo",
            "body": "Cuerpo de prueba con longitud mas que suficiente para el minimo.",
            "category": "producto", "symbol": simbolo_orden,
        }, tok=tok_a)
        hid = r["thread"]["id"]
        sql(f"UPDATE forum_threads SET data = jsonb_set(data,'{{likes}}','{likes}') "
            f"WHERE data->>'id' = '{hid}'")
    cod, lista = llama("GET", f"/forum/threads?symbol={simbolo_orden}&order=likes")
    orden = [h["likes"] for h in (lista or {}).get("threads", [])]
    comprueba("orden por me gusta es numerico (100, 10, 9)", orden == [100, 10, 9],
              f"devuelve {orden}")

    # ── 6 · Permisos entre cuentas ─────────────────────────────────────────
    cod, _ = llama("DELETE", f"/forum/threads/{hilo_id}", tok=tok_b)
    comprueba("otra cuenta no puede borrar el hilo", cod == 404, f"HTTP {cod}")
    cod, _ = llama("GET", f"/forum/threads/{hilo_id}")
    comprueba("y el hilo sigue estando", cod == 200, f"HTTP {cod}")

    cod, _ = llama("POST", f"/forum/threads/{hilo_id}/like", tok=tok_a)
    comprueba("no se puede votar el hilo propio", cod == 400, f"HTTP {cod}")
    for _ in range(3):
        llama("POST", f"/forum/threads/{hilo_id}/like", tok=tok_b)
    votos = sql(f"SELECT data->>'likes' FROM forum_threads WHERE data->>'id' = '{hilo_id}'")
    comprueba("tres pulsaciones cuentan un voto", votos == "1", f"dice {votos!r}")

    cod, r = llama("POST", f"/forum/threads/{hilo_id}/replies",
                   {"body": "Una respuesta desde la otra cuenta."}, tok=tok_b)
    comprueba("se puede responder", cod == 200, f"HTTP {cod} {r}")
    respuestas = sql(f"SELECT data->>'replies' FROM forum_threads WHERE data->>'id' = '{hilo_id}'")
    comprueba("el contador de respuestas sube", respuestas == "1", f"dice {respuestas!r}")

    # ── 7 · Seguir sube los hilos de esa persona ───────────────────────────
    cod, _ = llama("POST", f"/forum/members/{handle_a}/follow", tok=tok_b)
    comprueba("se puede seguir a alguien", cod == 200, f"HTTP {cod}")
    cod, lista = llama("GET", "/forum/threads?following=true", tok=tok_b)
    autores = {h["author"]["handle"] for h in (lista or {}).get("threads", [])}
    comprueba("el filtro de seguidos devuelve solo sus hilos",
              autores == {handle_a}, f"devuelve {autores}")
    cod, _ = llama("GET", "/forum/threads?following=true")
    comprueba("el filtro de seguidos exige sesion", cod == 401, f"HTTP {cod}")

    # ── 8 · RGPD: borrar la cuenta no deja restos ──────────────────────────
    antes = sql(f"SELECT count(*) FROM forum_threads WHERE data->>'author_id' = '{uid_a}'")
    comprueba("la cuenta A tiene hilos antes de borrarse", int(antes or 0) > 0, antes)
    cod, r = llama("DELETE", "/auth/account", {"password": "Pruebas-1234"}, tok=tok_a)
    if cod not in (200, 204):
        print(f"  ! el borrado de cuenta devolvio HTTP {cod} ({r}); se comprueba igual")
    restos = {}
    for tabla in ("forum_threads", "forum_posts", "forum_profiles",
                  "forum_follows", "forum_reactions", "forum_reports"):
        n = sql(f"SELECT count(*) FROM {tabla} WHERE data->>'user_id' = '{uid_a}' "
                f"OR data->>'author_id' = '{uid_a}' OR data->>'follower_id' = '{uid_a}' "
                f"OR data->>'followee_id' = '{uid_a}'")
        if int(n or 0):
            restos[tabla] = n
    comprueba("borrar la cuenta no deja ni una fila del foro", not restos, str(restos))

    print()
    if FALLOS:
        print(f"✗ {len(FALLOS)} comprobacion(es) fallidas: {FALLOS}")
        return 1
    print("✓ la comunidad se comporta contra backend y PostgreSQL reales")
    return 0


if __name__ == "__main__":
    sys.exit(main())
