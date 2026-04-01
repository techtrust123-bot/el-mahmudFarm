import React from 'react';

/**
 * Stat Card component - for dashboard summary
 */
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change = null, 
  trend = null,
  className = '' 
}) => {
  return (
    <div className={`
      w-full min-w-0
      bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700
      shadow-md hover:shadow-lg transition-all duration-200
      ${className}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {change && (
            <p className={`text-xs mt-2 font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && '↑'} {trend === 'down' && '↓'} {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="text-emerald-600 dark:text-emerald-400 text-4xl">
            <Icon />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
