# WebMCP — herramientas para agentes de IA en el navegador

> Nuevo el 2026-08-31. Antes de esta sesión no existía nada de esto en el repo
> —ni código ni documento—, así que no hay versión previa que "recuperar".

## Qué es

[WebMCP](https://webmachinelearning.github.io/webmcp/) es una propuesta del W3C
Web Machine Learning Community Group (autoría de Google y Microsoft) que deja a
una web exponer sus funciones como herramientas tipadas para un agente de IA que
navega el sitio, en vez de que el agente interprete la pantalla a base de píxeles
y clics. El agente llama a `navigator.modelContext.registerTool(...)` con un
JSON Schema de entrada y recibe una respuesta estructurada.

Estado a 2026-08-31: **origin trial en Chrome 149–156**, sin soporte nativo
todavía (previsto para la segunda mitad de 2026). Fuera de Chrome con el trial
activado, `navigator.modelContext` no existe.

## Qué expone este sitio — y qué NO

`frontend/src/lib/webmcp.js` registra dos herramientas, ambas sobre el motor de
la mesa (`lib/deskMath.js` + `lib/instruments.js`), que es el que tiene
`engine-check` detrás:

- **`calcular_tamano_posicion`** — capital, riesgo, entrada y stop → cantidad,
  nocional, margen, R:R y liquidación estimada. Es la misma cadena que usa
  `TradingDesk.jsx`: `resolveSpec` → `riskBudget` → `maxSizes` → `positionMetrics`.
- **`calcular_valor_pip`** — cantidad de un instrumento → valor del pip/tick en
  su divisa cotizada y convertido a la divisa de la cuenta (`pipValue`).

**A propósito NO se exponen las 14 calculadoras sueltas del modo básico.**
`LotSizeCalculator` sigue dando 10 $/pip fijo (falso en USDJPY, oro y cualquier
cruce sin dólar) y `PositionSizeCalculator` pinta el símbolo a mano — es el
hueco G-33, sin cerrar. Publicar esas cifras como una API con apariencia
oficial es peor que no publicarlas: un agente confía en la respuesta de una
tool sin verla, mientras que un humano delante de la calculadora rota puede
notar que algo no cuadra. Cuando G-33 cierre y las 14 calculadoras corran sobre
`deskMath.js`, tiene sentido ampliar aquí.

Tampoco se expone opciones: una pata suelta no es la pérdida máxima de una
estructura completa (G-34), así que el número sería técnicamente correcto y
prácticamente engañoso para un spread o un iron condor.

## Honestidad numérica, igual que en el resto del sitio

Las mismas tres reglas de `CLAUDE.md` aplican aquí, verificadas en
`engine-check.js` (bloque `webmcp.js`, 6 comprobaciones):

- Riesgo por encima del tope duro del 10 % → **bloqueado**, no recortado en
  silencio.
- Capital que no llega ni al escalón mínimo del instrumento → **`null`**
  (`below_min_step`), no un tamaño de cero unidades.
- Futuros sin apalancamiento explícito → **bloqueado** (`no_default_leverage`),
  no calculado con un 1x inventado. El catálogo no tiene un apalancamiento por
  defecto para futuros porque varía por contrato y bróker, no por producto —
  meterlo silenciosamente daría un margen y un tope por margen que no
  significan nada.

## Cómo se registra

`App.js` monta `<WebMcpTools />` (mismo patrón que `<CloudPrefsSync />`): un
componente que no pinta nada y llama a `registerWebMcpTools()` una vez al
arrancar. La función comprueba `navigator.modelContext` antes de tocar nada —
en cualquier navegador sin el origin trial activado es un no-op silencioso, no
un error.

## Lo que falta y NO se puede cerrar desde el repo

- **El origin trial de Chrome exige un token por origen.** Sin registrar
  `tradingcalculator.pro` en <https://developer.chrome.com/origin-trials> y sin
  añadir el token (meta `origin-trial` o cabecera `Origin-Trial`), las
  herramientas se registran igualmente en el DOM pero **Chrome no las expone a
  ningún agente real** hasta que el token esté. Operativo, como Stripe o el
  origen de Google OAuth — lo hace el dueño, no el repo. Mientras tanto el
  código no rompe nada: `navigator.modelContext` puede o no existir según el
  build de Chrome, y todo está detrás del feature-detect.
- **No hay verificación en un Chrome real.** Este entorno no tiene un
  navegador con el origin trial activo; lo verificado es la aritmética pura
  (`engine-check`) y que el registro no lanza cuando `navigator.modelContext`
  no existe. Falta probarlo con DevTools o un agente real una vez esté el
  token.
- **Ampliar cobertura es una decisión de producto**, no sólo técnica: cada
  tool nueva es superficie que hay que mantener honesta. G-33 primero.
