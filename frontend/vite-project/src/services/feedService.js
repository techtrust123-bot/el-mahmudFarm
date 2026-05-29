/**
 * Feed Service
 * Handles all feed-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const feedService = {
  /**
   * Get all feed inventory
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/feed`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch feed' };
    }
  },

  /**
   * Get feed by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/feed/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch feed' };
    }
  },

  /**
   * Create new feed batch
   */
  create: async (feedData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/feed`, feedData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create feed' };
    }
  },

  /**
   * Update feed
   */
  update: async (id, feedData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/feed/${id}`, feedData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update feed' };
    }
  },

  /**
   * Delete feed
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/feed/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete feed' };
    }
  },

  /**
   * Get feed consumption analysis
   */
  getConsumption: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/feed/consumption`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch feed consumption' };
    }
  },

  /**
   * Get feed statistics
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/feed/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch feed stats' };
    }
  }
};

export default feedService;