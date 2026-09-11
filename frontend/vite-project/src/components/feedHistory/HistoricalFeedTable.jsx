import React from 'react';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return value;
};

const getDetailFields = (record, type) => {
  if (type === 'poultry') {
    return [
      { label: 'Feed Stage', value: formatValue(record.feedStage) },
      { label: 'Feed Name', value: formatValue(record.feedName) },
      { label: 'Feed Type', value: formatValue(record.feedType) },
      { label: 'Feed Category', value: formatValue(record.feedCategory) },
      { label: 'Feed Consumed / Bird', value: record.poultryConsumePerBird === undefined || record.poultryConsumePerBird === null || record.poultryConsumePerBird === '' ? '—' : `${Number(record.poultryConsumePerBird).toFixed(2)} kg` },
      { label: 'Feed Cost / Bird', value: formatCurrency(record.feedCostPerPoultry) },
      { label: 'Total Feed Cost', value: formatCurrency(record.totalFeedCost) },
      { label: 'Cost / Bird', value: formatCurrency(record.costPerPoultry) },
      { label: 'Date', value: formatDate(record.recordedAt) },
    ];
  }

  return [
    { label: 'Feed Stage', value: formatValue(record.feedStage) },
    { label: 'Feed Name', value: formatValue(record.feedName) },
    { label: 'Feed Type', value: formatValue(record.feedType) },
    { label: 'Feed Category', value: formatValue(record.feedCategory) },
    { label: 'Feed Consumed', value: record.livestockFeedConsumed === undefined || record.livestockFeedConsumed === null || record.livestockFeedConsumed === '' ? '—' : `${Number(record.livestockFeedConsumed).toFixed(2)} kg` },
    { label: 'Feed Cost / Animal', value: formatCurrency(record.feedCostPerLivestock) },
    { label: 'Total Feed Cost', value: formatCurrency(record.totalFeedCost) },
    { label: 'Cost Price', value: formatCurrency(record.costPrice) },
    { label: 'Date', value: formatDate(record.timestamp) },
  ];
};

const HistoricalFeedTable = ({ type = 'livestock', rows = [] }) => {
  return (
    <div className="space-y-4">
      {rows.map((record, index) => {
        const details = getDetailFields(record, type);

        return (
          <div
            key={`${record.feedStage || 'stage'}-${record.recordedAt || record.timestamp || index}`}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                  Historical Feed Record
                </p>
                <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                  {record.feedStage || 'Unknown Stage'}
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {record.feedName || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {details.map((item) => (
                <div key={`${item.label}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoricalFeedTable;
