---
name: seguridad-pagos
description: Revisa la seguridad de auth (JWT httpOnly + Google OAuth + 2FA TOTP), pagos (Stripe/PayPal/Revolut/NOWPayments) y admin en FastAPI. Úsala al tocar la parte de auth de server.py, webhooks, checkout, admin_routes.py, nowpayments.py, revolut.py o variables de entorno/secretos.
disable-model-invocation: true
---

# Revisión de seguridad FastAPI + pagos

> `disable-model-invocation: true` — esta skill solo se dispara escribiendo `/seguridad-pagos`,
> porque revisa superficie sensible y no debe activarse sola.

## Checklist (fijado en las auditorías internas)
1. **JWT** obligatorio en prod (`RuntimeError` si falta `JWT_SECRET`); cookies
   `httpOnly + secure + samesite=none`; refresh path-scoped (`/api/auth/refresh`). Revocación de
   tokens activa. **2FA TOTP** en `/auth/2fa/*` (ya implementado).
2. **Webhooks verifican firma ANTES de actuar:** Stripe (`construct_event`), NOWPayments
   (HMAC-SHA512 sobre el body crudo, `compare_digest` → 401 si falla). Nunca activar premium sin
   verificar firma.
3. **C-08 pendiente:** las claves Stripe/SendGrid deben venir SOLO de Secret Manager, no de
   `app_settings` (BD). Marca cualquier lectura de clave desde BD.
4. **Idempotencia de pagos:** claim atómico (`update_one` con condición). **Rate limiting** en auth
   (register 3/h, login 10/min, google 10/min, refresh 30/min).
5. **Sin secretos en el repo** (`git grep -nE "sk_live|whsec_|AIza|SG\."`). `GOOGLE_CLIENT_ID` con
   `.strip()` (un `\n` final rompe todos los logins OAuth).
6. **Endurecimiento pendiente:** sustituir los ~10 `detail=str(e)` por mensajes genéricos (no
   filtrar texto de error interno). IP de cliente vía `x-forwarded-for` con fallback (ya está).
7. **Ciclo de cuenta:** borrado RGPD `DELETE /auth/account` (cancela Stripe antes de borrar) +
   retención 3 meses tras impago. Considerar export RGPD `GET /api/user/export`.

## Herramientas
`pip-audit` (deps backend), `npm audit` (frontend), activar Dependabot + CodeQL + secret scanning.
