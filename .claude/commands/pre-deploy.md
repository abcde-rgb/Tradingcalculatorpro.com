---
description: Recorre el checklist de lanzamiento y marca los bloqueantes operativos (Stripe, secretos, OAuth, dominio, health) que NO se pueden cerrar desde el repo.
---

# /pre-deploy — checklist de lanzamiento

Recorre `docs/DEPLOY_CHECKLIST.md` y la §8 de `docs/AUDITORIA_FINAL_PRELANZAMIENTO.md` (si existe)
y produce un semáforo. Distingue claramente **código** (verificable aquí) de **operación**
(consolas externas, lo hace el dueño).

## 🔴 Bloqueantes operativos (verificar en consolas externas — no en el repo)
- Stripe producción: productos + price IDs coinciden con `SUBSCRIPTION_PLANS`; webhook
  `…/api/webhook/stripe` con los eventos correctos; probar un pago de cada plan → premium.
- Secretos backend (GCP Secret Manager): `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` (sin `\n`),
  `STRIPE_API_KEY` sk_live, `STRIPE_WEBHOOK_SECRET` whsec.
- Secretos frontend (GitHub Actions): `REACT_APP_BACKEND_URL` (sin `/api`), `REACT_APP_GOOGLE_CLIENT_ID`.
- Google OAuth: origen autorizado. Dominio: decisión + DNS antes de mergear.
- Infra: Cloud Run `tradingcalculator-api` en **`us-east1`**. **No hay Cloud SQL**:
  la base de datos es externa y llega por `DATABASE_URL`. `GET /api/health` → 200.

## 🟢 Verificable aquí (código)
Corre `/verify`. Confirma build exit 0, tests passed, i18n paridad, sin secretos en el repo,
CSP meta en `public/index.html`, noindex en rutas privadas.

**Salida:** semáforo 🔴/🟠/🟢 por ítem, con quién lo cierra (dueño/operación vs. código/repo).
