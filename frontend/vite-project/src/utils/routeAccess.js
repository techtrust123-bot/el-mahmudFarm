export const getUserType = (user) => {
  const userType = String(user?.userType || user?.role || '').trim().toLowerCase();
  return userType || '';
};

export const getDashboardRouteForUser = (user) => {
  const userType = getUserType(user);

  if (userType === 'admin') {
    return '/admin';
  }

  if (userType === 'manager') {
    return '/dashboard';
  }

  if (userType === 'staff') {
    return '/staff-dashboard';
  }

  return '/dashboard';
};

export const canAccessDashboardRoute = (user, route) => {
  const userType = getUserType(user);
  const target = String(route || '').trim();

  if (target === '/admin') {
    return userType === 'admin';
  }

  if (target === '/dashboard') {
    return userType === 'manager' || userType === 'admin';
  }

  if (target === '/staff-dashboard') {
    return userType === 'staff';
  }

  return true;
};
