/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const authService = {
  /**
   * Register new user
   */
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  },

  /**
   * Request password reset OTP
   */
  sendResetOTP: async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password-otp`, { email }, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to send reset OTP' };
    }
  },

  /**
   * Reset password with OTP
   */
  resetPassword: async (resetData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, resetData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Password reset failed' };
    }
  },

  /**
   * Verify OTP for account verification
   */
  verifyOTP: async (otp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verified`, { otp }, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'OTP verification failed' };
    }
  },

  /**
   * Resend verification OTP
   */
  resendOTP: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/resend-otp`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to resend OTP' };
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Token refresh failed' };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Logout failed' };
    }
  }
};

export default authService;
