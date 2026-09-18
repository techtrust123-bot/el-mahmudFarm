import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { getExpiryMessage, getExpiryStatus } from '../../utils/subscriptionUtils';

const ExpiryWarning = ({ endDate, status = null }) => {
  const expiryStatus = status || getExpiryStatus(endDate);
  const message = getExpiryMessage(endDate);

  const toneClasses = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200',
    error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200',
    default: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <Card className={`border ${toneClasses[expiryStatus.tone || 'default']}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{message}</p>
        </div>

        <Badge variant={expiryStatus.tone === 'success' ? 'success' : expiryStatus.tone === 'warning' ? 'warning' : expiryStatus.tone === 'error' ? 'error' : 'default'}>
          {expiryStatus.label}
        </Badge>
      </div>
    </Card>
  );
};

export default ExpiryWarning;
