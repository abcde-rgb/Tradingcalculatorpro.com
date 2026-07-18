# 🤝 Programa de Afiliados — Diseño técnico

> **Estado:** ✅ **Fase 1 IMPLEMENTADA** (backend + panel del afiliado + panel admin). Fecha: 2026-07-17.
> Rama: `claude/affiliate-payment-system-nda23v`. Pendiente: fusionar a `main` y cargar operativa
> (aprobar afiliados, pagos manuales). Fase 2 (Stripe Connect automático) no implementada.
>
> **Qué resuelve:** pagar a socios/afiliados **dinero real, cada mes**, en función de cuántos
> **suscriptores de pago activos** hayan traído a TradingCalculator.Pro.
>
> **Módulos implementados:** `backend/affiliate_program.py` (14 rutas), `frontend/src/pages/AffiliatePage.jsx`
> (panel self-service, ruta `/affiliate`, enlace en el menú de usuario), sección "Afiliados" + "Liquidación
> de afiliados" en `frontend/src/pages/AdminPage.jsx`. Tests: `backend/tests/test_affiliate_program_unit.py`.
>
> Documentos relacionados: [`ESTADO_PROYECTO.md`](./ESTADO_PROYECTO.md) ·
> [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) · código base: `backend/referrals.py`,
> `backend/server.py` (Stripe), `backend/admin_routes.py`.

---

## 1. Objetivo y reglas de negocio (decididas)

Un **afiliado** (socio/cliente) comparte un enlace. Los usuarios que se registran por ese
enlace y **se convierten en suscriptores de pago** quedan atribuidos al afiliado. Cada mes se
le paga en dinero real por cuántos de esos referidos siguen siendo **suscriptores de pago
activos**.

Reglas ya decididas por el propietario del proyecto:

| Regla | Decisión |
|---|---|
| **Qué cuenta como "suscriptor"** | **Solo suscriptores de pago ACTIVOS** ese mes. Los registros gratuitos NO cuentan. |
| **Fórmula del importe** | **Por bloques de 1000, con suelo en 1000.** El pago **empieza a partir de 1000** referidos de pago activos y sube **de 1000 en 1000**: `pago/mes = ⌊nº de activos ÷ 1000⌋ × 1000 €`. Por debajo de 1000 activos → **0 €**. |
| **Cadencia** | Mensual y **recurrente**: cada mes se recuenta y se paga según los activos de ese mes. |
| **Plan lifetime** | Se paga aparte: **bonus único de 50 €** por cada referido lifetime (**no** cuenta en los bloques mensuales; se abona una sola vez). |
| **Moneda** | EUR (igual que los planes). |

> **Actualización 2026-07-17:** el propietario cambió la fórmula de *lineal* a **bloques de 1000
> con suelo en 1000**. Esta versión **sustituye** la decisión lineal previa.

**Ejemplos** (por afiliado; el bloque se calcula sobre los activos de *cada* afiliado, no del total):

| Suscriptores de pago activos | Bloques completos | Pago/mes |
|---:|:---:|---:|
| 0 – 999 | 0 | **0 €** |
| 1000 – 1999 | 1 | **1000 €** |
| 2000 – 2999 | 2 | **2000 €** |
| 5000 | 5 | **5000 €** |

Los activos "sueltos" por debajo del siguiente bloque (p. ej. los 500 de un afiliado con 1500) **no
pagan** hasta cruzar al bloque siguiente. Como es un **snapshot mensual** (§5), no se acumulan de un
mes a otro: cada mes se recuenta desde cero.

> **Nota económica.** El plan mensual son 17 €; el pago máximo por suscriptor activo es 1 €/mes
> (bloque completo) ≈ **5,9 %** de los ingresos brutos de ese usuario, y **menos** cuando hay bloque
> parcial (esos activos no pagan) → sostenible. El plan anual (200 €) equivale a ~16,7 €/mes → ~6 %.
> El plan **lifetime** (500 € una sola vez) se paga aparte: **bonus único de 50 €** al afiliado por
> cada referido lifetime (= 10 % del precio del plan, una vez; no entra en el recuento mensual por
> bloques). Ver §5.1/§5.2.

---

## 2. Qué ya existe en el repo (reutilizable)

El **~60 %** de la fontanería ya está construida. Este programa **recicla** lo siguiente:

| Pieza existente | Ubicación | Reutilización |
|---|---|---|
| **Sistema de referidos** (código único, link `/?ref=CODE`, tracking de signup, vínculo `referred_by_id` en el usuario referido, leaderboard admin) | `backend/referrals.py` | Base de **atribución**. El afiliado usa su mismo código de referido. |
| **Suscripciones recurrentes Stripe** (planes 17/45/200/500 €, modo `subscription`/`payment`) | `server.py:1054` (`SUBSCRIPTION_PLANS`), `server.py:3480` (checkout) | Fuente de verdad de **quién es suscriptor de pago activo** (`is_premium`, `subscription_end`, `subscription_status`). |
| **Webhooks de ciclo de vida** (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`, `customer.subscription.updated`) | `server.py:3843` | Mantienen `is_premium`/`subscription_status` al día → la contabilidad los lee, no los recalcula. |
| **Refund → revoca premium** (`is_premium=False`, `status="refunded"`) | `server.py:~6430` | Un reembolso saca al usuario del recuento **automáticamente** (ver §5, snapshot). |
| **Comisión al referrer** (10 % una sola vez → wallet canjeable) | `referrals.py:credit_referrer_for_payment` | Se **desactiva** para afiliados aprobados (ver §6, evitar doble pago). |
| **Sistema de settings cifrados + panel admin + emails SendGrid** | `server.py` (`get_setting`), `admin_routes.py`, `_send_*_email` | Tarifa configurable, panel de liquidación, avisos por email. |
| **Patrón de tarea en segundo plano** (poller de alertas) | `backend/realtime_alerts.py` | Referencia para el job mensual (aunque se recomienda disparo externo, §5.3). |

**Lo que NO existe y hay que construir** (confirmado por búsqueda: no hay Stripe Connect /
Transfers / Payouts en el backend):

1. **Pagos SALIENTES** de dinero real al afiliado (hoy el wallet solo se canjea contra compras).
2. **Contabilidad recurrente** por suscriptor activo (hoy se acredita una vez y no se revisa).
3. **Rol de afiliado** (alta, aprobación, datos fiscales/de cobro, umbral mínimo).

---

## 3. Arquitectura por fases

Se recomienda **construir la Fase 1 primero** (valida negocio y legalidad sin KYC ni Connect).

### Fase 1 — MVP semi-manual (recomendado empezar aquí)
- Modelo de datos + alta/aprobación de afiliados.
- **Sección "Afiliados" propia en el admin, SEPARADA de la lista general de clientes**, con detalle
  de los referidos de cada afiliado y orden por bloques de 1000 (ver §8bis).
- **Job de liquidación mensual disparado por el admin** (endpoint) que cuenta activos y genera un
  **run** con una línea por afiliado (importe a pagar).
- **Panel admin de liquidación**: tabla "a quién pagar cuánto", export CSV, botón "marcar como pagado".
- **El pago lo haces tú** (transferencia bancaria / PayPal manual) y lo registras.
- Sin Stripe Connect, sin KYC automatizado.

### Fase 2 — Automatización
- Disparo mensual automático (**Cloud Scheduler** → endpoint autenticado, o workflow programado
  de GitHub Actions).
- **Stripe Connect Express**: onboarding con KYC + **transfers/payouts automáticos**.
- Reconciliación de **clawback** (chargebacks/refunds posteriores a un pago ya emitido).
- **Panel del afiliado** en el frontend (self-service: su link, activos en vivo, histórico de cobros).
- Antifraude avanzado (fingerprint de IP/tarjeta, emails desechables).

### Fase 3 — Extras (opcional)
- Tarifas por tramos / bonus por hitos.
- Multi-nivel (referido de referido) — **precaución legal** (riesgo de esquema piramidal); requiere
  asesoría antes de implementar.

---

## 4. Modelo de datos (colecciones JSONB vía el shim `Collection`)

> Recordatorio del repo: **nunca SQL directo**; se usa la API estilo Mongo del shim
> (`db.<col>.find_one/insert_one/update_one/...`). Todas las tablas nuevas se crean solas al
> insertar (`CREATE TABLE IF NOT EXISTS ... (_key TEXT PRIMARY KEY, data JSONB)`).

### 4.1 `affiliates` — un doc por afiliado
El **código de afiliado = el `referral_code` existente del usuario** (no se crea un segundo sistema
de enlaces). Este doc añade la capa de estado/cobro/fiscal.

```jsonc
{
  "id": "uuid",
  "user_id": "uuid del usuario",
  "email": "socio@ejemplo.com",
  "code": "ABC12345",                 // = user.referral_code
  "status": "pending",                // pending | approved | suspended | rejected
  "block_reward_eur": null,           // override opcional del € por bloque; si null usa el global (1000)
  "payout_method": "bank",           // bank | paypal | stripe_connect (fase 2)
  "payout_details_enc": "<Fernet>",  // IBAN / email PayPal — CIFRADO (como settings secretos)
  "tax_info_enc": "<Fernet>",        // NIF/VAT, país, régimen — CIFRADO
  "terms_accepted_at": "2026-07-17T...Z",
  "terms_accepted_ip": "1.2.3.4",
  "notes": "texto admin",
  "created_at": "...", "approved_at": "...", "approved_by": "admin_id"
}
```
Índices: `user_id` (único), `status`, `code`.

### 4.2 `affiliate_payout_runs` — un doc por liquidación mensual
```jsonc
{
  "id": "uuid",
  "period": "2026-07",               // YYYY-MM
  "status": "draft",                 // draft | finalized | paid
  "block_size": 1000,                // suelo y tamaño de bloque aplicados en este run
  "block_reward_eur": 1000.0,        // € por bloque completo
  "lifetime_bonus_eur": 50.0,        // pago único por referido lifetime
  "snapshot_at": "2026-08-01T00:05:00Z",
  "totals": { "affiliates": 12, "affiliates_paid": 4, "active_subscribers": 3480,
              "total_blocks": 4, "block_eur": 4000.0, "lifetime_bonus_total_eur": 150.0,
              "payable_eur": 4150.0 },
  "created_at": "...", "finalized_at": "...", "created_by": "admin_id"
}
```
Índice único: `period` (una liquidación por mes; recomputar en `draft` la reemplaza).

### 4.3 `affiliate_payout_lines` — una línea por (run, afiliado)
```jsonc
{
  "id": "uuid",
  "run_id": "uuid", "period": "2026-07",
  "affiliate_id": "uuid", "affiliate_email": "socio@ejemplo.com",
  "active_count": 1500,              // referidos de pago RECURRENTES activos (excluye lifetime)
  "blocks": 1,                       // ⌊active_count / block_size⌋  (1500 → 1 bloque)
  "block_size": 1000, "block_reward_eur": 1000.0,
  "block_gross_eur": 1000.0,         // blocks * block_reward_eur
  "lifetime_new_count": 2,           // referidos LIFETIME nuevos (activos, aún sin bonificar)
  "lifetime_bonus_eur": 50.0,        // € por cada lifetime (una sola vez)
  "lifetime_gross_eur": 100.0,       // lifetime_new_count * lifetime_bonus_eur
  "gross_eur": 1100.0,               // block_gross_eur + lifetime_gross_eur
  "adjustments_eur": 0.0,           // clawback (negativo) por refunds/chargebacks (fase 2)
  "net_eur": 1100.0,                // gross + adjustments
  "status": "pending",              // pending | paid | held | zero | skipped
  "counted_referee_ids": ["..."],   // recurrentes contados (auditoría)
  "bonused_referee_ids": ["..."],    // lifetime bonificados en este run (auditoría/idempotencia)
  "paid_at": null, "payout_reference": null,  // se rellenan al "marcar como pagado"
  "created_at": "..."
}
```
Índices: `run_id`, `affiliate_id`, `status`.

### 4.4 Campos añadidos a documentos existentes
- `users`: reutiliza `referred_by_id`, `referred_by_code` (ya existen). Opcional:
  `affiliate_first_paid_at` (cohortes). Para el bonus lifetime: **`affiliate_lifetime_bonus_paid_at`**
  (sella que ese referido lifetime ya se bonificó → se paga UNA sola vez).
- Global settings (sistema `get_setting`): `affiliate_block_size` (1000), `affiliate_block_reward_eur`
  (1000.0), `affiliate_lifetime_mode` (**`bonus`**), `affiliate_lifetime_bonus_eur` (**50.0**),
  `affiliate_program_enabled` (bool). *(El modelo de bloques hace innecesario un umbral mínimo de
  pago: por debajo de un bloque el pago ya es 0 €.)*

---

## 5. La contabilidad mensual (el corazón del sistema)

### 5.1 Definición de "suscriptor de pago activo"
Un referido `R` de un afiliado `A` **cuenta** en el periodo si, en el momento del snapshot:
- `R.referred_by_id == A.user_id`, **y**
- `R.is_premium == true`, **y**
- `R.subscription_status ∈ {active, trialing?}` (recomendación: **excluir `trialing`** hasta el
  primer cobro real; ver §7), **y**
- `R.subscription_plan != "lifetime"` **y** `R.subscription_end` en el futuro.

Los referidos **lifetime** NO entran en el recuento por bloques: se pagan aparte como **bonus único
de 50 €** (§5.2, apartado b), para no pagarlos dos veces.

Como los webhooks de Stripe ya mantienen `is_premium`/`subscription_status`/`subscription_end`
al día (§2), **la contabilidad solo lee esos campos**, no habla con Stripe en el run.

### 5.2 Algoritmo del run (periodo `P`, enfoque *snapshot*)
```
block_size     = settings.affiliate_block_size          # 1000  → suelo y paso
lifetime_bonus = settings.affiliate_lifetime_bonus_eur   # 50 €  → pago único por lifetime
para cada afiliado A con status == "approved":
    # (a) RECURRENTES → bloques de 1000 (excluye lifetime)
    referidos_activos = db.users.count_documents({
        "referred_by_id": A.user_id,
        "is_premium": true,
        "subscription_status": {"$in": ["active"]},   # + "trialing" si se decide contarlo
        "subscription_plan": {"$ne": "lifetime"},
    })
    reward      = A.block_reward_eur  or  settings.affiliate_block_reward_eur   # 1000 €
    blocks      = referidos_activos // block_size     # ⌊activos / 1000⌋ → suelo en 1000
    block_gross = blocks * reward

    # (b) LIFETIME nuevos → bonus único de 50 € (una sola vez por referido)
    lifetime_nuevos = db.users.find({
        "referred_by_id": A.user_id,
        "is_premium": true,
        "subscription_plan": "lifetime",
        "affiliate_lifetime_bonus_paid_at": {"$exists": false},   # aún no bonificados
    })
    lifetime_gross = count(lifetime_nuevos) * lifetime_bonus

    gross  = block_gross + lifetime_gross
    net    = gross + adjustments                      # adjustments = clawbacks (fase 2)
    status = "zero" if gross == 0 else "pending"      # nada que pagar este mes
    persistir línea (run_id, A, referidos_activos, blocks, block_gross,
                     lifetime_new_count, lifetime_gross, gross, net, status,
                     bonused_referee_ids=[ids de lifetime_nuevos], ...)
persistir totales del run
```

> **Sellado del bonus lifetime (idempotencia):** los referidos lifetime se marcan con
> `affiliate_lifetime_bonus_paid_at` **solo al `finalize`** del run (no en `draft`), de modo que
> recomputar un borrador no los "consume" y cada lifetime se bonifica **exactamente una vez**. Un
> lifetime reembolsado (con `is_premium=false`) no entra, así que el bonus solo se paga sobre compras
> vivas.

> **Sin arrastre entre meses (recurrentes):** al ser un recuento en vivo por bloques completos, los
> activos por debajo del siguiente bloque simplemente no pagan ese mes; no se acumulan ni se
> arrastran. El mes siguiente se vuelve a contar desde cero y, si el afiliado ha crecido hasta el
> siguiente millar, cobra el bloque nuevo.

**Idempotencia:** volver a ejecutar un run en `draft` para el mismo `period` **reemplaza** sus
líneas (recomputa). Una vez `finalized`, se congela (y se sella el bonus lifetime); recomputar exige
crear un run de ajuste.

**Por qué snapshot y no "por factura pagada":** el enfoque snapshot es simple, coincide con
"activos ese mes", y **excluye automáticamente** a quien reembolsó/canceló (el webhook ya puso
`is_premium=false`). El coste es que un usuario que canceló a mitad de mes no cuenta ese mes
(aceptable). El manejo fino de chargebacks posteriores a un pago ya emitido se resuelve con
`adjustments_eur` en Fase 2.

### 5.3 Cuándo se dispara
Cloud Run corre con `min-instances=1`, pero un `APScheduler` en proceso **no** es fiable para una
cadencia mensual (reciclado de instancias). Recomendación:
- **Fase 1:** endpoint admin `POST /api/admin/affiliates/payout-run` que el propietario dispara
  manualmente a principios de mes (genera el `draft`).
- **Fase 2:** **Cloud Scheduler** → POST autenticado a ese endpoint el día 1 de cada mes (o un
  workflow `schedule:` de GitHub Actions con `cron`). Se documenta en `DEPLOY_CHECKLIST.md`.

---

## 6. Cambios en código existente

1. **`referrals.py :: credit_referrer_for_payment`** — si el `referrer` es un afiliado **aprobado**,
   **saltar** la comisión del 10 % al wallet (evita doble programa: o wallet casual, o afiliado
   recurrente). Precedencia: **afiliado gana**. Se documenta en el propio módulo.
2. **Webhook Stripe (`server.py:3843`)** — sin cambios obligatorios para el snapshot. *Opcional*:
   al activar una suscripción de un referido, sellar `affiliate_first_paid_at` para cohortes.
3. **Refund/chargeback (`server.py:~6430`)** — ya pone `is_premium=false` → el snapshot lo excluye.
   Para clawback de importes **ya pagados** (Fase 2): registrar el evento y descontarlo como
   `adjustments_eur` en el siguiente run.
4. **Registro de rutas** — nuevo módulo `backend/affiliate_program.py` con `register(app, db, helpers)`
   siguiendo el patrón de `referrals.py` (proxies de `require_user`/`require_admin`, rate limit).

---

## 7. Decisiones ABIERTAS (confirmar antes de implementar)

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | **Lifetime (500 € único)** cómo cuenta | — | ✅ **DECIDIDO: `bonus` único de 50 €** por cada referido lifetime. Se excluye del recuento por bloques y se paga una sola vez (sellado en `finalize`). |
| D2 | **Umbral mínimo de pago** | — | **N/A**: el modelo de bloques ya impone un mínimo de **1 bloque = 1000 €**. Por debajo de 1000 activos el pago es 0 € → sin micro-pagos ni arrastre |
| D3 | **¿Cuentan los `trialing`?** | sí / no | **No** — solo tras el primer cobro real (evita fraude de trials) |
| D4 | **Ventana de atribución** | primer toque de por vida / N días | **De por vida del referido** (ya que pagamos por actividad, no por el click) |
| D5 | **Método de cobro prioritario** | transferencia bancaria manual / PayPal / Stripe Connect | **Fase 1: banco/PayPal manual** · **Fase 2: Connect** |
| D6 | **¿Quién puede ser afiliado?** | abierto a cualquier usuario / solo por invitación/aprobación | **Aprobación manual** (control de calidad y antifraude) |
| D-panel | **Panel self-service del afiliado** (que el cliente vea SUS referidos) | Fase 1 / Fase 2 | **Fase 1** — dar visibilidad desde el principio; el endpoint `GET /affiliate/me` ya es Fase 1 |
| D-priv | **Privacidad de la lista del afiliado** | email completo / enmascarado | **Enmascarado** (sin PII de otros usuarios; email completo solo en admin) |

---

## 8. Endpoints propuestos

### Afiliado (`/api/affiliate/*`, `require_user`)
- `POST /affiliate/apply` — solicitar alta (acepta términos → guarda `terms_accepted_at/ip`).
- `GET  /affiliate/me` — **panel self-service del afiliado**. Devuelve: estado, código/link
  (`/?ref=CODE`), nº de **registrados**, nº de **suscriptores de pago activos**, **bloques completos**
  y **€ estimado del mes** (bloques×1000 + lifetime×50), referidos lifetime + bonus, y **histórico de
  cobros** (lo ya pagado). Incluye la **lista de sus referidos con privacidad** (ver nota GDPR abajo).
- `PUT  /affiliate/payout-details` — método + datos de cobro y fiscales (**cifrados** con Fernet).
- `POST /affiliate/request-payout` — **el afiliado solicita el pago** de su saldo acumulado (una
  solicitud abierta a la vez). Genera una notificación pendiente para el admin. `/affiliate/me`
  devuelve `open_request` para reflejar el estado del botón "Solicitar pago".

> **Privacidad de la lista de referidos (GDPR).** El endpoint actual `GET /referrals/me` devuelve el
> **email completo** del referido. En el panel del afiliado eso **no debe exponerse**: un afiliado no
> puede ver la PII de otros usuarios. La lista se muestra **enmascarada** (`j***@gmail.com`) o
> anónima (*"Referido #1 — de pago activo — plan mensual — desde 12/07"*): estado/plan/fecha sí,
> identidad no. La vista completa con email queda **solo para el admin** (§8bis-E).

> **Ubicación de fase.** El endpoint `GET /affiliate/me` es Fase 1. La **página frontend** del panel
> del afiliado puede entrar en Fase 1 (recomendado, para dar visibilidad desde el principio) o
> quedar en Fase 2 — decisión de alcance pendiente (ver §7-D-panel).

### Admin (`/api/admin/affiliates/*`, `require_admin`)
- `GET   /admin/affiliates?segment=&sort=&group=` — **lista de afiliados separada** de la de clientes,
  con contadores calculados (total referidos, activos de pago, bloques, € estimado). Ver §8bis.
- `GET   /admin/affiliates/{id}` — **ficha del afiliado + lista de SUS referidos** (estado/plan/fecha)
  + histórico de pagos. Ver §8bis.
- `POST  /admin/affiliates/{id}/approve` · `/reject` · `/suspend`.
- `PATCH /admin/affiliates/{id}` — override de tarifa, umbral, notas.
- `POST  /admin/affiliates/payout-run?period=YYYY-MM` — genera/recomputa el `draft`.
- `POST  /admin/affiliates/payout-run/{id}/finalize` — congela el run.
- `GET   /admin/affiliates/payout-runs` · `GET .../payout-runs/{id}` — ver runs y líneas.
- `POST  /admin/affiliates/payout-lines/{id}/mark-paid` — registra pago manual (`payout_reference`).
- `GET   /admin/affiliates/payout-runs/{id}/export.csv` — CSV para el banco (email, IBAN, importe).
- `GET   /admin/affiliates/payout-requests` — **solicitudes de pago pendientes** (notificación admin).
- `POST  /admin/affiliates/payout-requests/{id}/mark-paid` · `/reject` — resolver una solicitud.

---

## 8bis. Organización del panel de admin (afiliados separados de los clientes)

> Requisito del propietario: los afiliados **NO se mezclan** con la lista general de usuarios. Cada
> cliente con referidos se ve por separado, con sus propios referidos dentro, y se puede ordenar
> **de 1000 en 1000**.

**A) Sección "Afiliados" propia.** La lista general "Usuarios/Clientes" de `AdminPage.jsx` **no
cambia**. Se añade una **pestaña/sección nueva "Afiliados"** que muestra **solo** clientes que son
afiliados (los que tienen ficha en la colección `affiliates`). Así no se mezclan.

**B) Segmentación "los que tienen / los que no" (`segment=`).** Dentro de Afiliados, dos vistas:
- **Con referidos** — han traído ≥1 referido (opción de contar solo los de pago activos).
- **Sin referidos** — afiliados aprobados que aún no han traído a nadie.

**C) Columnas por fila de afiliado:**

| Email / nombre | Código | Estado | Referidos (total) | **De pago activos** | **Bloques** ⌊act/1000⌋ | **Lifetime** | **€ este mes** | Ver |
|---|---|---|---|---|---|---|---|---|

**D) Ordenar / agrupar "de 1000 en 1000" (`sort=` / `group=`):**
- `sort=active_desc` — por nº de referidos de pago activos (de mayor a menor).
- `sort=blocks_desc` — por bloques completos.
- `sort=amount_desc` — por € a pagar este mes.
- `group=block_tier` — **agrupa por tramo de millar**: `≥1000 (1 bloque)`, `≥2000 (2 bloques)`, … →
  ves de un vistazo quién ha cruzado cada 1000 y, por tanto, quién sube de bloque de pago.

**E) Ficha de cada afiliado (`GET /admin/affiliates/{id}`):**
- Su **código/link** (`/?ref=CODE`) y datos de cobro/fiscales.
- **Lista de SUS referidos** (solo los suyos), con el estado de cada uno: *registrado (gratis) ·
  de pago activo · lifetime · cancelado/expirado*, su plan y la fecha.
- **Resumen de pago**: X activos de pago → Y bloques → `Y × 1000 €` + (nº lifetime nuevos × 50 €).
- **Histórico de liquidaciones** pagadas a ese afiliado (fecha, importe, referencia).

**Cómo se calcula (reutiliza `referred_by_id`):** los referidos de un afiliado `A` son
`db.users.find({"referred_by_id": A.user_id})`; los que cuentan para el pago son los de pago activos
no-lifetime (§5.1); los lifetime se listan aparte para el bonus. **Todo se deriva en vivo de los
datos de suscripción existentes** — no hay que mantener ninguna lista a mano.

---

## 9. Antifraude y control (con dinero real el incentivo sube)

- **Auto-referido** ya bloqueado (`referrals.py`). Mantener.
- **Solo cuenta tras cobro real** (excluir `trialing`, D3) → un trial no genera pago.
- **Dominios de email desechables**: rechazar/flag en el track o al contar.
- **Fingerprint** (Fase 2): flag de afiliados cuyos referidos comparten IP/huella de tarjeta.
- **Retención del primer pago** N días (Fase 2) para dejar margen a reembolsos.
- **Refund/chargeback** → exclusión automática (snapshot) + clawback de lo ya pagado (Fase 2).
- **Rate limiting** ya aplicado al endpoint de track (5/min).

---

## 10. Legal / fiscal / operación (gating — no se cierra desde el repo)

Igual que Stripe hoy, estos puntos requieren decisiones/consolas externas:
- **Contrato de afiliación / T&C** aceptados y sellados (timestamp + IP) en `affiliates`.
- **Fiscalidad (España)**: el afiliado emite factura o se hace **autofactura**; posible retención
  **IRPF (modelo 111)**; si el afiliado está en otro país UE, **operaciones intracomunitarias
  (modelo 349)** y VIES. **Consultar con asesor fiscal antes de lanzar.**
- **KYC/AML**: obligatorio si se usa Stripe Connect (Fase 2). En Fase 1 (pago manual) recae en tu
  proceso de alta.
- **Reglas de Stripe Connect**: usar payouts como recompensa a veces requiere aprobación previa
  de Stripe → verificar en el dashboard antes de la Fase 2.

---

## 11. Plan de pruebas (convención del repo: unit offline en `backend/tests/`)

- **Cálculo por bloques**: dado un conjunto sintético de `users` (con `referred_by_id` +
  `is_premium`/`subscription_status`/plan) → importes esperados con **suelo y paso de 1000**,
  **excluyendo lifetime**: 999 → 0 €, 1000 → 1000 €, 1999 → 1000 €, 2000 → 2000 €, 5000 → 5000 €.
- **Bonus lifetime** (D1): un referido lifetime activo sin bonificar → **+50 € una vez**; tras
  `finalize` queda sellado y en el run siguiente ya no vuelve a pagar (idempotente); un lifetime
  reembolsado (`is_premium=false`) → 0 €. Verificar que **no** cuenta también en los bloques.
- **Idempotencia**: recomputar un `draft` reemplaza líneas; `finalized` no se altera.
- **Exclusión por refund**: `is_premium=false` → no cuenta.
- **Doble programa**: referrer afiliado aprobado → **no** recibe comisión de wallet.

---

## 12. Resumen de esfuerzo

| Fase | Alcance | Tamaño | Bloqueos externos |
|---|---|:--:|---|
| **1 — MVP semi-manual** | modelo de datos, alta/aprobación, run mensual (admin), panel de liquidación, CSV, marcar pagado | Pequeño-medio | Contrato/fiscalidad (legal) |
| **2 — Automatización** | Cloud Scheduler, Stripe Connect + payouts, clawback, panel del afiliado, fingerprint | Medio-grande | KYC + aprobación Stripe Connect |
| **3 — Extras** | tramos/bonus, (multi-nivel con cautela legal) | Variable | Asesoría legal (multi-nivel) |

**Recomendación final:** implementar la **Fase 1** para validar el negocio y el encaje legal con
coste mínimo, y automatizar los payouts (**Fase 2, Stripe Connect**) cuando el volumen lo
justifique.
