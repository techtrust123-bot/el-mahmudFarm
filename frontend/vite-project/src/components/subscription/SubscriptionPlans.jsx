import React, { useMemo, useState } from 'react';
import Card from '../ui/Card';
import BillingToggle from './BillingToggle';
import SubscriptionCard from './SubscriptionCard';
import { subscriptionPlans } from '../../data/subscriptionPlans';

const SubscriptionPlans = ({
  billingCycle = 'monthly',
  selectedPlanKey = null,
  onBillingCycleChange,
  onSelectPlan,
  onUpgradePlan,
  loadingPlan = null,
}) => {
  const [localBillingCycle, setLocalBillingCycle] = useState(billingCycle);

  const effectiveCycle = onBillingCycleChange ? billingCycle : localBillingCycle;

  const handleCycleChange = (nextCycle) => {
    if (onBillingCycleChange) {
      onBillingCycleChange(nextCycle);
    } else {
      setLocalBillingCycle(nextCycle);
    }
  };

  const planList = useMemo(() => subscriptionPlans, []);

  return (
    <Card className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            Choose your plan
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Subscription plans</h2>
        </div>

        <BillingToggle value={effectiveCycle} onChange={handleCycleChange} disabled={Boolean(selectedPlanKey && selectedPlanKey !== 'free')} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {planList.map((plan) => (
          <SubscriptionCard
            key={plan.key}
            plan={plan}
            billingCycle={effectiveCycle}
            currentPlanKey={selectedPlanKey}
            onSelect={onSelectPlan}
            onUpgrade={onUpgradePlan}
            isLoading={loadingPlan === `${plan.key}-${effectiveCycle}`}
          />
        ))}
      </div>
    </Card>
  );
};

export default SubscriptionPlans;
