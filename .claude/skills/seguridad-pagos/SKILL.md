---
name: seguridad-pagos
description: Revisa la seguridad de auth (JWT httpOnly + Google OAuth + magic link + passkeys + 2FA TOTP), pagos (Stripe/PayPal/Revolut/NOWPayments), webhooks, referidos/afiliados y admin en FastAPI. Úsala al tocar la parte de auth de server.py, webhooks, checkout, admin_routes.py, nowpayments.py, revolut.py, passkeys.py, referrals.py, affiliate_program.py o variables de entorno/secretos.
disable-model-invocation: true
---

# Revisión de seguridad FastAPI + pagos

> `disable-model-invocation: true` — esta skill solo se dispara escribiendo `/seguridad-pagos`,
> porque revisa superficie sensible y no debe activarse sola.

## Checklist (fijado en las auditorías internas)

1. **JWT** obligatorio en prod (`RuntimeError` si falta `JWT_SECRET`); cookies
   `httpOnly + secure + samesite=none`; refresh path-scoped (`/api/auth/refresh`). Revocación por
   lista negra de `jti`. **2FA TOTP** en `/auth/2fa/*`. Admin **exige** segundo factor: sólo un
   entorno no productivo puede desactivarlo (`ADMIN_2FA_OPTIONAL` se ignora en producción — a
   propósito, para que no baste con poner una variable en el servicio).

2. **Webhooks verifican firma ANTES de actuar:** Stripe (`construct_event`), NOWPayments
   (HMAC-SHA512 sobre el body crudo, `compare_digest` → 401 si falla). Nunca activar premium sin
   verificar firma.

3. **C-08 pendiente:** las claves Stripe/SendGrid deben venir SOLO de Secret Manager, no de
   `app_settings` (BD). Marca cualquier lectura de clave desde BD.

4. **Claim atómico = `find_one_and_update`, NUNCA `update_one`.**
   El shim `update_one` hace SELECT → aplica los operadores en Python → UPDATE, **sin transacción
   ni bloqueo de fila**: dos llamadas concurrentes leen la misma fila, las dos pasan la condición y
   las dos escriben (y ambas devuelven `matched=1`). El único primitivo atómico del shim es
   `find_one_and_update`, que hace `SELECT … FOR UPDATE` dentro de una transacción.
   Las tres rutas de pago ya lo usan correctamente (`server.py` ~4385, ~4728, ~4809); el
   `update_one` posterior sólo revierte el estado a `pending` y ahí no hay carrera.
   **Un "claim" escrito con `update_one` condicional es una carrera, no un claim** — rechaza el
   patrón `find_one(...)` + `update_one(...)` en cualquier consumo de un solo uso.

5. **Consumo de tokens de un solo uso — carrera abierta (G-37).** `POST /auth/magic-link/verify`
   (`server.py` ~2255-2263) y el reset de contraseña (~2404-2416) hacen `find_one({used: False})`
   y después `update_one({used: True})`: ventana TOCTOU que permite canjear el mismo enlace dos
   veces. El token va hasheado (SHA-256), es de un solo uso por diseño, caduca a los 15 min y está
   limitado a 10/min — el impacto es bajo, pero la corrección es gratis: `find_one_and_update` con
   la condición `used: False`, que ya existe en el shim.

6. **Rate limiting y la IP real.** Auth limitado (register 3/h, login 10/min, google 10/min,
   refresh 30/min, magic-link 10/min). La clave del limitador es `_real_client_ip()`, que cuenta
   `x-forwarded-for` **desde la DERECHA** con `TRUSTED_PROXY_HOPS`: un cliente puede anteponer IPs
   falsas, no puede añadir por detrás del proxy. `parts[0]` sería falsificable y anularía el
   límite. Ojo: `uvicorn` corre sin `--forwarded-allow-ips`, así que `request.client.host` es
   siempre el front de Cloud Run y no sirve como clave.

7. **Fraude de referidos/afiliados: la IP registrada es falsificable (G-38).**
   `referrals.py:196` y `affiliate_program.py:294` guardan la IP con
   `x-forwarded-for.split(",")[0]` — el valor lo elige el atacante, al contrario que en el
   limitador y el log de admin, que usan `_real_client_ip()`. Hoy ese campo no alimenta ningún
   control (nadie lo lee), así que no hay bypass activo: lo que se corrompe es la **prueba** en el
   expediente de fraude. Pero cualquier deduplicación futura por IP (autorreferidos, granjas de
   cuentas) nacería rota sobre un dato que escribe el atacante. Los dos módulos no importan de
   `server.py`, así que la corrección limpia es un helper compartido, no un parche de dos líneas.

8. **Sin secretos en el repo** (`git grep -nE "sk_live|whsec_|AIza|SG\."`). `GOOGLE_CLIENT_ID` con
   `.strip()` (un `\n` final rompe todos los logins OAuth). Ese `git grep` mira **el árbol actual**:
   no ve un secreto que se commiteó y se borró después. Para eso hace falta escanear el historial
   (ver *Huecos de tooling*).

9. **Endurecimiento pendiente:** sustituir los ~10 `detail=str(e)` por mensajes genéricos (no
   filtrar texto de error interno).

10. **Ciclo de cuenta:** borrado RGPD `DELETE /auth/account` (cancela Stripe antes de borrar) +
    retención 3 meses tras impago. Export RGPD con entrega desde admin (`gdpr_exports`).

11. **Google OAuth es flujo de `id_token`, no de redirección.** `verify_oauth2_token` comprueba
    firma, audiencia, emisor y expiración. **No apliques aquí el checklist clásico de OAuth**
    (`redirect_uri`, `state`, PKCE): no hay redirección que envenenar. Lo que sí aplica es la
    audiencia (que ya se valida) y, si algún día se usa el flujo de un solo toque, el `nonce`.

12. **Passkeys (WebAuthn):** `verify_registration_response` / `verify_authentication_response` con
    `expected_rp_id` y `expected_origin`, y `sign_count` que **sólo puede subir** (un contador que
    baja delata un autenticador clonado). El `rp_id` sale de `FRONTEND_URL` sin la ruta del
    repositorio — WebAuthn no la lleva. No lo "arregles".

## Estado verificado (2026-08-22)

Comprobado contra el código, no contra la memoria. Lo que ya está hecho — no vuelvas a abrirlo:

| Control | Estado | Dónde |
|---|---|---|
| CodeQL (python + javascript-typescript, `security-extended`, cron semanal) | ✅ | `.github/workflows/codeql.yml` |
| Dependabot (pip · npm · github-actions) | ✅ | `.github/dependabot.yml` |
| Cabeceras de seguridad de la API (CSP, HSTS sólo en https, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, `no-store` en rutas de auth) | ✅ | `SecurityHeadersMiddleware`, `server.py` ~9342 |
| CORS con lista explícita, sin comodín con credenciales, métodos y cabeceras acotados | ✅ | `server.py` ~1181 |
| IP real a prueba de suplantación en limitador y log de admin | ✅ | `_real_client_ip()`, `server.py` ~1233 |
| Revocación de JWT por `jti` | ✅ | `server.py` ~1372 |
| Claim atómico en las tres rutas de pago | ✅ | `find_one_and_update`, `server.py` ~4385/4728/4809 |

## Huecos de tooling (lo que falta en CI)

- **Escaneo de secretos: NO existe** (parte de **G-07**). No hay `gitleaks` ni `trufflehog` en ningún
  workflow — G-07 habla del interruptor nativo en Settings; esto es lo otro: un paso propio. CodeQL
  y Dependabot no lo cubren: Dependabot mira dependencias y CodeQL mira patrones de código.
  Un `sk_live_…` commiteado y borrado después no lo caza nadie hoy. Lo que hace falta es un paso
  que escanee **el historial completo** (`fetch-depth: 0`), no sólo el árbol.
- **`pip-audit` y `npm audit` son manuales**, no son un paso de CI. Dependabot abre PRs, pero no
  bloquea un merge que introduzca una dependencia vulnerable.
- **La SPA no manda CSP — hueco G-10, ya inventariado.** El middleware protege las respuestas de la API, pero la aplicación que
  usa el navegador se sirve desde GitHub Pages, que **no permite cabeceras propias**. Como
  `frontend/public/index.html` tampoco lleva `<meta http-equiv="Content-Security-Policy">`, la
  página que carga Google OAuth, GA4, GTM y TradingView va sin CSP. La única palanca ahí es el
  meta, y **no admite `report-only`**: hay que enumerar los orígenes reales y verificarlo en
  navegador, o el CSP rompe el login y la analítica. Detalle completo en G-10.

## Herramientas

`pip-audit` (deps backend), `npm audit` (frontend), CodeQL y Dependabot (ya activos),
`gitleaks`/`trufflehog` (pendientes), y el agente `revisor-seguridad` para la pasada completa.
