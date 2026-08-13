---
paths:
  - "cloudbuild.yaml"
  - ".github/workflows/**"
  - "backend/Dockerfile"
  - "backend/setup-gcp.sh"
  - "backend/requirements.txt"
---

# Infraestructura y despliegue

## Qué se despliega solo y qué no

| Trigger | Resultado |
|---|---|
| Push a `main` con cambios en `frontend/**` | `deploy-gh-pages.yml` → GitHub Pages |
| Push a `main` con cambios en `backend/**` | **Nada.** El workflow se retiró el 2026-08-03 (fallaba la federación de identidad) |
| Manual desde GCP | `cloudbuild.yaml` |

El backend **se despliega a mano**. Un despliegue manual es un despliegue que se olvida:
si tocas backend, dilo explícitamente al cerrar la sesión.

Auth de GCP en Actions: **Workload Identity Federation**, sin claves JSON.

## Ajustes que parecen tuning y son decisiones

- **`min-instances`** (variable de repo `MIN_INSTANCES`, por defecto `1`): intencionado
  para evitar arranques en frío en una app financiera. A `0` se ahorra coste a cambio de
  2–4 s para el primer usuario tras inactividad.
- **`DB_PROVIDER`**: vacío/`cloudsql` monta el socket de Cloud SQL; `neon` conecta por
  TCP+SSL con el secreto `DATABASE_URL`. `init_pool` soporta ambos.
  Guía: [`docs/MIGRACION_NEON.md`](../../docs/MIGRACION_NEON.md).
- **`samesite=none` + `secure`** en cookies: obligatorio porque frontend (Pages) y backend
  (Cloud Run) son dominios distintos. Requiere HTTPS. **No lo toques.**
- **`ENVIRONMENT`** no se setea en producción → cae a `"production"`. En local,
  `ENVIRONMENT=development`.

## `init_pool` trata todo host TCP como si fuera Neon

Exige SSL verificado, así que un Postgres local sin SSL falla con
`CERTIFICATE_VERIFY_FAILED` (hueco G-11). En local, conecta **por socket Unix**:

```
DATABASE_URL='postgresql://user:pass@/trading_dev?host=/var/run/postgresql'
```

## Los secretos nunca entran al repo

Sólo `.env.example` + Secret Manager (backend) / GitHub Secrets (frontend).

⚠️ **C-08 sigue abierto**: `sendgrid_api_key`, `revolut_api_key`, `nowpayments_api_key` y
`coinbase_api_key` se pueden sobreescribir desde `app_settings` (BD, en claro). La
decisión tomada fue **sólo Secret Manager**; falta ejecutarla. Y `coinbase_api_key` está
muerto: es de una pasarela retirada.

## La purga por retención no tiene planificador

`purge_lapsed_user_data` sólo corre en `startup_event`. Con `min-instances=1`, un
contenedor que no se reinicie en semanas **no purga nada**. Falta un Cloud Scheduler.

## Dependencias

11 PRs de Dependabot abiertos, el más viejo del 14 de julio. `numpy` y `scipy` sostienen
Black-Scholes y las griegas: hay 761 funciones de test para respaldar el salto, y saltar
cinco versiones menores de golpe más adelante duele más.
