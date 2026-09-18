import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../data/subscriptionPlans';
import { calculateDaysRemaining, formatDisplayDate, getExpiryStatus } from '../../utils/subscriptionUtils';

const CurrentSubscription = ({ subscription, loading = false, error = null }) => {
  if (loading) {
    return (
      <Card className="border border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-700 dark:text-red-200">{error}</p>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/70">
        <p className="text-base font-medium text-gray-700 dark:text-gray-200">You do not have an active subscription.</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a plan below to get started.</p>
      </Card>
    );
  }

  const daysRemaining = calculateDaysRemaining(subscription.endDate);
  const expiryStatus = getExpiryStatus(subscription.endDate);

  return (
    <Card className="border border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Current subscription</h3>
            <Badge variant={expiryStatus.tone === 'error' ? 'error' : expiryStatus.tone === 'warning' ? 'warning' : 'success'}>
              {subscription.status || expiryStatus.label}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are currently on the{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{subscription.planName || 'free'}</span>{' '}
            plan ({subscription.billingCycle || 'monthly'} billing).
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span>Amount: {formatCurrency(subscription.amount || 0)}</span>
            <span>Start: {formatDisplayDate(subscription.startDate)}</span>
            <span>End: {formatDisplayDate(subscription.endDate)}</span>
          </div>
        </div>

        <div className="min-w-[190px] rounded-xl border border-emerald-200 bg-white p-4 text-sm text-gray-700 dark:border-emerald-700 dark:bg-gray-900 dark:text-gray-200">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Days remaining</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-300">{daysRemaining ?? '—'}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{expiryStatus.label}</p>
        </div>
      </div>
    </Card>
  );
};

export default CurrentSubscription;
