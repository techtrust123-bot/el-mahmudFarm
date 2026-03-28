import React from 'react';

/**
 * Table component with responsive design
 */
const Table = ({ columns, data, actions = null, loading = false }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left">
        <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((column, colIdx) => (
              <th
                key={`${column.key}-${colIdx}`}
                className="px-4 py-2 font-semibold text-gray-900 dark:text-white text-sm"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {actions && <th className="px-4 py-2 font-semibold text-gray-900 dark:text-white text-sm">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-2 text-center text-gray-500">
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
                    className="px-2 py-1 text-gray-700 dark:text-gray-300 text-sm"
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
    </div>
  );
};

export default Table;
