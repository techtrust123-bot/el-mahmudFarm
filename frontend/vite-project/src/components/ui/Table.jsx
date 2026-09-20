import React, { useMemo, useState, useEffect } from 'react';

/**
 * Data table component with sorting and pagination
 */
const Table = ({
  columns,
  data = [],
  actions = null,
  loading = false,
  pageSize = 10,
  pagination = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setShowAll(false);
  }, [data, pageSize, sortConfig.key, sortConfig.direction]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = a?.[sortConfig.key];
      const bValue = b?.[sortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return aStr.localeCompare(bStr, undefined, { numeric: true });
    });

    return sortConfig.direction === 'asc' ? sorted : sorted.reverse();
  }, [data, sortConfig]);

  const totalPages = pagination ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const pagedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;
  const displayData = showAll ? sortedData : pagedData;
  const canShowAll = sortedData.length > pageSize;
  const handleSort = (key, sortable) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (column) => {
    if (!column.sortable) return null;
    if (sortConfig.key !== column.key) {
      return <span className="ml-1 text-xs text-gray-400">↕</span>;
    }
    return (
      <span className="ml-1 text-xs text-gray-600">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const pageNumbers = useMemo(() => {
    if (!pagination) return [];
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }, [pagination, totalPages]);

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="w-full overflow-x-auto bg-white dark:bg-gray-900">
        <table className="hidden md:table w-full table-fixed text-left">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((column, colIdx) => (
                <th
                  key={`${column.key}-${colIdx}`}
                  className={`px-4 py-3 font-semibold text-gray-900 dark:text-white text-sm whitespace-normal break-words max-w-[120px] ${column.sortable ? 'cursor-pointer select-none' : ''}`}
                  style={{ width: column.width || 'auto' }}
                  onClick={() => handleSort(column.key, column.sortable)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-3 py-2 font-semibold text-gray-900 dark:text-white text-sm whitespace-normal break-words max-w-[120px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              displayData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {columns.map((column, colIdx) => (
                    <td
                      key={`${idx}-${colIdx}-${column.key}`}
                      className="px-3 py-2 text-gray-700 dark:text-gray-300 text-sm whitespace-normal break-words"
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-4 p-3 bg-white dark:bg-gray-900">
        {loading ? (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center text-gray-500">Loading...</div>
        ) : pagedData.length === 0 ? (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center text-gray-500">No data available</div>
        ) : (
          displayData.map((row, idx) => (
            <div key={idx} className="rounded-lg bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
              {columns.map((column, colIdx) => (
                <div key={`${idx}-${colIdx}-${column.key}`} className="grid grid-cols-2 gap-2 pb-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700 text-sm">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">{column.label}</span>
                  <span className="text-gray-900 dark:text-gray-100 break-words">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </span>
                </div>
              ))}
              {actions && (
                <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div>
              )}
            </div>
          ))
        )}
      </div>
      {((pagination && !showAll && totalPages > 1) || canShowAll) && (
        <div className="flex flex-col gap-3 md:flex-row items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {displayData.length} of {sortedData.length} records
          </div>
          <div className="flex items-center gap-2">
            {!showAll && pagination && totalPages > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-2 rounded-lg text-sm border ${pageNumber === currentPage ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </>
            )}
            {canShowAll && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500"
              >
                {showAll ? 'Show first 10' : 'View all data'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
