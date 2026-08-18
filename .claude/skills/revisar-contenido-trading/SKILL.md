---
name: revisar-contenido-trading
description: Revisa la exactitud, el nivel profesional y la consistencia terminológica del contenido educativo de trading en los 8 idiomas. Úsala al añadir o editar módulos de la academia (EducationPage.jsx, tradingEducationContent.js, componentes education/*), glosario, o textos de opciones/futuros/forex/cripto.
---

# Revisión de contenido educativo (público PROFESIONAL)

## Verificaciones
1. **Exactitud factual.** Contrasta cada afirmación contra su definición canónica y marca
   contradicciones ENTRE módulos:
   - theta = decaimiento temporal (negativo para largos); gamma = derivada de delta;
     vega positiva para largos; vanna = ∂delta/∂vol; charm = ∂delta/∂tiempo.
   - market cap = precio × supply (cripto: circulating; acciones: shares outstanding).
   - pip = 0.0001 (0.01 en JPY); lote estándar = 100.000 uds.
   - precio del bono ↔ yield inverso; SQN de Van Tharp con N=min(trades,100).
2. **Nivel.** Rechaza simplificaciones de principiante en secciones "Pro/institucional". Exige
   fórmulas y números, no prosa vaga.
3. **Terminología unificada (es):** "tamaño de posición" (no "lotaje" salvo forex), "stop loss",
   "apalancamiento". Los términos del sector NO se traducen (Black-Scholes, iron condor, GEX,
   funding rate, order flow).
4. **i18n:** `node frontend/scripts/i18n-check.js` → **0 claves crudas y paridad exacta en los 8
   idiomas** (es/en/de/fr/ru/zh/ja/ar). Toda clave nueva va en los 8 ficheros.
5. **Contenido en inglés para SEO:** las FAQ orientadas a *featured snippets* de Google se
   redactan en inglés (canónico) a propósito (ver `data/marketTypeDetails.js`); la UI que las
   envuelve sí se traduce.
6. **Disclaimers:** todo módulo con cifras de rentabilidad enlaza a `/legal?tab=risk`.

## Salida
Lista de correcciones `[fichero, clave i18n, texto actual, texto propuesto]` + contradicciones cruzadas.
