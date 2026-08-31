import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { useIsPremium } from '@/lib/premium';

/**
 * Guarda de rutas.
 *  - Sin login → /login
 *  - adminOnly y no admin → /
 *  - premiumOnly y sin suscripción activa → /pricing
 *    (bloquea a todo cliente sin pago vigente; el trial de 7 días cuenta como
 *    premium. Las páginas para PAGAR —pricing/subscription/settings— no llevan
 *    esta guarda, para que un cliente caducado pueda renovar.)
 */
function ProtectedRoute({ children, adminOnly = false, premiumOnly = false }) {
  const { isAuthenticated, user, token, sessionUnverified } = useAuthStore();
  const isPremium = useIsPremium();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Sesión que no se ha podido verificar y sin token en memoria: `isAuthenticated`
  // viene de localStorage y el refresco por cookie falló por RED (un bloqueo de
  // CORS entra por ahí). Dejar pasar pinta la interfaz de alguien con sesión
  // mientras cada llamada va sin credenciales — pantallas vacías, y en cada
  // recarga lo mismo, sin salida salvo borrar los datos del sitio. Sin token no
  // se puede hacer nada de todos modos, así que se pide entrar otra vez.
  if (sessionUnverified && !token) {
    return <Navigate to="/login" state={{ from: location, sessionExpired: true }} replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  // El 2FA de administrador NO se decide aquí, y no es un descuido.
  //
  // Esta guarda redirigía a /settings a todo admin con `two_factor_enabled ===
  // false`, y con eso adelantaba una decisión que sólo el backend puede tomar:
  // `require_admin` tiene un escape hatch fuera de producción
  // (`ADMIN_2FA_OPTIONAL`) y, desde BUG-076, un margen de alta de diez minutos
  // de un solo uso. El frontend no conoce ninguna de las dos cosas, así que
  // expulsaba a admins que el servidor SÍ iba a dejar entrar — el hueco G-39, y
  // la razón por la que probar el panel en local exigía fabricar un TOTP real.
  //
  // Quien manda es el 428 de `/admin/*`, y `AdminPage` ya lo traduce: enseña el
  // motivo que da el servidor y lleva a Ajustes (BUG-073). Una sola fuente de
  // verdad, y es la que tiene los datos.

  // Los administradores conservan acceso aunque no tengan suscripción.
  if (premiumOnly && !isPremium && !user?.is_admin) {
    return <Navigate to="/pricing" state={{ from: location, gated: true }} replace />;
  }

  return children;
}

export default ProtectedRoute;
