"""La pantalla enseña una cifra ANTES de guardar. ¿Es la que queda almacenada?

El formulario calcula la previsualización con la copia de la matemática que vive
en el navegador (`lib/instruments.js`); el backend recalcula con la suya
(`instruments.py`). Que las dos coincidan es lo único que impide que el diario
enseñe un riesgo al escribir y otro al releer.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import (  # noqa: E402
    API, Marcador, cuenta, da_premium, llama, sql, tablas_con_user_id,
)

import json, urllib.request


def req(metodo, ruta, payload=None, tok=None):
    """Envoltura sobre `llama` que devuelve sólo el cuerpo.

    Un 4xx aquí NO es un fallo del producto: los límites de tasa
    (login 10/min) se agotan al repetir la tanda, y una sonda que
    revienta con un traceback ante un 429 acusa al producto de algo
    que ha hecho el banco de pruebas.
    """
    cod, cuerpo = llama(metodo, ruta, payload, tok)
    if cod == 429:
        raise SystemExit("⏸  límite de tasa alcanzado; repetir en unos "
                         "minutos (el limitador funciona, que también cuenta)")
    if cod >= 400:
        raise SystemExit(f"{metodo} {ruta} devolvió HTTP {cod}: {cuerpo}")
    return cuerpo

tok = cuenta("qa@example.com", "QaTest2026!")
da_premium(llama("GET", "/auth/me", None, tok)[1]["id"])

# Lo mismo que tecleó el navegador en qa-guardar.js: GBPJPY, 3 lotes mini,
# stop 30 pips, objetivo a 2R, 25 000 de cuenta.
sent = dict(symbol="GBPJPY", instrument_type="forex", side="long",
            entry_price=190.0, quantity=3, lot_type="mini", leverage=30,
            account_balance=25000, sl_unit="pips", sl_input=30,
            tp_unit="r", tp_input=2, status="open")
got = req("POST", "/performance/trades", sent, tok)
tid = got["id"]

# Y lo que el navegador pintó en pantalla antes de pulsar guardar.
pantalla = {"sl": 189.700, "tp": 190.600, "notional": 5_700_000.00, "risk": 9_000.00,
            "risk_pct": 36.00, "rr": 2.00}

filas = [
    ("stop resuelto (30 pips del yen = 0,30)", pantalla["sl"], got.get("sl")),
    ("objetivo a 2R", pantalla["tp"], got.get("tp")),
    ("nocional (3 mini = 30 000 × 190)", pantalla["notional"], got.get("notional")),
    ("riesgo en dinero", pantalla["risk"], got.get("risk_amount")),
    ("riesgo en % de la cuenta", pantalla["risk_pct"], got.get("risk_pct_balance")),
    ("R:B", pantalla["rr"], got.get("rr")),
]
print(f"{'concepto':42} {'pantalla':>14} {'almacenado':>14}  ¿igual?")
print("-" * 84)
fallos = 0
for nombre, ui, api in filas:
    igual = api is not None and abs(float(api) - float(ui)) < 0.011
    fallos += 0 if igual else 1
    print(f"{nombre:42} {ui:>14,.2f} {(api if api is not None else float('nan')):>14,.2f}"
          f"  {'✅' if igual else '❌'}")

# El apalancamiento NO puede haber tocado el P&L ni el riesgo.
print()
print(f"apalancamiento almacenado : {got.get('leverage')}×")
print(f"multiplicador (contrato)  : {got.get('multiplier')}   <- 10 000 por lote mini, NO la palanca")
print(f"margen (nocional/palanca) : ${got.get('margin_used'):,.2f}")
print(f"exposición                : {got.get('exposure_multiple')}× la cuenta")
errs = [e["code"] for e in got.get("errors") or []]
print(f"avisos disparados         : {', '.join(errs) or '-'}")

# Releer: lo que se guardó tiene que sobrevivir a la vuelta.
vuelta = req("GET", f"/performance/trades/{tid}", None, tok)
persiste = all(abs(float(vuelta.get(k) or 0) - float(got.get(k) or 0)) < 0.011
               for k in ("sl", "tp", "notional", "risk_amount", "margin_used"))
print(f"\nreleído desde la BD idéntico: {'✅' if persiste else '❌'}")
req("DELETE", f"/performance/trades/{tid}", None, tok)
print("operación de prueba borrada")
cuadra = fallos == 0 and persiste
print(f"\n{'TODO CUADRA' if cuadra else 'HAY DESVIACIONES'}")
# El código de salida es lo que lee `correr.sh`: sin esto, imprimir «HAY
# DESVIACIONES» y salir con 0 hace que la tanda entera se reporte en verde.
raise SystemExit(0 if cuadra else 1)
