/**
 * Livestock Service
 * Handles all livestock-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const livestockService = {
  /**
   * Get all livestock for the farm
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/livestock`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch livestock' };
    }
  },

  /**
   * Get livestock by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/livestock/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch livestock' };
    }
  },

  /**
   * Create new livestock
   */
  create: async (livestockData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/livestock`, livestockData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create livestock' };
    }
  },

  /**
   * Update livestock
   */
  update: async (id, livestockData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/livestock/${id}`, livestockData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update livestock' };
    }
  },

  /**
   * Delete livestock
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/livestock/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete livestock' };
    }
  },

  /**
   * Get livestock statistics
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/livestock/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch livestock stats' };
    }
  }
};

export default livestockService;
