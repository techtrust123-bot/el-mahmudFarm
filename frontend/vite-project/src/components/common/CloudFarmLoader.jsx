import React from 'react';
import cloudFarmLogo from '../../assets/CloudFarm_logo.png';

const CloudFarmLoader = ({ text = 'Loading CloudFarm...' }) => (
  <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
    <div className="flex flex-col items-center gap-5 px-6 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <img src={cloudFarmLogo} alt="CloudFarm" className="h-16 w-16 rounded-2xl object-contain shadow-sm" />
      </div>
      <div>
        <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">CloudFarm</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
      </div>
    </div>
  </div>
);

export default CloudFarmLoader;
