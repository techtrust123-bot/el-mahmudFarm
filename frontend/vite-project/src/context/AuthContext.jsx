/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import axiosInstance from '../utils/axiosInstance';

export const AuthContext = createContext()

export const AuthProvider = (props) =>{
  const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
  const [isLogin, setIsLogin] = useState(false)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [sessionWarning, setSessionWarning] = useState(false)
  const syncSubscription = async (currentUser = null) => {
    try {
      const subscriptionResponse = await axiosInstance.get('/api/payment/status');
      const subscription = subscriptionResponse.data?.data;
      if (subscriptionResponse.data?.success && subscription) {
        setUserData((previousUser) => ({
          ...(currentUser || previousUser || {}),
          isSubscribed: subscription.isSubscribed,
          subscriptionStatus: subscription.subscriptionStatus,
          subscriptionType: subscription.subscriptionType,
          subscriptionPlan: subscription.subscriptionPlan,
          billingCycle: subscription.subscriptionBillingCycle || subscription.billingCycle,
          subscriptionStart: subscription.subscriptionStart,
          subscriptionEnd: subscription.subscriptionEnd,
        }));
      }
      return subscription;
    } catch (subscriptionError) {
      console.warn('Unable to reconcile subscription state:', subscriptionError?.message);
      return null;
    }
  };

  const getUserData = async (force = false) => {
    if (!force && authChecked) return; // Prevent repeated calls unless explicitly forced

    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/user/userData');
      if (res.data.success) {
        let currentUser = res.data.userData;
          const subscription = await syncSubscription(currentUser);
          if (subscription) currentUser = { ...currentUser, subscriptionPlan: subscription.subscriptionPlan, subscriptionStatus: subscription.subscriptionStatus, isSubscribed: subscription.isSubscribed, billingCycle: subscription.subscriptionBillingCycle || subscription.billingCycle };
        setUserData(currentUser);
        setIsLogin(true);
        scheduleTokenWarning();
      } else {
        setUserData(null);
        setIsLogin(false);
      }
    } catch (error) {
      console.log(error);
      setUserData(null);
      setIsLogin(false);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };



  const login = async (email, password) => {
    try {
      const res = await axiosInstance.post('/api/auth/login', { email, password });
      if (res.data.success) {
        const user = res.data.user || res.data.userData || null;
        if (user) {
          setUserData(user);
          await syncSubscription(user);
        }
        setIsLogin(true);
        setAuthChecked(true);
        scheduleTokenWarning();
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
      await axiosInstance.post('/api/auth/logout');
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setUserData(null);
      setIsLogin(false);
      setAuthChecked(false);
      setSessionWarning(false);
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
  };

  const refresh = async () => {
    try {
      const res = await axiosInstance.post('/api/auth/refresh');
      if (res.data.success) {
        setSessionWarning(false);
        scheduleTokenWarning(); // Reschedule warnings with new token
        return { success: true };
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      console.log('Refresh error:', error);
      throw error;
    }
  };

  const scheduleTokenWarning = () => {
    // Get token from cookies (this is a simplified approach - in production you'd decode the JWT)
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const warningTime = exp - (2 * 60 * 1000); // 2 minutes before expiry
      const expiryTime = exp;

      if (warningTime > now) {
        const warningTimeout = setTimeout(() => {
          setSessionWarning(true);
        }, warningTime - now);

        const expiryTimeout = setTimeout(() => {
          logout();
        }, expiryTime - now);

        // Store timeouts for cleanup
        window.tokenTimeouts = { warningTimeout, expiryTimeout };
      }
    } catch (error) {
      console.log('Error scheduling token warning:', error);
    }
  };

//   useEffect(() => {
//   const publicPages = ['/', '/login', '/register', '/forgot-password', '/about', '/contact'];
//   const isPublicPage = publicPages.includes(window.location.pathname);

//   // Idan mutum yana kan Public Page (kamar Landing Page '/'), kada ka kira getUserData()
//   if (isPublicPage) {
//     setLoading(false);
//     setAuthChecked(true);
//     return;
//   }

//   // Shafukan da ke bukatar login ne kawai za su kira getUserData()
//   getUserData();

//   return () => {
//     if (window.tokenTimeouts) {
//       clearTimeout(window.tokenTimeouts.warningTimeout);
//       clearTimeout(window.tokenTimeouts.expiryTimeout);
//     }
//   };
// }, []);


  useEffect(() => {
    // Don't check auth on login/register pages
    if (window.location.pathname === '/login' ||
        window.location.pathname === '/register' ||
        window.location.pathname === '/' ||
        window.location.pathname ==='/about'||
        window.location.pathname ==='/contact'||
        window.location.pathname ==='/support/contact'||
        window.location.pathname ==='/terms'||
        window.location.pathname ==='/privacy-policy'||
        window.location.pathname ==='/forbidden'||
        window.location.pathname ==='/reset-password'||
        window.location.pathname === '/forgot-password') {
      setLoading(false);
      setAuthChecked(true);
      return;
    }
    getUserData()

    return () => {
      // Cleanup timeouts on unmount
      if (window.tokenTimeouts) {
        clearTimeout(window.tokenTimeouts.warningTimeout);
        clearTimeout(window.tokenTimeouts.expiryTimeout);
      }
    };
  }, [])

  const value ={
    isLogin,setIsLogin,
    userData,setUserData,
    getUserData,
    login,
    logout,
    refresh,
    backendUrl,
    loading,
    axiosInstance,
    sessionWarning,
    syncSubscription,
    setSessionWarning,
  }

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  )
}