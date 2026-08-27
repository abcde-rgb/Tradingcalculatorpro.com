#!/usr/bin/env python3
"""Los raíles de cobro, contra la aplicación viva.

Qué demuestra, con Postgres y el backend de verdad:

  * que **cada pasarela se puede apagar desde admin** y que apagarla cierra el
    checkout en el servidor, no sólo esconde el botón;
  * que **Kunfupay cobra los dos tipos de plan**: la suscripción (mensual,
    trimestral, anual) y el pago único (De Por Vida);
  * que el **alta manual** concede premium de verdad —el muro se abre—, es
    idempotente por referencia, y **apila** el periodo sobre el que queda;
  * que sin enlaces configurados Kunfupay **no se ofrece**, en vez de ofrecer un
    botón que da 503.

Lo que NO demuestra, y hay que decirlo: nada de esto habla con Kunfupay. Sus
dominios están bloqueados desde el sandbox y no hay cuenta. Los enlaces de cobro
son de mentira a propósito — lo que se prueba es **nuestro lado del trato**.

    python tests/e2e/api/pasarelas.py
"""
from __future__ import annotations

import json
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import API, cuenta, llama, sql  # noqa: E402

import json as _json
import urllib.error
import urllib.request


def checkout(payload: dict, tok: str, ip: str) -> tuple[int, object]:
    """`POST /checkout/create` desde una IP distinta cada vez.

    La ruta está limitada a **10/hora por IP** (`_rate_limit_key`), y esta sonda
    hace ocho llamadas: sin rotar, la tercera vuelta mide el limitador en vez de
    las pasarelas, y los ❌ que salen no dicen nada del producto.

    Rotar la cabecera aquí es legítimo y no abre ninguna puerta: en producción
    Cloud Run **añade** la IP real al final de `X-Forwarded-For`, y
    `_real_client_ip` toma la que está a `TRUSTED_PROXY_HOPS` del final — o sea,
    la del cliente de verdad. Sólo funciona aquí, donde no hay proxy delante.
    """
    req = urllib.request.Request(
        API + "/checkout/create", data=_json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {tok}",
                 "X-Forwarded-For": ip},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            cuerpo = r.read().decode()
            return r.status, (_json.loads(cuerpo) if cuerpo else None)
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode()
        try:
            return e.code, _json.loads(cuerpo)
        except Exception:
            return e.code, cuerpo[:300]
    except Exception as e:
        return 0, str(e)

FALLOS = []

ENLACE_MENSUAL = "https://shops.kunfupay.com/pruebas/mensual-falso"
ENLACE_VITALICIO = "https://shops.kunfupay.com/pruebas/vitalicio-falso"


def marca(nombre: str, ok: bool, detalle: str = "") -> None:
    print(f"  {'✅' if ok else '❌'} {nombre}{' — ' + detalle if detalle else ''}")
    if not ok:
        FALLOS.append(nombre)


def deja_sin_premium(correo: str) -> None:
    """Deja la cuenta de prueba SIN suscripción, pase lo que pase.

    Cuando el limitador de registros está agotado, `cuenta()` clona la cuenta
    sembrada — que **es premium**. Sin este reseteo, «empieza sin premium» falla
    y, peor, «pasa a premium tras el alta» pasaría sin haber probado nada: ya lo
    era. Lo que mide esta sonda es la concesión, así que el punto de partida no
    puede depender de por qué camino se consiguió la cuenta.
    """
    sql(f"""UPDATE users SET data = data - 'is_premium' - 'subscription_end'
                                        - 'subscription_plan' - 'trial_used'
            WHERE data->>'email' = '{correo}'""")


def haz_admin(correo: str) -> None:
    sql(f"""UPDATE users SET data = jsonb_set(data, '{{is_admin}}', 'true')
            WHERE data->>'email' = '{correo}'""")


def ajustes(tok_admin: str, **campos) -> int:
    cod, _ = llama("PUT", "/admin/settings", campos, tok_admin)
    return cod


def fin_suscripcion(correo: str) -> datetime | None:
    crudo = sql(f"SELECT data->>'subscription_end' FROM users "
                f"WHERE data->>'email' = '{correo}'").strip()
    if not crudo:
        return None
    return datetime.fromisoformat(crudo.replace("Z", "+00:00"))


def main() -> int:
    sello = int(time.time())
    correo = f"qa-pasarelas-{sello}@example.com"
    correo_admin = f"qa-pasarelas-admin-{sello}@example.com"
    clave = "PruebaPasarelas.2026"

    print("── cuentas ──")
    tok = cuenta(correo, clave, clon_de="qa@example.com", clon_password="QaTest2026!")
    tok_admin = cuenta(correo_admin, clave, clon_de="qa@example.com", clon_password="QaTest2026!")
    deja_sin_premium(correo)
    haz_admin(correo_admin)
    # El token lleva dentro lo que era la cuenta al emitirlo; se reentra para
    # que traiga el is_admin recién puesto. Sin esto todo el bloque de admin
    # daría 403 y la sonda mediría el login, no las pasarelas.
    cod, sesion = llama("POST", "/auth/login", {"email": correo_admin, "password": clave})
    if cod == 200:
        tok_admin = sesion["token"]
    cod, yo = llama("GET", "/auth/me", None, tok_admin)
    marca("hay una cuenta admin para configurar las pasarelas",
          cod == 200 and yo.get("is_admin"), f"HTTP {cod}")
    if not (cod == 200 and yo.get("is_admin")):
        return 1

    # ── 1 · encender Kunfupay con enlaces ────────────────────────────────
    print("\n── admin enciende Kunfupay ──")
    cod = ajustes(
        tok_admin,
        payment_methods_enabled="card,paypal,kunfupay",
        kunfupay_links=json.dumps({"monthly": ENLACE_MENSUAL, "lifetime": ENLACE_VITALICIO}),
    )
    marca("el admin puede guardar los raíles y los enlaces", cod == 200, f"HTTP {cod}")

    cod, pub = llama("GET", "/public/settings")
    metodos = (pub or {}).get("payment_methods", [])
    marca("la web anuncia exactamente los raíles encendidos",
          cod == 200 and metodos == ["card", "paypal", "kunfupay"], str(metodos))
    marca("sólo la tarjeta figura como raíl que renueva solo",
          (pub or {}).get("recurring_payment_methods") == ["card"],
          str((pub or {}).get("recurring_payment_methods")))
    marca("la prueba de 7 días sólo se anuncia donde existe",
          (pub or {}).get("trial_payment_methods") == ["card"],
          str((pub or {}).get("trial_payment_methods")))

    # ── 2 · los dos tipos de cobro ───────────────────────────────────────
    print("\n── Kunfupay cobra suscripción y pago único ──")
    cod, r = checkout({"plan_id": "monthly", "payment_method": "kunfupay", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.1")
    marca("SUSCRIPCIÓN (mensual): el checkout devuelve el enlace del plan",
          cod == 200 and (r or {}).get("checkout_url") == ENLACE_MENSUAL,
          f"HTTP {cod} {str(r)[:90]}")
    tx_mensual = (r or {}).get("transaction_id")

    # Los paréntesis no son estética: `||` liga más fuerte que `->>`, así que sin
    # ellos Postgres intenta concatenar antes de extraer y falla con
    # «operator does not exist: text ->> unknown».
    fila = sql(f"SELECT (data->>'payment_method') || '|' || (data->>'status') || '|' || (data->>'amount') "
               f"FROM payment_transactions WHERE data->>'id' = '{tx_mensual}'").strip()
    marca("el cobro queda escrito ANTES de mandar a pagar (el rastro del § 14.5)",
          fila == "kunfupay|pending|17.0", fila or "sin fila")

    cod, r = checkout({"plan_id": "lifetime", "payment_method": "kunfupay", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.2")
    marca("PAGO ÚNICO (De Por Vida): el checkout devuelve su propio enlace",
          cod == 200 and (r or {}).get("checkout_url") == ENLACE_VITALICIO,
          f"HTTP {cod} {str(r)[:90]}")

    cod, r = checkout({"plan_id": "quarterly", "payment_method": "kunfupay", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.3")
    marca("un plan sin enlace configurado NO manda a nadie a pagar (503)",
          cod == 503, f"HTTP {cod}")

    # ── 3 · apagar una pasarela desde admin ──────────────────────────────
    print("\n── admin apaga Kunfupay ──")
    ajustes(tok_admin, payment_methods_enabled="card,paypal")
    cod, r = checkout({"plan_id": "monthly", "payment_method": "kunfupay", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.4")
    marca("apagada en admin, el SERVIDOR rechaza el cobro (no sólo el botón)",
          cod == 400, f"HTTP {cod} {str(r)[:60]}")
    cod, pub = llama("GET", "/public/settings")
    marca("y la web deja de anunciarla",
          "kunfupay" not in (pub or {}).get("payment_methods", []),
          str((pub or {}).get("payment_methods")))

    print("\n── admin apaga Stripe y deja los demás ──")
    ajustes(tok_admin, payment_methods_enabled="paypal,revolut,nowpayments,kunfupay")
    cod, _ = checkout({"plan_id": "monthly", "payment_method": "card", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.5")
    marca("con Stripe apagado, la tarjeta deja de aceptarse", cod == 400, f"HTTP {cod}")
    cod, r = checkout({"plan_id": "monthly", "payment_method": "kunfupay", "origin_url": "http://localhost:3000"}, tok, f"10.9.{sello % 250}.6")
    marca("y Kunfupay sigue cobrando en su lugar", cod == 200, f"HTTP {cod}")

    print("\n── encendida pero SIN enlaces ──")
    ajustes(tok_admin, kunfupay_links="")
    cod, pub = llama("GET", "/public/settings")
    marca("sin enlaces no se ofrece, en vez de ofrecer un botón que da 503",
          "kunfupay" not in (pub or {}).get("payment_methods", []),
          str((pub or {}).get("payment_methods")))
    ajustes(tok_admin,
            payment_methods_enabled="card,paypal,kunfupay",
            kunfupay_links=json.dumps({"monthly": ENLACE_MENSUAL, "lifetime": ENLACE_VITALICIO}))

    # ── 4 · el alta manual concede premium de verdad ─────────────────────
    print("\n── alta manual del cobro ──")
    cod, yo = llama("GET", "/auth/me", None, tok)
    marca("el cliente aún NO es premium (si lo fuera, lo de abajo no probaría nada)",
          cod == 200 and not yo.get("is_premium"), str(yo.get("is_premium")))

    ref = f"KFP-{sello}"
    cod, r = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly", "reference": ref}, tok_admin)
    marca("el alta manual responde y no dice «ya procesado» la primera vez",
          cod == 200 and r and not r.get("already_processed"), f"HTTP {cod} {str(r)[:80]}")

    cod, yo = llama("GET", "/auth/me", None, tok)
    marca("el cliente pasa a premium — el muro se abre",
          cod == 200 and yo.get("is_premium") is True, str(yo.get("is_premium")))

    fin1 = fin_suscripcion(correo)
    esperado = datetime.now(timezone.utc) + timedelta(days=30)
    marca("la suscripción vence dentro de 30 días",
          fin1 is not None and abs((fin1 - esperado).total_seconds()) < 300,
          fin1.isoformat() if fin1 else "sin fecha")

    # ── 5 · idempotencia ─────────────────────────────────────────────────
    print("\n── la misma referencia, otra vez ──")
    cod, r = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly", "reference": ref}, tok_admin)
    marca("repetir la referencia NO regala un segundo periodo",
          cod == 200 and r and r.get("already_processed") is True, f"HTTP {cod} {str(r)[:80]}")
    fin2 = fin_suscripcion(correo)
    marca("y la fecha de fin no se ha movido", fin2 == fin1,
          f"{fin1} → {fin2}")

    # ── 6 · renovar antes de vencer no come días ─────────────────────────
    print("\n── renovación anticipada ──")
    cod, r = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly", "reference": f"{ref}-2"}, tok_admin)
    fin3 = fin_suscripcion(correo)
    marca("un segundo cobro APILA sobre la fecha vigente (no la reinicia)",
          cod == 200 and fin3 is not None and fin1 is not None
          and abs((fin3 - fin1).days - 30) <= 1,
          f"{fin1} → {fin3}")

    # ── 7 · dos peticiones a la vez ──────────────────────────────────────
    # El caso real: el admin hace doble clic, o el navegador reintenta tras un
    # timeout. Si las dos conceden, un solo cobro paga sesenta días.
    print("\n── ocho altas simultáneas con la misma referencia ──")
    fin_antes = fin_suscripcion(correo)
    ref_carrera = f"{ref}-carrera"
    # Ocho a la vez y con barrera, no dos «casi a la vez»: la ventana entre el
    # atajo por referencia y el INSERT es de milisegundos, y con dos peticiones
    # lanzadas en fila la primera terminaba antes de que arrancara la segunda —
    # el ✅ salía igual con la guarda quitada, o sea, no probaba nada.
    PETICIONES = 8
    salida = threading.Barrier(PETICIONES)
    resultados: list = []
    cerrojo = threading.Lock()

    def intenta():
        salida.wait()
        r = llama("POST", "/admin/payments/manual",
                  {"email": correo, "plan_id": "monthly", "reference": ref_carrera},
                  tok_admin)
        with cerrojo:
            resultados.append(r)

    hilos = [threading.Thread(target=intenta) for _ in range(PETICIONES)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    concedidas = [c for c, cuerpo in resultados
                  if c == 200 and isinstance(cuerpo, dict) and not cuerpo.get("already_processed")]
    marca("de ocho peticiones simultáneas, sólo una concede",
          len(concedidas) == 1,
          f"{[(c, (b or {}).get('already_processed') if isinstance(b, dict) else b) for c, b in resultados]}")
    fin_despues = fin_suscripcion(correo)
    dias = (fin_despues - fin_antes).days if (fin_antes and fin_despues) else None
    marca("y el periodo avanza 30 días, no 60", dias is not None and abs(dias - 30) <= 1,
          f"avanzó {dias} días")

    # ── 8 · lo que el alta manual no debe aceptar ────────────────────────
    print("\n── guardas del alta manual ──")
    cod, _ = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly",
                    "reference": f"{ref}-3", "provider": "stripe"}, tok_admin)
    marca("un raíl con webhook (Stripe) NO se puede dar de alta a mano", cod == 400, f"HTTP {cod}")

    cod, _ = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly", "reference": "  "}, tok_admin)
    marca("sin referencia no hay alta", cod == 400, f"HTTP {cod}")

    cod, _ = llama("POST", "/admin/payments/manual",
                   {"email": "no-existe@example.com", "plan_id": "monthly",
                    "reference": f"{ref}-4"}, tok_admin)
    marca("un email que no es de nadie no concede nada", cod == 404, f"HTTP {cod}")

    cod, _ = llama("POST", "/admin/payments/manual",
                   {"email": correo, "plan_id": "monthly", "reference": f"{ref}-5"}, tok)
    marca("un cliente normal no puede darse premium a sí mismo", cod in (401, 403), f"HTTP {cod}")

    print(f"\n{'❌' if FALLOS else '✅'} pasarelas: "
          f"{len(FALLOS)} fallo(s)" + (": " + "; ".join(FALLOS) if FALLOS else ""))
    return 1 if FALLOS else 0


if __name__ == "__main__":
    raise SystemExit(main())
