import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

import { FiHome, FiPackage, FiUsers, FiSettings, FiDatabase, FiMessageCircle } from 'react-icons/fi';
import { GiCow, GiChicken, GiPayMoney } from 'react-icons/gi';
import { TbCurrencyNaira } from 'react-icons/tb';
import cloudFarmLogo from '../../assets/CloudFarm_logo.png';
import { canAccessFeature } from '../../data/subscriptionPlans';

/**
 * Sidebar Navigation Component
 */
const Sidebar = ({ isOpen, isCollapsed = false, onClose = () => {} }) => {
  const location = useLocation();
  const { user } = useAuth();
  const normalizedRole = user?.role?.toLowerCase();
  const normalizedUserType = user?.userType?.toLowerCase();
  const normalizedPermissions = Array.isArray(user?.permissions)
    ? user.permissions.map((perm) => (typeof perm === 'string' ? perm.toLowerCase() : perm))
    : [];
  const isManager =
    normalizedUserType === 'manager' ||
    normalizedUserType === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'admin';
  const isAdmin = normalizedRole === 'admin' || normalizedUserType === 'admin';
  const isStaff = normalizedUserType === 'staff' || normalizedRole === 'staff';

  const navItems = [
    {
      path: isStaff ? '/staff-dashboard' : '/dashboard',
      label: isStaff ? 'Staff Dashboard' : 'Dashboard',
      icon: FiHome,
      staffOnly: isStaff,
      managerOnly: !isStaff,
      permission: isStaff ? 'dashboard' : 'dashboard',
    },
    { path: '/livestock', label: 'Livestock', icon: GiCow, permission: 'livestock' },
    { path: '/poultry', label: 'Poultry', icon: GiChicken, permission: 'poultry' },
    { path: '/eggInventory', label: 'Egg Inventory', icon: FiDatabase, permission: 'eggInventory' },
    { path: '/feed', label: 'Feed', icon: FiPackage, permission: 'feed' },
    { path: '/sales', label: 'Sales', icon: TbCurrencyNaira, permission: 'sales' },
    { path: '/expenses', label: 'Expenses', icon: GiPayMoney, permission: 'expenses' },
    { path: '/support', label: 'Support', icon: FiMessageCircle, permission: 'support' },

    { path: '/subscription/manage', label: 'Subscriptions', icon: GiPayMoney, permission: 'subscription' },
    { path: '/admin/subscriptions', label: 'Admin Subscriptions', icon: GiPayMoney, adminOnly: true },
    { path: '/admin/notifications', label: 'Admin Notifications', icon: FiDatabase, adminOnly: true },
    { path: '/admin/support', label: 'Admin Support', icon: FiDatabase, adminOnly: true },
    { path: '/staff', label: 'Staff', icon: FiUsers, managerOnly: true, permission: 'staff' },
    { path: '/settings', label: 'Settings', icon: FiSettings, permission: 'settings' },
  ];

  return (
    <aside
      id="cloudfarm-sidebar"
      className={`fixed left-0 top-0 z-40 h-screen ${isCollapsed ? 'w-64 md:w-20' : 'w-64'} bg-gradient-to-b from-emerald-800 to-emerald-900 p-6 text-white transition-all duration-200 ${isCollapsed ? 'md:px-3' : ''} ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <div className={`mb-8 flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
        <img src={cloudFarmLogo} alt="CloudFarm logo" className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1 shadow-sm" />
        <div className={isCollapsed ? 'md:hidden' : ''}>
          <h1 className="text-lg font-bold leading-none">CloudFarm</h1>
        </div>
      </div>

      <nav className="sidebar-scroll flex max-h-[calc(100vh-180px)] flex-1 flex-col space-y-4 overflow-y-auto pr-1">
        {navItems
          .filter((item) => {
            if (item.adminOnly && !isAdmin) {
              return false;
            }
            if (item.staffOnly && !isStaff) {
              return false;
            }
            if (item.managerOnly && !isManager) {
              return false;
            }
            if (item.path === '/dashboard' && isStaff) {
              return false;
            }
            if (item.path === '/staff-dashboard' && !isStaff) {
              return false;
            }
            if (item.permission) {
              const featureKey = item.permission;
              const hasPermission = normalizedPermissions.includes(featureKey.toLowerCase());
              const hasPlanAccess = canAccessFeature(user, featureKey);

              if (!hasPlanAccess) {
                return false;
              }

              if (isStaff && !hasPermission) {
                return false;
              }

              if (!hasPermission) {
                return false;
              }
            }
            return true;
          })
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`
                flex items-center gap-3 rounded-lg py-3 transition-all duration-200
                ${isCollapsed ? 'px-4 md:justify-center md:px-2' : 'px-4'}
                ${isActive 
                  ? 'bg-emerald-600 shadow-lg' 
                  : 'hover:bg-emerald-700'}
              `}
              >
                <Icon size={20} />
                <span className={isCollapsed ? 'md:hidden' : ''}>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className={`pt-6 border-t border-emerald-700 ${isCollapsed ? 'md:hidden' : ''}`}>
        <p className="text-emerald-200 text-xs font-semibold uppercase mb-2">Farm Info</p>
        <p className="text-emerald-100 text-sm">CloudFarm</p>
        <p className="text-emerald-200 text-xs">Premium Member</p>
      </div>
    </aside>
  );
};

export default Sidebar;
