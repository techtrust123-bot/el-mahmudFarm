import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronDown, FiLogOut } from 'react-icons/fi';
import {
  FiHome,
  FiDollarSign,
  FiShoppingCart,
  FiPackage,
  FiPhoneCall,
  FiCreditCard,
  FiSettings,
  FiUsers,
  FiTrendingUp,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

/**
 * Sidebar Navigation Component
 */
const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const isManager =
    user &&
    (user.userType?.toLowerCase() === 'manager' ||
      user.role?.toLowerCase() === 'manager');

  // Navigation items based on role
  const navItems =
    user?.role?.toLowerCase() === 'admin'
      ? [
          { path: '/admin', label: 'Admin Dashboard', icon: FiHome },
          { path: '/admin/users', label: 'Users', icon: FiUsers },
          { path: '/admin/marketplace', label: 'Marketplace', icon: FiShoppingCart },
          { path: '/admin/revenue', label: 'Revenue', icon: FiTrendingUp },
          { path: '/settings', label: 'Settings', icon: FiSettings },
        ]
      : [
          { path: '/dashboard', label: 'Dashboard', icon: FiHome },
          { path: '/livestock', label: 'Livestock', icon: FiTrendingUp },
          { path: '/poultry', label: 'Poultry', icon: FiShoppingCart },
          { path: '/feed', label: 'Feeds', icon: FiPackage },
          { path: '/sales', label: 'Sales', icon: FiTrendingUp },
          { path: '/expenses', label: 'Expenses', icon: FiDollarSign },
          { path: '/staff', label: 'Staff', icon: FiUsers },
          { path: '/settings', label: 'Settings', icon: FiSettings },
        ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-green-700 to-green-900
          text-white transition-transform duration-300 z-40 overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-3xl">🌾</span>
            <div>
              <h1 className="text-2xl font-bold">AgroSaaS</h1>
              <p className="text-xs text-green-200">Smart Farming</p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="mb-8 pb-6 border-b border-green-600">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-green-600 rounded-lg transition"
            >
              <div className="text-left">
                <p className="font-semibold text-sm">{user?.name}</p>
                <p className="text-xs text-green-200 capitalize">{user?.role}</p>
              </div>
              <FiChevronDown className={`transition ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="mt-2 space-y-2 text-sm">
                <button className="w-full text-left px-3 py-2 hover:bg-green-600 rounded transition">
                  👤 Profile
                </button>
                <button
                  onClick={toggleTheme}
                  className="w-full text-left px-3 py-2 hover:bg-green-600 rounded transition"
                >
                  {isDark ? '☀️' : '🌙'} Theme
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 hover:bg-red-600 rounded transition flex items-center gap-2"
                >
                  <FiLogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition
                    ${isActive(item.path)
                      ? 'bg-green-600 font-semibold shadow-lg'
                      : 'hover:bg-green-600/50'}
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="absolute bottom-6 left-6 right-6 p-4 bg-green-600/50 rounded-lg text-sm">
            <p className="font-semibold mb-1">Farm Info</p>
            <p className="text-green-100">{user?.farm?.name || 'No farm'}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
