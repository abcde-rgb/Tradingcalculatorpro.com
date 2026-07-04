# Backlog del Centro de Aprendizaje

Roadmap de contenido educativo. ✅ = ya en producción · 🆕 = pendiente.

> Estado: **backlog completado** (PRs #41-#44). Se listan abajo posibles
> ampliaciones futuras si se quiere seguir creciendo.

## 🎯 Proceso y ejecución — ✅ COMPLETO (pestaña "El oficio del trader")
- ✅ Gestión de la operación abierta (break-even, parciales, trailing, pirámide, TP, cortar rápido)
- ✅ Plantilla de plan + checklist pre-operación
- ✅ Pensar en R (múltiplos de riesgo) + expectativa
- ✅ Metodología del diario (revisión semanal/mensual, etiquetar errores, métricas)
- ✅ Backtesting y demo (forward testing, tamaño de muestra)
- ✅ Rutina diaria (pre-market, sesión, post-market)
- ✅ Regímenes de mercado (tendencia/rango/volátil, cuándo NO operar)

## 🧠 Psicología y mentalidad — ✅ COMPLETO
- ✅ Sesgos (10), emociones, control emocional, "por qué se queman las cuentas" (16 causantes)
- ✅ Trading como negocio: proceso > resultado + expectativas realistas
- ✅ Gestionar el drawdown (reducir tamaño, diagnosticar, reconstruir confianza)
- ✅ Salud del trader: sueño, estrés/pantalla, burnout

## ⚠️ Riesgo y capital — ✅ COMPLETO (14 conceptos)
- ✅ 11 conceptos previos + normas inviolables, 1%, Kelly, R:R
- ✅ Portfolio heat (riesgo total de posiciones abiertas)
- ✅ Métodos de sizing (fracción fija, ratio fijo, anti-martingala; nunca martingala)
- ✅ Cobertura (hedging) básica

## 📊 Análisis técnico avanzado — ✅ COMPLETO (pestaña "Técnico avanzado")
- ✅ S/R, tendencias, indicadores, Elliott, Ichimoku, patrones, Dow, Wyckoff, armónicos, Renko/Heikin, COT
- ✅ Smart Money / ICT (BOS/CHoCH, order blocks, FVG, liquidez, barridos, OTE, mitigación)
- ✅ Zonas de oferta y demanda
- ✅ Volume Profile / Market Profile + VWAP
- ✅ Divergencias (regular/oculta)
- ✅ Pivotes, VSA, squeeze de Bollinger/Keltner

## 💰 Instrumentos — ✅ COMPLETO
- ✅ Mercados (10), participantes (10), sesiones (6), apalancamiento
- ✅ Estrategias de opciones (7: covered call, CSP, spreads, iron condor, straddle, protective put)
- ✅ Cripto a fondo: tokenomics, staking, DeFi, on-chain (en "El negocio del trading")
- ✅ Futuros y forex: especificaciones, rollover, swaps (en "El negocio del trading")

## 🏦 El negocio del trading — ✅ COMPLETO (pestaña "El negocio del trading")
- ✅ Prop firms / fondeo (retos tipo FTMO)
- ✅ Fiscalidad y registro de operaciones
- ✅ Interés compuesto
- ✅ Escalar tamaño / pasar a tiempo completo

---

### Posibles ampliaciones futuras (no comprometidas)
- ✅ Progreso por módulo (localStorage, contador por pilar y barra en header — PR #52)
- ✅ Quiz de autoevaluación (8 preguntas, en el pilar Empezar — PR #52)
- Vídeos o animaciones interactivas de los patrones
- ✅ Glosario de términos con buscador (20 términos — PR #52)
- ✅ Calculadora de riesgo de ruina interactiva (Monte Carlo, en el módulo de Riesgo — PR #48)

## 📰 Módulos "gap" vs fuentes profesionales (Babypips/CMT/brokers) — ✅ COMPLETO (PR #53)
- ✅ Operar noticias (NFP, CPI, FOMC; spreads/slippage; spike & fade; 3 estrategias)
- ✅ Sentimiento de mercado (VIX, Put/Call, Fear & Greed, AAII, contrarian)
- ✅ Análisis intermercado (DXY, bonos, risk-on/off, correlaciones FX, fuerza relativa)
- ✅ Amplitud y ciclos (avance/declive, 52 semanas, McClellan, estacionalidad)
- ✅ Brokers, regulación y estafas (tier-1, fondos segregados, red flags, gurús, ponzis, checklist)

## ⚙️ Mecánica de derivados apalancados — ✅ COMPLETO (módulo "Margen y liquidación", pilar Riesgo)
- ✅ Margen aislado vs cruzado
- ✅ Modo de posición: unidireccional (promedia) vs cobertura/hedge (separado)
- ✅ Precio de liquidación y margen de mantenimiento
- ✅ Mark price vs last price vs índice (dónde te pueden liquidar con una mecha)
- ✅ Funding rate como coste y como señal contrarian
- ✅ Mechas de liquidación, cascadas y scam wicks
- ✅ Motores anti-manipulación (tipo MP Shield de Margex) + qué comprobar en tu exchange

## 📐 Suite cuantitativa de riesgo — ✅ COMPLETO (auditoría vs roadmap "prop desk")
Ya existían: Risk of Ruin Monte Carlo, Kelly (completo/medio) + expectancy, matriz de expectancy,
rachas de pérdidas (DP exacta), portfolio heat, simulador Monte Carlo (dashboard), Black-Scholes
con griegas + dividend yield (×2 UIs), griegas de cartera (opciones), calculadora de futuros
(nocional/tick/margen), tamaño de muestra y ley de grandes números.
Añadido ahora:
- ✅ Calculadora drawdown → recuperación (ganancia necesaria + nº de operaciones con expectancy, tabla 10-90%, nota VaR/política institucional)
- ✅ Riesgo efectivo ajustado por correlación en Portfolio Heat (slider ρ 0-100%)
- ✅ Módulo educativo nº 34: "Griegas de opciones" (Delta/Gamma/Theta/Vega/Rho/IV con ejemplos numéricos, pilar Pro)
Pendiente (idea futura): edge en vivo desde el diario (RoR/Kelly recalculados con trades reales).

**Total academia: 34 módulos en 6 pilares.**
