#!/usr/bin/env python3
"""
Comprueba las 4 fuentes de datos del Grupo A contra la red REAL.

    python3 scripts/verificar-fuentes-datos.py

No es un "¿responde?". Coge la respuesta de verdad y la pasa por **los mismos
parsers que usa el backend**, así que lo que imprime es exactamente el dato que
acabaría en pantalla. Existe porque el sandbox donde se escribió este código no
tiene salida a internet: los tests unitarios prueban los parsers contra muestras
de las respuestas, y esto es lo que cierra el hueco entre la muestra y la
realidad.

Falla si el formato de alguna fuente ha cambiado, que es justo el riesgo que
tiene un parser escrito contra documentación en vez de contra una respuesta.

Sin dependencias más allá de las del backend (httpx).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

VERDE, ROJO, GRIS, FIN = "\033[92m", "\033[91m", "\033[90m", "\033[0m"
if not sys.stdout.isatty():
    VERDE = ROJO = GRIS = FIN = ""

fallos = 0


def ok(titulo, detalle):
    print(f"  {VERDE}✔{FIN} {titulo}")
    for linea in detalle.splitlines():
        print(f"      {GRIS}{linea}{FIN}")


def mal(titulo, motivo):
    global fallos
    fallos += 1
    print(f"  {ROJO}✘{FIN} {titulo}")
    print(f"      {ROJO}{motivo}{FIN}")


# ── 1. Tesoro de EE. UU. — tipo libre de riesgo ──────────────────────────
def probar_tesoro():
    import market_rates

    tipo = market_rates._fetch_live_rate()
    if tipo is None:
        return mal("Tesoro EE. UU. — curva de tipos",
                   "el parser no ha sacado ningún BC_3MONTH utilizable.\n"
                   "Revisa si Treasury ha cambiado los nombres de campo del feed.")
    if not (0.0 < tipo < 0.15):
        return mal("Tesoro EE. UU. — curva de tipos",
                   f"tipo fuera de lo razonable: {tipo:.4%}")
    ok("Tesoro EE. UU. — curva de tipos",
       f"tipo libre de riesgo a 3 meses = {tipo:.4%}\n"
       f"(sustituye al ^IRX que se leía de Yahoo)")


# ── 2. BCE — forex ───────────────────────────────────────────────────────
async def probar_bce():
    import ecb_rates
    from missing_apis import FOREX_PAIRS

    pares = await ecb_rates.fetch_rates(FOREX_PAIRS)
    if not pares:
        return mal("BCE — tipos de cambio",
                   "el parser no ha sacado ningún par.\n"
                   "Revisa si ha cambiado el formato de eurofxref-hist-90d.xml.")
    faltan = set(FOREX_PAIRS) - set(pares)
    if faltan:
        return mal("BCE — tipos de cambio", f"faltan pares que deberían estar: {sorted(faltan)}")

    eurusd = pares["EURUSD"]
    if not (0.8 < eurusd["price"] < 1.6):
        return mal("BCE — tipos de cambio",
                   f"EURUSD = {eurusd['price']}, fuera de rango. ¿Cruce invertido?")
    sin_cambio = [p for p, d in pares.items() if d["change"] is None]
    ok("BCE — tipos de cambio",
       f"{len(pares)}/{len(FOREX_PAIRS)} pares · fecha {eurusd['as_of']}\n"
       f"EURUSD={eurusd['price']} ({eurusd['change']:+.3f}%)  "
       f"USDJPY={pares['USDJPY']['price']}  GBPJPY={pares['GBPJPY']['price']}\n"
       + (f"sin variación (sólo un día en el feed): {sin_cambio}" if sin_cambio else
          "todos con variación diaria real"))


# ── 3. Binance — cripto ──────────────────────────────────────────────────
async def probar_binance():
    import crypto_data
    from stock_data import COINGECKO_SYMBOL_TO_ID

    catalogo = sorted(COINGECKO_SYMBOL_TO_ID)
    precios = await crypto_data.fetch_usd_prices(catalogo)
    if not precios:
        return mal("Binance + Kraken — cripto",
                   "no ha vuelto ni un precio. ¿Bloqueo geográfico de Binance,\n"
                   "o ha cambiado el formato de /api/v3/ticker/24hr?")
    if "BTC" not in precios:
        return mal("Binance + Kraken — cripto", "ni siquiera BTC. Algo va mal de raíz.")

    btc = precios["BTC"]
    if not (1000 < btc["usd"] < 10_000_000):
        return mal("Binance + Kraken — cripto", f"BTC = {btc['usd']}, no es un precio plausible")

    ausentes = [s for s in catalogo if s not in precios]
    por_fuente = {}
    for d in precios.values():
        por_fuente[d["source"]] = por_fuente.get(d["source"], 0) + 1
    ok("Binance + Kraken — cripto",
       f"{len(precios)}/{len(catalogo)} monedas · {por_fuente}\n"
       f"BTC={btc['usd']:,.2f} ({btc['usd_24h_change']:+.2f}%) vía {btc['source']}\n"
       + (f"sin cotización: {ausentes}" if ausentes else "catálogo completo"))
    if btc["source"] != "kraken:USD":
        print(f"      {GRIS}nota: Kraken debería mandar sobre Binance en BTC "
              f"(dólar real vs Tether). No ha contestado.{FIN}")


# ── 4. Binance — velas OHLC ──────────────────────────────────────────────
async def probar_velas():
    import crypto_data

    intervalo, limite = crypto_data.interval_for_days(30)
    velas = await crypto_data.fetch_ohlc("BTC", interval=intervalo, limit=limite)
    if not velas:
        return mal("Binance — velas OHLC", "ninguna vela. ¿Formato de /api/v3/klines cambiado?")
    v = velas[-1]
    if not (v["low"] <= v["open"] <= v["high"] and v["low"] <= v["close"] <= v["high"]):
        return mal("Binance — velas OHLC",
                   f"vela incoherente (apertura/cierre fuera del rango): {v}")
    ok("Binance — velas OHLC",
       f"{len(velas)} velas de {intervalo} pedidas para 30 días\n"
       f"última: O={v['open']:,.2f} H={v['high']:,.2f} "
       f"L={v['low']:,.2f} C={v['close']:,.2f}")


async def main():
    print("\nVerificando las 4 fuentes del Grupo A contra la red real.")
    print("Se usa el MISMO parser que el backend, así que esto es el dato final.\n")
    probar_tesoro()
    await probar_bce()
    await probar_binance()
    await probar_velas()
    print()
    if fallos:
        print(f"{ROJO}{fallos} fuente(s) con problemas.{FIN} "
              "El backend degrada solo (fallback / dato ausente), pero hay que mirarlo.\n")
        sys.exit(1)
    print(f"{VERDE}Las 4 fuentes responden y sus parsers producen datos válidos.{FIN}\n")


if __name__ == "__main__":
    asyncio.run(main())
