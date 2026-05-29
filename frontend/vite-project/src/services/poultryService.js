/**
 * Poultry Service
 * Handles all poultry-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const poultryService = {
  /**
   * Get all poultry for the farm
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/poultry`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch poultry' };
    }
  },

  /**
   * Get poultry by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/poultry/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch poultry' };
    }
  },

  /**
   * Create new poultry batch
   */
  create: async (poultryData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/poultry`, poultryData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create poultry' };
    }
  },

  /**
   * Update poultry
   */
  update: async (id, poultryData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/poultry/${id}`, poultryData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update poultry' };
    }
  },

  /**
   * Delete poultry
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/poultry/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete poultry' };
    }
  },

  /**
   * Get poultry statistics
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/poultry/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch poultry stats' };
    }
  }
};

export default poultryService;
