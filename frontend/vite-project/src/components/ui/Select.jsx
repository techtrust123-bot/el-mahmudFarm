import React from 'react';

/**
 * Select/Dropdown component
 */
const Select = React.forwardRef(({
  label,
  options = [],
  error = null,
  placeholder = 'Select an option',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-4 py-2 text-base rounded-lg border-2 transition-all duration-200
          ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600'}
          focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
          dark:text-white dark:focus:ring-emerald-900
          disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
