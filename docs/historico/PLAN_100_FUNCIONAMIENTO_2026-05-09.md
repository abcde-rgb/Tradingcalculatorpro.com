# Re-análisis completo + GitHub: qué falta para funcionar al 100%

## Hallazgos clave olvidados (código + operación)

1. **No existe carpeta `.github/workflows`**
   - No hay CI automática en GitHub para validar backend/frontend en PR.
   - Impacto: regresiones llegan a main sin freno.

2. **Infra de tests sigue incompleta en entorno real**
   - Frontend depende de instalación de node_modules; sin eso `react-scripts`/`craco` no existen en PATH.
   - Backend tests hacen llamadas HTTP remotas y dependen de red/proxy/URL externa.

3. **Se añadió un `requests.py` shim local (riesgo de deuda técnica)**
   - Puede ocultar comportamientos reales de `requests` (timeouts, sesiones, adapters, retries, SSL settings).
   - Riesgo de falsos positivos/negativos en test.

4. **Admin con permisos potentes pero sin hardening enterprise**
   - Admin puede listar/exportar usuarios, promover admins y modificar planes.
   - Falta auditoría persistente, RBAC granular, 2FA obligatorio y control de sesiones.

5. **Dependencias y build no blindados para CI reproducible**
   - Falta estrategia clara de lockfiles/instalación offline/caché en pipeline.

6. **Seguridad operativa pendiente**
   - CORS wildcard por defecto, demo creds públicas, defaults inseguros de secretos.

---

## Qué falta en GitHub (imprescindible)

1. **Workflow CI backend** (`.github/workflows/backend-ci.yml`)
   - Setup Python
   - install dependencies
   - lint + tests (unit/integration separados)

2. **Workflow CI frontend** (`.github/workflows/frontend-ci.yml`)
   - Setup Node
   - `npm ci`
   - lint + test + build

3. **Branch protection rules**
   - Requerir checks de CI en PR
   - Requerir 1–2 aprobaciones
   - Bloquear push directo a main

4. **Secret scanning + Dependabot + CodeQL**
   - Alertas automáticas de vulnerabilidades y secretos expuestos.

5. **Release workflow**
   - versionado + changelog + despliegue controlado.

---

## Plan para que funcione al 100% (orden recomendado)

### Fase 1 — Estabilización de ejecución
1. Eliminar dependencia de API remota en tests: usar entorno local/mock server.
2. Separar tests en:
   - unit (sin red)
   - integration (con servicios)
   - e2e (opcional)
3. Restaurar dependencia real `requests` y quitar shim local cuando CI tenga internet controlada.

### Fase 2 — CI/CD en GitHub
4. Crear workflows backend/frontend + matriz de versiones.
5. Activar caché de pip/npm para velocidad y reproducibilidad.
6. Configurar branch protection obligatoria.

### Fase 3 — Seguridad
7. Quitar demo credentials públicas de frontend y backend.
8. Forzar `CORS_ORIGINS` explícito en producción.
9. Exigir secretos críticos en arranque (sin defaults inseguros en prod).
10. Añadir rate limiting + reCAPTCHA en auth.

### Fase 4 — Admin hardening
11. Implementar `audit_log` para cada acción admin.
12. Implementar RBAC por scopes (`admin:read`, `admin:write`, `billing:write`).
13. Forzar 2FA para cuentas admin.
14. Añadir endpoint de revocación de sesiones.

### Fase 5 — Observabilidad y negocio
15. Integrar Google Cloud Logging/Error Reporting/Trace.
16. Consolidar métricas de producto en GA4 + BigQuery export.
17. Alertas operativas (latencia, 5xx, fallos webhook Stripe).

---

## Criterio de “100% funcionando” (Definition of Done)

- CI GitHub en verde en cada PR (backend + frontend).
- Tests unitarios sin red 100% deterministas.
- Integración/e2e estables con entornos efímeros.
- Seguridad mínima de producción aplicada (sin demo creds públicas, CORS controlado, secretos obligatorios).
- Panel admin auditado, con RBAC y 2FA.
- Monitoring + alerting activo con SLO definidos.
