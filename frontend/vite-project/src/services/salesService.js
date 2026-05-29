/**
 * Sales Service
 * Handles all sales-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const salesService = {
  /**
   * Get all sales records
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sell`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch sales' };
    }
  },

  /**
   * Get sale by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sell/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch sale' };
    }
  },

  /**
   * Create new sale record
   */
  create: async (saleData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/sell`, saleData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create sale' };
    }
  },

  /**
   * Update sale record
   */
  update: async (id, saleData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/sell/${id}`, saleData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update sale' };
    }
  },

  /**
   * Delete sale record
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/sell/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete sale' };
    }
  },

  /**
   * Get sales statistics and revenue
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sell/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch sales stats' };
    }
  },

  /**
   * Get revenue report
   */
  getRevenue: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sell/revenue`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch revenue' };
    }
  }
};

export default salesService;