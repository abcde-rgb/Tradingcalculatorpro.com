#!/usr/bin/env python3
"""Siembra operaciones de todos los productos, incluidos los casos límite.

Cada operación está elegida para que una pantalla concreta tenga algo que
enseñar: la del oro dispara el tope de exposición, la del perpetuo tiene
funding, la opción comprada tiene R sin stop, el spread lo tiene por pérdida
máxima declarada, y hay una con R:B por debajo de 1:1 para el aviso duro.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from entorno import cuenta, da_premium, llama  # noqa: E402

API = os.environ.get("QA_API", "http://127.0.0.1:8080") + "/api"


def post(path, payload, token=None):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(API + path, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


# Registro-o-login, y premium, con el MISMO helper que usan las sondas de API.
#
# Esto hacía `POST /auth/login` a secas, que en una base recién creada devuelve
# 401 — o sea: en un contenedor nuevo, que es TODA sesión remota, la siembra
# fallaba siempre y `arriba.sh` seguía adelante avisando en amarillo. Las sondas
# de navegador afirman sobre 13 filas y +$3.471,86, así que fallaban todas y el
# informe acusaba al producto de un fallo que era «aquí no hay cuenta».
#
# `cuenta()` ya sabía registrar si el login no vale, y `da_premium()` ya sabía
# saltar el muro de pago; sólo que este script no las usaba.
EMAIL = os.environ.get("QA_EMAIL", "qa@example.com")
PASSWORD = os.environ.get("QA_PASSWORD", "QaTest2026!")

tok = cuenta(EMAIL, PASSWORD)
da_premium(llama("GET", "/auth/me", None, tok)[1]["id"])
print(f"cuenta {EMAIL} lista (registrada o reutilizada), premium concedido")

TRADES = [
    # 1 · CFD de oro, 1 lote a 20× sobre 10 000 → 200 000 de nocional = 20× la cuenta
    dict(symbol="XAUUSD", instrument_type="cfd", side="long", entry_price=2000,
         quantity=1, leverage=20, account_balance=10000, sl=1990, tp=2020,
         exit_price=2012, status="closed", fees=8, swap_rate_pct=7.3, nights_held=3,
         setups=["Ruptura NY"], notes="Tope de exposicion: 20x la cuenta",
         entry_date="2026-07-02T08:00:00Z", exit_date="2026-07-05T15:00:00Z"),
    # 2 · Micro E-mini S&P, stop en ticks
    dict(symbol="MES", instrument_type="futures", side="long", entry_price=5000,
         quantity=2, leverage=10, account_balance=10000,
         sl_unit="ticks", sl_input=8, tp_unit="ticks", tp_input=24,
         exit_price=5006, status="closed", fees=4.5,
         setups=["Apertura"], entry_date="2026-07-08T13:35:00Z",
         exit_date="2026-07-08T15:10:00Z"),
    # 3 · Forex micro lote, stop en pips
    dict(symbol="EURUSD", instrument_type="forex", side="long", entry_price=1.0850,
         quantity=5, lot_type="micro", leverage=30, account_balance=10000,
         sl_unit="pips", sl_input=20, tp_unit="r", tp_input=2.5,
         exit_price=1.0895, status="closed", fees=1.2,
         swap_rate_pct=2.5, nights_held=2, setups=["Continuacion"],
         entry_date="2026-07-11T07:00:00Z", exit_date="2026-07-13T11:00:00Z"),
    # 4 · Perpetuo de BTC con funding estimado por fechas
    dict(symbol="BTCUSDT", instrument_type="crypto_perp", side="long",
         entry_price=100000, quantity=0.05, leverage=20, account_balance=10000,
         sl=97000, tp=106000, exit_price=102400, status="closed", fees=6,
         funding_rate_pct=0.01, setups=["Ruptura NY", "Continuacion"],
         entry_date="2026-07-16T00:00:00Z", exit_date="2026-07-19T08:00:00Z"),
    # 5 · Opcion comprada: la prima ES la perdida maxima -> tiene R sin stop
    dict(symbol="AAPL", instrument_type="option", option_type="call", side="long",
         entry_price=3.50, quantity=2, strike=200, expiry="2026-08-21",
         account_balance=10000, exit_price=5.80, status="closed", fees=2.6,
         iv_entry=28.5, iv_exit=31.2, delta_entry=0.42, underlying_entry=196.4,
         underlying_exit=203.1, option_outcome="closed",
         option_strategy="Long Call", setups=["Continuacion"],
         entry_date="2026-07-22T14:00:00Z", exit_date="2026-07-29T18:00:00Z"),
    # 6 · Spread de credito: riesgo = anchura - credito, declarado
    dict(symbol="SPY", instrument_type="option", option_type="put", side="short",
         entry_price=1.20, quantity=1, strike=560, expiry="2026-08-15",
         max_loss=380, max_profit=120, option_strategy="Bull Put Spread",
         account_balance=10000, exit_price=0.30, status="closed", fees=2.6,
         iv_entry=17.8, delta_entry=-0.18, option_outcome="closed",
         setups=["Venta de prima"], entry_date="2026-07-24T15:00:00Z",
         exit_date="2026-08-01T16:00:00Z"),
    # 7 · Accion al contado: el control, se comporta como siempre
    dict(symbol="MSFT", instrument_type="stock", side="long", entry_price=430,
         quantity=10, account_balance=10000, sl=418, tp=460,
         exit_price=447, status="closed", fees=2, setups=["Continuacion"],
         entry_date="2026-07-28T14:00:00Z", exit_date="2026-08-03T20:00:00Z"),
    # 8 · R:B por debajo de 1:1 -> aviso duro. Y perdedora, para que haya drawdown.
    dict(symbol="NAS100", instrument_type="cfd", side="short", entry_price=20000,
         quantity=0.5, leverage=20, account_balance=10000, sl=20200, tp=19900,
         exit_price=20200, status="sl_hit", fees=3, setups=["Reversion"],
         notes="Arriesga 2 para ganar 1", entry_date="2026-08-04T09:00:00Z",
         exit_date="2026-08-04T11:30:00Z"),
    # 9 · Cripto spot, sin apalancamiento posible
    dict(symbol="ETHUSDT", instrument_type="crypto_spot", side="long",
         entry_price=3200, quantity=0.8, account_balance=10000, sl=3050,
         tp=3600, exit_price=3410, status="closed", fees=4,
         setups=["Continuacion"], entry_date="2026-08-01T10:00:00Z",
         exit_date="2026-08-05T09:00:00Z"),
    # 10 · Posicion ABIERTA con aviso: es la que enseña la seccion de alertas
    dict(symbol="GC", instrument_type="futures", side="long", entry_price=2450,
         quantity=1, leverage=8, account_balance=10000,
         sl_unit="ticks", sl_input=50, tp_unit="r", tp_input=3,
         status="open", setups=["Ruptura NY"],
         notify={"enabled": True, "channels": ["inapp", "email"],
                 "on": ["sl", "tp"]},
         entry_date="2026-08-06T13:00:00Z"),

    # ── 11-13 · La SEGUNDA cuenta ────────────────────────────────────────
    #
    # Tres operaciones de futuros sobre un saldo de 50 000, frente a los 10 000
    # de todo lo anterior. Sin esto, `detect_mixed_accounts` no tiene nada que
    # detectar y las tres comprobaciones del aviso en `analitica.js` sólo podían
    # FALLAR — que es tan inútil como un ✅ que no prueba nada, sólo más ruidoso.
    #
    # El escenario no es artificial: es lo normal que cada producto viva en su
    # bróker. Y es justo el caso que importa, porque la curva de equity arranca
    # del saldo de la operación más antigua y le suma importes dimensionados
    # para otra cuenta — el drawdown que sale de ahí no ocurrió nunca.
    dict(symbol="ES", instrument_type="futures", side="long", entry_price=5100,
         quantity=1, leverage=10, account_balance=50000,
         sl_unit="ticks", sl_input=12, tp_unit="ticks", tp_input=36,
         exit_price=5109, status="closed", fees=4.5,
         setups=["Apertura"], notes="Segunda cuenta: 50 000",
         entry_date="2026-07-10T13:35:00Z", exit_date="2026-07-10T16:10:00Z"),
    dict(symbol="NQ", instrument_type="futures", side="short", entry_price=18000,
         quantity=1, leverage=10, account_balance=50000,
         sl_unit="ticks", sl_input=20, tp_unit="ticks", tp_input=40,
         exit_price=17960, status="closed", fees=4.5,
         setups=["Reversion"], notes="Segunda cuenta: 50 000",
         entry_date="2026-07-16T14:00:00Z", exit_date="2026-07-16T18:30:00Z"),
    dict(symbol="ES", instrument_type="futures", side="long", entry_price=5150,
         quantity=2, leverage=10, account_balance=50000,
         sl_unit="ticks", sl_input=10, tp_unit="ticks", tp_input=30,
         exit_price=5145, status="closed", fees=9,
         setups=["Apertura"], notes="Segunda cuenta: 50 000",
         entry_date="2026-07-23T13:40:00Z", exit_date="2026-07-23T15:05:00Z"),
]

print(f"\n{'simbolo':10} {'producto':12} {'P&L':>10} {'R':>7} {'nocional':>12} "
      f"{'margen':>10} {'exp':>7}  errores")
print("-" * 92)
for t in TRADES:
    r = post("/performance/trades", t, tok)
    err = ",".join(e["code"] for e in r.get("errors") or []) or "-"
    print(f"{r['symbol']:10} {r['instrument_type']:12} {r['pnl']:>10.2f} "
          f"{str(r.get('r_multiple') or '-'):>7} {str(r.get('notional') or '-'):>12} "
          f"{str(r.get('margin_used') or '-'):>10} "
          f"{str(r.get('exposure_multiple') or '-'):>7}  {err}")
print(f"\n{len(TRADES)} operaciones creadas")
