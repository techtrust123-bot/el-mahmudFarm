/**
 * Staff Service
 * Handles all staff-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const staffService = {
  /**
   * Get all staff members
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch staff' };
    }
  },

  /**
   * Get staff member by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch staff member' };
    }
  },

  /**
   * Create new staff member
   */
  create: async (staffData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/staff`, staffData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create staff member' };
    }
  },

  /**
   * Update staff member
   */
  update: async (id, staffData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/staff/${id}`, staffData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update staff member' };
    }
  },

  /**
   * Delete staff member
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/staff/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete staff member' };
    }
  },

  /**
   * Get staff statistics
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch staff stats' };
    }
  },

  /**
   * Update staff permissions
   */
  updatePermissions: async (id, permissions) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/staff/${id}/permissions`, { permissions }, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update permissions' };
    }
  }
};

export default staffService;