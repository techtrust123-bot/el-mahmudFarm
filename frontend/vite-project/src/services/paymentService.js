/**
 * Payment Service
 * Handles all payment-related API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const paymentService = {
  /**
   * Initialize payment
   */
  initializePayment: async (paymentData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/payment/initialize`, paymentData, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to initialize payment' };
    }
  },

  /**
   * Verify payment
   */
  verifyPayment: async (reference) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/payment/verify`, { reference }, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to verify payment' };
    }
  },

  /**
   * Get payment history
   */
  getHistory: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/payment/history`, {
        params: filters,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch payment history' };
    }
  },

  /**
   * Get subscription status
   */
  getSubscriptionStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/payment/subscription-status`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch subscription status' };
    }
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/payment/cancel-subscription`, {}, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to cancel subscription' };
    }
  }
};

export default paymentService;
