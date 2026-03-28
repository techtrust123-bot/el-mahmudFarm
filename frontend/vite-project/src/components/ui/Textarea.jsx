import React from 'react';

/**
 * Textarea component
 */
const Textarea = React.forwardRef(({
  label,
  placeholder = '',
  error = null,
  rows = 4,
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
      <textarea
        ref={ref}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full px-4 py-2 text-base rounded-lg border-2 transition-all duration-200 resize-none
          ${error ? 'border-red-500 bg-red-50 dark:bg-red-900' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}
          focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900
          dark:text-white dark:placeholder-gray-400
          disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
