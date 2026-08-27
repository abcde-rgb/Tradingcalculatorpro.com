# Kunfupay como sustituto de Stripe

**Fecha**: 2026-08-26 · **Estado**: estudio, **nada adoptado ni integrado** ·
**Pregunta**: ¿puede Kunfupay sustituir a Stripe en TradingCalculator.Pro, por el momento?

---

## Veredicto en cuatro líneas

**No sustituye a Stripe entero, y no hace falta que lo haga.** Apagar Stripe hoy no deja
la web sin cobrar: ya hay tres raíles que no pasan por Stripe (PayPal, Revolut Pay,
NOWPayments) y funcionan sin tocar una línea. Lo que Stripe se lleva al irse es la
**renovación automática**, la **prueba de 7 días**, SEPA, Klarna, el portal de cliente y
el reembolso de un clic.

**Kunfupay puede entrar como cuarto raíl y aporta dos cosas que ninguno de los tres
tiene**: cobro con métodos locales de LatAm (PIX, Nequi, Yape, OXXO, Mercado Pago) y
Bizum en España, y **Merchant of Record** — el IVA deja de ser problema nuestro. Pero
todo depende de un dato que **no he podido verificar**: si tienen API y webhook firmado.
Sin eso no hay integración, sólo enlaces de pago y concesión manual.

---

## 0. Lo que no se ha podido verificar (leer antes que nada)

`kunfupay.com` **está bloqueado por el proxy de salida** de este entorno remoto
(`EGRESS_BLOCKED`), igual que `ecosistemastartup.com`. No he podido abrir su web, su FAQ,
sus condiciones ni su panel.

Todo lo que sigue sobre Kunfupay sale de **material indexado por buscador**: su propio
marketing, notas de prensa, y fichas de Crunchbase/Tracxn. Y hay un dato que **es un
hallazgo en sí mismo**:

> **No hay una referencia de API de Kunfupay indexada en ningún sitio.** Ni en su dominio,
> ni en un repositorio, ni como integración de Zapier. Sus propios textos dicen que se
> puede «integrar suscripciones y pagos globales en tu aplicación en unas horas», pero no
> dicen cómo.

> ⚠️ **Corrección del 2026-08-26, misma fecha, más tarde.** La primera versión de este §
> decía que «no existe documentación técnica indexada **ni `docs.kunfupay.com`**». Eso era
> falso: **`docs.kunfupay.com` existe y está indexado** («Kunfupay: Cobra en todo el mundo
> como creador»). Por lo que se ve de su contenido indexado es **documentación de usuario**
> —cobros, suscripciones con acceso nativo a Telegram, automatizaciones, su asistente
> «Sensei»—, no una referencia de API con endpoints y webhooks. También existe
> `business.kunfupay.com`. Los tres siguen bloqueados desde aquí, así que lo que contienen
> exactamente sigue sin poder comprobarse; lo que cambia es que **hay dónde mirar**, y es
> lo primero que hay que abrir desde un navegador normal.

Es el mismo caso que [`PROVEEDORES_DATOS.md`](./PROVEEDORES_DATOS.md): **ninguna
afirmación técnica de este documento está confirmada contra el proveedor**. El § 5 es la
lista exacta de preguntas que hay que hacerles antes de decidir nada.

**Sí se pudo leer una fuente primaria** (añadido el 2026-08-26): sus *Condiciones de uso,
privacidad y protección de datos*, 13 páginas en PDF, servidas desde un bucket de S3 que
**no está bloqueado**. De ahí sale el § 12, y de ahí sale la corrección de la ficha del
§ 1.

---

## 1. Qué es Kunfupay

| | |
|---|---|
| Entidad | **KUNFU GLOBAL INC**, sociedad de **Delaware** inscrita el **14/07/2025** (registro 10259941, EIN 39-3235422), dirección en Hialeah, Florida. *Fuente: sus propias Condiciones de uso.* La prensa y Crunchbase la describen como «fintech española fundada en 2022» con 2-10 empleados; su documento legal dice otra cosa (§ 12) |
| Modelo | **Merchant of Record** (MoR): ellos son el comercio registrado y asumen facturación, IVA, reembolsos y cumplimiento |
| Producto | Checkout con métodos locales + wallet + tarjeta VISA + panel de creador («Creator OS») |
| Métodos | PIX (BR), Nequi (CO), Yape (PE), OXXO (MX), Pago Móvil (VE), Mercado Pago (AR), **tarjeta y Bizum (ES)** |
| Comisión | **Transaccional, ~5-10%** según negocio, métodos y ticket medio. Sin cuota mensual ni coste fijo |
| Liquidación | **Semanal**, a la wallet; desde ahí retirada en moneda local o cripto, o gasto con su tarjeta |
| Escala | >10 M€ transaccionados, 20 países, ~2.000 creadores, ~300 comunidades |
| Nicho declarado | Creadores, academias, comunidades de pago y **señales de trading** |

La diferencia de fondo con Stripe no es la comisión, es **quién vende**: con Stripe el
comercio eres tú (tú emites factura, tú declaras el IVA, tú respondes del chargeback);
con Kunfupay el comercio son ellos y tú les vendes a ellos.

---

## 2. Qué hace Stripe hoy en este repositorio

Inventario real, no de memoria (`grep`: **152 menciones** sólo en `server.py`):

| Capacidad | Dónde | Notas |
|---|---|---|
| Checkout hospedado por plan | `server.py:3816` `_create_stripe_session` | usa `stripe_price_id` de `SUBSCRIPTION_PLANS` |
| **Suscripción con renovación automática** | ídem, `mode="subscription"` | **sólo Stripe**. Los otros tres raíles cobran una vez |
| **Prueba de 7 días con tarjeta** | `server.py:3966` + `TRIAL_PERIOD_DAYS` (`:3813`) | sólo si nuevo, sin `stripe_subscription_id` y sin `trial_used` |
| Alta de premium | `server.py:4118` `_activate_paid_subscription` | común a los cuatro raíles |
| Webhook de ciclo de vida | `server.py:4161` | `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed` (revoca al 3.º intento), `customer.subscription.updated` |
| Portal de cliente | `server.py:4655` | `stripe.billing_portal` — método de pago y facturas |
| Historial de facturas | `server.py:4690` | lee facturas de Stripe |
| Cancelar / reanudar | `server.py:4550` / `4609` | `Subscription.delete` / `cancel_at_period_end` |
| Reembolso desde admin | `server.py:8541` | `stripe.Refund.create` sobre el `charge_id` |
| SEPA y Klarna | `_PAYMENT_METHODS_MAP` | Klarna sólo en el plan De Por Vida |
| Conciliación y salud de webhooks | `server.py:8693` / `8834` | |

Y lo que **no** hace, aunque los Términos digan que sí (ver § 7).

---

## 3. Apagar Stripe hoy: qué se cae exactamente

Esto es lo primero que hay que tener claro, porque cambia la urgencia del resto.

**Sigue cobrando sin tocar código**: PayPal, **Revolut Pay** y **NOWPayments** (cripto).
Los tres crean el cobro contra `payment_transactions` y conceden premium desde un webhook
con firma verificada. Del checkout hospedado de Revolut dice el comentario del propio raíl
—`server.py:3900`— que muestra además Apple Pay / Google Pay en dispositivos elegibles;
conviene confirmarlo con un cobro real antes de apoyar el negocio entero en él.

**Se cae**:

1. **La renovación automática.** Los tres raíles no-Stripe pasan por
   `_activate_paid_subscription` (`server.py:4118`), que concede `plan["days"]` y pone fecha de fin. Cuando
   caduca, el usuario tiene que volver a pagar a mano. No hay cargo recurrente.
2. **La prueba de 7 días.** `METODOS_CON_PRUEBA = ['card','sepa','klarna']`
   (`PricingPage.jsx:68`) — sólo raíl Stripe. Si se apaga Stripe, **hay que quitar la
   promesa de la copy y de los Términos**, no sólo el badge.
3. **SEPA y Klarna** (el De Por Vida de 500 € pierde el pago aplazado).
4. **El portal de cliente y el historial de facturas** — devuelven 404 sin
   `stripe_customer_id`; a un usuario que nunca pagó por Stripe no le rompen nada, pero
   dejan de existir como funcionalidad.
5. **El reembolso de un clic desde admin** (necesita `charge_id` de Stripe).
6. **La revocación automática por impago** (`invoice.payment_failed`). Sin recurrencia
   deja de tener sentido, pero conviene saberlo.

---

## 4. Qué de todo eso cubriría Kunfupay

| Capacidad | ¿Kunfupay? | Con qué evidencia |
|---|---|---|
| Cobro con tarjeta | ✅ | Checkout propio; tarjeta y Bizum en España |
| **Métodos locales LatAm** | ✅ **gana a los cuatro raíles actuales** | PIX, Nequi, Yape, OXXO, Mercado Pago |
| Cobro recurrente | ⚠️ **dicen que sí** | «crear planes mensuales, trimestrales o anuales y generar un **enlace de cobro recurrente**». No sé si es cargo automático o recordatorio de pago. **Pregunta 3 del § 5** |
| Webhook para conceder premium | ❓ **sin verificar** | Es la pregunta que decide todo. Su control de acceso automático documentado es **nativo de Telegram/Discord**, no genérico |
| Prueba gratuita de 7 días con tarjeta | ❓ | Nada indica que guarden método de pago para cobrar el día 8 |
| Portal de cliente / facturas | ⚠️ distinto | Como MoR, la factura la emiten ellos al cliente final. No es «portal de Stripe», es su panel |
| Reembolsos | ✅ conceptualmente | MoR: «asumen facturación, reembolsos y cumplimiento». ¿Desde API o sólo desde su panel? |
| SEPA / Klarna | ❌ | No aparecen en su lista de métodos |
| **IVA / OSS** | ✅ **gana a Stripe** | Ver § 7 |
| Documentación para integrarlo | ❌ hoy | § 0 |

---

## 5. Las diez preguntas que hay que hacerles antes de escribir una línea

Las tres primeras **deciden si hay integración o no**:

1. ¿Hay **API REST** para crear un cobro desde nuestro servidor, con una **referencia
   propia** (nuestro `payment_transactions.id`) viajando en el cobro? ¿Documentación?
2. ¿Hay **webhook firmado** (HMAC, y con qué secreto) al confirmarse el pago, que
   devuelva esa referencia? ¿Reintenta si respondemos 500?
3. La suscripción, ¿es **cargo automático** en el método de pago del cliente, o es un
   enlace que hay que volver a pagar cada periodo?
4. ¿Hay evento de **baja o impago** para revocar el acceso, o eso lo tenemos que mirar
   nosotros contra fecha de caducidad?
5. ¿Soportan **prueba gratuita con método de pago guardado** y primer cargo al día 8?
6. ¿El **reembolso** se puede lanzar por API, o sólo desde vuestro panel?
7. **Comisión exacta y por escrito** para: producto digital tipo SaaS, tickets de 17 €,
   45 €, 200 € y 500 €, precio en EUR, compradores de España, UE y LatAm. ¿Coste de
   retirada a IBAN? ¿Recargo por conversión de divisa?
8. Como MoR: ¿la **factura al cliente final** la emitís vosotros, con vuestro NIF y el
   IVA del país del comprador? ¿Quién asume el **chargeback**? ¿El precio que configuro
   es **IVA incluido**? (Crítico: nuestros precios se anuncian en 12 sitios y
   `scripts/check-precios.py` falla en CI si lo anunciado no es lo cobrado. Si añadís
   IVA **encima** de 17 €, la web estará anunciando un precio que no es el que se cobra.)
9. ¿Aceptáis un producto que es **software de cálculo para traders** — calculadoras,
   diario, escáner — sin señales, sin gestión de dinero ajeno y sin promesas de
   rentabilidad? Por escrito, antes de integrar.
10. ¿Cuál es la **entidad legal**, dónde está registrada y bajo qué licencia o agencia
    opera (entidad de pago / EDE / agente de un tercero)? Hace falta para el § de
    encargados del tratamiento del RGPD y para saber dónde duerme el dinero.

---

## 6. Dinero

Comisión de Stripe España, tarifa estándar publicada: **1,5% + 0,25 €** (tarjeta estándar
del EEE), 1,9% + 0,25 € (prémium EEE), ~3,15% + 0,25 € (internacional) + 2% si hay
conversión. Kunfupay: **5-10%** (horquilla suya, sin coste fijo).

Coste por cobro, sobre los cuatro planes reales de `SUBSCRIPTION_PLANS`:

| Plan | Precio | Stripe (EEE) | Kunfupay 5% | Kunfupay 10% | Diferencia |
|---|---|---|---|---|---|
| Mensual | 17 € | 0,51 € (3,0%) | 0,85 € | 1,70 € | +0,34 … +1,19 € |
| Trimestral | 45 € | 0,93 € (2,1%) | 2,25 € | 4,50 € | +1,32 … +3,57 € |
| Anual | 200 € | 3,25 € (1,6%) | 10,00 € | 20,00 € | +6,75 … +16,75 € |
| De Por Vida | 500 € | 7,75 € (1,6%) | 25,00 € | 50,00 € | +17,25 … +42,25 € |

Con 100 suscriptores mensuales (20.400 €/año facturados): **~612 €/año** de comisión con
Stripe frente a **1.020-2.040 €/año** con Kunfupay. Entre 400 y 1.400 € al año de
diferencia.

**Contra eso hay que restar lo que hoy no se paga porque no se hace**: el IVA OSS. Un
gestor o una herramienta tipo Quaderno cuestan del orden de cientos de euros al año, y
Stripe Tax cobra aparte y **sigue sin presentar la declaración por ti**. Con MoR ese
trabajo y ese coste desaparecen. La comparación honesta no es 1,5% contra 5-10%: es
1,5% + cumplimiento fiscal propio contra 5-10% con el cumplimiento incluido.

---

## 7. Lo que Kunfupay arregla y Stripe no

### 7.1 El IVA que los Términos prometen y el código no calcula

Los Términos, en los diez idiomas, dicen (`frontend/src/lib/legalContent/es.js:134`):

> «El IVA aplicable se calcula en el momento del pago según tu país de residencia y **se
> muestra desglosado** antes de que confirmes la compra».

`_create_stripe_session` **no pasa `automatic_tax`**, y `grep -rn "automatic_tax|Stripe
Tax" backend/*.py` no devuelve nada. Hoy el checkout cobra 17 € planos, sin desglose y
sin determinación de país. Es decir: **el texto legal describe algo que el código no
hace**, y eso es anterior a Kunfupay y sigue ahí con o sin él.

Con un MoR el problema no se arregla escribiendo código: **deja de ser tuyo**. Es, con
diferencia, el argumento más fuerte a favor de Kunfupay en este caso concreto, y no tiene
nada que ver con las comisiones.

### 7.2 El nicho

Stripe trata el trading y las señales como categoría de riesgo y cierra cuentas por ello
sin previo aviso. Kunfupay se anuncia justo al revés: «referencia en nichos como
**señales de trading**, gaming, viajes y academias digitales». Si el motivo de buscar
sustituto es que Stripe puso pegas, esto no es un detalle: es el motivo entero.

### 7.3 La cobertura que hoy no hay

La web habla diez idiomas, español y portugués incluidos. Hoy un comprador brasileño sólo
puede pagar con tarjeta internacional, PayPal o cripto. Con PIX, paga como paga todo lo
demás.

---

## 8. Riesgos

- **Proveedor pequeño y joven** (2022, 2-10 empleados) frente a Stripe. Y el dinero
  **duerme en su wallet** hasta la liquidación semanal: el riesgo de contraparte es
  concentrado y no marginal.
- **No he podido verificar su licencia ni su registro** (§ 0). Antes de mover los cobros
  ahí, eso se comprueba en el registro del Banco de España, no en su web.
- **MoR cambia los legales**: quién vende, quién factura, quién responde del desistimiento
  y del chargeback. Hay que reescribir Términos y el apartado de encargados del RGPD —
  hoy nombran a Stripe, PayPal, Revolut y NOWPayments uno por uno.
- **Comisión de 3 a 6 veces la de Stripe** en tarjeta del EEE.
- **Integrar contra una API sin documentación pública** significa escribir código contra
  un contrato que sólo conoce su soporte, y que puede cambiar sin changelog.
- **Si la recurrencia no es cargo automático**, la caja pasa de suscripción a pago único
  repetido: cambia la retención, cambia el LTV y cambia lo que anuncia la página de
  precios.

---

## 9. Recomendación: tres fases

### Fase 0 — hoy, sin depender de Kunfupay (≈1 h de trabajo)

Si Stripe no está disponible, **la web ya puede cobrar**. Ocultar las tarjetas `card`,
`sepa` y `klarna` de `PAYMENT_METHODS_DATA` (`PricingPage.jsx:30`) tras una bandera, y
dejar Revolut Pay + PayPal + cripto. Con ello:

- **hay que retirar la prueba de 7 días** de la copy, del badge y de los Términos, porque
  fuera del raíl Stripe no existe (`METODOS_CON_PRUEBA`);
- hay que decir en la página que la suscripción **no se renueva sola** y caduca;
- **no se borra el código de Stripe**. Es una bandera de configuración, no una amputación:
  sin `STRIPE_API_KEY` el backend ya arranca con un aviso (`server.py:1097`) y G-01 sigue
  abierto para el día que Stripe vuelva.

### Fase 1 — preguntar (§ 5)

Sin respuesta a las preguntas 1, 2 y 3, no hay decisión que tomar: no hay integración
posible, sólo enlaces manuales.

### Fase 2A — hay API + webhook firmado → integrar (≈1 día, riesgo bajo)

El patrón ya está escrito dos veces en este repo. `backend/kunfupay.py` sería un calco de
`backend/revolut.py` (215 líneas: `create_order`, `verify_webhook`, `parse_webhook`,
`webhook_order_ref`, `webhook_is_paid`). Ficheros a tocar:

1. `backend/kunfupay.py` — nuevo, sobre el molde de `revolut.py`.
2. `backend/server.py` — una rama `elif payment_method == "kunfupay"` en
   `/checkout/create` (~30 líneas) y un `/webhook/kunfupay` calcado del de Revolut
   (verificación de firma, reclamo atómico de la transacción, `_activate_paid_subscription`).
3. `frontend/src/pages/PricingPage.jsx` — una entrada en `PAYMENT_METHODS_DATA`.
4. `frontend/src/lib/i18n/*.js` — `kunfupayPayment` y `kunfupayDesc` en **los diez
   idiomas** (`i18n-check.js` falla si falta uno).
5. `backend/tests/` — test del webhook con firma buena, firma mala y reenvío duplicado.
6. Legales: si es MoR, § 7 obliga a reescribir Términos y encargados del RGPD.

### Fase 2B — no hay API → enlace + concesión manual

Enlace de pago de su panel, y premium concedido con
`POST /api/admin/payments/{transaction_id}/grant` (`server.py:8781`), que ya existe, es
idempotente, exige que la transacción esté pagada y queda en el registro de auditoría.
Funciona, pero alguien tiene que mirar su panel y cruzar el email con la transacción a
mano. **Aceptable por debajo de ~20 pagos al mes; insostenible por encima.** Y no da
renovación, ni prueba, ni revocación.

---

## 10. Qué no hacer

- **No borrar el código de Stripe.** G-01 (Stripe en producción sin verificar) es un hueco
  de operación, no de código: el checkout y los webhooks están escritos y probados.
- **No tocar `legalContent/*.js` hasta decidir el MoR.** Si Kunfupay factura como
  vendedor, cambia quién vende, no sólo un nombre en una lista de proveedores.
- **No meter su API key en `app_settings`.** Es exactamente C-08 (claves en claro en BD).
  Secret Manager.
- **No anunciar la prueba de 7 días en un raíl que no la tiene.** Ya pasó una vez y está
  documentado en el comentario de `PricingPage.jsx:59-67`.
- **No configurar los precios sin resolver la pregunta 8.** Si Kunfupay añade IVA encima
  del importe, la web anuncia 17 € y el cliente paga más: motivo de devolución y práctica
  desleal en la UE (es literalmente lo que `scripts/check-precios.py` existe para impedir).

---

## 11. ¿Cuál renta más? (añadido el 2026-08-26, a pregunta directa)

### 11.1 La comisión no es la variable que decide

Lo que decide es **si el cobro se renueva solo**. Un plan mensual de 17 € que hay que
volver a pagar a mano cada 30 días no es una suscripción: es una venta que se repite si
el cliente se acuerda. Con supuestos de sector —**no medidos en esta web, aquí no hay
todavía datos propios que medir**— y 100 suscriptores mensuales:

| Escenario | Vida media | Ingreso por cliente | Por 100 clientes |
|---|---|---|---|
| Cargo automático, fuga del 8 %/mes | 12,5 meses | ~212 € | ~21.200 € |
| Pago manual, vuelve el 70 % cada mes | 3,3 meses | ~56 € | ~5.600 € |
| Pago manual, vuelve el 50 % cada mes | 2 meses | ~34 € | ~3.400 € |

La diferencia entre la primera fila y las otras dos es de **cuatro a seis veces**. La
diferencia de comisión entre Stripe y Kunfupay, sobre ese mismo cobro de 17 €, es de
**0,34 € a 1,19 €**. No es una comparación reñida: quien te dé cargo recurrente
automático gana, aunque cobre el doble de comisión.

Corolario incómodo, y es lo que hay hoy: **PayPal, Revolut y NOWPayments, tal como están
integrados aquí, son la fila de abajo de esa tabla.** Conceden `plan["days"]` y caducan.

### 11.2 Y cuando sí toca mirar la comisión, Stripe no es tan barato como parece

El 1,5 % + 0,25 € es la tarifa de **tarjeta del EEE**. Un comprador de LatAm paga con
tarjeta internacional: **3,15 % + 0,25 €**, más un 2 % adicional si hay conversión de
divisa. Y si algún día se activa Stripe Tax para cumplir lo que prometen los Términos
(§ 7.1), son **0,5 puntos más** — y aun así Stripe **no presenta** la declaración
por ti.

Coste real del cobro, por plan:

| Plan | Stripe (EEE) | Stripe (internacional) | Stripe int. + Tax | Kunfupay 5 % | Kunfupay 10 % |
|---|---|---|---|---|---|
| 17 € | 0,51 € (3,0 %) | 0,79 € (4,6 %) | 0,87 € (5,1 %) | 0,85 € | 1,70 € |
| 45 € | 0,93 € (2,1 %) | 1,67 € (3,7 %) | 1,89 € (4,2 %) | 2,25 € | 4,50 € |
| 200 € | 3,25 € (1,6 %) | 6,55 € (3,3 %) | 7,55 € (3,8 %) | 10,00 € | 20,00 € |
| 500 € | 7,75 € (1,6 %) | 16,00 € (3,2 %) | 18,50 € (3,7 %) | 25,00 € | 50,00 € |

Dos lecturas que no se ven en la horquilla «1,5 % contra 5-10 %»:

1. **Para un comprador de LatAm en el plan mensual, Stripe con Tax cuesta 5,1 % y
   Kunfupay al 5 % cuesta 5,0 %** — con el IVA resuelto y con PIX o Nequi en el checkout.
   Ahí Kunfupay no es más caro: es más barato y convierte mejor.
2. **En tickets grandes Stripe gana sin discusión.** En el De Por Vida de 500 €, la
   diferencia va de 9 € a 34 € por venta.

Y el coste fijo del cumplimiento propio (registro OSS + presentación trimestral, del
orden de 400-600 €/año) **se diluye con el volumen**: por debajo de unos 20.000 €/año
facturados a compradores del EEE, ese coste fijo se come la ventaja de comisión de
Stripe; por encima, Stripe se separa y no vuelve.

### 11.3 La respuesta, en tres ramas

- **Si Stripe te acepta y puedes verificar la cuenta (G-01): Stripe, y no está reñido.**
  Es lo único que hoy renueva solo, ya está escrito, probado y con webhooks, y en los
  planes caros es entre 3 y 6 veces más barato. Todo lo demás es secundario.
- **Kunfupay al lado, no en lugar de** — y sólo si contestan que sí a las preguntas 1, 2
  y 3 del § 5. Su hueco es LatAm, donde Stripe ya no es barato y donde hoy no tienes
  método local ninguno. Como cuarto raíl suma; como sustituto, resta.
- **Si Stripe no te acepta** —que es el escenario que hace realista esta pregunta—
  entonces Kunfupay renta más que PayPal y Revolut **a pesar de la comisión**, porque es
  el único de los tres que dice tener cobro recurrente. Si resulta que su «enlace
  recurrente» no es un cargo automático, entonces no compensa el día de integración:
  en ese caso lo que renta es **empujar el plan Anual y el De Por Vida**, que es donde el
  pago único no duele, y dejar el mensual como puerta de entrada.

### 11.4 El dato que te falta para decidirlo tú, no yo

**De dónde son los que compran.** Si la mayoría paga con tarjeta del EEE, Stripe gana por
goleada y Kunfupay es un capricho caro. Si un tercio o más viene de LatAm, Kunfupay se
paga solo entre la comisión equivalente, el IVA y la conversión de un checkout con PIX.
Eso ya se puede mirar: GA4 está instalado y `PricingPage` emite `begin_checkout` y
`purchase` (`REACT_APP_GA4_MEASUREMENT_ID`). **Un mes de datos de geografía en el embudo
decide esto mejor que cualquier tabla de este documento.**

---

## 12. ¿Hace falta ser empresa para retirar? (añadido el 2026-08-26, a pregunta directa)

### 12.1 La respuesta corta

**Por parte de Kunfupay, aparentemente no. Por parte de Hacienda, eso no lo decide
Kunfupay.** Son dos preguntas distintas y conviene no mezclarlas.

### 12.2 Lo que dicen ellos

Su propio material comercial lo afirma sin matices: «**No hace falta estar dado de alta
como empresa** ni contratar desarrolladores». La cuenta personal (wallet multidivisa +
KunfuCard, una Visa virtual) se abre gratis desde la app, sin cuota de alta ni mensual, y
desde el saldo se retira «en moneda local en cualquier país, o en cripto», con
liquidaciones semanales.

Y el único requisito de acceso que aparece **en un documento suyo**, no en un folleto, es
la mayoría de edad:

> «El Usuario declara ser mayor de edad y disponer de la capacidad jurídica suficiente…
> Kunfupay no se dirige a menores de edad».
> — *Condiciones de uso, privacidad y protección de datos*, pág. 2

### 12.3 Lo que no dicen en ninguna parte pública, y es justo lo que gobierna un retiro

El único PDF legal que exponen —el citado arriba, 13 páginas— es **condiciones del sitio
web y política de privacidad**. Contadas una por una sobre el texto extraído, estas
palabras aparecen **cero veces** en todo el documento: *saldo*, *wallet*, *monedero*,
*cobro*, *pago*, *reembolso*, *KYC*, *verificación*, *blanqueo*, *AML*, *licencia*,
*comisión*, *tarifa*, *empresa* y *autónomo*. La única de la familia que sale es
*retirar/retirada* —cuatro veces— y siempre sobre **retirar el consentimiento** del RGPD,
nunca sobre retirar dinero.

Es decir: **las condiciones de la cuenta de pago, que son las que dicen quién puede
retirar y con qué papeles, no son públicas.** El resto del bucket donde vive ese PDF
responde 403 a todo lo demás (`terms`, `privacy`, `aml`, `kyc`) y no permite listado.

Cualquier plataforma que mueve dinero acaba pidiendo KYC antes de un retiro —documento de
identidad como mínimo, y con frecuencia justificación de la actividad al subir el volumen.
Que su folleto diga «sin ser empresa» no es lo mismo que un contrato que diga qué te van a
pedir el día que quieras sacar 4.000 €. **Eso hay que pedírselo por escrito antes de
enviarles un solo cobro** (pregunta 10 del § 5, ahora con más filo).

### 12.4 El hallazgo que cambia el marco: quién es Kunfupay legalmente

De su propia primera página, no de la prensa:

> «La titularidad de este sitio web, www.kunfupay.com … la ostenta: **KUNFU GLOBAL INC**,
> operando bajo la marca comercial Kunfupay, provista de **EIN: 39-3235422** e inscrita en
> la **División de Incorporaciones de la Secretaría de Estado de Delaware: inclusión el
> 14/07/2025** bajo el número de registro **10259941**». Dirección: *20062 Northwest 66th
> Place, Hialeah, FL 33015 US*.

Y el marco normativo que invocan es **estadounidense**: FTC Act (1914), ECPA (1986) y DMCA
(1998). En trece páginas **no hay una sola mención** a licencia de entidad de pago o de
dinero electrónico, ni al Banco de España, ni a ningún supervisor europeo.

Tres consecuencias, y ninguna es un detalle:

1. **No es «la fintech española» que cuentan las notas de prensa.** Es una sociedad de
   Delaware con dirección en Florida, **inscrita hace trece meses**. Puede haber una
   filial española detrás; en su documento legal no aparece.
2. **Tu facturación viviría en la wallet de esa sociedad** entre cobro y liquidación
   semanal. Sin licencia europea visible, ese saldo no está bajo las reglas de
   salvaguarda de fondos que sí obligan a un Stripe o un Revolut en la UE. Para un negocio
   cuyos ingresos pasan **todos** por ahí, ése es el riesgo de verdad, mucho más que el
   5-10 %.
3. **Su promesa de Merchant of Record hay que verificarla con lupa.** Que una Inc. de
   Delaware se encargue del IVA europeo de tus ventas es posible —existe el régimen OSS
   para no establecidos— pero es exactamente el tipo de afirmación que hay que ver por
   escrito, con NIF-IVA y todo, antes de apoyar en ella el § 7.1 de este documento.

### 12.5 Lo que sí decide si tienes que ser autónomo

No es la pasarela: es **Hacienda**. Vender suscripciones de forma continuada desde una web
es actividad económica habitual, y eso pide alta censal (036/037) y, en principio, RETA,
cobres por Stripe, por Kunfupay o en mano. Que el dinero aterrice primero en una wallet no
cambia el hecho imponible; sólo cambia el rastro.

Y si son MoR de verdad, cambia **qué** facturas: ya no vendes al usuario final, le vendes
a **KUNFU GLOBAL INC**, una sociedad estadounidense — otra factura, otro tratamiento de
IVA (prestación de servicios fuera de la UE) y otro casillero en los modelos. **Esto es
para un gestor, no para este documento**: aquí sólo queda anotado que la respuesta
«Kunfupay no me pide ser empresa» no responde a la pregunta «¿tengo que darme de alta?».

---

## 13. Su sistema de suscripción y el resto del producto: ¿bueno? (añadido el 2026-08-26)

### 13.1 Bueno, sí — pero para otro negocio

Su suscripción está pensada para **un grupo de Telegram o Discord de pago**, y para eso es
muy buena: desde su panel se crea el producto, el grupo se genera solo, el bot mete al que
paga y —esto es lo relevante— **echa al miembro cuando la suscripción caduca o se
cancela**, sin intervención del vendedor. Para un tipster o una comunidad, eso resuelve el
negocio entero.

Ese detalle dice algo técnico que importa más que el folleto: **internamente sí tienen el
estado de la suscripción y sus eventos** (alta, renovación, caducidad, baja). Alguien los
consume, porque el bot actúa sobre ellos. La pregunta, entonces, no es si existen:

> **¿Esos eventos se publican por webhook a un servidor cualquiera, o sólo se los pasan a
> su propio bot de Telegram?** Es la diferencia entre integrarlo aquí en un día y no poder
> integrarlo. Preguntas 2 y 4 del § 5.

### 13.2 Para esta web, el encaje es malo aunque el producto sea bueno

Aquí no hay que meter a nadie en un grupo: hay que poner `is_premium` a `true` en Postgres
y a `false` cuando caduque, sobre una cuenta que ya existe, con su email verificado, su
2FA, su passkey y sus preferencias. Todo lo que ellos aportan **alrededor** del cobro ya
está construido en este repositorio o no hace falta:

| Lo que ofrecen «de más» | Aquí |
|---|---|
| Escaparate de productos (`shops.kunfupay.com`) | Hay web propia, en diez idiomas, con SEO y prerender |
| Grupos de Telegram/Discord automatizados | No es el producto |
| Automatizaciones de email y embudos | SendGrid ya integrado (verificación, reset, avisos de suscripción) |
| «+100 herramientas» y asesor IA «Sensei» | El producto **es** un conjunto de herramientas; el asesor IA propio ya existe (AI Trade Coach) |
| Wallet + tarjeta Visa para gastar el saldo | Comodidad personal, no capacidad del negocio |

Conclusión de la tabla: **no pagarías 5-10 % por sus herramientas — pagarías 5-10 % por
sus métodos locales y por el Merchant of Record.** Todo lo demás es superficie que este
proyecto no va a usar. Y eso devuelve la decisión al § 11, donde ya está hecha.

### 13.3 Lo que NO se puede decir que sea bueno, porque no se puede comprobar

Aviso, porque es fácil tragárselo: al buscar «cómo funcionan las suscripciones de
Kunfupay» aparecen descripciones de reintentos de cobro fallido, *dunning* por email y
WhatsApp, cupones, periodos de prueba y portal del cliente con recibos descargables —
**pero esas descripciones son de otras plataformas** (Recaudo, Paytia), no suyas. Aquí no
se les atribuyen.

De su sistema de suscripción **no hay nada público** que diga si:

- reintentan un cobro fallido, y cuántas veces (sin reintentos, una suscripción con tarjeta
  pierde del orden del 5-10 % de los cobros cada mes por tarjetas caducadas o rechazos
  temporales — cifra de sector, no suya);
- el cliente puede cancelar solo, y desde dónde;
- hay prorrateo al cambiar de plan, cupones o periodo de prueba;
- hay portal del suscriptor con sus facturas.

Stripe tiene todo eso documentado y ya integrado aquí (§ 2). Es la diferencia entre un
sistema que se puede auditar antes de casarse con él y uno que hay que creer.

### 13.4 El riesgo que yo pondría por delante de la comisión

Con un Merchant of Record, **el cliente no es tuyo: es suyo.** No tienes la tarjeta, no
tienes el mandato de cobro, no tienes la relación de facturación. Con Stripe, si un día te
vas, te llevas los `customer_id` y existe un procedimiento de migración PCI de los métodos
de pago a otro proveedor. Con una Inc. de Delaware inscrita hace trece meses (§ 12.4), el
día que cierren la cuenta —o cierren— **no hay forma de seguir cobrando a tus propios
suscriptores**: hay que pedirle a cada uno que vuelva a pagar en otro sitio.

Para un producto de suscripción, eso no es un riesgo operativo: es el negocio.

### 13.5 Veredicto

**Buen producto, mal encaje.** Para esta web, Kunfupay es un **buen método de pago para
LatAm**, no un buen **sistema de suscripción**. Si entra, que entre como cuarto raíl para
quien no puede pagar con tarjeta europea; la suscripción troncal —renovación, prueba,
portal, facturas, reembolsos— se queda en Stripe mientras Stripe te acepte.

---

## 14. Compatibilidad real con este proyecto, para los primeros 50.000 € (2026-08-26)

Escenario: **Kunfupay como raíl de arranque**, para facturar los primeros 50 k y migrar
después. La pregunta concreta: ¿funciona la suscripción, y con un impago se bloquea?

### 14.1 El impago ya está resuelto, y no depende de la pasarela

Éste es el hallazgo que cambia la respuesta. **El muro de pago de esta web es por fecha,
no por estado del proveedor:**

```python
def check_premium(user: dict) -> bool:          # server.py:1650
    if user.get("subscription_plan") == "lifetime": return True
    if user.get("subscription_end"):
        return datetime.fromisoformat(...) > datetime.now(timezone.utc)
    return False
```

Y no es sólo el backend: **todos los endpoints que devuelven el usuario al frontend envían
`is_premium` calculado con esa función** —no el campo guardado en la base de datos—
(`server.py:2023, 2088, 2179, 2290, 2570, 2746, 3019`). El navegador nunca llega a ver un
premium caducado, así que `useIsPremium()` y `ProtectedRoute` cierran a la vez que
`require_premium` devuelve 403.

Consecuencias, y son grandes:

1. **Sí: con un impago se bloquea solo.** No hace falta que Kunfupay avise de nada. Vence
   la fecha, se acabó el acceso, en las dos capas. Ya está escrito y probado.
2. **De Kunfupay no necesitas un evento de impago: necesitas un evento de COBRO.** Uno
   solo: «se ha pagado el plan X del usuario Y». Con eso extiendes `subscription_end` y el
   resto lo hace tu propio código.
3. **El fallo peligroso es el contrario al que temías:** que Kunfupay cobre la renovación
   y tú no te enteres. Ahí bloquearías a alguien que está pagando. Ése es el caso que hay
   que cubrir, no el impago.

### 14.2 Encaje pieza a pieza

| Pieza | ¿Encaja? | Por qué |
|---|---|---|
| Conceder premium tras un pago | ✅ | `_activate_paid_subscription` (`:4118`) ya es común a los cuatro raíles |
| **Bloquear al vencer / impago** | ✅ **nativo** | § 14.1. No necesita pasarela |
| Renovación automática | ⚠️ | Depende del webhook de ellos (§ 13.1). Sin él, no hay renovación: hay repago |
| Prueba de 7 días | ❌ | Quitarla de este raíl, como ya pasa con PayPal/Revolut/cripto (`METODOS_CON_PRUEBA`) |
| Portal del cliente y facturas | ⚠️ | Como MoR, son suyos, no tuyos |
| Reembolso | ⚠️ | Desde su panel; el de admin (`:8541`) es sólo Stripe |
| Aviso «te vence en 7 días» | ❌ **no existe** | Hay confirmación, impago y cancelación (`:3522`, `:3543`, `:3556`), pero **ningún aviso de vencimiento**. Sin renovación automática, hace falta |

### 14.3 Los dos caminos — y los dos llegan a 50 k

**Camino A — hay webhook (preguntas 1, 2 y 3 del § 5 en verde).** `backend/kunfupay.py`
calcado de `revolut.py`, un día de trabajo (§ 9, fase 2A). Cada cobro, alta o renovación,
extiende la fecha. Impago = no llega evento = vence = bloquea. Cero mantenimiento manual.

**Camino B — no hay webhook.** Enlace de pago suyo + alta a mano desde el panel de admin:
editar el usuario y ponerle el plan, que **la fecha de fin se calcula sola**
(`_compute_subscription_end`, `server.py:7962`) y queda en el registro de auditoría. **Cero
líneas de código nuevas.** Lo que cuesta es tiempo, y depende del ticket:

| Plan | Precio | Cobros hasta 50 k | Altas a mano al mes (en 12 meses) | ¿Viable? |
|---|---|---|---|---|
| Mensual | 17 € | 2.941 | ~245 | ❌ inviable |
| Trimestral | 45 € | 1.111 | ~93 | 🟠 duro |
| **Anual** | 200 € | 250 | ~21 (≈1 al día) | ✅ |
| **De Por Vida** | 500 € | 100 | ~8 | ✅ trivial |

**En camino B se vende Anual y De Por Vida.** Es la misma conclusión del § 11.3, ahora por
un segundo motivo independiente: cada renovación mensual es un toque manual, y 245 al mes
no los hace nadie.

### 14.4 Lo que cuesta el peaje de arranque

50.000 € facturados por Kunfupay al 5-10 %: **2.500-5.000 € de comisión**. Por Stripe con
tarjeta del EEE serían ~1.000-1.500 €; con tarjeta internacional, ~1.700-2.500 €.

**El sobrecoste de arrancar con Kunfupay hasta los 50 k es de 1.000 a 3.500 € en todo el
trayecto.** A cambio: sin depender de que Stripe te apruebe, sin OSS propio, con métodos
locales de LatAm y sin cuota fija. Para una fase de arranque es un precio acotado y
defendible — **siempre que sea un peaje de arranque y no la estructura definitiva**.

### 14.5 Lo que hay que dejar hecho el día 1 para poder salir el día 50 k

Esto es lo que hace que «sólo para comenzar» sea verdad y no una jaula (§ 13.4: con un MoR
**el cliente no es tuyo**):

1. **Cada cobro deja fila en `payment_transactions`**, aunque sea a mano: email, plan,
   importe, fecha y referencia de Kunfupay. Sin ese registro, el día de migrar no sabes a
   quién le debes cuánto tiempo.
2. **Vender Anual y De Por Vida**, que además de lo anterior reduce a cuánta gente hay que
   pedirle que vuelva a pagar el día del cambio.
3. **Escribir el aviso de vencimiento** (§ 14.2): SendGrid ya está, `subscription_end` ya
   está, el aviso no. Es lo que sustituye al *dunning* que no sabemos si ellos tienen.
4. **No prometer en la web lo que el raíl no da**: ni prueba de 7 días ni renovación
   automática mientras se cobre por aquí.
5. **Fijar hoy el criterio de salida** —«a 30 k, o el día que Stripe me acepte, migro»—
   y no dejarlo a la inercia: cuanto más tarde, más suscriptores hay que rescatar a mano.

---

## 15. Sus «partners tecnológicos»: qué son y qué prueban (2026-08-26)

Texto que publican: «trabajamos con proveedores de tecnología e infraestructura financiera,
entre ellos **Crossmint, Bridge, Pomelo, Blindpay y Fireblocks**».

### 15.1 Los cinco existen, y no son nombres de relleno

| Proveedor | Qué es | Peso |
|---|---|---|
| **Bridge** (bridge.xyz) | API de stablecoins: on-ramp fiat↔stablecoin, custodia, conversión y pagos de salida por ACH, SEPA y SWIFT, con KYC/KYB y *Travel Rule* incorporados | **Comprada por Stripe por 1.100 M$** — anunciada en octubre de 2024, cerrada el 4 de febrero de 2025 |
| **Fireblocks** | Custodia institucional de activos digitales (MPC) | Estándar del sector; lo usan bancos y MoneyGram |
| **Crossmint** | *Wallets-as-a-service* + pagos y tesorería multi-cadena, con reconciliación por webhook | Proveedor establecido del ecosistema |
| **Pomelo** | Fintech argentina (2021) de **emisión y procesamiento de tarjetas** en LatAm; en julio de 2026 lanzó emisión global a +150 países | Clientes: Western Union, BBVA, Santander, Binance, Astropay. **Casi con seguridad, quien emite la KunfuCard** |
| **BlindPay** | API de stablecoins enchufada a los raíles locales de LatAm (**PIX, SPEI, PSE**, transferencias argentinas) | Respaldada por Y Combinator; fundada en 2024 por ex-PicPay y ex-LendingClub; de 30 k$ a 10 M$ de volumen mensual en 14 meses |

**Detalle con gracia:** parte de tu dinero acabaría corriendo sobre infraestructura
**propiedad de Stripe**, la empresa de la que se trataba de prescindir.

### 15.2 Lo que esa lista dice de verdad: no es un sello, es el plano

Los cinco juntos describen **un stack de stablecoins**, no una pasarela bancaria clásica:
BlindPay y Bridge meten el dinero local (PIX, SPEI, transferencia) y lo convierten a
stablecoin, Fireblocks lo custodia, Crossmint gestiona las wallets, Pomelo emite la
tarjeta con la que se gasta el saldo.

Eso explica de golpe todo lo que ya sabíamos y no encajaba: la liquidación **semanal**, la
retirada «en moneda local en cualquier país **o en cripto**», la wallet «con tecnología
blockchain» y la tarjeta Visa instantánea.

**Consecuencia, dicha claro: tu facturación no descansaría en una cuenta de fondos de
clientes de un banco europeo. Viviría como stablecoin hasta que la retires.** No es
automáticamente malo —así se mueve hoy buena parte del dinero transfronterizo de
LatAm, y es justo por eso que pueden pagar rápido y en moneda local— pero es **otro perfil
de riesgo**, y trae dos cosas concretas:

1. **Conversiones por el camino.** Cobras 17 € y hasta que ese dinero llega a tu banco hay
   al menos dos saltos (EUR → stablecoin → moneda de retirada). El diferencial lo pone la
   cadena, no tú. La pregunta 7 del § 5 (coste de retirada y conversión) deja de ser un
   detalle: ahí se puede ir otro 1-2 %.
2. **La custodia no es tuya.** Lo que Fireblocks protege son las claves de **KUNFU GLOBAL
   INC**, no tu saldo. Custodia de primera no devuelve el dinero si la sociedad quiebra o
   te cierra la cuenta.

### 15.3 Y lo que sí prueba, que no es poco

Para integrarse con Bridge (o sea, Stripe), Fireblocks y Pomelo hay que pasar **su KYB y
su diligencia debida**, y esas casas tienen obligaciones de AML y *Travel Rule*: no abren
cuenta a cualquiera. Que cinco proveedores serios los hayan aceptado como cliente es
**verificación indirecta** de que la empresa existe, opera y ha pasado controles de
terceros. Es lo más parecido a un aval que aparece en todo este expediente, y sube la
nota respecto al § 12.4.

**Pero contratar buenos proveedores no equivale a estar regulado.** Ninguno de los cinco
es un supervisor, ninguno responde por sus deudas, y sigue sin aparecer licencia alguna.
Y esa lista es texto de marketing: que esté publicada no prueba que los contratos estén
vigentes ni al nivel que sugiere.

### 15.4 Qué preguntar ahora, y qué hacer mientras

Dos preguntas nuevas, que se suman a las diez del § 5 y son las que separan «buenos
proveedores» de «mi dinero está protegido»:

11. **¿Quién emite la tarjeta y quién custodia el saldo de los comercios**, con nombre de
    entidad?
12. **¿El saldo de los comercios está segregado** de los fondos propios de KUNFU GLOBAL
    INC, y en qué instrumento se mantiene (stablecoin, cuenta bancaria, ambos)?

Y una regla de operación que vale desde el primer día, con respuesta o sin ella:

> **Cobra por ahí, pero no guardes ahí.** Retira en cuanto liquiden —semanalmente— y no
> uses su wallet como cuenta corriente. La lista de partners es buena; no convierte a
> Kunfupay en un sitio donde dejar 50.000 € parados.

---

## 16. Lo que ya está construido (2026-08-26)

Decisión tomada: Kunfupay entra como raíl de arranque. Esto es lo que **ya está en el
código**, y lo que sigue sin poder hacerse hasta tener su documentación.

### 16.1 El interruptor de raíles

Qué métodos se pueden pagar se decide ahora **en configuración, no en el código**:
`payment_methods_enabled` (ajuste de admin o `PAYMENT_METHODS_ENABLED`), lista separada
por comas. Apagar Stripe es escribir `paypal,revolut,nowpayments,kunfupay` y guardar; no
hace falta desplegar ni borrar una línea del código de Stripe.

- **El ajuste vacío significa «los de siempre», nunca «ninguno».** Un despliegue que
  pierda la variable no puede dejar la web sin cobrar — es literalmente el fallo que ya
  costó el login entero con `CORS_ORIGINS`.
- **Se comprueba en el servidor** (`create_checkout`), no sólo escondiendo el botón:
  apagar un método en el frontend no apaga nada para quien llame al endpoint a mano.
- **La página de precios ya no deduce nada**: `/api/public/settings` devuelve
  `payment_methods`, `recurring_payment_methods` y `trial_payment_methods` **ya
  resueltos**, y `PricingPage` pinta sólo lo encendido, cambia de método solo si el
  elegido se apaga, y enseña la prueba de 7 días únicamente cuando el raíl la da.

### 16.2 El raíl Kunfupay (camino B, el que no necesita su API)

`POST /api/checkout/create` con `payment_method: "kunfupay"` escribe la transacción
**antes** de mandar a nadie a pagar —el rastro del § 14.5— y devuelve el enlace de cobro
del plan, tomado de `kunfupay_links` (JSON `plan → https://…`). Sin enlace configurado
para ese plan devuelve 503 en vez de mandar al cliente a ninguna parte.

Y el alta la confirma un admin: **`POST /api/admin/payments/manual`**, con formulario en el
panel (`Alta manual de cobro`, junto a Conciliación de pagos). Guardas:

| Guarda | Por qué |
|---|---|
| `reference` obligatoria e **idempotente** | Reintentar tras un timeout no puede regalar un segundo periodo |
| Sólo proveedores manuales (`kunfupay`, `bank_transfer`, `other`) | Un alta a mano en Stripe taparía un webhook roto en vez de arreglarlo |
| Mismo `_activate_paid_subscription` que los webhooks | El estado resultante es idéntico al de un pago normal, con su correo |
| **Apila sobre la fecha vigente** (`extend_from_current`) | Quien renueva tres días antes de vencer no pierde esos tres días — el caso normal cuando no hay cargo automático |
| Fila en `payment_transactions` + registro de auditoría | Sin rastro, el día de migrar no se sabe a quién se le debe cuánto |

### 16.3 Un bug de propina, que estaba antes que todo esto

`hayPrueba` sólo miraba el método, así que con **Klarna** elegido —que sólo cobra el plan
De Por Vida, al que `trial_eligible` nunca da prueba— la página anunciaba «7 días sin
cargo» y el checkout cobraba al instante. Es el mismo fallo que ya documenta el comentario
de `PricingPage.jsx:59-67`, que se arregló para cripto/PayPal/Revolut y se dejó abierto
para Klarna. Ahora la prueba sale de `_TRIAL_PAYMENT_METHODS`, que es del backend, y el
backend la exige además en `trial_eligible`.

### 16.4 Cómo se enciende, en tres pasos

1. En Kunfupay: crear un producto por plan (17 / 45 / 200 / 500 €, **IVA incluido** — ver
   pregunta 8 del § 5) y copiar el enlace de cobro de cada uno.
2. En Admin → Ajustes: `kunfupay_links` con
   `{"monthly":"https://…","annual":"https://…"}` y `payment_methods_enabled` con los
   raíles que quieras encendidos.
3. Cada cobro que aparezca en su panel → Admin → **Alta manual de cobro**: email, plan,
   referencia. El premium se concede y el correo de confirmación sale solo.

Nota: `kunfupay` sólo aparece en la página de precios si además hay enlaces configurados.
Encendido sin enlaces = invisible, en lugar de un botón que da 503.

### 16.5 Lo que sigue sin estar, y por qué

- **El conector con webhook (camino A).** No se puede escribir contra una API que no
  publica endpoints ni formato de firma. En cuanto contesten a las preguntas 1-3 del § 5,
  es `backend/kunfupay.py` calcado de `revolut.py` y un día de trabajo; el resto del
  andamiaje ya está puesto.
- **El aviso de vencimiento por email** (§ 14.2). Es el hueco que más duele en un raíl sin
  renovación: hay correo de confirmación, de impago y de cancelación, pero ninguno que
  diga «te vence en 7 días». Necesita un disparador diario (Cloud Scheduler contra un
  endpoint, no un bucle en el proceso).
- **Los legales**, que sólo se tocan cuando esté decidido el MoR (§ 10).

### 16.6 Apagar una pasarela, desde el panel

Las siete pasarelas son **siete casillas** en Admin → Integraciones → «Pasarelas activas»
(`payment_methods_enabled`). Lo que se desmarca desaparece de la página de precios **y**
deja de aceptarse en el checkout.

Dos reglas de la casilla, que vienen del backend y no se pueden contradecir en la UI:

- **Con el ajuste sin poner, las casillas salen marcadas con el valor por defecto.** El
  vacío significa «los de siempre», así que enseñarlas todas apagadas sería mentir sobre
  lo que se está cobrando.
- **La última no se deja desmarcar.** Guardar la lista vacía haría que el backend
  encendiera todo otra vez: el admin creería haber cerrado la caja y estaría cobrando.

### 16.7 Verificado

`py_compile` de los 34 módulos · **27 tests nuevos** en
`backend/tests/test_payment_rails_unit.py`, **saboteados uno a uno** para comprobar que
fallan cuando deben (quitar el respaldo de la lista vacía, quitar la puerta del servidor y
admitir Stripe en el alta manual: 7 fallos, los tres sabotajes cazados) · `i18n-check` con
las tres claves nuevas en los diez idiomas · `engine-check` 429/429 ·
`gen-instruments-js --check` · `check-precios` (40 precios en 10 idiomas) ·
`check-rutas-muertas` · `gen-mapa` regenerado · `check-doc-links`.

**Y contra la aplicación viva** (Postgres + backend + build de producción), sonda nueva
`tests/e2e/api/pasarelas.py`, **22 comprobaciones, 22 en verde**:

| Lo que demuestra | |
|---|---|
| Kunfupay cobra la **suscripción** (mensual, 17 €) y el **pago único** (De Por Vida, 500 €) | cada uno con su enlace, y la transacción escrita antes de mandar a pagar (`kunfupay\|pending\|17.0` leído de Postgres) |
| Un plan sin enlace configurado devuelve **503** | no manda a nadie a pagar a ninguna parte |
| Apagar Kunfupay en admin → el **checkout responde 400** | y la web deja de anunciarla |
| Apagar Stripe → la tarjeta deja de aceptarse y **Kunfupay sigue cobrando** | el relevo funciona |
| Encendida sin enlaces → **no se ofrece** | en vez de un botón que da 503 |
| El alta manual **abre el muro**: el cliente pasa de no-premium a premium | con fin a 30 días |
| Repetir la referencia **no regala** un segundo periodo | y la fecha no se mueve |
| Un segundo cobro **apila** (30 → 60 días) | renovar antes de vencer no cuesta días |
| Stripe no se puede dar de alta a mano · sin referencia no hay alta · un email de nadie no concede · un cliente no puede darse premium | 400 · 400 · 404 · 403 |

**Y la sonda está saboteada**: quitando la puerta del servidor en `create_checkout` y
reiniciando el backend, las dos comprobaciones de «apagada en admin» se ponen rojas
(HTTP 200 donde debía haber 400). Restaurado, vuelven a verde.

**El panel, visto de verdad**: entrando con 2FA en `/admin`, la tarjeta de raíles pinta
las siete casillas con el estado real, y desmarcar PayPal + Guardar deja al backend
sirviendo `["card","kunfupay"]`. Sin errores de JavaScript. Y en `/pricing`, con
`card,paypal,kunfupay` encendidos, se pintan **esos tres y ninguno más**.

**No verificado, y hay que decirlo**: nada de esto se ha probado contra un cobro real de
Kunfupay, porque su dominio está bloqueado desde este entorno y no hay cuenta. Los enlaces
de la sonda son de mentira a propósito: lo que se prueba es **nuestro lado del trato**. El
primer cobro de verdad hay que hacerlo con **un plan barato y ojos encima**.

---

## Fuentes

Todas consultadas el 2026-08-26 **desde buscador**, porque el dominio del proveedor está
bloqueado en este entorno (§ 0):

- [Kunfupay — web oficial](https://kunfupay.com/en) · [FAQ](https://kunfupay.com/en/faq)
  · [«¿Qué es Kunfupay?»](https://kunfupay.com/en/blog/que-es-kunfupay) ·
  [vender en Discord](https://kunfupay.com/en/blog/vender-contenido-discord-kunfupay)
  *(no accesibles desde aquí; sólo su contenido indexado)*
- [Crunchbase — Kunfupay](https://www.crunchbase.com/organization/kunfupay) ·
  [Tracxn](https://tracxn.com/d/companies/kunfupay/__6t863vFFZ-LouxqCnxSvy4_cJBLsRBgT_G3PwmWonJE)
- [Nota de prensa — 10 M€ y 20 países](https://www.streetinsider.com/Press+Releases/Kunfupay,+the+Spanish+fintech+company+that+has+struck+gold+in+Latin+America:+over+10+million+euros+in+transactions+and+a+presence+in+20+countries/26216282.html)
  · [TechBullion](https://techbullion.com/kunfupay-the-platform-that-lets-influencers-and-entrepreneurs-get-paid-worldwide-in-a-matter-of-minutes/)
  · [ExtraConfidencial](https://extraconfidencial.com/noticias/kunfupay-la-plataforma-que-permite-a-influencers-y-emprendedores-cobrar-en-todo-el-mundo-en-cuestion-de-minutos/)
  · [El Ecosistema Startup](https://ecosistemastartup.com/kunfupay-un-millon-al-mes-sin-inversion-externa/)
- **Fuente primaria** (sí accesible desde aquí, al estar en S3 y no en su dominio): [Condiciones de uso, privacidad y protección de datos de Kunfupay (PDF, 13 págs.)](https://kunfupay-payment-app-production.s3.eu-west-1.amazonaws.com/public/use-conditions.pdf) — de aquí salen la entidad titular del § 1 y todo el § 12
- [`docs.kunfupay.com`](https://docs.kunfupay.com/) y `business.kunfupay.com` — existen, bloqueados desde este entorno
- Partners del § 15: [Bridge — API de stablecoins, comprada por Stripe](https://eco.com/support/en/articles/15083178-bridge-xyz-stablecoin-api-for-payouts-and-orchestration) · [BlindPay](https://blindpay.com/) y su [documentación de *payins*](https://blindpay.com/docs/essentials/payins) · [Pomelo](https://www.latamfintech.co/companies/pomelo) y su [tarjeta global a +150 países (Infobae, 07/2026)](https://www.infobae.com/tecno/2026/07/02/empresa-latina-que-impulsa-a-bancos-y-fintechs-lanza-una-tarjeta-global-para-llegar-a-mas-de-150-paises/) · [Crossmint](https://www.crossmint.com/learn/bridge-alternatives-for-stablecoin-infrastructure)
- [Tarifas de Stripe](https://stripe.com/pricing) ·
  [comisiones de Stripe en España](https://getquipu.com/blog/comisiones-stripe/)
