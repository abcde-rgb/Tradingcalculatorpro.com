---
name: auditar-formulas
description: Audita la corrección matemática de las fórmulas financieras del backend (Black-Scholes, griegas incl. vanna/charm, payoff, GEX, Kelly, Monte Carlo, VaR/CVaR, SQN, Sharpe/Sortino/Calmar, Ulcer). Úsala cuando se toque options_math.py, performance.py, performance_metrics.py, options_optimize.py, price_action.py o cualquier cálculo que el usuario use para dimensionar posiciones reales.
---

# Auditoría de fórmulas financieras

Público objetivo: **profesional**. Un número mal calculado que alguien use para dimensionar
capital real es el peor bug posible en este proyecto. Esta skill es la red de seguridad matemática.

## Stack real (no confundir)
Backend Python 3.11 + FastAPI + **asyncpg sobre PostgreSQL** (shim clase `Collection`, API estilo
Mongo sobre JSONB). **Nunca SQL directo.** Las fórmulas viven en módulos puros importables sin BD:
`options_math.py` (usa `scipy.stats.norm`), `performance.py` y `performance_metrics.py` (solo stdlib
`math`/`statistics`), `options_optimize.py`, `price_action.py`.

## Reglas de honestidad numérica (NO romper — están fijadas por tests)
1. **Lo incalculable es `None`, NUNCA `0`** (un R sin stop, un Sortino sin pérdidas, una IV
   indeterminable, un GEX sin OI real). Rellenar con 0 es mentir.
2. **Datos modelados** se marcan `synthetic: true` y su volumen/OI = `None` (banner en UI).
3. **Lo sensible al orden** se ordena cronológicamente (por `exit_date`/`created_at`).
4. El **tipo libre de riesgo** sale del hook/endpoint, nunca de un literal suelto en un cálculo.

## Procedimiento
1. Localiza cada fórmula y compárala contra su referencia canónica:
   - **Black-Scholes call ATM** S=K=100, r=5%, σ=20%, T=1 → **10.4506**; put → **5.5735**;
     **delta call** → **0.6368**; verifica **paridad put-call** `C − P = S − K·e^(−rT)`.
   - **Griegas** por diferencias finitas contra la forma cerrada (tolerancia 1e-4). Incluye
     **vanna** `∂Δ/∂σ = ∂Vega/∂S = −e^(−qT)·d2/σ·φ(d1)` y **charm** `∂Δ/∂t`.
   - **GEX**: `GEX_i = Γ_i · OI_i · 100 · S² · 0.01 · signo` (+calls, −puts); total = Σ; gamma-flip
     = spot donde Σ cruza 0. Con OI sintético → `None`, no inventar.
   - **SQN (Van Tharp)**: `√N · media(R)/desv(R)`, con **N = min(nº trades, 100)**.
   - **Sharpe** `(R̄−Rf)/σ`, **Sortino** (σ solo de la downside), **Calmar** `CAGR/|maxDD|`,
     **Ulcer** `√(media(DD_i²))`.
   - **VaR paramétrico** `z_α·σ·V` (z=1.645@95%, 2.326@99%); **CVaR** = media de la cola ≥ VaR.
2. Ejecuta los tests offline (no requieren red ni BD):
   `cd backend && pytest tests/ -k "greeks or blackscholes or payoff or performance or metrics or gex" -v`
   Si falta `scipy`/`pytest`: `pip install scipy pytest` (PyPI está permitido en el sandbox).
   Verificación de sintaxis siempre disponible: `python -m py_compile backend/*.py`.
3. Para **cada fórmula nueva EXIGE un test unitario offline** con valor de referencia citado.
4. Reporta cualquier caso donde un valor incalculable se rellene con 0, o un dato modelado no se
   marque `synthetic`.

## Salida
Tabla: `fórmula | fichero:línea | valor de referencia | valor obtenido | veredicto (OK/FALLO) | test que lo blinda`.
