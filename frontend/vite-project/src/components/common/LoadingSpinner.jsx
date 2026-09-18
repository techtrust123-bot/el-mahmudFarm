import React from 'react';
import cloudFarmLogo from '../../assets/CloudFarm_logo.png';

/**
 * Loading Spinner Component
 */
const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <img src={cloudFarmLogo} alt="CloudFarm" className="h-10 w-10 rounded-xl object-contain" />
      </div>
      <p className="text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
