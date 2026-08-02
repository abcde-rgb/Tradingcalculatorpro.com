# Auditoría técnica (2026-05-09)

## Hallazgos críticos

1. **Credenciales demo públicas + hardcoded en backend y frontend**
   - Backend crea automáticamente un usuario demo con password por defecto `1234` en cada arranque si no existe.
   - Frontend muestra explícitamente esas credenciales en pantalla.
   - Impacto: acceso no autorizado predecible, abuso de cuota/API y riesgo de escalada si se reutiliza lógica de privilegios.

2. **CORS permisivo por defecto (`*`)**
   - API permite cualquier origen si no se define `CORS_ORIGINS`.
   - Impacto: superficie ampliada para ataques desde orígenes no confiables (especialmente en flujos con tokens en navegador).

3. **Configuración insegura de secretos por defecto**
   - Fallback automático para `JWT_SECRET` y valor de prueba para `STRIPE_API_KEY`.
   - Impacto: despliegues mal configurados pueden entrar en producción con secretos débiles/no gestionados correctamente.

## Fallos de ejecución / calidad detectados

1. **Tests backend no ejecutan por dependencia faltante**
   - `ModuleNotFoundError: No module named 'requests'` durante la colección.

2. **Tests frontend no ejecutan por dependencia/comando faltante**
   - `craco: not found` al correr el script de test.

## Problemas de conexión / integración

1. **Dependencia fuerte de variables de entorno críticas**
   - MongoDB/JWT/Stripe/Sendgrid/CORS dependen de env vars y tienen defaults inseguros o no productivos.

## Recomendaciones de remediación prioritarias

1. Eliminar credenciales demo hardcoded del cliente y servidor; mover demo a entorno aislado y con rotación automática.
2. Requerir `CORS_ORIGINS` explícito en producción (sin wildcard).
3. Fallar el arranque si faltan secretos críticos (`JWT_SECRET`, `STRIPE_API_KEY` en producción).
4. Añadir instalación reproducible de dependencias y CI que falle en PR si test suite no arranca.
