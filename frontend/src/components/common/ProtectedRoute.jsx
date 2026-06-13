import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
