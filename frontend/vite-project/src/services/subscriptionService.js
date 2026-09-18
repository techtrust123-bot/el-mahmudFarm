import axiosInstance from '../utils/axiosInstance';
import { subscriptionPlans, formatCurrency } from '../data/subscriptionPlans';

const toDisplayTitle = (value) => {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getPlanAmount = (planKey, billingCycle) => {
  const plan = subscriptionPlans.find((item) => item.key === planKey) || subscriptionPlans[0];
  if (billingCycle === 'yearly') return plan.yearlyPrice;
  return plan.monthlyPrice;
};

const subscriptionService = {
  async getCurrentSubscription() {
    const response = await axiosInstance.get('/api/payment/status');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Unable to load subscription status');
    }

    const subscription = response.data.data || {};
    const planKey = subscription.subscriptionPlan && subscription.subscriptionPlan !== 'none'
      ? subscription.subscriptionPlan
      : 'free';

    return {
      id: 'current-subscription',
      planKey,
      planName: toDisplayTitle(planKey),
      amount: getPlanAmount(planKey, subscription.subscriptionBillingCycle || 'monthly'),
      billingCycle: subscription.subscriptionBillingCycle || 'monthly',
      status: subscription.subscriptionStatus || (subscription.isSubscribed ? 'active' : 'inactive'),
      startDate: subscription.subscriptionStart,
      endDate: subscription.subscriptionEnd,
      autoRenew: true,
      createdAt: subscription.subscriptionStart,
      updatedAt: subscription.subscriptionEnd,
    };
  },

  async getSubscriptionHistory() {
    const response = await axiosInstance.get('/api/payment/history');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Unable to load subscription history');
    }

    return (response.data.data || []).map((item) => ({
      id: item.id || item.reference || `${item.plan}-${item.createdAt}`,
      planName: item.planName || toDisplayTitle(item.plan),
      billingCycle: item.billingCycle || 'monthly',
      amount: Number(item.amount || 0),
      status: item.status === 'active' ? 'active' : (item.status || 'inactive'),
      startDate: item.startDate || item.createdAt,
      endDate: item.endDate || item.processedAt || item.createdAt,
    }));
  },

  async getAdminSubscriptions() {
    const response = await axiosInstance.get('/api/payment/admin/subscriptions');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Unable to load admin subscription records');
    }

    return (response.data.data || []).map((row) => ({
      id: row.id || row.paymentReference || 'unknown',
      customer: row.customer || 'Unknown farm',
      plan: row.plan || 'free',
      billingCycle: row.billingCycle || 'monthly',
      amount: Number(row.amount || 0),
      status: row.status || 'pending',
      paymentReference: row.paymentReference || row.id,
      startDate: row.startDate || row.createdAt,
      endDate: row.endDate || row.updatedAt || row.createdAt,
      autoRenew: Boolean(row.autoRenew),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async getAdminStats() {
    const response = await axiosInstance.get('/api/payment/admin/stats');

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || 'Unable to load admin subscription stats');
    }

    return response.data.data || {};
  },

  async getPlans() {
    return subscriptionPlans.map((plan) => ({
      ...plan,
      priceMonthly: plan.monthlyPrice,
      priceYearly: plan.yearlyPrice,
      displayMonthly: formatCurrency(plan.monthlyPrice),
      displayYearly: formatCurrency(plan.yearlyPrice),
    }));
  },
};

export default subscriptionService;
