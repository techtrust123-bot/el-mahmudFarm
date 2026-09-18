/**
 * Payment Service
 * Handles all payment-related API calls
 */

import axiosInstance from '../utils/axiosInstance';

const paymentService = {
  /**
   * Initialize payment
   */
  initializePayment: async ({ plan, billingCycle }) => {
    try {
      const response = await axiosInstance.post('/api/payment/initialize', {
        plan,
        billingCycle,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to initialize payment' };
    }
  },

  initializeUpgrade: async (plan) => {
    try {
      const response = await axiosInstance.post('/api/payment/upgrade', { plan });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to initialize upgrade' };
    }
  },

  /**
   * Verify payment
   */
  verifyPayment: async (reference) => {
    try {
      const response = await axiosInstance.get(`/api/payment/verify/${encodeURIComponent(reference)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to verify payment' };
    }
  },

  /**
   * Get payment status
   */
  getStatus: async () => {
    try {
      const response = await axiosInstance.get('/api/payment/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch subscription status' };
    }
  },

  /**
   * Get payment history
   */
  getHistory: async () => {
    try {
      const response = await axiosInstance.get('/api/payment/history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch payment history' };
    }
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async () => {
    try {
      const response = await axiosInstance.post('/api/payment/cancel-subscription');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to cancel subscription' };
    }
  }
};

export default paymentService;
