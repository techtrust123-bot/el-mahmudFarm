/**
 * Expense Service
 * Handles all expense-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const expenseService = {
  /**
   * Get all expenses
   */
  getAll: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expense`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch expenses' };
    }
  },

  /**
   * Get expense by ID
   */
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expense/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch expense' };
    }
  },

  /**
   * Create new expense
   */
  create: async (expenseData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/expense`, expenseData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create expense' };
    }
  },

  /**
   * Update expense
   */
  update: async (id, expenseData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/expense/${id}`, expenseData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update expense' };
    }
  },

  /**
   * Delete expense
   */
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/expense/${id}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete expense' };
    }
  },

  /**
   * Get expense statistics
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expense/stats`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch expense stats' };
    }
  },

  /**
   * Get expenses by category
   */
  getByCategory: async (category) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/expense/category/${category}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch expenses by category' };
    }
  }
};

export default expenseService;