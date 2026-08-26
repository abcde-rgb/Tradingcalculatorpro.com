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
- [Tarifas de Stripe](https://stripe.com/pricing) ·
  [comisiones de Stripe en España](https://getquipu.com/blog/comisiones-stripe/)
