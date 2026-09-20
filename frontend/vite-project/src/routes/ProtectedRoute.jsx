import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { canAccessFeature } from '../data/subscriptionPlans';
import CloudFarmLoader from '../components/common/CloudFarmLoader';

/**
 * ProtectedRoute - Guard routes that require authentication
 */
const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { isLogin, userData, loading } = useContext(AuthContext);
  const isAuthenticated = isLogin;
  const user = userData;
  const normalizedUserType = user?.userType?.toLowerCase();
  const normalizedRole = user?.role?.toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedUserType === 'admin';
  const isSubscribed = Boolean(user?.isSubscribed || isAdmin);
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
    return <CloudFarmLoader text="Checking your CloudFarm account..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.isAccountVerified === false || String(user?.isAccountVerified).toLowerCase() === 'false') {
    return <Navigate to="/verify-otp" replace />;
  }

  const currentPath = window.location.pathname;
  const isSubscriptionPath = currentPath === '/subscription' || currentPath === '/subscription/manage' || currentPath === '/sub';

  if (!isSubscribed && !isSubscriptionPath && currentPath !== '/payment' && currentPath !== '/payment/verify') {
    return <Navigate to="/payment" replace />;
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

  if (requiredPermission) {
    const permissionKey = requiredPermission;
    const hasFeatureAccess = canAccessFeature(user, permissionKey);
    const hasPermission = normalizedPermissions.includes(permissionKey.toLowerCase());

    if (!hasFeatureAccess && !isManager && !hasPermission) {
      return <Navigate to="/forbidden" replace />;
    }

    if (!hasFeatureAccess) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
