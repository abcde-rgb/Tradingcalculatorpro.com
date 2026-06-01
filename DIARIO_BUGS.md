# 📋 DIARIO DE BUGS & FIXES — TradingCalculator.Pro

> **Instrucciones:** Este archivo se actualiza automáticamente con cada problema detectado, su solución y si está 100% resuelto.
> Formato: cada entrada tiene fecha, descripción del bug, causa raíz, solución aplicada y estado de resolución.

---

## 🔴 BUGS CRÍTICOS

---

### [2026-06-01] BUG-001 — Demo bypass admin en store.js
**Severidad:** 🔴 CRÍTICA  
**Archivo afectado:** `frontend/src/lib/store.js`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
Existe un bypass hardcodeado en la función `login()` del store de Zustand. Si el email es `demo@btccalc.pro`, el sistema inyecta un usuario con `is_admin: true` y `subscription_plan: 'lifetime'` sin verificar nada en el backend ni en la base de datos.

**Causa raíz:**
```js
const DEMO_USER = { id: 'demo', is_admin: true, is_premium: true, subscription_plan: 'lifetime' }
if (email === 'demo@btccalc.pro') {
  set({ user: DEMO_USER, token: DEMO_TOKEN ... });
  return { success: true };
}
```

**Impacto:**
- Cualquier persona que conozca ese email tiene acceso admin total
- Visible en el código fuente del build de producción
- Exposición de funciones admin y datos de usuarios reales

**Solución requerida:**
1. Eliminar las líneas de `DEMO_USER`, `DEMO_TOKEN` y el bloque `if (email === 'demo@btccalc.pro')` en `store.js`
2. Si se necesita acceso de prueba, crear usuario real en PostgreSQL con contraseña segura
3. Hacer rebuild y redeploy del frontend

**Resuelto al 100%:** ❌ NO — Pendiente de implementar

---

### [2026-06-01] BUG-002 — REACT_APP_BACKEND_URL no configurado en el build
**Severidad:** 🔴 CRÍTICA  
**Archivo afectado:** `frontend/src/lib/store.js`, `.github/workflows/deploy.yml`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
Todo el frontend depende de `const API = process.env.REACT_APP_BACKEND_URL`. Si esta variable no está en GitHub Secrets cuando se hace el build de producción, el valor resulta `undefined` y **NINGUNA función que requiera backend funciona**: login, registro, precios, pagos, alertas, descarga de datos.

**Causa raíz:**
Variables de entorno de React deben estar disponibles en BUILD TIME (no en runtime). Si no están en los GitHub Secrets del workflow, el bundle se genera con `undefined`.

**Síntoma observable:**
- Login muestra error genérico de conexión
- Forgot password muestra "Email enviado" pero no envía nada (hay un setTimeout falso)
- Botones de pago no redirigen a Stripe

**Solución requerida:**
1. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret
2. Nombre: `REACT_APP_BACKEND_URL` | Valor: `https://tradingcalculator-api-704202303011.us-central1.run.app`
3. Nombre: `REACT_APP_GOOGLE_CLIENT_ID` | Valor: tu client ID de Google OAuth
4. Verificar en `.github/workflows/deploy.yml` que se pasan al build:
   ```yaml
   env:
     REACT_APP_BACKEND_URL: ${{ secrets.REACT_APP_BACKEND_URL }}
     REACT_APP_GOOGLE_CLIENT_ID: ${{ secrets.REACT_APP_GOOGLE_CLIENT_ID }}
   ```
5. Hacer trigger del workflow de deploy

**Resuelto al 100%:** ❌ NO — Pendiente de implementar

---

### [2026-06-01] BUG-003 — Stripe: checkout y webhooks no configurados
**Severidad:** 🔴 CRÍTICA  
**Archivo afectado:** `backend/server.py`, `frontend/src/pages/PricingPage.jsx`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
El flujo de pago completo está roto en producción:
1. `POST /api/checkout/create` falla con error 500 porque `STRIPE_API_KEY` no está configurada en Cloud Run
2. Aunque alguien pagara, nunca recibiría acceso premium porque el webhook de Stripe no está configurado
3. Los 4 productos (monthly, quarterly, annual, lifetime) no existen en el dashboard de Stripe o sus Price IDs no están en el código del backend

**Impacto:**
- Ingresos = €0. Nadie puede comprar.
- Usuarios que intentan pagar ven un error sin explicación

**Solución requerida:**
1. Stripe Dashboard → Products → Crear 4 productos con sus precios
2. Copiar Price IDs (`price_xxx`) al backend en el endpoint de checkout
3. Stripe → Webhooks → Add endpoint: `https://tradingcalculator-api-704202303011.us-central1.run.app/api/stripe/webhook`
4. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Cloud Run → añadir `STRIPE_API_KEY=sk_live_xxx` y `STRIPE_WEBHOOK_SECRET=whsec_xxx`

**Resuelto al 100%:** ❌ NO — Pendiente de implementar

---

## 🟠 BUGS IMPORTANTES

---

### [2026-06-01] BUG-004 — Panel admin muestra datos hardcodeados (no reales)
**Severidad:** 🟠 IMPORTANTE  
**Archivo afectado:** `backend/admin_routes.py`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
El panel de administración devuelve métricas inventadas (usuarios, revenue, suscripciones) en lugar de hacer queries reales a PostgreSQL. Esto hace que el admin no pueda tomar decisiones reales de negocio.

**Solución requerida:**
Sustituir todos los `return {"total_users": 1250}` por queries reales:
```python
total = db.query(User).count()
premium = db.query(User).filter(User.is_premium == True).count()
revenue = db.query(func.sum(Payment.amount)).filter(Payment.status=="paid").scalar()
```

**Resuelto al 100%:** ❌ NO — Pendiente

---

### [2026-06-01] BUG-005 — Google OAuth inoperativo sin GOOGLE_CLIENT_ID
**Severidad:** 🟠 IMPORTANTE  
**Archivo afectado:** `frontend/src/components/auth/GoogleSignInButton.jsx`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
El botón de Google Sign-In se renderiza pero al hacer click no inicia el flujo OAuth. La causa es que `REACT_APP_GOOGLE_CLIENT_ID` está vacío en el build actual.

**Solución requerida:**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Authorized origins: `https://tradingcalculator.pro` y `https://abcde-rgb.github.io`
3. Añadir Client ID en GitHub Secrets → `REACT_APP_GOOGLE_CLIENT_ID`
4. También añadir `GOOGLE_CLIENT_ID` en Cloud Run para que el backend verifique los tokens

**Resuelto al 100%:** ❌ NO — Pendiente

---

### [2026-06-01] BUG-006 — "Olvidé mi contraseña" miente al usuario
**Severidad:** 🟠 IMPORTANTE  
**Archivo afectado:** `frontend/src/pages/AuthPages.jsx` (ForgotPasswordPage)  
**Estado:** ❌ SIN RESOLVER (se resuelve automáticamente al resolver BUG-002)

**Descripción del problema:**
Cuando `REACT_APP_BACKEND_URL` no está configurado, el código tiene un fallback:
```js
if (!API) {
  await new Promise(r => setTimeout(r, 600));
  setSent(true); // ← Muestra "Email enviado" aunque NO se envió ningún email
  return;
}
```
El usuario cree que recibirá el email de recuperación y nunca llega.

**Solución requerida:**
Eliminar el bloque `if (!API)` completo. Al resolver BUG-002 (configurar REACT_APP_BACKEND_URL), este bug desaparece automáticamente.

**Resuelto al 100%:** ❌ NO — Depende de BUG-002

---

### [2026-06-01] BUG-007 — Preferencias de usuario solo en localStorage
**Severidad:** 🟡 MENOR  
**Archivo afectado:** `frontend/src/pages/SettingsPage.jsx`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
`emailNotifications` y `compactMode` se guardan bajo la clave `tcp-preferences` en localStorage. Si el usuario cambia de dispositivo o limpia el navegador, pierde todas sus preferencias.

**Solución requerida:**
1. Añadir endpoint `PATCH /api/user/preferences` en el backend
2. Actualizar SettingsPage para hacer el POST al backend al guardar
3. En la carga del perfil, traer también las preferencias desde la API

**Resuelto al 100%:** ❌ NO — Prioridad baja

---

### [2026-06-01] BUG-008 — server.py de 223KB: rendimiento y mantenibilidad
**Severidad:** 🟠 IMPORTANTE  
**Archivo afectado:** `backend/server.py`  
**Estado:** ❌ SIN RESOLVER

**Descripción del problema:**
Todo el backend (rutas, modelos, lógica, middlewares, servicios) está en un único archivo de 223KB (~6.000 líneas). Esto causa:
- Cold start de Cloud Run más lento
- Imposible localizar un bug sin buscar en miles de líneas
- Conflictos al intentar hacer cambios simultáneos
- Archivos complementarios como `missing_apis.py` (45KB) con endpoints sin implementar

**Solución requerida:**
Refactorizar en la estructura modular propuesta en la reconfiguración:
```
backend/app/
├── main.py (~60 líneas)
├── config.py
├── database.py
├── models.py
├── auth.py
└── routers/
    ├── auth_router.py
    ├── payments_router.py
    ├── admin_router.py
    └── ...
```

**Resuelto al 100%:** ❌ NO — Trabajo estimado: 4-6 horas

---

## ✅ BUGS RESUELTOS

*(Esta sección se irá llenando conforme se resuelvan los bugs anteriores)*

---

## 📊 RESUMEN DE ESTADO

| Bug | Descripción | Severidad | Resuelto |
|-----|-------------|-----------|----------|
| BUG-001 | Demo bypass admin | 🔴 CRÍTICA | ❌ |
| BUG-002 | REACT_APP_BACKEND_URL vacío | 🔴 CRÍTICA | ❌ |
| BUG-003 | Stripe no configurado | 🔴 CRÍTICA | ❌ |
| BUG-004 | Admin con datos falsos | 🟠 IMPORTANTE | ❌ |
| BUG-005 | Google OAuth inoperativo | 🟠 IMPORTANTE | ❌ |
| BUG-006 | Forgot password miente | 🟠 IMPORTANTE | ❌ |
| BUG-007 | Preferencias solo localStorage | 🟡 MENOR | ❌ |
| BUG-008 | server.py monolítico 223KB | 🟠 IMPORTANTE | ❌ |

**Bugs críticos resueltos:** 0/3  
**Bugs importantes resueltos:** 0/4  
**Bugs menores resueltos:** 0/1  
**Funcionalidad estimada actual:** ~30%  
**Funcionalidad estimada tras resolver todo:** 100%

---

*Última actualización: 2026-06-01 por análisis automático*  
*Próxima revisión: tras resolver BUG-001 y BUG-002 (prioridad máxima)*
