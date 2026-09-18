import React from 'react';
import { billingCycleOptions } from '../../data/subscriptionPlans';

const BillingToggle = ({ value, onChange, disabled = false }) => {
  return (
    <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 p-1 dark:border-emerald-700 dark:bg-emerald-900/30">
      {billingCycleOptions.map((option) => {
        const isActive = value === option.key;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            disabled={disabled}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-800/60',
              disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default BillingToggle;
