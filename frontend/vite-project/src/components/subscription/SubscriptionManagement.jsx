import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import MainLayout from '../layout/MainLayout';
import Card from '../ui/Card';
import Button from '../ui/Button';
import CurrentSubscription from './CurrentSubscription';
import ExpiryWarning from './ExpiryWarning';
import SubscriptionPlans from './SubscriptionPlans';
import SubscriptionHistory from './SubscriptionHistory';
import subscriptionService from '../../services/subscriptionService';
import paymentService from '../../services/paymentService';
import { getExpiryMessage } from '../../utils/subscriptionUtils';
import { AuthContext } from '../../context/AuthContext';

const SubscriptionManagement = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const { setUserData } = useContext(AuthContext);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [subscription, history] = await Promise.all([
          subscriptionService.getCurrentSubscription(),
          subscriptionService.getSubscriptionHistory(),
        ]);
        setCurrentSubscription(subscription);
        setSubscriptionHistory(history);
        setUserData((currentUser) => currentUser ? {
          ...currentUser,
          subscriptionPlan: subscription.subscriptionPlan || subscription.planKey,
          billingCycle: subscription.billingCycle,
          subscriptionStatus: subscription.status,
          isSubscribed: subscription.status === 'active' || subscription.status === 'trial',
          subscriptionStart: subscription.startDate,
          subscriptionEnd: subscription.endDate,
        } : currentUser);
      } catch (err) {
        console.error('Unable to load subscription data:', err);
        setError(err.response?.data?.message || err.message || 'Unable to load subscription data right now.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectPlan = async (plan, selectedBillingCycle) => {
    const loadingKey = `${plan.key}-${selectedBillingCycle}`;
    setLoadingPlan(loadingKey);

    try {
      const response = await paymentService.initializePayment({
        plan: plan.key,
        billingCycle: selectedBillingCycle,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to initialize payment');
      }

      if (!response.data?.authorizationUrl) {
        throw new Error('Payment authorization URL is missing.');
      }

      setBillingCycle(selectedBillingCycle);
      window.location.href = response.data.authorizationUrl;
    } catch (err) {
      console.error('Payment initialization error:', err);
      const message = err.response?.data?.message || err.message || 'Unable to initialize payment.';
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleUpgradePlan = async (plan) => {
    const loadingKey = `${plan.key}-${currentSubscription?.billingCycle || billingCycle}`;
    setLoadingPlan(loadingKey);
    try {
      const response = await paymentService.initializeUpgrade(plan.key);
      if (!response?.success) throw new Error(response?.message || 'Failed to initialize upgrade');
      if (!response.data?.authorizationUrl) throw new Error('Payment authorization URL is missing.');
      window.location.href = response.data.authorizationUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Unable to initialize upgrade.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Subscription
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Subscription management</h1>
          </div>
          <Button variant="outline">Manage account</Button>
        </div>

        {currentSubscription && <ExpiryWarning endDate={currentSubscription.endDate} />}

        {currentSubscription ? (
          <CurrentSubscription subscription={currentSubscription} loading={loading} error={error} />
        ) : (
          <CurrentSubscription subscription={null} loading={loading} error={error} />
        )}

        <SubscriptionPlans
          billingCycle={billingCycle}
            selectedPlanKey={currentSubscription?.planKey || null}
          onBillingCycleChange={setBillingCycle}
          onSelectPlan={handleSelectPlan}
          onUpgradePlan={handleUpgradePlan}
          loadingPlan={loadingPlan}
        />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Subscription history</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{subscriptionHistory.length} records</span>
            </div>
            <SubscriptionHistory items={subscriptionHistory} loading={loading} error={error} />
          </Card> */}

          {/* <Card>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Billing guidance</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li>• Your current UI state is frontend-only and not authoritative.</li>
              <li>• Real payment and access control will be enforced in the backend.</li>
              <li>• {currentSubscription ? getExpiryMessage(currentSubscription.endDate) : 'No current subscription data available.'}</li>
            </ul>
          </Card> */}
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionManagement;
