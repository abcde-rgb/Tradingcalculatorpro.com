# 📈 Personalización de TradingView por usuario — qué se puede y hasta dónde

> Responde a: *"¿hasta dónde es posible ajustar para cada usuario el activo, el análisis
> (indicadores), la temporalidad…?"*
> Estado del código: `frontend/src/components/charts/TradingViewChart.jsx` usa el **embed
> gratuito** (`https://s.tradingview.com/widgetembed/…`) dentro de un `<iframe>`.

---

## 1. Lo que YA se personaliza por usuario (hoy)

| Ajuste | ¿Personalizable? | ¿Persiste? | Dónde |
|---|:--:|:--:|---|
| **Activo** (símbolo) | ✅ | ✅ | `useAssetsStore` (`lib/assets.js`) — 47 activos / 6 categorías |
| **Categoría** | ✅ | ✅ | `useAssetsStore.selectedCategory` |
| **Favoritos** | ✅ | ✅ | `useAssetsStore.favorites` (estrella) |
| **Temporalidad** | ✅ (9: 1m–1M) | ✅ | `usePersistedState('tradingview_chart')` |
| **Pantalla completa** | ✅ | ✅ | mismo `usePersistedState` |
| **Tema** (claro/oscuro/sistema) | ✅ | ✅ | `useThemeStore` |
| **Idioma del widget** | ✅ (8) | ✅ | `TV_LOCALE_MAP` |
| **Indicadores / estudios** | ⚠️ fijo (RSI) | ❌ | `studies=RSI%40tv-basicstudies` en la URL del iframe |
| **Dibujos (líneas, fibos…)** | ❌ | ❌ | El embed no expone API de guardado |
| **Layouts guardados** | ❌ | ❌ | No disponible en el embed |

> La persistencia es **local del navegador** (`usePersistedState`/Zustand). No se sincroniza
> entre dispositivos (mismo límite que BUG-007).

**Conclusión:** activo, categoría, favoritos, temporalidad, tema e idioma ya son
**por-usuario y persistentes**. Lo que **no** se puede hoy: que cada usuario configure **sus
indicadores**, **dibuje** sobre el gráfico y **guarde su análisis/layout**.

---

## 2. Por qué: límites del embed gratuito

El widget `widgetembed` es un iframe de TradingView pensado para mostrar, no para editar y
guardar. No ofrece:
- API para leer/escribir el estado del gráfico (indicadores activos, dibujos).
- Persistencia de layouts por usuario.
- Control programático fino (añadir/quitar estudios desde tu app en caliente).

Puedes pasar más `studies=` por la URL (separados por coma, URL-encoded) como **valor por
defecto**, pero el usuario no puede guardar los suyos ni recuperarlos.

---

## 3. Caminos para personalización real (de menor a mayor esfuerzo)

### Opción A — Seguir con el embed, ampliar los valores por defecto  ⏱️ horas
- Permitir elegir entre **varios presets de indicadores** (p. ej. "RSI+MACD", "Bollinger",
  "EMAs") y pasarlos vía `studies=`.
- Guardar **el preset elegido** por usuario en `usePersistedState` (no los dibujos).
- **Límite:** sigue sin dibujos ni layouts; es "elige un set", no "configura libremente".

### Opción B — Librería **Advanced Charts** de TradingView (recomendada)  ⏱️ 2–4 días
Es la solución "de verdad" para personalización por usuario.
- **Qué es:** librería JS gratuita de TradingView (NO el embed), que se **auto-aloja** y se
  obtiene solicitando acceso en https://www.tradingview.com/advanced-charts/ (aprueban repos).
- **Permite:** que cada usuario añada N indicadores, **dibuje**, y que tú **guardes/cargues su
  layout** mediante el `save_load_adapter`.
- **Trabajo backend necesario** (con el shim de BD, sin SQL directo):
  ```
  POST   /api/chart/layouts              # guardar un layout (JSON) del usuario
  GET    /api/chart/layouts              # listar layouts del usuario
  GET    /api/chart/layouts/{id}         # cargar uno
  DELETE /api/chart/layouts/{id}
  GET/POST /api/chart/study-templates    # plantillas de indicadores
  GET/POST /api/chart/drawings           # (opcional) dibujos como objeto
  ```
  Colección sugerida: `db.chart_layouts` con `{id, user_id, name, content(JSONB), updated_at}`.
- **Trabajo frontend:** implementar `save_load_adapter` (interfaz que define TradingView) que
  llame a esos endpoints con `withCredentials: true`; instanciar el widget con
  `charting_library` apuntando a un `datafeed` (puedes usar tu backend yfinance como datafeed
  UDF, o el datafeed de muestra para empezar).
- **Datos (datafeed):** para velas propias puedes exponer un **datafeed UDF** sobre tus
  endpoints OHLC (`/api/ohlc/{symbol}`, `/api/ohlc-universal/{symbol}`) — ya existen.

### Opción C — `lightweight-charts` (ya es dependencia)  ⏱️ variable
- **`lightweight-charts@^5.1.0` YA está en `package.json`** pero el chart principal usa el
  embed. Sirve para gráficos propios ligeros (velas, líneas, algún overlay) con control total
  del render, alimentados por tus endpoints OHLC.
- **Límite:** NO trae indicadores ni herramientas de dibujo "de fábrica"; tendrías que
  construir cada indicador/dibujo. Bueno para mini-charts; no para reemplazar TradingView.

---

## 4. Recomendación

1. **Corto plazo (Opción A):** añade presets de indicadores seleccionables y persiste la
   elección por usuario. Mejora percibida alta, coste bajo. (P2 en el backlog.)
2. **Medio plazo (Opción B):** migrar a **Advanced Charts** + `save_load_adapter` para
   layouts/indicadores/dibujos **por usuario y cross-device** (guardados en backend). Es lo que
   iguala la experiencia a la del propio TradingView y a competidores que integran su librería.
3. Aprovecha que ya tienes endpoints OHLC y `lightweight-charts` instalado para los
   **mini-gráficos** del dashboard/opciones, reservando Advanced Charts para el gráfico grande.

> Nota legal: respeta los términos de TradingView (atribución y registro de la librería). El
> embed actual ya cumple; Advanced Charts requiere solicitar acceso y cumplir su licencia.

---

## 5. Para implementarlo, ¿por dónde empezar?

Ver receta **§9** en [`GUIA_EXTENSION.md`](./GUIA_EXTENSION.md) (ajustes del gráfico) y los
endpoints propuestos en §3-B de este documento. Cuando se haga, actualizar el inventario y el
backlog en [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) (hueco **G-05**).
