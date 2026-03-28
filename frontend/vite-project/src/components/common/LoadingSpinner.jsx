import React from 'react';

/**
 * Loading Spinner Component
 */
const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="animate-spin">
        <div className="h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
      </div>
      <p className="text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
