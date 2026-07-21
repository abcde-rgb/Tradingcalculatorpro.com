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
  const { isAuthenticated, user } = useAuthStore();
  const isPremium = useIsPremium();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  // Los administradores conservan acceso aunque no tengan suscripción.
  if (premiumOnly && !isPremium && !user?.is_admin) {
    return <Navigate to="/pricing" state={{ from: location, gated: true }} replace />;
  }

  return children;
}

export default ProtectedRoute;
