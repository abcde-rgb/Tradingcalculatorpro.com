Audita el estado del repositorio más allá de la rama actual.

```bash
python scripts/auditar.py
```

Tarda ~15 segundos y revisa seis frentes: trabajo sin fusionar, código que nadie
usa, restos de tecnología retirada, provisionales que llegan al usuario,
contradicciones entre la documentación y el código, y backend sin interfaz.

**Sale 0 a propósito**: es un informe, no una puerta. Con `--estricto` sale 1 si
hay hallazgos; con `--breve`, sólo el resumen.

## Cómo leerlo

El informe dice **qué mirar**, no qué arreglar. Al presentárselo al dueño:

- **Ordena por lo que cuesta dinero o riesgo**, no por severidad nominal. Una
  tarjeta de afiliado sin enlace de referido pierde comisiones cada día; quince
  paquetes de npm sin usar no le hacen daño a nadie.
- **Separa lo que puedes arreglar tú de lo que es una decisión suya.** Retirar un
  proveedor de datos por licencia es decisión de negocio con coste; borrar un
  comentario que cita una pasarela muerta, no.
- **No lo repitas entero cada sesión.** Si ya se lo dijiste y no ha cambiado, di
  sólo lo que es nuevo.

## Si un hallazgo es un falso positivo

No lo silencies con un caso especial: **arregla la regla** en
`scripts/auditar.py` y explica en un comentario por qué era ruido. Ya pasó tres
veces —`placeholder` casaba con CSS, `TODO` con la palabra española «todo», `XXX`
con la notación de divisas— y un informe con ruido se deja de leer, que es la
única forma de que esto deje de servir.
