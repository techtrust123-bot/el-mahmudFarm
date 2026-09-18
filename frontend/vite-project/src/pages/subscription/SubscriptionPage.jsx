import React, { useEffect, useState } from 'react';
import subscriptionService from '../../services/subscriptionService';
import SubscriptionManagement from '../../components/subscription/SubscriptionManagement';

const SubscriptionPage = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      await subscriptionService.getCurrentSubscription();
      setIsReady(true);
    };

    load();
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse rounded-xl bg-white px-8 py-6 text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
          Loading subscription workspace...
        </div>
      </div>
    );
  }

  return <SubscriptionManagement />;
};

export default SubscriptionPage;
