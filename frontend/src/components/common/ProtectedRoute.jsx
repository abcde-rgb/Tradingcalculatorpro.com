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

  // El backend exige 2FA a los administradores (428 en /admin/*). Sin esto el
  // admin vería el panel entero cargar y luego fallar cada llamada: se le lleva
  // a Ajustes, donde puede activarlo.
  if (adminOnly && user?.is_admin && user?.two_factor_enabled === false) {
    return <Navigate to="/settings" state={{ from: location, need2fa: true }} replace />;
  }

  // Los administradores conservan acceso aunque no tengan suscripción.
  if (premiumOnly && !isPremium && !user?.is_admin) {
    return <Navigate to="/pricing" state={{ from: location, gated: true }} replace />;
  }

  return children;
}

export default ProtectedRoute;
