"""El escáner: estructura de precio, patrones de vela, patrones chartistas y
probabilidad medida sobre niveles.

price_action.py     — swings, estructura de mercado, BOS/CHoCH, S/R, FVG
candle_patterns.py  — 35 patrones de vela (aritmética pura, sin IA)
chart_patterns.py   — 13 patrones chartistas geométricos sobre swings (G-40)
level_features.py   — rasgos por barra para level_odds
level_odds.py        — probabilidad medida de un nivel, contra baraja aleatoria
level_research.py   — significancia estadística de los rasgos (offline)

Todos puros: reciben barras, no tocan red ni BD. Ver .claude/rules/escaner.md.
"""
