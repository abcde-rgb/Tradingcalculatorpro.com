# Prototipos de escáner

Seis terminales, uno por escáner de [`docs/BRIEF-ESCANERES.md`](../docs/BRIEF-ESCANERES.md) §4.
**Se abren haciendo doble clic**: son autocontenidos, sin build, sin servidor y sin
dependencias locales.

| Fichero | Escáner | Detectores conectados |
|---|---|---|
| `e1-orderflow.html` | Microestructura ejecutada | OFI · desequilibrio de cola · CVD · absorción · prints en bloque · barrido |
| `e2-liquidez-oculta.html` | Liquidez no mostrada | reposición de nivel · ejecutado sobre visible · nivel persistente + escalera L2 |
| `e3-estructura-volumen.html` | Teoría de subasta | perfil de volumen (POC/VAH/VAL) · VWAP |
| `e4-volatilidad-regimen.html` | Régimen | Hurst por DFA · entropía de permutación · volatilidad realizada |
| `e5-posicionamiento.html` | Derivados | interés abierto · financiación · cuadrante OI×precio · liquidaciones |
| `e6-patrones-estadisticos.html` | Estadística | z robusto (MAD) · números redondos (Osler) · tabla con p y **q de Benjamini-Hochberg** |

## Datos

Tiempo real de **Binance**, sin clave y sin coste (`data-stream.binance.vision`,
mercado al contado). El agresor de cada operación es el **real del exchange**, no una
inferencia. E5 usa además los flujos de futuros (`fstream.binance.com`).

> ⚠️ **En el sandbox remoto de Claude Code, Binance está bloqueado.** Ahí los prototipos
> muestran «reconectando…» y todos los valores como no disponibles — que es exactamente
> lo que R1 manda hacer. Para verlos con datos, ábrelos en tu navegador.

## Lo generado no se edita a mano

```bash
node scripts/gen-prototipos.js     # reconstruye los seis .html
node scripts/test-escaneres.js     # 60 comprobaciones de los detectores
node scripts/check-escaneres.js    # puerta de cumplimiento §9
```

Se edita `_core.js` (contratos, adaptador de Binance, detectores) o `_vistas.js` (las
seis interfaces) y se vuelve a generar. Las funciones `init` se serializan con
`Function.prototype.toString()`, así que en el repo se escriben como código normal.

## Las tres reglas que sostienen todo esto

1. **Ningún dato fabricado.** No hay un `Math.random()` en el núcleo y hay una prueba
   que lo comprueba. Sin conexión, el OFI **no vale cero**: vale «no disponible».
2. **Detección separada de interpretación.** Cada detector publica su hecho medido y su
   **veredicto de evidencia** (Sólido / Mixto / Sin base) con la cita, al pie de cada
   pantalla. VPIN va marcado Mixto con las dos posturas de su disputa.
3. **Nada de vocabulario de recomendación.** `check-escaneres.js` hace fallar el build si
   aparece en la interfaz, y admite escapes sólo con justificación escrita en la línea.
