// Hook para verificar acceso premium
import { useAuthStore } from './store';

export function useIsPremium() {
  const { user, isAuthenticated } = useAuthStore();
  
  // Si no está autenticado, NO es premium
  if (!isAuthenticated) return false;
  
  // Usuario con is_premium activo
  if (user?.is_premium === true) return true;
  
  // Usuario con plan lifetime
  if (user?.subscription_plan === 'lifetime') return true;
  
  // Verificar si la suscripción no ha expirado
  if (user?.subscription_end) {
    const endDate = new Date(user.subscription_end);
    if (endDate > new Date()) return true;
  }
  
  return false;
}
