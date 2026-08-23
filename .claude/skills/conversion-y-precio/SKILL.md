---
name: conversion-y-precio
description: >-
  Trabajar el embudo de TradingCalculator.Pro: la página de precios, el muro de
  pago, la prueba de 7 días con tarjeta, el alta, el checkout y qué se mide de
  todo eso. Úsalo al tocar `PricingPage`, `SubscriptionPage`, `ProtectedRoute`,
  el flujo de registro o cualquier texto que prometa algo a cambio de dinero;
  cuando se pregunte "por qué no convierte", si subir o bajar un precio, o si
  abrir contenido gratis. Conoce los cuatro planes reales, dónde está escrito
  cada importe y qué se puede medir hoy y qué no.
---

# Conversión y precio

Este producto no tiene un embudo con fugas: tiene **un embudo del que casi no se
mide nada**. Antes de proponer un cambio de conversión, lee qué se puede saber.

## El producto, en cifras reales

| | |
|---|---|
| Planes | mensual **17 €** · trimestral **45 €** · anual **200 €** · de por vida **500 €** |
| Dónde manda el precio | `SUBSCRIPTION_PLANS` en `backend/server.py` — es lo que cobra Stripe |
| Dónde se anuncia | `<plan>Price` en los **10 idiomas** + `PLANS_DATA` en `PricingPage.jsx` |
| Prueba | **7 días con tarjeta por adelantado** (`TRIAL_PERIOD_DAYS`), sólo nuevos suscriptores y planes recurrentes |
| Muro | **todo el contenido es de pago.** Fuera quedan landing, precios, legales, contacto, sobre, `/brokers` y el flujo de alta/pago |
| Pago | Stripe · PayPal · Revolut Pay · NOWPayments (cripto) |
| Captación | **1589 páginas estáticas** que son anzuelo: título, primer párrafo y llamada a la prueba |
| Analítica | GA4 + GTM cableados |

## Lo primero, porque es un riesgo y no una oportunidad

**El importe de cada plan está escrito en doce sitios**, y el único que manda al
cobrar —`SUBSCRIPTION_PLANS`— es justamente **el que la página no consulta**:
`GET /api/plans` existe, lo devuelve, y ninguna pantalla lo llama (está en
`docs/RUTAS_MUERTAS.md` como CONSTRUIR).

Mientras siga así, subir un precio es editar doce ficheros y confiar en no
olvidar ninguno. Anunciar 17 € y cobrar 19 no es un bug: es motivo de devolución
y, en la UE, práctica comercial desleal.

```bash
python scripts/check-precios.py     # en CI: lo anunciado == lo que se cobra
```

Ese verificador es una tirita, no la cura. **La cura es que `PricingPage` lea
`/api/plans`**, y es la primera tarea de conversión que hay que hacer, antes que
cualquier prueba A/B: mover un precio hoy es más caro y más arriesgado de lo que
debería, y eso frena todo lo demás.

## Qué se puede medir hoy — y qué no

Antes de proponer «optimizar la conversión», comprueba si el número existe.

**Sí se puede saber**, con GA4/GTM ya cableados: visitas por página, origen del
tráfico, qué páginas del anzuelo SEO traen gente, y los eventos que se hayan
definido.

**No se sabe hoy**, salvo que se instrumente: cuántos llegan de la landing a
`/pricing`, cuántos empiezan el checkout, cuántos lo abandonan y en qué paso,
cuántas pruebas de 7 días se convierten en pago y cuántas se cancelan antes del
cobro. **Esa última cifra es la que decide si la prueba con tarjeta funciona**, y
sin ella cualquier discusión sobre el trial es opinión.

> **Regla de la casa aplicada aquí:** este proyecto no publica cifras que no ha
> medido. Vale igual hacia dentro — no propongas un cambio justificado con una
> tasa de conversión inventada. Si el dato no existe, la tarea es medirlo, y ésa
> es la propuesta.

## Las tres decisiones ya tomadas — no las reabras sin motivo nuevo

1. **Todo tras el muro de pago** (2026-08-02). Se descartó el modelo mixto con
   publicidad y AdSense se retiró de raíz. Proponer «abre algo gratis» es
   reabrir esa decisión: hazlo sólo con un argumento que entonces no estaba, y
   léela primero en `docs/DECISIONES.md`.
2. **Prueba con tarjeta por adelantado.** Filtra curiosos y sube la calidad del
   registro, a costa de menos altas. Es una palanca conocida, no un descuido.
3. **Sin publicidad.** No vuelve.

## Dónde tocar, y con qué cuidado

| Pantalla | Qué mirar |
|---|---|
| `pages/LandingPage.jsx` | Es la única puerta que ve un no registrado. Lleva calculadora en modo demo — el argumento de producto se demuestra antes de pedir nada |
| `pages/PricingPage.jsx` | Cuatro planes + métodos de pago. **Aquí es donde el precio debería leerse del backend** |
| `pages/SubscriptionPage.jsx` | Gestión y cancelación. Hoy **sólo se puede cancelar**: no hay pantalla de cambio de plan, aunque `POST /subscriptions/change-plan` existe y prorratea de verdad (RUTAS_MUERTAS, CONSTRUIR) |
| `components/ProtectedRoute` | El muro. Cambiar qué queda fuera es cambiar el modelo de negocio, no un detalle de UX |
| Las 1589 páginas SEO | Son anzuelo por decisión: título, primer párrafo y llamada. La receta completa **ya no se publica** |

## Reglas

- **Un texto que promete algo a cambio de dinero se cambia con el mismo cuidado
  que una cifra.** «Cancela cuando quieras», «sin compromiso» o «acceso
  ilimitado» son afirmaciones contractuales: si el código no las cumple, es
  publicidad engañosa. Compruébalas contra `SUBSCRIPTION_PLANS` y contra el flujo
  de cancelación antes de escribirlas.
- **Cualquier clave de precio nueva va en los 10 idiomas** (`i18n-check` en CI) y
  tiene que cuadrar con el backend (`check-precios.py`).
- **Nada de bonos ni incentivos en la promoción de brókers.** No es de este
  producto pero convive en la misma portada: ver `BROKERS_REFERIDOS.md`.
- **Y si propones medir algo, deja el verificador**, no la intención. Es lo que
  distingue esta skill de un artículo de blog sobre CRO.
