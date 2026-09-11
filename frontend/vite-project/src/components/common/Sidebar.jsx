import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiMenu, FiX, FiHome, FiPackage, FiUsers, FiSettings, FiDatabase } from 'react-icons/fi';
import { GiCow, GiChicken, GiPayMoney } from 'react-icons/gi';
import { TbCurrencyNaira } from 'react-icons/tb';

/**
 * Sidebar Navigation Component
 */
const Sidebar = ({ isOpen }) => {
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

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome, permission: 'dashboard' },
    { path: '/livestock', label: 'Livestock', icon: GiCow, permission: 'livestock' },
    { path: '/poultry', label: 'Poultry', icon: GiChicken, permission: 'poultry' },
    { path: '/egg-inventory', label: 'Egg Inventory', icon: FiDatabase, permission: 'poultry' },
    { path: '/feed', label: 'Feed', icon: FiPackage, permission: 'feed' },
    { path: '/sales', label: 'Sales', icon: TbCurrencyNaira, permission: 'sales' },
    { path: '/expenses', label: 'Expenses', icon: GiPayMoney, permission: 'expenses' },
    { path: '/staff', label: 'Staff', icon: FiUsers, managerOnly: true },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-emerald-800 to-emerald-900
        text-white p-6 transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        🌾 CloudFarm
      </h1>

      <nav className="space-y-4 flex-1">
        {navItems
          .filter((item) => {
            if (item.managerOnly && !isManager) {
              return false;
            }
            if (item.permission && !isManager) {
              return normalizedPermissions.includes(item.permission.toLowerCase());
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
                className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-emerald-600 shadow-lg' 
                  : 'hover:bg-emerald-700'}
              `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="pt-6 border-t border-emerald-700">
        <p className="text-emerald-200 text-xs font-semibold uppercase mb-2">Farm Info</p>
        <p className="text-emerald-100 text-sm">Green Valley Farm</p>
        <p className="text-emerald-200 text-xs">Premium Member</p>
      </div>
    </aside>
  );
};

export default Sidebar;
