# 🤝 Programa de Afiliados — Diseño técnico

> **Estado:** propuesta de diseño (aún **sin implementar**). Documento de trabajo previo a
> tocar código. Fecha: 2026-07-17. Rama: `claude/affiliate-payment-system-nda23v`.
>
> **Qué resuelve:** pagar a socios/afiliados **dinero real, cada mes**, en función de cuántos
> **suscriptores de pago activos** hayan traído a TradingCalculator.Pro.
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
| **Fórmula del importe** | **Lineal**: `tarifa × nº de referidos de pago activos`. La tarifa por defecto es **1 €/suscriptor/mes** (`1000 activos → 1000 €/mes`, `500 → 500 €`, `1500 → 1500 €`). |
| **Cadencia** | Mensual y **recurrente**: mientras el referido siga pagando, el afiliado sigue cobrando por él. |
| **Moneda** | EUR (igual que los planes). |

> **Nota económica.** El plan mensual son 17 €; pagar 1 €/mes por suscriptor activo ≈ **5,9 %**
> de los ingresos brutos de ese usuario → sostenible. El plan anual (200 €) equivale a ~16,7 €/mes
> → ~6 %. El único plan que requiere una regla especial es **lifetime** (500 € una sola vez pero
> "activo para siempre"): ver §7 (Decisiones abiertas).

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
  "rate_eur": 1.0,                    // override opcional; si null usa el global
  "min_payout_eur": 50.0,            // umbral mínimo para pagar (si no, acumula)
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
  "rate_eur": 1.0,                   // tarifa global aplicada en este run
  "snapshot_at": "2026-08-01T00:05:00Z",
  "totals": { "affiliates": 12, "active_subscribers": 3480, "gross_eur": 3480.0,
              "payable_eur": 3410.0, "carryover_eur": 70.0 },
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
  "active_count": 1000,              // referidos de pago activos en el snapshot
  "rate_eur": 1.0,
  "gross_eur": 1000.0,
  "adjustments_eur": 0.0,           // clawback (negativo) por refunds/chargebacks (fase 2)
  "carryover_in_eur": 0.0,          // arrastre de meses previos por debajo del umbral
  "net_eur": 1000.0,                // gross + adjustments + carryover_in
  "carryover_out_eur": 0.0,         // si net < umbral → se arrastra al mes siguiente
  "status": "pending",              // pending | paid | held | below_threshold | skipped
  "counted_referee_ids": ["..."],   // auditoría (o hash/muestra si son muchos)
  "paid_at": null, "payout_reference": null,  // se rellenan al "marcar como pagado"
  "created_at": "..."
}
```
Índices: `run_id`, `affiliate_id`, `status`.

### 4.4 Campos añadidos a documentos existentes
- `users`: reutiliza `referred_by_id`, `referred_by_code` (ya existen). Opcional:
  `affiliate_first_paid_at` (cuándo el referido se hizo de pago por primera vez — para cohortes).
- Global settings (sistema `get_setting`): `affiliate_rate_eur` (1.0), `affiliate_min_payout_eur`
  (50.0), `affiliate_lifetime_mode` (ver §7), `affiliate_program_enabled` (bool).

---

## 5. La contabilidad mensual (el corazón del sistema)

### 5.1 Definición de "suscriptor de pago activo"
Un referido `R` de un afiliado `A` **cuenta** en el periodo si, en el momento del snapshot:
- `R.referred_by_id == A.user_id`, **y**
- `R.is_premium == true`, **y**
- `R.subscription_status ∈ {active, trialing?}` (recomendación: **excluir `trialing`** hasta el
  primer cobro real; ver §7), **y**
- (`R.subscription_end` en el futuro) **o** plan `lifetime` (según `affiliate_lifetime_mode`, §7).

Como los webhooks de Stripe ya mantienen `is_premium`/`subscription_status`/`subscription_end`
al día (§2), **la contabilidad solo lee esos campos**, no habla con Stripe en el run.

### 5.2 Algoritmo del run (periodo `P`, enfoque *snapshot*)
```
para cada afiliado A con status == "approved":
    referidos_activos = db.users.count_documents({
        "referred_by_id": A.user_id,
        "is_premium": true,
        "subscription_status": {"$in": ["active"]},   # + "trialing" si se decide contarlo
        # + filtro de plan según affiliate_lifetime_mode
    })
    rate      = A.rate_eur  or  settings.affiliate_rate_eur
    gross     = referidos_activos * rate
    carry_in  = suma de carryover_out de líneas previas 'below_threshold' de A
    net       = gross + carry_in + adjustments   # adjustments = clawbacks (fase 2)
    if net < (A.min_payout_eur or settings.affiliate_min_payout_eur):
        status = "below_threshold";  carryover_out = net
    else:
        status = "pending";          carryover_out = 0
    persistir línea (run_id, A, referidos_activos, rate, gross, net, status, ...)
persistir totales del run
```

**Idempotencia:** volver a ejecutar un run en `draft` para el mismo `period` **reemplaza** sus
líneas (recomputa). Una vez `finalized`, se congela; recomputar exige crear un run de ajuste.

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
| D1 | **Lifetime (500 € único)** cómo cuenta | (a) `recurring`: 1 €/mes para siempre · (b) `capped`: cuenta N meses (p.ej. 24) · (c) `bonus`: pago único al afiliado (p.ej. 12 €) y deja de contar | **(b) capped a 24 meses** (evita pagar >4,8 % del importe único de forma indefinida) |
| D2 | **Umbral mínimo de pago** | p.ej. 25 € / 50 € / sin umbral | **50 €** (reduce comisiones/coste operativo de micro-transferencias; el resto arrastra) |
| D3 | **¿Cuentan los `trialing`?** | sí / no | **No** — solo tras el primer cobro real (evita fraude de trials) |
| D4 | **Ventana de atribución** | primer toque de por vida / N días | **De por vida del referido** (ya que pagamos por actividad, no por el click) |
| D5 | **Método de cobro prioritario** | transferencia bancaria manual / PayPal / Stripe Connect | **Fase 1: banco/PayPal manual** · **Fase 2: Connect** |
| D6 | **¿Quién puede ser afiliado?** | abierto a cualquier usuario / solo por invitación/aprobación | **Aprobación manual** (control de calidad y antifraude) |

---

## 8. Endpoints propuestos

### Afiliado (`/api/affiliate/*`, `require_user`)
- `POST /affiliate/apply` — solicitar alta (acepta términos → guarda `terms_accepted_at/ip`).
- `GET  /affiliate/me` — estado, código/link (`/?ref=CODE`), tarifa, **activos actuales en vivo**,
  saldo acumulado, histórico de liquidaciones.
- `PUT  /affiliate/payout-details` — método + datos de cobro y fiscales (**cifrados** con Fernet).

### Admin (`/api/admin/affiliates/*`, `require_admin`)
- `GET   /admin/affiliates` — lista + filtros (`pending`/`approved`) + métricas.
- `POST  /admin/affiliates/{id}/approve` · `/reject` · `/suspend`.
- `PATCH /admin/affiliates/{id}` — override de tarifa, umbral, notas.
- `POST  /admin/affiliates/payout-run?period=YYYY-MM` — genera/recomputa el `draft`.
- `POST  /admin/affiliates/payout-run/{id}/finalize` — congela el run.
- `GET   /admin/affiliates/payout-runs` · `GET .../payout-runs/{id}` — ver runs y líneas.
- `POST  /admin/affiliates/payout-lines/{id}/mark-paid` — registra pago manual (`payout_reference`).
- `GET   /admin/affiliates/payout-runs/{id}/export.csv` — CSV para el banco (email, IBAN, importe).

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

- **Cálculo del run**: dado un conjunto sintético de `users` (con `referred_by_id` +
  `is_premium`/`subscription_status`/plan) → líneas e importes esperados (lineal, tarifa 1 €).
- **Umbral y carryover**: net < umbral → `below_threshold` + arrastre correcto al mes siguiente.
- **Modo lifetime** (D1): `recurring` vs `capped` vs `bonus` → recuentos esperados.
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
