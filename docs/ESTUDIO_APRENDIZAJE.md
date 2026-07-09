# Estudio del Centro de Aprendizaje

> Auditoría completa del apartado **Aprendizaje** (`/education`): qué hay, qué nivel
> de detalle tiene para un principiante, qué falta y en qué orden mejorarlo.
> Fecha: 2026-07-09.

## 1. Inventario: qué hay hoy

El centro está organizado como una **academia de bróker** (estilo IG Academy / IBKR Campus):
**6 pilares (rutas de aprendizaje) · 44 módulos** + componentes interactivos.

| Pilar | Módulos |
|---|---|
| **Empezar** | Fundamentos · Mecánica del mercado · Estilos de trading · Análisis fundamental · Seguridad del bróker · Glosario |
| **Técnico** | Análisis técnico · Patrones de gráfico · Velas japonesas · Teoría de Dow · Wyckoff · Gráficos alternativos |
| **Avanzado** | Elliott · Ichimoku · Armónicos · Smart Money (ICT) · Técnico avanzado · Sentimiento · Intermercado · Amplitud y ciclos · COT |
| **Riesgo** | Gestión de riesgo · Stops y objetivos · Gestión de capital · Salidas parciales · Gestión de la operación · Margen y liquidación · Probabilidad |
| **Psicología** | Psicología · Mentalidad probabilística (Douglas) · Maestros del trading · Maestros de futuros · Reglas · Disciplina pro · Quiz |
| **Pro** | El oficio · Estrategias · Griegas · Estrategias de opciones · Operar noticias · Mesa institucional · Métodos institucionales · Construcción de posiciones · El negocio |

**Componentes interactivos** (no solo texto): detector de patrones en vivo, anatomía de vela,
figuras SVG de patrones, guía de apalancamiento, pirámide/pilares del trading, guía de líneas de
tendencia, guía de temporalidades, calculadora de expectativa, matriz de expectativa, riesgo de ruina
(Monte Carlo), esquema de Wyckoff, diagrama de Dow, comparador de estilos, guía COT, plan de trading
imprimible, glosario con buscador, quiz autoevaluable, progreso por módulo (localStorage).

**Veredicto de amplitud:** excelente. En cobertura iguala o supera a las academias de bróker
gratuitas. **No hace falta añadir muchos temas nuevos** — el problema no es la amplitud.

## 2. El hallazgo principal: dos capas de profundidad

El contenido creció por oleadas. Los módulos **añadidos recientemente** (avanzados, institucionales,
psicología profunda) tienen descripciones **ricas**: cifras concretas, umbrales, ejemplos, "por qué
importa" y contexto de régimen. Pero los módulos **fundacionales** —los que un principiante ve
PRIMERO— se escribieron al principio como **stubs de una línea**.

Es exactamente al revés de lo que necesita alguien nuevo: lo básico está poco explicado y lo avanzado,
muy explicado.

**Evidencia medida (longitud del texto, misma unidad, todos los idiomas mantienen paridad):**

| Clave | Módulo | Longitud | Capa |
|---|---|---|---|
| `smVixDesc` (VIX) | Sentimiento (avanzado) | ~185 car. + umbrales + contexto | ✅ rica |
| `mktBondsDesc` (bonos) | Tipos de mercado (añadido tarde) | ~250–430 car. en 8 idiomas | ✅ rica |
| `partHedgeFundsDesc` | Participantes (añadido tarde) | 2–3 frases | ✅ rica |
| `mktForexDesc` (forex) | Tipos de mercado (original) | "El mercado más grande del mundo con $6.6B diarios" | ⚠️ 1 línea |
| `srSupportDesc` (soporte) | Análisis técnico (original) | "Nivel donde la presión compradora supera a la vendedora" | ⚠️ 1 línea |
| `indRSIDesc` (RSI) | Indicadores (original) | "Mide sobrecompra/sobreventa (0-100)" | ⚠️ 1 línea |
| `orderMarketDesc` | Mecánica (original) | "Ejecutar al precio de mercado actual" | ⚠️ 1 línea |

Además hay **incoherencia dentro del mismo módulo**: en "Tipos de mercado", forex/acciones/cripto/
futuros son de una línea, pero bonos/opciones/CFDs tienen 3 frases. El principiante ve un salto brusco
de profundidad dentro de la misma pantalla.

## 3. Módulos "delgados" que un principiante ve primero (a mejorar)

Priorizados por impacto para alguien nuevo:

### 🔴 Prioridad 1 — leer un gráfico (lo primero de verdad)
- **Análisis técnico → Soporte/Resistencia** (`srSupport/Resistance/Zones/Breakout`): 1 línea cada uno.
- **Análisis técnico → Tendencias** (`trendUptrend/Downtrend/Sideways/Structure`): 1 línea.
- **Análisis técnico → Indicadores** (`indSMA/EMA/RSI/MACD/BB/Fib`): 1 línea. Falta "cómo se usa,
  qué umbral, error típico". El RSI no menciona divergencias; las BB no mencionan squeeze; etc.
- **Análisis técnico → Multitemporal** (`mtfConcept/TopDown`): 1 línea.

### 🟠 Prioridad 2 — cómo colocar una operación
- **Mecánica → Tipos de orden** (`orderMarket/Limit/Stop/StopLimit/Trailing`): 1 línea. Un novato
  necesita el ejemplo ("compro a mercado y me ejecuta a 100.05 por el spread", "el stop se convierte
  en orden a mercado y puede sufrir slippage").
- **Mecánica → Criterios de bróker y plataformas**: 1 línea.

### 🟡 Prioridad 3 — qué puedo operar / qué estilo elijo / qué mueve el precio
- **Fundamentos → Tipos de mercado** finos (forex, acciones, cripto, futuros, índices, materias, ETFs):
  homogeneizar con la profundidad de bonos/opciones/CFDs.
- **Fundamentos → Participantes/Sesiones** finos (minorista, institucional, market maker, banco central;
  Asia/Londres/NY/solape): homogeneizar con los ya enriquecidos.
- **Estilos** (`styleScalping/DayTrading/Swing/Position` desc): la descripción central es de una línea
  (aunque pros/cons ayudan). Añadir "para quién es / capital y tiempo necesarios / error típico".
- **Análisis fundamental** (macro PIB/IPC/tipos/NFP/paro; calendario; ratios de acción P/E, BPA…):
  1 línea. Añadir "qué número es bueno/malo y cómo reacciona el precio".

## 4. Qué se podría AÑADIR (temas nuevos, opcional)

La amplitud ya es alta; estas son adiciones de valor real, no relleno:

1. **Ruta guiada "Empieza aquí" (0 conocimiento) — la mayor carencia.** Hoy el contenido es de
   *referencia* (rejillas de tarjetas), no una *primera lección* lineal. Falta un módulo de arranque
   tipo "Tu primera operación en 10 pasos": qué es ir largo/corto, qué es un pip/tick/lote, cómo leer
   una vela, bid/ask y spread, qué es el apalancamiento con un ejemplo numérico, cómo calcular el
   tamaño con la calculadora del sitio, y cómo cerrar. Enlazaría a las calculadoras existentes.
2. **Glosario ampliado**: hoy 20 términos; un principiante se topa con 100+. Subir a ~50–80.
3. **Impuestos por país** (hoy genérico): España (IRPF, ahorro), LatAm. Con aviso de "no es asesoría".
4. **Errores del principiante en su primer mes** (checklist de supervivencia condensada).
5. **Vídeos/animaciones** de patrones (ya estaba en backlog como idea futura).
6. **Rutas de aprendizaje con orden sugerido y "siguiente módulo"** (hoy el progreso es por módulo,
   pero no hay un "camino" recomendado 1→2→3 dentro de cada pilar).

## 5. Plan de ejecución

**Enfoque:** no añadir amplitud, sino **subir la base al nivel del resto**, manteniendo la paridad de
8 idiomas (es/en/de/fr/ru/zh/ja/ar) que el sitio ya respeta.

| Batch | Contenido | Estado |
|---|---|---|
| **A** | Análisis técnico básico: S/R, tendencias, indicadores (SMA/EMA/RSI/MACD/BB/Fib), MTF — 16 claves | ✅ hecho |
| **B** | Mecánica: tipos de orden (market/limit/stop/stop-limit/trailing), criterios de bróker, diario — 11 claves | ✅ hecho |
| **C** | Fundamentos: tipos de mercado (forex/acciones/cripto/futuros/índices/materias/ETFs) + estilos — 11 claves | ✅ hecho |
| **D** | Coherencia del tab Fundamentos: participantes (minorista/institucional/market maker/banco central) + sesiones (Asia/Londres/NY/solape) — 8 claves | ✅ hecho |
| **E** | Análisis fundamental (macro PIB/IPC/tipos/NFP/paro, calendario, ratios P/E, BPA…) — 11 claves | ✅ hecho |
| **F** | Módulo nuevo **"Empieza aquí"** (0 conocimiento): primera operación en 9 pasos + CTA a la calculadora de tamaño — 24 claves nuevas | ✅ hecho |
| **G** | Glosario ampliado (20→**60** términos) + **ejemplos visuales** (20 diagramas SVG inline) | ✅ hecho |

**Hecho en esta sesión: 57 claves enriquecidas + 24 claves nuevas, todo × 8 idiomas = 648 textos.**

**Módulo "Empieza aquí"** (`getStartHere` + bloque en `EducationPage.jsx`): es ahora el **primer tema
del pilar Empezar y la pestaña por defecto** de `/education`, para que un principiante total aterrice
ahí. 9 pasos lineales: largo/corto → leer una vela → bid/ask/spread → pip/tick/lote → apalancamiento
con ejemplo → regla del 1% → tamaño de posición → colocar la orden (entrada/SL/TP, R:R 1:2) → cerrar y
anotar. Cierra con un botón que abre la Calculadora de Tamaño de Posición (`/dashboard?tab=position`).

Cada `desc` delgada pasó del formato "1 línea" al formato de los módulos ricos:
**qué es → cómo se lee/usa → umbral o ejemplo concreto → error típico del principiante.**
Verificado con build de producción + capturas headless (Análisis Técnico, Mecánica, Fundamentos)
renderizando el texto nuevo sin errores.
