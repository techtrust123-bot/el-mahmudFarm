import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiUser, FiLogOut, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Alert from '../ui/Alert';

/**
 * Top Navigation Bar Component
 */
const Navbar = ({ toggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const {backendUrl, userData,setIsLogin} = useContext(AuthContext) 
  const [alert, setAlert] = useState(null);
  
  const handleLogout = async() => {

    try {
      const response = await axios.post(backendUrl+'/api/auth/logout')
      response.data.success ? navigate('/login') : setAlert({ type: 'success',message: response.data.message || 'Logout successfull' })
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
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Toggle theme"
          >
            {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          {/* Notifications */}
          <button className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            <FiBell size={20} />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {userData?.name[0].toUpperCase() || 'User'}
              </div>
              <span className="hidden sm:block text-sm font-medium">{userData?.name || 'User'}</span>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50">
                <button className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2">
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
