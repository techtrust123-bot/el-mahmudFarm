import { createContext, useState, useEffect } from "react";
import { authAPI } from '../services/api';

export const AuthContext = createContext()

export const AuthProvider = (props) =>{
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const [isLogin, setIsLogin] = useState(false)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  const getUserData = async()=>{
    if (authChecked) return; // Prevent multiple calls

    setLoading(true)
    try {
      const res = await authAPI.getUserData();
      if (res.data.success) {
        setUserData(res.data.userData)
        setIsLogin(true)
      } else {
        setUserData(null)
        setIsLogin(false)
      }
    } catch (error) {
      console.log(error)
      setUserData(null)
      setIsLogin(false)
    } finally {
      setLoading(false)
      setAuthChecked(true)
    }
  }

  const login = async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      if (res.data.success) {
        setUserData(res.data.userData);
        setIsLogin(true);
        setAuthChecked(true);
        // Reset redirecting flag on successful login
        if (typeof window !== 'undefined') {
          window.isRedirecting = false;
        }
        return { success: true };
      } else {
        return { success: false, message: res.data.message };
      }
    } catch (error) {
      console.log('Login error:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setUserData(null);
      setIsLogin(false);
      setAuthChecked(false);
      // Redirect will be handled by the interceptor
    }
  };

  useEffect(() => {
    // Don't check auth on login/register pages
    if (window.location.pathname === '/login' ||
        window.location.pathname === '/register' ||
        window.location.pathname === '/forgot-password') {
      setLoading(false);
      setAuthChecked(true);
      return;
    }
    getUserData()
  }, [])

  const value ={
    isLogin,setIsLogin,
    userData,setUserData,
    getUserData,
    login,
    logout,
    backendUrl,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  )
}