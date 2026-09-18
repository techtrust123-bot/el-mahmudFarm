import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiUser, FiLogOut, FiMoon, FiSun, FiCpu } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Alert from '../ui/Alert';

/**
 * Top Navigation Bar Component
 */
const Navbar = ({ toggleSidebar, sidebarOpen, onOpenCalculator }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const {backendUrl, userData,setIsLogin, axiosInstance} = useContext(AuthContext) 
  const [alert, setAlert] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/api/notifications?limit=8');
      if (response.data.success) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Unable to load notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [axiosInstance]);

  const markAsRead = async (id) => {
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`);
      setNotifications((items) => items.map((item) => item._id === id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error('Unable to mark notification read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.patch('/api/notifications/read-all');
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Unable to mark notifications read', error);
    }
  };
  
  const handleLogout = async() => {

    try {
      const response = await axios.post(backendUrl+'/api/auth/logout')
      response.data.success ? navigate('/') : setAlert({ type: 'success',message: response.data.message || 'Logout successfull' })
      setIsLogin(false)
      logout()
    } catch (error) {
      console.error('Registration error:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Registration failed' });
      return;
    }
  };

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side - Menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleSidebar}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Right side - Icons and Profile */}
        <div className="ml-auto flex items-center gap-6">
          {/* Calculator */}
          <button
            type="button"
            onClick={onOpenCalculator}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Calculator"
            aria-label="Open Calculator"
          >
            <FiCpu size={20} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Toggle theme"
          >
            {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Notifications */}
          <div className="relative">
          <button onClick={() => setNotificationsOpen((open) => !open)} aria-label="Open notifications" className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <FiBell size={20} />
            {unreadCount > 0 && <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {notificationsOpen && <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-600"><h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3><button onClick={markAllAsRead} disabled={!unreadCount} className="text-xs font-semibold text-emerald-700 disabled:opacity-40 dark:text-emerald-300">Mark all read</button></div>
            <div className="max-h-96 overflow-y-auto">{notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet.</p> : notifications.map((item) => <button key={item._id} onClick={() => !item.isRead && markAsRead(item._id)} className={`block w-full border-b border-gray-100 px-4 py-3 text-left dark:border-gray-600 ${item.isRead ? 'bg-white dark:bg-gray-700' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}><div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-gray-300' : 'bg-emerald-600'}`} /><span><span className="block text-sm font-bold text-gray-900 dark:text-white">{item.title}</span><span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-gray-300">{item.message}</span><span className="mt-1 block text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</span></span></div></button>)}</div>
          </div>}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block text-sm font-medium">{userData?.name || 'User'}</span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <FiUser size={16} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <FiLogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
