import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute - Guard routes that require authentication
 */
const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const normalizedUserType = user?.userType?.toLowerCase();
  const normalizedRole = user?.role?.toLowerCase();
  const normalizedPermissions = Array.isArray(user?.permissions)
    ? user.permissions.map((perm) => (typeof perm === 'string' ? perm.toLowerCase() : perm))
    : [];
  const isManager =
    user &&
    (normalizedUserType === 'manager' ||
      normalizedUserType === 'admin' ||
      normalizedRole === 'manager' ||
      normalizedRole === 'admin');

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasRoleAccess = () => {
    if (!requiredRole) return true;
    const required = requiredRole.toLowerCase();
    if (normalizedRole === required || normalizedUserType === required) return true;
    if (required === 'manager' && (normalizedRole === 'admin' || normalizedUserType === 'admin')) return true;
    return false;
  };

  if (requiredRole && !hasRoleAccess()) {
    return <Navigate to="/forbidden" replace />;
  }

  if (
    requiredPermission &&
    !isManager &&
    !normalizedPermissions.includes(requiredPermission.toLowerCase())
  ) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default ProtectedRoute;
