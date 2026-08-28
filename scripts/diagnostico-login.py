#!/usr/bin/env python3
"""Por qué una cuenta concreta no puede entrar — se mira la BASE, no el código.

Existe porque cuando el login falla el propietario se queda SIN forma de mirar:
todas las rutas de `/admin/*` exigen estar dentro y con 2FA, que es justamente
lo que está roto. Y el 401 de «Credenciales inválidas» es byte a byte el mismo
para una contraseña mala, un correo con otra caja y una fila duplicada, así que
la pantalla no distingue las tres causas y los logs de Cloud Run tampoco.

Es un INFORME, no una puerta de CI: no escribe nada en la base y no falla el
build. Se ejecuta a mano, contra la base de producción, cuando alguien no puede
entrar.

    DATABASE_URL='postgresql://…' python scripts/diagnostico-login.py correo@x.com
    DATABASE_URL='postgresql://…' python scripts/diagnostico-login.py correo@x.com --password 'la que tecleas'

Responde a las tres preguntas que el 401 esconde:

  1. ¿Está el backend nuevo DESPLEGADO? El índice `idx_users_email_lower` lo
     crea `init_pool` al arrancar, y sólo existe en el código posterior a
     BUG-070. Si el índice no está, ese código NUNCA ha arrancado contra esta
     base: el arreglo está en `main` y no en producción. Es la única señal de
     despliegue observable desde aquí, porque un despliegue desde código que
     ocurre solo no deja rastro en el repositorio.

  2. ¿Hay filas DUPLICADAS para el mismo correo? BUG-070 dejó el mismo correo
     dado de alta dos veces con distinta caja. Con duplicados vivos, la cuenta
     con los datos y el admin puede no ser la que responde al login.

  3. ¿A QUÉ FILA pertenece la contraseña que se teclea? Con `--password` se
     comprueba contra cada fila. Si casa con la duplicada vacía y no con la
     original, el problema no es la contraseña: es cuál de las dos cuentas
     contesta.

Lo que NO hace, a propósito: borrar, fusionar ni tocar la fila duplicada. Eso
decide qué datos sobreviven y no se hace desde un script de diagnóstico a las
tres de la mañana. Este informe dice qué borrar; borrarlo es otro paso.
"""
import argparse
import asyncio
import json
import os
import sys

try:
    import asyncpg
except ImportError:
    sys.exit("Falta asyncpg:  pip install asyncpg==0.30.0")


def _fmt(valor, si_falta="—"):
    if valor is None or valor == "":
        return si_falta
    if isinstance(valor, bool):
        return "sí" if valor else "no"
    return str(valor)


async def _indice_del_arreglo(conn) -> bool:
    """¿Existe `idx_users_email_lower`? Lo crea el `init_pool` de después de
    BUG-070, así que su ausencia prueba que ese código no ha arrancado nunca."""
    return await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM pg_indexes "
        "WHERE tablename = 'users' AND indexname = 'idx_users_email_lower')"
    )


async def _filas_del_correo(conn, correo: str):
    """Todas las filas que casan SIN distinguir mayúsculas, más antigua primero.

    Mismo criterio de orden que `_buscar_usuario_por_correo` en server.py. Se
    consulta con `LOWER(...) = LOWER(...)`, igual que el operador `$ieq` del
    shim: si aquí se usara igualdad exacta, el script no vería justamente las
    filas que causan el problema.
    """
    return await conn.fetch(
        "SELECT data FROM users WHERE LOWER((data->>'email')) = LOWER($1) "
        "ORDER BY (data->>'created_at') ASC NULLS LAST",
        correo,
    )


def _elegida_por_el_backend(filas, correo):
    """Replica `_buscar_usuario_por_correo`: primero la coincidencia EXACTA y,
    si no la hay, la más antigua. Se replica en vez de importarse porque
    `server.py` arrastra FastAPI, Stripe y el resto de la aplicación, y este
    script tiene que poder correr con sólo asyncpg instalado."""
    for i, u in enumerate(filas):
        if (u.get("email") or "") == correo:
            return i, "coincidencia exacta"
    return (0, "la más antigua (ninguna casa exactamente)") if filas else (None, None)


async def principal(correo: str, password: str | None):
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("Falta DATABASE_URL. No la pegues en el historial del shell:\n"
                 "  read -rs DATABASE_URL && export DATABASE_URL")

    correo = correo.strip()
    # Nunca se imprime `url`: lleva la contraseña de la base dentro.
    conn = await asyncpg.connect(url)
    try:
        print("═" * 72)
        print(f"  Diagnóstico de acceso — {correo}")
        print("═" * 72)

        tiene_indice = await _indice_del_arreglo(conn)
        print("\n1. ¿Está desplegado el backend con el arreglo de BUG-070?")
        if tiene_indice:
            print("   ✅ `idx_users_email_lower` existe: el código posterior a BUG-070")
            print("      ha arrancado contra esta base. El backend está al día.")
        else:
            print("   🔴 `idx_users_email_lower` NO existe.")
            print("      El backend que corre en producción es ANTERIOR al arreglo.")
            print("      Ahí está el fallo: el frontend ya manda el correo en")
            print("      minúsculas, así que contra un backend viejo una fila")
            print("      guardada con mayúscula ya no casa NUNCA — el arreglo a")
            print("      medias deja el login peor que antes. Comprobar la revisión:")
            print("        gcloud run services describe tradingcalculator-api \\")
            print("          --region=us-east1 \\")
            print("          --format='value(spec.template.spec.containers[0].image)'")

        filas = [json.loads(r["data"]) if isinstance(r["data"], str) else r["data"]
                 for r in await _filas_del_correo(conn, correo)]

        print(f"\n2. Filas de `users` para ese correo: {len(filas)}")
        if not filas:
            print("   🔴 Ninguna. Esa dirección no existe en la base — con ninguna")
            print("      caja. El 401 es correcto: no hay cuenta que abrir.")
            return
        if len(filas) > 1:
            print("   🔴 DUPLICADAS. Es el daño de BUG-070 ya hecho en producción.")
            print("      Mientras existan, la cuenta que contesta al login puede no")
            print("      ser la que tiene tus datos y el admin.")

        idx_elegida, motivo = _elegida_por_el_backend(filas, correo)
        for i, u in enumerate(filas):
            marca = "  ← ESTA responde al login" if i == idx_elegida else ""
            print(f"\n   ── Fila {i + 1}{marca}")
            print(f"      correo guardado : {_fmt(u.get('email'))!r}")
            if (u.get("email") or "") != correo:
                print(f"                        (NO es igual a lo tecleado: distinta caja)")
            print(f"      id              : {_fmt(u.get('id'))}")
            print(f"      creada          : {_fmt(u.get('created_at'), 'sin fecha')}")
            print(f"      admin           : {_fmt(bool(u.get('is_admin')))}")
            print(f"      2FA (TOTP)      : {_fmt(bool(u.get('totp_enabled')))}")
            print(f"      método de alta  : {_fmt(u.get('auth_provider'), 'password')}")
            print(f"      correo validado : {_fmt(bool(u.get('email_verified')))}")
            print(f"      plan            : {_fmt(u.get('subscription_plan'), 'ninguno')}")
            tiene_pw = bool(u.get("password"))
            print(f"      contraseña      : {'guardada' if tiene_pw else '🔴 NO tiene'}")
            if not tiene_pw:
                print("                        Cuenta creada con Google o passkey: entrar")
                print("                        con contraseña dará 401 siempre. Usa el")
                print("                        botón de Google, o pide un reset.")

        print(f"\n   El backend elegiría la fila {idx_elegida + 1} — {motivo}.")

        if password:
            print("\n3. ¿A qué fila pertenece la contraseña tecleada?")
            try:
                import bcrypt
            except ImportError:
                print("   (falta bcrypt:  pip install bcrypt==4.2.1)")
                return
            casa_en = []
            for i, u in enumerate(filas):
                hash_ = u.get("password")
                if not hash_:
                    continue
                try:
                    if bcrypt.checkpw(password.encode(), hash_.encode()):
                        casa_en.append(i)
                except ValueError:
                    print(f"   Fila {i + 1}: el hash guardado no es bcrypt válido.")
            if not casa_en:
                print("   🔴 No casa con NINGUNA fila. La contraseña es distinta de la")
                print("      guardada: el arreglo del correo no puede salvar esto.")
                print("      Sale por «he olvidado mi contraseña».")
            else:
                for i in casa_en:
                    print(f"   ✅ Casa con la fila {i + 1}.")
                if idx_elegida not in casa_en:
                    print(f"   🔴 Pero el login contesta con la fila {idx_elegida + 1}, que")
                    print("      tiene OTRA contraseña. De ahí el 401 con la contraseña")
                    print("      correcta: no falla la clave, falla CUÁL de las dos")
                    print("      cuentas duplicadas responde. Hay que borrar la que")
                    print("      sobra — mira arriba cuál tiene el admin y el plan.")
                else:
                    print("   ✅ Y es la fila que el login elige. Por esta vía la entrada")
                    print("      debería funcionar: si aun así da 401, el backend que")
                    print("      corre no es el de este código (mira el punto 1).")
    finally:
        await conn.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("correo", help="la dirección con la que se intenta entrar")
    p.add_argument("--password", help="opcional: comprueba contra qué fila casa")
    a = p.parse_args()
    asyncio.run(principal(a.correo, a.password))
