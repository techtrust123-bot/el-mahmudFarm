/**
 * User Service
 * Handles user profile and account-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const userService = {
  /**
   * Get user profile
   */
  getProfile: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch user profile' };
    }
  },

  /**
   * Get all users (manager/admin only)
   */
  getAllUsers: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/all`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch users' };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/user/profile`, profileData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update profile' };
    }
  },

  /**
   * Change password
   */
  changePassword: async (passwordData) => {
    try {const response = await axios.post(`${API_BASE_URL}/user/change-password`, passwordData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to change password' };
    }
  },

  /**
   * Update farm settings
   */
  updateFarmSettings: async (settingsData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/user/farm-settings`, settingsData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update farm settings' };
    }
  },

  /**
   * Get farm settings
   */
  getFarmSettings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/farm-settings`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch farm settings' };
    }
  }
};

export default userService;
