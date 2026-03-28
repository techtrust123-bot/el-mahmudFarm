import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * useAuth hook - Easy access to auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return {
    isAuthenticated: context.isLogin,
    user: context.userData,
    login: () => {}, // placeholder
    logout: () => {}, // placeholder
    ...context
  };
};
