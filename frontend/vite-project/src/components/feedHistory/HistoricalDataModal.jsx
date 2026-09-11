import React from 'react';
import { FiAlertCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import Modal from '../ui/Modal';
import HistoricalFeedTable from './HistoricalFeedTable';

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

const formatSummaryValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return value;
};

const HistoricalDataModal = ({
  isOpen,
  onClose,
  data,
  type = 'livestock',
  loading = false,
  error = null,
  onRetry = null,
}) => {
  if (!isOpen) return null;

  const historyRows = Array.isArray(data?.feedHistory) ? data.feedHistory : [];

  const summary = type === 'poultry'
    ? [
        { label: 'Batch ID', value: formatSummaryValue(data?.batchId) },
        { label: 'Poultry Type', value: formatSummaryValue(data?.type) },
        { label: 'Current Feed Stage', value: formatSummaryValue(data?.currentFeedStage || data?.feedStage) },
        { label: 'Purchase Date', value: formatDate(data?.purchaseDate) },
        { label: 'Quantity', value: formatSummaryValue(data?.quantity) },
      ]
    : [
        { label: 'Animal Type', value: formatSummaryValue(data?.type) },
        { label: 'Tag Number', value: formatSummaryValue(data?.tagNumber) },
        { label: 'Breed', value: formatSummaryValue(data?.breed) },
        { label: 'Current Feed Stage', value: formatSummaryValue(data?.feedStage || data?.currentFeedStage) },
        { label: 'Purchase Date', value: formatDate(data?.purchaseDate) },
        { label: 'Quantity', value: formatSummaryValue(data?.quantity) },
      ];

  const modalTitle = type === 'poultry'
    ? `Historical Data - ${data?.batchId || 'Poultry Batch'}`
    : `Historical Data - ${data?.tagNumber || 'Livestock Record'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
          {summary.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/70">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <FiClock className="mb-3 h-8 w-8 animate-pulse text-emerald-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Loading historical feed data...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">Unable to load historical feed data.</p>
                <p className="text-sm">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : historyRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-300">No historical feed data available for this record.</p>
          </div>
        ) : (
          <HistoricalFeedTable type={type} rows={historyRows} />
        )}
      </div>
    </Modal>
  );
};

export default HistoricalDataModal;
