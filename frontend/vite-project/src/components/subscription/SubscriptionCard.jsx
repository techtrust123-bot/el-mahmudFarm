import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { FiCheck } from 'react-icons/fi';
import { formatCurrency, getBillingPeriodLabel, getPlanPrice, getYearlySavings } from '../../data/subscriptionPlans';

const SubscriptionCard = ({
  plan,
  billingCycle,
  currentPlanKey,
  onSelect,
  onAction,
  onUpgrade,
  isLoading = false,
}) => {
  const price = getPlanPrice(plan, billingCycle);
  const isCurrentPlan = currentPlanKey === plan.key;
  const planOrder = { starter: 1, basic: 2, premium: 3 };
  const hasPaidCurrentPlan = Boolean(currentPlanKey && currentPlanKey !== 'free');
  const isHigherPlan = Boolean(
    hasPaidCurrentPlan &&
    planOrder[plan.key] > planOrder[currentPlanKey]
  );
  const isRecommended = Boolean(plan.recommended);
  const yearlySavings = getYearlySavings(plan);

  const getButtonLabel = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isHigherPlan) return `Upgrade to ${plan.name}`;
    if (hasPaidCurrentPlan && currentPlanKey !== plan.key) return 'Unavailable';
    return 'Subscribe';
  };

  return (
    <Card
      className={[
        'relative h-full border-2 transition-all duration-200',
        isRecommended
          ? 'border-emerald-400 bg-emerald-50 shadow-lg dark:border-emerald-500 dark:bg-emerald-900/20'
          : 'border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-800',
        isCurrentPlan ? 'ring-2 ring-emerald-500 ring-offset-1' : '',
      ].join(' ')}
      padding="p-6"
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="success">Recommended</Badge>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
            {isCurrentPlan && <Badge variant="info">Active</Badge>}
          </div>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>

          <div className="mt-5 flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrency(price)}</span>
            <span className="pb-1 text-sm text-gray-500 dark:text-gray-400">{getBillingPeriodLabel(billingCycle)}</span>
          </div>

          {billingCycle === 'yearly' && (
            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Save {formatCurrency(yearlySavings)} with annual billing.
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={`${plan.key}-${index}`} className="flex items-start gap-3">
              <FiCheck className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" size={18} />
              <span className="text-sm text-gray-700 dark:text-gray-200">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={isCurrentPlan ? 'secondary' : isRecommended ? 'primary' : 'outline'}
          fullWidth
          disabled={isCurrentPlan || (hasPaidCurrentPlan && !isHigherPlan) || isLoading}
          onClick={() => {
            if (isHigherPlan && onUpgrade) onUpgrade(plan);
            else if (!hasPaidCurrentPlan && !isCurrentPlan && onSelect) onSelect(plan, billingCycle);
            if (onAction) onAction({ plan, billingCycle, action: getButtonLabel() });
          }}
        >
          {isLoading ? 'Processing...' : getButtonLabel()}
        </Button>
      </div>
    </Card>
  );
};

export default SubscriptionCard;
