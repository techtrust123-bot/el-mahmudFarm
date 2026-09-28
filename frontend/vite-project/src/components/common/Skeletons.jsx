import React from 'react';

export const Skeleton = ({ className = '', style }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    style={style}
  />
);

export const SkeletonStats = ({ count = 3, className = '' }) => (
  <div className={className}>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="mt-4 h-7 w-1/2" />
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ className = '' }) => (
  <div className={`rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    <Skeleton className="mb-5 h-5 w-2/5" />
    <div className="flex h-[260px] items-end gap-3 border-b border-l border-gray-200 px-4 dark:border-gray-700">
      {[42, 68, 50, 82, 61, 92, 70, 55].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t-sm rounded-b-none" style={{ height: `${height}%` }} />
      ))}
    </div>
  </div>
);

export default Skeleton;