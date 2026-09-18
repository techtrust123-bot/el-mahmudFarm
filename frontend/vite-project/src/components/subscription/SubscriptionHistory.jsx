import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../data/subscriptionPlans';
import { formatDisplayDate } from '../../utils/subscriptionUtils';

const statusVariants = {
  active: 'success',
  expired: 'error',
  cancelled: 'default',
  pending: 'warning',
  failed: 'error',
};

const SubscriptionHistory = ({ items = [], loading = false, error = null }) => {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-300">No subscription history found.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-3 font-semibold text-gray-900 dark:text-white">Plan</th>
              <th className="px-3 py-3 font-semibold text-gray-900 dark:text-white">Cycle</th>
              <th className="px-3 py-3 font-semibold text-gray-900 dark:text-white">Amount</th>
              <th className="px-3 py-3 font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="px-3 py-3 font-semibold text-gray-900 dark:text-white">Dates</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-b-0 dark:border-gray-700">
                <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{item.planName}</td>
                <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{item.billingCycle}</td>
                <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount || 0)}</td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariants[item.status] || 'default'}>{item.status}</Badge>
                </td>
                <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                  {formatDisplayDate(item.startDate)} - {formatDisplayDate(item.endDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default SubscriptionHistory;
