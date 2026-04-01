import React from 'react';

/**
 * Table component with responsive design
 */
const Table = ({ columns, data, actions = null, loading = false }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="hidden md:table w-full table-fixed text-left">
        <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((column, colIdx) => (
              <th
                key={`${column.key}-${colIdx}`}
                className="px-3 py-1 font-semibold text-gray-900 dark:text-white text-sm whitespace-normal break-words max-w-[120px]"
                style={{ width: column.width || 'auto' }}
              >
                {column.label}
              </th>
            ))}
            {actions && <th className="px-3 py-1 font-semibold text-gray-900 dark:text-white text-sm whitespace-normal break-words max-w-[120px]">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-3 py-1 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-2 text-center text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {columns.map((column, colIdx) => (
                  <td
                    key={`${idx}-${colIdx}-${column.key}`}
                    className="px-2 py-1 text-gray-700 dark:text-gray-300 text-sm whitespace-normal break-words"
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-2 py-1">
                    <div className="flex flex-wrap gap-2">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="md:hidden space-y-4 p-2">
        {loading ? (
          <div className="rounded-lg bg-white dark:bg-gray-800 p-4 text-center text-gray-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="rounded-lg bg-white dark:bg-gray-800 p-4 text-center text-gray-500">No data available</div>
        ) : (
          data.map((row, idx) => (
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {actions(row)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Table;
