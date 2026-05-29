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
   * Get payment history\n   */\n  getHistory: async (filters = {}) => {\n    try {\n      const response = await axios.get(`${API_BASE_URL}/payment/history`, {\n        params: filters,\n        withCredentials: true\n      });\n      return response.data;\n    } catch (error) {\n      throw error.response?.data || { success: false, message: 'Failed to fetch payment history' };\n    }\n  },\n\n  /**\n   * Get subscription status\n   */\n  getSubscriptionStatus: async () => {\n    try {\n      const response = await axios.get(`${API_BASE_URL}/payment/subscription-status`, {\n        withCredentials: true\n      });\n      return response.data;\n    } catch (error) {\n      throw error.response?.data || { success: false, message: 'Failed to fetch subscription status' };\n    }\n  },\n\n  /**\n   * Cancel subscription\n   */\n  cancelSubscription: async () => {\n    try {\n      const response = await axios.post(`${API_BASE_URL}/payment/cancel-subscription`, {}, {\n        withCredentials: true\n      });\n      return response.data;\n    } catch (error) {\n      throw error.response?.data || { success: false, message: 'Failed to cancel subscription' };\n    }\n  }\n};\n\nexport default paymentService;
